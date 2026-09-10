/**
 * Spaced repetition.
 *
 * A trimmed SM-2: correct answers push the next review further out, wrong ones
 * bring the card back almost immediately and make future intervals grow more
 * slowly. Two spaced correct answers count as "mastered", which is what drives
 * module progress and stage unlocking.
 */

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const RELEARN_MINUTES = 10;

/** Reps needed before a question counts toward mastery. */
export const MASTERY_REPS = 2;

export function isMastered(state) {
  return state.reps >= MASTERY_REPS;
}

/**
 * Advance a card after an answer.
 * @param {import('./store.js').CardState} state
 * @param {boolean} correct
 * @param {Date} [now]
 */
export function schedule(state, correct, now = new Date()) {
  const next = {
    ...state,
    attempts: state.attempts + 1,
    correct: state.correct + (correct ? 1 : 0),
    lastAnsweredAt: now.toISOString(),
  };

  if (correct) {
    next.reps = state.reps + 1;
    next.ease = Math.min(MAX_EASE, state.ease + 0.1);
    if (next.reps === 1) next.intervalDays = 1;
    else if (next.reps === 2) next.intervalDays = 3;
    else next.intervalDays = Math.round(state.intervalDays * next.ease);
    next.dueAt = addDays(now, next.intervalDays).toISOString();
  } else {
    // Only count a lapse if the card had actually been learned — getting a new
    // question wrong the first time is not forgetting.
    next.lapses = state.lapses + (state.reps > 0 ? 1 : 0);
    next.reps = 0;
    next.ease = Math.max(MIN_EASE, state.ease - 0.2);
    next.intervalDays = 0;
    next.dueAt = new Date(now.getTime() + RELEARN_MINUTES * 60_000).toISOString();
  }

  return next;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isDue(state, now = new Date()) {
  return state.attempts > 0 && new Date(state.dueAt) <= now;
}

/** XP rewards effort as well as accuracy, so a hard session is never a loss. */
export function xpFor(state, correct) {
  if (!correct) return 2;
  return state.attempts === 0 ? 10 : 6;
}

const LEVELS = [
  { level: 1, title: 'Getting started', xp: 0 },
  { level: 2, title: 'Finding your feet', xp: 150 },
  { level: 3, title: 'Writing real code', xp: 400 },
  { level: 4, title: 'Junior developer', xp: 800 },
  { level: 5, title: 'Shipping features', xp: 1400 },
  { level: 6, title: 'Trusted with the codebase', xp: 2200 },
  { level: 7, title: 'Mid-level developer', xp: 3200 },
  { level: 8, title: 'Interview ready', xp: 4500 },
];

export function levelFor(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) current = l;
  const next = LEVELS.find((l) => l.xp > xp) ?? null;
  const span = next ? next.xp - current.xp : 1;
  return {
    ...current,
    nextTitle: next?.title ?? null,
    nextAtXp: next?.xp ?? null,
    progressToNext: next ? Math.min(1, (xp - current.xp) / span) : 1,
  };
}
