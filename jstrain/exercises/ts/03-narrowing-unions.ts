/**
 * MODULE TS-03 — Discriminated unions, guards and exhaustiveness
 * ===============================================================
 *
 * This is the single most valuable pattern in applied TypeScript. Instead of
 * one loose object with optional fields:
 *
 *   // BAD: every field optional, every combination "valid"
 *   { loading?: boolean; data?: User; error?: string }
 *
 * model the states that actually exist and tag each one:
 *
 *   | { status: 'loading' }
 *   | { status: 'success'; data: User }
 *   | { status: 'error'; message: string }
 *
 * Now `if (state.status === 'success')` narrows the type, `state.data` only
 * exists where it makes sense, and impossible states cannot be constructed.
 *
 * Narrowing tools: typeof, instanceof, `in`, === on a literal field,
 * Array.isArray, truthiness, and your own type predicates (`x is T`).
 *
 * Run:  npx vitest run tests/ts/03-narrowing-unions.test.ts
 */

/**
 * PROBLEM 1 (DECLARE) — A discriminated union of shapes.
 *
 * Circle    { kind: 'circle'; radius: number }
 * Square    { kind: 'square'; size: number }
 * Rectangle { kind: 'rectangle'; width: number; height: number }
 *
 * Declare the three interfaces and the `Shape` union.
 */
export interface Circle {
  // TODO
}
export interface Square {
  // TODO
}
export interface Rectangle {
  // TODO
}
export type Shape = unknown; // TODO

/**
 * PROBLEM 2 (IMPLEMENT) — Exhaustive switch.
 *
 * Compute the area. Use a `switch` on `kind` and call `assertNever` in the
 * default branch so that adding a fourth shape becomes a COMPILE error rather
 * than a runtime surprise.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

export function area(shape: Shape): number {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 (IMPLEMENT) — Type predicates.
 *
 * A function returning `value is X` teaches the compiler something it cannot
 * work out on its own.
 */
export function isString(value: unknown): value is string {
  throw new Error('TODO');
}

/**
 * Narrow away null and undefined — the one you will use most often, because
 * `list.filter(isDefined)` turns `(T | null)[]` into `T[]`.
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  throw new Error('TODO');
}

/**
 * True only for finite numbers (NaN and Infinity are excluded).
 */
export function isFiniteNumber(value: unknown): value is number {
  throw new Error('TODO');
}

/**
 * True for a non-null object that is not an array.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 (IMPLEMENT) — Use the guards.
 *
 * Drop every null/undefined from a list. The RESULT type must have no
 * null/undefined in it — which happens automatically if you filter with a
 * type predicate.
 */
export function compact<T>(items: readonly (T | null | undefined)[]): T[] {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 (DECLARE + IMPLEMENT) — Async state, done properly.
 *
 * AsyncState<T> is:
 *   { status: 'idle' }
 *   { status: 'loading' }
 *   { status: 'success'; data: T }
 *   { status: 'error'; error: Error }
 */
export type AsyncState<T> = unknown; // TODO

/**
 * Render a state to a string:
 *   idle    -> 'Nothing yet'
 *   loading -> 'Loading…'
 *   success -> `Loaded: ${JSON.stringify(data)}`
 *   error   -> `Failed: ${error.message}`
 *
 * Use an exhaustive switch again.
 */
export function renderState<T>(state: AsyncState<T>): string {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 (IMPLEMENT) — Narrowing with `in`.
 *
 * Two account shapes with no discriminant field:
 *   { email: string }        a user account
 *   { apiKey: string }       a service account
 *
 * Return 'user:<email>' or 'service:<first 4 chars of apiKey>…'.
 */
export function describeAccount(account: { email: string } | { apiKey: string }): string {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 (IMPLEMENT) — Assertion functions.
 *
 * An `asserts` signature narrows the caller's variable for the rest of the
 * scope. Throw a TypeError('expected a non-empty string') when it does not
 * hold.
 */
export function assertNonEmptyString(value: unknown): asserts value is string {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 (IMPLEMENT) — Parsing unknown data at the boundary.
 *
 * Everything that comes from JSON.parse, fetch or localStorage is `unknown`.
 * Validate it once, at the edge:
 *
 * Return a User when `value` is an object with a string `id`, a string `name`
 * and (optionally) a number `age`; otherwise return null.
 */
export interface ParsedUser {
  id: string;
  name: string;
  age?: number;
}

export function parseUser(value: unknown): ParsedUser | null {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 (IMPLEMENT) — A pattern matcher.
 *
 * `match(state, handlers)` picks the handler for `state.status` and calls it
 * with that state's payload. Every status needs a handler, and the compiler
 * enforces it — leaving one out is an error at the call site.
 *
 *   match(state, {
 *     idle: () => 'i',
 *     loading: () => 'l',
 *     success: (data) => `got ${data}`,
 *     error: (error) => error.message,
 *   })
 *
 * This is how you replace a wall of `if (state.status === ...)` in a
 * component with one expression.
 */
export function match<T, R>(
  state: AsyncState<T>,
  handlers: {
    idle: () => R;
    loading: () => R;
    success: (data: T) => R;
    error: (error: Error) => R;
  },
): R {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 (IMPLEMENT) — Discriminating an error union.
 *
 * Given `unknown` caught in a catch block (which is what TypeScript gives you
 * since 4.4), produce a readable message:
 *   - an Error       -> `${name}: ${message}`
 *   - a string       -> the string itself
 *   - anything else  -> 'Unknown error'
 */
export function describeCaught(caught: unknown): string {
  throw new Error('TODO');
}
