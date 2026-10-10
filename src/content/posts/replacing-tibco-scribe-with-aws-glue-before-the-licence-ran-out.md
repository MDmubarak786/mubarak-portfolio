---
title: "Replacing TIBCO Scribe with AWS Glue before the licence ran out"
description: "How I moved EF Academy's Salesforce pipelines off a $24,000-a-year Tibco Scribe licence onto AWS Glue before it expired: the options, the plan, the cutover, $840."
date: 2026-10-10T02:15:00Z
tags: ["AWS Glue", "TIBCO", "migration", "cost", "Salesforce"]
pillar: case-files
related: adr-001-tibco-to-aws-glue
sources:
  - title: "AWS docs: What is AWS Glue?"
    url: "https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html"
  - title: "AWS Glue pricing (DPU-hour rate)"
    url: "https://aws.amazon.com/glue/pricing/"
  - title: "AWS docs: AWS Glue triggers (scheduled, conditional, on-demand)"
    url: "https://docs.aws.amazon.com/glue/latest/dg/about-triggers.html"
  - title: "AWS docs: Monitoring AWS Glue"
    url: "https://docs.aws.amazon.com/glue/latest/dg/monitor-glue.html"
  - title: "AWS docs: Writing to Salesforce from AWS Glue (current connector)"
    url: "https://docs.aws.amazon.com/glue/latest/dg/salesforce-writing-to.html"
draft: false
---

In 2024 I replaced a licensed Tibco Scribe integration layer with AWS Glue for EF Academy. The licence cost $24,000 a year and had an end date, and the pipelines it ran fed daily operations. The Glue version cost $840 a year and went live before the contract ended, which is the number I get asked about. The part worth writing down is how it finished on time.

This is the long version of case file 01. Everything about the project itself comes from that record. Where I describe what AWS Glue does today, I cite the AWS docs and say so; the connector pages I cite are current, not a description of the 2024 jobs.

## What was the problem?

EF Academy's Salesforce integrations and data transformations ran on Tibco Scribe. The licence ran at $24,000 a year, and it ended on a date nobody could move. I was the sole developer on the platform, so there was no one to hand a migration to and no team to absorb a slip.

Two constraints defined the project. The first was the deadline: the replacement had to finish before the contract ran out. The second was continuity: the pipelines fed daily operations, so a gap of even a few days would be felt by people who never heard of Scribe.

A fixed end date changes how you plan. It removes the option of doing this "when there is time", and it also gives you something most migrations lack, which is a deadline nobody argues with.

## What were the options?

I laid out two options with their trade-offs.

**Renew the Tibco Scribe licence.** The upside was no migration risk and tooling the teams already knew. The cost was $24,000 a year, every year, and a ceiling set by licensing rather than engineering: what the pipelines could do depended on what the licence allowed.

**Rebuild the integration layer on AWS Glue.** The upside was pay-per-run serverless jobs inside the AWS account EF Academy already used, and pipelines that became code the team owned and could extend. The cost was a hard deadline fixed by the licence end date, and the fact that every existing pipeline had to be re-specified and verified against live data.

I chose the rebuild. Renewing was the safe option for one year and the expensive option for every year after. Rebuilding was the risky option exactly once, and the risk had a schedule I could manage.

## What does AWS Glue give you for this job?

The AWS docs describe Glue as "a serverless data integration service", with "no infrastructure to manage" and "pay-as-you-go billing". For an integration layer, three features carry the weight.

**Triggers.** A Glue trigger can start jobs on demand, on a schedule, or on a condition. Scheduled triggers use cron constraints. Conditional triggers watch other jobs and fire on their end state, such as succeeded, failed or timed out, which is how you chain a load that must run only after a transform succeeds. Dependent jobs start only if the upstream job was itself started by a trigger, and every job in a chain must descend from one scheduled or on-demand trigger.

**Monitoring.** The docs list CloudWatch Events, CloudWatch Logs and CloudTrail as the automated tools, plus per-job metrics in the console. For a pipeline that feeds daily operations, a failed run has to be visible the same day. The docs' monitoring pages are where you decide how.

**A Salesforce connector.** If your pipelines end in Salesforce, the current Glue docs list four write operations: INSERT, UPSERT, UPDATE and DELETE. UPSERT requires you to name an external ID field through the `ID_FIELD_NAMES` option. There is also a `FAIL_ON_FIRST_ERROR` option, which defaults to false, meaning the job carries on past failed records. I would set it deliberately, whichever way. This is the connector as documented today, and I am not claiming it is how the 2024 jobs were written.

## What was the plan?

The plan was three habits, all of them boring.

**Clear steps.** The migration was broken into clear steps, so that at any point there was a next piece to finish and check.

**Progress shared every week.** The people depending on the pipelines saw where the work stood at the end of each week, not at the end of the project. That is how a sole developer avoids a surprise in the last month: nobody gets a surprise because nobody is kept in the dark.

**Every pipeline re-specified and verified against live data.** I did not port Scribe configurations line by line. Each pipeline was written down again as a specification, built in Glue, and checked against live data before it was trusted.

The check I would write down for any such pipeline is short. For one run, compare row counts at source and destination. Compare a sample of records field by field. Compare the failures: which records were rejected, and why. Re-running a pipeline on the same input should give the same result, so the check includes a second run. A pipeline that fails any of the four does not move to cutover.

## How did the cutover go?

It finished before the Tibco contract ended, and daily operations were not disrupted. John Squier, Director of Educational Technology at EF Academy, put it this way: "The entire migration finished on time, before our Tibco contract ended, and with no disruption to our daily operations."

The weekly updates and the per-pipeline verification are the reason that sentence could be written. A cutover with no disruption is the visible result of weeks of unglamorous checking before it.

## What did it cost?

The annual integration cost went from $24,000 to $840. That is a 96.5% cut: ($24,000 − $840) ÷ $24,000 = 0.965. EF Academy's VP of Technology, Jason Wheeler, counts the licensing fees as $30,000 a year. I use $24,000 for the percentage because that is the figure on the record; his $30,000 is his own accounting of the licensing, and I do not know how it splits.

For a feel of what $840 means in Glue terms, here is an illustration at list price, not the actual bill. The Glue pricing page says "The price of 1 DPU-hour is $0.44", and one DPU provides 4 vCPU and 16 GB of memory. If the whole $840 were Glue compute at that rate:

```text
$840 / $0.44 per DPU-hour  =  about 1,909 DPU-hours a year
1,909 / 365                =  about 5.2 DPU-hours a day
```

Five DPU-hours a day is a modest amount of compute for daily pipelines, which is the point: jobs billed by the run cost almost nothing when they are not running, while a licence costs the same in a quiet month as in a busy one. The pricing page also bills ETL jobs "by the second", so short jobs are cheap jobs.

## Hands-on: renew or rebuild?

If you are in the same position, the decision reduces to one formula:

```text
payback (years) = rebuild cost / (annual licence − annual run cost)
```

With a $24,000 licence and an $840 run cost, the denominator is $23,160 a year, so a rebuild that costs the equivalent of $23,160 of engineering pays back in a year, and one that costs half of it in six months. Put your own engineering cost in the numerator and be honest about it. Then add the cost that does not appear in the formula: what a failed cutover costs the business per day, because that sets how much verification you can afford to skip. The answer is none.

## Takeaways

- Treat the licence end date as the project deadline and work backwards from it on day one.
- Lay out renew versus rebuild with the costs of each, in writing, before anyone argues. The $24,000-a-year line is easier to defend than a feeling.
- Re-specify each pipeline instead of porting it. The act of writing it down again is where the old pipeline's hidden behaviour shows up.
- Verify against live data, not test data. Volume and odd records are where migrations fail.
- Share progress weekly. It is the cheapest risk control a sole developer has.

For another platform I owned as the only engineer, see the case file on running a 23-language marketing site on Next.js and Storyblok.
