import { describe, expect, it } from 'vitest';

import { drillHref, parseDrillParams, toSessionRequest, type DrillSpec } from './params';

const parse = (qs: string) => parseDrillParams(new URLSearchParams(qs));

describe('parseDrillParams', () => {
  // 40 (M2)
  it('omits limit when the URL does not set it, so sessionSize applies', () => {
    const parsed = parse('mode=daily');
    expect(parsed).toEqual({ ok: true, spec: { mode: 'daily' } });
    if (parsed.ok) expect('limit' in toSessionRequest(parsed.spec)).toBe(false);
    expect(parse('mode=daily&limit=abc')).toEqual({ ok: true, spec: { mode: 'daily' } });
  });

  it('clamps a present limit into 1..40', () => {
    expect(parse('limit=500')).toEqual({ ok: true, spec: { mode: 'daily', limit: 40 } });
    expect(parse('limit=0')).toEqual({ ok: true, spec: { mode: 'daily', limit: 1 } });
    expect(parse('limit=7.9')).toEqual({ ok: true, spec: { mode: 'daily', limit: 7 } });
  });

  it('validates the mode and its required id', () => {
    expect(parse('mode=foo').ok).toBe(false);
    expect(parse('mode=module').ok).toBe(false);
    expect(parse('mode=track&trackId=js')).toEqual({ ok: true, spec: { mode: 'track', trackId: 'js' } });
    expect(parse('mode=flagged')).toEqual({ ok: true, spec: { mode: 'flagged' } });
  });

  it('drillHref round-trips every spec', () => {
    const specs: DrillSpec[] = [
      { mode: 'daily' },
      { mode: 'review', limit: 5 },
      { mode: 'module', moduleId: 'js-values' },
      { mode: 'track', trackId: 'js', limit: 20 },
      { mode: 'stage', stageId: 's 2/x' },
      { mode: 'flagged' },
    ];
    for (const spec of specs) {
      const href = drillHref(spec);
      expect(href.startsWith('/drill?')).toBe(true);
      expect(parse(href.slice('/drill?'.length))).toEqual({ ok: true, spec });
    }
  });
});
