---
name: Mohammed Mubarak portfolio
description: A dark, cinematic studio portfolio for one engineer, paced by directed motion and vouched for on record.
colors:
  bg: "#0b0b0c"
  bg-2: "#141416"
  fg: "#f2f2f0"
  muted: "#9c9c98"
  line: "rgb(242 242 240 / 0.14)"
  line-strong: "rgb(242 242 240 / 0.32)"
  accent: "#4f6bff"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "clamp(5rem, 16vw, 15rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
  stat:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontVariation: "tabular-nums"
  headline:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "clamp(2rem, 4.6vw, 4.25rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "clamp(1.6rem, 4vw, 3.5rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.03em"
  subtitle:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  section-label:
    fontFamily: "Bricolage Grotesque, Arial Narrow, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  lead:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.556
    letterSpacing: "normal"
  small:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.333
    letterSpacing: "0.1em"
  tamil:
    fontFamily: "Noto Sans Tamil, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: "normal"
rounded:
  none: "0px"
  focus: "2px"
  cell: "2.5px"
  panel: "1rem"
  panel-lg: "1.5rem"
  full: "999px"
spacing:
  unit: "4px"
  gutter: "20px"
  gutter-sm: "32px"
  row: "28px"
  row-sm: "36px"
  section: "80px"
  section-sm: "112px"
  section-tall: "112px"
  section-tall-sm: "160px"
  container: "80rem"
  container-prose: "56rem"
components:
  button-primary-round:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
    typography: "{typography.lead}"
    size: "9rem"
  button-primary-round-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
  button-ghost-round:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.full}"
    typography: "{typography.small}"
    size: "10rem"
  button-ghost-round-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
  button-sticky-round:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.bg}"
    rounded: "{rounded.full}"
    typography: "{typography.small}"
    size: "5rem"
  button-pill-outline:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.full}"
    typography: "{typography.body}"
    padding: "16px 28px"
  button-pill-outline-hover:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.bg}"
  button-pill-small:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.full}"
    typography: "{typography.small}"
    padding: "6px 12px"
  button-pill-inverse:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.bg}"
    rounded: "{rounded.full}"
    typography: "{typography.small}"
    padding: "8px 8px 8px 20px"
  button-icon-circle:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.full}"
    size: "3rem"
  button-icon-circle-hover:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.bg}"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    typography: "{typography.small}"
  row-work:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    typography: "{typography.title}"
    padding: "28px 4px"
  row-work-hover:
    padding: "28px 24px"
  card-witness:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.panel-lg}"
    padding: "28px"
    width: "min(86vw, 30rem)"
  card-role:
    backgroundColor: "oklch(0.28 0.08 var(--hue))"
    textColor: "{colors.fg}"
    rounded: "{rounded.panel}"
    padding: "24px"
  preview-panel:
    backgroundColor: "oklch(0.42 0.16 var(--hue, 224))"
    textColor: "{colors.white}"
    rounded: "{rounded.panel}"
    padding: "32px"
    width: "22rem"
---

# Design System: Mohammed Mubarak portfolio

<!-- Recorded from the shipped build on 2026-10-09 (Astro 7.3.8, Tailwind 4.3.3, GSAP 3.15, Lenis 1.3.26). Source of truth for tokens: src/styles/global.css @theme block; fonts: astro.config.mjs; motion: src/scripts/motion.ts. -->

## Overview

**Creative North Star: "The Studio After Hours"**

One person, one giant name, one room with the lights down. The site is a near-black studio in which the only things that glow are the subject's face, his name sliding past at 16vw, and a single electric blue reserved for the one thing a visitor is asked to do. Everything else is off-white type on hairlines. It belongs to the Awwwards portfolio-winner school (Dennis Snellenberg lineage) and was pinned by the user after rejecting a paper/serif document world and a bento widget grid; those two rejections are the only confirmed anti-references.

Density is low and the rhythm is editorial: a section is either a huge statement in Bricolage Grotesque or a quiet muted label followed by hairline-divided rows. Surfaces are flat and tonal (`bg` to `bg-2`), never shadowed, never bordered thicker than a pixel. Motion is directed rather than decorative: lines are revealed from behind a mask, numbers count up once, round buttons are magnetic, and a hue-tinted preview panel follows the cursor over the work list. Nothing animates on loop except the marquees and a 12-second globe. Reduced-motion users get the same page, still.

Colour is almost entirely absent by intent. Beyond the four greys, the only hues on the page are the accent blue and six per-record OKLCH tints that exist to tell six pieces of work apart; they appear only inside an opened row or in the cursor preview.

**Key Characteristics:**
- Near-black ground (`#0b0b0c`) with one lifted panel tone (`#141416`); no gradients except the portrait's dark foot
- Bricolage Grotesque at display sizes with tight negative tracking; Geist for everything readable
- One accent (`#4f6bff`) and it is the call to action; selection, caret and focus ring also wear it
- Hairline structure: 1px lines at 14% and 32% white; no card grids, no boxes around content
- Round geometry for every control: pills and circles, never a rounded rectangle button
- Motion grammar: masked line reveals (expo.out, 1.1s), count-ups, magnetic buttons, hover sweeps, one cursor-following preview
- Fixed header in `mix-blend-mode: difference` so it survives both ground tones

## Colors

A four-grey tonal ladder with one electric blue; chroma is rationed to the action and to the per-record tints.

### Primary
- **Electric Blue** (`{colors.accent}`, `#4f6bff`, oklch(59% 0.22 270)): the single call to action ("Get in touch" circle, the police-thief "Start the game" pill), the `btn-round` hover sweep fill, the emphasised consequence value inside an opened work record, the quote glyph on witness cards, text selection, the caret, and the `:focus-visible` ring. It is never used as a surface, a border, or body text. Contrast against `bg` is 4.57:1; white on it is 4.30:1 (see Accessibility in Do's and Don'ts).

### Neutral
- **Studio Black** (`{colors.bg}`, `#0b0b0c`): page ground, `<meta theme-color>`, scrollbar track, preloader, OG image ground.
- **Lifted Panel** (`{colors.bg-2}`, `#141416`): the hero section, the stack band, the footer, witness cards, and the full-screen mobile menu. It is the only "surface" in the system; depth is this one step, not a shadow.
- **Warm Off-White** (`{colors.fg}`, `#f2f2f0`): all primary text, the location pill and sticky CTA fill, the preloader dot. 17.55:1 on `bg`.
- **Ash** (`{colors.muted}`, `#9c9c98`): secondary text, section labels, metadata, dates, the em-dash and middle-dot separators in marquees, the "& Front-End Team Lead" half of the hero title. 7.14:1 on `bg`, 6.68:1 on `bg-2`.
- **Hairline** (`{colors.line}`, `rgb(242 242 240 / 0.14)`): every structural divider: row borders, section `border-y`, witness-card border, footer rule, consequence `dl` top rule.
- **Hairline Strong** (`{colors.line-strong}`, `rgb(242 242 240 / 0.32)`): outlines on ghost controls (pills, circles, pronounce button), the witness pull-quote left rule, the scrollbar thumb.
- **Pure White** (`{colors.white}`, `#ffffff`): text on the accent, the difference-blend header, and at 60%/80% alpha for captions inside hue-tinted panels.

### Per-record tints (formula, not tokens)
Six work records each carry a hue (`--hue`: 224, 262, 160, 28, 196, 340). Two OKLCH recipes derive their surfaces: the cursor preview panel at `oklch(0.42 0.16 var(--hue))` and the "Role" card inside an opened record at `oklch(0.28 0.08 var(--hue))`. The GitHub contribution graph uses its own five-step ramp on hue 264 (`rgb(242 242 240 / 0.07)`, then `oklch(0.45 0.12 264)` → `oklch(0.75 0.19 264)`). These are the only places chroma other than the accent appears.

### Named Rules
**The One Blue Rule.** The accent is the action and the proof, nothing else. If a new element is neither something to click nor the emphasised number of a record, it is grey.

**The Hairline Rule.** Structure is drawn with 1px lines at 14% white, never with filled boxes. A control that needs an edge uses 32% white; nothing uses a heavier line.

## Typography

**Display Font:** Bricolage Grotesque (with Arial Narrow, sans-serif), weights 400 / 500 / 600 loaded and used; 700 and 800 are loaded but only 700 is used, in the OG raster.
**Body Font:** Geist (with system-ui, sans-serif), weights 400 / 500 used; 600 loaded, unused.
**Label/Mono Font:** Geist Mono (ui-monospace) is registered and preloaded under `--font-mono` but no element applies it; the footer clock sets `tabular-nums` in Geist instead.
**Script Font:** Noto Sans Tamil (sans-serif), weight 500, for the Tamil name under `lang="ta"`.

Fonts are served by Astro's fonts API (fontsource provider) as self-hosted woff2 with `font-display: swap`, latin subsets, and generated `size-adjust` fallbacks ("fallback: Arial", "fallback: Arial Bold", "fallback: Courier New"). The `--font-display` and `--font-text` faces are preloaded; Tamil and mono are not.

**Character:** A wide, slightly idiosyncratic grotesque doing all the shouting at enormous sizes and negative tracking, paired with a neutral, even-textured sans that never competes. The pairing is "poster and caption": Bricolage is only ever large or quietly labelling a section; Geist carries every sentence.

### Hierarchy
- **Display** (600, `clamp(5rem, 16vw, 15rem)`, line-height 1, tracking −0.04em): the name marquee in the hero only. The contact heading "Let's work together" is its smaller sibling at 500, `clamp(2.6rem, 8vw, 7.5rem)`, line-height 0.95.
- **Stat** (600, `3rem` → `3.75rem` at ≥640px, line-height 1, tracking −0.04em, tabular): the four count-up numbers. The cursor preview's metric uses the same recipe at `3rem`, tracking −0.025em.
- **Headline** (500, `clamp(2rem, 4.6vw, 4.25rem)`, line-height 1.02, tracking −0.03em): the "I build the platforms…" statement. "Nine people, on record." uses `clamp(2rem, 5vw, 4.5rem)` at line-height 1.
- **Title** (400, `clamp(1.6rem, 4vw, 3.5rem)`, line-height 1, tracking −0.03em): work-row indices. The stack marquee is the same weight at `clamp(2.5rem, 7vw, 6rem)`; the mobile-menu links at `3rem`; the preloader greeting at `2.25rem` → `3rem`.
- **Subtitle** (400, `1.5rem` → `1.875rem` at ≥640px, line-height 1.25, tracking −0.025em): the hero job title, experience role names. Opened-record titles (`h3`) use the same size at 500. Consequence values use `1.5rem` at 400.
- **Section label** (500, `1.25rem`, Bricolage, colour `muted`): "Selected work", "Experience", "Earlier work". The quiet half of the system's loud/quiet split.
- **Body** (Geist 400, `1rem`, line-height 1.5): record context and decisions, experience bullets, witness quotes at `0.98rem` / line-height 1.625. Opened-record prose is capped at `62ch`; the intro lead at `max-w-md` (28rem).
- **Lead** (Geist 400, `1.125rem`): the intro paragraph; "Get in touch" at 500.
- **Small** (Geist 400, `0.875rem`): nav links, pills, metadata, dates, witness footers, the hover hint.
- **Label** (Geist 400, `0.75rem`, uppercase, tracking 0.1em, colour `muted` or `white/60`): captions over values in the footer meta grid (Version / Local time / Name / Socials), the "Navigation" caption in the mobile menu, "Role" inside the hue card, and the preview panel's kind line. Bound to definition-list style captions above a value; never placed above a heading.
- **Tamil** (Noto Sans Tamil 500, `0.875rem`, `lang="ta"`): the name in the pronounce button and footer.

The base rule (`h1, h2, h3`: Bricolage, 600, −0.03em, line-height 0.95, `text-wrap: balance`) is what a new heading inherits before utilities; every visible heading on the page then lowers it to 500 or 400. `p` gets `text-wrap: pretty`.

### Named Rules
**The Loud/Quiet Rule.** A section opens either with a Headline-size statement or with a muted 1.25rem Bricolage label; never with a mid-size heading, and never with an uppercase eyebrow.

**The No-Eyebrow Rule.** Uppercase tracked labels exist only as captions over a value (footer meta, role card, preview kind). Nothing uppercase sits above a heading.

## Layout

The page is a single column of full-width bands with a centred content container of `80rem` (`max-w-7xl`); the contribution graph narrows to `56rem`. Horizontal gutters are `20px` on phones and `32px` from 640px up (`px-5 sm:px-8`). Marquees and the hero name escape the gutter with negative margins to run full-bleed.

Vertical rhythm is section padding, not margins: `80px` → `112px` (work, experience, stack, earlier work), `96px` → `128px` (witnesses), `112px` → `160px` (intro), and the footer `112px` top / `32px` bottom. Every anchored section carries `scroll-mt-10` (40px) so Lenis's `-24px` offset lands cleanly below the fixed header.

Internal grids are asymmetric two-column at `lg` (1024px): intro `1.4fr 1fr` with a `5rem` gap, opened records `1.2fr 1fr`, earlier work `1fr 1.4fr`, experience detail `1fr 1fr`. Rows (work, experience, earlier work) are CSS grids of `1fr auto` on phones growing to `1fr auto auto` / `1.2fr 1fr auto` at 640px; the middle metadata column is hidden below 640px. Stats are a `2 × 2` grid on phones and `1 × 4` at `lg`, divided by hairlines (bottom borders on phones, right borders at `lg`).

Only two breakpoints are used: `sm` (`40rem` / 640px) and `lg` (`64rem` / 1024px). The cursor preview and the witness arrow buttons exist only from `lg` and `sm` respectively; the nav collapses to a circular menu button below `sm`. The hero is `min-h-dvh`; on phones the portrait sits in flow above the title block, from 640px it is absolutely centred behind a two-column text layer.

Spacing uses Tailwind's 4px unit; the recurring steps are 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 96, 112, 128 and 160px.

## Elevation & Depth

Flat, tonal, one step. Depth is conveyed by alternating the ground (`bg`) with the lifted panel tone (`bg-2`) for the hero, stack band, footer, witness cards and mobile menu, and by hairlines. There is exactly one `box-shadow` in the system: the cursor-following preview panel carries Tailwind's `shadow-2xl` so it reads as floating over the list. The fixed header gains separation from `mix-blend-mode: difference` rather than from a background. The sticky "Let's talk" circle has no shadow; its contrast comes from an off-white fill on the dark ground.

### Shadow Vocabulary
- **Preview float** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)`): the cursor preview panel only.

### Named Rules
**The Tonal Step Rule.** A surface is either `bg` or `bg-2`; a third tone is not introduced. Hue-tinted panels (preview, role card) are the only exceptions and they derive from a record's `--hue`.

**The One Float Rule.** The only element that casts a shadow is the one that is not part of the page: the cursor preview.

## Shapes

Two silhouettes: the full circle/pill (`999px`) for every interactive control, and the softly rounded panel for media and cards. Pills: nav menu button, location pill, pronounce button, email and phone links, "Play Whac-a-Thief", the back link and start button on the game page, the skip link. Circles: "See the work" (10rem), "Get in touch" (9rem → 11rem), the sticky "Let's talk" (5rem), the witness arrows (3rem), the globe badge (2.25rem). Rounded panels: the portrait and witness cards at `1.5rem`, the preview panel and role card at `1rem`, the OG portrait at 28px. Contribution cells have a `2.5px` corner; the focus ring has `2px`.

Borders are always `1px` and always from the hairline tokens; the mobile menu button uses `white/40` because it sits in the difference-blend header. The portrait is clipped with `overflow: hidden` and carries a bottom gradient (`from-bg-2/70` to transparent). Nothing is skewed, clipped at an angle, or outlined thicker than a pixel; the single curved edge in the system is the preloader's SVG curtain (`Q50 20 0 0` quadratic, 18vh tall) that lifts away.

## Components

The feel is "refined and still": controls are round, quiet at rest, and reveal colour only on hover or focus, with a sweep rather than a fade.

### Buttons
- **Shape:** full pill or circle (`999px`); no rounded-rectangle buttons exist.
- **Primary (round accent):** `btn-round` circle, `9rem` (11rem at ≥640px), `bg-accent` with white text at `1.125rem` / 500, `data-magnetic`. Used once: "Get in touch", absolutely placed at the footer's top-right. The game page's "Start the game" is the pill variant of the same colouring (`px-6 py-3`, 500, 16px) and is a one-off.
- **Ghost (round outline):** `btn-round` circle or pill, `1px` `line-strong` border, text `0.875rem` / 500, magnetic. "See the work" (10rem circle), "Play Whac-a-Thief" (pill `px-6 py-3`).
- **Sticky CTA:** `btn-round` circle `5rem`, `bg-fg text-bg`, `0.875rem` / 500, fixed `bottom-6 right-6`, hidden until 80% of the first viewport has scrolled past and re-hidden when the footer reaches 85% of the viewport; enters with `opacity 0 → 1` and `translateY(16px → 0)` over `500ms`.
- **Pill outline:** `rounded-full border border-line-strong px-7 py-4` for the email and phone links; `px-3 py-1.5 text-sm` for the pronounce button and the game page's back link.
- **Pill inverse:** the location pill, `bg-fg text-bg pl-5 pr-2 py-2 text-sm font-medium` with a `2.25rem` `bg-bg` circle holding a globe icon that spins for 12s per turn.
- **Icon circle:** `3rem`, `line-strong` border, Lucide arrow at 18px; the witness carousel's previous/next.
- **Hover / Focus:** `btn-round` fills from the bottom with the accent (`::before`, `translateY(101% → 0)`, `520ms`, `cubic-bezier(0.16, 1, 0.3, 1)`); ghost text flips to white. On the accent-filled primary the sweep is accent over accent, so its hover is the magnetic pull only. Pill outlines invert to `bg-fg text-bg` over Tailwind's default `150ms cubic-bezier(0.4, 0, 0.2, 1)`. Icon circles invert the same way. Magnetic controls (`pointer: fine`, no reduced motion) follow the cursor at 0.35× its offset from centre with a `0.6s power3` tween and spring back on leave. Every control shares the global `:focus-visible` ring: `2px solid` accent, `4px` offset, `2px` radius.

### Links
- **Draw underline (`link-draw`):** a `1px` `currentColor` rule 2px below the text scales from `scaleX(0)` to `1` from the left over `420ms` ease-out-expo on hover and focus-visible. Used for nav items, social links, witness names, "Demo" links, the GitHub handle.
- **Header wordmark:** "© Mubarak" in Bricolage 600 `1.125rem`; on hover the © rotates 360° and "Mubarak" slides up to reveal the full name (`500ms`).

### Cards / Containers
- **Witness card:** `bg-bg-2`, `1px` `line` border, `1.5rem` radius, padding `28px` → `36px`, width `min(86vw, 30rem)`, `snap-start` inside a horizontal `snap-x snap-mandatory` track with a hidden scrollbar and `20px` gaps. Accent quote glyph (22px) at top, quote paragraphs at `0.98rem` / 1.625, a hairline-topped footer with name (500) and title (muted).
- **Role card:** inside an opened record, `1rem` radius, padding `24px`, `oklch(0.28 0.08 var(--hue))`, label caption in `white/60`.
- **Hue preview:** see Signature Component.
- **Portrait:** `4:5`, `1.5rem` radius, `object-top`, scaled 1.05 to hide parallax edges, dark gradient foot.

### Rows (work, experience, earlier work)
- **Structure:** `<ol>` with hairline top borders per row and a hairline bottom on the list; work and experience rows are native `<details>` with a `list-none` summary and a Lucide plus (20px) that rotates 45° over `500ms` when open.
- **Work row:** summary padding `28px 4px` → `36px 16px`; on hover the horizontal padding slides to `24px` → `40px` over `500ms` (`transition-[padding]`), and sibling rows dim to 40% opacity over `320ms` (`.work-list:hover .work-row:not(:hover)`). Each row carries `--hue`.
- **Experience row:** `28px` vertical, role name at Subtitle size, company and dates in `small muted tabular` (hidden below 640px).
- **Earlier work row:** `16px` vertical, date column `4rem` wide in `0.75rem muted tabular`, name at 500, description in `small muted`, "Demo ↗" draw-link.

### Navigation
- **Header:** fixed, `z-50`, full-width, `mix-blend-mode: difference`, white text, padding `20px` with the page gutter. Left: wordmark. Right (≥640px): Work / About / Contact / LinkedIn at `0.875rem` with `32px` gaps, draw-underline on hover. Below 640px: a `2.5rem` circle with a `white/40` border and a three-line glyph (`1px` bars, 16px wide) toggling a full-screen `bg-bg-2` menu whose links are Bricolage `3rem` stacked at the bottom with a caption and a hairline-topped social row. Opening locks body scroll.
- **Anchor scrolling:** Lenis `scrollTo` with `-24px` offset over `1.4s`.

### Stats
- A `<dl>` with the number in `dd` at Stat size counting from 0 to its value over `1.8s` expo.out once it is 90% into view, suffix appended; label in `dt`, `small muted`, max `20ch`. Server-rendered with the final value so reduced-motion and no-JS readers see the number.

### Marquees
- `.marquee` clips; `.marquee-track` is an inline-flex duplicated twice and translates `-50%` over `--marquee-speed` linearly forever, paused on hover, stopped entirely under reduced motion. Name marquee: 22s, Bricolage 600 at Display size, em-dash separator in `muted`, `0.35em` right padding per item. Stack marquees: two rows at 34s and 44s, the second reversed, Bricolage 400 at `clamp(2.5rem, 7vw, 6rem)`, items `px-6` with a `muted` middle dot, `hover:text-accent`. Both are `aria-hidden` with `sr-only` text alternatives.

### Contribution graph
- Inline SVG, 11px cells with 3px gaps and `2.5px` corners, five-step fill on hue 264, `role="img"` with a total in the label, per-cell `<title>`; caption in `small muted` with a tabular total and a draw-link handle.

### Preloader
- Fixed `z-[90]`, `bg-bg`, centred greeting (dot + word) in Bricolage `2.25rem` → `3rem`. Holds `450ms`, steps through six greetings every `140ms` (Tamil first), then lifts `translateY(-120%)` over `800ms` with `cubic-bezier(0.76, 0, 0.24, 1)` while an SVG curtain gives the bottom edge a curve; removed after 1s. About 1.2s on screen before the lift. Runs once per `sessionStorage` session and never under reduced motion. Reveals wait for `html.is-ready`.

### Signature Component: cursor-following work preview
A fixed `22rem × 16.5rem` (4:3) panel, `1rem` radius, `oklch(0.42 0.16 var(--hue, 224))` fill, white text, `32px` padding, `shadow-2xl`, `pointer-events: none`, `aria-hidden`, rendered only from `lg` and only on `pointer: fine` without reduced motion. It tracks the pointer with GSAP `quickTo` (`0.5s power3`) offset to centre under the cursor (−176px, −132px). Entering a closed row's summary writes the row's `--hue`, emphasised metric (Stat size, 600), index title (`small white/80`) and kind (Label, `white/60`) into it and scales it `0.9 → 1` with opacity over `0.4s power3.out`; leaving fades it over `0.3s`; clicking the row hides it in `0.2s`.

### Motion grammar (what every component above draws from)
- **Smooth scroll:** Lenis, `lerp 0.1`, `wheelMultiplier 1`; disabled under reduced motion.
- **Masked line reveal (`data-split`):** GSAP SplitText into lines, each wrapped in an `overflow: hidden` line; `yPercent 110 → 0`, `1.1s`, `expo.out`, `0.08s` stagger, triggered at `top 85%`, once.
- **Block reveal (`data-reveal`):** `y 32px → 0` with opacity, `1s`, `expo.out`, triggered at `top 90%`, once.
- **Count-up (`data-count`):** `1.8s expo.out`, `top 90%`, once, `toFixed(decimals)`.
- **Parallax (`data-parallax`):** scrubbed `yPercent` equal to `parallax × 100` (portrait: 12) across its section from `top top` to `bottom top`.
- **Magnetic (`data-magnetic`):** 0.35 strength, `0.6s power3` quickTo, fine pointers only.
- **Hover sweep:** `520ms cubic-bezier(0.16, 1, 0.3, 1)`; draw underline `420ms` same ease; row dim `320ms`; padding slide and plus rotation `500ms`; wordmark swap `500ms`; default utility transitions `150ms cubic-bezier(0.4, 0, 0.2, 1)`.
- **Preloader lift:** `900ms cubic-bezier(0.76, 0, 0.24, 1)` (declared in the theme as `--ease-in-out-quart` but written inline).
- **Loops:** marquees 22s / 34s / 44s linear; globe 12s linear.
- **Reduced motion:** Lenis, reveals, count-ups, parallax, magnetic, preview and the preloader are all skipped in `motion.ts` and `Preloader.astro`; `.marquee-track` animation is removed in CSS. Content renders fully in its final state.

## Do's and Don'ts

### Do:
- **Do** keep every interactive control a pill or a circle (`999px`); the system has no rectangular buttons.
- **Do** draw structure with `1px` hairlines at `rgb(242 242 240 / 0.14)` and reserve `0.32` for control outlines.
- **Do** open a section either with a Headline-size Bricolage statement (500, tracking −0.03em) or a muted `1.25rem` Bricolage label, per the Loud/Quiet Rule.
- **Do** use the accent only for the action and the emphasised proof number; text on it is pure white.
- **Do** reveal text with the masked line pattern (`data-split`, `1.1s expo.out`, `0.08s` stagger) and blocks with `data-reveal`; both fire once at `top 85–90%`.
- **Do** ship every animated value server-rendered in its final state so reduced-motion and no-JS readers lose nothing.
- **Do** keep hue-tinted surfaces derived from a record's `--hue` with the two OKLCH recipes; do not pick new tints by hand.
- **Do** use `lang="ta"` and `font-tamil` for the Tamil name wherever it appears.
- **Do** give every control the shared `:focus-visible` ring (`2px` accent, `4px` offset).

### Don't:
- **Don't** add a third surface tone, a gradient fill, or a box-shadow to anything other than the cursor preview.
- **Don't** place an uppercase tracked label above a heading; the Label role is a caption over a value only.
- **Don't** use a mid-size heading (between `1.25rem` and `2rem`) to open a section.
- **Don't** introduce a light theme, a serif face, a glyph/icon font, or a card grid; icons are inline Lucide SVG at 14–28px.
- **Don't** loop any animation other than the marquees and the globe, and don't let a loop survive `prefers-reduced-motion`.
- **Don't** apply the accent as a border, a background for text blocks, or secondary text; it is 4.57:1 on the ground and 4.28:1 on `bg-2`, which only clears AA at large sizes.
- **Don't** fire a reveal more than once or on scroll-up; every ScrollTrigger here is `once: true`.
