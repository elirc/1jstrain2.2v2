/**
 * MODULE TS-04 — Utility types and mapped types
 * ==============================================
 *
 * A mapped type builds a new object type by walking the keys of another:
 *
 *   type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
 *
 * Read it as a for-loop over keys. Modifiers can be added (`readonly`, `?`)
 * or removed with a minus sign (`-readonly`, `-?`). A `as` clause can rename
 * or drop keys.
 *
 * The built-ins you must know cold — you will re-implement most of them here:
 *   Partial<T>  Required<T>  Readonly<T>  Pick<T,K>  Omit<T,K>
 *   Record<K,V>  Exclude<U,M>  Extract<U,M>  NonNullable<T>
 *   ReturnType<F>  Parameters<F>  Awaited<P>
 *
 * Run:  npx vitest run --typecheck.only tests/ts/04-utility-and-mapped-types.test-d.ts
 *       npx vitest run tests/ts/04-utility-and-mapped-types.test.ts
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  tags: string[];
  discontinued: boolean;
}

/**
 * PROBLEM 1 (DECLARE) — Rebuild Partial, Required and Readonly.
 *
 * Do not use the built-ins in the answer — write the mapped type.
 * Remember: `?` makes a key optional, `-?` removes optionality,
 * `readonly` locks a key, `-readonly` unlocks it.
 */
export type MyPartial<T> = unknown; // TODO
export type MyRequired<T> = unknown; // TODO
export type MyReadonly<T> = unknown; // TODO
export type Mutable<T> = unknown; // TODO  (the opposite of Readonly)

/**
 * PROBLEM 2 (DECLARE) — Rebuild Pick and Omit.
 *
 * `MyPick<Product, 'id' | 'name'>`  -> { id: string; name: string }
 * `MyOmit<Product, 'tags'>`         -> everything except tags
 *
 * Hint for Omit: `Exclude<keyof T, K>` gives you the keys to keep.
 */
export type MyPick<T, K extends keyof T> = unknown; // TODO
export type MyOmit<T, K extends keyof T> = unknown; // TODO

/**
 * PROBLEM 3 (DECLARE) — Rebuild Record.
 *
 * `MyRecord<'a' | 'b', number>` -> { a: number; b: number }
 */
export type MyRecord<K extends keyof any, V> = unknown; // TODO

/**
 * PROBLEM 4 (DECLARE) — Nullable everywhere.
 *
 * Every property may also be null.
 *   NullableFields<{ a: string }> -> { a: string | null }
 */
export type NullableFields<T> = unknown; // TODO

/**
 * PROBLEM 5 (DECLARE) — DeepPartial.
 *
 * Recursively optional. Arrays and functions are left alone; only plain
 * object properties recurse.
 *
 *   DeepPartial<{ a: { b: number } }> -> { a?: { b?: number } }
 */
export type DeepPartial<T> = unknown; // TODO

/**
 * PROBLEM 6 (DECLARE) — Key remapping with `as`.
 *
 * Turn every property into a getter method name:
 *   Getters<{ name: string; age: number }>
 *     -> { getName: () => string; getAge: () => number }
 *
 * Hint: `[K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]`
 */
export type Getters<T> = unknown; // TODO

/**
 * PROBLEM 7 (DECLARE) — Filtering keys by their value type.
 *
 * `PickByType<Product, string>` -> { id: string; name: string }
 * (a key whose value type is not assignable to V is mapped to `never`,
 * which removes it)
 */
export type PickByType<T, V> = unknown; // TODO

/**
 * PROBLEM 8 (DECLARE) — Which keys are optional?
 *
 * `OptionalKeys<{ a: string; b?: number }>` -> 'b'
 *
 * Hint: for each key, compare `{}` against `Pick<T, K>`; if `{}` is assignable
 * then the key is optional.
 */
export type OptionalKeys<T> = unknown; // TODO

/**
 * PROBLEM 9 (DECLARE) — Entries.
 *
 * `Entries<{ a: string; b: number }>`
 *   -> ['a', string] | ['b', number]
 */
export type Entries<T> = unknown; // TODO

/**
 * PROBLEM 10 (IMPLEMENT) — Use the utility types for real.
 *
 * Apply a partial patch to an entity, returning a new object. Undefined
 * values in the patch are IGNORED (they mean "not provided"), so a caller
 * cannot accidentally erase a field by spreading an incomplete form.
 */
export function applyPatch<T extends object>(entity: T, patch: Partial<T>): T {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 (IMPLEMENT) — Typed pick and omit.
 *
 * The runtime behaviour is easy; the point is the signature, which must give
 * the caller a precisely narrowed object type.
 */
export function pickFields<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  throw new Error('TODO');
}

export function omitFields<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 (IMPLEMENT) — Typed Object.entries.
 *
 * Returns the entries with literal key types instead of `string`.
 */
export function entriesOf<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  throw new Error('TODO');
}

/**
 * PROBLEM 13 (IMPLEMENT) — A form model built from an entity type.
 *
 * Given a Product, produce a draft where every field is optional and every
 * value is a string (what an HTML form actually gives you).
 * Arrays are joined with ', '. Booleans become 'true' / 'false'.
 */
export type ProductDraft = { [K in keyof Product]?: string };

export function toDraft(product: Product): ProductDraft {
  throw new Error('TODO');
}
