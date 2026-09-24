# Walkthrough 09: the drill as a state machine

Files: `client/src/pages/drill/useDrillSession.ts`, `client/src/pages/drill/DrillPage.tsx`, `client/src/pages/drill/params.ts`, `client/src/pages/drill/keys.ts`, `client/src/App.tsx › DrillRoute`, and the tests beside them · As of: the working tree after the 2026-09-24 refactor (baseline `6f1bf43`) · Time: ~50 min · Read first: walkthroughs 07 and 08

"Before" quotes are anchored at `6f1bf43`, where the drill was one 579-line file, `client/src/pages/DrillPage.tsx`. "After" quotes come from `client/src/pages/drill/` in the working tree, which is not committed yet, so they carry plain paths and no SHA.

## The job in one sentence

Run one drill session: fetch it for a scope, let the learner build an answer out of choice ids, submit it once, show the verdict, move on, and start a fresh round on request. Make sure no result from an earlier round can land in the current one.

## The contract

States: `loading → ready | error`. Within `ready`, each item goes `idle → submitting → answered`, or back from `submitting` to `idle` with its draft kept. `finished` is derived: `ready`, non-empty, and `index >= questions.length`.

- **Invariant 1:** one graded result per question per round. A second `submit` while submitting or graded is a no-op, and a `graded` for a graded item is dropped.
- **Invariant 2:** every async result carries the `round` it was started in, and the reducer drops a result from any other round.
- **Invariant 3:** the draft holds choice **ids**. The client never reorders choices, and an `order` draft starts in the order the server sent.
- **Invariant 4:** "Another round" sends `POST /api/sessions` again with the same scope (`mode`, the scope id, and `limit` only if the URL had one).
- **Invariant 5:** Enter never fires from a focused link, button, select or text field, and digits never fire while typing (J25).
- **Invariant 6:** `invalid_response` keeps the draft, shows an inline error and does not advance.

## Read it in this order

1. `client/src/pages/DrillPage.tsx › DrillPage (L31–70 @ 6f1bf43)`. Five `useState`s reset by one effect.
2. `client/src/pages/DrillPage.tsx › Another round (L547–553 @ 6f1bf43)`. The link nobody subscribed to.
3. `client/src/App.tsx › DrillRoute` (working tree). The hotfix, J23.
4. `client/src/pages/drill/useDrillSession.ts › drillReducer`, then `useDrillSession` (working tree). The fix, J30.
5. `client/src/pages/drill/params.ts`. The URL parsed once, and built once.
6. `client/src/pages/drill/useDrillSession.test.ts`, then `DrillPage.test.tsx`.

## The lines worth stopping at

**The bug: a URL as an event bus.**
`client/src/pages/DrillPage.tsx › Another round (L547–553 @ 6f1bf43)`
```tsx
        <Link
          className="btn btn-primary"
          to={`/drill?mode=${session.mode}${moduleId ? `&moduleId=${moduleId}` : ''}&n=${Date.now()}`}
          reloadDocument={false}
        >
```
and `client/src/pages/DrillPage.tsx › DrillPage (L70 @ 6f1bf43)`: `}, [profile, mode, moduleId, trackId, stageId, limit]);`

Nothing reads `n`. The route element keeps its position in the tree, so React does not remount it. The effect's six dependencies are unchanged, so it does not re-run. `index` stays at `questions.length`, and the Summary stays on screen. The link also drops `trackId`, `stageId` and `limit` (F-12). This is the B11 bug class: fetch identity that lives somewhere the effect does not look.

**The hotfix, J23: remount on every drill navigation.**
`client/src/App.tsx` (working tree):
```tsx
function DrillRoute() {
  const location = useLocation();
  return <DrillPage key={location.key} />;
}
```
Every navigation gets a new `location.key`, even one to the identical URL. So any drill link, not just "Another round", starts clean. It shipped first because it is ten lines, and J30 kept it. A plain link to the same drill (the nav's **Drill**, "Daily mix instead") must also mean "start this drill", and a key is the one mechanism that covers every entry point. The cost is that any drill link throws away a live session. `useBlocker(() => live)` in `DrillPage.tsx` asks first. J30's Update records that the predicate once excluded same-URL navigations, which the key makes destructive too.

**The fix, J30: `round` is the identity of a session.**
`client/src/pages/drill/useDrillSession.ts` (working tree):
```ts
    case 'graded': {
      const item = state.items[action.index];
      if (action.round !== state.round || !item || item.result) return state;
      // …
    case 'restart':
      return { ...initialDrillState, round: state.round + 1 };
```
The load effect depends on `[profileId, key, state.round]`. `restart` bumps `round`, the effect re-runs, and its cleanup aborts the previous request. Every `loaded`, `failed`, `graded`, `submitFailed` and `milestones` action carries the `round` it was started in, and the reducer compares it. The Summary's button is now `onClick={onRestart}`: an event, not a URL.

The transitions, from J30:

| state | event | next |
|---|---|---|
| loading | `loaded(round)` | ready, items reset (dropped if the round is stale) |
| ready | `edit` | same item, new draft (ignored once submitting or graded) |
| ready | `submit` | item.submitting (no-op if already submitting or graded) |
| submitting | `graded(round)` | answered, xp += earned (dropped if stale or already graded) |
| submitting | `submitFailed(invalid)` | ready, draft kept, inline error |
| answered | `next` | index + 1 (no-op if not graded) |
| any | `restart` | loading, round + 1 |

**Why a ref as well as the reducer guard.**
```ts
      const flightKey = `${s.round}:${index}`;
      if (inFlight.current.has(flightKey)) return;
```
The reducer sees the second `submit` only after it has processed the first dispatch. Two activations in one task (Enter plus a click, or autorepeat) both read `latest.current` before either dispatch lands. The `inFlight` set closes that window without relying on React's batching order (F-07). At the baseline, `client/src/pages/DrillPage.tsx › canSubmit (L222–245 @ 6f1bf43)` was a render-time boolean captured in a closure, so both activations saw `true`.

**Ids, not positions.** J12 made the server shuffle choices on every serve and grade by choice id. The baseline's `client/src/pages/DrillPage.tsx › correctSet (L562–570 @ 6f1bf43)` painted the reveal from `result.answer`, an authored index. Once choices are shuffled, that ticks whichever choice happens to sit at that index. Now `toResponse` emits ids, and `revealedIds` reads `result.answerChoiceIds`. J30's "junior version" is exactly the half-fix: ids in the draft and the reveal still painted by index.

**One URL parser, one URL builder.** `parseDrillParams` returns a typed `DrillSpec` or an error, and `drillHref(spec)` builds every drill link in the app. `limit` is present only if the URL has one, so the learner's `sessionSize` applies otherwise. `specKey(spec)` is `drillHref(spec)`, which gives the effect a stable string dependency.

**The keyboard is a boundary too.** `client/src/pages/DrillPage.tsx › onKeyDown (L253–289 @ 6f1bf43)` took every Enter on the page. `keys.ts › shouldIgnore` now declines modified keys, autorepeat, already-claimed events and anything outside the card. Enter on `a, button, select, summary` is left to native activation, and Enter in a text field is left to the form (M-07, J25).

## Observe it

1. `cd client && npx vitest run src/pages/drill --reporter=verbose`. On this tree, 26 of 27 passed on the first run. The reducer cases were:
   ```
   ✓ src/pages/drill/useDrillSession.test.ts > drill reducer > ignores a graded result from a previous round
   ✓ src/pages/drill/useDrillSession.test.ts > drill reducer > submit is a no-op while submitting or once graded
   ✓ src/pages/drill/useDrillSession.test.ts > drill reducer > restart bumps the round and clears answers
   ✓ src/pages/drill/useDrillSession.test.ts > drill reducer > keeps the draft and flags an invalid response without advancing
   ✓ src/pages/drill/DrillPage.test.tsx > DrillPage > "Another round" starts a new session with the same scope
   ✓ src/pages/drill/DrillPage.test.tsx > DrillPage > navigating to the same drill URL mid-session asks first, because the route remounts
   × src/pages/drill/DrillPage.test.tsx > DrillPage > the short-answer hint row does not advertise 0 while the answer box has focus
   ```
   The failure was `expect(element).toHaveFocus()`: focus was on `<body>`, not on the answer box. Running `DrillPage.test.tsx` alone twice gave `Tests  15 passed (15)` both times. See "What is still wrong".
2. The hotfix-then-fix story in one command: `npx vitest run src/pages/drill/DrillPage.test.tsx -t "Another round|same drill URL"` prints `Tests  2 passed | 13 skipped (15)`. The first case is J23's invariant, and the second is the cost of J23's key, caught in review.

## What is still wrong here

- J30 follow-up: replaying the missed questions locally is deferred, because it needs local grading, which ADR-0002 forbids.
- J23 follow-up: a "resume the session you left" feature would need the route key removed. It is not planned. The key is a decision: every drill link starts fresh.
- F-07: a replay that gets past both guards (two tabs, or a retry after a lost response) still writes a second attempt row and 1 XP. The idempotency key is a J08 follow-up.
- J46 (in review): milestone announcements target the card on screen. Read the entry before changing `announcedFrom`.
- Found while writing this walkthrough, not yet in the register: *the short-answer hint row does not advertise 0 while the answer box has focus* asserts focus synchronously after `startDrill`, and it failed once when three test files ran in parallel. It looks timing-dependent (`waitFor` around the focus assertion would say so). File it before someone "fixes" it with a retry.

## Do it

1. (5 min) From the transition table, list every event the reducer drops silently, and the test that pins each one.
2. (15 min) On a scratch branch, remove `state.round` from the load effect's dependency list and click "Another round" in the test. Which assertion fails first, and which baseline bug have you rebuilt?
3. (20 min) Make the hint-row test deterministic. Reproduce the failure under load (`npx vitest run src/pages/drill` a few times), decide whether the component or the test is wrong (does `QuestionCard` focus the input in an effect or a layout effect?), fix the one that is wrong, and show 5 clean runs in a row.

## Check yourself

1. Why did "Another round" do nothing at the baseline, even though the URL changed?
2. What does J23's `key={location.key}` fix that `restart` alone would not?
3. Why keep the `inFlight` ref when the reducer already ignores a second `submit`?
4. What goes wrong if the reveal reads `result.answer` instead of `answerChoiceIds`?
5. Where is `limit` added to the session request, and when is it left out?

<details><summary>Answers</summary>

1. The route did not remount, and the fetch effect did not depend on `n`, so no dependency changed and nothing re-ran. The Summary stayed because `index` was still past the end.
2. Any other link to the same drill URL (the nav, "Daily mix instead") also starts a fresh session. `restart` only covers the button.
3. Two activations in one task both read the same `latest.current` before either dispatch is processed. The ref is synchronous.
4. `answer` is an index into the authored order. Choices are shuffled on every serve, so the tick lands on the wrong choice, and the learner is shown the wrong right answer.
5. In `toSessionRequest(spec)`, only when `spec.limit !== undefined`, which means only when the URL had a `limit`. Otherwise the server applies the learner's `sessionSize`.

</details>
