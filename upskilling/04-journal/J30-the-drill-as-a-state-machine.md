---
id: J30
title: The drill as a state machine
area: client
closes: [F-07, F-12]
ladder: [B04, B11, B13]
adrs: [0014 unchanged]
status: landed
---

# The drill as a state machine

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-07 (client half), F-12 (the proper fix after J23) · Ladder B04, B11, B13 · ADRs 0014 unchanged

## Symptom

The 579-line `DrillPage.tsx` held a session in five `useState`s and a question in six more. Every contract change this release touches it: choices now arrive shuffled and must be answered by **id** (J12), there is a give-up path, an `outcome` to show, and an `invalid_response` that must not advance. Four existing bugs live in the gaps between those states. "Another round" (F-12) does nothing. Two activations inside one task POST twice (F-07). A verdict from a session you left lands in the next one (B15). The reveal is painted from `result.answer`, an authored index that is meaningless once choices are shuffled.

## Root cause

`client/src/pages/DrillPage.tsx › QuestionCard (L191–245 @ 6f1bf43)` holds positions and grades from the authored key:
```tsx
  const [selection, setSelection] = useState<number[]>([]);
  ...
  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
```
and `client/src/pages/DrillPage.tsx › correctSet (L562–570 @ 6f1bf43)`:
```tsx
  if (typeof result.answer === 'number') return new Set([result.answer]);
```
`canSubmit` is render-time state captured in a closure, async results carry no identity, and the draft is a list of positions. The invariant: *one graded result per question per round, stored against the round that asked for it, and the answer sent is the choice ids the learner saw.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Not possible: with shuffled choices every index-based answer is wrong or `400`. |
| B | Patch the component: ids in `selection`, an `inFlight` ref, `answerChoiceIds` for the tick | ~60 lines | It works today, but the next feature (give-up, summary review) adds more `useState`s to the same knot. |
| C | A reducer with `round`, a draft of ids, a transition per event, pure helpers (`toResponse`, `initialDraft`, `revealedIds`), and the page split into seven components | ~900 lines, most of them markup moved | Chosen. |

## Decision and trade-off

I chose C. The transitions:

| state | event | next |
|---|---|---|
| loading | `loaded(round)` | ready, items reset (dropped if the round is stale) |
| ready | `edit` | same item, new draft (ignored once submitting or graded) |
| ready | `submit` | item.submitting (no-op if already submitting or graded) |
| submitting | `graded(round)` | answered, xp += earned (dropped if stale or already graded) |
| submitting | `submitFailed(invalid)` | ready, draft kept, inline error |
| answered | `next` | index + 1 (no-op if not graded) |
| any | `restart` | loading, round + 1 |

The draft is `{ kind: 'choice', picked: string[] }`, `{ kind: 'order', order: string[] }` or `{ kind: 'text' }`. `toResponse` emits one id, an id list, a boolean or a trimmed string, and nothing else. The client never shuffles. An order question starts in the server's order. `finished` is derived. An `inFlight` set keyed `round:index` covers the one window the reducer cannot, two calls in one task. What it gives up: more files. Revisit if a question type needs local grading (replaying misses was deferred for that reason).

Around the reducer: `parseDrillParams`/`drillHref` (`limit` is sent only when the URL has one, so the learner's `sessionSize` applies), a `useBlocker` confirm when leaving mid-session, `role="status"` for the verdict, outcome copy per the contract (`practice` → "your schedule is unchanged · still due …"), and **Show me the answer** (key `0`) sending `{ questionId, giveUp: true }`.

## The change

New `client/src/pages/drill/`: `useDrillSession.ts` (reducer and hook), `params.ts`, `keys.ts` (J25), `QuestionCard.tsx`, `ChoiceList.tsx` (native radios and checkboxes, a verdict in text, `is-missed`), `OrderList.tsx` (J31), `Feedback.tsx`, `Summary.tsx` and `DrillPage.tsx`. The old `pages/DrillPage.tsx` is deleted.

After, `client/src/pages/drill/useDrillSession.ts`:
```ts
    case 'submit': {
      const item = state.items[action.index];
      // The guard that makes a double Enter (or Enter + click) one POST.
      if (!item || item.submitting || item.result) return state;
      return updateItem(state, action.index, { submitting: true, error: null, invalid: false });
    }
```

## Verification

`client/src/pages/drill/useDrillSession.test.ts`: › *ignores a graded result from a previous round*, › *submit is a no-op while submitting or once graded* (XP stays 10 after a replayed `graded`), › *restart bumps the round and clears answers*, › *maps each question type, with ids for choice types*, › *the initial order draft is exactly the order the server sent*. `DrillPage.test.tsx`: › *digit selects a choice and a double Enter submits exactly once, with the choice id* (body `response: 'js-values-1-c0'`, session body `{ mode: 'daily' }`), › *a practice outcome says the schedule is unchanged*, › *"Show me the answer" (key 0) gives up and reveals*, › *an invalid_response keeps the draft and shows an inline error*. At the baseline the same double Enter could POST an integer index, which the J12 server rejects. Suite: 70 passed.

## What a senior reviewer would ask

- *Why keep `inFlight` if the reducer guards?* The reducer sees the second `submit` only after the first dispatch has been processed. The ref closes the same-task window without relying on React's batching order.
- *Where does progress refresh now?* From the event path after each grade (J32), not from the Summary.
- *Is `useBlocker` annoying?* It fires only when something is answered and the session is unfinished. Answers are already saved, and the prompt says so.

## The junior version of this fix

Rename `selection` to hold ids and keep everything else. Grading works again. The Summary still paints from `result.answer`, so on a shuffled question it ticks whichever choice happens to sit at the authored index, and the learner is shown the wrong right answer.

## Follow-ups

- [ ] Replay the missed questions locally → deferred (needs local grading)

## Update 2026-09-24

Three review findings, fixed in place:

- The `useBlocker` predicate excluded navigations to the same pathname and search. `DrillRoute` is keyed by `location.key` (J23), so even that navigation remounts the page and drops the session; the predicate is now `() => live`. Test: `DrillPage.test.tsx` › *navigating to the same drill URL mid-session asks first, because the route remounts*.
- The hint row on a short-answer question advertised `0` for "show answer" while focus sat in the answer box, where `0` is a character. The hint is gone for that type; the button stays. Test: › *the short-answer hint row does not advertise 0 while the answer box has focus*.
- The Summary wrapped the learner's typed answer (and the accepted one) in backticks and rendered it through `Inline`, so an answer containing a backtick or asterisk was mangled. Typed text is now a `<code>` element. Test: › *the summary shows a typed answer verbatim, not as Markdown*.
