---
title: "Gemini 3.8 Flash: 3.7 now routes to it, and what to test"
description: "Since 8 October 2026, requests to gemini-3.7-flash are routed to gemini-3.8-flash at the same price, until rates double on 1 January 2027. What to test before it bites."
date: 2026-10-10T01:07:00Z
tags: ["Gemini 3.8 Flash", "Gemini API", "migration", "LLM pricing", "model routing"]
pillar: model-watch
sources:
  - title: "Gemini API release notes (3.8 Flash GA, 3.7 Flash routing, 8 October 2026)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Gemini API deprecations (3.7 Flash replaced by 3.8 Flash; shutdown not announced)"
    url: "https://ai.google.dev/gemini-api/docs/deprecations"
  - title: "Gemini API: Gemini 3.8 Flash model page (limits, capabilities, thinking levels)"
    url: "https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash"
  - title: "Gemini API: What's new in Gemini 3.8 Flash (behaviour changes, migration checklist)"
    url: "https://ai.google.dev/gemini-api/docs/latest-model"
  - title: "Gemini API pricing (3.8 Flash through December 2026 and from January 2027)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Google blog: Introducing Gemini 3.8 Flash and 3.8 Flash Cyber"
    url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/"
  - title: "Gemini API docs: thinking (levels, defaults, thought-token billing)"
    url: "https://ai.google.dev/gemini-api/docs/thinking"
  - title: "Gemini API docs: context caching (implicit caching minimums, cached-token field)"
    url: "https://ai.google.dev/gemini-api/docs/caching"
draft: false
---

As of 10 October 2026, if your code still says `gemini-3.7-flash`, you are no longer calling Gemini 3.7 Flash. The release notes for 8 October say "All requests to gemini-3.7-flash are automatically routed to gemini-3.8-flash", and the price is the same. The model behind your endpoint changed without a code change, and its behaviour is not identical, so this is a regression-test job rather than a migration job.

## What exactly changed, and when?

The sequence from Google's release notes and deprecations page:

- **13 August 2026:** `gemini-3.7-flash` goes GA with an introductory price through 31 December 2026.
- **2 September 2026:** `gemini-3.8-flash` goes GA, described in the notes as "our most intelligent Flash model".
- **8 October 2026:** `gemini-3.7-flash` is deprecated and replaced by `gemini-3.8-flash`, with automatic routing. The same day, `gemini-3.5-flash` is routed to `gemini-3.6-flash`.

The deprecations page shows no shutdown date for `gemini-3.7-flash` ("Not yet announced"), so for now the old name keeps working, pointed at the new model. Nothing there says the routing is optional or pinnable. If you need to know which model answered, check the docs for the exact response field; I could not confirm one from the pages I read, so I would log your own model string and a prompt version with every call.

There is a tension in Google's own wording. The 2 September launch post, as I read it, said 3.7 Flash would stay supported for workloads where efficiency matters most. The model page and release notes now say it is deprecated and routed. If you chose 3.7 for efficiency, that choice has been made for you.

## What does Gemini 3.8 Flash look like on paper?

The model page lists `gemini-3.8-flash` with text, image, video, audio and PDF input, text output, a 1,048,576-token input limit and a 65,536-token output limit. It supports caching, code execution, function calling, structured outputs, URL context and search grounding, plus Batch, Flex and Priority consumption. It does not support the Live API or audio and image generation. Thinking has three levels: `low`, `medium` and `high`. The default is `medium`, and `minimal` returns an error.

Pricing, per million tokens, from the pricing page:

| 3.8 Flash, paid tier | Through 31 Dec 2026 | From 1 Jan 2027 |
|---|---|---|
| Input (text, image, video) | $0.75 | $1.50 |
| Output, including thinking | $3.75 | $7.50 |
| Cached input | $0.075 | $0.15 |
| Cache storage, per hour | $0.50 | $1.00 |
| Batch input / output | $0.375 / $1.875 | $0.75 / $3.75 |

The pricing page has no 3.7 Flash row. Google's launch post says the 3.8 introductory price matches 3.7's, so the routing is price-neutral until 1 January and then both lines double.

## What is different from 3.7 Flash?

The honest answer is that Google's documentation describes the direction, not a diff, and the numbers in launch coverage are vendor claims I have not reproduced. What the pages do say:

- Google's launch post says 3.8 is more diligent on complex tasks, with more reasoning steps and iterative tool calls, and that this can use more tokens, especially at higher effort levels.
- The "What's new" page says the model can use more tokens on long or complex tasks, and suggests lowering the thinking level for everyday work to cut token use.
- The launch post also claims a significant gain in prompt-injection robustness, based on third-party testing. I would test that on your own prompts too.

I would not copy the "What's new" migration checklist as a 3.7 to 3.8 diff. It covers moving to the Gemini 3 generation in general: `thinking_budget` becomes `thinking_level`, drop `temperature`, `top_p` and `top_k`, use `previous_interaction_id`. Those apply if you are coming from older code. If you were already on 3.7 with thinking levels, most of it is already done.

## What it means for people shipping products

Treat the routing as a silent model upgrade and run your regression set against it today. The risk is not that 3.8 is worse. The risk is that it is different in ways your downstream code did not expect: longer outputs, more thinking tokens, more tool calls, different phrasing in structured fields.

If you want to stay on the older behaviour for a while, the "What's new" page says Gemini 3.6 Flash remains supported. The pricing page lists the same introductory rates for it, and the thinking page lists `minimal` as a level there, which 3.8 Flash does not accept. That is an option, not a recommendation: a model that is two releases behind is the one most likely to be routed next, as 3.5 Flash was on 8 October. Whichever model you choose, roll the change out behind a flag, send a slice of traffic first, and compare cost and answers per request before you widen it.

Design-wise, the lesson is to keep a pinned eval set and a per-call log of model, thinking level and token usage. Without them you only learn about a quiet routing change from the invoice. This is design reasoning from the docs, not a field report.

## Hands-on: a small regression harness

Run your golden prompts at two thinking levels and log tokens, latency and cache hits:

```python
import time
from google import genai

client = genai.Client()

def run(prompt: str, level: str) -> dict:
    t0 = time.perf_counter()
    i = client.interactions.create(
        model="gemini-3.8-flash",
        input=prompt,
        generation_config={"thinking_level": level},   # low | medium | high; minimal errors
    )
    u = i.usage   # check the docs for the exact attribute path
    return {
        "level": level,
        "seconds": round(time.perf_counter() - t0, 2),
        "thought": getattr(u, "total_thought_tokens", 0),
        "output": getattr(u, "total_output_tokens", 0),
        "cached": getattr(u, "total_cached_tokens", 0),
        "text": i.output_text,
    }
```

The thinking page documents `total_thought_tokens` and `total_output_tokens`, and the caching page documents cached tokens in `usage.total_cached_tokens`. Compare each against your pre-8-October logs: output tokens per call, thinking tokens per call, and the share of calls that hit `max_output_tokens` while thinking, which the thinking page says are marked incomplete while still billing the thought tokens.

Now the price. Take a call with 2,000 input and 800 output tokens, thinking included. At the current rates: 2,000 × $0.75 plus 800 × $3.75 per million, which is $0.0045 a call, or $4,500 for a million calls. From 1 January the same call is 2,000 × $1.50 plus 800 × $7.50, or $0.0090: $9,000. If 3.8 uses 30% more output tokens than 3.7 did, an assumed figure, the call is 1,040 output tokens: $0.0054 now, $0.0108 from January, or $5,400 and $10,800 per million calls. The doubling is documented; the 30% is an illustration.

Function calling is a third check. The "What's new" page names `Malformed_Function_Call` errors tied to text before a tool call and points to a workarounds section. Because Google says 3.8 calls tools more iteratively, count tool calls per task before and after as well as tokens: each extra call is another round trip of latency and another bill line.

Caching is the other check. The caching page lists 4,096 tokens as the implicit-caching minimum for 3.8 Flash; if a prompt rewrite has pushed your shared prefix under it, you pay full input price and will not see an error.

## Takeaways

- `gemini-3.7-flash` has been routed to `gemini-3.8-flash` since 8 October, and no shutdown date is announced for 3.7.
- The price matches until 31 December 2026; from 1 January 2027 input, output and cache all double.
- Google says 3.8 takes more reasoning steps and can use more tokens; lower the thinking level for routine work.
- Pin a golden set, and log model, thinking level and tokens per call, so a routing change shows up in a diff, not an invoice.

The same release train produced 3.8 Live for voice agents; the next post, on Gemini 3.8 Live and extended thinking, covers what its reasoning variant buys you.
