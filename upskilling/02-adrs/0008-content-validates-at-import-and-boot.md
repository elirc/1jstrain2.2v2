---
id: ADR-0008
title: Validate content twice, per question at import and across the curriculum at boot
status: accepted
date: 2026-09-23
amended-by: []
superseded-by: null
---

# ADR-0008: Validate content twice, per question at import and across the curriculum at boot

Status: accepted · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `content/schema.js › seenIds (L11–12, L35–37 @ 6f1bf43)`, `content/schema.js › q (L19–97 @ 6f1bf43)`, `content/index.js › validateContent (L65–102 @ 6f1bf43)`, `server/src/index.js › validateContent (L24 @ 6f1bf43)`

## Context
The content is code, and a typo in it is a silently wrong quiz: an answer index out of range, a missing explanation, a module listed in no stage. The author edits JS files by hand, and there is no content CI. The first consumer to notice a bad edit would be a learner.

## Decision
We validate each question as `deck()` builds it, and throw on the first malformed one, so a bad edit fails at import time with the question id. After assembly, we check cross-references (tracks, stages, modules) in `validateContent()`, which collects every problem into one error. The server calls it before it opens the store.

## Evidence
`content/schema.js › seenIds (L11–12 @ 6f1bf43)`
```js
/** @type {Set<string>} */
const seenIds = new Set();
```
`content/schema.js › duplicate question id (L36–37 @ 6f1bf43)`, inside the closure that `q()` returns:
```js
    if (seenIds.has(id)) throw new Error(`[content] duplicate question id: ${id}`);
    seenIds.add(id);
```
`content/index.js › problems.push (L92–94 @ 6f1bf43)`
```js
  if (problems.length) {
    throw new Error(`[content] ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  }
```
`npm run check:content` and `server/src/check.js` (L33–39) run both.

## Consequences
- Good: a bad edit stops `npm run dev` with the id and the reason, before any learner sees it.
- Cost: `seenIds` is module state, which makes `q()` impure. **The cost is not "importing twice throws".** An ES module is evaluated once per realm, so a second `import` returns the same instance, and a fresh evaluation (a new realm, or a cache-busted URL) gets a fresh `Set`. The real cost is that `deck()` cannot build the same ids twice in one process. A test that builds a fixture question, then builds it again in the next test, throws `duplicate question id` (verified at the baseline). The result of `q()` also depends on which decks ran before it (register F-25, corrected in `_audits/2026-09-23-upskilling.review.md` §1).
- Cost: errors arrive two ways. `q()` stops at the first bad question. `validateContent()` batches. A contributor who fixes one `q()` error learns about the next one only on the next run.
- Cost: neither layer checks meaning. Eleven questions pass every rule and are wrong (content-audit §1, M-11). Neither checks that the markdown stays in the renderer's subset (M-05), or that `output` questions have code (J03).
- Forces on future work: every new invariant chooses a layer. Per question goes in `q()`. Anything that needs the whole curriculum goes in `validateContent()`, and so does the `after` stage reference (J35).

## Alternatives rejected
- **JSON Schema over generated JSON.** There is no JSON (ADR-0001), and cross-references need code anyway.
- **Validate only in a test.** A contributor who never runs the test would ship the typo. Import-time checks cannot be skipped.

## Breaks first at
Questions and contributors. At double the deck (the planned expansion), the rule set must grow first: id prefix matches module, `short` without choices, difficulty spread, position and length tells (J03, J34). Otherwise the new content lands under the old rules.

## Revisit when
- A test needs to build the same question twice. Move the duplicate check into `validateContent()` over the assembled list, and make `q()` pure.
- Content moves out of the repo.
