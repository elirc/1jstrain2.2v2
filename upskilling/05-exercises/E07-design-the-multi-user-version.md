# E07: Design the multi-user version

Level: senior · Timebox: half a day · Touches: server | client | tooling
Ladder: B03, B04, B05, B15, B16 · Depends on: ADRs 0002, 0003, 0004, 0006 in `02-adrs/` (their "Breaks first at" sections are your input)

## Scenario

A bootcamp wants to run Stack Ready for 400 students on one hosted server, with an instructor view of each cohort's weak modules. Today the app trusts an `x-profile-id` header, stores everything in one SQLite file through synchronous calls, and binds to whatever interface it is given. Write the RFC that decides what changes and what stays.

## Deliverables

An RFC of at most 2,000 words, in `upskilling/05-exercises/answers/E07-<your-name>.md` on your own branch. [`answers/README.md`](answers/README.md) explains why that folder holds attempts and never a model answer. The RFC has these sections:

1. **Problem and non-goals.** Name at least two things you are deliberately not building.
2. **Decisions, one per ADR it changes.** For each of 0002, 0003, 0004 and 0006: keep, amend or supersede, and why. Cite the "Breaks first at" line that triggered the change.
3. **Identity and authorisation.** What replaces the header, and how a request proves it may read a given profile.
4. **Data.** The storage engine, the migration path for existing `progress.db` files, and what happens to the JSON fallback.
5. **Correctness under concurrency.** Which of today's single-user assumptions stop holding. Idempotency of `POST /answers` must be one of them.
6. **Content versioning.** What happens to 400 learners' history when a question id changes.
7. **Rollout.** The order of changes, each small enough to revert.

## Constraints

- A local single-user install must keep working with no account and no network.
- No change to the question authoring format in `content/`.
- The client stays a Vite SPA.

## Starting points

- `server/src/routes/api.js › requireProfile() (L167–172 @ 6f1bf43)`
- `server/src/store.js › createStore() (L259–268 @ 6f1bf43)`
- `server/src/index.js › app.listen @ 6f1bf43`
- `server/src/progress.js › buildProgress() @ 6f1bf43`
- Register rows F-02, F-07, F-10, F-11, M-03, M-04.

## Done when

The RFC exists, every decision names the ADR it touches, and a reviewer can point to the section that answers each of the seven headings.

## Stretch

Give the instructor dashboard a latency budget, and show whether deriving XP (ADR 0004) still fits that budget for 400 learners with a year of attempts each. If it does not, say what you would materialise, and inside which transaction.

<details><summary>Reviewer notes (open after attempting)</summary>

**A strong answer:**

- **Keeps ADR 0002** (grading on the server). It becomes more important, not less.
- **Supersedes 0006.** Real sessions, with authorisation checked per profile *on the server*. Otherwise any student can read any profile by changing a header.
- **Supersedes 0003's JSON fallback for the hosted mode.** It silently splits history (M-03), and a whole-file rewrite on each flush does not survive concurrent writers. It keeps the fallback, or SQLite, for local installs.
- **Moves to a pooled async driver** (Postgres), because synchronous better-sqlite3 calls block the event loop for every user at once.
- **Gives `POST /answers` a client-generated attempt id** with a unique constraint. "Practice" (J10) stops a replay from moving the schedule, but a replay still doubles the attempt row and the XP.
- **Makes question ids a published contract,** with a CI check against removal (J15), because a rename orphans 400 histories at once and inflates accuracy (F-10).
- **Rolls out in reversible steps,** starting with binding to loopback and adding a `HOST` setting (J21), before any auth code.

**Common junior mistake:** starting with the auth library and the database vendor, and never saying what happens to existing `progress.db` files, or to the offline single-user case the constraints protect.

**What a senior also flags:** the instructor view is a new reader of learner data. Deciding who may see a student's attempts is a policy decision with a named owner, not a query. The RFC should list it as an open question, not solve it silently.
</details>
