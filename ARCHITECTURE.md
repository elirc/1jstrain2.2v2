# Architecture

One page on how Stack Ready fits together. The README says what the app does;
[CONTRIBUTING.md](CONTRIBUTING.md) says how to work on it; the walkthroughs in
[`upskilling/03-walkthroughs/`](upskilling/03-walkthroughs/README.md) trace each
part line by line.

## Three workspaces, one direction of dependency

```
content/  (@jstrain/content)  plain ESM curriculum + answer keys + validation
   ▲                 ▲
   │ values          │ types only (import type), enforced by ESLint
server/           client/
Express 5 API     React 19 + TypeScript + Vite
   ▲                 │
   └──── /api ───────┘  same origin: Vite proxies in dev, the API serves client/dist in prod
```

- **`content/`** is data plus the rules for it. No build step: the server imports
  it as ESM, the client gets its types from `types.d.ts`. It holds every answer
  key, which is why the client may import only types from it (ADR-0001, ADR-0002).
- **`server/`** owns grading, scheduling and persistence. It is the only code
  that ever sees an answer key.
- **`client/`** renders what the API returns and never decides whether an
  answer is right.
- **`jstrain/`** (the problem set) and `marketplace/` are separate packages,
  outside the workspaces, with their own lockfiles (ADR-0013).

## The request lifecycle

`server/src/index.js` is the only file that touches the outside world: it loads
`server/.env` (`process.loadEnvFile`), validates configuration
(`config.js › readConfig`), runs `validateContent()`, opens the store, calls
`createApp()` and listens on `127.0.0.1`. Shutdown is in `lifecycle.js`.

`app.js › createApp({ store, config, contentReport, now, rng })` builds the
Express app with every dependency passed in, so tests run a real app on port 0
with a temp store, a movable clock and a seeded random source. Order: CORS, the
10 MB parser for profile import, the 64 kB JSON parser, `/api/health`, the
routers in `routes/` (`api.js`, `profiles.js`, `questions.js`, `settings.js`),
the static client in production, a JSON 404, and one error translator
(`toErrorResponse`). Every response is `{ data }` or `{ error: { code, message,
details? } }`; codes come from the allowlist in `errors.js`.

A drill, end to end:

1. `POST /api/sessions` → `sessions.js` picks questions for the mode (daily,
   review, module, stage, track, weak, flagged); `present.js` strips the key with
   `publicQuestion()` and shuffles the choices with the injected `rng`.
2. The client (`pages/drill/useDrillSession.ts`, a reducer-driven state machine)
   shows them; the learner answers with **choice ids**, never indices (ADR-0014).
3. `POST /api/answers` → `validate.js` checks the body at the boundary →
   `answer.js` runs grade (`grade.js`) → schedule (`srs.js`) → record (one store
   transaction for the card and the attempt) → reward, and returns the
   explanation, the outcome and the new card state.
4. The client refreshes progress (`GET /api/progress`, computed by
   `progress.js`) and `lib/milestones.ts` diffs the two snapshots for level-ups
   and unlocked stages.

## The content pipeline

`content/schema.js › q()` turns the terse authored shape (choices as strings,
answer as an index) into the stored shape (choice ids `<questionId>-c<n>`) and
throws on anything malformed at import time. `deck()` stamps module and track.
`content/index.js` concatenates the per-author files in `modules/` and
`questions/` and exports `validateContent()`: structural checks (every module in
exactly one stage, stage gates point backwards, tracks agree) plus
`lint.js › lintContent()`, whose *problems* stop the server from booting and
whose *warnings* print. The same function backs `npm run check:content`;
`content/tools/stats.mjs` reports the tells the warnings watch.

## The store

`store.js › createStore()` opens SQLite through `better-sqlite3` (an optional
native dependency) with a versioned schema (`PRAGMA user_version`, migrations,
ADR-0017). Only when the binary cannot be **loaded** does it fall back to a JSON
file with the same interface, and `/api/health` reports the backend and why
(ADR-0003, ADR-0018). Data lives in `server/data/` (ignored). XP and level are
derived from the attempt log, never stored (ADR-0004). Profiles are a header
(`x-profile-id`), not authentication (ADR-0006), which is safe because the API
binds to loopback.

## Spaced repetition

`srs.js` is a trimmed SM-2 (ADR-0009): a correct answer pushes the next review
out (1 day, then 3, then by ease), a wrong one brings it back in minutes and
lowers the ease. Mastery is two spaced correct answers. A correct answer before
the card is due is practice: it earns XP but does not advance the schedule
(ADR-0015). Streaks and due dates are calendar-day logic in local time.

## Where tests live

| Area | Where | Runner |
| --- | --- | --- |
| Server unit and HTTP tests | `server/test/*.test.js` | vitest, `server/vitest.config.js` |
| Server smoke test | `server/src/check.js` | plain Node, no dependencies |
| Client components, hooks, pages | `client/src/**/*.test.{ts,tsx}` | vitest + jsdom, `client/vite.config.ts` |
| Content rules | `validateContent()` at boot and in `check:content`; `server/test/content.test.js` | — |
| Answer keys stay out of the bundle | `eslint.config.js`; `.github/scripts/answer-key-leak.mjs` in CI | ESLint, Node |

Layout and reasons: ADR-0016. CI (`.github/workflows/ci.yml`) runs lint,
format, `check`, build and the bundle check on Ubuntu and Windows; `drills.yml`
verifies `jstrain/` when it changes.

## Further reading

- [`upskilling/README.md`](upskilling/README.md): the learning path through this codebase.
- [`upskilling/02-adrs/`](upskilling/02-adrs/README.md): every decision above, with its cost and its revisit trigger.
- [`upskilling/03-walkthroughs/`](upskilling/03-walkthroughs/README.md): request lifecycle, scheduler, session picker, store, content pipeline, drill state machine.
- [`upskilling/04-journal/`](upskilling/04-journal/INDEX.md): what changed, why, and how it was verified.
