---
title: "Real-time IoT status with SignalR: the Planet IoT apps"
description: "Why Planet SIM and Planet Business push live utility and water-service status over SignalR, and what the docs say about reconnects, keep-alives, tokens and scale."
date: 2026-10-10T02:19:00Z
tags: ["SignalR", "real-time", "IoT", "dashboards", "Firebase"]
pillar: case-files
related: adr-005-planet-iot-realtime
sources:
  - title: "Microsoft Learn: Overview of ASP.NET Core SignalR (transports, hubs, use cases)"
    url: "https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction"
  - title: "Microsoft Learn: SignalR JavaScript client (automatic reconnect, sleeping tabs)"
    url: "https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client"
  - title: "Microsoft Learn: SignalR configuration (keep-alive and timeout defaults)"
    url: "https://learn.microsoft.com/en-us/aspnet/core/signalr/configuration"
  - title: "Microsoft Learn: SignalR authentication and authorization (access tokens, expiry)"
    url: "https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz"
  - title: "Microsoft Learn: Security considerations in SignalR (token logging, buffer limits)"
    url: "https://learn.microsoft.com/en-us/aspnet/core/signalr/security"
  - title: "Microsoft Learn: SignalR production hosting and scaling (sticky sessions, backplanes)"
    url: "https://learn.microsoft.com/en-us/aspnet/core/signalr/scale"
draft: false
---

A dashboard that shows yesterday's truth is worse than no dashboard. Planet SIM and Planet Business are web apps for apartment communities: operators watch live utility management and real-time water service status, and they need to see a change when it happens, not at the next refresh. This is the long version of case file 05, which records why we pushed status over SignalR instead of polling REST, plus what the SignalR documentation says about the parts that bite later: reconnects, timeouts, tokens and scale.

One boundary up front. The case file records the decision and the stack (Firebase authentication, REST APIs, SignalR). It does not describe the server hosting, so every number below is a documented default for ASP.NET Core SignalR, not a description of how Planet was deployed. Where I say what I would do, it is an argument, not a war story.

## What were the Planet apps, and why not just poll?

Planet SIM is an IoT app for apartment utilities with real-time updates over SignalR. Planet Business is real-time water service tracking, with Firebase authentication and REST APIs behind it. I directed the first and managed the second while I was an SDE 2 at Incresco.

The question the case file answers is the oldest one in dashboards: poll or push. The record lists the trade honestly. Polling the REST APIs on an interval is simple to build, but "status lags behind reality" and you spend requests when nothing changed. Real-time dashboards over SignalR give you status as it happens, which is what "reliable monitoring for apartment communities" means in practice, at the cost of "persistent connections to manage alongside REST and Firebase auth".

That cost is the whole post. A persistent connection is a promise you have to keep.

## What does SignalR give a status dashboard?

Microsoft's introduction lists dashboards and monitoring apps among the good candidates, next to games, maps and notifications. The features that matter for a status board are small in number.

- **Transports with fallback.** "SignalR supports the following techniques for handling real-time communication (in order of graceful fallback)": WebSockets, server-sent events, long polling. WebSockets is preferred, and the client picks the best one the server and client both support.
- **Hubs.** A hub is "a high-level pipeline" where client and server call methods on each other, with typed parameters. For status, the useful direction is server to client: the server calls a client method named, say, `StatusChanged`, with the device and its new state.
- **Groups.** You can send to all clients, to specific clients, or to groups of clients. An operator watching one apartment community should only receive that community's events. I would model a group per community and join on connect after authorisation.
- **Connection management.** The library "handles connection management automatically". It does not handle what your UI should do while the connection is gone. That part is yours.

## Where is the line between REST and SignalR?

The decision in the record is a split: Firebase auth and REST APIs for commands, SignalR for the real-time dashboards. I would defend that split for any status product.

Commands are request and response. You want a status code, an error body, idempotency and a place in the API gateway's logs. REST gives you all of that for free. Status is a stream of facts the server already knows. Push it down a connection and keep the dashboard dumb: it renders what it is told.

The failure mode of putting everything on the socket is that you rebuild REST badly. The failure mode of putting everything on REST is polling, which is the option the case file rejected. Keep the socket one-directional in spirit, and use a REST call as the source of truth whenever the socket is in doubt. Which brings us to the part nobody demos.

## What happens when the connection drops?

On a status dashboard, a silent disconnect is the worst bug, because the screen looks fine and is wrong. The JavaScript client does not reconnect by default. You opt in with `withAutomaticReconnect`, and the documented behaviour is specific:

- With no arguments, the client waits 0, 2, 10 and 30 seconds before its four attempts, then stops.
- Before the first attempt the connection moves to `Reconnecting` and fires `onreconnecting`, which "provides an opportunity to warn users that the connection is lost and to disable UI elements".
- If it reconnects, `onreconnected` fires with a new `connectionId`, because "the connection looks entirely new to the server".
- If all attempts fail, `onclose` fires and the connection is `Disconnected`.
- Initial `start()` failures are not retried by `withAutomaticReconnect`; you handle those yourself.

Two consequences follow from that, and both are design reasoning rather than anything the docs promise. First, a new connection means the server has forgotten which groups it was in and has no memory of what you missed. The docs describe the reconnected connection as new to the server and say nothing about delivering what you missed, so I would assume those messages are gone. So after `onreconnected`, rejoin your group and fetch a fresh snapshot over REST before trusting the stream again. Second, four attempts over about 42 seconds is a policy for a chat window. A wall display in a plant room should keep trying, with jitter so a thousand screens do not retry in lockstep after an outage. The docs show a custom retry policy that returns a random delay up to 10 seconds while under 60 seconds elapsed, then `null`. I would return a delay forever and show a stale-data banner instead.

One more browser fact: some browsers freeze inactive tabs, "which can cause SignalR connections to close". The docs suggest holding a Web Lock to keep the tab awake, and call it experimental. Know it exists before you spend a day debugging it.

## How do keep-alives and timeouts fit together?

The defaults, from the configuration page: the server pings every 15 seconds (`KeepAliveInterval`) and treats a client as gone after 30 seconds of silence (`ClientTimeoutInterval`). The JavaScript client has the mirror image: it pings every 15 seconds and uses a 30-second server timeout. The documented rule is that the timeout should be about double the keep-alive interval, "to allow time for pings to arrive", and the JavaScript client's keep-alive "should be less than or equal to half" its server timeout.

The practical point is that a dead connection is detected in roughly the timeout, not instantly. If your business definition of "live" is tighter than 30 seconds, change both sides together, or you will create false disconnects.

## What about auth and scale?

Authentication is where Firebase and SignalR meet, so read the SignalR side carefully.

Browsers cannot set an `Authorization` header on WebSocket or server-sent-events connections, so SignalR sends the bearer token as a query-string parameter on those transports. The security page notes this is "generally as secure as" a header over HTTPS, but "many web servers log the URL for each request", so your access logs may now contain tokens. Filter `access_token` out of logs. The JavaScript client takes an `accessTokenFactory`, which "is called before every HTTP request made by SignalR", so return a fresh token from it rather than a captured one.

Also note that a token expiring does not end the connection: "by default the connection continues to work". There is a `CloseOnAuthenticationExpiration` option if you want the opposite, and the page describes an authentication-refresh feature for .NET 11 and later. Decide deliberately which behaviour you want for a screen that stays open all week.

On scale, persistent connections cost memory and TCP connections, unlike short HTTP requests. SignalR needs sticky sessions on a server farm unless you use the Azure SignalR Service or force WebSockets with negotiation skipped. For apps hosted on Azure the docs recommend Azure SignalR Service; the Redis backplane is the recommended option for your own infrastructure. Per-connection buffers default to 32 KB, which is plenty for a status event and a good reason to keep payloads small: send the device id and the new state, not the whole building.

## Hands-on: a status client that does not lie

This is a browser client with the reconnect behaviour I argued for. The hub path, event name and REST endpoint are placeholders; `getFreshToken` is wherever your Firebase client gives you a current ID token, so check the Firebase docs for the exact call.

```javascript
import * as signalR from "@microsoft/signalr";

const state = new Map();          // deviceId -> status
let live = false;

const connection = new signalR.HubConnectionBuilder()
  .withUrl("/status-hub", { accessTokenFactory: () => getFreshToken() })
  .withAutomaticReconnect({
    // Keep trying, with jitter. Never give up on a wall display.
    nextRetryDelayInMilliseconds: ctx =>
      Math.min(30000, 1000 * 2 ** ctx.previousRetryCount) * (0.5 + Math.random()),
  })
  .configureLogging(signalR.LogLevel.Information)
  .build();

async function loadSnapshot() {
  const res = await fetch("/api/community/42/status");   // REST: source of truth
  for (const d of await res.json()) state.set(d.id, d.status);
  render(state, live);
}

// Register handlers before start(), as the docs recommend.
connection.on("StatusChanged", (deviceId, status) => {
  state.set(deviceId, status);
  render(state, live);
});

connection.onreconnecting(() => { live = false; render(state, live); });   // show "stale"
connection.onreconnected(async () => {
  await loadSnapshot();            // we missed events; do not trust the old state
  live = true;
  render(state, live);
});
connection.onclose(() => { live = false; render(state, live); });

async function start() {
  try {
    await connection.start();      // withAutomaticReconnect does not retry this
    await loadSnapshot();
    live = true;
    render(state, live);
  } catch (err) {
    console.error(err);
    setTimeout(start, 5000);
  }
}
start();
```

The `render` function should show the connection state next to the data, for example a "live" dot that turns amber and a "last updated" time. Operators forgive a stale screen that says it is stale. They do not forgive a stale screen that looks live.

## Takeaways

- Poll for simplicity, push for status that has to be right now. The case file chose push, and accepted persistent connections as the price.
- Keep commands on REST and status on the socket, and treat REST as the source of truth after any gap.
- SignalR's client does not reconnect by default; the default policy is four attempts over about 42 seconds. Decide what a wall display should do after that.
- A reconnect is a new connection. Rejoin groups and re-fetch a snapshot before trusting the stream.
- Tokens travel in the query string for browser WebSockets, so scrub logs, and decide whether an expired token should end the connection.

The decision record itself, with the options and trade-offs in two minutes, is case file 05, "Planet IoT over SignalR".
