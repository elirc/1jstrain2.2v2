/**
 * MODULE JS-01 — Values, types and coercion
 * ==========================================
 *
 * JavaScript has 7 primitive types (string, number, boolean, null, undefined,
 * symbol, bigint) and everything else is an object (including arrays,
 * functions and dates). The language will happily convert between types for
 * you, which is the single biggest source of "wait, WHY?" moments for people
 * coming from a stricter language.
 *
 * Run only this module's tests:  npx vitest run tests/js/01-values-and-types.test.js
 *
 * Rules for every problem in this repo:
 *   - Delete the `throw new Error('TODO')` line and write real code.
 *   - Do not change the exported function names or the number of parameters.
 *   - No external libraries. Standard JavaScript only.
 */

/**
 * PROBLEM 1 — A type check you can actually trust.
 *
 * `typeof` lies in two famous ways: `typeof null === 'object'` and
 * `typeof []  === 'object'`. Write a better one.
 *
 * Return, as a lowercase string:
 *   'null'      for null
 *   'nan'       for the NaN value (but 'number' for every other number)
 *   'array'     for arrays
 *   'date'      for Date instances
 *   otherwise   the plain `typeof` result ('string', 'number', 'boolean',
 *               'undefined', 'function', 'object', 'symbol', 'bigint')
 *
 * @param {unknown} value
 * @returns {string}
 */
export function typeOf(value) {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — Implement `Object.is` yourself (without calling Object.is).
 *
 * Same as `===` with two exceptions:
 *   - NaN is the same value as NaN
 *   - +0 is NOT the same value as -0   (hint: 1 / -0 === -Infinity)
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function isSameValue(a, b) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — See coercion happen.
 *
 * Return an object describing how the two values compare:
 *   { loose: <result of ==>, strict: <result of ===> }
 *
 * You do not need any logic here — it is one line. The point is the test file:
 * read it after you pass, because those pairs are interview questions.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {{ loose: boolean, strict: boolean }}
 */
export function compareBoth(a, b) {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — Strict-ish number parsing.
 *
 * Convert a value to a number, or return `null` when that is not sensible.
 *
 *   toNumberOrNull('42')     -> 42
 *   toNumberOrNull('  7.5 ') -> 7.5     (surrounding whitespace is fine)
 *   toNumberOrNull('12abc')  -> null    (parseInt would say 12 — don't use it)
 *   toNumberOrNull('')       -> null    (Number('') is 0 — a classic bug)
 *   toNumberOrNull('   ')    -> null
 *   toNumberOrNull(null)     -> null    (Number(null) is 0)
 *   toNumberOrNull(true)     -> null    (booleans are not numbers here)
 *   toNumberOrNull(NaN)      -> null
 *   toNumberOrNull(Infinity) -> null    (not a finite number)
 *   toNumberOrNull(3)        -> 3
 *
 * @param {unknown} value
 * @returns {number | null}
 */
export function toNumberOrNull(value) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — Division that refuses to produce garbage.
 *
 * Return a / b, but return `null` if the result is not a finite number
 * (division by zero, NaN operands, non-number inputs).
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number | null}
 */
export function safeDivide(a, b) {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — Falsy values.
 *
 * There are exactly 8 falsy values in JS: false, 0, -0, 0n, '', null,
 * undefined, NaN. EVERYTHING else is truthy — including [], {} and '0'.
 *
 * Return a new array containing only the truthy items. Do not mutate `values`.
 *
 * @template T
 * @param {T[]} values
 * @returns {T[]}
 */
export function truthyOnly(values) {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — `??` vs `||`.
 *
 * Implement nullish-coalescing by hand: return `fallback` only when `value`
 * is null or undefined. `0`, `''` and `false` are real values and must be
 * returned as-is. (This is why `count || 10` is a bug when count can be 0.)
 *
 * Do not use the `??` operator — write the check.
 *
 * @template T
 * @param {T | null | undefined} value
 * @param {T} fallback
 * @returns {T}
 */
export function defaultTo(value, fallback) {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — clamp.
 *
 * Force a number into the inclusive range [min, max].
 * If min > max, throw a `RangeError` with the message 'min must be <= max'.
 *
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(n, min, max) {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — Rounding to N decimal places.
 *
 * 0.1 + 0.2 === 0.30000000000000004, because JS numbers are IEEE-754 doubles.
 * Round `n` to `decimals` places and return a NUMBER (not a string).
 *
 *   roundTo(2.34567, 2) -> 2.35
 *   roundTo(2.5, 0)     -> 3
 *   roundTo(-2.5, 0)    -> -3      (round halves away from zero)
 *   roundTo(1.005, 2)   -> 1.01
 *   roundTo(1.2345, 3)  -> 1.235
 *
 * Both `Math.round(1.005 * 100) / 100` and `(1.005).toFixed(2)` give 1.00,
 * because 1.005 is really stored as 1.00499999999999989...
 *
 * Hint — the "exponent shift" trick sidesteps the multiplication error:
 *   Number(`${x}e${decimals}`)    moves the decimal point right
 *   Number(`${y}e-${decimals}`)   moves it back
 * Work on Math.abs(n) and re-apply the sign afterwards, so halves round away
 * from zero (Math.round(-2.5) is -2, which is not what we want).
 *
 * @param {number} n
 * @param {number} decimals
 * @returns {number}
 */
export function roundTo(n, decimals) {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — Human-readable byte sizes.
 *
 * Use 1024 as the step. Units: B, KB, MB, GB, TB.
 * Round to at most 1 decimal place and drop a trailing '.0'.
 *
 *   formatBytes(0)          -> '0 B'
 *   formatBytes(999)        -> '999 B'
 *   formatBytes(1024)       -> '1 KB'
 *   formatBytes(1536)       -> '1.5 KB'
 *   formatBytes(1048576)    -> '1 MB'
 *   formatBytes(1234567890) -> '1.1 GB'
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 — Describe a number.
 *
 * Return one of: 'not a number' | 'negative' | 'zero' | 'positive'.
 * Anything that is not a finite number (including NaN, Infinity, strings,
 * null) is 'not a number'. Both 0 and -0 are 'zero'.
 *
 * @param {unknown} value
 * @returns {'not a number' | 'negative' | 'zero' | 'positive'}
 */
export function describeNumber(value) {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 — Deep-ish primitive equality for form values.
 *
 * A form gives you strings; your API gives you real types. Decide whether a
 * submitted string represents the same value as the original:
 *
 *   sameFormValue('42', 42)       -> true
 *   sameFormValue('0', 0)         -> true
 *   sameFormValue('true', true)   -> true
 *   sameFormValue('false', false) -> true
 *   sameFormValue('', null)       -> true    (empty input means "no value")
 *   sameFormValue('', undefined)  -> true
 *   sameFormValue('abc', 'abc')   -> true
 *   sameFormValue('42', '42')     -> true
 *   sameFormValue('42', 43)       -> false
 *   sameFormValue('0', false)     -> false   (do NOT lean on ==)
 *   sameFormValue('', 0)          -> false
 *
 * @param {string} submitted
 * @param {unknown} original
 * @returns {boolean}
 */
export function sameFormValue(submitted, original) {
  throw new Error('TODO');
}
