# Walkthroughs

Each walkthrough explains one subsystem: its contract, the order to read it in, the lines worth stopping at, a command that shows it working (or failing), what is still wrong, and a small change you make and prove.

All ten are written. They were written at two different times, and that shows in how they quote code:

- **01, 02, 04 and 06** were written against the baseline, commit `6f1bf43`. Their Observe outputs were recorded there. Each ends with an "After the refactor" addendum that says what moved and gives the outputs on the current tree.
- **03, 05, 07, 08, 09 and 10** were written after the 2026-09-24 refactor, which is still uncommitted. "Before" quotes carry a `path › symbol @ 6f1bf43` anchor that `_tools/build-index.mjs` checks. "After" quotes use plain paths, because there is no commit to anchor them to yet. Their Observe outputs were recorded on the working tree.

## Order

| # | Walkthrough | Status | Ladder behaviour it trains |
|---|---|---|---|
| 01 | [Request lifecycle](01-request-lifecycle.md) | written (baseline + addendum) | B06 validates at trust boundaries; B02 names the invariant |
| 02 | [SRS scheduler](02-srs-scheduler.md) | written (baseline + addendum) | B01 verifies prose against code ("two spaced correct answers"); B09 notices a test that pins a bug |
| 03 | [Session picker](03-session-picker.md) | written | B10 randomness is injectable; B02 uniqueness enforced by structure, not implied |
| 04 | [Progress derivation](04-progress-derivation.md) | written (baseline + addendum) | B07 knows where derived state stops being true; B10 time is injectable |
| 05 | [Store abstraction](05-store-abstraction.md) | written | B16 owns what it opens; B03 the fallback is a decision with one trigger; B04 persisted shapes are contracts (`user_version`) |
| 06 | [Content pipeline](06-content-pipeline.md) | written (baseline + addendum) | B04 ids are contracts; B03 bug versus decision |
| 07 | [API client and envelope](07-api-client-and-envelope.md) | written | B06 never casts through a boundary |
| 08 | [App state and boot](08-app-state-and-boot.md) | written | B12 boot versus background failure; B11 a response for the wrong profile never lands |
| 09 | [Drill state machine](09-drill-state-machine.md) | written | B11 fetch identity (`round`, the URL nobody subscribed to); B13 accessibility (keys, focus) |
| 10 | [Markdown and highlighter](10-markdown-and-highlighter.md) | written | B14 home-grown versus dependency; B02 a loop invariant enforced where it lives |

Read 01 first, because every other walkthrough assumes you know how a request arrives. Then read 02 before 03 and 04, since both are built on the scheduler. Read 05 after 01. Read the client walkthroughs in order, 07, 08, 09, because each one builds on the previous one. 06 and 10 pair well: 06 is where content is validated, and 10 is where it is rendered. The behaviours are defined in [`../00-ladder.md`](../00-ladder.md).

## How to use one

For 01, 02, 04 and 06, check out the baseline in a worktree (`git worktree add ../sr-base 6f1bf43`) so the line numbers and outputs match, then read the addendum against your normal checkout. For the other six, work in your normal checkout. Their Observe commands run from the repo root (or from `server/` or `client/` where they say so), and their "before" anchors can be read with `git show 6f1bf43:<path>`.

Run every Observe step yourself, and compare your output with the one recorded. When the two differ, first find out whether the code changed since, before you decide either one is wrong. Keep your "Do it" change on a scratch branch, then compare it with the journal entry named in the walkthrough.

Every walkthrough's "What is still wrong here" lists the open follow-ups from its journal entries. A few also list something found while it was written that has no register row yet. Those are marked as such, and they need an owner, not a silent fix.
