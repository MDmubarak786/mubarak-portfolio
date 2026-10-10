---
title: "Writing a CLAUDE.md that actually helps"
description: "What belongs in a CLAUDE.md and what does not, from Anthropic's docs, with a 30-line example for a real Astro repo and the rules, imports and hooks that replace the rest."
date: 2026-10-10T02:33:00Z
tags: ["Claude Code", "CLAUDE.md", "developer experience", "context", "Astro"]
pillar: building
sources:
  - title: "Claude Code docs: how Claude remembers your project (CLAUDE.md, rules, imports)"
    url: "https://code.claude.com/docs/en/memory"
  - title: "Claude Code docs: best practices (what to include and exclude)"
    url: "https://code.claude.com/docs/en/best-practices"
  - title: "Claude Code docs: manage costs effectively (move instructions to skills)"
    url: "https://code.claude.com/docs/en/costs"
  - title: "Claude Code docs: how Claude Code uses prompt caching (CLAUDE.md edits mid-session)"
    url: "https://code.claude.com/docs/en/prompt-caching"
  - title: "Claude Code docs: automate actions with hooks"
    url: "https://code.claude.com/docs/en/hooks-guide"
  - title: "Claude Code docs: skills"
    url: "https://code.claude.com/docs/en/skills"
draft: false
---

A CLAUDE.md is the one file Claude Code reads at the start of every session, so each line in it competes for attention on every turn. The docs are specific about what earns a place, and length is the common failure. This repo has no CLAUDE.md, which is the gap I am writing about, so below is the file I would add to it, line by line against the docs.

## What is a CLAUDE.md and where does it live?

It is a markdown file of persistent instructions that Claude "reads at the start of every session". It has four scopes, listed broadest first:

| Scope | Location | Shared with |
|---|---|---|
| Managed policy | `/Library/Application Support/ClaudeCode/CLAUDE.md` on macOS | Everyone in the organisation |
| User | `~/.claude/CLAUDE.md` | You, in all projects |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | The team, through version control |
| Local | `./CLAUDE.local.md` | You, in this project (add to `.gitignore`) |

Claude Code loads these from the working directory and every directory above it. Files are concatenated, not overridden, ordered from the filesystem root down, so the closest file is read last. CLAUDE.md files in subdirectories load on demand, when Claude reads or edits a file there. `/init` generates a starter, and `/context` shows which memory files loaded.

One framing matters more than the table. The docs say Claude treats these files "as context, not enforced configuration". A CLAUDE.md shapes behaviour. It does not guarantee it.

## What belongs in it, and what does not?

The best-practices page gives a table. I have condensed it:

| Include | Exclude |
|---|---|
| Bash commands Claude cannot guess | Anything Claude can work out by reading the code |
| Style rules that differ from defaults | Standard language conventions |
| Test instructions and preferred runners | Detailed API documentation; link to it |
| Branch and PR etiquette | Information that changes often |
| Architecture decisions specific to the project | Long explanations or tutorials |
| Required environment variables and quirks | File-by-file descriptions of the codebase |
| Gotchas that are not self-evident | Self-evident advice such as "write clean code" |

The test for each line is one question from the same page: "Would removing this cause Claude to make mistakes?" If not, cut it. The page also lists when to add a line: Claude makes the same mistake a second time, a code review catches something it should have known, or you type the same correction you typed last session.

On size, the memory docs say to target "under 200 lines per CLAUDE.md file", because longer files consume more context and reduce adherence. Contradictions are worse than length: "If two instructions contradict each other, Claude may pick one arbitrarily."

## Is a long CLAUDE.md expensive?

Less than you think, and the reason to keep it short is not the bill. The file is read once at session start and sits in the project-context layer, which Claude Code re-reads from cache on each turn. On Sonnet 5.5 a 2,000-token file costs about $0.0002 per cached turn. The real cost is adherence: the best-practices page warns that bloated files cause Claude to ignore your actual instructions. The [prompt caching post](/blog/prompt-caching-for-coding-agents-stable-context) has the arithmetic.

A related behaviour to know before you tune the file: editing it mid-session does not apply. The prompt-caching page says the edit neither invalidates the cache nor takes effect, and the new content loads on the next `/clear`, `/compact` or restart.

## Where do the other instructions go?

- **Multi-step procedures: a skill.** The costs page says skills "load on-demand only when invoked", so moving specialised workflows out of CLAUDE.md keeps the base context smaller.
- **Rules for part of the codebase: `.claude/rules/` with `paths:`.** A path-scoped rule loads only when Claude works with a matching file.
- **Things that must happen every time: a hook.** The best-practices page puts it plainly: unlike CLAUDE.md instructions, which are advisory, hooks are deterministic.
- **Blocking an action: settings.** The memory docs assign `permissions.deny` to managed settings and keep CLAUDE.md for behavioural guidance.
- **Notes to humans: HTML comments.** Block-level `<!-- -->` comments are stripped before the file is injected, so they cost no context.
- **Long reference files: imports, with care.** `@path/to/file` imports are expanded at launch, up to four hops deep. The docs are clear that imports "don't reduce its context cost", because imported files load at launch too.

## An example: the CLAUDE.md I would add to this repo

This is a proposal, not a file I have run. Every line comes from `README.md`, `.claude/launch.json`, `src/content.config.ts`, `DESIGN.md` or the blog code in this repo.

```markdown
# MK Comics (portfolio + blog)

Astro 7, Tailwind v4, GSAP + Lenis, static output on Vercel.

## Commands
- `npm run dev` serves http://localhost:4321
- `npm run build` must pass before a task is called done
- `npx astro check` validates types and content schemas, posts included

## Hard rules
- Comic world only. Panels, tiles and buttons never tilt or rotate; tilt belongs to captions and SFX.
- Never pre-hide content for an entrance animation. Gate every script on `prefers-reduced-motion`.
- Fonts load at weight 400 only (Bangers, Patrick Hand). Do not use bold utilities.
- `src/styles/comic.css` is unlayered and beats Tailwind utilities. Put size overrides there.
- Analytics IDs come from `PUBLIC_GA_ID`, `PUBLIC_GTM_ID`, `PUBLIC_CLARITY_ID`. Never hard-code them.
- Do not edit `dist/` or `.vercel/`.

## Blog
- Posts live in `src/content/posts/<slug>.md`. Schema: `src/content.config.ts`.
- Give every post a distinct `date` with a time of day. Issue numbers come from sort order.
- Source URLs must be pages that were actually fetched.
- OG images use satori and TTF fonts in `src/assets/fonts`. WOFF2 is not supported.

## More
- Design details and Do's and Don'ts: see DESIGN.md before touching UI.
- Blog voice and structure: see docs/blog-agent-brief.md.
```

Two decisions in it are worth explaining. First, `DESIGN.md` runs to about 360 lines, so importing it with `@DESIGN.md` would load all of it every session. I put the rules that bite most inline and reference the file by path, so Claude opens it when it touches UI. Second, the blog rules matter only when working on posts, which makes them a candidate for a path-scoped rule instead:

```markdown
---
paths:
  - "src/content/posts/**/*.md"
---

# Blog posts
- Frontmatter keys: title, description, date, updated (optional), tags, pillar, related (optional), sources, draft.
- Body is Markdown only, with no Sources section; the layout renders sources from frontmatter.
```

What I left out is as deliberate as what I kept: no tour of the folders, no copy of the design tokens, no "write clean code". The whole file is about 30 lines.

## How do you know it is working?

- Run `/context` and check the **Memory files** list to confirm the file loaded.
- Run `/doctor` on a checked-in CLAUDE.md and Claude proposes cuts for content it can derive from the codebase. From Claude Code v2.1.283, `/doctor prompt-audit` looks for outdated or conflicting instructions; nothing changes until you ask.
- Treat it like code. The best-practices page says to review it when things go wrong, prune it, and test changes by watching whether behaviour shifts.
- If one instruction keeps getting skipped, add emphasis such as "IMPORTANT" to that line alone. Emphasise many and none stands out.

## Takeaways

- Write down only what Claude cannot learn from the code: commands, quirks, rules that differ from defaults. Ask of every line whether removing it would cause mistakes.
- Aim for under 200 lines. Length costs adherence far more than it costs money.
- Put procedures in skills, scoped rules in `.claude/rules/`, and must-happen actions in hooks. CLAUDE.md is advice.
- Reference big files by path; `@` imports load at launch and do not save context.
- Edits apply on the next `/clear`, `/compact` or restart, so test changes in a fresh session.

Why the file is cheap to hold in a long session, and what does break the cache, is covered in [Prompt caching for coding agents](/blog/prompt-caching-for-coding-agents-stable-context).
