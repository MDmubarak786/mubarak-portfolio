---
title: "Manifest V3 and AI: service workers, offscreen documents and their limits"
description: "Idle shutdown after 30 seconds, a 5-minute event cap, one offscreen document, runtime messaging only: the MV3 limits that decide where an AI call can run, with code."
date: 2026-10-10T01:56:00Z
tags: ["Manifest V3", "Chrome extension", "service workers", "offscreen documents", "AI features"]
pillar: building
related: adr-008-chrome-extensions
sources:
  - title: "Chrome for Developers: the extension service worker lifecycle"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle"
  - title: "Chrome for Developers: About extension service workers"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/service-workers"
  - title: "Chrome for Developers: migrate to a service worker"
    url: "https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers"
  - title: "Chrome for Developers: events in service workers"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events"
  - title: "Chrome for Developers: chrome.offscreen API reference"
    url: "https://developer.chrome.com/docs/extensions/reference/api/offscreen"
  - title: "Chrome for Developers: chrome.alarms API reference"
    url: "https://developer.chrome.com/docs/extensions/reference/api/alarms"
  - title: "Chrome for Developers: chrome.storage API reference"
    url: "https://developer.chrome.com/docs/extensions/reference/api/storage"
  - title: "Chrome for Developers: extension messaging"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/messaging"
draft: false
---

An AI call is a slow, stateful, sometimes streaming operation. A Manifest V3 service worker is built for short bursts of event handling and is shut down when idle. Put one inside the other without a plan and the call dies at an awkward moment, with no error you can catch. This post lists the documented limits, then shows where an AI workload should run in an extension and how to make it survive a restart.

The extensions in [case file 08](/#file-adr-008-chrome-extensions) are Manifest V3, and the record names PDF.js extraction among the results. The code here is my design from Chrome's documentation, not code from those extensions.

## How long does an MV3 service worker live?

The lifecycle page gives three triggers for termination:

| Trigger | Limit |
|---|---|
| Inactivity | 30 seconds |
| A single request, such as an event or API call | longer than 5 minutes to process |
| A `fetch()` response | takes more than 30 seconds to arrive |

"Receiving an event or calling an extension API resets this timer." That sentence carries a version history on the same page, which is where the practical detail is:

- Chrome 110: extension API calls began resetting the timers. Before that, only running event handlers kept the worker alive.
- Chrome 109: messages sent from an offscreen document reset the timers.
- Chrome 114: long-lived messaging keeps the worker alive; opening a port alone no longer resets the timers.
- Chrome 116: active WebSocket connections extend lifetimes.
- Chrome 120: alarms can be set to a minimum period of 30 seconds, matching the lifecycle.

Two more rules come from the migration and events pages. Register listeners at the top level of the script, synchronously, so Chrome can dispatch events as soon as the worker starts; not "inside event callbacks" or after a promise. And treat global variables as disposable: "use storage APIs as the source of truth". `setTimeout` and `setInterval` can fail because termination cancels them.

## What does that break for AI features?

Three things, in the order they hurt.

**Long model calls.** A slow model call, such as a long reasoning request, can take longer than 30 seconds to return a response. If the worker is waiting on that `fetch()`, it can be terminated. I could not find a documented statement on whether bytes arriving on a streaming fetch reset the idle timer. Test it in your Chrome version rather than assuming.

**Conversation state.** Anything held in a variable between turns disappears with the worker.

**Anything needing a DOM or workers.** The migration page says a service worker cannot touch the DOM or `window`, and that DOM work must move to another API or an offscreen document. Parsing fetched HTML, rendering a PDF, running a WASM model in a Web Worker: none of these run in the service worker.

You will find keepalive tricks that ping an extension API on a timer. The migration page mentions a helper that pings every 25 seconds and says continuous keepalive is limited to enterprise and education use. For a product aimed at the public, treat that as a no, and design for restarts instead.

## What is an offscreen document for?

The offscreen API lets an extension use DOM APIs in a hidden document, with no visible window or tab. It needs the `"offscreen"` permission and has hard rules:

- An extension can have only one open at a time.
- The runtime API is the only extension API supported there. No `chrome.storage`, no `chrome.alarms`.
- The URL must be a static HTML file bundled with the extension.
- You declare `reasons` from a fixed list of 15, with a `justification` the browser may show to the user.
- Lifetime: only `AUDIO_PLAYBACK` has a limit, closing after 30 seconds without audio. Other reasons set none.

The reasons that matter for AI work are `DOM_PARSER`, `WORKERS` (spawns workers), `BLOBS`, `USER_MEDIA` (microphone, for a voice feature), `WEB_RTC`, `DISPLAY_MEDIA` and `AUDIO_PLAYBACK` for playing a spoken answer. Declare the reason that matches what the document does, since the justification may be shown to the user.

That gives a division of labour. The service worker is a thin coordinator that handles events and writes state. The offscreen document does the work that needs a DOM, a worker or a long-lived connection, and talks to the coordinator by messages. Because messages from an offscreen document reset the worker's timers, chunks of a streamed answer relayed that way also keep the coordinator awake. That follows from the documented rule; confirm it on your target version.

## Where do alarms and storage fit?

**Alarms replace timers.** Chrome limits alarms to once every 30 seconds; a `periodInMinutes` below 0.5 is not honoured for packaged extensions. Creating an alarm with an existing name replaces the old one. The reference recommends checking on every service worker start that your important alarms still exist, because persistence can vary.

**Storage is the source of truth.** `storage.local` is 10 MB and survives restarts. `storage.session` is also 10 MB but lives in memory and "is cleared if the extension is disabled, reloaded, updated, and when the browser restarts", and content scripts cannot read it by default. So `session` suits a job queue that is allowed to be lost on update; put anything that must survive an extension update in `local`. `window.localStorage` is not available to a service worker.

## Hands-on: a job that survives worker restarts

The shape: the worker records the job in `storage.session`, makes sure an offscreen document exists, and hands over the work. An alarm sweeps for jobs that stopped progressing. The manifest needs `"offscreen"`, `"storage"` and `"alarms"` permissions.

```js
// service-worker.js
const OFFSCREEN_URL = "offscreen.html";

async function ensureOffscreen() {
  // hasDocument() is Chrome 150+; check the docs for how to detect one on older versions
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["DOM_PARSER"],
    justification: "Parse fetched HTML before sending text to the model",
  });
}

async function setJob(id, patch) {
  const { jobs = {} } = await chrome.storage.session.get("jobs");
  jobs[id] = { ...jobs[id], ...patch };
  await chrome.storage.session.set({ jobs });
}

async function startJob(id, html) {
  await ensureOffscreen();            // resolves once the initial page load completes
  await setJob(id, { state: "running", html, updatedAt: Date.now() });
  chrome.runtime.sendMessage({ type: "parse", id, html });   // reaches the offscreen document
}

// Listeners: top level, registered synchronously.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "start-job") {
    startJob(msg.id, msg.html).then(() => sendResponse({ ok: true }));
    return true;                      // async response
  }
  if (msg?.type === "chunk") setJob(msg.id, { partial: msg.text, updatedAt: Date.now() });
  if (msg?.type === "done") setJob(msg.id, { state: "done", result: msg.result });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "job-sweep") return;
  const { jobs = {} } = await chrome.storage.session.get("jobs");
  for (const [id, job] of Object.entries(jobs)) {
    if (job.state === "running" && Date.now() - job.updatedAt > 90_000) {
      await startJob(id, job.html);   // stalled: hand it over again
    }
  }
});

// Runs on every worker start: make sure the sweep alarm exists.
chrome.alarms.get("job-sweep").then((a) => {
  if (!a) chrome.alarms.create("job-sweep", { periodInMinutes: 1 });
});
```

The offscreen side uses only the runtime API. It parses the HTML, calls a backend proxy (see the previous post for why the key lives there), and relays chunks:

```js
// offscreen.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "parse") return;
  run(msg.id, msg.html);
});

async function run(id, html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = (doc.querySelector("main") ?? doc.body).textContent.trim().slice(0, 20000);

  const res = await fetch("https://api.example-proxy.com/summarise", {
    method: "POST",
    headers: { "content-type": "application/json" },   // plus auth, omitted here
    body: JSON.stringify({ text }),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
    chrome.runtime.sendMessage({ type: "chunk", id, text: result });   // also resets worker timers
  }
  chrome.runtime.sendMessage({ type: "done", id, result });
}
```

Three things to notice. The offscreen document never touches storage; the worker owns every write. A restarted worker finds the job in `storage.session` and carries on from the alarm. And the message handlers that write state do not need the worker to stay alive between messages: each incoming message starts it again if it is dormant.

If you are running a model locally rather than calling a backend, the `WORKERS` reason is the documented way to spawn a worker from an offscreen document. I have not benchmarked that, so check memory and startup cost on your own devices before committing to it.

## Takeaways

- Assume the worker dies after 30 seconds idle and at 5 minutes into any single event; design for restart, not for survival.
- Keep the service worker thin: listeners at the top level, state in storage, work elsewhere.
- Use one offscreen document for DOM, workers, media and long streams; it can use only the runtime API, so relay everything through messages.
- Use alarms with a 30-second floor instead of timers, and recreate them at worker start.
- Use `storage.session` for disposable state and `storage.local` for anything that must survive an update or restart.

Safe key handling for the call itself is in [Building a Chrome extension that calls Claude safely](/blog/chrome-extension-that-calls-claude-safely), and the wider story of these extensions is in [Chrome extensions that save admins 3 to 5 hours a day](/blog/chrome-extensions-that-save-admins-hours).
