> **Frozen audit, pre-refactor. Do not edit.** Read at commit `6f1bf43`; planning only, no project file was changed when it was written.
> Produced on 2026-09-23 by an Opus agent (the `content-expansion` audit), then adversarially reviewed by a Fable agent (see `2026-09-23-content-expansion.review.md`).
> Line numbers, counts and reproductions are as of `6f1bf43`; the working tree has moved on. Where the review corrects this audit, the review wins.
> Register rows in `../10-findings-register.md` point here by section and finding id; journal entries cite it as "Closes <id>".
> Copied verbatim below this header so the evidence outlives the planning scratchpad.

# Stack Ready — content expansion plan

Planning only. Nothing in the repo was changed while writing this.

## 0. The numbers

| | Today | After expansion |
| --- | --- | --- |
| Tracks | 9 | 9 (no new track) |
| Stages | 7 | **10** (C#/.NET split into two stages, plus two new stages past mid-level) |
| Modules | 31 | **51** (+20) |
| Questions | 434 | **1,012** (+578: 292 added to existing modules, 286 in new ones) |
| d3 share | 22% (94) | about 35% (roughly 350) |
| `ask` share | 11% (49; the README says "about a fifth", which is wrong today) | about 22% (roughly 220) |
| Type mix | mcq 76%, output 13%, multi 4%, boolean 4%, short 1%, order 1% | mcq about 50%, output 16%, multi 11%, boolean 8%, short 7%, order 8% (see §4.3) |

Per track after expansion: js 144, ts 80, react 144, node 102, web 100, data 80, csharp 84, dotnet 100, craft 178.

What I found in the current content:

- Every module has **exactly 14 questions**, numbered `-1` to `-14`. So the next free number for every existing module is **15**.
- Nine modules use an **id prefix that is not the module id**. Authors must use the prefix, not the module id:
  `js-objects-arrays → js-objects-`, `web-api-design → web-api-`, `data-modeling → data-model-`, `cs-linq-async → cs-linq-`, `net-di-config → net-di-`, `net-efcore → net-ef-`, `craft-testing → craft-test-`, `craft-security → craft-sec-`, `craft-shipping → craft-ship-`.
- Nothing stores stage ids. The `attempts` and `card_states` tables key on `question_id`, `module_id` and `track_id`. So stages can be renumbered, but **an existing question's id, moduleId or trackId must never change**, or learner history is orphaned.
- The stage gate (`server/src/progress.js`) only checks the stage **immediately before** in list order. Today that means a JS-only learner has to master 35% of C# before "Ship it" unlocks. §5 proposes a small fix.
- The code highlighter (`client/src/components/Code.tsx`) knows `js, ts, tsx, jsx, json, csharp, sql, bash`. Any other `lang` falls back to JS keywords. `defaultLang('craft')` is `js`, so craft and senior questions must set `lang` explicitly.
- The UI labels difficulty as `foundation / junior / mid-level` (DrillPage and ModulePage). §4 keeps d:1–3 and explains why.
- `jstrain/` has files with **no matching quiz module**: `js/06 this-classes-prototypes`, `js/08 iterators-generators`, `js/09 errors-collections-dates`, `ts/04 utility-and-mapped-types`, `ts/05 conditional-and-template-types`. Three new modules (`js-classes`, `js-stdlib`, `ts-advanced`) fill those gaps. The Labs page `related` links should be re-pointed to them (§8).

---

## 1. Gap analysis

Legend: **missing** = no question at all. **thin** = one passing mention.

### JavaScript (js-values, js-functions, js-objects-arrays, js-async, js-modules)
- **Missing:** classes and the prototype chain as a topic. There are four `this` questions but nothing on `class`, `#private`, getters/setters, `static`, `super`, `extends Error`, or `instanceof` pitfalls. jstrain js/06 drills all of it. → new module **js-classes**.
- **Missing:** iterators and generators, `for await`, async generators for paginated APIs (jstrain js/08). → **js-stdlib**.
- **Missing:** error handling as a topic: custom errors, `cause`, `AggregateError`, "never throw strings" (jstrain js/09). → **js-stdlib**.
- **Missing:** dates and time zones (UTC storage, `new Date('2024-03-10')` parsing as UTC, month overflow), `Intl.NumberFormat` / `DateTimeFormat`, `localeCompare`. Every CRUD app ships a date bug. → **js-stdlib**.
- **Thin:** Map, Set and WeakMap. One question covers Map vs object. Nothing on WeakMap, the ES2025 Set methods, or `structuredClone` (only the JSON round trip). → **js-stdlib** and js-objects-arrays.
- **Missing:** ES2023+ non-mutating array methods (`toSorted`, `toReversed`, `with`) and `Object.groupBy`.
- **Missing:** `Number.MAX_SAFE_INTEGER`, BigInt, and why 64-bit ids travel as strings. `Object.is` and `-0`. Logical assignment (`||=`, `??=`, `&&=`).
- **Thin (async):** AbortController has one question, and there is nothing on `AbortSignal.timeout` / `any`. Nothing on `fetch` resolving on a 404 (`res.ok`), `await` inside `map`, the `async` function sync prelude, `queueMicrotask`, retry with backoff and jitter, promisifying callbacks, or Node's unhandled-rejection crash timing.
- **Missing (modules):** the `exports` field, `peerDependencies`, `.mjs`/`.cjs`, ESM live bindings vs CJS copies, top-level await, source maps, the ESLint / Prettier / tsc roles, and what `npm ci` actually does.

### TypeScript (ts-basics, ts-shapes, ts-practice)
- **Missing:** type-level TypeScript: mapped types and key remapping, conditional types, `infer`, distribution, template literal types, overloads, `const` type parameters, `NoInfer`, variance, module augmentation and `.d.ts`. There is one `Exclude` question. jstrain ts/04–05 drill this. → new module **ts-advanced**.
- **Thin:** `keyof typeof`, indexed access, `Awaited`, `Parameters`, `NonNullable`, `object` vs `{}`, `void` in callback types, `import type` / `verbatimModuleSyntax`.
- **Missing:** `z.infer` (one schema as the single source of truth), typing Express `req.user` through declaration merging, React event types, generic components, and a strategy for migrating JS to TS.

### React (react-render, react-state, react-effects, react-perf, react-app)
- **Missing (React 19):** Suspense beyond `lazy`, `use()`, `useDeferredValue`, Actions (`<form action>`), `useActionState`, `useFormStatus`, `useOptimistic`, Server Components and `'use client'` / `'use server'`, hydration mismatches, streaming SSR. Today there is one `useTransition` question and one RSC question. → new module **react-server**.
- **Missing:** server-state libraries in depth: query keys, `staleTime` vs `gcTime`, invalidation, mutations, optimistic rollback, infinite queries. Also form libraries with schema validation, and mapping server validation errors to fields. There is one "what does React Query give you" question. → new module **react-data**.
- **Missing:** `ref` as a prop (the end of `forwardRef`), `useId`, portals, `useSyncExternalStore`, `useEffectEvent` (stable in 19.2, verify), stale closures in intervals, components defined inside components, and the children-as-props re-render trick.
- **Thin:** accessibility. There are two questions, both about Testing Library queries. → new module **web-a11y** (web track).
- **Missing:** testing React with MSW, token refresh in a SPA, and Vite env exposure (`VITE_*` appears once, in craft).

### Node & Express (node-runtime, node-express, node-auth)
- **Thin:** streams and backpressure. There is one "use a stream for a 2GB upload" question. Nothing on `write()` returning false, `'drain'`, `pipeline()` error propagation, or `for await` over streams.
- **Missing:** `process.nextTick` vs microtasks vs `setImmediate` ordering, `worker_threads` vs `child_process` vs `cluster`, the EventEmitter `'error'` event, AsyncLocalStorage for request context, heap snapshots and memory leaks, `--env-file`, `node:test`, the graceful-shutdown sequence (one question covers the SIGTERM "what", not the order).
- **Missing:** talking to a database from Node. The track has **zero questions on pools, `$1` parameters, transactions on one client, releasing connections, pg returning bigint as a string, or Prisma / Drizzle / Knex trade-offs**. That is the core of a Node CRUD job. → new module **node-data**.
- **Missing:** Express 5 (async errors forwarded automatically; `node-express-4` only covers Express 4), route-order shadowing (`/users/:id` before `/users/me`), body size limits, uploads with multer, structured logging with pino.
- **Missing (auth):** the password-reset flow, JWT verification pitfalls (`alg`, `aud`, `iss`), refresh-token rotation and reuse detection, OAuth code + PKCE flow steps, TOTP, passkeys, timing-safe comparison, session stores for multiple instances.
- **Missing:** background jobs and queues, retries, idempotent consumers, the outbox pattern, circuit breakers. One question says "use a job" for a 30-second report. → new module **node-jobs** (stage 9).

### HTTP & the Web (web-browser, web-http, web-api-design)
- **Thin:** HTTP caching validators. There are two questions (`no-cache`, `ETag`). Nothing on `If-None-Match` → 304, `max-age` vs `s-maxage`, `private`/`public`, `immutable` hashed assets, `Vary`, `stale-while-revalidate`, or `If-Match` → 412 for optimistic concurrency.
- **Missing:** content negotiation (406 vs 415), 301/308 vs 302/307 for POST, HSTS, what HTTPS does and does not hide, SSE vs WebSocket vs polling.
- **Missing (API design):** RFC 9457 Problem Details, 202 + status resource for long operations, webhooks (sending: HMAC signing, retries, event ids; receiving: verify the signature on the raw body), bulk endpoints, deprecation (`Deprecation`/`Sunset`, 410), rate-limit algorithms, and the fact that adding a required request field breaks clients.
- **Missing (browser):** Core Web Vitals (LCP, INP, CLS), service workers, IndexedDB, Web Workers, `URLSearchParams` encoding, `fetch` credentials defaults, the style → layout → paint → composite pipeline.
- **Missing:** accessibility: semantic HTML, labels, keyboard, focus management in SPAs, ARIA, contrast, testing. → **web-a11y**.
- **Missing:** cross-stack performance and caching: percentiles, cache-aside, stampedes, CDN, load testing, capacity. → **web-perf** (stage 9).

### SQL & Data (data-sql, data-modeling)
- **Thin:** window functions. There is one question ("latest order per customer"). Nothing on ROW_NUMBER vs RANK vs DENSE_RANK, LAG/LEAD, running totals, top-N per group, or "you can't filter a window function in WHERE". → new module **data-queries**.
- **Missing:** recursive CTEs, upserts (`ON CONFLICT` / `MERGE`), keyset pagination in SQL, reading an `EXPLAIN` plan node by node, covering / partial / expression indexes, why an index is not used, materialized views. → **data-queries**.
- **Missing:** `COALESCE` and NULL arithmetic, `CASE` / conditional aggregation, join fan-out double counting, self-joins, `!=` dropping NULL rows, timestamp range bugs with `BETWEEN`, `RETURNING`, safe `UPDATE`/`DELETE`.
- **Missing:** isolation levels and anomalies, `SELECT … FOR UPDATE` / `SKIP LOCKED`, deadlocks, atomic conditional updates, replicas and replication lag, pooling limits, partitioning, `CREATE INDEX CONCURRENTLY`, backfills, backups/PITR. There is one optimistic-concurrency question. → new module **data-scale** (stage 9).
- **Missing (modelling):** normal forms by name, soft delete, audit columns, money types, multi-tenant schemas, "Postgres does not index foreign keys for you", CHECK constraints, JSONB, enum vs lookup table.

### C# (cs-basics, cs-oop, cs-linq-async)
- **Thin:** records (one question), pattern matching and switch expressions (one question). Nothing on `with`, property / relational / list patterns, `required`, primary constructors (and their mutable-capture gotcha), collection expressions, nullable flow analysis, `yield return`, `IAsyncEnumerable`. → new module **cs-modern**.
- **Missing:** delegates, `Func`/`Action`, events and event-handler leaks, exception filters (`when`), `finally` semantics, the Result pattern vs exceptions, when an interface is justified.
- **Missing:** `DateTime` vs `DateTimeOffset` vs `DateOnly`, struct copy semantics shown in code, integer division, `TryGetValue`.
- **Missing (LINQ/async):** multiple enumeration, `Any()` vs `Count()`, `SelectMany`, `ToDictionary`, `Task.WhenAll` exception behaviour, `SemaphoreSlim` / `Parallel.ForEachAsync` throttling, `ValueTask` rules, `lock` + `await`, the `Task.Run` in ASP.NET myth.

### ASP.NET Core & EF Core (net-aspnet, net-di-config, net-efcore)
- **Missing:** authentication and authorisation in ASP.NET Core: schemes, `UseAuthentication` vs `UseAuthorization`, JWT bearer validation, policies, resource-based authorisation, fallback policy, Identity, Data Protection keys across instances, BFF. Today it gets one ordering question. → new module **net-auth**.
- **Missing:** testing .NET: xUnit facts/theories/fixtures, WebApplicationFactory, the EF InMemory trap, Testcontainers, `TimeProvider`. → new module **net-testing**.
- **Missing (.NET 8+ surface):** `MapGroup`, `TypedResults`, `IExceptionHandler` + `AddProblemDetails`, endpoint filters, rate-limiting middleware, output caching, keyed services, `ValidateOnStart`, `IHttpClientFactory` + resilience handlers.
- **Thin (EF Core):** migrations workflow (commands, idempotent scripts, bundles), concurrency tokens → 409, `ExecuteUpdate`/`ExecuteDelete`, `AsSplitQuery` and cartesian explosion, global query filters, disconnected `Update()` overwriting columns, `Find` vs `FirstOrDefault`, `FromSql` vs `FromSqlRaw`, owned/complex types, interceptors for audit columns.

### Craft (craft-git, craft-testing, craft-security, craft-shipping)
- **Git:** missing `reset --soft/--mixed/--hard`, interactive rebase/autosquash, cherry-pick, `main..feature` ranges, `git rm --cached`, `revert -m`, blame, and the rebase-conflict loop.
- **Testing:** missing MSW, fake timers, Playwright auto-waiting, un-awaited async assertions, test data builders, load testing, characterisation tests.
- **Security:** only XSS, CSRF, SQLi and IDOR are covered. Missing mass assignment, open redirect, path traversal, SSRF, NoSQL injection, prototype pollution, ReDoS, security headers, supply chain, "CORS is not access control", responding to a leaked secret, threat modelling, the OWASP Top 10 as a list. → expand craft-security; depth in new **craft-appsec** (stage 9).
- **Shipping:** missing multi-stage builds, layer caching, `.dockerignore`, liveness vs readiness, build-once-promote, canary, never deploying `:latest`.
- **Observability:** 2 of 434 questions. Missing structured logging fields, RED/USE, histograms vs gauges, cardinality, traces and `traceparent`, SLI/SLO/SLA, error budgets, burn-rate alerts, OpenTelemetry. → new module **craft-observability** (stage 9).
- **Senior practice:** entirely missing. No system design, architecture decisions, ADRs, incidents beyond one ordering question and one postmortem question, on-call, code review, mentoring, estimation, or stakeholder pushback. → new stage 10: **craft-design, craft-architecture, craft-incidents, craft-review**.

### Existing primer sections that deserve their own module

| Existing section | Becomes |
| --- | --- |
| `js-functions` "The four `this` rules" + jstrain js/06 | **js-classes** |
| jstrain js/08, js/09 (no primer today) | **js-stdlib** |
| `ts-shapes` "Generics", "Utility types" + jstrain ts/04–05 | **ts-advanced** |
| `react-app` "Error boundaries and Suspense", "Rendering strategies" (RSC) | **react-server** |
| `react-effects` "The modern answer" (data libraries) | **react-data** |
| `react-app` "Accessibility, briefly" | **web-a11y** |
| `web-http` "Caching" | deepened in web-http, then **web-perf** |
| `data-modeling` "Transactions", "The N+1 problem" | **data-scale** / **node-data** |
| `data-sql` "The rest of the toolkit" (windows, CTEs) | **data-queries** |
| `craft-shipping` "Observability", "Debugging production" | **craft-observability**, **craft-incidents** |
| `node-auth` "Authorisation in the code" → the .NET equivalent | **net-auth** |

Existing questions stay where they are. The old primer section stays too, and gets a one-line "covered in depth in *X*" pointer.

---

## 2. New modules

Twenty new modules. The id prefix is what goes in question ids.

| # | Module id | Prefix | Track | Stage | Title | Blurb | Est. min | Qs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `js-classes` | `js-classes-` | js | 1 | Prototypes, classes and objects in practice | The prototype chain under `class`, private fields, getters, inheritance, and when composition beats all of it. | 25 | 14 |
| 2 | `js-stdlib` | `js-stdlib-` | js | 1 | Iteration, errors, collections and dates | Iterators and generators, errors that keep their cause, Map/Set/WeakMap, and the date bugs every CRUD app ships. | 30 | 14 |
| 3 | `ts-advanced` | `ts-adv-` | ts | 2 | Type-level TypeScript | Mapped, conditional and template literal types, `infer`, overloads and declaration files — reading the types libraries hand you. | 30 | 14 |
| 4 | `web-a11y` | `web-a11y-` | web | 2 | Accessibility and semantic HTML | Semantic elements, labels, keyboard and focus, ARIA used sparingly, and how to check your own pages. | 25 | 14 |
| 5 | `react-data` | `react-data-` | react | 3 | Server state, mutations and forms | Treat server data as a cache: query keys, staleness, invalidation, optimistic updates, and forms validated with a shared schema. | 30 | 14 |
| 6 | `react-server` | `react-server-` | react | 3 | Modern React: Suspense, actions and Server Components | React 19's async model: Suspense and `use`, transitions, actions and optimistic UI, and where Server Components change the architecture. | 35 | 16 |
| 7 | `data-queries` | `data-query-` | data | 5 | Advanced SQL: windows, CTEs and query plans | Window functions, recursive CTEs, upserts, keyset pagination, and reading EXPLAIN well enough to pick the right index. | 35 | 16 |
| 8 | `node-data` | `node-data-` | node | 5 | Talking to the database from Node | Drivers, pools, parameterised queries, transactions in code, and raw SQL vs query builders vs ORMs. | 30 | 14 |
| 9 | `cs-modern` | `cs-modern-` | csharp | 6 | Modern C#: records, patterns and the new syntax | Records and `with`, pattern matching, `required` and `init`, primary constructors, collection expressions and nullable flow analysis. | 30 | 14 |
| 10 | `net-auth` | `net-auth-` | dotnet | 7 | Authentication and authorisation in ASP.NET Core | Schemes, JWT bearer and cookies, claims and policies, resource-based checks, and the Identity pieces you should not rebuild. | 30 | 14 |
| 11 | `net-testing` | `net-test-` | dotnet | 7 | Testing ASP.NET Core and EF Core | xUnit, doubles at the boundaries, WebApplicationFactory integration tests and a real database in a container — plus the InMemory trap. | 30 | 14 |
| 12 | `web-perf` | `web-perf-` | web | 9 | Performance and caching across the stack | Measure first, then fix: percentiles, Core Web Vitals, bundles, CDNs, HTTP and application caches, and load tests. | 35 | 14 |
| 13 | `craft-observability` | `craft-obs-` | craft | 9 | Observability: logs, metrics and traces | Structured logs with context, RED metrics, traces with OpenTelemetry, SLOs, and alerts that only wake someone when it matters. | 30 | 14 |
| 14 | `data-scale` | `data-scale-` | data | 9 | Concurrency, pooling and scaling the database | Isolation levels and locks, deadlocks, connection limits, read replicas, partitioning, and migrations on huge tables. | 35 | 14 |
| 15 | `node-jobs` | `node-jobs-` | node | 9 | Background jobs, queues and resilience | Work off the request path, retries that are safe, idempotent consumers, the outbox, and timeouts and breakers around flaky dependencies. | 30 | 14 |
| 16 | `craft-appsec` | `craft-appsec-` | craft | 9 | Application security in depth | The OWASP Top 10 beyond XSS and CSRF — SSRF, injection variants, supply chain, crypto and logging failures — plus threat-modelling a feature. | 30 | 14 |
| 17 | `craft-design` | `craft-design-` | craft | 10 | System design for CRUD apps | Grounded system design: requirements and numbers first, then a boring architecture that scales, with the trade-offs said out loud. | 40 | 16 |
| 18 | `craft-architecture` | `craft-arch-` | craft | 10 | Architecture decisions and trade-offs | Monolith vs services, module boundaries, layering, events, build vs buy, tech debt, and writing the decision down. | 30 | 14 |
| 19 | `craft-incidents` | `craft-inc-` | craft | 10 | Incidents, on-call and reliability | Mitigate first, communicate constantly, find causes later: running an incident, being on call, and postmortems that change things. | 30 | 14 |
| 20 | `craft-review` | `craft-review-` | craft | 10 | Code review, mentoring and technical leadership | Reviewing for what matters, feedback people act on, growing juniors, estimating honestly, and the design doc before the code. | 25 | 14 |

Each module's four objectives and its 6–10-section primer outline are in the track brief (§6). Every author needs them there, and duplicating them here would let the two copies drift.

**Considered and rejected:**
- A standalone `web-realtime` module. Its content is folded into web-http (SSE vs WebSocket), web-api-design (webhooks) and craft-design (notifications fan-out).
- A separate `craft-perf`. Merged into `web-perf`.
- A 10th "senior" track. It would need a `TrackId` change, a colour and a `defaultLang` entry. Stages already give the senior grouping, so it buys little.
- A separate `data-tx`. Merged into `data-scale`.

### New and changed stages

| Stage id | Title | Blurb | unlockAt | Modules |
| --- | --- | --- | --- | --- |
| `stage-6` (retitled) | Stage 6 · C#, the language | The other language on your CV: value semantics, types and exceptions, modern syntax, LINQ and async. | 0.35 | cs-basics, cs-oop, cs-modern, cs-linq-async |
| `stage-7` (**meaning changes**) | Stage 7 · ASP.NET Core and EF Core | The same CRUD API on the other stack: pipeline, DI and config, EF Core, auth and tests. | 0.35 | net-aspnet, net-di-config, net-efcore, net-auth, net-testing |
| `stage-8` (was stage-7) | Stage 8 · Ship it | Git, testing, security and deployment. This is the stage that gets skipped and the stage that gets asked about. | 0.35, gated by stage-5 (see §5) | craft-git, craft-testing, craft-security, craft-shipping |
| `stage-9` **new** | Stage 9 · Run it in production | Beyond mid-level: make it fast, see inside it, keep the data correct under concurrency, move work to queues, and harden it. | 0.35 | web-perf, craft-observability, data-scale, node-jobs, craft-appsec |
| `stage-10` **new** | Stage 10 · Toward senior | System design for CRUD at scale, architecture decisions, incidents and on-call, and the review and mentoring that make a team better. Grounded, not whiteboard puzzles. | 0.35 | craft-design, craft-architecture, craft-incidents, craft-review |

---

## 3. Question targets for every module

"+new" is what the author writes. "d3 after" is the **minimum** d3 count for the module after expansion (existing d3 + new d3). "ask (new)" is the minimum number of new questions that get an `ask`. The one-line question intents, with pre-assigned ids, type and difficulty, are in each track brief in §6. They live there once so the briefs stay self-contained.

| Stage | Module | Id prefix | Now | Target | +new | d3 now | d3 after | ask (new) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | js-values | js-values- | 14 | 22 | 8 | 2 | 5 | 2 |
| 1 | js-functions | js-functions- | 14 | 22 | 8 | 3 | 6 | 2 |
| 1 | js-objects-arrays | js-objects- | 14 | 24 | 10 | 3 | 6 | 2 |
| 1 | **js-classes** | js-classes- | 0 | 14 | 14 | – | 4 | 3 |
| 1 | js-async | js-async- | 14 | 26 | 12 | 5 | 9 | 3 |
| 1 | **js-stdlib** | js-stdlib- | 0 | 14 | 14 | – | 3 | 3 |
| 1 | js-modules | js-modules- | 14 | 22 | 8 | 3 | 5 | 2 |
| 2 | ts-basics | ts-basics- | 14 | 22 | 8 | 2 | 5 | 2 |
| 2 | ts-shapes | ts-shapes- | 14 | 22 | 8 | 5 | 7 | 2 |
| 2 | ts-practice | ts-practice- | 14 | 22 | 8 | 3 | 6 | 2 |
| 2 | **ts-advanced** | ts-adv- | 0 | 14 | 14 | – | 6 | 3 |
| 2 | web-browser | web-browser- | 14 | 22 | 8 | 3 | 5 | 2 |
| 2 | **web-a11y** | web-a11y- | 0 | 14 | 14 | – | 3 | 3 |
| 3 | react-render | react-render- | 14 | 22 | 8 | 2 | 5 | 2 |
| 3 | react-state | react-state- | 14 | 24 | 10 | 3 | 6 | 2 |
| 3 | react-effects | react-effects- | 14 | 24 | 10 | 4 | 7 | 3 |
| 3 | **react-data** | react-data- | 0 | 14 | 14 | – | 4 | 3 |
| 3 | react-perf | react-perf- | 14 | 22 | 8 | 4 | 6 | 2 |
| 3 | react-app | react-app- | 14 | 22 | 8 | 4 | 6 | 2 |
| 3 | **react-server** | react-server- | 0 | 16 | 16 | – | 6 | 4 |
| 4 | node-runtime | node-runtime- | 14 | 26 | 12 | 4 | 8 | 3 |
| 4 | node-express | node-express- | 14 | 24 | 10 | 3 | 6 | 2 |
| 4 | node-auth | node-auth- | 14 | 24 | 10 | 3 | 7 | 3 |
| 4 | web-http | web-http- | 14 | 26 | 12 | 2 | 6 | 3 |
| 4 | web-api-design | web-api- | 14 | 24 | 10 | 3 | 7 | 3 |
| 5 | data-sql | data-sql- | 14 | 26 | 12 | 3 | 6 | 3 |
| 5 | data-modeling | data-model- | 14 | 24 | 10 | 3 | 5 | 2 |
| 5 | **data-queries** | data-query- | 0 | 16 | 16 | – | 6 | 4 |
| 5 | **node-data** | node-data- | 0 | 14 | 14 | – | 4 | 3 |
| 6 | cs-basics | cs-basics- | 14 | 22 | 8 | 1 | 3 | 2 |
| 6 | cs-oop | cs-oop- | 14 | 22 | 8 | 4 | 7 | 2 |
| 6 | **cs-modern** | cs-modern- | 0 | 14 | 14 | – | 4 | 3 |
| 6 | cs-linq-async | cs-linq- | 14 | 26 | 12 | 3 | 6 | 3 |
| 7 | net-aspnet | net-aspnet- | 14 | 24 | 10 | 2 | 5 | 2 |
| 7 | net-di-config | net-di- | 14 | 22 | 8 | 3 | 5 | 2 |
| 7 | net-efcore | net-ef- | 14 | 26 | 12 | 4 | 7 | 3 |
| 7 | **net-auth** | net-auth- | 0 | 14 | 14 | – | 4 | 3 |
| 7 | **net-testing** | net-test- | 0 | 14 | 14 | – | 4 | 3 |
| 8 | craft-git | craft-git- | 14 | 22 | 8 | 2 | 4 | 2 |
| 8 | craft-testing | craft-test- | 14 | 24 | 10 | 3 | 5 | 2 |
| 8 | craft-security | craft-sec- | 14 | 24 | 10 | 2 | 5 | 3 |
| 8 | craft-shipping | craft-ship- | 14 | 22 | 8 | 3 | 4 | 2 |
| 9 | **web-perf** | web-perf- | 0 | 14 | 14 | – | 6 | 4 |
| 9 | **craft-observability** | craft-obs- | 0 | 14 | 14 | – | 5 | 4 |
| 9 | **data-scale** | data-scale- | 0 | 14 | 14 | – | 6 | 4 |
| 9 | **node-jobs** | node-jobs- | 0 | 14 | 14 | – | 6 | 4 |
| 9 | **craft-appsec** | craft-appsec- | 0 | 14 | 14 | – | 5 | 4 |
| 10 | **craft-design** | craft-design- | 0 | 16 | 16 | – | 7 | 6 |
| 10 | **craft-architecture** | craft-arch- | 0 | 14 | 14 | – | 6 | 5 |
| 10 | **craft-incidents** | craft-inc- | 0 | 14 | 14 | – | 5 | 5 |
| 10 | **craft-review** | craft-review- | 0 | 14 | 14 | – | 5 | 5 |
| | **Total** | | **434** | **1,012** | **578** | 94 | ≈ 290 min | ≈ 150 min |

Stage totals after expansion: S1 144 · S2 116 · S3 144 · S4 124 · S5 80 · S6 84 · S7 100 · S8 92 · S9 70 · S10 58.

**Existing modules' `estMinutes`:** add 5 to every existing module that gains 8–10 questions, and 10 to those gaining 12 or more (the primer grows with them).

---

## 4. Difficulty, type mix and `ask` policy

### 4.1 Difficulty
Keep `d: 1 | 2 | 3`. Adding a `4 = senior` touches `types.d.ts`, `schema.js`, `api.js` (counts), `client/src/lib/types.ts` (`Record<'1'|'2'|'3'>`) and two label arrays in the UI. That is cheap but not free, and "senior" is better expressed by **stage placement** than by a badge. Rules:

- **d1:** vocabulary and "you just started" facts. Aim for 1–2 per module in stages 1–5, and 0–1 elsewhere. Never more than 15% of a module.
- **d2:** what a junior should answer without hesitating. It is the default and the majority in stages 1–8.
- **d3:** what distinguishes a mid-level engineer. It needs the *why*, a second-order effect, or a trade-off.
  - Existing modules: at least **25%** d3 after expansion (the column in §3).
  - New modules in stages 1–7: about **30%**.
  - Stage 9: about **40%**.
  - Stage 10: about **45%**. There, d3 means "the answer a senior gives".
- A question is **not** d3 because it is obscure. If the only thing making it hard is trivia (spec edge cases no one hits at work), cut it.

### 4.2 `ask` (interviewer intent)
The target is about 22% of the whole curriculum, which matches the README's "about a fifth". Give an `ask` to:
1. **Every question that is itself a classic interview question** (event-loop ordering, closures in loops, `==`, keys, useEffect deps, 401 vs 403, N+1, isolation levels, "how would you design…").
2. **Every d3 in stages 9–10.**
3. **Every question where the strong answer has a follow-up the interviewer will ask next.** The `ask` should name that follow-up.

An `ask` is 1–2 sentences. It says what is really being probed and what the strong version of the answer sounds like, for example "…expect a follow-up asking when `||` is still correct". It never repeats the `why`.

### 4.3 Type mix
Hitting 40% mcq overall is **not reachable by adding questions alone**. The existing 434 are 76% mcq (332). Even with zero new mcq, the total would be 33% mcq, so the realistic lever is the mix of *new* questions. Target for **new** questions:

| mcq | output | multi | boolean | short | order |
| --- | --- | --- | --- | --- | --- |
| ≈ 30% | ≈ 18% | ≈ 17% | ≈ 12% | ≈ 11% | ≈ 12% |

That yields roughly **mcq 50% / output 16% / multi 11% / boolean 8% / short 7% / order 8%** overall.

To get to about 40% mcq, run an optional **retype pass** afterwards: convert about 90 existing mcqs whose content is naturally a select-all, a true/false or an ordering. Keep the id and `why`, and change `type`, `choices` and `answer`. Changing the type of an existing id is safe for learner history (card state is keyed by id), but it resets how hard the card feels. So do it once, deliberately, not piecemeal. Obvious candidates: `web-http-10`, `craft-ship-7`-style process questions, `craft-sec-6`, `net-di-9` (log-level order → `order`), `data-model-6` (ACID → `multi`), `node-express-10` (already multi), `cs-linq-9`, `react-app-10`, `craft-git-13`, `ts-shapes-1`.

Per-type conventions (also in the shared rules, §6.0):

- **output** is "predict the result". It needs a code snippet and choices that are literal results. Outside JS/C#/SQL it means "predict what happens" with a concrete artefact: an HTTP exchange, a Dockerfile, a trace summary, a timeline.
- **short** answers must be a single token or name, with every reasonable variant in `answer[]`. The grader lower-cases and trims but does no fuzzy matching.
- **order** has 4–6 items and exactly one defensible order. The prompt must say the ordering criterion ("in the order the database evaluates them", "cheapest first").

---

## 5. The expanded path, in order

| Stage | Modules in order | Qs | Why here |
| --- | --- | --- | --- |
| 1 · The language | js-values, js-functions, js-objects-arrays, **js-classes**, js-async, **js-stdlib**, js-modules | 144 | Classes build on `this` (functions) and objects. stdlib comes after async because it covers async iteration. Modules/tooling stays last, as today. |
| 2 · Types and the browser | ts-basics, ts-shapes, ts-practice, **ts-advanced**, web-browser, **web-a11y** | 116 | ts-advanced is the capstone of the TS run and is d3-heavy by design. Because a stage unlocks at 35% of the *previous* stage, nobody is blocked by it. a11y follows the browser platform and comes **before** React, so semantic HTML is learned before JSX hides it. |
| 3 · React for real apps | react-render, react-state, react-effects, **react-data**, react-perf, react-app, **react-server** | 144 | react-data comes right after effects, as "the answer to fetching in effects". react-server comes last because it needs Suspense, transitions and the app-structure context. |
| 4 · The server side | node-runtime, node-express, node-auth, web-http, web-api-design | 124 | Unchanged order. All five grow. |
| 5 · Data | data-sql, data-modeling, **data-queries**, **node-data** | 80 | Advanced SQL comes after modelling (indexes first). node-data closes the stage because it wires SQL into the Node API from stage 4. |
| 6 · C#, the language | cs-basics, cs-oop, **cs-modern**, cs-linq-async | 84 | The old stage 6 had six modules; with four more it would have ten. Splitting language from framework keeps each stage digestible and the 35% gate meaningful. |
| 7 · ASP.NET Core and EF Core | net-aspnet, net-di-config, net-efcore, **net-auth**, **net-testing** | 100 | Auth after EF because resource-based authz needs the data layer. Testing last because it exercises everything before it. |
| 8 · Ship it | craft-git, craft-testing, craft-security, craft-shipping | 92 | Unchanged content order. |
| 9 · Run it in production | **web-perf, craft-observability, data-scale, node-jobs, craft-appsec** | 70 | Upper mid-level. Perf comes first because it motivates observability ("measure first"), observability before concurrency and queues because you need to see a problem to fix it, and appsec last because it builds on everything. |
| 10 · Toward senior | **craft-design, craft-architecture, craft-incidents, craft-review** | 58 | Design uses every tier from stage 9. Architecture generalises design into decisions. Incidents apply observability under pressure. Review and mentoring close the path because they are about multiplying other people. |

### The gating problem, and a recommended 10-line fix
`unlockAt` compares against the **previous stage in list order**. With .NET at 6–7, "Ship it" would require 35% of ASP.NET. That is already a quirk today (it requires 35% of C#), and it is worse after the split.

**Recommendation:** add an optional `after?: string` to `Stage`: the id of the stage whose mastery gates this one, defaulting to the previous stage.
- In `progress.js`, look up that stage's mastery instead of `previousMastery`.
- In `validateContent()`, check that `after` references a known stage earlier in the list.
- Set `stage-8.after = 'stage-5'`, so a JS-only learner goes 5 → 8 → 9 → 10 and the .NET stages become an optional branch gated by stage 5.

**If code changes are off the table:** set `stage-8.unlockAt = 0`, which keeps Ship it always open. That is acceptable but loses the gate.

---

## 6. Track-by-track author briefs

**How to hand these out:** give each author agent **§6.0 (shared rules) followed by its own §6.x brief**. §6.0 is written once to avoid nine copies. Together, 6.0 + 6.x are self-contained.

Suggested split: nine agents, one per track. Craft is 128 new questions, so split it into **6.9a craft-core** and **6.9b craft-senior**; that makes ten agents.

---

### 6.0 Shared rules for every author (prepend to every brief)

**What you are doing.** You are extending the curriculum of *Stack Ready*, an interview-prep app that takes a learner from "can write some JavaScript" to mid-level CRUD developer and, in stages 9–10, toward senior. Repo root: `C:\Users\E\Desktop\opudslopboot\1jstrain2.2`. Content is plain ESM in `content/`. Read `content/schema.js` (the `q()` / `deck()` helpers and their validation), `content/types.d.ts`, and the existing questions and primers for your track before writing anything. Match their voice: dense, opinionated, practical, no fluff.

**Files you own. Touch nothing else.**
- `content/questions/<track>.js`: append new `q({...})` entries to the end of each existing module's `deck(...)` array, and add one new `...deck('<new-module-id>', '<track>', [ ... ])` block per new module, in stage order.
- `content/modules/<track>.js`: your track's module definitions. The integrator splits `content/modules/stage-*.js` into per-track files **before** you start (step 0 in §8). If that has not happened, stop and ask. Do not edit `stage-*.js` in parallel with other authors.
- You do **not** edit `content/tracks.js`, `content/index.js`, `content/modules/index.js`, the README, or any server/client file. The integrator does that from your hand-off note.

**Never** change an existing question's `id`, and never move an existing question to another module. Learner history is keyed on them. Do not rewrite existing questions. If you find an error in one, list it in your hand-off note.

**Ids.** `<prefix>-<n>`, unique across the whole curriculum. Use the prefix and starting number given in your brief. Existing modules continue at **15**. New modules start at **1**. The brief pre-assigns an id to every intent: use those ids, in that order, with no gaps.

**Question shape** (copy the existing style exactly):

```js
q({
  id: 'js-async-15',
  type: 'output',          // omit for mcq (the default)
  d: 2,                    // 1 foundation · 2 junior · 3 mid-level (stages 9–10: "senior signal")
  prompt: 'What does this log?',
  code: "async function f() {\n  console.log(1);\n  await null;\n  console.log(3);\n}\nf();\nconsole.log(2);",
  choices: ['`1 2 3`', '`1 3 2`', '`2 1 3`', '`3 2 1`'],
  answer: 0,
  why: '…2–4 sentences that teach: the rule, the mechanism, and the practical consequence or related gotcha.',
  ask: '…optional, 1–2 sentences: what the interviewer is really probing and the follow-up they will ask.',
  tags: ['async', 'event-loop'],
}),
```

**Type rules**
- `mcq` / `output`: exactly **4 choices**, one correct (`answer` is an index). **Vary the correct index.** Across a module, no index should hold more than about 35% of answers. Distractors must be plausible mistakes a real person makes, never jokes.
- `output`: a `code` snippet (≤ 12 lines) plus choices that are **literal results** in backticks, or, for non-code tracks, concrete predicted outcomes. Use `\n` in the code string. Snippets must be correct and runnable in the stated environment; mentally execute them twice.
- `multi`: 4–6 choices, 2–4 correct, and the prompt ends with "(Select all that apply.)". `answer` is an array of indices.
- `boolean`: a statement. `answer: true|false`. Keep roughly half of your booleans false, and make the false ones a *common belief*.
- `short`: the answer is a single token or name (a command, a flag, a status code, a keyword, an API name). `answer` lists every reasonable variant, e.g. `['Number.isNaN', 'Number.isNaN()']`. The grader lower-cases, trims and strips trailing punctuation, and does nothing else. The prompt says what form to type ("Type the header name.").
- `order`: 4–6 items with exactly one defensible order, and the prompt states the criterion. Write `choices` **in shuffled order** and `answer` as the permutation of indices giving the correct order (see `data-sql-1`, `craft-ship-7`).

**`lang`.** It defaults by track (js→js, ts→ts, react→tsx, data→sql, csharp/dotnet→csharp, node/web/craft→js). **Set it explicitly** whenever the snippet is not the default: `'bash'` for shell/git/docker commands, `'sql'` in node/craft, `'csharp'` in craft, `'json'`, `'ts'` in node. For HTTP messages, logs or Dockerfiles use `'bash'` (closest highlighter) or `'text'` (falls back to JS highlighting; acceptable).

**Tags.** 1–3 per question, lower-kebab-case, reusing the existing vocabulary where it fits (`event-loop`, `error-handling`, `security`, `performance`, `caching`, `concurrency`, `migrations`, `testing`, …). New modules may introduce new tags. Add `senior` to every stage-10 question.

**Difficulty and `ask`.** Meet the per-module minimums in your brief. The intents' `d` values are a starting point, so re-rate a question if needed to hit the minimum honestly. d3 needs a trade-off, a mechanism or a second-order effect. Obscurity alone does not make a question d3. Questions marked ★ **must** carry an `ask`; add more if a question is a classic interview question.

**The primer is the lesson.** Every new question must be answerable from its module's primer.
- **Existing modules:** extend the primer. Add sections or paragraphs, typically one short paragraph per 2–3 new questions, and keep the `## Heading` style. Where a topic now has its own module, add a one-line "covered in depth in *Module title*" pointer.
- **New modules:** write the full primer from the outline in your brief: 900–1,600 words, `##` sections, short code fences, tables where they help, opinionated ("do X; Y is a bug").
- Primers are JS **template literals**, so escape backticks as `` \` `` and `${` as `\${`. Look at how the existing primers do it.
- Write `objectives` for new modules exactly as given (four "say it out loud" bullets). Raise `estMinutes` by 5 (+8–10 questions) or 10 (+12 or more) on existing modules.

**Version-sensitive facts: verify, then phrase defensively.** React 19 / 19.2 (`useEffectEvent`, `<Activity>`), React Compiler 1.0, Express 5, Node 22/24 LTS (`--env-file`, `process.loadEnvFile`, `node:test`), TanStack Query v5 (`gcTime`), zod v4 syntax, .NET 8/9/10 (built-in minimal-API validation, OpenAPI template changes, `HybridCache`), C# 12–14 (primary constructors, collection expressions, `field`), EF Core 8–10, OWASP Top 10 2021 vs 2025, Temporal browser support, INP replacing FID (March 2024).
- If you are not certain of a version detail, write the question so it does not hinge on the version number. Prefer "in .NET 8+" to "added in .NET 8.0.3".
- Never write a question whose correct answer depends on something you could not verify.

**Scope discipline.** Every question must be something a working CRUD developer hits, or something an interviewer asks about this stack. No algorithm puzzles, no spec trivia. No questions about the app itself.

**Validation.** Run `npm run check:content` from the repo root after each module. It must pass, and the counts must match your brief. Then re-read every `why` once for correctness.

**Hand-off note** (your final message): the new module objects (ids, and where they sit in your modules file), per-module question counts plus d3 and `ask` counts, any existing-question errors you noticed, any intent you replaced (with the reason), and any version facts you could not verify.

**Legend for the intents below:** `id · type · d · ★` = must have an `ask`. The text after the dash is the intent: what the question tests, the snippet idea, and the expected answer. You may improve the wording, distractors and snippet. Keep the tested concept, type and difficulty unless a better question clearly exists; if you swap one, say so in the hand-off note.

---

### 6.1 JavaScript track brief (`js`)

**Files:** `content/questions/js.js`, `content/modules/js.js`.
**Totals:** 70 → **144** (+74). Five existing modules gain 46 questions; two new modules (`js-classes`, `js-stdlib`) add 28.
**Stage placement (the integrator applies this):** stage 1 becomes `js-values, js-functions, js-objects-arrays, js-classes, js-async, js-stdlib, js-modules`.
**Existing questions to avoid duplicating:** `var` loop closure (js-functions-2), the four `this` rules (js-functions-4/5/6), microtask ordering (js-async-1), `forEach(async)` (js-async-5), Promise combinators (js-async-4), the JSON round trip (js-objects-9), reduce-based grouping (js-objects-10).

#### js-values (prefix `js-values-`, next id 15) · 14 → 22 · d3 total ≥ 5 · new `ask` ≥ 2
Primer additions: "Big numbers and ids" (MAX_SAFE_INTEGER, BigInt, ids as strings), "Object.is and -0", "Logical assignment", "Number() vs parseInt vs parseFloat".
- js-values-15 · output · d2 ★ — `console.log(Number.MAX_SAFE_INTEGER + 2)` prints `9007199254740992`, not `…993`. Why 64-bit DB ids must travel as strings in JSON.
- js-values-16 · mcq · d2 — BigInt: which is true? `10n + 1` throws a TypeError (no mixing), `JSON.stringify({ n: 1n })` throws, `typeof 1n === 'bigint'`. Correct: "mixing BigInt and Number in arithmetic throws".
- js-values-17 · output · d2 — `console.log(Object.is(-0, 0), -0 === 0, Object.is(NaN, NaN))` → `false true true`.
- js-values-18 · multi · d2 — Reliable type checks (Select all): `Array.isArray(x)` ✔, `Number.isFinite(x)` ✔, `typeof x === 'object'` for arrays ✘, `x instanceof Array` across iframes/realms ✘, `x === null` ✔.
- js-values-19 · boolean · d2 — "`typeof someUndeclaredVariable` throws a ReferenceError." → false (returns `'undefined'`; contrast with the TDZ, which does throw).
- js-values-20 · output · d3 ★ — `let a = 0; a ||= 5; let b = 0; b ??= 5; let c = 1; c &&= 7; console.log(a, b, c)` → `5 0 7`. The ask: when `||=` silently overwrites a legitimate 0.
- js-values-21 · short · d2 — "Which built-in checks for NaN **without** coercing its argument? (Type the function.)" → `['Number.isNaN', 'Number.isNaN()']`.
- js-values-22 · output · d3 — `console.log([Number(''), Number(null), Number(undefined), Number(' 12 ')])` → `[0, 0, NaN, 12]`. The form-validation bug where an empty field becomes 0.

#### js-functions (prefix `js-functions-`, next id 15) · 14 → 22 · d3 ≥ 6 · new `ask` ≥ 2
Primer additions: "call, apply, bind", "Closures capture variables, not values", "Currying and partial application", "Pure functions".
- js-functions-15 · mcq · d1 — `call` vs `apply` vs `bind`: which one returns a new function rather than invoking.
- js-functions-16 · output · d2 — `const obj = { name: 'A', regular() { return [1].map(function () { return this?.name; }); }, arrow() { return [1].map(() => this.name); } }; console.log(obj.regular(), obj.arrow())` → `[undefined] ['A']`.
- js-functions-17 · output · d3 ★ — `function make() { let msg = 'a'; const log = () => msg; msg = 'b'; return log; } console.log(make()())` → `'b'`. Closures capture the variable binding, not a snapshot; ties to stale closures in React.
- js-functions-18 · output · d2 — `const add = (a) => (b) => a + b; const add2 = add(2); console.log(typeof add2, add2(3))` → `function 5`.
- js-functions-19 · multi · d2 — Which functions are pure? (Select all) `(a, b) => a + b` ✔, `(arr) => arr.sort()` ✘, `() => Date.now()` ✘, `(xs) => xs.map((x) => x * 2)` ✔, `(u) => { u.seen = true; return u; }` ✘.
- js-functions-20 · boolean · d2 — "Arrow functions have their own `arguments` object." → false (use rest parameters).
- js-functions-21 · short · d1 — "What is the name for a function that keeps access to variables from the scope it was created in, after that scope has returned? (One word.)" → `['closure', 'a closure', 'closures']`.
- js-functions-22 · order · d3 — Order the scopes the engine searches when resolving an identifier used inside a block in a function in an ES module: block → enclosing function → module scope → global scope.

#### js-objects-arrays (prefix `js-objects-`, next id 15) · 14 → 24 · d3 ≥ 6 · new `ask` ≥ 2
Primer additions: "ES2023+: toSorted, toReversed, with, toSpliced", "Object.groupBy / Map.groupBy", "structuredClone vs JSON", "entries/fromEntries", "Object.freeze is shallow".
- js-objects-15 · output · d2 — `const a = [3, 1, 2]; const b = a.toSorted(); console.log(a, b)` → `[3, 1, 2] [1, 2, 3]`.
- js-objects-16 · output · d1 — `Array.from({ length: 3 }, (_, i) => i * 2)` → `[0, 2, 4]`.
- js-objects-17 · mcq · d2 — What `Object.groupBy(tickets, (t) => t.status)` returns: a null-prototype object of arrays keyed by status. Mention `Map.groupBy` for non-string keys.
- js-objects-18 · output · d3 ★ — `structuredClone({ at: new Date(), tags: new Set(['a']), fn() {} })` → throws `DataCloneError` (functions are not cloneable); without `fn` it preserves Date and Set, unlike JSON.
- js-objects-19 · multi · d2 — Which return a **new** array and leave the original untouched? (Select all) `map` ✔, `slice` ✔, `splice` ✘, `concat` ✔, `sort` ✘, `toSpliced` ✔.
- js-objects-20 · output · d2 — `Object.fromEntries(Object.entries({ a: 1, b: 2 }).map(([k, v]) => [k, v * 10]))` → `{ a: 10, b: 20 }`.
- js-objects-21 · boolean · d2 — "`Object.freeze(state)` also freezes `state.user.prefs`." → false (shallow).
- js-objects-22 · mcq · d2 — "You need to know whether **any** order is overdue." `some` (short-circuits, returns a boolean) vs `filter().length` vs `find` vs `forEach`.
- js-objects-23 · short · d2 — "Which array method returns the index of the first element that matches a predicate? (Type the method name.)" → `['findIndex', 'findIndex()', 'Array.prototype.findIndex']`.
- js-objects-24 · order · d3 ★ — Put the pipeline steps in the order that returns the correct first page of active orders, newest first, and does the least work: `filter(active)` → `toSorted(byDateDesc)` → `slice(0, 20)` → `map(toViewModel)`.

#### js-classes — NEW (prefix `js-classes-`, ids 1–14) · 14 · d3 ≥ 4 · `ask` ≥ 3
- **Title:** Prototypes, classes and objects in practice
- **Blurb:** The prototype chain under `class`, private fields, getters, inheritance, and when composition beats all of it.
- **estMinutes:** 25
- **Objectives:**
  1. Explain the prototype chain and what `class` compiles down to
  2. Use private `#fields`, getters/setters and `static` members correctly
  3. Explain `super`, method overriding and why `instanceof` can lie
  4. Argue for composition over inheritance with a CRUD-app example
- **Primer outline:**
  1. Objects link to objects: the prototype chain, property lookup, `Object.create`, `prototype` vs `[[Prototype]]`/`__proto__`, `Object.hasOwn`.
  2. What `class` is sugar for: a constructor function with methods on its prototype; class bodies are strict; classes are not hoisted (TDZ).
  3. Fields and privacy: public fields, `#private` (runtime-enforced) vs TS `private` (compile-time only) vs closures.
  4. Accessors and static: `get`/`set`, static methods and fields, when a getter is a smell (expensive work).
  5. Inheritance: `extends`, `super()` before `this`, overriding and `super.method()`, extending `Error`.
  6. Methods and `this`: detached methods lose `this`; arrow class fields bind but cost one function per instance and are not on the prototype.
  7. `instanceof` and its limits: realms/iframes, duplicate package copies in node_modules; prefer duck typing or brand checks at boundaries.
  8. Composition over inheritance, and where classes *are* right in a CRUD app (error types, services with injected dependencies) vs plain objects + functions (data).
- **Questions:**
  - js-classes-1 · mcq · d1 — What `class User {}` creates under the hood: a constructor function whose methods live on `User.prototype`.
  - js-classes-2 · output · d2 — `const base = { greet() { return 'hi'; } }; const o = Object.create(base); console.log(o.greet(), Object.hasOwn(o, 'greet'))` → `hi false`.
  - js-classes-3 · output · d1 — `class A {} console.log(typeof A)` → `'function'`.
  - js-classes-4 · output · d3 ★ — `class Btn { label = 'ok'; click() { return this.label; } } const f = new Btn().click; f();` → TypeError (Cannot read properties of undefined): class bodies are strict, so detached `this` is `undefined`. The ask: passing methods as callbacks and event handlers.
  - js-classes-5 · mcq · d2 ★ — `#secret` vs TypeScript `private secret`: only `#` is enforced at runtime; TS `private` is erased and readable through `(obj as any)`.
  - js-classes-6 · output · d2 — `class Temp { #c = 0; get f() { return this.#c * 9 / 5 + 32; } set f(v) { this.#c = (v - 32) * 5 / 9; } } const t = new Temp(); t.f = 212; console.log(t.f)` → `212`.
  - js-classes-7 · boolean · d2 — "Class declarations are hoisted like function declarations, so you can call `new Foo()` above `class Foo {}`." → false (TDZ).
  - js-classes-8 · mcq · d2 — Why a derived constructor must call `super()` before touching `this`: the parent allocates and initialises the object.
  - js-classes-9 · multi · d2 — True of an arrow-function class field `handle = () => { … }`? (Select all) its `this` is always the instance ✔; a new function is created per instance ✔; it is not on the prototype ✔; subclasses can call it with `super.handle()` ✘; it is shared across instances ✘.
  - js-classes-10 · output · d2 — `class NotFound extends Error { constructor(m) { super(m); this.name = 'NotFound'; } } const e = new NotFound('order 7'); console.log(e instanceof NotFound, e instanceof Error, e.name, e.message)` → `true true NotFound order 7`.
  - js-classes-11 · mcq · d3 ★ — A `PaymentService` base class with `StripePayment extends PaymentService` and `StripePaymentWithRetry extends StripePayment`: what is the better shape? Composition: inject a gateway and wrap it with a retry decorator.
  - js-classes-12 · short · d1 — "Which keyword makes a class member belong to the class itself rather than to instances? (One word.)" → `['static']`.
  - js-classes-13 · order · d2 — Order the lookup for `rex.speak()` where `Dog extends Animal`: own properties of `rex` → `Dog.prototype` → `Animal.prototype` → `Object.prototype` → (then `undefined`, so calling it throws a TypeError).
  - js-classes-14 · mcq · d3 ★ — `err instanceof ValidationError` is false even though the error came from `ValidationError`. Most likely cause: two copies of the library in node_modules (or a different realm). The fix: check a `code`/`name` or a brand symbol.

#### js-async (prefix `js-async-`, next id 15) · 14 → 26 · d3 ≥ 9 · new `ask` ≥ 3
Primer additions: "The synchronous prelude of an async function", "fetch does not reject on 404", "Cancellation: AbortSignal.timeout and any", "What Promise.all does *not* cancel", "Retries with backoff and jitter", "Promisifying callbacks", "Unhandled rejections in Node".
- js-async-15 · output · d2 ★ — `async function f() { console.log(1); await null; console.log(3); } f(); console.log(2);` → `1 2 3`.
- js-async-16 · mcq · d3 ★ — `await Promise.all([ok(100), fail(50), ok(200)])`: rejects after about 50 ms, **and the other two keep running** (nothing is cancelled). Name the consequence for writes.
- js-async-17 · mcq · d3 — `fetch(url, { signal: AbortSignal.any([userController.signal, AbortSignal.timeout(5000)]) })`: what it does, and that a timeout rejects with a `TimeoutError` DOMException while a manual abort gives `AbortError`.
- js-async-18 · output · d2 ★ — `const res = await fetch('/api/missing'); console.log(res.ok, res.status)` → `false 404`. fetch only rejects on network failure, so check `res.ok`.
- js-async-19 · output · d3 — `setTimeout(() => log('t')); queueMicrotask(() => log('m')); (async () => { log('a'); await 0; log('b'); })(); log('s');` → `a s m b t`.
- js-async-20 · multi · d2 — Which can produce an unhandled rejection? (Select all) `p.then(onOk)` with no catch ✔; calling an `async` function that throws without awaiting it ✔; `try { await p } catch {}` ✘; `p.catch(() => {})` ✘; `Promise.allSettled(ps)` ✘.
- js-async-21 · mcq · d2 — Why add **jitter** to exponential backoff: so a thousand clients that failed together do not retry together (thundering herd).
- js-async-22 · boolean · d2 — "`await` inside a `.map` callback makes `map` wait for each item." → false (you get an array of promises).
- js-async-23 · short · d2 — "Which Promise combinator resolves with an array of `{ status, value | reason }` objects? (Type the method.)" → `['Promise.allSettled', 'allSettled', 'Promise.allSettled()']`.
- js-async-24 · order · d2 — Order what happens for `const data = await (await fetch(url)).json()`: request sent → response headers arrive and the fetch promise resolves with a `Response` → body is streamed → `json()` resolves with the parsed object.
- js-async-25 · mcq · d2 — Wrapping a callback API in `new Promise`: the classic bug is not calling `reject` on the error path (the promise hangs forever). Mention `util.promisify`.
- js-async-26 · mcq · d3 ★ — In Node 20+, `const p = Promise.reject(new Error('x')); setTimeout(() => p.catch(() => {}), 0);` crashes the process: the rejection is reported as unhandled before the handler is attached one macrotask later.

#### js-stdlib — NEW (prefix `js-stdlib-`, ids 1–14) · 14 · d3 ≥ 3 · `ask` ≥ 3
- **Title:** Iteration, errors, collections and dates
- **Blurb:** Iterators and generators, errors that keep their cause, Map/Set/WeakMap, and the date bugs every CRUD app ships.
- **estMinutes:** 30
- **Objectives:**
  1. Explain the iteration protocol and what a generator is for
  2. Throw and wrap errors so the cause survives to the log
  3. Choose between Map, Set, WeakMap and a plain object with a reason
  4. Store and display dates without time-zone bugs
- **Primer outline:**
  1. The iteration protocol: `Symbol.iterator`, `next()`, what `for…of` and spread accept (arrays, strings, Maps, Sets, NodeLists; not plain objects).
  2. Generators: `function*`, `yield`, laziness, infinite sequences, the return value that spread ignores.
  3. Async iteration: `for await…of`, async generators for paginated APIs, readable streams.
  4. Errors: always throw `Error` objects, custom subclasses with a `code`, `new Error(msg, { cause })`, `AggregateError`, rethrowing, never swallowing.
  5. Map and Set: key identity, insertion order, the ES2025 Set methods (`union`, `intersection`, `difference`); WeakMap/WeakRef and garbage collection.
  6. Copying and serialising: `structuredClone`, JSON `replacer`/`reviver`, `toJSON`.
  7. Dates: epoch milliseconds, store UTC, ISO 8601, 0-based months, date-only strings parse as UTC, overflow arithmetic, formatting with `Intl.DateTimeFormat`, and Temporal (verify support; "use it where available, otherwise date-fns/Luxon").
  8. Intl and strings: `Intl.NumberFormat` for currency, `localeCompare`/`Intl.Collator` for sorting names, `padStart`, `replaceAll`.
- **Questions:**
  - js-stdlib-1 · mcq · d2 — What makes an object usable in `for…of`: a `[Symbol.iterator]()` method returning an iterator with `next()` → `{ value, done }`.
  - js-stdlib-2 · output · d2 ★ — `function* g() { yield 1; yield 2; return 3; } console.log([...g()])` → `[1, 2]` (the return value is not iterated).
  - js-stdlib-3 · output · d3 — `function* nat() { let n = 0; while (true) yield n++; }` with a `take(3)` helper → `[0, 1, 2]`. An infinite generator is fine because it is lazy.
  - js-stdlib-4 · mcq · d2 — Why `for await (const page of fetchPages('/api/orders'))` beats collecting every page first: memory, early exit, backpressure.
  - js-stdlib-5 · output · d2 — `try { await save(); } catch (err) { throw new Error('checkout failed', { cause: err }); }` → what the caller's `e.cause.message` holds (the original DB error message).
  - js-stdlib-6 · multi · d2 ★ — Good error-handling practice? (Select all) throw `Error` objects, not strings ✔; wrap with `cause` when adding context ✔; catch, log and rethrow at every layer ✘ (duplicate logs); an empty `catch {}` to keep the UI alive ✘; custom error classes with a stable `code` ✔.
  - js-stdlib-7 · mcq · d2 — Where an `AggregateError` comes from: `Promise.any` when every promise rejects; `.errors` holds them all.
  - js-stdlib-8 · output · d2 — `const m = new Map(); m.set({ id: 1 }, 'a'); console.log(m.get({ id: 1 }))` → `undefined` (key identity).
  - js-stdlib-9 · mcq · d3 ★ — The WeakMap use case: attaching cached metadata to objects you do not own (DOM nodes, request objects) without keeping them alive.
  - js-stdlib-10 · output · d2 — `const a = new Set([1, 2, 3]); const b = new Set([2, 3, 4]); console.log([...a.intersection(b)])` → `[2, 3]` (ES2025; mention it is available in current Node and browsers).
  - js-stdlib-11 · output · d3 — `const d = new Date(2024, 0, 31); d.setMonth(d.getMonth() + 1); console.log(d.getMonth(), d.getDate())` → `2 2` (31 Feb overflows to 2 March in 2024).
  - js-stdlib-12 · mcq · d2 ★ — A user in New York sees a birthday of "2024-03-10" rendered as 9 March. Why: date-only ISO strings parse as **UTC** midnight, while date-time strings without an offset parse as local time.
  - js-stdlib-13 · boolean · d2 — "Store timestamps in the database as local-time strings in the user's zone so they display correctly." → false (store UTC/`timestamptz`; convert on display).
  - js-stdlib-14 · short · d2 — "Which `Intl` constructor formats `1234.5` as `$1,234.50`? (Type the constructor.)" → `['Intl.NumberFormat', 'NumberFormat', 'new Intl.NumberFormat']`.

#### js-modules (prefix `js-modules-`, next id 15) · 14 → 22 · d3 ≥ 5 · new `ask` ≥ 2
Primer additions: "The `exports` field", "peerDependencies", "Live bindings", ".mjs/.cjs and top-level await", "Source maps", "ESLint vs Prettier vs tsc", "What npm ci does".
- js-modules-15 · mcq · d2 — What `"exports"` in package.json does: it defines the public entry points (deep imports are blocked) and supports conditional `import`/`require` targets.
- js-modules-16 · mcq · d2 — When a package belongs in `peerDependencies` (a React component library must share the app's single React copy).
- js-modules-17 · mcq · d1 — The division of labour: Prettier formats, ESLint finds suspicious code and enforces rules, tsc type-checks.
- js-modules-18 · short · d2 — "Which file extension makes Node treat a file as an ES module regardless of the package's `type`? (Include the dot.)" → `['.mjs', 'mjs']`.
- js-modules-19 · output · d3 ★ — `counter.js`: `export let count = 0; export function inc() { count++; }`; `main.js`: `import { count, inc } from './counter.js'; inc(); console.log(count);` → `1` (ESM live bindings; CommonJS destructuring would give `0`).
- js-modules-20 · boolean · d2 — "Top-level `await` works in CommonJS files." → false.
- js-modules-21 · mcq · d2 — What a source map is for: mapping minified/transpiled production stack traces back to your source. Also: do not serve them publicly if the source is sensitive.
- js-modules-22 · order · d3 ★ — Order what `npm ci` does: check that package.json and the lockfile agree (fail if not) → delete `node_modules` → download packages at the locked versions and verify integrity hashes → run install lifecycle scripts.

---

### 6.2 TypeScript track brief (`ts`)

**Files:** `content/questions/ts.js`, `content/modules/ts.js`.
**Totals:** 42 → **80** (+38): 24 in existing modules, plus 14 in the new `ts-advanced`.
**Stage placement:** stage 2 becomes `ts-basics, ts-shapes, ts-practice, ts-advanced, web-browser, web-a11y` (the web modules belong to the web author).
**Avoid duplicating:** excess-property check (ts-basics-3), `as const` roles (ts-basics-6), `satisfies` basics (ts-practice-5), `Exclude` (ts-shapes-11), branded types (ts-shapes-13).

#### ts-basics (prefix `ts-basics-`, next id 15) · 14 → 22 · d3 ≥ 5 · new `ask` ≥ 2
Primer additions: "`object`, `{}` and `Object`", "`void` in callback types", "Optional properties", "Type-only imports".
- ts-basics-15 · mcq · d2 — `object` vs `{}` vs `Object`: `{}` accepts any non-nullish value, including `42` and `'x'`. Use `object` or a real shape.
- ts-basics-16 · mcq · d3 — Why `const out: number[] = []; [1, 2].forEach((n) => out.push(n));` compiles although `forEach` wants `() => void` and `push` returns a number: a `void` return in a *callback type* means "ignored", not "must be undefined".
- ts-basics-17 · boolean · d2 ★ — "TypeScript's `private` modifier prevents access at runtime." → false (erased; use `#private` for runtime privacy).
- ts-basics-18 · output · d1 — `type A = { x?: number }; declare const a: A; const v = a.x;` → the type of `v` is `number | undefined`.
- ts-basics-19 · multi · d2 — Which compile under `"strict": true` (without `noUncheckedIndexedAccess`)? (Select all) `const s: string = null` ✘; `declare const u: unknown; u.toFixed()` ✘; `declare let x: string | undefined; x!.length` ✔; `declare const r: Record<string, number>; const n: number = r.anything` ✔.
- ts-basics-20 · short · d2 — "Which keyword, used in a type position, gives you the type of a value? (One word.)" → `['typeof']`.
- ts-basics-21 · mcq · d2 — Why `import type { User } from './types'` (and `verbatimModuleSyntax`) matters: the import is guaranteed to be erased, so no runtime import or circular-import side effects, and it is required by isolated transpilers (esbuild/SWC).
- ts-basics-22 · output · d3 ★ — `const cfg = { mode: 'dark' }; setMode(cfg.mode);` where `setMode(m: 'dark' | 'light')`: which line errors, and why (the property widened to `string`). Fix with `as const` or `satisfies`.

#### ts-shapes (prefix `ts-shapes-`, next id 15) · 14 → 22 · d3 ≥ 7 · new `ask` ≥ 2
Primer additions: "keyof typeof and indexed access", "Awaited and friends", "Generic defaults", "Assignability order".
- ts-shapes-15 · output · d2 — `const STATUS = { draft: 0, paid: 1 }; type K = keyof typeof STATUS;` → `'draft' | 'paid'`.
- ts-shapes-16 · mcq · d2 — Indexed access types: `User['address']['city']` and `(typeof ROLES)[number]`, and what each gives you.
- ts-shapes-17 · multi · d2 — Which utility types are **built in**? (Select all) `Partial` ✔, `NonNullable` ✔, `Awaited` ✔, `DeepPartial` ✘, `Nullable` ✘, `Parameters` ✔.
- ts-shapes-18 · output · d2 ★ — `async function fetchUser(): Promise<User> {…}`; `type U = Awaited<ReturnType<typeof fetchUser>>` → `User`. The ask: deriving types from functions instead of duplicating them.
- ts-shapes-19 · mcq · d2 — `function first<T>(xs: T[]): T | undefined` vs `function first(xs: any[]): any`: what the type parameter buys at the call site.
- ts-shapes-20 · boolean · d2 — "An `interface` can extend a `type` alias of an object type." → true.
- ts-shapes-21 · short · d2 — "Which built-in utility type removes `null` and `undefined` from a type? (Type the name.)" → `['NonNullable', 'NonNullable<T>']`.
- ts-shapes-22 · order · d3 ★ — Order from widest to narrowest: `unknown`, `string`, `'a' | 'b'`, `'a'`, `never`.

#### ts-practice (prefix `ts-practice-`, next id 15) · 14 → 22 · d3 ≥ 6 · new `ask` ≥ 2
Primer additions: "One schema, one type: `z.infer`", "Typing events and generic components", "Augmenting Express's Request", "Migrating JS to TS".
- ts-practice-15 · mcq · d2 ★ — `const UserSchema = z.object({…}); type User = z.infer<typeof UserSchema>`: why the schema is the single source of truth (runtime validation and the static type cannot drift).
- ts-practice-16 · mcq · d2 — A React `onChange` handler extracted from JSX: type it as `(e: React.ChangeEvent<HTMLInputElement>) => void`. Inline handlers infer it.
- ts-practice-17 · mcq · d3 — Adding `req.user` in Express with types: `declare global { namespace Express { interface Request { user?: AuthUser } } }` (declaration merging) rather than casting in every handler.
- ts-practice-18 · multi · d2 — Which belong in a modern strict tsconfig for a Vite + React app? (Select all) `"strict": true` ✔, `"moduleResolution": "bundler"` ✔, `"verbatimModuleSyntax": true` ✔ (or `isolatedModules`), `"noImplicitAny": false` ✘, `"allowJs": true` with `checkJs` off everywhere ✘.
- ts-practice-19 · output · d3 — `function List<T>({ items, render }: { items: T[]; render: (t: T) => React.ReactNode }) {…}` used as `<List items={users} render={(u) => u.email} />`: what `u` is inferred as (`User`). Generic components.
- ts-practice-20 · boolean · d2 ★ — "`value as unknown as Order` is a reasonable way to fix a type error in application code." → false (it hides a boundary problem; validate instead).
- ts-practice-21 · short · d1 — "What file extension holds type declarations only, with no runtime code? (Include the dots.)" → `['.d.ts', 'd.ts']`.
- ts-practice-22 · order · d2 — Order an incremental JS → TS migration: add a tsconfig with `allowJs` → convert leaf modules and boundaries first → turn on strict flags one at a time → remove `allowJs` once no `.js` files remain.

#### ts-advanced — NEW (prefix `ts-adv-`, ids 1–14) · 14 · d3 ≥ 6 · `ask` ≥ 3
- **Title:** Type-level TypeScript
- **Blurb:** Mapped, conditional and template literal types, `infer`, overloads and declaration files — reading the types libraries hand you.
- **estMinutes:** 30
- **Objectives:**
  1. Read and write a mapped type with key remapping
  2. Explain conditional types, `infer` and distribution over unions
  3. Choose between overloads, unions and generics for a function signature
  4. Augment a library's types without forking it
- **Primer outline:**
  1. Why type-level code matters for a CRUD developer: reading library types and deriving instead of duplicating, not showing off. Keep a complexity budget.
  2. Recap: `keyof`, `typeof`, indexed access.
  3. Mapped types: `[K in keyof T]`, `+/-readonly`, `+/-?`, `as` key remapping, filtering keys with `never`.
  4. Conditional types and `infer`: unwrap promises, arrays and function returns; distribution over unions and `[T] extends [U]` to switch it off.
  5. Template literal types: event names, `Capitalize`, route params from a path string.
  6. Function signatures: overloads vs unions vs generics, `const` type parameters, `NoInfer`.
  7. Variance and assignability: `strictFunctionTypes`, method-shorthand bivariance, `readonly` arrays.
  8. Declarations: `.d.ts`, `declare module`, module augmentation, `declare global`.
  9. When to stop: type tests with `expectTypeOf`, editor performance, "can you explain the type you wrote?".
- **Questions:**
  - ts-adv-1 · output · d2 — `type Opt<T> = { [K in keyof T]?: T[K] }`: which built-in is this (`Partial<T>`)?
  - ts-adv-2 · output · d3 — `` type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] } ``; `Getters<{ name: string }>` → `{ getName: () => string }`.
  - ts-adv-3 · output · d3 ★ — `type ToArr<T> = T extends any ? T[] : never; type A = ToArr<string | number>` → `string[] | number[]`. With `[T] extends [any]` it would be `(string | number)[]`.
  - ts-adv-4 · mcq · d2 — `type Unwrap<T> = T extends Promise<infer U> ? U : T`: what `infer` does.
  - ts-adv-5 · multi · d3 — Reasonable uses of conditional/mapped types in app code? (Select all) getting a component's props with `ComponentProps<typeof Button>` ✔; unwrapping an API client's return type ✔; deriving route params from `'/orders/:id'` ✔; replacing every interface with conditional types ✘; encoding business rules only in types ✘.
  - ts-adv-6 · output · d2 — `` type Ev = `on${Capitalize<'click' | 'hover'>}` `` → `'onClick' | 'onHover'`.
  - ts-adv-7 · mcq · d2 — When overloads beat a union parameter: when the **return type depends on which argument form** was passed (e.g. `get(id: string): User; get(ids: string[]): User[]`).
  - ts-adv-8 · output · d3 — `function tuple<const T extends readonly unknown[]>(x: T) { return x; } const t = tuple(['a', 1]);` → `readonly ['a', 1]`.
  - ts-adv-9 · mcq · d3 — `function createMachine<S extends string>(states: S[], initial: NoInfer<S>)`: what `NoInfer` prevents (`initial: 'typo'` widening `S` instead of erroring).
  - ts-adv-10 · mcq · d2 ★ — Adding a field to a third-party library's interface (e.g. a theme type, or Express `Request`): module augmentation with `declare module '…' { interface X { … } }` in a `.d.ts` included by tsconfig.
  - ts-adv-11 · boolean · d3 — "With `strictFunctionTypes`, method-shorthand parameters (`handle(x: T): void` in an interface) are also checked contravariantly." → false (method shorthand stays bivariant; function-property syntax is strict).
  - ts-adv-12 · short · d2 — "Which built-in utility type gives a function's parameter types as a tuple? (Type the name.)" → `['Parameters', 'Parameters<T>']`.
  - ts-adv-13 · order · d2 — Order how TS evaluates `T extends U ? X : Y` when `T` is a naked union: split `T` into members → check each member against `U` → pick `X` or `Y` per member → union the results.
  - ts-adv-14 · mcq · d3 ★ — A 60-line recursive type makes the editor lag and nobody can read its errors. The senior call: simplify it (a looser type plus runtime validation at the boundary) and add `expectTypeOf` tests for what remains.

---

### 6.3 React track brief (`react`)

**Files:** `content/questions/react.js`, `content/modules/react.js`.
**Totals:** 70 → **144** (+74): 44 in existing modules, plus 30 in the new modules (`react-data` 14, `react-server` 16).
**Stage placement:** stage 3 becomes `react-render, react-state, react-effects, react-data, react-perf, react-app, react-server`.
**Default `lang` is `tsx`.** Snippets are TSX function components; add types only where they matter.
**Avoid duplicating:** batching (react-state-1/12), `&&` zero (react-render-2), index keys (react-render-3), key reset (react-render-12), the fetch race (react-effects-4), React Query value (react-effects-12), `useTransition` basics (react-perf-10), RSC definition (react-app-4), compiler (react-perf-14).

#### react-render (prefix `react-render-`, next id 15) · 14 → 22 · d3 ≥ 5 · new `ask` ≥ 2
Primer additions: "React 19 odds and ends (`ref` as a prop, `useId`)", "Portals", "What renders nothing", "Never define components inside components", "Children as props".
- react-render-15 · mcq · d2 — React 19: function components receive `ref` as a normal prop, so `forwardRef` is no longer needed for new code.
- react-render-16 · output · d3 ★ — `function Parent() { const [n, setN] = useState(0); function Field() { const [text, setText] = useState(''); return <input value={text} onChange={(e) => setText(e.target.value)} />; } return <><Field /><button onClick={() => setN(n + 1)}>+</button></>; }`: after typing "abc" and clicking +, the input is empty (a new component type on every render, so it remounts).
- react-render-17 · multi · d2 — Which render **nothing** in JSX? (Select all) `null` ✔, `false` ✔, `0` ✘ (renders "0"), `true` ✔, `NaN` ✘, `undefined` ✔.
- react-render-18 · mcq · d2 — What `createPortal` is for (modals and tooltips escaping `overflow: hidden` / z-index), and that events still bubble through the **React** tree.
- react-render-19 · boolean · d2 — "Mutating a prop object in place (`props.user.name = 'x'`) makes the component re-render." → false.
- react-render-20 · short · d2 — "Which hook generates a stable, SSR-safe unique id for pairing a `<label>` with an input? (Type the hook.)" → `['useId', 'useId()']`.
- react-render-21 · order · d2 — Order one update: `setState` called (trigger) → React calls the components (render) → React applies DOM changes (commit) → browser paints → `useEffect` callbacks run.
- react-render-22 · mcq · d3 ★ — Why `<Layout><ExpensiveChart /></Layout>` does **not** re-render `ExpensiveChart` when `Layout`'s own state changes: the element was created by the parent and passed as `children`, so it is referentially the same.

#### react-state (prefix `react-state-`, next id 15) · 14 → 24 · d3 ≥ 6 · new `ask` ≥ 2
Primer additions: "Stale closures", "useState does not merge", "Uncontrolled forms and FormData", "Reducers as event logs", "When context + reducer stops scaling", "Immer".
- react-state-15 · output · d3 ★ — `useEffect(() => { const id = setInterval(() => setCount(count + 1), 1000); return () => clearInterval(id); }, []);`: the counter goes to 1 and stays there (stale closure). Fix it with `setCount((c) => c + 1)`.
- react-state-16 · mcq · d2 — When an uncontrolled form read with `new FormData(e.currentTarget)` on submit is the better choice (simple forms, fewer renders; idiomatic with React 19 actions).
- react-state-17 · multi · d2 — Which **mutate** existing state? (Select all) `items.push(x)` ✔, `[...items, x]` ✘, `items.sort()` ✔, `items.toSorted()` ✘, `{ ...user, name }` ✘, `user.name = name` ✔.
- react-state-18 · output · d2 — `const [user, setUser] = useState({ name: 'A', email: 'a@x' }); setUser({ name: 'B' });` → email is gone. `useState` replaces rather than merges (unlike class `setState`).
- react-state-19 · mcq · d2 — Designing reducer actions as events (`{ type: 'field_changed', field, value }`) and why reducers must be pure.
- react-state-20 · mcq · d3 — Context + `useReducer` as a store works until many components subscribe to slices of it; then reach for Zustand or Redux Toolkit (selectors) or split contexts.
- react-state-21 · boolean · d2 ★ — "`const [value, setValue] = useState(props.initialValue)` keeps `value` in sync when the prop changes." → false (it is only the initial value; use a `key` or derive).
- react-state-22 · short · d2 — "Which hook holds a mutable value that persists across renders **without** triggering a re-render when it changes? (Type the hook.)" → `['useRef', 'useRef()']`.
- react-state-23 · order · d2 — Order lifting state: find the closest common parent → move the state there → pass the value down as props → pass an update callback down.
- react-state-24 · mcq · d3 — What Immer (`produce` / `useImmer`) does: you write "mutating" code against a draft and get a new immutable object with structural sharing.

#### react-effects (prefix `react-effects-`, next id 15) · 14 → 24 · d3 ≥ 7 · new `ask` ≥ 3
Primer additions: "StrictMode's mount–unmount–mount in practice", "Cancelling with AbortController", "Effect events (`useEffectEvent`)", "Subscribing to external stores", "Effect chains", "Why production apps do not fetch in effects".
- react-effects-15 · output · d2 — In dev StrictMode, `useEffect(() => { console.log('connect'); return () => console.log('disconnect'); }, [])` logs `connect`, `disconnect`, `connect`.
- react-effects-16 · mcq · d2 ★ — Cancelling a fetch in an effect: create an `AbortController`, pass its signal, `abort()` in cleanup, and ignore `AbortError`.
- react-effects-17 · mcq · d3 — Reading the latest `theme` inside a chat-connection effect without reconnecting when the theme changes: `useEffectEvent` (stable in React 19.2; verify), not dropping the dependency.
- react-effects-18 · multi · d2 — Which belong in an **event handler** rather than an effect? (Select all) the POST when "Save" is clicked ✔; an analytics event for a button click ✔; resetting form fields after a successful submit ✔; subscribing to `window` resize ✘; syncing a chart library to props ✘.
- react-effects-19 · mcq · d3 — Reading `navigator.onLine` with change events: `useSyncExternalStore(subscribe, getSnapshot)`. Why it beats `useEffect` + `useState` (no tearing, SSR snapshot).
- react-effects-20 · boolean · d2 — "`useEffect` runs before the browser paints." → false (usually after; `useLayoutEffect` runs before paint).
- react-effects-21 · short · d2 — "Which hook runs synchronously after DOM mutations but before the browser paints? (Type the hook.)" → `['useLayoutEffect', 'useLayoutEffect()']`.
- react-effects-22 · mcq · d2 — An effect sets state that triggers another effect that sets more state. The fix: compute the value during render, or do both updates in the event handler.
- react-effects-23 · order · d2 — `userId` changes from 1 to 2 on a component with `useEffect(subscribe, [userId])`. Order: render with 2 → commit to the DOM → cleanup for userId 1 runs → effect for userId 2 runs.
- react-effects-24 · mcq · d3 ★ — "What is wrong with fetching in `useEffect` in a production app?" No cache or dedupe, request waterfalls, race handling by hand, no SSR/streaming. Use a data library or a framework loader.

#### react-data — NEW (prefix `react-data-`, ids 1–14) · 14 · d3 ≥ 4 · `ask` ≥ 3
- **Title:** Server state, mutations and forms
- **Blurb:** Treat server data as a cache: query keys, staleness, invalidation, optimistic updates, and forms validated with a shared schema.
- **estMinutes:** 30
- **Objectives:**
  1. Explain why server state is a cache and not app state
  2. Choose query keys and `staleTime` so data is fresh without refetch storms
  3. Write a mutation with invalidation and a safe optimistic update
  4. Build a form with schema validation shared with the API, and show server errors on the right field
- **Primer outline:**
  1. Server state vs client state (owned remotely, can go stale, shared between screens).
  2. Query keys and the cache (keys include every parameter, dedupe, `staleTime` vs `gcTime`, refetch on mount/focus/reconnect).
  3. Loading and error states (`isPending` vs `isFetching`, `placeholderData: keepPreviousData` for pagination, Suspense mode).
  4. Mutations (`useMutation`, `invalidateQueries`, `setQueryData`, `onSettled`).
  5. Optimistic updates (cancel → snapshot → set → rollback → invalidate; React 19 `useOptimistic` as the lightweight alternative).
  6. Pagination, infinite queries and prefetching (`useInfiniteQuery` + cursors, prefetch on hover, route loaders to avoid waterfalls).
  7. Forms (react-hook-form's uncontrolled registration, a zod schema shared with the server, field vs form errors, mapping a 422 to fields, preventing double submit).
  8. Choosing tools: TanStack Query, SWR, RTK Query, framework loaders, plain fetch.
- **Questions:**
  - react-data-1 · mcq · d2 ★ — Why server data should not live in Redux/useState "like everything else": it is a cache of someone else's data. It can go stale, needs refetching and dedupe, and is shared across screens.
  - react-data-2 · mcq · d2 — The right query key for a filtered, paginated list: `['orders', { status, page }]` (every input that changes the result is in the key).
  - react-data-3 · output · d2 — With the default `staleTime: 0`, you leave the orders page and come back 10 seconds later: cached data shows instantly **and** a background refetch runs.
  - react-data-4 · mcq · d3 — `staleTime` vs `gcTime`: how long data counts as fresh vs how long an unused cache entry is kept. Setting `staleTime` stops refetch storms.
  - react-data-5 · multi · d2 — After a `createOrder` mutation succeeds, which are reasonable? (Select all) `invalidateQueries({ queryKey: ['orders'] })` ✔; `setQueryData(['order', id], created)` ✔; `window.location.reload()` ✘; refetching every query in the app ✘.
  - react-data-6 · order · d3 ★ — Order an optimistic update with TanStack Query: cancel in-flight queries for the key → snapshot the previous data → write the optimistic data → on error, restore the snapshot → on settled, invalidate.
  - react-data-7 · mcq · d2 — The paginated table flashes a spinner on every page change. Fix: `placeholderData: keepPreviousData`.
  - react-data-8 · boolean · d2 — "When two mounted components use the same query key at the same time, TanStack Query makes a single request." → true.
  - react-data-9 · mcq · d2 — Avoiding a list → detail waterfall: prefetch on hover/intent, or fetch in the route loader before render.
  - react-data-10 · mcq · d2 — Why react-hook-form registers inputs as uncontrolled: typing does not re-render the whole form.
  - react-data-11 · output · d2 — `z.object({ email: z.email() }).safeParse({ email: 'nope' })` → `{ success: false, error: … }`, and it does not throw. Contrast with `parse`. (Check the zod v4 syntax; `z.string().email()` also works.)
  - react-data-12 · mcq · d3 ★ — The API returns 422 `{ errors: { email: 'already registered' } }`. Map it to the field with `setError('email', …)` so the message appears next to the input, not as a toast.
  - react-data-13 · short · d2 — "Which QueryClient method marks matching queries stale and refetches the active ones after a mutation? (Type the method.)" → `['invalidateQueries', 'queryClient.invalidateQueries', 'invalidateQueries()']`.
  - react-data-14 · mcq · d3 — Infinite scroll: `useInfiniteQuery` with a cursor API, `getNextPageParam` returning `lastPage.nextCursor`, and `fetchNextPage` triggered by an IntersectionObserver.

#### react-perf (prefix `react-perf-`, next id 15) · 14 → 22 · d3 ≥ 6 · new `ask` ≥ 2
Primer additions: "`useDeferredValue`", "Children and memo", "What breaks memoisation", "Splitting context", "State colocation".
- react-perf-15 · mcq · d2 — Filtering a 5,000-row list as the user types: `const deferred = useDeferredValue(query)` keeps the input responsive while the list catches up.
- react-perf-16 · output · d3 — `const Card = memo(function Card({ children }) {…}); <Card><p>hi</p></Card>` re-renders on every parent render, because `children` is a new element each time.
- react-perf-17 · multi · d2 — Which props defeat `React.memo` on a child? (Select all) an inline object `style={{ … }}` ✔; an inline arrow `onClick={() => …}` ✔; inline JSX children ✔; a string prop ✘; a `useCallback` handler with stable deps ✘.
- react-perf-18 · mcq · d2 — Finding out *why* a component rendered: the React DevTools Profiler ("Why did this render?", highlight updates).
- react-perf-19 · boolean · d2 — "Splitting one context into a state context and a dispatch context can stop components that only dispatch from re-rendering." → true.
- react-perf-20 · short · d2 — "Which hook returns `[isPending, startTransition]`? (Type the hook.)" → `['useTransition', 'useTransition()']`.
- react-perf-21 · order · d2 — Order fixing a slow screen: record a profile → identify the component doing the most work → reduce the work (move state down, memo, virtualise) → profile again to confirm.
- react-perf-22 · mcq · d3 ★ — Typing in a search box lags because its state lives in the page component that also renders a big table. The fix, before any memo: move the input's state down (colocation).

#### react-app (prefix `react-app-`, next id 15) · 14 → 22 · d3 ≥ 6 · new `ask` ≥ 2
Primer additions: "Resetting error boundaries", "Env vars in Vite are public", "Mocking the network with MSW", "Route params are strings", "Token refresh in a SPA".
- react-app-15 · mcq · d2 — An error boundary shows the fallback forever after navigating. Fix: reset it with a `key` (route path) or a `resetKeys`-style API. Remember boundaries miss event-handler and async errors.
- react-app-16 · mcq · d2 — `import.meta.env.VITE_API_KEY` ends up in the shipped bundle. Anything with the `VITE_` prefix is public.
- react-app-17 · multi · d2 — What MSW gives a component test? (Select all) your real fetch/data-hook code runs ✔; the same handlers can mock the API in dev ✔; no mocking of your own modules ✔; it tests the real backend ✘.
- react-app-18 · output · d2 — `const { id } = useParams(); const order = orders.find((o) => o.id === id);` with numeric ids → `undefined` (route params are strings).
- react-app-19 · mcq · d2 — A client-side "protected route" redirect is UX only. The API must enforce authorisation on every request.
- react-app-20 · boolean · d2 — "Wrapping every component in `React.lazy` is a good default for performance." → false (split at routes and heavy widgets).
- react-app-21 · order · d2 — Order building a CRUD list feature: API client and types → data hook (query) → presentational components → screen wiring with loading/error/empty states → tests.
- react-app-22 · mcq · d3 ★ — Access token expiry in a SPA: an httpOnly refresh cookie, an interceptor that retries once after a 401, and a **single-flight** refresh so ten parallel requests trigger one refresh.

#### react-server — NEW (prefix `react-server-`, ids 1–16) · 16 · d3 ≥ 6 · `ask` ≥ 4
- **Title:** Modern React: Suspense, actions and Server Components
- **Blurb:** React 19's async model: Suspense and `use`, transitions, actions and optimistic UI, and where Server Components change the architecture.
- **estMinutes:** 35
- **Objectives:**
  1. Explain what Suspense waits for and where to place boundaries
  2. Keep input responsive with transitions and `useDeferredValue`
  3. Build a form with actions, `useActionState` and `useOptimistic`
  4. Explain Server vs Client Components, `'use client'`, and what causes hydration errors
- **Primer outline:**
  1. The async UI problem (spinner soup, waterfalls, tearing).
  2. Suspense (boundaries and fallbacks, nesting, pairing with error boundaries, `lazy`, which data sources support it).
  3. `use()` (reading a promise or a context; the promise must be cached or created outside render).
  4. Transitions (`useTransition`, `startTransition`, `isPending`, `useDeferredValue`, what "interruptible" means).
  5. Actions (`<form action={fn}>`, async transitions, `useActionState`, `useFormStatus`, `useOptimistic`).
  6. Server Components (server-only, async, no state or effects, zero client JS, the `'use client'` boundary, serialisable props).
  7. Server Functions (`'use server'`: each one is a public HTTP endpoint, so authenticate and validate).
  8. SSR, streaming and hydration (streaming the shell, hydration mismatches from `Date.now`, `window` checks and locale; `suppressHydrationWarning` sparingly).
  9. When not to (a Vite SPA plus an API is still a fine architecture; `<Activity>` in 19.2 briefly).
- **Questions:**
  - react-server-1 · mcq · d2 — What `<Suspense fallback={…}>` does: shows the fallback while any child is suspended (lazy code or Suspense-enabled data).
  - react-server-2 · output · d2 — `<Suspense fallback={<PageSkeleton/>}><Header/><Suspense fallback={<Spinner/>}><Comments/></Suspense></Suspense>`: only `Comments` suspends, so the Header shows with a Spinner where Comments will go.
  - react-server-3 · mcq · d3 ★ — `const user = use(fetchUser(id));` inside the component body: every render creates a new promise, so it suspends forever or refetches in a loop. The promise must come from a cache or a parent/server.
  - react-server-4 · mcq · d2 — A tab switch that renders a slow tab: wrap `setTab` in `startTransition` so the old tab stays interactive, and show `isPending`.
  - react-server-5 · output · d3 — Heavy list filtered by `useDeferredValue(query)`: while typing fast, the input updates on every keystroke and the list shows the previous results until it catches up.
  - react-server-6 · mcq · d2 — `<form action={saveOrder}>`: the function receives a `FormData`, runs in a transition, and the form resets after success (uncontrolled fields).
  - react-server-7 · mcq · d2 — What `useActionState(action, initial)` returns: `[state, formAction, isPending]`, where `state` is the action's last return value (e.g. validation errors).
  - react-server-8 · order · d2 — Order `useOptimistic`: the user submits → the optimistic item renders immediately → the action runs on the server → real state updates with the saved item → the optimistic value is dropped (it reverts if the action failed).
  - react-server-9 · multi · d2 — What can a **Server Component** do? (Select all) `await db.query(…)` directly ✔; read secrets from env ✔; add zero JS to the client bundle ✔; use `useState` ✘; attach `onClick` ✘.
  - react-server-10 · boolean · d2 ★ — "`'use client'` means the component only renders in the browser." → false (Client Components are still server-rendered to HTML; the directive marks the boundary where the client bundle begins).
  - react-server-11 · mcq · d3 — Passing `onSelect={(id) => …}` from a Server Component to a Client Component fails, because props crossing the boundary must be serialisable (Server Functions are the exception).
  - react-server-12 · mcq · d3 ★ — A `'use server'` function `deleteOrder(id)` is called from a button. What must it do? Authenticate the caller, authorise ownership, and validate `id`: it is a public POST endpoint.
  - react-server-13 · output · d2 — `<p>Rendered at {new Date().toLocaleTimeString()}</p>` in an SSR'd component: a hydration mismatch warning, and the client re-renders that part. Fix: render time-dependent values on the client only (after mount) or pass them from the server.
  - react-server-14 · short · d2 — "Which directive marks a module's exported async functions as callable from the client? (Type the directive, without quotes.)" → `['use server', "'use server'", '"use server"']`.
  - react-server-15 · mcq · d2 — What streaming SSR buys you: the shell HTML is sent immediately, suspended parts stream in as they resolve, and TTFB/LCP improve.
  - react-server-16 · mcq · d3 ★ — "Would you use Server Components for an internal CRUD admin panel?" The strong answer names trade-offs: framework coupling (Next.js), hosting a Node server, team familiarity, vs a Vite SPA + existing API. It depends, and you say on what.

---

### 6.4 Node & Express track brief (`node`)

**Files:** `content/questions/node.js`, `content/modules/node.js`.
**Totals:** 42 → **102** (+60): 32 in existing modules, plus `node-data` (14, stage 5) and `node-jobs` (14, stage 9).
**Stage placement:** stage 4 keeps `node-runtime, node-express, node-auth` (with the web modules). **`node-data` goes last in stage 5** (after `data-queries`). **`node-jobs` goes in stage 9.**
**Default `lang` is `js`.** Use `'sql'` for SQL and `'bash'` for commands.
**Avoid duplicating:** `setImmediate` vs `setTimeout` (node-runtime-7), SIGTERM (node-runtime-10), Express 4 async rejection (node-express-4), headers-sent (node-express-8), trust proxy (node-express-12), 401 vs 403 (node-auth-1), localStorage tokens (node-auth-6).

#### node-runtime (prefix `node-runtime-`, next id 15) · 14 → 26 · d3 ≥ 8 · new `ask` ≥ 3
Primer additions: expand "Streams" (backpressure, `pipeline`, `for await`); new sections "nextTick and the queues", "Threads, processes and cluster", "EventEmitter's error event", "Request context with AsyncLocalStorage", "Built-ins you no longer install (`--env-file`, `node:test`, `--watch`, fetch)", "Graceful shutdown, in order", "Finding a memory leak".
- node-runtime-15 · output · d3 ★ — In a **CommonJS** script (say so in the prompt): `setTimeout(() => log('timeout')); setImmediate(() => log('immediate')); Promise.resolve().then(() => log('promise')); process.nextTick(() => log('tick')); log('sync');` → `sync, tick, promise`, then `timeout` and `immediate` **in either order**. The choices must include that nondeterminism. In the `why`, note that in an ES module the top level already runs inside a promise job, so `promise` logs **before** `tick`. Verify this on Node 22/24 before writing.
- node-runtime-16 · mcq · d2 — `writable.write(chunk)` returns `false`: stop writing and wait for `'drain'`. That is backpressure.
- node-runtime-17 · mcq · d2 — Why `await pipeline(src, transform, dest)` from `node:stream/promises` beats `.pipe()`: it propagates errors from any stage and destroys every stream on failure.
- node-runtime-18 · mcq · d3 — A CSV import: `await pipeline(createReadStream(file), parse(), toRows, insertBatch)`. The transform throws on row 50,000: the pipeline rejects, all streams are destroyed, and rows inserted so far stay unless batches are transactional. Design for it.
- node-runtime-19 · mcq · d2 — `worker_threads` vs `child_process` vs `cluster`: CPU work in the same process vs running another program vs multiple processes sharing a port.
- node-runtime-20 · mcq · d2 — An EventEmitter emits `'error'` with no listener: the error is thrown and, uncaught, crashes the process.
- node-runtime-21 · multi · d2 — Which **block** the event loop? (Select all) `JSON.parse` of a 50 MB string ✔; `bcrypt.hashSync` ✔; a regex with catastrophic backtracking on user input ✔; `await pool.query(…)` ✘; `crypto.pbkdf2` with a callback ✘.
- node-runtime-22 · mcq · d3 ★ — Getting the request id into every log line without passing it through every function: `AsyncLocalStorage`, entered in a middleware.
- node-runtime-23 · boolean · d2 — "Node 20+ can load a `.env` file without the `dotenv` package." → true (`--env-file`; `process.loadEnvFile()` in newer versions).
- node-runtime-24 · short · d2 — "What is the import specifier of Node's built-in test runner? (Type it.)" → `['node:test']`.
- node-runtime-25 · order · d2 — Order graceful shutdown on SIGTERM: stop accepting new connections (`server.close()`) → let in-flight requests finish (with a deadline) → close the DB pool and other clients → exit with code 0.
- node-runtime-26 · mcq · d3 ★ — Memory grows about 50 MB/hour until the container is killed. The method: take and diff two heap snapshots. Usual suspects: an unbounded module-level Map cache, listeners added per request, retained closures.

#### node-express (prefix `node-express-`, next id 15) · 14 → 24 · d3 ≥ 6 · new `ask` ≥ 2
Primer additions: "Express 5 changes", "Route order", "Validation middleware with a schema", "Security middleware", "Uploads", "Structured logging".
- node-express-15 · mcq · d2 ★ — In Express 5, an `async` handler that rejects is forwarded to the error middleware automatically (contrast with node-express-4 for Express 4).
- node-express-16 · output · d2 — `app.use(requireAuth); app.get('/health', (req, res) => res.send('ok'));` → `/health` returns 401 to the load balancer. Fix: register `/health` before the auth middleware, or scope the middleware.
- node-express-17 · mcq · d2 — A `validate(schema)` middleware using zod `safeParse` on `req.body`, which returns 400 (or 422) with field errors and never reaches the handler on failure.
- node-express-18 · multi · d2 — What does `helmet()` set by default? (Select all) a Content-Security-Policy ✔; `X-Content-Type-Options: nosniff` ✔; `Strict-Transport-Security` ✔; CORS headers ✘; rate limiting ✘.
- node-express-19 · mcq · d2 — Handling a 200 MB video upload: stream it to object storage (or use multer disk storage), set size limits, and never use `memoryStorage` for big files.
- node-express-20 · output · d3 ★ — `app.get('/users/:id', getUser); app.get('/users/me', getMe);` → `GET /users/me` runs `getUser` with `id = 'me'`. Route order matters.
- node-express-21 · boolean · d2 — "`express.json()` with no options accepts request bodies of any size." → false (the default limit is about 100 kb; a larger body gets 413).
- node-express-22 · short · d1 — "What status does Express send when no route or middleware handles a request? (Type the number.)" → `['404']`.
- node-express-23 · order · d2 — Order the layers a request passes through in a well-structured Express app: global middleware (logging, parsing) → auth middleware → router + validation → controller/handler → service → repository.
- node-express-24 · mcq · d3 — Why pino with a request id (JSON, levels, one line per event) instead of `console.log` in production: searchable, cheap, and correlatable.

#### node-auth (prefix `node-auth-`, next id 15) · 14 → 24 · d3 ≥ 7 · new `ask` ≥ 3
Primer additions: "Password reset done right", "Verifying JWTs properly", "Logging out with JWTs", "Refresh-token rotation", "OAuth code + PKCE", "MFA, TOTP and passkeys", "Timing-safe comparison", "Sessions across instances".
- node-auth-15 · mcq · d2 ★ — A password reset: a random single-use token, **stored hashed**, expiring in about 30 minutes, with the same response whether or not the email exists.
- node-auth-16 · multi · d3 ★ — When verifying a JWT, what must you check? (Select all) signature with a **pinned** algorithm ✔; `exp` ✔; `iss` ✔; `aud` ✔; that `jwt.decode` succeeded ✘.
- node-auth-17 · mcq · d2 — Logging out with stateless JWTs: short-lived access tokens plus revocable refresh tokens (or a denylist of `jti` values until expiry).
- node-auth-18 · mcq · d3 — Refresh-token rotation with reuse detection: each refresh issues a new token and invalidates the old one. Reuse of an old token signals theft, so revoke the whole family.
- node-auth-19 · mcq · d2 — Which OAuth flow a SPA should use today: authorization code + PKCE (implicit is deprecated). Better still, a BFF keeps tokens off the browser.
- node-auth-20 · order · d3 — Order authorization code + PKCE: generate `code_verifier` and `code_challenge` → redirect to the authorize endpoint with the challenge → the user authenticates and consents → the IdP redirects back with a `code` → exchange `code` + `code_verifier` for tokens.
- node-auth-21 · boolean · d3 ★ — "Comparing a submitted API key with `===` is fine security-wise." → false (timing side channel; use `crypto.timingSafeEqual` on equal-length buffers, or compare hashes).
- node-auth-22 · short · d2 — "What standard do authenticator apps' 6-digit rotating codes use? (Type the acronym.)" → `['TOTP']`.
- node-auth-23 · mcq · d2 — Why passkeys (WebAuthn) resist phishing: the credential is bound to the origin, and no shared secret is typed anywhere.
- node-auth-24 · mcq · d2 — Sessions with three API instances behind a load balancer: store sessions in Redis/the DB rather than memory. Sticky sessions are a fragile alternative.

#### node-data — NEW, stage 5 (prefix `node-data-`, ids 1–14) · 14 · d3 ≥ 4 · `ask` ≥ 3
- **Title:** Talking to the database from Node
- **Blurb:** Drivers, pools, parameterised queries, transactions in code, and choosing between raw SQL, a query builder and an ORM.
- **estMinutes:** 30
- **Objectives:**
  1. Configure a connection pool and say what happens when it runs dry
  2. Write parameterised queries and transactions that always release their connection
  3. Compare raw SQL, query builders and ORMs (Prisma, Drizzle, Knex) honestly
  4. Run migrations as part of the deploy, not by hand
- **Primer outline:**
  1. Drivers (`pg`, `mysql2`, `better-sqlite3`; `Pool` vs `Client`).
  2. Pools (size vs the server's `max_connections`, acquisition timeouts, many instances × pool size, serverless connection storms, PgBouncer).
  3. Parameterised queries (`$1` placeholders; identifiers cannot be parameters, so allowlist sort columns; tagged-template `sql` helpers).
  4. Transactions in code (`BEGIN`/`COMMIT`/`ROLLBACK` on **one checked-out client**; `try/catch/finally release()`; a `withTransaction` helper).
  5. Mapping rows (snake_case → camelCase; pg returns `bigint`/`numeric` as strings; `timestamptz` → `Date` in UTC).
  6. Query builders and ORMs (Knex/Kysely vs Drizzle vs Prisma: types, generated SQL, escape hatches, N+1).
  7. Migrations and seeding (tooling, forward-only, run in the pipeline, never edit an applied migration).
  8. Testing against a real database (Testcontainers, a transaction per test, factories).
- **Questions:**
  - node-data-1 · mcq · d2 — Why use a pool instead of opening a connection per request: connection setup cost (TLS, auth) and the server's connection limit.
  - node-data-2 · output · d3 ★ — `await pool.query('BEGIN'); await pool.query(insertOrder); await pool.query(insertItems); await pool.query('COMMIT');` → not a transaction: each `pool.query` may run on a different connection. Check out a client with `pool.connect()`.
  - node-data-3 · mcq · d2 — A handler calls `pool.connect()` but only calls `release()` on the success path. After a few errors every request hangs, because the pool is exhausted.
  - node-data-4 · output · d2 — `const { rows } = await pool.query('SELECT COUNT(*) FROM users'); console.log(typeof rows[0].count);` → `'string'` (pg returns bigint as a string to avoid precision loss).
  - node-data-5 · mcq · d2 ★ — `ORDER BY ${req.query.sort}` needs a dynamic column. Values are parameterised with `$1`; identifiers are checked against an allowlist.
  - node-data-6 · multi · d2 — Honest statements about ORMs? (Select all) faster CRUD with typed results ✔; can hide N+1 behind property access ✔; may generate poor SQL for complex reports ✔; remove the need to understand SQL ✘; make SQL injection impossible even with raw-query escape hatches ✘.
  - node-data-7 · mcq · d2 — Prisma vs Drizzle vs Knex in one line each: schema-first generated client vs SQL-shaped TypeScript builder with inferred types vs untyped query builder.
  - node-data-8 · boolean · d2 — "Editing a migration file that has already run in production is fine as long as you re-run it." → false.
  - node-data-9 · order · d2 — Order a `withTransaction(fn)` helper: `pool.connect()` → `BEGIN` → `await fn(client)` → `COMMIT` → (on error: `ROLLBACK` and rethrow) → `client.release()` in `finally`.
  - node-data-10 · mcq · d3 ★ — 20 container instances × pool size 20 against Postgres `max_connections = 100` gives connection errors under load. Fix: smaller pools and/or PgBouncer.
  - node-data-11 · short · d1 — "In node-postgres, what placeholder refers to the first query parameter? (Type it.)" → `['$1']`.
  - node-data-12 · mcq · d2 — A `timestamptz` column comes back as a JS `Date` representing the UTC instant. Format it for display on the client, and never store local-time strings.
  - node-data-13 · mcq · d3 — Integration tests for the repository layer: run the real engine in Testcontainers rather than SQLite or mocked queries, because dialect and constraint behaviour differ.
  - node-data-14 · mcq · d2 — When raw SQL is right in an ORM codebase (reports, window functions, bulk updates), and doing it safely with the ORM's tagged-template raw API.

#### node-jobs — NEW, stage 9 (prefix `node-jobs-`, ids 1–14) · 14 · d3 ≥ 6 · `ask` ≥ 4
- **Title:** Background jobs, queues and resilience
- **Blurb:** Work off the request path, retries that are safe, idempotent consumers, the outbox, and timeouts and breakers around flaky dependencies.
- **estMinutes:** 30
- **Objectives:**
  1. Decide what runs in the request and what goes to a queue
  2. Make a job safe to retry with idempotency and at-least-once delivery
  3. Explain the dual-write problem and how the outbox pattern solves it
  4. Put timeouts, retries with backoff and a circuit breaker around a flaky dependency
- **Primer outline:**
  1. Why queues (user latency, absorbing spikes, retries, isolating slow dependencies).
  2. Tools (BullMQ on Redis, SQS, RabbitMQ, Postgres `FOR UPDATE SKIP LOCKED` as a queue; scheduled/repeatable jobs vs cron).
  3. Delivery semantics (at-most-once, at-least-once, the "exactly-once" myth; idempotent consumers with a processed-ids table or natural keys).
  4. Retries (exponential backoff + jitter, max attempts, dead-letter queue, poison messages, what not to retry).
  5. The dual-write problem and the transactional outbox (CDC as the heavier alternative).
  6. Timeouts and cancellation (every outbound call gets a timeout; deadline propagation; `AbortSignal.timeout`).
  7. Circuit breakers, bulkheads and fallbacks (states, where they live, degrading gracefully).
  8. Operating queues (depth and oldest-message age, visibility timeouts, graceful worker shutdown, overlapping scheduled runs).
- **Questions:**
  - node-jobs-1 · mcq · d2 — Which work belongs in a queue: sending the welcome email and generating a PDF invoice after signup/checkout, not validating the request.
  - node-jobs-2 · mcq · d2 ★ — Why design for at-least-once delivery plus idempotent consumers instead of trusting "exactly-once".
  - node-jobs-3 · output · d3 ★ — The worker charges the card, then crashes before acking. What happens next: the message is redelivered and the card is charged twice, unless the charge uses an idempotency key derived from the order id.
  - node-jobs-4 · order · d3 — Order the transactional outbox: BEGIN → insert the order **and** an outbox row → COMMIT → a relay reads unsent outbox rows → publishes to the broker → marks them sent.
  - node-jobs-5 · mcq · d3 ★ — `await db.saveOrder(o); await queue.publish('order.created', o);` The process dies between the two lines. What is this called (the dual-write problem), and what fixes it (the outbox)?
  - node-jobs-6 · multi · d2 — A good retry policy? (Select all) exponential backoff ✔; jitter ✔; a max-attempts limit and then a dead-letter queue ✔; retrying 400 validation errors ✘; immediate retries in a tight loop ✘.
  - node-jobs-7 · mcq · d2 — What a dead-letter queue is for: parking messages that keep failing so they do not block the queue, while alerting a human.
  - node-jobs-8 · mcq · d2 — Circuit breaker states: closed (normal) → open (fail fast) → half-open (let a trial request through).
  - node-jobs-9 · boolean · d2 — "Adding retries to calls that have no timeout makes a service more resilient." → false (requests pile up; retries amplify load during an outage).
  - node-jobs-10 · short · d2 — "What Postgres locking clause lets several workers each claim different pending jobs without blocking each other? (Type the two words after FOR UPDATE.)" → `['SKIP LOCKED', 'FOR UPDATE SKIP LOCKED']`.
  - node-jobs-11 · mcq · d2 — Which metric shows the queue is falling behind: the age of the oldest message and the growth in depth, not the worker's CPU.
  - node-jobs-12 · mcq · d3 — A cron-style job in the API process sends the daily digest three times after scaling to three instances. Fix: one scheduler (a repeatable queue job) or a distributed lock.
  - node-jobs-13 · output · d2 — `await Promise.race([fetch(url), sleep(2000).then(() => { throw new Error('timeout'); })])`: the caller gets a timeout, but the request **keeps running** and holds the socket. Use `fetch(url, { signal: AbortSignal.timeout(2000) })`.
  - node-jobs-14 · mcq · d3 ★ — "The payment provider slows to 30 s per call and your API falls over. What do you change?" Timeouts, a circuit breaker, moving the call to a queue with status polling, a bulkhead (a separate pool/concurrency limit).

---

### 6.5 HTTP & the Web track brief (`web`)

**Files:** `content/questions/web.js`, `content/modules/web.js`.
**Totals:** 42 → **100** (+58): 30 in existing modules, plus `web-a11y` (14, stage 2) and `web-perf` (14, stage 9).
**Stage placement:** stage 2 ends `…, web-browser, web-a11y`; stage 4 keeps `web-http, web-api-design`; **`web-perf` opens stage 9.**
**Default `lang` is `js`.** For raw HTTP messages use `lang: 'bash'` (or `'text'`), and write them as real HTTP (`HTTP/1.1 304 Not Modified\nETag: "v7"`).
**Avoid duplicating:** `no-cache` meaning (web-http-6), ETag basics (web-http-7), 201 + Location (web-http-8), 302 vs 307 (web-http-9), 429 (web-http-11), preflight (web-browser-11), CORS with cookies (web-browser-12), idempotency keys (web-api-9), offset vs cursor (web-api-2).

#### web-browser (prefix `web-browser-`, next id 15) · 14 → 22 · d3 ≥ 5 · new `ask` ≥ 2
Primer additions: "Core Web Vitals", "Service workers", "Client storage beyond localStorage", "URL and URLSearchParams", "fetch and credentials", "Workers", "The rendering pipeline". Also a pointer to *Accessibility and semantic HTML*.
- web-browser-15 · mcq · d2 ★ — Core Web Vitals: LCP (loading), INP (responsiveness; replaced FID in 2024), CLS (visual stability). Match each to what it measures.
- web-browser-16 · multi · d2 — What causes layout shift (CLS)? (Select all) images without `width`/`height` ✔; a cookie banner injected above content ✔; web fonts swapping with different metrics ✔; `transform` animations ✘.
- web-browser-17 · mcq · d2 — What a service worker can do (intercept requests, cache for offline, push) and its classic gotcha: users stay on the old version until every tab closes, unless you handle updates.
- web-browser-18 · output · d2 — `new URLSearchParams({ q: 'a b', tag: 'x&y' }).toString()` → `q=a+b&tag=x%26y`. Why you never build query strings by concatenation.
- web-browser-19 · mcq · d2 — Offline drafts of a long form with attachments: IndexedDB (async, structured, large) rather than localStorage (sync, strings only, about 5 MB).
- web-browser-20 · boolean · d2 — "`fetch('https://api.other.com/me')` sends the user's cookies for api.other.com by default." → false (the default `credentials` is `'same-origin'`).
- web-browser-21 · short · d2 — "Which browser API runs CPU-heavy JavaScript off the main thread? (Two words.)" → `['Web Worker', 'Web Workers', 'worker', 'workers', 'dedicated worker']`.
- web-browser-22 · order · d3 — Order the pixel pipeline after a DOM change: style recalculation → layout → paint → composite.

#### web-a11y — NEW, stage 2 (prefix `web-a11y-`, ids 1–14) · 14 · d3 ≥ 3 · `ask` ≥ 3
- **Title:** Accessibility and semantic HTML
- **Blurb:** Semantic elements, labels, keyboard and focus, ARIA used sparingly, and how to check your own pages.
- **estMinutes:** 25
- **Objectives:**
  1. Explain three concrete things a `<button>` gives you that a clickable `<div>` does not
  2. Label every form control and announce errors accessibly
  3. Manage focus in a SPA: dialogs, route changes and new content
  4. Audit a page in ten minutes with the keyboard, axe and a screen reader
- **Primer outline:**
  1. Why it matters (users, WCAG 2.2 AA as the usual bar, the European Accessibility Act since June 2025, and the fact that accessible markup is also testable markup).
  2. Semantic HTML first (landmarks, one `h1` and a heading order, `button` vs `a`, lists, real tables).
  3. Forms (`<label for>`, `fieldset`/`legend`, `required`, error text via `aria-describedby`, `aria-invalid`, focus the first error on submit).
  4. Keyboard (tab order follows the DOM, `tabindex="0"`/`"-1"` and never positive, visible focus, skip link).
  5. Focus in SPAs (dialogs: move focus in, trap, Escape, return focus; the native `<dialog>` + `showModal()`; `inert`; focus or announce on route change).
  6. ARIA (the first rule of ARIA, roles/states/properties, `aria-expanded`, `aria-live` for toasts, icon buttons with `aria-label`).
  7. Visual (contrast 4.5:1 / 3:1, never colour alone, `prefers-reduced-motion`, 200% zoom and reflow).
  8. Testing (keyboard pass, axe/Lighthouse catch roughly a third of issues, Testing Library `getByRole`, a screen-reader smoke test).
- **Questions:**
  - web-a11y-1 · multi · d1 — What does a native `<button>` give you that `<div onClick>` does not? (Select all) keyboard focus ✔; activation with Enter and Space ✔; announced as "button" ✔; `disabled` semantics ✔; automatic styling that matches the OS ✘.
  - web-a11y-2 · mcq · d2 — "Go to order details" → `<a href>`; "Delete order" → `<button>`. The rule: navigation vs action.
  - web-a11y-3 · mcq · d2 ★ — Which input is correctly labelled? `<label for="email">` + `id="email"` (or a wrapping label) vs a placeholder-only input vs a nearby `<span>` vs `title` only.
  - web-a11y-4 · mcq · d2 — The first rule of ARIA: use a native element if one exists. A `<div role="button">` also needs `tabindex="0"` and Enter/Space handlers.
  - web-a11y-5 · output · d2 — What a screen reader announces for `<button aria-label="Close dialog"><svg aria-hidden="true">…</svg></button>` → "Close dialog, button".
  - web-a11y-6 · mcq · d3 ★ — Doing an accessible modal: focus moves into it, Tab is trapped, Escape closes it, and focus returns to the trigger. `<dialog>.showModal()` gives you most of this.
  - web-a11y-7 · mcq · d2 — After a client-side route change, screen-reader users hear nothing. Fix: move focus to the new page's `h1` (or a live region announcement).
  - web-a11y-8 · boolean · d2 — "`tabindex="3"` is a good way to fix a confusing tab order." → false (fix the DOM order).
  - web-a11y-9 · mcq · d2 — A "Saved" toast that screen readers should announce without stealing focus: `role="status"` / `aria-live="polite"`.
  - web-a11y-10 · short · d2 — "What minimum contrast ratio does WCAG AA require for normal-size body text? (e.g. 3:1)" → `['4.5:1', '4.5', '4.5 to 1']`.
  - web-a11y-11 · multi · d2 — Which can an automated checker like axe reliably detect? (Select all) missing form labels ✔; insufficient colour contrast ✔; images without an `alt` attribute ✔; whether the alt text is *meaningful* ✘; a logical focus order through a wizard ✘.
  - web-a11y-12 · order · d2 — Order a quick audit, cheapest first: automated scan (axe/Lighthouse) → keyboard-only pass → 200% zoom/reflow check → screen-reader smoke test.
  - web-a11y-13 · mcq · d2 — On submit with errors: set `aria-invalid="true"`, associate the message with `aria-describedby`, and move focus to the first invalid field.
  - web-a11y-14 · mcq · d3 ★ — "How would you make a custom dropdown accessible?" Prefer a native `<select>`. Otherwise follow the WAI-ARIA combobox/listbox pattern (roles, `aria-expanded`, arrow keys, `aria-activedescendant`) or use a vetted headless library, and test it with a keyboard and a screen reader.

#### web-http (prefix `web-http-`, next id 15) · 14 → 26 · d3 ≥ 6 · new `ask` ≥ 3
Primer additions: expand "Caching" (conditional requests, `max-age` vs `s-maxage`, `private`/`public`, `immutable`, `Vary`, `stale-while-revalidate`); new sections "Conditional writes (If-Match / 412)", "Content negotiation", "301/308 vs 302/307 for non-GET", "HTTPS and HSTS", "Push to the browser: polling, SSE, WebSockets".
- web-http-15 · order · d2 — Order a conditional GET: the first response carries `ETag: "v7"` → the browser caches it → the next request sends `If-None-Match: "v7"` → the server compares → it answers `304 Not Modified` with no body.
- web-http-16 · mcq · d2 — `Cache-Control: private, max-age=60` vs `public, s-maxage=300, max-age=0`: browser-only caching vs shared (CDN) caching with a different TTL.
- web-http-17 · mcq · d3 ★ — Why hashed bundles get `public, max-age=31536000, immutable` while `index.html` gets `no-cache`: the HTML must revalidate so it points at the new hashes, and the assets never change at a given URL.
- web-http-18 · multi · d2 — Which responses must **not** be stored in a shared CDN cache as-is? (Select all) `GET /api/me` without `private` ✔; a response that sets a session cookie ✔; `/assets/app.3f9a.js` ✘; a public product list ✘.
- web-http-19 · mcq · d3 — The API echoes the request's `Origin` in `Access-Control-Allow-Origin` and sits behind a CDN. Without `Vary: Origin`, users from another allowed origin get the cached header and a CORS failure.
- web-http-20 · mcq · d2 — `stale-while-revalidate=60`: serve the stale copy immediately while fetching a fresh one in the background.
- web-http-21 · mcq · d3 ★ — Two admins edit the same product. The client sends `PUT` with `If-Match: "v7"`; the server's version is now `v8`, so it responds `412 Precondition Failed`. This is optimistic concurrency over HTTP.
- web-http-22 · mcq · d2 — 406 vs 415: the server cannot produce what `Accept` asked for vs it cannot consume the request's `Content-Type`.
- web-http-23 · output · d3 — A form POSTs to `/orders` and the server replies `HTTP/1.1 301 Moved Permanently\nLocation: /v2/orders`. What does the browser do? Historically it re-sends as **GET** without the body. Use 308 to preserve the method and body.
- web-http-24 · boolean · d2 — "With HTTPS, an on-path observer can still see the hostname you are visiting but not the path or query string." → true (SNI/DNS reveal the host).
- web-http-25 · short · d2 — "Which response header tells browsers to use only HTTPS for a domain from now on? (Type the header name.)" → `['Strict-Transport-Security', 'HSTS']`.
- web-http-26 · mcq · d2 ★ — Live "order status changed" updates on a dashboard: Server-Sent Events (one-way, auto-reconnect, plain HTTP) vs WebSockets (bidirectional) vs polling (simplest). Pick SSE and say why.

#### web-api-design (prefix `web-api-`, next id 15) · 14 → 24 · d3 ≥ 7 · new `ask` ≥ 3
Primer additions: "Problem Details (RFC 9457)", "Long-running operations", "Webhooks you send", "Webhooks you receive", "Bulk endpoints", "Breaking vs non-breaking changes", "Deprecating an endpoint", "Rate-limit algorithms".
- web-api-15 · mcq · d2 ★ — A standard error body: `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, plus extension members such as `errors`.
- web-api-16 · mcq · d3 — "Export 2 million rows as CSV": `202 Accepted` + `Location: /exports/123`; the client polls the status resource, which finally links to the file.
- web-api-17 · multi · d3 ★ — When **your** API sends webhooks, what should you do? (Select all) sign the payload with HMAC and include a timestamp ✔; retry with backoff on non-2xx ✔; include a unique event id so receivers can dedupe ✔; wait for the receiver to finish processing before returning 200 ✘; send the full customer record including secrets ✘.
- web-api-18 · mcq · d3 ★ — The Stripe-style signature check fails on every webhook. Cause: `express.json()` parsed the body first, so you are hashing re-serialised JSON rather than the **raw bytes**. Use a raw body parser on that route.
- web-api-19 · mcq · d2 — The list response is `{ items, nextCursor: "eyJpZCI6NDJ9" }`. The client sends `?cursor=eyJpZCI6NDJ9` next and must treat it as opaque.
- web-api-20 · mcq · d2 — Designing `POST /orders/bulk`: all-or-nothing in one transaction vs per-item results (a 207-style body listing each item's status). Pick based on the use case and document it.
- web-api-21 · boolean · d2 — "Adding a new **required** field to a request body is a backwards-compatible change." → false.
- web-api-22 · short · d2 — "What status code do many APIs return when a well-formed request fails validation (e.g. a missing required field)? (Type the number.)" → `['422', '400']`. **Author note:** both are accepted; the `why` explains the 400-vs-422 debate and says to pick one and be consistent.
- web-api-23 · order · d2 — Order retiring an endpoint: announce it and add `Deprecation`/`Sunset` headers → measure usage per client → contact and migrate the remaining heavy users → after the sunset date return `410 Gone`.
- web-api-24 · mcq · d3 — Which rate-limit algorithm allows short bursts while enforcing an average rate? A token bucket (vs fixed window's boundary spikes, sliding log's cost).

#### web-perf — NEW, stage 9 (prefix `web-perf-`, ids 1–14) · 14 · d3 ≥ 6 · `ask` ≥ 4
- **Title:** Performance and caching across the stack
- **Blurb:** Measure first, then fix: percentiles, Core Web Vitals, bundles, CDNs, HTTP and application caches, and load tests.
- **estMinutes:** 35
- **Objectives:**
  1. Break a slow page load into network, server and client time using real tools
  2. Design a caching strategy from browser to CDN to Redis, including invalidation
  3. Explain p50/p95/p99 and why averages hide the problem
  4. Plan and interpret a load test before a launch
- **Primer outline:**
  1. Measure first (RUM vs synthetic, percentiles and histograms, the `Server-Timing` header, performance budgets).
  2. Front-end load (critical path, bundle analysis, route-level splitting, images and fonts, preload/preconnect, long tasks and INP).
  3. HTTP and CDN caching (the layers, cache keys, `Vary`, versioned URLs vs purge, `stale-while-revalidate`, never caching private data in shared caches).
  4. Application caching (cache-aside, TTLs, write-through, invalidation after commit, negative caching, what not to cache).
  5. Cache stampedes (hot-key expiry, single-flight/request coalescing, locks, early refresh, serving stale).
  6. Server latency (N+1, missing indexes, pool exhaustion, sync work on the hot path, payload size, compression).
  7. Load testing (k6-style scripts, ramping, realistic data and think time, what to watch: percentiles, errors, saturation).
  8. Capacity and tail latency (queueing intuition: latency explodes past about 70–80% utilisation; timeouts and retries amplify load).
- **Questions:**
  - web-perf-1 · mcq · d2 ★ — Why p95/p99 rather than the average: averages hide the slow tail that real users (often your heaviest users) hit.
  - web-perf-2 · order · d2 — Order a performance investigation: measure and reproduce with real data → find which tier the time goes to → form one hypothesis → change one thing → measure again.
  - web-perf-3 · mcq · d2 — The cache-aside read path: check the cache → on a miss read the DB → populate the cache with a TTL → return.
  - web-perf-4 · mcq · d3 ★ — A hot key expires and 2,000 requests hit the DB at once. Name it (stampede/dogpile) and the fixes (single-flight/request coalescing, a lock, probabilistic early refresh, serve stale while refreshing).
  - web-perf-5 · multi · d2 — What should **not** go in a shared application cache under a shared key? (Select all) per-user dashboards keyed only by route ✔; authorisation decisions without the user in the key ✔; the public product catalogue ✘; rendered, versioned static pages ✘.
  - web-perf-6 · mcq · d3 — A write updates the DB and deletes the cache key, but a concurrent read re-fills the cache with the old value between the two. Mitigations: delete after commit, short TTLs, versioned keys.
  - web-perf-7 · output · d2 — Given `Server-Timing: db;dur=820, auth;dur=15, render;dur=40` on a 900 ms response, where do you look first? The database query, then run EXPLAIN on it.
  - web-perf-8 · mcq · d2 — The bundle analyser shows one date library taking 30% of the JS. Options: a lighter library or native `Intl`, a per-function import, or lazy-loading the screen that needs it.
  - web-perf-9 · boolean · d2 — "Putting a CDN in front of a JSON API makes every endpoint faster automatically." → false (uncacheable, per-user responses still go to the origin; the CDN only helps what you mark cacheable, plus TLS termination and edge proximity).
  - web-perf-10 · mcq · d3 ★ — The DB is at 90% CPU and p99 latency has tripled while p50 barely moved. Why: queueing near saturation. Hence headroom targets and load shedding.
  - web-perf-11 · short · d2 — "Which Core Web Vital replaced First Input Delay as the responsiveness metric? (Type the acronym.)" → `['INP']`.
  - web-perf-12 · mcq · d2 — Designing a pre-launch load test: a realistic endpoint mix and data volume, ramping up, a prod-like environment, and watching p95/p99, error rate and saturation (not just RPS).
  - web-perf-13 · multi · d3 — Which make a slow `GET /orders?status=open&sort=-created` faster? (Select all) a composite index on `(status, created_at)` ✔; selecting only the needed columns ✔; keyset pagination instead of a large OFFSET ✔; a larger Node heap ✘; fetching all rows and filtering in JS ✘.
  - web-perf-14 · mcq · d3 ★ — "The page is slow — walk me through it." The senior answer: clarify which page, for whom, since when → RUM/trace to split the time → the biggest contributor first → fix → verify → guard it with a budget or alert.

---

### 6.6 SQL & Data track brief (`data`)

**Files:** `content/questions/data.js`, `content/modules/data.js`.
**Totals:** 28 → **80** (+52): 22 in existing modules, plus `data-queries` (16, stage 5) and `data-scale` (14, stage 9).
**Stage placement:** stage 5 becomes `data-sql, data-modeling, data-queries, node-data` (`node-data` belongs to the Node author); **`data-scale` goes in stage 9.**
**Default `lang` is `sql`.** Write Postgres-flavoured SQL and name SQL Server/MySQL differences in the `why` where they matter. For output questions, show a tiny table as a SQL comment or in the prompt, and make the choices literal result rows.
**Avoid duplicating:** logical clause order (data-sql-1), NOT IN + NULL (data-sql-5), latest order per customer (data-sql-8), leftmost-prefix composite index (data-model-4), optimistic concurrency basics (data-model-7), column rename (data-model-11).

#### data-sql (prefix `data-sql-`, next id 15) · 14 → 26 · d3 ≥ 6 · new `ask` ≥ 3
Primer additions: "NULL arithmetic and COALESCE", "CASE and conditional aggregation", "Join fan-out", "Self-joins", "Writing safely: UPDATE/DELETE, RETURNING", "Date ranges".
- data-sql-15 · output · d2 — `SELECT 10 - NULL AS a, COALESCE(NULL, 0) AS b;` → `a = NULL, b = 0`. Why `price - discount` goes NULL.
- data-sql-16 · mcq · d2 — Paid and refunded revenue per month in one query: `SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END)` (conditional aggregation; Postgres also has `FILTER (WHERE …)`).
- data-sql-17 · output · d3 ★ — `SELECT SUM(o.total) FROM orders o JOIN order_items i ON i.order_id = o.id;` → the total is multiplied by the number of items per order (join fan-out). Fix: aggregate before joining.
- data-sql-18 · mcq · d2 — "Each employee with their manager's name" from `employees(id, name, manager_id)`: a self-join (`LEFT JOIN employees m ON m.id = e.manager_id`).
- data-sql-19 · multi · d2 — Which queries return customers with **no** orders? (Select all) `LEFT JOIN … WHERE o.id IS NULL` ✔; `WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)` ✔; `INNER JOIN orders … WHERE o.id IS NULL` ✘; `WHERE c.id NOT IN (SELECT customer_id FROM orders)` when `customer_id` can be NULL ✘.
- data-sql-20 · output · d1 — `orders.customer_id` values `1, 1, 2`: `SELECT COUNT(*), COUNT(DISTINCT customer_id) FROM orders;` → `3, 2`.
- data-sql-21 · mcq · d2 — Running a one-off `UPDATE` in production safely: run a `SELECT` with the same `WHERE` first, wrap it in a transaction, check the row count / `RETURNING`, then commit.
- data-sql-22 · short · d2 — "Which Postgres clause makes an INSERT/UPDATE/DELETE return the affected rows? (One word.)" → `['RETURNING']`.
- data-sql-23 · order · d3 — Order the logical evaluation including window functions: FROM/JOIN → WHERE → GROUP BY → HAVING → window functions → SELECT list → ORDER BY → LIMIT.
- data-sql-24 · output · d3 ★ — `status` values: `'paid', 'cancelled', NULL`. `SELECT COUNT(*) FROM orders WHERE status <> 'cancelled';` → `1` (NULL is neither equal nor unequal). Fix: `IS DISTINCT FROM`.
- data-sql-25 · boolean · d2 — "Without an ORDER BY, rows come back in primary-key order." → false (no guaranteed order).
- data-sql-26 · mcq · d2 ★ — "All orders in January" on a `timestamptz` column: `created_at >= '2024-01-01' AND created_at < '2024-02-01'`, not `BETWEEN '2024-01-01' AND '2024-01-31'` (which drops 31 January after midnight).

#### data-modeling (prefix `data-model-`, next id 15) · 14 → 24 · d3 ≥ 5 · new `ask` ≥ 2
Primer additions: "Normal forms in plain words", "Soft delete", "Audit columns and history", "Money", "Multi-tenancy", "Indexing foreign keys", "CHECK constraints", "JSONB: when", "Status columns: enum vs lookup table", "Adding a NOT NULL column without downtime".
- data-model-15 · mcq · d2 — `products.tags = 'red,large,sale'` breaks first normal form. The fix is a `product_tags` join table (or a real array/JSONB, with the trade-offs).
- data-model-16 · mcq · d2 — Soft delete with `deleted_at`: the costs (every query must filter it, unique constraints need a partial index, GDPR erasure still needs a hard delete).
- data-model-17 · multi · d2 — Reasonable audit designs? (Select all) `created_at`/`updated_at` columns with DB defaults ✔; `created_by`/`updated_by` ✔; an append-only `audit_log` table written in the same transaction ✔; trusting client-sent timestamps ✘.
- data-model-18 · mcq · d2 — Storing money: `NUMERIC(12,2)` or integer minor units (cents) plus a currency column, never `FLOAT`/`REAL`.
- data-model-19 · mcq · d3 ★ — Multi-tenant SaaS: a shared schema with `tenant_id` on every table (composite indexes and FKs, optionally Row-Level Security) vs schema-per-tenant vs database-per-tenant. The trade-offs are isolation, ops cost, and noisy neighbours.
- data-model-20 · boolean · d2 — "Postgres automatically creates an index on a foreign-key column." → false (it indexes the referenced primary key, not the referencing column; MySQL InnoDB does create one).
- data-model-21 · short · d1 — "Which constraint type enforces a rule like `price >= 0` in the database? (One word.)" → `['CHECK', 'check constraint']`.
- data-model-22 · order · d3 — Order adding a NOT NULL `country` column with zero downtime: add the column as nullable → deploy code that writes it → backfill existing rows in batches → add the NOT NULL constraint → deploy code that relies on it.
- data-model-23 · mcq · d2 — When a JSONB column is appropriate (sparse, per-customer custom attributes that are rarely queried) and when it is not (core fields you filter, join or constrain).
- data-model-24 · mcq · d3 — `status` as a native enum vs a lookup table vs text + CHECK: how easily you can add values, attach metadata to them, and keep referential integrity.

#### data-queries — NEW, stage 5 (prefix `data-query-`, ids 1–16) · 16 · d3 ≥ 6 · `ask` ≥ 4
- **Title:** Advanced SQL: windows, CTEs and query plans
- **Blurb:** Window functions, recursive CTEs, upserts, keyset pagination, and reading EXPLAIN well enough to pick the right index.
- **estMinutes:** 35
- **Objectives:**
  1. Write ranking, running-total and previous-row queries with window functions
  2. Use CTEs, including recursive ones, to keep a complex query readable
  3. Write an idempotent upsert and a keyset-paginated query
  4. Read an EXPLAIN plan and choose a composite, covering or partial index
- **Primer outline:**
  1. Window functions (`OVER`, `PARTITION BY`, `ORDER BY`; `ROW_NUMBER` vs `RANK` vs `DENSE_RANK`; `LAG`/`LEAD`; running totals and frames).
  2. Top-N per group and de-duplication with `ROW_NUMBER` in a CTE (you cannot filter a window in `WHERE`).
  3. CTEs (readability; recursive CTEs for trees and org charts; materialisation notes).
  4. Upserts (`INSERT … ON CONFLICT … DO UPDATE` with `EXCLUDED`; `MERGE` in SQL Server/Postgres 15+).
  5. Keyset pagination in SQL (row-value comparison with a tie-breaker; the matching index).
  6. Reading EXPLAIN / EXPLAIN ANALYZE (Seq Scan, Index Scan, Index Only Scan, Bitmap Heap Scan; nested loop vs hash join; estimated vs actual rows).
  7. Index design (equality columns before range columns; covering with `INCLUDE`; partial indexes; expression indexes such as `lower(email)`; why an index is ignored).
  8. Other tools (views vs materialised views, `DISTINCT ON`, full-text search basics, JSONB operators).
- **Questions:**
  - data-query-1 · output · d2 ★ — Scores `100, 100, 90`: `ROW_NUMBER`, `RANK` and `DENSE_RANK` over `ORDER BY score DESC` → `1,2,3` / `1,1,3` / `1,1,2`.
  - data-query-2 · mcq · d2 — The top 3 products per category: `ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY revenue DESC)` in a CTE, then `WHERE rn <= 3` outside it.
  - data-query-3 · output · d2 — Daily amounts `10, 20, 5`: `SUM(amount) OVER (ORDER BY day)` → `10, 30, 35`.
  - data-query-4 · mcq · d2 — Day-over-day change in signups: `count - LAG(count) OVER (ORDER BY day)`.
  - data-query-5 · boolean · d2 — "You can use `ROW_NUMBER() OVER (…)` directly in a `WHERE` clause." → false (windows are evaluated after WHERE; wrap it in a CTE/subquery).
  - data-query-6 · mcq · d3 — Fetching a category and all its descendants from `categories(id, parent_id)`: `WITH RECURSIVE` with an anchor member and a recursive member joined on `parent_id`.
  - data-query-7 · output · d2 — `INSERT INTO users (email, name) VALUES ('a@x', 'New') ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;` when `a@x` already exists → the existing row's name becomes `New`; no new row, no error.
  - data-query-8 · mcq · d3 ★ — The next page after `(created_at = '2024-05-01 10:00', id = 981)`, newest first: `WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20`, backed by an index on `(created_at DESC, id DESC)`. The ask: why the tie-breaker.
  - data-query-9 · order · d3 — Order these access paths from typically cheapest to most expensive for fetching one row by an indexed key: Index Only Scan → Index Scan → Bitmap Heap Scan → Seq Scan.
  - data-query-10 · mcq · d3 ★ — The plan shows `Seq Scan on users  Filter: (lower(email) = 'a@x')` although `email` is indexed. Fix: an expression index on `lower(email)` (or a `citext` column).
  - data-query-11 · mcq · d2 — An index for `WHERE customer_id = $1 AND created_at > $2 ORDER BY created_at`: `(customer_id, created_at)`, equality first and then range/sort.
  - data-query-12 · multi · d3 — Why might Postgres **not** use an index? (Select all) a function or cast on the indexed column ✔; low selectivity, so a seq scan is cheaper ✔; stale statistics ✔; a parameter type mismatch forcing a cast ✔; the table has a primary key ✘.
  - data-query-13 · mcq · d2 ★ — Unique emails with soft delete: `CREATE UNIQUE INDEX … ON users (email) WHERE deleted_at IS NULL` (a partial unique index).
  - data-query-14 · short · d2 — "Which Postgres index clause adds non-key columns so a query can be answered by an Index Only Scan? (One word.)" → `['INCLUDE']`.
  - data-query-15 · mcq · d2 — A dashboard aggregating 50M rows that tolerates 5-minute staleness: a materialised view refreshed on a schedule (`REFRESH … CONCURRENTLY`) vs a plain view recomputed on every read.
  - data-query-16 · mcq · d3 ★ — `EXPLAIN ANALYZE` shows `rows=10` estimated vs `rows=120000` actual on a nested loop. Cause: stale or insufficient statistics. Run `ANALYZE` (or raise the statistics target), then re-plan.

#### data-scale — NEW, stage 9 (prefix `data-scale-`, ids 1–14) · 14 · d3 ≥ 6 · `ask` ≥ 4
- **Title:** Concurrency, pooling and scaling the database
- **Blurb:** Isolation levels and locks, deadlocks, connection limits, read replicas, partitioning, and migrations on huge tables.
- **estMinutes:** 35
- **Objectives:**
  1. Name the isolation levels and the anomaly each one allows
  2. Choose between a constraint, an atomic update, optimistic versioning and `SELECT … FOR UPDATE`
  3. Explain replication lag and how to give users read-your-writes
  4. Plan a backfill or index build on a 100M-row table without an outage
- **Primer outline:**
  1. Isolation levels and anomalies (dirty read, non-repeatable read, phantom, lost update, write skew; Postgres defaults to Read Committed; MVCC in one paragraph).
  2. Locks (row locks, `FOR UPDATE`, `NOWAIT`, `SKIP LOCKED`, advisory locks; lock waits and `lock_timeout`).
  3. Deadlocks (opposite lock order; detection and one victim; fixes: consistent ordering, short transactions, retry).
  4. Choosing a concurrency strategy (constraints first; atomic `UPDATE … SET stock = stock - 1 WHERE stock > 0`; version columns; pessimistic locks; the double-booking example).
  5. Connections (per-connection memory, `max_connections`, pool sizing, PgBouncer transaction-mode caveats).
  6. Read replicas (async replication, lag, read-your-writes routing, failover).
  7. Growing tables (vertical scaling first, time-based partitioning, archiving, sharding as a last resort).
  8. Operations at size (`CREATE INDEX CONCURRENTLY`, batched backfills, `lock_timeout` on `ALTER`, backups vs PITR, RPO/RTO, restore drills).
- **Questions:**
  - data-scale-1 · mcq · d2 ★ — Two requests read `stock = 5`, both write `stock = 4`, and one sale is lost. The fix: an atomic `UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0`.
  - data-scale-2 · output · d3 — Under Read Committed: T1 reads `balance = 100`; T2 updates it to 50 and commits; T1 reads again → `50` (a non-repeatable read). Under Repeatable Read, T1 would still see 100.
  - data-scale-3 · order · d2 — Order the isolation levels from weakest to strongest: Read Uncommitted → Read Committed → Repeatable Read → Serializable.
  - data-scale-4 · mcq · d3 ★ — Preventing double booking of a room slot. The most robust option: a unique constraint on `(room_id, slot)` (or an exclusion constraint for ranges), with the second insert handled as a 409. Better than check-then-insert in application code.
  - data-scale-5 · mcq · d2 — Deadlocks: T1 locks A then B while T2 locks B then A. The fix: lock in a consistent order, keep transactions short, and retry the victim.
  - data-scale-6 · multi · d2 — True of async read replicas? (Select all) reads can be slightly stale ✔; they scale reads, not writes ✔; one can be promoted on failover ✔; they are strongly consistent with the primary by default ✘.
  - data-scale-7 · mcq · d3 ★ — A user saves their profile, is redirected, and sees the old data. Cause: the read went to a lagging replica. Fix: route that user's reads to the primary for a short window after a write (or read-your-writes tokens).
  - data-scale-8 · short · d2 — "What keyword lets Postgres build an index without blocking writes? (One word, as in CREATE INDEX ___.)" → `['CONCURRENTLY']`.
  - data-scale-9 · boolean · d2 — "Sharding should be the first step when a single Postgres instance becomes slow." → false (queries/indexes → bigger instance → replicas/caching → partitioning → sharding).
  - data-scale-10 · mcq · d2 — A 2-billion-row `events` table kept for 90 days: time-based partitioning, so retention becomes `DROP`/detach of old partitions instead of a massive `DELETE`.
  - data-scale-11 · mcq · d3 — What breaks behind PgBouncer in transaction-pooling mode: session state (`SET`, advisory locks, `LISTEN`, and historically named prepared statements), because consecutive transactions can hit different server connections.
  - data-scale-12 · output · d2 — `UPDATE products SET stock = stock - 1 WHERE id = 7 AND stock > 0;` returns `UPDATE 0`. That means out of stock (or no such product), and the API should return 409, not 200.
  - data-scale-13 · mcq · d3 ★ — Backfilling a new column on 100M rows: batches by primary-key range with commits between them, throttling, a `lock_timeout`, run as a separate job rather than inside the deploy migration, and resumable.
  - data-scale-14 · mcq · d2 ★ — "We have backups." The follow-ups that matter: when did you last **restore** one, what are the RPO and RTO, and do you have point-in-time recovery?

---

### 6.7 C# track brief (`csharp`)

**Files:** `content/questions/csharp.js`, `content/modules/csharp.js`.
**Totals:** 42 → **84** (+42): 28 in existing modules, plus 14 in the new `cs-modern`.
**Stage placement:** **stage 6 becomes "C#, the language"**: `cs-basics, cs-oop, cs-modern, cs-linq-async`.
**Default `lang` is `csharp`.** Use top-level statements in snippets; `Console.WriteLine` output must be exact (`True`/`False` are capitalised).
**Avoid duplicating:** value vs reference in method calls (cs-basics-2), string equality (cs-basics-6), modifying a list during foreach (cs-basics-12), switch-expression basics (cs-basics-14), virtual vs new (cs-oop-2), `throw ex` (cs-oop-3), `.Result` deadlock (cs-linq-7), `async void` (cs-linq-8).

#### cs-basics (prefix `cs-basics-`, next id 15) · 14 → 22 · d3 ≥ 3 · new `ask` ≥ 2
Primer additions: "Structs copy", "Dates and times", "Integer division", "Dictionary lookups", "Project-level syntax (`ImplicitUsings`, file-scoped namespaces)".
- cs-basics-15 · output · d2 — `struct Point { public int X; } var p1 = new Point { X = 1 }; var p2 = p1; p2.X = 5; Console.WriteLine(p1.X);` → `1`.
- cs-basics-16 · mcq · d2 ★ — What to store for "order placed at" vs "date of birth": `DateTimeOffset` (an instant with an offset; or UTC `DateTime`) vs `DateOnly`. Say what goes wrong with `DateTime.Now`.
- cs-basics-17 · output · d1 — `Console.WriteLine(7 / 2); Console.WriteLine(7 / 2.0);` → `3` then `3.5`.
- cs-basics-18 · multi · d2 — Which are value types? (Select all) `int` ✔, `DateTime` ✔, `string` ✘, `record struct Money` ✔, `List<int>` ✘, an `enum` ✔.
- cs-basics-19 · mcq · d2 — `dict[key]` throws `KeyNotFoundException` on a missing key. `TryGetValue(key, out var v)` is the idiom (or `GetValueOrDefault`).
- cs-basics-20 · boolean · d2 — "`new List<int> { 1 } == new List<int> { 1 }` is `true`." → false (reference equality; use `SequenceEqual`).
- cs-basics-21 · short · d1 — "Which keyword declares a type with value-based equality and concise immutable syntax, ideal for DTOs? (One word.)" → `['record']`.
- cs-basics-22 · mcq · d3 — What `<ImplicitUsings>enable</ImplicitUsings>`, `global using` and file-scoped `namespace X;` do. Why new projects look "missing" their using lines.

#### cs-oop (prefix `cs-oop-`, next id 15) · 14 → 22 · d3 ≥ 7 · new `ask` ≥ 2
Primer additions: "Delegates, Func and Action", "Events and leaks", "Exception filters", "finally", "When an interface earns its place", "Result types vs exceptions".
- cs-oop-15 · mcq · d2 — The C# equivalent of a JS callback parameter: `Func<Order, bool>` (returns a value) vs `Action<Order>` (returns void) vs a custom delegate.
- cs-oop-16 · mcq · d3 — A short-lived page/view-model subscribes to a long-lived service's event and never unsubscribes. It is never collected, because the publisher holds a reference via the delegate.
- cs-oop-17 · mcq · d2 — `catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)`: exception filters. Why they beat catch-and-rethrow (the stack stays unwound only when matched).
- cs-oop-18 · output · d2 — `int F() { try { return 1; } finally { Console.WriteLine("finally"); } } Console.WriteLine(F());` → `finally` then `1`.
- cs-oop-19 · multi · d3 ★ — Legitimate reasons to introduce an interface? (Select all) there are (or will soon be) multiple implementations ✔; to substitute an I/O boundary in tests (email, payments, clock) ✔; to define a contract at a module boundary ✔; "every class should have one" ✘; to make a DTO mockable ✘.
- cs-oop-20 · boolean · d1 — "A C# class can inherit from two base classes." → false (one base class, many interfaces).
- cs-oop-21 · short · d2 — "Which keyword must a derived class use to replace a `virtual` method polymorphically? (One word.)" → `['override']`.
- cs-oop-22 · mcq · d3 ★ — "Order not found" and "validation failed" in a service. Return a `Result<T>`/discriminated outcome for **expected** failures, and throw for exceptional ones. The ask: the trade-offs (performance, explicitness, the ASP.NET mapping).

#### cs-modern — NEW (prefix `cs-modern-`, ids 1–14) · 14 · d3 ≥ 4 · `ask` ≥ 3
- **Title:** Modern C#: records, patterns and the new syntax
- **Blurb:** Records and `with`, pattern matching, `required` and `init`, primary constructors, collection expressions and nullable flow analysis.
- **estMinutes:** 30
- **Objectives:**
  1. Use records and `with` for DTOs and value objects, and say where they do not fit
  2. Replace an if/else ladder with a switch expression using property and relational patterns
  3. Explain what nullable flow analysis proves and how `required` changes object creation
  4. Read C# 12–14 syntax (primary constructors, collection expressions, `field`) without guessing
- **Primer outline:**
  1. Records (positional syntax, value equality, `with` expressions, `record struct`, why not EF entities).
  2. Pattern matching (type, property, relational, `and`/`or`/`not`, list patterns, `is not null`).
  3. Switch expressions (exhaustiveness warnings, `_` discard, arm order matters).
  4. Creating objects (`init`, `required`, object initialisers, primary constructors on classes: the parameters are captured **mutable** state, not readonly fields).
  5. Nullable reference types in practice (flow analysis, `[NotNullWhen]`, `!`, warnings as errors in CI).
  6. Collections and syntax (collection expressions `[1, 2, 3]` and spread `..`, target-typed `new()`, raw string literals).
  7. Iterators and async streams (`yield return`, lazy evaluation, `IAsyncEnumerable<T>` + `await foreach`).
  8. Recent additions to recognise (C# 13 `params` collections, C# 14 `field` keyword and extension members; authors verify).
- **Questions:**
  - cs-modern-1 · output · d2 — `record User(int Id, string Name); Console.WriteLine(new User(1, "a") == new User(1, "a"));` → `True`.
  - cs-modern-2 · output · d2 — `var u1 = new User(1, "a"); var u2 = u1 with { Name = "b" }; Console.WriteLine($"{u1.Name} {u2.Name}");` → `a b`.
  - cs-modern-3 · mcq · d3 ★ — Why records are usually a poor fit for EF Core entities: value equality conflicts with identity-based change tracking, and `with` creates untracked copies.
  - cs-modern-4 · output · d2 — `var label = total switch { < 0 => "invalid", 0 => "free", <= 100 => "small", _ => "large" };` with `total = 100` → `small`.
  - cs-modern-5 · mcq · d2 — `if (order is { Status: OrderStatus.Paid, Total: > 1000m })`: what a property pattern checks (null-safe, too).
  - cs-modern-6 · boolean · d3 ★ — "Primary constructor parameters on a class (`class OrderService(IRepo repo)`) become `readonly` fields." → false (captured parameters are mutable; assign to a readonly field if it matters).
  - cs-modern-7 · mcq · d2 — What `required` does: the compiler forces callers to set the member in an object initialiser.
  - cs-modern-8 · output · d3 — `int[] xs = [1, 2, 3]; var r = xs switch { [] => "empty", [var only] => $"one:{only}", [var first, .., var last] => $"{first}-{last}" }; Console.WriteLine(r);` → `1-3`.
  - cs-modern-9 · mcq · d2 — `x is not null` vs `x != null`: the pattern form cannot be hijacked by an overloaded `!=` operator.
  - cs-modern-10 · multi · d2 — True of a method that uses `yield return`? (Select all) its body runs lazily, when enumerated ✔; enumerating it twice runs it twice ✔; exceptions surface on enumeration, not on the call ✔; it returns a fully built `List<T>` ✘.
  - cs-modern-11 · mcq · d3 — Streaming 100k rows to a CSV endpoint: return `IAsyncEnumerable<T>` (EF `AsAsyncEnumerable`) and `await foreach`, instead of `ToListAsync()` loading everything into memory.
  - cs-modern-12 · short · d2 — "Which postfix operator tells the compiler 'this is not null, trust me' and suppresses the warning? (Type the symbol.)" → `['!', 'null-forgiving operator']`.
  - cs-modern-13 · mcq · d2 ★ — `string? name = GetName(); Console.WriteLine(name.Length);` gives warning CS8602. The fixes, in order of preference: handle null explicitly, `name?.Length ?? 0`, and `!` only when you truly know.
  - cs-modern-14 · order · d3 — Order these switch-expression arms so none is unreachable: `{ Total: > 1000, IsVip: true }` → `{ Total: > 1000 }` → `{ IsVip: true }` → `_`.

#### cs-linq-async (prefix `cs-linq-`, next id 15) · 14 → 26 · d3 ≥ 6 · new `ask` ≥ 3
Primer additions: "Multiple enumeration", "Any vs Count", "SelectMany, GroupBy, ToDictionary", "WhenAll and exceptions", "Throttling concurrency", "ValueTask", "Locks and await", "Task.Run in ASP.NET Core".
- cs-linq-15 · output · d3 ★ — `IEnumerable<int> q = Load().Where(x => { Console.WriteLine($"check {x}"); return x > 1; }); var c = q.Count(); var f = q.First();` → the "check" lines print for **both** enumerations. Materialise once with `ToList()`.
- cs-linq-16 · mcq · d2 — `Any()` vs `Count() > 0`: `Any` stops at the first match and translates to `EXISTS` in EF.
- cs-linq-17 · mcq · d2 — JS `flatMap` in LINQ: `SelectMany`.
- cs-linq-18 · output · d2 — `orders.GroupBy(o => o.CustomerId).Select(g => new { g.Key, Total = g.Sum(o => o.Amount) })` over `(1, 10), (1, 5), (2, 7)` → `{ Key = 1, Total = 15 }, { Key = 2, Total = 7 }`.
- cs-linq-19 · mcq · d3 — `await Task.WhenAll(a, b, c)` when two of them fail: `await` rethrows the **first** exception, and all of them are in `whenAllTask.Exception.InnerExceptions`.
- cs-linq-20 · mcq · d2 — Calling an API for 500 ids with at most 5 in flight: `Parallel.ForEachAsync` with `MaxDegreeOfParallelism = 5`, or `SemaphoreSlim(5)`.
- cs-linq-21 · multi · d2 — Which **block** a thread? (Select all) `.Result` ✔; `.Wait()` ✔; `GetAwaiter().GetResult()` ✔; `await Task.Delay(1000)` ✘; `Thread.Sleep(1000)` ✔.
- cs-linq-22 · mcq · d3 — When `ValueTask<T>` is worth it (hot paths that usually complete synchronously, e.g. a cache hit) and its rule: await it exactly once.
- cs-linq-23 · boolean · d2 ★ — "Wrapping an EF query in `Task.Run` inside an ASP.NET Core action makes it faster." → false (it adds a thread hop; the I/O is already async).
- cs-linq-24 · short · d2 — "Which LINQ method materialises a sequence into a `Dictionary<TKey, TValue>`? (Type the method.)" → `['ToDictionary', 'ToDictionary()']`.
- cs-linq-25 · order · d2 — Order what happens for `await db.Orders.Where(…).OrderBy(…).Select(…).ToListAsync()`: an expression tree is composed → EF translates it to SQL when `ToListAsync` runs → the SQL executes on the server → rows are materialised into objects.
- cs-linq-26 · mcq · d3 ★ — Why `lock (_gate) { await SaveAsync(); }` does not compile, and the fix: `SemaphoreSlim.WaitAsync` / `Release` in `finally`.

---

### 6.8 ASP.NET Core & EF Core track brief (`dotnet`)

**Files:** `content/questions/dotnet.js`, `content/modules/dotnet.js`.
**Totals:** 42 → **100** (+58): 30 in existing modules, plus `net-auth` (14) and `net-testing` (14).
**Stage placement:** **stage 7 becomes "ASP.NET Core and EF Core"**: `net-aspnet, net-di-config, net-efcore, net-auth, net-testing`.
**Default `lang` is `csharp`.** Use `lang: 'bash'` for `dotnet` CLI snippets. Target .NET 8+ (LTS) and mention .NET 9/10 only where you have verified it.
**Avoid duplicating:** middleware order (net-aspnet-2), over-posting (net-aspnet-5), `ActionResult<T>` (net-aspnet-10), captive dependency (net-di-2), config precedence basics (net-di-4), background service + scoped (net-di-10), lazy-loading N+1 (net-ef-4), `Database.Migrate()` risk (net-ef-7), optimistic concurrency basics (net-ef-9).

#### net-aspnet (prefix `net-aspnet-`, next id 15) · 14 → 24 · d3 ≥ 5 · new `ask` ≥ 2
Primer additions: "Route groups", "TypedResults", "Centralised errors: IExceptionHandler + ProblemDetails", "Endpoint filters", "Built-in middleware you should know (rate limiting, output caching, compression)".
- net-aspnet-15 · mcq · d2 — `var orders = app.MapGroup("/api/orders").RequireAuthorization();`: a shared prefix plus shared conventions and filters.
- net-aspnet-16 · mcq · d2 — `TypedResults.Ok(dto)` vs `Results.Ok(dto)`: typed return values give automatic OpenAPI response metadata and easier unit testing.
- net-aspnet-17 · mcq · d3 ★ — Centralised error handling in .NET 8+: `AddProblemDetails()` + an `IExceptionHandler` that maps domain exceptions to status codes, then `app.UseExceptionHandler()`.
- net-aspnet-18 · output · d2 — `app.Use(async (ctx, next) => { if (!ctx.Request.Headers.ContainsKey("X-Api-Key")) { ctx.Response.StatusCode = 401; return; } await next(ctx); });` — for a request without the header, nothing downstream runs, including the endpoint (short-circuit).
- net-aspnet-19 · mcq · d2 — An endpoint filter (`AddEndpointFilter`) for validating a minimal-API request DTO before the handler runs.
- net-aspnet-20 · multi · d2 — Which ship **in the box** with ASP.NET Core 8+? (Select all) rate-limiting middleware ✔; output caching ✔; response compression ✔; FluentValidation ✘; Serilog ✘.
- net-aspnet-21 · boolean · d2 — "In .NET 8 minimal APIs, DataAnnotations on a request DTO are enforced automatically, with a 400 returned, without any extra setup." → false (controllers with `[ApiController]` do it; minimal APIs need a filter/library in 8, and built-in validation arrived later — verify for .NET 10).
- net-aspnet-22 · short · d1 — "What status does an `[ApiController]` return automatically when model validation fails? (Type the number.)" → `['400']`.
- net-aspnet-23 · order · d2 — Order a minimal `Program.cs`: `WebApplication.CreateBuilder(args)` → register services on `builder.Services` → `builder.Build()` → add middleware (`app.Use…`) → map endpoints → `app.Run()`.
- net-aspnet-24 · mcq · d3 — Rate limiting per API key with `AddRateLimiter`: a token-bucket or fixed-window policy **partitioned** by the key, returning 429, applied with `RequireRateLimiting`.

#### net-di-config (prefix `net-di-`, next id 15) · 14 → 22 · d3 ≥ 5 · new `ask` ≥ 2
Primer additions: "Keyed services", "Validating options at startup", "Scope validation", "IHttpClientFactory and resilience", "Multiple registrations".
- net-di-15 · mcq · d2 — Two `IPaymentGateway` implementations selected by name: keyed services (`AddKeyedScoped<IPaymentGateway, Stripe>("stripe")` + `[FromKeyedServices("stripe")]`).
- net-di-16 · mcq · d2 ★ — `services.AddOptions<SmtpOptions>().BindConfiguration("Smtp").ValidateDataAnnotations().ValidateOnStart()`: the app fails at boot on bad config instead of at the first email.
- net-di-17 · mcq · d3 — A singleton takes a scoped `DbContext` in its constructor. In Development the app throws at startup (scope validation). In Production without validation, it silently becomes a captive dependency.
- net-di-18 · multi · d2 — What does `IHttpClientFactory` give you? (Select all) pooled handlers that respect DNS changes ✔; named/typed clients with shared config ✔; a place to plug in resilience handlers ✔; automatic response caching ✘.
- net-di-19 · mcq · d2 — `builder.Services.AddHttpClient<PaymentsClient>().AddStandardResilienceHandler()`: retries with backoff, timeouts and a circuit breaker for outbound calls.
- net-di-20 · boolean · d2 — "If an interface is registered twice, resolving a single instance gives you the **last** registration." → true (and `IEnumerable<T>` gives both).
- net-di-21 · short · d2 — "Which environment variable sets the hosting environment (Development/Production) for an ASP.NET Core app? (Type the variable name.)" → `['ASPNETCORE_ENVIRONMENT', 'DOTNET_ENVIRONMENT']`.
- net-di-22 · order · d3 — Order the default configuration sources from lowest to highest precedence: `appsettings.json` → `appsettings.{Environment}.json` → user secrets (Development only) → environment variables → command-line arguments.

#### net-efcore (prefix `net-ef-`, next id 15) · 14 → 26 · d3 ≥ 7 · new `ask` ≥ 3
Primer additions: "Bulk updates without loading", "Cartesian explosion and split queries", "Global query filters", "Disconnected entities", "The migrations workflow", "Concurrency conflicts → 409", "Transactions and execution strategies", "Find vs FirstOrDefault", "Raw SQL safely", "Owned and complex types", "Interceptors for audit columns".
- net-ef-15 · mcq · d2 — Mark 50k orders as archived without loading them: `ExecuteUpdateAsync(s => s.SetProperty(o => o.Archived, true))`. Note it bypasses the change tracker and `SaveChanges` interceptors.
- net-ef-16 · mcq · d3 ★ — `Include(o => o.Items).Include(o => o.Payments)` returns 40× more rows than expected (cartesian explosion). Fix: `AsSplitQuery()`, or project only what you need.
- net-ef-17 · mcq · d2 — Soft delete and multi-tenancy with `HasQueryFilter(o => !o.IsDeleted)`, and escaping it with `IgnoreQueryFilters()`.
- net-ef-18 · mcq · d3 ★ — `db.Update(mappedFromDto); await db.SaveChangesAsync();` marks **every** column modified and overwrites fields the DTO did not carry with defaults. Load then apply changes, or set the properties explicitly.
- net-ef-19 · order · d2 — Order the migrations workflow: change the model → `dotnet ef migrations add AddOrderNotes` → review the generated migration and SQL → produce an idempotent script or migration bundle → apply it in the deploy pipeline.
- net-ef-20 · mcq · d2 — A `[Timestamp] byte[] RowVersion` property: `SaveChanges` throws `DbUpdateConcurrencyException` on conflict, and the API returns 409 with the current state.
- net-ef-21 · multi · d3 — True of transactions in EF Core? (Select all) one `SaveChanges` call is atomic by default ✔; two `SaveChanges` calls need an explicit transaction to be atomic together ✔; with a retrying execution strategy, wrap the whole unit in `strategy.ExecuteAsync` ✔; `SaveChanges` runs each INSERT in its own transaction ✘.
- net-ef-22 · boolean · d2 — "`db.Orders.Find(id)` always sends a query to the database." → false (it checks the change tracker first).
- net-ef-23 · short · d2 — "What is the dotnet CLI command to scaffold a new migration named Init? (Type the full command.)" → `['dotnet ef migrations add Init']`.
- net-ef-24 · mcq · d2 ★ — `FromSql($"SELECT … WHERE email = {email}")` is parameterised; `FromSqlRaw("… WHERE email = '" + email + "'")` is injectable.
- net-ef-25 · mcq · d2 — Mapping an `Address` value object inside `Customer` without its own table: owned or complex types.
- net-ef-26 · mcq · d3 — Setting `CreatedAt`/`UpdatedBy` automatically for every entity: a `SaveChangesInterceptor` (or a `SaveChanges` override) that inspects `ChangeTracker.Entries()`.

#### net-auth — NEW (prefix `net-auth-`, ids 1–14) · 14 · d3 ≥ 4 · `ask` ≥ 3
- **Title:** Authentication and authorisation in ASP.NET Core
- **Blurb:** Schemes, JWT bearer and cookies, claims and policies, resource-based checks, and the Identity pieces you should not rebuild.
- **estMinutes:** 30
- **Objectives:**
  1. Explain authentication schemes and the difference between `UseAuthentication` and `UseAuthorization`
  2. Configure JWT bearer validation correctly
  3. Write policy-based and resource-based authorisation
  4. Decide between ASP.NET Core Identity and an external identity provider
- **Primer outline:**
  1. The model (`ClaimsPrincipal`, schemes, handlers; challenge → 401 vs forbid → 403).
  2. Cookie auth (same-site SPAs and server-rendered apps; antiforgery).
  3. JWT bearer (`Authority`, `Audience`, token validation parameters, clock skew, where tokens come from).
  4. Authorisation (`[Authorize]`, `RequireAuthorization`, roles vs claims vs policies, a fallback policy that requires authenticated users).
  5. Resource-based authorisation (`IAuthorizationService.AuthorizeAsync(user, order, "CanEdit")` with a handler).
  6. Identity and external IdPs (what ASP.NET Core Identity gives you; Entra ID/Auth0/Keycloak; the BFF pattern for SPAs).
  7. Data Protection (what it encrypts, persisting keys across instances and deploys).
  8. Common mistakes (IDOR, new endpoints shipped without auth, trusting client-supplied role claims).
- **Questions:**
  - net-auth-1 · mcq · d2 — `UseAuthentication()` builds `HttpContext.User` from the request; `UseAuthorization()` decides whether that user may reach the endpoint.
  - net-auth-2 · mcq · d2 — Challenge vs Forbid: an anonymous user gets 401 (challenge); an authenticated user without permission gets 403 (forbid).
  - net-auth-3 · multi · d3 ★ — Which JWT bearer validations must stay on? (Select all) issuer ✔; audience ✔; lifetime ✔; signing key ✔; `ValidateIssuer = false` "because it works locally" ✘.
  - net-auth-4 · mcq · d2 — Roles vs claims vs policies: a policy names a requirement (e.g. `CanRefund`) and can combine roles, claims and custom logic.
  - net-auth-5 · mcq · d3 ★ — "Only the order's owner or support staff can edit it": resource-based authorisation with an `AuthorizationHandler<EditRequirement, Order>` called after loading the order.
  - net-auth-6 · mcq · d2 — `builder.Services.AddAuthorizationBuilder().SetFallbackPolicy(…RequireAuthenticatedUser()…)`: new endpoints are secure by default, and you opt out with `[AllowAnonymous]`.
  - net-auth-7 · output · d2 — `app.MapGet("/admin/stats", …).RequireAuthorization("Admin");` called by a logged-in user without the Admin policy → `403 Forbidden`.
  - net-auth-8 · boolean · d2 — "Role claims inside a JWT whose signature, issuer and audience you validated can be trusted." → true (unlike a role sent in a request body or header).
  - net-auth-9 · mcq · d3 ★ — After scaling to 3 instances (or after every deploy), users are randomly logged out and antiforgery fails. Cause: Data Protection keys are per-instance or ephemeral. Persist them to shared storage.
  - net-auth-10 · mcq · d2 — The BFF pattern for a React SPA: the .NET backend holds tokens and the browser only has an httpOnly session cookie.
  - net-auth-11 · order · d2 — Order the pipeline for a bearer-token request: routing selects the endpoint → the authentication handler validates the token and builds a `ClaimsPrincipal` → authorisation evaluates the endpoint's policy → the endpoint runs.
  - net-auth-12 · short · d1 — "Which attribute exempts one endpoint from authorisation? (Type the attribute name.)" → `['AllowAnonymous', '[AllowAnonymous]']`.
  - net-auth-13 · mcq · d2 — What ASP.NET Core Identity gives you out of the box: a user store, password hashing, lockout, 2FA and email confirmation. Why not to roll your own.
  - net-auth-14 · mcq · d2 — Cookie-authenticated form posts need antiforgery tokens; bearer-token APIs do not. Why: browsers attach cookies automatically, not bearer headers.

#### net-testing — NEW (prefix `net-test-`, ids 1–14) · 14 · d3 ≥ 4 · `ask` ≥ 3
- **Title:** Testing ASP.NET Core and EF Core
- **Blurb:** xUnit, doubles at the boundaries, WebApplicationFactory integration tests and a real database in a container — plus the InMemory trap.
- **estMinutes:** 30
- **Objectives:**
  1. Structure xUnit tests with facts, theories and fixtures
  2. Write an integration test against the real pipeline with `WebApplicationFactory`
  3. Explain why the EF InMemory provider gives false confidence and what to use instead
  4. Decide what to mock (external boundaries) and what to run for real
- **Primer outline:**
  1. xUnit essentials (`[Fact]`, `[Theory]` + `[InlineData]`, a new class instance per test, `IClassFixture`/collection fixtures, async tests; NUnit/MSTest equivalents).
  2. Assertions and doubles (built-in asserts vs assertion libraries (check current licensing), Moq/NSubstitute, fakes over mocks).
  3. Unit tests that pay (domain logic, validators, mapping; `TimeProvider` + a fake time provider for time).
  4. `WebApplicationFactory<Program>` (in-memory server, `ConfigureTestServices` to swap boundaries, a test auth handler).
  5. Databases in tests (InMemory provider pitfalls, SQLite in-memory differences, Testcontainers with the real engine, Respawn to reset, a transaction per test).
  6. Test data (builders, Bogus/AutoFixture, keeping tests readable).
  7. Speed and CI (parallelisation and collections, shared containers, flaky-test hygiene).
  8. What to test in an API (status codes, validation errors, authz, persistence round trip, the error shape).
- **Questions:**
  - net-test-1 · mcq · d1 — `[Fact]` vs `[Theory]` with `[InlineData]`: one case vs a parameterised set of cases.
  - net-test-2 · mcq · d2 — xUnit creates a new test-class instance for every test. Use the constructor for per-test setup and `IClassFixture<T>` for expensive shared setup.
  - net-test-3 · mcq · d3 ★ — Tests pass with the EF InMemory provider but prod fails. Why: no relational behaviour (constraints, transactions), and LINQ that cannot be translated to SQL still "works". Use the real engine via Testcontainers.
  - net-test-4 · mcq · d2 — What `WebApplicationFactory<Program>` does: boots your real app (DI, middleware, routing) in memory and gives you an `HttpClient`.
  - net-test-5 · output · d2 — A test replaces `IEmailSender` with a `FakeEmailSender` via `ConfigureTestServices` and POSTs `/signup`. What does the fake record (one email to the new address), and does any real email go out (no)?
  - net-test-6 · multi · d2 ★ — Which are good candidates to substitute in tests? (Select all) the payment gateway ✔; the email sender ✔; the clock (`TimeProvider`) ✔; your own `DbContext` in integration tests ✘; the class under test ✘.
  - net-test-7 · mcq · d2 — Testing "a coupon expires after 30 days": inject `TimeProvider` and advance a fake time provider, instead of calling `DateTime.UtcNow` directly.
  - net-test-8 · order · d2 — Order an API integration test: create the factory and client → seed the database → send the HTTP request → assert status and body → assert the database state.
  - net-test-9 · boolean · d3 — "By default, xUnit runs the tests *within one test class* in parallel." → false (test collections run in parallel; tests in one class run sequentially).
  - net-test-10 · mcq · d3 — Keeping DB integration tests fast: one container per test run (a collection fixture), with Respawn (or transaction rollback) resetting data between tests.
  - net-test-11 · short · d2 — "Which class from Microsoft.AspNetCore.Mvc.Testing hosts your app in-memory for integration tests? (Type the class name.)" → `['WebApplicationFactory', 'WebApplicationFactory<Program>']`.
  - net-test-12 · mcq · d2 — Testing authorised endpoints: register a test authentication handler that issues a principal with chosen claims, instead of minting real JWTs.
  - net-test-13 · mcq · d2 — What a `POST /orders` integration test should assert: 201, the `Location` header, the body shape, and that the row exists; not the private method calls.
  - net-test-14 · mcq · d3 ★ — "How do you test a service that uses `DbContext`?" Integration-test it against the real database. Do not mock `DbSet` (brittle, untranslatable queries pass). Keep pure logic separately unit-tested.

---

### 6.9 Craft track briefs (`craft`)

Craft adds 128 questions, so it is split between two authors who write to **different question files**:
- **6.9a craft-core** owns `content/questions/craft.js` (existing modules plus `craft-observability` and `craft-appsec`).
- **6.9b craft-senior** owns a **new** file, `content/questions/craft-senior.js`, which exports `craftSeniorQuestions`. The integrator adds its import to `content/index.js`.
- Both write module objects into `content/modules/craft.js`. To avoid clobbering, **6.9b writes its four modules into a new `content/modules/craft-senior.js`** (exporting `craftSeniorModules`), which the integrator imports in `modules/index.js`.

**Default `lang` is `js`.** Set `lang` explicitly for git/shell/Docker (`'bash'`), SQL (`'sql'`) and C# (`'csharp'`). Stage-10 questions carry the `senior` tag.

#### 6.9a craft-core

**Totals:** existing craft 56 → **92** (+36); plus `craft-observability` (14) and `craft-appsec` (14), both in stage 9.
**Stage placement:** stage 8 "Ship it" = `craft-git, craft-testing, craft-security, craft-shipping` (the id changes from `stage-7` to `stage-8`; the integrator handles that). Stage 9 includes `craft-observability` (2nd) and `craft-appsec` (5th).
**Avoid duplicating:** merge vs rebase (craft-git-1), revert on main (craft-git-2), force-with-lease (craft-git-3), reflog (craft-git-7), bisect (craft-git-10), leaked `.env` (craft-git-11), stub vs mock (craft-test-2), flaky test response (craft-test-9), date testing (craft-test-11), SQLi (craft-sec-1), CSP (craft-sec-9), uploads (craft-sec-11), SameSite (craft-sec-14), column rename deploy (craft-ship-5), logs/metrics/traces (craft-ship-14).

##### craft-git (prefix `craft-git-`, next id 15) · 14 → 22 · d3 ≥ 4 · new `ask` ≥ 2
Primer additions: "reset, three ways", "Interactive rebase and autosquash", "Cherry-pick", "Ranges (`a..b`)", "Untracking a file", "Reverting a merge", "blame", "The rebase-conflict loop".
- craft-git-15 · mcq · d2 — Cleaning up "wip" and "fix typo" commits before merging: `git rebase -i` with squash/fixup (and `--autosquash` with `git commit --fixup`), only on unshared branches.
- craft-git-16 · mcq · d2 ★ — `git reset --soft HEAD~1` vs `--mixed` vs `--hard`: keep the changes staged vs keep them unstaged vs discard them.
- craft-git-17 · output · d2 — `git log --oneline main..feature` (lang `bash`) → the commits on `feature` that are not on `main`.
- craft-git-18 · mcq · d2 — A hotfix merged to `main` must also go to `release/2.3`: `git cherry-pick <sha>` onto the release branch.
- craft-git-19 · multi · d2 — `.env` was committed earlier and you have now added it to `.gitignore`. What is true? (Select all) Git keeps tracking it until `git rm --cached .env` ✔; `.gitignore` only affects untracked files ✔; the secret is still in history, so rotate it ✔; adding it to `.gitignore` deletes it from history ✘.
- craft-git-20 · boolean · d3 — "Reverting a merge commit requires telling Git which parent is the mainline, e.g. `git revert -m 1 <sha>`." → true.
- craft-git-21 · short · d1 — "Which git command shows who last changed each line of a file? (Type the command.)" → `['git blame', 'blame']`.
- craft-git-22 · order · d3 ★ — Order resolving a conflict during `git rebase main`: edit the conflicted files → `git add` them → `git rebase --continue` (repeat per commit) → run the tests → `git push --force-with-lease`.

##### craft-testing (prefix `craft-test-`, next id 15) · 14 → 24 · d3 ≥ 5 · new `ask` ≥ 2
Primer additions: "Mock the network, not the module (MSW)", "Fake timers", "E2E without flakiness (Playwright)", "Async assertions that actually assert", "Test data builders", "Load tests", "Characterisation tests".
- craft-test-15 · mcq · d2 — Why MSW (intercepting HTTP) beats `vi.mock('./api')`: your real client code runs, handlers are reusable, and tests don't know about module structure.
- craft-test-16 · mcq · d2 — Testing a 300 ms debounced search: fake timers (`vi.useFakeTimers()` + `advanceTimersByTime`) instead of real sleeps.
- craft-test-17 · multi · d2 — Common causes of flaky end-to-end tests? (Select all) fixed `sleep(2000)` waits ✔; tests sharing and mutating the same data ✔; order dependence between tests ✔; querying by role and accessible name ✘.
- craft-test-18 · mcq · d2 — Why Playwright's `await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()` beats checking once: web-first assertions auto-retry until a timeout.
- craft-test-19 · output · d3 ★ — `it('saves', () => { expect(save()).resolves.toBe(true); });` → the test passes even when `save()` rejects, because the assertion promise is not awaited or returned.
- craft-test-20 · mcq · d2 — Test data builders/factories (`anOrder().paid().withItems(3).build()`): intent-revealing tests that don't break when the model gains a field.
- craft-test-21 · boolean · d2 — "A unit test that mocks every collaborator of a service is the strongest evidence that the service works." → false.
- craft-test-22 · short · d2 — "What kind of test runs many virtual users against a system to measure latency and errors under expected traffic? (Two words.)" → `['load test', 'load testing', 'load tests', 'performance test']`.
- craft-test-23 · order · d1 — Order the TDD cycle: write a failing test (red) → write the minimum code to pass (green) → refactor with the tests green.
- craft-test-24 · mcq · d3 — You inherit an untested CRUD service and must change pricing logic. First step: characterisation tests at the API boundary around the current behaviour, then refactor.

##### craft-security (prefix `craft-sec-`, next id 15) · 14 → 24 · d3 ≥ 5 · new `ask` ≥ 3
Primer additions: "The OWASP Top 10 in one table" (with a pointer to *Application security in depth*), "Mass assignment", "Open redirects", "Path traversal", "SSRF in one paragraph", "Security headers", "Supply chain basics", "When a secret leaks", "CORS is not access control".
- craft-sec-15 · multi · d1 — Which are OWASP Top 10 categories? (Select all) Broken Access Control ✔; Injection ✔; Security Misconfiguration ✔; Vulnerable/Outdated Components ✔ (named "Software Supply Chain Failures" in the 2025 list; verify); Slow Page Load ✘.
- craft-sec-16 · mcq · d2 ★ — `await User.update(req.body, { where: { id } })`: a user adds `"role": "admin"` to their profile update (mass assignment). The fix: allowlist fields with a DTO/schema.
- craft-sec-17 · mcq · d2 — `/login?next=https://evil.example` redirects after login (an open redirect used in phishing). The fix: allow only relative paths or an allowlist.
- craft-sec-18 · output · d2 — `res.sendFile(path.join(UPLOADS, req.query.name))` with `name=../../etc/passwd` → it serves the file (path traversal). The fix: resolve the path and check it stays inside the directory, or use ids instead of names.
- craft-sec-19 · mcq · d2 — What `X-Content-Type-Options: nosniff` and `Content-Security-Policy: frame-ancestors 'none'` (or `X-Frame-Options`) each prevent: MIME sniffing and clickjacking.
- craft-sec-20 · boolean · d2 — "Because the site uses HTTPS, storing passwords with reversible encryption is acceptable." → false.
- craft-sec-21 · short · d2 — "What is the attack called where the attacker makes your server send requests to internal URLs, e.g. via an 'import from URL' feature? (Type the acronym.)" → `['SSRF', 'server-side request forgery']`.
- craft-sec-22 · order · d3 ★ — Order the response to an API key found in a public repo: revoke/rotate the key → check logs for misuse during the exposure window → remove it from code and, if needed, history → add secret scanning so it cannot happen again.
- craft-sec-23 · mcq · d2 — npm supply-chain risk (typosquatting, malicious `postinstall`, hijacked maintainers). Mitigations: lockfile + `npm ci`, audit/SCA, fewer dependencies, `--ignore-scripts` where feasible, provenance.
- craft-sec-24 · mcq · d3 ★ — "We set CORS to allow only our domain, so the API is protected." Why that is wrong: CORS only restrains browsers reading responses. curl and scripts ignore it, and authn/authz must protect the API.

##### craft-shipping (prefix `craft-ship-`, next id 15) · 14 → 22 · d3 ≥ 4 · new `ask` ≥ 2
Primer additions: "Dockerfiles that build fast and small", "Liveness vs readiness", "Build once, promote", "Canary releases", "Tags and immutability". Also pointers to *Observability* and *Incidents*.
- craft-ship-15 · mcq · d2 — A multi-stage Docker build for a Node or .NET API: build in an SDK/dev image, then copy only the output into a slim runtime image. You get a smaller image, no dev dependencies, and a smaller attack surface.
- craft-ship-16 · mcq · d2 ★ — Liveness vs readiness: "restart me, I'm stuck" vs "don't send me traffic yet". Why a readiness check that pings the DB must not be the liveness check (a DB blip would restart every pod).
- craft-ship-17 · output · d2 — A Dockerfile with `COPY . .` **before** `RUN npm ci` (lang `bash`). What happens on every code change: the dependency layer is rebuilt. Fix: copy `package*.json`, run `npm ci`, then `COPY . .`.
- craft-ship-18 · multi · d2 — "Build once, promote everywhere": which practices fit? (Select all) tag images with the commit SHA ✔; per-environment config via env vars/secrets ✔; deploy the same image to staging and production ✔; rebuild the image separately for production ✘.
- craft-ship-19 · mcq · d2 — A canary release: route 5% of traffic to the new version, compare error rate and latency, then ramp up or roll back automatically.
- craft-ship-20 · boolean · d2 — "Deploying `myapp:latest` to production is fine as long as CI pushed it." → false (not reproducible; rollback is ambiguous).
- craft-ship-21 · short · d1 — "Which file keeps `node_modules` and `.env` out of the Docker build context? (Type the file name.)" → `['.dockerignore', 'dockerignore']`.
- craft-ship-22 · order · d3 — Order a CI/CD pipeline: `npm ci` → lint + type-check → unit tests → build the artefact/image → integration tests against it → publish the artefact → deploy.

##### craft-observability — NEW, stage 9 (prefix `craft-obs-`, ids 1–14) · 14 · d3 ≥ 5 · `ask` ≥ 4
- **Title:** Observability: logs, metrics and traces
- **Blurb:** Structured logs with context, RED metrics, traces with OpenTelemetry, SLOs, and alerts that only wake someone when it matters.
- **estMinutes:** 30
- **Objectives:**
  1. Write a structured log line with the fields that make it searchable
  2. Instrument a service with RED metrics and say what each one catches
  3. Follow a request across services with a trace and a correlation id
  4. Define an SLO and a burn-rate alert instead of a CPU alert
- **Primer outline:**
  1. Monitoring vs observability (asking new questions without shipping new code).
  2. Structured logging (JSON, levels, request/trace id on every line, what never to log: secrets, tokens, full PII; sampling noisy logs).
  3. Metrics (counters, gauges, histograms; RED for services, USE for resources; the cardinality trap).
  4. Tracing (spans, parent/child, context propagation with `traceparent`, OpenTelemetry auto-instrumentation for Express/ASP.NET Core/DB drivers).
  5. Correlation (trace ids in logs, exemplars, jumping from a dashboard spike to a trace to logs).
  6. SLIs, SLOs, SLAs and error budgets (the maths, what to do when the budget is spent).
  7. Alerting (alert on symptoms, burn-rate alerts, a runbook link on every alert, killing alert fatigue).
  8. Dashboards (one per service: RED + saturation + deploy markers; vendor-neutral tooling).
- **Questions:**
  - craft-obs-1 · mcq · d2 — Why `logger.info({ orderId, userId, durationMs }, 'order placed')` beats `console.log('order ' + id + ' placed by ' + user)`: it is queryable by field, aggregatable, and cheaper to parse.
  - craft-obs-2 · multi · d2 — What belongs in a production request log line? (Select all) timestamp and level ✔; trace/request id ✔; route and status ✔; duration ✔; the request's `Authorization` header ✘; the full card number ✘.
  - craft-obs-3 · mcq · d2 ★ — The RED method for a service: Rate, Errors, Duration, and what each catches.
  - craft-obs-4 · mcq · d3 ★ — A metric `http_requests_total{user_id="…"}` takes down the metrics backend. Why (label cardinality), and where per-user detail belongs instead (logs/traces).
  - craft-obs-5 · mcq · d2 — Which metric type for request latency, so you can compute p95: a histogram (not a gauge of the last value, not an average counter).
  - craft-obs-6 · order · d2 — Order the spans of one checkout trace by start time: incoming `POST /checkout` → auth middleware → `SELECT cart` DB span → outbound payment-provider HTTP span → `INSERT order` DB span.
  - craft-obs-7 · short · d2 — "Which W3C header carries trace context between services? (Type the header name.)" → `['traceparent']`.
  - craft-obs-8 · mcq · d2 — SLI vs SLO vs SLA: the measurement vs the internal target vs the contractual promise with penalties.
  - craft-obs-9 · output · d2 ★ — The error budget for a 99.9% monthly availability SLO over 30 days → about **43 minutes**. Choices: 4.3 min / 43 min / 7.2 h / 3.6 days.
  - craft-obs-10 · mcq · d3 — Why a burn-rate alert ("at this rate we exhaust the monthly budget in 6 hours") beats "error rate > 1% for 5 minutes": fewer false pages and faster detection of big incidents.
  - craft-obs-11 · boolean · d2 — "CPU above 80% is the best primary paging alert for a web API." → false (page on user-facing symptoms: errors and latency; CPU is a cause to investigate).
  - craft-obs-12 · mcq · d2 — What OpenTelemetry is: vendor-neutral APIs/SDKs and a collector for traces, metrics and logs, so switching backends does not mean re-instrumenting.
  - craft-obs-13 · mcq · d2 — Log levels in production: `info` for business events, `warn` for handled oddities, `error` when someone should act, `debug` off by default (or sampled).
  - craft-obs-14 · mcq · d3 ★ — "Users report intermittent 500s you can't reproduce." Get a trace/request id from an affected request (or search errors by route), follow the trace, correlate with deploys/flags, then group by error signature.

##### craft-appsec — NEW, stage 9 (prefix `craft-appsec-`, ids 1–14) · 14 · d3 ≥ 5 · `ask` ≥ 4
- **Title:** Application security in depth
- **Blurb:** The OWASP Top 10 beyond XSS and CSRF — SSRF, injection variants, supply chain, crypto and logging failures — plus threat-modelling a feature.
- **estMinutes:** 30
- **Objectives:**
  1. Walk through the OWASP Top 10 with a CRUD-app example for each
  2. Threat-model a new feature with STRIDE in fifteen minutes
  3. Explain how secrets, keys and dependencies should be managed and rotated
  4. Design authorisation that holds up: object-level, function-level and multi-tenant
- **Primer outline:**
  1. The OWASP Top 10 (the 2021 list and the 2025 update, verified) and the OWASP API Security Top 10, each mapped to a CRUD example.
  2. Access control at scale (BOLA/IDOR and BFLA, deny by default, tenant isolation from the token, automated authz tests).
  3. SSRF (webhook URLs, "import from URL", allowlists, blocking private and link-local ranges including 169.254.169.254, DNS rebinding, redirects).
  4. Injection beyond SQL (NoSQL operator injection, command injection, template injection, ReDoS, prototype pollution).
  5. Crypto and data (TLS everywhere; hashing vs encryption vs encoding; KMS and key rotation; encryption at rest and what it does not protect; PII minimisation and deletion).
  6. Supply chain and CI (lockfiles, SCA, SBOM, actions pinned to a SHA, least-privilege CI tokens, OIDC to cloud instead of long-lived keys, secret scanning).
  7. Misconfiguration and logging failures (debug endpoints, default credentials, verbose errors; logging auth events without secrets).
  8. Threat modelling (data-flow diagram, trust boundaries, STRIDE, ranking, owners; a security checklist in PR review).
- **Questions:**
  - craft-appsec-1 · mcq · d2 — The #1 risk in the OWASP API Security Top 10 and what it looks like: `GET /api/invoices/1043` returning another customer's invoice (BOLA).
  - craft-appsec-2 · mcq · d3 ★ — A "set your avatar from a URL" feature. The attacker submits `http://169.254.169.254/latest/meta-data/…`. Name the attack (SSRF) and the impact (cloud credentials).
  - craft-appsec-3 · multi · d3 — Effective SSRF mitigations? (Select all) allowlist the hosts/schemes you need ✔; resolve DNS and block private, loopback and link-local IPs ✔; disable or re-validate redirects ✔; checking the URL starts with `https://` ✘; a regex on the hostname only ✘.
  - craft-appsec-4 · output · d2 ★ — `User.findOne({ email: req.body.email, password: req.body.password })` with body `{"email":"admin@x","password":{"$ne":null}}` → it logs in as admin (NoSQL operator injection). Validate types with a schema, and never compare plaintext passwords.
  - craft-appsec-5 · mcq · d2 — Prototype pollution: a naive deep-merge of user JSON containing `"__proto__": { "isAdmin": true }` sets `isAdmin` on every object. Fixes: a schema, `Object.create(null)`, a safe merge.
  - craft-appsec-6 · mcq · d2 — ReDoS: a regex like `/^(a+)+$/` on user input can pin Node's single thread for seconds. Fixes: safe patterns, input length limits, RE2.
  - craft-appsec-7 · order · d2 — Order a lightweight threat-modelling session: draw the data flow → mark trust boundaries → enumerate threats per element (STRIDE) → rank them by risk → assign mitigations and owners.
  - craft-appsec-8 · mcq · d2 — Hashing vs encryption vs encoding: one-way for passwords vs reversible with a key for data you must read back vs no security at all (Base64).
  - craft-appsec-9 · boolean · d3 — "Encrypting a column at rest protects it from an attacker who exploits SQL injection through the app." → false (the app decrypts transparently for its own DB user).
  - craft-appsec-10 · mcq · d2 — Hardening a GitHub Actions deploy workflow: pin third-party actions to a commit SHA, give `GITHUB_TOKEN` minimal permissions, and use OIDC federation to the cloud instead of stored keys.
  - craft-appsec-11 · short · d2 — "What is the machine-readable inventory of every component and dependency in a build called? (Type the acronym.)" → `['SBOM', 'software bill of materials']`.
  - craft-appsec-12 · mcq · d2 — What security logging should capture: logins (success and failure), permission denials, admin actions and password/MFA changes, with who/when/where and **no** secrets.
  - craft-appsec-13 · mcq · d3 ★ — Multi-tenant isolation: take the tenant id from the verified token, never from the request. Enforce it in the data layer (a global filter or RLS as defence in depth) and test cross-tenant access.
  - craft-appsec-14 · mcq · d3 ★ — "How do you review a PR for security?" A structured pass: authz on every new endpoint/object, input validation and output encoding, secrets and config, logging of sensitive data, new dependencies, error handling.

#### 6.9b craft-senior (stage 10)

**Files:** a **new** `content/questions/craft-senior.js` (export `craftSeniorQuestions`, same `import { q, deck } from '../schema.js'` header) and a **new** `content/modules/craft-senior.js` (export `craftSeniorModules`). Each deck uses track id `'craft'`.
**Totals:** 58 new questions across four modules (16 + 14 + 14 + 14). Every question is tagged `senior`.
**Voice for stage 10:** grounded, practical, CRUD-scale. No FAANG puzzles, no "design Twitter for a billion users". Each primer ends with a short worked example. Where there is judgement, the correct choice is the one a respected senior engineer would defend, and the `why` names the trade-off it accepts.
**Output questions here** are estimation or "read this artefact" questions (a timeline, a diff, a set of numbers) with concrete choices.

##### craft-design (prefix `craft-design-`, ids 1–16) · 16 · d3 ≥ 7 · `ask` ≥ 6
- **Title:** System design for CRUD apps
- **Blurb:** Grounded system design: requirements and numbers first, then a boring architecture that scales, with the trade-offs said out loud.
- **estMinutes:** 40
- **Objectives:**
  1. Run a design conversation: requirements, estimates, API, data model, then scale
  2. Estimate load and storage with back-of-envelope numbers
  3. Scale a CRUD app step by step: stateless app tier, caching, replicas, queues, CDN
  4. Name the trade-offs (consistency, cost, complexity) in each decision
- **Primer outline:**
  1. The shape of a design conversation or design doc (functional and non-functional requirements, estimates, API, data model, high level, deep dive, trade-offs).
  2. Back-of-envelope maths (DAU → requests/day → average RPS → peak ×3–5; row size × rows × years; a few latency numbers worth knowing).
  3. The boring baseline (load balancer → N stateless app instances → Postgres primary with backups; object storage + CDN for files).
  4. Scaling steps in order (fix queries and indexes → vertical scale → cache hot reads → read replicas → queues for slow work → partitioning; microservices are not a scaling step).
  5. Files and media (presigned upload URLs direct to object storage, async scanning and thumbnails via a queue).
  6. Correctness (idempotency keys, uniqueness constraints, double submits, eventual consistency in the UI).
  7. Real-time and notifications (polling vs SSE vs WebSockets; fan-out via pub/sub; email/SMS via queues).
  8. Cross-cutting (multi-tenancy, rate limiting, search: Postgres FTS first, a search engine when relevance and facets demand it).
  9. Worked examples (a booking system without double booking; a URL shortener; checkout; an activity feed).
- **Questions:**
  - craft-design-1 · order · d2 ★ — Order a design conversation: clarify requirements → estimate scale → define the API → design the data model → sketch the high-level architecture → deep-dive the bottlenecks → state the trade-offs.
  - craft-design-2 · output · d2 ★ — 1M daily active users × 20 requests each per day. Average and peak RPS? About 230 average, about 1k peak. Choices: 23 / 230 / 2,300 / 23,000 average.
  - craft-design-3 · mcq · d2 — Why app servers should be stateless (any instance can serve any request, so you scale horizontally and deploy with rolling restarts), and where session state goes instead.
  - craft-design-4 · mcq · d2 — Users upload 50 MB videos: the API issues a presigned URL, the browser uploads directly to object storage, and a queue job processes it. Don't stream it through the API.
  - craft-design-5 · mcq · d3 ★ — A meeting-room booking system where two people click "Book" on the same slot at once. Make the database the arbiter (a unique/exclusion constraint on room + slot), add an idempotency key on submit, and give the loser a clear 409.
  - craft-design-6 · multi · d3 ★ — A Postgres-backed CRUD API is slow at 500 RPS. Sensible **first** steps? (Select all) find and fix the slowest queries/indexes with real data ✔; cache hot, rarely changing reads ✔; move reporting queries to a read replica ✔; split into microservices ✘; shard the database on day one ✘.
  - craft-design-7 · mcq · d2 — Notifications ("your export is ready") in an admin dashboard: SSE, polling as the fallback, WebSockets only if you need bidirectional traffic.
  - craft-design-8 · mcq · d3 — An activity feed: fan-out on write (precompute each follower's feed) vs fan-out on read (query at view time), and the hybrid for accounts with huge follower counts.
  - craft-design-9 · boolean · d2 — "Eventual consistency is never acceptable in a CRUD app." → false (search indexes, counters, emails and analytics routinely lag. Decide per feature and design the UI for it).
  - craft-design-10 · mcq · d2 — URL shortener key generation: base62 of a DB sequence vs random + unique-constraint retry. Also 301 vs 302 if you need click analytics.
  - craft-design-11 · mcq · d2 — Adding search to a product catalogue: Postgres full-text search first; a dedicated search engine when relevance tuning, facets or scale require it, kept in sync via outbox/CDC.
  - craft-design-12 · short · d1 — "What component distributes incoming traffic across several app instances and health-checks them? (Two words.)" → `['load balancer', 'a load balancer', 'reverse proxy']`.
  - craft-design-13 · mcq · d3 — Rate limiting for a public API across 6 instances: counters in a shared store (Redis) keyed by API key (or at the gateway/edge). In-memory limits multiply by instance count.
  - craft-design-14 · mcq · d3 ★ — "Should we go multi-region?" The senior answer: not by default. Start with multi-AZ, tested backups and a DR runbook, and go multi-region only for a stated latency or availability requirement that justifies the data-consistency cost.
  - craft-design-15 · output · d3 ★ — 10k new orders/day × about 2 KB per order (with items) × 365 × 5 years ≈ 36.5 GB, which fits comfortably in one Postgres instance. Choices differ by orders of magnitude.
  - craft-design-16 · mcq · d3 ★ — "What would you change at 10× traffic?" A strong answer identifies the next bottleneck with numbers (DB connections, write IOPS, cache hit rate) and changes that one thing, rather than listing buzzwords.

##### craft-architecture (prefix `craft-arch-`, ids 1–14) · 14 · d3 ≥ 6 · `ask` ≥ 5
- **Title:** Architecture decisions and trade-offs
- **Blurb:** Monolith vs services, module boundaries, layering, events, build vs buy, tech debt, and writing the decision down.
- **estMinutes:** 30
- **Objectives:**
  1. Argue for a modular monolith and name the signals that justify extracting a service
  2. Draw module boundaries around business capabilities, not technical layers
  3. Write an ADR that records context, options and consequences
  4. Manage tech debt as a portfolio with product, not as a guilty secret
- **Primer outline:**
  1. What architecture is (decisions that are expensive to change; one-way vs two-way doors).
  2. Monolith, modular monolith and microservices (the real costs: network, distributed data, ops, debugging; Conway's law and team topology).
  3. Boundaries (bounded contexts, each module owns its data, no shared tables across services, anti-corruption layers).
  4. Layering inside a service (controller/service/repository; ports and adapters; dependency direction; not over-abstracting).
  5. Communication (sync HTTP vs async events; event-carried state; eventual consistency; sagas and compensating actions vs 2PC).
  6. Evolution (strangler fig, branch by abstraction, feature flags, expand/contract, API versioning).
  7. Recording decisions (ADRs, design docs/RFCs, build vs buy, boring technology, cost as a requirement).
  8. Tech debt (deliberate vs accidental, "interest", tracking it, negotiating with product, refactor vs rewrite).
- **Questions:**
  - craft-arch-1 · mcq · d2 ★ — A 6-developer team starting a new B2B CRUD product: a modular monolith, with clear internal module boundaries and one deployable.
  - craft-arch-2 · multi · d3 ★ — Legitimate reasons to extract a service? (Select all) one component needs very different scaling ✔; a separate team needs an independent deploy cadence ✔; a different runtime or compliance boundary (e.g. PCI scope) ✔; "microservices are best practice" ✘; the monolith has grown to 200 files ✘.
  - craft-arch-3 · mcq · d2 — Why two services sharing one database schema is an anti-pattern: hidden coupling, and a column change can break a service you don't own.
  - craft-arch-4 · mcq · d2 — Conway's law in practice: system boundaries mirror communication structures, so design the teams and the architecture together.
  - craft-arch-5 · order · d2 — Order the sections of a classic (Nygard) ADR: Title → Status → Context → Decision → Consequences.
  - craft-arch-6 · mcq · d2 — Replacing a legacy billing module gradually: the strangler fig. Route a slice of traffic to the new implementation behind a facade and grow it until the old one can be deleted.
  - craft-arch-7 · mcq · d3 — Ports and adapters: the domain defines an `OrderRepository` interface (port), and infrastructure implements it (adapter), so dependencies point **inward**.
  - craft-arch-8 · boolean · d2 — "For a working legacy app, a full rewrite is usually faster than incremental refactoring." → false (a moving target, lost edge-case knowledge, two systems to maintain).
  - craft-arch-9 · mcq · d2 — "Send an invoice after an order is placed": publish an event/queue a job (async; checkout does not fail when the invoicing service is down) vs a sync call (simpler; immediate errors). Pick async and name the cost.
  - craft-arch-10 · mcq · d3 ★ — An order spanning inventory, payment and shipping services with no distributed transaction: a saga with compensating actions (refund, release stock), not 2PC.
  - craft-arch-11 · short · d1 — "What is the short document that records one architecture decision, its context and consequences, usually called? (Type the acronym.)" → `['ADR', 'architecture decision record']`.
  - craft-arch-12 · mcq · d2 — Build vs buy for authentication in a CRUD SaaS: buy/adopt an IdP unless identity *is* your product. Weigh risk, compliance and maintenance against the licence cost.
  - craft-arch-13 · mcq · d3 ★ — Getting tech-debt work prioritised: quantify the interest (lead time, incident count, onboarding time), tie it to a roadmap item, and pay it down incrementally with features.
  - craft-arch-14 · mcq · d3 ★ — "Tell me about an architecture decision you'd reverse." A strong answer: the context at the time, the signal that it was wrong, the cost, how it was (or would be) unwound, and what process changed.

##### craft-incidents (prefix `craft-inc-`, ids 1–14) · 14 · d3 ≥ 5 · `ask` ≥ 5
- **Title:** Incidents, on-call and reliability
- **Blurb:** Mitigate first, communicate constantly, find causes later: running an incident, being on call, and postmortems that change things.
- **estMinutes:** 30
- **Objectives:**
  1. Run the first 15 minutes of an incident: assess, assign roles, mitigate
  2. Choose between rollback, turning a flag off and fixing forward, with a reason
  3. Write a blameless postmortem with contributing factors and owned actions
  4. Design on-call so it is sustainable: runbooks, alert hygiene and handovers
- **Primer outline:**
  1. What counts as an incident, and severity levels.
  2. Roles (incident commander, communications, operations/scribe; one channel; the IC does not debug).
  3. Mitigate before root cause (rollback, flag off, scale out, shed load, fail over).
  4. Communication (status page, stakeholder updates on a cadence, facts without speculation).
  5. Diagnosis under pressure ("what changed?": deploys, config/flags, traffic, dependencies, certificates; dashboards → traces → logs).
  6. After the incident (the postmortem: timeline, impact, contributing factors, the limits of the "five whys", action items with owners and dates; blameless culture).
  7. On-call health (runbooks, actionable alerts only, handovers, load and compensation).
  8. Reliability practices (error-budget policies, game days, restore drills, known dependency failure modes).
- **Questions:**
  - craft-inc-1 · mcq · d2 ★ — The first priority once a production incident is confirmed: mitigate user impact, before finding the root cause.
  - craft-inc-2 · order · d2 — Order the first 15 minutes: acknowledge the alert → assess impact and severity → declare an incident and name an incident commander → post a first status update → mitigate (e.g. roll back) → investigate the root cause.
  - craft-inc-3 · mcq · d2 — What the incident commander does: coordinates, decides and delegates. They don't debug, and they keep time and communication moving.
  - craft-inc-4 · mcq · d3 ★ — Errors spike after a deploy that included a DB migration adding a NOT NULL column. Can you just roll back? Only if the old code tolerates the new schema (expand/contract). Otherwise turn off the flag or fix forward.
  - craft-inc-5 · multi · d2 — Good places to look for "what changed?" (Select all) recent deploys ✔; config and feature-flag changes ✔; traffic pattern changes ✔; third-party status pages ✔; the last committer's other PRs, to assign blame ✘.
  - craft-inc-6 · mcq · d2 — A good status-page update: user-visible impact, what we are doing, and when the next update comes, with no speculative cause.
  - craft-inc-7 · mcq · d2 — What "blameless" means: focus on the conditions and system gaps that let a reasonable person make the mistake, not on who did it.
  - craft-inc-8 · boolean · d2 — "A postmortem is complete once the root cause has been identified." → false (it needs action items with owners and dates, which are then tracked).
  - craft-inc-9 · mcq · d3 ★ — The limitation of the "five whys": it produces a single linear chain. Real incidents have several contributing factors (detection, safeguards, process).
  - craft-inc-10 · mcq · d2 — Severity levels: SEV1 = core flow down for many users, SEV2 = degraded or a subset of users, SEV3 = minor with a workaround. Severity drives who is paged and the comms cadence.
  - craft-inc-11 · short · d1 — "What is the document called that tells the on-call engineer step by step how to respond to a specific alert? (One word.)" → `['runbook', 'playbook']`.
  - craft-inc-12 · mcq · d2 — On-call gets 30 pages a week and most are ignored. The fix: delete or retune every non-actionable alert, and give each remaining one a runbook and an owner.
  - craft-inc-13 · output · d2 ★ — Timeline: 13:10 flag change on reports; 14:02 deploy of checkout v142; 14:05 checkout 5xx rises to 8%. The most likely trigger (the 14:02 deploy) and the first action (roll back v142).
  - craft-inc-14 · mcq · d3 ★ — "Tell me about an outage you caused." A strong answer: impact, how it was detected, what you did first, what you learned, and the systemic fix, owned without blame-shifting or self-flagellation.

##### craft-review (prefix `craft-review-`, ids 1–14) · 14 · d3 ≥ 5 · `ask` ≥ 5
- **Title:** Code review, mentoring and technical leadership
- **Blurb:** Reviewing for what matters, feedback people act on, growing juniors, estimating honestly, and the design doc before the code.
- **estMinutes:** 25
- **Objectives:**
  1. Review a PR in priority order: correctness and security, then design, then style
  2. Write review comments that are specific, kind and actionable
  3. Mentor a junior with questions and scaffolding rather than answers
  4. Estimate with ranges, communicate uncertainty, and push back on scope constructively
- **Primer outline:**
  1. Why review (defects, shared ownership, knowledge transfer) and what tools should catch instead (formatting, lint, types, tests).
  2. What to look at, in order (correctness, security, data/migrations, API contracts, tests, design, naming).
  3. Writing comments (explain why, suggest, question vs request, label nits, conventional comments, approve-with-comments).
  4. Being reviewed (small PRs, a description with context and a test plan, self-review first).
  5. Mentoring (pairing, guiding questions, time-boxing when stuck, graduated autonomy, psychological safety, SBI feedback).
  6. Estimation (break down the work, ranges and assumptions, spikes for unknowns, say early when it is slipping).
  7. Design docs/RFCs (problem, goals/non-goals, options, decision, rollout, risks).
  8. Working with product (trade-offs in their language, scope/date/quality options, disagree and commit).
- **Questions:**
  - craft-review-1 · order · d2 ★ — Order the review priorities, most important first: correctness and security → data/migration and API-contract impact → tests → design and maintainability → naming and style nits.
  - craft-review-2 · mcq · d2 ★ — Pick the best review comment: specific, explains the risk and suggests a fix ("This loads every order into memory; with 100k rows that will OOM. Could we paginate with the existing cursor helper?"), vs "this is bad", vs "why?", vs a rewrite pasted with no context.
  - craft-review-3 · multi · d2 — What should be automated rather than argued in review? (Select all) formatting ✔; lint rules ✔; type errors ✔; running the tests ✔; whether authorisation is checked on the new endpoint ✘.
  - craft-review-4 · mcq · d2 — Why small PRs: review quality drops sharply with size, and small PRs merge faster with fewer conflicts.
  - craft-review-5 · mcq · d2 — What prefixing a comment with "nit:" (or "suggestion (non-blocking):") communicates, and why labelling blocking vs non-blocking matters.
  - craft-review-6 · boolean · d2 — "When a junior's PR needs a lot of changes, the senior should rewrite it themselves to save time." → false.
  - craft-review-7 · mcq · d2 — A junior has been stuck for a day. Ask what they have tried, give a pointer or pair for 30 minutes, and agree a time-box for next time.
  - craft-review-8 · mcq · d2 — The Situation–Behaviour–Impact (SBI) model for feedback, and why it beats "you're careless".
  - craft-review-9 · mcq · d3 ★ — "How long will the CSV import feature take?" A range with assumptions, and a one-day spike to de-risk the unknown file format, rather than a single optimistic number.
  - craft-review-10 · short · d1 — "What is a short, time-boxed investigation to reduce uncertainty before estimating called in agile teams? (One word.)" → `['spike', 'a spike']`.
  - craft-review-11 · mcq · d2 — Why a design doc has explicit **non-goals**: they stop scope creep and focus review on what is actually being decided.
  - craft-review-12 · mcq · d3 ★ — A long back-and-forth in PR comments about an approach. Move it to a short call, agree the criteria, record the decision in the PR, and disagree and commit.
  - craft-review-13 · mcq · d2 — Reviewing a diff (show code with `db.query("SELECT * FROM orders WHERE id = " + req.params.id)`, no ownership check, and a variable named `data2`): the comment that matters most is the SQL injection plus the missing authorisation, not the naming.
  - craft-review-14 · mcq · d3 ★ — "The deadline is unrealistic. What do you do?" Make the trade-off explicit and in writing: offer options (cut scope, move the date, add risk) with consequences, recommend one, and let the owner decide.
