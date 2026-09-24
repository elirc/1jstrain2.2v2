---
id: J40
title: Export a profile, and import it as a new one
area: server
closes: []
ladder: [B06, B04, B05]
adrs: [0003 unchanged]
status: landed
---

# Export a profile, and import it as a new one

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes none (feature, CONTRACT.md §11) · Ladder B06, B04, B05 · ADRs 0003 unchanged

## Symptom

"Reset progress" and "Delete profile" are one click and cannot be undone. Moving laptops means copying `progress.db` by hand, and history on the JSON fallback (J18) cannot be carried back into SQLite. At `6f1bf43` neither `GET /api/profiles/:id/export` nor `POST /api/profiles/import` exists (both are 404s), and a 200 kB body to any route is a `413`.

## Root cause

A missing capability beside two destructive ones: `server/src/routes/api.js › deleteProfile (L36–39 @ 6f1bf43)` and `server/src/store.js › resetProgress (L163–166 @ 6f1bf43)` delete with no way back. The body limit is global, `server/src/index.js › express.json (L42 @ 6f1bf43)`: `app.use(express.json({ limit: '64kb' }));`

The invariants for the feature: *an export is enough to rebuild the profile's history exactly (XP, mastery, flags, settings); an import never touches an existing profile; and an import file is untrusted input, validated row by row.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing; tell learners to copy `progress.db` | Nothing | It works for one machine and one backend. It does not cover a single profile, the JSON fallback, or "undo that reset". |
| B | Automatic `db.backup()` on boot (review item 21) | ~5 lines | Worth having, and the v2 migration already does it once. It is not per-profile and not portable. |
| C | Export and import that **merges** into an existing profile | Merge rules | Conflicting card states have no right answer. The review and the contract both say to create a new profile. |
| D | Path-scoped export as an attachment; import always creates a new profile in one transaction; unknown question ids skipped and reported; a 10 MB parser on that route only | ~200 lines | **Chosen.** |

## Decision and trade-off

I chose D (CONTRACT.md §11). The export is `{ format: 'stack-ready-profile', version: 1, exportedAt, profile: { name, createdAt }, settings, cardStates, attempts, flags }`, served as the raw document rather than inside the `{ data }` envelope, so the downloaded file can be imported unchanged. It is scoped by the path, not the `x-profile-id` header, so a plain `<a href download>` works. `Content-Disposition` carries an ASCII-slugged filename (`stack-ready-export-me.json` for "Export Me!"). Install-local ids (profile id, attempt ids) are left out.

Import checks `format` and `version`, then every row (types, `correct ≤ attempts`, ISO dates, notes ≤ 500). The first bad field is a `400 validation_failed` naming it, such as `attempts[0].correct`. Rows for questions not in the content are skipped and listed in `skipped.unknownQuestionIds`. `moduleId`/`trackId` come from the content, since a question may have moved. Attempts are inserted chronologically, so new ids sort by time (the `/api/attempts` cursor needs that), all in one `importProfile` transaction (J08). XP is replayed (J14), so it matches the source.

The body parser was the subtle part (review M10). A route-level `express.json({ limit: '10mb' })` mounted after the global 64 kB parser never runs: the global one has already answered 413. So the import parser is mounted on its exact path **before** the global one, and body-parser skips a body that is already parsed.

What it costs: anyone who can reach the port can export, the same exposure as the rest of the API, bounded by J21's loopback binding. Revisit if the server ever listens beyond loopback.

## The change

`server/src/transfer.js` is new (`buildExport`, `exportFilename`, `parseImport`). The routes are in `server/src/routes/profiles.js`. Both stores gain `importProfile` (one transaction in SQLite; validate-then-mutate in JSON). `server/src/app.js` holds the parser ordering.

After, `server/src/app.js` (working tree):
```js
  app.post('/api/profiles/import', express.json({ limit: IMPORT_LIMIT }));
  app.use(express.json({ limit: JSON_LIMIT }));
```

## Verification

1. `server/test/http.test.js` › *export is path-scoped and an attachment; import creates a new profile and reports unknown ids*. It exports a profile with an answer, a flag and a setting, adds an attempt for `gone-from-content-1`, imports under a new name, and asserts the counts, the skipped id, a different profile id, the setting carried over, and **equal XP**. At the baseline both routes are 404s.
2. *import rejects a wrong format or version with validation_failed, bad rows name the field, and the 10 MB route limit is its own*: a 200 kB import succeeds (it would be 413 on any other route), and a 10.5 MB one is `413 payload_too_large`.
3. `server/test/store.test.js` › *importProfile creates a new profile with all its rows in one go*, on both backends.

## What a senior reviewer would ask

- *Why not wrap the export in `{ data }` like everything else?* Because it is a file format, not an API response. The import reads the same document back, and a versioned `format` field identifies it.
- *Can a hostile file exhaust memory?* It is capped at 10 MB by the parser. Validation is linear, and nothing is written before the whole file has passed.
- *Why is the export's `version` 1 when the schema is v2?* They are separate contracts. The file format changes only when its fields do, and the database schema can move under it.

## The junior version of this fix

`router.post('/profiles/import', express.json({ limit: '10mb' }), handler)` inside the API router. It reads as correct and passes a small test. Any real export over 64 kB is rejected with 413 by the global parser before the route's parser is reached, and the error message even names the wrong limit.

## Follow-ups

- [ ] Client: "Download backup" link and an import file picker → client entry
- [ ] Automatic per-boot `progress.db.bak` (review item 21) → new entry if wanted

## Update 2026-09-24

Two things the review found on this route. The 413 message named the limit in kilobytes ("over the 10240 kB limit"); `toErrorResponse` now formats it as "10 MB", and the HTTP test asserts it. And an import is the one way a card state can reach `schedule()` with `reps ≥ 2` and `intervalDays: 0`, which made the card permanently due: see J45.
