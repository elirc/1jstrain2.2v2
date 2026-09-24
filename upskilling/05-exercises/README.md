# Exercises

Eight exercises, each grounded in a real part of Stack Ready, and all eight are written. Three read the baseline (E01, E05, E07). The other five work on the refactored code and depend on journal entries that have landed.

| # | Title | Level | Timebox | Code | Needs |
|---|---|---|---|---|---|
| [E01](E01-trace-an-answer-end-to-end.md) | Trace an answer end to end | mid | 45 min | baseline | – |
| [E02](E02-add-a-question-type.md) | Add a question type (`match`) | senior | half a day | working tree | J12, J30, J31, ADR-0014 |
| [E03](E03-write-migration-n-plus-1.md) | Write migration N+1 (`attempts.outcome`) | senior | 2 h | working tree | J19, J20, ADR-0017 |
| [E04](E04-measure-progress-and-module.md) | Measure `/progress` and `/modules/:id` | senior | 2 h | working tree | J14, J22 |
| [E05](E05-review-this-diff.md) | Review this diff | senior | 1 h | baseline | – |
| [E06](E06-postmortem-accuracy-104.md) | Postmortem: "accuracy is 104%" | senior | 2 h | baseline, then working tree | J15, J37 |
| [E07](E07-design-the-multi-user-version.md) | Design the multi-user version | senior | half a day | baseline | – |
| [E08](E08-cut-a-release.md) | Cut a release | senior | 1 h plus CI | working tree | J05, J18, J19, J21 |

## Suggested order

1. **E01**, in your first month, after stops 5–12 of the [reading guide](../01-reading-the-codebase.md). Everything else assumes you can trace an answer.
2. **E05**, once you have read the [code review guide](../06-code-review-guide.md). Reviewing comes before writing.
3. **E04**, then **E03**. Measuring before changing anything is the cheaper habit to learn first, and E03 is the first exercise that changes persisted data.
4. **E06**, after reading J15 and J37. It is written work, and it makes the reason ids are a contract concrete before you add a type.
5. **E02**, the largest. It crosses content, server and client, and it goes best once you have done E03 and E06.
6. **E07**, then **E08**. The RFC needs the whole system in your head. The release is last because it checks everything else.

The folder [README](../README.md) fits these into the 30/60/90 plan: E01 in days 1–30, E05, E04 and E03 in days 31–60, and E06, E02, E07 and E08 in days 61–90.

## How to attempt one

- **Keep to the timebox.** When it runs out, stop and write down where you got to and what you would do next. Knowing when to stop and report is part of what is being practised.
- **Do not open the reviewer notes** (the `<details>` block at the end) until you have a finished attempt. Once you have seen the answer, you cannot recover the experience of reasoning your way to it.
- **Work against the right code.** The "Code" column says which. For the baseline, use the `6f1bf43` worktree from the [folder README](../README.md#the-baseline). For the working tree, use a branch of the current `main`.
- **Write your answer as a file**, not in your head: a branch for code, and a Markdown file in [`answers/`](answers/README.md) on that branch for written work. Someone should be able to review it.

## What "done" means

Every exercise has a **Done when** section: commands that must pass and artefacts that must exist. An attempt that meets it but disagrees with the reviewer notes is still worth discussing. The notes describe a strong answer, not the only one. An attempt that does not meet it is not done, however good the prose.

There are no model answers. [`answers/README.md`](answers/README.md) explains why, and lists what to compare your attempt against instead.

A strong attempt at any exercise anchors its claims the same way the journal does (`path › symbol @ sha`), and states the severity it believes, with evidence.
