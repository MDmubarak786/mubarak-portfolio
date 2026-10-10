---
title: "Opus 5.5 on a legacy codebase: what it handles, where it needs a human"
description: "Anthropic and early testers report Opus 5.5 running audits and migrations for hours. What is reported, what is unverified, and a review discipline for legacy code."
date: 2026-10-10T02:35:00Z
tags: ["Claude Opus 5.5", "legacy code", "coding agents", "code migration", "code review", "agentic workflows"]
pillar: building
sources:
  - title: "Anthropic: Introducing Claude Opus 5.5 (announcement; vendor-reported tester examples)"
    url: "https://www.anthropic.com/claude-opus-5-5"
  - title: "Yahoo Finance / Forkast News: Anthropic's Claude 5.5 release (secondary coverage)"
    url: "https://finance.yahoo.com/technology/ai/articles/anthropic-claude-5-5-release-185148663.html"
  - title: "Claude docs: Claude Opus 5.5 model overview (ID, limits, pricing, default effort)"
    url: "https://platform.claude.com/docs/en/models/opus-5-5/overview"
  - title: "Claude docs: Prompting Claude Opus 5.5 (unattended runs, effort, subagents)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5"
  - title: "Claude docs: Effort (levels, output_config.effort, cache behaviour)"
    url: "https://platform.claude.com/docs/en/build-with-claude/effort"
  - title: "Claude Platform release notes (Opus 5.5 launch, compaction, API changes)"
    url: "https://platform.claude.com/docs/en/release-notes/overview"
  - title: "claude.dev blog: Getting the most out of Opus 5.5 (publisher not named on the page)"
    url: "https://claude.dev/blog/getting-the-most-out-of-opus-5-5/"
  - title: "Martin Fowler: Strangler Fig Application"
    url: "https://martinfowler.com/bliki/StranglerFigApplication.html"
draft: false
---

Claude Opus 5.5 launched on 22 September 2026 with a set of long-run results that read like a migration plan: a 680,000-line migration in under a day, an 18-hour unattended run across six repositories. As of 10 October 2026 every one of those numbers is a vendor-reported example, none is an independent measurement, and none was run on your codebase. This post separates what is reported from what you should assume, then gives a review discipline for pointing the model at legacy code.

## What has been reported about Opus 5.5 on long codebase work?

Everything below comes from Anthropic's announcement, which attributes most of it to early testers, and from secondary coverage that repeats it. I have not reproduced any of it.

- **Migration:** one early tester completed a 680,000-line code migration in less than a day, work the announcement says would have taken an engineering team weeks.
- **Audit and fix:** an early tester audited and fixed a 200,000-line codebase in under three hours. On the same job Opus 5 took over 20 hours and used 2.5 times the tokens.
- **Language port:** in an Anthropic internal test, translating HAProxy from C to Rust took Opus 5.5 9.5 hours against 12 for Fable 5.1, at 51% lower cost. Both passed nearly all of HAProxy's regression tests.
- **Unattended run:** a Clio staff developer ran it overnight across six repositories; it stayed on task for over 18 hours.
- **Stacked rebase:** a Stripe staff engineer used one session that directed a dozen more through a multi-day rebase of 40 stacked pull requests. All 40 passed CI the next afternoon.

Two cautions from the sources themselves. Yahoo Finance's coverage (Forkast News, 23 September) calls the HAProxy result a "51% improvement" in time, which does not compute: 9.5 hours against 12 is about 21% less time, and Anthropic's own page attaches the 51% to cost. And Anthropic says benchmark margins are a less reliable guide to real-world differences at this capability level, and that in its own use the gap between Opus 5.5 and Fable 5.1 is narrower than the scores suggest. The announcement does not address legacy codebases specifically beyond these examples.

What the examples have in common is a strong external oracle: HAProxy's regression suite, CI on 40 pull requests. Hold that thought.

## What is Opus 5.5, in API terms?

From the docs, not the coverage:

| Item | Value |
|---|---|
| Model ID | `claude-opus-5-5` |
| Released | 22 September 2026 |
| Context / max output | 1M tokens / 128K tokens |
| Price per million tokens | $4 input, $20 output, $0.20 cache read |
| Default effort | `medium` |
| Thinking | Adaptive, always on; `thinking: {"type": "disabled"}` returns a 400 |

Two details matter for long runs. Effort is now the main dial: the docs list `low`, `medium`, `high`, `xhigh` and `max`, and describe `xhigh` as for long-running agentic and coding tasks over 30 minutes with token budgets in the millions. Anthropic's prompting guide says Opus 5.5 at `medium` matched or beat Opus 5 at `high` on such tasks, and tells you to sweep effort on your own evals rather than carry settings over. Second, changing the top-level effort value between requests invalidates the prompt cache, so pick one for a run. The release notes also list on-demand compaction (beta header `compact-2026-09-04`; check the docs for the exact parameter) as a way to keep a long run inside its window.

## Where does a legacy migration still need a human?

Legacy code differs from a greenfield task in one way that matters: the behaviour is the specification, and nobody wrote it down. The HAProxy port worked as a benchmark because the regression tests encode that behaviour. Most legacy systems have no such oracle. The model can make the tests you give it pass, and it can write more tests, but a test the agent wrote against the code the agent wrote proves consistency, not correctness.

My argument is that four decisions stay with a person:

1. **What the old system is supposed to do.** Which odd behaviours are bugs and which are load-bearing. Martin Fowler's strangler fig pattern is the usual answer: replace the system gradually, part by part, instead of in one cutover. I would add that deep behaviour is hard to specify and much of it isn't wanted, so a migration is a list of those judgement calls.
2. **What to delete.** An agent will happily preserve everything. Retiring a code path is a business decision with a rollback story.
3. **Anything irreversible or outside the repository.** Data deletion, force-pushes, production config. Anthropic's prompting guide says to keep your own confirmation step for risky or irreversible actions, and the claude.dev guide says to keep permission prompts on for destructive commands.
4. **When "done" is done.** The prompting guide warns that a text-only end of turn is a report, not proof the task is finished, and suggests a checklist the model updates rather than trusting a summary.

The nearest first-hand case I have is replacing a licensed TIBCO Scribe pipeline with AWS Glue before the contract ended, which took the cost from $24,000 to $840 a year, a 96.5% cut. The headline of that project is a cost number. The work behind any replacement like it is working out what the old system did that people still depend on, and no test suite hands you that.

## Hands-on: a review discipline for agent-led migrations

Five rules, in order.

1. **Freeze behaviour before touching code.** Record inputs and outputs from the legacy system (golden files, captured API responses) and have a human skim the list. This becomes the oracle.
2. **Cut at seams, one unit per task.** Fowler's approach is to break the system into parts you can replace one at a time. The claude.dev guide suggests one subagent per service and a closing table of service, affected yes or no, and evidence. Check the evidence before you accept a report.
3. **Keep state in a file, not the scrollback.** A `TASKS.md` the agent ticks off survives context compaction and tells you where the run is.
4. **Cap automatic continuation.** The prompting guide suggests stopping after two or three automatic nudges so a stuck run ends and gets reviewed.
5. **Review the diff for merge blockers only**, and make the agent mark what it could not confirm.

Rules 3 and 4 as a harness. Streaming is needed at this output size; confirm helper names against the SDK docs for your language:

```python
import pathlib
import anthropic

client = anthropic.Anthropic()
TASKS = pathlib.Path("TASKS.md")
MAX_NUDGES = 3

def open_items() -> list[str]:
    return [l for l in TASKS.read_text().splitlines() if l.startswith("- [ ]")]

def run(system: str, messages: list, tools: list, run_tools):
    nudges = 0
    while True:
        with client.messages.stream(
            model="claude-opus-5-5",
            max_tokens=128_000,
            output_config={"effort": "xhigh"},   # set once; changing it breaks the cache
            system=system,
            tools=tools,
            messages=messages,
        ) as stream:
            msg = stream.get_final_message()
        messages.append({"role": "assistant", "content": msg.content})

        if msg.stop_reason == "tool_use":
            messages.append({"role": "user", "content": run_tools(msg)})  # your executor
            continue

        # Text-only end of turn is a report, not proof of completion.
        left = open_items()
        if not left or nudges >= MAX_NUDGES:
            return msg, left          # hand the open items to a human
        nudges += 1
        messages.append({"role": "user", "content": (
            "Your task list still has open items:\n" + "\n".join(left) +
            "\nContinue with them. If one is blocked, say what is blocking it."
        )})
```

The system prompt carries the stop rules. Mine would read: keep going when a step needs nothing from me; put status notes in the same message as the next action; stop and ask before deleting data, force-pushing, or changing anything outside this repository; keep the checklist in `TASKS.md`. Put it in from the first request, because the docs warn that adding system text mid-session invalidates earlier thinking blocks.

## Takeaways

- The Opus 5.5 long-run numbers are vendor-reported tester examples, repeated by secondary outlets; treat them as proof of possibility, not a forecast.
- The reported wins had strong oracles, a regression suite or CI. Build that oracle before you start a migration.
- Use `claude-opus-5-5` with one fixed effort level per run, `xhigh` for work over 30 minutes, and a large `max_tokens`.
- Humans decide what the old system must do, what to delete, and anything irreversible; the agent does the volume.
- Treat a text-only end of turn as a report, track work in a file, and cap automatic continuations.

For a migration where the deciding was the hard part, see the TIBCO to AWS Glue case file, and for packaging checks like these so every repo gets them, [skills and plugins for coding agents](/blog/skills-and-plugins-for-coding-agents).
