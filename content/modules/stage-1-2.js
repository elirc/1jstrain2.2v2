/**
 * Modules for stages 1 and 2: the JavaScript language, TypeScript, and the
 * browser platform.
 *
 * A module is the unit you sit down and study. Each carries a primer that
 * covers everything its questions test, so the app teaches rather than only
 * quizzes. Primers are markdown-lite: headings, lists, `code`, fenced blocks,
 * tables and **bold**.
 */

/** @type {import('../types.d.ts').Module[]} */
export const stage12Modules = [
  {
    id: 'js-values',
    trackId: 'js',
    title: 'Values, types and coercion',
    blurb: 'Why `==` is a trap, what falsy really means, and why 0.1 + 0.2 is not 0.3.',
    estMinutes: 25,
    objectives: [
      'Name the seven primitives and explain what makes objects different',
      'Explain `==` vs `===` without hand-waving about "type conversion"',
      'List the eight falsy values from memory',
      'Say when `??` is correct and `||` is a bug',
    ],
    primer: `
## The type system in one paragraph

JavaScript has seven primitives — \`string\`, \`number\`, \`boolean\`, \`null\`,
\`undefined\`, \`symbol\`, \`bigint\` — and everything else is an object (arrays,
functions and dates included). Primitives are compared **by value**, objects
**by reference**. That one sentence explains why \`[1] === [1]\` is \`false\` and
why passing an object into a function lets the function mutate your data.

\`typeof null === 'object'\` is a bug from 1995 that cannot be fixed without
breaking the web. Test for null with \`value === null\`, and for arrays with
\`Array.isArray(x)\` — \`typeof []\` is also \`'object'\`.

## Equality

\`===\` compares type first: same type and same value, done. \`==\` runs the
abstract equality algorithm, converting operands before comparing:

\`\`\`js
'' == 0            // true  — the string converts to a number
'0' == 0           // true
'' == '0'          // false — both strings, so no conversion happens
null == undefined  // true  — special-cased in the spec
null == 0          // false — null is loosely equal to undefined and nothing else
NaN == NaN         // false — NaN equals nothing, including itself
\`\`\`

The professional answer: **always \`===\`**, with one accepted exception —
\`x == null\` as shorthand for "null or undefined". Test for NaN with
\`Number.isNaN(x)\`, never \`x === NaN\`.

## Falsy

Eight values are falsy: \`false\`, \`0\`, \`-0\`, \`0n\`, \`''\`, \`null\`,
\`undefined\`, \`NaN\`. Everything else is truthy — including \`[]\`, \`{}\`,
\`'0'\` and \`'false'\`. Empty arrays being truthy catches people constantly;
check \`arr.length === 0\`.

## \`??\` vs \`||\`

\`||\` falls back on any falsy value. \`??\` falls back only on \`null\` or
\`undefined\`. So anywhere \`0\` or \`''\` is legitimate data — quantities,
counts, prices, user-typed text — \`||\` silently eats it:

\`\`\`js
const qty = input.qty || 1;   // user typed 0 -> becomes 1. Bug.
const qty = input.qty ?? 1;   // user typed 0 -> stays 0. Correct.
\`\`\`

Optional chaining \`a?.b\` short-circuits to \`undefined\` when \`a\` is null or
undefined — and \`a?.b.c\` still throws if \`b\` is missing, because \`?.\`
guards only the access it is attached to.

## Numbers

There is one number type: a 64-bit float. \`0.1 + 0.2\` is
\`0.30000000000000004\` because tenths are not representable in binary, exactly
as 1/3 is not in decimal. Compare with a tolerance, or — the real-world answer —
**store money as integer cents**. \`parseInt('12px')\` is \`12\` because it stops
at the first non-digit, while \`Number('12px')\` is \`NaN\`; pick the one whose
failure mode you want.
`,
  },
  {
    id: 'js-functions',
    trackId: 'js',
    title: 'Functions, scope, closures and `this`',
    blurb: 'Closures, hoisting, the four `this` rules, and why arrow functions changed everything.',
    estMinutes: 30,
    objectives: [
      'Explain a closure to a non-programmer and then to an interviewer',
      'Predict `this` in any of the four call forms',
      'Say why arrow functions ended the `const self = this` era',
      'Explain the temporal dead zone without saying "let is not hoisted"',
    ],
    primer: `
## Scope and hoisting

\`var\` is function-scoped and initialised to \`undefined\` at the top of its
function. \`let\`/\`const\` are block-scoped and *also* hoisted — but into a
**temporal dead zone**: the binding exists, and reading it before its
declaration throws \`ReferenceError\`. That distinction is the correct interview
answer; "let isn't hoisted" is the common wrong one.

Function *declarations* are fully hoisted and callable before their line.
Function *expressions* assigned to \`const\` are not.

## Closures

A closure is a function plus the variables it captured from where it was
**defined** — not where it is called. Lexical scope is fixed by source position
and never changes at runtime.

\`\`\`js
function counter() {
  let n = 0;                 // captured; stays alive after counter() returns
  return () => ++n;
}
const next = counter();
next(); next();              // 1, 2 — nothing else can touch n
\`\`\`

The classic bug:

\`\`\`js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));  // 3 3 3
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i));  // 0 1 2
\`\`\`

\`var\` gives one binding shared by all three callbacks; \`let\` creates a fresh
binding per iteration. Closures are also how you get private state, memoisation,
\`once()\`, debounce, and every custom React hook.

## The four \`this\` rules

Check them in this order:

1. **\`new Fn()\`** — \`this\` is the newly constructed object.
2. **\`fn.call/apply/bind(obj)\`** — \`this\` is what you passed.
3. **\`obj.method()\`** — \`this\` is \`obj\`, the thing left of the dot.
4. **Plain \`fn()\`** — \`undefined\` in strict mode and modules,
   \`globalThis\` otherwise.

Arrow functions sit outside this system: they have **no own \`this\`** and
inherit it lexically. That makes them right for callbacks and wrong for object
methods and prototype methods.

\`\`\`js
const user = {
  name: 'Ada',
  greet() { return \`hi \${this.name}\`; },
};
const loose = user.greet;
loose();                 // this is undefined -> throws. The dot was lost.
user.greet.call(user);   // 'hi Ada'
\`\`\`

Losing \`this\` by passing a method as a callback (\`arr.map(obj.method)\`) is
the most common cause of "cannot read properties of undefined".

## Parameters

Default parameters evaluate at call time, left to right, so later defaults can
reference earlier ones. Rest \`(...args)\` gives a real array; \`arguments\` is
array-*like* and does not exist in arrow functions. \`fn.length\` counts only
the parameters before the first default or rest parameter.
`,
  },
  {
    id: 'js-objects-arrays',
    trackId: 'js',
    title: 'Objects, arrays and immutability',
    blurb: 'Destructuring, spread, shallow vs deep copies, and the array methods you use hourly.',
    estMinutes: 30,
    objectives: [
      'Reshape an array of API objects with map/filter/reduce without looking anything up',
      'Explain why spread is shallow and when that bites',
      'Name every array method that mutates',
      'Update a nested object immutably',
    ],
    primer: `
## Reference semantics

\`const\` prevents reassignment of the *binding*, not mutation of the value —
\`const a = []; a.push(1)\` is legal. Two objects are \`===\` only when they are
literally the same object in memory.

## Copying

\`{...obj}\` and \`Object.assign({}, obj)\` are **shallow**: nested objects are
shared, so mutating \`copy.address.city\` also changes \`original.address.city\`.
For a real deep copy use \`structuredClone(obj)\` — built in, handles
Map/Set/Date/cycles, but not functions or class identity.
\`JSON.parse(JSON.stringify(x))\` is the old trick and it silently destroys
\`undefined\`, \`Date\` (becomes a string), \`Map\`, \`Set\`, \`NaN\` and
\`Infinity\`.

## Mutating vs non-mutating

Mutates: \`push\`, \`pop\`, \`shift\`, \`unshift\`, \`splice\`, \`sort\`,
\`reverse\`, \`fill\`, \`copyWithin\`.
Returns new: \`map\`, \`filter\`, \`slice\`, \`concat\`, \`flat\`, \`flatMap\`,
plus the modern \`toSorted\`, \`toReversed\`, \`toSpliced\` and \`with\`.

\`sort\` mutates **and** compares as strings by default, so
\`[10, 9, 1].sort()\` is \`[1, 10, 9]\`. Always pass a comparator:
\`.sort((a, b) => a - b)\`. In React, \`items.sort()\` on state is a bug twice
over — it mutates state and the ordering is wrong.

## The methods that matter

\`map\` transforms, \`filter\` selects, \`reduce\` folds into anything,
\`find\`/\`findIndex\` locate, \`some\`/\`every\` answer yes/no, \`flatMap\`
maps then unnests one level. \`Object.groupBy(items, fn)\` now does grouping
natively; the hand-rolled version is the classic \`reduce\`:

\`\`\`js
const byStatus = orders.reduce((acc, o) => {
  (acc[o.status] ??= []).push(o);
  return acc;
}, {});
\`\`\`

## Destructuring

\`\`\`js
const { name, address: { city } = {}, ...rest } = user;
const [first, , third = 0] = list;
function draw({ x = 0, y = 0 } = {}) {}   // the = {} is what makes draw() legal
\`\`\`

Defaults apply only to \`undefined\`, never to \`null\`. Renaming is
\`{ from: to }\`, which reads backwards the first hundred times.

## Immutable nested updates

\`\`\`js
const next = {
  ...state,
  user: { ...state.user, prefs: { ...state.user.prefs, theme: 'dark' } },
};
\`\`\`

Every level you change must be copied — exactly what Immer and Redux Toolkit
automate, and what React requires so \`Object.is\` sees a new reference and
re-renders.
`,
  },
  {
    id: 'js-async',
    trackId: 'js',
    title: 'Async: the event loop, promises, await',
    blurb: 'Microtasks vs macrotasks, sequential vs parallel, and error handling that actually works.',
    estMinutes: 35,
    objectives: [
      'Order the output of a mixed setTimeout / promise / sync snippet',
      'Explain concurrency vs parallelism in one sentence',
      'Choose correctly between all, allSettled, race and any',
      'Explain why a forgotten `await` produces an unhandled rejection',
    ],
    primer: `
## The event loop

JavaScript runs one piece of code at a time on one call stack. When the stack
empties, the loop drains the **microtask queue completely** (promise callbacks,
\`queueMicrotask\`, \`await\` continuations), then takes **one macrotask**
(\`setTimeout\`, I/O, UI events), then repeats.

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'));
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 1 4 3 2 — sync first, then every microtask, then the timer
\`\`\`

\`setTimeout(fn, 0)\` means "no sooner than 0ms, after the current task", not
"now". A long synchronous loop blocks everything including rendering — that is
what "blocking the event loop" means, and on a Node server it blocks *every*
request, not just one.

## Promises

A promise is pending, then fulfilled or rejected — once, permanently. \`.then\`
returns a **new** promise, which is what makes chaining work. Returning a
promise inside \`.then\` flattens it. Throwing inside \`.then\` rejects the
returned promise, so a single \`.catch\` at the end catches everything above it.

\`async\` functions always return a promise, and \`throw\` inside one becomes a
rejection. \`await\` pauses that function only — the rest of the program runs on.

## Sequential vs parallel

\`\`\`js
// ~3 seconds: each await waits for the previous one
const a = await fetchA(); const b = await fetchB(); const c = await fetchC();

// ~1 second: all three start immediately, then we wait for the slowest
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
\`\`\`

A serial \`await\` inside a \`for\` loop is the classic latency bug. Note that
\`Promise.all\` is **fail-fast**: one rejection rejects the whole thing while
the others keep running unobserved.

| Combinator | Settles when | Use it for |
| --- | --- | --- |
| \`all\` | every input fulfils | "I need all of these" |
| \`allSettled\` | every input settles | dashboards, batch jobs, partial failure is fine |
| \`race\` | first to *settle* | timeouts |
| \`any\` | first to *fulfil* | mirrors and fallbacks |

\`array.map(async x => ...)\` gives an array of promises, not values — and
\`forEach\` with an async callback awaits nothing at all, which is why
\`await Promise.all(arr.map(...))\` is the idiom.

## Error handling

\`try/catch\` around \`await\` works. \`try/catch\` around a promise you did not
await does not — the rejection escapes as an unhandled rejection, which
terminates a Node process by default. In Express 4 a rejected promise inside an
async route handler is **not** caught by error middleware unless you wrap it or
call \`next(err)\`; Express 5 forwards it for you.
`,
  },
  {
    id: 'js-modules',
    trackId: 'js',
    title: 'Modules, npm and the toolchain',
    blurb: 'ESM vs CommonJS, package.json, semver ranges, lockfiles and what a bundler does.',
    estMinutes: 25,
    objectives: [
      'Explain ESM vs CommonJS and where each is used',
      'Read a semver range and say what it will install',
      'Explain what a lockfile is for and why it is committed',
      'Say what tree-shaking needs in order to work',
    ],
    primer: `
## Two module systems

**CommonJS** (\`require\` / \`module.exports\`) is Node's original system: it
loads synchronously and resolves at runtime, so \`require(someVariable)\` works.
**ESM** (\`import\` / \`export\`) is the standard: statically analysable, so
tooling can see your imports without running the code — which is what makes
tree-shaking possible. ESM imports are hoisted and their bindings are *live*.

In Node, \`"type": "module"\` makes \`.js\` files ESM; \`.mjs\` is always ESM,
\`.cjs\` always CommonJS. ESM can \`import\` CommonJS, but CommonJS cannot
\`require\` ESM — it needs dynamic \`await import()\`. There is no
\`__dirname\` in ESM; derive it from \`import.meta.url\`.

## package.json

\`dependencies\` ship to production; \`devDependencies\` are build and test only.
\`scripts\` run with \`node_modules/.bin\` on PATH, which is why \`npm run dev\`
finds \`vite\` without a global install. \`engines\` documents the Node version.
\`main\`/\`module\`/\`exports\` tell bundlers which file to load — \`exports\`
wins in modern tooling and can hide internal paths.

## Semver

\`MAJOR.MINOR.PATCH\` — breaking, feature, fix.

- \`^1.2.3\` → \`>=1.2.3 <2.0.0\` (the default: minor + patch)
- \`~1.2.3\` → \`>=1.2.3 <1.3.0\` (patch only)
- \`1.2.3\` → exactly that

\`0.x\` is special-cased: \`^0.2.3\` allows only \`0.2.x\`, because pre-1.0
minors are treated as breaking.

## Lockfiles

\`package-lock.json\` records the exact resolved version of every package *and*
every transitive dependency. Commit it — it is the difference between "works on
my machine" and a reproducible build. \`npm ci\` installs strictly from the
lockfile and fails if it disagrees with package.json; that is what CI should
run, not \`npm install\`.

## What a bundler does

Vite and webpack resolve your import graph, transform it (TS → JS, JSX →
\`jsx()\` calls) and emit optimised bundles with hashed filenames for
cache-busting. In dev, Vite serves native ESM and transforms only what the
browser asks for, which is why start-up is instant. Tree-shaking drops unused
exports — it needs static ESM imports and no side effects, which is what
\`"sideEffects": false\` declares.
`,
  },
  {
    id: 'ts-basics',
    trackId: 'ts',
    title: 'TypeScript fundamentals',
    blurb: 'Structural typing, inference, `any` vs `unknown`, and what strict mode buys you.',
    estMinutes: 25,
    objectives: [
      'Explain structural ("duck") typing with an example',
      'Say exactly what TypeScript does and does not do at runtime',
      'Use `unknown` correctly instead of reaching for `any`',
      'Explain what `strictNullChecks` changes',
    ],
    primer: `
## What TypeScript actually is

A compile-time type checker that **erases completely**. There are no types at
runtime: no checks, no reflection, zero cost. A \`User\` interface cannot
validate JSON from an API — only a runtime validator (Zod, a hand-written type
guard) can. "Types are erased" answers a surprising number of interview
questions.

## Structural typing

Compatibility is decided by shape, not by name. If it has the right members it
fits, no \`implements\` required:

\`\`\`ts
interface Point { x: number; y: number }
const p = { x: 1, y: 2, z: 3 };
const q: Point = p;                     // fine — extra properties allowed
const r: Point = { x: 1, y: 2, z: 3 };  // error — excess property check
\`\`\`

That asymmetry surprises everyone: **object literals** get excess-property
checks, variables do not.

## \`any\` vs \`unknown\` vs \`never\`

\`any\` switches the checker off and spreads through your code — a hole in your
type safety. \`unknown\` is the safe top type: it holds anything, but you must
narrow before using it. \`never\` is the empty type: no value has it, so it
marks unreachable code and powers exhaustiveness checks.

\`\`\`ts
function area(s: Shape) {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2;
    case 'square': return s.size ** 2;
    default: { const _exhaustive: never = s; return _exhaustive; }
  }
}
\`\`\`

Add a new shape and that assignment fails to compile — the compiler finds every
switch you forgot to update.

## Inference and \`as const\`

Let inference work; annotate **inputs** (parameters, exported signatures) and
let return types be inferred. \`let s = 'a'\` infers \`string\` but
\`const s = 'a'\` infers the literal \`'a'\`. \`as const\` makes an object or
array deeply readonly with literal types — the standard way to derive a union
from a runtime array:

\`\`\`ts
const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = typeof ROLES[number];   // 'admin' | 'editor' | 'viewer'
\`\`\`

## strict mode

\`"strict": true\` enables the set that makes TypeScript worth using — above all
\`strictNullChecks\`, which removes \`null\`/\`undefined\` from every type unless
you opt in with \`| null\`. Without it every type silently includes null and the
checker cannot help with the most common crash in the language.
\`noImplicitAny\` forces you to type what inference cannot see.

\`as\` is an **assertion**, not a conversion: it tells the compiler to stop
arguing and does nothing at runtime. \`!\` (non-null assertion) is the same
promise about null. Both mark places where you took responsibility.
`,
  },
  {
    id: 'ts-shapes',
    trackId: 'ts',
    title: 'Modelling shapes: unions, generics, utility types',
    blurb: 'interface vs type, discriminated unions, narrowing, generics and the built-in helpers.',
    estMinutes: 30,
    objectives: [
      'Choose between interface and type and defend it',
      'Model a request state as a discriminated union',
      'Write a generic function with a `keyof` constraint',
      'Use Partial, Pick, Omit, Record and ReturnType from memory',
    ],
    primer: `
## interface vs type

\`interface\` describes object shapes, supports \`extends\`, and **declaration
merges** (two same-name interfaces combine — useful for augmenting library
types, surprising otherwise). \`type\` aliases *any* type: unions, tuples,
primitives, mapped and conditional types. Practical rule: interfaces for object
shapes and public APIs, \`type\` when you need a union or a computed type.

## Discriminated unions

The most useful pattern in application TypeScript. Give each variant a literal
tag and the compiler narrows on it:

\`\`\`ts
type Req<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
\`\`\`

This makes impossible states unrepresentable — you can no longer have
\`isLoading: true\` alongside \`data\`, which is the bug four separate booleans
always produce.

## Narrowing

\`typeof\` for primitives, \`instanceof\` for classes, \`in\` for optional
members, \`Array.isArray\`, plus plain truthiness. For your own checks, write a
type predicate:

\`\`\`ts
function isUser(v: unknown): v is User {
  return typeof v === 'object' && v !== null && 'id' in v;
}
\`\`\`

The compiler *trusts* a predicate — if the body is wrong, the type is wrong,
silently.

## Generics

A generic is a parameter for types. Constrain it so it means something:

\`\`\`ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((i) => i[key]);
}
pluck(users, 'email');    // string[]
pluck(users, 'nope');     // compile error
\`\`\`

If a type parameter appears only once in a signature, it usually should not be
generic at all.

## Utility types worth memorising

| Type | Meaning |
| --- | --- |
| \`Partial<T>\` | every property optional (patch payloads) |
| \`Required<T>\` | every property required |
| \`Pick<T, K>\` / \`Omit<T, K>\` | keep / drop keys (DTOs from entities) |
| \`Record<K, V>\` | dictionary with typed keys |
| \`Readonly<T>\` | shallow immutability |
| \`ReturnType<F>\` / \`Parameters<F>\` | pull types out of a function |
| \`Awaited<T>\` | unwrap a promise |
| \`NonNullable<T>\` | strip null and undefined |

\`Omit\` does not error on keys that do not exist, so a rename leaves a silently
useless \`Omit\`. \`Exclude\`/\`Extract\` do the same job for unions.
`,
  },
  {
    id: 'ts-practice',
    trackId: 'ts',
    title: 'TypeScript in a real codebase',
    blurb: 'Typing API boundaries, enums vs unions, runtime validation, and reading compiler errors.',
    estMinutes: 25,
    objectives: [
      'Explain why an API response should be validated, not just typed',
      'Argue for union literals over enums',
      'Type a React component and its props idiomatically',
      'Debug "Type X is not assignable to type Y" methodically',
    ],
    primer: `
## The boundary problem

\`await res.json()\` returns \`any\`. Annotating it \`as User[]\` is a **lie you
asked the compiler to believe** — if the API changes you get a runtime crash in
a file that type-checks perfectly. At every boundary (HTTP responses,
\`localStorage\`, \`process.env\`, form input, query params) parse instead of
assert:

\`\`\`ts
const UserSchema = z.object({ id: z.string(), email: z.string().email() });
const user = UserSchema.parse(await res.json());   // throws loudly, right here
\`\`\`

"Parse, don't validate": turn unknown data into a typed value once, at the edge,
and let the rest of the app trust it.

## enum vs union of literals

TypeScript's \`enum\` is one of the few features that **emits runtime code**, it
is nominally typed, and numeric enums accept any number. Most modern codebases
prefer:

\`\`\`ts
const Status = { Active: 'active', Banned: 'banned' } as const;
type Status = typeof Status[keyof typeof Status];
\`\`\`

\`const enum\` is worse for bundling and breaks under single-file transpilation
(Vite, esbuild, Babel), which is what \`isolatedModules\` warns about.

## React typing that reads well

\`\`\`ts
type Props = {
  items: Item[];
  onSelect: (id: string) => void;
  children?: React.ReactNode;
};

export function List({ items, onSelect }: Props) { /* ... */ }
\`\`\`

Prefer a plain typed parameter over \`React.FC\`, which historically implied
\`children\` and complicates generic components. Type state explicitly when the
initial value does not tell the whole story: \`useState<User | null>(null)\`.
Event handlers get their types free from JSX — reach for
\`React.ChangeEvent<HTMLInputElement>\` only when you extract the handler.

## Reading errors

Compiler errors nest: read the **last** line first (the specific mismatch), then
walk back up for the location. \`Object is possibly 'undefined'\` means an
optional you have not narrowed. \`Property 'x' does not exist on type 'never'\`
almost always means you exhausted a union — the value cannot be anything, so the
branch is unreachable.

## Config that matters

\`strict\`, \`noUncheckedIndexedAccess\` (makes \`arr[0]\` \`T | undefined\` —
correct and annoying), \`skipLibCheck\` (on, for build speed),
\`isolatedModules\` (required by single-file transpilers) and \`paths\` for
\`@/\` aliases, which must be mirrored in your bundler config too.
`,
  },
  {
    id: 'web-browser',
    trackId: 'web',
    title: 'The browser platform',
    blurb: 'The DOM, events, storage, same-origin and what the network tab is telling you.',
    estMinutes: 25,
    objectives: [
      'Explain event bubbling, capturing and delegation',
      'Choose between localStorage, sessionStorage and cookies with a reason',
      'State the same-origin rule precisely',
      'Explain what happens between typing a URL and first paint',
    ],
    primer: `
## Events

An event travels **capture** (window → target), reaches the target, then
**bubbles** back up. Listeners run in the bubble phase unless you pass
\`{ capture: true }\`. \`stopPropagation()\` halts that travel;
\`preventDefault()\` cancels the browser's default action (form submit, link
navigation). They are unrelated, and constantly confused.

**Delegation** is one listener on a container plus
\`event.target.closest('button')\` — it survives elements added later, and is
how React historically attached handlers (a single root listener rather than one
per element).

## Storage

| | Size | Lifetime | Sent to server | JS access |
| --- | --- | --- | --- | --- |
| \`localStorage\` | ~5MB | until cleared | no | yes |
| \`sessionStorage\` | ~5MB | per tab | no | yes |
| Cookie | ~4KB | \`Expires\`/\`Max-Age\` | **every request** | unless \`HttpOnly\` |

Never keep a session token in \`localStorage\` if you can avoid it: any XSS
reads it. An \`HttpOnly; Secure; SameSite=Lax\` cookie is invisible to JS. Web
storage is synchronous and origin-scoped; IndexedDB is the async, large,
structured option.

## Same-origin

Same origin means the same **scheme, host and port** — \`https://a.com\` and
\`http://a.com\` differ, and so do \`a.com\` and \`api.a.com\`. Being
cross-origin is why you need CORS, and why an iframe from another origin cannot
read your DOM.

## The critical path

DNS → TCP → TLS → HTTP request → HTML arrives. The parser builds the DOM,
blocking on synchronous \`<script>\` tags (\`defer\` runs after parsing, in
order; \`async\` runs whenever it lands). CSS is render-blocking because layout
cannot start without it. DOM + CSSOM → render tree → layout → paint →
composite. "CSS in the head, scripts deferred" falls straight out of that
sequence.

**Reflow** (layout) recomputes geometry and is expensive; **repaint** just
redraws pixels. Reading \`offsetHeight\` immediately after a style write forces a
synchronous reflow — layout thrashing.

## Debugging in devtools

The Network tab gives status, a timing waterfall, and the request/response
headers you need to diagnose CORS and caching; "Preserve log" survives redirects
and reloads. A request showing \`(failed) net::ERR_...\` with a CORS message in
the console usually **did** reach the server — the browser rejected the
response afterwards.
`,
  },
];
