/**
 * Answer grading.
 *
 * Grading lives on the server because the answer key never reaches the browser
 * — `publicQuestion()` strips `answer`, `why` and `ask`, and they come back
 * only in the response to an attempt. That is both the honest way to run a quiz
 * and a small demonstration of the "never trust the client" rule the security
 * module teaches.
 */

/** Normalise a free-text answer: case, surrounding whitespace, trailing punctuation. */
function normalise(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[.!?;]+$/, '')
    .replace(/\s+/g, ' ');
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * @param {import('@jstrain/content').Question} question
 * @param {unknown} response
 * @returns {{correct: boolean, reason?: string}}
 */
export function grade(question, response) {
  switch (question.type) {
    case 'mcq':
    case 'output': {
      if (!Number.isInteger(response)) return { correct: false, reason: 'expected a choice index' };
      return { correct: response === question.answer };
    }

    case 'multi': {
      if (!Array.isArray(response) || !response.every(Number.isInteger)) {
        return { correct: false, reason: 'expected an array of choice indices' };
      }
      // Deduplicate so a client that sends the same index twice is not punished
      // for a UI bug rather than a knowledge gap.
      return { correct: sameSet([...new Set(response)], question.answer) };
    }

    case 'order': {
      if (!Array.isArray(response) || response.length !== question.answer.length) {
        return { correct: false, reason: 'expected the full ordering' };
      }
      return { correct: response.every((v, i) => v === question.answer[i]) };
    }

    case 'boolean': {
      if (typeof response !== 'boolean') return { correct: false, reason: 'expected true or false' };
      return { correct: response === question.answer };
    }

    case 'short': {
      if (typeof response !== 'string') return { correct: false, reason: 'expected text' };
      const given = normalise(response);
      if (!given) return { correct: false, reason: 'empty answer' };
      return { correct: question.answer.some((accepted) => normalise(accepted) === given) };
    }

    default:
      return { correct: false, reason: `unknown question type ${question.type}` };
  }
}

/** The teaching payload returned once an answer has been submitted. */
export function revealFor(question) {
  return {
    answer: question.answer,
    why: question.why,
    ...(question.ask ? { ask: question.ask } : {}),
  };
}
