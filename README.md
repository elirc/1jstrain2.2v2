# Stack Ready

An interactive upskilling app that takes you from "I can write some JavaScript"
to the knowledge a **mid-level CRUD web developer** is expected to have — and
specifically the knowledge that gets asked about in interviews.

**434 questions across 31 modules and 9 tracks**, plus a written primer for
every module, spaced repetition, and a hands-on problem set alongside it.

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
| `npm start` | Production mode: the API serves the built client on one origin |
| `npm run check` | Server self-test (40 assertions) + client type-check |
| `npm run check:content` | Validate the curriculum and print the counts |
| `npm run drills` | Run the hands-on `jstrain/` problem set |

Node 20+. Nothing else to configure — the database creates itself on first run.

---

## What is in it

### The path — seven stages, in order

| Stage | Covers |
| --- | --- |
| 1 · The language | values and coercion, functions and closures, objects and arrays, async, modules and npm |
| 2 · Types and the browser | TypeScript fundamentals, modelling with unions and generics, TS in a real codebase, the browser platform |
| 3 · React for real apps | the rendering model, state and forms, effects and data fetching, performance, app structure |
| 4 · The server side | the Node runtime, Express, auth, HTTP semantics, API design |
| 5 · Data | SQL you will actually write, schema/indexes/transactions/ORMs |
| 6 · C# and .NET | C# for JS developers, types and exceptions, LINQ and async, ASP.NET Core, DI and config, EF Core |
| 7 · Ship it | git in a team, testing, security, deploying and running it |

A stage unlocks once you have mastered a third of the one before it. You can
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
  tracks.js         tracks and the seven stages
  modules/          31 modules, each with a markdown primer
  questions/        434 questions, one file per track
  schema.js         the q() authoring helper, which validates as it builds
  index.js          assembly + validateContent()

server/      Express 5 API
  src/store.js      SQLite (better-sqlite3) with a JSON-file fallback
  src/srs.js        the SM-2-style scheduler
  src/grade.js      answer grading — server-side, always
  src/sessions.js   which questions to ask next
  src/progress.js   mastery, stages, streaks, levels
  src/routes/api.js the routes
  src/check.js      a dependency-free self-test

client/      React 19 + TypeScript + Vite
  src/lib/          typed API client, app state, shared types
  src/components/   markdown renderer, syntax highlighter, UI primitives
  src/pages/        roadmap, module, drill, tracks, progress, labs
```

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

All responses are `{ "data": ... }` or `{ "error": { code, message } }`. The
learner profile travels as an `x-profile-id` header — this is a local
single-user tool, so that is a "who is sitting here" switch, not authentication.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | status, store backend, content counts |
| GET | `/api/curriculum` | tracks, stages, modules with primers and counts |
| GET | `/api/modules/:id` | one module plus its questions and your state |
| POST | `/api/sessions` | pick questions (`daily`, `review`, `module`, `stage`, `track`, `weak`) |
| POST | `/api/answers` | grade an attempt, schedule it, return the explanation |
| GET | `/api/progress` | mastery, stages, tracks, streak, level, activity |
| POST | `/api/progress/reset` | wipe this profile's history |
| GET/POST/DELETE | `/api/profiles` | multiple learners on one install |

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3001` | API port |
| `DATA_DIR` | `server/data` | where the database lives |
| `CORS_ORIGINS` | the two Vite ports | comma-separated allowlist |
| `SERVE_CLIENT` | `true` in production | serve `client/dist` from the API |

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
npm run check          # server self-test + client type-check
npm run check:content  # curriculum validation and counts
npm run drills         # the jstrain problem set
```

`server/src/check.js` exercises grading, the scheduler, the store, progress and
session-building against a throwaway database, and asserts that answer keys
never appear in what a session returns.
