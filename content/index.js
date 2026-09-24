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
import { lintContent } from './lint.js';

import { jsQuestions } from './questions/js.js';
import { tsQuestions } from './questions/ts.js';
import { reactQuestions } from './questions/react.js';
import { nodeQuestions } from './questions/node.js';
import { webPlatformQuestions } from './questions/web-platform.js';
import { webQuestions } from './questions/web.js';
import { dataQuestions } from './questions/data.js';
import { csharpQuestions } from './questions/csharp.js';
import { dotnetQuestions } from './questions/dotnet.js';
import { craftQuestions } from './questions/craft.js';
import { craftOpsQuestions } from './questions/craft-ops.js';
import { craftSeniorQuestions } from './questions/craft-senior.js';

/** @type {import('./types.d.ts').Question[]} */
export const questions = [
  ...jsQuestions,
  ...tsQuestions,
  ...reactQuestions,
  ...nodeQuestions,
  ...webPlatformQuestions,
  ...webQuestions,
  ...dataQuestions,
  ...csharpQuestions,
  ...dotnetQuestions,
  ...craftQuestions,
  ...craftOpsQuestions,
  ...craftSeniorQuestions,
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
  // While authors are adding modules that the stage list does not reference yet,
  // CONTENT_PARTIAL=1 downgrades the two membership checks to warnings so each
  // author can validate their own files. Never set it when running the app.
  const partial = globalThis.process?.env?.CONTENT_PARTIAL === '1';
  const membership = [];
  const trackIds = new Set(tracks.map((t) => t.id));
  const stagedModules = stages.flatMap((s) => s.modules);

  for (const m of modules) {
    if (!trackIds.has(m.trackId)) problems.push(`module ${m.id} has unknown track ${m.trackId}`);
    if (!m.primer?.trim()) problems.push(`module ${m.id} has an empty primer`);
    const stageCount = stagedModules.filter((id) => id === m.id).length;
    if (stageCount !== 1) {
      (partial && stageCount === 0 ? membership : problems).push(`module ${m.id} must appear in exactly one stage`);
    }
    const count = questionsByModule(m.id).length;
    if (count === 0) problems.push(`module ${m.id} has no questions`);
  }

  const stageIndex = new Map(stages.map((s, i) => [s.id, i]));
  if (stageIndex.size !== stages.length) problems.push('stage ids must be unique');
  stages.forEach((s, i) => {
    if (typeof s.unlockAt !== 'number' || !(s.unlockAt >= 0 && s.unlockAt <= 1)) {
      problems.push(`stage ${s.id} unlockAt must be a number from 0 to 1`);
    }
    if (i === 0 && s.unlockAt !== 0) problems.push(`stage ${s.id} is the first stage, so unlockAt must be 0`);
    if (s.after !== undefined) {
      const gate = stageIndex.get(s.after);
      if (gate === undefined) problems.push(`stage ${s.id} has unknown after: ${s.after}`);
      else if (gate >= i) problems.push(`stage ${s.id} after: ${s.after} must name an EARLIER stage`);
    }
  });

  for (const id of stagedModules) {
    if (!moduleById.has(id)) (partial ? membership : problems).push(`stage references unknown module ${id}`);
  }

  for (const question of questions) {
    const parent = moduleById.get(question.moduleId);
    if (!parent) problems.push(`question ${question.id} has unknown module ${question.moduleId}`);
    else if (parent.trackId !== question.trackId) {
      problems.push(`question ${question.id} track (${question.trackId}) disagrees with its module`);
    }
  }

  const lint = lintContent(modules, questions, questionsByModule);
  problems.push(...lint.problems);

  if (problems.length) {
    throw new Error(`[content] ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  }

  /** @type {Record<string, number>} */
  const counts = { tracks: tracks.length, stages: stages.length, modules: modules.length, questions: questions.length };
  for (const t of tracks) {
    counts[`track:${t.id}`] = questions.filter((q) => q.trackId === t.id).length;
  }
  const warnings = [...membership, ...lint.warnings];
  for (const warning of warnings) console.warn(`[content] warning: ${warning}`);
  return { ok: true, counts, warnings };
}

/** @type {import('./types.d.ts').Curriculum} */
export const curriculum = { tracks, stages, modules, questions };
