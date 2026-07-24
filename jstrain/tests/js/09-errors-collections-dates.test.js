import { describe, expect, it, vi } from 'vitest';
import {
  addDays,
  attempt,
  attemptAsync,
  containsAll,
  countByDay,
  createRegistry,
  daysBetween,
  formatDateUTC,
  groupErrorsByField,
  LRUCache,
  parseJson,
  relativeTime,
  rethrowAs,
  ValidationError,
  withCleanup,
} from '@ex/js/09-errors-collections-dates.js';

describe('P1 ValidationError', () => {
  it('carries a field and a default code', () => {
    const error = new ValidationError('email is required', 'email');
    expect(error.message).toBe('email is required');
    expect(error.field).toBe('email');
    expect(error.code).toBe('invalid');
    expect(error.name).toBe('ValidationError');
  });

  it('accepts a custom code', () => {
    expect(new ValidationError('too short', 'password', 'min_length').code).toBe('min_length');
  });

  it('is a real Error', () => {
    const error = new ValidationError('x', 'y');
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toBeInstanceOf(Error);
    expect(typeof error.stack).toBe('string');
  });

  it('can be caught and narrowed', () => {
    try {
      throw new ValidationError('bad', 'age');
    } catch (error) {
      expect(error instanceof ValidationError ? error.field : null).toBe('age');
    }
  });
});

describe('P2/P3 attempt / attemptAsync', () => {
  it('wraps a success', () => {
    expect(attempt(() => 42)).toEqual({ ok: true, value: 42 });
  });

  it('wraps a failure without throwing', () => {
    const result = attempt(() => {
      throw new ValidationError('bad', 'name');
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('wraps a thrown non-Error in an Error', () => {
    const result = attempt(() => {
      // eslint-disable-next-line no-throw-literal
      throw 'just a string';
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('just a string');
  });

  it('works for async success and failure', async () => {
    await expect(attemptAsync(async () => 'ok')).resolves.toEqual({ ok: true, value: 'ok' });
    const failed = await attemptAsync(async () => {
      throw new Error('async boom');
    });
    expect(failed).toMatchObject({ ok: false });
    expect(failed.error.message).toBe('async boom');
  });

  it('catches a rejected promise, not just a sync throw', async () => {
    const result = await attemptAsync(() => Promise.reject(new Error('rejected')));
    expect(result.ok).toBe(false);
  });
});

describe('P4 parseJson', () => {
  it('parses valid JSON', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseJson('[1,2]')).toEqual([1, 2]);
    expect(parseJson('null')).toBe(null);
  });

  it('returns the fallback for invalid JSON', () => {
    expect(parseJson('{oops')).toBe(null);
    expect(parseJson('', 'fallback')).toBe('fallback');
    expect(parseJson('undefined', {})).toEqual({});
  });
});

describe('P5 withCleanup', () => {
  it('returns the value and cleans up', () => {
    const cleanup = vi.fn();
    expect(withCleanup(() => 'value', cleanup)).toBe('value');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('cleans up and re-throws on failure', () => {
    const cleanup = vi.fn();
    expect(() =>
      withCleanup(() => {
        throw new Error('inner');
      }, cleanup),
    ).toThrow('inner');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('ignores what cleanup returns', () => {
    expect(withCleanup(() => 1, () => 999)).toBe(1);
  });
});

describe('P6 rethrowAs', () => {
  it('passes a success through', () => {
    expect(rethrowAs(() => 5, 'nope')).toBe(5);
  });

  it('wraps the original as `cause`', () => {
    const original = new Error('db connection refused');
    try {
      rethrowAs(() => {
        throw original;
      }, 'could not load user');
      expect.unreachable();
    } catch (error) {
      expect(error.message).toBe('could not load user');
      expect(error.cause).toBe(original);
    }
  });
});

describe('P7 groupErrorsByField', () => {
  it('groups messages by field', () => {
    expect(
      groupErrorsByField([
        new ValidationError('required', 'email'),
        new ValidationError('too short', 'password'),
        new ValidationError('must be an email', 'email'),
      ]),
    ).toEqual({
      email: ['required', 'must be an email'],
      password: ['too short'],
    });
  });

  it('puts non-validation errors under "_"', () => {
    expect(groupErrorsByField([new Error('boom')])).toEqual({ _: ['boom'] });
  });

  it('handles an empty list', () => {
    expect(groupErrorsByField([])).toEqual({});
  });
});

describe('P8 LRUCache', () => {
  it('stores and reads values', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('missing')).toBe(undefined);
    expect(cache.size).toBe(1);
  });

  it('evicts the least recently used key', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.has('a')).toBe(false);
    expect(cache.keys()).toEqual(['b', 'c']);
  });

  it('a get() counts as a use', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' is now the newest, so 'b' should go next
    cache.set('c', 3);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('has() does not count as a use', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.has('a');
    cache.set('c', 3);
    expect(cache.has('a')).toBe(false);
  });

  it('re-setting an existing key refreshes it without growing', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 9);
    expect(cache.size).toBe(2);
    expect(cache.keys()).toEqual(['b', 'a']);
    cache.set('c', 3);
    expect(cache.has('b')).toBe(false);
    expect(cache.get('a')).toBe(9);
  });

  it('deletes', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('a')).toBe(false);
    expect(cache.size).toBe(0);
  });

  it('rejects a bad capacity', () => {
    expect(() => new LRUCache(0)).toThrow(RangeError);
    expect(() => new LRUCache(-1)).toThrow('capacity must be >= 1');
  });

  it('supports non-string keys', () => {
    const cache = new LRUCache(2);
    const key = { id: 1 };
    cache.set(key, 'object key');
    expect(cache.get(key)).toBe('object key');
    expect(cache.get({ id: 1 })).toBe(undefined); // different reference
  });
});

describe('P9 containsAll', () => {
  it.each([
    [[1, 2, 3], [1, 3], true],
    [[1, 2, 3], [4], false],
    [[1, 2, 3], [], true],
    [[], [1], false],
  ])('containsAll(%j, %j) === %s', (haystack, needles, expected) => {
    expect(containsAll(haystack, needles)).toBe(expected);
  });

  it('accepts Sets and strings', () => {
    expect(containsAll(new Set(['a', 'b']), ['a'])).toBe(true);
    expect(containsAll('abc', ['a', 'c'])).toBe(true);
  });

  it('is fast on large inputs (build a Set, do not scan repeatedly)', () => {
    const haystack = Array.from({ length: 100_000 }, (_, i) => i);
    const needles = Array.from({ length: 10_000 }, (_, i) => i * 7);
    const started = Date.now();
    containsAll(haystack, needles);
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe('P10 createRegistry', () => {
  it('stores metadata without touching the object', () => {
    const registry = createRegistry();
    const target = { id: 1 };
    registry.set(target, { visits: 1 });
    expect(registry.get(target)).toEqual({ visits: 1 });
    expect(registry.has(target)).toBe(true);
    expect(Object.keys(target)).toEqual(['id']);
    expect(JSON.stringify(target)).toBe('{"id":1}');
  });

  it('keys by identity', () => {
    const registry = createRegistry();
    registry.set({ id: 1 }, 'a');
    expect(registry.has({ id: 1 })).toBe(false);
  });

  it('deletes', () => {
    const registry = createRegistry();
    const target = {};
    registry.set(target, 1);
    expect(registry.delete(target)).toBe(true);
    expect(registry.has(target)).toBe(false);
  });

  it('uses a WeakMap, not a Map', () => {
    expect(createRegistry.toString()).toMatch(/WeakMap/);
  });
});

describe('P11 formatDateUTC', () => {
  it.each([
    ['2024-03-01T10:15:00Z', '2024-03-01'],
    ['2024-12-31T23:59:59Z', '2024-12-31'],
    ['2024-01-05T00:00:00Z', '2024-01-05'],
    ['1999-09-09T12:00:00Z', '1999-09-09'],
  ])('formatDateUTC(%s) === %s', (iso, expected) => {
    expect(formatDateUTC(new Date(iso))).toBe(expected);
  });

  it('zero-pads single digits', () => {
    expect(formatDateUTC(new Date(Date.UTC(2024, 0, 2)))).toBe('2024-01-02');
  });
});

describe('P12 addDays / daysBetween', () => {
  it('adds days without mutating', () => {
    const original = new Date('2024-03-01T10:00:00Z');
    const result = addDays(original, 5);
    expect(formatDateUTC(result)).toBe('2024-03-06');
    expect(formatDateUTC(original)).toBe('2024-03-01');
    expect(result).not.toBe(original);
  });

  it('subtracts with a negative count and crosses months', () => {
    expect(formatDateUTC(addDays(new Date('2024-03-01T10:00:00Z'), -1))).toBe('2024-02-29');
  });

  it('counts calendar days between dates', () => {
    expect(daysBetween(new Date('2024-03-01T00:00:00Z'), new Date('2024-03-04T00:00:00Z'))).toBe(3);
    expect(daysBetween(new Date('2024-03-04T00:00:00Z'), new Date('2024-03-01T00:00:00Z'))).toBe(-3);
    expect(daysBetween(new Date('2024-03-01T10:00:00Z'), new Date('2024-03-01T23:00:00Z'))).toBe(0);
  });

  it('counts 23:00 -> 01:00 the next day as one day', () => {
    expect(daysBetween(new Date('2024-03-01T23:00:00Z'), new Date('2024-03-02T01:00:00Z'))).toBe(1);
  });
});

describe('P13 relativeTime', () => {
  const now = new Date('2024-03-10T12:00:00Z');
  const ago = (ms) => new Date(now.getTime() - ms);
  const ahead = (ms) => new Date(now.getTime() + ms);
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it.each([
    [ago(0), 'just now'],
    [ago(59 * SECOND), 'just now'],
    [ago(60 * SECOND), '1 minute ago'],
    [ago(5 * MINUTE), '5 minutes ago'],
    [ago(59 * MINUTE), '59 minutes ago'],
    [ago(HOUR), '1 hour ago'],
    [ago(5 * HOUR), '5 hours ago'],
    [ago(DAY), '1 day ago'],
    [ago(29 * DAY), '29 days ago'],
  ])('past: %s -> %s', (date, expected) => {
    expect(relativeTime(date, now)).toBe(expected);
  });

  it.each([
    [ahead(30 * SECOND), 'just now'],
    [ahead(2 * MINUTE), 'in 2 minutes'],
    [ahead(3 * HOUR), 'in 3 hours'],
    [ahead(2 * DAY), 'in 2 days'],
  ])('future: %s -> %s', (date, expected) => {
    expect(relativeTime(date, now)).toBe(expected);
  });

  it('falls back to a plain date beyond 30 days', () => {
    expect(relativeTime(new Date('2023-01-15T00:00:00Z'), now)).toBe('2023-01-15');
  });
});

describe('P14 countByDay', () => {
  it('counts per UTC day, sorted ascending', () => {
    const result = countByDay([
      '2024-03-02T10:00:00Z',
      '2024-03-01T23:00:00Z',
      '2024-03-02T11:00:00Z',
      '2024-03-01T01:00:00Z',
      '2024-03-03T00:00:00Z',
    ]);
    expect(result).toBeInstanceOf(Map);
    expect([...result.entries()]).toEqual([
      ['2024-03-01', 2],
      ['2024-03-02', 2],
      ['2024-03-03', 1],
    ]);
  });

  it('ignores invalid timestamps', () => {
    expect([...countByDay(['nope', '2024-03-01T00:00:00Z', '']).entries()]).toEqual([
      ['2024-03-01', 1],
    ]);
  });

  it('handles an empty list', () => {
    expect(countByDay([]).size).toBe(0);
  });
});
