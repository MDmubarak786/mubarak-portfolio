---
title: "Hiring-manager SEO: what a portfolio should rank for"
description: "A portfolio does not need to rank for 'software engineer'. It needs to win your own name, then earn long-tail pages that prove the claim. What Google's guides say to do."
date: 2026-10-10T02:40:00Z
tags: ["SEO", "portfolio", "careers", "structured data", "Google Search"]
pillar: building
sources:
  - title: "Google Search Central: SEO starter guide"
    url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide"
  - title: "Google Search Central: influencing title links in search results"
    url: "https://developers.google.com/search/docs/appearance/title-link"
  - title: "Google Search Central: creating helpful, reliable, people-first content"
    url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content"
  - title: "Google Search Central: Article structured data"
    url: "https://developers.google.com/search/docs/appearance/structured-data/article"
  - title: "schema.org: Person"
    url: "https://schema.org/Person"
draft: false
---

Most portfolio SEO advice is about ranking for "full-stack developer", a query you are unlikely to win and that few people hiring type. The query that decides whether a recruiter calls you is your own name, typed after they read your CV. I treat the rest of the job as feeding that query with proof.

This is a design argument built on Google's own guides, applied to this site. I have no ranking, impression or click data to report, and nothing here claims the site ranks for anything. Where I say what hiring managers do, it is my bet, not a statistic.

## Who actually searches for a portfolio?

There are three kinds of query, and a portfolio has a different job for each.

| Query type | Example | Who types it | What the page must do |
|---|---|---|---|
| Name | "Mubarak Shajahan" | A recruiter or lead with a CV or LinkedIn profile open | Be the first result, with the right title and a clear summary |
| Role | "senior software engineer Chennai React" | A sourcer browsing | Almost never won by a personal site; do not build around it |
| Specific question | "Claude Haiku 5.5 classification cost", "GitHub contributions Astro build" | An engineer with a problem | Answer it, and show who wrote it |

My bet is that hiring managers mostly arrive by the first row. A CV, a LinkedIn message or a referral gives them a name, and the search is a verification step. The third row matters for a different reason: it brings new readers who have never heard of you, and each page they land on is evidence that you do the work. Role queries are the middle row and the weakest return for a personal site, because every company, job board and agency competes for them.

So the plan has two halves. Win the name, and write pages that are findable for specific problems and prove the claims on the front page.

## How do I win my own name?

Google's starter guide opens with a check anyone can run: a `site:` search for your domain. If you see results, "you're in the index." If you do not, you have an indexing problem and nothing below matters yet.

After that, the controls are plain. The guide says Google "mostly" discovers pages through links from pages it has already crawled, so a name query benefits from other pages that link to you, such as a LinkedIn profile or a GitHub profile that point at the site. The sitemap is optional in Google's words, though it costs nothing to generate one.

### Title and description

Google generates title links automatically and may rewrite them, but its guidance on what to supply is specific. Titles should be descriptive and concise, avoid keyword stuffing and boilerplate, and put the main title where it "stands out as being the most prominent on the page", for example the first visible `h1`. Meta descriptions should be short, unique to the page and cover its most relevant points.

For a homepage, that means the title says who you are and what you do, once. This site's home page title is the name, the role and a short specialty: `Mubarak Shajahan – Senior Software Engineer, Full-Stack + AI`. It has no tagline and no keyword list. Inside posts, the title leads with the topic, because that is what a stranger typed.

### Structured data that identifies you

Structured data helps Google understand who the page is about. For a person, schema.org's `Person` type has properties for exactly what a name query needs: `name`, `jobTitle`, `worksFor`, `sameAs` ("a reference page that unambiguously identifies the item"), `url`, `alumniOf` and `knowsAbout`. This is what the layout on this site emits, trimmed to the properties that matter:

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Mubarak Shajahan",
  "alternateName": ["Mohammed Mubarak", "முகமது முபாரக்"],
  "jobTitle": "Senior Software Engineer",
  "url": "https://mk-comics.vercel.app",
  "worksFor": { "@type": "Organization", "name": "Galent" },
  "sameAs": [
    "https://linkedin.com/in/mohammed-mubarak",
    "https://github.com/MDmubarak786"
  ],
  "knowsAbout": ["React", "Next.js", "AWS", "LLMs", "RAG"]
}
```

The `alternateName` list is the part specific to a name query. A person known by a legal name, a short name and a name in another script is searched under all of them, and the markup tells Google they are one person. `sameAs` links the site to profiles on other domains, which is the "this site and that LinkedIn page are the same human" signal. None of it is a ranking promise. It is how you remove ambiguity about who the page describes.

## What should the rest of the site rank for?

This is where the blog and the case files do their work. Google's helpful-content guidance asks for content "created primarily for people", showing first-hand experience, and for readers to be able to tell who wrote it: where they might expect one, "a byline that leads to background on the author". It treats invented authors and false credentials as deception.

For an engineer, that is an unusually good fit, because the claim "I have built this" is the product. A case file that says what a migration cost, written by the person who did it, is a first-hand page. A post that quotes a vendor's documentation and says which sentences are secondary is a people-first page. The same guidance suggests asking how the content was made and whether automation was involved, and being open about it where readers would wonder.

Three rules follow for a personal site:

1. **One page per specific question.** The starter guide says to anticipate how different users search, "using both expert and beginner vocabulary". A post titled for a migration or a model ID will match what an engineer types. A page titled "My thoughts on AI" will match nothing.
2. **Proof pages carry numbers and names.** A case file with a cost before and after, a user count and a stack is both the reason a hiring manager believes the homepage and a page that can match specific queries.
3. **Mark up articles with an author.** Google's Article documentation says there are "no required properties", but recommends `author` (with `author.name` and `author.url` or `sameAs`), `datePublished`, `dateModified`, `headline` and `image`, with timezone information on the dates. A post whose author points back to the Person page connects the long tail to the name.

## What does the starter guide say not to bother with?

Equally useful on a small site. Google lists things it does not want you to focus on: meta keywords, keyword stuffing, word-count targets, and a "duplicate content penalty". That frees up effort. On this blog, length targets exist because readers finish a post of that size, not because a number of words ranks. A canonical link on each page, which the starter guide recommends for duplicates, is a one-line addition and avoids the duplicate-page problem.

## A copyable check

You can audit your own site with four steps. None of them needs a tool you have to pay for.

1. Search `site:yourdomain.com`. If nothing appears, fix indexing first: check that robots.txt allows crawling and that the page links from somewhere Google already visits.
2. Search your own name in a private window. Write down what appears above you and what the snippet says. The snippet is what a recruiter reads.
3. View source on the homepage. Confirm one `title` with your name and role, a unique `meta name="description"`, one `h1`, a `canonical` link and a JSON-LD `Person` block with `sameAs` pointing at your other profiles.
4. For each case file or post, confirm it has its own title, its own description and an author that links back to you.

If step 2 still does not show you first after a few weeks, the usual cause is links, not markup. Google says changes can take days to weeks to be reflected. Ask the people who already write about you to link to the real URL.

## Takeaways

- Win the name query before any other. A recruiter with your CV open types your name.
- Do not build a site around "software engineer". Build pages for specific problems, and write them from first-hand work.
- Say who you are once, clearly: title, description and `Person` markup with `alternateName` and `sameAs`.
- Put numbers and names in proof pages, and give every page an author that links back to you.
- Skip meta keywords and word-count targets. Google says they are not worth the effort.

If you want to see what a proof page looks like in practice, the case file on the Incresco and Camped sites built on Astro and Storyblok, which reached a Lighthouse score of 100, is the one to read next.
