---
id: ADR-001
title: Replace the Tibco Scribe integration layer with AWS Glue
index: "Tibco → AWS Glue"
status: accepted
date: "2024"
organisation: EF Academy
role: Lead Software Engineer, sole developer on the platform
summary: A licensed integration pipeline was replaced with AWS Glue before the licence ended, cutting the annual cost from $24,000 to $840.
context: >-
  EF Academy's Salesforce integrations and data transformations ran on Tibco Scribe under a licence that cost $24,000 a year and had an end date. The pipelines fed daily operations, so the replacement had to finish before the contract ran out and could not interrupt the business.
options:
  - name: Renew the Tibco Scribe licence
    pros:
      - No migration risk
      - The teams already knew the tooling
    cons:
      - $24,000 a year, every year
      - Licensing, not engineering, set the ceiling on what the pipelines could do
  - name: Rebuild the integration layer on AWS Glue
    chosen: true
    pros:
      - Pay-per-run serverless jobs inside the AWS account EF Academy already used
      - Pipelines become code the team owns and can extend
    cons:
      - A hard deadline fixed by the licence end date
      - Every existing pipeline had to be re-specified and verified against live data
decision: >-
  Rebuild the integration layer on AWS Glue, broken into clear steps with progress shared regularly, and cut over before the Tibco contract ended.
consequences:
  - label: Annual integration cost
    value: "$24,000 → $840"
  - label: Saving
    value: "96.5%"
    emphasis: true
  - label: Delivery
    value: Finished before the Tibco contract ended, with no disruption to daily operations
  - label: Licensing fees, as the VP of Technology counts them
    value: "$30,000 a year"
reviewedBy: [jason-wheeler, john-squier]
tags: [AWS Glue, Salesforce, Data pipelines]
confirmed: false
order: 1
---
