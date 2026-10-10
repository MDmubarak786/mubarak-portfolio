---
title: "Astro for AI content sites: static HTML, islands only where needed"
description: "Why an AI content site should ship static HTML: Astro 7 content collections, islands, build-time model calls and an honest look at the JavaScript this site ships."
date: 2026-10-10T02:01:00Z
tags: ["Astro", "static sites", "performance", "content collections", "islands", "build-time AI"]
pillar: building
related: adr-004-incresco-camped-astro
sources:
  - title: "Astro docs: Why Astro?"
    url: "https://docs.astro.build/en/concepts/why-astro/"
  - title: "Astro docs: Content collections"
    url: "https://docs.astro.build/en/guides/content-collections/"
  - title: "Astro docs: Islands architecture"
    url: "https://docs.astro.build/en/concepts/islands/"
  - title: "Astro docs: Content Loader API reference"
    url: "https://docs.astro.build/en/reference/content-loader-reference/"
  - title: "Astro docs: Rendering modes"
    url: "https://docs.astro.build/en/basics/rendering-modes/"
  - title: "Astro docs: Scripts and event handling"
    url: "https://docs.astro.build/en/guides/client-side-scripts/"
  - title: "Claude API overview (Messages endpoint, headers)"
    url: "https://platform.claude.com/docs/en/api/overview"
  - title: "Claude API errors (Messages request example)"
    url: "https://platform.claude.com/docs/en/api/errors"
draft: false
---

Most sites about AI are documents: articles, docs, comparisons, case studies. A reader arrives, reads, leaves. Shipping a JavaScript application to deliver a document is a choice, and for a content site it is usually the wrong one. I build with Astro for exactly this case, and as of October 2026 (Astro 7) its defaults are still the ones that suit it. This post covers the parts that matter for AI-flavoured content sites, and an honest audit of what this one ships.

## What is Astro actually doing differently?

The framework's pitch is written into its docs. "Astro was designed for building content-rich websites," and the page goes as far as "It should be impossible to build a slow website in Astro." The mechanism is the islands architecture: Astro renders UI components to HTML and CSS and, in the docs' words, "stripping out all client-side JavaScript automatically." JavaScript ships only for components you mark as interactive with a `client:*` directive, and each island hydrates on its own.

Three directives cover most needs. `client:load` makes a component interactive on the page, `client:idle` waits for the browser to be idle, and `client:visible` loads the component only when it scrolls into view; if a reader never sees it, its JavaScript never loads.

Rendering is static by default: "By default, Astro pages, routes, and API endpoints will be pre-rendered at build time as static pages." On-demand rendering is opt-in. You add an adapter, then set `export const prerender = false` on the individual routes that need a server, and the rest of the site stays static.

I saw this pay off at work. The Incresco and Camped marketing sites were rebuilt on Astro and Storyblok in 2023 with customizable page builders, with Lighthouse and sitemap quality as acceptance criteria. The result was 100% Lighthouse scores and campaign launches across 23+ languages ([case file 04](/#file-adr-004-incresco-camped-astro)). That is a marketing site, not an AI one, but the lesson transfers: a static page with the content already in the HTML is the easiest thing for a browser, a search engine and an AI crawler to read.

## Why does static HTML matter more for AI-era content?

Because your readers now include crawlers that cite you. Whether a given assistant executes JavaScript is something I would not assume. HTML that already contains the article, its headings and its structured data does not depend on it. A static build also makes each page a file: cheap to serve from a CDN, easy to cache, and nothing to scale when a post gets shared.

## How do content collections fit an AI content workflow?

Collections are Astro's typed content layer. You define them in `src/content.config.ts` with `defineCollection()`, give each a `loader` and a Zod `schema`, and export a single `collections` object. The docs import Zod from `astro/zod` and note it is a re-export that supports Zod 4. The `glob()` loader reads directories of Markdown, MDX, JSON, YAML or TOML. You query with `getCollection()` and render with `render()`, which returns a `<Content />` component and the headings.

Two details worth knowing. The docs warn that the order `getCollection()` returns is "non-deterministic and platform-dependent", so sort explicitly. And the schema is where you can turn editorial rules into build failures. This site's posts collection enforces a title of at most 90 characters, a description of 80 to 170, a pillar from a fixed enum and a URL-validated sources array, so a post that breaks a rule fails the build instead of shipping. If a model drafts your content, that gate matters more, not less.

## What does this site actually ship?

I checked `src/` before writing this. There is no `client:*` directive anywhere, so there are no framework islands. Blog pages are produced by `getStaticPaths` over the posts collection, the Open Graph image for each post is a static endpoint rendered with satori at build time, the RSS feed is a static endpoint, and the Article JSON-LD is written into the page at build. I found no `prerender = false` in the source.

That is not the same as zero JavaScript, and I would not claim it. The pages load a small page-transition script that uses GSAP, plus Google Tag Manager for analytics when it is configured. Astro's docs say a `<script>` tag with no attributes other than `src` is processed: imports are bundled, a script used by several components is included once, and it becomes a module. So the JavaScript is real, bundled and deliberate, and it is mine to justify, not the framework's. The right framing is "no hydrated framework tree", not "no JS".

## How do you call a model at build time?

Astro has a build-time hook for exactly this: a custom content loader. The docs describe building a loader that fetches remote content from a CMS, a database or an API endpoint, and the object form gives your `load()` function a `store`, `parseData`, `generateDigest`, a `meta` store that persists between builds, and a `logger`. `generateDigest` matters here. An entry is only updated when its digest changes, so unchanged inputs can skip the model call.

Why would a content site call a model at build time? Short summaries, translated metadata, alt text, tags. The pattern keeps the model out of the request path: readers get static HTML, you pay for each input once, and a failed call breaks a build you can retry, not a page a reader sees.

This is a pattern, not something this site does today. The loader below uses only documented APIs; the Messages request shape comes from the Claude API docs: endpoint and headers from the overview, JSON body (`model`, `max_tokens`, `messages`) from the curl example on the errors page.

```ts
// src/content.config.ts (excerpt)
import { defineCollection } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { readFile } from 'node:fs/promises';

async function summarise(text: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: `Summarise in one sentence, no hype:\n\n${text}` }],
    }),
  });
  if (!res.ok) throw new Error(`Messages API ${res.status}`);   // fail the build loudly
  const msg = await res.json();
  return msg.content.find((b: { type: string }) => b.type === 'text').text;
}

function summaryLoader(file: string): Loader {
  return {
    name: 'summary-loader',
    load: async ({ store, parseData, generateDigest, logger }) => {
      const items: { id: string; body: string }[] = JSON.parse(await readFile(file, 'utf8'));
      for (const item of items) {
        const digest = generateDigest(item);
        // Check the docs for the exact shape store.get returns before relying on .digest.
        if (store.get(item.id)?.digest === digest) continue;   // unchanged: no model call
        logger.info(`summarising ${item.id}`);
        const summary = await summarise(item.body);
        const data = await parseData({ id: item.id, data: { ...item, summary } });
        store.set({ id: item.id, data, digest });
      }
    },
  };
}

const notes = defineCollection({
  loader: summaryLoader('./src/data/notes.json'),
  schema: z.object({ id: z.string(), body: z.string(), summary: z.string() }),
});

export const collections = { notes };
```

Whether the store survives between builds depends on whether your CI keeps Astro's cache; check the docs, or you will call the model on every build. Commit the generated text if you want fully reproducible output, because model output is not deterministic.

When something genuinely needs request-time data, the docs offer two routes. Live collections fetch "at runtime rather than build time", are defined in `src/live.config.ts`, and need an adapter for on-demand rendering. Or you keep the page static and add one island:

```astro
---
import Chat from '../components/Chat.tsx';
---
<h1>Docs assistant</h1>
<!-- Static article above; the assistant's JS loads only if the reader scrolls to it. -->
<Chat client:visible />
```

## Takeaways

- For a content site, start static and add islands one at a time; `client:visible` is the cheapest default for an AI widget.
- Put editorial rules in the collection schema so bad content breaks the build.
- Call models at build time through a loader with digest checks, keep them out of the request path, and fail the build on API errors.
- Audit what you ship. "No islands" and "no JavaScript" are different claims.
- Keep structured data and the article body in the HTML, so crawlers do not depend on executing your scripts.

For the longer story of an Astro rebuild with real numbers, read the [Incresco and Camped case file](/#file-adr-004-incresco-camped-astro).
