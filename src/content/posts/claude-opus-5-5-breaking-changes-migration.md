---
title: "Claude Opus 5.5 breaking changes: thinking can't be disabled"
description: "Opus 5.5 costs less per token than Opus 5 but returns a 400 for thinking disabled and forced tool_choice. The exact errors, the cost trap and a migration checklist."
date: 2026-10-10T01:05:00Z
tags: ["Claude Opus 5.5", "migration", "API", "adaptive thinking", "LLM pricing"]
pillar: model-watch
sources:
  - title: "Claude Platform release notes (Opus 5.5, 22 September 2026)"
    url: "https://platform.claude.com/docs/en/release-notes/overview"
  - title: "Claude docs: Opus 5.5 migration guide (errors, checklist by starting model)"
    url: "https://platform.claude.com/docs/en/models/opus-5-5/migration-guide"
  - title: "Claude docs: pricing (Opus 5.5 and Opus 5 rows)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: models overview (limits, default effort, retirement)"
    url: "https://platform.claude.com/docs/en/about-claude/models/overview"
  - title: "Claude docs: prompt caching (minimum cacheable length per model)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: structured outputs (the replacement for forced tool use)"
    url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs"
draft: false
---

As of 10 October 2026, a request that worked on Claude Opus 5 can fail on Opus 5.5 with a 400, because Opus 5.5 does not let you turn thinking off and does not accept a forced `tool_choice`. Opus 5.5 launched on 22 September at $4 and $20 per million tokens, cheaper than Opus 5's $5 and $25, so it looks like a free upgrade. The cheaper list price is real. Whether the bill falls depends on thinking you can no longer disable.

## What shipped with Opus 5.5?

The release notes record `claude-opus-5-5` as launched on 22 September 2026, with a 1M-token context window by default, 128k max output tokens, and "always-on adaptive thinking". Fast mode is available as a research preview on the Claude API. The docs list retirement as not sooner than 22 September 2027. The models overview tells you to "start with Claude Opus 5.5 for most workloads".

| | Opus 5 | Opus 5.5 |
|---|---|---|
| Input / output per million tokens | $5 / $25 | $4 / $20 |
| 5m cache write | $6.25 | $5 |
| Cache read | $0.50 | $0.20 |
| Default effort | `high` | `medium` |
| `thinking: {"type": "disabled"}` | accepted | 400 |
| Forced `tool_choice` | accepted | 400 |

Opus 5.5 cache reads are 0.05x the base input price, against 0.1x on most other models. The minimum cacheable prompt is 512 tokens, down from 1,024 on Opus 4.8. Priority Tier is not supported on Opus 5.5, so if you hold a commitment, plan capacity separately.

## What breaks in a request?

The migration guide lists the settings the API rejects with a 400:

1. **Thinking.** Both `thinking: {"type": "disabled"}` and `thinking: {"type": "enabled", "budget_tokens": N}` fail, with the message `"thinking.type.disabled" is not supported for this model.` (or `.enabled`). Omit `thinking`, or send `{"type": "adaptive"}`, which is equivalent. Control depth with `effort`, which has five levels: `low`, `medium`, `high`, `xhigh`, `max`.
2. **Forced tool use.** `tool_choice` types `any` and `tool` fail with `tool_choice: type "tool" and "any" are not supported for this model.`, including on the token counting endpoint. Use `auto` (or `none`).
3. **Sampling parameters.** Omit `temperature`, `top_p` and `top_k`; non-default values fail.
4. **Prefill.** A final assistant turn fails.
5. **Computer use.** On the Claude API and Google Cloud, `computer_20251124` fails. Use `computer_toolset_20260801`. Bedrock still accepts `computer_20251124`.

If you are coming from Opus 4.8 or earlier, there is a bigger change: those models ran without thinking unless you asked. On Opus 5.5 a request with no `thinking` field runs with thinking. The migration guide says a request moving from Opus 5 needs only the first group of its checklist, while one coming from Opus 4.8 also has to handle thinking appearing where it never did.

## What changes in the response?

Every response can begin with `thinking` blocks, so code that reads `content[0].text` breaks. Select blocks by `type`. In a tool-use loop, pass the assistant message back as received, including empty thinking blocks; the API rejects edited, reordered or partially dropped thinking blocks with a 400.

`thinking.display` defaults to `"omitted"`: blocks arrive with an empty `thinking` field and a `signature`. Set `"summarized"` if your UI shows reasoning. One quieter change: on Opus 5.5 the notes the model writes between tool calls come back as `thinking` blocks, at most one before each tool call, and they are empty at the default display. If your product streams those notes to users as progress, it now goes silent between tool calls until you set a display value that returns text (`"updates"` is in beta; `"summarized"` returns both).

The guide also says Opus 5.5 can return `stop_reason: "refusal"` with a `stop_details` category such as `bio`, `cyber` or `reasoning_extraction`, and tells you to handle it and configure fallback.

## What it means for people shipping products

The headline is cost. Thinking tokens are billed as output tokens even when the thinking text is omitted from the response, and `max_tokens` covers thinking plus text. The guide's own checklist says to re-baseline cost and latency at your chosen effort level. I would treat the price cut as a hypothesis until a usage log says otherwise.

Take a call that returned 400 output tokens on Opus 5 with thinking disabled. On Opus 5 that is 400 × $25 per million, or $0.0100. On Opus 5.5 the same answer is 400 × $20, or $0.0080, a 20% saving. Now let adaptive thinking add T tokens. The call costs (400 + T) × $20, and it matches the old $0.0100 at T = 100. Above 100 thinking tokens per call, about a quarter of the answer's length, Opus 5.5 costs more than Opus 5 did. At T = 1,000 it is $0.0280, 2.8 times the old call. Those figures are an illustration with assumed token counts, not a measurement of the model.

So I would not carry a setting over blindly. The default effort fell from `high` to `medium`, so an unchanged request now thinks less than it did on Opus 5. Run an effort sweep on your own evals, step down where quality holds, and step up only for the hardest work.

For pure extraction and routing, where you used to disable thinking to save money, consider whether Opus is the right tier. Haiku 5.5 still accepts `thinking: {"type": "disabled"}` at `high` effort or below, and Sonnet 5.5 has a `between_tools` setting for the same purpose. That is a model-choice question, not a migration chore.

## Hands-on: before, after, and a checklist

Before, accepted by Opus 5 and rejected by Opus 5.5:

```python
r = client.messages.create(
    model="claude-opus-5",
    max_tokens=1024,
    thinking={"type": "disabled"},
    tools=[VERDICT_TOOL],
    tool_choice={"type": "tool", "name": "record_verdict"},
    messages=msgs,
)
```

After:

```python
r = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=8192,                              # now covers thinking plus text
    output_config={"effort": "medium"},           # the only thinking control
    tools=[{**VERDICT_TOOL, "strict": True}],     # every object needs additionalProperties: false
    tool_choice={"type": "auto"},
    messages=msgs,                                # the prompt must say when to call record_verdict
)
text = "".join(b.text for b in r.content if b.type == "text")   # not content[0]

# tool loop: echo the assistant turn unchanged, thinking blocks included
msgs.append({"role": "assistant", "content": r.content})
```

The migration guide says strict tool use accepts a subset of JSON Schema, so check each tool's `input_schema` before adding `strict: true`. On Bedrock, structured outputs are not available for Opus 5.5, so send `auto` without `strict`, say in the prompt when the tool applies, and validate the tool input in your code.

The checklist, from the guide for a service on Opus 5:

1. Change the model ID to `claude-opus-5-5`.
2. Delete `thinking: {"type": "disabled"}` and any `budget_tokens`.
3. Set `output_config.effort` explicitly.
4. Replace forced `tool_choice` with `auto` plus strict tools or structured outputs.
5. Read content blocks by `type`; return thinking blocks unmodified in tool loops.
6. Raise `max_tokens`; at `xhigh` or `max`, the guide says to start at 64k.
7. Handle refusals and fallback; render progress from `thinking` blocks if you stream it.
8. Keep conversations append-only: editing `system`, `tools` or earlier turns while replaying thinking blocks can return a 400.
9. Log `usage` before and after and compare cost per request, not price per token.

## Takeaways

- Opus 5.5 is $4 and $20 per million tokens, but thinking is always on and billed as output; compare cost per request.
- Thinking disabled, forced `tool_choice`, non-default sampling and prefill all return 400. Fix them before the model string changes.
- The default effort is now `medium`; run an effort sweep instead of copying your Opus 5 setting.
- Read blocks by type and echo the assistant turn unchanged, or tool loops and streaming UIs break.

The Sonnet 4.5 retirement on 30 November 2026 brings a similar set of 400s, and the post "Claude Sonnet 4.5 retires on 30 November 2026: a migration checklist" walks through them.
