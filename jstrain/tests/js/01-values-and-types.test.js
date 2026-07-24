import { describe, expect, it } from 'vitest';
import {
  clamp,
  compareBoth,
  defaultTo,
  describeNumber,
  formatBytes,
  isSameValue,
  roundTo,
  safeDivide,
  sameFormValue,
  toNumberOrNull,
  truthyOnly,
  typeOf,
} from '@ex/js/01-values-and-types.js';

describe('P1 typeOf', () => {
  it.each([
    [null, 'null'],
    [undefined, 'undefined'],
    [[], 'array'],
    [[1, 2], 'array'],
    [new Date(), 'date'],
    [NaN, 'nan'],
    [0, 'number'],
    [Infinity, 'number'],
    ['hi', 'string'],
    [true, 'boolean'],
    [{}, 'object'],
    [() => {}, 'function'],
    [Symbol('s'), 'symbol'],
    [10n, 'bigint'],
  ])('typeOf(%o) === %s', (input, expected) => {
    expect(typeOf(input)).toBe(expected);
  });
});

describe('P2 isSameValue', () => {
  it('behaves like === for ordinary values', () => {
    expect(isSameValue(1, 1)).toBe(true);
    expect(isSameValue('a', 'a')).toBe(true);
    expect(isSameValue(1, '1')).toBe(false);
    expect(isSameValue(null, undefined)).toBe(false);
    const obj = {};
    expect(isSameValue(obj, obj)).toBe(true);
    expect(isSameValue({}, {})).toBe(false);
  });

  it('treats NaN as the same value as NaN', () => {
    expect(isSameValue(NaN, NaN)).toBe(true);
    expect(isSameValue(NaN, 0)).toBe(false);
  });

  it('distinguishes +0 from -0', () => {
    expect(isSameValue(0, -0)).toBe(false);
    expect(isSameValue(-0, -0)).toBe(true);
    expect(isSameValue(0, 0)).toBe(true);
  });

  it('does not simply delegate to Object.is', () => {
    expect(isSameValue.toString()).not.toMatch(/Object\.is/);
  });
});

describe('P3 compareBoth — the coercion table every JS dev must know', () => {
  it.each([
    [0, '', true, false],
    [0, '0', true, false],
    ['', '0', false, false],
    [null, undefined, true, false],
    [null, 0, false, false],
    [undefined, 0, false, false],
    [NaN, NaN, false, false],
    [[], false, true, false],
    [[1], 1, true, false],
    ['1', true, true, false],
    ['abc', 'abc', true, true],
  ])('compareBoth(%o, %o) -> loose %s / strict %s', (a, b, loose, strict) => {
    expect(compareBoth(a, b)).toEqual({ loose, strict });
  });

  it('never compares two objects as loosely equal', () => {
    expect(compareBoth({}, {})).toEqual({ loose: false, strict: false });
  });
});

describe('P4 toNumberOrNull', () => {
  it.each([
    ['42', 42],
    ['  7.5 ', 7.5],
    ['-3', -3],
    ['1e3', 1000],
    ['0', 0],
    ['12abc', null],
    ['', null],
    ['   ', null],
    [null, null],
    [undefined, null],
    [true, null],
    [false, null],
    [NaN, null],
    [Infinity, null],
    [-Infinity, null],
    [3, 3],
    [[], null],
    [{}, null],
  ])('toNumberOrNull(%o) === %o', (input, expected) => {
    expect(toNumberOrNull(input)).toBe(expected);
  });
});

describe('P5 safeDivide', () => {
  it('divides finite numbers', () => {
    expect(safeDivide(10, 4)).toBe(2.5);
    expect(safeDivide(-9, 3)).toBe(-3);
    expect(safeDivide(0, 5)).toBe(0);
  });

  it('returns null instead of Infinity or NaN', () => {
    expect(safeDivide(1, 0)).toBe(null);
    expect(safeDivide(0, 0)).toBe(null);
    expect(safeDivide(NaN, 2)).toBe(null);
    expect(safeDivide(1, Infinity)).toBe(0); // this one IS finite
  });

  it('returns null for non-numbers rather than coercing', () => {
    expect(safeDivide('10', 2)).toBe(null);
    expect(safeDivide(10, '2')).toBe(null);
    expect(safeDivide(null, 1)).toBe(null);
  });
});

describe('P6 truthyOnly', () => {
  it('keeps only truthy values', () => {
    expect(truthyOnly([0, 1, '', 'a', null, undefined, NaN, false, true, -0, 0n])).toEqual([
      1,
      'a',
      true,
    ]);
  });

  it('keeps [] and {} and "0" because they are truthy', () => {
    const arr = [];
    const obj = {};
    expect(truthyOnly([arr, obj, '0', ' '])).toEqual([arr, obj, '0', ' ']);
  });

  it('does not mutate the input', () => {
    const input = [0, 1];
    truthyOnly(input);
    expect(input).toEqual([0, 1]);
  });
});

describe('P7 defaultTo', () => {
  it('falls back only for null and undefined', () => {
    expect(defaultTo(null, 'x')).toBe('x');
    expect(defaultTo(undefined, 'x')).toBe('x');
  });

  it('keeps falsy-but-real values', () => {
    expect(defaultTo(0, 10)).toBe(0);
    expect(defaultTo('', 'x')).toBe('');
    expect(defaultTo(false, true)).toBe(false);
    expect(defaultTo(NaN, 1)).toBeNaN();
  });

  it('does not use the ?? operator', () => {
    expect(defaultTo.toString()).not.toContain('??');
  });
});

describe('P8 clamp', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(0, 0, 0)).toBe(0);
    expect(clamp(-5, -10, -1)).toBe(-5);
  });

  it('throws a RangeError when the range is inverted', () => {
    expect(() => clamp(1, 10, 0)).toThrow(RangeError);
    expect(() => clamp(1, 10, 0)).toThrow('min must be <= max');
  });
});

describe('P9 roundTo', () => {
  it.each([
    [2.34567, 2, 2.35],
    [2.5, 0, 3],
    [-2.5, 0, -3],
    [1.005, 2, 1.01],
    [0.1 + 0.2, 2, 0.3],
    [1.0049, 2, 1],
    [123.456, 1, 123.5],
    [5, 2, 5],
    [-1.2345, 3, -1.235],
  ])('roundTo(%o, %i) === %o', (n, decimals, expected) => {
    expect(roundTo(n, decimals)).toBe(expected);
  });

  it('returns a number, not a string', () => {
    expect(typeof roundTo(1.239, 2)).toBe('number');
  });
});

describe('P10 formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1, '1 B'],
    [999, '999 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
    [5242880, '5 MB'],
    [1234567890, '1.1 GB'],
    [1099511627776, '1 TB'],
  ])('formatBytes(%i) === %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe('P11 describeNumber', () => {
  it.each([
    [5, 'positive'],
    [0.0001, 'positive'],
    [-5, 'negative'],
    [0, 'zero'],
    [-0, 'zero'],
    [NaN, 'not a number'],
    [Infinity, 'not a number'],
    ['5', 'not a number'],
    [null, 'not a number'],
    [undefined, 'not a number'],
  ])('describeNumber(%o) === %s', (input, expected) => {
    expect(describeNumber(input)).toBe(expected);
  });
});

describe('P12 sameFormValue', () => {
  it.each([
    ['42', 42, true],
    ['0', 0, true],
    ['  42  ', 42, true],
    ['true', true, true],
    ['false', false, true],
    ['', null, true],
    ['', undefined, true],
    ['abc', 'abc', true],
    ['42', '42', true],
    ['42', 43, false],
    ['0', false, false],
    ['1', true, false],
    ['', 0, false],
    ['abc', 42, false],
    ['abc', null, false],
    ['42', 'abc', false],
  ])('sameFormValue(%o, %o) === %s', (submitted, original, expected) => {
    expect(sameFormValue(submitted, original)).toBe(expected);
  });
});
