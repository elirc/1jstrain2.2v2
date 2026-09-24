---
id: J17
title: Stop the daily mix starving reviews
area: server
closes: [M-08]
ladder: [B02]
adrs: [0009 unchanged]
status: landed
---

# Stop the daily mix starving reviews

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes M-08 · Ladder B02 · ADRs 0009 unchanged

## Symptom

A learner with a review backlog cannot work it off with daily sessions. Against a scratch copy of `6f1bf43`: 30 cards due (overdue by 1 to 30 hours), everything else unseen, a daily session of 12:

```
due cards served: 6 of 30                 expected: 9 (12 minus a new-card reserve of 3)
most overdue card (30 h) served: false    expected: true
```

Every daily session adds six new cards and clears six reviews, so the backlog grows while new material keeps arriving. Due cards are shuffled, so the most overdue card can be skipped indefinitely. Separately, a module where 13 of 14 cards are mastered and not due returns **1** question when 12 were asked for.

## Root cause

`server/src/sessions.js › pickDaily (L91–96 @ 6f1bf43)`
```js
  const reviewShare = Math.min(due.length, Math.ceil(size * 0.5));
  const out = [...shuffle(due).slice(0, reviewShare)];
  for (const q of unseen) {
    if (out.length >= size) break;
    out.push(q);
  }
```

`server/src/sessions.js › pickOrdered (L115–127 @ 6f1bf43)` drops mastered, not-due cards, and falls back to "practice anything" only when *everything* is mastered:
```js
    if (isDue(s, now)) due.push(q);
    else if (s.attempts === 0) unseen.push(q);
    else if (!isMastered(s)) rest.push(q);
  // …
  return (ordered.length ? ordered : shuffle(pool)).slice(0, size);
```

The invariant for the daily mix: *reviews are served most-overdue first, and new material is limited to a small, stated reserve while reviews are waiting.* For targeted sessions: *a session is as long as asked for whenever the scope has that many questions.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | The spaced-repetition promise erodes exactly for the learners who use the app daily. |
| B | Raise the review share to 75% | 1 line | Still random among due cards, so the oldest can still starve. It also leaves the one-card module session. |
| C | Due first by `dueAt` ascending; a new-card reserve; top-ups; a `reason` on every question | ~60 lines | **Chosen**, in the shape CONTRACT.md §4 fixes. |
| D | Separate "review" and "learn" sessions, with no mix | Client change | The daily mix is the product's default path. Splitting it moves the decision onto the learner. |

## Decision and trade-off

I chose C. The daily mix takes due cards sorted by `dueAt` for up to `size − reserve` places, where `reserve = min(unseen, max(1, min(newPerDay, floor(size/4))))`. It then takes the reserved new cards, then more due cards, then more new cards up to `newPerDay`, then unmastered cards and mastered cards, soonest due first. The `shaky` bucket is gone: after J10 it would only ever produce practice. `review` is sorted by `dueAt`. `weak` now requires at least two attempts and sorts by accuracy, because a single first miss is already due in 10 minutes and belongs to `review`. Module, stage and track sessions top up with mastered cards, so a nearly finished module still gives a full round. Every question carries `reason: 'due' | 'relearn' | 'new' | 'practice'`, and the session carries `nextDueAt` (and `empty: true` when there is nothing), so the client can say "nothing due; next review at 17:00".

Two costs. `newPerDay` applies per daily session, not per calendar day: counting today's new cards means reading the log on every session, and for most learners one session is one day. The name overpromises; it is filed. And module top-ups are practice by design (J10), so the client must say so using `reason`. Revisit `newPerDay` when learners run several daily sessions a day.

## The change

`server/src/sessions.js` is rewritten (about 230 lines, up from 159 at the baseline; the rules are spelled out instead of shuffled): `pickDaily` with `take()`, `pickOrdered` with a mastered top-up, `byDueAt`, `byAccuracy`, `reasonFor`, `nextDueAt`, the `flagged` mode (J38), and `404 not_found` for unknown ids (J13). The session size and `newPerDay` come from the profile's settings (J39).

After, `server/src/sessions.js` (working tree):
```js
  const reserve = Math.min(unseen.length, Math.max(1, Math.min(newPerDay, Math.floor(size / 4))));
  const newCap = Math.max(reserve, newPerDay);
  // …
  for (const q of due.slice(0, size - reserve)) take(q);
  for (const q of unseen.slice(0, reserve)) take(q);
  for (const q of due) take(q);
  for (const q of unseen.slice(0, newCap)) take(q);
```

## Verification

1. `server/test/sessions.test.js` › `buildSession on sqlite` / `on json` › *daily: no duplicates; due cards most overdue first; new cards reserved even with a big backlog*: the reproduction above, asserting 9 due in `dueAt` order and 3 new. At the baseline: 6 due, shuffled.
2. *module session is topped up to the limit with extra practice from mastered cards*. At the baseline: 1 question.
3. *review is sorted by dueAt; empty review says when the next one is*, *weak needs at least two attempts and is sorted by accuracy*, *reason tags: due, relearn, new, practice*, and *daily: newPerDay bounds the new cards, but at least one new card is reserved when unseen exist*.

## What a senior reviewer would ask

- *With `newPerDay: 0`, why is one new card still served?* The contract's formula has `max(1, …)`, on the argument that a learner who sets 0 and has a permanent backlog would otherwise never see new material. It is arguable, and the test pins it so any change is deliberate.
- *Is sorting by `dueAt` fair across day-granular due dates?* Cards due the same midnight tie. `Array.prototype.sort` is stable, so they come in curriculum order. That is explainable, and J07 notes the variety follow-up.
- *Does the stage session respect unlocking?* No, by design. The README says you can ignore the path, and unlocking is presentational (P3).

## The junior version of this fix

`Math.ceil(size * 0.5)` becomes `Math.ceil(size * 0.8)`. The backlog now shrinks in the test with 30 due. But the due list is still shuffled, so the 30-hours-overdue card is still served in only about one session in three (10 random picks from 30), and a module with one open card still returns one question.

## Follow-ups

- [ ] Make `newPerDay` count per calendar day, or rename it → new entry
- [ ] Client: badge `reason: 'practice'` as "extra practice" and show `nextDueAt` on an empty session → J30
