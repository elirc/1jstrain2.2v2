/**
 * The typed API client.
 *
 * One place that knows about `/api`, the profile header and the
 * `{ data } | { error }` envelope, so no component ever calls `fetch` directly.
 */

import type {
  AnswerResult,
  Curriculum,
  Health,
  Module,
  Profile,
  Progress,
  QuestionWithState,
  Session,
  SessionMode,
} from './types';

export class ApiError extends Error {
  // Written out rather than using constructor parameter properties, which
  // `erasableSyntaxOnly` forbids — that flag keeps every construct in the file
  // removable by a single-file transpiler like esbuild.
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const PROFILE_KEY = 'stack-ready:profile-id';

export function getStoredProfileId(): string | null {
  try {
    return localStorage.getItem(PROFILE_KEY);
  } catch {
    // Private mode and blocked site data both throw here; a missing profile is
    // recoverable (we pick the first one) so this must not take the app down.
    return null;
  }
}

export function setStoredProfileId(id: string | null) {
  try {
    if (id) localStorage.setItem(PROFILE_KEY, id);
    else localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* not fatal — the app just forgets the choice on reload */
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { profileId?: string | null } = {},
): Promise<T> {
  const { profileId, headers, ...rest } = options;

  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { 'content-type': 'application/json' } : {}),
      ...(profileId ? { 'x-profile-id': profileId } : {}),
      ...headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.error?.message ?? `Request failed (${response.status})`,
      response.status,
      body?.error?.code ?? 'unknown',
    );
  }
  return body.data as T;
}

export const api = {
  health: () => request<Health>('/health'),

  listProfiles: () => request<Profile[]>('/profiles'),
  createProfile: (name: string) =>
    request<Profile>('/profiles', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteProfile: (id: string) => request<void>(`/profiles/${id}`, { method: 'DELETE' }),

  curriculum: () => request<Curriculum>('/curriculum'),

  module: (id: string, profileId: string) =>
    request<{ module: Module; questions: QuestionWithState[] }>(`/modules/${id}`, { profileId }),

  startSession: (
    profileId: string,
    body: { mode: SessionMode; moduleId?: string; stageId?: string; trackId?: string; limit?: number },
  ) => request<Session>('/sessions', { method: 'POST', profileId, body: JSON.stringify(body) }),

  answer: (
    profileId: string,
    body: { questionId: string; response: unknown; elapsedMs?: number },
  ) => request<AnswerResult>('/answers', { method: 'POST', profileId, body: JSON.stringify(body) }),

  progress: (profileId: string) => request<Progress>('/progress', { profileId }),
  resetProgress: (profileId: string) =>
    request<void>('/progress/reset', { method: 'POST', profileId }),
};
