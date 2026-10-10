---
title: "llms.txt: what it is, who reads it, and a template"
description: "llms.txt is a Markdown index for AI agents. Google says Search ignores it, log studies show few fetches, but it is cheap. The spec, the evidence and a template."
date: 2026-10-10T02:26:00Z
tags: ["llms.txt", "SEO", "AI visibility", "AI crawlers", "Markdown"]
pillar: building
sources:
  - title: "llmstxt.org: the /llms.txt file proposal (Jeremy Howard)"
    url: "https://llmstxt.org/"
  - title: "Google Search Central: optimizing for generative AI search (AI optimization guide)"
    url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide"
  - title: "Chrome Lighthouse docs: llms.txt audit (Agentic Browsing)"
    url: "https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt"
  - title: "Claude Code docs: overview (opens by pointing agents at its llms.txt)"
    url: "https://code.claude.com/docs/en/overview"
  - title: "HybridRanking: llms.txt one year later (secondary; summarises the OtterlyAI log study)"
    url: "https://hybridranking.com/blog/llms-txt-one-year-later"
  - title: "AI SaaS Radar: llms.txt adoption data 2026 (secondary; summarises SE Ranking and Ahrefs)"
    url: "https://aisaasradar.com/article/llms-txt-adoption-data-2026"
draft: false
---

llms.txt is a plain Markdown file at the root of your site that gives an AI agent a short summary and a list of links worth reading. As of 10 October 2026, Google says its Search does not use it, most measured AI-bot traffic never asks for it, and Chrome's Lighthouse checks for it anyway. This site publishes one, so here is what it is, what the evidence says, and a template that follows the spec more closely than my current file does.

## What is llms.txt?

Jeremy Howard proposed it on 3 September 2024. The spec page says the file "offers brief background information, guidance, and links to detailed markdown files", small enough to fit in a context window, so an agent can read the index and fetch the linked pages only when it needs them. The version of the page I read was last modified on 10 August 2026.

The format is Markdown with a fixed order:

1. An H1 with the name of the project or site. It is the only required part.
2. A blockquote summary.
3. Optional paragraphs or lists, with no headings.
4. H2 sections that hold file lists. Each item is a link in the form `[name](url)`, optionally followed by a colon and notes.
5. By convention, an H2 section called "Optional" for links an agent can skip when it needs less context.

The file can sit at the site root or at any subpath such as `/docs/llms.txt`, and covers the URLs under its path. The spec also suggests serving a clean Markdown copy of each page by adding `.md` to the URL, and describes discovery through link relations: `rel="alternate" type="text/markdown"` for the Markdown version and `rel="describedby"` for the covering llms.txt, as an HTML `<link>` or an HTTP `Link:` header.

## Who actually reads it?

Start with the one vendor that has said something directly. Google's guide to generative AI search, last updated 2026-07-10, says "Google Search itself doesn't use them", and that creating and maintaining such files "will neither harm nor help your site's visibility." It adds that you do not need "new machine readable files, AI text files, markup, or Markdown" to appear in Google Search. That is not a statement about other vendors' crawlers.

Chrome points the other way for a different audience. Lighthouse has an audit that checks whether it can retrieve your llms.txt, described as "a machine-readable summary of a website's content, specifically designed for LLMs and AI agents". It fails only on a server error. A 404 is marked Not Applicable because the file is "optional at the moment". That is about browser agents, not about Search ranking.

For crawler behaviour I only have secondary summaries, and I treat them as rough:

- HybridRanking summarises an OtterlyAI log study published on 5 February 2026. Over 90 days on OtterlyAI's own site, 84 of 62,100+ AI-bot requests reached `/llms.txt`, about 0.1%. GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot and Google-Extended were absent or "statistically indistinguishable from zero"; the one consistent visitor was BuiltWith, a technology catalogue and not an answer engine. HybridRanking takes a position on llms.txt, so check the original study.
- AI SaaS Radar reports SE Ranking finding adoption of roughly 10.13% across about 300,000 domains, with only one of the fifty most-cited domains in AI answers having the file, and Ahrefs finding that 97% of llms.txt files in a 137,000-site sample received zero traffic in May 2026. It gives no dates for the SE Ranking figures and does not name the sources of every claim.

Both sources are small or second-hand. I could not find a statement from OpenAI, Anthropic or Perplexity saying their crawlers use the file, and I did not see one in the vendor pages I read for the [crawler guide](/blog/ai-crawler-guide-robots-llms-txt-structured-data/). Absence from those pages is not proof, but I would not plan traffic around llms.txt.

## Where does it plausibly pay off?

Documentation. The Claude Code docs pages I fetched open with this note: "Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt. Use this file to discover all available pages before exploring further." That is a docs site telling an agent where the map is. The cost on the publisher's side is one file.

My own reading is that the value is highest where an agent is working on your behalf or on a task with your product in it: docs, API references, changelogs. For a personal site the upside is mostly insurance and a tidy summary of who you are. The downside is a stale file contradicting the site, which is the one real risk. If you keep it, generate it from the same data as the site.

## How does this site's file compare with the spec?

This site's `llms.txt` has the required H1 and a blockquote summary. Against the spec, I would change four things:

- **Items are not `[name](url)` links.** The "Pages" section lists bare URLs followed by prose. The spec's format is a link with a name.
- **Posts are not listed.** The file points to `/blog/` and the RSS feed, but not to individual posts. An agent has to crawl the index to find them.
- **No "Optional" section.** The sitemap and social links belong there.
- **Discovery uses the wrong relation.** The site's `<head>` has `<link rel="author" href="/llms.txt">`. The spec names `rel="describedby"` for this. I would add that and keep or drop `author` deliberately.

## Hands-on: a template

This follows the spec and uses this site's real structure. Swap the names and URLs.

```markdown
# Mubarak Shajahan — MK Comics

> Portfolio and weekly blog of Mubarak Shajahan, Senior Software Engineer at Galent, Chennai. Full-stack and AI engineering: React, Next.js, Node.js, Python, AWS, LLMs, RAG.

Every number on the portfolio is real. Blog posts state dates, prices and limits and cite their sources.

## Pages
- [Portfolio](https://mk-comics.vercel.app/): case files, roles, resume preview, skills and contact
- [Blog index](https://mk-comics.vercel.app/blog/): the weekly strip, newest first
- [Resume (PDF)](https://mk-comics.vercel.app/resume/Mubarak-Shajahan-Resume.pdf): current resume

## Blog posts
- [Which AI model should you build on in October 2026?](https://mk-comics.vercel.app/blog/which-ai-model-to-build-on-october-2026/): model choice across vendors
- [Prompt caching economics: what a RAG bill looks like in 2026](https://mk-comics.vercel.app/blog/prompt-caching-economics-rag-bill-2026/): cached-input pricing and a worked bill
- [llms.txt: what it is, who reads it, and a template](https://mk-comics.vercel.app/blog/llms-txt-what-it-is-who-reads-it-template/): this file, explained

## Optional
- [RSS feed](https://mk-comics.vercel.app/rss.xml)
- [Sitemap](https://mk-comics.vercel.app/sitemap-index.xml)
- [LinkedIn](https://linkedin.com/in/mohammed-mubarak)
```

Then wire it up and check it:

```html
<link rel="describedby" href="/llms.txt" />
```

```bash
url=https://example.com/llms.txt
curl -s -o llms.txt -w "%{http_code} %{content_type}\n" "$url"      # want 200
head -1 llms.txt | grep -q '^# ' && echo "H1 ok"
sed -n '2,4p' llms.txt | grep -q '^> ' && echo "blockquote ok"
bad=$(grep '^- ' llms.txt | grep -vE '^- \[[^]]+\]\(https?://[^)]+\)')
[ -z "$bad" ] && echo "link lists ok" || printf 'not [name](url):\n%s\n' "$bad"
```

If your site is built from a content collection, generate the "Blog posts" section from it at build time. A hand-edited list will be out of date by the second post.

## Takeaways

- llms.txt is a Markdown index: H1, blockquote, then H2 sections of `[name](url)` links, plus an optional "Optional" section.
- Google Search says it does not use the file and that it neither helps nor harms. Do not do it for rankings.
- Measured fetches by AI crawlers are tiny in the studies I could find, all second-hand; docs sites and agent tooling are the clearest use.
- Add `rel="describedby"`, list your real URLs, and generate the file from your content so it never drifts.
- Treat it as a ten-minute task, not a strategy.

If you want the page-level markup instead, the next post covers [Person and Article structured data](/blog/structured-data-for-a-personal-site-person-article-schema/) on this same site.
