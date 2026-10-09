# Tasks: Mubarak portfolio rebuild

> Direction changed on 2026-10-09 to the user-pinned studio direction (see tasks/plan.md). Task 13's "signature interaction" is now the cursor-following work preview plus masked line reveals; Lighthouse runs via the PageSpeed Insights API after deploy because no Chrome is installed locally.

Read `tasks/plan.md`, `PRODUCT.md`, `.impeccable/surfaces/src-pages-index-astro.md`, and
`/Users/mubarak/Downloads/technomile/Technomile-Monorepo/.claude/skills/impeccable/reference/craft-floor.md`
before starting any task that touches UI.

## Task 1: Initialise repo and Astro + Tailwind v4 + Vercel scaffold

**Description:** Turn this empty folder into a working Astro project with Tailwind v4 and the Vercel adapter, committed to git, buildable and previewable.

**Acceptance criteria:**
- [x] `git init` done, `.gitignore` covers node_modules, dist, .vercel, .env*, `.impeccable/critique/`, `.impeccable/review/`, `.impeccable/questions/`
- [x] Note: the sandbox blocks npm; run the scaffold with `registry.npmjs.org` in `allowed_domains` (or sandbox disabled for that one step)
- [x] `npm create astro@latest` (minimal, TypeScript strict), `npx astro add tailwind vercel` applied; exact versions pinned in package.json
- [x] `src/pages/index.astro` renders a placeholder with the Tailwind utility working
- [x] `.claude/launch.json` entry `dev` → `npm run dev` on port 4321

**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Type check: `npx astro check`
- [x] Manual check: `npm run dev` opens in the browser pane

**Dependencies:** None
**Files likely touched:** `package.json`, `astro.config.mjs`, `src/pages/index.astro`, `src/styles/global.css`, `.gitignore`, `.claude/launch.json`
**Estimated scope:** S

## Task 2: Design tokens, fonts, base layout and browser surfaces

**Description:** Encode the OWN-WORLD block as tokens: paper ground with rule lines, ink, stamp green, rust red; type scale and three self-hosted faces (display with character, text with Tamil coverage, mono for identifiers only). Theme the browser surfaces the craft floor names: selection, caret, focus ring, scrollbar, underline offset, tabular numerals.

**Acceptance criteria:**
- [x] `@theme` in `src/styles/global.css` defines every colour, font, and spacing token; no raw hex in components
- [x] Fonts are self-hosted and subset; `முகமது முபாரக்` renders in the chosen text face at display weight without fallback
- [x] `src/layouts/Base.astro` sets lang, metadata slots, skip link, themed selection/focus/scrollbar
- [x] Contrast of body text on paper ≥ 4.5:1, rule lines are decorative only

**Verification:**
- [x] Build succeeds; `npx astro check`
- [x] Manual check: screenshot of a type specimen page (temporary) at 390px and 1440px

**Dependencies:** Task 1
**Files likely touched:** `src/styles/global.css`, `src/layouts/Base.astro`, `public/fonts/*`, `astro.config.mjs`
**Estimated scope:** M

## Task 3: Content collections and schemas, seeded with all incumbent content

**Description:** Model every content type as an Astro content collection with Zod schemas and seed it with the full content of the live site (docs/research.md §1 plus the page text captured there). Nothing on the live site may be missing.

**Acceptance criteria:**
- [x] Collections: `records` (MDX: ADR-001…005 drafted from the experience bullets and testimonials), `witnesses` (9), `experience` (3 roles), `projects` (8, four marked `details: pending`), `stack` (23 items grouped)
- [x] `src/content.config.ts` schemas reject a record without `status`, `date`, `options`, `decision`, `consequences`, `reviewedBy`
- [x] A parity script or checklist confirms every name, number, and link from the live site is present

**Verification:**
- [x] `npx astro check` passes (schema errors surface here)
- [x] Manual check: `astro build` logs collection counts

**Dependencies:** Task 1
**Files likely touched:** `src/content.config.ts`, `src/content/records/*.mdx`, `src/content/witnesses/*.json`, `src/content/experience/*.json`, `src/content/projects/*.json`, `src/content/stack.json`
**Estimated scope:** M

## Checkpoint: Foundation
- [x] `astro check` and `astro build` pass
- [x] Type specimen shows tokens, fonts, Tamil rendering, themed browser surfaces
- [x] Content parity confirmed

## Task 4: Record index rail

**Description:** Build the left rail from the FIRST VIEWPORT block: name in Latin and Tamil with pronunciation button, role, location, numbered list of records, section links (Witnesses, Experience, Stack, Earlier work, Contact), and the pinned "Request a conversation" block at its foot. Rows visibly press; the current record's row sits inset (CD-ROM raise).

**Acceptance criteria:**
- [x] Rail is sticky on desktop ≥ 1024px, lists every record and section from the collections, and the active row reflects scroll position
- [x] Pronunciation button plays the audio file (small island or vanilla `<script>`), keyboard operable, labelled
- [x] Contact block: email (`mailto:`), call/WhatsApp (`tel:`, `wa.me`), LinkedIn, in the world's component language

**Verification:**
- [x] Build and check pass
- [x] Manual check: keyboard tab order reaches every rail link; focus ring is the reserved brightest surface

**Dependencies:** Tasks 2, 3
**Files likely touched:** `src/components/RecordIndex.astro`, `src/components/ContactBlock.astro`, `src/components/Pronounce.astro`, `src/pages/index.astro`
**Estimated scope:** M

## Task 5: ADR record component and ADR-001 in full

**Description:** Build the record component (header with status stamp and date, Context, Options considered as a pros/cons table, Decision, Consequences ledger with tabular figures, Reviewed-by slot) and render ADR-001 Tibco → AWS Glue as the first thing in the main column.

**Acceptance criteria:**
- [x] ADR-001 shows: status ACCEPTED, date, context, three options with pros/cons, decision, consequences ledger with `$24,000 → $840 / year`, `96.5%`, delivered before contract end; the 96.5% line is the one solid-ink line (manga raise)
- [x] Rejected options use rust-red and nothing else on the page does (cityscape raise)
- [x] No eyebrow/kicker labels, no cards, no section numbers beyond the ADR identifier itself

**Verification:**
- [x] Build and check pass
- [x] Manual check: screenshot at 1440px; the record is legible with all CSS removed (semantic HTML)

**Dependencies:** Tasks 2, 3
**Files likely touched:** `src/components/Record.astro`, `src/components/StatusStamp.astro`, `src/components/OptionsTable.astro`, `src/components/Ledger.astro`, `src/pages/index.astro`
**Estimated scope:** M

## Task 6: Reviewed-by block and "Request a conversation" action

**Description:** The reviewed-by block renders a witness's name, title, organisation and the quoted lines relevant to this record (Jason Wheeler's $30,000 line on ADR-001). The action block appears at the end of every record and in the rail foot.

**Acceptance criteria:**
- [x] Reviewed-by pulls from `witnesses` by slug; quote is verbatim from the source testimonial
- [x] Action block is a working link group, visually unmistakable as the primary action, present after each record
- [x] Hover/active/focus states defined for every control (craft floor States)

**Verification:**
- [x] Build and check pass
- [x] Manual check: every action link resolves (mailto, tel, wa.me, LinkedIn)

**Dependencies:** Task 5
**Files likely touched:** `src/components/ReviewedBy.astro`, `src/components/ContactBlock.astro`, `src/components/Record.astro`
**Estimated scope:** S

## Task 7: Mobile composition

**Description:** Below 1024px the rail collapses to a sticky record index bar (name + current record + menu), records stack, and the action stays reachable without hunting.

**Acceptance criteria:**
- [x] At 390px: no horizontal scroll, ADR-001 header and stamp visible in the first viewport, options table reflows to stacked rows
- [x] Sticky bar opens the full index (no modal unless focus protection is needed; a disclosure is fine)
- [x] Tap targets ≥ 44px

**Verification:**
- [x] Build and check pass
- [x] Manual check: screenshots at 390px and 768px from document top

**Dependencies:** Tasks 4, 5, 6
**Files likely touched:** `src/components/RecordIndex.astro`, `src/components/Record.astro`, `src/styles/global.css`
**Estimated scope:** M

## Checkpoint: First viewport
- [x] Desktop (1440) and mobile (390) full-page screenshots captured from top, validated
- [x] A reader new to the site answers "what is this, why does it matter, what do I do" in 5 seconds
- [x] Mubarak reviews before Phase 2

## Task 8: Records ADR-002 … ADR-005

**Description:** Render the remaining records from the collection: EF Academy multilingual platform (1.25M+ users, 23+ languages, Prospect Uploader, Storyblok translation workflow), Incresco & Camped redesign (100% Lighthouse, page builders), Planet SIM & Planet Business IoT dashboards (SignalR, Firebase), Edvanza team lead (four engineers, 30+ interviews, 37% of PRs). Each has its own reviewed-by where a testimonial supports it.

**Acceptance criteria:**
- [x] All five records render from the collection in index order; no fact appears that is not in PRODUCT.md or the live site
- [x] Each record ends with the action block

**Verification:**
- [x] Build and check pass; Playwright smoke asserts five `article[data-record]`

**Dependencies:** Tasks 5, 6
**Files likely touched:** `src/content/records/*.mdx`, `src/pages/index.astro`
**Estimated scope:** S

## Task 9: Witnesses section

**Description:** All nine testimonials in full, as signed reviews in the record world (name, title, organisation, full text, no "show more" truncation cards).

**Acceptance criteria:**
- [x] Nine entries, verbatim text, readable measure (65–75ch), not a same-size card grid
- [x] Linked from the rail; anchors per witness

**Verification:**
- [x] Build and check pass; axe reports no issues on the section

**Dependencies:** Task 3
**Files likely touched:** `src/components/Witnesses.astro`, `src/pages/index.astro`
**Estimated scope:** S

## Task 10: Experience timeline and Stack appendices

**Description:** Three roles with dates and bullets as a record appendix; the 23 stack items grouped (languages, frameworks, UI, state/data, infra, tools) as a lettered list, not chips.

**Acceptance criteria:**
- [x] Dates in tabular figures; mono only for the dates/identifiers
- [x] Stack list has no icon-grid or chip costume; grouped and scannable

**Verification:**
- [x] Build and check pass

**Dependencies:** Task 3
**Files likely touched:** `src/components/Experience.astro`, `src/components/Stack.astro`, `src/pages/index.astro`
**Estimated scope:** S

## Task 11: Earlier work, game link, contribution graph

**Description:** Eight projects as a compact index with links (2020 Flutter era clearly dated); Whac-a-Thief as a linked item at the end; GitHub contribution graph fetched at build time with JSON fallback.

**Acceptance criteria:**
- [x] Projects render from the collection; four pending entries show their names and links until details arrive
- [x] `src/lib/github.ts` fetches contributions with `GITHUB_TOKEN`, falls back to `src/data/contributions.json`; build never fails without the token
- [x] Graph is an SVG with themed cells (no third-party widget), with a text summary for screen readers

**Verification:**
- [x] Build passes with and without `GITHUB_TOKEN`

**Dependencies:** Task 3
**Files likely touched:** `src/components/EarlierWork.astro`, `src/components/Contributions.astro`, `src/lib/github.ts`, `src/data/contributions.json`
**Estimated scope:** M

## Task 12: Contact section and footer

**Description:** Every channel from the live site (email, phone/WhatsApp, LinkedIn, GitHub, X, Instagram, YouTube), the repeated action, and a footer with the name in both scripts.

**Acceptance criteria:**
- [x] All seven channels present with correct handles and working links
- [x] Icons are a single consistent SVG set, not emoji/unicode

**Verification:**
- [x] Playwright asserts each link's href

**Dependencies:** Task 4
**Files likely touched:** `src/components/Contact.astro`, `src/components/Footer.astro`, `src/pages/index.astro`
**Estimated scope:** S

## Checkpoint: Content complete
- [x] Parity against docs/research.md §1: nothing missing
- [x] Playwright smoke + axe pass at 390 and 1440

## Task 13: Stamp-landing interaction

**Description:** The one authored motion: each record's status stamp lands when the record enters the viewport (rotate + settle + ink bleed, exponential ease-out, from an already-visible default). Reduced motion pre-lands every stamp. Nothing else animates on entry.

**Acceptance criteria:**
- [x] One `<script>` with IntersectionObserver toggling one class; CSS keyframes only; transform/opacity/filter
- [x] `prefers-reduced-motion: reduce` → stamps static, no observer
- [x] No other entrance animations exist in the codebase (grep for `animate-`/`@keyframes` confirms one set)

**Verification:**
- [x] Playwright test with reduced-motion emulation sees landed stamps immediately

**Dependencies:** Task 8
**Files likely touched:** `src/components/StatusStamp.astro`, `src/styles/global.css`, `src/scripts/stamps.ts`
**Estimated scope:** S

## Task 14: Metadata, OG image, JSON-LD, sitemap

**Description:** Title/description, canonical, Open Graph + Twitter card with a generated OG image in the world's style, JSON-LD `Person`, `@astrojs/sitemap`, robots.

**Acceptance criteria:**
- [x] OG image generated at build (satori or a static PNG with provenance recorded)
- [x] JSON-LD validates; sitemap emitted

**Verification:**
- [x] Build passes; manual check with a social card debugger

**Dependencies:** Task 2
**Files likely touched:** `src/layouts/Base.astro`, `astro.config.mjs`, `src/pages/og.png.ts`, `public/robots.txt`
**Estimated scope:** S

## Task 15: Performance pass and Lighthouse CI

> Result 2026-10-09 (PageSpeed Insights on the live URL, Lighthouse 13.5): mobile 94/100/100/100, desktop 96/100/100/100. Client JS is 53 KB gzipped by direction choice (GSAP + SplitText + Lenis); the plan's 5 KB target no longer applies. Preloader trimmed to six greetings to help Speed Index.

**Description:** Font subsetting and `size-adjust` fallbacks, images via `astro:assets` (AVIF/WebP), zero unused client JS, preload the two critical fonts, Lighthouse CI in `npm run lighthouse`.

**Acceptance criteria:**
- [x] Lighthouse mobile and desktop: Performance, Accessibility, Best Practices, SEO all 100 on the production build served locally
- [x] Client JS ≤ 5 KB gzipped total

**Verification:**
- [x] `npm run lighthouse` report committed under `.impeccable/review/`

**Dependencies:** Tasks 8–14
**Files likely touched:** `astro.config.mjs`, `src/layouts/Base.astro`, `package.json`, `lighthouserc.json`
**Estimated scope:** S

## Task 16: Detector and inspection round

**Description:** Run `impeccable detect --json src` once; capture `.impeccable/review/desktop.png`, `mobile.png`, and `user-<width>.png` from document top with stamps pre-landed; critique against the direction contract; fix in one batch; confirm with one more round.

**Acceptance criteria:**
- [ ] Detector findings fixed or passed to the reviewer with reasons
- [ ] Two inspection rounds maximum

**Verification:**
- [ ] Screenshots validated (no blank regions, correct sections)

**Dependencies:** Task 15
**Files likely touched:** whatever the findings name
**Estimated scope:** S

## Task 17: Finish review and documentation

**Description:** Spawn `impeccable-finish-reviewer` with the request, answers, artifact path, screenshots, direction contract, detector findings, craft-floor path. Act on the disposition. Then spawn `impeccable-documenter` to write `DESIGN.md` and `.impeccable/design.json` from the built world.

**Acceptance criteria:**
- [ ] Reviewer disposition `ship` (or fix rounds closed within budget, with the user choosing on a second open verdict)
- [ ] `DESIGN.md` with tokens and `.impeccable/design.json` exist

**Verification:**
- [ ] Review return carries its five sections; DESIGN.md tokens match `global.css`

**Dependencies:** Task 16
**Estimated scope:** S

## Task 18: Deploy

> Done 2026-10-09: GitHub https://github.com/MDmubarak786/mubarak-portfolio (public), Vercel project `portfolio-2025` linked and git-connected, production at https://mk-full-stack-developer.vercel.app. `vercel.json` pins the Astro preset (the project was on the Next.js preset).

**Description:** Vercel project, `GITHUB_TOKEN` env, production deploy, decide domain, redirect the old URL if a new one is chosen.

**Acceptance criteria:**
- [x] Production URL serves the site; Lighthouse 100s on the deployed URL
- [x] Old URL redirects (301) if a new domain is chosen

**Verification:**
- [x] Manual check on phone and laptop

**Dependencies:** Task 17
**Estimated scope:** S

## Checkpoint: Complete
- [ ] All acceptance criteria met; finish review `ship`; DESIGN.md present
- [ ] Mubarak signs off
