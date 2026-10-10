---
title: "Running a 23-language Next.js and Storyblok site as the only engineer"
description: "EF Academy's marketing site serves 1.25M+ monthly users in 23+ languages with one engineer. The decision that mattered: let content teams run localisation themselves."
date: 2026-10-10T02:16:00Z
tags: ["Next.js", "Storyblok", "i18n", "localisation", "sole engineer"]
pillar: case-files
related: adr-002-ef-academy-multilingual-platform
sources:
  - title: "Storyblok docs: internationalization (field-, folder- and space-level translation)"
    url: "https://www.storyblok.com/docs/concepts/internationalization"
  - title: "Storyblok Content Delivery API: retrieve multiple stories (language, fallback_lang)"
    url: "https://www.storyblok.com/docs/api/content-delivery/v2/stories/retrieve-multiple-stories"
  - title: "Storyblok Export app (translation tool handoff)"
    url: "https://www.storyblok.com/apps/export"
  - title: "Next.js docs: internationalization (routing, dictionaries, static rendering)"
    url: "https://nextjs.org/docs/app/guides/internationalization"
draft: false
---

EF Academy's primary digital presence is a high-traffic marketing site on Next.js and Storyblok, with Salesforce and AWS integrations behind it. It serves 1.25M+ monthly users in 23+ languages, and for the time I worked on it I was the sole engineer. The decision that kept that sustainable was not a framework choice. It was moving localisation out of my queue and into a workflow the content teams could run themselves.

This is the long version of case file 02. The project facts come from that record. The Next.js and Storyblok material comes from their current documentation, and I say where it is the docs talking rather than a description of what I shipped.

## What was the problem with one engineer and 23 languages?

Every localisation project that needed an engineer in the loop slowed the content teams down. With one engineer, that made me the bottleneck for 23+ languages, and it meant content teams could not plan launches on their own timeline.

A hypothetical shows why this does not scale. Say the team launches ten new pages a month. Each needs a translation into 22 other languages, which is 220 translation tasks a month. Even at ten minutes of engineering attention each, that is more than 36 hours a month spent shuffling content rather than improving the platform. The numbers are invented; the shape is not. The work grows with the number of languages multiplied by the number of pages, while engineering capacity stays at one.

## What were the options?

The record lists two.

**Keep localisation as an engineering request.** There was nothing new to build or support. The cost was the bottleneck above.

**Build a translation workflow inside Storyblok.** The upside was that content teams run localisation projects autonomously, and translations live next to the content they translate. The cost was that the workflow and its validation had to be built and documented for non-engineers.

I chose the second. The effort moved from doing each translation to building the system once, and the engineering time it freed went to performance, SEO and integrations, which are the parts of a site this size that only an engineer can do.

## What does Storyblok give you for localisation?

Storyblok's internationalization docs describe three models. Field-level translation keeps multiple language versions inside one story: "Storyblok supports multiple language versions of each story." Folder-level translation uses "separate, dedicated folders for each language", so structure and component order can differ per locale. Space-level translation uses multiple spaces for large projects where regions or editing teams need autonomy. You can also combine the first two.

The record does not say which of these models the platform used, so I will not claim one. What it does say, "translations live next to the content they translate", is the property field-level translation is designed to give you. The choice follows from one question: do your locales share a page structure? If they do, one story with translatable fields is cheaper to keep in sync. If a market needs a different layout, folders let it diverge, at the price of duplicated content.

On the delivery side, the Content Delivery API takes a `language` parameter, which "accepts any language code configured in the Storyblok space", and a `fallback_lang` parameter to "handle untranslated fields". One gotcha from the docs is worth remembering: fallback codes use underscores, so `es_co`, not `es-co`. A site with 23+ locales will meet that bug eventually.

For handing text to translators, Storyblok publishes an Export app described as "Export content items for usage in translation tools". The app page says it requires the Premium plan. I mention it as an option the platform offers, not as part of this project.

## How should the front end handle 23 languages?

The current Next.js internationalization guide recommends picking a locale from the browser's `Accept-Language` header, redirecting in a proxy when the path has no locale, and nesting every route under `app/[lang]`. It says routing can be internationalised "by either the sub-path (`/fr/products`) or domain". This is today's documented pattern, version 16.4 of the docs; it is not a transcript of the 2023 code.

For static rendering, the guide uses `generateStaticParams` to list the locales, and `hasLocale` to return a 404 "rather than a runtime error" when a locale is unknown. The consequence for a 23-language site is arithmetic: say 200 pages in 23 locales is 4,600 static pages. That is a build-time cost, and it is why a content change should trigger one targeted rebuild, not a nightly full one.

## What should you automate first?

This part is a design argument rather than a record of what I built, but it follows from the constraint. If I were handing a localisation workflow to a content team again, the order would be:

1. **A coverage report per locale.** Before anyone publishes, show which pages are missing a translation and which would fall back to the default. Content teams make better decisions when the gap is visible.
2. **Validation at publish time.** The record lists "workflow and validation" as the work that had to be built. Catch empty required fields, broken links and wrong-script text before they reach 1.25M users.
3. **Rebuild on publish.** Wire a Storyblok publish event to a build hook so nobody asks an engineer to "push the Spanish page live".
4. **Hreflang and sitemaps per locale.** Search engines need to know which page is the French version of which. This is the SEO work the freed time paid for.
5. **Monitoring that tells you about a broken locale before a user does.**

The first item matters most. Autonomy without visibility just moves the bottleneck from the engineer to whoever notices the mistakes.

## Hands-on: a locale-aware page in Next.js

A page skeleton following the documented pattern, with a Storyblok fetch that sets `language` and `fallback_lang`. Check the docs for the base URL and token handling for your region, since the endpoint differs by region.

```tsx
// app/[lang]/[...slug]/page.tsx
import { notFound } from "next/navigation";

const LOCALES = ["en", "de", "es", "es_co", "fr"]; // your 23+ configured language codes
const DEFAULT = "en";

const hasLocale = (l: string) => LOCALES.includes(l);

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

async function getStory(slug: string, lang: string) {
  const url = new URL(`https://api.storyblok.com/v2/cdn/stories/${slug}`); // check the docs for your region's base URL
  url.searchParams.set("token", process.env.STORYBLOK_TOKEN!);
  url.searchParams.set("language", lang);
  url.searchParams.set("fallback_lang", DEFAULT);
  url.searchParams.set("version", "published");
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()).story;
}

export default async function Page({ params }: PageProps<"/[lang]/[...slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const story = await getStory(slug.join("/"), lang);
  if (!story) notFound();
  return <main lang={lang.replace("_", "-")}>{/* render story.content blocks */}</main>;
}
```

Two details in that sketch are deliberate. The Storyblok codes use underscores while the HTML `lang` attribute needs hyphens, so the page converts at the boundary. And a missing story returns a 404 instead of an empty shell, because a blank localised page indexed by a search engine is worse than no page.

## Takeaways

- Count the work as languages multiplied by pages. If an engineer sits in that product, you have a queue, not a platform.
- Build the localisation workflow once and document it for people who are not engineers. Minon Weber of EF wrote of me that "He makes complex things easy to understand and explains them clearly and calmly", and a workflow that needs a developer to explain it has not removed the bottleneck.
- Put the freed engineering time where only an engineer can add value: performance, SEO, integrations.
- Give content teams visibility into coverage and errors, not only autonomy.
- Treat locale codes as data with a documented format, and test the unusual ones early.

Julieta Capogna, Senior Designer at EF Academy, wrote of me that "He consistently finds ways to bridge the gap between design and development smoothly", which is the right frame: a localisation workflow is a design problem for non-engineers before it is an engineering one.

For a serverless pipeline from the same period, see the case file on Prospect Uploader and its 10,000 leads per CSV.
