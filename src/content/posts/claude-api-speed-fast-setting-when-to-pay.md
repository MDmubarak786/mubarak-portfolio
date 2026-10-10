---
title: "The Claude API speed setting: what 'fast' does and when to pay for it"
description: "As of 10 October 2026, speed: fast gives Opus 5.5 up to 2.5x output tokens per second at twice the price. What it does, what it breaks, and when it pays."
date: 2026-10-10T01:31:00Z
tags: ["Claude API", "fast mode", "latency", "pricing", "Claude Opus 5.5", "prompt caching"]
pillar: model-watch
sources:
  - title: "Claude docs: fast mode (research preview)"
    url: "https://platform.claude.com/docs/en/build-with-claude/fast-mode"
  - title: "Claude docs: prompt caching (invalidation table, speed setting row)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: pricing (fast mode pricing, cache multipliers)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude Platform release notes (22 September 2026: Opus 5.5 and fast mode)"
    url: "https://platform.claude.com/docs/en/release-notes/overview"
  - title: "Claude Opus 5.5 migration guide (fast mode on Opus 5.5)"
    url: "https://platform.claude.com/docs/en/models/opus-5-5/migration-guide"
  - title: "Claude docs: models overview (comparative latency per model)"
    url: "https://platform.claude.com/docs/en/about-claude/models/overview"
draft: false
---

As of 10 October 2026, the Claude API has a documented speed setting. Set `speed: "fast"` on a Claude Opus 5.5 request and, in Anthropic's words, you get "up to 2.5x higher output tokens per second" at "premium pricing". It is a research preview, it is not on every model or platform, and switching it on or off throws away part of your prompt cache. This post covers what it does, what it costs, and a rule for when it is worth paying for.

## What is fast mode?

The fast mode page says it "runs the same model with a faster inference configuration. There is no change to intelligence or capabilities." Same weights, same behaviour, a different serving configuration. You opt in per request with two things: the body field `speed: "fast"` and the beta header `fast-mode-2026-02-01`.

Anthropic announced Opus 5.5 on 22 September 2026, and the release note for that day says "Fast mode (research preview) is available for Claude Opus 5.5 on the Claude API." The page lists three supported models: Opus 5.5 (`claude-opus-5-5`), Opus 5 (`claude-opus-5`) and Opus 4.8 (`claude-opus-4-8`). Sonnet and Haiku are not on the list, so the speed setting is an Opus feature, not a general latency dial.

The constraints, all from the fast mode page:

- **Research preview.** "Contact your account manager to request access", or join the waitlist.
- **Claude API only.** Not on Amazon Bedrock, Claude Platform on AWS, Google Cloud or Microsoft Foundry.
- **Not with the Batch API**, and not with a Priority Tier commitment.
- **Older Opus models behave differently.** Opus 4.7 returns an error for `speed: "fast"`. Opus 4.6 silently runs at standard speed and bills standard rates; check `usage.speed` to see what you got.
- **Separate rate limits.** Fast mode has its own limit, with `anthropic-fast-input-tokens-*` and `anthropic-fast-output-tokens-*` response headers. Exceeding it returns a 429 with a `retry-after` header.

The most important sentence is about what gets faster: "Speed benefits are focused on output tokens per second (OTPS), not time to first token (TTFT)." Fast mode makes long answers finish sooner. It does not make the first token arrive sooner.

## What does it cost?

Fast mode is "priced at a multiplier on standard rates across the full context window". On Opus 5.5 the pricing page lists $8 per million input tokens and $40 per million output tokens, against $4 and $20 at standard speed. That is exactly twice standard on both sides. I am not quoting the multiplier for Opus 5 and Opus 4.8, because I did not check their standard prices against the fast table.

Other modifiers stack. The docs say "prompt caching multipliers apply on top of fast mode pricing", and so do data residency multipliers. I read that as cache writes and reads being computed from the fast input rate, so a cache read on Opus 5.5 in fast mode would be 0.05x of $8, which is $0.40 per million. That is my arithmetic from two documented rules, not a number printed on the page.

## What does it break?

Here is the sentence from the prompt caching invalidation table, which is the one most teams will not read until they see their bill:

> Switching between `speed: "fast"` and standard speed invalidates system and message caches

In the table's columns, the tools cache survives (✓) and the system and messages caches are invalidated (✘). The fast mode page repeats it: "Requests at different speeds do not share cached prefixes."

So fast and standard traffic have separate caches. Three consequences:

- **Pick a speed per workload, not per request.** If a user-facing chat flips between fast and standard depending on load, every flip is a cache miss on the system prompt and the whole conversation so far.
- **Fallback costs a miss.** The docs show an opt-in pattern: catch the 429, retry without `speed`. They add that "falling back from fast to standard speed will result in a prompt cache miss."
- **A miss is expensive on a big prefix.** A 100,000-token prefix written at the fast 5-minute rate (1.25x of $8) is about $1.00, against about $0.04 for a fast read. At standard speed, a read of the same prefix is $0.02. Do the sum for your own prefix before you let anything toggle the setting.

## What does it mean for people shipping products?

I think fast mode answers one question well: a person is watching a long answer arrive, and the wait is the product. I think it answers three questions badly:

1. **Short answers behind big prompts.** If the time is mostly reading the prompt and producing the first token, an OTPS gain does little. The docs say the gains are in OTPS, so measure your TTFT and output split before paying double.
2. **Background work.** Nobody watches a nightly job. Use standard speed, or the Batch API, which fast mode cannot combine with.
3. **Chatty low-value turns.** A support bot answering in two sentences saves milliseconds and pays twice.

A latency budget makes the decision concrete. Suppose a code-rewrite feature returns 4,000 output tokens and your measured standard speed is 60 tokens a second (an illustrative figure; use your own). The generation takes about 67 seconds. At the full "up to 2.5x" it would be about 27 seconds, and the real figure will be lower or equal because the gain is a ceiling. If a developer sits through that wait, saving 40 seconds for twice the output price is a good trade. If the same call runs in a CI job, it is not.

The cost side is small in absolute terms. A call with 20,000 input and 4,000 output tokens on Opus 5.5 costs about $0.16 at standard rates and $0.32 in fast mode. Multiply by your daily volume before you decide, and add the cache-miss cost if you will switch modes.

## What is documented, and what is not

Documented: the parameter and header, the supported models, the premium price on Opus 5.5, the dedicated rate limit and its headers, the `usage.speed` field, and the cache behaviour. Not documented on the pages I read: an absolute tokens-per-second figure for either speed, any commitment about when the preview becomes generally available, or what the price will be after the preview. The "2.5x" is stated as "up to", and Anthropic's own models overview rates comparative latency only as relative labels (Opus 5.5 "Moderate", Sonnet 5.5 "Fast", Haiku 5.5 "Fastest"), with the caveat that actual latency depends on prompt length, output length and thinking effort.

That last point is the practical one. If you need an answer in a few seconds, fast mode on Opus 5.5 is one option and a smaller model at standard speed is another. On the published prices the second costs less per token, though whether its answers are good enough is a question for your own evals, so test both before you decide the setting is the only lever.

## Hands-on: fast with a standard fallback

The call, from the docs' pattern, with automatic retries off so a rate limit fails immediately and you decide what to do:

```python
import anthropic

client = anthropic.Anthropic()

def create_with_fast_fallback(**params):
    try:
        r = client.with_options(max_retries=0).beta.messages.create(
            speed="fast", **params,
        )
    except anthropic.RateLimitError:
        # Fast-mode capacity exhausted. Standard speed means a different cache.
        r = client.beta.messages.create(**params)
    return r, r.usage.speed          # "fast" or "standard"

response, speed = create_with_fast_fallback(
    model="claude-opus-5-5",
    max_tokens=4096,
    betas=["fast-mode-2026-02-01"],     # kept on both the fast call and the standard retry
    messages=[{"role": "user", "content": "Refactor this module to use dependency injection"}],
)
print(speed)
```

Log `usage.speed` on every call. It is how you know which requests were billed at the premium rate and which fell back, and it lets you compute a fast-mode hit rate the way you would a cache hit rate. For 429s, read the `anthropic-fast-output-tokens-remaining` header to see how close you run to the limit.

## Takeaways

- The speed setting exists: `speed: "fast"` plus the `fast-mode-2026-02-01` beta header, research preview, Claude API only.
- It runs on Opus 5.5, Opus 5 and Opus 4.8 only. Sonnet 5.5 and Haiku 5.5 are not supported.
- You pay twice the standard Opus 5.5 rate ($8 and $40 per million) for up to 2.5x output tokens per second. Time to first token is not the target.
- Switching speed invalidates the system and messages caches. The tools cache survives. Choose a speed per workload.
- Pay for it when a human watches a long answer. Skip it for short answers, batch work and background jobs.

If you are pricing a long prefix before you decide, the prompt-caching economics post on this blog has the arithmetic for the cache side.
