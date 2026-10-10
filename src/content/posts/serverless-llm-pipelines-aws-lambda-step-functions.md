---
title: "Serverless LLM pipelines on AWS: Lambda, Step Functions, SQS and the timeout problem"
description: "Lambda's 15-minute cap is rarely the real limit for LLM work. Queue sizing, partial batch failures, Step Functions retries and idempotency for pipelines that call models."
date: 2026-10-10T02:02:00Z
tags: ["AWS Lambda", "Step Functions", "SQS", "LLM", "idempotency", "serverless"]
pillar: building
related: adr-003-prospect-uploader
sources:
  - title: "AWS Lambda docs: configure function timeout"
    url: "https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html"
  - title: "AWS Lambda docs: creating and configuring an SQS event source mapping"
    url: "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html"
  - title: "AWS Lambda docs: handling errors for an SQS event source (partial batch responses)"
    url: "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html"
  - title: "AWS Lambda docs: response streaming for Lambda functions"
    url: "https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html"
  - title: "AWS Step Functions docs: what is Step Functions (Standard vs Express)"
    url: "https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html"
  - title: "AWS Step Functions docs: handling errors (Retry, Catch)"
    url: "https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html"
  - title: "AWS Step Functions docs: service integration patterns (.waitForTaskToken)"
    url: "https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html"
  - title: "Claude API docs: errors and long requests"
    url: "https://platform.claude.com/docs/en/api/errors"
draft: false
---

The usual worry is that Lambda stops at 15 minutes and a model might take longer. In practice a single model call rarely gets near that. What breaks LLM pipelines on AWS is everything around the call: a function doing five calls in a row, a queue that redelivers a message mid-generation, a retry that pays for the same completion twice. As of 10 October 2026 the limits are well documented, and the arithmetic is worth doing before you pick a pattern.

## What are the actual limits?

Lambda's timeout "default value for this setting is 3 seconds", adjustable in one-second steps "up to a maximum value of 900 seconds (15 minutes)". There is one exception in the docs: functions on Lambda Managed Instances can go to 5,400 seconds (90 minutes) for asynchronous invocations and event source mapping invocations, except Amazon MQ and Amazon DocumentDB. For ordinary functions, plan around 900.

Step Functions has two workflow types. Standard workflows "have exactly-once workflow execution and can run for up to one year"; Express workflows have at-least-once execution and run for up to five minutes. Only Standard supports the `.waitForTaskToken` callback pattern for Lambda, SQS and most other integrations, and Standard is priced by state transition.

On the model side, the Claude API's errors page lists a 504 `timeout_error` and says to consider streaming for long-running requests. The official SDKs validate that a non-streaming request is not expected to exceed a 10-minute timeout, and the docs say to use streaming or the Message Batches API "especially those over 10 minutes". Batches suit work where nobody is waiting, because you submit it and poll for results instead of holding a connection open.

Put those together. A single non-streaming call is capped by the SDK at 10 minutes, below Lambda's 15. So the "timeout problem" is almost never one call. It is the sum of calls inside one invocation.

## How should you split the work?

My rule: one function invocation does one unit of model work, and something else owns the sequence.

**A queue for fan-out.** If each of 10,000 rows needs a model call, put each row, or a small chunk, on an SQS queue and let Lambda consume it. The [Prospect Uploader](/#file-adr-003-prospect-uploader) I built handled 10,000+ rows per CSV with AWS Lambda on EventBridge, validating every row and alerting by email. It was built on Lambda and EventBridge and had no model calls. What follows is the design I would reach for if every row needed one; it is not a description of that system.

**A state machine for sequence.** If one document needs extract, then classify, then enrich, then write, that is a workflow. A Standard Step Functions workflow gives you per-step timeouts, `Retry` and `Catch`, and an execution history. It also gives you `.waitForTaskToken` for steps that take a long time or involve a person: Step Functions passes a token, pauses, and continues when something calls `SendTaskSuccess` or `SendTaskFailure`. The docs warn that a waiting task will wait until the one-year quota unless you set `HeartbeatSeconds`, so set a heartbeat.

**Batch API for work nobody is waiting on.** For overnight backfills, submit a batch and poll or callback, instead of holding a function open.

If a browser is waiting, do not make the browser wait on the pipeline. Return a job ID and let the client poll or subscribe. Lambda can stream a response, but the docs say streaming is supported on Node.js managed runtimes (other languages need a custom runtime or the Lambda Web Adapter), responses can reach 200 MB against 6 MB buffered, and a streamed response is not stopped when the client drops, so you are "billed for the full function duration".

## What does SQS do to a slow function?

Several things, all of them in the docs.

1. **Visibility timeout must be generous.** Set the queue's visibility timeout to "at least six times" your function timeout, plus `MaximumBatchingWindowInSeconds` if you use a batch window. The function timeout must be less than or equal to the visibility timeout, and Lambda checks that when you create the mapping.
2. **Assume duplicates.** When a batch fails, the error-handling docs say "your function can end up processing the same message several times." Every consumer has to tolerate redelivery.
3. **A thrown error fails the whole batch by default.** All messages return to the queue, including the ones that succeeded, and each of those can cost you another model call. The fix is partial batch responses: enable `ReportBatchItemFailures` and return a `batchItemFailures` list of message IDs. The docs say an exception from your function still counts as a complete batch failure, so catch per record.
4. **Use a dead-letter queue.** The docs recommend a `maxReceiveCount` of at least 5 on the redrive policy, so Lambda gets a few attempts before a poisoned message is parked.
5. **Small batches for slow items.** The batch-size guidance is "If items take a long time to process, choose a smaller batch size."

## Worked example: sizing a model-call consumer

These numbers are assumptions for illustration; measure your own.

- p99 latency of one model call: 90 seconds.
- Records processed sequentially in a batch of 5: 5 × 90 = 450 seconds in the worst case.
- Function timeout: 600 seconds, which leaves headroom over 450 and sits well under 900.
- Queue visibility timeout: 6 × 600 = 3,600 seconds (one hour), plus any batch window.
- Redrive policy: `maxReceiveCount` 5, with a dead-letter queue and an alarm on its depth.

The failure mode if you skip this arithmetic: a batch of 10 at the same latency needs 900 seconds in the worst case, the function is killed at its timeout, the whole batch returns to the queue, and you pay for every completed call again.

## Hands-on: idempotent consumer plus retry policy

First, the consumer. The batch-failure shape is from the Lambda SQS error-handling docs. The two storage helpers are placeholders: back `already_done` and `mark_done` with a conditional write in whatever datastore you use, keyed on a business ID, not the SQS message ID.

```python
import json

def lambda_handler(event, context):
    failures = []
    for record in event["Records"]:
        try:
            job = json.loads(record["body"])
            key = job["row_id"]                  # deterministic business key
            if already_done(key):                # redelivery: skip, do not pay twice
                continue
            result = call_model(job)             # SDK retries transient errors itself
            mark_done(key, result)               # conditional write: first writer wins
        except Exception:
            failures.append({"itemIdentifier": record["messageId"]})
    return {"batchItemFailures": failures}
```

Turn partial responses on for the mapping, using the command from the docs:

```bash
aws lambda update-event-source-mapping \
  --uuid <your-mapping-uuid> \
  --function-response-types "ReportBatchItemFailures"
```

The Claude errors page says the official SDK retries transient failures, including rate limits and 5xx errors, twice by default with exponential backoff and honours `retry-after`. That is your first retry layer. Do not stack three more on top without thinking about it: each layer multiplies the paid attempts.

Second, the workflow step. This uses the directly specified Lambda function form from the Step Functions docs, with retry fields from the error-handling page (`IntervalSeconds` defaults to 1, `MaxAttempts` to 3, `BackoffRate` to 2.0, `JitterStrategy` to `NONE`):

```json
"Generate": {
  "Type": "Task",
  "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:generate-summary",
  "TimeoutSeconds": 330,
  "Retry": [
    {
      "ErrorEquals": ["Sandbox.Timedout"],
      "MaxAttempts": 0
    },
    {
      "ErrorEquals": ["Lambda.ServiceException", "Lambda.SdkClientException", "Lambda.TooManyRequestsException"],
      "IntervalSeconds": 2,
      "MaxAttempts": 4,
      "BackoffRate": 2.0,
      "MaxDelaySeconds": 30,
      "JitterStrategy": "FULL"
    }
  ],
  "Catch": [{ "ErrorEquals": ["States.ALL"], "ResultPath": "$.error", "Next": "ParkForReview" }],
  "Next": "Write"
}
```

The docs list Lambda's transient service exceptions and say newer runtimes report timeouts as `Sandbox.Timedout`. I retry the service errors and send timeouts straight to the catch, because re-running a generation that already ran for minutes is the most expensive retry there is. The function itself is set to a 300-second timeout, and `TimeoutSeconds` on the state sits above it as a backstop. `ParkForReview` is your own state; it writes the input and error somewhere a person can see.

## Takeaways

- The 15-minute cap is rarely the issue; summed calls inside one invocation, and redelivery, are.
- One invocation, one unit of model work; let SQS fan out and Step Functions sequence.
- Visibility timeout at least six times the function timeout, `ReportBatchItemFailures` on, a dead-letter queue with `maxReceiveCount` of 5 or more.
- Make every write idempotent on a business key; at-least-once delivery will test it.
- Retry service errors, not completed-but-slow generations, and count your retry layers.

For what a validated, alert-first pipeline looked like in practice before models were involved, read the [Prospect Uploader case file](/#file-adr-003-prospect-uploader).
