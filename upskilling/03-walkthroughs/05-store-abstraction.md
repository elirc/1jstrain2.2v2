# Walkthrough 05: the store abstraction

Files: `server/src/store.js`, `server/test/store.test.js`, `server/test/helpers.js` · As of: the working tree after the 2026-09-24 refactor (baseline `6f1bf43`) · Time: ~50 min · Read first: walkthrough 01

"Before" quotes are anchored at `6f1bf43`. "After" quotes come from the working tree, which is not committed yet, so they carry plain paths and no SHA. The store file is being reformatted as you read this, so the "after" quotes carry no line numbers.

## The job in one sentence

Give the rest of the server one persistence interface, backed by SQLite when the native module loads and by a JSON file when it does not. Open, upgrade and close either one without losing a learner's history, and fail loudly when losing it is the only other option.

## The contract

- **Interface (both backends):** `listProfiles`, `getProfile`, `createProfile`, `deleteProfile`, `getCardState`, `listCardStates`, `saveCardState`, `addAttempt`, `recordAnswer`, `listAttempts`, `queryAttempts`, `resetProgress`, `getFlag`, `listFlags`, `setFlag`, `deleteFlag`, `getSettings`, `saveSettings`, `importProfile` and `close`, plus the fields `backend`, `schemaVersion`, `file` and `fallbackReason`.
- **Invariant 1:** every read returns a copy. Mutating a result never changes the store.
- **Invariant 2:** `recordAnswer(state, attempt)` writes both rows or neither, on both backends.
- **Invariant 3:** the JSON backend is used only when `better-sqlite3` cannot be imported. Any other open failure throws an error that names the file, and closes the handle.
- **Invariant 4:** a file carries its schema version (`PRAGMA user_version` or `schemaVersion`). Older files are upgraded in order, once, after a backup. Newer files are refused.
- **Invariant 5:** `close()` is idempotent, leaves no `-wal`/`-shm` files and no `exit` hook, and makes later writes throw.
- **Invariant 6:** attempts have the same shape on both backends: a stable, increasing `id`, a `gaveUp` flag, no `profileId`, and `id` as the tiebreak on equal timestamps.

## Read it in this order

1. `server/src/store.js › createStore (L259–268 @ 6f1bf43)`. One `try` that could not tell two failures apart.
2. `server/src/store.js › createStore` (working tree). `loadSqlite` is injectable, and the `try` covers only the import.
3. `server/src/store.js › migrate`, `V1_SQL`, `V2_SQL` and `MIGRATIONS` (working tree).
4. `server/src/store.js › createSqliteStore` (working tree). The open-or-close `try`, then the statements.
5. `server/src/store.js › createJsonStore` and `readJsonFile` (working tree). Recovery, `mutate`, the atomic `flush`.
6. `server/test/helpers.js › backends`, then `server/test/store.test.js`.

## The lines worth stopping at

**The fallback that ate a corrupt database.**
`server/src/store.js › createStore (L259–268 @ 6f1bf43)`
```js
  try {
    const { default: Database } = await import('better-sqlite3');
    return createSqliteStore(Database, path.join(dataDir, 'progress.db'));
  } catch (err) {
```
The import and the open share one `catch`. A `progress.db` that is not a database was blamed on the native module, and the app booted an empty JSON store. The half-open handle kept the file locked on Windows (M-03, J18). The working tree separates the two:
```js
  let Database;
  try {
    ({ default: Database } = await loadSqlite());
  } catch (err) {
    // The one failure that justifies the fallback: the native module is not
    // there (or was built for another Node). Everything else is thrown below.
```
`createSqliteStore` then wraps the open, the pragmas and `migrate` in its own `try`. On failure it calls `db?.close()` and rethrows with the path, a remedy and `{ cause: err }`. `loadSqlite` defaults to `() => import('better-sqlite3')`, and a test passes a rejecting one. That is B10 applied to a failure path: the fallback now runs on every test run, not only on broken machines.

**One integer is the schema version.**
```js
  for (let v = version; v < SCHEMA_VERSION; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
```
`MIGRATIONS[n − 1]` takes a file from `n − 1` to `n`. The DDL and the version bump commit together, so a crash leaves the last complete version, never a half-migrated file that claims to be finished. Three details matter:

- `version === 0 && hasTables` means a 1.0 file from before versioning, so it is treated as v1. `V1_SQL` stays `IF NOT EXISTS` so it is harmless on such a file. `V2_SQL` is not idempotent (`ALTER TABLE`), and `user_version` is what guarantees it runs once.
- `db.backup()` writes `progress.db.bak-v<from>` before the first migration of an existing file. It is WAL-safe, unlike copying the file. That is why `createSqliteStore` became `async`.
- `journal_mode = WAL` runs before `migrate`, because WAL cannot be switched inside a transaction.

At the baseline the only mechanism was `server/src/store.js › CREATE TABLE IF NOT EXISTS (L54–92 @ 6f1bf43)`, which does nothing to an existing table (F-11, J19).

**The JSON store is a contract, not a sketch.** At the baseline, `server/src/store.js › getProfile (L210 @ 6f1bf43)` returned `data.profiles.find(...)`, the live object. And `server/src/store.js › flush (L188–203 @ 6f1bf43)` wrote in place and registered an `exit` hook that nothing removed (F-13, J20). Now every mutation goes through one gate:
```js
  const mutate = (fn) => {
    if (closed) throw new Error('[store] the store is closed');
    const result = fn();
    scheduleFlush();
    return result;
  };
```
`flush` writes a temp file, fsyncs it, copies the current file to `.bak`, then renames the temp file over the target. It copies rather than renames the old file so the target always exists. On load, `readJsonFile` checks the shape, tries `.bak` if the main file fails, and keeps a `.corrupt-<ts>` copy. A newer `schemaVersion` sets `err.newer`, and that error is rethrown rather than recovered from.

**"Validate, then mutate" is the JSON store's transaction.** `recordAnswer` runs `attemptFields(attempt)`, `cardFields(state)` and `requireProfile` for both rows before `mutate` touches `data`. `requireProfile` is the JSON stand-in for SQLite's foreign key. Without it, a card for a deleted profile would succeed on one backend and fail on the other (J20 Update, J08 Update).

**`cardFields` is a whitelist.** `schedule()` adds `outcome` to the state it returns (J10). Both backends persist named fields only, so `outcome` never reaches a column or the JSON file. Spread `state` straight into storage and the JSON backend starts saving `outcome` while SQLite silently drops it: exactly the drift the contract suite exists to catch.

**One suite, two backends.** `server/test/helpers.js` exports `backends = [['sqlite', make], ['json', make]]`, and the store, answer, progress, session and HTTP suites all run under `describe.each(backends)`.

## Observe it

1. The contract suite: `cd server && npx vitest run test/store.test.js` prints `Tests  29 passed (29)`. That is 10 contract cases × 2 backends, 4 JSON recovery and migration cases, and 5 SQLite open, fallback and migration cases.
2. Upgrade a 1.0 file, then show the fallback and the corrupt-file error. From the repo root:
   ```sh
   cd server && node --input-type=module -e "
   import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
   import Database from 'better-sqlite3';
   import { createStore } from './src/store.js';
   const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sr-obs-'));
   const dir = tmp(), file = path.join(dir, 'progress.db');
   const v1 = new Database(file);
   v1.exec(\`CREATE TABLE profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE card_states (profile_id TEXT NOT NULL, question_id TEXT NOT NULL, reps INTEGER NOT NULL DEFAULT 0,
     lapses INTEGER NOT NULL DEFAULT 0, ease REAL NOT NULL DEFAULT 2.5, interval_days REAL NOT NULL DEFAULT 0,
     due_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0,
     last_answered_at TEXT, PRIMARY KEY (profile_id, question_id));
    CREATE TABLE attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id TEXT NOT NULL, question_id TEXT NOT NULL,
     module_id TEXT NOT NULL, track_id TEXT NOT NULL, correct INTEGER NOT NULL, elapsed_ms INTEGER, answered_at TEXT NOT NULL);
    INSERT INTO profiles VALUES ('p1', 'Ada', '2026-01-01T00:00:00.000Z');
    INSERT INTO attempts (profile_id, question_id, module_id, track_id, correct, answered_at)
     VALUES ('p1', 'js-values-1', 'js-values', 'js', 1, '2026-01-01T10:00:00.000Z');\`);
   console.log('before: user_version', v1.pragma('user_version', { simple: true }));
   v1.close();
   const store = await createStore({ dataDir: dir });
   console.log('after:', store.backend, 'schema v' + store.schemaVersion, JSON.stringify(store.listAttempts('p1')));
   store.close();
   console.log('files:', fs.readdirSync(dir).join(', '));
   const json = await createStore({ dataDir: tmp(), loadSqlite: async () => { throw new Error('Module did not self-register'); } });
   console.log('fallback:', json.backend, '|', json.fallbackReason);
   json.close();
   fs.writeFileSync(file, 'not a database');
   try { await createStore({ dataDir: dir }); } catch (e) { console.log('corrupt:', e.message.split('\n')[0]); }"
   ```
   Output (temp paths shortened to `<tmp>`):
   ```
   before: user_version 0
   [store] upgraded progress.db from schema v1 to v2 (backup: <tmp>\progress.db.bak-v1)
   after: sqlite schema v2 [{"id":1,"questionId":"js-values-1","moduleId":"js-values","trackId":"js","correct":true,"gaveUp":false,"elapsedMs":null,"answeredAt":"2026-01-01T10:00:00.000Z"}]
   files: progress.db, progress.db.bak-v1
   [store] better-sqlite3 could not be loaded (Module did not self-register); using the JSON file store instead.
   fallback: json | better-sqlite3 could not be loaded (Module did not self-register)
   corrupt: [store] could not open <tmp>\progress.db: file is not a database
   ```
   Note what is missing from `files`: no `-wal` and no `-shm`, because `close()` checkpoints with `TRUNCATE`.
3. Try the same thing with **only** the `profiles` table in the v1 file. The open fails with `could not open …: no such table: attempts`, because `hasTables` checks for `profiles` alone and then runs V2's `ALTER TABLE attempts`. The error names the file and nothing is lost, so the contract holds. It is still worth knowing that the "is this a 1.0 file?" test is one table deep.

## What is still wrong here

- J18 follow-up: answers stranded in `progress.json` after a fallback run are reported at boot (`warnAboutStrandedJson`) but not imported. There is no entry yet.
- J18 follow-up: `storeFallbackReason` is in `/api/health`, but the client shows no banner.
- J19 follow-up: `.bak-v*` backups accumulate. Pruning is planned for when v4 lands.
- J20 follow-up: there is no retry on `EPERM` during the JSON rename if antivirus holds the file on Windows. It has not been observed.
- J19 trade-off: migrations are forward-only. A downgrade is refused, and the backup is the only way back. The first migration that rewrites rows needs a dry run on a copy.
- Observe 3: the pre-versioning detection checks one table. Nothing in the register covers this yet. It fails safe.

## Do it

1. (5 min) List which invariant each of the three failures in Observe 2 exercises, and what a learner would see in each case at the baseline.
2. (15 min) In `store.test.js`, find the case that would have caught the baseline `getProfile`. Say why it fails on one backend only, and why that is the strongest argument for `describe.each`.
3. (20 min) Write migration v3 on a scratch branch: `ALTER TABLE attempts ADD COLUMN outcome TEXT`, with `SCHEMA_VERSION = 3`, the matching JSON upgrade in `readJsonFile`, and a test that opens a v2 file built by the v2 code path, then asserts `user_version` 3, a `.bak-v2`, and that the data survived. Then compare your change with exercise E03 and ADR-0017.

## Check yourself

1. Which failure is allowed to trigger the JSON fallback, and where is that decided?
2. Why do the DDL and `user_version = n` run in one transaction?
3. Why does `flush` copy the old file to `.bak` instead of renaming it?
4. What does the JSON backend do instead of a foreign key, and which test proves the two backends agree?
5. What does a v2 build do with a file whose `user_version` is 3?

<details><summary>Answers</summary>

1. Only a failed `loadSqlite()`, in `createStore`. Everything after it (open, pragmas, migrate) throws with the file name.
2. So a crash leaves the file at the last complete version. Otherwise the file could hold v2 tables while claiming v1, and the next boot would re-run a non-idempotent `ALTER`.
3. A rename would leave a moment with no `progress.json` at all. Copying first means the target always exists, and the final rename is atomic on one volume.
4. `requireProfile`, called before `mutate`. *A card or an attempt for a profile that does not exist is refused on both backends*.
5. It refuses to open it ("written by a newer version of the app") and does not fall back to JSON.

</details>
