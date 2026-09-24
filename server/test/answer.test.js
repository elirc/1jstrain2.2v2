import { afterEach, describe, expect, it } from 'vitest';
import { curriculum } from '@jstrain/content';

import { submitAnswer, sanitiseElapsed } from '../src/answer.js';
import { backends, correctResponse, DAY, wrongResponse } from './helpers.js';

const T0 = new Date(2026, 2, 2, 10, 7);
const mcq = curriculum.questions.find((q) => q.type === 'mcq');

describe.each(backends)('submitAnswer on %s', (backend, make) => {
  let ctx;
  let profileId;
  afterEach(() => ctx?.cleanup());
  const setup = async () => {
    ctx = await make();
    profileId = ctx.store.createProfile('Ada', T0).id;
    return ctx.store;
  };
  const answer = (store, extra) => submitAnswer({ store, profileId, question: mcq, now: T0, ...extra });

  it('a malformed response is 400 invalid_response: nothing recorded, nothing revealed', async () => {
    const store = await setup();
    let error;
    try {
      answer(store, { response: mcq.answer }); // an integer index: the old wire format
    } catch (err) {
      error = err;
    }
    expect(error).toMatchObject({ status: 400, code: 'invalid_response' });
    expect(error.message).not.toContain(mcq.why);
    expect(store.listAttempts(profileId)).toEqual([]);
    expect(store.getCardState(profileId, mcq.id).attempts).toBe(0);
  });

  it('first correct answer: learned, 10 XP, reveal with answerChoiceIds, state on the response', async () => {
    const store = await setup();
    const result = answer(store, { response: correctResponse(mcq), elapsedMs: 4200 });
    expect(result).toMatchObject({
      correct: true,
      outcome: 'learned',
      answer: mcq.answer,
      answerChoiceIds: [mcq.choices[mcq.answer].id],
      why: mcq.why,
      xpEarned: 10,
      mastered: false,
      wasFirstAttempt: true,
      intervalDays: 1,
      state: { attempts: 1, correct: 1, reps: 1, lapses: 0 },
    });
    expect(store.listAttempts(profileId)[0]).toMatchObject({ correct: true, gaveUp: false, elapsedMs: 4200 });
  });

  it('an early correct answer is practice and earns 1 XP; the next-day answer is a rep', async () => {
    const store = await setup();
    answer(store, { response: correctResponse(mcq) });
    const early = answer(store, { response: correctResponse(mcq), now: new Date(T0.getTime() + 60_000) });
    expect(early).toMatchObject({ outcome: 'practice', xpEarned: 1, mastered: false, state: { reps: 1, attempts: 2 } });
    const tomorrow = answer(store, { response: correctResponse(mcq), now: new Date(T0.getTime() + DAY - 20 * 60_000) });
    expect(tomorrow).toMatchObject({ outcome: 'advanced', xpEarned: 6, mastered: true });
  });

  it('giveUp: response ignored, graded wrong, 0 XP, attempt logged with gaveUp, full reveal', async () => {
    const store = await setup();
    answer(store, { response: correctResponse(mcq) });
    const result = answer(store, { giveUp: true, response: 'garbage', now: new Date(T0.getTime() + DAY) });
    expect(result).toMatchObject({
      correct: false,
      outcome: 'lapsed',
      xpEarned: 0,
      why: mcq.why,
      state: { lapses: 1 },
    });
    expect(store.listAttempts(profileId).at(-1)).toMatchObject({ correct: false, gaveUp: true });
  });

  it('a wrong answer on a new card is failed (2 XP) and not a lapse', async () => {
    const store = await setup();
    expect(answer(store, { response: wrongResponse(mcq) })).toMatchObject({
      correct: false,
      outcome: 'failed',
      xpEarned: 2,
      state: { lapses: 0 },
    });
  });
});

describe('sanitiseElapsed', () => {
  it('keeps integers 0..3_600_000 and turns anything else into null (never a 400)', () => {
    expect(sanitiseElapsed(0)).toBe(0);
    expect(sanitiseElapsed(3_600_000)).toBe(3_600_000);
    for (const bad of [-1, 3_600_001, 1e300, 12.5, '4200', null, undefined, NaN])
      expect(sanitiseElapsed(bad)).toBeNull();
  });
});
