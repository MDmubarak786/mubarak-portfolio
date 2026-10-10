---
title: "Gemini deep research agents: what replaces the 23 October shutdown"
description: "The December 2025 Deep Research agent shuts down on 23 October 2026. What the two April replacements do, what they cost per task, and a migration checklist."
date: 2026-10-10T01:25:00Z
tags: ["Gemini deep research", "deprecation", "agents", "Interactions API"]
pillar: model-watch
sources:
  - title: "Gemini API release notes (8 October 2026 deprecation entry)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Gemini API docs: Deep Research agent (usage, limits, pricing estimates)"
    url: "https://ai.google.dev/gemini-api/docs/deep-research"
  - title: "Gemini API deprecations (managed agents table, page updated 9 October 2026)"
    url: "https://ai.google.dev/gemini-api/docs/deprecations"
  - title: "Gemini API model page: deep-research-preview-04-2026 (context and output limits)"
    url: "https://ai.google.dev/gemini-api/docs/models/deep-research-preview-04-2026"
  - title: "Google blog, 21 April 2026: Deep Research and Deep Research Max (launch post)"
    url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/next-generation-gemini-deep-research/"
draft: false
---

As of 10 October 2026, one Gemini API agent has 13 days left. The release notes entry dated 8 October says the Deep Research agent `deep-research-pro-preview-12-2025` "will be shut down on October 23, 2026", which is a 15-day notice. If your code names that agent ID, it stops working on that date, and the replacement is not a drop-in on cost or runtime.

Google calls these agents, not models, and the API treats them that way: you pass an `agent` parameter, not a `model`. That distinction is the first thing to get right in a migration.

## What is being shut down, and what replaces it?

The deprecations page lists three Deep Research agents under "Managed agents":

| Agent ID | Released | Shutdown | Replacement |
|---|---|---|---|
| `deep-research-pro-preview-12-2025` | 11 Dec 2025 | 23 Oct 2026 | `deep-research-preview-04-2026` |
| `deep-research-preview-04-2026` | 21 Apr 2026 | none announced | none listed |
| `deep-research-max-preview-04-2026` | 21 Apr 2026 | none announced | none listed |

Source for all three rows: Google's deprecations page, last updated 9 October 2026. The page adds a caveat worth reading: shutdown dates in the table "indicate the earliest possible dates", and Google says it will give exact dates with advance notice. The release notes name both April agents as migration targets: update the `agent` parameter in your `interactions.create` calls to either one.

Google's launch post on 21 April describes the split. Deep Research is the faster option, aimed at interactive, user-facing products where latency matters, and replaces the December preview. Deep Research Max uses extended test-time compute to reason, search and refine repeatedly, and Google positions it for background jobs such as detailed reports overnight. The docs word it the same way: the standard agent is "designed for speed and efficiency" and suited to streaming back to a client UI; Max is built "for maximum comprehensiveness".

## What are these agents actually for?

The docs describe Deep Research as an agent that "autonomously plans, executes, and synthesizes multi-step research tasks" and produces cited reports. They contrast it with a standard model call in one table. Standard models answer in seconds with a generate-then-output loop; Deep Research runs plan, search, read, iterate, output, takes minutes and runs in the background. The docs' suggested uses are market analysis, due diligence, literature reviews and competitive landscaping. Chatbots, extraction and creative writing stay with ordinary models.

Facts that shape how you integrate it, all from the Deep Research docs and model page:

- **Interactions API only.** The agent is "exclusively available using the Interactions API"; `generate_content` does not reach it.
- **Background execution is required.** `background=True`, which in turn requires `store=True`. The create call returns a partial interaction immediately; you poll until `status` is `completed` or `failed`, or stream with both `stream=True` and `background=True`.
- **Time limit.** Maximum research time is 60 minutes; most tasks should finish within 20.
- **Limits.** The model page lists a 1,048,576-token input window and a 65,536-token output limit.
- **What it cannot do yet.** No custom function-calling tools (remote MCP servers are supported) and no structured outputs. If your pipeline wants JSON, you parse the report or add a second step with a model that can do structured output.
- **Default tools.** `google_search`, `url_context` and `code_execution` are on unless you pass `tools`. `mcp_server` and `file_search` are opt-in.
- **Configuration.** `agent_config` takes `type` (required, `"deep-research"`), `thinking_summaries` (default `"none"`), `visualization` (default `"auto"`) and `collaborative_planning` (default `false`). With collaborative planning the agent returns a plan for you to review before it runs.

## What does a task cost?

The docs publish estimates, not prices, based on preview rates and "subject to change". Treat them as such:

| Agent | Typical search queries | Input tokens | Output tokens | Estimated cost per task |
|---|---|---|---|---|
| Deep Research | about 80 | about 250k (50 to 70% cached) | about 60k | $1.00 to $3.00 |
| Deep Research Max | up to about 160 | about 900k (50 to 70% cached) | about 80k | $3.00 to $7.00 |

Billing follows the underlying Gemini models and the tools the agent uses. The December agent's per-task cost is not on the pages I fetched, so I cannot tell you whether the migration makes tasks cheaper or dearer; the launch post says only that the new agent is cheaper and faster than the December one, which is Google's claim.

## What it means for people shipping products

A forced migration at 15 days' notice is the real lesson. Three opinions, all design arguments and not things I have run.

First, pick the agent by where the result is shown. If a user is waiting on a screen, the standard agent with streamed thinking summaries gives them something to watch. If the result lands in an inbox or a dashboard tomorrow, Max's cost range is the thing to budget, and the 60-minute ceiling is not a constraint.

Second, put the agent ID in configuration, not in code. Both April IDs carry `preview` in the name. Google lists no shutdown for them today, but the December ID went from announced to dead in about two weeks, and the page's "earliest possible dates" wording says the notice could be short.

Third, build for failure. The docs warn that streams can drop (they mention a 600-second timeout) and tell you to reconnect using the saved interaction ID and `last_event_id`. A research job that takes 20 minutes needs a stored interaction ID and a retry path, not a request handler that waits.

## Hands-on: migration in one change and one test

The change is one string. This follows the create-and-poll sample in the docs:

```python
import time
from google import genai

client = genai.Client()

AGENT = "deep-research-preview-04-2026"   # was: deep-research-pro-preview-12-2025
# For overnight, comprehensive jobs: "deep-research-max-preview-04-2026"

interaction = client.interactions.create(
    input="Compare the three leading approaches to prompt caching on price and rules.",
    agent=AGENT,
    background=True,
    # store=True is required for background runs; check the docs for whether your
    # SDK version sets it for you.
    # To review the plan first, set collaborative_planning in agent_config:
    # check the docs for the exact placement of agent_config in your SDK.
)

while True:
    interaction = client.interactions.get(interaction.id)
    if interaction.status in ("completed", "failed"):
        break
    time.sleep(10)

if interaction.status == "completed":
    print(interaction.steps[-1].content[0].text)   # the cited report
```

The test is the part people skip. Run five representative questions through both agents before 23 October and compare three things: whether your parser still finds the sections it expects in the report, how long the task takes against your timeout, and what the usage costs against the estimates above. The docs also tell you to prompt for unknowns, for instance asking the agent to say a figure is "projections or unavailable rather than estimating", and to review the `citations` in each response. Put those into the new prompts from day one; a faster agent that cites fewer sources is a regression you want to catch now.

## Takeaways

- `deep-research-pro-preview-12-2025` shuts down on 23 October 2026. Migrate to `deep-research-preview-04-2026` (interactive) or `deep-research-max-preview-04-2026` (overnight, most thorough).
- It is an agent on the Interactions API, run in the background with `store=True`, up to 60 minutes. Plan for polling and reconnection, not a blocking call.
- No custom function tools and no structured output yet; remote MCP servers and file search are the supported ways to bring your own data.
- Costs are published as estimates: $1 to $3 per task and $3 to $7 for Max. Measure your own before committing a budget.
- Keep agent IDs in config. A 15-day deprecation notice on a preview agent is a precedent, not an exception.

Next, the [Q4 2026 model deprecation calendar](/blog/model-deprecation-calendar-q4-2026) puts this date next to every other shutdown from Anthropic, Google and OpenAI.
