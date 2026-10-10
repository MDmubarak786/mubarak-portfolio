---
title: "Text-to-speech product tours with Gemini 3.8 Flash TTS in Next.js"
description: "Generate product-tour narration with Gemini 3.8 Flash TTS at build time, cache the audio by content hash, and ship it accessibly. Cost maths and a copyable script."
date: 2026-10-10T02:14:00Z
tags: ["Gemini TTS", "Next.js", "accessibility", "text to speech", "build-time generation"]
pillar: building
sources:
  - title: "Gemini API docs: speech generation (models, formats, limits, voices)"
    url: "https://ai.google.dev/gemini-api/docs/speech-generation"
  - title: "Gemini API docs: Gemini 3.8 Flash TTS model page (token limits)"
    url: "https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash-tts"
  - title: "Gemini API pricing (3.8 Flash TTS and Flash-Lite TTS)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Gemini API changelog (22 September 2026: TTS GA and the voices endpoint)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Gemini API deprecations (preview TTS shutdown dates)"
    url: "https://ai.google.dev/gemini-api/docs/deprecations"
  - title: "W3C: Understanding Success Criterion 1.4.2, Audio Control"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html"
  - title: "Next.js docs: the public folder (static files and caching headers)"
    url: "https://nextjs.org/docs/app/api-reference/file-conventions/public-folder"
draft: false
---

A narrated product tour does not need a speech API in your request path. Your script changes a few times a quarter, so the audio can be generated once, at build time, named by a hash of its text, and served as a static file. That turns Gemini 3.8 Flash TTS from a runtime dependency into a build step that costs a few cents.

This post is the pipeline: what the model accepts, what a tour costs, a script you can adapt, and the accessibility rules that decide whether narration helps or hurts. I built it from the documented samples and have not run it against the API, so test it before you trust it.

## What does Gemini 3.8 Flash TTS give you at build time?

The Gemini API changelog lists `gemini-3.8-flash-tts` and `gemini-3.8-flash-lite-tts` as generally available on 22 September 2026, alongside the Voices endpoint at `/v1beta/voices`. The speech-generation docs describe the flagship model as text in, audio out, with language detected automatically across "over 130 languages" for Flash TTS and over 100 for Flash-Lite.

The details that shape a build script:

- **Input is a verbatim transcript.** The docs say the `text` field is treated "strictly as a verbatim transcript". Delivery goes in a separate `speech_metadata.style` annotation, such as `"cheerful and friendly"`, and short vocal events go inline in angle brackets, for example `<short pause>`.
- **Output is WAV by default.** A unary request returns 24 kHz, mono, 16-bit signed little-endian PCM with a RIFF header, so the bytes can go straight to disk. You can ask for mu-law or A-law instead.
- **Limits.** The model page lists an input limit of 8,192 tokens and a Gemini API serving limit of 16,384 output tokens. Neither is a problem for a tour step of a few sentences.
- **Voices.** The speech docs list 30 prebuilt voices, Kore and Puck among them, plus an Extended Voice Library through `GET /v1beta/voices`. The changelog says "150+" voices; the two pages count differently, so plan with the 30 and treat the rest as a bonus.
- **No caching on the model.** The model page lists context caching as unsupported. That is irrelevant here, because the cache you want is your own file cache.

One date matters if you built on an earlier preview. The deprecations page lists `gemini-3.1-flash-tts-preview` and the 2.5 preview TTS models with a shutdown of 17 November 2026 and names `gemini-3.8-flash-tts` or `gemini-3.8-flash-lite-tts` as replacements, though it calls these the "earliest possible dates".

## What does a narrated tour cost?

The pricing page lists, per million tokens, $0.50 for text input on both models, and $9.00 for Flash TTS audio output ($6.00 for Flash-Lite), each "through December 31, 2026". From 1 January 2027 the page lists $1.00 input and $18.00 or $12.00 output, double. A footnote says "Audio tokens correspond to 25 tokens per second of audio."

That footnote is the whole calculation. Take a tour with 12 steps of about 30 seconds each:

| | Flash TTS, to 31 Dec 2026 | Flash TTS, from 1 Jan 2027 | Flash-Lite TTS, to 31 Dec 2026 |
|---|---|---|---|
| Audio tokens, 360 s × 25 | 9,000 | 9,000 | 9,000 |
| Output cost | 9,000 × $9 / 1M = $0.081 | 9,000 × $18 / 1M = $0.162 | 9,000 × $6 / 1M = $0.054 |
| Text input, about 1,200 tokens | $0.0006 | $0.0012 | $0.0006 |
| One step re-generated, 750 audio tokens | $0.0068 | $0.0135 | $0.0045 |

Prices from the Gemini pricing page; the token counts for the script text are my estimate. The whole tour is under ten cents. Regenerating the one step you edited costs under a cent. Even with the January doubling, the bill is not the reason to cache. The reasons are latency, repeatability and failure isolation: a cached file cannot time out in front of a user.

Two derived numbers are worth knowing before you design the files. At 48,000 bytes a second (24,000 samples, two bytes each), a 30-second WAV is about 1.4 MB, so the 12-step tour is roughly 17 MB uncompressed. Compress it. And if the 16,384-token output limit counts audio tokens at the documented rate, one request tops out near 655 seconds, about eleven minutes. One request per step stays far below that.

## What it means for people shipping products

I would treat the audio as a build artefact, the same class of thing as an optimised image. Three consequences follow.

**Key the file on content, not on the step.** If the filename is `step-3.wav`, a script edit ships stale audio from CDN and browser caches. The Next.js docs say the `public` folder cannot be cached safely because the files may change, and the default header is `Cache-Control: public, max-age=0`. Put a hash of the text, style, voice and model in the filename and the URL changes exactly when the audio does. Then you can set long cache headers yourself without risk.

**Make the manifest the contract.** The build script emits a small JSON file mapping step ids to URLs and transcripts. The component reads only that file. If generation fails for a step, the build fails loudly instead of shipping a tour with a silent step.

**Keep generation out of CI on every push.** The hash check makes unchanged steps free, but a missing API key on a preview branch should skip generation and reuse the last manifest, not break the deploy. Decide that rule explicitly.

## How do you keep it accessible?

Narration is a feature for some users and an obstacle for others, and the rules are short. WCAG Success Criterion 1.4.2 (Level A) says that if audio plays automatically for more than 3 seconds, there must be a way to pause or stop it, or to control its volume independently of the system volume. The Understanding page explains why: screen reader users struggle to hear their speech output over other sound, and muting the whole system defeats the screen reader too.

The simplest compliant design is also the best one: never autoplay. Show a visible play and pause button, keep the transcript on the page as real text, and let the audio be an addition rather than the only copy. The transcript is already in your manifest, since the API's `text` field is a verbatim transcript, so the accessible version costs nothing extra.

## Hands-on: a prebuild script and a player

The script follows the documented Interactions API shape for a single speaker. It needs `@google/genai`; check the docs for the minimum version, since the page states one only for the multi-speaker format.

```js
// scripts/narrate.mjs  (run before `next build`)
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.8-flash-tts";
const VOICE = "Kore";
const steps = JSON.parse(readFileSync("tour/steps.json", "utf8")); // [{ id, text, style }]
const client = new GoogleGenAI({});
mkdirSync("public/tour-audio", { recursive: true });

const manifest = {};
for (const { id, text, style } of steps) {
  const hash = createHash("sha256")
    .update(JSON.stringify([MODEL, VOICE, style, text]))
    .digest("hex")
    .slice(0, 12);
  const file = `${id}.${hash}.wav`;
  const path = `public/tour-audio/${file}`;

  if (!existsSync(path)) {
    const interaction = await client.interactions.create({
      model: MODEL,
      input: [{
        type: "user_input",
        content: [{
          type: "text",
          text,
          annotations: [{ type: "speech_metadata", style }],
        }],
      }],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice: VOICE }] },
    });
    writeFileSync(path, Buffer.from(interaction.output_audio.data, "base64"));
  }
  manifest[id] = { src: `/tour-audio/${file}`, transcript: text };
}
writeFileSync("public/tour-audio/manifest.json", JSON.stringify(manifest, null, 2));
```

Wire it in with `"prebuild": "node scripts/narrate.mjs"` in `package.json`. Then compress the WAVs with a tool such as ffmpeg and point the manifest at the compressed files; check the flags for your target codec rather than copying mine from memory.

The player is a client component with no autoplay and the transcript beside it:

```tsx
"use client";
import { useRef, useState } from "react";

export function TourStep({ src, transcript }: { src: string; transcript: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); }
  };

  return (
    <section>
      <p>{transcript}</p>
      <button type="button" onClick={toggle} aria-pressed={playing}>
        {playing ? "Pause narration" : "Play narration"}
      </button>
      <audio ref={audio} src={src} preload="none" onEnded={() => setPlaying(false)} />
    </section>
  );
}
```

`preload="none"` means a visitor who never presses play downloads no audio, and the page's performance numbers do not move.

## Takeaways

- Generate narration at build time and serve static files. The model has no runtime role in a tour whose script changes quarterly.
- Hash model, voice, style and text into the filename. It makes caching safe and regeneration incremental.
- At the documented 25 audio tokens per second, a 6-minute tour is 9,000 tokens: about eight cents on Flash TTS before 1 January 2027, sixteen after.
- Never autoplay. WCAG 1.4.2 sets the floor at a pause control for audio longer than 3 seconds; ship the transcript as text as well.
- Move off any `-preview` TTS model before 17 November 2026, the earliest shutdown date on the deprecations page.

For the runtime alternative, a route handler that narrates a page on demand, see the earlier post on the Gemini 3.8 Flash TTS voices endpoint and a narrated product tour.
