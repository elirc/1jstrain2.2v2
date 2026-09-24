# E03: Write migration N+1

Level: senior · Timebox: 2 h · Touches: server
Ladder: B04, B05, B16 · Depends on: J19 and ADR-0017 (schema versions and migrations), J20 (one contract suite, two backends), J08 (`recordAnswer`)

## Scenario

A learner asks: *"My history says I got `net-ef-4` wrong three times. Was that a real miss, or the time I was just revising early?"* The answer response already carries an `outcome` (`learned`, `advanced`, `practice`, `lapsed`, `failed`, from J10), but nothing stores it, so the question-history line (J41, J42) cannot show it. J08 named this as its revisit trigger: "a third write (an XP ledger, an `outcome` column)".

Add `attempts.outcome` as schema version 3, using the runner that exists.

## Deliverables

1. `V3_SQL` appended to `MIGRATIONS`, and `SCHEMA_VERSION` set to 3. The column is nullable: a row written before v3 has no outcome, and `NULL` says so honestly.
2. The JSON store's equivalent in `readJsonFile`: a v2 file upgrades on load to v3, and a v4 file is refused.
3. `recordAnswer` writes the outcome on both backends, and `listAttempts` / `queryAttempts` return it in the same shape on both.
4. Export and import carry it. An export from a v2 install (no `outcome`) still imports.
5. A paragraph for the release notes: what a learner who rolls back to the previous build sees, and how they recover.

## Constraints

- Never edit `V1_SQL` or `V2_SQL`. A file already at v2 would never run the change.
- One migration, one transaction, one `user_version` bump. The backup (`progress.db.bak-v<from>`) and the refuse-newer check stay exactly as the runner does them.
- No new dependency. No change to the answer response.

## Starting points

- `server/src/store.js › migrate()`, `MIGRATIONS`, `SCHEMA_VERSION`, `attemptFields()`, `readJsonFile()` (working tree)
- `server/src/answer.js › submitAnswer()`, `server/src/transfer.js › EXPORT_VERSION` (working tree)
- `server/test/store.test.js` › *upgrades a pre-versioning (v1) file to v2 in place, after a backup, keeping the data* and *refuses a file written by a newer schema version*
- `server/test/helpers.js › backends`
- The v1 DDL at `server/src/store.js › CREATE TABLE IF NOT EXISTS (L54–92 @ 6f1bf43)`

## Done when

- `npm run check -w server` passes, locally and with `REQUIRE_SQLITE=1`.
- A new test builds a **v2** file (the v2 DDL written out in the test, not `createStore()` from the new build), inserts attempts, opens it with the new build, and asserts: `user_version` is 3, `progress.db.bak-v2` exists and holds the old rows, and the old attempts come back with `outcome: null`.
- The existing v1 upgrade test still passes, now going v1 → v3 through two migrations with one backup, `bak-v1`.
- A contract case in the `describe.each(backends)` suite proves that both backends return `outcome` identically after `recordAnswer`.
- The JSON store has its own v2 → v3 and refuse-newer tests.

## Stretch

Backfill `outcome` for old rows by replaying each profile's attempts through `schedule()`, which is what `replayXp()` already does. Decide whether that belongs in the migration, at boot, or nowhere, and defend the choice.

<details><summary>Reviewer notes (open after attempting)</summary>

**A strong answer** writes `ALTER TABLE attempts ADD COLUMN outcome TEXT` with a `CHECK (outcome IS NULL OR outcome IN (...))`, and does not use `NOT NULL DEFAULT 'advanced'`, because a default invents history. It maps `NULL` to `null` on both backends, so the parity case passes without special-casing. It keeps `EXPORT_VERSION` at 1 because the field is additive and the importer treats it as optional, and it validates the value on import like `gaveUp`. Its release note says plainly that the previous build refuses a v3 file, and that the way back is `progress.db.bak-v2`, which loses every answer given since the upgrade.

**Common mistake:** bumping `SCHEMA_VERSION` and appending the SQL, then testing only with a fresh `createStore()`. A fresh file runs V1, V2 and V3 in sequence and passes, which proves nothing about upgrading a real v2 file. A second one: forgetting the JSON store, which then writes attempts without the field, so the contract suite fails on the fallback only.

**What a senior also flags:** the backfill stretch must not go in the migration. It needs the content and `schedule()` from JavaScript, it takes as long as the whole history, and it runs inside the upgrade transaction. It also bakes the current scheduling rules into rows as if they had always applied. The honest options are to leave `NULL` or to derive the outcome on read.
</details>
