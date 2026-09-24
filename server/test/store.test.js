import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createStore, emptyCardState, SCHEMA_VERSION } from '../src/store.js';
import { backends, removeDir, tempDir } from './helpers.js';

const T0 = new Date('2026-03-02T17:00:00.000Z');
const iso = (offsetMs = 0) => new Date(T0.getTime() + offsetMs).toISOString();
const attempt = (profileId, questionId, n, extra = {}) => ({
  profileId,
  questionId,
  moduleId: 'js-values',
  trackId: 'js',
  correct: n % 2 === 0,
  elapsedMs: 1000 + n,
  answeredAt: iso(n * 1000),
  ...extra,
});
const card = (profileId, questionId, extra = {}) => ({
  ...emptyCardState(profileId, questionId),
  reps: 1,
  intervalDays: 1,
  attempts: 1,
  correct: 1,
  dueAt: iso(86_400_000),
  lastAnsweredAt: iso(),
  ...extra,
});

describe.each(backends)('store contract: %s', (backend, make) => {
  let ctx;
  afterEach(() => ctx?.cleanup());

  it('profile round-trip; delete cascades card states, attempts, flags and settings', async () => {
    ctx = await make();
    const { store } = ctx;
    const a = store.createProfile('Ada', T0);
    const b = store.createProfile('Bob', new Date(T0.getTime() + 1));
    expect(store.getProfile(a.id)).toEqual({ id: a.id, name: 'Ada', createdAt: T0.toISOString() });
    expect(store.listProfiles().map((p) => p.name)).toEqual(['Ada', 'Bob']);

    store.recordAnswer(card(a.id, 'js-values-1'), attempt(a.id, 'js-values-1', 0));
    store.setFlag(a.id, 'js-values-1', 'why?', T0);
    store.saveSettings(a.id, { dailyGoal: 5, sessionSize: 6, newPerDay: 7 });
    store.recordAnswer(card(b.id, 'js-values-1'), attempt(b.id, 'js-values-1', 0));

    expect(store.deleteProfile(a.id)).toBe(true);
    expect(store.deleteProfile(a.id)).toBe(false);
    expect(store.getProfile(a.id)).toBeUndefined();
    expect(store.listCardStates(a.id)).toEqual([]);
    expect(store.listAttempts(a.id)).toEqual([]);
    expect(store.listFlags(a.id)).toEqual([]);
    expect(store.getSettings(a.id)).toBeNull();
    // The other profile is untouched.
    expect(store.listAttempts(b.id)).toHaveLength(1);
  });

  it('getProfile and listProfiles return copies, not live objects', async () => {
    ctx = await make();
    const { store } = ctx;
    const p = store.createProfile('Ada', T0);
    store.getProfile(p.id).name = 'mutated';
    store.listProfiles()[0].name = 'mutated';
    expect(store.getProfile(p.id).name).toBe('Ada');
  });

  it('recordAnswer writes card and attempt together; a bad attempt rolls back the card', async () => {
    ctx = await make();
    const { store } = ctx;
    const p = store.createProfile('Ada', T0);
    const { attemptId } = store.recordAnswer(
      { ...card(p.id, 'js-values-1'), outcome: 'learned' },
      attempt(p.id, 'js-values-1', 0),
    );
    expect(attemptId).toBeTypeOf('number');
    expect(store.getCardState(p.id, 'js-values-1').reps).toBe(1);
    expect(store.getCardState(p.id, 'js-values-1')).not.toHaveProperty('outcome');

    expect(() =>
      store.recordAnswer(
        card(p.id, 'js-values-1', { reps: 5 }),
        attempt(p.id, 'js-values-1', 1, { moduleId: undefined }),
      ),
    ).toThrow();
    expect(store.getCardState(p.id, 'js-values-1').reps).toBe(1);
    expect(store.listAttempts(p.id)).toHaveLength(1);

    // The case above fails validation before any write. This one passes
    // validation, writes the card, and then the attempt insert fails (the
    // profile does not exist: a foreign-key error in SQLite), so it is the
    // transaction itself that must put the card back.
    expect(() =>
      store.recordAnswer(card(p.id, 'js-values-1', { reps: 5 }), attempt('no-such-profile', 'js-values-1', 1)),
    ).toThrow();
    expect(store.getCardState(p.id, 'js-values-1').reps).toBe(1);
    expect(store.listAttempts(p.id)).toHaveLength(1);
    expect(store.listAttempts('no-such-profile')).toEqual([]);
  });

  it('a card or an attempt for a profile that does not exist is refused on both backends', async () => {
    ctx = await make();
    const { store } = ctx;
    expect(() => store.saveCardState(card('ghost', 'js-values-1'))).toThrow();
    expect(() => store.addAttempt(attempt('ghost', 'js-values-1', 0))).toThrow();
    expect(store.listCardStates('ghost')).toEqual([]);
    expect(store.listAttempts('ghost')).toEqual([]);
  });

  it('listAttempts is chronological, id-tiebroken and shaped the same on both backends', async () => {
    ctx = await make();
    const { store } = ctx;
    const p = store.createProfile('Ada', T0);
    // Inserted out of order, two with the same timestamp.
    for (const n of [3, 1, 2, 2]) store.addAttempt(attempt(p.id, `js-values-${n}`, n, { gaveUp: n === 3 }));
    const list = store.listAttempts(p.id);
    expect(list.map((a) => a.answeredAt)).toEqual([iso(1000), iso(2000), iso(2000), iso(3000)]);
    expect(list[1].id).toBeLessThan(list[2].id);
    expect(Object.keys(list[0]).sort()).toEqual(
      ['answeredAt', 'correct', 'elapsedMs', 'gaveUp', 'id', 'moduleId', 'questionId', 'trackId'].sort(),
    );
    expect(list.at(-1)).toMatchObject({ gaveUp: true, correct: false, elapsedMs: 1003 });
    expect(store.listAttempts(p.id, iso(2500))).toHaveLength(1);
  });

  it('queryAttempts pages newest first by id, with correct/module/question filters', async () => {
    ctx = await make();
    const { store } = ctx;
    const p = store.createProfile('Ada', T0);
    for (let n = 0; n < 7; n++) {
      store.addAttempt(
        attempt(p.id, `js-values-${n % 3}`, n, n === 6 ? { moduleId: 'js-functions', trackId: 'js' } : {}),
      );
    }
    const page1 = store.queryAttempts(p.id, { limit: 3 });
    expect(page1.map((a) => a.answeredAt)).toEqual([iso(6000), iso(5000), iso(4000)]);
    const page2 = store.queryAttempts(p.id, { limit: 3, before: page1.at(-1).id });
    expect(page2.map((a) => a.answeredAt)).toEqual([iso(3000), iso(2000), iso(1000)]);
    expect(store.queryAttempts(p.id, { correct: false }).every((a) => !a.correct)).toBe(true);
    expect(store.queryAttempts(p.id, { moduleId: 'js-functions' })).toHaveLength(1);
    expect(store.queryAttempts(p.id, { questionId: 'js-values-0' })).toHaveLength(3);
  });

  it('flags: upsert keeps the original createdAt, list is newest first, delete reports whether it existed', async () => {
    ctx = await make();
    const { store } = ctx;
    const p = store.createProfile('Ada', T0);
    store.setFlag(p.id, 'js-values-1', 'first', T0);
    store.setFlag(p.id, 'js-values-2', '', new Date(T0.getTime() + 1000));
    const updated = store.setFlag(p.id, 'js-values-1', 'second', new Date(T0.getTime() + 5000));
    expect(updated).toEqual({ questionId: 'js-values-1', note: 'second', createdAt: T0.toISOString() });
    expect(store.listFlags(p.id).map((f) => f.questionId)).toEqual(['js-values-2', 'js-values-1']);
    expect(store.getFlag(p.id, 'js-values-3')).toBeNull();
    expect(store.deleteFlag(p.id, 'js-values-1')).toBe(true);
    expect(store.deleteFlag(p.id, 'js-values-1')).toBe(false);
  });

  it('settings round-trip; resetProgress keeps flags and settings but clears cards and attempts', async () => {
    ctx = await make();
    const { store } = ctx;
    const p = store.createProfile('Ada', T0);
    expect(store.getSettings(p.id)).toBeNull();
    store.saveSettings(p.id, { dailyGoal: 30, sessionSize: 20, newPerDay: 0 });
    expect(store.getSettings(p.id)).toEqual({ dailyGoal: 30, sessionSize: 20, newPerDay: 0 });
    store.recordAnswer(card(p.id, 'js-values-1'), attempt(p.id, 'js-values-1', 0));
    store.setFlag(p.id, 'js-values-1', '', T0);
    store.resetProgress(p.id);
    expect(store.listCardStates(p.id)).toEqual([]);
    expect(store.listAttempts(p.id)).toEqual([]);
    expect(store.listFlags(p.id)).toHaveLength(1);
    expect(store.getSettings(p.id)).not.toBeNull();
  });

  it('importProfile creates a new profile with all its rows in one go', async () => {
    ctx = await make();
    const { store } = ctx;
    const profile = store.importProfile(
      {
        name: 'Imported',
        settings: { dailyGoal: 9, sessionSize: 9, newPerDay: 9 },
        cardStates: [{ ...card('ignored', 'js-values-1') }],
        attempts: [attempt('ignored', 'js-values-1', 0), attempt('ignored', 'js-values-1', 1)],
        flags: [{ questionId: 'js-values-1', note: 'n', createdAt: T0.toISOString() }],
      },
      T0,
    );
    expect(store.getProfile(profile.id).name).toBe('Imported');
    expect(store.listCardStates(profile.id)).toHaveLength(1);
    expect(store.listCardStates(profile.id)[0].profileId).toBe(profile.id);
    expect(store.listAttempts(profile.id)).toHaveLength(2);
    expect(store.listFlags(profile.id)).toHaveLength(1);
    expect(store.getSettings(profile.id)).toEqual({ dailyGoal: 9, sessionSize: 9, newPerDay: 9 });
  });

  it('close() is idempotent, persists, and leaves no exit hook behind', async () => {
    // Counted before the store exists: the JSON backend registers its hook in
    // the constructor, so counting afterwards would make "<= hooks" hold even
    // if close() never removed it.
    const hooks = process.listenerCount('exit');
    ctx = await make();
    const { store, dir } = ctx;
    if (backend === 'json') expect(process.listenerCount('exit')).toBe(hooks + 1);
    const p = store.createProfile('Ada', T0);
    store.close();
    store.close();
    expect(process.listenerCount('exit')).toBe(hooks);
    expect(() => store.createProfile('late', T0)).toThrow();

    const again = await make(dir);
    expect(again.store.getProfile(p.id)?.name).toBe('Ada');
    expect(again.store.schemaVersion).toBe(SCHEMA_VERSION);
    ctx = again;
  });
});

describe('JSON store recovery and migration', () => {
  let dir;
  afterEach(() => dir && removeDir(dir));
  const [, makeJson] = backends.find(([name]) => name === 'json');

  it('a torn/corrupt file falls back to .bak and the corrupt copy is kept', async () => {
    dir = tempDir();
    const first = await makeJson(dir);
    first.store.createProfile('Ada', T0);
    first.store.close();
    const second = await makeJson(dir);
    second.store.createProfile('Bob', T0);
    second.store.close(); // progress.json has Ada+Bob, progress.json.bak has Ada

    fs.writeFileSync(second.file, '{"profiles": [ {"id": "trunc');
    const third = await makeJson(dir);
    expect(third.store.listProfiles().map((p) => p.name)).toEqual(['Ada']);
    expect(fs.readdirSync(dir).some((f) => f.startsWith('progress.json.corrupt-'))).toBe(true);
    third.store.close();
  });

  it('a valid JSON file with the wrong shape is treated as corrupt, not trusted', async () => {
    dir = tempDir();
    fs.writeFileSync(path.join(dir, 'progress.json'), JSON.stringify({ profiles: null }));
    const { store } = await makeJson(dir);
    expect(store.listProfiles()).toEqual([]);
    store.close();
  });

  it('a v1 file (no schemaVersion, attempts without ids) upgrades with ids 1..n', async () => {
    dir = tempDir();
    fs.writeFileSync(
      path.join(dir, 'progress.json'),
      JSON.stringify({
        profiles: [{ id: 'p1', name: 'Old', createdAt: T0.toISOString() }],
        cards: {},
        attempts: [attempt('p1', 'js-values-1', 0), attempt('p1', 'js-values-2', 1)],
      }),
    );
    const { store } = await makeJson(dir);
    expect(store.listAttempts('p1').map((a) => a.id)).toEqual([1, 2]);
    expect(store.addAttempt(attempt('p1', 'js-values-3', 2))).toBe(3);
    store.close();
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'progress.json'), 'utf8')).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('a file from a newer build is refused', async () => {
    dir = tempDir();
    fs.writeFileSync(
      path.join(dir, 'progress.json'),
      JSON.stringify({ schemaVersion: 99, profiles: [], cards: {}, attempts: [] }),
    );
    await expect(makeJson(dir)).rejects.toThrow(/newer version/);
  });
});

describe('SQLite open, fallback and migration', () => {
  let dir;
  afterEach(() => dir && removeDir(dir));

  it('a corrupt progress.db makes createStore throw naming the file; it does not silently fall back', async () => {
    dir = tempDir();
    const file = path.join(dir, 'progress.db');
    fs.writeFileSync(file, 'this is not a database, just some text that is long enough '.repeat(100));
    await expect(createStore({ dataDir: dir })).rejects.toThrow(/progress\.db/);
    // The failed handle was closed, so Windows lets us remove the file.
    expect(() => fs.rmSync(file)).not.toThrow();
  });

  it('falls back to JSON only when better-sqlite3 cannot be loaded, and says why', async () => {
    dir = tempDir();
    const store = await createStore({
      dataDir: dir,
      loadSqlite: () => Promise.reject(new Error('Module did not self-register')),
    });
    expect(store.backend).toBe('json');
    expect(store.fallbackReason).toMatch(/Module did not self-register/);
    store.close();

    const real = await createStore({ dataDir: dir });
    expect(real.backend).toBe('sqlite');
    expect(real.fallbackReason).toBeNull();
    real.close();
  });

  it('upgrades a pre-versioning (v1) file to v2 in place, after a backup, keeping the data', async () => {
    dir = tempDir();
    const file = path.join(dir, 'progress.db');
    const { default: Database } = await import('better-sqlite3');
    const old = new Database(file);
    old.exec(`
      CREATE TABLE profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE card_states (profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, question_id TEXT NOT NULL,
        reps INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0, ease REAL NOT NULL DEFAULT 2.5,
        interval_days REAL NOT NULL DEFAULT 0, due_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
        correct INTEGER NOT NULL DEFAULT 0, last_answered_at TEXT, PRIMARY KEY (profile_id, question_id));
      CREATE TABLE attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL, module_id TEXT NOT NULL, track_id TEXT NOT NULL, correct INTEGER NOT NULL,
        elapsed_ms INTEGER, answered_at TEXT NOT NULL);
      CREATE INDEX idx_attempts_profile_date ON attempts (profile_id, answered_at);
      CREATE INDEX idx_card_states_due ON card_states (profile_id, due_at);
      INSERT INTO profiles VALUES ('p1', 'Old', '${T0.toISOString()}');
      INSERT INTO attempts (profile_id, question_id, module_id, track_id, correct, elapsed_ms, answered_at)
        VALUES ('p1', 'js-values-1', 'js-values', 'js', 1, 900, '${T0.toISOString()}');
    `);
    expect(old.pragma('user_version', { simple: true })).toBe(0);
    old.close();

    const { createSqliteStore } = await import('../src/store.js');
    const store = await createSqliteStore(Database, file);
    expect(store.getProfile('p1').name).toBe('Old');
    expect(store.listAttempts('p1')).toEqual([
      expect.objectContaining({ questionId: 'js-values-1', correct: true, gaveUp: false, elapsedMs: 900 }),
    ]);
    store.setFlag('p1', 'js-values-1', 'works', T0);
    store.close();

    expect(fs.existsSync(`${file}.bak-v1`)).toBe(true);
    const check = new Database(file, { readonly: true });
    const backup = new Database(`${file}.bak-v1`, { readonly: true });
    try {
      expect(check.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
      // v2 adds the per-question index and drops the unused idx_card_states_due.
      const indexes = check
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'")
        .pluck()
        .all();
      expect(indexes.sort()).toEqual(['idx_attempts_profile_date', 'idx_attempts_profile_question']);
      expect(backup.prepare('SELECT COUNT(*) AS n FROM attempts').get().n).toBe(1);
    } finally {
      check.close();
      backup.close();
    }
  });

  it('close() checkpoints the WAL, so no -wal/-shm files are left behind', async () => {
    dir = tempDir();
    const store = await createStore({ dataDir: dir });
    store.createProfile('Ada', T0);
    expect(fs.existsSync(path.join(dir, 'progress.db-wal'))).toBe(true);
    store.close();
    expect(fs.readdirSync(dir)).toEqual(['progress.db']);
  });

  it('refuses a file written by a newer schema version', async () => {
    dir = tempDir();
    const file = path.join(dir, 'progress.db');
    const { default: Database } = await import('better-sqlite3');
    const future = new Database(file);
    future.pragma('user_version = 99');
    future.close();
    const { createSqliteStore } = await import('../src/store.js');
    await expect(createSqliteStore(Database, file)).rejects.toThrow(/newer version/);
  });
});
