# Walkthrough 07: the API client and the envelope

Files: `client/src/lib/api.ts`, `client/src/lib/types.ts`, `client/src/lib/api.test.ts`, `server/src/errors.js` · As of: the working tree after the 2026-09-24 refactor (baseline `6f1bf43`) · Time: ~35 min · Read first: walkthrough 01

"Before" quotes are anchored at `6f1bf43`. "After" quotes come from the working tree, which is not committed yet, so they carry plain paths and no SHA.

## The job in one sentence

Be the only code in the browser that knows about `/api`, the `x-profile-id` header and the `{ data } | { error }` envelope. Turn every way a request can end into exactly one of two things: the `data`, or an `ApiError` with a code the UI can branch on.

## The contract

- **In:** `request<T>(path, { method?, json?, profileId?, signal?, headers? })`.
- **Out:** resolves with `body.data` only when the status is 2xx and the body is an object with a `data` key. A 204 resolves with `undefined`.
- **Invariant 1:** every rejection is either an `ApiError` or the caller's own abort reason, unchanged. Nothing else escapes: no `TypeError`, no `SyntaxError`, no `Failed to fetch`.
- **Invariant 2:** `ApiError.code` is an `ApiErrorCode`: the server's eight codes plus the client's `network`, `bad_response` and `unknown`. A code the client does not know becomes `unknown`, and the server's `message` is kept.
- **Invariant 3:** every id interpolated into a path goes through `encodeURIComponent`.
- **Invariant 4:** no request waits longer than `REQUEST_TIMEOUT_MS` (15 s) where the platform has `AbortSignal.timeout`.
- **Invariant 5:** `content-type: application/json` is sent exactly when there is a `json` body.

## Read it in this order

1. `client/src/lib/api.ts › request (L56–82 @ 6f1bf43)`. Short and trusting. Keep it open next to the new one.
2. `client/src/lib/api.ts › request` (working tree). The `try` around `fetch`, then the three exits.
3. `client/src/lib/api.ts › ApiError`, `isApiError`, `isAbortError` and `toCode` (working tree).
4. `client/src/lib/api.ts › api` (working tree). One line per endpoint, and `enc` everywhere.
5. `server/src/errors.js › ERROR_CODES` next to `client/src/lib/types.ts › ApiErrorCode`.
6. `client/src/lib/api.test.ts`.

## The lines worth stopping at

**The cast through the boundary.**
`client/src/lib/api.ts › request (L73–81 @ 6f1bf43)`
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
A 200 whose body is not JSON (a proxy error page, or `index.html` from an SPA fallback) makes `body` `null`, and `body.data` throws a `TypeError` in the caller. A network failure never reached this code at all, because `fetch` rejected first and the raw `TypeError: Failed to fetch` became the banner text. And the server's `code` was copied through as a free `string`, so no caller could branch on it with the compiler's help (F-20, J27).

**Three exits, each named.**
`client/src/lib/api.ts` (working tree):
```ts
  } catch (err) {
    // The caller cancelled: let that through untouched so it can be ignored.
    if (signal?.aborted) throw signal.reason ?? err;
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new ApiError('The Stack Ready API took too long to answer.', 0, 'network');
    }
    throw new ApiError('Cannot reach the Stack Ready API. Is the server running?', 0, 'network');
  }
```
The order of the checks is the design. A caller abort is checked first, and it is rethrown **unwrapped**: `useResource` and `useDrillSession` drop a superseded request silently with `isAbortError`, and wrapping it in an `ApiError` would turn cancellation into a banner. The timeout is its own `DOMException` name. It is a network failure from the learner's point of view, so it gets the `network` code with a different sentence. `status: 0` marks "no HTTP response at all".

**The envelope check.**
```ts
function isEnvelope(body: unknown): body is { data: unknown } | { error: unknown } {
  return body !== null && typeof body === 'object' && ('data' in body || 'error' in body);
}
```
On a 2xx, `!isEnvelope(body) || !('data' in body)` becomes `bad_response`. On a non-2xx, a missing or malformed `error` still produces an `ApiError`, with `Request failed (<status>).` as the message. `toCode` then falls back to the status (404 → `not_found`, 413 → `payload_too_large`). What it does **not** check is the shape inside `data`. That is the stated trade-off in J27: the server is ours and shares `types.ts`, and the envelope is the part that fails in practice.

**Encoding is a security fix that looks like tidiness.** At the baseline, `client/src/lib/api.ts › module (L94–95 @ 6f1bf43)` interpolated the id raw. `/module/..%2Fprogress` in the address bar decoded to `../progress`, the URL parser normalised `/api/modules/../progress` to `/api/progress`, and the module page received progress JSON and crashed during render. `const enc = encodeURIComponent;` is now used on every path id. `exportUrl` is a plain string because the export route is path-scoped: an `<a download>` works with no header.

**`erasableSyntaxOnly` shapes the class.** `ApiError` declares its fields and assigns them in the constructor rather than using parameter properties, because that flag forbids TypeScript-only runtime syntax. It has a side effect you can use: Node 24's type stripping can import `api.ts` directly, which is what Observe 2 does.

**Two lists that must agree.** `server/src/errors.js › ERROR_CODES` and the client's `KNOWN_CODES` are the same eight strings, written twice. Nothing checks that they agree. If the server adds a code, the client downgrades it to `unknown` but keeps the message, so it fails soft. Opinion: that is acceptable until a UI branch needs the new code, and then a shared constant in `content/` (or a test that imports both) is the fix.

## Observe it

1. The suite: `cd client && npx vitest run src/lib/api.test.ts` prints `Tests  8 passed (8)`, including *throws bad_response when a 200 body is not an envelope*, *maps a fetch rejection to code "network"*, *encodes path ids* and *passes the AbortSignal through and rejects with AbortError when aborted*.
2. Feed `request()` five bad days, from the repo root (Node 24 strips the types):
   ```sh
   node --input-type=module -e "
   const { request, api } = await import('./client/src/lib/api.ts');
   const show = (p) => p.then((d) => console.log('ok', JSON.stringify(d)), (e) => console.log(e.name, e.code ?? '', '-', e.message));
   globalThis.fetch = async () => new Response('<!doctype html><title>app</title>', { status: 200, headers: { 'content-type': 'text/html' } });
   await show(request('/progress'));
   globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
   await show(request('/progress'));
   globalThis.fetch = async () => Response.json({ error: { code: 'teapot', message: 'short and stout' } }, { status: 418 });
   await show(request('/progress'));
   globalThis.fetch = async (url) => Response.json({ data: url });
   await show(api.module('../progress', 'p'));
   const c = new AbortController(); globalThis.fetch = (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(init.signal.reason)));
   const p = show(request('/slow', { signal: c.signal })); c.abort(); await p;"
   ```
   Output:
   ```
   ApiError bad_response - The API answered with something that is not Stack Ready data.
   ApiError network - Cannot reach the Stack Ready API. Is the server running?
   ApiError unknown - short and stout
   ok "/api/modules/..%2Fprogress"
   AbortError 20 - This operation was aborted
   ```
   The last line is the caller's abort coming back as the platform's `DOMException`. The `20` is `DOMException.ABORT_ERR`, the legacy numeric `code`, not an `ApiErrorCode`. That is exactly why callers must test with `isAbortError`, never with `err.code`.

## What is still wrong here

- J27 trade-off: a response with the right envelope and the wrong `data` shape passes. That is acceptable against a server we ship. Revisit if the client ever consumes a third-party API (J27 follow-up, not planned).
- `KNOWN_CODES` duplicates `ERROR_CODES` with no check that they agree (see above). There is no register row for it; F-16 was the same class of drift for `SessionMode`, closed by a lint rule.
- `withTimeout` silently drops the timeout when `AbortSignal.any` is missing and the caller passed a signal. Every current evergreen browser has it, and J27's reviewer note accepts the gap.

## Do it

1. (5 min) For each of the five lines in Observe 2, name the branch of `request()` that produced it.
2. (10 min) Add a sixth case to the snippet: a 200 with `{"error":{"code":"not_found","message":"x"}}`. Predict the result first, then run it. Is that the right answer for a server that sends an error envelope with a success status?
3. (20 min) Make the code lists impossible to drift. Add a test in `client/src/lib/api.test.ts` that imports `ERROR_CODES` from `server/src/errors.js` (or move the list to `content/` and import it from both sides) and asserts it equals the client's set. Prove it fails when you add `'rate_limited'` to the server list only.

## Check yourself

1. Why is the caller's abort rethrown unwrapped when every other failure is wrapped?
2. What did a learner see at the baseline when the server was stopped, and what do they see now?
3. Which check turns an HTML 200 into `bad_response`, and what does J27 deliberately not check?
4. Why is `encodeURIComponent` on a module id more than cosmetic?
5. What does `toCode` return for `{ error: { code: 'teapot' } }` on a 418, and why is the message still shown?

<details><summary>Answers</summary>

1. Cancellation is not an error. `useResource` and the drill hook ignore it with `isAbortError`. Wrapped, it would become a banner for a request the app cancelled on purpose.
2. At the baseline the banner read `Failed to fetch`. Now it reads "Cannot reach the Stack Ready API. Is the server running?" with code `network`.
3. `!isEnvelope(body) || !('data' in body)` on a 2xx. It does not validate the shape of `data` against `types.ts`.
4. Without it, `..%2F` in a URL becomes a path segment of `..`, the URL parser normalises it, and the client calls a different endpoint (path traversal on our own API).
5. `unknown`, because it is not in `KNOWN_CODES` and 418 has no status fallback. The server's message is safe by contract (5xx messages are replaced server-side), so showing it helps more than hiding it.

</details>
