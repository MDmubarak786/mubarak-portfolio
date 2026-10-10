---
title: "GSAP and Lenis for scroll choreography without hiding content"
description: "How to animate on scroll with GSAP ScrollTrigger and Lenis without pre-hiding content, with reduced-motion handling, using this site's real script and its one flaw."
date: 2026-10-10T02:37:00Z
tags: ["GSAP", "Lenis", "ScrollTrigger", "animation", "accessibility", "reduced motion"]
pillar: building
sources:
  - title: "GSAP docs: ScrollTrigger (create, once, batch, update, matchMedia note)"
    url: "https://gsap.com/docs/v3/Plugins/ScrollTrigger/"
  - title: "GSAP docs: gsap.from() (immediateRender behaviour)"
    url: "https://gsap.com/docs/v3/GSAP/gsap.from()/"
  - title: "GSAP docs: gsap.matchMedia() (reduced-motion handlers, automatic revert)"
    url: "https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/"
  - title: "GSAP docs: SplitText (aria option, autoSplit, revert)"
    url: "https://gsap.com/docs/v3/Plugins/SplitText/"
  - title: "Lenis README: install, GSAP ScrollTrigger integration, options, reduced motion"
    url: "https://github.com/darkroomengineering/lenis/blob/main/README.md"
  - title: "Lenis: project site (formerly lenis.darkroom.engineering)"
    url: "https://lenis.dev/"
  - title: "MDN: prefers-reduced-motion"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion"
draft: false
---

The usual scroll-reveal recipe hides every element first and shows it later. It looks fine in a demo and fails in the ways demos do not cover: a trigger that never fires, a script that errors halfway, a reader who prefers reduced motion. This site is GSAP plus Lenis, and its design document says content is never pre-hidden. This post shows the pattern that keeps that promise, the one place the script breaks it, and how to make reduced motion a first-class path.

## Why does a scroll animation hide content?

It is a documented default, not a mistake. In GSAP, `from()` and `fromTo()` tweens have `immediateRender` set to true, and so does "anything with a scrollTrigger applied". The docs add that such a tween renders its starting state immediately, "regardless of any delay". So this common line:

```ts
gsap.from(".card", { opacity: 0, y: 40, scrollTrigger: ".card" });
```

sets every card to `opacity: 0` the moment the script runs, and they stay invisible until the reader scrolls to each. If a trigger never fires, because its `start` is misplaced or the layout moved under it, the element stays at zero opacity with nothing running to bring it back. The override exists (`immediateRender: false`, which makes the tween wait to render "until the tween actually begins"), but you have to know to pass it.

My view is that scroll choreography is a progressive enhancement, and the test is short: switch JavaScript off, then switch reduced motion on, and read the page. If anything is missing, the animation owns content it should not. A tween should deliver an arrival, never be the thing that makes text exist. For a portfolio this matters more than for most sites, because a reader with 30 seconds on a phone who meets a heading that has not appeared yet has simply not read it.

## What are ScrollTrigger and Lenis, and how do they fit?

ScrollTrigger is GSAP's scroll plugin. `ScrollTrigger.create()` makes a standalone trigger with callbacks such as `onEnter` and runs any logic without a tween. `once: true` makes the trigger kill itself after the end position is reached once (it does not kill a linked animation). `ScrollTrigger.batch()` groups callbacks that fire close together, which suits staggered arrivals.

Lenis is a small open-source smooth-scroll library. Its README states that it wraps native scroll, so sticky positioning, anchor links and accessibility behaviour keep working, and its site says there are no hijacked scrollbars. This site uses `gsap@^3.15.0` and `lenis@^1.3.26`. SplitText is imported from `gsap/SplitText`.

The README's GSAP integration is three lines, and the script uses it as written:

```ts
const lenis = new Lenis({ lerp: 0.11 });          // default lerp is 0.1
lenis.on("scroll", ScrollTrigger.update);          // ScrollTrigger reads Lenis's position
gsap.ticker.add((t) => lenis.raf(t * 1000));       // GSAP time is seconds, Lenis expects ms
gsap.ticker.lagSmoothing(0);
```

One clock drives both libraries, so scroll-linked tweens and smoothed scroll never disagree about where the page is.

## How do you animate on scroll without pre-hiding anything?

Create the tween inside `onEnter`. Until the trigger fires, no tween exists, so nothing has a start state to render and the element sits at its resting CSS. This is how the script handles panels:

```ts
document.querySelectorAll<HTMLElement>(".panel:not([data-cover])").forEach((p) =>
  ScrollTrigger.create({
    trigger: p, start: "top 96%", once: true,
    onEnter: () => gsap.from(p, {
      y: 50, scale: 0.97, duration: 0.6, ease: "back.out(1.4)",
      clearProps: "transform",
    }),
  }));
```

Three details carry the weight. The tween is created on entry, so the panel is readable at all times before it. It animates transform only, not opacity, so even mid-tween the text is legible. And `clearProps: "transform"` removes the inline transform at the end, so CSS hover transforms on the same element are not fought by a leftover GSAP value.

Speech bubbles use the same shape (`scale: 0.92` from their tail corner), sound effects pop from `scale: 0`, and captions use `ScrollTrigger.batch` with a `fromTo` of `scaleX` from 0 to 1 so a row of them unrolls in a stagger. A last tween, `gsap.to("body", { backgroundPositionY: 240, ease: "none", scrollTrigger: { scrub: true } })`, drifts the halftone background with scroll. A scrubbed decorative background cannot hide content.

## Where does this site break its own rule?

`DESIGN.md` says: do not pre-hide content for an entrance animation, and animate with `from` tweens triggered once on arrival. The panel code does that. The heading code does not:

```ts
document.querySelectorAll<HTMLElement>("main h2").forEach((h) => {
  const chars = new SplitText(h, { type: "words,chars" }).chars;
  gsap.from(chars, {
    y: "110%", rotation: 6, opacity: 0, duration: 0.6, ease: "back.out(1.8)", stagger: 0.015,
    scrollTrigger: { trigger: h, start: "top 88%", once: true },
  });
});
```

By the docs above, a `from()` with a `scrollTrigger` applied renders its starting state immediately. Every character of every `main h2` is at `opacity: 0` from the moment the script runs until its heading is scrolled to. The cover has the same shape: the `cover()` function calls `gsap.from()` on the title characters, the burst sticker, and the buttons and captions, each with a start state that renders when called.

So the accurate statement about this site is: panels, bubbles, sound effects and captions are never pre-hidden; headings and the cover are hidden by script until they arrive. Without JavaScript the page is complete, because the hiding is applied by the script, but "never pre-hidden" is stronger than what the code does. Two fixes are available. Move the heading tween into `onEnter` as the panels do, or keep the structure and pass `immediateRender: false`, then test that the start state really waits. I would take the first, since it matches the rest of the file and needs no per-tween exception. A design document and its code drifting apart is normal. Saying so beats leaving the claim in place.

SplitText has one accessibility point worth knowing. Its `aria` option defaults to `"auto"`, which puts an `aria-label` on the split element and `aria-hidden` on the pieces, so screen readers read the heading whole instead of letter by letter. The docs warn that it does not preserve nested semantics, so a heading containing a link needs `aria: "hidden"` plus a screen-reader-only copy of the text. Headings here are plain text.

## How should reduced motion work?

The site's approach is blunt and effective: `const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches`, then `if (!reduce) { ... }` around everything, Lenis included. A reader who prefers reduced motion gets native scroll and a still page. The greeting loader is skipped for them too. MDN's note on the media feature explains the stakes: animation can trigger discomfort for people with vestibular disorders, and scaling or panning large objects is a known trigger, which describes most of this choreography.

Lenis also covers this on its own. Its `respectReducedMotion` option defaults to true and, per the README, forces `lerp` to 1, so scrolling follows input directly and programmatic scrolls jump. Skipping Lenis entirely, as this script does, is the simpler version of the same decision.

The weakness is that the check runs once, at load. If the user flips the setting with the page open, nothing changes. `gsap.matchMedia()` is built for this: ScrollTriggers and tweens created inside a handler are reverted when the query stops matching, and a returned function runs as cleanup. A sketch of the restructure:

```ts
const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  const lenis = new Lenis({ lerp: 0.11 });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // every ScrollTrigger.create(...) and gsap.from(...) from above goes here;
  // GSAP reverts them if the user turns reduced motion on mid-session

  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();            // check the Lenis docs for the exact teardown call
  };
});
```

The script also has a hand-written click handler for `#anchor` links that calls `lenis.scrollTo(target, { offset: -80, duration: 1.2 })`. The README lists an `anchors` option for smooth anchor scrolling; check the docs before swapping one for the other.

## Takeaways

- `from()`, `fromTo()` and anything with a `scrollTrigger` render their start state immediately by default. That is pre-hiding, whatever you meant.
- Create the tween inside `ScrollTrigger.create({ onEnter, once: true })`, animate transforms rather than opacity where you can, and use `clearProps` so CSS owns the element afterwards.
- Wire Lenis to ScrollTrigger the documented way: `ScrollTrigger.update` on scroll, `lenis.raf` on the GSAP ticker, `lagSmoothing(0)`.
- Gate motion with `gsap.matchMedia()` so a change in `prefers-reduced-motion` reverts everything, instead of checking once at load.
- Audit your own code against your own rules. This site's headings and cover still pre-hide, and that is worth fixing.

For the design rules these tweens serve, read [the comic-book portfolio decisions](/blog/comic-book-portfolio-design-decisions-in-public).
