---
id: ADR-004
title: Rebuild the Incresco and Camped marketing sites on Astro and Storyblok
status: accepted
date: "2023"
organisation: IncrescoTech
role: Lead Software Engineer
summary: A redesign on Astro and Storyblok with customizable page builders reached 100% Lighthouse scores and let campaigns launch across 23+ languages.
context: >-
  The Incresco and Camped marketing sites needed a comprehensive redesign with better SEO and sitemap performance, and marketing wanted to launch campaigns in many languages without waiting on engineering.
options:
  - name: Redesign on the existing stack
    pros:
      - No platform change
    cons:
      - Performance and SEO ceilings stayed where they were
      - Every campaign page was still an engineering task
  - name: Astro with Storyblok and customizable page builders
    chosen: true
    pros:
      - Static output with 100% Lighthouse scores
      - Page builders let marketing assemble campaign pages themselves
    cons:
      - A new framework for the team to learn and support
decision: >-
  Rebuild on Astro and Storyblok with customizable page builders, and treat Lighthouse and sitemap quality as acceptance criteria.
consequences:
  - label: Lighthouse
    value: "100% across the board"
    emphasis: true
  - label: Campaign launches
    value: Accelerated across 23+ languages
reviewedBy: []
tags: [Astro, Storyblok, SEO]
confirmed: false
order: 4
---
