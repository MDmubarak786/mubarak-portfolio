---
title: "Gemini 2.5 is limited, not deprecated: what that means for your project"
description: "Since 18 September, Gemini 2.5 access is limited to prior users. The text models have no shutdown date; the audio and image ones do. Dates, prices and a migration check."
date: 2026-10-10T01:11:00Z
tags: ["Gemini 2.5", "deprecation", "migration", "Gemini API", "implicit caching"]
pillar: model-watch
sources:
  - title: "Gemini API changelog (18 September 2026: 2.5 access limited)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Gemini API deprecations (dated shutdowns and replacements)"
    url: "https://ai.google.dev/gemini-api/docs/deprecations"
  - title: "Gemini API models overview (2.5 listed as not deprecated, access restricted)"
    url: "https://ai.google.dev/gemini-api/docs/models"
  - title: "Gemini API pricing (2.5 Flash, 2.5 Flash-Lite, 2.5 Pro, 3.5 Flash-Lite, 3.8 Flash)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Gemini API docs: context caching (implicit caching minimums)"
    url: "https://ai.google.dev/gemini-api/docs/caching"
draft: false
---

The phrase going around is that Google is winding down Gemini 2.5. As of 10 October 2026, that is only half true. On 18 September Google limited access to the 2.5 models to people who have used them, and it says they are "not deprecated". But some 2.5 variants do have shutdown dates, and the models Google tells new projects to use are priced differently enough that a quiet swap can multiply your bill by almost four, as the worked example below shows. This is the true version of the story, with the dates.

## What did Google actually announce?

The changelog entry for 18 September says access to the 2.5 models is limited to users who used them recently. The deprecations page puts it as "limiting access to the 2.5 models to users who have actively used them in the past", and the models page says the models "are not deprecated and will continue to be served until further notice through the API." For new projects, both point to Gemini 3.5 Flash-Lite or Gemini 3.8 Flash.

I could not find a definition of "recently" or "actively" on any page I fetched. If your project last called a 2.5 model months ago, I cannot tell you from the docs whether it still has access. Test with a real call, not a reading of the changelog.

The deprecations page also says its shutdown dates "are the earliest possible retirement dates" and that Google will give advance notice of the exact date.

## Which Gemini 2.5 models have shutdown dates?

Two groups, per the deprecations table.

**No shutdown announced** (the "limited access" group): `gemini-2.5-pro`, `gemini-2.5-flash` and `gemini-2.5-flash-lite`.

**Dated shutdowns:**

| Model | Shutdown | Replacement named |
|---|---|---|
| `gemini-2.5-flash-preview-tts` | 17 Nov 2026 | `gemini-3.8-flash-tts` or `-lite-tts` |
| `gemini-2.5-pro-preview-tts` | 17 Nov 2026 | `gemini-3.8-flash-tts` or `-lite-tts` |
| `gemini-2.5-flash-native-audio-preview-12-2025` | 17 Nov 2026 | `gemini-3.8-live` |
| `gemini-2.5-flash-image` | 15 Mar 2027 | `gemini-3.1-flash-lite-image` |

The computer-use preview (`gemini-2.5-computer-use-preview-10-2025`) already shut down on 28 July 2026, with `gemini-3.8-flash` as its replacement.

So the practical rule is: if you use 2.5 for text, nothing is scheduled to break, but your access depends on a usage test Google has not defined. If you use 2.5 for speech, native audio or images, you have dates, and the first is 17 November, five weeks away.

## What does migration cost?

Prices are per million tokens, standard tier, from the pricing page:

| Model | Input | Output | Cached input |
|---|---|---|---|
| 2.5 Flash-Lite | $0.10 | $0.40 | $0.01 |
| 2.5 Flash | $0.30 | $2.50 | $0.03 |
| 2.5 Pro (prompts up to 200k) | $1.25 | $10.00 | $0.125 |
| 3.5 Flash-Lite | $0.30 | $2.50 | $0.03 |
| 3.8 Flash, through 31 Dec 2026 | $0.75 | $3.75 | $0.075 |
| 3.8 Flash, from 1 Jan 2027 | $1.50 | $7.50 | $0.15 |

Three things fall out of it.

**2.5 Flash to 3.5 Flash-Lite is price-neutral.** Same $0.30 in, $2.50 out. If your 2.5 Flash workload is simple enough for a Lite model, you are moving for free.

**2.5 Flash-Lite to 3.5 Flash-Lite is not.** Input triples ($0.10 to $0.30) and output rises 6.25 times ($0.40 to $2.50). Google's advice for new projects is 3.5 Flash-Lite, but if you are a high-volume 2.5 Flash-Lite user, the "recommended" path is the expensive one.

**2.5 Pro to 3.8 Flash is cheaper until the end of the year, then not on input.** Through 31 December, 3.8 Flash is $0.75 in and $3.75 out against $1.25 and $10.00. From 1 January the page lists $1.50 in and $7.50 out, so input is dearer than 2.5 Pro and output is still cheaper. Whether you save depends on your input-to-output ratio.

A worked case, 100,000 calls a day at 1,000 input tokens and 100 output tokens each, no caching:

| Model | Input | Output | Per day |
|---|---|---|---|
| 2.5 Flash-Lite | 100M × $0.10 = $10 | 10M × $0.40 = $4 | $14 |
| 2.5 Flash or 3.5 Flash-Lite | 100M × $0.30 = $30 | 10M × $2.50 = $25 | $55 |
| 3.8 Flash (2026) | 100M × $0.75 = $75 | 10M × $3.75 = $37.50 | $112.50 |
| 3.8 Flash (2027) | $150 | $75 | $225 |

That is a $14 day turning into a $55 day on the recommended swap. It is a small number in absolute terms and a large one in percentage terms, which is why I would check before the swap, not after the invoice.

## Does the caching minimum change?

Yes, and in the opposite direction to Claude's. The caching docs say implicit caching is "enabled by default for all Gemini 2.5 and newer models", with these minimums: 2,048 tokens for 2.5 Flash and 2.5 Pro, 4,096 for 3.6 Flash and 3.8 Flash. The page does not list minimums for 2.5 Flash-Lite or 3.5 Flash-Lite, so I cannot say what applies to those.

If your prompts sit between 2,048 and 4,096 tokens and you move from 2.5 Flash to 3.8 Flash, they stop qualifying for implicit caching, and the cached-input discount disappears. Count your prefix tokens before you move.

## What it means for people shipping products

I would not read "not deprecated" as "safe". It says nothing about new access, and the same page that reassures you also says shutdown dates will come with notice, not with a guarantee of a long runway. My rule is to treat any model with restricted access as already in migration: stop adding new features on it, and schedule the move on your own timetable.

For a text workload, I would run the migration as an evaluation, not a string replacement. The model changes, the price changes and the caching rules change in one step.

## Hands-on: a migration check

Put the prices in one table, run a fixed set of inputs through the old and new model, and compare agreement and cost together. The call itself is yours to fill in; I have left it as a stub because the exact usage fields depend on your SDK version, so check the docs for the exact names.

```python
# $ per million tokens, standard tier, from the Gemini pricing page (Oct 2026)
PRICES = {
    "gemini-2.5-flash-lite": {"in": 0.10, "out": 0.40},
    "gemini-2.5-flash":      {"in": 0.30, "out": 2.50},
    "gemini-3.5-flash-lite": {"in": 0.30, "out": 2.50},
    "gemini-3.8-flash":      {"in": 0.75, "out": 3.75},   # doubles on 1 Jan 2027
}

def cost(model: str, tokens_in: int, tokens_out: int) -> float:
    p = PRICES[model]
    return (tokens_in * p["in"] + tokens_out * p["out"]) / 1_000_000

def call(model: str, text: str) -> tuple[str, int, int]:
    """Return (answer, input_tokens, output_tokens). Fill in with your SDK."""
    raise NotImplementedError

def compare(old: str, new: str, cases: list[tuple[str, str]]):
    agree = 0
    spend = {old: 0.0, new: 0.0}
    for text, expected in cases:
        for model in (old, new):
            answer, tin, tout = call(model, text)
            spend[model] += cost(model, tin, tout)
            if model == new and answer.strip() == expected:
                agree += 1
    return {"new_accuracy": agree / len(cases), "spend": spend}
```

Run it with a labelled set of at least a few hundred examples from your own traffic. If accuracy holds and spend does not rise past what you can accept, flip a percentage of traffic to the new model behind a flag, watch for a day, then flip the rest.

## Takeaways

- Gemini 2.5 access is limited to prior users since 18 September; the 2.5 text models have no shutdown date and Google says they are not deprecated.
- The 2.5 TTS previews and the native-audio preview shut down on 17 November 2026; `gemini-2.5-flash-image` follows on 15 March 2027.
- 2.5 Flash-Lite to 3.5 Flash-Lite triples input and raises output 6.25 times; 2.5 Flash to 3.5 Flash-Lite costs the same.
- Implicit-cache minimums rise from 2,048 to 4,096 tokens on 3.8 Flash, and the Lite minimums are not documented.
- Treat restricted access as the start of a migration and run it as an evaluation.

For the 3.8 Flash side of this move, see the earlier issue on prompt caching economics, which prices the same model with and without a cache.
