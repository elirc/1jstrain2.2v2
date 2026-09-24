---
id: J02
title: Line endings, the Node floor and the scripts npm is about to block
area: tooling
closes: [M-15]
ladder: [B16, B01]
adrs: [0003 unchanged, 0018 unchanged]
status: landed
---

# Line endings, the Node floor and the scripts npm is about to block

Date 2026-09-24 · Author Claude (tooling implementer) · Area tooling · Commit uncommitted working tree (baseline 6f1bf43)
Closes M-15 (the Node floor and `allowScripts`; the `.env` half is J21) · Ladder B16, B01 · ADRs 0003 unchanged, 0018 unchanged

## Symptom
Three things that were true on the dev box and would have bitten the first CI run or the next `npm update`:

- **Every text file is CRLF on disk and LF in the index.** `git config --show-origin core.autocrlf` prints `file:C:/Program Files/Git/etc/gitconfig	true`: Git for Windows sets it system-wide. At the baseline `git ls-files --eol` showed 256 files `i/lf w/crlf`. Today the tree is mixed: 224 tracked files are still `w/crlf`, while the files the other implementers wrote this week are LF (26 `w/lf`, one `w/mixed`). Prettier's default `endOfLine: "lf"` flags every CRLF file on Windows and none on Linux.
- **`engines.node` was `>=20`.** Node 20 reached end of life on 2026-04-30, and the test stack does not run on it.
- **The install-script approvals were pinned to versions.** npm 11.17 prints unreviewed install scripts as an advisory and its docs say a future release will block them. A pinned approval stops matching after the next `npm update`.

## Root cause
`package.json › allowScripts (L27–33 @ 6f1bf43)`
```json
"engines": {
  "node": ">=20"
},
"allowScripts": {
  "esbuild@0.28.2": true,
  "better-sqlite3@12.11.1": true
}
```
The approvals matter more than they look. `better-sqlite3` is an optional dependency, and the store falls back to a JSON file when the native binary cannot be loaded (ADR-0003, narrowed by ADR-0018). If npm ever skips its install script, nothing fails: the app starts, `/api/health` says `json`, and a learner's progress goes into a file that was meant only for broken machines. The invariant: *on a supported install, the native build runs and the SQLite backend loads, and a deviation fails loudly.* Line endings break a different invariant: *the bytes Prettier checks are the bytes git stores, on every OS.*

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing today | The first Windows CI leg or `npm update` finds each of these for us, the sqlite one silently. |
| B | Tell contributors to set `core.autocrlf=false`, and add `.npmrc` `engine-strict=true` | A README paragraph | Per-machine settings drift. `engine-strict` also fails on transitive engines (jsdom on Node 24.14), a support cost with no upside once CI pins Node. |
| C | `.gitattributes` `eol=lf`, `.editorconfig`, `.nvmrc`, an exact `engines` range, name-only approvals | Five small files | chosen |

## Decision and trade-off
I chose C. The repository now says what it wants instead of each machine deciding:

```
# .gitattributes
* text=auto eol=lf
*.png binary
*.ico binary
*.db binary
```

`.editorconfig` sets `end_of_line = lf` for editors, and `.prettierrc.json` sets `"endOfLine": "lf"`. `.nvmrc` is `24`, which CI also reads. For `engines` I did not copy the review's `>=22.22.0`: the installed `jsdom` declares `"node":"^22.22.2 || ^24.15.0 || >=26.0.0"`, so the honest floor is `^22.22.2 || >=24.15.0`. The approvals were rewritten by npm itself with `npm approve-scripts --no-allow-scripts-pin better-sqlite3 esbuild`, giving `"better-sqlite3": true, "esbuild": true`.

What it gives up: a name-only approval trusts every future version of those two packages to run install scripts, and existing clones have to re-check out once. Both packages are pinned by the lockfile and reviewed on update. Revisit if npm ships the blocking release (then add `strict-allow-scripts=true` in CI) or a third dependency with install scripts arrives.

## The change
Six new root files (`.gitattributes`, `.editorconfig`, `.nvmrc`, `.prettierrc.json`, `.prettierignore`, `.git-blame-ignore-revs`) and two `package.json` keys. The renormalise is deferred to the phase-2 commit, after the other implementers' edits land, so the only whitespace churn is one commit: `git add --renormalize .` there should be a no-op for the index (it is already LF); the working trees are what change. CONTRIBUTING gives existing clones the one-time `git rm --cached -r -q . && git reset --hard`.

## Verification
1. `npx prettier --list-different .` lists 83 files; with `--end-of-line auto` it lists 79. The difference is the four files whose only problem is CRLF; after `.gitattributes` and a re-checkout both counts converge.
2. `node -e "console.log(require('./package.json').allowScripts)"` → `{ 'better-sqlite3': true, esbuild: true }`, and `npm approve-scripts --allow-scripts-pending` → `No packages with unreviewed install scripts.`
3. The sqlite guard: `server/test/store.test.js` asserts `expect(real.backend).toBe('sqlite')` from a real `createStore()`, so a lost native build fails `npm run check` on any machine that runs the suite; CI sets `REQUIRE_SQLITE=1` for `check.js` as well (J05).

## What a senior reviewer would ask
- *Why not `core.autocrlf=input` in CONTRIBUTING?* It is per-machine and this machine's setting is system-wide. `.gitattributes` wins over both, for every clone.
- *Does `eol=lf` break Windows tools?* Not the ones used here: VS Code, Node, npm and Git Bash all read LF. `.cmd` or `.bat` files would need `eol=crlf`; there are none.
- *Why not `engine-strict`?* It fails installs on transitive engines mismatches; `.nvmrc` and CI enforce the version instead.

## The junior version of this fix
Make the local check green with `"endOfLine": "auto"` in `.prettierrc.json`. It looks harmless: one line, nothing else changes. But the one `w/mixed` file stays mixed, a contributor with `core.autocrlf=false` can now commit CRLF into the index where the Linux CI leg sees it, and the format check no longer checks what the rest of the tooling assumes.

## Follow-ups
- [ ] Phase-2 commit: `git add --renormalize .`, then the format commit, then its SHA in `.git-blame-ignore-revs` → J04
- [ ] `strict-allow-scripts=true` in CI when npm's blocking release ships → J05 follow-up
