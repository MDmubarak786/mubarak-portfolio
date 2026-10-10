---
title: "Streaming UX for AI answers: what to render before the first token"
description: "What users should see in the first second of an AI answer, how to render half-written Markdown without flicker, and how to cancel cleanly. Includes a React example."
date: 2026-10-10T01:45:00Z
tags: ["streaming", "UX", "React", "Markdown", "Claude API", "server-sent events"]
pillar: building
sources:
  - title: "Claude docs: streaming messages (event flow, deltas, errors, recovery)"
    url: "https://platform.claude.com/docs/en/build-with-claude/streaming"
  - title: "Anthropic TypeScript SDK: message helpers (text events, abort)"
    url: "https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md"
  - title: "Nielsen Norman Group: Response times, the 3 important limits"
    url: "https://www.nngroup.com/articles/response-times-3-important-limits/"
  - title: "Vercel changelog: remend, recovery of broken streaming Markdown"
    url: "https://vercel.com/changelog/new-npm-package-for-automatic-recovery-of-broken-streaming-markdown"
  - title: "Rendering partial Markdown from a token stream (server-sent-events.com, secondary)"
    url: "https://www.server-sent-events.com/frontend-consumption-client-patterns/streaming-ai-responses-in-the-browser/rendering-partial-markdown-from-a-token-stream/"
  - title: "MDN: AbortController"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/AbortController"
draft: false
---

Streaming does not make a model faster. It changes what the user sees while the model works, and that is most of what "fast" means in an AI feature. The decisions that matter are made before the first token arrives and after the last one: what is on screen at 100 ms, how half-finished Markdown renders, and what Stop actually does.

This post covers those three, with a streaming route and a React component at the end. The server side uses Claude's API because its streaming docs are explicit about the event flow; the UI advice applies to any provider.

## What should the user see before the first token?

Nielsen Norman Group's three response-time limits still frame this. At 0.1 second a system feels like it is "reacting instantaneously"; at 1.0 second "the user's flow of thought" stays uninterrupted; at 10 seconds you are at the limit for "keeping the user's attention focused". Past one second, NN/g says to "indicate to the user that the computer is working on the problem", and past ten, to show progress and give users a clear way to interrupt.

Map that onto an AI answer:

- **Under 100 ms:** acknowledge the action. Append the user's message and an empty assistant bubble in the same frame as the click. Disable nothing the user might want, but make Send turn into Stop.
- **100 ms to 1 s:** the bubble should look alive, not blank. A pulsing caret or three-line skeleton is enough. Do not animate for effect; the point is to say "received".
- **Past 1 s:** say what is happening. If your pipeline retrieves documents or calls tools before answering, show those steps as they start ("Searching the policy docs"). A named step reads as progress; a spinner reads as waiting.
- **Past 10 s:** show elapsed work and keep Stop prominent.

The first token is later than you think. On Claude, thinking is part of the stream: the docs describe a `thinking` content block that opens, receives `thinking_delta` events, and closes before the answer's text block begins. With `display: "omitted"` set, "no thinking text is streamed", yet the block still opens and closes. A content block starting with that type is a reliable signal to switch your skeleton to a "Thinking" state, even when there is nothing to show.

## What does the stream actually send?

Each event is named, and the flow is documented: `message_start`, then for each content block a `content_block_start`, one or more `content_block_delta` events and a `content_block_stop`, then one or more `message_delta` events, then `message_stop`. Three rules from the docs shape the UI.

**Unknown events happen.** The docs say new event types may be added and "your code should handle unknown event types gracefully", and that `ping` events can arrive at any point. Ignore what you do not recognise.

**Usage is cumulative.** Token counts in `message_delta` are cumulative, so overwrite your running total, never add to it.

**Tool arguments arrive in bursts.** For `tool_use` blocks the deltas are `input_json_delta` events carrying partial JSON strings, and the docs note that current models emit "one complete key and value property from `input` at a time", so "there may be delays between streaming events while the model is working". Do not render a half-parsed argument. Show the tool step as "preparing" until `content_block_stop`, then render the parsed result.

## How do you render half-written Markdown without flicker?

Plain text streams cleanly. Markdown does not, because the parser must guess what an unfinished construct means. An unclosed code fence swallows everything after it. A partial link shows literal brackets until the closing parenthesis arrives. An unbalanced `**` or backtick flips emphasis across the tail. A table shows raw pipes until its delimiter row lands.

The pattern that has settled, described in Vercel's `remend` changelog and in a secondary write-up on rendering partial Markdown, has four parts:

1. **Repair a copy, never the buffer.** Close the open fence or emphasis on a copy you hand to the renderer. If you edit the buffer, the next delta appends after your repair and the final answer is corrupted.
2. **Use a library for repair.** `remend` is a standalone npm package that closes unfinished Markdown before your normal renderer sees it: `remend("This is **bold text")` returns `"This is **bold text**"`. It handles unclosed fences, half-finished bold and italic, unterminated links and lists.
3. **Split settled blocks from the live tail.** Split at the last blank line, render finished blocks once, re-parse only the trailing block. Otherwise parse cost grows with answer length.
4. **Render once per animation frame.** Accumulate deltas and schedule a single render with `requestAnimationFrame`.

Two cautions. Repair reduces flicker; it does not remove it, because the parser still changes its mind when the closing delimiter arrives. And sanitise every frame: model output is untrusted, and you are about to inject it into the DOM many times a second.

## What should Stop and errors do?

Cancellation has two halves. On the client, `AbortController` "aborts an asynchronous operation before it has completed", including fetches and the consumption of response bodies; the fetch or body read rejects with an `AbortError`, which you should treat as a user action, not a failure. On the server, you must pass the cancellation on, or you keep paying for tokens nobody reads. Anthropic's TypeScript SDK says "If you need to cancel a stream, you can `break` from a `for await` loop or call `stream.abort()`", and `abort()` "will also abort any in-flight network requests".

Errors can also arrive mid-stream. The docs show an `error` event with an `overloaded_error` type inside an otherwise healthy 200 stream. Keep what has rendered, mark the answer as interrupted, and offer Retry. The docs' recovery advice for interrupted streams is to capture the partial response and continue from it, with a caveat that matters for UI: "Tool use and thinking blocks cannot be partially recovered. You can resume streaming from the most recent text block." So a Continue button is reasonable for a text answer and wrong for a half-finished tool call.

## Hands-on: a streaming route and a React component

The route forwards text deltas as a plain-text stream and aborts upstream when the browser disconnects. It uses the SDK's documented `messages.stream`, with its `text`, `error` and `end` events and `abort()`. The API key stays on the server.

```ts
// app/api/chat/route.ts  (any runtime that supports Request/Response streams)
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: Request) {
  const { question } = await req.json();
  const enc = new TextEncoder();

  const body = new ReadableStream({
    start(controller) {
      const stream = client.messages.stream({
        model: "claude-sonnet-5-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: question }],
      });
      stream.on("text", (delta) => controller.enqueue(enc.encode(delta)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
      req.signal.addEventListener("abort", () => stream.abort()); // browser left: stop paying
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
```

The component renders at once, shows a skeleton until text arrives, repairs a copy with `remend`, and batches updates to one per frame. `Markdown` stands for whichever renderer you use, with sanitising turned on.

```tsx
import { useRef, useState } from "react";
import remend from "remend";

type Phase = "idle" | "waiting" | "streaming" | "stopped" | "error";

export function Answer({ Markdown }: { Markdown: React.ComponentType<{ children: string }> }) {
  const [view, setView] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const buffer = useRef("");                 // raw text, never repaired
  const frame = useRef<number | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const last = useRef("");                   // for Retry

  const paint = () => {
    frame.current = null;
    setView(remend(buffer.current));         // repair a copy for display only
  };

  async function ask(question: string) {
    last.current = question;
    buffer.current = ""; setView(""); setPhase("waiting");
    ctrl.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ question }),
        signal: ctrl.current.signal,
      });
      const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer.current += value;
        setPhase("streaming");
        frame.current ??= requestAnimationFrame(paint);   // at most one render per frame
      }
      setView(buffer.current);               // final render from the raw buffer
      setPhase("idle");
    } catch (e) {
      setPhase((e as Error).name === "AbortError" ? "stopped" : "error");
    }
  }

  return (
    <div aria-live="polite">
      {phase === "waiting" && <div className="skeleton" aria-label="Waiting for the answer" />}
      {view && <Markdown>{view}</Markdown>}
      {(phase === "waiting" || phase === "streaming") && (
        <button onClick={() => ctrl.current?.abort()}>Stop</button>
      )}
      {phase === "error" && <button onClick={() => ask(last.current)}>Retry</button>}
    </div>
  );
}
```

This is a sketch of the pattern, not a tested component, and it leaves out the question input. Two details are deliberate. The final render uses the raw buffer, so any repair is gone once the stream ends. And `aria-live="polite"` announces updates without interrupting a screen reader on every token; test it, because very frequent updates can still be noisy.

## Takeaways

- Decide the first 1,000 ms before you write the stream handler: instant acknowledgement, a live-looking bubble, then named steps.
- Treat thinking and tool-call blocks as UI states, not text. Their deltas arrive differently and cannot be partially recovered.
- Repair Markdown on a copy, split settled blocks from the tail, render once per frame, sanitise each frame.
- Make Stop real: abort the fetch in the browser and the upstream request on the server.
- Plan for an `error` event inside a successful stream, and for event types you have not seen before.

Next up: [latency budgets for AI features](/blog/latency-budgets-for-ai-features), which puts numbers around where the milliseconds go before any of this renders.
