# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro 7 + Tailwind CSS v4, Lenis + GSAP (ScrollTrigger, SplitText) for motion, deployed on Vercel (user decision, 2026-10-09). Content lives in Astro content collections (`src/content/`) and `src/lib/story.ts`; copy is data, not JSX. No React islands.

## Users

Primary: hiring managers and engineering leaders at product companies screening for Senior, Lead or Staff full-stack + AI engineer roles (confirmed 2026-10-09). They arrive from a CV link, LinkedIn, or a recruiter forward, usually on a laptop between meetings, with 30–90 seconds to decide whether to shortlist. Their job: confirm seniority, judgment and ownership fast, then find a way to reach him.

Secondary (confirmed 2026-10-09): the developer audience that reads his LinkedIn posts (22K+ followers, 10M+ impressions). They should find his writing on the site. Recruiters on phones and peers from GitHub must still be served.

## Product Purpose

A personal portfolio for Mubarak Shajahan (LinkedIn display name; formerly shown as Mohammed Mubarak; Tamil name முகமது முபாரக்), Senior Software Engineer at Galent, Chennai, India, since May 2026; before that five years at Incresco (21 June 2021 – May 2026, Software Development Engineer → SDE 1 → SDE 2) building AI and full-stack platforms for Global University Systems. Verified against LinkedIn and his resume on 2026-10-09. It replaces a template-based site (https://mk-full-stack-developer.vercel.app/, ncdai template), which stays live and untouched on its own Vercel project until he switches. Success: a hiring manager understands within one viewport what he has owned and shipped, trusts it because of named third-party proof, and emails or messages him.

## Positioning

Not "a full-stack developer with a stack list." The claims a neighbouring portfolio cannot truthfully copy: 5+ years (computed live from his career start, 21 June 2021) in which he was the sole engineer on EF Academy's primary digital presence (1.25M+ monthly users, 23+ languages) while architecting its AWS integration layer; replaced a licensed TIBCO pipeline with AWS Glue before the contract ended, cutting the cost from $24,000 to $840 a year; shipped AI document processing (GPT-4 Vision + OCR) classifying 17+ document types at 95% accuracy with fraud detection; Chrome extensions saving admins 3–5 hours a day; nine leaders and clients vouching on record. He builds products where full-stack engineering meets AI, and teaches what he learns to 22,000+ developers.

## Operating Context

- Read in the context of a job application or recruiter outreach; compared side by side with other candidates' LinkedIn profiles and portfolios.
- Linked from CV, LinkedIn (linkedin.com/in/mohammed-mubarak), GitHub (MDmubarak786), X (@MMubarakoo7).
- Built with AI coding tools (Claude Code); the site should reflect current craft.
- Production: Vercel project `portfolio2026`, https://mk-comics.vercel.app, auto-deploys from GitHub `MDmubarak786/mubarak-portfolio` on `main`. Custom domain: open.
- The Comic build is the site at `/` (decision 2026-10-09; the Studio build, the Hawkins variant and the eleven `/v` story samples were removed, recoverable from git history). `/comic` redirects to `/`.

## Capabilities and Constraints

Confirmed content the site carries (nothing from the old site is cut except the items listed under "dropped"):
- Identity: name in Latin and Tamil script, pronunciation audio (`public/audio/mohammed-mubarak.mp3`), role, location, pronouns (he/him), HD portrait (`src/assets/portrait.jpg` 4:5 and `avatar.jpg` square, from his own photo, 2026-10-09).
- Contact: email mohammedmubarakmk@gmail.com (confirmed by LinkedIn and resume; the old site's mohammedmubarakmkg@gmail.com is retired), phone/WhatsApp +91 7904100495, LinkedIn, GitHub, X, Instagram (@scooby_doo.mk), YouTube (@mohammedmubarak1478).
- Resume PDF (`public/resume/Mubarak-Shajahan-Resume.pdf`): previewable in page and downloadable. The current PDF still lists IncrescoTech SDE 2 as present; an updated PDF is owed by Mubarak.
- Eight records of work (content collection `records`, ADR-001…008): TIBCO → AWS Glue, EF Academy multilingual platform, Prospect Uploader, Incresco & Camped sites, Planet IoT, Edvanza, AI document processing, Chrome extensions. Option tables in them are drafts marked `confirmed: false` that he edits himself (decision 2026-10-09).
- Experience (collection `experience`): Galent Senior Software Engineer (May 2026 –), Incresco SDE 2 (Oct 2022 – May 2026), SDE 1 (May – Sep 2022), Software Development Engineer (Jun 2021 – May 2022), with the resume's bullets.
- Nine testimonials verbatim (collection `witnesses`): Andrea Devis Matheus, Chloe Sturges, Jason Wheeler, John Squier, Julieta Capogna, Dan Lawrence, James Foxon, Minon Weber, Naga Venkata Sai Kotha.
- Skills in the resume's nine groups (`src/data/stack.json`, `skillGroups` in `story.ts`).
- Education: B.Tech in Information Technology, Sri Krishna College of Technology, Coimbatore, 2018–2022, CGPA 8.01/10. Award: Outstanding contribution and strong ownership, IncrescoTech, 2021.
- Eight 2020 Flutter apps with YouTube demos (keep, confirmed 2026-10-09).
- GitHub contribution calendar, fetched from the public contributions page at build time with a committed fallback.
- To add (confirmed 2026-10-09, inputs owed by Mubarak): a Writing section linking 3–6 of his best LinkedIn posts with titles and reactions; newer repos StudioX, Eventloop-Visualizer and claude-mods as recent side projects, one line each from him.
- Dropped (decision 2026-10-09): the Whac-a-Thief Spline game page and its links; the MK monogram and logotype; the old template's widgets (Monkeytype tile, timezone clock, location map, TV carousel).

Constraints:
- Motion is a feature, not a flourish budget: the user asked for full GSAP choreography (decision 2026-10-09, replacing the earlier "one signature interaction" constraint). Everything must still respect prefers-reduced-motion and hold 60fps on mid-range phones; no WebGL.
- Lighthouse target 100; PageSpeed on the live Studio build: mobile 94/100/100/100, desktop 96/100/100/100.
- Nothing cut, nothing flat: every piece of content survives, ranked by what a hiring manager needs first.
- Open: custom domain; updated resume PDF.

## Brand Commitments

- Name: Mubarak Shajahan; Tamil rendering முகமது முபாரக் with pronunciation audio is part of his identity, keep it.
- Visual direction: the user rejected paper/serif document worlds, bento widget grids, and a quiet logbook world; the comic-book world is the standing commitment (chosen 2026-10-09 over the dark cinematic studio build and a Stranger Things variant); refinements keep that world.
- Voice: direct, first person, outcome-led; no hype adjectives. Testimonials are never paraphrased.
- Photography: his own portrait only; no stock imagery.

## Evidence on Hand

- Resume (2026-10-09) and LinkedIn profile text (captured 2026-10-09) are the sources for every role, date, metric and skill. Quantified facts: 1.25M+ monthly users, 23+ languages, $24,000 → $840/yr (96.5%), $30,000/yr licensing saved (per Jason Wheeler), 100% Lighthouse on Incresco & Camped, 10,000+ leads per upload, 17+ document types at 95% accuracy, manual entry −70%, processing 7×, accuracy +40% on complex documents, compliance effort −60%+, qualification matching +35%, OpenAI content generation −80% effort, PDF.js extraction −50% time, 3–5 hours/day saved per admin at 99.9% uptime, Playwright latency −40%, admin lookup −60%+, 1,300+ PRs, 37% of org PRs reviewed, 30+ interviews, team of four led, 22K+ followers, 10M+ impressions.
- Full copy of the old site in docs/research.md.
- Absent, must not be fabricated: screenshots of client products; client logos with permission; metrics not listed above; new testimonials; the post links and repo descriptions still owed.

## Product Principles

1. Proof leads, interface recedes: the strongest owned outcome is visible in the first viewport, with its named witness.
2. Nothing cut, but nothing flat: every piece of content survives, ranked by what a hiring manager needs first.
3. Motion tells the story: choreography paces the reading; it never hides content, and it degrades to still pages without loss.
4. His, not a template's: no borrowed widgets or category defaults; the site should be unguessable from "developer portfolio" alone.
5. Reachable in one step from anywhere on the page.

## Accessibility & Inclusion

Bilingual name (Latin + Tamil) renders with proper font support. Reduced-motion users get the full content with all choreography removed. Contrast at WCAG AA minimum; keyboard-navigable (verified 100 Accessibility on PageSpeed); recruiters on phones are a real audience, verified at 390px.
