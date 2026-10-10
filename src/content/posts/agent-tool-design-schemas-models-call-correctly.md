---
title: "Agent tool design: schemas that models call correctly"
description: "Naming, descriptions, parameter types and error returns for agent tools, checked against the Claude and Gemini docs, plus the forced tool-call change on Claude 5.5."
date: 2026-10-10T01:40:00Z
tags: ["tool use", "function calling", "agents", "Claude", "Gemini", "JSON schema"]
pillar: building
sources:
  - title: "Claude docs: tool use overview (pricing, strict tool use, missing parameters)"
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview"
  - title: "Claude docs: how tool use works (the contract and the agentic loop)"
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works"
  - title: "Claude docs: define tools (descriptions, input_examples, tool_choice)"
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools"
  - title: "Claude docs: handle tool calls (tool_result and is_error)"
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls"
  - title: "Claude docs: strict tool use"
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use"
  - title: "Anthropic Engineering: Writing effective tools for agents"
    url: "https://www.anthropic.com/engineering/writing-tools-for-agents"
  - title: "Anthropic Engineering: Building effective agents"
    url: "https://www.anthropic.com/engineering/building-effective-agents"
  - title: "Gemini API docs: function calling"
    url: "https://ai.google.dev/gemini-api/docs/function-calling"
draft: false
---

A tool definition is a prompt that happens to be parsed as JSON. The model never sees your code, only the name, the description, the schema and whatever string you return, so those four things decide whether the call is right. As of 10 October 2026 both the Claude and Gemini docs have firm opinions on all four, and one Claude change will break an agent that relies on forcing a tool call.

## What do the Claude docs say a good tool looks like?

The tool-use contract is simple: you describe the operations, Claude emits a structured request, your code runs it. The model "never executes anything on its own". What you control is the definition: `name` (it must match `^[a-zA-Z0-9_-]{1,128}$`), `description`, `input_schema`, and an optional `input_examples` array.

The define-tools page is unusually blunt about priorities. "Provide extremely detailed descriptions. This is by far the most important factor in tool performance." It asks for what the tool does, when to use it and when not to, what each parameter means, and the caveats, "at least 3–4 sentences for each tool description, more if the tool is complex". Its own bad example is "Gets the stock price for a ticker."

The other guidance on the page:

- Consolidate related operations into fewer tools, with an `action` parameter, instead of one tool per verb.
- Namespace names by service, such as `github_list_prs`, so selection stays unambiguous as the library grows.
- Return only high-signal information, with stable identifiers, not opaque internal references.
- If a parameter asks why the model is calling, ask for a short explanation or evidence. A parameter that asks for step-by-step reasoning "may lead to a `reasoning_extraction` refusal".

Anthropic's engineering post on tools adds measurements and numbers. "More tools don't always lead to better outcomes." Prefix versus suffix naming had non-trivial effects in their evals and varied by model, so test your own scheme. A `response_format` enum with "concise" and "detailed" values let agents choose; in their Slack example concise responses used about a third of the tokens (72 versus 206). Claude Code caps tool responses at 25,000 tokens by default. They prefer `user_id` to `user`, and say errors should be specific and actionable "rather than opaque error codes or tracebacks". Anthropic's Building effective agents post puts it as "Poka-yoke your tools": change the arguments so mistakes are harder to make.

## What does Gemini want?

Gemini's function-calling page uses the Interactions API (`client.interactions.create`). A declaration has `type: "function"`, a `name` ("use underscores or camelCase"), a `description`, and `parameters` with `type`, `properties` and `required`. Each property needs a type and a description, `enum` constrains values, and the best-practices list says to use specific types (integer, string, enum), to "keep active set to 10-20 tools maximum", and to validate function calls before executing them. It also says Gemini 3 series models use internal thinking that improves function calling.

The calling modes are `auto` (default), `any` (always predict a call), `none`, and `validated` ("model ensures function schema adherence"), with `allowed_tools` to restrict which functions can be called. The page documents parallel calls for independent functions and compositional calls where one result feeds the next.

## What changed for forced tool calls on Claude?

This is the surprise in the docs. On Claude Opus 5.5, Sonnet 5.5, Fable 5.1 and Mythos 5.1, `tool_choice: {"type": "any"}` and `{"type": "tool", "name": ...}` return a 400 error. The docs' advice is to use `auto` with strict tool use, or structured outputs if you want a fixed JSON response. Older habits, such as forcing a single "extract" tool to get JSON, need a rewrite. Gemini's `any` mode has no such restriction on the page I read.

Strict tool use is the replacement guarantee. With `strict: true`, the docs say the tool `input` strictly follows the `input_schema` and the tool name is always valid. Without it, Claude "might return incompatible types (`"2"` instead of `2`) or omit required fields". The docs' strict examples all set `additionalProperties: false`, and strict guarantees shape, not judgement. A perfectly typed refund can still be the wrong refund.

Two costs to budget for. Using tools adds a tool-use system prompt, 286 tokens on Sonnet 5.5 with `auto`. And `input_examples` add roughly 20–50 tokens for simple examples and 100–200 for nested ones. Changing `tool_choice` also invalidates cached message blocks, though tool definitions stay cached, so keep it constant within a conversation.

## What happens when a parameter is missing?

Do not assume the model will ask. The overview says Opus is much more likely to notice a missing required parameter and ask for it, whereas Sonnet "might also infer a reasonable value", and its example is a weather tool called with a guessed city and unit. For a read-only lookup that is fine. For anything that moves money, design so a guess is safe: required fields that cannot be defaulted, enums instead of free text, and an ID format the model cannot plausibly invent.

### How should you design the parameters?

Make the wrong call hard to write. Put the unit in the name (`amount_cents`, not `amount`). Use `enum` for anything with a closed vocabulary, which both vendors' docs support. Use `format: "date"` for dates, which the strict tool use examples do. Prefer identifiers the model can read in the conversation, since Anthropic reports that resolving arbitrary UUIDs to natural-language names improved retrieval precision by reducing hallucinations. And name the field for what it holds, `order_id` over `id`, so two tools never share an ambiguous parameter.

## Hands-on: one tool, two APIs, instructive errors

A refund tool for Claude, with a namespaced name, a description that says when not to use it, constrained types and strict mode:

```python
refund_tool = {
    "name": "billing_issue_refund",
    "description": (
        "Issues a refund against one paid order in the billing system. "
        "Use it only after the customer has asked for a refund and billing_get_order shows the order as paid; "
        "do not use it for cancellations or credit notes. "
        "amount_cents is in the order currency's minor units and must not exceed the amount still refundable. "
        "Returns the refund ID and the remaining refundable amount; it does not email the customer."
    ),
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "order_id": {"type": "string",
                         "description": "Order ID as shown to the customer, e.g. ORD-10482. Not the internal database ID."},
            "amount_cents": {"type": "integer", "description": "Refund amount in minor units, e.g. 1250 for 12.50."},
            "reason": {"type": "string", "enum": ["damaged", "not_received", "duplicate_charge", "other"],
                       "description": "Closest reason code."},
            "note": {"type": "string", "description": "One sentence of supporting evidence for the refund."},
        },
        "required": ["order_id", "amount_cents", "reason"],
        "additionalProperties": False,
    },
}

import json

def run_tool(block):
    """block is a tool_use block; return the tool_result for the next user message."""
    try:
        out = refunds.issue(**block.input)                       # your code
        return {"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(out)}
    except OrderNotFound:
        msg = "No such order. Order IDs look like ORD-10482. Call billing_search_orders with the customer's email first."
    except OverRefund as e:
        msg = f"Refund exceeds the refundable amount. Retry with amount_cents <= {e.remaining}, or ask the customer."
    return {"type": "tool_result", "tool_use_id": block.id, "content": msg, "is_error": True}
```

Both error strings follow the docs' advice to say what went wrong and what to try next. The docs add that for invalid calls Claude will retry 2-3 times with corrections before apologising, so a clear error is a retry budget well spent.

The Gemini declaration for the same tool keeps the same description and drops the Claude-specific fields:

```python
refund_declaration = {
    "type": "function",
    "name": "billing_issue_refund",
    "description": refund_tool["description"],
    "parameters": {k: v for k, v in refund_tool["input_schema"].items() if k != "additionalProperties"},
}

interaction = client.interactions.create(
    model="gemini-3.8-flash",
    input="Refund order ORD-10482, it arrived damaged.",
    tools=[refund_declaration],
)
```

I took the declaration shape and the `interactions.create` call from the function-calling page; check the docs for the exact loop that reads the `function_call` step and returns a `function_result`. Whichever vendor you target, validate the arguments in your own code before the side effect, as the Gemini page itself recommends.

Then evaluate the tools like you evaluate prompts. Anthropic's advice is realistic tasks that may need many calls, verifiers that tolerate valid phrasing differences, a held-out set, and tracking accuracy, tool errors, call counts and token use. If the model picks the wrong tool, edit the description first; Anthropic reports state-of-the-art SWE-bench Verified results with Claude Sonnet 3.5 after refining tool descriptions.

## Takeaways

- Write the description for a new colleague: what it does, when not to use it, what each parameter means, what it does not return.
- Fewer, namespaced tools with constrained parameter types; keep the active set small (Gemini's page says 10-20 at most).
- On Claude 5.5 models, plan for `auto` plus `strict: true`; forced `any` or named tool choice now returns a 400.
- Return short, high-signal results and errors that say what to try next.
- Treat a guessed parameter as normal behaviour, and make guesses safe by design.

The tool definitions sit at the front of every request, so they are also the first thing the [prompt caching post](/blog/prompt-caching-economics-rag-bill-2026) tells you to keep byte-stable.
