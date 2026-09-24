# E08: Cut a release

Level: senior · Timebox: 1 h (plus CI time) · Touches: tooling
Ladder: B01, B16, B04 · Depends on: J05 (CI that runs what we ship), J18, J19, J21, and the Release list in `../07-checklists.md`

## Scenario

The refactor has landed and nobody has tagged anything since `6f1bf43`. A learner on the baseline build asks whether it is safe to update, and what they get. Cut the first release: make the version mean one thing, prove the build is the one CI tested, prove that a baseline learner's `progress.db` survives, and write down what changed.

## Deliverables

1. **The Release checklist, run item by item** on a clean clone with the Node version in `.nvmrc`. Paste the output of each command, or a short note for each manual step, into `release-notes.md` on your branch.
2. **One version across the four manifests.** Today `package.json` and `client/package.json` say `2.2.0`, while `server/package.json` and `content/package.json` say `1.0.0` (F-28), and `package-lock.json` records all four. Choose the number, and justify it in two sentences from what changed for a learner's data and for the API (ADR-0014 changed the answer contract; ADR-0017 versioned the schema).
3. **A changelog** built from the `landed` rows of `../04-journal/INDEX.md`, grouped by area. Entries `in review` are left out and listed as not included.
4. **A short-form journal entry** that closes F-28, with the next free J number. Run `node upskilling/_tools/register-status.mjs` and `node upskilling/_tools/build-index.mjs` afterwards.
5. **A local annotated tag** on the commit CI ran green. Do not push it; your reviewer does.

## Constraints

- The tag goes on a commit that `.github/workflows/ci.yml` passed on **both** `ubuntu-latest` and `windows-latest`. A green run on your machine is not evidence of either.
- `jstrain/` and `marketplace/` keep their own versions. They are outside the workspaces (ADR-0013).
- No new CI workflow in this exercise. Adding one is a journal trigger of its own.

## Starting points

- `../07-checklists.md` › Release
- `package.json` scripts `check`, `check:all` and `build`; `client/package.json` › `prebuild` / `pretest` (the Labs index)
- `.github/workflows/ci.yml` (the `REQUIRE_SQLITE: '1'` env and the answer-key step), `.github/workflows/drills.yml` (path-filtered)
- `.github/scripts/answer-key-leak.mjs`
- `server/src/store.js › migrate()` (working tree), which writes `progress.db.bak-v1`

## Done when

- `npm ci && npm run check:all` exits 0, and `REQUIRE_SQLITE=1 npm run check` exits 0.
- `node .github/scripts/answer-key-leak.mjs client/dist/assets` exits 0 after the build.
- A copy of a `progress.db` created by the baseline build opens with the release build. `/api/health` shows `storeBackend: "sqlite"` and `storeFallbackReason: null`, the old profile's attempts are all there, and `progress.db.bak-v1` exists.
- `grep '"version"'` over the four manifests prints one number, and `npm ci` still succeeds with the updated lockfile.
- You completed one drill with the keyboard only (digits, Enter, `0`, Tab to the order buttons), and your notes list anything that failed.
- `register-status.mjs --check` shows F-28 closed.

## Stretch

Write down what a learner on the release build does to go back to the baseline, and what they lose. Then say whether that belongs in the release notes, the README or nowhere.

<details><summary>Reviewer notes (open after attempting)</summary>

**A strong answer** builds the baseline `progress.db` with the baseline build itself (the worktree from the folder README, answer a few questions, stop it with Ctrl+C), not with a hand-written schema. It copies the file and does not move it. It picks one version for all four manifests because they ship and are tested as one unit, and it updates the lockfile with `npm install` rather than by hand. It says why the number is a major or a minor from the learner's side: the data upgrades with a backup, and the API broke only for the bundled client. The changelog leaves out J11, J33, J34, J35, J45 and J46 and says so.

**Common mistake:** running `check:all` and calling the release tested. `check:all` never runs the answer-key leak check (only CI does), never opens an old database, and does not prove the native binary loaded unless `REQUIRE_SQLITE=1` is set. A second one: bumping `server` and `content` to `2.2.0` so they "match", which reuses a number that already meant the baseline.

**What a senior also flags:** nothing builds a release artefact from the tag. CI runs on `main` and on pull requests, and `drills.yml` runs only when `jstrain/` changes. The tag is only as good as the commit it points at, so the notes should name the CI run. The rollback question from the stretch has a real answer: J19's backup is the way back, and every answer given since the upgrade is lost.
</details>
