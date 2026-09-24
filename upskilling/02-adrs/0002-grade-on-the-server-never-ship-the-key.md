---
id: ADR-0002
title: Grade on the server; never ship the key
status: accepted
date: 2026-09-23
amended-by: [ADR-0014]
superseded-by: null
---

# ADR-0002: Grade on the server; never ship the key

Status: accepted, amended by ADR-0014 (choice ids are the answer contract, written with J12) · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `server/src/grade.js › grade (L1–9, L32–71 @ 6f1bf43)`, `server/src/grade.js › revealFor (L74–80 @ 6f1bf43)`, `content/schema.js › publicQuestion (L118–121 @ 6f1bf43)`, `server/src/check.js › publicQuestion strips answer (L42–44, L118 @ 6f1bf43)`

## Context
This is a quiz app whose security module teaches "never trust the client". If the browser held the key, a learner could read it in DevTools, and so could any bug that logs a question. The schedule, the XP and the stage unlocks are all computed from graded attempts, so where grading happens decides whether any of those numbers can be trusted.

## Decision
We strip `answer`, `why` and `ask` from every question before it leaves the server, grade on the server, and return the teaching payload only in the response to an attempt.

## Evidence
`content/schema.js › publicQuestion (L118–121 @ 6f1bf43)`
```js
export function publicQuestion(question) {
  const { answer, why, ask, ...rest } = question;
  return rest;
}
```
`server/src/check.js › publicQuestion strips answer (L42–44 @ 6f1bf43)` checks one question. L118 checks that a daily session carries no `answer`. Nothing checks `GET /modules/:id`, which relies on the same function (`server/src/routes/api.js › publicQuestion (L81 @ 6f1bf43)`).

## Consequences
- Good: the key never reaches the bundle or the network until the learner has committed.
- Cost: every answer is a round trip, so there is no offline mode.
- Cost: hiding the key is not enough if its **position** gives it away. Choices are sent in authored order, and the key is index 1 in 363 of 389 mcq/output questions. "Always press 2" scores 93% (server B1, register M-01). The decision protected the key's value and ignored its position. ADR-0014 fixes this by shuffling on every serve and grading by choice id.
- Cost: `grade()` returns `{ correct: false, reason }` for a malformed response. The route records it, schedules a lapse and reveals the key (server B3, M-02; fixed in J09 as `400 invalid_response`).
- Forces on future work: any new question type needs a grader branch and a reveal shape, and the client must render only what the server sends.

## Alternatives rejected
- **Grade in the browser with a hashed key.** The hash of a four-way choice is brute-forced by trying four values.
- **Ship the key and trust the learner.** It is fine for flashcards. It is not fine for an app that computes mastery and teaches this exact rule.

## Breaks first at
Request volume. Grading is a `switch` over six types and costs nothing. At many learners per install, the pressure is on idempotency: a retried `POST /api/answers` records twice (F-07).

## Revisit when
- An offline mode is required. Then the client needs signed, deferred grading, not the key.
- A question type needs a grader too heavy for a request, such as running code.
