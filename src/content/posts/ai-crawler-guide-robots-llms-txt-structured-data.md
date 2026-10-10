---
title: "AI crawler guide: robots.txt rules for GPTBot, ClaudeBot and more"
description: "Which robots.txt tokens decide whether OpenAI, Anthropic, Perplexity and Google can train on your site or cite it, from each vendor's docs, plus this site's file."
date: 2026-10-10T02:25:00Z
tags: ["SEO", "AI crawlers", "robots.txt", "GPTBot", "ClaudeBot", "AI visibility"]
pillar: building
sources:
  - title: "OpenAI: overview of OpenAI crawlers (OAI-SearchBot, GPTBot, ChatGPT-User)"
    url: "https://developers.openai.com/api/docs/bots"
  - title: "Anthropic: does Anthropic crawl data from the web, and how can site owners block the crawler"
    url: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler"
  - title: "Perplexity docs: PerplexityBot and Perplexity-User"
    url: "https://docs.perplexity.ai/guides/bots"
  - title: "Google Search Central: Google's common crawlers (Google-Extended)"
    url: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers"
  - title: "Google Search Central: AI features and your website"
    url: "https://developers.google.com/search/docs/appearance/ai-features"
  - title: "RFC 9309: Robots Exclusion Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc9309"
  - title: "Cloudflare: Perplexity is using stealth, undeclared crawlers (Cloudflare's allegation)"
    url: "https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/"
draft: false
---

If you want an AI assistant to cite your site, the single most useful file is a robots.txt that says yes to the right crawlers. The catch is that each vendor now runs several bots with different jobs, and blocking the wrong token either hides you from answers or does nothing at all. This guide is what the vendors' own pages say, as of 10 October 2026, followed by what this site's robots.txt does.

## Which AI crawlers exist, and what is each one for?

The pattern across vendors is the same: one token for training, one for search, one for fetching a page when a person asks.

| Vendor | Token | What the vendor page says it does |
|---|---|---|
| OpenAI | `OAI-SearchBot` | Surfaces sites in ChatGPT's search features |
| OpenAI | `GPTBot` | Crawls content that may be used to train generative AI foundation models |
| OpenAI | `ChatGPT-User` | Visits pages for user actions in ChatGPT and Custom GPTs |
| Anthropic | `ClaudeBot` | Collects public web content that could contribute to training |
| Anthropic | `Claude-SearchBot` | Crawls to improve the quality and accuracy of search results |
| Anthropic | `Claude-User` | Retrieves pages when a Claude user asks a question that needs web access |
| Perplexity | `PerplexityBot` | Surfaces and links sites in Perplexity search results; not used for foundation-model training |
| Perplexity | `Perplexity-User` | Fetches a page when a user asks Perplexity a question |
| Google | `Google-Extended` | A control token for Gemini training and grounding |

Three details are easy to miss.

**Blocking GPTBot does not remove you from ChatGPT search.** OpenAI says GPTBot and OAI-SearchBot work independently, and that sites that opt out of OAI-SearchBot will not appear in ChatGPT search answers, though they can still show up as navigational links. If both are allowed, OpenAI says it may use one crawl for both purposes. OpenAI recommends allowing OAI-SearchBot, and says robots.txt changes can take about 24 hours to reach its search systems.

**Anthropic splits the same way.** Its help article says restricting ClaudeBot signals that future material should be excluded from training datasets, while disabling Claude-SearchBot stops indexing for search and may reduce visibility in user search results, and disabling Claude-User may reduce visibility in user-directed search. It also says Anthropic supports `Crawl-delay`, with `Crawl-delay: 1` as its example, and that blocking by IP address may not work reliably because the bots then cannot read your robots.txt.

**Google-Extended is a token, not a crawler.** Google's page calls it "a standalone product token", with no separate user-agent string: Google's existing crawlers do the fetching. It controls whether content can be used to train future Gemini models and for grounding in Gemini Apps and Grounding with Google Search on Vertex AI. It "does not impact a site's inclusion in Google Search nor is it used as a ranking signal."

## What decides whether AI Overviews can use my pages?

Not Google-Extended. Google's AI features page says Googlebot's robots.txt directives are the control "to manage access to how their sites are crawled for Search", and advises "ensuring that crawling is allowed in robots.txt". To limit how much of a page is shown, it points to `nosnippet`, `data-nosnippet`, `max-snippet` or `noindex`, and warns that crawling can take "anywhere from several days to several months" to process changes. It also says you "don't need to create new machine readable files, AI text files, or markup to appear in these features". The next two posts in this series cover [llms.txt](/blog/llms-txt-what-it-is-who-reads-it-template/) and [structured data](/blog/structured-data-for-a-personal-site-person-article-schema/) with that in mind.

## Does robots.txt actually stop them?

It is a request, not a lock. RFC 9309 says: "These rules are not a form of access authorization", and that the protocol "is not a substitute for valid content security measures". Crawlers may cache the file but should not use a cached copy for more than 24 hours.

The user-triggered fetchers are a special case. OpenAI says ChatGPT-User is not used for automatic crawling and that robots.txt rules may not apply because users trigger the actions. Perplexity says Perplexity-User "generally ignores robots.txt rules" for the same reason. So an `Allow` for those two tokens is documentation, not control.

Compliance by declared bots is a separate question. Cloudflare published an allegation in August 2025 that Perplexity used undeclared, browser-like crawlers after being blocked, and removed Perplexity from its verified-bots list. Perplexity disputed the findings; I have only seen its rebuttal secondhand, so I am not relying on it either way. The practical reading is that robots.txt expresses policy to crawlers that choose to honour it, and if you need enforcement you need it at the CDN or server.

## What does this site's robots.txt do?

This site wants to be read, so the file allows everything and names the AI tokens explicitly. Trimmed:

```text
User-agent: *
Allow: /

# AI assistants and their crawlers are welcome
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: https://mk-comics.vercel.app/sitemap-index.xml
```

The real file also lists Googlebot, Bingbot, `anthropic-ai`, Applebot and Applebot-Extended, Amazonbot, meta-externalagent, CCBot, DuckAssistBot and Bytespider. I have not researched those vendors' pages for this post, so I make no claims about them. Anthropic's help article does not mention `anthropic-ai` at all, so I cannot say from that page what it does.

The named groups are redundant today, because `User-agent: *` with `Allow: /` already permits everyone. They earn their place later. Under RFC 9309 a crawler uses the group that matches its own token and falls back to `*` only if none does. If I ever add a `Disallow` under `*`, a bot with its own `Allow: /` group would ignore it. That is useful when intended and a leak when not.

## Hands-on: stay citable, opt out of training

Many publishers want assistants to cite them without feeding training sets. The vendor pages above support this split, because search, user-fetch and training tokens are separate. A starting point:

```text
# Training: opt out
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
User-agent: Google-Extended
Disallow: /

# Search and answers: stay eligible for citation
User-agent: OAI-SearchBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /

# Everyone else, including Googlebot
User-agent: *
Allow: /
```

Then verify, because a typo here is silent:

```bash
curl -s https://example.com/robots.txt | head -40
curl -sI https://example.com/robots.txt | head -5   # expect 200, not a redirect to HTML
```

Check the access logs after a few days for the declared user-agent strings. Each vendor publishes IP lists you can compare against: OpenAI lists `searchbot.json`, `gptbot.json` and `chatgpt-user.json`, Anthropic points to `bots.json`, Perplexity to `perplexitybot.json` and `perplexity-user.json`. Anthropic says a request from an address on its list is coming from Anthropic.

Two cautions. Blocking training means future crawls only; Anthropic's help article talks about excluding future material, and I did not see any of the pages promise removal of what was already collected. And propagation is slow: OpenAI and Perplexity both say changes can take up to 24 hours.

## Takeaways

- Treat training, search and user-fetch as three separate decisions, per vendor. The token names differ and so does what blocking costs you.
- To be cited in ChatGPT you need OAI-SearchBot, not GPTBot. For Claude, Claude-SearchBot and Claude-User matter for visibility; ClaudeBot is the training token.
- Google-Extended does not affect Search; AI Overviews eligibility follows Googlebot and your snippet controls.
- Allow rules for Perplexity-User and ChatGPT-User are documentation: the vendors say robots.txt generally does not govern them.
- robots.txt is policy, not enforcement. Check your logs against each vendor's published IP list.

For how I build Astro marketing sites in general, see the case file on [Incresco and Camped on Astro](/#file-adr-004-incresco-camped-astro).
