# Reviewing a change to Stack Ready

This guide covers what to look for in *this* repository. For comment labels (`blocking:`, `question:`, `nit:`), use [Conventional Comments](https://conventionalcomments.org/). Every blocking comment needs a reason and a way out.

## Order of attention

Review from the most expensive to fix later to the cheapest. Stop and send it back at the first level that fails.

1. **Does it do what the PR and its journal entry say?** Run the entry's Verification. If the test does not fail at the parent commit, the entry's claim is unproven.
2. **Contracts.** Look first at anything that outlives the process:
   - the question and choice ids in `content/questions/*.js`;
   - the tables in `server/src/store.js` and the JSON store's file shape;
   - the `{ data } | { error: { code, message } }` envelope and its error codes;
   - the request and response shapes that `client/src/lib/types.ts` mirrors.
3. **Twice and halfway.** What happens if this runs twice (a double submit, a retried POST, StrictMode's double effect)? What happens if it stops halfway (a kill between two writes, a rejected promise after a `setState`)?
4. **Tests prove it.** Is there one test per behaviour change, named for the behaviour, that fails without the change? Does it run on both store backends?
5. **Readability,** and comments that explain *why*. `grade.js` L44–45 and `check.js` L142–143 are the house standard.
6. **Style.** Leave it to the linter once J04 lands. Until then, do not spend review comments on it.

## Red flags in this repo

Each flag names where it shows up and why it matters here.

| Red flag | Where it would appear | Why |
|---|---|---|
| A `Question` leaves the server without `publicQuestion()` | any new route in `server/src/routes/api.js` | The key reaches the browser, and ADR 0002 is broken silently. |
| A value import from `@jstrain/content` in the client | `client/src/**` | Vite bundles every answer key (dx §1.1). Only `import type` is allowed. |
| Two store writes with no `recordAnswer`/transaction | `server/src/routes/api.js` | This is F-02 again. The invariant is an attempt row if and only if the card advanced. |
| A store method added to one backend | `server/src/store.js` | The JSON store runs where SQLite failed to load, which means no test ran it. |
| `CREATE TABLE` or `ALTER` outside the migration runner | `server/src/store.js` | `IF NOT EXISTS` never reaches existing files (F-11). A failed `prepare` can trigger the fallback (M-03). |
| A renamed or deleted question id | `content/questions/*.js` | History is orphaned silently, and accuracy can exceed 100% (F-10). |
| Prose restating a number from `content/tracks.js` or a count | `README.md`, `client/src/pages/Dashboard.tsx` | "A third" against `0.35` (F-19). Derive it or leave it out. |
| `new Date()` or `Math.random()` inside a scheduler, picker or progress function | `server/src/srs.js`, `sessions.js`, `progress.js` | Tests stop being deterministic (F-09). Inject them. |
| `as` on network data, or `body.data as T` | `client/src/lib/api.ts`, any page | A cast is not a check (F-20). |
| A `window` listener for keys | `client/src/pages/**` | It steals keys from every focused control on the page (M-07). |
| A fetch effect that no URL or state change re-runs | `client/src/pages/**` | "Another round" did nothing (F-12). |
| `dangerouslySetInnerHTML` | `client/src/components/Markdown.tsx`, `Code.tsx` | It ends ADR 0005 and the README's no-XSS claim. |
| A 5xx message built from `err.message`, or `err.code` passed through unchecked | `server/src/index.js` | It leaks paths and `ENOENT` into the API (F-14). |
| A new `setError` on a background path | `client/src/lib/app-state.tsx` | It turns a refresh failure into a boot failure (F-17). |

## One hunk, three reviews

`server/src/routes/api.js › POST /answers (L116–130 @ 6f1bf43)`:

```js
    const now = new Date();
    const before = store.getCardState(profileId, question.id);
    const { correct, reason } = grade(question, response);
    const after = schedule(before, correct, now);

    store.saveCardState(after);
    store.addAttempt({
      profileId,
      questionId: question.id,
      …
      answeredAt: now.toISOString(),
    });
```

**Junior:** "LGTM." The code is short and reads well, and nothing looks wrong.

**Mid:** "blocking: wrap these in a transaction." That is correct, but it is a command without a reason. It invites a fix that wraps the SQLite calls and forgets the JSON backend. It also overstates the risk, and the author will sense that.

**Senior:**

> question: what state are we in if `addAttempt` throws after `saveCardState` succeeds? I think the card has advanced with no attempt row, so XP and the heatmap disagree with the schedule. Both calls are synchronous, so the only windows are a thrown `insertAttempt` (disk full) or a kill between two lines. I'd call that S3, not urgent. Could we add `store.recordAnswer(state, attempt)` on both backends and test it by stubbing `insertAttempt` to throw? Separately, and more important: `grade()` returns `reason` for a malformed `response`, and we still schedule it as a lapse (M-02). Is that intended?

The senior comment states the invariant, sizes the risk honestly, proposes a test that proves the fix, and spots the more serious problem three lines up.

## Reviewing a PR written by an agent

Most of the refactor was written by agents, and the review burden is the same, with four extra checks:

- **Invented APIs.** Check every imported symbol and every store method exists, on both backends. Agents write fluent calls to functions that were never written.
- **Scope creep.** A fix bundled with "while I was here" edits is two PRs. The planted diff in [E05](05-exercises/E05-review-this-diff.md) hid a behaviour change inside a reformat.
- **Tests that mirror the implementation.** A test that re-derives the expected value with the same formula proves nothing. Ask for the case that failed at the parent commit.
- **Deleted "why" comments.** An agent tidying `store.js` will happily drop "Windows will not delete an open SQLite file". Diff the comments, not just the code.
- **Journal voice.** An entry that says "we considered" three options, with no argument for "do nothing", has not considered them. Send it back under checklist item 4.
