---
id: J35
title: The stage gate names the stage it builds on
area: content
closes: []
ladder: [B03, B04]
adrs: [0008 unchanged]
status: in review
---

# The stage gate names the stage it builds on

Date 2026-09-24 · Author content integrator · Area content (server side in its own entry) · Commit uncommitted (baseline 6f1bf43)
Closes – · Ladder B03, B04 · ADRs 0008 unchanged

## Symptom
In the planned ten-stage path, stage 8 "Ship it" (git, testing, security, deployment) comes after stage 7 "ASP.NET Core and EF Core". A learner on a JavaScript-only track who masters stages 1–5 and skips C# never sees "Ship it" unlock, even though nothing in it depends on .NET. At the baseline you can see this rule in the data: stage 7 "Ship it" is gated on stage 6 "C# and .NET" purely because of list order.

## Root cause
`server/src/progress.js › previousMastery (L57–75 @ 6f1bf43)`:

```js
let previousMastery = 1;
for (const stage of curriculum.stages) {
  // ...
    unlocked: previousMastery >= stage.unlockAt || seen > 0,
  });
  previousMastery = mastery;
}
```

`content/types.d.ts › unlockAt (L42–46 @ 6f1bf43)` defines the gate as "the previous stage's questions". The list is both the path and the dependency graph, so a branch (the .NET stages hanging off stage 5) cannot be expressed. The invariant: a stage's gate is a stage that comes before it, and it is named in the data, not implied by list position.

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing, keep the linear chain | Nothing | Simple and matches the README. But the JS-only learner is blocked by content they will never take, and `|| seen > 0` already lets anyone bypass the gate, so all the chain does is hide stages. |
| B | `unlockAt: 0` on stage 8 | One number | It unlocks for everyone, including someone who has not reached Data. It fixes the symptom by removing the gate. |
| C | An optional `after: '<stage id>'` naming the gate; the default stays "the previous stage" | A type field, a validation rule and a lookup on the server | chosen |

## Decision and trade-off
I added `after?: string` to `Stage`. It is optional, so every existing stage keeps its behaviour. It must name a stage that appears earlier in the list. That forbids cycles and forward references, and it also forbids a stage waiting on a later one, which could be legitimate but is not needed. The server builds a map of stage stats as it walks the list and uses `stage.after` to pick the gate, falling back to the previous stage; that change is the server team's, per `CONTRACT.md` §10. I did not change the stage list in `content/tracks.js`. The ten-stage list with `stage-8.after = 'stage-5'` is swapped in at integration, once all twelve authors have landed their modules. Revisit if we ever need a stage gated on two others: `after` would become an array, and the server would take the minimum.

## The change
- `content/types.d.ts`: `after?: string` with a doc comment. The `unlockAt` comment now says "the gate stage", not "the previous stage".
- `content/index.js › validateContent()` adds these checks: stage ids are unique; `unlockAt` is a number from 0 to 1; the first stage has `unlockAt: 0`; `after`, when present, names a known stage that appears earlier in the list.

```js
if (s.after !== undefined) {
  const gate = stageIndex.get(s.after);
  if (gate === undefined) problems.push(`stage ${s.id} has unknown after: ${s.after}`);
  else if (gate >= i) problems.push(`stage ${s.id} after: ${s.after} must name an EARLIER stage`);
}
```

- Nothing stores a stage id. `attempts` and `card_states` are keyed by question, module and track. So reusing `stage-7` for ASP.NET in the new list, and adding `after`, cannot orphan any learner history.

## Verification
1. `npm run check:content` passes on the current seven-stage list (no stage sets `after`).
2. I set each case by hand in a scratch copy of `tracks.js`, then reverted it. `after: 'stage-7'` on stage 2 fails with "must name an EARLIER stage". `after: 'nope'` fails with "unknown after". `unlockAt: 1.2` fails, and so does `unlockAt: 0.35` on stage 1.
3. The server assertion "stage-8 unlocks when stage-5 is at 35% even if stage-7 is at 0" belongs to the server change that reads `after`.

## What a senior reviewer would ask
- *Why validate in content rather than in `progress.js`?* ADR 0008 says whole-curriculum invariants go in `validateContent()`, which runs at boot. A bad `after` stops the server from starting rather than silently unlocking a stage.
- *Does the client need to know?* Only as a type (`client/src/lib/types.ts`), because the server sends `unlocked` already computed.
- *What about the README's "a third of the one before it"?* It becomes "of the stage it builds on" when the list is swapped. That is an integration edit to the README, not a content one.

## The junior version of this fix
Move "Ship it" above the .NET stages in the list. It passes review because the order looks sensible. It also breaks the path the stages describe, and the next branch needs another reshuffle.

## Follow-ups
- [ ] Swap in the ten-stage list with `stage-8.after = 'stage-5'` → integration (Step Z)
- [ ] Server gate lookup and its test → server entry for CONTRACT §10
