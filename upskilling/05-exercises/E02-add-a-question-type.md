# E02: Add a question type

Level: senior · Timebox: half a day · Touches: server | client | content
Ladder: B02, B04, B06 · Depends on: J12 and ADR-0014 (choice ids are the answer contract), J30 (the drill as a state machine), J31 (order questions)

## Scenario

The content team wants a `match` type: four terms on the left, four definitions on the right, and the learner pairs each term with its definition. "Match `202`, `204`, `409` and `422` to their meaning" is the first question they want to write. Today they fake it with an `order` question, and learners report that it reads as a trick.

## Deliverables

1. The type, end to end, on the choice-id contract: authoring and validation, grading, presentation, the reveal, the client draft and its rendering, and at least one real question in `content/questions/web.js`.
2. Tests at every layer (see Done when), each written to fail before the layer changes.
3. A half-page note: the wire shape you chose for the `response`, what the server rejects as `400 invalid_response`, and what a browser tab loaded before the deploy does when it is served a `match` question.

## Constraints

- The key never reaches the browser (ADR-0002). A field that encodes which right item belongs to which left item is a key, whatever it is called.
- Ids stay opaque and stable: `<questionId>-c<authoredIndex>` for existing types. Existing questions keep every id (B04).
- The client never shuffles and never grades (ADR-0014). No `dangerouslySetInnerHTML`.
- Keyboard-only use works, with focus kept on the control that moved (J31).

## Starting points

- `content/schema.js › q()` and `publicQuestion()`, `content/types.d.ts › QuestionType` (working tree)
- `server/src/grade.js › grade()` and `revealFor()`, `server/src/present.js › SHUFFLED_TYPES` (working tree)
- `client/src/lib/types.ts › AnswerResponse`, `client/src/pages/drill/useDrillSession.ts › Draft`, `initialDraft`, `toResponse`, `revealedIds` (working tree)
- `client/src/pages/drill/QuestionCard.tsx`, `ChoiceList.tsx › TYPE_HINT`, `OrderList.tsx`, `Summary.tsx`, `keys.ts`
- `content/lint.js`, `content/tools/stats.mjs`, `content/tools/check.mjs`

## Done when

- `npm run check:all` passes (lint, format, content check, server smoke and suite, client typecheck and tests, build).
- New cases in `server/test/grade.test.js`: correct, wrong, and each malformed shape as `valid: false`; the two property tests still cover every question, including the new one.
- `server/test/content.test.js` › *publicQuestion and presentQuestion never contain answer/why/ask* is extended to prove that the served `match` question cannot be graded from its own fields.
- `client/src/pages/drill/useDrillSession.test.ts` › *maps each question type, with ids for choice types* covers `match`, and `DrillPage.test.tsx` has a keyboard-only pairing test.
- `node .github/scripts/answer-key-leak.mjs client/dist/assets` passes after the build.

## Stretch

Give partial credit for three of four pairs. Say what it does to `schedule()`, to XP and to "mastered", and whether you would ship it.

<details><summary>Reviewer notes (open after attempting)</summary>

**A strong answer** stores the pairs as authored and serves two independently shuffled id lists (left ids `-l<i>`, right ids `-r<i>`), never pairs, because authored pairs are the key. Its `response` is an array of right ids in the order the left ids were served, which keeps `AnswerResponse` as `string | string[] | boolean` and reuses the "every id exactly once" checks from `order`. It adds `match` to `SHUFFLED_TYPES`, gives `revealFor` an `answerChoiceIds` form, and extends `lint.js` and `stats.mjs` so the content rules cover the type.

**Common mistake:** adding `pairs` to the question and relying on `publicQuestion()`, which strips only `answer`, `why` and `ask`. Every test still passes and the key ships. The content test in Done when exists to catch exactly this.

**What a senior also flags:** a stale tab. `QuestionCard` falls through to `ChoiceList` for an unknown type, and `toResponse` returns `undefined`, so Submit stays disabled and only "Show me the answer" works. That is survivable, but it should be a decision, written down. The other option is a server that filters out types the client does not declare. Finally, the content and the server must ship together: `q()` throws `unknown type` at import, so a content package with a `match` question cannot boot an older server (ADR-0008).
</details>
