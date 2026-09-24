---
id: ADR-0015
title: An early correct answer is practice
status: accepted
date: 2026-09-23
amends: [ADR-0009]
supersedes: null
---

# ADR-0015: An early correct answer is practice

Status: accepted, amends ADR-0009 · Date 2026-09-23 · Written with J10
Anchors: `server/src/srs.js › schedule (L27–53 @ 6f1bf43)`, `server/src/check.js › second correct answer reaches mastery (L69–73 @ 6f1bf43)`

## Context
ADR-0009 defines mastery as two reps, and the README promises "two spaced correct answers". At the baseline `schedule()` never read `dueAt`, so two correct answers a minute apart mastered a card (F-01). Sessions deliberately re-serve non-due cards (module drills, "Another round"), so this was the normal path. `check.js` asserted the bug as a pass. Learners study at roughly, but not exactly, the same time each day.

## Decision
We treat a correct answer given before the card is due as **practice**. It advances `attempts`, `correct` and `lastAnsweredAt`, and leaves `reps`, `ease`, `intervalDays` and `dueAt` unchanged. A card is due if it has never been answered, or if `now >= dueAt`. A wrong answer is a lapse (`reps > 0`) or a failure (`reps === 0`) at any time, due again in 10 minutes. For intervals of a day or more, `dueAt` is the **local start of day** of `now + intervalDays`, so "back in 1 day" means any time tomorrow. Intervals are capped at 180 days. `schedule()` returns an `outcome` (`learned | advanced | practice | lapsed | failed`), and the answer response carries it. Practice earns 1 XP.

## Evidence
`server/src/srs.js` (working tree):
```js
  const wasDue = state.attempts === 0 || now >= new Date(state.dueAt);
  // …
  if (correct && !wasDue) {
    return { ...next, outcome: 'practice' };
  }
```
Enforced by `server/test/srs.test.js` › *a correct answer before dueAt is practice…*, *a correct answer at 09:55 the next day is a rep, not practice…*, and the seeded property *mastered ⇒ two correct answers, the second on a later local day than the first*. `check.js` now asserts that the same-minute repeat is practice.

## Consequences
- Good: mastery, stage unlocks and levels mean what the README says.
- Good: a replayed POST can no longer move the schedule (the server half of F-07).
- Cost: extra practice in a module drill moves nothing, and the client must say so (`outcome`, `reason`).
- Cost: because XP is replayed from the log (ADR-0004 as amended by J14), learners who farmed repeats before this change see their XP drop once, at upgrade.
- Forces on future work: any new session mode must tag non-due cards `practice`.

## Alternatives rejected
- **A minimum gap since the last answer.** It is arbitrary, and it blocks the 10-minute relearn after a lapse.
- **Never serve non-due cards.** It removes practice and still leaves the API able to farm reps.
- **Due to the millisecond.** It turns "back in 1 day" into practice for anyone who studies earlier than yesterday.

## Breaks first at
Learners in several time zones on one server. "Local start of day" is the server's zone.

## Revisit when
- Learners report "my answer did not count" for cards the UI showed as due.
- The app serves learners in more than one time zone.
