---
title: "Cost observability for LLM apps: log usage per request from day one"
description: "Usage fields differ across Claude, OpenAI and Gemini. Normalise them, price each call with a dated rate table, and send cost and cache hits to Datadog per feature."
date: 2026-10-10T01:47:00Z
tags: ["observability", "cost", "Datadog", "LLM pricing", "Claude API", "usage tracking"]
pillar: building
sources:
  - title: "Claude API reference: create a message (usage object)"
    url: "https://platform.claude.com/docs/en/api/messages/create"
  - title: "Claude docs: pricing (cache multipliers, batch, data residency, Haiku 5.5 tiers)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "OpenAI API reference: create a model response (usage object)"
    url: "https://developers.openai.com/api/reference/resources/responses/methods/create"
  - title: "OpenAI API pricing (GPT-6 family)"
    url: "https://developers.openai.com/api/docs/pricing"
  - title: "Gemini API docs: tokens (usage fields, count_tokens)"
    url: "https://ai.google.dev/gemini-api/docs/tokens"
  - title: "Gemini API pricing (3.8 Flash, effective dates)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Datadog docs: submitting metrics with DogStatsD (Python)"
    url: "https://docs.datadoghq.com/metrics/custom_metrics/dogstatsd_metrics_submission/"
  - title: "OpenAI docs: prompt caching (usage fields, write and read pricing)"
    url: "https://developers.openai.com/api/docs/guides/prompt-caching"
draft: false
---

Your provider's invoice tells you what you spent last month. It cannot tell you which feature, prompt version or customer spent it, and by the time it arrives the expensive deploy is three weeks old. The only fix is to record tokens and cost on every request, from the first request, in a shape that survives switching providers.

As of 10 October 2026, the three big APIs report usage in three different shapes, and each has at least one trap. This post lists the fields, the pricing rules that quietly break a cost function, and a normaliser that sends cost and cache hits to Datadog.

## What does each provider report per request?

All field names below come from the vendors' API references.

| | Claude (`usage`) | OpenAI Responses (`usage`) | Gemini Interactions (`usage`) |
|---|---|---|---|
| Fresh input | `input_tokens` | `input_tokens` | `total_input_tokens` |
| Cache read | `cache_read_input_tokens` | `input_tokens_details.cached_tokens` | `total_cached_tokens` |
| Cache write | `cache_creation_input_tokens`, split in `cache_creation.ephemeral_5m_input_tokens` and `ephemeral_1h_input_tokens` | `input_tokens_details.cache_write_tokens` | not on the pages I read |
| Output | `output_tokens` | `output_tokens` | `total_output_tokens` |
| Reasoning | `output_tokens_details.thinking_tokens` | `output_tokens_details.reasoning_tokens` | `total_thought_tokens` |
| Other | `server_tool_use`, `service_tier`, `inference_geo` | `total_tokens` | `total_tool_use_tokens`, `total_tokens` |

Three traps hide in that table.

**Claude's `input_tokens` excludes the cache.** The reference says "Total input tokens in a request is the summation of `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens`." If you read only `input_tokens` after turning caching on, your logged input will collapse and you will think costs fell.

**OpenAI describes cache fields as a breakdown.** `input_tokens_details` is "a detailed breakdown of the input tokens", so cached tokens appear to be a subset of `input_tokens`, not an addition. The opposite of Claude. Confirm with one test call before you subtract.

**Gemini's page does not say whether `total_input_tokens` includes cached tokens.** I could not settle it from the docs. Send the same long prompt twice, compare `total_input_tokens` and `total_cached_tokens`, and write the result into a unit test.

Reasoning tokens are billed as output on Claude and Gemini, and I did not confirm the OpenAI treatment on the pages I read, so check its pricing guide. Claude's reference says `output_tokens` "remains the inclusive, authoritative total used for billing" and `thinking_tokens` is a read-only decomposition "for observability". Gemini's pricing page says output pricing "includes thinking tokens". So on those two, do not add reasoning on top of output; show it as a sub-line.

## Which pricing rules quietly break a cost function?

A per-token price times a token count is the easy version. The rules below, all from the pricing pages, are what make a naive function wrong.

- **Cache multipliers.** On Claude, a five-minute cache write costs 1.25x the base input price and a one-hour write 2x. Reads cost 0.1x on most models, 0.05x on Sonnet 5.5 and Opus 5.5. Price the two write lifetimes separately; that is why `cache_creation` is split.
- **Batch.** The Batch API is a 50% discount on both input and output tokens, and the multipliers stack with it. `service_tier` reports `standard`, `priority` or `batch`.
- **Data residency.** On Claude 4.6 and later, US-only inference through `inference_geo` carries a 1.1x multiplier on all token categories.
- **Length tiers.** Haiku 5.5 costs $0.10 input and $0.50 output per million tokens up to 100,000 prompt tokens, and $0.50 and $2.50 above that; prompt length counts cache reads and writes.
- **Per-model cached rates on OpenAI.** The pricing page lists gpt-6-sol at $2.00 input, $0.20 cached, $10.00 output; gpt-6.1-sol at $2.00, $0.10, $10.00; gpt-6-astra at $10.00, $1.00, $50.00. Same family, different cache discounts. OpenAI's caching guide adds that on GPT-5.6 and later, cache writes cost 1.25x the uncached input rate and reads 0.1x (0.05x for GPT-6.1 Sol). The adapter below does not yet apply that to `gpt-6.1-sol`, so add a row for it before you use it.
- **Dates.** Gemini 3.8 Flash is $0.75 input, $0.075 cached and $3.75 output through 31 December 2026, and $1.50, $0.15 and $7.50 from 1 January 2027. A price table without effective dates will be wrong in under three months.

Server tools are extra again: Claude reports `web_search_requests` and `web_fetch_requests` in `server_tool_use`, and web search is billed per search on top of tokens.

## What should you log on every request?

One row per model call, written by one function so no call site can forget:

- Identity: `request_id`, timestamp, `feature` (the product surface, not the endpoint), `prompt_version` (see [prompt versioning and rollback](/blog/prompt-versioning-and-rollback)), provider, model.
- Tokens, normalised: fresh input, cache read, cache write 5m, cache write 1h, output, of which reasoning.
- `cost_usd`, computed at write time from a dated rate table, plus the rate table's version.
- Timing: total milliseconds and time to first token if streaming.
- Outcome: stop reason, HTTP status, retry count.

Compute cost at write time and store it. If you recompute later from a changed rate table, last quarter's numbers change under you.

Keep the row in your log pipeline. Metrics are for aggregates: tag them with `feature`, `model` and `prompt_version`, and keep `request_id` out of metric tags, because every unique tag value multiplies the number of series you pay for. That is a design argument, not a documented limit; check your Datadog plan's custom-metric rules. Datadog and Sentry are both in my stack, and I would send errors to Sentry with the same `request_id` so a failed call and its cost line can be joined.

## Hands-on: one normaliser, one rate table, one metric call

The rates below are copied from the pages cited above as of today. The Claude adapter follows the usage reference field for field. The OpenAI and Gemini adapters encode the assumptions flagged above, so test them against a real response before relying on the output.

```python
from dataclasses import dataclass
from datetime import date
from datadog import initialize, statsd

initialize(statsd_host="127.0.0.1", statsd_port=8125)   # DogStatsD, per the Datadog docs

@dataclass
class U:                       # per-million-token units after normalising
    fresh: int = 0; read: int = 0; write5m: int = 0; write1h: int = 0
    out: int = 0; reasoning: int = 0

# USD per million tokens, dated. The 2026-01-01 start is a placeholder, not a vendor date.
RATES = {
    "claude-sonnet-5-5": [(date(2026, 1, 1), dict(fresh=2.00, read=0.10, write5m=2.50, write1h=4.00, out=10.00))],
    "gpt-6-sol":         [(date(2026, 1, 1), dict(fresh=2.00, read=0.20, write5m=2.50, write1h=2.50, out=10.00))],  # writes 1.25x per OpenAI's caching guide
    "gemini-3.8-flash": [
        (date(2026, 1, 1), dict(fresh=0.75, read=0.075, write5m=0.75, write1h=0.75, out=3.75)),
        (date(2027, 1, 1), dict(fresh=1.50, read=0.15,  write5m=1.50, write1h=1.50, out=7.50)),
    ],
}

def rate(model: str, on: date) -> dict:
    return [r for d, r in RATES[model] if d <= on][-1]

def cost_usd(model: str, u: U, on: date, batch: bool = False) -> float:
    r = rate(model, on)
    total = (u.fresh * r["fresh"] + u.read * r["read"] + u.write5m * r["write5m"]
             + u.write1h * r["write1h"] + u.out * r["out"]) / 1_000_000   # reasoning is inside out (Claude, Gemini)
    return total * (0.5 if batch else 1.0)

def from_claude(usage) -> U:
    cc = usage.cache_creation
    return U(fresh=usage.input_tokens,                       # excludes cache reads and writes
             read=usage.cache_read_input_tokens or 0,
             write5m=cc.ephemeral_5m_input_tokens if cc else (usage.cache_creation_input_tokens or 0),
             write1h=cc.ephemeral_1h_input_tokens if cc else 0,
             out=usage.output_tokens,
             reasoning=(usage.output_tokens_details.thinking_tokens if usage.output_tokens_details else 0))

def from_openai(usage) -> U:
    cached = usage.input_tokens_details.cached_tokens
    return U(fresh=usage.input_tokens - cached,              # assumes cached is a subset: verify
             read=cached, out=usage.output_tokens,
             reasoning=usage.output_tokens_details.reasoning_tokens)

def from_gemini(usage) -> U:
    cached = usage.total_cached_tokens or 0
    return U(fresh=usage.total_input_tokens - cached,        # assumes input includes cached: verify
             read=cached, out=usage.total_output_tokens,
             reasoning=usage.total_thought_tokens or 0)

def record(feature: str, prompt_version: str, model: str, u: U, ms: int):
    c = cost_usd(model, u, date.today())
    total_in = u.fresh + u.read + u.write5m + u.write1h
    tags = [f"feature:{feature}", f"model:{model}", f"prompt:{prompt_version}"]
    statsd.distribution("llm.cost_usd", c, tags=tags)
    statsd.distribution("llm.latency_ms", ms, tags=tags)
    statsd.distribution("llm.cache_hit_ratio", (u.read / total_in) if total_in else 0, tags=tags)
    return c   # also write the full row to your logs here
```

The Datadog page says `distribution()` stores the metric as a distribution and calculates sum, count, average, minimum, maximum and several percentiles, which is what you want: the sum is spend, the p95 is your worst-case request. In Python, `statsd.count` is not supported, so I use distributions throughout.

Datadog's LLM Observability SDK can also carry token counts on spans; check its docs for the exact keys, especially for cache tokens. I found no mention of cost in the pages I read, so compute it yourself as above.

I have not run this against live accounts; treat it as a starting shape with the verification steps above as part of the job.

## What should the dashboard and alerts show?

Four charts cover most surprises: spend per day by `feature`; p50 and p95 cost per request by `model`; cache hit ratio by `prompt_version`; and tokens per request over time. Alert on the p95 cost per request rising above a multiple of its trailing baseline, and on the hit ratio falling under your steady-state level. In [the prompt caching post](/blog/prompt-caching-economics-rag-bill-2026), losing the cache turned an $80 day into an $840 day with no change in traffic.

## Takeaways

- Log tokens and cost per request from day one; invoices arrive too late to find the deploy that caused the spike.
- Normalise usage at the edge. Claude excludes cache tokens from `input_tokens`; OpenAI's docs describe them as a breakdown; Gemini's page is silent. Test each.
- Price with a dated rate table and store the computed cost with the row. Gemini 3.8 Flash's prices change on 1 January 2027.
- Handle the multipliers: cache write lifetimes, batch at 50%, the 1.1x US-only multiplier, Haiku 5.5's length tier.
- Tag metrics by feature, model and prompt version; keep request IDs in logs.

Next up: [prompt versioning and rollback](/blog/prompt-versioning-and-rollback), because a cost chart is only useful if you can tie a jump to a prompt change.
