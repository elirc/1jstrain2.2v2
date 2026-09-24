---
id: J15
title: Keep accuracy at or below 100% when question ids change
area: server
closes: [F-10]
ladder: [B07, B04]
adrs: []
status: landed
---

# Keep accuracy at or below 100% when question ids change

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-10 · Ladder B07, B04 · ADRs none

## Symptom

The dashboard can show an accuracy of 1,000%. Against a scratch copy of `6f1bf43`, I gave a profile one live card (1 attempt, 1 correct) and one card for a question id that is no longer in the content (9 attempts, 9 correct):

```
buildProgress(…).totals.accuracy → 10          expected: 1
```

This is not hypothetical. Card states key on `question_id`, which references nothing, so every rename or deletion in the content leaves orphans behind. The content is about to double, and it was being restructured while I wrote this (it went from 434 to 442 questions during the work).

## Root cause

`server/src/progress.js › totals.accuracy (L94–104 @ 6f1bf43)`
```js
  const totals = {
    questions: curriculum.questions.length,
    // … seen, mastered, due, attempts: summed over moduleStats …
    attempts: moduleStats.reduce((n, m) => n + m.attempts, 0),
  };
  totals.accuracy = (() => {
    const correct = [...states.values()].reduce((n, s) => n + s.correct, 0);
    return totals.attempts ? correct / totals.attempts : null;
  })();
```

The denominator is summed over *current* questions (through `moduleStats`). The numerator is summed over *every stored card state*. The invariant: *a ratio's numerator and denominator are computed over the same set*. The track accuracy (L83) had the same smell, as a float round trip (`accuracy * attempts`), without the bug.

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Any content rename shows a learner impossible numbers. |
| B | Clamp: `Math.min(1, …)` | 1 line | It hides the bug, and the number is still wrong, just believably wrong. |
| C | Delete orphaned card states at boot | A migration that destroys data | If a rename is reverted, the history is gone. Orphans should stay stored and simply not count. |
| D | Sum `correct` inside the module loop next to `attempts`; carry `correct` on each module and track; divide once | ~10 lines | **Chosen.** |

## Decision and trade-off

I chose D. Every total is now a sum over `moduleStats`, so all of them range over current content. `modules[].correct` is a new additive field (contract §10) that the client can use without dividing twice. The cost is that answers to removed questions no longer count toward accuracy anywhere, which is correct, but a learner who notices their attempt count drop after a content release will not be told why. XP is unaffected: it is replayed from the attempt log (J14), which keeps every row.

The deeper issue is that question ids are a persisted contract that nothing checks. That is B04, and it is the content team's J37 to enforce (a committed id list, or a CI diff) before the doubling. I will revisit the server side only if orphans need reporting, for example `orphanedCardStates` on `/api/health`.

## The change

`server/src/progress.js`: `correct` is accumulated per module and returned. `totals.correct` and `totals.accuracy` come from the module sums. Track accuracy is `correct / attempts`. About 10 changed lines.

After, `server/src/progress.js` (working tree):
```js
    attempts: moduleStats.reduce((n, m) => n + m.attempts, 0),
    correct: moduleStats.reduce((n, m) => n + m.correct, 0),
    nextDueAt,
  };
  totals.accuracy = totals.attempts ? totals.correct / totals.attempts : null;
```

## Verification

1. `server/test/progress.test.js` › `buildProgress on sqlite` / `on json` › *accuracy stays ≤ 1 with orphaned card states; modules carry correct*: the exact reproduction above. At the baseline it returns 10.
2. `npm run check -w server` → *accuracy is computed* still passes.

## What a senior reviewer would ask

- *Why not join card states to content in the store?* The content is not in the database. It is an ES module (ADR-0001), so "is this id current" can only be asked in JavaScript.
- *Do orphans affect anything else?* `nextDueAt` and `due` counts also iterate over current modules, so no. Sessions draw from content, so an orphan is never served.
- *What about `seen`/`mastered`?* Those were already summed per module. Only accuracy crossed the two sets.

## The junior version of this fix

`Math.min(1, correct / attempts)`. The display is fixed, it passes review, and the number is still wrong: a learner at 60% on current content with a big orphaned history is shown 100%.

## Follow-ups

- [ ] Question-id stability check before the content doubling → J37 (content)
- [ ] Optional `orphanedCardStates` count on `/api/health` → new entry if wanted
