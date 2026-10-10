---
title: "Model migration playbook: Sonnet 4.5 to 5.5 without regressions"
description: "Sonnet 4.5 retires on 30 November 2026. What breaks, what the bill does once tokens and thinking change, how to eval the move, and how to roll back."
date: 2026-10-10T02:11:00Z
tags: ["migration", "Claude Sonnet 5.5", "evals", "prompt caching", "cost optimisation"]
pillar: building
sources:
  - title: "Claude docs: migration guides index (Sonnet 5.5, Opus 5.5, Haiku 5.5, Fable 5.1)"
    url: "https://platform.claude.com/docs/en/about-claude/models/migration-guide"
  - title: "Claude docs: Claude Sonnet 5.5 migration guide (breaking changes by starting model)"
    url: "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide"
  - title: "Claude docs: model deprecations (Sonnet 4.5 deprecated 30 Sept, retires 30 Nov 2026)"
    url: "https://platform.claude.com/docs/en/about-claude/model-deprecations"
  - title: "Claude docs: pricing (Sonnet 4.5 and 5.5 rates, cache reads, tokenizer note)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: token counting (count under each model ID, free endpoint)"
    url: "https://platform.claude.com/docs/en/build-with-claude/token-counting"
  - title: "Claude docs: thinking (thinking tokens are billed as output tokens)"
    url: "https://platform.claude.com/docs/en/build-with-claude/thinking"
  - title: "Claude docs: preserved thinking (switching models, account-bound blocks)"
    url: "https://platform.claude.com/docs/en/build-with-claude/preserved-thinking"
  - title: "Claude docs: refusals and fallback (stop_reason refusal on Sonnet 5.5)"
    url: "https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback"
draft: false
---

Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) was deprecated on 30 September 2026 and retires on 30 November. The deprecations page names `claude-sonnet-5-5` as the replacement. As I write that is 51 days, and the move is not a find-and-replace: five request settings that 4.5 accepted now return a 400 error, and the bill moves in two directions at once.

This is the playbook I would follow: diff the behaviours, price the delta, run an eval, keep a rollback.

## What actually breaks when you move from 4.5 to 5.5?

The Sonnet 5.5 migration guide has a checklist grouped by starting model. For Sonnet 4.5 the items that fail loudly, with 400 errors, are these:

- **Thinking budgets.** `thinking: {"type": "enabled", "budget_tokens": N}` returns an error that tells you to use adaptive thinking and `output_config.effort` instead. The guide says there is no fixed mapping from a budget to an effort level, so "run your evaluations at two or three levels".
- **Sampling parameters.** A non-default `temperature`, `top_p` or `top_k` returns 400. Remove them.
- **Assistant prefill.** A last assistant turn is rejected with "The conversation must end with a user message." Replace prefills with structured outputs for format, or with instructions in the user turn.
- **Forced tool use.** `tool_choice` of type `any` or `tool` returns 400. Send `auto`, mark the tool `strict: true`, and say in the prompt when to call it.
- **Disabling thinking.** `thinking: {"type": "disabled"}` returns 400. The lowest setting on 5.5 is `{"type": "between_tools"}`, at `high` effort or below.

Then the ones that fail quietly. A request with no `thinking` field now runs with adaptive thinking, where on 4.5 it ran without, so responses can begin with `thinking` blocks and code reading `content[0].text` breaks. `max_tokens` now covers thinking plus text. Tool call arguments should be parsed with a standard JSON parser because escaping can differ. Short notes the model writes between tool calls come back in `thinking` blocks, so an interface that streamed those goes quiet. Move `output_format` to `output_config.format`. Drop the `interleaved-thinking-2025-05-14` beta header, and replace `fine-grained-tool-streaming-2025-05-14` with `eager_input_streaming: true` on the tools that need it. Set `output_config.effort` explicitly: the default on the Claude API is `high`.

If you would rather not do this by hand, the guide says that in Claude Code `/claude-api migrate` applies the model ID swap, the breaking parameter changes and prefill replacement, then "produces a checklist of items to verify manually". Treat its output as a draft diff to review, not a result to merge.

## What does it do to the bill?

Three things move together, and the pricing page gives you the first two.

| Per million tokens | Sonnet 4.5 | Sonnet 5.5 |
|---|---|---|
| Input | $3 | $2 |
| Output | $15 | $10 |
| 5-minute cache write | $3.75 | $2.50 |
| Cache read | $0.30 | $0.10 |

The third is the tokenizer. The guide says 5.5 uses Sonnet 5's tokenizer, and "the same text produces about 30% more tokens, depending on the content" compared with 4.5. Images change too: 5.5 uses the high-resolution tier, so a 2000×1500 image costs about 2.5 times as many tokens. And the minimum cacheable prompt drops from 1,024 tokens to 512, so short prompts that never cached on 4.5 may start to.

Here is the same workload I priced in the prompt caching post: a 40,000-token cached prefix, a 500-token question and a 300-token answer, 10,000 calls a day. On 5.5 I inflate every token count by 1.3, the guide's "about 30%".

| | Sonnet 4.5 | Sonnet 5.5 (tokens ×1.3) |
|---|---|---|
| Prefix, cached | 40,000 × $0.30 = $0.0120 | 52,000 × $0.10 = $0.0052 |
| Question | 500 × $3 = $0.0015 | 650 × $2 = $0.0013 |
| Answer | 300 × $15 = $0.0045 | 390 × $10 = $0.0039 |
| Per call | $0.0180 | $0.0104 |
| Per day | $180 | $104 |

Per-token prices are per million tokens. That is a 42% cut, and almost all of it comes from the cache-read price. Without caching the same traffic is $0.126 against $0.109 per call, $1,260 against $1,092 a day, a 13% cut, which is simply the lower price list offset by the extra tokens.

Now the catch. Adaptive thinking is on by default and thinking tokens "are billed as output tokens, even when the thinking text isn't returned to you". Suppose it adds 500 thinking tokens a call, a number I picked only to show the arithmetic: that is 500 × $10 per million, $0.005 a call, and the cached 5.5 bill becomes $0.0154 a call, $154 a day. The saving drops from 42% to 14%. If your prompts are simple, set effort low or use `between_tools`; if they are not, the extra reasoning may be what you wanted to pay for. Either way, measure it.

## How do I test that nothing regressed?

Freeze the test before you touch the model. If I were migrating the 2024 document pipeline I mentioned in the prompt-injection post (17+ document types at 95% accuracy), the first artefact would be a labelled set of real documents with the answers written down, because 95% is only a regression baseline if you can recompute it.

1. **Build the set from real traffic.** A few hundred logged requests, sampled across your tenants, tools and languages, with a pass/fail check you can run in code: schema validity, exact-match fields, a rubric for free text.
2. **Count tokens under both IDs.** The token counting endpoint is free, and the docs say to count "the same request twice, once with your current model and once with the model you plan to move to". It takes `system`, `tools` and `messages`, so run it over the whole set.
3. **Run both models on the set, and run 5.5 at two or three effort levels.** Compare pass rate, refusal rate, output tokens per call and cost, not just correctness.
4. **Read the diffs.** Sort by cases that passed on 4.5 and fail on 5.5. These are your prompt fixes. The guide says to re-evaluate model-specific prompt instructions against its Sonnet 5.5 prompting page.
5. **Shadow, then roll out behind a flag by conversation**, as in the feature-flag post.

## Hands-on: count both, run both

```python
import anthropic

client = anthropic.Anthropic()
OLD, NEW = "claude-sonnet-4-5-20250929", "claude-sonnet-5-5"
PRICE = {  # USD per million tokens: input, output, cache read
    OLD: (3.00, 15.00, 0.30),
    NEW: (2.00, 10.00, 0.10),
}

def token_delta(system, tools, messages):
    """Same request, counted under each model's tokenizer."""
    n = {m: client.messages.count_tokens(model=m, system=system, tools=tools,
                                          messages=messages).input_tokens
         for m in (OLD, NEW)}
    return n, n[NEW] / n[OLD]

def run(model, system, tools, messages, effort="medium"):
    kw = dict(model=model, system=system, tools=tools, messages=messages)
    if model == NEW:
        kw.update(max_tokens=8192, output_config={"effort": effort})  # no temperature, no prefill
    else:
        kw.update(max_tokens=2048, temperature=0)
    r = client.messages.create(**kw)
    text = "".join(b.text for b in r.content if b.type == "text")   # never content[0]
    i, o, c = PRICE[model]
    u = r.usage
    cost = (u.input_tokens * i + u.output_tokens * o + u.cache_read_input_tokens * c) / 1e6
    return {"text": text, "stop": r.stop_reason, "out": u.output_tokens, "cost": cost}

def compare(cases, grade):
    rows = []
    for case in cases:
        a = run(OLD, **case["request"])
        b = run(NEW, **case["request"])
        rows.append((case["id"], grade(case, a), grade(case, b), a["cost"], b["cost"],
                     b["stop"] == "refusal"))
    return rows   # regressions: rows where old passed and new failed
```

Cache writes are left out of `cost` to keep the sketch short; add `cache_creation_input_tokens` at the write price if your traffic is cold. For the first run, keep tools and system prompts identical on both sides so differences come from the model, not your harness.

## How do I roll back?

Until 30 November the old model ID keeps working, so rollback is changing a flag value. Three details make it safer.

First, pin the model per conversation. The preserved-thinking page lists which models read which thinking blocks, and the docs say an unreadable block is dropped without an error. Sonnet 5.5 reads blocks from Sonnet 5, Opus 4.8, Haiku 4.5 and earlier models. I read the page for the models 5.5 reads, not for what 4.5 does with 5.5's blocks, so check it before you rely on moving a live conversation back.

Second, conversations must stay append-only. 5.5 thinking blocks are signed over the conversation before them, and on accounts created from 31 August 2026 a request that replays a block after earlier history was edited returns 400.

Third, handle refusals as a normal outcome. 5.5 includes safety classifiers; a decline returns `stop_reason: "refusal"` with a `stop_details.category`. Server-side fallback (`fallbacks: "default"`, in beta on the Claude API) retries some categories on Sonnet 5, but not all of them, and it is not available on the Batch API.

One more option exists. Sonnet 4.6 is listed as active with a tentative retirement of not sooner than 17 February 2027, so it buys time. But it is the same migration debt moved to a later date, and the guide says 4.6 already rejects assistant prefill, so some of the work comes due anyway.

## Takeaways

- Sonnet 4.5 retires on 30 November 2026. Five settings return 400 on 5.5: thinking budgets, sampling parameters, prefill, forced tool use and `thinking: disabled`.
- Price the move with the tokenizer: about 30% more tokens, cheaper per token, much cheaper cache reads, and thinking tokens billed as output.
- Freeze a labelled eval set from real traffic, count tokens under both model IDs, and run 5.5 at two or three effort levels.
- Read content blocks by `type`, keep conversations append-only, and handle `refusal` as an expected stop reason.
- Keep the old ID behind a flag until the retirement date, and pin each conversation to one model.

Next up in the series: whether to rent models from a hosted API at all, in the post on hosted APIs versus open weights for a product team.
