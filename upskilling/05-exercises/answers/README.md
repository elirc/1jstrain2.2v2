# Answers: deliberately not provided

This folder has no model answers, and it will not get any. It is where **your** attempt goes, on your own branch, named `E<NN>-<your-name>.md` (plus code on the same branch, if the exercise asks for code). Open a pull request so that someone can review it, and do not merge it. An attempt on `main` becomes the answer for the next person.

## Why there are no answers

- **The skill is the reasoning, not the artefact.** A finished RFC or postmortem shows you what someone concluded. It cannot show you which options they rejected, and that is what the exercise trains. Once you have read an answer, you cannot recover the experience of working it out.
- **Most exercises have more than one strong answer.** E03 can leave old rows `NULL` or derive them on read. E08 can defend a major or a minor version. An answer file would make one of them look like the only right one.
- **The code moves.** An answer quoted against today's working tree goes stale with the next migration. The things listed below stay true, because they are checked or frozen.

## What to compare against instead

| You want to know | Compare against |
|---|---|
| Whether you are done | The exercise's **Done when** list. Every item is a command that exits 0 or an artefact a reviewer can find. If one fails, you are not done, however good the prose is. |
| Whether your reasoning matches a strong answer | The **Reviewer notes** at the end of each exercise, opened only after you have a finished attempt. They describe what a strong answer contains, the common mistake and what a senior also flags. They are not a solution. |
| How the real change was made | The journal entry the exercise depends on (its **Depends on** line). E02 against J12 and J30, E03 against J19, E04 against J22, E06 against J15 and J37, E08 against J05. Read its Options table and compare it with your own. |
| Whether a claim about the code is true | The code, at the anchor you cite. `node upskilling/_tools/build-index.mjs` checks every `path › symbol @ sha` in the folder, including the ones in your attempt if you put the file here. |
| Whether a written artefact is good enough | The 15-item review gate in [`../../04-journal/README.md`](../../04-journal/README.md). Items 1–5, 8 and 15 apply to RFCs and postmortems as much as to entries. |
| Whether a design decision holds | The ADR it touches, in [`../../02-adrs/`](../../02-adrs/). A decision that contradicts an accepted ADR without superseding it is the first thing a reviewer flags. |

## For reviewers

Review an attempt the way you would review a PR ([`../../06-code-review-guide.md`](../../06-code-review-guide.md)). Run at least one Done-when command yourself. Say which reviewer-note points the attempt reached on its own, and which it missed. If an attempt disagrees with the reviewer notes and argues it well, say so in the review. If the argument is better than the notes, change the notes in a separate PR.
