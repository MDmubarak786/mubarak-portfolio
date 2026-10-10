---
title: "GitHub contributions at build time, with a committed fallback"
description: "How this site fetches its GitHub contribution calendar in the Astro build, falls back to a committed snapshot, renders SVG, and a parser bug I found in my own code."
date: 2026-10-10T02:38:00Z
tags: ["Astro", "GitHub", "build-time data", "GraphQL", "SVG"]
pillar: building
sources:
  - title: "GitHub GraphQL reference: users (ContributionsCollection, ContributionCalendar, ContributionLevel)"
    url: "https://docs.github.com/en/graphql/reference/users"
  - title: "GitHub GraphQL: forming calls (authentication, endpoint)"
    url: "https://docs.github.com/en/graphql/guides/forming-calls-with-graphql"
  - title: "GitHub GraphQL: rate limits and query limits"
    url: "https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api"
  - title: "GitHub docs: contributions on your profile (UTC timestamps, public repositories)"
    url: "https://docs.github.com/en/account-and-profile/concepts/contributions-on-your-profile"
  - title: "Astro docs: data fetching (fetch at build time, top-level await)"
    url: "https://docs.astro.build/en/guides/data-fetching/"
  - title: "Making my GitHub heatmap widget (secondary: a developer's write-up of the unofficial endpoint)"
    url: "https://leanrada.com/notes/github-heatmap-widget/"
draft: false
---

The contribution grid on this site's home page is not an image and not a client-side widget. It is an SVG that Astro renders during the build from data fetched at that moment, with a committed JSON snapshot behind it for the day GitHub is down or changes its markup. If you want live-ish third-party data on a static site without shipping JavaScript or a secret, this is the pattern, and it has failure modes worth designing for before you meet them.

One correction to how I first framed this. I assumed I would write it up as a GraphQL integration. The code on this site does not use GraphQL. It reads GitHub's public contributions page. I cover both below, because the difference decides which one you should copy.

## What does "build-time data" mean in Astro?

Astro components run on the server, and the docs say the global `fetch()` in a component script runs "at build time" for a static site. A deployed site fetches the data "once, at build time"; in dev the fetches rerun when components refresh. The docs recommend top-level `await` in the component script, so there is no wrapper function.

That gives you three properties I care about:

- The browser receives finished HTML. No spinner, no layout shift from late data, no client bundle.
- The data is as old as the last deploy. A grid that updates daily needs a daily rebuild; the build is the refresh mechanism.
- A failed fetch happens on your machine or CI, not in a visitor's browser. That is the one failure you get to handle with code instead of hoping.

## Where does the calendar data come from?

There are two routes, and only one is documented.

### The documented route: GraphQL

GitHub's GraphQL API exposes the same calendar. In the reference, `User.contributionsCollection` has a `contributionCalendar` with `totalContributions` and `weeks`; each week has `contributionDays`, and each day has `date`, `contributionCount`, `contributionLevel` and `color`. The level is an enum: `NONE`, then `FIRST_QUARTILE` to `FOURTH_QUARTILE`, which the reference describes as buckets of the user's days relative to each other. It is not an absolute count, so use `contributionCount` when you need the number.

The cost is a credential. The guide says you authenticate with "a personal access token, GitHub App, or OAuth app" and sends the token as `Authorization: bearer TOKEN` to `https://api.github.com/graphql`. The reference adds that "contributions in private and internal repositories are only included with the optional read:user scope", so a token without it returns public activity only. Requests count against a points budget, "5,000 points per hour per user" for a personal token. A once-a-day build will never get near that, but the token has to live in your build environment as a secret.

### The route this site uses: the public contributions page

`src/lib/github.ts` fetches `https://github.com/users/<username>/contributions`, which returns an HTML fragment of the profile grid, and parses it. No token. I could not find this endpoint in GitHub's documentation. Another developer's write-up describes the same URL and calls it "undocumented" that "could also break at any time" (a secondary source; I am quoting a blog, not GitHub). Treat it as a convenience that can vanish, not as an API.

That one fact shapes the whole design: if the source can change shape without notice, the code needs a way to notice and a place to land.

## How does the build survive a bad fetch?

Here is the function, trimmed of its helper and comments. The structure is the point: one `try`, one guard, one fallback.

```ts
import fallback from "../data/contributions.json";

export interface ContributionDay { date: string; level: number; count: number }
export interface Contributions {
  total: number; days: ContributionDay[]; fetchedAt: string; source: "live" | "fallback";
}

const USER = "MDmubarak786";

export async function getContributions(): Promise<Contributions> {
  try {
    const res = await fetch(`https://github.com/users/${USER}/contributions`, {
      headers: { "user-agent": "mubarak-portfolio-build" },
    });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const html = await res.text();

    const days: ContributionDay[] = [];
    const cell = /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"[^>]*>/g;
    for (const m of html.matchAll(cell)) days.push({ date: m[1], level: Number(m[2]), count: 0 });

    if (days.length < 300) throw new Error("Contribution grid not found");
    // ...attach counts from the tooltips, sort, read the total...
    return { total, days, fetchedAt: new Date().toISOString().slice(0, 10), source: "live" };
  } catch {
    return { ...(fallback as Omit<Contributions, "source">), source: "fallback" };
  }
}
```

Four decisions do the work.

**The sanity guard.** A grid of a year has 365 or so cells. If the regex finds fewer than 300, GitHub changed the markup, returned a login page or rate-limited me, and the response was still a 200. Checking the HTTP status alone would have rendered an empty grid with a straight face. The guard turns "parsed nothing" into an exception.

**One catch, one fallback.** Any failure, whether network error, bad status, changed markup or a parse exception, ends at the same return: the committed `src/data/contributions.json`. The build never fails because of a third-party page.

**A `source` field.** The result says whether it is `"live"` or `"fallback"`, and the component uses it. When it is the fallback, the caption reads "(snapshot 2026-10-09)", using the date stored in the file. A stale grid that says so is honest; one that looks live is a small lie nobody catches for months.

**UTC everywhere.** GitHub's docs say contributions are timestamped in UTC. The code builds every date as `T00:00:00Z` and formats with `timeZone: "UTC"`, so a build run in Chennai and a build run on Vercel place a contribution on the same square.

## How does the data become an SVG?

The component awaits the function, pads the first week so the grid starts on the right weekday, slices the days into columns of seven and draws one `rect` per day. This is the real code, trimmed:

```astro
---
import { getContributions } from "../../lib/github";
const c = await getContributions();

const offset = new Date(c.days[0].date + "T00:00:00Z").getUTCDay();
const cells = [...Array(offset).fill(null), ...c.days];
const weeks = [];
for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

const size = 11, gap = 3, step = size + gap;
const w = weeks.length * step - gap, h = 7 * step - gap;
---
<svg viewBox={`0 0 ${w} ${h + 16}`} role="img"
     aria-label={`${c.total} contributions on GitHub in the last year`}>
  {weeks.map((wk, x) => wk.map((d, y) => d && (
    <rect x={x * step} y={y * step} width={size} height={size} rx="2"
          fill={fill[Math.min(d.level, 4)]}>
      <title>{d.count} on {d.date}</title>
    </rect>
  )))}
</svg>
```

The `fill` array is five colours passed in as props, one per level. The `viewBox` makes it scale, `role="img"` with an `aria-label` gives screen readers one sentence instead of 370 rectangles, and the `<title>` on each cell is a free tooltip. There is no JavaScript on the grid.

## What did I find when I read my own snapshot?

Writing this, I opened `src/data/contributions.json` to check it against the code, and it does not add up. The file has 370 days, a `total` of 258, and counts that sum to 275. Worse, `2025-10-09` has level 0 and a count of 23, which cannot happen: level 0 means no contributions. And `2025-10-05` and `2025-10-07` are level 1 with a count of 0.

The cause is in the tooltip matching. The tooltips say things like "23 contributions on October 9th", with no year. The code builds a map from that label to a count, then looks each day up by its own formatted label. A window of 53 weeks covers 5 to 9 October twice, once in 2025 and once in 2026, so both days read the same map entry, and the later tooltip wins. The fallback on the next line, `?? (d.level > 0 ? d.level : 0)`, hides a miss by inventing a count from the level, which is a guess presented as data.

This is a parser bug in my own code, found by reading, not a production incident. The visible damage is small: colour comes from `data-level`, read per cell, so only the tooltip counts for those five dates are wrong. The fix I would make is to stop matching on prose. Each tooltip carries a `for` attribute naming the cell it describes, so key the counts by that id instead of by a date label that can repeat. I have not changed the code while writing this post, and I would check the current markup before relying on that attribute.

## What would I change?

Three things, in order:

1. **Fix the join**, as above, and delete the `?? level` guess so a missing count shows up as a missing count.
2. **Write the snapshot back.** In this repo the snapshot is a hand-committed file and nothing refreshes it after a successful fetch. A tiny script that saves the live result to `src/data/contributions.json` would keep the fallback close to the truth.
3. **Switch to GraphQL if the site ever needs to be reliable rather than free.** The query is short, the fields are documented, and you get `contributionCount` per day directly with no tooltip parsing.

```ts
const query = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
    }
  }`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${import.meta.env.GITHUB_TOKEN}`, "content-type": "application/json" },
  body: JSON.stringify({ query, variables: { login: "MDmubarak786" } }),
});
const { data } = await res.json();
const days = data.user.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
```

Keep the same `try`, guard and fallback around it: a token can expire and a rate limit can bite. The query uses the field names from the reference; check the docs for the arguments that set a date range, since the default window starts "a year ago".

## Takeaways

- A static site can show live third-party data: fetch at build, render to HTML, and the failure happens where you can handle it.
- Guard on the shape of what you parsed, not just the HTTP status. A 200 with no grid is the common failure.
- Ship a committed fallback and a `source` flag, and say "snapshot" on the page when you used it.
- Use UTC end to end for anything keyed by date.
- An undocumented endpoint is a loan. Prefer GraphQL when you can keep a token safe, and test any scraped join key at the edges of the window.

Next: how this same page holds up under Core Web Vitals with all the scroll animation on, in the post on measuring Core Web Vitals on an animation-heavy page.
