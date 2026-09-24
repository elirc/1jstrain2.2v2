---
id: J14
title: Stop XP decreasing after a year
area: server
closes: [F-08]
ladder: [B07]
adrs: [0004 amended]
status: landed
---

# Stop XP decreasing after a year

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-08 · Ladder B07 · ADRs 0004 amended (this entry; the decision to derive XP stands, the window is removed)

## Symptom

A learner's level goes down over time without them doing anything. Against a scratch copy of `6f1bf43`: two first-time correct answers on 1 and 2 May 2025.

```
buildProgress(…, 2025-06-02).xp  → 20
buildProgress(…, 2026-09-23).xp  → 0          expected: 20
```

The same window also re-awards the first-attempt bonus. A question first answered 13 months ago looks new again inside the window, so its next correct answer earns 10 instead of 6. The route's `xpEarned` (computed from the card state) and the dashboard's XP (recomputed from the log) disagree.

Severity: the register says S1, because a number the learner relies on is wrong. The honest qualifier is timing. The app is dated 2026, so nobody can observe it before mid-2027. The fix is small either way.

## Root cause

`server/src/progress.js › listAttempts (L106–115 @ 6f1bf43)`
```js
  const history = store.listAttempts(profileId, new Date(now.getTime() - 365 * DAY_MS).toISOString());
  let xp = 0;
  const seenBefore = new Map();
  for (const attempt of history) {
    const priorAttempts = seenBefore.get(attempt.questionId) ?? 0;
    xp += xpFor({ attempts: priorAttempts }, attempt.correct);
    seenBefore.set(attempt.questionId, priorAttempts + 1);
  }
```

One query served two purposes with different needs. The heatmap wants a year, and XP wants everything. The invariant: *XP is a function of the whole attempt log, and equals the sum of `xpEarned` returned when those answers were given.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Invisible until mid-2027, then levels fall. |
| B | SQL window function `xpTotal()` plus the JS loop for the JSON store, and a parity test (server plan) | Two implementations | After J10, XP depends on `outcome`, and "practice" depends on `dueAt` at the time, which a `ROW_NUMBER()` query cannot express. It would mean two diverging rule sets. |
| C | Store `xp` on each attempt | A v2 column plus a backfill | XP stops being derived (ADR-0004), and a rule change could never be applied to history. |
| D | `listAttempts(profileId)` with no window; replay every question's attempts through `schedule()` to get each `outcome`; heatmap filtered to 365 days in JS | ~25 lines | One rule set, the scheduler itself. **Chosen.** |

## Decision and trade-off

I chose D. `replayXp(attempts, emptyState)` in `server/src/srs.js` walks the log in order, keeps a card state per question, calls `schedule()` with each attempt's own timestamp, and sums `xpFor(outcome, …)`. Because it is the same function the answer route calls, the live number and the replayed number cannot disagree. A property test checks that over 2,000 random answers.

This amends ADR-0004. XP is still derived, but now from the whole log, *through the scheduler*. Two consequences follow. First, when the XP or scheduling rules change, historical XP changes with them. J10's "practice earns 1" is applied to old answers once, at upgrade. Second, `/progress` now costs O(all attempts), and the replay is not cheap. J22 measured about 3.5x the baseline's windowed loop at 10k attempts. I will revisit when `/progress` passes 250 ms at the median on a normal machine, or when a profile passes 50k attempts. The replacement is a lean replay that tracks only `reps` and `dueAt` as numbers, or a stored per-attempt XP.

## The change

`server/src/srs.js`: `replayXp`, and `xpFor(outcome, { wasFirstAttempt, gaveUp })`. `server/src/progress.js` reads `store.listAttempts(profileId)` with no `since` and filters the heatmap by local day key. Both stores' `listAttempts` default `since` to `''`. The attempt log gained `gaveUp` (v2, J19), because a give-up earns 0 and the replay has to know about it. About 30 lines.

After, `server/src/srs.js` (working tree):
```js
    const before = states.get(attempt.questionId) ?? emptyState(attempt.questionId);
    const correct = attempt.correct && !attempt.gaveUp;
    const after = schedule(before, correct, new Date(attempt.answeredAt));
    xp += xpFor(after.outcome, { wasFirstAttempt: before.attempts === 0, gaveUp: !!attempt.gaveUp });
```

## Verification

1. `server/test/progress.test.js` › `buildProgress on sqlite` / `on json` › *xp counts attempts older than 365 days and equals the sum of xpEarned from answering (seed 99)*: 200 answers from January 2025, read 400 days after the last one. At the baseline, XP is 0.
2. `server/test/http.test.js` › *xp from /progress equals the sum of xpEarned, including practice, give-ups and answers over a year old*: the same claim end to end, 500 days out.
3. `server/test/srs.test.js` › *property (seed 7): replaying an attempt log gives the same XP as summing xpFor live*.

## What a senior reviewer would ask

- *What happens to XP after an import?* It is replayed from the imported attempts, so it matches the exported profile's XP exactly. J40's HTTP test asserts that.
- *What if card states and attempts disagree, for example after a hand-edited import?* XP follows the log. Card states drive scheduling only.
- *Why does `wasFirstAttempt` still come from the replayed state rather than a `seen` set?* It is the same thing, and using the state keeps one source of truth.

## The junior version of this fix

Change `365` to `3650`. It passes every test that exists, and the level stops falling for ten years. It still leaves two numbers computed by two rules: the route's live `xpEarned` from the card state, and the dashboard's windowed loop. That is exactly the drift ADR-0004 said could not happen.

## Follow-ups

- [ ] Lean replay or stored XP when the J22 trigger fires → new entry
