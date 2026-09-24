---
id: J01
title: Pin what is true before changing it
area: tooling
closes: [F-23]
ladder: [B09, B03]
adrs: [0012 superseded by 0016, 0016 new]
status: landed
---

# Pin what is true before changing it

Date 2026-09-24 · Author Claude (tooling implementer) · Area tooling · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-23 (in part: the test layout and the stale assertion count; CI is J05) · Ladder B09, B03 · ADRs 0012 superseded by 0016, 0016 new

## Symptom
At the baseline, "the tests pass" meant one script. `npm run check` printed 37 `ok` lines from `server/src/check.js`, then ran `tsc --noEmit` on the client. The client had no tests at all. The README said "Server self-test (40 assertions)" and the script's header said CI ran it; there were 37 and there was no CI. Worse, one of the 37 asserted a bug: two correct answers at the same instant counted as mastery (register F-01, fixed in J10). Refactoring the server against that suite would have kept the bug green.

## Root cause
`package.json › "check" (L18 @ 6f1bf43)`
```json
"check": "npm run check -w server && npm run typecheck -w client",
```
`server/src/check.js › isMastered (L69–73 @ 6f1bf43)`
```js
  state = schedule(state, true, now);
  check('first correct schedules one day out', state.intervalDays === 1);
  check('one correct answer is not mastery', !isMastered(state));
  state = schedule(state, true, now);
  check('second correct answer reaches mastery', isMastered(state));
```
The same `now` twice. The invariant a test should hold is the opposite: *a second correct answer before the card is due does not advance it.* A suite whose only job is "stay green" cannot tell a pinned behaviour from a pinned bug, so the first move was to decide which behaviours were facts and which were defects, before anyone changed code.

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing: keep `check.js` as the only test | Nothing now | It cannot isolate cases, inject a clock or run two backends, and it asserts F-01. |
| B | Port `check.js` into vitest one-for-one, then refactor | A day | Enshrines F-01 in the new suite, and the port needs dev dependencies, which loses the production-install check. |
| C | One vitest at the root with `test.projects` (the dx plan and its review) | A root config and a client config | Works, but a root `vitest run` skips the client's `pretest` hook that regenerates `labs.generated.json`. |
| D | Vitest per workspace; `check.js` stays as the smoke test, with the F-01 assertion corrected rather than ported | Two configs, one fan-out script | chosen |

## Decision and trade-off
I chose D, recorded as ADR-0016. The server and client implementers had already wired vitest 5 into their workspaces by the time I got here, each with a config that fits its environment: `server/vitest.config.js` runs a fork per file (native module, temp files) with `TZ=America/Los_Angeles` so the DST tests mean the same thing on every machine; the `test` block in `client/vite.config.ts` runs jsdom with a setup file. A root `projects` config would have been a third file that re-describes those two and bypasses `pretest`. I withdrew it. What I gave up: a single watch UI and one merged coverage report. Revisit when a third workspace gains tests or someone asks for cross-workspace coverage.

## The change
Root `package.json` scripts, about ten lines:

```json
"test": "npm run test --workspaces --if-present",
"typecheck": "npm run typecheck -w client",
"check": "npm run check:content && npm run check -w server && npm run typecheck -w client && npm run test -w client",
"check:content": "node content/tools/check.mjs",
"check:all": "npm run lint && npm run format:check && npm run check && npm run build",
```

`npm run check -w server` is `node src/check.js && vitest run`: the smoke test first, then the suite. `check.js` keeps its role from ADR-0012 and no longer pins F-01; J10 changed its mastery check to answer a day later and added "a second correct answer the same minute is only practice". The README drops the assertion count and describes the per-workspace layout.

## Verification
1. `npm ls vitest` shows one `vitest@5.0.1`, deduped under `client` and `server`.
2. `npm run check`, 1 min 42 s on the Windows dev box: `0 warning(s)` from the content check, `All checks passed.` from `check.js` (39 `ok` lines), server `Tests  152 passed | 3 todo (155)`, client `Tests  70 passed (70)`.
3. `md5sum client/src/labs.generated.json` is identical before and after, and the hook printed `labs-index: counts unchanged.`, so running the gate does not dirty the tree.

## What a senior reviewer would ask
- *Why not delete `check.js` now that there are 222 vitest tests?* It is the only check that runs without dev dependencies, so it is the only proof that `better-sqlite3` loads on a production install.
- *Does `check:all` run the server suite twice?* No: `check:all` runs `check`, which runs it once. Running `npm test` as well would repeat it, which is why `check:all` does not call `npm test`.
- *What stops the counts drifting again?* Nothing in the docs states a count any more; CI output is the source.

## The junior version of this fix
Add `vitest.config.js` at the root with three projects because the plan said so, and run `vitest run` from `check`. Every test passes, and the client's tests now read whatever `labs.generated.json` happened to be on disk, because nothing ran the generator.

## Follow-ups
- [ ] `check.js` honours `REQUIRE_SQLITE=1` (three lines, dx review §6.6) → phase-2 tooling commit or the server owner
- [ ] A `content/` test suite for `lintContent()` fixtures → next content tooling pass

## Update 2026-09-24
The first follow-up landed in phase 2: `server/src/check.js` checks `sqlite backend is active (REQUIRE_SQLITE=1)` when the variable is set, and its header now says CI sets it. `REQUIRE_SQLITE=1 npm run check:all` prints `ok   sqlite backend is active (REQUIRE_SQLITE=1)` and 40 `ok` lines in total.
