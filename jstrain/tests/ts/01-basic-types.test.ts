import { describe, expect, it } from 'vitest';
import {
  assertNever,
  bestPlayer,
  byKey,
  distance,
  formatValue,
  greet,
  ROLES,
  severity,
  shouldLog,
  toCount,
} from '@ex/ts/01-basic-types';

describe('P4 distance', () => {
  it('measures the straight line between two points', () => {
    expect(distance([0, 0], [3, 4])).toBe(5);
    expect(distance([1, 1], [1, 1])).toBe(0);
    expect(distance([-1, -1], [2, 3])).toBe(5);
  });
});

describe('P5 shouldLog', () => {
  it.each([
    ['error', 'debug', true],
    ['debug', 'debug', true],
    ['debug', 'info', false],
    ['warn', 'info', true],
    ['info', 'error', false],
    ['error', 'error', true],
  ])('shouldLog(%s, %s) === %s', (level, minimum, expected) => {
    expect(shouldLog(level, minimum)).toBe(expected);
  });

  it('returns false for an unknown level', () => {
    expect(shouldLog('trace', 'debug')).toBe(false);
  });
});

describe('P7 formatValue', () => {
  it.each([
    ['hi', '"hi"'],
    [3.5, '3.50'],
    [10, '10.00'],
    [true, 'yes'],
    [false, 'no'],
    [null, 'none'],
    [undefined, 'none'],
  ])('formatValue(%o) === %s', (value, expected) => {
    expect(formatValue(value as string | number | boolean | null | undefined)).toBe(expected);
  });
});

describe('P8 toCount', () => {
  it.each([
    [5, 0, 5],
    ['42', 0, 42],
    ['  7 ', 0, 7],
    ['abc', -1, -1],
    ['', -1, -1],
    [NaN, 0, 0],
    [Infinity, 0, 0],
    [true, 9, 9],
    [null, 9, 9],
    [undefined, 9, 9],
    [{}, 9, 9],
    [[], 9, 9],
  ])('toCount(%o, %i) === %i', (value, fallback, expected) => {
    expect(toCount(value, fallback)).toBe(expected);
  });
});

describe('P9 ROLES', () => {
  it('is frozen at compile time and readable at run time', () => {
    expect(ROLES).toEqual(['admin', 'editor', 'viewer']);
  });
});

describe('P10 bestPlayer', () => {
  it('finds the top score', () => {
    expect(bestPlayer({ ada: 10, bob: 30, cyd: 20 })).toBe('bob');
  });

  it('breaks ties alphabetically', () => {
    expect(bestPlayer({ zed: 10, ada: 10 })).toBe('ada');
  });

  it('returns null when empty', () => {
    expect(bestPlayer({})).toBe(null);
  });

  it('handles negative scores', () => {
    expect(bestPlayer({ a: -5, b: -1 })).toBe('b');
  });
});

describe('P11 greet', () => {
  it.each([
    [undefined, 'Hello, Ada!'],
    [{}, 'Hello, Ada!'],
    [{ greeting: 'Hi' }, 'Hi, Ada!'],
    [{ shout: true }, 'HELLO, ADA!'],
    [{ greeting: 'Yo', shout: true }, 'YO, ADA!'],
    [{ shout: false }, 'Hello, Ada!'],
  ])('greet("Ada", %o) === %s', (options, expected) => {
    expect(greet('Ada', options)).toBe(expected);
  });
});

describe('P12/P13 assertNever + severity', () => {
  it('maps levels to numbers', () => {
    expect(severity('debug')).toBe(10);
    expect(severity('info')).toBe(20);
    expect(severity('warn')).toBe(30);
    expect(severity('error')).toBe(40);
  });

  it('assertNever always throws', () => {
    expect(() => assertNever('surprise' as never)).toThrow(/Unexpected value/);
  });

  it('severity rejects a level that sneaks past the compiler', () => {
    expect(() => severity('trace' as 'debug')).toThrow(/Unexpected value/);
  });
});

describe('P15 byKey', () => {
  const people = [
    { name: 'Cyd', age: 30 },
    { name: 'Ada', age: 25 },
    { name: 'Bob', age: 40 },
  ];

  it('sorts by a numeric key', () => {
    expect([...people].sort(byKey('age')).map((p) => p.name)).toEqual(['Ada', 'Cyd', 'Bob']);
  });

  it('sorts by a string key', () => {
    expect([...people].sort(byKey('name')).map((p) => p.name)).toEqual(['Ada', 'Bob', 'Cyd']);
  });

  it('returns 0 for equal keys', () => {
    expect(byKey<{ a: number }, 'a'>('a')({ a: 1 }, { a: 1 })).toBe(0);
  });
});
