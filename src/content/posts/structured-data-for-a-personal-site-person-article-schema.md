---
title: "Structured data for a personal site: Person and Article JSON-LD"
description: "The Person and Article JSON-LD this site ships, what Google says it uses, three things I would fix, and how to validate it with Google's and schema.org's tools."
date: 2026-10-10T02:27:00Z
tags: ["structured data", "JSON-LD", "schema.org", "SEO", "Astro"]
pillar: building
sources:
  - title: "Google Search Central: Article structured data"
    url: "https://developers.google.com/search/docs/appearance/structured-data/article"
  - title: "schema.org: Person"
    url: "https://schema.org/Person"
  - title: "Google Search Central: introduction to structured data markup"
    url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
  - title: "Google Search Central: general structured data guidelines"
    url: "https://developers.google.com/search/docs/appearance/structured-data/sd-policies"
  - title: "Google Search Central: ProfilePage structured data"
    url: "https://developers.google.com/search/docs/appearance/structured-data/profile-page"
  - title: "Google Search Central: optimizing for generative AI search (AI optimization guide)"
    url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide"
  - title: "Schema Markup Validator"
    url: "https://validator.schema.org/"
draft: false
---

A personal site needs very little structured data: one `Person` that says who you are and one `Article` per post. It is also easy to get subtly wrong, because the markup can be valid and still not describe the page it sits on. This post walks through what this site emits, what Google's documentation says it will do with it, and three changes I would make.

## What does Google actually use?

Less than people hope. For `Article`, Google's page says the type must be `Article`, `NewsArticle` or `BlogPosting`, and that "There are no required properties; instead, add the properties that apply to your content." The recommended ones are `author`, `dateModified`, `datePublished`, `headline` and `image`. It also states that "Google does not guarantee that features that consume structured data will show up in search results."

The author rules are specific. `author` should be a `Person` or `Organization`, `author.name` should hold only the name (no job titles), `author.url` should point to a page that identifies the author, and `sameAs` is an accepted alternative. Dates should be ISO 8601 with a timezone, because without one Googlebot's timezone is assumed.

On AI features, Google's optimization guide says "Structured data isn't required for generative AI search", while still calling it "a good idea to continue using it as part of your overall SEO strategy". Its general guidelines add the rule that matters most for a personal site: "Don't mark up content that is not visible to readers of the page", and "Your structured data must be a true representation of the page content." A structured data issue can trigger a manual action, which removes rich-result eligibility without changing ranking.

For `Person` there is no Google feature to chase. schema.org defines it as "A person (alive, dead, undead, or fictional)", and its properties are descriptive: `sameAs` is a "URL of a reference Web page that unambiguously indicates the item's identity", and `knowsAbout` is "suggesting possible expertise but not implying it". Think of Person markup as machine-readable identity for anything that reads it, not as a ranking lever.

## What does this site ship?

Two JSON-LD blocks reach every blog post. The layout emits a `Person` on every page, and the post template adds an `Article`. Trimmed from `FinalShell.astro`:

```ts
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  alternateName: [site.legalName, site.tamilName],
  jobTitle: site.role,
  description,                       // the page's description prop
  url: site.url,
  image: new URL("/og.png", site.url).href,
  email: `mailto:${site.email}`,
  telephone: site.phoneE164,
  worksFor: { "@type": "Organization", name: site.employer },
  address: { "@type": "PostalAddress", addressLocality: "Chennai", addressRegion: "Tamil Nadu", addressCountry: "IN" },
  alumniOf: { "@type": "CollegeOrUniversity", name: site.education.school },
  sameAs: [site.linkedin, site.github, site.x, site.instagram, site.youtube],
  knowsAbout: ["Full-stack engineering", "React", "Next.js", "Node.js", "Python", "AWS", "LLMs", "RAG", "Agentic workflows"],
};
// ...
<script type="application/ld+json" set:html={JSON.stringify(person)} />
```

And from `src/pages/blog/[slug].astro`:

```ts
const article = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.data.title,
  description: post.data.description,
  datePublished: post.data.date.toISOString(),
  dateModified: (post.data.updated ?? post.data.date).toISOString(),
  author: { "@type": "Person", name: site.name, url: site.url, sameAs: [site.linkedin, site.github, site.x] },
  publisher: { "@type": "Person", name: site.name, url: site.url },
  mainEntityOfPage: url,
  image: og,
  keywords: post.data.tags.join(", "),
  inLanguage: "en",
};
```

Against Google's list this is in good shape. All five recommended `Article` properties are present. The author is a `Person` with only a name in `name`, a `url` and `sameAs`. `toISOString()` always produces UTC with a `Z`, so the timezone requirement is met without thinking about it. The post's frontmatter date is the same string used in the page and the OG image route, so the three cannot drift. `publisher` is not on Google's recommended list; it is valid schema.org and I see no reason to remove it.

## What would I fix?

**1. The Person block describes the page, not the person.** The `description` property takes the layout's `description` prop. On the home page that is the one-liner. On a blog post it is the post's description, so a machine reading the Person from a post sees a person described as "Which robots.txt tokens decide whether…". Pass a fixed biography to the Person block and let the page description go only into the meta tags and the Article.

**2. Email and telephone are marked up on pages that do not show them.** The home page lists both in its contact section, so there the markup matches visible content. Blog posts show email buttons ("Hire me" in the header, "Email me" in the footer) but no phone number, and the Person block is emitted there with both. Under Google's "visible to readers" rule, the safer shape is a full `Person` only on the home page and, on posts, a reference to it.

**3. The two blocks are not connected.** The Article's `author` repeats a smaller Person with no link to the one beside it. JSON-LD has `@id` for exactly this. Give the home-page Person an `@id` such as `https://mk-comics.vercel.app/#me` and have the Article's `author` and `publisher` point at it. Same entity, one definition.

Two smaller notes. The Person `image` is the site's generic social card (`/og.png`). schema.org defines `image` as "An image of the item", so a headshot is the better value. And `BlogPosting` is an accepted, more specific type than `Article` for posts; both are in Google's list.

## Should a personal home page use ProfilePage?

Possibly, with low expectations. Google's `ProfilePage` page says the markup is "designed for any site where creators (either people or organizations) share first-hand perspectives", and it is aimed at helping Google understand creators in online communities, including its Discussions and Forums feature. It requires a `mainEntity` that is a `Person` or `Organization` with a `name`, and the page's primary focus must be a single person or organisation affiliated with the site. A portfolio home page meets that on paper. Whether it earns anything is not something the documentation promises, and Google repeats that it does not guarantee any rich result. I would add it only after fixing the three items above.

## Hands-on: validate it

Do the check in three layers.

**1. Extract and parse what you actually ship.** Valid-looking source is not the same as valid output. This pulls every JSON-LD block from a live page and fails loudly if one does not parse:

```bash
curl -s https://mk-comics.vercel.app/blog/ai-crawler-guide-robots-llms-txt-structured-data/ \
| python3 -c '
import sys, re, json
html = sys.stdin.read()
blocks = re.findall(r"<script type=\"application/ld\+json\">(.*?)</script>", html, re.S)
print(len(blocks), "JSON-LD blocks")
for b in blocks:
    d = json.loads(b)
    print(d["@type"], "->", sorted(d.keys()))
'
```

If the page's script tag carries extra attributes, adjust the regex. You should see two blocks on a post: `Person` and `Article`. If you add `@id` links later, assert that the Article's author `@id` equals the Person's.

**2. Run the vocabulary check.** Paste the URL or the JSON into the Schema Markup Validator at validator.schema.org. It checks your JSON-LD against schema.org; it is not Google's tool and does not tell you about rich-result eligibility.

**3. Run Google's checks.** Google's introduction says to use the Rich Results Test during development, the URL Inspection tool to confirm Google found the structured data on a page, and the rich result status reports in Search Console to catch "templating or serving issues" after deployment. Because the Person block is generated by a template, the status reports are the check that catches a future change that breaks it on every page at once.

A last habit worth keeping: change the markup in the same commit as the visible content it describes. The guideline says the data must be a true representation of the page, and the only dependable way to keep that true is to generate both from the same source.

## Takeaways

- Google lists no required properties for `Article` and recommends `author`, `datePublished`, `dateModified`, `headline` and `image`. Add those and use ISO 8601 with a timezone.
- Person markup is identity, not ranking. Keep it accurate and keep it to what the page shows.
- A layout-level Person with a per-page `description` is a bug waiting to happen. Give it a fixed bio.
- Connect your entities with `@id` so the author of a post is the same node as the person on the home page.
- Validate three ways: parse what you ship, check the vocabulary, then use Google's tools and Search Console.

For the image half of a post's metadata, see [Open Graph images generated at build with satori](/blog/open-graph-images-generated-at-build-with-satori/).
