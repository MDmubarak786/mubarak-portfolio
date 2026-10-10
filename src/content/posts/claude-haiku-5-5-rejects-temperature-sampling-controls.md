---
title: "Claude Haiku 5.5 rejects temperature: sampling controls are disappearing"
description: "As of 10 October 2026, Haiku 5.5, Sonnet 5.5 and Opus 5.5 return 400 for non-default temperature, top_p and top_k. What to do about determinism and variety."
date: 2026-10-10T01:29:00Z
tags: ["Claude Haiku 5.5", "temperature", "API design", "sampling parameters", "migration"]
pillar: model-watch
sources:
  - title: "Claude Platform release notes (7 October 2026: Haiku 5.5 breaking changes; 20 August: Python SDK v1.0)"
    url: "https://platform.claude.com/docs/en/release-notes/overview"
  - title: "Claude Haiku 5.5 migration guide (Remove sampling parameters)"
    url: "https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide"
  - title: "What's new in Claude Haiku 5.5"
    url: "https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5"
  - title: "Claude Opus 5.5 migration guide (sampling parameters removed)"
    url: "https://platform.claude.com/docs/en/models/opus-5-5/migration-guide"
  - title: "Claude Sonnet 5.5 migration guide (sampling parameters return an error)"
    url: "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide"
  - title: "Prompting Claude Haiku 5.5 (effort, thinking, JSON output)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5"
draft: false
---

As of 10 October 2026, a request to Claude Haiku 5.5 with `temperature: 0` fails with a 400 error. So does the same request to Sonnet 5.5 and Opus 5.5, and the current Python SDK will not even let you type the argument. If your classification, extraction or routing code was written around "set temperature to zero and trust it", it needs a different design, and Haiku 5.5, the cheapest current tier, is where that code will hit the wall first.

## What exactly did Haiku 5.5 change?

Anthropic shipped `claude-haiku-5-5` on 7 October 2026. The release notes list its breaking changes in one sentence: "Manual extended thinking (`budget_tokens`), the sampling parameters `temperature`, `top_p`, and `top_k`, and assistant message prefill can each return a 400 error." Code written for Haiku 4.5 can break on any of the three.

The migration guide is more precise than the release notes, and the precision matters if you have a shared client wrapper:

- If a request includes `temperature`, it must be `1`.
- If it includes `top_p`, it must be `0.99`, which is the default.
- Any other `temperature` or `top_p` value returns a 400, "including a `top_p` of `1`".
- Any `top_k` value returns a 400.
- A request that includes both `temperature` and `top_p` returns a 400.

The guide's advice is to "omit all three and use prompting to guide the model's behavior instead." So the safe move is not to send them, rather than to send the defaults. A wrapper that always passes `temperature=1.0` happens to work today; a wrapper that passes `top_p=1.0` does not.

Haiku 5.5 also keeps adaptive thinking on by default, and thinking tokens count toward `max_tokens`. That is a separate break, but it is the one that bites next once the sampling parameters are gone: a small `max_tokens` can end the response after a thinking block and before any text.

## Is this only Haiku?

No, and Haiku is the narrowest way to read this change. The Opus 5.5 migration guide says that setting `temperature`, `top_p` or `top_k` "to any non-default value on Claude Opus 4.7 and later models, including Claude Opus 5.5, returns a 400 error." The Sonnet 5.5 guide says the same of Sonnet 5.5: "a non-default value returns a 400 error." The older models that still accept them are Sonnet 4.6 and earlier, and Haiku 4.5.

The SDK moved first. The 20 August release notes say Python SDK v1.0 removed "the `temperature`, `top_p`, and `top_k` parameters on Messages methods", and the Opus guide adds that passing them now "raises a `TypeError`". So on the current Python SDK you find out at the call site, not from the API.

The direction is clear: the current generation of Claude models is steered by prompts and by effort, not by sampling knobs. I read that as a design decision, not a temporary gap. The docs do not explain why, and I will not guess at the model internals.

## What does it mean for people shipping products?

Three things change in practice.

**"Temperature zero" was never a contract.** The Opus guide says it directly: "If you were using `temperature = 0` for determinism, note that it never guaranteed identical outputs on prior models." Teams that treated it as a guarantee were relying on a habit. Now the habit is gone, which is the right moment to check what you actually needed.

**Decide whether you need determinism or stability.** Identical bytes for identical input is a caching problem. Stable decisions across near-identical inputs is a prompt and evaluation problem. They need different tools, and conflating them is how people end up asking for `temperature: 0` in the first place.

**Variety has to come from the prompt.** If you used a high temperature to get different drafts, the replacement is to ask for different things: give the model a list of angles, ask for several candidates in one response, or vary an instruction per call. That is a design argument from me, not a documented recipe, but it follows from the docs' own advice to guide behaviour with prompting.

For a classifier or router specifically, the documented levers are these:

- **Constrain the output.** The Haiku migration guide says to use "structured outputs, or tools with enum fields for classification" where you once used prefill to force a format. An enum cannot return a label you did not define, whatever the sampling does.
- **Control thinking with effort.** The Haiku prompting guide calls effort "the main control for how much Claude Haiku 5.5 thinks": `low` is "the cheapest and fastest level" for "simple, high-volume requests", `medium` is the default. You can also send `thinking: {"type": "disabled"}` at `low`, `medium` or `high` effort; at `xhigh` and `max` that returns a 400.
- **Keep the prompt prefix byte-stable.** Changing the top-level effort between requests invalidates the prompt cache for the conversation's messages, so pick one effort per workload instead of toggling it per request.

I would add two checks of my own. Cache final answers keyed on a hash of the normalised input plus your prompt version, so repeated inputs return the stored label and never hit the model twice. And measure agreement: run each item in your eval set several times and report how often the label changes. If it changes on more than a few percent of items, the prompt is ambiguous, and no sampling parameter was ever going to fix that.

## Hands-on: a classifier that sends no sampling parameters

First, the sanitiser. If you have a shared client used by several models, strip the parameters by model instead of letting a 400 reach production:

```python
REJECTS_SAMPLING = {"claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"}

def clean(model: str, params: dict) -> dict:
    """Drop sampling parameters for models that return 400 on non-default values."""
    if model in REJECTS_SAMPLING:
        return {k: v for k, v in params.items() if k not in ("temperature", "top_p", "top_k")}
    return params
```

Second, the classifier itself: a forced tool call with an enum, no sampling parameters, no prefill.

```python
import anthropic

client = anthropic.Anthropic()

LABELS = ["billing", "bug", "feature_request", "account_access", "other"]

CLASSIFY = {
    "name": "classify",
    "description": "Record the single best category for the support message.",
    "input_schema": {
        "type": "object",
        "properties": {"label": {"type": "string", "enum": LABELS}},
        "required": ["label"],
    },
}

def classify(message: str) -> str:
    r = client.messages.create(
        model="claude-haiku-5-5",
        max_tokens=1024,                       # thinking tokens count toward this
        system="You triage support messages. Pick exactly one category.",
        tools=[CLASSIFY],
        tool_choice={"type": "tool", "name": "classify"},
        messages=[{"role": "user", "content": message}],
    )
    block = next(b for b in r.content if b.type == "tool_use")   # select by type, not position
    return block.input["label"]
```

The docs say Haiku 5.5 "accepts a forced `tool_choice` (`any` or a named tool), but the response starts with the tool call and has no `thinking` block." That is fine for simple routing. If a category needs reasoning, use `tool_choice: {"type": "auto"}` and say in the prompt when to call the tool, as the migration guide suggests.

Third, the effort setting goes in `output_config`. In the raw request body the migration guide shows it as:

```json
{
  "model": "claude-haiku-5-5",
  "max_tokens": 16000,
  "thinking": { "type": "adaptive" },
  "output_config": { "effort": "medium" }
}
```

Start at `medium`, try `low` on your eval set, and keep whichever is cheapest while the agreement rate holds. Check your SDK version for how `output_config` is exposed.

## Takeaways

- On Haiku 5.5, Sonnet 5.5 and Opus 5.5, omit `temperature`, `top_p` and `top_k`. Haiku 5.5 tolerates `temperature: 1` and `top_p: 0.99` only; everything else, including any `top_k`, returns a 400.
- The Python SDK v1.0 no longer defines the parameters, so the failure shows up as a `TypeError` before the request leaves your machine.
- Treat determinism as a caching and constraint problem: enum tools or structured outputs for the label, a cache for repeated inputs.
- Get variety by changing the prompt, not a knob: different angles, several candidates per call.
- Choose one effort level per workload, test `low` against `medium` on your own evals, and give `max_tokens` room for thinking.

If this is part of a cost review, the prompt-caching post on this blog prices the same Haiku 5.5 against Sonnet 5.5 on a 10,000-call-a-day RAG workload, which is the next thing to check once the 400s are gone.
