---
id: J10
title: Treat an early correct answer as practice
area: server
closes: [F-01, F-07]
ladder: [B09, B05, B03]
adrs: [0009 amended, 0015 new]
status: landed
---

# Treat an early correct answer as practice

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-01, F-07 (server half) · Ladder B09, B05, B03 · ADRs 0009 amended by 0015 (new)

## Symptom

The README promises that "Mastered means two spaced correct answers, not one lucky guess." At the baseline, two correct answers a minute apart master a card. Against a scratch copy of `6f1bf43`:

```
schedule(schedule(new, true, t), true, t + 60 s) → { reps: 2, mastered: true, intervalDays: 3 }
expected: reps 1, the second answer counted but not moving the schedule
```

This is the *normal* path, not an edge case. Module sessions deliberately re-serve non-due, unmastered cards (`sessions.js` L122), and "Another round" repeats them. Stage unlocking is computed from mastery, so it rested on this too.

## Root cause

`server/src/srs.js › schedule (L35–41 @ 6f1bf43)`
```js
  if (correct) {
    next.reps = state.reps + 1;
    next.ease = Math.min(MAX_EASE, state.ease + 0.1);
    if (next.reps === 1) next.intervalDays = 1;
    else if (next.reps === 2) next.intervalDays = 3;
    else next.intervalDays = Math.round(state.intervalDays * next.ease);
    next.dueAt = addDays(now, next.intervalDays).toISOString();
```

Nothing reads `state.dueAt`. The self-test pins the bug as a pass: `server/src/check.js › second correct answer reaches mastery (L69–73 @ 6f1bf43)` calls `schedule(state, true, now)` twice with the same `now`.

The invariant: *`reps` increases only when the answer was given at or after `dueAt`*, so a mastered card has two correct answers on different local days.

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Mastery, unlocks and "Interview ready" stay meaningless. |
| B | A minimum gap: ignore a correct answer less than 12 h after the last one | 3 lines | The number is arbitrary, it measures from the last answer rather than from when the card is due, and a card relearned after a lapse (due in 10 minutes) would be wrongly blocked. |
| C | Stop serving non-due cards anywhere | Sessions rewrite | Module drills and "practice" would vanish, and the bug would still be reachable through the API. The rule belongs in `schedule()`. |
| D | `wasDue = attempts === 0 \|\| now >= dueAt`; a correct answer that was not due is `practice`: counted, schedule untouched; `outcome` returned; due dates at the local start of day | ~30 lines | **Chosen.** |

## Decision and trade-off

I chose D, recorded as ADR-0015, which amends ADR-0009. `schedule()` now returns an `outcome` (`learned`, `advanced`, `practice`, `lapsed` or `failed`), and the answer response carries it so the client can say "practice: does not move your schedule" instead of implying progress. A wrong answer is still a lapse at any time, because you did forget it.

The sharp edge was the server review's M4. With `dueAt = now + 1 day` to the millisecond, a card learned at 10:07 is not due at 09:55 the next morning. Everyone who studies a little earlier would get "practice" on cards the UI said were "back in 1 day". So for intervals of one day or more, `dueAt` is now local midnight of `now + intervalDays`. I also capped intervals at 180 days (S1).

What it costs: practice earns 1 XP instead of 6 (contract §2). Because XP is replayed from the log (J14), that rule also applies to history, so a learner who farmed repeats before this change sees their total drop once, at upgrade. I accepted that. The number was inflated by the bug this fixes. Revisit if learners report the drop as data loss.

## The change

`server/src/srs.js`: `wasDue`, `outcome`, `startOfLocalDay`, `MAX_INTERVAL_DAYS`, and `xpFor(outcome, { wasFirstAttempt, gaveUp })`. `server/src/answer.js` returns `outcome` and `state`. `server/src/check.js`: the pinned assertion is fixed rather than ported (second answer a day later), and a new line checks that a same-minute repeat is practice. About 35 lines of non-test code.

After, `server/src/srs.js` (working tree):
```js
  const wasDue = state.attempts === 0 || now >= new Date(state.dueAt);
  // ...attempts, correct and lastAnsweredAt advance first...
  if (correct && !wasDue) {
    return { ...next, outcome: 'practice' };
  }
```

## Verification

1. `server/test/srs.test.js` › *a correct answer before dueAt is practice: reps/ease/interval/dueAt unchanged, attempts+1*. At the baseline, `reps` is 2 (expected 1).
2. `server/test/srs.test.js` › *a correct answer at 09:55 the next day is a rep, not practice (day-granular due dates)*. With the millisecond `dueAt`, it would be practice.
3. `server/test/srs.test.js` › *property (seed 434): mastered ⇒ two correct answers, the second on a later local day than the first*: 500 random sequences.
4. `node server/src/check.js` → *a second correct answer the same minute is only practice* and *second correct answer a day later reaches mastery*.

## What a senior reviewer would ask

- *Do existing cards that were "mastered" in one sitting get backfilled?* No. The inflation is historical, it corrects itself on the next lapse, and recomputing `reps` from the log is a migration with real risk for a small gain.
- *Does this close the double-submit bug?* The server half only. A replayed POST is now practice and cannot move the schedule, but it still writes a row and earns 1 XP. J30's client guard closes the rest.
- *Why local midnight and not "due in 20 hours"?* A learner thinks in days. `localDayKey` in `progress.js` already defines the day, and midnight in the server's zone is the same boundary the streak uses (J16).

## The junior version of this fix

`if (correct && now - new Date(state.lastAnsweredAt) < DAY) return state;`. That returns the *old* state, so the answer never happened: accuracy and attempts ignore it, XP is still awarded by the route, and the relearn after a lapse (due in 10 minutes) can never succeed on the same day.

## Follow-ups

- [ ] Client copy for `practice` and "back in 10 min" → J30
- [ ] README "two spaced correct answers" is now true; no change needed
