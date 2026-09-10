import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Code } from '../components/Code';
import { Inline, Markdown } from '../components/Markdown';
import { ErrorBanner, Loading, Ring } from '../components/ui';
import { api } from '../lib/api';
import { useApp } from '../lib/app-state';
import type { AnswerResult, PublicQuestion, Session, SessionMode } from '../lib/types';

const MODE_LABEL: Record<SessionMode, string> = {
  daily: 'Daily mix',
  review: 'Due for review',
  module: 'Module drill',
  stage: 'Stage drill',
  track: 'Track drill',
  weak: 'Weak spots',
};

const TYPE_HINT: Record<string, string> = {
  mcq: 'Pick one',
  output: 'What does this produce?',
  multi: 'Select every correct answer',
  boolean: 'True or false',
  short: 'Type your answer',
  order: 'Put these in order',
};

type Verdict = 'correct' | 'wrong';

export function DrillPage() {
  const [params] = useSearchParams();
  const { profile, refreshProgress, moduleById } = useApp();

  const mode = (params.get('mode') ?? 'daily') as SessionMode;
  const moduleId = params.get('moduleId') ?? undefined;
  const trackId = params.get('trackId') ?? undefined;
  const stageId = params.get('stageId') ?? undefined;
  const limit = Number(params.get('limit') ?? 12);

  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [xp, setXp] = useState(0);

  // Re-fetch whenever the session parameters change. The cancelled flag keeps a
  // slow response from an abandoned session out of the new one.
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    setSession(null);
    setError(null);
    setIndex(0);
    setVerdicts([]);
    setXp(0);

    api
      .startSession(profile.id, { mode, moduleId, trackId, stageId, limit })
      .then((next) => {
        if (!cancelled) setSession(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not start the session.');
      });

    return () => {
      cancelled = true;
    };
  }, [profile, mode, moduleId, trackId, stageId, limit]);

  const onAnswered = useCallback((result: AnswerResult) => {
    setVerdicts((prev) => [...prev, result.correct ? 'correct' : 'wrong']);
    setXp((prev) => prev + result.xpEarned);
  }, []);

  const onNext = useCallback(() => setIndex((i) => i + 1), []);

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

  if (!session || !profile) {
    return (
      <main className="main">
        <Loading what="Picking your questions" />
      </main>
    );
  }

  if (session.questions.length === 0) {
    return (
      <main className="main narrow">
        <div className="empty">
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Nothing to do here yet</h1>
          <p>
            {mode === 'review'
              ? 'No cards are due. Reviews appear a day after you first answer something correctly.'
              : mode === 'weak'
                ? 'No weak spots — you have not answered enough questions for a pattern to show yet.'
                : 'That selection has no questions.'}
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
            <Link className="btn btn-primary" to="/drill?mode=daily">
              Daily mix instead
            </Link>
            <Link className="btn" to="/">
              Roadmap
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const finished = index >= session.questions.length;
  const title = moduleId ? (moduleById.get(moduleId)?.title ?? MODE_LABEL[mode]) : MODE_LABEL[mode];

  return (
    <main className="main">
      <div className="drill">
        <div className="spread" style={{ marginBottom: 14 }}>
          <div>
            <div className="eyebrow">{MODE_LABEL[mode]}</div>
            <h1 style={{ fontSize: 20 }}>{title}</h1>
          </div>
          <div className="row">
            <span className="tag">+{xp} XP</span>
            <span className="tag">
              {Math.min(index + 1, session.questions.length)} / {session.questions.length}
            </span>
          </div>
        </div>

        <div className="drill-progress" aria-hidden="true">
          {session.questions.map((_, i) => (
            <span
              key={i}
              className={verdicts[i] ?? (i === index && !finished ? 'current' : '')}
            />
          ))}
        </div>

        {finished ? (
          <Summary
            session={session}
            verdicts={verdicts}
            xp={xp}
            onFinish={refreshProgress}
            moduleId={moduleId}
          />
        ) : (
          <QuestionCard
            key={session.questions[index].id}
            question={session.questions[index]}
            profileId={profile.id}
            onAnswered={onAnswered}
            onNext={onNext}
            isLast={index === session.questions.length - 1}
          />
        )}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function QuestionCard({
  question,
  profileId,
  onAnswered,
  onNext,
  isLast,
}: {
  question: PublicQuestion;
  profileId: string;
  onAnswered: (result: AnswerResult) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const [selection, setSelection] = useState<number[]>([]);
  const [text, setText] = useState('');
  const [ordering, setOrdering] = useState<number[]>(() =>
    question.type === 'order' ? shuffled(question.choices?.length ?? 0) : [],
  );
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const nextButton = useRef<HTMLButtonElement>(null);

  const answered = result !== null;

  const response = useMemo(() => {
    switch (question.type) {
      case 'mcq':
      case 'output':
        return selection[0];
      case 'multi':
        return selection;
      case 'boolean':
        return selection[0] === undefined ? undefined : selection[0] === 0;
      case 'short':
        return text;
      case 'order':
        return ordering;
      default:
        return undefined;
    }
  }, [question.type, selection, text, ordering]);

  const canSubmit =
    !answered &&
    !submitting &&
    (question.type === 'short' ? text.trim().length > 0 : response !== undefined) &&
    (question.type !== 'multi' || selection.length > 0);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const graded = await api.answer(profileId, {
        questionId: question.id,
        response,
        elapsedMs: Date.now() - startedAt.current,
      });
      setResult(graded);
      onAnswered(graded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit that answer.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, profileId, question.id, response, onAnswered]);

  // Move focus to Next once graded, so keyboard users are not stranded.
  useEffect(() => {
    if (answered) nextButton.current?.focus();
  }, [answered]);

  // Number keys pick a choice; Enter submits, then advances.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (event.key === 'Enter' && !answered) submit();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (answered) onNext();
        else submit();
        return;
      }

      if (answered) return;
      const digit = Number(event.key);
      if (!Number.isInteger(digit) || digit < 1) return;
      const count = question.type === 'boolean' ? 2 : (question.choices?.length ?? 0);
      if (digit > count) return;
      event.preventDefault();
      toggle(digit - 1);
    }

    function toggle(i: number) {
      setSelection((prev) =>
        question.type === 'multi'
          ? prev.includes(i)
            ? prev.filter((n) => n !== i)
            : [...prev, i]
          : [i],
      );
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answered, question.type, question.choices, submit, onNext]);

  const correctIndices = correctSet(question.type, result);

  return (
    <div className="question fade-in">
      <div className="row" style={{ gap: 7 }}>
        <span className="eyebrow">{TYPE_HINT[question.type] ?? 'Answer'}</span>
        <span className="faint" style={{ fontSize: 11.5 }}>
          · {['', 'foundation', 'junior', 'mid-level'][question.difficulty]}
        </span>
      </div>

      <h2 className="question-prompt">
        <Inline text={question.prompt} />
      </h2>

      {question.code && <Code source={question.code} lang={question.lang} />}

      {question.type === 'short' ? (
        <div>
          <label className="sr-only" htmlFor="short-answer">
            Your answer
          </label>
          <input
            id="short-answer"
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={answered}
            placeholder="Type your answer and press Enter"
            autoComplete="off"
            autoFocus
          />
        </div>
      ) : question.type === 'order' ? (
        <OrderList
          items={ordering.map((i) => question.choices?.[i]?.text ?? '')}
          disabled={answered}
          onMove={(from, to) =>
            setOrdering((prev) => {
              const next = [...prev];
              const [moved] = next.splice(from, 1);
              next.splice(to, 0, moved);
              return next;
            })
          }
          correct={
            answered && Array.isArray(result?.answer)
              ? ordering.every((v, i) => v === (result.answer as number[])[i])
              : null
          }
        />
      ) : (
        <fieldset className="choices">
          <legend className="sr-only">
            <Inline text={question.prompt} />
          </legend>
          {(question.type === 'boolean'
            ? [
                { id: 'true', text: 'True' },
                { id: 'false', text: 'False' },
              ]
            : (question.choices ?? [])
          ).map((choice, i) => {
            const isSelected = selection.includes(i);
            const isCorrect = answered && correctIndices.has(i);
            const isWrong = answered && isSelected && !correctIndices.has(i);
            return (
              <button
                key={choice.id}
                type="button"
                className={[
                  'choice',
                  isSelected && !answered ? 'selected' : '',
                  isCorrect ? 'is-correct' : '',
                  isWrong ? 'is-wrong' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={answered}
                aria-pressed={isSelected}
                onClick={() =>
                  setSelection((prev) =>
                    question.type === 'multi'
                      ? prev.includes(i)
                        ? prev.filter((n) => n !== i)
                        : [...prev, i]
                      : [i],
                  )
                }
              >
                <span className="choice-key">{i + 1}</span>
                <span className="choice-body">
                  <Inline text={choice.text} />
                </span>
                {isCorrect && <span aria-label="correct">✓</span>}
                {isWrong && <span aria-label="incorrect">✕</span>}
              </button>
            );
          })}
        </fieldset>
      )}

      {error && (
        <div style={{ marginTop: 12 }}>
          <ErrorBanner message={error} />
        </div>
      )}

      {answered && result && (
        <div className="feedback fade-in">
          <div className={`feedback-head ${result.correct ? 'correct' : 'wrong'}`}>
            <span aria-hidden="true">{result.correct ? '✓' : '✕'}</span>
            <span>{result.correct ? 'Correct' : 'Not quite'}</span>
            <span className="faint" style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 12.5 }}>
              +{result.xpEarned} XP
              {result.mastered ? ' · mastered' : ''}
              {result.intervalDays > 0 ? ` · back in ${result.intervalDays}d` : ' · back shortly'}
            </span>
          </div>
          <div className="feedback-body">
            {question.type === 'short' && Array.isArray(result.answer) && (
              <p>
                <strong>Accepted:</strong> <code>{(result.answer as string[])[0]}</code>
              </p>
            )}
            <Markdown source={result.why} />
            {result.ask && (
              <div className="interview-note">
                <strong>Why they ask this — </strong>
                <Inline text={result.ask} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="drill-footer">
        <div className="row faint" style={{ fontSize: 12 }}>
          {answered ? (
            <>
              <span className="kbd">Enter</span> next
            </>
          ) : (
            <>
              <span className="kbd">1</span>–<span className="kbd">{question.type === 'boolean' ? 2 : (question.choices?.length ?? 4)}</span> choose ·{' '}
              <span className="kbd">Enter</span> submit
            </>
          )}
        </div>
        {answered ? (
          <button ref={nextButton} type="button" className="btn btn-primary btn-lg" onClick={onNext}>
            {isLast ? 'Finish' : 'Next question'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" disabled={!canSubmit} onClick={submit}>
            {submitting ? 'Checking…' : 'Check answer'}
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function OrderList({
  items,
  disabled,
  onMove,
  correct,
}: {
  items: string[];
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  correct: boolean | null;
}) {
  return (
    <ol className="choices" style={{ listStyle: 'none' }}>
      {items.map((item, i) => (
        <li
          key={`${item}-${i}`}
          className={`choice${correct === true ? ' is-correct' : correct === false ? ' is-wrong' : ''}`}
        >
          <span className="choice-key">{i + 1}</span>
          <span className="choice-body">
            <Inline text={item} />
          </span>
          <span className="row" style={{ gap: 4 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={disabled || i === 0}
              onClick={() => onMove(i, i - 1)}
              aria-label={`Move "${item}" up`}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={disabled || i === items.length - 1}
              onClick={() => onMove(i, i + 1)}
              aria-label={`Move "${item}" down`}
            >
              ↓
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Summary({
  session,
  verdicts,
  xp,
  onFinish,
  moduleId,
}: {
  session: Session;
  verdicts: Verdict[];
  xp: number;
  onFinish: () => Promise<void>;
  moduleId?: string;
}) {
  const correct = verdicts.filter((v) => v === 'correct').length;
  const accuracy = verdicts.length ? correct / verdicts.length : 0;

  // Refresh the dashboard's numbers once, when the session ends.
  useEffect(() => {
    void onFinish();
  }, [onFinish]);

  return (
    <div className="question fade-in" style={{ textAlign: 'center' }}>
      <div className="row" style={{ justifyContent: 'center', marginBottom: 14 }}>
        <Ring value={accuracy} size={104} stroke={9} />
      </div>
      <h2 style={{ fontSize: 21, marginBottom: 6 }}>
        {correct} of {verdicts.length} correct
      </h2>
      <p className="muted">
        +{xp} XP.{' '}
        {accuracy === 1
          ? 'Clean sweep — those come back for review in a day or three.'
          : accuracy >= 0.7
            ? 'Solid. The ones you missed will come back sooner.'
            : 'The misses are the useful part — they are queued to return shortly.'}
      </p>
      <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
        {moduleId && (
          <Link className="btn" to={`/module/${moduleId}`}>
            Back to the module
          </Link>
        )}
        <Link
          className="btn btn-primary"
          to={`/drill?mode=${session.mode}${moduleId ? `&moduleId=${moduleId}` : ''}&n=${Date.now()}`}
          reloadDocument={false}
        >
          Another round
        </Link>
        <Link className="btn" to="/">
          Roadmap
        </Link>
      </div>
    </div>
  );
}

function correctSet(type: string, result: AnswerResult | null): Set<number> {
  if (!result) return new Set();
  if (type === 'boolean') return new Set([result.answer === true ? 0 : 1]);
  if (typeof result.answer === 'number') return new Set([result.answer]);
  if (Array.isArray(result.answer) && result.answer.every((v) => typeof v === 'number')) {
    return new Set(result.answer as number[]);
  }
  return new Set();
}

function shuffled(length: number): number[] {
  const items = Array.from({ length }, (_, i) => i);
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
