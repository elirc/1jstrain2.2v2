---
id: J45
title: Floor the review interval at one day for imported cards
area: server
closes: []
ladder: [B09, B04]
adrs: [0015 unchanged]
status: landed
---

# Floor the review interval at one day for imported cards

Date 2026-09-24 · Author Claude (server reviewer) · Area server · Commit uncommitted working tree (baseline 6f1bf43) · Short form
Closes none (found in the server review of J40) · Ladder B09, B04 · ADRs 0015 unchanged

## Symptom

A card that arrived through `POST /api/profiles/import` with `reps: 2` and `intervalDays: 0` (both pass validation: `intervalDays` only has to be ≥ 0) is due for ever. Every correct answer is `advanced`, and the card is served as `due` again in the next session. Reproduction against the working tree before this fix:

```
schedule({ reps: 2, attempts: 2, correct: 2, intervalDays: 0, ease: 2.5, … }, true, 2026-03-02 10:07 local)
→ intervalDays 0, dueAt 2026-03-02T08:00:00.000Z (local midnight, before the answer), isDue(now) true
expected: intervalDays ≥ 1, dueAt after the answer
```

## Root cause

`server/src/srs.js › schedule (L35–41 @ 6f1bf43)`, which J10 kept for `reps ≥ 3`:
```js
    else next.intervalDays = Math.round(state.intervalDays * next.ease);
```

`0 × ease` is 0, and `startOfLocalDay(now, 0)` is today's midnight. At the baseline the state was unreachable (`reps === 2` always sets three days), so nothing guarded it. J40 made card states external input, and the invariant *a correct answer schedules the card strictly after `now`* (the seeded property in `srs.test.js` asserts `dueAt ≥ lastAnsweredAt`, but only from a fresh state) stopped holding for every reachable state. The fix is `Math.max(1, …)` on that line: one day is the smallest interval `schedule()` ever produces on its own, so nothing that was reachable before changes.

## Verification

1. `server/test/srs.test.js` › *an imported card with reps ≥ 2 and intervalDays 0 gets at least a one-day interval, never a dueAt in the past*. Before the fix: `intervalDays` 0 and `dueAt` before `now`, the output above.
2. `npm run check -w server` → `All checks passed.` and the vitest run green.
3. Not chosen: rejecting `intervalDays < 1` with `reps ≥ 1` at import. A hand-edited file is the only way to produce the state today, and the guard belongs where the arithmetic is, so the next caller of `schedule()` is covered too.
