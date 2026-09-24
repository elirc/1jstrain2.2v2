# Walkthrough 04: deriving progress

Files: `server/src/progress.js`, `server/src/srs.js`, `content/tracks.js` · As of: 6f1bf43 · Time: ~45 min · Read first: walkthrough 02

## The job in one sentence

Turn one profile's card states and attempt log into every number the dashboard shows: mastery per module, stage and track, unlocks, accuracy, XP and level, today's count, the streak and the heatmap. Store none of them.

## The contract

- **In:** `store`, `profileId`, `now`. It reads `listCardStates(profileId)` once and `listAttempts(profileId, since)` once.
- **Out:** `{ totals, level, xp, streak, today, modules, stages, tracks, activity }`.
- **Invariant 1:** `0 <= totals.accuracy <= 1` whenever it is not `null`. **Broken** by orphaned states (F-10).
- **Invariant 2:** `xp` never decreases as `now` advances with no new attempts. **Broken** by the 365-day window (F-08).
- **Invariant 3:** `streak` equals the number of consecutive local calendar days with an attempt, ending today or yesterday. **Broken** across DST (F-24).
- **Invariant 4:** stage 1 is always unlocked, and a stage with any seen question stays unlocked.
- **Invariant 5:** everything is a pure function of the store's rows and `now`. Nothing is written.

## Read it in this order

1. `server/src/progress.js › buildProgress (L18–50 @ 6f1bf43)`. States into a map, then a per-module loop over the **curriculum**.
2. `server/src/progress.js › previousMastery (L52–76 @ 6f1bf43)`. Unlocking.
3. `server/src/progress.js › totals.accuracy (L94–104 @ 6f1bf43)`. Totals, and the one loop that is not over the curriculum.
4. `server/src/progress.js › seenBefore (L106–124 @ 6f1bf43)`. XP replay and the day buckets.
5. `server/src/progress.js › computeStreak (L139–155 @ 6f1bf43)` and `server/src/progress.js › localDayKey (L12–16 @ 6f1bf43)`.

## The lines worth stopping at

**Missing states are filled, not skipped.** `const stateOf = (id) => states.get(id) ?? emptyCardState(profileId, id);` (L20). Module stats iterate `questionsByModule(module.id)`, so an unanswered question counts toward `total` with zero attempts. A card state whose question no longer exists is simply never visited here.

**Mastery is a count, not an average.** `mastery: questions.length ? mastered / questions.length : 0` (L48), where `mastered` counts `isMastered(state)`, meaning `reps >= 2`. Because of F-01 (walkthrough 02), two answers in one sitting count. Every number in this file inherits that.

**Unlocking reads the previous stage, and seen work keeps a stage open.**
`server/src/progress.js › unlocked (L66–75 @ 6f1bf43)`
```js
    stageStats.push({
      stageId: stage.id,
      total,
      seen,
      mastered,
      due,
      mastery,
      unlocked: previousMastery >= stage.unlockAt || seen > 0,
    });
    previousMastery = mastery;
```
`let previousMastery = 1;` (L57) runs before the loop, so stage 1 passes any threshold. The threshold compared is *this* stage's `unlockAt`, applied to the *previous* stage's mastery. Every later stage has `unlockAt: 0.35` in `content/tracks.js`, while the README (L55) and the dashboard say "a third" (F-19). Unlocking is advisory. The server never checks it, `mode: 'stage'` serves any stage, and `|| seen > 0` means drilling a "locked" module unlocks its stage (client M3 in `_audits/2026-09-23-client.review.md` §2). J35 adds `stage.after`, a gate named explicitly instead of "the previous one in the list".

**Accuracy divides two different populations.**
`server/src/progress.js › totals.accuracy (L99–104 @ 6f1bf43)`
```js
    attempts: moduleStats.reduce((n, m) => n + m.attempts, 0),
  };
  totals.accuracy = (() => {
    const correct = [...states.values()].reduce((n, s) => n + s.correct, 0);
    return totals.attempts ? correct / totals.attempts : null;
  })();
```
The denominator sums attempts over curriculum questions. The numerator sums `correct` over **every stored state**, including states for question ids that were removed or renamed. Rename one answered question and accuracy can pass 100% (server P1, F-10). The audit reproduced `accuracy: 6`. The fix is to sum `correct` inside the module loop, which already has it (L33). The deeper lesson is that a question id is a persisted contract. J15 adds an id-stability check before the content doubles.

**Track accuracy takes a detour.** `weighted` is `(m.accuracy ?? 0) * m.attempts` (L83). That is `correct` again, recovered by multiplying a division back out. Summing `correct` would be exact.

**XP is replayed, over a window.** L108 fetches attempts since `now − 365 days`, and the loop gives each one `xpFor({ attempts: priorAttempts }, correct)`. The same `history` array feeds the heatmap, which is why the window exists. Attempts older than a year drop out of XP, and `seenBefore` restarts inside the window, so an old question's first in-window attempt pays 10 again (server B6, F-08). J14 replays everything and filters only the heatmap.

**The streak steps by 24 hours, not by calendar day.**
`server/src/progress.js › cursor.getTime() - DAY_MS (L143–155 @ 6f1bf43)`
```js
export function computeStreak(days, now = new Date()) {
  let cursor = new Date(now);
  if (!days.has(localDayKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!days.has(localDayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
```
`localDayKey` uses local time, which is right, because a streak is what the learner lived. Subtracting 86,400,000 ms is not a calendar day on a DST boundary. Near midnight after spring-forward, "24 hours ago" lands two calendar days back and skips a day. Near midnight after fall-back, it lands on the same calendar day twice and counts it twice (server B7, F-24). J16 steps by calendar date from local noon.

**Cost.** One full card-state list plus up to a year of attempts per call, and the client calls `/progress` after every drill. That is fine at this scale. J22 measures it instead of assuming.

## Observe it

In a baseline checkout with `npm install` done:

1. XP falls after a year, and accuracy passes 100%:
   ```sh
   node --input-type=module -e "
   import('./server/src/store.js').then(async ({ createStore }) => {
     const { buildProgress } = await import('./server/src/progress.js');
     const { schedule } = await import('./server/src/srs.js');
     const { mkdtempSync } = await import('node:fs'); const { tmpdir } = await import('node:os');
     const store = await createStore({ dataDir: mkdtempSync(tmpdir() + '/wt04-') });
     const p = store.createProfile('x');
     const add = (qid, iso) => { const when = new Date(iso);
       store.saveCardState(schedule(store.getCardState(p.id, qid), true, when));
       store.addAttempt({ profileId: p.id, questionId: qid, moduleId: 'js-values', trackId: 'js',
         correct: 1, elapsedMs: 1, answeredAt: when.toISOString() }); };
     add('js-values-1', '2025-05-01T10:00:00Z'); add('js-values-1', '2025-05-03T10:00:00Z');
     console.log('xp', buildProgress(store, p.id, new Date('2025-06-02T10:00:00Z')).xp,
                 buildProgress(store, p.id, new Date('2026-09-23T10:00:00Z')).xp);
     add('removed-q-1', '2026-09-20T10:00:00Z'); add('removed-q-1', '2026-09-21T10:00:00Z');
     console.log('accuracy', buildProgress(store, p.id, new Date('2026-09-23T10:00:00Z')).totals.accuracy);
     store.close(); });"
   ```
   Output: `xp 16 0`, then `accuracy 2`. The rows for `removed-q-1` stand in for a question that was renamed.
2. The streak across DST. Run with `TZ=America/Los_Angeles` (it works on Windows too):
   ```sh
   TZ=America/Los_Angeles node --input-type=module -e "
   const { computeStreak } = await import('./server/src/progress.js');
   const days = (...d) => new Map(d.map((k) => [k, {}]));
   console.log(computeStreak(days('2026-03-08'), new Date(2026, 2, 9, 0, 30)), 'expected 1');
   console.log(computeStreak(days('2026-10-31', '2026-11-01', '2026-11-02'), new Date(2026, 10, 2, 23, 30)), 'expected 3');"
   ```
   Output: `0 expected 1`, then `4 expected 3`.
3. The unlock threshold: `node -e "import('./content/index.js').then(m => console.log(m.stages.map(s => s.unlockAt)))"` prints `[0, 0.35, 0.35, …]`. Compare with README L55.
4. The self-test covers only the happy path: `server/src/check.js › streak counts consecutive days (L112 @ 6f1bf43)` uses 1 and 2 January 2026, far from any DST change, so it cannot catch F-24.

## What is still wrong here

- F-10: accuracy over orphaned states (J15).
- F-08: XP windowed to 365 days (J14; amends ADR-0004).
- F-24: streak across DST (J16).
- F-19: "a third" vs `0.35`, and "Seven stages" hard-coded (J37).
- F-01: mastery counts unspaced answers (J10). Every number here inherits it.
- M-14: the client refreshes progress only from `Summary` (J32).

## Do it

1. (5 min) Compute by hand what the dashboard shows for a profile that answered only `js-values-1`, twice, correctly, a day apart: stage 1 mastery, stage 2 `unlocked`, and XP.
2. (15 min) Rewrite `totals.accuracy` to sum `correct` inside the module loop. Show that Observe 1 now prints `accuracy 1`.
3. (20 min) Rewrite `computeStreak` to step by calendar date: build the previous day with `new Date(y, m, d - 1, 12)`. Prove it with Observe 2 under `TZ=America/Los_Angeles`, and with the same script under `TZ=UTC`. Compare with J16.

## Check yourself

1. Why do module stats ignore orphaned card states, while `totals.accuracy` does not?
2. A learner answers one question in stage 3 and none in stage 2. Is stage 3 unlocked, and why?
3. Why does the XP window exist at all?
4. Which DST transition makes the streak too long, and which makes it too short?
5. Why is `(accuracy ?? 0) * attempts` just a roundabout `correct`?

<details><summary>Answers</summary>

1. Module stats iterate the curriculum's questions. Accuracy's numerator iterates `states.values()`, which holds every stored id.
2. Yes. `seen > 0` unlocks it, whatever stage 2's mastery is.
3. The same `history` array feeds the 365-day heatmap, and XP piggybacks on that query.
4. Fall-back (a 25-hour day) counts one day twice. Spring-forward (a 23-hour day) can jump over a day near midnight.
5. `accuracy` is `correct / attempts`, so multiplying by `attempts` recovers `correct`, with floating-point noise added.

</details>

## After the refactor

In the working tree (uncommitted, 2026-09-24), `buildProgress(store, profileId, { now, settings })` has a new signature. XP is `replayXp` over **all** history: `store.listAttempts(profileId)` has no `since`, and the 365-day window now applies only to the heatmap (`ACTIVITY_DAYS`; J14, F-08). `totals.attempts` and `totals.correct` come from the same loop over current content, so accuracy cannot exceed 1 (J15). `computeStreak` steps by calendar date at local noon (J16). On this tree, with `{ now }` passed as an options object, Observe 1 prints `xp 16 16` and `accuracy 1`, and Observe 2 prints `1 expected 1` and `3 expected 3`. Stages gate on `stage.after` when the content names one, else the previous stage (`gateStageId`; J35, in review). `today.goal` and `totals.nextDueAt` are new. The tests are in `server/test/progress.test.js`.
