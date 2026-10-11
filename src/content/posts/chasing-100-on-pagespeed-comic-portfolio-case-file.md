---
title: "Chasing 100 on PageSpeed: what actually moved on a comic-book portfolio"
description: "Twelve deploys, one score at a time: contrast fixes, llms.txt, a Tamil font stall worth 600 ms, content-visibility, and the Lighthouse noise that caps mobile at 99."
date: 2026-10-11T09:30:00Z
updated: 2026-10-11T09:30:00Z
tags: ["Lighthouse", "PageSpeed Insights", "Core Web Vitals", "accessibility", "Astro", "GSAP", "llms.txt", "case file"]
pillar: case-files
related: adr-004-incresco-camped-astro
sources:
  - title: "Lighthouse performance scoring (metric weights and curves)"
    url: "https://developer.chrome.com/docs/lighthouse/performance/performance-scoring"
  - title: "Lighthouse scoring calculator"
    url: "https://googlechrome.github.io/lighthouse/scorecalc/"
  - title: "Lighthouse throttling and Lantern simulation"
    url: "https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md"
  - title: "web.dev: content-visibility, the CSS property that boosts rendering performance"
    url: "https://web.dev/articles/content-visibility"
  - title: "web.dev: Optimize Largest Contentful Paint"
    url: "https://web.dev/articles/optimize-lcp"
  - title: "Chrome DevTools insight: forced reflow"
    url: "https://developer.chrome.com/docs/performance/insights/forced-reflow"
  - title: "The llms.txt proposal"
    url: "https://llmstxt.org/"
  - title: "WCAG 2.2: contrast (minimum)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"
draft: false
---

This site is a comic book. Halftone background, Bangers headlines with ink strokes, speech bubbles that spring in, a greeting loader in six languages. On 10 October it scored 95 / 97 / 100 / 100 on PageSpeed mobile, and I wanted the full row of hundreds. Twelve deploys later it reads 98 to 99 / 100 / 100 / 100 on mobile and 100 across the board on desktop, with the new Agentic Browsing check at 3/3. This is the case file: every change, what it moved, and the two that moved nothing.

Everything below was measured with PageSpeed Insights on 10 and 11 October 2026, Lighthouse 13.5, an emulated Moto G Power on slow 4G. The site is Astro 7 with Tailwind, GSAP and Lenis, deployed on Vercel.

## Accessibility: 97 to 100 in one commit

axe found exactly one violation on the home page: the "Open file 02 ▸" lines under the number cards were pink at 75% opacity, which renders as #ff628a on white, a 2.85:1 ratio. Small text needs 4.5:1. Dropping the opacity and using a darker pink (#b5123b, 6.8:1) fixed that card, but the deeper scan that followed found 26 more nodes the first pass had missed:

- Case-file headlines in the brand colours. Yellow on white is 1.74:1 and no amount of darkening makes a yellow that reads as yellow pass. The fix was a design move, not a colour tweak: the headline became a marker-highlight sticker, ink text on the coloured fill, with `box-decoration-break: clone` so wrapped lines each get their own strip. Purple is the only fill dark enough to need white text.
- Numbered tabs on the power-up panels: white on teal or blue is 3.5:1. Same answer, ink text on the fill.
- A promotion caption with white text on teal. The caption family is ink on fill everywhere else; this one had an override.
- Code blocks: Shiki's `github-light` theme paints variables in #e36209, 3.48:1. Switching to `github-light-high-contrast` puts every token at 5:1 or better.
- Blog cards used `h3` straight after the page `h1`, and the post sidebar was an `aside` inside `main`. Heading order is a scored Lighthouse audit; the landmark one is not, but both took a minute.

What I learned about axe along the way: it does account for `-webkit-text-stroke` and hard text shadows, which is why the big stroked numbers never failed while the plain coloured headlines did. If a brand colour only works with an outline, give it the outline everywhere or put ink on top of it.

## Agentic Browsing: llms.txt needs links

Lighthouse 13 adds an "Agentic Browsing" category. Two of its three checks passed; the third said my llms.txt "does not appear to contain any links." The file had plenty of URLs, written bare. The proposal wants Markdown: an H1, a blockquote summary, then sections of `- [title](url): description` lines. Rewriting it that way, with the sitemap, RSS and robots entries as links, took it to 3/3. Worth doing even if you never look at the gauge, because that format is what the crawlers that read these files expect.

## The performance detour

Performance on mobile sat at 95 with FCP 1.4 s, LCP 1.7 s, TBT 173 ms, CLS 0 and a Speed Index of 4.3 s. The score is a weighted blend (TBT 30%, LCP 25%, CLS 25%, FCP 10%, SI 10%), so a 4.3 s Speed Index on a page that paints at 1.4 s was the thing to explain.

**First theory, wrong.** The cover's letter-by-letter slam and elastic burst keep the viewport changing for about 1.5 s after the script runs. Speed Index measures visual completeness over time, so I made phones skip the intro entirely (the first paint is the final frame on a phone; desktops keep the show). Speed Index did not move. The animations were never the problem.

**Three real ones.** The chapter menu's scroll tracker read `offsetTop` for every section on load, a 107 ms forced reflow on a throttled CPU; it now measures once after load and caches. The page-curtain transition imported GSAP, which made Vite split GSAP into a shared chunk and put a second request in the critical chain; the curtain is now three lines of CSS transition and the chain is one request shorter. And the GitHub contribution grid was 51 KB of inline SVG, 730 DOM nodes, below the fold; it now lives at `/calendar.svg` and is fetched when the panel comes within 800 px. TBT went from 173 ms to 86 ms. Speed Index stayed at 4.4 s.

**Below the fold.** Nine of the eleven sections now carry `content-visibility: auto` with an intrinsic-size estimate, so the first paint only pays for the cover. That broke the GSAP ScrollTrigger reveals, which measure skipped elements as zero and fire everything at once, so the reveals moved to a single IntersectionObserver per group. Fewer objects, and it works inside skipped subtrees. The chapter menu measures section boxes instead of headings for the same reason.

**The Tamil font.** The LCP element on phones was the intro paragraph, and its "element render delay" was 2,480 ms: the paragraph painted 2.5 s after the HTML arrived even though nothing in it loads. The filmstrip showed six blank frames, then everything at once. A blog post on the same site, same fonts, same CSS, scored a flat 100 with FCP under a second. The difference was one chip in that paragraph: my name in Tamil, "முகமது முபாரக்", in a system font. On PageSpeed's Linux machines, resolving a fallback font for a script that the page's web fonts do not cover held the whole first frame for about 600 ms of unthrottled CPU. The name is now an inline SVG of glyph outlines, shaped once with HarfBuzz from a system Tamil font and committed as a 4 KB path, with `role="img"`, `lang="ta"` and an `aria-label`. Render delay fell to 1,270 ms, Speed Index from 4.1 s to 2.3 s, and the score hit 99. The greeting loader still shows Tamil, Hindi and Japanese on desktop, where the budget allows it.

**Two that backfired.** Loading the 55 KB motion bundle only after `load` sounded like a free win for the fonts. It pushed GSAP's setup and my analytics fallback timer into the Lighthouse trace instead: TTI 5 s, TBT 153 ms, score 96. Reverted. Preloading the portrait with `fetchpriority="high"` did make the image the LCP element, as planned, but it delayed the fonts just enough for the intro paragraph to paint in the fallback first and re-wrap on swap: CLS 0.07. The real fix was a metric-matched fallback for Patrick Hand (Astro's Fonts API generates one from `fallbacks: ['Arial']`, with `size-adjust: 81%`); the Bangers fallback already existed. CLS back to 0, preload removed.

**Analytics timing.** Tags (Tag Manager and Clarity) used to boot 1.5 s after `load`, later 4 s. Whether that timer fired inside Lighthouse's trace depended on how long the trace ran, which depended on how busy the PageSpeed machine was, which is why identical builds scored 95 one minute and 99 the next. They now boot on the first scroll, touch, pointer or key, with a 15 s fallback for people who read without moving. Lighthouse never interacts, so it never measures them; a real reader gets them within a second or two of arriving.

## Where it landed

| | Before | After |
|---|---|---|
| Mobile performance | 95 | 98 to 99 |
| Mobile FCP / LCP | 1.4 s / 1.7 s | 1.24 s / 1.68 s |
| Mobile TBT / CLS | 173 ms / 0 | 0 ms / 0 |
| Mobile Speed Index | 4.3 s | 2.3 s on a quiet run, 3.9 s on a busy one |
| Desktop | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Accessibility, Best Practices, SEO (mobile) | 97 / 100 / 100 | 100 / 100 / 100 |
| Agentic Browsing | 2/3 | 3/3 |

The last point is the honest part. With TBT and CLS at 100 and FCP and LCP at 99, the score rounds to 100 only when Speed Index also lands at 99 or better. Speed Index on PageSpeed is derived from an observed trace on shared hardware, and on this page it swings between 2.3 s and 3.9 s between runs of the same build. On a quiet run the row reads 99; I have not seen 100 on mobile, and I stopped chasing it once the remaining work was shaving tens of milliseconds off a number with a 1.6 s spread.

## Takeaways

- Run axe yourself with `wcag2aa` and best-practice tags, on the home page and one of every template. Lighthouse samples; axe lists every node.
- Brand colours that fail contrast want a treatment, not a darker shade: ink on the fill, or a stroke the checker can see.
- Read the LCP breakdown before touching anything. "Element render delay" on a text element with no resources means the browser is waiting on something you did not know you asked for; here it was a system font for one word.
- `content-visibility: auto` pays off on long pages, but anything that measures skipped elements (ScrollTrigger, your own `offsetTop` reads) must switch to IntersectionObserver or measure the container.
- Never put third-party tags on a short timer after `load`. If the timer can fire inside a Lighthouse trace, your score depends on the weather on Google's servers.
- Deferring your own bundle past `load` is not free: anything it does lands in TBT and TTI instead of before them.
- Judge from the calculator link in the report, not the gauge. It shows which metric is holding the point, and when that metric is Speed Index on a page that paints in one frame, you are measuring the test machine.
