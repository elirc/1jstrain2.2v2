/**
 * Modules — JavaScript, the language (stage 1).
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const jsModules = [
  {
    id: 'js-values',
    trackId: 'js',
    title: 'Values, types and coercion',
    blurb: 'Why `==` is a trap, what falsy really means, and why 0.1 + 0.2 is not 0.3.',
    estMinutes: 30,
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

The professional answer: **always** \`===\`, with one accepted exception —
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

Object keys are always strings (or symbols): \`store[{id: 1}]\` becomes
\`store["[object Object]"]\`, so use a \`Map\` for object keys. \`+\`
concatenates when either side is a string; \`-\` always converts to numbers, so
\`1 + '2' - 1\` is \`11\`.

## Numbers

There is one number type: a 64-bit float. \`0.1 + 0.2\` is
\`0.30000000000000004\` because tenths are not representable in binary, exactly
as 1/3 is not in decimal. Compare with a tolerance, or — the real-world answer —
**store money as integer cents**. \`parseInt('12px')\` is \`12\` because it stops
at the first non-digit, while \`Number('12px')\` is \`NaN\`; pick the one whose
failure mode you want.

## Number() vs parseInt vs parseFloat

| Input | \`Number(x)\` | \`parseInt(x, 10)\` | \`parseFloat(x)\` |
| --- | --- | --- | --- |
| \`'12px'\` | \`NaN\` | \`12\` | \`12\` |
| \`'1.5'\` | \`1.5\` | \`1\` | \`1.5\` |
| \`' 12 '\` | \`12\` | \`12\` | \`12\` |
| \`''\` | \`0\` | \`NaN\` | \`NaN\` |
| \`null\` | \`0\` | \`NaN\` | \`NaN\` |
| \`undefined\` | \`NaN\` | \`NaN\` | \`NaN\` |

The two rows that bite are \`''\` and \`null\`: \`Number\` turns an empty form
field into a perfectly valid-looking \`0\`, so "required" checks built on
\`Number.isNaN\` pass. Reject blank input on the raw string before converting.
And the global \`isNaN\` coerces first (\`isNaN('hello')\` is \`true\`);
\`Number.isNaN\` does not.

## Big numbers and ids

Numbers are exact integers only up to \`Number.MAX_SAFE_INTEGER\` (2^53 − 1,
9007199254740991). Above that not every integer exists, so
\`Number.MAX_SAFE_INTEGER + 2\` prints \`9007199254740992\` — wrong, silently.
That is why a 64-bit database id (a Postgres \`bigint\`) must travel as a
**string** in JSON; \`JSON.parse\` would corrupt it. node-postgres returns
\`bigint\` columns as strings by default for this reason. Check with
\`Number.isSafeInteger(n)\`.

\`BigInt\` (\`123n\`) is exact at any size but is its own primitive:
\`typeof 1n\` is \`'bigint'\`, mixing it with a Number in arithmetic throws a
\`TypeError\` (convert explicitly with \`BigInt(n)\` or \`Number(b)\`), and
\`JSON.stringify\` throws on it. Treat ids as opaque strings and keep BigInt
for real arithmetic above 2^53.

## Object.is and -0

\`Object.is(a, b)\` is \`===\` with two differences: \`Object.is(NaN, NaN)\` is
\`true\` and \`Object.is(-0, 0)\` is \`false\` (while \`-0 === 0\` is \`true\`).
React compares state and dependencies with \`Object.is\`, so this is the
equality your components actually run on.

## Reliable type checks

- \`Array.isArray(x)\` — works across iframes and \`vm\` contexts, where
  \`instanceof Array\` fails because each realm has its own \`Array\`.
- \`x === null\` — since \`typeof null\` lies.
- \`Number.isFinite(x)\` — a real, usable number: false for \`NaN\`,
  \`Infinity\` and strings.
- \`typeof x\` — fine for primitives and functions. It is also the one operator
  that tolerates an undeclared name: \`typeof notDeclared\` is \`'undefined'\`,
  not a \`ReferenceError\` (inside a \`let\`'s temporal dead zone it still throws).

## Logical assignment

\`\`\`js
a ||= b   // assigns when a is falsy — including 0 and ''
a ??= b   // assigns only when a is null or undefined
a &&= b   // assigns only when a is truthy
\`\`\`

All three short-circuit: when no assignment is needed, the right-hand side is
never evaluated. \`opts.retries ||= 3\` turns a deliberate \`0\` into \`3\`;
\`??=\` is the one for filling in defaults.
`,
  },
  {
    id: 'js-functions',
    trackId: 'js',
    title: 'Functions, scope, closures and `this`',
    blurb: 'Closures, hoisting, the four `this` rules, and why arrow functions changed everything.',
    estMinutes: 35,
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

1. \`new Fn()\` — \`this\` is the newly constructed object.
2. \`fn.call/apply/bind(obj)\` — \`this\` is what you passed.
3. \`obj.method()\` — \`this\` is \`obj\`, the thing left of the dot.
4. **Plain** \`fn()\` — \`undefined\` in strict mode and modules,
   \`globalThis\` otherwise.

Arrow functions sit outside this system: they have **no own** \`this\` and
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

## Scope lookup

A name is resolved by walking outward through the scopes where the code is
*written*: the innermost block, then the enclosing function, then the module
scope, then the global scope. The first match wins (that is shadowing), and no
match means a \`ReferenceError\`. Top-level \`const\` in a module lives in module
scope, not on \`globalThis\`. The window between entering a scope and a
\`let\`/\`const\` line running is the **temporal dead zone** (TDZ); even
\`typeof x\` throws inside it.

## call, apply, bind

\`fn.call(obj, a, b)\` invokes \`fn\` with \`this = obj\` and a list of
arguments; \`fn.apply(obj, [a, b])\` does the same with an array; \`fn.bind(obj)\`
returns a new function and calls nothing. Spread made most \`apply\` uses
obsolete: \`Math.max(...nums)\` rather than \`Math.max.apply(null, nums)\`, and
passing the array directly (\`Math.max(nums)\`) gives \`NaN\`.

Callbacks follow the same rules. \`[1].map(function () { return this; })\` makes
a plain call, so \`this\` is \`undefined\` in a module; an arrow callback inherits
\`this\` from the method it was written in.

## Closures capture variables, not values

\`\`\`js
function make() {
  let msg = 'a';
  const log = () => msg;
  msg = 'b';
  return log;
}
make()();   // 'b' — log reads msg when it runs, not when it was created
\`\`\`

This is also the root of React's *stale closure*: every render creates new
bindings, and a callback created during an old render keeps reading the old
ones.

## Currying and partial application

\`const add = (a) => (b) => a + b\` takes one argument at a time; \`add(2)\` is a
partially applied function that remembers \`a\`. You use the pattern to
configure handlers — \`onChange={update('email')}\` — and \`fn.bind(null, 2)\`
does the same for ordinary functions.

## Pure functions

A pure function returns the same output for the same inputs and has no
observable side effects. \`(a, b) => a + b\` and \`xs.map(...)\` are pure;
\`arr.sort()\` (mutates its input), \`Date.now()\` (reads the clock) and
\`(u) => { u.seen = true; return u; }\` (mutates its argument) are not. React
components and reducers must be pure, and pure functions are the ones you can
test without mocks.

Classes, prototypes and \`this\` inside methods are covered in depth in *Prototypes, classes and objects in practice*.
`,
  },
  {
    id: 'js-objects-arrays',
    trackId: 'js',
    title: 'Objects, arrays and immutability',
    blurb: 'Destructuring, spread, shallow vs deep copies, and the array methods you use hourly.',
    estMinutes: 35,
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

\`flat(depth)\` defaults to depth 1; use a \`Map\` over a plain object when keys
are not strings, order and size matter, or keys could collide with prototype
names.

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

## Copy-returning methods (ES2023)

\`toSorted\`, \`toReversed\`, \`toSpliced\` and \`with(index, value)\` are the
non-mutating twins of \`sort\`, \`reverse\`, \`splice\` and index assignment
(Node 20+, all current browsers). They are what you want on React state. Note
that \`toSorted()\` still compares as strings by default: \`[10, 9, 1].toSorted()\`
is \`[1, 10, 9]\`, with the original untouched.

\`Array.from({ length: 3 }, (_, i) => i * 2)\` builds \`[0, 2, 4]\` — the idiom
for ranges. \`new Array(3).map(...)\` does nothing, because the array is all
holes and \`map\` skips holes.

## Asking questions of an array

\`some\` answers "is there any?" and stops at the first match; \`every\` answers
"are they all?"; \`find\` returns the element and \`findIndex\` its index (or
\`-1\`). \`filter(fn).length > 0\` walks the whole list and allocates an array
just to count it. When you chain, order matters for cost: filter first so the
sort has less to do, sort before \`slice\`, and \`map\` last so only the rows you
return get converted — the same shape as SQL's \`WHERE\`, \`ORDER BY\`,
\`LIMIT\`, then the select list.

## Grouping

\`Object.groupBy(items, fn)\` (ES2024, Node 21+) returns a **null-prototype**
object of arrays. Groups that never occur are *absent*, not empty — write
\`groups.closed ?? []\` — and there is no \`hasOwnProperty\` method on the
result, so use \`Object.hasOwn\` or \`in\`. \`Map.groupBy\` returns a \`Map\`, for
keys that are not strings.

## structuredClone vs JSON

\`structuredClone\` deep-copies Dates, Maps, Sets, typed arrays and cycles.
It does not quietly drop what it cannot copy: a function or a DOM node throws a
\`DataCloneError\`. Class instances come back as plain objects, without their
prototype or methods. JSON drops functions and \`undefined\` silently and turns
Dates into strings.

## entries and fromEntries

\`\`\`js
const scaled = Object.fromEntries(
  Object.entries(prices).map(([k, v]) => [k, v * 10]),
);
\`\`\`

That is how you map or filter an object's values. \`fromEntries\` takes any
iterable of pairs, so it also converts a \`Map\` or \`URLSearchParams\`.

## Object.freeze is shallow

\`Object.freeze(state)\` makes the top-level properties read-only and leaves
\`state.user.prefs\` fully mutable. Writing to a frozen property throws a
\`TypeError\` in strict code (every module) and is silently ignored in sloppy
scripts. Deep freezing needs recursion; Immer does it for the state it
produces.

Map, Set and WeakMap are covered in depth in *Iteration, errors, collections and dates*.
`,
  },
  {
    id: 'js-async',
    trackId: 'js',
    title: 'Async: the event loop, promises, await',
    blurb: 'Microtasks vs macrotasks, sequential vs parallel, and error handling that actually works.',
    estMinutes: 45,
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

\`AbortController\` (or \`AbortSignal.timeout(ms)\`) cancels a fetch rather than
just racing it. For 500 calls with a limit of 5 in flight, write a bounded pool:
N workers pulling from a shared index. In Node, \`process.nextTick\` runs before
promise microtasks.

## Error handling

\`try/catch\` around \`await\` works. \`try/catch\` around a promise you did not
await does not — the rejection escapes as an unhandled rejection, which
terminates a Node process by default. In Express 4 a rejected promise inside an
async route handler is **not** caught by error middleware unless you wrap it or
call \`next(err)\`; Express 5 forwards it for you.

## The synchronous prelude of an async function

Calling an \`async\` function runs its body **synchronously** up to the first
\`await\`; only the rest is queued. Heavy work before that first \`await\` blocks
the caller like any function, and "async" never means "on another thread".

\`\`\`js
async function f() { console.log(1); await null; console.log(3); }
f(); console.log(2);   // 1 2 3
\`\`\`

The microtask queue is first in, first out: a \`queueMicrotask\` callback queued
before an \`await\` continuation runs before it.

## fetch does not reject on 404

\`fetch\` resolves as soon as the status line and headers arrive — for **any**
status, 404 and 500 included. It rejects only when there is no response at all:
a network failure or CORS block (\`TypeError\`) or an abort. Reading the body
(\`res.json()\`, \`res.text()\`) is a second async step. So every call site
needs:

\`\`\`js
const res = await fetch(url);
if (!res.ok) throw new HttpError(res.status, await res.text());
const data = await res.json();
\`\`\`

axios rejects on non-2xx, which is where the opposite belief comes from.

## Cancellation

Pass an \`AbortSignal\` to \`fetch\`. \`AbortSignal.timeout(ms)\` aborts with a
\`TimeoutError\`; \`controller.abort()\` rejects with an \`AbortError\`. That
difference lets you log timeouts but ignore aborts the user caused. To honour
both a cancel button and a deadline, combine them with
\`AbortSignal.any([controller.signal, AbortSignal.timeout(5000)])\` (Node 20.3+ and
current browsers). The signal also covers reading the body.

## What Promise.all does not cancel

A promise is a notification, not a handle on the work. When \`Promise.all\`
rejects early, the other operations **keep running** to completion — and if
they were writes, they still land after you reported failure. Use
\`allSettled\` when you need every outcome, pass signals to work that can be
cancelled, and make multi-step writes transactional or idempotent.

## Retries with backoff and jitter

Retry only transient failures (network errors, 503, 429 honouring
\`Retry-After\`), cap the attempts, and never blindly retry a non-idempotent
write. Exponential backoff (200 ms, 400 ms, 800 ms...) spaces out one client's
attempts; **jitter** randomises each delay so a thousand clients that failed
together do not retry together and flatten the recovering server — the
thundering herd.

## Promisifying callbacks

\`\`\`js
new Promise((resolve, reject) => {
  fs.readFile(path, 'utf8', (err, text) => (err ? reject(err) : resolve(text)));
});
\`\`\`

Every path must call \`resolve\` or \`reject\`. Forget \`reject\` on the error
path and the promise stays pending forever: no \`catch\`, no \`finally\`, no
log — the awaiting code just stops. A \`throw\` inside the callback is not turned
into a rejection either, because it runs after the executor returned. Prefer
\`fs/promises\` or \`util.promisify\`.

## Unhandled rejections in Node

A rejection counts as unhandled if no handler is attached by the time the
microtask queue drains. \`p.then(onOk)\` with no \`catch\` creates a new promise
nobody handles; a fire-and-forget call to a throwing async function does the
same. Since Node 15 the default \`--unhandled-rejections=throw\` turns this into
an uncaught exception that exits the process — even if a \`.catch\` is attached
one \`setTimeout\` later. Attach handlers when you create the promise. \`await\`
inside \`try\`, an attached \`.catch\`, and \`allSettled\` (which never rejects)
all count as handled.

Async iteration (\`for await\`) and \`AggregateError\` are covered in depth in *Iteration, errors, collections and dates*.
`,
  },
  {
    id: 'js-modules',
    trackId: 'js',
    title: 'Modules, npm and the toolchain',
    blurb: 'ESM vs CommonJS, package.json, semver ranges, lockfiles and what a bundler does.',
    estMinutes: 30,
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
\`.cjs\` always CommonJS. ESM can \`import\` CommonJS. The reverse used to be
impossible, but since Node 22.12 (and 20.19) CommonJS can \`require()\` an ES
module synchronously — unless that module graph uses top-level \`await\`, in
which case you still need \`await import()\`. There is no \`__dirname\` in ESM:
use \`import.meta.dirname\` / \`import.meta.filename\` (Node 20.11+) or derive
them from \`import.meta.url\`.

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

## Live bindings, .mjs/.cjs and top-level await

ESM imports are **live, read-only bindings**: if \`counter.js\` exports
\`let count\` and an \`inc()\` that bumps it, an importer sees the new value.
CommonJS \`const { count } = require('./counter')\` copies the value once. The
importer cannot assign to an imported binding (\`TypeError\`).

Top-level \`await\` exists only in ES modules — in a \`.cjs\` file it is a
\`SyntaxError\` — and it makes the module asynchronous, which is why
\`require()\` of a graph that uses it fails with \`ERR_REQUIRE_ASYNC_MODULE\`.

## The exports field and how Node finds a package

For \`import x from 'pkg'\`, Node walks up from the importing file to the
nearest \`node_modules/pkg\`, reads its package.json, and matches the
\`"exports"\` map using the \`import\` (or \`require\`) condition. Only if there
is no \`exports\` does it fall back to \`"main"\` (or \`index.js\`). Finally the
file is loaded as ESM or CommonJS by its extension and the nearest \`"type"\`.

\`exports\` is the package's public surface: paths it does not list fail with
\`ERR_PACKAGE_PATH_NOT_EXPORTED\`, and conditions (\`import\`, \`require\`,
\`types\`, \`default\`) choose a file per consumer. Adding it to an existing
package breaks anyone who deep-imported internals.

## peerDependencies

A plugin or component library must use the *host's* copy of React (two copies
break hooks with "Invalid hook call"). Put \`react\` in \`peerDependencies\`
with a broad range such as \`^18 || ^19\`, and in \`devDependencies\` for local
tests. npm 7+ installs peers automatically and fails with \`ERESOLVE\` on
conflicts.

## Workspaces and monorepos

\`"workspaces": ["content", "server", "client"]\` in a root package.json gives
one lockfile and one install: dependencies are hoisted into a shared
\`node_modules\`, and each local package is symlinked there so it imports by
name with no publishing. Run \`npm run build -w server\`, add a dependency with
\`npm install zod -w client\`. It ends version drift between packages, but it is
not a build orchestrator — task ordering and caching are what Turborepo or Nx
add.

## Formatter, linter, type checker

| Tool | Job |
| --- | --- |
| Prettier | layout only — quotes, wrapping, semicolons |
| ESLint | suspicious code and team rules (unused vars, hook rules) |
| \`tsc\` | types |

Disable ESLint's formatting rules (\`eslint-config-prettier\`) so they do not
fight. Vite and esbuild strip types without checking, so CI runs
\`tsc --noEmit\`.

## Source maps

A \`.map\` file maps minified or transpiled output back to your source lines, so
devtools and error trackers show \`OrderForm.tsx:42\` instead of
\`main.3f9a.js:1:48213\`. Node applies them with \`--enable-source-maps\`. If the
source is sensitive, upload maps to the error tracker rather than serving them
publicly.
`,
  },
  {
    id: 'js-classes',
    trackId: 'js',
    title: 'Prototypes, classes and objects in practice',
    blurb:
      'The prototype chain under `class`, private fields, getters, inheritance, and when composition beats all of it.',
    estMinutes: 25,
    objectives: [
      'Explain the prototype chain and what `class` compiles down to',
      'Use private `#fields`, getters/setters and `static` members correctly',
      'Explain `super`, method overriding and why `instanceof` can lie',
      'Argue for composition over inheritance with a CRUD-app example',
    ],
    primer: `
## Objects link to objects

Every object has a hidden link to another object, its *prototype*
(\`[[Prototype]]\`, exposed as \`Object.getPrototypeOf(o)\` and the legacy
\`__proto__\`). Reading a property that the object does not have follows that
link, and the next one, until the name is found or the chain ends at \`null\` —
in which case the result is \`undefined\`.

\`\`\`js
const base = { greet() { return 'hi'; } };
const o = Object.create(base);      // o's prototype is base
o.greet();                          // 'hi' — found one link up
Object.hasOwn(o, 'greet');          // false — not an own property
\`\`\`

\`Object.hasOwn\` (ES2022) is the modern way to ask "is this property on the
object itself?", replacing \`Object.prototype.hasOwnProperty.call(o, key)\`. You
need that question because \`for...in\` walks inherited enumerable properties
too.

Do not confuse the two words. \`[[Prototype]]\` is the link every object has.
\`Fn.prototype\` is an ordinary property on a function: the object that
instances created with \`new Fn()\` get linked to.

## What class is sugar for

\`\`\`js
class User {
  constructor(name) { this.name = name; }
  greet() { return \`hi \${this.name}\`; }
}
typeof User;                                      // 'function'
Object.getPrototypeOf(new User('a')) === User.prototype;   // true
\`\`\`

A class is a constructor function, and its methods are stored **once** on
\`User.prototype\`, shared by every instance. The differences from a
hand-written constructor function are small but real:

- class bodies are always strict mode;
- calling \`User()\` without \`new\` throws;
- methods are non-enumerable, so they do not show up in \`for...in\`;
- the class name is hoisted like \`let\`: using it above the declaration throws
  \`ReferenceError: Cannot access 'User' before initialization\` (the temporal
  dead zone). Only function declarations are fully hoisted.

## Fields and privacy

Class fields (\`label = 'ok';\`) are assigned to each instance when it is
constructed. For privacy there are three options, and they are not equivalent:

| Mechanism | Enforced by | Visible to \`JSON.stringify\`, \`Object.keys\` |
| --- | --- | --- |
| \`#secret\` | the JavaScript engine, at runtime | no |
| TypeScript \`private secret\` | the compiler only; erased from the output | yes |
| a variable in a closure | scope, at runtime | no |

\`#secret\` outside the class body is a \`SyntaxError\`, and you can brand-check
with \`#secret in obj\`. TypeScript \`private\` compiles to an ordinary property,
so \`(obj as any).secret\` reads it and it serialises. Use \`#\` when the
guarantee has to hold at runtime; TypeScript \`private\` is API hygiene.

## Accessors and static members

\`\`\`js
class Temp {
  #c = 0;
  get f() { return this.#c * 9 / 5 + 32; }
  set f(v) { this.#c = (v - 32) * 5 / 9; }
  static fromF(f) { const t = new Temp(); t.f = f; return t; }
}
const t = Temp.fromF(212);
t.f;   // 212 — the getter runs; the stored value is 100 degrees C
\`\`\`

Getters and setters look like plain properties to the caller, which is the
point and the danger: callers read them in loops and in render functions, so a
getter must be cheap and side-effect free. An expensive or async getter is a
smell — make it a method. \`static\` members belong to the class itself
(\`Temp.fromF\`), not to instances; factory functions and constants are the
usual uses.

## Inheritance

\`\`\`js
class NotFound extends Error {
  constructor(message) {
    super(message);            // must come before any use of this
    this.name = 'NotFound';
    this.status = 404;
  }
}
\`\`\`

In a derived class the *base* constructor creates the object, so \`this\` does
not exist until \`super()\` returns; touching it earlier throws a
\`ReferenceError\`. The derived class's own fields are initialised right after
\`super()\` returns, and if you write no constructor the default one forwards
every argument to \`super\`.

Overriding works through the chain. For \`rex.speak()\`, where
\`class Dog extends Animal\`, the engine checks \`rex\` itself, then \`Dog.prototype\`, then
\`Animal.prototype\`, then \`Object.prototype\`, and the first match wins. Inside
an override, \`super.speak()\` calls the parent's version with the same \`this\`
— forget it and whatever the parent did (validation, logging) silently stops.

Extending \`Error\` is the most useful inheritance in a CRUD app: the subclass
passes \`instanceof\` checks, keeps a stack trace, and with \`name\` set it logs
as \`NotFound: order 7\`. Add a stable \`code\` or \`status\` for handlers.

## Methods and this

Methods are not bound to their instance. Pulling one off the object loses the
dot, and because class bodies are strict, the plain call gets
\`this === undefined\`:

\`\`\`js
const click = new Btn().click;
click();   // TypeError: Cannot read properties of undefined
\`\`\`

This happens whenever you hand a method to someone else: \`setTimeout\`,
\`.then(service.save)\`, an event prop. Three fixes: \`.bind(instance)\`, a
wrapper arrow \`() => service.save()\`, or an arrow-function class field:

\`\`\`js
class Form {
  handleSubmit = () => { this.save(); };   // this is always the instance
}
\`\`\`

The arrow field has a cost. It is created in the constructor, so every
instance gets its **own** function, it is not on the prototype, and a subclass
cannot call it with \`super.handleSubmit()\` (a subclass method of the same name
is even shadowed by it). Use arrow fields for callbacks you hand out, ordinary
methods for anything meant to be overridden.

## instanceof and its limits

\`x instanceof C\` asks "is \`C.prototype\` somewhere on \`x\`'s chain?" —
prototype *identity*. It gives false negatives in two common situations:

- **Two copies of a package.** If \`node_modules\` holds two versions of a
  library, or both its ESM and CommonJS builds get loaded (the dual-package
  hazard), there are two \`ValidationError\` classes with the same name, and an
  error from one fails \`instanceof\` against the other. \`npm ls <pkg>\` shows
  the duplicates.
- **Other realms.** An iframe or a Node \`vm\` context has its own \`Array\`,
  \`Error\` and so on (which is why \`Array.isArray\` exists).

At package and process boundaries, check something stable instead: an
\`err.code\`, an \`err.name\`, or a brand such as \`Symbol.for('acme.ValidationError')\`.

## Composition over inheritance

Inheritance hierarchies grow one class per combination of behaviours:

\`\`\`js
class PaymentService {}
class StripePayment extends PaymentService {}
class StripePaymentWithRetry extends StripePayment {}
// PayPal? PayPalPayment, PayPalPaymentWithRetry, ...with logging? x2 again
\`\`\`

Composition keeps each behaviour separate and combines them at the edges:

\`\`\`js
const stripe = { charge: (amount) => stripeClient.charge(amount) };
const withRetry = (gateway, tries = 3) => ({
  async charge(amount) { /* loop, backoff, call gateway.charge */ },
});
const payments = new PaymentService(withRetry(stripe));
\`\`\`

Every piece shares a small interface (\`{ charge(amount) }\`), so each one is
testable alone with a fake gateway, and PayPal is one more object, not two more
classes.

Where classes *are* right in a CRUD app: error types (a real "is-a" with shared
behaviour), and services that hold injected dependencies
(\`new OrderService(db, mailer)\`). Where they are not: data. Orders, users and API responses are plain
objects moved around by plain functions — they serialise, clone and compare
without surprises.
`,
  },
  {
    id: 'js-stdlib',
    trackId: 'js',
    title: 'Iteration, errors, collections and dates',
    blurb:
      'Iterators and generators, errors that keep their cause, Map/Set/WeakMap, Intl, and the date bugs every CRUD app ships.',
    estMinutes: 30,
    objectives: [
      'Explain the iteration protocol and what a generator is for',
      'Throw and wrap errors so the cause survives to the log',
      'Choose between Map, Set, WeakMap and a plain object with a reason',
      'Store and display dates without time-zone bugs',
    ],
    primer: `
## The iteration protocol

\`for...of\`, spread, destructuring, \`Array.from\` and \`Promise.all\` all accept
any **iterable**: an object with a \`[Symbol.iterator]()\` method that returns an
iterator, whose \`next()\` returns \`{ value, done }\` until \`done\` is true.
Arrays, strings, Maps, Sets, NodeLists and generators are iterable. Plain
objects are not — iterate \`Object.entries(obj)\` instead. An *array-like*
(\`length\` plus indexed keys) works with \`Array.from\` but not with
\`for...of\`.

## Generators

A \`function*\` returns an iterator and runs none of its body until the first
\`next()\`; each \`yield\` pauses it and hands out one value.

\`\`\`js
function* g() { yield 1; yield 2; return 3; }
[...g()];   // [1, 2] — the return value arrives with done: true and is ignored
\`\`\`

Because values are produced only on demand, an infinite generator is fine as
long as the consumer stops:

\`\`\`js
function* naturals() { let n = 0; while (true) yield n++; }
for (const n of naturals()) { if (n > 2) break; }   // 0, 1, 2
\`\`\`

\`break\` calls the iterator's \`return()\`, which closes the generator and runs
any \`finally\` inside it — the hook for releasing a cursor or file handle.

## Async iteration

An \`async function*\` can \`await\` between yields, and \`for await\` consumes
it one value at a time:

\`\`\`js
async function* fetchPages(url) {
  while (url) {
    const res = await fetch(url);
    const body = await res.json();
    yield body.items;
    url = body.next;          // null on the last page
  }
}
for await (const page of fetchPages('/api/orders')) {
  await importRows(page);     // the next page is fetched only after this
}
\`\`\`

Pages are processed as they arrive, memory stays flat, the consumer's pace is
the producer's pace (backpressure), and \`break\` stops further requests. It is
sequential, so it is not faster than fetching pages in parallel. Node readable
streams and web \`ReadableStream\`s are async iterables too.

## Errors

- **Throw Error objects**, never strings: only errors carry a stack trace.
- **Custom classes with a stable code**: \`class NotFound extends Error\`
  with \`code = 'NOT_FOUND'\` lets a handler branch without matching message
  text.
- **Wrap with cause** (ES2022) when you add context, so the root cause and
  its stack survive:

\`\`\`js
try {
  await save(order);
} catch (err) {
  throw new Error('checkout failed', { cause: err });
}
\`\`\`

Node prints the chain as \`[cause]\` and structured loggers serialise it. The old
habit, \`throw new Error('failed: ' + err.message)\`, discards the original
stack.

- **Log once**, where the error is finally handled (error middleware, a top-level
  job runner). Catch-log-rethrow at every layer prints one failure five times.
- **Never swallow**: an empty \`catch {}\` turns a crash you would notice into
  wrong data you will not.

\`AggregateError\` holds several errors in \`.errors\`. \`Promise.any\` rejects
with one when every input rejects; \`Promise.all\` rejects with only the *first*
reason, and \`allSettled\` never rejects. You can throw one yourself to report
every failed row of an import.

## Map, Set and WeakMap

\`Map\` takes keys of any type and compares them by identity (SameValueZero):

\`\`\`js
const m = new Map();
m.set({ id: 1 }, 'a');
m.get({ id: 1 });   // undefined — a different object
\`\`\`

Key by a primitive (\`order.id\`) or keep the exact key object. Maps and Sets
keep insertion order and have \`.size\`. Since ES2025, Sets have algebra:
\`a.union(b)\`, \`a.intersection(b)\`, \`a.difference(b)\`,
\`a.symmetricDifference(b)\` and \`a.isSubsetOf(b)\` — Node 22+, Chrome 122+,
Firefox 127+, Safari 17+. On older targets write
\`[...a].filter((x) => b.has(x))\` or polyfill.

A \`WeakMap\` holds its keys *weakly*: when nothing else references a key
object, its entry disappears. Keys must be objects, and a WeakMap cannot be
iterated or sized (that would reveal when the garbage collector ran). Its job
is attaching data to objects you do not own — request objects, DOM nodes —
without keeping them alive. A \`Map\` keyed by request objects leaks every
request. For caches keyed by strings, use a size-limited LRU instead.

| Need | Use |
| --- | --- |
| fixed-shape record, JSON-friendly | plain object |
| dynamic keys, non-string keys, frequent adds/deletes | \`Map\` |
| uniqueness, membership tests | \`Set\` |
| metadata on objects you do not own | \`WeakMap\` |

## Copying and serialising

\`structuredClone\` deep-copies Dates, Maps, Sets and cycles and throws on
functions. \`JSON.stringify(value, replacer)\` and \`JSON.parse(text, reviver)\`
let you convert on the way out and in — for example reviving ISO strings into
Dates — and a \`toJSON()\` method controls how an object serialises.

## Dates

A \`Date\` is one number: milliseconds since 1970-01-01 UTC. Everything else is
formatting. The rules that prevent most bugs:

- **Store instants in UTC** — a \`timestamptz\` column, ISO strings ending in
  \`Z\` — and convert to the viewer's zone only for display. Local-time strings
  are ambiguous (1:30 am happens twice when clocks go back) and break as soon
  as a second zone is involved.
- **Months are 0-based**: \`new Date(2024, 0, 31)\` is 31 January.
- **Overflow is silent**: set that date's month to February and you get
  "31 February", which rolls over to 2 March. "Add a month" needs clamping;
  date-fns \`addMonths\` does it.
- **Date-only strings parse as UTC**: \`new Date('2024-03-10')\` is UTC
  midnight — 7 pm on 9 March in New York — while \`'2024-03-10T00:00'\` (no
  offset) parses as local time.

That last rule is the birthday bug. A birthday or a due date is a *calendar date*, not an instant: keep it as a \`'YYYY-MM-DD'\` string or a \`date\`
column, and if it must go through \`Date\`, format it with
\`timeZone: 'UTC'\`. Format for display with \`Intl.DateTimeFormat\` and the
user's \`timeZone\`.

Temporal is the replacement API, with separate types for these ideas
(\`Temporal.Instant\`, \`Temporal.PlainDate\`, \`Temporal.ZonedDateTime\`) and
clamping arithmetic. Support is still arriving across browsers and Node, so use
it where it is available, and otherwise date-fns or Luxon.

## Intl and strings

\`\`\`js
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
usd.format(1234.5);   // '$1,234.50' — create once, reuse
names.sort(new Intl.Collator('de').compare);   // locale-aware sorting
\`\`\`

\`toFixed(2)\` does none of the locale work. For strings: \`padStart\` for
fixed-width ids, \`replaceAll\` instead of a global regex for literal text,
\`localeCompare\` for one-off comparisons.

**i18n in one paragraph.** \`'You have ' + n + ' items'\` cannot be translated:
other languages put the number elsewhere and have more plural forms (English
has "one" and "other"; Russian adds "few" and "many"; Arabic has six). The unit
of translation is the whole message with a placeholder, e.g. the ICU message
\`{count, plural, one {# item} other {# items}}\`, handled by a library such as
i18next or FormatJS, and \`Intl.PluralRules\` picks the category. Numbers,
currency and dates always go through \`Intl\`.
`,
  },
];
