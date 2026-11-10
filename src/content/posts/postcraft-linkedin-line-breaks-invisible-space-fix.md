---
title: "Why LinkedIn eats your line breaks, and the invisible-space fix behind PostCraft"
description: "LinkedIn often collapses the blank lines in a pasted post. How I built PostCraft, a free in-browser formatter that keeps them with one invisible character."
date: 2026-11-10T09:00:00Z
updated: 2026-11-10T09:00:00Z
tags: ["PostCraft", "LinkedIn", "Unicode", "privacy", "side project", "case file"]
pillar: case-files
sources:
  - title: "Unicode chart: Latin-1 Supplement (U+00A0 NO-BREAK SPACE)"
    url: "https://www.unicode.org/charts/PDF/U0080.pdf"
  - title: "Unicode chart: Mathematical Alphanumeric Symbols (U+1D400 to U+1D7FF)"
    url: "https://www.unicode.org/charts/PDF/U1D400.pdf"
  - title: "MDN: Clipboard.writeText()"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText"
  - title: "Google Tag Platform: Set up consent mode"
    url: "https://developers.google.com/tag-platform/security/guides/consent"
  - title: "Microsoft Learn: Clarity masking"
    url: "https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking"
  - title: "TanStack Start documentation"
    url: "https://tanstack.com/start/latest"
draft: false
---

You write a LinkedIn post with short paragraphs and a little air between them. You paste it into the composer, hit Post, and it lands in the feed as one grey block. Every word survived. The rhythm didn't.

I hit this often enough that I stopped fixing it by hand and built a tool instead. It's called **[PostCraft](https://post-craft-mk.vercel.app/?utm_source=mk-comics&utm_medium=referral&utm_campaign=postcraft&utm_content=blog-intro)**: paste a draft, see it as a LinkedIn post, copy it, and the spacing you saw is the spacing you publish. It's free, it needs no account, and your text never leaves the browser. This is how it works and the decisions behind it.

## Where the blank lines go

Most of my posts start somewhere else: a chat with an AI model, a Notion page, a Google Doc, a note on my phone. Those are rich-text sources, and when you paste from them, LinkedIn's composer tidies up what it receives. Lines with text on them survive. Lines with nothing on them look like formatting noise, and they are the ones that tend to disappear.

LinkedIn doesn't document exactly when this happens, and the web composer and the mobile app don't always behave the same way. I'm not going to pretend to know the rule. What I could see was the pattern, and the pattern was enough to design against: **an empty line is at risk; a line with a character on it is not.**

## One character that looks like nothing

If empty lines get removed, the fix is to stop them being empty, with a character a reader can't see.

The ordinary space doesn't work: a line holding only a space is usually treated as blank and trimmed. The **non-breaking space**, Unicode `U+00A0`, is different. It renders as blank space, but text systems don't treat it as collapsible whitespace the way they treat a regular space. A line holding one `U+00A0` looks empty and isn't.

So the whole product rests on one small function. Every line that is blank, or contains only whitespace, becomes exactly one non-breaking space:

```ts
export const NBSP = " ";
const isBlank = (l: string) => l.replace(/ /g, " ").trim().length === 0;

export function preserveLinkedInSpacing(text: string): string {
  return text.replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => (isBlank(line) ? NBSP : line))
    .join("\n");
}
```

Two details there matter more than they look. Windows line endings (`\r\n`) are normalised first, because a stray `\r` makes a blank line look non-blank. And `isBlank` treats an existing `U+00A0` as blank, so running the function twice gives the same result instead of stacking characters. Every transform in PostCraft is a pure `(text) => text` function like this one, with unit tests, because they are the product. Everything else is presentation.

One rule I kept for the source code: the non-breaking space is always written as the escape ` `, never as the literal character. A literal one is invisible in code review, and a linter flags it as irregular whitespace for exactly that reason.

## What you preview is what you publish

A formatter you have to trust blindly isn't much better than pasting and hoping. So the right half of the editor is a LinkedIn-style post card, and it renders from the **same output** that goes to the clipboard, not from the draft. If the preview shows a gap, the copied text has a character holding that gap open. A toggle shows each held line as a small blue marker, so you can see exactly where the invisible characters sit.

Copying uses the asynchronous Clipboard API, `navigator.clipboard.writeText()`. That API only exists in secure contexts and can be refused, so there is a fallback: a hidden textarea, selected and copied the old way. Copy is the one action that must never silently fail. If both paths fail, the user sees an error rather than a cheerful toast over an empty clipboard.

## The tools around the fix

Spacing is the headline, but drafts from AI tools arrive messy in other ways. The editor grew a small set of tools, each one a pure function:

- **Normalize spacing** collapses runs of blank lines to exactly one and trims the ends.
- **More / Less space** widens or tightens every gap at once, capped so it can't run away.
- **Format bullets** turns `-`, `*`, `+` and stray symbols into one consistent `•`.
- **Clean whitespace** drops zero-width characters, trailing spaces and doubled spaces, which AI output and copy-paste chains leave behind more often than you'd think.
- **Bold, italic, underline, strikethrough.** LinkedIn posts are plain text, so these use look-alike letters from Unicode's Mathematical Alphanumeric Symbols block, plus combining marks for underline and strike. I added a caution to the docs: screen readers can read these letters awkwardly, so they're for a word or two of emphasis, not whole paragraphs.

There's also undo and redo, find and replace, a counter against LinkedIn's 3,000-character post limit, and a preview for images or a PDF. Attachments are a good example of the privacy rule below: they're shown from in-memory `blob:` URLs, never uploaded, and you re-attach them in LinkedIn because the clipboard only carries text.

## Private by construction

A post you haven't published yet can be sensitive: a job change, a launch, a hard week. I didn't want a formatter that sends drafts to a server, so PostCraft has none to send them to. Every transform runs in the browser. The only storage it uses is a one-time hand-off when you move a draft from the landing page into the full editor (read once and deleted), and your theme and cookie choice.

Analytics had to fit inside that promise. Google Analytics 4 and Microsoft Clarity load **only after you click Accept**, using Google's consent mode with ad signals denied. Decline, and nothing from either loads. The events that do go out carry names and numbers, like "copied a post", never the text. Clarity records sessions, so every surface that shows a draft (the editor, the preview card, the demo on the landing page) is marked for masking, and Clarity sees blocks where the words would be.

The cost of this is honest numbers that are lower than real ones: people who decline aren't counted. I'd rather undercount than break the promise on the front page.

## The stack

PostCraft is built on TanStack Start with React 19, Tailwind CSS v4 and shadcn/ui components, and it deploys to Vercel on every push to `main`. The project is also synced with Lovable, which shapes one git rule: published history is never rewritten, because a force-push would rewrite the Lovable project's history too. I built it with Claude Code as my pair, the same way as this site.

For the look, I tried five custom palettes and threw all five away. The tool is used for thirty seconds right before posting, so it should feel calm and familiar rather than clever: a white page, near-black text, one action blue. The landing page opens with the problem itself: a three-line headline whose blank lines collapse, then spring back open with small markers where the invisible characters went.

## Search, not just the tool

People don't search for "PostCraft". They search for "LinkedIn line breaks not working", "how to bold text on LinkedIn" and "LinkedIn character limit". So PostCraft has a small blog of plain guides that answer those questions, each ending at the editor. They follow one rule I also use here: if LinkedIn doesn't document a behaviour, the guide says so instead of stating a guess as fact. The guides, the sitemap, the RSS feed and the structured data all come from one source, so a new guide is one file.

## What I learned

- **Design against the pattern when the platform won't tell you the rule.** I never needed LinkedIn's exact algorithm. I needed the one property that survives it.
- **Make the preview read from the output, not the input.** That one decision is what makes "what you see is what you publish" true instead of a slogan.
- **Small, pure functions are the product.** The editor, the landing demo and the preview all call the same tested transforms.
- **Privacy is easier to build in than to bolt on.** No server for drafts meant there was nothing to secure, log or delete later.

If your next post is sitting in a chat window or a doc, [paste it into PostCraft](https://post-craft-mk.vercel.app/app?utm_source=mk-comics&utm_medium=referral&utm_campaign=postcraft&utm_content=blog-editor), check the preview and copy it. It takes about ten seconds. If you want the long version of the spacing problem, PostCraft's guide on [keeping line breaks in LinkedIn posts](https://post-craft-mk.vercel.app/blog/keep-line-breaks-in-linkedin-posts?utm_source=mk-comics&utm_medium=referral&utm_campaign=postcraft&utm_content=blog-guide) goes deeper.
