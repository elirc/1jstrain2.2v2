---
id: ADR-0017
title: Version the schema with PRAGMA user_version and migrate forward only
status: accepted
date: 2026-09-23
amends: null
supersedes: null
---

# ADR-0017: Version the schema with PRAGMA user_version and migrate forward only

Status: accepted · Date 2026-09-23 · Written with J19
Anchors: `server/src/store.js › CREATE TABLE IF NOT EXISTS (L54–92 @ 6f1bf43)`

## Context
Every learner's `progress.db` is a long-lived file on their machine that the app cannot see or fix remotely. At the baseline the only schema mechanism was `CREATE TABLE IF NOT EXISTS`, which can add tables but never a column, and the file recorded no version (F-11). This release needs two tables and a column (flags, settings, `gave_up`). The JSON fallback store has the same problem in a different form.

## Decision
We record the schema version in SQLite's `PRAGMA user_version`. `MIGRATIONS[n − 1]` upgrades a file from version n − 1 to n, and each runs in its own transaction together with setting `user_version = n`. A file with version 0 and existing tables is a 1.0 file, treated as version 1. Before the first migration of an existing file, we copy it with `db.backup()` to `progress.db.bak-v<from>`. We refuse to open a file whose version is newer than the build knows, with an error naming the file. `journal_mode = WAL` is set before migrating, outside any transaction. The JSON store carries `schemaVersion`, upgrades on load (for v2, stable attempt ids) and refuses newer files the same way. Version 2 adds `question_flags`, `profile_settings`, `attempts.gave_up` and `idx_attempts_profile_question`, and drops the unused `idx_card_states_due`.

## Evidence
`server/src/store.js` (working tree), `migrate()`:
```js
  for (let v = version; v < SCHEMA_VERSION; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
```
Enforced by `server/test/store.test.js` › *upgrades a pre-versioning (v1) file to v2 in place, after a backup, keeping the data* and *refuses a file written by a newer schema version*, plus the JSON equivalents.

## Consequences
- Good: a column can be added. Upgrades are ordered, atomic per step, and backed up.
- Good: a downgrade cannot silently write into a file it does not understand.
- Cost: migrations are forward-only. The way back is the `.bak-v*` file.
- Cost: backups accumulate, one per upgraded version.
- Forces on future work: never edit a shipped migration. Add the next one. Keep V1 idempotent.

## Alternatives rejected
- **A `schema_version` table.** It needs bookkeeping for "empty means v1" and puts the version in data a migration could damage.
- **Try-and-catch `ALTER TABLE` at boot.** It swallows real errors and cannot refuse newer files.
- **A migration library.** A dependency for two migrations.

## Breaks first at
The first migration that must rewrite rows (backfill or reshape) on a large file: it needs a dry run and progress reporting, not one transaction at boot.

## Revisit when
- A migration needs to transform existing rows.
- More than three `.bak-v*` files would sit next to one database.
