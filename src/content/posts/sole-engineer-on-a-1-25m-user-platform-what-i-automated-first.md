---
title: "Sole engineer on a 1.25M-user platform: what to automate first"
description: "EF Academy's marketing platform serves 1.25M+ monthly users in 23+ languages with one engineer. How I rank automation: bottlenecks first, silent failures next, licences."
date: 2026-10-10T02:23:00Z
tags: ["solo engineer", "automation", "ownership", "Storyblok", "AWS Glue"]
pillar: case-files
related: adr-002-ef-academy-multilingual-platform
sources:
  - title: "Google SRE Book: Eliminating Toil"
    url: "https://sre.google/sre-book/eliminating-toil/"
  - title: "Storyblok docs: Internationalization (field, folder and space level translation)"
    url: "https://www.storyblok.com/docs/concepts/internationalization"
  - title: "Storyblok docs: Import translatable fields app (XML and JSON workflow)"
    url: "https://www.storyblok.com/docs/apps/import-translatable-fields"
  - title: "AWS docs: What is AWS Glue?"
    url: "https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html"
  - title: "AWS docs: Configure Lambda function timeout"
    url: "https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html"
draft: false
---

When you are the only engineer on a platform with 1.25M+ monthly users, you do not have a backlog problem. You have a queue of people who are waiting on you. EF Academy's primary digital presence is a multilingual marketing site built on Next.js and Storyblok, with Salesforce and AWS integrations, serving 23+ languages, and I was its sole engineer. This post is the long version of case file 02, framed as the question I get asked most: with no one to hand work to, what do you automate first?

A caveat on the title. My case files record what I built (a translation workflow, a Glue migration, a lead uploader), not the order I did it in, and I will not retrofit a neat chronology. What I can give you is the ranking I would defend, with each rule tied to something the records show.

## What does "sole engineer" actually mean here?

The platform is a high-traffic marketing site that one engineer maintains and evolves. I built its AWS integration layer. Around it sat three pieces of work that the case files describe: a translation workflow inside Storyblok, a replacement of a licensed integration pipeline with AWS Glue, and a serverless uploader for marketing lead lists.

The central problem in the record is not traffic. It is people waiting. Every localization project that needed an engineer in the loop slowed the content teams down, and with 23+ languages "one engineer became the bottleneck". Content teams could not plan launches on their own timeline.

That is the first thing sole ownership teaches you. Your throughput is a shared resource, and every request that routes through you borrows from everyone else's schedule.

## Rule one: automate the thing that makes you the bottleneck

The decision in case file 02 was to let content teams run localization themselves inside Storyblok. The alternative, keeping localization as an engineering request, had one real advantage: no new tooling to build or support. It also had the cost described above.

So the decision was to build a translation workflow in Storyblok that content teams could run end to end, and to keep engineering effort on performance, SEO and integrations. The record is honest about the price: "Workflow and validation had to be built and documented for non-engineers." I found a translation tool for Storyblok and rolled it out with the team, and the client wrote to say thanks.

Storyblok's documentation shows why this is feasible. It describes three approaches. Field-level translation keeps all language versions in one story and suits content whose structure is "similar or identical" across languages. Folder-level translation gives each locale its own top-level folder and suits locales that need different structures. Space-level translation separates spaces and fits large projects with regional or team autonomy. You can combine field-level and folder-level. For a content team, the right choice is the one that lets them finish a language without a developer, and the tooling around it matters as much as the model: Storyblok's Export and Import apps, for instance, move translatable fields through XML or JSON files to a translation tool and back, in steps the page lists, and the page notes the Management API can run those steps programmatically.

The rule underneath: if a request type arrives every week and only you can fulfil it, build the self-service version before you build anything else. It unblocks the largest number of people for the least ongoing effort.

## Rule two: automate what fails silently

Case file 03 is the Prospect Uploader. Marketing teams upload prospect lists of 10,000+ rows into Salesforce, from many countries, so validation has to understand multilingual data. The record's context sentence is the whole argument: "a silent failure means lost leads".

Uploading CSVs directly into Salesforce was the alternative, with no pipeline to run, but "validation failures were invisible until someone noticed missing leads". We built event-driven AWS Lambda functions on EventBridge that validate every row with multilingual rules, alert by email, and give stakeholders a Prospect Viewer for failures and insights. The consequence recorded is 10,000+ leads per upload, with failures surfaced instead of hidden. The client's reaction was "Wow".

The Lambda documentation gives the kind of limit you design against. A function's timeout defaults to 3 seconds and can be raised to a maximum of 900 seconds (15 minutes), and the page warns that a timeout close to the average duration risks unexpected timeouts. Ten thousand rows is a modest file, but a bulk step should always be sized against the ceiling with realistic data, because the docs advise testing "at the upper bounds of what is reasonably expected". That is an argument about any bulk job, not a record of how ours was tuned.

The rule: a task that fails invisibly is worse than a task that is slow. Make failure loud before you make anything fast.

## Rule three: automate what has a hard deadline or a recurring bill

Case file 01 is the Tibco Scribe replacement. EF Academy's Salesforce integrations and data transformations ran on a licensed pipeline that cost $24,000 a year and had an end date. The options were to renew (no migration risk, but $24,000 every year, and licensing set the ceiling on what the pipelines could do) or to rebuild on AWS Glue.

We rebuilt on Glue, "broken into clear steps with progress shared regularly", and cut over before the contract ended with no disruption to daily operations. The annual cost went from $24,000 to $840, a 96.5% saving. The VP of Technology counts the licensing fees at $30,000 a year. The cons are in the record too: a hard deadline fixed by the licence end date, and every existing pipeline had to be re-specified and verified against live data.

AWS describes Glue as "a serverless data integration service" with "no infrastructure to manage" and pay-as-you-go billing, which is why the cost line could fall so far: you pay for runs, not for a licence. The check is simple arithmetic: 840 / 24,000 = 3.5%, so the saving is 96.5%.

The rule: deadlines and fixed licence costs are the one category where the calendar, not you, sets the priority. When one appears, it goes to the front.

## What about saying no, and monitoring?

The case file for the uploader lists a cost I take seriously: "Another application for one engineer to own." Every automation you ship is a thing you now operate. For a sole engineer, the test is not "can I automate this?" but "does this remove more owned surface than it adds?"

I would add monitoring to that list as an argument, not a claim about what ran at EF Academy: the more you automate, the more you need the automation to tell you when it breaks. The Prospect Viewer is the version of that I can point to, because it is monitoring built for the people who care about the result.

Google's SRE book gives a useful vocabulary. Toil is work that is "manual, repetitive, automatable, tactical, devoid of enduring value", and tends to scale linearly with the service. The book recommends keeping toil below 50% of an engineer's time. As a sole engineer you have no team to average that over, so the discipline is stricter. Anything that scales with languages, users or uploads and is done by hand is a candidate. Anything novel or one-off is not.

## Hands-on: a ranking you can run

Here is the worked version of the three rules: score each candidate by what it frees up, how badly it fails if left alone, and what it costs you to keep. The weights are mine and illustrative, so change them for your platform.

```python
def score(c):
    """Higher = automate sooner. All hours are per month."""
    blocking = c["people_waiting"] * c["hours_waiting_each"]   # rule one
    silent = 40 if c["fails_silently"] else 0                  # rule two
    deadline = 60 if c["hard_deadline"] else 0                 # rule three
    recurring = c["annual_cost_usd"] / 1000                    # rule three, as hours-equivalent
    upkeep = c["hours_to_operate_per_month"]                   # the "no" test
    return blocking + silent + deadline + recurring - 2 * upkeep

candidates = [
    {"name": "self-serve translation", "people_waiting": 12, "hours_waiting_each": 6,
     "fails_silently": False, "hard_deadline": False, "annual_cost_usd": 0, "hours_to_operate_per_month": 3},
    {"name": "validated CSV uploader", "people_waiting": 4, "hours_waiting_each": 2,
     "fails_silently": True, "hard_deadline": False, "annual_cost_usd": 0, "hours_to_operate_per_month": 4},
    {"name": "licence replacement", "people_waiting": 0, "hours_waiting_each": 0,
     "fails_silently": False, "hard_deadline": True, "annual_cost_usd": 24000, "hours_to_operate_per_month": 2},
]
for c in sorted(candidates, key=score, reverse=True):
    print(f"{score(c):6.1f}  {c['name']}")
```

The numbers in the candidates are placeholders to show the mechanics, not measurements from EF Academy. What matters is the shape. The upkeep term is doubled on purpose, because for one engineer the cost of owning something is the cost you cannot offload. If a candidate scores badly after upkeep, the answer is no, and that is the discipline that stops a solo engineer from automating themselves into an on-call rota.

## Takeaways

- Sole ownership turns your time into a shared resource. Automate the request that blocks the most people first; at EF Academy that was localization across 23+ languages.
- Make failure loud before you make anything fast. A silent failure in a lead pipeline means lost leads.
- A fixed deadline or recurring licence jumps the queue. Replacing a $24,000-a-year licence with $840 of pay-per-run jobs is a 96.5% cut and a hard stop date at once.
- Count upkeep honestly. Every automation is another application for one engineer to own, so it has to remove more than it adds.
- Write down the self-service version for non-engineers. The cost of the translation workflow was documenting it for the people who would run it.

The decision record behind all of this is case file 02, "Localization in Storyblok", and the pipeline migration it sits beside is case file 01, "Tibco to AWS Glue".
