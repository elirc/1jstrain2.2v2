/**
 * Per-profile settings: three numbers, each with a default and a range.
 *
 * A profile with no stored row simply has the defaults, so nothing needs
 * backfilling when a profile is created or imported.
 */

import { httpError } from './errors.js';

export const SETTINGS = Object.freeze({
  dailyGoal: { default: 20, min: 1, max: 500, label: 'daily goal (answers)' },
  sessionSize: { default: 12, min: 1, max: 40, label: 'session size' },
  newPerDay: { default: 10, min: 0, max: 100, label: 'new questions per daily session' },
});

export const DEFAULT_SETTINGS = Object.freeze(
  Object.fromEntries(Object.entries(SETTINGS).map(([key, spec]) => [key, spec.default])),
);

/** Stored values over the defaults, ignoring anything unknown or out of range. */
export function withDefaults(stored) {
  const out = { ...DEFAULT_SETTINGS };
  for (const [key, spec] of Object.entries(SETTINGS)) {
    const v = stored?.[key];
    if (Number.isInteger(v) && v >= spec.min && v <= spec.max) out[key] = v;
  }
  return out;
}

/**
 * Validate a partial update. Unknown keys and out-of-range values are a 400
 * naming the field, so the settings form can show the message inline.
 */
export function parseSettingsPatch(body) {
  const patch = {};
  for (const [key, value] of Object.entries(body)) {
    const spec = SETTINGS[key];
    if (!spec) throw httpError(400, 'validation_failed', `Unknown setting "${key}".`, { field: key });
    if (!Number.isInteger(value) || value < spec.min || value > spec.max) {
      throw httpError(400, 'validation_failed', `${key} must be a whole number from ${spec.min} to ${spec.max}.`, {
        field: key,
      });
    }
    patch[key] = value;
  }
  return patch;
}
