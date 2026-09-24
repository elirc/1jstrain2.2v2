---
id: J34
title: The longest choice is the answer
area: content
closes: [M-12]
ladder: [B03, B09, B14]
adrs: [0008 unchanged, 0005 unchanged]
status: landed
---

# The longest choice is the answer

Date 2026-09-24 · Author content integrator · Area content · Commit uncommitted (baseline 6f1bf43)
Closes M-12 (in part; see Follow-ups) · Ladder B03, B09, B14 · ADRs 0008 unchanged, 0005 unchanged

## Symptom
A learner who has never read a primer can pass most modules. At the baseline, `node content/tools/stats.mjs` (run on a `git archive 6f1bf43` copy) prints:

```
mcq/output answer index: 0:15 1:363 2:9 3:2 (max share 93% of 389)
correct choice uniquely longest: 335/389 (86%)
booleans: 2 true / 15 false
multi questions whose key includes index 0: 17/18
```

In 19 of the 31 modules every mcq/output key sits at index 1. There are three independent tells: "press 2", "pick the longest" and "say false". Any one of them beats the gate at `unlockAt: 0.35`.

## Root cause
`content/questions/data.js › data-sql-1 (L6 @ 6f1bf43)` is typical. The key is the second choice and the only one that is not a near-miss:

```js
choices: [
  '`SELECT * FROM customers c INNER JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL`',
  '`SELECT * FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL`',
  ...
answer: 1,
```

The author wrote the right answer second and then wrote shorter wrong answers around it. Nothing in `validateContent()` looked at where keys sit or how long they are, and the client showed choices in authored order. The invariant: over any module, the answer's position and length must carry no information.

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing, rely on J12's shuffle on serve | Nothing in content | The server shuffle removes "press 2" from drills. But the module preview, exports and the next author all see authored order, and the length tell survives any shuffle. |
| B | Rewrite distractors in all 389 questions | Weeks of author time | This is the real fix for length, but it belongs to the authors in the expansion, not to an integration pass. |
| C | One seeded permutation, lints in `validateContent()`, a stats script; rewriting distractors stays with the authors | About a day | chosen |

## Decision and trade-off
I fixed position mechanically and added rules so it cannot come back. I left length and boolean balance to people, because only a person can write a plausible distractor. The cost is that the "longest" tell is unchanged today at 337/389 (87%). Revisit: when the expansion authors hand off, `stats.mjs` must show uniquely-longest under 40% per module. If it does not, the module goes back to its author.

## The change
- `content/tools/permute-choices.mjs` seeds a Fisher–Yates shuffle with a hash of the question id (cyrb53, then mulberry32). For every `mcq`, `output` and `multi` question it reorders the string tokens inside the `choices: [...]` literal in their existing slots, so line breaks and quote style are kept, and it rewrites `answer:`. Any block whose array does not round-trip exactly would be skipped and listed. None was skipped: 396 were permuted and 11 drew the identity. After writing, it re-imports the curriculum in a fresh process and checks that every key still points at the same choice text.
- `content/lint.js` runs from `validateContent()`. It warns when a module has more than half of its mcq/output keys at one index (with at least four), or more than 80% of its booleans (with at least five) sharing one value. It fails on positional wording (J11), on an `output` question with no `code`, on bold containing a backtick, and on markdown the renderer cannot draw (links, images, blockquotes, rules, nested list items).
- The new lints failed on eleven places at the baseline, all fixed. Four `output` questions without code became `mcq`: `js-values-4`, `js-values-7`, `js-modules-10` and `ts-shapes-11`. Seven bold spans in three primers wrapped code, for example `**always \`===\`**` in `js-values` and `**\`0\` does not.**` in `react-render`. I moved the backticks outside the bold.
- `content/tools/stats.mjs`, run with `npm run stats -w content`, prints per-module type and difficulty counts, the index histogram, the uniquely-longest share and the true/false split.

## Verification
1. `node content/tools/permute-choices.mjs` → `verified: 434 questions, every key still points at the same choice text`.
2. `npm run stats -w content` after the change:

```
mcq/output answer index: 0:93 1:98 2:95 3:103 (max share 26% of 389)
correct choice uniquely longest: 337/389 (87%)
booleans: 5 true / 12 false
multi questions whose key includes index 0: 10/18
```

3. `npm run check:content` passes with three warnings. They are chance clumps from the shuffle: `cs-linq-async` has 8 of 14 keys at index 0, `net-efcore` 8 of 14 at index 1 and `craft-testing` 7 of 13 at index 0. I left them as warnings rather than choose a seed that hides them.

## What a senior reviewer would ask
- *Does a stored attempt now point at a different choice?* No. Grading uses the choice id `<questionId>-c<index>` (CONTRACT §1), and attempts store correctness, not the index. The permutation does renumber the ids by authored position, so it has to land before any stored data records a choice id. That is why J12 treats the ids as opaque.
- *Why warn rather than fail on skew?* A 14-question module can clump by chance, as three did. The fail rules are the ones that are never right.
- *Is the permutation idempotent?* It is deterministic but not idempotent: a second run permutes again. The header says so, and nobody needs to run it again.

## The junior version of this fix
Shuffle choices in the client and call it done. The drill looks fixed. The longest-answer tell and the 15-to-2 boolean split are untouched, and the next author writes the key second again, because nothing tells them not to.

## Follow-ups
- [ ] Rewrite distractors so the key is not the uniquely longest choice, module by module → expansion authors (A1–A12)
- [ ] Balance the booleans; the 5/12 split mostly awaits new questions → expansion authors
