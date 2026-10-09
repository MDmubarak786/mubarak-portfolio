# Portfolio rebuild: research notes (2026-10-09)

## 1. The incumbent site (anti-reference, not authority)

Live: https://mk-full-stack-developer.vercel.app/ ("Mohammed MubaraK – Lead Software Engineer")

It is built on the **Chánh Đại `ncdai` portfolio template** (chanhdai.com): the dotted grid, "Pronounce my name",
monogram hero, Brand → Mark/Logotype section, Monkeytype widget, timezone clock, TV-show carousel, Spline mini
game, GitHub contribution graph. Everything structural is the template author's; only the copy is Mubarak's.

What it does well (keep as *content*):
- Strong, specific proof: 9 named testimonials from EF Academy / Incresco / Worldwide Kids leaders (VP of
  Technology, Director of Ed-Tech, Senior Designer, SEO Manager).
- Quantified wins: EF Academy multilingual platform at 1.25M+ monthly users across 23+ languages; Tibco →
  AWS Glue migration cutting integration cost from $24k to $840/yr (96.5%); 100% Lighthouse scores on the
  Incresco & Camped marketing site; Prospect Uploader on Lambda + EventBridge handling 10k+ CSV leads.
- Clear timeline: Junior → Software Engineer → Lead (2021 → present), Edvanza then EF Academy.
- Contact surface: email, phone/WhatsApp, LinkedIn, GitHub, X, Instagram, YouTube.

What fails the craft floor (reference/craft-floor.md) and must not carry over:
- Kicker/eyebrow labels above headings ("TESTIMONIALS", "MINI GAME", "Overview"). Banned.
- Same-size card grid as the page structure (testimonial cards, stack chips, project cards).
- Bento widgets that are the template's personality, not his: Monkeytype WPM, dual timezone clock,
  "Dark" TV-show carousel, Whac-a-Thief game. They cost attention and prove nothing about him.
- Monospace-as-costume for "technical" (labels, dates in `10.2022 — Present`).
- Near-black + grid + one accent: the category default any model would guess from "developer portfolio".
- 8 projects where 4 are 2020 Flutter learning apps (Tic Tac Toe, COVID status) shown at equal weight to
  enterprise work. Hierarchy is flat; the strongest proof is buried below a game.
- "Full-stack developer" positioning in the URL vs "Lead Software Engineer" in the title: identity is split.

## 2. What is current (and what is already saturated)

Sources:
- Colorlib, 21 best developer portfolios 2026 — https://colorlib.com/wp/developer-portfolios/
- Envato, portfolio trends 2026 — https://elements.envato.com/learn/portfolio-trends
- Muz.li, top 100 portfolios 2025/26 — https://muz.li/blog/top-100-most-creative-and-unique-portfolio-websites-of-2025/
- Hon Tran, how to build an award-winning portfolio — https://www.hontran.dev/blog/how-to-build-an-award-winning-portfolio-site
- Awwwards collections May 2026 — https://www.awwwards.com/sgfreelancer/collections/18-may-2026-collection-1/
- GitHub topic nextjs-portfolio-template — https://github.com/topics/nextjs-portfolio-template

Findings that matter:
- **Awwwards scoring**: Design 40%, Usability 30%, Creativity 20%, Content 10%. A fast, beautifully typeset
  site with modest ambition beats a flashy broken one. "One opinionated idea, one signature moment people
  screenshot, restraint around it."
- **Overused in 2026** (the rut): dark mode + neon accent + glow edges; macOS-dock nav; bento grids of
  widgets; terminal/IDE costume; horizontal-scroll project galleries; slow "artistic" preloaders;
  everything-animates-on-scroll; Framer-Motion fade-up on every section.
- **Studio-tier portfolios** (muz.li list: Jordan Delcros, Karim Saab, Samsy, Eduard Bodak) lean WebGL/3D.
  That is the wrong register for a hiring-targeted engineer whose artifacts are enterprise systems;
  it shows effects, not judgment. Reference for finish quality only.
- **Hiring-side expectations**: projects-first, recruiter-scannable in 30 seconds, real case studies with
  numbers, working contact, fast load, responsive, GitHub integration optional.
- **Stack consensus**: Next.js App Router + React Server Components, Tailwind v4, Motion (framer) or GSAP +
  ScrollTrigger + Lenis for scroll choreography, MDX for case studies, Vercel. R3F/three only if it earns it.
  Animate transform/opacity only; honour prefers-reduced-motion.
- **Templates to NOT start from** (so the result is his, not another author's): ncdai, Magic UI portfolio,
  Lee Robinson next-blog-mdx, Tailwind Next.js Starter Blog, devportfoliotemplates. Use them as a bar for
  code quality, not as a skeleton.

## 3. Implication for the brief

The differentiator is **proof**, not effects: a lead engineer with two years as sole owner of a
1.25M-user multilingual platform, a 96% cost-cut migration delivered before a contract deadline, and nine
leaders on record. The page should let those artifacts lead from the first viewport and let the interface
recede. The one signature moment should come from his own work (e.g. the migration, the localization
system, the 23-language page builder), never from a borrowed widget.

Decisions still owned by Mubarak (asked in the init round): primary audience and action; which 2–3
pieces become flagship case studies; ambition/perf budget; whether he will sit for the direction pick.
