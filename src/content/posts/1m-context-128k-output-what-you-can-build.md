---
title: "1M context and 128k output: what the new Claude limits let you build"
description: "Every current Claude model has a 1M window and 128k output. The costs, the streaming rule for long generations, the 300k batch beta, and a worked bill."
date: 2026-10-10T01:30:00Z
tags: ["context window", "max output", "Claude", "streaming", "cost"]
pillar: building
sources:
  - title: "Claude docs: models overview (context window, max output, pricing per model)"
    url: "https://platform.claude.com/docs/en/about-claude/models/overview"
  - title: "Claude docs: context windows (1M default, overflow behaviour, context rot)"
    url: "https://platform.claude.com/docs/en/build-with-claude/context-windows"
  - title: "Claude docs: pricing (long-context rules, cache reads, batch)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Claude docs: streaming messages (large max_tokens, final message helper)"
    url: "https://platform.claude.com/docs/en/build-with-claude/streaming"
  - title: "Claude docs: batch processing (300k output beta, 24-hour window)"
    url: "https://platform.claude.com/docs/en/build-with-claude/batch-processing"
  - title: "What's new in Claude Haiku 5.5 (1M context, 128k output, tokenizer)"
    url: "https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5"
draft: false
---

A million tokens in, 128,000 tokens out, on every current Claude model. That is the headline from the models overview, and it changes what you can do in a single request: read a whole codebase, write a long report in one pass, generate a batch of documents without stitching. The limits are the easy part; the bill, the timeouts and the failure modes are where products get hurt, so this post is about those.

## What are the limits now?

The context windows page lists Claude Fable 5.1, Mythos 5.1, Opus 5.5, Sonnet 5.5 and Haiku 5.5 (plus several older models) with a 1M-token window, and says "a single request to any of them can generate up to 128k output tokens (`max_tokens`)." The comparison table agrees: 1M context and 128K max output for Fable 5.1, Opus 5.5, Sonnet 5.5 and Haiku 5.5.

Four details matter more than the headline numbers.

**1M is the default.** The docs say "you don't need a beta header", and long-context requests "are billed at standard pricing", with one exception covered below.

**The tokenizer is hungrier.** The docs put 1M tokens at "roughly 555k words or 2.5M Unicode characters on the current tokenizer", which the Opus 4.7 generation introduced. Haiku 5.5 uses it too, so the same text counts as about 30% more tokens than on Haiku 4.5. If you sized a prompt in tokens against an older model, recount it.

**Everything counts toward the window.** System prompt, tools, every message, tool results, images, documents and the output itself, including thinking. With cached prompts, `input_tokens`, `cache_read_input_tokens` and `cache_creation_input_tokens` all count. The docs are blunt that "prompt caching changes what you pay for those tokens, not whether they count."

**Overflow is soft on output, hard on input.** If the input alone exceeds the window, you get a 400 "prompt is too long". But if input plus `max_tokens` exceeds it, the API accepts the request on Claude 4.5 models and newer, and generation can stop with `stop_reason: "model_context_window_exceeded"`. Handle that stop reason, not just `max_tokens`.

Two more limits: a single request can include up to 600 images or PDF pages, and you may hit request size limits before the token limit. On the Message Batches API, Haiku 5.5, Sonnet 5.5 and Opus 5.5 can go further, up to 300k output tokens, with the `output-300k-2026-03-24` beta header.

## What does it cost?

Sonnet 5.5, Opus 5.5 and Fable 5.1 charge the same per-token rate whether the prompt is 9k or 900k tokens. The pricing page says it plainly: "A 900k-token request is billed at the same per-token rate as a 9k-token request." Haiku 5.5 is the exception. It is priced by prompt length: $0.10 per million input tokens and $0.50 output up to 100,000 tokens, then $0.50 input and $2.50 output above that. The rule counts "all of its input tokens, including cache reads and cache writes", and a request over the threshold pays the higher price "even when part of its prompt is a cache hit".

Here is one 900,000-token prompt, input only, from the pricing tables:

| Model | Uncached | Cache read |
|---|---|---|
| Sonnet 5.5 ($2.00 base, $0.10 read) | $1.80 | $0.09 |
| Opus 5.5 ($4.00 base, $0.20 read) | $3.60 | $0.18 |
| Fable 5.1 ($10.00 base, $0.25 read) | $9.00 | $0.225 |
| Haiku 5.5, over 100k ($0.50 base, $0.05 read) | $0.45 | $0.045 |

And one maximum-length answer, 128,000 output tokens:

| Model | Output rate per million | 128k tokens |
|---|---|---|
| Haiku 5.5 (prompt over 100k) | $2.50 | $0.32 |
| Sonnet 5.5 | $10 | $1.28 |
| Opus 5.5 | $20 | $2.56 |

Batch halves both sides. A 300k-token batch generation on Sonnet 5.5 at $5 per million output is $1.50.

Read the first table as a statement about repetition, not about one call. A 900k prompt you send once costs a couple of dollars. A 900k prompt you send two hundred times a day without caching costs about $360 a day on Sonnet 5.5; with a warm cache it is closer to $18, plus the first write at $2.50 per million for the five-minute cache, or $2.25 for 900k tokens. The second figure is why the economics of long context are the economics of caching.

## What does it mean for people shipping products?

Three opinions, none of them from the docs' benchmark tables.

**Long context is a feature of the prompt, not a replacement for curation.** The docs warn that "more context isn't automatically better. As token count grows, accuracy and recall degrade, a phenomenon known as context rot." A repo-wide read is a good fit for questions that cross files, such as "where is this type constructed", "what breaks if I rename this". It is a poor fit when 95% of the tokens are irrelevant to the question. Retrieve first when you can; reach for the full window when you cannot say in advance which files matter.

**128k output is a streaming problem before it is a quality problem.** A long answer takes minutes. At a hypothetical 80 tokens a second, 128,000 tokens is about 27 minutes; divide by your own measured speed. No proxy, serverless function or browser tab wants to hold a non-streaming connection that long. The docs address this: for requests with large `max_tokens` values, "the SDK requires streaming to avoid HTTP timeouts."

**Batch for anything nobody is waiting on.** The batch docs say a single 300k-token generation "can take over an hour to complete", batches expire if not finished within 24 hours, and most finish within an hour. If your output is a report, a dataset or a set of documents, run it as a batch at half price and write the result to storage.

## Hands-on: two guard rails

First, a cost estimator you can run before you send a request. The numbers are the October 2026 prices above; Haiku 5.5's over-100k tier is built in.

```python
PRICES = {  # USD per million tokens: (input, cache_read, output)
    "claude-sonnet-5-5": (2.00, 0.10, 10.00),
    "claude-opus-5-5":   (4.00, 0.20, 20.00),
}
HAIKU_SHORT = (0.10, 0.01, 0.50)    # prompt up to 100,000 tokens
HAIKU_LONG  = (0.50, 0.05, 2.50)    # prompt over 100,000 tokens

def estimate(model, prompt_tokens, output_tokens, cached=False):
    if model == "claude-haiku-5-5":
        inp, read, out = HAIKU_LONG if prompt_tokens > 100_000 else HAIKU_SHORT
    else:
        inp, read, out = PRICES[model]
    rate = read if cached else inp
    return (prompt_tokens * rate + output_tokens * out) / 1_000_000

print(estimate("claude-sonnet-5-5", 900_000, 20_000))               # 2.0
print(estimate("claude-sonnet-5-5", 900_000, 20_000, cached=True))  # 0.29
```

Use the token counting API on the real request to get `prompt_tokens`; do not guess from character counts, because the tokenizer ratio varies with content.

Second, the long-generation call itself, streamed, with both stop reasons handled:

```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    model="claude-sonnet-5-5",
    max_tokens=128000,
    messages=[{"role": "user", "content": "Write the full migration report from the audit below...\n\n" + AUDIT}],
) as stream:
    message = stream.get_final_message()

text = "".join(b.text for b in message.content if b.type == "text")

if message.stop_reason == "max_tokens":
    # Thinking tokens share max_tokens: the report may be cut off. Continue in a new turn.
    ...
elif message.stop_reason == "model_context_window_exceeded":
    # Prompt plus output hit the window. Shrink the prompt; 128k is already the synchronous cap.
    ...
```

`get_final_message()` is the documented way to use streaming internally and still receive a complete `Message`. If the user is watching, stream the text to them instead and save it when the stream ends.

## Takeaways

- Every current Claude model has 1M context and 128k synchronous output; the 300k output cap is Batch API only, behind a beta header.
- Per-token price is flat across the window on Sonnet 5.5, Opus 5.5 and Fable 5.1. Haiku 5.5 steps up at 100,000 prompt tokens, and cache hits do not dodge the step.
- A 900k prompt costs $1.80 on Sonnet 5.5 uncached and $0.09 on a cache read. If you repeat it, caching decides the economics.
- Stream any request with a large `max_tokens`, and handle `max_tokens` and `model_context_window_exceeded` as separate stop reasons.
- Use the full window for questions that cross the corpus; retrieve for questions that do not.

For the caching arithmetic behind the cached column, see the prompt-caching economics post on this blog, which prices a 40,000-token stable prefix across three models.
