---
title: "A comic-book portfolio: the design decisions, in public"
description: "Why this portfolio is drawn as a comic issue: the audience, the worlds it replaced, the DESIGN.md rules, and what a hiring manager sees on the first screen."
date: 2026-10-10T02:36:00Z
tags: ["design", "portfolio", "Astro", "design system", "DESIGN.md", "GSAP"]
pillar: building
sources:
  - title: "Astro docs: Why Astro (design principles, islands, zero JS by default)"
    url: "https://docs.astro.build/en/concepts/why-astro/"
  - title: "Astro docs: Fonts API (providers, cssVariable, Font component, fallbacks)"
    url: "https://docs.astro.build/en/guides/fonts/"
  - title: "Astro docs: Content collections (loaders, Zod schemas, type safety)"
    url: "https://docs.astro.build/en/guides/content-collections/"
  - title: "MDN: prefers-reduced-motion (values and accessibility rationale)"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion"
  - title: "Claude docs: Prompting Claude Opus 5.5, frontend design defaults"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5"
  - title: "impeccable on GitHub (pbakaus/impeccable): PRODUCT.md and DESIGN.md workflow"
    url: "https://github.com/pbakaus/impeccable"
draft: false
---

Most developer portfolios are a dark page, a gradient and a skills grid. This one is a single comic-book issue: a cover, chapters, a back cover, printed in ink on cream halftone. That is a risky choice for a site whose readers are screening engineers for senior roles, so this post sets out the reasoning, what the site replaced, the rules that keep it coherent, and what the reader sees first. The sources for most of it are two files in the repository, `PRODUCT.md` and `DESIGN.md`.

## Who is this portfolio for?

`PRODUCT.md` is blunt about it. The primary reader is a hiring manager or engineering lead screening for Senior, Lead or Staff full-stack and AI roles. They arrive from a CV link, LinkedIn or a recruiter forward, usually on a laptop between meetings, with 30 to 90 seconds to decide whether to shortlist. Their job is to confirm seniority, judgement and ownership, then find a way to reach me. The secondary reader is the developer audience from my LinkedIn posts, who should be able to find the writing, which is what this blog is for.

Two of the product principles in that file drive everything below. Proof leads and the interface recedes: the strongest outcome should be visible in the first viewport. And the site should be unguessable from "developer portfolio" alone. A reader who has seen thirty portfolios that week needs a reason to remember the thirty-first.

## Why a comic?

A career is a sequence of episodes with a protagonist, a problem and an outcome, which is what the format is built for. The mapping is literal. Each claim lives in a panel. The eight decision records are file tabs on case files. Nine testimonials are speech bubbles, set verbatim and never paraphrased. The by-the-numbers row is stat lettering. The resume is a collector's insert.

The risk is that a comic reads as unserious. The counter is rigour: the system below is stricter than most corporate design systems, and the facts inside the panels are the ones on the resume. Density is generous and legible, and body text starts at 1.1rem.

One more honest note. In its Opus 5.5 prompting guide, Anthropic gives an example prompt for avoiding a model's default frontend styles, and a cream or off-white background is on the list. Cream is the page stock here. My argument is that what makes a default is the absence of rules around it: here the cream sits under a 7px grid of 0.8px ink dots, with white panels, 4px borders and hard shadows. Judge that on the page.

## What did the site replace, and why?

The repo records the decisions, dated 9 October 2026, and the git history shows them being carried out. The comic was chosen over a dark cinematic studio build, a Stranger Things variant, paper and serif document worlds, and bento widget grids. The studio build, the Hawkins variant and eleven story samples were then removed, recoverable from git. Before all of that, the site was a template-based portfolio with widgets such as a Monkeytype tile, a timezone clock, a location map and a TV carousel, all dropped.

The records say what was rejected. The reasons below are mine, and they are arguments rather than test results:

- **Dark cinematic studio.** It is the category default for an "AI engineer" portfolio. If the reader has seen it already, it cannot carry the identity.
- **Stranger Things variant.** A borrowed costume. It says a lot about a TV show and nothing about the work.
- **Paper and serif document worlds.** Quiet and credible, but the reader is already holding a resume. A second document adds nothing.
- **Bento grids.** Widgets answer "what does this person find interesting", not "what did they own".

## What are the design rules?

`DESIGN.md` calls the north star "The Inked Issue" and records the system in a form an agent can read: YAML tokens on top, prose and named rules below. impeccable, the Claude Code plugin from [the previous post in this series](/blog/skills-and-plugins-for-coding-agents), uses the same `PRODUCT.md` and `DESIGN.md` pair. The palette is flat and small:

| Token | Value | Role |
|---|---|---|
| cream | `#fff8e7` | page stock |
| ink | `#111111` | every border, shadow and body glyph |
| caption-yellow | `#fff3b0` | narration, tags, highlighter |
| signal-pink | `#ff2e63` | the one voice: title, focus, progress, anything live |
| teal, amber, blue, violet | `#1b998b`, `#ffb703`, `#3a86ff`, `#8338ec` | one per panel, rotated |

Type is Bangers for everything hand-lettered and Patrick Hand for everything read, both at weight 400 only. Corners are square except speech bubbles, which take a 1.5rem radius, and three circles reserved for people and time. The named rules are what hold it together:

- **One Accent Per Panel.** A panel takes exactly one of the five comic colours, by its index in the rotation.
- **The Ink Is Ink Rule.** No tinted borders, no grey lines.
- **The Pink Means Live Rule.** A pink shadow always marks something you can act on, so every button at rest wears one.
- **The Hard Shadow Rule.** Shadows are solid, offset down-right, zero blur. The offset is the elevation.
- **Panels never tilt.** Tilt belongs to captions (-1 degree), sound effects (-8 degrees) and stickers.

Rules are only useful if they are checkable, so `DESIGN.md` also lists its own defects. Both fonts load at 400, but a few places still ask for bold and the browser synthesises it, which the document calls "a defect to remove, not a device to reuse." A design system that admits that is easier to trust than one that does not.

### What does the CSS look like?

The rules are small enough to copy. These four rules from `comic.css` are most of the look:

```css
.panel   { background:#fff; border:4px solid #111; box-shadow:8px 8px 0 #111; position:relative; }
.btn     { font-family:var(--font-bangers); background:#111; color:#fff; border:3px solid #111;
           padding:.5rem 1.1rem; box-shadow:4px 4px 0 var(--v-accent);
           transition:transform .12s, box-shadow .12s; }
.btn:hover { transform:translate(2px,2px); box-shadow:2px 2px 0 var(--v-accent); }  /* press into the shadow */
.caption { background:#fff3b0; border:3px solid #111; padding:.25rem .6rem; transform:rotate(-1deg); }
```

The article you are reading uses the same file. `.prose-comic` turns a Markdown blockquote into a speech bubble with a drawn tail, gives tables yellow headers and Bangers lettering, and sets code blocks on a hard 6px shadow.

## What does a hiring manager see first?

The cover is a panel: a portrait with an edition burst, a caption reading "Issue #1 · Chennai, India", the title "The Full-Stack + AI Chronicles", one sentence saying who I am and where I work, and four buttons: email, resume, LinkedIn, WhatsApp. Below it is a row of four number panels: 1.25M+ monthly users, 95% accuracy on document processing, 96.5% cost cut, 22K+ followers. Three of them link to the case file or chapter that backs them up and the fourth to LinkedIn, because a number with no way to check it is decoration.

After that comes Chapter 1, the TIBCO to AWS Glue migration told in five beats from $24,000 a year to $840, then the case files, then nine witnesses, then the origin story, resume, power-ups, back issues, the weekly strip (this blog), and a back cover that asks for a publisher. The order follows what a screener needs: outcome, proof, a named third party, then background.

## What does it cost, and what keeps it usable?

Three decisions keep the format from getting in the way.

**Content is data, not markup.** Astro content collections hold the case files, witnesses, experience and these posts, each with a Zod schema, so a malformed entry fails at build time. Astro's own principles describe the framework as content-driven, server-first and fast by default, with client-side JavaScript opt-in "only if, and exactly as, necessary". That fits a site that is mostly words. I have shipped Astro and Storyblok sites for Incresco and Camped that scored 100 on Lighthouse, and this site runs on the same framework.

**Fonts are self-hosted through the framework.** The Astro Fonts API takes a provider and a CSS variable per font. Here that is Fontsource for Bangers and Patrick Hand, one weight each, preloaded through the `<Font />` component with generic fallbacks. Fewer files, no third-party request.

**Motion never gates content.** The page is built to read with nothing running. Choreography is arrival-only, and `prefers-reduced-motion` users get the whole book still. MDN notes that animation can trigger discomfort for people with vestibular disorders and that scaling or panning large objects is a known trigger, which is exactly what this site's tweens do. The next post shows the motion script and where it falls short of the rule.

## Takeaways

- Start from the reader's 90 seconds, then choose a form. The comic is a structure for evidence, not a theme.
- Write the rules down in a format an agent can read (`PRODUCT.md`, `DESIGN.md`) and include your known defects.
- A small set of named rules (one accent per panel, ink is ink, hard shadows) does more than a large palette.
- Every headline number links to where it comes from.
- Keep content in typed collections and keep motion optional, so the page works with nothing running.

Next: [GSAP and Lenis scroll choreography without hiding content](/blog/gsap-and-lenis-scroll-choreography-without-hiding-content), the motion code behind these panels.
