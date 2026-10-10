---
title: "Jev's Choice primitive: 255 options and the distribution you get back"
description: "How to write Choice criteria for TypeSafe's Jev, read the probability distribution, set confidence thresholds per question, and search deep taxonomies with a beam."
date: 2026-10-10T01:21:00Z
tags: ["TypeSafe Jev", "Choice", "classification", "confidence", "Python"]
pillar: building
sources:
  - title: "TypeSafe AI docs: Choice"
    url: "https://docs.typesafe.ai/primitives/choice"
  - title: "TypeSafe AI docs: confidence"
    url: "https://docs.typesafe.ai/confidence"
  - title: "TypeSafe AI docs: patterns (overview)"
    url: "https://docs.typesafe.ai/patterns"
  - title: "TypeSafe AI docs: intent routing pattern"
    url: "https://docs.typesafe.ai/patterns/intent-routing"
  - title: "TypeSafe AI docs: hierarchical classification cookbook"
    url: "https://docs.typesafe.ai/cookbooks/hierarchical_classification"
  - title: "TypeSafe AI docs: classification using confidence cookbook"
    url: "https://docs.typesafe.ai/cookbooks/classification_using_confidence"
  - title: "TypeSafe AI docs: Jev 1.13 jaggedness (documented weaknesses)"
    url: "https://docs.typesafe.ai/model-jaggedness/jev-1.13"
draft: false
---

A Choice question looks like a classifier with a long list of labels. The useful part is what comes back with the label: the whole probability distribution over your options, and a confidence number derived from its shape. That is enough to decide when to act, when to fall back to something coarser, and when to ask a person. This post goes deeper on Choice than my [overview of Jev](/blog/jev-typed-questions-instead-of-prompt-and-parse): how to write the options, why the same confidence means different things at different option counts, and how to walk a taxonomy too big for one question. Everything here comes from TypeSafe's docs as of 10 October 2026. I have not run Jev in production; the code is a design.

## What does a Choice question look like?

A Choice picks one option from an unordered set, up to 255 of them. The request has a `state`, a `model` and a `questions` map. Each Choice question has `type` (always `"choice"`), `instructions`, and `criteria`, a map of option names to descriptions. The question ID is yours and is never sent to the model; the model does see the option names and descriptions, so the descriptions have to separate options that look alike.

The answer has three fields. `choice` is the option with the highest probability. `probabilities` is a distribution over every option and sums to 1. `confidence` is a 0 to 1 value from how the probability is spread: a single peak is high, a flat spread is low.

Criteria can be richer than strings. The docs say `instructions` and each `criteria` entry can be a string, an object or an array, start with a string, and move to an object when an option needs guidance on what it covers, what it excludes, and examples. The field names inside the object (`what`, `not_for`, `examples`) are yours, not reserved. A description can also be `null` when the name is self-explanatory. A request body with all three styles:

```json
{
  "state": "I was charged twice for March and I want one of them back.",
  "model": "jev-1.13.0",
  "questions": {
    "intent": {
      "type": "choice",
      "instructions": "What is the main request in the message?",
      "criteria": {
        "refund": {
          "what": "The customer wants money returned.",
          "not_for": "Questions about why a charge happened.",
          "examples": ["charged twice", "cancel and refund"]
        },
        "billing_question": "The customer wants a charge explained, not reversed.",
        "other": null
      }
    }
  }
}
```

Use the versioned model ID while you tune. The models page says `jev-latest` points at `jev-1.13.0` today and that answers behind an alias can change without any change on your side.

## How do you write options the model can separate?

The docs give four rules that matter, and one weakness that is easy to miss.

**Give the full list, not a shortlist.** Add an "other" or "none of the above" option when the list may not cover every input. Without it, the model has to spread its probability over options that do not fit.

**Write contrastive descriptions.** If "refund" and "billing_question" overlap, say so in the descriptions. That is what `not_for` is for.

**Ask everything you might need in one request.** Questions are evaluated in parallel, so response time barely moves, but each extra question still costs input tokens.

**Mind the order.** The documented weaknesses for `jev-1.13` include that it "leans toward the option that comes first". Put the safe default or the most common option first only if you want that bias, and re-run a labelled set with the options shuffled before you trust a close call. The hierarchical cookbook makes a related point: sibling order is part of the question.

The same page lists other weaknesses to design around: it reads questions literally ("answers the question you wrote, not the one you meant"), it is weaker on numbers, dates and counting, and accuracy "falls as the state grows with content unrelated to the decision". Filter the state before you send it.

## What does confidence mean at 2, 3 or 255 options?

For n options, confidence is (p_max − 1/n) / (1 − 1/n): the top probability rescaled so an even spread is 0 and certainty is 1. Only the top probability counts. The docs warn that its meaning depends on the number of options and tell you to set thresholds per question. The effect is large. Hold the top probability at 0.6 and vary n:

| Options | p_max | Confidence |
|---|---|---|
| 2 | 0.60 | 0.20 |
| 3 | 0.60 | 0.40 |
| 10 | 0.60 | 0.56 |
| 255 | 0.60 | 0.60 |

A threshold of 0.5 means "the top option holds at least 75%" on a two-way question and "a bit over half" on a ten-way one. If you reuse one global cutoff across questions of different sizes, you are using different rules without knowing it. The docs name an alternative for Choice, the top-to-second ratio (p_max divided by the runner-up), which measures how clearly the winner beats its nearest rival. It is the better signal when two options are confusable by design, such as "refund" and "billing_question", because a 0.45 versus 0.40 split on a ten-way question gives a confidence of 0.39 and a ratio of about 1.1, and only the ratio says "coin flip".

## Where do thresholds come from?

The patterns pages give two shapes for routing and one worked cookbook.

The **intent routing** example sends a message to a handler by its Choice answer, with confidence below 0.5 going to a human. The interesting part is the second gate. A parallel Score question for complexity decides, for the `complaint` intent only, whether a specialist LLM or a person takes it: a score above 1, or complexity confidence below 0.5, goes to a human. One call covers both decisions, and the expensive handlers run only when a request needs them.

The **confidence-gated** example sets the floor by the action, not globally: 0.6 for anything, then `check_balance` acts at 0.6, while `approve_transfer` acts automatically only above 0.85 and asks the user to confirm between 0.6 and 0.85.

The **classification-using-confidence** cookbook is the one I would copy. It labels SEC 10-K filings into the 75 SIC major industry groups with one Choice question, then reports the group at confidence 0.9 or above and the broader division (derived with no second call) below it. On 60 filings:

| Policy | Correct |
|---|---|
| Always name a group | 39 of 60 (65%) |
| Group when confident, division when not | 48 of 60 (80%) |

Thirty answers were confident and 90% of those were right. The other thirty were right at the group level only 40% of the time, but reporting the division lifted them to 70%. The cookbook's own caveats apply: it is 60 filings, the 0.9 cutoff was tuned on the same data and is probably optimistic, and the run used `jev-1.12`. What transfers is the shape: a low-confidence Choice is not a failure, it is a prompt to answer a coarser question.

## Hands-on: search a deep taxonomy with a beam

For a taxonomy too large for one question, the hierarchical cookbook asks one Choice per sibling set and walks down. Greedy search takes the best child each time and cannot recover from an early wrong turn. Beam search keeps the top three paths, asks the sibling questions for every open path in parallel, and ranks paths by the geometric mean of their edge probabilities so shallow and deep leaves compare fairly. On one hand-labelled document per hierarchy, beam matched 4 of 4 expected leaves and greedy 2 of 4; the cookbook itself calls that anecdotal. Here is a compact version of the idea, not the cookbook's code:

```python
from concurrent.futures import ThreadPoolExecutor
from typesafe_sdk import Choice, TypeSafeClient

client = TypeSafeClient()
TREE = {"Pets": {"Cats": {"Cat Beds": {}, "Cat Trees": {}}, "Dogs": {"Dog Beds": {}}}}
DESC = {"Pets": "Pet supplies", "Cats": "Cat products", "Dogs": "Dog products",
        "Cat Beds": "Beds and window perches for cats", "Cat Trees": "Climbing towers",
        "Dog Beds": "Beds for dogs"}   # one description per label

def children(path):
    node = TREE
    for label in path:
        node = node[label]
    return list(node)

def ask(text, options):
    if len(options) == 1:
        return {options[0]: 1.0}
    r = client.system_one(
        state={"text": text},
        questions={"child": Choice(instructions="Which category best fits `text`?",
                                   criteria={o: DESC[o] for o in options})},
    )
    return r.answers["child"].probabilities     # keyed by option name

def score(b):                                   # geometric mean of edge probabilities
    path, prod, n = b
    return prod ** (1 / n) if n else 1.0

def beam_search(text, width=3, max_depth=8):
    beam = [((), 1.0, 0)]                       # (path, product of p, decisions)
    for _ in range(max_depth):
        open_ = [b for b in beam if children(b[0])]
        done = [b for b in beam if not children(b[0])]
        if not open_:
            break
        with ThreadPoolExecutor(width) as pool:
            dists = list(pool.map(lambda b: ask(text, children(b[0])), open_))
        grown = [(path + (k,), prod * max(p, 1e-9), n + 1)
                 for (path, prod, n), d in zip(open_, dists) for k, p in d.items()]
        beam = sorted(done + grown, key=score, reverse=True)[:width]
    return sorted(beam, key=score, reverse=True)

best, runner_up = beam_search("A padded window perch for my cat")[:2]
ratio = score(best) / score(runner_up)          # near 1.0 means ambiguous
```

Two additions I would make before shipping. Log the versioned model ID with each result. And treat a `ratio` near 1 as the signal to route to a person, the same way you treat low confidence at a single level. The beam costs up to `width` calls per level, so API usage grows with depth even though latency stays flat.

My own 2024 document pipeline classified 17+ document types, which sits comfortably inside the 255-option limit with room for an "other". The part of this post I would carry over is the table of confidence by option count: it is the thing I would have wanted before picking a cutoff.

## Takeaways

- Choice returns the full distribution, not just a label. Use the probabilities, not only `choice`.
- Write contrastive option descriptions, include an "other", and test with the options shuffled, since the docs say Jev leans toward the first option.
- Confidence depends on option count. Set thresholds per question, and consider the top-to-second ratio when two options are easily confused.
- Low confidence is a signal to answer a coarser question, as the SIC cookbook does (65% to 80% on 60 filings, threshold tuned on the same data).
- For deep taxonomies, ask one Choice per level and keep a beam of three paths.

Next, the other side of the same toolbox: [Jev's Score primitive and how to design rubrics](/blog/jev-score-primitive-designing-rubrics).
