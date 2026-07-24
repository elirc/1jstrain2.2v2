/** Reference solutions for MODULE JS-01. */

export function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'number' && Number.isNaN(value)) return 'nan';
  return typeof value;
}

export function isSameValue(a, b) {
  if (a === b) {
    // Distinguish +0 from -0: they are === but 1/+0 !== 1/-0.
    if (a === 0) return 1 / a === 1 / b;
    return true;
  }
  // The only value not equal to itself is NaN.
  return a !== a && b !== b;
}

export function compareBoth(a, b) {
  // eslint-disable-next-line eqeqeq
  return { loose: a == b, strict: a === b };
}

export function toNumberOrNull(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function safeDivide(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  const result = a / b;
  return Number.isFinite(result) ? result : null;
}

export function truthyOnly(values) {
  return values.filter(Boolean);
}

export function defaultTo(value, fallback) {
  return value === null || value === undefined ? fallback : value;
}

export function clamp(n, min, max) {
  if (min > max) throw new RangeError('min must be <= max');
  return Math.min(Math.max(n, min), max);
}

export function roundTo(n, decimals) {
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  // Shift the decimal point with exponent notation instead of multiplying,
  // which avoids the 1.005 * 100 === 100.49999999999999 problem.
  const shifted = Math.round(Number(`${abs}e${decimals}`));
  return sign * Number(`${shifted}e-${decimals}`);
}

export function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (Math.abs(value) >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = Math.round(value * 10) / 10;
  // String(1) is '1', String(1.5) is '1.5' — no trailing '.0' to strip.
  return `${rounded} ${units[unit]}`;
}

export function describeNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'not a number';
  if (value === 0) return 'zero';
  return value < 0 ? 'negative' : 'positive';
}

export function sameFormValue(submitted, original) {
  if (original === null || original === undefined) return submitted === '';
  if (typeof original === 'number') {
    const n = toNumberOrNull(submitted);
    return n !== null && n === original;
  }
  if (typeof original === 'boolean') {
    return submitted === String(original);
  }
  return submitted === original;
}
