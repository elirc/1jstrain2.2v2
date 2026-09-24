---
id: J03
title: Rules before content - lint.js and stats.mjs
area: tooling
closes: []
ladder: [B03, B09, B01]
adrs: [0008 unchanged]
status: landed
---

# Rules before content - lint.js and stats.mjs

Date 2026-09-24 · Author Claude (tooling implementer) · Area tooling · Commit uncommitted working tree (baseline 6f1bf43)
Closes – (precondition for the content expansion, J36–J37) · Ladder B03, B09, B01 · ADRs 0008 unchanged

## Symptom
At the baseline a learner could pass most of the curriculum without reading it. `node content/tools/stats.mjs`, run on a `git archive 6f1bf43` copy (J34), printed:

```
mcq/output answer index: 0:15 1:363 2:9 3:2 (max share 93% of 389)
correct choice uniquely longest: 335/389 (86%)
booleans: 2 true / 15 false
```

`npm run check:content` passed anyway, because nothing in `validateContent()` looked at authoring quality. The curriculum was about to grow to 1,047 questions by several authors, each able to reproduce these tells by habit.

## Root cause
`package.json › "check:content" (L19 @ 6f1bf43)`
```json
"check:content": "node --input-type=module -e \"import('./content/index.js').then(m=>console.log(m.validateContent().counts))\"",
```
`validateContent()` checked structure (tracks, stages, membership) and `q()` checked each question's shape (ADR-0008). The invariant nobody enforced: *over any module, and over the whole curriculum, the key's position, its length and the true/false split carry no information.* A structural validator cannot see a distribution.

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing; rely on the server shuffle (J12) | Nothing | Shuffling hides position from drills, not length or the boolean split, and the next author still writes the key second. |
| B | The dx review's `content/lint.js` as a new file, with position skew and boolean balance as **errors** | A file, a CLI | The content implementers had already shipped a `lint.js` that `validateContent()` calls at boot. An error there stops the server. |
| C | Merge into their `lint.js` as **warnings**, add a CLI with `--strict`, keep `stats.mjs` as the author's view | ~90 lines | chosen |

## Decision and trade-off
I chose C. `content/lint.js` belongs to tooling but runs at every server start, so the rule is: a *problem* is something that is never right (a `why` that names a position, an `output` question with no code, markdown the renderer cannot draw); a *warning* is a judgement about a distribution, and boot must never fail on one. `npm run check:content -- --strict` turns warnings into a failure for anyone who wants the gate. What I gave up is the review's hard stop on skew. Revisit when the warnings have been at zero for a release: then CI can run `--strict`.

## The change
`content/lint.js` gains `LIMITS`, `KNOWN_LANGS` and `uniquelyLongest()`, and `lintContent()` gains eight warnings next to the content team's existing problems and per-module skew warnings. The thresholds, from `content/lint.js › LIMITS` (working tree):

```js
  maxGlobalPositionShare: 0.4,
  minGlobalPositionSample: 20,
  minBooleanMinority: 0.3,
  minBooleanSample: 10,
  maxLongestShare: 0.5,
  minLongestSample: 8,
  minPrimerWords: 300,
  maxPrimerWords: 1800,
  minObjectives: 3,
  maxObjectives: 6,
```

Why each sits where it does. With four choices chance is 25%, so 40% of 795 answers at one index is far outside noise. A module is flagged for length when the key is strictly the longest in more than half of at least eight mcq/output questions; chance is about a quarter, and `stats.mjs` tells authors to aim under 40%. Booleans are only judged curriculum-wide, because no module has enough of them for a per-module rule to mean anything; the rarer answer must be 30%. The review set the primer ceiling at 900 words against baseline primers of 317–577; the expansion deliberately wrote 749–1,599, so the ceiling is 1,800, a guard against a runaway primer rather than a style rule. Every module has four objectives; 3–6 is the band. Duplicates key on prompt plus code, because "What is logged?" legitimately repeats. `KNOWN_LANGS` is what `client/src/components/Code.tsx` highlights, its aliases, and the plain-text languages authors use on purpose (`css`, `html`, `http`, `yaml`, `text`); anything else is a typo.

`content/tools/check.mjs` replaces the escaped one-liner: it calls `validateContent()`, prints counts and a warning total, and exits 1 on `--strict` when there are warnings. `npm run content:stats` runs the content team's `tools/stats.mjs`.

## Verification
1. The same rules on the baseline (`lintContent` from the working tree over a `git archive 6f1bf43` copy): 17 problems and 61 warnings, among them `curriculum: 363/389 (93%) mcq/output answers sit at index 1`, `curriculum: booleans are 2 true / 15 false`, and 29 modules where the key is the uniquely longest choice.
2. Today, `npm run content:stats`: `mcq/output answer index: 0:203 1:201 2:197 3:194 (max share 26% of 795)`, `correct choice uniquely longest: 188/795 (24%)`, `booleans: 32 true / 40 false`. `npm run check:content` prints `1047 questions, 53 modules, 10 stages, 9 tracks` and `0 warning(s)`.
3. A fixture (two modules, 28 mcq, 12 booleans, duplicate prompts, `lang: 'jss'`, a ` ```cobol ` fence, a four-word primer with two objectives) produces one warning per new rule and no false problem.

## What a senior reviewer would ask
- *Zero warnings on day one: are the thresholds too loose?* The rates come from chance, not from today's numbers (the primer ceiling is the exception), and at the baseline the new ones fire 31 times. Zero today reflects J34's permutation and the expansion authors rewriting distractors.
- *Why do the content team's per-module rules stay at 50% and 80%?* A 14-question module clumps by chance, as three did after the permutation; the global check is where skew is unambiguous.
- *Does `POSITION_WORDS` still false-positive on "the first one with a default"?* Yes, at the baseline it flagged `js-functions-11`. The content team rewrote the prose rather than weaken the rule; I left it.

## The junior version of this fix
Add every check as a problem so the numbers "cannot come back". The next person to add a module with nine booleans that happen to be seven-to-two cannot start the server to preview their own primer.

## Follow-ups
- [ ] `content/lint.test.js` pinning each rule on fixtures → content tooling
- [ ] CI runs `check:content -- --strict` once warnings have stayed at zero for a release → J05 follow-up
