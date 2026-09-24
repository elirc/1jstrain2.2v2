# E06: Postmortem: "accuracy is 104%"

Level: senior · Timebox: 2 h · Touches: server | content (reading only) · Output: a written postmortem
Ladder: B04, B07, B01 · Depends on: J15 (orphaned card states), J37 (doubling the deck without renaming an id), ADR-0001

## Scenario

This is a simulated incident, run against the baseline. In it, a content batch during the doubling "tidied" three ids in `content/questions/js.js`: `js-async-1`, `js-async-2` and `js-async-3` became `js-async-01`, `js-async-02` and `js-async-03`, so they would sort. `npm run check` passed. The release went out on a Friday. On Monday a learner posted a screenshot of the Progress page, captioned *"apparently I'm better than perfect"*: **Accuracy 104%**. Two more reports followed by noon. Nobody on the team could say how many learners were affected.

You are the engineer who picked it up. Write the postmortem.

## Deliverables

1. **A reproduction** at `6f1bf43`, in the baseline worktree: a scratch profile whose `buildProgress(...).totals.accuracy` is `1.04` after the rename, with the exact card states you used. Keep it as a script or a test in your scratch branch.
2. **A blameless postmortem**, at most 1,200 words, in the format the `craft-incidents` primer teaches (`content/modules/craft-ops.js`, "After the incident: the postmortem"):
   - a timeline, and the impact in numbers: which learners, which figure, since when;
   - the contributing factors, several of them, with no single "root cause" forced;
   - what went well;
   - action items, each with an owner, a due date and a way to tell it is done;
   - separate answers to: why did it happen, why was it not detected sooner, why did mitigation take as long as it did, and why was the blast radius as large as it was.
3. **A one-paragraph status note** for learners, written for the people who saw 104%.

## Constraints

- Blameless. "The content author renamed ids" is where the analysis starts, not where it ends.
- Every technical claim carries an anchor at `6f1bf43`, or at the working tree for the remediation.
- Impact claims come from evidence you can produce. You have no production telemetry, and the postmortem must say so rather than guess a number.

## Starting points

- `server/src/progress.js › buildProgress() (L101–104 @ 6f1bf43)`, the numerator and the denominator
- `server/src/store.js › card_states (L61–73 @ 6f1bf43)`, the key, and what it references
- `../04-journal/J15-accuracy-over-100-percent.md`, the fix, and why clamping was rejected
- `../04-journal/J37-doubling-the-deck-without-renaming-an-id.md` › Verification, the id-stability check, and its Follow-ups
- `../07-checklists.md` › Content change, first item

## Done when

- Running the reproduction prints `1.04` at the baseline. The same card states and attempts, loaded into a store in the working tree, give an accuracy of 1 or less; `server/test/progress.test.js` › *accuracy stays ≤ 1 with orphaned card states; modules carry correct* shows how to set that up.
- The postmortem has every section in deliverable 2, and every action item has an owner and a date.
- A reviewer can find the row in `../10-findings-register.md` that each contributing factor maps to, or read the postmortem's reason for adding a new one.

## Stretch

Write the SQL or script that would have told you, on Monday morning, how many profiles hold orphaned card states, using only a learner's `progress.db` and the content package.

<details><summary>Reviewer notes (open after attempting)</summary>

**A strong answer** separates the defect from the trigger. The defect is F-10: the numerator sums `correct` over every stored state, and the denominator sums attempts over live questions (fixed by J15). The trigger is a rename that nothing prevented. Among its contributing factors: no foreign key from progress to content, which cannot exist while content is an ES module (ADR-0001); an id-stability check that exists only as a script in J37's Verification, not in `check:content` or CI; a content checklist item that relies on memory; and no telemetry, so impact is "every learner who answered those three questions", unquantified. Its action items include committing the baseline id list and failing `check:content` on a change (J37's follow-up), and the optional `orphanedCardStates` count J15 mentions.

**Common mistake:** "root cause: the author renamed ids; action: remind authors not to." A second one is proposing `Math.min(1, …)` as mitigation, which J15 rejects because it makes the number believably wrong.

**What a senior also flags:** the right mitigation was reverting the rename, not a code fix, and it is safe because orphaned states are kept and not deleted (J15, option C rejected). No XP was lost, because XP replays the attempt log, which keeps the old ids. The rename did inflate it slightly: a renamed question counts as new, so its first attempt earns first-attempt XP a second time. The status note should say that no history was lost.
</details>
