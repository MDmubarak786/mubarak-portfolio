---
title: "Hosted APIs vs open weights for a product team: five questions"
description: "Data residency, cost at volume, who is on call, quality and speed of change: five questions that decide hosted API or open weights, with a break-even sketch to copy."
date: 2026-10-10T02:12:00Z
tags: ["open weights", "self-hosting", "decision", "data residency", "LLM pricing", "vLLM"]
pillar: building
sources:
  - title: "Hugging Face docs: Inference Providers (one API, many providers, OpenAI-compatible router)"
    url: "https://huggingface.co/docs/inference-providers/index"
  - title: "Hugging Face docs: Inference Providers pricing and billing (no markup, routed vs custom key)"
    url: "https://huggingface.co/docs/inference-providers/pricing"
  - title: "Hugging Face model card: openai/gpt-oss-120b (licence, parameters, hardware)"
    url: "https://huggingface.co/openai/gpt-oss-120b"
  - title: "vLLM docs: OpenAI-compatible online serving (endpoints)"
    url: "https://docs.vllm.ai/en/latest/serving/online_serving/"
  - title: "Claude docs: pricing (data residency multiplier, regional endpoints, Batch API)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: model deprecations (retirement policy and dates)"
    url: "https://platform.claude.com/docs/en/about-claude/model-deprecations"
  - title: "Wavect: open-weight LLM comparison 2026 (third-party blog; licence caveats, updated 5 Oct 2026)"
    url: "https://wavect.io/blog/open-weight-llm-comparison-2026/"
draft: false
---

Every few months a team asks whether it should stop paying a lab per token and run its own model. The honest answer is "it depends on five things", and four of them have nothing to do with benchmark scores. As of October 2026 open weights are strong enough that the question is real, which is exactly why it is worth asking it properly instead of by vibes.

This is the decision as I would walk a product team through it. It is a design argument, not a benchmark; where I use a number, it comes from a vendor or docs page I cite.

## 1. Where does the data have to live?

Start here, because it can end the conversation. If a contract or regulator says prompts must stay inside your own network, no hosted API qualifies and the rest of this post is about how to self-host well.

If the requirement is a geography rather than a network, hosted options exist and they have a price. Claude's pricing page says that for Claude 4.6 and later models, US-only inference through the `inference_geo` parameter "incurs a 1.1x multiplier on all token pricing categories", input, output, cache writes and cache reads included; global routing is the default at standard prices. On Amazon Bedrock and Google Cloud the page says regional and multi-region endpoints "include a 10% premium over global endpoints", and those partner platforms set their own pricing and retirement schedules.

Aggregators need a closer look. Hugging Face's Inference Providers describe themselves as "a unified proxy layer" between your app and multiple providers, with "Automatic Failover" when you leave provider selection on `auto`. Great for flexibility, but your prompts then flow through Hugging Face to a provider you may not have chosen. The pages I read did not state where each provider runs, so if residency matters, pin the provider explicitly and ask that provider where inference happens.

## 2. What does it cost at your volume?

A hosted model charges per token and nothing when idle. A self-hosted one charges per GPU-hour whether anyone asks a question or not. So the comparison is a break-even volume, and it needs one number that only you have: the all-in monthly price of the hardware you would run on.

What I can source: Claude Sonnet 5.5 is $2 per million input tokens and $10 per million output; the Batch API halves both to $1 and $5. For hardware, the gpt-oss-120b model card says the model is 117B parameters with 5.1B active, and was designed to "fit into a single 80GB GPU (like NVIDIA H100 or AMD MI300X)". So one 80GB card is the floor for that model, before redundancy.

The sketch below turns those into a break-even. I use $3 a GPU-hour purely as a placeholder to show the arithmetic; replace it with your quote.

```python
HOURS = 730  # 24 * 365 / 12

def breakeven_calls_per_month(gpu_per_hour, gpus, in_tok, out_tok, in_price, out_price):
    """Calls a month at which a fixed GPU bill equals a per-token API bill (USD per million tokens)."""
    monthly = gpu_per_hour * gpus * HOURS
    per_call = (in_tok * in_price + out_tok * out_price) / 1_000_000
    return monthly / per_call

# a 1,000-token prompt and 250-token answer
print(breakeven_calls_per_month(3.00, 1, 1000, 250, 2.00, 10.00))  # Sonnet 5.5: ~486,000 calls/month
print(breakeven_calls_per_month(3.00, 1, 1000, 250, 1.00, 5.00))   # Sonnet 5.5 batch: ~973,000
```

At those placeholders, a single GPU breaks even with Sonnet 5.5 at roughly 16,000 calls a day, or about 32,000 a day against batch pricing. Two things make that flattering to self-hosting: it assumes the GPU is busy enough to serve that volume, and it counts nothing for the people. Run two GPUs for failover and the break-even doubles.

It also compares unlike things. The fairer rival to your own GPU is an open model on a hosted provider. Hugging Face says it charges "the same rates as the provider, with no additional fees", and its router lists per-provider pricing, so you can look up what a hosted gpt-oss-120b costs per token before you buy any hardware. I did not find that rate on a page I could cite, so the hands-on below shows how to fetch it.

## 3. Who is on call for it?

Provisioning is the easy part. My own stack includes Terraform, Docker, AWS and Milvus, and standing up a GPU box from code is not what would worry me. The work that does not go away is operating it: choosing a serving stack and upgrading it, batching and quantisation settings, cold starts and capacity planning, failover when a card dies, and an on-call rotation for a latency-sensitive service. vLLM gives you an OpenAI-compatible server with `/v1/chat/completions`, `/v1/responses`, `/v1/embeddings` and `/metrics`, which makes the integration cheap. It does not make the operation cheap.

Ask the team plainly: if inference is down at 3 a.m., who gets paged, and what do they do? If the answer is a shrug, the hosted API is cheaper than it looks, because the vendor's on-call is bundled into the per-token price.

## 4. Is the quality enough for this job?

Open weights are not one thing, and neither are their licences. gpt-oss-120b is Apache 2.0 with three reasoning levels and a required "harmony" response format. A third-party comparison, which I cite as a blog and not a primary source, lists DeepSeek V4 under MIT and Qwen3.8-27B under Apache 2.0, but custom terms on the biggest Qwen and Kimi K3 models for very large products and model-as-a-service businesses, and a Llama 4 use policy that withholds its multimodal grant from EU-domiciled developers. Read the licence text on the model's own Hugging Face page before building on any of them.

On quality, I would not trust a leaderboard for your task. Build a labelled eval set from real traffic, run the open model and your hosted incumbent over it, and compare pass rates. The same harness you would use for a version upgrade works here; the migration playbook post walks through one. The decision is rarely "is the open model as good as the best hosted one". It is "is it good enough for this workload at this price". Classification, extraction and routing often clear that bar. Long agentic runs often do not.

## 5. How fast does your world change?

Hosted APIs move under you. Anthropic's deprecations page says it "regularly retires older" models; Sonnet 4.5 was deprecated on 30 September 2026 and retires on 30 November, and the page promises at least 60 days' notice. That forced migration is a real cost, but so is the opposite: with open weights you choose when to move, and every upgrade to a better model is a project you run yourself, including re-tuning the serving setup.

Hosted also gets new capability without effort. Open weights give you stability and control. Pick which of those your product is short of.

## Hands-on: one client, three backends

The cheapest hedge is to keep the model behind a thin interface from day one. Hugging Face documents an OpenAI-compatible router at `https://router.huggingface.co/v1`, with `:cheapest`, `:fastest` and `:preferred` suffixes on the model name, and `:groq`-style suffixes to pin a provider. A vLLM server speaks the same chat completions dialect, so both can share a client. I did not see the default vLLM port on the page I read, so the URL below is a placeholder.

```python
import os, requests
from openai import OpenAI

hf = OpenAI(base_url="https://router.huggingface.co/v1", api_key=os.environ["HF_TOKEN"])
own = OpenAI(base_url="http://llm.internal:8000/v1", api_key="unused")  # your vLLM host; check your port

def complete(prompt: str, backend: str = "hf") -> str:
    client, model = (hf, "openai/gpt-oss-120b:cheapest") if backend == "hf" else (own, "openai/gpt-oss-120b")
    r = client.chat.completions.create(model=model, messages=[{"role": "user", "content": prompt}])
    return r.choices[0].message.content

# What would a hosted open model cost? The docs say GET /v1/models returns per-provider
# pricing, context length, latency and throughput; check the docs for the exact field names.
models = requests.get("https://router.huggingface.co/v1/models",
                      headers={"Authorization": f"Bearer {os.environ['HF_TOKEN']}"}).json()
```

Put the Claude call behind the same `complete()` function using its own SDK. Then your eval harness, your flag and your cost logging do not care which backend answered, and moving traffic between a lab, an aggregator and your own GPU is a config change.

## Takeaways

- Residency first. If prompts cannot leave your network, self-host. If they only need to stay in a region, price it: Claude's US-only inference is 1.1x on 4.6 and later models.
- Compute the break-even with your real GPU quote and a realistic utilisation. One 80GB card is the floor for gpt-oss-120b, and failover doubles it.
- Compare self-hosting against hosted open weights as well as against a closed API; the aggregator sells you the open model without the pager.
- Read each licence. The biggest open models often carry custom terms.
- Keep one `complete()` interface and your own eval set, so the choice stays reversible.

If you start hosted, the post on prompt caching economics shows why that bill is often smaller than the list price suggests.
