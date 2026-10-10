---
title: "Lyria 3.5: full-length song generation and what it means for creative tooling"
description: "lyria-3.5 generates songs of a couple of minutes from text or images at $0.08 each. The API call, a draft-then-render workflow, and the licensing questions."
date: 2026-10-10T01:18:00Z
tags: ["Lyria 3.5", "music generation", "Gemini API", "Interactions API", "licensing"]
pillar: model-watch
sources:
  - title: "Gemini API changelog (Lyria 3.5 generally available, 3 September 2026)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Gemini API docs: generate music with Lyria 3.5"
    url: "https://ai.google.dev/gemini-api/docs/music-generation"
  - title: "Gemini API pricing (Lyria 3.5, Lyria 3 Clip and Pro)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Google: Create your best tracks yet with Lyria 3.5 in Gemini (4 September 2026)"
    url: "https://blog.google/innovation-and-ai/products/gemini-app/better-tracks-lyria-gemini/"
  - title: "Gemini API Additional Terms of Service"
    url: "https://ai.google.dev/gemini-api/terms"
  - title: "Music Business Worldwide: Google moves to dismiss indie artists' Lyria 3 lawsuit (secondary)"
    url: "https://www.musicbusinessworldwide.com/google-moves-to-dismiss-indie-artists-lawsuit-over-lyria-3-ai-training-arguing-they-licensed-their-music-to-youtube/"
draft: false
---

As of 10 October 2026, a song from the Gemini API costs eight cents and takes one call. `lyria-3.5` went generally available on 3 September, and it returns full-length tracks of about two minutes, with lyrics, from a text prompt or from images. The technical part is easy. The part a product team has to think about is what you are allowed to do with the audio, and the documents are thinner there than on the API itself.

## What shipped?

The Gemini API changelog has an entry dated 3 September 2026 titled "Lyria 3.5 generally available (GA)". It describes `lyria-3.5` as the next generation of Google's music model, offering full-length song generation with improved musical coherence and natural vocals, finer control over duration and structure, text and image input, and 44.1 kHz stereo output. Google's consumer announcement followed on 4 September: its post says Lyria 3.5 is available to all users globally in the Gemini app, and for developers through the Gemini API and Google AI Studio, with other surfaces in Flow Music and Google Vids. That post says nothing about rights, training data or safeguards; it is a product announcement.

The music-generation docs list two model IDs:

| Model ID | Output | Format |
|---|---|---|
| `lyria-3-clip-preview` | Always 30 seconds: "short clips, loops, previews" | MP3 |
| `lyria-3.5` | Full songs, "a couple of minutes (controllable using prompt)" | MP3 by default |

Both are called through the Interactions API and both produce 44.1 kHz stereo audio. The changelog also records that the Lyria 3 family, including `lyria-3-clip-preview` and `lyria-3-pro-preview`, launched on 25 March 2026. The pricing page now calls that family legacy.

## What does it cost?

The pricing page lists `lyria-3.5` at $0.08 per song on the paid tier, with no free tier. The legacy Lyria 3 Clip Preview is $0.04 per 30-second clip, and Lyria 3 Pro Preview is $0.08. Per-song pricing is simple to budget, which makes the real cost the number of attempts, not the length of the audio.

## How do you control what comes out?

The docs give a short list of levers.

- **Structure tags.** `[Verse]`, `[Chorus]` and `[Bridge]` give the model a skeleton to follow.
- **Timestamps.** You can write sections as `[0:00 - 0:10] Intro: ...`, which is the documented way to control timing.
- **Language.** Lyrics are generated in the language of the prompt.
- **Specificity.** The docs say vague prompts produce generic results, and recommend naming instruments, BPM, key, mood and structure.
- **Separation.** If you supply your own lyrics, keep them apart from the musical direction.
- **Images.** You can send up to 10 images alongside text, for example "an atmospheric ambient track inspired by the mood and colors in this image."

Three documented limits shape any product. Generation is single-turn, so you cannot ask the model to fix the bridge of a track it just made. Results "may vary between calls, even with the same prompt", so you cannot regenerate a track you liked; store what you get. And prompts that ask for specific artists' voices or copyrighted lyrics are blocked by safety filters.

## Hands-on: draft cheap, render once

The docs suggest using the faster clip model to experiment with prompts before a full-length generation. That maps onto a workflow with a price: iterate on 30-second clips at $0.04, then spend $0.08 on the song. Five drafts plus one render is $0.28 per finished track; rendering six full songs to get the same choice would cost $0.48. At 100 tracks a day, that is $28 against $48. These are list prices from the pricing page, and your acceptance rate will decide the real number.

This Python sketch follows the docs' request and response shapes. Check the docs for client setup details and for the exact parameter if you want WAV rather than MP3; the page shows `response_format={"type": "audio"}` but does not name a format in the example.

```python
import base64
from google import genai

client = genai.Client()

BRIEF = """Warm indie-pop, 96 BPM, key of D major, acoustic guitar and soft drums, female vocals.
[0:00 - 0:10] Intro: fingerpicked guitar, no vocals.
[Verse] Quiet streets after the rain, we walk the long way home.
[Chorus] Light the windows one by one, we are not alone.
"""

def render(model: str, prompt: str):
    interaction = client.interactions.create(model=model, input=prompt)
    lyrics, audio = [], None
    for step in interaction.steps:
        if step.type == "model_output":
            for block in step.content:
                if block.type == "audio":
                    audio = base64.b64decode(block.data)
                elif block.type == "text":
                    lyrics.append(block.text)
    return "\n".join(lyrics), audio

# 1. Draft on the clip model (30 s, $0.04 each). Listen, edit the brief, repeat.
_, clip = render("lyria-3-clip-preview", BRIEF)
with open("draft.mp3", "wb") as f:
    f.write(clip)
```

When the brief is settled, call `render("lyria-3.5", BRIEF)` once and write `output.mp3` the same way. For an image-led track, send a list for `input` containing a text part and an image part with `mime_type` and base64 `data`, as the docs show.

Persist the lyrics, the prompt and the audio together, with a hash of the brief. Because output varies, the stored file is your only record of what the model produced.

## What about licensing and ownership?

This is the weakest-documented part of the launch, so I will stay close to what pages say.

The Gemini API Additional Terms say Google "won't claim ownership over that content", but also that "Google may generate the same or similar content for others", and that you are responsible for your use of generated content and for how anyone you share it with uses it. That is not exclusivity. The terms require compliance with Google's Prohibited Use Policy. The page I read does not address indemnity; those provisions, if any, would be in the separate Google APIs terms I did not read. The music docs add that all output carries an imperceptible SynthID watermark. A watermark identifies the audio as generated; it does not clear rights.

Training data is the open question, and it concerns the earlier model. Music Business Worldwide, a secondary source, reports that independent artists sued Google in March over Lyria 3, alleging it was trained on their YouTube recordings without permission. Per the same report, Google moved to dismiss on 8 June in the US District Court for the Northern District of Illinois, arguing the artists licensed their uploads to YouTube under its terms of service. Those are the plaintiffs' allegations and Google's arguments, not findings. The article, dated 10 June, reports no ruling, and I found none in what I read. The suit is about Lyria 3, not 3.5, and I have not seen anything stating what Lyria 3.5 was trained on.

My design view, not legal advice: if generated music will ship in a paid product, read the terms yourself, keep records of prompts and outputs, avoid prompts that imitate named artists, and get a lawyer's opinion before you make exclusivity promises to customers.

## What does it mean for creative tooling?

Per-song pricing and a 30-second draft model make music a normal asset in a content pipeline: background tracks for product videos, jingles for short-form clips, placeholders for a human composer. Single-turn generation means you design for "regenerate with a better brief", not "edit". The practical product choice is where the human sits: choosing among drafts is cheap; fixing a finished track is not possible.

## Takeaways

- `lyria-3.5` has been generally available since 3 September 2026: songs of about two minutes, text or image input, 44.1 kHz stereo, $0.08 each, paid tier only.
- Draft on `lyria-3-clip-preview` at $0.04 per 30 seconds, then render once; five drafts and one render is $0.28.
- Generation is single-turn and varies between calls, so store every output you might want again.
- Google says it will not claim ownership of output, but it may generate similar content for others; the page I read is silent on indemnity.
- The reported lawsuit concerns Lyria 3 training and is undecided as far as I could find; get legal review before shipping generated music commercially.

For another recent Gemini release with a dated migration attached, see the previous post on the Antigravity agent preview.
