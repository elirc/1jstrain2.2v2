/**
 * MODULE TS-01 — Types, unions and narrowing
 * ===========================================
 *
 * TypeScript is JavaScript plus a compile-time type checker. It never runs:
 * every type you write is erased before the code executes. What it buys you is
 * that the compiler reads your whole codebase and tells you where the shapes
 * disagree.
 *
 * The mental model that matters: a type is a SET OF VALUES.
 *   string           -> every string
 *   'a' | 'b'        -> exactly two values (a "literal union")
 *   string | number  -> the union of two sets
 *   unknown          -> every value (you must narrow before using it)
 *   never            -> no values at all (used for "this cannot happen")
 *
 * `any` switches the checker off. Treat it as a bug: this course uses
 * `unknown` instead, which forces you to prove what a value is.
 *
 * Two kinds of problem in the TS track:
 *   - IMPLEMENT: the signature is given, write the body.
 *   - DECLARE:   replace `unknown` with the right type.
 *
 * Run:  npx vitest run tests/ts/01-basic-types.test.ts        (behaviour)
 *       npx vitest run --typecheck.only tests/ts             (types)
 */

/**
 * PROBLEM 1 (DECLARE) — The primitive types.
 *
 * A union of every value type that is NOT an object in JavaScript:
 * string, number, boolean, bigint, symbol, null and undefined.
 */
export type Primitive = unknown; // TODO

/**
 * PROBLEM 2 (DECLARE) — Nullable.
 *
 * `Nullable<string>` should mean "a string, or null, or undefined".
 */
export type Nullable<T> = unknown; // TODO

/**
 * PROBLEM 3 (DECLARE) — A tuple.
 *
 * Exactly two numbers: [x, y]. Not `number[]`, which allows any length.
 */
export type Point = unknown; // TODO

/**
 * PROBLEM 4 (IMPLEMENT) — Euclidean distance between two points.
 */
export function distance(a: [number, number], b: [number, number]): number {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 (DECLARE + IMPLEMENT) — Literal unions instead of strings.
 *
 * `LogLevel` is exactly 'debug' | 'info' | 'warn' | 'error'.
 * `shouldLog(level, minimum)` returns true when `level` is at least as severe
 * as `minimum` (debug < info < warn < error).
 */
export type LogLevel = unknown; // TODO

export function shouldLog(level: string, minimum: string): boolean {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 (DECLARE) — An interface with optional and readonly members.
 *
 * A User has:
 *   id          a readonly number (cannot be reassigned after creation)
 *   name        a string
 *   email       an optional string
 *   roles       a readonly array of strings
 */
export interface User {
  // TODO
}

/**
 * PROBLEM 7 (IMPLEMENT) — Narrowing a union.
 *
 * Return:
 *   strings   -> the string itself, wrapped in quotes: '"hi"'
 *   numbers   -> the number with 2 decimals: '3.50'
 *   booleans  -> 'yes' / 'no'
 *   null      -> 'none'
 *   undefined -> 'none'
 *
 * TypeScript narrows the type inside each branch — hover over `value` in your
 * editor to watch it happen.
 */
export function formatValue(value: string | number | boolean | null | undefined): string {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 (IMPLEMENT) — `unknown` is the safe `any`.
 *
 * Turn an unknown value into a number, or return `fallback`:
 *   - a finite number passes through
 *   - a numeric string is converted
 *   - anything else (including NaN, booleans, objects) uses the fallback
 */
export function toCount(value: unknown, fallback: number): number {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 (DECLARE) — Deriving a type from data with `as const`.
 *
 * ROLES is a readonly tuple. Derive `Role` from it so that adding a role to
 * the array automatically widens the type — do NOT retype the strings by hand.
 *
 * Hint: `(typeof ROLES)[number]`
 */
export const ROLES = ['admin', 'editor', 'viewer'] as const;

export type Role = unknown; // TODO

/**
 * PROBLEM 10 (IMPLEMENT) — Record types.
 *
 * `scores` maps a player name to a score. Return the name with the highest
 * score, or null when the record is empty. Ties go to the name that compares
 * first alphabetically.
 */
export function bestPlayer(scores: Record<string, number>): string | null {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 (IMPLEMENT) — Optional parameters and defaults.
 *
 * Build a greeting. `options` and each of its fields are optional.
 *   greet('Ada')                                  -> 'Hello, Ada!'
 *   greet('Ada', { greeting: 'Hi' })              -> 'Hi, Ada!'
 *   greet('Ada', { shout: true })                 -> 'HELLO, ADA!'
 *   greet('Ada', { greeting: 'Yo', shout: true }) -> 'YO, ADA!'
 */
export function greet(
  name: string,
  options?: { greeting?: string; shout?: boolean },
): string {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 (IMPLEMENT) — `never` and exhaustiveness.
 *
 * `assertNever` is the trick that makes the compiler tell you when you forget
 * a case: it accepts a value of type `never`, so it only compiles if every
 * possible case has already been handled.
 *
 * It always throws: `new Error('Unexpected value: ' + JSON.stringify(value))`.
 */
export function assertNever(value: never): never {
  throw new Error('TODO');
}

/**
 * PROBLEM 13 (IMPLEMENT) — Put it together.
 *
 * Convert a log level to a numeric severity: debug 10, info 20, warn 30,
 * error 40 — and use `assertNever` in the default branch so the compiler
 * catches a missing case.
 */
export function severity(level: 'debug' | 'info' | 'warn' | 'error'): number {
  throw new Error('TODO');
}

/**
 * PROBLEM 14 (DECLARE) — Function types.
 *
 * A `Comparator<T>` takes two T values and returns a number
 * (negative / zero / positive), exactly like the callback Array#sort wants.
 */
export type Comparator<T> = unknown; // TODO

/**
 * PROBLEM 15 (IMPLEMENT) — Build a comparator.
 *
 * `byKey('age')` returns a comparator that sorts objects by their `age`
 * property ascending (numbers numerically, strings alphabetically).
 */
export function byKey<T, K extends keyof T>(key: K): (a: T, b: T) => number {
  throw new Error('TODO');
}
