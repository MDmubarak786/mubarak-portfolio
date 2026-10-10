---
title: "Browser admin automation: the 3 to 5 hours a day pattern, and where AI fits"
description: "How to find the hours worth automating in a browser workflow, what 99.9% uptime means for an extension, and where AI belongs. From case file 08, with a worked example."
date: 2026-10-10T01:57:00Z
tags: ["automation", "admin tooling", "Chrome extension", "Manifest V3", "reliability"]
pillar: case-files
related: adr-008-chrome-extensions
sources:
  - title: "Chrome for Developers: Chrome Extensions documentation"
    url: "https://developer.chrome.com/docs/extensions"
  - title: "Chrome for Developers: content scripts"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts"
  - title: "Chrome for Developers: the extension update lifecycle"
    url: "https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle"
  - title: "Chrome for Developers: update your Chrome Web Store item (percentage rollout, deferred publish)"
    url: "https://developer.chrome.com/docs/webstore/update"
  - title: "Google SRE book: eliminating toil"
    url: "https://sre.google/sre-book/eliminating-toil/"
  - title: "Sentry docs: shared environments and browser extensions"
    url: "https://docs.sentry.io/platforms/javascript/best-practices/shared-environments/"
  - title: "Playwright docs: locators"
    url: "https://playwright.dev/docs/locators"
  - title: "Playwright docs: test agents (planner, generator, healer)"
    url: "https://playwright.dev/docs/test-agents"
draft: false
---

The case file does not describe a model in the loop of these extensions, so this post is about the automation pattern and where AI sits around it. What the record does say is plain and measurable. Admin teams at BSBI and GISMA worked student application workflows by hand inside third-party web tools that could not be changed, and Manifest V3 Chrome extensions that automate those workflows in place saved 3 to 5 hours per admin per day at 99.9% uptime. This post is about the pattern behind the number: how to find the hours, how to keep them, and where AI belongs.

For the architecture of the extensions themselves, see [Chrome extensions that save admins 3 to 5 hours a day](/blog/chrome-extensions-that-save-admins-hours). This post stays on the method.

## What did the case file automate?

The record, [case file 08](/#file-adr-008-chrome-extensions), gives the shape. The context is admin teams working application workflows by hand in tools they could not change. The options were to ask the vendors, which is "slow, uncertain, and outside the team's control", or to automate in place with extensions, which "ships in weeks, works on top of tools the team already uses". The recorded results are 3 to 5 hours per admin per day, 99.9% uptime, PDF.js extraction that cut processing time 50%+, and admin lookup time down 60%. It does not list the individual workflow steps, and I will not invent them.

That is enough for a pattern. The extension runs inside the page the admin is already using. Chrome's documentation lists "injecting content scripts" under modifying and observing the web, and describes a content script as a file that runs in the context of a web page, reading and changing its DOM.

## How do you find the hours?

Start from a definition that stops you automating things you merely dislike. Google's SRE book defines toil as work that is manual, repetitive, automatable, tactical, without enduring value, and linear with growth, and says plainly that toil is not just "work I don't like to do". That is a decent filter for admin work: a task that recurs for every applicant and leaves nothing behind is a candidate; a rare judgement call is not.

Then measure. Shadow two or three admins for a day, list every repeated task, time one instance and count how often it happens. Multiply. The numbers below are invented to show the method; the real result is the case file's 3 to 5 hours.

| Task | Minutes each | Times a day | Minutes a day |
|---|---|---|---|
| Look up one applicant across three tabs | 3 | 40 | 120 |
| Re-key details from a PDF into a form | 5 | 25 | 125 |
| Update status in the second tool | 2 | 50 | 100 |
| Check required documents are present | 4 | 20 | 80 |
| **Total** | | | **425 (about 7.1 hours)** |

Automate lookups and re-keying completely and you remove 245 minutes, about 4.1 hours. Halve the status updates and the saving is about 4.9 hours. Notice what drives the result: two tasks out of four, chosen because they are frequent and mechanical, not because they are annoying.

One caveat from the same SRE chapter: automating a task does not remove its toil until the human work is actually eliminated. If the admin still has to click "run" on each applicant, you have a faster click, not a deleted task. The big wins come from removing the step.

## What does 99.9% uptime actually mean?

Arithmetic first. 0.1% of a 30-day month is 43.2 minutes; of a year, 8,760 hours times 0.001 is 8.76 hours. But an admin tool is used in working hours. At roughly 176 working hours a month, 0.1% is about 10.6 minutes. The denominator you choose changes the promise by a factor of four, so write it down.

There is no server to ping in an extension, and the record does not say how the 99.9% was measured. If I were defining it, I would count attempted automation runs and measure the share that complete without the admin having to step in. That definition catches the failure that matters most for a tool living in someone else's page: it silently stops working after the vendor changes a button.

## How do you keep the extension working?

Three layers, none of them exotic.

**Verify before you act.** The risk the record names is "vendor UI changes". A content script should check that the elements it expects are present before it writes anything, stop visibly if they are not, and tell someone. Anchor on what a user sees, not on layout classes. Playwright's docs recommend role-based locators because they reflect how users and assistive technology perceive the page, and the same logic applies to a content script's selectors.

```js
// content-script.js: a preflight, kept separate from the automation itself
const ANCHORS = {
  applicantName: () => document.querySelector('[aria-label="Applicant name"]'),
  statusSelect:  () => document.querySelector('select[name="status"]'),
};

export function preflight() {
  const missing = Object.entries(ANCHORS)
    .filter(([, find]) => !find())
    .map(([name]) => name);
  if (missing.length) {
    chrome.runtime.sendMessage({ type: "preflight-failed", missing, url: location.pathname });
    return false;       // do not automate; show the admin the manual path
  }
  return true;
}
```

Report those failures somewhere people look. Sentry's docs say that `Sentry.init()` modifies global state and that the SDK skips initialisation when it detects an extension, so the guide has you build a `BrowserClient`, attach it to your own `Scope` and capture explicitly; check the current guide for the exact setup.

**Release carefully.** Chrome's update lifecycle sets the rhythm: it checks for updates on startup and every few hours, and installs only when the extension is idle. For Manifest V3 that generally means the service worker is not running and no extension pages are open. If the extension never goes idle, the update waits for a browser restart. So a bug fix does not reach every admin at once, and your code has to tolerate two versions running side by side.

The Web Store offers a percentage rollout, but only for new versions of items with more than 10,000 seven-day active users. You can raise the percentage without a new review, only one partial rollout can run at a time, and the page does not describe a pause; for a bad release it points to the separate rollback feature. Staged publishing lets you hold an approved version for up to 30 days. An internal admin tool will often be far below the 10,000 threshold, so check whether you qualify. For managed fleets, Chrome's enterprise policies cover force-install, version pinning and a custom update URL, and the docs warn that an update which raises `minimum_chrome_version` silently stops reaching users on older Chrome.

**Count fallbacks.** Track runs started, runs completed and runs that fell back to manual. Without those three numbers, "99.9%" is a feeling. Keep the counters minimal and disclosed, in line with the consent points in the post on calling Claude from an extension.

## Where does AI fit?

Not in the click path. A click sequence is deterministic, fast and testable, and a model call in the middle makes it slower and less predictable. In this design, AI earns a place in three jobs around the automation.

1. **Reading documents.** Classifying and extracting from uploaded files is what [case file 07](/#file-adr-007-ai-document-processing) records, with confidence scoring and review thresholds. The extension hands the file over and applies the result.
2. **Proposing repairs.** When the vendor changes the page and the preflight fails, a model can suggest new anchors. Playwright's docs describe a healer agent that replays failing steps, inspects the current UI, suggests a patch and re-runs. That is documentation, not something I ran on these extensions, and I would keep a human approving the change.
3. **Summarising exceptions.** Turn a pile of preflight failures into a readable note for the maintainer.

If an extension does call a model, keep the key off the device and the call behind a proxy, as described in [Building a Chrome extension that calls Claude safely](/blog/chrome-extension-that-calls-claude-safely), and mind the service worker lifetimes in [Manifest V3 and AI](/blog/manifest-v3-and-ai-service-workers-offscreen-documents).

## Takeaways

- Define the work before you automate it: manual, repetitive, mechanical, recurring for every case. Skip rare judgement calls.
- Measure minutes per task times frequency, and pick the two or three tasks that dominate the total.
- Remove steps rather than speeding them up; a script an admin still triggers per item keeps most of the toil.
- Define uptime as a share of attempted runs, write the denominator down, and add a preflight that stops loudly when the host page changes.
- Plan for staggered updates and check whether percentage rollout applies before relying on it.

The architecture behind these extensions is covered in [Chrome extensions that save admins 3 to 5 hours a day](/blog/chrome-extensions-that-save-admins-hours), and the decision record is [case file 08](/#file-adr-008-chrome-extensions).
