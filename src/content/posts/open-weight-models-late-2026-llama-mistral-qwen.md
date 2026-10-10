---
title: "Open-weight models in late 2026: where Llama, Mistral and Qwen stand"
description: "As of 10 Oct 2026: Qwen3.8 and Mistral Small 4 are open, Mistral Large 4 is API-only for now, and Meta has nothing newer than Llama 4. Licences and when to self-host."
date: 2026-10-10T01:32:00Z
tags: ["open weights", "Llama", "Mistral", "Qwen", "licences", "self-hosting"]
pillar: model-watch
sources:
  - title: "Hugging Face model card: Qwen/Qwen3.8-27B (Apache 2.0)"
    url: "https://huggingface.co/Qwen/Qwen3.8-27B"
  - title: "Hugging Face model card: Qwen/Qwen3.8-2.4T-A95B (Qwen3.8-Max License)"
    url: "https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B"
  - title: "Qwen3.8-Max License text (Hugging Face LICENSE file)"
    url: "https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B/blob/main/LICENSE"
  - title: "Mistral: Introducing Mistral Small 4 (16 March 2026)"
    url: "https://mistral.ai/news/mistral-small-4"
  - title: "Mistral Medium 3.5 128B licence text (Modified MIT, Hugging Face LICENSE file)"
    url: "https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/main/LICENSE"
  - title: "Mistral: Introducing Mistral Large 4 (6 October 2026)"
    url: "https://mistral.ai/news/mistral-large-4"
  - title: "Llama 4 Community License (meta-llama/llama-models on GitHub)"
    url: "https://github.com/meta-llama/llama-models/blob/main/models/llama4/LICENSE"
  - title: "Meta Llama organisation on Hugging Face (newest repos and dates)"
    url: "https://huggingface.co/meta-llama"
draft: false
---

As of 10 October 2026, the open-weight picture has split three ways. Qwen has shipped a permissive mid-size model and a very large model under a custom licence. Mistral has a fully open Small 4, a revenue-capped Medium 3.5, and a Large 4 that is API-only until, it says, the end of the month. Meta's newest Llama weights are still from 2025. The licence now matters as much as the benchmark when you choose, so this post goes through them one by one.

## What has Qwen released?

Qwen's Hugging Face organisation lists a Qwen3.8 family from August 2026, and two of its members show the range.

**Qwen3.8-27B** is a 27B model (28B parameters in the safetensors listing) with a vision encoder, and its card lists "License: apache-2.0". It has a native context of 262,144 tokens, "extensible up to 1,000,000 tokens", and the card names Transformers, vLLM and SGLang as supported libraries.

**Qwen3.8-2.4T-A95B** is the large one: "2.4T in total and 95B activated" parameters, native 262,144 context and extensible to 1,010,000 tokens. The card's licence field reads "qwen3.8-max", not Apache, and it is titled "Qwen3.8-Max: A New Bar for Coding and Cowork". The card notes the hosted API supports vision input, which the open weights do not.

That licence field is the thing to read. The Qwen3.8-Max License file says, as I read it, three things:

- **A display rule.** Commercial products above a threshold of "more than 100,000,000 monthly active users or US$ 20,000,000" in monthly revenue must show the model name in the interface. Read the licence text for the exact wording before relying on my summary.
- **A separate licence for two business types.** A "Model as a Service" or "AI Work Assistant" business with revenue above US$50,000,000 in any consecutive twelve-month period must obtain a separate licence from Qwen.
- **An internal-use carve-out.** The separate-licence requirement does not apply to internal use, as long as the software and its outputs are not made available to a third party.

So, within Qwen3.8, 27B is a normal Apache 2.0 choice, and the 2.4T model is usable for most product teams but not for resellers of inference above the threshold.

## What has Mistral released?

Mistral's news page lists a run of 2026 announcements. Three matter for a product team.

**Mistral Small 4** (16 March 2026) is a mixture-of-experts model with 119B total and 6B active parameters per token, a 256k context window, and an Apache 2.0 licence. The announcement says "Mistral Small 4 is fully open source".

**Mistral Medium 3.5** is a dense 128B model with a 256k context. Its card says "Modified MIT License" and describes it as open for commercial and non-commercial use "with exceptions for companies with large revenue". The LICENSE file sets that threshold at US$20 million in "global consolidated monthly revenue" of your company, or your employer, for the preceding month. Above that, you are "not authorized to exercise any rights under this license" until you agree a commercial licence with Mistral. For a startup it is free to use; for a large employer, it is a procurement conversation.

**Mistral Large 4** was announced on 6 October 2026 as a public preview. Mistral describes it as "a 1 trillion-parameter natively multimodal model with 52 billion active parameters". It is API-only for now, at $1.36 per million input tokens and $4.18 per million output tokens on Mistral Studio, and Mistral says "We will release the weights by the end of the month". The announcement does not state a licence. As of today, that is a promise, not a download, so do not plan around a licence nobody has read.

## What has Meta released?

The honest answer is nothing new. Meta's organisation on Hugging Face lists Llama 4 Scout and Maverick as the newest Llama family, with the latest update to those repos on 22 May 2025. No repo on the page is dated 2026; the most recent is a safety classifier from November 2025. Llama 4's original April 2025 launch date comes from search results rather than a Meta page I fetched, so treat that date as secondary. I did not find a Llama 5 or an open-weight release from Meta's newer model lines.

The Llama 4 Community License is the standard custom licence. It requires a separate licence, granted at Meta's "sole discretion", if your products exceeded 700 million monthly active users in the month before the Llama 4 release date. It also requires you to "prominently display 'Built with Llama'" when you distribute, and, if you use the materials to create, train or improve a distributed AI model, to start that model's name with "Llama". It incorporates an Acceptable Use Policy by reference; I did not read that policy, so check it. The licence text I fetched contains no region-specific usage restriction beyond naming the contracting Meta entity by location.

## What does it mean for people shipping products?

I would rank the licences by how much friction they create for a normal product company:

| Model | Licence | What to check |
|---|---|---|
| Qwen3.8-27B | Apache 2.0 | Nothing special |
| Mistral Small 4 | Apache 2.0 | Nothing special |
| Qwen3.8-2.4T-A95B | Qwen3.8-Max License | Display rule; reselling inference or an AI work assistant over US$50M |
| Mistral Medium 3.5 | Modified MIT | US$20M monthly revenue cap |
| Llama 4 Scout, Maverick | Llama 4 Community License | 700M MAU, "Built with Llama", naming rule, AUP |
| Mistral Large 4 | Not stated; weights not out | Wait |

The licence column is more stable than the leaderboard. A model that is 3% better on a public benchmark and carries a revenue cap your employer will trip next year is a worse choice than an Apache model you can ship anywhere.

On when to self-host, I think there are five honest reasons: data that cannot leave your network, a request volume where fixed GPU cost beats per-token cost, a fine-tune you need to own, latency you cannot get from a hosted API, and a regulator or customer who asks where inference runs. "Open weights are cheaper" is on the list only above a volume threshold, and most products do not reach it. The hosted price floor is also low, and it keeps falling, which is why the break-even below is worth running before you buy a GPU.

## Hands-on: a break-even calculation

Self-hosting is a fixed monthly cost, and the hosted API is a variable cost. The crossover is the monthly token volume at which they are equal. Fill in your own GPU price and node size; the numbers below are an assumption for illustration, not a quote.

```python
def breakeven_billion_tokens(gpu_hourly, gpus, api_in, api_out, in_share=0.8, hours=730):
    """Monthly volume (billions of tokens) where self-hosting equals the hosted API.
    api_in / api_out are USD per million tokens; in_share is the input fraction."""
    fixed = gpu_hourly * gpus * hours                  # USD per month, GPUs always on
    blended = in_share * api_in + (1 - in_share) * api_out   # USD per million tokens
    return fixed / blended / 1000

# Assumption: 2 GPUs at $4 per GPU-hour, always on = $5,840 a month.
print(breakeven_billion_tokens(4, 2, 0.10, 0.50))   # cheap hosted tier (illustrative) -> ~32.4
print(breakeven_billion_tokens(4, 2, 2.00, 10.00))  # mid hosted tier (illustrative)   -> ~1.6
print(breakeven_billion_tokens(4, 2, 1.36, 4.18))   # Mistral Large 4 preview prices   -> ~3.0
```

On those assumptions you need about 32 billion tokens a month to beat a hosted tier priced at $0.10 and $0.50 per million, 1.6 billion to beat one at $2 and $10, and 3 billion to beat Mistral Large 4's preview pricing, the only price here taken from a vendor page I fetched. The other two are round numbers; use your provider's. The calculation leaves out engineers, on-call, upgrade time, idle capacity and quality differences, all of which push the break-even higher. It also assumes the GPUs sustain that volume, which you must measure on your own prompts.

## Takeaways

- Qwen3.8-27B and Mistral Small 4 are Apache 2.0 and ship-anywhere safe. The Qwen3.8 2.4T model and Mistral Medium 3.5 carry custom terms with explicit thresholds.
- Mistral Large 4 is API-only as of 10 October 2026, with weights promised by the end of the month and no licence stated.
- Meta's newest Llama weights are Llama 4 from 2025; I found no newer open release, and the licence has a 700M-user clause, a "Built with Llama" requirement and a naming rule.
- Read the LICENSE file, not the model card summary. The thresholds are in the file.
- Self-host for data control, ownership or latency first, and for cost only after you have run the break-even with your own numbers.

If you want to price the hosted side more carefully first, the prompt-caching economics post on this blog shows how much cached input changes the comparison.
