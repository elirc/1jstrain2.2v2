/**
 * Choosing what to ask next.
 *
 * Every mode returns questions with the answer key stripped. The ordering rules
 * are deliberately simple and explainable — a learner should be able to tell
 * why a question appeared.
 */

import { curriculum, publicQuestion, questionsByModule } from '@jstrain/content';
import { isDue, isMastered } from './srs.js';
import { emptyCardState } from './store.js';

export const MODES = ['module', 'review', 'daily', 'stage', 'track', 'weak'];

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 40;

/**
 * @param {object} params
 * @param {ReturnType<typeof import('./store.js').createStore> extends Promise<infer S> ? S : never} params.store
 */
export function buildSession({ store, profileId, mode, moduleId, stageId, trackId, limit, now = new Date() }) {
  const size = clamp(Number(limit) || DEFAULT_LIMIT, 1, MAX_LIMIT);
  const states = new Map(store.listCardStates(profileId).map((s) => [s.questionId, s]));
  const stateOf = (id) => states.get(id) ?? emptyCardState(profileId, id);

  let pool;
  switch (mode) {
    case 'module': {
      if (!moduleId) throw badRequest('moduleId is required for a module session');
      pool = questionsByModule(moduleId);
      if (pool.length === 0) throw badRequest(`unknown module: ${moduleId}`);
      break;
    }
    case 'stage': {
      const stage = curriculum.stages.find((s) => s.id === stageId);
      if (!stage) throw badRequest(`unknown stage: ${stageId}`);
      pool = stage.modules.flatMap((id) => questionsByModule(id));
      break;
    }
    case 'track': {
      pool = curriculum.questions.filter((q) => q.trackId === trackId);
      if (pool.length === 0) throw badRequest(`unknown track: ${trackId}`);
      break;
    }
    case 'review': {
      pool = curriculum.questions.filter((q) => isDue(stateOf(q.id), now));
      break;
    }
    case 'weak': {
      pool = curriculum.questions.filter((q) => {
        const s = stateOf(q.id);
        return s.attempts > 0 && s.correct / s.attempts < 0.75;
      });
      break;
    }
    case 'daily':
    default: {
      pool = curriculum.questions;
      break;
    }
  }

  const selected =
    mode === 'daily' ? pickDaily(pool, stateOf, size, now) : pickOrdered(pool, stateOf, size, mode, now);

  return {
    mode: mode ?? 'daily',
    moduleId: moduleId ?? null,
    stageId: stageId ?? null,
    trackId: trackId ?? null,
    requested: size,
    available: pool.length,
    questions: selected.map(publicQuestion),
  };
}

/**
 * A daily mix: due reviews first (they are the whole point of spacing), then
 * unseen questions from the earliest stage still incomplete, then anything
 * previously answered wrongly.
 */
function pickDaily(pool, stateOf, size, now) {
  const due = pool.filter((q) => isDue(stateOf(q.id), now));
  const unseen = inCurriculumOrder(pool.filter((q) => stateOf(q.id).attempts === 0));
  const shaky = pool.filter((q) => {
    const s = stateOf(q.id);
    return s.attempts > 0 && !isMastered(s) && !isDue(s, now);
  });

  const reviewShare = Math.min(due.length, Math.ceil(size * 0.5));
  const out = [...shuffle(due).slice(0, reviewShare)];
  for (const q of unseen) {
    if (out.length >= size) break;
    out.push(q);
  }
  for (const q of shuffle(shaky)) {
    if (out.length >= size) break;
    out.push(q);
  }
  for (const q of shuffle(due).slice(reviewShare)) {
    if (out.length >= size) break;
    out.push(q);
  }
  return out.slice(0, size);
}

/**
 * For a targeted session, lead with what is due, then unseen questions easiest
 * first, then the rest — so a module session starts where the learner is.
 */
function pickOrdered(pool, stateOf, size, mode, now) {
  if (mode === 'review' || mode === 'weak') return shuffle(pool).slice(0, size);

  const due = [];
  const unseen = [];
  const rest = [];
  for (const q of pool) {
    const s = stateOf(q.id);
    if (isDue(s, now)) due.push(q);
    else if (s.attempts === 0) unseen.push(q);
    else if (!isMastered(s)) rest.push(q);
  }
  unseen.sort((a, b) => a.difficulty - b.difficulty);
  const ordered = [...due, ...unseen, ...rest];
  // If everything is mastered, still allow practice rather than an empty set.
  return (ordered.length ? ordered : shuffle(pool)).slice(0, size);
}

function inCurriculumOrder(questions) {
  const order = new Map();
  curriculum.stages.forEach((stage, si) =>
    stage.modules.forEach((moduleId, mi) => order.set(moduleId, si * 100 + mi)),
  );
  return [...questions].sort((a, b) => {
    const byModule = (order.get(a.moduleId) ?? 999) - (order.get(b.moduleId) ?? 999);
    return byModule !== 0 ? byModule : a.difficulty - b.difficulty;
  });
}

function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = 'bad_request';
  return err;
}
