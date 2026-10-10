---
title: "Getting 100 Lighthouse on Astro for a real marketing site"
description: "How the Incresco and Camped sites reached 100% Lighthouse on Astro and Storyblok, and what Astro's docs say about images, fonts and islands for the same goal."
date: 2026-10-10T02:18:00Z
tags: ["Astro", "Lighthouse", "performance", "Storyblok", "page builders"]
pillar: case-files
related: adr-004-incresco-camped-astro
sources:
  - title: "Astro docs: images (Image, Picture, responsive images, what is optimised)"
    url: "https://docs.astro.build/en/guides/images/"
  - title: "Astro docs: islands architecture"
    url: "https://docs.astro.build/en/concepts/islands/"
  - title: "Astro docs: Fonts API"
    url: "https://docs.astro.build/en/guides/fonts/"
  - title: "Astro docs: Storyblok and Astro"
    url: "https://docs.astro.build/en/guides/cms/storyblok/"
  - title: "Chrome for Developers: Lighthouse overview"
    url: "https://developer.chrome.com/docs/lighthouse/overview"
  - title: "Chrome for Developers: how the Lighthouse performance score is calculated"
    url: "https://developer.chrome.com/docs/lighthouse/performance/performance-scoring"
draft: false
---

In 2023, as a Software Development Engineer 2 at Incresco, I worked on the redesign of the Incresco and Camped marketing sites on Astro and Storyblok, with customisable page builders. They reached 100% in Lighthouse across the board. Marketing could then launch campaigns across 23+ languages without waiting for engineering. The score was not an accident of the framework. It was an acceptance criterion from the start.

This is the long version of case file 04. The project facts come from that record. The performance techniques come from the current Astro and Lighthouse documentation, and I say where a feature is newer than the 2023 build. This portfolio runs on Astro 7, and the same defaults apply.

## What was the brief?

The Incresco and Camped sites needed a comprehensive redesign with better SEO and sitemap performance. Marketing wanted to launch campaigns in many languages without waiting on engineering.

The record lists two options. Redesigning on the existing stack meant no platform change, but the performance and SEO ceilings stayed where they were and every campaign page was still an engineering task. Astro with Storyblok and customisable page builders meant static output with 100% Lighthouse scores, and page builders that let marketing assemble campaign pages themselves. The cost the record lists is a new framework for the team to learn and support.

The decision was Astro and Storyblok, with Lighthouse and sitemap quality treated as acceptance criteria, not hopes. A target that is part of "done" gets measured on every change, and one that is only a hope gets measured once, near the end.

## What does a Lighthouse score actually measure?

Lighthouse is "an open-source, automated tool to help you improve the quality of web pages". It audits four categories: performance, accessibility, best practices and SEO. "100% across the board" means all four.

Performance is the one that fights back. Chrome's scoring page says it is "a weighted average of the metric scores". For Lighthouse 10 the weights are:

| Metric | Weight |
|---|---|
| Total Blocking Time | 30% |
| Largest Contentful Paint | 25% |
| Cumulative Layout Shift | 25% |
| First Contentful Paint | 10% |
| Speed Index | 10% |

A score of 90 to 100 is green. Opportunities and diagnostics do not feed the score directly; they are advice about the metrics.

Two things follow. First, blocking time and layout shift together are more than half the score, and both are mostly self-inflicted by JavaScript and by images and fonts that change size after load. Second, the same page does not score identically twice. The docs say "a lot of the variability in your overall Performance score and metric values is not due to Lighthouse", and recommend treating performance as a distribution of scores. An acceptance criterion should therefore be stated as a result you can reproduce, such as the worst of several runs, not the best.

## Why does Astro make this easier?

Astro's pitch matches the weights above. The islands docs say Astro "converts every UI component to HTML and CSS and removes client-side JavaScript automatically", adding JavaScript only to components you explicitly mark as interactive. A marketing page is mostly text, images and layout. If those ship as HTML, Total Blocking Time starts near zero.

For the components that must be interactive, a client directive controls when the cost is paid: `client:load` immediately, `client:idle` when the browser is idle, `client:visible` when the component scrolls into view. A form or carousel at the bottom of a page should not cost a user anything until they reach it.

## What do the docs say about images?

Images drive Largest Contentful Paint and Cumulative Layout Shift, so they are the first thing to audit. A caveat before the details: these are the current docs. The docs tag `<Picture />` with astro@3.3.0, SVG components with astro@5.7.0 and responsive layouts with astro@5.10.0, and the last two are newer than my 2023 build. I am describing today's options, not claiming I used them.

- The `<Image />` component outputs an optimised image element and infers width and height, so the page avoids layout shift. The docs call CLS "a Core Web Vital metric".
- It can transform a local or authorised remote image's "dimensions, file type, and quality".
- `<Picture />` generates multiple formats, such as AVIF and WebP, with a fallback.
- Setting `layout` generates `srcset` and `sizes` automatically for responsive images.
- "Images in your `public/` folder are never optimized". An image dropped into `public/` skips all of the above.
- `alt` is required, with `alt=""` for decorative images.

One detail from the page's own output deserves attention: it shows `loading="lazy"` and `fetchpriority="auto"`. Lazy loading is right for most images and wrong for the one that is the Largest Contentful Paint element, usually the hero. Override it there, and check the docs for the exact prop in your Astro version.

## What about fonts?

The Fonts API in the current docs "focuses on performance and privacy by downloading and caching fonts so they're served from your site". It adds preload links and optimised fallbacks, and copies font files to `_astro/fonts` so they benefit from long-lived HTTP caching. The advice on preloading is restrained: "Font preloading should be done sparingly", only for fonts needed above the fold. The docs do not say which Astro release introduced the API, so I will not guess.

The measurable effect is on layout shift. A fallback font that matches the web font's metrics keeps text from jumping when the real font arrives, and shifting text counts against a 25% weight.

## How does a page builder stay fast?

This is the risky part. A page builder lets editors assemble pages, and an editor can assemble a slow one. The Astro guide for Storyblok shows the mechanism: the integration's `components` option maps each Storyblok block name to an Astro component, and `<StoryblokComponent />` renders a block and, recursively, its nested blocks. Because the blocks are Astro components, they are static HTML unless you mark them otherwise.

So the discipline sits in the block library, not in each page. If every block is a performance-safe component, then any combination an editor builds is fast. That includes blocks that route images through `<Image />` and keep client directives to the few that need them.

For publishing, the guide says static builds need a rebuild when content changes, and recommends a Vercel or Netlify build hook registered in Storyblok under "Story published & unpublished". That closes the loop for marketing: publish a page, a build runs, the static page appears. Nobody files a ticket.

## Hands-on: a page that holds the score

A minimal Astro setup that follows the docs for fonts, images, the Storyblok mapping and one deferred island. Check each against the docs for your Astro version.

```js
// astro.config.mjs
import { defineConfig, fontProviders } from "astro/config";
import storyblok from "@storyblok/astro";
import { loadEnv } from "vite";

const env = loadEnv("", process.cwd(), "STORYBLOK");

export default defineConfig({
  // Storyblok images are remote: authorise your CMS's image host, or they are not optimised.
  // Check the Storyblok docs for the hostname; `image.remotePatterns` also works.
  image: { domains: ["YOUR-CMS-IMAGE-HOST"] },
  fonts: [{
    name: "Inter",
    cssVariable: "--font-inter",
    provider: fontProviders.fontsource(),
    weights: [400, 600],
    styles: ["normal"],
  }],
  integrations: [
    storyblok({
      accessToken: env.STORYBLOK_TOKEN,
      components: { hero: "storyblok/Hero", campaignForm: "storyblok/CampaignForm" },
    }),
  ],
});
```

```astro
---
// src/storyblok/Hero.astro: a block mapped from Storyblok
import { Image } from "astro:assets";
import { storyblokEditable } from "@storyblok/astro";
const { blok } = Astro.props;
---
<section {...storyblokEditable(blok)}>
  <h1>{blok.headline}</h1>
  <!-- Hero is the LCP element: override the lazy default (check the docs for the prop) -->
  <Image src={blok.image} alt={blok.alt ?? ""} width={1200} height={600} />
</section>
```

```astro
---
// src/storyblok/CampaignForm.astro: the interactive part is one island, deferred until visible
import Form from "../components/Form.tsx";
---
<Form client:visible />
```

Then measure it like an acceptance criterion. The Lighthouse docs describe a command-line run, `lighthouse <url>`, and PageSpeed Insights as a no-install alternative. Run it several times and record the worst result for performance, not the best. Fail the build if any category drops under your threshold; the docs mention Lighthouse CI for guarding against regressions.

## Takeaways

- Write the Lighthouse target into the acceptance criteria and add sitemap quality beside it. What is measured on every change stays true.
- Ship HTML by default. Blocking time is 30% of the performance score and every hydrated component spends it.
- Put performance in the block library. If the page builder only offers safe blocks, editors cannot assemble a slow page.
- Audit the Largest Contentful Paint image and the fonts first. Both feed the 25% weights.
- State the target as the worst of several runs, because Lighthouse results vary even with nothing changed.

For another platform where multilingual publishing was the constraint, see the case file on running a 23-language marketing site on Next.js and Storyblok as the only engineer.
