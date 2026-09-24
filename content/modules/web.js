/**
 * Modules — HTTP semantics and API design (stage 4), and performance and
 * caching across the stack (stage 9).
 *
 * One file per author, so parallel authors never touch the same file. Each
 * module carries a primer that covers everything its questions test. Primers
 * are markdown-lite — headings, lists, `code`, fenced blocks, tables, **bold**
 * and *italic*; validateContent() rejects anything the renderer cannot show.
 */

/** @type {import('../types.d.ts').Module[]} */
export const webModules = [
  {
    id: 'web-http',
    trackId: 'web',
    title: 'HTTP semantics',
    blurb: 'Methods, status codes, idempotency, headers, caching and content negotiation.',
    estMinutes: 35,
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
| PATCH | no | not necessarily | yes | partial update |
| DELETE | no | yes | maybe | remove |

**Safe** = no server state change. **Idempotent** = doing it five times leaves
the same state as doing it once. DELETE is idempotent even though the second
call returns 404 — the *state* is the same. POST is not, which is why a
double-clicked submit creates two orders, and why real payment APIs take an
idempotency key.

## Status codes

- **2xx** — 200 OK, 201 Created (+\`Location\`), 202 Accepted (async), 204 No
  Content (successful DELETE or an update returning nothing).
- **3xx** — 301/308 permanent, 302/307 temporary (307 and 308 preserve the
  method and body), 304 Not Modified (your cached copy is still good).
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

## Cache-Control in depth

RFC 9111 defines HTTP caching (it obsoletes RFC 7234, which older articles
still cite); RFC 9110 defines the semantics around it. Two kinds of cache
matter: the **private** cache in the browser, and **shared** caches (CDNs,
reverse proxies) that serve one stored response to many users.

| Directive | Meaning |
| --- | --- |
| \`max-age=60\` | fresh for 60 s in any cache |
| \`s-maxage=300\` | overrides \`max-age\`, for shared caches only |
| \`private\` | only the browser may store it |
| \`public\` | shared caches may store it, even for an authenticated request |
| \`no-cache\` | may store, must revalidate before every reuse |
| \`no-store\` | never store |
| \`immutable\` | do not revalidate while fresh, not even on reload (RFC 8246) |
| \`stale-while-revalidate=30\` | for 30 s after expiry, serve the stale copy and refetch in the background (RFC 5861) |

So \`private, max-age=60\` is "the browser may keep it a minute, CDNs never",
and \`public, s-maxage=300, max-age=0\` is "the CDN keeps it five minutes,
browsers ask every time": you purge the CDN on change and browsers always get
the latest edge copy. With \`max-age=60, stale-while-revalidate=30\`, a request
at second 75 is answered instantly from the stale copy while the cache refetches;
after second 90 it has to wait for the origin.

The deploy pattern: hashed assets (\`app.3f9a1c.js\`) get
\`public, max-age=31536000, immutable\` because the URL *is* the version: new
content means a new filename, so a cached copy can never be wrong.
\`index.html\` gets \`no-cache\`, so after a deploy the browser revalidates, gets
the new HTML and follows it to the new hashes. Cache the HTML for a day and
users run yesterday's bundle against today's API.

### Shared caches and private data

A shared cache keys on the URL (plus whatever \`Vary\` names), not on who asked.
\`GET /api/me\` with a bare \`max-age=60\` behind a CDN serves one user's profile
to the next user. RFC 9111 stops a shared cache reusing a response to a request
that carried \`Authorization\` unless the response opts in, but cookie-authenticated
requests get no such protection, and RFC 9111 notes that \`Set-Cookie\` does not by
itself prevent caching. Anything per-user gets \`private\` or \`no-store\`; a response
that sets a session cookie gets \`no-store\`.

\`Vary\` (RFC 9110) lists the request headers that change the response, and caches
add them to the key. If you reflect the request's \`Origin\` into
\`Access-Control-Allow-Origin\`, send \`Vary: Origin\`, or the CDN replays the first
origin's header to every other origin and the browser blocks the response.
\`Vary: Accept-Encoding\` is normal; varying on \`Cookie\` or \`User-Agent\` fragments
the cache until it is useless.

### Revalidation step by step

\`\`\`http
HTTP/1.1 200 OK
ETag: "v7"
Cache-Control: no-cache

GET /api/products/42 HTTP/1.1
If-None-Match: "v7"

HTTP/1.1 304 Not Modified
ETag: "v7"
\`\`\`

The server's first response carries the tag, the browser stores it with the
body, the next request sends the tag back as \`If-None-Match\`, the server
compares it with the current version, and \`304\` (no body) tells the browser to
reuse its copy. \`Last-Modified\` with \`If-Modified-Since\` is the same idea
using a date with one-second resolution.

## Conditional writes (If-Match / 412)

The same ETag protects writes. Two admins load product 42 at \`"v7"\`; A saves,
and the version becomes \`"v8"\`. B's \`PUT\` with \`If-Match: "v7"\` must not be
applied: the server answers \`412 Precondition Failed\` (RFC 9110), and B's
client re-fetches and shows the conflict. That is optimistic concurrency over
HTTP; the ETag plays the part of a \`version\` column
(\`UPDATE ... WHERE id = 42 AND version = 7\`). Without it the last write
silently wins: a lost update. To make clients send the precondition, reject
unconditional writes with \`428 Precondition Required\`.

## Content negotiation

\`Accept\` says what the client wants back; \`Content-Type\` says what it is
sending. If you cannot produce anything the \`Accept\` header allows, that is
\`406 Not Acceptable\` (many APIs send JSON anyway, which RFC 9110 permits). If
you cannot read the request's \`Content-Type\` (or \`Content-Encoding\`), that is
\`415 Unsupported Media Type\`. In Express, \`express.json()\` skips a body whose
type is not JSON, so \`req.body\` is simply undefined: check the type and return
415 instead of crashing three functions later.

## Redirects for non-GET requests

RFC 9110 allows a user agent to turn a \`POST\` into a \`GET\` when following a
\`301\` or \`302\` "for historical reasons", and browsers do exactly that, dropping
the body. \`303 See Other\` always means "now GET this" (post/redirect/get).
\`307\` (temporary) and \`308\` (permanent) must repeat the same method and body.
Moving an endpoint that receives writes? Use \`308\`. Browsers cache \`301\` and
\`308\` hard, so test one before you ship it.

## Statelessness, HTTPS, HTTP/2

HTTP is stateless — each request stands alone, which is why sessions need
cookies or tokens. TLS encrypts everything above TCP, including the path and
headers (the hostname leaks via SNI). HTTP/2 multiplexes many requests over one
connection, which removed most of the reason for sprite sheets and bundling
everything into one file.

## HTTPS, HSTS and cookies

TLS hides the path, query string, headers, cookies and body from anyone on the
wire. It does not hide the server's IP address, and the hostname usually leaks
through plain DNS and the SNI field of the TLS handshake; Encrypted Client Hello
(ECH) plus encrypted DNS closes that gap where browser and server both support
it. A token in a query string is still a bad idea: it lands in server logs,
browser history and \`Referer\`.

\`Strict-Transport-Security: max-age=63072000; includeSubDomains\` (HSTS,
RFC 6797) tells the browser to use only HTTPS for the domain for that long: it
rewrites \`http://\` links itself and refuses to let the user click through a
certificate error. The header is ignored over plain HTTP, and the very first
visit is only protected if the domain is on the browsers' preload list. Start
with a short \`max-age\`; it is hard to take back.

Session cookies get the attributes from the current revision of the cookie spec
(RFC 6265bis): \`Secure\` (sent over HTTPS only), \`HttpOnly\` (invisible to
JavaScript), \`SameSite=Lax\` or \`Strict\` (withheld from most cross-site
requests; Chromium treats a cookie without \`SameSite\` as \`Lax\`), and the
\`__Host-\` name prefix, which demands \`Secure\`, \`Path=/\` and no \`Domain\`.

## Push to the browser: polling, SSE, WebSockets

| Option | Direction | Good for | Cost |
| --- | --- | --- | --- |
| Polling | client asks | updates every 30 s or slower | wasted requests; latency equals the interval |
| Server-Sent Events | server to client | notifications, status feeds, progress | one open response per client |
| WebSockets | both ways | chat, collaborative editing, games | a separate protocol: auth, heartbeats and reconnects are yours |

SSE is an ordinary HTTP response with \`Content-Type: text/event-stream\` that
never ends. The browser's \`EventSource\` reconnects on its own and sends
\`Last-Event-ID\` so the server can resume, and it rides your existing cookies,
proxies and HTTP/2. For a dashboard that only *receives* "order status changed",
SSE is the default; reach for WebSockets when the client also streams messages
up. On HTTP/1.1 each open stream holds one of the browser's six connections per
origin, so serve SSE over HTTP/2. HTTP/2 server push is not an option: browsers
removed it.
`,
  },
  {
    id: 'web-api-design',
    trackId: 'web',
    title: 'Designing a CRUD API',
    blurb: 'Resource URLs, pagination, filtering, versioning, error shapes, DTOs and CORS.',
    estMinutes: 35,
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
POST   /api/orders/42/cancel         # actions that are not CRUD: allowed, be
honest
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
{ "error": { "code": "validation_failed", "message": "…", "fields": { "email":
"Invalid" } } }
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

Same-origin policy is enforced by the *browser*. A *simple* cross-origin request
is sent and processed; the browser then withholds the response unless the server
allowed it. A non-simple one is preceded by a preflight, and if the preflight
fails the real request is never sent. So a CORS error is fixed **on the
server**, and no front-end change will fix it (and yes, the row still appeared
in your database).

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

## Problem Details (RFC 9457)

Rather than invent an error shape, use Problem Details (RFC 9457, which
obsoletes RFC 7807), served as \`application/problem+json\`:

\`\`\`json
{
  "type": "https://api.example.com/problems/validation",
  "title": "Your request is not valid",
  "status": 422,
  "detail": "2 fields failed validation",
  "instance": "/orders/req-8f2c",
  "errors": { "email": ["Must be a valid email"], "qty": ["Must be at least 1"] }
}
\`\`\`

\`type\` is the stable, machine-readable identifier clients branch on; \`title\`
is the human summary for that type; \`status\` repeats the HTTP status;
\`detail\` explains this occurrence; \`instance\` identifies it. Anything else,
such as \`errors\` for field-level validation or a \`traceId\`, is an extension
member. ASP.NET Core emits it via \`AddProblemDetails()\`; in Express it is one
error-handling middleware.

## Validation failures: 400 or 422

RFC 9110 defines \`422 Unprocessable Content\` for a request whose content type
the server understands and whose syntax is correct, but whose instructions it
cannot process: the textbook validation failure. \`400 Bad Request\` is the
general client error, classically malformed syntax. Frameworks split:
ASP.NET Core's \`[ApiController]\` answers 400 with validation problem details,
while FastAPI and Rails use 422. Pick one, document it, and use it everywhere.

## Long-running operations

Work that takes longer than a few seconds should not hold the request open:
load balancers commonly cut requests at around 60 s, and the status line has
already been sent by the time you find out the job failed. \`POST /exports\`
returns \`202 Accepted\` with \`Location: /exports/123\`; the client polls that
status resource (send \`Retry-After\` to pace it), which reports progress and
finally links to the file. Offer a webhook when polling is wasteful, and take an
idempotency key so a retried POST does not start a second export.

## Webhooks you send

- Sign every payload: an HMAC-SHA256 over the event id, a timestamp and the raw body, with a per-endpoint secret. Send the timestamp so receivers can reject replays older than a few minutes.
- Delivery is at-least-once, so give each event a unique id that stays the same across retries and receivers can deduplicate.
- Retry non-2xx responses and timeouts with exponential backoff and jitter for a day or so, then park the event for manual replay.
- Use a short timeout. Receivers should acknowledge fast and process asynchronously; never wait for their business logic.
- Keep payloads thin: ids and what changed, never secrets. Receivers fetch the rest with their own credentials.

The Standard Webhooks specification writes these conventions down; follow it
rather than inventing your own.

## Webhooks you receive

A signature covers **bytes**, not meaning. Once \`express.json()\` has parsed
the body, \`JSON.stringify(req.body)\` does not reproduce the bytes that were
signed (whitespace and escaping differ), so every check fails. Mount a raw parser
on that one route, verify, then parse:

\`\`\`js
// registered BEFORE app.use(express.json())
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, req.get('Stripe-Signature'), secret);
  jobs.add(event); // process later, acknowledge now
  res.sendStatus(200);
});
\`\`\`

Verifying by hand: compare with \`crypto.timingSafeEqual\`, reject stale
timestamps, and dedupe on the event id.

## Bulk endpoints

\`POST /orders/bulk\` forces a decision. **All-or-nothing**: one transaction, any
bad row rolls everything back and you return \`422\` listing the failing rows;
right for imports where half an import is worse than none. **Per-item
results**: items succeed or fail independently and the body lists each item's
status and errors, so the client retries only the failures. \`207 Multi-Status\`
comes from WebDAV (RFC 4918); many APIs return \`200\` with the per-item list
instead. Either way, cap the batch size and document the model. Never answer
\`201\` when half the items failed.

## Breaking and non-breaking changes

The rule: you may **loosen** what you accept and **add** to what you return.
Adding an optional request field or a response field is safe. Adding a
*required* request field breaks every client that does not send it; removing,
renaming or retyping a response field breaks readers; tightening validation
breaks writers. Add the field as optional with a server-side default, migrate
the clients, and only then consider requiring it.

## Cursors are opaque

A cursor such as \`eyJpZCI6NDJ9\` is the server's business. Clients send
\`nextCursor\` back unchanged as \`?cursor=\` and stop when it is null. The moment
clients decode and edit it, you can no longer change what it holds (a sort key
plus an id, the filters, an expiry). Server-side, it is untrusted input:
validate it, or sign it.

## Deprecating an endpoint

1. Announce the date and start sending \`Deprecation\` (RFC 9745) and \`Sunset\` (RFC 8594) headers, plus a \`Link\` to the migration guide.
2. Measure who still calls it, per API key or client id.
3. Contact the remaining heavy users and help them migrate; scheduled brownouts flush out forgotten callers.
4. After the sunset date, answer \`410 Gone\` with a problem body pointing at the replacement. \`410\` says "this existed and is gone for good", which \`404\` does not.

## Rate-limit algorithms

| Algorithm | Behaviour | Trade-off |
| --- | --- | --- |
| Fixed window | count per calendar minute | cheap; allows double the rate across a window boundary |
| Sliding log | store every timestamp, count the trailing window | exact; memory per request |
| Sliding window counter | weight the previous window's count | cheap and close enough |
| Token bucket | tokens refill steadily up to a cap; each request spends one | bursts up to the cap, average enforced |
| Leaky bucket | requests drain at a fixed rate | smooth output, no bursts |

"100 per minute on average, bursts of 20" is a token bucket with capacity 20
refilling at 100 tokens a minute. With several instances, keep the state in
Redis and update it atomically; reject with \`429\` and \`Retry-After\`.

## GraphQL or REST

GraphQL fixes over- and under-fetching and collapses round trips, which pays off
with many different clients (web, mobile, partners) over a deep graph. The
costs: queries are usually POSTed with per-query shapes, so URL-keyed HTTP and
CDN caching stops working (persisted queries help); naive resolvers run one
query per parent row, the N+1 that DataLoader batches away; a nested query can
be arbitrarily expensive, so you need depth and complexity limits; and errors
arrive as \`200\` with an \`errors\` array, so status-code dashboards miss them.
For a CRUD app with one client and a dozen screens, well-designed REST with
OpenAPI stays the default. The honest answer is "it depends", followed by what
it depends on.
`,
  },
  {
    id: 'web-perf',
    trackId: 'web',
    title: 'Performance and caching across the stack',
    blurb:
      'Measure first, then fix: percentiles, Core Web Vitals, bundles, CDNs, HTTP and application caches, and load tests.',
    estMinutes: 35,
    objectives: [
      'Break a slow page load into network, server and client time using real tools',
      'Design a caching strategy from browser to CDN to Redis, including invalidation',
      'Explain p50/p95/p99 and why averages hide the problem',
      'Plan and interpret a load test before a launch',
    ],
    primer: `
## Measure first

Performance work without numbers is guessing. Two sources of numbers:
**RUM** (real-user monitoring: timings from real browsers, devices and
networks) tells you what users experience; **synthetic** tests (Lighthouse,
WebPageTest, a scripted check from one location) are repeatable and good at
catching regressions in CI, but they are one device on one network. Use both,
and trust RUM for "is it slow".

Report **percentiles**, never an average on its own. Latency is skewed: most
requests are fast and a long tail is slow, so an average of 120 ms can sit on
top of 5% of requests taking two seconds. p50 is the typical request; p95 and
p99 are the tail. The tail is not rare in practice: a page that makes 20 API
calls hits at least one p95-slow call about 64% of the time, and your heaviest
users, with the most data, live there. Compute percentiles from histograms;
averaging the p99s of ten servers produces a number that means nothing.

On the server, the \`Server-Timing\` header names where the time went, and
DevTools shows it in the request's timing panel:

\`\`\`http
Server-Timing: auth;dur=15, db;dur=820, render;dur=40
\`\`\`

Here 820 of 900 ms is the database, so go straight to that query and run
\`EXPLAIN ANALYZE\` on it (or look for an N+1 adding up to 820 ms). Gate detailed
timings behind internal access if they reveal too much.

Then work the loop, one change at a time:

1. Measure and reproduce the slowness with production-like data.
2. Find which tier the time goes to: network, server or client.
3. Form one hypothesis about the biggest contributor.
4. Change one thing.
5. Measure again and compare with the baseline.

Lock the win in with a **performance budget** (bundle size, LCP) checked in CI,
or an alert on p95.

## Front-end load and Core Web Vitals

Core Web Vitals are the user-centred metrics, judged at the 75th percentile of
page loads, separately for mobile and desktop:

| Metric | Measures | Good |
| --- | --- | --- |
| LCP, Largest Contentful Paint | when the main content appears | 2.5 s or less |
| INP, Interaction to Next Paint | delay from a click, tap or key press to the next frame | 200 ms or less |
| CLS, Cumulative Layout Shift | how much the layout jumps around | 0.1 or less |

INP replaced First Input Delay in March 2024. FID only measured the wait before
the *first* interaction's handler started; INP covers every interaction, all the
way to the next paint. Long tasks (over 50 ms on the main thread) are what ruin
INP: break work up, yield to the main thread, and ship less JavaScript.

JavaScript costs download, parse, compile and execute time. Run a bundle
analyser and act on what it shows: split by route
(\`const Reports = lazy(() => import('./Reports'))\`), prefer native \`Intl\`
over date and number libraries, and import per function from tree-shakeable
packages. A "shared" copy of a library from a public CDN does not help: browsers
partition their HTTP cache by site, so no visitor arrives with it cached. Serve
images in modern formats at the displayed size with \`width\` and \`height\` set
(no layout shift), lazy-load images below the fold but never the LCP image, and
use \`preconnect\` for a critical third-party origin and \`preload\` for the LCP
image or a critical font.

## HTTP and CDN caching

Caches stack: browser, CDN edge, reverse proxy, application cache, database.
The cheapest request is the one the browser never sends; the next cheapest is
answered at the edge. RFC 9111 governs the HTTP layers (the directives are in
*HTTP semantics*). The rules that matter at scale:

- The cache key is the URL plus whatever \`Vary\` names. Keep it small; never vary on \`Cookie\`.
- Versioned URLs beat purges: \`app.3f9a1c.js\` with \`immutable\` never needs invalidating. Purge only what must keep its URL.
- \`s-maxage\` plus \`stale-while-revalidate\` lets the edge absorb traffic and refresh in the background.
- Nothing per-user in a shared cache: \`private\` or \`no-store\`.

A CDN does not make an API fast by itself. Responses that are per-user or marked
uncacheable still travel to the origin every time; for those the CDN only saves
TLS set-up close to the user and keeps warm connections to your servers, and
the database query costs exactly what it did. The win comes from making public
endpoints cacheable on purpose.

## Application caching

**Cache-aside** is the default: check the cache; on a miss read the database,
store the value with a TTL, and return it. Only data somebody asked for gets
cached, and the TTL bounds how stale it can be.

\`\`\`js
async function getProduct(id) {
  const hit = await redis.get(\`product:\${id}\`);
  if (hit) return JSON.parse(hit);
  const row = await db.products.find(id);
  await redis.set(\`product:\${id}\`, JSON.stringify(row), { EX: 300 });
  return row;
}
\`\`\`

**Write-through** updates the cache and the database together; **write-behind**
writes the cache and flushes to the database later, and loses data on a crash.

Invalidate by deleting the key **after the transaction commits**. Delete inside
the transaction and a reader refills the cache with the old committed row before
your commit lands. Even after commit there is a race: a reader misses and loads
the old row, the writer commits and deletes, then the reader stores the old row,
which stays until the TTL. Short TTLs bound it; versioned keys
(\`product:42:v8\`) stop an old value overwriting a new one. **Negative
caching**, briefly caching "not found", protects the database from floods of
lookups for ids that do not exist.

The key must include every input that changes the answer: user, tenant, locale,
permissions. A dashboard cached under \`/dashboard\`, or an authorisation
decision cached as \`order:42:canEdit\`, hands one user's answer to another.
Good candidates are shared and read-heavy: catalogues, configuration, exchange
rates, rendered public pages.

## Cache stampedes

When a hot key expires, every concurrent request misses at once and all of them
query the database: a **stampede**, or dogpile. Two thousand identical queries
in 50 ms can take the database down, and adding app instances makes it worse.
The fixes, usually combined:

- **Single-flight** (request coalescing): one request per key recomputes, the rest await its promise.
- A short **lock** in Redis (\`SET key token NX PX 5000\`) to coalesce across instances, with an expiry in case the holder dies.
- **Serve stale** while one caller refreshes.
- **Early refresh**: refresh before expiry, with rising probability as the deadline nears.
- **Jittered TTLs**, so keys cached together do not expire together.

## Server latency

The usual suspects, roughly in order of frequency: N+1 queries (one query per
row of a list); a missing index (\`WHERE status = 'open' ORDER BY created_at DESC\`
wants a composite index on \`(status, created_at)\`); large \`OFFSET\`s, which
read and discard rows where keyset pagination seeks; \`SELECT *\` shipping columns
nobody reads; connection-pool exhaustion, where requests wait for a connection
rather than for the query; synchronous CPU work on the hot path blocking the
event loop; and big uncompressed payloads. Fetching everything and filtering in
JavaScript is not a fix, and neither is a bigger Node heap.

## Load testing

A load test answers "what breaks first, and at what load" before users do.
Script it (k6, Artillery, NBomber) with:

- a realistic endpoint mix and **production-sized data** with many distinct ids, so caches miss the way they will in production;
- think time between steps, and a ramp up to and past the expected peak;
- a production-like environment, including the database, with stubs for third parties;
- dashboards on p95 and p99, error rate and saturation (CPU, pool waits, queue depth), not only requests per second.

The classic false pass: every virtual user fetches the same product with no think
time, so everything comes from a warm cache and the test reports numbers
production will never see.

## Capacity and tail latency

Latency is not linear in load. In simple queueing models the time spent waiting
grows like utilisation / (1 - utilisation): at 50% busy a request waits about
one service time, at 80% four, at 90% nine. The median barely moves, but the
unlucky requests queue behind each other, so p99 explodes first. That is why
sustained utilisation targets leave headroom (60–70%), why you shed load or
rate-limit before saturation, and why retries need budgets and backoff: a retry
storm adds load exactly when the system can least take it.

## Walking through "the page is slow"

Clarify first: which page, for whom (everyone, one region, one tenant), since
when (a deploy?). Split the time with RUM and a trace. Fix the biggest
contributor, verify with the same measurement, then guard it with a budget or
an alert. Reaching for Redis or a rewrite before measuring is the answer
interviewers mark down.
`,
  },
];
