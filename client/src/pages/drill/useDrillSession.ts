import { useCallback, useEffect, useReducer, useRef } from 'react';

import { api, errorMessage, isAbortError, isApiError } from '../../lib/api';
import { useApp } from '../../lib/app-state';
import { diffMilestones } from '../../lib/milestones';
import type {
  AnswerRequest,
  AnswerResponse,
  AnswerResult,
  Progress,
  PublicQuestion,
  QuestionType,
  Session,
} from '../../lib/types';
import { specKey, toSessionRequest, type DrillSpec } from './params';

/**
 * A drill session as a state machine (journal J30).
 *
 *   loading ──loaded──▶ ready ──(edit)*──▶ submitting ──graded──▶ answered ──next──▶ …
 *      ▲                  │                    │
 *      └────restart───────┘               submitFailed ──▶ ready (draft kept)
 *
 * Every async result carries the `round` it was started in; a result from an
 * earlier round (the learner restarted, or left) is dropped by the reducer.
 * The draft holds choice IDS — the server shuffles choices on every serve, so
 * a position means nothing — and the client never reorders anything itself.
 */

export type Draft =
  { kind: 'choice'; picked: string[] } | { kind: 'text'; text: string } | { kind: 'order'; order: string[] };

export interface DrillItem {
  draft: Draft;
  submitting: boolean;
  result: AnswerResult | null;
  gaveUp: boolean;
  error: string | null;
  /** The server could not read the answer: nothing was recorded, the draft stays. */
  invalid: boolean;
  milestones: string[];
}

export interface DrillState {
  round: number;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  session: Session | null;
  index: number;
  items: DrillItem[];
  xp: number;
}

export type DrillAction =
  | { type: 'loaded'; round: number; session: Session }
  | { type: 'failed'; round: number; error: string }
  | { type: 'edit'; index: number; draft: Draft }
  | { type: 'submit'; index: number }
  | { type: 'graded'; round: number; index: number; result: AnswerResult; gaveUp: boolean }
  | { type: 'submitFailed'; round: number; index: number; error: string; invalid: boolean }
  | { type: 'milestones'; round: number; index: number; milestones: string[] }
  | { type: 'next' }
  | { type: 'restart' };

export const BOOLEAN_CHOICES = [
  { id: 'true', text: 'True' },
  { id: 'false', text: 'False' },
] as const;

export function isChoiceType(type: QuestionType): boolean {
  return type === 'mcq' || type === 'output' || type === 'multi' || type === 'boolean';
}

/** The choices to render, in the order the server sent them. */
export function choicesFor(question: PublicQuestion): readonly { id: string; text: string }[] {
  return question.type === 'boolean' ? BOOLEAN_CHOICES : (question.choices ?? []);
}

/** The empty draft for a question. An order draft starts in the server's (already shuffled) order. */
export function initialDraft(question: PublicQuestion): Draft {
  if (question.type === 'short') return { kind: 'text', text: '' };
  if (question.type === 'order') return { kind: 'order', order: (question.choices ?? []).map((c) => c.id) };
  return { kind: 'choice', picked: [] };
}

/** Picking a choice: `multi` toggles membership, everything else replaces. */
export function togglePick(question: PublicQuestion, draft: Draft, id: string): Draft {
  if (draft.kind !== 'choice') return draft;
  if (question.type !== 'multi') return { kind: 'choice', picked: [id] };
  return {
    kind: 'choice',
    picked: draft.picked.includes(id) ? draft.picked.filter((p) => p !== id) : [...draft.picked, id],
  };
}

export function moveItem(draft: Draft, from: number, to: number): Draft {
  if (draft.kind !== 'order' || to < 0 || to >= draft.order.length) return draft;
  const order = [...draft.order];
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  return { kind: 'order', order };
}

export const SHORT_MAX = 500;

/**
 * The `response` for `POST /api/answers`, or `undefined` while the draft is
 * not a complete answer. Choice types send ids, never positions.
 */
export function toResponse(question: PublicQuestion, draft: Draft): AnswerResponse | undefined {
  switch (question.type) {
    case 'mcq':
    case 'output':
      return draft.kind === 'choice' ? draft.picked[0] : undefined;
    case 'multi':
      return draft.kind === 'choice' && draft.picked.length > 0 ? [...draft.picked] : undefined;
    case 'boolean':
      return draft.kind === 'choice' && draft.picked[0] !== undefined ? draft.picked[0] === 'true' : undefined;
    case 'short': {
      if (draft.kind !== 'text') return undefined;
      const text = draft.text.trim();
      return text ? text.slice(0, SHORT_MAX) : undefined;
    }
    case 'order':
      return draft.kind === 'order' ? [...draft.order] : undefined;
    default:
      return undefined;
  }
}

/** The ids that are correct, from the reveal — never from the authored `answer` index. */
export function revealedIds(question: PublicQuestion, result: AnswerResult | null): string[] {
  if (!result) return [];
  if (question.type === 'boolean') return [result.answer === true ? 'true' : 'false'];
  return result.answerChoiceIds ?? [];
}

const blankItem = (question: PublicQuestion): DrillItem => ({
  draft: initialDraft(question),
  submitting: false,
  result: null,
  gaveUp: false,
  error: null,
  invalid: false,
  milestones: [],
});

export const initialDrillState: DrillState = {
  round: 0,
  status: 'loading',
  error: null,
  session: null,
  index: 0,
  items: [],
  xp: 0,
};

function updateItem(state: DrillState, index: number, patch: Partial<DrillItem>): DrillState {
  const items = state.items.slice();
  items[index] = { ...items[index], ...patch };
  return { ...state, items };
}

export function drillReducer(state: DrillState, action: DrillAction): DrillState {
  switch (action.type) {
    case 'loaded':
      if (action.round !== state.round) return state;
      return {
        ...state,
        status: 'ready',
        error: null,
        session: action.session,
        index: 0,
        items: action.session.questions.map(blankItem),
        xp: 0,
      };

    case 'failed':
      if (action.round !== state.round) return state;
      return { ...state, status: 'error', error: action.error };

    case 'edit': {
      const item = state.items[action.index];
      if (!item || item.submitting || item.result) return state;
      return updateItem(state, action.index, { draft: action.draft, error: null, invalid: false });
    }

    case 'submit': {
      const item = state.items[action.index];
      // The guard that makes a double Enter (or Enter + click) one POST.
      if (!item || item.submitting || item.result) return state;
      return updateItem(state, action.index, { submitting: true, error: null, invalid: false });
    }

    case 'graded': {
      const item = state.items[action.index];
      if (action.round !== state.round || !item || item.result) return state;
      const next = updateItem(state, action.index, {
        submitting: false,
        result: action.result,
        gaveUp: action.gaveUp,
      });
      return { ...next, xp: state.xp + action.result.xpEarned };
    }

    case 'submitFailed': {
      if (action.round !== state.round || !state.items[action.index]) return state;
      return updateItem(state, action.index, {
        submitting: false,
        error: action.error,
        invalid: action.invalid,
      });
    }

    case 'milestones': {
      const item = state.items[action.index];
      if (action.round !== state.round || !item) return state;
      // Append, never replace: two refreshes can land on the same card.
      const merged = [...item.milestones, ...action.milestones.filter((m) => !item.milestones.includes(m))];
      if (merged.length === item.milestones.length) return state;
      return updateItem(state, action.index, { milestones: merged });
    }

    case 'next': {
      const item = state.items[state.index];
      if (!item?.result) return state;
      return { ...state, index: state.index + 1 };
    }

    case 'restart':
      return { ...initialDrillState, round: state.round + 1 };

    default:
      return state;
  }
}

export function isFinished(state: DrillState): boolean {
  return (
    state.status === 'ready' &&
    state.session !== null &&
    state.session.questions.length > 0 &&
    state.index >= state.session.questions.length
  );
}

export function answeredCount(state: DrillState): number {
  return state.items.filter((item) => item.result).length;
}

/* -------------------------------------------------------------------------- */

export function useDrillSession(spec: DrillSpec, profileId: string) {
  const { refreshProgress, setSessionInProgress, curriculum, progress } = useApp();
  const [state, dispatch] = useReducer(drillReducer, initialDrillState);

  const latest = useRef(state);
  latest.current = state;
  const progressBefore = useRef(progress);
  progressBefore.current = progress;
  // The last snapshot a milestone was diffed against. Two answers in quick
  // succession both start before the first refresh lands; diffing each
  // against "progress at send time" would announce the same level-up twice.
  const announcedFrom = useRef<Progress | null>(null);
  const inFlight = useRef(new Set<string>());
  const startedAt = useRef(Date.now());

  const key = specKey(spec);
  const specRef = useRef(spec);
  specRef.current = spec;

  // Load (and reload on restart). The controller cancels a superseded request.
  useEffect(() => {
    const controller = new AbortController();
    const round = state.round;
    api.startSession(profileId, toSessionRequest(specRef.current), controller.signal).then(
      (session) => dispatch({ type: 'loaded', round, session }),
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        dispatch({ type: 'failed', round, error: errorMessage(err, 'Could not start the session.') });
      },
    );
    return () => controller.abort();
  }, [profileId, key, state.round]);

  // The clock for `elapsedMs` starts when a question is shown.
  useEffect(() => {
    startedAt.current = Date.now();
  }, [state.round, state.index, state.status]);

  const finished = isFinished(state);
  const answered = answeredCount(state);

  // Tell the app a live session would be lost by leaving (profile switch guard).
  useEffect(() => {
    setSessionInProgress(answered > 0 && !finished);
    return () => setSessionInProgress(false);
  }, [answered, finished, setSessionInProgress]);

  // Leaving after answering anything: make sure the dashboard is current.
  const answeredRef = useRef(answered);
  answeredRef.current = answered;
  useEffect(
    () => () => {
      if (answeredRef.current > 0) void refreshProgress();
    },
    [refreshProgress],
  );

  const send = useCallback(
    (giveUp: boolean) => {
      const s = latest.current;
      const index = s.index;
      const question = s.session?.questions[index];
      const item = s.items[index];
      if (!question || !item || item.submitting || item.result) return;

      const flightKey = `${s.round}:${index}`;
      if (inFlight.current.has(flightKey)) return;

      const response = giveUp ? undefined : toResponse(question, item.draft);
      if (!giveUp && response === undefined) return;

      inFlight.current.add(flightKey);
      dispatch({ type: 'submit', index });

      const elapsedMs = Math.max(0, Math.min(3_600_000, Math.round(Date.now() - startedAt.current)));
      const body: AnswerRequest = giveUp
        ? { questionId: question.id, giveUp: true, elapsedMs }
        : { questionId: question.id, response, elapsedMs };
      const round = s.round;

      api
        .answer(profileId, body)
        .then(
          (result) => {
            dispatch({ type: 'graded', round, index, result, gaveUp: giveUp });
            // Progress refreshes from the event path, after every graded answer.
            void refreshProgress().then((after) => {
              if (!after) return;
              const before = announcedFrom.current ?? progressBefore.current;
              announcedFrom.current = after;
              const milestones = diffMilestones(before, after, curriculum);
              if (!milestones.length) return;
              // Announce on the card that is on screen: the learner may have
              // moved on to the next question before this refresh landed.
              const now = latest.current;
              const target = now.round === round ? Math.min(now.index, now.items.length - 1) : index;
              dispatch({ type: 'milestones', round, index: target, milestones });
            });
          },
          (err: unknown) => {
            const invalid = isApiError(err, 'invalid_response');
            dispatch({
              type: 'submitFailed',
              round,
              index,
              invalid,
              error: invalid
                ? `The server could not read that answer (${errorMessage(err)}). Nothing was recorded — adjust it and try again.`
                : errorMessage(err, 'Could not submit that answer.'),
            });
          },
        )
        .finally(() => inFlight.current.delete(flightKey));
    },
    [profileId, refreshProgress, curriculum],
  );

  const submit = useCallback(() => send(false), [send]);
  const giveUp = useCallback(() => send(true), [send]);
  const edit = useCallback((draft: Draft) => dispatch({ type: 'edit', index: latest.current.index, draft }), []);
  const next = useCallback(() => dispatch({ type: 'next' }), []);
  const restart = useCallback(() => dispatch({ type: 'restart' }), []);

  return { state, finished, answered, submit, giveUp, edit, next, restart };
}
