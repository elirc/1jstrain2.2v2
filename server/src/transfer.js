/**
 * Profile export and import.
 *
 * An export is the learner's backup and their way to move machines. An import
 * always creates a *new* profile, never merges into an existing one, and is
 * validated line by line: the file is user-supplied input like any other body,
 * it just happens to be large. Rows for questions that no longer exist in the
 * content are skipped and reported rather than stored as orphans.
 */

import { getQuestion } from '@jstrain/content';
import { httpError } from './errors.js';
import { sanitiseElapsed } from './answer.js';
import { parseSettingsPatch, withDefaults } from './settings.js';
import { str } from './validate.js';

export const EXPORT_FORMAT = 'stack-ready-profile';
export const EXPORT_VERSION = 1;
const MAX_NOTE = 500;

/** The export document for one profile. Ids local to this install are left out. */
export function buildExport(store, profile, now = new Date()) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    profile: { name: profile.name, createdAt: profile.createdAt },
    settings: withDefaults(store.getSettings(profile.id)),
    cardStates: store.listCardStates(profile.id).map(({ profileId, ...card }) => card),
    attempts: store.listAttempts(profile.id).map(({ id, ...attempt }) => attempt),
    flags: store.listFlags(profile.id),
  };
}

/** `Content-Disposition` filename: ASCII only, so no header encoding games. */
export function exportFilename(name) {
  const slug = String(name)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `stack-ready-${slug || 'profile'}.json`;
}

const fail = (field, message) => httpError(400, 'validation_failed', message, { field });
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonNegInt = (v) => Number.isInteger(v) && v >= 0;

function iso(value, field, { nullable = false } = {}) {
  if (value === null && nullable) return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw fail(field, `${field} must be an ISO date.`);
  return new Date(value).toISOString();
}

function list(doc, key) {
  const value = doc[key] ?? [];
  if (!Array.isArray(value)) throw fail(key, `${key} must be an array.`);
  return value;
}

/**
 * Validate an import body and turn it into the snapshot `store.importProfile()`
 * takes. Throws `400 validation_failed` naming the first bad field.
 *
 * @returns {{ snapshot: { name: string, settings: object, cardStates: any[], attempts: any[], flags: any[] },
 *             skipped: { unknownQuestionIds: string[] } }}
 */
export function parseImport(body) {
  if (!isObj(body)) throw fail('body', 'The import must be a JSON object.');
  if (body.format !== EXPORT_FORMAT) {
    throw fail('format', `This is not a Stack Ready profile export (format must be "${EXPORT_FORMAT}").`);
  }
  if (body.version !== EXPORT_VERSION) {
    throw fail(
      'version',
      `Unsupported export version ${JSON.stringify(body.version)}; this build reads version ${EXPORT_VERSION}.`,
    );
  }

  const unknown = new Set();
  const known = (questionId, field) => {
    if (typeof questionId !== 'string' || !questionId) throw fail(field, `${field} must be a question id.`);
    if (getQuestion(questionId)) return true;
    unknown.add(questionId);
    return false;
  };

  const name = importName(body);

  let settings = withDefaults(null);
  if (body.settings !== undefined && body.settings !== null) {
    if (!isObj(body.settings)) throw fail('settings', 'settings must be an object.');
    settings = withDefaults({ ...settings, ...parseSettingsPatch(body.settings) });
  }

  const cardStates = [];
  list(body, 'cardStates').forEach((c, i) => {
    const at = `cardStates[${i}]`;
    if (!isObj(c)) throw fail(at, `${at} must be an object.`);
    if (!known(c.questionId, `${at}.questionId`)) return;
    for (const key of ['reps', 'lapses', 'attempts', 'correct']) {
      if (!nonNegInt(c[key])) throw fail(`${at}.${key}`, `${at}.${key} must be a whole number ≥ 0.`);
    }
    if (c.correct > c.attempts) throw fail(`${at}.correct`, `${at}.correct cannot exceed attempts.`);
    if (!(Number.isFinite(c.ease) && c.ease > 0)) throw fail(`${at}.ease`, `${at}.ease must be a positive number.`);
    if (!(Number.isFinite(c.intervalDays) && c.intervalDays >= 0)) {
      throw fail(`${at}.intervalDays`, `${at}.intervalDays must be a number ≥ 0.`);
    }
    cardStates.push({
      questionId: c.questionId,
      reps: c.reps,
      lapses: c.lapses,
      ease: c.ease,
      intervalDays: c.intervalDays,
      dueAt: iso(c.dueAt, `${at}.dueAt`),
      attempts: c.attempts,
      correct: c.correct,
      lastAnsweredAt: iso(c.lastAnsweredAt ?? null, `${at}.lastAnsweredAt`, { nullable: true }),
    });
  });

  const attempts = [];
  list(body, 'attempts').forEach((a, i) => {
    const at = `attempts[${i}]`;
    if (!isObj(a)) throw fail(at, `${at} must be an object.`);
    if (!known(a.questionId, `${at}.questionId`)) return;
    if (typeof a.correct !== 'boolean') throw fail(`${at}.correct`, `${at}.correct must be true or false.`);
    if (a.gaveUp !== undefined && typeof a.gaveUp !== 'boolean') {
      throw fail(`${at}.gaveUp`, `${at}.gaveUp must be true or false.`);
    }
    // Module and track come from the content, not the file: the file may be
    // from before a question moved.
    const question = getQuestion(a.questionId);
    attempts.push({
      questionId: question.id,
      moduleId: question.moduleId,
      trackId: question.trackId,
      correct: a.correct,
      gaveUp: a.gaveUp ?? false,
      elapsedMs: sanitiseElapsed(a.elapsedMs),
      answeredAt: iso(a.answeredAt, `${at}.answeredAt`),
    });
  });
  // Chronological insert order keeps attempt ids in time order, which is what
  // the /api/attempts cursor relies on.
  attempts.sort((x, y) => x.answeredAt.localeCompare(y.answeredAt));

  const flags = [];
  list(body, 'flags').forEach((f, i) => {
    const at = `flags[${i}]`;
    if (!isObj(f)) throw fail(at, `${at} must be an object.`);
    if (!known(f.questionId, `${at}.questionId`)) return;
    const note = f.note ?? '';
    if (typeof note !== 'string' || [...note].length > MAX_NOTE) {
      throw fail(`${at}.note`, `${at}.note must be text of ${MAX_NOTE} characters or fewer.`);
    }
    flags.push({ questionId: f.questionId, note, createdAt: iso(f.createdAt, `${at}.createdAt`) });
  });

  return {
    snapshot: { name, settings, cardStates, attempts, flags },
    skipped: { unknownQuestionIds: [...unknown].sort() },
  };
}

/** `name` in the body wins; then the exported profile's name; then a default. */
function importName(body) {
  const given = str(body.name, 'name', { max: 40, optional: true });
  if (given !== undefined) return given;
  const exported = typeof body.profile?.name === 'string' ? body.profile.name.trim() : '';
  // eslint-disable-next-line no-control-regex
  if (exported && [...exported].length <= 40 && !/[\u0000-\u001f\u007f]/.test(exported)) return exported;
  return 'Imported profile';
}
