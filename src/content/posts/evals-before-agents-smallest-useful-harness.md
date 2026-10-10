---
title: "Evals before agents: the smallest useful eval harness for a product team"
description: "An 85-line Python harness with a dataset, code checks, an LLM judge and a report, plus what to measure first and how much a pass rate on 100 cases can tell you."
date: 2026-10-10T01:38:00Z
tags: ["evals", "testing", "LLM"]
pillar: building
sources:
  - title: "Claude docs: define success criteria and build evaluations"
    url: "https://platform.claude.com/docs/en/test-and-evaluate/develop-tests"
  - title: "Hamel Husain and Shreya Shankar: AI Evals FAQ"
    url: "https://hamel.dev/blog/posts/evals-faq/"
  - title: "openai/evals on GitHub (framework and registry)"
    url: "https://github.com/openai/evals"
  - title: "Claude docs: models overview (API IDs for Sonnet 5.5 and Opus 5.5)"
    url: "https://platform.claude.com/docs/en/models/overview"
  - title: "Claude docs: pricing (per-token rates, Batch API discount)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
draft: false
---

An agent is a loop around model calls, so every weakness in a single call gets multiplied by the number of steps. Before you build the loop, you need a way to tell whether one call got better or worse after you edit a prompt, swap a model or change a retrieval setting. That way is a small set of real cases, a scorer and a report, and it fits in about 85 lines of Python. This post gives you the lines and the judgement about what to put in them.

## What should I measure first?

Not a leaderboard score. Anthropic's guide on building evaluations says good success criteria are specific, measurable, achievable and relevant, and that most use cases need several of them: task fidelity, tone, latency, price. The example it gives for a measurable criterion is "less than 0.1% of outputs out of 10,000 trials flagged for toxicity", which is a sentence you can turn into code.

Where do the cases come from? Hamel Husain and Shreya Shankar's FAQ is blunt: "Start with error analysis, not infrastructure." Read real outputs for about half an hour, 20 to 50 at a time after any significant change, work from a pool of roughly 100 diverse traces, and keep going until new traces stop revealing new kinds of failure. Each failure type you find becomes a check.

Three rules from those two sources decide the shape of the harness:

1. **Prefer cheap code checks.** Anthropic ranks grading methods: code-based is the fastest and most reliable; human grading is the most flexible but slow and expensive; LLM grading is fast, flexible and scalable but should be tested for reliability first. The FAQ agrees: "Start with cheap code-based checks where possible."
2. **Use pass or fail, not scales.** The FAQ's argument is that adjacent points on a 1 to 5 scale are subjective and need larger samples to separate. If you want gradual progress, count several binary sub-checks instead, such as "four of five expected facts present."
3. **Go for volume over polish.** Anthropic's design principles say a larger set of automatically graded questions beats a small set of hand-graded ones, and that the set should mirror the real task, including edge cases: irrelevant input, over-long input, ambiguous requests.

## How big should the dataset be?

Start with 50 to 100 cases drawn from real inputs. Anthropic's worked examples range from 50 paraphrase groups to 1,000 labelled items depending on the method. For LLM judges, the FAQ recommends labelling 100 to 200 examples per failure mode and checking the judge's true positive and true negative rates against your own labels before trusting it. A judge that passes everything is not an eval.

I have reviewed 1,300+ pull requests, and the habit transfers directly: a case added to the eval file deserves the same review a code change gets. Who wrote it, what failure does it represent, and what would make it pass?

## What does the harness look like?

Four stages in one file. A JSONL dataset where each case has an `id`, optional `tags`, an `input`, a list of code `checks` and an optional `rubric`. A runner that calls the model under test. A scorer that applies code checks first and the judge only where a rubric exists. A report with the overall pass rate, per-tag counts, the failing cases with the reason, and a diff against a previous run.

Two case lines look like this:

```json
{"id": "refund-01", "tags": ["policy"], "input": "Can I return a laptop after six weeks?", "checks": [{"type": "contains", "value": "30 days"}, {"type": "max_words", "value": 80}], "rubric": "Says the return window has passed and does not offer a refund."}
{"id": "format-01", "tags": ["format"], "input": "Return my order status as JSON.", "checks": [{"type": "json"}]}
```

The second case has no judge call at all, which is the point: most of what breaks in production (format, length, banned phrases, missing facts) is checkable in code for free.

The judge follows the pattern in Anthropic's docs: a detailed rubric, a constrained output (`<result>correct</result>` or `incorrect`), a request to reason before the verdict, and a grader that is a different model from the generator. Model IDs, `claude-sonnet-5-5` for generation and `claude-opus-5-5` for judging, come from the models overview.

## How much can I trust the number?

Less than the decimal places suggest. With 100 cases and a true pass rate of 90%, the standard error is sqrt(0.9 × 0.1 / 100) = 3 points, so a rough 95% interval is 84% to 96%. A change that moves you from 90% to 93% is inside the noise. At 400 cases the interval narrows to about plus or minus 3 points. This is the normal-approximation maths, crude near 0% and 100%, but it is enough to stop you celebrating a two-point change.

Two habits follow. Compare runs case by case, not just in aggregate: the report below lists regressions (passed before, fails now) and fixes. And when a prompt change helps one tag and hurts another, believe the per-tag lines over the headline number.

## What does a run cost?

Using the pricing page's per-million-token rates, assume each case sends 1,000 input and 300 output tokens to Sonnet 5.5 ($2 in, $10 out): $0.005. A judged case adds an Opus 5.5 call ($4 in, $20 out) of, say, 800 input and 500 output tokens: $0.0132. Those token counts are my assumptions; measure yours from the `usage` block. A hundred cases with a judge on every one costs about $1.82; with judges on 30 of them, about $0.90. The Batch API is 50% cheaper if you can wait. An eval you can afford to run on every prompt change gets run; one that costs a day's budget does not.

## Hands-on: the harness

Save as `evals.py`, set `ANTHROPIC_API_KEY`, and run `python evals.py cases.jsonl` (add a previous `last_run.json` as the second argument to get the regression diff). Replace `SYSTEM` with the prompt you are testing. The calls follow the Messages API shape used in Anthropic's evaluation examples, including picking the first text block from the response.

```python
import json
import math
import re
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import anthropic

client = anthropic.Anthropic()
GEN_MODEL = "claude-sonnet-5-5"      # the thing under test
JUDGE_MODEL = "claude-opus-5-5"      # a different model grades it
SYSTEM = "You are the support assistant for Acme. Answer only from policy; be brief."

def text_of(message):
    return next(b.text for b in message.content if b.type == "text")

def generate(case):
    r = client.messages.create(model=GEN_MODEL, max_tokens=1024, system=SYSTEM,
                               messages=[{"role": "user", "content": case["input"]}])
    return text_of(r)

def code_check(chk, out):
    kind, val = chk["type"], chk.get("value")
    if kind == "contains":
        return val.lower() in out.lower()
    if kind == "not_contains":
        return val.lower() not in out.lower()
    if kind == "regex":
        return re.search(val, out) is not None
    if kind == "max_words":
        return len(out.split()) <= val
    if kind == "json":
        try:
            json.loads(out)
            return True
        except ValueError:
            return False
    raise ValueError(f"unknown check type: {kind}")

def judge(case, out):
    prompt = (f"Grade this answer against the rubric.\n<rubric>{case['rubric']}</rubric>\n"
              f"<question>{case['input']}</question>\n<answer>{out}</answer>\n"
              "Think briefly, then output 'correct' or 'incorrect' in <result> tags.")
    r = client.messages.create(model=JUDGE_MODEL, max_tokens=2048,
                               messages=[{"role": "user", "content": prompt}])
    return "<result>correct</result>" in text_of(r).lower()

def score(case):
    out = generate(case)
    failed = [f"{c['type']}:{c.get('value', '')}" for c in case.get("checks", [])
              if not code_check(c, out)]
    if "rubric" in case and not judge(case, out):
        failed.append("judge")
    return {"id": case["id"], "tags": case.get("tags", []), "pass": not failed,
            "failed": failed, "output": out}

def report(results, baseline=None):
    n, passes = len(results), sum(r["pass"] for r in results)
    p = passes / n
    half = 1.96 * math.sqrt(p * (1 - p) / n)
    print(f"overall: {passes}/{n} = {p:.1%} (95% interval {max(0, p-half):.1%} to {min(1, p+half):.1%})")
    by_tag = defaultdict(lambda: [0, 0])
    for r in results:
        for t in r["tags"] or ["untagged"]:
            by_tag[t][0] += r["pass"]
            by_tag[t][1] += 1
    for t, (a, b) in sorted(by_tag.items()):
        print(f"  {t:<14} {a}/{b}")
    for r in results:
        if not r["pass"]:
            print(f"FAIL {r['id']}: {', '.join(r['failed'])}")
    if baseline:
        old = {r["id"]: r["pass"] for r in baseline}
        reg = [r["id"] for r in results if old.get(r["id"]) and not r["pass"]]
        fix = [r["id"] for r in results if old.get(r["id"]) is False and r["pass"]]
        print(f"vs baseline: {len(reg)} regressions {reg}, {len(fix)} fixes {fix}")

if __name__ == "__main__":
    cases = [json.loads(line) for line in open(sys.argv[1]) if line.strip()]
    with ThreadPoolExecutor(8) as pool:
        results = list(pool.map(score, cases))
    baseline = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else None
    json.dump(results, open("last_run.json", "w"), indent=1)
    report(results, baseline)
```

Copy `last_run.json` to `baseline.json` before an experiment, change one thing, run again with the baseline argument, and read the regressions first.

Once the file exists, grow it from failures. Every production bug becomes a case. When you add a judge rubric, label 50 or more passing and 50 or more failing outputs by hand and check the judge against them before you trust its verdicts. The openai/evals repository is the established open-source alternative: its README describes "a framework for evaluating LLMs and LLM systems, and an open-source registry of benchmarks", and points to running evals in the OpenAI Dashboard. It is a good reference for eval types such as model-graded evals; the reason to start with 85 lines you own is that you will read every one.

## Takeaways

- Build the eval set from error analysis on real outputs, 50 to 100 cases to begin with, before you build any agent loop.
- Write code checks first; use an LLM judge only where a rule cannot see the failure, and grade with a different model than the one generating.
- Use binary pass or fail, tag every case, and read per-tag results and regressions, not just the headline.
- A pass rate on 100 cases has a margin of roughly plus or minus 6 points at 90%. Do not act on smaller moves.
- Keep a run cheap enough to repeat: a hundred judged cases costs about two dollars on the assumptions above.

The retrieval posts in this series, on chunking and hybrid search, each end in a measurement harness you can fold into this one as another tag.
