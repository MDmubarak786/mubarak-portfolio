---
title: "AWS Glue for AI data pipelines: lessons from replacing TIBCO"
description: "What replacing a $24,000-a-year TIBCO Scribe licence with AWS Glue taught me, how Glue pricing really works, and how Glue jobs prepare data for model pipelines."
date: 2026-10-10T02:03:00Z
tags: ["AWS Glue", "data pipelines", "TIBCO", "Salesforce", "cost optimisation", "ETL"]
pillar: case-files
related: adr-001-tibco-to-aws-glue
sources:
  - title: "AWS Glue docs: what is AWS Glue?"
    url: "https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html"
  - title: "AWS Glue pricing"
    url: "https://aws.amazon.com/glue/pricing/"
  - title: "AWS Glue pricing, EU mirror (job minimums, default DPUs)"
    url: "https://aws.eu/glue/pricing/"
  - title: "AWS Glue docs: writing to Salesforce"
    url: "https://docs.aws.amazon.com/glue/latest/dg/salesforce-writing-to.html"
  - title: "AWS Glue docs: joining and relationalizing data (code sample)"
    url: "https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-python-samples-legislators.html"
  - title: "AWS Step Functions docs: start an AWS Glue job"
    url: "https://docs.aws.amazon.com/step-functions/latest/dg/connect-glue.html"
  - title: "AWS Step Functions docs: what is Step Functions (integration patterns)"
    url: "https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html"
draft: false
---

At EF Academy the Salesforce integrations and data transformations ran on a licensed TIBCO Scribe pipeline that cost $24,000 a year and had an end date. I replaced it with AWS Glue before the contract ended. The annual cost went from $24,000 to $840, a 96.5% cut. This post is the migration lessons, a plain account of how Glue is priced, and how the same service becomes the preparation stage for a model pipeline.

## What was the migration, exactly?

The facts, from the [case file](/#file-adr-001-tibco-to-aws-glue). The Scribe pipelines fed daily operations, so the replacement had to finish before the licence ran out and could not interrupt the business. The choice was between renewing, which meant no migration risk and tooling the teams already knew but $24,000 every year with licensing setting the ceiling on what the pipelines could do, and rebuilding on Glue. I was the sole developer on the platform. The rebuild was broken into clear steps with progress shared regularly, and it cut over before the Tibco contract ended with no disruption to daily operations. The VP of Technology counts the licensing fees at $30,000 a year; the 96.5% figure uses the $24,000 on the licence.

The downsides of choosing Glue were real and I list them because they are the lessons: a hard deadline fixed by the licence end date, and every existing pipeline had to be re-specified and verified against live data.

## What did it teach me?

These are the lessons I take from it into the next migration.

1. **Work back from the contract date.** When a licence ends, the date is the project plan. Everything else, including the order of pipelines, follows from it.
2. **Re-specify before you re-implement.** Every existing pipeline had to be re-specified, and I count that as a cost of the move, not a detour. A written description per pipeline is the only way to know what "equivalent" means.
3. **Verify against live data, not samples.** The pipelines fed daily operations, and a sample that passes proves little about the odd record that appears on Thursday. My design preference, argued rather than measured here, is to run old and new side by side on real inputs and compare outputs before cutting over.
4. **Share progress in small steps.** I broke the work into clear steps and shared progress regularly, which suits a migration with one developer and many people depending on the result.
5. **Turn the pipeline into code.** One consequence I value beyond the saving: the pipelines became code the team owns and can extend, instead of configuration bounded by someone else's licence.

## How is Glue actually priced?

I would not trust anyone's single number for this, including mine, so here is the structure from AWS's pricing pages. I fetched the US page, and the EU mirror of it for the job minimums; the EU page quotes euros, and AWS says pricing varies by region.

| Item | What the pricing pages say |
|---|---|
| ETL job run | $0.44 per DPU-hour, billed per second |
| Billing floor | A 1-minute minimum per run |
| Spark job size | A minimum of 2 DPUs; the EU page gives a default of 10 DPUs per Spark job |
| Flex execution | For non-SLA-sensitive jobs; the page's example works out to $0.29 per DPU-hour |
| Crawlers | $0.44 per DPU-hour, billed per second |
| Data Catalog | First 1 million objects and first 1 million requests a month free, then $1.00 per 100,000 objects |

A DPU-hour is the unit; you pay for how many DPUs run for how long. The floor for one Spark run is 2 DPUs for 1 minute, about $0.015. A daily job at the default 10 DPUs for 20 minutes is 10 × (1/3) = 3.33 DPU-hours, about $1.47 a run and roughly $535 a year.

Those are illustrations of the shape. They are not a breakdown of the real jobs, and I will not pretend $840 decomposes neatly. What the arithmetic does show is the contrast. A licence costs $24,000 whether or not a pipeline ran. At list price $840 buys about 1,900 DPU-hours a year. Pay-per-run only wins when your runs are bounded, so measure DPU-hours for a month before you promise a saving.

## How do Glue jobs feed model pipelines?

AWS describes Glue as "a serverless data integration service" for discovering, preparing, moving and integrating data, and several of its features are what an LLM pipeline needs before the model sees anything:

- **Cleaning and deduplication.** The docs describe `FindMatches`, a built-in machine-learning transform that "deduplicates and finds records that are imperfect matches for each other". Duplicate rows become duplicate embeddings and duplicate model bills.
- **Sensitive data detection.** Glue lets you "define, identify, and process sensitive data" in the pipeline, which is the right place to mask or drop it before it goes to any external model.
- **A curated landing zone.** The docs' own sample writes joined data to S3 as Parquet. A curated Parquet copy is a clean input for embedding or classification jobs downstream.
- **Orchestration.** Glue has triggers and workflows. For bigger pipelines, Step Functions supports the Run a Job `.sync` pattern for Glue on Standard workflows, so a state machine can start a job, wait for it, then fan the output to a queue of model calls; the [serverless LLM pipeline post](/blog/serverless-llm-pipelines-aws-lambda-step-functions/) covers that second half.

The division of labour I would defend: Glue does the bulk, deterministic work (join, clean, dedupe, mask, validate) because it is cheap and replayable, and models see only the rows that survive. It is also where I would put checks that need no model at all.

## Hands-on: prepare, land, write back

A Glue PySpark job in the documented shape: read from the Data Catalog, drop and rename fields, write Parquet to S3, then upsert to Salesforce through the Glue connector. The catalog names, bucket and connection are yours.

```python
from pyspark.context import SparkContext
from awsglue.context import GlueContext

glueContext = GlueContext(SparkContext.getOrCreate())

leads = glueContext.create_dynamic_frame.from_catalog(
    database="crm_raw", table_name="leads")           # your catalog names

leads = leads.drop_fields(["internal_notes"]).rename_field("Id", "source_id")

leads_for_salesforce = leads.select_fields(["source_id", "Source_Key__c"])   # fields the target object takes

# 1) Curated Parquet copy for downstream embedding / classification
glueContext.write_dynamic_frame.from_options(
    frame=leads,
    connection_type="s3",
    connection_options={"path": "s3://my-bucket/curated/leads/"},
    format="parquet",
)

# 2) Upsert back to Salesforce with the Glue connector
glueContext.write_dynamic_frame.from_options(
    frame=leads_for_salesforce,                       # defined above: a frame shaped for the target object
    connection_type="salesforce",
    connection_options={
        "connectionName": "my-salesforce-connection",
        "ENTITY_NAME": "Lead",
        "API_VERSION": "v60.0",                       # value from the docs example
        "WRITE_OPERATION": "UPSERT",
        "ID_FIELD_NAMES": "Source_Key__c",            # check the docs for the exact value format
        "TRANSFER_MODE": "ASYNC",
        "FAIL_ON_FIRST_ERROR": "false",
    },
)
```

The Salesforce connector supports four write operations, INSERT, UPSERT, UPDATE and DELETE, and an UPSERT needs `ID_FIELD_NAMES` to name the external ID field. `TRANSFER_MODE` defaults to `SYNC`; setting `ASYNC` uses Bulk API 2.0 Ingest. `FAIL_ON_FIRST_ERROR` defaults to false, meaning the job keeps going past failed records. I would keep it false for large loads and alert on the failure count, because stopping a 10,000-row load at row 12 helps nobody. For the failure-handling pattern behind that, see [AI in Salesforce integrations](/blog/ai-in-salesforce-integrations-enrichment/).

The orchestration step, copied from the Step Functions docs' Glue example. Check the docs for how your state machine declares its query language, since the `Arguments` field belongs to JSONata-style definitions:

```json
"Glue StartJobRun": {
  "Type": "Task",
  "Resource": "arn:aws:states:::glue:startJobRun.sync",
  "Arguments": {
    "JobName": "curate-leads"
  },
  "Next": "ValidateOutput"
}
```

The `.sync` suffix means Step Functions waits for the job to finish before moving to `ValidateOutput`, which should be a cheap check that the Parquet output exists and the row count is sane before any model sees it.

## Takeaways

- A migration deadline set by a contract is the plan; work back from it.
- Re-specify each pipeline, then verify against live data before cutting over.
- Glue is billed per DPU-hour per second with a 1-minute floor; estimate from DPU-hours, not from list prices alone.
- Use Glue for the deterministic work before a model pipeline: dedupe, mask, validate, land as Parquet.
- Keep upserts keyed on an external ID and alert on failed-record counts rather than stopping at the first error.

The full decision record, with the options considered and what each cost, is in the [TIBCO to AWS Glue case file](/#file-adr-001-tibco-to-aws-glue).
