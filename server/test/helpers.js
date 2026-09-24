/**
 * Test helpers: both store backends, a seeded PRNG, a movable clock and a real
 * HTTP server on an ephemeral port. No supertest and no property-testing
 * library: `fetch` is built in and mulberry32 is six lines.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateContent } from '@jstrain/content';
import { createApp } from '../src/app.js';
import { createJsonStore, createSqliteStore } from '../src/store.js';

export function tempDir(prefix = 'stack-ready-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Store factories for `describe.each`. Each returns `{ store, dir, file, cleanup }`.
 * The JSON backend is exercised on purpose: it is the fallback, and a fallback
 * nobody runs is a fallback that does not work.
 */
export const backends = [
  [
    'sqlite',
    async (dir = tempDir()) => {
      const { default: Database } = await import('better-sqlite3');
      const file = path.join(dir, 'progress.db');
      const store = await createSqliteStore(Database, file);
      return { store, dir, file, cleanup: () => (store.close(), removeDir(dir)) };
    },
  ],
  [
    'json',
    async (dir = tempDir()) => {
      const file = path.join(dir, 'progress.json');
      const store = createJsonStore(file);
      return { store, dir, file, cleanup: () => (store.close(), removeDir(dir)) };
    },
  ],
];

/** mulberry32: a tiny seeded PRNG so property tests are reproducible from the seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A clock the test moves by hand: `clock()` is the `now` the app sees. */
export function makeClock(start = '2026-03-02T17:00:00.000Z') {
  let t = new Date(start).getTime();
  const clock = () => new Date(t);
  clock.set = (when) => {
    t = new Date(when).getTime();
  };
  clock.advance = (ms) => {
    t += ms;
  };
  return clock;
}

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export const testConfig = (overrides = {}) => ({
  env: 'test',
  host: '127.0.0.1',
  port: 0,
  dataDir: '',
  corsOrigins: ['http://localhost:5173'],
  serveClient: false,
  clientDist: '',
  ...overrides,
});

/**
 * Start the real app on an ephemeral port. `api(method, path, { body, profile, headers, raw })`
 * returns `{ status, headers, body }` with the JSON already parsed.
 */
export async function startServer({ store, now, rng, config } = {}) {
  const app = createApp({ store, config: testConfig(config), contentReport: validateContent(), now, rng });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function api(method, url, { body, profile, headers = {}, raw } = {}) {
    const init = { method, headers: { ...headers } };
    if (profile) init.headers['x-profile-id'] = profile;
    if (raw !== undefined) {
      init.body = raw;
      init.headers['content-type'] ??= 'application/json';
    } else if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers['content-type'] = 'application/json';
    }
    const res = await fetch(base + url, init);
    const text = await res.text();
    let parsed = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* leave as text */
    }
    return { status: res.status, headers: res.headers, body: parsed };
  }

  return {
    base,
    api,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

/** The id the client would send for the authored index `i` of `question`. */
export const choiceId = (question, i) => question.choices[i].id;

/** A correct response for any question, in the id-based wire format. */
export function correctResponse(question) {
  switch (question.type) {
    case 'mcq':
    case 'output':
      return choiceId(question, question.answer);
    case 'multi':
    case 'order':
      return question.answer.map((i) => choiceId(question, i));
    case 'boolean':
      return question.answer;
    case 'short':
      return question.answer[0];
    default:
      throw new Error(`unknown type ${question.type}`);
  }
}

/** A well-formed but wrong response (or undefined when none exists). */
export function wrongResponse(question) {
  switch (question.type) {
    case 'mcq':
    case 'output':
      return choiceId(question, (question.answer + 1) % question.choices.length);
    case 'multi':
      return [];
    case 'order':
      return [...question.answer].reverse().map((i) => choiceId(question, i));
    case 'boolean':
      return !question.answer;
    case 'short':
      return 'definitely not the answer';
    default:
      return undefined;
  }
}
