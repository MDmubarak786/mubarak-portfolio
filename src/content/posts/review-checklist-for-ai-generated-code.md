---
title: "A code review checklist for AI-generated pull requests"
description: "What to check when the author is an agent: a nine-point review checklist, the published numbers on AI-written code, and a REVIEW.md you can copy."
date: 2026-10-10T02:24:00Z
tags: ["code review", "AI-generated code", "Claude Code", "pull requests", "REVIEW.md"]
pillar: building
sources:
  - title: "Claude Code docs: overview"
    url: "https://code.claude.com/docs/en/overview"
  - title: "Claude Code docs: Code Review (severity levels, REVIEW.md, pricing, local /code-review)"
    url: "https://code.claude.com/docs/en/code-review"
  - title: "Claude Code docs: best practices (verification, adversarial review, failure patterns)"
    url: "https://code.claude.com/docs/en/best-practices"
  - title: "CodeRabbit: AI code creates 1.7x more problems (vendor report, 470 PRs)"
    url: "https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report"
  - title: "Veracode: 2025 GenAI Code Security Report press release (vendor report)"
    url: "https://www.veracode.com/press-release/ai-generated-code-poses-major-security-risks-in-nearly-half-of-all-development-tasks-veracode-research-reveals/"
draft: false
---

An agent can open a pull request in minutes, and the diff often looks tidy. That is the problem: a plausible diff lowers your guard, and the review is now the only place a wrong assumption gets caught. At Incresco I reviewed 37% of the organisation's pull requests, 1,300+ of them. This post is that review habit rewritten for the case where the author is an agent.

One caveat first. My review history is about reviewing, not about who wrote the code, so the numbers on agent output below come from published reports, and I name them as such. This site is built with Claude Code, so I read agent diffs too. The checklist is how.

## What does the data say about AI-written code?

Two vendor reports are worth knowing, with their limits stated.

CodeRabbit, which sells an AI review product, compared 470 open-source GitHub pull requests: 320 labelled AI co-authored and 150 apparently human-only. It reports 10.83 issues per AI PR against 6.45 per human PR, about 1.7x. Logic and correctness issues were 75% more common, readability issues more than 3x, error-handling gaps nearly 2x, and security issues up to 2.74x. The authorship labels were inferred, and the post says it "cannot guarantee" every human-labelled PR was purely human. Its framing is also worth keeping: no issue category was unique to AI. Agents make the usual mistakes more often.

Veracode, which sells application security tooling, gave more than 100 models 80 curated coding tasks. It reports that AI-generated code introduced security vulnerabilities in 45% of cases, with cross-site scripting unsecured in 86% of relevant samples and log injection in 88%. Its researchers say models are "getting better at coding accurately but are not improving at security", and that larger models did not do significantly better. That figure is a share of tasks built around known weakness types, not a production failure rate.

Neither report says "do not use agents". Both say the review stage needs to be sharper than it was.

## How should a review of an agent's PR differ?

Three things change, and none are about the code's style.

**The author is not tired and not unsure.** A human who is guessing usually leaves a trace: a TODO, a hedge in the description, a smaller diff. An agent writes confident, finished-looking code whether or not it understood the requirement. Anthropic's best-practices page names this the trust-then-verify gap: "Claude produces a plausible-looking implementation that doesn't handle edge cases." Its fix is blunt: "If you can't verify it, don't ship it."

**The diff can be large and fast.** Review effort per line stays constant while lines per hour goes up. Cap PR size and ask for splits.

**The author cannot be interviewed.** A colleague can explain why. The agent can only generate a fresh explanation. Judge the code and the evidence, not the narrative.

## The checklist

I would run these nine checks in this order. The first three take two minutes and reject a lot of PRs before the deep read.

1. **Does the description match the diff?** Read the claim, then list the files touched. Anything outside the task's scope gets questioned. Best practices suggests asking a reviewer to confirm "nothing outside the task's scope changed".
2. **Is there evidence?** Test output, a command and its result, a screenshot. Anthropic's advice is to have the agent "show evidence rather than asserting success". No evidence, no review.
3. **Did the tests move?** Deleted assertions, loosened expectations, skipped cases, or snapshot updates are the first thing to read. A green suite that was edited to go green proves nothing.
4. **Error paths.** Empty input, a failed network call, a timeout, a partial write. CodeRabbit's error-handling number is the one I would act on first.
5. **Swallowed errors.** A `catch` that logs and continues, a default value that hides a failure. The docs say to address root causes: "don't suppress the error".
6. **Security-sensitive edges.** Anything that renders user input, builds a query or command, writes to logs, handles auth or touches secrets. Veracode's XSS and log-injection rates are the reason to read these lines slowly.
7. **Invented surface.** Imports that do not exist, methods that look right but are not in the library version you pin, new dependencies nobody asked for. Check the lockfile diff and open the docs for any API you do not recognise.
8. **Fit with the codebase.** A new helper that duplicates one that exists, a second way to do the same thing, naming that drifts from neighbours. CodeRabbit lists naming inconsistencies at nearly 2x; this is the cheapest class to catch and the most expensive to leave.
9. **Size of the abstraction.** Extra layers, configuration for cases that cannot occur, defensive branches with no test. The best-practices page warns that chasing every reviewer finding "leads to over-engineering", which cuts both ways: it applies to your own review comments too.

I would not argue about formatting in an agent PR. A formatter and a lint hook settle that deterministically, and the docs make the same distinction: CLAUDE.md is advisory, hooks "guarantee the action happens".

## Can a second agent do the first pass?

Yes, as a filter and not a gate. The Code Review feature posts inline comments tagged Important, Nit or Pre-existing, and the docs say findings "don't approve or block your PR". It runs several agents in parallel and then a verification step "checks candidates against actual code behavior to filter out false positives". Per the docs it is a research preview for Team and Enterprise plans, takes 20 minutes on average and costs $15 to $25 per review on average, so on a busy repository you will want the manual trigger.

On other plans, or before you push, the docs describe a local `/code-review` command that reviews your branch's commits plus uncommitted changes in a background subagent. Best practices adds the reason a fresh context helps: it "won't be biased toward code it just wrote".

The rule I would set: the machine review runs first, its findings get read before the diff, and a human still owns the merge.

## Hands-on: make the checklist enforceable

Put the repeatable parts into `REVIEW.md` at the repository root. The docs describe it as review-only instructions and suggest tuning severity, nit volume, skip rules, repo-specific checks and a verification bar. This is adapted from the docs' own example for a service that takes agent PRs:

```markdown
# Review instructions

## What Important means here
Reserve Important for behaviour that breaks, leaks data, or blocks a rollback:
incorrect logic, swallowed errors on write paths, unscoped queries, user input
rendered or logged without encoding, migrations that are not backward compatible.

## Verification bar
Behaviour claims need a file:line citation in the source, not an inference
from naming.

## Always check
- Tests: report any deleted or loosened assertion in the diff
- New dependencies: name each one and why it is needed
- New helpers: say if an equivalent already exists in the repo
- Files changed outside the area named in the PR description

## Cap the nits
At most five Nits per review; summarise the rest as a count.

## Do not report
Anything CI already enforces: lint, formatting, type errors.
```

Then add a short block to the PR template so the author, human or agent, has to answer before review starts:

```markdown
## Evidence
- [ ] Command run and result pasted (tests, build, or screenshot)
- [ ] Files outside the stated scope: none / listed below
- [ ] New dependencies: none / listed below
```

For merge gating, the docs note the check run "always completes with a neutral conclusion", so if you want findings to block merges you must read the severity counts from the check run output in your own CI. Check the docs for the exact parsing step before you rely on it.

## Takeaways

- Treat a tidy agent diff as unverified. Start with the evidence, not the code.
- Read test changes before source changes. An edited test is the cheapest way for a PR to look green.
- Spend slow attention on error paths, swallowed errors, input handling and invented APIs; the published numbers point there.
- Let a second agent filter and a formatter hook handle style; keep the human on correctness and merge.
- Write the repeatable checks into `REVIEW.md` and the PR template, so they stop depending on who reviews.

For automation that people lean on every day, see the case file on the [Chrome extensions](/#file-adr-008-chrome-extensions) that saved admins 3 to 5 hours a day.
