---
id: ADR-0009
title: Schedule with a trimmed SM-2, and call two reps mastery
status: accepted
date: 2026-09-23
amended-by: [ADR-0015]
superseded-by: null
---

# ADR-0009: Schedule with a trimmed SM-2, and call two reps mastery

Status: accepted, amended by ADR-0015 (an early correct answer is practice, written with J10) · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `server/src/srs.js › schedule (L1–8, L27–53 @ 6f1bf43)`, `server/src/srs.js › MASTERY_REPS (L14–19 @ 6f1bf43)`, `server/src/check.js › second correct answer reaches mastery (L66–78 @ 6f1bf43)`

## Context
Mastery drives the product. It fills the module rings, and stage unlocks are computed from it. The learner must be able to predict it: "right twice, spaced out, and it counts". Real SM-2 asks for a 0–5 quality grade after each answer. A quiz has only right or wrong, and asking learners to self-rate would slow every card.

## Decision
We keep SM-2's shape (ease factor, growing intervals, reset on failure) and cut the rest. A correct answer is quality "good". Ease moves +0.1 or −0.2, clamped to [1.3, 2.8]. Intervals run 1 day, then 3 days, then the previous interval times the new ease. A wrong answer resets reps and brings the card back in 10 minutes. A card is mastered at `reps >= 2`.

## Evidence
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
`server/src/check.js › second correct answer reaches mastery (L69–73 @ 6f1bf43)` calls `schedule(state, true, now)` twice with the **same** `now` and asserts mastery. The test pins the defect below.

## Consequences
- Good: the whole scheduler is 27 lines, pure apart from the `now = new Date()` default, and explainable on the dashboard.
- Cost: the word "spaced" is not implemented. `schedule()` never reads `state.dueAt`, so two correct answers 60 seconds apart give `reps 2, intervalDays 3, mastered true` (reproduced; server B2, register F-01). `pickOrdered` re-serves non-due cards on purpose (`sessions.js` L122), so learning a module twice in one sitting masters it. The README's "two spaced correct answers" (L77) is false. ADR-0015 records the fix: an answer before `dueAt` is `practice`.
- Cost: there is no maximum interval. Intervals run 1, 3, 8, 22, 62, 174, 487 days, and ease hits 2.8 by the third rep (server S1; contract §3 caps it at 180).
- Cost: no jitter. Cards learned together come due together.
- Forces on future work: anything that changes `reps` changes mastery, and therefore stage unlocks, for every existing learner. Test the change against real card states, not just fresh ones.

## Alternatives rejected
- **Full SM-2 with self-rating.** It is one extra decision per card, for a signal a multiple-choice answer cannot give honestly.
- **FSRS.** It is better at predicting retention, but it needs parameters fitted from review logs this app does not yet have.
- **Mastery at three reps.** It is slower to reward. Two is enough *once spacing is enforced*, and that was the real gap.

## Breaks first at
Attempts per learner, as data rather than load. With months of attempts, the constants (1, 3, ±0.1, 1.3–2.8) can be fitted instead of guessed. `elapsedMs` and `answered_at` are already stored for that.

## Revisit when
- Measured retention at a given interval is below target, from the attempt log.
- Learners report that mastered cards feel forgotten.
