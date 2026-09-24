# Upskilling: from junior to senior on Stack Ready

This folder teaches the judgement a senior engineer brings to a codebase, using one codebase: this one. Every guide, decision record and journal entry is about a real line in `server/`, `client/` or `content/`, quoted at a named commit. Nothing here would make sense pasted into another repository, and that is on purpose.

The app itself teaches a junior to mid level through questions. This folder covers the part the questions cannot: why the answer write in `server/src/routes/api.js › POST /answers @ 6f1bf43` needs a transaction, why "always press 2" scored 93% until the choices were shuffled, and why the first fix you think of is usually the one that passes review and is still wrong.

## What this folder is not

- **Not a JavaScript tutorial.** If a sentence here explains what `.map` returns or what a closure is, it is a defect. Syntax lives in `content/modules/` (the primers) and in `jstrain/` (the problem set). Link to them instead.
- **Not a mirror of the source tree.** Walkthroughs are organised by concept (the request lifecycle, the scheduler, progress derivation), so they survive files being renamed.
- **Not a place for new findings without evidence.** Defects come from the audits in [`_audits/`](_audits/), which carry the reproductions. The [findings register](10-findings-register.md) points at them and does not restate them.

## The baseline

Every "before" in this folder refers to commit **`6f1bf43`** (main, 2026-09-23), the last commit before the refactor. The five audits in `_audits/` were written against it and are frozen. The working tree has moved on since. When you want to see a bug with your own eyes, check out the baseline next to your working copy:

```bash
git worktree add ../stack-ready-6f1bf43 6f1bf43
cd ../stack-ready-6f1bf43 && npm ci
```

## Your 30/60/90 days

**Days 1–30: read, and prove what you read.**
1. Work through [`01-reading-the-codebase.md`](01-reading-the-codebase.md), all 12 stops. Write your answers down; the prove-it commands tell you whether they are right.
2. Read walkthroughs 01, 02, 04 and 06 in `03-walkthroughs/`.
3. Do [E01](05-exercises/E01-trace-an-answer-end-to-end.md): trace one answer from keypress to SQLite row to dashboard number.
4. Read journal entries J01 to J10 in order, starting with J08, the seed example.

**Days 31–60: read the decisions, then change code under supervision.**
1. Read ADRs 0001–0013 in `02-adrs/`, then the five the refactor wrote (0014–0018). For each, find the line of code that enforces it, or confirm that nothing does.
2. Read the rest of the journal, J11 to J46, in the order of [`04-journal/INDEX.md`](04-journal/INDEX.md). For each entry, before you read its Decision section, write down which option you would have picked.
3. Do [E05](05-exercises/E05-review-this-diff.md) (review a planted diff), then [E04](05-exercises/E04-measure-progress-and-module.md) (measure before optimising) and [E03](05-exercises/E03-write-migration-n-plus-1.md) (the next migration).

**Days 61–90: make a decision and write it down.**
1. Take a row the [register](10-findings-register.md) still lists as `open` or `partial` (its "Reconciliation 2026-09-24" section says why each one is), or a follow-up from a landed entry, and ship it with its journal entry. It must pass the 15-item checklist in [`04-journal/README.md`](04-journal/README.md).
2. Do [E06](05-exercises/E06-postmortem-accuracy-104.md) (a postmortem) and [E02](05-exercises/E02-add-a-question-type.md) (a new question type), then [E07](05-exercises/E07-design-the-multi-user-version.md) (the multi-user RFC) and [E08](05-exercises/E08-cut-a-release.md) (the first release). The suggested order and the reasons for it are in [`05-exercises/README.md`](05-exercises/README.md).
3. Review someone else's PR using [`06-code-review-guide.md`](06-code-review-guide.md). Then check yourself against [`00-ladder.md`](00-ladder.md): pick three behaviours and find evidence for each in your own PRs.

## How to add a journal entry, in five steps

1. **Take your number.** The planned entries J01–J37 are listed in [`04-journal/README.md`](04-journal/README.md), and J38–J46 were taken by the features and review fixes that followed. A new change takes the next free number, which is **J47** as of 2026-09-24; [`04-journal/INDEX.md`](04-journal/INDEX.md) shows the last one taken.
2. **Copy the template.** Copy `_templates/journal-entry.md` to `04-journal/Jnn-kebab-slug.md` and fill in the front matter (`id`, `title`, `area`, `closes`, `ladder`, `adrs`, `status: draft`).
3. **Reproduce first.** Show the symptom at `6f1bf43` and write the test that fails there, before you write the fix. Paste the failure message into Verification.
4. **Close the loop in the same PR.** List the register rows you close under `closes:`, and say in the "Closes" byline if you close only part of one. Amend or supersede any ADR whose decision changed. When the entry reaches `status: landed`, run `node upskilling/_tools/register-status.mjs`. It sets the register's Status column from the entries (`closed (Jnn)`, `partial (Jnn)` or `open`), so never edit that column by hand. If a row stays open or partial, or is now closed by two entries, add a line to the register's latest Reconciliation section.
5. **Build the index and check both.** Run `node upskilling/_tools/build-index.mjs`. It rewrites `04-journal/INDEX.md` from the front matter and checks every code anchor in the folder. Then run `node upskilling/_tools/register-status.mjs --check`. Both must exit 0. Then ask for review against the checklist.

## Anchoring rules

- Write an anchor as `path › symbol @ sha`, or `path › symbol (Lx–y @ sha)` when line numbers help. Use the full path from the repo root: `server/src/srs.js › schedule() (L27–53 @ 6f1bf43)`.
- The symbol must appear, word for word, in the file at that commit. The build tool runs `git show sha:path` and searches for it. `schedule()` matches `schedule`, and a route name such as `POST /answers` matches `/answers`.
- **Quote, never paraphrase.** Put the quoted lines in a fenced block under the anchor. Line numbers are a courtesy and go stale; the quote and the SHA are what make it reproducible.
- Cite "before" code at `6f1bf43` and "after" code at the change's own commit, taken from `git show`, not from memory.
- An entry that was true when it landed stays true as history. Do not edit old quotes to match new code; add an `Update:` addendum.

## Voice

- **Guides** (this README, the ladder, the reading guide, walkthroughs, exercises, the review guide and checklists) use **"you"**. The reader is doing something.
- **Journal entries** use **"I"**. An entry is one engineer's account of one change. "We considered" lets nobody own the decision, and it lets a writer claim a deliberation that never happened.
- **ADRs** use **"we"** only in the Decision paragraph. Everything else is declarative.
- The register and INDEX use no pronouns; they are tables.

Label opinions as opinions ("Opinion: the ease cap is unnecessary."). Every fact carries an anchor. Avoid "robust", "leverage", "best practice" and "might want to consider".

## The quality bar

A reviewer applies the 15-item checklist in [`04-journal/README.md`](04-journal/README.md) and returns **accept**, **revise** (with the failed item numbers) or **reject** (wrong or not grounded). The checks that matter most:

- The symptom reproduces at the stated commit.
- The test fails before the change and passes after, and the reviewer ran it.
- "Do nothing" gets a real argument.
- The severity claims no more than the evidence shows.

The last one is where a junior's writing gives itself away. The missing transaction around the answer write (F-02) is S3, not S1. Both writes are synchronous statements in one tick, so the window is a hard kill between two lines.

## Map

Everything below exists; nothing is a stub. The walkthroughs written after the refactor quote the working tree rather than a commit.

```
upskilling/
├── README.md                    this file
├── 00-ladder.md                 16 behaviours, junior / mid / senior, each with a repo example and the entries that exercise it
├── 01-reading-the-codebase.md   12 stops, written questions, a prove-it command each
├── 02-adrs/                     0001–0013 retro-documented, 0014–0018 written by the refactor; README is the index
├── 03-walkthroughs/             10 walkthroughs, one subsystem each, all written (01–04 and 06 anchored at 6f1bf43 with post-refactor addenda; 03, 05, 07–10 written against the refactored tree)
├── 04-journal/                  README (rules and the numbered plan), INDEX (generated), J01–J46 (46 entries, 40 landed)
├── 05-exercises/                E01–E08, all written, timeboxed, with hidden reviewer notes
│   └── answers/                 why there are no model answers, and what to compare against; attempts go here on a branch
├── 06-code-review-guide.md      how to review in this repo, and the red flags by file
├── 07-checklists.md             PR, release and content-change checklists
├── 08-glossary.md               20 terms, each with the file that shows it and the entry where it matters
├── 09-further-reading.md        10 outside sources, each tied to the entries that use it
├── 10-findings-register.md      F-01..F-30 and M-01..M-16 pointing into _audits/, status generated, reconciled 2026-09-24
├── _audits/                     the five pre-refactor audits and their reviews, frozen
├── _templates/                  journal entry, ADR, walkthrough and exercise templates
└── _tools/
    ├── build-index.mjs          rebuilds 04-journal/INDEX.md and checks every anchor
    └── register-status.mjs      sets the register's Status column from the entries; --check verifies it
```
