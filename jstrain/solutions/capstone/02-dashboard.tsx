/** Reference solution for CAPSTONE 2. */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildReport, type DaySummary, type Report } from './01-analytics-pipeline';

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
  const [attempt, setAttempt] = useState(0);
  const [raw, setRaw] = useState<unknown>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<Error | null>(null);

  const { from, to, topPages } = options;

  useEffect(() => {
    let ignore = false;
    setStatus('loading');
    setError(null);
    loadRaw().then(
      (payload) => {
        if (ignore) return;
        setRaw(payload);
        setStatus('ready');
      },
      (thrown: Error) => {
        if (ignore) return;
        setError(thrown);
        setStatus('error');
      },
    );
    return () => {
      ignore = true;
    };
  }, [loadRaw, attempt]);

  // Deriving is cheap and separate from fetching: changing the date range
  // recomputes the report without touching the network.
  const report = useMemo(
    () => (status === 'ready' ? buildReport(raw, { from, to, topPages }) : null),
    [status, raw, from, to, topPages],
  );

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, report, error, reload };
}

export function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div role="group" aria-label={label}>
      <span data-testid="metric-label">{label}</span>
      <strong data-testid="metric-value">{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function DailyTable({ days }: { days: Array<{ day: string } & DaySummary> }) {
  if (days.length === 0) return <p>No activity</p>;

  return (
    <table>
      <caption>Daily breakdown</caption>
      <thead>
        <tr>
          <th>Day</th>
          <th>Events</th>
          <th>Users</th>
          <th>Revenue</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => (
          <tr key={day.day}>
            <td>{day.day}</td>
            <td>{day.events}</td>
            <td>{day.uniqueUsers}</td>
            <td>${day.revenue.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TopPages({
  pages,
}: {
  pages: Array<{ path: string; events: number; uniqueUsers: number }>;
}) {
  if (pages.length === 0) return null;
  return (
    <ol>
      {pages.map((page) => (
        <li key={page.path}>
          {page.path} — {page.events} events
        </li>
      ))}
    </ol>
  );
}

export function Dashboard({ loadRaw }: { loadRaw: () => Promise<unknown> }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const options = useMemo(
    () => ({ from: from || undefined, to: to || undefined }),
    [from, to],
  );
  const { status, report, error, reload } = useAnalytics(loadRaw, options);

  return (
    <div>
      <h1>Analytics</h1>

      <label htmlFor="from">From</label>
      <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />

      <label htmlFor="to">To</label>
      <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />

      <button type="button" onClick={reload}>
        Refresh
      </button>

      {status === 'loading' && <p>Loading analytics…</p>}

      {status === 'error' && (
        <>
          <p role="alert">{error?.message}</p>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </>
      )}

      {status === 'ready' && report !== null && (
        <>
          <Metric
            label="Events"
            value={report.totals.events}
            hint={report.rejected > 0 ? `${report.rejected} rejected` : undefined}
          />
          <Metric label="Users" value={report.totals.uniqueUsers} />
          <Metric label="Revenue" value={`$${report.totals.revenue.toFixed(2)}`} />
          <DailyTable days={report.days} />
          <TopPages pages={report.topPages} />
        </>
      )}
    </div>
  );
}
