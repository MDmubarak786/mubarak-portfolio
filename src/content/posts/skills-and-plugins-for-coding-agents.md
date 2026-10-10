---
title: "Skills and plugins for coding agents: packaging team process"
description: "What Claude Code skills and plugins are, where they live, what they cost in context, and how the impeccable plugin keeps design rules out of this site's prompts."
date: 2026-10-10T02:34:00Z
tags: ["Claude Code", "skills", "plugins", "coding agents", "impeccable", "developer workflow"]
pillar: building
sources:
  - title: "Claude Code docs: Skills (locations, frontmatter, progressive disclosure)"
    url: "https://code.claude.com/docs/en/skills"
  - title: "Claude Code docs: Plugins overview (what a plugin is, context cost, scopes)"
    url: "https://code.claude.com/docs/en/plugins"
  - title: "Claude Code docs: Create a plugin (layout, --plugin-dir, validate)"
    url: "https://code.claude.com/docs/en/plugins/create"
  - title: "Claude Code docs: Plugin manifest reference (plugin.json fields, standard layout)"
    url: "https://code.claude.com/docs/en/plugins/manifest-reference"
  - title: "impeccable on GitHub (pbakaus/impeccable): README, commands, detector, install"
    url: "https://github.com/pbakaus/impeccable"
draft: false
---

Every team has a process that lives in somebody's head and a wiki nobody opens: how a pull request is reviewed, what a migration must prove, which design rules are not up for debate. A coding agent reads none of it unless you put it in front of the agent. As of 10 October 2026, Claude Code's documented answer is two layers: a skill for one piece of process, and a plugin for shipping several of them as one unit.

This post is what the docs say about both, what they cost, one example I use on this site, and a skill you can copy.

## What is a Claude Code skill?

A skill is a folder with a `SKILL.md` file of instructions that Claude adds to its toolkit. Claude loads it when the request matches, or you run it yourself with `/skill-name`. Skills follow the open Agent Skills standard, with Claude Code extensions, and the older `.claude/commands/` files have been merged into skills and still work.

Where a skill lives decides who gets it:

| Location | Path | Who gets it |
|---|---|---|
| Personal | `~/.claude/skills/<name>/SKILL.md` | You, in every project on the machine |
| Project | `.claude/skills/<name>/SKILL.md` | Everyone who clones the repo, if you commit it |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Wherever the plugin is enabled, as `/plugin-name:skill-name` |

The frontmatter is YAML at the top of the file. Every field is optional and `description` is recommended. The ones that matter for packaging process:

- `description`: what the skill does and when to use it. Claude reads this to decide whether to load the skill, so front-load the use case.
- `disable-model-invocation: true`: only you can trigger it. The docs recommend it for anything with side effects, such as deploys or sending messages.
- `allowed-tools`: tools Claude may use without prompting during the turn the skill runs. It grants permission; it does not restrict other tools.
- `context: fork`: run the skill in a subagent that cannot see your conversation. It only suits skills with an explicit task, not pure guidelines.
- `paths`: glob patterns that limit automatic loading to matching files.

The docs warn that "unrecognized field names are silently ignored, so check spelling." A typo in `disable-model-invocation` fails open.

### How much of a skill is in context?

This is the design detail that makes skills cheap. The descriptions are always in context so Claude knows what exists. The full body loads only when the skill is invoked, and then stays for the session. The docs recommend keeping `SKILL.md` under 500 lines and moving long reference material into supporting files that Claude reads when needed. A script in the folder is executed, not loaded into context.

## What is a plugin, and when do you need one?

A plugin is a directory of skills, agents, hooks, MCP servers or other components that Claude Code installs and loads as one unit. The manifest is `.claude-plugin/plugin.json`, and `name` is the only required key. Everything else sits at the plugin root, not inside `.claude-plugin/`:

```text
team-process/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── pr-review/
│       └── SKILL.md
├── agents/        (optional subagents)
└── hooks/
    └── hooks.json (optional lifecycle hooks)
```

Plugin components are namespaced under the plugin name, so a `pr-review` skill in `team-process` runs as `/team-process:pr-review`. Two plugins can each ship a `review` skill without colliding.

The docs are direct about when not to bother: skills, subagents, hooks and MCP servers all work on their own. Keep a standalone setup while it serves one project or only you. Make a plugin when you want to hand the setup to teammates, install it in many repositories, or publish versioned releases. Install scopes are user, project (committed in `.claude/settings.json`, though each collaborator still installs it) and local.

## What does a plugin cost you?

More than the file size suggests, and the plugins overview says so. An enabled plugin is "part of every session, not only the sessions where you use it." For each skill, agent and command Claude can invoke on its own, the name and description sit in context on every turn. Those tokens count toward usage and leave less room in the window, even when nothing from the plugin runs. MCP servers a plugin defines run alongside each session, its hooks fire at their events, and whatever a plugin runs, it runs as you.

Three habits follow from that:

1. Write short descriptions. They are the part you pay for every turn.
2. Mark side-effect skills `disable-model-invocation: true` so their description is not in context at all and Claude cannot fire them unprompted.
3. Read a plugin before installing it. The docs have a security page, and anything with hooks or MCP servers can execute code with your privileges.

Claude Code also ships `/skill-doctor`, which the skills page says reports unused skills and their context cost.

## How does this site use a plugin?

The design side of this site is where I use one. impeccable (github.com/pbakaus/impeccable, Apache 2.0) describes itself as a design language for AI coding agents. Per its README it ships one skill with 24 commands, run as `/impeccable <command> <target>`. `init` records product context in `PRODUCT.md`; the visual system lives in `DESIGN.md`. There are review commands (`critique`, `audit`, `polish`) and adjustment commands (`typeset`, `layout`, `animate`, `harden`, among others).

It also ships a standalone detector with 59 deterministic rules, `npx impeccable detect <path|url>`, which needs no LLM or API key and exits 2 when it finds primary issues, so it can sit in CI. Claude Code installs it with `/plugin marketplace add pbakaus/impeccable`.

The files it manages are in this repo. `PRODUCT.md` states the audience (hiring managers with 30 to 90 seconds) and the constraints. `DESIGN.md` records the tokens and the rules, including a rule against pre-hiding content for an entrance animation. That is the real value of a packaged process: the rule is written once, in a file the agent reads at the start of a task, instead of being retyped into each prompt and quietly dropped by the fifth one.

## Hands-on: a team PR-review skill as a plugin

A skill that reviews the current branch against `main`, with the diff injected before Claude sees the prompt. The `` !`command` `` syntax is documented: the command runs first and its output replaces the placeholder. The docs note that if an injected command fails, the whole invocation aborts, hence `|| true`.

`team-process/skills/pr-review/SKILL.md`:

```markdown
---
name: pr-review
description: Reviews the current branch against main for merge-blocking problems. Use when the user asks for a review, a pre-PR check, or what could break.
disable-model-invocation: true
allowed-tools: Bash(git diff *) Bash(git log *) Bash(git status *)
---

## Branch diff

!`git diff main...HEAD || true`

## Instructions

List only problems you would block the merge for. For each one give the
file and line, why it is wrong, and how to show that it fails.
Mark anything you could not confirm, and say where you looked.
End with: Blocked on me, Changed, Found.
```

`team-process/.claude-plugin/plugin.json`:

```json
{
  "name": "team-process",
  "description": "Review and migration checklists for our repos",
  "version": "1.0.0",
  "author": { "name": "Your Team" }
}
```

Validate it, load it for one session without installing anything, and run it:

```bash
claude plugin validate ./team-process
claude --plugin-dir ./team-process
# inside the session:
/team-process:pr-review
```

After editing files mid-session, `/reload-plugins` applies the change. The docs also describe `claude plugin eval`, which runs your test cases with and without the plugin and scores the difference. A plugin that loads without errors can still fail to change the agent's behaviour, and that is the check that catches it.

To share it, send the folder or a `.zip`, list it in your own marketplace, or submit it to Anthropic's directory. For a team of five, a committed `.claude/skills/` folder is usually enough, and moving to a plugin later is a copy of the directory plus a manifest.

## Takeaways

- A skill is one piece of process in a `SKILL.md`; a plugin is a versioned bundle of skills, agents, hooks and MCP servers. Start with skills.
- Descriptions cost context on every turn; bodies load only on use. Write tight descriptions and keep `SKILL.md` under 500 lines.
- Put side effects behind `disable-model-invocation: true`, and treat any plugin with hooks or MCP servers as code you are running as yourself.
- Write rules where the agent reads them first, as `DESIGN.md` does here, instead of repeating them in prompts.
- Test the plugin's effect with `claude plugin eval`, not only whether it loads.

Next: [agentic coding on a legacy codebase with Opus 5.5](/blog/agentic-coding-on-a-legacy-codebase-opus-5-5), and where a checklist like this stops being enough.
