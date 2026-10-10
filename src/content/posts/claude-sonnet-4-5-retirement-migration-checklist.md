---
title: "Claude Sonnet 4.5 retires on 30 November 2026: a migration checklist"
description: "claude-sonnet-4-5-20250929 retires on 30 November 2026. The settings that now return a 400 on Sonnet 5.5, the cost delta, and how to test before the date."
date: 2026-10-10T01:06:00Z
tags: ["Claude Sonnet 4.5", "Claude Sonnet 5.5", "deprecation", "migration", "LLM pricing"]
pillar: model-watch
sources:
  - title: "Claude docs: model deprecations (Sonnet 4.5 entry, retirement table)"
    url: "https://platform.claude.com/docs/en/about-claude/model-deprecations"
  - title: "Claude Platform release notes (deprecation notice, 30 September 2026)"
    url: "https://platform.claude.com/docs/en/release-notes/overview"
  - title: "Claude docs: Sonnet 5.5 migration guide (checklist for Sonnet 4.5)"
    url: "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide"
  - title: "Claude docs: pricing (Sonnet 4.5 and Sonnet 5.5 rows, tokenizer note)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: prompt caching (minimum cacheable length per model)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: models overview (Sonnet 5.5 limits and default effort)"
    url: "https://platform.claude.com/docs/en/about-claude/models/overview"
draft: false
---

As of 10 October 2026, Claude Sonnet 4.5 has 51 days left on the Claude API. Anthropic notified developers on 30 September that `claude-sonnet-4-5-20250929` retires on 30 November 2026, and the recommended replacement is `claude-sonnet-5-5`. The new model is cheaper per token, but a drop-in swap will fail on several settings that Sonnet 4.5 accepted, and it changes how much you pay in less obvious ways.

## What exactly is being retired, and when?

The deprecations page lists `claude-sonnet-4-5-20250929` as Deprecated, with a deprecation date of 30 September 2026 and a retirement date of 30 November 2026. The recommended replacement is `claude-sonnet-5-5`. The page is plain about the consequence: "Requests to models past the retirement date will fail." It also promises at least 60 days' notice before retirement for publicly released models; this notice gave 61.

Three scope notes. The dates apply to the Claude API, Claude Platform on AWS and Microsoft Foundry. Amazon Bedrock and Google Cloud set their own schedules, so check their model tables. The same page lists the Console route to find stragglers: Usage, then Export, which gives a CSV by API key and model. And the neighbouring dates are tentative: Opus 4.5 is "not sooner than November 24, 2026", and Haiku 4.5 is "not sooner than October 15, 2026".

Sonnet 4.6 is listed as not sooner than 17 February 2027. I would not pick a stopgap destination just because its date is later; the deprecations page names Sonnet 5.5 as the target, and a second migration a few months later is the expensive option.

## What changes in price and limits?

| Per million tokens | Sonnet 4.5 | Sonnet 5.5 |
|---|---|---|
| Input | $3 | $2 |
| 5m cache write | $3.75 | $2.50 |
| 1h cache write | $6 | $4 |
| Cache read | $0.30 | $0.10 |
| Output | $15 | $10 |
| Minimum cacheable prompt | 1,024 tokens | 512 tokens |

Sonnet 5.5's cache reads are 0.05x base input; they were cut from $0.20 to $0.10 on 7 October, per the release notes. On context, the migration guide says Sonnet 5.5 "has a larger context window, with no beta header, and a higher output limit". The models overview lists 128k max output and a default effort of `high`.

The catch is in the pricing page's tokenizer note: models from 4.7 on use a newer tokenizer that produces "approximately 30% more tokens for the same text". The migration guide repeats it for Sonnet 5.5 against Sonnet 4.5. A 33% cut in price per token does not mean a 33% cut in cost.

## What breaks when you swap the model string?

The Sonnet 5.5 guide's checklist for a service on Sonnet 4.5 covers these:

- **Thinking is on by default.** Sonnet 4.5 ran without thinking unless you asked. A Sonnet 5.5 request with no `thinking` field runs adaptive thinking. Thinking tokens are billed as output and count toward `max_tokens`.
- **`thinking: {"type": "enabled", "budget_tokens": N}` returns a 400.** So does `thinking: {"type": "disabled"}`; the error tells you to send `{"type": "between_tools"}` instead. That setting is the lowest thinking level, is accepted at `high` effort or below, and returns a 400 at `xhigh` or `max`.
- **Prefill returns a 400.** The error reads "This model does not support assistant message prefill." Replace prefills with structured outputs, tools with enum fields, or instructions in the user turn.
- **Forced `tool_choice` returns a 400.** Use `auto` with strict tools or structured outputs.
- **Non-default `temperature`, `top_p`, `top_k` return a 400.** The deprecations page adds that the Python SDK from 1.0 removes these parameters, so passing them raises a `TypeError`.
- **Responses start with thinking blocks.** Read content by `type`, pass thinking blocks back unchanged, and set `display: "summarized"` if you show reasoning.
- **No effort parameter on 4.5.** Set `output_config.effort` explicitly; Sonnet 5.5's default is `high`.
- **Beta headers.** Remove `interleaved-thinking-2025-05-14` and any context-window header. Replace `fine-grained-tool-streaming-2025-05-14` with `eager_input_streaming: true`. Move `output_format` to `output_config.format`.
- **Tool input escaping can differ.** Parse tool `input` with a standard JSON parser.
- **Computer use.** `computer_20250124` is not accepted; on Bedrock use `computer_20251124`, elsewhere the toolset.
- **Refusals.** Handle `stop_reason: "refusal"` and configure fallback.

Images also cost more: Sonnet 5.5 uses the high-resolution tier, and the guide says a 2000×1500 image costs about 2.5 times as many tokens as on Sonnet 4.5.

## What it means for people shipping products

Test the cost, not just the correctness. A cheaper token, a longer tokenization and a model that now thinks by default pull in different directions, and which wins depends on your traffic shape. I would not forecast it from list prices. I would replay a few hundred real requests through both models and compare the `usage` block.

Here is an illustration with assumed numbers. A feature sends 3,000 input and 500 output tokens per call on Sonnet 4.5's tokenizer, with no thinking, at a million calls a month. On Sonnet 4.5: 3,000 × $3 plus 500 × $15 per million is $0.0165 a call, $16,500 a month. On Sonnet 5.5 the same text is about 3,900 input and 650 output tokens: 3,900 × $2 plus 650 × $10 is $0.0143 a call, $14,300 a month, about 13% less. Now let adaptive thinking add 500 output tokens a call. That is another $0.005, for $0.0193, or $19,300 a month, 17% more than before. The break-even is about 220 thinking tokens a call. The 30% and the 500 are assumptions; your numbers will differ.

The order I would work in: export usage by model from the Console, so you know every key and service still on the old ID; run the harness below on a few hundred real requests; move low-risk traffic first behind a flag; and keep the old ID only until the retirement date, because after it requests fail rather than fall back. Budget time for the 400s. They are quick to fix, but they surface one at a time, as each code path that sets a removed parameter gets exercised.

Cached prefixes fare better. A cached read costs $0.30 per million on Sonnet 4.5 and $0.10 on Sonnet 5.5; with 30% more tokens, the effective rate on the same text is about $0.13, still well under half. Prompts that were too short to cache can also cache now.

## Hands-on: a side-by-side harness

Run the same prompts through both models for a week before the cutover, and log cost per call:

```python
import anthropic

client = anthropic.Anthropic()
OLD, NEW = "claude-sonnet-4-5-20250929", "claude-sonnet-5-5"
PRICE = {OLD: (3.00, 15.00), NEW: (2.00, 10.00)}   # USD per million tokens: input, output

def run(model: str, prompt: str) -> dict:
    kwargs = dict(model=model, max_tokens=4096,
                  messages=[{"role": "user", "content": prompt}])
    if model == NEW:
        kwargs["output_config"] = {"effort": "medium"}       # set it: 4.5 had no effort
        kwargs["thinking"] = {"type": "between_tools"}       # closest to 4.5's no-thinking default
    r = client.messages.create(**kwargs)
    text = "".join(b.text for b in r.content if b.type == "text")
    pin, pout = PRICE[model]
    cost = (r.usage.input_tokens * pin + r.usage.output_tokens * pout) / 1_000_000
    return {"model": model, "text": text, "in": r.usage.input_tokens,
            "out": r.usage.output_tokens, "cost": cost}
```

Then run it a second time with `thinking` omitted on the new model, so you can see what adaptive thinking adds. This harness ignores cache fields; add `cache_read_input_tokens` and the cached-read price if your prefix is cached.

## Takeaways

- Sonnet 4.5 retires on the Claude API on 30 November 2026; the replacement is `claude-sonnet-5-5`. Bedrock and Google Cloud have their own dates.
- Prefill, forced `tool_choice`, thinking budgets, `thinking: disabled` and non-default sampling all return 400 on Sonnet 5.5.
- List price falls from $3 and $15 to $2 and $10, but the same text counts about 30% more tokens and thinking is on by default. Measure with the usage block.
- The cache minimum falls from 1,024 to 512 tokens and cache reads from $0.30 to $0.10 per million.
- Export your usage by model from the Console now, so nothing is still calling the old ID on 1 December.

If you also run Opus, the post "Claude Opus 5.5 breaking changes: thinking can't be disabled" covers the same family of errors for that tier.
