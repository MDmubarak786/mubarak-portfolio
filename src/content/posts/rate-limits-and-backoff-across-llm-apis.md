---
title: "Rate limits and backoff across LLM APIs: one shared client"
description: "How Claude, Gemini and OpenAI document rate limits, 429s and retry signals, and a shared TypeScript client with jittered backoff that knows which errors never to retry."
date: 2026-10-10T02:05:00Z
tags: ["rate limits", "backoff", "TypeScript", "Claude API", "Gemini API", "OpenAI API"]
pillar: building
sources:
  - title: "Claude docs: rate limits (tiers, token bucket, headers, spend caps)"
    url: "https://platform.claude.com/docs/en/api/rate-limits"
  - title: "Claude docs: API errors (status codes, SDK retries, request IDs)"
    url: "https://platform.claude.com/docs/en/api/errors"
  - title: "Gemini API docs: rate limits (RPM, TPM, RPD, tiers)"
    url: "https://ai.google.dev/gemini-api/docs/rate-limits"
  - title: "Gemini API docs: troubleshooting (429 and 503 retry guidance)"
    url: "https://ai.google.dev/gemini-api/docs/troubleshooting"
  - title: "OpenAI docs: rate limits (headers, Retry-After, backoff guidance)"
    url: "https://developers.openai.com/api/docs/guides/rate-limits"
draft: false
---

If your product talks to more than one model provider, you have three definitions of "too fast", three sets of signals, and, if you are not careful, three hand-rolled retry loops that disagree. The vendors document more than most people read, and the three pages agree on a surprising amount. This post lays out what each documents, then builds one small client that follows all of it.

## What do the three vendors actually document?

I read the rate limit pages for Anthropic, Google and OpenAI, plus the error and troubleshooting pages. Gemini's and OpenAI's numbers vary by model and account, so I only quote structure there; Claude's page lists numbers, so I quote a few.

| | Claude | Gemini | OpenAI |
|---|---|---|---|
| Unit | RPM, ITPM, OTPM per model class | RPM, TPM, RPD | RPM, RPD, TPM, TPD |
| Scope | Organisation (optional per-workspace limits) | "per project, not per API key" | Organisation and project |
| Retry signal | `retry-after` header on 429 | None documented: "Wait and retry after a short period" | `Retry-After` "when present" |
| Usage headers | `anthropic-ratelimit-*` (requests, tokens, input, output: limit, remaining, reset) | None documented | `x-ratelimit-*` (requests and tokens: limit, remaining, reset) |
| Transient status codes | 429, 500, 504, 529 | 429 `RESOURCE_EXHAUSTED`, 503 `UNAVAILABLE` | 429 |
| SDK retry default | 2 retries | Python SDK: up to 4 retries | Check the SDK docs |

The Claude page adds details that change how you build a client. Limits use a token bucket, so "your capacity is continuously replenished up to your maximum limit, rather than being reset at fixed intervals". For most models only uncached input counts toward ITPM: `cache_read_input_tokens` does not. As an example, the Start tier lists Sonnet 5.5 at 1,000 RPM, 2,000,000 ITPM and 400,000 OTPM; the Build tier lists 5,000 RPM, 5,000,000 ITPM and 1,000,000 OTPM. A sharp ramp in traffic can trigger a separate acceleration limit, so Anthropic's advice is to "ramp up your traffic gradually". The `anthropic-ratelimit-tokens-remaining` style headers are rounded to the nearest thousand, so treat them as a gauge, not a ledger.

Gemini's page says daily quotas reset at "midnight Pacific time" and lists spend-based limits over a rolling 10-minute window by tier. The per-model numbers are not on the page; it sends you to AI Studio. The troubleshooting page is the one with retry advice: for 429 and 503, retry with exponential backoff and jitter, wait about a second before the first retry, and cap the number of retries.

OpenAI's page has the most explicit client guidance, and I would adopt it for every provider. Treat `Retry-After` as a minimum wait and add a small random delay. If you use your own HTTP client, follow `Retry-After` when present, otherwise fall back to exponential backoff with jitter. Cap both the attempts and the total retry time. If you manage retries yourself, disable SDK retries or count them, "so nested retries don't multiply requests". Do not retry quota or billing errors, because they need a human. And unsuccessful requests still count toward your per-minute limit, so hammering does not help.

## Which 429s should you never retry?

This is the trap I would design around first, because a naive "retry every 429" loop turns a billing problem into an hour of wasted requests.

Claude has one. When an organisation reaches its monthly spend cap, requests return HTTP 429 with error type `rate_limit_error`, the same type as an ordinary rate limit, but with no `retry-after` header and `error.details.error_code` set to `enforced_spend_limit_reached`. The docs say retrying, "including the SDK's automatic retries, fails until access resumes". Tier caps are $500 (Start), $1,000 (Build) and $200,000 (Scale) a month on the page I read. A spend limit you set yourself arrives differently: as a 400 `invalid_request_error`. OpenAI tells you not to retry quota or billing errors without naming the code in the summary I fetched, so check the docs for the exact error code before you match on it. For Gemini, the daily request quota is a per-day limit that resets at midnight Pacific; a 429 caused by it will not clear in seconds. That last point is my inference from the reset time on the page, not a sentence in the docs.

## What does a shared client look like?

The classification rules, in order:

1. Statuses 400, 401, 402, 403, 404 and 413 are caller errors. Never retry.
2. A 429 carrying a known fatal code (Claude's `enforced_spend_limit_reached`) is never retried.
3. Statuses 408, 429, 500, 503, 504 and 529 are transient. Retry with full jitter, treat `retry-after` as a floor, stop at an attempt cap or a total time cap.
4. Everything else: surface the error.

The retry layer sits in one place, so turn the SDK retries off if you use SDKs (`max_retries` or `maxRetries` is documented to configure or disable them) and let this client own the policy.

## Hands-on: a shared fetch wrapper in TypeScript

This uses raw `fetch`, so it works for any provider and only relies on headers named in the docs. The `makeRequest` factory builds a fresh `Request` per attempt because a request body can only be read once.

```ts
type Provider = "anthropic" | "openai" | "gemini";

const TRANSIENT = new Set([408, 429, 500, 503, 504, 529]);
const CALLER_ERRORS = new Set([400, 401, 402, 403, 404, 413]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Shared across calls: when a provider says "no input tokens left until T", wait.
const pauseUntil: Record<Provider, number> = { anthropic: 0, openai: 0, gemini: 0 };

function retryAfterMs(res: Response): number {
  const n = Number(res.headers.get("retry-after")); // seconds; HTTP-date form falls through
  return Number.isFinite(n) && n > 0 ? n * 1000 : 0;
}

async function isFatal(provider: Provider, res: Response): Promise<boolean> {
  if (CALLER_ERRORS.has(res.status)) return true;
  if (res.status === 429 && provider === "anthropic") {
    const body = await res.clone().json().catch(() => null);
    return body?.error?.details?.error_code === "enforced_spend_limit_reached";
  }
  // OpenAI: quota and billing errors must not be retried. Check the docs for the code to match.
  return false;
}

export async function callWithBackoff(
  provider: Provider,
  makeRequest: () => Request,
  { maxAttempts = 5, maxElapsedMs = 60_000, baseMs = 1000, capMs = 30_000 } = {},
): Promise<Response> {
  const started = Date.now();
  for (let attempt = 0; ; attempt++) {
    const wait = pauseUntil[provider] - Date.now();
    if (wait > 0) await sleep(wait);

    const res = await fetch(makeRequest());

    // Claude documents an RFC 3339 reset time for input tokens; remaining is rounded to the nearest 1,000.
    if (provider === "anthropic") {
      const remaining = Number(res.headers.get("anthropic-ratelimit-input-tokens-remaining"));
      const reset = Date.parse(res.headers.get("anthropic-ratelimit-input-tokens-reset") ?? "");
      if (remaining === 0 && Number.isFinite(reset)) pauseUntil.anthropic = reset;
    }

    if (res.ok) return res;
    if (await isFatal(provider, res)) return res;
    if (!TRANSIENT.has(res.status)) return res;

    const elapsed = Date.now() - started;
    if (attempt + 1 >= maxAttempts || elapsed >= maxElapsedMs) return res;

    const jitter = Math.random() * Math.min(capMs, baseMs * 2 ** attempt); // full jitter
    await sleep(Math.max(retryAfterMs(res), jitter)); // Retry-After is a floor, not a suggestion
  }
}
```

Usage with Claude looks like this. The endpoint and the `x-api-key` and `anthropic-version` headers are the ones in the docs' own curl example:

```ts
const res = await callWithBackoff("anthropic", () =>
  new Request("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 200,
      messages: [{ role: "user", content: "Classify: refund request" }],
    }),
  }),
);
```

Three things the sketch deliberately leaves out. It has no concurrency limiter: put a semaphore in front of it sized below your RPM, since the token bucket punishes bursts ("60 requests per minute might be enforced as 1 request per second", says the Claude page). It has no cost guard: a retry on an expensive request is a second bill. And it logs nothing, which you should fix before shipping: record the provider, status, attempt number and the `request-id` header the Claude docs ask you to quote to support.

Once it is in production, watch four numbers per provider: the share of calls that needed at least one retry, the retries per call, the p95 latency including waits, and how often the attempt or time cap gave up. A rising retry share is your early warning that you are close to a limit. A rising give-up rate means the caps are too tight or the provider is unhealthy. Both are cheaper to notice on a dashboard than from user complaints.

## Takeaways

- The three vendors converge on the same client rules: honour `Retry-After` as a minimum, add jitter, cap attempts and total time, never retry billing or quota errors.
- Gemini documents no rate limit headers and no `Retry-After`; its guidance is generic backoff with jitter. Do not write code that waits for a header that never comes.
- Claude's spend-cap 429 looks like a rate limit and is not one. Branch on `enforced_spend_limit_reached`.
- On Claude, cache reads do not count toward ITPM for most models, so caching raises your effective throughput as well as cutting the bill.
- One layer owns retries. If SDKs retry too, nested retries multiply your request count.

For how a repeated, retried call behaves once it lands in a Lambda behind EventBridge, see the post on retries and idempotency; for what each request costs once the prefix is cached, see prompt caching economics.
