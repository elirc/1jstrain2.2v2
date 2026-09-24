> **Frozen review, pre-refactor. Do not edit.** Checked against commit `6f1bf43`; planning only.
> Produced on 2026-09-23 by a Fable agent as an adversarial review of the Opus agent's `content-expansion` plan.
> Its corrections take precedence over the audit it reviews; the upskilling review is the spec this folder was built from.
> Line numbers are as of `6f1bf43`.
> Copied verbatim below this header.

# Content expansion — adversarial review and the version to execute

Reviewer stance: staff engineer + hiring manager for full-stack JS/TS/React/Node + C#/.NET roles. Everything below was checked against the repo (`content/`, `server/src/progress.js`, `server/src/grade.js`, `server/src/sessions.js`, `client/src/pages/DrillPage.tsx`, `client/src/components/Markdown.tsx`, `client/src/components/Code.tsx`, `client/src/pages/LabsPage.tsx`) and against every existing prompt (dumped to `scratchpad/existing-prompts.tsv`; sweep results in `scratchpad/sweep.out` and `sweep2.out`; collision script `scratchpad/collide.mjs`). No project file was modified.

**Headline:** the plan is good and executable with corrections. Verdict in one paragraph: keep the 10-stage shape; keep all 20 proposed modules; add two the plan missed (`web-css`, `craft-cloud`); add seven single questions for topics a hiring manager will ask about (i18n, monorepos, TS on Node, testing React, GraphQL vs REST, feature-flag hygiene, GDPR); replace 34 flagged intents; fix a systemic boolean skew (84% of proposed booleans are false); fix a systemic answer-index skew in the *existing* content (363 of 389 mcq/output answers sit at index 1 and the client never shuffles); go from 10 to 12 authors with strictly disjoint files. Final scale: **53 modules, 1,047 questions (+613), 10 stages, 12 authors.**

---

## 1. Structural verdicts

### D1. Ten stages: yes. Keep the C#/.NET split and both senior stages.
- Stage 6 "C#, the language" (4 modules, 84 q) and stage 7 "ASP.NET Core and EF Core" (5 modules, 100 q) are each the size of today's biggest stage. One 10-module stage would make the 35% gate a wall. Split stands.
- Stage 9 "Run it in production" is the strongest part of the plan; every module in it is something a mid+ candidate gets asked (isolation levels, queues, SLOs, SSRF, caching). Keep.
- Stage 10 "Toward senior" is the weakest as *quiz* material — several intents reduce to "pick the answer that sounds most senior". It still earns its place because the `ask` field is exactly the right vehicle for "what the strong answer sounds like", and senior interviews really do ask these. Decision: keep all four modules, but `craft-review` loses its trivia (SBI model, "why small PRs" stays but the short-answer vocabulary items are capped at one) — see §2. Do not add a `senior` badge or a d:4; stage placement is the signal, as the plan says.

### D2. Scale: 12 authors, not 10, and nobody above ~76 questions.
The plan's 10-way split gives the web author 58 questions + 2 primers and craft-core 64 + 2 primers + 4 primer extensions; adding `web-css` and `craft-cloud` (D6) would push those to 72/3 and 78/3, which is where quality drops. Final split (§6): js 76, ts 38, react 75, node 61, web-platform 36, web-http 37, data 52, csharp 42, dotnet 58, craft-core 51, craft-ops 43, craft-senior 44. Every author owns files nobody else touches (§6, step 0).

### D3. The stage-gating fix (§5) is sound. Ship the `after` field, not the `unlockAt: 0` fallback.
`progress.js` computes `previousMastery` in list order and checks `previousMastery >= stage.unlockAt || seen > 0`. Because `stageStats` is pushed in list order and `after` must point to an *earlier* stage, the fix is a lookup instead of a running variable:

```js
const byStageId = new Map();
for (const stage of curriculum.stages) {
  // ...compute total/mastered/seen/due/mastery as today...
  const gate = stage.after ? byStageId.get(stage.after) : stageStats.at(-1);
  const gateMastery = gate ? gate.mastery : 1;          // stage 1 has no gate
  const stat = { stageId: stage.id, total, seen, mastered, due, mastery,
                 unlocked: gateMastery >= stage.unlockAt || seen > 0 };
  stageStats.push(stat);
  byStageId.set(stage.id, stat);
}
```
Plus: `after?: string` on `Stage` in `content/types.d.ts` and the client `Stage` type in `client/src/lib/types.ts`; `validateContent()` checks `after` names a stage that appears *earlier* in the list; `stage-8.after = 'stage-5'`. `server/src/check.js` lines 88–89 (stage 1 unlocked, stage 2 locked) still hold. Add one assertion: "stage-8 unlocks when stage-5 is at 35% even if stage-7 is at 0". The README line "A stage unlocks once you have mastered a third of the one before it" becomes "…of the stage it builds on; the .NET stages are a branch off stage 5".

### D4. Answer-index skew is a real exploit and the plan under-treats it.
Measured on the existing 389 mcq/output questions: answer index distribution is `{0: 15, 1: 363, 2: 9, 3: 2}`. `DrillPage.tsx` only shuffles `order` questions; mcq/output/multi are shown in authored order. A learner who notices this passes 93% of mcqs without reading. The plan's "vary the index" rule is necessary but not sufficient. Decisions:
1. **Integrator, before authors start:** DrillPage shuffles the *display order* of `choices` for mcq/output/multi once per question mount (same `shuffled()` helper the `order` type already uses) and maps the selection back to the original index. Choice ids `${id}-c${i}` are stable, so no server change and no history impact. Grading is untouched.
2. **Integrator, one-off script:** permute the choices of every existing mcq/output/multi question with a seeded shuffle and remap `answer`. Card state is keyed by question id, so learner history is safe. This also fixes any existing `why` that says "the second option" — grep for `first|second|third|fourth|last option|option [A-D]` in `why` and rewrite those by hand (there are few).
3. **`validateContent()` lint:** warn when any module has more than 50% of its mcq/output answers at one index, and fail on any `why`/`ask` containing a position word pattern. Cheap, catches the next author who does not read the rules.
4. Shared rule (§4): authors still vary the index (it matters for the module-page preview and for any future export), and `why` never references a position.

### D5. Ids and prefixes: collision-free. Verified.
`collide.mjs` over `content/index.js`: no proposed module id exists; none of the 22 new prefixes equals an existing prefix, is a prefix of one, or has one as a prefix; no existing question id starts with a new prefix; every existing module has exactly ids 1–14 so "next id 15" holds for all 31. The plan's prefix table for the nine modules whose prefix differs from their id is correct. Keep the plan's short prefixes (`ts-adv-`, `data-query-`, `net-test-`, `craft-obs-`, `craft-arch-`, `craft-inc-`) — they are pre-assigned throughout the briefs and changing them now only creates transcription errors. Two additions: `web-css-` and `craft-cloud-` (checked, clean).

### D6. Modules to cut, merge, move, add.
- **Cut:** none. Every proposed module maps to something interviewers ask this stack about.
- **Merge:** none. The plan's own rejections (`web-realtime`, `craft-perf`, `data-tx`, a senior track) are right.
- **Move:** none. `node-data` in stage 5 (after `data-queries`) and `web-perf` opening stage 9 are correct. `web-a11y` before React is correct.
- **Duplication between modules:** `craft-security` (stage 8) and `craft-appsec` (stage 9) both cover SSRF and supply chain. Acceptable as intro→depth, but `craft-sec-21` (SSRF acronym) and `craft-sec-23` (supply chain) are the shallow copies; `craft-sec-21` is replaced (§2), `craft-sec-23` stays as the "what it is", `craft-appsec-10/11` are the "what you do".
- **Add two modules** the plan missed and a hiring manager would notice:
  - `web-css` (stage 2, web track, 14 q). There is exactly one CSS-adjacent question in 434 (`js-values-12` parses "12px"). Box model, flex vs grid, specificity, stacking contexts, responsive units and "CSS Modules vs Tailwind vs CSS-in-JS" are asked in every full-stack interview that has a front-end component. Full brief in §6 (A5).
  - `craft-cloud` (stage 8, craft track, 14 q). `craft-shipping` covers Docker and CI but nothing covers what a mid-level dev deploys *onto*: managed compute vs VMs vs functions, managed Postgres, object storage + CDN, VPC/security groups, IAM roles vs keys, secret stores, and the bill. ".NET shop" interviews ask about Azure App Service/Key Vault/managed identity; JS shops ask about S3/RDS/IAM. Full brief in §6 (A10).
- **Add seven single questions** for the remaining topics in the checklist (decided, not listed):

| Topic | Decision |
| --- | --- |
| Docker/containers, CI/CD | Covered by craft-shipping additions (multi-stage, layer cache, liveness/readiness, canary, `:latest`, pipeline). No change. |
| Cloud basics | New module `craft-cloud`. |
| GraphQL vs REST | `web-api-14` ("When is REST the wrong choice?") exists. Add one d3: `web-api-25` GraphQL trade-offs (caching, N+1/DataLoader, 200-with-errors, complexity limits). |
| WebSockets | `web-http-26` (SSE vs WS vs polling) + `craft-design-7`. Enough. |
| i18n | Add `js-stdlib-15`: why string concatenation cannot be translated; ICU/plural rules; `Intl` for numbers/dates. |
| Feature flags | `craft-ship-12` exists. Add `craft-ship-23`: flag lifecycle and debt (owner, expiry, removal, kill switches as a separate class). |
| Data privacy / GDPR | Add `craft-appsec-15`: PII inventory incl. logs/backups, retention and deletion by design, crypto-shredding, subject export. |
| API versioning | `web-api-6` exists. No change. |
| Monorepos / tooling | Add `js-modules-23`: npm workspaces (this repo uses them). |
| TypeScript on the server | `ts-practice-17` (Express `Request` augmentation) + add `node-runtime-27`: running TS on Node (native type stripping in Node 22.18+/24, its limits, `tsc --noEmit` in CI, build for prod). Phrase defensively. |
| Testing React | `react-app-8`, `react-app-13`, `craft-test-4`, `react-app-17` (MSW). Add `react-app-23`: `findBy*`/`waitFor` after an async update, `userEvent` over `fireEvent`. |
| State management libraries | `react-state-20` (context+reducer → Zustand/RTK) + `react-data` module. Enough. |
| CSS / layout | New module `web-css`. |

### D7. Things the plan got right that must not be "improved" during execution
Never change an existing question's id/moduleId/trackId; `d` stays 1–3; no new track; craft-senior questions tagged `senior`; existing primers get a pointer line, not a rewrite; `estMinutes` +5/+10 rule.

---

## 2. Question-intent quality

Sampled: every `output`, `order`, `boolean` and `short` intent in all briefs, every d3 intent, and every mcq/multi whose expected answer I could verify — about 150 of the 578, with priority to the types the task named. Duplicate checks were run against the existing prompt list by keyword. Verified-correct items are not listed (e.g. `js-values-15/17/20/22`, `js-async-15/19/26`, `js-stdlib-2/8/11/12`, `js-classes-4/6/10`, `ts-adv-3/8/11`, `react-render-17`, `react-state-15/18`, `react-effects-15/23`, `node-runtime-15` as written, `node-express-20/21`, `node-data-2/4`, `data-sql-15/17/20/24/26`, `data-query-1/3/7`, `data-scale-2`, `cs-basics-15/17/18/20`, `cs-oop-18`, `cs-modern-1/2/4/6/8`, `cs-linq-15/19/21/26`, `net-aspnet-22`, `net-di-20/22`, `net-ef-22`, `net-auth-7/8/11`, `net-test-9`, `craft-git-20`, `craft-obs-9`, `craft-design-2/15`).

### 2.1 Systemic findings (fix via the shared rules, §4)
- **Boolean skew.** Of ~51 proposed booleans, 43 are keyed `false`. A learner learns "answer false". Rule: 40–60% of each author's booleans are `true`, and a true statement must still be one a junior would hesitate on. Concrete flips are in the table (marked "flip to true").
- **`short` answers and the grader.** `grade.js` lower-cases, trims, strips *trailing* `.!?;` and collapses whitespace — nothing else. Any accepted answer that is only punctuation (`!`, `?.`) normalises to the empty string and is ungradeable. Answers must be words/identifiers; list every variant.
- **`order` questions with more than one defensible order** (or fewer than 4 items) appear seven times. Rule restated: 4–6 items, strictly dependent steps, criterion in the prompt.
- **Version-hinging facts** appear in ~10 intents; each is either pinned to a version in the prompt or rewritten so the key does not depend on the version.
- **Cross-track duplicates**: a short-answer recall of a concept that an existing mcq already tests is fine; a same-type retest is not. Eight replacements below.

### 2.2 Flagged intents and corrected versions

| Id | Problem | Corrected intent |
| --- | --- | --- |
| js-values-16 · mcq | All three listed statements are true, so no distractor is wrong. | Keep the stem "Which is true of BigInt?"; correct: "mixing BigInt and Number in arithmetic throws a TypeError"; distractors must be false: "`10n + 1` evaluates to `11n`", "`JSON.stringify({ n: 1n })` produces `"1"`", "`typeof 1n` is `'number'`". |
| js-functions-15 · mcq | Duplicate of existing `js-functions-10` ("What does `fn.bind(obj)` return?"). | output · d2 — `console.log(Math.max.apply(null, [1, 5, 3]), Math.max(...[1, 5, 3]))` → `5 5`; why: `apply` takes an array, `call` takes a list, spread made most `apply` uses obsolete. |
| js-functions-16 · output | `this?.name` is environment-dependent: in a sloppy browser script `this` is `window` and `window.name` is `""`, not `undefined`. | Say "in an ES module" in the prompt and use a property that never exists on `globalThis`, e.g. `label`. Answer stays `[undefined] ['A']`. |
| js-functions-21 · short | Duplicate of `js-functions-1` (closure definition). | short · d2 — "What is the name of the window between entering a scope and a `let`/`const` declaration running, during which access throws? (Type the name or acronym.)" → `['temporal dead zone', 'the temporal dead zone', 'tdz']`. |
| js-functions-22 · order · d3 | Ordering four nested scopes is d1 trivia, not d3. | Keep the question, re-rate **d1**; the module's d3 minimum (6) is met by re-rating js-functions-17 and 19 honestly (both are d3 in substance). |
| js-classes-12 · short | "static" is vocabulary and cross-track near-dup of `cs-oop-11`. | short · d1 — "Which keyword calls the parent class's version of the method you are overriding? (One word.)" → `['super', 'super.method()', 'super()']`. |
| js-async-17 · mcq | Overlaps existing `js-async-9` (timeout on fetch). | output · d3 — `try { await fetch(url, { signal: AbortSignal.timeout(10) }); } catch (e) { console.log(e.name); }` → `TimeoutError`; why: a timeout rejects with a `TimeoutError` DOMException, a manual `controller.abort()` with `AbortError`, and `AbortSignal.any([...])` combines both. |
| js-modules-22 · order | Overlaps existing `js-modules-14` (`npm ci`); the why would be the same text. | order · d3 ★ — Order how Node resolves `import x from 'pkg'`: find the nearest `node_modules/pkg` walking up → read its `package.json` → apply the `exports` map with the `import`/`require` condition → fall back to `main`/`index.js` if there is no `exports` → load the file as ESM or CJS by extension/`type`. |
| js-stdlib-10 · output | Set methods are ES2025: Node 22+, Chrome 122+, Safari 17+. | Keep; the why names those versions and says "polyfill or `filter` on older targets". |
| ts-adv-1 · output | "Which built-in is this?" is an mcq, not an output. | mcq · d2, same content. Keep the type quota by making `ts-adv-6` (template literal union) the extra output. |
| react-render-21 · order | "browser paints → useEffect runs" is not guaranteed: since React 18, passive effects from discrete events (clicks) flush synchronously before paint. | order · d2 — trigger (`setState`) → render (React calls components) → commit (DOM mutated) → `useLayoutEffect` runs → `useEffect` runs. Why mentions that paint usually sits between the last two but React may flush effects before paint. |
| react-effects-20 · boolean | Same nuance; keyed `false` on a statement that is *sometimes* true. | Flip to **true**: "`useLayoutEffect` runs synchronously after DOM mutations and before the browser paints." |
| react-effects-21 · short | Duplicate of existing `react-effects-11` (useLayoutEffect). | short · d2 — "Which hook subscribes a component to an external store via a `subscribe` and `getSnapshot` pair? (Type the hook.)" → `['useSyncExternalStore', 'useSyncExternalStore()']`. |
| react-state-22 · short | Duplicate of existing `react-app-12` (`useRef`). | short · d3 — "Which hook customises what a parent receives through a `ref` to your component (e.g. exposing `focus()`)? (Type the hook.)" → `['useImperativeHandle', 'useImperativeHandle()']`. |
| react-app-16 · mcq | Duplicate of existing `craft-sec-6` (`VITE_*` is public). | mcq · d2 — Why the app calls `/api/orders` (relative) and lets Vite's dev proxy forward to `:3001` instead of hardcoding `http://localhost:3001`: same-origin in dev and prod, no CORS, one base URL per environment injected at build/deploy. (This is how the repo itself works.) |
| react-server-1 · mcq | Overlaps `react-perf-8` (lazy + Suspense). | mcq · d2 — Which of these actually *suspends* a Suspense boundary? `React.lazy` ✔, `use(promise)` ✔, a Suspense-enabled data library ✔ — but a `fetch` in `useEffect` never does (the fallback never shows for it). Correct answer is the "fetch in useEffect does not" option. |
| react-data-11 · output | Hinges on zod v4 vs v3 API (`z.email()` vs `z.string().email()`). | Use a version-neutral schema: `z.object({ age: z.number().int() }).safeParse({ age: '12' })` → `{ success: false, error: … }` and no throw. Why contrasts `parse`. |
| node-data-5 · mcq | Duplicate of existing `web-api-7` (`?sort=` danger and allowlist). | mcq · d2 ★ — A tagged-template query helper: ``sql`SELECT * FROM users WHERE email = ${email}` `` looks like interpolation but sends `$1` parameters; `pool.query(`... '${email}'`)` is injectable. Which is which, and why the driver-side binding also gives you plan caching. |
| node-express-19 · mcq | Overlaps existing `node-runtime-5` (2 GB upload → stream). | Keep but narrow: multer `memoryStorage` vs `diskStorage` vs streaming to object storage, and `limits: { fileSize }` — the danger is buffering many concurrent 200 MB uploads in RAM. |
| cs-basics-21 · short | Duplicate of existing `cs-basics-5` (record vs class). | short · d1 — "Which .NET type represents a calendar date with no time component (e.g. a date of birth)? (Type the type name.)" → `['DateOnly', 'System.DateOnly']`. |
| cs-oop-21 · short · d2 | "override" is d1 vocabulary. | Keep, re-rate **d1**. |
| cs-modern-12 · short | The accepted answer `!` is stripped to an empty string by the grader (trailing `!` is removed) — ungradeable. | short · d2 — "What is the name of the `!` postfix operator that suppresses a nullable warning? (Type the name.)" → `['null-forgiving', 'null-forgiving operator', 'null forgiving', 'damnit operator', 'bang operator']`. |
| cs-modern-14 · order | `{ Total: > 1000 }` and `{ IsVip: true }` can be swapped and no arm becomes unreachable — two valid orders. | Use a strictly subsuming chain: `{ Total: > 1000, IsVip: true }` → `{ Total: > 1000 }` → `{ Total: > 100 }` → `_`. |
| cs-basics-15 · output | Fine, but with top-level statements a `struct` declaration must follow the statements. | Put the struct at the bottom of the snippet; note it in the why. |
| data-sql-23 · order | 8 items (limit is 6) and overlaps existing `data-sql-1`. | mcq · d2 — `UNION` vs `UNION ALL`: `UNION` deduplicates (sort/hash cost), `UNION ALL` keeps duplicates and is cheaper; column count and types must line up. Which to use for "all events from two archived tables". |
| data-query-9 · order | "cheapest to most expensive access path" is not a single defensible order for one row (Index Scan vs Bitmap Heap Scan depends on row count and correlation). | mcq · d3 — The plan says `Index Only Scan` but `Heap Fetches: 12000`. Why (visibility map not set; recently updated rows) and the fix (`VACUUM`, or accept an Index Scan). |
| data-scale-3 · order · d2 | Isolation-level order is d1 vocabulary. | Keep, re-rate **d1**. |
| data-scale-11 · mcq | "named prepared statements break behind PgBouncer" is dated (1.21+ supports protocol-level prepared statements). | Keep with "historically" in the choice text and the why naming 1.21. |
| net-aspnet-21 · boolean | Hinges on version: .NET 10 adds built-in minimal-API validation (`AddValidation()`), still opt-in. | Keep pinned to ".NET 8" in the statement (as written) and say in the why that .NET 10 adds opt-in built-in validation. |
| net-ef-23 · short | Long exact-match command is fragile. | Keep; accept `['dotnet ef migrations add Init', 'dotnet-ef migrations add Init']`; the grader collapses whitespace, so spacing is safe. |
| web-api-22 · short | Accepting both 400 and 422 makes it a coin flip with no learning. | short · d2 — "Which status code does RFC 9110 define for 'the server understands the content type and syntax but cannot process the contained instructions'? (Type the number.)" → `['422']`. The why explains the 400-vs-422 debate and "pick one, document it". |
| web-a11y-5 · output | Screen-reader wording differs by vendor; choices must not hinge on exact phrasing. | mcq · d2 — What is announced and what is *not*: the `aria-label` text plus the role; the SVG is skipped because of `aria-hidden`. Distractors: "nothing, the SVG has no text", "the SVG's path data", "Close dialog, image". |
| craft-test-19 · output | Vitest now *fails* an un-awaited `expect(...).resolves` ("was not awaited"); Jest silently passes. Version/runner-dependent key. | mcq · d3 ★ — "What is wrong with this test?" → the assertion promise is neither awaited nor returned, so the test can finish before it settles; modern Vitest reports it, Jest passes it. Fix: `await expect(save()).resolves.toBe(true)`. |
| craft-test-23 · order | Only 3 items, and TDD is already `craft-test-10`. | boolean · d2, **true** — "`getByRole('button', { name: 'Save' })` fails when the 'button' is a clickable `<div>`, which is a feature: the test enforces accessible markup." |
| craft-sec-15 · multi | "Vulnerable and Outdated Components" is a 2021 name; 2025 renamed it. Keying on it is edition-dependent. | Use only categories present in both 2021 and 2025: Broken Access Control ✔, Injection ✔, Security Misconfiguration ✔, Cryptographic Failures ✔; distractors: "Cross-Site Request Forgery" (a technique, not a category), "Slow page load". |
| craft-sec-21 · short | Duplicate of `craft-appsec-2/3` (SSRF). | short · d2 — "Which memory-hard password hashing algorithm does OWASP currently recommend first, ahead of bcrypt and scrypt? (Type the name.)" → `['argon2', 'argon2id', 'argon 2']`. |
| craft-git-22 · order | "run the tests" can legitimately happen before `--continue` — two orders. | Drop it: edit the conflicted files → `git add` them → `git rebase --continue` (repeat per commit) → `git push --force-with-lease`. 4 items. |
| craft-ship-22 · order | Lint vs unit tests are interchangeable; build-before-tests is also defensible. Not a single order. | 5 items with hard dependencies: `npm ci` → unit tests → build the image tagged with the commit SHA → integration tests against that image → deploy that same image. |
| craft-arch-5 · order | Nygard's original template is Title, Context, Decision, Status, Consequences; adr-tools puts Status second. Two canonical orders. | mcq · d2 — An ADR has Context and Decision but no Consequences section. What is lost (the accepted trade-offs and follow-ups, which is what a future reader needs most). |
| craft-inc-2 · order | Overlaps existing `craft-ship-7` (order the steps for debugging a production incident). | order · d2 ★ — Order the mitigations for a bad release from fastest/safest to slowest: turn the feature flag off → roll back the deploy → hot-fix forward with tests → ship the full root-cause fix. |
| craft-obs-11 · boolean | Overlaps existing `craft-ship-4` (what to alert on). | boolean · d2, **true** — "Sampling 10% of successful-request logs while keeping 100% of errors is a legitimate way to cut logging cost." |
| craft-review-8 · mcq | The SBI model is trivia. | mcq · d2 — Your review of a junior's PR produced 40 comments. What now? Put the 2–3 blocking issues in the summary, mark the rest as non-blocking suggestions, and offer to pair; do not leave 40 drive-by comments. |
| Boolean rebalance (flip to **true**, same concept) | Needed to reach 40–60% true per author. | `js-objects-21` → "`Object.freeze(state)` leaves `state.user.prefs` mutable." `web-browser-20` → "A cross-origin `fetch` sends no cookies unless `credentials: 'include'` is set." `node-express-21` → "`express.json()` rejects bodies over about 100 kB with a 413 by default." `net-ef-22` → "`Find(id)` returns the tracked entity without a query when the context already has it." `node-jobs-9` → "Retries without a timeout can turn a slow dependency into an outage of your own service." `data-sql-25` → "Without `ORDER BY`, the same query can legitimately return rows in a different order tomorrow." Authors pick further flips themselves. |

Also confirmed and worth the author's attention (not errors): `node-runtime-15` — the choice set must contain "sync, tick, promise, then timeout and immediate in either order" as one option, and the why must state the ESM difference (promise before tick); `js-async-26` — the why names the default `--unhandled-rejections=throw` since Node 15; `react-effects-17` — `useEffectEvent` is stable in React 19.2 (October 2025), so say "React 19.2+"; `web-http-24` — the why mentions Encrypted Client Hello as the exception to "SNI reveals the host".

---

## 3. Author-brief completeness

Can an author execute §6.0 + §6.x with zero further planning? Almost. What is missing, and now supplied in §4/§6:

1. **Renderer constraints for primers** were absent. `Markdown.tsx` supports only: `#`–`####` headings (rendered as h2/h3/h4), paragraphs, `-`/`*` bullets, `1.` numbered lists, tables (header + `---` row), fenced code with a language, inline code, `**bold**`, `*italic*`. Not supported and rendered as literal text: links, images, HTML, blockquotes (`>`), horizontal rules (`---` becomes a paragraph), nested lists (an indented `- ` line is folded into the previous item or becomes a sibling), underscores for emphasis, bold containing backticks (the backticks print literally), a `|` inside a table cell even in backticks (it splits the cell). Stray `*` in prose (e.g. `a * b`) opens italics.
2. **What renders where.** `prompt`, `choices[]`, `ask`, `blurb`, `objectives[]` render through `Inline` only — single line, inline code/bold/italic, no newlines, no fenced code. `why` and `primer` render through the full block renderer. `code` renders through the highlighter, which knows `js ts tsx jsx json csharp sql bash` (anything else falls back to JS keywords; `bash` treats `#` as a comment, so Dockerfiles and HTTP messages are best given `lang: 'bash'`).
3. **Choice-order randomisation** (D4): the rule existed but with no target and no ban on position references in `why`.
4. **Boolean balance** target (2.1).
5. **`short` grader semantics** were stated but the punctuation-only trap was not.
6. **Difficulty definitions** existed (§4.1) but not in §6.0 itself — authors get §6.0 only.
7. **Objectives/estMinutes/blurb** exist for every new module. Primer word count (900–1,600) is stated; the task's expectation of 1,500–3,000 is too long for this app's existing primers (320–580 words each); final rule: **1,000–1,800 words** for new modules, which is 2–3× today's primers and matches 14–16 questions.
8. **`lang` requirements** exist; add: React snippets are TSX, but a plain-JS React snippet is fine with `lang: 'jsx'`.
9. **Id numbering** exists and is correct. Added: the seven single questions and two new modules get ids in §6.
10. **Hand-off note format** exists. Added: the author must report the boolean true/false split and the mcq answer-index histogram (a 5-line script is given in §4).
11. **Where new decks go in the file**: "in stage order" is ambiguous for a track spanning stages (node: stage 4, 5, 9). Rule: existing decks stay in place; new decks are appended at the end of the file in stage order.
12. **Type quotas per module** are implied by the pre-assigned intents (they already sum to the §4.3 mix), so no extra quota is needed — the rule is "keep the type of each intent unless you swap it and say so".

---

## 4. Shared rules — final version (prepend verbatim to every author brief)

BEGIN SHARED RULES

**Job.** You are extending *Stack Ready*, an interview-prep curriculum (JS → TS → React → Node/Express → HTTP → SQL → C#/.NET → craft) from "can write some JavaScript" to mid-level, and in stages 9–10 toward senior. Repo: `C:\Users\E\Desktop\opudslopboot\1jstrain2.2`. Read `content/schema.js`, `content/types.d.ts`, your track's existing questions and primers first. Match the voice: dense, opinionated, practical.

**Files you own.** Exactly the two files named in your brief (`content/questions/<name>.js` and `content/modules/<name>.js`). Nothing else — not `tracks.js`, `index.js`, `modules/index.js`, README, server or client. If your files do not exist yet, stop and ask; the integrator creates them before you start.

**Never** change an existing question's `id`, `moduleId`, `trackId`, or move/rewrite it; learner history is keyed on ids. Report errors in existing questions in your hand-off note instead.

**Ids.** `<prefix>-<n>`, unique across the curriculum. Existing modules continue at 15; new modules start at 1. Use the ids pre-assigned in your brief, in order, no gaps. Append new `q()`s to the end of an existing module's `deck([...])`; add new decks at the end of the file in stage order.

**Question shape** (`q()` in `content/schema.js`): `id`, `type` (`mcq` default | `multi` | `boolean` | `output` | `short` | `order`), `d` (1|2|3), `prompt`, optional `code` + `lang`, `choices` (strings), `answer`, `why`, optional `ask`, `tags`. Copy the existing style exactly (single quotes, `\n` in code strings).

**Rendering.** `prompt`, `choices`, `ask`, `blurb`, `objectives` are single-line: inline `code`, **bold**, *italic* only. `why` and the primer support headings, paragraphs, `-` lists, `1.` lists, tables, fenced code, inline code, bold, italic. **Unsupported and rendered literally:** links, images, HTML, `>` quotes, `---` rules, nested lists, `_emphasis_`, backticks inside `**bold**`, a `|` inside a table cell. Avoid stray `*` in prose. `code` highlighter languages: `js ts tsx jsx json csharp sql bash` — use `bash` for shell, git, docker, Dockerfiles, HTTP messages and logs. Default `lang` by track: js/node/web/craft → `js`, ts → `ts`, react → `tsx`, data → `sql`, csharp/dotnet → `csharp`; set it explicitly whenever the snippet is not the default.

**Types.**
- `mcq`/`output`: exactly 4 choices, one correct. Distractors are mistakes real people make; comparable length and specificity to the correct one (the longest choice must not be the answer more often than chance).
- `output`: a `code` snippet ≤ 12 lines plus choices that are literal results in backticks; for non-code tracks, concrete predicted outcomes of a concrete artefact (an HTTP exchange, a plan, a timeline). Execute the snippet mentally twice; state the environment (Node/browser, CJS/ESM, .NET version) when it matters.
- `multi`: 4–6 choices, 2–4 correct, prompt ends "(Select all that apply.)".
- `boolean`: a statement; **40–60% of your booleans are `true`**; false ones are common beliefs; true ones are things a junior hesitates on.
- `short`: a single word, identifier, command, number or header; list every reasonable variant. The grader lower-cases, trims, collapses whitespace and strips trailing `.!?;` — nothing else, no fuzzy match. Never an answer that is only punctuation. The prompt says what to type.
- `order`: 4–6 items with exactly one defensible order given the criterion stated in the prompt; write `choices` shuffled and `answer` as the permutation (see `data-sql-1`).

**Answer position.** Choices are shuffled at display time, so: never refer to a position in `why`/`ask` ("the second option"). Still place the correct index uniformly across your set (target ≤ 35% at any one index per module); check with the script below.

**Difficulty.** d1 = vocabulary a beginner should know (≤ 15% of a module). d2 = what a junior answers without hesitating (the default). d3 = distinguishes mid-level: needs a mechanism, a trade-off or a second-order effect. Obscurity does not make a question d3; delete trivia. Meet your brief's per-module d3 minimum honestly (re-rate if needed and say so).

**`why`.** 2–5 sentences that teach: the rule, the mechanism, and the practical consequence or the related gotcha. Factually precise; name the version when behaviour is version-dependent ("React 19.2+", "Node 22+", ".NET 8+", "Postgres 15+"). Never restate the prompt, never say "correct!".

**`ask`.** 1–2 sentences: what the interviewer is really probing and what the strong answer sounds like, ideally naming the follow-up they will ask. Required on every ★ intent; add it to any classic interview question. Never repeats the `why`.

**Version-sensitive facts.** Verify or phrase so the key does not hinge on the version. Never key an answer on something you could not verify. Current baselines: Node 22/24 LTS, React 19.2, Express 5, TS 5.x, TanStack Query v5, zod v4 (write schemas that also work in v3), .NET 8 LTS (mention 9/10 only when verified), C# 12–13 (C# 14 only when verified), EF Core 8+, Postgres 15+, OWASP Top 10 2021 and 2025.

**Scope.** Every question is something a working CRUD developer hits or an interviewer asks about this stack. No algorithm puzzles, no spec trivia, no questions about this app.

**Primers.** New modules: 1,000–1,800 words, `##` sections following the outline in your brief, short fenced examples, a table where it helps, opinionated ("do X; Y is a bug"). Every question must be answerable from the primer. Existing modules: add sections/paragraphs (about one short paragraph per 2–3 new questions) and a one-line "Covered in depth in *Module title*." pointer where a topic moved. Primers are JS template literals: escape backticks as backslash-backtick and `${` as backslash-`${`, as the existing files do. Use the `objectives` (four "say it out loud" bullets), `blurb` and `estMinutes` given in your brief; raise an existing module's `estMinutes` by 5 for 8–11 new questions and by 10 for 12 or more.

**Tags.** 1–3 lower-kebab-case tags reusing the existing vocabulary; every stage-10 question also gets `senior`.

**Validate.** From the repo root after every module: `npm run check:content` (must pass, counts must match your brief). Then run this and paste both outputs in your hand-off:
`node --input-type=module -e "import('./content/index.js').then(({questions})=>{const mine=questions.filter(q=>process.argv[1].split(',').some(p=>q.id.startsWith(p)));const idx={},bool={true:0,false:0};for(const q of mine){if(q.type==='mcq'||q.type==='output')idx[q.answer]=(idx[q.answer]||0)+1;if(q.type==='boolean')bool[q.answer]++}console.log(mine.length,idx,bool)})" -- <your-prefixes,comma-separated>`
Then re-read every `why` once for correctness.

**Hand-off note** (your final message): per-module counts (total, d3, ask, per type), the index histogram and boolean split, new module objects and where they sit, existing-question errors found, intents you replaced and why, version facts you could not verify.

END SHARED RULES

---

## 5. Final module and stage tables (authoritative)

### 5.1 Modules — 53 (31 existing, 22 new in bold)
Blurbs and titles for existing modules are unchanged. "Est" is the final `estMinutes`. "Q" is the target question count.

| Module id | Prefix | Track | Stage | Title | Blurb | Est | Q |
| --- | --- | --- | --- | --- | --- | --- | --- |
| js-values | js-values- | js | 1 | Values, types and coercion | (unchanged) | 30 | 22 |
| js-functions | js-functions- | js | 1 | Functions, scope, closures and `this` | (unchanged) | 35 | 22 |
| js-objects-arrays | js-objects- | js | 1 | Objects, arrays and immutability | (unchanged) | 35 | 24 |
| **js-classes** | js-classes- | js | 1 | Prototypes, classes and objects in practice | The prototype chain under `class`, private fields, getters, inheritance, and when composition beats all of it. | 25 | 14 |
| js-async | js-async- | js | 1 | Async: the event loop, promises, await | (unchanged) | 45 | 26 |
| **js-stdlib** | js-stdlib- | js | 1 | Iteration, errors, collections and dates | Iterators and generators, errors that keep their cause, Map/Set/WeakMap, Intl, and the date bugs every CRUD app ships. | 30 | 15 |
| js-modules | js-modules- | js | 1 | Modules, npm and the toolchain | (unchanged) | 30 | 23 |
| ts-basics | ts-basics- | ts | 2 | TypeScript fundamentals | (unchanged) | 30 | 22 |
| ts-shapes | ts-shapes- | ts | 2 | Modelling shapes: unions, generics, utility types | (unchanged) | 35 | 22 |
| ts-practice | ts-practice- | ts | 2 | TypeScript in a real codebase | (unchanged) | 30 | 22 |
| **ts-advanced** | ts-adv- | ts | 2 | Type-level TypeScript | Mapped, conditional and template literal types, `infer`, overloads and declaration files — reading the types libraries hand you. | 30 | 14 |
| web-browser | web-browser- | web | 2 | The browser platform | (unchanged) | 30 | 22 |
| **web-css** | web-css- | web | 2 | CSS and layout for app developers | The box model, flexbox vs grid, the cascade and specificity, responsive units, stacking contexts, and how to organise styles in a React app. | 25 | 14 |
| **web-a11y** | web-a11y- | web | 2 | Accessibility and semantic HTML | Semantic elements, labels, keyboard and focus, ARIA used sparingly, and how to check your own pages. | 25 | 14 |
| react-render | react-render- | react | 3 | The rendering model | (unchanged) | 35 | 22 |
| react-state | react-state- | react | 3 | State, events and forms | (unchanged) | 35 | 24 |
| react-effects | react-effects- | react | 3 | Effects and data fetching | (unchanged) | 40 | 24 |
| **react-data** | react-data- | react | 3 | Server state, mutations and forms | Treat server data as a cache: query keys, staleness, invalidation, optimistic updates, and forms validated with a shared schema. | 30 | 14 |
| react-perf | react-perf- | react | 3 | Re-renders and performance | (unchanged) | 30 | 22 |
| react-app | react-app- | react | 3 | Structuring a real React app | (unchanged) | 35 | 23 |
| **react-server** | react-server- | react | 3 | Modern React: Suspense, actions and Server Components | React 19's async model: Suspense and `use`, transitions, actions and optimistic UI, and where Server Components change the architecture. | 35 | 16 |
| node-runtime | node-runtime- | node | 4 | The Node runtime | (unchanged) | 35 | 27 |
| node-express | node-express- | node | 4 | Express: routing, middleware, errors | (unchanged) | 35 | 24 |
| node-auth | node-auth- | node | 4 | Authentication and authorisation | (unchanged) | 35 | 24 |
| web-http | web-http- | web | 4 | HTTP semantics | (unchanged) | 35 | 26 |
| web-api-design | web-api- | web | 4 | Designing a CRUD API | (unchanged) | 35 | 25 |
| data-sql | data-sql- | data | 5 | SQL you will actually write | (unchanged) | 40 | 26 |
| data-modeling | data-model- | data | 5 | Schema, indexes, transactions and ORMs | (unchanged) | 35 | 24 |
| **data-queries** | data-query- | data | 5 | Advanced SQL: windows, CTEs and query plans | Window functions, recursive CTEs, upserts, keyset pagination, and reading EXPLAIN well enough to pick the right index. | 35 | 16 |
| **node-data** | node-data- | node | 5 | Talking to the database from Node | Drivers, pools, parameterised queries, transactions in code, and choosing between raw SQL, a query builder and an ORM. | 30 | 14 |
| cs-basics | cs-basics- | csharp | 6 | C# for people who know JavaScript | (unchanged) | 35 | 22 |
| cs-oop | cs-oop- | csharp | 6 | Types, interfaces and exceptions | (unchanged) | 30 | 22 |
| **cs-modern** | cs-modern- | csharp | 6 | Modern C#: records, patterns and the new syntax | Records and `with`, pattern matching, `required` and `init`, primary constructors, collection expressions and nullable flow analysis. | 30 | 14 |
| cs-linq-async | cs-linq- | csharp | 6 | LINQ, IQueryable and async/await | (unchanged) | 40 | 26 |
| net-aspnet | net-aspnet- | dotnet | 7 | ASP.NET Core: the request pipeline | (unchanged) | 35 | 24 |
| net-di-config | net-di- | dotnet | 7 | Dependency injection, configuration, logging | (unchanged) | 30 | 22 |
| net-efcore | net-ef- | dotnet | 7 | Entity Framework Core | (unchanged) | 40 | 26 |
| **net-auth** | net-auth- | dotnet | 7 | Authentication and authorisation in ASP.NET Core | Schemes, JWT bearer and cookies, claims and policies, resource-based checks, and the Identity pieces you should not rebuild. | 30 | 14 |
| **net-testing** | net-test- | dotnet | 7 | Testing ASP.NET Core and EF Core | xUnit, doubles at the boundaries, WebApplicationFactory integration tests and a real database in a container — plus the InMemory trap. | 30 | 14 |
| craft-git | craft-git- | craft | 8 | Git in a team | (unchanged) | 30 | 22 |
| craft-testing | craft-test- | craft | 8 | Testing a CRUD app | (unchanged) | 30 | 24 |
| craft-security | craft-sec- | craft | 8 | Security for CRUD apps | (unchanged) | 30 | 24 |
| craft-shipping | craft-ship- | craft | 8 | Shipping and running it | (unchanged) | 30 | 23 |
| **craft-cloud** | craft-cloud- | craft | 8 | Cloud basics for a CRUD app | Managed compute, databases and object storage, networking and IAM at the level a mid-level developer deploys with — and what actually costs money. | 30 | 14 |
| **web-perf** | web-perf- | web | 9 | Performance and caching across the stack | Measure first, then fix: percentiles, Core Web Vitals, bundles, CDNs, HTTP and application caches, and load tests. | 35 | 14 |
| **craft-observability** | craft-obs- | craft | 9 | Observability: logs, metrics and traces | Structured logs with context, RED metrics, traces with OpenTelemetry, SLOs, and alerts that only wake someone when it matters. | 30 | 14 |
| **data-scale** | data-scale- | data | 9 | Concurrency, pooling and scaling the database | Isolation levels and locks, deadlocks, connection limits, read replicas, partitioning, and migrations on huge tables. | 35 | 14 |
| **node-jobs** | node-jobs- | node | 9 | Background jobs, queues and resilience | Work off the request path, retries that are safe, idempotent consumers, the outbox, and timeouts and breakers around flaky dependencies. | 30 | 14 |
| **craft-appsec** | craft-appsec- | craft | 9 | Application security in depth | The OWASP Top 10 beyond XSS and CSRF — SSRF, injection variants, supply chain, crypto, privacy and logging failures — plus threat-modelling a feature. | 30 | 15 |
| **craft-design** | craft-design- | craft | 10 | System design for CRUD apps | Grounded system design: requirements and numbers first, then a boring architecture that scales, with the trade-offs said out loud. | 40 | 16 |
| **craft-architecture** | craft-arch- | craft | 10 | Architecture decisions and trade-offs | Monolith vs services, module boundaries, layering, events, build vs buy, tech debt, and writing the decision down. | 30 | 14 |
| **craft-incidents** | craft-inc- | craft | 10 | Incidents, on-call and reliability | Mitigate first, communicate constantly, find causes later: running an incident, being on call, and postmortems that change things. | 30 | 14 |
| **craft-review** | craft-review- | craft | 10 | Code review, mentoring and technical leadership | Reviewing for what matters, feedback people act on, growing juniors, estimating honestly, and the design doc before the code. | 25 | 14 |

Totals: js 146 · ts 80 · react 145 · node 103 · web 115 · data 80 · csharp 84 · dotnet 100 · craft 194 = **1,047**. Stage totals: S1 146 · S2 130 · S3 145 · S4 126 · S5 80 · S6 84 · S7 100 · S8 107 · S9 71 · S10 58.

### 5.2 Stages — 10 (write into `content/tracks.js` verbatim; `after` needs D3)

| id | title | blurb | unlockAt | after | modules (in order) |
| --- | --- | --- | --- | --- | --- |
| stage-1 | Stage 1 · The language | Before frameworks: values, functions, objects, classes, async, the standard library and modules. Almost every "why did this break" moment later traces back to something here. | 0 | – | js-values, js-functions, js-objects-arrays, js-classes, js-async, js-stdlib, js-modules |
| stage-2 | Stage 2 · Types and the browser | TypeScript well enough to model an API response and read a library's types, plus the browser platform, CSS layout and accessibility your React code lives inside. | 0.35 | – | ts-basics, ts-shapes, ts-practice, ts-advanced, web-browser, web-css, web-a11y |
| stage-3 | Stage 3 · React for real apps | Rendering model first, then state, effects, server state, performance, app structure and React 19's async model. | 0.35 | – | react-render, react-state, react-effects, react-data, react-perf, react-app, react-server |
| stage-4 | Stage 4 · The server side | Node, Express, auth, HTTP semantics and API design: the CRUD backend a mid-level dev is expected to build unsupervised. | 0.35 | – | node-runtime, node-express, node-auth, web-http, web-api-design |
| stage-5 | Stage 5 · Data | SQL you can write in an interview, the schema and index decisions that decide whether the app survives its first 10k rows, and wiring the database into Node properly. | 0.35 | – | data-sql, data-modeling, data-queries, node-data |
| stage-6 | Stage 6 · C#, the language | The other language on your CV: value semantics, types and exceptions, modern syntax, LINQ and async. | 0.35 | – | cs-basics, cs-oop, cs-modern, cs-linq-async |
| stage-7 | Stage 7 · ASP.NET Core and EF Core | The same CRUD API on the other stack: pipeline, DI and config, EF Core, auth and tests. | 0.35 | – | net-aspnet, net-di-config, net-efcore, net-auth, net-testing |
| stage-8 | Stage 8 · Ship it | Git, testing, security, deployment and the cloud services underneath. This is the stage that gets skipped and the stage that gets asked about. | 0.35 | stage-5 | craft-git, craft-testing, craft-security, craft-shipping, craft-cloud |
| stage-9 | Stage 9 · Run it in production | Beyond mid-level: make it fast, see inside it, keep the data correct under concurrency, move work to queues, and harden it. | 0.35 | – | web-perf, craft-observability, data-scale, node-jobs, craft-appsec |
| stage-10 | Stage 10 · Toward senior | System design for CRUD at scale, architecture decisions, incidents and on-call, and the review and mentoring that make a team better. Grounded, not whiteboard puzzles. | 0.35 | – | craft-design, craft-architecture, craft-incidents, craft-review |

Note: the existing `stage-7` id is reused with a *different* meaning (ASP.NET). Nothing persists stage ids, so this is safe (plan §0 verified: `attempts`/`card_states` key on question/module/track ids).

---

## 6. Per-author assignments (12 authors) and integrator steps

### Step 0 — integrator, before any author starts (one commit)
1. **Split modules by author.** Replace `content/modules/stage-*.js` with one file per author, moving the existing module objects verbatim: `js.js`, `ts.js`, `react.js`, `node.js`, `web.js` (web-http, web-api-design), `web-platform.js` (web-browser), `data.js`, `csharp.js`, `dotnet.js`, `craft.js` (craft-git, craft-testing, craft-security, craft-shipping). Create empty-export `craft-ops.js` and `craft-senior.js`. `modules/index.js` concatenates all twelve.
2. **Split questions by author.** Move the `web-browser` deck out of `questions/web.js` into a new `questions/web-platform.js` (export `webPlatformQuestions`); create `questions/craft-ops.js` (`craftOpsQuestions`) and `questions/craft-senior.js` (`craftSeniorQuestions`) with the header `import { q, deck } from '../schema.js';` and an empty array. Add the three imports to `content/index.js`. Moving decks between files changes no id, so history is safe. `npm run check:content` must still print 434.
3. **Write `content/tracks.js`** from §5.2 (all ten stages, all 53 module ids) *and* temporarily comment out the module ids that do not exist yet, or keep the old stage list until integration — pick the second: stage list is swapped at integration, the authors never touch it.
4. **Gating:** implement D3 (`after` field, `validateContent` check, `check.js` assertion, README line).
5. **Choice shuffling:** implement D4 items 1–3 (DrillPage display shuffle, one-off permutation of existing content, the validateContent lint).
6. Hand each author: §4 (shared rules) + their §6.x block below + the plan's matching §6.x text.

### Step Z — integrator, after all twelve hand-offs
Swap the stage list; add the 53 ids; re-point `LabsPage.tsx` `related` links (js/06 → `js-classes`, js/08 and js/09 → `js-stdlib`, ts/04 and ts/05 → `ts-advanced`); update README counts (53 modules, 1,047 questions, 10 stages) and the stage table; run `npm run check` and `npm run check:content`; run the index-histogram script over the whole curriculum; spot-check ten `why`s per author.

### A1 — JavaScript (`content/questions/js.js`, `content/modules/js.js`) · 76 new
Use plan §6.1 as written with these corrections:
- Replace `js-functions-15`, `js-functions-16`, `js-functions-21`, `js-classes-12`, `js-async-17`, `js-modules-22` per §2.2; re-rate `js-functions-22` to d1; fix `js-values-16` distractors; flip `js-objects-21` to true.
- Add **js-stdlib-15 · mcq · d2** — Why `'You have ' + n + ' items'` cannot be translated: word order and plural categories differ by language; use a message format with placeholders and plural rules (ICU / `Intl.PluralRules`), and `Intl` for numbers and dates. Primer section 8 gains an "i18n in one paragraph".
- Add **js-modules-23 · mcq · d2** — What `"workspaces": ["content", "server", "client"]` in a root package.json does: one lockfile and one `node_modules`, local packages symlinked so `@jstrain/content` resolves to the folder, `npm run x -w server`; the version-drift and duplicate-install problems it removes. Primer gains "Workspaces and monorepos".
- Counts: js-values 22, js-functions 22, js-objects-arrays 24, js-classes 14, js-async 26, js-stdlib 15, js-modules 23. d3/ask minimums as in plan §3 (js-stdlib d3 ≥ 4 with the new item).

### A2 — TypeScript (`questions/ts.js`, `modules/ts.js`) · 38 new
Use plan §6.2 as written with: `ts-adv-1` becomes mcq and `ts-adv-6` stays output (type quota); at least 3 of the 6 booleans/true-false-style items keyed true (`ts-shapes-20` is already true; flip one more, e.g. `ts-basics-17` → "TypeScript `private` is erased at runtime, so `(obj as any).secret` reads it" → true). Counts: ts-basics 22, ts-shapes 22, ts-practice 22, ts-advanced 14.

### A3 — React (`questions/react.js`, `modules/react.js`) · 75 new
Use plan §6.3 as written with: replace `react-render-21`, `react-effects-20` (flip to true), `react-effects-21`, `react-state-22`, `react-app-16`, `react-server-1`, `react-data-11` per §2.2; say "React 19.2+" for `useEffectEvent`.
- Add **react-app-23 · mcq · d2** — After `await user.click(saveButton)`, `screen.getByText('Saved')` throws although the UI shows it a moment later. Why (the update is async) and the fix (`await screen.findByText('Saved')` or `waitFor`), plus why `userEvent` beats `fireEvent`. Primer section "Testing components" (one paragraph, pointer to *Testing a CRUD app*).
- Counts: react-render 22, react-state 24, react-effects 24, react-data 14, react-perf 22, react-app 23, react-server 16.

### A4 — Node & Express (`questions/node.js`, `modules/node.js`) · 61 new
Use plan §6.4 as written with: replace `node-data-5` and narrow `node-express-19` per §2.2; flip `node-express-21` and `node-jobs-9` to true statements; `node-runtime-15` choice set as noted in §2.2.
- Add **node-runtime-27 · mcq · d2** — Running TypeScript on Node: Node 22.18+/24 run `.ts` files directly by stripping types (no enums, namespaces or parameter properties; no type checking), `tsx` for dev on older versions, `tsc --noEmit` in CI, and compile with `tsc`/`esbuild` for production. Phrase so the key does not depend on the exact minor version. Primer: "TypeScript on Node" paragraph.
- Counts: node-runtime 27, node-express 24, node-auth 24, node-data 14, node-jobs 14.

### A5 — Web platform (`questions/web-platform.js`, `modules/web-platform.js`) · 36 new
Owns `web-browser` (existing deck moved here by step 0), `web-css` (new) and `web-a11y` (new).
- `web-browser`: plan §6.5 web-browser block as written; flip `web-browser-20` to the true statement in §2.2.
- `web-a11y`: plan §6.5 web-a11y block as written; `web-a11y-5` becomes mcq per §2.2.
- **`web-css` — NEW (prefix `web-css-`, ids 1–14) · 14 · d3 ≥ 4 · ask ≥ 3 · estMinutes 25**
  - Title/blurb: §5.1. **Objectives:** 1. Explain the box model and why `border-box` is the default you set globally. 2. Choose flexbox or grid for a layout and write it. 3. Debug "my z-index does not work" with stacking contexts. 4. Compare CSS Modules, Tailwind and CSS-in-JS with real trade-offs.
  - **Primer outline:** 1. The box model and `box-sizing`. 2. The cascade: origin, specificity (id > class/attribute/pseudo-class > element), source order, `!important` and why you avoid it; inheritance. 3. Layout: normal flow, `display`, flexbox (main/cross axis, `flex: 1`, `gap`, `align-items`), grid (`repeat`, `minmax`, `auto-fill`, template areas). 4. Positioning and stacking contexts: `position`, `z-index` only competes within a stacking context, what creates one (`z-index` on positioned elements, `opacity < 1`, `transform`, `filter`), portals for overlays. 5. Responsive design: mobile-first `min-width` queries, fluid units (`rem`, `%`, `vw`, `clamp()`), container queries, responsive images. 6. Selectors you actually use: `>`, `+`, `~`, `:hover`/`:focus-visible`, `:not`, `:has`, attribute selectors. 7. Motion and performance: layout vs paint vs composite, animate `transform`/`opacity`, `prefers-reduced-motion`, avoiding CLS. 8. Organising CSS in a React app: CSS Modules, Tailwind, CSS-in-JS runtime cost, design tokens as custom properties, dark mode with `prefers-color-scheme`.
  - **Questions** (id · type · d · ★):
    - web-css-1 · mcq · d1 — `width: 200px; padding: 20px; border: 5px solid` with the default `content-box`: rendered width 250px; why `*, *::before, *::after { box-sizing: border-box }` is the standard reset.
    - web-css-2 · output · d2 — Three rules target the same `<p class="title big">` inside `#app .card`: `#app p { color: red }`, `.card .title.big { color: blue }`, `p { color: green !important }`. Rendered colour → green (`!important` beats specificity); without it → red (an id beats three classes).
    - web-css-3 · mcq · d2 ★ — A wrapping card grid with equal columns vs a toolbar with a right-aligned button: grid `repeat(auto-fill, minmax(240px, 1fr))` vs flex with `margin-left: auto`. The rule: grid for two-dimensional layout, flex for one-dimensional distribution.
    - web-css-4 · output · d2 — `.row { display: flex; width: 600px } .a { flex: 1 } .b { flex: 2 }` → `.a` 200px, `.b` 400px.
    - web-css-5 · multi · d2 — Which create a new stacking context? (Select all) `position: relative; z-index: 1` ✔; `opacity: 0.9` ✔; `transform: translateX(0)` ✔; `position: static` ✘; `display: flex` on a container ✘.
    - web-css-6 · mcq · d3 ★ — `z-index: 9999` on a dropdown still renders under the sticky header. Cause: an ancestor (e.g. with `transform` or a low `z-index`) created a stacking context that caps it. Fix: remove the ancestor's context or portal the dropdown to `body`.
    - web-css-7 · boolean · d2 · true — "`rem` units scale with the user's browser font-size preference, `px` values do not."
    - web-css-8 · mcq · d2 — Centering: `margin: 0 auto` needs a width and a block; flex `justify-content` + `align-items`; grid `place-items: center`. Which works for a dialog of unknown size.
    - web-css-9 · order · d2 — Order from lowest to highest precedence for the same property: user-agent stylesheet → author rule with lower specificity → author rule with higher specificity → inline `style` attribute → author `!important`.
    - web-css-10 · mcq · d2 — Mobile-first: base styles for small screens, `@media (min-width: …)` to add layout; `clamp()` for fluid type; container queries when a component's layout depends on its box, not the viewport.
    - web-css-11 · output · d3 — `.list > li + li { margin-top: 8px }` → space between items but none above the first (adjacent-sibling combinator); contrast `gap` on a flex/grid parent.
    - web-css-12 · multi · d3 ★ — Which animate without triggering layout? (Select all) `transform` ✔; `opacity` ✔; `width` ✘; `top`/`left` ✘; `box-shadow` ✘ (paint).
    - web-css-13 · short · d2 — "Which declaration makes padding and border count inside an element's declared width? (Type `property: value`.)" → `['box-sizing: border-box', 'box-sizing:border-box', 'border-box']`.
    - web-css-14 · mcq · d3 ★ — Styling strategy for a React CRUD app: CSS Modules (scoped, zero runtime), Tailwind (utility classes, design constraints, no naming), runtime CSS-in-JS (runtime cost, SSR complexity), global BEM. The strong answer picks scoped-by-default with no runtime and names the trade-offs.
- Counts: web-browser 22, web-css 14, web-a11y 14.

### A6 — HTTP and API (`questions/web.js`, `modules/web.js`) · 37 new
Owns `web-http`, `web-api-design`, `web-perf`. Use plan §6.5 blocks for those three as written with: replace `web-api-22` per §2.2; `web-http-24` why mentions ECH; `web-http-23` framed as 301 vs 308.
- Add **web-api-25 · mcq · d3 ★** — GraphQL for the product API? It fixes over/under-fetching and round trips at the cost of HTTP caching (POST, per-query shapes), resolver N+1 (DataLoader), query-complexity limits, and errors arriving as 200 with an `errors` array (monitoring changes). For a CRUD app with a handful of screens, REST with well-designed resources stays the default. The ask: "it depends, and on what".
- Counts: web-http 26, web-api-design 25, web-perf 14.

### A7 — SQL & Data (`questions/data.js`, `modules/data.js`) · 52 new
Use plan §6.6 as written with: replace `data-sql-23` and `data-query-9` per §2.2; re-rate `data-scale-3` d1; `data-scale-11` "historically"; flip `data-sql-25` to the true statement. Counts: data-sql 26, data-modeling 24, data-queries 16, data-scale 14.

### A8 — C# (`questions/csharp.js`, `modules/csharp.js`) · 42 new
Use plan §6.7 as written with: replace `cs-basics-21`, `cs-modern-12`, `cs-modern-14` per §2.2; re-rate `cs-oop-21` d1; struct after statements in `cs-basics-15`; flip two booleans to true (e.g. `cs-linq-23` → "An `async` ASP.NET Core action awaiting EF already frees the request thread during the query; `Task.Run` adds a thread hop" → true). Counts: cs-basics 22, cs-oop 22, cs-modern 14, cs-linq-async 26.

### A9 — ASP.NET Core & EF (`questions/dotnet.js`, `modules/dotnet.js`) · 58 new
Use plan §6.8 as written with: `net-aspnet-21` pinned to .NET 8 with the .NET 10 note; `net-ef-23` variants; flip `net-ef-22` to true per §2.2 (net-di-20 and net-auth-8 are already true). Counts: net-aspnet 24, net-di-config 22, net-efcore 26, net-auth 14, net-testing 14.

### A10 — Craft core (`questions/craft.js`, `modules/craft.js`) · 51 new
Owns `craft-git`, `craft-testing`, `craft-security`, `craft-shipping`, `craft-cloud` (new). Use plan §6.9a blocks for the four existing modules with: replace `craft-test-19`, `craft-test-23`, `craft-sec-15`, `craft-sec-21`, `craft-git-22`, `craft-ship-22` per §2.2.
- Add **craft-ship-23 · mcq · d3** — Feature flags are configuration with a lifecycle: a default, an owner, an expiry, a removal PR after full rollout, and kill switches kept as a separate, permanent class. The cost of not doing this: untested flag combinations and dead branches. Primer: "Flag hygiene".
- **`craft-cloud` — NEW (prefix `craft-cloud-`, ids 1–14) · 14 · d3 ≥ 4 · ask ≥ 4 · estMinutes 30**
  - Title/blurb: §5.1. **Objectives:** 1. Explain the service model and choose the compute platform for a CRUD API with a reason. 2. Describe a standard cloud deployment: load balancer, app tier, managed database, object storage, CDN. 3. Give the app its permissions and secrets without long-lived keys. 4. Name the five things that will surprise you on the bill.
  - **Primer outline** (AWS and Azure names side by side throughout): 1. The service model: IaaS / PaaS / serverless, shared responsibility. 2. Compute for a CRUD API: containers on a managed platform first (App Service, Container Apps, ECS/Fargate, Cloud Run); when functions fit and cold starts; VMs and Kubernetes as deliberate choices. 3. Data: managed relational DB (backups, PITR, multi-AZ failover, connection limits, replicas), Redis for cache/sessions, object storage + CDN for files with presigned URLs. 4. Networking in one page: region vs availability zone, VPC/VNet, public vs private subnets, load balancer with TLS termination and health checks, security groups/NSGs, NAT, DNS. 5. Identity and secrets: IAM roles / managed identities, least privilege, OIDC from CI instead of stored keys, secret stores vs env vars, rotation. 6. Environments and IaC: parity, Terraform/Bicep/CDK, drift, infra in PRs. 7. Cost: what is billed, the usual surprises (NAT, egress, idle DBs, logs), budgets and alerts, turning off idle environments. 8. Operating it: platform logs/metrics, health checks and autoscaling, the 502 checklist, tags and ownership.
  - **Questions:**
    - craft-cloud-1 · mcq · d1 — IaaS vs PaaS vs serverless: a VM you patch vs a platform that runs your container/app vs functions billed per invocation; what you stop owning at each step.
    - craft-cloud-2 · mcq · d2 ★ — Where to run a Node/.NET CRUD API first: a managed container/app platform, not a hand-managed VM or your own Kubernetes; why (patching, scaling, rollbacks, fewer ops). The ask: when Kubernetes becomes justified.
    - craft-cloud-3 · mcq · d2 — Managed Postgres: what you get (backups, PITR, failover, patching, metrics) and what you still own (schema, indexes, connection limits, cost).
    - craft-cloud-4 · mcq · d2 — Region vs availability zone; multi-AZ for the database is the default HA step, multi-region is not (pointer to *System design*).
    - craft-cloud-5 · multi · d2 — What belongs in object storage rather than the DB or the app's disk? (Select all) user uploads ✔; generated exports ✔; static assets fronted by a CDN ✔; session state ✘; relational rows ✘.
    - craft-cloud-6 · output · d2 — A function-based API shows p99 spikes of 4–6 s after every quiet period, p50 unaffected. Name it (cold start) and the mitigations (provisioned concurrency, keep the hot path on containers).
    - craft-cloud-7 · mcq · d3 ★ — The app's permissions come from a workload identity (instance role / managed identity) with least privilege, not an access key in an env var; CI deploys via OIDC federation. Why keys leak and roles do not.
    - craft-cloud-8 · boolean · d2 · true — "A security group that allows inbound 5432 only from the app tier's group is preferable to allowing it from the whole VPC."
    - craft-cloud-9 · mcq · d3 — Secrets: a secret store (Key Vault / Secrets Manager) referenced by the platform and rotated, never baked into images or committed; env vars are the delivery mechanism, not the store.
    - craft-cloud-10 · order · d2 — Order a request's path through a standard deployment: DNS → CDN/edge (static assets, TLS) → load balancer (health checks, TLS termination) → app instances in private subnets → managed database in a private subnet.
    - craft-cloud-11 · multi · d3 ★ — What unexpectedly costs money on a small deployment? (Select all) a NAT gateway ✔; data egress ✔; an idle provisioned database ✔; log ingestion and retention ✔; inbound traffic ✘.
    - craft-cloud-12 · mcq · d2 — Infrastructure as code (Terraform/Bicep/CDK) vs click-ops: reproducible environments, review in PRs, drift detection; start with IaC even when small.
    - craft-cloud-13 · short · d2 — "What is the generic name of the cloud service that stores files as objects behind an HTTP API — the standard home for user uploads? (Type the generic name or a product.)" → `['object storage', 'blob storage', 's3', 'amazon s3', 'azure blob storage', 'blob']`.
    - craft-cloud-14 · mcq · d3 ★ — "Works locally, 502 from the load balancer in the cloud." Method: the platform's logs first; health-check path/port and grace period; the container listens on `0.0.0.0` and the expected port; env/secrets present; startup time vs health-check timeout.
- Counts: craft-git 22, craft-testing 24, craft-security 24, craft-shipping 23, craft-cloud 14.

### A11 — Craft ops (`questions/craft-ops.js`, `modules/craft-ops.js`) · 43 new
Owns `craft-observability`, `craft-appsec` (stage 9) and `craft-incidents` (stage 10). Use plan §6.9a blocks for observability and appsec and the §6.9b block for incidents as written with: replace `craft-obs-11` and `craft-inc-2` per §2.2; every `craft-inc-*` question tagged `senior`.
- Add **craft-appsec-15 · mcq · d3 ★** — Privacy by design for a CRUD SaaS (GDPR/UK GDPR/CCPA): collect only what you need, keep an inventory of where PII lives (including logs, analytics and backups), retention and deletion by design (hard delete or crypto-shredding of per-user keys), a data-subject export path, and PII kept out of logs. The ask: "how would you implement 'delete my account'?"
- Counts: craft-observability 14, craft-appsec 15, craft-incidents 14.

### A12 — Craft senior (`questions/craft-senior.js`, `modules/craft-senior.js`) · 44 new
Owns `craft-design`, `craft-architecture`, `craft-review`. Use plan §6.9b blocks as written with: replace `craft-arch-5` and `craft-review-8` per §2.2; every question tagged `senior`; the voice rules in §6.9b stand (grounded, CRUD-scale, the correct choice is the one a respected senior would defend and the `why` names the trade-off it accepts); at most one vocabulary `short` per module. Counts: craft-design 16, craft-architecture 14, craft-review 14.

---

## Appendix — verification artefacts
- `scratchpad/collide.mjs` — prefix/id collision check (clean for all 22 new prefixes; all 31 existing modules have ids 1–14).
- `scratchpad/existing-prompts.tsv` — all 434 existing prompts; `sweep.out`, `sweep2.out` — keyword overlap results used for the duplicate calls above.
- `scratchpad/dump.mjs` — module/objective dump and the answer-index histogram `{0:15, 1:363, 2:9, 3:2}`.
