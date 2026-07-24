import { describe, expect, it } from 'vitest';
import {
  area,
  assertNever,
  assertNonEmptyString,
  compact,
  describeAccount,
  describeCaught,
  isDefined,
  isFiniteNumber,
  isRecord,
  isString,
  match,
  parseUser,
  renderState,
  type AsyncState,
  type Shape,
} from '@ex/ts/03-narrowing-unions';

describe('P2 area', () => {
  it('computes each shape', () => {
    expect(area({ kind: 'square', size: 3 } as Shape)).toBe(9);
    expect(area({ kind: 'rectangle', width: 3, height: 4 } as Shape)).toBe(12);
    expect(area({ kind: 'circle', radius: 2 } as Shape)).toBeCloseTo(Math.PI * 4, 10);
  });

  it('throws for an unknown kind that slipped past the compiler', () => {
    expect(() => area({ kind: 'triangle', base: 1 } as unknown as Shape)).toThrow(/Unhandled/);
  });

  it('assertNever always throws', () => {
    expect(() => assertNever('x' as never)).toThrow(/Unhandled/);
  });
});

describe('P3 type guards', () => {
  it.each([
    ['hi', true],
    ['', true],
    [1, false],
    [null, false],
    [undefined, false],
    [{}, false],
  ])('isString(%o) === %s', (value, expected) => {
    expect(isString(value)).toBe(expected);
  });

  it.each([
    [0, true],
    ['', true],
    [false, true],
    [null, false],
    [undefined, false],
  ])('isDefined(%o) === %s', (value, expected) => {
    expect(isDefined(value)).toBe(expected);
  });

  it.each([
    [1, true],
    [0, true],
    [-1.5, true],
    [NaN, false],
    [Infinity, false],
    ['1', false],
    [null, false],
  ])('isFiniteNumber(%o) === %s', (value, expected) => {
    expect(isFiniteNumber(value)).toBe(expected);
  });

  it.each([
    [{}, true],
    [{ a: 1 }, true],
    [[], false],
    [null, false],
    ['x', false],
    [1, false],
  ])('isRecord(%o) === %s', (value, expected) => {
    expect(isRecord(value)).toBe(expected);
  });
});

describe('P4 compact', () => {
  it('removes null and undefined but keeps other falsy values', () => {
    expect(compact([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
    expect(compact([0, null, '', false])).toEqual([0, '', false]);
    expect(compact([])).toEqual([]);
    expect(compact([null, undefined])).toEqual([]);
  });
});

describe('P5 renderState', () => {
  it.each([
    [{ status: 'idle' }, 'Nothing yet'],
    [{ status: 'loading' }, 'Loading…'],
    [{ status: 'success', data: { id: 1 } }, 'Loaded: {"id":1}'],
    [{ status: 'error', error: new Error('nope') }, 'Failed: nope'],
  ])('renderState(%o)', (state, expected) => {
    expect(renderState(state as AsyncState<unknown>)).toBe(expected);
  });
});

describe('P6 describeAccount', () => {
  it('narrows with the `in` operator', () => {
    expect(describeAccount({ email: 'ada@example.com' })).toBe('user:ada@example.com');
    expect(describeAccount({ apiKey: 'sk_live_abcdef' })).toBe('service:sk_l…');
  });
});

describe('P7 assertNonEmptyString', () => {
  it('passes for a non-empty string', () => {
    expect(() => assertNonEmptyString('ok')).not.toThrow();
  });

  it.each([[''], [null], [undefined], [42], [{}]])('rejects %o', (value) => {
    expect(() => assertNonEmptyString(value)).toThrow(TypeError);
    expect(() => assertNonEmptyString(value)).toThrow('expected a non-empty string');
  });
});

describe('P8 parseUser', () => {
  it('accepts valid shapes', () => {
    expect(parseUser({ id: 'u1', name: 'Ada' })).toEqual({ id: 'u1', name: 'Ada' });
    expect(parseUser({ id: 'u1', name: 'Ada', age: 36 })).toEqual({
      id: 'u1',
      name: 'Ada',
      age: 36,
    });
  });

  it('ignores extra properties', () => {
    expect(parseUser({ id: 'u1', name: 'Ada', extra: true })).toEqual({ id: 'u1', name: 'Ada' });
  });

  it.each([
    [null],
    [undefined],
    ['a string'],
    [42],
    [[]],
    [{}],
    [{ id: 'u1' }],
    [{ name: 'Ada' }],
    [{ id: 1, name: 'Ada' }],
    [{ id: 'u1', name: 'Ada', age: 'old' }],
    [{ id: 'u1', name: 'Ada', age: NaN }],
  ])('rejects %o', (value) => {
    expect(parseUser(value)).toBe(null);
  });
});

describe('P9 match', () => {
  const handlers = {
    idle: () => 'idle',
    loading: () => 'loading',
    success: (data: number) => `got ${data}`,
    error: (error: Error) => `oops ${error.message}`,
  };

  it('dispatches on the status', () => {
    expect(match({ status: 'idle' } as AsyncState<number>, handlers)).toBe('idle');
    expect(match({ status: 'loading' } as AsyncState<number>, handlers)).toBe('loading');
    expect(match({ status: 'success', data: 7 } as AsyncState<number>, handlers)).toBe('got 7');
    expect(match({ status: 'error', error: new Error('bad') } as AsyncState<number>, handlers)).toBe(
      'oops bad',
    );
  });

  it('passes the payload, not the wrapper', () => {
    const seen: unknown[] = [];
    match({ status: 'success', data: { id: 1 } } as AsyncState<{ id: number }>, {
      idle: () => null,
      loading: () => null,
      success: (data) => seen.push(data),
      error: () => null,
    });
    expect(seen).toEqual([{ id: 1 }]);
  });
});

describe('P10 describeCaught', () => {
  it.each([
    [new Error('boom'), 'Error: boom'],
    [new TypeError('bad type'), 'TypeError: bad type'],
    ['just a string', 'just a string'],
    [42, 'Unknown error'],
    [null, 'Unknown error'],
    [{ message: 'not an error' }, 'Unknown error'],
  ])('describeCaught(%o) === %s', (caught, expected) => {
    expect(describeCaught(caught)).toBe(expected);
  });

  it('works on a real catch block', () => {
    try {
      JSON.parse('{oops');
    } catch (caught) {
      expect(describeCaught(caught)).toMatch(/^SyntaxError: /);
    }
  });
});
