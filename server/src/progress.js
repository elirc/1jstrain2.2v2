/**
 * Turning raw card states and attempts into the numbers the dashboard shows:
 * per-module mastery, per-track accuracy, stage unlocking, streaks and level.
 */

import { curriculum, questionsByModule } from '@jstrain/content';
import { isDue, isMastered, levelFor, replayXp } from './srs.js';
import { emptyCardState } from './store.js';
import { DEFAULT_SETTINGS } from './settings.js';

/** How far back the activity heatmap looks. XP is not windowed. */
const ACTIVITY_DAYS = 365;

/** Local calendar day (not UTC) so a streak matches what the learner experienced. */
export function localDayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * @param {any} store
 * @param {string} profileId
 * @param {{ now?: Date, settings?: { dailyGoal: number } }} [options]
 */
export function buildProgress(store, profileId, { now = new Date(), settings = DEFAULT_SETTINGS } = {}) {
  const states = new Map(store.listCardStates(profileId).map((s) => [s.questionId, s]));
  const stateOf = (id) => states.get(id) ?? emptyCardState(profileId, id);

  let nextDueAt = null;
  const moduleStats = curriculum.modules.map((module) => {
    const questions = questionsByModule(module.id);
    let seen = 0;
    let mastered = 0;
    let due = 0;
    let attempts = 0;
    let correct = 0;

    for (const question of questions) {
      const state = stateOf(question.id);
      attempts += state.attempts;
      correct += state.correct;
      if (state.attempts > 0) seen += 1;
      if (isMastered(state)) mastered += 1;
      if (isDue(state, now)) due += 1;
      else if (state.attempts > 0 && (nextDueAt === null || state.dueAt < nextDueAt)) nextDueAt = state.dueAt;
    }

    return {
      moduleId: module.id,
      trackId: module.trackId,
      total: questions.length,
      seen,
      mastered,
      due,
      attempts,
      correct,
      accuracy: attempts ? correct / attempts : null,
      mastery: questions.length ? mastered / questions.length : 0,
    };
  });

  const byModuleId = new Map(moduleStats.map((m) => [m.moduleId, m]));

  const stageMastery = new Map();
  const stageRows = curriculum.stages.map((stage) => {
    const mods = stage.modules.map((id) => byModuleId.get(id)).filter(Boolean);
    const total = mods.reduce((n, m) => n + m.total, 0);
    const mastered = mods.reduce((n, m) => n + m.mastered, 0);
    const row = {
      stageId: stage.id,
      total,
      seen: mods.reduce((n, m) => n + m.seen, 0),
      mastered,
      due: mods.reduce((n, m) => n + m.due, 0),
      mastery: total ? mastered / total : 0,
    };
    stageMastery.set(stage.id, row.mastery);
    return row;
  });

  // A stage unlocks once the stage it builds on — `stage.after` when the
  // content names one, otherwise the previous stage in the list — reaches its
  // `unlockAt` mastery. The first stage (with no `after`) is always open, and
  // a stage you have already worked in stays open.
  const stageStats = stageRows.map((row, i) => {
    const stage = curriculum.stages[i];
    const gateId = stage.after && stageMastery.has(stage.after) ? stage.after : (curriculum.stages[i - 1]?.id ?? null);
    const gateMastery = gateId === null ? 1 : stageMastery.get(gateId);
    return {
      ...row,
      gateStageId: gateId,
      unlocked: gateMastery >= stage.unlockAt || row.seen > 0,
    };
  });

  const trackStats = curriculum.tracks.map((track) => {
    const mods = moduleStats.filter((m) => m.trackId === track.id);
    const total = mods.reduce((n, m) => n + m.total, 0);
    const mastered = mods.reduce((n, m) => n + m.mastered, 0);
    const attempts = mods.reduce((n, m) => n + m.attempts, 0);
    const correct = mods.reduce((n, m) => n + m.correct, 0);
    return {
      trackId: track.id,
      total,
      mastered,
      attempts,
      mastery: total ? mastered / total : 0,
      accuracy: attempts ? correct / attempts : null,
    };
  });

  // Numerator and denominator come from the same loop over *current* content,
  // so card states for renamed or deleted questions cannot push this over 1.
  const totals = {
    questions: curriculum.questions.length,
    seen: moduleStats.reduce((n, m) => n + m.seen, 0),
    mastered: moduleStats.reduce((n, m) => n + m.mastered, 0),
    due: moduleStats.reduce((n, m) => n + m.due, 0),
    attempts: moduleStats.reduce((n, m) => n + m.attempts, 0),
    correct: moduleStats.reduce((n, m) => n + m.correct, 0),
    nextDueAt,
  };
  totals.accuracy = totals.attempts ? totals.correct / totals.attempts : null;

  // XP is recomputed from the whole history rather than stored, so it can never
  // drift away from the attempts that produced it — and never goes down.
  const history = store.listAttempts(profileId);
  const xp = replayXp(history, (questionId) => emptyCardState(profileId, questionId));

  const since = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - ACTIVITY_DAYS));
  const days = new Map();
  for (const attempt of history) {
    const key = localDayKey(attempt.answeredAt);
    if (key < since) continue;
    const day = days.get(key) ?? { date: key, attempts: 0, correct: 0 };
    day.attempts += 1;
    if (attempt.correct) day.correct += 1;
    days.set(key, day);
  }

  const today = days.get(localDayKey(now)) ?? { date: localDayKey(now), attempts: 0, correct: 0 };
  const goal = settings.dailyGoal;

  return {
    totals,
    level: levelFor(xp),
    xp,
    streak: computeStreak(days, now),
    today: { ...today, goal, goalMet: today.attempts >= goal },
    modules: moduleStats,
    stages: stageStats,
    tracks: trackStats,
    activity: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * Consecutive days ending today (or yesterday, so the streak survives until the
 * day is actually missed).
 *
 * Steps by calendar date anchored at local noon, never by 24 hours: across a
 * DST change a day is 23 or 25 hours long, and millisecond stepping skips or
 * double-counts it.
 */
export function computeStreak(days, now = new Date()) {
  const noon = (d, offset = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, 12);
  let cursor = noon(new Date(now));
  if (!days.has(localDayKey(cursor))) {
    cursor = noon(cursor, -1);
    if (!days.has(localDayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor = noon(cursor, -1);
  }
  return streak;
}
