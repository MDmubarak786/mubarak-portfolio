---
title: "Chrome extensions that save admins 3 to 5 hours a day"
description: "How Manifest V3 extensions for BSBI and GISMA automated student application workflows in tools we could not change, and the service worker rules that decide reliability."
date: 2026-10-10T02:22:00Z
tags: ["Chrome extension", "automation", "Manifest V3", "PDF.js", "service workers"]
pillar: case-files
related: adr-008-chrome-extensions
sources:
  - title: "Chrome for Developers: Chrome Extensions documentation"
    url: "https://developer.chrome.com/docs/extensions"
  - title: "Chrome for Developers: Content scripts"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts"
  - title: "Chrome for Developers: The extension service worker lifecycle"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle"
  - title: "Chrome for Developers: What is Manifest V3"
    url: "https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3"
  - title: "Chrome for Developers: chrome.alarms API"
    url: "https://developer.chrome.com/docs/extensions/reference/api/alarms"
  - title: "Chrome for Developers: chrome.storage API (quotas, persistence)"
    url: "https://developer.chrome.com/docs/extensions/reference/api/storage"
  - title: "MDN: MutationObserver"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver"
  - title: "PDF.js: a web-standards platform for parsing and rendering PDFs"
    url: "https://mozilla.github.io/pdf.js/"
draft: false
---

The fastest way to fix a workflow in a tool you do not own is to stop asking the owner. Admin teams at BSBI and GISMA worked student applications by hand inside third-party web tools that could not be changed. We built Manifest V3 Chrome extensions that automate the workflow in place, and the record puts the result at 3 to 5 hours saved per admin per day, at 99.9% uptime. This is the long version of case file 08: why an extension was the right shape, how MV3 changes the architecture, and what "uptime" has to mean for something that lives inside someone else's page.

A boundary on what follows. The case file records the problem, the decision and the headline numbers: PDF.js extraction cut processing time by 50%+, AI classification covered 17+ document types at 95%, manual data entry fell 70% with processing 7x faster, and uptime was 99.9% with local caching and retries. It does not list the individual workflow steps, so I will not invent them. The architecture below is built from Chrome's documentation and is how I would structure the same job.

## Why a browser extension instead of asking the vendor?

The record lists two options. Ask the vendors to change their tools: no code to maintain, but "slow, uncertain, and outside the team's control". Or build extensions that automate the workflow in place, which "ships in weeks, works on top of tools the team already uses". The cost of the second is recorded plainly too: "Manifest V3 limits and vendor UI changes need monitoring."

That last clause is the engineering problem in one line. You are a guest in someone else's DOM, and the host can rearrange the furniture any day.

## What is an MV3 extension actually made of?

Chrome's documentation describes the pieces. Manifest V3 moved the background context to service workers, "which run only when needed", and removed the ability to use remotely hosted code: an extension can only run the JavaScript in its package. Two parts matter for admin automation.

**Content scripts** are "files that run in the context of web pages", and they can read and change the DOM. Each runs in an isolated world, "a private execution environment that isn't accessible to the page or other extensions", so your variables cannot collide with the host's. Content scripts can use `runtime.sendMessage()` and `runtime.connect()`, but other extension APIs are off limits to them; they reach those by messaging the rest of the extension. The default `run_at` is `document_idle`, which the docs recommend whenever possible.

**The service worker** is the extension's brain and its weak point. Per the lifecycle page, Chrome ends it after 30 seconds of inactivity, when a single request takes longer than 5 minutes, or when a `fetch()` response takes more than 30 seconds to arrive. Receiving an event or calling an extension API resets the timer. And the sentence every extension author should print out: "Any global variables you set will be lost if the service worker shuts down."

So the architecture splits cleanly. The content script touches the page. The service worker coordinates and calls APIs, and holds no state in memory that it cannot afford to lose.

## Where do uptime, caching and retries come from?

The record says 99.9% uptime "with local caching and retries". For a service that is a well-defined term. For an extension it needs a definition, because there is no server to ping. I would define it as the share of attempted workflow runs that complete without the admin intervening, over a period. Under that definition the two mechanisms in the record are the right ones, and the Chrome docs show what to build them on.

**Local caching.** `chrome.storage.local` holds JSON under keys you choose, survives clearing the web cache, and is cleared only when the extension is removed. The storage reference gives it 10 MB (10,485,760 bytes), raised from 5 MB in Chrome 113, with `unlimitedStorage` as an override. `storage.sync` is 100 KB in total with an 8 KB item limit, and `storage.session` is in-memory and cleared when the browser restarts. Use `local` for anything that must outlive a service worker restart. `localStorage` is not available to extension service workers at all.

**Retries.** A `setTimeout` will not survive a service worker that is shut down mid-wait. The alarms API is the durable alternative. Chrome limits alarms to "at most once every 30 seconds" (a `periodInMinutes` below 0.5 is not honoured), and the alarms page recommends checking at service worker start that your important alarms still exist and recreating them if they do not. The lifecycle page also notes the 30-second minimum alarm period arrived in Chrome 120.

Put those together and the shape of a reliable step is: write the intent to storage, try the work, on failure schedule an alarm, and on any service worker start, read the queue and carry on.

## How do you survive the vendor changing their UI?

This is the "monitoring" line in the record, and it is the one that costs you the 0.1%. Three habits, all of them design arguments.

1. **Keep selectors in one module.** The content script should not scatter `querySelector` calls through the logic. One file maps "the student's name field" to however the tool currently renders it. When the vendor ships a redesign, one file changes.
2. **Verify before you act.** Before an automation writes anything, assert that the elements it expects are present and plausible. If not, stop and report; do not guess. A visible, stopped workflow costs minutes. A wrong write costs a student record.
3. **Watch the page, not a timer.** `MutationObserver` "provides the ability to watch for changes being made to the DOM tree", with `childList` and `subtree` options to catch nodes being added anywhere below a target. Modern tools render late and re-render often, so waiting for the element beats sleeping for a fixed time.

On top of that, report failures somewhere a human sees them. An automation that fails quietly is exactly how a 99.9% claim becomes a 90% reality.

## What about PDFs and classification?

Two items from the record belong in an application-processing extension: PDF.js document extraction, which cut processing time by 50%+, and AI document classification across 17+ types at 95%. PDF.js describes itself as "a general-purpose, web standards-based platform for parsing and rendering PDFs", which is why it is a natural fit inside a browser extension: the file is already in the browser.

I would run extraction in a context that has the DOM it needs, and send only the extracted text or the classification request through the service worker. Chrome's lifecycle page mentions offscreen documents as a way to run code the worker cannot, which is a place to look if you need page-like APIs without a visible page. The classification pipeline itself is covered in the document processing post and case file 07; the extension's job is to feed it and apply the result.

## Hands-on: a retry queue that survives worker restarts

This is the skeleton of the reliability pattern. It is a sketch built from the documented APIs, not BSBI or GISMA code. The `"alarms"` and `"storage"` permissions go in the manifest.

```json
{
  // Sketch: check the docs for the exact manifest keys (host_permissions, background.service_worker).
  // Strip these comments; real manifest.json is plain JSON.
  "manifest_version": 3,
  "name": "Application helper (sketch)",
  "version": "0.1.0",
  "permissions": ["storage", "alarms"],
  "host_permissions": ["https://tool.example.org/*"],
  "background": { "service_worker": "sw.js" },
  "content_scripts": [{
    "matches": ["https://tool.example.org/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

The service worker keeps its queue in `chrome.storage.local`, never in a variable:

```javascript
// sw.js
const QUEUE = "queue";

async function enqueue(job) {
  const { [QUEUE]: q = [] } = await chrome.storage.local.get(QUEUE);
  q.push({ ...job, attempts: 0 });
  await chrome.storage.local.set({ [QUEUE]: q });
  await chrome.alarms.create("drain", { delayInMinutes: 0.5 });   // 30 s is the minimum
}

async function drain() {
  const { [QUEUE]: q = [] } = await chrome.storage.local.get(QUEUE);
  const rest = [];
  for (const job of q) {
    try {
      await runJob(job);                         // your API call or tab message
    } catch (err) {
      job.attempts += 1;
      if (job.attempts < 5) rest.push(job);      // retry later
      else await reportFailure(job, err);        // make failures visible to a human
    }
  }
  await chrome.storage.local.set({ [QUEUE]: rest });
  if (rest.length) await chrome.alarms.create("drain", { delayInMinutes: 1 });
}

chrome.alarms.onAlarm.addListener(a => { if (a.name === "drain") drain(); });
chrome.runtime.onStartup.addListener(drain);     // recover after a browser restart
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "job") enqueue(msg.job);
});
```

And the content script, which waits for the page rather than sleeping:

```javascript
// content.js
function whenPresent(selector, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);
    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { obs.disconnect(); resolve(el); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); reject(new Error("not found: " + selector)); }, timeoutMs);
  });
}
```

Three details to copy. The queue lives in storage, so a terminated worker loses nothing. The alarm uses the documented 30-second floor. And the content script fails loudly with the selector name, which is what turns a vendor redesign into a one-line fix.

## Takeaways

- When the tool is not yours and the vendor is slow, an extension that automates in place can ship in weeks. The price is that vendor UI changes become your monitoring problem.
- In MV3 the service worker is disposable: 30 seconds idle, 5 minutes per request, 30 seconds per fetch. Keep state in `chrome.storage`, never in globals.
- Use alarms, not timers, for retries, and respect the 30-second minimum.
- Define uptime as workflow completion, not process liveness, and make failures visible to a person.
- Isolate selectors, verify before writing, and wait on the DOM with `MutationObserver` instead of fixed sleeps.

The decision record is case file 08, "Chrome extensions (MV3)", and the model side of the same admissions pipeline is in case file 07, "AI document processing".
