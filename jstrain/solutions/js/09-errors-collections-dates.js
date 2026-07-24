/** Reference solutions for MODULE JS-09. */

export class ValidationError extends Error {
  constructor(message, field, code = 'invalid') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

function toError(thrown) {
  return thrown instanceof Error ? thrown : new Error(String(thrown));
}

export function attempt(fn) {
  try {
    return { ok: true, value: fn() };
  } catch (thrown) {
    return { ok: false, error: toError(thrown) };
  }
}

export async function attemptAsync(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (thrown) {
    return { ok: false, error: toError(thrown) };
  }
}

export function parseJson(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function withCleanup(fn, cleanup) {
  try {
    return fn();
  } finally {
    cleanup();
  }
}

export function rethrowAs(fn, message) {
  try {
    return fn();
  } catch (error) {
    throw new Error(message, { cause: error });
  }
}

export function groupErrorsByField(errors) {
  const out = {};
  for (const error of errors) {
    const key = error instanceof ValidationError ? error.field : '_';
    (out[key] ??= []).push(error.message);
  }
  return out;
}

export class LRUCache {
  #capacity;
  #map = new Map();

  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError('capacity must be >= 1');
    }
    this.#capacity = capacity;
  }

  get(key) {
    if (!this.#map.has(key)) return undefined;
    const value = this.#map.get(key);
    // Re-insert to move the key to the newest position.
    this.#map.delete(key);
    this.#map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.#map.has(key)) this.#map.delete(key);
    this.#map.set(key, value);
    if (this.#map.size > this.#capacity) {
      const oldest = this.#map.keys().next().value;
      this.#map.delete(oldest);
    }
    return this;
  }

  has(key) {
    return this.#map.has(key);
  }

  delete(key) {
    return this.#map.delete(key);
  }

  get size() {
    return this.#map.size;
  }

  keys() {
    return [...this.#map.keys()];
  }
}

export function containsAll(haystack, needles) {
  const set = haystack instanceof Set ? haystack : new Set(haystack);
  for (const needle of needles) {
    if (!set.has(needle)) return false;
  }
  return true;
}

export function createRegistry() {
  const store = new WeakMap();
  return {
    set(obj, meta) {
      store.set(obj, meta);
    },
    get(obj) {
      return store.get(obj);
    },
    has(obj) {
      return store.has(obj);
    },
    delete(obj) {
      return store.delete(obj);
    },
  };
}

export function formatDateUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function utcMidnight(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function daysBetween(a, b) {
  return Math.round((utcMidnight(b) - utcMidnight(a)) / MS_PER_DAY);
}

function plural(n, unit) {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

export function relativeTime(date, now) {
  const diffMs = now.getTime() - date.getTime();
  const past = diffMs >= 0;
  const seconds = Math.floor(Math.abs(diffMs) / 1000);

  if (seconds < 60) return 'just now';

  const say = (n, unit) => (past ? `${plural(n, unit)} ago` : `in ${plural(n, unit)}`);

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return say(minutes, 'minute');

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return say(hours, 'hour');

  const days = Math.floor(hours / 24);
  if (days < 30) return say(days, 'day');

  return formatDateUTC(date);
}

export function countByDay(timestamps) {
  const counts = new Map();
  for (const timestamp of timestamps) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) continue;
    const day = formatDateUTC(date);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return new Map([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}
