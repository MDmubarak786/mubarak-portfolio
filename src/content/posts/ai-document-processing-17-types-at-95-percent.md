---
title: "AI document processing: what 95% across 17+ document types should mean"
description: "How GPT-4 Vision and OCR classified 17+ admissions document types at 95%, and what a number like that must include: per-type results, confidence routing, review paths."
date: 2026-10-10T02:21:00Z
tags: ["document processing", "GPT-4 Vision", "OCR", "evaluation", "structured outputs"]
pillar: case-files
related: adr-007-ai-document-processing
sources:
  - title: "OpenAI docs: Images and vision (limitations, supported models, detail levels)"
    url: "https://developers.openai.com/api/docs/guides/images-vision"
  - title: "OpenAI docs: Structured Outputs (json_schema, strict mode, refusals)"
    url: "https://developers.openai.com/api/docs/guides/structured-outputs"
  - title: "OpenAI docs: Evaluation best practices"
    url: "https://developers.openai.com/api/docs/guides/evaluation-best-practices"
  - title: "Ecctis: qualification benchmarking and verification services"
    url: "https://www.ecctis.com/"
  - title: "anabin: information portal on foreign educational qualifications (KMK)"
    url: "https://anabin.kmk.org/"
draft: false
---

"95% accurate" is the most abused phrase in applied AI, and I am about to use it about my own work. In the case file, GPT-4 Vision and OCR validation APIs classify 17+ document types at 95% accuracy, cut manual data entry by 70%, and catch fraud through cross-document validation. If you are going to put a model between a student's payslip and a database, the useful question is not whether 95% is high. It is what the 95% measures, and what happens to the other five.

This post has two jobs: describe the system as the record describes it, and spell out what a headline number like that has to carry before you should trust it. The case file does not publish an evaluation set, so I am not going to invent one. The evaluation section is an argument, grounded in OpenAI's own guidance.

## What problem were we solving?

Admissions teams at Global University Systems received student documents of many kinds and keyed them in by hand. Volume grew and accuracy suffered. Compliance checks against Anabin and ECCTIS, two bodies that deal in recognising foreign qualifications, took effort nobody had. Anabin is the German KMK's information portal on foreign educational qualifications; Ecctis describes services that "confirm the authenticity of academic qualifications and institutions". For an admissions team those checks are not optional paperwork. They decide whether an application proceeds.

The options in the record were two. Keep manual entry: no model risk, but slow, error-prone and impossible to scale with intake. Or GPT-4 Vision plus OCR with confidence scoring, which gave us 17+ document types classified at 95% accuracy and qualification matching with confidence scores. The record lists the cost of the second option in one line that I would underline: "Model outputs need guardrails, evaluation and human review paths."

We took the second. The decision was to build document processing APIs on GPT-4 Vision and OCR with confidence scoring and review thresholds, and to extend the same approach to qualification matching for compliance automation.

## What did the system produce?

The consequences in the record, as I wrote them down:

- **Accuracy:** 95% across 17+ document types, which the record attaches to classification.
- **Manual data entry:** cut by 70%, with processing 7x faster.
- **Complex documents:** accuracy up 40%+ on payslips, EPFO records and certificates.
- **Compliance:** fraud detection through cross-document validation, with compliance effort down 60%+.

The work ran as validation APIs for CampusNet and the BGV system, extracting structured data, with orchestrator pipelines doing multi-document classification. Two caveats about reading those numbers. The 95% is attached to classifying the document type; I am not claiming it covers every extracted field, because the record does not say so. And "up 40%+ on complex documents" is a relative improvement on a baseline that the record does not state. Whenever you see an uplift without a baseline, ask for the baseline.

## A note on "GPT-4 Vision"

GPT-4 Vision is the name the case file uses, and it is a historical one. OpenAI's current vision guide organises its sizing table around newer families: gpt-6-astra, the gpt-5.x line, gpt-4.1 and gpt-4o, with several older models marked deprecated. The guide's supported inputs are PNG, JPEG, WEBP and non-animated GIF, with a `detail` setting whose values vary by model and which defaults to `auto`; it recommends `original` for OCR-style tasks where the model supports it. If you are building this today, you would pick a current model from that table and re-measure. The pattern in this post does not depend on the model name. The numbers do, which is the point of the next section.

## What should a 95% claim include?

Here is what I would require before believing any accuracy figure for a document pipeline, mine included.

**A per-type breakdown.** A pooled 95% over 17 types hides the type that is at 70%. Payslips, certificates and national records vary in layout and scan quality. The type that matters most commercially or legally is rarely the type that dominates the sample. Report accuracy per type, with the count of examples, and list which types are confused with which.

**A definition of "accurate".** Classification accuracy, field-level extraction accuracy and end-to-end "a clerk would have accepted this record" are three different measurements. State which one the number is.

**The fall-through rate.** With confidence scoring and review thresholds, the headline is not "the model is right 95% of the time". It is "the model handles X% automatically, at Y% accuracy, and sends the rest to a person". A system that auto-handles 60% at 99% and routes 40% to review is a different product from one that auto-handles 100% at 95%. Both can honestly say "95%". Only one has a review path.

**A representative sample.** OpenAI's evaluation guidance says to build eval sets that mirror production traffic, including typical, edge and adversarial cases, and to define success criteria before running them. For documents, "adversarial" includes rotated scans, photos taken at an angle, low-resolution uploads and documents in other scripts.

**Calibrated automation.** If any part of your grading is automated, including an LLM judging another LLM, the same guidance says to check it against human labels. For classification you can skip the judge: the label is a label.

## Where does the vision model struggle on real documents?

The limitations in the vision guide read like a list of what an admissions inbox contains. Quoting a few:

- "The model may misinterpret rotated or upside-down text and images."
- The model "may not perform optimally when handling images with text of non-Latin alphabets".
- Small text should be enlarged to improve readability.
- "The model doesn't process original file names or metadata."
- Submissions of CAPTCHAs are blocked, which is irrelevant here but a reminder that the system has rules you do not control.

Each one maps to a pipeline step. Rotation: detect and correct orientation before the model sees the page. Small text: render PDFs at a resolution that keeps type legible, and use the highest `detail` setting the model supports. Non-Latin scripts: make sure your evaluation set contains them, because a pooled score will not tell you. Metadata: never rely on a file name to tell you what a document is.

This is also where OCR earns its place next to the vision model. A deterministic OCR pass gives you text you can validate against rules (a date is a date, an ID number matches its format), while the model handles layout and meaning. When the two disagree, that disagreement is itself a confidence signal.

## Hands-on: classify, route, and measure

The shape I would build, in three parts. First, a classifier that returns a type and a confidence as structured output, using OpenAI's documented `text.format` with a JSON schema in strict mode. The docs warn that a refusal may not follow your schema and that a response can be incomplete, so check both before reading fields. The model name is taken from the docs' example; pick one from the vision guide's table. For the exact way to attach an image to the input, check the docs for the exact parameter; the `input_image` part below is my reading of it.

```python
from openai import OpenAI
import json

client = OpenAI()

DOC_TYPES = ["payslip", "epfo_record", "degree_certificate", "transcript", "passport", "other"]  # your 17+

SCHEMA = {
    "type": "object",
    "properties": {
        "doc_type": {"type": "string", "enum": DOC_TYPES},
        "confidence": {"type": "number"},   # self-reported; calibrate it, do not trust it
    },
    "required": ["doc_type", "confidence"],
    "additionalProperties": False,
}

def classify(image_url: str):
    r = client.responses.create(
        model="gpt-6-astra",
        input=[{"role": "user", "content": [
            {"type": "input_text", "text": "Classify this document."},
            {"type": "input_image", "image_url": image_url},   # check the docs for the exact parameter
        ]}],
        text={"format": {"type": "json_schema", "name": "doc_class", "strict": True, "schema": SCHEMA}},
    )
    return json.loads(r.output_text)   # check for a refusal / incomplete status first in production
```

Second, routing. The threshold is a product decision, not a constant to guess:

```python
def route(result: dict, threshold: float = 0.90) -> str:
    return "auto" if result["confidence"] >= threshold and result["doc_type"] != "other" else "human_review"
```

Third, the report that makes the headline number honest. Given a labelled sample of `(true_type, predicted, confidence)` rows:

```python
from collections import Counter, defaultdict

def report(rows, threshold=0.90):
    per_type = defaultdict(lambda: Counter())
    auto = auto_correct = 0
    for true, pred, conf in rows:
        per_type[true]["n"] += 1
        per_type[true]["correct"] += int(true == pred)
        if conf >= threshold:
            auto += 1
            auto_correct += int(true == pred)
    for t, c in sorted(per_type.items()):
        print(f"{t:22} n={c['n']:4}  accuracy={c['correct']/c['n']:.1%}")
    print(f"auto-handled {auto/len(rows):.1%} at {auto_correct/max(auto,1):.1%} accuracy; rest to review")
```

Run it at several thresholds and plot auto-handled share against accuracy. The curve tells you where to set the threshold, and the per-type lines tell you which types need a different strategy, such as more examples or a mandatory human check.

## Takeaways

- A single accuracy figure is a claim about a sample. Ask what was measured, on what, and against which baseline.
- Report per type, with counts. The weakest type, not the average, determines whether the pipeline is safe to automate.
- Confidence scores are for routing. Treat the model's self-reported confidence as a feature to calibrate against labelled outcomes, not as a probability.
- Plan the review path first. The case file's own caveat is that outputs need guardrails, evaluation and human review. The design goal is that people review the exceptions instead of keying everything.
- Re-measure when the model changes. The model behind my case file is a historical name; the numbers belong to that configuration.

The decision record, with the options and the numbers in one place, is case file 07, "AI document processing"; the browser-side counterpart, where the same classification ran inside admin workflows, is case file 08, "Chrome extensions (MV3)".
