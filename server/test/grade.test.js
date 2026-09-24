import { describe, expect, it } from 'vitest';
import { curriculum } from '@jstrain/content';

import { grade, normalise, revealFor } from '../src/grade.js';
import { choiceId, correctResponse, mulberry32 } from './helpers.js';

const first = (type) => curriculum.questions.find((q) => q.type === type);

describe('grade()', () => {
  it('mcq/output accept the matching choice id and reject the integer index as malformed', () => {
    for (const type of ['mcq', 'output']) {
      const q = first(type);
      expect(grade(q, choiceId(q, q.answer))).toEqual({ valid: true, correct: true });
      expect(grade(q, choiceId(q, (q.answer + 1) % q.choices.length))).toEqual({ valid: true, correct: false });
      expect(grade(q, q.answer).valid).toBe(false);
    }
  });

  it('malformed responses are invalid, not wrong: "1", 1.5, null, {}, true, unknown id for mcq', () => {
    const q = first('mcq');
    for (const bad of ['1', 1.5, null, {}, true, [], `${q.id}-c99`, 'another-question-c0']) {
      expect(grade(q, bad)).toMatchObject({ valid: false, correct: false });
    }
  });

  it('multi: order-insensitive, dedupes, subset and superset fail, [] is wrong-not-invalid', () => {
    const q = curriculum.questions.find(
      (x) => x.type === 'multi' && x.answer.length >= 2 && x.answer.length < x.choices.length,
    );
    const ids = q.answer.map((i) => choiceId(q, i));
    expect(grade(q, [...ids].reverse()).correct).toBe(true);
    expect(grade(q, [...ids, ids[0]]).correct).toBe(true);
    expect(grade(q, ids.slice(1)).correct).toBe(false);
    const extra = q.choices.find((c) => !ids.includes(c.id)).id;
    expect(grade(q, [...ids, extra]).correct).toBe(false);
    expect(grade(q, [])).toEqual({ valid: true, correct: false });
    expect(grade(q, [q.answer[0]]).valid).toBe(false);
    expect(grade(q, ids[0]).valid).toBe(false);
  });

  it('order: exact sequence only; integers, wrong length, duplicates or unknown ids are invalid', () => {
    const q = first('order');
    const ids = q.answer.map((i) => choiceId(q, i));
    expect(grade(q, ids)).toEqual({ valid: true, correct: true });
    expect(grade(q, [...ids].reverse())).toEqual({ valid: true, correct: false });
    expect(grade(q, q.answer).valid).toBe(false);
    expect(grade(q, ids.slice(1)).valid).toBe(false);
    expect(grade(q, [ids[0], ...ids.slice(0, -1)]).valid).toBe(false);
    expect(grade(q, [...ids.slice(0, -1), 'nope']).valid).toBe(false);
  });

  it('boolean and short reject the wrong JS type as malformed', () => {
    expect(grade(first('boolean'), 'true').valid).toBe(false);
    const short = first('short');
    expect(grade(short, 42).valid).toBe(false);
    expect(grade(short, '   ').valid).toBe(false);
    expect(grade(short, 'x'.repeat(501)).valid).toBe(false);
  });

  it('short: case, whitespace, trailing punctuation, backticks, quotes, smart quotes and dashes all normalise', () => {
    expect(normalise('  `npm ci`  ')).toBe('npm ci');
    expect(normalise('"npm ci"')).toBe('npm ci');
    expect(normalise("`'use server'`")).toBe(normalise("'use server'"));
    expect(normalise('“npm ci”')).toBe('npm ci');
    expect(normalise('—watch')).toBe('--watch');
    expect(normalise('NPM   CI.')).toBe('npm ci');
    expect(normalise('ＡＢＣ')).toBe('abc'); // full-width, via NFKC
    for (const q of curriculum.questions.filter((x) => x.type === 'short')) {
      for (const accepted of q.answer) {
        for (const wrap of [(a) => `\`${a}\``, (a) => ` ${a.toUpperCase()}. `, (a) => `"${a}"`]) {
          expect(grade(q, wrap(accepted)).correct, `${q.id}: ${wrap(accepted)}`).toBe(true);
        }
      }
    }
  });

  it('property: for every question in the curriculum the key is correct, and for mcq/output every other choice is wrong', () => {
    for (const q of curriculum.questions) {
      expect(grade(q, correctResponse(q)), q.id).toEqual({ valid: true, correct: true });
      if (q.type === 'mcq' || q.type === 'output') {
        q.choices.forEach((c, i) => {
          if (i !== q.answer) expect(grade(q, c.id).correct, `${q.id} choice ${i}`).toBe(false);
        });
      }
    }
  });

  const SEED = 1337;
  it(`property (seed ${SEED}): for random JSON values grade never throws and returns a boolean verdict`, () => {
    const rng = mulberry32(SEED);
    const ids = curriculum.questions.flatMap((q) => (q.choices ?? []).map((c) => c.id));
    const atom = () => {
      const pick = Math.floor(rng() * 9);
      return [
        null,
        true,
        false,
        rng() * 10,
        Math.floor(rng() * 5),
        '',
        'x',
        ids[Math.floor(rng() * ids.length)],
        undefined,
      ][pick];
    };
    const value = (depth = 0) => {
      const r = rng();
      if (depth < 2 && r < 0.2) return Array.from({ length: Math.floor(rng() * 5) }, () => value(depth + 1));
      if (depth < 2 && r < 0.3) return { a: value(depth + 1) };
      return atom();
    };
    for (let i = 0; i < 3000; i++) {
      const q = curriculum.questions[Math.floor(rng() * curriculum.questions.length)];
      const verdict = grade(q, value());
      expect(typeof verdict.correct).toBe('boolean');
      expect(typeof verdict.valid).toBe('boolean');
      if (!verdict.valid) expect(verdict.correct).toBe(false);
    }
  });
});

describe('revealFor()', () => {
  it('keeps the authored answer and adds answerChoiceIds for the choice types', () => {
    const mcq = first('mcq');
    expect(revealFor(mcq)).toMatchObject({
      answer: mcq.answer,
      answerChoiceIds: [choiceId(mcq, mcq.answer)],
      why: mcq.why,
    });

    const order = first('order');
    expect(revealFor(order).answerChoiceIds).toEqual(order.answer.map((i) => choiceId(order, i)));

    const multi = first('multi');
    expect(revealFor(multi).answerChoiceIds).toEqual(multi.answer.map((i) => choiceId(multi, i)));

    expect(revealFor(first('boolean'))).not.toHaveProperty('answerChoiceIds');
    expect(revealFor(first('short'))).not.toHaveProperty('answerChoiceIds');
  });
});
