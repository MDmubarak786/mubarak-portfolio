---
title: "OCR plus VLMs: document processing in 2024 and in 2026"
description: "The 2024 GPT-4 Vision plus OCR pipeline at 95% across 17+ document types, and what current Claude and Gemini document APIs change, with per-page cost maths."
date: 2026-10-10T01:52:00Z
tags: ["document processing", "OCR", "VLM", "Claude", "Gemini", "case file"]
pillar: case-files
related: adr-007-ai-document-processing
sources:
  - title: "Claude docs: vision (limits, token formula, limitations)"
    url: "https://platform.claude.com/docs/en/build-with-claude/vision"
  - title: "Claude docs: PDF support"
    url: "https://platform.claude.com/docs/en/build-with-claude/pdf-support"
  - title: "Claude docs: citations (PDF page citations)"
    url: "https://platform.claude.com/docs/en/build-with-claude/citations"
  - title: "Gemini API docs: document processing"
    url: "https://ai.google.dev/gemini-api/docs/document-processing"
  - title: "Gemini API pricing (3.8 Flash)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Claude docs: pricing (Haiku 5.5, Sonnet 5.5)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
  - title: "Shi et al.: Exploring OCR Capabilities of GPT-4V(ision) (arXiv)"
    url: "https://arxiv.org/abs/2310.16809"
draft: false
---

In 2024 I worked on a document-processing pipeline that paired GPT-4 Vision with OCR: 17+ document types at 95% accuracy, with fraud detection, manual entry down 70%, processing 7 times faster and accuracy up 40% on complex documents. Two years later the vendor APIs take a whole PDF as a first-class input. This post is what that changes, what it does not, and what a page costs on three current models.

I am describing the 2024 system only at the level of those figures; the case file has the rest. Everything about current models is from the vendors' docs as of 10 October 2026, and I have not rebuilt the pipeline on them.

## What did the 2024 pairing look like?

The case for pairing the two is that neither half is enough. OCR reads characters faithfully but knows nothing about what a field means. A vision language model understands layout and meaning but can misread a digit. A study of GPT-4V's OCR (Shi et al., arXiv) is a fair summary of why: the authors state that "GPT-4V does not outperform existing state-of-the-art OCR models", that it "performs well in recognizing and understanding Latin contents", and that it "struggles with multilingual scenarios and complex tasks", including table structure recognition and entity extraction from document images. They conclude that specialised OCR models retain research and practical value.

That is the job division I would argue for: let the cheap, deterministic reader supply the characters and let the model supply judgement about what they mean and whether they look right.

## What do current document APIs do?

Three things have moved: the page is a native input, the images are sharper, and you can ask for evidence.

**Claude takes PDFs directly.** The PDF support page lists a 32 MB request limit and up to 600 pages per request (100 when the context window is under 1M tokens). Each page is processed as both text and an image, and the token cost follows: "each page typically uses 1,500 to 3,000 tokens per page depending on content density" for text, plus image tokens, with no extra PDF fee. Dense PDFs can fill the context window before reaching the page limit.

**Images are read in patches, at higher resolution.** The vision page says Claude views images in 28×28-pixel patches, so an image costs ⌈width / 28⌉ × ⌈height / 28⌉ visual tokens. Claude 4.7 and later models are on a high-resolution tier (2576 px long edge, up to 4,784 tokens); older models are capped at 1568 px and 1,568 tokens. For a 1920×1080 page image, the docs' table gives 1,560 tokens on the standard tier and 2,691 on the high-resolution tier. Small text benefits from the extra pixels; the docs also say that if you do not need the fidelity for "dense documents", downsample to control cost.

**Gemini counts pages flat.** Its document processing page says PDFs up to 50 MB or 1,000 pages, 258 tokens per page, and notes that text embedded in the PDF is extracted and passed to the model with no charge for those native-text tokens. Uploaded files via the Files API are stored for 48 hours. The examples use `gemini-3.8-flash`.

**Evidence.** Claude's citations return the passages supporting each claim; for PDFs, citations include 1-indexed page numbers. There is a catch that matters for this topic: text is extracted and chunked into sentences, image citations are not supported, so scanned PDFs without extractable text are not citable. In an intake pipeline, the scanned documents are exactly the ones you care about.

## What do these models still get wrong?

The vision docs list limits worth reading before you promise a number. Claude "might hallucinate or make mistakes when interpreting low-quality, rotated, or very small images under 200 pixels". Counting is approximate. And, directly relevant to fraud checks, Claude "cannot determine whether an image is AI-generated" and the docs say not to rely on it to detect fake or synthetic images. The page ends with "do not use Claude for tasks requiring perfect precision" without human oversight.

So what the newer models do not change is the part that made the pairing useful: a model can read a figure confidently and wrongly. The fix is the same as in 2024, an independent second reading.

## What does a page cost on each model?

A worked example. A 10-page document, each page a 1920×1080 render with about 2,000 text tokens (the middle of Claude's stated range; yours will differ), extraction output of 500 tokens of JSON. Prices are USD per million tokens from the vendors' pricing pages.

| | Haiku 5.5 | Sonnet 5.5 | Gemini 3.8 Flash |
|---|---|---|---|
| Input prices | $0.10 | $2.00 | $0.75 |
| Tokens per page | 2,000 text + 2,691 image = 4,691 | 4,691 | 258 |
| Input, 10 pages | 46,910 tokens = $0.0047 | $0.0938 | 2,580 tokens = $0.0019 |
| Output, 500 tokens | $0.0003 (at $0.50) | $0.0050 (at $10) | $0.0019 (at $3.75) |
| Per document | about $0.0049 | about $0.099 | about $0.0038 |

Assumptions to check before you reuse these: the 2,000 text tokens and the 1,920×1080 render are mine; Haiku 5.5 pricing is its under-100,000-token-prompt row; Gemini 3.8 Flash prices are the ones through 31 December 2026 and double from 1 January 2027, which would put that column at about $0.0076; Gemini's flat 258 tokens per page is what the document processing page states and I have not verified it against an actual usage block. Gemini is cheapest on input because native text is free and pages are flat-rated, Claude's per-page cost depends on your render size, and Sonnet at about $0.10 a document is roughly 20 times Haiku. Whether the cheaper tier is accurate enough on your document types is an evaluation question, not a pricing one, and I have no benchmark for it.

## Hands-on: model reads, OCR checks

Send the PDF to a model for structured extraction, then verify each extracted value against text from an independent OCR pass. The document block shape is from Claude's citations docs; the `output_config` shape is from the structured outputs docs (check the SDK for the exact parameter, and the docs for whether you can combine it with citations before assuming you can). `ocr_text_for` stands for whichever OCR engine you use.

```python
import base64, re, anthropic

client = anthropic.Anthropic()

def extract(pdf_bytes: bytes) -> dict:
    r = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=1024,
        output_config={"format": {"type": "json_schema", "schema": INVOICE_SCHEMA}},  # check SDK
        messages=[{"role": "user", "content": [
            {"type": "document", "source": {
                "type": "base64", "media_type": "application/pdf",
                "data": base64.standard_b64encode(pdf_bytes).decode()}},
            {"type": "text", "text": "Extract the invoice fields. Use null when a field is not visible."},
        ]}],
    )
    if r.stop_reason != "end_turn":           # refusal or max_tokens: do not parse
        raise RuntimeError(r.stop_reason)
    return parse_json(r.content[0].text)

def digits(s: str) -> str:
    return re.sub(r"\D", "", s)

def cross_check(fields: dict, ocr_text: str) -> list[str]:
    """Flag any numeric field the model reported that OCR did not see."""
    seen = digits(ocr_text)
    return [k for k in ("invoice_no", "total", "date")
            if fields.get(k) and digits(str(fields[k])) not in seen]

fields = extract(pdf_bytes)
flags = cross_check(fields, ocr_text_for(pdf_bytes))
route = "human_review" if flags else "auto"
```

A disagreement is a free alarm. It will not catch a wrong value that both readers agree on, and it ignores formatting, so keep a human sample in the loop. Fraud signals need their own checks (metadata, duplicate detection, arithmetic consistency across fields); do not ask a vision model whether an image was generated.

## What would I change today?

If I were rebuilding the 2024 pipeline now, these are the moves I would test, as hypotheses with an eval attached:

- Send the PDF, not pre-rendered images, so the platform handles page splitting and text extraction.
- Keep OCR as the independent second reader rather than the primary one, and route on disagreement.
- Start on the cheapest tier and measure per document type; the table shows a 20x spread between Haiku and Sonnet, so the saving is worth an evaluation.
- Put the schema, not the prose, at the centre, and gate on `stop_reason` before parsing.
- Keep a human review queue sized by the disagreement rate, and track that rate as the health metric.

## Takeaways

- The 2024 reason for pairing OCR and a VLM still holds: independent readers catch each other's misreads.
- Current APIs take PDFs natively. Claude bills text plus image tokens per page; Gemini bills a flat 258 tokens a page with native text free.
- Claude citations cover text PDFs with page numbers, not scans; plan a separate path for scanned documents.
- Do not use a vision model as the fraud detector for synthetic images; the docs say it cannot tell.
- Price per document with your own page count and render size, then evaluate accuracy per document type before choosing the tier.

The original numbers and architecture notes are in [case file 07](/#file-adr-007-ai-document-processing).
