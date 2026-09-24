---
id: ADR-0007
title: Wrap every response in one envelope, and translate errors in one place
status: accepted
date: 2026-09-23
amended-by: []
superseded-by: null
---

# ADR-0007: Wrap every response in one envelope, and translate errors in one place

Status: accepted · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `server/src/index.js › error translator (L68–85 @ 6f1bf43)`, `server/src/routes/api.js › httpError (L174–179 @ 6f1bf43)`, `server/src/sessions.js › badRequest (L154–159 @ 6f1bf43)`, `client/src/lib/api.ts › request (L56–82 @ 6f1bf43)`

## Context
The client has one fetch function and eight endpoints. Handlers are synchronous and throw. Express 5 forwards thrown errors to error middleware, so there can be exactly one place that decides what a failure looks like on the wire. A 5xx message can carry a file path or a SQL fragment.

## Decision
We answer `{ data }` on success and `{ error: { code, message } }` on failure. Handlers throw an `Error` carrying `status` and `code`. One four-argument middleware at the end turns it into the envelope and replaces every 5xx message with a generic one. The client unwraps `data` or throws `ApiError` in one function.

## Evidence
`server/src/index.js › err.code (L74–85 @ 6f1bf43)`
```js
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: {
      code: err.code ?? 'internal_error',
      message: status >= 500 ? 'Something went wrong.' : err.message,
```
`client/src/lib/api.ts › body.data (L73–81 @ 6f1bf43)`
```ts
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.error?.message ?? `Request failed (${response.status})`,
      response.status,
      body?.error?.code ?? 'unknown',
    );
  }
  return body.data as T;
```
**Not enforced** by any test on either side.

## Consequences
- Good: one shape to parse. The client shows `message` and never needs to know the code, which is why codes can be renamed safely (J13).
- Cost: the translator trusts `err.code` from *any* error. Body-parser errors carry `type`, not `code`, so malformed JSON returns `400 internal_error`, and a 413 is `internal_error` too (reproduced; server H1, register F-14). A Node system error keeps `err.code === 'ENOENT'`, and its path leaks into `code` and `message` on a 4xx (server H1). J13 allowlists the codes.
- Cost: `sessions.js` built its own `badRequest` with code `bad_request`, so the same mistake has two codes (server SE4, F-29).
- Cost: the client casts `body.data as T` without checking it. A 200 with a non-JSON body throws `TypeError: Cannot read properties of null` instead of an `ApiError` (client B28, F-20; J27).
- Cost: `express.json` is mounted before `cors`, so a parse error answers without CORS headers (server H2, F-22). Same-origin hides this (ADR-0011).

## Alternatives rejected
- **Per-handler `try/catch` and `res.status().json()`.** That is eight chances to leak a stack trace.
- **Problem Details (RFC 9457).** It is the right format for a public API. Here it costs a content type the client would have to special-case.

## Breaks first at
Consumers. With one client, the envelope is a convention. With a second consumer, the codes become a public contract and need a list, which contract §12 now provides.

## Revisit when
- A route streams or downloads (export in contract §11 returns a file, not an envelope). Write the exception down there.
- A second client consumes the API.
