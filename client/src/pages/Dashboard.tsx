import { Link } from 'react-router-dom';

import { useApp } from '../lib/app-state';
import { Inline } from '../components/Markdown';
import { Bar, Ring, Stat, TrackDot, percent } from '../components/ui';
import type { ModuleSummary, Progress, Stage, StageProgress } from '../lib/types';

/**
 * The roadmap: where you are, what to do next, and the whole path laid out so
 * the scale of it is visible rather than mysterious.
 */
export function Dashboard() {
  const { curriculum, progress, profile, trackById } = useApp();
  if (!curriculum || !progress) return null;

  const { totals, level, streak } = progress;
  const nextModule = findNextModule(curriculum.stages, curriculum.modules, progress);

  return (
    <main className="main">
      <section className="hero">
        <div className="card hero-main">
          <Ring
            value={totals.mastered / Math.max(1, totals.questions)}
            size={92}
            stroke={8}
            label={
              <span style={{ display: 'grid', placeItems: 'center', lineHeight: 1.1 }}>
                <span style={{ fontSize: 19 }}>{level.level}</span>
                <span style={{ fontSize: 8, letterSpacing: '0.08em', color: 'var(--text-faint)' }}>
                  LEVEL
                </span>
              </span>
            }
          />
          <div className="hero-copy">
            <div className="eyebrow">{profile?.name ?? 'Learner'}</div>
            <h1>{level.title}</h1>
            <p className="muted" style={{ marginBottom: 10 }}>
              {level.nextTitle
                ? `${level.nextAtXp! - level.xp} XP to “${level.nextTitle}”`
                : 'Top level reached — keep the reviews going.'}
            </p>
            <Bar value={level.progressToNext} />
            <div className="row" style={{ marginTop: 14 }}>
              <Link
                className="btn btn-primary"
                to={
                  totals.due > 0
                    ? '/drill?mode=review'
                    : nextModule
                      ? `/drill?mode=module&moduleId=${nextModule.id}`
                      : '/drill?mode=daily'
                }
              >
                {totals.due > 0
                  ? `Review ${totals.due} due`
                  : nextModule
                    ? `Continue: ${nextModule.title}`
                    : 'Start a mixed drill'}
              </Link>
              <Link className="btn" to="/drill?mode=daily">
                Daily mix
              </Link>
            </div>
          </div>
        </div>

        <div className="stat-row">
          <Stat value={streak} label={streak === 1 ? 'day streak' : 'day streak'} />
          <Stat value={`${totals.mastered}/${totals.questions}`} label="mastered" />
          <Stat value={percent(totals.accuracy)} label="accuracy" />
          <Stat value={totals.due} label="due for review" />
        </div>
      </section>

      <div className="spread" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 19 }}>The path</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            Seven stages, {curriculum.totals.modules} modules,{' '}
            {curriculum.totals.questions} questions. A stage opens once you have mastered a third of
            the one before it.
          </p>
        </div>
      </div>

      <div className="stack">
        {curriculum.stages.map((stage) => {
          const stats = progress.stages.find((s) => s.stageId === stage.id);
          if (!stats) return null;
          return (
            <StageBlock
              key={stage.id}
              title={stage.title}
              blurb={stage.blurb}
              stats={stats}
              modules={stage.modules
                .map((id) => curriculum.modules.find((m) => m.id === id))
                .filter((m): m is ModuleSummary => Boolean(m))}
              moduleProgress={progress.modules}
              trackColor={(trackId) => trackById.get(trackId)?.color ?? 'var(--accent)'}
            />
          );
        })}
      </div>
    </main>
  );
}

function StageBlock({
  title,
  blurb,
  stats,
  modules,
  moduleProgress,
  trackColor,
}: {
  title: string;
  blurb: string;
  stats: StageProgress;
  modules: ModuleSummary[];
  moduleProgress: { moduleId: string; mastered: number; total: number; due: number; seen: number }[];
  trackColor: (trackId: string) => string;
}) {
  return (
    <section className={`stage${stats.unlocked ? '' : ' locked'}`}>
      <header className="stage-head">
        <Ring value={stats.mastery} size={48} stroke={5} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}>
            <h2>{title}</h2>
            {!stats.unlocked && <span className="tag">Locked</span>}
            {stats.due > 0 && <span className="tag tag-accent">{stats.due} due</span>}
          </div>
          <p>{blurb}</p>
        </div>
        <div className="faint" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
          {stats.mastered}/{stats.total}
        </div>
      </header>

      <div className="module-grid">
        {modules.map((module) => {
          const mp = moduleProgress.find((m) => m.moduleId === module.id);
          const mastery = mp && mp.total ? mp.mastered / mp.total : 0;
          return (
            <Link key={module.id} to={`/module/${module.id}`} className="module-cell">
              <div className="row" style={{ gap: 7, marginBottom: 5 }}>
                <TrackDot color={trackColor(module.trackId)} />
                <h3 style={{ flex: 1 }}>
                  <Inline text={module.title} />
                </h3>
                {mp && mp.due > 0 ? <span className="tag tag-accent">{mp.due}</span> : null}
              </div>
              <p>
                <Inline text={module.blurb} />
              </p>
              <Bar value={mastery} color={trackColor(module.trackId)} />
              <div
                className="spread faint"
                style={{ marginTop: 6, fontSize: 11.5, gap: 6 }}
              >
                <span>
                  {mp?.mastered ?? 0}/{module.questionCount} mastered
                </span>
                <span>{module.estMinutes} min read</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The earliest not-yet-finished module in an unlocked stage — "continue where
 * you left off", walking the path in its intended order.
 */
function findNextModule(
  stages: Stage[],
  modules: ModuleSummary[],
  progress: Progress,
): ModuleSummary | null {
  for (const stage of stages) {
    if (!progress.stages.find((s) => s.stageId === stage.id)?.unlocked) continue;
    for (const moduleId of stage.modules) {
      const mp = progress.modules.find((m) => m.moduleId === moduleId);
      if (mp && mp.mastered < mp.total) {
        return modules.find((m) => m.id === moduleId) ?? null;
      }
    }
  }
  return null;
}
