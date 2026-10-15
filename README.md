# MK Comics — Mubarak Shajahan's portfolio

A senior software engineer's career, told as a comic book. Live at **https://mk-comics.vercel.app**.

The site is one long issue: a cover, four chapters (the Great Migration, eight case files, nine witnesses on record,
the origin story), a collector's insert for the resume, power-ups, back issues, the weekly strip, and a back cover.
Every number on it is real and every quote is verbatim.

## What is in the issue

- **The intro.** A 34-second motion comic on desktop: a closed book that opens on click, seven spreads with camera
  moves and a paper page curl, a dive and an ink reveal. Recorded trailer score and sound effects placed on their
  visual peaks, a synth score as the fallback. Once per session, `?loader=s` replays it, Esc or scroll skips it.
- **Build your hero.** The nine tool groups are nine outfits on a comic figure with the real head cut out as a
  sticker: a word balloon, a shield, a wrench and belt, a data pack, a cape, a visor, a headset, a cable, a hardhat.
  Tabs, arrow buttons and arrow keys change the gear.
- **The getaway.** On the back cover the ways to reach me are balloons drifting over a ledge. The hero runs after the
  pointer and his arm stretches for the far ones. Catch one and it pops, the link opens. Leave them too long and they
  leak out of the top; `R` brings them back. A plain list of channels sits below for keyboards and readers.
- **The weekly strip.** A blog about what shipped in AI and what to build with it, primary sources only, with topic
  pages, an RSS feed and generated Open Graph images.
- **Case files and witnesses.** Each piece of work carries its context, the decision and what it changed, with the
  people who vouched for it on record, quoted word for word.

## Stack

Astro 7, Tailwind CSS v4, GSAP and Lenis, content collections, deployed on Vercel from `main`. Fonts are Bangers and
Patrick Hand with metric-matched fallbacks. No framework on the client: the interactive parts are small inline scripts.

Performance is a feature: 100 on PageSpeed for mobile and desktop in every category with the intro live, held by inlined
styles, `content-visibility` below the fold, an SVG path for the Tamil name, a served SVG for the GitHub calendar, and
analytics that boot on the first interaction. The write-ups are on the blog.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in .vercel/output
npx astro check    # types and content schemas
```

Sound and the intro need a real browser; the intro skips phones and `prefers-reduced-motion`.

## Edit the content

- `src/content/records/*.md` — the case files: `context`, `decision`, `consequences`, `reviewedBy`, `tags`.
- `src/content/witnesses/*.json` — the testimonials, verbatim; `pull` is the line that gets highlighted.
- `src/content/experience/*.json`, `src/content/projects/*.json` — the origin story and back issues.
- `src/content/posts/*.md` — the weekly strip. `python3 scripts/check-posts.py` validates a post against the schema
  and the editorial brief in `docs/blog-agent-brief.md`.
- `src/data/stack.json` — the power-ups, grouped. `src/lib/site.ts` — name, role, links, numbers.
- `src/assets/portrait.jpg` and `src/assets/head.png` — the cover portrait and the cut-out head on the hero.
- `public/resume/` — the PDF; `npm run resume:thumb` regenerates its preview image.

The GitHub calendar is fetched from the public contributions page at build time and falls back to
`src/data/contributions.json`. No token is needed.

## Audio

Music is a Pixabay Content License cue cut by `scripts/prepare-music.py`; the effects are Mixkit, trimmed, normalised
and encoded by `scripts/prepare-sfx.py`. Both scripts record the sources they used. Sound is off until the first click,
the choice is remembered, and `M` toggles it during the intro.

## Layout of the repo

```
src/pages            index, blog (pages, topics, OG images), rss.xml, calendar.svg, og.png
src/components/final the comic: loaders/Story (intro), HeroFigure, PowerUps, Getaway, Calendar, Pronounce, …
src/layouts          FinalShell (head, fonts, analytics)
src/lib              site facts, story copy, calendar, GitHub snapshot
src/styles/comic.css the comic's own styles; Tailwind handles layout
scripts              content checks, audio preparation, the Tamil name path, the resume thumbnail
docs                 blog plan, calendar and agent brief; design research
```

`PRODUCT.md`, `DESIGN.md` and `.impeccable/` hold the product truth and the design record.
