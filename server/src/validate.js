/**
 * Validation at the boundary.
 *
 * Four small helpers rather than a schema library: five routes do not justify a
 * mini-zod, and every failure has the same shape —
 * `400 validation_failed` with `details.field` naming the offending field, so
 * the client can put the message next to the right input.
 */

import { httpError } from './errors.js';

function fail(field, message) {
  return httpError(400, 'validation_failed', message, { field });
}

/** The request body must be a plain JSON object (not an array, not a string). */
export function obj(body, field = 'body') {
  if (body === undefined) return {};
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw fail(field, `${field} must be a JSON object.`);
  }
  return body;
}

/**
 * A string, trimmed. `optional` lets `undefined` (and `null`) through as
 * `undefined`. Length is counted in code points, not UTF-16 units, so an emoji
 * is one character like the learner expects.
 */
export function str(value, field, { min = 1, max = 200, optional = false, trim = true, controlChars = false } = {}) {
  if (value === undefined || value === null) {
    if (optional) return undefined;
    throw fail(field, `${field} is required.`);
  }
  if (typeof value !== 'string') throw fail(field, `${field} must be a string.`);
  const out = trim ? value.trim() : value;
  const length = [...out].length;
  if (length < min)
    throw fail(field, min === 1 ? `${field} must not be empty.` : `${field} must be at least ${min} characters.`);
  if (length > max) throw fail(field, `${field} must be ${max} characters or fewer.`);
  // eslint-disable-next-line no-control-regex
  if (!controlChars && /[\u0000-\u001f\u007f]/.test(out))
    throw fail(field, `${field} must not contain control characters.`);
  return out;
}

/** An integer in [min, max]. `optional` lets `undefined` and `null` through as `undefined`. */
export function int(value, field, { min = -Infinity, max = Infinity, optional = false } = {}) {
  if (value === undefined || value === null) {
    if (optional) return undefined;
    throw fail(field, `${field} is required.`);
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    const range =
      min !== -Infinity && max !== Infinity
        ? `from ${min} to ${max}`
        : min !== -Infinity
          ? `of at least ${min}`
          : max !== Infinity
            ? `of at most ${max}`
            : '';
    throw fail(field, `${field} must be a whole number${range ? ` ${range}` : ''}.`);
  }
  return value;
}

/** One of a fixed list. */
export function oneOf(value, field, list, { optional = false } = {}) {
  if (value === undefined || value === null) {
    if (optional) return undefined;
    throw fail(field, `${field} is required.`);
  }
  if (!list.includes(value)) throw fail(field, `${field} must be one of: ${list.join(', ')}.`);
  return value;
}

/**
 * Query strings arrive as text; turn `"50"` into 50 before `int()` sees it.
 * Anything that is not a plain decimal integer stays as-is and fails `int()`.
 */
export function queryInt(value) {
  if (typeof value !== 'string') return value;
  return /^-?\d+$/.test(value) ? Number(value) : value;
}
