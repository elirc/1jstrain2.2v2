---
id: J39
title: Add per-profile settings that the server actually uses
area: server
closes: []
ladder: [B06, B02]
adrs: []
status: landed
---

# Add per-profile settings that the server actually uses

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes none (feature, CONTRACT.md §9–10) · Ladder B06, B02 · ADRs none

## Symptom

Every learner gets the same session size and the same pace of new material, whether they have a week before an interview or a year to study. The daily streak measures "did anything" and has no goal to measure against. At `6f1bf43`, `GET /api/settings` is a 404, and the only size knob is a `limit` the client hard-codes to 12.

## Root cause

The numbers are constants in code. `server/src/sessions.js › DEFAULT_LIMIT (L15–16 @ 6f1bf43)`:
```js
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 40;
```

The daily mix's split was a fixed `Math.ceil(size * 0.5)` (J17), and `/progress` had no goal at all. The invariant I wanted: *a setting either changes what the server does or does not exist.* The server review deferred settings precisely because the plan's `sessionSize` would have had no effect while the client always sent `limit: 12`.

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Learners cannot pace themselves, and the goal UI has nothing to read. |
| B | Client-side settings in `localStorage` | Client only | Sessions are built on the server, so `newPerDay` could never reach the daily mix, and settings would not travel in an export. |
| C | A key-value table (`settings(profile_id, key, value)`) | Flexible | Types and ranges would be checked in code anyway, and there are three settings. |
| D | `profile_settings (profile_id PK, daily_goal, session_size, new_per_day)`; `GET`/`PATCH /api/settings`; defaults when there is no row; each value **used** | ~70 lines | **Chosen.** |

## Decision and trade-off

I chose D (CONTRACT.md §9). The three settings, with defaults and ranges, live in one table in `server/src/settings.js`: `dailyGoal` 20 (1–500), `sessionSize` 12 (1–40) and `newPerDay` 10 (0–100). A profile with no row simply has the defaults, so creating or importing a profile needs no extra write. `PATCH` takes any subset and answers with the full set. An unknown key or an out-of-range value is `400 validation_failed` with `details.field`, so a form can put the message on the right input.

Each one is wired in. `sessionSize` is the session length whenever `limit` is absent or `null`, and the client can stop sending 12. `newPerDay` feeds the daily mix's new-card reserve and cap (J17). `dailyGoal` becomes `today.goal` and `today.goalMet` on `/progress`, counted in answers.

What it costs: `newPerDay` is applied per daily session, not per calendar day (J17's follow-up), so the name promises slightly more than it does. I considered renaming it, but it is in the contract the client is building against today. Revisit when learners run several daily sessions a day.

## The change

`server/src/settings.js` is new (`SETTINGS`, `DEFAULT_SETTINGS`, `withDefaults`, `parseSettingsPatch`). `server/src/routes/settings.js` is new. The store gains `getSettings`/`saveSettings`, and migration v2 creates `profile_settings` with nullable columns, because the defaults live in code, not in the schema. `server/src/routes/api.js` reads the settings in `/sessions` and `/progress`.

After, `server/src/routes/api.js` (working tree), in `POST /sessions`:
```js
    const settings = withDefaults(store.getSettings(profileId));
    const size = int(body.limit, 'limit', { min: MIN_LIMIT, max: MAX_LIMIT, optional: true }) ?? settings.sessionSize;
```

## Verification

1. `server/test/http.test.js` › *settings: defaults, partial PATCH, range errors name the field, and sessionSize drives sessions*. It checks the defaults, `PATCH {sessionSize: 5}` returning the full set, `newPerDay: 101` → 400 with `details.field: 'newPerDay'`, an unknown key → 400 naming `theme`, a daily session with `limit: null` returning 5 questions, and `dailyGoal: 1` showing on `/progress`. At the baseline, `GET /api/settings` is a 404 and `limit: null` means 12.
2. `server/test/sessions.test.js` › *daily: newPerDay bounds the new cards, but at least one new card is reserved when unseen exist*.
3. `server/test/progress.test.js` › *today has goal/goalMet from settings; totals.nextDueAt is the earliest upcoming review*.

## What a senior reviewer would ask

- *Why not store the defaults in the table's `DEFAULT` clauses?* Then changing a default needs a migration, and existing rows keep the old value anyway. A missing row means "the current defaults".
- *Does `withDefaults` trust a stored out-of-range value?* No. It ignores it and uses the default, so a hand-edited JSON file cannot produce a 500-question session.
- *Why is `limit` still accepted?* A drill link can ask for a specific size (`/drill?limit=5`), which overrides the setting for one session. `null` means "no preference".

## The junior version of this fix

Add the table and the two routes, and have the client read `sessionSize` and send it as `limit`. It looks complete in the demo. But `newPerDay` then goes nowhere, because only the server builds the daily mix. `dailyGoal` is compared against something the client computes differently from `/progress`. And another client (or a stale tab) ignores the settings entirely.

## Follow-ups

- [ ] Count `newPerDay` per calendar day, or rename it → new entry (see J17)
- [ ] Client: settings page, goal ring on the dashboard, stop sending `limit: 12` → client entry
