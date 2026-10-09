---
id: ADR-006
title: Keep Edvanza's web and mobile apps in feature parity with one front-end team
index: "Edvanza web + mobile parity"
status: accepted
date: "2022"
organisation: IncrescoTech
role: Software Engineer, then Junior Software Engineer
summary: Leading four front-end engineers, core Edvanza modules shipped across React and React Native with parity between web and mobile.
context: >-
  Edvanza runs on React for the web and React Native for iOS and Android. As a junior engineer Mubarak owned the Jobs and Learn modules across all three and completed 1,300+ pull requests during ramp-up; as Software Engineer he led the four-person front-end team.
options:
  - name: Ship web first, port to mobile later
    pros:
      - Faster first release on one platform
    cons:
      - Mobile users wait; behaviour drifts between platforms
  - name: Deliver each module to web and mobile together
    chosen: true
    pros:
      - Feature parity between web and mobile
      - One team, one definition of done
    cons:
      - Every module costs two implementations before it ships
decision: >-
  Deliver core modules to React and React Native together, mentor the team, keep stakeholders aligned, and hold the quality line through code review and hiring.
consequences:
  - label: Team
    value: Four front-end engineers led and mentored
  - label: Pull requests reviewed
    value: "37% of the organisation's"
    emphasis: true
  - label: Interviews
    value: "30+ candidate evaluations on the technical panel"
  - label: Ramp-up
    value: "1,300+ pull requests completed"
reviewedBy: [chloe-sturges]
tags: [React, React Native, Leadership]
confirmed: false
order: 6
---
