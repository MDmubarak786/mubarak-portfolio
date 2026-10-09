---
id: ADR-003
title: Move lead uploads to a serverless Prospect Uploader with validation
status: accepted
date: "2023"
organisation: EF Academy
role: Lead Software Engineer
summary: CSV lead uploads into Salesforce became an AWS Lambda and EventBridge pipeline that validates in every language, alerts by email, and shows failures in a Prospect Viewer.
context: >-
  Marketing teams upload prospect lists of 10,000+ rows into Salesforce. Rows arrive from many countries, so validation has to understand multilingual data, and a silent failure means lost leads.
options:
  - name: Upload CSVs directly into Salesforce
    pros:
      - No pipeline to run
    cons:
      - Validation failures were invisible until someone noticed missing leads
      - No multilingual rules
  - name: Prospect Uploader on AWS Lambda and EventBridge, with a Prospect Viewer
    chosen: true
    pros:
      - Handles 10k+ CSV leads with multilingual validation and email alerts
      - A Prospect Viewer surfaces validation failures and stakeholder-ready insights
    cons:
      - Another application for one engineer to own
decision: >-
  Build the uploader as event-driven Lambda functions on EventBridge, validate every row with multilingual rules, alert by email, and give stakeholders a Prospect Viewer for failures and insights.
consequences:
  - label: Leads handled per upload
    value: "10,000+"
    emphasis: true
  - label: Visibility
    value: Validation failures and lead-quality insights surfaced to stakeholders
reviewedBy: [jason-wheeler, naga-venkata-sai-kotha]
tags: [AWS Lambda, EventBridge, Salesforce]
confirmed: false
order: 3
---
