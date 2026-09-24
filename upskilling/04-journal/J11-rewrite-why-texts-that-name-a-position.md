---
id: J11
title: Rewrite the why texts that name a position
area: content
closes: [M-01]
ladder: [B04]
adrs: [0008 unchanged]
status: landed
---

# Rewrite the why texts that name a position

Date 2026-09-24 · Author content integrator · Area content · Commit uncommitted (baseline 6f1bf43)
Closes M-01 (part; J12 closes the rest) · Ladder B04 · ADRs 0008 unchanged

## Symptom
Once J12 shuffles choices on every serve, eight explanations point at the wrong choice. At the baseline, `grep -nE "Option [0-9]|option [0-9]|The first four|The last option" content/questions/*.js` prints eight lines. After a shuffle, "Option 3 drops every other property" in `js-objects-8` names whatever choice happens to land third.

## Root cause
`content/questions/node.js › node-express-14 (L398 @ 6f1bf43)`:

```js
why: '... Option 4 is the trap: the process may be redeployed before the timer fires, ...',
```

The same pattern appears in `js-objects-8` (L456), `data-sql-8` (L108), `net-ef-13` (L573), `web-api-1` (L386), `node-express-10` (L342), `craft-sec-8` (L520) and `ts-shapes-9` (L324), and `react-state-13` (L381) has a choice that ranks the other choices. The invariant: no `prompt`, `why` or `ask` may depend on the order of `choices`. I rewrote each text so it names the choice by its content. For example, "Option 4 is the trap" became "`setTimeout` plus an immediate 200 is the trap". `react-state-13` got four independent choices.

## Verification
1. `content/lint.js › POSITION_WORDS` is now part of `validateContent()`. It fails on `(first|second|third|fourth|last) (option|choice|answer|one)`, `option [A-D1-4]` and `choice [A-D1-4]`. At the baseline it reports `js-objects-8`, `node-express-14`, `web-api-1`, `data-sql-8` and `net-ef-13`. It also reported a false positive, "before the first one with a default" in `js-functions-11` (L321), which I reworded to "the first parameter". The phrase "The first four" is not in the pattern because it would flag real prose like "derive the last two" in `js-modules-2`. I fixed those three texts by hand.
2. `npm run check:content` prints `questions: 434` with no problems.
