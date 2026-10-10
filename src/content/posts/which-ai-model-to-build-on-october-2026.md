---
title: "Which AI model should you build on in October 2026?"
description: "Claude 5.5, GPT-6, Gemini 3.8 and TypeSafe's Jev all shipped in five weeks. Dates, prices and limits from primary sources, and what I would actually pick for a product."
date: 2026-10-10
tags: ["Claude 5.5", "GPT-6", "Gemini 3.8", "TypeSafe Jev", "model selection", "LLM pricing"]
pillar: model-watch
related: adr-007-ai-document-processing
sources:
  - title: "Claude Platform release notes (Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5)"
    url: "https://platform.claude.com/docs/en/release-notes/overview"
  - title: "Gemini API changelog (3.8 Flash, 3.8 Live, Nano Banana 2.1, deprecations)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "TypeSafe AI docs: introduction to Jev and System One"
    url: "https://docs.typesafe.ai/introduction"
  - title: "TypeSafe AI docs: the Choice primitive"
    url: "https://docs.typesafe.ai/primitives/choice"
  - title: "TypeSafe AI docs: quick start (Python SDK)"
    url: "https://docs.typesafe.ai/introduction/quickstart"
  - title: "GPT-6 (Wikipedia; OpenAI's own release notes blocked automated access at time of writing)"
    url: "https://en.wikipedia.org/wiki/GPT-6"
  - title: "Yahoo Finance on the Opus 5.5 release"
    url: "https://finance.yahoo.com/technology/ai/articles/anthropic-claude-5-5-release-185148663.html"
  - title: "Claude Sonnet 5.5 pricing and context (third-party tracker)"
    url: "https://cellcog.ai/blog/claude-sonnet-5-5-release-date/"
---

Five weeks, four labs, at least nine models. If you are choosing a model for something you plan to ship this quarter, the ground moved under you in September, and most of the summaries I have read either copy the vendor's benchmark table or guess. This is the version I wanted: what actually shipped, with dates and prices from the release notes, and the decision I would make for a product team today. Everything here is as of 10 October 2026, and the models listed will be old news by December, so read the dates.

## What shipped, by lab

### Anthropic: a whole 5.5 generation in sixteen days

The Claude Platform release notes list four new models between 1 September and 7 October.

| Model | Shipped | Price per million tokens | Context | What Anthropic says it is for |
|---|---|---|---|---|
| Claude Fable 5.1 (`claude-fable-5-1`) | 1 Sept | $10 in / $50 out, cache reads $0.25 | 1M, 128k output | "long-running agentic coding, knowledge work, and research" |
| Claude Opus 5.5 (`claude-opus-5-5`) | 22 Sept | $4 in / $20 out (Opus 5 was $5 / $25) | 1M, 128k output | "long-running agentic coding and knowledge work" |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | 28 Sept | $2 in / $10 out per a third-party tracker; cache reads cut to $0.10 on 7 Oct | 1M | the new default Sonnet |
| Claude Haiku 5.5 (`claude-haiku-5-5`) | 7 Oct | not stated in the notes yet | 1M, 128k output | "our most capable model tuned for high-volume and latency-sensitive work" |

Two details matter more than the headline numbers. First, Opus 5.5 is cheaper than Opus 5 while being the model Anthropic now points at for long agentic runs; Yahoo Finance reports it cut a benchmark port of HAProxy from C to Rust from 12 hours on Fable 5.1 to 9.5 hours. Second, the Sonnet 5.5 cache-read price was halved a week after launch, to 0.05x the input price. If your workload is retrieval-heavy with a stable system prompt, that one line in the changelog is worth more than any benchmark.

There are breaking changes. Opus 5.5 returns a 400 error if you send `thinking: {"type": "disabled"}`, and Haiku 5.5 rejects `temperature`, `top_p` and `top_k` outright. Sonnet 4.5 retires on 30 November, so anything still pinned to it needs a migration ticket now.

### OpenAI: GPT-6 arrives, in pieces

OpenAI's own release notes blocked automated access while I was writing, so this section leans on Wikipedia and a model timeline aggregator; treat the dates as approximate until you check them yourself.

GPT-6 Astra, the flagship, was previewed on 3 September and opened to paid users the next day in a restricted form that declines some prompt categories, cybersecurity among them. GPT-6 Sol and GPT-6 Luna followed on 22 September, GPT-6.1 Sol on 29 September, and GPT-6 Instant on 7 October, with an "Intelligent UI" that answers with interactive widgets rather than only text. The context that explains the staggered rollout: after unsanctioned cyberattacks by OpenAI agents in July, the company delayed the release to add safeguards. I could not find published API pricing for the GPT-6 family in a primary source, which is itself a signal: if you cannot price it, you cannot plan on it yet.

### Google: Gemini 3.8 is a Flash-first generation

Google's Gemini API changelog shows a generation led by the small model. Gemini 3.8 Flash went generally available on 2 September, described as the most intelligent Flash model and recommended for new projects alongside 3.5 Flash-Lite. Gemini 3.8 Live and a Live Extended Thinking variant followed on 15 September for real-time audio-to-audio work, then 3.8 Flash TTS on 22 September with a voices endpoint and a library of 150+ voices. On 6 October the image model Nano Banana 2.1 shipped with 4K output. On 8 October, 3.7 Flash was deprecated and now routes to 3.8 Flash.

What I did not find: a Gemini 3.8 Pro, or an official word on Gemini 4. There are rumours of an October launch; they are rumours. The 2.5 models are being wound down, with access limited to existing users since 18 September, so do not start anything new on them.

### TypeSafe: a model that answers questions instead of writing

The most interesting release of the month is not a bigger chat model. TypeSafe AI came out of stealth on 15 September with Jev, which it calls the first "System One" model. You give it a state (text or JSON) and a set of typed questions, and it returns structured answers with calibrated probabilities. The docs describe three primitives:

- **Choice** picks one option from a list you define, up to 255 options, and returns the full probability distribution plus a confidence number.
- **Score** rates the state on a rubric.
- **Noul** answers whether a statement is true, as a value from 0 to 1.

Questions in one call are evaluated in parallel against the same state, and the docs say that "adding questions barely changes the response time". The pricing reported by early coverage is $0.042 per million input tokens with output free, and the model is in early access via a waitlist. I have not had production traffic on it, so take the next section as a design argument, not a benchmark.

## What it means if you ship products

The chat-model race has become a pricing race, and that changes how I would architect anything new.

**Route by job, not by brand.** Sonnet 5.5 at $2 / $10 with 1M context is the default for most product work. Opus 5.5 earns its $4 / $20 on the long agentic runs where a human would otherwise babysit. Haiku 5.5 is the one to test for classification, extraction and anything with a latency budget, as soon as its price lands in the notes. Fable 5.1 at $10 / $50 is a research-tier spend; justify it per workload.

**Cache reads are the new unit of cost.** With Sonnet 5.5 cache reads at 0.05x input, a RAG pipeline that re-sends the same 40k tokens of grounding on every call pays twenty times less for that part than it did on a model without caching. Design prompts so the stable part comes first and stays byte-identical.

**Treat the GPT-6 family as a watch item until it has a price list.** The capability story is strong, the rollout is cautious, and the API economics are not public in a source I would cite.

**Separate decisions from generation.** This is the Jev lesson, and it applies even if you never use Jev. Most of the "AI features" I have built over five years were really decisions: which queue does this ticket go to, is this document a passport or a bank statement, how risky is this upload. I did those with GPT-4 Vision and OCR in 2024 and hit 95% across 17 document types, but the pipeline spent most of its effort turning prose back into a label. A model that only emits values from an answer space you define removes the parsing layer and gives you a probability to threshold on.

## Hands-on: the decision layer

Here is the shape of a support-ticket router using TypeSafe's Python SDK, adapted from the quick start. Install with `pip install typesafe-sdk` (Python 3.10 or newer); check the current docs for the exact option parameter names before you copy it.

```python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

client = TypeSafeClient()

ticket = "Hi, I've been trying to connect my Stripe account for two days and keep getting a 401. We launch Monday."

response = client.system_one(
    state=ticket,
    questions={
        "department": Choice(
            instructions="Which team should handle this?",
            options=["technical", "billing", "sales", "returns"],
        ),
        "frustration": Score(instructions="How frustrated is the customer, 0 calm to 1 furious?"),
        "is_urgent": Noul(instructions="The customer has a deadline within a week."),
    },
)

dept = response.answers["department"]
if dept.confidence < 0.6:
    escalate_to_human(ticket, dept.probabilities)   # flat spread: let a person decide
else:
    route(ticket, dept.choice)

if response.answers["is_urgent"].noul > 0.8 and response.answers["frustration"].score > 0.7:
    page_on_call(ticket)
```

Three things to notice. The questions are narrow on purpose; the docs recommend many small questions over one broad one. The confidence field is what makes the escalation branch possible, and it is computed from how spread the probabilities are, so a 50/50 split between two departments is caught rather than guessed. And nothing here is parsed: there is no JSON to repair, no regex over prose, no retry loop for malformed output.

If Jev's early access is not open to you, the same architecture works with Haiku 5.5 or Gemini 3.8 Flash behind a strict JSON schema; you lose the calibrated probabilities and pay for output tokens, but you keep the separation between deciding and writing.

## Takeaways

- As of 10 October 2026: Sonnet 5.5 for default product work, Opus 5.5 for long agentic runs, Haiku 5.5 and Gemini 3.8 Flash for the high-volume, low-latency tier.
- Price prompt caching into the design. Sonnet 5.5 cache reads dropped to $0.10 per million on 7 October.
- Audit anything pinned to Sonnet 4.5 (retires 30 November) or Gemini 2.5 and 3.7 (being wound down or re-routed).
- Hold GPT-6 as a watch item until API pricing is published somewhere citable.
- Split decisions from generation. Whether you use Jev or a schema-constrained chat model, a decision layer with a confidence threshold is cheaper, faster and easier to test.

Next issue: a cost-per-decision comparison of Haiku 5.5, Sonnet 5.5 and Gemini 3.8 Flash on a document classification set, using the 17 document types from case file 07.
