/**
 * MODULE TS-05 — Conditional types, infer and template literal types
 * ===================================================================
 *
 * A conditional type is a type-level if:
 *
 *   type IsString<T> = T extends string ? true : false;
 *
 * `infer` declares a type variable inside the condition and captures whatever
 * matched:
 *
 *   type ElementOf<T> = T extends (infer E)[] ? E : never;
 *
 * Two rules that will bite you:
 *   - Conditional types DISTRIBUTE over naked union type parameters:
 *     `ToArray<string | number>` gives `string[] | number[]`, not
 *     `(string | number)[]`. Wrapping both sides in `[]` switches that off.
 *   - `never` in a distributed union disappears — that is how you filter.
 *
 * Template literal types do string manipulation at compile time:
 *   type Handler = `on${Capitalize<'click'>}`   // 'onClick'
 * with the built-in helpers Uppercase, Lowercase, Capitalize, Uncapitalize.
 *
 * This module is mostly type-level. Run:
 *   npx vitest run --typecheck.only tests/ts/05-conditional-and-template-types.test-d.ts
 */

/**
 * PROBLEM 1 (DECLARE) — Unwrap a promise.
 *
 *   UnwrapPromise<Promise<string>> -> string
 *   UnwrapPromise<string>          -> string   (already unwrapped)
 *   UnwrapPromise<Promise<Promise<number>>> -> number  (recurse)
 */
export type UnwrapPromise<T> = unknown; // TODO

/**
 * PROBLEM 2 (DECLARE) — The element type of an array.
 *
 *   ElementOf<string[]>            -> string
 *   ElementOf<readonly number[]>   -> number
 *   ElementOf<string>              -> never
 */
export type ElementOf<T> = unknown; // TODO

/**
 * PROBLEM 3 (DECLARE) — Rebuild ReturnType and Parameters with `infer`.
 */
export type MyReturnType<F> = unknown; // TODO
export type MyParameters<F> = unknown; // TODO

/**
 * PROBLEM 4 (DECLARE) — Rebuild Exclude, Extract and NonNullable.
 *
 * These rely on distribution over unions.
 *   MyExclude<'a' | 'b' | 'c', 'a'>  -> 'b' | 'c'
 *   MyExtract<'a' | 'b', 'a' | 'z'>  -> 'a'
 *   MyNonNullable<string | null>     -> string
 */
export type MyExclude<T, U> = unknown; // TODO
export type MyExtract<T, U> = unknown; // TODO
export type MyNonNullable<T> = unknown; // TODO

/**
 * PROBLEM 5 (DECLARE) — Deep array flattening, at the type level.
 *
 *   Flatten<number[][]>       -> number
 *   Flatten<string[][][]>     -> string
 *   Flatten<boolean>          -> boolean
 */
export type Flatten<T> = unknown; // TODO

/**
 * PROBLEM 6 (DECLARE) — Event names from a union of event types.
 *
 *   EventHandlerName<'click' | 'focus'> -> 'onClick' | 'onFocus'
 */
export type EventHandlerName<T extends string> = unknown; // TODO

/**
 * PROBLEM 7 (DECLARE) — snake_case to camelCase, at the type level.
 *
 *   CamelCase<'user_first_name'> -> 'userFirstName'
 *   CamelCase<'id'>              -> 'id'
 *
 * Hint: match `${infer Head}_${infer Tail}` and recurse on the tail.
 */
export type CamelCase<S extends string> = unknown; // TODO

/**
 * PROBLEM 8 (DECLARE) — Rename every key of an object to camelCase.
 *
 *   CamelCaseKeys<{ user_id: string; created_at: number }>
 *     -> { userId: string; createdAt: number }
 */
export type CamelCaseKeys<T> = unknown; // TODO

/**
 * PROBLEM 9 (DECLARE) — Split a string on a delimiter.
 *
 *   Split<'a.b.c', '.'> -> ['a', 'b', 'c']
 *   Split<'a', '.'>     -> ['a']
 *   Split<'', '.'>      -> []
 */
export type Split<S extends string, D extends string> = unknown; // TODO

/**
 * PROBLEM 10 (DECLARE) — Dotted paths into an object type.
 *
 *   Path<{ a: { b: string }; c: number }> -> 'a' | 'a.b' | 'c'
 *
 * Only recurse into plain object properties (not arrays, not functions).
 */
export type Path<T> = unknown; // TODO

/**
 * PROBLEM 11 (IMPLEMENT + DECLARE) — A fully typed event emitter.
 *
 * The events map declares each event's payload:
 *
 *   type AppEvents = { login: { userId: string }; logout: void };
 *   const bus = createEmitter<AppEvents>();
 *   bus.on('login', (payload) => payload.userId);   // payload is typed
 *   bus.emit('login', { userId: 'u1' });            // payload is checked
 *   bus.emit('nope', {});                           // compile error
 *
 * Declare `Emitter<Events>` with `on`, `off` and `emit` so that the payload
 * type follows the event name, then implement `createEmitter`.
 * `on` returns an unsubscribe function.
 */
export interface Emitter<Events extends Record<string, unknown>> {
  // TODO
  on: unknown;
  off: unknown;
  emit: unknown;
}

export function createEmitter<Events extends Record<string, unknown>>(): Emitter<Events> {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 (IMPLEMENT) — Runtime counterpart of PROBLEM 7.
 *
 * Convert an object's keys from snake_case to camelCase (one level deep).
 * The return type is `CamelCaseKeys<T>` from PROBLEM 8, so once that type is
 * right the caller gets precise keys — you will need one `as` cast, because
 * TypeScript cannot follow a template-literal rename through Object.entries.
 */
export function camelizeKeys<T extends Record<string, unknown>>(obj: T): CamelCaseKeys<T> {
  throw new Error('TODO');
}
