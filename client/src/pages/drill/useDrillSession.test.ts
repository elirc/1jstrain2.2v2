import { describe, expect, it } from 'vitest';

import { makeResult, makeSession, mcq, multi, order, short } from '../../test/fixtures';
import type { PublicQuestion } from '../../lib/types';
import {
  drillReducer,
  initialDraft,
  initialDrillState,
  isFinished,
  revealedIds,
  togglePick,
  toResponse,
  type DrillState,
} from './useDrillSession';

const loaded = (): DrillState =>
  drillReducer(initialDrillState, { type: 'loaded', round: 0, session: makeSession([mcq, multi]) });

describe('drill reducer', () => {
  // 16 (B15)
  it('ignores a graded result from a previous round', () => {
    let state = drillReducer(loaded(), { type: 'submit', index: 0 });
    state = drillReducer(state, { type: 'restart' });
    state = drillReducer(state, { type: 'loaded', round: 1, session: makeSession([mcq]) });
    const after = drillReducer(state, { type: 'graded', round: 0, index: 0, result: makeResult(), gaveUp: false });
    expect(after).toBe(state);
    expect(after.items[0].result).toBeNull();
    expect(after.xp).toBe(0);
    // A late session from round 0 is dropped as well.
    expect(drillReducer(state, { type: 'loaded', round: 0, session: makeSession([multi]) })).toBe(state);
  });

  // 17 (B13)
  it('submit is a no-op while submitting or once graded', () => {
    const submitting = drillReducer(loaded(), { type: 'submit', index: 0 });
    expect(submitting.items[0].submitting).toBe(true);
    expect(drillReducer(submitting, { type: 'submit', index: 0 })).toBe(submitting);

    const graded = drillReducer(submitting, {
      type: 'graded',
      round: 0,
      index: 0,
      result: makeResult(),
      gaveUp: false,
    });
    expect(graded.xp).toBe(10);
    expect(drillReducer(graded, { type: 'submit', index: 0 })).toBe(graded);
    // A second grading of the same item (a replayed response) cannot double the XP.
    expect(drillReducer(graded, { type: 'graded', round: 0, index: 0, result: makeResult(), gaveUp: false }).xp).toBe(
      10,
    );
    // Edits after grading are ignored too.
    expect(drillReducer(graded, { type: 'edit', index: 0, draft: { kind: 'choice', picked: ['x'] } })).toBe(graded);
  });

  // 18 (B1)
  it('restart bumps the round and clears answers', () => {
    let state = drillReducer(loaded(), { type: 'submit', index: 0 });
    state = drillReducer(state, { type: 'graded', round: 0, index: 0, result: makeResult(), gaveUp: false });
    state = drillReducer(state, { type: 'next' });
    const restarted = drillReducer(state, { type: 'restart' });
    expect(restarted.round).toBe(1);
    expect(restarted.status).toBe('loading');
    expect(restarted.items).toEqual([]);
    expect(restarted.index).toBe(0);
    expect(restarted.xp).toBe(0);
  });

  it('keeps the draft and flags an invalid response without advancing', () => {
    let state = drillReducer(loaded(), {
      type: 'edit',
      index: 0,
      draft: { kind: 'choice', picked: ['js-values-1-c0'] },
    });
    state = drillReducer(state, { type: 'submit', index: 0 });
    state = drillReducer(state, { type: 'submitFailed', round: 0, index: 0, error: 'bad', invalid: true });
    expect(state.items[0].draft).toEqual({ kind: 'choice', picked: ['js-values-1-c0'] });
    expect(state.items[0].invalid).toBe(true);
    expect(state.items[0].submitting).toBe(false);
    expect(drillReducer(state, { type: 'next' })).toBe(state); // cannot advance ungraded
    expect(isFinished(state)).toBe(false);
  });
});

describe('toResponse', () => {
  // 19 + 37: choice types send choice IDS, never positions
  it('maps each question type, with ids for choice types', () => {
    const boolQ = { ...mcq, id: 'b', type: 'boolean', choices: undefined } as PublicQuestion;
    expect(toResponse(boolQ, { kind: 'choice', picked: ['true'] })).toBe(true);
    expect(toResponse(boolQ, { kind: 'choice', picked: ['false'] })).toBe(false);
    expect(toResponse(mcq, { kind: 'choice', picked: ['js-values-1-c0'] })).toBe('js-values-1-c0');
    expect(toResponse(multi, { kind: 'choice', picked: ['js-values-2-c1', 'js-values-2-c0'] })).toEqual([
      'js-values-2-c1',
      'js-values-2-c0',
    ]);
    expect(toResponse(short, { kind: 'text', text: '  404 ' })).toBe('404');
    expect(toResponse(order, { kind: 'order', order: ['o-c0', 'o-c1', 'o-c2'] })).toEqual(['o-c0', 'o-c1', 'o-c2']);
    // Incomplete drafts are not answers.
    expect(toResponse(mcq, { kind: 'choice', picked: [] })).toBeUndefined();
    expect(toResponse(multi, { kind: 'choice', picked: [] })).toBeUndefined();
    expect(toResponse(short, { kind: 'text', text: '   ' })).toBeUndefined();
    // No code path produces an integer.
    for (const r of [toResponse(mcq, { kind: 'choice', picked: ['js-values-1-c0'] })]) {
      expect(typeof r).not.toBe('number');
    }
  });

  it('multi toggles membership; single-answer types replace', () => {
    let draft = initialDraft(multi);
    draft = togglePick(multi, draft, 'a');
    draft = togglePick(multi, draft, 'b');
    draft = togglePick(multi, draft, 'a');
    expect(draft).toEqual({ kind: 'choice', picked: ['b'] });
    expect(togglePick(mcq, { kind: 'choice', picked: ['a'] }, 'b')).toEqual({ kind: 'choice', picked: ['b'] });
  });

  // 20 (reshaped by the contract): the server shuffles; the client never does.
  it('the initial order draft is exactly the order the server sent', () => {
    for (let run = 0; run < 50; run += 1) {
      expect(initialDraft(order)).toEqual({ kind: 'order', order: ['o-c2', 'o-c0', 'o-c1'] });
    }
  });

  it('reads the reveal from answerChoiceIds, never from the authored index', () => {
    const result = makeResult({ answer: 0, answerChoiceIds: ['js-values-1-c0'] });
    expect(revealedIds(mcq, result)).toEqual(['js-values-1-c0']);
    const boolQ = { ...mcq, type: 'boolean' } as PublicQuestion;
    expect(revealedIds(boolQ, makeResult({ answer: false, answerChoiceIds: undefined }))).toEqual(['false']);
  });
});
