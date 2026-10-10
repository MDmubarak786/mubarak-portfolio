---
title: "Golden datasets: how to build 200 labelled examples in a week"
description: "A day-by-day plan for 200 labelled examples: sampling, labelling guidelines, adjudication, splits and versioning, plus the arithmetic on what 200 can and cannot prove."
date: 2026-10-10T01:39:00Z
tags: ["evals", "labelling", "datasets", "golden dataset", "LLM-as-judge"]
pillar: building
related: adr-007-ai-document-processing
sources:
  - title: "Claude docs: define success criteria and build evaluations"
    url: "https://platform.claude.com/docs/en/test-and-evaluate/develop-tests"
  - title: "Anthropic Engineering: Demystifying evals for AI agents"
    url: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents"
  - title: "Hamel Husain: Creating a LLM-as-a-judge that drives business results"
    url: "https://hamel.dev/blog/posts/llm-judge/"
  - title: "scikit-learn: cohen_kappa_score"
    url: "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.cohen_kappa_score.html"
  - title: "scikit-learn: train_test_split (stratify parameter)"
    url: "https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html"
draft: false
---

A new model ships on a Tuesday, and by Friday someone asks whether your feature got better or worse. Without a labelled set the answer is a feeling. Anthropic's eval guidance and the practitioner writing I rate both point at the same starting size, tens to low hundreds of examples labelled by someone who knows the domain, so this is a one-week plan for 200. The number 200 is my target, derived below, not a vendor recommendation.

## What is a golden dataset, and how big should it be?

A golden dataset is a fixed set of real inputs, each with a verdict a domain expert has signed off. You run every prompt, model or pipeline change against it and compare. Nothing more mystical than that.

The sources agree on small starts and disagree on emphasis. Anthropic's engineering team says "20-50 simple tasks drawn from real failures" is a good start. Hamel Husain suggests about 30 examples to discover failure modes, about 100 labelled examples per failure mode to validate an automated judge, and warns that below about 60 examples confidence intervals are often too wide to be useful. The Claude docs lean the other way on quality: "Prioritize volume over quality", meaning more questions with automated grading beat fewer hand-graded ones, and their example eval sets run from 50 question groups to 1,000 inputs, with 200 articles for a summarisation eval.

So 200 is a compromise: enough for a discovery pass plus validation of one or two failure modes, small enough that one expert can finish it in a week. Day-by-day:

| Day | Work | Output |
|---|---|---|
| 1 | Pull ~300 candidate inputs from real traffic, failures and tickets, stratified by slice | Candidate pool |
| 2 | Write a one-page labelling guideline; label the first 40 yourself, pass/fail plus a critique | Guideline v0, 40 labels |
| 3 | A second person labels 50 shared items blind; compute agreement | Kappa, list of disagreements |
| 4 | Adjudicate every disagreement; rewrite the guideline where it was unclear | Guideline v1 |
| 5 | Label the rest to 200 | Full label set |
| 6 | Split, check the failure counts per split, freeze | Train/dev/test files |
| 7 | Version it, hash it, wire it into CI | Runnable regression check |

## How do you sample the examples?

Take inputs from where the system actually fails. Anthropic's advice is to start with checks you already run by hand, plus bug trackers and support queues, and to turn user-reported failures into test cases. Hamel adds that you can combine real interactions with LLM-generated synthetic inputs, but "Synthetic data is not as good as real data", so treat it as a way to fill gaps.

Then stratify by slices that matter to the product: document type, language, length, customer segment. The Claude docs' own list of edge cases is a good checklist: irrelevant or nonexistent input, overly long input, poor or harmful user input, and ambiguous cases where humans would also disagree. Anthropic also asks for balance: include cases where a behaviour should happen and cases where it should not, because a one-sided eval pushes you to optimise one side only, such as an agent that searches for nearly everything.

My document-processing work covered 17+ document types at 95% accuracy. A figure like that means little until you say which documents it was measured on, which is why document type is the first stratum I would reach for in a set like this. Oversample the rare slices; a slice with three examples cannot fail a build or pass one.

## How do you write labelling guidelines that survive a second labeller?

One page. For each label: a definition, two or three clear positives, two or three clear negatives, and a tie-break rule for the border. Add a "cannot tell" bucket so labellers are not forced to guess. Anthropic recommends the same escape hatch, an "Unknown" option, for model graders.

Hamel's method for ownership is blunt: pick one principal domain expert whose judgment defines success, ask a single pass/fail question ("Did the AI achieve the desired outcome?"), and have them write a critique detailed enough that a new employee would understand it. Binary verdicts are actionable; a 3 or a 4 on a 1-to-5 scale is not. Anthropic gives the test for a well-specified task: two domain experts would reach the same pass/fail verdict independently.

Those two ideas combine. One expert owns the verdict. A second labeller does not vote; they test the guideline. If they disagree with the owner on many items, the guideline is ambiguous, and you fix the text rather than average the labels.

### Which agreement number should you report?

Report Cohen's kappa next to raw agreement. scikit-learn defines it as (p_o − p_e) / (1 − p_e), observed agreement corrected for chance, where 0.0 means "no agreement beyond what would be expected by chance". Hamel's warning explains why: when failures are rare, a judge that always says Pass scores 95% agreement on a set with 5% errors and catches none of them. The scikit-learn page gives no qualitative scale, so the cut-off is yours. I would treat a low kappa on the shared subset as a broken guideline and not move on until the disagreements are adjudicated. For ordinal labels, the same function takes `weights="quadratic"`.

## Hands-on: sample, measure, split, freeze

Documented APIs only: `cohen_kappa_score` and `train_test_split` with `stratify`, plus standard library hashing.

```python
import hashlib, json, random
from collections import defaultdict
from sklearn.metrics import cohen_kappa_score
from sklearn.model_selection import train_test_split

random.seed(7)

def stratified_sample(rows, slice_key, n):
    """Roughly equal draws per slice, capped by what each slice has."""
    by_slice = defaultdict(list)
    for r in rows:
        by_slice[r[slice_key]].append(r)
    per = max(1, n // len(by_slice))
    out = []
    for items in by_slice.values():
        out += random.sample(items, min(per, len(items)))
    return out

# Day 3: shared subset labelled by owner and second labeller ("pass"/"fail"/"unsure")
raw = sum(a == b for a, b in zip(owner, second)) / len(owner)
kappa = cohen_kappa_score(owner, second)          # weights="quadratic" for ordinal scales
print(f"raw agreement {raw:.2f}  kappa {kappa:.2f}")

# Day 6: 15% train (few-shot examples), 42.5% dev, 42.5% test.
# Merge any stratum with fewer than two members before stratifying.
def stratum(r): return f"{r['slice']}|{r['label']}"

train, rest = train_test_split(golden, train_size=0.15, stratify=[stratum(r) for r in golden], random_state=7)
dev, test = train_test_split(rest, test_size=0.5, stratify=[stratum(r) for r in rest], random_state=7)

def freeze(rows, name):
    body = "\n".join(json.dumps(r, sort_keys=True) for r in rows)
    digest = hashlib.sha256(body.encode()).hexdigest()[:12]
    open(f"{name}-{digest}.jsonl", "w").write(body)
    return digest

print({n: freeze(rs, n) for n, rs in {"train": train, "dev": dev, "test": test}.items()})
```

The split follows Hamel's ranges: train 10–20%, dev 40–45%, test 40–45%, with dev and test kept out of any prompt and the test set run once after the prompt is frozen. On 200 examples that is 30, 85 and 85.

For versioning, never edit a frozen file. Corrections go into a new version with a changelog line and the adjudication reason stored on the row. That is my design choice, not a vendor rule, but it makes "the score dropped" answerable: either the system changed or the set did, and the hash tells you which.

## What can 200 examples actually tell you?

Here is the arithmetic, using a rough normal approximation for a 95% interval.

- Overall pass rate on the 85-example test set: if the true rate is 90%, the interval is about ±6 points (1.96 × √(0.9 × 0.1 / 85)). You can see a 10-point regression; you cannot see a 3-point one.
- A rare failure mode: at 10% prevalence, that test set holds about 8 failing items. If your judge catches 6 of 8, the interval on that catch rate is roughly ±30 points. That is Hamel's point about confidence intervals, in numbers.
- Anthropic's pass^k framing matters for non-deterministic systems: a 75% per-trial rate over three trials gives about 42% for pass^3, so run each item more than once if consistency matters.

Two upgrades follow. Grow the set where the failure counts are thin, using the production failures you find, not more random samples. And re-review after material changes such as a model update; Hamel says the labelling loop repeats whenever something material changes, and Anthropic notes that a set stuck at 100% only tracks regressions, so add harder tasks as scores saturate.

## Takeaways

- Start with 200 real, stratified examples labelled pass/fail with critiques; treat that as a derived target, not a standard.
- One domain expert owns the verdict. A second labeller tests the guideline, and kappa plus adjudication fix it.
- Report kappa beside raw agreement, because rare failures make raw agreement flatter you.
- Split with stratification, keep test out of every prompt, run it once, and freeze each version with a hash.
- Check failure counts per split before trusting any per-failure-mode number.

If you want to see what a set like this protects, case file 07 on [AI document processing](/#file-adr-007-ai-document-processing) is the sort of pipeline it would sit behind.
