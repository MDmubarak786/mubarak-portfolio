---
id: ADR-008
title: Automate student application workflows with Chrome extensions
index: "Chrome extensions (MV3)"
status: accepted
date: "2025"
organisation: Incresco · Global University Systems
role: Software Development Engineer 2
summary: Production Manifest V3 extensions automate repetitive admin work inside existing web tools, saving admins 3–5 hours a day at 99.9% uptime.
context: >-
  Admin teams worked application workflows by hand inside third-party web tools that could not be changed.
options:
  - name: Request changes from the vendors
    pros:
      - No code to maintain
    cons:
      - Slow, uncertain, and outside the team's control
  - name: Browser extensions that automate the workflow in place
    chosen: true
    pros:
      - Ships in weeks, works on top of tools the team already uses
    cons:
      - Manifest V3 limits and vendor UI changes need monitoring
decision: >-
  Build and ship Manifest V3 Chrome extensions that automate the student application workflows admins repeat every day.
consequences:
  - label: Time saved
    value: "3–5 hours per admin per day"
    emphasis: true
  - label: Reliability
    value: "99.9% uptime"
reviewedBy: []
tags: [Chrome Extensions, Manifest V3, Automation]
confirmed: false
order: 8
---
