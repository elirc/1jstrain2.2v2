---
id: J05
title: CI that runs what we ship
area: tooling
closes: [F-23]
ladder: [B16, B01]
adrs: [0002 unchanged, 0018 unchanged]
status: landed
---

# CI that runs what we ship

Date 2026-09-24 · Author Claude (tooling implementer) · Area tooling · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-23 (with J01) · Ladder B16, B01 · ADRs 0002 unchanged, 0018 unchanged

## Symptom
`server/src/check.js › runs it in CI (L4 @ 6f1bf43)` says "`npm run check` runs it in CI". At the baseline `git ls-files .github` printed nothing: there was no CI, so every gate in J01–J04 ran only when someone remembered, and only on the Windows dev box.

## Root cause
The gates existed as scripts but nothing ran them on a clean machine. Three failures only a clean machine shows: a native `better-sqlite3` build that silently falls back to JSON (ADR-0018), CRLF or LF drift between operating systems (J02), and a content import that bundles the answer keys (J04). The invariant: *every push to `main` and every pull request runs the same gate a contributor runs, on the OS the app is developed on and the one it is deployed on.*

## The change
`.github/workflows/ci.yml`, one job `app`, matrix `ubuntu-latest` and `windows-latest`, `fail-fast: false`, 20-minute timeout, `shell: bash` on both (Windows defaults to PowerShell), Node from `.nvmrc`, npm cache, `concurrency` that cancels superseded PR runs but never `main`:

```yaml
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - name: Content, server self-test and tests, client typecheck and tests
        run: npm run check
        env:
          REQUIRE_SQLITE: '1'
      - run: npm run build
      - name: Answer keys must not be in the client bundle
        run: node .github/scripts/answer-key-leak.mjs client/dist/assets
```

`answer-key-leak.mjs` builds its needles from the content itself: two error strings found only in `content/schema.js`, plus the longest plain-text run of every question's `why`, so a rewritten explanation cannot weaken it. `.github/workflows/drills.yml` runs `jstrain/`'s `verify:solutions` and `verify:solutions:types` on Ubuntu, only when `jstrain/**`, the workflow or `.nvmrc` change, with its own lockfile cache. Actions are `checkout@v7` and `setup-node@v7`.

## Verification
1. Leak check against a real `vite build` in a scratch directory: `1 bundle file(s) clean against 1049 needles`. With three questions appended to the bundle: `::error::@jstrain/content was bundled into the client (3 match(es))`, exit 1.
2. Every step passes locally: `npm run check` (J01), `lint` 0 errors (J04). `format:check` fails until the phase-2 format commit (83 files), so CI goes green with that commit, not before.
3. `REQUIRE_SQLITE`: `server/test/store.test.js` already fails when the native backend does not load; `check.js` reads the variable once the phase-2 guard lands (J01 follow-up).

## Update 2026-09-24
Both pending items are closed in the working tree. The `check.js` guard exists (J01 Update), and the format pass (J04 Update) makes `format:check` pass. Locally, `REQUIRE_SQLITE=1 npm run check:all` exits 0, and the leak check against that build prints `1 bundle file(s) clean against 1049 needles`.
