/**
 * MODULE JS-04 — Objects, destructuring and immutable updates
 * ============================================================
 *
 * In JavaScript, objects are passed by reference. `const a = { n: 1 }; const
 * b = a; b.n = 2;` changes `a` too. Every React and Redux bug you will write
 * in your first year traces back to that sentence.
 *
 * Tools you need here:
 *   { ...obj }                shallow copy / merge (later wins)
 *   const { a, b = 1 } = obj  destructuring with a default
 *   const { a, ...rest } = o  rest properties
 *   obj?.a?.b                 optional chaining (undefined instead of a throw)
 *   Object.keys/values/entries/fromEntries
 *   Object.hasOwn(obj, key)   own-property check (better than `in`)
 *
 * Every function must leave its arguments untouched. The tests check.
 *
 * Run:  npx vitest run tests/js/04-objects.test.js
 */

/**
 * PROBLEM 1 — pick.
 *
 * Return a new object with only the listed keys that actually exist.
 *   pick({ a: 1, b: 2, c: 3 }, ['a', 'c', 'zz']) -> { a: 1, c: 3 }
 *
 * A key whose value is `undefined` but which IS present should be kept.
 *
 * @param {Record<string, unknown>} obj
 * @param {string[]} keys
 * @returns {Record<string, unknown>}
 */
export function pick(obj, keys) {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — omit.
 *
 *   omit({ a: 1, b: 2, c: 3 }, ['b']) -> { a: 1, c: 3 }
 *
 * @param {Record<string, unknown>} obj
 * @param {string[]} keys
 * @returns {Record<string, unknown>}
 */
export function omit(obj, keys) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — mapValues.
 *
 * Transform every value, keeping the keys.
 *   mapValues({ a: 1, b: 2 }, n => n * 10) -> { a: 10, b: 20 }
 *
 * @param {Record<string, any>} obj
 * @param {(value: any, key: string) => any} fn
 * @returns {Record<string, any>}
 */
export function mapValues(obj, fn) {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — invert.
 *
 * Swap keys and values (values are coerced to strings). On collisions the
 * LAST key wins.
 *   invert({ a: 'x', b: 'y' })      -> { x: 'a', y: 'b' }
 *   invert({ a: 'x', b: 'x' })      -> { x: 'b' }
 *
 * @param {Record<string, string | number>} obj
 * @returns {Record<string, string>}
 */
export function invert(obj) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — deepClone.
 *
 * Recursively copy plain objects, arrays and Dates. Primitives and functions
 * are returned as-is (functions are not cloned). Do NOT use structuredClone
 * or JSON.parse(JSON.stringify(...)) — the point is to write the recursion.
 *
 * The clone must share no object references with the original.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepClone(value) {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — deepMerge.
 *
 * Merge `source` into `target` recursively and return a NEW object.
 *   - plain objects merge key by key
 *   - arrays are replaced, not concatenated
 *   - a source value of `undefined` does not overwrite
 *   - a source value of `null` DOES overwrite
 *
 *   deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 9, d: 3 } })
 *     -> { a: { b: 1, c: 9, d: 3 } }
 *
 * Tip: solve PROBLEM 11 (isPlainObject) first and call it from here.
 *
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @returns {Record<string, any>}
 */
export function deepMerge(target, source) {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — getPath.
 *
 * Read a nested value with a string path. Support dot notation and numeric
 * bracket indexes. Return `fallback` (default undefined) if any step is
 * missing.
 *
 *   getPath({ a: { b: [{ c: 42 }] } }, 'a.b[0].c')      -> 42
 *   getPath({ a: {} }, 'a.b.c', 'none')                 -> 'none'
 *   getPath({ a: { b: null } }, 'a.b', 'none')          -> null (present!)
 *
 * @param {unknown} obj
 * @param {string} path
 * @param {unknown} [fallback]
 * @returns {unknown}
 */
export function getPath(obj, path, fallback) {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — setPath, immutably.
 *
 * Return a new object with the value at `path` replaced. Objects along the
 * path are copied; everything else is shared. Missing intermediate objects
 * are created. Numeric path segments create/copy arrays.
 *
 *   const before = { a: { b: 1 }, keep: { x: 1 } };
 *   const after = setPath(before, 'a.b', 2);
 *   after.a.b === 2 && before.a.b === 1     // originals untouched
 *   after.keep === before.keep              // untouched branches are SHARED
 *
 * @param {Record<string, any>} obj
 * @param {string} path
 * @param {unknown} value
 * @returns {Record<string, any>}
 */
export function setPath(obj, path, value) {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — deepFreeze.
 *
 * Freeze an object and everything reachable from it, then return it.
 * Must not blow up on cyclic references.
 *
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepFreeze(obj) {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — renameKeys.
 *
 * Rename keys according to a mapping; keys not in the mapping pass through.
 *   renameKeys({ first_name: 'Ada', age: 36 }, { first_name: 'firstName' })
 *     -> { firstName: 'Ada', age: 36 }
 *
 * @param {Record<string, unknown>} obj
 * @param {Record<string, string>} mapping
 * @returns {Record<string, unknown>}
 */
export function renameKeys(obj, mapping) {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 — isPlainObject.
 *
 * true for `{}` and `Object.create(null)`; false for arrays, null, Dates,
 * class instances, functions and primitives.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPlainObject(value) {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 — Flatten a nested object into dotted keys.
 *
 *   flattenKeys({ a: { b: 1, c: { d: 2 } }, e: 3 })
 *     -> { 'a.b': 1, 'a.c.d': 2, e: 3 }
 *
 * Arrays and non-plain-objects are leaves (do not descend into them).
 * An empty nested object simply disappears.
 *
 * @param {Record<string, any>} obj
 * @param {string} [prefix='']
 * @returns {Record<string, unknown>}
 */
export function flattenKeys(obj, prefix = '') {
  throw new Error('TODO');
}

/**
 * PROBLEM 13 — Normalise an API response.
 *
 * Turn a list of records into a lookup table plus an id order, the shape
 * every serious front-end cache uses:
 *
 *   normalizeById([{ id: 'a', n: 1 }, { id: 'b', n: 2 }])
 *     -> { byId: { a: { id: 'a', n: 1 }, b: { id: 'b', n: 2 } }, ids: ['a','b'] }
 *
 * Later records with the same id replace earlier ones, and `ids` keeps the
 * FIRST position with no duplicates.
 *
 * @template {{ id: string }} T
 * @param {T[]} records
 * @returns {{ byId: Record<string, T>, ids: string[] }}
 */
export function normalizeById(records) {
  throw new Error('TODO');
}

/**
 * PROBLEM 14 — Diff two flat objects.
 *
 * Return `{ added, removed, changed }` where added/removed are key arrays and
 * changed is `{ key: { from, to } }`. Compare values with Object.is.
 *
 *   diffObjects({ a: 1, b: 2 }, { b: 3, c: 4 })
 *     -> { added: ['c'], removed: ['a'], changed: { b: { from: 2, to: 3 } } }
 *
 * Key arrays follow the order of the object they come from.
 *
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} after
 * @returns {{ added: string[], removed: string[], changed: Record<string, { from: unknown, to: unknown }> }}
 */
export function diffObjects(before, after) {
  throw new Error('TODO');
}
