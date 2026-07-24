/** Reference solution for CAPSTONE 1. */

export interface AnalyticsEvent {
  id: string;
  userId: string;
  type: 'pageview' | 'click' | 'purchase';
  path: string;
  durationMs: number;
  at: string;
  revenue?: number;
}

export const EVENT_TYPES = ['pageview', 'click', 'purchase'] as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const isEventType = (value: unknown): value is AnalyticsEvent['type'] =>
  typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value);

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function parseEvent(value: unknown): AnalyticsEvent | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  if (!isNonEmptyString(raw.id)) return null;
  if (!isNonEmptyString(raw.userId)) return null;
  if (!isNonEmptyString(raw.path)) return null;
  if (!isEventType(raw.type)) return null;
  if (!isNonNegativeNumber(raw.durationMs)) return null;
  if (!isNonEmptyString(raw.at) || Number.isNaN(new Date(raw.at).getTime())) return null;

  const hasRevenue = raw.revenue !== undefined && raw.revenue !== null;
  if (hasRevenue && !isNonNegativeNumber(raw.revenue)) return null;
  if (raw.type === 'purchase' && !hasRevenue) return null;

  const event: AnalyticsEvent = {
    id: raw.id,
    userId: raw.userId,
    type: raw.type,
    path: raw.path,
    durationMs: raw.durationMs,
    at: raw.at,
  };
  if (raw.type === 'purchase') event.revenue = raw.revenue as number;
  return event;
}

export function parseEvents(value: unknown): { events: AnalyticsEvent[]; rejected: number } {
  if (!Array.isArray(value)) return { events: [], rejected: 0 };

  const events: AnalyticsEvent[] = [];
  let rejected = 0;
  for (const record of value) {
    const parsed = parseEvent(record);
    if (parsed === null) rejected += 1;
    else events.push(parsed);
  }
  return { events, rejected };
}

export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))];
}

const toDay = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function bucketByDay(events: readonly AnalyticsEvent[]): Map<string, AnalyticsEvent[]> {
  const buckets = new Map<string, AnalyticsEvent[]>();
  for (const event of events) {
    const day = toDay(event.at);
    const bucket = buckets.get(day);
    if (bucket) bucket.push(event);
    else buckets.set(day, [event]);
  }
  return new Map([...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

export interface DaySummary {
  events: number;
  uniqueUsers: number;
  byType: Record<AnalyticsEvent['type'], number>;
  revenue: number;
  p95DurationMs: number | null;
}

export function summarize(events: readonly AnalyticsEvent[]): DaySummary {
  const byType = { pageview: 0, click: 0, purchase: 0 } satisfies Record<
    AnalyticsEvent['type'],
    number
  >;
  const users = new Set<string>();
  let revenue = 0;

  for (const event of events) {
    byType[event.type] += 1;
    users.add(event.userId);
    revenue += event.revenue ?? 0;
  }

  return {
    events: events.length,
    uniqueUsers: users.size,
    byType,
    revenue: round2(revenue),
    p95DurationMs: percentile(
      events.map((event) => event.durationMs),
      95,
    ),
  };
}

export function topPages(
  events: readonly AnalyticsEvent[],
  limit: number,
): Array<{ path: string; events: number; uniqueUsers: number }> {
  const byPath = new Map<string, { events: number; users: Set<string> }>();
  for (const event of events) {
    let entry = byPath.get(event.path);
    if (!entry) {
      entry = { events: 0, users: new Set() };
      byPath.set(event.path, entry);
    }
    entry.events += 1;
    entry.users.add(event.userId);
  }

  return [...byPath.entries()]
    .map(([path, entry]) => ({ path, events: entry.events, uniqueUsers: entry.users.size }))
    .sort((a, b) => b.events - a.events || a.path.localeCompare(b.path))
    .slice(0, Math.max(0, limit));
}

export interface Report {
  rejected: number;
  range: { from: string; to: string } | null;
  totals: DaySummary;
  days: Array<{ day: string } & DaySummary>;
  topPages: Array<{ path: string; events: number; uniqueUsers: number }>;
}

export interface ReportOptions {
  from?: string;
  to?: string;
  topPages?: number;
}

export function buildReport(raw: unknown, options: ReportOptions = {}): Report {
  const { from, to, topPages: pageLimit = 3 } = options;
  const { events: all, rejected } = parseEvents(raw);

  const events = all.filter((event) => {
    const day = toDay(event.at);
    if (from !== undefined && day < from) return false;
    if (to !== undefined && day > to) return false;
    return true;
  });

  const buckets = bucketByDay(events);
  const days = [...buckets.entries()].map(([day, dayEvents]) => ({
    day,
    ...summarize(dayEvents),
  }));

  return {
    rejected,
    range:
      days.length === 0
        ? null
        : { from: days[0].day, to: days[days.length - 1].day },
    totals: summarize(events),
    days,
    topPages: topPages(events, pageLimit),
  };
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export function formatReport(report: Report): string {
  const lines: string[] = [];

  lines.push(
    report.range === null
      ? 'Report: (no data)'
      : `Report: ${report.range.from} to ${report.range.to}`,
  );
  lines.push(
    report.rejected === 0
      ? `Events: ${report.totals.events}`
      : `Events: ${report.totals.events} (${report.rejected} rejected)`,
  );
  lines.push(`Users: ${report.totals.uniqueUsers}`);
  lines.push(`Revenue: $${report.totals.revenue.toFixed(2)}`);
  lines.push(
    report.totals.p95DurationMs === null
      ? 'p95 duration: n/a'
      : `p95 duration: ${report.totals.p95DurationMs}ms`,
  );

  if (report.topPages.length > 0) {
    lines.push('Top pages:');
    for (const page of report.topPages) {
      lines.push(
        `  ${page.path} — ${plural(page.events, 'event')}, ${plural(page.uniqueUsers, 'user')}`,
      );
    }
  }

  return lines.join('\n');
}
