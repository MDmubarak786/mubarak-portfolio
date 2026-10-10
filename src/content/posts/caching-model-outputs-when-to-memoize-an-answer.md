---
title: "Caching model outputs: when to memoize an answer, and for how long"
description: "Prompt caching does not cache answers. When memoizing the output itself pays, what to put in the key, how to pick a TTL, and a Python wrapper for Claude Sonnet 5.5."
date: 2026-10-10T02:06:00Z
tags: ["caching", "memoization", "LLM", "prompt caching", "Claude Sonnet 5.5", "Python"]
pillar: building
sources:
  - title: "Claude docs: prompt caching (what is cached, TTLs, isolation)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: pricing (Sonnet 5.5 and Haiku 5.5 per-token rates)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Gemini API docs: context caching (implicit and explicit)"
    url: "https://ai.google.dev/gemini-api/docs/caching"
  - title: "Claude Haiku 5.5 migration guide (sampling parameters removed)"
    url: "https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide"
  - title: "Claude docs: increase output consistency"
    url: "https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency"
  - title: "Powertools for AWS Lambda (Python): idempotency utility (expiry and DynamoDB TTL)"
    url: "https://docs.aws.amazon.com/powertools/python/latest/utilities/idempotency/"
draft: false
---

"Caching" in an LLM stack means two different things, and mixing them up is how people build the wrong one. Prompt caching makes the input cheaper. It never stores an answer. If you want the model not to be called at all for a question you have already answered, you have to build that yourself, and it comes with failure modes prompt caching does not have.

## What does prompt caching actually cache?

The Claude docs are explicit. Caching resumes from "specific prefixes in your prompts": the tools, then system, then messages, up to the block you mark. On what it does to the response: "Prompt caching has no effect on output token generation. The response you receive is identical to what you would get if prompt caching were not used." In the multi-turn example, the second request "caches its request content (not the response)." So every call still generates, and bills, its output tokens.

Gemini's page describes the same thing from the input side. Implicit caching is tied to a minimum input token count (4,096 for Gemini 3.8 Flash on the page I read), and "we automatically pass on cost savings if your request hits caches". Nothing on it says responses are stored.

Prompt caches are also isolated for you. The Claude docs say caches are isolated between organisations, and per workspace within an organisation on the Claude API. An output cache you build has none of that unless you put it in the key. That is the first design rule, and I will come back to it.

## When does memoizing the answer pay?

Less often than it feels like. Take the support assistant from the prompt caching post: a 40,000-token cached prefix, a 500-token question and a 300-token answer, 10,000 calls a day. At the pricing page's Sonnet 5.5 rates ($2 input, $0.10 cache read, $10 output per million tokens) one call costs $0.004 for the prefix, $0.001 for the question and $0.003 for the answer: $0.008. Uncached it is $0.084.

Now assume 30% of questions are exact repeats and you memoize them:

| Setup | Daily cost without memo | Saved by memoizing 30% |
|---|---|---|
| Sonnet 5.5, prefix cached | $80 | 3,000 x $0.008 = $24 |
| Sonnet 5.5, no prompt cache | $840 | 3,000 x $0.084 = $252 |
| Haiku 5.5, prefix cached ($0.10 / $0.01 / $0.50) | $6 | 3,000 x $0.0006 = $1.80 |

Prompt caching took $840 to $80. Output memoization takes another $24 off. If the money is why you are considering it, turn prompt caching on first and re-do this sum. Output caching earns its keep elsewhere:

- **Latency.** A hit returns in milliseconds, with no model call in the path.
- **Consistency.** The same question gets the same answer. That matters for policies, prices and anything a customer might screenshot.
- **Load.** A hit consumes no RPM or output tokens per minute, which matters when you are near a rate limit.

The consistency point has a sharper edge on Claude Haiku 5.5. The migration guide says to omit `temperature`, `top_p` and `top_k`: temperature, if sent, must be 1, and other values return a 400. You cannot make a repeat call deterministic by turning the dial down, so memoizing is how you make an answer stable. Anthropic's own consistency page points to other levers (specify the output format, use structured outputs, constrain with examples, ground answers in retrieval), and those are worth trying before you cache.

## What belongs in the cache key?

Everything that can change the right answer. If it is missing from the key, a stale answer is served silently.

- **Tenant.** Never share an output cache across customers unless the question and the answer are public. This is the isolation Anthropic gives your prompt cache for free, and you have to reproduce it.
- **Normalised input.** Collapse whitespace. I would stop there. Lower-casing and stemming are tempting and occasionally change meaning ("can I" versus "can't I").
- **Model ID.** A model migration should not serve last month's answers as if the new model wrote them.
- **Prompt version.** A hash or a version string, bumped on every edit to the system prompt, tools or instructions.
- **Source version.** For RAG, the version or ETag of the documents the answer was grounded in. This one earns its place: it lets you invalidate by event instead of guessing a time.

Semantic caching, which matches near-duplicate questions by embedding similarity, is the version I would not start with. Two questions that embed close together can need different answers, and an exact-match cache fails loudly (a miss) where a semantic one fails quietly (a wrong hit).

## How long should an answer live?

Tie the TTL to what makes the answer wrong, not to a round number.

- **Grounded in a document that has a version:** no TTL at all. Invalidate when the document version changes (it is already in the key, so the old entry simply stops being hit), plus a long backstop expiry to bound storage.
- **Depends on time** (prices, stock, "today's" anything): minutes, or do not cache.
- **Depends on the user** (their account, their data): do not memoize across requests; use prompt caching for the shared prefix and call the model.
- **Pure reference text** (definitions, how-to steps from a stable manual): a day is a reasonable start, and you should measure how often anyone edits the source.

Two things to refuse to store, whatever the TTL. Do not cache anything that did not finish normally: a `refusal`, or a response cut off by `max_tokens`, will be wrong the next hundred times too. And do not cache errors. Check the docs for the full list of `stop_reason` values and store only a completed `end_turn`.

If you keep the cache in DynamoDB, remember the caveat in the Powertools docs: TTL deletion can take up to 48 hours, so store an `expires_at` and check it on read instead of trusting the table to have deleted the row.

## Hands-on: a memoizing wrapper for Claude

```python
import hashlib
import json
import time

import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"
PROMPT_VERSION = "support-v14"   # bump on any edit to system, tools or instructions

def cache_key(tenant: str, question: str, source_version: str) -> str:
    normalised = " ".join(question.split())
    payload = json.dumps(
        {"t": tenant, "q": normalised, "s": source_version, "p": PROMPT_VERSION, "m": MODEL},
        sort_keys=True,
    )
    return "ans:" + hashlib.sha256(payload.encode()).hexdigest()

def answer(store, tenant: str, question: str, source_version: str, grounding: str,
           ttl_seconds: int = 24 * 3600):
    key = cache_key(tenant, question, source_version)
    hit = store.get(key)                      # any store with TTL; check its docs for the exact calls
    if hit and hit["expires_at"] > time.time():
        return hit["text"], "memo"

    r = client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=[
            {"type": "text", "text": "Answer only from the documents provided."},
            {"type": "text", "text": grounding, "cache_control": {"type": "ephemeral"}},
        ],
        messages=[{"role": "user", "content": question}],
    )
    text = next(b.text for b in r.content if b.type == "text")

    if r.stop_reason == "end_turn":           # never memoize refusals, truncations or errors
        store.set(key, {
            "text": text,
            "expires_at": time.time() + ttl_seconds,
            "request_id": r._request_id,      # so a bad answer can be traced and purged
            "model": MODEL,
            "prompt_version": PROMPT_VERSION,
        }, ttl_seconds)
    return text, "model"
```

Both layers are in there on purpose. The `cache_control` block is the prompt cache, which keeps a miss cheap. The `store` is the memo, which keeps a repeat free. Log which path each call took (`memo` or `model`) so you can see the memo hit rate separately from the prompt cache hit rate in `cache_read_input_tokens`.

Two operational notes. First, when several identical questions arrive at once, only one should call the model; the rest should wait for it. A lock or an in-flight map on the key does it, and it matters most right after a deploy empties the cache. Second, store the `request_id` and the prompt version with each answer, so when someone reports a wrong answer you can find every entry written by that prompt and delete them by prefix.

## Takeaways

- Prompt caching stores the input prefix, never the response. Output tokens are billed on every call.
- Turn prompt caching on first and re-price. In the worked example it saves $760 a day; memoizing 30% of calls saves another $24.
- Memoize for latency, consistency and rate-limit headroom more than for money.
- Key on tenant, normalised input, model ID, prompt version and source version. Invalidate by version, expire by backstop.
- Store only completed answers, and record enough metadata to purge by prompt version.

The prefix-caching arithmetic this post builds on is in prompt caching economics, and the retry side of the same pipeline is covered in the post on EventBridge retries and idempotency.
