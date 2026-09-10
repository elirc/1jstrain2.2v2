/**
 * Modules for stages 3 to 5: React, the Node/Express server, HTTP and API
 * design, and SQL/data modelling.
 */

/** @type {import('../types.d.ts').Module[]} */
export const stage345Modules = [
  {
    id: 'react-render',
    trackId: 'react',
    title: 'The rendering model',
    blurb: 'What a component is, what re-render really means, keys, and the JSX gotchas.',
    estMinutes: 30,
    objectives: [
      'Explain what happens between setState and the DOM changing',
      'Say why keys matter and why the array index is usually wrong',
      'Explain why `{count && <X/>}` renders a literal 0',
      'Distinguish props from state and know which one to reach for',
    ],
    primer: `
## What React does

A component is a function from props and state to a description of UI. Calling
it produces a tree of plain objects (React elements) — **not** DOM. React
compares that tree with the previous one and applies the minimum set of DOM
mutations. That comparison is reconciliation; "the virtual DOM" is just the name
for the object tree.

"Re-render" means **React called your function again**. It does not mean the DOM
changed. A re-render that produces the same output touches no DOM at all, which
is why "unnecessary re-renders" are usually cheap and rarely the real problem.

A component re-renders when its state changes, when its parent re-renders, or
when a context it consumes changes. Note the second one: props being "the same"
does not stop a re-render unless the component is wrapped in \`React.memo\`.

## JSX

JSX compiles to function calls: \`<Foo a={1}/>\` becomes \`jsx(Foo, { a: 1 })\`.
Consequences that show up as questions:

- Components must be capitalised, or JSX emits the string tag \`"foo"\`.
- \`class\` → \`className\`, \`for\` → \`htmlFor\`, and event props are
  camelCase (\`onClick\`).
- You return one root; \`<>...</>\` is a fragment that adds no DOM node.
- \`{}\` interpolates an expression, not a statement — no \`if\`, no \`for\`.
- \`false\`, \`null\`, \`undefined\` and \`true\` render nothing. **\`0\` does
  not.** \`{items.length && <List/>}\` renders a literal \`0\` on an empty
  array; write \`{items.length > 0 && <List/>}\`.

## Keys

Keys tell React which element in a list is which between renders. With the array
index as key, deleting the first item makes React think every item changed its
content rather than that one was removed — so component state (an input's typed
text, a checkbox) sticks to the wrong row. Use a stable id from the data. Index
keys are only safe when the list never reorders, never filters and never has
items removed.

Keys must be unique among **siblings**, not globally, and \`key\` is not
readable as a prop.

## Props vs state

Props come from the parent and are read-only inside the component. State is
owned by the component and changing it schedules a render. If a value can be
computed from props or existing state, **derive it during render** — do not copy
it into state, or you now have two sources of truth that drift.

## Purity

Rendering must be pure: same props and state, same output, no side effects. That
is why React 19's StrictMode double-invokes your component in development — to
surface impurity. Mutating a prop, writing to a module-level variable, or
calling \`fetch\` during render are all bugs the double-render is designed to
expose.
`,
  },
  {
    id: 'react-state',
    trackId: 'react',
    title: 'State, events and forms',
    blurb: 'useState properly, the updater form, controlled inputs, lifting state and useReducer.',
    estMinutes: 30,
    objectives: [
      'Explain why two setState calls with the same value only bump the counter once',
      'Know when the updater form is mandatory',
      'Build a controlled input and say what "controlled" means',
      'Decide between useState and useReducer with a real criterion',
    ],
    primer: `
## setState is asynchronous-ish

\`setCount(count + 1)\` does not change \`count\` — that variable is a const from
this render. React schedules a render with the new value and **batches** every
update in the same event (and since React 18, in promises and timeouts too).

\`\`\`js
setCount(count + 1);
setCount(count + 1);   // both compute from the same stale count -> +1 total

setCount(c => c + 1);
setCount(c => c + 1);   // queued functions, each sees the previous -> +2
\`\`\`

Use the **updater form** whenever the next value depends on the previous one.

## Immutability is not style

React compares with \`Object.is\`. \`state.items.push(x); setItems(state.items)\`
passes the same reference, so React bails out and nothing renders. Always create
a new array or object.

## Lazy initial state

\`useState(expensiveInit())\` calls \`expensiveInit\` on **every** render and
throws the result away. \`useState(expensiveInit)\` — passing the function —
calls it once.

## Controlled inputs

A controlled input's value comes from state and every keystroke goes through
\`onChange\`. That is what lets you validate, format and disable a submit
button. An uncontrolled input keeps its own value in the DOM and you read it
with a ref or on submit — fine for simple forms, and what libraries like
react-hook-form use for performance. Setting \`value\` without \`onChange\`
produces React's "you provided a value prop without an onChange handler"
warning, because the field is then read-only by accident.

## Lifting state up

When two siblings need the same value, move it to their nearest common parent
and pass it down with a callback back up. That is the whole answer, and it is
what "single source of truth" means in React. Reach for context or a store only
when the prop-passing depth genuinely hurts.

## useState vs useReducer

Switch to \`useReducer\` when the next state depends on several fields at once,
when several values must change together to stay consistent, or when the update
logic is worth testing on its own. A reducer is \`(state, action) => newState\`
— a pure function, easy to unit test without rendering anything.

## Where state should live

Local first. Lift only when shared. Server data is not really "state" you own —
it is a cache of someone else's data, which is the argument for React Query /
SWR rather than \`useState\` + \`useEffect\`. URL state (filters, page, selected
tab) usually belongs in the query string so links are shareable.
`,
  },
  {
    id: 'react-effects',
    trackId: 'react',
    title: 'Effects and data fetching',
    blurb: 'useEffect, dependencies, cleanup, race conditions, and the effects you should delete.',
    estMinutes: 35,
    objectives: [
      'Say what useEffect is actually for and name three cases where it is wrong',
      'Explain the three dependency-array forms',
      'Fix a fetch race condition',
      'Explain why StrictMode runs your effect twice',
    ],
    primer: `
## What effects are for

\`useEffect\` **synchronises your component with something outside React**:
subscriptions, timers, event listeners, imperative DOM APIs, analytics, and
(historically) data fetching. It is not a lifecycle hook and it is not "run this
after state changes".

You do **not** need an effect to:

- transform data for rendering — do it during render
- reset state when a prop changes — use a \`key\` on the component
- respond to a user event — put the logic in the event handler
- compute derived values — that is just a variable, or \`useMemo\` if expensive

"I updated state in an effect that depends on that state" is an infinite loop
waiting to happen.

## The dependency array

\`\`\`js
useEffect(fn);              // after every render
useEffect(fn, []);          // once after mount (and its cleanup on unmount)
useEffect(fn, [a, b]);      // when Object.is(a, prev a) is false
\`\`\`

Dependencies are compared by reference, so an inline object, array or function
is a *new* value each render and re-fires the effect every time. That is what
\`useCallback\`/\`useMemo\` are really for. Lying about dependencies to silence
the lint rule creates stale closures — the effect keeps seeing the values from
the render it was created in.

## Cleanup

Return a function and React runs it before the next effect and on unmount.
Anything you start, you stop: \`clearInterval\`, \`removeEventListener\`,
\`subscription.unsubscribe()\`, \`controller.abort()\`. Missing cleanup is the
source of "can't update state on an unmounted component" and of listeners
stacking up on every render.

## The race condition

\`\`\`js
useEffect(() => {
  let cancelled = false;
  fetch(\`/api/search?q=\${query}\`)
    .then(r => r.json())
    .then(data => { if (!cancelled) setResults(data); });
  return () => { cancelled = true; };
}, [query]);
\`\`\`

Without that flag, typing "re" then "react" can show the results for "re" if the
slower request lands second. This is the most-asked React bug in interviews.
\`AbortController\` is the better version because it also cancels the request.

## StrictMode

In development React 19 mounts, unmounts and remounts every component once, so
each effect runs twice. That is a **feature**: an effect with correct cleanup is
unaffected, so a double-run that breaks your code has found a real bug. It does
not happen in production.

## The modern answer

For server data, most teams now use React Query / SWR / a framework loader
rather than \`useEffect\` + \`useState\`. Saying so — and naming what you get
(caching, dedupe, retries, stale-while-revalidate, no hand-rolled race
handling) — is the mid-level answer.
`,
  },
  {
    id: 'react-perf',
    trackId: 'react',
    title: 'Re-renders and performance',
    blurb: 'memo, useMemo, useCallback, referential identity and how to find a real bottleneck.',
    estMinutes: 25,
    objectives: [
      'Explain what React.memo compares and when it does nothing',
      'Say when useMemo/useCallback are worth it and when they are noise',
      'Diagnose a slow list',
      'Explain why context updates re-render every consumer',
    ],
    primer: `
## Measure first

Most React "performance problems" are one slow render (a huge list, an expensive
computation in render) rather than too many renders. Use the React DevTools
Profiler and its "why did this render" highlight before optimising anything.
Premature \`useMemo\` everywhere costs readability and a little memory and
usually buys nothing.

## React.memo

Wraps a component so it skips re-rendering when its props are **shallow-equal**
to last time. It does nothing if you pass a new object, array or inline arrow
every render — which is exactly what you usually do:

\`\`\`jsx
<Row onSelect={() => select(id)} style={{ color: 'red' }} />
\`\`\`

Both props are new references each render, so \`memo\` compares, finds them
different, and re-renders anyway — now with extra overhead. \`memo\` pays off
for expensive subtrees with stable primitive props.

## useMemo and useCallback

\`useMemo(fn, deps)\` caches a **value**; \`useCallback(fn, deps)\` caches a
**function** (it is \`useMemo(() => fn, deps)\`). Two legitimate reasons to use
them:

1. The computation is genuinely expensive.
2. The value's **identity** matters — it is a dependency of an effect or a prop
   to a memoised child.

Neither is a guarantee: React may discard a memo cache. Never put logic with
side effects inside one.

## Context

Every consumer of a context re-renders when its **value** changes. A context
whose value is \`{ user, setUser }\` created inline re-renders every consumer on
every provider render. Fixes: memoise the value, split into two contexts
(state and dispatch — the dispatch one never changes), or use a store with
selectors (Zustand, Redux) so components subscribe to slices.

## Lists

Long lists are the usual real bottleneck: virtualise with
react-window/TanStack Virtual so only visible rows mount, keep row components
memoised with stable props, and avoid recreating handlers per row. Also check
you are not sorting/filtering the whole array on every keystroke without
memoising it.

## Beyond React

The biggest wins are often not React at all: code-split routes with
\`React.lazy\` + \`Suspense\`, ship less JavaScript, avoid a waterfall of
dependent requests, and serve images at the right size. Interviewers like
candidates who reach for the network tab before \`useMemo\`.
`,
  },
  {
    id: 'react-app',
    trackId: 'react',
    title: 'Structuring a real React app',
    blurb: 'Routing, context vs store, data libraries, error boundaries, forms and rendering strategies.',
    estMinutes: 30,
    objectives: [
      'Lay out a CRUD app folder structure and defend it',
      'Choose between local state, context, a store and a server-cache library',
      'Explain what an error boundary catches and what it does not',
      'Explain CSR vs SSR vs SSG in one sentence each',
    ],
    primer: `
## Folder structure

Two structures survive contact with a real app: **by feature**
(\`features/orders/{api,components,hooks}\`) for anything non-trivial, and
by type (\`components/\`, \`hooks/\`, \`lib/\`) for small apps. Feature folders
win because a change to "orders" touches one directory. Keep a shared \`ui/\`
for genuinely generic components and a \`lib/\` for the API client.

## Routing

A router maps URL → component, gives you nested layouts, route params
(\`/orders/:id\`), and search params. The URL is state you get for free: filters,
pagination and the selected tab belong there so links are shareable and the back
button works. Protected routes are a layout that checks auth and redirects.

## Which state tool

| Kind of state | Reach for |
| --- | --- |
| One component's UI | \`useState\` |
| Two siblings | lift to the parent |
| Whole-app, rarely changes (theme, current user) | context |
| Whole-app, changes often, many consumers | a store with selectors (Zustand, Redux Toolkit) |
| Data from the server | React Query / SWR / a loader |
| Filters, page, tab | the URL |

Context is a dependency-injection mechanism, not a state manager — it has no
selector, so every consumer re-renders on any change.

## Server data

A server-cache library handles caching by key, deduplication, background
refetch, stale-while-revalidate, retries, pagination and mutation invalidation.
Rebuilding that with \`useEffect\` is where junior codebases drown. Optimistic
updates mean applying the change locally, then rolling back if the request
fails — always with a rollback path.

## Error boundaries and Suspense

An error boundary is a component that catches errors thrown **during rendering**
of its subtree and shows a fallback. It does not catch errors in event handlers,
in async callbacks, or on the server render. Only class components can be error
boundaries (or a library wrapper). \`<Suspense>\` shows a fallback while a lazy
component or a suspending data source is pending.

## Rendering strategies

- **CSR** — the browser downloads JS and renders. Simple; slower first paint;
  weaker SEO.
- **SSR** — HTML rendered per request, then hydrated. Fast first paint, live
  data, more server cost.
- **SSG** — HTML built at deploy time. Fastest and cheapest; content is fixed
  until the next build (ISR revalidates it on a timer).
- **RSC** (React Server Components) — components that run only on the server,
  ship no JS, and can query the database directly. \`"use client"\` marks the
  boundary where interactivity begins.

## Accessibility, briefly

Use semantic elements (\`<button>\`, not a clickable \`<div>\`), label every
input (\`htmlFor\`/\`aria-label\`), keep focus visible, and make sure keyboard
users can reach everything. Testing Library queries by role and label precisely
so that untestable markup and inaccessible markup are the same failure.
`,
  },
  {
    id: 'node-runtime',
    trackId: 'node',
    title: 'The Node runtime',
    blurb: 'What Node is, non-blocking I/O, the module system, env config, streams and npm scripts.',
    estMinutes: 25,
    objectives: [
      'Explain how one thread serves thousands of concurrent requests',
      'Name what Node does off-thread and why',
      'Load configuration from the environment correctly',
      'Say when a stream beats reading a whole file',
    ],
    primer: `
## What Node is

V8 (the JS engine) plus libuv (an event loop and a thread pool) plus a standard
library of APIs the browser does not have: \`fs\`, \`http\`, \`path\`,
\`crypto\`, \`process\`. Your JavaScript runs on **one thread**.

## How one thread serves many requests

Because almost nothing blocks it. When you read a file or query a database, Node
hands the work to the OS or to libuv's thread pool and returns to the loop
immediately; your callback runs when the result is ready. Concurrency here means
interleaving waiting, not running code in parallel.

The corollary is the thing interviewers want to hear: **CPU-bound work destroys
a Node server**, because it blocks the loop for every request at once. For that,
use \`worker_threads\`, a queue, or another service. \`cluster\`/PM2 fork one
process per core to use the whole machine.

Node's loop has named phases (timers, pending callbacks, poll, check, close).
Two orderings worth knowing: \`setImmediate\` runs in the check phase (after
poll) while \`setTimeout(fn, 0)\` runs in the timers phase, and
\`process.nextTick\` jumps the queue ahead of promise microtasks.

## Configuration

Read config from \`process.env\`, never from committed files. \`.env\` is for
local development, is git-ignored, and has a committed \`.env.example\`
counterpart. Node 20+ can load it with \`--env-file\`. Validate config at
startup and crash immediately if something required is missing — a server that
boots without its database URL just fails later, more confusingly.

\`process.env\` values are always strings: \`PORT\` needs \`Number(...)\`, and
\`"false"\` is truthy.

## Streams

A stream processes data in chunks instead of loading it all into memory.
\`fs.readFile\` on a 2GB upload buys a 2GB spike; piping it through a stream
uses a fixed buffer. Readable, Writable, Duplex, Transform; \`pipeline()\` from
\`node:stream/promises\` wires them up **with** error propagation, which raw
\`.pipe()\` does not do. Backpressure is the writable telling the readable to
slow down.

## Scripts and the CLI

\`npm run x\` runs the \`x\` script with local binaries on PATH. \`npx pkg\`
runs a package without installing it globally. \`node --watch\` restarts on file
changes (replacing nodemon for simple cases), and \`node --inspect\` opens a
debugger you can attach devtools to. Prefer \`npm ci\` in CI.
`,
  },
  {
    id: 'node-express',
    trackId: 'node',
    title: 'Express: routing, middleware, errors',
    blurb: 'The middleware pipeline, req/res, body parsing, validation, error handling and layering.',
    estMinutes: 30,
    objectives: [
      'Explain the middleware pipeline and why order matters',
      'Write a correct error-handling middleware',
      'Say where validation belongs and what it returns',
      'Split a route handler into layers a reviewer would accept',
    ],
    primer: `
## The pipeline

An Express app is an ordered list of functions \`(req, res, next)\`. Each one
can respond, mutate \`req\`, or call \`next()\` to pass control on. **Order is
everything**: a logger registered after your routes logs nothing, and an auth
middleware registered after a route does not protect it.

\`\`\`js
app.use(express.json());          // parse JSON bodies -> req.body
app.use(cors({ origin, credentials: true }));
app.use('/api/orders', requireAuth, ordersRouter);
app.use(notFound);                // no route matched
app.use(errorHandler);            // 4 args -> error middleware
\`\`\`

If you never call \`next()\` and never respond, the request hangs until it times
out. Calling \`next()\` *after* responding causes "Cannot set headers after they
are sent".

## Routers

\`express.Router()\` is a mini-app you mount under a path — one router per
resource keeps \`index.js\` readable and lets you attach middleware per resource.
Route params are \`req.params\`, query string is \`req.query\` (always strings,
and \`?a=1&a=2\` gives an array), body is \`req.body\` (undefined without a body
parser — a very common "why is req.body undefined" bug).

## Error handling

Error middleware is identified by having **four** parameters
\`(err, req, res, next)\` and must be registered last. Throw typed errors from
your services and translate them once:

\`\`\`js
function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: { code: err.code ?? 'internal_error', message: status >= 500 ? 'Something went wrong' : err.message },
  });
}
\`\`\`

Never leak stack traces or SQL text to a client. In Express 4, an async handler
that rejects does **not** reach this middleware — wrap it (\`asyncHandler\`) or
call \`next(err)\`. Express 5 forwards rejections automatically.

## Validation

Validate at the edge, before any business logic, with a schema (Zod, Joi,
express-validator). Invalid input is \`400\` with a machine-readable list of
field errors — not a 500, not a thrown database constraint error. Never trust
\`req.body\` to have the shape your types claim; TypeScript is gone at runtime.

## Layering

Route (HTTP in/out) → service (business rules, no \`req\`/\`res\`) →
repository (SQL). The test: your service functions should be callable from a
cron job or a CLI without inventing a fake request. That separation is exactly
what a mid-level interview is checking for when it asks you to "structure a
Node API".

## Production hygiene

\`helmet\` for security headers, \`cors\` configured to an allowlist (not
\`*\` with credentials), rate limiting on auth routes, \`morgan\`/pino for
request logs with a request id, compression, graceful shutdown on \`SIGTERM\`,
and a \`/health\` endpoint for the load balancer.
`,
  },
  {
    id: 'node-auth',
    trackId: 'node',
    title: 'Authentication and authorisation',
    blurb: 'Sessions vs JWT, cookie flags, password hashing, refresh tokens and RBAC.',
    estMinutes: 30,
    objectives: [
      'State the difference between authentication and authorisation',
      'Compare server sessions and JWTs with real trade-offs',
      'Store a password correctly and say why',
      'Set the four cookie flags that matter and explain each',
    ],
    primer: `
## Two different words

**Authentication** — who are you. **Authorisation** — what are you allowed to
do. \`401 Unauthorized\` actually means *unauthenticated*; \`403 Forbidden\`
means authenticated but not allowed. The HTTP spec named them badly and every
interviewer knows it.

## Passwords

Hash with a **slow, salted** algorithm designed for passwords: bcrypt, scrypt or
Argon2. Never MD5, never SHA-256 — they are fast, which is exactly the wrong
property. bcrypt salts automatically and stores the salt and cost factor in the
hash string. Never store, log or email a plaintext password, and compare with
the library's \`compare\` (constant-time), not \`===\`.

## Sessions vs JWT

**Server session**: a random opaque id in a cookie, with the real state in
Redis/the database. Revoking is a delete. Costs a lookup per request, and needs
shared storage across instances.

**JWT**: a signed, base64url-encoded JSON payload the server verifies without
any lookup. Stateless and easy to scale — but **you cannot revoke it** before it
expires, and its contents are readable by anyone (signed ≠ encrypted, so no
secrets in the payload). The usual compromise: a short-lived access token
(minutes) plus a long-lived, revocable, rotating refresh token stored server
side.

"Just use a session cookie unless you have a specific reason not to" is a
perfectly good senior answer.

## Cookie flags

- \`HttpOnly\` — JavaScript cannot read it, so XSS cannot steal it.
- \`Secure\` — HTTPS only.
- \`SameSite=Lax\` (default) blocks the cookie on cross-site POSTs, which kills
  most CSRF; \`Strict\` is tighter; \`None\` requires \`Secure\` and is for
  genuine cross-site APIs.
- \`Max-Age\`/\`Expires\` — lifetime. Also set \`Path\` and \`Domain\`
  deliberately.

## CSRF vs XSS

**XSS** runs attacker JS in your page — it defeats almost everything, so
escaping output and a Content-Security-Policy come first. **CSRF** makes the
victim's browser send an authenticated request; it exists only because cookies
are attached automatically. Defences: \`SameSite\`, a synchroniser token, or
using a header-based token (which is why token-in-header APIs are not
CSRF-prone).

## Authorisation in the code

Check permissions **server side, per request, on the resource** — not by hiding
a button. The classic vulnerability is IDOR: \`GET /api/orders/123\` returning
someone else's order because you checked "is logged in" but not "owns this row".
Every query should be scoped by the owner, and role checks (\`admin\`,
\`seller\`) belong in middleware close to the route.

## OAuth / OIDC, in one paragraph

OAuth 2.0 delegates *authorisation* ("let this app read your Drive"); OpenID
Connect adds an identity layer on top and is what "Sign in with Google" is.
Browser apps use the authorization-code flow with PKCE; the implicit flow is
deprecated. The client never sees the user's password.
`,
  },
  {
    id: 'web-http',
    trackId: 'web',
    title: 'HTTP semantics',
    blurb: 'Methods, status codes, idempotency, headers, caching and content negotiation.',
    estMinutes: 25,
    objectives: [
      'Give the right status code for any CRUD outcome',
      'Explain idempotency and which methods have it',
      'Explain what a browser does with Cache-Control and ETag',
      'Read a request/response pair and say what went wrong',
    ],
    primer: `
## Methods

| Method | Safe | Idempotent | Body | Typical use |
| --- | --- | --- | --- | --- |
| GET | yes | yes | no | read |
| POST | no | **no** | yes | create / actions |
| PUT | no | yes | yes | full replace |
| PATCH | no | no | yes | partial update |
| DELETE | no | yes | maybe | remove |

**Safe** = no server state change. **Idempotent** = doing it five times leaves
the same state as doing it once. DELETE is idempotent even though the second
call returns 404 — the *state* is the same. POST is not, which is why a
double-clicked submit creates two orders, and why real payment APIs take an
idempotency key.

## Status codes

- **2xx** — 200 OK, 201 Created (+\`Location\`), 202 Accepted (async), 204 No
  Content (successful DELETE or an update returning nothing).
- **3xx** — 301 permanent, 302/307 temporary (307 preserves the method), 304 Not
  Modified (your cached copy is still good).
- **4xx** — *you* got it wrong: 400 malformed, 401 unauthenticated, 403
  forbidden, 404 missing, 405 wrong method, 409 conflict (duplicate email,
  version clash), 422 well-formed but semantically invalid, 429 rate limited.
- **5xx** — *the server* got it wrong: 500 unhandled, 502 bad gateway, 503
  unavailable, 504 upstream timeout.

Returning \`200 { "error": ... }\` for a failure is the anti-pattern
interviewers listen for.

## Headers you should know

\`Content-Type\` (what this body is), \`Accept\` (what I want back),
\`Authorization: Bearer ...\`, \`Cookie\`/\`Set-Cookie\`, \`Cache-Control\`,
\`ETag\`/\`If-None-Match\`, \`Location\`, \`X-Request-Id\` for tracing.

## Caching

\`Cache-Control: max-age=31536000, immutable\` for hashed build assets;
\`no-store\` for anything private; \`no-cache\` means "revalidate before using",
not "do not cache". Validation: the server sends an \`ETag\`, the browser sends
it back as \`If-None-Match\`, and the server answers \`304\` with no body if
nothing changed. That is why hashed filenames plus long max-age is the standard
front-end deployment pattern.

## Statelessness, HTTPS, HTTP/2

HTTP is stateless — each request stands alone, which is why sessions need
cookies or tokens. TLS encrypts everything above TCP, including the path and
headers (the hostname leaks via SNI). HTTP/2 multiplexes many requests over one
connection, which removed most of the reason for sprite sheets and bundling
everything into one file.
`,
  },
  {
    id: 'web-api-design',
    trackId: 'web',
    title: 'Designing a CRUD API',
    blurb: 'Resource URLs, pagination, filtering, versioning, error shapes, DTOs and CORS.',
    estMinutes: 30,
    objectives: [
      'Design the endpoints for a resource and defend the URLs',
      'Choose between offset and cursor pagination',
      'Specify a consistent error response shape',
      'Explain CORS, preflight, and why your fix did not work',
    ],
    primer: `
## Resources, not verbs

URLs name **things**; the method is the verb. Plural nouns, lowercase,
hyphenated, no trailing slash, no file extensions:

\`\`\`
GET    /api/orders?status=open&page=2
POST   /api/orders
GET    /api/orders/42
PATCH  /api/orders/42
DELETE /api/orders/42
GET    /api/orders/42/items          # nest one level for real containment
POST   /api/orders/42/cancel         # actions that are not CRUD: allowed, be honest
\`\`\`

\`/getOrders\` and \`/createOrder\` are the classic junior smell. Nesting more
than one level (\`/users/1/orders/2/items/3\`) is another — once you have an id,
address the resource directly.

## Pagination, filtering, sorting

Offset (\`?page=2&limit=20\`) is trivial and fine for small, stable data, but it
gets slower deep in the table and can skip or repeat rows when data changes
between pages. Cursor (\`?limit=20&cursor=eyJpZCI6NDJ9\`) is stable and fast and
is what feeds use. Always cap \`limit\`, always return total/next-cursor
metadata, and whitelist sortable fields — passing \`?sort=\` straight into SQL
is an injection.

## Response shape

Be boringly consistent. Pick one and never deviate:

\`\`\`json
{ "data": [ ... ], "meta": { "page": 2, "total": 137 } }
{ "error": { "code": "validation_failed", "message": "…", "fields": { "email": "Invalid" } } }
\`\`\`

Return **DTOs, not entities**: your database row has \`password_hash\`,
\`internal_notes\` and a \`deleted_at\` that no client should ever see. Mapping
explicitly also stops a schema rename from silently breaking every consumer.

## Versioning

\`/api/v1/...\` in the path is the pragmatic default (visible, cacheable, easy to
route). Header-based versioning is purer and harder to debug. The real skill is
**avoiding** a version: adding optional fields is backwards-compatible;
removing or renaming a field, or changing a type, is not.

## CORS

Same-origin policy is enforced by the *browser*. A cross-origin request is sent
and processed; the browser then withholds the response unless the server allowed
it. So a CORS error is fixed **on the server**, and no front-end change will fix
it (and yes, the row still appeared in your database).

For anything that is not a "simple" request — a custom header, or a method other
than GET/HEAD/POST, or a JSON content type — the browser first sends an
\`OPTIONS\` **preflight** and expects \`Access-Control-Allow-Origin\`,
\`-Methods\` and \`-Headers\` in the reply. With cookies you need
\`credentials: 'include'\` on the client plus
\`Access-Control-Allow-Credentials: true\` and a **specific** origin on the
server — \`*\` is illegal with credentials. In development, a dev-server proxy
sidesteps the whole thing by making the request same-origin.

## Also worth saying out loud

Rate limit with \`429\` and \`Retry-After\`; make destructive endpoints
idempotent or key them; return \`201\` with a \`Location\` header on create; use
\`PATCH\` for partial updates and mean it; document with OpenAPI so the contract
is a file, not folklore.
`,
  },
  {
    id: 'data-sql',
    trackId: 'data',
    title: 'SQL you will actually write',
    blurb: 'SELECT, JOINs, GROUP BY, NULL semantics, and the queries interviewers ask you to write.',
    estMinutes: 30,
    objectives: [
      'Write a JOIN + GROUP BY query from a plain-English requirement',
      'Explain the difference between WHERE and HAVING',
      'Explain why `= NULL` never matches',
      'Say what a LEFT JOIN gives you that an INNER JOIN does not',
    ],
    primer: `
## Logical order of evaluation

You write \`SELECT\` first, but the engine evaluates:

\`\`\`
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
\`\`\`

That order explains two classic gotchas: you cannot use a \`SELECT\` alias in
\`WHERE\` (it does not exist yet), and \`WHERE\` filters **rows before**
grouping while \`HAVING\` filters **groups after** it.

## Joins

- \`INNER JOIN\` — rows with a match on both sides.
- \`LEFT JOIN\` — every left row; unmatched right columns are NULL. This is how
  you find "customers with no orders": \`LEFT JOIN ... WHERE o.id IS NULL\`.
- \`RIGHT\`/\`FULL\` — the mirror and the union.
- \`CROSS JOIN\` — every combination; usually an accident.

Putting a condition on the right table in \`WHERE\` instead of in the \`ON\`
clause turns a LEFT JOIN back into an INNER JOIN — a real and very common bug.

## Aggregation

\`\`\`sql
SELECT c.id, c.name, COUNT(o.id) AS order_count, COALESCE(SUM(o.total), 0) AS lifetime
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid'
WHERE c.created_at >= '2024-01-01'
GROUP BY c.id, c.name
HAVING COUNT(o.id) > 3
ORDER BY lifetime DESC
LIMIT 10;
\`\`\`

Every non-aggregated column in \`SELECT\` must be in \`GROUP BY\`.
\`COUNT(*)\` counts rows; \`COUNT(col)\` skips NULLs; \`COUNT(DISTINCT col)\`
does what it says. Aggregates other than \`COUNT(*)\` ignore NULLs.

## NULL

NULL means *unknown*, so every comparison with it is unknown, not false:
\`x = NULL\` never matches — use \`IS NULL\`. \`NOT IN (subquery containing a
NULL)\` returns no rows at all, which is a genuinely nasty afternoon. Use
\`COALESCE(x, fallback)\`, and remember \`NULL\` sorts to one end and is skipped
by \`UNIQUE\` in most engines.

## The rest of the toolkit

\`DISTINCT\`, \`IN\`/\`EXISTS\` (prefer \`EXISTS\` for correlated subqueries),
\`BETWEEN\`, \`LIKE\` (leading \`%\` cannot use an index), \`CASE WHEN\`,
\`UNION\` (dedupes) vs \`UNION ALL\` (does not, and is faster), CTEs
(\`WITH x AS (...)\`) for readability, and window functions
(\`ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC)\`) for
"the latest row per group" — the query that separates people who have used SQL
from people who have read about it.

## Writes

\`INSERT INTO t (a, b) VALUES (...) RETURNING id\`, \`UPDATE t SET ... WHERE\`,
\`DELETE FROM t WHERE\`. **Always** write the \`WHERE\` first. Prefer a soft
delete (\`deleted_at\`) when anything references the row. Upsert is
\`INSERT ... ON CONFLICT (col) DO UPDATE\` in Postgres/SQLite,
\`MERGE\` in SQL Server.
`,
  },
  {
    id: 'data-modeling',
    trackId: 'data',
    title: 'Schema, indexes, transactions and ORMs',
    blurb: 'Normalisation, keys, indexing, N+1, transactions, migrations and SQL vs NoSQL.',
    estMinutes: 30,
    objectives: [
      'Model a one-to-many and a many-to-many relationship',
      'Say what an index costs as well as what it buys',
      'Recognise and fix an N+1 query',
      'Explain what a transaction guarantees',
    ],
    primer: `
## Relationships

**One-to-many** — the foreign key lives on the *many* side
(\`orders.customer_id\`). **Many-to-many** — a join table
(\`order_id\`, \`product_id\`) whose primary key is usually the pair, plus any
data about the relationship such as \`quantity\`. **One-to-one** — a unique
foreign key, usually a sign the tables should be merged unless you are splitting
off rarely-read columns.

Normalisation to 3NF means every fact lives in exactly one place, so an update
touches one row. Deliberate denormalisation (a cached \`order_count\`) trades
write complexity for read speed — fine, if you say out loud that you are doing
it and how it stays correct.

## Keys and constraints

A surrogate primary key (auto-increment or UUID) is the default; a natural key
(an email) becomes painful the day it changes. Auto-increment integers are small
and index well but leak volume and do not work for distributed generation;
UUIDv4 is random and fragments B-tree indexes, which is why UUIDv7/ULID
(time-ordered) exist.

Put the constraints in the database — \`NOT NULL\`, \`UNIQUE\`, \`CHECK\`,
foreign keys with a deliberate \`ON DELETE\` (\`CASCADE\`, \`RESTRICT\`,
\`SET NULL\`). Application-only validation fails the moment a second service, a
script, or a race condition shows up.

## Indexes

An index is a sorted structure that turns a full scan into a lookup. It costs
disk and slows every write, so index what you filter, join and sort on — not
everything. Primary keys are indexed automatically; **foreign keys usually are
not**, and that is a very common cause of slow joins.

A composite index \`(customer_id, created_at)\` serves queries filtering on
\`customer_id\`, or on both, but not on \`created_at\` alone — leftmost prefix.
Wrapping a column in a function (\`WHERE LOWER(email) = ...\`) or a leading
wildcard \`LIKE '%x'\` defeats the index. Diagnose with \`EXPLAIN\` /
\`EXPLAIN ANALYZE\` and look for a sequential scan on a big table.

## Transactions

A transaction is all-or-nothing: **A**tomic, **C**onsistent, **I**solated,
**D**urable. Wrap any multi-statement change that must not half-apply —
transfer money, create an order and decrement stock. Keep them short; a
transaction held open across an HTTP call is how you deadlock a database.
Isolation levels trade correctness against concurrency (read committed is the
usual default; the anomalies are dirty read, non-repeatable read, phantom read).
Optimistic concurrency — a \`version\` column checked in the \`WHERE\` — is the
standard way to stop two users overwriting each other.

## The N+1 problem

Fetch 50 orders, then loop and fetch each order's customer: 51 queries. Fix it
with a join, an eager \`include\`, or one \`WHERE id IN (...)\` batch. It is the
single most common ORM performance bug and it is invisible until the table
grows. Turn on query logging in development and count.

## ORMs

They save you mapping code and give type-safe queries and migrations; they cost
you a leaky abstraction and easy-to-miss inefficiency. Know what SQL your ORM
emits. **Migrations** are versioned, committed, forward-only schema changes —
never edit a shipped migration, never change a production schema by hand, and
expand-then-contract (add the column, backfill, switch reads, drop the old one)
lets you deploy without downtime.

## SQL vs NoSQL

Relational when your data has relationships and you need transactions and ad-hoc
queries — which is nearly every CRUD app. Document stores when the shape is
genuinely document-like, schema varies, and you scale by sharding on a known
access key. "We used Mongo because it was easy to start" is an honest answer;
"because it is web-scale" is not.
`,
  },
];
