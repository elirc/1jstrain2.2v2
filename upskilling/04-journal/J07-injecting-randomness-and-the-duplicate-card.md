---
id: J07
title: Inject randomness, and stop the daily mix serving a card twice
area: server
closes: [F-05, F-09]
ladder: [B10, B02]
adrs: []
status: landed
---

# Inject randomness, and stop the daily mix serving a card twice

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-05, F-09 (with J06) · Ladder B10, B02 · ADRs none

## Symptom

A daily session can contain the same question twice. When the duplicates are adjacent, the client reuses the answered `QuestionCard` (client B12), so the learner sees a card that is already marked and cannot answer it.

Reproduction at `6f1bf43`, against a scratch copy: mark every question as learned and overdue, then ask for 200 daily sessions of 12.

```
runs with a duplicate / 200: 17        expected: 0
```

The test for it could not be deterministic, because the code under test called `Math.random()` itself.

## Root cause

`server/src/sessions.js › pickDaily (L91–104 @ 6f1bf43)`
```js
  const reviewShare = Math.min(due.length, Math.ceil(size * 0.5));
  const out = [...shuffle(due).slice(0, reviewShare)];
  for (const q of unseen) { /* … */ }
  for (const q of shuffle(shaky)) { /* … */ }
  for (const q of shuffle(due).slice(reviewShare)) {
    if (out.length >= size) break;
    out.push(q);
  }
```

`shuffle(due)` runs twice and produces two different permutations. The first loop takes the head of one, and the last loop takes the tail of the other, and nothing stops them overlapping. The last loop runs only once the unseen cards run out, so a new learner never sees the bug. It shows up for exactly the learner who has worked through the content. `server/src/sessions.js › shuffle (L141–148 @ 6f1bf43)` reads `Math.random()` directly (F-09).

The invariant: *a session never contains the same question id twice*, and it holds for every seed.

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | It only affects learners with no unseen cards left, which is rare today. But those are the most committed users, and the doubled content will get there too. |
| B | `[...new Map(out.map(q => [q.id, q])).values()]` at the end | 1 line | It removes the symptom and silently shortens the session. The double shuffle stays, and so does the untestable `Math.random`. |
| C | Shuffle `due` once and slice the same array twice (review suggestion) | 2 lines | It fixes this duplicate. But the next bucket added to the function can reintroduce it, because uniqueness is still implied rather than enforced. |
| D | One `take()` that checks a `taken` set; due cards sorted by `dueAt` (J17), not shuffled; the only randomness left is choice order in `present.js`, with `rng` injectable from `createApp` down | ~20 lines | Uniqueness is structural, and every random draw goes through a parameter. **Chosen.** |

## Decision and trade-off

I chose D, together with J17's reordering. Sorting due cards by how overdue they are removed the only reason sessions needed randomness at all. The randomness that remains, the order of choices within a question, now comes from `rng`, which defaults to `Math.random` and is threaded `createApp({ rng }) → buildSession({ rng }) → presentQuestion(q, rng)`. Sessions are therefore deterministic given the store and the clock. The trade-off is that two daily sessions in a row with nothing answered in between contain the same questions in the same order. That is the point of "most overdue first", and the choices still reshuffle. I will revisit if learners ask for variety within a large due backlog. A seeded shuffle among cards with the same due day would do it.

## The change

`server/src/sessions.js`: `pickDaily` is rebuilt around a `take()` closure with a `taken` set, and the `shaky` bucket is gone (after J10 it would be pure practice). `server/src/present.js` is new: `presentQuestion(question, rng)` and `shuffle(items, rng)`. `server/test/helpers.js` exports `mulberry32(seed)`, six lines, which every property test uses with the seed in its name.

After, `server/src/sessions.js` (working tree):
```js
  const take = (q) => {
    if (out.length < size && !taken.has(q.id)) {
      out.push(q);
      taken.add(q.id);
    }
  };
```

## Verification

1. `server/test/sessions.test.js` › `buildSession on sqlite` / `on json` › *daily: no duplicates; due cards most overdue first; new cards reserved even with a big backlog*. At the baseline the equivalent loop finds a duplicate in 17 of 200 runs.
2. `server/test/content.test.js` › *an order question is never served already in the correct order, even with a degenerate rng* runs `presentQuestion` with `() => 0` and `() => 0.999999`. That is only possible because `rng` is a parameter.
3. `npm run check -w server` is green.

## What a senior reviewer would ask

- *Is `Math.random` good enough to shuffle choices?* Yes. This is presentation, not security. A learner who could predict the V8 PRNG could also read the network response.
- *Why not seed the rng per profile and day, so a reload shows the same order?* Because a fresh order on every serve is the contract (J12). A stable order is a position a learner can memorise.
- *Does threading `rng` through three layers leak a test concern into production code?* It is one defaulted parameter per function, and no production caller passes it. The alternative is global mocking (`vi.spyOn(Math, 'random')`), which reaches into dependencies too.

## The junior version of this fix

`if (!out.includes(q)) out.push(q)` inside the last loop only. It fixes the reproduction, and it reads well in review. But `out.includes` compares object identity, which only works because `curriculum.questions` hands out the same object each time. The first refactor that maps questions to fresh objects (`presentQuestion` does exactly that) quietly brings the duplicate back.

## Follow-ups

- [ ] If variety within a big backlog is wanted: a seeded shuffle among cards due on the same local day → new entry
