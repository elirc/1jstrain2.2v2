/**
 * CAPSTONE 2 — The dashboard
 * ===========================
 *
 * Put CAPSTONE 1 on screen. This is the full stack of everything in the
 * course: async loading with proper states, a custom hook, derived data,
 * composition, and not a single `any`.
 *
 * You may (and should) import your own solutions from capstone 1 — the tests
 * for this file assume `buildReport` already works.
 *
 * Run:  npx vitest run tests/capstone/02-dashboard.test.tsx
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildReport, type DaySummary, type Report } from './01-analytics-pipeline';

/**
 * PROBLEM 1 — The data hook.
 *
 * `useAnalytics(loadRaw, options)`:
 *   - calls `loadRaw()` on mount and whenever `reload()` is called
 *   - runs the raw payload through `buildReport(raw, options)`
 *   - returns `{ status, report, error, reload }` where status is
 *     'loading' | 'ready' | 'error'
 *   - ignores a stale response if a newer request has started
 *   - a change to `options` re-derives the report WITHOUT re-fetching
 *     (that is the whole reason parsing and fetching are separate)
 *
 * Your effect should depend on `loadRaw`, which means CALLERS must pass a
 * stable function — an inline `async () => fetch(...)` would change identity
 * on every render and loop forever. The Dashboard below memoises its options
 * for the same reason.
 */
export interface AnalyticsState {
  status: 'loading' | 'ready' | 'error';
  report: Report | null;
  error: Error | null;
  reload: () => void;
}

export function useAnalytics(
  loadRaw: () => Promise<unknown>,
  options: { from?: string; to?: string; topPages?: number } = {},
): AnalyticsState {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — A metric tile.
 *
 * Render:
 *   <div role="group" aria-label={label}>
 *     <span data-testid="metric-label">{label}</span>
 *     <strong data-testid="metric-value">{value}</strong>
 *     {hint && <small>{hint}</small>}
 *   </div>
 */
export function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — The daily table.
 *
 * A `<table>` with a caption 'Daily breakdown' and columns
 * Day | Events | Users | Revenue, one row per day, revenue formatted as
 * '$0.00'. When there are no days, render `<p>No activity</p>` and no table.
 */
export function DailyTable({ days }: { days: Array<{ day: string } & DaySummary> }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — The top-pages list.
 *
 * An `<ol>` with one `<li>` per page reading `{path} — {events} events`.
 * Render nothing at all (null) when the list is empty.
 */
export function TopPages({
  pages,
}: {
  pages: Array<{ path: string; events: number; uniqueUsers: number }>;
}) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — The screen.
 *
 * Render, in order:
 *   - an `<h1>Analytics</h1>`
 *   - two date inputs labelled 'From' and 'To' (type="date") that drive the
 *     report options, and a 'Refresh' button that calls reload()
 *   - while loading: `<p>Loading analytics…</p>` and nothing else below
 *   - on error: `<p role="alert">{message}</p>` plus a 'Retry' button that
 *     calls reload()
 *   - when ready:
 *       * Metric tiles for 'Events', 'Users' and 'Revenue' (revenue as
 *         '$0.00'); the Events tile's hint is `{n} rejected` when any record
 *         was rejected, and absent otherwise
 *       * a DailyTable and a TopPages
 *
 * Changing a date must NOT trigger a new fetch — only a re-derive.
 */
export function Dashboard({ loadRaw }: { loadRaw: () => Promise<unknown> }) {
  throw new Error('TODO');
}
