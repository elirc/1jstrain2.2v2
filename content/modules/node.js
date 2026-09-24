/**
 * Modules — Node and Express on the server: the runtime, Express and auth
 * (stage 4), talking to the database (stage 5) and background jobs (stage 9).
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const nodeModules = [
  {
    id: 'node-runtime',
    trackId: 'node',
    title: 'The Node runtime',
    blurb: 'What Node is, non-blocking I/O, the module system, env config, streams and npm scripts.',
    estMinutes: 35,
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

## What blocks the loop

Anything synchronous that takes long blocks every request, not just the one
that triggered it. The usual culprits in a CRUD API:

- \`JSON.parse\` or \`JSON.stringify\` on a multi-megabyte payload
- the \`*Sync\` APIs: \`readFileSync\`, \`bcrypt.hashSync\`, \`crypto.pbkdf2Sync\`
- a regular expression with catastrophic backtracking run on user input (ReDoS)
- a big loop over rows you should have aggregated in SQL

What does **not** block: an awaited database query or HTTP call (the loop is
free while you wait), and the callback or promise versions of \`crypto.pbkdf2\`,
\`scrypt\` and \`zlib\`, which run on the thread pool. \`await\` does not make
CPU work asynchronous; it only waits for something that already is.

## nextTick and the queues

Node's loop has named phases (timers, pending callbacks, poll, check, close).
\`setImmediate\` runs in the check phase (after poll) while \`setTimeout(fn, 0)\`
runs in the timers phase. Whenever the current piece of JavaScript finishes,
Node drains two queues before moving on: first the \`process.nextTick\` queue,
then the promise microtask queue.

\`\`\`js
setTimeout(() => log('timeout'));
setImmediate(() => log('immediate'));
Promise.resolve().then(() => log('promise'));
process.nextTick(() => log('tick'));
log('sync');
\`\`\`

In a CommonJS script this logs \`sync\`, \`tick\`, \`promise\`, then \`timeout\` and
\`immediate\` in either order: at the top level the timer race depends on how
fast the process started (inside an I/O callback \`setImmediate\` always wins).
In an ES module the top-level code itself runs as part of a promise job, so the
microtask queue drains first and \`promise\` logs **before** \`tick\`.
Recursive \`nextTick\` starves the loop; prefer \`queueMicrotask\` or
\`setImmediate\` for "later".

## Threads, processes and cluster

| Tool | What it is | Use it for |
| --- | --- | --- |
| \`worker_threads\` | Another V8 isolate in the same process, talking by messages | CPU work (image resize, a huge parse) without blocking the loop |
| \`child_process\` | A separate OS process running any program | Running \`ffmpeg\`, \`git\` or a script |
| \`cluster\` | Several Node processes sharing one listening port | Using every core on one machine |

In containers the usual answer to "use all cores" is more replicas behind a load
balancer rather than \`cluster\`.

## Configuration

Read config from \`process.env\`, never from committed files. \`.env\` is for
local development, is git-ignored, and has a committed \`.env.example\`
counterpart. Node 20.6+ loads it with \`node --env-file=.env server.js\`, and
Node 20.12+ also has \`process.loadEnvFile()\`, so \`dotenv\` is optional.
Validate config at startup and crash immediately if something required is
missing — a server that boots without its database URL just fails later, more
confusingly.

\`process.env\` values are always strings: \`PORT\` needs \`Number(...)\`, and
\`"false"\` is truthy.

## Streams

A stream processes data in chunks instead of loading it all into memory.
\`fs.readFile\` on a 2GB upload buys a 2GB spike; piping it through a stream
uses a fixed buffer. Readable, Writable, Duplex, Transform.

**Backpressure** is the writable telling the readable to slow down:
\`writable.write(chunk)\` returns \`false\` once its internal buffer passes its
\`highWaterMark\`. Stop writing and wait for the \`'drain'\` event; ignoring the
signal means buffering the whole input in memory after all.

Use \`pipeline()\` from \`node:stream/promises\` rather than \`.pipe()\`:

\`\`\`js
import { pipeline } from 'node:stream/promises';
await pipeline(createReadStream(file), parseCsv(), toRows, insertBatch);
\`\`\`

It handles backpressure, rejects if **any** stage fails, and destroys every
stream so no file handle or socket leaks. Raw \`.pipe()\` does not forward errors,
so a failing source leaves the destination open. Readable streams are also
async iterables: \`for await (const chunk of stream)\` is the simplest consumer.

A failed pipeline does not undo work already done. If the transform throws on
row 50,000 of an import, the rows inserted so far stay in the database unless
the import runs in a transaction. Decide up front: all-or-nothing in one
transaction, or resumable batches with a checkpoint.

## EventEmitter's error event

\`'error'\` is special: if an emitter emits it and nobody listens, Node **throws**
the error, and an uncaught throw crashes the process. Every stream, socket and
client you create needs an error listener (or a \`pipeline\`, which attaches one).

## Request context with AsyncLocalStorage

Passing a request id through every function just to log it is noise.
\`AsyncLocalStorage\` from \`node:async_hooks\` carries a value through every
\`await\`, callback and timer started inside \`run()\`:

\`\`\`js
const als = new AsyncLocalStorage();
app.use((req, res, next) => als.run({ requestId: req.id }, next));
// anywhere later in that request:
logger.info({ ...als.getStore() }, 'order created');
\`\`\`

It is how pino, OpenTelemetry and APM agents correlate logs and traces without
threading a context argument through every call.

## Built-ins you no longer install

- \`--env-file\` / \`process.loadEnvFile()\` instead of \`dotenv\`
- \`node --watch\` instead of nodemon for simple restarts
- \`node:test\` and \`node:assert\` as a test runner (\`node --test\`)
- global \`fetch\`, \`AbortController\` and \`AbortSignal.timeout()\` instead of an HTTP library for simple calls

## TypeScript on Node

Current Node (22.18+ and 24) runs \`.ts\` files directly by **stripping** the
type annotations. It does not type-check, and syntax that has to generate
code — \`enum\`, \`namespace\` with values, constructor parameter properties — is
rejected unless you opt into transforms. So: \`node file.ts\` (or \`tsx\`, which
also works on older Node) for development, \`tsc --noEmit\` in CI to actually
check the types, and for production either keep to erasable syntax or compile
with \`tsc\` or esbuild.

## Graceful shutdown, in order

Orchestrators send \`SIGTERM\`, wait a grace period (30 s by default in
Kubernetes), then send \`SIGKILL\`. On \`SIGTERM\`:

1. \`server.close()\` — stop accepting new connections.
2. Let in-flight requests finish, with a deadline shorter than the grace period.
3. Close the database pool, queue clients and other connections.
4. Exit with code 0 (or 1 if the deadline hit).

Closing the pool before in-flight requests finish fails exactly the requests you
were trying to protect.

## Finding a memory leak

Memory that grows steadily until the container is OOM-killed is a leak, not
load. Take a heap snapshot (\`--inspect\` and Chrome DevTools,
\`v8.writeHeapSnapshot()\`, or \`--heapsnapshot-signal\`), let traffic run, take a
second one, and compare them: the object type whose count keeps growing, and
what retains it, is the leak. The usual suspects are a module-level \`Map\` used
as a cache with no size limit or TTL, event listeners added per request and
never removed (Node warns once an emitter has more than 10), and closures in
long-lived objects that capture request data. Restarting on a schedule hides a
leak; it does not fix it.

## Things that bite in production

An unhandled promise rejection terminates the process by default (Node 15+) —
that is deliberate; log it, do not swallow it. A \`Buffer\` is raw bytes and a
string is text in an encoding: decode after concatenating chunks, not per
chunk. In ESM there is no \`__dirname\` — use \`import.meta.dirname\`. The libuv
thread pool (4 threads by default, \`UV_THREADPOOL_SIZE\`) handles \`fs\`,
\`dns.lookup\`, \`crypto.pbkdf2\`/\`scrypt\` and \`zlib\`; network sockets do
not use it.

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
    estMinutes: 35,
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

A well-structured app has the same layers every time, and a request meets them
in this order: global middleware (request id, logging, body parsing, security
headers) → authentication → the resource router and its validation → the
handler → a service → a repository. Each layer can assume the one before it
has run.

## Route order

Routes are matched top to bottom, and the first match wins. Two consequences
show up in every codebase:

\`\`\`js
app.get('/users/:id', getUser);
app.get('/users/me', getMe);     // never reached: ':id' matched 'me'
\`\`\`

Put literal paths before parameterised ones (or constrain the parameter in the
handler). And \`app.use(requireAuth)\` protects everything registered **after**
it — including a \`/health\` route you meant to leave public, so the load
balancer suddenly gets 401 and marks every instance unhealthy. Register public
routes first, or mount the auth middleware on the routers that need it:
\`app.use('/api', requireAuth, apiRouter)\`.

## Routers

\`express.Router()\` is a mini-app you mount under a path — one router per
resource keeps \`index.js\` readable and lets you attach middleware per
resource. Route params are \`req.params\`, query string is \`req.query\`
(strings, arrays of strings for repeated keys, and in Express 4 possibly nested
objects), body is \`req.body\` (undefined without a body parser — a very common
"why is req.body undefined" bug).

## Error handling

Error middleware is identified by having **four** parameters
\`(err, req, res, next)\` and must be registered last. Throw typed errors from
your services and translate them once:

\`\`\`js
function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: { code: err.code ?? 'internal_error', message: status >= 500 ?
    'Something went wrong' : err.message },
  });
}
\`\`\`

Never leak stack traces or SQL text to a client. In Express 4, an async handler
that rejects does **not** reach this middleware — wrap it (\`asyncHandler\`) or
call \`next(err)\`. Express 5 forwards rejections automatically: an \`async\`
handler that throws or rejects lands in your error middleware exactly like
\`next(err)\`, so a failed database call becomes one 500 instead of a crashed
process.

When nothing matches at all, Express's built-in final handler answers
**404** with a small HTML page ("Cannot GET /x"). An API should register its
own not-found middleware after the routes so clients get JSON instead.

## Validation

Validate at the edge, before any business logic, with a schema (Zod, Joi,
express-validator). Invalid input is \`400\` with a machine-readable list of
field errors — not a 500, not a thrown database constraint error. Never trust
\`req.body\` to have the shape your types claim; TypeScript is gone at runtime.

Write it once as middleware so no handler can forget it:

\`\`\`js
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: { code: 'validation_failed',
      details: result.error.issues } });
  }
  req.body = result.data;          // parsed, coerced, unknown keys stripped
  next();
};
router.post('/', validate(createOrder), createOrderHandler);
\`\`\`

\`safeParse\` returns a result instead of throwing, so the failure path is a
normal branch; the handler only ever runs with valid input. Some teams answer
\`422\` for well-formed but invalid input; pick one and document it. To validate
the query string, parse \`req.query\` into a local variable: in Express 5 it is
a getter and cannot be reassigned.

## Layering

Route (HTTP in/out) → service (business rules, no \`req\`/\`res\`) →
repository (SQL). The test: your service functions should be callable from a
cron job or a CLI without inventing a fake request. That separation is exactly
what a mid-level interview is checking for when it asks you to "structure a
Node API". The repository layer is covered in depth in *Talking to the database
from Node*.

Work that takes more than a second or two does not belong in the request at
all: accept it, return \`202\` with a job id and hand it to a queue. Covered in
depth in *Background jobs, queues and resilience*.

## Production hygiene

\`helmet\` for security headers, \`cors\` configured to an allowlist (not
\`*\` with credentials), rate limiting on auth routes, \`morgan\`/pino for
request logs with a request id, compression, graceful shutdown on \`SIGTERM\`,
and a \`/health\` endpoint for the load balancer.

## Security middleware

\`app.use(helmet())\` sets a group of response headers with safe defaults: a
\`Content-Security-Policy\`, \`Strict-Transport-Security\`,
\`X-Content-Type-Options: nosniff\`, \`X-Frame-Options\`, \`Referrer-Policy\` and a
few cross-origin policies, and it removes \`X-Powered-By\`. It does **not** do
CORS (that is the \`cors\` package, which *relaxes* the same-origin policy for
origins you list) and it does not rate-limit (\`express-rate-limit\` or, better,
the gateway in front of you). The default CSP will block inline scripts, which
is the point; loosen it deliberately, not by turning it off.

## Body size and uploads

\`express.json()\` rejects bodies over **100 kB** by default with a \`413\`
(the error has \`type: 'entity.too.large'\`). Raise it per route
(\`express.json({ limit: '10mb' })\` on the import endpoint), not globally, since
every byte of a JSON body is buffered and parsed on the loop.

Files are not JSON. With multer, \`memoryStorage()\` holds each whole file in a
\`Buffer\`: fine for a 2 MB avatar, a disaster for video, because twenty
concurrent 200 MB uploads is 4 GB of RAM and an OOM kill. For big files use
\`diskStorage()\` or, better, stream straight to object storage (or hand the
client a pre-signed upload URL so the bytes never touch your server), and always
set \`limits: { fileSize }\` so one request cannot fill the disk.

## Structured logging

\`console.log\` in production gives you unstructured text with no level, no
request id and nothing a log search can filter on. Use a JSON logger such as pino
(with \`pino-http\`): one line per event, levels you can filter, and a request id
on every line so one failing request can be pulled out of millions. Child
loggers (\`req.log.child({ orderId })\`) add context once, and redaction keeps
tokens and passwords out of the logs.

## Express 5 vs 4

Express 5 (npm \`latest\` since March 2025) changes a handful of things you will
be asked about: rejected promises from handlers and middleware are forwarded to
error middleware, so \`asyncHandler\` wrappers are unnecessary; the path syntax
moved to path-to-regexp 8 — wildcards must be named (\`/files/*splat\`),
optional segments use braces (\`/users{/:id}\`), and regex characters in string
paths are gone; \`req.query\` is a read-only getter and the default query parser
is \`simple\` (no nested objects); \`req.body\` is \`undefined\` until a parser
runs; \`res.status()\` rejects invalid codes; and \`app.del\`,
\`req.param(name)\`, \`res.sendfile\` and \`res.json(obj, status)\` are removed.
Behind a reverse proxy, set \`app.set('trust proxy', n)\` so \`req.ip\` and
\`req.protocol\` come from \`X-Forwarded-*\` — with the real hop count, not
\`true\`, because the header is client-supplied.
`,
  },
  {
    id: 'node-auth',
    trackId: 'node',
    title: 'Authentication and authorisation',
    blurb: 'Sessions vs JWT, cookie flags, password hashing, refresh tokens and RBAC.',
    estMinutes: 35,
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

## Comparing secrets

\`===\` on strings returns as soon as the first byte differs, so the response time
leaks how much of a guessed API key or HMAC signature was right, and an attacker
can recover it byte by byte. Compare secrets with
\`crypto.timingSafeEqual(a, b)\`. It throws when the buffers differ in length, so
hash both sides first (for example SHA-256) and compare the digests; that also
hides the length. Better still, store API keys hashed and look them up by hash,
the same as passwords.

## Password reset done right

1. Generate a random token (\`crypto.randomBytes(32)\`), never a guessable id.
2. Store only its **hash**, with an expiry of about 30 minutes, so a database leak does not hand out working reset links.
3. Respond identically whether or not the email exists ("if an account exists, we sent a link"), so the form cannot enumerate users.
4. On use, check the hash and expiry, set the new password, delete the token (single use) and revoke existing sessions.

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

## Sessions across instances

The default \`express-session\` store is in memory: it leaks, and it breaks the
moment you run a second instance, because the load balancer sends the next
request to a process that has never seen the session. Put sessions in Redis or
the database (\`connect-redis\`, \`connect-pg-simple\`) so any instance can serve
any request. Sticky sessions are the fragile alternative: a deploy or a crashed
instance logs its users out, and load spreads unevenly.

## Verifying JWTs properly

\`jwt.decode()\` only base64-decodes; it proves nothing. \`jwt.verify()\` with the
right options does the real work:

\`\`\`js
jwt.verify(token, publicKey, {
  algorithms: ['RS256'],            // pin it: never trust the header's alg
  issuer: 'https://auth.example.com',
  audience: 'orders-api',
});                                  // exp and nbf are checked by default
\`\`\`

Pinning the algorithm stops the classic attacks (\`alg: none\`, or an RS256
public key used as an HS256 secret). Checking \`iss\` and \`aud\` stops a token
minted for another service, or another tenant, from being accepted by yours.

## Logging out with JWTs

Deleting the token in the browser does not invalidate it; anyone who copied it
can use it until \`exp\`. The real answer is architectural: short-lived access
tokens (5–15 minutes) plus a refresh token stored server side, so logout
revokes the refresh token and the access token dies on its own shortly after.
If "log out now" must be immediate, keep a denylist of \`jti\` values until their
expiry, which is a lookup per request, i.e. a session by another name.

## Refresh-token rotation

Every time a refresh token is used, issue a new one and invalidate the old one,
keeping them linked as a *family*. If an already-used token is presented again,
two parties hold it, so one of them stole it: revoke the whole family and force
a fresh login. Store refresh tokens hashed, in an \`HttpOnly\` cookie scoped to
the refresh path.

## Cookie flags

- \`HttpOnly\` — JavaScript cannot read it, so XSS cannot steal it.
- \`Secure\` — HTTPS only.
- \`SameSite=Lax\` blocks the cookie on cross-site POSTs, which kills most CSRF
  (Chromium treats a missing attribute as \`Lax\`; Firefox and Safari do not, so
  set it explicitly); \`Strict\` is tighter; \`None\` requires \`Secure\` and is
  for genuine cross-site APIs.
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

Regenerate the session id on login (session fixation); return one error message
for unknown user and wrong password (enumeration); rate-limit login per IP *and*
per account (credential stuffing); keep tokens in an \`HttpOnly\` cookie rather
than \`localStorage\`, which any XSS can read.

## OAuth / OIDC, in one paragraph

OAuth 2.0 delegates *authorisation* ("let this app read your Drive"); OpenID
Connect adds an identity layer on top and is what "Sign in with Google" is.
Browser apps use the authorization-code flow with PKCE; the implicit flow is
deprecated. The client never sees the user's password.

## Authorization code with PKCE

PKCE (Proof Key for Code Exchange) stops an intercepted authorization code from
being useful to anyone but the app that started the flow:

1. The app generates a random \`code_verifier\` and derives \`code_challenge = BASE64URL(SHA256(verifier))\`.
2. It redirects the user to the authorize endpoint with the \`code_challenge\`.
3. The user authenticates at the identity provider and consents.
4. The provider redirects back to the app with a short-lived \`code\`.
5. The app exchanges the \`code\` plus the original \`code_verifier\` for tokens; the provider checks they match.

The implicit flow (tokens straight in the redirect URL) is deprecated because
those tokens leak through history, logs and referrers. For a SPA the strongest
setup is a small backend-for-frontend (BFF): the server runs the code flow,
keeps the tokens, and gives the browser only an \`HttpOnly\` session cookie.

## MFA, TOTP and passkeys

A second factor turns a leaked password into a failed login. Authenticator
apps implement **TOTP** (time-based one-time password, RFC 6238): a shared
secret plus the current 30-second window produce a 6-digit code. It is far
better than SMS, but still phishable: a fake login page can relay the code in
real time.

**Passkeys** (WebAuthn) fix that. The device holds a private key per site and
signs a server challenge; the browser only uses a credential for the origin
(relying-party id) it was created for, so a look-alike domain gets nothing,
and there is no shared secret that the user types or the server can leak.
`,
  },
  // Stage 5 — last in the Data stage, after data-queries.
  {
    id: 'node-data',
    trackId: 'node',
    title: 'Talking to the database from Node',
    blurb:
      'Drivers, pools, parameterised queries, transactions in code, and choosing between raw SQL, a query builder and an ORM.',
    estMinutes: 30,
    objectives: [
      'Configure a connection pool and say what happens when it runs dry',
      'Write parameterised queries and transactions that always release their connection',
      'Compare raw SQL, query builders and ORMs (Prisma, Drizzle, Knex) honestly',
      'Run migrations as part of the deploy, not by hand',
    ],
    primer: `
## Drivers

A driver speaks the database's wire protocol. For Postgres that is \`pg\`
(node-postgres) or \`postgres\` (postgres.js); for MySQL, \`mysql2\`; for SQLite,
\`better-sqlite3\`, which is synchronous on purpose because SQLite is an in-process
library, not a server. Everything else (query builders, ORMs, migration tools)
sits on top of a driver.

In \`pg\` there are two objects. A \`Client\` is one connection. A \`Pool\` owns
several clients and lends them out:

\`\`\`js
import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                         // connections this process may open
  connectionTimeoutMillis: 5000,   // fail instead of waiting forever
});
const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
\`\`\`

Create **one pool per process** at startup, share it, and close it on shutdown.

## Pools

Opening a Postgres connection is expensive: a TCP handshake, usually TLS,
authentication, and a new backend process on the server with its own memory.
Doing that per request adds milliseconds to every request and, under load, runs
straight into the server's hard limit, \`max_connections\` (100 by default). A
pool pays the setup once and reuses warm connections.

The number that matters is the total: **instances × pool size** must stay
below \`max_connections\`, minus a margin for migrations, admin sessions and
other services. Twenty containers with a pool of 20 want 400 connections from a
server that allows 100, and the symptom is "too many clients" errors exactly
when traffic peaks and the autoscaler adds instances. Fixes, in order: smaller
pools (a pool of 5–10 per instance is plenty for most APIs, because a query
holds a connection for milliseconds), and a connection pooler such as PgBouncer
in transaction mode, which multiplexes thousands of client connections onto a
few dozen real ones. Serverless functions make this worse: every cold start
opens its own pool, so put a pooler (or the provider's proxy) in front.

When every connection is checked out, \`pool.query\` waits for one to come back.
With \`pg\`'s default \`connectionTimeoutMillis\` of 0 it waits **forever**, so an
exhausted pool shows up as requests that hang, not as errors. Set a timeout,
and watch pool wait time as a metric.

## Parameterised queries

Never build SQL by concatenating or interpolating values. Send the SQL text and
the values separately and let the driver bind them:

\`\`\`js
// injectable: the value becomes part of the SQL text
await pool.query(\`SELECT * FROM users WHERE email = '\${email}'\`);
// safe: $1 is a placeholder, the value travels separately
await pool.query('SELECT * FROM users WHERE email = $1', [email]);
\`\`\`

\`pg\` uses \`$1, $2, …\`; \`mysql2\` uses \`?\`. The server parses the SQL before it
ever sees the value, so no value can change the statement's structure.
Binding also lets drivers use prepared statements (postgres.js does
automatically; \`pg\` does when you give the query a \`name\`), which reuse the
parsed statement across calls.

Tagged-template helpers look like interpolation but are not:

\`\`\`js
const users = await sql\`SELECT * FROM users WHERE email = \${email}\`;
\`\`\`

A tag function receives the string parts and the values separately, so
postgres.js, Prisma's \`$queryRaw\`, Drizzle's \`sql\` and slonik turn each
\`\${}\` into a \`$n\` parameter. The same line **without** the tag, passed to
\`pool.query\`, is a plain template string and fully injectable. Every ORM also
has an "unsafe" raw method (\`$queryRawUnsafe\`, \`sql.raw\`, \`knex.raw\` with string
building); those are exactly as dangerous as concatenation.

Placeholders only work for **values**. Table names, column names, \`ASC\`/\`DESC\`
and SQL keywords cannot be parameters, so a user-chosen sort column must be
checked against an allowlist:

\`\`\`js
const SORTABLE = { created: 'created_at', total: 'total_cents' };
const column = SORTABLE[req.query.sort] ?? 'created_at';
\`\`\`

## Transactions in code

A transaction lives on **one connection**. \`pool.query('BEGIN')\` checks out a
connection, runs \`BEGIN\`, and returns that connection to the pool; the next
\`pool.query\` may get a different one. On an idle laptop the pool usually hands
back the same connection, so the bug passes every test and appears under load:
the order commits without its items, and some other request's queries run
inside the stray open transaction. Check out a client and keep it:

\`\`\`js
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
\`\`\`

The \`finally\` is the important line. A handler that calls \`release()\` only on
the success path leaks one connection per error; after \`max\` errors the pool is
empty and every request hangs. Write the helper once, test it, and never call
\`pool.connect()\` anywhere else.

## Mapping rows

Rows come back with the database's column names, so map \`snake_case\` to
\`camelCase\` in the repository (or with the query builder's plugin), and never
return raw rows from the API. Watch the types \`pg\` hands you:

| Postgres type | JavaScript value | Why |
| --- | --- | --- |
| \`int4\`, \`float8\` | \`number\` | fits safely |
| \`int8\` / \`bigint\`, including \`COUNT(*)\` | \`string\` | may exceed \`Number.MAX_SAFE_INTEGER\` |
| \`numeric\` | \`string\` | exact decimal; a float would round money |
| \`timestamptz\` | \`Date\` | an absolute instant (UTC inside) |
| \`json\`, \`jsonb\` | parsed object | parsed by the driver |

Convert deliberately: \`Number(count)\` for counts you know are small, a decimal
library or integer cents for money, or a custom type parser. Store instants as
\`timestamptz\`, never as local-time strings; send ISO strings over the API and
format for the user's time zone in the client.

## Query builders and ORMs

| Tool | Style | Types | Watch for |
| --- | --- | --- | --- |
| Knex | Chainable SQL builder, plus migrations | Weak without extra work | Easy to drift from the schema |
| Kysely | Typed SQL builder | Inferred from a DB interface | You maintain or generate the types |
| Drizzle | SQL-shaped TypeScript; schema in TS | Inferred from the schema | Still SQL; you design the queries |
| Prisma | Schema file → generated client | Generated, excellent | Its own query layer; complex SQL needs raw |

Honest trade-offs: an ORM makes CRUD faster and typed, but it can hide N+1
queries behind a property access or a loop over \`findUnique\`, and it may
generate poor SQL for reports. It does not remove the need to understand SQL
(you still read \`EXPLAIN\`) and it does not make injection impossible once you
reach for an unsafe raw method.

Raw SQL in an ORM codebase is normal, not a failure. Reports, window functions,
recursive CTEs, bulk \`UPDATE … FROM\` and upserts with complex conflict rules are
clearer and faster as SQL. Use the ORM's tagged raw API so values stay
parameterised, keep the query in the repository, and type the result.

## Migrations and seeding

Schema changes are code: versioned migration files (Prisma Migrate, drizzle-kit,
Knex, node-pg-migrate) applied in order and recorded in a table. Rules:

- Run migrations in the deploy pipeline as their own step, before the new code starts, never by hand against production.
- Never edit a migration that has already run anywhere shared; its recorded checksum or version will not match, and environments silently diverge. Write a new migration instead.
- Prefer forward-only changes and expand/contract: add the new column, backfill, switch the code, then drop the old one in a later release.
- Seed data for development lives in a script, separate from migrations.

## Testing against a real database

Repository code is SQL, so test it against the engine you run in production.
SQLite or an in-memory fake disagrees on types, \`ON CONFLICT\` details, \`ILIKE\`,
JSONB, constraint timing and error codes, so the tests pass and production fails.
Testcontainers starts a throwaway Postgres in Docker for the test run; apply the
migrations once, then isolate tests with a transaction per test that is rolled
back, or by truncating tables between tests. Build test rows with small factory
functions so each test states only the fields it cares about. Mock the
repository in *service* tests; never mock SQL in *repository* tests.
`,
  },
  // Stage 9 — Run it in production.
  {
    id: 'node-jobs',
    trackId: 'node',
    title: 'Background jobs, queues and resilience',
    blurb:
      'Work off the request path, retries that are safe, idempotent consumers, the outbox, and timeouts and breakers around flaky dependencies.',
    estMinutes: 30,
    objectives: [
      'Decide what runs in the request and what goes to a queue',
      'Make a job safe to retry with idempotency and at-least-once delivery',
      'Explain the dual-write problem and how the outbox pattern solves it',
      'Put timeouts, retries with backoff and a circuit breaker around a flaky dependency',
    ],
    primer: `
## Why queues

The request path should do only what the user must wait for: validate, write
the essential rows, answer. Everything else goes to a queue and a worker:

- **Latency.** Sending a welcome email, rendering a PDF invoice or resizing an image takes seconds and involves a third party; the user should not wait for it.
- **Spikes.** A queue absorbs a burst and the workers drain it at a steady rate, instead of the burst hitting the email provider or the database all at once.
- **Retries.** A failed job can be retried with backoff; a failed inline call is just an error page.
- **Isolation.** A slow dependency slows the workers, not every API request.

The rule of thumb: if it can fail independently of the request or takes more
than a second or two, return \`202 Accepted\` with a job id and do it in the
background. Validation, authorisation and the core write stay in the request,
because the user needs their answer.

## Tools

| Tool | What it is | Good for |
| --- | --- | --- |
| BullMQ | Jobs in Redis, with retries, delays, priorities, repeatable jobs | Most Node apps that already run Redis |
| SQS | Managed queue on AWS, visibility timeout, dead-letter redrive | AWS shops; no broker to run |
| RabbitMQ | A broker with exchanges, routing and acks | Routing, fan-out, many consumers |
| Postgres table | \`SELECT … FOR UPDATE SKIP LOCKED\` (pg-boss, graphile-worker) | Modest volumes, jobs in the same transaction as your data |

The Postgres option deserves more credit than it gets. Workers claim jobs with:

\`\`\`sql
UPDATE jobs SET status = 'running', locked_at = now()
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY run_at FOR UPDATE SKIP LOCKED LIMIT 1
) RETURNING *;
\`\`\`

\`SKIP LOCKED\` makes each worker skip rows another worker has locked, so several
workers claim different jobs without blocking each other, and the job can be
inserted in the same transaction as the order that caused it.

## Delivery semantics

- **At-most-once**: acknowledge, then process. A crash loses the message.
- **At-least-once**: process, then acknowledge. A crash after the work but before the ack means the message is delivered **again**.
- **Exactly-once**: what brokers advertise, but between a broker and your own side effects (a database write, a card charge, an email) it does not exist end to end. A crash can always land between "did the work" and "recorded that I did it".

So design for at-least-once and make every consumer **idempotent**: processing
the same message twice has the same effect as once. Ways to get there:

- a \`processed_messages\` table with the message id as primary key, inserted in the same transaction as the job's writes; a duplicate hits the unique constraint and is skipped
- natural keys and upserts (\`INSERT … ON CONFLICT DO NOTHING\`)
- an **idempotency key** on calls to external providers; payment APIs such as Stripe accept one, derived from something stable like the order id, and return the original result for a repeat

Without one of these, a worker that charges a card and crashes before acking
charges the customer twice when the message is redelivered.

## Retries

Retry transient failures (timeouts, connection resets, 5xx, 429 honouring
\`Retry-After\`), never permanent ones: a 400 validation error or a 404 will fail
identically forever. A good policy:

- exponential backoff (1 s, 2 s, 4 s, 8 s…) so a struggling dependency gets room to recover
- jitter (randomise each delay) so a thousand failed jobs do not retry in the same millisecond
- a maximum number of attempts, then move the message to a **dead-letter queue**

A dead-letter queue parks *poison messages*, the ones that keep failing, so they
stop blocking or burning worker time, while an alert tells a human to look.
Messages in the DLQ are data to inspect and replay after the fix, not garbage.

Retries multiply load. A client that retries three times sends up to four
requests per call, exactly when the dependency is already struggling, and
retries without a timeout pile up waiting requests until your own service runs
out of memory or connections. Retries need timeouts, backoff and a limit.

## The dual-write problem and the outbox

\`\`\`js
await db.saveOrder(order);
await queue.publish('order.created', order);   // the process dies here
\`\`\`

Two systems, two writes, no shared transaction: a crash, deploy or broker
outage between the lines leaves an order that no one hears about. Swapping the
lines just creates the opposite bug, an event for an order that was never
saved. This is the **dual-write problem**.

The **transactional outbox** fixes it with the one transaction you have:

1. \`BEGIN\`
2. Insert the order **and** a row in an \`outbox\` table describing the event.
3. \`COMMIT\`: both exist or neither does.
4. A relay process reads unsent outbox rows.
5. It publishes each one to the broker.
6. It marks them as sent.

If the relay crashes between publishing and marking, the event is published
again, which is fine because consumers are idempotent. Change data capture
(Debezium reading the database's write-ahead log) is the heavier alternative:
no polling, but another system to run.

## Timeouts and cancellation

Every outbound call gets a timeout. Without one, a dependency that hangs holds
your sockets, memory and pool connections until everything backs up. In modern
Node pass a signal:

\`\`\`js
const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
\`\`\`

On expiry the request is actually aborted (the socket is closed) and \`fetch\`
rejects with a \`TimeoutError\`. \`Promise.race\` against a sleep is not the same
thing: the caller gets its error, but the losing request **keeps running** and
keeps its socket until it finishes on its own. Propagate deadlines too: if the
incoming request has 3 s left, a downstream call should not be given 10 s.
\`AbortSignal.any([a, b])\` combines a caller's signal with a timeout.

## Circuit breakers, bulkheads and fallbacks

A **circuit breaker** wraps calls to one dependency and tracks failures:

| State | Behaviour |
| --- | --- |
| Closed | Normal: calls go through, failures are counted |
| Open | Too many failures: calls fail immediately without touching the dependency |
| Half-open | After a cooldown, a trial call is let through; success closes, failure re-opens |

Failing fast protects your own threads, sockets and latency, and gives the
dependency room to recover. Libraries such as opossum implement it.

A **bulkhead** caps how much of your capacity one dependency can consume: a
separate connection pool or a concurrency limit, so a slow payment provider
exhausts its own ten slots and not the whole server. A **fallback** decides what
the user sees when the breaker is open: cached data, a degraded feature, or
"we will email you when it is confirmed".

When a provider slows from 300 ms to 30 s, the complete answer combines them:
a timeout on the call, a breaker that opens, a bulkhead so other endpoints keep
working, and, for anything the user need not wait for, moving the call to a
queue and letting the client poll for the status.

## Operating queues

- **Watch lag, not CPU.** The age of the oldest message and a depth that keeps growing tell you workers are falling behind; worker CPU can look fine while the backlog grows. Alert on age.
- **Visibility timeouts.** SQS hides a received message for a set time; if processing takes longer, the message reappears and a second worker processes it too. Set it above the worst-case job time or extend it while working.
- **Graceful worker shutdown.** On \`SIGTERM\`, stop taking new jobs, finish or release the current ones, then exit, the same shape as an HTTP server.
- **Scheduled jobs.** A \`setInterval\` or \`node-cron\` inside the API process runs once **per instance**: scale to three instances and the daily digest goes out three times. Use one scheduler: a repeatable job in the queue (BullMQ deduplicates it by key), a platform cron such as a Kubernetes CronJob, or a distributed lock (a Postgres advisory lock) around the run.
`,
  },
];
