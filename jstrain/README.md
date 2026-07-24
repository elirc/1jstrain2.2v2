# jstrain — from "I barely know JavaScript" to JS + TypeScript + React

A test-graded problem set. Every exercise is a function or component with the
behaviour described in a comment and a `throw new Error('TODO')` for a body.
You delete the throw, write the code, and run the tests until they go green.

**274 numbered problems across 24 files, graded by 1057 tests.** (325 things
to implement in total — some problems ask for a small family of functions.)
Nothing to configure, no tutorial to read, no server to run — just
`npm install` and start failing tests on purpose.

This assumes you can already program (loops, functions, types, recursion) and
that JavaScript specifically is the gap.

---

## Getting started

```bash
npm install          # once
npm test             # run everything (they all fail at first — that is the point)
npm run watch        # re-run automatically as you save
```

Work one file at a time. Open `exercises/js/01-values-and-types.js`, read the
header comment, solve PROBLEM 1, and run just that module:

```bash
npx vitest run tests/js/01-values-and-types.test.js
```

Or leave `npm run watch` running in a terminal and let it re-run on save.

### The commands you will use

| Command | What it does |
| --- | --- |
| `npm test` | Run every runtime test |
| `npm run watch` | Re-run affected tests on save |
| `npm run test:js` | Just the JavaScript track |
| `npm run test:ts` | Just the TypeScript track |
| `npm run test:react` | Just the React track |
| `npm run test:capstone` | Just the capstone |
| `npm run test:types` | The **type-level** tests (TypeScript track only) |
| `npm run typecheck` | `tsc --noEmit` over everything |
| `npm run verify:solutions` | Run the tests against the reference answers |

`npm test` never type-checks — it only runs code. The TypeScript track has a
second grader, `npm run test:types`, which checks the types themselves with
`tsc`. Both must pass for the TS modules. (`npm run typecheck` will report
errors until you have finished the TS track — that is expected.)

---

## How the repo is laid out

```
exercises/     ← the files you edit
  js/          10 modules of plain JavaScript
  ts/           6 modules of TypeScript
  react/        6 modules of React
  capstone/     2 integration challenges
tests/         ← the grader (read it, do not edit it)
solutions/     ← reference answers, for AFTER you have tried
```

Tests import your work through the `@ex/` alias, so
`@ex/js/03-arrays.js` means `exercises/js/03-arrays.js`. That indirection is
what lets `npm run verify:solutions` point the same tests at `solutions/`
instead.

---

## The curriculum

### Track 1 — JavaScript (`exercises/js`, 131 problems)

| Module | What it drills |
| --- | --- |
| 01 values-and-types | coercion, `==` vs `===`, NaN, falsiness, `??` vs `\|\|`, float rounding |
| 02 functions-and-scope | closures, `once`, currying, private state, the `var` loop bug, hoisting |
| 03 arrays | map/filter/reduce, groupBy, non-mutating sorts, set operations, a real report query |
| 04 objects | destructuring, deep clone/merge, immutable path updates, normalising API data |
| 05 strings-and-regex | slugify, templating, query strings, regex, parsing log lines |
| 06 this-classes-prototypes | the four `this` rules, `bind` by hand, private fields, EventEmitter, getters, inheritance |
| 07 async | promises, sequential vs parallel, timeout, retry with backoff, bounded concurrency, AbortSignal, the event loop |
| 08 iterators-generators | the iteration protocol, lazy pipelines, infinite sequences, async generators |
| 09 errors-collections-dates | custom errors, `cause`, Result types, LRU cache with Map, WeakMap, date arithmetic |
| 10 functional-patterns | pipe/compose, memoize, debounce/throttle, deepEqual, reducers, a mini Redux with middleware |

Module 10 is deliberately the bridge: you build `useReducer`, `useMemo` and
`createStore` by hand before React hands them to you.

### Track 2 — TypeScript (`exercises/ts`, 73 problems)

| Module | What it drills |
| --- | --- |
| 01 basic-types | unions, literal types, tuples, `unknown` vs `any`, `as const`, `never` and exhaustiveness |
| 02 generics | inference, constraints, `keyof`, generic classes and factories, a `Result<T, E>` type |
| 03 narrowing-unions | discriminated unions, type predicates, assertion functions, parsing unknown data |
| 04 utility-and-mapped-types | rebuild Partial/Pick/Omit/Record by hand, key remapping, `DeepPartial`, `OptionalKeys` |
| 05 conditional-and-template-types | `infer`, distribution, recursive types, `CamelCase<S>`, `Path<T>`, a typed event emitter |
| 06 typing-real-code | branded ids, overloads, typed reducers, validated API responses, `satisfies`, `this` types |

Each module is graded twice: behaviour (`*.test.ts`) and types
(`*.test-d.ts`). The type tests use `expectTypeOf` and `@ts-expect-error`, so
a type that is merely *close enough* still fails.

### Track 3 — React (`exercises/react`, 57 problems)

| Module | What it drills |
| --- | --- |
| 01 components-and-props | JSX, props, lists and keys, `children`, the `{count && …}` zero bug |
| 02 state-and-events | `useState`, the updater form, controlled inputs, form validation, immutable updates, lifting state |
| 03 effects-and-data | cleanup, the three states of a fetch, **race conditions**, debouncing, AbortController, the effect you do not need |
| 04 hooks | `useReducer`, `useRef`, `useMemo`/`useCallback` with `React.memo`, custom hooks, `useInterval` |
| 05 context-and-composition | context with a safe hook, compound components, render props, slots, a cart store |
| 06 building-a-feature | pure helpers → hook → components → screen: search, sort, pagination, optimistic updates |

Tests use React Testing Library and query by role, label and text — the way a
user (and a screen reader) sees the page. If a query cannot find your element,
your markup probably is not accessible.

### Capstone (`exercises/capstone`)

1. **Analytics pipeline** — validate untrusted JSON, bucket by day, compute
   percentiles, build and format a report.
2. **Dashboard** — put that pipeline on screen with loading/error states, a
   date filter that re-derives without re-fetching, and optimistic-free but
   honest async handling.

---

## How to actually learn from this

1. **Read the module header first.** Every file opens with the concepts you
   need. It is short and it is the lesson.
2. **Try before you look.** Getting stuck for ten minutes is the exercise.
3. **Read the test when you are stuck.** The tests are written to be read;
   they spell out the edge cases and often explain *why* in a comment.
4. **Then read the solution** in `solutions/` and diff it against yours. If
   yours passes but looks different, that is fine — check whether the
   reference is simpler and why.
5. **Do not skip the "why" tests.** Several tests exist purely to make a
   concept visible: the `var` loop bug, the coercion table, the `0` render
   bug, the race condition. Those are the ones that will bite you at work.

Suggested pace: JS 01–05 in week one, JS 06–10 in week two, TS in week three,
React in weeks four and five, capstone in week six. Faster is fine; skipping
the JS track to get to React is not.

---

## Notes

- No frameworks, no build step to configure. Node 20+, Vitest, React 19,
  TypeScript 5.
- Never edit anything in `tests/`. If a test looks wrong, it is more likely
  the spec is stricter than you assumed — re-read the docblock.
- `solutions/` is a reference, not gospel: several problems have more than one
  good answer.
