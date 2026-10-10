---
title: "Multilingual AI features: serving 23 languages without 23 prompts"
description: "One prompt with a locale slot, language detection only where needed, per-language token costs and per-language evals. A design for 23 languages, not 23 prompt files."
date: 2026-10-10T01:51:00Z
tags: ["multilingual", "i18n", "LLM", "evaluation", "prompt caching", "language detection"]
pillar: building
related: adr-002-ef-academy-multilingual-platform
sources:
  - title: "Claude docs: multilingual support"
    url: "https://platform.claude.com/docs/en/build-with-claude/multilingual-support"
  - title: "Claude docs: prompt engineering overview"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview"
  - title: "Claude docs: define success criteria and build evaluations"
    url: "https://platform.claude.com/docs/en/test-and-evaluate/develop-tests"
  - title: "Petrov et al.: Language Model Tokenizers Introduce Unfairness Between Languages (arXiv)"
    url: "https://arxiv.org/abs/2305.15425"
  - title: "fastText: language identification (176 languages)"
    url: "https://fasttext.cc/docs/en/language-identification.html"
  - title: "Gemini API docs: home (current model IDs)"
    url: "https://ai.google.dev/gemini-api/docs"
  - title: "Claude docs: pricing"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
draft: false
---

The tempting way to ship an AI feature in 23 languages is 23 prompts, each translated by someone who may not test it. The better way is one prompt, one locale slot, and an evaluation that reports each language separately. I was the sole engineer on a content platform serving 23+ languages from one codebase; the AI half of this post is a design for the same shape, not something I have run in production.

Everything vendor-specific below is from the docs as of 10 October 2026.

## What do the vendors say about multilingual quality?

Anthropic's multilingual page makes two claims worth keeping. Claude "infers the response language from the conversation, but for production applications you should state the target language explicitly", and the most reliable place to do it is the system prompt. And submit text "in its native script rather than transliteration".

It also publishes numbers, and they come with a trap. The table gives zero-shot scores relative to English at 100%, and the models in it are Claude Sonnet 4.5 (marked deprecated) and Claude Haiku 4.5, not the 5.5 generation. The method is MMLU questions translated into 14 languages. On Haiku 4.5, Hindi is at 92.4% of English, Bengali 90.4%, Swahili 78.3% and Yoruba 52.7%; on Sonnet 4.5 the same languages are 96.7%, 95.4%, 91.1% and 79.7%. Two lessons. The spread between languages is large for the smaller model. And the page itself says Claude "is capable in many languages beyond those benchmarked", so test the ones you ship.

Google's docs home lists current model IDs such as `gemini-3.8-flash` and `gemini-3.5-flash-lite`, but it does not state which languages the models support; the language menu on that page localises the documentation, not the model. I could not find a language-quality table for the current Gemini models on the pages I fetched, so for Gemini the honest answer is the same: measure.

## Why not 23 prompts?

Four reasons, in order of how much they cost you.

**Drift.** Twenty-three copies diverge the first time someone fixes a rule in one. A single prompt with a locale slot has one place to fix.

**Eval load.** With 23 prompts you evaluate 23 prompts. With one prompt you evaluate one prompt on 23 data slices, which is the same work you need anyway.

**Cache fragmentation.** Prompt caching keys on the exact prefix. If each language has its own system prompt, each has its own cache entry, and traffic splits 23 ways. Take 10,000 calls a day and a language carrying 1% of traffic: that is 100 calls a day, one every 14.4 minutes on average, and a five-minute cache lapses between most of them. Every miss pays the full price for the prefix. Put the shared instructions and documents in the cached prefix and the language instruction after the breakpoint, and all 23 languages share one warm entry. The mechanics are in the [prompt caching post](/blog/prompt-caching-economics-rag-bill-2026).

**Translation quality you cannot read.** A translated prompt is itself an untested artefact. English instructions with an explicit "respond in X" line are easier to review.

## What does a non-English token cost?

This is the cost most teams skip. Petrov and colleagues measured tokenisation across languages and report that the same text translated into different languages can differ in token count "by up to 15 times in some cases", and that the disparity persists even in tokenizers built for multilingual use. The authors say this raises the cost of commercial language services for some language communities and shrinks how much fits in the context window.

Fifteen times is the extreme, not the typical case, so use it as a stress test. Take a 500-token English question on Sonnet 5.5 at $2 per million input tokens: $0.001 uncached. If a language ran at 3 times the tokens, that is $0.003; at the paper's ceiling of 15 times, 7,500 tokens and $0.015. Output tokens scale the same way at $10 per million. Per-language token multiples are something you can measure on your own text in an afternoon: count tokens for the same 200 support questions in each language, and put the ratio in your cost model. On Haiku 5.5, at $0.10 per million input for prompts up to 100,000 tokens, even the stress case is $0.00075 per question, so the model tier matters more than the language.

## How do you detect the language?

Use the cheapest signal that is reliable, in this order.

1. **The locale you already have.** On a site with language-prefixed URLs or a locale setting, the user's language is known before they type. Pass it as the locale slot and skip detection.
2. **A detector for free text.** fastText's `lid.176` models "can recognize 176 languages"; the compressed `lid.176.ftz` is 917kB and the full `lid.176.bin` is 126MB and, per the page, "faster and slightly more accurate". The models are under a Creative Commons Attribution-Share-Alike 3.0 licence, so read the terms before bundling them.
3. **The model itself, when the answer is ambiguous.** Mixed-language messages and transliterated text (Hindi in Latin script, say) defeat detectors. Decide a policy, such as answering in the UI locale, and test it.

Detection decides the response language only. Keep the policy explicit: UI locale wins, detected language is a hint, and the user's explicit choice overrides both.

## Hands-on: one prompt, one locale slot, per-language evals

The Claude call below keeps a stable cached prefix and appends the language instruction after the breakpoint. The `cache_control` shape is the one from the caching docs; the model ID is the Sonnet 5.5 ID used throughout these posts.

```python
import anthropic
from collections import defaultdict

client = anthropic.Anthropic()
INSTRUCTIONS = open("support-instructions.md").read()   # English, one copy
GROUNDING = open("support-docs.md").read()              # shared documents

LOCALES = {"en": "English", "hi": "Hindi", "ta": "Tamil", "fr": "French"}  # ...23 entries

def answer(question: str, locale: str) -> str:
    r = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=600,
        system=[
            {"type": "text", "text": INSTRUCTIONS},
            {"type": "text", "text": GROUNDING, "cache_control": {"type": "ephemeral"}},
            # after the breakpoint: varies per request, does not invalidate the prefix
            {"type": "text", "text": (
                f"Respond in {LOCALES[locale]}, in its native script. "
                "Keep product names, URLs and code in their original form.")},
        ],
        messages=[{"role": "user", "content": question}],
    )
    return r.content[0].text

def run_evals(cases, grade):
    """cases: [{'locale','question','expected'}]; grade(answer, case) -> bool"""
    by_locale = defaultdict(list)
    for c in cases:
        by_locale[c["locale"]].append(grade(answer(c["question"], c["locale"]), c))
    return {loc: sum(v) / len(v) for loc, v in by_locale.items()}

scores = run_evals(CASES, grade)
failing = {loc: s for loc, s in scores.items() if s < 0.90}   # your threshold, per language
```

Gate the release on the per-language scores, not their average. An average of 94% can hide one language at 70%.

## How do you evaluate each language?

Anthropic's prompt engineering overview starts with a requirement: "a clear definition of the success criteria" and "some ways to empirically test against those criteria". The evaluations page gives the principles: be task-specific ("design evals that mirror your real-world task distribution"), automate grading where possible, and "prioritize volume over quality", meaning more automated questions beat fewer hand-graded ones. For LLM grading it advises using a different model from the one that generated the output.

Applied per language:

- **Build the set from real traffic**, translated by a native speaker, not machine-translated from English. A set translated by the model you are testing flatters it.
- **Grade what is checkable by code**: language of the answer (run the detector on the output), script, presence of required fields, untranslated product names.
- **Use a different model as judge** for fluency and tone, and have a native reader score a small sample to check the judge.
- **Set thresholds per language**, then watch the languages that sit near them. Smaller models showed the widest gaps in the published table, so the cheap tier is where per-language checks matter most.
- **Re-run when the model changes.** The published table is for models that are now deprecated or superseded; yours will be too.

## Takeaways

- State the target language explicitly in the prompt; do not rely on inference.
- One prompt with a locale slot beats 23 prompts: one thing to fix, one thing to cache, one thing to evaluate.
- Token counts differ by language. Measure your own ratio and put it in the cost model.
- Prefer the locale you already know to detection; use a detector like fastText only for free text, and define a policy for mixed-language input.
- Report evals per language and gate on the worst one.

The platform side of this, one codebase serving 23+ languages, is in [case file 02](/#file-adr-002-ef-academy-multilingual-platform).
