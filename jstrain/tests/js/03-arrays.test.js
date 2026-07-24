import { describe, expect, it } from 'vitest';
import {
  averageBy,
  chunk,
  countBy,
  difference,
  groupBy,
  intersection,
  partition,
  rotate,
  runningTotal,
  sortBy,
  summarizeOrders,
  sumBy,
  tagPairs,
  topN,
  union,
  uniqueBy,
  zip,
} from '@ex/js/03-arrays.js';

describe('P1 chunk', () => {
  it.each([
    [[1, 2, 3, 4, 5], 2, [[1, 2], [3, 4], [5]]],
    [[1, 2, 3, 4], 2, [[1, 2], [3, 4]]],
    [[1], 3, [[1]]],
    [[], 3, []],
    [[1, 2, 3], 1, [[1], [2], [3]]],
  ])('chunk(%j, %i)', (items, size, expected) => {
    expect(chunk(items, size)).toEqual(expected);
  });

  it('rejects a bad size', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError);
    expect(() => chunk([1], -2)).toThrow('size must be >= 1');
    expect(() => chunk([1], 1.5)).toThrow(RangeError);
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3];
    chunk(input, 2);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe('P2 zip', () => {
  it('pairs and truncates to the shorter array', () => {
    expect(zip([1, 2, 3], ['a', 'b'])).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
    expect(zip([1], ['a', 'b', 'c'])).toEqual([[1, 'a']]);
    expect(zip([], [1])).toEqual([]);
  });
});

describe('P3 groupBy', () => {
  it('groups by a derived key, preserving order', () => {
    expect(groupBy(['ant', 'bee', 'ape', 'bat'], (w) => w[0])).toEqual({
      a: ['ant', 'ape'],
      b: ['bee', 'bat'],
    });
  });

  it('coerces numeric keys to strings', () => {
    expect(groupBy([1, 2, 3, 4], (n) => n % 2)).toEqual({ 0: [2, 4], 1: [1, 3] });
  });

  it('returns an empty object for an empty input', () => {
    expect(groupBy([], (x) => x)).toEqual({});
  });

  it('passes the index as the second argument', () => {
    expect(groupBy(['a', 'b', 'c'], (_item, i) => (i < 2 ? 'head' : 'tail'))).toEqual({
      head: ['a', 'b'],
      tail: ['c'],
    });
  });
});

describe('P4 countBy', () => {
  it('counts occurrences', () => {
    expect(countBy([1, 2, 2, 3, 3, 3], (n) => n)).toEqual({ 1: 1, 2: 2, 3: 3 });
    expect(countBy(['a', 'A', 'b'], (s) => s.toLowerCase())).toEqual({ a: 2, b: 1 });
    expect(countBy([], (x) => x)).toEqual({});
  });
});

describe('P5 uniqueBy', () => {
  it('keeps the first item per key', () => {
    expect(
      uniqueBy(
        [
          { id: 1, v: 'a' },
          { id: 1, v: 'b' },
          { id: 2, v: 'c' },
        ],
        (u) => u.id,
      ),
    ).toEqual([
      { id: 1, v: 'a' },
      { id: 2, v: 'c' },
    ]);
  });

  it('works on primitives', () => {
    expect(uniqueBy([3, 1, 3, 2, 1], (n) => n)).toEqual([3, 1, 2]);
  });

  it('is fast enough on 50k items (use a Set/Map, not includes)', () => {
    const items = Array.from({ length: 50_000 }, (_, i) => ({ id: i % 1000 }));
    const started = Date.now();
    expect(uniqueBy(items, (x) => x.id)).toHaveLength(1000);
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe('P6 sortBy', () => {
  const people = [
    { name: 'Charlie', age: 30 },
    { name: 'alice', age: 25 },
    { name: 'Bob', age: 30 },
  ];

  it('sorts numbers numerically', () => {
    expect(sortBy(people, (p) => p.age).map((p) => p.name)).toEqual(['alice', 'Charlie', 'Bob']);
  });

  it('sorts strings case-insensitively', () => {
    expect(sortBy(people, (p) => p.name).map((p) => p.name)).toEqual(['alice', 'Bob', 'Charlie']);
  });

  it('supports descending order', () => {
    expect(sortBy([3, 1, 2], (n) => n, 'desc')).toEqual([3, 2, 1]);
  });

  it('is stable for equal keys', () => {
    expect(sortBy(people, (p) => p.age).slice(1).map((p) => p.name)).toEqual(['Charlie', 'Bob']);
  });

  it('does not mutate the input', () => {
    const input = [3, 1, 2];
    sortBy(input, (n) => n);
    expect(input).toEqual([3, 1, 2]);
  });

  it('sorts numbers correctly where a naive .sort() would not', () => {
    expect(sortBy([10, 9, 100], (n) => n)).toEqual([9, 10, 100]);
  });
});

describe('P7 partition', () => {
  it('splits into matching and non-matching', () => {
    expect(partition([1, 2, 3, 4], (n) => n % 2 === 0)).toEqual([
      [2, 4],
      [1, 3],
    ]);
    expect(partition([], () => true)).toEqual([[], []]);
    expect(partition([1, 2], () => true)).toEqual([[1, 2], []]);
  });

  it('passes the index', () => {
    expect(partition(['a', 'b', 'c'], (_v, i) => i === 1)).toEqual([['b'], ['a', 'c']]);
  });
});

describe('P8 sumBy / averageBy', () => {
  const rows = [{ n: 1 }, { n: 2 }, { n: 6 }];

  it('sums', () => {
    expect(sumBy(rows, (r) => r.n)).toBe(9);
    expect(sumBy([], (r) => r.n)).toBe(0);
  });

  it('averages', () => {
    expect(averageBy(rows, (r) => r.n)).toBe(3);
  });

  it('returns null — not 0 or NaN — for an empty average', () => {
    expect(averageBy([], (r) => r.n)).toBe(null);
  });
});

describe('P9 rotate', () => {
  it.each([
    [[1, 2, 3, 4, 5], 2, [3, 4, 5, 1, 2]],
    [[1, 2, 3, 4, 5], 0, [1, 2, 3, 4, 5]],
    [[1, 2, 3, 4, 5], 5, [1, 2, 3, 4, 5]],
    [[1, 2, 3, 4, 5], 7, [3, 4, 5, 1, 2]],
    [[1, 2, 3, 4, 5], -1, [5, 1, 2, 3, 4]],
    [[1, 2, 3, 4, 5], -6, [5, 1, 2, 3, 4]],
    [[], 3, []],
  ])('rotate(%j, %i) -> %j', (items, n, expected) => {
    expect(rotate(items, n)).toEqual(expected);
  });
});

describe('P10 intersection / difference / union', () => {
  it('intersects', () => {
    expect(intersection([1, 2, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    expect(intersection([1], [2])).toEqual([]);
  });

  it('differences', () => {
    expect(difference([1, 2, 3], [2])).toEqual([1, 3]);
    expect(difference([1, 1, 2], [])).toEqual([1, 2]);
  });

  it('unions', () => {
    expect(union([1, 2], [2, 3])).toEqual([1, 2, 3]);
    expect(union([], [])).toEqual([]);
  });

  it('preserves the order of the first array', () => {
    expect(intersection(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b']);
  });
});

describe('P11 runningTotal', () => {
  it.each([
    [[1, 2, 3, 4], [1, 3, 6, 10]],
    [[], []],
    [[5], [5]],
    [[1, -1, 1], [1, 0, 1]],
  ])('runningTotal(%j) -> %j', (input, expected) => {
    expect(runningTotal(input)).toEqual(expected);
  });
});

describe('P12 topN', () => {
  const players = [
    { name: 'a', score: 10 },
    { name: 'b', score: 30 },
    { name: 'c', score: 20 },
    { name: 'd', score: 30 },
  ];

  it('returns the highest scorers first', () => {
    expect(topN(players, 2, (p) => p.score).map((p) => p.name)).toEqual(['b', 'd']);
  });

  it('keeps original order for ties', () => {
    expect(topN(players, 3, (p) => p.score).map((p) => p.name)).toEqual(['b', 'd', 'c']);
  });

  it('handles n larger than the array and n <= 0', () => {
    expect(topN(players, 99, (p) => p.score)).toHaveLength(4);
    expect(topN(players, 0, (p) => p.score)).toEqual([]);
  });

  it('does not mutate the input', () => {
    const copy = [...players];
    topN(players, 2, (p) => p.score);
    expect(players).toEqual(copy);
  });
});

describe('P13 summarizeOrders', () => {
  const orders = [
    { id: 'o1', customer: 'ada', total: 100, status: 'paid' },
    { id: 'o2', customer: 'bob', total: 60, status: 'paid' },
    { id: 'o3', customer: 'ada', total: 50, status: 'paid' },
    { id: 'o4', customer: 'cyd', total: 999, status: 'refunded' },
    { id: 'o5', customer: 'bob', total: 90, status: 'pending' },
    { id: 'o6', customer: 'dan', total: 150, status: 'paid' },
  ];

  it('summarizes paid orders per customer', () => {
    expect(summarizeOrders(orders)).toEqual([
      { customer: 'ada', orders: 2, revenue: 150, average: 75 },
      { customer: 'dan', orders: 1, revenue: 150, average: 150 },
      { customer: 'bob', orders: 1, revenue: 60, average: 60 },
    ]);
  });

  it('excludes customers with no paid orders', () => {
    expect(summarizeOrders(orders).map((r) => r.customer)).not.toContain('cyd');
  });

  it('rounds the average to 2 decimals', () => {
    const rows = [
      { id: '1', customer: 'x', total: 10, status: 'paid' },
      { id: '2', customer: 'x', total: 10, status: 'paid' },
      { id: '3', customer: 'x', total: 11, status: 'paid' },
    ];
    expect(summarizeOrders(rows)[0].average).toBe(10.33);
  });

  it('returns an empty array when nothing is paid', () => {
    expect(summarizeOrders([{ id: '1', customer: 'x', total: 1, status: 'pending' }])).toEqual([]);
  });
});

describe('P14 tagPairs', () => {
  it('flattens users into name:tag strings', () => {
    expect(
      tagPairs([
        { name: 'ada', tags: ['x', 'y'] },
        { name: 'bob', tags: [] },
        { name: 'cyd', tags: ['z'] },
      ]),
    ).toEqual(['ada:x', 'ada:y', 'cyd:z']);
  });

  it('tolerates a missing tags property', () => {
    expect(tagPairs([{ name: 'ada' }, { name: 'bob', tags: ['t'] }])).toEqual(['bob:t']);
  });
});
