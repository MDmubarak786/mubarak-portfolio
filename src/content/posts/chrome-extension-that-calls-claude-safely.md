---
title: "Building a Chrome extension that calls Claude safely: keys, consent, rate limits"
description: "Why an API key cannot live in a Chrome extension, the proxy that should hold it, what the Web Store requires before page content leaves the browser, and 429 handling."
date: 2026-10-10T01:55:00Z
tags: ["Chrome extension", "Manifest V3", "Claude API", "API keys", "rate limits", "privacy"]
pillar: building
related: adr-008-chrome-extensions
sources:
  - title: "Anthropic TypeScript SDK on GitHub (browser use disabled by default)"
    url: "https://github.com/anthropics/anthropic-sdk-typescript"
  - title: "Claude Help Center: API key best practices"
    url: "https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure"
  - title: "Chrome Web Store: user data policy, disclosure and secure handling"
    url: "https://developer.chrome.com/docs/webstore/program-policies/user-data-faq"
  - title: "Chrome for Developers: cross-origin network requests in extensions"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/network-requests"
  - title: "Chrome for Developers: chrome.identity API"
    url: "https://developer.chrome.com/docs/extensions/reference/api/identity"
  - title: "Chrome for Developers: declare permissions (optional and host permissions)"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions"
  - title: "Claude docs: rate limits (headers, 429, spend cap, workspaces)"
    url: "https://platform.claude.com/docs/en/api/rate-limits"
  - title: "Claude docs: errors (status codes, SDK retries)"
    url: "https://platform.claude.com/docs/en/api/errors"
draft: false
---

A Chrome extension is a package you hand to strangers, and anything inside it is readable by whoever installs it. That makes an API key in an extension a public API key, billed to you. This post is the safe shape for an extension that calls Claude: a small backend that holds the key, a consent step before page content leaves the browser, and rate limiting that assumes your quota is shared.

My own extension work was Manifest V3 automation for admin workflows, described in [case file 08](/#file-adr-008-chrome-extensions). That record does not describe a model call inside those extensions, so everything below is a design built from the docs, not a report of something I shipped.

## Why can't the extension hold the API key?

Because there is no private place in an extension. The source ships in the package, anyone can unzip it, and the extension's storage is just another place on the user's machine. Hiding the key in an obfuscated string or an options page only slows down the first person who looks.

Anthropic's tooling assumes the same. The TypeScript SDK's README says browser use is "disabled by default to avoid exposing your secret API credentials", and tells you to enable it by setting `dangerouslyAllowBrowser` to `true`. The name is the warning. The Help Center's key guidance says never to include a key directly in your code or configuration files, to use separate keys per purpose, to rotate them (the example interval is 90 days), and to watch usage. It does not single out extensions or client-side code, so the extension case is my inference, but it is a short inference.

Moving to a different key location inside the extension does not change the answer. The key belongs on a server you run.

## What does the safe architecture look like?

Three hops: content script, service worker, your proxy, then Claude.

1. **Content script** reads what the user chose and sends a message. It holds no secrets and makes no network calls to your backend.
2. **Service worker** owns the network call to your proxy. Chrome's network-requests guide says content scripts stay subject to the page's cross-origin rules even with host permissions, and its security advice is to have the extension's background logic perform the fetch. It also tells you not to let a content script pass an arbitrary URL, because a malicious page could forge those messages.
3. **Your proxy** authenticates the user, applies limits, adds the key, and calls Claude.

The proxy rule that people skip: **the extension never chooses the prompt or the model.** If the request body carries `model`, `system` or `max_tokens`, you have built an open relay to your Anthropic account for anyone who can read your extension's traffic. The extension sends the user's text and a task name. The proxy owns the system prompt, the model, the output cap and the schema.

For user identity, `chrome.identity` covers the extension side. `getAuthToken()` returns a Google OAuth2 token using client details in the manifest, and `launchWebAuthFlow()` runs OAuth with a non-Google provider and returns the redirect URL on `https://<app-id>.chromiumapp.org/*`. Both need the `identity` permission, and the docs advise against starting an interactive flow when the app first launches. Your proxy verifies that token on every call; it does not trust a user ID the extension supplies.

## What does consent require?

Chrome's policy is more specific than "have a privacy policy". The Web Store user data policy says the disclosure must describe what is collected and how it is used, must not live only in a privacy policy or terms of service, and must appear in the product's UI. Consent has to come from a specific action that clearly agrees to the disclosure, before data is collected or handled. Scraping content from a website the user visits counts as handling user data, and website content and form data are listed as user data. A model call that sends page text to a server is that, by any reading.

The same policy limits what you do next: use data only for the single purpose or user-facing feature, no personalised or retargeted ads from it, no transfers beyond narrow exceptions, a privacy policy posted in the dashboard, transmission over HTTPS or WSS, and the narrowest permissions needed. The page warns that mismatches between policy, dashboard disclosures and behaviour can lead to suspension of all items owned by the publisher.

Two design choices follow.

- **Ask at the moment of use.** `optional_host_permissions` are, in Chrome's words, "granted by the user at runtime, instead of at install time", and the docs say to consider optional permissions wherever the functionality permits. Request access to a site when the user first clicks "Summarise" there, with the disclosure on screen.
- **Send the minimum.** Extract the selected text or the relevant region, not the page. Truncate on the client and again on the proxy. Redact what you can before the request leaves the browser.

## How should the proxy handle rate limits?

Anthropic's limits are organisation-level. The docs say limits are set at the organisation level, measured in requests, input tokens and output tokens per minute for each model class, and enforced with a token bucket, so capacity replenishes continuously. One heavy user can therefore spend everyone's headroom. Three defences.

**Per-user limits below the org limit.** Count requests and tokens per verified user in the proxy. Return your own 429 before Anthropic returns one.

**A workspace for the extension.** The rate-limits page lets you set custom spend and rate limits per workspace, so a runaway extension cannot starve your other services. You cannot set limits on the default workspace, so create a dedicated one.

**Correct handling of 429.** An ordinary rate-limit 429 carries a `retry-after` header with the seconds to wait; earlier retries fail. The error type is also `rate_limit_error` when your organisation hits its monthly spend cap, but that response has no `retry-after` and keeps failing until access resumes. On the Messages API its `error.details.error_code` is `enforced_spend_limit_reached`. Retrying it is wasted effort and noise. The errors page adds that the official SDK retries transient failures twice by default, honouring `retry-after`, and that `maxRetries` configures this. In a proxy I would set it to zero and decide retries myself, so a queue of users does not multiply into retries upstream.

Cached input also changes your headroom: for most models, cache reads do not count toward input-tokens-per-minute limits. A stable server-owned system prompt that you cache is both cheaper and kinder to your limit, which is another reason the proxy should own it.

## Hands-on: a minimal proxy and the extension side

The proxy, as a hosting-agnostic fetch handler in TypeScript. `verifyUser`, `underLimit` and `retryAfterSeconds` are yours to implement; the SDK calls follow the TypeScript README, and you should check the SDK docs for the exact error properties.

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ maxRetries: 0 });   // key from env; we decide retries

const SYSTEM = "You summarise the text the user provides in five bullet points.";

export async function handle(req: Request): Promise<Response> {
  const user = await verifyUser(req.headers.get("authorization"));   // verify the OAuth token
  if (!user) return new Response("unauthorised", { status: 401 });
  if (!(await underLimit(user.id))) {
    return new Response("slow down", { status: 429, headers: { "retry-after": "30" } });
  }

  const { text } = await req.json();
  if (typeof text !== "string" || text.length === 0 || text.length > 20_000) {
    return new Response("bad request", { status: 400 });
  }

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-5-5",   // server-chosen, never from the request
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
    });
    const out = msg.content.find((b) => b.type === "text");
    return Response.json({ summary: out && out.type === "text" ? out.text : "" });
  } catch (err) {
    if (err instanceof Anthropic.APIError && err.status === 429) {
      // Rate limit: pass retry-after on. Spend-cap 429 has none: do not retry it.
      const wait = retryAfterSeconds(err);   // read retry-after off the error; check the SDK docs for the property
      return new Response("busy", { status: 429, headers: wait ? { "retry-after": String(wait) } : {} });
    }
    return new Response("upstream error", { status: 502 });
  }
}
```

The extension side. The manifest declares the proxy as the only host it talks to and the Anthropic key appears nowhere:

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "identity"],
  "host_permissions": ["https://api.example-proxy.com/*"],
  "optional_host_permissions": ["https://*/*"]
}
```

The service worker registers its listener at the top level, checks consent, builds the request itself, and keeps the long-running details out of the content script:

```js
// service-worker.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "summarise" || !sender.tab) return;   // ignore anything else
  (async () => {
    const { consented } = await chrome.storage.local.get("consented");
    if (!consented) return sendResponse({ error: "consent_required" });

    const token = await getProxyToken();   // chrome.identity flow, your provider
    const res = await fetch("https://api.example-proxy.com/summarise", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: String(msg.text).slice(0, 20000) }),
    });
    if (res.status === 429) {
      return sendResponse({ error: "busy", retryAfter: res.headers.get("retry-after") });
    }
    sendResponse(res.ok ? await res.json() : { error: "failed" });
  })();
  return true;   // keep the channel open for the async response
})
```

Service worker lifetimes put a ceiling on how long a model call can run from this worker, and that is the subject of the post on service workers and offscreen documents linked below.

## Takeaways

- Never put an Anthropic key in an extension, its storage or its config. The SDK's browser flag is named `dangerouslyAllowBrowser` for a reason.
- Route every call through a proxy that verifies the user, owns the prompt and model, and caps tokens.
- Show a disclosure in the product UI and require a specific action before any page content is sent; ask for host permissions at the moment of use.
- Rate-limit per user, give the extension its own workspace, and never retry a 429 that has no `retry-after`.
- Treat messages from content scripts as untrusted input, since a malicious page can forge them, and never let them supply URLs or model parameters.

The service worker lifetimes behind that 30-second warning are in [Manifest V3 and AI: service workers, offscreen documents and their limits](/blog/manifest-v3-and-ai-service-workers-offscreen-documents), and the broader story of these extensions is in [Chrome extensions that save admins 3 to 5 hours a day](/blog/chrome-extensions-that-save-admins-hours).
