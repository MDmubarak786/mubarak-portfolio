# MK Comics blog: plan

Written 2026-10-10. The blog exists to get the site found for things other than Mubarak's name, to give the AI crawlers and search engines many pages to index, and to turn his LinkedIn readership into site traffic and links.

## Who reads it

1. Hiring managers and engineering leads checking whether he is current on AI. They read one post, then the resume.
2. Working engineers searching for a specific model, tool or migration question. They arrive from Google, Bing, Perplexity or ChatGPT citations.
3. His 22K LinkedIn followers, sent by a short post that links to the long version here.

## Pillars

| Pillar | What it is | Share |
|---|---|---|
| Model watch | What shipped this month across Anthropic, OpenAI, Google and the labs behind them; what it changes for people building products. Always from primary sources (release notes, model cards, docs). | 40% |
| Building with AI | Hands-on: one pattern, one tool, working code. TypeSafe Jev, RAG, agents, evals, Chrome extensions, Astro, Next.js. | 40% |
| From the case files | The real projects on this site, written up long form and linked from their case file. | 20% |

## Cadence and shape

- One post a week, published Tuesday or Wednesday, 1,200 to 1,800 words. Shorter posts do not rank; longer ones do not get finished.
- Every post follows the same skeleton, which is what the first post establishes:
  1. **Hook** (two or three sentences): the change, and why a builder should care today.
  2. **What shipped** with dates, model IDs, prices and limits, each with its source.
  3. **What it means** for someone shipping products: concrete, opinionated, first person.
  4. **Hands-on**: at least one code block or a worked decision, something the reader can copy.
  5. **Takeaways**: three to five bullets.
  6. **Sources**: primary links. Nothing in the post without a source or first-hand experience.
- Voice: first person, direct, outcome-led, no hype adjectives. Same voice as the rest of the site.
- Facts about models change weekly. Each post carries a published date and an updated date, and the model-watch posts say "as of <date>" in the hook.

## SEO mechanics (built into the template, not remembered per post)

- URL `/blog/<slug>` with the main keyword in the slug, title and first paragraph.
- Title under 60 characters, description 140 to 160, one H1, H2s that read as questions people search.
- Article structured data (headline, author, dates, publisher), canonical link, Open Graph and Twitter cards, a generated OG image per post in the comic style.
- Internal links: each post links to one case file or earlier post; the home page lists the latest three; the header has Blog.
- RSS feed at `/rss.xml`, sitemap entries added automatically, posts listed in `llms.txt`.
- Distribution: a 150-word LinkedIn post the same day with the link, and one X post. The LinkedIn version never carries the full text, so the canonical copy is here.

## First ten posts

1. Which AI model to build on, October 2026: Claude 5.5, GPT-6, Gemini 3.8 and Jev (this is the template post).
2. Jev as a programming primitive: replacing prompt-and-parse with typed questions.
3. Claude Haiku 5.5 vs Sonnet 5.5 for high-volume classification: a cost-per-decision comparison.
4. Prompt caching in practice: what the Sonnet 5.5 cache-read price change does to a RAG bill.
5. Gemini 3.8 Live for voice agents: what the extended-thinking variant actually buys you.
6. Document processing in 2026: GPT-4 Vision then, VLMs now (from case file 07).
7. Building a Chrome extension that calls Claude safely: keys, consent, rate limits (from case file 08).
8. Evals before agents: the smallest useful eval harness for a product team.
9. Agentic coding on a legacy codebase: what Opus 5.5 handles and where it still needs a human.
10. The AI crawler guide: robots.txt, llms.txt and structured data for being cited by assistants.

## What stays out

- No reposting of announcement text, no benchmark tables copied from vendors, no speculation about unreleased models presented as fact, no posts without a source list.
