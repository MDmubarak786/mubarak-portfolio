---
title: "Nano Banana 2.1 in the Gemini API: 4K pricing and where it fits"
description: "gemini-nano-banana-2.1 went GA on 6 October with 1K, 2K and 4K output and panoramic ratios. Per-image prices, what it replaces, and a Python call you can adapt."
date: 2026-10-10T01:10:00Z
tags: ["Nano Banana 2.1", "image generation", "Gemini API", "pricing", "Open Graph images"]
pillar: model-watch
sources:
  - title: "Gemini API changelog (6 October 2026: Nano Banana 2.1 GA, 3.1 Flash Image deprecated)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Gemini API docs: image generation (models, sizes, parameters, thinking, references)"
    url: "https://ai.google.dev/gemini-api/docs/image-generation"
  - title: "Gemini API pricing (per-image prices for Nano Banana 2.1 and 3.1 Flash Image)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Gemini API deprecations (Imagen 4, 2.5 Flash Image, 3.1 Flash Image dates)"
    url: "https://ai.google.dev/gemini-api/docs/deprecations"
  - title: "Gemini API models overview (current image models)"
    url: "https://ai.google.dev/gemini-api/docs/models"
draft: false
---

As of 10 October 2026, the Gemini API's default image model is `gemini-nano-banana-2.1`, generally available since 6 October. It costs about half as much per image as the model it replaces at 1K and 2K, adds extreme panoramic aspect ratios, and Google has deprecated `gemini-3.1-flash-image` in its favour. If you generate hero images, product shots or social cards through the API, this is a model-string change worth pricing before you make it.

## What shipped on 6 October?

The changelog entry says Nano Banana 2.1 improves visual quality, prompt adherence, multi-turn character consistency and text rendering, and adds panoramic ratios of 1:4, 4:1, 1:8 and 8:1 at 1K, 2K and 4K. The same entry deprecates `gemini-3.1-flash-image` and says to migrate to `gemini-nano-banana-2.1`. No shutdown date has been announced for the old model; the deprecations table shows "none announced".

The image-generation docs now list five models:

| Model | ID | What the docs say |
|---|---|---|
| Nano Banana 2.1 | `gemini-nano-banana-2.1` | Current primary model; 1K, 2K, 4K |
| Nano Banana 2 Lite | `gemini-3.1-flash-lite-image` | Fastest and cheapest; 1K only; no Search grounding |
| Nano Banana 2 | `gemini-3.1-flash-image` | Previous generation; replace with 2.1 for new projects |
| Nano Banana Pro | `gemini-3-pro-image` | Complex tasks and professional assets |
| Nano Banana (legacy) | `gemini-2.5-flash-image` | Docs recommend migrating to Lite |

The legacy model has a shutdown of 15 March 2027 in the deprecations table. Imagen 4 is already gone: its three models show a shutdown of 17 August 2026, with Nano Banana 2.1 as the named replacement. If anything in your stack still calls `imagen-4.0-generate-001`, it is not working.

Other documented details for 2.1:

- Sizes are 1K, 2K and 4K, and the K must be uppercase; lowercase values are rejected. The 512px size exists only on 3.1 Flash Image.
- Up to 14 reference images in total: 10 object images and 4 character images.
- Thinking is always on and cannot be disabled through the API. 2.1 supports `minimal`, `medium` and `high`, defaulting to `medium`. The model can emit up to two interim "thought" images, which are not charged.
- Google Search and Image Search grounding are available on 2.1. When Image Search is used, the docs say search suggestions must be displayed.
- Multi-turn editing works through `previous_interaction_id`.
- Every generated image carries a SynthID watermark.

I did not see the full list of supported aspect ratios for 2.1 on the docs page I fetched, only the examples (1:1, 16:9, 5:4) and the panoramic additions from the changelog. Check the docs for the exact list before you hard-code one.

## How much does a 4K image cost?

From the pricing page, standard tier, output images at $30 per million tokens:

| Size | Tokens per image | Nano Banana 2.1 | 3.1 Flash Image |
|---|---|---|---|
| 1K | 1,120 | $0.0336 | $0.067 |
| 2K | 1,680 | $0.0504 | $0.101 |
| 4K | 3,780 | $0.113 | $0.151 |

The 3.1 Flash Image column uses its own listed per-image prices ($60 per million output tokens). So 2.1 is roughly half the price at 1K and 2K and about a quarter cheaper at 4K. Batch halves the 2.1 figures: $0.0168, $0.0252 and $0.0567.

The catch is input. 2.1 charges $1.50 per million input tokens against $0.50 on 3.1 Flash Image, three times as much. A prompt with a couple of sentences does not notice. A workflow that sends ten reference images on every call might; I did not see a tokens-per-input-image figure, so measure it on your own usage before you assume the saving holds.

Also unclear from the pages I read: whether the per-image price already includes thinking tokens, given the docs note that "thinking tokens are billed by default for thinking models". Check your first invoice against the table.

A worked case. A site with 100 posts, three candidate images per post, pick one:

- At 1K: 300 × $0.0336 = $10.08.
- At 4K: 300 × $0.113 = $33.90.
- At 1K in batch: 300 × $0.0168 = $5.04.

None of that is a budget problem. The cost that matters is the second pass: regenerating when the first output has the wrong text or the wrong mood.

## What it means for people shipping products

**Use 1K until a human asks for more.** 4K costs 3.4 times a 1K image. A 1K draft tells you whether the composition works. Regenerating at 4K will not reproduce the same picture, so decide the size before you pick a winner, or use multi-turn editing on the draft you like. 2K costs 50% more than 1K.

**Pick the model by job.** For bulk illustration at 1K with no references and no grounding, the docs' Lite model (`gemini-3.1-flash-lite-image`) is described as the fastest and cheapest, though it has no Search grounding and no multi-turn optimisation; I did not see its price, so price it yourself. For multi-turn character consistency, reference images or grounded imagery, 2.1 is the documented choice.

**Be honest about text.** The docs say the models can produce legible, stylized text and that 2.1 improves on this. Improved is not exact. For anything where the words must be right, such as an Open Graph card with a post title, I would keep a deterministic renderer. This site generates its Open Graph images at build with satori, and I would not swap that for a model; I would use a model for the art behind or beside it, if at all.

**Plan for the watermark.** All output carries SynthID. That is fine for blog illustration and marketing mock-ups. If your brand or client rules require clean assets, find out before you commit to the workflow.

**Treat the migration as a visual change.** A new model gives different compositions for the same prompt. If you have prompts tuned on 3.1 Flash Image, regenerate a sample set, compare side by side, and re-approve before you flip the string in production. The deprecation has no date yet, which is a reason to do this calmly now, not a reason to wait.

## Hands-on: one call, one cost function

The docs' Python sample calls the Interactions API and reads `interaction.output_image.data`. The size and ratio parameters appear in the docs as a `response_format` object with `type`, `mime_type`, `aspect_ratio` and `image_size`. I saw that object in the REST example; check the docs for the exact Python keyword in your SDK version.

```python
import base64
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-nano-banana-2.1",
    input="Isometric illustration of a laptop on a desk, warm light, no text",
    response_format={
        "type": "image",
        "mime_type": "image/jpeg",
        "aspect_ratio": "16:9",
        "image_size": "1K",          # uppercase K, or the request is rejected
    },
)

with open("hero.jpg", "wb") as f:
    f.write(base64.b64decode(interaction.output_image.data))

# Listed standard-tier prices per image, USD, from the pricing page.
PRICE = {"1K": 0.0336, "2K": 0.0504, "4K": 0.113}

def batch_cost(n_images: int, size: str = "1K") -> float:
    return round(n_images * PRICE[size], 4)

print(batch_cost(300, "1K"))   # 10.08
```

Two extensions are worth building. For editing, pass the first interaction's id as `previous_interaction_id` and ask for one change; the docs describe this as the multi-turn path. For a social card, generate at 16:9 and crop. 16:9 is a ratio the docs show; a 1200 by 630 card is wider, so crop the height:

```python
from PIL import Image

img = Image.open("hero.jpg")
w, h = img.size
target_h = round(w * 630 / 1200)
top = (h - target_h) // 2
img.crop((0, top, w, top + target_h)).resize((1200, 630)).save("og.jpg", quality=88)
```

## Takeaways

- `gemini-nano-banana-2.1` is GA as of 6 October; `gemini-3.1-flash-image` is deprecated with no shutdown date yet, and Imagen 4 shut down on 17 August.
- Per image: $0.0336 at 1K, $0.0504 at 2K, $0.113 at 4K, against $0.067, $0.101 and $0.151 on the previous model.
- Input is three times dearer ($1.50 against $0.50 per million), so check reference-image-heavy workflows separately.
- Default to 1K, keep text-critical graphics in a deterministic renderer, and decide about SynthID before you build on it.
- Regenerate and re-approve a sample set before switching production prompts across models.

If you are weighing this against the rest of Google's autumn releases, the issue on Gemini 3.8 Flash TTS and the voices endpoint covers the audio side of the same changelog.
