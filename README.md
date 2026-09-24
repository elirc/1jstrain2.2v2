# Stack Ready

An interactive upskilling app that takes you from "I can write some JavaScript"
to the knowledge a **mid-level CRUD web developer** is expected to have — and
specifically the knowledge that gets asked about in interviews.

**1,047 questions across 53 modules, 9 tracks and 10 stages**, plus a written
primer for every module, spaced repetition, and a hands-on problem set
alongside it.

No LeetCode. No algorithm puzzles. Every question is either something you will
actually hit while building a CRUD app, or something an interviewer will ask
you about the stack: **JavaScript, TypeScript, React, Node/Express, HTTP & API
design, SQL, C#, ASP.NET Core & EF Core**, plus the craft topics (git, testing,
security, shipping) that separate a junior from a mid.

---

## Quick start

```bash
npm install     # installs the workspace: content, server, client
npm run dev     # API on :3001, app on http://localhost:5173
```

Open http://localhost:5173 and start with Stage 1.

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the API and the app together (this is the one you want) |
| `npm run dev:server` / `npm run dev:client` | Run one half on its own |
| `npm run build` | Type-check and build the client to `client/dist` |
| `npm start` | Production mode: the API serves the built client on one origin (run `npm run build` first) |
| `npm test` | The server and client test suites (vitest) |
| `npm run check` | The everyday gate: content validation, server self-test and tests, client type-check and tests |
| `npm run check:all` | Everything CI runs: lint, format check, `check`, build |
| `npm run check:content` | Validate the curriculum and print the counts (`-- --strict` fails on warnings) |
| `npm run content:stats` | Per-module mix of types and difficulty, and where the answers sit |
| `npm run lint` / `npm run format` | ESLint / Prettier (`lint:fix`, `format:check` for the other half) |
| `npm run drills` | Run the hands-on `jstrain/` problem set (after `npm ci --prefix jstrain`) |

Node 24 (see `.nvmrc`; 22.22.2 or 24.15 at least). Nothing else to configure — the
database creates itself on first run. [CONTRIBUTING.md](CONTRIBUTING.md) has
the rest.

---

## What is in it

### The path — ten stages, in order

| Stage | Covers |
| --- | --- |
| 1 · The language | values and coercion, functions and closures, objects and arrays, prototypes and classes, async, iteration and errors, modules and npm |
| 2 · Types and the browser | TypeScript fundamentals, modelling with unions and generics, TS in a real codebase, type-level TS, the browser platform, CSS and layout, accessibility |
| 3 · React for real apps | the rendering model, state and forms, effects and data fetching, server state and mutations, performance, app structure, Suspense and Server Components |
| 4 · The server side | the Node runtime, Express, auth, HTTP semantics, API design |
| 5 · Data | SQL you will actually write, schema/indexes/transactions/ORMs, window functions and query plans, the database from Node |
| 6 · C#, the language | C# for JS developers, types and exceptions, records and patterns, LINQ and async |
| 7 · ASP.NET Core and EF Core | the request pipeline, DI and config, EF Core, auth, testing |
| 8 · Ship it | git in a team, testing, security, deploying and running it, cloud basics |
| 9 · Run it in production | caching and performance, observability, scaling the database, background jobs, application security in depth |
| 10 · Toward senior | system design, architecture trade-offs, incidents and on-call, code review and technical leadership |

A stage unlocks once you have mastered 35% of the stage it builds on — usually
the one before it; Ship it builds on Data, so .NET is optional. You can
also ignore the path entirely and drill by track — useful when the interview is
on Thursday and it is a .NET shop.

### Every module has a primer

The questions are the test; the primer is the lesson. Each module opens with a
few pages of dense, opinionated writing covering exactly what its questions ask
— the event loop, the four `this` rules, what `AsNoTracking()` costs you, why
`NOT IN` with a NULL returns nothing. Read it, then drill it.

### Six question types

Multiple choice, select-all, true/false, **predict the output**, short answer
and put-these-in-order. Every answer comes back with an explanation, and about
a fifth of them also carry a **"why they ask this"** note — what the interviewer
is really probing for and what the strong version of the answer sounds like.

### Spaced repetition

Answer correctly and the question comes back in a day, then three, then further
out. Get it wrong and it comes back in ten minutes and its future intervals
shrink. **Mastered** means two spaced correct answers, not one lucky guess —
that is what drives module progress and stage unlocking.

The dashboard shows your level, streak, accuracy and what is due; the progress
page adds a six-month activity heatmap, per-track accuracy and your weakest
modules, with a one-click drill for them.

### Code labs

Recall and typing are different skills. `jstrain/` is a test-graded problem set
— **274 problems, 1057 tests** — that pairs with the modules here. The Code labs
page maps each exercise file to the module that teaches it.

```bash
cd jstrain && npm install
npm run watch        # re-runs affected tests as you save
```

---

## How it is built

The app is deliberately built the way its own curriculum says a small CRUD app
should be, so the source is worth reading alongside the modules.

```
content/     the curriculum — plain ESM, imported by both halves, no build step
  tracks.js         tracks and the ten stages
  modules/          53 modules, each with a markdown primer, one file per track or author
  questions/        1,047 questions, one file per track or author
  schema.js         the q() authoring helper, which validates as it builds
  index.js          assembly + validateContent()
  lint.js           authoring rules: problems stop the server, warnings print
  tools/            check.mjs (check:content), stats.mjs (content:stats), permute-choices.mjs (one-off)

server/      Express 5 API
  src/index.js      the only file that reads the environment, opens the store and listens
  src/config.js     configuration and server/.env, validated at boot
  src/app.js        createApp(): the Express app with every dependency injected
  src/routes/       api, profiles, questions (history, flags), settings
  src/validate.js   request validation at the boundary
  src/answer.js     the answer flow: grade → schedule → record → reward
  src/grade.js      answer grading — server-side, always
  src/present.js    strips the key and shuffles the choices of each served question
  src/srs.js        the SM-2-style scheduler
  src/sessions.js   which questions to ask next
  src/progress.js   mastery, stages, streaks, levels
  src/settings.js   per-profile daily goal and session sizes
  src/transfer.js   profile export and import
  src/store.js      SQLite (better-sqlite3) with a JSON-file fallback, versioned schema
  src/check.js      a dependency-free smoke test
  test/             vitest: units, the store contract on both backends, HTTP

client/      React 19 + TypeScript + Vite
  src/lib/          typed API client, app state, shared types, milestones
  src/components/   markdown renderer, syntax highlighter, UI primitives
  src/pages/        roadmap, module, tracks, progress, labs
  src/pages/drill/  the drill: a state-machine hook, question card, choices, feedback
  src/styles/       tokens, base, components, pages
```

[ARCHITECTURE.md](ARCHITECTURE.md) follows a request through these files.

Some choices worth pointing at:

- **Answers never reach the browser.** `publicQuestion()` strips the key, and
  grading happens on the server. The explanation comes back only in the
  response to an attempt. It is the honest way to run a quiz and a working
  example of the rule the security module teaches.
- **One copy of the content.** It is plain ESM with a `types.d.ts`, so the Node
  server imports it directly and the TypeScript client gets full typing from the
  same files. There is no generated JSON to drift.
- **The content validates itself.** `q()` rejects a malformed question at import
  time (an answer index out of range, a missing explanation), and
  `validateContent()` runs at server start-up — a bad edit fails loudly instead
  of showing up as an empty module.
- **No `dangerouslySetInnerHTML`.** The markdown renderer builds React elements,
  so there is no XSS surface in an app that spends a module explaining XSS.
- **A store that always works.** `better-sqlite3` is a native module; if its
  prebuilt binary is unavailable the store falls back to a JSON file with the
  same interface, and `/api/health` reports which backend is live.
- **XP is derived, not stored.** It is recomputed from the attempt log, so it
  cannot drift away from the answers that produced it.

### API

All responses are `{ "data": ... }` or `{ "error": { code, message, details? } }`,
where `code` is one of `invalid_json`, `validation_failed`, `invalid_response`,
`profile_required`, `not_found`, `last_profile`, `payload_too_large`,
`internal_error`, and `details.field` names the offending field. The learner
profile travels as an `x-profile-id` header — this is a local single-user tool,
so that is a "who is sitting here" switch, not authentication. Questions are
served with their choices freshly shuffled; answer with the choice **ids**.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | status, store backend and why a fallback is in use, schema version, content counts |
| GET | `/api/curriculum` | tracks, stages, modules with primers and counts |
| GET | `/api/modules/:id` | one module plus its questions and your state (reps, lapses, flagged) |
| POST | `/api/sessions` | pick questions (`daily`, `review`, `module`, `stage`, `track`, `weak`, `flagged`); each carries a `reason` |
| POST | `/api/answers` | grade an attempt (or `giveUp`), schedule it, return the explanation and the `outcome` |
| GET | `/api/questions/:id` | one question with your state, flag, history, and the answer once you have tried it |
| GET | `/api/attempts` | your recent attempts, newest first (`limit`, `before`, `correct`, `moduleId`) |
| PUT/DELETE | `/api/questions/:id/flag` | flag a question to revisit, with an optional note |
| GET | `/api/flags` | your flagged questions |
| GET/PATCH | `/api/settings` | daily goal, session size, new questions per daily session |
| GET | `/api/progress` | mastery, stages, tracks, streak, level, today's goal, activity |
| POST | `/api/progress/reset` | wipe this profile's history (flags and settings stay) |
| GET/POST/DELETE | `/api/profiles` | multiple learners on one install (the last one cannot be deleted) |
| GET | `/api/profiles/:id/export` | download a profile as JSON (no header needed) |
| POST | `/api/profiles/import` | restore an export as a new profile (up to 10 MB) |

### Configuration

The server reads these from the environment, or from `server/.env` (copy
`server/.env.example`); real environment variables win over the file.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3001` | API port (1–65535) |
| `HOST` | `127.0.0.1` | interface to bind; loopback because there is no authentication |
| `DATA_DIR` | `server/data` | where the database lives; relative paths are relative to `server/` |
| `CORS_ORIGINS` | the Vite ports on `localhost` and `127.0.0.1` | comma-separated allowlist |
| `SERVE_CLIENT` | `true` in production, else `false` | serve `client/dist` from the API (`true`/`false` override) |

In development, Vite proxies `/api` to the server, so the browser only ever
makes same-origin requests and CORS never comes up locally — the same
arrangement production uses.

---

## Adding your own questions

Open the file for the track, find the module's `deck(...)` and add a `q({...})`:

```js
q({
  id: 'js-async-15',              // must be unique across the whole curriculum
  type: 'mcq',                    // mcq | multi | boolean | output | short | order
  d: 2,                           // 1 foundation, 2 junior, 3 mid-level
  prompt: 'What does `Promise.any` resolve with?',
  code: 'await Promise.any([a, b]);',   // optional
  choices: ['The first to settle', 'The first to fulfil', 'All results', 'The last'],
  answer: 1,                      // index into choices
  why: 'The explanation shown after answering. This is the actual teaching.',
  ask: 'Optional: what the interviewer is really checking.',
  tags: ['promises'],
})
```

`npm run check:content` validates it. To add a module, add it to
`content/modules/` with a primer and list it in exactly one stage in
`content/tracks.js` — `validateContent()` enforces both.

---

## Testing

```bash
npm test               # server and client suites (vitest, per workspace)
npm run check          # content + server self-test and tests + client type-check and tests
npm run check:all      # the above, plus lint, format check and a production build
npm run drills         # the jstrain problem set
```

Each workspace owns its tests: `server/test/` runs under
`server/vitest.config.js` (grading, the scheduler, sessions, progress, the store
contract against both backends, and the HTTP API on a real port), and
`client/src/**/*.test.tsx` runs under jsdom from `client/vite.config.ts`
(markdown, the highlighter, the API client, the drill state machine, pages).
`server/src/check.js` stays as the dependency-free smoke test: it exercises
grading, the scheduler, the store, progress and session-building against a
throwaway database, asserts that answer keys never appear in what a session
returns, and is the one check that runs on a production install.

CI (`.github/workflows/ci.yml`) runs lint, format check, `check` and build on
Ubuntu and Windows, requires the SQLite backend to load, and fails if any
answer explanation turns up in the built client bundle. The `jstrain/` reference
solutions are verified by `drills.yml` whenever the problem set changes.

---

## Upskilling journal

`upskilling/` is the companion course to this codebase: a skills ladder, the
architecture decisions (ADRs) with their costs, walkthroughs of each subsystem,
exercises, and a journal with one entry per significant change — what broke,
the options, what was chosen and how it was verified. Start at
[`upskilling/README.md`](upskilling/README.md). Contributions that change
behaviour add a journal entry; see [CONTRIBUTING.md](CONTRIBUTING.md).
