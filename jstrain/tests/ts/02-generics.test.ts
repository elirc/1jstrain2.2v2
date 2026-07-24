import { describe, expect, it } from 'vitest';
import {
  Box,
  createCollection,
  err,
  first,
  indexBy,
  keysOf,
  last,
  longest,
  mapValues,
  ok,
  orElse,
  pluck,
  sortBy,
  tryCatch,
  unwrapOr,
} from '@ex/ts/02-generics';

const users = [
  { id: 'u1', name: 'Ada', age: 36 },
  { id: 'u2', name: 'Bob', age: 25 },
  { id: 'u3', name: 'Cyd', age: 41 },
];

describe('P1 first / last', () => {
  it('returns the ends of the array', () => {
    expect(first([1, 2, 3])).toBe(1);
    expect(last([1, 2, 3])).toBe(3);
  });

  it('returns undefined for an empty array', () => {
    expect(first([])).toBe(undefined);
    expect(last([])).toBe(undefined);
  });
});

describe('P2 pluck', () => {
  it('extracts one property', () => {
    expect(pluck(users, 'name')).toEqual(['Ada', 'Bob', 'Cyd']);
    expect(pluck(users, 'age')).toEqual([36, 25, 41]);
  });

  it('handles an empty array', () => {
    expect(pluck([], 'anything' as never)).toEqual([]);
  });
});

describe('P3 indexBy', () => {
  it('builds a lookup', () => {
    const byId = indexBy(users, 'id');
    expect(byId.u2).toEqual({ id: 'u2', name: 'Bob', age: 25 });
    expect(Object.keys(byId)).toEqual(['u1', 'u2', 'u3']);
  });

  it('lets later duplicates win', () => {
    expect(indexBy([{ id: 'a', n: 1 }, { id: 'a', n: 2 }], 'id').a.n).toBe(2);
  });

  it('stringifies non-string keys', () => {
    expect(Object.keys(indexBy([{ id: 1 }], 'id'))).toEqual(['1']);
  });
});

describe('P4 longest', () => {
  it('compares by length', () => {
    expect(longest('a', 'bb')).toBe('bb');
    expect(longest([1, 2, 3], [1])).toEqual([1, 2, 3]);
  });

  it('returns the first on a tie', () => {
    expect(longest('ab', 'cd')).toBe('ab');
  });
});

describe('P5 orElse', () => {
  it('falls back only for null and undefined', () => {
    expect(orElse(null, 'x')).toBe('x');
    expect(orElse(undefined, 'x')).toBe('x');
    expect(orElse(0, 10)).toBe(0);
    expect(orElse('', 'x')).toBe('');
    expect(orElse(false, true)).toBe(false);
  });
});

describe('P6 Box', () => {
  it('wraps and transforms', () => {
    expect(Box.of(2).map((n) => n * 3).value).toBe(6);
    expect(Box.of(2).map((n) => n * 3).map(String).value).toBe('6');
  });

  it('never mutates the original box', () => {
    const box = Box.of(1);
    box.map((n) => n + 1);
    expect(box.value).toBe(1);
  });

  it('is constructible directly', () => {
    expect(new Box('hi').value).toBe('hi');
  });
});

describe('P7/P8 Result helpers', () => {
  it('builds successes and failures', () => {
    expect(ok(5)).toEqual({ ok: true, value: 5 });
    expect(err('bad')).toEqual({ ok: false, error: 'bad' });
  });

  it('unwraps with a fallback', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5);
    expect(unwrapOr(err(new Error('x')), 0)).toBe(0);
  });

  it('captures thrown errors', () => {
    const good = tryCatch(() => 42);
    expect(good).toEqual({ ok: true, value: 42 });

    const bad = tryCatch(() => {
      throw new TypeError('nope');
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).toBeInstanceOf(TypeError);
      expect(bad.error.message).toBe('nope');
    }
  });

  it('wraps a thrown non-Error', () => {
    const bad = tryCatch(() => {
      // eslint-disable-next-line no-throw-literal
      throw 'a string';
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBeInstanceOf(Error);
  });
});

describe('P9 mapValues', () => {
  it('transforms values, keeps keys', () => {
    expect(mapValues({ a: 1, b: 2 }, (n) => n * 10)).toEqual({ a: 10, b: 20 });
  });

  it('passes the key', () => {
    expect(mapValues({ a: 1 }, (value, key) => `${String(key)}=${value}`)).toEqual({ a: 'a=1' });
  });
});

describe('P10 keysOf', () => {
  it('returns the keys', () => {
    expect(keysOf({ a: 1, b: 2 })).toEqual(['a', 'b']);
    expect(keysOf({})).toEqual([]);
  });
});

describe('P11 createCollection', () => {
  it('starts empty', () => {
    const collection = createCollection<number>();
    expect(collection.size).toBe(0);
    expect(collection.all()).toEqual([]);
  });

  it('accepts initial items', () => {
    expect(createCollection([1, 2]).size).toBe(2);
  });

  it('adds and finds', () => {
    const collection = createCollection<{ id: number }>();
    collection.add({ id: 1 });
    collection.add({ id: 2 });
    expect(collection.size).toBe(2);
    expect(collection.find((item) => item.id === 2)).toEqual({ id: 2 });
    expect(collection.find((item) => item.id === 9)).toBe(undefined);
  });

  it('returns a snapshot, not the live array', () => {
    const collection = createCollection([1]);
    const snapshot = collection.all();
    collection.add(2);
    expect(snapshot).toEqual([1]);
    expect(collection.all()).toEqual([1, 2]);
  });

  it('does not alias the initial array', () => {
    const initial = [1];
    const collection = createCollection(initial);
    collection.add(2);
    expect(initial).toEqual([1]);
  });
});

describe('P13 sortBy', () => {
  it('sorts by a numeric selector', () => {
    expect(sortBy(users, (u) => u.age).map((u) => u.name)).toEqual(['Bob', 'Ada', 'Cyd']);
  });

  it('sorts by a string selector', () => {
    expect(sortBy(users, (u) => u.name).map((u) => u.id)).toEqual(['u1', 'u2', 'u3']);
  });

  it('does not mutate', () => {
    const input = [3, 1, 2];
    expect(sortBy(input, (n) => n)).toEqual([1, 2, 3]);
    expect(input).toEqual([3, 1, 2]);
  });
});
