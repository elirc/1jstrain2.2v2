---
id: J18
title: Fall back to JSON only when the binary is missing
area: server
closes: [M-03]
ladder: [B16, B03]
adrs: [0018 new, 0003 amended]
status: landed
---

# Fall back to JSON only when the binary is missing

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes M-03 · Ladder B16, B03 · ADRs 0018 (new), which amends 0003

## Symptom

A learner starts the app and every answer they ever gave is gone. Against a scratch copy of `6f1bf43`, with a `progress.db` that is not a database:

```
[store] better-sqlite3 unavailable (file is not a database); using the JSON file store instead.
backend, profiles → ["json", 0]            expected: an error naming progress.db
rm progress.db    → EPERM                  (the failed handle is still open)
```

The warning blames the native module, which loaded fine. `index.js` then creates a fresh "Me" profile. Everything the learner does next goes into `progress.json`, which the next healthy boot never reads. The corrupt file cannot even be moved aside on Windows while the server runs.

The review found a second path to the same result, and it is the *intended* one. If `better-sqlite3` really fails to load (a Node upgrade before `npm rebuild`), a week of work lands in `progress.json`. After the rebuild, SQLite is back and the week is invisible.

## Root cause

`server/src/store.js › createStore (L259–268 @ 6f1bf43)`
```js
export async function createStore({ dataDir }) {
  try {
    const { default: Database } = await import('better-sqlite3');
    return createSqliteStore(Database, path.join(dataDir, 'progress.db'));
  } catch (err) {
    console.warn(
      `[store] better-sqlite3 unavailable (${err.message.split('\n')[0]}); using the JSON file store instead.`,
    );
    return createJsonStore(path.join(dataDir, 'progress.json'));
```

One `try` wraps two different failures: "the module is missing", for which the fallback was designed, and "the database is broken", for which falling back is data loss that looks like a fresh install. The invariant: *the JSON store is used only when `better-sqlite3` cannot be imported; any other failure stops the boot and names the file.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | A rare trigger with a total-loss experience. That is the worst combination. |
| B | Inspect SQLite error codes (`SQLITE_NOTADB`, `SQLITE_CORRUPT`…) and fall back for the rest | A list | Whack-a-mole, and a read-only `DATA_DIR` or a full disk would still silently fall back. |
| C | Split the `try`: fall back on import failure only; on open failure close the handle and throw an error that names the file and says "move it aside"; report the reason on `/api/health`; warn about a stranded `progress.json` | ~40 lines | **Chosen**, recorded as ADR-0018. |
| D | C, plus importing `progress.json` into an empty SQLite database automatically | ~30 more lines | Worth doing, but it writes into the learner's database on its own initiative. Deferred (review item 22). |

## Decision and trade-off

I chose C. A corrupt database now stops the server with a message like `[store] could not open …\progress.db: file is not a database. Move that file aside (or restore a backup such as progress.db.bak-v1 next to it) and start again.` That is a worse first minute than silently starting fresh, and a much better week. `createStore` takes an injectable `loadSqlite`, so the fallback path, which normally runs only on broken machines, runs in every test run. `/api/health` gains `storeFallbackReason`. When SQLite loads and a `progress.json` with attempts exists, the boot log says how many answers are stranded there. What I gave up: an automatic merge (D) and a UI for either message. Revisit when a learner reports stranded answers. D is the answer then.

## The change

`server/src/store.js › createStore` separates `loadSqlite()` from `createSqliteStore()`. `createSqliteStore` wraps open, pragmas and migration in one `try` that closes `db` and rethrows with the path and a remedy (`{ cause }` keeps the original). `warnAboutStrandedJson()` is new. `server/src/app.js` reports `storeFallbackReason`.

After, `server/src/store.js` (working tree):
```js
  let Database;
  try {
    ({ default: Database } = await loadSqlite());
  } catch (err) {
    const reason = `better-sqlite3 could not be loaded (${String(err?.message ?? err).split('\n')[0]})`;
    // … warn, open the JSON store, set store.fallbackReason = reason …
  }
  const store = await createSqliteStore(Database, dbFile);
```

## Verification

1. `server/test/store.test.js` › `SQLite open, fallback and migration` › *a corrupt progress.db makes createStore throw naming the file; it does not silently fall back*. It also asserts that `fs.rmSync(file)` succeeds afterwards, which proves the handle was closed. At the baseline: backend `json`, 0 profiles, `EPERM`.
2. *falls back to JSON only when better-sqlite3 cannot be loaded, and says why* injects a rejecting loader (`Module did not self-register`), expects `backend: 'json'` and the reason, then opens the same directory normally and gets SQLite.
3. `server/test/http.test.js` › */api/health reports the backend, schema version and why a fallback is in use*.

## What a senior reviewer would ask

- *Is a second server instance (`SQLITE_BUSY`) now a boot failure?* No. The review reproduced two instances on one directory: WAL allows it, and both open. `busy_timeout = 3000` covers brief write contention.
- *What if the newer-schema check fires?* It is an open failure like any other: a clear error, no fallback (J19).
- *Why log the stranded JSON rather than fail?* It is not corrupt, just elsewhere. Failing would block a learner who deliberately moved back to SQLite.

## The junior version of this fix

Move `createSqliteStore(...)` out of the `try` and leave it at that. Corrupt files now throw, which passes the first test. But the half-opened `Database` handle is never closed. On Windows the learner cannot move the file aside while the process is alive, which is exactly what the error message tells them to do. And the error says only "file is not a database", without saying which file.

## Follow-ups

- [ ] One-time import of a stranded `progress.json` into an empty SQLite database → new entry (review item 22)
- [ ] Client: show `storeFallbackReason` in a banner → client backlog
