# Checklists

Only items that name a file, a command or a finding in this repo. If an item could apply to any project, it was cut. Where a command does not exist yet, the entry that adds it is named in brackets.

## Pull request

- [ ] One logical change. A reformat, a rename or a dependency bump is its own PR.
- [ ] A journal entry exists if any trigger in [`04-journal/README.md`](04-journal/README.md) applies, and `node upskilling/_tools/build-index.mjs` exits 0.
- [ ] Register rows closed by this PR say `closed (Jnn)` in [`10-findings-register.md`](10-findings-register.md).
- [ ] The new test fails at the parent commit. Paste the failure into the entry.
- [ ] `npm run check` ends with `All checks passed.`. `npm test` and `npm run lint` pass (from J01 and J04).
- [ ] Store changes are implemented in **both** `createSqliteStore` and `createJsonStore`, and covered by the two-backend suite (J20).
- [ ] Schema changes go through the migration runner (J19), never an edited `CREATE TABLE`.
- [ ] Any API change updates `client/src/lib/types.ts` and the API table in `README.md` in the same PR.
- [ ] Every new route that returns questions goes through `publicQuestion()` and shuffles choices (J12).
- [ ] The client imports only types from `@jstrain/content`.
- [ ] No question id is renamed or removed (`git diff` over `content/questions/`).
- [ ] Any ADR whose decision changed is amended or superseded in this PR.
- [ ] UI changes: a keyboard-only run of the affected flow, with no focus lost to `<body>`, and a screenshot at 375 px.

## Release

- [ ] `npm ci` on the Node version in `.nvmrc` (J02), then `npm run check:all`.
- [ ] `REQUIRE_SQLITE=1 npm run check` passes, which proves the native binary loaded rather than silently falling back (J01, J05).
- [ ] Start the release build against a copy of a baseline-era `server/data/progress.db`. `/api/health` reports `storeBackend: "sqlite"` and `storeFallbackReason: null` (J18), and the old profile's progress is intact.
- [ ] The migration left a `progress.db.bak-v<from>` behind (J19).
- [ ] `/api/health` content counts match `npm run check:content`.
- [ ] `npm start` after `npm run build` serves the client, and `/api` (no slash) returns JSON 404, not HTML (M-10).
- [ ] The server binds `127.0.0.1` unless `HOST` says otherwise (J21).
- [ ] Ctrl+C leaves no `progress.db-wal` in `server/data/` (J21).
- [ ] The version is bumped in all **four** manifests: root, `content/`, `server/`, `client/` (F-28).
- [ ] The changelog is built from `04-journal/INDEX.md` rows landed since the last tag.
- [ ] Tag.

## Content change

- [ ] No existing `id`, `moduleId` or `trackId` changes. Learner history keys on them, and nothing stores stage ids.
- [ ] New ids use the module's **id prefix**, which differs from the module id for nine modules (for example, `craft-security` uses `craft-sec-`). The next free number is 15 for every existing module.
- [ ] `npm run check:content` passes, including the `lint.js` rules (J03): no `output` question without `code`, `why` at least 120 characters, and no duplicate prompt plus code.
- [ ] The key is not the unique longest choice, and distractors are plausible misconceptions of the same length (M-12).
- [ ] No `why` names a choice by position ("Option 3…"). Choices are shuffled on every serve (J11, J12).
- [ ] Boolean questions are not all `false`. Check the module's true/false split.
- [ ] Every claim about a tool's behaviour was checked against the tool (`tsc --strict`, the Node version in `.nvmrc`, the changelog), not memory (J33).
- [ ] Primer text uses only the Markdown subset the renderer supports (J24): no links, no nested lists, no blockquotes.
- [ ] `lang` is set explicitly on craft and senior-stage code (`defaultLang('craft')` is `js`).
- [ ] README and Dashboard counts are derived, not typed (J37).
