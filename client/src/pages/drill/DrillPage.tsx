import { useEffect, useMemo } from 'react';
import { Link, useBlocker, useSearchParams } from 'react-router-dom';

import { Inline } from '../../components/Markdown';
import { ErrorBanner, Loading, Page, relativeWhen } from '../../components/ui';
import { LEAVE_SESSION_PROMPT, useApp } from '../../lib/app-state';
import type { SessionMode } from '../../lib/types';
import { drillHref, parseDrillParams, type DrillSpec } from './params';
import { QuestionCard } from './QuestionCard';
import { Summary } from './Summary';
import { useDrillSession, type DrillItem } from './useDrillSession';

export const MODE_LABEL: Record<SessionMode, string> = {
  daily: 'Daily mix',
  review: 'Due for review',
  module: 'Module drill',
  stage: 'Stage drill',
  track: 'Track drill',
  weak: 'Weak spots',
  flagged: 'Flagged questions',
};

export function DrillPage() {
  const [params] = useSearchParams();
  const parsed = useMemo(() => parseDrillParams(params), [params]);
  const { profile } = useApp();

  if (!parsed.ok) {
    return (
      <Page title="Drill" narrow>
        <div className="stack">
          <ErrorBanner message={parsed.error} />
          <div className="row">
            <Link className="btn btn-primary" to={drillHref({ mode: 'daily' })}>
              Daily mix instead
            </Link>
            <Link className="btn" to="/">
              Roadmap
            </Link>
          </div>
        </div>
      </Page>
    );
  }
  if (!profile) return null; // the Gate guarantees a profile; this narrows the type
  return <DrillSession key={profile.id} spec={parsed.spec} profileId={profile.id} />;
}

function useTitle(spec: DrillSpec): string {
  const { moduleById, trackById, stageById } = useApp();
  switch (spec.mode) {
    case 'module':
      return moduleById.get(spec.moduleId)?.title ?? MODE_LABEL.module;
    case 'track': {
      const track = trackById.get(spec.trackId);
      return track ? `${track.title} drill` : MODE_LABEL.track;
    }
    case 'stage':
      return stageById.get(spec.stageId)?.title ?? MODE_LABEL.stage;
    default:
      return MODE_LABEL[spec.mode];
  }
}

function emptyCopy(mode: SessionMode, nextDueAt: string | null | undefined): string {
  const next = nextDueAt ? ` Next review ${relativeWhen(nextDueAt)}.` : '';
  switch (mode) {
    case 'review':
      return `Nothing is due.${next || ' Reviews appear a day after you first answer something correctly.'}`;
    case 'weak':
      return 'No weak spots yet: a question needs at least two answers, under 75% right, before it counts.';
    case 'flagged':
      return 'You have no flagged questions. Flag one from the explanation after you answer it.';
    default:
      return `That selection has nothing to ask right now.${next}`;
  }
}

/** A drill-progress strip that says in words what its colours say. */
function Strip({ items, index, finished }: { items: DrillItem[]; index: number; finished: boolean }) {
  const correct = items.filter((i) => i.result?.correct).length;
  const shown = Math.min(index + 1, items.length);
  return (
    <div
      className="drill-progress"
      role="progressbar"
      aria-label="Session progress"
      aria-valuemin={0}
      aria-valuemax={items.length}
      aria-valuenow={finished ? items.length : index}
      aria-valuetext={
        finished
          ? `Finished, ${correct} of ${items.length} correct`
          : `Question ${shown} of ${items.length}, ${correct} correct so far`
      }
    >
      {items.map((item, i) => (
        <span
          key={i}
          className={
            item.result ? (item.result.correct ? 'correct' : 'wrong') : i === index && !finished ? 'current' : ''
          }
        />
      ))}
    </div>
  );
}

function DrillSession({ spec, profileId }: { spec: DrillSpec; profileId: string }) {
  const { state, finished, answered, submit, giveUp, edit, next, restart } = useDrillSession(spec, profileId);
  const title = useTitle(spec);

  // Leaving mid-session (a nav link, a module card) asks first. Answers are
  // saved as they are given; what is lost is the rest of this session. Every
  // navigation counts, including one to this very URL: the route is keyed by
  // location, so even that remounts the page and drops the session.
  const live = answered > 0 && !finished;
  const blocker = useBlocker(() => live);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(LEAVE_SESSION_PROMPT)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  if (state.status === 'error') {
    return (
      <Page title={title} narrow>
        <div className="stack">
          <ErrorBanner message={state.error ?? 'Could not start the session.'} onRetry={restart} />
          <Link className="btn" to="/">
            Back to the roadmap
          </Link>
        </div>
      </Page>
    );
  }

  if (state.status === 'loading' || !state.session) {
    return (
      <Page title={title}>
        <Loading what="Picking your questions" />
      </Page>
    );
  }

  const { session } = state;

  if (session.questions.length === 0) {
    return (
      <Page title={title} narrow>
        <div className="empty">
          <h1 className="empty-title">Nothing to do here yet</h1>
          <p>{emptyCopy(session.mode, session.nextDueAt)}</p>
          <div className="row center">
            {session.mode !== 'daily' && (
              <Link className="btn btn-primary" to={drillHref({ mode: 'daily' })}>
                Daily mix instead
              </Link>
            )}
            <Link className="btn" to="/">
              Roadmap
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  const question = session.questions[state.index];
  const item = state.items[state.index];

  return (
    <Page title={title}>
      <div className="drill">
        <div className="drill-head">
          <div>
            <div className="eyebrow">{MODE_LABEL[spec.mode]}</div>
            <h1 className="drill-title">
              <Inline text={title} />
            </h1>
          </div>
          <div className="row">
            <span className="tag">+{state.xp} XP</span>
            <span className="tag">
              {Math.min(state.index + 1, session.questions.length)} / {session.questions.length}
            </span>
          </div>
        </div>

        <Strip items={state.items} index={state.index} finished={finished} />

        {finished || !question || !item ? (
          <Summary
            questions={session.questions}
            items={state.items}
            xp={state.xp}
            moduleId={spec.mode === 'module' ? spec.moduleId : undefined}
            onRestart={restart}
          />
        ) : (
          <QuestionCard
            // Index and id: a session that repeats a question still gets a fresh card.
            key={`${state.round}:${state.index}:${question.id}`}
            question={question}
            item={item}
            isFirst={state.index === 0}
            isLast={state.index === session.questions.length - 1}
            onEdit={edit}
            onSubmit={submit}
            onGiveUp={giveUp}
            onNext={next}
          />
        )}
      </div>
    </Page>
  );
}
