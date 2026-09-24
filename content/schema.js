/**
 * Authoring helpers.
 *
 * Questions are written in a deliberately terse shape (`choices` as plain
 * strings, `answer` as an index) so that a module file reads like a study sheet
 * rather than like JSON. `q()` expands that into the full Question object and
 * fails loudly on anything malformed — a typo'd answer index is a silently
 * wrong quiz, so it is worth catching at import time.
 */

/** @type {Set<string>} */
const seenIds = new Set();

/**
 * Build a question. `moduleId` and `trackId` are injected by `deck()`.
 * @param {object} input
 * @returns {(ctx: {moduleId: string, trackId: string}) => import('./types.d.ts').Question}
 */
export function q(input) {
  return ({ moduleId, trackId }) => {
    const { id, type = 'mcq', d = 2, prompt, code, lang, choices, answer, why, ask, tags = [] } = input;

    if (!id) throw new Error(`[content] question in ${moduleId} is missing an id`);
    if (seenIds.has(id)) throw new Error(`[content] duplicate question id: ${id}`);
    seenIds.add(id);

    const where = `[content] ${id}`;
    if (!prompt) throw new Error(`${where}: missing prompt`);
    if (!why) throw new Error(`${where}: missing explanation ("why")`);
    if (![1, 2, 3].includes(d)) throw new Error(`${where}: difficulty must be 1, 2 or 3`);

    /** @type {import('./types.d.ts').Choice[] | undefined} */
    let builtChoices;
    let builtAnswer = answer;

    if (type === 'mcq' || type === 'multi' || type === 'output' || type === 'order') {
      if (!Array.isArray(choices) || choices.length < 2) {
        throw new Error(`${where}: ${type} needs at least 2 choices`);
      }
      builtChoices = choices.map((text, i) => ({ id: `${id}-c${i}`, text: String(text) }));

      const inRange = (n) => Number.isInteger(n) && n >= 0 && n < choices.length;
      if (type === 'mcq' || type === 'output') {
        if (!inRange(answer)) throw new Error(`${where}: answer must be a choice index`);
      } else if (type === 'multi') {
        if (!Array.isArray(answer) || answer.length === 0 || !answer.every(inRange)) {
          throw new Error(`${where}: multi answer must be a non-empty array of choice indices`);
        }
        builtAnswer = [...answer].sort((a, b) => a - b);
      } else if (type === 'order') {
        if (
          !Array.isArray(answer) ||
          answer.length !== choices.length ||
          !answer.every(inRange) ||
          new Set(answer).size !== answer.length
        ) {
          throw new Error(`${where}: order answer must be a permutation of every choice index`);
        }
      }
    } else if (type === 'boolean') {
      if (typeof answer !== 'boolean') throw new Error(`${where}: boolean answer must be true/false`);
    } else if (type === 'short') {
      if (!Array.isArray(answer) || answer.length === 0 || !answer.every((a) => typeof a === 'string')) {
        throw new Error(`${where}: short answer must be an array of accepted strings`);
      }
    } else {
      throw new Error(`${where}: unknown type "${type}"`);
    }

    return {
      id,
      moduleId,
      trackId,
      type,
      difficulty: d,
      prompt,
      ...(code ? { code, lang: lang || defaultLang(trackId) } : {}),
      ...(builtChoices ? { choices: builtChoices } : {}),
      answer: builtAnswer,
      why,
      ...(ask ? { ask } : {}),
      tags,
    };
  };
}

function defaultLang(trackId) {
  if (trackId === 'csharp' || trackId === 'dotnet') return 'csharp';
  if (trackId === 'data') return 'sql';
  if (trackId === 'ts') return 'ts';
  if (trackId === 'react') return 'tsx';
  return 'js';
}

/**
 * Attach a module's questions to their module and track.
 * @param {string} moduleId
 * @param {string} trackId
 * @param {ReturnType<typeof q>[]} items
 */
export function deck(moduleId, trackId, items) {
  return items.map((make) => make({ moduleId, trackId }));
}

/** Strip the answer key before anything reaches the browser. */
export function publicQuestion(question) {
  const { answer, why, ask, ...rest } = question;
  return rest;
}
