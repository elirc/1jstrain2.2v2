---
id: J41
title: Show one question's history, and recent attempts across questions
area: server
closes: []
ladder: [B06, B04]
adrs: [0002 unchanged]
status: landed
---

# Show one question's history, and recent attempts across questions

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes none (feature, CONTRACT.md §6–7) · Ladder B06, B04 · ADRs 0002 unchanged (the key is still revealed only after an attempt)

## Symptom

A learner cannot see what they got wrong yesterday. The explanation (`why`), which is the actual teaching, appears once, in the drill, and is gone when the page changes. At `6f1bf43`, `GET /api/questions/js-values-1` and `GET /api/attempts` are both 404s. The attempt log exists, but nothing reads it except the XP and heatmap aggregation.

## Root cause

It is a missing read path, constrained by an existing rule. `server/src/grade.js › revealFor (L73–80 @ 6f1bf43)` is only ever called from `POST /answers`, so the answer key reaches the browser only in response to an attempt (ADR-0002). A question view has to keep that promise: *the key is visible to a profile only once that profile has attempted the question.* The attempt log also had no stable id to page by, and no index for "this profile, this question".

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Reviewing mistakes, the highest-value study activity, stays impossible outside the drill. |
| B | Return `why` in `/modules/:id` for attempted questions | ~5 lines | It bloats the module payload, and there is still no way to list recent mistakes across modules. |
| C | Offset pagination (`?page=3`) on attempts | Simple | New answers shift the pages while the learner reads, so items repeat or vanish. |
| D | `GET /api/questions/:id` (question, state, flag, reveal-if-attempted, last 20 attempts) and `GET /api/attempts` paged by attempt id (`before` → `nextBefore`) with filters | ~120 lines | **Chosen.** |

## Decision and trade-off

I chose D (CONTRACT.md §6–7). The question comes back through `presentQuestion`, so its choices are shuffled like everywhere else (J12). `reveal` is `null` until the profile has at least one attempt or a non-zero card state, and afterwards it is the same `revealFor` payload as `/answers`, including `answerChoiceIds`. `history` is newest first, capped at 20, and includes `gaveUp`.

`/api/attempts` is newest first by attempt id, with `limit` from 1 to 200 (default 50) and optional `correct`, `moduleId` and `questionId` filters. It fetches `limit + 1` rows, so `nextBefore` is `null` exactly when there is no further page, with no `COUNT`. Each item is joined with the content's `type` and `prompt`. For a question since removed from the content these are `null` rather than the row being dropped, because the learner's history is still true. Stable attempt ids on the JSON backend came from J19. `idx_attempts_profile_question` (migration v2) serves the per-question history.

What it costs: paging by id assumes ids increase with time. That holds for live answers and for imports, which insert chronologically (J40). It would break if two stores were ever merged. Revisit then, and page by `(answeredAt, id)` instead.

## The change

`server/src/routes/questions.js` is new: question detail, attempts, and flags (J38). The store gains `queryAttempts(profileId, { limit, before, correct, moduleId, questionId })` on both backends. SQLite caches one prepared statement per filter combination (16 at most). `server/src/validate.js › queryInt` turns query-string digits into integers before `int()` checks them, so `?limit=abc` is a 400, not `NaN`.

After, `server/src/routes/questions.js` (working tree):
```js
    const rows = store.queryAttempts(profileId, { limit: limit + 1, before, correct: …, moduleId, questionId });
    const page = rows.slice(0, limit);
    // …
        nextBefore: rows.length > limit ? page[page.length - 1].id : null,
```

## Verification

1. `server/test/http.test.js` › *GET /questions/:id hides the answer until attempted, then shows reveal and history*: before an attempt `reveal: null` and `history: []`, and after one wrong answer the reveal matches `revealFor` and the history has one row with `gaveUp: false`. At the baseline the route is a 404.
2. `server/test/http.test.js` › *GET /attempts pages newest first with nextBefore and filters by correct and module*: five answers read two at a time across three pages, the last with `nextBefore: null`, plus the `correct=true` and `moduleId` filters and `limit=500` → 400 naming `limit`.
3. `server/test/store.test.js` › *queryAttempts pages newest first by id, with correct/module/question filters*, on both backends.

## What a senior reviewer would ask

- *Can a learner read keys by browsing?* Only for questions they have already answered, which is exactly what the drill reveals. `reveal: null` before that is asserted over HTTP.
- *Why is the question reshuffled on every view?* The contract says every served question is shuffled. A stable order on the detail page would let a learner memorise positions there.
- *Is there an N+1 in the join to the content?* No. `getQuestion` is an in-memory `Map` lookup, and there are at most 200 per page.

## The junior version of this fix

`SELECT * FROM attempts WHERE profile_id = ? ORDER BY answered_at DESC LIMIT ? OFFSET ?`, with a `reveal` built from `question.answer`. Both look standard. The offset pages skip or repeat rows as soon as the learner answers another question in a second tab, and the reveal leaks the authored index. With shuffled choices that paints the wrong button, the same trap J12 describes.

## Follow-ups

- [ ] Client: "Mistakes" page (`/api/attempts?correct=false`), expand to `/api/questions/:id` → client entry
