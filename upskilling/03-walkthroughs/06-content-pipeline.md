# Walkthrough 06: the content pipeline

Files: `content/schema.js`, `content/index.js`, `content/types.d.ts`, `content/tracks.js`, `content/questions/*.js` · As of: 6f1bf43 · Time: ~40 min · Read first: walkthrough 01

## The job in one sentence

Turn terse, hand-written `q({...})` calls into validated `Question` objects, index them for lookup, check the curriculum's cross-references at boot, and strip the key before anything reaches the browser.

## The contract

- **In:** nine `content/questions/<track>.js` files, each exporting `deck(moduleId, trackId, [q({...}), …])` results, plus `modules` and `tracks.js`.
- **Out:** `curriculum`, `getQuestion`, `getModule`, `questionsByModule`, `validateContent`, `publicQuestion` (ADR-0001).
- **Invariant 1:** question ids are unique across the whole curriculum. Enforced at import, by `seenIds`.
- **Invariant 2:** for `mcq`/`output`, `answer` is an integer index into `choices`. For `order`, it is a permutation of every index. For `multi`, it is a non-empty, sorted set of indices.
- **Invariant 3:** every module is in exactly one stage and has at least one question. Enforced at boot, by `validateContent()`.
- **Invariant 4:** `publicQuestion(q)` has no `answer`, `why` or `ask`. Enforced for one question and for daily sessions only (`server/src/check.js`, L42–44 and L118).
- **Invariant 5 (not enforced anywhere):** the key's position and length carry no information.

## Read it in this order

1. `content/schema.js › q (L1–9, L19–97 @ 6f1bf43)`. Authoring shape in, `Question` out.
2. `content/schema.js › deck (L107–115 @ 6f1bf43)`. Where module and track are bound.
3. `content/index.js › questionsByModuleId (L23–59 @ 6f1bf43)`. Assembly and the three lookup maps.
4. `content/index.js › validateContent (L61–102 @ 6f1bf43)`. The cross-reference checks.
5. `content/schema.js › publicQuestion (L117–121 @ 6f1bf43)` next to `content/types.d.ts › PublicQuestion (L86–87 @ 6f1bf43)`.

## The lines worth stopping at

**`q()` returns a function, not a question.**
`content/schema.js › q (L19–20 @ 6f1bf43)`
```js
export function q(input) {
  return ({ moduleId, trackId }) => {
```
Authors write a question without saying which module it belongs to. `deck()` supplies that: `items.map((make) => make({ moduleId, trackId }))` (L114). Moving a question to another module means moving one line, and a question cannot disagree with the deck it sits in. Validation runs inside the closure, so it runs at *import* time, when `content/questions/js.js` evaluates its `deck(...)` calls.

**`seenIds` is module state, and the mechanism matters.**
`content/schema.js › seenIds (L11–12 @ 6f1bf43)`
```js
/** @type {Set<string>} */
const seenIds = new Set();
```
The plan this folder came from said that importing `schema.js` twice, in tests or under HMR, would throw "duplicate id". **That is wrong.** An ES module is evaluated once per realm. A second `import` returns the same module instance and the same `Set`, and nothing is rebuilt. A genuinely fresh evaluation (a new worker, or a cache-busted URL) creates a fresh `Set` and starts clean. The real costs are narrower:
1. `deck()` cannot build the same id twice in one process. A test that builds a fixture question in `beforeEach` throws on the second test (Observe 1).
2. Whether `q()` throws depends on which decks already ran. The function is not pure, so a unit test of `q()` must use ids no content file uses.

The cleaner shape checks duplicates over the assembled `questions` array inside `validateContent()`, and makes `q()` pure (ADR-0008, "Revisit when"). Register F-25.

**Choice ids are born here, and nobody uses them yet.** `` builtChoices = choices.map((text, i) => ({ id: `${id}-c${i}`, text: String(text) })) `` (L52). Every choice already has a stable id derived from its authored index. At the baseline the client uses `choice.id` only as a React key, and grading uses indices. J12 makes these ids the answer contract (contract §1, ADR-0014), so this one line becomes the most important line in the file.

**`multi` answers are sorted, `order` answers must be permutations.** `builtAnswer = [...answer].sort((a, b) => a - b)` (L61) lets `grade()` compare sets. The order check (L63–70) rejects duplicates and short lists with `new Set(answer).size !== answer.length`.

**`defaultLang` guesses from the track.** If a question has `code` but no `lang`, `csharp`/`dotnet` get `csharp`, `data` gets `sql`, and so on (L99–105). The highlighter (walkthrough 10) keys its keyword table by that string.

**The index maps are eager.** `moduleById`, `questionById` and `questionsByModuleId` are built once at import (L38–47). `questionsByModule(id)` returns the *same* array every call. A caller that sorts it in place reorders the curriculum for everyone. Nothing does today. `sessions.js` copies before shuffling (`const out = [...items]`).

**Two error styles.** `q()` throws on the first malformed question, with its id. `validateContent()` collects every problem and throws once:
`content/index.js › problems.join (L92–94 @ 6f1bf43)`
```js
  if (problems.length) {
    throw new Error(`[content] ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  }
```
Per-question rules belong in `q()`. Anything that needs the whole curriculum (stage membership, unknown modules, and after J35 the `after` reference) belongs in `validateContent()`.

**`publicQuestion` and `PublicQuestion` must change together.** The function destructures away `answer, why, ask`. The type is `Omit<Question, 'answer' | 'why' | 'ask'>`. Add a secret field to `Question`, such as a `hint` shown only after answering, and you must update both. Nothing fails if you update only one. The type would then claim the field is absent while the function ships it.

**What the position data means.** Every rule above passes, and the deck still leaks its answers. Of 389 `mcq`/`output` questions, the key is at index 1 in 363. It is the uniquely longest choice in 335, and 15 of 17 booleans are `false` (content-audit §5.1–5.3; registers M-01, M-12). The pipeline validates *shape*. It has no rule about *information*, and authors put the right answer second, and longest, out of habit. Two lessons follow. Shuffling on the server (J12) fixes position but not length, which needs a content pass (J34). And the validator is where such a habit should be caught: a tripwire over the whole deck in `validateContent()` or a lint script (J03), not a reviewer's eye.

## Observe it

From a baseline checkout's root, after `npm install`:

1. The `seenIds` cost. The second `deck()` throws, and a second `import` returns the same module:
   ```sh
   node --input-type=module -e "
   const { q, deck } = await import('./content/schema.js');
   const item = q({ id: 'fixture-1', prompt: 'p', choices: ['a', 'b'], answer: 1, why: 'w' });
   console.log(deck('m', 'js', [item])[0].choices);
   try { deck('m', 'js', [item]); } catch (e) { console.log(e.message); }
   const again = await import('./content/schema.js');
   console.log('same instance:', again.q === q);"
   ```
   Output: the two choices `fixture-1-c0`, `fixture-1-c1`, then `[content] duplicate question id: fixture-1`, then `same instance: true`.
2. Validation messages: `answer: 2` with two choices gives `[content] x1: answer must be a choice index`, and an `order` answer `[0,0,1]` gives `… must be a permutation of every choice index`.
3. The position and length tells:
   ```sh
   node --input-type=module -e "
   const { curriculum } = await import('@jstrain/content');
   const single = curriculum.questions.filter((x) => x.type === 'mcq' || x.type === 'output');
   const at = {}; for (const x of single) at[x.answer] = (at[x.answer] ?? 0) + 1;
   const longest = single.filter((x) => { const L = x.choices.map((c) => c.text.length); const m = Math.max(...L);
     return L[x.answer] === m && L.filter((n) => n === m).length === 1; }).length;
   console.log(single.length, at, 'uniquely longest:', longest);"
   ```
   Output: `389 { '0': 15, '1': 363, '2': 9, '3': 2 } uniquely longest: 335`.
4. `npm run check:content` prints the counts. Change one `answer` to an out-of-range index and run it again.

## What is still wrong here

- M-01: the key's position gives it away (J11, J12).
- M-12: the key's length, and the boolean skew, give it away (J34).
- F-25: `seenIds` makes `q()` impure (ADR-0008 revisit).
- M-11: eleven keys or explanations are wrong and pass every rule (J33).
- M-05: nothing stops primer markdown outside the renderer's subset (J24).
- J03: four `output` questions have no code, and no rule requires it.

## Do it

1. (5 min) List which invariants are enforced in `q()`, which in `validateContent()`, and which nowhere.
2. (10 min) Find a `why` text that names a position ("Option 3…"). Explain what it will say to a learner once J12 shuffles the choices (J11).
3. (20 min) Move the duplicate-id check into `validateContent()` over `questions`, and delete `seenIds`. Show that Observe 1 no longer throws, and that a duplicated id in `content/questions/js.js` still fails `npm run check:content` and names the id.

## Check yourself

1. When exactly does `q()`'s validation run?
2. Why does a second `import('./content/schema.js')` not reset `seenIds`?
3. What breaks if someone sorts the array returned by `questionsByModule()` in place?
4. Which two artefacts must change together to add a secret field to `Question`?
5. Why can shuffling alone not fix the 86% figure?

<details><summary>Answers</summary>

1. When a `content/questions/*.js` module evaluates its `deck(...)` call, on first import of `@jstrain/content`.
2. ES modules are cached per realm. The second import gets the same instance, and so the same `Set`.
3. Every later caller sees the new order, because the map holds one shared array per module.
4. `publicQuestion()` in `schema.js`, and `PublicQuestion` in `types.d.ts`.
5. Shuffling moves the key but keeps its text. A learner can still pick the longest choice.

</details>

## After the refactor

In the working tree (uncommitted, 2026-09-24), the modules are split one file per track or author (`content/modules/js.js`, `craft-senior.js` and so on; 13 files), assembled by `content/modules/index.js`. The questions follow the same split. `validateContent()` calls `content/lint.js › lintContent`: position words and `output` without `code` are problems, and authoring tells such as answer position and the longest choice are warnings (J03, J34). `npm run check:content` now runs `content/tools/check.mjs` and prints `1047 questions, 53 modules, 10 stages, 9 tracks`. `--strict` fails on warnings. `validateContent()` also checks `stage.after` names an earlier stage (J35). Shuffling happens at serve time in `server/src/present.js`, and `publicQuestion` stays pure (J12). Observe 3 now prints `795 { '0': 203, '1': 201, '2': 197, '3': 194 } uniquely longest: 95`.
