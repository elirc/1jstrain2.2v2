# Contributing to Stack Ready

This is the working guide: how to run the app, what the gates check, how to add
content, and the rules a pull request is held to. For how the pieces fit
together, read [ARCHITECTURE.md](ARCHITECTURE.md). For the reasoning behind
individual decisions, read [`upskilling/`](upskilling/README.md).

## Setup

- **Node 24** (see [`.nvmrc`](.nvmrc); `nvm use` or `fnm use` picks it up).
  `engines` says `^22.22.2 || >=24.15.0`: the floor jsdom 30 sets for the client tests.
- `npm ci` at the root installs the three workspaces: `content`, `server`, `client`.
- Optional: copy `server/.env.example` to `server/.env`. The server loads it at boot
  with Node's built-in `process.loadEnvFile` (`server/src/config.js`); real
  environment variables win over the file.
- Optional: `npm ci --prefix jstrain` for the hands-on problem set. `jstrain/` is
  not a workspace; it has its own lockfile and its own vitest 2. Install it before
  running anything inside it, or `npx vitest` there walks up to the root's vitest 5
  and fails.

### Windows: line endings

The repo is LF everywhere ([`.gitattributes`](.gitattributes) says
`* text=auto eol=lf`), and Prettier checks for LF. If your clone predates
`.gitattributes`, your working tree is still CRLF (Git for Windows ships
`core.autocrlf=true` system-wide). Convert it once, with a clean tree:

```bash
git rm --cached -r -q . && git reset --hard
```

VS Code follows the file's line endings, and [`.editorconfig`](.editorconfig) sets
LF for new files.

## Scripts

| Command | What it runs |
| --- | --- |
| `npm run dev` | API on :3001 and the app on :5173 (Vite proxies `/api`) |
| `npm run build` | Regenerates `client/src/labs.generated.json`, type-checks, builds `client/dist` |
| `npm start` | Production mode; the API serves `client/dist` (run `npm run build` first) |
| `npm test` | Every workspace's vitest suite (`server`, `client`) |
| `npm run typecheck` | `tsc --noEmit` over the client |
| `npm run check:content` | `validateContent()` as the server runs it at boot, then counts. `-- --strict` fails on warnings too |
| `npm run content:stats` | Per-module type and difficulty mix, answer-position histogram, longest-choice and true/false tells |
| `npm run check` | The everyday gate: `check:content`, the server self-test and server tests, the client type-check and client tests |
| `npm run lint` / `lint:fix` | ESLint over the three workspaces |
| `npm run format` / `format:check` | Prettier over the repo (`*.md` excluded) |
| `npm run check:all` | `lint`, `format:check`, `check`, `build`: what CI runs, minus the bundle leak check |
| `npm run drills` / `drills:verify` | The `jstrain/` problem set, or its reference solutions |

While iterating on one area, run the narrow thing: `npm test -w server`,
`npm run test:watch -w client`, `npx vitest run test/srs.test.js` from `server/`.

## Tests

Each workspace owns its tests and its vitest config:

- `server/test/*.test.js`, configured by `server/vitest.config.js` (forks pool,
  `TZ=America/Los_Angeles` so the DST tests mean the same thing everywhere). Tests
  that open a store use a temp directory and call `store.close()` before deleting
  it, because Windows will not delete an open SQLite file.
- `client/src/**/*.test.{ts,tsx}`, configured by the `test` block in
  `client/vite.config.ts` (jsdom, Testing Library, `src/test/setup.ts`).
- `server/src/check.js` is the dependency-free smoke test. It is not a unit test
  suite; it is the one check that runs on a production install without dev
  dependencies. Do not port it into vitest, and do not grow it.

ADR-0016 in `upskilling/02-adrs/` records why the layout is per workspace.

## Adding content

Questions live in `content/questions/<track>.js`, grouped by module with
`deck(moduleId, trackId, [...])`; the README shows the `q({...})` shape. Rules:

- **Ids are forever.** A question id (and the choice ids derived from it) is
  stored in learners' progress. Never rename or reuse one; retire a question by
  deleting it.
- **Explanations name the choice, never its position.** Choices are shuffled on
  every serve, so "the second option" is wrong for most learners. This is a
  *problem* (the server will not start).
- **`output` questions need `code`.** Without a snippet, make it `mcq`.
- **The renderer is small.** Headings, flat lists, tables, fences, inline code,
  bold and italic. No links, images, blockquotes, rules, nested lists, or code
  inside bold. `validateContent()` rejects each one.

Run `npm run check:content` after every edit. Problems stop the server from
booting; warnings do not, but a PR should not add any. The warnings and their
thresholds (all in `LIMITS` and `KNOWN_LANGS` in [`content/lint.js`](content/lint.js)):

| Warning | Threshold |
| --- | --- |
| One answer index holds too many of a module's mcq/output keys | > 50% (module has ≥ 4) |
| ...or of the whole curriculum's | > 40% (≥ 20) |
| The key is the uniquely longest choice | > 50% of a module's mcq/output (≥ 8) |
| Booleans lean one way, per module / overall | > 80% one value (≥ 5) / rarer answer < 30% (≥ 10) |
| Duplicate question | same prompt and code, or same prompt with no code |
| Code or fence language unknown | not in `KNOWN_LANGS` (typo check) |
| Primer shape | 300–1,800 words, at least one `##` heading |
| Objectives | 3–6 per module |

`npm run content:stats` shows where a module stands on each tell before the lint
does. The target for "uniquely longest" is well under 40% per module: write
distractors as long and as plausible as the key.

### Adding a module

1. Add the module object (`id`, `trackId`, `title`, `blurb`, `estMinutes`,
   `objectives`, `primer`) to the track's file in `content/modules/`. A new
   author's file must also be spread into `content/modules/index.js`.
2. Add its questions as a `deck(...)` in `content/questions/`. A new file must
   be spread into `questions` in `content/index.js`.
3. List the module id in exactly one stage in `content/tracks.js`.
   `validateContent()` fails otherwise. While several authors add modules the
   stage list does not name yet, `CONTENT_PARTIAL=1 npm run check:content`
   downgrades that to a warning. Never set it when running the app.
4. If the module pairs with a `jstrain/` exercise, map it on the Code labs page.

## Lint rules

ESLint runs the recommended sets, `react-hooks/rules-of-hooks` and
`exhaustive-deps`, and one rule that matters: **the client may import only
types from the content package.** `import type { Module } from
'@jstrain/content'` is fine; a value import, a dynamic `import()`, or a relative
path into `content/` is an error, because it would bundle every answer key into
the browser. Tests (`*.test.*`, `client/src/test/`) are exempt; they are never
bundled. CI also scans the built bundle for explanation text. Details in
[`eslint.config.js`](eslint.config.js) and journal J04.

Style is Prettier's job (`.prettierrc.json`: single quotes, semicolons, trailing
commas, 120 columns, LF). There are no stylistic ESLint rules to argue with.
Formatting-only commits are listed in `.git-blame-ignore-revs`; run
`git config blame.ignoreRevsFile .git-blame-ignore-revs` once so `git blame`
skips them.

## The journal rule

A change that meets any trigger in
[`upskilling/04-journal/README.md`](upskilling/04-journal/README.md) (a
persisted shape, the API contract, a findings-register row, a dependency, tool or
CI step, an ADR decision, or more than ~150 lines of non-test code) ships with a
journal entry in the same PR, from
[`upskilling/_templates/journal-entry.md`](upskilling/_templates/journal-entry.md).
A decision that changes an ADR gets a new ADR that supersedes or amends it; an
accepted ADR's Decision is never rewritten. After editing entries, run
`node upskilling/_tools/build-index.mjs` to regenerate the index.

## Commits and pull requests

- Conventional commits, as the history already uses:
  `feat(server): ...`, `fix(client): ...`, `chore: ...`, `docs: ...`, scoped by
  workspace.
- One concern per commit. Formatting goes in its own commit, never mixed with a
  behaviour change, so it can be added to `.git-blame-ignore-revs`.
- `npm run check:all` passes locally before you push; CI runs the same steps on
  Ubuntu and Windows.
- Never commit `server/data/`, `.env`, or `client/dist/`; all three are ignored.
