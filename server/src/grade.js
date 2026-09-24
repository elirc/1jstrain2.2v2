/**
 * Answer grading.
 *
 * Grading lives on the server because the answer key never reaches the browser
 * — `publicQuestion()` strips `answer`, `why` and `ask`, and they come back
 * only in the response to an attempt. That is both the honest way to run a quiz
 * and a small demonstration of the "never trust the client" rule the security
 * module teaches.
 *
 * Choices are shuffled every time a question is served (see present.js), so a
 * displayed position means nothing to the server. The client answers with the
 * *choice ids* it was given; they are the contract, and an integer index is
 * rejected rather than guessed at.
 *
 * `grade()` separates two failures that used to be one:
 * - malformed (`valid: false`): the response is not a possible answer to this
 *   question at all — wrong JS type, unknown id, wrong length. That is a client
 *   bug, so nothing is recorded and nothing is revealed (400 invalid_response).
 * - wrong (`valid: true, correct: false`): a real answer that is not the key.
 */

export const MAX_SHORT_ANSWER = 500;

/**
 * Normalise a free-text answer so that formatting is never graded: Unicode
 * compatibility forms, smart quotes and dashes (macOS turns `--watch` into
 * `—watch`), wrapping backticks or quotes (nested too), case, whitespace and
 * trailing punctuation.
 */
export function normalise(text) {
  let s = String(text)
    .normalize('NFKC')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, '--')
    .trim()
    .replace(/[.!?;]+$/, '') // outside the quotes, as in `'use server'.`
    .trim();
  // Strip wrapping quotes/backticks, nested ones too: a learner who types
  // `'use server'` for the accepted answer 'use server' knows the answer.
  for (let wrapped; (wrapped = /^([`'"])([\s\S]*)\1$/.exec(s)) && wrapped[2].trim();) s = wrapped[2].trim();
  return s
    .toLowerCase()
    .replace(/[.!?;]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Authored index for each choice id of a question, built once per question. */
const indexCache = new WeakMap();
function choiceIndex(question) {
  let map = indexCache.get(question);
  if (!map) {
    map = new Map((question.choices ?? []).map((choice, i) => [choice.id, i]));
    indexCache.set(question, map);
  }
  return map;
}

const invalid = (reason) => ({ valid: false, correct: false, reason });

/**
 * @param {import('@jstrain/content').Question} question
 * @param {unknown} response
 * @returns {{ valid: true, correct: boolean } | { valid: false, correct: false, reason: string }}
 */
export function grade(question, response) {
  switch (question.type) {
    case 'mcq':
    case 'output': {
      if (typeof response !== 'string') return invalid('expected a choice id');
      const index = choiceIndex(question).get(response);
      if (index === undefined) return invalid('unknown choice id');
      return { valid: true, correct: index === question.answer };
    }

    case 'multi': {
      if (!Array.isArray(response) || !response.every((v) => typeof v === 'string')) {
        return invalid('expected an array of choice ids');
      }
      const ids = choiceIndex(question);
      if (!response.every((id) => ids.has(id))) return invalid('unknown choice id');
      // Deduplicate so a client that sends the same id twice is not punished
      // for a UI bug rather than a knowledge gap. `[]` is a real (wrong) answer.
      const picked = [...new Set(response.map((id) => ids.get(id)))];
      return { valid: true, correct: sameSet(picked, question.answer) };
    }

    case 'order': {
      if (!Array.isArray(response) || !response.every((v) => typeof v === 'string')) {
        return invalid('expected an array of choice ids');
      }
      const ids = choiceIndex(question);
      if (response.length !== question.choices.length) return invalid('expected every choice exactly once');
      if (!response.every((id) => ids.has(id))) return invalid('unknown choice id');
      if (new Set(response).size !== response.length) return invalid('expected every choice exactly once');
      return { valid: true, correct: response.every((id, i) => ids.get(id) === question.answer[i]) };
    }

    case 'boolean': {
      if (typeof response !== 'boolean') return invalid('expected true or false');
      return { valid: true, correct: response === question.answer };
    }

    case 'short': {
      if (typeof response !== 'string') return invalid('expected text');
      if (!response.trim()) return invalid('empty answer');
      if ([...response].length > MAX_SHORT_ANSWER) return invalid(`answer is over ${MAX_SHORT_ANSWER} characters`);
      const given = normalise(response);
      return { valid: true, correct: question.answer.some((accepted) => normalise(accepted) === given) };
    }

    default:
      return invalid(`unknown question type ${question.type}`);
  }
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * The teaching payload returned once an answer has been submitted.
 *
 * `answer` stays in its authored form (indices, boolean or accepted strings) for
 * any consumer that reads the content package; `answerChoiceIds` is what a
 * client rendering shuffled choices must use: the correct id for mcq/output,
 * the correct ids for multi, and the ids in the correct sequence for order.
 */
export function revealFor(question) {
  const choices = question.choices;
  let answerChoiceIds;
  if (question.type === 'mcq' || question.type === 'output') answerChoiceIds = [choices[question.answer].id];
  else if (question.type === 'multi' || question.type === 'order')
    answerChoiceIds = question.answer.map((i) => choices[i].id);

  return {
    answer: question.answer,
    ...(answerChoiceIds ? { answerChoiceIds } : {}),
    why: question.why,
    ...(question.ask ? { ask: question.ask } : {}),
  };
}
