---
title: "Next.js and AI: server actions, streaming and caching patterns"
description: "Where AI calls belong in Next.js 16.4: Route Handlers for streaming, Server Actions for mutations, Cache Components for data, and what to cache around the model itself."
date: 2026-10-10T02:00:00Z
tags: ["Next.js", "streaming", "AI SDK", "Server Actions", "Cache Components", "Vercel"]
pillar: building
sources:
  - title: "Next.js 16.4 release post (6 October 2026)"
    url: "https://nextjs.org/blog/next-16-4"
  - title: "Next.js docs: Server Actions and Mutations"
    url: "https://nextjs.org/docs/app/guides/server-actions"
  - title: "Next.js docs: Route Handlers"
    url: "https://nextjs.org/docs/app/getting-started/route-handlers"
  - title: "Next.js docs: Caching (Cache Components)"
    url: "https://nextjs.org/docs/app/getting-started/caching"
  - title: "Next.js docs: Streaming"
    url: "https://nextjs.org/docs/app/guides/streaming"
  - title: "AI SDK docs: Next.js App Router getting started"
    url: "https://ai-sdk.dev/docs/getting-started/nextjs-app-router"
  - title: "AI SDK docs: Vercel deployment guide (maxDuration, cancellation)"
    url: "https://ai-sdk.dev/docs/advanced/vercel-deployment-guide"
  - title: "AI SDK docs: caching responses"
    url: "https://ai-sdk.dev/docs/advanced/caching"
draft: false
---

Most AI features in a Next.js app end up in the wrong place, and the cause is usually a single question: is this a mutation or a stream? As of 10 October 2026 the framework's own docs answer it clearly, and the answer changed how I would lay out a chat or generation feature. Streaming goes through a Route Handler, mutations go through Server Actions, and caching belongs on the data and the shell, not on the generation itself.

A caveat first. I am the sole engineer on EF Academy's primary digital presence, built on Next.js and Storyblok, but the 16.4 specifics below are read from the docs and the release post, not reported from that codebase.

## Which Next.js version are we talking about?

Next.js 16.4, published 6 October 2026. The docs pages I read are all marked version 16.4.0, and the 16.4 post says Cache Components "will become the default in Next.js 17" and that all new apps from `create-next-app` now have it enabled. I saw a third-party page claiming Next.js 17 had already shipped; the official blog and docs do not say that, so I treat 17 as upcoming.

Cache Components is the programming model behind everything in this post. You turn it on with two flags, `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`. The `'use cache'` directive then marks the return value of an async function or component as cacheable, which the release post compares to a component-level `Cache-Control` header. The docs recommend pairing every `'use cache'` with `cacheLife`; without one the implicit `default` profile applies.

The AI SDK's introduction page does not state a major version, so I will not either. The code below follows the Next.js getting-started page in the AI SDK docs.

## Route Handler or Server Action for an AI call?

The Server Actions guide settles most of it, because it describes two properties that matter for model calls.

**Actions are dispatched one at a time per client.** "Next.js dispatches Server Actions one at a time per client." If a user fires three actions, the second waits for the first. The guide's advice for parallel work is to do it inside one action, fetch in a Server Component, or "use a Route Handler for non-mutation requests." A slow generation inside an action therefore blocks the user's next action.

**Actions return one response with data and re-rendered UI.** The guide describes a single HTTP request that runs the action, then re-renders the route, with the return value and a new RSC payload in the same response. That is excellent for "save this answer and refresh the list". It is not a streaming token channel.

My rule follows from that:

| The AI feature | Put it in | Why |
|---|---|---|
| Chat reply, long generation, anything token-by-token | Route Handler (`POST`) | Web `Request`/`Response`, streams, does not queue behind user actions |
| Save a conversation, rate an answer, trigger an ingest | Server Action | Mutation, can revalidate and re-render in one trip |
| Retrieval for grounding | Cached async function | Data-level `'use cache'`, shared across users |

Two security points from the same guide apply doubly to AI endpoints. "A Server Action runs as a POST request" and every one should be treated as an untrusted entry point: authenticate, authorise, validate inputs, and shape return values to what the UI renders. Action requests are capped at 1MB by default, configurable through `serverActions.bodySizeLimit`, which matters if you pass long transcripts. Route Handlers are not cached by default, and non-`GET` methods are never cached, so a `POST` chat endpoint stays live without any configuration.

## How do you stream model output?

Use the Route Handler and the AI SDK. This is the shape from the AI SDK's Next.js guide:

```ts
// app/api/chat/route.ts
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal, // forwarded so a stopped stream stops the model call
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

The AI SDK docs show two response helpers on different pages: this one, and `result.toUIMessageStreamResponse()` in the Vercel deployment guide. Check the docs for the one that matches your installed version rather than mixing them. The `abortSignal: req.signal` line comes from that deployment guide, which also says that without `supportsCancellation` set for the route in `vercel.json`, calling `stop()` closes the client stream but does not cancel the function or the model request. You keep paying for tokens nobody is reading.

Three platform facts decide whether streaming actually reaches the user:

- **Timeouts.** The deployment guide says the default maximum duration is 10 seconds on Vercel's Hobby tier, raised to 60 seconds there, and shows `export const maxDuration = 30;` as the route-level setting. Other tiers differ; check Vercel's docs.
- **Buffering.** The Next.js streaming guide warns that "any layer between your server and the client that buffers the response can diminish the benefits of streaming": Nginx-style proxies (it suggests an `X-Accel-Buffering: no` header), CDNs, compression, and on AWS Lambda a response-streaming mode that is not enabled by default.
- **Status codes.** Once streaming starts, the headers are sent. The guide says you cannot change the status code or headers after that, so a mid-stream model failure has to be reported in the stream, not as a 500.

## What should you cache around an AI feature?

Three layers, from safest to riskiest.

**The page shell and the grounding data.** With Cache Components, a page can mix static, cached and request-time content. The docs' pattern is `'use cache'` on the parts everyone sees, `<Suspense>` around anything that reads cookies or headers, and prerendering for the rest. Your chat widget is a client component inside that shell. The grounding material it links to, such as an FAQ or product list, can be a cached component with `cacheLife('hours')`.

One trap the caching guide spells out: the default server cache is an in-memory store per instance, "ephemeral on serverless", and `'use cache: remote'` moves it to a durable handler shared across instances at the price of a network round trip. All these caches are scoped to one deployment; a new deploy starts empty, because the cache key includes the build id. Do not plan on a cached retrieval surviving a release.

**The model response, if and only if the question repeats.** The AI SDK has a caching page. Its recommended approach is language model middleware (`wrapGenerate` for `generateText`, `wrapStream` for `streamText`) with a key-value store; its example uses Upstash Redis and replays cached chunks with `simulateReadableStream`. It also shows a lighter option: an `onEnd` callback that writes the final text to Redis with a one-hour expiry, served back as a text stream, which then needs `TextStreamChatTransport` on the client. Its warning for structured output is worth quoting in spirit: the middleware caches the raw model response before schema validation, so cache only responses that passed your schema.

**The prompt prefix, at the provider.** This is separate from anything Next.js does, and it is usually the bigger saving. I covered the arithmetic in [the prompt caching post](/blog/prompt-caching-economics-rag-bill-2026/).

## Hands-on: a shell, a stream and an action

The page, cached where it can be and dynamic where it must be:

```tsx
// app/page.tsx
import { cacheLife } from 'next/cache'
import Chat from './chat'          // 'use client' component using useChat from @ai-sdk/react

async function Faq() {
  'use cache'
  cacheLife('hours')
  const items = await getFaqItems()   // your own data function
  return <ul>{items.map((i) => <li key={i.id}>{i.question}</li>)}</ul>
}

export default function Page() {
  return (
    <>
      <h1>Help</h1>
      <Faq />
      <Chat />
    </>
  )
}
```

And the mutation, written as the Server Actions guide writes its own examples, with authentication first and nothing trusted from the client:

```ts
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'   // your own modules, as in the docs example
import { db } from '@/lib/db'

export async function rateAnswer(messageId: string, helpful: boolean) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  // Look up by ownership; never accept the row's contents from the client.
  const msg = await db.message.findFirst({ where: { id: messageId, ownerId: session.user.id } })
  if (!msg) return

  await db.message.update({ where: { id: msg.id }, data: { helpful } })
  revalidatePath('/history')
}
```

The streaming endpoint and the rating action never share a code path, which is the point.

## Takeaways

- Stream through a Route Handler; mutate through Server Actions. Actions queue per client and do not stream tokens.
- Treat both as public POST endpoints: authenticate, validate, and shape what you return.
- Cache the shell and the grounding data with `'use cache'` and `cacheLife`; do not expect the in-memory cache to survive serverless instances or a new deploy.
- Cache model responses only for repeating questions, and only after validation; forward `req.signal` so stopped streams stop billing.
- Check the buffering, timeout and status-code constraints of your hosting layer before you blame the framework for a stalled stream.

If you are still choosing the model behind the endpoint, [which AI model to build on in October 2026](/blog/which-ai-model-to-build-on-october-2026/) is the place to start.
