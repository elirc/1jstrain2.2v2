/**
 * Modules — TypeScript (stage 2).
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const tsModules = [
  {
    id: 'ts-basics',
    trackId: 'ts',
    title: 'TypeScript fundamentals',
    blurb: 'Structural typing, inference, `any` vs `unknown`, and what strict mode buys you.',
    estMinutes: 30,
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

\`strict\` bundles \`noImplicitAny\`, \`strictNullChecks\`,
\`strictFunctionTypes\`, \`strictBindCallApply\`,
\`strictPropertyInitialization\`, \`noImplicitThis\`, \`alwaysStrict\` and
\`useUnknownInCatchVariables\` — the last is why \`catch (e)\` gives you
\`unknown\`, because JavaScript can throw anything. Same-name \`interface\`
declarations merge; \`type\` aliases do not.

Under \`strict\`, a lookup through an index signature (\`r.anything\` on a
\`Record<string, number>\`) is still typed \`number\`, not
\`number | undefined\`. That hole is what \`noUncheckedIndexedAccess\` closes;
it is not part of \`strict\`.

## Widening, and \`typeof\` in a type

\`const\` freezes the *binding*, not the object inside it. In
\`const cfg = { mode: 'dark' }\` the property is widened to \`string\`, because
\`cfg.mode\` could be reassigned, so passing it to a \`'dark' | 'light'\`
parameter fails. Fix it where the value is born — \`as const\`,
\`satisfies { mode: Mode }\`, or an annotation — never with a cast at the call
site.

In a type position, \`typeof value\` gives you the type of an existing value
(the runtime \`typeof\` returns a string; this one is compile-time only). It is
the start of every derived type: \`keyof typeof STATUS\`,
\`ReturnType<typeof createStore>\`.

## \`object\`, \`{}\` and \`Object\`

| Type | Accepts |
| --- | --- |
| \`{}\` | every value except \`null\` and \`undefined\`, including \`42\` and \`'x'\` |
| \`object\` | non-primitives only: objects, arrays, functions |
| \`Object\` | practically the same as \`{}\`; never write it |

\`{}\` reads as "empty object" and means "anything non-nullish", which is why
typescript-eslint flags it. For "some plain object" write
\`Record<string, unknown>\`; better, write the real shape.

## \`void\` in callback types

A function *type* returning \`void\` means "the caller ignores the result", so
any function is assignable to it:

\`\`\`ts
const out: number[] = [];
[1, 2].forEach((n) => out.push(n));   // fine: push returns a number, ignored
function log(): void { return 1; }    // error: a declaration may not return one
\`\`\`

So do not read the result of a \`() => void\` callback, and do not type a
callback \`() => undefined\` when you mean "ignored".

## Optional properties

\`{ x?: number }\` means the property may be missing, so reading \`a.x\` gives
\`number | undefined\` — never \`null\`, which only an explicit \`| null\` adds.
\`exactOptionalPropertyTypes\` (outside \`strict\`) additionally forbids writing
\`x: undefined\`, separating "missing" from "present but undefined".

## \`private\` is erased; \`#private\` is not

\`private\` and \`protected\` are compile-time checks. The emitted JavaScript has
an ordinary property that \`as any\`, bracket access, \`JSON.stringify\` and the
debugger all see. JavaScript's own \`#field\` is enforced by the runtime. Use
\`#\` when privacy must hold at runtime (library code, secrets); \`private\` is
fine for documenting intent in your own code.

## Type-only imports

Vite, esbuild, SWC and Babel transpile one file at a time and cannot tell
whether an imported name is a type or a value. \`import type { User }\` is always
erased, so there is no runtime import, no side effect and no "does not provide
an export named User" in the browser. \`verbatimModuleSyntax\` (TS 5.0) makes it
the rule: imports without \`type\` are kept as written, and importing a type
without it is an error. Turn it on in new projects.
`,
  },
  {
    id: 'ts-shapes',
    trackId: 'ts',
    title: 'Modelling shapes: unions, generics, utility types',
    blurb: 'interface vs type, discriminated unions, narrowing, generics and the built-in helpers.',
    estMinutes: 35,
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

\`readonly\` is erased like everything else — it stops assignment through that
type at compile time and nothing at runtime. A branded type (\`string & {
__brand: 'UserId' }\`) fakes nominal typing so two ids are not interchangeable.
Since TS 5.2, calling \`map\`/\`filter\` on a union of arrays such as \`string[]
| number[]\` works, but the result is an array of the union, \`(string |
number)[]\`.

\`DeepPartial\` and \`Nullable\` are *not* built in — they are the two most
often hand-rolled (or imported from type-fest). \`Awaited\` arrived in TS 4.5 and
\`NoInfer\` in 5.4.

## keyof typeof and indexed access

Keep one runtime object and derive the types from it:

\`\`\`ts
const STATUS = { draft: 0, paid: 1 };
type StatusKey = keyof typeof STATUS;           // 'draft' | 'paid'
type Item = Order['items'][number];            // element type of an array
type Role = (typeof ROLES)[number];            // union from an as-const array
\`\`\`

Read \`keyof typeof X\` right to left: \`typeof\` lifts the value to a type,
\`keyof\` takes its keys. \`T['a']['b']\` is an *indexed access type*; indexing an
array type with \`number\` gives the element type. Dot syntax (\`Order.items\`)
does not work on types.

## Awaited and friends

\`\`\`ts
declare function fetchUser(id: string): Promise<User>;
type U = Awaited<ReturnType<typeof fetchUser>>;   // User
type Args = Parameters<typeof fetchUser>;         // [id: string]
\`\`\`

Read inside out. Forgetting \`Awaited\` leaves you with \`Promise<User>\`. Deriving
means the type follows the function when it changes.

## Generics beat \`any\`, and generic defaults

\`function first<T>(xs: T[]): T | undefined\` keeps the caller's type:
\`first(users)\` is \`User | undefined\`, so \`first(users).emial\` fails to
compile. The \`any\` version returns \`any\` and every access after it is
unchecked. Generics are erased, so they cost nothing at runtime.

A type parameter can have a default, \`type ApiResponse<T = unknown>\`, so
callers who do not care can write \`ApiResponse\` and still get something safe.

An \`interface\` can \`extends\` a \`type\` alias when the alias is an object type
(or an intersection of them); it cannot extend a union. A \`type\` combines with
an interface through \`&\`.

## Assignability order

Types are sets of values, and \`A\` is assignable to \`B\` when every \`A\` is a
\`B\`. From widest to narrowest: \`unknown\` → \`string\` → \`'a' | 'b'\` → \`'a'\` →
\`never\`. \`unknown\` is the safe type for unchecked input; \`never\` is the type
of "cannot happen". \`any\` is off the chart — assignable in both directions,
which is the problem with it.

Mapped, conditional and template literal types are covered in depth in
*Type-level TypeScript*.
`,
  },
  {
    id: 'ts-practice',
    trackId: 'ts',
    title: 'TypeScript in a real codebase',
    blurb: 'Typing API boundaries, enums vs unions, runtime validation, and reading compiler errors.',
    estMinutes: 30,
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
// (zod v4 prefers the top-level z.email() over z.string().email())
\`\`\`

"Parse, don't validate": turn unknown data into a typed value once, at the edge,
and let the rest of the app trust it.

## enum vs union of literals

TypeScript's \`enum\` is one of the few features that **emits runtime code**, it
is nominally typed, numeric enums accept any \`number\`-typed value (5.0 only
rejects out-of-range literals), and it is not erasable syntax — Node's type
stripping and \`--erasableSyntaxOnly\` (TS 5.8) reject it. Most modern codebases
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

\`satisfies T\` checks a value against a type while keeping the narrower
inferred literal type. Vite/esbuild strip types without checking them, so \`tsc
--noEmit\` in CI is the only real type gate. For an untyped library, a small
local \`declare module "lib" { ... }\` beats \`any\`. Narrowing does not survive
into a callback for mutable properties — copy \`u.name\` to a \`const\` first.

## Config that matters

\`strict\`, \`noUncheckedIndexedAccess\` (makes \`arr[0]\` \`T | undefined\` —
correct and annoying), \`skipLibCheck\` (on, for build speed),
\`isolatedModules\` (required by single-file transpilers) and \`paths\` for
\`@/\` aliases, which must be mirrored in your bundler config too.

For a new Vite + React app: \`"strict": true\`, \`"moduleResolution": "bundler"\`
(TS 5.0; resolves like Vite, honouring package \`exports\`) and
\`"verbatimModuleSyntax": true\` (or at least \`isolatedModules\`). Never turn
\`noImplicitAny\` back off, and treat \`allowJs\` without \`checkJs\` as a
migration aid, not a destination.

## One schema, one type: z.infer

\`\`\`ts
const UserSchema = z.object({ id: z.string(), name: z.string() });
type User = z.infer<typeof UserSchema>;
\`\`\`

Do not keep an \`interface User\` beside the schema: two definitions drift, and
the app type-checks while validating something else. With \`z.infer\` the only
way to change the type is to change the check. If the schema transforms data,
\`z.input\` is the pre-parse shape.

\`value as unknown as Order\` is the double cast that gets past "types do not
sufficiently overlap". In application code it is a bug in waiting: the error was
telling you data crossed a boundary unvalidated or two models drifted. Parse,
fix the model or write a guard; keep double casts for tests.

## Typing events and generic components

Inline handlers get their event type from JSX. Once you extract one, type it
\`(e: React.ChangeEvent<HTMLInputElement>) => void\` (or
\`React.ChangeEventHandler<HTMLInputElement>\`), and \`e.target.value\` is a
\`string\` with no cast.

A component can be generic, so the caller's type flows into callbacks:

\`\`\`tsx
function List<T>({ items, render }: { items: T[]; render: (t: T) => React.ReactNode }) {
  return <ul>{items.map((t, i) => <li key={i}>{render(t)}</li>)}</ul>;
}
<List items={users} render={(u) => u.email} />;   // u: User
\`\`\`

In \`.tsx\`, a generic arrow function needs \`<T,>\` so the parser does not read
\`<T>\` as a tag.

## Augmenting Express's Request

Middleware that sets \`req.user\` needs the type in one place, not a cast in every
handler. Express's types declare an empty global \`Express.Request\` interface so
you can merge into it:

\`\`\`ts
// src/types/express.d.ts — must be a module and included by tsconfig
import type { AuthUser } from '../auth';
declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}
export {};
\`\`\`

Keep it optional unless every route is authenticated. The generic arguments of
\`Request<P, ResBody, ReqBody, Query>\` type params, bodies and query — not extra
fields. Covered in depth in *Type-level TypeScript*.

## Migrating JS to TS

1. Add a \`tsconfig.json\` with \`allowJs\` so \`.js\` and \`.ts\` build together.
2. Convert leaf modules and boundaries (API client, data layer) first; their
   types flow into everything that imports them.
3. Turn on strict flags one at a time — \`noImplicitAny\`, then
   \`strictNullChecks\` — parking leftovers with \`// @ts-expect-error\` and a
   ticket.
4. Remove \`allowJs\` once no \`.js\` files remain.

A \`.d.ts\` file holds declarations only and emits nothing; it is where the
local \`declare module 'lib'\` for an untyped package lives.
`,
  },
  {
    id: 'ts-advanced',
    trackId: 'ts',
    title: 'Type-level TypeScript',
    blurb:
      'Mapped, conditional and template literal types, `infer`, overloads and declaration files — reading the types libraries hand you.',
    estMinutes: 30,
    objectives: [
      'Read and write a mapped type with key remapping',
      'Explain conditional types, `infer` and distribution over unions',
      'Choose between overloads, unions and generics for a function signature',
      "Augment a library's types without forking it",
    ],
    primer: `
## Why type-level code matters

A CRUD developer rarely *writes* clever types, but reads them every day: hover
over a React prop, a TanStack Query hook or an ORM query and you are looking at
mapped and conditional types. The other everyday use is **deriving instead of
duplicating** — getting a component's props, a client's return type or a
route's params from the thing that already exists, so the type cannot drift.

That is the whole brief. Type-level code is not a place to show off. Keep a
complexity budget: if you cannot explain a type in code review, it is too
clever.

## Recap: keyof, typeof, indexed access

\`\`\`ts
const STATUS = { draft: 0, paid: 1 } as const;
type Key = keyof typeof STATUS;              // 'draft' | 'paid'
type Value = (typeof STATUS)[Key];           // 0 | 1
type Item = Order['items'][number];         // element type of an array property
\`\`\`

\`typeof\` lifts a value into a type, \`keyof\` gives a union of keys, and
\`T[K]\` looks a property type up. Everything below is built from these.

## Mapped types

A mapped type loops over keys and builds a new object type:

\`\`\`ts
type Opt<T> = { [K in keyof T]?: T[K] };               // this is Partial<T>
type Mutable<T> = { -readonly [K in keyof T]-?: T[K] }; // strip readonly and ?
\`\`\`

Modifiers can be added with \`+\` (the default) or removed with \`-\`: \`-?\` is how
\`Required\` works, \`readonly\` is how \`Readonly\` works. Mapping over
\`keyof T\` is *homomorphic*: the original modifiers are kept unless you change
them.

**Key remapping** with \`as\` (TS 4.1) renames or filters keys:

\`\`\`ts
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
// Getters<{ name: string }> is { getName: () => string }

type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
\`\`\`

The value side still sees the original \`K\`. Remapping a key to \`never\` drops
it. \`string & K\` keeps only the string keys, since \`Capitalize\` needs a string.

## Conditional types and infer

\`T extends U ? X : Y\` is an if-statement for types. Inside the \`extends\`
pattern, \`infer\` declares a placeholder that TypeScript fills in when the
pattern matches:

\`\`\`ts
type Unwrap<T> = T extends Promise<infer U> ? U : T;
type Elem<T> = T extends (infer E)[] ? E : never;
type Ret<F> = F extends (...args: any[]) => infer R ? R : never;
\`\`\`

\`Unwrap\` peels one layer only (\`Unwrap<Promise<Promise<number>>>\` is
\`Promise<number>\`), which is why the built-in \`Awaited\` is recursive.
\`ReturnType\` and \`Parameters\` are exactly the \`Ret\` pattern.

**Distribution.** When the checked type is a *naked* type parameter and you pass
a union, TypeScript evaluates the conditional once per member and unions the
results:

1. split \`T\` into its members;
2. check each member against \`U\`;
3. pick \`X\` or \`Y\` for that member;
4. union the results.

\`\`\`ts
type ToArr<T> = T extends any ? T[] : never;
type A = ToArr<string | number>;       // string[] | number[]
type NoDist<T> = [T] extends [any] ? T[] : never;
type B = NoDist<string | number>;      // (string | number)[]
\`\`\`

Members that land on \`never\` disappear from the union — that is how
\`Exclude\` filters. A \`never\` input has no members, so the result is \`never\`.
Wrapping both sides in a tuple switches distribution off.

## Template literal types

Template literal types build string types, and over a union they produce one
member per combination:

\`\`\`ts
type Ev = \`on\${Capitalize<'click' | 'hover'>}\`;   // 'onClick' | 'onHover'

type Params<P extends string> =
  P extends \`\${string}:\${infer K}/\${infer Rest}\` ? K | Params<\`/\${Rest}\`>
  : P extends \`\${string}:\${infer K}\` ? K
  : never;
type R = Params<'/orders/:id/items/:itemId'>;       // 'id' | 'itemId'
\`\`\`

The second one is how typed routers give you \`params.id\`. The helpers are
\`Uppercase\`, \`Lowercase\`, \`Capitalize\` and \`Uncapitalize\`. Unions multiply:
three 50-member unions in one template is 125,000 members, and TypeScript
refuses with "union type that is too complex to represent".

## Function signatures: overloads, unions, generics

| Situation | Reach for |
| --- | --- |
| Return type depends on which argument form was passed | overloads |
| Output type is the input type | a generic |
| Several input types, same return type | a union parameter |
| Callers should get literal types without writing as const | a const type parameter |
| One argument must not drive inference | NoInfer |

\`\`\`ts
function get(id: string): User;
function get(ids: string[]): User[];
function get(x: string | string[]): User | User[] { /* implementation */ }
\`\`\`

Overloads are tried top to bottom, so put the most specific first; the
implementation signature is invisible to callers. \`ReturnType\` and
\`Parameters\` see only the *last* overload.

A \`const\` type parameter (TS 5.0) infers as if the caller wrote \`as const\`:

\`\`\`ts
function tuple<const T extends readonly unknown[]>(x: T) { return x; }
const t = tuple(['a', 1]);   // readonly ['a', 1] — without const: (string | number)[]
\`\`\`

\`NoInfer<T>\` (TS 5.4) stops one position from contributing to inference:

\`\`\`ts
function createMachine<S extends string>(states: S[], initial: NoInfer<S>) {}
createMachine(['idle', 'running'], 'typo');   // error, instead of widening S
\`\`\`

## Variance and assignability

\`strictFunctionTypes\` (part of \`strict\`) checks function parameters
*contravariantly*: a handler that only accepts \`Dog\` cannot stand in for one
that must accept any \`Animal\`. The exception is **method shorthand**:

\`\`\`ts
interface A { handle(x: Animal): void }      // bivariant: unsound, allowed
interface B { handle: (x: Animal) => void }  // contravariant: checked
\`\`\`

Methods stay bivariant on purpose so \`Dog[]\` is still assignable to
\`Animal[]\`. Prefer the property form in your own interfaces;
typescript-eslint's \`method-signature-style\` rule enforces it. Also, a
\`readonly T[]\` is not assignable to \`T[]\` (the target could \`push\`), which
is why accepting \`readonly\` arrays in parameters is the friendlier signature.

## Declarations and module augmentation

A \`.d.ts\` file holds types only. \`declare module 'lib' { ... }\` types an
untyped package. To *add* to a library's types, use module augmentation, which
relies on interface merging:

\`\`\`ts
// src/types/ui-lib.d.ts — included by tsconfig
import 'ui-lib';                 // makes this file a module: required
declare module 'ui-lib' {
  interface Theme { brand: string }
}
\`\`\`

The top-level \`import\` is the gotcha. Without it, the file is a global script
and \`declare module 'ui-lib'\` becomes an ambient declaration that *replaces*
the library's types — every other import from it breaks. \`declare global\`
does the same job for globals (Express's \`Request\`, \`Window\`) and also
needs the file to be a module.

## When to stop

- A type nobody can read is a liability. Deep recursion also hits
  "Type instantiation is excessively deep and possibly infinite", and no
  tsconfig option raises that limit.
- Prefer a looser type plus runtime validation at the boundary over a type
  that tries to encode every rule. Business rules enforced only by the
  compiler do not exist at runtime.
- Test the types you keep: \`expectTypeOf(fn).returns.toEqualTypeOf<User>()\`
  in Vitest, or a \`// @ts-expect-error\` line that must stay an error.
- If the editor lags, \`tsc --extendedDiagnostics\` shows where the time goes.

Good type-level code is boring to read: \`ComponentProps<typeof Button>\`,
\`Awaited<ReturnType<typeof getOrders>>\`, a typed route. Derive, do not invent.
`,
  },
];
