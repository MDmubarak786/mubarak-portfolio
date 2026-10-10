---
title: "Prompt caching for coding agents: why stable context cuts Claude Code bills"
description: "How Claude Code's prefix cache works, what breaks it mid-session (model switches, MCP changes, compaction), and the arithmetic of a 100k-token session on Sonnet 5.5."
date: 2026-10-10T02:31:00Z
tags: ["Claude Code", "prompt caching", "coding agents", "Claude Sonnet 5.5", "cost optimisation"]
pillar: building
sources:
  - title: "Claude Code docs: how Claude Code uses prompt caching"
    url: "https://code.claude.com/docs/en/prompt-caching"
  - title: "Claude Code docs: manage costs effectively"
    url: "https://code.claude.com/docs/en/costs"
  - title: "Claude Code docs: how Claude remembers your project (CLAUDE.md, auto memory)"
    url: "https://code.claude.com/docs/en/memory"
  - title: "Claude API docs: prompt caching (multipliers, minimums, TTL)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Thariq Shihipar, Lessons from building Claude Code: prompt caching is everything (30 April 2026)"
    url: "https://claude.dev/blog/lessons-from-building-claude-code-prompt-caching-is-everything/"
draft: false
---

A coding agent re-sends your whole conversation on every turn, so its bill is mostly a question of how much of that history the API can read from cache instead of reprocessing. Claude Code manages the cache for you, which is why it is easy to break without noticing. As of 10 October 2026 this is what the docs say stays cached, what does not, and the arithmetic of a long session. I use Claude Code on this site but have not logged cache hit rates, so everything below comes from the docs, not from my own measurements.

## How does Claude Code use prompt caching?

Each message you send is a new API request. The model remembers nothing between requests, so Claude Code re-sends the full context each time: system prompt, project context, every prior message and tool result, and the new message. The API caches by matching the start of the request, the prefix, against content it recently processed. The match is exact, and the docs say a change anywhere in the prefix recomputes everything after it. There is no per-file caching.

So Claude Code orders each request from least to most volatile:

| Layer | Content | Changes when |
|---|---|---|
| System prompt | Core instructions, tool definitions | The set of loaded tool definitions changes |
| Project context | CLAUDE.md, auto memory, unscoped rules | Session start, `/clear` or `/compact` |
| Conversation | Messages, responses, tool results | Every turn |

A new turn only appends to the conversation layer, so the first two layers and every earlier turn are read from cache. Anthropic's Thariq Shihipar describes the same ordering in his 30 April 2026 write-up, and adds that the team treats a falling cache hit rate as an incident because a few points of miss rate move both cost and latency.

The prices behind this come from the Claude API docs. For Sonnet 5.5, base input is $2.00 per million tokens, a five-minute cache write $2.50, a one-hour write $4.00 and a cache read $0.10, which is 0.05x the base price. The minimum cacheable prompt is 512 tokens, and the default lifetime is five minutes, "refreshed for no additional cost each time the cached content is used". Claude Code picks its own lifetime: one hour on a Claude subscription within plan usage, five minutes on an API key, usage credits or a cloud provider.

## What does a long session cost with and without the cache?

Take Sonnet 5.5 on an API key, with a cached prefix of 100,000 tokens. Single-turn input costs:

| Turn type | Calculation | Cost |
|---|---|---|
| Cache read | 100,000 × $0.10 / 1M | $0.010 |
| No caching at all | 100,000 × $2.00 / 1M | $0.200 |
| Cold turn, five-minute write | 100,000 × $2.50 / 1M | $0.250 |
| Cold turn, one-hour write | 100,000 × $4.00 / 1M | $0.400 |

Now a 50-turn session that holds that prefix. Without caching it is 50 × $0.20 = $10.00. With caching it is one write plus 49 reads: $0.25 + 49 × $0.01 = $0.74, a 93% cut. I held the prefix flat to keep the sum readable. In a real session the history grows each turn and the new tokens are written at the write price, so the true figures are higher, but the shape holds.

The table has a second lesson. A cold turn with caching on costs 25% more than the same turn with caching off, because the write carries a premium. A cache miss is not "no discount". It is a surcharge. Output tokens are extra in both cases and are not cached.

## What breaks the cache mid-session?

The Claude Code docs list the actions that invalidate it. A model switch is the clearest. Each model has its own cache, so `/model` means the next request reads the whole history with no hits. On Sonnet 5.5 at 100,000 tokens, switching to Opus 5.5 means a five-minute write at $5.00 per million, which is $0.50 against $0.01 for a read, fifty times more for that one turn. The docs add that Claude Code asks you to confirm only while the cache is still warm (v2.1.238 and later).

The other invalidators, in the docs' words and order:

- **Effort level.** On most models changing it recomputes everything. On Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1 with an API key or subscription, the cache survives by default.
- **Fast mode.** Turning it on adds a header that is part of the cache key. It costs once per conversation.
- **MCP servers and plugins with MCP servers.** Tool definitions sit in the system layer. With tool search deferring tools, the default on supported models, connecting a server does not disturb the cache. With tools loaded upfront it does.
- **Denying a whole tool.** A bare `Bash` or `WebFetch` deny rule removes the definition when tool search is unavailable.
- **Compaction.** It replaces history with a summary, so it invalidates the conversation layer by design. While the cache is warm the summarising request reads your prefix from cache, so mid-session `/compact` costs "a fraction of what the context size suggests".
- **Many images**, a **Claude Code upgrade**, and **resuming after the cache lifetime** all cause a one-off uncached turn.

These keep the cache: editing files in your repository, because Claude Code appends a `<system-reminder>` instead of rewriting history; changing permission mode or output style; invoking skills and commands, which arrive as messages; `/recap`; `/rewind`, which truncates back to a prefix that is already cached; and spawning a subagent, which builds its own cache and leaves the parent's alone.

## Is CLAUDE.md cached context?

Yes. It sits in the project-context layer, is read once at session start and then read from cache every turn. The docs make one point that surprises people: editing CLAUDE.md mid-session does not invalidate the cache, and it also does not apply. The new content loads on the next `/clear`, `/compact` or restart.

The cost of a long CLAUDE.md is smaller than the folklore suggests. A 2,000-token file read from cache on Sonnet 5.5 costs 2,000 × $0.10 / 1M = $0.0002 a turn, or $0.02 over 100 turns. Do not trim it to save money. Trim it because the docs say to target "under 200 lines" and warn that longer files reduce adherence. Instructions that matter only for some tasks belong in skills, which load on demand rather than at launch.

## Hands-on: check your hit rate and choose a TTL

Start with the number. From Claude Code v2.1.251, `/usage` adds a `Prompt cache (main)` line to the Session block. The docs' example looks like this, trimmed:

```text
Prompt cache (main): 14 requests · 91% of input tokens from cache · 2 misses · warm (1h TTL, last activity 40s ago)
```

From v2.1.260 the line can name the likely cause of the last miss, for example "tool definitions changed". A status line script can read the same figures from the `prompt_cache` object. If misses keep appearing on a quiet session, look at the invalidators above first.

To confirm which lifetime your writes used, run `claude -p "hello" --output-format json` and read `usage.cache_creation`: one-hour writes appear under `ephemeral_1h_input_tokens`, five-minute writes under `ephemeral_5m_input_tokens`.

If you use an API key, the main conversation defaults to five minutes. Since v2.1.242 you can ask for an hour with the `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` environment variable (the `promptCacheTtl` setting does the same; check the settings reference for its exact shape). Whether it pays is arithmetic:

```python
def hourly_write_cost(prefix_tokens, gaps_over_5min, w5=2.50, w1h=4.00):
    """Cache-write cost in USD over one hour on Sonnet 5.5 (prices per million tokens)."""
    five = prefix_tokens * w5 / 1e6 * (1 + gaps_over_5min)   # first write, then one per cold return
    hour = prefix_tokens * w1h / 1e6                          # one write holds all hour
    return five, hour

print(hourly_write_cost(100_000, 1))   # (0.5, 0.4)
```

One break longer than five minutes in the hour is enough for the one-hour lifetime to win on a 100,000-token prefix. With no breaks, it costs 60% more for nothing. On a subscription the dollar figure is only an estimate, because usage counts against plan limits, and `/usage` computes its cost locally at list price.

## Takeaways

- A coding agent re-sends everything each turn. Cost depends on the share of that history read from cache, and a cache read on Sonnet 5.5 costs 5% of base input.
- A miss is a surcharge, not a missing discount: a cold turn at 100,000 tokens costs $0.25 against $0.20 with caching off.
- Pick your model and effort at the start, switch models only at natural breaks, and run `/compact` between tasks rather than mid-task.
- CLAUDE.md is cheap to hold and stable by design. Keep it short for adherence, not for the bill.
- Watch `/usage` for the `Prompt cache (main)` line, and set the TTL deliberately if you sign in with an API key.

The same arithmetic for an API product instead of an agent loop is in [Prompt caching economics: what a RAG bill looks like in 2026](/blog/prompt-caching-economics-rag-bill-2026).
