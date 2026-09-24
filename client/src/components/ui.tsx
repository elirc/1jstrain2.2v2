import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

/** Small shared presentational pieces. */

/**
 * Every page renders inside one of these: the `<main>` the skip link jumps to,
 * and the document title (React 19 hoists `<title>` into `<head>`).
 */
export function Page({ title, narrow = false, children }: { title: string; narrow?: boolean; children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className={`main${narrow ? ' narrow' : ''}`}>
      <title>{title ? `${title} · Stack Ready` : 'Stack Ready'}</title>
      {children}
    </main>
  );
}

export function Ring({
  value,
  size = 66,
  stroke = 6,
  label,
  color = 'var(--accent)',
  ariaLabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  color?: string;
  /** What the ring means, for a screen reader ("Stage mastery 45%"). Without it the ring is decorative. */
  ariaLabel?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  return (
    <div
      className="ring"
      style={{ width: size, height: size }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-inset)" strokeWidth={stroke} />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      <span className="ring-label" style={{ fontSize: Math.max(11, Math.round(size / 4.4)) }}>
        {label ?? `${Math.round(clamped * 100)}%`}
      </span>
    </div>
  );
}

export function Bar({
  value,
  color,
  label,
}: {
  value: number;
  color?: string;
  /** Accessible name; without it the bar is decorative (the numbers are next to it). */
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div
      className="bar"
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(pct) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-hidden={label ? undefined : true}
      style={color ? ({ '--track': color } as CSSProperties) : undefined}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function TrackDot({ color }: { color: string }) {
  return <span className="track-dot" style={{ '--track': color } as CSSProperties} aria-hidden="true" />;
}

export function Loading({ what = 'Loading' }: { what?: string }) {
  return (
    <div className="empty" role="status">
      <div className="row center">
        <span className="spinner" aria-hidden="true" />
        <span>{what}…</span>
      </div>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="banner banner-bad" role="alert">
      <span className="banner-text">{message}</span>
      {(onRetry || onDismiss) && (
        <span className="row banner-actions">
          {onRetry && (
            <button type="button" className="btn btn-sm" onClick={onRetry}>
              Try again
            </button>
          )}
          {onDismiss && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </span>
      )}
    </div>
  );
}

/** Formats a fraction as a percentage, or an em dash when there is no data. */
export function percent(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`;
}

/** Local noon on the calendar day of `date`: immune to DST's 23- and 25-hour days. */
function localNoon(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Whole local calendar days from `from` to `to` (tomorrow = 1, whatever the hour). */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((localNoon(to).getTime() - localNoon(from).getTime()) / 86_400_000);
}

/**
 * "later today", "tomorrow", "in 3 days" — calendar days, not rounded hours,
 * so a card due at 23:00 viewed at 10:00 is "later today", not "tomorrow".
 */
export function relativeWhen(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return 'not scheduled';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return 'not scheduled';
  if (at.getTime() <= now.getTime()) return 'now';
  const days = calendarDaysBetween(now, at);
  if (days <= 0) {
    const hours = Math.round((at.getTime() - now.getTime()) / 3_600_000);
    return hours <= 1 ? 'within the hour' : `in ${hours} hours`;
  }
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/**
 * The due label for one card. The server's `due` flag wins — it is what the
 * "N due" badges count — so the list and the badge never disagree.
 */
export function dueLabel(state: { due: boolean; dueAt: string | null }, now = new Date()): string {
  if (!state.dueAt) return 'not started';
  if (state.due) return 'due now';
  return `due ${relativeWhen(state.dueAt, now)}`;
}

/** @deprecated kept for call sites that only have a date; prefer `dueLabel`. */
export function relativeDay(iso: string | null): string {
  if (!iso) return 'not started';
  return `due ${relativeWhen(iso)}`;
}

/* Theme ------------------------------------------------------------------ */

export const THEME_KEY = 'stack-ready:theme';
export type Theme = 'light' | 'dark' | 'system';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** Resolves a preference into the attribute the CSS reads: always `light` or `dark`. */
export function applyTheme(theme: Theme) {
  const effective = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = effective;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return isTheme(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* preference is a convenience, not state we must keep */
    }
    if (theme !== 'system') return;
    // While following the system, follow it live.
    let query: MediaQueryList;
    try {
      query = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const onChange = () => applyTheme('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);

  const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
  const icon = { system: '◐', light: '☀', dark: '☾' }[theme];

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-icon"
      onClick={() => setTheme(next[theme])}
      title={`Theme: ${theme}`}
      aria-label={`Theme: ${theme}. Switch to ${next[theme]}.`}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
