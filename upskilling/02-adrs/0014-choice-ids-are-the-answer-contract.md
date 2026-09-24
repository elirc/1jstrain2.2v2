---
id: ADR-0014
title: Choice ids are the answer contract
status: accepted
date: 2026-09-23
amends: [ADR-0002]
supersedes: null
---

# ADR-0014: Choice ids are the answer contract

Status: accepted, amends ADR-0002 · Date 2026-09-23 · Written with J12
Anchors: `content/schema.js › builtChoices (L52 @ 6f1bf43)`, `server/src/grade.js › expected a choice index (L34–38 @ 6f1bf43)`

## Context
At the baseline the key was choice index 1 in 363 of 389 single-answer questions, and choices were served in authored order, so "always press 2" scored 93% (M-01). The wire format was a displayed position, so the server could not reorder choices without breaking grading. Every choice already carried a stable id, `<questionId>-c<authoredIndex>`, that nothing used. The client and the server ship from one repository, and there are no third-party API consumers.

## Decision
We shuffle `choices` for `mcq`, `output`, `multi` and `order` every time a question leaves the server (sessions, module view, question detail). The client answers with **choice ids**: one id, a set of ids, or every id in order. Ids are opaque to the client, which renders choices in the order received and never shuffles. An integer index, an unknown id, a wrong length or a duplicate is `400 invalid_response`. The reveal keeps `answer` in authored form and adds `answerChoiceIds`, which is what a client must use to mark the right choices.

## Evidence
`server/src/grade.js` (working tree) maps the id to its authored index. It never parses the id string:
```js
      const index = choiceIndex(question).get(response);
      if (index === undefined) return invalid('unknown choice id');
      return { valid: true, correct: index === question.answer };
```
Enforced by `server/test/grade.test.js` › *mcq/output accept the matching choice id and reject the integer index as malformed*, `server/test/content.test.js` › *the shuffle actually moves the correct choice…*, and `server/test/http.test.js` › *questions carry a reason and no answer key; choices are shuffled per serve*.

## Consequences
- Good: position carries no information, and the grader never needs the display order.
- Good: a stale client fails loudly (400) instead of being silently mis-graded.
- Cost: the server and client halves must ship in one change.
- Cost: two tells survive any shuffle. The key is the uniquely longest choice in 86% of questions, and booleans lean false. Content work (J34), guarded by gated tripwires in `server/test/content.test.js`.
- Forces on future work: question and choice ids are a persisted, cross-process contract (B04). Reordering authored choices changes ids and orphans nothing stored (attempts store only `correct`), but renaming a question id does.

## Alternatives rejected
- **Rebalance authored positions only.** Positions can still be memorised, and the next author repeats the habit.
- **Shuffle, but keep integers as authored indices.** A client sending displayed indices would be mis-graded with no error.
- **Shuffle in the client.** The server could not verify what was shown, and randomness would move into render code.

## Breaks first at
Third-party clients. If anyone outside this repository consumed the API, rejecting integers would need a versioned endpoint.

## Revisit when
- A client other than `client/` needs to answer questions.
- The content tripwires pass: then gate them permanently and consider dropping `answer` from the reveal for choice types.
