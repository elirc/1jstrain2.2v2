/**
 * Spaced repetition.
 *
 * A trimmed SM-2: correct answers push the next review further out, wrong ones
 * bring the card back almost immediately and make future intervals grow more
 * slowly. Two spaced correct answers count as "mastered", which is what drives
 * module progress and stage unlocking.
 *
 * "Spaced" is enforced, not assumed: a correct answer given before the card is
 * due is *practice*. It is counted (attempts, accuracy) but it does not move the
 * schedule, otherwise answering the same card twice in one sitting would master
 * it.
 */

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const RELEARN_MINUTES = 10;

/** Reps needed before a question counts toward mastery. */
export const MASTERY_REPS = 2;

/** Interview material you last saw a year ago is not "known"; cap the gap. */
export const MAX_INTERVAL_DAYS = 180;

/** @typedef {'learned' | 'advanced' | 'practice' | 'lapsed' | 'failed'} Outcome */

export function isMastered(state) {
  return state.reps >= MASTERY_REPS;
}

/**
 * Advance a card after an answer.
 *
 * Returns the next card state plus the `outcome`, which says what the answer
 * did to the schedule. Stores persist named columns only, so the extra field
 * never reaches the database.
 *
 * @param {import('./store.js').CardState} state
 * @param {boolean} correct
 * @param {Date} [now]
 * @returns {import('./store.js').CardState & { outcome: Outcome }}
 */
export function schedule(state, correct, now = new Date()) {
  const wasDue = state.attempts === 0 || now >= new Date(state.dueAt);
  const next = {
    ...state,
    attempts: state.attempts + 1,
    correct: state.correct + (correct ? 1 : 0),
    lastAnsweredAt: now.toISOString(),
  };

  if (correct && !wasDue) {
    // Practice: reps, ease, interval and due date are deliberately untouched.
    return { ...next, outcome: 'practice' };
  }

  if (correct) {
    next.reps = state.reps + 1;
    next.ease = Math.min(MAX_EASE, state.ease + 0.1);
    if (next.reps === 1) next.intervalDays = 1;
    else if (next.reps === 2) next.intervalDays = 3;
    // Floor at one day: a state that arrived through import can carry
    // `reps >= 2` with `intervalDays` 0, and `0 * ease` would put the card
    // due at today's midnight, before this answer, so it never leaves "due".
    else next.intervalDays = Math.max(1, Math.min(MAX_INTERVAL_DAYS, Math.round(state.intervalDays * next.ease)));
    next.dueAt = startOfLocalDay(now, next.intervalDays).toISOString();
    return { ...next, outcome: next.reps === 1 ? 'learned' : 'advanced' };
  }

  // Only count a lapse if the card had actually been learned — getting a new
  // question wrong the first time is not forgetting.
  const outcome = state.reps > 0 ? 'lapsed' : 'failed';
  next.lapses = state.lapses + (state.reps > 0 ? 1 : 0);
  next.reps = 0;
  next.ease = Math.max(MIN_EASE, state.ease - 0.2);
  next.intervalDays = 0;
  next.dueAt = new Date(now.getTime() + RELEARN_MINUTES * 60_000).toISOString();
  return { ...next, outcome };
}

/**
 * Local midnight `days` calendar days after `date`. "Back in 1 day" means
 * answerable any time tomorrow, not at the same minute tomorrow — otherwise a
 * learner who studies a little earlier each morning gets "practice" on every
 * card the UI promised was due. Calendar arithmetic (not `+ 86_400_000`) keeps
 * this right across DST changes.
 */
export function startOfLocalDay(date, days = 0) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function isDue(state, now = new Date()) {
  return state.attempts > 0 && new Date(state.dueAt) <= now;
}

/**
 * XP rewards effort as well as accuracy, so a hard session is never a loss —
 * but only answers that move the schedule earn full XP, so re-answering a card
 * you already know is not a farm.
 *
 * @param {Outcome} outcome
 * @param {{ wasFirstAttempt: boolean, gaveUp?: boolean }} context
 */
export function xpFor(outcome, { wasFirstAttempt, gaveUp = false }) {
  if (gaveUp) return 0;
  if (outcome === 'lapsed' || outcome === 'failed') return 2;
  if (outcome === 'practice') return 1;
  return wasFirstAttempt ? 10 : 6;
}

/**
 * Total XP for an attempt log, derived by replaying each question's attempts
 * through `schedule()`. XP is never stored, so it cannot drift from the answers
 * that produced it, and replaying is what lets "practice earns 1" apply to
 * history without an `outcome` column.
 *
 * @param {{ questionId: string, correct: boolean, gaveUp?: boolean, answeredAt: string }[]} attempts
 *   in chronological order
 * @param {(questionId: string) => import('./store.js').CardState} emptyState
 */
export function replayXp(attempts, emptyState) {
  const states = new Map();
  let xp = 0;
  for (const attempt of attempts) {
    const before = states.get(attempt.questionId) ?? emptyState(attempt.questionId);
    const correct = attempt.correct && !attempt.gaveUp;
    const after = schedule(before, correct, new Date(attempt.answeredAt));
    xp += xpFor(after.outcome, { wasFirstAttempt: before.attempts === 0, gaveUp: !!attempt.gaveUp });
    states.set(attempt.questionId, after);
  }
  return xp;
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

export { LEVELS };
