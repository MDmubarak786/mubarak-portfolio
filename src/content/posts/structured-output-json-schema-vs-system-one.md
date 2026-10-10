---
title: "Structured output without parsing: JSON schema modes vs System One models"
description: "Claude and Gemini schema modes guarantee the shape of a reply; TypeSafe's Jev returns typed answers with probabilities. What each documents, and when to use which."
date: 2026-10-10T01:43:00Z
tags: ["structured output", "JSON schema", "TypeSafe Jev", "Claude", "Gemini", "System One"]
pillar: building
sources:
  - title: "Claude docs: structured outputs"
    url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs"
  - title: "Claude docs: strict tool use"
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use"
  - title: "Gemini API docs: structured output"
    url: "https://ai.google.dev/gemini-api/docs/structured-output"
  - title: "TypeSafe AI docs: introduction (System One, Jev, typed questions)"
    url: "https://docs.typesafe.ai/introduction"
  - title: "TypeSafe AI docs: System One concept (calibration, input limits)"
    url: "https://docs.typesafe.ai/concepts/system-one"
  - title: "TypeSafe AI docs: quick start (Python SDK, response shape)"
    url: "https://docs.typesafe.ai/introduction/quickstart"
  - title: "TypeSafe AI docs: confidence for System One answers"
    url: "https://docs.typesafe.ai/confidence"
draft: false
---

There are now three documented ways to get a value out of a model without writing a regex: schema-constrained generation on Claude, the same idea on Gemini, and TypeSafe's System One models, which never write prose at all. As of 10 October 2026 they solve different problems, and the difference is easy to miss. A schema guarantees the shape of the answer. It says nothing about how sure the model is, and that is the part that decides whether you act on it.

## How does structured output work on Claude?

You send a JSON Schema in `output_config.format` with `type: "json_schema"`, and Claude's reply is valid JSON in the text block. The docs call the mechanism "constrained decoding" and list the results as "Always valid", "Type safe" and "Reliable", so no retries for schema violations. The older `output_format` parameter is deprecated and returns a 400 without a beta header. It is generally available on Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5 and several earlier models.

Strict tool use is the sibling feature. The docs split them neatly: "JSON outputs control Claude's response format (what Claude says). Strict tool use validates tool parameters (how Claude calls your functions)." Use them together or alone.

The supported schema is a subset. Supported: the basic types, `enum`, `const`, `anyOf`, `$ref`, string formats such as `date-time`, `email` and `uuid`, `required`, and `additionalProperties: false`. Not supported, and a 400 if you send them: recursive schemas, `minimum`, `maximum`, `multipleOf`, `minLength`, `maxLength`, array constraints beyond `minItems` of 0 or 1, and any `additionalProperties` other than `false`. Across all strict schemas in one request the limits are 20 strict tools, 24 optional parameters and 16 union-typed parameters.

Five behaviours to plan for:

- **Cold schemas are slower.** "The first time you use a specific schema, there is additional latency while the grammar compiles", and compiled grammars are cached for 24 hours from last use.
- **Enum casing can drift.** Claude may change capitalisation, with no error, so compare enums case-insensitively.
- **A refusal or `max_tokens` breaks the guarantee.** On `stop_reason: "refusal"` or `"max_tokens"`, "the output may not match your schema".
- **It costs input tokens.** Claude receives an extra system prompt describing the format.
- **Changing the format invalidates the prompt cache** for that conversation thread.

## And on Gemini?

The Gemini structured-output page uses the Interactions API. You set `response_format` to a text-type object with `mime_type: "application/json"` and a `schema`, usually from a Pydantic model's JSON schema, then parse `interaction.output_text`. The page I read does not mention `generateContent` parameters, so check the docs if you are on an older integration.

The schema surface is wider than Claude's: `minimum` and `maximum` on numbers, `minItems`, `maxItems` and `prefixItems` on arrays, `anyOf`, recursion with `"$ref": "#"`, and nullable types via type arrays. Streaming returns valid partial JSON strings that you concatenate. Combining structured output with tools is a preview for Gemini 3 series models. The page is more modest about guarantees: "While output is syntactically correct JSON, always validate values in your application", and it tells you to handle outputs that match the schema but are semantically wrong. It also warns that very large or deeply nested schemas may be rejected.

## What is a System One model doing differently?

TypeSafe's Jev is described as "the first System One model": it evaluates typed questions against a state and returns answers without generating text. You do not define an output object. You pick a primitive per question: Choice returns `choice`, `probabilities` and `confidence`, Score returns `score`, `probabilities` and `confidence`, and Noul returns a 0-to-1 value for whether a statement is true. Questions in one call run in parallel and in isolation, and the docs say "Adding questions barely changes the response time", with no latency figure given.

Two limits matter here. Jev accepts text only, per the System One page: "Images, audio, and video are not supported (yet)." And it will not explain itself: "System One models do not write replies, produce code, or generate explanations of their reasoning." The docs and the quick start give no pricing or rate limits, so measure those yourself. I have not run production traffic on Jev; read the rest as design.

## What is the difference between a valid answer and a trustworthy one?

Take `"team": "billing"`. A schema mode guarantees it is one of your allowed strings. Neither vendor's schema feature tells you whether the model nearly said "technical". You can add a `confidence` field to the schema, but that is a number the model wrote, just text in a typed wrapper. Jev's confidence is computed from a probability distribution the model is trained to calibrate, with the docs' own caveat that "Calibration is measured across groups of predictions; it does not guarantee that an individual answer is correct."

That points to a clean rule, which is my opinion, not a vendor's:

| You need | Reach for |
|---|---|
| An object with free-text or extracted fields (names, dates, line items, a summary) | Schema mode on Claude or Gemini |
| A function call with typed arguments | Strict tool use (Claude) or function calling (Gemini) |
| One of N, a level on a scale, or a yes/no, with how sure it is, so code can branch | Jev |
| Input that is an image, audio or video | Schema mode (Jev is text-only for now) |
| A reason shown to a user | Schema mode with a short `explanation` field, or a reasoning model |

The mixed case is common: Jev decides the route, and a schema-mode call extracts the fields on the branch that needs them. Also remember that Claude's docs ask for a short explanation, not reasoning, in a property, since asking for step-by-step reasoning may trigger a `reasoning_extraction` refusal.

## Hands-on: one triage task, three ways

The task: read a support ticket and return a team, a severity and whether the customer wants a human. First, Claude. The SDK helper takes a Pydantic model as `output_format` and returns `parsed_output`; the raw API field it sets is `output_config.format`.

```python
from typing import Literal
from pydantic import BaseModel
import anthropic

class Triage(BaseModel):
    team: Literal["billing", "technical", "other"]
    severity: Literal["cosmetic", "degraded", "blocking"]
    wants_human: bool

client = anthropic.Anthropic()
resp = client.messages.parse(
    model="claude-opus-5-5",              # model ID as in the docs' samples
    max_tokens=1024,
    messages=[{"role": "user", "content": f"Triage this ticket:\n{ticket}"}],
    output_format=Triage,                 # SDK helper kwarg
)
if resp.stop_reason in ("refusal", "max_tokens"):
    triage = None                         # the schema guarantee does not hold here
else:
    triage = resp.parsed_output
```

Gemini, with the same model class and the call shape from the docs page (check the docs for exact parameter names on your SDK version):

```python
from google import genai

gclient = genai.Client()
interaction = gclient.interactions.create(
    model="gemini-3.8-flash",
    input=f"Triage this ticket:\n{ticket}",
    response_format={"type": "text", "mime_type": "application/json",
                     "schema": Triage.model_json_schema()},
)
triage = Triage.model_validate_json(interaction.output_text)   # validate anyway
```

And Jev, where the "schema" is the question set, and confidence comes back with each answer:

```python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

tclient = TypeSafeClient()
r = tclient.system_one(
    state={"ticket": ticket},
    questions={
        "team": Choice(instructions="Which team should handle `ticket`?",
                       criteria={"billing": "Payments, invoices, refunds",
                                 "technical": "Errors, integrations, API access",
                                 "other": "Anything else"}),
        "severity": Score(instructions="How severe is the reported issue?",
                          criteria=["Cosmetic; no impact", "Degraded, workaround exists", "Blocking, no workaround"]),
        "wants_human": Noul(instructions="Is the customer asking for a human agent?"),
    },
)
team = r.answers["team"]
route = "human" if team.confidence < 0.5 else team.choice     # 0.5 floor from the docs' routing pattern
```

The first two give you a validated object. The third gives you values plus the distribution behind them, so the `if` on confidence is a one-liner, not a prompt change. If the same ticket also needs a summary or extracted order numbers, that is where a schema-mode call earns its place.

## Takeaways

- Schema modes guarantee shape: on Claude through constrained decoding (with documented exceptions for refusals and `max_tokens`), on Gemini as valid JSON you should still validate.
- The two vendors' schema subsets differ. Claude rejects numeric bounds, string-length bounds and recursion; the Gemini page lists numeric bounds, array sizes and recursion as supported.
- Cold-start latency, enum casing, token overhead and cache invalidation are the Claude costs to measure.
- Use Jev-style typed questions when the output is a choice, a level or a yes/no and you need to know how sure the model is; it is text-only and will not explain itself.
- Valid is not the same as right. Whatever you pick, route low-confidence cases to a person and measure against labelled examples.

The mechanics of Choice, Score and Noul, with a worked document-intake example, are in [Jev as a programming primitive](/blog/jev-typed-questions-instead-of-prompt-and-parse).
