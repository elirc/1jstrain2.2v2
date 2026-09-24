import { Router } from 'express';
import { getQuestion } from '@jstrain/content';

import { httpError } from '../errors.js';
import { revealFor } from '../grade.js';
import { presentQuestion } from '../present.js';
import { isDue, isMastered } from '../srs.js';
import { int, obj, oneOf, queryInt, str } from '../validate.js';

const HISTORY_LIMIT = 20;
const MAX_NOTE = 500;

/**
 * Looking back: one question with your history, your recent attempts across
 * questions, and flags ("revisit this").
 *
 * The answer key is revealed here only once this profile has attempted the
 * question — the same rule as the drill, so browsing history is never a way
 * to read answers before trying.
 */
export function createQuestionRouter({ store, now, rng, requireProfile }) {
  const router = Router();

  const questionOr404 = (id) => {
    const question = getQuestion(id);
    if (!question) throw httpError(404, 'not_found', 'No such question.');
    return question;
  };

  router.get('/questions/:id', (req, res) => {
    const profileId = requireProfile(req);
    const question = questionOr404(req.params.id);
    const state = store.getCardState(profileId, question.id);
    const history = store.queryAttempts(profileId, { questionId: question.id, limit: HISTORY_LIMIT });
    const attempted = state.attempts > 0 || history.length > 0;
    const flag = store.getFlag(profileId, question.id);

    res.json({
      data: {
        question: presentQuestion(question, rng),
        state: {
          attempts: state.attempts,
          correct: state.correct,
          reps: state.reps,
          lapses: state.lapses,
          mastered: isMastered(state),
          due: isDue(state, now()),
          dueAt: state.attempts > 0 ? state.dueAt : null,
          intervalDays: state.intervalDays,
          lastAnsweredAt: state.lastAnsweredAt,
        },
        flag: flag ? { note: flag.note, createdAt: flag.createdAt } : null,
        reveal: attempted ? revealFor(question) : null,
        history: history.map((a) => ({
          id: a.id,
          correct: a.correct,
          gaveUp: a.gaveUp,
          elapsedMs: a.elapsedMs,
          answeredAt: a.answeredAt,
        })),
      },
    });
  });

  // Newest first, paged by attempt id: `nextBefore` goes back in as `?before=`.
  router.get('/attempts', (req, res) => {
    const profileId = requireProfile(req);
    const q = req.query;
    const limit = int(queryInt(q.limit), 'limit', { min: 1, max: 200, optional: true }) ?? 50;
    const before = int(queryInt(q.before), 'before', { min: 1, optional: true });
    const correct = oneOf(q.correct, 'correct', ['true', 'false'], { optional: true });
    const moduleId = str(q.moduleId, 'moduleId', { max: 100, optional: true });
    const questionId = str(q.questionId, 'questionId', { max: 200, optional: true });

    // One extra row tells us whether there is another page without a COUNT.
    const rows = store.queryAttempts(profileId, {
      limit: limit + 1,
      before,
      correct: correct === undefined ? undefined : correct === 'true',
      moduleId,
      questionId,
    });
    const page = rows.slice(0, limit);

    res.json({
      data: {
        items: page.map((a) => {
          // A question removed from the content still has history.
          const question = getQuestion(a.questionId);
          return {
            id: a.id,
            questionId: a.questionId,
            moduleId: a.moduleId,
            trackId: a.trackId,
            type: question?.type ?? null,
            prompt: question?.prompt ?? null,
            correct: a.correct,
            gaveUp: a.gaveUp,
            elapsedMs: a.elapsedMs,
            answeredAt: a.answeredAt,
          };
        }),
        nextBefore: rows.length > limit ? page[page.length - 1].id : null,
      },
    });
  });

  /* ---------------------------------------------------------------- flags */

  router.put('/questions/:id/flag', (req, res) => {
    const profileId = requireProfile(req);
    const question = questionOr404(req.params.id);
    const note = str(obj(req.body).note, 'note', { min: 0, max: MAX_NOTE, optional: true, controlChars: true }) ?? '';
    const flag = store.setFlag(profileId, question.id, note, now());
    res.json({ data: { questionId: question.id, note: flag.note, createdAt: flag.createdAt } });
  });

  // Idempotent: removing a flag that is not there is still "not flagged now".
  router.delete('/questions/:id/flag', (req, res) => {
    const profileId = requireProfile(req);
    questionOr404(req.params.id);
    store.deleteFlag(profileId, req.params.id);
    res.status(204).end();
  });

  router.get('/flags', (req, res) => {
    const profileId = requireProfile(req);
    const flags = store.listFlags(profileId).flatMap((f) => {
      const question = getQuestion(f.questionId);
      if (!question) return [];
      return [
        {
          questionId: f.questionId,
          moduleId: question.moduleId,
          trackId: question.trackId,
          prompt: question.prompt,
          note: f.note,
          createdAt: f.createdAt,
        },
      ];
    });
    res.json({ data: flags });
  });

  return router;
}
