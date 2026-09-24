---
id: J44
title: Next-up card, copy button, generated Labs counts
area: client
closes: []
ladder: [B01]
adrs: []
status: landed
---

# Next-up card, copy button, generated Labs counts

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes – · Ladder B01 · ADRs none

## Symptom

- The Labs page says "274 problems" and gives per-file counts. Counting distinct `PROBLEM n` markers in `jstrain/exercises/` gives a different number in 17 of 24 files; the capstone files hold 8 and 5 problems where the page says 1 each; the real total is 273.
- The roadmap's **Continue: <module>** button vanishes whenever anything is due, which for an active learner is most days.
- Primer code is meant to be tried, and there is no way to copy it.

## Root cause

`client/src/pages/LabsPage.tsx › 274 problems (L133 @ 6f1bf43)` and the `problems:` fields are hand-typed. Nothing ties them to the files. `client/src/pages/Dashboard.tsx › findNextModule (L46–61 @ 6f1bf43)` is used only in the false branch of `totals.due > 0 ? … : nextModule ? …`.

## The change

`client/scripts/labs-index.mjs` counts distinct `PROBLEM <n>` markers per exercise file and writes `client/src/labs.generated.json`. It runs from `prebuild` and `pretest`, and exits 0 without touching the committed JSON when `../jstrain` is absent. `LabsPage` reads the JSON and renders "count unavailable" for a missing file. Labs `related` links now point at `js-classes`, `js-stdlib` and `ts-advanced`, and an id the curriculum lacks renders as a plain tag. The Dashboard shows a **Next up** card (the reason it was picked, `estMinutes`, unseen count) beside the review button. `Code` takes `copyable` (primer fences only) with a `role="status"` "Copied".

## Verification

`client/src/pages/pages.test.tsx` › *the Labs page shows generated counts and survives a module id the curriculum lacks* and › *the dashboard copy follows the curriculum*. `node client/scripts/labs-index.mjs` → "wrote 24 files". Comparing the baseline table with the generated JSON: 17 of 24 per-file counts differ; React 57 vs 56, capstone 2 vs 13.
