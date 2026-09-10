import { Router } from 'express';
import {
  curriculum,
  getModule,
  getQuestion,
  publicQuestion,
  questionsByModule,
} from '@jstrain/content';

import { grade, revealFor } from '../grade.js';
import { buildProgress } from '../progress.js';
import { buildSession, MODES } from '../sessions.js';
import { isDue, isMastered, schedule, xpFor } from '../srs.js';

/**
 * All application routes. Handlers stay thin: parse and validate the request,
 * call into srs/progress/sessions, shape the response. Errors are thrown with a
 * `status` and translated once by the error middleware.
 */
export function createApiRouter({ store }) {
  const router = Router();

  /* ------------------------------------------------------------- profiles */

  router.get('/profiles', (req, res) => {
    res.json({ data: store.listProfiles() });
  });

  router.post('/profiles', (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) throw httpError(400, 'validation_failed', 'A profile name is required.');
    if (name.length > 40) throw httpError(400, 'validation_failed', 'Name must be 40 characters or fewer.');
    res.status(201).json({ data: store.createProfile(name) });
  });

  router.delete('/profiles/:id', (req, res) => {
    if (!store.deleteProfile(req.params.id)) throw httpError(404, 'not_found', 'No such profile.');
    res.status(204).end();
  });

  /* ----------------------------------------------------------- curriculum */

  // The whole map, minus the questions themselves: enough to render the
  // roadmap, the track pages and every module card.
  router.get('/curriculum', (req, res) => {
    res.json({
      data: {
        tracks: curriculum.tracks,
        stages: curriculum.stages,
        modules: curriculum.modules.map((m) => {
          const questions = questionsByModule(m.id);
          return {
            ...m,
            questionCount: questions.length,
            difficulty: {
              1: questions.filter((q) => q.difficulty === 1).length,
              2: questions.filter((q) => q.difficulty === 2).length,
              3: questions.filter((q) => q.difficulty === 3).length,
            },
          };
        }),
        totals: {
          questions: curriculum.questions.length,
          modules: curriculum.modules.length,
        },
      },
    });
  });

  // One module, with its primer and its questions (answer keys stripped) plus
  // this profile's state for each — the browse/review view.
  router.get('/modules/:id', (req, res) => {
    const module = getModule(req.params.id);
    if (!module) throw httpError(404, 'not_found', 'No such module.');

    const profileId = requireProfile(req, store);
    const now = new Date();
    const questions = questionsByModule(module.id).map((question) => {
      const state = store.getCardState(profileId, question.id);
      return {
        ...publicQuestion(question),
        state: {
          attempts: state.attempts,
          correct: state.correct,
          mastered: isMastered(state),
          due: isDue(state, now),
          dueAt: state.attempts > 0 ? state.dueAt : null,
        },
      };
    });

    res.json({ data: { module, questions } });
  });

  /* ------------------------------------------------------------- sessions */

  router.post('/sessions', (req, res) => {
    const profileId = requireProfile(req, store);
    const { mode = 'daily', moduleId, stageId, trackId, limit } = req.body ?? {};
    if (!MODES.includes(mode)) {
      throw httpError(400, 'validation_failed', `mode must be one of: ${MODES.join(', ')}`);
    }
    res.json({ data: buildSession({ store, profileId, mode, moduleId, stageId, trackId, limit }) });
  });

  /* -------------------------------------------------------------- answers */

  router.post('/answers', (req, res) => {
    const profileId = requireProfile(req, store);
    const { questionId, response, elapsedMs } = req.body ?? {};

    const question = getQuestion(String(questionId ?? ''));
    if (!question) throw httpError(404, 'not_found', 'No such question.');
    if (response === undefined) throw httpError(400, 'validation_failed', 'A response is required.');

    const now = new Date();
    const before = store.getCardState(profileId, question.id);
    const { correct, reason } = grade(question, response);
    const after = schedule(before, correct, now);

    store.saveCardState(after);
    store.addAttempt({
      profileId,
      questionId: question.id,
      moduleId: question.moduleId,
      trackId: question.trackId,
      correct: correct ? 1 : 0,
      elapsedMs: Number.isFinite(elapsedMs) ? Math.round(elapsedMs) : null,
      answeredAt: now.toISOString(),
    });

    res.json({
      data: {
        correct,
        ...(reason && !correct ? { reason } : {}),
        ...revealFor(question),
        xpEarned: xpFor(before, correct),
        mastered: isMastered(after),
        wasFirstAttempt: before.attempts === 0,
        nextDueAt: after.dueAt,
        intervalDays: after.intervalDays,
      },
    });
  });

  /* ------------------------------------------------------------- progress */

  router.get('/progress', (req, res) => {
    const profileId = requireProfile(req, store);
    res.json({ data: buildProgress(store, profileId) });
  });

  router.post('/progress/reset', (req, res) => {
    const profileId = requireProfile(req, store);
    store.resetProgress(profileId);
    res.status(204).end();
  });

  return router;
}

/**
 * The profile is passed as a header rather than a session: this is a local
 * single-user tool, so identity is a "which learner is sitting here" switch
 * rather than authentication. It is still validated against the store.
 */
function requireProfile(req, store) {
  const id = req.get('x-profile-id');
  if (!id) throw httpError(400, 'profile_required', 'Send an x-profile-id header.');
  if (!store.getProfile(id)) throw httpError(404, 'not_found', 'No such profile.');
  return id;
}

export function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}
