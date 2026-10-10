---
title: "Agentic video understanding in Gemini: up to 88% fewer tokens on long video"
description: "Gemini's agentic video mode loads only the frames, audio and transcript a prompt needs. What shipped, why 88% fewer tokens is not 88% off the bill, and a calculator."
date: 2026-10-10T01:19:00Z
tags: ["video understanding", "Gemini", "tokens", "LLM pricing", "Gemini 3.8 Flash", "cost optimisation"]
pillar: model-watch
sources:
  - title: "Gemini API docs: video understanding (agentic and static processing)"
    url: "https://ai.google.dev/gemini-api/docs/video-understanding"
  - title: "Gemini API changelog (1 September 2026 entry)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Google: Introducing agentic video understanding with Gemini"
    url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-agentic-video-in-gemini/"
  - title: "PPC Land: Google cuts Gemini video analysis tokens by up to 88% (secondary, benchmark tables)"
    url: "https://ppc.land/google-cuts-gemini-video-analysis-tokens-by-up-to-88-in-agentic-mode/"
  - title: "Gemini API pricing (3.8 Flash, 3.6 Flash, 3.5 Flash-Lite)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Gemini API docs: understand and count tokens (video token usage)"
    url: "https://ai.google.dev/gemini-api/docs/tokens"
draft: false
---

As of 10 October 2026, Gemini can watch a long video the way you would skim one. It jumps around the timeline, pulls a transcript passage, a few frames or an audio stretch, and ignores the rest. Google says this uses up to 88% fewer tokens than the default frame-by-frame pass on long content. The 88% is a best case, the model list has shifted since launch, and the saving on your invoice will be smaller than the saving in tokens. This post separates the three and gives you a calculation to run on your own footage.

## What shipped on 1 September 2026?

The Gemini API changelog entry for 1 September 2026 reads: agentic video understanding added to Gemini 3.7 Flash, 3.6 Flash and 3.5 Flash-Lite, across both the Interactions and GenerateContent APIs. The model requests transcripts, frames or audio tracks from a video on demand while moving through its timeline. Google's launch post adds that it is available for video uploads and YouTube videos in the Gemini API, and that it uses standard token pricing with no additional feature fee.

One wrinkle to check before you pin a model. The video understanding docs, last updated 2026-10-09 UTC, list "Gemini 3.8 Flash, 3.6 Flash, 3.5 Flash Lite". The pricing page lists the same three and has no Gemini 3.7 Flash row at all, while the launch post and the benchmarks below name 3.7 Flash. I cannot tell from the pages whether 3.7 was renamed, replaced or retired, so confirm the current model list in the API before you hard-code an ID.

### How it differs from the default

Static processing, the default, extracts frames at 1 frame per second and puts all of them in context at once. The tokens guide gives about 100 tokens per second of video at low media resolution and about 300 at high; the video page gives 66 tokens per frame at low resolution, 258 at high, and 32 tokens per second for audio. Agentic mode does not put everything in context. The docs say the model "dynamically explores the video timeline, selectively inspecting transcripts" and loads frames or audio when the prompt calls for them.

You switch it on with `"processing": "agentic"` on the video input part. The docs' guidance is to start with agentic for long videos or for questions about specific moments, and to keep static for latency-sensitive queries on clips under five minutes or when frame-level precision across the whole clip matters. The page also warns that navigation "may slightly increase Time to First Token (TTFT) on short clips (<5 minutes)."

## Is the 88% real?

It is real for one benchmark, and Google chose the benchmarks. The figures below come from PPC Land's write-up of Google's launch material, so they are secondary; they use Gemini 3.7 Flash, and I could not see the original charts.

| Benchmark | Tokens per query, static to agentic | Token cut | Accuracy, static to agentic |
|---|---|---|---|
| Minerva | 80,900 to 33,600 | 58.4% | 73.7% to 79.0% |
| 1H-VideoQA | 397,600 to 47,700 | 88.0% | 87.5% to 88.5% |
| LVBench | 300,300 to 36,000 | 88.0% | 85.1% to 88.6% |

Three things stand out. The 88% headline sits on the benchmarks with long videos, and the one with the smallest token cut (Minerva) has the biggest accuracy gain. The static baseline used high thinking, low media resolution and 1 FPS, so a baseline tuned differently would give a different percentage. And Google's other headline claims, up to 66% lower cost and up to 7% better accuracy, are "up to" figures: the 66% has no table behind it in the coverage I read, and the 7% matches Minerva's relative gain, not the 1.1% on the benchmark with the biggest token cut. A partner, Ponder, reports about 3.5x fewer input tokens, which is roughly 71%. None of it is independently replicated that I could find, and there is no latency comparison.

## Why 88% fewer tokens is not 88% off the bill

Agentic tokens are not all input tokens. The docs say navigation reasoning is counted as `total_thought_tokens`, while the frames, audio and transcript it loads count as `total_tool_use_tokens`. The pricing page labels its output price "including thinking tokens", so thought tokens bill at the output rate, which is five times the input rate on Gemini 3.8 Flash ($0.75 in, $3.75 out per million tokens through 31 December 2026, doubling from 1 January 2027).

Take the 1H-VideoQA row and price it on 3.8 Flash, since that is the model with a published price. The split between thought and tool-use tokens is not published, so I bracket it.

| Case | Tokens | Rate | Cost per query | Cut vs static |
|---|---|---|---|---|
| Static, all billed as input | 397,600 | $0.75 per million | $0.298 | n/a |
| Agentic, all billed as input | 47,700 | $0.75 per million | $0.036 | 88% |
| Agentic, all billed as output | 47,700 | $3.75 per million | $0.179 | 40% |

Google's 66% falls between the two ends, which is what you would expect if navigation reasoning is a real share of the agentic tokens. I have not measured the split. At 1,000 long-video questions a day, this arithmetic gives $298 a day static against somewhere between $36 and $179 agentic. The price doubling in January scales both sides, so the ratio holds.

The practical lesson: the saving depends on how thinky the navigation is. Questions that need many hops through the video will push the agentic bill toward the output-priced end.

## What it changes for people shipping products

I have not run Gemini video in production, so this is a design argument, not a field report.

**Long-form video QA is the clear fit.** Recorded meetings, lectures, support calls, hour-long walkthroughs. A static pass pays for every second of footage whether or not the question touches it. Agentic mode pays for the parts it visits. If your users ask about specific moments, this is the mode the docs tell you to start with.

**Moderation is a trap.** A moderation question like "does any frame contain X" needs frame-level coverage of the whole clip, which is exactly the case where the docs keep you on static. An agent that decides what to watch can decide not to watch the frame that mattered. Use static, or run a cheap static pass at low resolution first.

**Multi-turn is stateless, and the state is your bill.** The docs say that on stateless multi-turn calls "you must include all steps from the response in your next request's `step_list`", and that those returned steps count toward input tokens. Omitting them does not raise an error, it silently loses the video context. The stateful route is `previous_interaction_id`. Pick one deliberately.

**Long jobs need `background=True` or `stream=True`,** per the docs, to avoid timeouts. Build the polling loop before you build the feature.

The closest thing I have built is the 2024 document pipeline on GPT-4 Vision and OCR. With any vision model, what you send is what you pay for, so choosing what to send is a design decision you own. Agentic video moves that decision inside the model, which is convenient, and also means you no longer control it.

## Hands-on: price it before you switch

Run both modes over twenty of your own videos and log the usage block. The field names are in the docs; the calculator is plain arithmetic.

```python
# Prices per million tokens, Gemini 3.8 Flash through 31 Dec 2026 (pricing page).
IN_PRICE, OUT_PRICE = 0.75, 3.75

def query_cost(tokens: int, share_billed_as_output: float = 0.0) -> float:
    """USD for one query. share_billed_as_output bounds the thinking share."""
    out = tokens * share_billed_as_output
    return ((tokens - out) * IN_PRICE + out * OUT_PRICE) / 1_000_000

static = query_cost(397_600)                # about $0.298
agentic_low = query_cost(47_700, 0.0)       # about $0.036
agentic_high = query_cost(47_700, 1.0)      # about $0.179

print(f"cut between {1 - agentic_high/static:.0%} and {1 - agentic_low/static:.0%}")
```

For the request, the part I can vouch for is the field: `"processing": "agentic"` on the video input part, with `background` set to true for long jobs. Check the docs for the exact request shape and parameter names around it. After the run, replace the two bounds with your real thought and tool-use counts from the response and see where on the line you land.

Then decide per route, not per product: agentic for question-answering over long recordings, static for short clips and for anything that must see every frame.

## Takeaways

- Agentic video understanding shipped on 1 September 2026; the docs now list Gemini 3.8 Flash where the launch listed 3.7 Flash. Verify the model ID.
- Up to 88% fewer tokens is the best case, from Google's chosen long-video benchmarks. Expect less on short or hop-heavy workloads.
- Thought tokens bill at the output rate, so an 88% token cut can be a 40% cost cut. Measure your own split.
- Keep static for clips under five minutes and for frame-exact tasks such as moderation.
- Stateless multi-turn means resending every step. That is where long conversations get expensive.

Next in the series: [Jev as a programming primitive](/blog/jev-typed-questions-instead-of-prompt-and-parse), on models that answer typed questions instead of generating anything.
