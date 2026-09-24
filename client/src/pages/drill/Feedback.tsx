import { useState } from 'react';

import { Inline, Markdown } from '../../components/Markdown';
import { calendarDaysBetween, relativeWhen } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useApp } from '../../lib/app-state';
import type { AnswerResult, PublicQuestion, QuestionDetail } from '../../lib/types';
import { useResource } from '../../lib/useResource';

function days(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

/**
 * What the answer did to the schedule, in words (CONTRACT §3). `practice`
 * matters most: a correct answer before the card was due is recorded but
 * moves nothing, and the copy must not pretend otherwise.
 */
export function outcomeCopy(result: AnswerResult, now = new Date()): string {
  switch (result.outcome) {
    case 'practice':
      return `practice · your schedule is unchanged · still due ${relativeWhen(result.nextDueAt, now)}`;
    case 'learned':
      return `learned · back in ${days(Math.max(1, result.intervalDays))}`;
    case 'advanced':
      return `back in ${days(Math.max(1, result.intervalDays))}`;
    case 'lapsed':
    case 'failed': {
      const minutes = Math.round((new Date(result.nextDueAt).getTime() - now.getTime()) / 60_000);
      return minutes > 0 && minutes < 60 ? `back in ${minutes} minutes` : `back ${relativeWhen(result.nextDueAt, now)}`;
    }
    default:
      return result.intervalDays > 0 ? `back in ${days(result.intervalDays)}` : 'back shortly';
  }
}

function ago(iso: string, now: Date): string {
  const d = calendarDaysBetween(new Date(iso), now);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
}

/** "Seen 4× · 2/4 correct · last wrong 3 days ago · next tomorrow" */
export function historyLine(detail: QuestionDetail, now = new Date()): string {
  const { state, history } = detail;
  const parts = [`Seen ${state.attempts}×`, `${state.correct}/${state.attempts} correct`];
  const lastWrong = history.find((h) => !h.correct);
  if (lastWrong) parts.push(`last wrong ${ago(lastWrong.answeredAt, now)}`);
  if (state.mastered) parts.push('mastered');
  if (state.dueAt) parts.push(state.due ? 'due now' : `next ${relativeWhen(state.dueAt, now)}`);
  return parts.join(' · ');
}

function History({ questionId }: { questionId: string }) {
  const { profile } = useApp();
  const [open, setOpen] = useState(false);
  const detail = useResource<QuestionDetail>(open && profile ? ['question', questionId, profile.id] : null, (signal) =>
    api.question(questionId, profile!.id, signal),
  );

  return (
    <div className="history">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-expanded={open}
        aria-controls={`history-${questionId}`}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide your history' : 'Your history with this question'}
      </button>
      {open && (
        <p id={`history-${questionId}`} className="meta history-line">
          {detail.data
            ? historyLine(detail.data)
            : detail.error
              ? `History unavailable: ${errorMessage(detail.error)}`
              : 'Loading…'}
        </p>
      )}
    </div>
  );
}

function FlagControl({ question }: { question: PublicQuestion }) {
  const { flaggedIds, flags, setFlag, notify } = useApp();
  const flagged = flaggedIds.has(question.id);
  const saved = flags?.find((f) => f.questionId === question.id)?.note ?? '';
  const [note, setNote] = useState(saved);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean, withNote?: string) {
    setBusy(true);
    try {
      await setFlag(question, next, withNote);
    } catch (err) {
      notify(`Could not ${next ? 'save the flag' : 'remove the flag'}: ${errorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }

  function saveNote() {
    void change(true, note.trim());
  }

  return (
    <div className="flag">
      <button
        type="button"
        className={`btn btn-sm${flagged ? ' btn-flagged' : ''}`}
        aria-pressed={flagged}
        disabled={busy}
        onClick={() => void change(!flagged, flagged ? undefined : note.trim() || undefined)}
      >
        <span aria-hidden="true">⚑</span> {flagged ? 'Flagged' : 'Flag for later'}
      </button>
      {flagged && (
        // A nested <form> is invalid inside the card's form, so this is a group with its own submit.
        <div className="flag-note" role="group" aria-label="Flag note">
          <label className="sr-only" htmlFor={`flag-note-${question.id}`}>
            Note for this flag
          </label>
          <input
            id={`flag-note-${question.id}`}
            className="input input-compact"
            value={note}
            maxLength={500}
            placeholder="Why? (optional)"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              // Enter here saves the note; it must not also submit the question form.
              if (e.key === 'Enter') {
                e.preventDefault();
                saveNote();
              }
            }}
          />
          <button type="button" className="btn btn-sm" disabled={busy || note.trim() === saved} onClick={saveNote}>
            Save note
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The verdict region exists before grading (empty), so a screen reader hears
 * the verdict the moment it is filled in (J30 / B14).
 */
export function Verdict({
  result,
  gaveUp,
  milestones,
}: {
  result: AnswerResult | null;
  gaveUp: boolean;
  milestones: string[];
}) {
  return (
    <div className="verdict-region" role="status">
      {result && (
        <div className={`feedback-head ${result.correct ? 'correct' : 'wrong'}`}>
          <span aria-hidden="true">{result.correct ? '✓' : gaveUp ? '…' : '✕'}</span>
          <span>{result.correct ? 'Correct' : gaveUp ? 'Answer shown' : 'Not quite'}</span>
          <span className="feedback-meta">
            +{result.xpEarned} XP · {outcomeCopy(result)}
            {result.mastered ? ' · mastered' : ''}
          </span>
        </div>
      )}
      {milestones.length > 0 && (
        <div className="milestones">
          {milestones.map((m) => (
            <div key={m} className="milestone">
              <span aria-hidden="true">★</span> {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Feedback({
  question,
  result,
  reason,
}: {
  question: PublicQuestion;
  result: AnswerResult;
  reason?: string;
}) {
  const accepted = question.type === 'short' && Array.isArray(result.answer) ? result.answer : null;
  return (
    <div className="feedback-body">
      {reason === 'practice' && result.outcome === 'practice' && (
        <p className="meta">This was extra practice: it counts toward accuracy, not toward the schedule.</p>
      )}
      {accepted && typeof accepted[0] === 'string' && (
        <p>
          <strong>Accepted:</strong> <code>{accepted[0] as string}</code>
        </p>
      )}
      <Markdown source={result.why} />
      {result.ask && (
        <div className="interview-note">
          <strong>Why they ask this — </strong>
          <Inline text={result.ask} />
        </div>
      )}
      <div className="feedback-tools">
        <FlagControl question={question} />
        <History questionId={question.id} />
      </div>
    </div>
  );
}
