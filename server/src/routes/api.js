import { Router } from 'express';
import { curriculum, getModule, getQuestion, questionsByModule } from '@jstrain/content';

import { httpError } from '../errors.js';
import { submitAnswer } from '../answer.js';
import { presentQuestion } from '../present.js';
import { buildProgress } from '../progress.js';
import { buildSession, MAX_LIMIT, MIN_LIMIT, MODES } from '../sessions.js';
import { withDefaults } from '../settings.js';
import { isDue, isMastered } from '../srs.js';
import { int, obj, oneOf, str } from '../validate.js';
import { createProfileRouter } from './profiles.js';
import { createQuestionRouter } from './questions.js';
import { createSettingsRouter } from './settings.js';

/**
 * All application routes. Handlers stay thin: validate the request, call into
 * answer/sessions/progress/store, shape the response. Errors are thrown with a
 * `status` and an allowlisted `code` and translated once by the error
 * middleware in app.js.
 *
 * @param {object} deps
 * @param {any} deps.store
 * @param {() => Date} deps.now   the clock; injected so tests can move time
 * @param {() => number} deps.rng used to shuffle choices; injected for tests
 */
export function createApiRouter({ store, now, rng }) {
  const router = Router();
  const deps = { store, now, rng, requireProfile: (req) => requireProfile(req, store) };

  router.use(createProfileRouter(deps));
  router.use(createQuestionRouter(deps));
  router.use(createSettingsRouter(deps));

  /* ----------------------------------------------------------- curriculum */

  // The whole map, minus the questions themselves: enough to render the
  // roadmap, the track pages and every module card. Content is immutable per
  // process, so the response is built once.
  const curriculumBody = {
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
  };
  router.get('/curriculum', (req, res) => {
    res.json(curriculumBody);
  });

  // One module, with its primer and its questions (answer keys stripped,
  // choices shuffled) plus this profile's state for each — the browse view.
  router.get('/modules/:id', (req, res) => {
    const module = getModule(req.params.id);
    if (!module) throw httpError(404, 'not_found', 'No such module.');

    const profileId = requireProfile(req, store);
    const at = now();
    // One primary-key lookup per question, on purpose: measured at 0.5-0.7 ms
    // for a 14-question module whatever the history size, against ~3 ms for
    // one listCardStates() scan of every card (see journal J22).
    const flagged = new Set(store.listFlags(profileId).map((f) => f.questionId));
    const questions = questionsByModule(module.id).map((question) => {
      const state = store.getCardState(profileId, question.id);
      return {
        ...presentQuestion(question, rng),
        state: {
          attempts: state.attempts,
          correct: state.correct,
          reps: state.reps,
          lapses: state.lapses,
          mastered: isMastered(state),
          due: isDue(state, at),
          dueAt: state.attempts > 0 ? state.dueAt : null,
          flagged: flagged.has(question.id),
        },
      };
    });

    res.json({ data: { module, questions } });
  });

  /* ------------------------------------------------------------- sessions */

  router.post('/sessions', (req, res) => {
    const profileId = requireProfile(req, store);
    const body = obj(req.body);
    const mode = oneOf(body.mode ?? 'daily', 'mode', MODES);
    const settings = withDefaults(store.getSettings(profileId));
    // `limit: null` is "use my default", not an error: the client serialises a
    // NaN from a bad `?limit=` URL as null.
    const size = int(body.limit, 'limit', { min: MIN_LIMIT, max: MAX_LIMIT, optional: true }) ?? settings.sessionSize;

    res.json({
      data: buildSession({
        store,
        profileId,
        mode,
        moduleId: str(body.moduleId, 'moduleId', { max: 100, optional: true }),
        stageId: str(body.stageId, 'stageId', { max: 100, optional: true }),
        trackId: str(body.trackId, 'trackId', { max: 100, optional: true }),
        size,
        newPerDay: settings.newPerDay,
        now: now(),
        rng,
      }),
    });
  });

  /* -------------------------------------------------------------- answers */

  router.post('/answers', (req, res) => {
    const profileId = requireProfile(req, store);
    const body = obj(req.body);
    const questionId = str(body.questionId, 'questionId', { max: 200 });
    if (body.giveUp !== undefined && typeof body.giveUp !== 'boolean') {
      throw httpError(400, 'validation_failed', 'giveUp must be true or false.', { field: 'giveUp' });
    }
    const giveUp = body.giveUp === true;

    const question = getQuestion(questionId);
    if (!question) throw httpError(404, 'not_found', 'No such question.');
    if (!giveUp && body.response === undefined) {
      throw httpError(400, 'validation_failed', 'A response is required.', { field: 'response' });
    }

    res.json({
      data: submitAnswer({
        store,
        profileId,
        question,
        response: body.response,
        elapsedMs: body.elapsedMs,
        giveUp,
        now: now(),
      }),
    });
  });

  /* ------------------------------------------------------------- progress */

  router.get('/progress', (req, res) => {
    const profileId = requireProfile(req, store);
    const settings = withDefaults(store.getSettings(profileId));
    res.json({ data: buildProgress(store, profileId, { now: now(), settings }) });
  });

  // Wipes answers and schedules. Flags and settings are preferences, not
  // history, so they survive a reset.
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
export function requireProfile(req, store) {
  const id = req.get('x-profile-id');
  if (!id) throw httpError(400, 'profile_required', 'Send an x-profile-id header.');
  if (!store.getProfile(id)) throw httpError(404, 'not_found', 'No such profile.');
  return id;
}

export { httpError };
