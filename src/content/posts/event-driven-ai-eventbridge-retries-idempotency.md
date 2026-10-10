---
title: "Event-driven AI: EventBridge, retries and idempotency for model calls"
description: "EventBridge and Lambda retry by design, so a model call in the pipeline will run twice. Where duplicates come from, what stacked retries cost, and an idempotent handler."
date: 2026-10-10T02:04:00Z
tags: ["EventBridge", "idempotency", "AWS", "AWS Lambda", "LLM", "retries"]
pillar: building
related: adr-003-prospect-uploader
sources:
  - title: "Amazon EventBridge: what it is (event buses, pipes, scheduler)"
    url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html"
  - title: "EventBridge: how EventBridge retries delivering events"
    url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html"
  - title: "EventBridge: dead-letter queues for undelivered events"
    url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html"
  - title: "EventBridge: delivery level for AWS service events"
    url: "https://docs.aws.amazon.com/eventbridge/latest/ref/event-delivery-level.html"
  - title: "EventBridge: ordering and deduplicating events on a Custom Event Bus"
    url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-custom-bus-ordering.html"
  - title: "Lambda: how asynchronous invocation handles errors and retries"
    url: "https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html"
  - title: "Powertools for AWS Lambda (Python): idempotency utility"
    url: "https://docs.aws.amazon.com/powertools/python/latest/utilities/idempotency/"
  - title: "Claude docs: API errors (SDK automatic retries, request IDs)"
    url: "https://platform.claude.com/docs/en/api/errors"
draft: false
---

Every event-driven pipeline on AWS is built on the assumption that a handler can run more than once. That is fine when the handler upserts a row. It is not fine when the handler calls a model: the second run costs tokens again and can return a different answer. If you are adding an LLM step behind EventBridge and Lambda, the retry design matters more than the prompt.

## Where do duplicates come from in an EventBridge and Lambda pipeline?

Three separate layers can repeat work, and none of them is a bug.

**Delivery into EventBridge.** AWS documents two delivery levels for events its own services emit. "Best effort" means an event might, in rare cases, not arrive. "Durable" means the service will "successfully attempt to deliver events to EventBridge at least once". At least once is the promise; exactly once is not.

**Delivery out of EventBridge.** When a target cannot be reached, EventBridge retries. The default is that it "retries sending the event for 24 hours and up to 185 times with an exponential back off and jitter". After the last attempt the event is dropped, unless you configured a dead-letter queue. Some failures skip retries entirely: missing permissions, a target that no longer exists, or a bad address go straight to the DLQ if there is one.

**Lambda's own queue.** If the rule invokes a Lambda function asynchronously, Lambda adds its own layer. For a function error it "attempts to run it two more times", waiting one minute and then two. For throttling and 5xx errors it keeps trying for up to 6 hours by default. And the docs add a sentence worth pinning above your desk: "it's possible for it to receive the same event from Lambda multiple times because the queue itself is eventually consistent." They also tell you to "ensure that your function code gracefully handles duplicate events".

There is a fourth thing that sounds like a fix and is narrower than it looks. A Custom Event Bus supports deduplication at publish time: set `SystemMetadata.DeduplicationId` on each entry, or use content-based deduplication, and EventBridge suppresses a duplicate that arrives within 5 minutes (300 seconds). A suppressed entry returns `SuccessCode: DEDUPLICATED`, which you should treat as success. But the check is scoped to your account (and to the event group, if you set one), it only covers the publish step, and outside the window a repeat is "a different event". It stops a producer from double-publishing. It does not make your consumer safe against the retries above.

## Why do model calls make this worse?

Two reasons.

First, a repeated model call is not a repeated write. A database upsert converges on the same row. A model call produces a fresh sample and a fresh bill. On Claude Haiku 5.5 you cannot even pin the sample down: the migration guide says to omit `temperature`, `top_p` and `top_k`, that `temperature` must be 1 if sent, and that other values return a 400. If duplicates reach a downstream system, you may store two different answers for one input.

Second, retries stack. The Claude SDK "automatically retries transient failures" with exponential backoff, "twice by default". Put that inside a Lambda function that Lambda will run up to three times, behind a rule that will redeliver for 24 hours, and the arithmetic gets ugly:

| Layer | Attempts |
|---|---|
| SDK inside the handler (1 try + 2 retries) | 3 model requests per invocation |
| Lambda async (1 try + 2 retries) | 3 invocations per delivery |
| Per delivery, worst case | 9 model requests |

That is nine billed requests for one event, per delivery attempt from EventBridge. I would not have assumed it from reading any one of those pages; it only shows up when you multiply them. The fix is the same as in every other retry design: one layer owns retries. Set the SDK's `max_retries` (`maxRetries` in TypeScript) to 0 inside a handler that Lambda or EventBridge already retries, or decide that the SDK owns transient errors and make the handler return success once it has handled them.

## What would I put around the model call?

The case file for the Prospect Uploader (case file 03) is the shape this applies to: CSV rows in, Lambda functions behind EventBridge, validation on every row, email alerts when something fails, and a Prospect Viewer for failures. This post is a design argument, not a description of that system. If a step in a pipeline like it called a model, this is what I would wrap around the call.

1. **Choose a business key, not the event ID.** Something like upload ID, row number and prompt version. A redelivered event and a re-uploaded row then collapse to the same key. Include the prompt version so a deliberate prompt change produces a new answer instead of a stale one.
2. **Store the result against the key.** A duplicate returns the stored answer and never calls the model.
3. **Let failures escape.** Do not swallow a model error to make the invocation "succeed". Powertools deletes the idempotency record on an unhandled exception, so the retry runs again as intended.
4. **Fail fast on errors retries cannot fix.** A 400 `invalid_request_error` will fail identically every time. Send it to the dead-letter queue, do not burn 24 hours of retries on it.
5. **Always configure a DLQ.** EventBridge DLQs are standard SQS queues (FIFO is not supported). Each message carries `ERROR_CODE`, `RETRY_ATTEMPTS` and `EXHAUSTED_RETRY_CONDITION`, and CloudWatch reports `InvocationsSentToDLQ`. Alarm on that metric.

## Hands-on: an idempotent model call with Powertools

The Powertools idempotency utility does steps 1 to 3 for you. It stores a record in DynamoDB, keyed on a hash of the part of the payload you select, and returns the stored response for repeats within the expiry window. Records expire after 3,600 seconds by default; you can set any value with `expires_after_seconds`. A concurrent duplicate while the first is running raises `IdempotencyAlreadyInProgressError`, which is safe to retry. This sketch follows the documented shape for `@idempotent_function`; check the docs for the exact parameter names in your Powertools version.

```python
import os
import anthropic
from aws_lambda_powertools.utilities.idempotency import (
    DynamoDBPersistenceLayer,
    IdempotencyConfig,
    idempotent_function,
)

persistence = DynamoDBPersistenceLayer(table_name=os.environ["IDEMPOTENCY_TABLE"])
config = IdempotencyConfig(
    event_key_jmespath="[upload_id, row_number, prompt_version]",
    expires_after_seconds=24 * 60 * 60,
)

# One layer owns retries: Lambda and EventBridge retry, so the SDK does not.
client = anthropic.Anthropic(max_retries=0)

@idempotent_function(data_keyword_argument="item", config=config, persistence_store=persistence)
def classify_row(item: dict) -> dict:
    r = client.messages.create(
        model="claude-haiku-5-5",
        max_tokens=200,
        system="Classify the lead record. Reply with one word: hot, warm or cold.",
        messages=[{"role": "user", "content": item["row_text"]}],
    )
    text = next(b.text for b in r.content if b.type == "text")
    return {"label": text.strip(), "request_id": r._request_id}

def handler(event, context):
    config.register_lambda_context(context)   # protects against Lambda timeouts
    return classify_row(item=event["detail"])
```

Three details. `register_lambda_context` is required so that a function that times out mid-call does not leave a record stuck as in progress forever. The response goes into DynamoDB, so it has to stay small (the docs cap items at 400KB), which is another reason to return a label and a request ID rather than a transcript. And the stored `request_id` is the `request-id` the Claude docs tell you to quote to support, so a duplicate-billing question later has something to point at.

For the producer side on a Custom Event Bus, set `SystemMetadata.DeduplicationId` on each entry to the same business key. Check the docs for the exact `PutEvents` shape in your SDK; the principle is that the producer and the consumer agree on the key.

## Takeaways

- Assume every layer, EventBridge, Lambda async and the SDK, will run your handler more than once; the docs say so.
- Stacked retries multiply. Count them (3 x 3 = 9 here) and give one layer ownership.
- Publish-side deduplication is a 5-minute, Custom Event Bus feature. It is not a substitute for an idempotent consumer.
- Key on business identity plus prompt version, store the result, and let real failures raise so the retry actually happens.
- Send non-retryable errors and exhausted events to a DLQ, and alarm on it.

If you are pricing what a repeated call costs once the prefix is cached, the arithmetic is in the prompt caching economics post, and the pipeline this design argument borrows its shape from is case file 03, the Prospect Uploader.
