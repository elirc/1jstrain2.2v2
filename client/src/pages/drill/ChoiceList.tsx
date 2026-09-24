import { Inline } from '../../components/Markdown';
import type { PublicQuestion } from '../../lib/types';
import { choicesFor } from './useDrillSession';

export const TYPE_HINT: Record<string, string> = {
  mcq: 'Pick one',
  output: 'What does this produce?',
  multi: 'Select every correct answer',
  boolean: 'True or false',
  short: 'Type your answer',
  order: 'Put these in order',
};

/**
 * mcq / output / boolean / multi as native radios or checkboxes, visually
 * hidden inside styled labels: arrow keys, grouping and "checked"
 * announcements come free. After grading the inputs stay focusable (they are
 * `aria-disabled`, not `disabled`), and each choice carries its verdict as
 * text, so a screen-reader user can find out which one was right.
 */
export function ChoiceList({
  question,
  picked,
  revealed,
  graded,
  onPick,
}: {
  question: PublicQuestion;
  picked: string[];
  /** Correct choice ids; empty until graded. */
  revealed: string[];
  graded: boolean;
  onPick: (id: string) => void;
}) {
  const multi = question.type === 'multi';
  const correct = new Set(revealed);

  return (
    <fieldset className="choices">
      <legend className="sr-only">{TYPE_HINT[question.type] ?? 'Answer'}</legend>
      {choicesFor(question).map((choice, i) => {
        const isPicked = picked.includes(choice.id);
        const isCorrect = graded && correct.has(choice.id);
        let state = '';
        let verdict = '';
        if (graded) {
          if (isPicked && isCorrect) [state, verdict] = ['is-correct', 'your answer, correct'];
          else if (isPicked) [state, verdict] = ['is-wrong', 'your answer, incorrect'];
          else if (isCorrect && multi) [state, verdict] = ['is-missed', 'correct answer, missed'];
          else if (isCorrect) [state, verdict] = ['is-correct', 'correct answer'];
        } else if (isPicked) {
          state = 'selected';
        }

        return (
          <label key={choice.id} className={`choice${state ? ` ${state}` : ''}`}>
            <input
              className="choice-input"
              type={multi ? 'checkbox' : 'radio'}
              name={`choice-${question.id}`}
              value={choice.id}
              checked={isPicked}
              aria-disabled={graded || undefined}
              onChange={() => {
                if (!graded) onPick(choice.id);
              }}
            />
            <span className="choice-key" aria-hidden="true">
              {i + 1}
            </span>
            <span className="choice-body">
              <Inline text={choice.text} />
              {verdict && <span className="sr-only"> — {verdict}</span>}
            </span>
            {state === 'is-correct' && (
              <span className="choice-mark" aria-hidden="true">
                ✓
              </span>
            )}
            {state === 'is-wrong' && (
              <span className="choice-mark" aria-hidden="true">
                ✕
              </span>
            )}
            {state === 'is-missed' && (
              <span className="choice-mark choice-mark-text" aria-hidden="true">
                missed
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
