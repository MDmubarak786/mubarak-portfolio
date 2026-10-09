---
id: ADR-005
title: Push live utility data to the Planet dashboards over SignalR
index: "Planet IoT over SignalR"
status: accepted
date: "2023"
organisation: Incresco
role: Software Development Engineer 2
summary: The Planet SIM and Planet Business IoT web apps show live utility management and real-time water service status for apartment communities.
context: >-
  Planet SIM and Planet Business monitor utilities for apartment communities. Operators need to see service status as it changes, with Firebase authentication and REST APIs behind the apps.
options:
  - name: Poll the REST APIs on an interval
    pros:
      - Simple to build
    cons:
      - Status lags behind reality
      - Wasted requests when nothing changes
  - name: Real-time dashboards over SignalR
    chosen: true
    pros:
      - Status updates arrive as they happen
      - Reliable monitoring for apartment communities
    cons:
      - Persistent connections to manage alongside REST and Firebase auth
decision: >-
  Direct the IoT web apps with Firebase auth and REST APIs for commands, and SignalR for the real-time dashboards.
consequences:
  - label: Water service tracking
    value: Real-time status for apartment communities
    emphasis: true
reviewedBy: []
tags: [SignalR, Firebase, IoT]
confirmed: false
order: 5
---
