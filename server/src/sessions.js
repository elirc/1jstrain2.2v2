/**
 * Choosing what to ask next.
 *
 * Every mode returns questions with the answer key stripped and the choices
 * shuffled. The ordering rules are deliberately simple and explainable — a
 * learner should be able to tell why a question appeared, so each one carries a
 * `reason`:
 * - `due`      a scheduled review whose time has come
 * - `relearn`  a card you got wrong, back after its 10-minute pause
 * - `new`      never answered
 * - `practice` not due; a correct answer counts but does not move the schedule
 */

import { curriculum, questionsByModule } from '@jstrain/content';
import { httpError } from './errors.js';
import { presentQuestion } from './present.js';
import { isDue, isMastered } from './srs.js';
import { emptyCardState } from './store.js';
import { DEFAULT_SETTINGS } from './settings.js';

export const MODES = ['module', 'review', 'daily', 'stage', 'track', 'weak', 'flagged'];

export const MIN_LIMIT = 1;
export const MAX_LIMIT = 40;

/** `weak` means "keeps going wrong", not "missed once": that is what `review` is for. */
const WEAK_MIN_ATTEMPTS = 2;
const WEAK_ACCURACY = 0.75;

/**
 * @param {object} params
 * @param {any} params.store
 * @param {string} params.profileId
 * @param {string} params.mode
 * @param {string} [params.moduleId]
 * @param {string} [params.stageId]
 * @param {string} [params.trackId]
 * @param {number} [params.size]       already validated (1..40)
 * @param {number} [params.newPerDay]  the profile's setting
 * @param {Date} [params.now]
 * @param {() => number} [params.rng]
 */
export function buildSession({
  store,
  profileId,
  mode = 'daily',
  moduleId,
  stageId,
  trackId,
  size = DEFAULT_SETTINGS.sessionSize,
  newPerDay = DEFAULT_SETTINGS.newPerDay,
  now = new Date(),
  rng = Math.random,
}) {
  const states = new Map(store.listCardStates(profileId).map((s) => [s.questionId, s]));
  const stateOf = (id) => states.get(id) ?? emptyCardState(profileId, id);

  // `scope` is every question this session could ever draw from; `pool` is the
  // subset the mode selects. `nextDueAt` looks at the scope, so an empty
  // review session can still say when the next review is.
  let scope = curriculum.questions;
  let pool;
  switch (mode) {
    case 'module': {
      if (!moduleId)
        throw httpError(400, 'validation_failed', 'moduleId is required for a module session.', { field: 'moduleId' });
      scope = pool = questionsByModule(moduleId);
      if (pool.length === 0) throw httpError(404, 'not_found', `No such module: ${moduleId}.`);
      break;
    }
    case 'stage': {
      if (!stageId)
        throw httpError(400, 'validation_failed', 'stageId is required for a stage session.', { field: 'stageId' });
      const stage = curriculum.stages.find((s) => s.id === stageId);
      if (!stage) throw httpError(404, 'not_found', `No such stage: ${stageId}.`);
      scope = pool = stage.modules.flatMap((id) => questionsByModule(id));
      break;
    }
    case 'track': {
      if (!trackId)
        throw httpError(400, 'validation_failed', 'trackId is required for a track session.', { field: 'trackId' });
      if (!curriculum.tracks.some((t) => t.id === trackId))
        throw httpError(404, 'not_found', `No such track: ${trackId}.`);
      scope = pool = curriculum.questions.filter((q) => q.trackId === trackId);
      break;
    }
    case 'review': {
      pool = curriculum.questions.filter((q) => isDue(stateOf(q.id), now));
      break;
    }
    case 'weak': {
      pool = curriculum.questions.filter((q) => {
        const s = stateOf(q.id);
        return s.attempts >= WEAK_MIN_ATTEMPTS && s.correct / s.attempts < WEAK_ACCURACY;
      });
      break;
    }
    case 'flagged': {
      // Newest flag first, and only questions that still exist in the content.
      const byId = new Map(curriculum.questions.map((q) => [q.id, q]));
      pool = store
        .listFlags(profileId)
        .map((f) => byId.get(f.questionId))
        .filter(Boolean);
      break;
    }
    case 'daily':
    default: {
      pool = curriculum.questions;
      break;
    }
  }

  let selected;
  if (mode === 'daily') selected = pickDaily(pool, stateOf, size, newPerDay, now);
  else if (mode === 'review') selected = byDueAt(pool, stateOf).slice(0, size);
  else if (mode === 'weak') selected = byAccuracy(pool, stateOf).slice(0, size);
  else if (mode === 'flagged') selected = pool.slice(0, size);
  else selected = pickOrdered(pool, stateOf, size, now);

  const questions = selected.map((q) => ({
    ...presentQuestion(q, rng),
    reason: reasonFor(stateOf(q.id), now),
  }));

  return {
    mode,
    moduleId: moduleId ?? null,
    stageId: stageId ?? null,
    trackId: trackId ?? null,
    requested: size,
    available: pool.length,
    questions,
    ...(questions.length === 0 ? { empty: true } : {}),
    nextDueAt: nextDueAt(scope, stateOf, now),
  };
}

export function reasonFor(state, now) {
  if (state.attempts === 0) return 'new';
  if (isDue(state, now)) return state.reps === 0 ? 'relearn' : 'due';
  return 'practice';
}

/** The earliest review still in the future, or null. */
function nextDueAt(scope, stateOf, now) {
  let next = null;
  for (const q of scope) {
    const s = stateOf(q.id);
    if (s.attempts > 0 && new Date(s.dueAt) > now && (next === null || s.dueAt < next)) next = s.dueAt;
  }
  return next;
}

/**
 * The daily mix. Reviews come first, most overdue first, because an unreviewed
 * backlog is the thing spaced repetition exists to prevent — but a few places
 * are reserved for new material so a big backlog cannot freeze progress:
 *
 *   reserve = min(unseen, max(1, min(newPerDay, floor(size / 4))))
 *
 * Due cards fill everything but the reserve, so any due card left over after
 * that has no room anyway. Room that is left (few due cards) goes to more new
 * cards up to newPerDay, then unmastered cards, then mastered cards, soonest
 * due first. newPerDay is a real cap: a fresh profile with nothing to review
 * gets a session of newPerDay questions, and the response says so through
 * `requested` vs the number returned. A question never appears twice.
 */
function pickDaily(pool, stateOf, size, newPerDay, now) {
  const due = byDueAt(
    pool.filter((q) => isDue(stateOf(q.id), now)),
    stateOf,
  );
  const unseen = inCurriculumOrder(pool.filter((q) => stateOf(q.id).attempts === 0));
  const reserve = Math.min(unseen.length, Math.max(1, Math.min(newPerDay, Math.floor(size / 4))));
  const newCap = Math.max(reserve, newPerDay);

  const out = [];
  const taken = new Set();
  const take = (q) => {
    if (out.length < size && !taken.has(q.id)) {
      out.push(q);
      taken.add(q.id);
    }
  };

  for (const q of due.slice(0, size - reserve)) take(q);
  for (const q of unseen.slice(0, reserve)) take(q);
  for (const q of unseen.slice(0, newCap)) take(q);

  const seenNotDue = pool.filter((q) => {
    const s = stateOf(q.id);
    return s.attempts > 0 && !isDue(s, now);
  });
  for (const q of byDueAt(
    seenNotDue.filter((q) => !isMastered(stateOf(q.id))),
    stateOf,
  ))
    take(q);
  for (const q of byDueAt(
    seenNotDue.filter((q) => isMastered(stateOf(q.id))),
    stateOf,
  ))
    take(q);
  return out;
}

/**
 * A targeted session (module, stage, track): due first, then unseen questions
 * easiest first, then unmastered practice, then — so a nearly finished module
 * still gives a full round — mastered cards, soonest due first.
 */
function pickOrdered(pool, stateOf, size, now) {
  const due = [];
  const unseen = [];
  const rest = [];
  const mastered = [];
  for (const q of pool) {
    const s = stateOf(q.id);
    if (isDue(s, now)) due.push(q);
    else if (s.attempts === 0) unseen.push(q);
    else if (!isMastered(s)) rest.push(q);
    else mastered.push(q);
  }
  // Array.prototype.sort is stable, so equal difficulty keeps authored order.
  unseen.sort((a, b) => a.difficulty - b.difficulty);
  return [...byDueAt(due, stateOf), ...unseen, ...byDueAt(rest, stateOf), ...byDueAt(mastered, stateOf)].slice(0, size);
}

function byDueAt(questions, stateOf) {
  return [...questions].sort((a, b) => stateOf(a.id).dueAt.localeCompare(stateOf(b.id).dueAt));
}

function byAccuracy(questions, stateOf) {
  const acc = (q) => stateOf(q.id).correct / stateOf(q.id).attempts;
  return [...questions].sort((a, b) => acc(a) - acc(b) || stateOf(a.id).dueAt.localeCompare(stateOf(b.id).dueAt));
}

function inCurriculumOrder(questions) {
  const order = new Map();
  curriculum.stages.forEach((stage, si) => stage.modules.forEach((moduleId, mi) => order.set(moduleId, si * 100 + mi)));
  return [...questions].sort((a, b) => {
    const byModule = (order.get(a.moduleId) ?? 1e9) - (order.get(b.moduleId) ?? 1e9);
    return byModule !== 0 ? byModule : a.difficulty - b.difficulty;
  });
}
