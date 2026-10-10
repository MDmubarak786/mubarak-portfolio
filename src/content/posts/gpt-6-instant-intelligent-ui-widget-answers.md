---
title: "GPT-6's Intelligent UI: what widget answers mean for product teams"
description: "ChatGPT answers now arrive as buttons, charts and forms. What OpenAI has said, what it has not, and how to design chat features and Apps SDK widgets around it."
date: 2026-10-10T01:13:00Z
tags: ["GPT-6", "Intelligent UI", "generative UI", "product design", "MCP Apps"]
pillar: model-watch
sources:
  - title: "MacRumors: ChatGPT gets GPT-6 and Intelligent UI (7 October; secondary)"
    url: "https://www.macrumors.com/2026/10/07/chatgpt-intelligent-ui/"
  - title: "TechCrunch: ChatGPT is getting a lot more visual (7 October; secondary)"
    url: "https://techcrunch.com/2026/10/07/chatgpt-is-getting-a-lot-more-visual-with-the-launch-of-a-new-interface/"
  - title: "OpenAI developer forum thread: GPT-6 and Intelligent UI in ChatGPT"
    url: "https://community.openai.com/t/gpt-6-and-intelligent-ui-in-chatgpt/1404139"
  - title: "The Decoder: ChatGPT with GPT-6 swaps text for interactive UI (secondary)"
    url: "https://the-decoder.com/chatgpt-with-gpt-6-ditches-mostly-text-output-for-interactive-ui-with-charts-buttons-and-mini-apps/"
  - title: "Basic Tutorials: GPT-6 for Everyone (secondary; plans, speed claim, API unclear)"
    url: "https://basic-tutorials.com/news/gpt-6-for-everyone-chatgpt-gets-interactive-responses-with-intelligent-ui/"
  - title: "Redreamality: Intelligent UI, four generative UI routes and their risks (secondary analysis)"
    url: "https://redreamality.com/blog/gpt-6-intelligent-ui-generative-ui-survey/"
  - title: "OpenAI Developers: add UI to your MCP server (Apps SDK)"
    url: "https://developers.openai.com/apps-sdk/build/chatgpt-ui"
  - title: "GPT-6 (Wikipedia; secondary)"
    url: "https://en.wikipedia.org/wiki/GPT-6"
draft: false
---

On 7 October ChatGPT started answering with interfaces: charts, tappable buttons, forms, maps and small calculators built on the spot. As of 10 October 2026, this is a ChatGPT feature, and nothing I could read says developers can call it from the API. If your product embeds a chat box, the question is not whether to copy it, it is what your users will now expect from any answer.

OpenAI's own announcement pages returned HTTP 403 to automated fetches while I was writing, so the launch details below come from the press and from a thread on OpenAI's developer forum; the one OpenAI developer page I could fetch is the Apps SDK guide, and I use it for the hands-on section.

## What did OpenAI ship?

Called Intelligent UI, the feature lets ChatGPT answer with what MacRumors quotes OpenAI as calling "fully interactive user interfaces". The samples include a recipe widget that rescales quantities to the guest count, checklists, embedded maps and multiple-choice follow-ups that narrow results. TechCrunch lists interactive, editable charts and task-specific calculators, plus diagrams such as airplane lift and a multi-day hiking map. ChatGPT can also build small tools in the chat, such as a bill splitter, per MacRumors.

How it works, according to OpenAI as relayed by MacRumors: a library of native, streamable components, and a compiler that processes the interface as the model generates it. That is why widgets appear progressively instead of after a long wait. The forum thread says OpenAI trained GPT-6 to pick the format per question, and a simple question can still get a text answer. TechCrunch adds that users can dial back the number of visuals, similar to other personality settings.

Rollout: 7 October for Plus, Pro, Business and Enterprise, and 8 October for Free and Go. The forum thread lists GPT-6 Sol for the first group and GPT-6 Luna for the second. MacRumors says this applies to the Chat tab only; the models in Work and Codex are unchanged. The Decoder notes that Google's Gemini app added a similar feature in May.

The same announcement carries a speed claim: GPT-6 "can begin answering while it continues to think", and the thread says GPT-6 Instant starts answering web-search questions 44% sooner on average than GPT-5.6 Instant, a measure of time to start, not total time. The issue on what is published about GPT-6 explains why I treat the "Instant" name carefully; Wikipedia lists it as a model released alongside this feature, and the press I read names Sol and Luna.

## What has OpenAI not said?

Quite a lot, and it matters for builders.

- **No API.** TechCrunch does not mention developers. Basic Tutorials says it is unclear whether Intelligent UI will reach the API. Nothing I read describes a public renderer or an endpoint that returns components.
- **No format.** Redreamality, an independent analysis, lists as unknown the intermediate format (JSON, a DSL, or constrained JSX), whether the compiler rejects malformed trees, whether components can make requests or open external links, and whether edits flow back to the model.
- **No UI-specific safety numbers.** Redreamality says the system card reports 97.13% (Sol) and 95.80% (Luna) indirect prompt-injection robustness, and that these are general figures, not UI measurements. I could not read the system card itself, the PDF was not extractable, so this is the analyst's reading.
- **No pricing change.** Basic Tutorials says OpenAI did not address extra cost and subscription prices are unchanged.

Redreamality also flags a consistency problem in OpenAI's own samples: a roast-lamb example pairs a calculator set for 5 people and 2.0 kg with a timeline written for about 2.4 kg and six people. That is one analyst's reading of one sample, but it names the right risk. When an answer has several widgets, they can disagree with each other, and text does not make that mistake as visibly.

## What it means for people shipping products

**Expect users to compare.** If your support assistant answers a pricing question with a paragraph while ChatGPT answers with a comparison table and a slider, yours will feel dated. You do not need a compiler. You need the three or four answer shapes your product actually has, as components.

**Choose who writes the UI.** Redreamality's taxonomy is useful here, and the author says the classification of Intelligent UI is inference. The four routes: a component catalogue the model fills in (the host renders prewritten components); model-written code in a sandbox; service-supplied UI such as MCP Apps or the Apps SDK; and developer components where the model decides when to show them. For most product teams, a catalogue is the right default. Brand, accessibility and security review all happen once, on components you wrote.

**Keep truth on the server.** The Apps SDK guide says business data should stay on the server as the source of truth, actions go through tools, and the UI renders the returned snapshot. Prices, permissions and order status belong there, not in model-generated state.

**Text must still work.** The same guide says to keep MCP tools useful without UI, so the model can still finish the workflow in clients that do not render components. Do the same for your own widgets: validate, and fall back to text.

**Every exit is an attack surface.** Buttons, links and form targets can send data out. Apply one check to all of them.

## Hands-on: two ways to build for widget answers

### Inside ChatGPT: an Apps SDK component

The Apps SDK guide describes the pattern. ChatGPT runs each component in an iframe and talks to it through the MCP Apps bridge, JSON-RPC over `postMessage`. A tool links to its component through `_meta.ui.resourceUri`, the guide says "only the render tool should include" it, and the component is served with the MIME type `text/html;profile=mcp-app`. Split the work: a data tool returns `structuredContent` with no template, and a render tool carries the `resourceUri`.

```json
{
  "name": "show_plan_comparison",
  "description": "Render the plan comparison card for two plan ids.",
  "inputSchema": {
    "type": "object",
    "properties": { "planIds": { "type": "array", "items": { "type": "string" } } },
    "required": ["planIds"]
  },
  "_meta": { "ui": { "resourceUri": "ui://widgets/plan-comparison-v1.html" } }
}
```

The URI above is a placeholder; check the docs for the exact URI scheme and the SDK's registration helper. The guide's advice on versioning is concrete: treat the resource URI as a cache key and publish a new one for breaking changes. It also says to declare content-security-policy domains narrowly.

### In your own chat: a catalogue with a text fallback

This is a design sketch of the catalogue route, written by me, not a documented API. The model returns JSON; you validate it against a closed set of components and render text if validation fails.

```ts
import { z } from "zod";

const ALLOWED_HOSTS = new Set(["example.com", "docs.example.com"]);

const Block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), body: z.string().max(1200) }),
  z.object({ type: z.literal("stat"), label: z.string().max(60), value: z.string().max(40) }),
  z.object({
    type: z.literal("choice"),
    question: z.string().max(120),
    options: z.array(z.string().max(40)).min(2).max(6),
  }),
  z.object({
    type: z.literal("link"),
    label: z.string().max(60),
    href: z.string().url().refine((u) => ALLOWED_HOSTS.has(new URL(u).hostname)),
  }),
]);

const Answer = z.object({ blocks: z.array(Block).min(1).max(12) });

export function parseAnswer(raw: string, plainText: string) {
  try {
    const parsed = Answer.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data.blocks;
  } catch {}
  return [{ type: "text" as const, body: plainText }]; // never block the answer
}
```

Version the catalogue like an API. Log how often validation fails and how often a widget was shown where text would have done; those two numbers tell you whether the model is being asked to do too much.

## Takeaways

- Intelligent UI shipped in ChatGPT's Chat tab on 7 and 8 October; the press reports Sol for paid plans and Luna for free ones.
- As far as I could read, there is no API or public renderer for it. The developer route is the Apps SDK and MCP Apps.
- Several details that builders need, including the format and what components may do, are unpublished.
- Choose a route on purpose: for most product teams, a closed catalogue of components you wrote, validated, with text as the fallback.
- Keep prices, permissions and state on the server, and give every link and form target the same check.

For the model names behind this launch and what OpenAI's pricing page does and does not list, see the issue on GPT-6 Astra, Sol, Luna and Instant.
