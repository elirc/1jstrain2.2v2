---
id: J22
title: Measure before optimising - the N+1 that did not matter
area: server
closes: [F-04]
ladder: [B08]
adrs: [0004 unchanged]
status: landed
---

# Measure before optimising - the N+1 that did not matter

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43) · Short form

## Symptom

`GET /modules/:id` looks like an N+1: `server/src/routes/api.js › getCardState (L78–79 @ 6f1bf43)` runs one lookup per question. I measured before touching it (SQLite, a 14-question module, times per call, on a heavily loaded machine, so compare rows rather than absolute values):

```
attempts in the DB            0        10k        100k
14 × getCardState          0.50 ms   0.57 ms    0.69 ms
1 × listCardStates         2.68 ms   4.50 ms    2.95 ms
buildProgress (/progress)  5.3 ms    390 ms     4,404 ms
```

## Root cause

There is none for F-04. Fourteen primary-key point lookups in-process cost half a millisecond, and `attempts` rows are not in that query, so history size does not move it. The swap I had already made "for consistency" (one `listCardStates` scan) was **five times slower**, because it reads every card to use 14. I reverted it and left a comment with these numbers.

What does grow is `/progress`. After J14 it replays the whole attempt log through `schedule()`. On the same machine at 10k attempts, the baseline's windowed loop took 133–141 ms and the new code takes about 460 ms: **3.5x slower**, and linear in history. I left it alone on purpose: 10k attempts is a year of 25 answers a day, and correct XP (J14) is worth 300 ms once per session.

## Verification

1. The numbers above come from a throwaway script against `createStore` + `buildProgress` in a temp directory, and a baseline run against `6f1bf43` extracted to a scratch directory. Neither is committed.
2. `server/test/http.test.js` › *flags: PUT is an idempotent upsert …* covers `/modules/:id` after the revert.
3. Trigger to revisit `/progress`: a median over 250 ms on an unloaded machine, or a profile over 50k attempts. The fix then is a lean replay (numbers, no ISO strings), or a stored per-attempt XP (J14 follow-up).
