import { describe, expect, it, vi } from 'vitest';
import {
  accumulator,
  chunkIter,
  collect,
  fibonacci,
  filterIter,
  lazyPipeline,
  makeIterator,
  mapIter,
  Playlist,
  range,
  streamAll,
  take,
  walkTree,
  zipIter,
} from '@ex/js/08-iterators-generators.js';

/** An infinite source that records how many values were actually pulled. */
function countingNaturals() {
  const state = { pulled: 0 };
  const iterable = {
    *[Symbol.iterator]() {
      for (let i = 0; ; i++) {
        state.pulled += 1;
        yield i;
      }
    },
  };
  return { iterable, state };
}

describe('P1 range', () => {
  it.each([
    [[0, 5], [0, 1, 2, 3, 4]],
    [[0, 10, 3], [0, 3, 6, 9]],
    [[3, 0, -1], [3, 2, 1]],
    [[0, 0], []],
    [[5, 0], []],
    [[-2, 2], [-2, -1, 0, 1]],
  ])('range(...%j)', (args, expected) => {
    expect([...range(...args)]).toEqual(expected);
  });

  it('rejects a zero step', () => {
    expect(() => [...range(0, 5, 0)]).toThrow(RangeError);
  });

  it('is lazy — nothing runs until you iterate', () => {
    const it = range(0, 3);
    expect(it.next()).toEqual({ value: 0, done: false });
    expect(it.next()).toEqual({ value: 1, done: false });
  });
});

describe('P2 take', () => {
  it('takes the first n values', () => {
    expect([...take([1, 2, 3, 4], 2)]).toEqual([1, 2]);
    expect([...take([1, 2], 5)]).toEqual([1, 2]);
    expect([...take([1, 2], 0)]).toEqual([]);
  });

  it('works on an infinite iterable', () => {
    expect([...take(fibonacci(), 5)]).toEqual([0, 1, 1, 2, 3]);
  });

  it('does not pull more than it needs', () => {
    const { iterable, state } = countingNaturals();
    expect([...take(iterable, 3)]).toEqual([0, 1, 2]);
    expect(state.pulled).toBe(3);
  });
});

describe('P3 mapIter / filterIter', () => {
  it('maps lazily', () => {
    expect([...mapIter([1, 2, 3], (n) => n * 2)]).toEqual([2, 4, 6]);
    expect([...take(mapIter(fibonacci(), (n) => n + 1), 4)]).toEqual([1, 2, 2, 3]);
  });

  it('filters lazily', () => {
    expect([...filterIter([1, 2, 3, 4], (n) => n % 2 === 0)]).toEqual([2, 4]);
    expect([...take(filterIter(fibonacci(), (n) => n % 2 === 0), 4)]).toEqual([0, 2, 8, 34]);
  });

  it('passes the index', () => {
    expect([...mapIter(['a', 'b'], (v, i) => `${i}${v}`)]).toEqual(['0a', '1b']);
    expect([...filterIter(['a', 'b', 'c'], (_v, i) => i !== 1)]).toEqual(['a', 'c']);
  });

  it('does no work until consumed', () => {
    const fn = vi.fn((n) => n);
    const lazy = mapIter([1, 2, 3], fn);
    expect(fn).not.toHaveBeenCalled();
    [...lazy];
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('P4 fibonacci', () => {
  it('produces the sequence', () => {
    expect([...take(fibonacci(), 10)]).toEqual([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
  });

  it('keeps going', () => {
    const values = [...take(fibonacci(), 30)];
    expect(values[29]).toBe(514229);
  });
});

describe('P5 Playlist', () => {
  it('iterates in order', () => {
    const p = new Playlist(['a', 'b', 'c']);
    expect([...p]).toEqual(['a', 'b', 'c']);
    const collected = [];
    for (const track of p) collected.push(track);
    expect(collected).toEqual(['a', 'b', 'c']);
  });

  it('supports destructuring', () => {
    const [first, second] = new Playlist(['a', 'b', 'c']);
    expect([first, second]).toEqual(['a', 'b']);
  });

  it('adds tracks and chains', () => {
    const p = new Playlist().add('x').add('y');
    expect(p.length).toBe(2);
    expect([...p]).toEqual(['x', 'y']);
  });

  it('can be iterated twice (a fresh iterator each time)', () => {
    const p = new Playlist(['a', 'b']);
    expect([...p]).toEqual(['a', 'b']);
    expect([...p]).toEqual(['a', 'b']);
  });

  it('does not alias the array it was constructed with', () => {
    const source = ['a'];
    const p = new Playlist(source);
    source.push('b');
    expect([...p]).toEqual(['a']);
  });

  it('wraps around with shuffledFrom', () => {
    const p = new Playlist(['a', 'b', 'c', 'd']);
    expect([...p.shuffledFrom(2)]).toEqual(['c', 'd', 'a', 'b']);
    expect([...p.shuffledFrom(0)]).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('P6 zipIter', () => {
  it('pairs values', () => {
    expect([...zipIter([1, 2, 3], 'ab')]).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
  });

  it('works with an infinite side', () => {
    expect([...zipIter(['a', 'b'], fibonacci())]).toEqual([
      ['a', 0],
      ['b', 1],
    ]);
  });

  it('handles empty input', () => {
    expect([...zipIter([], [1])]).toEqual([]);
  });
});

describe('P7 chunkIter', () => {
  it('chunks with a short tail', () => {
    expect([...chunkIter([1, 2, 3, 4, 5], 2)]).toEqual([[1, 2], [3, 4], [5]]);
    expect([...chunkIter([], 2)]).toEqual([]);
  });

  it('works on an infinite source', () => {
    expect([...take(chunkIter(fibonacci(), 3), 2)]).toEqual([
      [0, 1, 1],
      [2, 3, 5],
    ]);
  });
});

describe('P8 walkTree', () => {
  const tree = {
    value: 'root',
    children: [
      { value: 'a', children: [{ value: 'a1' }, { value: 'a2' }] },
      { value: 'b' },
      { value: 'c', children: [{ value: 'c1', children: [{ value: 'c1x' }] }] },
    ],
  };

  it('walks depth-first, parents first', () => {
    expect([...walkTree(tree)]).toEqual(['root', 'a', 'a1', 'a2', 'b', 'c', 'c1', 'c1x']);
  });

  it('handles a leaf', () => {
    expect([...walkTree({ value: 'only' })]).toEqual(['only']);
  });

  it('is lazy enough to stop early', () => {
    expect([...take(walkTree(tree), 3)]).toEqual(['root', 'a', 'a1']);
  });
});

describe('P9 accumulator', () => {
  it('accumulates values sent in with next()', () => {
    const acc = accumulator();
    expect(acc.next()).toEqual({ value: 0, done: false });
    expect(acc.next(5)).toEqual({ value: 5, done: false });
    expect(acc.next(3)).toEqual({ value: 8, done: false });
    expect(acc.next(-1)).toEqual({ value: 7, done: false });
    expect(acc.next(null)).toEqual({ value: 7, done: true });
  });

  it('finishes on undefined too', () => {
    const acc = accumulator();
    acc.next();
    acc.next(10);
    expect(acc.next(undefined)).toEqual({ value: 10, done: true });
  });
});

describe('P10 makeIterator', () => {
  it('implements next() manually', () => {
    const it = makeIterator(['a', 'b']);
    expect(it.next()).toEqual({ value: 'a', done: false });
    expect(it.next()).toEqual({ value: 'b', done: false });
    expect(it.next()).toEqual({ value: undefined, done: true });
    expect(it.next()).toEqual({ value: undefined, done: true });
  });

  it('is itself iterable', () => {
    expect([...makeIterator([1, 2, 3])]).toEqual([1, 2, 3]);
  });

  it('does not use generator syntax', () => {
    expect(makeIterator.toString()).not.toMatch(/function\s*\*|yield/);
  });
});

describe('P11/P12 streamAll + collect', () => {
  const pages = [
    { items: ['a', 'b'], hasMore: true },
    { items: ['c'], hasMore: true },
    { items: ['d', 'e'], hasMore: false },
  ];

  it('streams every item across pages', async () => {
    const fetchPage = vi.fn(async (page) => pages[page - 1]);
    expect(await collect(streamAll(fetchPage))).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('fetches the next page only when needed', async () => {
    const fetchPage = vi.fn(async (page) => pages[page - 1]);
    const seen = [];
    for await (const item of streamAll(fetchPage)) {
      seen.push(item);
      if (seen.length === 2) break; // page 1 exhausted exactly
    }
    expect(seen).toEqual(['a', 'b']);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('handles a single empty page', async () => {
    expect(await collect(streamAll(async () => ({ items: [], hasMore: false })))).toEqual([]);
  });
});

describe('P13 lazyPipeline', () => {
  it('filters, transforms and stops', () => {
    expect(lazyPipeline(range(0, 100), (n) => n % 3 === 0, (n) => `#${n}`, 4)).toEqual([
      '#0',
      '#3',
      '#6',
      '#9',
    ]);
  });

  it('works against an infinite source', () => {
    expect(lazyPipeline(fibonacci(), (n) => n % 2 === 1, (n) => n * 10, 3)).toEqual([10, 10, 30]);
  });

  it('pulls only what it needs', () => {
    const { iterable, state } = countingNaturals();
    lazyPipeline(iterable, (n) => n % 5 === 0, (n) => n, 3);
    // 0, 5 and 10 are the first three multiples of 5, so it must stop at 10.
    expect(state.pulled).toBe(11);
  });
});
