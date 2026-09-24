# Walkthrough 02: the spaced-repetition scheduler

Files: `server/src/srs.js`, `server/src/store.js › emptyCardState`, `server/src/check.js` · As of: 6f1bf43 · Time: ~40 min · Read first: walkthrough 01

## The job in one sentence

Given a card's state, whether the answer was right, and the time, return the card's next state: when it is due again, how fast its intervals grow, and whether it now counts as mastered.

## The contract

- **In:** `state` (a `CardState`, `server/src/store.js › CardState (L17–29 @ 6f1bf43)`), `correct: boolean`, `now: Date`.
- **Out:** a new `CardState`. The input object is never mutated.
- **Invariant 1:** `1.3 <= ease <= 2.8` after any sequence of answers.
- **Invariant 2:** a wrong answer sets `reps = 0`, `intervalDays = 0` and `dueAt = now + 10 min`.
- **Invariant 3:** `lapses` grows only when a card that had `reps > 0` is answered wrongly.
- **Invariant 4:** `isDue(state, now)` is false for any card with `attempts === 0`.
- **Invariant 5 (intended, broken at the baseline):** a card becomes mastered only through correct answers given on or after their `dueAt`. Behaviour 11 below shows how it breaks.

## Read it in this order

1. `server/src/srs.js › Two spaced correct answers (L1–8 @ 6f1bf43)`. The comment makes a promise. Keep it in mind.
2. `server/src/store.js › emptyCardState (L31–44 @ 6f1bf43)`. The state a card has before its first answer.
3. `server/src/srs.js › schedule (L27–53 @ 6f1bf43)`. The whole algorithm.
4. `server/src/srs.js › isDue (L59–61 @ 6f1bf43)` and `server/src/srs.js › xpFor (L63–67 @ 6f1bf43)`.
5. `server/src/check.js › second correct answer reaches mastery (L66–78 @ 6f1bf43)`. The tests, and what they pin.

## The lines worth stopping at

Eleven behaviours. Each has a line you can point at.

**1. The input is never mutated.** `const next = { ...state, attempts: state.attempts + 1, … }` (L28–33). Every assignment after it writes to `next`. That is what lets `api.js` keep `before` for `xpFor(before, correct)` and `wasFirstAttempt`, and what makes property tests possible.

**2. Intervals grow 1, 3, then multiply.**
`server/src/srs.js › next.intervalDays (L36–41 @ 6f1bf43)`
```js
    next.reps = state.reps + 1;
    next.ease = Math.min(MAX_EASE, state.ease + 0.1);
    if (next.reps === 1) next.intervalDays = 1;
    else if (next.reps === 2) next.intervalDays = 3;
    else next.intervalDays = Math.round(state.intervalDays * next.ease);
    next.dueAt = addDays(now, next.intervalDays).toISOString();
```
The multiplier is the *already raised* ease (`next.ease`, not `state.ease`). From a fresh card answered on time, the intervals run 1, 3, 8, 22, 62, 174, 487 days. There is no ceiling (server S1).

**3. Ease is clamped at both ends.** +0.1 capped at `MAX_EASE = 2.8`, and −0.2 floored at `MIN_EASE = 1.3` (L10–11, L37, L47). The floor comes from SM-2. The ceiling does not. Without it, a long run of correct answers would make ease, and so every interval, grow without bound. Opinion: the cap is doing a job a maximum interval would do more directly.

**4. One wrong answer resets reps to 0.** `next.reps = 0` (L46). Because mastery is `reps >= 2`, a mastered card that is missed once is un-mastered at once, and the module ring drops. That is strict, and it is intended: the ring means "you can do this now".

**5. A lapse needs a learned card.**
`server/src/srs.js › not forgetting (L43–45 @ 6f1bf43)`
```js
    // Only count a lapse if the card had actually been learned — getting a new
    // question wrong the first time is not forgetting.
    next.lapses = state.lapses + (state.reps > 0 ? 1 : 0);
```

**6. The 10-minute relearn.** `intervalDays = 0`, and `dueAt = now + RELEARN_MINUTES * 60_000` (L48–49). The drill shows "back shortly" whenever `intervalDays` is 0 (`client/src/pages/DrillPage.tsx › back shortly (L407 @ 6f1bf43)`). The card is back in `review` mode 10 minutes later.

**7. Why `isDue` needs `attempts > 0`.**
`server/src/srs.js › isDue (L59–61 @ 6f1bf43)`
```js
export function isDue(state, now = new Date()) {
  return state.attempts > 0 && new Date(state.dueAt) <= now;
}
```
`emptyCardState` sets `dueAt: new Date(0).toISOString()`, which is 1970-01-01. A column declared `NOT NULL` needs a value, and the epoch is "long ago". Without the `attempts > 0` guard, every unseen question would be due, `review` mode would be the whole curriculum, and the dashboard would show 434 due. The guard and the default are one decision split across two files. Change either one alone and the other breaks.

**8. XP depends only on the prior attempt count.** `xpFor(state, correct)` returns 2 for a wrong answer, 10 for a first-time correct one and 6 after that (L64–67). It reads only `state.attempts`, which is why `buildProgress` can replay XP from the attempt log alone (walkthrough 04, ADR-0004). It also means a mastered card answered again earns 6 every time (server M13).

**9. `levelFor` is a linear scan with a guard.** At the top level `next` is `null`, so `span` is 1 and `progressToNext` is 1 (L84–89). That avoids a division by zero, not a bug.

**10. `intervalDays` is stored as `REAL`** (`server/src/store.js › interval_days (L67 @ 6f1bf43)`), but `schedule` only writes integers. The schema promises more than the code does. That is harmless now, and it matters the day someone adds fuzz.

**11. What is not here.** There is no maximum interval and no jitter, so cards learned together come due together. Most importantly, **spacing is not enforced**: nothing in `schedule` reads `state.dueAt`. A correct answer 60 seconds after the first one advances `reps` to 2 and masters the card (server B2, register F-01). `pickOrdered` re-serves non-due cards on purpose (`server/src/sessions.js › rest (L122 @ 6f1bf43)`), so this is the normal path, not an edge case. The self-test asserts the bug:
`server/src/check.js › second correct answer reaches mastery (L69–73 @ 6f1bf43)`
```js
  state = schedule(state, true, now);
  check('first correct schedules one day out', state.intervalDays === 1);
  check('one correct answer is not mastery', !isMastered(state));
  state = schedule(state, true, now);
  check('second correct answer reaches mastery', isMastered(state));
```
J10 fixes this. An answer before `dueAt` gets `outcome: 'practice'`, which advances `attempts` and `correct` but not `reps`, `ease` or `dueAt`. `dueAt` for `intervalDays >= 1` becomes the local start of that day (contract §3, ADR-0015).

## Observe it

From the root of a baseline checkout (`git worktree add ../sr-base 6f1bf43 && cd ../sr-base && npm install`):

1. The early answer that masters a card:
   ```sh
   node --input-type=module -e "
   const { schedule, isMastered } = await import('./server/src/srs.js');
   const { emptyCardState } = await import('./server/src/store.js');
   const t0 = new Date('2026-01-01T10:00:00Z');
   let s = schedule(emptyCardState('p', 'q'), true, t0);
   s = schedule(s, true, new Date(t0.getTime() + 60_000));
   console.log({ reps: s.reps, intervalDays: s.intervalDays, mastered: isMastered(s) });"
   ```
   Output: `{ reps: 2, intervalDays: 3, mastered: true }`.
2. The 1970 default: `isDue(emptyCardState('p','q'))` is `false`, and `isDue({ ...emptyCardState('p','q'), attempts: 1 })` is `true`.
3. Interval growth: answer on each `dueAt` in a loop, and print `intervalDays`. You get `1,3,8,22,62,174,487`, and ease settles at `2.8`.
4. The floor, and no lapse on a new card: `schedule({ ...emptyCardState('p','q'), ease: 1.3 }, false, t0)` gives `ease 1.3, lapses 0`.
5. The self-test: `npm run check -w server` passes, including the assertion quoted in behaviour 11.

## What is still wrong here

- F-01: spacing is not enforced, and `check.js` L69–73 pins it (J10, ADR-0015).
- Server S1: no maximum interval (J10 caps at 180 per contract §3).
- F-09: session randomness is not injectable, so the scheduler is testable and its callers are not (J06, J07).
- F-08: XP replay is windowed to 365 days (walkthrough 04, J14).

## Do it

1. (5 min) Write down the state after the sequence right, right, wrong, right, starting from `emptyCardState` with `now` advancing to each `dueAt`.
2. (15 min) Write a property check with a plain loop, no library. For 10,000 random sequences of answers, `ease` stays within [1.3, 2.8] and `lapses <= attempts`.
3. (20 min) Make the early answer not count. If `state.attempts > 0` and `now < new Date(state.dueAt)` and the answer is correct, advance `attempts`, `correct` and `lastAnsweredAt` only. Fix `check.js` L72 to use a `now` one day later, and show that Observe 1 now prints `reps: 1`. Compare with J10.

## Check yourself

1. Why does `isDue` check `attempts` at all, when an unseen card's `dueAt` is 1970?
2. From a fresh card, what are `ease` and `intervalDays` after three on-time correct answers?
3. Which answer increments `lapses`: the first-ever wrong answer, or a wrong answer after one correct?
4. Why can `buildProgress` compute XP without reading `card_states`?
5. At the baseline, what is the shortest wall-clock time in which a card can go from unseen to mastered?

<details><summary>Answers</summary>

1. Because 1970 is in the past. Without the guard, every unseen card is due, and `review` becomes the whole curriculum.
2. `ease` 2.8 (2.5 + 0.1 × 3), and `intervalDays` 8, from `round(3 × 2.8)`.
3. The second: `state.reps > 0` is required.
4. `xpFor` depends only on the number of prior attempts for that question, and the attempt log gives that by counting.
5. The time between two submissions, a few seconds. Nothing reads `dueAt`.

</details>

## After the refactor

In the working tree (uncommitted, 2026-09-24; J10, ADR-0015), `schedule()` returns the next state plus an `outcome`: `learned`, `advanced`, `practice`, `lapsed` or `failed`. `wasDue` decides the practice case: a correct answer before `dueAt` advances `attempts` and `correct` only. `dueAt` for a correct answer is `startOfLocalDay(now, intervalDays)`, local midnight, so due dates are day-granular. Intervals are capped at `MAX_INTERVAL_DAYS` (180) and floored at one day for imported cards (J45, in review). `xpFor` now takes the outcome, and `replayXp` reuses `schedule()` for history. Observe 1 on this tree prints `{ reps: 1, intervalDays: 1, mastered: false }` (and `outcome: 'practice'` if you log it). `outcome` is never stored, because `store.js › cardFields` persists named fields only. The tests moved from `check.js` to `server/test/srs.test.js`.
