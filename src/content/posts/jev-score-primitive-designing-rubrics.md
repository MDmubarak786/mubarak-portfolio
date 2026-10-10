---
title: "Jev's Score primitive: designing rubrics a model can actually use"
description: "How TypeSafe's Jev Score works: ordered levels, the score and confidence maths, why numbers in rubrics fail, and composite scoring to rank pull requests in code."
date: 2026-10-10T01:22:00Z
tags: ["TypeSafe Jev", "Score", "rubrics", "composite scoring", "Python"]
pillar: building
sources:
  - title: "TypeSafe AI docs: Score"
    url: "https://docs.typesafe.ai/primitives/score"
  - title: "TypeSafe AI docs: composite scoring pattern"
    url: "https://docs.typesafe.ai/patterns/composite-scoring"
  - title: "TypeSafe AI docs: patterns (overview)"
    url: "https://docs.typesafe.ai/patterns"
  - title: "TypeSafe AI docs: confidence"
    url: "https://docs.typesafe.ai/confidence"
  - title: "TypeSafe AI docs: primitives (questions)"
    url: "https://docs.typesafe.ai/primitives"
  - title: "TypeSafe AI docs: Jev 1.13 jaggedness (documented weaknesses)"
    url: "https://docs.typesafe.ai/model-jaggedness/jev-1.13"
draft: false
---

Score is the easiest of Jev's three question types to misuse. It looks like a 1-to-5 rating, so people write a 1-to-5 rating, and the model never sees the numbers. What it sees is a list of level descriptions, and the quality of the answer is the quality of that list. This post covers how Score turns your rubric into a number, how to read its confidence, and how to combine several Score questions in code. It is based on TypeSafe's docs as of 10 October 2026. I have not run Jev in production, so the pull-request example at the end is a design, not a result.

## What does a Score actually return?

A Score rates the state on an ordered scale you describe. The `criteria` is an array of level descriptions from the low end to the high end, with at least two levels and at most ten. A level's number is its array position, starting at 0. The docs are explicit that each level is judged separately, so a description that says "3 out of 5" gives the model nothing to work with: numbers in the descriptions do not help.

The response has four parts:

- `probabilities`: one value per level, summing to 1.
- `score`: each level number multiplied by its probability, then summed. It runs from 0 to the top level number, so it can sit between levels.
- `legend`: maps each level number back to your description.
- `confidence`: 0 to 1, from how the probability is spread.

A worked case for a three-level rubric. Probabilities of 0.1, 0.6 and 0.3 for levels 0, 1 and 2 give a score of 0.6 + 0.6 = 1.2: mostly level 1, leaning toward 2. In Python, `probabilities` and `legend` are keyed by integer level. To compare two Scores with different numbers of levels, the docs say to divide each score by `len(criteria) - 1`, which maps both onto 0 to 1.

## How is Score confidence different from Choice?

A Choice does not care which wrong option holds the probability. A Score does, because the levels are ordered. The docs give the formula: with n levels, p_i the probability of level i, and m the most likely level, confidence is max(0, 1 − Σ p_i · |i − m| / MAD_unif), where MAD_unif = (1/n) · Σ |i − (n − 1)/2|. In plain words: probability on a neighbouring level costs little, probability at the far end costs a lot.

The docs' three-level examples show the asymmetry:

| Probabilities | Score | Confidence |
|---|---|---|
| (0, 0.5, 0.5) | 1.5 | 0.25 |
| (0.5, 0, 0.5) | 1.0 | 0 |
| (0, 0.57, 0.43) | 1.43 | about 0.35 |

The score column is my arithmetic from the score definition above; the confidence column is from the docs. Look at the middle row. A model that splits its mass between "no impact" and "blocking" returns a score of exactly 1.0, the same number a model that is certain about the middle level would return. Only the confidence of 0 tells you the model is polarised, not sure. That is why you should read `score` and `confidence` together, and never threshold the score alone.

The docs list what usually causes low confidence: overlapping levels, a multi-part question, or a state that does not contain enough information. Each has a different fix. Overlapping levels need rewriting; a multi-part question needs splitting; thin state needs more data or a person.

## How do you write levels the model can separate?

Six rules, all from the docs unless I say otherwise.

**Describe situations, not degrees.** The docs' own example of a good level is "Broken or degraded feature, but workaround exists". "Moderate" says nothing a model can check against the input.

**One dimension per question.** Keep each Score question to one dimension. A scale that mixes severity and urgency yields low confidence and a number nobody can interpret. If you are tempted to write "and" in a level, you probably have two questions.

**As many distinct levels as you can describe, up to ten.** Three is fine. Do not pad: a level you cannot tell from its neighbour is a source of low confidence.

**Examples help only if they look like your real inputs.** Levels can be objects with a description plus example situations, but examples that do not resemble your data add noise.

**Do not read the score as a measurement.** The jaggedness page says "score levels are weak in numerical calibration", so a 2.35 is not 17% more than a 2.0. Use it to rank and to threshold, not to interpolate magnitudes.

**Test levels on your own data.** The docs say to. My addition: when confidence is low on one rubric across many inputs, suspect the rubric before the model.

A before and after:

| Weak | Better |
|---|---|
| 1, 2, 3, 4, 5 | "Docs, comments or tests only", "One internal component; callers unaffected", "Shared module used by several features", "Authentication, payments, data migration or deploy configuration" |
| "Low / Medium / High risk" | The same four situations above, one per level |
| One question: "How risky and how urgent is this?" | Two questions, combined in code |

## What is composite scoring?

The patterns page names it as one of four: break a complex judgment into independent dimensions, score each separately, and combine with weights you set in code. The docs' worked example ranks resumes on four dimensions, each a five-level Score from 0 to 4, divides each by 4 to normalise, then applies different weights per role: a senior IC role at 40% Python depth, 10% leadership, 40% system design, 10% generalist, and an engineering manager role at 15%, 40%, 20%, 25%. Same four answers, two rankings. The docs' point is that "weights live in code", so changing priorities means changing numbers, not rewriting questions or re-running them, and you can inspect each dimension to see why something ranked where it did.

## Hands-on: a pull-request triage score

I reviewed 37% of my org's pull requests, more than 1,300 of them, so "which of these needs a second pair of eyes" is a question I know well. The design below is how I would try it with Jev. It is untested. The state is text only, and the context limit is 64k tokens for state plus questions, so send the title, description and a trimmed diff, not the repository. The jaggedness page says accuracy falls as the state fills with content unrelated to the decision.

```python
from typesafe_sdk import Score, TypeSafeClient

client = TypeSafeClient()

QUESTIONS = {
    "blast_radius": Score(
        instructions="How much of the system could the change in `pr.diff` break if it is wrong?",
        criteria=[
            "Docs, comments or tests only",
            "One internal component; callers unaffected",
            "Shared module or API used by several features",
            "Authentication, payments, data migration or deploy configuration",
        ],
    ),
    "test_evidence": Score(
        instructions="How well do the tests in `pr.diff` cover the behaviour the change alters?",
        criteria=[
            "No tests added or changed for the altered behaviour",
            "Tests for the happy path only",
            "Tests for the happy path and the main failure cases",
        ],
    ),
    "clarity": Score(
        instructions="How clearly does `pr.description` explain what the change does and why?",
        criteria=[
            "Empty or only a ticket number",
            "Says what changed, not why",
            "Says what changed, why, and how to check it",
        ],
    ),
}
INVERT = {"test_evidence", "clarity"}              # for these, a high score means lower risk
WEIGHTS = {"blast_radius": 0.5, "test_evidence": 0.3, "clarity": 0.2}

def triage(title: str, description: str, diff: str):
    r = client.system_one(
        state={"pr": {"title": title, "description": description, "diff": diff}},
        questions=QUESTIONS,
    )
    total = 0.0
    for name, ans in r.answers.items():
        if ans.confidence < 0.4:                   # illustrative floor, tune on your data
            return "human_triage", name
        x = ans.score / (len(ans.legend) - 1)      # normalise to 0..1
        total += WEIGHTS[name] * ((1 - x) if name in INVERT else x)
    return ("second_reviewer" if total >= 0.5 else "standard_review"), round(total, 2)
```

Three decisions in that function are worth defending. The `INVERT` set exists because direction matters: a high `blast_radius` is bad and a high `test_evidence` is good, and the composite only works if every dimension points the same way. The confidence floor runs per dimension, because a polarised answer on one question should not be averaged away by two confident ones. And the 0.5 cut-off and the 0.4 floor are placeholders I made up; the docs are clear that thresholds come from your own labelled data.

To sanity-check confidence offline, for instance while building an eval set from stored probabilities, this mirrors the documented formula:

```python
def score_confidence(p: list[float]) -> float:
    n = len(p)
    m = max(range(n), key=p.__getitem__)           # most likely level (first on ties)
    mad = sum(abs(i - (n - 1) / 2) for i in range(n)) / n
    return max(0.0, 1 - sum(pi * abs(i - m) for i, pi in enumerate(p)) / mad)

assert round(score_confidence([0, 0.5, 0.5]), 2) == 0.25
assert score_confidence([0.5, 0, 0.5]) == 0.0
```

The API returns `confidence` for you; this is only for replaying logged distributions against new thresholds.

## Takeaways

- A Score is a probability-weighted position on a rubric you write. Its quality is the quality of your level descriptions.
- Describe situations, one dimension per question, and as many distinct levels as you can honestly separate, up to ten.
- Read `score` with `confidence`. A split between the extremes returns a middle score and a confidence near zero.
- Normalise by `len(criteria) - 1`, make every dimension point the same way, then combine with weights in code.
- Scores are for ranking and thresholds, not measurement. Set the numbers from your own labelled examples.

Next, the yes/no primitive: [Noul, and setting thresholds by the cost of error](/blog/jev-noul-yes-no-probability-thresholds).
