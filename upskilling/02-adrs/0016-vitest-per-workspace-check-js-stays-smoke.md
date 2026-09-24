---
id: ADR-0016
title: Vitest per workspace; check.js stays the smoke test
status: accepted
date: 2026-09-24
amended-by: []
superseded-by: []
---

# ADR-0016: Vitest per workspace; `check.js` stays the smoke test

Status: accepted · Date 2026-09-24 · Supersedes ADR-0012
Written with J01, at the time of the decision
Anchors: `package.json › "check" (L18 @ 6f1bf43)`, `server/src/check.js › dependency-free smoke test (L1–5 @ 6f1bf43)`, `server/vitest.config.js › pool` (working tree), `client/vite.config.ts › test` (working tree)

## Context
The server had one dependency-free script (ADR-0012) and the client had no tests. The refactor needed hundreds of assertions with isolation, fixtures, an injectable clock and two store backends. The server and client are different environments: the server needs a separate process per suite because `better-sqlite3` is native and Windows will not delete an open database file; the client needs jsdom and a setup file. The client's tests read a generated file, `client/src/labs.generated.json`, that an npm `pretest` hook rebuilds. The DX plan and its review both proposed one vitest at the repository root with `test.projects`; the planned title of this ADR was "Vitest at the root".

## Decision
We run vitest inside each workspace that has tests, with that workspace's own config, and the root only fans out: `npm test` is `npm run test --workspaces --if-present`. Both workspaces pin `vitest ^5.0.1`, so npm hoists one copy. `server/src/check.js` stays as the dependency-free smoke test; it runs before the server suite in `npm run check -w server` and is never ported into vitest.

## Evidence
`server/vitest.config.js › pool` (working tree)
```js
    include: ['test/**/*.test.js'],
    pool: 'forks',
    env: { TZ: 'America/Los_Angeles' },
```
`server/package.json › check` (working tree): `"check": "node src/check.js && vitest run"`.
`client/package.json › pretest` (working tree): `"pretest": "node scripts/labs-index.mjs"`.
`package.json › test` (working tree): `"test": "npm run test --workspaces --if-present"`.

Enforced by CI: `.github/workflows/ci.yml` runs `npm run check`, which runs the content check, `check.js`, the server suite, the client type-check and the client suite. `npm ls vitest` shows one `vitest@5.0.1`, deduped across `client` and `server`.

## Consequences
- Good: each suite is configured next to the code it tests, and `npm test -w server` means exactly what it says. The client's `pretest` hook runs every time, from the root or from the workspace.
- Good: `check.js` still runs on a production install (`npm ci --omit=dev`), which is the one place that proves the native SQLite binary loads where the app will run.
- Cost: no single watch UI or merged coverage report across workspaces. Two `test:watch` terminals instead.
- Cost: `npm run check:all` runs the server suite once (via `check`); `npm test` is a separate command, so a contributor who runs both runs it twice.
- Forces on future work: a new workspace with tests adds its own `test` script and config; the root picks it up with no edit. A shared test helper cannot live in one workspace and be imported by another without becoming a package.

## Alternatives rejected
- **Root `vitest.config.js` with `projects`** (dx §2, review §6.14). It works with these configs as-is, but a root `vitest run` bypasses the client's `pretest`, so a stale `labs.generated.json` would be tested; fixing that means moving the generator into a `globalSetup`, which ties the test runner to the build. By the time tooling landed, both workspaces already had working configs, so the root layer only added indirection.
- **Port `check.js` into vitest.** It would need dev dependencies to run, which removes the production-install check, and at the baseline its mastery assertion pinned a bug (J10).
- **Node's built-in `node:test`.** Dependency-free, but no jsdom story for the client, and two runners in one repo is worse than one.

## Breaks first at
Workspace count. With three or more tested workspaces, or a need for cross-workspace coverage, the fan-out stops being simpler than a root `projects` config. Then add the root config, move `labs-index.mjs` into a `globalSetup`, and keep the workspace configs as the project entries.

## Revisit when
- A third workspace gains tests (`content/` is the likely one), or
- someone asks for one coverage report across the app, or
- vitest drops support for a vite config as a project entry.
