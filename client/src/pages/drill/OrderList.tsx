import { useLayoutEffect, useRef, useState } from 'react';

import { Inline, stripMarkdown } from '../../components/Markdown';
import type { PublicQuestion } from '../../lib/types';

/**
 * An order question a keyboard user can actually reorder (J31).
 *
 * - Rows are keyed by choice id, so a move re-orders the same DOM nodes
 *   instead of remounting them, and focus is put back on the button that was
 *   pressed (or its sibling once the row reaches an end).
 * - Every move is announced politely: "moved X to position 2 of 4".
 * - The list starts in the order the server sent, which the server guarantees
 *   is not already the answer. The client never shuffles.
 * - After grading, each position is marked right or wrong and the correct
 *   sequence is shown beside the learner's.
 */
export function OrderList({
  question,
  order,
  revealed,
  graded,
  onMove,
}: {
  question: PublicQuestion;
  order: string[];
  /** Choice ids in the correct sequence; empty until graded. */
  revealed: string[];
  graded: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const textById = new Map((question.choices ?? []).map((c) => [c.id, c.text]));
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<{ id: string; dir: 'up' | 'down' } | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const same = buttons.current.get(`${pending.id}:${pending.dir}`);
    const other = buttons.current.get(`${pending.id}:${pending.dir === 'up' ? 'down' : 'up'}`);
    (same && !same.disabled ? same : other)?.focus();
  }, [order]);

  function move(index: number, dir: 'up' | 'down') {
    const to = dir === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= order.length) return;
    const id = order[index];
    pendingFocus.current = { id, dir };
    onMove(index, to);
    setAnnouncement(`Moved “${stripMarkdown(textById.get(id) ?? '')}” to position ${to + 1} of ${order.length}.`);
  }

  return (
    <div className="order">
      <ol className="choices order-list" aria-label={graded ? 'Your order' : 'Items to order'}>
        {order.map((id, i) => {
          const text = textById.get(id) ?? '';
          const label = stripMarkdown(text);
          const right = graded && revealed[i] === id;
          const state = graded ? (right ? ' is-correct' : ' is-wrong') : '';
          return (
            <li key={id} className={`choice order-item${state}`}>
              <span className="choice-key" aria-hidden="true">
                {i + 1}
              </span>
              <span className="choice-body">
                <Inline text={text} />
                {graded && (
                  <span className="sr-only">
                    {' '}
                    — {right ? 'right position' : `wrong position, belongs at ${revealed.indexOf(id) + 1}`}
                  </span>
                )}
              </span>
              {graded ? (
                <span className="choice-mark" aria-hidden="true">
                  {right ? '✓' : '✕'}
                </span>
              ) : (
                <span className="order-buttons">
                  <button
                    ref={(el) => {
                      if (el) buttons.current.set(`${id}:up`, el);
                      else buttons.current.delete(`${id}:up`);
                    }}
                    type="button"
                    className="btn btn-ghost btn-sm btn-icon"
                    disabled={i === 0}
                    onClick={() => move(i, 'up')}
                    aria-label={`Move “${label}” up`}
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    ref={(el) => {
                      if (el) buttons.current.set(`${id}:down`, el);
                      else buttons.current.delete(`${id}:down`);
                    }}
                    type="button"
                    className="btn btn-ghost btn-sm btn-icon"
                    disabled={i === order.length - 1}
                    onClick={() => move(i, 'down')}
                    aria-label={`Move “${label}” down`}
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <span className="sr-only" role="status">
        {announcement}
      </span>

      {graded && revealed.length > 0 && (
        <div className="order-answer">
          <div className="eyebrow">Correct order</div>
          <ol>
            {revealed.map((id) => (
              <li key={id}>
                <Inline text={textById.get(id) ?? ''} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
