import { useEffect, useRef, type FormEvent } from 'react';

import { Code } from '../../components/Code';
import { Inline } from '../../components/Markdown';
import { ErrorBanner } from '../../components/ui';
import type { SessionQuestion } from '../../lib/types';
import { ChoiceList, TYPE_HINT } from './ChoiceList';
import { Feedback, Verdict } from './Feedback';
import { useDrillHotkeys } from './keys';
import { OrderList } from './OrderList';
import {
  choicesFor,
  isChoiceType,
  moveItem,
  revealedIds,
  SHORT_MAX,
  toResponse,
  togglePick,
  type Draft,
  type DrillItem,
} from './useDrillSession';

const DIFFICULTY = ['', 'foundation', 'junior', 'mid-level'];

const REASON_LABEL: Record<string, string> = {
  due: 'review',
  new: 'new',
  relearn: 'relearn',
  practice: 'extra practice',
};

/**
 * One question: a `<form>`, so Enter in the short-answer box submits natively
 * and the only global key handling left is the card-scoped hotkeys.
 */
export function QuestionCard({
  question,
  item,
  isLast,
  isFirst,
  onEdit,
  onSubmit,
  onGiveUp,
  onNext,
}: {
  question: SessionQuestion;
  item: DrillItem;
  isLast: boolean;
  isFirst: boolean;
  onEdit: (draft: Draft) => void;
  onSubmit: () => void;
  onGiveUp: () => void;
  onNext: () => void;
}) {
  const cardRef = useRef<HTMLFormElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const shortRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const graded = item.result !== null;
  const canSubmit = !graded && !item.submitting && toResponse(question, item.draft) !== undefined;
  const choiceType = isChoiceType(question.type);
  const count = choiceType ? choicesFor(question).length : 0;
  const revealed = revealedIds(question, item.result);

  // On arrival: put focus where the work is — the answer box for short
  // questions, else the prompt — without yanking the page, and bring the card
  // into view when advancing left it scrolled off the top.
  useEffect(() => {
    const target = question.type === 'short' ? shortRef.current : promptRef.current;
    target?.focus({ preventScroll: true });
    if (!isFirst) cardRef.current?.scrollIntoView({ block: 'nearest' });
    // Only on mount: each question gets its own card (keyed by index and id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once graded: focus Next without scrolling past the verdict, and reveal the
  // explanation as far as it fits.
  useEffect(() => {
    if (!graded) return;
    nextRef.current?.focus({ preventScroll: true });
    feedbackRef.current?.scrollIntoView({ block: 'nearest' });
  }, [graded]);

  useDrillHotkeys(cardRef, {
    answered: graded,
    digitCount: count,
    onEnter: () => (graded ? onNext() : onSubmit()),
    onGiveUp: graded ? undefined : onGiveUp,
    onDigit: choiceType
      ? (index) => {
          const choice = choicesFor(question)[index];
          if (choice) onEdit(togglePick(question, item.draft, choice.id));
        }
      : undefined,
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (graded) onNext();
    else onSubmit();
  }

  const reason = question.reason;

  return (
    <form ref={cardRef} className="question fade-in" onSubmit={handleSubmit} noValidate>
      <div className="question-meta">
        <span className="eyebrow">{TYPE_HINT[question.type] ?? 'Answer'}</span>
        <span className="meta">· {DIFFICULTY[question.difficulty]}</span>
        {reason && (
          <span className={`tag${reason === 'practice' ? ' tag-warn' : ''}`}>{REASON_LABEL[reason] ?? reason}</span>
        )}
      </div>

      <h2 ref={promptRef} className="question-prompt" tabIndex={-1}>
        <Inline text={question.prompt} />
      </h2>

      {question.code && <Code source={question.code} lang={question.lang} />}

      {question.type === 'short' && item.draft.kind === 'text' ? (
        <div className="short-answer">
          <label className="sr-only" htmlFor={`short-${question.id}`}>
            Your answer
          </label>
          <input
            ref={shortRef}
            id={`short-${question.id}`}
            className="input"
            value={item.draft.text}
            onChange={(e) => onEdit({ kind: 'text', text: e.target.value })}
            readOnly={graded}
            maxLength={SHORT_MAX}
            placeholder="Type your answer and press Enter"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      ) : question.type === 'order' && item.draft.kind === 'order' ? (
        <OrderList
          question={question}
          order={item.draft.order}
          revealed={revealed}
          graded={graded}
          onMove={(from, to) => onEdit(moveItem(item.draft, from, to))}
        />
      ) : item.draft.kind === 'choice' ? (
        <ChoiceList
          question={question}
          picked={item.draft.picked}
          revealed={revealed}
          graded={graded}
          onPick={(id) => onEdit(togglePick(question, item.draft, id))}
        />
      ) : null}

      {item.error && (
        <div className="question-error">
          <ErrorBanner message={item.error} />
        </div>
      )}

      <div ref={feedbackRef} className={graded ? 'feedback fade-in' : 'feedback-empty'}>
        <Verdict result={item.result} gaveUp={item.gaveUp} milestones={item.milestones} />
        {item.result && <Feedback question={question} result={item.result} reason={reason} />}
      </div>

      <div className="drill-footer">
        <div className="kbd-hints meta" aria-hidden="true">
          {graded ? (
            <>
              <span className="kbd">Enter</span> next
            </>
          ) : question.type === 'short' ? (
            // No `0` hint here: focus sits in the answer box, where 0 is a character.
            <>
              <span className="kbd">Enter</span> submit
            </>
          ) : question.type === 'order' ? (
            <>
              <span className="kbd">Tab</span> / <span className="kbd">Space</span> to move ·{' '}
              <span className="kbd">Enter</span> submit
            </>
          ) : (
            <>
              <span className="kbd">1</span>–<span className="kbd">{count}</span> choose ·{' '}
              <span className="kbd">Enter</span> submit · <span className="kbd">0</span> show answer
            </>
          )}
        </div>
        <div className="drill-actions">
          {graded ? (
            <button ref={nextRef} type="submit" className="btn btn-primary btn-lg">
              {isLast ? 'Finish' : 'Next question'}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={onGiveUp} disabled={item.submitting}>
                Show me the answer
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={!canSubmit}
                aria-disabled={!canSubmit || undefined}
              >
                {item.submitting ? 'Checking…' : 'Check answer'}
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
