---
title: "Confidence-gated routing: use model confidence as a second axis"
description: "Act, confirm or escalate: how to gate model answers on confidence, set thresholds by cost of error, and get a usable signal from Jev and from JSON-schema chat models."
date: 2026-10-10T01:24:00Z
tags: ["confidence", "routing", "human in the loop", "TypeSafe Jev", "structured output"]
pillar: building
sources:
  - title: "TypeSafe AI docs: confidence (bands, formulas, example thresholds)"
    url: "https://docs.typesafe.ai/confidence"
  - title: "Claude docs: model deprecations (temperature, top_p, top_k return 400 on 4.7 and later)"
    url: "https://platform.claude.com/docs/en/about-claude/model-deprecations"
  - title: "TypeSafe AI docs: confidence-gated routing (voice banking example)"
    url: "https://docs.typesafe.ai/patterns/confidence-routing"
  - title: "TypeSafe cookbook: classification using confidence (SEC filings, fallback to a broader label)"
    url: "https://docs.typesafe.ai/cookbooks/classification_using_confidence.md"
  - title: "TypeSafe cookbook: self-consistency with nouls (uncertain band to human review)"
    url: "https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook.md"
  - title: "TypeSafe cookbook: self-consistency with choices (0.60 policy, uncertain outcome)"
    url: "https://docs.typesafe.ai/cookbooks/consistency_choice_cookbook.md"
  - title: "Claude docs: structured outputs (output_config.format, limitations, confidence caveat)"
    url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs"
  - title: "Google AI forum: logprobs missing from the Interactions API (community thread, May to June 2026)"
    url: "https://discuss.ai.google.dev/t/missing-logprobs-support-in-next-gen-interactions-api-generationconfig-2/144837"
draft: false
---

Most AI features gate on the answer and ignore how sure the model was. A classifier says "refund" and the code issues a refund. A second number, how confident the answer is, lets you split the same answer into three outcomes: do it, check first, or hand it to a person. As of 10 October 2026 that second axis is a documented pattern for TypeSafe's Jev, and with a bit more work you can approximate it on any JSON-schema chat model.

This post is about the gating logic itself: where the thresholds come from, what TypeSafe's own cookbooks measured, and what to do when your model does not give you a calibrated number. I have not run Jev in production; this is design built on the docs and the cookbooks, and I say where something is the vendor's measurement, not mine.

## What is confidence-gated routing?

TypeSafe lists it as one of four patterns, built on using confidence as a second decision axis alongside the answer. The routing page states the principle in one line: "The answer tells you what; confidence tells you whether to act."

The mechanics are short. Jev returns, for every Choice and Score question, a probability distribution and a `confidence` between 0 and 1. Your code reads both. The docs describe three bands without fixing numbers: high means act automatically; medium means proceed with caution, which can mean asking the user to confirm, flagging for review or gathering more information; low means do not act and route to a human, ask for clarification or fall back to another system. (Noul answers carry no `confidence` field. The probability itself is the signal, and the docs give |2p − 1| if you want a confidence-style number.) My earlier post on [Jev as a programming primitive](/blog/jev-typed-questions-instead-of-prompt-and-parse) covers the formulas; here I take the bands as given.

## Where do the thresholds come from?

Nowhere universal, and the two TypeSafe pages that show numbers disagree on purpose. The confidence page gates a banking example at a 0.5 floor and 0.9 for approving a transfer. The routing page uses a 0.6 floor and 0.85 for the same kind of action. Both call their values illustrative.

What they agree on is the shape. A floor catches genuine uncertainty before any action-specific logic runs. Then each action has its own bar, scaled to the cost of being wrong. In the routing example, `check_balance` is allowed at the floor because the worst case is a wrong read-out. `approve_transfer` needs more than 0.85 to run automatically and goes to a confirmation prompt otherwise. The docs note the boundary detail too: the code uses a strict `> 0.85`, so exactly 0.85 confirms rather than approves.

My rule for setting numbers, which is a design argument and not something I measured: start from the cost of a wrong action and the cost of a review. Raise the auto-act bar until the wrong actions you still let through, times their cost, are smaller than the review cost you save by not routing them to a person. If a wrong action costs 100 times a review, that bar sits high; if it costs about the same, a low bar is fine. You cannot compute it without a labelled set, which is the vendor's advice as well: set production boundaries from labelled examples.

## What do TypeSafe's cookbooks actually measure?

Three cookbooks turn the pattern into numbers. All are the vendor's runs on small samples, so read them as demonstrations.

**Fallback to a broader label.** The SEC-filings recipe classifies 60 10-K business sections into 75 industry groups with one Choice question each. If confidence is at least 0.9 it reports the group; otherwise it reports the containing division, one of 10. Always naming a group was right 39 times out of 60 (65%). Thirty answers cleared the 0.9 bar and 27 of them were right (90%); the other 30, if named as groups, were right 12 times (40%). Reported as divisions they were right 21 times (70%). With the fallback, 48 of 60 answers were useful (80%). The point is that low confidence does not have to mean "human". It can mean "answer a coarser question".

**An uncertain band for yes/no.** The Noul cookbook maps probability below 0.30 to no, above 0.70 to yes, and everything from 0.30 to 0.70 inclusive to "uncertain", which goes to a person. It is application logic on the returned number: no extra call. The page calls the band illustrative, and notes that values near an outer boundary can still flip between uncertain and automatic.

**A threshold on probabilities, not on `confidence`.** The Choice cookbook returns a label only if the top probability is at least 0.60, otherwise `uncertain`. Across 15 repeats of 8 questions it reports 99.2% agreement under that policy, up from 90.8% raw, with 25.8% of answers sent to review. Agreement is repeatability, not correctness, and the page says so.

## What if my model has no calibrated confidence?

On a JSON-schema chat model you have three options, and they are not equal.

**Self-reported confidence.** Add a `confidence` number to the schema. Claude's structured-outputs page is plain about what this is: the only "confidence" in its examples is a user-defined number field the model fills in, and the page does not present it as a calibrated probability from the API. It is also awkward to bound: `minimum` and `maximum` are not supported in the schema, so the range lives in your description and your validator. Use it as a weak signal, never as the only gate.

**Token probabilities.** Where a provider exposes logprobs, the top label's probability is a better raw signal. Support is uneven. A Google AI forum thread from May 2026 asked why the Interactions API has no logprobs; the reply from Google said "This is working as intended", because that API dropped candidates. A follow-up in June found the Node.js config types without logprobs properties and got no reply. It is a community thread, so check the docs for the exact parameter on the endpoint and model you use before designing around it.

**Self-consistency.** Ask the same question k times and use the agreement rate as confidence. This is what TypeSafe's cookbooks measure, and it works on any model, at k times the cost. On current Claude models you cannot pin temperature: Anthropic's deprecations page says `temperature`, `top_p` and `top_k` return a 400 when set to a non-default value on Claude 4.7 and later. You sample at the default and accept the variance, which is the thing you are measuring anyway. Prompt caching (see [the caching post](/blog/prompt-caching-economics-rag-bill-2026)) makes the repeated prefix cheap.

## Hands-on: the same gate on two backends

First the Jev version, following the routing page's shape with a floor, then a per-action bar. The `route_*` and `ask_*` functions are yours.

```python
from typesafe_sdk import Choice, TypeSafeClient

client = TypeSafeClient()

# Per-action auto-act bars, scaled to cost of error. Illustrative: tune on labelled data.
AUTO = {"check_balance": 0.60, "approve_transfer": 0.85}
FLOOR = 0.60

def route(utterance: str, account_id: str):
    r = client.system_one(
        state={"utterance": utterance},
        questions={"intent": Choice(
            instructions="What does the customer want?",
            criteria={
                "check_balance": "Check the balance of an account",
                "approve_transfer": "Approve the pending transfer request",
                "other": "Something else",
            },
        )},
    )
    a = r.answers["intent"]
    if a.confidence < FLOOR or a.choice == "other":
        return route_to_support_agent(account_id)
    if a.choice == "check_balance":
        return show_balance(account_id)
    if a.confidence > AUTO["approve_transfer"]:
        return approve_transfer(account_id)
    return ask_user_to_confirm(account_id)      # the middle band
```

Now the same gate on a schema-constrained Claude call, with an enum intent, agreement over k samples as the confidence and the bands in code. The REST field is `output_config.format`; check your SDK version for how it surfaces the parameter.

```python
import json
from collections import Counter
import anthropic

client = anthropic.Anthropic()
SCHEMA = {
    "type": "object",
    "properties": {"intent": {"type": "string",
                              "enum": ["check_balance", "approve_transfer", "other"]}},
    "required": ["intent"],
    "additionalProperties": False,
}

def sample_intent(utterance: str) -> str:
    r = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=100,
        messages=[{"role": "user", "content": f"Classify the customer's intent: {utterance}"}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
    )
    return json.loads(r.content[0].text)["intent"]

def route_sampled(utterance: str, k: int = 5):
    votes = Counter(sample_intent(utterance) for _ in range(k))
    label, n = votes.most_common(1)[0]
    agreement = n / k                       # a repeatability score, not a probability
    if agreement < 0.8 or label == "other":
        return "human", label, agreement
    if label == "approve_transfer" and agreement < 1.0:
        return "confirm", label, agreement  # high-stakes action needs unanimity to auto-run
    return "act", label, agreement
```

Log the band chosen next to the eventual outcome. After a few hundred cases you can plot accuracy by band, and that plot, not any docs page, is what sets your thresholds. Agreement over five samples takes only a handful of distinct values, so it is coarse; raise k where the decision is worth it.

## Takeaways

- Treat confidence as a second axis: the answer says what, confidence says whether to act. Three outcomes, act, confirm, escalate, beat a binary accept or reject.
- Scale the bar to the cost of error, per action, behind a shared floor. Documented example numbers (0.5/0.9 and 0.6/0.85) are illustrations, not defaults.
- Low confidence can mean "answer a coarser question" as well as "ask a human"; the SEC cookbook went from 65% to 80% useful answers that way.
- A self-reported `confidence` field is an uncalibrated number. Prefer logprobs where they exist, or agreement across samples, and measure accuracy by band before you trust either.
- Log band and outcome from day one; that table is your threshold-setting dataset.

Next, [which AI model to build on in October 2026](/blog/which-ai-model-to-build-on-october-2026) covers the choice of model that sits behind a gate like this.
