---
title: "Model deprecation calendar, Q4 2026: Anthropic, Google and OpenAI dates"
description: "Every dated retirement from Anthropic, Google and OpenAI between October and December 2026, with migration targets, the soft dates to ignore, and a CI check."
date: 2026-10-10T01:26:00Z
tags: ["deprecation", "Claude", "Gemini", "OpenAI", "migration"]
pillar: model-watch
sources:
  - title: "Claude docs: model deprecations (status table, history, notice policy)"
    url: "https://platform.claude.com/docs/en/about-claude/model-deprecations"
  - title: "Gemini API deprecations (shutdown table, page updated 9 October 2026)"
    url: "https://ai.google.dev/gemini-api/docs/deprecations"
  - title: "Gemini API pricing (listed gemini-2.5-flash-image differently from the deprecations page)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Gemini API release notes (August to October 2026 entries)"
    url: "https://ai.google.dev/gemini-api/docs/changelog"
  - title: "OpenAI API docs: deprecations (the platform.openai.com URL redirects here)"
    url: "https://developers.openai.com/api/docs/deprecations"
draft: false
---

As of 10 October 2026, dozens of model IDs have dated shutdowns before the end of the year across the three big APIs, and the dates cluster: 22 and 23 October, 17 November, 30 November, 1 December, 11 December. This is the calendar, built only from each vendor's own deprecations page, with the dates that look like retirements but are not separated out.

I compiled it from the vendor pages listed below, fetched on 10 October. Vendors edit these pages without announcement, so treat the table as a snapshot and re-check the source column before you act on a date.

## What gets retired in Q4 2026?

All dates 2026. Source column: **A** is Anthropic's deprecations page, **G** is Google's deprecations page, **O** is OpenAI's deprecations page. Every row is a vendor page; none is third-party.

| Date | Vendor | What | Migrate to |
|---|---|---|---|
| 22 Oct | G | `veo-3.1-generate-preview`, `veo-3.1-fast-generate-preview`, `veo-3.1-lite-generate-preview`, `gemini-omni-flash-preview` | `gemini-omni-1.1-flash` |
| 23 Oct | G | `deep-research-pro-preview-12-2025` | `deep-research-preview-04-2026` |
| 23 Oct | O | Legacy GPT snapshots and fine-tunes (grouped below) | `gpt-5.6-terra`, `gpt-5.6-sol`, `gpt-5.6-luna` |
| 17 Nov | G | `gemini-3.1-flash-tts-preview`, `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts` | `gemini-3.8-flash-tts` or `gemini-3.8-flash-lite-tts` |
| 17 Nov | G | `gemini-3.1-flash-live-preview`, `gemini-2.5-flash-native-audio-preview-12-2025` | `gemini-3.8-live` |
| 30 Nov | A | `claude-sonnet-4-5-20250929` | `claude-sonnet-5-5` |
| 30 Nov | O | `v1/prompts` API and reusable prompt objects | Move prompt content into application code |
| 30 Nov | O | Evals dashboard and API (existing evals read-only from 31 Oct) | Promptfoo (migration guide linked on the page) |
| 30 Nov | O | Agent Builder (ChatKit stays) | Agents SDK or ChatGPT Workspace Agents |
| 1 Dec | O | `gpt-image-1-mini`, `gpt-image-1.5`, `chatgpt-image-latest` | `gpt-image-2.5-sunburst` or `gpt-image-2.5-flare` |
| 11 Dec | O | `gpt-5-2025-08-07`, `o3-2025-04-16` | `gpt-5.6-sol` |
| 11 Dec | O | `gpt-5-mini-2025-08-07` | `gpt-5.6-terra` |
| 11 Dec | O | `gpt-5-nano-2025-08-07` | `gpt-5.6-luna` |
| 11 Dec | O | `gpt-5-pro-2025-10-06`, `o3-pro-2025-06-10` | `gpt-5.6-sol` with `reasoning.mode: pro` |

The OpenAI 23 October entry is long. By family, as OpenAI lists it: `gpt-3.5-turbo` variants, `o4-mini` and the fine-tuned `ft-gpt-3.5-turbo` and `ft-o4-mini` go to `gpt-5.6-terra`. `gpt-4`, `gpt-4-turbo`, `gpt-4-1106-preview`, `gpt-4o-2024-05-13`, `o1`, `o1-pro` (with `reasoning.mode: pro`), `o3-mini` and `ft-gpt-4` go to `gpt-5.6-sol`. `gpt-4.1-nano` and its fine-tune go to `gpt-5.6-luna`. `gpt-image-1` goes to the `gpt-image-2.5` models. If your code names any `gpt-4*`, `o1*` or `gpt-3.5*` ID, assume it is on this date and read the page for the exact string.

Already past as of today and worth checking in your logs: Google's `antigravity-preview-05-2026` shut down on 5 October (replaced by `antigravity-preview-09-2026`), and OpenAI's `gpt-5.4-cyber` on 1 October and `gpt-3.5-turbo-instruct`, `babbage-002` and `davinci-002` on 28 September.

## Which dates look like retirements but are not?

**Anthropic's "not sooner than" dates.** The status table lists a tentative retirement date for every model, including active ones, and the words are "Not sooner than". `claude-haiku-4-5-20251001` shows 15 October 2026 and `claude-opus-4-5-20251101` shows 24 November 2026. Both are listed as Active with no deprecation date. These are floors on when Anthropic could retire them, not announcements. The page says Anthropic provides "at least 60 days' notice before model retirement for publicly released models", so the signal to act is a model moving to Deprecated with a retirement date, as Sonnet 4.5 did on 30 September. In Q4 the only Anthropic retirement with a firm date is that one.

**Google's "earliest possible dates".** The Google page says shutdown dates in the table "indicate the earliest possible dates" and that exact dates come with advance notice. Treat Google's table as a lower bound, and the 15-day gap between the deep research deprecation (8 October) and its shutdown (23 October) as the precedent for how short notice can be.

**Routing is not retirement.** On 8 October Google deprecated `gemini-3.7-flash` and `gemini-3.5-flash` with no shutdown date: "requests to `gemini-3.7-flash` are automatically routed to `gemini-3.8-flash`", and 3.5 Flash to `gemini-3.6-flash`. Nothing breaks, but you are now running a different model than your tests did. The 2.5 models are a third case: since 18 September access is limited to users who have used them recently, and Google says they are "not deprecated" and served until further notice.

**One conflict between Google pages.** The Gemini pricing page, as I read it, labelled `gemini-2.5-flash-image` as shutting down on 2 October 2026, while the deprecations page, updated 9 October, lists 15 March 2027 with `gemini-3.1-flash-lite-image` as the replacement. I used the deprecations page and left the row out of the table; check both before you rely on it.

One caveat on Anthropic's dates: they apply to Anthropic-operated platforms (the Claude API, Claude Platform on AWS, Microsoft Foundry). Amazon Bedrock and Google Cloud "set their own retirement schedules", so a model can live longer there.

## What lands just after Q4?

Announced in this quarter, effective later, from the same pages: OpenAI's `gpt-5.3-codex`, `gpt-5.4-nano` and `gpt-5.1` retire on 1 April 2027 (to `gpt-6-sol` or `gpt-6-luna`), with six months' notice. OpenAI's `tts-1`, `tts-1-hd` and the 4o mini TTS snapshots go on 6 January 2027, and legacy realtime and audio models on 20 January. Google's `gemini-3.1-flash-lite` retires 7 May 2027 (to `gemini-3.5-flash-lite`).

## What should a team do this week?

Three opinions, as design advice, not experience:

1. **Grep before you read.** Most surprises are model IDs in places nobody remembers: a cron job, a notebook, a fine-tune. Search your repos and your provider's usage export. Anthropic's page tells you how: Console, Usage, Export gives usage by API key and model.
2. **Order by days left, not by size.** The 22 and 23 October entries are 12 and 13 days away. The 30 November Anthropic retirement is 51 days away. A migration with an eval set takes longer than a string change.
3. **Pin and flag.** Keep model IDs in config, route a slice of traffic to the replacement behind a flag, and compare before the date. Routing changes like Google's silent 3.7-to-3.8 move are the case where this pays most.

## Hands-on: a CI check that fails before the shutdown does

Keep the dates from the table in a file and fail the build when a retiring ID is both present in the code and inside your warning window.

```python
# check_model_ids.py: run in CI. Dates are from the vendors' pages on 10 Oct 2026; re-verify.
import datetime as dt
import pathlib
import re
import sys

RETIRING = {
    "deep-research-pro-preview-12-2025": "2026-10-23",
    "veo-3.1-generate-preview": "2026-10-22",
    "gemini-3.1-flash-live-preview": "2026-11-17",
    "claude-sonnet-4-5-20250929": "2026-11-30",
    "gpt-5-2025-08-07": "2026-12-11",
    "o3-2025-04-16": "2026-12-11",
}
WARN_DAYS = 60
today = dt.date.today()
failed = False

for path in pathlib.Path("src").rglob("*"):
    if not path.is_file() or path.suffix not in {".py", ".ts", ".js", ".json", ".yaml", ".yml", ".md"}:
        continue
    text = path.read_text(errors="ignore")
    for model_id, date in RETIRING.items():
        if re.search(re.escape(model_id), text):
            days = (dt.date.fromisoformat(date) - today).days
            if days <= WARN_DAYS:
                print(f"{path}: {model_id} retires {date} ({days} days)")
                failed = True

sys.exit(1 if failed else 0)
```

The table is deliberately short: add the IDs you actually use, and add the Anthropic floors only after they become real deprecations.

## Takeaways

- Q4 has dated retirements on 22 and 23 October, 17 and 30 November, 1 and 11 December. The hard Anthropic one is `claude-sonnet-4-5-20250929` on 30 November, replacement `claude-sonnet-5-5`.
- Anthropic's "not sooner than" dates and Google's "earliest possible dates" are floors, not announcements. Act on a Deprecated status with a date.
- Silent routing, as with Gemini 3.7 Flash to 3.8 Flash, changes behaviour without an error. Test for it.
- OpenAI's 23 October list covers most `gpt-3.5`, `gpt-4`, `o1` and `o4-mini` IDs, and the pages show your migration targets are the `gpt-5.6` family.
- Put model IDs in config and check them in CI against a dated list.

Next, the [Gemini deep research post](/blog/gemini-deep-research-models-preview-deprecations) covers the 23 October Google shutdown in detail.
