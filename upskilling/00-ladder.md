# The ladder: junior, mid, senior as things you do

A level is a set of behaviours you can point to in a PR, not a number of years. Each behaviour below has three columns: what a junior does when they meet it, what a mid-level engineer does, and what a senior does. There is one example from this repository at baseline `6f1bf43`, and the journal entry where you can watch it happen.

The columns are not insults. The junior move usually passes review at a glance, which is exactly why it is worth naming.

Sixteen behaviours in six themes. Behaviour ids (B01–B16) are what journal entries list under `ladder:`.

---

## 1. Reading the code honestly

### B01 · Verifies prose against the code

- **Junior:** repeats what the README says.
- **Mid:** notices a claim that sounds too neat, and reads the function behind it.
- **Senior:** tests the claim, finds the test that asserts the opposite, and fixes the code or the copy in the same PR.

**Example.** README L77 promises that "**Mastered** means two spaced correct answers". Yet `server/src/srs.js › schedule() (L27–53 @ 6f1bf43)` never reads `state.dueAt`, so two correct answers a minute apart master a card. The same drift shows up elsewhere. The Dashboard says a stage opens at "a third" (`client/src/pages/Dashboard.tsx › a third @ 6f1bf43`), while `tracks.js` says `0.35`. The header of `check.js` says "runs it in CI", and there is no CI.
**Exercised by:** J10, J37, J05.

### B02 · Names the invariant and finds where it is enforced

- **Junior:** "Answers never reach the browser", because the README says so.
- **Mid:** finds the function that strips the key, and the assertion that checks it.
- **Senior:** lists every path a question can take out of the process, and checks each one. That includes the ones no test covers and the ones that do not exist yet.

**Example.** `content/schema.js › publicQuestion() (L118–121 @ 6f1bf43)` strips the key, and `check.js` L43–44 and L118 assert it for one question and one session. `GET /modules/:id` relies on it and has no test. The quiet leak is elsewhere: one value import of `@jstrain/content` in the client would bundle every key (dx §1.1). The guard is a lint rule, not a comment.
**Exercised by:** J12, J04.

### B03 · Separates a bug from a decision, and writes the decision down

- **Junior:** calls the whole JSON fallback a bug, or calls all of it intended.
- **Mid:** reads the comment, and accepts the fallback as deliberate.
- **Senior:** splits one `try` block into a decision and a bug. Falling back when the native binary is missing is availability over durability (ADR 0003). Falling back when `progress.db` is corrupt silently hides the learner's history.

**Example.** `server/src/store.js › createStore() (L259–268 @ 6f1bf43)` wraps both the `import('better-sqlite3')` and `createSqliteStore(...)` in one `try`, so a corrupt file boots an empty store (M-03). The decision gets an ADR amendment (0018). The bug gets a journal entry.
**Exercised by:** J18.

---

## 2. Data that outlives the code

### B04 · Treats identifiers and persisted shapes as contracts

- **Junior:** renames `js-async-3` to `js-async-03` so the ids sort nicely.
- **Mid:** knows ids are stored, and greps the server for them before renaming.
- **Senior:** knows there is no foreign key from progress to content, so a rename orphans history *silently*. Adds a check that fails CI on a removed id, and ships schema changes as numbered migrations.

**Example.** `server/src/store.js › card_states (L61–73 @ 6f1bf43)` keys on `question_id TEXT NOT NULL` and has no reference to anything in `content/`. The only schema mechanism is `CREATE TABLE IF NOT EXISTS`, which can never add a column to an existing file (F-11). An orphaned state is how accuracy reaches 600% (F-10).
**Exercised by:** J15, J19, J37.

### B05 · Makes multi-step writes atomic, designs for replay, and rates it honestly

- **Junior:** "No transaction: critical!"
- **Mid:** wraps both writes in `db.transaction()`.
- **Senior:** states the invariant: an attempt row exists if and only if the card advanced. Rates the gap S3, because both calls are synchronous statements in one tick. Spends the effort where the real exposure is, a replayed POST.

**Example.** `server/src/routes/api.js › POST /answers (L108–144 @ 6f1bf43)` calls `saveCardState` and then `addAttempt`. The server has no idempotency key. After J10 a replay counts as practice and no longer moves the schedule, but it still writes a second attempt row and awards XP again.
**Exercised by:** J08, J10.

### B07 · Knows where derived state stops being true

- **Junior:** "XP is derived, so it cannot drift."
- **Mid:** finds the 365-day window.
- **Senior:** asks which set each number is computed over. A numerator and a denominator computed over different sets make a number that can exceed 100%. A windowed replay makes a total that falls over time.

**Example.** `server/src/progress.js › buildProgress() (L101–115 @ 6f1bf43)` sums `correct` over `states.values()`, which includes orphans, and `attempts` over live questions only. It replays XP from `now − 365 days`, so a learner's level drops a year after a burst of study, and first-attempt XP (10) is awarded again (F-08).
**Exercised by:** J14, J15.

---

## 3. Boundaries

### B06 · Validates at trust boundaries and never casts through them

- **Junior:** `return body.data as T`.
- **Mid:** adds a check wherever something crashed.
- **Senior:** separates *malformed* from *wrong*. A response of the wrong shape is a 400, with nothing stored and nothing revealed. A well-formed wrong answer is graded.

**Example.** `server/src/routes/api.js › POST /answers @ 6f1bf43` rejects only `response === undefined` (L114). So `"1"` instead of `1` is graded wrong, stored, scheduled as a lapse, and reveals the key (M-02). On the client, `client/src/lib/api.ts › request (L56–82 @ 6f1bf43)` casts the envelope and throws `TypeError` on a non-JSON 200 (F-20).
**Exercised by:** J09, J13, J27.

### B15 · Sizes security to the threat model and writes the boundary down

- **Junior:** "There is no auth", and proposes JWTs for a single-user local tool.
- **Mid:** accepts the header, because the app is local.
- **Senior:** writes down the condition the header depends on (loopback only), then checks whether the code meets it.

**Example.** `server/src/routes/api.js › requireProfile() (L167–172 @ 6f1bf43)` trusts `x-profile-id`, which is fine on loopback. But `server/src/index.js › app.listen (L87 @ 6f1bf43)` binds every interface, so anyone on the café Wi-Fi can `DELETE /api/profiles/:id` (M-04). `cors({ credentials: true })` enables a mode nothing uses (F-22).
**Exercised by:** J21.

---

## 4. Evidence

### B08 · Measures before optimising, and reports the null result

- **Junior:** replaces the per-question lookup with a `Map` "for performance".
- **Mid:** seeds a big database and times the endpoint.
- **Senior:** first asks which rows the query touches, measures the endpoint that actually grows, and writes up the one that did not matter.

**Example.** `server/src/routes/api.js › getCardState (L78–79 @ 6f1bf43)` runs 14 primary-key lookups per module page. Seeding 200k attempts changes nothing there, because attempts are not in that query. `/progress` is what grows: it replays a year of attempts on every call. `idx_card_states_due` costs every write and serves no read (F-06).
**Exercised by:** J22, E04.

### B09 · Pins behaviour before changing it, and notices when a test pins a bug

- **Junior:** ports every `check.js` assertion to the new runner, unchanged.
- **Mid:** adds characterisation tests before refactoring.
- **Senior:** reads what each existing assertion *means*, finds the one that encodes the bug, and marks it rather than porting it.

**Example.** `server/src/check.js › second correct answer reaches mastery (L72–73 @ 6f1bf43)` calls `schedule()` twice with the same `now` and asserts mastery. That is F-01 written as a passing test. `check.js` stays, because it is the only test that runs against `npm ci --omit=dev` and proves the native binary loads.
**Exercised by:** J01, J10, J45.

### B10 · Makes time and randomness injectable, and tests the fallback path

- **Junior:** tests against the real clock, and reruns when it flakes.
- **Mid:** passes `now` into the pure functions.
- **Senior:** checks that the callers pass it too. Makes randomness a parameter. Makes the fallback backend reachable from a test, so the path that runs only on broken machines runs on every CI run.

**Example.** `schedule()` and `buildSession()` accept `now`, but the routes call `new Date()` themselves (`api.js` L77, L116). `server/src/sessions.js › shuffle() (L141–148 @ 6f1bf43)` calls `Math.random()`. Nothing can force the JSON store, which is how its exit hook writes into a deleted directory unnoticed (F-13).
**Exercised by:** J06, J07, J20.

---

## 5. The client

### B11 · Derives fetch identity from the URL and state, and recognises the bug class

- **Junior:** adds `n` to the effect's dependency array.
- **Mid:** keys the page by `location.key`.
- **Senior:** names the class, "a URL change that no effect subscribes to", checks the other hand-built links for it, then removes the class by building links from typed parameters.

**Example.** `client/src/pages/DrillPage.tsx › Another round (L547–553 @ 6f1bf43)` links to `…&n=${Date.now()}`. Nothing reads `n`, the effect deps at L70 do not include it, and the same route element re-renders without remounting. The link also drops `trackId`/`stageId`.
**Exercised by:** J23 (the hotfix), J30 (the fix), J46.

### B12 · Separates boot failure from background failure

- **Junior:** shows whatever error arrives.
- **Mid:** adds a Retry button to the error screen.
- **Senior:** gives each failure its own blast radius. A failed boot blocks the app. A failed refresh keeps the last good data. A 404 on a stored id means "forget it", not "crash".

**Example.** `client/src/lib/app-state.tsx › refreshProgress (L81–88 @ 6f1bf43)` writes the same `error` that the Gate treats as a boot failure. A stale stored profile id returns a 404 before boot finishes, and nothing ever clears it (M-06).
**Exercised by:** J28.

### B13 · Treats accessibility as correctness

- **Junior:** adds `aria-label` to things.
- **Mid:** runs the drill with a keyboard only.
- **Senior:** treats "focus drops to `<body>` after every move" as a bug of the same weight as a wrong grade, and writes the test by role.

**Example.** `client/src/pages/DrillPage.tsx › onKeyDown (L253–289 @ 6f1bf43)` listens on `window`. It submits the drill when Enter is pressed on a nav link or the profile `<select>`, and it has no `repeat` guard, so held Enter skips the explanation (M-07). `OrderList` keys rows by `` `${item}-${i}` `` (L471), so each move remounts the row and loses focus (F-15).
**Exercised by:** J25, J31, J26.

---

## 6. Ownership

### B14 · Knows when a home-grown thing is cheaper than a dependency, and when it stops being

- **Junior:** swaps in a Markdown library and `dangerouslySetInnerHTML`.
- **Mid:** patches the regex that misbehaved.
- **Senior:** keeps the small renderer and pins its supported subset with tests. Rejects anything outside that subset in `validateContent()`, so content cannot outgrow it. Writes down the trigger for switching.

**Example.** In `client/src/components/Markdown.tsx › renderBlocks (L48–175 @ 6f1bf43)`, a `|`-leading line that is not a table skips the table branch. The paragraph loop then rejects that same line, `i` never advances, and the tab freezes (M-05). `Code.tsx` L6–9 explains why Prism was not used. That reasoning holds until the first link appears in content (ADR 0005).
**Exercised by:** J24.

### B16 · Owns the lifecycle of what it opens

- **Junior:** `server.close(() => process.exit(0))`.
- **Mid:** adds `store.close()` to the callback.
- **Senior:** lists everything the process opened (listener, DB handle, WAL, exit hooks, timers), closes each in order, bounds the wait, and makes `close()` idempotent.

**Example.** `server/src/index.js › SIGTERM (L91–97 @ 6f1bf43)` never calls `store.close()`, so `-wal`/`-shm` files stay behind. `server/src/store.js › createJsonStore() (L200–203 @ 6f1bf43)` registers a `process.on('exit')` flush that `close()` never removes (F-13, F-21).
**Exercised by:** J20, J21.

---

## Using this in a 1:1

Pick three behaviours. For each, find one PR of yours where you did the senior column and one where you did not. Bring both links. If you cannot find either, read the entry listed under "Exercised by", then take the next open row in the [register](10-findings-register.md) that exercises the same behaviour.
