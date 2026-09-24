/**
 * The answer flow: grade → schedule → record → reward.
 *
 * This is where the grading rules, the scheduler and the store meet, so it
 * lives outside the route handler and is unit-tested directly. The route only
 * validates the request shape and turns the result into JSON.
 */

import { httpError } from './errors.js';
import { grade, revealFor } from './grade.js';
import { isMastered, schedule, xpFor } from './srs.js';

/** Longer than this is a tab left open, not thinking time; store null instead. */
export const MAX_ELAPSED_MS = 3_600_000;

/** A clock skew or a stale tab must never block an answer: out of range is null, not a 400. */
export function sanitiseElapsed(elapsedMs) {
  return Number.isInteger(elapsedMs) && elapsedMs >= 0 && elapsedMs <= MAX_ELAPSED_MS ? elapsedMs : null;
}

/**
 * @param {object} params
 * @param {any} params.store
 * @param {string} params.profileId
 * @param {import('@jstrain/content').Question} params.question
 * @param {unknown} [params.response]
 * @param {unknown} [params.elapsedMs]
 * @param {boolean} [params.giveUp]  "show me the answer": graded wrong, no XP
 * @param {Date} [params.now]
 */
export function submitAnswer({ store, profileId, question, response, elapsedMs, giveUp = false, now = new Date() }) {
  let correct = false;
  if (!giveUp) {
    const graded = grade(question, response);
    // Malformed is not wrong: nothing is recorded and the key is not revealed,
    // so a client bug cannot cost the learner a card's mastery.
    if (!graded.valid) {
      throw httpError(
        400,
        'invalid_response',
        `That response does not fit a ${question.type} question: ${graded.reason}.`,
        {
          field: 'response',
        },
      );
    }
    correct = graded.correct;
  }

  const before = store.getCardState(profileId, question.id);
  const after = schedule(before, correct, now);
  const wasFirstAttempt = before.attempts === 0;

  store.recordAnswer(after, {
    profileId,
    questionId: question.id,
    moduleId: question.moduleId,
    trackId: question.trackId,
    correct,
    gaveUp: giveUp,
    elapsedMs: sanitiseElapsed(elapsedMs),
    answeredAt: now.toISOString(),
  });

  return {
    correct,
    outcome: after.outcome,
    ...revealFor(question),
    xpEarned: xpFor(after.outcome, { wasFirstAttempt, gaveUp: giveUp }),
    mastered: isMastered(after),
    wasFirstAttempt,
    nextDueAt: after.dueAt,
    intervalDays: after.intervalDays,
    state: { attempts: after.attempts, correct: after.correct, reps: after.reps, lapses: after.lapses },
  };
}
