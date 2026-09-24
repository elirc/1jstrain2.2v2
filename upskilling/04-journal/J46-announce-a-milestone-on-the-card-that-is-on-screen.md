---
id: J46
title: Announce a milestone on the card that is on screen
area: client
closes: []
ladder: [B11]
adrs: []
status: landed
---

# Announce a milestone on the card that is on screen

Date 2026-09-24 · Author Claude (client reviewer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes – · Ladder B11 · ADRs none

## Symptom

Answer the question that takes you to level 2, press Enter for the next one before the progress refresh has come back, and "Level up" never appears: it was dispatched to the card you had just left, which is no longer rendered. Two answers sent before the first refresh landed were also diffed against the same "before" snapshot, so one level-up could be attributed twice.

Before this fix the test below fails with `Unable to find an element with the text: /Level up: Junior/`.

## Root cause

J32 moved the refresh from the Summary (`client/src/pages/DrillPage.tsx › Summary (L520–523 @ 6f1bf43)`) into the answer path and tied the diff to the answer's index. In `client/src/pages/drill/useDrillSession.ts › send` (working tree, uncommitted):

```ts
      const before = progressBefore.current;
      ...
            void refreshProgress().then((after) => {
              const milestones = diffMilestones(before, after, curriculum);
              if (milestones.length) dispatch({ type: 'milestones', round, index, milestones });
```

`before` is read at send time and `index` is the answered question; neither is true when the refresh resolves. The invariant: *each crossed line is announced once, on the card the learner is looking at, and the next diff starts from the last snapshot announced.* The fix keeps an `announcedFrom` ref, diffs against it, and dispatches to `latest.current.index` while the round is unchanged; the reducer appends rather than replaces.

## Verification

1. `client/src/pages/drill/DrillPage.test.tsx` › *a milestone whose refresh lands after moving on is announced once, on the card on screen*: a held-back refresh, Enter before it lands, then exactly one "Level up: Junior" on the second card, and none added when the second answer refreshes.
2. `npm run typecheck -w client` clean; `npm test -w client` → 77 passed.

