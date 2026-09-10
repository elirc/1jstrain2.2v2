/**
 * Turning raw card states and attempts into the numbers the dashboard shows:
 * per-module mastery, per-track accuracy, stage unlocking, streaks and level.
 */

import { curriculum, questionsByModule } from '@jstrain/content';
import { isDue, isMastered, levelFor, xpFor } from './srs.js';
import { emptyCardState } from './store.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day (not UTC) so a streak matches what the learner experienced. */
export function localDayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildProgress(store, profileId, now = new Date()) {
  const states = new Map(store.listCardStates(profileId).map((s) => [s.questionId, s]));
  const stateOf = (id) => states.get(id) ?? emptyCardState(profileId, id);

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
    }

    return {
      moduleId: module.id,
      trackId: module.trackId,
      total: questions.length,
      seen,
      mastered,
      due,
      attempts,
      accuracy: attempts ? correct / attempts : null,
      mastery: questions.length ? mastered / questions.length : 0,
    };
  });

  const byModuleId = new Map(moduleStats.map((m) => [m.moduleId, m]));

  // A stage unlocks once the previous stage clears its threshold. Stage 1 is
  // always open, and a stage you have already worked in stays open.
  const stageStats = [];
  let previousMastery = 1;
  for (const stage of curriculum.stages) {
    const mods = stage.modules.map((id) => byModuleId.get(id)).filter(Boolean);
    const total = mods.reduce((n, m) => n + m.total, 0);
    const mastered = mods.reduce((n, m) => n + m.mastered, 0);
    const seen = mods.reduce((n, m) => n + m.seen, 0);
    const due = mods.reduce((n, m) => n + m.due, 0);
    const mastery = total ? mastered / total : 0;

    stageStats.push({
      stageId: stage.id,
      total,
      seen,
      mastered,
      due,
      mastery,
      unlocked: previousMastery >= stage.unlockAt || seen > 0,
    });
    previousMastery = mastery;
  }

  const trackStats = curriculum.tracks.map((track) => {
    const mods = moduleStats.filter((m) => m.trackId === track.id);
    const total = mods.reduce((n, m) => n + m.total, 0);
    const mastered = mods.reduce((n, m) => n + m.mastered, 0);
    const attempts = mods.reduce((n, m) => n + m.attempts, 0);
    const weighted = mods.reduce((n, m) => n + (m.accuracy ?? 0) * m.attempts, 0);
    return {
      trackId: track.id,
      total,
      mastered,
      attempts,
      mastery: total ? mastered / total : 0,
      accuracy: attempts ? weighted / attempts : null,
    };
  });

  const totals = {
    questions: curriculum.questions.length,
    seen: moduleStats.reduce((n, m) => n + m.seen, 0),
    mastered: moduleStats.reduce((n, m) => n + m.mastered, 0),
    due: moduleStats.reduce((n, m) => n + m.due, 0),
    attempts: moduleStats.reduce((n, m) => n + m.attempts, 0),
  };
  totals.accuracy = (() => {
    const correct = [...states.values()].reduce((n, s) => n + s.correct, 0);
    return totals.attempts ? correct / totals.attempts : null;
  })();

  // XP is recomputed from history rather than stored, so it can never drift
  // away from the attempts that produced it.
  const history = store.listAttempts(profileId, new Date(now.getTime() - 365 * DAY_MS).toISOString());
  let xp = 0;
  const seenBefore = new Map();
  for (const attempt of history) {
    const priorAttempts = seenBefore.get(attempt.questionId) ?? 0;
    xp += xpFor({ attempts: priorAttempts }, attempt.correct);
    seenBefore.set(attempt.questionId, priorAttempts + 1);
  }

  const days = new Map();
  for (const attempt of history) {
    const key = localDayKey(attempt.answeredAt);
    const day = days.get(key) ?? { date: key, attempts: 0, correct: 0 };
    day.attempts += 1;
    if (attempt.correct) day.correct += 1;
    days.set(key, day);
  }

  return {
    totals,
    level: levelFor(xp),
    xp,
    streak: computeStreak(days, now),
    today: days.get(localDayKey(now)) ?? { date: localDayKey(now), attempts: 0, correct: 0 },
    modules: moduleStats,
    stages: stageStats,
    tracks: trackStats,
    activity: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * Consecutive days ending today (or yesterday, so the streak survives until the
 * day is actually missed).
 */
export function computeStreak(days, now = new Date()) {
  let cursor = new Date(now);
  if (!days.has(localDayKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!days.has(localDayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
