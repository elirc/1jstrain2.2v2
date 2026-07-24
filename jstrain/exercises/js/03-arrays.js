/**
 * MODULE JS-03 — Arrays and the methods you will use every day
 * =============================================================
 *
 * 90% of real JavaScript is reshaping arrays of objects. Learn these cold:
 *
 *   map      transform each item        -> same length, new array
 *   filter   keep some items            -> shorter or equal, new array
 *   reduce   fold into one value        -> anything (number, object, array)
 *   find / findIndex / findLast         -> first match or undefined / -1
 *   some / every                        -> boolean
 *   flat / flatMap                      -> unnest one level
 *   slice    copy a range               -> NEW array
 *   splice   MUTATES                    -> avoid unless you mean it
 *   sort     MUTATES and sorts as text  -> [10, 9].sort() is [10, 9]!
 *
 * Golden rule for this module: never mutate the input. Every function must
 * return a new array/object. The tests check.
 *
 * Run:  npx vitest run tests/js/03-arrays.test.js
 */

/**
 * PROBLEM 1 — chunk.
 *
 *   chunk([1,2,3,4,5], 2) -> [[1,2],[3,4],[5]]
 *   chunk([], 3)          -> []
 *
 * Throw a RangeError('size must be >= 1') for size < 1 or non-integer size.
 *
 * @template T
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(items, size) {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — zip.
 *
 * Pair up two arrays, stopping at the shorter one.
 *   zip([1,2,3], ['a','b']) -> [[1,'a'],[2,'b']]
 *
 * @template A, B
 * @param {A[]} a
 * @param {B[]} b
 * @returns {Array<[A, B]>}
 */
export function zip(a, b) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — groupBy.
 *
 * Group items into a plain object keyed by `keyFn(item)` (coerced to string),
 * preserving input order inside each group.
 *
 *   groupBy(['ant','bee','ape'], w => w[0])
 *     -> { a: ['ant','ape'], b: ['bee'] }
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T, index: number) => string | number} keyFn
 * @returns {Record<string, T[]>}
 */
export function groupBy(items, keyFn) {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — countBy.
 *
 *   countBy([1,2,2,3,3,3], n => n) -> { '1': 1, '2': 2, '3': 3 }
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string | number} keyFn
 * @returns {Record<string, number>}
 */
export function countBy(items, keyFn) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — uniqueBy.
 *
 * Keep the FIRST item for each distinct key.
 *   uniqueBy([{id:1,v:'a'},{id:1,v:'b'},{id:2,v:'c'}], u => u.id)
 *     -> [{id:1,v:'a'}, {id:2,v:'c'}]
 *
 * Use a Set or Map — an O(n^2) `includes` scan will fail the performance test.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => unknown} keyFn
 * @returns {T[]}
 */
export function uniqueBy(items, keyFn) {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — sortBy, without mutating.
 *
 * Sort a COPY of `items` by the value of `keyFn`. Strings compare
 * case-insensitively with `localeCompare`; numbers compare numerically.
 * `direction` is 'asc' (default) or 'desc'.
 *
 * The sort must be stable (equal keys keep their original relative order) —
 * modern JS sorts are stable, so simply don't break it.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string | number} keyFn
 * @param {'asc' | 'desc'} [direction='asc']
 * @returns {T[]}
 */
export function sortBy(items, keyFn, direction = 'asc') {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — partition.
 *
 *   partition([1,2,3,4], n => n % 2 === 0) -> [[2,4], [1,3]]
 * (matching items first, then the rest)
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T, index: number) => boolean} predicate
 * @returns {[T[], T[]]}
 */
export function partition(items, predicate) {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — sumBy / averageBy.
 *
 * `sumBy` returns 0 for an empty array. `averageBy` returns `null` for an
 * empty array (there is no meaningful average of nothing — do not return 0
 * and do not return NaN).
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number} valueFn
 * @returns {number}
 */
export function sumBy(items, valueFn) {
  throw new Error('TODO');
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number} valueFn
 * @returns {number | null}
 */
export function averageBy(items, valueFn) {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — rotate.
 *
 * Rotate left by `n`. Negative `n` rotates right. `n` may exceed the length.
 *   rotate([1,2,3,4,5], 2)  -> [3,4,5,1,2]
 *   rotate([1,2,3,4,5], -1) -> [5,1,2,3,4]
 *   rotate([], 3)           -> []
 *
 * @template T
 * @param {T[]} items
 * @param {number} n
 * @returns {T[]}
 */
export function rotate(items, n) {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — Set operations on arrays.
 *
 * All three preserve the order of the first array and remove duplicates.
 *   intersection([1,2,2,3], [2,3,4]) -> [2,3]
 *   difference([1,2,3], [2])         -> [1,3]
 *   union([1,2], [2,3])              -> [1,2,3]
 *
 * @template T
 * @param {T[]} a
 * @param {T[]} b
 * @returns {T[]}
 */
export function intersection(a, b) {
  throw new Error('TODO');
}

/**
 * @template T
 * @param {T[]} a
 * @param {T[]} b
 * @returns {T[]}
 */
export function difference(a, b) {
  throw new Error('TODO');
}

/**
 * @template T
 * @param {T[]} a
 * @param {T[]} b
 * @returns {T[]}
 */
export function union(a, b) {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 — runningTotal.
 *
 *   runningTotal([1,2,3,4]) -> [1,3,6,10]
 *
 * @param {number[]} numbers
 * @returns {number[]}
 */
export function runningTotal(numbers) {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 — topN.
 *
 * Return the `n` items with the highest `scoreFn` value, highest first.
 * Ties keep their original relative order. Do not mutate the input.
 *
 * @template T
 * @param {T[]} items
 * @param {number} n
 * @param {(item: T) => number} scoreFn
 * @returns {T[]}
 */
export function topN(items, n, scoreFn) {
  throw new Error('TODO');
}

/**
 * PROBLEM 13 — A real reporting query.
 *
 * Given order rows shaped like
 *   { id: string, customer: string, total: number, status: 'paid' | 'refunded' | 'pending' }
 * produce a per-customer summary of PAID orders only, sorted by revenue
 * descending, then customer name ascending:
 *
 *   [{ customer: 'ada', orders: 2, revenue: 150, average: 75 }, ...]
 *
 * `average` must be rounded to 2 decimals. Customers with no paid orders are
 * absent from the result.
 *
 * @param {Array<{ id: string, customer: string, total: number, status: string }>} orders
 * @returns {Array<{ customer: string, orders: number, revenue: number, average: number }>}
 */
export function summarizeOrders(orders) {
  throw new Error('TODO');
}

/**
 * PROBLEM 14 — Flatten one level, with a transform (flatMap).
 *
 * Given users with a `tags` array, return every (user, tag) pair as
 * `'name:tag'` strings, skipping users with no tags.
 *
 *   tagPairs([{ name: 'ada', tags: ['x','y'] }, { name: 'bob', tags: [] }])
 *     -> ['ada:x', 'ada:y']
 *
 * @param {Array<{ name: string, tags?: string[] }>} users
 * @returns {string[]}
 */
export function tagPairs(users) {
  throw new Error('TODO');
}
