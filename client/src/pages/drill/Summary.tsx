import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Inline, Markdown } from '../../components/Markdown';
import { Ring } from '../../components/ui';
import { useApp } from '../../lib/app-state';
import type { AnswerResult, SessionQuestion } from '../../lib/types';
import { choicesFor, revealedIds, type Draft, type DrillItem } from './useDrillSession';

function textsFor(question: SessionQuestion, ids: string[]): string {
  const byId = new Map(choicesFor(question).map((c) => [c.id, c.text]));
  return ids.map((id) => byId.get(id) ?? '?').join(question.type === 'order' ? ' → ' : ', ');
}

/**
 * Choice texts are authored Markdown and go through `Inline`; typed text is
 * the learner's own and is shown verbatim in a `<code>`, so a backtick or an
 * asterisk in their answer cannot be mistaken for formatting.
 */
function yourAnswer(question: SessionQuestion, draft: Draft, gaveUp: boolean): ReactNode {
  if (gaveUp) return 'you asked to see the answer';
  if (draft.kind === 'text') return draft.text.trim() ? <code>{draft.text.trim()}</code> : '—';
  if (draft.kind === 'order') return <Inline text={textsFor(question, draft.order)} />;
  return draft.picked.length ? <Inline text={textsFor(question, draft.picked)} /> : '—';
}

function correctAnswer(question: SessionQuestion, result: AnswerResult): ReactNode {
  if (question.type === 'short') {
    return Array.isArray(result.answer) && typeof result.answer[0] === 'string' ? <code>{result.answer[0]}</code> : '—';
  }
  return <Inline text={textsFor(question, revealedIds(question, result))} />;
}

/**
 * The end of a session: every question with its verdict, your answer against
 * the right one, the explanation one click away, and a link to its module —
 * the misses are where the learning is.
 */
export function Summary({
  questions,
  items,
  xp,
  moduleId,
  onRestart,
}: {
  questions: SessionQuestion[];
  items: DrillItem[];
  xp: number;
  moduleId?: string;
  onRestart: () => void;
}) {
  const { moduleById } = useApp();
  const graded = items.filter((item) => item.result);
  const correct = graded.filter((item) => item.result?.correct).length;
  const accuracy = graded.length ? correct / graded.length : 0;

  return (
    <section className="question summary fade-in" aria-labelledby="summary-title">
      <div className="summary-head">
        <Ring value={accuracy} size={104} stroke={9} ariaLabel={`${Math.round(accuracy * 100)}% correct`} />
        <h2 id="summary-title" className="summary-title">
          {correct} of {graded.length} correct
        </h2>
        <p className="muted">
          +{xp} XP.{' '}
          {accuracy === 1
            ? 'Clean sweep — those come back for review in a day or three.'
            : accuracy >= 0.7
              ? 'Solid. The ones you missed come back sooner.'
              : 'The misses are the useful part — they are queued to return shortly.'}
        </p>
        <div className="row center">
          <button type="button" className="btn btn-primary" onClick={onRestart}>
            Another round
          </button>
          {moduleId && (
            <Link className="btn" to={`/module/${encodeURIComponent(moduleId)}`}>
              Back to the module
            </Link>
          )}
          <Link className="btn" to="/">
            Roadmap
          </Link>
        </div>
      </div>

      <ol className="summary-list">
        {questions.map((question, i) => {
          const item = items[i];
          const result = item?.result;
          if (!item || !result) return null;
          const module = moduleById.get(question.moduleId);
          return (
            <li key={`${i}:${question.id}`} className={`summary-item ${result.correct ? 'correct' : 'wrong'}`}>
              <div className="summary-verdict">
                <span aria-hidden="true">{result.correct ? '✓' : '✕'}</span>
                <span className="sr-only">{result.correct ? 'Correct:' : 'Missed:'}</span>
              </div>
              <div className="summary-body">
                <div className="summary-prompt">
                  <Inline text={question.prompt} />
                </div>
                {!result.correct && (
                  <dl className="summary-answers">
                    <dt>Yours</dt>
                    <dd>{yourAnswer(question, item.draft, item.gaveUp)}</dd>
                    <dt>Correct</dt>
                    <dd>{correctAnswer(question, result)}</dd>
                  </dl>
                )}
                <details className="summary-why">
                  <summary>Why</summary>
                  <Markdown source={result.why} />
                </details>
                {module && (
                  <Link className="meta" to={`/module/${encodeURIComponent(module.id)}`}>
                    <Inline text={module.title} /> →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
