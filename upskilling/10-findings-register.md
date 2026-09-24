# Findings register

One row per known defect or smell at baseline `6f1bf43`. This is a **pointer index**, not the evidence. Each row names the audit section that holds the reproduction, and the journal entry that closes it. Read the evidence there. Do not copy it here.

## Sources

| Key | File | Finding ids inside |
|---|---|---|
| server | [`_audits/2026-09-23-server.md`](_audits/2026-09-23-server.md) (review: [`…server.review.md`](_audits/2026-09-23-server.review.md)) | B1–B8, G1–G2, S1–S3, SE1–SE6, P1–P4, ST1–ST6, H1–H6 |
| client | [`_audits/2026-09-23-client.md`](_audits/2026-09-23-client.md) (review: [`…client.review.md`](_audits/2026-09-23-client.review.md)) | B1–B35, A1–A9, P1–P17 |
| content | [`_audits/2026-09-23-content-audit.md`](_audits/2026-09-23-content-audit.md) (review: [`…content-audit.review.md`](_audits/2026-09-23-content-audit.review.md)) | §1–§6 |
| dx | [`_audits/2026-09-23-dx.md`](_audits/2026-09-23-dx.md) | §0–§4 |
| expansion | [`_audits/2026-09-23-content-expansion.md`](_audits/2026-09-23-content-expansion.md) (review: [`…content-expansion.review.md`](_audits/2026-09-23-content-expansion.review.md)) | §0–§8 |
| upskilling review | [`_audits/2026-09-23-upskilling.review.md`](_audits/2026-09-23-upskilling.review.md) | §1 (F-row verdicts), §1.1 (M-rows) |

Where a finding appears in two audits, both are listed and the first one holds the reproduction. When an audit and its review disagree, the review wins. Where the review and the server/client [contract](#reconciliations) disagree, the contract wins, because it is what is being built.

## Severity

- **S1**: a number the learner relies on is wrong, data is lost, or the product's core promise is false. This includes latent defects severe enough to freeze the app.
- **S2**: a feature is visibly broken or misleading, or there is a real operational trap.
- **S3**: robustness, hygiene or drift. Nobody notices until something else goes wrong.

Severity is what the evidence shows, not what the fix feels like. Checklist item 15 in [`04-journal/README.md`](04-journal/README.md) holds an entry to the severity recorded here.

## Status values

`open` → `partial (Jnn)` → `closed (Jnn)`. Also: `not a bug (Jnn)`, when an implementer's reproduction fails and the entry says why (that is worth recording), and `won't fix (ADR-nnnn)`, when a decision accepts the cost.

The Status column is generated. `node upskilling/_tools/register-status.mjs` sets it from each entry's front matter (`closes:`, `status:`) and its "Closes" byline: `closed` when every J number in the Owner cell has landed and the landed entries close the whole row, `partial` when a landed entry closes only part of it or an owner entry has not landed, `open` when no landed entry lists it. An entry that is `in review` closes nothing. Run it in the same PR as the entry; `--check` fails CI-style when the register and the entries disagree.

## The register

### F-rows: the original register, corrected

| Id | Source | Symptom | Sev | Owner | Status |
|---|---|---|---|---|---|
| F-01 | server B2 | "Spaced" mastery is not enforced: `schedule()` never reads `dueAt`, so two correct answers a minute apart master a card. Sessions re-serve non-due cards (`sessions.js` L122). `check.js` L69–73 asserts the bug as a pass. | S1 | J10 | closed (J10) |
| F-02 | server ST3 | Card state and attempt are written as two statements with no transaction (`api.js` L121–130). The only window is a hard kill between two synchronous calls, or `insertAttempt` throwing. | S3 | J08 | closed (J08) |
| F-03 | server ST3 | `resetProgress` is two deletes with no transaction (`store.js` L163–166). | S3 | J08 | closed (J08) |
| F-04 | server ST5 | `GET /modules/:id` calls `getCardState` once per question. That is 14 primary-key lookups in-process, and immaterial at this scale. | S3 | J22 | closed (J22) |
| F-05 | server SE1 · client B12 | The daily mix calls `shuffle(due)` twice (L92, L101), so one session can contain the same card twice. An adjacent duplicate reuses the answered `QuestionCard`. | S2 | J07 | closed (J07) |
| F-06 | upskilling review §1 | `idx_card_states_due` (`store.js` L90–91) serves no query. It costs every write. | S3 | J19 | closed (J19) |
| F-07 | client B13 · client B4 | Double submit: a narrow client race (autorepeat, or the gap between commit and effect). The server has no idempotency. After J10 a replay becomes "practice", but it still doubles the attempt row and the XP. | S2 | J10 (server), J30 (client) | closed (J10, J30) |
| F-08 | server B6 | XP is replayed over 365 days only. Level falls after a year, and first-attempt XP (10) is awarded again. | S1 | J14 | closed (J14) |
| F-09 | upskilling review §1 | `shuffle()` calls `Math.random()` directly (`sessions.js` L144), so session tests cannot be deterministic. | S3 | J06, J07 | closed (J06, J07) |
| F-10 | server P1 | `totals.accuracy` sums `correct` over orphaned card states but `attempts` over live questions. Reproduced `accuracy: 6`. | S1 | J15 | closed (J15) |
| F-11 | server §5 | `CREATE TABLE IF NOT EXISTS` is the only schema mechanism. There is no version and no migration. | S2 | J19 | closed (J19) |
| F-12 | client B1 | "Another round" changes only `n`, which no effect reads, so nothing reloads. It also drops `trackId`/`stageId`. | S2 | J23 (hotfix), J30 | closed (J23, J30) |
| F-13 | server ST1, ST2, ST4 | JSON store: the exit hook flushes into a deleted directory, `getProfile` returns the live object, and the write is not atomic. | S2 | J20 | closed (J20) |
| F-14 | server H1 | Body-parser errors come back as `code: internal_error`, and a Node system error's `err.code` (`ENOENT`) would leak into the API's `code` field. | S3 | J13 | closed (J13) |
| F-15 | client B7 | The order list keys items by `${item}-${i}`, so every move remounts the row and focus drops to `<body>`. | S2 | J31 | closed (J31) |
| F-16 | upskilling review §1 | `SessionMode` in `types.ts` L14 duplicates `MODES` in `sessions.js` L13. The guard is the lint rule, not a shared module. | S3 | J04 | closed (J04) |
| F-17 | client B5 | One `error` state serves boot and background. A failed progress refresh replaces every page with the boot-error screen. | S2 | J28 | closed (J28) |
| F-18 | client B29 | `Shell.onAdd` awaits `createProfile` with no `try`. A failure is an unhandled rejection with no UI. | S3 | J28 | closed (J28, J43) |
| F-19 | server P3 · dx §1.10 | Dashboard L80 and README L55 say a stage opens at "a third". `tracks.js` says `0.35`. "Seven stages" is hard-coded. | S3 | J37 | closed (J37) |
| F-20 | client B28 | `request<T>` returns `body.data as T`. A 200 with a non-JSON body throws `TypeError`. Ids are not encoded. | S3 | J27 | closed (J27) |
| F-21 | server B8 | Shutdown closes the HTTP server but never calls `store.close()`. The `-wal`/`-shm` files linger, and the 5 s timeout exits 1 without closing anything. | S2 | J21 | closed (J21) |
| F-22 | server H2 | `cors({ credentials: true })` with no cookies, and `json` is mounted before `cors`. | S3 | J21 | closed (J21) |
| F-23 | dx §1.2–1.3 | `check.js` L4 says it "runs in CI", and there is no CI. README says "40 assertions"; there are 36–37. | S3 | J01 (part), J05 | closed (J01, J05) |
| F-24 | server B7 | The streak steps back by 24 h, not by calendar day. Across DST this reproduces a skipped day (2, expected 1) and a double count (4, expected 3). | S2 | J16 | closed (J16) |
| F-25 | upskilling review §1 | Module-level `seenIds` in `schema.js` L12. `deck()` cannot build the same ids twice in one process, so test fixtures cannot rebuild a question, and `q()` depends on call order. **Importing twice does not throw**: an ES module is evaluated once per realm. | S3 | unassigned (ADR 0008 cost) | open |
| F-26 | client B24 | `useModuleProgress` fabricates `trackId: 'js'`, and the zeroed record shows while progress loads ("0 of N mastered" flash). | S3 | J28 | closed (J28) |
| F-27 | client B8 · client B2 | Italic regex eats `a * b * c`, and an unclosed fence swallows the document. See M-05 and M-13 for the severe parts. | S3 | J24 | closed (J24) |
| F-28 | upskilling review §1 | Four manifests, two versions: root and client `2.2.0`, server and content `1.0.0`. | S3 | E08 (release checklist) | open |
| F-29 | server SE4 | `badRequest` in `sessions.js` L154–159 duplicates `httpError` and emits `bad_request`, not `validation_failed`. | S3 | J13 | closed (J13) |
| F-30 | client B35 | Dead ternary `streak === 1 ? 'day streak' : 'day streak'` (`Dashboard.tsx` L70). | S3 | J37 (with F-19) | closed (J37) |

### M-rows: missing from the original register, added by the review

| Id | Source | Symptom | Sev | Owner | Status |
|---|---|---|---|---|---|
| M-01 | server B1 · content §5.1 | The key is index 1 in 363 of 389 mcq/output questions, and choices are never shuffled. "Always press 2" scores 93%. Mastery, levels and unlocks mean nothing while this holds. | S1 | J11 (why texts), J12 | closed (J11, J12) |
| M-02 | server B3 | A malformed response (`"1"` for `1`) is graded wrong, recorded, scheduled as a lapse, and reveals the key. | S2 | J09 | closed (J09) |
| M-03 | server B4 | Any SQLite failure, not just a missing binary, boots an empty JSON store. The next healthy boot never reads it. | S1 | J18 | closed (J18) |
| M-04 | server B5 | `app.listen(port)` binds every interface, so anyone on the LAN can delete profiles. | S2 | J21 | closed (J21) |
| M-05 | client B2 | Markdown renderer loops forever on a `|`-leading line that is not a table. The tab freezes mid-drill. | S1 (latent) | J24 | closed (J24) |
| M-06 | client B3 | A stale stored profile id causes a 404 before boot resolves. `error` is never cleared, so the boot-error screen stays up forever with the wrong message. | S2 | J28 | closed (J28) |
| M-07 | client B4 | The global keydown handler steals Enter from nav links, `<select>`, the reorder buttons and the new-learner input. There is no modifier or `repeat` guard. | S2 | J25 | closed (J25) |
| M-08 | server SE1, SE2 | The daily mix caps reviews at half and fills with unseen cards, so the backlog grows without bound. Due cards are shuffled, not sorted by `dueAt`. A module session can return 1 question when 12 were asked for. | S2 | J17 | closed (J17) |
| M-09 | server ST6 | The last profile can be deleted, and the running app has none until restart. | S3 | J21 (unassigned in the plan) | closed (J21) |
| M-10 | server H3 | The SPA fallback regex matches `/api`, and a missing hashed asset gets `index.html`. | S3 | J13 (unassigned in the plan) | closed (J13) |
| M-11 | content §1 | Eleven questions have a wrong or outdated key or explanation. Each was verified with `tsc`, Node or a changelog. | S1 | J33 | closed (J33) |
| M-12 | content §5.2–5.3 | The key is the unique longest choice in 86% of single-answer questions, and 15 of 17 booleans are `false`. | S2 | J34 | partial (J34) |
| M-13 | client B8, B9 | Bold containing code renders literal backticks (7 primer passages), and bash `--flag` is highlighted as a comment. | S2 | J24 (part), J26 | closed (J24, J26) |
| M-14 | client B16 | Progress refreshes only when the Summary mounts. If the learner leaves mid-drill, the dashboard shows stale numbers until reload. | S2 | J32 | closed (J32) |
| M-15 | dx §1.4, §1.5, §1.8 | `.env.example` is never loaded, `engines >=20` names an EOL runtime, and version-pinned `allowScripts` will silently drop the native build (and the JSON fallback hides that). | S3 | J02, J21 (part) | closed (J02, J21) |
| M-16 | client B10, B11 | Inline code is `nowrap` (86 prompts overflow at phone width), light-theme `--text-faint` is 2.9:1, and the input focus ring is removed. | S2 | J26 (part) | partial (J26) |

## Reconciliations

These are the places where the register departs from a source. Each one is a judgement call, written down so the next reader can disagree with it.

- **M-02 is S2, not S1.** The upskilling review lists it as S1. The server review shows the shipped client cannot produce a malformed shape: `DrillPage.tsx` L222–226 blocks it. It takes a hand-written request or a future client bug. The contract hardening is still worth an entry.
- **M-03 keeps S1, with one trigger removed.** The server review reproduced two `createStore()` calls on one directory, and both came up `sqlite`. So "SQLITE_BUSY from a second instance" is not a trigger. It also adds a missed one: the intended fallback (a Node upgrade before `npm rebuild`) splits history across two files.
- **F-11 and J19 follow the contract, not the review.** The upskilling review says a `schema_version` table. `CONTRACT.md` §13 settled on `PRAGMA user_version`, with a backup before migrating and a refusal to open a newer version.
- **F-23's number.** Nothing in this folder states an assertion count for `check.js`. Say "the self-test".
- **Unassigned rows** (F-25, M-09, M-10) had no planned entry. J21 took M-09 and J13 took M-10, so only F-25 is still unassigned. An implementer who closes it takes the next free J number.

## Reconciliation 2026-09-24

The first pass of `_tools/register-status.mjs` over J01–J46, with the refactor in the working tree on top of `6f1bf43`. Totals: 46 rows, 40 closed, 2 partial, 4 open. Every row that is not closed, and every row closed by two entries, is listed here; `--check` fails if one is missing.

### Not closed

| Id | Status | Why | Kind |
|---|---|---|---|
| F-25 | open | Module-level `seenIds` is still in `content/schema.js`. No entry took it; it is the accepted cost of ADR 0008 (validate at import). | genuinely unfixed, no owner |
| F-28 | open | Root and client are still `2.2.0`, server and content `1.0.0`. The row closes when a release is cut, which is exercise E08, not an entry. | deferred to the first release |
| M-01 | partial (J12) | Shuffling and grading by choice id landed. The `why` texts that name a position are J11, which is `in review`. | waiting on an entry in review |
| M-11 | open | The eleven corrected keys are J33, which is `in review`. | waiting on an entry in review |
| M-12 | open | J34 is `in review`, and it closes the row only in part: the longest-choice tell is down, not gone, and the boolean split awaits new questions (J34 Follow-ups). | waiting on an entry in review; partial even when it lands |
| M-16 | partial (J26) | J26 fixed `nowrap`, the focus ring and `--text-faint`, and calls that part. The tag contrast in client B11 (about 3.8:1) is claimed by no entry. | genuinely unfixed |

### Closed by two entries

| Id | Status | How the two split it |
|---|---|---|
| F-07 | closed (J10, J30) | J10 makes a replay `practice` on the server; J30 guards the client. A replay that gets past the guard still writes a second row and 1 XP; the idempotency key stays a J08 follow-up. |
| F-09 | closed (J06, J07) | J06 injects the clock, J07 the randomness. |
| F-12 | closed (J23, J30) | J23 is the hotfix, J30 the fix that removes the bug class. |
| F-18 | closed (J28, J43) | J28 catches the `createProfile` failure in `Shell.onAdd`; J43 does the same for "Reset progress", which awaited with no `catch`. |
| F-23 | closed (J01, J05) | J01 fixes the test layout and the stale count; J05 adds the CI that the header claimed. |
| M-13 | closed (J24, J26) | J24 renders bold that contains code; J26 stops highlighting bash `--flag` as a comment. |
| M-15 | closed (J02, J21) | J02 raises the Node floor and handles `allowScripts`; J21 loads `.env` and `DATA_DIR`. |

### Judgement calls

- **F-16 is closed although `SessionMode` is still duplicated.** J04 closes it as "the guard, not the `SessionMode` duplication". The row's own text says the guard is the lint rule, so the lint rule is the fix; `client/src/lib/types.ts` and `MODES` in `server/src/sessions.js` still list the same seven modes by hand.
- **M-09 and M-10 are closed by entries that were not planned for them** (J21 and J13). Their Owner cells now name those entries.
- **Entries in review close nothing.** J11, J33, J34, J35, J45 and J46 are `in review`. When one lands, rerun the script; it moves M-01, M-11 and M-12 without anyone editing a cell.
