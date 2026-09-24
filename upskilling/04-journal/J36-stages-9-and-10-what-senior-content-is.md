---
id: J36
title: Stages 9 and 10 - what senior content is, and what we refused
area: content
closes: []
ladder: [B03, B08]
adrs: [0008 unchanged]
status: landed
---

# Stages 9 and 10 - what senior content is, and what we refused

Date 2026-09-24 · Author content integrator · Area content · Commit uncommitted (baseline 6f1bf43)
Closes – · Ladder B03, B08 · ADRs 0008 unchanged

## Symptom
A learner who finishes the baseline path has never been asked about isolation levels, queues, SLOs, SSRF, an incident or a design review, which is what a mid-level candidate gets asked next. The path ends at stage 7, "Ship it". On a `git archive 6f1bf43 content` copy, counting `difficulty` and `ask` over `questions` gives 94/434 d3 (22%) and 49/434 with an `ask` (11%). The README promises "a fifth".

## Root cause
The curriculum was built to stop at mid-level. `content/tracks.js › noob-to-mid ordering @ 6f1bf43` says so in its header, and the last stage is `content/tracks.js › Stage 7 · Ship it @ 6f1bf43`. `README.md › a fifth of them also carry @ 6f1bf43` claims an `ask` share the content does not have. The invariant I wanted: every stage 9–10 question has exactly one answer a respected senior engineer would defend, and its `why` names the trade-off that answer accepts.

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing: stop at mid-level | Nothing | The app promises "noob to mid", and judgement is hard to quiz: four options often reduce to "pick the one that sounds senior". Real, but interviews ask these regardless. |
| B | A tenth "senior" track, a d:4 badge, algorithm and whiteboard puzzles | A `TrackId`, a colour and a `defaultLang` entry; `Record<'1'\|'2'\|'3'>` in the client and two label arrays | Puzzles test what CRUD interviews rarely hinge on, and a track duplicates what a stage already groups. |
| C | Two stages of judgement under constraints, inside existing tracks; d stays 1–3; `ask` carries "what the strong answer sounds like" | 129 questions, 9 primers, a voice rule and review time | chosen |

## Decision and trade-off
Past mid-level, "senior" for a CRUD developer means choosing under constraints: cost, consistency, blast radius, who gets paged. It is not knowing more algorithms. Stage 9 "Run it in production" (web-perf, craft-observability, data-scale, node-jobs, craft-appsec) and stage 10 "Toward senior" (craft-design, craft-architecture, craft-incidents, craft-review) hold it. Stage placement is the senior signal; every stage 10 question is tagged `senior`. The plan (§2) refused a senior track, a standalone `web-realtime` module (folded into web-http, web-api-design and craft-design), a separate `craft-perf` (merged into web-perf) and a separate `data-tx` (merged into data-scale). The stage 10 voice rule forbids FAANG puzzles and "design Twitter for a billion users". The review added `web-css` and `craft-cloud` in stages 2 and 8: gaps below senior, not above it.

I gave up a visible badge and the confidence of machine-checkable answers. Revisit if first-attempt accuracy in stage 10 runs above stage 8's: that would mean answers are guessed from tone.

## The change
`content/tracks.js` gains two stages, both at `unlockAt: 0.35` behind the previous stage:

```js
id: 'stage-10',
title: 'Stage 10 · Toward senior',
modules: ['craft-design', 'craft-architecture', 'craft-incidents', 'craft-review'],
```

Stage 9 has 71 questions and stage 10 has 58, in `content/questions/{web,node,data,craft-ops,craft-senior}.js`. A typical judgement item is `craft-design-14` ("should we go multi-region?"). The key is "not by default: multi-AZ, tested restores, a DR runbook, then multi-region for a stated need", and each distractor fails for a reason the `why` names. Its `ask`:

```js
ask: 'This tests whether requirements, not fashion, drive cost. The strong answer turns the question round ("what RTO and RPO does the business need, and what does an hour of downtime cost?") and states what multi-AZ already buys.',
```

Plan §4 set d3 at about 40% (stage 9) and 45% (stage 10), an `ask` on every classic interview question and every stage 9–10 d3, and about 22% `ask` overall.

## Verification
1. `npm run stats -w content` and a count over `curriculum.questions`, against the plan:

| Measure | Target | Actual |
|---|---|---|
| d3, whole curriculum | ≈35% | 296/1047 (28%) |
| d3, stage 9 / stage 10 | ≈40% / ≈45% | 29/71 (41%) / 23/58 (40%) |
| `ask`, whole curriculum | ≈22% | 229/1047 (22%) |
| stage 9–10 d3 with an `ask` | all | 15/29 and 17/23 |
| type mix mcq/output/multi/boolean/short/order | 50/16/11/8/7/8 | 62.5/13.5/7.1/6.9/5.3/4.8 |
| key uniquely longest, stages 9–10 | – | 21/93 (23%); curriculum 95/795 (12%) |

The `ask` target is met. Overall d3, stage 10 d3, the `ask`-on-every-senior-d3 rule and the type mix are not. The optional retype pass (§4.3) was not run.

2. `npm run check:content -- --strict` → `1047 questions, 53 modules, 10 stages ...` and `0 warning(s)`. `content/lint.js` fails on positional wording and warns on the length and index tells.

## What a senior reviewer would ask
- *Are the judgement questions really single-answer?* Only as far as a person checked. The review replaced 34 intents; `craft-arch-5` was an ADR-section `order` with two canonical orders (Nygard's and adr-tools'). Four reviewers then verified every new question. No lint can.
- *How do we know the distractors are plausible?* We have a proxy, not proof. The key is uniquely longest in 23% of stage 9–10 singles, twice the curriculum rate. Per-distractor pick rates would prove it, but attempts store only correctness.
- *Why not d:4?* Six places change for a badge (plan §4.1), and stage placement already says it.

## The junior version of this fix
Add a "Senior" track with 60 recall questions ("What does CAP stand for?", "Name the four golden signals") at `unlockAt: 0`, plus a d:4 label. The roadmap gains a row and the count goes up. But recall is d1 under §4.1, nothing gates it behind Data, and a new `TrackId` touches server and client types for no teaching gain.

## Follow-ups
- [ ] Give the 20 stage 9–10 d3 questions without an `ask` one, and raise stage 10 d3 toward 45% → content authors, new entry
- [ ] Store the chosen choice id on each attempt so distractor pick rates can be measured → server, new entry (J41 shows attempts but does not record the choice)
- [ ] The optional retype pass toward about 50% mcq → content, new entry
