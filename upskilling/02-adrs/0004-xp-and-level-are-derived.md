---
id: ADR-0004
title: Derive XP and level from the attempt log; never store them
status: accepted
date: 2026-09-23
amended-by: [J14]
superseded-by: null
---

# ADR-0004: Derive XP and level from the attempt log; never store them

Status: accepted, amended by journal entry J14 (XP over all history) · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `server/src/srs.js › xpFor (L63–67 @ 6f1bf43)`, `server/src/progress.js › seenBefore (L106–115 @ 6f1bf43)`, `server/src/routes/api.js › xpEarned (L137 @ 6f1bf43)`

## Context
XP is a motivational number: 10 for a first-time correct answer, 6 for a later one, 2 for a wrong one. The attempt log already records every answer with its time. A stored counter would need updating in the same write as the attempt, correcting whenever the rules change, and resetting with `/progress/reset`.

## Decision
We store no XP. `buildProgress` replays the attempt log through `xpFor` on every `GET /api/progress`, and `levelFor` maps the total to a level. The answer route computes the same `xpFor` for the toast, from the card state before the answer.

## Evidence
`server/src/progress.js › seenBefore (L106–115 @ 6f1bf43)`
```js
  // XP is recomputed from history rather than stored, so it can never drift
  // away from the attempts that produced it.
  const history = store.listAttempts(profileId, new Date(now.getTime() - 365 * DAY_MS).toISOString());
  let xp = 0;
  const seenBefore = new Map();
  for (const attempt of history) {
    const priorAttempts = seenBefore.get(attempt.questionId) ?? 0;
    xp += xpFor({ attempts: priorAttempts }, attempt.correct);
    seenBefore.set(attempt.questionId, priorAttempts + 1);
  }
```
`server/src/check.js › xp is earned (L111 @ 6f1bf43)` asserts only `xp > 0`. The parity between the toast and the replay is **not enforced**.

## Consequences
- Good: a change to the values in `xpFor` (say, 12 for a first-time correct answer) applies to all history on the next request, with no migration.
- Cost: the log is windowed to 365 days, because the same `history` feeds the heatmap. XP therefore **falls** after a year, and `seenBefore` restarts inside the window, so first-attempt XP is paid again. Reproduced at the baseline: two correct answers in May 2025 give `xp 16` on 2025-06-02 and `xp 0` on 2026-09-23 (server B6, register F-08). The claim in the comment, "can never drift", is false because of that one argument. J14 replays everything and filters the heatmap in JS.
- Cost: the replay and `api.js` L137 are two computations of one number. They agree only because both call `xpFor` with a prior-attempt count.
- Forces on future work: anything that changes XP by outcome must be recoverable from the attempt row, or the replay cannot reproduce it. J10's `practice` outcome is worth 1 XP (contract §2), so whether an attempt was practice has to be recorded on the attempt, not inferred afterwards.

## Alternatives rejected
- **An `xp` column on `profiles`, incremented per answer.** It drifts on every rule change and every partial write (F-02).
- **A nightly rollup.** There is no scheduler in a local app, and it is stale for the rest of the day.

## Breaks first at
Attempts per learner. The replay is O(attempts) per `/progress` call. At 100x a heavy learner's year (hundreds of thousands of rows) the replay shows up in the timing, and the fix is a rollup updated inside the answer transaction (J08's `recordAnswer`). J22 measures this rather than assuming it.

## Revisit when
- `GET /api/progress` exceeds about 50 ms on a real profile. Measure it first (E04).
- XP starts to depend on something the attempt row does not record.
