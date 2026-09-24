import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { routes } from '../App';
import { AppProvider } from '../lib/app-state';
import type { AnswerResult, Curriculum, Profile, Progress, Session, SessionQuestion, Settings } from '../lib/types';
import { mockFetch, type Handler } from './fetchMock';

export const profileA: Profile = { id: 'p-a', name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' };
export const profileB: Profile = { id: 'p-b', name: 'Bo', createdAt: '2026-01-02T00:00:00.000Z' };

export const curriculum: Curriculum = {
  tracks: [
    { id: 'js', title: 'JavaScript', blurb: 'The language.', color: '#e0b000', icon: 'js' },
    { id: 'ts', title: 'TypeScript', blurb: 'Types.', color: '#3178c6', icon: 'ts' },
  ],
  stages: [
    { id: 's1', title: 'Stage one', blurb: 'Start here.', modules: ['js-values'], unlockAt: 0 },
    { id: 's2', title: 'Stage two', blurb: 'Then this.', modules: ['ts-basics'], unlockAt: 0.35 },
  ],
  modules: [
    {
      id: 'js-values',
      trackId: 'js',
      title: 'Values',
      blurb: 'Types and coercion.',
      primer: '## Values\n\nText.',
      objectives: ['Explain `==`'],
      estMinutes: 6,
      questionCount: 2,
      difficulty: { '1': 2, '2': 0, '3': 0 },
    },
    {
      id: 'ts-basics',
      trackId: 'ts',
      title: 'TS basics',
      blurb: 'Annotations.',
      primer: '## TS\n\nText.',
      objectives: ['Explain unknown'],
      estMinutes: 8,
      questionCount: 1,
      difficulty: { '1': 1, '2': 0, '3': 0 },
    },
  ],
  totals: { questions: 3, modules: 2 },
};

export function makeProgress(overrides: Partial<Progress> = {}): Progress {
  return {
    totals: { questions: 3, seen: 0, mastered: 0, due: 0, attempts: 0, accuracy: null, nextDueAt: null },
    level: { level: 1, title: 'Beginner', xp: 0, nextTitle: 'Junior', nextAtXp: 100, progressToNext: 0 },
    xp: 0,
    streak: 0,
    today: { date: '2026-09-24', attempts: 0, correct: 0, goal: 20, goalMet: false },
    modules: [
      {
        moduleId: 'js-values',
        trackId: 'js',
        total: 2,
        seen: 0,
        mastered: 0,
        due: 0,
        attempts: 0,
        correct: 0,
        accuracy: null,
        mastery: 0,
      },
      {
        moduleId: 'ts-basics',
        trackId: 'ts',
        total: 1,
        seen: 0,
        mastered: 0,
        due: 0,
        attempts: 0,
        correct: 0,
        accuracy: null,
        mastery: 0,
      },
    ],
    stages: [
      { stageId: 's1', total: 2, seen: 0, mastered: 0, due: 0, mastery: 0, unlocked: true },
      { stageId: 's2', total: 1, seen: 0, mastered: 0, due: 0, mastery: 0, unlocked: false },
    ],
    tracks: [
      { trackId: 'js', total: 2, mastered: 0, attempts: 0, mastery: 0, accuracy: null },
      { trackId: 'ts', total: 1, mastered: 0, attempts: 0, mastery: 0, accuracy: null },
    ],
    activity: [],
    ...overrides,
  };
}

export const settings: Settings = { dailyGoal: 20, sessionSize: 12, newPerDay: 10 };

export const mcq: SessionQuestion = {
  id: 'js-values-1',
  moduleId: 'js-values',
  trackId: 'js',
  type: 'mcq',
  difficulty: 1,
  prompt: 'What is `typeof null`?',
  choices: [
    { id: 'js-values-1-c2', text: '"undefined"' },
    { id: 'js-values-1-c0', text: '"object"' },
    { id: 'js-values-1-c1', text: '"null"' },
  ],
  tags: [],
  reason: 'new',
};

export const multi: SessionQuestion = {
  id: 'js-values-2',
  moduleId: 'js-values',
  trackId: 'js',
  type: 'multi',
  difficulty: 1,
  prompt: 'Which are falsy?',
  choices: [
    { id: 'js-values-2-c1', text: '`0`' },
    { id: 'js-values-2-c0', text: '`""`' },
    { id: 'js-values-2-c2', text: '`[]`' },
  ],
  tags: [],
};

export const short: SessionQuestion = {
  id: 'ts-basics-1',
  moduleId: 'ts-basics',
  trackId: 'ts',
  type: 'short',
  difficulty: 1,
  prompt: 'Status code for not found?',
  tags: [],
};

export const order: SessionQuestion = {
  id: 'js-values-3',
  moduleId: 'js-values',
  trackId: 'js',
  type: 'order',
  difficulty: 2,
  prompt: 'Order these',
  choices: [
    { id: 'o-c2', text: 'third' },
    { id: 'o-c0', text: 'first' },
    { id: 'o-c1', text: 'second' },
  ],
  tags: [],
};

export function makeSession(questions: SessionQuestion[], overrides: Partial<Session> = {}): Session {
  return {
    mode: 'daily',
    moduleId: null,
    stageId: null,
    trackId: null,
    requested: questions.length,
    available: questions.length,
    questions,
    nextDueAt: null,
    ...overrides,
  };
}

export function makeResult(overrides: Partial<AnswerResult> = {}): AnswerResult {
  return {
    correct: true,
    outcome: 'learned',
    answer: 0,
    answerChoiceIds: ['js-values-1-c0'],
    why: 'Because **history**.',
    xpEarned: 10,
    mastered: false,
    wasFirstAttempt: true,
    nextDueAt: new Date(Date.now() + 86_400_000).toISOString(),
    intervalDays: 1,
    state: { attempts: 1, correct: 1, reps: 1, lapses: 0 },
    ...overrides,
  };
}

/** The routes every app test needs, overridable per test. */
export function baseRoutes(extra: Record<string, Handler> = {}): Record<string, Handler> {
  return {
    'GET /api/profiles': { data: [profileA, profileB] },
    'GET /api/curriculum': { data: curriculum },
    'GET /api/progress': { data: makeProgress() },
    'GET /api/settings': { data: settings },
    'GET /api/flags': { data: [] },
    ...extra,
  };
}

export function renderApp(path: string, handlers: Record<string, Handler> = {}) {
  const fetchMock = mockFetch(baseRoutes(handlers));
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>,
  );
  return { ...utils, router, fetchMock };
}
