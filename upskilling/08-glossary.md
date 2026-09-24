# Glossary

Twenty terms, each tied to this repository. Every entry gives the file that shows the term at the baseline (`6f1bf43`), the journal entry where it matters, and the misreading juniors most often bring to it. If a term is not here, it did not earn a place: each one has an entry where it causes trouble.

---

**Invariant.** A statement that must be true every time you look, phrased so a test could assert it. Here: "an attempt row exists if and only if the card state advanced." Shown in: `server/src/routes/api.js › saveCardState (L121–130 @ 6f1bf43)`. Bites in: J08. *Misreading:* an invariant is a comment. It is a sentence you can put into an `expect`. Until one enforces it, it is only a hope.

**Idempotency.** Sending the same request twice has the same effect as sending it once. `POST /api/answers` is not idempotent: a replay records a second attempt and earns XP again. Shown in: `server/src/routes/api.js › /answers (L108–144 @ 6f1bf43)`. Bites in: J10 (a replay becomes `practice`), J30 (the submit guard). *Misreading:* "POST is never idempotent." That is a property of the design, not of the HTTP verb.

**Characterisation test.** A test that pins what code does *now*, before you change it. Shown in: `server/src/check.js › second correct answer reaches mastery (L69–73 @ 6f1bf43)`. Bites in: J01. *Misreading:* such a test proves the behaviour is right. This one pins bug F-01, which is why J01 marks it instead of porting it.

**Property test.** Assert a rule over many generated inputs, not one example: "for any answer sequence, ease stays in [1.3, 2.8]." Shown in: `server/src/srs.js › MIN_EASE (L10–11 @ 6f1bf43)`. Bites in: J10, walkthrough 02. *Misreading:* you need a library. A seeded loop of 10,000 iterations is a property test.

**Derived versus stored state.** Derived values are recomputed from the source of truth on every read, stored ones are saved. XP is derived. Shown in: `server/src/progress.js › seenBefore (L106–115 @ 6f1bf43)`. Bites in: J14. *Misreading:* derived means it cannot be wrong. Here it is derived from the wrong *input*: a 365-day slice of the log (F-08).

**Orphaned id.** A persisted row that points at something the code no longer defines, such as a card state for a renamed question. `question_id` has no foreign key, because the content is code. Shown in: `server/src/progress.js › totals.accuracy (L101–104 @ 6f1bf43)`. Bites in: J15. *Misreading:* renaming a question id is a content edit. It is a data migration, and skipping it makes accuracy exceed 100%.

**Trust boundary.** The line where data from outside (the request body) enters code that assumes shapes. Shown in: `server/src/routes/api.js › A response is required (L114 @ 6f1bf43)`, the only check before `grade()`. Bites in: J09, J13. *Misreading:* TypeScript types on the client make the body safe. The server sees bytes.

**Envelope.** The fixed wrapper around every response: `{ data }` or `{ error: { code, message } }`. Shown in: `client/src/lib/api.ts › body.data (L81 @ 6f1bf43)`. Bites in: J27. *Misreading:* an agreed envelope needs no checking. `body.data as T` throws a `TypeError` on a non-JSON 200 (F-20).

**Error translator.** The single error middleware that turns any thrown error into the envelope. Shown in: `server/src/index.js › internal_error (L74–85 @ 6f1bf43)`. Bites in: J13. *Misreading:* one translator means consistent codes. It trusts `err.code` from any source, so parser errors come out as `internal_error` and Node's `ENOENT` can leak through (F-14).

**Transaction.** Several writes that commit together or not at all. Shown in: `server/src/routes/api.js › addAttempt (L121–130 @ 6f1bf43)`, two writes without one. Bites in: J08. *Misreading:* no transaction means frequent corruption. With synchronous better-sqlite3 the window is a hard kill between two statements. Rate it S3 and fix it anyway.

**WAL (write-ahead log).** SQLite writes changes to a `-wal` file and folds them into the database later. Readers do not block the writer. Shown in: `server/src/store.js › journal_mode = WAL (L51 @ 6f1bf43)`. Bites in: J21. *Misreading:* leftover `-wal`/`-shm` files mean lost data. WAL is durable and replayed on the next open. They mean the store was never closed (F-21).

**Migration and `user_version`.** A numbered, one-way change to a persisted schema, recorded in the database itself. SQLite's `PRAGMA user_version` holds one integer for this (contract §13). Shown in: `server/src/store.js › CREATE TABLE IF NOT EXISTS (L54–92 @ 6f1bf43)`, which has no version. Bites in: J19, ADR-0017. *Misreading:* `IF NOT EXISTS` migrates. It creates missing tables and never changes existing ones.

**Atomic write.** Write to a temporary file, then rename it over the original, so a crash leaves either the old file or the new one, never half of one. Shown in: `server/src/store.js › writeFileSync (L189 @ 6f1bf43)`, which writes in place. Bites in: J20. *Misreading:* `writeFileSync` is atomic because it is synchronous. Synchronous means blocking, not all-or-nothing.

**Graceful shutdown.** On a signal: stop accepting requests, finish in-flight ones, close what you opened, then exit. Shown in: `server/src/index.js › server.close (L91–97 @ 6f1bf43)`. Bites in: J21. *Misreading:* closing the HTTP server is the whole job. The store is never closed (F-21), and the Windows console's Ctrl+Break sends `SIGBREAK`, which nothing handles (J21 adds it).

**Threat model.** A written statement of who can reach the system and what they could do, which sizes the security you owe. Shown in: `server/src/routes/api.js › requireProfile (L162–172 @ 6f1bf43)` and its comment. Bites in: J21, ADR-0006. *Misreading:* "local tool" is a threat model. It is one only if the bind is loopback. `app.listen(port)` binds every interface (M-04).

**SM-2 and ease factor.** SM-2 is the spaced-repetition algorithm this scheduler trims. The ease factor multiplies each interval to get the next. Shown in: `server/src/srs.js › MAX_EASE (L10–11, L37 @ 6f1bf43)`. Bites in: J10, ADR-0009. *Misreading:* higher ease means an easier card to answer. It means longer gaps between reviews.

**Lapse.** A wrong answer on a card that had been learned (`reps > 0`). A first-time miss is not a lapse. Shown in: `server/src/srs.js › not forgetting (L43–45 @ 6f1bf43)`. Bites in: J10, where `outcome` distinguishes `lapsed` from `failed`. *Misreading:* every wrong answer is a lapse.

**Stale closure.** A callback that captured a value from an earlier render and still acts on it. Shown in: `client/src/pages/DrillPage.tsx › canSubmit (L222–245 @ 6f1bf43)`, read by a window listener that re-subscribes only after the effect runs. Bites in: J25, J30. *Misreading:* adding the value to the dependency array fixes it. That fixes the next render, not an event that lands in between.

**Cancellation (and the race it prevents).** Ignoring or aborting async work whose result no longer applies, such as a response for profile A arriving after a switch to B. Shown in: `client/src/lib/app-state.tsx › cancelled (L51–79 @ 6f1bf43)`, present in the effects and absent in `refreshProgress`. Bites in: J27 (`AbortSignal`), J28. *Misreading:* a `cancelled` flag cancels the request. It only discards the answer, and the request still runs.

**State machine (discriminated union).** Model a screen as a set of named states and allowed transitions, and type it as a union with one `kind` field so an impossible combination does not compile. Shown in: `client/src/pages/DrillPage.tsx › useState (L41–45, L191–198 @ 6f1bf43)`: eleven independent `useState` calls standing in for one state. Bites in: J30. *Misreading:* `useReducer` is the state machine. It is the container. The machine is the transition table you write down.
