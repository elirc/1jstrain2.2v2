import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { curriculum, getQuestion } from '@jstrain/content';

import { readConfig } from '../src/config.js';
import { toErrorResponse } from '../src/app.js';
import { backends, correctResponse, DAY, makeClock, mulberry32, startServer, wrongResponse } from './helpers.js';

const mcq = curriculum.questions.find((q) => q.type === 'mcq');
const order = curriculum.questions.find((q) => q.type === 'order');

describe.each(backends)('HTTP API on %s', (backend, make) => {
  let ctx;
  let server;
  let api;
  let me;
  const clock = makeClock('2026-03-02T18:00:00.000Z');

  beforeAll(async () => {
    ctx = await make();
    me = ctx.store.createProfile('Me', clock()).id;
    server = await startServer({ store: ctx.store, now: clock, rng: mulberry32(11) });
    api = server.api;
  });
  afterAll(async () => {
    await server?.close();
    ctx?.cleanup();
  });

  describe('the error envelope', () => {
    it('invalid JSON → 400 invalid_json; oversized → 413 payload_too_large', async () => {
      const bad = await api('POST', '/api/sessions', { profile: me, raw: '{"mode": ' });
      expect(bad.status).toBe(400);
      expect(bad.body.error.code).toBe('invalid_json');
      const big = await api('POST', '/api/sessions', { profile: me, body: { pad: 'x'.repeat(70_000) } });
      expect(big.status).toBe(413);
      expect(big.body.error.code).toBe('payload_too_large');
    });

    it('unknown /api path and /api itself → 404 JSON not_found', async () => {
      for (const path of ['/api/nope', '/api']) {
        const res = await api('GET', path);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('not_found');
      }
    });

    it('missing x-profile-id → 400 profile_required; unknown → 404 not_found', async () => {
      expect((await api('GET', '/api/progress')).body.error.code).toBe('profile_required');
      const unknown = await api('GET', '/api/progress', { profile: 'no-such-profile' });
      expect(unknown.status).toBe(404);
      expect(unknown.body.error.code).toBe('not_found');
    });

    it('never passes through a code that is not on the allowlist, and hides 5xx messages', () => {
      const enoent = Object.assign(new Error('ENOENT: C:\\secret\\index.html'), { status: 404, code: 'ENOENT' });
      expect(toErrorResponse(enoent).body.error).toEqual({ code: 'not_found', message: 'Not found.' });
      expect(toErrorResponse(new Error('SQLITE_CORRUPT at C:\\x')).body.error).toEqual({
        code: 'internal_error',
        message: 'Something went wrong.',
      });
    });
  });

  describe('health, profiles and settings', () => {
    it('/api/health reports the backend, schema version and why a fallback is in use', async () => {
      const res = await api('GET', '/api/health');
      expect(res.body.data).toMatchObject({
        status: 'ok',
        storeBackend: backend,
        storeFallbackReason: null,
        schemaVersion: 2,
      });
    });

    it('profile names are validated: an object is 400, not "[object Object]"', async () => {
      const res = await api('POST', '/api/profiles', { body: { name: { a: 1 } } });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({ code: 'validation_failed', details: { field: 'name' } });
      expect((await api('POST', '/api/profiles', { body: [] })).status).toBe(400);
      expect((await api('POST', '/api/profiles', { body: { name: 'a\u0000b' } })).status).toBe(400);
    });

    it('deleting the last profile → 409 last_profile; with two, 204', async () => {
      const lonely = await startServerWithFreshStore();
      try {
        const [only] = (await lonely.api('GET', '/api/profiles')).body.data;
        const res = await lonely.api('DELETE', `/api/profiles/${only.id}`);
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('last_profile');
        const other = (await lonely.api('POST', '/api/profiles', { body: { name: 'Two' } })).body.data;
        expect((await lonely.api('DELETE', `/api/profiles/${other.id}`)).status).toBe(204);
        expect((await lonely.api('DELETE', `/api/profiles/${other.id}`)).status).toBe(404);
      } finally {
        await lonely.close();
      }
    });

    it('settings: defaults, partial PATCH, range errors name the field, and sessionSize drives sessions', async () => {
      const p = (await api('POST', '/api/profiles', { body: { name: 'Settings' } })).body.data.id;
      expect((await api('GET', '/api/settings', { profile: p })).body.data).toEqual({
        dailyGoal: 20,
        sessionSize: 12,
        newPerDay: 10,
      });
      const patched = await api('PATCH', '/api/settings', { profile: p, body: { sessionSize: 5 } });
      expect(patched.body.data).toEqual({ dailyGoal: 20, sessionSize: 5, newPerDay: 10 });
      const bad = await api('PATCH', '/api/settings', { profile: p, body: { newPerDay: 101 } });
      expect(bad.status).toBe(400);
      expect(bad.body.error.details).toEqual({ field: 'newPerDay' });
      expect((await api('PATCH', '/api/settings', { profile: p, body: { theme: 'dark' } })).body.error.details).toEqual(
        { field: 'theme' },
      );

      const session = await api('POST', '/api/sessions', { profile: p, body: { mode: 'daily', limit: null } });
      expect(session.body.data.requested).toBe(5);
      expect(session.body.data.questions).toHaveLength(5);
      await api('PATCH', '/api/settings', { profile: p, body: { dailyGoal: 1 } });
      expect((await api('GET', '/api/progress', { profile: p })).body.data.today).toMatchObject({
        goal: 1,
        goalMet: false,
      });
    });
  });

  describe('sessions', () => {
    it('limit: null and absent use the setting; 1..40 accepted; 0, 2.5, "abc", 41 → 400', async () => {
      expect((await api('POST', '/api/sessions', { profile: me, body: { limit: null } })).status).toBe(200);
      expect((await api('POST', '/api/sessions', { profile: me, body: {} })).body.data.requested).toBe(12);
      expect((await api('POST', '/api/sessions', { profile: me, body: { limit: 40 } })).body.data.requested).toBe(40);
      for (const limit of [0, 2.5, 'abc', 41]) {
        const res = await api('POST', '/api/sessions', { profile: me, body: { limit } });
        expect(res.status, String(limit)).toBe(400);
        expect(res.body.error).toMatchObject({ code: 'validation_failed', details: { field: 'limit' } });
      }
      expect((await api('POST', '/api/sessions', { profile: me, body: { mode: 'cram' } })).body.error.details).toEqual({
        field: 'mode',
      });
    });

    it('unknown module/stage/track → 404 not_found', async () => {
      for (const body of [
        { mode: 'module', moduleId: 'nope' },
        { mode: 'stage', stageId: 'nope' },
        { mode: 'track', trackId: 'nope' },
      ]) {
        const res = await api('POST', '/api/sessions', { profile: me, body });
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('not_found');
      }
    });

    it('questions carry a reason and no answer key; choices are shuffled per serve', async () => {
      const res = await api('POST', '/api/sessions', {
        profile: me,
        body: { mode: 'module', moduleId: mcq.moduleId, limit: 40 },
      });
      expect(res.body.data).toMatchObject({ mode: 'module', moduleId: mcq.moduleId });
      for (const q of res.body.data.questions) {
        expect(q).not.toHaveProperty('answer');
        expect(['due', 'relearn', 'new', 'practice']).toContain(q.reason);
      }
      const orders = new Set();
      for (let i = 0; i < 8; i++) {
        const detail = await api('GET', `/api/questions/${mcq.id}`, { profile: me });
        orders.add(detail.body.data.question.choices.map((c) => c.id).join());
      }
      expect(orders.size).toBeGreaterThan(1);
    });
  });

  describe('answers', () => {
    it('a malformed answer → 400 invalid_response, nothing stored, nothing revealed', async () => {
      const p = (await api('POST', '/api/profiles', { body: { name: 'Malformed' } })).body.data.id;
      for (const response of [mcq.answer, '1', null, ['x']]) {
        const res = await api('POST', '/api/answers', { profile: p, body: { questionId: mcq.id, response } });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('invalid_response');
        expect(JSON.stringify(res.body)).not.toContain(mcq.why.slice(0, 40));
      }
      expect((await api('POST', '/api/answers', { profile: p, body: [] })).status).toBe(400);
      expect((await api('GET', '/api/progress', { profile: p })).body.data.totals.attempts).toBe(0);
    });

    it('a correct id answer: learned, reveal keeps authored answer and adds answerChoiceIds, state included', async () => {
      const p = (await api('POST', '/api/profiles', { body: { name: 'Answers' } })).body.data.id;
      const res = await api('POST', '/api/answers', {
        profile: p,
        body: { questionId: order.id, response: correctResponse(order), elapsedMs: -99999 },
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        correct: true,
        outcome: 'learned',
        answer: order.answer,
        answerChoiceIds: order.answer.map((i) => order.choices[i].id),
        xpEarned: 10,
        state: { attempts: 1, correct: 1, reps: 1, lapses: 0 },
      });
      const history = (await api('GET', `/api/questions/${order.id}`, { profile: p })).body.data.history;
      expect(history[0].elapsedMs).toBeNull();
    });

    it('xp from /progress equals the sum of xpEarned, including practice, give-ups and answers over a year old', async () => {
      const local = makeClock('2025-01-05T17:00:00.000Z');
      const s = await startServerWithFreshStore({ now: local });
      try {
        const [p] = (await s.api('GET', '/api/profiles')).body.data;
        const rng = mulberry32(21);
        let sum = 0;
        for (let i = 0; i < 60; i++) {
          local.advance(Math.floor(rng() ** 3 * 4 * DAY));
          const q = curriculum.questions[Math.floor(rng() * 8)];
          const body =
            rng() < 0.08
              ? { questionId: q.id, giveUp: true }
              : { questionId: q.id, response: rng() < 0.7 ? correctResponse(q) : wrongResponse(q) };
          sum += (await s.api('POST', '/api/answers', { profile: p.id, body })).body.data.xpEarned;
        }
        local.advance(500 * DAY);
        expect((await s.api('GET', '/api/progress', { profile: p.id })).body.data.xp).toBe(sum);
      } finally {
        await s.close();
      }
    });
  });

  describe('question detail, attempts and flags', () => {
    it('GET /questions/:id hides the answer until attempted, then shows reveal and history', async () => {
      const p = (await api('POST', '/api/profiles', { body: { name: 'Detail' } })).body.data.id;
      const before = (await api('GET', `/api/questions/${mcq.id}`, { profile: p })).body.data;
      expect(before).toMatchObject({ reveal: null, history: [], flag: null, state: { attempts: 0, dueAt: null } });
      expect(before.question).not.toHaveProperty('answer');

      await api('POST', '/api/answers', { profile: p, body: { questionId: mcq.id, response: wrongResponse(mcq) } });
      const after = (await api('GET', `/api/questions/${mcq.id}`, { profile: p })).body.data;
      expect(after.reveal).toMatchObject({
        answer: mcq.answer,
        answerChoiceIds: [mcq.choices[mcq.answer].id],
        why: mcq.why,
      });
      expect(after.history).toEqual([expect.objectContaining({ correct: false, gaveUp: false })]);
      expect((await api('GET', '/api/questions/nope', { profile: p })).status).toBe(404);
    });

    it('GET /attempts pages newest first with nextBefore and filters by correct and module', async () => {
      const p = (await api('POST', '/api/profiles', { body: { name: 'Attempts' } })).body.data.id;
      const qs = curriculum.questions.slice(0, 5);
      for (const q of qs) {
        clock.advance(1000);
        await api('POST', '/api/answers', { profile: p, body: { questionId: q.id, response: wrongResponse(q) } });
      }
      const page1 = (await api('GET', '/api/attempts?limit=2', { profile: p })).body.data;
      expect(page1.items.map((a) => a.questionId)).toEqual([qs[4].id, qs[3].id]);
      expect(page1.items[0]).toMatchObject({ type: qs[4].type, prompt: qs[4].prompt, correct: false, gaveUp: false });
      const page3 = (await api('GET', `/api/attempts?limit=2&before=${page1.nextBefore}`, { profile: p })).body.data;
      expect(page3.items.map((a) => a.questionId)).toEqual([qs[2].id, qs[1].id]);
      const last = (await api('GET', `/api/attempts?limit=2&before=${page3.nextBefore}`, { profile: p })).body.data;
      expect(last).toMatchObject({ nextBefore: null });
      expect(last.items).toHaveLength(1);
      expect((await api('GET', '/api/attempts?correct=true', { profile: p })).body.data.items).toEqual([]);
      const byModule = (await api('GET', `/api/attempts?moduleId=${qs[0].moduleId}`, { profile: p })).body.data.items;
      expect(byModule.every((a) => a.moduleId === qs[0].moduleId)).toBe(true);
      expect((await api('GET', '/api/attempts?limit=500', { profile: p })).body.error.details).toEqual({
        field: 'limit',
      });
    });

    it('flags: PUT is an idempotent upsert, DELETE is 204 either way, GET /flags and the flagged mode list them', async () => {
      const p = (await api('POST', '/api/profiles', { body: { name: 'Flags' } })).body.data.id;
      const put = await api('PUT', `/api/questions/${mcq.id}/flag`, { profile: p, body: { note: 'ask about this' } });
      expect(put.body.data).toMatchObject({ questionId: mcq.id, note: 'ask about this' });
      const again = await api('PUT', `/api/questions/${mcq.id}/flag`, { profile: p, body: {} });
      expect(again.body.data).toMatchObject({ note: '', createdAt: put.body.data.createdAt });
      expect(
        (await api('PUT', `/api/questions/${mcq.id}/flag`, { profile: p, body: { note: 'x'.repeat(501) } })).status,
      ).toBe(400);

      const flags = (await api('GET', '/api/flags', { profile: p })).body.data;
      expect(flags).toEqual([
        expect.objectContaining({
          questionId: mcq.id,
          moduleId: mcq.moduleId,
          trackId: mcq.trackId,
          prompt: mcq.prompt,
        }),
      ]);
      const session = (await api('POST', '/api/sessions', { profile: p, body: { mode: 'flagged' } })).body.data;
      expect(session.questions.map((q) => q.id)).toEqual([mcq.id]);
      const module = (await api('GET', `/api/modules/${mcq.moduleId}`, { profile: p })).body.data;
      expect(module.questions.find((q) => q.id === mcq.id).state).toMatchObject({ flagged: true, reps: 0, lapses: 0 });

      expect((await api('DELETE', `/api/questions/${mcq.id}/flag`, { profile: p })).status).toBe(204);
      expect((await api('DELETE', `/api/questions/${mcq.id}/flag`, { profile: p })).status).toBe(204);
      expect((await api('POST', '/api/sessions', { profile: p, body: { mode: 'flagged' } })).body.data).toMatchObject({
        questions: [],
        empty: true,
      });
    });
  });

  describe('export and import', () => {
    it('export is path-scoped and an attachment; import creates a new profile and reports unknown ids', async () => {
      const p = (await api('POST', '/api/profiles', { body: { name: 'Export Me!' } })).body.data.id;
      await api('POST', '/api/answers', { profile: p, body: { questionId: mcq.id, response: correctResponse(mcq) } });
      await api('PUT', `/api/questions/${mcq.id}/flag`, { profile: p, body: { note: 'n' } });
      await api('PATCH', '/api/settings', { profile: p, body: { sessionSize: 7 } });

      const exp = await api('GET', `/api/profiles/${p}/export`);
      expect(exp.status).toBe(200);
      expect(exp.headers.get('content-disposition')).toBe('attachment; filename="stack-ready-export-me.json"');
      const doc = exp.body;
      expect(doc).toMatchObject({
        format: 'stack-ready-profile',
        version: 1,
        profile: { name: 'Export Me!' },
        settings: { sessionSize: 7 },
      });
      expect(doc.cardStates).toHaveLength(1);
      expect(doc.attempts).toHaveLength(1);
      expect(doc.flags).toHaveLength(1);

      doc.attempts.push({ ...doc.attempts[0], questionId: 'gone-from-content-1' });
      const imp = await api('POST', '/api/profiles/import', { body: { ...doc, name: 'Restored' } });
      expect(imp.status).toBe(201);
      expect(imp.body.data).toMatchObject({
        profile: { name: 'Restored' },
        imported: { cardStates: 1, attempts: 1, flags: 1 },
        skipped: { unknownQuestionIds: ['gone-from-content-1'] },
      });
      const restored = imp.body.data.profile.id;
      expect(restored).not.toBe(p);
      expect((await api('GET', '/api/settings', { profile: restored })).body.data.sessionSize).toBe(7);
      expect((await api('GET', '/api/progress', { profile: restored })).body.data.xp).toBe(
        (await api('GET', '/api/progress', { profile: p })).body.data.xp,
      );
      expect((await api('GET', '/api/profiles/nope/export')).status).toBe(404);
    });

    it('import rejects a wrong format or version with validation_failed, bad rows name the field, and the 10 MB route limit is its own', async () => {
      const wrong = await api('POST', '/api/profiles/import', { body: { format: 'other', version: 1 } });
      expect(wrong.body.error).toMatchObject({ code: 'validation_failed', details: { field: 'format' } });
      const version = await api('POST', '/api/profiles/import', {
        body: { format: 'stack-ready-profile', version: 2 },
      });
      expect(version.body.error.details).toEqual({ field: 'version' });
      const row = await api('POST', '/api/profiles/import', {
        body: {
          format: 'stack-ready-profile',
          version: 1,
          attempts: [{ questionId: mcq.id, correct: 'yes', answeredAt: 'x' }],
        },
      });
      expect(row.body.error.details).toEqual({ field: 'attempts[0].correct' });

      // 200 kB is over the global 64 kB limit but fine on the import route.
      const padded = await api('POST', '/api/profiles/import', {
        body: { format: 'stack-ready-profile', version: 1, name: 'Big', pad: 'x'.repeat(200_000) },
      });
      expect(padded.status).toBe(201);
      const huge = await api('POST', '/api/profiles/import', {
        raw: JSON.stringify({ pad: 'x'.repeat(10.5 * 1024 * 1024) }),
      });
      expect(huge.status).toBe(413);
      expect(huge.body.error.code).toBe('payload_too_large');
      expect(huge.body.error.message).toContain('10 MB');
      expect((await api('GET', '/api/attempts?before=0', { profile: me })).body.error.message).toBe(
        'before must be a whole number of at least 1.',
      );
    });
  });

  async function startServerWithFreshStore({ now = clock } = {}) {
    const fresh = await make();
    fresh.store.createProfile('Only', now());
    const s = await startServer({ store: fresh.store, now, rng: mulberry32(3) });
    return { api: s.api, close: async () => (await s.close(), fresh.cleanup()) };
  }
});

describe('readConfig', () => {
  it('binds loopback by default, validates PORT and parses SERVE_CLIENT as a tri-state', () => {
    expect(readConfig({}).host).toBe('127.0.0.1');
    expect(() => readConfig({ PORT: '70000' })).toThrow(/PORT/);
    expect(() => readConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(readConfig({ NODE_ENV: 'production' }).serveClient).toBe(true);
    expect(readConfig({ NODE_ENV: 'production', SERVE_CLIENT: 'false' }).serveClient).toBe(false);
    expect(readConfig({ SERVE_CLIENT: 'true' }).serveClient).toBe(true);
    expect(() => readConfig({ SERVE_CLIENT: 'yes' })).toThrow(/SERVE_CLIENT/);
  });

  it('resolves a relative DATA_DIR against server/, not the working directory', () => {
    const { dataDir } = readConfig({ DATA_DIR: 'data' });
    expect(dataDir.replace(/\\/g, '/')).toMatch(/\/server\/data$/);
  });
});

describe('the SPA fallback', () => {
  it('serves index.html for client routes only; /api and missing assets are 404', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { tempDir, removeDir } = await import('./helpers.js');
    const dist = tempDir();
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>app</title>');
    const [, make] = backends[1];
    const ctx = await make();
    const s = await startServer({ store: ctx.store, config: { serveClient: true, clientDist: dist } });
    try {
      const page = await s.api('GET', '/drill/js-values', { headers: { accept: 'text/html' } });
      expect(page.status).toBe(200);
      expect(page.body).toContain('<title>app</title>');
      expect((await s.api('GET', '/assets/nope.js', { headers: { accept: 'text/html' } })).status).toBe(404);
      expect((await s.api('GET', '/api', { headers: { accept: 'text/html' } })).status).toBe(404);
    } finally {
      await s.close();
      ctx.cleanup();
      removeDir(dist);
    }
  });
});

// Keep this file honest about the content it relies on.
it('fixtures exist in the current content', () => {
  expect(getQuestion(mcq.id)).toBeDefined();
  expect(getQuestion(order.id)).toBeDefined();
});
