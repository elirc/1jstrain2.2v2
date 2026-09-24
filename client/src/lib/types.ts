/**
 * The API contract, as the client sees it.
 *
 * The content package ships its own declarations, so the shared shapes
 * (Track, Module, PublicQuestion) are imported rather than retyped — a change
 * to the curriculum's shape becomes a compile error here instead of a runtime
 * surprise. Everything else mirrors the release contract (CONTRACT.md).
 */

import type { Module, PublicQuestion, QuestionType, Stage as ContentStage, Track, TrackId } from '@jstrain/content';

export type { Module, PublicQuestion, QuestionType, Track, TrackId };

/**
 * A stage may name the stage it builds on (`after`); without it the gate is the
 * previous stage in list order. Declared here as well as in the content package
 * so the client compiles whether or not the content types carry it yet.
 */
export type Stage = ContentStage & { after?: string };

export type SessionMode = 'module' | 'review' | 'daily' | 'stage' | 'track' | 'weak' | 'flagged';

/** Why the server put a question into a session. */
export type SessionReason = 'due' | 'new' | 'relearn' | 'practice';

/** What one graded answer did to the schedule. */
export type Outcome = 'learned' | 'advanced' | 'practice' | 'lapsed' | 'failed';

export type ApiErrorCode =
  | 'invalid_json'
  | 'validation_failed'
  | 'invalid_response'
  | 'profile_required'
  | 'not_found'
  | 'last_profile'
  | 'payload_too_large'
  | 'internal_error'
  // The client's own failures:
  | 'network'
  | 'bad_response'
  | 'unknown';

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
  reps?: number;
  lapses?: number;
  mastered: boolean;
  due: boolean;
  dueAt: string | null;
  flagged?: boolean;
}

export type QuestionWithState = PublicQuestion & { state: QuestionState };

export type SessionQuestion = PublicQuestion & { reason?: SessionReason };

export interface Session {
  mode: SessionMode;
  moduleId: string | null;
  stageId: string | null;
  trackId: string | null;
  requested: number;
  available: number;
  /** Choices arrive shuffled; the client renders them in the order received. */
  questions: SessionQuestion[];
  empty?: true;
  nextDueAt?: string | null;
}

/**
 * The body of `POST /api/answers`. Choice questions always send choice IDS,
 * never positions: mcq/output one id, multi an id list, order the ids in the
 * learner's order.
 */
export type AnswerResponse = string | string[] | boolean;

export interface AnswerRequest {
  questionId: string;
  response?: AnswerResponse;
  elapsedMs?: number;
  giveUp?: boolean;
}

/** What the server sends back once an answer has been graded. */
export interface AnswerResult {
  correct: boolean;
  outcome: Outcome;
  /** The authored form. Meaningless for choice types once choices are shuffled — use `answerChoiceIds`. */
  answer: number | number[] | boolean | string[];
  /** mcq/output: [id]; multi: every correct id; order: the ids in the correct sequence. */
  answerChoiceIds?: string[];
  why: string;
  ask?: string;
  xpEarned: number;
  mastered: boolean;
  wasFirstAttempt: boolean;
  nextDueAt: string;
  intervalDays: number;
  state?: { attempts: number; correct: number; reps: number; lapses: number };
}

export interface ModuleProgress {
  moduleId: string;
  trackId: TrackId;
  total: number;
  seen: number;
  mastered: number;
  due: number;
  attempts: number;
  correct?: number;
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
    nextDueAt?: string | null;
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
  today: DayActivity & { goal?: number; goalMet?: boolean };
  modules: ModuleProgress[];
  stages: StageProgress[];
  tracks: TrackProgress[];
  activity: DayActivity[];
}

export interface AttemptSummary {
  id: number;
  correct: boolean;
  gaveUp: boolean;
  elapsedMs: number | null;
  answeredAt: string;
}

/** `GET /api/questions/:id` */
export interface QuestionDetail {
  question: PublicQuestion;
  state: {
    attempts: number;
    correct: number;
    reps: number;
    lapses: number;
    mastered: boolean;
    due: boolean;
    dueAt: string | null;
    intervalDays: number;
    lastAnsweredAt: string | null;
  };
  flag: { note: string; createdAt: string } | null;
  reveal: {
    answer: AnswerResult['answer'];
    answerChoiceIds?: string[];
    why: string;
    ask?: string;
  } | null;
  /** Newest first, at most 20. */
  history: AttemptSummary[];
}

/** `GET /api/attempts` */
export interface AttemptPage {
  items: (AttemptSummary & {
    questionId: string;
    moduleId: string;
    trackId: TrackId;
    type: QuestionType;
    prompt: string;
  })[];
  nextBefore: number | null;
}

/** `GET /api/flags` entries, newest first. */
export interface Flag {
  questionId: string;
  moduleId: string;
  trackId: TrackId;
  prompt: string;
  note: string;
  createdAt: string;
}

export interface Settings {
  /** Answers per day, 1..500. */
  dailyGoal: number;
  /** Questions per session when the URL does not say, 1..40. */
  sessionSize: number;
  /** New cards reserved in a daily mix, 0..100. */
  newPerDay: number;
}

export const SETTINGS_RANGES: Record<keyof Settings, { min: number; max: number }> = {
  dailyGoal: { min: 1, max: 500 },
  sessionSize: { min: 1, max: 40 },
  newPerDay: { min: 0, max: 100 },
};

/** `GET /api/profiles/:id/export` — also the body of `POST /api/profiles/import`. */
export interface ExportDocument {
  format: 'stack-ready-profile';
  version: 1;
  exportedAt: string;
  profile: { name: string; createdAt: string };
  settings: Settings;
  cardStates: unknown[];
  attempts: unknown[];
  flags: unknown[];
}

export interface ImportResult {
  profile: Profile;
  imported: { cardStates: number; attempts: number; flags: number };
  skipped: { unknownQuestionIds: string[] };
}

export interface Health {
  status: string;
  env: string;
  storeBackend: 'sqlite' | 'json';
  storeFallbackReason?: string | null;
  content: Record<string, number>;
  uptimeSeconds: number;
}
