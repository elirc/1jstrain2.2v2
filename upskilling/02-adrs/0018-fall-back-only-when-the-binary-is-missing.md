---
id: ADR-0018
title: Fall back to JSON only when the binary is missing
status: accepted
date: 2026-09-23
amends: [ADR-0003]
supersedes: null
---

# ADR-0018: Fall back to JSON only when the binary is missing

Status: accepted, amends ADR-0003 · Date 2026-09-23 · Written with J18
Anchors: `server/src/store.js › createStore (L259–268 @ 6f1bf43)`

## Context
ADR-0003 keeps a JSON store so that the app starts where `better-sqlite3` cannot load. At the baseline one `try` wrapped both the import and the open, so a corrupt, locked or read-only `progress.db` also "fell back". It booted an empty store, a fresh default profile appeared, and the learner's history looked deleted (M-03). The failed handle stayed open, so on Windows the file could not even be moved aside. The intended fallback has its own trap: a week spent on JSON after a Node upgrade is invisible once SQLite loads again.

## Decision
We fall back to the JSON store **only** when importing `better-sqlite3` fails. Any failure after that (opening, pragmas, migrating, a newer schema) closes the handle and throws an error that names the file and tells the learner to move it aside or restore a backup. The boot stops. `/api/health` reports `storeFallbackReason` (a string, or `null`). When SQLite is in use and a `progress.json` with attempts exists next to it, the boot log says how many answers are stranded there. The loader is injectable, so tests exercise the fallback.

## Evidence
`server/src/store.js` (working tree), `createStore`:
```js
  try {
    ({ default: Database } = await loadSqlite());
  } catch (err) {
    // fall back, recording why
  }
  const store = await createSqliteStore(Database, dbFile);
```
Enforced by `server/test/store.test.js` › *a corrupt progress.db makes createStore throw naming the file; it does not silently fall back* (which also removes the file afterwards, proving the handle closed) and *falls back to JSON only when better-sqlite3 cannot be loaded, and says why*.

## Consequences
- Good: a damaged database can no longer look like a fresh install.
- Good: the fallback path runs on every test run, not only on broken machines.
- Cost: a corrupt file now stops the server. The learner has to act, guided by the message.
- Cost: answers stranded in `progress.json` are reported, not merged.
- Forces on future work: new open-time steps (pragmas, migrations) belong inside the same `try` that closes the handle.

## Alternatives rejected
- **Fall back on selected SQLite error codes.** It is a list that is never complete, and it keeps the silent-loss shape for everything not on it.
- **Automatically import `progress.json` into SQLite.** Deferred: it writes into the learner's database unasked. It is the natural next step.
- **Remove the fallback.** ADR-0003's reason, a working install everywhere, still holds.

## Breaks first at
Machines where the native binary routinely fails to load. Stranded JSON history then becomes common, and the automatic import is needed.

## Revisit when
- A learner reports answers missing after `npm rebuild`.
- `node:sqlite` is stable on the Node floor, and the native module and this fallback can both go.
