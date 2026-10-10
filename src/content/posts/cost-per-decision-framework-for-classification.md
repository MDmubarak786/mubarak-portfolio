---
title: "Cost per decision: a framework for pricing LLM classification at scale"
description: "A formula for classification cost: tokens, cache, batch, human review and error cost, filled with published Haiku 5.5, Sonnet 5.5 and Gemini prices, no invented accuracy."
date: 2026-10-10T01:53:00Z
tags: ["cost", "classification", "Haiku 5.5", "Gemini 3.8 Flash", "LLM pricing", "evaluation"]
pillar: building
sources:
  - title: "Claude docs: pricing (Haiku 5.5, Sonnet 5.5, cache reads, Batch API)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: prompt caching (512-token minimum on 5.5 models)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Gemini API pricing (3.8 Flash, 3.5 Flash-Lite, batch, 2027 change)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Gemini API docs: context caching (4,096-token implicit minimum on 3.8 Flash)"
    url: "https://ai.google.dev/gemini-api/docs/caching"
  - title: "scikit-learn: cost-sensitive learning and decision thresholds"
    url: "https://scikit-learn.org/stable/auto_examples/model_selection/plot_cost_sensitive_learning.html"
  - title: "Claude docs: define success criteria and build evaluations"
    url: "https://platform.claude.com/docs/en/test-and-evaluate/develop-tests"
  - title: "TypeSafe AI docs: Noul (usage fields, thresholds)"
    url: "https://docs.typesafe.ai/primitives/noul"
draft: false
---

Per-token prices are a bad way to compare classifiers. They leave out the cache, the batch discount, the human who reviews the uncertain cases, and the cost of getting a decision wrong. This post gives the formula that includes all of them, fills the token side with published prices as of 10 October 2026, and leaves the error side as variables, because I have no benchmark to fill them with and will not invent one.

## What is the formula?

For one decision:

```text
cost per decision = token cost
                  + P(review) × cost of a review
                  + P(wrong) × cost of an error
```

The token cost is the only part a pricing page can tell you:

```text
token cost = ( uncached_in × p_in + cached_in × p_cached + out × p_out ) / 1,000,000
```

where the prices are per million tokens. A classifier has a convenient shape: a long, stable prefix (instructions, label definitions, examples), a short variable part (the item), and a very short output (a label). So most of the input can be cached and the output is tiny.

The other two terms come from your business and your evaluation. The rest of the post is about not letting the first term distract you from them.

## What do the published prices say?

From the Claude pricing page, per million tokens:

| Model | Input | Cache read | Output | Batch input / output |
|---|---|---|---|---|
| Haiku 5.5 (prompts up to 100,000 tokens) | $0.10 | $0.01 | $0.50 | $0.05 / $0.25 |
| Sonnet 5.5 | $2.00 | $0.10 | $10.00 | 50% off both |

Haiku 5.5 is priced by prompt length. A request over 100,000 tokens pays $0.50 input and $2.50 output, and the docs say the length "counts all of its input tokens, including cache reads and cache writes", so a big cached prefix can push a request into the dearer row. A classification prompt is nowhere near that.

From the Gemini pricing page, Gemini 3.8 Flash is $0.75 input, $3.75 output (including thinking tokens) and $0.075 cached input, with batch at half price. Those are "through December 31, 2026"; from 1 January 2027 input, output and caching prices double. Gemini 3.5 Flash-Lite is $0.30 input and $2.50 output, with no date-based change listed.

Two cache minimums decide whether the cache term exists at all. The Claude caching docs give 512 tokens for Sonnet 5.5 and Haiku 5.5; prompts shorter than that are processed normally, with no error. The Gemini caching page lists a 4,096-token minimum for implicit caching on 3.8 Flash. I could not find a minimum for 3.5 Flash-Lite on the pages I fetched, so I leave it uncached below.

One model I cannot price: Jev, TypeSafe's calibrated-decision model. Its public docs show token counts in the `usage` field but no per-token prices, and the pricing page I tried returned a 404. If it fits your problem, you will need a quote.

## A worked example: routing support tickets

Assume: a 2,000-token stable prefix (instructions, 12 label definitions, examples), a 200-token ticket, and a 20-token label as output. No thinking tokens; I am assuming you switch extended reasoning off for a classifier. Per decision, in USD:

| Setup | Calculation | Per decision | Per million |
|---|---|---|---|
| Haiku 5.5, uncached | 2,200 × $0.10 + 20 × $0.50 | $0.00023 | $230 |
| Haiku 5.5, prefix cached | 2,000 × $0.01 + 200 × $0.10 + 20 × $0.50 | $0.00005 | $50 |
| Haiku 5.5, batch, uncached | 2,200 × $0.05 + 20 × $0.25 | $0.000115 | $115 |
| Sonnet 5.5, prefix cached | 2,000 × $0.10 + 200 × $2 + 20 × $10 | $0.0008 | $800 |
| Gemini 3.5 Flash-Lite, uncached | 2,200 × $0.30 + 20 × $2.50 | $0.00071 | $710 |
| Gemini 3.8 Flash, uncached | 2,200 × $0.75 + 20 × $3.75 | $0.001725 | $1,725 |

(All the tokens-times-price terms are divided by 1,000,000.) Four things fall out.

First, Gemini 3.8 Flash is uncached in this example because a 2,000-token prefix is under its 4,096-token implicit-caching minimum. The same prompt on Haiku 5.5 caches fine at 512. A cheaper list price can lose to a lower cache threshold. After 1 January 2027 the Gemini line doubles to about $3,450 per million.

Second, Haiku with caching is $50 per million decisions. Sonnet with caching is 16 times that, and Gemini 3.8 Flash uncached is about 35 times.

Third, none of these is a large number in absolute terms. A million decisions a month at the dearest row is under $2,000. That is why the other two terms matter.

Fourth, I have left out cache writes. At steady traffic the 5-minute Claude cache is refreshed free on every read, so the write is a one-off per warm-up; the [prompt caching post](/blog/prompt-caching-economics-rag-bill-2026) has the arithmetic.

## When is the dearer model worth it?

The question is whether its accuracy gain pays for its price gap, and you can answer it without a benchmark by asking the question backwards. Sonnet 5.5 cached costs $0.00075 more per decision than Haiku 5.5 cached. It pays for itself if it reduces the error rate by more than that gap divided by the cost of one error.

| Cost of one error | Error rate must fall by |
|---|---|
| $0.50 | 0.15 percentage points |
| $5 | 0.015 percentage points |
| $50 | 0.0015 percentage points |

Those are break-even requirements, not claims about either model; the error costs are placeholders for you to replace with your own. The pattern is the useful part: once a wrong decision costs more than a few cents, the token price is a rounding error, and the choice is an evaluation question. You find the real error rates by running both models on a labelled sample of your data. Anthropic's own evaluation guidance applies: tasks that mirror "your real-world task distribution", graded automatically where you can, with more questions preferred over fewer hand-graded ones.

Human review dominates in the same way. If a review costs $1 (a placeholder) and 2% of decisions go to review, that is $0.02 per decision, which is 400 times the cached Haiku token cost. Shaving the escalation rate by half a point is worth more than switching providers.

## Where does the threshold come from?

If your classifier returns calibrated probabilities, the cost-minimising rule is to act on the positive class when the expected cost of acting is lower than the expected cost of not acting: p × c_FN > (1 − p) × c_FP, so the cut-off is c_FP / (c_FP + c_FN). The scikit-learn guide makes the same point from the other side: the default 0.5 cut-off "is most likely not optimal for the task at hand" when errors are unequally costly. In its German-credit example, tuning the threshold to a cost matrix moved the business gain from -209 to -143. That is a credit dataset, not an LLM result, and I quote it only to show the direction of the effect.

Calibration is the catch. A model that gives you a number is only useful for this if the number means something. Noul, TypeSafe's yes/no primitive, returns a value from 0 to 1 and its docs say to set the threshold in your code and send middle values to a person; whether that number is calibrated for your data is something you check, not assume.

## Hands-on: the calculator

```python
PRICES = {   # USD per million tokens: (input, cached_read, output), from the pricing pages, 10 Oct 2026
    "haiku-5.5":        (0.10, 0.01, 0.50),
    "sonnet-5.5":       (2.00, 0.10, 10.00),
    "gemini-3.8-flash": (0.75, 0.075, 3.75),
}

def token_cost(model, prefix, item, out, cached=True, min_cache=512):
    p_in, p_cached, p_out = PRICES[model]
    use_cache = cached and prefix >= min_cache      # below the minimum, no cache, no error
    prefix_price = p_cached if use_cache else p_in
    return (prefix * prefix_price + item * p_in + out * p_out) / 1_000_000

def decision_cost(token, p_review, review_cost, p_wrong, wrong_cost):
    return token + p_review * review_cost + p_wrong * wrong_cost

def threshold(c_fp, c_fn):
    """Act on 'positive' when calibrated p >= this."""
    return c_fp / (c_fp + c_fn)

haiku = token_cost("haiku-5.5", 2000, 200, 20)                    # 0.00005
flash = token_cost("gemini-3.8-flash", 2000, 200, 20,
                   min_cache=4096)                                # uncached: 0.001725
# p_wrong and p_review come from YOUR eval, not from this post:
total = decision_cost(haiku, p_review=0.02, review_cost=1.0, p_wrong=0.0, wrong_cost=0.0)
```

Run it with your own prefix length, volume and eval results, and sweep the unknowns. A sensitivity table of total cost against error rate and review rate tells you more than a point estimate.

## Takeaways

- Cost per decision is token cost plus review cost plus error cost. Token cost is usually the smallest term.
- Check the cache minimum before trusting a list price: 512 tokens on Claude's 5.5 models, 4,096 for implicit caching on Gemini 3.8 Flash. The same prompt can cache on one and not the other.
- Gemini 3.8 Flash prices double on 1 January 2027; budget for the new price, not the current one.
- Use break-even error rates to compare models before you have benchmarks, then measure the real ones on your own labelled data.
- Set the decision threshold from the cost ratio, and only trust a probability you have checked for calibration.

If you want the other half of a cheap classifier's design, the [Jev post](/blog/jev-typed-questions-instead-of-prompt-and-parse) covers typed questions and what the confidence number means.
