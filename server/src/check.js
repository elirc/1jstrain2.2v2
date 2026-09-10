/**
 * A dependency-free smoke test: validates the curriculum, then exercises the
 * store, the scheduler, the grader and the progress calculation end to end
 * against a throwaway data directory. `npm run check` runs it in CI.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { curriculum, getQuestion, publicQuestion, validateContent } from '@jstrain/content';
import { createStore } from './store.js';
import { grade } from './grade.js';
import { isMastered, schedule } from './srs.js';
import { buildProgress } from './progress.js';
import { buildSession } from './sessions.js';

let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jstrain-check-'));

try {
  console.log('content');
  const report = validateContent();
  check('curriculum validates', report.ok);
  check('has at least 400 questions', report.counts.questions >= 400, `got ${report.counts.questions}`);
  check(
    'every module has questions',
    curriculum.modules.every((m) => curriculum.questions.some((q) => q.moduleId === m.id)),
  );

  console.log('answer keys never leak to the client');
  const sample = publicQuestion(curriculum.questions[0]);
  check('publicQuestion strips answer', sample.answer === undefined);
  check('publicQuestion strips explanation', sample.why === undefined);

  console.log('grading');
  const mcq = curriculum.questions.find((q) => q.type === 'mcq');
  check('correct mcq index passes', grade(mcq, mcq.answer).correct);
  check('wrong mcq index fails', !grade(mcq, (mcq.answer + 1) % mcq.choices.length).correct);
  check('non-index response fails safely', !grade(mcq, 'two').correct);

  const multi = curriculum.questions.find((q) => q.type === 'multi');
  check('multi accepts any order', grade(multi, [...multi.answer].reverse()).correct);
  check('multi rejects a subset', !grade(multi, multi.answer.slice(0, 1)).correct || multi.answer.length === 1);

  const short = curriculum.questions.find((q) => q.type === 'short');
  check('short answer is case and space insensitive', grade(short, ` ${short.answer[0].toUpperCase()} `).correct);

  const order = curriculum.questions.find((q) => q.type === 'order');
  check('order requires the exact sequence', grade(order, order.answer).correct);
  check('order rejects a wrong sequence', !grade(order, [...order.answer].reverse()) .correct || order.answer.length === 1);

  const bool = curriculum.questions.find((q) => q.type === 'boolean');
  check('boolean grades correctly', grade(bool, bool.answer).correct && !grade(bool, !bool.answer).correct);

  console.log('scheduling');
  const now = new Date('2026-01-01T10:00:00Z');
  let state = { reps: 0, lapses: 0, ease: 2.5, intervalDays: 0, attempts: 0, correct: 0 };
  state = schedule(state, true, now);
  check('first correct schedules one day out', state.intervalDays === 1);
  check('one correct answer is not mastery', !isMastered(state));
  state = schedule(state, true, now);
  check('second correct answer reaches mastery', isMastered(state));
  check('intervals grow', state.intervalDays === 3);
  const lapsed = schedule(state, false, now);
  check('a wrong answer resets reps', lapsed.reps === 0);
  check('a wrong answer counts a lapse', lapsed.lapses === 1);
  check('ease never drops below the floor', schedule({ ...state, ease: 1.3 }, false, now).ease >= 1.3);

  console.log('store and progress');
  const store = await createStore({ dataDir });
  console.log(`  (backend: ${store.backend})`);
  const profile = store.createProfile('Check');
  check('profile round-trips', store.getProfile(profile.id)?.name === 'Check');

  const empty = buildProgress(store, profile.id, now);
  check('a new profile has zero mastery', empty.totals.mastered === 0);
  check('stage 1 is unlocked from the start', empty.stages[0].unlocked);
  check('a later stage starts locked', !empty.stages[1].unlocked);
  check('level starts at 1', empty.level.level === 1);

  const target = curriculum.questions.find((q) => q.type === 'mcq');
  for (const day of [0, 1]) {
    const when = new Date(now.getTime() + day * 86_400_000);
    const before = store.getCardState(profile.id, target.id);
    store.saveCardState(schedule(before, true, when));
    store.addAttempt({
      profileId: profile.id,
      questionId: target.id,
      moduleId: target.moduleId,
      trackId: target.trackId,
      correct: 1,
      elapsedMs: 4200,
      answeredAt: when.toISOString(),
    });
  }

  const after = buildProgress(store, profile.id, new Date(now.getTime() + 86_400_000));
  check('mastery is recorded', after.totals.mastered === 1);
  check('attempts are recorded', after.totals.attempts === 2);
  check('xp is earned', after.xp > 0);
  check('streak counts consecutive days', after.streak === 2, `got ${after.streak}`);
  check('accuracy is computed', after.totals.accuracy === 1);

  console.log('sessions');
  const daily = buildSession({ store, profileId: profile.id, mode: 'daily', limit: 10 });
  check('daily session returns questions', daily.questions.length === 10);
  check('session questions carry no answer key', daily.questions.every((q) => q.answer === undefined));

  const moduleSession = buildSession({
    store,
    profileId: profile.id,
    mode: 'module',
    moduleId: 'js-values',
    limit: 5,
  });
  check('module session stays inside its module', moduleSession.questions.every((q) => q.moduleId === 'js-values'));

  let rejected = false;
  try {
    buildSession({ store, profileId: profile.id, mode: 'module', moduleId: 'nope' });
  } catch (err) {
    rejected = err.status === 400;
  }
  check('an unknown module is rejected with a 400', rejected);

  check('every question id resolves', curriculum.questions.every((q) => getQuestion(q.id)?.id === q.id));

  store.resetProgress(profile.id);
  check('reset clears progress', buildProgress(store, profile.id, now).totals.attempts === 0);

  // Windows will not delete an open SQLite file, so releasing the handle is
  // part of the test rather than an afterthought.
  store.close();
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
