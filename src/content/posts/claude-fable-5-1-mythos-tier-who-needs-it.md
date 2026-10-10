---
title: "Claude Fable 5.1 and the Mythos tier: who needs a $50-per-million model"
description: "Fable 5.1 costs $10 in and $50 out per million tokens, 2.5x Opus 5.5. Where the premium can pay, how cached agent loops price out, and who can use Mythos 5.1."
date: 2026-10-10T01:15:00Z
tags: ["Claude Fable 5.1", "Claude Mythos", "Claude Opus 5.5", "LLM pricing", "agents"]
pillar: model-watch
sources:
  - title: "Claude Platform release notes (Fable 5.1 and Mythos 5.1, 1 September 2026)"
    url: "https://platform.claude.com/docs/en/release-notes/overview"
  - title: "Claude docs: pricing (model table, cache multipliers, batch)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: models overview (comparison, latency, default effort)"
    url: "https://platform.claude.com/docs/en/about-claude/models/overview"
  - title: "Anthropic: Claude Fable (versions, safeguards, pricing)"
    url: "https://www.anthropic.com/claude/fable"
  - title: "Anthropic: Introducing Claude Opus 5.5 (comparison with Fable 5.1)"
    url: "https://www.anthropic.com/claude-opus-5-5"
  - title: "Claude docs: rate limits (per-model ITPM and OTPM by tier)"
    url: "https://platform.claude.com/docs/en/api/rate-limits"
  - title: "Claude Help Center: Cyber Verification Program and Mythos access"
    url: "https://support.claude.com/en/articles/14604842"
  - title: "Wikipedia: Claude Mythos (access timeline, secondary)"
    url: "https://en.wikipedia.org/wiki/Claude_Mythos"
draft: false
---

As of 10 October 2026, Claude Fable 5.1 is the most expensive generally available model Anthropic sells: $10 per million input tokens and $50 per million output tokens, against $4 and $20 for Opus 5.5. Anthropic's own docs tell you to start with Opus 5.5 for most work. This post is about the narrow set of cases where paying 2.5x on output can make sense, and who can reach Mythos 5.1 at all.

## What shipped on 1 September?

The release notes for 1 September 2026 announce Claude Fable 5.1 (`claude-fable-5-1`), "the successor to Claude Fable 5 for long-running agentic coding, knowledge work, and research", alongside Claude Mythos 5.1 (`claude-mythos-5-1`) for Project Glasswing participants. Both have a 1M-token context window by default, 128k max output tokens and always-on adaptive thinking.

The headline price is unchanged from Fable 5, "$10 / $50 USD per MTok", but cache reads were cut to $0.25 per million tokens. That is 0.025x the base input price, against 0.1x on most other models. Cache writes are unchanged: $12.50 for the five-minute cache, $20 for the one-hour cache. The Fable page adds Anthropic's own estimate that typical workloads get about 25% cheaper than on Fable 5, and highly agentic ones up to about 45%. Treat that as a vendor estimate against the previous Fable, not against Opus.

Fable 5 launched on 9 June. Access was interrupted on 12 June and restored on 1 July; the release notes record the restoration but not the reason. Wikipedia's Claude Mythos article, a secondary source citing CNBC, says a US government letter prompted the interruption. Anthropic's own account of that episode is in the previous post in this series.

## What does it cost against the rest of the line-up?

All figures USD per million tokens from the pricing page.

| Model | Base input | Cache read | Output | Latency (Anthropic's label) |
|---|---|---|---|---|
| Fable 5.1 | $10 | $0.25 | $50 | Slower |
| Opus 5.5 | $4 | $0.20 | $20 | Moderate |
| Sonnet 5.5 | $2 | $0.10 | $10 | Fast |

Two things in that table are easy to miss. First, once content is cached, the input gap almost closes: $0.25 against $0.20 per million. Fable's premium is therefore mostly an output premium, 2.5x, plus a 2.5x premium on any uncached input. Second, batch processing takes 50% off both input and output, which puts Fable at $5 and $25 for work that can wait.

## When is it worth the premium?

The models overview is direct. Start with Opus 5.5 for most workloads; use Fable 5.1 "for demanding reasoning and long-horizon agentic work, or when your evals on Claude Opus 5.5 at higher effort still fall short." That last clause is the test: Fable is what you reach for after Opus has failed your own evals, not before.

Anthropic's Opus 5.5 announcement says that model "performs at the level of Claude Fable 5.1 on most work", that its benchmark table has Opus ahead on every listed test, and that the real-world gap "is narrower than these scores suggest". Its one head-to-head cost example is a HAProxy C-to-Rust migration where Opus 5.5 finished in 9.5 hours against 12 for Fable 5.1, at 51% lower cost. That is a vendor-chosen example, so I would not generalise it, but it shows which way Anthropic expects the default to lean. I am not reproducing the benchmark tables here, and I would not rely on them for a purchase decision; run your own tasks.

Where I would still test Fable 5.1:

- Long-horizon agent runs where Opus 5.5 stalls, loops or needs repeated human rescue. A failed run costs your time as well as tokens.
- Tasks with an expensive downstream cost of error, where a higher first-pass success rate is worth more than the token bill.
- Work you can batch, since the 50% discount cuts the premium to a margin you can justify.

Where I would not: classification, extraction, routing, anything high-volume. Anthropic positions Haiku 5.5 for those, and Sonnet 5.5 for the middle.

## What does a cached agent loop cost?

A design calculation, with simplifications stated. A coding agent runs 40 turns. It carries a 150,000-token stable prefix (tools, repository context) cached once at turn 1. Each turn adds 2,000 new input tokens and produces 1,500 output tokens. I bill the new tokens at the base input rate and ignore the growing history, which keeps the arithmetic honest but slightly understates all three models.

| | Fable 5.1 | Opus 5.5 | Sonnet 5.5 |
|---|---|---|---|
| Cache write, 150k once | $1.875 | $0.750 | $0.375 |
| Cache reads, 39 x 150k | $1.463 | $1.170 | $0.585 |
| New input, 40 x 2k | $0.800 | $0.320 | $0.160 |
| Output, 40 x 1.5k | $3.000 | $1.200 | $0.600 |
| Total, one run | $7.14 | $3.44 | $1.72 |

Fable costs about 2.07x Opus 5.5 per run. The total is dominated by output, as predicted. And the break-even is blunt: with these numbers Fable's cost is roughly $1.84 plus $0.13 per turn, so it matches Opus's $3.44 at about 12 turns. If Fable finishes the job in under a third of the turns Opus needs, it is cheaper; if it finishes in two thirds, it is not. Only your own traces can tell you which side you are on.

## What are the practical constraints?

Read these before you put Fable 5.1 in a pipeline.

- **Retention.** Like Fable 5, both new models "require 30-day data retention and aren't available under zero data retention unless expressly authorized by Anthropic". If your customers' contracts say no retention, this decides the question.
- **Rate limits.** At the Start tier the rate-limits page lists Fable 5.x at 500,000 input tokens per minute and 100,000 output, against 2,000,000 and 400,000 for Opus 5.5. The limit is shared across Fable 5.1 and Fable 5. Cache reads do not count towards input limits on most models, but cache writes do, so a 150k-token write is 30% of that Start-tier minute.
- **API shape.** `tool_choice` types `any` and `tool` return a 400 on Fable 5.1, and also on Opus 5.5; use strict tool use or structured outputs instead. Thinking cannot be disabled.
- **Safeguards.** Per the Fable page, flagged cybersecurity and biology requests are routed to less capable models and are not billed at Fable prices; security teams can apply to the Cyber Verification Program. The Fable 5 release notes document `stop_reason: "refusal"` when a classifier declines.

## Who can use Mythos 5.1?

Not most of us. The pricing page marks Mythos 5.1 "limited availability" at the same $10 and $50. The Help Center article describes the Cyber Verification Program as having three access tiers that include Mythos 5.1, with the most restricted, Specialized Access, reviewed "in depth in collaboration with the US government". Individuals can apply only for Defense Access. Wikipedia adds, as secondary reporting citing Anthropic, that Mythos 5.1 went to approved users on 6 October.

The practical advice is dull. If your work is defensive security, apply and read the eligibility rules, including the 15 December 2026 change to phishing-resistant authentication for Defense Access. Everyone else should treat Mythos as a model they will not be building on.

## Hands-on: price a run from the usage block

```python
import anthropic

client = anthropic.Anthropic()

PRICES = {  # USD per million tokens, from the pricing page
    "claude-fable-5-1": dict(base=10.00, write=12.50, read=0.25, out=50.00),
    "claude-opus-5-5":  dict(base=4.00,  write=5.00,  read=0.20, out=20.00),
}

def run(model, context_doc, task):
    r = client.messages.create(
        model=model,                      # do not pass thinking or tool_choice any/tool
        max_tokens=4000,
        system=[{"type": "text", "text": context_doc,
                 "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": task}],
    )
    if r.stop_reason == "refusal":        # documented for Fable 5; check the docs for 5.1
        raise RuntimeError("declined by a classifier")
    u, p = r.usage, PRICES[model]
    usd = (u.input_tokens * p["base"] + u.cache_creation_input_tokens * p["write"]
           + u.cache_read_input_tokens * p["read"] + u.output_tokens * p["out"]) / 1e6
    return r, usd
```

Run the same ten hard tasks through both models, log `usd` and whether the result passed your check, and compare cost per passing task rather than cost per call.

## Takeaways

- Fable 5.1 is $10 and $50; Opus 5.5 is $4 and $20. Cached, the input prices are close ($0.25 against $0.20), so the premium is mostly output.
- Anthropic's own guidance is to start on Opus 5.5 and move up only when your evals at higher effort still fail.
- On my 40-turn calculation Fable costs about 2.07x Opus per run, and needs to finish in roughly a third of the turns to break even.
- Check the non-price constraints first: 30-day retention, lower Start-tier rate limits, and routed or refused requests in security and biology.
- Mythos 5.1 is a verification-programme model; plan as if you will never have it.

Next, I look at what changes when a 1M-token window is the default and retrieval stops being the obvious choice.
