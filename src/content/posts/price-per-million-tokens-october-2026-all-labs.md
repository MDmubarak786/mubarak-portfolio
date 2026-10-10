---
title: "Price per million tokens, October 2026: Claude, Gemini and GPT-6 compared"
description: "Input, cached input and output per million tokens for the current Claude, Gemini and OpenAI models, with a source for every row and the footnotes that change the bill."
date: 2026-10-10T01:27:00Z
tags: ["LLM pricing", "Claude", "Gemini", "GPT-6", "cost optimisation"]
pillar: model-watch
sources:
  - title: "Claude docs: pricing (model table, tiers, batch, tokenizer note)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Gemini API pricing (Standard tier, 'through December 31, 2026' notes)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "OpenAI API docs: pricing (GPT-6 and GPT-5.6, short and long context)"
    url: "https://developers.openai.com/api/docs/pricing"
  - title: "BenchLM OpenAI pricing table, updated 8 October 2026 (third-party aggregator)"
    url: "https://benchlm.ai/openai/api-pricing"
  - title: "mixed-news: OpenAI GPT-6 prompt caching coverage (secondary)"
    url: "https://mixed-news.com/en/openai-gpt-6-prompt-caching-30-minute-window-90-percent/"
draft: false
---

As of 10 October 2026, the three big labs price their mid-tier models almost identically and their cheap tiers nearly so. Claude Sonnet 5.5 and GPT-6 Sol are both $2 in and $10 out per million tokens; Claude Haiku 5.5 and GPT-6 Luna are both $0.10 in and $0.50 out. Gemini 3.8 Flash undercuts both today, and from 1 January its price doubles to $1.50 in and $7.50 out. This post is the table, with a source label on every row and the footnotes that move the real bill.

Method: I read each vendor's own pricing page on 10 October. Where a row comes from anywhere else it says so. All prices are USD per million tokens (MTok), Standard tier, text, short context, unless a footnote says otherwise.

## What do the current models cost?

Source key: **A** is Anthropic's pricing page, **G** is Google's Gemini API pricing page, **O** is OpenAI's developer pricing page. All three are vendor pages.

| Model | Input | Cached input | Output | Source |
|---|---|---|---|---|
| Claude Fable 5.1 | $10.00 | $0.25 | $50.00 | A |
| Claude Mythos 5.1 (limited availability) | $10.00 | $0.25 | $50.00 | A |
| Claude Opus 5.5 | $4.00 | $0.20 | $20.00 | A |
| Claude Opus 5 | $5.00 | $0.50 | $25.00 | A |
| Claude Sonnet 5.5 | $2.00 | $0.10 | $10.00 | A |
| Claude Sonnet 5 | $2.00 | $0.20 | $10.00 | A |
| Claude Sonnet 4.6 | $3.00 | $0.30 | $15.00 | A |
| Claude Haiku 5.5, prompts up to 100k tokens | $0.10 | $0.01 | $0.50 | A |
| Claude Haiku 5.5, prompts over 100k tokens | $0.50 | $0.05 | $2.50 | A |
| Claude Haiku 4.5 | $1.00 | $0.10 | $5.00 | A |
| Gemini 3.1 Pro Preview (up to 200k prompt) | $2.00 | $0.20 | $12.00 | G |
| Gemini 3.8 Flash (to 31 Dec 2026) | $0.75 | $0.075 | $3.75 | G |
| Gemini 3.6 Flash (to 31 Dec 2026) | $0.75 | $0.075 | $3.75 | G |
| Gemini 3.5 Flash-Lite | $0.30 | $0.03 | $2.50 | G |
| Gemini 3.1 Flash-Lite | $0.25 | $0.025 | $1.50 | G |
| Gemini 2.5 Pro (up to 200k prompt) | $1.25 | $0.125 | $10.00 | G |
| Gemini 2.5 Flash | $0.30 | $0.03 | $2.50 | G |
| Gemini 2.5 Flash-Lite | $0.10 | $0.01 | $0.40 | G |
| GPT-6 Astra | $10.00 | $1.00 | $50.00 | O |
| GPT-6 Sol | $2.00 | $0.20 | $10.00 | O |
| GPT-6.1 Sol | $2.00 | $0.10 | $10.00 | O |
| GPT-6 Luna | $0.10 | $0.01 | $0.50 | O |
| GPT-5.6 Sol (promotional) | $4.00 | $0.40 | $20.00 | O |
| GPT-5.6 Terra | $2.00 | $0.20 | $12.00 | O |
| GPT-5.6 Luna | $0.20 | $0.02 | $1.20 | O |

Third-party cross-check: BenchLM's table (updated 8 October, hosted on benchlm.ai, not OpenAI) lists the same seven OpenAI rows above with identical numbers. It also lists models the vendor page extract I read did not cover: GPT-5.5 at $5.00 input, $0.50 cached, $30.00 output; GPT-5.4 at $2.50, $0.25, $15.00; GPT-5.4 mini at $0.75, $0.075, $4.50. Those three are third-party only. My read of OpenAI's pricing page covered Astra, Sol, Luna, 6.1 Sol and the GPT-5.6 models; I did not see GPT-6 Instant priced, so it has no row.

## Which footnotes change the bill?

**Gemini 3.8 Flash and 3.6 Flash double on 1 January 2027.** The Google page prices them "through December 31, 2026" and then, from 1 January 2027, at $1.50 input, $0.15 cached input and $7.50 output. Storage for explicit caches doubles from $0.50 to $1.00 per MTok per hour. A budget built on today's numbers is wrong by January. 3.5 Flash-Lite, 3.1 Flash-Lite and the 2.5 models carry no such note.

**OpenAI long context doubles input.** Above 272K input tokens, GPT-6 Sol is $4.00 input, $0.40 cached and $15.00 output; Astra is $20.00, $2.00 and $75.00. The Fast tier is 2x Standard on every GPT-6 and GPT-5.6 model, Ultrafast is 6x on Astra and 6.1 Sol. GPT-5.6 Sol's price is promotional, "at least through November 21, 2026". OpenAI also lists cache writes as a separate column; at long context they are 1.25x input (GPT-6 Sol: $5.00 on $4.00 input), which matches the 1.25x write rate in OpenAI's caching guide for GPT-5.6 and later. Check the page for the short-context write figures before you budget writes.

**Claude Haiku 5.5 is priced by prompt length.** A request whose prompt exceeds 100,000 tokens pays the higher row, and the count includes cache reads and writes. The 1M context window is available on the other 4.6-and-later models at standard pricing, so a 900k-token request costs the same per token as a 9k one.

**Claude Sonnet 5's price is now permanent.** The page says the $2/$10 launch price "is now the standard price" and the rise to $3/$15 planned for 1 September 2026 "will not occur".

**Claude's tokenizer produces more tokens.** The pricing page says Claude 4.7 and later models use a newer tokenizer that produces "approximately 30% more tokens for the same text". A per-token comparison against Gemini or GPT-6 therefore understates what the same document costs on Sonnet 5.5. I do not have tokenizer ratios for the other two labs, so count tokens on your own text with each vendor's counter before you compare.

**Cached input is not one multiplier.** Claude reads at 0.05x on Opus 5.5 and Sonnet 5.5, 0.025x on Fable 5.1 and Mythos 5.1 and 0.1x elsewhere. Gemini reads at 0.1x. OpenAI reads at 0.1x, except GPT-6.1 Sol at 0.05x. Writes are priced separately on Claude (1.25x for five minutes, 2x for an hour). The next post in this series takes the mechanics apart.

**Batch is half price everywhere I checked.** Anthropic's Batch API gives 50% off input and output. Gemini 3.8 Flash Batch is $0.375 input and $1.875 output. OpenAI's Batch tier for GPT-6 Sol is $1.00 input, $0.10 cached, $5.00 output. Batch is asynchronous, so it fits evals, backfills and nightly jobs, not user-facing calls.

One secondary-source note: mixed-news reports that OpenAI halved the API price of GPT-6 Sol and Luna as part of the caching announcement. The pricing page shows only current numbers, so I cannot verify the before and after. If you have an old table, discard it.

## What does it mean for people shipping products?

Three opinions, as design advice.

The list price is the smallest lever. Sonnet 5.5 and GPT-6 Sol are the same price; the choice between them is quality, latency and your tokenizer. The bigger movers are the ones in the footnotes: whether your prefix caches, whether a long prompt crosses a tier boundary (100k on Haiku 5.5, 200k on Gemini Pro, 272K on OpenAI), and whether a promotional price expires mid-quarter.

Do not budget Gemini 3.8 Flash on the current price past December. If you chose it for cost, run the January numbers now, because at $1.50 and $7.50 it is no longer the cheapest mid-tier option by the same margin.

Price the whole call, not the input. Output is five times input on the Sonnet, Haiku, Opus, Fable, GPT-6 and Gemini Flash rows above. A generation-heavy feature barely benefits from cheap input.

## Hands-on: cost of 1,000 requests, uncached

Take a request with 2,000 input tokens and 200 output tokens, no caching, and price 1,000 of them. That is 2M input and 0.2M output tokens.

| Model | 1,000 requests |
|---|---|
| Claude Fable 5.1 / GPT-6 Astra | $30.00 |
| Claude Opus 5.5 / GPT-5.6 Sol | $12.00 |
| Claude Sonnet 5.5 / GPT-6 Sol | $6.00 |
| Gemini 3.1 Pro (under 200k) / GPT-5.6 Terra | $6.40 |
| Gemini 3.8 Flash, today | $2.25 |
| Gemini 3.8 Flash, from 1 Jan 2027 | $4.50 |
| Gemini 3.5 Flash-Lite | $1.10 |
| Gemini 3.1 Flash-Lite | $0.80 |
| GPT-5.6 Luna | $0.64 |
| Claude Haiku 5.5 / GPT-6 Luna | $0.30 |

Reproduce it, and swap in your own token counts:

```python
PRICES = {  # USD per MTok: (input, output). From the vendor pages, 10 Oct 2026.
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5":  (0.10, 0.50),   # prompts up to 100k tokens
    "gemini-3.8-flash":  (0.75, 3.75),   # until 31 Dec 2026; 1.50 / 7.50 after
    "gpt-6-sol":         (2.00, 10.00),
}

def per_1000(model, in_tokens=2000, out_tokens=200):
    i, o = PRICES[model]
    return (in_tokens * i + out_tokens * o) * 1000 / 1_000_000

for m in PRICES:
    print(f"{m:20s} ${per_1000(m):.2f}")
```

This is the cost with no caching and a single tokenizer's token counts. For prefix-heavy workloads, the [caching post](/blog/prompt-caching-economics-rag-bill-2026) shows the cached case, where the gaps change shape.

## Takeaways

- Mid-tier is a tie on list price: Sonnet 5.5 and GPT-6 Sol at $2 and $10. Cheap tier is a tie too: Haiku 5.5 and GPT-6 Luna at $0.10 and $0.50.
- Gemini 3.8 Flash is $0.75 and $3.75 only through 31 December 2026; it doubles on 1 January.
- Check tier boundaries: 100k on Haiku 5.5, 272K on OpenAI, 200k on Gemini 3.1 Pro. Crossing one changes the rate.
- Claude's newer tokenizer yields about 30% more tokens for the same text; count your own tokens per vendor before comparing.
- Trust vendor pages for rows, and treat aggregators as a cross-check. BenchLM matched OpenAI's page on every row I compared.

Next, [cache read pricing across Claude, Gemini and GPT-6](/blog/prompt-cache-read-pricing-compared-across-labs) lines up the multipliers, minimums and windows behind the cached column.
