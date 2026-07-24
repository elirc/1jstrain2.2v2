/**
 * MODULE JS-08 — Iterators, generators and lazy evaluation
 * =========================================================
 *
 * `for...of`, spread and destructuring all speak one protocol: an object is
 * ITERABLE if it has a `[Symbol.iterator]()` method returning an ITERATOR —
 * an object with `next()` returning `{ value, done }`.
 *
 * Generators write that for you:
 *
 *   function* count() { yield 1; yield 2; }
 *   [...count()]            // [1, 2]
 *   yield* other()          // delegate to another iterable
 *
 * The payoff is laziness: a generator computes the next value only when asked,
 * so you can model infinite sequences and stop early without wasting work.
 *
 * Run:  npx vitest run tests/js/08-iterators-generators.test.js
 */

/**
 * PROBLEM 1 — range.
 *
 * A generator yielding numbers from `start` (inclusive) to `end` (exclusive).
 * `step` may be negative. A step of 0 throws a RangeError('step must not be 0').
 *
 *   [...range(0, 5)]        -> [0, 1, 2, 3, 4]
 *   [...range(0, 10, 3)]    -> [0, 3, 6, 9]
 *   [...range(3, 0, -1)]    -> [3, 2, 1]
 *   [...range(0, 0)]        -> []
 *
 * @param {number} start
 * @param {number} end
 * @param {number} [step=1]
 * @returns {Generator<number>}
 */
export function* range(start, end, step = 1) {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — take.
 *
 * Yield at most the first `n` values of any iterable — including an infinite
 * one, which is the whole point. Must not pull more values than it yields.
 *
 * @template T
 * @param {Iterable<T>} iterable
 * @param {number} n
 * @returns {Generator<T>}
 */
export function* take(iterable, n) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — Lazy map and filter.
 *
 * Same semantics as the array methods, but lazy and working on any iterable.
 *
 * @template T, R
 * @param {Iterable<T>} iterable
 * @param {(value: T, index: number) => R} fn
 * @returns {Generator<R>}
 */
export function* mapIter(iterable, fn) {
  throw new Error('TODO');
}

/**
 * @template T
 * @param {Iterable<T>} iterable
 * @param {(value: T, index: number) => boolean} predicate
 * @returns {Generator<T>}
 */
export function* filterIter(iterable, predicate) {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — An infinite sequence.
 *
 * Yield the Fibonacci numbers forever: 0, 1, 1, 2, 3, 5, 8, ...
 *
 * @returns {Generator<number>}
 */
export function* fibonacci() {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — Making your own class iterable.
 *
 * A Playlist holds tracks and can be iterated in order with `for...of`,
 * spread and destructuring.
 *
 *   const p = new Playlist(['a', 'b']);
 *   [...p]                 // ['a', 'b']
 *   const [first] = p;     // 'a'
 *   p.shuffledFrom(1)      // an iterable of tracks 1..n (a second iterator)
 *
 * Implement `add(track)` (chainable), `get length`, `[Symbol.iterator]()`
 * and `shuffledFrom(index)` — which is not really shuffled, just "from index
 * to the end, then wrapping back to the start".
 */
export class Playlist {
  constructor(tracks = []) {
    throw new Error('TODO');
  }
}

/**
 * PROBLEM 6 — zipIter.
 *
 * Lazily pair up any two iterables, stopping at the shorter one.
 *
 * @template A, B
 * @param {Iterable<A>} a
 * @param {Iterable<B>} b
 * @returns {Generator<[A, B]>}
 */
export function* zipIter(a, b) {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — chunkIter.
 *
 * Yield arrays of up to `size` values. The final chunk may be short.
 * Works on infinite iterables (so: no collecting everything first).
 *
 * @template T
 * @param {Iterable<T>} iterable
 * @param {number} size
 * @returns {Generator<T[]>}
 */
export function* chunkIter(iterable, size) {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — Recursive delegation with yield*.
 *
 * Walk a tree of `{ value, children? }` nodes depth-first, yielding values
 * parent-before-children (pre-order).
 *
 * @param {{ value: unknown, children?: any[] }} node
 * @returns {Generator<unknown>}
 */
export function* walkTree(node) {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — A two-way generator.
 *
 * Generators can RECEIVE values: `const x = yield y` gives you whatever the
 * caller passes to `next(x)`.
 *
 * Build a running-total accumulator:
 *   const acc = accumulator();
 *   acc.next();      // { value: 0, done: false }  — priming call
 *   acc.next(5);     // { value: 5, done: false }
 *   acc.next(3);     // { value: 8, done: false }
 *   acc.next(null);  // { value: 8, done: true }   — null/undefined finishes it
 *
 * @returns {Generator<number, number, number | null>}
 */
export function* accumulator() {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — Manual iterator protocol.
 *
 * No generator syntax allowed here: return a plain object with a `next()`
 * method that yields `{ value, done }` for the values of `array`, and which
 * is itself iterable (so `for...of` works on it).
 *
 * @template T
 * @param {T[]} array
 * @returns {{ next: () => { value: T | undefined, done: boolean } } & Iterable<T>}
 */
export function makeIterator(array) {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 — Async generators.
 *
 * Simulate a paginated API. `fetchPage(pageNumber)` resolves to
 * `{ items: T[], hasMore: boolean }`. Yield each ITEM one at a time,
 * fetching the next page only when the current one runs out.
 *
 * Usage: `for await (const item of streamAll(fetchPage)) { ... }`
 *
 * @template T
 * @param {(page: number) => Promise<{ items: T[], hasMore: boolean }>} fetchPage
 * @returns {AsyncGenerator<T>}
 */
export async function* streamAll(fetchPage) {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 — Collect an async iterable.
 *
 * @template T
 * @param {AsyncIterable<T>} asyncIterable
 * @returns {Promise<T[]>}
 */
export async function collect(asyncIterable) {
  throw new Error('TODO');
}

/**
 * PROBLEM 13 — A lazy pipeline.
 *
 * Compose the pieces above: from an infinite source of numbers, keep the ones
 * passing `predicate`, transform them with `transform`, and stop after `n`.
 * Return an ARRAY.
 *
 * The source must be pulled only as far as needed — the test counts.
 *
 * @template T
 * @param {Iterable<number>} source
 * @param {(n: number) => boolean} predicate
 * @param {(n: number) => T} transform
 * @param {number} n
 * @returns {T[]}
 */
export function lazyPipeline(source, predicate, transform, n) {
  throw new Error('TODO');
}
