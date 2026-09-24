---
id: ADR-0003
title: Store progress in SQLite, with a JSON file as the fallback
status: accepted
date: 2026-09-23
amended-by: [ADR-0018]
superseded-by: null
---

# ADR-0003: Store progress in SQLite, with a JSON file as the fallback

Status: accepted, amended by ADR-0018 (fall back only when the binary is missing, written with J18) · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `server/src/store.js › createStore (L1–9, L259–269 @ 6f1bf43)`, `server/package.json › optionalDependencies (L18–20 @ 6f1bf43)`, `server/src/index.js › storeBackend (L51 @ 6f1bf43)`

## Context
The app runs on the learner's own machine, often Windows. `better-sqlite3` is a native module, and its prebuilt binary is missing for some Node versions and platforms. The data is one learner's quiz history, where losing the last few answers is annoying but not a disaster. An app that will not start is a disaster, because the learner simply leaves.

## Decision
We use SQLite through the synchronous `better-sqlite3` driver as the real store, declared as an optional dependency. If loading it fails, we fall back to a JSON file with the same interface and report which backend is live on `/api/health`.

## Evidence
`server/src/store.js › createStore (L259–269 @ 6f1bf43)`
```js
  try {
    const { default: Database } = await import('better-sqlite3');
    return createSqliteStore(Database, path.join(dataDir, 'progress.db'));
  } catch (err) {
    console.warn(
      `[store] better-sqlite3 unavailable (${err.message.split('\n')[0]}); using the JSON file store instead.`,
    );
    return createJsonStore(path.join(dataDir, 'progress.json'));
```
`server/src/check.js` runs against whichever backend loads, so the fallback is **not enforced** by any test (register F-13; J20 adds a contract suite over both backends).

## Consequences
- Good: `npm install && npm run dev` works even where the native build fails.
- Good: synchronous calls fit one local user. No pool, no `await` in handlers, and statements in one tick cannot interleave.
- Cost: the `try` wraps the open as well as the import. A corrupt, locked or read-only `progress.db` therefore boots an **empty** JSON store, and the next healthy boot never reads what was written there (server B4, register M-03). That is a bug inside a decision, and ADR-0018 narrows the fallback to the import.
- Cost: there are two implementations to keep in parity, and they have drifted. `getProfile` returns the live object in JSON (L210). The JSON flush is not atomic. The exit hook outlives `close()` (server ST1/ST2/ST4, F-13).
- Cost: the schema is `CREATE TABLE IF NOT EXISTS` with no version (F-11; ADR-0017).

## Alternatives rejected
- **SQLite only.** Some learners would get a failed install with a C++ toolchain error.
- **JSON only.** It rewrites the whole file on every flush, has no transactions and no indexes, and the heatmap query becomes a full scan.
- **An async driver (`sqlite3`, `node:sqlite`).** `node:sqlite` does not exist on Node 20, which is the `engines` floor (`package.json`). Opinion: it is the likely replacement for the native module.

## Breaks first at
Learners per install. With a few concurrent users, synchronous statements block the event loop while they run, and the JSON store's whole-file write is unacceptable. At product scale this becomes a server database with an async pooled driver and real migrations.

## Revisit when
- `/api/health` reports `json` on a machine where the binary exists. That is M-03, and J18 addresses it.
- The Node floor reaches a version where `node:sqlite` is stable. The native dependency can then go.
