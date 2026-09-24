> **Frozen review, pre-refactor. Do not edit.** Checked against commit `6f1bf43`; planning only.
> Produced on 2026-09-23 by a Fable agent as an adversarial review of the Opus agent's `upskilling` plan.
> Its corrections take precedence over the audit it reviews; the upskilling review is the spec this folder was built from.
> Line numbers are as of `6f1bf43`.
> Copied verbatim below this header.

# Review of `plans/upskilling.md` — verdicts and the final spec

Reviewer: adversarial principal. Every verdict below was checked against the file at `6f1bf43`, not against the plan's paraphrase of it. Sibling plans read: `server.md`, `client.md`, `content-audit.md`, `dx.md`, `content-expansion.md` (first 300 lines). No project file was modified.

## 0. Verdict in six lines

1. The plan's principles are right and its 27-row ladder is the best artefact in it. Keep the shape; cut the volume.
2. The findings register is 27/30 correct in substance, but **22 of the 30 rows are duplicates** of findings the sibling audits already evidence (often with reproductions), and it **omits the six highest-severity findings** those audits made. A teaching document that catalogues an unused index but not "always press 2 scores 93%" teaches the wrong priorities.
3. Three rows are worded wrongly (F-25's mechanism, F-24's "untested", F-04's materiality) and two planned journal entries point the wrong way (J20 adds Markdown links nobody asked for; J01 ports `check.js` one-for-one, which pins a known bug and contradicts `dx.md`).
4. The folder as drawn is roughly 57,000 words of grounded prose. It cannot be written well in one pass. Section 2 gives the ~21,000-word minimum viable set and what is stubbed.
5. Voice: "I" in journal entries, "you" in everything instructional, "we" only inside an ADR's Decision paragraph. 400–900 words per entry, code excluded and capped.
6. The register becomes a pointer index; the five audit plans are committed verbatim into `upskilling/_audits/` so the evidence outlives the scratchpad.

---

## 1. Findings register verification

Legend: **CONFIRMED** (true as stated), **CONFIRMED*** (true, but the wording, severity or mechanism needs the stated correction), **WRONG**, **DUP** (already evidenced in another plan; the register must point there rather than restate it). Line numbers are at `6f1bf43`.

| Id | Verdict | What I checked | Correction / note |
|---|---|---|---|
| F-01 | CONFIRMED, DUP server B2 | `srs.js` L27–53 never reads `state.dueAt`; `sessions.js` L122 `rest` bucket serves non-due unmastered cards; `check.js` L69–73 calls `schedule()` twice with the same `now` and asserts mastery. | Raise to S1: the number the whole app is built on (mastery → stage unlock) is wrong. server.md verified the 60-second reproduction. Point at server B2. |
| F-02 | CONFIRMED*, DUP server ST3 | `api.js` L121–130: `saveCardState` then `addAttempt`, no `db.transaction()`. | **Severity is overstated.** Both calls are synchronous better-sqlite3 statements in the same tick. The only window is a hard kill between two synchronous calls, or `insertAttempt` throwing (disk full). S3, not S1. The teaching value is the invariant ("an attempt row exists iff the card advanced"), not the likelihood. An entry that claims S1 fails checklist item 15. |
| F-03 | CONFIRMED, DUP server ST3 | `store.js` L163–166. | S3. Fold into F-02's entry. |
| F-04 | CONFIRMED*, DUP server ST5 | `api.js` L78–79 calls `getCardState` per question. | **Immaterial at this scale**: 14 primary-key point lookups against an in-process database. J08's plan to show "before/after timings from a seeded 200k-attempt DB" will show nothing, because `attempts` rows do not affect `card_states` lookups. Reframe J08 as the honest null result (section 5). |
| F-05 | CONFIRMED, DUP server SE1 / client B12 | `sessions.js` L92 and L101 are two independent `shuffle(due)` calls; the tail slice can repeat the head slice. `DrillPage.tsx` L163 keys by question id, so an adjacent duplicate reuses the answered card. | Correct. Client B12 rates it High; keep S2. |
| F-06 | CONFIRMED (unique) | `store.js` L90–91 index on `(profile_id, due_at)`. Every `card_states` statement (L113–114, L131) filters by PK or PK prefix. Nothing filters on `due_at`. | S3. Note that server §5.1 adds `idx_attempts_profile_question`; dropping this one belongs in the same migration. |
| F-07 | CONFIRMED*, DUP client B13 / B4 | `DrillPage.tsx` L222–245: `canSubmit` is a render-closure value; the window keydown listener (L253–289) is re-subscribed only after the passive effect runs. Server `api.js` L108–144 has no idempotency key. | **The server half is trivially true; the client half is a narrow race** (autorepeat, or commit-to-effect gap). S2, not S1. After server B2 lands, a replayed POST becomes "practice" and no longer moves the schedule, but it still doubles the attempt row and XP. That is the residual worth an entry. |
| F-08 | CONFIRMED, DUP server B6 | `progress.js` L108 windows history to 365 days; `seenBefore` restarts inside the window, so first-attempt XP (10) is re-awarded. | S1 stands. server.md has the numbers (16 → 10). |
| F-09 | CONFIRMED (unique) | `sessions.js` L144 `Math.random()`. | S3. Enabler for F-05's test. |
| F-10 | CONFIRMED, DUP server P1 | `progress.js` L101–104 sums `correct` over `states.values()` (includes orphaned ids); L99 sums attempts over curriculum modules only. | S1 stands; server.md verified `accuracy: 5`. |
| F-11 | CONFIRMED, DUP server §5 | `store.js` L54–92 `CREATE TABLE IF NOT EXISTS`, no version. | S2. Note server.md chose a `schema_version` **table**, not `PRAGMA user_version`; the plan's J06/E03 must follow the implementer. |
| F-12 | CONFIRMED, DUP client B1 | `DrillPage.tsx` L549 links `…&n=${Date.now()}`; effect deps L70 do not include `n`; same route element re-renders without remounting; `index` stays at `length`. Also drops `trackId`/`stageId`; `reloadDocument={false}` is the default and does nothing. | Remove "(confirm)". client.md explains the mechanism; it is High there. |
| F-13 | CONFIRMED, DUP server ST1/ST2/ST4 | `store.js` L200–203 `process.on('exit', flush)` never removed; `close()` L249–253 does not mark closed; `check.js` L146 removes the dir in `finally` after `close()`, so the exit flush hits a missing directory. L210 `find` returns the live object. L189 `writeFileSync` onto the live file. | All three true. server.md verified the ENOENT trace with exit code 0. |
| F-14 | CONFIRMED, DUP server H1 | `index.js` L74–85 uses `err.code ?? 'internal_error'`; body-parser errors carry `type`/`status`, not `code`. | Add server.md's second point: a Node system error's `err.code` (`ENOENT`) would leak into the API's `code` field. |
| F-15 | CONFIRMED, DUP client B7 | `DrillPage.tsx` L471 `key={`${item}-${i}`}`. | Correct. |
| F-16 | CONFIRMED (unique) | `types.ts` L14 vs `sessions.js` L13. | S3. See section 5: the "one source for the contract" entry (J17) is speculative; the real guard is dx's lint rule. |
| F-17 | CONFIRMED, DUP client B5 | `app-state.tsx` L47 single `error`; L86 and L102 write it from progress loads; `App.tsx` L59–71 `Gate` renders the boot error screen on any `error`. | client B3 (a stale stored profile id makes the 404 land before boot finishes, and `error` is never cleared) is the worse variant and is missing from the register. |
| F-18 | CONFIRMED, DUP client B29 | `Shell.tsx` L21–28: `await createProfile(trimmed)` with no `try`. | S3. |
| F-19 | CONFIRMED, DUP server P3 / dx §1.10 | `Dashboard.tsx` L80–82 "Seven stages … a third"; README L55 "a third"; `tracks.js` L89 onward `unlockAt: 0.35`. | Line is L80, not L81. Trivial. |
| F-20 | CONFIRMED, DUP client B28 | `api.ts` L73–81: `body` may be `null`; `body.data` throws `TypeError`. | client.md adds unencoded ids and the dropped `Headers` instance. |
| F-21 | CONFIRMED*, DUP server B8 | `index.js` L91–97 closes the HTTP server only. | Raise to S2: `-wal`/`-shm` files linger (server.md saw them in `server/data/`); the JSON store relies on its exit hook; the 5 s timeout exits 1 without closing anything. |
| F-22 | CONFIRMED, DUP server H2 | `index.js` L43 `credentials: true`; no cookies anywhere. | S3. server.md adds middleware order (`json` before `cors`). |
| F-23 | CONFIRMED, DUP dx §1.2–1.3 | No `.github/` directory. `check.js` L4 says "runs it in CI". | Also: README says "40 assertions"; there are 36–37 depending on how multi-line calls are counted. The plan's own B09 repeats "40". Fix both. |
| F-24 | CONFIRMED*, DUP server B7 | `progress.js` L143–155 steps by `DAY_MS`. | **Not "untested": it is wrong.** server.md reproduced skip (streak 2, expected 1) and double-count (4, expected 3) in `America/Los_Angeles`. Raise to S2 and reword. |
| F-25 | CONFIRMED*, unique | `schema.js` L12 module-level `seenIds`. | **The stated mechanism is wrong.** "Importing `schema.js` twice (tests, HMR) could throw" is false: an ES module is evaluated once per realm, and a re-evaluation creates a fresh `Set`. The real consequences are (a) `deck()` cannot be called twice with the same ids in one process, so a test fixture cannot rebuild the same question, and (b) `q()` is order-dependent. Walkthrough 06's sentence has the same error. |
| F-26 | CONFIRMED, DUP client B24 | `app-state.tsx` L193 `trackId: 'js' as const`. | client.md adds the consequence that matters: the zeroed record is also returned while progress is loading, so ModulePage flashes "0 of N mastered" for a mastered module. |
| F-27 | CONFIRMED*, DUP client B2/B8 | `Markdown.tsx` L21 italic regex; L67–71 unclosed fence runs to EOF. | **Incomplete.** It misses the Critical latent infinite loop (L95 table test fails, L155–163 paragraph loop rejects the first line, `i` never advances) and the *live* defect: bold containing inline code renders literal backticks, seven times in the primers. Both must be in the register. |
| F-28 | CONFIRMED (unique) | root and client `2.2.0`; server and content `1.0.0`. | Four manifests, not three. S3; belongs in the release checklist, not a journal entry. |
| F-29 | CONFIRMED, DUP server SE4 | `sessions.js` L154–159 vs `api.js` L174–179. | Also different code strings (`bad_request` vs `validation_failed`), which server.md standardises. |
| F-30 | CONFIRMED, DUP client B35 | `Dashboard.tsx` L70. | Trivial; fold into F-19 or drop. |

**Score: 27 CONFIRMED as written, 3 CONFIRMED with corrections (F-04, F-24, F-25), 0 WRONG, 22 DUP.** Nothing in the register is fabricated; the problem is priority and provenance.

### 1.1 Rows that must be added (present in the sibling audits, absent from the register)

| New id | Source | Sev | One line |
|---|---|---|---|
| M-01 | server B1, content-audit §5.1 | **S1** | The correct choice is index 1 for 363 of 389 mcq/output questions; choices are never shuffled. "Always press 2" scores 93%. Everything downstream (mastery, levels, stage unlock) is meaningless while this holds. **This is the finding of the whole audit and the register does not contain it.** |
| M-02 | server B3 | S1 | A malformed response (`"1"` for `1`) is graded wrong, recorded, scheduled as a lapse and reveals the key. `api.js` L114 rejects only `undefined`. |
| M-03 | server B4 | S1 | `store.js` L259–268 wraps both the import and `createSqliteStore` in one `try`, so a corrupt, locked or read-only `progress.db` silently boots an empty JSON store; the next healthy boot never reads it. The plan mentions this only as a question in walkthrough 05. |
| M-04 | server B5 | S2 | `app.listen(config.port)` binds `0.0.0.0`; anyone on the LAN can delete profiles and reset progress. ADR 0006 names the trigger; the register should name the bug. |
| M-05 | client B2 | S1 (latent) | Markdown renderer loops forever on a `|`-leading line that is not a table; freezes the tab mid-drill. |
| M-06 | client B3 | S2 | Stale localStorage profile id → 404 on `/progress` lands before boot resolves → `error` set and never cleared → permanent boot-error screen with a wrong message. |
| M-07 | client B4 | S2 | Global keydown handler steals Enter from nav links, the profile `<select>`, order-list buttons and the new-learner input; no modifier or `repeat` guard; autorepeat skips the explanation. |
| M-08 | server SE1/SE2 | S2 | Daily mix caps reviews at half and fills with unseen, so the review backlog grows without bound; due cards are shuffled rather than sorted by overdue; a module session can return 1 question when 12 were requested. |
| M-09 | server ST6 | S3 | The last profile can be deleted; the running app has no profile until restart. |
| M-10 | server H3 | S3 | SPA fallback regex matches `/api` and serves `index.html` for missing hashed assets. |
| M-11 | content-audit §1 | S1 | Eleven questions have a wrong or outdated key or explanation (`ts-basics-14`, `ts-shapes-14`, `js-modules-6`, `react-render-10`, `react-effects-11`, `node-express-4`, `js-objects-1`, `craft-git-7`, `craft-sec-2`, `web-api-3`, `net-aspnet-4`). Verified with `tsc`, Node and the changelogs. |
| M-12 | content-audit §5.2–5.3 | S2 | The key is the unique longest choice in 86% of single-answer questions; 15 of 17 booleans are `false`. |
| M-13 | client B8/B9 | S2 (live) | Bold-with-code renders backticks in seven primer passages; bash `--flag` is highlighted as a comment. |
| M-14 | client B16 | S2 | Progress refreshes only if the learner reaches the Summary; leave mid-drill and every dashboard number is stale until reload. |
| M-15 | dx §1.4, §1.5, §1.8 | S3 | `.env.example` is never loaded; `engines >=20` on an EOL runtime; `allowScripts` pinned to versions so the next `npm update` silently loses the native build (and the JSON fallback hides it). |
| M-16 | client B10/B11 | S2 | Inline code is `nowrap` (86 overflowing prompts at phone width); `--text-faint` is 2.9:1 in the light theme; the input focus ring is removed. |

### 1.2 Other claims in the plan that are wrong or need reconciling

- **§3.2 B09 and README: "`check.js` has 40 assertions".** 36–37. Say "the self-test" and never a number.
- **§4 J02: "tests use supertest".** server.md R1 explicitly avoids supertest: `createApp()` → `app.listen(0)` → built-in `fetch`. Follow the implementer.
- **§4 J06 and E03: "`PRAGMA user_version`".** server.md §5.1 uses a `schema_version` table with a backup before migrating and a refuse-on-newer rule. Follow the implementer; the exercise becomes "write migration N+1 using the runner that exists".
- **§4 J01: "move `check.js` assertions into a test runner *without changing them*".** dx.md §2 says do **not** port them one-for-one (`check.js` stays the production smoke test that runs under `npm ci --omit=dev`), and server.md §1.7 shows L69–73 pins bug B2. Porting "without changing them" would enshrine the bug in the new suite. Rewrite (section 5, T1).
- **§4 J20: "adding links to the markdown renderer".** No plan wants links; client.md §1.3 says the content uses none and recommends pinning the supported subset and rejecting the rest in `validateContent()`. The renderer entry is about termination (M-05) and bold-with-code (M-13). Links stay in ADR 0005's "revisit when".
- **§4 J22: "ESLint with a ratchet, per-directory rollout".** dx.md measured the baseline: the recommended rule set is nearly clean; the noise is Prettier line length, handled by one format commit plus `.git-blame-ignore-revs`. No ratchet is needed. The entry is about the one rule that matters (`no-restricted-imports` with `allowTypeImports` on `@jstrain/content`).
- **§4 J23: "run a Node version matrix and a job with `better-sqlite3` absent".** dx.md: no version matrix (`.nvmrc` is the single source), and the JSON backend is exercised in-process by the `describe.each` store suite, so an absent-binary CI job is redundant. Keep dx's `REQUIRE_SQLITE=1` guard instead.
- **§3.7 E04: "seed 200k attempts, time `GET /modules/:id`".** Attempts do not touch that endpoint's queries. Only `/progress` moves. Fix the premise or the exercise teaches a false lesson about measurement.
- **§3.5 walkthrough 06 and F-25:** the "importing twice throws" mechanism (see F-25 above).
- **§3.4 ADR 0013 / E14: "all three `package.json` files".** Four: root, content, server, client.
- **§2 conventions: "400–1200 words" and "first-person plural".** Changed in section 4.
- **§1 journal naming `YYYY-MM-DD-slug.md`.** Four agents landing on the same day produce an unsortable, collision-prone folder. Use `Jnn-slug.md` with the numbers assigned in section 5; the date is a field.
- **§0 references to `marketplace/_learning/`.** The folder exists; the critique stands. Fine.

---

## 2. Structure verdict

### 2.1 Is the layout right?

Yes in shape, no in volume. Concept-organised walkthroughs, a numbered ADR set, a journal with an index, real template files: keep all of that. The following are wrong or over-built:

- **`10-findings-register.md` must not restate evidence.** Twenty-two rows duplicate work that the four audits did better, with reproductions. Make it a pointer index: `id · source (plan § / finding id) · one-line symptom · owner entry · status`. Fifty rows, ~800 words. The evidence lives in the audits.
- **The audits must be committed.** They live in a temp scratchpad. Copy `server.md`, `client.md`, `content-audit.md`, `dx.md`, `content-expansion.md` verbatim into `upskilling/_audits/2026-09-23-<name>.md` with a one-line header ("read at `6f1bf43`, planning only"). Otherwise every "Closes server B4" link points at nothing in six weeks. This is the single most important structural change.
- **The journal is not the one-pass problem; the retro material is.** Journal entries are written by the implementing agents as changes land, so their cost is spread. ADRs, walkthroughs, the ladder, the reading guide, exercises, glossary, review guide and checklists are the one-pass load. Budget those.
- **Generic files get cut to their repo-specific core.** `06-code-review-guide.md`: keep the repo red-flag list and the three-way worked review of the `/answers` hunk; drop the comment taxonomy (Conventional Comments exists; link it). `07-senior-checklists.md`: keep only items that name a file or command in this repo. `08-glossary.md`: 20 terms, each with the file *and* the journal entry where it bites; a term with no entry is cut. `09-further-reading.md`: 10 items, stub allowed.

### 2.2 Size estimate (words of finished prose, code excluded)

| File / group | Plan as drawn | Verdict |
|---|---|---|
| README | 900 | write, 800 |
| 00-ladder (27 behaviours) | 3,000 | write, 16 behaviours, 1,800 |
| 01-reading (12 stops) | 1,800 | write, 1,500 |
| ADRs (13 × 600 + index) | 8,100 | write 13 retro at ≤400 each = 5,200 + index 300; refactor-born ADRs written by entry owners |
| Walkthroughs (10 × 1,200 + index) | 12,200 | write 4 now (01, 02, 04, 06) + 1 after the drill rewrite (09) = 6,000; stub 5 at ~150 each |
| Journal (26 × 700 + README + INDEX) | 18,700 | ~24 full + ~6 short-form, written by owners as changes land (~16,000 spread over the refactor) |
| Exercises (14 × 450 + README) | 6,550 | 8 exercises, 3 now + 5 after their dependencies land, ~3,000 |
| Review guide | 1,200 | 700 |
| Checklists | 900 | 500 |
| Glossary (35) | 2,100 | 20 terms, 1,200 |
| Further reading (15) | 750 | stub, 10 items, 300 |
| Findings register | 1,200 | pointer index, 800 |
| Templates | 1,200 | 1,000 |
| **Total** | **~58,000** | **~21,000 in this pass** + journal as it lands |

### 2.3 Decisions

**Ladder: 16 behaviours, not 27.** The 27 overlap (B01/B15/B21 are all "verify prose against code"; B04/B07 are "atomic and replayable"; B09/B10/B13 are "make it testable"; B05/B06/B25 are "measure"). B18 and B27 are generic. Final list, each row keeps the plan's junior/mid/senior columns, one repo example with anchor, and the journal entry that exercises it:

| Id | Behaviour | Repo example (from the plan, merged) |
|---|---|---|
| B01 | Verifies prose (README, comments, UI copy) against the code | "two spaced correct answers" vs `srs.js`; "a third" vs `0.35`; "40 assertions" vs 36; `check.js` "runs in CI" |
| B02 | Names the invariant and finds where it is enforced | `publicQuestion()` + `check.js` L43–44, L118; `GET /modules/:id` relies on it and is untested |
| B03 | Separates a bug from a decision, and writes the decision down | JSON fallback = decision (ADR 0003); no transaction = bug; fallback-on-corrupt = a bug inside a decision |
| B04 | Treats identifiers and persisted shapes as contracts | `question_id` with no FK to content; `IF NOT EXISTS` is not a migration |
| B05 | Makes multi-step writes atomic and designs for replay | `/answers` two writes; no idempotency; the honest severity of each |
| B06 | Validates at trust boundaries and never casts through them | `body.data as T`; `mode` validated but not `limit`; `"1"` graded as a lapse |
| B07 | Knows where derived state stops being true | XP over 365 days; accuracy over orphaned states |
| B08 | Measures before optimising and reports the null result | the N+1 that is 14 PK lookups; the year replay that matters; the unused index |
| B09 | Pins behaviour before changing it, and notices when an existing test pins a bug | `check.js` L69–73 |
| B10 | Makes time and randomness injectable; tests the fallback path | `now` injected, `Math.random` not; no way to force the JSON store |
| B11 | Derives fetch identity from URL and state; recognises the bug class | "Another round"; the effect that no URL change subscribes to |
| B12 | Separates boot failure from background failure | one `error` state; the stale profile id |
| B13 | Treats accessibility as correctness | order-list focus loss; the global Enter handler; contrast numbers |
| B14 | Knows when a home-grown thing is cheaper than a dependency, and when it stops being | `Markdown.tsx`/`Code.tsx`; the infinite loop |
| B15 | Sizes security to the threat model and writes the boundary down | `x-profile-id` on loopback vs `0.0.0.0` |
| B16 | Owns the lifecycle of what it opens | shutdown without `store.close()`; the exit hook |

**ADRs: 13 retro-documented at ≤400 words each, plus five born from the refactor, written by the entry that makes the decision.** All 13 are real decisions with code evidence, so none is cut, but the retro ones are short: Context, Decision, Evidence, Consequences, Breaks-first-at, Revisit-when. The effort goes into the five the refactor creates: 0014 choice ids are the answer contract (S6), 0015 an early answer is practice (S5), 0016 vitest at the root, `check.js` stays the smoke test (T1, supersedes 0012), 0017 schema versions and migrations (S13), 0018 fall back only when the binary is missing (S12, amends 0003). 0004 (XP derived) is amended by S8, 0009 by S5.

**Exercises: 8, not 14.** Six of the plan's exercises are things the refactor itself does (E06 spacing RFC → S5; E09 property tests → server §3.2 #6–7; E10 duplicate card → S2; E11 both backends → S14; E12 a11y audit → client.md already did it; E13 content-doubling plan → `content-expansion.md` exists). An exercise whose answer is a merged commit is dead on arrival. Final: E01 trace an answer, E02 add a question type, E03 write migration N+1, E04 measure `/progress` and `/modules/:id` (premise fixed), E05 review the planted diff, E06 postmortem "accuracy 104%", E07 design the multi-user version, E08 cut a release (absorbs the versions reconciliation and the keyboard walkthrough).

**Walkthroughs describe the code at the end of the refactor, so most are written last.** Four can be written now because their subject changes little in shape (01 request lifecycle, 02 SRS, 04 progress, 06 content pipeline) with an "after the refactor" addendum; 09 (drill) is written after C6 lands; 03, 05, 07, 08, 10 are stubs: the contract, the read-order, and a TODO naming the entry that will change them.

**Journal filenames are numbered.** `Jnn-slug.md`, numbers assigned in section 5 so parallel agents do not collide, date as a field.

**Anything that would read the same in another repo is cut.** That is checklist item 10 and it applies to the plan's own seed prose: the review-comment taxonomy, "ships in small steps", the generic PR checklist items.

---

## 3. Templates (final form)

### 3.1 `_templates/journal-entry.md`

```markdown
# <Imperative title: what changed, e.g. "Record the card and the attempt in one transaction">

Date YYYY-MM-DD · Author <name> · Area server | client | content | tooling · Commit <sha> (baseline 6f1bf43)
Closes <register ids> · Ladder <B-ids> · ADRs <0003 unchanged | 0004 amended | 0012 superseded by 0016>

## Symptom
What a learner or operator sees. Then how to see it yourself at the baseline: a command,
a curl or a click path, with the observed output and the expected output.

## Root cause
The quoted lines that are wrong, as `path › symbol (Lx–y @ sha)` above a fenced block.
Then one paragraph on why: the invariant this breaks, phrased so a test could assert it.

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | | |
| B | | | |
| C | | | chosen |
"Do nothing" is always row A and gets a real argument, not a straw man.

## Decision and trade-off
What was chosen and what it gives up, one paragraph. End with the trigger that would
make us revisit it ("if attempts per profile pass ~1M", "the first second concurrent user").

## The change
A prose diff summary: files, functions, roughly how many lines. Then the load-bearing
lines only, before and after, each block ≤ 15 lines, taken from `git show <sha>`.

## Verification
1. The test that fails at the baseline and passes after: file, test name, and the
   assertion message from the baseline run. If no test is possible, the reproduction
   script and its output before and after.
2. The gate: `npm run check` → `All checks passed.` (or `npm run check:all`).
3. The manual step, if the change is visible.

## What a senior reviewer would ask
Three questions the diff alone does not answer, each with its one-line answer.

## The junior version of this fix
What the first attempt looks like (code or one specific move), why it passes review at
a glance, and what it gets wrong. About this change, not about juniors in general.

## Follow-ups
- [ ] <what was deliberately left out> → <register id or new entry slug>
```

Short-form allowance: a fix under ~30 lines that closes one S3 row may use only Symptom, Root cause, Verification, ≤300 words. It still needs the anchor and the failing-then-passing test.

### 3.2 `_templates/adr.md`

```markdown
# ADR-NNNN: <The decision as a statement, e.g. "Grade on the server; never ship the key">

Status: accepted | amended by ADR-MMMM | superseded by ADR-MMMM · Date YYYY-MM-DD
Retro-documented from <sha> (omit if written at decision time)
Anchors: `path › symbol (Lx–y @ sha)`, …

## Context
The forces, stated as facts about this product: one local learner, Node, Windows dev
machines, a native module that may not load, a curriculum that is data. Three to six sentences.

## Decision
"We …" — one paragraph, active voice.

## Evidence
Two or three quoted snippets that implement it, and the test or check that enforces it.
If nothing enforces it, write "not enforced" and the register id.

## Consequences
- Good:
- Cost:
- Forces on future work:

## Alternatives rejected
Each with one line on why it lost *here*.

## Breaks first at
Which axis breaks this decision (learners per install, attempts per learner, questions,
contributors), what breaks, and what replaces it.

## Revisit when
Observable triggers only.
```

### 3.3 `_templates/walkthrough.md`

```markdown
# Walkthrough NN: <subsystem>

Files: `…` · As of: <sha> · Time: ~N min · Read first: walkthrough NN

## The job in one sentence

## The contract
Inputs, outputs, invariants. Each invariant phrased so a test could assert it.

## Read it in this order
1. `path › symbol` — why start here.

## The lines worth stopping at
For each: the quoted lines; what they do; why they are written that way; what breaks if
you change them. Skip anything a mid-level reader sees unaided.

## Observe it
Numbered. Each ends with a REPL snippet, a test name, or a curl and its output.

## What is still wrong here
Register ids, one line each. No new evidence here; it lives in the register's source.

## Do it
Three prompts of 5–20 minutes. The last one changes code and proves the change.

## Check yourself
Five questions. Answers inside a `<details>` block.
```

### 3.4 `_templates/exercise.md`

```markdown
# E<NN>: <title>

Level: mid → senior | senior · Timebox: <45 min | 2 h | half a day> · Touches: server | client | content | tooling
Ladder: <B-ids> · Depends on: <entries or ADRs that must exist>

## Scenario
One paragraph, realistic, with a symptom someone reported.

## Deliverables
Numbered: code, a test, a written artefact (RFC, postmortem, review comments).

## Constraints
What may not change. Backward-compatibility requirements.

## Starting points
Anchors only. Do not give away the answer.

## Done when
Commands that must pass and artefacts that must exist.

## Stretch
One extension that forces a trade-off.

<details><summary>Reviewer notes (open after attempting)</summary>
What a strong answer contains; the common junior mistake; what a senior also flags.
</details>
```

---

## 4. Voice and audience

**Audience.** A developer with one to three years of experience who can read this codebase but has not yet made decisions in it. They know what a transaction is; they do not know when its absence matters. Every glossary term links on first use; nothing is explained twice.

**Voice, by file type.**
- **Journal entries: first person singular, "I".** The plan says "we". Push back: "we" hides who decided and lets an agent write "we considered" when nothing was considered. An entry is one engineer's account of one change; a junior reading it should see a person reasoning, choosing and being wrong about severity. Past tense for what was done ("I replaced the two calls with `recordAnswer()`"), present tense for the code as it is now ("`schedule()` never reads `dueAt`").
- **README, ladder, reading guide, walkthroughs, exercises, review guide: second person, "you".** Instructional; the reader is doing something.
- **ADRs: "we" only in the Decision paragraph** (the team decides); everything else is declarative.
- **Findings register and INDEX: no pronouns.** Tables.

**Reading level.** Plain sentences, one idea each. No "leverage", "robust", "best practice", "might want to consider". Opinions are allowed and labelled: "Opinion: the ease cap is unnecessary." Facts carry an anchor.

**Length limits (prose, code excluded).**
- Journal entry: 400–900 words, hard cap 1,000. Short-form ≤300 (section 3.1).
- ADR: 300–500.
- Walkthrough: 800–1,500.
- Exercise: 250–450.
- Ladder row: ≤120 words across the three level columns plus example.

**How much code to quote.**
- Quote, never paraphrase. Every quoted block is prefixed `path › symbol (Lx–y @ sha)`.
- Per journal entry: at most 40 lines of code in total; each block ≤15 lines; before/after shows only the lines that change plus one line of context each side.
- Before/after comes from `git show <sha>`, not from memory. Checklist item 6 checks it.
- Walkthroughs quote only the lines they stop at, never a whole function.
- Test names are quoted verbatim, including the file path.

---

## 5. Journal entry plan (reconciled)

### 5.1 What changed against the plan's 26 entries

- **Dropped or merged:** J01 (rewritten as T1: the port pins a bug), J02+J03 (merged into S1; supertest removed), J13 (server half folds into S5, client half into C6), J17 (speculative; the real guard is dx's lint rule, in T4; types follow the contract in S6), J20 (wrong direction; becomes C2 Markdown termination), J21 (one entry cannot carry 578 questions; split into K3, K4, K5), J22 (no ratchet; becomes T4), J26 (a line in the release checklist, E08).
- **Added from the sibling plans:** S4 malformed vs wrong, S6 shuffle and choice ids (the flagship), S10 streaks across DST, S11 daily mix starvation, S12 fallback only on missing binary, S15 operability (loopback, shutdown, `.env`), C1 the stolen Enter key, C5 routes and scroll, K1 eleven wrong answers, K2 position-referencing `why` texts, K3 the `after` gate, T2 line endings and Node.
- **Reframed:** J08 → S16 (the N+1 that did not matter), J15 → C3 as the hotfix with C6 as the proper fix (two entries on purpose: hotfix-then-fix is a senior pattern worth showing).
- **Ordering rule:** tooling foundations first (nothing changes behaviour until it is pinned), then server correctness in dependency order, then client hotfixes, client foundations, the drill rewrite, then content, then features. That order is also the reading order in INDEX.md.

### 5.2 The final list (INDEX order)

Owner key: **T** tooling (dx), **S** server, **C** client, **K** content. "Full" = section 3.1 template; "short" = short-form.

| # | Title | Brief | Owner | Form |
|---|---|---|---|---|
| J01 | Pin what is true before changing it | Root vitest with three projects (dx §2), the first six tests; `check.js` stays the production smoke test with `REQUIRE_SQLITE`. The honest twist: `check.js` L69–73 asserts a bug (B2), so it is marked, not ported. New ADR 0016 supersedes 0012. Closes F-23 (partial). | T | full |
| J02 | Line endings, the Node floor and the scripts npm is about to block | `.gitattributes`/`.editorconfig` with the renormalise step for Windows clones, `.nvmrc`/`engines`, name-only `allowScripts`. Why the JSON fallback would hide a lost native build. Closes M-15. | T | full |
| J03 | Rules before content: `lint.js`, `stats.js`, and four `output` questions with no code | The lint thresholds and why they are set where they are (dx §0 numbers); the four retypes; `content:stats`. Precondition for K5. | T | full |
| J04 | ESLint, Prettier, and the one rule that matters | Recommended sets only; one format commit with `.git-blame-ignore-revs`; `no-restricted-imports` + `allowTypeImports` on `@jstrain/content` and the bundle leak it prevents. Closes F-16 (the guard, not the duplication). | T | full |
| J05 | CI that runs what we ship | dx §3.7: Windows + Ubuntu, no Node matrix, `REQUIRE_SQLITE=1`, drills separately cached. What each step costs. Closes F-23. | T | short |
| J06 | `createApp()` apart from `listen()`, and an injectable clock | server R1+R2; `fetch` on port 0 instead of supertest; removing bare `new Date()` from routes and store. Closes F-09 (half). | S | full |
| J07 | Injecting randomness and the duplicate card in the daily mix | Seeded `random` parameter; the failing test; one shuffle. Closes F-05, F-09. | S | full |
| J08 | `recordAnswer()`: the card and the attempt in one transaction | The seed example entry. `db.transaction()`, both backends, a stubbed `insertAttempt` failure. **Honest severity: S3.** Closes F-02, F-03. | S | full |
| J09 | Malformed is not wrong: `400 invalid_response` | `grade()` returns `{valid:false}` for shape errors; nothing stored, nothing revealed; `order` with non-integers. Closes M-02. | S | full |
| J10 | What "spaced" means: an early correct answer is practice | server B2: `wasDue`, the `outcome` field, `check.js` assertion fixed to two days apart, README copy now true. Replay of a POST becomes practice. Amends ADR 0009 → new ADR 0015. Closes F-01, F-07 (server half). | S | full |
| J11 | Rewriting the `why` texts that name a position | content-audit §5.1 second bullet: "Option 3…", "the first four…". Must land before J12. Closes part of M-01. | K | short |
| J12 | Shuffle the choices, grade by choice id | The flagship. server B1: shuffle on every serve, accept choice ids and authored indices, ship the client change in the same commit, the 50% tripwire test that fails today. New ADR 0014. Client types updated here. Closes M-01. | S (+C) | full |
| J13 | Validate at the boundary and tell the truth in error codes | server R3 `validate.js`, H1 body-parser mapping, SE3 `limit`, SE4 `bad_request` removed, H4. Closes F-14, F-29. | S | full |
| J14 | XP that decreases after a year | server B6: SQL window function + JS loop with a parity test; 365-day window kept for the heatmap only. Amends ADR 0004. Closes F-08. | S | full |
| J15 | Accuracy over 100%: orphaned states and ids as a contract | server P1 fix; an id-stability check (committed id list or CI diff) before the content doubling. Closes F-10; grounds E06. | S | full |
| J16 | Streaks across DST | server B7: calendar-day stepping from local noon; tests under `TZ=America/Los_Angeles`. Closes F-24. | S | full |
| J17 | The daily mix starves reviews | server SE1/SE2: due first sorted by `dueAt`, a new-card reserve, module top-up with `reason`. Closes M-08. | S | full |
| J18 | Fall back only when the binary is missing | server B4: split the `try`; close the failed handle; `storeFallbackReason` on `/health`. New ADR 0018 amends 0003. Closes M-03. | S | full |
| J19 | A schema version and the first migration | server §5.1: `schema_version` table, backup before migrate, refuse newer, drop `idx_card_states_due`, JSON `schemaVersion`. New ADR 0017. Closes F-06, F-11. | S | full |
| J20 | One contract suite, two backends | `makeStores()` + `describe.each`; atomic JSON writes (tmp + rename + `.bak`); exit-hook removal; `getProfile` copy. Closes F-13. | S | full |
| J21 | Operability: loopback, shutdown, `.env` | server B5 `HOST=127.0.0.1` + Vite proxy target, B8 shutdown closing the store with `SIGBREAK`, H5 config parsing, dx §1.4 `loadEnvFile` and `DATA_DIR` resolution. ADR 0006 amended with the trigger. Closes F-21, F-22, M-04, M-15 (part). | S | full |
| J22 | Measuring before optimising: the N+1 that did not matter | ST5/H6/P4 with real numbers: 14 PK lookups vs a year of attempts replayed; what was left alone and why. Closes F-04. | S | short |
| J23 | Hotfix: "Another round" and the URL nobody subscribed to | client B1 quick fix (location-keyed page + scope-preserving link) with the bug class named; the proper fix is J29. Closes F-12. | C | full |
| J24 | The Markdown renderer terminates, and bold can contain code | client B2 loop invariant, B8 recursion, pinned subset with tests 1–9, `validateContent()` rejects the rest. Links stay out (ADR 0005 unchanged). Closes F-27, M-05, M-13 (part). | C | full |
| J25 | The stolen Enter key | client B4: target/modifier/repeat guards, `<form onSubmit>`, `useEffectEvent`. The bug class: global listeners. Closes M-07. | C | full |
| J26 | Small fixes from the first client PR | B9 bash `--flag`, B10 nowrap, B27 scroll restoration, B30 theme flash. One short entry, four sections. Closes M-13 (rest), M-16 (part). | C | short |
| J27 | The API client stops trusting the envelope | client A2: `bad_response`, `network`, `AbortSignal`, encoded ids, `Headers` typing. Closes F-20. | C | full |
| J28 | Boot errors are not background errors, and the stale profile id | client B3, B5, A6, A7: `bootError` vs progress status, progress after boot, 404 = forget the profile, `useResource` (A1) as the mechanism. Closes F-17, F-18, F-26, M-06. | C | full |
| J29 | Routes: a layout route, errors inside the shell, titles | client A4, B25, B26, B34 titles. | C | short |
| J30 | The drill as a state machine | client A3: reducer with `round`, submit guard (closes F-07 client half), `parseDrillParams`/`drillHref` (A5), the transition table, reducer tests 16–20. Supersedes J23's hotfix. | C | full |
| J31 | Order questions a keyboard user can reorder | client B7: stable keys, focus retention, correct order revealed, non-identity shuffle. Closes F-15. | C | full |
| J32 | Progress refreshes when it should, and milestone toasts | client B16 + P2: refresh from the event path, not the Summary effect. Closes M-14. | C | short |
| J33 | Eleven wrong answers and how we found them | content-audit §1: `tsc --strict`, Node 24, the React 19 and TS 5.2 changelogs. The senior move is verifying a claim against the tool, not the memory. Closes M-11. | K | full |
| J34 | The longest choice is the answer | content-audit §5.2–5.3: distractor rewriting by module, boolean rebalancing, the type-mix policy. Closes M-12. | K | full |
| J35 | The stage gate: `after`, and splitting C# from .NET | content-expansion §5: the `after` field in `progress.js` and `validateContent()`, stages 6–7 restructured, why learner history survives (nothing stores stage ids). | K (+S) | full |
| J36 | Stages 9 and 10: what "senior" content is, and what we refused | content-expansion §2 rejected list, the d3 and `ask` policies, the type-mix target. One entry, not one per module. | K | full |
| J37 | Doubling the deck without renaming an id | Batches by track, id prefixes that differ from module ids, thresholds moved from `check.js` L35 and README to derived values, `estMinutes` bumps. Closes F-19. | K | full |
| J38+ | Feature entries, required by the journal rule when built | Flags (server F2 / client P10), settings (F4 / P12), export/import (F3 / P15), question history (F1 / P4). Each changes a persisted shape or the API, so each gets a full entry. | S/C | full, conditional |

Required at the end of the refactor: J01–J37 for every change that actually lands. An entry is written in the same PR as its change; a PR that triggers the journal rule and has no entry is not merged.

---

## 6. Quality checklist (final, 15 items)

A reviewer answers each with yes/no and returns one verdict: **accept**, **revise** (list the failed numbers), or **reject** (wrong or not grounded).

1. Every claim about code carries `path › symbol (Lx–y @ sha)` and the quoted lines, and the quote matches `git show <sha>:<path>`.
2. The Symptom is observable and reproducible at the stated commit with a command or click path, with observed and expected output.
3. The Root cause names the invariant that is broken, phrased so a test could assert it.
4. The Options table has at least three rows including "Do nothing", and the "Do nothing" argument is real.
5. The Decision states what was given up and a concrete revisit trigger.
6. Before/after snippets come from the actual commit diff, each ≤15 lines, ≤40 lines of code in the entry.
7. Verification names a test that fails at the baseline and passes after (file, test name, baseline failure message), or a reproduction script with output before and after. The reviewer ran at least one command.
8. "What a senior would ask" has three questions not answerable from the diff alone, each answered.
9. "The junior version" is concrete about this change (code or a specific move), not a generalisation about juniors.
10. Nothing in the entry could be pasted into another repository unchanged.
11. Nothing re-teaches syntax that `content/modules` or `jstrain/` covers; it links to the module instead.
12. Register rows are marked closed, the INDEX row exists, and any ADR whose decision changed is amended or superseded in the same commit.
13. 400–900 words excluding code (short-form ≤300 and only for a <30-line fix); no hedging where a decision was made; no emojis, marketing tone or filler.
14. Voice: "I" in the journal, "you" in guides, "we" only in an ADR Decision; present tense for the code as it is, past tense for what was done.
15. Severity is honest: the entry claims no more impact than its evidence shows (F-02's window is a hard kill between two synchronous statements; F-04 is 14 PK lookups).

---

## 7. Final folder tree

`[write]` = written in this pass · `[owner]` = written by the journal entry's owner as the change lands · `[after Jnn]` = written after that entry lands · `[stub]` = contract/read-order/TODO only, ≤150 words · `[copy]` = verbatim.

```
upskilling/
├── README.md                                   [write] 800   What this is and is not; 30/60/90 path; how to add an entry (5 steps); anchoring; voice; the quality bar
├── 00-ladder.md                                [write] 1,800 16 behaviours in 6 themes; junior/mid/senior columns; one anchored repo example; the entry that exercises it
├── 01-reading-the-codebase.md                  [write] 1,500 12 stops; written questions + a prove-it command each; line refs refreshed after the refactor
├── 02-adrs/
│   ├── README.md                               [write] 300   Index: number, title, status, date, amended/superseded-by
│   ├── 0001-one-copy-of-content-as-plain-esm.md          [write] ≤400  Cost: client can import keys; nothing enforces types-only until J04
│   ├── 0002-grade-on-the-server-never-ship-the-key.md    [write] ≤400  Amended by 0014 (choice ids)
│   ├── 0003-sqlite-with-json-fallback.md                 [write] ≤400  Amended by 0018
│   ├── 0004-xp-and-level-are-derived.md                  [write] ≤400  Amended by J14
│   ├── 0005-markdown-to-react-elements.md                [write] ≤400  Revisit when: first link in content
│   ├── 0006-profile-as-a-header-not-auth.md              [write] ≤400  Trigger written down: any bind beyond loopback (J21)
│   ├── 0007-envelope-and-one-error-translator.md         [write] ≤400  Defects F-14/F-20 linked, fixed by J13/J27
│   ├── 0008-content-validates-at-import-and-boot.md      [write] ≤400  Cost: global seenIds (F-25, corrected mechanism)
│   ├── 0009-trimmed-sm2-mastery-is-two-reps.md           [write] ≤400  Amended by 0015
│   ├── 0010-react-context-for-app-state.md               [write] ≤400
│   ├── 0011-same-origin-everywhere.md                    [write] ≤400  Opinion labelled: CORS_ORIGINS is nearly dead code
│   ├── 0012-dependency-free-self-test.md                 [write] ≤400  Superseded by 0016; the worked example of superseding
│   ├── 0013-npm-workspaces-jstrain-outside.md            [write] ≤400  Four manifests, not three
│   ├── 0014-choice-ids-are-the-answer-contract.md        [owner J12] 500
│   ├── 0015-an-early-correct-answer-is-practice.md       [owner J10] 500
│   ├── 0016-vitest-at-the-root-check-js-stays-smoke.md   [owner J01] 500
│   ├── 0017-schema-versions-and-migrations.md            [owner J19] 500
│   └── 0018-fall-back-only-when-the-binary-is-missing.md [owner J18] 500
├── 03-walkthroughs/
│   ├── README.md                               [write] 200   Order; which ladder behaviour each serves
│   ├── 01-request-lifecycle.md                 [write] 1,200 api.ts request → proxy → json → cors → router → requireProfile → handler → envelope; failure path; addendum after J06/J13
│   ├── 02-srs-scheduler.md                     [write] 1,200 The 11 behaviours from the plan; addendum after J10 (practice outcome)
│   ├── 03-session-picker.md                    [stub]        Contract + read order; TODO after J07/J17
│   ├── 04-progress-derivation.md               [write] 1,200 Mastery, unlock, XP replay, streak; addendum after J14/J15/J16
│   ├── 05-store-abstraction.md                 [stub]        TODO after J18/J19/J20 (divergence table becomes the contract suite)
│   ├── 06-content-pipeline.md                  [write] 1,000 q()/deck()/index maps/validateContent/publicQuestion; seenIds with the corrected mechanism; addendum after J03/J12
│   ├── 07-api-client-and-envelope.md           [stub]        TODO after J27
│   ├── 08-app-state-and-boot.md                [stub]        TODO after J28
│   ├── 09-drill-state-machine.md               [after J30] 1,200  The reducer, the transition table, the hotfix-then-fix story
│   └── 10-markdown-and-highlighter.md          [stub]        TODO after J24/J26
├── 04-journal/
│   ├── README.md                               [write] 500   When an entry is required; Jnn-slug naming; short-form rule; immutable after merge except "Update:" addenda; review gate
│   ├── INDEX.md                                [write, maintained]  #, title, area, closes, ladder, ADRs, commit, date — in J-number order
│   └── Jnn-<slug>.md                           [owner]  400–900 each, J01–J37 per section 5.2; J08 is written first as the seed example
├── 05-exercises/
│   ├── README.md                               [write] 250   Timebox, no peeking, what "done" means
│   ├── E01-trace-an-answer-end-to-end.md       [write] 350
│   ├── E02-add-a-question-type.md              [after J30] 450  Uses the choice-id contract
│   ├── E03-write-migration-n-plus-1.md         [after J19] 400  Uses the runner that exists
│   ├── E04-measure-progress-and-module.md      [after J14] 400  Premise fixed: attempts move /progress only
│   ├── E05-review-this-diff.md                 [write] 450   Planted diff inline (XP column + dangerouslySetInnerHTML links + unrelated reformat)
│   ├── E06-postmortem-accuracy-104.md          [after J15] 400
│   ├── E07-design-the-multi-user-version.md    [write] 400   RFC using the ADR "breaks first at" sections
│   └── E08-cut-a-release.md                    [after J05] 350  Absorbs versions reconciliation and the keyboard walkthrough
├── 06-code-review-guide.md                     [write] 700   Order of attention; the repo red-flag list with file names; the three-way review of the /answers hunk; reviewing agent PRs
├── 07-checklists.md                            [write] 500   PR, release, content-change; repo-specific items only
├── 08-glossary.md                              [write] 1,200 20 terms; file that shows it; entry where it bites; the common misreading
├── 09-further-reading.md                       [stub] 300    10 items; why it matters here; which entry uses it
├── 10-findings-register.md                     [write] 800   Pointer index: id · source (audit § / finding id) · one-line symptom · sev · owner entry · status. F-01..F-30 (corrected) + M-01..M-16
├── _audits/                                    [copy]        Evidence, frozen
│   ├── 2026-09-23-server.md
│   ├── 2026-09-23-client.md
│   ├── 2026-09-23-content-audit.md
│   ├── 2026-09-23-dx.md
│   └── 2026-09-23-content-expansion.md
├── _templates/
│   ├── journal-entry.md                        [write]  §3.1
│   ├── adr.md                                  [write]  §3.2
│   ├── walkthrough.md                          [write]  §3.3
│   └── exercise.md                             [write]  §3.4
└── _tools/
    └── check-anchors.mjs                       [stub, optional]  For every `path › symbol @ sha`: `git show sha:path` contains symbol; every INDEX row points at a file
```

Build order for this pass: `_audits/` copy → `_templates/` → `README.md` → `10-findings-register.md` (corrected, with M-rows) → `04-journal/README.md` + `INDEX.md` → J08 seed entry → `00-ladder.md` → `01-reading-the-codebase.md` → ADRs 0001–0013 → walkthroughs 01, 02, 04, 06 + five stubs → E01, E05, E07 → review guide, checklists, glossary → further-reading stub. Everything marked `[owner]` or `[after Jnn]` is written when its change lands, in the same PR.
