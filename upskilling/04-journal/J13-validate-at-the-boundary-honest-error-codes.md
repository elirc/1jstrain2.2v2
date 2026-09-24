---
id: J13
title: Validate at the boundary and tell the truth in error codes
area: server
closes: [F-14, F-29, M-10]
ladder: [B06]
adrs: [0007 unchanged]
status: landed
---

# Validate at the boundary and tell the truth in error codes

Date 2026-09-24 · Author Claude (server implementer) · Area server · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-14, F-29, M-10 (unassigned; taken here because it is the same "honest 404" fix) · Ladder B06 · ADRs 0007 unchanged (one translator; this fixes defects inside it)

## Symptom

At `6f1bf43`, reproduced by the server review against a running server:

```
POST /api/sessions  '{"mode": '             → 400 {"code":"internal_error","message":"Unexpected end of JSON input"}
POST /api/sessions  70 kB body              → 413 {"code":"internal_error","message":"request entity too large"}
POST /api/profiles  {"name":{"a":1}}        → 201 name "[object Object]"
POST /api/sessions  limit 0 / 2.5 / "abc"   → 12 / requested 2.5 / 12, never an error
POST /api/sessions  {"mode":"stage","stageId":{}} → 400 {"code":"bad_request","message":"unknown stage: [object Object]"}
GET  /api                                   → 200 text/html
GET  /assets/nope.js                        → 200 text/html (the browser then runs HTML as JS)
```

With `client/dist` missing, the API answered `404 {"code":"ENOENT","message":"ENOENT: … C:\\…\\client\\dist\\index.html"}`: a Node system code and an absolute path, in a public field.

## Root cause

`server/src/index.js › internal_error (L74–85 @ 6f1bf43)`
```js
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: {
      code: err.code ?? 'internal_error',
      message: status >= 500 ? 'Something went wrong.' : err.message,
```

body-parser sets `err.type`, not `err.code`, so parse and size errors fall through to `internal_error`, while any library's `err.code` passes straight through. Routes coerce instead of validating (`String(req.body?.name ?? '')`). `server/src/sessions.js › badRequest (L154–159 @ 6f1bf43)` is a second `httpError` with its own code, and `server/src/sessions.js › DEFAULT_LIMIT (L23 @ 6f1bf43)` turns every bad `limit` into a default.

The invariant: *every error body carries one of eight documented codes, a 4xx says which field is wrong, and nothing from a library or the file system reaches `code` or `message`.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | The client shows only `message`, so users see "Unexpected end of JSON input". Harmless, but the codes are a contract nobody can rely on. |
| B | zod | A runtime dependency | It breaks the "no new runtime dependencies" rule for five routes. |
| C | A 60-line schema DSL (`body(req, schema)`) | ~60 lines | The review rejected it: a mini-zod nobody asked for. |
| D | Four helpers (`obj`, `str`, `int`, `oneOf`) that throw `validation_failed` with `details.field`, and an **allowlist** in the translator | ~70 lines | **Chosen.** |

## Decision and trade-off

I chose D. The translator (`toErrorResponse` in `server/src/app.js`) passes a code through only if it is in `ERROR_CODES` (`server/src/errors.js`). It maps body-parser's `entity.parse.failed` and `entity.too.large` by `type`, turns any other 4xx into `not_found` or `validation_failed` with a generic message, and turns any 5xx into `internal_error`. An allowlist was simpler than marking "safe" errors, because the safe set is small and closed.

Two judgement calls. First, `limit: null` means "use my setting", not an error. The client serialises a `NaN` from `/drill?limit=abc` as `null`, and a strict 400 would turn a bad URL into an error screen. Second, an unknown module, stage or track is `404 not_found`, not `400`: the request was well-formed, and the thing is not there.

The cost: messages are generic for anything I did not anticipate, so debugging a new 4xx means reading the server log. I would revisit that if a client ever needs to branch on a code outside the eight.

## The change

New: `server/src/errors.js` (`ERROR_CODES`, `httpError` with `details`) and `server/src/validate.js` (four helpers plus `queryInt`, about 70 lines; string length counts code points and control characters are rejected). `server/src/app.js`: `cors` runs before `express.json` (so a 400 still carries CORS headers), `credentials` is gone, and the SPA fallback matches `/^(?!\/api(\/|$)).*/` and serves `index.html` only for extension-less paths that accept HTML. A missing `client/dist` is a boot warning. `sessions.js` loses `badRequest`.

After, `server/src/app.js` (working tree):
```js
  } else if (status >= 500) {
    code = 'internal_error';
    message = 'Something went wrong.';
  } else if (ERROR_CODES.includes(err?.code)) {
    code = err.code;
  } else if (status === 404) {
    code = 'not_found';
```

## Verification

1. `server/test/http.test.js` › *invalid JSON → 400 invalid_json; oversized → 413 payload_too_large*. At the baseline the code is `internal_error` for both.
2. `server/test/http.test.js` › *profile names are validated: an object is 400, not "[object Object]"*. At the baseline, 201.
3. `server/test/http.test.js` › *never passes through a code that is not on the allowlist, and hides 5xx messages*: an `ENOENT` 404 becomes `{ code: 'not_found', message: 'Not found.' }`.
4. `server/test/http.test.js` › *the SPA fallback* › *serves index.html for client routes only; /api and missing assets are 404*.
5. `server/test/sessions.test.js` › *limit parsing* › *absent or null means "use the setting"; integers 1..40 pass; anything else is validation_failed*.

## What a senior reviewer would ask

- *Why not validate `x-profile-id` as a UUID?* It buys nothing. The lookup is parameterised and already 404s, and imported or legacy ids need not be UUIDs.
- *Does `details` ever leak?* It is attached only when the code is on the allowlist, and every allowlisted error is built by our own `httpError`.
- *Why is the 10 MB import parser mounted before the 64 kB one?* Once the global parser has 413'd or parsed a body, a route-level parser never sees it (review M10). J40 has the test.

## The junior version of this fix

`code: err.code ?? (err.type ? 'invalid_json' : 'internal_error')`. It fixes the parse error and passes review. But `entity.too.large` also has a `type`, so an oversized body is reported as invalid JSON, and `ENOENT` still leaks, because the `??` still trusts any `code` that is present.

## Follow-ups

- [ ] Optional `Host` allowlist against DNS rebinding (server review M9) → not in this release (CONTRACT §Decisions)

## Update 2026-09-24

`int()` printed open ranges literally: `GET /api/attempts?before=0` answered "before must be a whole number from 1 to Infinity." It now says "of at least 1" (or "of at most N") when one bound is open, and `server/test/http.test.js` › *import rejects a wrong format or version…* asserts the message.
