---
id: J08
title: Record the card and the attempt in one transaction
area: server
closes: [F-02, F-03]
ladder: [B05]
adrs: [0003 unchanged]
status: landed
---

# Record the card and the attempt in one transaction

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-02, F-03 · Ladder B05 · ADRs 0003 unchanged

## Symptom

No learner has reported it. The defect is an unenforced invariant: *an attempt row exists if and only if its card moved*. XP and history come from `attempts`; mastery and unlocks come from `card_states`. If only one write lands, they disagree for good.

At the baseline (`6f1bf43` extracted to a scratch directory) I ran the route's two writes with an attempt the database rejects:

```
store.saveCardState(schedule(before, true, t0));
store.addAttempt({ ...attempt, moduleId: undefined });
// → throws "NOT NULL constraint failed: attempts.module_id"
card reps / attempt rows: [1, 0]      expected: [0, 0]
```

The card advanced to `reps: 1`, and no attempt exists to explain it.

I rate this **S3**. Both calls are synchronous statements in one tick. The gap opens only if the second statement throws (a bug, as above) or the process is hard-killed between two lines microseconds apart. The fix is still worth making: it turns an assumption into a guarantee, and gives the answer flow one store call a test can target.

## Root cause

`server/src/routes/api.js › addAttempt (L121–130 @ 6f1bf43)`
```js
    store.saveCardState(after);
    store.addAttempt({
      profileId,
      questionId: question.id,
      moduleId: question.moduleId,
      trackId: question.trackId,
      correct: correct ? 1 : 0,
      elapsedMs: Number.isFinite(elapsedMs) ? Math.round(elapsedMs) : null,
      answeredAt: now.toISOString(),
    });
```

`server/src/store.js › resetProgress (L163–166 @ 6f1bf43)` has the same shape: two `DELETE`s with nothing tying them together. A failure between them leaves attempts with no card, so XP survives a "reset".

The broken invariant, phrased as a test: *after `recordAnswer(state, attempt)` throws, the card state and the attempt log are exactly what they were before the call.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | The window is tiny, and the real exposure is a replayed POST (F-07), which a transaction does not fix. But the invariant stays unstated and untested. |
| B | Compensate in the route: `try { addAttempt } catch { saveCardState(before); throw }` | ~6 lines | The compensation is a third write that can itself fail, on paths someone remembered to wrap. |
| C | `store.recordAnswer(state, attempt)`: `db.transaction()` in SQLite; validate first, then one synchronous mutation in JSON | ~25 lines across both backends | One call, one guarantee, both backends, and a place to test it. **Chosen.** |
| D | Drop `card_states` and derive the schedule from `attempts` on every read | A rewrite of sessions and progress | No second write at all, but every session replays the whole log. Out of proportion to an S3. |

## Decision and trade-off

I chose C. The store owns atomicity, because only the store knows what a transaction is on its backend. What I gave up: `saveCardState` and `addAttempt` still exist for the self-test, so a future caller can still write twice by hand; the contract suite is what keeps `recordAnswer` honest. Revisit when the answer flow gains a third write (an XP ledger, an `outcome` column).

## The change

`server/src/store.js` gains `recordAnswer` on both backends, makes `resetProgress` a transaction, and adds `importProfile` (J40) as one. `attemptFields()` validates an attempt before anything is written. `server/src/answer.js` `submitAnswer` is the only caller. About 40 lines.

After, `server/src/store.js` (SQLite, working tree):
```js
  const recordAnswer = db.transaction((state, attempt) => {
    stmt.upsertCard.run(cardFields(state));
    return { attemptId: Number(stmt.insertAttempt.run(attempt).lastInsertRowid) };
  });
```

After, `server/src/store.js` (JSON, working tree): validate everything, then mutate in one synchronous block:
```js
    recordAnswer: (state, attempt) => {
      const fields = attemptFields(attempt);
      const card = cardFields(state);
      return mutate(() => {
        data.cards[key(card.profileId, card.questionId)] = card;
        return { attemptId: pushAttempt(fields) };
      });
    },
```

`cardFields()` also strips the `outcome` that `schedule()` now returns (J10), so it never reaches a column.

## Verification

1. `server/test/store.test.js` › `store contract: sqlite` and `store contract: json` › *recordAnswer writes card and attempt together; a bad attempt rolls back the card*. After one good answer it calls `recordAnswer` with `reps: 5` and a missing `moduleId`, and asserts the throw, `reps` still 1, and one attempt. At the baseline the method does not exist (`store.recordAnswer is not a function`); the equivalent two calls give the `[1, 0]` above.
2. `npm run check -w server` → `All checks passed.` then the vitest run, all green.
3. No manual step. Nothing a learner can see changes.

## What a senior reviewer would ask

- *Does `db.transaction()` roll back on a JavaScript throw, or only on an SQLite error?* On any throw inside the function. better-sqlite3 issues `ROLLBACK` and rethrows. The test uses a JS-level validation failure to prove it.
- *Isn't the JSON "transaction" a fiction?* In memory it is exact: nothing is mutated until both inputs have validated, and the mutation is synchronous. On disk it depends on J20's atomic write (temp file, fsync, rename). A crash loses the last 250 ms debounce window, and it cannot tear a file.
- *Does this make a double submit safe?* No. A replayed POST is two valid transactions. After J10 the second one is `practice` and cannot move the schedule, but it still writes a row and earns 1 XP. That belongs to F-07 (the client guard in J30, and an idempotency key if it ever matters).

## The junior version of this fix

`db.exec('BEGIN')` before the two calls and `db.exec('COMMIT')` after. It looks right in review. But when `addAttempt` throws, nothing runs `ROLLBACK`: the connection stays inside an open transaction and every later write joins it. A raw `BEGIN` inside `importProfile`'s transaction is also an error. `db.transaction()` rolls back on throw and uses savepoints when nested.

## Follow-ups

- [ ] Idempotency for `POST /answers` (a client-generated attempt id with a unique index), only if double submits are seen after J30's guard → F-07
- [ ] Remove `saveCardState`/`addAttempt` from the public store surface once `check.js` and the tests stop needing them → new entry if done

## Update 2026-09-24

The Verification test passed for the wrong reason. `attemptFields()` runs *before* `db.transaction()` is entered (`recordAnswer: (state, attempt) => recordAnswer(state, attemptFields(attempt))`), so the missing `moduleId` threw before any write and the rollback was never exercised; the senior-reviewer answer above ("the test uses a JS-level validation failure to prove it") is wrong. The review added a second case to the same test: a card for a real profile and an attempt for `no-such-profile`. The card upsert succeeds, the attempt insert fails on the foreign key, and only the transaction can put the card back. The JSON backend accepted that attempt (it has no foreign keys), so its `saveCardState`, `addAttempt` and `recordAnswer` now refuse a profile id that does not exist, before mutating, and a tenth contract case, *a card or an attempt for a profile that does not exist is refused on both backends*, pins the parity.
