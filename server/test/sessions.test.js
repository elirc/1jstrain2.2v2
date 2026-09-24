import { afterEach, describe, expect, it } from 'vitest';
import { curriculum, questionsByModule } from '@jstrain/content';

import { buildSession, MAX_LIMIT, MIN_LIMIT } from '../src/sessions.js';
import { emptyCardState } from '../src/store.js';
import { int } from '../src/validate.js';
import { backends, HOUR, mulberry32 } from './helpers.js';

const NOW = new Date(2026, 2, 2, 12);
const hoursAgo = (h) => new Date(NOW.getTime() - h * HOUR).toISOString();
const hoursAhead = (h) => new Date(NOW.getTime() + h * HOUR).toISOString();

describe.each(backends)('buildSession on %s', (backend, make) => {
  let ctx;
  let store;
  let profileId;
  afterEach(() => ctx?.cleanup());
  const setup = async () => {
    ctx = await make();
    store = ctx.store;
    profileId = store.createProfile('Ada', NOW).id;
  };
  const put = (q, fields) =>
    store.saveCardState({ ...emptyCardState(profileId, q.id), attempts: 1, correct: 1, ...fields });
  const session = (params) => buildSession({ store, profileId, now: NOW, rng: mulberry32(5), ...params });

  it('daily: no duplicates; due cards most overdue first; new cards reserved even with a big backlog', async () => {
    await setup();
    // 30 due cards (a backlog bigger than the session), overdue by 1..30 hours.
    const dueQs = curriculum.questions.slice(-30);
    dueQs.forEach((q, i) => put(q, { reps: 1, intervalDays: 1, dueAt: hoursAgo(i + 1) }));

    const s = session({ mode: 'daily', size: 12, newPerDay: 10 });
    const ids = s.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(12);
    const reserve = Math.min(10, Math.floor(12 / 4));
    const due = s.questions.filter((q) => q.reason === 'due');
    expect(due).toHaveLength(12 - reserve);
    // Most overdue (30 h) first.
    expect(due.map((q) => q.id)).toEqual(
      [...dueQs]
        .reverse()
        .slice(0, 12 - reserve)
        .map((q) => q.id),
    );
    expect(s.questions.filter((q) => q.reason === 'new')).toHaveLength(reserve);
  });

  it('daily: newPerDay bounds the new cards, but at least one new card is reserved when unseen exist', async () => {
    await setup();
    expect(session({ mode: 'daily', size: 12, newPerDay: 4 }).questions.filter((q) => q.reason === 'new')).toHaveLength(
      4,
    );
    const none = session({ mode: 'daily', size: 12, newPerDay: 0 });
    expect(none.questions.filter((q) => q.reason === 'new')).toHaveLength(1);
  });

  it('daily: with no unseen cards the reserve is zero, so due cards fill the session and nothing is tagged new', async () => {
    await setup();
    // Every question seen; 20 of them due, the rest mastered practice.
    curriculum.questions.forEach((q, i) =>
      put(
        q,
        i < 20
          ? { reps: 1, intervalDays: 1, dueAt: hoursAgo(i + 1) }
          : { attempts: 2, correct: 2, reps: 2, intervalDays: 3, dueAt: hoursAhead(i) },
      ),
    );
    const s = session({ mode: 'daily', size: 12, newPerDay: 10 });
    expect(s.questions).toHaveLength(12);
    expect(s.questions.every((q) => q.reason === 'due')).toBe(true);
    expect(s.questions.map((q) => q.id)).toEqual(
      curriculum.questions
        .slice(0, 20)
        .reverse()
        .slice(0, 12)
        .map((q) => q.id),
    );
    // Fewer due than the session: the rest is practice, still never 'new'.
    store.resetProgress(profileId);
    curriculum.questions.forEach((q, i) =>
      put(q, { attempts: 2, correct: 2, reps: 2, intervalDays: 3, dueAt: hoursAhead(i + 1) }),
    );
    const practice = session({ mode: 'daily', size: 12, newPerDay: 10 });
    expect(practice.questions).toHaveLength(12);
    expect(practice.questions.every((q) => q.reason === 'practice')).toBe(true);
  });

  it('module session is topped up to the limit with extra practice from mastered cards', async () => {
    await setup();
    const moduleQs = questionsByModule('js-values');
    const [open, ...rest] = moduleQs;
    rest.forEach((q, i) => put(q, { attempts: 2, correct: 2, reps: 2, intervalDays: 3, dueAt: hoursAhead(10 + i) }));
    put(open, { attempts: 1, correct: 0, reps: 0, dueAt: hoursAhead(1) });

    const size = Math.min(12, moduleQs.length);
    const s = session({ mode: 'module', moduleId: 'js-values', size });
    expect(s.questions).toHaveLength(size);
    expect(s.questions[0].id).toBe(open.id);
    expect(s.questions.every((q) => q.reason === 'practice')).toBe(true);
    // Mastered top-up comes soonest-due first.
    expect(s.questions.slice(1).map((q) => q.id)).toEqual(rest.slice(0, size - 1).map((q) => q.id));
  });

  it('reason tags: due, relearn, new, practice', async () => {
    await setup();
    const [a, b, c] = questionsByModule('js-values');
    put(a, { reps: 1, dueAt: hoursAgo(1) });
    put(b, { reps: 0, correct: 0, dueAt: hoursAgo(1) });
    put(c, { reps: 1, dueAt: hoursAhead(5) });
    const reasons = Object.fromEntries(
      session({ mode: 'module', moduleId: 'js-values', size: 40 }).questions.map((q) => [q.id, q.reason]),
    );
    expect(reasons[a.id]).toBe('due');
    expect(reasons[b.id]).toBe('relearn');
    expect(reasons[c.id]).toBe('practice');
    expect(Object.values(reasons)).toContain('new');
  });

  it('review is sorted by dueAt; empty review says when the next one is', async () => {
    await setup();
    const [a, b, c] = curriculum.questions;
    put(a, { reps: 1, dueAt: hoursAgo(1) });
    put(b, { reps: 1, dueAt: hoursAgo(5) });
    put(c, { reps: 1, dueAt: hoursAhead(3) });
    const s = session({ mode: 'review', size: 12 });
    expect(s.questions.map((q) => q.id)).toEqual([b.id, a.id]);
    expect(s.nextDueAt).toBe(hoursAhead(3));

    store.resetProgress(profileId);
    put(c, { reps: 1, dueAt: hoursAhead(3) });
    expect(session({ mode: 'review', size: 12 })).toMatchObject({
      questions: [],
      empty: true,
      nextDueAt: hoursAhead(3),
    });
  });

  it('weak needs at least two attempts and is sorted by accuracy', async () => {
    await setup();
    const [a, b, c] = curriculum.questions;
    put(a, { attempts: 1, correct: 0, dueAt: hoursAhead(1) });
    put(b, { attempts: 4, correct: 2, dueAt: hoursAhead(1) });
    put(c, { attempts: 3, correct: 0, dueAt: hoursAhead(1) });
    expect(session({ mode: 'weak', size: 12 }).questions.map((q) => q.id)).toEqual([c.id, b.id]);
  });

  it("flagged returns this profile's flagged questions, newest flag first", async () => {
    await setup();
    const [a, b] = curriculum.questions;
    store.setFlag(profileId, a.id, '', new Date(NOW.getTime() - 1000));
    store.setFlag(profileId, b.id, '', NOW);
    store.setFlag(profileId, 'removed-from-content', '', NOW);
    const other = store.createProfile('Bob', NOW).id;
    store.setFlag(other, curriculum.questions[5].id, '', NOW);
    expect(session({ mode: 'flagged', size: 12 }).questions.map((q) => q.id)).toEqual([b.id, a.id]);
  });

  it('stage and track sessions stay inside their scope', async () => {
    await setup();
    const stage = curriculum.stages[1];
    const inStage = new Set(stage.modules);
    expect(
      session({ mode: 'stage', stageId: stage.id, size: 40 }).questions.every((q) => inStage.has(q.moduleId)),
    ).toBe(true);
    expect(session({ mode: 'track', trackId: 'ts', size: 40 }).questions.every((q) => q.trackId === 'ts')).toBe(true);
  });

  it('unknown module/stage/track ids are 404 not_found; missing ids are 400 validation_failed', async () => {
    await setup();
    for (const params of [
      { mode: 'module', moduleId: 'nope' },
      { mode: 'stage', stageId: 'nope' },
      { mode: 'track', trackId: 'nope' },
    ]) {
      expect(() => session(params)).toThrow(expect.objectContaining({ status: 404, code: 'not_found' }));
    }
    expect(() => session({ mode: 'module' })).toThrow(
      expect.objectContaining({ status: 400, code: 'validation_failed' }),
    );
  });

  it('served questions are shuffled public questions with no answer key', async () => {
    await setup();
    for (const q of session({ mode: 'daily', size: 40 }).questions) {
      expect(q).not.toHaveProperty('answer');
      expect(q).not.toHaveProperty('why');
    }
  });
});

describe('limit parsing (the rule the /sessions route applies)', () => {
  const parse = (limit) => int(limit, 'limit', { min: MIN_LIMIT, max: MAX_LIMIT, optional: true });
  it('absent or null means "use the setting"; integers 1..40 pass; anything else is validation_failed', () => {
    expect(parse(undefined)).toBeUndefined();
    expect(parse(null)).toBeUndefined();
    expect(parse(1)).toBe(1);
    expect(parse(40)).toBe(40);
    for (const bad of [0, -1, 2.5, 41, 'abc', '12', true, [], {}]) {
      expect(() => parse(bad), String(bad)).toThrow(
        expect.objectContaining({ code: 'validation_failed', details: { field: 'limit' } }),
      );
    }
  });
});
