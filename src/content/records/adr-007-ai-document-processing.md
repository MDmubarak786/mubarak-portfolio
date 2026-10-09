---
id: ADR-007
title: Classify and extract incoming documents with GPT-4 Vision and OCR
index: "AI document processing"
status: accepted
date: "2025"
organisation: Incresco · Global University Systems
role: Software Development Engineer 2
summary: GPT-4 Vision and OCR validation APIs for CampusNet and the BGV system classify 17+ document types at 95% accuracy, cut manual data entry by 70%, and catch fraud through cross-document validation.
context: >-
  Admissions teams at Global University Systems received student documents of many kinds and keyed them in by hand. Volume grew, accuracy suffered, and compliance checks against Anabin and ECCTIS took effort nobody had.
options:
  - name: Keep manual data entry
    pros:
      - No model risk
    cons:
      - Slow, error-prone, and impossible to scale with intake
  - name: GPT-4 Vision plus OCR with confidence scoring
    chosen: true
    pros:
      - 17+ document types classified at 95% accuracy
      - Qualification matching with confidence scores for Anabin and ECCTIS
    cons:
      - Model outputs need guardrails, evaluation and human review paths
decision: >-
  Build document processing APIs on GPT-4 Vision and OCR with confidence scoring and review thresholds, and extend the same approach to qualification matching for compliance automation.
consequences:
  - label: Accuracy
    value: "95% across 17+ document types"
    emphasis: true
  - label: Manual data entry
    value: "Cut by 70%, processing 7× faster"
  - label: Complex documents
    value: "Accuracy up 40%+ on payslips, EPFO records, certificates"
  - label: Compliance
    value: "Fraud detection via cross-document validation; effort down 60%+"
reviewedBy: []
tags: [GPT-4 Vision, OCR, LLMs, Compliance]
confirmed: false
order: 7
---
