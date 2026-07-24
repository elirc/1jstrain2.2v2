/**
 * CAPSTONE 1 — An analytics pipeline
 * ===================================
 *
 * Everything you have built so far, in one file: parse untrusted JSON at the
 * boundary (TS-03), reshape arrays (JS-03), aggregate with reduce (JS-10),
 * handle dates (JS-09) and model the result with precise types (TS-04/06).
 *
 * The brief: a service posts you a blob of raw event records. Turn them into
 * a report a product manager could read, and never let a malformed record
 * crash the process.
 *
 * Run:  npx vitest run tests/capstone/01-analytics-pipeline.test.ts
 */

/** A validated event. Nothing else may enter the pipeline. */
export interface AnalyticsEvent {
  id: string;
  userId: string;
  type: 'pageview' | 'click' | 'purchase';
  path: string;
  durationMs: number;
  /** ISO-8601 UTC timestamp. */
  at: string;
  /** Present on purchases only. */
  revenue?: number;
}

export const EVENT_TYPES = ['pageview', 'click', 'purchase'] as const;

/**
 * PROBLEM 1 — Validate one record.
 *
 * Return an AnalyticsEvent, or null when anything is wrong. Requirements:
 *   - `id`, `userId` and `path` are non-empty strings
 *   - `type` is one of EVENT_TYPES
 *   - `durationMs` is a finite number >= 0
 *   - `at` parses as a valid date
 *   - `revenue`, if present, is a finite number >= 0; it is REQUIRED for
 *     'purchase' events and must be absent from the result otherwise
 *   - unknown extra properties are dropped
 */
export function parseEvent(value: unknown): AnalyticsEvent | null {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — Validate a batch.
 *
 * Return the valid events (input order) plus how many were rejected.
 * A non-array input yields `{ events: [], rejected: 0 }`.
 */
export function parseEvents(value: unknown): { events: AnalyticsEvent[]; rejected: number } {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — Percentiles.
 *
 * Nearest-rank percentile: sort ascending, take the value at index
 * `ceil(p/100 * n) - 1` (clamped into range). Return null for an empty list.
 *
 *   percentile([1,2,3,4,5,6,7,8,9,10], 95) -> 10
 *   percentile([1,2,3,4], 50)              -> 2
 */
export function percentile(values: readonly number[], p: number): number | null {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — Bucket by UTC day.
 *
 * Return a Map from 'YYYY-MM-DD' to the events of that day, with the days in
 * ascending order and each day's events in input order.
 */
export function bucketByDay(
  events: readonly AnalyticsEvent[],
): Map<string, AnalyticsEvent[]> {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — The daily summary.
 *
 * For a list of events produce:
 *   {
 *     events: number,            // how many
 *     uniqueUsers: number,       // distinct userId
 *     byType: Record<'pageview'|'click'|'purchase', number>,   // ALL keys present, zeros included
 *     revenue: number,           // total, rounded to 2 decimals
 *     p95DurationMs: number | null,
 *   }
 */
export interface DaySummary {
  events: number;
  uniqueUsers: number;
  byType: Record<AnalyticsEvent['type'], number>;
  revenue: number;
  p95DurationMs: number | null;
}

export function summarize(events: readonly AnalyticsEvent[]): DaySummary {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — Top pages.
 *
 * The `limit` paths with the most events, highest first. Ties break by path
 * ascending. Each entry is `{ path, events, uniqueUsers }`.
 */
export function topPages(
  events: readonly AnalyticsEvent[],
  limit: number,
): Array<{ path: string; events: number; uniqueUsers: number }> {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — The whole pipeline.
 *
 * Take RAW input (straight from JSON.parse — so `unknown`) and produce the
 * report. Options:
 *   from / to   inclusive 'YYYY-MM-DD' bounds on the UTC day (optional)
 *   topPages    how many pages to include (default 3)
 *
 * The report:
 *   {
 *     rejected: number,                       // invalid records
 *     range: { from: string, to: string } | null,   // first and last day WITH events
 *     totals: DaySummary,                     // across the whole (filtered) range
 *     days: Array<{ day: string } & DaySummary>,    // ascending
 *     topPages: ReturnType<typeof topPages>,
 *   }
 *
 * With no events at all, `range` is null, `days` is empty, and `totals` is a
 * zeroed summary.
 */
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
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — Render it for a human.
 *
 * Return the report as lines of text:
 *
 *   Report: 2024-03-01 to 2024-03-02
 *   Events: 5 (1 rejected)
 *   Users: 3
 *   Revenue: $42.50
 *   p95 duration: 900ms
 *   Top pages:
 *     /home — 3 events, 2 users
 *     /pricing — 1 event, 1 user
 *
 * Details:
 *   - the header is 'Report: (no data)' when there is no range
 *   - the '(N rejected)' suffix is omitted when nothing was rejected
 *   - 'p95 duration: n/a' when it is null
 *   - 'event'/'user' are singular for 1
 *   - the 'Top pages:' block is omitted entirely when there are none
 * Join the lines with '\n' and do not add a trailing newline.
 */
export function formatReport(report: Report): string {
  throw new Error('TODO');
}
