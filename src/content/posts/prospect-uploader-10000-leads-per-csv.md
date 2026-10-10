---
title: "Prospect Uploader: 10,000 leads per CSV with validation in every language"
description: "Why EF Academy's lead uploads moved from direct CSV imports to a Lambda and EventBridge pipeline with multilingual validation, email alerts and a Prospect Viewer."
date: 2026-10-10T02:17:00Z
tags: ["AWS Lambda", "EventBridge", "Salesforce", "data validation", "serverless"]
pillar: case-files
related: adr-003-prospect-uploader
sources:
  - title: "AWS docs: What is Amazon EventBridge?"
    url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html"
  - title: "AWS docs: How EventBridge retries delivering events"
    url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html"
  - title: "AWS docs: Using dead-letter queues to process undelivered events in EventBridge"
    url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html"
  - title: "AWS docs: Configure Lambda function timeout"
    url: "https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html"
  - title: "AWS docs: How Lambda handles errors and retries with asynchronous invocation"
    url: "https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html"
  - title: "AWS docs: Writing to Salesforce from AWS Glue (UPSERT and external IDs)"
    url: "https://docs.aws.amazon.com/glue/latest/dg/salesforce-writing-to.html"
draft: false
---

Marketing teams at EF Academy upload prospect lists of 10,000+ rows into Salesforce. The rows come from many countries, in many languages, and a row that fails silently is a lead nobody ever calls. In 2023 I replaced the direct CSV upload with the Prospect Uploader: event-driven AWS Lambda functions on EventBridge, validation of every row, email alerts, and a Prospect Viewer that shows stakeholders what failed and why.

This is the long version of case file 03. The project facts come from that record. The AWS behaviour I describe comes from the current docs, cited, and I mark the parts that are design argument rather than a description of what I shipped.

## What was wrong with uploading CSVs straight into Salesforce?

The record names two failures. Validation failures were invisible until someone noticed missing leads, and there were no multilingual rules. Both come from the same property: a direct upload has no stage between the file and the CRM where anything can be checked, counted or reported.

The second failure is easy to underrate. A 10,000-row file from a campaign in several countries contains names in non-Latin scripts, phone numbers in local formats, and addresses with no resemblance to a US template. A validator written around one locale rejects good rows or, worse, accepts bad ones. "Validate in every language" means the rules are about the data's locale, not the uploader's.

## What did I build?

I built the Prospect Uploader as event-driven Lambda functions on EventBridge. Every row is validated with multilingual rules, email alerts report the result, and a Prospect Viewer surfaces validation failures and lead-quality insights for stakeholders. One upload handles 10,000+ leads.

The record lists the other option, uploading directly, as having "no pipeline to run". It also lists the real cost of the option I chose: another application for one engineer to own. The trade is easy to state: an application I own is a cost I can see and schedule, and a lost lead is a cost nobody sees.

## What do the AWS docs say about the pieces?

EventBridge describes itself as "a serverless service that uses events to connect application components together". Event buses are routers that receive events and deliver them to zero or more targets, which is the shape you want when an upload should fan out to validation, alerting and reporting without those steps knowing about each other.

Three documented behaviours shape the design of any pipeline like this one.

**Delivery retries have limits.** EventBridge's retry page says that by default it retries "for 24 hours and up to 185 times with an exponential back off and jitter". After the attempts are exhausted, "the event is dropped". You can set both values per target.

**Dead-letter queues keep the failures.** The docs recommend a DLQ "to avoid losing events after they fail to be delivered to a target". It is a standard SQS queue, and each message carries attributes such as `ERROR_CODE`, `RETRY_ATTEMPTS` and `EXHAUSTED_RETRY_CONDITION`, which tell you why delivery failed.

**Lambda has a clock.** The default timeout is 3 seconds and the maximum is 900 seconds, 15 minutes. The docs warn that when the timeout is close to a function's average duration, there is "a higher risk that the function times out unexpectedly", and they advise testing with data "at the upper bounds of what is reasonably expected".

That last point is the one that fits this project. The upper bound here is a 10,000-row file.

## What does that imply for a 10,000-row file?

This section is a design argument. The record does not describe how the work was divided, and I am not claiming a specific batch size.

Suppose validating one row takes 50 ms, counting the locale rules and one lookup. That figure is an assumption, so replace it with a measurement. Then:

```text
10,000 rows × 0.050 s  =  500 s for the whole file in one invocation
500 s / 900 s limit    =  55% of the maximum, with no headroom for a slow day
500-row chunks         =  20 events, each about 25 s, each retried on its own
```

One invocation per file runs at more than half the ceiling and fails as a whole when a late row is slow. Twenty chunked events use under 3% of the ceiling each, and a failure costs one chunk of 500 rows instead of the file. The price is bookkeeping: you now need to know when all 20 have finished, so that the summary email goes out once and says something true.

## How do you stop retries from creating duplicates?

Lambda's docs are direct about this for asynchronous invocation: "it's possible for it to receive the same event from Lambda multiple times because the queue itself is eventually consistent", and you should "ensure that your function code gracefully handles duplicate events". By default, if a function returns an error, Lambda runs it two more times.

For a lead pipeline, a duplicate event must not create a duplicate lead. The standard answer is an idempotency key: a stable identifier built from the upload id and the row number, written to Salesforce as an external ID so the write is an upsert. The AWS Glue docs for the Salesforce connector state the same dependency: when you use UPSERT, "the `ID_FIELD_NAMES` option must be provided to specify the external ID field". The mechanics belong to Salesforce; the lesson is that a safe re-run needs a key you control.

## What does the validation step look like?

Here is a handler skeleton. It is a design sketch, not the code that shipped. It shows the invariant I would test first: every row ends up counted as accepted or rejected, never lost.

```ts
type Row = { rowNumber: number; [field: string]: string | number };
type Result = { rowNumber: number; ok: boolean; reasons: string[] };

export async function handler(event: { uploadId: string; locale: string; rows: Row[] }) {
  const results: Result[] = event.rows.map((row) => {
    const reasons = validate(row, event.locale); // locale-aware rules: scripts, phone, address
    return { rowNumber: row.rowNumber, ok: reasons.length === 0, reasons };
  });

  const accepted = results.filter((r) => r.ok);
  const rejected = results.filter((r) => !r.ok);

  // Invariant: nothing silently dropped.
  if (accepted.length + rejected.length !== event.rows.length) {
    throw new Error("row accounting mismatch");
  }

  await upsertLeads(event.uploadId, accepted); // key: `${uploadId}:${rowNumber}` as the external ID
  await saveFailures(event.uploadId, rejected); // what the Prospect Viewer reads
  return { uploadId: event.uploadId, accepted: accepted.length, rejected: rejected.length };
}
```

Attach a dead-letter queue and a retry policy to the EventBridge target, with limits that match how long a marketing user will wait. The sketch below uses the CLI shape from memory; check the docs for the exact parameter names.

```bash
aws events put-targets --rule prospect-chunk-validate --targets '[{
  "Id": "validate",
  "Arn": "arn:aws:lambda:REGION:ACCOUNT:function:validate-chunk",
  "RetryPolicy": { "MaximumRetryAttempts": 10, "MaximumEventAgeInSeconds": 3600 },
  "DeadLetterConfig": { "Arn": "arn:aws:sqs:REGION:ACCOUNT:prospect-dlq" }
}]'
```

An hour is a sensible ceiling for this kind of workflow. The default of 24 hours means a lead might be processed a day after the campaign it belonged to.

## Why a Prospect Viewer and email alerts?

The alerts and the Viewer answer one failure: invisibility. An email tells someone that a file needs attention while it is still fresh. The Viewer holds the detail for stakeholders: which rows failed, which rule they broke, and what the upload says about lead quality. The record frames the Viewer as the place where stakeholders get "validation failures and lead-quality insights".

A pipeline that rejects a row is working. A pipeline that rejects a row and tells no one has only moved the problem. For people who live in Salesforce, the report is the product.

## Takeaways

- Put a stage between the file and the CRM. If nothing can check, count or report, failures stay invisible.
- Test at the upper bound. A 10,000-row file against a 900-second ceiling is a calculation to do before launch, with a measured per-row time.
- Assume events arrive twice. Build an idempotency key from the upload id and row number and write it as an external ID.
- Configure the retry policy and a dead-letter queue deliberately. The defaults are 24 hours and 185 attempts, and after that the event is dropped.
- Count rows in and rows out, and make the mismatch an error.

For a later project for the same organisation, which replaced a licensed pipeline before its contract ended, see the case file on replacing TIBCO Scribe with AWS Glue.
