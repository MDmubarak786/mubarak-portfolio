# Mohammed Mubarak — portfolio

Dark, cinematic single-page portfolio built with Astro 7, Tailwind CSS v4, Lenis and GSAP. Content lives in
`src/content/` (records, witnesses, experience, projects) and `src/data/` (stack, GitHub snapshot) so copy can
be edited without touching components.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/ (+ .vercel/output)
npx astro check    # types and content schemas
```

## Edit content

- `src/content/records/*.md` — the six pieces of work. Each file's front matter holds `title`, `index`
  (short title for the rows), `context`, `options`, `decision`, `consequences`, `reviewedBy`. They are marked
  `confirmed: false` until you check the drafted options.
- `src/content/witnesses/*.json` — the nine testimonials, verbatim. `pull` is the line shown inside a work row.
- `src/content/experience/*.json`, `src/content/projects/*.json`, `src/data/stack.json`.
- `src/lib/site.ts` — name, role, contact links, greetings for the preloader.
- `src/assets/portrait.png` — replace with a high-resolution portrait (at least 1200px tall, 4:5 crop works best).

The GitHub calendar is fetched from the public contributions page at build time and falls back to
`src/data/contributions.json`. No token is needed.

## Deploy to the existing Vercel project

1. Create an empty GitHub repository (for example `portfolio`), then from this folder:
   ```bash
   git remote add origin git@github.com:MDmubarak786/portfolio.git
   git push -u origin main
   ```
2. In Vercel, open the project that serves `mk-full-stack-developer.vercel.app` → Settings → Git →
   connect it to the new repository (or import the repo and move the domain). Framework preset: Astro.
   Build command `npm run build`, output is handled by `@astrojs/vercel`. No environment variables required.
3. Every push to `main` deploys. The old site is replaced on the first production deploy; the game stays
   reachable at `/police-thief`.

## Design record

`PRODUCT.md` is the product truth, `.impeccable/surfaces/src-pages-index-astro.md` the direction contract,
`DESIGN.md` the shipped visual system, `docs/` the research, and `tasks/` the plan.
