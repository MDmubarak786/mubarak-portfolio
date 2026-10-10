---
title: "Cache read pricing compared: 0.025x to 0.1x across Claude, Gemini and GPT-6"
description: "Cache read multipliers, write fees, minimum prompt sizes and lifetimes for Claude, Gemini and GPT-6 in one table, plus break-even maths and a rule by traffic shape."
date: 2026-10-10T01:28:00Z
tags: ["prompt caching", "LLM pricing", "Claude", "Gemini", "GPT-6", "cost optimisation"]
pillar: building
sources:
  - title: "Claude docs: prompt caching (minimums, TTLs, multipliers, usage fields)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: pricing (cache read prices per model)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Gemini API docs: context caching (implicit caching, minimum tokens)"
    url: "https://ai.google.dev/gemini-api/docs/caching"
  - title: "Gemini API pricing (context cache and storage per model)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "OpenAI API docs: prompt caching guide (GPT-5.6 and later: writes, reads, ttl, breakpoints)"
    url: "https://developers.openai.com/api/docs/guides/prompt-caching"
  - title: "OpenAI API docs: pricing (cached input and cache writes for GPT-6 and GPT-5.6)"
    url: "https://developers.openai.com/api/docs/pricing"
draft: false
---

"Cached input is 10% of list price" is true of most models and wrong for the ones that matter most. Claude's read rate runs from 0.1x down to 0.025x depending on the model, OpenAI has one GPT-6 model at 0.05x, and Gemini sits at 0.1x but charges rent for explicit caches. This is the companion to [issue 3](/blog/prompt-caching-economics-rag-bill-2026): the multipliers side by side, the break-even maths, and a rule for which lab's mechanism fits which traffic.

One correction to that issue first. It cited a third-party table for GPT-6 cached prices and gave GPT-6 Sol a $0.10 cached rate. OpenAI's own developer pricing page, at developers.openai.com, lists GPT-6 Sol at $0.20 cached on $2.00 input (0.1x) and GPT-6.1 Sol at $0.10 (0.05x).

## How do the three labs compare?

Prices per million tokens (MTok), Standard tier, from each vendor's pricing page on 10 October 2026. Mechanics from each vendor's caching documentation.

| Model | Read price (multiple of input) | Write fee | Minimum prompt | Lifetime |
|---|---|---|---|---|
| Claude Fable 5.1, Mythos 5.1 | $0.25 (0.025x) | 1.25x for 5 min, 2x for 1 h | 512 tokens | 5 min default, 1 h option |
| Claude Opus 5.5 | $0.20 (0.05x) | 1.25x / 2x | 512 | 5 min / 1 h |
| Claude Sonnet 5.5 | $0.10 (0.05x) | 1.25x / 2x | 512 | 5 min / 1 h |
| Claude Haiku 5.5 (up to 100k prompt) | $0.01 (0.1x) | 1.25x / 2x | 512 | 5 min / 1 h |
| Claude Sonnet 5, Sonnet 4.6 | 0.1x ($0.20 and $0.30) | 1.25x / 2x | 1,024 | 5 min / 1 h |
| Gemini 3.8 Flash, 3.6 Flash | $0.075 (0.1x) | none for implicit; explicit adds storage | 4,096 | implicit: not stated; explicit: storage billed by the hour |
| Gemini 3.1 Pro Preview | $0.20 (0.1x, up to 200k) | as above | 4,096 | as above |
| Gemini 2.5 Flash, 2.5 Pro | $0.03 and $0.125 (0.1x) | as above | 2,048 | as above |
| GPT-6 Sol, Luna, Astra | $0.20, $0.01, $1.00 (0.1x) | 1.25x | 1,024 visible tokens | at least 30 min after last write or reuse |
| GPT-6.1 Sol | $0.10 (0.05x) | 1.25x | 1,024 visible tokens | at least 30 min |

Three things the table does not say loudly enough.

**The multiplier is not the price.** Fable 5.1's 0.025x looks best, but its base input is $10, so a read costs $0.25 per MTok, more than Sonnet 5.5's $0.10 and Gemini 3.8 Flash's $0.075. A low multiplier on an expensive model is still an expensive read.

**Gemini's rent is the hidden column.** Implicit caching "is enabled by default for all Gemini 2.5 and newer models" and Google's page gives no discount percentage, so I derived 0.1x from the price lines. Explicit caching, which requires the generateContent API (the Interactions API supports implicit only), adds storage: $0.50 per MTok per hour for 3.8 Flash (to $1.00 from 1 January 2027), $4.50 for 3.1 Pro. Gemini 3.5 Flash-Lite is not on the minimum-token list, so check the docs for its threshold.

**OpenAI's "up to 90%" is a ceiling and the guide is more precise.** The caching guide opens with discounts that "can reach 95%": that is the 0.05x read on GPT-6.1 Sol. For GPT-5.6 and later, writes cost 1.25x the uncached rate, the only `ttl` value is `"30m"`, and reuse refreshes it without a new write charge. Earlier OpenAI models read at a model-dependent rate with no write charge and use `prompt_cache_retention` (`in_memory` or `24h`) instead.

Claude's minimums are also falling: 512 tokens on the current generation against 4,096 on Opus 4.6, Opus 4.5 and Haiku 4.5. If you are on an older model, prompts that never cached may start to once you migrate.

## Break-even maths: when does a write pay back?

Let b be the base price of the prefix. Without caching, n+1 calls cost (n+1)b. With caching, one write plus n reads costs w·b + r·n·b, where w is the write multiple and r the read multiple.

| Case | Cost after n reads | Pays back when |
|---|---|---|
| Claude 5 min write (1.25x), read 0.05x | 1.25 + 0.05n | n = 1 (1.30 against 2.00) |
| Claude 5 min write, read 0.1x | 1.25 + 0.1n | n = 1 (1.35 against 2.00) |
| Claude 1 h write (2x), read 0.05x | 2 + 0.05n | n = 2 (2.10 against 3.00; at n = 1 it loses, 2.05 against 2.00) |
| OpenAI write 1.25x, read 0.1x | 1.25 + 0.1n | n = 1 |
| Gemini implicit | 0.1 per read, no write | the first hit |

So a five-minute write pays back on its first read, and a one-hour write needs two. The lifetime, not the multiplier, decides whether you get those reads.

A concrete case. A 20,000-token prefix, read once, priced from the table: on Sonnet 5.5 an uncached call is $0.040, a 5 min write $0.050, a read $0.002. On GPT-6 Sol a read is $0.004; on GPT-6.1 Sol $0.002; on Gemini 3.8 Flash $0.0015; on Fable 5.1 $0.005; on Haiku 5.5 or GPT-6 Luna $0.0002.

For Gemini explicit caches the question is rent. Take a 100,000-token cache on 3.8 Flash. Holding it costs 0.1 MTok × $0.50 = $0.05 an hour. Each read saves 0.1 MTok × ($0.75 − $0.075) = $0.0675. The cache pays for itself above about 0.74 reads an hour, and the ratio holds after the January doubling because both numbers double.

## Which lab's caching fits which traffic?

This is a design rule, not a benchmark. I have not measured hit rates on any of these.

| Traffic shape | Best fit | Why |
|---|---|---|
| Steady, gaps under 5 minutes | Any of the three | Reads refresh the lifetime at no cost on Claude; OpenAI reuse refreshes 30 min; Gemini implicit needs nothing |
| Bursty, gaps of 5 to 30 minutes | OpenAI 30 min window, or Claude 1 h | Claude's 5 min entry expires; the 1 h write needs two reads to pay back |
| Sparse, hours between calls | Gemini explicit cache, if more than about 0.74 reads an hour at 3.8 Flash rates; otherwise skip caching | Storage is billed whether or not anyone reads |
| Per-tenant prompts | Keep the shared prefix identical, tenant data after the breakpoint | Any byte difference before the breakpoint is a miss on all three; OpenAI's `prompt_cache_key` gives separate cache accounting per customer on GPT-5.6+ |
| Long agent loops | Claude automatic caching, OpenAI implicit mode | Claude's top-level `cache_control` moves the breakpoint forward; OpenAI implicit mode places one at the latest eligible message |
| Offline batches | The labs' Batch tiers | OpenAI's Batch tier lists its own cached rates; Anthropic says batch and caching discounts can be combined |

Two traps from the docs. On Claude, "a cache entry only becomes available after the first response begins", so a fan-out of parallel requests on a cold prefix all pay full price; send one, wait for the first response, then fan out. And on OpenAI, explicit mode with no breakpoints creates no cache writes, so switching `mode` without adding markers silently turns caching off.

## Hands-on: the same prefix on two APIs, and a break-even helper

The Claude request body marks the stable block. The OpenAI Responses request sets the cache options and an explicit breakpoint, as the guide documents. Treat field placement as indicative and check the docs for the exact parameter names in your SDK version.

```python
claude_body = {
    "model": "claude-sonnet-5-5",
    "max_tokens": 600,
    "system": [{"type": "text", "text": SHARED_DOCS,
                "cache_control": {"type": "ephemeral", "ttl": "1h"}}],   # 5 min if ttl omitted
    "messages": [{"role": "user", "content": question}],
}

openai_body = {
    "model": "gpt-6.1-sol",
    "prompt_cache_options": {"mode": "explicit", "ttl": "30m"},
    "input": [
        {"role": "developer", "content": [
            {"type": "input_text", "text": SHARED_DOCS,
             "prompt_cache_breakpoint": {"mode": "explicit"}}]},
        {"role": "user", "content": question},
    ],
}

def breakeven_reads(write_mult: float, read_mult: float) -> float:
    """Reads needed before a write beats no caching: w + r*n < 1 + n."""
    return (write_mult - 1) / (1 - read_mult)

# breakeven_reads(1.25, 0.05) -> 0.26 (first read), breakeven_reads(2.0, 0.05) -> 1.05 (second)
```

Read usage from the response on both: Claude's `cache_creation_input_tokens` and `cache_read_input_tokens`, OpenAI's `usage.input_tokens_details.cached_tokens` and `cache_write_tokens`, Gemini's `usage.total_cached_tokens`. If reads are zero on repeated calls, the prompt is under the minimum, something before the breakpoint changed, or the lifetime has lapsed.

## Takeaways

- Read multiples are 0.025x, 0.05x or 0.1x on Claude, 0.1x on Gemini, 0.1x on GPT-6 and 0.05x on GPT-6.1 Sol. Compare dollars per MTok, not multipliers: Fable 5.1's read is $0.25.
- A five-minute Claude write or an OpenAI write at 1.25x pays back on the first read. A one-hour Claude write needs a second.
- Gemini's implicit caching is free to use; explicit caches cost storage, roughly 0.74 reads an hour to break even on 3.8 Flash.
- Minimums differ: 512 (current Claude), 1,024 (GPT-5.6 and later, visible tokens), 2,048 to 4,096 on Gemini.
- Match the lifetime to your gaps: 5 minutes, 1 hour, 30 minutes or hourly rent.

The prices behind the read column are in [the October 2026 price table](/blog/price-per-million-tokens-october-2026-all-labs).
