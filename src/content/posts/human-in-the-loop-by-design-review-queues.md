---
title: "Human-in-the-loop by design: confidence thresholds and review queues"
description: "Use model confidence to route work to people, then size the queue, set the SLA and feed corrections back into evals. Managed review tools are closing, so build your own."
date: 2026-10-10T01:42:00Z
tags: ["human in the loop", "review queues", "confidence", "TypeSafe Jev", "evals"]
pillar: building
related: adr-007-ai-document-processing
sources:
  - title: "TypeSafe AI docs: confidence for System One answers"
    url: "https://docs.typesafe.ai/confidence"
  - title: "TypeSafe AI docs: patterns (confidence-gated routing)"
    url: "https://docs.typesafe.ai/patterns"
  - title: "TypeSafe AI docs: System One concept (calibration, limits)"
    url: "https://docs.typesafe.ai/concepts/system-one"
  - title: "Amazon SageMaker AI docs: get started with Amazon A2I (human review workflows, thresholds, closed to new customers)"
    url: "https://docs.aws.amazon.com/sagemaker/latest/dg/a2i-get-started-console.html"
  - title: "Google Cloud Document AI: Human-in-the-Loop page (lists HITL as deprecated, 16 January 2024)"
    url: "https://docs.cloud.google.com/document-ai/hitl"
  - title: "Anthropic Engineering: Demystifying evals for AI agents (human graders and calibration)"
    url: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents"
draft: false
---

A confidence score does not make a system safe. It only decides which items a person sees, and what happens after that decides whether the person adds anything. I built an AI document-processing pipeline that cut manual entry by 70% ([case file 07](/#file-adr-007-ai-document-processing)). The queue is where a system like that keeps its savings or quietly loses them, and as of 10 October 2026 the managed products that used to hand you a queue are going away.

## Are managed review tools still an option?

Mostly not. The AWS tutorial for Amazon A2I opens with a notice: the service "is no longer open to new customers", existing customers can continue as normal, and AWS does "not plan to introduce new features". Google's Document AI page on human-in-the-loop, when I fetched it, rendered a deprecations notice that lists Human in the Loop (HITL) with a deprecated date of 16 January 2024. It has no details and no shutdown date, and it does not describe what HITL did, so I am not going to characterise the feature beyond that.

What A2I shows is the shape of the thing you are replacing. You define a work team of reviewers, a review workflow with confidence conditions, and you start a "human loop" through an API call. The tutorial's thresholds are per field: review if the Mail Address key scores under 99, or any other key-value pair under 90. Those are tutorial values, not guidance, but the structure is right. Per-field bars, a trigger, a team, an output record. All of it is a table, a form and a worker pool you can build.

## What does a confidence number actually promise?

TypeSafe's Jev returns a `confidence` from 0 to 1 on every Choice and Score answer, computed from the probability distribution. For a Choice with n options, it is (p_max − 1/n) / (1 − 1/n): an even spread scores 0, certainty scores 1. Noul answers carry no separate confidence, because the probability already expresses it. I have not run production traffic on Jev, so read what follows as design.

The docs are careful about the limit. System One models are trained for calibrated decisions, but "Calibration is measured across groups of predictions; it does not guarantee that an individual answer is correct." A 0.9 is a statement about a thousand items, not a promise about this one. That is why you choose thresholds from your own data, not from the vendor's.

The usage guidance is three bands. High: act automatically. Medium: proceed with caution, such as asking a user to confirm. Low: do not act; escalate or fall back. The docs' worked pattern routes to a human below 0.5 and gates actions by risk above that, with "Thresholds scale with risk": a read-only action can proceed at a lower bar than a transfer approval. TypeSafe's patterns page calls this confidence-gated routing, "confidence as a second decision axis". For decisions between two candidates, the confidence page also suggests computing a top-to-second ratio from `probabilities`.

## How should you design the queue?

Four routes cover most systems.

| Route | Trigger | Reviewer sees | Cost of a mistake |
|---|---|---|---|
| Auto | Confidence at or above the action's bar | Nothing, except a random audit sample | Highest, so the bar is highest |
| Confirm | Between the floor and the bar | The model's answer and the runner-up, one click to accept | Low |
| Review | Below 0.5, or a failed precondition | The full input, a blank answer | Reviewer time |
| Reject | Input unusable (illegible scan, wrong file) | A request to re-upload | Delay for the submitter |

A queue item should carry the input, the question, the answer, the top two probabilities, the name of the threshold that fired, the model version and a deadline. Showing the top two matters: I would expect a reviewer choosing between two options to be faster than one starting from a blank field, and the probabilities are right there, though that is a hypothesis to test with your own reviewers.

### How do you size it and set the SLA?

Do the arithmetic before you pick a threshold, because the threshold is a staffing decision. Reviewers needed = volume × flag rate × seconds per item ÷ productive seconds per reviewer. Take 2,000 documents a day, 90 seconds per item and six productive hours a day. At a 12% flag rate that is 240 items, 6 hours of work: one reviewer, with no headroom. At 40% it is 800 items and 20 hours, so about 3.3, which means four people. Moving a threshold from 0.6 to 0.8 may be a hiring request.

Serve oldest-first with a deadline per item, escalate on age, and alert when the queue grows faster than it drains. Do not let the system silently loosen its threshold to clear a backlog, because that turns a staffing problem into an accuracy problem nobody sees.

Add two guards. First, a random audit sample of auto-accepted items, which the threshold alone would never send to review; I would start at a couple of percent and adjust. Second, a few seeded items with known answers, so you can measure the reviewers as well as the model. Both numbers are my design choices, not figures from a vendor.

## How do corrections feed back into evals?

Every reviewed item is a labelled example. Store the input, the model's answer, its probabilities and confidence, the reviewer's verdict and a short reason. Anthropic's eval guidance calls human graders the gold standard, used to calibrate automated graders and for spot checks, and recommends reading transcripts so failures look fair. A review queue is that process running continuously.

Two loops come out of it. Weekly, add disagreements and a sample of agreements to your golden set (the earlier post on [building a 200-example golden dataset](/blog/golden-datasets-200-labelled-examples-in-a-week) covers how). And monthly, recompute calibration from the reviewed items. The Jev docs advise starting conservatively, testing with your own data and adjusting as you observe results; this is how you observe.

## Hands-on: route, calibrate, staff

The routing function uses the documented `system_one` call and answer fields. Replace the document types with your own; the per-class bars are placeholders to be tuned.

```python
import math
from typesafe_sdk import Choice, TypeSafeClient

client = TypeSafeClient()
DOC_TYPES = {
    "passport": "A passport identity page",
    "bank_statement": "A bank statement with account activity",
    "transcript": "An academic transcript or mark sheet",
    "other": "Anything else",
}
AUTO_BAR = {"passport": 0.90, "bank_statement": 0.90, "transcript": 0.80, "other": 0.60}  # tune from your data

def route(ocr_text):
    r = client.system_one(
        state={"text": ocr_text},
        questions={"doc_type": Choice(instructions="What kind of document is `text`?", criteria=DOC_TYPES)},
    )
    a = r.answers["doc_type"]
    if a.confidence < 0.5:
        return "review", a.probabilities                       # the docs' floor: below 0.5, a person decides
    if a.confidence < AUTO_BAR[a.choice]:
        top2 = sorted(a.probabilities.items(), key=lambda kv: -kv[1])[:2]
        return "confirm", top2                                 # runner-up shown to the reviewer
    return "auto", a.choice

def pick_bar(rows, target=0.98, min_n=30, step=0.05):
    """rows: reviewed items as {'confidence': float, 'correct': bool}.
    Lowest bar where the auto-accepted slice meets the accuracy target."""
    bar = 0.5
    while bar <= 1.0:
        kept = [r for r in rows if r["confidence"] >= bar]
        if len(kept) >= min_n and sum(r["correct"] for r in kept) / len(kept) >= target:
            return bar, len(kept) / len(rows)                  # (bar, share auto-accepted)
        bar = round(bar + step, 2)
    return None                                                # no bar meets the target: keep a human on it

def reviewers_needed(volume, flag_rate, secs_per_item, productive_hours=6):
    return math.ceil(volume * flag_rate * secs_per_item / (productive_hours * 3600))

print(reviewers_needed(2000, 0.12, 90), reviewers_needed(2000, 0.40, 90))   # 1 4
```

`pick_bar` is the calibration check in miniature: if no bar reaches your accuracy target, the honest answer is that this decision is not ready to automate. The `min_n` guard stops you choosing a bar from a handful of lucky items.

## Takeaways

- Confidence decides who sees an item; it does not make answers correct. Calibration is a group property, so set thresholds from your own reviewed data.
- Use per-action bars, scaled with risk, and a hard floor (the docs use 0.5) below which a person decides.
- Size the queue before the threshold. Reviewers needed = volume × flag rate × seconds ÷ productive time, and a threshold change is a headcount change.
- Audit a random slice of auto-accepted items and seed known-answer items, or you cannot tell if the queue is working.
- Treat every correction as a labelled example, and recompute calibration on a schedule.

The three question types behind that confidence number are in [Jev as a programming primitive](/blog/jev-typed-questions-instead-of-prompt-and-parse), and the document-intake pipeline this design is aimed at is [case file 07](/#file-adr-007-ai-document-processing).
