---
title: "Claude Code for a solo engineer: the workflow that shipped this site"
description: "How this portfolio was built with Claude Code: the plan and task files, per-section commits, the impeccable plugin, and what the repo shows did and did not work."
date: 2026-10-10T02:32:00Z
tags: ["Claude Code", "workflow", "Astro", "impeccable", "solo engineer"]
pillar: building
sources:
  - title: "Claude Code docs: overview"
    url: "https://code.claude.com/docs/en/overview"
  - title: "Claude Code docs: best practices (verify, plan, manage context)"
    url: "https://code.claude.com/docs/en/best-practices"
  - title: "Claude Code docs: how Claude remembers your project"
    url: "https://code.claude.com/docs/en/memory"
  - title: "Claude Code docs: plugins overview"
    url: "https://code.claude.com/docs/en/plugins/overview"
  - title: "PageSpeed Insights report for this site, mobile, 10 October 2026"
    url: "https://pagespeed.web.dev/analysis/https-mk-comics-vercel-app/n4nizifj0c?form_factor=mobile"
draft: false
---

This site is built with Astro 7, Tailwind v4, GSAP and Lenis, deployed on Vercel, and written with Claude Code. I am not going to reconstruct my prompts, because I would be inventing them. The repo records what I decided and when, and that is a better account of the workflow: 57 commits, a plan, a task list, two contract files and a trail of things I tried and threw away. Here is what that evidence shows worked, what did not, and where the Claude Code docs back it up.

## What does the workflow look like in the repo?

Five artifacts carry it, and each has one job.

| File | Job |
|---|---|
| `PRODUCT.md` | Who the site is for, positioning, constraints, and "Brand Commitments", the list of directions I rejected |
| `tasks/plan.md` | Architecture decisions, a phased task list with checkpoints, a risks table |
| `tasks/todo.md` | One entry per task: acceptance criteria, verification, dependencies, scope |
| `DESIGN.md` | Colour tokens and type for the comic world |
| `.impeccable/` | The design contract for the page, plus detector config and its recorded exceptions |

The task entries are the part worth copying. This is Task 1 from `tasks/todo.md`, trimmed:

```markdown
## Task 1: Initialise repo and Astro + Tailwind v4 + Vercel scaffold

**Acceptance criteria:**
- [x] `git init` done, `.gitignore` covers node_modules, dist, .vercel, .env*
- [x] `src/pages/index.astro` renders a placeholder with the Tailwind utility working

**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Type check: `npx astro check`

**Dependencies:** None
**Estimated scope:** S
```

Every criterion is something a command can answer. That matches the first recommendation on the best-practices page: "Give Claude a way to verify its work", with a test, a build or a screenshot, so you are not the verification loop.

## Why write the plan down for an agent?

Because a session does not remember. The memory docs open with it: "Each Claude Code session begins with a fresh context window", and CLAUDE.md files and auto memory are the two mechanisms that carry knowledge across. The best-practices page adds the constraint behind most of its advice, that the context window fills fast and performance degrades as it fills. Files in the repo are the cheapest persistent memory there is.

The same page recommends separating exploration and planning from implementation, with four phases: explore, plan, implement, commit. It also says when to skip the ceremony: "If you could describe the diff in one sentence, skip the plan." `tasks/plan.md` is the written artifact of that loop for the big decisions, such as the stack and the page's structure. It includes a risks table with lines like "Signature animation becomes 'everything animates'", each paired with a mitigation. Small changes, like the section polish commits, do not need a plan.

## What worked?

**Checks the machine can run.** The plan's verification stack is `astro check`, `astro build`, a Playwright smoke test and an accessibility pass. Task entries name the build and type-check commands. Nothing was "done" because a diff looked right.

**Small slices and git as the undo.** The history reads like a list of sections: `Comic: polish Cover`, `Numbers`, `Resume`, `Contact`, `Case files`, `Nine witnesses` and so on, twelve in all. The docs warn that checkpoints are not "a replacement for git", and the log shows why. One scrolling experiment landed as `Comic: read-like-a-strip scrolling` and was undone in a later commit titled `Revert "Comic: read-like-a-strip scrolling"`. A Stranger Things variant at `/hawkins` was added and removed a few commits later. `PRODUCT.md` notes that removed work is "recoverable from git history".

**Writing exceptions down with a reason.** The impeccable plugin has a detector, and `.impeccable/config.json` holds one ignored value: the `design-system-font` rule on `src/pages/blog/og/[slug].png.ts`, with the reason recorded as a satori font alias for the text face. A suppressed warning with no explanation is how checks rot. This one explains itself.

**Recording what I rejected.** `PRODUCT.md`'s Brand Commitments names the directions that did not land: paper and serif document worlds, bento widget grids and a quiet logbook world. A future session reads that and does not propose them again.

## What did not work?

**Generating options before choosing a direction.** The commit messages record five dark-tech variants, ten story-world variants and six dream-world variants, then three "finals", then the Hawkins experiment. `tasks/plan.md` opens with the earlier verdict: the first direction was built through Phase 2 and "rejected as too plain", and five dark variants were then "rejected as generic". An agent makes options cheap, but judging them is not cheap. The fix is the one `PRODUCT.md` now embodies: write what you reject before you generate, not after.

**A target I did not measure until the end.** `PRODUCT.md` sets a Lighthouse target of 100 and records an earlier build at mobile 94 and desktop 96. On 10 October I ran PageSpeed on the current home page and got [mobile 68 and desktop 88](https://pagespeed.web.dev/analysis/https-mk-comics-vercel-app/n4nizifj0c?form_factor=mobile). Those are different builds, so it is not a regression, but it is a miss against the target. `tasks/todo.md` explains why the check came late: Lighthouse runs through PageSpeed Insights after deploy, so it was a manual step at the end rather than a gate. In `plan.md` the "Checkpoint: Complete" line for 100/100/100/100 on the deployed URL is still unchecked.

**Project context that does not load itself.** This repo has no `CLAUDE.md`. The rule "read PRODUCT.md and the plan before touching UI" is a sentence at the top of `tasks/todo.md`, which a session only sees if something points it there. The docs say CLAUDE.md is read "at the start of every session" and that `@path` imports expand at launch. I should have had a short one that imports the contract files. The next post covers what goes in it.

## What does the impeccable plugin add?

The Claude Code docs define a plugin as "a directory of skills, agents, hooks, MCP servers, or other components" installed as one unit, usually from a marketplace via `/plugin`. Impeccable is one. Its own skill description lists verbs such as design, critique, audit and polish, and it ships subagents, among them a finish reviewer and a documenter. `tasks/plan.md` names those two in Phase 4: a reviewer that judges the finished build against its contract, and a documenter that writes `DESIGN.md` from what shipped, not from intentions. I will not describe more of its internals than the repo shows.

One cost to know: the plugin docs say an enabled plugin's skill and agent descriptions are in context on every turn, even in sessions that never use them.

## Hands-on: the loop I would reuse

1. Write the contract first: audience, constraints, and a list of what you reject. One page.
2. Plan in a mode that cannot edit. The best-practices page gives `claude --permission-mode plan`, or `Shift+Tab` until the status bar shows plan mode.
3. Break the plan into tasks in the format above, each with a command that proves it.
4. One commit per slice. Treat `/rewind` as a convenience and git as the record.
5. Wire the final check as a gate, not a memory. The best-practices page describes a Stop hook that runs your check and "blocks the turn from ending until it passes"; I have not wired one into this repo.

```bash
claude --permission-mode plan      # explore and propose, no edits
# then, per task:
npm run build && npx astro check   # the two checks Task 1 names
git add -A && git commit -m "<one slice, named like the section>"
```

## Takeaways

- Put the plan, the constraints and the rejected directions in files. A session starts fresh, and files are the memory.
- Write acceptance criteria as commands. If you cannot run it, it is not a criterion.
- Commit per slice. The history is the undo button, and it is also the honest record of what you tried.
- Decide what you reject before you ask an agent for variants. Mine took twenty-odd options to teach me that.
- Make your numeric targets a gate that runs on every deploy, not a number you check once at the end.

The file that should have loaded all of this automatically is the subject of [Writing a CLAUDE.md that actually helps](/blog/writing-a-claude-md-that-actually-helps).
