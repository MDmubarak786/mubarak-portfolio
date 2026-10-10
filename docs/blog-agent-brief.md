# Writing brief for MK Comics blog posts

You are writing posts for https://mk-comics.vercel.app/blog, the blog of Mubarak Shajahan, Senior Software Engineer at Galent (Chennai, India). Posts are Markdown files in `src/content/posts/<slug>.md`. Read `docs/blog-plan.md` and one existing post (`src/content/posts/prompt-caching-economics-rag-bill-2026.md`) before writing anything: match its structure, tone and frontmatter exactly.

## Frontmatter (validated by `src/content.config.ts`; a violation breaks the build)

```yaml
---
title: "<= 90 characters; aim for <= 60; the main keyword near the front"
description: "80 to 170 characters, one or two sentences, no trailing period required"
date: 2026-10-10T0H:MM:00Z   # use the exact datetime given in the calendar entry
tags: ["3 to 7 tags"]
pillar: model-watch | building | case-files   # from the calendar entry
related: adr-00N-...          # optional; only the ids listed in the calendar entry
sources:
  - title: "Human-readable title of the page"
    url: "https://..."         # only URLs you fetched or that appeared in your search results
draft: false
---
```

## Body

1,200 to 1,800 words. Markdown only: `##` and `###` headings, paragraphs, lists, tables, fenced code blocks with a language. No HTML, no images, no front-loaded summary box. Headings read as the questions people search.

Skeleton, in this order:

1. **Hook** (2–3 sentences, no heading): the change or problem, and why a builder should care today. Model-watch posts say "as of 10 October 2026" in the hook.
2. **What shipped / what the thing is**: dates, model IDs, prices, limits, each traceable to a source. Quote short exact phrases from docs where it adds precision.
3. **What it means for people shipping products**: concrete, opinionated, first person.
4. **Hands-on**: at least one fenced code block or a worked calculation the reader can copy. Use documented APIs only; if you could not fetch the reference for a parameter name, say "check the docs for the exact parameter" next to it.
5. **Takeaways**: 3–5 bullets.
6. End with one sentence pointing to a related post or case file, written as prose (no heading).

Do not add a Sources section in the body; the page renders it from frontmatter.

## Voice

First person, direct, outcome-led, no hype adjectives (no "game-changing", "revolutionary", "powerful"). Short sentences. British spelling is fine. Never pad. Never copy a vendor's benchmark table. Never present a rumour as fact; if a source is secondary, say so in the sentence.

## Research rules (non-negotiable)

- Use WebSearch (mode "extended" for anything time-sensitive) and WebFetch on primary pages: vendor release notes, pricing pages, API docs, official announcements, GitHub READMEs, specifications.
- Every number, date, price, limit, model ID and quoted phrase must come from a page you fetched or a search result you can cite. If a primary page blocks fetching, say so in the post and cite the secondary source you used instead.
- Verify every `sources` URL is one you actually saw. Do not invent URLs. Four to eight sources per post.
- If the research shows the calendar's premise is wrong or stale, write the true version of the post under the same slug and title the truth; note the change in your final report.

## What Mubarak can truthfully say in first person (use only these facts; do not invent others)

- Senior Software Engineer at Galent, Chennai, since May 2026. Before that five years at Incresco (21 June 2021 – May 2026): Software Development Engineer → SDE 1 → SDE 2, building AI and full-stack platforms for Global University Systems. B.Tech IT, Sri Krishna College of Technology, Coimbatore, 2018–2022.
- Sole engineer on EF Academy's primary digital presence: Next.js + Storyblok, 1.25M+ monthly users, 23+ languages; built its AWS integration layer.
- Replaced a licensed TIBCO Scribe pipeline with AWS Glue before the contract ended: $24,000 → $840 a year (96.5% cut); the VP of Technology counts it as $30,000 saved.
- AI document processing (GPT-4 Vision + OCR, 2024): 17+ document types at 95% accuracy with fraud detection; manual entry −70%, processing 7×, accuracy +40% on complex documents.
- Chrome extensions (Manifest V3) automating admin workflows: 3–5 hours a day saved per admin at 99.9% uptime; Playwright automation latency −40%; admin lookup −60%.
- Prospect Uploader: 10,000+ leads per CSV upload into Salesforce via AWS Lambda + EventBridge, validation and alerts in every language.
- Incresco and Camped sites on Astro + Storyblok: 100 Lighthouse; campaigns across 23+ languages.
- Planet IoT: real-time utility status with SignalR. Edvanza: led four front-end engineers to React / React Native parity.
- Reviewed 37% of the org's PRs (1,300+ PRs), ran 30+ interviews, led a team of four.
- Stack: JavaScript/TypeScript, Python, React, Next.js, Astro, Node.js, NestJS, Flask, FastAPI, MongoDB, PostgreSQL, MySQL, DynamoDB, Milvus, AWS (Lambda, SQS, EventBridge, Step Functions, API Gateway, Glue, S3, CloudFront), Azure, Terraform, Docker, GitHub Actions, Vercel, LLMs, VLMs, RAG, embeddings, CLIP, LangChain, agentic workflows, OCR, Playwright, Datadog, Sentry, Salesforce API, Storyblok.
- Writes for 22,000+ LinkedIn followers (10M+ impressions). This site is built with Astro 7, Tailwind v4, GSAP + Lenis, Claude Code, on Vercel; analytics via GA4, GTM, Clarity; the blog has per-post OG images via satori, RSS, Article JSON-LD, llms.txt.

Anything outside this list is not first-hand. Write it as reporting ("the docs say", "Anthropic's notes list") or as a design argument, never as "I ran this in production".

## Case file ids you may put in `related`

adr-001-tibco-to-aws-glue, adr-002-ef-academy-multilingual-platform, adr-003-prospect-uploader, adr-004-incresco-camped-astro, adr-005-planet-iot-realtime, adr-006-edvanza-team, adr-007-ai-document-processing, adr-008-chrome-extensions

## Mechanics

- Write each post with the Write tool to `src/content/posts/<slug>.md` using the slug from the calendar. Do not create other files, do not edit existing posts, do not run `astro build`, do not run git.
- After writing all your posts, re-open each one and check: frontmatter keys exactly as above, description length 80–170, title ≤ 90, date matches the calendar, 4–8 sources, 1,200–1,800 words, no invented first-person claims.
- Final report: one line per post with slug, word count, and any premise you changed or source you could not reach.
