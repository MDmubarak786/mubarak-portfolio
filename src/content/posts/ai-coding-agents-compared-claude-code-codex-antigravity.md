---
title: "AI coding agents in late 2026: Claude Code, Codex and Antigravity compared"
description: "As of 10 October 2026: what Claude Code, OpenAI Codex and Google Antigravity are, which models and plans sit behind them, and how to run a fair bake-off."
date: 2026-10-10T01:33:00Z
tags: ["Claude Code", "Codex", "Antigravity", "coding agents", "pricing"]
pillar: model-watch
sources:
  - title: "Claude Code docs: overview (surfaces, features)"
    url: "https://code.claude.com/docs/en/overview"
  - title: "Claude Code docs: model configuration (default model, aliases)"
    url: "https://code.claude.com/docs/en/model-config"
  - title: "Claude plans and pricing (Claude Code access, usage limits)"
    url: "https://claude.com/pricing"
  - title: "OpenAI Codex CLI on GitHub (openai/codex)"
    url: "https://github.com/openai/codex"
  - title: "ChatGPT docs: pricing (Codex plans, models, limits, GPT-5.5 retirement)"
    url: "https://learn.chatgpt.com/docs/pricing"
  - title: "Antigravity docs: models (per-plan availability, removal dates)"
    url: "https://antigravity.google/docs/models"
  - title: "Antigravity docs: plans and AI credits (quotas, overage, unsupported options)"
    url: "https://antigravity.google/docs/plans"
  - title: "Wikipedia: Google Antigravity (secondary: history, components, plans)"
    url: "https://en.wikipedia.org/wiki/Google_Antigravity"
draft: false
---

As of 10 October 2026, the three coding agents most builders compare are Claude Code, OpenAI's Codex and Google's Antigravity. They overlap more than their marketing suggests: a terminal tool, a desktop app, sub-agents, scheduled tasks and a plan-based subscription each. The useful differences are which models they run, how they are billed, and what they let you control. I built this site with Claude Code, and I say below where my knowledge stops.

## What is each of them?

**Claude Code** is "an agentic coding tool that reads your codebase, edits files, runs commands, and integrates with your development tools", per Anthropic's docs. It runs in the terminal, in VS Code and JetBrains, in a desktop app and in the browser, and "each surface connects to the same underlying Claude Code engine", so `CLAUDE.md` files, settings and MCP servers carry across them. The docs also list skills, hooks, sub-agents, scheduled routines, GitHub Actions and an Agent SDK. If your repository already has an `AGENTS.md`, the docs say Claude Code "can read that in place of a `CLAUDE.md`".

**Codex** is OpenAI's agent. The open-source CLI describes itself as a "Lightweight coding agent that runs in your terminal", carries an Apache-2.0 licence, and installs through npm, Homebrew or a curl script. You sign in with a ChatGPT plan or use an API key, which the page says "requires additional setup". OpenAI's pricing page treats it as part of ChatGPT: "ChatGPT Work and Codex are included in your ChatGPT Free, Go, Plus, Pro, Business, Edu, or Enterprise plan."

**Antigravity** is Google's. Wikipedia, which is a secondary source, says it launched on 18 November 2025 as a free public preview and was rebuilt as Antigravity 2.0 at Google I/O on 19 May 2026. As of October 2026 it has a standalone desktop app, a command-line tool written in Go, a Python SDK for custom agents, and the original VS Code-based IDE, which the article says had its last release in August. The article adds that the desktop app and CLI kept receiving frequent updates.

## Which models are behind them?

Claude Code's model page gives a clear answer. On Pro, Max, Team, Enterprise and the Anthropic API, `default` "defaults to Opus 5.5". The aliases `opus`, `sonnet` and `haiku` resolve to Opus 5.5, Sonnet 5.5 and Haiku 5.5 on the Anthropic API, and `fable` selects the Fable model for the hardest tasks. The docs say "Fable models are not the account-type default on any plan or provider." Cloud-provider defaults differ: Microsoft Foundry defaults to Sonnet 4.5, and its `opus` alias maps to Opus 4.6.

Codex's page does not name one default. It lists models by plan: Free gets GPT-6 Luna in the desktop app "subject to rollout", Plus gets GPT-6.1 Sol and GPT-6 Luna, and Enterprise and Edu have GPT-6.1 Sol off until an admin enables it. With an API key, "model availability follows the API models your key can access." One date to note: "GPT-5.5 retires from ChatGPT, ChatGPT Work, and Codex on all plans on October 14, 2026", with the API unaffected.

Antigravity is the odd one out because it is not tied to one lab. Its models page lists Gemini 3.8 Flash, 3.7 Flash, 3.6 Flash and 3.1 Pro on every plan, plus Claude Sonnet 5.5 and Opus 5.5 (thinking) on Google AI Pro (non-trial subscriptions only), Ultra and Enterprise, but not on the free tier. It also lists Claude Sonnet 4.6, Opus 4.6 and GPT-OSS-120b, with the removal date given as 2 November 2026 for the Claude 4.6 models and GPT-OSS-120b. So you can run a Claude model inside Google's agent. The Claude Code and Codex pages I read describe no equivalent for running another lab's models.

## How are they billed?

All three bundle usage into subscriptions, with an API route for the heavy cases.

| | Entry | Heavy use | Limit style |
|---|---|---|---|
| Claude Code | Pro, $17/month annual or $20 monthly | Max, from $100 (5x or 20x Pro) | Rolling five-hour window plus weekly limits |
| Codex | Plus, $20/month | Pro, $100, $200 or $500 tiers | Plus: five-hour estimates; "Pro plans currently have no five-hour limit" |
| Antigravity | Free, weekly quota | Google AI Pro and Ultra, five-hour refresh | Quota by capacity; credits for overage |

Claude's pricing page says Claude Code "is included in all paid plans" and "shares the same usage limits as the rest of your plan", and the free plan does not include it. Team seats are $20 a month annual or $25 monthly for Standard, and $100 or $125 for Premium. OpenAI's page gives Business at $20 per user per month for two or more users billed annually, or $25 monthly, and an estimate for Plus of roughly 15 to 160 local messages on GPT-6.1 Sol per five hours, and 350 to 3,000 on GPT-6 Luna. Both vendors let you pay API rates instead.

For Antigravity, Wikipedia says there is no Antigravity-specific subscription: individuals get free use with a weekly quota, AI Pro and Ultra subscribers get larger quotas that refresh every five hours, and the 2.0 release added a $100-a-month Ultra tier while the top tier fell from $250 to $200. Google's plans page confirms the structure but links out for prices, which I did not read. It also says bring-your-own-key is not supported. Treat Antigravity prices as secondary until you check Google's page.

## What does it mean for people shipping products?

The first-hand part is small. This site is built with Claude Code, alongside Astro 7, Tailwind v4 and GSAP, and I do not make first-hand claims about Codex or Antigravity; what I say about them comes from their documentation and Wikipedia.

On that basis, three opinions.

**Pick by where your code review and your data policy sit, not by a leaderboard.** Public benchmark numbers for these tools move weekly and the comparison blogs I saw disagree on which model is behind which tool, so I am not repeating any. Your questions are different: does your security team allow a cloud sandbox, which models may your contracts use, and who pays when a limit resets?

**Instruction files are the portable asset.** Claude Code reads `CLAUDE.md`, or an `AGENTS.md` in its place. Keeping your repo conventions, build commands and review checklist in one file that more than one tool reads makes a switch cheap. That is a design argument, not a measurement.

**Model flexibility is a real difference.** Antigravity can run Claude and Gemini models; the Claude Code and Codex pages describe Claude and OpenAI models respectively. If your team wants to change the model without changing the tool, that matters. If it wants one vendor and one invoice, it is a cost.

## Hands-on: a fair bake-off

Do not trust a single prompt. Choose five tasks from your own backlog that you already know the answer to, give each an acceptance test, and run each tool on the same commit.

```markdown
| Task | Tool | Passed acceptance test | Human interventions | Wall-clock | Plan usage consumed |
|---|---|---|---|---|---|
| T1 add pagination to /orders | Claude Code | | | | |
| T1 add pagination to /orders | Codex | | | | |
| T1 add pagination to /orders | Antigravity | | | | |
```

Run each task in a clean branch, count an intervention every time you correct the agent, and read the plan-usage meter before and after. For Claude Code, headless runs make this scriptable; these are the docs' own examples:

```bash
claude "write tests for the auth module, run them, and fix any failures"

git diff main --name-only | claude -p "review these changed files for security issues"
```

Then a worked budget. Ten engineers, all on the entry paid plan, billed monthly where the vendors list it: Claude Pro at $20 is $200 a month, Codex Plus at $20 is $200 a month. Moving three of the ten to a $100 heavy-use tier adds $240 a month on either, to $440. On Claude's Team plan, Standard seats are $20 a month annual, which is also $200 for ten. The point is not the figures, which will change, but that the per-seat price differences are small beside an hour of engineer time. Spend your attention on interventions per task, not on the invoice.

## Takeaways

- Claude Code, Codex and Antigravity are each a terminal tool, a desktop app and a subscription, and the surface differences are narrower than the model and billing differences.
- Claude Code's default model is Opus 5.5 on the plans listed in its docs; Codex lists GPT-6 models by plan with no single default; Antigravity offers Gemini, Claude and GPT-OSS models, varying by plan.
- Entry plans cluster around $20 a month for Claude Pro and Codex Plus, and heavy-use tiers start around $100 on Claude Max and Codex Pro.
- Keep your repo instructions in a file more than one tool can read, and run a five-task bake-off on your own code.
- Antigravity prices here are secondary; check Google's plan page before you budget.

If you run Claude Code on a large codebase, the prompt-caching economics post on this blog explains why stable context keeps the bill down.
