# Walkthrough 01: the life of one answer request

Files: `client/src/lib/api.ts`, `client/vite.config.ts`, `server/src/index.js`, `server/src/routes/api.js`, `client/src/pages/DrillPage.tsx` · As of: 6f1bf43 · Time: ~45 min · Read first: nothing

## The job in one sentence

Carry one `POST /api/answers` from a keypress in the drill to a graded, scheduled, recorded attempt, and bring back either `{ data }` or an error the learner can read. Take the failure path as seriously as the success path.

## The contract

- **In:** a JSON body `{ questionId, response, elapsedMs }` and an `x-profile-id` header.
- **Out:** `200 { data: { correct, answer, why, ask?, xpEarned, mastered, wasFirstAttempt, nextDueAt, intervalDays } }`, or `4xx/5xx { error: { code, message } }`.
- **Invariant 1:** every response from `/api/*` has exactly one of `data` or `error` at the top level.
- **Invariant 2:** a 5xx response's `message` is `"Something went wrong."`, whatever was thrown.
- **Invariant 3:** a request the server rejects writes nothing to the store. At the baseline this holds for a missing profile or an unknown question. It does **not** hold for a malformed `response` (M-02).
- **Invariant 4:** the browser only ever talks to its own origin (ADR-0011).

## Read it in this order

1. `client/src/pages/DrillPage.tsx › submit (L228–245 @ 6f1bf43)`. This is where the request starts and where its error lands.
2. `client/src/lib/api.ts › request (L56–82 @ 6f1bf43)`. The one function that knows about `/api`, the header and the envelope.
3. `client/vite.config.ts › proxy (L13–18 @ 6f1bf43)`. The hop you cannot see in DevTools.
4. `server/src/index.js › express.json (L39–58 @ 6f1bf43)`. The middleware order, top to bottom, is the order a request meets it.
5. `server/src/routes/api.js › /answers (L108–144 @ 6f1bf43)`, then `server/src/routes/api.js › requireProfile (L167–179 @ 6f1bf43)`.
6. `server/src/index.js › err.code (L68–85 @ 6f1bf43)`. The 404 catch-all and the error translator.

## The lines worth stopping at

**The content type is set only when there is a body.**
`client/src/lib/api.ts › content-type (L64–68 @ 6f1bf43)`
```ts
    headers: {
      ...(rest.body ? { 'content-type': 'application/json' } : {}),
      ...(profileId ? { 'x-profile-id': profileId } : {}),
      ...headers,
    },
```
The caller's headers come last, so they win. `express.json()` parses a body only when the content type says JSON. Leave the header off and `req.body` stays `undefined` in Express 5. The route's `req.body ?? {}` then turns the request into "no such question" (Observe 4). If `headers` is a `Headers` instance rather than a plain object, the spread copies nothing (client B28).

**The proxy rewrites `Host`, not `Origin`.** `changeOrigin: true` makes Express see `Host: localhost:3001`. The browser's `Origin: http://localhost:5173` passes through unchanged, which is why `cors()` still adds headers to a same-origin request. They are harmless and unnecessary.

**Middleware order is behaviour.**
`server/src/index.js › cors (L42–44 @ 6f1bf43)`
```js
app.use(express.json({ limit: '64kb' }));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
```
`express.json` runs first, so a parse error jumps to the error middleware before `cors` or `morgan` ever run. A bad body is never logged by morgan and gets no CORS headers (server H2, F-22). Swap the first two lines and the error response gains CORS headers. Move morgan to the top and bad requests show up in the log.

**The handler validates the question before the profile's response.**
`server/src/routes/api.js › A response is required (L112–119 @ 6f1bf43)`
```js
    const question = getQuestion(String(questionId ?? ''));
    if (!question) throw httpError(404, 'not_found', 'No such question.');
    if (response === undefined) throw httpError(400, 'validation_failed', 'A response is required.');

    const now = new Date();
    const before = store.getCardState(profileId, question.id);
    const { correct, reason } = grade(question, response);
    const after = schedule(before, correct, now);
```
`String(questionId ?? '')` means an object id becomes `"[object Object]"` and 404s rather than crashing. The only shape check on `response` is `undefined`. Everything else goes to `grade()`, which returns `{ correct: false, reason }` for a wrong shape. The route then saves, records and reveals exactly as it would for a real wrong answer (server B3, M-02). `now` is read once and passed down, which is what makes the scheduler testable.

**Two writes, no transaction.** `saveCardState` (L121), then `addAttempt` (L122–130). Both are synchronous better-sqlite3 calls in the same tick. The window between them is a hard kill or a throwing `insertAttempt`. That is real but S3 (server ST3, F-02; J08).

**The translator trusts `err.code`.**
`server/src/index.js › internal_error (L75–83 @ 6f1bf43)`
```js
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: {
      code: err.code ?? 'internal_error',
      // Never hand a 5xx message to the client: it can carry file paths,
      // dependency versions or query text.
      message: status >= 500 ? 'Something went wrong.' : err.message,
```
Your own `httpError` sets `status` and `code`. Body-parser sets `status` and `type`, so its 400 goes out as `internal_error` carrying the parser's message (F-14). Invariant 2 holds. The code is still a lie.

**Back in the browser.** `request()` returns `undefined` for a 204 before touching the body. Otherwise it parses with `.catch(() => null)`, throws `ApiError` on any non-2xx, and returns `body.data as T` on success. A 2xx with a non-JSON body makes `body` `null`, and `body.data` throws a `TypeError` instead of an `ApiError` (client B28, F-20). In `submit`, the `catch` puts `err.message` into the card's own `error` state and renders an `ErrorBanner`. The card stays unanswered, so the learner can retry.

## Observe it

Run a baseline checkout: `git worktree add ../sr-base 6f1bf43`, then `cd ../sr-base && npm install && npm run dev:server`. Take a profile id from `curl -s localhost:3001/api/profiles`, then:

1. The happy path. It returns `{"data":{"correct":false,"answer":2,"why":"There are seven primitives…`.
   `curl -s -X POST localhost:3001/api/answers -H "content-type: application/json" -H "x-profile-id: $PID" -d '{"questionId":"js-values-1","response":1}'`
2. No header. It returns `400 {"error":{"code":"profile_required","message":"Send an x-profile-id header."}}`.
3. A truncated body. It returns `400 {"error":{"code":"internal_error","message":"Unexpected end of JSON input"}}`.
   `curl -s -i -X POST localhost:3001/api/answers -H "content-type: application/json" -H "x-profile-id: $PID" -d '{"questionId":'`
4. The same valid body with **no** content type. It returns `404 {"error":{"code":"not_found","message":"No such question."}}`. The body was never parsed.
5. Add `-H "Origin: http://localhost:5173"` to command 3. The response has no `Access-Control-Allow-Origin`. Add the same header to command 1, and the response has one.
6. A malformed response, `-d '{"questionId":"js-values-2","response":"1"}'`. It returns 200 with `"reason":"expected a choice index"` and the full `why`. Now `GET /api/progress` counts the attempt.

## What is still wrong here

- M-02: a malformed `response` is graded, recorded and revealed (J09).
- F-14: body-parser errors are `internal_error`, and `err.code` from any error is trusted (J13).
- F-22: `json` before `cors`, and `credentials: true` with no cookies (J21).
- F-29: `sessions.js` throws `bad_request` through its own helper (J13).
- F-02: two writes without a transaction (J08).
- F-20: `body.data as T` with no runtime check, and ids not encoded (J27).
- M-04: `app.listen(port)` binds every interface (J21).
- M-10: the SPA fallback matches `/api` (unassigned).

## Do it

1. (5 min) Using only the files above, list every status code `POST /api/answers` can return at the baseline, and what triggers each.
2. (10 min) Move `app.use(cors(...))` above `express.json` in a scratch branch. Re-run Observe 5 and write down what changed and why.
3. (20 min) Make body-parser errors honest. In the translator, map `err.type === 'entity.parse.failed'` to `invalid_json` and `entity.too.large` to `payload_too_large`, and turn any other code not produced by `httpError` into `internal_error`. Prove it with Observe 3, and with a 70 kB body to `POST /api/profiles`. Then compare your change with J13's.

## Check yourself

1. Why does a request with a valid JSON body and no `content-type` get a 404 rather than a 400?
2. Which middleware never sees a request whose body fails to parse?
3. What stops a 5xx from leaking a file path, and what still lets a 4xx leak one?
4. Where does an `ApiError` from `/answers` end up on screen, and why not in `Gate`?
5. Name the one extra hop in development that is absent in production, and what it changes in the request.

<details><summary>Answers</summary>

1. `express.json()` skips bodies whose content type is not JSON, so `req.body` is `undefined`. `req.body ?? {}` gives `questionId` `undefined`, `getQuestion('')` returns nothing, and the route answers 404 before it reaches the 400 check.
2. `cors` and `morgan`. Both are mounted after `express.json`, and an error skips non-error middleware.
3. The translator replaces `message` whenever `status >= 500`. A 4xx error that carries a Node `code` and a path in its `message`, such as `send`'s ENOENT, passes both through (server H1).
4. In `QuestionCard`'s own `error` state, via `submit`'s `catch`. `Gate` reads the app-level `error`, which only the provider's loads write.
5. The Vite proxy. It forwards `/api` to `:3001` and rewrites `Host` (`changeOrigin`). In production, Express serves both from one port.

</details>

## After the refactor

Everything above describes `6f1bf43`. In the working tree (uncommitted, 2026-09-24), `server/src/index.js` only wires things together. `app.js › createApp` holds the middleware, now with `cors` first and no `credentials`, and `toErrorResponse`, which passes a code through only from `errors.js › ERROR_CODES`. `config.js › readConfig` binds `127.0.0.1` by default, and `lifecycle.js › createShutdown` closes the store. The route delegates to `answer.js › submitAnswer`: malformed answers get `400 invalid_response`, and `store.recordAnswer` writes in one transaction. Choices are shuffled by `present.js`, so `response` is a choice id (`js-values-1-c0`). The client side moved to `client/src/pages/drill/useDrillSession.ts › send`. Re-run on this tree: step 3 gives `invalid_json`, step 4 `400 validation_failed` ("questionId is required."), step 5 carries `Access-Control-Allow-Origin`, and step 6 is `400 invalid_response` with no attempt recorded. The tests are in `server/test/http.test.js`.
