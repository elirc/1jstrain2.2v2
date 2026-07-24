import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abortableDelay,
  createSerialQueue,
  dedupeInFlight,
  deferred,
  delay,
  eventLoopOrder,
  loadParallel,
  loadSequential,
  mapWithConcurrency,
  pollUntil,
  promisify,
  retry,
  saveAllOrReport,
  settleAll,
  withTimeout,
} from '@ex/js/07-async.js';

// Fake timers everywhere: `delay(1000)` costs nothing, but remember that
// nothing moves until you call vi.advanceTimersByTimeAsync().
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Tracks how many calls are in flight at the same moment. */
function makeTracker(ms = 100) {
  let inFlight = 0;
  let max = 0;
  const order = [];
  const load = async (value) => {
    inFlight += 1;
    max = Math.max(max, inFlight);
    await delay(ms);
    inFlight -= 1;
    order.push(value);
    return value;
  };
  return { load, maxInFlight: () => max, order };
}

describe('P1 delay', () => {
  it('resolves after the given time', async () => {
    const spy = vi.fn();
    delay(100).then(spy);
    await vi.advanceTimersByTimeAsync(99);
    expect(spy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(spy).toHaveBeenCalled();
  });

  it('resolves with the given value', async () => {
    const promise = delay(10, 'hi');
    await vi.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBe('hi');
  });
});

describe('P2 loadSequential vs loadParallel', () => {
  it('both return results in input order', async () => {
    const load = (id) => delay(50, id.toUpperCase());
    const seq = loadSequential(['a', 'b', 'c'], load);
    const par = loadParallel(['a', 'b', 'c'], load);
    await vi.advanceTimersByTimeAsync(500);
    await expect(seq).resolves.toEqual(['A', 'B', 'C']);
    await expect(par).resolves.toEqual(['A', 'B', 'C']);
  });

  it('loadSequential never runs two loads at once', async () => {
    const tracker = makeTracker();
    const promise = loadSequential(['a', 'b', 'c'], tracker.load);
    await vi.advanceTimersByTimeAsync(1000);
    await promise;
    expect(tracker.maxInFlight()).toBe(1);
  });

  it('loadSequential takes n * duration', async () => {
    const done = vi.fn();
    loadSequential(['a', 'b', 'c'], (id) => delay(100, id)).then(done);
    await vi.advanceTimersByTimeAsync(299);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
  });

  it('loadParallel starts everything immediately', async () => {
    const tracker = makeTracker();
    const promise = loadParallel(['a', 'b', 'c'], tracker.load);
    await vi.advanceTimersByTimeAsync(1000);
    await promise;
    expect(tracker.maxInFlight()).toBe(3);
  });

  it('loadParallel takes one duration, not three', async () => {
    const done = vi.fn();
    loadParallel(['a', 'b', 'c'], (id) => delay(100, id)).then(done);
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toHaveBeenCalled();
  });

  it('loadParallel rejects if any load fails', async () => {
    const promise = loadParallel(['a', 'b'], async (id) => {
      if (id === 'b') throw new Error('nope');
      return id;
    });
    const assertion = expect(promise).rejects.toThrow('nope');
    await vi.advanceTimersByTimeAsync(0);
    await assertion;
  });
});

describe('P3 settleAll', () => {
  it('splits fulfilled from rejected without throwing', async () => {
    const promise = settleAll([
      Promise.resolve(1),
      Promise.reject(new Error('bad')),
      Promise.resolve(3),
    ]);
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;
    expect(result.fulfilled).toEqual([1, 3]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toBeInstanceOf(Error);
  });

  it('handles an empty list', async () => {
    await expect(settleAll([])).resolves.toEqual({ fulfilled: [], rejected: [] });
  });

  it('handles all-rejected', async () => {
    const promise = settleAll([Promise.reject('a'), Promise.reject('b')]);
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toEqual({ fulfilled: [], rejected: ['a', 'b'] });
  });
});

describe('P4 withTimeout', () => {
  it('passes through a fast success', async () => {
    const promise = withTimeout(delay(100, 'value'), 500);
    await vi.advanceTimersByTimeAsync(100);
    await expect(promise).resolves.toBe('value');
  });

  it('rejects when the promise is too slow', async () => {
    const promise = withTimeout(delay(1000, 'value'), 500);
    const assertion = expect(promise).rejects.toThrow('timeout after 500ms');
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
  });

  it('propagates an early rejection', async () => {
    const promise = withTimeout(
      (async () => {
        await delay(10);
        throw new Error('original');
      })(),
      500,
    );
    const assertion = expect(promise).rejects.toThrow('original');
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });

  it('clears its timer on success (no timers left pending)', async () => {
    const promise = withTimeout(delay(10, 'ok'), 500);
    await vi.advanceTimersByTimeAsync(10);
    await promise;
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('P5 retry', () => {
  it('returns the first success without waiting', async () => {
    const fn = vi.fn(async () => 'ok');
    const promise = retry(fn);
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until it succeeds and passes the attempt number', async () => {
    const fn = vi.fn(async (attempt) => {
      if (attempt < 3) throw new Error(`fail ${attempt}`);
      return 'ok';
    });
    const promise = retry(fn, { attempts: 3, delayMs: 100, factor: 2 });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('backs off exponentially: 100ms then 200ms', async () => {
    const fn = vi.fn(async () => {
      throw new Error('always');
    });
    const promise = retry(fn, { attempts: 3, delayMs: 100, factor: 2 });
    const assertion = expect(promise).rejects.toThrow('always');

    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(199);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(3);

    await assertion;
  });

  it('rejects with the last error', async () => {
    let n = 0;
    const promise = retry(
      async () => {
        n += 1;
        throw new Error(`error ${n}`);
      },
      { attempts: 2, delayMs: 10 },
    );
    const assertion = expect(promise).rejects.toThrow('error 2');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it('does not sleep after the final failed attempt', async () => {
    const promise = retry(async () => Promise.reject(new Error('x')), {
      attempts: 1,
      delayMs: 10_000,
    });
    const assertion = expect(promise).rejects.toThrow('x');
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
    await assertion;
  });
});

describe('P6 mapWithConcurrency', () => {
  it('returns results in input order', async () => {
    const promise = mapWithConcurrency([1, 2, 3, 4, 5], async (n) => {
      await delay(n === 1 ? 500 : 10); // the first one is the slowest
      return n * 10;
    }, 2);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual([10, 20, 30, 40, 50]);
  });

  it('never exceeds the limit', async () => {
    const tracker = makeTracker();
    const promise = mapWithConcurrency([1, 2, 3, 4, 5, 6], tracker.load, 2);
    await vi.advanceTimersByTimeAsync(2000);
    await promise;
    expect(tracker.maxInFlight()).toBe(2);
  });

  it('actually runs concurrently (limit 3 over 6 items takes 2 rounds)', async () => {
    const done = vi.fn();
    mapWithConcurrency([1, 2, 3, 4, 5, 6], () => delay(100), 3).then(done);
    await vi.advanceTimersByTimeAsync(199);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
  });

  it('passes the index', async () => {
    const promise = mapWithConcurrency(['a', 'b'], async (item, index) => `${index}:${item}`, 1);
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toEqual(['0:a', '1:b']);
  });

  it('handles an empty list', async () => {
    await expect(mapWithConcurrency([], async (x) => x, 3)).resolves.toEqual([]);
  });

  it('rejects when a task fails', async () => {
    const promise = mapWithConcurrency([1, 2, 3], async (n) => {
      if (n === 2) throw new Error('boom');
      return n;
    }, 2);
    const assertion = expect(promise).rejects.toThrow('boom');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});

describe('P7 promisify', () => {
  it('resolves with the callback value', async () => {
    const readValue = (key, callback) => setTimeout(() => callback(null, `value:${key}`), 10);
    const promise = promisify(readValue)('k');
    await vi.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBe('value:k');
  });

  it('rejects with the callback error', async () => {
    const failing = (callback) => setTimeout(() => callback(new Error('nope')), 10);
    const promise = promisify(failing)();
    const assertion = expect(promise).rejects.toThrow('nope');
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });

  it('forwards every argument', async () => {
    const add = (a, b, callback) => callback(null, a + b);
    await expect(promisify(add)(2, 3)).resolves.toBe(5);
  });
});

describe('P8 deferred', () => {
  it('resolves from the outside', async () => {
    const d = deferred();
    d.resolve('later');
    await expect(d.promise).resolves.toBe('later');
  });

  it('rejects from the outside', async () => {
    const d = deferred();
    const assertion = expect(d.promise).rejects.toThrow('bad');
    d.reject(new Error('bad'));
    await assertion;
  });

  it('is still pending before you settle it', async () => {
    const d = deferred();
    const spy = vi.fn();
    d.promise.then(spy);
    await vi.advanceTimersByTimeAsync(1000);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('P9 pollUntil', () => {
  it('returns the first truthy value', async () => {
    let calls = 0;
    const check = vi.fn(async () => {
      calls += 1;
      return calls >= 3 ? `ready after ${calls}` : null;
    });
    const promise = pollUntil(check, { intervalMs: 100, timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toBe('ready after 3');
    expect(check).toHaveBeenCalledTimes(3);
  });

  it('checks immediately, without waiting for the first interval', async () => {
    const check = vi.fn(async () => 'instant');
    const promise = pollUntil(check, { intervalMs: 1000, timeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBe('instant');
  });

  it('times out', async () => {
    const promise = pollUntil(async () => false, { intervalMs: 100, timeoutMs: 250 });
    const assertion = expect(promise).rejects.toThrow('poll timed out');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('propagates an error from check', async () => {
    const promise = pollUntil(
      async () => {
        throw new Error('check exploded');
      },
      { intervalMs: 10, timeoutMs: 100 },
    );
    const assertion = expect(promise).rejects.toThrow('check exploded');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});

describe('P10 abortableDelay', () => {
  it('resolves when nothing aborts', async () => {
    const controller = new AbortController();
    const promise = abortableDelay(100, controller.signal);
    await vi.advanceTimersByTimeAsync(100);
    await expect(promise).resolves.toBe('done');
  });

  it('rejects when aborted mid-flight', async () => {
    const controller = new AbortController();
    const promise = abortableDelay(1000, controller.signal);
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    await assertion;
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const promise = abortableDelay(1000, controller.signal);
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0); // no timer was ever scheduled
  });

  it('rejects with a custom abort reason', async () => {
    const controller = new AbortController();
    const promise = abortableDelay(1000, controller.signal);
    const assertion = expect(promise).rejects.toThrow('user cancelled');
    controller.abort(new Error('user cancelled'));
    await assertion;
  });
});

describe('P11 dedupeInFlight', () => {
  it('shares one call between concurrent identical keys', async () => {
    const fn = vi.fn((key) => delay(100, `value:${key}`));
    const wrapped = dedupeInFlight(fn);

    const a = wrapped('x');
    const b = wrapped('x');
    const c = wrapped('y');
    expect(fn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(100);
    expect(await a).toBe('value:x');
    expect(await b).toBe('value:x');
    expect(await c).toBe('value:y');
  });

  it('runs again after the previous call settled', async () => {
    const fn = vi.fn((key) => delay(100, key));
    const wrapped = dedupeInFlight(fn);
    const first = wrapped('x');
    await vi.advanceTimersByTimeAsync(100);
    await first;

    wrapped('x');
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(100);
  });

  it('does not cache rejections', async () => {
    const fn = vi.fn(async () => {
      throw new Error('fail');
    });
    const wrapped = dedupeInFlight(fn);
    await expect(wrapped('x')).rejects.toThrow('fail');
    await expect(wrapped('x')).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('P12 createSerialQueue', () => {
  it('runs tasks one at a time in order', async () => {
    const queue = createSerialQueue();
    const events = [];
    const task = (name, ms) => async () => {
      events.push(`start:${name}`);
      await delay(ms);
      events.push(`end:${name}`);
      return name;
    };

    const a = queue.add(task('a', 100));
    const b = queue.add(task('b', 10));
    const c = queue.add(task('c', 10));

    await vi.advanceTimersByTimeAsync(1000);
    expect(await Promise.all([a, b, c])).toEqual(['a', 'b', 'c']);
    expect(events).toEqual([
      'start:a',
      'end:a',
      'start:b',
      'end:b',
      'start:c',
      'end:c',
    ]);
  });

  it('keeps running after a task fails', async () => {
    const queue = createSerialQueue();
    const failing = queue.add(async () => {
      throw new Error('boom');
    });
    const assertion = expect(failing).rejects.toThrow('boom');
    const after = queue.add(async () => 'still here');

    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    await expect(after).resolves.toBe('still here');
  });

  it('does not start the second task before the first finishes', async () => {
    const queue = createSerialQueue();
    const started = vi.fn();
    queue.add(() => delay(100));
    queue.add(async () => started());

    await vi.advanceTimersByTimeAsync(50);
    expect(started).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(started).toHaveBeenCalled();
  });
});

describe('P13 eventLoopOrder', () => {
  it('matches what the runtime really does', async () => {
    vi.useRealTimers();
    const logs = [];
    await new Promise((resolve) => {
      logs.push('1');
      setTimeout(() => {
        logs.push('2');
        resolve();
      }, 0);
      Promise.resolve().then(() => logs.push('3'));
      queueMicrotask(() => logs.push('4'));
      logs.push('5');
    });
    expect(eventLoopOrder()).toEqual(logs);
  });
});

describe('P14 saveAllOrReport', () => {
  it('saves in order and resolves when nothing fails', async () => {
    const seen = [];
    const promise = saveAllOrReport([1, 2, 3], async (n) => {
      seen.push(n);
      await delay(10);
      return n * 2;
    });
    await vi.advanceTimersByTimeAsync(100);
    await expect(promise).resolves.toEqual([2, 4, 6]);
    expect(seen).toEqual([1, 2, 3]);
  });

  it('attempts every item even after a failure', async () => {
    const attempted = [];
    const promise = saveAllOrReport([1, 2, 3, 4], async (n) => {
      attempted.push(n);
      if (n % 2 === 0) throw new Error(`bad ${n}`);
      return n;
    });
    const assertion = expect(promise).rejects.toBeInstanceOf(AggregateError);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(attempted).toEqual([1, 2, 3, 4]);
  });

  it('reports every failure in an AggregateError', async () => {
    const promise = saveAllOrReport([1, 2, 3, 4], async (n) => {
      if (n % 2 === 0) throw new Error(`bad ${n}`);
      return n;
    });
    // Attach the handler now, not after advancing: an unhandled rejection
    // between the two would be reported as a test-run error.
    const settled = promise.catch((e) => e);
    await vi.advanceTimersByTimeAsync(100);
    const error = await settled;
    expect(error).toBeInstanceOf(AggregateError);
    expect(error.message).toBe('2 of 4 items failed');
    expect(error.errors.map((e) => e.message)).toEqual(['bad 2', 'bad 4']);
  });

  it('handles an empty list', async () => {
    await expect(saveAllOrReport([], async (x) => x)).resolves.toEqual([]);
  });
});
