---
title: "Google's Antigravity agent preview: what changed in the 09-2026 release"
description: "antigravity-preview-09-2026 replaced the 05-2026 agent on 17 September: renamed tools, line-range edits, token budgets. A migration checklist and a minimal call."
date: 2026-10-10T01:17:00Z
tags: ["Antigravity", "Gemini agents", "Google", "Interactions API", "migration"]
pillar: model-watch
sources:
  - title: "Gemini API changelog (Antigravity entries: 19 May and 17 September 2026)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "Gemini API docs: Antigravity agent (tools, environment, budget, limitations)"
    url: "https://ai.google.dev/gemini-api/docs/antigravity-agent"
  - title: "Gemini API docs: Antigravity preview model page (context, output limit, caching)"
    url: "https://ai.google.dev/gemini-api/docs/models/antigravity-preview-09-2026"
  - title: "Gemini API deprecations (antigravity-preview-05-2026)"
    url: "https://ai.google.dev/gemini-api/docs/deprecations"
  - title: "Gemini API pricing (Antigravity agent billing)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Gemini API docs: managed agents quickstart (streaming, environments)"
    url: "https://ai.google.dev/gemini-api/docs/managed-agents-quickstart"
draft: false
---

As of 10 October 2026, the Antigravity agent in the Gemini API is on its second preview ID. `antigravity-preview-09-2026` arrived on 17 September, the older `antigravity-preview-05-2026` was scheduled to shut down on 5 October, and the two differ in tool names, parameters and how files are edited. If you wired the May version into anything, this is the post to check against. If you did not, it is a compact look at what an agent platform migration involves.

One housekeeping note: the starting URL I had for the docs, `/gemini-api/docs/antigravity`, returns a 404. The current page is `/gemini-api/docs/antigravity-agent`.

## What is the Antigravity agent?

Google's docs call it "a general-purpose managed agent on the Gemini API". One API call provisions a Linux sandbox in which the agent can reason, run code, manage files and browse the web, using the same harness as the Antigravity IDE. You call it through the Interactions API with `agent=` set to the agent ID rather than `model=`.

The changelog dates the first release to 19 May 2026, alongside the public preview of Managed Agents in the Gemini API, with the description that the agent "can autonomously plan, reason, write and execute code, manage files, and browse the web". It is still labelled a preview, and the docs warn "Features and schemas may change."

## What changed on 17 September?

The changelog says the new ID "replaces and deprecates" the old one. The model page lists three headline changes: improved prompt caching, native code search tools and line-range file editing. Specifications from the model page: text and image input, text output, a 1,048,576-token input window with compaction at about 135,000 tokens, and a 65,536-token output limit.

The part that breaks code is the tool surface. The changelog includes a comparison table, which I summarise here rather than reproduce:

| Capability | 05-2026 | 09-2026 |
|---|---|---|
| Create a file | `write_file` | `write_to_file`, with new Overwrite and Description parameters |
| Edit a file | `write_file`, whole-file rewrite | `replace_file_content`, line-range replacement |
| Read a file | `read_file`, byte offsets | `view_file`, line-based parameters |
| List a directory | `list_files` | `list_dir` |
| Search files and code | none; agents used shell commands | `find_by_name` and `grep_search` |
| Shell, web search | `code_execution`, `google_search` | unchanged |

Parameters also move from snake_case to PascalCase. Not everyone is affected. The changelog says that if you run in a remote sandbox (`environment: "remote"`) and only read `output_text` or `model_output` steps, you update the agent string and "nothing else changes". The people who need to do work are those using a local environment or parsing `function_call` steps.

The agent's underlying model is selectable. The docs list `gemini-3.8-flash` as the default, with `gemini-3.6-flash` and `gemini-3.5-flash-lite` as alternatives, set through `agent_config`. For a saved managed agent, the model is locked to what was set at creation.

## Did the old ID actually shut down on 5 October?

Two Google pages say slightly different things, and I could not test the live endpoint. The changelog says `antigravity-preview-05-2026` "shuts down on October 5, 2026". The deprecations page lists 5 October as the "earliest possible shutdown date", with the exact date to be announced in advance. Today is 10 October. My advice is to assume the old ID is gone or going, migrate now, and treat any code still passing the May string as broken until proven otherwise.

## What does it cost?

The pricing page says model inference is "charged at standard Gemini list rates", including the input, output and reasoning tokens an agent loop generates, and that "Environment compute (CPU, memory, sandbox execution) is not billed during the preview period." It lists no separate Antigravity price. The docs say the agent is available on free and paid tiers.

The Antigravity page gives estimates from Google's own runs, by task category. Research and information synthesis is 100k to 500k input tokens and 10k to 40k output, at roughly $0.30 to $1.00. Data processing and analysis is 300k to 3M input and 30k to 150k output, at $0.70 to $3.25. Complex workflows with many tool calls "can accumulate 3–5 million tokens in a single interaction", with costs up to about $5. The docs also say 50 to 70% of input tokens are typically cached.

A quick budget, using only those estimates: 50 research-style runs a day is $15 to $50 a day; if a tenth of them turn out to be the complex kind at $5, the top of the range moves to about $70. These are Google's estimates, not guarantees; log your own usage.

## What are the limits to design around?

The docs list several, and each affects architecture.

- **Unsupported parameters.** `temperature`, `top_p`, `top_k`, `stop_sequences` and `max_output_tokens` return a 400. If a shared wrapper sets them for every model, it will fail here.
- **Unsupported tools.** `file_search`, `computer_use` and `google_maps` are listed as not yet supported.
- **Inputs.** Only text and images; images must be inline base64.
- **Budgets are best-effort.** `max_total_tokens` in `agent_config` stops a run with status `"incomplete"`, and cached tokens do not count towards it.

The incomplete status is a feature. The docs say that when it happens, "the agent's work and context are preserved", and you can continue with a new interaction that references the original interaction ID and environment ID.

## Hands-on: a minimal call and a migration shim

A remote-sandbox call with a budget and a cheaper model. The parameter names come from the docs; the two `agent_config` keys are shown in separate snippets there, so check the docs if the combined form is rejected.

```python
from google import genai

client = genai.Client()
AGENT = "antigravity-preview-09-2026"          # keep this in one config value

interaction = client.interactions.create(
    agent=AGENT,
    input="Read the changelog page and list every breaking change in a table.",
    environment="remote",
    agent_config={
        "type": "antigravity",
        "model": "gemini-3.5-flash-lite",
        "max_total_tokens": 50_000,
    },
)
print(interaction.status, interaction.output_text)

if interaction.status == "incomplete":
    cont = client.interactions.create(
        agent=AGENT,
        input="continue",
        previous_interaction_id=interaction.id,
        environment=interaction.environment_id,
        agent_config={"type": "antigravity", "max_total_tokens": 50_000},
    )
```

If you parse tool-call steps, gate that code on the tool name so old logs and new runs both replay. The mapping below comes from the changelog table; check the docs for the exact per-tool parameter names, since they changed too.

```python
RENAMED = {
    "write_file": "write_to_file",
    "read_file": "view_file",
    "list_files": "list_dir",
}

def canonical_tool(name: str) -> str:
    return RENAMED.get(name, name)
```

Streaming is documented too: pass `stream=True` and iterate the events; the `step.stop` event carries usage.

## What does an agent migration look like in general?

This is a design argument, not a Google quote. Treat the agent ID as a pinned dependency, in config, never scattered through code. Keep a set of golden tasks whose outputs you can compare across IDs. Parse by capability, not by raw tool name. Decide what happens to in-flight work, since sandbox files persist across interactions only inside one environment. And watch the deprecations page: on this platform the gap between a replacement announcement and a shutdown was 18 days.

## Takeaways

- `antigravity-preview-09-2026` replaced the 05-2026 agent on 17 September; the old ID's shutdown was set for 5 October, and the docs differ on whether that date is firm.
- Remote-sandbox users who read only `output_text` change one string; local-tool users and `function_call` parsers must handle renamed tools and PascalCase parameters.
- File edits are now line-range replacements, and code search tools (`find_by_name`, `grep_search`) are built in.
- Costs follow standard Gemini rates, with sandbox compute free during the preview; Google's own estimates run $0.30 to $5 per run by complexity.
- Set `max_total_tokens`, expect `incomplete` runs, and do not pass `temperature` or the other sampling parameters.

For another Gemini release with a dated migration, the next post covers Lyria 3.5 and what it takes to generate full-length songs through the same Interactions API.
