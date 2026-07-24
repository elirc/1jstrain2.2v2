/** Reference solutions for MODULE JS-04. */

export function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (Object.hasOwn(obj, key)) out[key] = obj[key];
  }
  return out;
}

export function omit(obj, keys) {
  const drop = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !drop.has(key)));
}

export function mapValues(obj, fn) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value, key)]));
}

export function invert(obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [String(value), key]));
}

export function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map((item) => deepClone(item));
  const out = {};
  for (const [key, item] of Object.entries(value)) out[key] = deepClone(item);
  return out;
}

export function deepMerge(target, source) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** 'a.b[0].c' -> ['a', 'b', '0', 'c'] */
function parsePath(path) {
  return path
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment !== '');
}

export function getPath(obj, path, fallback) {
  let current = obj;
  for (const key of parsePath(path)) {
    if (current === null || current === undefined) return fallback;
    if (typeof current !== 'object') return fallback;
    if (!Object.hasOwn(current, key)) return fallback;
    current = current[key];
  }
  return current;
}

export function setPath(obj, path, value) {
  const [head, ...rest] = parsePath(path);
  if (head === undefined) return obj;

  // Copy only the container we are about to touch; siblings stay shared.
  const container = Array.isArray(obj) ? [...obj] : { ...obj };

  if (rest.length === 0) {
    container[head] = value;
    return container;
  }

  const existing = container[head];
  const nextIsIndex = /^\d+$/.test(rest[0]);
  const base = existing !== null && typeof existing === 'object' ? existing : nextIsIndex ? [] : {};
  container[head] = setPath(base, rest.join('.'), value);
  return container;
}

export function deepFreeze(obj) {
  const seen = new WeakSet();
  const walk = (value) => {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return value;
    seen.add(value);
    Object.freeze(value);
    for (const key of Object.getOwnPropertyNames(value)) walk(value[key]);
    return value;
  };
  return walk(obj);
}

export function renameKeys(obj, mapping) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [mapping[key] ?? key, value]),
  );
}

export function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function flattenKeys(obj, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      Object.assign(out, flattenKeys(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

export function normalizeById(records) {
  const byId = {};
  const ids = [];
  for (const record of records) {
    if (!Object.hasOwn(byId, record.id)) ids.push(record.id);
    byId[record.id] = record;
  }
  return { byId, ids };
}

export function diffObjects(before, after) {
  const added = Object.keys(after).filter((key) => !Object.hasOwn(before, key));
  const removed = Object.keys(before).filter((key) => !Object.hasOwn(after, key));
  const changed = {};
  for (const key of Object.keys(before)) {
    if (Object.hasOwn(after, key) && !Object.is(before[key], after[key])) {
      changed[key] = { from: before[key], to: after[key] };
    }
  }
  return { added, removed, changed };
}
