import { useState } from 'react';
import { Link } from 'react-router-dom';

import { NotFound } from '../components/NotFound';
import { Inline, Markdown } from '../components/Markdown';
import { Bar, ErrorBanner, Loading, Page, TrackDot, dueLabel, percent } from '../components/ui';
import { api } from '../lib/api';
import { gateStage, useApp, useModuleProgress } from '../lib/app-state';
import type { Module, QuestionWithState } from '../lib/types';
import { useResource } from '../lib/useResource';
import { drillHref } from './drill/params';

/**
 * A module page is the lesson and the question list together: read the primer,
 * then drill it, then use the list to see exactly what you have and have not
 * locked in. Keyed by module id in the route, so moving between modules starts
 * fresh on the primer tab.
 */
export function ModulePage({ moduleId }: { moduleId: string }) {
  const { moduleById } = useApp();
  // Known synchronously from the curriculum: an unknown id never reaches the API.
  if (!moduleById.has(moduleId)) {
    return <NotFound what={`There is no module called “${moduleId}”.`} />;
  }
  return <KnownModule moduleId={moduleId} />;
}

function KnownModule({ moduleId }: { moduleId: string }) {
  const { profile, trackById, moduleById, curriculum, progress, flaggedIds } = useApp();
  const summary = moduleById.get(moduleId)!;
  const mp = useModuleProgress(moduleId);
  const [tab, setTab] = useState<'primer' | 'questions'>('primer');

  const resource = useResource<{ module: Module; questions: QuestionWithState[] }>(
    profile ? ['module', moduleId, profile.id] : null,
    (signal) => api.module(moduleId, profile!.id, signal),
  );

  const track = trackById.get(summary.trackId);
  const color = track?.color ?? 'var(--accent)';
  const stages = curriculum?.stages ?? [];
  const stage = stages.find((s) => s.modules.includes(moduleId));
  const stageStats = stage ? progress?.stages.find((s) => s.stageId === stage.id) : undefined;
  const gate = stage ? gateStage(stages, stage) : null;

  const head = (
    <div className="page-head">
      <div className="row tight">
        <TrackDot color={color} />
        <span className="eyebrow">{track?.title ?? summary.trackId}</span>
        <Link to="/" className="meta push-right">
          ← Roadmap
        </Link>
      </div>
      <h1>
        <Inline text={summary.title} />
      </h1>
      <p>
        <Inline text={summary.blurb} />
      </p>
    </div>
  );

  if (resource.error && !resource.data) {
    return (
      <Page title={summary.title} narrow>
        {head}
        <ErrorBanner message={`Could not load this module: ${resource.error.message}`} onRetry={resource.reload} />
      </Page>
    );
  }

  const data = resource.data;
  const flaggedHere = data ? data.questions.filter((q) => q.state.flagged || flaggedIds.has(q.id)).length : 0;

  return (
    <Page title={summary.title} narrow>
      {head}

      {stageStats && !stageStats.unlocked && gate && stage && (
        <div className="banner">
          Jumping ahead? “{stage.title}” opens at {Math.round(stage.unlockAt * 100)}% mastery of “{gate.title}”. Nothing
          stops you reading and drilling this now — answering here opens the stage.
        </div>
      )}

      <div className="card section">
        <div className="spread">
          <div>
            <div className="eyebrow">Your progress</div>
            <div className="strong">
              {mp ? `${mp.mastered} of ${mp.total || summary.questionCount} mastered` : '—'}
              {mp && mp.attempts > 0 && <span className="muted normal"> · {percent(mp.accuracy)} accuracy</span>}
            </div>
          </div>
          <Link className="btn btn-primary" to={drillHref({ mode: 'module', moduleId })}>
            {mp && mp.attempts > 0 ? 'Continue drilling' : 'Start drilling'}
            {mp && mp.due > 0 && (
              <span className="badge badge-on-primary">
                {mp.due}
                <span className="sr-only"> due</span>
              </span>
            )}
          </Link>
        </div>
        <Bar value={mp && mp.total ? mp.mastered / mp.total : 0} color={color} label="Module mastery" />
      </div>

      <section className="card section">
        <h2 className="eyebrow">After this module you can explain</h2>
        <ul className="objectives">
          {summary.objectives.map((objective) => (
            <li key={objective}>
              <Inline text={objective} />
            </li>
          ))}
        </ul>
      </section>

      <div className="row tabs" role="group" aria-label="Show">
        <button
          type="button"
          className={`btn btn-sm ${tab === 'primer' ? 'btn-primary' : 'btn-ghost'}`}
          aria-pressed={tab === 'primer'}
          onClick={() => setTab('primer')}
        >
          Primer · {summary.estMinutes} min
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'questions' ? 'btn-primary' : 'btn-ghost'}`}
          aria-pressed={tab === 'questions'}
          onClick={() => setTab('questions')}
        >
          Questions · {summary.questionCount}
          {flaggedHere > 0 && ` · ⚑ ${flaggedHere}`}
        </button>
      </div>

      {!data ? (
        <Loading what="Loading the module" />
      ) : tab === 'primer' ? (
        <article className="card fade-in">
          <Markdown source={data.module.primer} copyable />
        </article>
      ) : (
        <QuestionList questions={data.questions} flaggedIds={flaggedIds} />
      )}
    </Page>
  );
}

const DIFFICULTY = ['', 'foundation', 'junior', 'mid-level'];

function QuestionList({ questions, flaggedIds }: { questions: QuestionWithState[]; flaggedIds: ReadonlySet<string> }) {
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const isFlagged = (q: QuestionWithState) => Boolean(q.state.flagged) || flaggedIds.has(q.id);
  const flaggedCount = questions.filter(isFlagged).length;
  const shown = onlyFlagged ? questions.filter(isFlagged) : questions;

  return (
    <div className="card card-flush fade-in">
      <div className="list-row list-intro">
        <p className="muted flush">
          Answers and explanations appear when you answer a question in a drill — that is the point of testing yourself
          rather than reading the key.
        </p>
        {flaggedCount > 0 && (
          <button
            type="button"
            className="btn btn-sm"
            aria-pressed={onlyFlagged}
            onClick={() => setOnlyFlagged((v) => !v)}
          >
            <span aria-hidden="true">⚑</span> Flagged only ({flaggedCount})
          </button>
        )}
      </div>
      <ul className="question-list">
        {shown.map((question) => (
          <li key={question.id} className="list-row question-row">
            <span
              className={`tag status-tag ${question.state.mastered ? 'tag-good' : question.state.attempts > 0 ? 'tag-warn' : ''}`}
            >
              {question.state.mastered
                ? 'mastered'
                : question.state.attempts > 0
                  ? `${question.state.correct}/${question.state.attempts}`
                  : 'new'}
            </span>
            <div className="grow">
              <div className="question-row-prompt">
                {isFlagged(question) && (
                  <span className="flag-marker" title="Flagged">
                    <span aria-hidden="true">⚑</span>
                    <span className="sr-only">Flagged: </span>
                  </span>
                )}
                <Inline text={question.prompt} />
              </div>
              <div className="row tight meta">
                <span>{DIFFICULTY[question.difficulty]}</span>
                <span aria-hidden="true">·</span>
                <span>{dueLabel(question.state)}</span>
                {question.tags.slice(0, 3).map((tag) => (
                  <span key={tag}>· {tag}</span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
