/**
 * The curriculum, assembled and self-checked.
 *
 * Both the Node server and the Vite client import this module directly — it is
 * plain ESM with no build step, so there is exactly one copy of the content and
 * no generated JSON to fall out of date.
 */

import { tracks, stages } from './tracks.js';
import { modules } from './modules/index.js';
import { publicQuestion } from './schema.js';

import { jsQuestions } from './questions/js.js';
import { tsQuestions } from './questions/ts.js';
import { reactQuestions } from './questions/react.js';
import { nodeQuestions } from './questions/node.js';
import { webQuestions } from './questions/web.js';
import { dataQuestions } from './questions/data.js';
import { csharpQuestions } from './questions/csharp.js';
import { dotnetQuestions } from './questions/dotnet.js';
import { craftQuestions } from './questions/craft.js';

/** @type {import('./types.d.ts').Question[]} */
export const questions = [
  ...jsQuestions,
  ...tsQuestions,
  ...reactQuestions,
  ...nodeQuestions,
  ...webQuestions,
  ...dataQuestions,
  ...csharpQuestions,
  ...dotnetQuestions,
  ...craftQuestions,
];

export { tracks, stages, modules, publicQuestion };

const moduleById = new Map(modules.map((m) => [m.id, m]));
const questionById = new Map(questions.map((q) => [q.id, q]));

/** @type {Map<string, import('./types.d.ts').Question[]>} */
const questionsByModuleId = new Map();
for (const question of questions) {
  const list = questionsByModuleId.get(question.moduleId);
  if (list) list.push(question);
  else questionsByModuleId.set(question.moduleId, [question]);
}

export function getModule(id) {
  return moduleById.get(id);
}

export function getQuestion(id) {
  return questionById.get(id);
}

export function questionsByModule(moduleId) {
  return questionsByModuleId.get(moduleId) ?? [];
}

/**
 * Fail loudly on inconsistent content. Called at server start-up so a bad edit
 * is caught immediately rather than showing up as an empty module in the UI.
 */
export function validateContent() {
  const problems = [];
  const trackIds = new Set(tracks.map((t) => t.id));
  const stagedModules = stages.flatMap((s) => s.modules);

  for (const m of modules) {
    if (!trackIds.has(m.trackId)) problems.push(`module ${m.id} has unknown track ${m.trackId}`);
    if (!m.primer?.trim()) problems.push(`module ${m.id} has an empty primer`);
    if (stagedModules.filter((id) => id === m.id).length !== 1) {
      problems.push(`module ${m.id} must appear in exactly one stage`);
    }
    const count = questionsByModule(m.id).length;
    if (count === 0) problems.push(`module ${m.id} has no questions`);
  }

  for (const id of stagedModules) {
    if (!moduleById.has(id)) problems.push(`stage references unknown module ${id}`);
  }

  for (const question of questions) {
    const parent = moduleById.get(question.moduleId);
    if (!parent) problems.push(`question ${question.id} has unknown module ${question.moduleId}`);
    else if (parent.trackId !== question.trackId) {
      problems.push(`question ${question.id} track (${question.trackId}) disagrees with its module`);
    }
  }

  if (problems.length) {
    throw new Error(`[content] ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  }

  /** @type {Record<string, number>} */
  const counts = { tracks: tracks.length, stages: stages.length, modules: modules.length, questions: questions.length };
  for (const t of tracks) {
    counts[`track:${t.id}`] = questions.filter((q) => q.trackId === t.id).length;
  }
  return { ok: true, counts };
}

/** @type {import('./types.d.ts').Curriculum} */
export const curriculum = { tracks, stages, modules, questions };
