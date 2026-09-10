/**
 * Persistence.
 *
 * SQLite via better-sqlite3 is the real store. It is a native module, so if the
 * prebuilt binary is unavailable on this machine we fall back to a JSON file
 * with the same interface — the app still runs, which matters a lot more here
 * than the last few percent of durability. The active backend is reported at
 * start-up and exposed on `/api/health`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DEFAULT_EASE = 2.5;

/**
 * @typedef {Object} CardState
 * @property {string} profileId
 * @property {string} questionId
 * @property {number} reps          consecutive correct answers
 * @property {number} lapses        times forgotten after being learned
 * @property {number} ease          SM-2 ease factor
 * @property {number} intervalDays
 * @property {string} dueAt         ISO
 * @property {number} attempts
 * @property {number} correct
 * @property {string|null} lastAnsweredAt
 */

export function emptyCardState(profileId, questionId) {
  return {
    profileId,
    questionId,
    reps: 0,
    lapses: 0,
    ease: DEFAULT_EASE,
    intervalDays: 0,
    dueAt: new Date(0).toISOString(),
    attempts: 0,
    correct: 0,
    lastAnsweredAt: null,
  };
}

/* ------------------------------------------------------------------ SQLite */

function createSqliteStore(Database, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_states (
      profile_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      question_id      TEXT NOT NULL,
      reps             INTEGER NOT NULL DEFAULT 0,
      lapses           INTEGER NOT NULL DEFAULT 0,
      ease             REAL    NOT NULL DEFAULT ${DEFAULT_EASE},
      interval_days    REAL    NOT NULL DEFAULT 0,
      due_at           TEXT    NOT NULL,
      attempts         INTEGER NOT NULL DEFAULT 0,
      correct          INTEGER NOT NULL DEFAULT 0,
      last_answered_at TEXT,
      PRIMARY KEY (profile_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      question_id  TEXT NOT NULL,
      module_id    TEXT NOT NULL,
      track_id     TEXT NOT NULL,
      correct      INTEGER NOT NULL,
      elapsed_ms   INTEGER,
      answered_at  TEXT NOT NULL
    );

    -- Progress reads are always scoped by profile, and the history/heatmap
    -- queries additionally sort by date, so this composite covers both.
    CREATE INDEX IF NOT EXISTS idx_attempts_profile_date
      ON attempts (profile_id, answered_at);
    CREATE INDEX IF NOT EXISTS idx_card_states_due
      ON card_states (profile_id, due_at);
  `);

  const rowToState = (r) =>
    r && {
      profileId: r.profile_id,
      questionId: r.question_id,
      reps: r.reps,
      lapses: r.lapses,
      ease: r.ease,
      intervalDays: r.interval_days,
      dueAt: r.due_at,
      attempts: r.attempts,
      correct: r.correct,
      lastAnsweredAt: r.last_answered_at,
    };

  const stmt = {
    listProfiles: db.prepare('SELECT * FROM profiles ORDER BY created_at'),
    getProfile: db.prepare('SELECT * FROM profiles WHERE id = ?'),
    insertProfile: db.prepare('INSERT INTO profiles (id, name, created_at) VALUES (?, ?, ?)'),
    deleteProfile: db.prepare('DELETE FROM profiles WHERE id = ?'),
    getCard: db.prepare('SELECT * FROM card_states WHERE profile_id = ? AND question_id = ?'),
    listCards: db.prepare('SELECT * FROM card_states WHERE profile_id = ?'),
    upsertCard: db.prepare(`
      INSERT INTO card_states
        (profile_id, question_id, reps, lapses, ease, interval_days, due_at, attempts, correct, last_answered_at)
      VALUES
        (@profileId, @questionId, @reps, @lapses, @ease, @intervalDays, @dueAt, @attempts, @correct, @lastAnsweredAt)
      ON CONFLICT (profile_id, question_id) DO UPDATE SET
        reps = @reps, lapses = @lapses, ease = @ease, interval_days = @intervalDays,
        due_at = @dueAt, attempts = @attempts, correct = @correct, last_answered_at = @lastAnsweredAt
    `),
    insertAttempt: db.prepare(`
      INSERT INTO attempts (profile_id, question_id, module_id, track_id, correct, elapsed_ms, answered_at)
      VALUES (@profileId, @questionId, @moduleId, @trackId, @correct, @elapsedMs, @answeredAt)
    `),
    listAttempts: db.prepare(
      'SELECT * FROM attempts WHERE profile_id = ? AND answered_at >= ? ORDER BY answered_at',
    ),
    resetCards: db.prepare('DELETE FROM card_states WHERE profile_id = ?'),
    resetAttempts: db.prepare('DELETE FROM attempts WHERE profile_id = ?'),
  };

  return {
    backend: 'sqlite',
    listProfiles: () =>
      stmt.listProfiles.all().map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at })),
    getProfile: (id) => {
      const r = stmt.getProfile.get(id);
      return r ? { id: r.id, name: r.name, createdAt: r.created_at } : undefined;
    },
    createProfile: (name) => {
      const profile = { id: randomUUID(), name, createdAt: new Date().toISOString() };
      stmt.insertProfile.run(profile.id, profile.name, profile.createdAt);
      return profile;
    },
    deleteProfile: (id) => stmt.deleteProfile.run(id).changes > 0,
    getCardState: (profileId, questionId) =>
      rowToState(stmt.getCard.get(profileId, questionId)) ?? emptyCardState(profileId, questionId),
    listCardStates: (profileId) => stmt.listCards.all(profileId).map(rowToState),
    saveCardState: (state) => stmt.upsertCard.run(state),
    addAttempt: (attempt) => stmt.insertAttempt.run(attempt),
    listAttempts: (profileId, sinceIso) =>
      stmt.listAttempts.all(profileId, sinceIso).map((r) => ({
        questionId: r.question_id,
        moduleId: r.module_id,
        trackId: r.track_id,
        correct: !!r.correct,
        elapsedMs: r.elapsed_ms,
        answeredAt: r.answered_at,
      })),
    resetProgress: (profileId) => {
      stmt.resetCards.run(profileId);
      stmt.resetAttempts.run(profileId);
    },
    close: () => db.close(),
  };
}

/* -------------------------------------------------------------- JSON store */

function createJsonStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  /** @type {{profiles: any[], cards: Record<string, any>, attempts: any[]}} */
  let data = { profiles: [], cards: {}, attempts: [] };
  if (fs.existsSync(file)) {
    try {
      data = { ...data, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch {
      // A corrupt file should not stop the app booting; start fresh and keep
      // the old one alongside so nothing is silently destroyed.
      fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
    }
  }

  let writeTimer = null;
  const flush = () => fs.writeFileSync(file, JSON.stringify(data, null, 2));
  const scheduleFlush = () => {
    if (writeTimer) return;
    // Debounced so a burst of answers is one write; unref'd so it never keeps
    // the process alive on shutdown.
    writeTimer = setTimeout(() => {
      writeTimer = null;
      flush();
    }, 250);
    writeTimer.unref?.();
  };
  process.on('exit', () => {
    if (writeTimer) clearTimeout(writeTimer);
    flush();
  });

  const key = (profileId, questionId) => `${profileId}:${questionId}`;

  return {
    backend: 'json',
    listProfiles: () => data.profiles.map((p) => ({ ...p })),
    getProfile: (id) => data.profiles.find((p) => p.id === id),
    createProfile: (name) => {
      const profile = { id: randomUUID(), name, createdAt: new Date().toISOString() };
      data.profiles.push(profile);
      scheduleFlush();
      return profile;
    },
    deleteProfile: (id) => {
      const before = data.profiles.length;
      data.profiles = data.profiles.filter((p) => p.id !== id);
      for (const k of Object.keys(data.cards)) if (k.startsWith(`${id}:`)) delete data.cards[k];
      data.attempts = data.attempts.filter((a) => a.profileId !== id);
      scheduleFlush();
      return data.profiles.length < before;
    },
    getCardState: (profileId, questionId) =>
      data.cards[key(profileId, questionId)]
        ? { ...data.cards[key(profileId, questionId)] }
        : emptyCardState(profileId, questionId),
    listCardStates: (profileId) =>
      Object.values(data.cards).filter((c) => c.profileId === profileId).map((c) => ({ ...c })),
    saveCardState: (state) => {
      data.cards[key(state.profileId, state.questionId)] = { ...state };
      scheduleFlush();
    },
    addAttempt: (attempt) => {
      data.attempts.push({ ...attempt, correct: !!attempt.correct });
      scheduleFlush();
    },
    listAttempts: (profileId, sinceIso) =>
      data.attempts
        .filter((a) => a.profileId === profileId && a.answeredAt >= sinceIso)
        .map((a) => ({ ...a, correct: !!a.correct }))
        .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt)),
    resetProgress: (profileId) => {
      for (const k of Object.keys(data.cards)) if (k.startsWith(`${profileId}:`)) delete data.cards[k];
      data.attempts = data.attempts.filter((a) => a.profileId !== profileId);
      scheduleFlush();
    },
    close: () => {
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = null;
      flush();
    },
  };
}

/* ----------------------------------------------------------------- factory */

export async function createStore({ dataDir }) {
  try {
    const { default: Database } = await import('better-sqlite3');
    return createSqliteStore(Database, path.join(dataDir, 'progress.db'));
  } catch (err) {
    console.warn(
      `[store] better-sqlite3 unavailable (${err.message.split('\n')[0]}); using the JSON file store instead.`,
    );
    return createJsonStore(path.join(dataDir, 'progress.json'));
  }
}
