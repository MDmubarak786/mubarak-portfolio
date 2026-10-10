---
title: "Gemini 3.8 Flash TTS and the voices endpoint: a narrated product tour"
description: "Gemini 3.8 Flash TTS went GA on 22 September with a voices endpoint. Prices, limits, a Next.js route that narrates a page, and the 17 November shutdown to plan for."
date: 2026-10-10T01:09:00Z
tags: ["Gemini TTS", "text to speech", "Next.js", "Gemini 3.8 Flash TTS", "voice design", "accessibility"]
pillar: building
sources:
  - title: "Gemini API changelog (22 September 2026: TTS GA, voices endpoint)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Gemini API docs: speech generation (models, voices, formats, limits)"
    url: "https://ai.google.dev/gemini-api/docs/speech-generation"
  - title: "Gemini API pricing (3.8 Flash TTS and Flash-Lite TTS)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Gemini API deprecations (TTS preview shutdown dates)"
    url: "https://ai.google.dev/gemini-api/docs/deprecations"
  - title: "Gemini API models overview (current and legacy TTS)"
    url: "https://ai.google.dev/gemini-api/docs/models"
draft: false
---

Google's text to speech stopped being a preview on 22 September. As of 10 October 2026, Gemini 3.8 Flash TTS and Flash-Lite TTS are generally available, a `/v1beta/voices` endpoint lets you list, design and replicate voices, and the older preview TTS models have a shutdown date of 17 November. If you have a product tour, a docs page or an onboarding flow that would work better heard than read, this is the cheapest moment to try it.

This post covers what shipped, what a narrated tour costs, and a Next.js route handler you can adapt. I built the route from the documented samples; I have not run it against the API, so test it before you trust it.

## What shipped on 22 September?

The changelog lists three things for that date:

- `gemini-3.8-flash-tts`, described as the flagship creative TTS model, aimed at studio-grade voice fidelity and long-form stability.
- `gemini-3.8-flash-lite-tts`, a fast, cost-efficient model that replaces `gemini-3.1-flash-tts-preview`.
- The `/v1beta/voices` endpoint, plus voice design, voice replication and an Extended Voice Library.

The speech-generation docs add the detail. Both models share one API schema, so switching is a change of model name. Flash TTS is pitched at expressive, multi-speaker and long-form narration; Flash-Lite at high volume and voice agents. Input is text only, output is audio only. The docs give language coverage as over 130 for Flash TTS and over 100 for Flash-Lite, with the language detected automatically.

**Voice count.** The changelog says the Extended Voice Library holds 150+ prebuilt and custom voices. The speech page says there are 30 prebuilt studio voices (Kore, Puck, Charon and so on) and an Extended Voice Library of more that you can browse in AI Studio or query through the endpoint, without stating a number. I would trust the 30 for planning and treat the 150+ as the library's size on launch day.

**Voice design and replication.** Voice design creates a persona from a text description, either in AI Studio or with `POST /v1beta/voices` and `type="prompted"`. Replication creates a voice from reference audio plus consent audio, with `type="replicated"`. Stateful custom voices are capped at 200 per project with a one-year TTL that resets on use; stateless voice keys last seven days. Neither feature works on the older preview models.

**Listing voices.** `GET /v1beta/voices`, or `client.voices.list()` in the SDK, filters by `language_code`, `accent`, `gender`, `pitch`, `persona`, `type` and `search`, among others. Values inside one filter are OR-ed; different filters are AND-ed. `page_size` defaults to 50 and tops out at 1,000.

**Output.** Unary requests return a WAV file: 24 kHz, mono, 16-bit signed little-endian PCM, with a RIFF header, so you can write the bytes straight to disk. Streaming requests return headerless raw PCM (`audio/l16`) in the same format. G.711 mu-law and A-law are also available at 8, 16 or 24 kHz.

## What does a narrated tour cost?

Prices are per million tokens on the Gemini pricing page, standard tier:

| | Input (text) | Output (audio) | Per 10 s of audio |
|---|---|---|---|
| 3.8 Flash TTS, through 31 Dec 2026 | $0.50 | $9.00 | $0.00225 |
| 3.8 Flash-Lite TTS, through 31 Dec 2026 | $0.50 | $6.00 | $0.0015 |
| 3.8 Flash TTS, from 1 Jan 2027 | $1.00 | $18.00 | $0.0045 |
| 3.8 Flash-Lite TTS, from 1 Jan 2027 | $1.00 | $12.00 | $0.003 |

The page says audio tokens "correspond to 25 tokens per second of audio", so a minute is 1,500 tokens. The per-minute prices below are my arithmetic, not a listed figure: about $0.0135 a minute on Flash TTS and $0.009 on Flash-Lite until the end of the year.

A worked tour. Eight steps, each narrated for about 20 seconds (my assumption, roughly 50 words a step at a conversational pace):

- Audio: 8 × 20 s = 160 s × 25 = 4,000 tokens × $9.00 / 1M = $0.036.
- Text input: about 560 tokens × $0.50 / 1M = $0.0003.
- One full tour on Flash TTS: about $0.036. On Flash-Lite: about $0.024. From January, double both.

Generate it in 23 languages and the bill is roughly $0.83, once, at build time. That is the figure that matters: narration is a cost you pay when the script changes, not per visitor, if you cache the audio.

## What it means for people shipping products

I would not synthesise on demand for anonymous traffic. Visitors would wait for generation, you would pay per play, and you would give up control of what gets said. Generate at build or publish time, store the WAV or a compressed copy next to the page, and serve it like any other static asset.

I am the sole engineer on EF Academy's Next.js and Storyblok front end, a site with 23+ languages. If I added narration there, I would keep the script as a field next to the page copy in the CMS, regenerate audio only for entries whose text changed, and key the file name on a hash of script, voice and style. That is a design argument, not something I have shipped.

Two product rules. First, narration is an addition, not a replacement: the tour must work as text, with a visible transcript and a pause control. Second, pick one voice and keep it. The docs say custom voices in multi-character dialogue must be synthesised turn by turn and concatenated, and prebuilt multi-speaker requests allow two speakers, so a tour with one narrator is also the simplest to build.

If you are on an older model, move. `gemini-3.1-flash-tts-preview`, `gemini-2.5-flash-preview-tts` and `gemini-2.5-pro-preview-tts` all show a shutdown of 17 November 2026 on the deprecations page, with the 3.8 TTS models as the replacement. The deprecations page calls shutdown dates the earliest possible, with advance notice to follow, but plan for the date as written.

## Hands-on: a Next.js route that narrates a page

The shape below follows the docs' JavaScript sample: the Interactions API, a `speech_metadata` annotation for delivery, `response_format` set to audio, and the voice in `speech_config`. The docs ask for `@google/genai` 2.24.0 or later. I am assuming the key comes from `GEMINI_API_KEY`, as in the REST sample; check the docs for how your SDK version finds it.

```ts
// app/api/narrate/route.ts
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({});

export async function POST(req: Request) {
  const { text, style = "calm and clear, like a product walkthrough" } = await req.json();
  if (typeof text !== "string" || text.length === 0 || text.length > 2000) {
    return new Response("text must be 1 to 2000 characters", { status: 400 });
  }

  const interaction = await client.interactions.create({
    model: "gemini-3.8-flash-tts",
    input: [{
      type: "user_input",
      content: [{
        type: "text",
        text,
        annotations: [{ type: "speech_metadata", style }],
      }],
    }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: "Kore" }] },
  });

  const b64 = interaction.output_audio?.data;
  if (!b64) return new Response("no audio returned", { status: 502 });

  return new Response(Buffer.from(b64, "base64"), {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

The 2,000-character limit is my guard, not a documented one. On the page, one button per tour step does the rest:

```tsx
"use client";
export function Narrate({ text }: { text: string }) {
  async function play() {
    const res = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    new Audio(url).play();
  }
  return <button onClick={play}>Listen to this step</button>;
}
```

For production, move the `interactions.create` call into a script that runs at build or publish time, writes one WAV per step, and leaves the route out entirely. Two details from the docs are worth using. Put delivery directions in `speech_metadata.style`, because the docs say the transcript is read verbatim, so stage directions in the text will be spoken. And use the inline tags the docs list, such as `<short pause>` between sentences, to control pacing.

## Takeaways

- Gemini 3.8 Flash TTS and Flash-Lite TTS are GA as of 22 September; the old preview TTS models shut down no earlier than 17 November 2026.
- A 160-second narrated tour costs about $0.036 on Flash TTS at 25 audio tokens per second, and double that from 1 January 2027.
- Generate audio at build time and cache it by hash of script, voice and style; do not synthesise per visitor.
- Treat 30 prebuilt voices as the documented floor; the 150+ figure includes the extended library.
- Ship a transcript and a pause control with any narration.

For where this model family sits among the autumn's other launches, see the earlier issue on which AI model to build on in October 2026.
