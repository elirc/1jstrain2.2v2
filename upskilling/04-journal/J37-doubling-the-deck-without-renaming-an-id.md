---
id: J37
title: Doubling the deck without renaming an id
area: content
closes: [F-19, F-30]
ladder: [B04, B01]
adrs: [0001 unchanged, 0008 unchanged, 0014 unchanged]
status: landed
---

# Doubling the deck without renaming an id

Date 2026-09-24 · Author content integrator · Area content · Commit uncommitted (baseline 6f1bf43)
Closes F-19, F-30 · Ladder B04, B01 · ADRs 0001 unchanged, 0008 unchanged, 0014 unchanged

## Symptom
The expansion took the deck from 434 questions, 31 modules and 7 stages to 1,047, 53 and 10, written by twelve authors in parallel. The baseline layout cannot take that safely. Add a module object to `stage-6-7.js` without listing it in `tracks.js`, and `npm run check:content` (or server boot) fails with `module net-auth must appear in exactly one stage`. So every author would have to edit the same stage list and the same three module files. The Dashboard also hard-codes the path (F-19), and its streak label is a dead ternary (F-30).

## Root cause
Modules were grouped by stage, `content/modules/index.js › stage12Modules @ 6f1bf43`:

```js
import { stage12Modules } from './stage-1-2.js';
import { stage345Modules } from './stage-3-5.js';
import { stage67Modules } from './stage-6-7.js';
export const modules = [...stage12Modules, ...stage345Modules, ...stage67Modules];
```

Learner history has no foreign key into content. `server/src/store.js › CREATE TABLE IF NOT EXISTS attempts (L75–84 @ 6f1bf43)` keys on plain text:

```sql
question_id  TEXT NOT NULL,
module_id    TEXT NOT NULL,
track_id     TEXT NOT NULL,
```

The invariant: every question id at 6f1bf43 still exists, with the same `moduleId` and `trackId`. Nothing enforced it. `client/src/pages/Dashboard.tsx › Seven stages @ 6f1bf43` and `client/src/pages/Dashboard.tsx › 'day streak' : 'day streak' @ 6f1bf43` are the two copy bugs.

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing: authors take turns on the three stage files | Weeks of serial work | No merge risk, and every state validates. But twelve authors queue behind one another. |
| B | One file per author, each adds their modules to `tracks.js` as they land | One shared array under constant edit | Conflicts on every hand-off, and every intermediate stage list is a half-built path. |
| C | One file pair per author, stage list frozen until integration, `CONTENT_PARTIAL=1` for authors | An env flag, and a red default gate until Step Z | chosen |

## Decision and trade-off
Review §6 Step 0 split `modules/` and `questions/` into twelve pairs: js, ts, react, node, web, web-platform, data, csharp, dotnet, craft, craft-ops and craft-senior. Each author owned one pair and touched nothing else. Ids follow a prefix contract. Nine existing modules use a prefix that is not their id (`js-objects-arrays → js-objects-`, `net-efcore → net-ef-`, `craft-security → craft-sec-` and six more), six new ones do too, and every existing module continued at 15. With `CONTENT_PARTIAL=1`, "must appear in exactly one stage" and "unknown module" become warnings, so an author could validate before the stage list named their modules. At Step Z I swapped in the ten-stage list, with `after: 'stage-5'` on stage 8 (J35).

I gave up a green default gate during the run, and I rely on nobody setting the flag in production. The prefix contract is a brief, not a lint. Revisit if the flag ever appears in `.env` or a script: boot should then refuse it.

## The change
- `content/index.js` imports twelve question files, and `content/modules/index.js` concatenates twelve module files. `stage-*.js` are gone. The diff moves decks between files and changes no id.
- `content/index.js › validateContent()`:

```js
const partial = globalThis.process?.env?.CONTENT_PARTIAL === '1';
// ...
(partial && stageCount === 0 ? membership : problems).push(`module ${m.id} must appear in exactly one stage`);
```

- `stage-7` now means ASP.NET. That is safe because nothing stores a stage id.
- Guards for authors: `schema.js` throws `duplicate question id` at import. `content/lint.js` fails on positional wording, `output` without code, and markdown the renderer cannot draw. It warns, and `--strict` fails, on answer-index clumps, the longest-choice tell, boolean skew, duplicate prompts and primer length. The seeded permutation (J34) ran once on the old decks, and `server/src/present.js` shuffles on serve.
- The Dashboard derives the stage count and threshold from `curriculum.stages`, and the label reads `'day streak' : 'days streak'`.

Two failure modes showed up during the run. `content/index.js` imports all twelve files, so a half-saved file broke every other author's check with an error naming someone else's file. One module was written by two authors. The briefs disagree on `craft-incidents`: plan §6.9b lists it under craft-senior, review §6 gives it to A11. The tree keeps one copy, in `craft-ops.js`, as the review says. Four reviewers then cut the "longest choice" tell from 47% at hand-off to 12% (95/795). The index split is 203/201/197/194.

## Verification
1. The id-stability check, run on a `git archive 6f1bf43 content` copy against the tree:

```js
for (const q of base.questions) {
  const n = nowQ.get(q.id);
  if (!n) problems.push(`question ${q.id} removed`);
  else if (n.moduleId !== q.moduleId || n.trackId !== q.trackId) problems.push(`question ${q.id} moved`);
}
// plus: every base module id keeps its trackId, every base track id exists
```

```
baseline: 434 questions, 31 modules, 9 tracks, 7 stages
now:      1047 questions, 53 modules, 9 tracks, 10 stages
OK: every baseline question, module and track id survives with the same moduleId and trackId
```

When I renamed `js-async-3` in a scratch copy, it printed `question js-async-3 removed` and exited 1.
2. `npm run check:content -- --strict` printed `1047 questions, 53 modules, 10 stages, 9 tracks (js 146, ts 80, react 145, node 103, web 115, data 80, csharp 84, dotnet 100, craft 194)` and `0 warning(s)`.
3. In a scratch copy with `craft-review` dropped from stage 10, the check failed without the flag and warned with `CONTENT_PARTIAL=1`.

## What a senior reviewer would ask
- *Does renumbering choice ids by authored position orphan anything?* No. Attempts store correctness, not a choice id (ADR 0014, J34).
- *Why is the id check a script and not CI?* It needs the baseline tree. Committing a frozen id list is the follow-up.
- *Why not a lint for prefixes?* Nine legacy modules break the obvious rule. The real contract is "never change an existing id", which the script checks.

## The junior version of this fix
Rename the nine odd prefixes to match their module ids ("`js-objects-3` → `js-objects-arrays-3`, for consistency"). It reads as tidying and every check passes, because nothing links progress to content. Every learner's history on those 126 questions is orphaned silently, and accuracy can pass 100% (F-10).

## Follow-ups
- [ ] Commit the 434 baseline ids with module and track, and fail `check:content` on any change → content, new entry
- [ ] Refuse `CONTENT_PARTIAL` at server boot → server, new entry
- [ ] Mark F-19 and F-30 closed in the register → register owner
