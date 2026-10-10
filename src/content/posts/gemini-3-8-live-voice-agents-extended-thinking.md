---
title: "Gemini 3.8 Live extended thinking: what it buys a voice agent"
description: "Gemini 3.8 Live and its extended-thinking variant went GA on 15 September 2026. What the extra reasoning does, what it costs the client, and a latency budget."
date: 2026-10-10T01:08:00Z
tags: ["Gemini 3.8 Live", "voice agents", "Live API", "extended thinking", "latency"]
pillar: model-watch
sources:
  - title: "Gemini API: Gemini 3.8 Live model page (limits, capabilities, removed features)"
    url: "https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live"
  - title: "Gemini API docs: thinking in the Live API (background reasoning, interaction_status)"
    url: "https://ai.google.dev/gemini-api/docs/live-api/thinking"
  - title: "Gemini API docs: Live API capabilities (model comparison, session limits, VAD)"
    url: "https://ai.google.dev/gemini-api/docs/live-api/capabilities"
  - title: "Gemini API docs: Live API guide (model IDs, VAD settings, interruptions)"
    url: "https://ai.google.dev/gemini-api/docs/live-guide"
  - title: "Gemini API pricing (Gemini 3.8 Live rows)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Gemini API release notes (GA on 15 September 2026)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Gemini API deprecations (Live model shutdown dates)"
    url: "https://ai.google.dev/gemini-api/docs/deprecations"
  - title: "Google blog: Build real-time voice applications with Gemini 3.8 Live"
    url: "https://blog.google/innovation-and-ai/technology/developers-tools/build-real-time-voice-applications-gemini-audio/"
draft: false
---

As of 10 October 2026, Google has two audio-to-audio Live models in general availability: `gemini-3.8-live`, and `gemini-3.8-live-extended-thinking`, both since 15 September. The choice between them is a latency-versus-reasoning decision, and none of the Live API pages I read gives a latency figure for either, so any budget you build is partly your own measurement. This post pulls together what the docs do say, and what extended thinking costs your client code as well as your bill.

## What shipped on 15 September?

The release notes describe `gemini-3.8-live` as the default for most low-latency voice agents and real-time dialogue without reasoning delays. The model page calls it "the default option for most low-latency voice agent experiences", with interleaved reasoning, asynchronous function calling by default, and full-session client content updates. Its limits are 131,072 input tokens and 65,536 output tokens. It does not support caching, structured outputs, code execution or the Batch API. `thinking_level` is not supported and must be omitted from setup.

`gemini-3.8-live-extended-thinking` is the "high-reasoning" variant. It adds background reasoning to the live session: it plans, calls tools asynchronously, and speaks conversational fillers while work runs. Both use the same WebSocket endpoint and API-key authentication. Audio in is raw 16 kHz 16-bit PCM and audio out is 24 kHz. The capabilities page lists audio-only sessions as capped at 15 minutes and audio-plus-video at 2 minutes unless you use session management, and a 128k-token context for native audio output models.

One discrepancy to know about. Older guides show `enable_affective_dialog` and a proactive-audio switch. The 3.8 Live model page says proactive audio is always on (setting it false returns an error) and affective dialogue has been removed. Follow the model page.

Pricing per million tokens from the pricing page, with per-minute equivalents where Google gives them:

| Gemini 3.8 Live | Rate |
|---|---|
| Text input | $0.75 |
| Audio input | $3.00, or $0.005 a minute |
| Image or video input | $1.00, or $0.002 a minute |
| Text output, including thinking | $4.50 |
| Audio output, including thinking | $12.00, or $0.018 a minute |

The page lists no separate rate for the extended-thinking model. Google's blog calls the per-minute output rate an estimate derived from the per-token price.

Housekeeping: the deprecations page says `gemini-3.1-flash-live-preview` and `gemini-2.5-flash-native-audio-preview-12-2025` both shut down on 17 November 2026, with `gemini-3.8-live` as the replacement.

## What does extended thinking actually buy you?

Not a faster answer. The docs position it for slow tools that would otherwise leave awkward silence, and for multi-step work: diagnostics, parallel retrieval, tutoring that checks its logic before speaking. In the standard model the agent answers immediately, or waits silently for a tool. In the extended model, a session has three parts: a spoken filler ("checking flight options") while tools run, an asynchronous `toolCall` sent while `interactionStatus` is `IN_PROGRESS`, and a final answer with `interactionStatus: "IDLE"` and `turnComplete: true`.

So what you buy is perceived responsiveness during slow work, plus planning. What you pay for it is in three places.

**Client complexity.** `turnComplete` no longer means the session is free, because the model can speak several times in one request. You must track `interaction_status`.

**Tool constraints.** Thinking requires `NON_BLOCKING` on every function declaration; a blocking tool returns an error. The standard model allows `BLOCKING` or `NON_BLOCKING`, with scheduling modes `SILENT`, `WHEN_IDLE` and `INTERRUPTED`.

**A new knob, with no stated default.** `thinking_level` takes `low`, `medium` or `high` on the extended model only, and `MINIMAL` is not supported. The thinking page does not state a default; its examples set `low` explicitly. I would set it explicitly too and treat any figure for the default as unconfirmed.

| | `gemini-3.8-live` | `gemini-3.8-live-extended-thinking` |
|---|---|---|
| Best for | Direct commands, fast tools | Multi-step planning, slow tools |
| `thinking_level` | Not supported | `low`, `medium`, `high` |
| Tool behaviour | `BLOCKING` or `NON_BLOCKING` | `NON_BLOCKING` only |
| While tools run | Waits, then speaks | Speaks fillers |
| Idle signal | `turnComplete: true` | `interaction_status: "IDLE"` |

## What does a latency budget look like from the documented numbers?

The docs give you the endpointing numbers and nothing else, so the budget has one documented line and several to measure:

| Component | What the docs say |
|---|---|
| End-of-speech detection | `silence_duration_ms`: 500 to 800 ms recommended; the guide says the server default is about 800 ms, around 100 to 200 ms splits utterances at natural pauses, and 2,000 ms or more adds noticeable latency |
| Client-side endpointing | Hybrid VAD: keep server VAD on, run your own, and send `audio_stream_end` when you detect the end of speech, which finalises the turn with minimal latency |
| Model time to first audio | Not published; measure it at your thinking level |
| Tool round trip | Yours; with the extended model, fillers cover the gap |
| Playback | Yours; stop and clear queued audio when the server sends `interrupted` |

The largest documented fixed cost in a turn is the silence you wait for before deciding the user has finished. Cutting it with client-side VAD is a cheaper win than any model change. Barge-in is built in: when VAD detects an interruption, generation is cancelled, pending function calls are discarded and the server flags `interrupted`, so your client must drop buffered audio.

## What it means for people shipping products

Start on `gemini-3.8-live`. Move to the extended model only when you can name the slow step: a CRM lookup, a multi-step tool chain, a computation. If your tools return in milliseconds, the extended model adds client complexity for no gain. If they take seconds, fillers beat dead air.

Measure before you promise anything. Google's launch post has quality claims and leaderboard positions, and I have not reproduced them; they say nothing about your latency. Log time from end of user speech to first audio byte, per thinking level, on your own calls.

This is reasoning from the documentation, not a field report.

## Hands-on: the session config and the state handler

The extended-thinking configuration from the thinking page, with one asynchronous tool:

```python
from google.genai import types

search_flights = types.FunctionDeclaration(
    name="search_flights",
    description="Searches for available flights.",
    behavior="NON_BLOCKING",              # required on every tool in a thinking session
    parameters={
        "type": "OBJECT",
        "properties": {"destination": {"type": "STRING"}},
        "required": ["destination"],
    },
)

config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    thinking_config=types.ThinkingConfig(thinking_level="low"),   # set it explicitly
    tools=[types.Tool(function_declarations=[search_flights])],
)

def on_message(message, ui):
    sc = getattr(message, "server_content", None)
    if sc and sc.interrupted:             # barge-in: stop playback, clear the queue
        ui.clear_audio()
    status = getattr(message, "interaction_status", None)
    if status == "IN_PROGRESS":
        ui.set_state("thinking")          # reasoning or running tools
    elif status == "IDLE":
        ui.set_state("listening")         # not turnComplete: that can fire mid-task
```

To open the session, call the client's live connect method with the model ID and this config; check the docs for the exact call in your SDK version.

Now a rough bill. Take a five-minute call with five minutes of audio in and two minutes of agent speech out. At the per-minute rates, input is 5 × $0.005 = $0.025 and output is 2 × $0.018 = $0.036, so $0.061 a call, or $610 for 10,000 calls a month. Treat that as an order of magnitude: the output rate is Google's estimate, the page says output includes thinking, and I could not confirm whether silence on the input stream is billed. Log the usage fields on a pilot before you quote a unit cost.

## Takeaways

- `gemini-3.8-live` is the low-latency default; `gemini-3.8-live-extended-thinking` adds background reasoning, spoken fillers and a `thinking_level` of `low`, `medium` or `high`.
- Extended thinking hides tool delay; it does not shorten an answer. It requires `NON_BLOCKING` tools and `interaction_status` handling.
- The Live API pages I read give no latency numbers for either model; the one documented lever is endpointing, 500 to 800 ms of silence, or client-side VAD.
- Audio costs $3.00 in and $12.00 out per million tokens, about $0.005 and $0.018 a minute, with no separate extended-thinking price listed.
- Move off `gemini-3.1-flash-live-preview` before 17 November 2026.

Next in the same release train: Gemini 3.8 Flash TTS and the voices endpoint, which cover narration rather than conversation.
