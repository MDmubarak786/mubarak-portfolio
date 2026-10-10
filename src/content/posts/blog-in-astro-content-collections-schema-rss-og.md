---
title: "Build an Astro blog: content collections, RSS and per-post OG images"
description: "How this site's blog is built on Astro 7: a Zod-checked posts collection, hand-written RSS and satori OG images. Real code, plus where it departs from the docs."
date: 2026-10-10T02:29:00Z
tags: ["Astro", "content collections", "RSS", "satori", "Open Graph", "static sites"]
pillar: building
sources:
  - title: "Astro docs: content collections (loaders, schemas, getCollection, render)"
    url: "https://docs.astro.build/en/guides/content-collections/"
  - title: "Astro docs: add an RSS feed (the @astrojs/rss recipe)"
    url: "https://docs.astro.build/en/recipes/rss/"
  - title: "Astro docs: static file endpoints (.png.ts routes, getStaticPaths)"
    url: "https://docs.astro.build/en/guides/endpoints/"
  - title: "satori README (options, fonts, supported CSS)"
    url: "https://github.com/vercel/satori"
draft: false
---

The blog you are reading is a folder of Markdown files, one Zod schema and three route files. Astro 7 turns them into static HTML at build time, with no CMS and no client-side JavaScript for the article itself. As of 10 October 2026 this site runs Astro `^7.3.8`, and this post shows each piece, trimmed from the repo, including the two places where I did not follow the docs.

## What is an Astro content collection?

A collection is a named set of entries that Astro loads, validates and lets you query. You define collections in `src/content.config.ts` with `defineCollection()` and export one `collections` object. The docs split the imports three ways: `defineCollection` and `reference` come from `astro:content`, loaders from `astro/loaders`, and Zod from `astro/zod`, which the page describes as "a re-export of the Zod library" supporting Zod 4.

For Markdown you use the `glob()` loader with a `base` directory and a `pattern`. The entry `id` is generated from the filename, so `src/content/posts/my-post.md` has the id `my-post`, which becomes the URL slug. You read entries with `getCollection()` and render one with `render(entry)`, which returns a `<Content />` component.

One line in that page matters more than it looks: the order of `getCollection()` results is "non-deterministic and platform-dependent", so you have to sort yourself. Keep that in mind for the routes below.

## What does the posts schema look like?

This is the posts collection from this repo, unchanged:

```ts
const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().max(90),
    description: z.string().min(80).max(170),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    pillar: z.enum(["model-watch", "building", "case-files"]),
    related: z.string().optional(),
    sources: z.array(z.object({ title: z.string(), url: z.url() })).default([]),
    draft: z.boolean().default(false),
  }),
});
```

Every field earns its place. `max(90)` and the description window of 80 to 170 characters are this site's own limits for titles and descriptions, enforced where a violation fails loudly instead of in a review. `z.coerce.date()` is the docs' own choice for dates and accepts both `2026-10-10` and a full ISO timestamp. `z.url()` stops a malformed source link from shipping. `pillar` is an enum, so a typo cannot create a fourth category. The docs promise that if "any file violates its collection schema, Astro will provide a helpful error", which is the entire point: the build is the editor.

Sources live in frontmatter, not in the body. The post layout renders them as a list, so every article has the same citation block and the body never carries a hand-formatted one.

## How do the routes turn entries into pages?

Two pages. `src/pages/blog/index.astro` lists posts and `src/pages/blog/[slug].astro` renders one. The core of the second is `getStaticPaths()`:

```astro
---
export async function getStaticPaths() {
  const posts = (await getCollection("posts", ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return posts.map((post, i) => ({
    params: { slug: post.id },
    props: { post, newer: posts[i - 1] ?? null, older: posts[i + 1] ?? null, issue: posts.length - i },
  }));
}
const { post } = Astro.props;
const { Content, headings } = await render(post);
const minutes = Math.max(1, Math.round((post.body ?? "").split(/\s+/).length / 220));
---
```

The filter callback is the docs' draft pattern. The sort is mine, newest first. `issue` is derived from position, so the oldest post is Issue 01 and the count grows as you publish. The page also builds a table of contents from `headings.filter((h) => h.depth === 2)`, estimates reading time at 220 words a minute, and emits `Article` JSON-LD from the frontmatter, with `dateModified` falling back to `date` when `updated` is absent.

There is a trap in this design. Because issue numbers come from sort position, backdating a post renumbers every issue after it. And because Astro does not promise an order, two posts with the same timestamp can swap places between machines. So give every post a time of day, not only a date. The posts in this series are stamped a minute apart for exactly that reason.

## Should you use @astrojs/rss?

Probably, and the docs make it short. Install `@astrojs/rss`, set `site` in the Astro config, add `src/pages/rss.xml.js`, and return `rss()`:

```ts
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const blog = await getCollection("blog");
  return rss({
    title: "Buzz's Blog",
    description: "A humble Astronaut's guide to the stars",
    site: context.site,
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
  });
}
```

That is the recipe's own shape, with the placeholder feed name left in. This repo does not do that. `package.json` lists no `@astrojs/rss`, and `src/pages/rss.xml.ts` writes the XML as a template string, 29 lines including an `esc()` helper that escapes `&`, `<`, `>` and quotes in titles and descriptions. It emits one `<item>` per post with `<link>`, a permalink `<guid>`, `<pubDate>` from `date.toUTCString()` and a `<category>` per tag, plus an `atom:link` that points at the feed itself.

I would not tell you to copy that. It works because the fields are few and I control every string. The helper builds the feed from options you pass; with hand-written XML, the first ampersand in a field that skips `esc()` produces an invalid feed. Use the package unless you have a specific reason not to.

## How do per-post Open Graph images work?

An endpoint is a `.ts` file under `src/pages` whose name ends in the output type. The docs' example is `src/pages/astro-logo.png.ts`; this site has `src/pages/blog/og/[slug].png.ts`. It exports `getStaticPaths()`, which in static mode can pass props, and a `GET` that returns a `Response` with the bytes. Astro writes the response body to a file at build time.

The image itself is drawn by satori, which takes an element tree and returns an SVG string. Two rules from its README shaped the code. First, "You must specify the font if any text is rendered", and it accepts "TTF, OTF and WOFF" but not WOFF2, which is why `src/assets/fonts` holds two TTF files, one for the display face and one for the text face. Second, the output is SVG, so something has to rasterise it.

```ts
const svg = await satori(tree as any, {
  width: 1200, height: 630,
  fonts: [
    { name: "Bangers", data: bangers, weight: 400, style: "normal" },
    { name: "Patrick", data: patrick, weight: 400, style: "normal" },
  ],
});
const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
```

The README's own example uses Sharp; this repo uses `@resvg/resvg-js`, and I have not benchmarked the two. The layout has one concession to long titles: the headline drops from 78 to 64 pixels when the title passes 60 characters, which is a good reason to keep titles near 60. The route also sets a long `Cache-Control` header, which does nothing in a static build because Astro writes the body to a file; I left it in as a note to myself, not as a feature.

The post layout then points `og:image` and `twitter:image` at `/blog/og/<slug>.png`, so every new post gets a card with no extra work.

## Takeaways

- A collection plus a Zod schema is the whole content system: frontmatter limits become build errors, not review comments.
- Sort explicitly and give every post a distinct time of day; Astro documents the default order as non-deterministic, and issue numbers that come from position inherit that.
- Use `@astrojs/rss` by default. Hand-written XML is a choice you maintain, including the escaping.
- Endpoints with `getStaticPaths()` give you one generated file per post; satori needs TTF, OTF or WOFF fonts loaded explicitly and a rasteriser such as resvg or Sharp.
- Render sources and structured data from frontmatter so every post carries the same citations and the same JSON-LD.

The analytics scripts that load on every one of these pages, and what they cost in Lighthouse, are measured in [GA4, Tag Manager and Clarity on a static site](/blog/ga4-gtm-clarity-on-a-static-site-without-wrecking-lighthouse).
