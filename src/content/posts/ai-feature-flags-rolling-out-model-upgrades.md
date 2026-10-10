---
title: "AI feature flags: rolling out model upgrades safely"
description: "A model ID is a config value that behaves like a code deploy. Bucket by conversation, shadow first, watch tokens and refusals, and keep the old model until retirement."
date: 2026-10-10T02:10:00Z
tags: ["feature flags", "rollout", "model upgrades", "OpenFeature", "Claude Sonnet 5.5", "observability"]
pillar: building
sources:
  - title: "Claude docs: model deprecations (status table, 60 days' notice, Sonnet 4.5 retirement)"
    url: "https://platform.claude.com/docs/en/about-claude/model-deprecations"
  - title: "Claude docs: Claude Sonnet 5.5 migration guide"
    url: "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide"
  - title: "Claude docs: preserved thinking (switching models mid-conversation, account-bound blocks)"
    url: "https://platform.claude.com/docs/en/build-with-claude/preserved-thinking"
  - title: "Claude docs: refusals and fallback (stop_reason refusal, categories, billing)"
    url: "https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback"
  - title: "Claude docs: pricing (Sonnet 4.5 and 5.5 rates, Batch API discount)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "OpenFeature: evaluation API (getStringDetails, reason and variant)"
    url: "https://openfeature.dev/docs/reference/concepts/evaluation-api"
  - title: "OpenFeature: evaluation context and the targeting key"
    url: "https://openfeature.dev/docs/reference/concepts/evaluation-context"
  - title: "LaunchDarkly docs: creating guarded rollouts"
    url: "https://launchdarkly.com/docs/home/releases/creating-guarded-rollouts"
draft: false
---

Anthropic told developers on 30 September that Claude Sonnet 4.5 retires on 30 November 2026, with `claude-sonnet-5-5` as the recommended replacement. That is two months to move traffic from a model you know to one you do not, and "change the model ID" is the easy part. The hard part is moving it in steps you can reverse.

This post is how I would roll a model upgrade out behind a feature flag: what to bucket on, what to watch, and the one trap that a plain percentage split walks into.

## Why isn't a model upgrade just a config change?

Because the model ID is the smallest part of the diff. The Sonnet 5.5 migration guide lists behaviours that change underneath an unchanged prompt. On 5.5 a request with no `thinking` field runs with adaptive thinking; on 4.5 it ran without. Thinking tokens are billed as output tokens, and `max_tokens` now covers thinking plus text. Content can start with `thinking` blocks, so code that reads `content[0].text` breaks. The same text produces about 30% more tokens than on 4.5, "depending on the content". Non-default `temperature`, `top_p` and `top_k` return a 400 error, and so does an assistant prefill. Sonnet 5.5 also runs safety classifiers that can decline a request: a decline returns `stop_reason: "refusal"` with a category in `stop_details`, so your code needs a branch for it.

Prices move too. Sonnet 4.5 is $3 input and $15 output per million tokens on the pricing page; Sonnet 5.5 is $2 and $10. Cheaper per token, more tokens, more output from thinking: you cannot tell from the price list which way your bill goes. You have to measure it on your own traffic, which is what a staged rollout is for.

The deprecations page gives you the clock. Anthropic commits to "at least 60 days' notice before model retirement for publicly released models", and after the retirement date "requests to retired models will fail". Until then the old ID keeps working, so rollback is a flag flip, not an emergency. That only holds if you rolled out through a flag in the first place.

## What should the flag bucket on?

The conversation, not the request. This is the trap.

A per-request percentage split puts turn one of a chat on 4.5 and turn two on 5.5. The preserved-thinking docs say what happens next: if the receiving model cannot read a thinking block, "the API drops it from that request without an error", and the drop is silent unless you send a beta header. Sonnet 5.5 reads blocks from Sonnet 5, Opus 4.8, Haiku 4.5 and earlier models, but not from Opus 5, Opus 5.5 or any Fable or Mythos model. The docs add that the API never edits your `messages` array, so the history survives; the model simply answers without that reasoning. Your eval would see a quality dip in the mixed conversations and blame the new model.

The migration guide adds a second reason. Each Sonnet 5.5 thinking block is signed over the conversation before it. For accounts created on or after 31 August 2026, a request that replays a block after an edit to earlier history returns a 400 error. Thinking blocks from 5.5 also "work only in the account that produced them, or in an account linked to it", which matters if you run separate dev and prod accounts and copy transcripts between them.

So pick the model once, on the first turn, and store it on the conversation record. The flag decides new conversations only. OpenFeature's docs call the evaluation context's targeting key "a string uniquely identifying the subject", and say many flag systems use it for "fractional evaluation or percentage-based rollouts deterministically". Use the conversation ID as that key, then write the answer down so a later flag change cannot move a chat mid-flight.

## What does a safe rollout look like?

I would run four stages, each with an exit condition written before it starts.

**1. Replay offline.** Take logged requests and run them on the new model through the Batch API, which the pricing page lists at a 50% discount on input and output tokens; Sonnet 5.5 batch is $1 input and $5 output per million. A worked example: 20,000 logged requests averaging 3,000 input and 400 output tokens is 60M input and 8M output tokens, which is $60 plus $40, about $100. Apply the roughly 30% tokenizer increase and it is nearer $130, before thinking tokens. The calculation is the point, not my numbers; swap in yours. One catch from the refusals page: the `fallbacks` parameter is not supported on the Batch API, so refusals show up as refusals.

**2. Shadow live traffic.** Send a copy of each request to the new model after the user has their answer from the old one, store both outputs, and show users nothing. It doubles spend on that slice, so sample. Only shadow requests whose tools are read-only, or you will run side effects twice. This is my design argument, not a vendor recipe.

**3. Percentage rollout by conversation.** A ladder such as 1%, 5%, 25%, 50%, 100% is my habit, not a standard. The rule that matters is that each step holds long enough to see your slowest signal, usually user feedback or a downstream metric, not just error rates.

**4. Guarded, then default.** If your flag platform supports it, let it hold the line. LaunchDarkly's guarded rollouts raise the percentage on a schedule and use sequential testing to flag "a statistically significant negative impact on a monitored metric". Automatic rollback is a per-metric setting, each step needs a minimum number of contexts before it advances, and the page does not state a numeric threshold, so do not assume one. A step cannot exceed 50% because each step needs an equal split.

## Which metrics should I watch?

Log these per request, with the model and variant attached, and compare arms:

| Signal | Where it comes from | What a regression looks like |
|---|---|---|
| Input tokens per request | `usage.input_tokens` | Up about 30% is expected; far more means a prompt problem |
| Output tokens per request | `usage.output_tokens`, includes thinking | Bill rises with no quality gain: effort too high |
| Cache read share | `cache_read_input_tokens` over total input | Drops if the prefix or minimum changed |
| Refusal rate | `stop_reason == "refusal"`, by `stop_details.category` | Any rise on benign traffic |
| 4xx rate | HTTP 400 with the removed-parameter messages | Non-zero means a parameter you forgot to remove |
| Cost per conversation | tokens times price, summed per conversation | Compare arms, not requests |
| Task success | your eval set or a user thumbs-down rate | The metric that decides the rollout |

Refusals deserve a line of their own. The refusals page says a refusal before any output is billed when its category is `bio`, `frontier_llm` or `reasoning_extraction`, so a rise in refusals is both a quality signal and a cost signal.

## Hands-on: the flag and the request

OpenFeature's string flag evaluation is `get_string_details` in Python, which returns the value plus a reason and variant. The sketch resolves the model once per conversation, then builds a request that respects what each model accepts. The flag key and the context argument name are mine; check the OpenFeature SDK docs for the exact parameter and import path.

```python
import json, time, anthropic

OLD, NEW = "claude-sonnet-4-5-20250929", "claude-sonnet-5-5"
llm = anthropic.Anthropic()

def pick_model(flags, conversation) -> str:
    """Decide once, on the first turn; store the answer on the conversation."""
    if conversation.get("model"):
        return conversation["model"]
    # EvaluationContext("targetingKey", {...}) is the shape the docs show;
    # check the SDK docs for how to pass it to get_string_details.
    ctx = EvaluationContext(conversation["id"], {"tenant": conversation["tenant"]})
    details = flags.get_string_details("chat-model", OLD, ctx)
    conversation["model"] = details.value        # pinned for the life of the chat
    conversation["flag_reason"] = details.reason
    return conversation["model"]

def build(model: str, messages: list) -> dict:
    if model == NEW:                              # no sampling params, no prefill; thinking is on
        return dict(model=model, max_tokens=8192, messages=messages,
                    output_config={"effort": "medium"})
    return dict(model=model, max_tokens=4096, messages=messages, temperature=0.2)

def run(flags, conversation, messages):
    model = pick_model(flags, conversation)
    t0 = time.time()
    r = llm.messages.create(**build(model, messages))
    u = r.usage
    print(json.dumps({
        "conversation": conversation["id"], "model": model,
        "reason": conversation.get("flag_reason"), "stop": r.stop_reason,
        "in": u.input_tokens, "out": u.output_tokens,
        "cache_read": u.cache_read_input_tokens, "ms": int((time.time() - t0) * 1000),
    }))
    return [b.text for b in r.content if b.type == "text"]   # never content[0]
```

One log line per request is enough to build every row of the table above. Keep the default value of the flag on the old model, so a flag-service outage fails to the known-good behaviour; OpenFeature's docs say an error returns "the default value", so choose it carefully. I would also put the flag key, the default and the `build` function through code review like any other change. Having reviewed 1,300+ PRs, the diffs that worry me are the ones that look like config.

## Takeaways

- Bucket by conversation and pin the model on the first turn. A per-request split silently drops thinking blocks across models and muddies your eval.
- Replay logged traffic through the Batch API before any user sees the new model, and price it with the tokenizer increase included.
- Compare arms on tokens, thinking output, cache share, refusals and cost per conversation, not only on errors.
- Default the flag to the old model, keep it until the retirement date, and treat the deprecations page as your deadline: 30 November for Sonnet 4.5.
- Decide exit conditions for each stage before you start it.

The next post turns these stages into a concrete playbook for the Sonnet 4.5 to 5.5 move: what breaks, what it costs, and how to roll back.
