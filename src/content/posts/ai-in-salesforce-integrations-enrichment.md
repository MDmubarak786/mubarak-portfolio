---
title: "AI in Salesforce integrations: enrichment without breaking the CRM"
description: "Let an LLM enrich Salesforce records safely: external-ID upserts, schema-checked output, confidence gates and a human review lane, with Prospect Uploader lessons."
date: 2026-10-10T01:59:00Z
tags: ["Salesforce", "integration", "AI", "upsert", "data validation", "structured outputs"]
pillar: building
related: adr-003-prospect-uploader
sources:
  - title: "Salesforce REST API guide: insert or update (upsert) a record using an external ID"
    url: "https://developer.salesforce.com/docs/platform/api-rest/guide/dome-upsert.html"
  - title: "Salesforce REST API: upsert records using sObject Collections"
    url: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api/resources_composite_sobjects_collections_upsert.htm"
  - title: "Salesforce Bulk API 2.0: get job failed record results"
    url: "https://developer.salesforce.com/docs/platform/api-asynch/guide/get-job-failed-results.html"
  - title: "Salesforce Bulk API 2.0: limits and allocations (older doc version)"
    url: "https://developer.salesforce.com/docs/atlas.en-us.230.0.api_bulk_v2.meta/api_bulk_v2/bulk_api_2_limits.htm"
  - title: "The Salesforce Developer's Guide to the Winter '27 Release"
    url: "https://developer.salesforce.com/blogs/2026/10/developers-guide-to-the-winter-27-release"
  - title: "Claude docs: structured outputs"
    url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs"
draft: false
---

The first time you let a language model write into a CRM, the risk is not that it fails. It is that it succeeds, plausibly and wrongly, on 10,000 rows at once, over values a salesperson typed by hand. As of 10 October 2026, Salesforce's own APIs already give you most of the safety you need; the model just needs to be treated as one more untrusted data source that sits in front of them.

A note on sources. Salesforce's documentation site returned HTTP 403 to automated fetching while I was writing, so every Salesforce fact below comes from search-result summaries of those pages, not from me reading them. I link the pages so you can check them, and I mark the one place where you should confirm a parameter name yourself.

## What does Salesforce already give you for safe writes?

Three things, and all of them predate the LLM question.

**Upsert by external ID.** The REST API's "sObject Rows by External ID" resource puts the external ID value in the URL. The outcome depends on how many records share it: zero creates a record, one updates it, and more than one returns a 300 error and changes nothing. An `updateOnly` parameter stops it creating when nothing matches. The body must not contain the record `Id` or the external ID field itself. From API version 46.0 a successful call returns HTTP 200 with a `created` flag, true for an insert and false for an update.

Addressing the record by external ID is what makes an upsert retry-safe in practice. The docs do not use the word "idempotent" (that part is my inference): resend the same PATCH with the same body and it lands on the same record. The `created` flag only reports which branch ran, so do not build logic on it: the first attempt returns true and the retry returns false.

**sObject Collections.** A PATCH to the collections resource upserts up to 200 records in one call, matched on an external ID field. Each record needs a `type` attribute and must omit `Id`. Results come back in the order you sent them. `allOrNone` defaults to false, so one bad record does not roll back the other 199, which is what you want for enrichment and what you must remember when you read the response.

**Bulk API 2.0.** For larger loads, an upsert job also needs an external ID field. The limits page in the search results lists a 150 MB file cap and 150,000,000 records per rolling 24 hours, and Salesforce creates a batch for every 10,000 records. A batch that cannot finish in 10 minutes fails. That page is an older doc version in the results, so check the numbers against your API version. When a job reaches JobComplete or Failed you fetch `failedResults`, a CSV that carries `sf__Error` and your original columns. Two cautions from the docs: row order is not guaranteed to match your file, and failed records are not the same as unprocessed ones.

One version note. Per Salesforce's developer blog, Winter '27 ships API version 68.0, and the same guide suggests pinning a version in production integrations rather than using the `latest` keyword. I would do that.

## What did the Prospect Uploader teach me before any model was involved?

The [Prospect Uploader](/#file-adr-003-prospect-uploader) is not an AI system, and I will not pretend otherwise. Marketing teams were uploading prospect lists of 10,000+ rows into Salesforce from many countries. Uploading CSVs directly meant validation failures stayed invisible until someone noticed missing leads, and a silent failure meant lost leads. The replacement was event-driven: AWS Lambda functions on EventBridge, multilingual validation on every row, email alerts, and a Prospect Viewer where stakeholders could see the failures.

Three habits came out of that, and all three carry straight over to model-written data.

1. **Validate every row, and say why it failed.** A rejected row with a reason is a to-do item. A missing row is a mystery.
2. **Alert on failure, do not rely on someone looking.** The most expensive outcome in that design was silence.
3. **Give people a place to see the rejects.** The viewer mattered as much as the validator.

A model makes the silent-failure problem worse, because its errors pass format validation. The separate data point I have is document processing: the GPT-4 Vision and OCR system in [case file 07](/#file-adr-007-ai-document-processing) classified 17+ document types at 95% accuracy, with confidence scoring and review thresholds in front of it. Take 95% at face value and apply it to a 10,000-row upload: about 500 rows would be wrong. That is a design number, not a measurement of any enrichment job. It is why the review lane has to exist.

## How do you wire an LLM in front of the upsert?

My rule is that the model proposes and the pipeline disposes. Concretely:

- **Constrain the output with a schema, then check what the schema cannot.** Claude's structured outputs take a JSON schema in `output_config.format`, and the SDK helper `client.messages.parse` accepts a Pydantic model. The docs list numerical constraints such as `minimum` and `maximum` as unsupported by the API, so a `0 to 1` confidence field has to be range-checked in your own code. Also handle `stop_reason` values of `refusal` and `max_tokens`: the docs warn that in both cases the output may not match your schema.
- **Write enrichment to its own fields.** Put model output in `Industry_AI__c`, not `Industry`. Never overwrite a value a human set. You can promote it later; you cannot easily un-overwrite 10,000 rows.
- **Key every record on a deterministic external ID.** A hash of the normalised email, say. Then a retry, a re-run after a bug fix and a double-delivered queue message all land on the same record.
- **Send low-confidence rows to a lane, not to Salesforce.** A model's self-reported confidence is not calibrated, which is a design argument and not something I measured. If you need calibrated probabilities, that is the case for [typed questions](/blog/jev-typed-questions-instead-of-prompt-and-parse/) over free-form generation.

## Hands-on: enrich, gate, then upsert

The enrichment call, using the documented `parse` helper with a Pydantic schema:

```python
import hashlib
from typing import Literal
from anthropic import Anthropic
from pydantic import BaseModel

client = Anthropic()

class Enrichment(BaseModel):
    industry: Literal["education", "software", "finance", "healthcare", "other"]
    seniority: Literal["junior", "mid", "senior", "executive", "unknown"]
    confidence: float   # asked for 0..1; the API cannot enforce a range, we check below

def enrich(company: str, title: str) -> Enrichment | None:
    r = client.messages.parse(
        model="claude-sonnet-5-5",
        max_tokens=300,
        messages=[{"role": "user", "content":
            f"Classify this lead. Company: {company!r}. Job title: {title!r}."}],
        output_format=Enrichment,
    )
    # The docs say refusal and max_tokens can break the schema; check the docs
    # for the exact stop_reason attribute on the parsed response.
    e = r.parsed_output
    if e is None or not (0.0 <= e.confidence <= 1.0):
        return None
    return e

def route(e: Enrichment | None, auto=0.85, review=0.50) -> str:
    if e is None or e.confidence < review:
        return "reject"          # leave the record alone, log why
    return "write" if e.confidence >= auto else "review"   # review lane, human decides

def external_key(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()[:32]
```

The two thresholds are yours to tune on labelled examples; do not copy mine.

Then the write. Build the body for sObject Collections, 200 records at a time, and read the result array for per-record success:

```python
def collections_body(rows: list[dict]) -> dict:
    return {
        "allOrNone": False,
        "records": [
            {
                "attributes": {"type": "Lead"},
                "Source_Key__c": external_key(r["email"]),   # custom external ID field (placeholder name)
                "Industry_AI__c": r["enrichment"].industry,
                "Seniority_AI__c": r["enrichment"].seniority,
            }
            for r in rows
        ],
    }

# PATCH {instance}/services/data/v67.0   (v68.0 arrives with Winter '27; use what your instance is on)
# /composite/sobjects/Lead/Source_Key__c
# Check the docs for the exact path and parameter names before you rely on this.
# Results come back in request order; read each element's success flag and errors array.
```

Log every non-success element with its position, and send that list wherever your team already looks. This is the uploader's rule again: a failure nobody sees is a lost lead.

## Takeaways

- Treat the model as an untrusted source in front of Salesforce's upsert, not as a writer with credentials.
- Key every write on a deterministic external ID so retries and re-runs are safe; do not depend on the `created` flag.
- Write model output to separate fields, and never over a human-entered value.
- Check what the schema cannot enforce, such as confidence ranges, and handle `refusal` and `max_tokens` stop reasons.
- Build the review lane and the failure alert on day one; at 95% accuracy a 10,000-row batch contains roughly 500 errors.

If you want the longer story of how the uploader's validation and viewer came together, it is in the [Prospect Uploader case file](/#file-adr-003-prospect-uploader).
