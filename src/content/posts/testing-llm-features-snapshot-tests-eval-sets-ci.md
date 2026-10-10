---
title: "Testing LLM features: snapshot tests, eval sets and CI budgets"
description: "What to run per pull request and what to run nightly, plus how to cap the bill: snapshot the prompt, not the answer, and gate on a small eval set. With GitHub Actions."
date: 2026-10-10T02:07:00Z
tags: ["testing", "CI", "evals", "GitHub Actions", "LLM", "Claude Haiku 5.5"]
pillar: building
sources:
  - title: "Claude docs: define success criteria and build evaluations"
    url: "https://platform.claude.com/docs/en/test-and-evaluate/develop-tests"
  - title: "Claude docs: pricing (Haiku 5.5, Sonnet 5.5, batch rates)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: Message Batches API (50% rate, 24-hour expiry, limits)"
    url: "https://platform.claude.com/docs/en/build-with-claude/batch-processing"
  - title: "Claude Haiku 5.5 migration guide (sampling parameters, thinking, token counts)"
    url: "https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide"
  - title: "GitHub Docs: events that trigger workflows (schedule, workflow_dispatch, forks)"
    url: "https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows"
  - title: "GitHub Docs: using secrets in GitHub Actions"
    url: "https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions"
  - title: "GitHub Docs: workflow syntax (concurrency, timeout-minutes, paths)"
    url: "https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions"
draft: false
---

You cannot unit-test a model the way you test a function: the same input does not promise the same output, and every test run costs money. What you can do is split the feature into the parts that are deterministic, test those on every pull request, and measure the model part with a small eval set on a budget. This is the split I would put in CI, with the YAML.

## What can you test without calling a model?

More than people expect, and it is free.

- **Prompt assembly.** The system prompt, tool definitions and retrieved context are built by your code. That code is deterministic, so snapshot its output. When a pull request changes one word of a prompt, the diff shows up in review instead of in production. It also protects your prompt cache: the Claude docs say cache hits need "100% identical prompt segments", so a snapshot test is a cheap way to notice that a change moved something volatile into the cached prefix.
- **Parsing and validation.** Feed canned model responses, including malformed ones, a refusal and a truncated reply, to the code that reads them. This is where most production bugs live.
- **Routing and fallbacks.** With the client mocked, check that a 429, a 529 and a `stop_reason` of `refusal` each take the path you designed.

Snapshot the prompt, not the answer. On Claude Haiku 5.5 you cannot even try to pin the answer: the migration guide says to omit `temperature`, `top_p` and `top_k`, that `temperature` must be 1 if sent, and that other values return a 400. A snapshot of model output will flake, and a flaky test teaches a team to ignore red.

## How big should the eval set be, and what should it check?

Anthropic's guide on building evals gives the rules I would start with. Success criteria should be specific and measurable, with a metric, a test set and a threshold; its own example is an F1 score of at least 0.85 on a held-out set of 10,000 posts. Design evals that mirror the real task distribution and include edge cases (irrelevant input, overly long input, ambiguous cases). Automate the grading where you can: the guide prefers more questions graded automatically, even with slightly lower signal, over fewer hand-graded ones. When a model grades another model's output, the guide's advice is to use a different model for grading than the one that generated.

For a classifier, grading is exact match, which costs nothing beyond the call itself. For free-text answers you need rubric grading by a second model, which at least doubles your calls. Start with the feature that can be exact-matched.

I would keep two sets. A smoke set of 30 to 50 cases, picked to cover each label and each known failure, runs on pull requests that touch prompts. A full set of a few hundred, which grows every time production teaches you something, runs nightly.

## What does an eval cost?

Less than the debate about it. Take 200 classification cases, each about 600 input tokens (system prompt plus input) and 20 output tokens, from the pricing page's rates:

| Model | Rate (input / output per MTok) | 200 cases |
|---|---|---|
| Claude Haiku 5.5 (prompts up to 100k tokens) | $0.10 / $0.50 | 200 x (600 x $0.10 + 20 x $0.50) / 1,000,000 = $0.014 |
| Claude Sonnet 5.5 | $2 / $10 | 200 x (600 x $2 + 20 x $10) / 1,000,000 = $0.28 |
| Haiku 5.5 through the Batches API | $0.05 / $0.25 | $0.007 |

The Batches API charges "50% of the standard API prices", most batches finish "within 1 hour", and a batch expires if it has not completed in 24 hours. Each request carries a `custom_id` of 1 to 64 characters so you can match results to cases. That makes it a good fit for the nightly run, which nobody is waiting for, and a bad fit for the pull request gate.

Two cautions on those numbers. The migration guide says Haiku 5.5's tokenizer produces roughly 30% more tokens than Haiku 4.5 for the same text, so recount your prompts before you trust an old estimate. And the cost that hurts is rarely the happy path. It is a retry loop, an agent that keeps going, or an eval set that quietly grew to 20,000 cases. Cap all three: `max_tokens` on every call, a budget inside the script, and a timeout on the job.

## Hands-on: an eval gate with a budget

The script below runs the cases, grades by exact match, tracks spend from the `usage` block, and fails the build if accuracy is under the threshold or spend is over the budget.

```python
import json
import os
import sys

import anthropic

MODEL = "claude-haiku-5-5"
PRICE_IN, PRICE_OUT = 0.10, 0.50          # USD per MTok, prompts up to 100k tokens
THRESHOLD = float(os.environ.get("EVAL_THRESHOLD", "0.90"))
BUDGET_USD = float(os.environ.get("EVAL_BUDGET_USD", "0.25"))

SYSTEM = open("prompts/classify.txt").read()
cases = [json.loads(line) for line in open(sys.argv[1])]
client = anthropic.Anthropic()

correct, spent, misses = 0, 0.0, []
for case in cases:
    r = client.messages.create(
        model=MODEL,
        max_tokens=20,
        thinking={"type": "disabled"},    # Haiku 5.5 accepts this; otherwise thinking tokens eat max_tokens
        system=SYSTEM,
        messages=[{"role": "user", "content": case["input"]}],
    )
    spent += (r.usage.input_tokens + r.usage.cache_creation_input_tokens) * PRICE_IN / 1e6
    spent += r.usage.cache_read_input_tokens * (PRICE_IN * 0.1) / 1e6
    spent += r.usage.output_tokens * PRICE_OUT / 1e6
    if spent > BUDGET_USD:
        sys.exit(f"budget exceeded after {case['id']}: ${spent:.3f}")
    text = next(b.text for b in r.content if b.type == "text")
    if text.strip().lower() == case["label"].lower():     # exact match, as in the docs' example
        correct += 1
    else:
        misses.append((case["id"], case["label"], text.strip()))

accuracy = correct / len(cases)
print(f"accuracy {accuracy:.3f} on {len(cases)} cases, spent ${spent:.4f}")
for m in misses[:10]:
    print("miss", m)
sys.exit(0 if accuracy >= THRESHOLD else 1)
```

Check the docs for the cache read multiplier on your model before you reuse that line; it is 0.1x for Haiku 5.5 on the pricing page I read. And keep a `baseline.json` in the repo: gate on the absolute threshold and on "no worse than the baseline minus a margin", so a quietly sliding score fails too.

The prompt snapshot test is ten lines of pytest, with no plugin:

```python
import pathlib

from app.prompts import build_prompt

def test_prompt_is_stable():
    built = build_prompt(tenant="acme", source_version="v1", question="reset my password")
    expected = pathlib.Path("tests/snapshots/prompt.txt").read_text()
    assert built == expected, "prompt changed: review the diff, then update the snapshot on purpose"
```

## Hands-on: the GitHub Actions workflow

The details that matter come from the GitHub docs. Scheduled workflows run on the default branch and the shortest interval is five minutes. Under load, scheduled runs "can be delayed", and the start of each hour is the busiest time, so I pick a minute that is not :00. Workflows triggered from a fork do not get your secrets, apart from `GITHUB_TOKEN`, so the paid eval cannot run for fork pull requests; skip it instead of failing. Secrets cannot be referenced in an `if:` conditional, so gate on the repository, not the secret. `concurrency` with `cancel-in-progress` stops a stack of pushes from paying for stale runs, and `timeout-minutes` caps a stuck job.

```yaml
name: llm-checks
on:
  pull_request:
    paths: ["prompts/**", "src/llm/**", "evals/**"]
  schedule:
    - cron: "17 2 * * *"        # nightly, UTC, off the top of the hour
  workflow_dispatch:

concurrency:
  group: llm-checks-${{ github.ref }}
  cancel-in-progress: true

jobs:
  unit:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4        # pin to the current major versions
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt && pytest tests/unit

  eval-smoke:
    needs: unit
    if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      EVAL_BUDGET_USD: "0.10"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt && python evals/run_eval.py evals/smoke.jsonl

  eval-nightly:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    timeout-minutes: 60
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      EVAL_BUDGET_USD: "2.00"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt && python evals/run_eval.py evals/full.jsonl
```

The nightly job here calls the model directly for simplicity; switch it to the Batches API when the full set is big enough that the 50% discount is worth a poll loop.

When the gate goes red, resist the urge to lower the threshold. Read the misses first. A cluster of misses on one label usually points at an ambiguous instruction in the prompt, and a scatter of misses usually points at labels worth a second look. Either way the fix is a change you can review, and the failing cases should stay in the set so the same mistake cannot come back unnoticed.

## Takeaways

- Test the deterministic parts without a model: snapshot the assembled prompt, parse canned responses, mock the failure paths.
- Never snapshot model output. Grade it against labels, with a metric and a threshold.
- Run a 30 to 50 case smoke set on prompt-touching pull requests and the full set nightly. Exact-match first, model-graded later.
- Cap the bill three ways: `max_tokens`, an in-script budget, and `timeout-minutes`. Add `concurrency` so stale runs cancel.
- Fork pull requests get no secrets, so design the paid job to skip them.

The same eval set doubles as your regression suite when a model is retired, and the prompt caching economics post shows why a snapshot test on the prompt prefix pays for itself.
