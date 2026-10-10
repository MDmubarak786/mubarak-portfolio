---
title: "Function calling across Claude, GPT-6 and Gemini: one tool, three APIs"
description: "One lookup tool defined for Claude, OpenAI and Gemini: where the call comes back, how results go in, what parallel and strict mode look like, and a copyable adapter."
date: 2026-10-10T01:44:00Z
tags: ["function calling", "tool use", "multi-provider", "Claude Sonnet 5.5", "GPT-6", "Gemini 3.8 Flash"]
pillar: building
sources:
  - title: "Claude docs: tool use overview (round trip, pricing overhead, strict mode)"
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview"
  - title: "Claude docs: handle tool calls (tool_result rules, is_error)"
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls"
  - title: "Claude docs: parallel tool use"
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use"
  - title: "OpenAI docs: function calling"
    url: "https://developers.openai.com/api/docs/guides/function-calling"
  - title: "Gemini API docs: function calling (Interactions API)"
    url: "https://ai.google.dev/gemini-api/docs/function-calling"
  - title: "Claude docs: models overview (model IDs)"
    url: "https://platform.claude.com/docs/en/models/overview"
draft: false
---

As of 10 October 2026, all three big APIs let a model ask your code to run a function, and all three describe that function with a JSON schema. That is where the similarity ends. Claude puts the call inside a message, OpenAI puts it in a list of output items, and Gemini puts it in a list of steps. If you support more than one provider, the schema is the easy part; the round trip is where the bugs live.

This post defines one lookup tool for each API, compares the three round trips side by side, and ends with a small adapter you can copy. Every field name below comes from the vendor's own docs page, listed at the bottom.

## What do the three tool definitions look like?

The tool is `get_order_status`: it takes an `order_id` string and returns a status. The schema content is identical everywhere. The wrapper is not.

| | Claude | OpenAI (Responses API) | Gemini (Interactions API) |
|---|---|---|---|
| Wrapper | `name`, `description`, `input_schema` | `type: "function"`, `name`, `description`, `parameters` | `type: "function"`, `name`, `description`, `parameters` |
| Schema key | `input_schema` | `parameters` | `parameters` |
| Strict mode | `strict: true` on the tool | `strict: true`, plus `additionalProperties: false` and every property in `required` | `generation_config.tool_choice: "validated"` |
| Force a call | `tool_choice` of type `any` or `tool` | `tool_choice: "required"` or `{"type": "function", "name": ...}` | `tool_choice: "any"` |
| Turn parallel off | `tool_choice: {"type": "auto", "disable_parallel_tool_use": true}` | `parallel_tool_calls: false` | no equivalent on the docs page |

Two notes on that table. OpenAI's strict mode is the fussiest: the docs say that in strict mode `additionalProperties` must be `false` on each object and all properties must be listed in `required`, with optional fields expressed as a `"null"` type option. Claude's docs recommend `strict: true` to "ensure Claude's tool calls always match your schema exactly". And Gemini now documents function calling through the Interactions API, with the older field names from `generateContent` absent from the page I read, so code copied from a 2025 tutorial may not match.

## Where does the call come back, and how do you answer it?

This is the real difference, and it comes down to where the call lives.

**Claude** keeps everything inside the `user` and `assistant` messages. A response with `stop_reason: "tool_use"` carries one or more `tool_use` blocks, each with an `id`, a `name` and an `input` that is already an object. You reply with a new `user` message containing `tool_result` blocks keyed by `tool_use_id`. The docs state the rule that breaks first-time integrations: "the tool_result blocks must come FIRST in the content array. Any text must come AFTER all tool results." Violating it returns a 400.

**OpenAI** returns items in `response.output`. A call is an item with `type: "function_call"`, a `call_id`, a `name`, and `arguments`, which is a JSON-encoded string you must parse before running the function. You append the original output items to your input list, then append `{"type": "function_call_output", "call_id": ..., "output": ...}` and call the API again.

**Gemini** returns `steps`. A call is a step with `type: "function_call"`, an `id`, a `name` and `arguments`, which in the Python SDK example arrives as a dict. You answer with a `function_result` item containing `name`, `call_id` (the step's `id`) and `result` as a list of content items, and you pass `previous_interaction_id` so the server holds the history, or use `store=false` and resend everything.

That leaves one more difference: in the Claude and OpenAI examples your code holds the conversation, while Gemini's can optionally hold it server-side. That decides how you test, log and replay.

## What changes with parallel calls?

All three can return several calls in one turn. The mechanics differ in small, painful ways.

Claude's docs say the API "doesn't prescribe an execution order": run the calls concurrently or one after another, but "return one `tool_result` for each `tool_use` block, all together in the next user message". If you skip a call, still return a result for it with `is_error: true` and a short explanation. OpenAI says the model can return zero, one or several calls in one turn, so loop over all of `output`. Gemini's page shows the model returning several `function_call` steps for "Turn this place into a party!" with three tools declared. It does not show how to return several results in one request, so check the docs for the exact shape before you rely on it; the `input` field takes a list, which is the obvious place.

Independent read-only lookups are safe to run concurrently. Anything with side effects deserves sequential execution regardless of what the model asked for, and Claude's docs say as much.

## What does it mean for people shipping products?

My view: define each tool once, in your own neutral format, and generate the three wrappers. Do not hand-write three schemas. The moment you tune a description for one provider you have three tools that behave differently under one name, and your evals will show it.

Keep your tool results boring and instructive. Claude's docs recommend error messages that say what went wrong and what to try next, such as "Rate limit exceeded. Retry after 60 seconds." That advice transfers to every provider. I would also treat tool results as untrusted input everywhere: they often carry web pages, emails or API payloads, and Claude's docs warn about indirect prompt injection through exactly that path.

Mind the overhead. Tool definitions are input tokens on every request, and Claude adds a tool-use system prompt on top: the pricing table in the docs lists 286 tokens for Sonnet 5.5 with `auto` or `none`. That is small, but your schemas are not. Twenty verbose tools can cost more than the question. Gemini's docs advise keeping the active set to "10-20 tools maximum", which is a good ceiling for every provider. And because tool definitions sit at the front of the prompt, changing them invalidates caches; the economics are in [the prompt caching post](/blog/prompt-caching-economics-rag-bill-2026).

## Hands-on: one tool, three adapters

The adapter below keeps one registry and two functions per provider: build the request shape, and turn the model's call into a result you can send back. Model IDs are from each vendor's docs (`claude-sonnet-5-5` from the Claude models overview, `gemini-3.8-flash` from the Gemini page, `gpt-6-sol` from OpenAI's pricing page); the response shapes follow the docs pages cited above.

```python
import json

def get_order_status(order_id: str) -> str:
    return json.dumps({"order_id": order_id, "status": "shipped"})  # your lookup here

NEUTRAL = {
    "name": "get_order_status",
    "description": "Look up the shipping status of an order by its ID.",
    "schema": {
        "type": "object",
        "properties": {"order_id": {"type": "string", "description": "e.g. A-10442"}},
        "required": ["order_id"],
        "additionalProperties": False,
    },
}
IMPL = {"get_order_status": get_order_status}

# ---- Claude: calls live in message content blocks ----
import anthropic
claude = anthropic.Anthropic()
claude_tools = [{"name": NEUTRAL["name"], "description": NEUTRAL["description"],
                 "input_schema": NEUTRAL["schema"]}]

def run_claude(question: str) -> str:
    messages = [{"role": "user", "content": question}]
    while True:
        r = claude.messages.create(model="claude-sonnet-5-5", max_tokens=1024,
                                   tools=claude_tools, messages=messages)
        if r.stop_reason != "tool_use":
            return next(b.text for b in r.content if b.type == "text")
        results = [{"type": "tool_result", "tool_use_id": b.id,
                    "content": IMPL[b.name](**b.input)}          # input is already a dict
                   for b in r.content if b.type == "tool_use"]
        messages += [{"role": "assistant", "content": r.content},
                     {"role": "user", "content": results}]       # results first, one message

# ---- OpenAI Responses: calls are output items, arguments is a JSON string ----
from openai import OpenAI
oai = OpenAI()
oai_tools = [{"type": "function", "name": NEUTRAL["name"],
              "description": NEUTRAL["description"],
              "parameters": NEUTRAL["schema"], "strict": True}]

def run_openai(question: str) -> str:
    items = [{"role": "user", "content": question}]
    while True:
        r = oai.responses.create(model="gpt-6-sol", tools=oai_tools, input=items)
        items += r.output
        calls = [i for i in r.output if i.type == "function_call"]
        if not calls:
            return r.output_text
        for c in calls:
            items.append({"type": "function_call_output", "call_id": c.call_id,
                          "output": IMPL[c.name](**json.loads(c.arguments))})  # parse the string

# ---- Gemini Interactions: calls are steps, history can live server-side ----
from google import genai
gem = genai.Client()
gem_tools = [{"type": "function", "name": NEUTRAL["name"],
              "description": NEUTRAL["description"], "parameters": NEUTRAL["schema"]}]

def run_gemini(question: str) -> str:
    it = gem.interactions.create(model="gemini-3.8-flash", input=question, tools=gem_tools)
    while True:
        calls = [s for s in it.steps if s.type == "function_call"]
        if not calls:
            return it.output_text
        results = [{"type": "function_result", "name": s.name, "call_id": s.id,
                    "result": [{"type": "text", "text": IMPL[s.name](**s.arguments)}]}
                   for s in calls]   # check the docs for several results in one input list
        it = gem.interactions.create(model="gemini-3.8-flash", input=results,
                                     tools=gem_tools, previous_interaction_id=it.id)
```

Three details are worth copying. Claude's `input` is a dict, OpenAI's `arguments` is a string you must `json.loads`, and Gemini's `arguments` is a dict. Claude wants results in one user message; OpenAI wants one output item per call; Gemini wants a `function_result` per `call_id`. And all three loops end when the model stops asking for tools, so cap the iterations in real code. I have not run this adapter against live keys, so treat it as a shape to adapt and test, not a library.

## Takeaways

- The schema transfers between providers; the wrapper and the round trip do not. Generate wrappers from one neutral definition.
- In the vendors' examples, Claude and OpenAI history lives in your code; Gemini can hold it server-side through `previous_interaction_id`.
- Answer every call you receive. Claude returns a 400 for missing or misordered `tool_result` blocks; return an error result rather than silence.
- Use each vendor's strictness switch (`strict: true` on Claude and OpenAI, `validated` on Gemini) and still validate arguments in your own code.
- Budget for schema tokens and cap the active tool set at 10 to 20.

Next up: [streaming UX for AI answers](/blog/streaming-ux-for-ai-answers), because a tool loop that takes three round trips needs something on screen while it runs.
