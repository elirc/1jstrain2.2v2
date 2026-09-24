---
id: J27
title: The API client stops trusting the envelope
area: client
closes: [F-20]
ladder: [B06]
adrs: [0007 unchanged]
status: landed
---

# The API client stops trusting the envelope

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-20 · Ladder B06 · ADRs 0007 unchanged

## Symptom

Three failures that each surface as the wrong error, or no error at all:

- A 200 whose body is not JSON (a production SPA fallback serving `index.html` for an unknown `/api` path, or a proxy error page) crashes the caller with `TypeError: Cannot read properties of null (reading 'data')` instead of a readable error.
- With the server down, the banner says `Failed to fetch`.
- `/module/..%2Fprogress` decodes to `../progress`. The URL parser normalises `/api/modules/../progress` to `/api/progress`, so the module page receives progress JSON and throws during render.

Reproduce at `6f1bf43`: stop the server and open the app. The banner reads `Failed to fetch`.

## Root cause

`client/src/lib/api.ts › request (L56–82 @ 6f1bf43)`:
```ts
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.error?.message ?? `Request failed (${response.status})`,
      ...
    );
  }
  return body.data as T;
```
and `client/src/lib/api.ts › module (L94–95 @ 6f1bf43)` interpolates the id raw:
```ts
    request<{ module: Module; questions: QuestionWithState[] }>(`/modules/${id}`, { profileId }),
```
The client casts through its trust boundary. The invariant I want: *every value `request()` resolves with came from a `{ data }` envelope, and every rejection is an `ApiError` with a code, or an `AbortError` the caller asked for.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | Errors keep reaching learners as JavaScript internals, and the path traversal keeps turning into render crashes. |
| B | Validate every response body with a schema library | A runtime dependency, plus schemas duplicating `types.ts` | The server is ours and shares the contract. The envelope is the boundary that fails in practice; field-level validation would be ceremony. |
| C | Check the envelope shape, map fetch rejection to `network`, add a 15 s timeout and caller `AbortSignal`, encode every path id, and type the error code as a union | ~120 lines | Chosen. |

## Decision and trade-off

I chose C. `ApiError.code` is now the `ApiErrorCode` union from the contract, plus the client's own `network`, `bad_response` and `unknown`. `isApiError(e, code)` is the one way callers branch. What it gives up: a response with the right envelope but the wrong shape still passes. That is acceptable against our own server. Revisit if the client ever talks to an API we do not ship.

## The change

`client/src/lib/api.ts` is rewritten. `request(path, { method, json, profileId, signal })` combines the signal with `AbortSignal.timeout(15000)` where available, rethrows the caller's abort unchanged, and throws `bad_response` for a body without `data`. It encodes every id with `encodeURIComponent` and adds the new endpoints: `question`, `attempts`, `flag`, `unflag`, `flags`, `settings`, `updateSettings`, `importProfile`, `deleteProfile` and `exportUrl`.

After, `client/src/lib/api.ts`:
```ts
  } catch (err) {
    // The caller cancelled: let that through untouched so it can be ignored.
    if (signal?.aborted) throw signal.reason ?? err;
    ...
    throw new ApiError('Cannot reach the Stack Ready API. Is the server running?', 0, 'network');
  }
  ...
  if (!isEnvelope(body) || !('data' in body)) {
    throw new ApiError('The API answered with something that is not Stack Ready data.', response.status, 'bad_response');
  }
```

## Verification

`client/src/lib/api.test.ts`, which has no counterpart at the baseline because there was no harness:
1. › *throws bad_response when a 200 body is not an envelope*. The baseline code path is `body.data` on `null`, which throws a `TypeError`.
2. › *maps a fetch rejection to code "network"*, and the message no longer contains "Failed to fetch".
3. › *encodes path ids*: `api.module('../progress', 'p')` requests `/api/modules/..%2Fprogress`.
4. › *passes the AbortSignal through and rejects with AbortError when aborted*.
5. › *throws ApiError with the server code and message on 4xx*, including `details.field`.
6. The full suite: 70 passed.

## What a senior reviewer would ask

- *Why rethrow the abort instead of wrapping it?* A superseded request is not an error. `useResource` drops it silently, and a wrapped `ApiError` would turn cancellation into a banner.
- *Is `AbortSignal.any` safe everywhere?* It is guarded. Without it the caller's signal is used alone and the timeout is skipped.
- *Why does `exportUrl` return a string rather than fetching?* The contract makes export path-scoped (no header), so a plain `<a download>` works and the browser streams the file.

## The junior version of this fix

Wrap `body.data` in `body?.data`. The `TypeError` disappears and review passes. Now the caller receives `undefined` typed as `Curriculum` and crashes one frame later, further from the cause. The unencoded id stays in place.

## Follow-ups

- [ ] If a third-party API is ever consumed, validate its payloads at this boundary → not planned
