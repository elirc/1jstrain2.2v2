/**
 * Persistence.
 *
 * SQLite via better-sqlite3 is the real store. It is a native module, so if the
 * prebuilt binary cannot be *loaded* on this machine we fall back to a JSON file
 * with the same interface — the app still runs, which matters a lot more here
 * than the last few percent of durability. Any other failure (a corrupt or
 * locked `progress.db`, a newer schema) is an error that names the file: quietly
 * switching to an empty store would look exactly like losing every answer.
 *
 * Both backends implement one contract, and `test/store.test.js` runs the same
 * suite against each so the fallback cannot rot unnoticed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DEFAULT_EASE = 2.5;

/** The schema version this build writes. Both backends share the number. */
export const SCHEMA_VERSION = 2;

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

/**
 * @typedef {Object} Attempt
 * @property {number} id            stable, increasing; the cursor for /api/attempts
 * @property {string} questionId
 * @property {string} moduleId
 * @property {string} trackId
 * @property {boolean} correct
 * @property {boolean} gaveUp
 * @property {number|null} elapsedMs
 * @property {string} answeredAt    ISO
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

/** Only the persisted fields: `schedule()` adds `outcome`, which is not stored. */
function cardFields(s) {
  return {
    profileId: s.profileId,
    questionId: s.questionId,
    reps: s.reps,
    lapses: s.lapses,
    ease: s.ease,
    intervalDays: s.intervalDays,
    dueAt: s.dueAt,
    attempts: s.attempts,
    correct: s.correct,
    lastAnsweredAt: s.lastAnsweredAt ?? null,
  };
}

/** Normalise an attempt to insert, failing before anything is written. */
function attemptFields(a) {
  for (const key of ['profileId', 'questionId', 'moduleId', 'trackId', 'answeredAt']) {
    if (typeof a[key] !== 'string' || !a[key]) throw new Error(`[store] attempt.${key} is required`);
  }
  return {
    profileId: a.profileId,
    questionId: a.questionId,
    moduleId: a.moduleId,
    trackId: a.trackId,
    correct: a.correct ? 1 : 0,
    gaveUp: a.gaveUp ? 1 : 0,
    elapsedMs: Number.isInteger(a.elapsedMs) ? a.elapsedMs : null,
    answeredAt: a.answeredAt,
  };
}

/* ------------------------------------------------------------------ SQLite */

// Version 1 is the schema 1.0 shipped with, before versioning existed. It stays
// `IF NOT EXISTS` so that running it against a pre-versioning file is harmless.
const V1_SQL = `
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
`;

// Version 2: flags, settings, give-up, an index for per-question history, and
// one index removed.
// Not idempotent (ALTER TABLE), which is fine: user_version guarantees it runs once.
const V2_SQL = `
  CREATE TABLE question_flags (
    profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    note        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    PRIMARY KEY (profile_id, question_id)
  );

  CREATE TABLE profile_settings (
    profile_id   TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    daily_goal   INTEGER,
    session_size INTEGER,
    new_per_day  INTEGER
  );

  ALTER TABLE attempts ADD COLUMN gave_up INTEGER NOT NULL DEFAULT 0;

  CREATE INDEX idx_attempts_profile_question
    ON attempts (profile_id, question_id, answered_at);

  -- Served no query (card reads are by profile, which the primary key already
  -- covers) and cost every card write.
  DROP INDEX IF EXISTS idx_card_states_due;
`;

/** MIGRATIONS[n - 1] takes the file from version n - 1 to version n. */
const MIGRATIONS = [V1_SQL, V2_SQL];

/**
 * Bring the file up to SCHEMA_VERSION with `PRAGMA user_version` (one integer
 * in the file header, no bookkeeping table). A file from a newer build is
 * refused rather than written into, and an existing file is copied with
 * `db.backup()` (WAL-safe) before its first migration.
 */
async function migrate(db, file) {
  let version = db.pragma('user_version', { simple: true });
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `it was written by a newer version of the app (schema v${version}; this build understands up to v${SCHEMA_VERSION}). ` +
        'Update the app rather than downgrading the data.',
    );
  }
  if (version === SCHEMA_VERSION) return { from: version, backup: null };

  // A 1.0 file predates versioning: user_version 0 but the tables exist.
  const hasTables = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'profiles'").get();
  if (version === 0 && hasTables) version = 1;
  const from = version;

  let backup = null;
  if (hasTables) {
    backup = `${file}.bak-v${from}`;
    await db.backup(backup);
  }

  for (let v = version; v < SCHEMA_VERSION; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
  return { from, backup };
}

/**
 * Open (creating or upgrading) the SQLite store. On any failure the handle is
 * closed — an open handle keeps the file locked on Windows — and the error names
 * the file and what to do about it.
 *
 * @param {typeof import('better-sqlite3')} Database
 * @param {string} file
 */
export async function createSqliteStore(Database, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let db;
  let migration;
  try {
    db = new Database(file);
    // WAL cannot be switched inside a transaction, so pragmas run before migrating.
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 3000');
    db.pragma('synchronous = NORMAL');
    migration = await migrate(db, file);
  } catch (err) {
    try {
      db?.close();
    } catch {
      /* already failed; the original error is the useful one */
    }
    throw new Error(
      `[store] could not open ${file}: ${err.message}\n` +
        '  Move that file aside (or restore a backup such as progress.db.bak-v1 next to it) and start again.',
      { cause: err },
    );
  }
  if (migration.backup) {
    console.log(
      `[store] upgraded ${path.basename(file)} from schema v${migration.from} to v${SCHEMA_VERSION} (backup: ${migration.backup})`,
    );
  }

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
  const rowToProfile = (r) => r && { id: r.id, name: r.name, createdAt: r.created_at };
  const rowToAttempt = (r) => ({
    id: r.id,
    questionId: r.question_id,
    moduleId: r.module_id,
    trackId: r.track_id,
    correct: !!r.correct,
    gaveUp: !!r.gave_up,
    elapsedMs: r.elapsed_ms,
    answeredAt: r.answered_at,
  });
  const rowToFlag = (r) => r && { questionId: r.question_id, note: r.note, createdAt: r.created_at };

  const stmt = {
    listProfiles: db.prepare('SELECT * FROM profiles ORDER BY created_at, id'),
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
      INSERT INTO attempts (profile_id, question_id, module_id, track_id, correct, gave_up, elapsed_ms, answered_at)
      VALUES (@profileId, @questionId, @moduleId, @trackId, @correct, @gaveUp, @elapsedMs, @answeredAt)
    `),
    listAttempts: db.prepare(
      'SELECT * FROM attempts WHERE profile_id = ? AND answered_at >= ? ORDER BY answered_at, id',
    ),
    resetCards: db.prepare('DELETE FROM card_states WHERE profile_id = ?'),
    resetAttempts: db.prepare('DELETE FROM attempts WHERE profile_id = ?'),
    getFlag: db.prepare('SELECT * FROM question_flags WHERE profile_id = ? AND question_id = ?'),
    listFlags: db.prepare('SELECT * FROM question_flags WHERE profile_id = ? ORDER BY created_at DESC, question_id'),
    upsertFlag: db.prepare(`
      INSERT INTO question_flags (profile_id, question_id, note, created_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (profile_id, question_id) DO UPDATE SET note = excluded.note
    `),
    deleteFlag: db.prepare('DELETE FROM question_flags WHERE profile_id = ? AND question_id = ?'),
    getSettings: db.prepare('SELECT * FROM profile_settings WHERE profile_id = ?'),
    upsertSettings: db.prepare(`
      INSERT INTO profile_settings (profile_id, daily_goal, session_size, new_per_day)
      VALUES (@profileId, @dailyGoal, @sessionSize, @newPerDay)
      ON CONFLICT (profile_id) DO UPDATE SET
        daily_goal = @dailyGoal, session_size = @sessionSize, new_per_day = @newPerDay
    `),
  };

  // /api/attempts filters are optional, so the WHERE clause varies; there are
  // only 16 combinations, so cache each prepared statement.
  const queryCache = new Map();
  function attemptQuery({ before, correct, moduleId, questionId }) {
    const parts = ['profile_id = @profileId'];
    if (before !== undefined) parts.push('id < @before');
    if (correct !== undefined) parts.push('correct = @correct');
    if (moduleId !== undefined) parts.push('module_id = @moduleId');
    if (questionId !== undefined) parts.push('question_id = @questionId');
    const sql = `SELECT * FROM attempts WHERE ${parts.join(' AND ')} ORDER BY id DESC LIMIT @limit`;
    if (!queryCache.has(sql)) queryCache.set(sql, db.prepare(sql));
    return queryCache.get(sql);
  }

  const recordAnswer = db.transaction((state, attempt) => {
    stmt.upsertCard.run(cardFields(state));
    return { attemptId: Number(stmt.insertAttempt.run(attempt).lastInsertRowid) };
  });

  const resetProgress = db.transaction((profileId) => {
    stmt.resetCards.run(profileId);
    stmt.resetAttempts.run(profileId);
  });

  const importProfile = db.transaction((snapshot, now) => {
    const profile = { id: randomUUID(), name: snapshot.name, createdAt: now.toISOString() };
    stmt.insertProfile.run(profile.id, profile.name, profile.createdAt);
    if (snapshot.settings) stmt.upsertSettings.run({ profileId: profile.id, ...snapshot.settings });
    for (const c of snapshot.cardStates) stmt.upsertCard.run(cardFields({ ...c, profileId: profile.id }));
    for (const a of snapshot.attempts) stmt.insertAttempt.run(attemptFields({ ...a, profileId: profile.id }));
    for (const f of snapshot.flags) stmt.upsertFlag.run(profile.id, f.questionId, f.note, f.createdAt);
    return profile;
  });

  let closed = false;

  return {
    backend: 'sqlite',
    schemaVersion: SCHEMA_VERSION,
    file,

    listProfiles: () => stmt.listProfiles.all().map(rowToProfile),
    getProfile: (id) => rowToProfile(stmt.getProfile.get(id)),
    createProfile: (name, now = new Date()) => {
      const profile = { id: randomUUID(), name, createdAt: now.toISOString() };
      stmt.insertProfile.run(profile.id, profile.name, profile.createdAt);
      return profile;
    },
    deleteProfile: (id) => stmt.deleteProfile.run(id).changes > 0,

    getCardState: (profileId, questionId) =>
      rowToState(stmt.getCard.get(profileId, questionId)) ?? emptyCardState(profileId, questionId),
    listCardStates: (profileId) => stmt.listCards.all(profileId).map(rowToState),
    saveCardState: (state) => {
      stmt.upsertCard.run(cardFields(state));
    },

    addAttempt: (attempt) => Number(stmt.insertAttempt.run(attemptFields(attempt)).lastInsertRowid),
    /** The card and its attempt row are written together or not at all. */
    recordAnswer: (state, attempt) => recordAnswer(state, attemptFields(attempt)),
    listAttempts: (profileId, sinceIso = '') => stmt.listAttempts.all(profileId, sinceIso).map(rowToAttempt),
    queryAttempts: (profileId, { limit = 50, before, correct, moduleId, questionId } = {}) =>
      attemptQuery({ before, correct, moduleId, questionId })
        .all({
          profileId,
          limit,
          ...(before !== undefined ? { before } : {}),
          ...(correct !== undefined ? { correct: correct ? 1 : 0 } : {}),
          ...(moduleId !== undefined ? { moduleId } : {}),
          ...(questionId !== undefined ? { questionId } : {}),
        })
        .map(rowToAttempt),
    resetProgress: (profileId) => resetProgress(profileId),

    getFlag: (profileId, questionId) => rowToFlag(stmt.getFlag.get(profileId, questionId)) ?? null,
    listFlags: (profileId) => stmt.listFlags.all(profileId).map(rowToFlag),
    setFlag: (profileId, questionId, note, now = new Date()) => {
      stmt.upsertFlag.run(profileId, questionId, note, now.toISOString());
      return rowToFlag(stmt.getFlag.get(profileId, questionId));
    },
    deleteFlag: (profileId, questionId) => stmt.deleteFlag.run(profileId, questionId).changes > 0,

    getSettings: (profileId) => {
      const r = stmt.getSettings.get(profileId);
      return r ? { dailyGoal: r.daily_goal, sessionSize: r.session_size, newPerDay: r.new_per_day } : null;
    },
    saveSettings: (profileId, settings) => {
      stmt.upsertSettings.run({ profileId, ...settings });
    },

    importProfile: (snapshot, now = new Date()) => importProfile(snapshot, now),

    /** Idempotent. Checkpoints the WAL so no -wal/-shm files are left behind. */
    close: () => {
      if (closed) return;
      closed = true;
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
      } finally {
        db.close();
      }
    },
  };
}

/* -------------------------------------------------------------- JSON store */

const emptyData = () => ({
  schemaVersion: SCHEMA_VERSION,
  profiles: [],
  cards: {},
  attempts: [],
  flags: {},
  settings: {},
  nextAttemptId: 1,
});

function isValidShape(d) {
  const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  return (
    isMap(d) &&
    Array.isArray(d.profiles) &&
    Array.isArray(d.attempts) &&
    isMap(d.cards) &&
    (d.flags === undefined || isMap(d.flags)) &&
    (d.settings === undefined || isMap(d.settings))
  );
}

/** Parse and upgrade a JSON store file; throws on anything unusable. */
function readJsonFile(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!isValidShape(parsed)) throw new Error('unexpected shape');
  const version = parsed.schemaVersion ?? 1;
  if (version > SCHEMA_VERSION) {
    const err = new Error(
      `[store] ${file} was written by a newer version of the app (schema v${version}; this build understands up to v${SCHEMA_VERSION}).`,
    );
    err.newer = true;
    throw err;
  }
  const data = { ...emptyData(), ...parsed, schemaVersion: SCHEMA_VERSION };
  // v1 -> v2: attempts gain a stable id (their position, once) and gaveUp.
  // Ids cannot stay derived from the position: deleting a profile filters the array.
  let maxId = 0;
  data.attempts = data.attempts.map((a, i) => {
    const id = Number.isInteger(a.id) ? a.id : i + 1;
    maxId = Math.max(maxId, id);
    return { ...a, id, correct: !!a.correct, gaveUp: !!a.gaveUp };
  });
  data.nextAttemptId = Math.max(Number.isInteger(parsed.nextAttemptId) ? parsed.nextAttemptId : 1, maxId + 1);
  return data;
}

/**
 * The fallback store: one JSON file, written atomically (temp file, fsync,
 * rename) with the previous version kept as `.bak`. A file that cannot be read
 * is kept aside as `.corrupt-<ts>` and the `.bak` is tried before starting
 * empty, loudly.
 *
 * @param {string} file
 */
export function createJsonStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const bak = `${file}.bak`;

  let data = emptyData();
  let loaded = false;
  const candidates = [file, bak].filter((f) => fs.existsSync(f));
  for (const candidate of candidates) {
    try {
      data = readJsonFile(candidate);
      loaded = true;
      if (candidate === bak) console.warn(`[store] ${file} was unreadable; recovered from ${bak}.`);
      break;
    } catch (err) {
      if (err.newer) throw err;
      if (candidate === file) {
        const aside = `${file}.corrupt-${Date.now()}`;
        try {
          fs.copyFileSync(file, aside);
          console.warn(`[store] ${file} could not be read (${err.message}); kept a copy at ${aside}.`);
        } catch {
          console.warn(`[store] ${file} could not be read (${err.message}).`);
        }
      }
    }
  }
  if (candidates.length && !loaded) {
    console.warn(`[store] no readable data in ${file}; starting with an empty store.`);
  }

  let closed = false;
  let writeTimer = null;

  const flush = () => {
    const tmp = `${file}.tmp`;
    const fd = fs.openSync(tmp, 'w');
    try {
      fs.writeSync(fd, JSON.stringify(data, null, 2));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    if (fs.existsSync(file)) fs.copyFileSync(file, bak);
    // rename over the target is atomic on one volume (MoveFileEx on Windows).
    fs.renameSync(tmp, file);
  };
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
  const onExit = () => {
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = null;
    flush();
  };
  process.on('exit', onExit);

  /** Every mutation goes through here: refuse after close, then write later. */
  const mutate = (fn) => {
    if (closed) throw new Error('[store] the store is closed');
    const result = fn();
    scheduleFlush();
    return result;
  };

  const key = (profileId, questionId) => `${profileId}:${questionId}`;
  const byPrefix = (map, profileId) => Object.keys(map).filter((k) => k.startsWith(`${profileId}:`));
  /** What the SQLite foreign key does: no card or attempt for a profile that does not exist. */
  const requireProfile = (profileId) => {
    if (!data.profiles.some((p) => p.id === profileId)) throw new Error(`[store] no such profile: ${profileId}`);
  };
  const toAttempt = (a) => ({
    id: a.id,
    questionId: a.questionId,
    moduleId: a.moduleId,
    trackId: a.trackId,
    correct: !!a.correct,
    gaveUp: !!a.gaveUp,
    elapsedMs: a.elapsedMs ?? null,
    answeredAt: a.answeredAt,
  });
  const pushAttempt = (fields) => {
    const id = data.nextAttemptId++;
    data.attempts.push({ id, ...fields, correct: !!fields.correct, gaveUp: !!fields.gaveUp });
    return id;
  };
  const clearProgress = (profileId) => {
    for (const k of byPrefix(data.cards, profileId)) delete data.cards[k];
    data.attempts = data.attempts.filter((a) => a.profileId !== profileId);
  };
  const flagOf = (profileId, questionId) => {
    const f = data.flags[key(profileId, questionId)];
    return f ? { questionId, note: f.note, createdAt: f.createdAt } : null;
  };

  return {
    backend: 'json',
    schemaVersion: SCHEMA_VERSION,
    file,

    listProfiles: () =>
      data.profiles
        .map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
    getProfile: (id) => {
      const p = data.profiles.find((x) => x.id === id);
      return p ? { id: p.id, name: p.name, createdAt: p.createdAt } : undefined;
    },
    createProfile: (name, now = new Date()) =>
      mutate(() => {
        const profile = { id: randomUUID(), name, createdAt: now.toISOString() };
        data.profiles.push(profile);
        return { ...profile };
      }),
    deleteProfile: (id) =>
      mutate(() => {
        const before = data.profiles.length;
        data.profiles = data.profiles.filter((p) => p.id !== id);
        clearProgress(id);
        for (const k of byPrefix(data.flags, id)) delete data.flags[k];
        delete data.settings[id];
        return data.profiles.length < before;
      }),

    getCardState: (profileId, questionId) =>
      data.cards[key(profileId, questionId)]
        ? cardFields(data.cards[key(profileId, questionId)])
        : emptyCardState(profileId, questionId),
    listCardStates: (profileId) =>
      Object.values(data.cards)
        .filter((c) => c.profileId === profileId)
        .map(cardFields),
    saveCardState: (state) => {
      requireProfile(state.profileId);
      return mutate(() => {
        data.cards[key(state.profileId, state.questionId)] = cardFields(state);
      });
    },

    addAttempt: (attempt) => {
      const fields = attemptFields(attempt);
      requireProfile(fields.profileId);
      return mutate(() => pushAttempt(fields));
    },
    /** Validated before either write, so a bad attempt leaves the card untouched. */
    recordAnswer: (state, attempt) => {
      const fields = attemptFields(attempt);
      const card = cardFields(state);
      requireProfile(card.profileId);
      requireProfile(fields.profileId);
      return mutate(() => {
        data.cards[key(card.profileId, card.questionId)] = card;
        return { attemptId: pushAttempt(fields) };
      });
    },
    listAttempts: (profileId, sinceIso = '') =>
      data.attempts
        .filter((a) => a.profileId === profileId && a.answeredAt >= sinceIso)
        .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt) || a.id - b.id)
        .map(toAttempt),
    queryAttempts: (profileId, { limit = 50, before, correct, moduleId, questionId } = {}) => {
      const out = [];
      for (let i = data.attempts.length - 1; i >= 0 && out.length < limit; i--) {
        const a = data.attempts[i];
        if (a.profileId !== profileId) continue;
        if (before !== undefined && a.id >= before) continue;
        if (correct !== undefined && !!a.correct !== correct) continue;
        if (moduleId !== undefined && a.moduleId !== moduleId) continue;
        if (questionId !== undefined && a.questionId !== questionId) continue;
        out.push(toAttempt(a));
      }
      return out;
    },
    resetProgress: (profileId) => mutate(() => clearProgress(profileId)),

    getFlag: flagOf,
    listFlags: (profileId) =>
      byPrefix(data.flags, profileId)
        .map((k) => flagOf(profileId, k.slice(profileId.length + 1)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.questionId.localeCompare(b.questionId)),
    setFlag: (profileId, questionId, note, now = new Date()) =>
      mutate(() => {
        const existing = data.flags[key(profileId, questionId)];
        data.flags[key(profileId, questionId)] = { note, createdAt: existing?.createdAt ?? now.toISOString() };
        return flagOf(profileId, questionId);
      }),
    deleteFlag: (profileId, questionId) =>
      mutate(() => {
        const had = key(profileId, questionId) in data.flags;
        delete data.flags[key(profileId, questionId)];
        return had;
      }),

    getSettings: (profileId) => (data.settings[profileId] ? { ...data.settings[profileId] } : null),
    saveSettings: (profileId, settings) =>
      mutate(() => {
        data.settings[profileId] = {
          dailyGoal: settings.dailyGoal,
          sessionSize: settings.sessionSize,
          newPerDay: settings.newPerDay,
        };
      }),

    importProfile: (snapshot, now = new Date()) => {
      // Build everything first so a bad row fails before anything is visible.
      const profile = { id: randomUUID(), name: snapshot.name, createdAt: now.toISOString() };
      const cards = snapshot.cardStates.map((c) => cardFields({ ...c, profileId: profile.id }));
      const attempts = snapshot.attempts.map((a) => attemptFields({ ...a, profileId: profile.id }));
      return mutate(() => {
        data.profiles.push(profile);
        if (snapshot.settings) data.settings[profile.id] = { ...snapshot.settings };
        for (const c of cards) data.cards[key(profile.id, c.questionId)] = c;
        for (const a of attempts) pushAttempt(a);
        for (const f of snapshot.flags)
          data.flags[key(profile.id, f.questionId)] = { note: f.note, createdAt: f.createdAt };
        return { ...profile };
      });
    },

    /** Idempotent: writes once, removes the exit hook, refuses later writes. */
    close: () => {
      if (closed) return;
      closed = true;
      process.off('exit', onExit);
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = null;
      flush();
    },
  };
}

/* ----------------------------------------------------------------- factory */

/**
 * @param {object} options
 * @param {string} options.dataDir
 * @param {() => Promise<{ default: any }>} [options.loadSqlite]  injectable so
 *   tests can simulate a missing native binary
 */
export async function createStore({ dataDir, loadSqlite = () => import('better-sqlite3') }) {
  const dbFile = path.join(dataDir, 'progress.db');
  const jsonFile = path.join(dataDir, 'progress.json');

  let Database;
  try {
    ({ default: Database } = await loadSqlite());
  } catch (err) {
    // The one failure that justifies the fallback: the native module is not
    // there (or was built for another Node). Everything else is thrown below.
    const reason = `better-sqlite3 could not be loaded (${String(err?.message ?? err).split('\n')[0]})`;
    console.warn(`[store] ${reason}; using the JSON file store instead.`);
    if (fs.existsSync(dbFile)) {
      console.warn(
        `[store] ${dbFile} exists but this build cannot read it: history saved there will not appear until better-sqlite3 loads again (try "npm rebuild better-sqlite3").`,
      );
    }
    const store = createJsonStore(jsonFile);
    store.fallbackReason = reason;
    return store;
  }

  const store = await createSqliteStore(Database, dbFile);
  store.fallbackReason = null;
  warnAboutStrandedJson(jsonFile);
  return store;
}

/**
 * If an earlier boot ran on the JSON fallback, those answers are not in
 * progress.db. Say so rather than letting the week's work silently vanish.
 */
function warnAboutStrandedJson(jsonFile) {
  if (!fs.existsSync(jsonFile)) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    if (Array.isArray(parsed.attempts) && parsed.attempts.length > 0) {
      console.warn(
        `[store] ${jsonFile} holds ${parsed.attempts.length} answer(s) from a run on the JSON fallback; they are not in progress.db. The file is left untouched.`,
      );
    }
  } catch {
    /* an unreadable leftover is not worth failing the boot over */
  }
}
