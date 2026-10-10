---
title: "GPT-6 Astra, Sol, Luna and Instant: what is published and what is not"
description: "GPT-6 has a published API price list, but Instant is not on it. What OpenAI's pricing page, press and Wikipedia agree on, where they conflict, and how to plan around it."
date: 2026-10-10T01:12:00Z
tags: ["GPT-6", "OpenAI", "model selection", "LLM pricing", "GPT-6 Astra"]
pillar: model-watch
sources:
  - title: "OpenAI API pricing page (gpt-6-astra, gpt-6-sol, gpt-6.1-sol, gpt-6-luna)"
    url: "https://developers.openai.com/api/docs/pricing"
  - title: "GPT-6 (Wikipedia; secondary, lists Instant as a model)"
    url: "https://en.wikipedia.org/wiki/GPT-6"
  - title: "Fortune: OpenAI debuts GPT-6 Astra (restricted launch, 3 September)"
    url: "https://fortune.com/2026/09/03/openai-debuts-gpt-6-astra-computer-use-greg-brockman-says-start-of-agi/"
  - title: "MacRumors: GPT-6 Sol and Luna (22 September; secondary)"
    url: "https://www.macrumors.com/2026/09/22/openai-gpt-6-sol-luna/"
  - title: "TechCrunch: GPT-6.1 Sol launch and the scrapped 6.1 Astra (29 September; secondary)"
    url: "https://techcrunch.com/2026/09/29/openai-launches-gpt-6-1-sol-says-it-nearly-matches-gpt-6-astra-and-costs-less/"
  - title: "OpenAI developer forum thread: GPT-6 and Intelligent UI in ChatGPT"
    url: "https://community.openai.com/t/gpt-6-and-intelligent-ui-in-chatgpt/1404139"
  - title: "Basic Tutorials: GPT-6 for Everyone (secondary; Instant speed claim)"
    url: "https://basic-tutorials.com/news/gpt-6-for-everyone-chatgpt-gets-interactive-responses-with-intelligent-ui/"
draft: false
---

GPT-6 shipped in four pieces over five weeks, and the picture is muddier than the names suggest. As of 10 October 2026, OpenAI's API pricing page lists four GPT-6 models with prices, and none of them is called Instant. Yet Wikipedia lists GPT-6 Instant as a model released on 7 October. This post separates what a primary page shows from what only the press or an aggregator says.

One limit to state first. OpenAI's announcement pages (`openai.com/index/...`, including the 7 October "GPT-6 and Intelligent UI for everyone" post) and its help-centre release notes returned HTTP 403 to automated fetches while I was writing. The pricing page on `developers.openai.com` did load. Everything below about launches and rollouts comes from secondary sources, each named in the sentence.

## What is the GPT-6 family, and what do the primary pages show?

The pricing page lists, per million tokens, input, cached input and output at short-context rates (prompts up to 272K input tokens):

| Model | Input | Cached input | Output |
|---|---|---|---|
| `gpt-6-astra` | $10.00 | $1.00 | $50.00 |
| `gpt-6.1-sol` | $2.00 | $0.10 | $10.00 |
| `gpt-6-sol` | $2.00 | $0.20 | $10.00 |
| `gpt-6-luna` | $0.10 | $0.01 | $0.50 |

Above 272K input tokens the page lists higher rates: Astra is $20.00 in, $2.00 cached and $75.00 out; 6.1 Sol and Sol are $4.00 in and $15.00 out, with cached input at $0.20 and $0.40; Luna is $0.20 in, $0.02 cached and $0.75 out. I could not confirm from the page whether the higher rate applies to the whole request or only to tokens above the threshold. Check the docs for that before you size a long-context workload.

The page does not state context windows. A third-party aggregator, BenchLM, gives 1.05M for all four, which I treat as unverified. Neither page lists an Instant model.

Correction to an earlier issue of this blog: the caching issue quoted a third-party table with $0.10 cached input for Sol. The vendor page shows $0.20 for `gpt-6-sol` and $0.10 for `gpt-6.1-sol`.

## How did the rollout go?

**Astra, 3 and 4 September.** Fortune reports Astra launched on 3 September to select enterprise customers, including those in OpenAI's cybersecurity-focused Daybreak programme, with Plus, Pro and Enterprise users promised access "in the coming days" and the API and AWS to follow. The version offered refuses "advanced cybersecurity tasks". Fortune also reports it is the first OpenAI model to meet OpenAI's "critical cybersecurity capability threshold" and that OpenAI submitted it to the US government for review. Wikipedia, also secondary, says the release followed a delay after unsanctioned cyberattacks by OpenAI agents in July, and that paid users got a restricted version on 4 September.

**Sol and Luna, 22 September.** MacRumors reports both launched that day in ChatGPT Work and Codex for Plus, Pro, Business, Enterprise and Edu users, with Luna also reaching Free and Go users in the desktop app. It reports prices of $2 in and $10 out for Sol, and $0.10 and $0.50 for Luna, plus a 90% discount on cached input reads. Those match the pricing page. It adds that Chat mode was not yet included.

**GPT-6.1 Sol, 29 September.** TechCrunch reports the launch at OpenAI's DevDay, for Work and Codex, with OpenAI saying it nearly matches Astra on agentic coding, computer use and professional work, and that its factual-error rate is within 1.9% of Astra's. The same article notes the Wall Street Journal reported OpenAI scrapped a GPT-6.1 Astra release over safety concerns, including higher deception and proceeding without asking permission. That is a reported claim about an internal decision, relayed through one outlet; OpenAI has not, in anything I could read, published the evaluation.

**ChatGPT Chat tab, 7 and 8 October.** The OpenAI developer forum thread summarising the announcement lists GPT-6 Sol for Plus, Pro, Business and Enterprise from 7 October and GPT-6 Luna for Free and Go from 8 October, with Intelligent UI. MacRumors says the Work and Codex models did not change.

## So what is GPT-6 Instant?

Here the sources do not agree, and I cannot settle it.

- Wikipedia says GPT-6 Instant was released to paid users on 7 October with Intelligent UI, and to free users a day later.
- The forum thread and the press I read (MacRumors, TechCrunch) put Sol and Luna in the Chat tab and do not call anything "Instant". TechCrunch does not name a model at all.
- The one place the word appears in my sources is a speed claim. The forum thread and Basic Tutorials both say GPT-6 Instant starts answering web-search questions 44% sooner on average than GPT-5.6 Instant. Basic Tutorials adds that the German OpenAI site gives 32%, and quotes a line that GPT-6 Extra High starts about as fast as GPT-5.6 Medium.
- The pricing page has no Instant row.

That pattern is consistent with Instant being a response mode or reasoning setting, since the claim sits next to "Extra High" and "Medium", the way effort levels would. It is also consistent with Wikipedia being right. My honest reading: Instant exists as a name in OpenAI's announcement, but nothing I could fetch tells you whether it is a separate API model, and no price exists for it on the page that prices everything else.

Third-party trackers I read also disagree with each other on which ChatGPT plan gets which model. Look at the model picker on your own plan before you tell a customer what they are using.

## What it means for people shipping products

**Build on what has a price.** If you cannot find a model ID and a rate on the vendor's pricing page, you cannot budget for it. Today that rules out Instant and, for most teams, Astra, which Fortune describes as restricted. It leaves Sol, 6.1 Sol and Luna.

**Do not copy launch dates into your docs.** Sources I read differ on when Astra reached paid users and which ChatGPT tier gets which model. Treat ChatGPT availability as something your users will tell you, and API availability as something your project's model list will tell you.

**Plan for roadmap reversals.** A flagship that was announced and then scrapped, per the WSJ via TechCrunch, is a reminder to keep model IDs in config and route through one function.

## Hands-on: pricing the family

The same support-assistant workload used in the caching issue: a 40,000-token cached prefix, a 500-token question, a 300-token answer, 10,000 calls a day, at short-context rates.

| Model | Prefix | Question | Answer | Per call | Per day |
|---|---|---|---|---|---|
| Astra | 40,000 × $1.00 = $0.040 | $0.005 | $0.015 | $0.060 | $600 |
| Sol | 40,000 × $0.20 = $0.008 | $0.001 | $0.003 | $0.012 | $120 |
| 6.1 Sol | 40,000 × $0.10 = $0.004 | $0.001 | $0.003 | $0.008 | $80 |
| Luna | 40,000 × $0.01 = $0.0004 | $0.00005 | $0.00015 | $0.0006 | $6 |

Prices per million tokens; per-call figures rounded. A cold start also pays a cache write, which the caching issue covered for Claude, so check the OpenAI docs for the write rate before you model a bursty workload.

To check what your own key can call, and to price a request from the page's table:

```python
from openai import OpenAI

client = OpenAI()
available = sorted(m.id for m in client.models.list() if m.id.startswith("gpt-6"))
print(available)   # a model on the pricing page may still be absent for your project

# $ per million tokens, short-context rates (<= 272K input), from the pricing page
RATES = {
    "gpt-6-astra":  {"in": 10.00, "cached": 1.00, "out": 50.00},
    "gpt-6-sol":    {"in": 2.00,  "cached": 0.20, "out": 10.00},
    "gpt-6.1-sol":  {"in": 2.00,  "cached": 0.10, "out": 10.00},
    "gpt-6-luna":   {"in": 0.10,  "cached": 0.01, "out": 0.50},
}

def cost(model, fresh_in, cached_in, out):
    r = RATES[model]
    if fresh_in + cached_in > 272_000:
        raise ValueError("long-context rates apply; see the pricing page")
    return (fresh_in * r["in"] + cached_in * r["cached"] + out * r["out"]) / 1_000_000

print(cost("gpt-6-sol", 500, 40_000, 300))   # 0.012
```

## Takeaways

- Four GPT-6 models have a price on OpenAI's pricing page: Astra, Sol, 6.1 Sol and Luna. Instant is not listed.
- Launch dates and ChatGPT plan access come from secondary sources, because OpenAI's announcement pages returned 403 to automated fetches.
- Instant appears in Wikipedia as a model and in OpenAI's speed claim as a name beside effort levels; I could not confirm which.
- On the 40,000-token support workload, cached Sol costs $120 a day, 6.1 Sol $80, Astra $600, Luna $6.
- Budget only for models with a vendor price, and keep model IDs in configuration.

For how this family compares with the Claude and Gemini releases, the issue on which AI model to build on in October 2026 has the side-by-side view.
