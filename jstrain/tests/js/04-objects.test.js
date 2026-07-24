import { describe, expect, it } from 'vitest';
import {
  deepClone,
  deepFreeze,
  deepMerge,
  diffObjects,
  flattenKeys,
  getPath,
  invert,
  isPlainObject,
  mapValues,
  normalizeById,
  omit,
  pick,
  renameKeys,
  setPath,
} from '@ex/js/04-objects.js';

describe('P1 pick', () => {
  it('keeps only existing listed keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c', 'zz'])).toEqual({ a: 1, c: 3 });
    expect(pick({ a: 1 }, [])).toEqual({});
  });

  it('keeps a present key whose value is undefined', () => {
    const result = pick({ a: undefined, b: 1 }, ['a']);
    expect(Object.keys(result)).toEqual(['a']);
  });

  it('does not mutate the source', () => {
    const src = { a: 1, b: 2 };
    pick(src, ['a']);
    expect(src).toEqual({ a: 1, b: 2 });
  });
});

describe('P2 omit', () => {
  it('drops the listed keys', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
    expect(omit({ a: 1 }, ['a'])).toEqual({});
    expect(omit({ a: 1 }, ['nope'])).toEqual({ a: 1 });
  });

  it('does not mutate the source', () => {
    const src = { a: 1, b: 2 };
    omit(src, ['a']);
    expect(src).toEqual({ a: 1, b: 2 });
  });
});

describe('P3 mapValues', () => {
  it('transforms values and keeps keys', () => {
    expect(mapValues({ a: 1, b: 2 }, (n) => n * 10)).toEqual({ a: 10, b: 20 });
  });

  it('passes the key as the second argument', () => {
    expect(mapValues({ a: 1 }, (n, k) => `${k}=${n}`)).toEqual({ a: 'a=1' });
  });
});

describe('P4 invert', () => {
  it('swaps keys and values', () => {
    expect(invert({ a: 'x', b: 'y' })).toEqual({ x: 'a', y: 'b' });
  });

  it('lets the last key win on collision', () => {
    expect(invert({ a: 'x', b: 'x' })).toEqual({ x: 'b' });
  });

  it('coerces numeric values to string keys', () => {
    expect(invert({ a: 1 })).toEqual({ 1: 'a' });
  });
});

describe('P5 deepClone', () => {
  it('returns primitives unchanged', () => {
    expect(deepClone(5)).toBe(5);
    expect(deepClone('x')).toBe('x');
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  it('copies nested objects and arrays deeply', () => {
    const original = { a: 1, b: { c: [1, { d: 2 }] } };
    const copy = deepClone(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.b).not.toBe(original.b);
    expect(copy.b.c).not.toBe(original.b.c);
    expect(copy.b.c[1]).not.toBe(original.b.c[1]);
  });

  it('mutating the clone leaves the original alone', () => {
    const original = { list: [1, 2], nested: { n: 1 } };
    const copy = deepClone(original);
    copy.list.push(3);
    copy.nested.n = 99;
    expect(original.list).toEqual([1, 2]);
    expect(original.nested.n).toBe(1);
  });

  it('clones Dates into new Date objects', () => {
    const original = { at: new Date('2020-01-02T03:04:05Z') };
    const copy = deepClone(original);
    expect(copy.at).toBeInstanceOf(Date);
    expect(copy.at).not.toBe(original.at);
    expect(copy.at.getTime()).toBe(original.at.getTime());
  });

  it('keeps functions by reference', () => {
    const fn = () => 1;
    expect(deepClone({ fn }).fn).toBe(fn);
  });

  it('does not cheat with JSON or structuredClone', () => {
    const source = deepClone.toString();
    expect(source).not.toMatch(/JSON\.(parse|stringify)/);
    expect(source).not.toMatch(/structuredClone/);
  });
});

describe('P6 deepMerge', () => {
  it('merges nested objects', () => {
    expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 9, d: 3 } })).toEqual({
      a: { b: 1, c: 9, d: 3 },
    });
  });

  it('replaces arrays instead of concatenating', () => {
    expect(deepMerge({ list: [1, 2, 3] }, { list: [9] })).toEqual({ list: [9] });
  });

  it('ignores undefined but honours null', () => {
    expect(deepMerge({ a: 1, b: 2 }, { a: undefined, b: null })).toEqual({ a: 1, b: null });
  });

  it('returns a new object and does not mutate either input', () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };
    const result = deepMerge(target, source);
    expect(result).not.toBe(target);
    expect(target).toEqual({ a: { b: 1 } });
    expect(source).toEqual({ a: { c: 2 } });
  });
});

describe('P7 getPath', () => {
  const data = { a: { b: [{ c: 42 }] }, nil: null, zero: 0 };

  it.each([
    ['a.b[0].c', 42],
    ['a.b.0.c', 42],
    ['zero', 0],
    ['nil', null],
    ['a', data.a],
  ])('reads %s', (path, expected) => {
    expect(getPath(data, path)).toEqual(expected);
  });

  it('returns the fallback for missing paths', () => {
    expect(getPath({ a: {} }, 'a.b.c', 'none')).toBe('none');
    expect(getPath(data, 'a.b[5].c', 'none')).toBe('none');
    expect(getPath(data, 'nope', 'none')).toBe('none');
    expect(getPath(null, 'a.b', 'none')).toBe('none');
  });

  it('returns undefined with no fallback given', () => {
    expect(getPath({}, 'x.y')).toBe(undefined);
  });

  it('does not walk through primitives', () => {
    expect(getPath({ s: 'hello' }, 's.length', 'none')).toBe('none');
  });
});

describe('P8 setPath', () => {
  it('replaces a nested value immutably', () => {
    const before = { a: { b: 1 }, keep: { x: 1 } };
    const after = setPath(before, 'a.b', 2);
    expect(after.a.b).toBe(2);
    expect(before.a.b).toBe(1);
    expect(after).not.toBe(before);
    expect(after.a).not.toBe(before.a);
  });

  it('shares untouched branches (structural sharing)', () => {
    const before = { a: { b: 1 }, keep: { x: 1 } };
    const after = setPath(before, 'a.b', 2);
    expect(after.keep).toBe(before.keep);
  });

  it('creates missing intermediate objects', () => {
    expect(setPath({}, 'a.b.c', 1)).toEqual({ a: { b: { c: 1 } } });
  });

  it('handles array indexes', () => {
    const before = { list: [{ n: 1 }, { n: 2 }] };
    const after = setPath(before, 'list[1].n', 99);
    expect(after.list[1].n).toBe(99);
    expect(after.list[0]).toBe(before.list[0]);
    expect(Array.isArray(after.list)).toBe(true);
    expect(before.list[1].n).toBe(2);
  });

  it('creates an array when the next segment is numeric', () => {
    const after = setPath({}, 'rows[0].id', 'x');
    expect(Array.isArray(after.rows)).toBe(true);
    expect(after.rows[0]).toEqual({ id: 'x' });
  });

  it('sets a top-level key', () => {
    expect(setPath({ a: 1 }, 'b', 2)).toEqual({ a: 1, b: 2 });
  });
});

describe('P9 deepFreeze', () => {
  it('freezes nested structures', () => {
    const frozen = deepFreeze({ a: { b: { c: 1 } }, list: [{ n: 1 }] });
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.a.b)).toBe(true);
    expect(Object.isFrozen(frozen.list)).toBe(true);
    expect(Object.isFrozen(frozen.list[0])).toBe(true);
  });

  it('silently ignores writes in non-strict code and throws in strict', () => {
    const frozen = deepFreeze({ a: 1 });
    expect(() => {
      frozen.a = 2;
    }).toThrow(TypeError); // ES modules are always strict mode
    expect(frozen.a).toBe(1);
  });

  it('survives cycles', () => {
    const node = { name: 'a' };
    node.self = node;
    expect(() => deepFreeze(node)).not.toThrow();
    expect(Object.isFrozen(node)).toBe(true);
  });

  it('returns the same object it was given', () => {
    const obj = { a: 1 };
    expect(deepFreeze(obj)).toBe(obj);
  });
});

describe('P10 renameKeys', () => {
  it('renames mapped keys and passes others through', () => {
    expect(renameKeys({ first_name: 'Ada', age: 36 }, { first_name: 'firstName' })).toEqual({
      firstName: 'Ada',
      age: 36,
    });
  });

  it('is a no-op with an empty mapping', () => {
    expect(renameKeys({ a: 1 }, {})).toEqual({ a: 1 });
  });
});

describe('P11 isPlainObject', () => {
  it.each([
    [{}, true],
    [{ a: 1 }, true],
    [Object.create(null), true],
    [[], false],
    [null, false],
    [undefined, false],
    [new Date(), false],
    [() => {}, false],
    ['x', false],
    [42, false],
    [new Map(), false],
  ])('isPlainObject(%o) === %s', (value, expected) => {
    expect(isPlainObject(value)).toBe(expected);
  });

  it('rejects class instances', () => {
    class Thing {}
    expect(isPlainObject(new Thing())).toBe(false);
  });
});

describe('P12 flattenKeys', () => {
  it('flattens nested plain objects', () => {
    expect(flattenKeys({ a: { b: 1, c: { d: 2 } }, e: 3 })).toEqual({
      'a.b': 1,
      'a.c.d': 2,
      e: 3,
    });
  });

  it('treats arrays and dates as leaves', () => {
    const at = new Date('2020-01-01');
    expect(flattenKeys({ list: [1, 2], at })).toEqual({ list: [1, 2], at });
  });

  it('drops empty nested objects', () => {
    expect(flattenKeys({ a: {}, b: 1 })).toEqual({ b: 1 });
  });

  it('handles an empty object', () => {
    expect(flattenKeys({})).toEqual({});
  });
});

describe('P13 normalizeById', () => {
  it('builds a lookup table and an id order', () => {
    expect(
      normalizeById([
        { id: 'a', n: 1 },
        { id: 'b', n: 2 },
      ]),
    ).toEqual({
      byId: { a: { id: 'a', n: 1 }, b: { id: 'b', n: 2 } },
      ids: ['a', 'b'],
    });
  });

  it('lets later records win but keeps the first position', () => {
    const result = normalizeById([
      { id: 'a', n: 1 },
      { id: 'b', n: 2 },
      { id: 'a', n: 3 },
    ]);
    expect(result.ids).toEqual(['a', 'b']);
    expect(result.byId.a).toEqual({ id: 'a', n: 3 });
  });

  it('handles an empty list', () => {
    expect(normalizeById([])).toEqual({ byId: {}, ids: [] });
  });
});

describe('P14 diffObjects', () => {
  it('reports added, removed and changed keys', () => {
    expect(diffObjects({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({
      added: ['c'],
      removed: ['a'],
      changed: { b: { from: 2, to: 3 } },
    });
  });

  it('reports nothing for identical objects', () => {
    expect(diffObjects({ a: 1 }, { a: 1 })).toEqual({ added: [], removed: [], changed: {} });
  });

  it('uses Object.is semantics', () => {
    expect(diffObjects({ a: NaN }, { a: NaN }).changed).toEqual({});
    expect(diffObjects({ a: 0 }, { a: -0 }).changed).toEqual({ a: { from: 0, to: -0 } });
  });

  it('treats different object references as changed', () => {
    const diff = diffObjects({ a: { n: 1 } }, { a: { n: 1 } });
    expect(Object.keys(diff.changed)).toEqual(['a']);
  });
});
