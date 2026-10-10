---
title: "Jev as a programming primitive: typed questions, not prompts"
description: "Jev answers typed questions with calibrated probabilities instead of writing text: how Choice, Score and Noul work, what confidence means, and a worked intake example."
date: 2026-10-10
tags: ["TypeSafe Jev", "System One", "structured output", "classification", "confidence", "Python"]
pillar: building
related: adr-007-ai-document-processing
sources:
  - title: "TypeSafe AI docs: System One concept"
    url: "https://docs.typesafe.ai/concepts/system-one"
  - title: "TypeSafe AI docs: primitives (questions)"
    url: "https://docs.typesafe.ai/primitives"
  - title: "TypeSafe AI docs: Choice"
    url: "https://docs.typesafe.ai/primitives/choice"
  - title: "TypeSafe AI docs: Score"
    url: "https://docs.typesafe.ai/primitives/score"
  - title: "TypeSafe AI docs: Noul"
    url: "https://docs.typesafe.ai/primitives/noul"
  - title: "TypeSafe AI docs: confidence"
    url: "https://docs.typesafe.ai/confidence"
  - title: "TypeSafe AI docs: patterns"
    url: "https://docs.typesafe.ai/patterns"
  - title: "TypeSafe AI docs: quick start (Python SDK)"
    url: "https://docs.typesafe.ai/introduction/quickstart"
---

Every "AI feature" I have shipped in the last three years had the same hidden tax. The model wrote prose, and then I wrote code to turn the prose back into a value: a regex, a JSON repair step, a retry when the schema came back broken, a fallback when the model answered a question I did not ask. The decision was a few bytes; the plumbing around it was most of the pull request.

TypeSafe's Jev, released in September, removes that layer by refusing to write prose at all. You hand it a state and a set of typed questions, and it returns answers that are already values. This post is about how the three question types work, what the confidence number actually is, and how I would wire it into a document-intake pipeline like the one in [case file 07](/#file-adr-007-ai-document-processing). Everything technical here comes from TypeSafe's docs as of 10 October 2026; Jev is in early access and I have not run production traffic on it, so treat the design as a design.

## What a System One model is

TypeSafe's docs define the category plainly. System One models "make fast, structured decisions that software can use directly." They "do not write replies, produce code, or generate explanations of their reasoning." You define the answer space, and the model cannot step outside it.

The other half of the definition is the one that matters for anyone who has thresholded on an LLM's self-reported confidence: these models are "trained for calibrated decisions: their probabilities are optimized against outcomes to reflect uncertainty." The docs add a qualifier I appreciate, because it is the kind vendors usually leave out: "Calibration is measured across groups of predictions; it does not guarantee that an individual answer is correct." So a 0.9 is meaningful over a thousand tickets, not a promise about this one.

Two constraints to know before you design anything: Jev "currently accepts text input only", with images, audio and video "not supported (yet)", and it will never explain itself. If you need a why, you pair it with a reasoning model for the cases it flags.

## The three primitives

A request is one state (a string or JSON) plus a dictionary of questions. Each question has an ID that is yours ("Question IDs are for your code. They are not sent to the model."), a type, `instructions`, and for two of the types a `criteria` field that defines the answer space.

**Choice** picks one of up to 255 options and returns the whole distribution.

```python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

client = TypeSafeClient()

response = client.system_one(
    state={"message": text},
    questions={
        "team": Choice(
            instructions="Which team should handle `message`?",
            criteria={"billing": "Invoices, refunds, payment failures",
                      "technical": "Errors, integrations, API access",
                      "other": "Anything else"},
        ),
    },
)
answer = response.answers["team"]
answer.choice          # "technical"
answer.probabilities   # {"technical": 0.78, "billing": 0.15, "other": 0.07}
answer.confidence      # 0.67
```

The backticked `message` in the instructions is a documented convention: you point a question at part of a structured state with dot-and-index paths, so "Does `ticket.messages[0].text` request a refund?" is a valid question.

**Score** rates the state on an ordered scale you describe. The `criteria` is "an ordered array of level descriptions, from the low end of the scale to the high end", between two and ten levels. The model sees only the descriptions, and each level is judged on its own, so the docs warn that "levels that are only numbers perform poorly." The answer is a `score` that can sit between levels, a `legend` mapping level numbers back to your descriptions, the per-level `probabilities` and a `confidence`.

```python
"severity": Score(
    instructions="How severe is the reported issue?",
    criteria=[
        "Cosmetic; no impact to functionality",
        "Broken or degraded feature, but workaround exists",
        "Blocking issue; no workaround exists",
    ],
)
```

One rule from the docs worth taping to the monitor: "Keep each Score question to one dimension." A scale that mixes severity and urgency gets lower confidence and a score nobody can interpret.

**Noul** is a yes/no question that returns "a single number representing the probability that the answer is yes where 0 means no and 1 means yes." There is no separate confidence, because the probability is the confidence. The docs' advice is to ask one condition per Noul, phrase it so that a high value means yes (not "Is the message free of personal data?"), and set the threshold by the cost of being wrong: raise it when a false yes is expensive, lower it when a missed yes is.

```python
"wants_human": Noul(instructions="Is the customer asking for a human agent?")
# response.answers["wants_human"].noul -> 0.99
```

Questions in one request are evaluated in parallel against the same state and do not see each other. That has two consequences. Adding questions adds almost no latency, so the docs recommend asking everything your code might need and ignoring what does not apply. And a second request is only needed when your code has to use an earlier answer to build the next question, for instance to fetch more data first.

## What the confidence number is

This is the part I wanted to understand before trusting it, and the docs give the formula. For a Choice with n options, confidence is the top probability rescaled so that an even spread is 0 and certainty is 1: (p_max − 1/n) / (1 − 1/n). Only the top probability counts, so (0.6, 0.3, 0.1) and (0.6, 0.2, 0.2) both give 0.4. For Score, probability on an adjacent level costs less confidence than probability far away: (0, 0.5, 0.5) gives 0.25 while (0.5, 0, 0.5) gives 0.

The usage guidance is three bands. High: act automatically. Medium: proceed with caution, such as asking the user to confirm. Low: "Do not act. Route to a human, request clarification, or fall back to a different system." The worked example gates on a 0.5 floor for routing and a 0.9 bar for an `approve_transfer` action, and the page is explicit that thresholds depend on "your domain and the performance of the model for your use case." Its advice: "Start with conservative thresholds, test with your own data, and adjust as you observe results."

The thing I like about this is that confidence becomes a second axis in your code, not a vibe. Low confidence is not a failure; it is the signal that routes to a person.

## The four patterns the docs name

TypeSafe lists four composition patterns, and they map neatly onto things I have built the hard way:

1. **Speculative fan-out**: bundle many questions, including ones you might not need, into one call and filter in code.
2. **Confidence-gated routing**: use confidence alongside the answer to decide whether to act, confirm, or escalate.
3. **Composite scoring**: several one-dimensional Scores, normalised and weighted in code, instead of one broad judgment. Changing priorities means changing weights, not rewriting prompts.
4. **Intent routing**: a Choice over handlers.

The line that frames all four: "Learning to think in terms of discrete, atomic decisions that compose into complex system behavior is a key skill for getting the most out of TypeSafe."

## Hands-on: document intake, redesigned

In 2024 I built an intake pipeline that classified 17+ document types for university admissions, using GPT-4 Vision plus OCR, and reached 95% accuracy with fraud detection. The classification step produced prose that we parsed into a label and a hand-rolled confidence. Here is the same step as typed questions. Jev is text-only, so OCR still runs first and the text is the state.

```python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

client = TypeSafeClient()

DOC_TYPES = {
    "passport": "A passport identity page",
    "bank_statement": "A bank statement with account activity",
    "transcript": "An academic transcript or mark sheet",
    "offer_letter": "A university offer or admission letter",
    # ... up to 255 options
}

def triage(ocr_text: str, filename: str):
    r = client.system_one(
        state={"text": ocr_text, "filename": filename},
        questions={
            "doc_type": Choice(instructions="What kind of document is `text`?", criteria=DOC_TYPES),
            "legible": Score(
                instructions="How legible is `text` as an OCR result?",
                criteria=["Mostly garbage characters", "Readable with gaps", "Clean and complete"],
            ),
            "tampered": Noul(instructions="Does `text` show signs of editing, such as mismatched dates or names?"),
            "expired": Noul(instructions="Does `text` contain an expiry date that is already in the past?"),
        },
    )
    a = r.answers
    if a["legible"].score < 1:                      # unreadable scan: ask for a re-upload, no model guessing
        return "reupload", a["legible"].legend
    if a["doc_type"].confidence < 0.5:              # flat spread: a person decides
        return "review", a["doc_type"].probabilities
    if a["tampered"].noul > 0.7 or a["expired"].noul > 0.8:
        return "fraud_queue", a["doc_type"].choice
    return "accept", a["doc_type"].choice
```

Four questions, one round trip, no parsing. The thresholds are deliberately uneven: a false "tampered" sends a real applicant to a slow queue, so it sits at 0.7 rather than 0.5, and "expired" is cheap to check by hand, so it sits higher still. The legibility gate runs first because the docs are clear that the model will answer whatever you ask; a confident label on garbage OCR is still garbage.

What I would keep from the old pipeline is the eval set. Calibration being measured over groups means the only way to pick thresholds is to run a few hundred labelled documents through and read the confusion matrix. The docs say the same in fewer words.

## Where it does not fit

- Anything that needs an explanation for the user. Jev gives you a value, not a reason; pair it with a reasoning model for the escalated cases.
- Images, audio, video. Text only for now, so OCR, transcription or a vision model stays upstream.
- Open-ended tasks. If the answer is not a choice, a level or a yes/no, it is not a System One question.
- Teams without an eval set. Calibrated probabilities are only useful if you measure them against your own outcomes.

## Takeaways

- A System One model returns values from an answer space you define; the parsing layer disappears with the prose.
- Choice gives a distribution and a confidence, Score gives a position on your rubric with a legend, Noul gives a probability of yes. Keep each question to one dimension.
- Confidence is a formula over the probabilities, not a feeling. Use it as a second axis: act, confirm, or escalate.
- Ask many narrow questions in one call; combine them in code; change weights instead of prompts.
- Run your own labelled set before you trust a threshold. Calibration is a group property.

Next issue: Haiku 5.5, Sonnet 5.5 and Gemini 3.8 Flash on the same classification set, priced per decision, with Jev's early-access numbers alongside if they are available by then.
