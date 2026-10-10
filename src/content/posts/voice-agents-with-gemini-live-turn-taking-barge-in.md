---
title: "Voice agents with Gemini Live: turn-taking, barge-in and latency"
description: "How the Gemini Live API handles turns, interruptions and sessions, which latency knobs the docs give you, and a minimal browser client with ephemeral tokens."
date: 2026-10-10T02:13:00Z
tags: ["voice agents", "Gemini Live", "WebRTC", "barge-in", "WebSocket", "ephemeral tokens"]
pillar: building
sources:
  - title: "Gemini API docs: Live API overview (formats, WebSocket protocol, WebRTC partners)"
    url: "https://ai.google.dev/gemini-api/docs/live-api"
  - title: "Gemini API docs: Live API guide (models, VAD, interruptions, turn completion, limits)"
    url: "https://ai.google.dev/gemini-api/docs/live-guide"
  - title: "Gemini API docs: Live API capabilities (JavaScript snippets, VAD fields, thinking)"
    url: "https://ai.google.dev/gemini-api/docs/live-api/capabilities"
  - title: "Gemini API docs: Live API session management (compression, resumption, GoAway)"
    url: "https://ai.google.dev/gemini-api/docs/live-api/session-management"
  - title: "Gemini API docs: ephemeral tokens for the Live API"
    url: "https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens"
  - title: "Gemini API pricing (Gemini 3.8 Live audio input and output)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Google AI on DEV Community: Build real-time voice applications with Gemini 3.8 Live (posted 16 Sept 2026 by Google AI)"
    url: "https://dev.to/googleai/build-real-time-voice-applications-with-gemini-38-live-and-35-transcribe-4nb5"
  - title: "MDN: Using AudioWorklet"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet"
draft: false
---

A voice agent feels fast or broken depending on two moments: how soon it starts talking after you stop, and how cleanly it shuts up when you interrupt. Google's Gemini Live API gives you both as configuration, and as of October 2026 the model behind it is `gemini-3.8-live`. I have not shipped a voice agent, so this is a close read of the docs plus a design argument, not field notes.

One premise first. The calendar tag for this post says WebRTC, but the Live API itself is a "stateful WebSocket connection (WSS)". WebRTC arrives through partner integrations, which Google's overview lists as LiveKit, Pipecat by Daily, Fishjam, Vision Agents by Stream, Voximplant, Agora and the Firebase AI SDK. The browser client below speaks WebSocket through Google's JavaScript SDK.

## What is the Gemini Live API?

It handles continuous streams of audio, images and text. Input audio is raw 16-bit PCM at 16 kHz, little-endian; output audio is 16-bit PCM at 24 kHz. Two models matter. `gemini-3.8-live` is the one the guide recommends "for most low-latency voice agents". `gemini-3.8-live-extended-thinking` adds background reasoning with `thinkingLevel` set to `low`, `medium` or `high`; the plain model must omit `thinkingLevel`. The launch post describes the extended variant as able to keep talking and narrate progress while it reasons, and describes asynchronous function calling that runs tools in the background while audio keeps streaming.

You can connect server-to-server or client-to-server. The overview says client-to-server "generally offers better performance for streaming audio and video", and for production it recommends ephemeral tokens over standard API keys.

Pricing is per minute of audio. The pricing page lists $0.005 a minute for audio input and $0.018 a minute for audio output (the output rate includes thinking tokens). A five-minute call where you stream the mic throughout and the model speaks for two minutes is 5 × $0.005 + 2 × $0.018, about $0.06. I am assuming streamed input is metered for the full duration; check the billing detail before you budget on it.

## How does turn-taking work?

By default, the server decides. Automatic voice activity detection (VAD) is on, configured under `realtimeInputConfig.automaticActivityDetection` with `startOfSpeechSensitivity`, `endOfSpeechSensitivity`, `prefixPaddingMs` and `silenceDurationMs`. `silenceDurationMs` is how long silence must last before the server ends the turn. The guide recommends 500 to 800 ms and says 100 to 200 ms splits utterances. The server default is about 800 ms. `prefixPaddingMs` keeps audio from before detected speech, and 0 may clip the start of words. Do not copy the guide's own example of `silence_duration_ms: 100`; the page itself advises against it.

You have two other modes. With `disabled: true` you send `activityStart` and `activityEnd` yourself, which suits push-to-talk. In hybrid mode you leave server VAD on, detect the end of speech on the client, and send `audioStreamEnd` to finalise the turn immediately instead of waiting out the silence window. That is the lever for shaving latency without cutting people off.

The model's side of the turn ends with `serverContent.turnComplete`. One caveat for the extended-thinking model: `turnComplete: true` does not mean the session is idle while asynchronous reasoning is active. The guide says to check `interaction_status` for `IN_PROGRESS` or `IDLE`.

## What happens when the user interrupts?

Barge-in is on by default. When VAD detects the user talking over the model, the guide says "the ongoing generation is canceled and discarded", and the server sets `serverContent.interrupted`. Your client must then stop playback and clear any queued audio, otherwise the user hears the old answer finish after they spoke.

Three consequences are worth designing for. First, the capabilities page says only content already sent to the client stays in session history. If you buffer two seconds of audio ahead of the playhead, the model's memory of what it said can run ahead of what the user actually heard. Keep the buffer short. Second, pending function calls are discarded and the server reports the cancelled call IDs, so a tool call with side effects needs an idempotency key and a way to find out whether it ran. Third, for `send_client_content`, `turn_complete=true` "unconditionally interrupts generation", so do not use it to inject text mid-answer unless you mean to cut the model off.

## What is the latency budget?

I could find no latency figure in Google's documentation, and the launch post gives none. Third-party write-ups publish numbers from their own benchmarks; I am not repeating them. What the docs do give you is the one component you control most, so the budget is mostly a measurement plan.

| Component | What the docs say | Your move |
|---|---|---|
| Waiting for end of speech | `silenceDurationMs`: 500 to 800 ms recommended, about 800 ms default, above roughly 2,000 ms adds perceived latency | Tune it; use client-side end detection with `audioStreamEnd` |
| Mic chunking | Not specified | Send small chunks; a few tens of milliseconds is my choice, not a doc figure |
| Network path | Client-to-server "generally offers better performance" | Connect from the browser with an ephemeral token, not through your backend |
| Time to first audio | No figure | Measure from end of speech to first audio chunk, per turn |
| Playback start | Not specified | Start playing the first chunk immediately; keep the queue short |

The silence window is the only documented knob big enough to feel. Going from the default of about 800 ms to 500 ms takes roughly 300 ms off every turn, at the price of more false endings in slow, hesitant speech. Run both settings against recordings of your real users before choosing.

## What are the session limits?

Without compression, audio-only sessions are limited to 15 minutes, and audio plus video to 2 minutes. The connection itself lasts roughly 10 minutes, and when it ends the session ends with it. Set `contextWindowCompression: { slidingWindow: {} }` to extend the session. Set `sessionResumption` so the server sends `sessionResumptionUpdate` messages carrying `newHandle`; pass the last handle on a new connection to resume, and note that handles are valid for 2 hours after the last session ends. The server also sends a `GoAway` message with `timeLeft` before the connection closes, which is your cue to reconnect quietly rather than drop the call.

## Hands-on: a minimal browser client

Your backend mints an ephemeral token. Defaults per the docs are `uses: 1`, a 30-minute `expireTime` and a 1-minute `newSessionExpireTime`, and the feature works only with the Live API on `v1beta`. The nesting of the options below is my best reading; check the docs for the exact shape.

```js
// server (Node)
import { GoogleGenAI } from "@google/genai";
const client = new GoogleGenAI({});
export async function mintToken() {
  const token = await client.authTokens.create({ config: {
    uses: 1,
    newSessionExpireTime: new Date(Date.now() + 60_000),
    liveConnectConstraints: { model: "gemini-3.8-live",
      config: { sessionResumption: {}, responseModalities: ["AUDIO"] } },
  }});
  return token.name;   // pass this to the browser as its apiKey
}
```

In the browser, connect with that token, send mic audio, and play what comes back. The capture worklet follows MDN's `AudioWorkletProcessor` and `registerProcessor` pattern; MDN's guide does not show `port.postMessage`, so check MDN for the exact messaging API.

```js
// capture-worklet.js
class Capture extends AudioWorkletProcessor {
  process(inputs) { const ch = inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; }
}
registerProcessor("capture", Capture);
```

```js
// client
import { GoogleGenAI, Modality } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: await (await fetch("/token")).text() });
let handle = null;
const session = await ai.live.connect({
  model: "gemini-3.8-live",
  config: {
    responseModalities: [Modality.AUDIO],
    realtimeInputConfig: { automaticActivityDetection: { silenceDurationMs: 700, prefixPaddingMs: 20 } },
    inputAudioTranscription: {}, outputAudioTranscription: {},
    sessionResumption: {}, contextWindowCompression: { slidingWindow: {} },
  },
  callbacks: {
    onmessage(m) {
      const sc = m.serverContent;
      if (sc?.interrupted) return player.flush();            // barge-in: stop and clear the queue
      for (const p of sc?.modelTurn?.parts ?? [])
        if (p.inlineData) player.enqueue(b64ToInt16(p.inlineData.data));   // 24 kHz PCM
      if (m.sessionResumptionUpdate?.resumable) handle = m.sessionResumptionUpdate.newHandle;
      if (m.goAway) reconnect(handle, m.goAway.timeLeft);    // check the docs for the exact field name
    },
    onerror: console.error, onclose: () => {},
  },
});

const ctx = new AudioContext({ sampleRate: 16000 });         // check MDN for sampleRate support
await ctx.audioWorklet.addModule("capture-worklet.js");
const mic = ctx.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: true }));
const cap = new AudioWorkletNode(ctx, "capture");
cap.port.onmessage = (e) => session.sendRealtimeInput({
  audio: { data: toBase64(floatToInt16(e.data)), mimeType: "audio/pcm;rate=16000" } });
mic.connect(cap);
```

`player`, `b64ToInt16`, `toBase64`, `floatToInt16` and `reconnect` are yours: a queue of Web Audio buffers at 24 kHz with a `flush()` that stops them all, a few lines of PCM conversion, and a reconnect that passes the stored handle as the resumption handle. If you lock the token with `liveConnectConstraints`, the connect config must be compatible with what you locked.

## Takeaways

- The Live API is WebSocket; WebRTC comes through partners such as LiveKit and Pipecat. Pick by whether you need their media infrastructure.
- Tune `silenceDurationMs` first (500 to 800 ms recommended), and use `audioStreamEnd` when your client can detect the end of speech sooner.
- On `serverContent.interrupted`, flush playback at once, keep buffers short, and make tool calls idempotent because pending ones are discarded.
- Plan for the limits: 15 minutes audio-only, roughly 10-minute connections, compression, resumption handles and `GoAway`.
- Use ephemeral tokens from a backend you authenticate, and measure time to first audio yourself because Google does not publish one.

For where Gemini 3.8 Live sits next to the other September releases, see the post on which AI model to build on in October 2026.
