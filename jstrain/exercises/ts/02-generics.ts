/**
 * MODULE TS-02 — Generics
 * ========================
 *
 * A generic is a type PARAMETER: the caller fills it in, exactly like a
 * function parameter but for types.
 *
 *   function first<T>(items: T[]): T | undefined
 *   first([1, 2])      // T is inferred as number   -> number | undefined
 *   first(['a'])       // T is inferred as string   -> string | undefined
 *
 * Compare that with `first(items: any[]): any`, which type-checks everything
 * and protects nothing.
 *
 * Constraints narrow what a caller may pass:
 *   <T extends { length: number }>   T must have a length
 *   <K extends keyof T>              K must be one of T's keys
 *
 * Run:  npx vitest run tests/ts/02-generics.test.ts
 *       npx vitest run --typecheck.only tests/ts
 */

/**
 * PROBLEM 1 (IMPLEMENT) — first / last.
 *
 * Return the first (or last) element, or undefined for an empty array.
 * The return type must track the element type: `first([1,2])` is
 * `number | undefined`, never `any`.
 */
export function first<T>(items: readonly T[]): T | undefined {
  throw new Error('TODO');
}

export function last<T>(items: readonly T[]): T | undefined {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 (IMPLEMENT) — pluck.
 *
 * Extract one property from every object. The result type must be the type of
 * that property: `pluck(users, 'age')` is `number[]`.
 */
export function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 (IMPLEMENT) — indexBy.
 *
 * Build a lookup keyed by a property whose values are strings.
 *   indexBy(users, 'id') -> Record<string, User>
 * Later duplicates overwrite earlier ones.
 */
export function indexBy<T, K extends keyof T>(
  items: readonly T[],
  key: K,
): Record<string, T> {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 (IMPLEMENT) — A constrained generic.
 *
 * Return whichever argument is longer. Both must have a `.length`, and the
 * return type is the same type that came in — so `longest('a','bb')` is a
 * string, not `{length: number}`. Ties return the first.
 */
export function longest<T extends { length: number }>(a: T, b: T): T {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 (IMPLEMENT) — Generic defaults.
 *
 * Return `value` unless it is null or undefined, in which case return
 * `fallback`. The result must never include null or undefined.
 */
export function orElse<T>(value: T | null | undefined, fallback: T): T {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 (DECLARE + IMPLEMENT) — A generic container.
 *
 * `Box<T>` holds one value and can be transformed without unwrapping:
 *   Box.of(2).map(n => n * 3).map(String).value   // '6'
 *
 * Declare the class so that `map` returns a `Box` of the NEW type.
 */
export class Box<T> {
  constructor(public readonly value: T) {}

  static of<V>(value: V): Box<V> {
    throw new Error('TODO');
  }

  map<R>(fn: (value: T) => R): Box<R> {
    throw new Error('TODO');
  }
}

/**
 * PROBLEM 7 (DECLARE) — A generic result type.
 *
 * The alternative to throwing: return either a success or a failure, and make
 * the compiler force the caller to check which one it is.
 *
 *   Result<number>            -> { ok: true, value: number } | { ok: false, error: Error }
 *   Result<number, string>    -> { ok: true, value: number } | { ok: false, error: string }
 *
 * `E` defaults to `Error`. The two members must be distinguishable by `ok`
 * (a discriminated union — module TS-03 leans on this hard).
 */
export type Result<T, E = Error> = unknown; // TODO

/**
 * PROBLEM 8 (IMPLEMENT) — Result constructors and consumers.
 */
export function ok<T>(value: T): { ok: true; value: T } {
  throw new Error('TODO');
}

export function err<E>(error: E): { ok: false; error: E } {
  throw new Error('TODO');
}

/**
 * Return the value, or `fallback` when the result is a failure.
 */
export function unwrapOr<T, E>(
  result: { ok: true; value: T } | { ok: false; error: E },
  fallback: T,
): T {
  throw new Error('TODO');
}

/**
 * Run `fn` and capture a thrown Error as a failed Result.
 */
export function tryCatch<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: Error } {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 (IMPLEMENT) — Generic mapping over objects.
 *
 * Transform every value, keeping the keys. The result's value type is
 * whatever `fn` returns.
 */
export function mapValues<T extends object, R>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => R,
): Record<keyof T, R> {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 (IMPLEMENT) — Typed Object.keys.
 *
 * `Object.keys` returns `string[]`, losing information. This one keeps it.
 * (It is a deliberate small lie — an object can have extra keys at run time —
 * which is exactly why the built-in is typed the way it is.)
 */
export function keysOf<T extends object>(obj: T): (keyof T)[] {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 (IMPLEMENT) — A generic factory with private state.
 *
 * `createCollection<T>()` returns an object with:
 *   add(item: T): void
 *   all(): readonly T[]          — a snapshot, not the live array
 *   find(predicate): T | undefined
 *   get size(): number
 */
export interface Collection<T> {
  add(item: T): void;
  all(): readonly T[];
  find(predicate: (item: T) => boolean): T | undefined;
  readonly size: number;
}

export function createCollection<T>(initial: readonly T[] = []): Collection<T> {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 (DECLARE) — A generic with a default parameter.
 *
 * An API envelope: `{ data: T; meta: { requestId: string; durationMs: number } }`
 * where `T` defaults to `unknown`.
 */
export type ApiResponse<T = unknown> = unknown; // TODO

/**
 * PROBLEM 13 (IMPLEMENT) — Generic inference through a callback.
 *
 * Sort a copy of `items` by the value returned by `selector`. Numbers compare
 * numerically, strings with localeCompare. The selector's return type must be
 * inferred, and the result stays `T[]`.
 */
export function sortBy<T, V extends string | number>(
  items: readonly T[],
  selector: (item: T) => V,
): T[] {
  throw new Error('TODO');
}
