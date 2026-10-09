---
id: ADR-002
title: Let content teams run localization themselves inside Storyblok
index: "Localization in Storyblok"
status: accepted
date: "2023"
organisation: EF Academy
role: Lead Software Engineer, sole developer on the marketing platform
summary: The multilingual marketing platform serving 1.25M+ monthly users across 23+ languages got a translation workflow its content teams could run without engineering.
context: >-
  EF Academy's primary digital presence is a high-traffic, multilingual marketing site built on Next.js and Storyblok with Salesforce and AWS integrations, maintained and evolved by one engineer. Every localization project that needed an engineer in the loop slowed the content teams down.
options:
  - name: Keep localization as an engineering request
    pros:
      - No new tooling to build or support
    cons:
      - One engineer became the bottleneck for 23+ languages
      - Content teams could not plan launches on their own timeline
  - name: Build a translation workflow inside Storyblok
    chosen: true
    pros:
      - Content teams execute localization projects autonomously
      - Translations live next to the content they translate
    cons:
      - Workflow and validation had to be built and documented for non-engineers
decision: >-
  Deliver a translation workflow inside Storyblok so content teams can run localization projects end to end, and keep the platform's engineering effort on performance, SEO, and integrations.
consequences:
  - label: Monthly users
    value: "1.25M+"
    emphasis: true
  - label: Languages
    value: "23+"
  - label: Localization
    value: Content teams execute projects autonomously
reviewedBy: [julieta-capogna, andrea-devis-matheus, minon-weber]
tags: [Next.js, Storyblok, Localization, SEO]
confirmed: false
order: 2
---
