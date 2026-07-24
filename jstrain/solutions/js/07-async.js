/** Reference solutions for MODULE JS-07. */

export function delay(ms, value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

export async function loadSequential(ids, load) {
  const out = [];
  for (const id of ids) {
    out.push(await load(id));
  }
  return out;
}

export async function loadParallel(ids, load) {
  // .map starts every call immediately; Promise.all keeps input order.
  return Promise.all(ids.map((id) => load(id)));
}

export async function settleAll(promises) {
  const results = await Promise.allSettled(promises);
  const fulfilled = [];
  const rejected = [];
  for (const result of results) {
    if (result.status === 'fulfilled') fulfilled.push(result.value);
    else rejected.push(result.reason);
  }
  return { fulfilled, rejected };
}

export function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function retry(fn, { attempts = 3, delayMs = 100, factor = 2 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay(delayMs * factor ** (attempt - 1));
      }
    }
  }
  throw lastError;
}

export async function mapWithConcurrency(items, fn, limit) {
  const results = new Array(items.length);
  let cursor = 0;

  // `limit` workers pull from a shared cursor until the list is exhausted.
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  };

  const size = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}

export function promisify(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export async function pollUntil(check, { intervalMs = 100, timeoutMs = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() + intervalMs > deadline) throw new Error('poll timed out');
    await delay(intervalMs);
  }
}

export function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve('done');
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function dedupeInFlight(fn) {
  const inFlight = new Map();
  return (key) => {
    const existing = inFlight.get(key);
    if (existing) return existing;
    const promise = fn(key).finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, promise);
    return promise;
  };
}

export function createSerialQueue() {
  // Every task chains onto the tail, so only one runs at a time. The `catch`
  // keeps a failed task from poisoning the chain for the next one.
  let tail = Promise.resolve();
  return {
    add(task) {
      const result = tail.then(task);
      tail = result.catch(() => {});
      return result;
    },
  };
}

export function eventLoopOrder() {
  return ['1', '5', '3', '4', '2'];
}

export async function saveAllOrReport(items, save) {
  const values = [];
  const errors = [];
  for (const item of items) {
    try {
      values.push(await save(item));
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, `${errors.length} of ${items.length} items failed`);
  }
  return values;
}
