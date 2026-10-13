---
title: "Building a 34-second comic-book intro: page curls, a trailer score and the autoplay rule"
description: "How the site's opening became a motion comic: rejected loaders, a 14-strip CSS page curl, recorded music and effects timed to their peaks, and why it waits for a click."
date: 2026-10-13T15:00:00Z
updated: 2026-10-13T15:00:00Z
tags: ["Web Audio", "CSS 3D", "autoplay policy", "motion design", "Astro", "case file"]
pillar: case-files
related: adr-004-incresco-camped-astro
sources:
  - title: "Chrome for Developers: Autoplay policy in Chrome"
    url: "https://developer.chrome.com/blog/autoplay"
  - title: "MDN: Autoplay guide for media and Web Audio APIs"
    url: "https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay"
  - title: "MDN: BaseAudioContext.decodeAudioData()"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData"
  - title: "MDN: transform-style (and the properties that force a flat context)"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style"
  - title: "Chrome for Developers: Heavy throttling of chained JS timers"
    url: "https://developer.chrome.com/blog/timer-throttling-in-chrome-88"
  - title: "Mixkit License (free sound effects)"
    url: "https://mixkit.co/license/"
  - title: "Pixabay Content License summary"
    url: "https://pixabay.com/service/license-summary/"
  - title: "Pixabay: Trailer suspense and action, by NiKneT_Art (the intro's music)"
    url: "https://pixabay.com/music/main-title-trailer-suspense-and-action-242881/"
  - title: "@beamnxw on X: a launch-film prompt that places every sound by its measured peak"
    url: "https://x.com/beamnxw/status/2109722150428926361"
draft: false
---

If you open this site on a laptop for the first time, a comic book is waiting on a desk under a lamp. Click it and the cover swings open on a cinematic hit, a trailer cue starts, and seven spreads turn by themselves while a camera glides from the artwork to the story on each one. Thirty-odd seconds later the camera dives into the last page, black ink floods it, the masthead stamps through, and the ink drains away to leave the real site standing. Phones never see any of it.

It took four rejected attempts, three rounds of music and one browser rule I could not argue with. I built it over two days with Claude Code as my pair, testing every version locally before it went near the live site. This is what each round taught me.

## Four loaders that didn't make it

The first brief was simple: "show something techy while the site loads." Version one was a terminal that typed the page's own facts ("locating mubarak.shajahan … found · Chennai", "loading case files [8/8]") and decoded "ISSUE #1 READY" in Bangers. Fine, and forgettable. Version two was a canvas set piece: a few thousand halftone dots swarming into the masthead, colour plates snapping into register, a stamp, and the screen tearing away as comic panels. Nicer, and still a loading screen.

So I built three directions side by side behind a query parameter and let the reviewer pick by watching, not by reading descriptions:

- **A book** that floats in 3D, follows the mouse, opens, and dives into its own page.
- **A self-drawing cover**: pencil strokes traced from my portrait (a Sobel edge pass in Python, confined to an ellipse so the office behind me stayed out), then hatching, inking and a cell-by-cell colour flood.
- **Ink**: the real page visible, one drop of black flooding it through an SVG turbulence mask, the masthead stamping through, then the ink draining off a corner.

A and C won. The sketch was clever and the least exciting of the three, which is a useful thing to learn early.

## A story, not a slideshow

The brief then grew to "at least 30 seconds, tell a story, end with the ink." The first cut had seven spreads (origin, the platform, the Tibco clock, the $840 cutover, the document AI, the witnesses, today) with a page counter, arrows and a progress bar. The feedback was one line: it looks like a presentation.

Everything that made it feel like slides was chrome: the counter, the buttons, and identical timing on static pages. Removing the chrome was the easy half. The other half was giving each spread a camera. The cover gets a slow dolly-in. Each spread opens wide, then the camera lands on the artwork as it pops in, glides to the story page as the headline slams down and the text writes itself line by line, and pulls back just before the page turns. Pages are blank until the camera arrives, so nothing sits there waiting to be read. Spreads run between 3.5 and 4.2 seconds, so there is no metronome. Letterbox bars, a little grain and a vignette finish the film look.

Two practical details mattered more than they sound:

- **A hidden tab must pause the story.** Chrome throttles timers in background tabs, and after five minutes hidden, chained timers can run as rarely as once a minute, so a visitor who switches tabs would come back to a story that skipped half its pages with frozen animations. The intro listens for `visibilitychange`, holds its timeline, and resumes from the same moment.
- **Any click, scroll or Esc skips to the ending.** A 30-second intro on a portfolio has to respect a recruiter who wants the CV in five seconds.

## A page that bends

The first books turned their pages as rigid boards. A real page curls: the outer edge lifts first, the sheet bends over the spine, and its shadow sweeps across the page underneath. CSS can't bend an element, but it can chain them.

When a page turns, the intro swaps it for a "turner": the page cut into 14 vertical strips, each nested inside the one before and hinged on its left edge. Because the strips are nested, their rotations add up along the sheet. Each strip's angle comes from one function of its position along the page and the turn's progress, so the outer edge starts earlier and leads:

```js
const SPREAD = 0.42; // how far ahead the outer edge runs
const angleAt = (u, p) => -180 * smooth(clamp((p - (1 - u) * SPREAD) / (1 - SPREAD)));
// u: 0 at the spine, 1 at the outer edge; p: turn progress 0..1
```

Each strip holds a cloned slice of the page's front and back, offset so the slices line up. A gradient on each strip darkens it by how far it faces away from the light, and a separate layer throws a shadow onto the page being revealed. The turner only exists for the 1.3 seconds of the turn. The real page swaps back in at the end, so the DOM stays small the rest of the time.

The bug that cost an hour: I had given the book a `filter: drop-shadow()`. A filter (like `overflow`, `opacity` below 1, or `clip-path`) forces a 3D context flat, so every rotation inside the book was being squashed instead of projected. The shadow now lives on a separate element under the book.

## The sound, three times

The first score was synthesised in the browser with the Web Audio API: a fanfare, a pad, drums. The feedback asked for something closer to a superhero film. The second was a synthesised orchestra (string ostinato, horns, taiko, timpani, a choir, a closing "logo hit" in D major), still original material. The third pushed it toward a thriller: 138 BPM, a ticking clock, a darker progression. The verdict on all three was fair: it sounds like synths.

A trailer score like the ones Hans Zimmer writes comes from huge recorded orchestras and drum sessions, and no amount of oscillators gets there. So the music became a recording. I searched Pixabay's free library, skipped anything named after a real film or theme because those can be covers of copyrighted work, and shortlisted four tracks. A small script then read each one's loudness over time and cut the 33-second stretch that builds the most, quiet at the start and loudest near the end, so the swell lands on the ink finale. The winner, "Trailer suspense and action", is a mid-tempo build (the script estimated about 102 BPM) that climbs steadily across its excerpt. The synthesised score is still in the code as the fallback if the file fails to load.

The sound effects are 17 recordings from Mixkit: a big paper page turn, a short bass hit for each headline, a clock, a riser into the dive, a cinematic impact for the ink and a movie-logo hit for the stamp. A launch-film prompt I read on X put the key idea well: place each sound by its measured peak. A recording's loudest moment is rarely its first sample, so playing it "at" an event makes it late. The intro measures every file once it is decoded and schedules it backwards from the event:

```js
// s.start / s.peak: seconds from the file's start to its first sound and to its loudest sample
let when = eventTime - (s.peak - s.start), offset = s.start;
if (when < ctx.currentTime) { offset += ctx.currentTime - when; when = ctx.currentTime; }
source.start(when, offset); // with a 15 ms gain ramp so a late start never clicks
```

The raw downloads were 1.9 MB. A second script trims each effect to the part the intro uses, fades it, mixes it to mono, normalises the peak and encodes 64 kbps AAC with macOS's own `afconvert`, which brought the set to 363 KB. The music excerpt is about 390 KB.

## The click you can't avoid

The request I kept hearing was "sound on by default." No website can do that. Chrome, Safari and Firefox all refuse to start audio, including Web Audio, until the visitor has clicked, tapped or pressed a key on the page. It is a deliberate rule, and there is no permission or trick a site can use to get around it.

The first version handled this with a small "click anywhere for sound" label in the corner, and the very first tester missed it and heard nothing. So I turned the click into the opening: the book now waits closed with a pulsing "Click to open". That click opens the cover and starts the music from its first second. If nobody clicks within five seconds, the book opens anyway and plays silently, and a later click brings the sound in at the right point in the track. A muted choice is remembered.

The detail that makes the click feel instant is that fetching is allowed before the gesture even though decoding needs an `AudioContext`. While the book waits, and only after the page has fully loaded, the music and the first few effects download as plain `ArrayBuffer`s. The click creates the audio context, decodes what is already in memory, and starts the hit and the music together.

## What it costs

The intro is an overlay on a page that is already painted, so the measured page underneath doesn't wait for it:

| PageSpeed after the final deploy | Mobile | Desktop |
|---|---|---|
| Performance | 100 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

Phones skip the intro entirely, and earlier runs of the same build scored 97 to 99 on mobile, so treat the 100 as a quiet day on Google's machines. The desktop test does sit on the closed book and still scores 100. The intro's markup ships inert in a `<template>`; with its styles and script it adds about 16 KB to the compressed page. No audio is fetched for anyone who has muted it, and no audio context exists before a click, so the console stays clean.

## Takeaways

- Build the candidates and let people watch them. Three rough directions side by side settled in minutes what descriptions never would.
- "It looks like slides" means chrome and static framing. Remove the counters and give each shot a camera move.
- To bend paper in CSS, nest strips and let their rotations add up. And keep `filter`, `overflow` and `opacity` off anything that holds 3D children.
- For music that has to sound like a film, use a recording. Pick the excerpt by its loudness curve, not by its first 30 seconds.
- Measure each sound effect's peak and schedule backwards from the event. That is the difference between a hit and an echo.
- Browsers will not autoplay sound. Make the required click part of the show, and prefetch while you wait so the click starts everything at once.
- Pause on hidden tabs, offer a skip at every moment, and keep the real page painted underneath so the scores don't notice the show.
