> **Frozen review, pre-refactor. Do not edit.** Checked against commit `6f1bf43`; planning only.
> Produced on 2026-09-23 by a Fable agent as an adversarial review of the Opus agent's `content-audit` plan.
> Its corrections take precedence over the audit it reviews; the upskilling review is the spec this folder was built from.
> Line numbers are as of `6f1bf43`.
> Copied verbatim below this header.

# Review of `content-audit.md`

Reviewer stance: adversarial. Every "definite error" was re-derived independently; every replacement text was checked before being accepted. Nothing in the project was modified.

Evidence base (all reproduced in this session, scratch files under `scratchpad/rev/`):

- **TypeScript 5.9.3** (`node_modules/.bin/tsc --strict --noEmit`): six scratch files covering `ts-basics-14`, `ts-shapes-14`, `ts-basics-12`, `ts-practice-2`, `ts-practice-14`, `ts-basics-3/6/7`, `ts-shapes-4/11`, `ts-practice-4`, `ts-shapes-6`.
- **Node v24.19.0**: `require('./esm.mjs')` returns the namespace; `require()` of a module with top-level `await` throws `ERR_REQUIRE_ASYNC_MODULE`; `Promise.reject(...)` with no handler exits the process with code 1; every `output` snippet in the `js` track re-run.
- **react 19.3.0 / react-dom 19.3.0** (installed in the workspace): `sanitizeURL` replaces `javascript:` URLs with `javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')` in both the development and production client builds, applied to `href`, `src`, `action`/`formAction` and `xlink:href`; the string `useLayoutEffect does nothing on the server` is absent from both server builds; `react.development.js` says "Accessing element.ref was removed in React 19. ref is now a regular prop."
- **Express 5.2.1** (installed): `this.set('query parser', 'simple')` in `lib/application.js`; `req.query` is a `defineGetter`; `router@2.2.0/lib/layer.js` does `ret.then(null, error => next(error))` for handlers that return a promise.
- **Git 2.55.0** bundled docs (`git-config.html`): `gc.reflogExpire` "defaults to 90 days"; `gc.reflogExpireUnreachable` "... not reachable from the current tip; defaults to 30 days". No overrides set in this repo.
- **Statistics**: `scratchpad/rev/stats.mjs` over `content/index.js`.

Things I could not execute and settle by reasoning/knowledge only (flagged inline): the exact Node minor versions for `--watch` stability and `require(esm)` backports, ASP.NET Core middleware internals, Postgres 18 skip scan. What would settle each is noted where it matters.

---

## 1. Definite errors

### 1.1 `ts-basics-14` — CONFIRMED

Reproduced: the snippet as written compiles cleanly under `--strict`; adding `: number` yields `TS2366: Function lacks ending return statement and return type does not include 'undefined'`. `noImplicitReturns` (TS7030) is indeed outside `strict`. The audit's replacement `code`, `prompt`, `choices[1]` and `why` are correct as written. One sharpening: the `why` should say the inferred type is `number | undefined` *only because* both `if` branches return `number`; keep the audit text, it already says this.

Ship the audit's replacement unchanged (see §7).

### 1.2 `ts-shapes-14` — CONFIRMED

Reproduced on 5.9.3: `items.map((i) => i)` on `string[] | number[]` compiles, and the result type accepts `[1, 'a']`, i.e. it is `(string | number)[]`. The audit's rewritten question is correct. Minor: TS 5.2's rule applies when normal resolution fails and each member's method signature is compatible enough; for `map`/`filter`/`find` on unions of arrays it works, which is all the question claims. Keep `answer: 1`.

### 1.3 `js-modules-6` — CONFIRMED

Reproduced on Node 24.19: `require('./esm.mjs')` returns `[Module: null prototype] { __esModule: true, default: 'def', x: 1 }`; requiring a module with top-level `await` throws `ERR_REQUIRE_ASYNC_MODULE`. Version claims (unflagged in 22.12.0, backported to 20.19.0) match my knowledge of the release notes; I could not fetch them here. The replacement prompt, answer (`true`) and `why` are correct. One tweak to the `why`: the returned namespace carries `__esModule: true` when the module has a default export, which is why `require(esm).default` works the way CJS interop users expect — optional, not required.

### 1.4 `react-render-10` — CONFIRMED

react 19.3.0: "ref is now a regular prop". The keyed answer (`false`, about `key`) stands. Replacement `why` is correct. Sharpen "so `forwardRef` is no longer needed" to "so `forwardRef` still works but is no longer needed" (it is deprecated, not removed).

### 1.5 `react-effects-11` — CONFIRMED

The server warning string is absent from react-dom-server 19.3.0 (both node and edge builds). Replacement `why` is correct.

### 1.6 `node-express-4` — CONFIRMED

Node 24: an unhandled rejection terminates the process (exit 1) — reproduced. Express 4's `Layer.handle_request` calls the handler inside `try/catch` and ignores the returned promise, so the rejection is unhandled and the default `--unhandled-rejections=throw` (Node 15+) crashes the process. "The request hangs" is only true when something registers an `unhandledRejection` handler that swallows it. Express 5 (router 2.2.0) does `ret.then(null, next)`, so the "upgrade" advice is right.

The audit's replacement `choices[1]` and `why` are correct. One further edit is needed that the audit missed: after the fix, distractor `choices[3]` ("It crashes immediately with a stack trace to the client") overlaps with the new key (the process *does* crash). Replace it with a distinct misconception: "The `await` turns it into a synchronous throw, which the `try/catch` Express 4 wraps around every handler catches".

### 1.7 `js-objects-1` — CONFIRMED

One `console.log`. Prompt → `What is logged?`.

### 1.8 `craft-git-7` — CONFIRMED (audit is right, not backwards)

Git's own docs (2.55): `gc.reflogExpire` 90 days for reachable entries, `gc.reflogExpireUnreachable` 30 days for entries not reachable from the ref's current tip. The commits of a deleted unmerged branch are unreachable, so 30 days is the honest figure. Also correct: `git branch -D` removes `.git/logs/refs/heads/<name>`, leaving only HEAD's reflog (which only has the commits if you made them while that branch was checked out).

Replacement text is correct. Sharpen the `why` with "and only when `git gc` actually runs", because expiry is enforced by `git reflog expire`/`gc`, not by a clock. Final text in §7.

### 1.9 `craft-sec-2` — CONFIRMED, with a precision note

react-dom 19.3.0 replaces the URL with `javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')` — in the production build too — for `href`, `src`, `action`/`formAction` and `xlink:href`. So React 19 does not merely warn or error at render time: the attacker's URL never reaches the DOM; clicking runs a throw instead. "Blocks"/"neutralises" is accurate. React 18 only logged a deprecation warning in development and rendered the URL.

The audit's replacement `choices[1]` and `why` are correct. I would tighten the `why` to name the attributes and the mechanism; final text in §7.

### 1.10 `web-api-3` and `net-aspnet-4` — CONFIRMED

RFC 9457 (July 2023) obsoletes RFC 7807. Note the RFC's own title is "Problem Details for HTTP APIs"; `ProblemDetails` is the ASP.NET Core class name, so keep the backticked class name in `net-aspnet-4` and cite the RFC by number. Final text in §7.

Verdict on §1: **11 of 11 confirmed.** No replacement text was wrong; three were sharpened (1.4, 1.6, 1.8/1.9) and one missed follow-on edit was added (1.6 distractor).

---

## 2. Ambiguities

1. **`js-functions-4`** — agree. Reproduced: sloppy script on Node prints `"hi undefined"`; in an ES module it throws `TypeError: Cannot read properties of undefined (reading 'name')`. Ship: prepend `'use strict';\n` to `code`; `choices[2]` → `Throws a TypeError — \`this\` is \`undefined\`, so \`.name\` is read off undefined`; `why` → `Assigning the method to a variable loses the dot, so it is a plain call. In strict mode (which every ES module is) \`this\` is \`undefined\` and reading \`.name\` throws. In a sloppy-mode script \`this\` would be \`globalThis\` and you would get \`'hi undefined'\` instead — different symptom, same lost binding. Fix with \`user.greet.bind(user)\` or an arrow wrapper.`

2. **`js-values-1`** — agree. Prompt → `Which of these is **not** a JavaScript primitive type?`

3. **`react-state-13`** — agree, and the audit's replacement still leaves an overlap: "Uncontrolled inputs read from the DOM on submit only" is what react-hook-form does, and the new key says "or a form library". Ship: prompt `Your form has ten fields. Which approach scales best?`; choices `['Ten separate \`useState\` calls, one per field', 'One state object (or a reducer, or a form library) with a single generic change handler keyed by \`name\`', 'A \`useEffect\` per field that syncs it into a parent object', 'One \`useState\` holding the whole form as a JSON string, re-parsed on every change']`; `answer: 1`; `why` → `Ten \`useState\` calls are fine for three fields and unwieldy at ten. One object with \`setForm(f => ({ ...f, [name]: value }))\` keeps the fields together and scales; a reducer adds testable transitions; a library such as react-hook-form adds uncontrolled-input performance plus validation and is what most teams ship. A \`useEffect\` per field is the sync-state anti-pattern, and a stringified form loses types and re-parses on every keystroke.`

4. **`web-http-3`** — agree (the `why` itself concedes 422). Ship: `choices` → `['400', '409', '401', '500']`, `answer: 1` unchanged; `why` → `\`409 Conflict\` describes a clash with the current state of the resource — a duplicate, or a version mismatch. \`400\` is for malformed requests, \`401\` is about authentication, and \`500\` would blame the server for a user error. The other defensible code is \`422 Unprocessable Content\` (well-formed but semantically invalid input); pick one convention per API and be able to explain the distinction.`

5. **`web-browser-10`** — agree. Ship: prompt `A *simple* cross-origin \`GET\` fetch fails with a CORS error in the console. What actually happened?`; append to `why`: ` For a preflighted request (JSON body, custom header, PUT/DELETE), a failed \`OPTIONS\` preflight means the real request was never sent at all.`

6. **`net-aspnet-2`** — agree. `UseAuthentication` does not consult endpoint metadata, so `[2, 1, 0, 3]` also works; and `WebApplication` auto-inserts `UseRouting` at the start and `UseEndpoints` at the end when not called explicitly (which, incidentally, also makes `MapControllers()` position-insensitive in .NET 6+). The clean fix is to remove `UseRouting`. Ship: `choices` → `['\`app.UseAuthorization()\`', '\`app.UseExceptionHandler("/error")\`', '\`app.UseAuthentication()\`', '\`app.MapControllers()\`']`, `answer: [1, 2, 0, 3]`; `why` → `Exception handling goes first so it wraps everything that can throw; authentication establishes *who* the caller is; authorisation then decides whether they may proceed; endpoints run last. Swapping authentication and authorisation makes every \`[Authorize]\` endpoint answer 401 even to valid callers, because no identity has been established when the policy runs. \`WebApplication\` inserts \`UseRouting\` at the start of the pipeline for you; if you call it yourself, it must come before authentication and authorisation so the endpoint's \`[Authorize]\` metadata is known.` (Drops the unsupported "lets requests through".)

7. **`net-aspnet-8`** — agree; the documented value-provider order is form, body (with `[ApiController]`), route, query. Ship the audit's replacement choice verbatim.

8. **`craft-ship-7`** — agree. Ship the merge: `choices` → `['Mitigate — roll back, scale, or disable the feature flag', 'Triage — establish the scope of the impact and what changed', 'Fix the root cause properly and add a regression test']`, `answer: [1, 0, 2]`; `why` → `Triage, mitigate, then fix. Whether you look at scope or at recent changes first is situational — both are triage. The common mistake is jumping to the root cause while users are still affected: mitigation first buys you time to diagnose calmly, and the regression test is what stops the incident repeating.`

9. **`data-model-4`** — agree. Postgres 18 (GA September 2025) added B-tree skip scan; MySQL 8.0.13 and Oracle have it. Ship: prompt `You have a composite index on \`(customer_id, created_at)\`. Which query cannot use it for an index seek (a range lookup on the sorted key)?`; append to `why`: ` Some engines (Postgres 18+, MySQL 8.0.13+, Oracle) can "skip scan" the index for the second column in limited cases, but you should not design around it.`

10. **`data-sql-12`** — agree. Append to `why`: ` (In Postgres, a text column with a non-C collation needs the index created with \`text_pattern_ops\` — or the \`C\` collation — before \`LIKE 'ada@%'\` can use it.)`

11. **`web-http-12`** — agree that "matter" is subjective. Ship the prompt change: `Which headers should you check first when an API call from the browser fails?`; `why` last sentence → `\`X-Powered-By\` is an information leak you should remove in production; it can tell you which hop answered, but it is not where you start.`

12. **`ts-practice-2`** — agree. Reproduced: `let e1: E = 42` is TS2322 on 5.9; `let e2: E = n` with `n: number` compiles. Ship: `why` → `An \`enum\` is one of the few TypeScript features that is not erased — it generates an object. Numeric enums still accept any \`number\`-typed value (TS 5.0 only rejects out-of-range literals), which defeats much of the point. Enums are also not "erasable syntax", so they do not work with Node's built-in type stripping or \`--erasableSyntaxOnly\` (TS 5.8). \`const Status = {...} as const\` plus a derived union gives you the same ergonomics with plain JavaScript output.`

13. **`ts-basics-12`** — agree. Reproduced: `export const x = []` then `x.push(1)` → "not assignable to parameter of type 'never'"; a local `const arr = []` read before any push → TS7034/TS7005 "implicitly has type 'any[]'". Ship the audit's `why` sentence.

14. **`ts-basics-6`** — agree. Prompt → `What is the type \`Role\`?`

15. **`node-express-11`** — agree; Express 5.2.1 confirmed (`simple` parser, `req.query` getter). Ship: `why` → `Worth remembering: query values arrive as strings, as arrays of strings for repeated keys (\`?tag=a&tag=b\`), and — with Express 4's default "extended" parser — even as nested objects (\`?a[b]=1\`). Express 5 defaults to the simple parser (no nesting) and makes \`req.query\` a read-only getter. \`body\` needs parsing middleware. Validate and coerce all three rather than trusting them.`

16. **`node-runtime-14`** — agree. `--watch` shipped experimental in 18.11.0 and was marked stable in 22.0.0 with a backport to 20.13.0 (from memory of the release notes; `node --help` on 24 lists it without an "experimental" tag, consistent with stable). Ship: `why` → `\`node --watch server.js\` is built in (experimental from Node 18.11, stable since 22.0 and backported to 20.13). Related flags worth knowing: \`--env-file=.env\` to load environment variables without dotenv, and \`--inspect\` to attach a debugger.`

17. **`craft-sec-14`** — agree; Lax-by-default is Chromium behaviour, Firefox and Safari do not apply it. Ship: `why` first sentence → `Chromium-based browsers treat cookies without a \`SameSite\` attribute as \`Lax\`; Firefox and Safari do not, so always set it explicitly.`

18. **`craft-test-5`** — agree. Ship: `choices[2]` → `That the ORM's \`save()\` actually issues an INSERT`; append to `why`: ` (An integration test that round-trips one of *your* entities through *your* mapping is valuable; asserting that the ORM works is not.)`

19. **`net-di-12` and `craft-test-11`** — agree; `TimeProvider` is .NET 8, `FakeTimeProvider` is in `Microsoft.Extensions.TimeProvider.Testing`. Ship: `net-di-12` `choices[1]` → `Register an abstraction to an implementation (\`AddSingleton(TimeProvider.System)\`, \`AddScoped<IOrderRepository, SqlOrderRepository>()\`) and override the registration in the test host`; `why` first sentence → `Depending on \`TimeProvider\` (built in since .NET 8; \`FakeTimeProvider\` in tests) rather than \`DateTime.Now\` is a good example: it makes time-dependent logic testable.`; `craft-test-11` `why` → replace `Injecting an \`IClock\` (or \`vi.useFakeTimers()\`)` with `Injecting .NET's \`TimeProvider\` (with \`FakeTimeProvider\` in tests) or an \`IClock\` of your own, or using \`vi.useFakeTimers()\`,`.

20. **`cs-basics-13`** — agree. Ship: `d: 1`; prompt `What does \`x ??= Load();\` do in C#?`; `choices` → `['Assigns \`Load()\` to \`x\` only if \`x\` is null — \`Load()\` is not even called otherwise', 'Always calls \`Load()\` and assigns the result only if \`x\` was null', 'Compile error — \`??=\` does not exist in C#', 'Assigns if \`x\` is falsy (\`null\`, \`0\` or \`""\`)']`, `answer: 0`; `why` → `\`??=\` assigns only when the left side is null, and the right side is not evaluated otherwise — the same semantics as JavaScript. C# has no truthiness: \`??\` and \`??=\` look only at null, never at \`0\`, \`""\` or \`false\`, so there is no \`||=\` to confuse them with. \`?.\` is the null-conditional operator and \`!\` the null-forgiving one, the counterpart of TypeScript's non-null assertion.`

21. **`web-browser-2`** — agree. Ship: `why` last sentence → `React still delegates: one listener per event type on the root container (on \`document\` before React 17).`

All 21: agree. None should be left as is.

---

## 3. Short-answer additions

Verified against `server/src/grade.js`: `normalise()` lowercases, trims, strips trailing `.!?;` and collapses whitespace; it does not strip backticks or quotes. Recommendation stands: extend `normalise` to also strip leading/trailing `` ` ``, `'` and `"` (a one-line change: `.replace(/^[`'"]+|[`'"]+$/g, '')`). That is a server edit, so it is listed separately at the end of §7.

Accepted-answer additions (content edits):

| id | current | add |
| --- | --- | --- |
| `js-values-13` | `===`, `strict equality`, `=== (strict equality)` | `triple equals`, `triple equal`, `strict equals`, `strict equal`, `strict equality operator`, `the strict equality operator`, `=== operator` |
| `js-modules-14` | `npm ci`, `ci`, `npm clean-install` | `clean-install`, `npm install-clean`, `install-clean`, `npm ic`, `ic` (npm's documented aliases of `ci` are `clean-install`, `ic`, `install-clean`, `isntall-clean`; skip the typo one) |
| `node-runtime-14` | `--watch`, `watch`, `node --watch` | `node --watch <file>`, `node --watch server.js`, `node --watch index.js`, `node --watch app.js`, `--watch server.js`, `--watch index.js`, `node --watch=server.js`. Better long-term: in the grader, strip a leading `node ` and a trailing filename token before comparing for this question |
| `web-http-14` | `5xx`, `500`, `5`, `5xx (server error)` | `5**`, `5xx server error`, `5xx server errors`, `5xx errors`, `5xx error`, `server error`, `server errors`, `500s`; **remove** `500` (a specific code, not the family the prompt asks for). Keep `5`. |

---

## 4. Primer issues

Each factual claim verified; final passages given. Gap items (not factual errors) are marked "agree, optional".

1. **`js-modules`** — CONFIRMED outdated (§1.3). Replace `ESM can \`import\` CommonJS, but CommonJS cannot\n\`require\` ESM — it needs dynamic \`await import()\`. There is no\n\`__dirname\` in ESM; derive it from \`import.meta.url\`.` with: `ESM can \`import\` CommonJS. The reverse used to be impossible, but since Node 22.12 (and 20.19) CommonJS can \`require()\` an ES module synchronously — unless that module graph uses top-level \`await\`, in which case you still need \`await import()\`. There is no \`__dirname\` in ESM: use \`import.meta.dirname\` / \`import.meta.filename\` (Node 20.11+) or derive them from \`import.meta.url\`.`

2. **`react-effects`** — CONFIRMED on both counts: the "can't perform a React state update on an unmounted component" warning was removed in React 18; StrictMode's mount/unmount/remount of effects dates from React 18. Replace `Missing cleanup is the\nsource of "can't update state on an unmounted component" and of listeners\nstacking up on every render.` with `Missing cleanup is how listeners and intervals stack up on every render and keep stale closures (and the whole component scope) alive after unmount.` Replace `In development React 19 mounts, unmounts and remounts every component once, so\neach effect runs twice.` with `Since React 18, StrictMode in development mounts, unmounts and remounts every component once, so each effect runs twice.` Gaps (`useLayoutEffect`, debounce-via-cleanup, async callback, skip-first-run): agree, optional; suggested paragraph: `## useLayoutEffect\n\n\`useLayoutEffect\` runs synchronously after DOM mutation and before paint. Use it only to measure layout and adjust the DOM before the user sees a frame (tooltip positioning); for everything else it just delays painting. It does not run during server rendering. Two smaller rules: the effect callback itself cannot be \`async\` (React expects a cleanup function back, not a promise — define the async function inside and call it), and "skip the first run" is usually a sign the logic belongs in an event handler. Cleanup also gives you a debounce for free:\n\n\`\`\`js\nuseEffect(() => {\n  const t = setTimeout(() => search(query), 300);\n  return () => clearTimeout(t);   // each keystroke cancels the previous timer\n}, [query]);\n\`\`\``

3. **`react-render`** — CONFIRMED: StrictMode double-render predates 19 (React 19 additionally reuses the first render's `useMemo`/`useCallback` results during the second). Replace `That\nis why React 19's StrictMode double-invokes your component in development — to\nsurface impurity.` with `That is why StrictMode double-invokes your component in development — to surface impurity (React 19 also reuses the first call's \`useMemo\`/\`useCallback\` results on the second, so the double call is cheaper).` After `and \`key\` is not\nreadable as a prop.` add ` Since React 19, \`ref\` *is*: function components receive it as an ordinary prop and no longer need \`forwardRef\`.`

4. **`react-perf`** — agree, optional. React Compiler 1.0 shipped October 2025. Suggested text: `## Concurrent features and the compiler\n\n\`startTransition\`/\`useTransition\` mark an update as non-urgent so React can render the urgent one first and interrupt the slow one; \`useDeferredValue\` is the one-value version. React Compiler (stable since 1.0, October 2025) auto-memoises components and hooks at build time, which makes most manual \`useMemo\`/\`useCallback\`/\`memo\` unnecessary in compiled code — you should still know what it is automating.`

5. **`react-app`** — agree, optional. Suggested text: `## Hooks, briefly\n\nA custom hook is a function starting with \`use\` that calls other hooks; it shares *logic*, not state — two components using \`useOrders\` get independent state. Hooks must be called in the same order every render (no conditions or loops) because React matches them to state by call order. \`useRef\` holds a mutable value across renders without causing one. React 19 adds \`useActionState\` and \`useOptimistic\` for form actions and optimistic UI.`

6. **`node-express`** — agree (biggest gap). The contradiction fix: replace `query string is \`req.query\` (always strings,\nand \`?a=1&a=2\` gives an array)` with `query string is \`req.query\` (strings, arrays of strings for repeated keys, and in Express 4 possibly nested objects)`. Suggested new section, verified against Express 5.2.1 where possible: `## Express 5 vs 4\n\nExpress 5 (npm \`latest\` since March 2025) changes a handful of things you will be asked about: rejected promises from handlers and middleware are forwarded to error middleware, so \`asyncHandler\` wrappers are unnecessary; the path syntax moved to path-to-regexp 8 — wildcards must be named (\`/files/*splat\`), optional segments use braces (\`/users{/:id}\`), and regex characters in string paths are gone; \`req.query\` is a read-only getter and the default query parser is \`simple\` (no nested objects); \`req.body\` is \`undefined\` until a parser runs; \`res.status()\` rejects invalid codes; and \`app.del\`, \`req.param(name)\`, \`res.sendfile\` and \`res.json(obj, status)\` are removed. Behind a reverse proxy, set \`app.set('trust proxy', n)\` so \`req.ip\` and \`req.protocol\` come from \`X-Forwarded-*\` — with the real hop count, not \`true\`, because the header is client-supplied.`

7. **`node-runtime`** — agree, optional. Suggested text: `## Things that bite in production\n\nAn unhandled promise rejection terminates the process by default (Node 15+) — that is deliberate; log it, do not swallow it. On \`SIGTERM\`, stop accepting connections, finish in-flight requests, close the database pool, then exit; orchestrators send \`SIGKILL\` after the grace period. A \`Buffer\` is raw bytes and a string is text in an encoding: decode after concatenating chunks, not per chunk. In ESM there is no \`__dirname\` — use \`import.meta.dirname\`. The libuv thread pool (4 threads by default, \`UV_THREADPOOL_SIZE\`) handles \`fs\`, \`dns.lookup\`, \`crypto.pbkdf2\`/\`scrypt\` and \`zlib\`; network sockets do not use it.`

8. **`node-auth`** — CONFIRMED (SameSite). Replace `- \`SameSite=Lax\` (default) blocks the cookie on cross-site POSTs, which kills\n  most CSRF;` with `- \`SameSite=Lax\` blocks the cookie on cross-site POSTs, which kills most CSRF (Chromium treats a missing attribute as \`Lax\`; Firefox and Safari do not, so set it explicitly);`. Gaps: agree, optional; one sentence each: `Regenerate the session id on login (session fixation); return one error message for unknown user and wrong password (enumeration); rate-limit login per IP *and* per account (credential stuffing); keep tokens in an \`HttpOnly\` cookie rather than \`localStorage\`, which any XSS can read.`

9. **`web-browser`** — CONFIRMED (preflight). Replace `A request showing \`(failed) net::ERR_...\` with a CORS message in\nthe console usually **did** reach the server — the browser rejected the\nresponse afterwards.` with `A *simple* request showing \`(failed)\` with a CORS message in the console usually **did** reach the server — the browser rejected the response afterwards; a preflighted one (JSON body, custom headers) may have stopped at the \`OPTIONS\` preflight and never been sent.` Replace `and is\nhow React historically attached handlers (a single root listener rather than one\nper element).` with `and is how React attaches handlers: one listener per event type on the root container (on \`document\` before React 17).` Cross-reference: add ` Preflight and credentialed requests are covered in the API design module.` — optional.

10. **`web-api-design`** — CONFIRMED. Replace `A cross-origin request is sent\nand processed; the browser then withholds the response unless the server allowed\nit.` with `A *simple* cross-origin request is sent and processed; the browser then withholds the response unless the server allowed it. A non-simple one is preceded by a preflight, and if the preflight fails the real request is never sent.`

11. **`web-http`** — CONFIRMED (RFC 5789: PATCH is not idempotent in general, but may be). Table row `| PATCH | no | no | yes | partial update |` → `| PATCH | no | not necessarily | yes | partial update |`. 3xx line: `301 permanent, 302/307 temporary (307 preserves the method)` → `301/308 permanent, 302/307 temporary (307 and 308 preserve the method and body)`.

12. **`ts-practice`** — CONFIRMED (enum literal rule, TS 5.0). Replace `it\nis nominally typed, and numeric enums accept any number.` with `it is nominally typed, numeric enums accept any \`number\`-typed value (5.0 only rejects out-of-range literals), and it is not erasable syntax — Node's type stripping and \`--erasableSyntaxOnly\` (TS 5.8) reject it.` Gaps (`satisfies`, `tsc --noEmit`, local `.d.ts`, narrowing in callbacks): agree, optional; suggested: `\`satisfies T\` checks a value against a type while keeping the narrower inferred literal type. Vite/esbuild strip types without checking them, so \`tsc --noEmit\` in CI is the only real type gate. For an untyped library, a small local \`declare module "lib" { ... }\` beats \`any\`. Narrowing does not survive into a callback for mutable properties — copy \`u.name\` to a \`const\` first.`

13. **`ts-basics`** — agree, optional. Suggested: `\`strict\` bundles \`noImplicitAny\`, \`strictNullChecks\`, \`strictFunctionTypes\`, \`strictBindCallApply\`, \`strictPropertyInitialization\`, \`noImplicitThis\`, \`alwaysStrict\` and \`useUnknownInCatchVariables\` — the last is why \`catch (e)\` gives you \`unknown\`, because JavaScript can throw anything. Same-name \`interface\` declarations merge; \`type\` aliases do not.`

14. **`ts-shapes`** — agree, optional. Suggested: `\`readonly\` is erased like everything else — it stops assignment through that type at compile time and nothing at runtime. A branded type (\`string & { __brand: 'UserId' }\`) fakes nominal typing so two ids are not interchangeable. Since TS 5.2, calling \`map\`/\`filter\` on a union of arrays such as \`string[] | number[]\` works, but the result is an array of the union, \`(string | number)[]\`.`

15. **`js-values` / `js-objects-arrays` / `js-async`** — agree, optional. `js-values`: after the optional-chaining paragraph add `Object keys are always strings (or symbols): \`store[{id: 1}]\` becomes \`store["[object Object]"]\`, so use a \`Map\` for object keys. \`+\` concatenates when either side is a string; \`-\` always converts to numbers, so \`1 + '2' - 1\` is \`11\`.` `js-objects-arrays`: `\`flat(depth)\` defaults to depth 1; use a \`Map\` over a plain object when keys are not strings, order and size matter, or keys could collide with prototype names.` `js-async`: `\`AbortController\` (or \`AbortSignal.timeout(ms)\`) cancels a fetch rather than just racing it. For 500 calls with a limit of 5 in flight, write a bounded pool: N workers pulling from a shared index. In Node, \`process.nextTick\` runs before promise microtasks.`

16. **`data-modeling`** — CONFIRMED on both counts (Down migrations exist and `data-model-10` tells you to test rollback; MySQL/InnoDB defaults to REPEATABLE READ, Postgres and SQL Server to READ COMMITTED). Replace `**Migrations** are versioned, committed, forward-only schema changes —\nnever edit a shipped migration,` with `**Migrations** are versioned, committed, ordered schema changes; in production you usually roll forward with a new migration rather than running a down migration, but know whether yours are reversible. Never edit a shipped migration,`. Replace `(read committed is the\nusual default;` with `(read committed is the default in Postgres and SQL Server; MySQL/InnoDB defaults to repeatable read;`. Composite index sentence: after `leftmost prefix.` add ` (Some engines — Postgres 18+, MySQL 8.0.13+ — can skip-scan the second column in limited cases; do not design around it.)`. One extra I noticed: `**foreign keys usually are\nnot** [indexed]` is true for Postgres, SQL Server and SQLite but MySQL/InnoDB creates one automatically — add `(MySQL/InnoDB is the exception)`.

17. **`cs-linq-async`** — CONFIRMED (EF Core 3.0 removed implicit client evaluation except in the final projection; `cs-linq-5` already says so). Replace `And anything EF cannot translate (a call to your own C# method inside\n\`Where\`) either throws or silently forces client-side evaluation.` with `And anything EF cannot translate (a call to your own C# method inside \`Where\`) throws at runtime since EF Core 3.0 — only the final \`Select\` projection may still be evaluated client-side.`

18. **`net-aspnet`** — CONFIRMED (RFC). Replace `return an RFC 7807 \`ProblemDetails\` payload automatically` with `return an RFC 9457 (formerly 7807) \`ProblemDetails\` payload automatically`. `UseRouting` note: after `\`UseCors\` must come before anything that responds.` add ` \`WebApplication\` adds \`UseRouting\` at the start of the pipeline for you (and \`UseEndpoints\` at the end); if you call \`UseRouting\` explicitly it must precede authentication and authorisation so the endpoint's \`[Authorize]\` metadata is known.` Gaps (filter order, no `HttpContext.Current`, `ActionResult<T>` is already there): agree, optional: `Filters run inside MVC in the order authorization → resource → action → exception → result and, unlike middleware, see the action and its arguments. There is no \`HttpContext.Current\`; inject \`IHttpContextAccessor\` or take \`HttpContext\` as a parameter.`

19. **`net-efcore`** — agree, optional: `\`FromSql\`/\`FromSqlInterpolated\` parameterise an interpolated string; \`FromSqlRaw($"...{input}")\` is SQL injection. For genuinely parallel queries use \`IDbContextFactory\` to get one context per operation. The tracker returns the already-tracked instance for an id it has seen (identity resolution), which surprises people writing tests. \`ExecuteUpdate\`/\`ExecuteDelete\` (EF Core 7+) run set-based updates without loading entities.`

20. **`craft-git`** — CONFIRMED (§1.8). Replace `\`reflog\`\nremembers where HEAD has been for ~90 days and has saved everyone at least once.` with `\`reflog\` remembers where HEAD has been — ~90 days for entries still reachable, ~30 for commits no longer on any branch — and has saved everyone at least once.`

21. **`craft-security`** — CONFIRMED on both. `href={userInput}` (`javascript:` URLs)` → `\`href={userInput}\` with a \`javascript:\` URL (React 19 replaces these with a URL that throws; React 18 only warned)`. Broken Access Control was A5 in 2017 (A2/A4/A7 fragments in 2013), A01 in 2021 and A01 in 2025, so `Consistently the top item on the OWASP list` → `Top of the OWASP Top 10 since 2021`.

22. **`craft-shipping`** — CONFIRMED (step 5 says "Mitigate first"). Reorder the numbered list to: `1. **What changed?** ...` `2. **Scope it.** ...` `3. **If users are hurting, mitigate now** — roll back, scale, disable the flag — then diagnose.` `4. **Follow the data.** ...` `5. **Form one hypothesis, test it, write down what you learn.**` `6. **Fix properly**, then a blameless postmortem: ...`. Exact text in §7.

---

## 5. Position bias

Reproduced with `scratchpad/rev/stats.mjs` over `content/index.js` (434 questions):

- Single-answer (`mcq` + `output`): **389**, keyed at index 0: 15, **index 1: 363 (93.3%)**, index 2: 9, index 3: 2. Twenty modules are 100% index 1 (`ts-basics`, `react-render`, `react-effects`, `react-perf`, `react-app`, `node-runtime`, `node-express`, `node-auth`, `web-http`, `web-api-design`, `data-sql`, `cs-oop`, `cs-linq-async`, `net-aspnet`, `net-di-config`, `net-efcore`, `craft-testing`, `craft-security`, `craft-shipping`); the rest are all but one or two.
- The key is the **unique longest choice in 335/389 (86%)**, and tied-longest in a further 15.
- Booleans: 17, **15 keyed `false`**; `true` only in `js-modules-12` and `ts-basics-10` (and `js-modules-6` after fix 1.3).
- Extra finding the audit did not report: in `multi` questions choice index 0 is part of the key in **17 of 18** (all but `js-values-3`), and in 7 of 18 the single wrong choice is the last one. Shuffling `multi` choices is therefore as necessary as shuffling `mcq`.
- `client/src/pages/DrillPage.tsx` shuffles only `order` questions (`shuffled()` at line 572, applied at line 193). Grading (`server/src/grade.js`) is by index, so shuffling must map shuffled positions back to authored indices (or grade by choice id).

Every text that references choices by position (all must be reworded before shuffling; positional references in `prompt` and `ask` were also grepped — none):

| id | field | before | after |
| --- | --- | --- | --- |
| `js-objects-8` | `why` | `Option 3 drops every other property of \`user\` and \`prefs\`; option 4 mutates \`state\` in place. Immer and Redux Toolkit exist to write option 1 for you.` | `\`{ ...state, user: { prefs: { theme } } }\` drops every other property of \`user\` and \`prefs\`; \`Object.assign(state, ...)\` mutates \`state\` in place; \`{ ...state, theme }\` puts \`theme\` at the wrong level. Immer and Redux Toolkit exist to write the nested spread for you.` |
| `node-express-14` | `why` | `Option 4 is the trap: the process may be redeployed before the timer fires, and the work vanishes with no record.` | `\`setTimeout\` plus an immediate 200 is the trap: the process may be redeployed before the timer fires, and the work vanishes with no record.` |
| `data-sql-8` | `why` | `Option 3 is the classic near-miss: \`MAX(created_at)\` gives you the date` | `\`GROUP BY\` with \`MAX(created_at)\` is the classic near-miss: it gives you the date` |
| `net-ef-13` | `why` | `Note option 3 loads the whole table into memory first.` | `\`.ToList().Skip(...)\` loads the whole table into memory first.` |
| `node-express-10` | `why` | `The first four are baseline.` | `Helmet, rate limiting, a health endpoint and structured logging are baseline.` |
| `craft-sec-8` | `why` | `The first four are baseline.` | `HTTPS, rate limiting, identical error text and session regeneration are baseline.` |
| `ts-shapes-9` | `why` | `The first four are built-in narrowings.` | `\`typeof\`, \`instanceof\`, \`in\` and \`Array.isArray\` are built-in narrowings.` |
| `web-api-1` | `why` | `The last option is RPC over HTTP` | `\`POST /api\` with an \`action\` field is RPC over HTTP` |
| `react-state-13` | choice 3 | `Any of these can be defended; the object/reducer/library approach scales best` | removed by the §2.3 rewrite |

Choices that are position-safe despite looking positional: `ts-basics-3` (`A`/`B`/`Both`/`Neither` refer to code comments), `net-di-8` (same), `cs-linq-3` (`The first`/`The second` refer to code lines), `react-effects-3` (`Only the third is valid` refers to code lines), `data-sql-12` (`None of them`), `data-model-1` (`Either works`), `cs-basics-3` (`None, both mean nullable`). `cs-linq-9`'s "the trap in this question" is not positional.

---

## 6. What the audit missed

I read all 434 questions and re-ran every `js` `output` snippet and the TS snippets; 60+ items were checked individually (all `output`, `order`, `multi`, `boolean` and `d:3` questions plus a spread of `mcq`). Correct as written, verified by execution or by hand: `js-values-2/3/4/5/8/9/11/12/14`, `js-functions-2/5/7/9/11/13`, `js-objects-3/5/6/7/9/10/13/14`, `js-async-1/5/7/10/12`, `js-modules-3/12`, `ts-basics-3/7/11/13`, `ts-shapes-4/6/11`, `ts-practice-4/14`, `react-render-2/7`, `react-state-1/12`, `react-effects-3/9`, `node-runtime-7/9`, `web-browser-3/5/8/11`, `web-http-4/9`, `data-sql-1/4/5/9`, `data-model-13`, `cs-basics-2/6`, `cs-oop-2/7`, `cs-linq-2/3/9/14`, `net-aspnet-13`, `net-di-4/5/8/9/13`, `net-ef-9/10`, `craft-git-5/10`, `craft-test-7`, `craft-ship-1`.

Additional errors and weaknesses found:

1. **`cs-basics-12`** (error): prompt is `What does this print?` but the code contains no `Console.WriteLine`; nothing is printed. Fix: prompt → `What happens when this runs?`; `choices` → `['The list ends up as \`[1, 3]\`', 'It throws \`InvalidOperationException\`: collection was modified', 'The list is unchanged: \`[1, 2, 3]\`', 'The element is skipped silently']`; `answer: 1` unchanged.

2. **`web-http-2`** (inconsistency): `why` says `POST and PATCH are not [idempotent]`, while `web-http-5` and the primer (after fix 4.11) say PATCH "need not be". Change to `GET, PUT and DELETE are idempotent; POST is not and PATCH need not be`.

3. **`node-express-4`** distractor overlap after fix 1.6 — see §1.6.

4. **`react-state-13`** replacement overlap — see §2.3.

5. **`node-runtime-3`** (precision, optional): "DNS lookups" use the thread pool only for `dns.lookup` (getaddrinfo); `dns.resolve*` uses c-ares on the loop. Change `choices[1]` to `File system operations, \`dns.lookup\`, and crypto functions like \`pbkdf2\``.

6. **`js-functions-4`** `why` says "Rule 3"/"rule 4", which only makes sense if the learner has the primer's numbering in mind. Covered by the §2.1 rewrite, which spells the rules out.

7. **Difficulty** (agree with audit 5.8): `js-objects-13` is a plain filter/map chain and should be `d: 2`; `cs-basics-13` becomes `d: 1` with the rewrite. `ts-shapes-11` and `react-state-11` to `d: 2` — agree, optional.

8. **Boolean skew** (agree with audit 5.3): after 1.3 there are 3 `true` of 17. `react-state-9` can be flipped safely: prompt `After calling \`setCount(5)\`, reading \`count\` on the very next line still gives the old value.`, `answer: true`, `why` unchanged. `web-browser-13` can be flipped: `Reading a large value from \`localStorage\` blocks the main thread.`, `answer: true`. Both listed in §7 as optional.

Nothing else factually wrong was found in the remaining questions; the remaining weaknesses are the systemic ones the audit already documents (throwaway distractors, longest-choice tell, `output` used for non-trace questions).

---

## 7. Final fix list

Notation: values are the string *contents* of the field, shown unescaped. Two source-encoding facts matter when matching them (verified with `scratchpad/rev/verify2.mjs`, which found all 54 "before" passages below once these are applied): (a) every file under `content/` uses **CRLF** line endings, so a multi-line primer passage shown here with `\n` must be matched with `\r\n`; (b) the primers are template literals in which every backtick is written **`` \` ``**, so `` `req.query` `` in a "before" passage appears in the file as `` \`req.query\` `` — replacement text must use the same escaping. In `content/questions/*.js` the strings are single-quoted, so escape `'` as `\'` (or switch that literal to double quotes); `\n` inside a `code` value is a literal two-character escape exactly as the files already use. Items marked **(optional)** are improvements, not corrections.

### `content/questions/js.js`

1. `js-values-1` — `prompt`: before `How many primitive types does JavaScript have, and which of these is **not** one of them?` → after `Which of these is **not** a JavaScript primitive type?`
2. `js-values-13` — `answer`: before `['===', 'strict equality', '=== (strict equality)']` → after `['===', 'strict equality', '=== (strict equality)', 'triple equals', 'triple equal', 'strict equals', 'strict equal', 'strict equality operator', 'the strict equality operator', '=== operator']`
3. `js-functions-4` —
   - `code`: before `const user = {\n  name: 'Ada',\n  greet() { return 'hi ' + this.name; },\n};\nconst greet = user.greet;\ngreet();` → after `'use strict';\nconst user = {\n  name: 'Ada',\n  greet() { return 'hi ' + this.name; },\n};\nconst greet = user.greet;\ngreet();`
   - `choices[2]`: before `Throws — \`this\` is undefined in a module/strict context` → after `Throws a TypeError — \`this\` is \`undefined\`, so \`.name\` is read off undefined`
   - `why`: before `Rule 3 of \`this\` (\`obj.method()\`) only applies at the call site — assigning the method to a variable loses the dot, so it falls to rule 4: plain call. In a module or strict mode \`this\` is \`undefined\`, so reading \`.name\` throws. Fix with \`user.greet.bind(user)\` or an arrow wrapper.` → after `Assigning the method to a variable loses the dot, so it is a plain call. In strict mode (which every ES module is) \`this\` is \`undefined\` and reading \`.name\` throws. In a sloppy-mode script \`this\` would be \`globalThis\` and you would get \`'hi undefined'\` instead — different symptom, same lost binding. Fix with \`user.greet.bind(user)\` or an arrow wrapper.`
4. `js-objects-1` — `prompt`: before `What does the second log print?` → after `What is logged?`
5. `js-objects-8` — `why`: before `Every level on the path to the change must be copied — that is what "immutable update" means, and why deep state hurts. Option 3 drops every other property of \`user\` and \`prefs\`; option 4 mutates \`state\` in place. Immer and Redux Toolkit exist to write option 1 for you.` → after `Every level on the path to the change must be copied — that is what "immutable update" means, and why deep state hurts. \`{ ...state, user: { prefs: { theme } } }\` drops every other property of \`user\` and \`prefs\`; \`Object.assign(state, ...)\` mutates \`state\` in place; \`{ ...state, theme }\` puts \`theme\` at the wrong level. Immer and Redux Toolkit exist to write the nested spread for you.`
6. `js-objects-13` **(optional)** — `d`: before `3` → after `2`
7. `js-modules-6` —
   - `prompt`: before `A CommonJS file can \`require()\` an ES module directly.` → after `On current Node LTS (22.12+ / 24), a CommonJS file can \`require()\` an ES module, as long as that module does not use top-level \`await\`.`
   - `answer`: before `false` → after `true`
   - `why`: before `ESM is asynchronous by nature, so \`require\` of an ESM file throws \`ERR_REQUIRE_ESM\` (recent Node versions relax this for some cases). Use dynamic \`await import()\` from CommonJS. The reverse works: ESM can import CommonJS, getting \`module.exports\` as the default export.` → after `Node 22.12 (and 20.19) unflagged \`require(esm)\`: a synchronous ES module graph loads and \`require\` returns its namespace object. A module graph that contains top-level \`await\` still cannot be required synchronously and throws \`ERR_REQUIRE_ASYNC_MODULE\`; use \`await import()\` there. On older Node, requiring any ESM threw \`ERR_REQUIRE_ESM\` — which is why so much advice online still says "you cannot". The reverse has always worked: ESM can import CommonJS, getting \`module.exports\` as the default export.`
8. `js-modules-14` — `answer`: before `['npm ci', 'ci', 'npm clean-install']` → after `['npm ci', 'ci', 'npm clean-install', 'clean-install', 'npm install-clean', 'install-clean', 'npm ic', 'ic']`

### `content/questions/ts.js`

9. `ts-basics-6` — `prompt`: before `What type is inferred for \`role\`?` → after `What is the type \`Role\`?`
10. `ts-basics-12` — `why`: before `The exception is empty containers: \`const items = []\` is \`any[]\`, so write \`const items: Item[] = []\`.` → after `The exception is empty containers: \`const items = []\` gets a type that is either an evolving \`any[]\` or \`never[]\` depending on context, so write \`const items: Item[] = []\`.`
11. `ts-basics-14` —
    - `prompt`: before `Why does this error under \`strict\`?` → after `Why does this fail to compile?`
    - `code`: before `type Shape = { kind: 'circle'; r: number } | { kind: 'square'; size: number };\n\nfunction area(s: Shape) {\n  if (s.kind === 'circle') return Math.PI * s.r ** 2;\n  if (s.kind === 'square') return s.size ** 2;\n}` → after `type Shape = { kind: 'circle'; r: number } | { kind: 'square'; size: number };\n\nfunction area(s: Shape): number {\n  if (s.kind === 'circle') return Math.PI * s.r ** 2;\n  if (s.kind === 'square') return s.size ** 2;\n}`
    - `choices[1]`: before `The inferred return type includes \`undefined\`, because the compiler cannot see that the ifs are exhaustive` → after `The function can fall off the end and return undefined, which the declared \`number\` return type forbids; TypeScript does not treat an if-chain as exhaustive`
    - `why`: before `Two \`if\` statements with no \`else\` mean there is an implicit "fall off the end" path returning \`undefined\`. Use a \`switch\` with an exhaustive \`default\` that assigns to \`never\`, or a final \`else\` — then the return type is \`number\` and adding a third shape becomes a compile error rather than a runtime \`undefined\`.` → after `Two \`if\` statements with no \`else\` leave an implicit "fall off the end" path that returns \`undefined\`. TypeScript only proves exhaustiveness for a \`switch\` on the discriminant, not for a chain of ifs. With the \`number\` annotation that path is error TS2366; without the annotation it is not an error at all — the inferred return type silently becomes \`number | undefined\` (unless \`noImplicitReturns\` is on). Use a \`switch\` whose \`default\` assigns to \`never\`, or a final \`else\`, and adding a third shape becomes a compile error rather than a runtime \`undefined\`.`
12. `ts-shapes-9` — `why`: before `The first four are built-in narrowings.` → after `\`typeof\`, \`instanceof\`, \`in\` and \`Array.isArray\` are built-in narrowings.`
13. `ts-shapes-14` —
    - `prompt`: before `Why does this fail to compile?` → after `Since TypeScript 5.2, what is the type of \`i\` inside the callback, and of the return value?`
    - `choices`: before `['\`map\` does not exist on unions', 'TypeScript cannot resolve a single call signature for \`map\` across the union, because the callback parameter would have to be \`string\` and \`number\` at once', 'The return type is ambiguous', 'You cannot use unions as parameter types']` → after `['Compile error — no single call signature for \`map\` on a union', '\`i\` is \`string | number\`, and the result is \`(string | number)[]\`', '\`i\` is \`string\`, and the result is \`string[] | number[]\`', '\`i\` is \`never\`']`
    - `answer`: `1` (unchanged)
    - `why`: before `A union of array types is not the same as an array of a union. \`(string | number)[]\` works fine; \`string[] | number[]\` forces the compiler to pick one overload of \`map\` and it cannot. In practice, either widen the parameter to \`(string | number)[]\` or make the function generic.` → after `Before TS 5.2 this was the infamous "each member of the union has signatures, but none of those signatures are compatible with each other" error. TS 5.2 special-cases unions of arrays: it builds \`Array<string | number>\` and calls the method on that. The catch is that the result is \`(string | number)[]\`, not \`string[] | number[]\` — the union of arrays has become an array of a union. If you need to keep the distinction, make the function generic (\`<T extends string | number>(items: T[])\`).`
14. `ts-practice-2` — `why`: before `An \`enum\` is one of the few TypeScript features that is not erased — it generates an object. Numeric enums also accept any number, which defeats the point. \`const Status = {...} as const\` plus a derived union gives you the same ergonomics with plain JavaScript output.` → after `An \`enum\` is one of the few TypeScript features that is not erased — it generates an object. Numeric enums still accept any \`number\`-typed value (TS 5.0 only rejects out-of-range literals), which defeats much of the point. Enums are also not "erasable syntax", so they do not work with Node's built-in type stripping or \`--erasableSyntaxOnly\` (TS 5.8). \`const Status = {...} as const\` plus a derived union gives you the same ergonomics with plain JavaScript output.`
15. `ts-shapes-11` **(optional)** — `d`: `3` → `2`

### `content/questions/react.js`

16. `react-render-10` — `why`: before `\`key\` (and \`ref\`) are consumed by React itself and never reach your props. If you need the value inside, pass it a second time under another name: \`<Row key={id} id={id} />\`.` → after `\`key\` is consumed by React to identify the element and never reaches your props. If you need the value inside, pass it a second time under another name: \`<Row key={id} id={id} />\`. \`ref\` used to behave the same way, but since React 19 it is passed to function components as an ordinary prop, so \`forwardRef\` still works but is no longer needed.`
17. `react-state-9` **(optional, boolean balance)** — `prompt`: before `After calling \`setCount(5)\`, reading \`count\` on the very next line gives 5.` → after `After calling \`setCount(5)\`, reading \`count\` on the very next line still gives the old value.`; `answer`: `false` → `true`
18. `react-state-11` **(optional)** — `d`: `3` → `2`
19. `react-state-13` —
    - `prompt`: before `What is the right way to handle a form with ten fields?` → after `Your form has ten fields. Which approach scales best?`
    - `choices`: before `['Ten separate \`useState\` calls', 'One state object (or a reducer, or a form library) with a single generic change handler keyed by \`name\`', 'Uncontrolled inputs read from the DOM on submit only', 'Any of these can be defended; the object/reducer/library approach scales best']` → after `['Ten separate \`useState\` calls, one per field', 'One state object (or a reducer, or a form library) with a single generic change handler keyed by \`name\`', 'A \`useEffect\` per field that syncs it into a parent object', 'One \`useState\` holding the whole form as a JSON string, re-parsed on every change']`
    - `answer`: before `3` → after `1`
    - `why`: before `All three appear in real code and the honest answer names the trade-off: ten \`useState\` calls are fine for three fields and unwieldy at ten; one object with \`setForm(f => ({...f, [name]: value}))\` scales; a library (react-hook-form) adds uncontrolled performance plus validation and is what most teams ship. Interviewers want the reasoning, not a dogma.` → after `Ten \`useState\` calls are fine for three fields and unwieldy at ten. One object with \`setForm(f => ({ ...f, [name]: value }))\` keeps the fields together and scales; a reducer adds testable transitions; a library such as react-hook-form adds uncontrolled-input performance plus validation and is what most teams ship. A \`useEffect\` per field is the sync-state anti-pattern, and a stringified form loses types and re-parses on every keystroke.`
20. `react-effects-11` — `why`: before `\`useLayoutEffect\` runs synchronously after DOM mutation and before paint, so it blocks painting — right for measuring and positioning a tooltip, wrong for anything else because it delays the frame. It also warns during SSR, since there is no layout on the server.` → after `\`useLayoutEffect\` runs synchronously after DOM mutation and before paint, so it blocks painting — right for measuring and positioning a tooltip, wrong for anything else because it delays the frame. It does not run during server rendering at all (React 18 warned about that; React 19 removed the warning), so layout-dependent UI still needs a client-side fallback.`

### `content/questions/node.js`

21. `node-runtime-3` **(optional)** — `choices[1]`: before `File system operations, DNS lookups, and crypto functions like \`pbkdf2\`` → after `File system operations, \`dns.lookup\`, and crypto functions like \`pbkdf2\``
22. `node-runtime-14` —
    - `answer`: before `['--watch', 'watch', 'node --watch']` → after `['--watch', 'watch', 'node --watch', 'node --watch <file>', 'node --watch server.js', 'node --watch index.js', 'node --watch app.js', '--watch server.js', '--watch index.js', 'node --watch=server.js']`
    - `why`: before `\`node --watch server.js\` is built in from Node 18/20. Related flags worth knowing: \`--env-file=.env\` to load environment variables without dotenv, and \`--inspect\` to attach a debugger.` → after `\`node --watch server.js\` is built in (experimental from Node 18.11, stable since 22.0 and backported to 20.13). Related flags worth knowing: \`--env-file=.env\` to load environment variables without dotenv, and \`--inspect\` to attach a debugger.`
23. `node-express-4` —
    - `choices[1]`: before `It becomes an unhandled rejection and the request hangs — Express 4 does not catch async errors` → after `It becomes an unhandled rejection — Express 4 ignores the returned promise, so the error middleware never sees it and (on Node 15+) the whole process crashes`
    - `choices[3]`: before `It crashes immediately with a stack trace to the client` → after `The \`await\` turns it into a synchronous throw, which the \`try/catch\` Express 4 wraps around every handler catches`
    - `why`: before `Express 4 calls your handler and ignores the returned promise. Wrap handlers (\`const asyncHandler = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next)\`), use express-async-errors, or upgrade — Express 5 forwards rejections to error middleware for you.` → after `Express 4 calls your handler and ignores the promise it returns, so the rejection never reaches \`next\`. On modern Node an unhandled rejection terminates the process by default, killing every in-flight request, not just this one; if something registers an \`unhandledRejection\` handler that swallows it instead, this request simply hangs until it times out. Fix it by wrapping handlers (\`const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)\`), by using express-async-errors, or by upgrading — Express 5 forwards rejected promises to error middleware for you.`
24. `node-express-10` — `why`: before `The first four are baseline.` → after `Helmet, rate limiting, a health endpoint and structured logging are baseline.`
25. `node-express-11` — `why`: before `Worth remembering: query values are always strings, \`?tag=a&tag=b\` gives you an array (so a validator must handle both), and \`body\` needs parsing middleware. Coerce and validate all three rather than trusting them.` → after `Worth remembering: query values arrive as strings, as arrays of strings for repeated keys (\`?tag=a&tag=b\`), and — with Express 4's default "extended" parser — even as nested objects (\`?a[b]=1\`). Express 5 defaults to the simple parser (no nesting) and makes \`req.query\` a read-only getter. \`body\` needs parsing middleware. Validate and coerce all three rather than trusting them.`
26. `node-express-14` — `why`: before `Option 4 is the trap: the process may be redeployed before the timer fires, and the work vanishes with no record.` → after `\`setTimeout\` plus an immediate 200 is the trap: the process may be redeployed before the timer fires, and the work vanishes with no record.`

### `content/questions/web.js`

27. `web-browser-2` — `why`: before `React historically used a single root listener for exactly this reason.` → after `React still delegates: one listener per event type on the root container (on \`document\` before React 17).`
28. `web-browser-10` —
    - `prompt`: before `A \`fetch\` fails with a CORS error in the console. What actually happened?` → after `A *simple* cross-origin \`GET\` fetch fails with a CORS error in the console. What actually happened?`
    - `why`: append ` For a preflighted request (JSON body, custom header, PUT/DELETE), a failed \`OPTIONS\` preflight means the real request was never sent at all.`
29. `web-browser-13` **(optional, boolean balance)** — `prompt`: before `\`localStorage\` is asynchronous, so reading a large value does not block the main thread.` → after `Reading a large value from \`localStorage\` blocks the main thread.`; `answer`: `false` → `true`
30. `web-http-2` — `why`: before `GET, PUT and DELETE are idempotent; POST and PATCH are not — which is why` → after `GET, PUT and DELETE are idempotent; POST is not and PATCH need not be — which is why`
31. `web-http-3` —
    - `choices`: before `['400', '409', '422', '500']` → after `['400', '409', '401', '500']`
    - `why`: before `\`409 Conflict\` describes a clash with the current state of the resource — a duplicate, or a version mismatch. \`400\` is for malformed requests and \`422\` for well-formed-but-semantically-invalid input; either 409 or 422 is defensible here as long as you can explain the distinction. \`500\` would blame the server for a user error.` → after `\`409 Conflict\` describes a clash with the current state of the resource — a duplicate, or a version mismatch. \`400\` is for malformed requests, \`401\` is about authentication, and \`500\` would blame the server for a user error. The other defensible code is \`422 Unprocessable Content\` (well-formed but semantically invalid input); pick one convention per API and be able to explain the distinction.`
32. `web-http-8` **(optional)** — `d`: `2` → `1`
33. `web-http-12` —
    - `prompt`: before `Which headers matter when debugging an API call?` → after `Which headers should you check first when an API call from the browser fails?`
    - `why`: before `\`X-Powered-By\` is just an information leak you should remove in production.` → after `\`X-Powered-By\` is an information leak you should remove in production; it can tell you which hop answered, but it is not where you start.`
34. `web-http-14` — `answer`: before `['5xx', '500', '5', '5xx (server error)']` → after `['5xx', '5', '5xx (server error)', '5xx (server errors)', '5**', '5xx server error', '5xx server errors', '5xx errors', '5xx error', 'server error', 'server errors', '500s']`
35. `web-api-1` — `why`: before `The last option is RPC over HTTP — legitimate as a deliberate style, but do not call it REST.` → after `\`POST /api\` with an \`action\` field is RPC over HTTP — legitimate as a deliberate style, but do not call it REST.`
36. `web-api-3` — `why`: before `RFC 7807 \`ProblemDetails\` is a ready-made shape and is the ASP.NET Core default.` → after `RFC 9457 Problem Details (which obsoletes RFC 7807) is a ready-made shape and is the ASP.NET Core default.`

### `content/questions/data.js`

37. `data-sql-8` — `why`: before `Option 3 is the classic near-miss: \`MAX(created_at)\` gives you the date but` → after `\`GROUP BY\` with \`MAX(created_at)\` is the classic near-miss: it gives you the date but`
38. `data-sql-12` — `why`: append ` (In Postgres, a text column with a non-C collation needs the index created with \`text_pattern_ops\` — or the \`C\` collation — before \`LIKE 'ada@%'\` can use it.)`
39. `data-model-4` —
    - `prompt`: before `You have a composite index on \`(customer_id, created_at)\`. Which query cannot use it?` → after `You have a composite index on \`(customer_id, created_at)\`. Which query cannot use it for an index seek (a range lookup on the sorted key)?`
    - `why`: append ` Some engines (Postgres 18+, MySQL 8.0.13+, Oracle) can "skip scan" the index for the second column in limited cases, but you should not design around it.`

### `content/questions/csharp.js`

40. `cs-basics-12` —
    - `prompt`: before `What does this print?` → after `What happens when this runs?`
    - `choices`: before `['\`1 3\`', 'It throws \`InvalidOperationException\`: collection was modified', '\`1 2 3\`', 'It skips silently']` → after `['The list ends up as \`[1, 3]\`', 'It throws \`InvalidOperationException\`: collection was modified', 'The list is unchanged: \`[1, 2, 3]\`', 'The element is skipped silently']`
41. `cs-basics-13` —
    - `d`: before `2` → after `1`
    - `prompt`: before `What is the C# equivalent of JavaScript's \`??=\`?` → after `What does \`x ??= Load();\` do in C#?`
    - `choices`: before `['\`?:\`', '\`??=\`', '\`||=\`', '\`?.\`']` → after `['Assigns \`Load()\` to \`x\` only if \`x\` is null — \`Load()\` is not even called otherwise', 'Always calls \`Load()\` and assigns the result only if \`x\` was null', 'Compile error — \`??=\` does not exist in C#', 'Assigns if \`x\` is falsy (\`null\`, \`0\` or \`""\`)']`
    - `answer`: before `1` → after `0`
    - `why`: before `C# has \`??\` (null-coalescing), \`??=\` (null-coalescing assignment) and \`?.\` (null-conditional) with the same semantics you know. \`!\` is the null-forgiving operator, the counterpart of TypeScript's non-null assertion.` → after `\`??=\` assigns only when the left side is null, and the right side is not evaluated otherwise — the same semantics as JavaScript. C# has no truthiness: \`??\` and \`??=\` look only at null, never at \`0\`, \`""\` or \`false\`, so there is no \`||=\` to confuse them with. \`?.\` is the null-conditional operator and \`!\` the null-forgiving one, the counterpart of TypeScript's non-null assertion.`

### `content/questions/dotnet.js`

42. `net-aspnet-2` —
    - `choices`: before `['\`app.UseAuthorization()\`', '\`app.UseRouting()\`', '\`app.UseAuthentication()\`', '\`app.MapControllers()\`']` → after `['\`app.UseAuthorization()\`', '\`app.UseExceptionHandler("/error")\`', '\`app.UseAuthentication()\`', '\`app.MapControllers()\`']`
    - `answer`: `[1, 2, 0, 3]` (unchanged)
    - `why`: before `Routing must run first so the endpoint (and its \`[Authorize]\` metadata) is known; then authentication establishes *who* the caller is; then authorisation decides whether they may proceed; then the endpoint executes. Swapping authentication and authorisation is a classic misconfiguration that silently 401s or, worse, lets requests through.` → after `Exception handling goes first so it wraps everything that can throw; authentication establishes *who* the caller is; authorisation then decides whether they may proceed; endpoints run last. Swapping authentication and authorisation makes every \`[Authorize]\` endpoint answer 401 even to valid callers, because no identity has been established when the policy runs. \`WebApplication\` inserts \`UseRouting\` at the start of the pipeline for you; if you call it yourself, it must come before authentication and authorisation so the endpoint's \`[Authorize]\` metadata is known.`
43. `net-aspnet-4` — `why`: before `The generated error shape is RFC 7807 \`ProblemDetails\`, which is a good default to standardise on across the API.` → after `The generated error shape is RFC 9457 Problem Details (the successor to RFC 7807), the \`ProblemDetails\` class, which is a good default to standardise on across the API.`
44. `net-aspnet-8` — `choices[1]`: before `By convention — route values, then query string, then form/body — with \`[FromRoute]\`, \`[FromQuery]\`, \`[FromBody]\`, \`[FromServices]\` to be explicit` → after `By convention from the request's sources (route values, query string, form, body) according to the parameter's type, with \`[FromRoute]\`, \`[FromQuery]\`, \`[FromBody]\`, \`[FromServices]\` to be explicit`
45. `net-di-12` —
    - `choices[1]`: before `Register an interface to an implementation (\`AddScoped<IClock, SystemClock>()\`) and override the registration in the test host` → after `Register an abstraction to an implementation (\`AddSingleton(TimeProvider.System)\`, \`AddScoped<IOrderRepository, SqlOrderRepository>()\`) and override the registration in the test host`
    - `why`: before `Depending on \`IClock\` rather than \`DateTime.Now\` is a good example: it makes time-dependent logic testable.` → after `Depending on \`TimeProvider\` (built in since .NET 8; \`FakeTimeProvider\` in tests) rather than \`DateTime.Now\` is a good example: it makes time-dependent logic testable.`
46. `net-ef-13` — `why`: before `Note option 3 loads the whole table into memory first.` → after `\`.ToList().Skip(...)\` loads the whole table into memory first.`

### `content/questions/craft.js`

47. `craft-git-7` —
    - `choices[1]`: before `No — \`git reflog\` records where HEAD has been for around 90 days, so you can find the commit and branch from it` → after `No — as long as you had checked it out, \`git reflog\` still lists the commits HEAD pointed at; unreachable entries are kept for about 30 days by default, so you can find the sha and branch from it`
    - `why`: before `Git very rarely loses committed work. \`git reflog\`, find the sha, \`git branch recovered <sha>\`. Knowing reflog exists is the difference between a five-minute recovery and redoing a day of work.` → after `Git very rarely loses committed work. \`git reflog\`, find the sha, \`git branch recovered <sha>\`. Deleting a branch deletes that branch's own reflog, but HEAD's reflog still has the commits; entries for unreachable commits expire after ~30 days (\`gc.reflogExpireUnreachable\`) and reachable ones after ~90 (\`gc.reflogExpire\`) — and only when \`git gc\` actually runs. Knowing reflog exists is the difference between a five-minute recovery and redoing a day of work.`
48. `craft-test-5` —
    - `choices[2]`: before `That the ORM saves a row` → after `That the ORM's \`save()\` actually issues an INSERT`
    - `why`: append ` (An integration test that round-trips one of *your* entities through *your* mapping is valuable; asserting that the ORM works is not.)`
49. `craft-test-11` — `why`: before `Injecting an \`IClock\` (or \`vi.useFakeTimers()\`) makes them deterministic` → after `Injecting .NET's \`TimeProvider\` (with \`FakeTimeProvider\` in tests) or an \`IClock\` of your own, or using \`vi.useFakeTimers()\`, makes them deterministic`
50. `craft-sec-2` —
    - `choices[1]`: before `\`dangerouslySetInnerHTML\`, user-controlled \`href\` (\`javascript:\` URLs), injecting into script or style, and unsanitised rich-text HTML` → after `\`dangerouslySetInnerHTML\`, unsanitised rich-text HTML, anything injected into \`<script>\`/\`<style>\` or set via refs/\`innerHTML\`, and — before React 19 — user-controlled \`javascript:\` URLs in \`href\``
    - `why`: before `\`{userInput}\` is safe because React escapes it. Everything that bypasses that escaping is a risk. Sanitise HTML with DOMPurify, validate URL schemes before rendering a link, and add a Content-Security-Policy as a second line of defence.` → after `\`{userInput}\` is safe because React escapes it. Everything that bypasses that escaping is a risk. React 19 also neutralises \`javascript:\` URLs in \`href\`, \`src\` and \`action\` by replacing them with a URL that throws (React 18 only warned in development), but you should still validate URL schemes, because other frameworks, older React versions and direct DOM code do not. Sanitise HTML with DOMPurify and add a Content-Security-Policy as a second line of defence.`
51. `craft-sec-8` — `why`: before `The first four are baseline.` → after `HTTPS, rate limiting, identical error text and session regeneration are baseline.`
52. `craft-sec-14` — `why`: before `\`Lax\` is the modern browser default and a good balance.` → after `Chromium-based browsers treat cookies without a \`SameSite\` attribute as \`Lax\`; Firefox and Safari do not, so always set it explicitly. \`Lax\` is a good balance.`
53. `craft-ship-7` —
    - `choices`: before `['Mitigate — roll back, scale, or disable the feature flag', 'Establish what changed and when it started', 'Fix the root cause properly and add a regression test', 'Scope the impact — which users, which endpoints']` → after `['Mitigate — roll back, scale, or disable the feature flag', 'Triage — establish the scope of the impact and what changed', 'Fix the root cause properly and add a regression test']`
    - `answer`: before `[1, 3, 0, 2]` → after `[1, 0, 2]`
    - `why`: before `What changed, how bad is it, stop the bleeding, then fix properly. The common mistake is jumping to the root cause while users are still affected — mitigation first buys you time to diagnose calmly.` → after `Triage, mitigate, then fix. Whether you look at scope or at recent changes first is situational — both are triage. The common mistake is jumping to the root cause while users are still affected: mitigation first buys you time to diagnose calmly, and the regression test is what stops the incident repeating.`

### `content/modules/stage-1-2.js`

54. `js-modules` primer — before `ESM can \`import\` CommonJS, but CommonJS cannot\n\`require\` ESM — it needs dynamic \`await import()\`. There is no\n\`__dirname\` in ESM; derive it from \`import.meta.url\`.` → after `ESM can \`import\` CommonJS. The reverse used to be impossible, but since Node 22.12 (and 20.19) CommonJS can \`require()\` an ES module synchronously — unless that module graph uses top-level \`await\`, in which case you still need \`await import()\`. There is no \`__dirname\` in ESM: use \`import.meta.dirname\` / \`import.meta.filename\` (Node 20.11+) or derive them from \`import.meta.url\`.`
55. `ts-practice` primer — before `it\nis nominally typed, and numeric enums accept any number.` → after `it is nominally typed, numeric enums accept any \`number\`-typed value (5.0 only rejects out-of-range literals), and it is not erasable syntax — Node's type stripping and \`--erasableSyntaxOnly\` (TS 5.8) reject it.` **(optional)** add the gap paragraph from §4.12 after "## Reading errors".
56. `ts-basics` primer **(optional)** — add the §4.13 sentence to "## strict mode".
57. `ts-shapes` primer **(optional)** — add the §4.14 paragraph after "## Utility types worth memorising".
58. `web-browser` primer —
    - before `and is\nhow React historically attached handlers (a single root listener rather than one\nper element).` → after `and is how React attaches handlers: one listener per event type on the root container (on \`document\` before React 17).`
    - before `A request showing \`(failed) net::ERR_...\` with a CORS message in\nthe console usually **did** reach the server — the browser rejected the\nresponse afterwards.` → after `A *simple* request showing \`(failed)\` with a CORS message in the console usually **did** reach the server — the browser rejected the response afterwards; a preflighted one (JSON body, custom headers) may have stopped at the \`OPTIONS\` preflight and never been sent. Preflight and credentialed requests are covered in the API design module.`
59. `js-values` / `js-objects-arrays` / `js-async` primers **(optional)** — add the §4.15 sentences.

### `content/modules/stage-3-5.js`

60. `react-render` primer —
    - before `That\nis why React 19's StrictMode double-invokes your component in development — to\nsurface impurity.` → after `That is why StrictMode double-invokes your component in development — to surface impurity (React 19 also reuses the first call's \`useMemo\`/\`useCallback\` results on the second, so the double call is cheaper).`
    - before `and \`key\` is not\nreadable as a prop.` → after `and \`key\` is not readable as a prop. Since React 19, \`ref\` *is*: function components receive it as an ordinary prop and no longer need \`forwardRef\`.`
61. `react-effects` primer —
    - before `Missing cleanup is the\nsource of "can't update state on an unmounted component" and of listeners\nstacking up on every render.` → after `Missing cleanup is how listeners and intervals stack up on every render and keep stale closures (and the whole component scope) alive after unmount.`
    - before `In development React 19 mounts, unmounts and remounts every component once, so\neach effect runs twice.` → after `Since React 18, StrictMode in development mounts, unmounts and remounts every component once, so each effect runs twice.`
    - **(optional)** add the `## useLayoutEffect` paragraph from §4.2 before "## The modern answer".
62. `react-perf` primer **(optional)** — add the §4.4 section before "## Beyond React".
63. `react-app` primer **(optional)** — add the §4.5 section before "## Accessibility, briefly".
64. `node-runtime` primer **(optional)** — add the §4.7 section before "## Scripts and the CLI".
65. `node-express` primer —
    - before `query string is \`req.query\` (always strings,\nand \`?a=1&a=2\` gives an array)` → after `query string is \`req.query\` (strings, arrays of strings for repeated keys, and in Express 4 possibly nested objects)`
    - add the `## Express 5 vs 4` section from §4.6 after "## Production hygiene".
66. `node-auth` primer — before `- \`SameSite=Lax\` (default) blocks the cookie on cross-site POSTs, which kills\n  most CSRF;` → after `- \`SameSite=Lax\` blocks the cookie on cross-site POSTs, which kills most CSRF (Chromium treats a missing attribute as \`Lax\`; Firefox and Safari do not, so set it explicitly);`. **(optional)** add the §4.8 gap sentences to "## Authorisation in the code".
67. `web-http` primer —
    - before `| PATCH | no | no | yes | partial update |` → after `| PATCH | no | not necessarily | yes | partial update |`
    - before `301 permanent, 302/307 temporary (307 preserves the method)` → after `301/308 permanent, 302/307 temporary (307 and 308 preserve the method and body)`
68. `web-api-design` primer — before `A cross-origin request is sent\nand processed; the browser then withholds the response unless the server allowed\nit.` → after `A *simple* cross-origin request is sent and processed; the browser then withholds the response unless the server allowed it. A non-simple one is preceded by a preflight, and if the preflight fails the real request is never sent.`
69. `data-modeling` primer —
    - before `**Migrations** are versioned, committed, forward-only schema changes —\nnever edit a shipped migration,` → after `**Migrations** are versioned, committed, ordered schema changes; in production you usually roll forward with a new migration rather than running a down migration, but know whether yours are reversible. Never edit a shipped migration,`
    - before `(read committed is the\nusual default;` → after `(read committed is the default in Postgres and SQL Server; MySQL/InnoDB defaults to repeatable read;`
    - before `but not on \`created_at\` alone — leftmost prefix.` → after `but not on \`created_at\` alone — leftmost prefix (some engines — Postgres 18+, MySQL 8.0.13+ — can skip-scan the second column in limited cases; do not design around it).`
    - before `**foreign keys usually are\nnot**, and that is a very common cause of slow joins.` → after `**foreign keys usually are not** (MySQL/InnoDB is the exception), and that is a very common cause of slow joins.`

### `content/modules/stage-6-7.js`

70. `cs-linq-async` primer — before `And anything EF cannot translate (a call to your own C# method inside\n\`Where\`) either throws or silently forces client-side evaluation.` → after `And anything EF cannot translate (a call to your own C# method inside \`Where\`) throws at runtime since EF Core 3.0 — only the final \`Select\` projection may still be evaluated client-side.`
71. `net-aspnet` primer —
    - before `return an RFC 7807 \`ProblemDetails\` payload automatically` → after `return an RFC 9457 (formerly 7807) \`ProblemDetails\` payload automatically`
    - before `and \`UseCors\` must come before anything that responds.` → after `and \`UseCors\` must come before anything that responds. \`WebApplication\` adds \`UseRouting\` at the start of the pipeline for you (and \`UseEndpoints\` at the end); if you call \`UseRouting\` explicitly it must precede authentication and authorisation so the endpoint's \`[Authorize]\` metadata is known.`
    - **(optional)** add the §4.18 filter/HttpContext sentences to "## Returning results".
72. `net-efcore` primer **(optional)** — add the §4.19 paragraph after "## Queries that go wrong".
73. `craft-git` primer — before `\`reflog\`\nremembers where HEAD has been for ~90 days and has saved everyone at least once.` → after `\`reflog\` remembers where HEAD has been — ~90 days for entries still reachable, ~30 for commits no longer on any branch — and has saved everyone at least once.`
74. `craft-security` primer —
    - before `Consistently the top item on the OWASP list, and the one juniors miss.` → after `Top of the OWASP Top 10 since 2021, and the one juniors miss.`
    - before `\`dangerouslySetInnerHTML\`, \`href={userInput}\` (\`javascript:\` URLs),` → after `\`dangerouslySetInnerHTML\`, \`href={userInput}\` with a \`javascript:\` URL (React 19 replaces these with a URL that throws; React 18 only warned),`
75. `craft-shipping` primer — replace the numbered list
    ```
    1. **What changed?** Deploys, config, feature flags, traffic, upstream.
    2. **Scope it.** All users or some? All endpoints or one? When did it start?
    3. **Follow the data.** Metrics for the shape, logs for the detail, traces for
       the layer.
    4. **Form one hypothesis, test it, write down what you learn.**
    5. **Mitigate first** (roll back, scale, disable the flag), fix properly after.
    6. Afterwards, a blameless postmortem: timeline, root cause, what made it slow
       to detect, one or two concrete actions.
    ```
    with
    ```
    1. **What changed?** Deploys, config, feature flags, traffic, upstream.
    2. **Scope it.** All users or some? All endpoints or one? When did it start?
    3. **If users are hurting, mitigate now** — roll back, scale, disable the
       flag — then diagnose calmly.
    4. **Follow the data.** Metrics for the shape, logs for the detail, traces for
       the layer.
    5. **Form one hypothesis, test it, write down what you learn.**
    6. **Fix properly**, then a blameless postmortem: timeline, root cause, what
       made it slow to detect, one or two concrete actions.
    ```

### Outside `content/` (required for the position-bias fix; not content edits)

76. `server/src/grade.js` — `normalise()`: add `.replace(/^[\`'"]+|[\`'"]+$/g, '')` after `.trim()` so pasted backticks/quotes do not fail `short` answers.
77. Shuffle `mcq`, `multi` and `output` choices per presentation (client `DrillPage.tsx` currently shuffles only `order`), mapping displayed positions back to authored indices before calling `/answers`, or grade by choice id. Apply the §5 rewordings first.

Edits 1–75 are content-only; none change a question id, so existing progress records remain valid (except that `js-modules-6`, `react-state-13`, `react-state-9`, `web-browser-13`, `cs-basics-13`, `craft-ship-7` and `net-aspnet-2` change their key, so any stored "mastered" state for those seven should be reset).
