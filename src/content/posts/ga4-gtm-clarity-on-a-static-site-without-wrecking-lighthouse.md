---
title: "GA4, Tag Manager and Clarity on a static site: what they cost in Lighthouse"
description: "Env-var-gated GA4, Tag Manager and Clarity on an Astro site, with a measured PageSpeed run: the third-party bill, its effect on blocking time, and what I would cut."
date: 2026-10-10T02:30:00Z
tags: ["Google Analytics", "Tag Manager", "Clarity", "Lighthouse", "Astro", "performance"]
pillar: building
sources:
  - title: "Google tag (gtag.js) install snippet"
    url: "https://developers.google.com/tag-platform/gtagjs/install"
  - title: "Google Tag Manager Help: install a web container (snippet placement)"
    url: "https://support.google.com/tagmanager/answer/14847097"
  - title: "Microsoft Learn: set up Clarity manually"
    url: "https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup"
  - title: "Astro docs: environment variables (PUBLIC_ prefix, build-time replacement)"
    url: "https://docs.astro.build/en/guides/environment-variables/"
  - title: "PageSpeed Insights report for this site, mobile, 10 October 2026"
    url: "https://pagespeed.web.dev/analysis/https-mk-comics-vercel-app/n4nizifj0c?form_factor=mobile"
  - title: "PageSpeed Insights report for this site, desktop, 10 October 2026"
    url: "https://pagespeed.web.dev/analysis/https-mk-comics-vercel-app/ayt6py2505?form_factor=desktop"
  - title: "web.dev: efficiently load third-party JavaScript"
    url: "https://web.dev/articles/efficiently-load-third-party-javascript"
  - title: "web.dev: optimize long tasks (the 50 ms definition)"
    url: "https://web.dev/articles/optimize-long-tasks"
draft: false
---

Analytics on a static site is three snippets and a Lighthouse bill, and the bill is rarely itemised. On 10 October 2026 I ran PageSpeed Insights on this site's home page: mobile 68, desktop 88. The Tag Manager and Clarity scripts cost about 364 ms of main-thread time on the mobile run, which is real but is not the main reason the mobile score is low. Here is the code, the numbers and what I would change.

## How are the three snippets loaded on this site?

Each one is gated on a Vercel environment variable, so a build without the variable ships no tracker at all. This is trimmed from `src/layouts/FinalShell.astro`:

```astro
---
const GTM = import.meta.env.PUBLIC_GTM_ID as string | undefined;
const GA = import.meta.env.PUBLIC_GA_ID as string | undefined;
const CLARITY = import.meta.env.PUBLIC_CLARITY_ID as string | undefined;
---
<head>
  <!-- ... meta, fonts, JSON-LD ... -->
  {GTM && <script is:inline define:vars={{ GTM }}>/* Google's loader; sets j.async = true */</script>}
  {GA && <script is:inline async src={`https://www.googletagmanager.com/gtag/js?id=${GA}`}></script>}
  {GA && <script is:inline define:vars={{ GA }}>
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;               // exposed for custom events
    gtag('js', new Date());
    gtag('config', GA);
  </script>}
  {CLARITY && <script is:inline define:vars={{ CLARITY }}>/* Clarity loader; t.async = 1 */</script>}
</head>
<body>
  {GTM && <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM}`}
    height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>}
```

Two facts from the Astro docs explain the pattern. Only variables prefixed `PUBLIC_` are available in client-side code, and Vite's variables are "statically replaced at build time", so changing an ID means a rebuild, not a restart. The `is:inline` and `define:vars` directives keep the snippets as written and pass the IDs in; check the Astro docs for their exact behaviour before you rely on them.

Placement follows the vendors. Google says the Tag Manager script goes "as high in the head tag as possible" and the `noscript` iframe immediately after the opening `body` tag. Google's gtag.js page says the same for its snippet: right after the opening `head`, with an `async` script tag. Microsoft says to paste Clarity's code into the `<head>`. All three loaders are asynchronous, so none blocks parsing. That does not make them free.

## What did PageSpeed measure?

One run per device, captured on 10 October 2026 with Lighthouse 13.5.0. Mobile is PageSpeed's emulated Moto G Power on slow 4G. Each report is linked in the sources.

| Metric | Mobile | Desktop |
|---|---|---|
| Performance score | 68 | 88 |
| First Contentful Paint | 3.5 s | 0.3 s |
| Largest Contentful Paint | 5.1 s | 0.8 s |
| Total Blocking Time | 170 ms | 270 ms |
| Cumulative Layout Shift | 0.003 | 0.013 |
| Speed Index | 5.3 s | 1.1 s |

Accessibility was 97, best practices 100 and SEO 100 on both. The report's "3rd parties" insight for the mobile run lists what the tags cost:

| Third party | Transfer | Main-thread time |
|---|---|---|
| Google Tag Manager (total) | 291 KiB | 272 ms |
| of which `gtag/js` | 178 KiB | 220 ms |
| of which `gtm.js` | 114 KiB | 52 ms |
| Clarity (total) | 28 KiB | 92 ms |
| of which `clarity.js` | 25 KiB | 91 ms |
| Google Analytics `collect` | 1 KiB | 0 ms |

That is about 320 KiB and 364 ms. Three readings, none of them flattering to a tidy story.

**Main-thread time is not blocking time.** Total Blocking Time sums the blocking part of long tasks; web.dev defines a long task as one that "takes longer than 50 milliseconds" and calls the excess over 50 ms the blocking period. The 364 ms is work spread over many tasks, and mobile TBT was 170 ms. Do not subtract one from the other.

**Desktop is where TBT shows.** Desktop reports 270 ms, rated orange, next to an LCP of 0.8 s. It is the only desktop metric not rated green.

**Mobile LCP is mostly not analytics.** The mobile LCP of 5.1 s breaks down, per PageSpeed, into 2,490 ms of element render delay on the hero paragraph. That points at how the page itself reveals its first screen, with the greeting loader and web fonts my first suspects. I have not isolated it, and I will not pretend the tag scripts explain a 68.

## What would I change?

**Load one tag loader, not two.** The layout loads `gtm.js` and `gtag.js` directly, and in this run `gtag/js` was the single biggest item at 178 KiB and 220 ms. Decide which one owns GA4. If the GA4 configuration lives in a Tag Manager container, drop the direct `gtag` snippet. If it is configured directly and the container fires nothing you need, drop Tag Manager. Keeping both also risks counting hits twice if the container carries its own GA4 configuration; I flag that as a risk, not something I observed.

**Defer the session recorder.** web.dev's guidance is to use `async` for scripts that should run earlier and `defer` for the less critical, and heatmaps are the least critical script on the page. This swaps the loader's immediate execution for an idle-time start:

```ts
const idle = (fn: () => void) =>
  "requestIdleCallback" in window ? requestIdleCallback(fn) : setTimeout(fn, 2000);

window.addEventListener("load", () => idle(() => loadClarity(CLARITY)));  // loadClarity: your Clarity snippet wrapped in a function
```

The cost is that visitors who leave before load are never recorded. For heatmaps on a portfolio, I would take that trade. Clarity's docs say data appears "as soon as you add the code", so test that it still shows up.

**Decide on consent before you scale.** Clarity's setup page says that with its cookies setting off "you need to pass the consent", and that recordings are not linked into multi-page sessions. It also says Clarity should not be used on sites targeting users under 18. Read the current Google guidance for your audience's region before relying on defaults.

## Hands-on: measure with and without

A single PageSpeed run is a sample, not a verdict. To get the real delta for your site, build twice.

1. Deploy a preview with the three `PUBLIC_` IDs unset. They are inlined at build time, so redeploy after changing them.
2. Run mobile PageSpeed at least five times on each version and compare the median Total Blocking Time and the "3rd parties" table.
3. Record the Lighthouse version printed in the report; scores move between versions.

To script it, the PageSpeed API accepts the same URL. My unauthenticated request returned HTTP 429, so use a key and check the API docs for the exact parameter and response shape:

```bash
for i in 1 2 3 4 5; do
  curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$URL&strategy=mobile&category=performance&key=$KEY" \
    | jq '.lighthouseResult.audits["total-blocking-time"].numericValue'
done
```

## Takeaways

- Gate every snippet on a `PUBLIC_` environment variable so previews and local builds carry no trackers, and remember the IDs are baked in at build time.
- On this site's mobile run, two Google loaders plus Clarity came to about 320 KiB and 364 ms of main-thread time, with `gtag/js` the largest piece.
- Main-thread time and Total Blocking Time are different numbers. Read the LCP breakdown before blaming analytics for a low score.
- Run one tag loader and defer the session recorder; both are cheap changes.
- Measure with and without, several runs each. Mine is one run per device.

The structure these pages sit in is in [Build an Astro blog: content collections, RSS and per-post OG images](/blog/blog-in-astro-content-collections-schema-rss-og).
