---
title: "Latency budgets for AI features: where the milliseconds go"
description: "Split an AI feature's latency into time to first token and decode time, then spend a budget on model tier, caching, output length and parallel calls, with a worksheet."
date: 2026-10-10T01:46:00Z
tags: ["latency", "performance", "LLM", "prompt caching", "TypeSafe Jev", "Claude Haiku 5.5"]
pillar: building
sources:
  - title: "Claude docs: reducing latency (TTFT, model choice, output length, streaming)"
    url: "https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency"
  - title: "Claude docs: prompt caching (TTFT, minimums, invalidation)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: models overview (comparative latency, model IDs)"
    url: "https://platform.claude.com/docs/en/models/overview"
  - title: "OpenAI docs: latency optimization (seven principles, rules of thumb)"
    url: "https://developers.openai.com/api/docs/guides/latency-optimization"
  - title: "TypeSafe docs: primitives (questions run in parallel)"
    url: "https://docs.typesafe.ai/primitives"
  - title: "TypeSafe cookbook: parallel questions (13 questions, one call vs thirteen)"
    url: "https://docs.typesafe.ai/cookbooks/parallel_questions"
  - title: "TypeSafe docs: fan-out pattern"
    url: "https://docs.typesafe.ai/patterns/fan-out"
  - title: "Nielsen Norman Group: Response times, the 3 important limits"
    url: "https://www.nngroup.com/articles/response-times-3-important-limits/"
draft: false
---

"The model is slow" is almost never one problem. A response is a sum of parts: time to the first token, then a stream of output tokens, with your own retrieval and network time on either side. Each part has a different lever, and two of the levers people reach for first (a smaller prompt, a faster model) are often not the ones that move the number.

This post splits an AI feature's latency into its parts, shows what the vendors' own docs say each lever is worth, and ends with a budget worksheet and a measurement script. As of 10 October 2026, the figures I quote are the vendors' rules of thumb and TypeSafe's published example; the millisecond numbers in the worksheet are assumptions, labelled as such.

## What are TTFT and total latency?

Claude's latency docs define the two numbers worth tracking. **Time to first token** "measures the time it takes for the model to generate the first token of the response, from when the prompt was sent", and it is "particularly relevant when you're using streaming". Baseline latency is the time to process the prompt and generate the whole response.

They answer different questions. TTFT decides whether the interface feels alive. Total time decides when the user can act on the answer. Nielsen Norman Group's limits give you the targets: about one second keeps "the user's flow of thought" uninterrupted, and ten seconds is the limit for keeping attention. A sensible budget has two lines, a first-content target near one second and a complete-answer target set by the task.

## Where do the milliseconds go?

Roughly, for a streamed answer:

```text
total ≈ network + retrieval + TTFT + (output_tokens / tokens_per_second) + post-processing
```

TTFT itself is mostly the model reading your prompt. The decode term is where answers get long. OpenAI's latency guide puts numbers on the asymmetry: "cutting 50% of your output tokens may cut ~50% of your latency", while "cutting 50% of your prompt may only result in a 1–5% latency improvement". That is a rule of thumb, not a benchmark for your workload, but it matches the formula: output tokens are paid for one at a time; input tokens are processed together.

So the first lever is output length, not prompt size. Ask for the short form. Claude's docs say to ask for sentence or paragraph limits rather than word counts, because "asking for an exact word count or a word count limit is not as effective" given how models count tokens. Use `max_tokens` as a ceiling, not a style tool: it cuts a response off "perhaps mid-sentence or mid-word".

## What does each lever buy you?

| Lever | What it moves | What the docs say |
|---|---|---|
| Model tier | TTFT and decode speed | Claude's overview lists comparative latency as Slower (Fable 5.1), Moderate (Opus 5.5), Fast (Sonnet 5.5), Fastest (Haiku 5.5), noting actual latency "depends on prompt length, output length, and thinking effort" |
| Effort | Thinking time | Haiku 5.5's "main control for speed and cost" is `effort`, with `low` as "the cheapest and fastest level" |
| Output length | Decode time | OpenAI: output tokens dominate (above) |
| Prompt caching | TTFT on long prompts | Claude: "You will generally see improved time-to-first-token for long documents" |
| Streaming | Perceived wait | OpenAI: the most effective option for making users wait less |
| Fewer requests | Round trips | Combine sequential steps into one prompt |
| Parallel requests | Wall-clock time | Split independent steps into parallel calls |
| Skip the model | Everything | Hard-code constrained outputs; use classical code |

Two cautions on that table. Caching only helps on a hit: Claude's docs list what invalidates it (tool definitions, the speed setting, and the thinking or effort settings among them), so a flag that flips per request turns a fast path into a cold one. The economics are in [the prompt caching post](/blog/prompt-caching-economics-rag-bill-2026). And the effort lever trades quality for speed; set it explicitly and test the answers, since the docs say Haiku 5.5's default effort is `medium`.

## Can parallel questions cut the wait?

When a feature needs several judgments before it answers (is this a refund request, how frustrated is the user, is there personal data), the naive build asks them one after another. TypeSafe's Jev is designed for the alternative. Its primitives page says System One models "evaluate every question in a request in parallel", so "adding questions barely changes the response time", and its fan-out pattern describes sending every question you might need in one call and letting your code ignore the ones that turn out irrelevant.

TypeSafe's parallel-questions cookbook measures it on one document: 13 questions over a GDPR article of about 54,000 characters, asked as one call or as 13 separate calls. It reports $0.000497 against $0.006090 (12.2x cheaper) and 0.27 s against 2.71 s (10.0x faster), with the same answers. The primitives page quotes slightly different ratios (11.5x and 9.6x), so I use the cookbook's own figures. The cookbook is candid about two caveats that matter here. The 2.71 s is the summed latency of 13 calls treated as if they ran one after another, so running them concurrently narrows the speed gap, and it is one document on one model. Read it as evidence that batching independent questions saves money and the sequential-call latency, not as a promise of a tenfold speed-up against well-written parallel code.

My design argument: if your pipeline has more than one independent classification step ahead of the answer, collapse them into one fan-out call, and put the answer generation after it. You pay one round trip instead of several.

## Hands-on: a budget worksheet and a measurement script

The worksheet below is for a retrieval-backed support answer. Every number is an assumption for illustration; replace the right-hand column with your own p50 and p95 measurements before you trust any of it.

| Stage | Assumed ms | Lever if it is too big |
|---|---|---|
| Browser to server and back to first byte | 150 | Region, connection reuse |
| Retrieval (vector search plus rerank) | 100 | Run in parallel with classification |
| Intent and safety questions | 0 extra if fanned out in parallel with retrieval | One fan-out call |
| TTFT with a warm cached prefix | 500 | Smaller tier, lower effort, check cache hit rate |
| **First content on screen** | **750** | Target: under 1,000 |
| Decode: 250 tokens at an assumed 80 tokens per second | 3,125 | Shorter answers, faster tier |
| **Complete answer** | **about 3,900** | Target: under 5,000 |

Read the sensitivities, not the totals. Halving the answer to 125 tokens saves about 1.5 s in this table; halving a 40,000-token prompt would move a few percent by OpenAI's rule of thumb. A cache miss adds whatever your prefix costs to process, which you should measure rather than guess.

To measure, stream the call, timestamp the first text delta, and read the usage from the final message. This uses the Python SDK's documented `messages.stream`, `text_stream` and `get_final_message`, and the `effort` setting from Claude's latency page:

```python
import time
import anthropic

client = anthropic.Anthropic()

def timed(question: str, model: str = "claude-haiku-5-5"):
    start = time.perf_counter()
    first = None
    with client.messages.stream(
        model=model,
        max_tokens=1024,
        output_config={"effort": "low"},          # per the Claude latency docs for Haiku 5.5
        messages=[{"role": "user", "content": question}],
    ) as stream:
        for _ in stream.text_stream:
            if first is None:
                first = time.perf_counter()
        final = stream.get_final_message()
    end = time.perf_counter()
    out = final.usage.output_tokens
    decode_s = max(end - (first or end), 1e-9)
    return {
        "ttft_ms": round(((first or end) - start) * 1000),
        "total_ms": round((end - start) * 1000),
        "output_tokens": out,
        "tokens_per_s": round(out / decode_s, 1),
        "cache_read": final.usage.cache_read_input_tokens,
    }

def over_budget(m, first_ms=1000, total_ms=5000):
    return [k for k, limit in (("ttft_ms", first_ms), ("total_ms", total_ms)) if m[k] > limit]
```

I have not run this against live keys; treat it as a starting point. Run it forty or fifty times per route and keep the p50 and p95. Note that `output_tokens` can include thinking tokens, so tokens per second here is a blend; check the API reference for the usage field that breaks out thinking tokens if you need to separate them. Log the same four numbers in production and chart them by deploy, because a prompt change shows up here before it shows up in complaints. The logging side is the subject of [cost observability for LLM apps](/blog/cost-observability-for-llm-apps).

## Takeaways

- Budget two numbers, not one: first content near one second, complete answer set by the task.
- Output tokens are the biggest lever by the vendors' own rules of thumb; trimming the prompt is the smallest.
- Spend model tier and effort deliberately: Haiku 5.5 at low effort is Claude's documented fast path, and it needs an eval to show the answers still hold.
- Collapse independent judgments into one parallel call, and treat any published speed-up ratio as one workload's result.
- Measure TTFT, total time, output tokens and cache reads per request, and alert on percentiles rather than averages.

Next up: logging those usage fields and a cost per request, with dashboards, in [cost observability for LLM apps](/blog/cost-observability-for-llm-apps).
