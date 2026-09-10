import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Bar, Stat, TrackDot, percent } from '../components/ui';
import { useApp } from '../lib/app-state';
import type { DayActivity } from '../lib/types';

const DAY_MS = 86_400_000;
const WEEKS = 26;

export function ProgressPage() {
  const { curriculum, progress, trackById, resetProgress } = useApp();
  const [confirming, setConfirming] = useState(false);

  const cells = useMemo(() => buildHeatmap(progress?.activity ?? []), [progress?.activity]);

  if (!curriculum || !progress) return null;

  const weakest = [...progress.modules]
    .filter((m) => m.attempts >= 3 && m.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))
    .slice(0, 6);

  const dueSoon = [...progress.modules]
    .filter((m) => m.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 6);

  return (
    <main className="main">
      <div className="page-head">
        <h1>Progress</h1>
        <p>
          Mastery means you have answered a question correctly twice, with a gap in between — not
          that you got lucky once.
        </p>
      </div>

      <div className="stat-row" style={{ marginBottom: 22 }}>
        <Stat value={progress.xp} label="total XP" />
        <Stat value={progress.streak} label="day streak" />
        <Stat value={progress.totals.attempts} label="questions answered" />
        <Stat value={`${progress.totals.mastered}/${progress.totals.questions}`} label="mastered" />
        <Stat value={percent(progress.totals.accuracy)} label="overall accuracy" />
      </div>

      <section className="card" style={{ marginBottom: 22 }}>
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16 }}>Last six months</h2>
          <div className="row faint" style={{ fontSize: 11.5, gap: 5 }}>
            <span>less</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <span key={n} className={`heat-cell${n ? ` heat-${n}` : ''}`} />
            ))}
            <span>more</span>
          </div>
        </div>
        <div className="heatmap">
          {cells.map((cell) => (
            <span
              key={cell.date}
              className={`heat-cell${cell.level ? ` heat-${cell.level}` : ''}`}
              title={`${cell.date}: ${cell.attempts} answered`}
            />
          ))}
        </div>
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section className="card">
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>By track</h2>
          {progress.tracks.map((track) => {
            const meta = trackById.get(track.trackId);
            return (
              <div key={track.trackId} className="track-row">
                <div>
                  <div className="row" style={{ gap: 7, marginBottom: 4 }}>
                    <TrackDot color={meta?.color ?? 'var(--accent)'} />
                    <span style={{ fontWeight: 550, fontSize: 13.5 }}>{meta?.title}</span>
                  </div>
                  <Bar value={track.mastery} color={meta?.color} />
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>
                    {track.mastered}/{track.total}
                  </div>
                  <div className="faint">{percent(track.accuracy)}</div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="stack">
          <section className="card">
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Weakest modules</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              Lowest accuracy, at least three attempts.
            </p>
            {weakest.length === 0 ? (
              <p className="faint" style={{ fontSize: 13, margin: 0 }}>
                Answer a few more questions and this fills in.
              </p>
            ) : (
              weakest.map((m) => {
                const meta = curriculum.modules.find((x) => x.id === m.moduleId);
                return (
                  <Link key={m.moduleId} to={`/module/${m.moduleId}`} className="track-row">
                    <span style={{ fontSize: 13.5 }}>{meta?.title ?? m.moduleId}</span>
                    <span className="tag tag-warn">{percent(m.accuracy)}</span>
                  </Link>
                );
              })
            )}
            {weakest.length > 0 && (
              <Link className="btn btn-sm" to="/drill?mode=weak" style={{ marginTop: 12, width: '100%' }}>
                Drill weak spots
              </Link>
            )}
          </section>

          <section className="card">
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Due for review</h2>
            {dueSoon.length === 0 ? (
              <p className="faint" style={{ fontSize: 13, margin: 0 }}>
                Nothing is due. Come back tomorrow.
              </p>
            ) : (
              <>
                {dueSoon.map((m) => {
                  const meta = curriculum.modules.find((x) => x.id === m.moduleId);
                  return (
                    <Link key={m.moduleId} to={`/module/${m.moduleId}`} className="track-row">
                      <span style={{ fontSize: 13.5 }}>{meta?.title ?? m.moduleId}</span>
                      <span className="tag tag-accent">{m.due}</span>
                    </Link>
                  );
                })}
                <Link
                  className="btn btn-sm btn-primary"
                  to="/drill?mode=review"
                  style={{ marginTop: 12, width: '100%' }}
                >
                  Review {progress.totals.due} due
                </Link>
              </>
            )}
          </section>
        </div>
      </div>

      <section className="card" style={{ marginTop: 22 }}>
        <div className="spread">
          <div>
            <h2 style={{ fontSize: 15 }}>Reset this profile</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Clears every answer, schedule and streak for {' '}
              <strong>this learner only</strong>. There is no undo.
            </p>
          </div>
          {confirming ? (
            <div className="row">
              <button
                type="button"
                className="btn btn-sm"
                style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
                onClick={async () => {
                  await resetProgress();
                  setConfirming(false);
                }}
              >
                Yes, erase it
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-sm" onClick={() => setConfirming(true)}>
              Reset progress
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

/**
 * A GitHub-style grid: one column per week, Sunday at the top, ending today.
 * Levels are bucketed rather than linear so a single answer is still visible.
 */
function buildHeatmap(activity: DayActivity[]) {
  const byDate = new Map(activity.map((d) => [d.date, d]));
  const cells: { date: string; attempts: number; level: number }[] = [];

  const today = new Date();
  const end = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS);
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY_MS);

  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const date = new Date(t);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const attempts = byDate.get(key)?.attempts ?? 0;
    cells.push({
      date: key,
      attempts,
      level: attempts === 0 ? 0 : attempts < 5 ? 1 : attempts < 12 ? 2 : attempts < 25 ? 3 : 4,
    });
  }
  return cells;
}
