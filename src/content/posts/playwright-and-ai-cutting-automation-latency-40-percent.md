---
title: "Playwright and AI: cutting automation latency 40% without flakiness"
description: "Where Playwright automation time goes, the documented levers (state reuse, waiting, blocking, parallelism), and where a model helps with selectors and where it hurts."
date: 2026-10-10T01:58:00Z
tags: ["Playwright", "automation", "latency", "flaky tests", "AI agents", "admin tooling"]
pillar: case-files
related: adr-008-chrome-extensions
sources:
  - title: "Playwright docs: best practices"
    url: "https://playwright.dev/docs/best-practices"
  - title: "Playwright docs: authentication (storageState, setup projects)"
    url: "https://playwright.dev/docs/auth"
  - title: "Playwright docs: parallelism and workers"
    url: "https://playwright.dev/docs/test-parallel"
  - title: "Playwright docs: network (route.abort, waitForResponse)"
    url: "https://playwright.dev/docs/network"
  - title: "Playwright docs: library (using Playwright outside the test runner)"
    url: "https://playwright.dev/docs/library"
  - title: "Playwright docs: locators (strictness, auto-waiting)"
    url: "https://playwright.dev/docs/locators"
  - title: "Playwright docs: browser contexts"
    url: "https://playwright.dev/docs/browser-contexts"
  - title: "Playwright docs: test agents (planner, generator, healer)"
    url: "https://playwright.dev/docs/test-agents"
draft: false
---

In the admin tooling around the Chrome extensions in [case file 08](/#file-adr-008-chrome-extensions), I cut Playwright automation latency by 40%. I am not going to hand you a recipe with percentages attached to each trick, because I cannot back that decomposition. What I can do is list where the time in a browser automation goes, which levers Playwright documents for each, and where a model helps or hurts. A faster automation that fails one run in twenty is worse than a slow one, so every lever below comes with its flakiness cost.

## Where does the time go in a browser automation?

Five places, roughly in the order they get fixed.

1. **Logging in on every run.** A sign-in form plus redirects is seconds of work that produce nothing.
2. **Fixed sleeps.** A one-second pause "to be safe" after each step adds up across a dozen steps, and it still fails when the page is slower than the guess.
3. **Loading things the flow does not use.** Images, fonts and third-party widgets.
4. **Doing one thing at a time.** Latency per item is fixed; throughput is not.
5. **The real work.** The part you cannot remove.

An invented budget shows how this adds up. These numbers are made up for illustration and are not my measurements:

| Per application | Before | After |
|---|---|---|
| Sign in | 6 s | 0 s (saved state reused) |
| Sleeps and retries | 10 s (ten 1 s pauses) | 2 s (waiting on conditions) |
| Page assets | 4 s | 2 s (unused images blocked) |
| The actual work | 20 s | 20 s |
| **Total** | **40 s** | **24 s, a 40% cut** |

Notice that the biggest single saving comes from deleting waits and sign-ins, not from making clicks faster.

## How do you reuse a session safely?

Playwright's auth guide describes the pattern: tests run in isolated browser contexts, so you sign in once in a setup step, save the state, and load it into every later run. The state goes in a `playwright/.auth` directory that you add to `.gitignore`. The guide is blunt that the file can contain sensitive cookies and headers and that it strongly discourages checking them into repositories. Treat that file as a credential.

Two limits matter. Playwright has no API to persist session storage, so a tool that keeps its login there needs the workaround the page describes. And a reused session expires; when it does, the run fails at the first protected page. Make that failure obvious, regenerate the state in the setup step, and do not paper over it with a retry loop.

If the tool allows one concurrent session per account, the guide's one-account-per-worker pattern uses `testInfo.parallelIndex` to pick a unique account for each worker.

## How should waiting work?

Playwright waits for you. Its locators come with auto-waiting and retry-ability, and the best-practices page says to use web-first assertions such as `toBeVisible()`, which wait and retry until the condition is met. Two rules from that page prevent most flakiness:

- Always `await expect(...)`. A manual check like `isVisible()` returns immediately without waiting.
- Prefer locators built from what a user perceives, roles and text, over CSS or XPath. The locators page recommends `getByRole()` because it reflects how users and assistive technology perceive the page.

For a network-dependent step, wait on the response, and start waiting before the action that triggers it. The network guide's example sets up `page.waitForResponse(...)`, then clicks, then awaits the promise. That replaces a sleep with the actual signal that the work finished.

## What about blocking assets and running in parallel?

**Blocking.** `page.route()` with `route.abort()` cancels requests; the docs show a glob for image extensions, and a check on `route.request().resourceType()` for broader rules. Routes on a browser context apply to popups and opened links too. The flakiness cost is real: block something the page needs and your anchors may never appear. Block only what you have shown the flow does not use, and keep a visible assertion after each page load so a blocked-too-much page fails loudly.

**Parallelism.** By default Playwright runs test files in parallel and tests inside a file in order, in the same worker. `fullyParallel` runs everything in parallel, and `workers` caps the worker processes; the page does not state a default count, so set one explicitly. Workers "have identical environments and each starts its own browser", and cannot communicate with each other. The catch for admin automation is shared state: two workers processing the same applicant collide on the backend. The docs suggest `testInfo.workerIndex` to give each worker its own data.

If you use Playwright as a library rather than the test runner, the library page's flow is launch, create a context, create a page, work, and close the context and browser yourself. Contexts are "fast and cheap to create and are completely isolated, even when running in a single browser", so one browser with several contexts is a cheaper way to run items side by side than several browsers. Check the docs for the exact `newContext` options to load saved state there.

## Hands-on: state reuse, one wait, one assertion

The config and setup follow the auth guide. The `workers` value is yours to tune against what the target tool tolerates.

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  workers: 4,
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "admin",
      dependencies: ["setup"],
      use: { storageState: "playwright/.auth/admin.json" },
    },
  ],
});
```

```ts
// tests/auth.setup.ts
import { test as setup, expect } from "@playwright/test";

setup("sign in once", async ({ page }) => {
  await page.goto("https://tool.example.com/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.context().storageState({ path: "playwright/.auth/admin.json" });
});
```

```ts
// tests/mark-documents-received.spec.ts
import { test, expect } from "@playwright/test";

test("mark documents received", async ({ page }) => {
  await page.route("**/*.{png,jpg,jpeg,gif}", (route) => route.abort());   // only if the flow never needs them

  await page.goto("https://tool.example.com/applications/123");
  await expect(page.getByRole("heading", { name: "Application 123" })).toBeVisible();

  const saved = page.waitForResponse("**/api/applications/123/status");   // wait before the click
  await page.getByLabel("Note").fill("Documents received");
  await page.getByRole("button", { name: "Save" }).click();
  await saved;

  await expect(page.getByText("Saved")).toBeVisible();   // web-first assertion, retries until true
});
```

Run it with `--trace on` while you tune. The best-practices page recommends traces over videos and screenshots for debugging failures, and a trace shows exactly where the time goes per step.

## Where does a model help, and where does it hurt?

Playwright's own docs describe three agents. The planner explores an app and produces a Markdown test plan. The generator transforms the plan into test files and verifies selectors and assertions live as it runs the scenarios. The healer "automatically repairs failing tests" by replaying failing steps, inspecting the current UI, suggesting a patch and re-running the test. That is documentation; I have not run these agents on the admin tooling.

**Where a model helps: proposing locators, offline.** When a vendor changes a page, a model that sees the live DOM can suggest a new role-and-name locator faster than you can find it by hand. The output is a diff for a human to read and commit, after which the run is deterministic again.

**Where it hurts: in the run path.** A model call per step adds a network round trip and a variable delay to every step, and the result can differ between runs. That is the opposite of a latency cut and the opposite of reproducibility. Keep models out of the loop that executes thousands of times.

**Where it hurts quietly: repairs that loosen a locator.** The docs note that generated tests "may include initial errors that can be healed automatically", and that the healer may leave a test skipped if it believes the functionality is broken. A repair can pass by becoming sloppier. Locators are strict by default, and the locators page says an action targeting more than one element throws, and that `first()`, `last()` and `nth()` bypass the check and are not recommended. My review rule for any suggested patch follows from that: reject any change that adds `.first()` or `.nth()`, and treat a newly skipped test as a failure to investigate, not a green result.

## Takeaways

- Break the latency into sign-in, sleeps, unused assets, serial work and the real work. The first two are usually where the cheap wins are.
- Reuse state, treat the saved file as a credential, and make session expiry fail loudly.
- Replace every sleep with auto-waiting, web-first assertions, and a response wait started before the click.
- Block assets only when you can show the flow does not need them, and set `workers` explicitly with per-worker data to avoid collisions.
- Use a model to propose locator changes for human review, never in the run path, and reject patches that add `.first()` or `.nth()`.

The wider story of these admin extensions is in [Automating admin work: the 3 to 5 hours a day pattern](/blog/automating-admin-work-with-ai-the-3-5-hours-pattern), and the decision record is [case file 08](/#file-adr-008-chrome-extensions).
