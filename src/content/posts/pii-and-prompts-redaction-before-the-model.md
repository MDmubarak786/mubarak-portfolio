---
title: "PII and prompts: redaction patterns before the model sees the text"
description: "Redact in code before the model call: regex, NER and review, reversible placeholders, what GDPR and India's DPDP Rules imply, and how caching and retention interact."
date: 2026-10-10T01:50:00Z
tags: ["PII", "privacy", "redaction", "GDPR", "DPDP", "prompt caching", "Presidio"]
pillar: building
sources:
  - title: "Microsoft Presidio on GitHub (PII de-identification framework)"
    url: "https://github.com/microsoft/presidio"
  - title: "Presidio docs: analyzer (recognizers, AnalyzerEngine)"
    url: "https://presidio.dataprivacystack.org/analyzer/"
  - title: "Presidio docs: anonymizer (operators, deanonymization)"
    url: "https://presidio.dataprivacystack.org/anonymizer/"
  - title: "Claude docs: prompt caching (exact matching, workspace isolation)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
  - title: "Claude docs: API and data retention (ZDR, feature eligibility)"
    url: "https://platform.claude.com/docs/en/manage-claude/api-and-data-retention"
  - title: "GDPR Article 5: principles relating to processing (gdpr-info.eu)"
    url: "https://gdpr-info.eu/art-5-gdpr/"
  - title: "GDPR Article 4: definitions (gdpr-info.eu)"
    url: "https://gdpr-info.eu/art-4-gdpr/"
  - title: "Legal 500: India's DPDP Act and DPDP Rules 2025, phased commencement (law-firm explainer, secondary)"
    url: "https://www.legal500.com/intelligence/india/privacy/india's-digital-personal-data-protection-act-and-the-dpdp-rules-2025-phased-commencement-core-obligations-and-a-board-ready-compliance-strategy"
draft: false
---

The cheapest way to protect personal data in an LLM feature is to not send it. If the model never sees a name, a phone number or an account ID, it cannot repeat it, log it or leak it into a cache. This post is the pattern I would put in front of any model call: detect in code, replace with placeholders, keep the key on your side, put the original back afterwards.

I am not a lawyer and this is not legal advice. Where I cite law, I cite the text of GDPR and a law-firm explainer for India's DPDP Rules, and I say which is which.

## What do GDPR and DPDP imply for prompts?

A prompt is processing of personal data the moment it contains some. Two GDPR principles do most of the work in Article 5. Data minimisation: personal data must be "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed". Storage limitation: kept identifiable "for no longer than is necessary". A summarisation feature does not need the customer's phone number, so the number should not be in the prompt. Article 4 gives you a useful middle path: pseudonymisation means personal data "can no longer be attributed to a specific data subject without the use of additional information", which is what a placeholder with a separate lookup table achieves.

India's Digital Personal Data Protection Act is newer and the dates matter. I could not fetch the Gazette notification, so this comes from the Legal 500 explainer, a secondary source. It says the Rules were notified on 13 November 2025 (other coverage says 14 November; check the notified text before relying on a date). Under its commencement table, Consent Manager registration (Rule 4) starts on 13 November 2026, and most data fiduciary obligations, including Rules 5 to 16, start on 13 May 2027. Rule 6 on security safeguards, per the same explainer, covers encryption, obfuscation or masking, least-privilege access control and monitoring for unauthorised access, with logs retained for one year. It also describes erasure when consent is withdrawn or the purpose is no longer served.

What both regimes imply for builders is boring and consistent: send less, mask what you must send, delete when done, keep records. Redaction before the model call is the engineering form of all four.

## How do you find the PII? Regex, NER, then review

No single detector is enough, so layer them.

**Deterministic patterns first.** Emails, phone numbers, card numbers (with a checksum), national ID formats, order numbers. Fast, explainable, and you can unit-test them. Presidio, Microsoft's open-source de-identification framework, describes its recognizers as using "named entity recognition, regular expressions, rule-based logic, and checksums". Its `PatternRecognizer` uses regular expressions with optional context words and validation logic, so you can add the identifiers that matter in your market.

**NER for what patterns miss.** Names, places and organisations have no pattern. Presidio's analyzer can plug in spaCy, Stanza or Hugging Face transformers through its `NlpEngine`. Expect false positives ("Jordan" the country) and false negatives (an unusual name in a language the model handles poorly).

**Review for what both miss.** The Presidio README is unusually honest: "there is no guarantee that Presidio will find all sensitive information," and it recommends additional safeguards. Treat that as a design requirement. Sample redacted prompts weekly and read them. Measure recall on a labelled set drawn from your own traffic, because published numbers describe someone else's text.

A caution on languages: the Presidio analyzer docs say it can detect PII "in multiple languages" and point to a separate page for details. If your users write in many languages, test each one separately; an English-only NER model will pass a Tamil or Hindi name straight through.

## Should you mask, replace or encrypt?

Presidio's anonymizer ships these operators: `replace`, `redact`, `mask`, `hash` (salted SHA-256 by default), `encrypt`, `custom` and `keep`. Which one depends on whether you need the original back.

| Need | Operator | Trade-off |
|---|---|---|
| The model needs the type, not the value | `replace` with `<PERSON>` | Simple; loses which person |
| The model must tell people apart | numbered placeholders you generate, `<PERSON_1>` | You keep the mapping; best for chat and summaries |
| You must restore the original later | `encrypt`, then `DeanonymizeEngine` with `decrypt` and the same key | Reversible only with the key |
| Nothing should ever come back | `redact` or `hash` | Irreversible by design |

The docs state that deanonymization works only for reversible operations such as encryption. For prompts, I prefer numbered placeholders with a server-side mapping: the model can still reason ("`<PERSON_2>` is the account holder, `<PERSON_1>` is the agent"), and the answer is rehydrated after the call. This is a design argument, not something I have measured.

## What about caching and retention?

Redaction interacts with two things the provider does with your prompt.

**Caching.** On Claude, a cache entry is "a hash of the prefix ending at that block", and hits need "100% identical prompt segments". Two consequences. First, personal data inside a cached prefix is what you are paying to keep warm, so redact before the breakpoint, not after. Second, random placeholders break caching: if `<PERSON_8F3A>` changes on every call, the prefix never matches. Use deterministic numbering within a request, and keep per-user values out of the shared prefix altogether, as in the [prompt caching post](/blog/prompt-caching-economics-rag-bill-2026).

The docs also say caches are isolated per workspace, and between organisations "different organizations never share caches, even if they use identical prompts". That addresses cross-tenant leakage; it does not address your own data policy.

**Retention.** The API and data retention page has a row for prompt caching: it is zero-data-retention eligible, "your prompts and Claude's outputs are not stored", and "KV cache representations and cryptographic hashes are held in memory for the cache TTL and promptly deleted after expiry." ZDR is an arrangement you request from Anthropic per organisation, not a default. The same page says Claude Fable 5.1, Mythos 5.1, Fable 5 and Mythos 5 "require 30-day data retention" and are not available under ZDR unless Anthropic authorises it, so the model you pick changes your retention story. Structured outputs have a quirk: only the JSON schema is cached, for up to 24 hours, and the page says PHI must not appear in schema definitions. So no real values in enums or descriptions.

## Hands-on: detect, replace, restore

This uses the documented `AnalyzerEngine.analyze` call and its `RecognizerResult` fields (`entity_type`, `score`, `start`, `end`) and does the replacement in plain Python so the placeholders are numbered and reversible. Check Presidio's entity list for exact names; `PERSON` and `PHONE_NUMBER` are the ones its docs use.

```python
import re
from presidio_analyzer import AnalyzerEngine

analyzer = AnalyzerEngine()
PAN_LIKE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")   # your own deterministic pattern

def redact(text: str, min_score: float = 0.5):
    spans = [(r.start, r.end, r.entity_type)
             for r in analyzer.analyze(text=text,
                                       entities=["PERSON", "PHONE_NUMBER"],
                                       language="en")
             if r.score >= min_score]
    spans += [(m.start(), m.end(), "ID") for m in PAN_LIKE.finditer(text)]
    spans.sort()

    mapping, counters, out, cursor = {}, {}, [], 0
    for start, end, kind in spans:
        if start < cursor:                       # overlapping detections: skip
            continue
        value = text[start:end]
        if value not in mapping.values():
            counters[kind] = counters.get(kind, 0) + 1
            mapping[f"<{kind}_{counters[kind]}>"] = value
        token = next(k for k, v in mapping.items() if v == value)
        out.append(text[cursor:start]); out.append(token)
        cursor = end
    out.append(text[cursor:])
    return "".join(out), mapping            # mapping never leaves your service

def restore(text: str, mapping: dict) -> str:
    for token, value in sorted(mapping.items(), key=lambda kv: -len(kv[0])):
        text = text.replace(token, value)   # longest token first: <PERSON_10> before <PERSON_1>
    return text

safe, key = redact("Call Priya Raman on 212-555-5555 about ABCDE1234F.")
# safe -> "Call <PERSON_1> on <PHONE_NUMBER_1> about <ID_1>."
# send `safe` to the model; run restore(model_output, key) before showing the user
```

Store `key` in your own datastore with its own retention, and delete it when the purpose ends. If you need the original back across sessions, encrypt the mapping rather than keeping plaintext. And log the redacted text, never the original.

## Takeaways

- Redact before the model call, not after. Minimisation is cheaper than cleanup.
- Layer regex, NER and human review, and measure recall on your own traffic. Presidio's maintainers say detection is not guaranteed.
- Prefer numbered, deterministic placeholders with a server-side mapping so the model can still reason and the cache can still hit.
- Know your provider's retention terms per model: ZDR is opt-in, and some models require 30-day retention.
- Treat DPDP dates as a planning baseline from secondary sources and verify the notified text; most obligations start 13 May 2027.

For what to do when the input is hostile rather than sensitive, see [guardrails that actually fire](/blog/guardrails-that-actually-fire).
