---
title: "RAG in 2026: when retrieval is optional, and when it is still the whole product"
description: "Every current Claude model has a 1M-token window and cached reads cost 5% of input. When to skip retrieval, when not to, with a priced 150k-token example."
date: 2026-10-10T01:34:00Z
tags: ["RAG", "long context", "retrieval"]
pillar: building
related: adr-002-ef-academy-multilingual-platform
sources:
  - title: "Claude docs: context windows (sizes by model, context rot, compaction)"
    url: "https://platform.claude.com/docs/en/build-with-claude/context-windows"
  - title: "Claude docs: prompt caching (minimums, lifetimes, invalidation)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: pricing (cache reads, long-context rules, Haiku 5.5 threshold)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: models overview (API IDs, 1M window, 555k words)"
    url: "https://platform.claude.com/docs/en/models/overview"
  - title: "Anthropic Engineering: effective context engineering for AI agents"
    url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"
  - title: "Li et al.: Retrieval Augmented Generation or Long-Context LLMs? (arXiv abstract)"
    url: "https://arxiv.org/abs/2407.16833"
draft: false
---

As of 10 October 2026 every current Claude model has a 1M-token context window, and a cached read on Sonnet 5.5 costs 5% of the input price. That makes "skip retrieval and paste the corpus in" a serious option, and for some products it is the right one. For others, retrieval is still the whole product. This post is the decision framework and the arithmetic behind it.

## What changed: windows are big and reads are cheap

The Claude models overview lists a 1M-token window for Fable 5.1, Opus 5.5, Sonnet 5.5 and Haiku 5.5, with up to 128K output tokens. The same page puts 1M tokens at roughly 555k words on the current tokenizer. The context-windows page adds that 1M is the default, with no beta header, and that long-context requests are billed at standard pricing "except on Claude Haiku 5.5, where prompts over 100,000 tokens cost more."

The pricing page spells out both halves. On Sonnet 5.5 "a 900k-token request is billed at the same per-token rate as a 9k-token request". Cache reads on Opus 5.5 and Sonnet 5.5 are 0.05x the base input price, which is $0.10 per million tokens on Sonnet 5.5 against $2 for fresh input.

Haiku 5.5 is the exception, and it is a cliff, not a slope. Up to 100,000 tokens it costs $0.10 per million input tokens, $0.01 for cache reads and $0.50 for output. Over 100,000 it costs $0.50, $0.05 and $2.50. The page says prompt length "counts all of its input tokens, including cache reads and cache writes", so a cached prefix does not keep you under the line.

Two caveats from the same docs. Big windows are not free of side effects: "As token count grows, accuracy and recall degrade, a phenomenon known as context rot." And caching changes the price of context, not its size: "prompt caching changes what you pay for those tokens, not whether they count."

## Is long context better than RAG?

Not as a rule. A useful head-to-head is a paper accepted to the EMNLP 2024 industry track. Its abstract says that "when given sufficient resources, LC consistently outperforms RAG in terms of average performance", while RAG "remains much cheaper to run." The authors propose Self-Route, which lets the model decide per query whether to use retrieval or the full context, and report that it "significantly reduces the computation cost while maintaining a comparable performance to LC." I only had the abstract, so I am not quoting numbers from it. It was written in 2024, so its models are older than anything above; the shape of the trade-off is what carries over.

Anthropic's context-engineering post draws the same line from the agent side. It separates pre-inference retrieval (embedding search before the model runs) from just-in-time retrieval (the agent holds references and loads data with tools), and says hybrids may suit less dynamic domains. Its own example is Claude Code: instruction files load up front, while glob and grep fetch everything else at run time. Its default advice: "do the simplest thing that works."

## The five questions I would ask before building a retriever

1. **Does the corpus fit?** Under about 500k words it fits a 1M window at all. Under roughly 100k tokens it fits every model, including Haiku 5.5's cheap tier. Over a million tokens, the decision is made for you.
2. **How often does it change?** A cached prefix is only as good as its stability. Any edit to a cached block invalidates it and everything after it, so a corpus that changes every few minutes never stays warm. Retrieval over an index absorbs updates by re-embedding one document.
3. **Who is allowed to see what?** A cached prefix is shared by definition. If answers must respect per-user permissions, putting the union of everyone's documents in the prompt is a leak waiting for a clever question. Filtering at retrieval time, before text reaches the model, is the design I would choose. This is an argument, not a measurement.
4. **How many queries, how close together?** The five-minute cache lifetime refreshes for free on every hit. With sparse traffic you pay the 1.25x write again and again. The one-hour lifetime costs 2x to write.
5. **What does a question look like?** Needle lookups ("what is the refund window?") are cheap for retrieval. Questions that need the whole document at once ("where do clauses 4 and 19 contradict?") are where chunking loses the relationships and long context wins.

## What it costs: a worked example

Assume a 150,000-token knowledge base, a 300-token question and a 300-token answer, on Sonnet 5.5 ($2 input, $0.10 cached read, $2.50 five-minute write, $10 output per million tokens). The RAG path sends five retrieved chunks of about 500 tokens plus the question: 2,800 input tokens. I am ignoring query-embedding cost, which is negligible per call.

| Path | Input per call | Output per call | Per call | 10,000 calls a day |
|---|---|---|---|---|
| Full context, no cache | 150,300 × $2 = $0.3006 | $0.0030 | $0.3036 | $3,036 |
| Full context, cached | 150,000 × $0.10 + 300 × $2 = $0.0156 | $0.0030 | $0.0186 | $186 |
| RAG, five chunks | 2,800 × $2 = $0.0056 | $0.0030 | $0.0086 | $86 |

Rounded figures, per-million prices from the Claude pricing page. Three readings:

- Caching alone removes 94% of the full-context bill. That is the number that makes the option real.
- Even cached, full context is about twice the RAG bill here. The gap is the price of not building a retriever.
- Freshness is where the cached path leaks money. Rewriting the 150,000-token prefix costs 150,000 × $2.50 = $0.375. If a document edit lands every hour at steady traffic, that is 24 writes, $9 a day. If an edit lands every minute, you are paying write price on most calls and the cached row above is fiction.

The Haiku cliff makes the choice sharper. A 99,000-token prompt on Haiku 5.5 costs 99,000 × $0.10 per million, $0.0099. A 101,000-token prompt costs 101,000 × $0.50 per million, $0.0505, about five times more for 2% more text. A corpus that grows past 100k tokens on Haiku is a reason to introduce retrieval, or to move up to Sonnet, where the rate does not change with length.

## Hands-on: a router you can paste

The cheapest honest implementation of the five questions is a function that picks a path per corpus (not per query) and shows its working. Token counts should come from the token counting API the context-windows page links to; check the docs for the exact call.

```python
from dataclasses import dataclass

@dataclass
class Price:            # USD per million tokens, from the Claude pricing page
    base: float
    cache_read: float
    cache_write_5m: float
    out: float

SONNET_55 = Price(base=2.00, cache_read=0.10, cache_write_5m=2.50, out=10.00)

def per_call_cost(p: Price, prefix_tokens, question_tokens, answer_tokens, cached: bool):
    prefix_rate = p.cache_read if cached else p.base
    return (prefix_tokens * prefix_rate
            + question_tokens * p.base
            + answer_tokens * p.out) / 1_000_000

def choose(corpus_tokens, edits_per_hour, calls_per_day, needs_per_user_acl,
           window=1_000_000, p=SONNET_55, rag_tokens=2_800, answer=300, premium=2.5):
    if corpus_tokens > window * 0.8:
        return "retrieval", "corpus does not fit with headroom"
    if needs_per_user_acl:
        return "retrieval", "filter by permission before the model sees text"

    rag = per_call_cost(p, 0, rag_tokens, answer, cached=False)
    rewrite = corpus_tokens * p.cache_write_5m / 1_000_000
    warm = per_call_cost(p, corpus_tokens, 300, answer, cached=True)
    daily_writes = min(edits_per_hour * 24, calls_per_day)   # a rewrite per edit, at most one per call
    long_ctx = warm + (daily_writes * rewrite) / calls_per_day

    if long_ctx <= rag * premium:                 # accept this multiple to skip the retriever
        return "long-context", f"{long_ctx:.4f} vs {rag:.4f} per call"
    return "retrieval", f"{long_ctx:.4f} vs {rag:.4f} per call"

print(choose(150_000, edits_per_hour=1, calls_per_day=10_000, needs_per_user_acl=False))
# ('long-context', '0.0195 vs 0.0086 per call')
```

The 2.5x premium is my own default, not a rule from any source; set it to what a retriever would cost your team to build and run. The function reproduces the cached row of the table, plus the hourly rewrite amortised over 10,000 calls (about a tenth of a cent per call).

Whatever it picks, log `cache_read_input_tokens` and `cache_creation_input_tokens` from the usage block on every call. If the long-context path is chosen and the read count is zero, you are paying the first row of the table.

## Takeaways

- Retrieval is now optional for corpora under roughly 100k tokens that change slowly, are shared by all users, and are queried often. For those, a cached prefix is the simplest thing that works.
- Retrieval is still the product when the corpus is large or volatile, when permissions differ per user, or when traffic is too sparse to keep a cache warm.
- Check the price curve of the model you pick. Haiku 5.5 charges five times more per token past 100,000 tokens, and cache reads count toward that threshold.
- Hybrids are normal: load the stable material up front, retrieve the volatile material on demand, and keep the changing parts at the end of the prompt.
- Decide per corpus with numbers, then monitor the cache hit rate. The decision flips when traffic, edit rate or corpus size moves.

For a case file where content in many languages shaped the architecture, see the EF Academy multilingual platform.
