/**
 * Modules — Craft core: git, testing, security and shipping.
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const craftModules = [
  {
    id: 'craft-git',
    trackId: 'craft',
    title: 'Git in a team',
    blurb: 'Branching, merge vs rebase, conflicts, undoing mistakes and pull requests.',
    estMinutes: 30,
    objectives: [
      'Explain merge vs rebase and when each is appropriate',
      'Resolve a conflict without panicking',
      'Undo a commit safely on a shared branch',
      'Write a commit message and a PR a reviewer thanks you for',
    ],
    primer: `
## The model

Git stores snapshots. A commit points at a tree plus its parents; a branch is
just a moving pointer to a commit; \`HEAD\` points at your current branch. Three
places to keep straight: **working directory** → \`git add\` → **staging area**
→ \`git commit\` → **repository**.

## Everyday flow

\`\`\`bash
git switch -c feature/order-filters
git add -p                       # stage hunks, review as you go
git commit -m "Filter orders by status"
git fetch origin
git rebase origin/main           # replay your commits on top of latest main
git push -u origin feature/order-filters --force-with-lease
\`\`\`

## Merge vs rebase

**Merge** creates a commit with two parents; history is true but noisy.
**Rebase** rewrites your commits onto a new base; history is linear and readable
but the commits are *new objects*. The rule: **never rebase a branch other
people have pulled**. Rebase your own feature branch to stay current, merge (or
squash-merge) into \`main\`.

\`--force-with-lease\` instead of \`--force\` refuses to push if someone else
has pushed since you last fetched. Use it every time.

## Conflicts

A conflict is Git telling you two commits changed the same lines and it will not
guess. Open the file, resolve between the markers, \`git add\` it, then
\`git rebase --continue\` or \`git commit\`. \`git merge --abort\` /
\`git rebase --abort\` always gets you back to safety.

## Undo, by situation

| Situation | Command |
| --- | --- |
| Unstage a file | \`git restore --staged file\` |
| Discard local changes | \`git restore file\` |
| Fix the last commit (not pushed) | \`git commit --amend\` |
| Undo last commit, keep changes | \`git reset --soft HEAD~1\` |
| Undo a **pushed** commit | \`git revert <sha>\` |
| Park work | \`git stash\` / \`git stash pop\` |
| "I destroyed everything" | \`git reflog\` |

\`reset --hard\` on shared history rewrites what others have; \`revert\` adds a
new commit that undoes the change and is the safe public option. \`reflog\`
remembers where HEAD has been — ~90 days for entries still reachable, ~30 for
commits no longer on any branch — and has saved everyone at least once.

## reset, three ways

\`git reset <commit>\` always moves the current branch pointer; the mode decides
how much else follows it.

| Mode | Branch | Index (staged) | Working tree |
| --- | --- | --- | --- |
| \`--soft\` | moved | kept | kept |
| \`--mixed\` (the default) | moved | reset | kept |
| \`--hard\` | moved | reset | reset |

So \`--soft HEAD~1\` uncommits and leaves everything staged, \`--mixed\` leaves
the changes unstaged, and \`--hard\` throws them away. Committed work lost to a
\`--hard\` is still in the reflog; uncommitted work never was anywhere.

## Ranges

\`git log main..feature\` lists commits reachable from \`feature\` but not from
\`main\`, newest first: exactly what your branch adds. Flip it
(\`feature..main\`) to see what landed on \`main\` since you branched. Three
dots (\`main...feature\`) is the symmetric difference: commits on either side
but not both.

## Interactive rebase and autosquash

Before opening a PR, tidy an unshared branch:

\`\`\`bash
git commit --fixup a1b2c3d        # records "fixup! <subject of a1b2c3d>"
git rebase -i --autosquash main   # moves each fixup under its target
\`\`\`

In the todo list, \`pick\` keeps a commit, \`reword\` edits its message,
\`squash\` folds it into the previous one and lets you edit the combined
message, \`fixup\` folds it in and keeps the previous message, and \`drop\`
deletes it. It rewrites history, so it is for branches nobody else has built
on; push with \`--force-with-lease\`. With stacked branches,
\`git rebase --update-refs\` moves the intermediate branch pointers along too.

## The rebase-conflict loop

Rebase replays your commits one at a time, so a conflict can stop it once per
commit:

1. Edit the conflicted files and remove the markers.
2. \`git add\` them: staging is how you tell Git a file is resolved.
3. \`git rebase --continue\`, and repeat for the next conflicting commit.
4. When it finishes, \`git push --force-with-lease\`, because the commits are new objects.

\`git rebase --abort\` returns you to exactly where you started at any point.

## Moving, reverting and tracing single commits

- **Cherry-pick.** \`git cherry-pick -x <sha>\` applies one commit's diff onto
  the current branch as a new commit. It is how a hotfix on \`main\` reaches
  \`release/2.3\` without dragging everything else along; \`-x\` records the
  source sha in the message.
- **Reverting a merge.** A merge has two parents, so name the mainline:
  \`git revert -m 1 <merge-sha>\` keeps the branch you merged into. Git still
  considers the branch's commits merged, so to re-land the work later, revert
  the revert first.
- **Blame.** \`git blame file\` shows the commit that last touched each line;
  follow it to the PR for the *why*. \`-w\` ignores whitespace, and a
  \`.git-blame-ignore-revs\` file skips mass reformats.

## Untracking a file

\`.gitignore\` only affects files Git is not already tracking. If \`.env\` was
committed before it was ignored, Git keeps tracking it until
\`git rm --cached .env\`, which removes it from the index and keeps your local
copy. None of this touches history: the old versions are in every clone, so a
committed secret must be rotated, and purging it needs \`git filter-repo\`.

## Pull requests

Small, single-purpose, with a description of *why*. Imperative-mood subject
under ~50 characters, body explaining context and trade-offs, and a link to the
ticket. Conventional Commits (\`feat:\`, \`fix:\`, \`chore:\`) let tooling
generate changelogs. As a reviewer, comment on correctness and clarity, ask
questions rather than issue orders, and approve when it is *better*, not when it
is perfect.

Also worth knowing: \`git bisect\` to binary-search for the commit that broke
something, \`git cherry-pick\` to move one commit between branches,
\`git blame\` to find out who to ask, and \`.gitignore\` — plus the fact that
committing a secret means rotating it, because deleting it later does not remove
it from history.
`,
  },
  {
    id: 'craft-testing',
    trackId: 'craft',
    title: 'Testing a CRUD app',
    blurb: 'The pyramid, unit vs integration vs e2e, test doubles, and what is worth testing.',
    estMinutes: 30,
    objectives: [
      'Say what each layer of the pyramid buys you',
      'Distinguish a stub, a mock and a fake',
      'Explain why testing implementation details makes tests worse',
      'Decide what to test in a CRUD feature',
    ],
    primer: `
## The pyramid

Many fast **unit** tests (one function or component, no I/O), fewer
**integration** tests (several pieces together — a route with a real test
database), a few **end-to-end** tests (a browser driving the real app). The
shape is about cost and speed: e2e tests catch the most but are slow and flaky,
so you keep a handful covering the critical journeys — sign up, add to cart,
check out.

## Doubles

- **Stub** — returns canned data. "This repository returns these three orders."
- **Mock** — a stub you also assert on. "The email sender was called once."
- **Fake** — a working lightweight implementation. In-memory repository, SQLite
  instead of Postgres.
- **Spy** — wraps the real thing and records calls.

Over-mocking couples tests to structure: refactor the internals without changing
behaviour, and every test breaks while the app still works. Prefer fakes, and
mock at the *boundary* (the HTTP call, the clock, the payment provider).

## Test what a user can observe

\`\`\`js
// implementation detail — breaks on refactor
expect(wrapper.state('isOpen')).toBe(true);

// behaviour — survives refactors
await user.click(screen.getByRole('button', { name: /filters/i }));
expect(screen.getByRole('dialog')).toBeVisible();
\`\`\`

Testing Library queries by role, label and text on purpose: if your test cannot
find the element the way a user or a screen reader would, that is an
accessibility bug too. Query priority is role → label → placeholder → text →
test id, with \`data-testid\` as the escape hatch.

Structure each test **Arrange, Act, Assert**, name it after the behaviour
(\`returns 404 when the order belongs to another user\`), and keep tests
independent — order-dependent tests are a permanent tax.

## In a CRUD app, specifically

Worth testing: validation rules, authorisation ("another user's id returns
403/404"), the mapping between entity and DTO, pagination edges, error paths,
and any calculation (totals, discounts, dates). Not worth testing: that the
framework routes, that a getter gets, or snapshots of an entire page that
someone will update blindly the moment they fail.

For the API, spin up the app in-process (supertest, \`WebApplicationFactory\`)
against a real migrated test database, and reset state between tests with a
transaction rollback or a truncate.

## Mock the network, not the module

\`vi.mock('./api')\` replaces your own client, so the code most likely to be
wrong (URLs, headers, parsing, error handling) never runs, and tests break when
files move. MSW intercepts requests at the network layer and answers them from
handlers:

\`\`\`js
const server = setupServer(
  http.get('/api/orders', () => HttpResponse.json([{ id: 1, total: 42 }])),
);
// one test overrides it: server.use(http.get('/api/orders', () => new HttpResponse(null, { status: 500 })));
\`\`\`

The same handlers can power the dev server before the back end exists.

## Time and async assertions

- **Fake timers.** Test a 300 ms debounce with \`vi.useFakeTimers()\` and
  \`vi.advanceTimersByTime(300)\`, then assert that one request went out. Real
  sleeps are slow and still flaky on a busy CI runner. Restore with
  \`vi.useRealTimers()\`, and pass \`advanceTimers: vi.advanceTimersByTime\`
  to \`userEvent.setup()\` so its own delays use the fake clock.
- **Await your assertions.** \`expect(p).resolves.toBe(x)\` returns a promise.
  Without \`await\` (or \`return\`) the test can finish before it settles:
  Jest passes it even when \`p\` rejects, and recent Vitest versions report the
  un-awaited assertion. Marking the test \`async\` changes nothing by itself;
  \`expect.assertions(n)\` and the \`valid-expect\` lint rule are the guards.

## End-to-end without flakiness

Flaky e2e suites come from fixed sleeps, tests that share and mutate the same
records, and tests that only pass after another test ran. Seed data per test,
query by role and accessible name, and let the framework wait. Playwright's
web-first assertions retry until they pass or time out:

\`\`\`js
await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
// checks one instant only, and flakes:
expect(await page.getByRole('button', { name: 'Save' }).isEnabled()).toBe(true);
\`\`\`

The same queries enforce markup: a clickable \`<div>\` has no button role, so
\`getByRole('button', { name: 'Save' })\` fails. That failure is the test doing
its job; the fix is a real \`<button>\`, not a test id.

## Test data builders

\`\`\`js
const order = anOrder().paid().withItems(3).build();
\`\`\`

A builder supplies valid defaults and intent-revealing methods, so each test
states only the fields it cares about, and a new required field is added once,
in the builder, rather than in two hundred object literals.

## Legacy code: characterise first

Changing an untested service? First write **characterisation tests** at the API
boundary that record what it does today, odd cases included, then refactor and
change it under them. A behaviour that turns out to be a bug gets a deliberate
decision with the product owner, not a silent fix. Resist the reflex to mock
every collaborator: such a test proves only that the code calls its mocks the
way the mocks were told to expect, and it breaks on every refactor.

## Load tests

A **load test** (k6, Artillery, JMeter, NBomber) runs many virtual users at the
traffic you expect and reports latency percentiles and error rate. A stress test
pushes beyond it to find the breaking point; a soak test holds it for hours to
expose leaks. Run them against a production-like environment, never a laptop.

## Coverage and CI

Coverage tells you what was executed, not what was verified — 100% coverage with
no assertions is possible. Use it to find untested areas, not as a target.
Tests run in CI on every push; a flaky test must be fixed or deleted, because a
suite people ignore is worse than no suite.

## TDD, briefly

Red → green → refactor. The value is less "testing" and more design pressure:
code that is hard to test is usually hard to use. You do not have to practise it
to answer the question, but you should be able to describe the loop.
`,
  },
  {
    id: 'craft-security',
    trackId: 'craft',
    title: 'Security for CRUD apps',
    blurb: 'Injection, XSS, CSRF, broken access control, secrets and dependency risk.',
    estMinutes: 30,
    objectives: [
      'Explain SQL injection and the one correct fix',
      'Explain XSS and how React helps and where it stops helping',
      'Describe broken access control with a concrete example',
      'List what you would check before shipping a login form',
    ],
    primer: `
## Broken access control

Top of the OWASP Top 10 since 2021, and the one juniors miss. The bug is
checking *authentication* but not *ownership*:

\`\`\`js
// Anyone logged in can read anyone's order.
app.get('/api/orders/:id', requireAuth, (req, res) =>
  res.json(db.getOrder(req.params.id)));

// Scope every query by the owner.
db.getOrder({ id: req.params.id, userId: req.user.id });
\`\`\`

That is **IDOR**. Related: trusting a client-side role check, trusting a hidden
form field, or letting a client set \`isAdmin\` through mass assignment. Deny by
default, check on every request, on the server.

## Injection

Never build a query by concatenating input. Parameterised queries send the SQL
and the data separately, so the data can never become code:

\`\`\`js
db.query('SELECT * FROM users WHERE email = $1', [email]);   // safe
db.query(\`SELECT * FROM users WHERE email = '\${email}'\`);   // catastrophic
\`\`\`

ORMs parameterise for you — until you drop to raw SQL. The same logic applies to
shell commands, to \`LIKE\` patterns, and to any column name you interpolate
(whitelist those; they cannot be parameterised).

## XSS

Injected script running in your origin — it can read the DOM, your
\`localStorage\`, and act as the user. React escapes interpolated values by
default, so \`{userInput}\` is safe. What is not safe:
\`dangerouslySetInnerHTML\`, \`href={userInput}\` with a \`javascript:\` URL
(React 19 replaces these with a URL that throws; React 18 only warned),
injecting into \`<script>\`, and rendering unsanitised HTML from a rich-text
editor (sanitise with DOMPurify). Add a Content-Security-Policy as the second
line of defence.

## CSRF

The victim's browser is tricked into sending an authenticated request, and it
works because cookies attach automatically. Defences: \`SameSite=Lax\` cookies,
an anti-forgery token, and checking \`Origin\`. APIs that authenticate with an
\`Authorization\` header are not CSRF-prone, because the header is not sent
automatically.

## Secrets and dependencies

Secrets live in environment variables or a vault, never in the repo, never in
the client bundle — anything in \`VITE_\`/\`NEXT_PUBLIC_\` is public. A secret
that was ever committed is compromised: rotate it. Keep dependencies patched
(\`npm audit\`, Dependabot); most real-world breaches of small apps come through
an outdated package or a leaked key rather than clever cryptography.

## The pre-ship checklist for a login form

HTTPS everywhere and HSTS; password hashed with bcrypt/Argon2; rate limiting and
lockout on repeated failures; identical error text for "no such user" and "wrong
password" (no user enumeration); session cookie \`HttpOnly; Secure;
SameSite=Lax\`; session regenerated on login; logout invalidates server side;
no tokens in URLs or logs; generic error pages in production so stack traces do
not leak.

## Mass assignment

\`\`\`js
// The client sends { "name": "Ana", "role": "admin" } and becomes an admin.
await User.update(req.body, { where: { id: req.user.id } });
\`\`\`

The \`where\` clause limits *which row*, not *which fields*. Parse the body into
a schema or DTO that lists only the editable fields and map from that; never
bind a request body straight to an entity. ASP.NET calls the same bug
over-posting. A blocklist of dangerous fields fails the day someone adds a
column.

## Open redirects

\`res.redirect(req.query.next)\` after login lets a phishing link on your domain
land users on a fake page. The classic incomplete fix, "\`next\` must start with
\`/\`", fails for \`//evil.example\` and \`/\\evil.example\`, which browsers
treat as another host. Parse with \`new URL(next, ourOrigin)\` and redirect only
if the origin matches, or allow only a list of known paths.

## Path traversal

\`\`\`js
res.sendFile(path.join(UPLOADS, req.query.name)); // name=../../../etc/passwd
\`\`\`

\`path.join\` normalises the \`..\` segments away, so \`sendFile\` receives a
clean \`/etc/passwd\` and serves it. Resolve the path and check it still starts
with \`UPLOADS + path.sep\`, pass \`{ root: UPLOADS }\` so the library checks,
or better, store files under generated ids and look names up in the database.

## SSRF in one paragraph

Server-side request forgery: a feature that fetches a user-supplied URL (import
from URL, webhooks, link previews) is pointed at something only your server can
reach, such as the cloud metadata endpoint or an internal admin service.
Allowlist destinations rather than blocklisting addresses. Covered in depth in
*Application security in depth*.

## Security headers

- \`X-Content-Type-Options: nosniff\` stops the browser guessing a different
  type than \`Content-Type\` says, so an uploaded text file cannot run as script.
- \`Content-Security-Policy: frame-ancestors 'none'\` (the modern
  \`X-Frame-Options: DENY\`) stops other sites framing your pages for
  clickjacking.
- \`Strict-Transport-Security\` stops downgrades to plain HTTP.

helmet (Node) or a few lines of middleware in ASP.NET Core set a sensible
baseline.

## Passwords at rest

HTTPS protects a password in transit and does nothing for a dumped database, so
reversible encryption is never acceptable. Store a slow, salted hash. OWASP's
current order is **Argon2id** first (memory-hard, so each guess costs RAM as
well as CPU), then scrypt, then bcrypt for existing systems.

## Supply chain basics

The npm risks are typosquatted names, malicious \`postinstall\` scripts and
hijacked maintainer accounts publishing a poisoned release. Commit the lockfile
and install with \`npm ci\` so CI gets exactly the reviewed versions, check a new
package's name and maintainers before adding it, keep dependencies few, and use
\`--ignore-scripts\` where feasible. \`npm audit\` only matches *known*
advisories; it cannot spot a release hijacked an hour ago.

## When a secret leaks

1. Revoke the key and issue a new one. Public repos are scraped within minutes.
2. Check the provider's logs for use during the exposure window.
3. Remove it from the code and, if needed, rewrite history.
4. Add secret scanning (push protection, gitleaks in CI) so it cannot recur.

## CORS is not access control

CORS is a browser mechanism that *relaxes* the same-origin policy: it decides
whether a page from another origin may read your response. The server still
receives and runs the request, and curl, scripts and other servers ignore CORS
entirely. Who may call the API is decided by authentication and authorisation
on every endpoint.

## The OWASP Top 10 in one table

| Category (2021 name) | In a CRUD app | In the 2025 edition |
| --- | --- | --- |
| Broken Access Control | IDOR, missing ownership checks, mass assignment | Still first; now includes SSRF |
| Cryptographic Failures | Fast or reversible password storage, no TLS | Kept |
| Injection | SQL, command and NoSQL injection, XSS | Kept |
| Insecure Design | No rate limit on password reset | Kept |
| Security Misconfiguration | Debug mode on, default credentials, public buckets | Kept, ranked higher |
| Vulnerable and Outdated Components | An unpatched dependency | Broadened to Software Supply Chain Failures |
| Identification and Authentication Failures | Weak sessions, credential stuffing | Renamed Authentication Failures |
| Software and Data Integrity Failures | Unsigned updates, unsafe deserialisation | Kept |
| Security Logging and Monitoring Failures | No audit trail, nobody alerted | Renamed to logging and alerting |
| Server-Side Request Forgery | Fetching a user-supplied URL | Folded into Broken Access Control |

The 2025 edition also adds Mishandling of Exceptional Conditions. Learn the
ideas rather than the ranks, and note what is *not* a category: CSRF sits inside
Broken Access Control, and denial of service is not on the list. Covered in
depth in *Application security in depth*.
`,
  },
  {
    id: 'craft-shipping',
    trackId: 'craft',
    title: 'Shipping and running it',
    blurb: 'Environments, CI/CD, Docker, logging, monitoring and debugging production.',
    estMinutes: 30,
    objectives: [
      'Describe a CI pipeline for this stack',
      'Explain what Docker solves',
      'Say what you would log and what you would alert on',
      'Walk through debugging "the site is slow" methodically',
    ],
    primer: `
## Environments

Development, staging, production — same code, different configuration, injected
from the environment. Anything that differs per environment (URLs, connection
strings, keys, feature flags) is config, and the front end's build-time
variables are baked into the bundle and therefore public.

## CI/CD

**CI** runs on every push: install with \`npm ci\` / \`dotnet restore\`, lint,
type-check, test, build. **CD** deploys the artefact that CI produced — the
same artefact through each environment, so you are not rebuilding on the way to
production. Keep the pipeline fast (cache dependencies, run jobs in parallel) or
people route around it, and make \`main\` always deployable.

Deployment strategies worth naming: blue/green (two environments, flip the
router), canary (a slice of traffic first), and rolling. Every one of them needs
a **rollback** you have actually tested, and database migrations that are
backwards-compatible for the window when both versions are live — expand,
migrate, contract.

## Docker, briefly

An image is a filesystem plus metadata built from a \`Dockerfile\`; a container
is a running instance. It solves "works on my machine" by shipping the runtime
with the app. Practical points: multi-stage builds (build with the SDK, run on a
slim runtime image), \`.dockerignore\` so \`node_modules\` and \`.git\` do not
bloat the context, order layers so dependency installation caches, do not run as
root, and pass configuration as environment variables. \`docker compose\` wires
your app to a database locally.

## Dockerfiles that build fast and small

\`\`\`bash
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
\`\`\`

Each instruction is a cached layer, reused only if it and everything above it
are unchanged. Copy the manifests and install *before* \`COPY . .\`, or every
source edit reinstalls every package. The multi-stage split builds with the
full toolchain and ships only the output on a slim runtime image (for .NET:
build on the \`sdk\` image, run on \`aspnet\`): smaller, nothing to compile
with, less to attack. \`.dockerignore\` keeps \`node_modules\`, \`.git\` and
\`.env\` out of the build context.

## Liveness vs readiness

**Liveness** asks "is this process stuck beyond repair?"; failing it gets the
container restarted. **Readiness** asks "should I get traffic right now?";
failing it only takes the instance out of the load balancer. Put the database
check in readiness only: in liveness, a database blip restarts every replica at
once, which fixes nothing.

## Build once, promote

Tag each image with the commit SHA and deploy the exact image that passed
staging to production, with per-environment settings injected at run time.
Never deploy \`:latest\`: it is a movable label, so you cannot tell what is
running or roll back to a named version. A pipeline that respects this:

1. \`npm ci\`
2. Unit tests (fast, fail before paying for a build)
3. Build the image, tagged with the SHA
4. Integration tests against that image
5. Deploy that same image

## Canary releases

Send a small share of real traffic (say 5%) to the new version, compare its
error rate and latency with the old version, then ramp up or roll back,
ideally automatically. Blue/green switches everything at once with an instant
switch back; a rolling update replaces instances gradually with no comparison
built in.

## Flag hygiene

Feature flags are configuration with a lifecycle: a default, an owner, an
expiry, and a removal PR once the feature is fully rolled out. Every live flag
multiplies the code paths, most of which nobody tests, and stale flags are how
dead code comes back to life. Operational **kill switches** are the exception:
they are meant to be permanent, so track them as a separate kind.

## Observability

**Logs** — structured JSON with a request id so one request is traceable across
services. **Metrics** — request rate, error rate, latency percentiles (p95/p99,
because the average hides the pain), CPU, memory, database connections.
**Traces** — where the time went across services. Alert on **symptoms users
feel** (error rate, latency, availability), not on every CPU spike, or people
learn to ignore alerts.

Health endpoints: liveness ("am I running") and readiness ("can I serve — is the
database reachable"). Wire up an error tracker (Sentry) with source maps so a
production stack trace is readable.

## Debugging production

Have a method rather than a hunch:

1. **What changed?** Deploys, config, feature flags, traffic, upstream.
2. **Scope it.** All users or some? All endpoints or one? When did it start?
3. **If users are hurting, mitigate now** — roll back, scale, disable the flag —
   then diagnose calmly.
4. **Follow the data.** Metrics for the shape, logs for the detail, traces for
   the layer.
5. **Form one hypothesis, test it, write down what you learn.**
6. **Fix properly**, then a blameless postmortem: timeline, root cause, what
   made it slow to detect, one or two concrete actions.

"The site is slow" is usually a database query without an index, an N+1, a
missing cache, a payload that grew, or a synchronous call blocking the loop —
check in that order before rewriting anything.

Observability is covered in depth in *Observability: logs, metrics and traces*, running an
incident in *Incidents, on-call and reliability*, and the platforms you deploy onto in
*Cloud basics for a CRUD app*.
`,
  },
  {
    id: 'craft-cloud',
    trackId: 'craft',
    title: 'Cloud basics for a CRUD app',
    blurb:
      'Managed compute, databases and object storage, networking and IAM at the level a mid-level developer deploys with — and what actually costs money.',
    estMinutes: 30,
    objectives: [
      'Explain the service model and choose the compute platform for a CRUD API with a reason',
      'Describe a standard cloud deployment: load balancer, app tier, managed database, object storage, CDN',
      'Give the app its permissions and secrets without long-lived keys',
      'Name the five things that will surprise you on the bill',
    ],
    primer: `
## The service model

Every cloud product sits somewhere on one line: how much of the stack you run
yourself.

| Model | You manage | Provider manages | Example |
| --- | --- | --- | --- |
| IaaS | OS, patches, runtime, process, app | Hardware, network, hypervisor | EC2, Azure VM |
| PaaS | Your app or container, its config | OS, runtime, scaling, TLS, deploys | App Service, Container Apps, ECS on Fargate, Cloud Run |
| Serverless functions | Individual handlers | Everything else, billed per invocation | Lambda, Azure Functions |

This is the **shared responsibility model**: each step up hands another layer to
the provider, but your code, your data and who can access it are always yours.
A misconfigured public bucket is your breach, not the provider's.

## Compute for a CRUD API

**Default: a managed container or app platform.** Build an image (or a
publishable app), push it, and the platform runs it with health checks,
autoscaling, TLS, rolling or slot-based deploys and rollback. No OS patching, no
process supervisor, no SSH. For a Node or .NET API this is the right first
answer in an interview and in real life.

**Functions** fit spiky, event-driven or low-traffic work: a webhook receiver, a
nightly job, an image resize on upload. The catch is the **cold start**: after a
quiet period the platform has scaled to zero, so the first requests wait while a
new instance boots the runtime, loads your code and opens database connections.
The symptom is a tail-latency spike (p99 of several seconds) in the first
minutes after idle while p50 stays normal. Fixes: provisioned concurrency or
minimum instances (you pay for them while idle), less work at startup, or keep
latency-sensitive endpoints on containers.

**VMs and Kubernetes are deliberate choices**, not defaults. A VM makes you the
ops team. Kubernetes is a platform you operate: it pays off with many services,
shared platform needs and people to run it, and is overhead for one CRUD API.

## Data: databases, caches and files

**Managed relational database** (Amazon RDS or Aurora, Azure Database for
PostgreSQL, Azure SQL). The provider runs automated backups with
**point-in-time recovery**, minor-version patching in a maintenance window,
metrics, and a **multi-AZ** standby with automatic failover. What you still own:
schema and migrations, indexes and query performance, the instance size and its
cost, and **connection limits**. Twenty app instances with a pool of 20 each is
400 connections, which a small instance will refuse; size pools deliberately or
add a pooler. Read replicas help read-heavy load but serve slightly stale data.

**Redis** (ElastiCache, Azure Cache for Redis) holds caches, rate-limit
counters and sessions: small, hot data with expiry.

**Object storage** (S3, Azure Blob Storage) holds files: user uploads, generated
exports, static front-end assets. It is cheap, durable and served over HTTP. The
database keeps a row with the object key and metadata, never the bytes. Never
write uploads to an instance's local disk: it is not shared between instances
and disappears on redeploy or scale-in. Uploads go browser-to-storage with a
**presigned URL** (a SAS URL on Azure):

\`\`\`js
// API: authorise the user, then hand back a short-lived upload URL
const key = \`uploads/\${user.id}/\${randomUUID()}\`;
const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket, Key: key }), { expiresIn: 300 });
res.json({ url, key });
\`\`\`

Keep buckets private and put a **CDN** (CloudFront, Azure Front Door) in front
of anything public.

## Networking on one page

- **Region**: a geographic area (\`eu-west-1\`, West Europe). **Availability
  zone**: one of several isolated data centres inside a region, with its own
  power and network. Instances in two zones plus a multi-AZ database is the
  standard high-availability step. Multi-region is a much bigger decision;
  see *System design for CRUD apps*.
- **VPC / VNet**: your private network. **Public subnets** hold what the
  internet may reach (the load balancer); **private subnets** hold the app and
  the database, with no public addresses.
- **Load balancer** (ALB, Azure Application Gateway): terminates TLS, spreads
  requests across instances, and uses a **health check** to stop sending
  traffic to unhealthy ones.
- **Security groups / NSGs**: stateful firewalls around resources. Rules can
  reference another group, so "Postgres 5432 only from the app tier's group" is
  tighter than "from anywhere in the VPC" and keeps working as instances change.
- **NAT gateway**: lets private instances make outbound calls (package
  downloads, third-party APIs) without being reachable. Convenient and pricey.
- **DNS** points your name at the CDN or load balancer.

A typical API request: DNS resolves the name, the CDN edge serves cached assets
and forwards \`/api\`, the load balancer picks a healthy instance, the app in a
private subnet queries the database in another private subnet.

## Identity and secrets

The app needs permissions ("read this bucket") and secrets ("the payment API
key"). The rule: **no long-lived keys where an identity will do.**

- **Workload identity.** Attach an IAM role (AWS) or a managed identity (Azure)
  to the running app. The platform hands it short-lived credentials
  automatically; the SDKs pick them up. Nothing to leak, nothing to rotate.
- **Least privilege.** The policy says exactly what is needed: this bucket,
  read only; this queue, send only. Not \`*\`.
- **CI via OIDC.** GitHub Actions or Azure DevOps exchange a per-run OIDC token
  for short-lived cloud credentials, scoped to one repository and branch. No
  cloud key stored in repository secrets.
- **Secret stores.** Secrets that must exist (third-party API keys, a database
  password when identity auth is unavailable) live in Key Vault or Secrets
  Manager, with access control, audit and rotation. The platform injects them
  as environment variables or files at startup. **Environment variables are the
  delivery mechanism, not the store**: a value typed into a console has no
  history and no rotation. Never bake secrets into images or commit them, even
  encrypted with a key shared in chat.

## Environments and infrastructure as code

Staging should look like production, smaller: same services, same topology,
different sizes and secrets. The only reliable way to get that is
**infrastructure as code**: Terraform, Bicep or AWS CDK files in the repository,
changed through pull requests. You get review and history for infrastructure,
a \`plan\` (or \`what-if\`) preview before anything changes, the ability to
recreate an environment after an accident, and **drift** detection when someone
edits a resource by hand. Click-ops is fine for exploring; anything that
matters is code. Start small: database, app platform, secrets, DNS.

## Cost

Compute is the part people estimate. The surprises are elsewhere:

| Surprise | Why it bites | What to do |
| --- | --- | --- |
| NAT gateway | Hourly charge plus per-GB processing | VPC endpoints for cloud services, one shared NAT for dev |
| Egress | Data *leaving* the cloud is billed; ingress is generally free | CDN caching, compress responses |
| Idle databases | Provisioned instances bill every hour | Stop or shrink dev and test at night, serverless tiers |
| Logs | Billed on ingestion and retention | Sensible levels, sampling, short retention |
| Forgotten resources | Old environments, snapshots, public IPs | Tags with owner, regular clean-up |

Security groups, IAM roles and VPCs themselves cost nothing. Set a **budget
with alerts** on day one; the first bill should not be how you find out.

## Operating it

Use the platform's built-in logs and metrics before adding tools. Autoscale on
a signal that reflects load (CPU, request count, queue depth) with sane minimum
and maximum instance counts. Tag every resource with owner, environment and
service.

**The 502 checklist.** A 502 from the load balancer means it got no valid
response from any backend. Check, in order:

1. The platform's logs: a crash at startup, often a missing environment
   variable or secret.
2. The listen address and port: inside a container the app must listen on
   \`0.0.0.0\`, not \`localhost\`, and on the port the platform expects
   (often \`PORT\`).
3. The health check: the path exists and returns 200, and the grace period is
   longer than your startup time, or the platform kills instances that were
   about to become healthy.
4. Security groups between the load balancer and the app.

"Works locally, 502 in the cloud" is one of these four almost every time.
`,
  },
];
