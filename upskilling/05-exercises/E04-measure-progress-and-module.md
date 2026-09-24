# E04: Measure `/progress` and `/modules/:id`

Level: senior · Timebox: 2 h · Touches: server
Ladder: B08, B01 · Depends on: J14 (XP over all history), J22 (the N+1 that did not matter)

## Scenario

A learner with a year and a half of daily use says the dashboard "takes a second to show up". J22 measured `buildProgress` at 390 ms for 10k attempts and 4.4 s for 100k on a loaded machine, left it alone on purpose, and wrote a trigger: *"a median over 250 ms on an unloaded machine, or a profile over 50k attempts."* Your job is to find out whether that trigger has fired, with numbers you would put your name to.

**The premise, stated correctly.** Only `/progress` grows with the attempt log: since J14 it replays every attempt through `schedule()` (`replayXp` over `store.listAttempts(profileId)`). `GET /modules/:id` reads card states by primary key and never touches `attempts`. Measure both, and expect them to behave differently. Timing the module route at 200k attempts and calling it slow would teach a false lesson.

## Deliverables

1. A seed script, kept in your branch under `server/scripts/`, that creates a profile in a scratch `DATA_DIR` and writes 0, 10k and 50k attempts spread over 18 months through `store.recordAnswer()`, with a seeded PRNG. It must not touch `server/data/`.
2. A table: median and p95 of 30 requests for each endpoint at each size, measured over HTTP against `npm start` with `DATA_DIR` set, on an otherwise idle machine. Include Node version, OS and CPU.
3. A `node --cpu-prof` profile of `/progress` at 50k, and the top three self-time functions.
4. `EXPLAIN QUERY PLAN` for the statements each endpoint runs.
5. A decision of at most 300 words: has J22's trigger fired, and what, if anything, you changed. If you change code, include before and after numbers from the same machine.

## Constraints

- XP must stay correct: no window, no cap (J14). Any change keeps `server/test/progress.test.js` green unchanged.
- No new dependency. Measure first; do not optimise before the table exists.

## Starting points

- `server/src/progress.js › buildProgress()`, `server/src/srs.js › replayXp()` (working tree)
- `server/src/routes/api.js › GET /modules/:id` and `GET /progress` (working tree)
- `server/src/store.js › listAttempts` and the v2 index `idx_attempts_profile_question` (working tree)
- The J22 numbers and its trigger, in `../04-journal/J22-measuring-before-optimising.md` › Verification

## Done when

- The table, the profile summary, the query plans and the decision exist as one Markdown file.
- The seed script runs with one command and prints what it wrote.
- `npm run check -w server` passes on your branch.

## Stretch

J22 names two fixes: a lean replay (numbers, no ISO strings) and a stored per-attempt XP. Prototype the lean replay and say how far it moves the trigger.

<details><summary>Reviewer notes (open after attempting)</summary>

**A strong answer** reports that `/modules/:id` is flat from 0 to 50k (sub-millisecond per lookup, as J22 found) and that `/progress` is linear in history. It reads the trigger literally: 50k attempts is the boundary, not "over", so the size clause has not fired, and the decision rests on the unloaded median. The profile shows where the time goes, typically `schedule()`, `Date` parsing of `answeredAt` and the day-key grouping, rather than SQLite. The query plan shows `SEARCH attempts USING INDEX idx_attempts_profile_date`, so the index is not the problem. If it changes code, the change is the lean replay, and `progress.test.js` proves XP did not move.

**Common mistake:** seeding with raw `INSERT`s that bypass `recordAnswer`, so card states and attempts disagree, and measuring through `buildProgress` in the same process as the seed, while the page cache is warm and the timer includes JIT warm-up. A second one: reporting a mean over five runs.

**What a senior also flags:** 50k attempts is about five years of 25 answers a day. The exercise is to decide whether to spend effort, and "not yet, here is the new trigger" is a complete answer. A stored XP column would need a migration (E03) and would reintroduce the drift ADR-0004 was written to avoid.
</details>
