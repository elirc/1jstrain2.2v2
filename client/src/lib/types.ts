/**
 * The API contract, as the client sees it.
 *
 * The content package ships its own declarations, so the shared shapes
 * (Track, Stage, Module, PublicQuestion) are imported rather than retyped —
 * a change to the curriculum's shape becomes a compile error here instead of a
 * runtime surprise.
 */

import type { Module, PublicQuestion, Stage, Track, TrackId } from '@jstrain/content';

export type { Module, PublicQuestion, Stage, Track, TrackId };

export type SessionMode = 'module' | 'review' | 'daily' | 'stage' | 'track' | 'weak';

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

export interface ModuleSummary extends Module {
  questionCount: number;
  difficulty: Record<'1' | '2' | '3', number>;
}

export interface Curriculum {
  tracks: Track[];
  stages: Stage[];
  modules: ModuleSummary[];
  totals: { questions: number; modules: number };
}

export interface QuestionState {
  attempts: number;
  correct: number;
  mastered: boolean;
  due: boolean;
  dueAt: string | null;
}

export type QuestionWithState = PublicQuestion & { state: QuestionState };

export interface Session {
  mode: SessionMode;
  moduleId: string | null;
  stageId: string | null;
  trackId: string | null;
  requested: number;
  available: number;
  questions: PublicQuestion[];
}

/** What the server sends back once an answer has been graded. */
export interface AnswerResult {
  correct: boolean;
  reason?: string;
  answer: number | number[] | boolean | string[];
  why: string;
  ask?: string;
  xpEarned: number;
  mastered: boolean;
  wasFirstAttempt: boolean;
  nextDueAt: string;
  intervalDays: number;
}

export interface ModuleProgress {
  moduleId: string;
  trackId: TrackId;
  total: number;
  seen: number;
  mastered: number;
  due: number;
  attempts: number;
  accuracy: number | null;
  mastery: number;
}

export interface StageProgress {
  stageId: string;
  total: number;
  seen: number;
  mastered: number;
  due: number;
  mastery: number;
  unlocked: boolean;
}

export interface TrackProgress {
  trackId: TrackId;
  total: number;
  mastered: number;
  attempts: number;
  mastery: number;
  accuracy: number | null;
}

export interface DayActivity {
  date: string;
  attempts: number;
  correct: number;
}

export interface Progress {
  totals: {
    questions: number;
    seen: number;
    mastered: number;
    due: number;
    attempts: number;
    accuracy: number | null;
  };
  level: {
    level: number;
    title: string;
    xp: number;
    nextTitle: string | null;
    nextAtXp: number | null;
    progressToNext: number;
  };
  xp: number;
  streak: number;
  today: DayActivity;
  modules: ModuleProgress[];
  stages: StageProgress[];
  tracks: TrackProgress[];
  activity: DayActivity[];
}

export interface Health {
  status: string;
  env: string;
  storeBackend: 'sqlite' | 'json';
  content: Record<string, number>;
  uptimeSeconds: number;
}
