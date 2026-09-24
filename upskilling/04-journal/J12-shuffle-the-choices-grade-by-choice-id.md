---
id: J12
title: Shuffle the choices, grade by choice id
area: server+client
closes: [M-01]
ladder: [B04, B06, B03]
adrs: [0014 new, 0002 amended]
status: landed
---

# Shuffle the choices, grade by choice id

Date 2026-09-24 · Author Claude (server implementer; the client half is the client implementer's, in the same change) · Area server+client · Commit uncommitted working tree (baseline 6f1bf43)
Closes M-01 · Ladder B04, B06, B03 · ADRs 0014 (new), which amends 0002

## Symptom

At the baseline the key was index 1 in 363 of 389 `mcq`/`output` questions, served in authored order: pressing `2` every time scored 93% and mastered stages unread. Reproduce at `6f1bf43` by counting `q.answer` (`{ 0: 15, 1: 363, 2: 9, 3: 2 }`), then open any drill: screen order is file order.

## Root cause

`content/schema.js › builtChoices (L52 @ 6f1bf43)` builds choices in authored order:
```js
      builtChoices = choices.map((text, i) => ({ id: `${id}-c${i}`, text: String(text) }));
```

`content/schema.js › publicQuestion (L118–121 @ 6f1bf43)` keeps that order, the routes send it as-is, and `server/src/grade.js › expected a choice index (L34–38 @ 6f1bf43)` grades the integer the client sends against the authored index:
```js
    case 'output': {
      if (!Number.isInteger(response)) return { correct: false, reason: 'expected a choice index' };
      return { correct: response === question.answer };
    }
```

The wire format is a *displayed position*, so the server cannot shuffle without breaking grading. The invariant: *where the correct choice appears carries no information, and the grader never needs to know what the learner saw.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | The product's core promise stays false. |
| B | Rebalance authored positions | 389 edits | Fixed positions are memorised across reviews, and the next author repeats the habit. The content team did rebalance (now `{0: 90, 1: 103, 2: 96, 3: 104}` of 399), as hygiene, not the fix. |
| C | Shuffle on serve; integers still accepted and read as *authored* index | ~30 lines | Every client that sends a *displayed* index is silently mis-graded, forever, including any stale tab. There are no third-party clients of a local tool to be compatible with. |
| D | Shuffle in the client | Client only | The server cannot verify what was shown, and randomness moves into render code. |
| E | Shuffle on every serve in the server; the response is the **choice id**; integers are `400 invalid_response` | ~60 server lines, client in the same change | **Chosen**, and recorded as ADR-0014. |

## Decision and trade-off

I chose E. The ids already existed (`<questionId>-c<authoredIndex>`) and travel with the text, so the grader maps id to authored index with a per-question `Map`; the client treats them as opaque. The cost: server and client must ship together, since either half alone breaks every choice answer. Rejecting integers makes that loud: a stale tab gets an error banner, not a wrong grade.

The **contract** (CONTRACT.md §1–2), as built:
- Every serve shuffles `choices` for `mcq`, `output`, `multi` and `order`; an `order` question is reshuffled until it is not already solved.
- The response is one id (`mcq`/`output`), `string[]` of ids (`multi`, deduplicated; `[]` is wrong, not invalid), or every id exactly once (`order`). `boolean`/`short` are unchanged.
- The reveal keeps `answer` in authored form and adds `answerChoiceIds`: `[id]`, the correct ids, or the ids in the correct sequence.

**The client-side implication.** Render `choices` in the order received and delete the client's `shuffled()`. Selection and `order` state hold ids. Paint the tick from `answerChoiceIds` via `choices.findIndex`, never from `answer` (an authored index: the wrong button). Compare `order` as `ordering[i] === answerChoiceIds[i]`.

Two tells survive any shuffle: today the key is the uniquely longest choice in 345 of 399 questions (86%), and 6 of 18 booleans are true. That is content work (J34). `server/test/content.test.js` has three tripwires (index share ≤ 50% per module, uniquely-longest ≤ 40%, booleans 35–65% true), `it.todo` unless `CONTENT_TRIPWIRES=1`, to become hard gates when the content lands.

## The change

`server/src/present.js` is new (`presentQuestion(question, rng)`), and it is used by sessions, the module view and question detail. `server/src/grade.js` grades by id and adds `answerChoiceIds` to `revealFor`. `check.js` and all tests answer with `choices[i].id`.

After, `server/src/grade.js` (working tree):
```js
      if (typeof response !== 'string') return invalid('expected a choice id');
      const index = choiceIndex(question).get(response);
      if (index === undefined) return invalid('unknown choice id');
      return { valid: true, correct: index === question.answer };
```

## Verification

1. `server/test/grade.test.js` › *mcq/output accept the matching choice id and reject the integer index as malformed*. At the baseline, `grade(mcq, "js-values-1-c0")` returns `{ correct: false, reason: 'expected a choice index' }`.
2. `server/test/content.test.js` › *the shuffle actually moves the correct choice (index 0..3 all observed for a 4-choice mcq)*. At the baseline only the authored index is ever observed.
3. `server/test/http.test.js` › *questions carry a reason and no answer key; choices are shuffled per serve* fetches the same question 8 times and expects more than one order.

## What a senior reviewer would ask

- *Why keep `answer` in the reveal at all?* The contract keeps the authored form for consumers of the content package. The risk is a client painting from it; CONTRACT.md §2 says the client ignores it for choice types, and this entry repeats it.
- *Could the id leak the key?* No. The suffix is the authored index, which is uniform after the content rebalance and meaningless for display.
- *What about questions answered before the change?* Nothing stored references a display position. Attempts store only `correct`, so history is untouched.

## The junior version of this fix

Shuffle inside `presentQuestion` and leave the grader alone. Every test that answers with `q.answer` still passes, because the tests send authored indices. In production every learner is graded against the authored index while clicking a displayed one, so roughly three answers in four are marked wrong, with no error anywhere.

## Follow-ups

- [ ] Flip the three tripwires from `todo` to hard tests when J34 lands → J34
- [ ] Client: delete `shuffled()`, hold ids in state, paint from `answerChoiceIds` → client entry in the same change (J30)

## Update 2026-09-24

Tripwire numbers against the 1,047 questions at review time (`CONTENT_TRIPWIRES=1`): no module has one authored index over 50% (worst `web-css` at 33%; overall `{0: 203, 1: 201, 2: 197, 3: 194}` of 795 mcq/output); the key is the uniquely longest choice in 370 of 795 (46.5%, limit 40%, still red); booleans are 34 of 72 true (47%, passes). The content rebalance is still running, so the gate stays `it.todo`.
