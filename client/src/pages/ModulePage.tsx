import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Inline, Markdown } from '../components/Markdown';
import { Bar, ErrorBanner, Loading, TrackDot, percent, relativeDay } from '../components/ui';
import { api } from '../lib/api';
import { useApp, useModuleProgress } from '../lib/app-state';
import type { Module, QuestionWithState } from '../lib/types';

/**
 * A module page is the lesson and the question list together: read the primer,
 * then drill it, then use the list to see exactly what you have and have not
 * locked in.
 */
export function ModulePage() {
  const { moduleId = '' } = useParams();
  const { profile, trackById, moduleById } = useApp();
  const summary = moduleById.get(moduleId);
  const progress = useModuleProgress(moduleId);

  const [data, setData] = useState<{ module: Module; questions: QuestionWithState[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'primer' | 'questions'>('primer');

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    setData(null);
    setError(null);

    api
      .module(moduleId, profile.id)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load that module.');
      });

    return () => {
      cancelled = true;
    };
  }, [moduleId, profile]);

  if (error) {
    return (
      <main className="main narrow">
        <div className="stack">
          <ErrorBanner message={error} />
          <Link className="btn" to="/">
            Back to the roadmap
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="main">
        <Loading what="Loading the module" />
      </main>
    );
  }

  const track = trackById.get(data.module.trackId);
  const color = track?.color ?? 'var(--accent)';

  return (
    <main className="main narrow">
      <div className="page-head">
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <TrackDot color={color} />
          <span className="eyebrow">{track?.title ?? data.module.trackId}</span>
          <Link to="/" className="faint" style={{ fontSize: 12.5, marginLeft: 'auto' }}>
            ← Roadmap
          </Link>
        </div>
        <h1>
          <Inline text={data.module.title} />
        </h1>
        <p>
          <Inline text={data.module.blurb} />
        </p>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="spread" style={{ marginBottom: 12 }}>
          <div>
            <div className="eyebrow">Your progress</div>
            <div style={{ fontWeight: 650 }}>
              {progress.mastered} of {summary?.questionCount ?? data.questions.length} mastered
              {progress.attempts > 0 && (
                <span className="muted" style={{ fontWeight: 400 }}>
                  {' '}
                  · {percent(progress.accuracy)} accuracy
                </span>
              )}
            </div>
          </div>
          <div className="row">
            {progress.due > 0 && (
              <Link className="btn" to={`/drill?mode=module&moduleId=${moduleId}`}>
                {progress.due} due
              </Link>
            )}
            <Link className="btn btn-primary" to={`/drill?mode=module&moduleId=${moduleId}`}>
              {progress.attempts > 0 ? 'Continue drilling' : 'Start drilling'}
            </Link>
          </div>
        </div>
        <Bar value={progress.total ? progress.mastered / progress.total : 0} color={color} />
      </div>

      <section className="card" style={{ marginBottom: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          After this module you can explain
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
          {data.module.objectives.map((objective) => (
            <li key={objective} style={{ marginBottom: 4 }}>
              <Inline text={objective} />
            </li>
          ))}
        </ul>
      </section>

      <div className="row" style={{ marginBottom: 16, gap: 4 }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'primer' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('primer')}
        >
          Primer · {data.module.estMinutes} min
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'questions' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('questions')}
        >
          Questions · {data.questions.length}
        </button>
      </div>

      {tab === 'primer' ? (
        <article className="card fade-in">
          <Markdown source={data.module.primer} />
        </article>
      ) : (
        <QuestionList questions={data.questions} />
      )}
    </main>
  );
}

function QuestionList({ questions }: { questions: QuestionWithState[] }) {
  return (
    <div className="card fade-in" style={{ padding: 0 }}>
      <p className="muted" style={{ padding: '14px 18px', margin: 0, fontSize: 13.5 }}>
        Answers and explanations appear when you answer them in a drill — that is the whole point of
        testing yourself rather than reading the key.
      </p>
      {questions.map((question) => (
        <div
          key={question.id}
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <span
            className={`tag ${question.state.mastered ? 'tag-good' : question.state.attempts > 0 ? 'tag-warn' : ''}`}
            style={{ marginTop: 2, minWidth: 74, justifyContent: 'center' }}
          >
            {question.state.mastered
              ? 'mastered'
              : question.state.attempts > 0
                ? `${question.state.correct}/${question.state.attempts}`
                : 'new'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 550, fontSize: 14 }}>
              <Inline text={question.prompt} />
            </div>
            <div className="row faint" style={{ fontSize: 11.5, gap: 6, marginTop: 3 }}>
              <span>{['', 'foundation', 'junior', 'mid-level'][question.difficulty]}</span>
              <span>·</span>
              <span>{relativeDay(question.state.dueAt)}</span>
              {question.tags.slice(0, 3).map((tag) => (
                <span key={tag}>· {tag}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
