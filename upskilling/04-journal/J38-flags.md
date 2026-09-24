---
id: J38
title: Let a learner flag a question to revisit
area: server
closes: []
ladder: [B04, B06]
adrs: []
status: landed
---

# Let a learner flag a question to revisit

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes none (feature, CONTRACT.md §8) · Ladder B04, B06 · ADRs none

## Symptom

A learner meets a question they want to come back to: it came up in an interview, the explanation did not land, or they disagree with it. At `6f1bf43` there is nowhere to put that. The only ways back to a specific question are to wait for the scheduler or to find the module again. `curl -X PUT localhost:3001/api/questions/js-values-1/flag` returns `404 {"code":"not_found","message":"No route for PUT /api/questions/js-values-1/flag"}`.

## Root cause

It is not a defect. The model has no concept for it. `server/src/sessions.js › MODES (L13 @ 6f1bf43)` lists every way to pick questions, and none of them is learner-chosen:
```js
export const MODES = ['module', 'review', 'daily', 'stage', 'track', 'weak'];
```

A flag is persisted, per-profile state keyed by question id, so it needs a table, and that means the migration mechanism J19 introduced. The invariants: *a flag belongs to one profile and one question; setting it twice is the same as setting it once; removing a missing flag is not an error; and deleting a profile removes its flags.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | The server review deferred it: value unproven for one learner. The contract ships it, and the client work is already planned. |
| B | Keep flags in the browser (`localStorage`) | Client only | They would not survive a browser change, would not be in the export (J40), and could not drive a session mode on the server. |
| C | `question_flags (profile_id, question_id, note, created_at)`; `PUT`/`DELETE /api/questions/:id/flag`; `GET /api/flags`; `mode: 'flagged'`; `flagged` on each question in `/modules/:id` | ~80 lines incl. both stores | **Chosen.** |

## Decision and trade-off

I chose C, exactly as CONTRACT.md §8 specifies. `PUT` is an idempotent upsert. It updates the note and keeps the *original* `createdAt`, so "flagged three weeks ago" stays true after an edit. The note is optional text of up to 500 code points. It may contain newlines, so control characters are allowed here, unlike profile names. `DELETE` answers 204 whether or not the flag existed: the learner's intent ("not flagged") is satisfied either way, and a double-click should not produce an error. `GET /api/flags` joins each flag with the content (`moduleId`, `trackId`, `prompt`) and **skips** flags whose question no longer exists. The row stays stored and is still exported, so it comes back if the id does. The `flagged` session mode serves newest flags first.

What it costs: flags survive `POST /api/progress/reset`, because they are a preference rather than history. A learner who resets expecting a blank slate still sees their flags. I chose that on purpose and documented it in the README's API table. Revisit if learners ask for "reset everything".

## The change

Migration v2 creates `question_flags` (J19). The store gains `getFlag`, `listFlags`, `setFlag` and `deleteFlag` on both backends. The JSON backend keys flags by `profileId:questionId`, and `deleteProfile` clears them. `server/src/routes/questions.js` holds the three routes. `server/src/sessions.js` adds `flagged` to `MODES`. `/api/modules/:id` state gains `flagged`, `reps` and `lapses`.

After, `server/src/store.js` (SQLite, working tree):
```js
    upsertFlag: db.prepare(`
      INSERT INTO question_flags (profile_id, question_id, note, created_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (profile_id, question_id) DO UPDATE SET note = excluded.note
    `),
```

## Verification

1. `server/test/http.test.js` › `HTTP API on sqlite` / `on json` › *flags: PUT is an idempotent upsert, DELETE is 204 either way, GET /flags and the flagged mode list them*. It covers the note, the kept `createdAt`, the 501-character note rejected with 400, the joined list, the flagged session, `flagged: true` in `/modules/:id`, two DELETEs both 204, and `empty: true` afterwards. At the baseline the first `PUT` is a 404.
2. `server/test/store.test.js` › *flags: upsert keeps the original createdAt, list is newest first, delete reports whether it existed*, and *profile round-trip; delete cascades card states, attempts, flags and settings*.
3. `server/test/sessions.test.js` › *flagged returns this profile's flagged questions, newest flag first* (another profile's flag and a removed question are both excluded).

## What a senior reviewer would ask

- *Why `PUT` on a sub-resource rather than `POST /flags`?* The flag's identity is the question, and there is at most one per question per profile. `PUT` says "make it so" and is naturally idempotent.
- *Is the note ever rendered as HTML?* The server stores and returns plain text. Escaping is the client's job, and React escapes text by default.
- *What about flags for a question that is renamed?* They are orphaned like card states (J15): stored, exported, not listed. The content id-stability check (J37) is the prevention.

## The junior version of this fix

`POST /api/flags { questionId }` inserting a row every time. It works in the demo. The second click creates a duplicate, `DELETE` then needs a flag id the client does not have, and the "flagged" list shows the same question twice. The composite primary key and the upsert are what make the feature idempotent.

## Follow-ups

- [ ] Client: flag button in the drill card, flagged list, `flagged` in the mode labels → client entry
