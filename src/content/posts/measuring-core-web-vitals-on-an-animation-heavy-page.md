---
title: "Measuring Core Web Vitals on an animation-heavy page"
description: "LCP, INP and CLS on a page full of GSAP and Lenis scroll animation: what each metric counts, which patterns it ignores, and a PageSpeed workflow that does not mislead."
date: 2026-10-10T02:39:00Z
updated: 2026-10-10T15:00:00Z
tags: ["Core Web Vitals", "performance", "GSAP", "Lenis", "PageSpeed Insights", "Astro"]
pillar: building
sources:
  - title: "web.dev: Web Vitals (the three metrics, thresholds, tools)"
    url: "https://web.dev/articles/vitals"
  - title: "web.dev: Largest Contentful Paint (LCP)"
    url: "https://web.dev/articles/lcp"
  - title: "web.dev: Interaction to Next Paint (INP)"
    url: "https://web.dev/articles/inp"
  - title: "web.dev: Cumulative Layout Shift (CLS)"
    url: "https://web.dev/articles/cls"
  - title: "PageSpeed Insights documentation: about (field data, lab data, score bands)"
    url: "https://developers.google.com/speed/docs/insights/v5/about"
  - title: "GoogleChrome/web-vitals: the measurement library (README)"
    url: "https://github.com/GoogleChrome/web-vitals"
  - title: "PageSpeed Insights"
    url: "https://pagespeed.web.dev/"
draft: false
---

A page that animates headings letter by letter, springs panels into view and smooths its own scroll looks like the opposite of a fast page. It does not have to be. Core Web Vitals measure three specific things, and most scroll choreography touches none of them if you pick the right properties. The risk is the one animation that does: the one on your biggest element.

This post is what each metric counts according to the web.dev docs, how that applies to the motion on this site, and a measuring workflow that does not mislead you. It is a design argument built on the docs, plus one small set of PageSpeed scores from an earlier build. I did not run a new before-and-after for this post, so there are no new numbers in it.

## What do LCP, INP and CLS actually measure?

Three metrics, each judged at the 75th percentile of page loads, split by mobile and desktop. A page passes when all three meet the target.

| Metric | What it tracks | Good |
|---|---|---|
| Largest Contentful Paint (LCP) | when the largest visible content renders | 2.5 seconds or less |
| Interaction to Next Paint (INP) | how quickly the page visually responds to input | 200 ms or less |
| Cumulative Layout Shift (CLS) | how much visible content unexpectedly moves | 0.1 or less |

The details matter more than the table for an animated page.

**LCP** reports "the render time of the largest image, text block, or video visible in the viewport". The eligible elements are images, SVG images, videos, elements with a `url()` background image and block-level elements containing text. In Chromium, elements with "an opacity of 0" are excluded, and so are elements that cover the full viewport. Text that has not rendered yet is not a candidate either, so a smaller element can be reported first.

**INP** is the successor to First Input Delay. It counts only clicks, taps and key presses; scrolling, hovering and zooming are excluded. Each interaction runs from the input until the browser can paint the next frame, covering input delay, handler time and presentation delay. The reported number is usually the worst interaction, with outliers discounted.

**CLS** is "a measure of the largest burst of layout shift scores": shifts less than a second apart, in a window of at most five seconds. A shift happens when a visible element changes its start position. Per the article, to animate without shifts, use `transform: scale()` instead of changing height or width, and `transform: translate()` instead of changing top, right, bottom or left.

## How does animation touch each metric?

Read together, those definitions give a short set of rules for a page like this one.

**CLS is the easy one, if you animate transforms.** A panel that slides up 50px with `transform` does not change the position of anything else in the layout, so it is not a layout shift. What does shift things: animating `height`, `top` or `margin`, inserting elements above content that has rendered, fonts that swap to a different size, and images with no dimensions. Scroll choreography written with `y`, `x`, `scale`, `rotation` and `opacity` stays on the safe side. The CLS article also says to respect `prefers-reduced-motion`.

**INP does not see your scrolling.** Because scroll is excluded, a scroll-linked animation is not itself an INP event. But it shares the main thread with your click handlers. If a tick of the smooth-scroll loop and a heavy animation callback are running when someone taps a menu button, the presentation delay is yours. That is my reasoning from the definition, not a measurement: the rule is to keep per-frame work small and to avoid running animations in event handlers that must paint immediately.

**LCP is where animation bites.** If the largest element on screen is your `h1`, and your intro animation starts it at `opacity: 0`, then by the LCP definition that element is not a candidate while it is invisible. The metric can only be recorded once it becomes visible. A long delay before the animation starts is added straight onto your LCP. A smaller element may be reported first and then superseded.

This is the part of this site I would look at first, so here is the real code. The cover animation in `src/scripts/comic-motion.ts` splits the main title into characters and animates them in:

```ts
const cover = () => {
  const title = document.querySelector<HTMLElement>("h1");
  if (title) {
    const chars = new SplitText(title, { type: "words,chars" }).chars;
    gsap.from(chars, {
      y: 80,
      rotation: () => gsap.utils.random(-14, 14),
      opacity: 0,
      duration: 0.7,
      ease: "back.out(2)",
      stagger: 0.03,
      delay: 0.1,
    });
  }
  // ...sticker and buttons...
};
if (document.documentElement.classList.contains("is-loading")) {
  document.addEventListener("comic:ready", () => setTimeout(cover, 350), { once: true });
} else {
  cover();
}
```

Two things follow from reading it against the LCP rules. The characters start at `opacity: 0`, so the title is not an LCP candidate until the animation runs. And when the greeting loader is showing, the cover waits for the `comic:ready` event plus 350 ms. Whatever the loader costs, plus that wait, sits in front of the moment the headline counts. I have not measured how much that is worth on the live page. If I wanted a quick win, the candidates are a shorter wait, a headline that stays visible while only its decoration animates, or a different element as the intended LCP.

The rest of the motion script follows a safer rule, and it is the one I would copy:

```ts
// Panels are readable by default; each slams in once as it arrives.
document.querySelectorAll<HTMLElement>(".panel:not([data-cover])").forEach((p) =>
  ScrollTrigger.create({
    trigger: p,
    start: "top 96%",
    once: true,
    onEnter: () =>
      gsap.from(p, { y: 50, scale: 0.97, duration: 0.6, ease: "back.out(1.4)", clearProps: "transform" }),
  }),
);
```

The content is in the HTML and visible by default. `gsap.from` only adds a movement as a panel arrives, using `y` and `scale`, which are transforms, and `once: true` means it never replays. `clearProps: "transform"` removes the inline transform afterwards. The whole block is wrapped in `if (!reduce)`, so a visitor who prefers reduced motion gets the content with no choreography. Nothing in the panel is hidden in the stylesheet, so a visitor whose script is slow or blocked still sees the content. That is the habit I would copy first.

## How do I measure it without fooling myself?

Two kinds of data, and they answer different questions.

**Field data** is what real users experienced. PageSpeed Insights draws it from the Chrome User Experience Report, "the previous 28-day collection period". The docs note that pages with too little data fall back to origin-level data, and "some origins have none". A new or low-traffic site may have nothing to show. A passing assessment needs the 75th percentile of all three metrics to be good.

**Lab data** is a simulated Lighthouse load. It is the tool for debugging, and the docs warn that it "may miss real-world bottlenecks" and that field and lab values differ because they measure different conditions. A lab score of 90 to 100 is rated good.

One gap matters for this kind of page. Lighthouse can measure LCP and CLS, but per web.dev it cannot measure INP, because there is no user input in the run; it reports Total Blocking Time as a proxy. So a green PageSpeed score tells you nothing about whether your menu button paints promptly. For that you need real interactions, in Chrome DevTools or from real users.

### My workflow

1. Run PageSpeed Insights on the live URL after every deploy that changes motion, mobile first, and read the LCP element it names, not just the score.
2. If field data exists, trust it over the lab score for pass or fail. If it does not, say so and treat the lab numbers as a debugging aid.
3. Click through the page in DevTools with CPU throttling on while the animation is running, because that is where INP problems appear.
4. Collect real-user numbers once there is traffic. Google's `web-vitals` library is a few kilobytes and reports each metric to a callback:

```ts
import { onCLS, onINP, onLCP } from "web-vitals";

function report(metric: { name: string; value: number; rating: string }) {
  // gtag is exposed on window by this site's layout; check the docs for the exact event parameters.
  window.gtag?.("event", metric.name, { value: metric.value, metric_rating: metric.rating });
}

onCLS(report);
onINP(report);
onLCP(report);
```

The README says each callback receives a metric object with `name`, `value` and `rating` (good, needs improvement or poor). CLS is a small unitless score and LCP and INP are in milliseconds, so check how your analytics tool wants numbers before you chart them together.

## What did PageSpeed say about this site?

One data point, labelled carefully. My product notes record PageSpeed Insights results for an earlier build of this site, the dark "Studio" design that came before the comic-book version: mobile 94 / 100 / 100 / 100 and desktop 96 / 100 / 100 / 100 across PageSpeed's four categories. Under the 90 to 100 band in the docs, those are all good. Since then a PageSpeed run on the comic build, on 10 October 2026, came back at 68 on mobile and 88 on desktop, with the mobile LCP dominated by render delay on the hero paragraph rather than by script weight; the post on this site about GA4, Tag Manager and Clarity records that run and what the tags cost. Later the same day, after inlining the stylesheet, deferring the analytics tags until after load and skipping the greeting loader on phones, a fresh PageSpeed run on the same page measured mobile first contentful paint at 1.3 s and largest contentful paint at 1.7 s, down from 3.9 s and 6.3 s in the run before the change; the cumulative layout shift and blocking time stayed in the good range, and the mobile Performance score came back at 98.

They are not results for the page you are looking at. The motion was changed afterwards, and I have not rerun PageSpeed on the current build for this post. Treat the numbers as the standard I am holding the new build to, not as proof that it meets it.

## Takeaways

- Animate transforms and opacity only. CLS counts layout movement, and `translate` and `scale` do not move other elements.
- Never start your largest element at `opacity: 0` without checking when it becomes visible. Chromium does not count invisible elements as LCP candidates.
- Make content visible by default and let the animation add to it, with `once: true` and a `prefers-reduced-motion` gate.
- A good Lighthouse score does not cover INP. Test real interactions, and collect field data with `web-vitals` once you have traffic.
- Record which build your numbers came from. A score without a build label is a rumour.

The same discipline applies to being found at all, which is the subject of the next post: what a portfolio should rank for, and what Google's own guide says to bother with.
