# Implementation Plan: Mubarak portfolio rebuild ("The Decision Record")

## Overview
Replace the template-based site at mk-full-stack-developer.vercel.app with a site that is Mubarak's own: a single
Persuade-mode home page written as a set of engineering decision records (ADRs) about his career, built on
Astro + Tailwind CSS v4, deployed to Vercel. Every piece of content from the current site is kept; hierarchy is
rebuilt so a hiring manager sees judgment and attributed proof in the first viewport and can start a
conversation in one step. Direction, palette, and first-viewport composition are contracted in
`.impeccable/surfaces/src-pages-index-astro.md`; product truth lives in `PRODUCT.md`; research and the
incumbent audit in `docs/research.md`; the direction round in `docs/direction-round-1.md`.

## Architecture Decisions
- **Astro 7 (7.3.8 on npm at planning time; pin whatever `npm create astro@latest` installs), static output, `@astrojs/vercel` adapter.** Content collections, the fonts API, and the Tailwind integration have moved between majors: verify each against docs.astro.build at init (source-driven-development), not against memory. User decision; matches his
  100-Lighthouse Astro work. Zero client JS by default; islands only for the pronunciation button and the
  contact form if it posts anywhere.
- **Tailwind v4 (4.3.3 at planning time) via `@tailwindcss/vite`; `@astrojs/vercel` 11.x (peer astro ^7)**, tokens declared once in `src/styles/global.css` under `@theme`
  (paper ground, ink, stamp green, rust red, rule-line colour, type scale, spacing). No `tailwind.config.js`.
- **Content collections (Astro `src/content/`)** with Zod schemas: `records` (ADRs, MDX), `witnesses`
  (testimonials, JSON), `experience`, `projects`, `stack`. Copy is data, not JSX, so the user can edit text
  without touching components. Every record carries `status`, `date`, `context`, `options[]`,
  `decision`, `consequences[]`, `reviewedBy[]` (slugs into witnesses).
- **Self-hosted fonts** via Astro's `fonts` config (or `@font-face` in global.css if the fonts API is still
  experimental at init): one display face with character from the technical-document tradition for record
  titles, one text face with Tamil coverage (Noto Sans Tamil + Latin companion), one mono for identifiers only.
  Craft floor forbids Inter/Space Grotesk/IBM Plex as display and any system face as display voice.
- **One signature interaction**: each record's status stamp lands on scroll (IntersectionObserver toggling a
  class; CSS keyframes, exponential ease-out, rotate+settle+ink-bleed). `prefers-reduced-motion` pre-lands
  every stamp. Nothing else animates on entry.
- **GitHub contribution graph** fetched at build time from the GitHub GraphQL API with `GITHUB_TOKEN`
  (Vercel env var); a committed `src/data/contributions.json` is the fallback so builds never fail without it.
- **Whac-a-Thief game** kept as content, linked/embedded last on the page, never in the first viewport.
- **No template import.** ncdai, Magic UI, Lee Robinson starters are a code-quality bar only.
- **Verification stack**: `astro check`, `astro build`, Playwright smoke (page renders, index links resolve,
  contact links work, reduced-motion path), `@axe-core/playwright` for a11y, Lighthouse CI ≥ 95 all
  categories with 100 as the target, `impeccable detect --json src` once before finish.

## Task List

### Phase 0: Foundation
- [x] Task 1: Initialise repo and Astro + Tailwind v4 + Vercel scaffold
- [ ] Task 2: Design tokens, fonts, base layout and browser surfaces
- [ ] Task 3: Content collections and schemas, seeded with all incumbent content

### Checkpoint: Foundation
- [ ] `astro check` and `astro build` pass; an empty page renders with tokens, fonts, and themed selection/focus
- [ ] Every testimonial, role, project, and stack item from the live site exists in `src/content/`

### Phase 1: First viewport (vertical slice)
- [ ] Task 4: Record index rail (name in Latin + Tamil, pronunciation, role, numbered record list, section links)
- [ ] Task 5: ADR record component and ADR-001 (Tibco → AWS Glue) rendered in full
- [ ] Task 6: Reviewed-by block and "Request a conversation" action block
- [ ] Task 7: Mobile composition: sticky index bar, record stacking, action reachability

### Checkpoint: First viewport
- [ ] Desktop and mobile screenshots: a stranger can say what this is, why it matters, and what to do in 5 s
- [ ] Review with Mubarak before proceeding

### Phase 2: The rest of the page
- [ ] Task 8: Records ADR-002 … ADR-005 (EF Academy platform, Incresco & Camped, Planet IoT, Edvanza lead)
- [ ] Task 9: Witnesses section: nine testimonials as signed reviews, full text, no truncation cards
- [ ] Task 10: Experience timeline and Stack as record appendices
- [ ] Task 11: Earlier work (eight projects, compact), game link, GitHub contribution graph
- [ ] Task 12: Contact section with every channel, repeated action, footer

### Checkpoint: Content complete
- [ ] Content parity list against docs/research.md §1: nothing missing
- [ ] Playwright smoke + axe pass

### Phase 3: Signature interaction, SEO, performance
- [ ] Task 13: Stamp-landing interaction with reduced-motion path
- [ ] Task 14: Metadata, Open Graph image, JSON-LD Person, sitemap, robots, canonical
- [ ] Task 15: Performance pass: font subsetting, image formats, zero unused JS, Lighthouse CI

### Phase 4: Finish (impeccable)
- [ ] Task 16: `impeccable detect` + batched inspection round (desktop, mobile, user viewport), fix batch
- [ ] Task 17: Finish reviewer agent, verdict, fixes; documenter writes DESIGN.md + `.impeccable/design.json`
- [ ] Task 18: Deploy to Vercel, env vars, domain decision, redirect from old URL

### Checkpoint: Complete
- [ ] Finish review disposition is `ship`; DESIGN.md exists with tokens
- [ ] Lighthouse 100/100/100/100 on the deployed URL, mobile and desktop

## Assets Mubarak must provide (nothing here may be fabricated)
- Portrait photo (the one on the live site, original resolution)
- Pronunciation audio file (currently on the live site)
- MK monogram mark and logotype as SVG, if they are to be kept (open)
- Details of the four projects hidden behind "Show more" on the live site
- Spline game URL/embed
- `GITHUB_TOKEN` in Vercel for the contribution graph
- Any newer work to add (StudioX, Eventloop-Visualizer, claude-mods): open

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| ADR framing reads dry or gimmicky to non-engineers (recruiters) | Med | Plain-language record titles; the reviewed-by quote is human; Phase 1 checkpoint review with a non-engineer reader |
| Tamil glyphs render with fallback fonts (tofu or mismatched weight) | Med | Self-host Noto Sans Tamil subset; test name rendering on macOS, Windows, Android in Task 2 |
| "Keep everything" flattens hierarchy again | High | Records lead; testimonials, experience, projects are appendices with lower type scale, never equal-weight card grids |
| Contribution graph fails the build without a token | Low | Committed JSON fallback |
| Signature animation becomes "everything animates" | Med | One keyframe set, one trigger, one element type; detector + finish review enforce |
| Lighthouse 100 missed by fonts or images | Med | Subset fonts, `font-display: swap` with size-adjust, AVIF/WebP via `astro:assets` |

## Open Questions
- Custom domain, or keep mk-full-stack-developer.vercel.app? (Affects canonical URL and redirect task.)
- Is the MK monogram a binding brand asset or disposable template-era work?
- Add newer repos as records or earlier work?
- A dark variant: the paper world is light by use scene (office laptop); a dark "night desk" variant can be a
  later `/impeccable colorize`/`adapt` task if wanted, not part of this plan.
- Contact form (needs a backend such as Vercel Functions + Resend) or links only? Plan assumes links only
  until decided.
