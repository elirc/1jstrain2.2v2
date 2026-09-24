---
id: J04
title: ESLint, Prettier, and the one rule that matters
area: tooling
closes: [F-16]
ladder: [B02, B06, B14]
adrs: [0001 unchanged, 0002 unchanged]
status: landed
---

# ESLint, Prettier, and the one rule that matters

Date 2026-09-24 · Author Claude (tooling implementer) · Area tooling · Commit uncommitted working tree (baseline 6f1bf43); format commit pending (phase 2)
Closes F-16 (the guard, not the `SessionMode` duplication) · Ladder B02, B06, B14 · ADRs 0001 unchanged, 0002 unchanged

## Symptom
The README promises that answers never reach the browser (ADR-0002). At the baseline that promise rested on one line being written a particular way:

`client/src/lib/types.ts › import type (L10 @ 6f1bf43)`
```ts
import type { Module, PublicQuestion, Stage, Track, TrackId } from '@jstrain/content';
```

`import type` is erased at compile time, so Vite never bundles the content package. Delete the word `type`, or import `publicQuestion` because it looks handy, and every question with its `answer` and `why` ships in the client bundle. `tsc` is happy, the app works, every test passes. Nothing would have noticed. The repository also had no linter at all, although `server/src/index.js` already carried an `eslint-disable` comment for one.

## Root cause
ADR-0001 chose one copy of the content, imported by both halves. Its cost, written down there, is that the client *can* import the keys and nothing enforced types-only. The invariant: *no module under `client/src` that ships to the browser holds a value reference to the content package, by name, by relative path or by dynamic import.* That is a property of import statements, which is exactly what a linter can check and a type checker cannot.

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing; rely on review | Nothing | One reviewer missing one word leaks the key, silently. |
| B | Split content into `@jstrain/content-types` and `@jstrain/content` | A package, a build or duplicated declarations | Solves it structurally but breaks ADR-0001's "no generated JSON, no build step". |
| C | ESLint with the recommended sets plus a restricted-imports guard, Prettier for style, a bundle scan in CI | Seven dev dependencies, one config | chosen |

## Decision and trade-off
I chose C and kept the rule set small: `@eslint/js` recommended, `typescript-eslint` recommended (not type-aware; `tsc --strict` already runs), two `react-hooks` rules set by hand because the v7 presets add React Compiler rules that fire on this client's synchronous setState-in-effect pattern, and `eslint-config-prettier` last. ESLint is `^9.39.5` as agreed; npm now prints "no longer supported" for 9.x, and every plugin here accepts 10, so the bump is one line when someone owns it. What I gave up: style arguments in review. Prettier owns style at 120 columns, which the dx review measured as the lower-churn width.

The guard, from `eslint.config.js › no-restricted-imports` (working tree):

```js
'@typescript-eslint/no-restricted-imports': ['error', {
  paths: [{ name: '@jstrain/content', allowTypeImports: true,
            message: 'Import types only; answers must never be bundled into the client.' }],
  patterns: [{ regex: '(^|/)content(/|$)', allowTypeImports: true,
               message: 'Do not reach into the content package by path; import types only.' }],
}],
'no-restricted-syntax': ['error', {
  selector: 'ImportExpression > Literal[value=/(^|\\W)content(\\W|$)/]',
  message: 'A dynamic import of @jstrain/content (or content/ by path) would bundle the answer keys.',
}],
```

The typescript-eslint version of the rule is required: the base rule has no `allowTypeImports`. The `patterns` entry closes the relative-path hole and the selector closes the dynamic-import hole; esquery regexes cannot contain `/`, hence `\W`. Tests (`client/src/**/*.test.*`, `client/src/test/**`) are exempt, because `Markdown.test.tsx` and `Code.test.ts` legitimately read the real curriculum and are never bundled.

## The change
New: `eslint.config.js`, `.prettierrc.json` (`singleQuote`, `semi`, `trailingComma: "all"`, `printWidth: 120`, `endOfLine: "lf"`), `.prettierignore` (dependencies, builds, `client/src/labs.generated.json`, `jstrain`, `marketplace`, `upskilling/_audits`, `*.md`), `.git-blame-ignore-revs`, and root scripts `lint`, `lint:fix`, `format`, `format:check`. No source file was edited in this change: the reformat is one separate commit (phase 2), so its SHA can go into `.git-blame-ignore-revs` and `git blame` skips it.

## Verification
1. The guard, checked with `ESLint#lintText` on synthetic files under `client/src/lib/`: `import type … from '@jstrain/content'` and `import type … from '../../../content/types'` are clean; a value import by name, by `'../../../content'` or `'../../../content/index.js'`, and `import('@jstrain/content')` or `import('../../../content/index.js')` are each an error; the same value import in `x.test.ts` or `client/src/test/x.ts` is clean.
2. `npx eslint .` over 103 files: client 40 files, content 32, server 29, `eslint.config.js`, and `upskilling/_tools/build-index.mjs`: **0 errors, 1 warning**, the now-unused `eslint-disable-next-line no-unused-vars` at `server/src/app.js:88` (its `next` is called). `lint:fix` removes it in phase 2.
3. `npx prettier --check .`: 83 files would change (client 29, content 33, server 20, upskilling 1), about 3,000 changed lines (added plus removed), two-thirds of them in `content/` (1,958), mostly question objects rewrapping at 120 columns. `client/src/pages/LabsPage.tsx` alone accounts for ~200 lines, its `TRACKS` and `READING` tables exploding into one property per line.

## What a senior reviewer would ask
- *Could the rule be bypassed with `// eslint-disable`?* Yes, deliberately, and visibly in review. CI's bundle scan (J05) catches what a disable comment lets through.
- *Why not type-aware linting?* It builds a TypeScript program on every lint run, which is slow, to catch what `tsc --strict` with `noUnusedLocals` already catches in `check`.
- *Why format in a separate commit rather than now?* Other implementers were editing the same files while this landed; formatting under them would have turned every one of their diffs into a conflict.

## The junior version of this fix
`no-restricted-imports` from core ESLint with `paths: ['@jstrain/content']`. It fails on the legitimate `import type` in `types.ts`, so it gets an `eslint-disable` on day one, and it never looked at relative paths or `import()` anyway.

## Follow-ups
- [ ] Phase 2: `git add --renormalize .`, `npm run format`, `npm run lint:fix`, `// prettier-ignore` above `TRACKS` and `READING` in `LabsPage.tsx`, commit alone, then record its SHA in `.git-blame-ignore-revs` → this entry's Update
- [ ] ESLint 10 → one-line bump, owner unassigned

## Update 2026-09-24
Phase 2 ran once the other implementers had finished. The format was applied **in the working tree, not committed**: nobody has asked for a commit yet. `npm run format` rewrote 84 files (client 30, content 32, server 22); `upskilling/` is now excluded from Prettier entirely, so code quoted in journal entries and ADRs stays byte-exact. `// prettier-ignore` sits above `TRACKS` and `READING` in `client/src/pages/LabsPage.tsx`; it must be the bare directive, because `// prettier-ignore: reason` is not recognised, so the reason is on the line above. `npm run lint:fix` removed the stale `eslint-disable-next-line no-unused-vars` in `server/src/app.js` and left a whitespace-only line, which I deleted. `npx eslint .` is now 0 errors, 0 warnings; `prettier --check .` passes; `npm run check:all` passes with `REQUIRE_SQLITE=1`.

Still to do at commit time: `git add --renormalize .` and the formatted files go in a commit of their own, containing no behaviour change, and that commit's SHA goes into `.git-blame-ignore-revs` in the next commit. The placeholder comment in that file says the same.
