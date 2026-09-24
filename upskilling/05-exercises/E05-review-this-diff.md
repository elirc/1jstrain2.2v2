# E05: Review this diff

Level: senior · Timebox: 1 h · Touches: server | client
Ladder: B01, B03, B04, B05, B14 · Depends on: nothing (written against `6f1bf43`; read ADR 0004 and ADR 0005 first)

## Scenario

A contributor opens PR #41, "fix: XP drift + support links in primers; tidy sessions.js". The description reads: *"XP was recomputed on every `/progress` call and only covered a year, so levels went down. Now we store it. Also added `[text](url)` links to the Markdown renderer because I wanted to link the MDN docs from a primer. Ran prettier on sessions.js while I was there. `npm run check` passes."*

`npm run check` does pass. Review it.

```diff
diff --git a/server/src/store.js b/server/src/store.js
@@ -54,7 +54,8 @@ function createSqliteStore(Database, file) {
     CREATE TABLE IF NOT EXISTS profiles (
       id          TEXT PRIMARY KEY,
       name        TEXT NOT NULL,
-      created_at  TEXT NOT NULL
+      created_at  TEXT NOT NULL,
+      xp          INTEGER NOT NULL DEFAULT 0
     );
@@ -131,6 +132,7 @@ function createSqliteStore(Database, file) {
     resetCards: db.prepare('DELETE FROM card_states WHERE profile_id = ?'),
     resetAttempts: db.prepare('DELETE FROM attempts WHERE profile_id = ?'),
+    addXp: db.prepare('UPDATE profiles SET xp = xp + ? WHERE id = ?'),
   };
@@ -139,7 +141,7 @@ function createSqliteStore(Database, file) {
     getProfile: (id) => {
       const r = stmt.getProfile.get(id);
-      return r ? { id: r.id, name: r.name, createdAt: r.created_at } : undefined;
+      return r ? { id: r.id, name: r.name, createdAt: r.created_at, xp: r.xp } : undefined;
     },
@@ -153,6 +155,7 @@ function createSqliteStore(Database, file) {
     addAttempt: (attempt) => stmt.insertAttempt.run(attempt),
+    addXp: (profileId, amount) => stmt.addXp.run(amount, profileId),
     listAttempts: (profileId, sinceIso) =>
diff --git a/server/src/routes/api.js b/server/src/routes/api.js
@@ -128,6 +128,7 @@ export function createApiRouter({ store }) {
       elapsedMs: Number.isFinite(elapsedMs) ? Math.round(elapsedMs) : null,
       answeredAt: now.toISOString(),
     });
+    store.addXp(profileId, xpFor(before, correct));
 
     res.json({
diff --git a/server/src/progress.js b/server/src/progress.js
@@ -103,16 +103,9 @@ export function buildProgress(store, profileId, now = new Date()) {
     return totals.attempts ? correct / totals.attempts : null;
   })();
 
-  // XP is recomputed from history rather than stored, so it can never drift
-  // away from the attempts that produced it.
   const history = store.listAttempts(profileId, new Date(now.getTime() - 365 * DAY_MS).toISOString());
-  let xp = 0;
-  const seenBefore = new Map();
-  for (const attempt of history) {
-    const priorAttempts = seenBefore.get(attempt.questionId) ?? 0;
-    xp += xpFor({ attempts: priorAttempts }, attempt.correct);
-    seenBefore.set(attempt.questionId, priorAttempts + 1);
-  }
+  const xp = store.getProfile(profileId)?.xp ?? 0;
 
   const days = new Map();
diff --git a/client/src/components/Markdown.tsx b/client/src/components/Markdown.tsx
@@ -18,7 +18,7 @@ export function Inline({ text }: { text: string }) {
 function parseInline(text: string): ReactNode[] {
   const out: ReactNode[] = [];
-  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
+  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)]+\))/g;
   let lastIndex = 0;
@@ -32,6 +32,11 @@ function parseInline(text: string): ReactNode[] {
       out.push(<code key={key++}>{token.slice(1, -1)}</code>);
     } else if (token.startsWith('**')) {
       out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
+    } else if (token.startsWith('[')) {
+      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!;
+      out.push(
+        <span key={key++} dangerouslySetInnerHTML={{ __html: `<a href="${href}" target="_blank">${label}</a>` }} />,
+      );
     } else {
       out.push(<em key={key++}>{token.slice(1, -1)}</em>);
     }
diff --git a/server/src/sessions.js b/server/src/sessions.js
@@ -20,7 +20,7 @@ const MAX_LIMIT = 40;
 export function buildSession({ store, profileId, mode, moduleId, stageId, trackId, limit, now = new Date() }) {
-  const size = clamp(Number(limit) || DEFAULT_LIMIT, 1, MAX_LIMIT);
+  const size = clamp(Number(limit ?? DEFAULT_LIMIT), 1, MAX_LIMIT);
   const states = new Map(store.listCardStates(profileId).map((s) => [s.questionId, s]));
@@ -147,13 +147,6 @@ function shuffle(items) {
-function clamp(n, lo, hi) {
-  return Math.max(lo, Math.min(hi, n));
-}
-
-function badRequest(message) {
-  const err = new Error(message);
-  err.status = 400;
-  err.code = 'bad_request';
-  return err;
-}
+const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
+
+const badRequest = (message) => Object.assign(new Error(message), { status: 400, code: 'bad_request' });
```

## Deliverables

1. Review comments as you would post them, each anchored to a hunk. Mark each one blocking or non-blocking, and give a way out.
2. One paragraph to the author on how this PR should be split, and in what order the pieces should land.
3. For each blocking comment, the command or test that demonstrates the problem.

## Constraints

Review only what is in the diff and the baseline it applies to. Do not rewrite the PR for the author.

## Starting points

- `server/src/store.js › createStore() (L259–268 @ 6f1bf43)`
- `server/src/store.js › createJsonStore() (L173–255 @ 6f1bf43)`
- `server/src/progress.js › buildProgress() (L106–115 @ 6f1bf43)`
- `client/src/components/Markdown.tsx › parseInline (L19–42 @ 6f1bf43)`
- ADR 0004 and ADR 0005 in `02-adrs/`; register rows F-08, F-11, F-02 and M-03.

## Done when

You have at least four blocking comments, each with a reproduction. Your split paragraph names which piece should not ship at all.

## Stretch

Write the one test that would have caught the worst of these problems in CI, and say why `npm run check` could not.

<details><summary>Reviewer notes (open after attempting)</summary>

**A strong review finds these, roughly in this order of severity:**

1. **The column never reaches existing databases, and the failure is silent.** `CREATE TABLE IF NOT EXISTS` does not alter an existing `profiles` table (F-11). `stmt.addXp` is prepared when the store is created, so on any install from before this PR, `db.prepare` throws `no such column: xp` inside `createSqliteStore`. That throw lands in the `try` in `createStore()`, which logs "better-sqlite3 unavailable (no such column: xp)" and boots an **empty JSON store** (M-03). Every existing learner appears to lose their history on upgrade. `npm run check` passes because it uses a fresh temp directory. Reproduce: run the baseline once to create `progress.db`, apply the diff, boot, and read the `[store]` log line.
2. **The JSON backend has no `addXp`.** On the fallback store, every `POST /answers` throws `TypeError` *after* `saveCardState` and `addAttempt` have already run. That is a 500 on a half-written answer (F-02, made worse). This is the "store method added to one backend only" red flag.
3. **It violates ADR 0004 without superseding it,** and it does not fix F-08. The stored counter starts at 0 for every existing profile, so levels reset instead of creeping down. `resetProgress` does not zero it. The actual fix (J14) replays all history, keeps XP derived, and adds a parity test against `xpEarned`.
4. **XSS through a renderer whose whole point is having no XSS surface.** `label` and `href` are interpolated into an HTML string. `[x](javascript:alert(1))` executes on click. React 19 neutralises `javascript:` in an `href` *prop*, but not inside `__html`. `[<img src=x onerror=alert(1)>](#)` runs without a click. It also breaks the README's "No `dangerouslySetInnerHTML`" claim and ADR 0005. The content has zero links today (client audit §1.3). If links are ever needed, ADR 0005's revisit trigger applies: emit `<a>` elements with a scheme allowlist.
5. **The "prettier" hunk changes behaviour.** `Number(limit ?? 12)` turns `limit: 0` into 1 and `limit: "abc"` into `NaN`. `clamp(NaN)` is `NaN`, and `slice(0, NaN)` returns an empty session. A reformat must be behaviour-free, and this one hides a change in the one line that did something.

**Split:** the reformat goes first on its own (and reverted to exact behaviour), with a `.git-blame-ignore-revs` entry. The XP change is replaced by J14's approach. The links hunk does not ship.

**The junior review:** "LGTM, nice cleanup". Or a single comment about the non-null `!`.

**The mid review:** catches the XSS and asks for a split, but not the migration-to-fallback chain.

**What a senior also flags:** the PR description's own claim, "`npm run check` passes", is the evidence that the test suite cannot see upgrades. The stretch test opens a database created with the baseline DDL.
</details>
