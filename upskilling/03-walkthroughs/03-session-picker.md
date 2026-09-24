# Walkthrough 03: the session picker

Files: `server/src/sessions.js`, `server/src/present.js`, `server/test/sessions.test.js`, `server/test/helpers.js` · As of: the working tree after the 2026-09-24 refactor (baseline `6f1bf43`) · Time: ~40 min · Read first: walkthrough 02

"Before" quotes are anchored at `6f1bf43`. "After" quotes come from the working tree, which is not committed yet, so they carry plain paths and no SHA.

## The job in one sentence

Given a profile's card states, a mode and a size, choose which questions to ask and in what order. Tag each one with why it was chosen, and hand it out with the key stripped and the choices shuffled.

## The contract

- **In:** `{ store, profileId, mode, moduleId?, stageId?, trackId?, size, newPerDay, now, rng }`. `size` arrives already validated: `POST /api/sessions` runs `int(body.limit, 'limit', { min: MIN_LIMIT, max: MAX_LIMIT, optional: true })`, and when that is absent it falls back to the profile's `sessionSize`.
- **Out:** `{ mode, moduleId, stageId, trackId, requested, available, questions, empty?, nextDueAt }`. Each question is `presentQuestion(q, rng)` plus `reason: 'due' | 'relearn' | 'new' | 'practice'`.
- **Invariant 1:** no question id appears twice in one session, for every `rng`.
- **Invariant 2:** in `daily`, due cards come first, most overdue first. While unseen cards exist, `reserve = min(unseen, max(1, min(newPerDay, floor(size / 4))))` places go to new cards.
- **Invariant 3:** a module, stage or track session has `min(size, scope)` questions. It is topped up with practice rather than coming back short.
- **Invariant 4:** given the store, `now` and `rng`, the output is deterministic. Only choice order uses `rng`.
- **Invariant 5:** an unknown module, stage or track is `404 not_found`, and a missing id is `400 validation_failed`.

## Read it in this order

1. `server/src/sessions.js › pickDaily (L83–106 @ 6f1bf43)`. The bug, so you know what the rewrite had to prevent.
2. `server/src/sessions.js › buildSession` (working tree). It resolves the mode into `scope` and `pool`, then dispatches.
3. `server/src/sessions.js › pickDaily` (working tree). The `take()` closure and the four loops.
4. `server/src/sessions.js › pickOrdered`, `byDueAt`, `reasonFor` and `nextDueAt` (working tree).
5. `server/src/present.js › presentQuestion`. The only randomness that is left.
6. `server/test/sessions.test.js`. Every case runs under `describe.each(backends)`.

## The lines worth stopping at

**Two shuffles of one list.**
`server/src/sessions.js › pickDaily (L91–104 @ 6f1bf43)`
```js
  const reviewShare = Math.min(due.length, Math.ceil(size * 0.5));
  const out = [...shuffle(due).slice(0, reviewShare)];
  // …
  for (const q of shuffle(due).slice(reviewShare)) {
```
The head of one permutation plus the tail of another is not a partition. The last loop only runs once the unseen cards run out, so the duplicate shows up only for learners who have worked through everything (F-05, J07). The same function capped reviews at half the session, so the backlog grew every day (M-08, J17). And `server/src/sessions.js › shuffle (L141–148 @ 6f1bf43)` called `Math.random()` itself, so no test could pin either bug (F-09).

**Uniqueness is structural now, not implied.**
`server/src/sessions.js` (working tree):
```js
  const take = (q) => {
    if (out.length < size && !taken.has(q.id)) {
      out.push(q);
      taken.add(q.id);
    }
  };

  for (const q of due.slice(0, size - reserve)) take(q);
  for (const q of unseen.slice(0, reserve)) take(q);
  for (const q of due) take(q);
  for (const q of unseen.slice(0, newCap)) take(q);
```
Every bucket goes through `take`, so the next bucket someone adds cannot bring a duplicate back. The set holds ids, not objects. J07's "junior version" explains why that matters: `presentQuestion` returns fresh objects, and an identity check on them would pass every duplicate. The third loop is meant as the top-up: "when fewer new cards exist than the reserve, give the places back to due cards". But `reserve` is already `min(unseen.length, …)`, so the second loop always fills its share, and the third loop can never add anything. A brute-force check over every size from 1 to 40, 0–45 due, 0–45 unseen and six `newPerDay` values finds no case where removing it changes the output. Opinion: keep it. It costs nothing, and it keeps the function correct if someone later drops the `min(unseen.length, …)`. But the comment should say that it is a guard, not a top-up.

**Sorting replaced shuffling.** `byDueAt` sorts on the ISO string (`localeCompare`), which works because every `dueAt` is UTC ISO with the same format. Since J10, due dates are day-granular (local midnight), so many cards tie. `Array.prototype.sort` is stable, so ties come out in curriculum order. That makes sessions deterministic, and it is also why two sessions in a row with nothing answered are identical (J07, trade-off).

**`scope` and `pool` are different sets.** In `review`, `pool` is only the due cards, but `nextDueAt` looks at `scope`, which is the whole curriculum. That is how an empty review can still say "next review at 17:00". If you merge the two, the empty-review message loses its time.

**`reasonFor` is the learner's explanation, computed from state alone.**
```js
export function reasonFor(state, now) {
  if (state.attempts === 0) return 'new';
  if (isDue(state, now)) return state.reps === 0 ? 'relearn' : 'due';
  return 'practice';
}
```
It is derived from the card, not from the loop that picked it, so a mastered top-up in a module session reads `practice` wherever it came from. The client uses it for the "extra practice" badge (J30), and `practice` is also what the server will record (J10).

**The only randomness left is choice order.** `presentQuestion(q, rng)` shuffles choices with Fisher–Yates over a copy. For `order` questions it re-draws up to ten times, then rotates by one, so the served order is never the answer, even with a degenerate `rng`. `rng` is threaded as `createApp({ rng }) → createApiRouter → buildSession → presentQuestion`, defaulting to `Math.random`. Tests pass `mulberry32(seed)` from `server/test/helpers.js`.

**Validation moved out.** At the baseline, `server/src/sessions.js › DEFAULT_LIMIT (L15–23 @ 6f1bf43)` clamped `Number(limit) || DEFAULT_LIMIT`, so `limit: "abc"` quietly became 12 and `limit: 999` became 40. Now the route rejects anything that is not an integer from 1 to 40, and `buildSession` trusts `size`. Errors use `httpError` with the shared codes. The baseline's private `server/src/sessions.js › badRequest (L154–159 @ 6f1bf43)` emitted `bad_request` (F-29, J13).

## Observe it

From the repo root of this tree:

1. The daily mix with a 30-card backlog, 12 places and `newPerDay: 10`:
   ```sh
   node --input-type=module -e "
   const { buildSession } = await import('./server/src/sessions.js');
   const { emptyCardState } = await import('./server/src/store.js');
   const { curriculum } = await import('@jstrain/content');
   const now = new Date(2026, 2, 2, 12);
   const due = curriculum.questions.slice(-30);
   const states = due.map((q, i) => ({ ...emptyCardState('p', q.id), attempts: 1, correct: 1, reps: 1, intervalDays: 1,
     dueAt: new Date(now - (i + 1) * 3600e3).toISOString() }));
   const store = { listCardStates: () => states };
   const s = buildSession({ store, profileId: 'p', mode: 'daily', size: 12, newPerDay: 10, now });
   console.log(s.questions.map((q) => q.reason).join(' '));
   const hours = s.questions.filter((q) => q.reason === 'due')
     .map((q) => Math.round((now - new Date(states.find((x) => x.questionId === q.id).dueAt)) / 3600e3));
   console.log('due, hours overdue:', hours.join(','));
   let dup = 0;
   for (let r = 0; r < 200; r++) {
     const ids = buildSession({ store, profileId: 'p', mode: 'daily', size: 40, now }).questions.map((q) => q.id);
     if (new Set(ids).size !== ids.length) dup++;
   }
   console.log(dup, 'of 200 sessions contain a duplicate');"
   ```
   Output:
   ```
   due due due due due due due due due new new new
   due, hours overdue: 30,29,28,27,26,25,24,23,22
   0 of 200 sessions contain a duplicate
   ```
   Nine due cards (12 − a reserve of 3), oldest first. At the baseline, J17 measured 6 due, shuffled, and J07 measured 17 duplicates in 200 runs.
2. The suite: `cd server && npx vitest run test/sessions.test.js` prints `Tests  23 passed (23)`: 11 cases × 2 backends, plus the `limit` parsing case.
3. The top-up: *module session is topped up to the limit with extra practice from mastered cards* in the same file. At the baseline this returned 1 question.

## What is still wrong here

- J17 follow-up: `newPerDay` counts per daily session, not per calendar day. Several sessions a day each get their reserve. The name overpromises.
- J07 follow-up: there is no variety within a big backlog. Ties on the same due day always come out in curriculum order. A seeded shuffle among same-day cards is the proposed fix; there is no entry yet.
- J17 reviewer note: `newPerDay: 0` still serves one new card (`max(1, …)`). It is pinned by a test so any change is deliberate, but it is arguable.
- `stage` sessions ignore unlocking by design (J17). That is a decision, not a bug. Say so if someone files it.
- Found while writing this walkthrough, and in no register row yet: the `pickDaily` doc comment promises a top-up ("Any room left is topped up with more due cards") that the third loop cannot perform, and a learner with a few due cards and a low `newPerDay` gets a daily session well short of `size` (Do it 1). Both need an owner to decide whether they are bugs or documentation.

## Do it

1. (5 min) By hand: 3 due cards, 20 unseen, nothing else seen, `size` 12, `newPerDay` 2. Write down `reserve`, `newCap` and the session's length. Then check it by changing the Observe 1 snippet. (It is shorter than 12. Decide whether that is a bug or the setting doing its job, and find the test that says which.)
2. (15 min) Prove that the third loop (`for (const q of due) take(q);`) is a no-op. Write the argument in two sentences from the definition of `reserve`. Then delete the loop on a scratch branch, run the suite, and write the comment you would put there instead.
3. (20 min) Make `newPerDay` a per-day cap. Count today's `new`-outcome attempts with `store.listAttempts(profileId, startOfLocalDay(now).toISOString())` and subtract them from `newCap`, but keep `reserve >= 1` while unseen cards exist. Add a case to `sessions.test.js` that runs two sessions in one day, answering the new cards of the first in between. Prove it on both backends.

## Check yourself

1. Why is a `Set` of ids safer here than `out.includes(q)`?
2. With 30 due, 2 unseen, `size` 12 and `newPerDay` 10, what are `reserve`, and the reason sequence?
3. Which part of a served session still varies between two identical calls, and why is that on purpose?
4. Why does `buildSession` no longer clamp `limit` itself?
5. An empty `review` session says "Next review tomorrow". Which variable makes that possible?

<details><summary>Answers</summary>

1. `includes` compares object identity. It works only while the curriculum hands out the same object each time, and `presentQuestion` copies. Ids are the contract (ADR-0014).
2. `reserve = min(2, max(1, min(10, 3))) = 2`. Ten due (most overdue first), then two new: `due ×10, new ×2`.
3. Choice order, through `rng`. A stable order is a position a learner can memorise (J12, J07 reviewer answer).
4. Validation belongs at the boundary (B06). A silent clamp hid bad input, and the route now answers `400 validation_failed` with `details.field: 'limit'`.
5. `nextDueAt`, computed over `scope` (the whole curriculum in `review`), not over `pool`.

</details>
