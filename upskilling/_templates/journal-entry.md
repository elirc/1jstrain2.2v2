---
id: Jnn
title: <Imperative title, same text as the H1>
area: server | client | content | tooling
closes: [F-02, F-03]
ladder: [B05]
adrs: [0003 unchanged]
status: draft | in review | landed
---

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

<!--
Front matter rules (read by upskilling/_tools/build-index.mjs, which rewrites 04-journal/INDEX.md):
- id: J plus two digits, from the numbered list in 04-journal/README.md. The file is named <id>-<slug>.md.
- title: plain text, no Markdown. Same wording as the H1.
- area: one of server, client, content, tooling (two joined with "+" if the entry really spans both, e.g. server+client).
- closes / ladder / adrs: inline YAML lists, [] when empty. ADR items read "0014 new", "0003 amended", "0012 superseded by 0016", "0005 unchanged".
- status: draft while writing, "in review" once the PR is open, "landed" once merged. After "landed" the entry is immutable except for "Update:" addenda at the end.
- Anchors in the body use `path › symbol @ sha` (optionally `(Lx–y @ sha)`); the tool checks that `git show sha:path` contains symbol.

Short-form allowance: a fix under ~30 lines that closes one S3 row may use only Symptom, Root cause,
Verification, ≤300 words. It still needs the anchor and the failing-then-passing test.
Delete this comment in your entry.
-->
