---
title: "1M context by default: when long context beats retrieval, and when it doesn't"
description: "Most current Claude models include 1M tokens at standard pricing. A priced comparison of stuffing a 400k corpus versus retrieving 8k, and a decision table."
date: 2026-10-10T01:16:00Z
tags: ["long context", "RAG", "Claude", "prompt caching", "cost"]
pillar: building
sources:
  - title: "Claude docs: context windows (sizes by model, context rot, overflow behaviour)"
    url: "https://platform.claude.com/docs/en/build-with-claude/context-windows"
  - title: "Claude docs: pricing (long-context pricing, Haiku 5.5 tiers, cache multipliers)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: prompt caching (TTL, minimums, invalidation, usage fields)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: rate limits (cache-aware ITPM)"
    url: "https://platform.claude.com/docs/en/api/rate-limits"
  - title: "Anthropic Engineering: effective context engineering for AI agents"
    url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"
  - title: "Claude docs: models overview (context window, words per token)"
    url: "https://platform.claude.com/docs/en/about-claude/models/overview"
draft: false
---

Every current Claude model, from Haiku 5.5 up to Fable 5.1, now has a 1M-token context window with no beta header, and on most of them a 900,000-token request costs the same per token as a 9,000-token one. That makes "just put the whole corpus in the prompt" a real option, and for some products the right one. For many others it is the expensive way to get a worse answer. This post prices both and gives you a table to decide with.

## What changed with the 1M window?

The context-windows page lists the models with 1M tokens: Fable 5.1, Mythos 5.1, Fable 5, Mythos 5, Opus 5.5, Opus 5, the Opus 4.6 to 4.8 line, Sonnet 5.5, Sonnet 5, Sonnet 4.6 and Haiku 5.5. It says "1M is the default: you don't need a beta header", and that long-context requests are billed at standard pricing, "except on Claude Haiku 5.5, where prompts over 100,000 tokens cost more". Claude Sonnet 4.5 stays at 200k.

For scale, the models overview puts 1M tokens at roughly 555,000 words on the current tokenizer. That is several novels or a mid-sized documentation site, not a company's whole knowledge base.

Three limits sit around that headline:

- **Haiku 5.5 steps up at 100k.** The pricing page lists $0.10 input and $0.50 output below 100,000 tokens, and $0.50 and $2.50 above. A request's prompt length counts cache reads and writes, so a cached 400k prompt still pays the higher tier.
- **Media caps.** A single request can include up to 600 images or PDF pages. Large scanned corpora hit that or the request size limit before the token limit.
- **Cached tokens still fill the window.** The docs say caching "changes what you pay for those tokens, not whether they count."

## Does a bigger window mean better answers?

Not by itself. The same page is blunt: "more context isn't automatically better. As token count grows, accuracy and recall degrade, a phenomenon known as *context rot*." Anthropic's engineering article on context engineering describes the model as having a finite "attention budget" and recommends, for many agents, a hybrid: some material loaded up front for speed, the rest fetched just in time. Its example is Claude Code, which loads CLAUDE.md files up front and uses glob and grep to retrieve files as needed.

I have built enough RAG systems to say the practical version: stuffing removes your retrieval failures and adds a different failure, where the answer is in the prompt and the model still misses it. Neither is free of evals. If you switch from retrieval to stuffing, run the same question set before and after.

## What does each approach cost?

A worked example on Sonnet 5.5, using prices from the pricing page: $2 input, $2.50 five-minute cache write, $0.10 cache read, $10 output, all per million tokens. The corpus is a 400,000-token policy library. Each question is 300 tokens and each answer 400 tokens. Retrieval pulls eight chunks of 1,000 tokens.

| Strategy | Prefix or context cost | Question and answer | Per query |
|---|---|---|---|
| Stuff, no caching | 400,000 x $2 = $0.800 | $0.0046 | $0.805 |
| Stuff, cache warm | 400,000 x $0.10 = $0.040 | $0.0046 | $0.045 |
| Stuff, cache cold every time | 400,000 x $2.50 = $1.000 | $0.0046 | $1.005 |
| Retrieve 8 x 1,000 tokens | 8,300 x $2 = $0.0166 | $0.0040 | $0.021 |

"Warm" means traffic keeps the cache alive. The docs say the five-minute cache is "refreshed for no additional cost each time the cached content is used", so one call every five minutes is enough. "Cold every time" is what sparse traffic looks like: if queries arrive less often than that, each one pays the 1.25x write, and caching makes stuffing worse than not caching at all. The retrieval row excludes embedding calls and vector-store hosting, which I have not priced here.

Three conclusions follow.

1. **Caching is the only reason stuffing is viable.** Uncached, a 400k prompt costs about 39 times the retrieval query.
2. **Even warm, retrieval is about half the price here.** At 10,000 queries a day that is roughly $446 for stuffing against $206 for retrieval, before retrieval's own infrastructure.
3. **There is a break-even corpus size.** On Sonnet 5.5, base input is 20 times the cache-read price. Warm cached stuffing therefore costs less per query than retrieval whenever the corpus is under 20 times the tokens you would retrieve. With 8,300 retrieved tokens that line is about 166,000 tokens. Opus 5.5 has the same 20x ratio ($4 against $0.20); Haiku 5.5 below 100k is 10x ($0.10 against $0.01).

## Throughput is a second bill

Rate limits matter more with long prompts. The rate-limits page says that for most models only uncached input tokens count towards input-tokens-per-minute: `cache_read_input_tokens` do not, while `cache_creation_input_tokens` and `input_tokens` do. At the Start tier, Sonnet 5.5 is listed at 2,000,000 input tokens per minute. An uncached 400k prompt therefore allows about five requests a minute. A warm cache lets reads through without counting, but the first write of 400k takes a fifth of the minute, and any invalidation sends you back to it.

That is where the caching rules from the prompt-caching docs bite. Everything is ordered tools, then system, then messages, and a change at one level invalidates it and what follows. Edit one policy document, which sits in the cached prefix, and you re-pay the whole write. A retrieval system re-indexes one document.

## A decision table

| Question | Long context (stuff and cache) | Retrieval |
|---|---|---|
| Corpus size | Under about 20x your retrieved tokens, and well under 1M | Larger than the window, or growing past it |
| Query rate | Steady, at least one call per cache lifetime | Sparse or bursty |
| Freshness | Corpus changes rarely; each change rewrites the prefix | Documents change daily |
| Permissions | Everyone sees the whole corpus | Per-user or per-tenant access to different documents |
| Question type | Synthesis across the whole corpus, "what is inconsistent anywhere" | Lookup of a few relevant passages |
| Citations | Acceptable to cite from a large prompt | Need a source per passage, with a score |
| Latency | Warm cache; the first call is slow and expensive | Small prompts, consistent speed |
| Modality | Text within the 600-page and request-size limits | Many scans, images or very large files |

Permissions deserve emphasis. If different users may see different documents, stuffing the union into a shared cached prefix is a data leak by design. Per-tenant prefixes defeat caching. Retrieval filtered by access control solves both.

## Hands-on: estimate before you choose

This function reproduces the table for any corpus. Prices are Sonnet 5.5's; swap in your model's, and use the token counting API for real token counts (check the docs for the exact SDK method).

```python
BASE, WRITE, READ, OUT = 2.00, 2.50, 0.10, 10.00   # USD per million tokens, Sonnet 5.5

def stuffed_usd(corpus, q_in, q_out, queries_per_minute):
    warm = queries_per_minute >= 0.2               # one call per 5 minutes keeps the 5m cache alive
    prefix = corpus * (READ if warm else WRITE)
    return (prefix + q_in * BASE + q_out * OUT) / 1e6

def retrieved_usd(k, chunk, q_in, q_out):
    return ((k * chunk + q_in) * BASE + q_out * OUT) / 1e6

print(stuffed_usd(400_000, 300, 400, 7))       # 0.0446
print(stuffed_usd(400_000, 300, 400, 0.05))    # 1.0046
print(retrieved_usd(8, 1_000, 300, 400))       # 0.0206
```

In production, log `cache_read_input_tokens` and `cache_creation_input_tokens` from every response. If reads are zero on steady traffic, something upstream of your breakpoint is changing and the "warm" row of the table is fiction.

## Takeaways

- 1M tokens is the default on current Claude models at standard pricing, except Haiku 5.5, which steps up above 100k.
- Warm caching is what makes stuffing affordable; sparse traffic turns the 1.25x write into a loss.
- On Sonnet 5.5 and Opus 5.5, cached stuffing beats retrieval on cost only when the corpus is under about 20x the tokens retrieval would send.
- Permissions, freshness and corpus growth push towards retrieval; whole-corpus synthesis and small stable corpora push towards stuffing.
- Context rot is documented. Whichever you choose, keep an eval set and re-run it when you change strategy.

For the broader RAG decision, the prompt caching post from earlier in this series has the per-vendor cache rules this arithmetic rests on.
