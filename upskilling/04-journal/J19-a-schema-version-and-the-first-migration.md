---
id: J19
title: Add a schema version and the first migration
area: server
closes: [F-06, F-11]
ladder: [B04]
adrs: [0017 new]
status: landed
---

# Add a schema version and the first migration

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-06, F-11 · Ladder B04 · ADRs 0017 (new)

## Symptom

There was no way to change the database. Flags, settings and give-ups (J38–J40) need two tables and a column. At `6f1bf43` the only mechanism is `CREATE TABLE IF NOT EXISTS`, which does nothing to an existing table, so `attempts` would never gain `gave_up` and the first insert naming it would fail. Nothing records a file's version, so a build cannot tell a 1.0 file from a future one.

To see it at the baseline, run `sqlite3 server/data/progress.db "PRAGMA user_version"` → `0`. The file carries no version.

F-06: `idx_card_states_due` serves no query. Card states are read by `profile_id` or `(profile_id, question_id)`, both covered by the primary key, so it only costs writes.

## Root cause

`server/src/store.js › CREATE TABLE IF NOT EXISTS (L54–92 @ 6f1bf43)`, abridged:
```js
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles ( … );
    CREATE TABLE IF NOT EXISTS card_states ( … );
    CREATE TABLE IF NOT EXISTS attempts ( … );
    CREATE INDEX IF NOT EXISTS idx_attempts_profile_date
      ON attempts (profile_id, answered_at);
    CREATE INDEX IF NOT EXISTS idx_card_states_due
      ON card_states (profile_id, due_at);
  `);
```

The persisted shape is a contract with every file already on disk (B04), and this code has no way to renegotiate it. The invariant: *a file's schema version is recorded in the file; the build upgrades older files in order, once, after a backup; and it refuses newer ones.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing; add new tables with `IF NOT EXISTS` and avoid new columns | Nothing now | It works for tables, never for a column. `gave_up` would need a side table forever. |
| B | A `schema_version` table (server plan §5.1) | ~20 lines | It needs bookkeeping ("empty table means v1"), and the version lives in a row a bad migration could itself corrupt. |
| C | `PRAGMA user_version`, a list of migrations, `db.backup()` before the first one, refuse newer versions | ~40 lines | One integer in the file header, no table, and it is transactional. CONTRACT.md §13. **Chosen**, recorded as ADR-0017. |
| D | A migration library | A dependency | Two migrations do not justify one. |

## Decision and trade-off

I chose C. `MIGRATIONS[n − 1]` takes a file from n − 1 to n, in one transaction with `PRAGMA user_version = n`, so a crash leaves the last complete version. `user_version = 0` *with* a `profiles` table is a 1.0 file, treated as v1; V1 stays `IF NOT EXISTS`. Before the first migration of an existing file, `db.backup()` (WAL-safe, unlike a file copy) writes `progress.db.bak-v<from>`. `journal_mode = WAL` runs first, because it cannot run inside a transaction.

v2, per contract §13, adds `question_flags`, `profile_settings`, `attempts.gave_up` and `idx_attempts_profile_question` for per-question history (J41). It also drops `idx_card_states_due`, which the contract did not list. I added it because the measurement (J22) and the query audit agree it is dead, and a migration is the only place to remove it.

The JSON store mirrors this: `schemaVersion`, refusing newer files, and stable `attempts[].id` (backfilled as index + 1, then a counter).

What it costs: migrations are forward-only; a downgrade is refused, and the backup is the way back. Revisit when a migration must rewrite rows rather than add structure: that one needs a dry run on a copy first.

## The change

`server/src/store.js`: `SCHEMA_VERSION = 2`, `V1_SQL`, `V2_SQL`, `MIGRATIONS`, `async migrate(db, file)`. `createSqliteStore` became `async` because `db.backup()` returns a promise. `readJsonFile()` handles the JSON upgrade. `/api/health` reports `schemaVersion`. About 90 lines.

After, `server/src/store.js` (working tree):
```js
  for (let v = version; v < SCHEMA_VERSION; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
```

## Verification

1. `server/test/store.test.js` › `SQLite open, fallback and migration` › *upgrades a pre-versioning (v1) file to v2 in place, after a backup, keeping the data*. It builds the 1.0 schema by hand with one profile and one attempt, opens it, and asserts the data survives (`gaveUp: false`), a flag can be written, `user_version` is 2, the `.bak-v1` holds the attempt, and exactly two `idx_` indexes remain. At the baseline no code sets `user_version`, so the assertion reads 0.
2. *refuses a file written by a newer schema version* (`user_version = 99`), and `JSON store recovery and migration` › *a v1 file (no schemaVersion, attempts without ids) upgrades with ids 1..n* and *a file from a newer build is refused*.
3. Manual: I copied this machine's `server/data/progress.db` (a real 1.0 file: `user_version` 0, one profile) to a scratch directory and opened it with `createStore`. It logs `upgraded progress.db from schema v1 to v2 (backup: …progress.db.bak-v1)`, keeps the profile, and leaves `progress.db` plus the backup and no `-wal`/`-shm`.

## What a senior reviewer would ask

- *What if the backup fails (disk full)?* `db.backup()` rejects, the open fails, the handle closes and the error names the file (J18). Nothing is migrated without a backup.
- *Does a 1.0 build still open a v2 file?* Yes. It ignores the extra tables and the column has a default, but it writes `gave_up = 0` for everything and knows nothing of flags. The contract only promises that v2 refuses a future v3.
- *Why is the ALTER safe on a file with a million attempts?* `ADD COLUMN` with a constant default is a schema-only change in SQLite. It does not rewrite rows.

## The junior version of this fix

`try { db.exec('ALTER TABLE attempts ADD COLUMN gave_up …') } catch {}` at every boot, catching "duplicate column". It passes review because it is short. But it swallows every other error too, including a locked or read-only file. It gives no way to refuse a newer file. And the next migration has to guess from the error text what state the file is in.

## Follow-ups

- [ ] Keep only the newest `.bak-v*` if backups accumulate across many versions → when v4 lands
