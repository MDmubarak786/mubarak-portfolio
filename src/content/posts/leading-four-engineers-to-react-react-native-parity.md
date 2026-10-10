---
title: "Leading four front-end engineers to React and React Native parity"
description: "How Edvanza shipped each module to web and mobile together with a four-person front-end team: shared logic, platform splits, review discipline and a parity checklist."
date: 2026-10-10T02:20:00Z
tags: ["leadership", "React Native", "team", "code review", "React"]
pillar: case-files
related: adr-006-edvanza-team
sources:
  - title: "React Native docs: Get started"
    url: "https://reactnative.dev/docs/getting-started"
  - title: "React Native docs: Set up your environment (framework recommendation)"
    url: "https://reactnative.dev/docs/environment-setup"
  - title: "React Native docs: Platform-specific code"
    url: "https://reactnative.dev/docs/platform-specific-code"
  - title: "Nx blog: share code between React web and React Native mobile (secondary)"
    url: "https://nx.dev/blog/share-code-between-react-web-react-native-mobile-with-nx"
  - title: "Google Engineering Practices: the standard of code review"
    url: "https://google.github.io/eng-practices/review/reviewer/standard.html"
draft: false
---

Shipping a feature twice is the price of having a web app and a mobile app. The only real choice is whether the two copies ship together or drift apart. At Edvanza we chose together, with one team and one definition of done, and I led the four front-end engineers who had to make that work. This is the long version of case file 06: what the decision cost, how a small team can hold it, and the review habits that kept the line.

One note on sources. The case file and my experience record give the facts about the team and the decision. They do not describe the repository layout or the tooling, so the engineering sections below lean on React Native's documentation and on a secondary write-up, and they are arguments about how I would structure the work, not a description of Edvanza's code.

## What was the Edvanza setup, and how did I get to lead it?

Edvanza runs on React for the web and React Native for iOS and Android. I started as a Software Development Engineer, my first engineering role, in June 2021. I ramped up through intensive bug fixing to learn the architecture before taking feature ownership, then owned the Jobs and Learn modules end to end on iOS, Android and web. I merged 1,300+ pull requests in the first year, built the platform's marketing site on Next.js and Tailwind CSS, and developed reusable components shared across mobile and web. That year earned an Outstanding Contribution and Strong Ownership award, and a promotion to SDE 1.

As SDE 1 I led a front-end team of four developers: training, assigning tasks, mentoring and delegating. I contributed to the planning and execution of key Edvanza modules, served as a technical panelist interviewing 30+ candidates, and reviewed 37% of all pull requests. Five months later I was promoted to SDE 2.

Those numbers are different things, and I keep them apart. The 1,300+ is pull requests I merged as an individual contributor during ramp-up. The 37% is the share of the organisation's pull requests I reviewed as lead. The first number shows I understood the codebase. The second is what mattered for parity.

## Why ship web and mobile together?

The case file lays out two options. "Ship web first, port to mobile later" gives you a faster first release on one platform, but the record is blunt about the downside: "Mobile users wait; behaviour drifts between platforms." The second option, deliver each module to web and mobile together, gives you feature parity and "one team, one definition of done", and its cost is stated just as plainly: every module costs two implementations before it ships.

We took the second. The decision was to deliver core modules to React and React Native together, mentor the team, keep stakeholders aligned, and hold the quality line through code review and hiring.

I would argue this is right for any product where the same user moves between phone and browser. A job seeker who saves a role on the web and opens the app on the train expects to see it. Drift is not an engineering inconvenience; users read it as the product being broken.

## How does a four-person team keep two apps in parity?

The honest answer is that you cannot out-type the cost of two implementations. You reduce what is implemented twice, and you make the remaining duplication visible. Three techniques do most of the work, all of them argued from the docs rather than from our repository.

### Share logic, not screens

The Nx team's write-up of sharing code between React and React Native is a useful secondary source here. Its rule of thumb: "All the business logic code that is not UI could be shared", and the UI for mobile has to be rewritten. Their shared libraries are models (types and interfaces), services (code that talks to the API) and a store. That matches how I think about parity. Types, API clients, validation and state transitions are where behaviour lives. If those are one module, the web and the app cannot disagree about what a job application is. They can only disagree about how it looks.

The same write-up lists what still differs: web persistence uses localStorage, which React Native does not support; routing and history differ; environment variables are handled differently under the two bundlers. Those are exactly the seams to hide behind small adapters.

### Use the platform mechanisms React Native already gives you

React Native's documentation describes two tools for platform differences. `Platform.OS` and `Platform.select` handle small inline differences, with keys for `ios`, `android`, `native` and `default`. For larger differences, platform-specific file extensions let you write `BigButton.ios.js` and `BigButton.android.js` and import `./BigButton`, and `.native.js` is "for code shared between React Native and Web/NodeJS" where Android and iOS do not differ. The docs' pro tip is to configure the web bundler to ignore `.native.js` files.

That gives you a clean contract for a module with a storage seam:

```text
packages/
  core/
    jobs/
      api.ts              # shared: fetch jobs, types, validation
      state.ts            # shared: reducers, selectors
      storage.ts          # web implementation (localStorage)
      storage.native.ts   # React Native implementation (AsyncStorage)
apps/
  web/                    # React
  mobile/                 # React Native
```

Both apps import `./storage`. Each bundler picks its own file. The logic around it is identical because it is the same file.

### Pick the starting point once

For new React Native apps, the current docs say "we recommend using a Framework", naming Expo, and treat working without one as an option for apps with unusual constraints. I mention it because choosing the setup is a leadership decision, not a per-engineer one: the less your four engineers argue about environment, the more review time goes to behaviour.

## What did a review process look like at this size?

I reviewed 37% of the organisation's pull requests while leading four developers. That is a lot of reading, and it only works if the standard is clear.

Google's engineering practices give the cleanest statement I know: reviewers "should favor approving a CL once it is in a state where it definitely improves the overall code health" of the system. Not perfect, improved. That mattered for a parity team, because the two-implementation cost already slows delivery, and nitpicking slows it further. The same guide separates educational comments from required ones, with a "Nit:" prefix for optional points, and says it is always fine to leave comments that help a developer learn something. For a team I was training and mentoring, that distinction was the point: reviews are where juniors learn, and they should not feel like a gate.

My own rule for parity reviews, which is an argument and not a record of Edvanza's process, is to ask three questions on every module pull request:

1. Does the change exist on both platforms, or is the missing one tracked with an owner and a date?
2. Is the behaviour in shared code, or has it been written twice with the risk of drift?
3. Does the mobile screen handle what mobile adds: slow networks, backgrounding, small screens?

Because every module costs two implementations before it ships, the review is where you find out whether the second one actually exists.

## Hands-on: a parity checklist you can paste

If you lead a team that ships to web and mobile, put this in your pull request template. It turns "parity" from an aspiration into something a reviewer can tick.

```markdown
## Parity checklist

- [ ] Behaviour lives in shared code (types, API client, state). No logic copied into an app.
- [ ] Web and mobile screens both implemented, or the gap is linked to an issue with an owner.
- [ ] Platform differences use `Platform.select` or `.native.ts` files, not scattered conditionals.
- [ ] Same loading, empty and error states on both platforms.
- [ ] Verified on web, one iOS target and one Android target.
- [ ] Reviewer ran the change on at least one platform they did not author.
```

Two habits make it stick. First, the reviewer rotates platforms, so a web-heavy engineer reviews the mobile side now and then and vice versa. Second, "done" means both platforms are merged, which is the case file's "one definition of done" turned into a rule. A module that works on web only is in progress.

## Takeaways

- Shipping web and mobile together costs two implementations per module. Choose it when your users move between platforms, because drift reads as a broken product.
- Share what behaves (types, API clients, state), rewrite what renders, and hide platform seams behind `.native` files and `Platform.select`.
- A review standard of "improves overall code health" keeps a small team moving; label optional comments as optional.
- Keep your individual output and your leadership output separate in your own head: merging 1,300+ pull requests taught me the codebase, reviewing 37% of them is what kept four engineers aligned.
- Put parity in the pull request template so it is checked, not remembered.

If you are weighing the same trade-off between speed on one platform and parity on two, the decision record is case file 06, "Edvanza web + mobile parity".
