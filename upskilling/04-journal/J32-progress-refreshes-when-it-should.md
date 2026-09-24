---
id: J32
title: Progress refreshes when it should, and milestones
area: client
closes: [M-14]
ladder: [B11]
adrs: []
status: landed
---

# Progress refreshes when it should, and milestones

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes M-14 · Ladder B11 · ADRs none

## Symptom

Answer 7 of 12 questions, then click **Roadmap**. The dashboard, the nav's due badge, the module bars and the stage locks all show pre-session numbers until a reload. Progress refreshed only if you reached the Summary, and in dev StrictMode it refreshed twice.

## Root cause

`client/src/pages/DrillPage.tsx › Summary (L520–523 @ 6f1bf43)`:
```tsx
  // Refresh the dashboard's numbers once, when the session ends.
  useEffect(() => {
    void onFinish();
  }, [onFinish]);
```
A data refresh tied to a component mounting, rather than to the event that changed the data.

## The change

`useDrillSession` calls `refreshProgress()` after each graded answer and once on unmount if anything was answered. `refreshProgress` is coalesced (one request plus at most one trailing one) and identity-checked (J28). The hook passes the snapshot from before the answer and the one after to a pure `diffMilestones()` (`client/src/lib/milestones.ts`), and any "Level up", "Module mastered" or "Stage unlocked" line is shown inside the verdict's `role="status"` region. There is no toast queue. The Summary effect is deleted.

## Verification

`client/src/pages/drill/DrillPage.test.tsx` › *the verdict is announced* asserts a second `GET /api/progress` right after the first grade, with the session unfinished. At the baseline no refresh happened until the Summary mounted. `client/src/lib/milestones.test.ts` › *announces a level-up, a mastered module and an unlocked stage* pins the diff. `app-state.test.tsx` › *a failed progress refresh keeps the page and shows a dismissible error* covers the failure path.

## Update 2026-09-24

The milestone line was dispatched to the index of the answer that triggered the refresh, and diffed against the snapshot captured when that answer was sent. A learner who pressed Enter before the refresh landed never saw the line. J46 diffs against the last announced snapshot and announces on the card on screen. See J46 › Root cause.
