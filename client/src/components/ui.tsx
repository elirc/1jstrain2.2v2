import { useEffect, useState, type ReactNode } from 'react';

/** Small shared presentational pieces. */

export function Ring({
  value,
  size = 66,
  stroke = 6,
  label,
  color = 'var(--accent)',
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-inset)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="ring-label" style={{ fontSize: size / 4.4 }}>
        {label ?? `${Math.round(clamped * 100)}%`}
      </span>
    </div>
  );
}

export function Bar({ value, color = 'var(--accent)' }: { value: number; color?: string }) {
  return (
    <div className="bar">
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
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
  return <span className="track-dot" style={{ background: color }} aria-hidden="true" />;
}

export function Loading({ what = 'Loading' }: { what?: string }) {
  return (
    <div className="empty">
      <div className="row" style={{ justifyContent: 'center' }}>
        <span className="spinner" />
        <span>{what}…</span>
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="banner banner-bad" role="alert">
      {message}
    </div>
  );
}

/** Formats a fraction as a percentage, or an em dash when there is no data. */
export function percent(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`;
}

/** "in 3 days" / "today" for a due date. */
export function relativeDay(iso: string | null): string {
  if (!iso) return 'not started';
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'due now';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}

const THEME_KEY = 'stack-ready:theme';
type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as Theme) ?? 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* preference is a convenience, not state we must keep */
    }
  }, [theme]);

  const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
  const icon = { system: '◐', light: '☀', dark: '☾' }[theme];

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => setTheme(next[theme])}
      title={`Theme: ${theme}`}
      aria-label={`Theme: ${theme}. Switch to ${next[theme]}.`}
    >
      {icon}
    </button>
  );
}
