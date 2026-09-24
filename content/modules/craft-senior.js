/**
 * Modules — Craft senior: design, architecture and review.
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const craftSeniorModules = [
  {
    id: 'craft-design',
    trackId: 'craft',
    title: 'System design for CRUD apps',
    blurb:
      'Grounded system design: requirements and numbers first, then a boring architecture that scales, with the trade-offs said out loud.',
    estMinutes: 40,
    objectives: [
      'Run a design conversation: requirements, estimates, API, data model, then scale',
      'Estimate load and storage with back-of-envelope numbers',
      'Scale a CRUD app step by step: stateless app tier, caching, replicas, queues, CDN',
      'Name the trade-offs (consistency, cost, complexity) in each decision',
    ],
    primer: `
## The shape of a design conversation

A system-design interview and a design doc share one skeleton, and each step
uses the output of the one before it:

1. **Requirements.** Functional (what users do) and non-functional (latency,
availability, consistency, compliance, budget). Ask who the users are and what
must never go wrong. Write the non-goals down.
2. **Estimates.** Turn the requirements into numbers: peak requests per second,
read/write ratio, storage over the retention period.
3. **API and data model.** The endpoints and tables the requirements imply. Most
CRUD designs are really decided here: keys, constraints, which queries must be
fast.
4. **High-level architecture.** Boxes and arrows, sized by the estimates.
5. **Deep dive.** The component the numbers say will break first.
6. **Trade-offs and evolution.** What you chose, what it costs, and what you
would change at 10×.

The classic failure is starting at step 4 with boxes labelled Kafka and
Kubernetes. A senior earns trust by asking the questions that make the design
*smaller*, then saying the trade-offs out loud instead of waiting to be asked.

## Back-of-envelope maths

Round hard. You want the order of magnitude, not the third digit.

| Quantity | Rule of thumb |
| --- | --- |
| Seconds in a day | 86,400, call it 100,000 |
| Average RPS | requests per day ÷ 86,400 |
| Peak RPS | average × 3–5 (more for launches and ticket drops) |
| Storage | rows per day × bytes per row × 365 × years, then roughly double for indexes |

1M daily active users × 20 requests = 20M requests a day ≈ 230 RPS average and
about 1,000 at peak. One well-indexed Postgres serves thousands of simple
queries a second, and one Node or .NET instance serves hundreds to a few
thousand simple JSON requests a second. So 1,000 RPS is a handful of app
instances and one database, not a distributed system.

Latencies worth knowing, as orders of magnitude: an in-process cache hit is
well under a microsecond; a Redis or indexed primary-key lookup in the same
data centre is around a millisecond including the network; a round trip between
availability zones is one or two milliseconds; across an ocean it is 70–150 ms.
That last number is why multi-region is a latency decision as much as an
availability one.

## The boring baseline

\`\`\`text
browser -> CDN (static client, public files)
browser -> load balancer -> app instance x N (stateless)
                               -> Postgres primary (backups, PITR, standby in a 2nd AZ)
                               -> Redis (cache, sessions, rate-limit counters)
                               -> object storage (uploads, exports)
\`\`\`

The **load balancer** spreads traffic across instances and health-checks them,
so a dead instance stops receiving requests. The app tier is **stateless**: any
instance can serve any request, because sessions live in Redis or the database
and files live in object storage. That is what lets you add instances and roll
a deploy through them one at a time. Sticky sessions hide in-memory state
instead of removing it: users lose their session on every deploy or crash, and
load spreads unevenly.

A quiz app with a React client, an Express API and SQLite is a fine design for
one learner on one machine. To host it for 50,000 learners, the change that
matters is the database: SQLite is a file on one disk with one writer, which
stops you running N instances. Move it to managed Postgres, keep the API
stateless and put the built client on a CDN. That is the whole redesign.

## Scaling steps, in order

1. **Measure, then fix queries and indexes** with production-sized data
(\`EXPLAIN ANALYZE\`). Most "we need to scale" problems are an N+1 or a
missing index.
2. **Scale vertically.** A bigger database instance costs less than a quarter
of engineering time.
3. **Cache hot, rarely changing reads** (Redis or HTTP caching) with a stated
TTL or invalidation rule.
4. **Read replicas** for reporting and read-heavy endpoints. Accept replica lag,
and read the user's own writes from the primary.
5. **Queues for slow work**: emails, exports, thumbnails, webhooks. Requests
stay fast and failures retry.
6. **Partitioning or sharding**, only when one primary can no longer take the
writes or hold the data.

Microservices are not on this list. Splitting a codebase does not make a slow
query fast; it adds network hops. Sharding on day one buys permanent
complexity (cross-shard queries, rebalancing) for load you do not have.

"What would you change at 10×?" is answered with the next bottleneck and a
number, not a list of technologies: "10× puts peak at 10k RPS, so about 20
instances with a pool of 10 each is 200 connections, and Postgres defaults to
\`max_connections = 100\`. So a connection pooler first, then check write IOPS."
Change the one thing that breaks next.

## Files and media

Never stream a 50 MB upload through your API: it ties up an instance, hits body
limits and doubles the bandwidth. Use a **presigned URL**:

1. The client asks the API for an upload URL; the API checks auth, size and type
and creates a pending row.
2. The API returns a presigned PUT URL valid for a few minutes.
3. The browser uploads directly to object storage.
4. A storage event queues a job that scans the file, verifies the type, makes
thumbnails or transcodes, and marks the row ready.

Serve files through a CDN, with signed URLs for private ones.

## Correctness under concurrency

Two people click "Book" on the same slot in the same millisecond. A
check-then-insert in the handler races: both SELECTs see the slot free and both
INSERTs succeed. Make **the database the arbiter** with a constraint, so the
second insert fails no matter how many instances you run:

\`\`\`sql
CREATE TABLE bookings (
  id              bigserial PRIMARY KEY,
  room_id         bigint NOT NULL REFERENCES rooms(id),
  slot_start      timestamptz NOT NULL,
  idempotency_key uuid NOT NULL UNIQUE,
  UNIQUE (room_id, slot_start)
);
\`\`\`

For arbitrary time ranges, Postgres has exclusion constraints over
\`tstzrange\`. Add an **idempotency key** so a double-click or a retried request
is one booking, not two, and give the loser a clear \`409 Conflict\` with the
next free slot. A lock in Redis or a disabled button narrows the window but
does not close it; only the constraint holds under every failure mode.

**Eventual consistency** is normal and fine for search indexes, counters,
emails and analytics. Decide per feature, and design the UI so the user who
made a change sees it (render the saved value from the response rather than
re-reading a lagging replica).

## Real-time and notifications

| Need | Use |
| --- | --- |
| Server tells the page something now and then ("export ready") | Server-Sent Events, polling as the fallback |
| Frequent messages in both directions (chat, co-editing) | WebSockets |
| The user is not on the page | Email or push, sent from a queue |
| Events must reach the instance holding the connection | Pub/sub (Redis, Postgres \`LISTEN/NOTIFY\`) |

SSE is plain HTTP, reconnects by itself and passes through proxies. Polling
every 10–30 seconds is fine for most dashboards.

An **activity feed** is fan-out on write (push each post into every follower's
feed: cheap reads, expensive writes for big accounts) or fan-out on read (query
followed accounts at view time: cheap writes, slow reads). Real systems use the
hybrid: fan-out on write for normal accounts, merge the few huge accounts in at
read time.

## Cross-cutting concerns

- **Multi-tenancy:** a \`tenant_id\` on every row, enforced in every query (or
by Postgres row-level security). A database per tenant only when isolation or
compliance demands it.
- **Rate limiting:** count per API key in a shared store (Redis) or at the
gateway. An in-memory limiter is per instance, so six instances allow six
times the limit and every deploy resets it. Return \`429\` with
\`Retry-After\`.
- **Search:** Postgres full-text search (\`tsvector\` plus a GIN index) first. A
dedicated engine when you need relevance tuning, typo tolerance or facets at
scale, fed by an outbox or change data capture, with the database as the
source of truth.
- **Availability:** a multi-AZ database with automatic failover, tested
restores and a DR runbook covers most CRUD apps. Multi-region costs
replication lag, write conflicts or a single write region, double the
infrastructure and harder deploys. Do it for a stated requirement (users on
another continent, data residency, an RTO the business will pay for), not by
default.

## Worked examples

**URL shortener.** 100M redirects a day is about 1,200 RPS average and 5k at
peak, overwhelmingly reads. Keys: base62 of a database sequence (seven
characters give 3.5 trillion) or a random key with a unique constraint and a
retry. Truncated hashes of the long URL collide. Redirect with 302: a 301 is
cached by the browser, so repeat clicks never reach you and your click
analytics undercount. Cache hot keys in Redis or at the CDN.

**Order storage.** 10k orders a day × 2 KB = 20 MB a day, 7.3 GB a year, about
36.5 GB over five years. One Postgres instance holds that with room for
indexes; partition by month later only if archiving needs it.

**Checkout.** An idempotency key on "Place order" (and on the payment
provider call), the order and the stock reservation in one transaction, then
the confirmation email and invoice through a queue after commit.
`,
  },
  {
    id: 'craft-architecture',
    trackId: 'craft',
    title: 'Architecture decisions and trade-offs',
    blurb:
      'Monolith vs services, module boundaries, layering, events, build vs buy, tech debt, and writing the decision down.',
    estMinutes: 30,
    objectives: [
      'Argue for a modular monolith and name the signals that justify extracting a service',
      'Draw module boundaries around business capabilities, not technical layers',
      'Write an ADR that records context, options and consequences',
      'Manage tech debt as a portfolio with product, not as a guilty secret',
    ],
    primer: `
## What architecture is

Architecture is the set of decisions that are expensive to change. Sort every
decision into a door. A **two-way door** (a library inside one module, an
internal function signature, a queue library behind an interface) is cheap to
walk back, so decide fast. A **one-way door** (the database engine, a public API
contract, splitting data across services, the tenancy model) is expensive, so
slow down, compare options and write the decision down. Much of the senior job
is turning one-way doors into two-way ones: flags, interfaces, expand/contract
migrations, additive API changes.

## Monolith, modular monolith, microservices

| Concern | Modular monolith | Microservices |
| --- | --- | --- |
| Deploys | One artefact | One per service |
| Data | One database, tables owned by modules | A database per service |
| Cross-module call | A function call | A network call that can fail or time out |
| Consistency | Transactions across modules | Sagas and eventual consistency |
| Operations | One pipeline, one dashboard | A pipeline, dashboard and on-call per service |
| Debugging | A stack trace | Distributed tracing |

Microservices buy independence at a steep, permanent price. Legitimate reasons
to pay it: a component with very different scaling needs (a video transcoder
next to a CRUD API), a team that needs its own deploy cadence, a different
runtime, or a compliance boundary such as keeping card data (PCI scope) out of
the main app. Not reasons: "best practice", the number of files, or "to scale"
in general. A codebase with 200 files needs better module boundaries, not a
network between them.

So a new product built by a small team starts as a **modular monolith**: one
deployable and one database, with modules drawn around business capabilities
(catalogue, ordering, billing). Each module owns its tables, and other modules
call its public interface, never its tables. Enforce that with tooling
(\`no-restricted-imports\`, dependency-cruiser, project references) so it
survives deadlines. Extracting a well-bounded module later is a project;
untangling a ball of mud is a rewrite.

**Conway's law:** a system's structure mirrors the communication structure of
the organisation that builds it. Three teams produce three components whether
you planned them or not. Split teams by layer (a UI team, an API team, a
database team) and every feature needs three teams and two hand-offs. So design
team ownership and module boundaries together; doing it on purpose is called
the inverse Conway manoeuvre.

## Boundaries

A **bounded context** is the area where a word means one thing. "Customer" in
billing (a payer with a VAT number) is not "customer" in support (a person with
tickets). Each context owns its model and its data.

Two services reading and writing one shared schema is a distributed monolith:
the coupling is hidden in the tables. A column rename in one breaks the other,
neither can deploy alone, and nobody owns the schema. Share data through an API
or events instead. When you must talk to a legacy system or a vendor with a
messy model, put an **anti-corruption layer** at the edge that translates
their model into yours, so their vocabulary does not leak through your code.

Grounded example: a quiz app splits naturally into *content* (questions and
modules, read-only, versioned in git), *progress* (attempts and review
schedules, write-heavy per learner) and *profiles*. Progress refers to questions
only by id, so ids are the contract between the two: never reused, never
renumbered.

## Layering inside a service

Controller (parse, validate, map to status codes) → service (business rules,
transactions) → repository (SQL). The important rule is **dependency
direction**. In ports and adapters, the domain declares the interface it needs
(a port) and infrastructure implements it (an adapter):

\`\`\`ts
// domain/orders.ts: the port, owned by the domain
export interface OrderRepository {
  byId(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

// infra/pg-order-repository.ts: the adapter imports the domain
import type { OrderRepository } from '../domain/orders';
export class PgOrderRepository implements OrderRepository { /* SQL */ }
\`\`\`

At runtime the domain calls outward into the database; at compile time the
imports point *inward*. That is the point: business rules test against an
in-memory fake, and the storage can change without touching them. Do not
over-abstract, though. An interface with one implementation and no testing need
is ceremony, and a thin service over a query builder is fine for plain CRUD.

## Communication

A **synchronous call** is simple and fails loudly, but couples availability:
if invoicing is down, checkout fails. An **event or queued job** lets checkout
finish and the consumer retry later. The cost is real: eventual consistency,
idempotent consumers, queue-lag monitoring, dead-letter queues and harder
debugging. Publish reliably with the **outbox** (write the event row in the same
transaction as the order, relay it after commit).

A business process spanning services cannot use one database transaction, and
two-phase commit blocks on a coordinator and is unsupported by most brokers and
HTTP APIs. Use a **saga**: a sequence of local transactions where each step has
a **compensating action** (release the stock, refund the payment) run when a
later step fails.

## Evolution

- **Strangler fig:** put a facade in front of the legacy module, route one
slice of traffic at a time to the new implementation, delete the old one when
nothing reaches it.
- **Branch by abstraction:** introduce an interface inside the codebase, move
callers to it, then swap the implementation behind it.
- **Feature flags, expand/contract migrations, additive API changes** keep
every step reversible.

A big-bang rewrite of a working system is usually slower than incremental
refactoring: the old system keeps changing underneath you, the edge cases it
encodes are forgotten until users hit them, you maintain two systems, and no
value ships until cutover.

## Recording decisions

An **ADR** (architecture decision record) captures one decision in a page:

\`\`\`text
# ADR-0003: Store progress in SQLite, with a JSON file as the fallback
Status: accepted
Context: runs on the learner's machine; the native driver sometimes fails to install
Decision: SQLite via better-sqlite3; fall back to a JSON file with the same interface
Consequences: two stores to keep in parity; a corrupt database boots an empty store
Revisit when: the app is hosted for many users, or node:sqlite is stable on our floor
\`\`\`

**Consequences** is the section future readers need most: the costs accepted
and the follow-ups owed. Without it, the next engineer cannot tell a known
trade-off from a new problem. A **Revisit when** line with observable triggers
beats "when it becomes a problem". Never rewrite an accepted ADR; write a new
one that supersedes it.

**Build vs buy:** buy the commodity that is not your differentiator
(identity, payments, email delivery), weighing the licence against building,
securing, auditing and maintaining it forever. Identity is the textbook case:
MFA, password reset, breach response and SSO for enterprise customers are a
product of their own. Prefer boring technology, and treat running cost as a
requirement.

## Tech debt

Debt is deliberate ("ship now, fix after launch") or accidental (we learned a
better design). What matters is the **interest**: the extra time every change
in that area costs. Make it visible in product's terms (lead time for changes
here, incidents traced to it, onboarding time), attach the paydown to a roadmap
item that touches the area ("payments work goes through this module; three days
of cleanup first saves about two weeks"), and pay it down incrementally
alongside features. A standing slice of capacity works better than a
"refactoring sprint" that never gets scheduled.

## Worked example

The quiz app's ADR above chose SQLite with a JSON fallback for one learner on
one machine. Product now wants it hosted for a school of 5,000 learners. The
senior answer keeps the monolith: replace SQLite with managed Postgres behind
the same store interface (the port pays for itself here), make the API stateless
and add real authentication. A new ADR supersedes the old one, citing the
trigger the old one named. No services, because nothing about the new
requirement needs independent deploys or scaling.

Asked in an interview which decision you would reverse, give the same shape:
the context at the time, the signal that it was wrong, what it cost, how it was
unwound, and what you changed in how decisions get made.
`,
  },
  {
    id: 'craft-review',
    trackId: 'craft',
    title: 'Code review, mentoring and technical leadership',
    blurb:
      'Reviewing for what matters, feedback people act on, growing juniors, estimating honestly, and the design doc before the code.',
    estMinutes: 25,
    objectives: [
      'Review a PR in priority order: correctness and security, then design, then style',
      'Write review comments that are specific, kind and actionable',
      'Mentor a junior with questions and scaffolding rather than answers',
      'Estimate with ranges, communicate uncertainty, and push back on scope constructively',
    ],
    primer: `
## Why review

Review catches defects, spreads knowledge of the codebase, and makes ownership
shared, so no module belongs to one person. It is a poor use of humans for
anything a machine can check. **Automate** formatting (Prettier), lint rules,
type errors and running the tests; CI enforces them on every PR, and nobody
argues about semicolons again. Humans review what tools cannot judge: whether
the change is correct, safe and well designed.

Turnaround matters as much as thoroughness. A PR that waits two days for a
first look goes stale, collects conflicts and pushes its author to batch more
work into the next one. Aim to respond within a working day, even if the
response is "I'll review this properly tomorrow morning".

## What to look at, in order

Order your attention by what a problem costs once merged and deployed:

1. **Correctness and security.** Does it do what it claims? Injection, missing
authorisation checks, secrets, data exposure. A security hole can harm users
before anyone notices.
2. **Irreversible or external impact.** Migrations, public API contracts,
data formats other systems read. These cannot simply be rolled back once
clients depend on them.
3. **Tests.** Do they cover the risky path, and would they fail if the code
were wrong?
4. **Design and maintainability.** Will the next change in this area be easy?
Costly if wrong, but refactorable.
5. **Naming and style.** Worth a nit, never a blocker.

A review that spends ten comments on names and misses string-concatenated SQL
has the priorities backwards:

\`\`\`js
router.get('/orders/:id', async (req, res) => {
  const data2 = await db.query('SELECT * FROM orders WHERE id = ' + req.params.id);
  res.json(data2.rows[0]);
});
\`\`\`

Two blocking problems (SQL injection, and no check that the order belongs to
the caller) and one nit (the name).

## Writing comments

A good comment is **specific**, **explains why** and **suggests a way
forward**: "This loads every order into memory; with 100k rows it will run out
of memory. Could we paginate with the existing cursor helper?" Compare "this is
bad" (no reason), "why?" (no direction) or a pasted rewrite with no
explanation (no learning).

- Ask real questions when you are unsure; request changes when you are sure.
- **Label blocking vs non-blocking.** Prefix with \`nit:\`, \`suggestion:\` or
\`blocking:\` (Conventional Comments), so the author knows what must change
before merge.
- **Approve with comments** when the remaining points are optional. It says "I
trust you to address or decline these; no second round needed", which keeps
work moving.
- Too many comments is its own failure. If a PR earns 40, put the two or three
that matter in the summary, mark the rest non-blocking or drop them, and offer
to pair.
- If a thread reaches the third round, stop typing. A 15-minute call settles
what 20 comments did not; agree the criteria, then record the decision in the
PR for the people who were not on the call. If you still disagree and the
choice is reversible, disagree and commit.

## Being reviewed

Keep PRs small: review quality drops sharply as diffs grow, and a 2,000-line PR
gets a skim and an approval. Small PRs also merge sooner, with fewer conflicts.
Write a description with the why, the context and a test plan. Review your own
diff first; you will catch the debug log and the commented-out block.

## Mentoring

The goal is a more capable engineer, not a finished ticket.

- **Ask before telling.** "What have you tried? What did you expect to see?"
often unblocks them, and shows you where the gap is.
- **Scaffold.** Give a pointer, a file to read, or pair for 30 minutes, and let
them drive the keyboard.
- **Time-box being stuck.** Agree that after an hour or two without progress
they ask, and make asking cheap. A day stuck in silence is a process failure,
not a character flaw.
- **Graduated autonomy.** Well-defined tasks first, then ambiguous ones.
- **Do not rewrite their PR.** It is faster today and teaches nothing; next
time they make the same mistakes and you rewrite that too. Pair on it or leave
a few clear comments.
- **Feedback on behaviour and impact**, not character: "the migration had no
down path, and the rollback took an hour" rather than "you're careless".

## Estimation

Break the work down until the pieces are familiar, then give a **range with
assumptions**: "three to six days, assuming the CSV format is the one in the
sample; the unknown is the vendor's encoding." Where an unknown dominates, run a
**spike**: a short, time-boxed investigation whose output is knowledge, not
production code. Re-estimate after it. Say early when work is slipping; a week's
warning is a planning input, a day's warning is a crisis.

## Design docs and RFCs

Before a change that is expensive to reverse, write a short doc: the problem,
**goals and non-goals**, options considered, the decision, the rollout plan,
and risks. Non-goals stop scope creep and focus review on what is actually being
decided ("this does not cover multi-currency"). Circulate it before the code
exists, when changing your mind is cheap.

\`\`\`text
Title:     CSV import for orders
Problem:   support staff re-key 300 orders a week from partner spreadsheets
Goals:     upload a CSV, validate every row, import all or nothing
Non-goals: Excel files, scheduled imports, editing rows in the browser
Options:   import in the request / a background job with progress / a vendor tool
Decision:  a background job; the request only stores the file and enqueues it
Rollout:   behind a flag for two partners, then everyone
Risks:     unknown encodings (spike first), very large files (row limit)
\`\`\`

Reviewers of a doc like this argue about the options while they are still
cheap, and the non-goals line settles half the questions before they are
asked.

## Working with product

Put trade-offs in their language: dates, risk and user impact, not
frameworks. When a deadline looks unrealistic, do not silently work weekends
and do not flatly refuse. Write the options down with their consequences: cut
scope (ship import without the mapping UI), move the date (two more weeks for
the full feature), or accept risk (ship without load testing). Recommend one
and let the owner decide. Once decided, commit to it.

## Worked example

A junior opens a 900-line PR adding CSV import. Rather than 40 inline
comments, the review summary says: "Two things must change: the import runs in
the request and will time out on large files (move it to a job), and rows are
inserted one per query without a transaction, so a failure halfway leaves half
an import. Everything else is non-blocking. Want to pair on the job for half an
hour tomorrow?" Next time, a design doc with a non-goals section and a spike on
the file format would have surfaced both issues before any code was written.
`,
  },
];
