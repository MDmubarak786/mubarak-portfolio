---
title: "Fraud signals in uploaded documents: what a model can and cannot see"
description: "A vision model reads a payslip well but never sees its PDF metadata. Which fraud checks belong in the model, which in code, with a Claude API example."
date: 2026-10-10T01:54:00Z
tags: ["fraud detection", "document processing", "Claude API", "PDF", "structured output", "vision models"]
pillar: case-files
related: adr-007-ai-document-processing
sources:
  - title: "Claude docs: vision (limits, limitations, FAQ on metadata)"
    url: "https://platform.claude.com/docs/en/build-with-claude/vision"
  - title: "Claude docs: PDF support (how a PDF reaches the model)"
    url: "https://platform.claude.com/docs/en/build-with-claude/pdf-support"
  - title: "Claude docs: structured outputs (json_schema, refusal and max_tokens caveats)"
    url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs"
  - title: "Claude docs: reduce hallucinations"
    url: "https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations"
  - title: "DocuClipper: bank statement fraud detection signals (vendor page)"
    url: "https://www.docuclipper.com/docs/understanding-bank-statement-fraud-detection/"
  - title: "MeasureOne: multi-layered fraud prevention in document processing (vendor blog)"
    url: "https://www.measureone.com/blog/multi-layered-fraud-prevention-in-document-processing"
  - title: "pypdf docs: reading PDF metadata"
    url: "https://pypdf.readthedocs.io/en/stable/user/metadata.html"
  - title: "UK ENIC: what it is and who runs it"
    url: "https://www.enic.org.uk/our-role/news/1667"
draft: false
---

A vision model can read a payslip flawlessly and still not know that the file was assembled in a design tool last night. That is the central problem with fraud checks on uploaded documents: the model sees page images and extracted text, and many of the strongest signals live somewhere else. This post sorts the checks into what the model can do, what must be code, and what must stay with a person.

The case file this comes from, [case file 07 on this site](/#file-adr-007-ai-document-processing), describes document processing for admissions teams. The production system classified 17+ document types at 95% accuracy, cut manual data entry by 70%, and caught fraud through cross-document validation, using GPT-4 Vision and OCR with confidence scoring and review thresholds. It ran on GPT-4 Vision, not Claude. The code below is how I would build the same checks on Claude's API today. It is a design, not a transcript of that system.

## What counts as a fraud signal in an uploaded document?

Four layers, and the layer decides who should check it.

| Layer | Example signal | Best checked by |
|---|---|---|
| File | Producer or Creator names an image editor or word processor; a large gap between creation and modification dates | Code, on the file bytes |
| Arithmetic | Gross minus deductions does not equal net; opening balance plus activity does not equal closing balance | Code, on numbers the model extracted |
| Visual | Mixed fonts, a layout that matches no known template, pasted regions | Specialist tooling; the model notices some of it, unreliably |
| Cross-document | Name, address or employee ID differs between a payslip and a certificate | Code compares fields; the model extracts them |

I use two vendor pages as a checklist, not as evidence that the checks work. DocuClipper sells bank-statement fraud detection and scores an uncommon PDF producer, a modification gap, an atypical PDF version, a font fingerprint that matches no known template, and an opening-plus-activity-equals-closing reconciliation. MeasureOne, also a vendor, lists structure validation, data consistency, cross-document identity checks, font analysis and metadata inspection. Neither page gives independent accuracy figures. DocuClipper is clear that its score is "a signal, not a verdict", and lists benign causes for the same flags: scans, print-to-PDF workflows and corporate PDF tools among them.

## What can the model not see?

Claude's own documentation answers this better than a fraud vendor does.

**File metadata.** The vision FAQ asks whether Claude reads image metadata and answers no: it does not parse or receive any metadata from images. For PDFs, the docs describe two inputs: each page converted to an image, and the extracted text of each page provided alongside it. Neither is the PDF's Info dictionary, so the Producer and ModDate fields never reach the model. That is my reading of the docs, not a sentence they print, but it matches how the pipeline is described.

**Whether an image is synthetic.** The limitations list says Claude cannot determine whether an image is AI-generated and might be incorrect if asked, and says not to rely on it to detect fake or synthetic images.

**Poor inputs.** The same list warns that Claude might hallucinate or make mistakes with low-quality, rotated or very small images, under 200 pixels. Heavy JPEG compression can make text difficult to read, so what you send is not always what you stored. Images above the model's limit are downscaled: the high-resolution tier, which covers Claude 4.7 and later, caps the long edge at 2,576 px and 4,784 visual tokens; other models cap at 1,568 px. A small stamp or a fine-print figure can fall below legibility after that.

**Approximate answers.** Counting is approximate and spatial output is approximate. The docs close with a plain instruction: do not use Claude for tasks requiring perfect precision or sensitive image analysis without human oversight.

## What can the model do well?

It can turn a messy layout into fields. It can compare documents when you label them, which the docs recommend for multiple images ("Image 1:", "Image 2:"). It can flag semantic oddities that rules would miss, such as a job title that does not fit the stated pay, though the verdict on that belongs to a person.

The hallucination guide gives three techniques that fit extraction directly: give the model permission to say it does not know, ask for word-for-word quotes before the analysis, and make each claim traceable to a quote. Translated into a schema: every figure is nullable, and the model returns the printed text it read each figure from.

One instruction matters more than the rest. Tell the model not to calculate or correct anything. If it silently repairs a net figure that does not add up, you have just laundered the exact signal you wanted.

## Hands-on: file checks in code, reading by the model, arithmetic in code

Step one reads metadata with pypdf, before the file goes anywhere. The pypdf docs warn that every field can be `None` and that `reader.metadata` itself can be `None`, so each check tolerates missing values. The parameter types are worth checking in the docs before you rely on them.

```python
import base64
import json

import anthropic
from pypdf import PdfReader

client = anthropic.Anthropic()

EXPECTED_PRODUCERS = {"Acme Payroll Export"}   # what your issuers' systems actually emit

def file_flags(path: str) -> list[str]:
    meta = PdfReader(path).metadata
    if meta is None:
        return ["no_metadata"]
    flags = []
    if meta.producer and meta.producer not in EXPECTED_PRODUCERS:
        flags.append(f"unexpected_producer:{meta.producer}")
    created, modified = meta.creation_date, meta.modification_date
    if created and modified and (modified - created).total_seconds() > 3600:
        flags.append("modified_long_after_creation")
    return flags
```

Step two sends the PDF as a `document` block with a JSON schema. The schema uses `anyOf` with `null` for nullable fields and sets `additionalProperties` to `false`, which the structured-outputs page requires for objects. It also lists unsupported keywords such as `minimum` and `maxLength`, so keep the schema plain.

```python
NUM = {"anyOf": [{"type": "number"}, {"type": "null"}]}
STR = {"anyOf": [{"type": "string"}, {"type": "null"}]}
SCHEMA = {
    "type": "object",
    "properties": {
        "employee_name": STR, "employer_name": STR,
        "gross": NUM, "deductions": NUM, "net": NUM,
        "printed_text_for_figures": {"type": "string"},
        "illegible_parts": {"type": "boolean"},
    },
    "required": ["employee_name", "employer_name", "gross", "deductions",
                 "net", "printed_text_for_figures", "illegible_parts"],
    "additionalProperties": False,
}

PROMPT = (
    "Extract the fields exactly as printed. If a value is missing, illegible or "
    "ambiguous, return null. Quote the printed text each figure came from. "
    "Do not calculate, round or correct any figure."
)

def read_payslip(path: str) -> dict | None:
    pdf = base64.standard_b64encode(open(path, "rb").read()).decode()
    r = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": [
            {"type": "document",
             "source": {"type": "base64", "media_type": "application/pdf", "data": pdf}},
            {"type": "text", "text": PROMPT},
        ]}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
    )
    if r.stop_reason in ("refusal", "max_tokens"):   # output may not match the schema
        return None
    return json.loads(next(b.text for b in r.content if b.type == "text"))
```

The structured-outputs page says a refusal or a `max_tokens` stop can leave output that does not match the schema, so those stop reasons go to review rather than into your parser.

Step three is plain code. This is also where cross-document checks live: extract the same fields from every file in a submission, normalise names, and compare.

```python
def doc_flags(d: dict | None) -> list[str]:
    if d is None or d["illegible_parts"]:
        return ["unreadable"]
    if None in (d["gross"], d["deductions"], d["net"]):
        return ["missing_figures"]
    return [] if abs(d["gross"] - d["deductions"] - d["net"]) <= 0.01 else ["arithmetic_mismatch"]

def names_match(a: dict, b: dict) -> bool:
    norm = lambda s: " ".join((s or "").lower().split())
    return norm(a["employee_name"]) == norm(b["employee_name"])

def route(path: str) -> str:
    flags = file_flags(path) + doc_flags(read_payslip(path))
    return "human_review" if flags else "auto_accept"
```

Nothing here auto-rejects. A flagged file goes to a person with the flags attached, which mirrors the review-threshold idea in the case file. Start by sending every flag to review, count how often reviewers overturn it, and tune from there.

## Where it still fails

- **A clean read is not evidence of authenticity.** A well-made forgery reads perfectly. The model's confidence tells you about legibility, not truth.
- **Metadata is a hint.** It can be absent, stripped or edited, and honest files produce odd values through scans and print-to-PDF.
- **Lookups answer a different question.** The case file also covers qualification matching against Anabin and ECCTIS. UK ENIC, which Ecctis runs for the Department for Education, describes itself as the international reference point for qualifications and skills standards. That tells you how a qualification is evaluated. It does not tell you that this particular certificate is genuine; only the issuer can.
- **Models drift and documents change.** Re-run your labelled examples whenever you change the model or the prompt.

## Takeaways

- Put file-level and arithmetic checks in code. The model never receives PDF metadata, and it should not do your sums.
- Use the model for reading, with nullable fields, quoted evidence and an explicit instruction not to correct anything.
- Treat every signal as a reason for human review, not a verdict; log reviewer overrides and tune thresholds from them.
- Do not ask a vision model whether an image is real. The docs say it cannot reliably tell.
- Check `stop_reason` before parsing structured output.

For the accuracy side of the same case file, see [AI document processing: what 95% should mean](/blog/ai-document-processing-17-types-at-95-percent), and for the full decision record see [case file 07](/#file-adr-007-ai-document-processing).
