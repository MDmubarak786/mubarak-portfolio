---
title: "Open Graph images generated at build with satori in Astro"
description: "How this blog makes one 1200x630 share image per post at build time with satori and resvg in an Astro endpoint: fonts, layout limits, caching traps and the code."
date: 2026-10-10T02:28:00Z
tags: ["Open Graph", "satori", "Astro", "resvg", "social cards"]
pillar: building
sources:
  - title: "vercel/satori README: HTML and CSS to SVG (fonts, CSS support, runtime)"
    url: "https://github.com/vercel/satori"
  - title: "resvg-js README: SVG renderer for Node.js (Resvg, fitTo, font options)"
    url: "https://github.com/thx/resvg-js"
  - title: "Astro docs: static file endpoints (GET, getStaticPaths, binary output)"
    url: "https://docs.astro.build/en/guides/endpoints/"
  - title: "The Open Graph protocol (og:image properties, article properties)"
    url: "https://ogp.me/"
  - title: "Meta for Developers: sharing best practices for images (size, caching)"
    url: "https://developers.facebook.com/docs/sharing/webmasters/images/"
draft: false
---

Every post on this blog has its own share image, a comic panel carrying the title, the date and the pillar. Nobody draws them. An Astro endpoint renders each one at build time from the post's frontmatter, so the card can never disagree with the page. This is how the route works, where satori's rules bite, and two caching traps I would fix.

## What does the route do?

The file is `src/pages/blog/og/[slug].png.ts`. In Astro's endpoint model the filename keeps the extension of the output, so the route builds to `/blog/og/<slug>.png`. The docs say the endpoint's `GET` function is called at build time and its response body is written to a file, and that with `getStaticPaths()` in static mode you can pass props to it. The route uses exactly that: it loads the non-draft posts and passes each one's title, date and pillar as props.

The pipeline has three steps:

1. Read two font files from `src/assets/fonts`: Bangers for the headline and Patrick Hand for the labels.
2. Describe the card as a tree of plain objects and give it to satori, which returns SVG.
3. Rasterise the SVG to PNG with `@resvg/resvg-js` and return it as the response body.

Satori's README says the tree can be JSX or, without a JSX transpiler, plain objects with `type`, `props.children` and `props.style`. The route uses the object form through a one-line helper, so there is no JSX and no React in the build.

## What are satori's limits?

Read the README before you design the card, because satori is "not a complete CSS implementation". The points that shaped this one:

- **Fonts are mandatory and format-limited.** Any rendered text needs a font passed as a Buffer in Node. Supported formats are TTF, OTF and WOFF, and "WOFF2 is not supported at the moment." The site's page fonts come through Astro's font pipeline, but those are not what satori sees. The OG route reads separate `.ttf` files: Bangers at about 93 KB and Patrick Hand at about 215 KB.
- **Weights are not faked.** "Bold isn't synthesized when no bold font is loaded", and italics likewise. Both fonts here are used at weight 400 only, so there is nothing to synthesise.
- **Several fonts work.** Multiple fonts can be passed and used in `fontFamily`, and loaded fonts act as fallbacks in the order passed. This card passes Bangers and Patrick under their own names.
- **Layout is flexbox, grid or block.** The README lists "Flexbox, Grid and block layouts", not flexbox only. The code here sets `display: "flex"` on every container; whether that is required for elements with several children is something to check in the docs rather than assume. `display: table` and `ruby` throw errors.
- **No stylesheets.** You cannot use `<style>` tags or external `<link>` and `<script>`. Everything is inline style.
- **Text helpers have conditions.** `textWrap: balance` and `lineClamp` only apply to text with no inline elements inside.
- **`debug: true` draws bounding boxes.** Use it while you tune the layout.

Two things in the card are decorative CSS. The dotted background is a `radial-gradient` in `backgroundImage` with `backgroundSize`; the README says `backgroundImage` is supported except `image-set()` and `cross-fade()`. The panel's hard shadow is `boxShadow: "14px 14px 0 #111"`, which the README lists as supported.

## How is the card laid out?

A fixed 1200 by 630 canvas with 48px padding, so the card is 1104 by 534 with a 6px border. Inside it, a column with `justifyContent: "space-between"` puts a label chip at the top ("Building with AI · 10 October 2026"), the title in the middle and a footer with the site name and URL at the bottom. The pillar label comes from a lookup, falling back to "The strip".

The one adaptive rule is on the title: `title.length > 60 ? 64 : 78` for the font size. The content schema caps titles at 90 characters, so the longest title the route will ever see is bounded, and the card needs to survive that case. Because the canvas is a fixed height, a title that wraps to too many lines can overflow the card instead of failing the build, so render the longest realistic title and look at it.

## Hands-on: the route, trimmed

```ts
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function getStaticPaths() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title, date: post.data.date, pillar: post.data.pillar },
  }));
}

// object-form element helper: satori accepts { type, props: { style, children } }
const h = (type: string, style: Record<string, unknown>, children?: unknown) =>
  ({ type, props: { style, children } });

export const GET: APIRoute = async ({ props }) => {
  const { title, date, pillar } = props as { title: string; date: Date; pillar: string };
  const [bangers, patrick] = await Promise.all([
    readFile(resolve(process.cwd(), "src/assets/fonts/bangers-400.ttf")),
    readFile(resolve(process.cwd(), "src/assets/fonts/patrick-hand-400.ttf")),
  ]);

  const tree = h("div", { width: 1200, height: 630, display: "flex", padding: 48, background: "#fff8e7",
      backgroundImage: "radial-gradient(#111 1.2px, transparent 1.4px)", backgroundSize: "10px 10px" }, [
    h("div", { display: "flex", flexDirection: "column", justifyContent: "space-between",
        width: 1104, height: 534, background: "#fff", border: "6px solid #111",
        boxShadow: "14px 14px 0 #111", padding: 56 }, [
      h("span", { fontFamily: "Patrick", fontSize: 28 }, `${pillar} · ${date.toISOString().slice(0, 10)}`),
      h("div", { display: "flex", fontFamily: "Bangers", fontSize: title.length > 60 ? 64 : 78,
          lineHeight: 1.02, color: "#ff2e63" }, title),
      h("span", { fontFamily: "Bangers", fontSize: 40 }, "MK COMICS"),
    ]),
  ]);

  const svg = await satori(tree as any, {
    width: 1200, height: 630,
    fonts: [
      { name: "Bangers", data: bangers, weight: 400, style: "normal" },
      { name: "Patrick", data: patrick, weight: 400, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
```

The real file adds the date formatting, the label lookup, and a `Cache-Control` header. One note on the rendering step: satori's README suggests Sharp for PNG output, and this route uses resvg-js instead. Its README describes a Rust renderer with `new Resvg(svg, opts)`, `render()` and `asPng()`, `fitTo: { mode: 'width', value: 1200 }` to set the output width, and says the `.node` binary is compiled for you, so there is no node-gyp step.

## Where are the caching traps?

**1. The `Cache-Control` header probably does nothing.** The route sets `public, max-age=31536000, immutable` on the response. The endpoint docs say Astro writes the response body to a file in a static build, so the header has nowhere to live. The build output in this repo is consistent with that: each OG image is a plain static PNG of roughly 46 to 51 KB, and the generated Vercel `config.json` has a cache-control rule for `/_astro/*` only, with nothing matching `/blog/og/`. What the host actually sends for those files is the host's decision, so check it with `curl -I https://mk-comics.vercel.app/blog/og/<slug>.png` rather than trusting the source.

**2. The image URL does not change when the title does.** Meta's guidance says images are cached by URL, so changing the image at the same URL will not update it. To refresh, use a new URL, keep the old file available, and pre-cache the new one with the Sharing Debugger. Here the URL is `/blog/og/<slug>.png`, which stays fixed for the life of the post. If you edit a title after sharing, existing previews can show the old card. A cheap fix is a version query on the `og:image` value built from the post's `updated` date, for example `?v=2026-10-12`, so a real edit produces a new URL. I have not tested how every platform treats a query string, so verify on the ones you care about.

One performance note that does not matter yet: the route reads both font files for every post. The README recommends defining fonts globally for performance when they do not change; check it for the exact mechanism. With a few dozen posts the cost is negligible; read the files once at module scope before it is hundreds.

## What does the page need around the image?

The Open Graph protocol requires `og:title`, `og:type`, `og:image` and `og:url`. For `og:image` it also defines `og:image:width`, `og:image:height`, `og:image:type` and `og:image:alt`, and says the alt should be included whenever `og:image` is specified. Meta adds that 1200 by 630 is the recommended size, the aspect ratio should be near 1.91:1, the file must not exceed 8 MB, and `og:image:width` and `og:image:height` let the crawler render the image immediately.

The site's layout sets `og:image`, the 1200 and 630 dimensions, `twitter:card` as `summary_large_image`, and the `article:*` tags on posts, which match the protocol's `article:published_time`, `article:author` and `article:tag`. It does not set `og:image:alt`. That is the one item I would add: a short string such as the post title.

## Takeaways

- An Astro endpoint named `[slug].png.ts` with `getStaticPaths()` gives you one image per post at build time and no runtime cost.
- Satori needs TTF, OTF or WOFF fonts as Buffers. WOFF2 will not work.
- Fixed canvas plus variable title means test the longest title your schema allows, with `debug: true` on.
- In a static build, response headers in the endpoint are not how you control caching. Check what the host sends.
- Image URLs are cached by URL. Version them when the content can change, and add `og:image:alt`.

For another Astro build where output quality was the headline, see the case file on [Incresco and Camped on Astro](/#file-adr-004-incresco-camped-astro), which hit 100 on Lighthouse.
