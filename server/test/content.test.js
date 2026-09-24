import { describe, expect, it } from 'vitest';
import { curriculum, publicQuestion } from '@jstrain/content';

import { presentQuestion } from '../src/present.js';
import { mulberry32 } from './helpers.js';

describe('what reaches the browser', () => {
  it('publicQuestion and presentQuestion never contain answer/why/ask, for every question', () => {
    const rng = mulberry32(1);
    for (const q of curriculum.questions) {
      for (const pub of [publicQuestion(q), presentQuestion(q, rng)]) {
        expect(pub).not.toHaveProperty('answer');
        expect(pub).not.toHaveProperty('why');
        expect(pub).not.toHaveProperty('ask');
      }
    }
  });

  it('served choices are a permutation of the authored choices, with ids and text preserved', () => {
    const rng = mulberry32(2);
    for (const q of curriculum.questions.filter((x) => x.choices)) {
      const served = presentQuestion(q, rng).choices;
      const byId = (list) => [...list].sort((a, b) => a.id.localeCompare(b.id));
      expect(byId(served), q.id).toEqual(byId(q.choices));
    }
  });

  it('an order question is never served already in the correct order, even with a degenerate rng', () => {
    const constant = () => 0;
    for (const q of curriculum.questions.filter((x) => x.type === 'order')) {
      const correct = q.answer.map((i) => q.choices[i].id);
      for (const rng of [mulberry32(3), constant, () => 0.999999]) {
        for (let i = 0; i < 20; i++) {
          expect(
            presentQuestion(q, rng).choices.map((c) => c.id),
            q.id,
          ).not.toEqual(correct);
        }
      }
    }
  });

  it('the shuffle actually moves the correct choice (index 0..3 all observed for a 4-choice mcq)', () => {
    const q = curriculum.questions.find((x) => x.type === 'mcq' && x.choices.length === 4);
    const rng = mulberry32(4);
    const seen = new Set();
    for (let i = 0; i < 200; i++)
      seen.add(presentQuestion(q, rng).choices.findIndex((c) => c.id === q.choices[q.answer].id));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });
});

/*
 * Content tripwires: three "tells" that let a learner score without reading.
 * Shuffling (present.js) removes the *position* tell at runtime; the other two
 * survive any shuffle and need a content pass. The content team is rebalancing
 * right now (correct-choice length, boolean true/false, and answer positions),
 * so these are `todo` by default rather than red. To see where the content
 * stands, run:
 *
 *   CONTENT_TRIPWIRES=1 npx vitest run test/content.test.js
 *
 * and once they pass, delete the gate so they guard every future edit.
 */
const tripwire = process.env.CONTENT_TRIPWIRES === '1' ? it : it.todo;

const choiceQuestions = () => curriculum.questions.filter((q) => q.type === 'mcq' || q.type === 'output');

describe('content tripwires (being rebalanced by the content team)', () => {
  tripwire("no single authored answer index covers more than 50% of any module's mcq/output questions", () => {
    const byModule = new Map();
    for (const q of choiceQuestions()) {
      const counts = byModule.get(q.moduleId) ?? {};
      counts[q.answer] = (counts[q.answer] ?? 0) + 1;
      byModule.set(q.moduleId, counts);
    }
    for (const [moduleId, counts] of byModule) {
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (total < 4) continue;
      expect(Math.max(...Object.values(counts)) / total, moduleId).toBeLessThanOrEqual(0.5);
    }
  });

  tripwire('the correct choice is the uniquely longest text in at most 40% of mcq/output questions', () => {
    const qs = choiceQuestions();
    const longest = qs.filter((q) => {
      const len = q.choices.map((c) => c.text.length);
      const max = Math.max(...len);
      return len[q.answer] === max && len.filter((l) => l === max).length === 1;
    });
    expect(longest.length / qs.length).toBeLessThanOrEqual(0.4);
  });

  tripwire('boolean answers are balanced: between 35% and 65% true', () => {
    const qs = curriculum.questions.filter((q) => q.type === 'boolean');
    const share = qs.filter((q) => q.answer === true).length / qs.length;
    expect(share).toBeGreaterThanOrEqual(0.35);
    expect(share).toBeLessThanOrEqual(0.65);
  });
});
