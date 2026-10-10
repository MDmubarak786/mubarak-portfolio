---
title: "Prompt versioning and rollback: prompts belong in git now"
description: "OpenAI is retiring prompt objects and Anthropic's Playground keeps no history. Version prompts like code, hash them into logs, and roll back without wrecking your cache."
date: 2026-10-10T01:48:00Z
tags: ["prompts", "versioning", "CI", "rollback", "prompt caching", "Datadog"]
pillar: building
sources:
  - title: "OpenAI docs: prompting (reusable prompt objects deprecated, code-managed prompts)"
    url: "https://developers.openai.com/api/docs/guides/prompting"
  - title: "OpenAI docs: migrate from the prompt object"
    url: "https://developers.openai.com/api/docs/guides/prompting/migrate-from-prompt-object"
  - title: "Claude Help Center: how do I use the playground (Workbench retired)"
    url: "https://support.claude.com/en/articles/8606378-how-do-i-use-the-playground"
  - title: "Claude cookbook: Managed Agents prompt versioning and rollback"
    url: "https://platform.claude.com/cookbook/managed-agents-cma-prompt-versioning-and-rollback"
  - title: "Claude docs: prompt caching (what invalidates the cache, exact matching)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Datadog docs: prompt tracking (LLM Observability)"
    url: "https://docs.datadoghq.com/llm_observability/monitoring/prompt_tracking/"
  - title: "Datadog docs: prompt management registry (from search results)"
    url: "https://docs.datadoghq.com/llm_observability/configure/prompt_management/"
draft: false
---

If your production prompt lives in a vendor dashboard, you now have either a deadline or a gap. As of 10 October 2026, OpenAI is deprecating reusable prompt objects in its API, and Anthropic has retired Workbench for a Playground that stores nothing. OpenAI says outright to manage prompts in code, and Anthropic's retirement of saved prompts points the same way: keep the prompt where your code lives.

This post covers what changed, what a "prompt version" has to include if you want rollback to mean anything, how versioning interacts with prompt caching, and a small setup you can copy: prompts in git, a fingerprint in every log line, a version pin, and a canary split.

## What changed at OpenAI and Anthropic?

**OpenAI.** Its prompting guide says "OpenAI is deprecating reusable prompt objects in the API." Prompt creation is de-emphasised from 3 June 2026, the `v1/prompts` endpoint is scheduled to shut down on 30 November 2026, and the advice for new work is not to create prompt objects at all. The replacement is a code-managed prompt: keep each one in a versioned helper such as `prompts/supportReply.ts`, use typed function parameters instead of template variables, and pass the generated messages to the Responses API as `input` and `instructions`. The guide names the rollback mechanism: git history, PR review, release tags and feature flags. The migration guide adds a caching note: put static content first and dynamic content last.

**Anthropic.** The Help Center says "Workbench is now the playground" and the legacy Workbench "is now retired". The Playground "doesn't store your prompts or conversations on Anthropic's servers", and it has no saved prompt history and no evals. The page asked users to export before 1 September 2026, and says the data will no longer be recoverable after that date, so the deadline has passed as I write. It also says there is "nothing to import into", so an old export is a backup for rebuilding prompts by hand, not something you can load back.

One vendor-side versioning path does exist on Claude: Managed Agents, covered below. Datadog also offers a prompt registry. For everyone else the answer is the repository.

## What counts as a prompt version?

Not the prompt string. A version is everything that changes what the model does or what the cache does:

- The system text and any few-shot examples.
- The tool definitions: names, descriptions and schemas.
- The model ID.
- Thinking and effort settings.
- The template that injects retrieved context.

The prompt-caching docs make the case for including all of it. Their hierarchy is tools, then system, then messages, and "changes at each level invalidate that level and all subsequent levels". Modifying tool definitions "invalidates the entire cache". Changing `output_config.effort` "always invalidates message blocks". Cache hits "require 100% identical prompt segments". So a fingerprint of the rendered request prefix is also a fair proxy for "will this hit the cache": if the fingerprint changed, expect a cold start.

That has a cost consequence. Every promoted version pays one cache write, and traffic spread across two versions during a canary splits your hit rate across two prefixes. It is a small, one-off cost, but it is why you should track hit ratio per version rather than discover it on the invoice. The numbers behind this are in [the prompt caching post](/blog/prompt-caching-economics-rag-bill-2026).

## Where should versions live?

| Option | Version identity | Rollback | Review | Watch out for |
|---|---|---|---|---|
| Git in your repo | commit or tag | revert, redeploy or flip a flag | normal PR review | deploys are coupled to rollbacks unless you add a flag |
| Claude Managed Agents | immutable `version` per `agents.update` | pin an older version in `sessions.create` | none built in | only for agents on that product |
| Datadog prompt registry | named versions, fetched with `LLMObs.get_prompt()` | per its docs, resolves by environment | Datadog permissions | another runtime dependency |

I would default to git. I reviewed 1,300+ pull requests at Incresco, and my view follows from that: a change that can alter every user's answer deserves a diff, a reviewer and a test. A prompt edit pasted into a dashboard has none of those. That is a design argument, not a claim about any vendor.

The Managed Agents option is worth understanding even if you do not use it, because Anthropic's cookbook tutorial shows the rollback pattern clearly. Each `client.beta.agents.update(AGENT_ID, version=..., system=...)` creates a new immutable version. A session pins one with `agent={"type": "agent", "id": AGENT_ID, "version": 1}`; a bare ID takes the latest. The tutorial routes support tickets to four teams, adds a routing rule in version 2, evaluates both versions on 20 labelled tickets (five per team), and finds that billing tickets fall from 4 of 5 correct to 2 of 5. Rollback is then a change of pinned version, not a deploy. The tutorial also notes that `agents.update` has no built-in approval workflow, and it recommends production callers always pin an explicit version and change that number only through reviewed config. That last rule is the whole discipline in one line.

## How do you roll out and roll back safely?

Four rules, in order of how often they save you.

**Pin in production.** Production code names an exact version; "latest" belongs to experiments only.

**Evaluate before promoting.** The cookbook's regression was found by a 20-item labelled set. Yours should be larger, but even twenty items catch a rule that grabs the wrong class. Run the set in CI on every prompt change and fail the build under a threshold.

**Canary by stable bucket.** Hash the user or session ID into a bucket so one user sees one version throughout a session. Send a small percentage to the candidate, compare cost, latency and eval score by version, then widen. Datadog's prompt tracking page describes this comparison: call counts grouped by version, latency, tokens used, and a text diff between two versions.

**Make rollback a config flip.** If rolling back means a code deploy, you will hesitate. Keep the active version in a flag or config that can change without a build, with the change itself logged.

One trap on Claude 5.5 models: the docs say you can append a `{"role": "system"}` message to `messages` to add an instruction without invalidating the system cache. It is useful for a hotfix, but the added instruction is now part of behaviour that is not in your system prompt file. Include it in the fingerprint, or your logs will lie about what ran.

## Hands-on: git prompts, a fingerprint and a split

A minimal layout. Prompts are Python modules, the registry maps names to versions, and a config chooses which version serves which share of traffic.

```python
# prompts/support_reply.py
VERSION = "support-reply@v8"
MODEL = "claude-sonnet-5-5"
SYSTEM = "You are the support assistant for Acme. Answer only from the documents provided."
TOOLS: list[dict] = []        # tool definitions are part of the version

# prompts/registry.py
import hashlib, json, zlib
from prompts import support_reply as v8, support_reply_v7 as v7   # old versions stay importable

REGISTRY = {"support-reply@v7": v7, "support-reply@v8": v8}
ROLLOUT = {"support-reply": {"support-reply@v7": 90, "support-reply@v8": 10}}   # from config or a flag

def fingerprint(mod) -> str:
    """Short hash of everything that changes behaviour or the cache prefix."""
    blob = json.dumps({"m": mod.MODEL, "s": mod.SYSTEM, "t": mod.TOOLS}, sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()[:12]

def choose(name: str, user_id: str):
    bucket = zlib.crc32(f"{name}:{user_id}".encode()) % 100      # stable per user
    total = 0
    for version, share in ROLLOUT[name].items():
        total += share
        if bucket < total:
            return REGISTRY[version]
    return REGISTRY[next(iter(ROLLOUT[name]))]
```

At the call site, log the version and fingerprint on every request, and use the version as a metric tag so [the cost dashboard](/blog/cost-observability-for-llm-apps) can split by it:

```python
mod = choose("support-reply", user_id)
log.info("llm_call", extra={"prompt_version": mod.VERSION, "prompt_fp": fingerprint(mod)})
```

If you use Datadog's LLM Observability with OpenTelemetry, its prompt-tracking page shows how to attach the version to a span:

```python
span.set_attribute("_dd.ml_obs.prompt_tracking", json.dumps({
    "name": "support-reply", "version": "v8",
    "template": SYSTEM, "variables": {},
}))
```

For the Python SDK, the docs page says to use the `prompt` argument or helper but points elsewhere for the syntax, so check the docs for the exact parameter. Its registry route needs the `LLMObs.get_prompt()` call and, per the docs listing, a recent ddtrace.

Finally, the CI gate. Keep a labelled fixture file next to the prompts and fail the pipeline when a candidate scores below the active version on it:

```python
def test_candidate_not_worse_than_active():
    cases = load_cases("evals/support_reply.jsonl")
    assert accuracy(v8, cases) >= accuracy(v7, cases) - 0.01
```

`load_cases` and `accuracy` are yours to write; the point is that the version in the pull request is the version under test. I have not run this exact layout in production, so treat it as a pattern to adapt.

## Takeaways

- Vendor dashboards are no longer a safe home for prompts: OpenAI's prompt objects shut down on 30 November 2026, and Anthropic's Playground keeps no history.
- A version is the system text, tools, model ID, effort or thinking settings and template together. Fingerprint all of it.
- Pin exact versions in production, run a labelled eval on every prompt change, and make rollback a config flip.
- Log the version and fingerprint on every request and tag spend, latency and cache hit ratio by version.
- Expect one cache write per promotion, and a split hit rate during a canary.

The companion piece is [cost observability for LLM apps](/blog/cost-observability-for-llm-apps), which carries the per-version numbers this setup produces.
