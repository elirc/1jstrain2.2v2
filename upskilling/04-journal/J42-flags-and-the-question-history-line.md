---
id: J42
title: Flags and the question history line
area: client
closes: []
ladder: [B04, B11]
adrs: []
status: landed
---

# Flags and the question history line

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes – (features P10 and P4; the server half is in the server's feature entries) · Ladder B04, B11 · ADRs none

## Symptom

Two things a learner asked for and could not do. First, mark a question to come back to ("I want to argue with this one", "revisit before Tuesday"). There was nowhere to put that except a notebook. Second, see their own record on a question. The explanation panel said "back in 6d" but not *why*: how often they had seen it, how often they had been right, when they last missed it. The schedule was a black box, and a schedule you cannot read is one you stop trusting.

At `6f1bf43`: the feedback panel has only the verdict, `why` and `ask`. No endpoint exists for either feature.

## Root cause

Not a bug. The API surface ended at progress. `client/src/lib/api.ts › resetProgress (L107–109 @ 6f1bf43)` is the last method:
```ts
  progress: (profileId: string) => request<Progress>('/progress', { profileId }),
  resetProgress: (profileId: string) =>
    request<void>('/progress/reset', { method: 'POST', profileId }),
```
and the question state the client sees, `client/src/lib/types.ts › QuestionState (L34–40 @ 6f1bf43)`, has no flag. The contract this release adds `PUT/DELETE /api/questions/:id/flag`, `GET /api/flags`, a `flagged` session mode, `state.flagged` on module questions, and `GET /api/questions/:id` carrying `state` and `history` (CONTRACT §5, §6, §8).

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Learners keep curating outside the app, and the SRS stays opaque. |
| B | Flags in localStorage | Client only | Flags would not follow an export, and the server could not build a `flagged` session from them. |
| C | Server-backed flags loaded once per learner into app state; the history line fetched lazily from `GET /api/questions/:id` when the learner asks | ~250 client lines | Chosen. |
| D | Fetch the question detail after every answer (gives flag state and history together) | One extra GET per answer | It pays for a line most learners never open. The flag list is needed anyway for the "Flagged N" counts. |

## Decision and trade-off

I chose C. `app-state` holds `flags` as a `useResource(['flags', profileId])` and exposes `flaggedIds` and `setFlag(question, flagged, note)`. `setFlag` calls the API first and then updates the list, so the UI never shows a flag the server does not have. A failure goes to the shell's notice region. The Feedback panel has a `aria-pressed` **Flag for later** toggle and, once flagged, a note field with **Save note**. It is a `role="group"`, not a nested `<form>`, and Enter in it saves the note without submitting the question. **Your history with this question** is a disclosure that mounts a `useResource(['question', id, profileId])` only when opened, and renders "Seen 4× · 2/4 correct · last wrong 3 days ago · next in 6 days". Entry points: **Flagged N** on the Dashboard, a Flagged card with **Drill flagged** on Progress, `mode=flagged` in `parseDrillParams`, and on the module page a ⚑ marker from `state.flagged` (or the flag list) with a **Flagged only** filter.

What it gives up: flag state in the drill is only as fresh as the list loaded at profile switch. Revisit if flags can change from a second tab while one is open.

## The change

`api.ts` gains `flag`, `unflag`, `flags`, `question` and `attempts`. `types.ts` gains `Flag`, `QuestionDetail` and `AttemptSummary`. Flag and history code lives in `app-state.tsx` (flags resource, `setFlag`), `pages/drill/Feedback.tsx` (`FlagControl`, `History`, `historyLine`), `Dashboard.tsx`, `ProgressPage.tsx` and `ModulePage.tsx`.

After, `client/src/pages/drill/Feedback.tsx`:
```tsx
export function historyLine(detail: QuestionDetail, now = new Date()): string {
  const { state, history } = detail;
  const parts = [`Seen ${state.attempts}×`, `${state.correct}/${state.attempts} correct`];
  const lastWrong = history.find((h) => !h.correct);
  if (lastWrong) parts.push(`last wrong ${ago(lastWrong.answeredAt, now)}`);
  if (state.mastered) parts.push('mastered');
  if (state.dueAt) parts.push(state.due ? 'due now' : `next ${relativeWhen(state.dueAt, now)}`);
  return parts.join(' · ');
}
```

## Verification

`client/src/pages/pages.test.tsx`:
1. › *flags a question from the feedback and saves a note*. The toggle becomes `aria-pressed="true"`, the second `PUT` body is `{ note: 'check the spec' }`, `POST /api/answers` is still called exactly once (the note controls do not resubmit), `GET /api/questions/:id` is not called until the disclosure opens, and then the history line reads "Seen 4× · 2/4 correct · last wrong 3 days ago · next in 6 days".
2. › *Dashboard and Progress offer a flagged drill*: **Flagged 1** links to `/drill?mode=flagged`.
3. › *the module question list marks flagged questions*.
4. `params.test.ts` › *validates the mode and its required id* accepts `mode=flagged`.

None of these can fail "before" in the usual sense, because the feature did not exist. The baseline has no route, type or UI for them.

## What a senior reviewer would ask

- *Why not optimistic flagging?* A flag is a deliberate act, and the round-trip is local. Showing it only after the `200` means the list never lies.
- *What does the history line do while the server is older than the contract?* It shows "History unavailable: …" in place. Nothing else on the panel depends on it.
- *Is `gaveUp` shown?* Not yet. A give-up counts as a wrong attempt, which is how the server scores it.

## The junior version of this fix

Fetch `GET /api/questions/:id` in a `useEffect` in `Feedback` for every graded answer, to get the flag and history together. It works and is one hook. It doubles the requests per answer for a line most learners never open, and without an abort the detail for question 3 can land while question 4 is on screen.

## Follow-ups

- [ ] Show "gave up" distinctly in the history line → small, next pass
- [ ] Refresh the flag list on window focus if multi-tab use appears → not planned
