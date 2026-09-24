# The journal: rules

The journal holds one entry per significant change to Stack Ready, written by the engineer who made the change, in the same PR as the change. [INDEX.md](INDEX.md) is generated from each entry's front matter. Do not edit it by hand.

## When an entry is required

Write an entry if your change does any of these:

- changes a persisted shape: a SQLite table or index, the JSON store file, or a question/choice id;
- changes the API contract: a request or response field, an error code, a status;
- closes a row in the [findings register](../10-findings-register.md);
- adds or removes a dependency, a tool or a CI step;
- changes a decision recorded in an ADR;
- touches more than ~150 lines of non-test code.

A PR that meets a trigger and has no entry does not merge. Typo fixes, test-only changes and copy edits that close no row need no entry.

## Naming and numbering

Name the file `Jnn-kebab-slug.md`. The number comes from the table below, so parallel work cannot collide. The date is a field inside the entry, not the name. Unplanned work takes the next free number from J38. If two changes land under one planned number, split them as `J12` and `J12b` and tell the owner of the next entry.

Front matter (all seven keys are required; `build-index.mjs` rejects the file otherwise):

```yaml
---
id: J08
title: Record the card and the attempt in one transaction
area: server
closes: [F-02, F-03]
ladder: [B05, B09]
adrs: [0003 unchanged]
status: draft
---
```

## Short form

A fix under ~30 lines that closes a single S3 row may use only **Symptom**, **Root cause** and **Verification**, in 300 words or fewer. It still needs the anchor, the quoted lines, and a test that fails before and passes after. Entries marked "short" in the plan below qualify. Nothing else does without the reviewer's agreement.

## After it lands

Once `status: landed`, an entry is **immutable**. The code will move on, and the entry stays a true record of what was true at its commit. If you later learn it was wrong, append a section:

```markdown
## Update 2026-10-14
J19 dropped the index this entry said was harmless. See J19 › Root cause.
```

Never rewrite the original text, and never re-quote old code to match new code.

## The review gate

A reviewer answers each item below yes or no, runs at least one command from Verification, and returns one verdict: **accept**, **revise** (list the failed numbers) or **reject** (wrong or not grounded). Then run `node upskilling/_tools/build-index.mjs`. It must exit 0.

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

## The planned entries

Order: tooling first (nothing changes behaviour until it is pinned), then server correctness in dependency order, client hotfixes, client foundations, the drill rewrite, content, features. Owner: T tooling, S server, C client, K content.

| # | Title | Owner | Form | Closes |
|---|---|---|---|---|
| J01 | Pin what is true before changing it | T | full | F-23 (part) |
| J02 | Line endings, the Node floor and the scripts npm is about to block | T | full | M-15 |
| J03 | Rules before content: `lint.js`, `stats.js`, four `output` questions with no code | T | full | – |
| J04 | ESLint, Prettier, and the one rule that matters | T | full | F-16 |
| J05 | CI that runs what we ship | T | short | F-23 |
| J06 | `createApp()` apart from `listen()`, and an injectable clock | S | full | F-09 (part) |
| J07 | Injecting randomness and the duplicate card in the daily mix | S | full | F-05, F-09 |
| J08 | `recordAnswer()`: the card and the attempt in one transaction (seed example) | S | full | F-02, F-03 |
| J09 | Malformed is not wrong: `400 invalid_response` | S | full | M-02 |
| J10 | What "spaced" means: an early correct answer is practice | S | full | F-01, F-07 (server) |
| J11 | Rewriting the `why` texts that name a position | K | short | M-01 (part) |
| J12 | Shuffle the choices, grade by choice id | S (+C) | full | M-01 |
| J13 | Validate at the boundary and tell the truth in error codes | S | full | F-14, F-29 |
| J14 | XP that decreases after a year | S | full | F-08 |
| J15 | Accuracy over 100%: orphaned states and ids as a contract | S | full | F-10 |
| J16 | Streaks across DST | S | full | F-24 |
| J17 | The daily mix starves reviews | S | full | M-08 |
| J18 | Fall back only when the binary is missing | S | full | M-03 |
| J19 | A schema version and the first migration | S | full | F-06, F-11 |
| J20 | One contract suite, two backends | S | full | F-13 |
| J21 | Operability: loopback, shutdown, `.env` | S | full | F-21, F-22, M-04, M-15 (part) |
| J22 | Measuring before optimising: the N+1 that did not matter | S | short | F-04 |
| J23 | Hotfix: "Another round" and the URL nobody subscribed to | C | full | F-12 |
| J24 | The Markdown renderer terminates, and bold can contain code | C | full | F-27, M-05, M-13 (part) |
| J25 | The stolen Enter key | C | full | M-07 |
| J26 | Small fixes from the first client PR | C | short | M-13 (rest), M-16 (part) |
| J27 | The API client stops trusting the envelope | C | full | F-20 |
| J28 | Boot errors are not background errors, and the stale profile id | C | full | F-17, F-18, F-26, M-06 |
| J29 | Routes: a layout route, errors inside the shell, titles | C | short | – |
| J30 | The drill as a state machine | C | full | F-07 (client), F-12 |
| J31 | Order questions a keyboard user can reorder | C | full | F-15 |
| J32 | Progress refreshes when it should, and milestone toasts | C | short | M-14 |
| J33 | Eleven wrong answers and how we found them | K | full | M-11 |
| J34 | The longest choice is the answer | K | full | M-12 |
| J35 | The stage gate: `after`, and splitting C# from .NET | K (+S) | full | – |
| J36 | Stages 9 and 10: what "senior" content is, and what we refused | K | full | – |
| J37 | Doubling the deck without renaming an id | K | full | F-19, F-30 |
| J38+ | Features: flags, settings, export/import, question history | S/C | full | – |

The full brief for each entry is in [`../_audits/2026-09-23-upskilling.review.md`](../_audits/2026-09-23-upskilling.review.md) §5.2.
