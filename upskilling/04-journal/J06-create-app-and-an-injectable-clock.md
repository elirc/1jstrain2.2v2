---
id: J06
title: Separate createApp() from listen(), and inject the clock
area: server
closes: [F-09]
ladder: [B10]
adrs: [0007 unchanged]
status: landed
---

# Separate createApp() from listen(), and inject the clock

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-09 (the clock half; J07 closes the randomness half) · Ladder B10 · ADRs 0007 unchanged

## Symptom

At the baseline nothing above the pure functions can be tested. Importing `server/src/index.js` reads the environment, opens `server/data/progress.db`, creates a profile and binds port 3001, all at module load. A test that wants to ask "does a correct answer tomorrow count as a rep?" over HTTP would have to wait until tomorrow. `buildSession` and `buildProgress` already accept a `now`, but no route passes one.

You can see it with `grep -n "new Date()" server/src/routes/api.js server/src/store.js` at `6f1bf43`. There are four hits: the module view, the answer route and both `createProfile`s. Each one reads the wall clock where a decision is made.

## Root cause

`server/src/routes/api.js › new Date (L116–119 @ 6f1bf43)`
```js
    const now = new Date();
    const before = store.getCardState(profileId, question.id);
    const { correct, reason } = grade(question, response);
    const after = schedule(before, correct, now);
```

`server/src/index.js › app.listen (L87–89 @ 6f1bf43)` runs at import time, in the same file that builds the middleware:
```js
const server = app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
});
```

The invariant: *every time-dependent decision in a request (due, practice, streak, XP, created-at) reads one injected clock, and the app can be built without opening a port or a file it was not given.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing; test only `srs`/`progress`/`sessions` as pure functions | Nothing | The pure functions are already testable. But the bugs this refactor fixes live in the seams: the route passing `now`, the store stamping `createdAt`, the error middleware. |
| B | supertest against an `app` exported from `index.js` | A dev dependency, and importing still opens the real store | It still boots the real process on import, and it adds a dependency the plan says not to add. |
| C | `vi.useFakeTimers({ now })` in tests | Nothing in `src/` | It freezes `setTimeout` too, which the JSON store's debounce and SQLite's busy timeout depend on. It also hides the real problem: the routes read the wall clock. |
| D | `createApp({ store, config, contentReport, now, rng })` in `app.js`; `index.js` only wires and listens; tests use `listen(0)` and `fetch` | ~120 lines moved, 0 dependencies | Explicit dependencies, a real HTTP stack in tests, and no global mocking. **Chosen.** |

## Decision and trade-off

I chose D. `now` is a function, not a `Date`, so each request reads it once and a test can move it between requests. There is no global clock module (server review R2). The clock travels as an argument: `createApp` passes it to the routers, the routers pass it into `buildSession`, `buildProgress`, `submitAnswer` and `store.createProfile(name, now)`. The cost is a longer parameter list at the edges, and every future route has to remember to call `now()` instead of `new Date()`. Nothing enforces that yet. I will add a lint rule banning `new Date()` without arguments in `server/src/routes` and `server/src/answer.js` if a bare one slips through review again.

## The change

A new file, `server/src/app.js` (`createApp`, `toErrorResponse`). `server/src/index.js` is now about 60 lines: load config, validate content, open the store, create the default profile, `createApp`, `listen`, shutdown (J21). The routers take `{ store, now, rng }`. `server/src/config.js` holds `readConfig(env)`, so it can be tested with a plain object. `server/test/helpers.js` has `startServer()` (port 0, returns `api(method, path, opts)`) and `makeClock()` with `set` and `advance`.

After, `server/src/app.js` (working tree):
```js
export function createApp({ store, config, contentReport, now = () => new Date(), rng = Math.random }) {
```

After, `server/src/routes/api.js` (working tree), in `POST /answers`:
```js
    res.json({
      data: submitAnswer({ store, profileId, question, response: body.response,
        elapsedMs: body.elapsedMs, giveUp, now: now() }),
    });
```

## Verification

1. `server/test/http.test.js` › `HTTP API on sqlite` / `on json` › *xp from /progress equals the sum of xpEarned, including practice, give-ups and answers over a year old*. It starts a server on a clock set to January 2025, answers 60 times while advancing the clock by up to four days, advances another 500 days and reads `/progress`. At the baseline this test cannot be written: `createApp` does not exist, and the routes would stamp every answer with today's date.
2. `npm run check -w server` passes, and the HTTP suite runs 42 cases (19 per backend, plus the config and SPA cases) with no port conflicts, because every server binds port 0.
3. Manual: `PORT=3997 DATA_DIR=<scratch> npm start -w server` boots, and `/api/health` answers.

## What a senior reviewer would ask

- *Why not pass a `Date` into `createApp`?* A fixed `Date` would make every request in a test happen at the same instant. A function lets `clock.advance(DAY)` sit between two requests.
- *Does morgan or Express use the injected clock?* No, and they should not. Only domain decisions (due, streak, XP, timestamps written to the store) read `now()`. Log timestamps stay real.
- *Is `index.js` itself tested?* Only by the boot smoke test in Verification step 3 and by `check.js`. Its logic is now small enough that I accept that. `readConfig` and `createApp` carry the behaviour, and both have tests.

## The junior version of this fix

`export const app = express()` at the bottom of `index.js`, with `if (process.env.NODE_ENV !== 'test') app.listen(...)`. It looks like the textbook answer, and it passes review. But importing the module still opens `server/data/progress.db`, the real database, from the test runner. It still creates a "Me" profile there. And the routes still call `new Date()`, so the test that matters (a correct answer tomorrow) still cannot be written.

## Follow-ups

- [ ] Lint rule: no argument-less `new Date()` in `server/src/routes/**` and `server/src/answer.js` → J04 (tooling) or a new entry
