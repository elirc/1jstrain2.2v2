# E01: Trace an answer end to end

Level: mid · Timebox: 45 min · Touches: server | client
Ladder: B01, B02, B07 · Depends on: nothing (baseline `6f1bf43`; stops 5–12 of the reading guide help)

## Scenario

A learner writes in: *"I answered a question, the card said +10 XP and 'back in 1d'. The dashboard XP went up by 10 too. But a question I first answered last September gave me +6, and my level went down this week. Where do these numbers come from?"*

To answer that, you need to know every function the answer passes through, and which of them compute XP.

## Deliverables

1. A sequence diagram (Mermaid or ASCII), from the keypress to the dashboard number. Name every function and every HTTP call, and mark each boundary: browser, HTTP, Express, SQLite.
2. For each of the two writes in `POST /answers`, one sentence on what the rest of the system reads it for.
3. A paragraph answering the learner: where `+10` comes from, where the dashboard XP comes from, and why they disagree after a year.

## Constraints

Use only the code at `6f1bf43`. Do not run a debugger for the diagram. Reading is the skill being practised. Use the prove-it commands afterwards to check yourself.

## Starting points

- `client/src/pages/DrillPage.tsx › onKeyDown (L253–289 @ 6f1bf43)`
- `client/src/lib/api.ts › request (L56–82 @ 6f1bf43)`
- `server/src/routes/api.js › POST /answers (L108–144 @ 6f1bf43)`
- `server/src/store.js › insertAttempt @ 6f1bf43`
- `server/src/progress.js › buildProgress() @ 6f1bf43`

## Done when

- The diagram names at least `onKeyDown`, `submit`, `api.answer`, `request`, `requireProfile`, `getQuestion`, `grade`, `schedule`, `saveCardState`, `addAttempt`, `xpFor`, `onAnswered`, `Summary`, `refreshProgress` and `buildProgress`.
- Your answer to the learner cites the two code paths that compute XP, with anchors.

## Stretch

Mark every point on your diagram where a second click or an autorepeated Enter could start the same path twice. Say which of those points the server could defend.

<details><summary>Reviewer notes (open after attempting)</summary>

**A strong answer** notices that XP is computed twice, by different rules. The response's `xpEarned` is `xpFor(before, correct)`, from the *card state* (lifetime attempts). The dashboard replays `listAttempts(profileId, now − 365 days)` through `xpFor`, with a `seenBefore` map that starts empty. So a question first answered 13 months ago counts as a first attempt again (+10 on the dashboard, while the card showed +6), and older attempts drop out of the total, so the level falls (F-08, fixed by J14). It also notices that the dashboard only updates when `Summary` mounts (M-14). If the learner leaves mid-drill, nothing refreshes.

**Common mid-level mistake:** drawing the happy path and stopping at "the dashboard re-fetches". The question was *which number*, not *whether*.

**What a senior also flags:** the two writes are not in a transaction (F-02, S3), and the only guard against a double submit is a render-closure `canSubmit` (F-07). The diagram should show exactly where each of those sits. It should also show that `schedule()` never reads `dueAt`, because that is why "back in 1d" does not mean what the learner thinks (F-01).
</details>
