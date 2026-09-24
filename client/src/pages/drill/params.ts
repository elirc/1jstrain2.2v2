import type { SessionRequest } from '../../lib/api';
import type { SessionMode } from '../../lib/types';

/**
 * The drill URL, parsed once into a typed spec — and built from one, so no
 * link in the app concatenates a query string by hand (the bug class behind
 * "Another round" dropping `trackId`, J23).
 */

export type DrillSpec = (
  | { mode: 'module'; moduleId: string }
  | { mode: 'track'; trackId: string }
  | { mode: 'stage'; stageId: string }
  | { mode: 'daily' | 'review' | 'weak' | 'flagged' }
) & {
  /** Only when the URL sets it; otherwise the learner's `sessionSize` applies. */
  limit?: number;
};

export const MODES: readonly SessionMode[] = ['daily', 'review', 'module', 'stage', 'track', 'weak', 'flagged'];

export const LIMIT_MIN = 1;
export const LIMIT_MAX = 40;

function isMode(value: string): value is SessionMode {
  return (MODES as readonly string[]).includes(value);
}

/** An integer clamped into range, or `undefined` for anything that is not a number. */
function parseLimit(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Math.trunc(n)));
}

export type ParsedDrill = { ok: true; spec: DrillSpec } | { ok: false; error: string };

export function parseDrillParams(params: URLSearchParams): ParsedDrill {
  const mode = params.get('mode') ?? 'daily';
  if (!isMode(mode)) {
    return { ok: false, error: `“${mode}” is not a kind of drill.` };
  }
  const limit = parseLimit(params.get('limit'));
  const withLimit = <T extends object>(spec: T): T & { limit?: number } =>
    limit === undefined ? spec : { ...spec, limit };

  switch (mode) {
    case 'module': {
      const moduleId = params.get('moduleId');
      if (!moduleId) return { ok: false, error: 'A module drill needs a module.' };
      return { ok: true, spec: withLimit({ mode, moduleId }) };
    }
    case 'track': {
      const trackId = params.get('trackId');
      if (!trackId) return { ok: false, error: 'A track drill needs a track.' };
      return { ok: true, spec: withLimit({ mode, trackId }) };
    }
    case 'stage': {
      const stageId = params.get('stageId');
      if (!stageId) return { ok: false, error: 'A stage drill needs a stage.' };
      return { ok: true, spec: withLimit({ mode, stageId }) };
    }
    default:
      return { ok: true, spec: withLimit({ mode }) };
  }
}

export function drillHref(spec: DrillSpec): string {
  const params = new URLSearchParams({ mode: spec.mode });
  if (spec.mode === 'module') params.set('moduleId', spec.moduleId);
  if (spec.mode === 'track') params.set('trackId', spec.trackId);
  if (spec.mode === 'stage') params.set('stageId', spec.stageId);
  if (spec.limit !== undefined) params.set('limit', String(spec.limit));
  return `/drill?${params.toString()}`;
}

/** The request body for `POST /api/sessions`: `limit` is absent unless the spec has one. */
export function toSessionRequest(spec: DrillSpec): SessionRequest {
  const body: SessionRequest = { mode: spec.mode };
  if (spec.mode === 'module') body.moduleId = spec.moduleId;
  if (spec.mode === 'track') body.trackId = spec.trackId;
  if (spec.mode === 'stage') body.stageId = spec.stageId;
  if (spec.limit !== undefined) body.limit = spec.limit;
  return body;
}

/** A stable string for effect dependencies. */
export function specKey(spec: DrillSpec): string {
  return drillHref(spec);
}
