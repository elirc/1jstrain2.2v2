/**
 * Types for the curriculum content package.
 *
 * The content itself is authored in plain ESM JavaScript (see `questions/`) so
 * that the Node server and the Vite client can both `import` it directly with
 * no build step. These declarations give the TypeScript client full typing over
 * that JavaScript.
 */

export type TrackId =
  | 'js'
  | 'ts'
  | 'react'
  | 'node'
  | 'web'
  | 'data'
  | 'csharp'
  | 'dotnet'
  | 'craft';

/** 1 = "you just started", 2 = "junior", 3 = "mid-level expectation". */
export type Difficulty = 1 | 2 | 3;

export type QuestionType = 'mcq' | 'multi' | 'boolean' | 'output' | 'short' | 'order';

export interface Track {
  id: TrackId;
  title: string;
  /** One line shown on cards. */
  blurb: string;
  /** Hex accent used across the UI for anything belonging to this track. */
  color: string;
  icon: string;
}

export interface Stage {
  id: string;
  title: string;
  blurb: string;
  /** Module ids, in the order they should be attempted. */
  modules: string[];
  /**
   * Fraction of the previous stage's questions that must be *mastered* before
   * this stage unlocks. Stage 1 is always 0.
   */
  unlockAt: number;
}

export interface Module {
  id: string;
  trackId: TrackId;
  title: string;
  blurb: string;
  /** Reading material: short markdown primer covering everything the questions test. */
  primer: string;
  /** Bullet list of what you should be able to say out loud after this module. */
  objectives: string[];
  estMinutes: number;
}

export interface Choice {
  id: string;
  text: string;
}

/** A question as authored, including the answer key. Server-side only. */
export interface Question {
  id: string;
  moduleId: string;
  trackId: TrackId;
  type: QuestionType;
  difficulty: Difficulty;
  prompt: string;
  code?: string;
  lang?: string;
  choices?: Choice[];
  /** Index/indices into `choices`, a boolean, or accepted strings for `short`. */
  answer: number | number[] | boolean | string[];
  /** Always shown after answering. This is the actual teaching. */
  why: string;
  /** Optional: what an interviewer is really probing for. */
  ask?: string;
  tags: string[];
}

/** A question with the answer key stripped, as sent to the browser. */
export type PublicQuestion = Omit<Question, 'answer' | 'why' | 'ask'>;

export interface Curriculum {
  tracks: Track[];
  stages: Stage[];
  modules: Module[];
  questions: Question[];
}

export declare const tracks: Track[];
export declare const stages: Stage[];
export declare const modules: Module[];
export declare const questions: Question[];
export declare const curriculum: Curriculum;

export declare function publicQuestion(q: Question): PublicQuestion;
export declare function questionsByModule(moduleId: string): Question[];
export declare function getQuestion(id: string): Question | undefined;
export declare function getModule(id: string): Module | undefined;
/** Throws with a readable report if the authored content is inconsistent. */
export declare function validateContent(): { ok: true; counts: Record<string, number> };
