---
id: J09
title: Malformed is not wrong - answer 400 invalid_response
area: server
closes: [M-02]
ladder: [B06]
adrs: [0002 unchanged]
status: landed
---

# Malformed is not wrong - answer 400 invalid_response

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes M-02 · Ladder B06 · ADRs 0002 unchanged

## Symptom

A response of the wrong *shape* is graded as a wrong *answer*. It is recorded as an attempt, scheduled as a lapse, and the key and explanation come back in the response. The review reproduced it over HTTP: `{"questionId":"js-values-1","response":"1"}` returned `200 correct:false`, the full `why`, and `/progress` then counted one attempt. On a mastered card, one client bug that sends `"1"` instead of `1` wipes the mastery.

At `6f1bf43`, calling the grader directly:

```
grade(mcq, "1")              → { correct: false, reason: "expected a choice index" }
grade(order, ["0","1",...])  → { correct: false }        (no reason at all)
```

Severity is S2, not S1 (see the register's reconciliation). The shipped client cannot build a malformed response: `DrillPage.tsx` blocks it. It takes a hand-written request or a future client bug, and J12 is about to change the wire format, which is exactly when client bugs of this kind appear.

## Root cause

`server/src/routes/api.js › response === undefined (L112–121 @ 6f1bf43)`
```js
    const question = getQuestion(String(questionId ?? ''));
    if (!question) throw httpError(404, 'not_found', 'No such question.');
    if (response === undefined) throw httpError(400, 'validation_failed', 'A response is required.');

    const now = new Date();
    const before = store.getCardState(profileId, question.id);
    const { correct, reason } = grade(question, response);
    const after = schedule(before, correct, now);
```

`server/src/grade.js › expected a choice index (L34–38 @ 6f1bf43)` encodes "not a possible answer" as `correct: false`. The comment at L44 states the right rule ("not punished for a UI bug"), but applies it only to duplicate `multi` indices.

The invariant: *a response that is not a possible answer to this question changes nothing and reveals nothing.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | No shipped client can trigger it. But J12 changes every choice response from an integer to an id string, and a half-updated client would lapse every card it touches. |
| B | Keep grading, but skip `schedule()` when `reason` is set | 2 lines | The key is still revealed, so a script can read every answer by sending garbage without it ever being recorded. It also depends on every shape error remembering to set a `reason`, and `order` already did not. |
| C | `grade()` returns `{ valid, correct, reason }`; `valid: false` → `400 invalid_response` before anything is read from or written to the store | ~40 lines | The grader, which knows each type's shape, decides. The route only translates. **Chosen.** |
| D | A per-type schema in the route | ~40 lines | It duplicates what the grader already knows, and the two drift apart the first time a question type changes. |

## Decision and trade-off

I chose C. `valid: false` covers the wrong JS type, an unknown choice id, an integer where an id belongs (J12), an `order` of the wrong length or with duplicates, blank or over-500-character `short` text, and an unknown question type. Two cases stay well-formed but wrong on purpose. `multi: []` is a real answer ("none of these"). An `mcq` id from the right question that is not the key is simply wrong. The cost is that a client bug now shows as an error banner instead of a quietly failed card. That is the trade I want: loud and harmless beats silent and destructive. `elapsedMs` is the one field where I went the other way. Out of range is stored as `null`, never a 400, because clock skew in a browser must not block an answer.

## The change

`server/src/grade.js`: every branch returns `valid`. `server/src/answer.js › submitAnswer` throws before `getCardState` is called. `server/src/answer.js › sanitiseElapsed` accepts integers from 0 to 3,600,000. The route checks only the request shape (`questionId` a string, `giveUp` a boolean).

After, `server/src/answer.js` (working tree):
```js
    const graded = grade(question, response);
    if (!graded.valid) {
      throw httpError(400, 'invalid_response',
        `That response does not fit a ${question.type} question: ${graded.reason}.`, { field: 'response' });
    }
```

## Verification

1. `server/test/answer.test.js` › `submitAnswer on sqlite` / `on json` › *a malformed response is 400 invalid_response: nothing recorded, nothing revealed*. At the baseline the same call returns `correct:false` and writes an attempt.
2. `server/test/http.test.js` › *a malformed answer → 400 invalid_response, nothing stored, nothing revealed* sends `mcq.answer` (an integer), `"1"`, `null` and `["x"]`, then asserts that no `why` text is in any body and that `/progress` shows 0 attempts.
3. `server/test/grade.test.js` › *property (seed 1337): for random JSON values grade never throws and returns a boolean verdict* runs 3,000 random values and asserts `valid:false ⇒ correct:false`.

## What a senior reviewer would ask

- *Why not reveal the key on a malformed answer, to help whoever is debugging the client?* Because an unrecorded request that returns the key is a free answer sheet. The key comes back only when an attempt is written.
- *Is 400 right, rather than 422?* The API already uses 400 for every "your request is wrong" case, and the code (`invalid_response`), not the status, is what a client switches on. A second 4xx status would add nothing.
- *What does the learner see?* The drill's existing error banner with the message. The card and the streak are untouched.

## The junior version of this fix

`if (reason) return res.status(400).json(...)` in the route, reusing the existing `reason` string as the signal. It looks like a one-line fix. But `grade(order, ["0","1","2"])` returns no reason at all, so exactly the malformed `order` responses would still be graded, recorded and scheduled as lapses.

## Follow-ups

- [ ] None on the server. The client must show `invalid_response` as a bug report, not as "wrong" → J27/J30
