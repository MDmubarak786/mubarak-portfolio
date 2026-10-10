---
title: "Prompt caching economics: what a RAG bill looks like in 2026"
description: "Cached input now costs 5 to 10% of list price on Claude, Gemini and GPT-6. The rules, minimums and traps, plus a 10,000-call-a-day RAG bill priced on three models."
date: 2026-10-10
updated: 2026-10-10
tags: ["prompt caching", "LLM pricing", "RAG", "Claude Sonnet 5.5", "Gemini 3.8 Flash", "GPT-6", "cost optimisation"]
pillar: building
related: adr-002-ef-academy-multilingual-platform
sources:
  - title: "Claude docs: prompt caching (mechanics, minimums, TTLs, invalidation)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: pricing (base, cache write, cache read, output per model)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Gemini API docs: context caching (implicit caching, minimum tokens)"
    url: "https://ai.google.dev/gemini-api/docs/caching"
  - title: "Gemini API pricing (3.8 Flash input, output, caching, storage)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "OpenAI: Better prompt caching for GPT-6"
    url: "https://openai.com/index/better-prompt-caching-for-gpt-6/"
  - title: "The New Stack on GPT-6 caching (secondary)"
    url: "https://thenewstack.io/openai-prompt-caching-costs/"
  - title: "OpenAI API pricing (GPT-6 family, cached input)"
    url: "https://developers.openai.com/api/docs/pricing"
draft: false
---

The cheapest token in 2026 is the one the model has already read. In the last six weeks Anthropic cut Sonnet 5.5 cache reads to 5% of the input price, Google kept implicit caching on by default for every current Gemini model, and OpenAI shipped a GPT-6 caching system that discounts reused input by up to 90%. If you run anything with a stable system prompt and a pile of grounding documents, which is every RAG product I have touched, the design of your prompt now matters more to the bill than which model you pick.

This post is the arithmetic. Prices are as of 10 October 2026 from each vendor's pricing page; the GPT-6 caching mechanics come from OpenAI's announcement and secondary coverage, and the GPT-6 prices from OpenAI's pricing page.

## The rules, per vendor

### Anthropic: explicit breakpoints, two lifetimes, reads at 5%

Caching on the Claude API is opt-in and explicit. You mark a content block with `cache_control`, or set it once at the top level of the request for automatic caching, and the cached prefix is everything in the order tools, system, messages up to that block. The docs are blunt about what a hit requires: "Cache hits require 100% identical prompt segments, including all text and images up to and including the block marked with cache control." Up to four breakpoints per request.

The lifetime is five minutes by default and "the cache is refreshed for no additional cost each time the cached content is used", so steady traffic keeps it warm indefinitely. A one-hour lifetime is available with `"ttl": "1h"`. Writes cost 1.25x the base input price for the five-minute cache and 2x for the one-hour cache. Reads are 0.1x for most models, but the current generation is cheaper: 0.05x on Opus 5.5 and Sonnet 5.5, 0.025x on Fable 5.1.

Minimum cacheable prompt: 512 tokens on the 5.5 models and Fable 5.1 (older models need 1,024 to 4,096). Shorter prompts are processed normally with no error, so watch `cache_creation_input_tokens` and `cache_read_input_tokens` in the usage block; if both are zero, you are not caching.

| Model | Base input | 5m write | 1h write | Cache read | Output |
|---|---|---|---|---|---|
| Sonnet 5.5 | $2.00 | $2.50 | $4.00 | $0.10 | $10.00 |
| Opus 5.5 | $4.00 | $5.00 | $8.00 | $0.20 | $20.00 |
| Haiku 5.5 (prompts up to 100k tokens) | $0.10 | $0.125 | $0.20 | $0.01 | $0.50 |
| Fable 5.1 | $10.00 | $12.50 | $20.00 | $0.25 | $50.00 |

All figures USD per million tokens from the Claude pricing page.

### Google: implicit by default, storage billed by the hour

Gemini goes the other way. "Implicit caching is enabled by default for all Gemini 2.5 and newer models." You do nothing, and when a request shares a long enough prefix with a recent one, the discount shows up in `usage.total_cached_tokens`. The minimum is 4,096 tokens on Gemini 3.8 Flash, and the advice is the same as everywhere: large common content at the start of the prompt, similar requests sent close together.

Explicit caching, where you create a cache object and reference it, is available through the generateContent API (not the Interactions API) and adds a storage charge. For Gemini 3.8 Flash the pricing page lists input at $0.75, output at $3.75, cached input at $0.075 and storage at $0.50 per million tokens per hour, all "through December 31, 2026" with each doubling from 1 January 2027. The storage line is the one to remember: a cache you hold for a day costs money whether or not anyone reads it.

### OpenAI: automatic, 30-minute window, up to 90% off

OpenAI's announcement on 22 September says GPT-6 caching reuses shared context across requests with discounts of up to 90% on cached input tokens, that cached prefixes are reused inside a 30-minute window, and that the API now exposes a caching dashboard, explicit cache breakpoints, and no longer invalidates the cache when reasoning effort changes. The New Stack's reading is that the 90% rate itself is not new; the change is how often the cache gets hit. OpenAI's pricing page lists GPT-6 Sol at $2 input, $0.20 cached input and $10 output, GPT-6.1 Sol at $2 / $0.10 / $10, Luna at $0.10 / $0.01 / $0.50 and Astra at $10 / $1 / $50, all per million tokens for requests up to 272K input tokens. So on the current Sol, a cache hit is 10% of input; on 6.1 Sol it is 5%, the same ratio as Sonnet 5.5.

## The worked example

A support assistant. The stable prefix is a system prompt, tool definitions and the grounding documents it is allowed to quote: 40,000 tokens. Each call adds a 500-token question and returns a 300-token answer. Traffic is 10,000 calls a day, roughly seven a minute, which keeps a five-minute cache permanently warm and a 30-minute window trivially so.

| | Sonnet 5.5, no cache | Sonnet 5.5, cached | Haiku 5.5, cached | Gemini 3.8 Flash, cached |
|---|---|---|---|---|
| Prefix per call | 40,000 × $2 = $0.0800 | 40,000 × $0.10 = $0.0040 | 40,000 × $0.01 = $0.0004 | 40,000 × $0.075 = $0.0030 |
| Question per call | 500 × $2 = $0.0010 | $0.0010 | 500 × $0.10 = $0.00005 | 500 × $0.75 = $0.0004 |
| Answer per call | 300 × $10 = $0.0030 | $0.0030 | 300 × $0.50 = $0.00015 | 300 × $3.75 = $0.0011 |
| Per call | $0.084 | $0.008 | $0.0006 | $0.0045 |
| Per day, 10,000 calls | $840 | $80 | $6 | $45 (+ $0.48 storage if explicit) |

Per-token prices in the table are per million tokens; per-call figures are rounded. Cache writes are not in the daily total because at this traffic Anthropic's cache is written once and refreshed free on every read; a cold start costs one write of 40,000 × $2.50, ten cents.

Three things fall out of the numbers. Caching takes Sonnet 5.5 from $840 a day to $80, a 90% cut, before you touch the model choice. Once cached, the gap between Sonnet and Gemini 3.8 Flash is $35 a day, not the 2.7x the list prices suggest, because the cached prefix dominates both bills. And Haiku 5.5 at $6 a day is cheap enough that the question becomes whether its answers are good enough, which is a quality decision, not a budget one.

The example also shows where the money hides when caching fails. Every miss on Sonnet costs the full $0.08 prefix. A deploy that changes one word of the system prompt during the busy hour, or a feature flag that toggles tool definitions per customer, turns the $80 day back into an $840 one with no change in traffic.

## The traps

**Anything upstream of the breakpoint invalidates everything after it.** On Claude, a change to tool definitions invalidates the tools, system and messages caches; toggling web search or citations, changing the speed setting, or adding or removing an image invalidates system and messages. Changing thinking parameters or the effort setting "always invalidates message blocks". The order is tools, then system, then messages, so the most stable material goes first and the volatile material last.

**Per-tenant prompts defeat the cache.** If each customer gets a system prompt with their name and plan baked in, nothing is shared. Keep the shared instructions and documents in the cached prefix and pass tenant details in the final user turn, or on Claude use the documented trick of appending a `{"role": "system"}` message inside `messages` to add an instruction without invalidating the system cache.

**The one-hour TTL is a bet on traffic shape.** It costs 2x to write instead of 1.25x. It pays when calls arrive less often than every five minutes but more often than hourly, which describes a lot of internal tools and very few consumer products. With seven calls a minute you never need it.

**Gemini storage is a standing charge.** $0.50 per million tokens per hour means a 40,000-token explicit cache costs about $0.48 a day on 3.8 Flash. Trivial here; not trivial for a 500,000-token knowledge base held for a month, which is roughly $180. For bursty traffic, let implicit caching do the work and keep prompts prefix-stable.

**Minimums are per vendor.** 512 tokens on the current Claude models; 4,096 on Gemini 3.8 Flash. A short system prompt alone will not cache on Gemini; the grounding documents push it over the line.

## Hands-on: the breakpoint and the bill

The Claude side, in Python, with the prefix laid out in the cacheable order and a breakpoint on the last stable block:

```python
import anthropic

client = anthropic.Anthropic()

GROUNDING = open("support-docs.md").read()   # ~40k tokens, byte-identical every call

def answer(question: str):
    r = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=600,
        tools=TOOLS,                                        # stable: cached first
        system=[
            {"type": "text", "text": "You are the support assistant for Acme. Answer only from the documents provided."},
            {"type": "text", "text": GROUNDING, "cache_control": {"type": "ephemeral"}},   # breakpoint
        ],
        messages=[{"role": "user", "content": question}],   # volatile: after the breakpoint
    )
    u = r.usage
    hit = u.cache_read_input_tokens > 0
    return r.content[0].text, hit

def cost(u, base=2.00, write=2.50, read=0.10, out=10.00):
    """USD for one Sonnet 5.5 call from its usage block (prices per million tokens)."""
    return (u.input_tokens * base + u.cache_creation_input_tokens * write
            + u.cache_read_input_tokens * read + u.output_tokens * out) / 1_000_000
```

Log `hit` and `cost` per request from day one. The number that matters is the cache hit rate over a busy hour; OpenAI now shows it on a dashboard, Anthropic and Google give you the fields to compute it. If it is below 90% on steady traffic, something upstream of the breakpoint is changing between calls, and the fix is in your prompt assembly code, not in the model.

For a multi-turn conversation, move the breakpoint to the last message instead of the grounding block. Each turn then reads the whole previous conversation from cache and writes only the new turn; Anthropic's lookback window checks up to 20 blocks before the breakpoint for a hit.

## Takeaways

- Cached input is 5 to 10% of list price on every major API now; prompt structure sets your bill more than model choice does.
- Order the prompt by volatility: tools, then shared instructions and documents, then the per-request turn. Put the breakpoint after the last stable block.
- Byte-identical means byte-identical. Timestamps, tenant names and feature flags inside the prefix are cache misses with a salary.
- Know your minimum (512 tokens on Claude 5.5 models, 4,096 on Gemini 3.8 Flash) and your window (5 minutes or 1 hour on Claude, 30 minutes on GPT-6, implicit on Gemini).
- Measure the hit rate from the usage fields before and after every deploy that touches the prompt.

Next issue: Gemini 3.8 Live and the extended-thinking variant for voice agents, with what the latency budget actually allows.
