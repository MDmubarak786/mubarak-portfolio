---
title: "Noul: yes/no with a probability, and setting thresholds by the cost of error"
description: "TypeSafe's Noul returns the probability that a statement is true. How to phrase questions, pick thresholds from the cost of errors, and route the middle band to people."
date: 2026-10-10T01:23:00Z
tags: ["TypeSafe Jev", "Noul", "thresholds", "guardrails", "Python"]
pillar: building
sources:
  - title: "TypeSafe AI docs: Noul"
    url: "https://docs.typesafe.ai/primitives/noul"
  - title: "TypeSafe AI docs: confidence"
    url: "https://docs.typesafe.ai/confidence"
  - title: "TypeSafe AI docs: primitives (questions)"
    url: "https://docs.typesafe.ai/primitives"
  - title: "TypeSafe AI docs: guardrails for LLMs cookbook"
    url: "https://docs.typesafe.ai/cookbooks/llm_guardrails"
  - title: "TypeSafe AI docs: self-consistency with Nouls cookbook"
    url: "https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook"
  - title: "TypeSafe AI docs: quick start (Python SDK)"
    url: "https://docs.typesafe.ai/introduction/quickstart"
  - title: "TypeSafe AI docs: how to build with System One"
    url: "https://docs.typesafe.ai/concepts/how-to-build-with-system-one"
  - title: "TypeSafe AI docs: Jev 1.13 jaggedness (documented weaknesses)"
    url: "https://docs.typesafe.ai/model-jaggedness/jev-1.13"
draft: false
---

A Noul looks like a boolean and behaves like a dial. You ask a yes/no question about a state, and what comes back is a number from 0 to 1: the probability that the answer is yes. The `if` in your code then has a threshold to choose, and the docs' advice on choosing it is the most practical sentence in the Jev documentation: set it by the cost of being wrong. This post works that sentence into numbers. It is based on TypeSafe's docs as of 10 October 2026. I have not run Jev in production, so the cost figures below are illustrative and the code is a design.

## What does a Noul return?

A Noul question has `type` (always `"noul"`), `instructions` (the question, or a statement to judge), and optional `criteria` with descriptions of what a true and a false answer mean. The answer is one field, `noul`, from 0 to 1, where 0 means no and 1 means yes. Values near either end are strong answers.

There is no separate `confidence`. The confidence page gives the reason: the single number already describes a two-outcome distribution, and a confidence-style value would be |2p − 1|. That is 0 at p = 0.5 and 1 at p = 0 or 1, so a 0.9 carries 0.8 of "confidence" and a 0.7 carries 0.4. You do not need to compute it; you read the probability.

One reading rule from the primitives page deserves repeating. A Noul of 0.5 means yes and no are equally likely. It does not mean "medium". A Noul is the probability of the proposition, not a degree of it, so for a graded question such as how angry someone is, use a Score.

## How do you phrase a Noul?

The docs give four rules. I have added a column of what goes wrong.

| Rule | Weak phrasing | Better phrasing |
|---|---|---|
| One condition per Noul | "Is the customer angry and asking for a refund?" | Two Nouls: one for anger, one for the refund; combine in code |
| High value means yes | "Is the message free of personal data?" | "Does the message contain personal data?" |
| Make the boundary clear | "Is this urgent?" | Same question plus `criteria` saying what counts as urgent |
| Test statement and question forms | A question that reads awkwardly | "The message conveys urgency or time-sensitivity", which is how the quickstart words it |

Two more notes. The jaggedness page says Jev reads questions literally, and that "instructions carrying double negatives or complex indirection are answered less reliably", which is the technical reason for the second row. And it says accuracy "falls as the state grows with content unrelated to the decision", so a Noul about one field should not receive the whole customer record.

Statements work as well as questions. The docs suggest testing both phrasings on your data. I would go further and keep both in the eval set, because a phrasing change is a model change from the point of view of your thresholds.

## How do you set the threshold from the cost of error?

The docs say: raise the threshold when a false yes is costly, lower it when a missed yes is costly, and send middle values to a person. That is a decision-theory sentence, and it turns into arithmetic if you take the probabilities as calibrated. Calibration holds across groups of predictions and not for one answer, so treat the output as a starting point and check it on labelled data.

Three costs per decision, in whatever unit you use. I use dollars, and the figures are mine, not TypeSafe's:

- **R**, the cost of a human reviewing the case: $2.
- **M**, the cost of a missed yes that nobody looked at: $20.
- **W**, the cost of acting automatically on a yes that was wrong: $40.

With probability p of yes:

- Ignoring the case costs p × M on average. Reviewing costs R. Review whenever p × M > R, that is p > R / M = 2 / 20 = **0.10**.
- Acting automatically costs (1 − p) × W on average. Reviewing costs R. Act whenever (1 − p) × W < R, that is p > 1 − R / W = 1 − 2 / 40 = **0.95**.

Below 0.10 pass, between 0.10 and 0.95 review, above 0.95 act. Two things follow. The review band is very wide with these costs, and the queue it creates is itself a cost you must size: if reviewing is slower than the volume allows, R rises and the lower threshold moves with it. And the thresholds are asymmetric around 0.5 because the costs are. A symmetric 0.5 cut-off is a statement that a miss and a false alarm cost the same, which is rarely true.

Compare this with the guardrails cookbook, which uses a review threshold of 0.35 and an action threshold of 0.70 under a `strict` policy and 0.85 under `permissive`. The page says these are starting values "from labeled examples of your own traffic", not calibrated defaults, and that the policy is a product decision. The same probability yields different outcomes by policy: the `neurosemantical` jailbreak sample at 0.74 is blocked under strict and only sent to review under permissive.

## What does a guardrail built from Nouls look like?

The cookbook's design is a good template. Each message gets one request with a battery of Nouls, one per hazard (jailbreak, harmful request, medical advice, self-harm), plus a Score for how much harm complying would cause. Code maps the numbers to pass, review, block or support. Precedence runs support, then block, then review, then pass, and a severity at or above 2.0 upgrades review outcomes to block.

Rows from its sample run, under `strict`:

| Message | Top hazard | Result |
|---|---|---|
| `melatonin_dose` | medical_advice 0.55 | review |
| `dosage_request` | medical_advice 0.95, severity 2.02 | block |
| `novelist_poison` | jailbreak 0.05, severity 0.8 | pass |
| `self_harm` | self_harm 0.96 | support |

The sample is 10 user messages and 5 replies, which the page itself says cannot validate the thresholds. Notice how `dosage_request` shows a second axis doing work: the probability alone would only reach review, and the severity Score tips it to block. The cookbook ran on `jev-1.12`.

## Why do middle values deserve a human?

The self-consistency cookbook is the evidence I find most useful. It asks 14 Noul questions about one borderline insurance claim, 15 times each, and compares Jev with four LLMs. Its reported mean per-question standard deviation for Jev is 0.0102, below every LLM condition it tested. But look at the individual questions: `covered` ranged from 0.43 to 0.53 across the 15 repeats, so it straddled 0.5, and `exclusion` ranged from 0.53 to 0.62. The other 13 stayed on one side of 0.5.

The lesson is that a hard cut at 0.5 flips a borderline question from run to run, even with a model this stable. The cookbook's remedy is a band: below 0.30 is no, above 0.70 is yes, and in between is "uncertain". It labels that band illustrative and uncalibrated, and the caveats are fair: one claim, 15 repeats, and consistency is not correctness. My reading is that the middle band is not a failure state. It is the cheapest place to spend human attention, since those are the cases where the model itself is undecided.

## Hands-on: one request, many Nouls

The Noul page supports building questions from code. `instructions` can be an object holding the question plus supporting data, such as a candidate record to compare against, so you can ask one Noul per database row and send them all in a single request, since questions are evaluated in parallel. Here is duplicate-ticket detection, with the thresholds from the cost arithmetic above:

```python
from typesafe_sdk import Noul, TypeSafeClient

client = TypeSafeClient()

def thresholds(review_cost: float, miss_cost: float, wrong_act_cost: float):
    """Review above R/M; act above 1 - R/W. Valid only for calibrated probabilities."""
    return review_cost / miss_cost, 1 - review_cost / wrong_act_cost

REVIEW_AT, ACT_AT = thresholds(review_cost=2, miss_cost=20, wrong_act_cost=40)  # 0.10, 0.95

def find_duplicate(new_message: str, recent: list[dict]):
    questions = {
        f"dup_{t['id']}": Noul(
            # Structured instructions: the question plus the record to compare against.
            # Check the docs for the exact shape the SDK expects for an object.
            instructions={
                "question": "Does `message` describe the same incident as `candidate`?",
                "candidate": t["text"],
            }
        )
        for t in recent
    }
    r = client.system_one(state={"message": new_message}, questions=questions)
    best_id, best_p = max(((k, a.noul) for k, a in r.answers.items()), key=lambda kv: kv[1])
    if best_p >= ACT_AT:
        return "merge", best_id, best_p
    if best_p >= REVIEW_AT:
        return "review", best_id, best_p
    return "new_ticket", None, best_p
```

Keep the combined state and questions inside the 64k-token limit from the models page, filter `recent` before you send it, and log the versioned model ID with every decision. Then replay a few hundred labelled pairs, bucket them by `noul` value, and read off the real hit rate in each bucket. If the 0.95 bucket is right 99% of the time, your threshold has slack. If it is right 85% of the time, the calibration claim is not holding for your data and the threshold needs to move. The docs' own guidance in the build guide is to choose thresholds by plotting confidence against accuracy on your own data.

My 2024 document pipeline had a fraud-detection step. The same logic would apply there: a false "tampered" sends a real applicant to a slow queue and a missed one lets a bad document through, which are different costs, so they deserve different thresholds.

## Takeaways

- A Noul returns the probability of yes, from 0 to 1. 0.5 means equally likely, not medium, and there is no separate confidence.
- One condition per question, phrased so that high means yes, with `criteria` when the boundary is subtle.
- Derive thresholds from costs: review when p > R / M, act when p > 1 − R / W. The numbers are yours, the calibration needs checking on your data.
- Send the middle band to a person. In the consistency cookbook, a borderline question moved between 0.43 and 0.53 across 15 repeats.
- Combine several Nouls and a Score in code, as the guardrails cookbook does, rather than asking one broad question.

Next, the same idea for options instead of yes/no: [Jev's Choice primitive and the distribution it returns](/blog/jev-choice-primitive-255-options-probability-distribution).
