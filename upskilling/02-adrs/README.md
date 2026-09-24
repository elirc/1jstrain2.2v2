# Architecture decision records

An ADR records one decision that someone would otherwise have to reverse-engineer from the code: what was chosen, what it cost, and the observable trigger for changing it. ADRs 0001–0013 were written after the fact from commit `6f1bf43`, the baseline before the refactor. ADRs 0014–0018 are written by the journal entry that makes the decision, in the same pull request as the change.

Read them in number order the first time. After that, use them as a lookup: when a review comment says "that contradicts ADR-0006", this is where you check.

## Index

| # | Decision | Status | Date | Amended by | Superseded by |
|---|---|---|---|---|---|
| [0001](0001-one-copy-of-content-as-plain-esm.md) | Keep one copy of the content, as plain ESM | accepted | 2026-09-23 | — | — |
| [0002](0002-grade-on-the-server-never-ship-the-key.md) | Grade on the server; never ship the key | accepted, amended | 2026-09-23 | ADR-0014 | — |
| [0003](0003-sqlite-with-json-fallback.md) | Store progress in SQLite, with a JSON file as the fallback | accepted, amended | 2026-09-23 | ADR-0018 | — |
| [0004](0004-xp-and-level-are-derived.md) | Derive XP and level from the attempt log | accepted, amended | 2026-09-23 | J14 | — |
| [0005](0005-markdown-to-react-elements.md) | Render markdown to React elements with a home-grown parser | accepted | 2026-09-23 | — (J24 keeps it) | — |
| [0006](0006-profile-as-a-header-not-auth.md) | Identify the learner with a header, not with authentication | accepted, amended | 2026-09-23 | J21 | — |
| [0007](0007-envelope-and-one-error-translator.md) | One envelope, one error translator | accepted | 2026-09-23 | — (J13, J27 fix defects inside it) | — |
| [0008](0008-content-validates-at-import-and-boot.md) | Validate content at import and at boot | accepted | 2026-09-23 | — | — |
| [0009](0009-trimmed-sm2-mastery-is-two-reps.md) | Trimmed SM-2; mastery is two reps | accepted, amended | 2026-09-23 | ADR-0015 | — |
| [0010](0010-react-context-for-app-state.md) | Hold app-wide state in one React context | accepted | 2026-09-23 | — (J28 splits the error state) | — |
| [0011](0011-same-origin-everywhere.md) | Serve the API and the app from one origin | accepted | 2026-09-23 | — | — |
| [0012](0012-dependency-free-self-test.md) | Test the server with one dependency-free script | **superseded** | 2026-09-23 | — | ADR-0016 |
| [0013](0013-npm-workspaces-jstrain-outside.md) | npm workspaces for the app, `jstrain/` outside | accepted | 2026-09-23 | — | — |
| [0014](0014-choice-ids-are-the-answer-contract.md) | Choice ids are the answer contract (amends 0002; written with J12) | accepted | 2026-09-23 | — | — |
| [0015](0015-an-early-correct-answer-is-practice.md) | An early correct answer is practice (amends 0009; written with J10) | accepted | 2026-09-23 | — | — |
| [0016](0016-vitest-per-workspace-check-js-stays-smoke.md) | Vitest per workspace; `check.js` stays the smoke test (supersedes 0012; written with J01) | accepted | 2026-09-24 | — | — |
| [0017](0017-schema-versions-and-migrations.md) | Version the schema with `PRAGMA user_version` and migrate forward only (written with J19) | accepted | 2026-09-23 | — | — |
| [0018](0018-fall-back-only-when-the-binary-is-missing.md) | Fall back to JSON only when the binary is missing (amends 0003; written with J18) | accepted | 2026-09-23 | — | — |

"Amended by Jnn" means a journal entry changed part of the decision without a new ADR. The entry says which part.

## The rules

1. **Never rewrite an accepted ADR's Decision.** To change it, write a new ADR and set `superseded-by` on the old one, as 0012 does. To narrow it, write a new ADR and set `amended-by`, as 0003 → 0018 does.
2. **Consequences name the defect the decision's cost produced**, with the register id from [`../10-findings-register.md`](../10-findings-register.md). A decision can be right and still have a bug inside it. 0003 and M-03 are the example.
3. **"Revisit when" lists triggers you can observe**, such as a config value, a measurement or a request. "When it becomes a problem" is not a trigger.
4. **The anchors are checked.** `node upskilling/_tools/build-index.mjs` resolves every `path › symbol @ sha` against git.

The template is [`../_templates/adr.md`](../_templates/adr.md). File names are `NNNN-kebab-title.md`, and numbers are never reused.
