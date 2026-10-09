---
name: MK Comics
description: A graphic novel of one engineer's career, drawn in ink on cream halftone, with hiring managers as the readers.
colors:
  cream: "#fff8e7"
  ink: "#111111"
  paper: "#ffffff"
  caption-yellow: "#fff3b0"
  signal-pink: "#ff2e63"
  teal: "#1b998b"
  amber: "#ffb703"
  blue: "#3a86ff"
  violet: "#8338ec"
  ink-muted: "#555555"
typography:
  display:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "clamp(3rem, 8vw, 7rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  title:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.02em"
  stat:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  sfx:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "clamp(1.8rem, 4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  button:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.04em"
  button-sm:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.04em"
  label:
    fontFamily: "Bangers, Impact, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.08em"
  lede:
    fontFamily: "Patrick Hand, cursive"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  narration:
    fontFamily: "Patrick Hand, cursive"
    fontSize: "1.15rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  body:
    fontFamily: "Patrick Hand, cursive"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "Patrick Hand, cursive"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  small:
    fontFamily: "Patrick Hand, cursive"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
rounded:
  none: "0"
  bubble: "1.5rem"
  circle: "50%"
spacing:
  hair: "0.25rem"
  chip: "0.55rem"
  gutter: "1.25rem"
  panel: "1.5rem"
  block: "2rem"
  panel-lg: "2.5rem"
  chapter: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0.5rem 1.1rem"
  button-alt:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0.5rem 1.1rem"
  button-sm:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.none}"
    padding: "0.35rem 0.8rem"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.panel}"
  tile:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem 1.1rem"
  caption:
    backgroundColor: "{colors.caption-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0.6rem"
  bubble:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.bubble}"
    padding: "0.9rem 1.1rem"
  tag:
    backgroundColor: "{colors.caption-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: "0.1rem 0.55rem"
  filetab:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.7rem"
  page-number:
    backgroundColor: "{colors.caption-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.none}"
    size: "34px"
  badge:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.circle}"
    size: "2.4rem"
  sfx:
    textColor: "{colors.signal-pink}"
    typography: "{typography.sfx}"
  stat:
    textColor: "{colors.signal-pink}"
    typography: "{typography.stat}"
  menu-button:
    backgroundColor: "{colors.caption-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0.3rem 0.8rem"
  menu-item-active:
    backgroundColor: "{colors.caption-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.4rem 0.55rem"
---

# Design System: MK Comics

## Overview

**Creative North Star: "The Inked Issue"**

The site is a single comic book issue: a cover, chapters, and a back cover, printed on cream halftone stock. Everything on the page is material a comic artist would draw by hand with a thick ink pen: white panels with heavy black borders and hard offset shadows, yellow narration captions, speech bubbles with tails, sound-effect lettering with a drop shadow, file tabs and page-number tiles. There is no soft shadow and no tinted line; the only grey is a muted ink for secondary lines, the only blur sits behind the sticky header and the dialog, and the only gradients are hard-stop (the halftone dots, the dashed spine, the zig-zag band, the highlighter stripe). The ink is always #111, the paper is always white or cream, and colour is applied flat.

Density is generous and legible. Text is large (body starts at 1.1rem), panels carry a lot of air (1.5rem to 2.5rem of padding), and chapters are separated by 4rem of halftone. Bangers does all the shouting (headings, buttons, labels, stats, sound effects, one weight); Patrick Hand does all the reading. The page is readable with nothing running: every piece of motion is a one-time arrival tween on content that is already visible, and reduced-motion users get the whole book still.

The world was chosen over, and explicitly rejects, the dark cinematic studio portfolio, a Stranger Things variant, paper and serif document worlds, and bento widget grids. Panels never tilt or rotate; tilt belongs to captions, sound effects and stickers.

**Key Characteristics:**
- Cream halftone ground (0.8px ink dots on a 7px grid) under white panels with 4px ink borders and 8px hard offset shadows.
- One signal colour (pink) for the title, the masthead, the live chapter, progress, focus and selection; four more flat comic colours rotate one-per-panel.
- Bangers at 400 for every display role, Patrick Hand at 400 for every reading role; outlined pink lettering for the two biggest headings.
- Square corners everywhere except speech bubbles (1.5rem) and the three circles (badge, year, avatar).
- Press-and-lift motion: buttons press into their shadow on hover, covers and the resume sheet lift away from theirs.
- Arrival choreography only (GSAP `from` tweens, `once`, cleared after), on content that is never pre-hidden.

## Colors

A flat printer's palette: one cream stock, one ink, one paper white, one caption yellow, a signal pink, and four more comic colours used one at a time.

### Primary
- **Signal Pink** (`signal-pink`): the issue's one voice. Fills the outlined cover title and the back-cover headline, the "COMICS" half of the masthead, the current-chapter underline and the "here" marker in the chapters menu, the reading-progress bar, focus rings, text selection, the resume sheet's shadow, the hover shadow on case files and back-issue covers, the button shadow, and the page curtain. It is also the first of the five rotating panel accents and the top step of the GitHub calendar ramp.

### Secondary
- **Teal** (`teal`), **Amber** (`amber`), **Blue** (`blue`), **Violet** (`violet`): with pink, the five-colour rotation. A panel takes exactly one of them by index (`colors[i % 5]`) for its stat value, its sound effect, its case-file headline, its origin-group title, or its power-up tab. Teal is also the "promoted" caption fill and the "rebuild" fill in the inked spot art; amber fills the edition burst sticker and the witness initials badge.

### Neutral
- **Cream** (`cream`): the page stock and the knockout behind running text on the halftone; also the dialog surface and the header (at 90% with blur).
- **Ink** (`ink`): all borders, all shadows, all body text, all strokes on lettering, the halftone dots, and the primary button fill.
- **Paper** (`paper`): panel, bubble, tile, menu, cover and alt-button fill; button text on ink.
- **Caption Yellow** (`caption-yellow`): narration captions, tags, page-number tiles, issue-number stickers, the chapters button and the active or hovered menu item, and the highlighter under emphasised words.
- **Ink Muted** (`ink-muted`): secondary lines inside panels (stat descriptions, school and award details, location) and the menu caption label. The only grey in the system.

### Named Rules
**The One Accent Per Panel Rule.** A panel carries one comic colour for its lettering (stat, sound effect, file headline, group title, power-up tab), chosen by its index in the five-colour rotation. Pink is the signal for the issue as a whole; teal and amber additionally hold two fixed roles (the promoted caption; the burst and badge stickers) and both appear inside the inked spot art.

**The Ink Is Ink Rule.** Every border, shadow, stroke and body glyph is #111. There is no tinted border, no grey line, no coloured shadow except pink on an interactive target.

**The Pink Means Live Rule.** A pink offset shadow always marks something you can act on: every button at rest, the resume sheet, a hovered case file, a hovered back-issue cover. The reverse does not hold: resting case files, back-issue covers and the chapters button cast ink and only turn pink, or press, when touched.

## Typography

**Display Font:** Bangers (with Impact, sans-serif)
**Body Font:** Patrick Hand (with cursive)
**Tamil name:** the system Tamil face via `lang="ta"`; neither loaded font covers Tamil.

**Character:** Bangers is a comic letterer's shout, one weight, slightly tracked (0.02em), used for everything that would be hand-lettered on a comic page. Patrick Hand is the narrator's handwriting, loose and large. Only weight 400 ships for either face. The build still requests heavier weights in places (`<strong>`, `font-bold`, `.emph` at 700) and the browser synthesises them; the emphasis devices the world owns are the yellow highlighter stripe (`.emph`) and a pink fill with an ink stroke.

### Hierarchy
- **Display** (400, `clamp(3rem, 8vw, 7rem)`, 0.9): the cover title only. Pink fill with a 2px ink text-stroke.
- **Headline** (400, 3rem, rising to 3.75rem from 640px, 1): chapter and section headings. The back-cover headline reaches 4.5rem from 640px and takes the pink-and-stroke treatment.
- **Title** (400, 1.875rem, 1.2): case-file and role titles (roles rise to 2.25rem from 640px); power-up groups and origin group names at 1.5rem; back-issue titles at 1.25rem rising to 1.5rem.
- **Stat** (400, 2.25rem rising to 3rem from 640px, 1): the by-the-numbers values, in the panel's accent with a 1.5px ink stroke and a 3px ink drop shadow.
- **SFX** (400, `clamp(1.8rem, 4vw, 3rem)`, wide panel `clamp(2rem, 5vw, 4rem)`): sound-effect lettering, panel accent fill, 2px ink stroke, 4px ink drop shadow, tilted −8°.
- **Button** (400, 1.35rem, 0.04em): all CTAs; small buttons drop to 1.1rem (header, skip link) or 1rem (resume dialog).
- **Label** (400, 0.95rem, 0.08em): menu captions; file tabs at the inherited size with 0.06em; issue-number stickers at 0.85rem with 0.04em. Bangers, never uppercase-transformed (the face is already caps).
- **Lede** (400, 1.25rem, 1.7): the one-line chapter intro, knocked out of the halftone with a cream background.
- **Narration** (400, 1.15rem, 1.45): story text inside migration panels.
- **Body** (400, 1.1rem, 1.5): the base size for everything else; bubbles run at 1.125rem to 1.25rem.
- **Caption** (400, 1rem): yellow caption boxes and tags (0.95rem).
- **Small** (400, 0.875rem): metadata lines (organisation, date, tag), consequence labels, footer. Back-issue metadata drops to 0.75rem.

### Named Rules
**The One Weight Rule.** Both faces load at 400 only. Hierarchy comes from size, colour, stroke and the Bangers/Patrick Hand switch, never from weight. Where the build asks for 700 today the browser fakes it; that is a defect to remove, not a device to reuse.

**The Outlined Shout Rule.** Pink fill with a 2px ink text-stroke is reserved for the cover title and the back-cover headline; stats and sound effects use their panel accent with the stroke.

## Layout

One centred column, 72rem wide, with 1.25rem of side padding (2rem from 640px), 2.5rem above the cover and 7rem below the back cover. A sticky header (cream at 90% with blur, 4px ink bottom border, 0.75rem vertical padding) carries the masthead, the chapters dropdown, extra links from 1024px, and the Hire me button; a 4px pink progress bar hangs off its bottom edge.

Chapters are 4rem apart; a chapter heading is followed by its lede at 0.5rem and its content at 1.5rem to 2rem. Inside chapters, panels sit in CSS grids with 1rem to 1.75rem gutters: the migration story is a six-column grid from 1024px with one 4-column establishing panel and four 2-column panels (two columns from 768px); case files, resume facts and origin groups are two columns from 768px; power-ups are three columns from 1024px; numbers and back issues are two columns, four from 1024px; witnesses flow in two CSS columns from 768px with 2.5rem between. The origin story runs down a 3.2rem spine of year circles joined by a 4px dashed ink line, which collapses above each panel below 640px.

Panel padding is 1.5rem (`p-6`), rising from 640px to 2.5rem on the cover and resume insert and 3rem on the back cover; the resume insert reaches 3rem from 1024px. Panels with a file tab add top padding (2rem) to clear it. Text measure is held at 46ch to 62ch. Breakpoints are Tailwind's: 640px, 768px, 1024px; the menu goes fixed-width full-bleed below 640px.

## Elevation & Depth

Depth is drawn, not lit. Every raised surface casts a hard, unblurred offset shadow in ink; the offset is the elevation. Interactive surfaces cast the same hard shadow in pink. There is no blur anywhere except the header backdrop and the dialog backdrop (`rgba(0,0,0,.6)` with 4px blur). Stacking is also drawn: the resume sheet shows a second white page behind it, offset 14px and tilted 1.5°.

### Shadow Vocabulary
- **Panel** (`box-shadow: 8px 8px 0 #111`): panels, the chapters menu list.
- **Panel, live** (`box-shadow: 8px 8px 0 #ff2e63`): the resume sheet at rest; grows to `11px 11px` on hover. Case files go from ink to `10px 10px 0 #ff2e63` on hover.
- **Button** (`box-shadow: 4px 4px 0 #ff2e63`): every `.btn` at rest; shrinks to `2px 2px` as the button presses.
- **Sticker** (`box-shadow: 3px 3px 0 #111`): page-number tiles, badges, year circles, the chapters button (shrinks to `1px 1px` on press); menu numbers at `2px 2px`.
- **Cover** (`box-shadow: 5px 5px 0 #111`): back-issue covers; lifts to `7px 7px 0 #ff2e63` on hover. The portrait casts `6px 6px 0 #111`, the avatar `4px 4px 0 #111`.
- **Lettering** (`text-shadow: 4px 4px 0 #111`, stats `3px 3px 0 #111`): sound effects and stat values, paired with an ink text-stroke.

### Named Rules
**The Hard Shadow Rule.** Shadows are solid ink or pink, offset down-right, zero blur, zero spread. A soft shadow is not in this world.

**The Press And Lift Rule.** Buttons press: `translate(2px, 2px)` with the shadow shrinking by the same amount, over 0.12s. Cards lift: the resume sheet and back-issue covers move `-3px`/`-2px` with the shadow growing, over 0.15s to 0.18s. Case files grow their shadow without moving.

## Shapes

Square by default. Panels, tiles, captions, tags, buttons, tabs, page numbers and the menu are rectangles with 0 radius and an ink border of 4px (panels, page numbers, menu list, portrait, avatar, dialog), 3px (buttons, captions, bubbles, tiles, badges, file tabs, the chapters button, covers) or 2px (tags, issue numbers). Speech bubbles are the one rounded rectangle (1.5rem radius) and carry a drawn tail: a 10px triangle of ink at the bottom-left, 28px in from the edge. Circles are reserved for people and time: the witness initials badge, the origin-year markers and the back-cover avatar.

Three signature silhouettes recur: a 22-point starburst (`clip-path` polygon) for the edition sticker; a dashed 4px ink rule (`border-top: 4px dashed #111`) that separates a case file's summary from its detail and the back cover's channels from the pitch; and a 10px zig-zag band (`repeating-linear-gradient(135deg, #111 0 6px, transparent 6px 12px)`) at the top of the back cover. The halftone itself is a 0.8px ink dot on a 7px grid, reused inside the inked spot art as a 35% wash.

Tilt is a sticker property: captions sit at −1°, sound effects at −8°, the edition burst at 12°, the ghost page behind the resume sheet at 1.5°, the resume sheet's "Read it" caption at 1°, and the labels inside the spot art at ±6–8°. Panels, tiles, bubbles and buttons are never rotated.

## Components

### Buttons
- **Shape:** square (0 radius), 3px ink border, Bangers 1.35rem at 0.04em, `0.5rem 1.1rem` padding, inline-block.
- **Primary:** ink fill, white text, `4px 4px 0 #ff2e63` shadow.
- **Alt:** white fill, ink text, same border and pink shadow. Used for every CTA that is not the single lead action of its group.
- **Small (`.btn.sm`):** 1.1rem and `0.35rem 0.8rem`; the header Hire me and the skip link. Inside the resume dialog buttons drop to 1rem with the same small padding.
- **Hover:** press `translate(2px, 2px)`, shadow to `2px 2px 0 #ff2e63`, 0.12s. **Focus:** the base 2px pink outline at 3px offset (header controls use 3px).

### Captions (chips)
- **Style:** caption yellow fill, 3px ink border, Patrick Hand 1rem, `0.25rem 0.6rem`, inline-block, tilted −1°. Narrates a panel or labels a fact (dates, pronouns, issue number). The promoted-role variant is teal with white text; the pronounce chip is untilted, inline-flex, with a 14px inline SVG speaker and the Tamil name.
- **Tags:** 2px ink border, caption yellow, 0.95rem, `0.1rem 0.55rem`, square; witness tags are white and turn yellow on hover.

### Panels (cards)
- **Corner Style:** square, 4px ink border.
- **Background:** white.
- **Shadow Strategy:** `8px 8px 0 #111` (see Elevation). Case files switch to pink on hover.
- **Internal Padding:** 1.5rem; 2.5rem on the cover and resume insert from 640px (resume 3rem from 1024px); 3rem on the back cover from 640px.
- **Tiles:** a lighter inner card: 3px ink border, white, `1rem 1.1rem`, no shadow. Tabbed tiles add 2rem top padding for a file tab.

### Page-number tile and file tab
- **Page number (`.pnum`):** a 34px square, 4px ink border, caption yellow, Bangers 1.1rem, `3px 3px 0 #111` shadow, hung 14px outside the panel's top-left corner.
- **File tab (`.filetab`):** ink fill, white Bangers at 0.06em, `0.2rem 0.7rem`, 3px ink border, hung 16px above the panel's top edge, 16px in. Power-up tabs take the panel's accent as fill.

### Speech bubble
- **Style:** white, 3px ink border, 1.5rem radius, `0.9rem 1.1rem`, drawn tail at bottom-left. Body at 1.125rem to 1.25rem; pulled quotes inside use the yellow highlighter stripe. Witness bubbles are followed by a badge and a caption, indented 1.25rem to sit beside the tail.

### Sound effect
- **Style:** Bangers in the panel accent, 2px ink stroke, `4px 4px 0 #111` text shadow, tilted −8°, placed bottom-right of the panel with `margin-top: auto`.

### Stat
- **Style:** Bangers 2.25rem rising to 3rem, panel accent, 1.5px ink stroke, `3px 3px 0 #111` text shadow, line-height 1; followed by a 1.125rem label and a muted description.

### Navigation
- **Header:** sticky, cream at 90% with backdrop blur, 4px ink bottom border; masthead in Bangers 1.5rem with "COMICS" in pink (underline 3px at 4px offset on hover); extra links in Patrick Hand 1.125rem with a 2px underline on hover and a 3px pink underline when current; Hire me as a small primary button.
- **Chapters dropdown (`<details>`):** the summary is a yellow sticker button (Bangers 1.2rem at 0.04em, 3px ink border, `3px 3px 0 #111`, presses on hover and while open; chevron rotates 180° over 0.2s). The list is a panel (white, 4px border, 8px shadow, 0.6rem padding, 14px below the button, 18rem minimum) of items with a 1.9rem numbered square each; hover and current state are yellow with a 3px ink border, and the current item appends "here" in pink Bangers. Below 640px the list is fixed full-width; below 1024px it also lists the extra sections.
- **Progress:** a 4px pink bar on the header's bottom edge, scaled from the left by scroll position.
- **Current chapter:** tracked on scroll (offset 140px) and written into the button label and `aria-current`.

### Resume sheet and dialog
- **Sheet:** a white page with a 4px ink border and a pink `8px 8px` shadow, a ghost page behind it offset 14px and tilted 1.5°, a "1/2" page-number tile, and a "Read it" caption tilted 1° at the bottom-right. Hover lifts the sheet 3px, grows the shadow to 11px, and the caption scales 1.06. Focus is a 4px pink outline at 6px offset.
- **Dialog:** cream, 4px ink border, no radius, `min(96vw, 64rem)` by `min(92dvh, 60rem)`, backdrop `rgba(0,0,0,.6)` with 4px blur; the PDF iframe sits on white.

### Back-issue cover
- **Style:** 3px ink border, white, `5px 5px 0 #111`, clipped; a yellow "No. n" sticker top-left (2px border, Bangers 0.85rem); a cream 55% wash with a "Watch demo" button appears on hover or focus. The whole cover lifts 2px with a 7px pink shadow.

### GitHub calendar
- **Style:** 11px squares on a 3px gap, 2px radius, white when empty, a four-step pink ramp (`#ffd6e0`, `#ff9ab5`, `#ff5c8a`, `#ff2e63`) by level, with an ink stroke at 15%.

### Inked spot art
- **Style:** 200×200 SVGs, 6px ink strokes with round caps and joins, flat fills from the palette (white, caption yellow, teal, amber, pink accents), a 7px halftone pattern as a 30–50% wash, and Bangers labels on tilted stickers.

## Do's and Don'ts

### Do:
- **Do** draw every surface with an ink border (4px for panels, 3px for controls, 2px for tags) and a hard offset shadow; the offset is the elevation.
- **Do** give each panel exactly one comic colour from the five-colour rotation, and keep pink for the signals the whole issue shares (title, masthead, progress, focus, selection, live shadows).
- **Do** set every display role in Bangers at 400 and every reading role in Patrick Hand at 400; emphasise with the yellow highlighter stripe or a pink fill with an ink stroke.
- **Do** knock running text out of the halftone with a cream background (`.lede`) when it sits directly on the stock.
- **Do** animate with `gsap.from`, triggered once on arrival with transforms cleared afterwards, so the page reads correctly with nothing running; gate every script and transition on `prefers-reduced-motion`.
- **Do** press buttons into their shadow on hover and lift covers and sheets away from theirs.
- **Do** put tilt on captions (−1°), sound effects (−8°) and stickers; keep panels, tiles, bubbles and buttons square to the page.

### Don't:
- **Don't** tilt, rotate or skew a panel, at rest or in its arrival tween.
- **Don't** pre-hide content for an entrance animation; opacity and transform start at the resting state and only the tween departs from it.
- **Don't** use a blurred, spread or tinted shadow; shadows are solid ink or solid pink at an integer offset.
- **Don't** use a radius on a UI surface that is not a speech bubble or a circle (badge, year, avatar); illustration (calendar cells, spot-art stickers) may round its own corners.
- **Don't** introduce a grey, a gradient fill, or a tinted border; the only grey is `ink-muted` on secondary text, and the only gradients are hard-stop: the halftone dots, the dashed spine, the zig-zag band and the highlighter stripe.
- **Don't** bring the dark studio, paper-document or bento-grid worlds back in any surface; the comic is the site.
