/**
 * Presenting a question to the browser.
 *
 * `publicQuestion()` (in the content package) strips the answer key and stays
 * pure; the randomness lives here so it can be injected. Every time a question
 * leaves the server its choices are in a fresh order — authors put the right
 * answer second out of habit, and a quiz must not be beatable by position.
 * Choice ids (`<questionId>-c<authoredIndex>`) travel with the text, so the
 * grader never needs to know what order the learner saw.
 */

import { publicQuestion } from '@jstrain/content';

const SHUFFLED_TYPES = new Set(['mcq', 'output', 'multi', 'order']);

/**
 * @param {import('@jstrain/content').Question} question
 * @param {() => number} [rng]  returns [0, 1); injectable for tests
 */
export function presentQuestion(question, rng = Math.random) {
  const pub = publicQuestion(question);
  if (!SHUFFLED_TYPES.has(question.type) || !question.choices) return pub;

  let choices = shuffle(question.choices, rng);
  if (question.type === 'order' && choices.length > 1) {
    // An `order` question served already in the right order is a free point.
    const correct = question.answer.map((i) => question.choices[i].id);
    const isCorrect = (list) => list.every((c, i) => c.id === correct[i]);
    for (let tries = 0; isCorrect(choices) && tries < 10; tries++) choices = shuffle(question.choices, rng);
    // A degenerate rng could keep producing the same permutation: rotate by one,
    // which is never the identity for n > 1.
    if (isCorrect(choices)) choices = [...choices.slice(1), choices[0]];
  }
  return { ...pub, choices: choices.map((c) => ({ ...c })) };
}

/** Fisher-Yates over a copy. */
export function shuffle(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
