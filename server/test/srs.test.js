import { describe, expect, it } from 'vitest';

import { emptyCardState } from '../src/store.js';
import {
  isMastered,
  LEVELS,
  levelFor,
  MAX_INTERVAL_DAYS,
  replayXp,
  schedule,
  startOfLocalDay,
  xpFor,
} from '../src/srs.js';
import { localDayKey } from '../src/progress.js';
import { DAY, HOUR, mulberry32 } from './helpers.js';

const fresh = () => emptyCardState('p', 'q');
// 10:07 local time on 2 March 2026 (America/Los_Angeles, before DST starts).
const at = (y, m, d, h = 10, min = 7) => new Date(y, m - 1, d, h, min);

describe('the test environment', () => {
  it('runs in a pinned time zone with DST, so calendar tests cannot pass by geography', () => {
    expect(process.env.TZ).toBe('America/Los_Angeles');
    expect(new Date(2026, 0, 15).getTimezoneOffset()).not.toBe(new Date(2026, 6, 15).getTimezoneOffset());
  });
});

describe('schedule()', () => {
  it('new card: correct → reps 1, interval 1d, due at the start of tomorrow (learned)', () => {
    const now = at(2026, 3, 2);
    const s = schedule(fresh(), true, now);
    expect(s).toMatchObject({ reps: 1, intervalDays: 1, attempts: 1, correct: 1, outcome: 'learned' });
    expect(s.dueAt).toBe(new Date(2026, 2, 3).toISOString());
    expect(isMastered(s)).toBe(false);
  });

  it('second correct only after due → reps 2, interval 3d, mastered (advanced)', () => {
    const s1 = schedule(fresh(), true, at(2026, 3, 2));
    const s2 = schedule(s1, true, at(2026, 3, 3, 18));
    expect(s2).toMatchObject({ reps: 2, intervalDays: 3, outcome: 'advanced' });
    expect(isMastered(s2)).toBe(true);
    expect(s2.dueAt).toBe(new Date(2026, 2, 6).toISOString());
  });

  it('a correct answer before dueAt is practice: reps/ease/interval/dueAt unchanged, attempts+1', () => {
    const s1 = schedule(fresh(), true, at(2026, 3, 2));
    const s2 = schedule(s1, true, new Date(at(2026, 3, 2).getTime() + 60_000));
    expect(s2.outcome).toBe('practice');
    expect(s2).toMatchObject({
      reps: s1.reps,
      ease: s1.ease,
      intervalDays: s1.intervalDays,
      dueAt: s1.dueAt,
      attempts: 2,
      correct: 2,
    });
    expect(isMastered(s2)).toBe(false);
  });

  it('a correct answer at 09:55 the next day is a rep, not practice (day-granular due dates)', () => {
    const s1 = schedule(fresh(), true, at(2026, 3, 2, 10, 7));
    const s2 = schedule(s1, true, at(2026, 3, 3, 9, 55));
    expect(s2.outcome).toBe('advanced');
    expect(s2.reps).toBe(2);
  });

  it('first-ever wrong answer is not a lapse (failed); wrong after learned is (lapsed)', () => {
    const failed = schedule(fresh(), false, at(2026, 3, 2));
    expect(failed).toMatchObject({ outcome: 'failed', lapses: 0, reps: 0 });

    const learned = schedule(fresh(), true, at(2026, 3, 2));
    const lapsed = schedule(learned, false, at(2026, 3, 3));
    expect(lapsed).toMatchObject({ outcome: 'lapsed', lapses: 1, reps: 0 });
  });

  it('wrong answer → due in 10 minutes, interval 0, ease −0.2 (even when not due)', () => {
    const now = at(2026, 3, 2);
    const s = schedule(fresh(), false, now);
    expect(new Date(s.dueAt).getTime() - now.getTime()).toBe(10 * 60_000);
    expect(s.intervalDays).toBe(0);
    expect(s.ease).toBeCloseTo(2.3);
  });

  it('a relearn answered 30 s after a miss is practice; after 10 minutes it is learned again', () => {
    const miss = schedule(fresh(), false, at(2026, 3, 2));
    expect(schedule(miss, true, new Date(at(2026, 3, 2).getTime() + 30_000)).outcome).toBe('practice');
    expect(schedule(miss, true, new Date(at(2026, 3, 2).getTime() + 11 * 60_000)).outcome).toBe('learned');
  });

  it(`caps the interval at ${MAX_INTERVAL_DAYS} days`, () => {
    let s = fresh();
    let now = at(2026, 1, 1);
    for (let i = 0; i < 12; i++) {
      s = schedule(s, true, now);
      now = new Date(new Date(s.dueAt).getTime() + HOUR);
    }
    expect(s.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });

  it('an imported card with reps ≥ 2 and intervalDays 0 gets at least a one-day interval, never a dueAt in the past', () => {
    // `schedule()` alone can never produce this state (reps 2 sets 3 days),
    // but an import can, and `round(0 * ease)` would make the card due at
    // today's midnight, before this answer, so it would never leave "due".
    const imported = {
      ...fresh(),
      reps: 2,
      attempts: 2,
      correct: 2,
      intervalDays: 0,
      dueAt: new Date(0).toISOString(),
    };
    const now = at(2026, 3, 2);
    const s = schedule(imported, true, now);
    expect(s).toMatchObject({ outcome: 'advanced', reps: 3, intervalDays: 1 });
    expect(new Date(s.dueAt).getTime()).toBeGreaterThan(now.getTime());
    expect(schedule({ ...imported, intervalDays: 0.1 }, true, now).intervalDays).toBe(1);
  });

  it('startOfLocalDay steps calendar days across DST (spring forward on 8 March 2026)', () => {
    const d = startOfLocalDay(at(2026, 3, 7, 23, 30), 1);
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(0);
    expect(startOfLocalDay(at(2026, 3, 8, 12), 1).getDate()).toBe(9);
  });

  const SEED_A = 20260923;
  it(`property (seed ${SEED_A}): for any answer sequence, 1.3 ≤ ease ≤ 2.8, 0 ≤ interval ≤ ${MAX_INTERVAL_DAYS}, correct ≤ attempts, lapses ≤ attempts, dueAt ≥ lastAnsweredAt`, () => {
    const rng = mulberry32(SEED_A);
    for (let run = 0; run < 500; run++) {
      let s = fresh();
      let now = at(2026, 1, 1).getTime();
      const steps = 1 + Math.floor(rng() * 30);
      for (let i = 0; i < steps; i++) {
        // Gaps from seconds to weeks, so both practice and real reviews happen.
        now += Math.floor(rng() ** 3 * 20 * DAY);
        s = schedule(s, rng() < 0.7, new Date(now));
        expect(s.ease).toBeGreaterThanOrEqual(1.3 - 1e-9);
        expect(s.ease).toBeLessThanOrEqual(2.8 + 1e-9);
        expect(s.intervalDays).toBeGreaterThanOrEqual(0);
        expect(s.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
        expect(s.correct).toBeLessThanOrEqual(s.attempts);
        expect(s.lapses).toBeLessThanOrEqual(s.attempts);
        expect(new Date(s.dueAt).getTime()).toBeGreaterThanOrEqual(new Date(s.lastAnsweredAt).getTime());
      }
    }
  });

  const SEED_B = 434;
  it(`property (seed ${SEED_B}): mastered ⇒ two correct answers, the second on a later local day than the first`, () => {
    const rng = mulberry32(SEED_B);
    for (let run = 0; run < 500; run++) {
      let s = fresh();
      let now = at(2026, 1, 1).getTime();
      let lastRepDay = null;
      for (let i = 0; i < 25; i++) {
        now += Math.floor(rng() ** 4 * 5 * DAY);
        const before = s;
        s = schedule(s, rng() < 0.8, new Date(now));
        const day = localDayKey(new Date(now));
        if (s.outcome === 'advanced') expect(day > lastRepDay).toBe(true);
        if (s.outcome === 'learned' || s.outcome === 'advanced') lastRepDay = day;
        if (isMastered(s)) expect(s.correct).toBeGreaterThanOrEqual(2);
        if (s.outcome === 'practice') expect(s.reps).toBe(before.reps);
      }
    }
  });

  const SEED_C = 7;
  it(`property (seed ${SEED_C}): replaying an attempt log gives the same XP as summing xpFor live`, () => {
    const rng = mulberry32(SEED_C);
    const states = new Map();
    const log = [];
    let live = 0;
    let now = at(2026, 1, 1).getTime();
    for (let i = 0; i < 2000; i++) {
      now += Math.floor(rng() ** 3 * 3 * DAY);
      const questionId = `q${Math.floor(rng() * 20)}`;
      const gaveUp = rng() < 0.05;
      const correct = !gaveUp && rng() < 0.7;
      const before = states.get(questionId) ?? emptyCardState('p', questionId);
      const after = schedule(before, correct, new Date(now));
      live += xpFor(after.outcome, { wasFirstAttempt: before.attempts === 0, gaveUp });
      states.set(questionId, after);
      log.push({ questionId, correct, gaveUp, answeredAt: new Date(now).toISOString() });
    }
    expect(replayXp(log, (id) => emptyCardState('p', id))).toBe(live);
  });
});

describe('xpFor()', () => {
  it('pays 10 first time, 6 later, 2 for effort, 1 for practice, 0 for giving up', () => {
    expect(xpFor('learned', { wasFirstAttempt: true })).toBe(10);
    expect(xpFor('advanced', { wasFirstAttempt: false })).toBe(6);
    expect(xpFor('learned', { wasFirstAttempt: false })).toBe(6);
    expect(xpFor('failed', { wasFirstAttempt: true })).toBe(2);
    expect(xpFor('lapsed', { wasFirstAttempt: false })).toBe(2);
    expect(xpFor('practice', { wasFirstAttempt: false })).toBe(1);
    expect(xpFor('failed', { wasFirstAttempt: true, gaveUp: true })).toBe(0);
  });
});

describe('levelFor()', () => {
  it('has boundaries at each threshold, progressToNext in [0,1], and the top level has nextAtXp null', () => {
    for (const [i, l] of LEVELS.entries()) {
      expect(levelFor(l.xp).level).toBe(l.level);
      if (l.xp > 0) expect(levelFor(l.xp - 1).level).toBe(LEVELS[i - 1].level);
    }
    for (const xp of [0, 1, 149, 150, 999, 4499, 4500, 100_000]) {
      const p = levelFor(xp).progressToNext;
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    const top = levelFor(LEVELS.at(-1).xp + 1);
    expect(top.nextAtXp).toBeNull();
    expect(top.progressToNext).toBe(1);
  });
});
