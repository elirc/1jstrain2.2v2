/**
 * The typed API client.
 *
 * One place that knows about `/api`, the profile header and the
 * `{ data } | { error }` envelope, so no component ever calls `fetch` directly.
 * It trusts nothing it receives: a body that is not an envelope, a fetch that
 * rejects and a request that runs too long all become an `ApiError` with a
 * code the UI can branch on.
 */

import type {
  AnswerRequest,
  AnswerResult,
  ApiErrorCode,
  AttemptPage,
  Curriculum,
  ExportDocument,
  Flag,
  Health,
  ImportResult,
  Module,
  Profile,
  Progress,
  QuestionDetail,
  QuestionWithState,
  Session,
  SessionMode,
  Settings,
} from './types';

export class ApiError extends Error {
  // Written out rather than using constructor parameter properties, which
  // `erasableSyntaxOnly` forbids — that flag keeps every construct in the file
  // removable by a single-file transpiler like esbuild.
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, status: number, code: ApiErrorCode, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** `true` for an ApiError, optionally one with a particular code. */
export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

/** `true` when a request was cancelled on purpose (unmount, superseded key). */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** A human sentence for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const KNOWN_CODES = new Set<string>([
  'invalid_json',
  'validation_failed',
  'invalid_response',
  'profile_required',
  'not_found',
  'last_profile',
  'payload_too_large',
  'internal_error',
]);

function toCode(raw: unknown, status: number): ApiErrorCode {
  if (typeof raw === 'string' && KNOWN_CODES.has(raw)) return raw as ApiErrorCode;
  if (status === 404) return 'not_found';
  if (status === 413) return 'payload_too_large';
  return 'unknown';
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

export const REQUEST_TIMEOUT_MS = 15_000;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Serialised as the JSON body. */
  json?: unknown;
  profileId?: string | null;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Combines the caller's signal with a timeout, where the platform allows it. */
function withTimeout(signal: AbortSignal | undefined): AbortSignal | undefined {
  if (typeof AbortSignal.timeout !== 'function') return signal;
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (!signal) return timeout;
  if (typeof AbortSignal.any !== 'function') return signal;
  return AbortSignal.any([signal, timeout]);
}

function isEnvelope(body: unknown): body is { data: unknown } | { error: unknown } {
  return body !== null && typeof body === 'object' && ('data' in body || 'error' in body);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, profileId, signal, headers = {} } = options;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal: withTimeout(signal),
      headers: {
        ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(profileId ? { 'x-profile-id': profileId } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch (err) {
    // The caller cancelled: let that through untouched so it can be ignored.
    if (signal?.aborted) throw signal.reason ?? err;
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new ApiError('The Stack Ready API took too long to answer.', 0, 'network');
    }
    throw new ApiError('Cannot reach the Stack Ready API. Is the server running?', 0, 'network');
  }

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = isEnvelope(body) && 'error' in body ? (body.error as Record<string, unknown>) : null;
    const message = error && typeof error.message === 'string' ? error.message : `Request failed (${response.status}).`;
    const details =
      error && error.details && typeof error.details === 'object'
        ? (error.details as Record<string, unknown>)
        : undefined;
    throw new ApiError(message, response.status, toCode(error?.code, response.status), details);
  }

  if (!isEnvelope(body) || !('data' in body)) {
    throw new ApiError(
      'The API answered with something that is not Stack Ready data.',
      response.status,
      'bad_response',
    );
  }
  return body.data as T;
}

const enc = encodeURIComponent;

export interface SessionRequest {
  mode: SessionMode;
  moduleId?: string;
  stageId?: string;
  trackId?: string;
  /** Omitted unless the URL sets it, so the learner's `sessionSize` applies. */
  limit?: number;
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>('/health', { signal }),

  listProfiles: (signal?: AbortSignal) => request<Profile[]>('/profiles', { signal }),
  createProfile: (name: string) => request<Profile>('/profiles', { method: 'POST', json: { name } }),
  deleteProfile: (id: string) => request<void>(`/profiles/${enc(id)}`, { method: 'DELETE' }),
  /** A plain URL: the export route is path-scoped, so `<a download>` works without a header. */
  exportUrl: (profileId: string) => `/api/profiles/${enc(profileId)}/export`,
  importProfile: (doc: ExportDocument, name?: string) =>
    request<ImportResult>('/profiles/import', {
      method: 'POST',
      json: name ? { ...doc, name } : doc,
    }),

  curriculum: (signal?: AbortSignal) => request<Curriculum>('/curriculum', { signal }),

  module: (id: string, profileId: string, signal?: AbortSignal) =>
    request<{ module: Module; questions: QuestionWithState[] }>(`/modules/${enc(id)}`, {
      profileId,
      signal,
    }),

  question: (id: string, profileId: string, signal?: AbortSignal) =>
    request<QuestionDetail>(`/questions/${enc(id)}`, { profileId, signal }),

  attempts: (
    profileId: string,
    query: { limit?: number; before?: number; correct?: boolean; moduleId?: string } = {},
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams();
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    if (query.before !== undefined) params.set('before', String(query.before));
    if (query.correct !== undefined) params.set('correct', String(query.correct));
    if (query.moduleId) params.set('moduleId', query.moduleId);
    const qs = params.toString();
    return request<AttemptPage>(`/attempts${qs ? `?${qs}` : ''}`, { profileId, signal });
  },

  startSession: (profileId: string, body: SessionRequest, signal?: AbortSignal) =>
    request<Session>('/sessions', { method: 'POST', profileId, json: body, signal }),

  answer: (profileId: string, body: AnswerRequest, signal?: AbortSignal) =>
    request<AnswerResult>('/answers', { method: 'POST', profileId, json: body, signal }),

  flag: (id: string, profileId: string, note?: string) =>
    request<{ questionId: string; note: string; createdAt: string }>(`/questions/${enc(id)}/flag`, {
      method: 'PUT',
      profileId,
      json: note ? { note } : {},
    }),
  unflag: (id: string, profileId: string) =>
    request<void>(`/questions/${enc(id)}/flag`, { method: 'DELETE', profileId }),
  flags: (profileId: string, signal?: AbortSignal) => request<Flag[]>('/flags', { profileId, signal }),

  settings: (profileId: string, signal?: AbortSignal) => request<Settings>('/settings', { profileId, signal }),
  updateSettings: (profileId: string, patch: Partial<Settings>) =>
    request<Settings>('/settings', { method: 'PATCH', profileId, json: patch }),

  progress: (profileId: string, signal?: AbortSignal) => request<Progress>('/progress', { profileId, signal }),
  resetProgress: (profileId: string) => request<void>('/progress/reset', { method: 'POST', profileId }),
};
