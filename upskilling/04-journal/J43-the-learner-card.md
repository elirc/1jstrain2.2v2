---
id: J43
title: The learner card - settings, export, import, delete
area: client
closes: [F-18]
ladder: [B06, B12]
adrs: [0006 unchanged]
status: landed
---

# The learner card - settings, export, import, delete

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-18 (the reset half; the add-learner half is J28) · Ladder B06, B12 · ADRs 0006 unchanged

## Symptom

Everything about "this learner" was either missing or fragile:
- Session size was hard-wired. The client sent `limit=12` on every session, so the new server setting would silently never apply.
- There was no daily goal, no way to back up a learner, no way to move one to another machine, and no way to delete one.
- **Reset progress** awaited without a `catch`. If it failed, the "Yes, erase it" state stuck with no message.

At `6f1bf43`: `DrillPage.tsx:39` sends `Number(params.get('limit') ?? 12)`, and the Progress page's only learner action is Reset.

## Root cause

`client/src/pages/ProgressPage.tsx › resetProgress (L161–172 @ 6f1bf43)`:
```tsx
              <button
                ...
                onClick={async () => {
                  await resetProgress();
                  setConfirming(false);
                }}
              >
```
and the missing surfaces: no `settings`, `import` or `delete` calls in `api.ts`, no `Settings` type. The invariant for this card: *every learner action reports its outcome, success or failure, in place, and a server validation error lands on the field it names.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Learner data can only be moved by copying the database file, and the settings the server now stores are unreachable. |
| B | A Settings page as a sixth nav item | A route and a nav slot | The nav already overflows at 360 px, and these are rare actions. |
| C | One "This learner" card at the bottom of Progress: settings, export link, import, reset, delete | ~300 lines | Chosen. |

## Decision and trade-off

I chose C. **Settings** is a form of three number inputs with client-side range checks (`SETTINGS_RANGES` mirrors CONTRACT §9). It sends only the changed fields as a `PATCH`, and maps `validation_failed.details.field` onto that input's `aria-invalid` and message. **Export** is a plain `<a download href={api.exportUrl(id)}>`, which works because the contract makes the route path-scoped (no header), so the browser streams the file. **Import** is a file input: the client checks `format`/`version` locally, `POST /api/profiles/import` creates a new learner, and the client selects it. The report ("Imported as …: 9 answers, 3 schedules, 1 flag" plus the skipped question ids) lives in app state as `lastImport`, because switching learner remounts the page that asked. **Delete** has a confirm step and explains `409 last_profile` in words. It is disabled when only one learner exists. **Reset** now catches. The Dashboard shows a daily-goal ring from `today.goal/goalMet`.

What it gives up: import always creates a new learner. There is no merge. Revisit if people ask to combine two histories.

## The change

`api.ts`: `settings`, `updateSettings`, `importProfile`, `deleteProfile` and `exportUrl`. `types.ts`: `Settings`, `SETTINGS_RANGES`, `ExportDocument` and `ImportResult`. `app-state.tsx`: a settings resource per learner, `updateSettings`, `deleteProfile` (falls back to the next learner), `importProfile` and `lastImport`. `ProgressPage.tsx`: `LearnerCard`, `SettingsForm`, `ImportControl` and `DangerZone`. `drill/params.ts` omits `limit` unless the URL has one.

After, `client/src/pages/ProgressPage.tsx`:
```tsx
      const field = isApiError(err, 'validation_failed') ? err.details?.field : undefined;
      if (typeof field === 'string' && field in FIELD_LABEL) {
        setErrors({ [field]: errorMessage(err) });
      } else {
        setStatus(`Could not save: ${errorMessage(err)}`);
      }
```

## Verification

`client/src/pages/pages.test.tsx`:
1. › *shows a field-level error from validation_failed.details.field*: the PATCH body is `{ sessionSize: 30 }`, and the input is `aria-invalid="true"` with the server's message.
2. › *validates the range before sending anything*: no PATCH for a daily goal of 0.
3. › *exports with a plain download link*: `href="/api/profiles/p-a/export"` with `download`.
4. › *imports a file, selects the new learner and lists skipped questions*, and › *rejects a file that is not an export without calling the API*.
5. › *explains 409 last_profile when deleting*, and › *deleting the active learner falls back to another*.
6. `params.test.ts` › *omits limit when the URL does not set it, so sessionSize applies*. At the baseline `limit` was always 12.

## What a senior reviewer would ask

- *Is export a data-exfiltration risk?* Only within ADR 0006's model: a local, single-user tool where the profile is a header, not a login. The route is path-scoped by contract, and the server binds loopback.
- *What if the export is 20 MB?* The server returns `413 payload_too_large`, and the card says the limit is 10 MB.
- *Why validate locally when the server validates too?* So an obvious typo costs no round-trip. The server stays the authority, and its `field` wins.

## The junior version of this fix

Fetch the export with `fetch` + `blob()` + `URL.createObjectURL`, because "downloads need JavaScript". It works, and it holds the whole file in memory, leaks the object URL unless revoked, and loses the server's filename. The contract made the route header-free precisely so a plain link is enough.

## Follow-ups

- [ ] Merge-import into an existing learner → not planned
- [ ] Theme as a per-learner setting → no; it is a device preference and stays in localStorage
