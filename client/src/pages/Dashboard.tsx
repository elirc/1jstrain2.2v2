import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { Inline } from '../components/Markdown';
import { Bar, Page, Ring, Stat, TrackDot, percent } from '../components/ui';
import { gateStage, useApp } from '../lib/app-state';
import type { ModuleProgress, ModuleSummary, Progress, Stage, StageProgress } from '../lib/types';
import { drillHref } from './drill/params';

/**
 * The roadmap: where you are, what to do next, and the whole path laid out so
 * the scale of it is visible rather than mysterious.
 */
export function Dashboard() {
  const { curriculum, progress, profile, trackById, flags } = useApp();
  if (!curriculum || !progress) return null; // the Gate guarantees both

  const { totals, level, streak, today } = progress;
  const next = findNextModule(curriculum.stages, curriculum.modules, progress);
  const trackColor = (trackId: string) => trackById.get(trackId)?.color ?? 'var(--accent)';
  const flaggedCount = flags?.length ?? 0;
  const thresholds = [...new Set(curriculum.stages.map((s) => s.unlockAt).filter((u) => u > 0))];

  return (
    <Page title="Roadmap">
      <section className="hero">
        <div className="card hero-main">
          <div className="level">
            <Ring
              value={level.progressToNext}
              size={84}
              stroke={8}
              label={level.level}
              ariaLabel={`Level ${level.level}, ${Math.round(level.progressToNext * 100)}% of the way to the next`}
            />
            <span className="level-caption" aria-hidden="true">
              Level
            </span>
          </div>
          <div className="hero-copy">
            <div className="eyebrow">{profile?.name ?? 'Learner'}</div>
            <h1>{level.title}</h1>
            <p className="muted">
              {level.nextTitle && level.nextAtXp !== null
                ? `${level.nextAtXp - level.xp} XP to “${level.nextTitle}”`
                : 'Top level reached — keep the reviews going.'}
            </p>
            <Bar value={level.progressToNext} label="Progress to the next level" />
            <div className="row hero-actions">
              {totals.due > 0 && (
                <Link className="btn btn-primary" to={drillHref({ mode: 'review' })}>
                  Review {totals.due} due
                </Link>
              )}
              <Link className={`btn${totals.due > 0 ? '' : ' btn-primary'}`} to={drillHref({ mode: 'daily' })}>
                Daily mix
              </Link>
              {flaggedCount > 0 && (
                <Link className="btn" to={drillHref({ mode: 'flagged' })}>
                  Flagged {flaggedCount}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="hero-side">
          <DailyGoal attempts={today.attempts} goal={today.goal} goalMet={today.goalMet} />
          <div className="stat-row">
            <Stat value={streak} label={streak === 1 ? 'day streak' : 'days streak'} />
            <Stat value={`${totals.mastered}/${totals.questions}`} label="mastered" />
            <Stat value={percent(totals.accuracy)} label="accuracy" />
            <Stat value={totals.due} label="due for review" />
          </div>
        </div>
      </section>

      <NextUp next={next} trackColor={trackColor} />

      <div className="section-head">
        <h2 className="section-title">The path</h2>
        <p className="muted">
          {curriculum.stages.length} stages, {curriculum.totals.modules} modules, {curriculum.totals.questions}{' '}
          questions. Stages are meant to be taken in order: each one opens once you have mastered{' '}
          {thresholds.length === 1 ? `${Math.round(thresholds[0] * 100)}%` : 'a share'} of the stage it builds on, or as
          soon as you answer anything in it. Nothing is locked away — you can jump ahead to any module.
        </p>
      </div>

      <div className="stack">
        {curriculum.stages.map((stage) => {
          const stats = progress.stages.find((s) => s.stageId === stage.id);
          if (!stats) return null;
          const modules = stage.modules
            .map((id) => curriculum.modules.find((m) => m.id === id))
            .filter((m): m is ModuleSummary => Boolean(m));
          return (
            <StageBlock
              key={stage.id}
              stage={stage}
              gate={gateStage(curriculum.stages, stage)}
              stats={stats}
              modules={modules}
              moduleProgress={progress.modules}
              trackColor={trackColor}
            />
          );
        })}
      </div>
    </Page>
  );
}

function DailyGoal({ attempts, goal, goalMet }: { attempts: number; goal?: number; goalMet?: boolean }) {
  if (!goal) {
    return (
      <div className="card goal">
        <div className="goal-copy">
          <div className="eyebrow">Today</div>
          <div className="goal-figure">{attempts} answered</div>
        </div>
      </div>
    );
  }
  const met = goalMet ?? attempts >= goal;
  return (
    <div className={`card goal${met ? ' goal-met' : ''}`}>
      <Ring
        value={attempts / goal}
        size={56}
        stroke={6}
        color={met ? 'var(--good)' : 'var(--accent)'}
        label={met ? '✓' : undefined}
        ariaLabel={`Daily goal: ${attempts} of ${goal} answers${met ? ', met' : ''}`}
      />
      <div className="goal-copy">
        <div className="eyebrow">Daily goal</div>
        <div className="goal-figure">
          {attempts} / {goal} answers
        </div>
        <div className="meta">{met ? 'Goal met — anything more is a bonus.' : `${goal - attempts} to go today.`}</div>
      </div>
    </div>
  );
}

interface NextModule {
  module: ModuleSummary;
  stage: Stage;
  progress: ModuleProgress;
  reason: string;
}

function NextUp({ next, trackColor }: { next: NextModule | null; trackColor: (trackId: string) => string }) {
  if (!next) {
    return (
      <section className="card next-up">
        <div className="eyebrow">Next up</div>
        <p className="flush">Every module in the open stages is mastered. Keep the reviews going, or drill ahead.</p>
      </section>
    );
  }
  const { module, progress, reason } = next;
  const unseen = Math.max(0, progress.total - progress.seen);
  return (
    <section className="card next-up" aria-labelledby="next-up-title">
      <div className="next-up-copy">
        <div className="eyebrow">Next up · {reason}</div>
        <h2 id="next-up-title" className="next-up-title">
          <TrackDot color={trackColor(module.trackId)} /> <Inline text={module.title} />
        </h2>
        <p className="meta flush">
          {module.estMinutes} min read · {progress.mastered}/{progress.total} mastered
          {unseen > 0 ? ` · ${unseen} not yet seen` : ''}
        </p>
      </div>
      <div className="row">
        <Link className="btn" to={`/module/${encodeURIComponent(module.id)}`}>
          Read the primer
        </Link>
        <Link className="btn btn-primary" to={drillHref({ mode: 'module', moduleId: module.id })}>
          {progress.attempts > 0 ? 'Continue drilling' : 'Start drilling'}
        </Link>
      </div>
    </section>
  );
}

function StageBlock({
  stage,
  gate,
  stats,
  modules,
  moduleProgress,
  trackColor,
}: {
  stage: Stage;
  gate: Stage | null;
  stats: StageProgress;
  modules: ModuleSummary[];
  moduleProgress: ModuleProgress[];
  trackColor: (trackId: string) => string;
}) {
  return (
    <section className={`stage${stats.unlocked ? '' : ' locked'}`} aria-labelledby={`stage-${stage.id}`}>
      <header className="stage-head">
        <Ring
          value={stats.mastery}
          size={48}
          stroke={5}
          ariaLabel={`${stage.title}: ${Math.round(stats.mastery * 100)}% mastered`}
        />
        <div className="grow">
          <div className="row tight">
            <h2 id={`stage-${stage.id}`} className="stage-title">
              {stage.title}
            </h2>
            {!stats.unlocked && <span className="tag">Locked</span>}
            {stats.due > 0 && <span className="tag tag-accent">{stats.due} due</span>}
          </div>
          <p className="stage-blurb">{stage.blurb}</p>
          {!stats.unlocked && gate && (
            <p className="stage-lock">
              Opens at {Math.round(stage.unlockAt * 100)}% mastery of “{gate.title}”, or as soon as you answer anything
              here.
            </p>
          )}
          {stats.unlocked && stage.after && gate && <p className="meta">Builds on “{gate.title}”.</p>}
        </div>
        <div className="meta nowrap">
          {stats.mastered}/{stats.total}
        </div>
      </header>

      <div className="module-grid">
        {modules.map((module) => {
          const mp = moduleProgress.find((m) => m.moduleId === module.id);
          const mastery = mp && mp.total ? mp.mastered / mp.total : 0;
          return (
            <Link
              key={module.id}
              to={`/module/${encodeURIComponent(module.id)}`}
              className="module-cell"
              style={{ '--track': trackColor(module.trackId) } as CSSProperties}
            >
              <div className="row tight">
                <TrackDot color={trackColor(module.trackId)} />
                <h3 className="grow">
                  <Inline text={module.title} />
                </h3>
                {mp && mp.due > 0 ? (
                  <span className="badge">
                    {mp.due}
                    <span className="sr-only"> due</span>
                  </span>
                ) : null}
              </div>
              <p>
                <Inline text={module.blurb} />
              </p>
              <Bar value={mastery} color={trackColor(module.trackId)} />
              <div className="spread meta">
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
 * The earliest not-yet-mastered module in an open stage — "continue where you
 * left off", walking the path in its intended order — with the reason it was
 * picked. It no longer competes with the review button: both are shown.
 */
export function findNextModule(stages: Stage[], modules: ModuleSummary[], progress: Progress): NextModule | null {
  for (const [index, stage] of stages.entries()) {
    if (!progress.stages.find((s) => s.stageId === stage.id)?.unlocked) continue;
    for (const moduleId of stage.modules) {
      const mp = progress.modules.find((m) => m.moduleId === moduleId);
      const module = modules.find((m) => m.id === moduleId);
      if (mp && module && mp.mastered < mp.total) {
        const reason =
          mp.seen > 0 ? `in progress in stage ${index + 1}` : `first unstarted module in stage ${index + 1}`;
        return { module, stage, progress: mp, reason };
      }
    }
  }
  return null;
}
