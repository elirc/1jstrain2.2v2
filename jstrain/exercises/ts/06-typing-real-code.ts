/**
 * MODULE TS-06 — Typing code you would actually ship
 * ===================================================
 *
 * Everything so far has been vocabulary. This module is the sentence: an API
 * client, a reducer, branded IDs, overloads and `satisfies` — the shapes that
 * show up in every real TypeScript codebase.
 *
 * Run:  npx vitest run tests/ts/06-typing-real-code.test.ts
 *       npx vitest run --typecheck.only tests/ts/06-typing-real-code.test-d.ts
 */

/**
 * PROBLEM 1 (DECLARE + IMPLEMENT) — Branded (nominal) types.
 *
 * TypeScript is structural: `type UserId = string` means any string is a
 * UserId, so `deleteUser(orderId)` compiles happily. A brand fixes that:
 *
 *   type UserId = string & { readonly __brand: 'UserId' };
 *
 * Nothing exists at run time — the brand is a compile-time lie that makes the
 * two types incompatible.
 *
 * Declare `UserId` and `OrderId`, then write the constructors. `toUserId`
 * throws a TypeError('invalid id') for an empty string.
 */
export type UserId = unknown; // TODO
export type OrderId = unknown; // TODO

export function toUserId(value: string): UserId {
  throw new Error('TODO');
}

export function toOrderId(value: string): OrderId {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 (IMPLEMENT) — Function overloads.
 *
 * One implementation, several public signatures:
 *   parseIds('a')          -> UserId          (a single id in, a single id out)
 *   parseIds(['a', 'b'])   -> UserId[]
 *
 * The implementation signature (the third one) is NOT visible to callers.
 */
export function parseIds(value: string): UserId;
export function parseIds(value: string[]): UserId[];
export function parseIds(value: string | string[]): UserId | UserId[] {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 (DECLARE) — A typed action union for a reducer.
 *
 * Actions:
 *   { type: 'add';    payload: { text: string } }
 *   { type: 'toggle'; payload: { id: string } }
 *   { type: 'remove'; payload: { id: string } }
 *   { type: 'clearCompleted' }                      (no payload)
 */
export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoState {
  todos: Todo[];
  nextId: number;
}

// TODO: replace this placeholder with the four-member discriminated union.
export type TodoAction = { type: string; payload?: unknown };

/**
 * PROBLEM 4 (IMPLEMENT) — The reducer.
 *
 * 'add' appends `{ id: String(state.nextId), text, done: false }` and
 * increments nextId. 'toggle' flips done. 'remove' drops the todo.
 * 'clearCompleted' keeps only the unfinished ones. An unknown action returns
 * the same state object.
 *
 * Never mutate `state`.
 */
export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 (DECLARE) — Pull one member out of an action union.
 *
 * Every Redux-style codebase needs these two:
 *
 *   ActionOf<'add'>            -> { type: 'add'; payload: { text: string } }
 *   PayloadOf<'toggle'>        -> { id: string }
 *   PayloadOf<'clearCompleted'> -> undefined   (that action has no payload)
 *
 * Hints: `Extract<TodoAction, { type: T }>` selects the member;
 * `X extends { payload: infer P } ? P : undefined` reads its payload.
 */
export type ActionOf<T extends TodoAction['type']> = unknown; // TODO
export type PayloadOf<T extends TodoAction['type']> = unknown; // TODO

/**
 * PROBLEM 6 (IMPLEMENT) — A typed API client.
 *
 * `request` takes a URL and a validator, calls `fetchJson`, and returns
 * typed data. A validator is `(value: unknown) => T | null`.
 *
 * If the validator returns null, reject with an Error
 * ('invalid response from <url>'). Network errors propagate unchanged.
 *
 * This is the pattern that stops `any` from leaking in through the network
 * boundary.
 */
export type Validator<T> = (value: unknown) => T | null;

export async function request<T>(
  url: string,
  validate: Validator<T>,
  fetchJson: (url: string) => Promise<unknown>,
): Promise<T> {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 (IMPLEMENT) — Compose validators.
 *
 * `objectOf({ id: isString, age: isNumber })` returns a Validator for
 * `{ id: string; age: number }`: it returns the object when every field
 * validates, and null otherwise. Extra properties are dropped.
 */
export function isStringValue(value: unknown): string | null {
  throw new Error('TODO');
}

export function isNumberValue(value: unknown): number | null {
  throw new Error('TODO');
}

export function objectOf<T extends Record<string, Validator<unknown>>>(
  shape: T,
): Validator<{ [K in keyof T]: NonNullable<ReturnType<T[K]>> }> {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 (IMPLEMENT) — `satisfies`, and why it beats a type annotation.
 *
 * `const config: Config = {...}` widens the values to the declared types.
 * `const config = {...} satisfies Config` CHECKS against Config but keeps the
 * narrow literal types, so `config.env` is 'production', not `string`.
 *
 * Declare ROUTES with `as const satisfies Record<string, RouteDefinition>` so
 * that it is checked against the route shape while keeping its exact keys and
 * literal path strings. (`satisfies` alone keeps the keys; `as const` is what
 * keeps the values literal too.)
 */
export interface RouteDefinition {
  path: string;
  auth: boolean;
}

// TODO: replace the `: Record<string, RouteDefinition>` annotation with
// `as const satisfies Record<string, RouteDefinition>` after the object.
export const ROUTES: Record<string, RouteDefinition> = {
  home: { path: '/', auth: false },
  profile: { path: '/me', auth: true },
  settings: { path: '/settings', auth: true },
};

/**
 * PROBLEM 9 (IMPLEMENT) — Use the narrowed ROUTES.
 *
 * Return the path for a route name. Once ROUTES uses `satisfies`, the
 * parameter type `keyof typeof ROUTES` becomes 'home' | 'profile' | 'settings'
 * instead of `string`, so a typo is a compile error.
 */
export function routePath(name: keyof typeof ROUTES): string {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 (IMPLEMENT) — A builder with `this` types.
 *
 * Each method returns `this`, so subclasses keep their own type through the
 * chain.
 *
 *   new RequestBuilder('/users').method('POST').header('a', 'b').body({x: 1}).build()
 *     -> { url: '/users', method: 'POST', headers: { a: 'b' }, body: { x: 1 } }
 *
 * Defaults: method 'GET', headers {}, body undefined.
 */
export interface BuiltRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: unknown;
}

export class RequestBuilder {
  constructor(private readonly url: string) {}

  method(method: BuiltRequest['method']): this {
    throw new Error('TODO');
  }

  header(name: string, value: string): this {
    throw new Error('TODO');
  }

  body(body: unknown): this {
    throw new Error('TODO');
  }

  build(): BuiltRequest {
    throw new Error('TODO');
  }
}
