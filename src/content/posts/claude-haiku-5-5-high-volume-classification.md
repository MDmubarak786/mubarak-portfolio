---
title: "Claude Haiku 5.5 for classification: what changed and what it costs"
description: "Haiku 5.5 launched 7 October 2026 at $0.10 input and $0.50 output per million tokens. What changed from 4.5, what returns a 400, and a classification bill priced out."
date: 2026-10-10T01:04:00Z
tags: ["Claude Haiku 5.5", "classification", "LLM pricing", "structured outputs", "prompt caching"]
pillar: model-watch
related: adr-007-ai-document-processing
sources:
  - title: "Claude Platform release notes (Haiku 5.5 launch, 7 October 2026)"
    url: "https://platform.claude.com/docs/en/release-notes/overview"
  - title: "Claude docs: Haiku 5.5 overview (model ID, limits, pricing tiers)"
    url: "https://platform.claude.com/docs/en/models/haiku-5-5/overview"
  - title: "Claude docs: Haiku 5.5 migration guide (settings that return errors)"
    url: "https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide"
  - title: "Claude docs: Prompting Claude Haiku 5.5 (effort, thinking off, refusals)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5"
  - title: "Claude docs: pricing (Haiku 5.5 and Haiku 4.5 rows)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Anthropic: Claude Haiku 5.5 announcement"
    url: "https://www.anthropic.com/claude-haiku-5-5"
  - title: "Claude docs: structured outputs (json_schema, enum, limits)"
    url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs"
  - title: "Claude docs: prompt caching (minimum cacheable length per model)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
draft: false
---

As of 10 October 2026, Claude Haiku 5.5 (`claude-haiku-5-5`, released 7 October) is the model Anthropic's own docs point at for "classification, extraction, and routing", and it lists at a tenth of Haiku 4.5's input price. If you run a labelling step at volume, the bill can fall by an order of magnitude. But several request settings that worked on Haiku 4.5 now return a 400, and thinking is on by default, so read the changes before you flip the model string.

## What shipped with Haiku 5.5?

The release notes list the launch on 7 October 2026: 1M-token context, 128k max output tokens, and adaptive thinking steered by an `effort` parameter. Haiku 4.5 had 200k and 64k. The model page describes it as "For high-volume, latency-sensitive tasks such as classification, extraction, and routing", and Anthropic's announcement calls it "the cheapest, fastest, and most capable small model we've ever released". It is the first Haiku with effort levels; the default is `medium`.

It is available on the Claude API, Amazon Bedrock, Google Cloud, Microsoft Foundry and Claude Platform on AWS. The docs list retirement as not sooner than 7 October 2027.

Pricing has two tiers, split by prompt length:

| Per million tokens | Input | 5m cache write | Cache read | Output |
|---|---|---|---|---|
| Haiku 5.5, prompts up to 100,000 tokens | $0.10 | $0.125 | $0.01 | $0.50 |
| Haiku 5.5, prompts over 100,000 tokens | $0.50 | $0.625 | $0.05 | $2.50 |
| Haiku 4.5 | $1.00 | $1.25 | $0.10 | $5.00 |

The Batch API takes 50% off input and output. Anthropic's announcement says Haiku 5.5 costs about 75% less than Haiku 4.5 on average, which it breaks down as about 90% lower under 100k tokens and 50% lower above. That is a vendor figure, and it already includes the tokenizer effect below.

## What breaks when you move from Haiku 4.5?

The migration guide lists these as errors on Haiku 5.5:

- **Manual thinking budgets.** `thinking: {"type": "enabled", "budget_tokens": N}` returns a 400. Use adaptive thinking and `effort`.
- **Sampling parameters.** `temperature` must be `1` if present, and `top_p` must be `0.99`. Any `top_k` returns a 400, and so does sending both `temperature` and `top_p`. Omit all three.
- **Assistant prefill.** A final assistant turn returns a 400, even with thinking off. A classifier that prefills `{"label": "` needs structured outputs or a tool with an enum instead.
- **Old computer-use tool.** `computer_20250124` returns a 400 on the Claude API, Google Cloud and Amazon Bedrock; the replacement differs by platform.
- **Structured outputs on Bedrock.** Not available for Haiku 5.5 there.

Two things did not break, and both matter for classifiers. Forced `tool_choice` is still accepted, though the response then has no thinking block. And `thinking: {"type": "disabled"}` still works at `low`, `medium` and `high` effort; at `xhigh` or `max` it returns a 400.

Two things are new. Haiku 5.5 runs safety classifiers that can decline a request with `stop_reason: "refusal"`, and there is no server-side fallback, so handle it in your client. And the docs say these refusals are new if you are coming from Haiku 4.5, so a label pipeline that never checked `stop_reason` can now see unlabelled items.

## What does it do to your token counts?

Haiku 5.5 uses the newer tokenizer shared with Claude 4.7 and later. The docs say the same text produces "approximately 30% more tokens" than on Haiku 4.5. So a tenth of the per-token price is not a tenth of the bill; the per-document token count rises by about 30%, and anything you sized against 4.5 counts, such as `max_tokens`, needs recounting.

Adaptive thinking is on by default, and thinking tokens count toward `max_tokens` and are billed as output. A response can begin with a `thinking` block, so code that reads `content[0].text` breaks. A small `max_tokens` can stop after thinking and before any text.

One change helps: the minimum cacheable prompt is 512 tokens on Haiku 5.5, down from 4,096 on Haiku 4.5. A shared prefix of label definitions and a few examples that could never cache before can cache now.

## What it means for people shipping products

For a single-turn classifier with a short, constrained output, thinking is the cost I would control first. The prompting guide says that in Anthropic's testing, telling the model in the prompt to answer directly did not stop it thinking. The levers that work are a lower `effort` or turning thinking off. I would start with thinking off, build a labelled set, and move to `low` effort only if accuracy on the hard cases needs it.

I would also put the label definitions and examples in a cached prefix, keep the per-item text after the breakpoint, and use a JSON schema with an `enum` so the output cannot drift. If you need variety or determinism, you no longer have `temperature` to reach for. Measure run-to-run agreement on your own set.

The 2024 document-processing pipeline I worked on handled 17+ document types, so deciding what kind of thing you are looking at is a problem I know the shape of. A cheap, fast labelling step is the work Haiku 5.5 is aimed at. Read what follows as design reasoning from the docs, not a result from that system. The sensible shape is the one Anthropic's announcement suggests for agents: a small model on the narrow, high-volume step and a bigger one for the hard cases.

## Hands-on: a classifier request and its bill

A request with the shared prefix cached, thinking off and an enum-constrained answer:

```python
import json
import anthropic

client = anthropic.Anthropic()

LABELS = ["billing", "bug_report", "feature_request", "account_access", "other"]
DEFINITIONS = open("label-definitions.md").read()  # >= 512 tokens, identical every call

def classify(text: str) -> dict:
    r = client.messages.create(
        model="claude-haiku-5-5",
        max_tokens=256,
        thinking={"type": "disabled"},          # allowed at high effort or below
        system=[{
            "type": "text",
            "text": DEFINITIONS,
            "cache_control": {"type": "ephemeral"},   # breakpoint after the stable part
        }],
        messages=[{"role": "user", "content": text}],   # ends with a user turn: no prefill
        output_config={"format": {
            "type": "json_schema",
            "schema": {
                "type": "object",
                "properties": {"label": {"type": "string", "enum": LABELS}},
                "required": ["label"],
                "additionalProperties": False,
            },
        }},
    )
    if r.stop_reason == "refusal":
        return {"label": None, "refused": True}   # no server-side fallback on Haiku 5.5
    out = next(b.text for b in r.content if b.type == "text")
    label = json.loads(out)["label"].lower()      # docs: enum casing can change, compare case-insensitively
    return {"label": label, "cache_read": r.usage.cache_read_input_tokens}
```

Now the arithmetic. Assume 100,000 documents a day. On Haiku 5.5's tokenizer the shared prefix is 1,500 tokens, each document 600, and the answer 30. The same texts are about 30% shorter on Haiku 4.5's tokenizer: 1,150, 460 and 23. At 1,150 tokens the prefix is below Haiku 4.5's 4,096-token minimum, so it is billed at full input price there.

| | Haiku 4.5 | Haiku 5.5, thinking off | Haiku 5.5, 300 thinking tokens |
|---|---|---|---|
| Prefix | 1,150 × $1 = $0.001150 | 1,500 × $0.01 = $0.000015 | $0.000015 |
| Document | 460 × $1 = $0.000460 | 600 × $0.10 = $0.000060 | $0.000060 |
| Output | 23 × $5 = $0.000115 | 30 × $0.50 = $0.000015 | 330 × $0.50 = $0.000165 |
| Per call | $0.001725 | $0.000090 | $0.000240 |
| Per day | $172.50 | $9.00 | $24.00 |

Per-token prices are per million tokens. Cache writes are excluded: one cold write of the 1,500-token prefix costs 1,500 × $0.125 per million, about $0.0002.

Three readings. Haiku 5.5 with thinking off is about 19 times cheaper than 4.5 on this workload, more than the 10x list cut, because the prefix now caches. Thinking is the line to watch: 300 thinking tokens a call add $15 a day, twice the whole $7.50 input bill. And the long-prompt tier is a cliff: past 100,000 tokens the input rate is five times higher, so keep the cached prefix well under it.

## Takeaways

- Haiku 5.5 lists at $0.10 input and $0.50 output per million tokens up to 100k-token prompts, but the same text counts about 30% more tokens than on 4.5.
- Remove `temperature`, `top_p`, `top_k`, prefill and thinking budgets before switching; check `stop_reason` for refusals.
- For classification, turn thinking off or lower effort, and use an enum schema instead of prefill.
- A 512-token cache minimum means a short label-definition prefix can now cache; check `cache_read_input_tokens` is above zero.
- Build a labelled set first; price a candidate model per decision, not per token.

The pipeline this kind of classifier would slot into is written up in case file 07, AI document processing.
