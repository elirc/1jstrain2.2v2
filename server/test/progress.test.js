import { afterEach, describe, expect, it } from 'vitest';
import { curriculum, questionsByModule } from '@jstrain/content';

import { submitAnswer } from '../src/answer.js';
import { buildProgress, computeStreak, localDayKey } from '../src/progress.js';
import { emptyCardState } from '../src/store.js';
import { backends, correctResponse, DAY, mulberry32, wrongResponse } from './helpers.js';

const days = (...keys) => new Map(keys.map((k) => [k, { date: k }]));

describe('computeStreak', () => {
  it('counts consecutive days, survives until the end of the next day, breaks on a gap', () => {
    const d = days('2026-06-01', '2026-06-02', '2026-06-03');
    expect(computeStreak(d, new Date(2026, 5, 3, 20))).toBe(3);
    expect(computeStreak(d, new Date(2026, 5, 4, 23, 59))).toBe(3);
    expect(computeStreak(d, new Date(2026, 5, 5, 0, 1))).toBe(0);
    expect(computeStreak(days('2026-06-01', '2026-06-03'), new Date(2026, 5, 3, 9))).toBe(1);
  });

  it('is right across spring-forward and fall-back (TZ=America/Los_Angeles)', () => {
    // Missed 8 March, the 23-hour day: at 00:30 on the 9th the streak is 1 (yesterday is missing).
    expect(computeStreak(days('2026-03-07', '2026-03-09'), new Date(2026, 2, 9, 0, 30))).toBe(1);
    // 31 Oct, 1 Nov (the 25-hour day) and 2 Nov: three days, not four.
    expect(computeStreak(days('2026-10-31', '2026-11-01', '2026-11-02'), new Date(2026, 10, 2, 23, 30))).toBe(3);
    // A streak that runs straight through both changes.
    const keys = [];
    for (
      let d = new Date(2026, 2, 1, 12);
      d <= new Date(2026, 2, 20, 12);
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)
    ) {
      keys.push(localDayKey(d));
    }
    expect(computeStreak(days(...keys), new Date(2026, 2, 20, 8))).toBe(20);
  });
});

describe.each(backends)('buildProgress on %s', (backend, make) => {
  let ctx;
  let store;
  let profileId;
  afterEach(() => ctx?.cleanup());
  const setup = async (now) => {
    ctx = await make();
    store = ctx.store;
    profileId = store.createProfile('Ada', now).id;
  };

  const SEED = 99;
  it(`xp counts attempts older than 365 days and equals the sum of xpEarned from answering (seed ${SEED})`, async () => {
    const start = new Date(2025, 0, 10, 9);
    await setup(start);
    const rng = mulberry32(SEED);
    const pool = curriculum.questions.slice(0, 15);
    let earned = 0;
    let t = start.getTime();
    for (let i = 0; i < 200; i++) {
      t += Math.floor(rng() ** 3 * 6 * DAY);
      const question = pool[Math.floor(rng() * pool.length)];
      const giveUp = rng() < 0.05;
      const response = rng() < 0.7 ? correctResponse(question) : wrongResponse(question);
      earned += submitAnswer({ store, profileId, question, response, giveUp, now: new Date(t) }).xpEarned;
    }
    const now = new Date(t + 400 * DAY);
    expect(new Date(store.listAttempts(profileId)[0].answeredAt) < new Date(now.getTime() - 365 * DAY)).toBe(true);
    const progress = buildProgress(store, profileId, { now });
    expect(progress.xp).toBe(earned);
    // The heatmap alone is windowed.
    expect(progress.activity.every((d) => d.date >= localDayKey(new Date(now.getTime() - 366 * DAY)))).toBe(true);
  });

  it('accuracy stays ≤ 1 with orphaned card states; modules carry correct', async () => {
    const now = new Date(2026, 2, 2, 12);
    await setup(now);
    const q = curriculum.questions[0];
    store.saveCardState({
      ...emptyCardState(profileId, q.id),
      attempts: 1,
      correct: 1,
      reps: 1,
      dueAt: now.toISOString(),
    });
    // A question that no longer exists in the content, with lots of history.
    store.saveCardState({ ...emptyCardState(profileId, 'removed-question-1'), attempts: 9, correct: 9 });
    const progress = buildProgress(store, profileId, { now });
    expect(progress.totals.accuracy).toBe(1);
    expect(progress.totals.attempts).toBe(1);
    expect(progress.modules.find((m) => m.moduleId === q.moduleId)).toMatchObject({ attempts: 1, correct: 1 });
  });

  it('today has goal/goalMet from settings; totals.nextDueAt is the earliest upcoming review', async () => {
    const now = new Date(2026, 2, 2, 12);
    await setup(now);
    const [a, b] = curriculum.questions;
    submitAnswer({ store, profileId, question: a, response: correctResponse(a), now });
    submitAnswer({ store, profileId, question: b, response: wrongResponse(b), now });
    const progress = buildProgress(store, profileId, { now, settings: { dailyGoal: 2 } });
    expect(progress.today).toMatchObject({ attempts: 2, correct: 1, goal: 2, goalMet: true });
    expect(progress.totals.nextDueAt).toBe(new Date(now.getTime() + 10 * 60_000).toISOString());
    expect(buildProgress(store, profileId, { now }).today).toMatchObject({ goal: 20, goalMet: false });
  });

  it('stage N+1 unlocks at unlockAt mastery of the stage before it, or once any of its questions is seen', async () => {
    const now = new Date(2026, 2, 2, 12);
    await setup(now);
    const [s1, s2, s3] = curriculum.stages;
    let progress = buildProgress(store, profileId, { now });
    expect(progress.stages.map((s) => s.unlocked).slice(0, 3)).toEqual([true, false, false]);

    // Master exactly enough of the stage stage 2 builds on (`after`, else stage 1).
    const gate = curriculum.stages.find((s) => s.id === s2.after) ?? s1;
    const stage1 = gate.modules.flatMap((id) => questionsByModule(id));
    const needed = Math.ceil(stage1.length * s2.unlockAt);
    for (const q of stage1.slice(0, needed - 1))
      store.saveCardState({
        ...emptyCardState(profileId, q.id),
        attempts: 2,
        correct: 2,
        reps: 2,
        dueAt: now.toISOString(),
      });
    expect(buildProgress(store, profileId, { now }).stages[1].unlocked).toBe(false);
    const last = stage1[needed - 1];
    store.saveCardState({
      ...emptyCardState(profileId, last.id),
      attempts: 2,
      correct: 2,
      reps: 2,
      dueAt: now.toISOString(),
    });
    progress = buildProgress(store, profileId, { now });
    expect(progress.stages[1]).toMatchObject({ unlocked: true, gateStageId: gate.id });

    // Seen beats the gate.
    const inStage3 = questionsByModule(s3.modules[0])[0];
    store.saveCardState({ ...emptyCardState(profileId, inStage3.id), attempts: 1, dueAt: now.toISOString() });
    expect(buildProgress(store, profileId, { now }).stages[2].unlocked).toBe(true);
  });

  it('`stage.after` names the gate when the content sets it, and list order is the fallback', async () => {
    const now = new Date(2026, 2, 2, 12);
    await setup(now);
    const s3 = curriculum.stages[2];
    const had = Object.prototype.hasOwnProperty.call(s3, 'after');
    const previous = s3.after;
    try {
      s3.after = curriculum.stages[0].id;
      const stage1 = curriculum.stages[0].modules.flatMap((id) => questionsByModule(id));
      for (const q of stage1)
        store.saveCardState({
          ...emptyCardState(profileId, q.id),
          attempts: 2,
          correct: 2,
          reps: 2,
          dueAt: now.toISOString(),
        });
      const progress = buildProgress(store, profileId, { now });
      expect(progress.stages[2]).toMatchObject({ gateStageId: curriculum.stages[0].id, unlocked: true });

      s3.after = 'no-such-stage';
      expect(buildProgress(store, profileId, { now }).stages[2].gateStageId).toBe(curriculum.stages[1].id);
    } finally {
      if (had) s3.after = previous;
      else delete s3.after;
    }
  });
});
