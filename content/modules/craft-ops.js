/**
 * Modules — Craft ops: running it in production.
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const craftOpsModules = [
  {
    id: 'craft-observability',
    trackId: 'craft',
    title: 'Observability: logs, metrics and traces',
    blurb:
      'Structured logs with context, RED metrics, traces with OpenTelemetry, SLOs, and alerts that only wake someone when it matters.',
    estMinutes: 30,
    objectives: [
      'Write a structured log line with the fields that make it searchable',
      'Instrument a service with RED metrics and say what each one catches',
      'Follow a request across services with a trace and a correlation id',
      'Define an SLO and a burn-rate alert instead of a CPU alert',
    ],
    primer: `
## Monitoring vs observability

**Monitoring** answers questions you predicted: is the error rate above a line,
is the disk full. **Observability** is being able to answer questions you did not
predict ("why are only checkout requests from one tenant slow?") from the
telemetry you already emit, without shipping new code. You get there with three
signals that link to each other: **logs** (discrete events with detail),
**metrics** (cheap numbers aggregated over time) and **traces** (the path of one
request through every service).

## Structured logging

Log JSON, one object per line, with a constant message and the variables as
fields:

\`\`\`js
// bad: values baked into prose, every consumer must regex it
console.log('order ' + id + ' placed by ' + user);

// good: queryable, aggregatable, cheap to parse
logger.info({ orderId, userId, durationMs }, 'order placed');
\`\`\`

A request log line carries: timestamp, level, **trace id** (or request id), route
template (\`/orders/:id\`, not the raw path), status and duration. Configure
redaction (pino \`redact\`, Serilog destructuring policies) so a careless
\`logger.info(req.headers)\` cannot leak anything.

**Never log** passwords, bearer tokens, session ids, API keys, full card numbers
(PCI DSS forbids it) or more personal data than you need. A token in a log is a
live credential, and logs are copied to more places and kept longer than your
database.

Levels are a contract about who must care:

| Level | Use it for |
| --- | --- |
| \`debug\` | Off by default; switched on per module or request while investigating |
| \`info\` | Business events: order placed, user signed up |
| \`warn\` | Handled oddities: a retry that succeeded, a deprecated endpoint called |
| \`error\` | Someone should act. A client's 400 is not your error |

If \`error\` is noisy, error alerts get muted and the real one is missed.

**Sampling.** Successful requests are repetitive and metrics already count them
exactly, so keeping 10% of success logs and 100% of errors and slow requests is a
legitimate cost cut. Record the sample rate as a field, and never compute
business numbers from sampled logs.

## Metrics

Three types matter:

- **Counter**: only goes up (requests served, errors). You chart its rate.
- **Gauge**: a value that goes up and down (queue depth, pool connections in use).
- **Histogram**: counts of observations in fixed buckets (request duration). This
  is how you get percentiles.

Percentiles cannot be averaged: the mean of six instances' p95 values is not the
fleet p95. Histogram buckets are counters, so you sum them across instances first,
then compute the quantile:

\`\`\`bash
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
\`\`\`

A gauge of the last request's duration samples one request per scrape; total
milliseconds over request count gives only the mean, which hides the slow tail.
Put bucket boundaries around your SLO threshold.

**RED** for every request-serving service: **Rate** (traffic shifts), **Errors**
(breakage), **Duration** as a distribution (slowness). **USE** for resources:
**Utilisation**, **Saturation**, **Errors** for CPU, memory, connection pools and
queues. Google's four golden signals are roughly RED plus saturation.

**The cardinality trap.** Every unique combination of label values is its own
time series held in the backend's index. \`http_requests_total{user_id="…"}\`
with 200,000 users is 200,000 series per route and method, and the backend runs
out of memory. Labels must be bounded: route template, method, status class.
Unbounded values (user id, email, request id, raw URL paths with ids in them)
belong in logs and trace attributes, which are built for high cardinality.

## Tracing

A **trace** is a tree of **spans**. The server span for the incoming request is
the root: it opens first, closes last, and everything else is its child in the
order the code runs. An outbound HTTP call is a **client span**; if the callee is
instrumented, its server span becomes a child of yours. Gaps in the waterfall
where no child is running are time spent in your own code.

Context crosses process boundaries in the W3C Trace Context header:

\`\`\`bash
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
#            version-trace id (32 hex)-parent span id (16 hex)-flags
\`\`\`

\`tracestate\` carries optional vendor data. Across a queue you copy the context
into message attributes, or the trace breaks in two.

**OpenTelemetry** is the vendor-neutral standard: APIs, SDKs, auto-instrumentation,
the OTLP protocol and the **Collector**, which receives telemetry, processes it
(batching, redaction, sampling) and exports it. It is not a backend; you send OTLP
to Jaeger, Tempo, Prometheus or a vendor, so switching backends is an exporter
change, not re-instrumentation. Auto-instrumentation for Node and ASP.NET Core
creates HTTP server, HTTP client and database spans with no code changes. Its
**semantic conventions** fix attribute names such as \`http.request.method\`,
\`http.response.status_code\` and \`db.system.name\`, so dashboards work across
languages.

Trace sampling: **head sampling** decides when a request starts, before the
outcome is known; **tail sampling** in the Collector decides after the trace
completes, so it can keep every error and slow trace.

## Correlation

Put the trace id on every log line (OpenTelemetry log bridges do it for you).
**Exemplars** attach a sample trace id to a metric bucket, so you can click from a
latency spike to one slow trace, then from that trace to its exact log lines.

For "intermittent 500s nobody can reproduce": query errors for the route, open a
failing trace next to a good one, group failures by error signature and by
dimension (instance, version, tenant, dependency), and check deploy and flag
markers. The outlier dimension usually names the cause. If you need new logging
to answer the question, that gap is a finding.

## SLIs, SLOs, SLAs and error budgets

- **SLI**: a measurement, good events over all events. "Requests answered without
  a 5xx in under 300 ms", measured close to the user (the load balancer).
- **SLO**: the internal target for it over a window. "99.9% over 30 days."
- **SLA**: a contractual promise with credits, deliberately looser than the SLO.

The **error budget** is what the SLO allows you to fail:

| SLO (30 days) | Budget |
| --- | --- |
| 99% | about 7.2 hours |
| 99.9% | about 43 minutes |
| 99.99% | about 4.3 minutes |

30 days is 43,200 minutes, and 0.1% of it is 43.2 minutes. Partial degradation
spends it too: a steady 1% error rate against a 99.9% SLO burns the budget ten
times too fast and empties it in three days. When the budget is gone, an agreed
policy kicks in: freeze risky launches, spend the time on reliability.

## Alerting

Page on **symptoms users feel** (errors, latency, SLO burn), not on causes. CPU at
80% is something to investigate on a dashboard; it pages people for healthy
autoscaling and stays silent when a bad deploy returns fast 500s.

**Burn rate** is the observed error rate divided by the rate the SLO allows; at
1 the budget runs out exactly at the window's end. The Google SRE Workbook's
multiwindow pattern pages at 14.4x over one hour (2% of a 30-day budget gone),
confirmed by a 5-minute window so it resets quickly, and opens a ticket for slow
burns measured over days. Compared with "error rate above 1% for 5 minutes", it
ignores blips that barely dent the budget and still catches a slow leak.

Every page links to a runbook and has an owner. An alert nobody acts on gets
deleted.

## Dashboards

One per service, top to bottom: RED, then saturation of its key resources
(pool, queue, CPU), with **deploy and flag markers** on every graph so "what
changed?" is visible at a glance. Keep them in version control and vendor-neutral
where you can.
`,
  },
  {
    id: 'craft-appsec',
    trackId: 'craft',
    title: 'Application security in depth',
    blurb:
      'The OWASP Top 10 beyond XSS and CSRF — SSRF, injection variants, supply chain, crypto, privacy and logging failures — plus threat-modelling a feature.',
    estMinutes: 30,
    objectives: [
      'Walk through the OWASP Top 10 with a CRUD-app example for each',
      'Threat-model a new feature with STRIDE in fifteen minutes',
      'Explain how secrets, keys and dependencies should be managed and rotated',
      'Design authorisation that holds up: object-level, function-level and multi-tenant',
    ],
    primer: `
## The OWASP Top 10

The OWASP Top 10 is a ranked list of risk categories, not a checklist of
techniques. The 2021 edition, with a CRUD example for each:

| 2021 | Category | CRUD example |
| --- | --- | --- |
| A01 | Broken Access Control | \`GET /invoices/1043\` returns someone else's invoice |
| A02 | Cryptographic Failures | Passwords hashed with plain SHA-256 |
| A03 | Injection | SQL, NoSQL operator or command injection |
| A04 | Insecure Design | Password reset with no rate limit |
| A05 | Security Misconfiguration | Debug endpoint or default admin password in prod |
| A06 | Vulnerable and Outdated Components | An unpatched package with a known CVE |
| A07 | Identification and Authentication Failures | No lockout, weak session handling |
| A08 | Software and Data Integrity Failures | CI runs an unpinned third-party action |
| A09 | Security Logging and Monitoring Failures | Nobody notices 50,000 failed logins |
| A10 | Server-Side Request Forgery | "Import from URL" reaches internal hosts |

The 2025 edition keeps Broken Access Control first, folds SSRF into it, moves
Security Misconfiguration up, broadens outdated components into **Software Supply
Chain Failures** and adds **Mishandling of Exceptional Conditions**. Categories
present in both editions are the safe ones to quote by name.

APIs have their own list, the **OWASP API Security Top 10 (2023)**. First is
**Broken Object Level Authorization (BOLA)**, also known as IDOR: you checked who
the caller is, not whether this object is theirs. Fifth is **Broken Function
Level Authorization (BFLA)**: a customer calling \`DELETE /api/admin/users/7\`.

## Access control that holds up

- **Deny by default.** Every endpoint requires a policy; public ones opt out explicitly.
- **Scope queries to the caller**: \`WHERE id = $1 AND tenant_id = $2\`. Answer
  404, not 403, so you do not confirm the object exists. UUIDs make guessing
  harder but are not a control.
- **Tenant id from the verified token or session**, never from a header, body or
  subdomain the client controls. A valid tenant id is simply someone else's.
- **Enforce in one place**: a global query filter (EF Core), a Prisma extension,
  or Postgres row-level security as defence in depth. RLS does not apply to the
  table owner unless you \`FORCE\` it.
- **Test it**: a user of tenant A requests tenant B's resources and gets 404.
  Remember background jobs and admin tools, which run outside a request.

## SSRF

Any feature where the server fetches a user-supplied URL (avatar from URL,
webhooks, PDF rendering, "import") can be pointed inward. The classic target is
the cloud metadata endpoint \`http://169.254.169.254/\`, which hands out the
instance role's temporary credentials; that is how the 2019 Capital One breach
worked. AWS IMDSv2 (a session token fetched with a PUT, with a hop limit) blunts
it, but it is defence in depth.

What works, layered:

- Allowlist schemes and, where possible, exact hosts.
- Resolve the name, refuse private, loopback and link-local ranges
  (\`10.0.0.0/8\`, \`127.0.0.0/8\`, \`169.254.0.0/16\`, \`::1\` and friends),
  then **connect to the IP you checked**. Resolving twice allows DNS rebinding.
- Disable redirects, or re-validate every hop.
- Egress rules on the network so the fetcher cannot reach internal ranges at all.

What fails: checking the string starts with \`https://\`, and regex blocklists,
which lose to \`2130706433\` (decimal 127.0.0.1), IPv6, \`0.0.0.0\` and names that
resolve internally.

## Injection beyond SQL

**NoSQL operator injection.** JSON bodies become objects, and objects become query
operators:

\`\`\`js
// body: {"email":"admin@x.io","password":{"$ne":null}}
User.findOne({ email: req.body.email, password: req.body.password }); // matches admin
\`\`\`

Validate types with a schema at the boundary, enable Mongoose \`sanitizeFilter\`
or use \`$eq\`, and never query by password: verify a hash.

**Prototype pollution.** A naive deep merge of \`{"__proto__": {"isAdmin": true}}\`
walks into \`Object.prototype\`, so every object now has \`isAdmin\`. Reject
unknown keys with a schema, skip \`__proto__\`, \`constructor\` and
\`prototype\` in merges, and use \`Object.create(null)\` or a \`Map\` for
user-keyed dictionaries.

**ReDoS.** JavaScript's regex engine backtracks; nested quantifiers such as
\`/^(a+)+$/\` take exponential time on a near-match, and because Node runs your
code on one thread, one request stalls every request. Use linear patterns, cap
input length first, or the \`re2\` package for guaranteed linear time.

**Command and template injection.** Never build shell strings from input
(\`exec('convert ' + name)\`); use \`execFile\` with an argument array. Never
compile user input as a template.

## Crypto and data

| Technique | Reversible? | Use it for |
| --- | --- | --- |
| Hashing (Argon2id, bcrypt, scrypt) | No | Passwords: verify, never read back |
| Encryption (AES-GCM, keys in a KMS) | With the key | Data you must read back, such as third-party tokens |
| Encoding (Base64, hex) | By anyone | Transport formats; zero protection |

A fast hash such as SHA-256 is wrong for passwords because attackers can try
billions of guesses per second. A JWT payload is Base64url: anyone can read it.
Tamper detection needs a MAC, a signature or an authenticated cipher like AES-GCM.

**Encryption at rest** (encrypted disks, transparent database encryption) protects
stolen disks, snapshots and backups. It does nothing against SQL injection, because
the database decrypts for every authenticated session, including the app's. To
survive an app compromise you need **field-level encryption** with keys in a KMS
the database cannot reach. Rotate keys on a schedule and on suspicion, and use TLS
for every hop, internal ones included.

## Privacy by design

GDPR (and UK GDPR, CCPA) give users rights over their data. Design for them:

- **Collect only what you need** and keep an **inventory** of where personal data
  lives: database, logs, analytics, backups, third-party processors.
- **Keep PII out of logs and analytics**: log the user id, not the email.
- **Erasure**: soft delete (\`deleted_at\`) keeps the data, so it is not erasure.
  Hard-delete or anonymise in each store, tell processors, and handle backups with
  short retention plus never restoring deleted users, or **crypto-shredding**:
  encrypt each user's data with their own key and delete the key.
- **Keep what the law requires** (invoices for tax) and nothing else.
- **Export** (access and portability) is a separate right with its own path, not a
  precondition for deletion.

## Supply chain and CI

- Commit the **lockfile**, install with \`npm ci\`, and run **SCA** (Dependabot,
  \`npm audit\`, OSV scanners).
- Generate an **SBOM** (software bill of materials, CycloneDX or SPDX) in CI, so
  "are we affected by this CVE?" is a query.
- **Pin third-party actions to a full commit SHA.** Tags move: the March 2025
  \`tj-actions/changed-files\` compromise repointed tags and leaked secrets from
  thousands of pipelines.
- Set \`permissions\` per job to the minimum (\`contents: read\`).
- Use **OIDC federation** to the cloud (\`id-token: write\`, a role trusted only
  for this repo and branch) instead of long-lived keys in secrets.
- Turn on **secret scanning** and push protection; a leaked secret is rotated,
  not just deleted.

## Misconfiguration and logging failures

Debug endpoints, default credentials, stack traces in responses and open admin
panels are misconfiguration. On logging: record logins (success and failure),
permission denials, admin actions and password or MFA changes, with who, when,
where and outcome, and never the secret itself. A success after 500 failures is
credential stuffing that worked. Ship these events somewhere app admins cannot
edit, and alert on patterns.

## Threat modelling a feature

Fifteen minutes, in this order:

1. Draw the data flow: actors, processes, stores, flows.
2. Mark the trust boundaries (browser to API, API to third party, service to database).
3. Enumerate threats per element with **STRIDE**: Spoofing, Tampering,
   Repudiation, Information disclosure, Denial of service, Elevation of privilege.
4. Rank them by likelihood and impact.
5. Assign mitigations and owners, and file tickets.

## Reviewing a PR for security

Trace each new input and endpoint to its sinks: authorisation per object and
function, validation and output encoding, secrets and config, what gets logged,
new dependencies, error handling. Scanners (SAST, SCA) catch known patterns; they
cannot know that invoices belong to tenants, so a missing ownership check looks
like valid code. A short checklist in the PR template makes the pass routine.
`,
  },
  {
    id: 'craft-incidents',
    trackId: 'craft',
    title: 'Incidents, on-call and reliability',
    blurb:
      'Mitigate first, communicate constantly, find causes later: running an incident, being on call, and postmortems that change things.',
    estMinutes: 30,
    objectives: [
      'Run the first 15 minutes of an incident: assess, assign roles, mitigate',
      'Choose between rollback, turning a flag off and fixing forward, with a reason',
      'Write a blameless postmortem with contributing factors and owned actions',
      'Design on-call so it is sustainable: runbooks, alert hygiene and handovers',
    ],
    primer: `
## What counts as an incident

An incident is unplanned user impact, or imminent risk of it, that needs a
coordinated response. Severity is set by **impact**, because impact is visible in
minutes and the cause may take hours:

| Level | Meaning | Response |
| --- | --- | --- |
| SEV1 | Core flow down for many users, or data loss | Page now, incident commander, updates every 30 min |
| SEV2 | Degraded, or a subset of users affected | Page the owning team, updates every hour or two |
| SEV3 | Minor, with a workaround | Next business day |

Agree the levels with examples in calm conditions. When unsure, declare higher and
downgrade later. Severity decides who is paged, whether anyone is woken up, and
the communication cadence.

## Roles

- **Incident commander (IC)**: coordinates, sets priorities, assigns work, makes
  decisions, keeps time. The IC does **not** debug; when they do, nobody watches
  the clock and parallel efforts collide.
- **Operations lead**: does the hands-on work, with helpers.
- **Communications lead**: status page and stakeholders.
- **Scribe**: keeps the timeline in the incident channel.

One channel, one IC. On a small team one person may hold two roles, but they say
so, and a handover of command is announced explicitly.

## Mitigate before root cause

Every minute of diagnosis while users fail is paid for by users. Stop the
bleeding first, then understand it calmly. The ladder, fastest and least risky
first:

1. **Turn the feature flag off**: seconds, no pipeline, touches only flagged code.
2. **Roll back** to the previous build: minutes, a known-good artefact.
3. **Hot-fix forward**: new code under pressure, still through CI.
4. **Ship the full root-cause fix**: days, calmly, often with systemic changes.

Other mitigations: scale out, shed load, fail over, block an abusive client.
Preserve evidence while you mitigate: capture logs, or pull one bad instance out
of rotation instead of destroying it.

**Rollback is only safe if the old code works with the current schema.** A
rollback reverts code, not data. If the release added a column and made it \`NOT NULL\`
with no default, the old code's inserts now fail. That is why migrations ship
**expand and contract**: add the column as nullable, deploy code that writes it,
backfill, then add the constraint, so each step can be rolled back. Mid-incident,
dropping the constraint (a quick metadata change in Postgres) makes the rollback
safe again. You fix forward instead when rollback would itself break something,
such as an irreversible migration or an older bug coming back.

## Communication

A status-page update states:

- the **user-visible impact**, in users' words;
- **what you are doing**;
- **when the next update comes**, and you post it even if nothing changed.

\`\`\`bash
Some customers cannot complete checkout. We have found a likely cause and are
rolling back. Next update by 14:45 UTC.
\`\`\`

No speculation about causes (early guesses are often wrong and can carry legal
weight), no internal jargon, no ETA you cannot keep.

## Diagnosis under pressure: what changed?

Most incidents follow a change. Check, in roughly this order:

- deploys of this service and of the services it calls;
- config and feature-flag changes;
- traffic volume or shape (a campaign, a bot, one huge tenant);
- dependencies: third-party status pages, certificate expiry, quotas.

Correlate by time **and** by blast radius: an error spike three minutes after a
deploy, in the service that was deployed, beats a flag change an hour earlier in
a feature whose metrics are flat. Deploy markers on dashboards make this instant.
Then go dashboards → traces → logs. Hunting for who is at fault is not on the
list; it wastes the incident and poisons the postmortem.

## After the incident: the postmortem

**Blameless** means asking why a reasonable person could make the mistake, not
who made it. Blame teaches people to hide facts; "human error" is where the
investigation starts, not where it ends. For "ran a script against production
instead of staging" the findings are systemic: shared credentials, no visible
environment prompt, no dry-run default.

A complete postmortem has:

- a timeline and the impact in numbers;
- the **contributing factors**, usually several;
- what went well;
- **action items with owners and due dates**, tracked to done.

A postmortem can be complete with no single root cause; forcing one hides the
detection and safeguard gaps. The **five whys** has the same weakness: it follows
one linear chain and tends to stop at "human error". Ask separate questions
instead: why did it happen, why did we not detect it sooner, why did mitigation
take so long, why was the blast radius so large.

## On-call health

- Every page is **urgent, actionable and tied to user impact**; everything else is
  a ticket or a dashboard.
- Every page links to a **runbook** (what it means, how to confirm, safe first
  actions, whom to escalate to) and has an owner. Update runbooks after use.
- **Review alerts regularly.** Thirty pages a week that get acknowledged and
  ignored train people to ignore the real one: delete or downgrade what nobody
  acts on, retune the rest, and prefer SLO burn-rate alerts over cause alerts.
  Track pages per shift as a health metric; adding people or raising every
  threshold does not fix noise.
- Handovers in writing, a sane rotation, and time off or pay after a bad night.

## Reliability practices

- An **error-budget policy** agreed in advance: when the budget is spent, risky
  launches pause and reliability work takes priority.
- **Game days**: break something deliberately in a safe environment and practise.
- **Restore drills**: a backup you have never restored is a hope, not a backup.
- Know how each dependency fails (timeouts, retries, fallbacks) before it does.

## In interviews

"Tell me about an outage you caused" is a standard question. Give the impact in
numbers, how it was detected, what you did first, the contributing factors and
the systemic fix you drove, told plainly. "Never" signals little experience or
low candour; blame-shifting and self-flagellation both skip the useful part.

## Worked example

\`\`\`bash
13:10  flag reports-v2 enabled for 10% of users
14:02  deploy checkout-svc v141 -> v142
14:05  checkout 5xx rate 0.2% -> 8%   (alert fires)
\`\`\`

14:06: on-call acknowledges, sees checkout failing for many users, declares a
SEV1 and takes IC until someone else joins. 14:08: first status update. Errors
began three minutes after the checkout deploy, in checkout; the reports flag is
earlier and its metrics are flat. The release had no migration, so rollback is
safe: 14:09 roll back to v141, 14:13 the 5xx rate is back to 0.2%. Next update
posted, incident resolved. The postmortem then asks why canary analysis did not
catch it and why the deploy went out without a flag.
`,
  },
];
