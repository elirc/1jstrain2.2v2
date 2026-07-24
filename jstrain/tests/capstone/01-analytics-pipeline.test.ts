import { describe, expect, it } from 'vitest';
import {
  bucketByDay,
  buildReport,
  formatReport,
  parseEvent,
  parseEvents,
  percentile,
  summarize,
  topPages,
  type AnalyticsEvent,
} from '@ex/capstone/01-analytics-pipeline';

const event = (over: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  id: 'e1',
  userId: 'u1',
  type: 'pageview',
  path: '/home',
  durationMs: 100,
  at: '2024-03-01T10:00:00Z',
  ...over,
});

const raw = [
  { id: 'e1', userId: 'u1', type: 'pageview', path: '/home', durationMs: 100, at: '2024-03-01T01:00:00Z' },
  { id: 'e2', userId: 'u2', type: 'pageview', path: '/home', durationMs: 300, at: '2024-03-01T02:00:00Z' },
  { id: 'e3', userId: 'u1', type: 'click', path: '/pricing', durationMs: 50, at: '2024-03-01T03:00:00Z' },
  {
    id: 'e4',
    userId: 'u3',
    type: 'purchase',
    path: '/checkout',
    durationMs: 900,
    at: '2024-03-02T05:00:00Z',
    revenue: 42.5,
  },
  { id: 'e5', userId: 'u1', type: 'pageview', path: '/home', durationMs: 200, at: '2024-03-02T06:00:00Z' },
  { id: 'bad', userId: '', type: 'pageview', path: '/x', durationMs: 1, at: '2024-03-01T00:00:00Z' },
];

describe('P1 parseEvent', () => {
  it('accepts a well-formed record', () => {
    expect(parseEvent(raw[0])).toEqual({
      id: 'e1',
      userId: 'u1',
      type: 'pageview',
      path: '/home',
      durationMs: 100,
      at: '2024-03-01T01:00:00Z',
    });
  });

  it('keeps revenue on purchases', () => {
    expect(parseEvent(raw[3])).toMatchObject({ type: 'purchase', revenue: 42.5 });
  });

  it('drops revenue from non-purchases', () => {
    const parsed = parseEvent({ ...raw[0], revenue: 10 });
    expect(parsed).not.toBeNull();
    expect(parsed && 'revenue' in parsed).toBe(false);
  });

  it('drops unknown properties', () => {
    const parsed = parseEvent({ ...raw[0], sneaky: true });
    expect(parsed && Object.keys(parsed).sort()).toEqual([
      'at',
      'durationMs',
      'id',
      'path',
      'type',
      'userId',
    ]);
  });

  it.each([
    ['not an object', null],
    ['an array', []],
    ['a missing id', { ...raw[0], id: undefined }],
    ['an empty id', { ...raw[0], id: '  ' }],
    ['a non-string userId', { ...raw[0], userId: 7 }],
    ['an unknown type', { ...raw[0], type: 'scroll' }],
    ['a negative duration', { ...raw[0], durationMs: -1 }],
    ['a NaN duration', { ...raw[0], durationMs: NaN }],
    ['a bad timestamp', { ...raw[0], at: 'yesterday' }],
    ['a purchase with no revenue', { ...raw[3], revenue: undefined }],
    ['a negative revenue', { ...raw[3], revenue: -5 }],
  ])('rejects %s', (_label, value) => {
    expect(parseEvent(value)).toBe(null);
  });
});

describe('P2 parseEvents', () => {
  it('splits valid from invalid', () => {
    const result = parseEvents(raw);
    expect(result.events).toHaveLength(5);
    expect(result.rejected).toBe(1);
    expect(result.events.map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
  });

  it('tolerates junk input', () => {
    expect(parseEvents(null)).toEqual({ events: [], rejected: 0 });
    expect(parseEvents('nope')).toEqual({ events: [], rejected: 0 });
    expect(parseEvents([])).toEqual({ events: [], rejected: 0 });
    expect(parseEvents([1, 'two', null])).toEqual({ events: [], rejected: 3 });
  });
});

describe('P3 percentile', () => {
  it.each([
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95, 10],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50, 5],
    [[1, 2, 3, 4], 50, 2],
    [[5], 95, 5],
    [[3, 1, 2], 100, 3],
    [[3, 1, 2], 0, 1],
  ])('percentile(%j, %i) === %i', (values, p, expected) => {
    expect(percentile(values, p)).toBe(expected);
  });

  it('returns null for an empty list', () => {
    expect(percentile([], 95)).toBe(null);
  });

  it('does not mutate the input', () => {
    const values = [3, 1, 2];
    percentile(values, 50);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('P4 bucketByDay', () => {
  it('groups by UTC day in ascending order', () => {
    const { events } = parseEvents(raw);
    const buckets = bucketByDay(events);
    expect([...buckets.keys()]).toEqual(['2024-03-01', '2024-03-02']);
    expect(buckets.get('2024-03-01')?.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect(buckets.get('2024-03-02')?.map((e) => e.id)).toEqual(['e4', 'e5']);
  });

  it('sorts days even when the input is unordered', () => {
    const buckets = bucketByDay([
      event({ id: 'b', at: '2024-03-05T00:00:00Z' }),
      event({ id: 'a', at: '2024-03-01T00:00:00Z' }),
    ]);
    expect([...buckets.keys()]).toEqual(['2024-03-01', '2024-03-05']);
  });

  it('handles an empty list', () => {
    expect(bucketByDay([]).size).toBe(0);
  });
});

describe('P5 summarize', () => {
  it('summarizes a day', () => {
    const { events } = parseEvents(raw);
    expect(summarize(events)).toEqual({
      events: 5,
      uniqueUsers: 3,
      byType: { pageview: 3, click: 1, purchase: 1 },
      revenue: 42.5,
      p95DurationMs: 900,
    });
  });

  it('includes every type key, even at zero', () => {
    expect(summarize([event()]).byType).toEqual({ pageview: 1, click: 0, purchase: 0 });
  });

  it('zeroes an empty list', () => {
    expect(summarize([])).toEqual({
      events: 0,
      uniqueUsers: 0,
      byType: { pageview: 0, click: 0, purchase: 0 },
      revenue: 0,
      p95DurationMs: null,
    });
  });

  it('rounds revenue to two decimals', () => {
    const purchases = [
      event({ id: 'a', type: 'purchase', revenue: 0.1 }),
      event({ id: 'b', type: 'purchase', revenue: 0.2 }),
    ];
    expect(summarize(purchases).revenue).toBe(0.3);
  });
});

describe('P6 topPages', () => {
  it('ranks by event count', () => {
    const { events } = parseEvents(raw);
    expect(topPages(events, 3)).toEqual([
      { path: '/home', events: 3, uniqueUsers: 2 },
      { path: '/checkout', events: 1, uniqueUsers: 1 },
      { path: '/pricing', events: 1, uniqueUsers: 1 },
    ]);
  });

  it('respects the limit', () => {
    const { events } = parseEvents(raw);
    expect(topPages(events, 1).map((p) => p.path)).toEqual(['/home']);
    expect(topPages(events, 0)).toEqual([]);
  });

  it('handles no events', () => {
    expect(topPages([], 5)).toEqual([]);
  });
});

describe('P7 buildReport', () => {
  it('builds the whole report', () => {
    const report = buildReport(raw);
    expect(report.rejected).toBe(1);
    expect(report.range).toEqual({ from: '2024-03-01', to: '2024-03-02' });
    expect(report.totals.events).toBe(5);
    expect(report.days.map((d) => d.day)).toEqual(['2024-03-01', '2024-03-02']);
    expect(report.days[0].events).toBe(3);
    expect(report.days[1].revenue).toBe(42.5);
    expect(report.topPages).toHaveLength(3);
  });

  it('filters by day range', () => {
    const report = buildReport(raw, { from: '2024-03-02' });
    expect(report.totals.events).toBe(2);
    expect(report.range).toEqual({ from: '2024-03-02', to: '2024-03-02' });
    expect(report.rejected).toBe(1); // still reported
  });

  it('filters with both bounds inclusively', () => {
    expect(buildReport(raw, { from: '2024-03-01', to: '2024-03-01' }).totals.events).toBe(3);
    expect(buildReport(raw, { from: '2024-03-03' }).totals.events).toBe(0);
  });

  it('honours the topPages limit', () => {
    expect(buildReport(raw, { topPages: 1 }).topPages).toHaveLength(1);
  });

  it('handles no data', () => {
    const report = buildReport([]);
    expect(report).toEqual({
      rejected: 0,
      range: null,
      totals: {
        events: 0,
        uniqueUsers: 0,
        byType: { pageview: 0, click: 0, purchase: 0 },
        revenue: 0,
        p95DurationMs: null,
      },
      days: [],
      topPages: [],
    });
  });

  it('survives complete junk', () => {
    expect(() => buildReport(undefined)).not.toThrow();
    expect(buildReport('nonsense').totals.events).toBe(0);
  });
});

describe('P8 formatReport', () => {
  it('formats a full report', () => {
    expect(formatReport(buildReport(raw, { topPages: 2 }))).toBe(
      [
        'Report: 2024-03-01 to 2024-03-02',
        'Events: 5 (1 rejected)',
        'Users: 3',
        'Revenue: $42.50',
        'p95 duration: 900ms',
        'Top pages:',
        '  /home — 3 events, 2 users',
        '  /checkout — 1 event, 1 user',
      ].join('\n'),
    );
  });

  it('omits the rejected suffix when nothing was rejected', () => {
    const clean = buildReport(raw.slice(0, 3));
    expect(formatReport(clean)).toContain('Events: 3\n');
    expect(formatReport(clean)).not.toContain('rejected');
  });

  it('handles an empty report', () => {
    expect(formatReport(buildReport([]))).toBe(
      ['Report: (no data)', 'Events: 0', 'Users: 0', 'Revenue: $0.00', 'p95 duration: n/a'].join(
        '\n',
      ),
    );
  });

  it('does not end with a newline', () => {
    expect(formatReport(buildReport(raw))).not.toMatch(/\n$/);
  });
});
