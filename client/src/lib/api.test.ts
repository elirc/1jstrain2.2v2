import { describe, expect, it, vi } from 'vitest';

import { deferred, mockFetch } from '../test/fetchMock';
import { api, ApiError, isApiError } from './api';

describe('api client', () => {
  // 28
  it('unwraps { data }', async () => {
    mockFetch({ 'GET /api/profiles': { data: [{ id: 'a', name: 'A', createdAt: 'x' }] } });
    await expect(api.listProfiles()).resolves.toEqual([{ id: 'a', name: 'A', createdAt: 'x' }]);
  });

  // 29
  it('throws ApiError with the server code and message on 4xx', async () => {
    mockFetch({
      'PATCH /api/settings': {
        status: 400,
        error: { code: 'validation_failed', message: 'dailyGoal must be 1..500', details: { field: 'dailyGoal' } },
      },
    });
    const err = await api.updateSettings('p', { dailyGoal: 0 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(isApiError(err, 'validation_failed')).toBe(true);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).message).toBe('dailyGoal must be 1..500');
    expect((err as ApiError).details).toEqual({ field: 'dailyGoal' });
  });

  // 30 (B28)
  it('throws bad_response when a 200 body is not an envelope', async () => {
    mockFetch({ 'GET /api/curriculum': { status: 200, raw: '<!doctype html><title>SPA</title>' } });
    const err = await api.curriculum().catch((e: unknown) => e);
    expect(isApiError(err, 'bad_response')).toBe(true);

    mockFetch({ 'GET /api/curriculum': { status: 200, raw: 'null', contentType: 'application/json' } });
    expect(isApiError(await api.curriculum().catch((e: unknown) => e), 'bad_response')).toBe(true);
  });

  // 31
  it('maps a fetch rejection to code "network"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const err = await api.health().catch((e: unknown) => e);
    expect(isApiError(err, 'network')).toBe(true);
    expect((err as Error).message).not.toContain('Failed to fetch');
  });

  // 32 (B25)
  it('encodes path ids', async () => {
    const mock = mockFetch({ 'GET /api/modules/:id': { data: { module: {}, questions: [] } } });
    await api.module('../progress', 'p');
    expect(mock.calls[0].path).toBe('/api/modules/..%2Fprogress');
    expect(mock.calls[0].headers['x-profile-id']).toBe('p');
    expect(api.exportUrl('a/b')).toBe('/api/profiles/a%2Fb/export');
  });

  // 33
  it('passes the AbortSignal through and rejects with AbortError when aborted', async () => {
    const gate = deferred<{ data: unknown }>();
    const mock = mockFetch({ 'GET /api/progress': () => gate.promise });
    const controller = new AbortController();
    const pending = api.progress('p', controller.signal);
    await Promise.resolve();
    expect(mock.calls[0].signal).toBeDefined();
    controller.abort();
    const err = await pending.catch((e: unknown) => e);
    expect((err as DOMException).name).toBe('AbortError');
    expect(isApiError(err)).toBe(false);
  });

  it('sends choice ids and give-up in the answer body, and omits an absent limit', async () => {
    const mock = mockFetch({
      'POST /api/answers': { data: {} },
      'POST /api/sessions': { data: {} },
    });
    await api.answer('p', { questionId: 'q', giveUp: true });
    await api.startSession('p', { mode: 'daily' });
    expect(mock.calls[0].body).toEqual({ questionId: 'q', giveUp: true });
    expect(mock.calls[1].body).toEqual({ mode: 'daily' });
  });

  it('treats 204 as success with no body', async () => {
    mockFetch({ 'DELETE /api/questions/:id/flag': { status: 204, data: null } });
    await expect(api.unflag('q', 'p')).resolves.toBeUndefined();
  });
});
