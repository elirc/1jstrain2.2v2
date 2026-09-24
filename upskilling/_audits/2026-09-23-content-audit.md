> **Frozen audit, pre-refactor. Do not edit.** Read at commit `6f1bf43`; planning only, no project file was changed when it was written.
> Produced on 2026-09-23 by an Opus agent (the `content-audit` audit), then adversarially reviewed by a Fable agent (see `2026-09-23-content-audit.review.md`).
> Line numbers, counts and reproductions are as of `6f1bf43`; the working tree has moved on. Where the review corrects this audit, the review wins.
> Register rows in `../10-findings-register.md` point here by section and finding id; journal entries cite it as "Closes <id>".
> Copied verbatim below this header so the evidence outlives the planning scratchpad.

# Stack Ready: content audit

Scope: `content/questions/*.js` (9 files, all 434 questions) and `content/modules/*.js` (31 primers). I read every question and every primer. No project file was modified.

How I checked:
- **TypeScript** snippets were type-checked with the repo's own TypeScript 5.9.3 (`tsc --strict --noEmit`).
- **JavaScript** snippets were run on Node v24.19.0, including a `require()` of an `.mjs` file.
- **React 19** claims were checked against the React CHANGELOG (the 19.0.0 section).
- **TS 5.2** claims were checked against the TS 5.2 release notes.
- Everything else was traced by hand.

---

## 1. Definite errors

### 1.1 `ts-basics-14`: the code does not error under `strict`

The prompt asks "Why does this error under `strict`?" It doesn't. The function has no return-type annotation, so TypeScript infers `number | undefined` and reports nothing. The "not all code paths return a value" check is `noImplicitReturns` (TS7030), and that flag is not part of `strict`.

- **Verified:** the snippet exactly as written compiles with `tsc --strict`.
- **With an annotation:** adding `: number` produces `TS2366: Function lacks ending return statement and return type does not include 'undefined'`.

Fix: annotate the return type.

- `code`:
  ```
  type Shape = { kind: 'circle'; r: number } | { kind: 'square'; size: number };

  function area(s: Shape): number {
    if (s.kind === 'circle') return Math.PI * s.r ** 2;
    if (s.kind === 'square') return s.size ** 2;
  }
  ```
- `prompt`: `Why does this fail to compile?`
- `choices[1]`: `The function can fall off the end and return undefined, which the declared \`number\` return type forbids; TypeScript does not treat an if-chain as exhaustive`
- `why`: `Two \`if\` statements with no \`else\` leave an implicit "fall off the end" path that returns \`undefined\`. TypeScript only proves exhaustiveness for a \`switch\` on the discriminant, not for a chain of ifs. With the \`number\` annotation that path is error TS2366; without the annotation it is not an error at all — the inferred return type silently becomes \`number | undefined\` (unless \`noImplicitReturns\` is on). Use a \`switch\` whose \`default\` assigns to \`never\`, or a final \`else\`.`

### 1.2 `ts-shapes-14`: the code compiles on TypeScript 5.2 and later

`items.map((i) => i)` on `string[] | number[]` was an error before TS 5.2. Since 5.2, TypeScript treats a union of arrays as `(string | number)[]` for method calls when normal resolution fails ("Easier Method Usage for Unions of Arrays").

- **Verified:** it compiles on TS 5.9.3 with `--strict`.

So the key, "cannot resolve a single call signature", is outdated for every current TypeScript. Replace the question:

- `prompt`: `Since TypeScript 5.2, what is the type of \`i\` inside the callback, and of the return value?`
- `code`: unchanged.
- `choices`:
  - `Compile error — no single call signature for \`map\` on a union`
  - `\`i\` is \`string | number\`, and the result is \`(string | number)[]\``
  - `\`i\` is \`string\`, and the result is \`string[] | number[]\``
  - `\`i\` is \`never\``
- `answer`: `1`
- `why`: `Before TS 5.2 this was the infamous "each member of the union has signatures, but none are compatible" error. TS 5.2 special-cases unions of arrays: it builds \`Array<string | number>\` and calls the method on that. The catch is that the result is \`(string | number)[]\`, not \`string[] | number[]\`: the union of arrays has become an array of a union. If you need to keep the distinction, make the function generic (\`<T extends string | number>(items: T[])\`).`

### 1.3 `js-modules-6`: `require()` of ESM now works on every supported Node LTS

Keyed `false` for "A CommonJS file can `require()` an ES module directly." That is no longer true:

- **When it changed:** `require(esm)` is unflagged since Node 22.12, and was backported to 20.19.
- **Current LTS lines:** Node 22 and 24 both support it.
- **Verified:** on Node 24.19, `require('./esm.mjs')` returns the module namespace.
- **What still throws:** only an ES module that uses top-level `await`, with `ERR_REQUIRE_ASYNC_MODULE`.

The `why` already hedges ("recent Node versions relax this"), but the key is still wrong. Replace:

- `prompt`: `On current Node LTS (22.12+ / 24), a CommonJS file can \`require()\` an ES module, as long as that module does not use top-level \`await\`.`
- `answer`: `true`
- `why`: `Node 22.12 (and 20.19) unflagged \`require(esm)\`: a synchronous ES module graph loads and \`require\` returns its namespace object. A module graph that contains top-level \`await\` still cannot be required synchronously and throws \`ERR_REQUIRE_ASYNC_MODULE\`; use \`await import()\` there. On older Node, requiring any ESM threw \`ERR_REQUIRE_ESM\` — which is why so much advice online still says "you cannot". The reverse has always worked: ESM can import CommonJS, getting \`module.exports\` as the default export.`

### 1.4 `react-render-10`: the `why` is wrong about `ref` in React 19

The `why` says "`key` (and `ref`) are consumed by React itself and never reach your props." In React 19, `ref` *is* a regular prop for function components, and `forwardRef` is no longer needed (React 19 CHANGELOG: "ref as a prop"). The keyed answer (`false`, about `key`) is still right.

- `why`: `\`key\` is consumed by React to identify the element and never reaches your props. If you need the value inside, pass it a second time under another name: \`<Row key={id} id={id} />\`. Note that \`ref\` used to behave the same way, but since React 19 it is passed to function components as an ordinary prop, so \`forwardRef\` is no longer needed.`

### 1.5 `react-effects-11`: the `why` claims a warning that React 19 removed

"It also warns during SSR, since there is no layout on the server." React 19 removed the server-side `useLayoutEffect` warning (CHANGELOG 19.0.0: "Remove layout effect warning on server").

- `why`: `\`useLayoutEffect\` runs synchronously after DOM mutation and before paint, so it blocks painting — right for measuring and positioning a tooltip, wrong for anything else because it delays the frame. It does not run during server rendering at all (React 18 warned about that; React 19 removed the warning), so layout-dependent UI still needs a client-side fallback.`

### 1.6 `node-express-4`: "the request hangs" is wrong on modern Node

The code is Express 4 with an async handler that rejects. Express 4 ignores the returned promise, so the rejection is unhandled. Since Node 15, the default `--unhandled-rejections=throw` makes that **crash the process**, taking every in-flight request down with it. The request only "hangs" if something swallows unhandled rejections.

This also contradicts `node-runtime-9`, which correctly says the process terminates by default.

- `choices[1]`: `It becomes an unhandled rejection — Express 4 ignores the returned promise, so the error middleware never sees it and (on Node 15+) the whole process crashes`
- `why`: `Express 4 calls your handler and ignores the promise it returns, so the rejection never reaches \`next\`. On modern Node an unhandled rejection terminates the process by default, killing every in-flight request, not just this one; if something registers an \`unhandledRejection\` handler that swallows it instead, this request simply hangs until it times out. Fix it by wrapping handlers (\`const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)\`), by using express-async-errors, or by upgrading — Express 5 forwards rejected promises to error middleware for you.`

### 1.7 `js-objects-1`: the prompt refers to a "second log" that does not exist

The code has one `console.log`.

- `prompt`: `What is logged?`

### 1.8 `craft-git-7`: the recovery window for a deleted branch is ~30 days, not ~90

The choice says reflog "records where HEAD has been for around 90 days". Git's defaults are:

- `gc.reflogExpire`, for entries still reachable: 90 days.
- `gc.reflogExpireUnreachable`, for entries not reachable from the ref tip: 30 days.

Commits from a deleted, unmerged branch are unreachable. Deleting a branch also deletes that branch's own reflog, so only HEAD's reflog remains. The primer (`craft-git`) repeats the "~90 days" claim.

- `choices[1]`: `No — as long as you had checked it out, \`git reflog\` still lists the commits HEAD pointed at; unreachable entries are kept for about 30 days by default, so you can find the sha and branch from it`
- `why`: `Git very rarely loses committed work. \`git reflog\`, find the sha, \`git branch recovered <sha>\`. Deleting a branch deletes that branch's own reflog, but HEAD's reflog still has the commits; entries for unreachable commits expire after ~30 days (\`gc.reflogExpireUnreachable\`) and reachable ones after ~90. Knowing reflog exists is the difference between a five-minute recovery and redoing a day of work.`

### 1.9 `craft-sec-2`: the keyed choice lists an XSS vector that React 19 blocks

React 19 replaces `javascript:` URLs with a function that throws (CHANGELOG 19.0.0), so `href={userInput}` with a `javascript:` URL no longer executes. React 18 only warned.

The keyed answer is still the best choice, but it teaches an outdated fact. The same claim appears in the `craft-security` primer.

- `choices[1]`: `\`dangerouslySetInnerHTML\`, unsanitised rich-text HTML, anything injected into \`<script>\`/\`<style>\` or set via refs/\`innerHTML\`, and — before React 19 — user-controlled \`javascript:\` URLs in \`href\``
- `why`: `\`{userInput}\` is safe because React escapes it. Everything that bypasses that escaping is a risk. React 19 also neutralises \`javascript:\` URLs in \`href\`/\`src\` (18 only warned), but you should still validate URL schemes, because other frameworks, older React versions and direct DOM code do not. Sanitise HTML with DOMPurify and add a Content-Security-Policy as a second line of defence.`

### 1.10 `web-api-3` and `net-aspnet-4`: RFC 7807 has been obsoleted by RFC 9457

RFC 9457 (July 2023) obsoletes RFC 7807. The shape is compatible, but the citation is stale. The `net-aspnet` primer has the same citation.

- `web-api-3` `why`: replace `RFC 7807 \`ProblemDetails\`` with `RFC 9457 Problem Details (which obsoletes RFC 7807)`.
- `net-aspnet-4` `why`: replace `RFC 7807 \`ProblemDetails\`` with `RFC 9457 Problem Details (the successor to RFC 7807)`.

---

## 2. Ambiguities and weak questions

1. **`js-functions-4`: `this` in a detached method.** The snippet has no `'use strict'` and no module marker. As a CommonJS or classic script in Node it returns `'hi undefined'` (verified on Node 24). In a sloppy browser script it returns `'hi '`, because `window.name` is `''`. Only choice C ("Throws — ... module/strict context") is keyed, so a candidate can defend B.
   - Rewrite: add `// inside an ES module` or `'use strict';` as the first line of `code`, and change choice C to `Throws a TypeError — \`this\` is undefined`.

2. **`js-values-1`: two questions, one answer.** The prompt asks "How many primitive types... **and** which is not one of them", but the choices only answer the second part.
   - Rewrite: `Which of these is **not** a JavaScript primitive type?`

3. **`react-state-13`: a meta answer that overlaps a real one.** The key is choice 3, "Any of these can be defended; the object/reducer/library approach scales best". Choice 1 ("One state object (or a reducer, or a form library)...") is exactly the approach choice 3 endorses, so choosing 1 is defensible.
   - Rewrite: `Your form has ten fields. What scales best?`, key choice 1, and drop the meta choice (replace it with `A \`useEffect\` per field to sync it into a parent object`).

4. **`web-http-3`: 409 vs 422.** Both are in the choices and the `why` itself says "either 409 or 422 is defensible". That is an unwinnable MCQ.
   - Fix: replace the `422` choice with `401`, or convert to `multi` with `answer: [1, 2]`.

5. **`web-browser-10`: the request may never leave the browser.** The keyed answer says the request was sent and the response withheld. That is only true for simple requests. Most SPA calls are JSON POSTs, which are preflighted; if the preflight fails, the real request is **never sent** (choice A).
   - Rewrite the prompt: `A simple \`GET\` fetch to another origin fails with a CORS error in the console. What actually happened?`
   - Add to `why`: `For a preflighted request (JSON body, custom header), a failed \`OPTIONS\` preflight means the real request was never sent.`

6. **`net-aspnet-2`: more than one working order.** `UseAuthentication` before `UseRouting` also works: authentication does not need the endpoint, and authorisation does. So `[2, 1, 0, 3]` is functional too. In .NET 6+ `WebApplication` also inserts `UseRouting` implicitly.
   - Rewrite: `Given explicit \`UseRouting\`, which order does the documentation prescribe?`, or drop `UseRouting` and order `UseExceptionHandler`, `UseAuthentication`, `UseAuthorization`, `MapControllers`.
   - The `why` claim "or, worse, lets requests through" is doubtful. Authorisation before authentication typically yields 401 for authenticated users. Remove it.

7. **`net-aspnet-8`: the stated order of binding sources is wrong.** The keyed choice lists "route values, then query string, then form/body". The ASP.NET Core docs list the order as form fields, request body (with `[ApiController]`), route data, query string. The key is still the best choice, but the sequence it teaches is wrong.
   - Change the choice to: `By convention from the request's sources (route values, query string, form, body) according to the parameter's type, with \`[FromRoute]\`, \`[FromQuery]\`, \`[FromBody]\`, \`[FromServices]\` to be explicit`.

8. **`craft-ship-7`: two defensible orders.** Many incident runbooks triage impact first ("how bad, who is affected"), then look for what changed. `[3, 1, 0, 2]` is as defensible as `[1, 3, 0, 2]`.
   - Fix: merge the two steps into `Triage — establish scope and what changed`, leaving three items, or make it an MCQ ("What comes before the root-cause fix?").

9. **`data-model-4`: "cannot use it" is too absolute.** The leftmost-prefix rule is right for index seeks, but several engines can now skip-scan a composite index on its second column:
   - Postgres 18 (released September 2025),
   - MySQL 8.0.13+,
   - Oracle.

   A full index scan is also possible.
   - Rewrite: `Which query cannot use it for an efficient index seek (range lookup)?`
   - Add to `why`: `Some engines (Postgres 18+, MySQL 8.0.13+, Oracle) can "skip scan" in limited cases, but you should not design around it.`

10. **`data-sql-12`: a Postgres collation caveat.** In Postgres, a default B-tree on a text column with a non-C collation cannot serve `LIKE 'ada@%'`. You need `text_pattern_ops` (or the C collation).
    - Add to `why`: `(In Postgres with a non-C collation, the index must be created with \`text_pattern_ops\` for this to work.)`

11. **`web-http-12`: `X-Powered-By` can matter too.** "Which headers matter when debugging" is subjective. `X-Powered-By` (or `Server`, `Via`) tells you which hop actually answered, for example a proxy's error page instead of your app.
    - Reword the last choice to `\`X-Powered-By\` — worth keeping in production responses`, or reword the prompt to `Which headers should you check first when an API call from the browser fails?`

12. **`ts-practice-2`: "numeric enums accept any number" is partly outdated.** Since TS 5.0, assigning an out-of-range *literal* (`let e: E = 42`) is an error. I verified this; a `number`-typed variable is still accepted.
    - Change the `why` to: `Numeric enums still accept any \`number\`-typed value (TS 5.0 only rejects out-of-range literals), which defeats much of the point.`
    - Add: `Enums are also not "erasable syntax", so they do not work with Node's built-in type stripping or \`--erasableSyntaxOnly\` (TS 5.8).`

13. **`ts-basics-12`: "`const items = []` is `any[]`" is not quite right.** Under `strict`, a local `const items = []` is an *evolving* array, and at module scope with `export` it is `never[]`. I verified this: a later `push(1)` errors with "not assignable to never". The advice is still right; tighten the fact.
    - `why`: `...The exception is empty containers: \`const items = []\` gets a type that is either evolving \`any[]\` or \`never[]\` depending on context, so write \`const items: Item[] = []\`.`

14. **`ts-basics-6`: the prompt names a variable that does not exist.** It asks "What type is inferred for `role`?", but the code declares the type alias `Role` and no variable `role`.
    - `prompt`: `What is the type \`Role\`?`

15. **`node-express-11`: "always strings" contradicts itself.** The `why` says query values are always strings, then that `?tag=a&tag=b` gives an array. With Express 4's default `extended` (qs) parser, `?a[b]=1` also gives nested objects. Express 5's default is the `simple` parser, which gives no nested objects.
    - `why`: `...query values arrive as strings, arrays of strings for repeated keys, and — with Express 4's default "extended" parser — even nested objects (\`?a[b]=1\`). Express 5 defaults to the simple parser and makes \`req.query\` a read-only getter. Validate and coerce all three...`

16. **`node-runtime-14`: the version claim is off.** "Built in from Node 18/20" is misleading. `--watch` arrived experimentally in 18.11 and became stable in 22.0 (and 20.13).
    - `why`: `\`node --watch server.js\` is built in (experimental from 18.11, stable since 20.13/22)...`

17. **`craft-sec-14`: `Lax` is not every browser's default.** The `why` says "`Lax` is the modern browser default", and the `node-auth` primer says "`SameSite=Lax` (default)". Lax-by-default is a Chromium behaviour; Firefox and Safari do not apply it.
    - Replace with: `Chromium-based browsers treat cookies without a \`SameSite\` attribute as \`Lax\`; others do not, so always set it explicitly.`

18. **`craft-test-5`: "the ORM saves a row" can be worth testing.** A reasonable candidate would include it: mapping configuration, value converters and constraints are *your* code.
    - Reword the choice to `That calling the ORM's \`save\` method calls the ORM's \`save\` method`, which is unambiguously worthless, or add to the `why`: `(An integration test that round-trips an entity through your mapping is valuable; asserting the ORM works is not.)`

19. **`net-di-12` and `craft-test-11`: `IClock` is dated for .NET 8.** Both use a hand-rolled `IClock`/`SystemClock`. .NET 8 ships `TimeProvider` (and `FakeTimeProvider` for tests), which is the answer interviewers now expect.
    - `net-di-12`, choice text: `(\`AddSingleton(TimeProvider.System)\` or \`AddScoped<IOrderRepository, SqlOrderRepository>()\`)`
    - `net-di-12` `why`: `Depending on \`TimeProvider\` (built in since .NET 8) rather than \`DateTime.Now\` ...`
    - `craft-test-11` `why`: mention `TimeProvider`/`FakeTimeProvider` alongside `vi.useFakeTimers()`.

20. **`cs-basics-13`: the answer is in the question.** "What is the C# equivalent of JavaScript's `??=`?", with the key `??=`. It tests nothing.
    - Rewrite: `What does \`x ??= Load();\` do in C#?`, with the choices `Assigns only if x is null (Load not called otherwise)`, `Always calls Load, assigns if null`, `Compile error`, `Assigns if x is falsy`. Also lower to `d: 1`.

21. **`web-browser-2`: "historically" suggests React stopped.** "React historically used a single root listener" implies React no longer delegates. It still does: on `document` before v17, on the root container since. The primer says the same.
    - Replace with: `React still delegates: one listener per event type on the root container (on \`document\` before React 17).`

---

## 3. Incomplete `short` answer lists

The grader (`server/src/grade.js`) lowercases, trims and strips trailing `.!?;`. It does **not** strip backticks or quotes, and people paste those. The cleanest fix is in the normaliser: also strip `` ` ``, `'` and `"`. If that is not done, add backticked variants to each list.

| id | add |
| --- | --- |
| `js-values-13` | `triple equals`, `strict equals`, `strict equality operator`, `the strict equality operator` |
| `js-modules-14` | `npm install-clean`, `npm ic` (both are real npm aliases of `npm ci`) |
| `node-runtime-14` | `node --watch <file>`, `node --watch server.js`, `node --watch index.js`. Better: have the grader accept any answer that normalises to `--watch` after stripping a leading `node ` and a trailing filename |
| `web-http-14` | `5**`, `5xx server error`, `5xx errors`, `server error`, `server errors`, `500s`. Also reconsider accepting `500` and `5`: `500` is a specific code, not the family the prompt asks for |

---

## 4. Primer issues

1. **`js-modules`: CommonJS and ESM.**
   - Passage: "ESM can `import` CommonJS, but CommonJS cannot `require` ESM — it needs dynamic `await import()`."
   - Problem: outdated (see 1.3).
   - Replacement: `ESM can \`import\` CommonJS. The reverse used to be impossible, but since Node 22.12 (and 20.19) CommonJS can \`require()\` an ES module synchronously — unless that module graph uses top-level \`await\`, in which case you still need \`await import()\`.`
   - Also add `import.meta.dirname` / `import.meta.filename` (Node 20.11+) next to "derive it from `import.meta.url`".

2. **`react-effects`: removed warning and version.**
   - Passage: "Missing cleanup is the source of 'can't update state on an unmounted component'..."
   - Problem: that warning was removed in React 18.
   - Replacement: `Missing cleanup is how listeners and intervals stack up and keep stale closures (and the whole component scope) alive after unmount.`
   - Passage: "In development React 19 mounts, unmounts and remounts". This behaviour dates from React 18. Say `Since React 18, StrictMode in development mounts, unmounts and remounts...`.
   - Gaps against this module's questions: `useLayoutEffect` (`react-effects-11`), a debounce built from effect cleanup (10), an async effect callback (9), skipping the first run (14). Add a short "`useLayoutEffect` vs `useEffect`" paragraph and the debounce snippet.

3. **`react-render`.**
   - Passage: "React 19's StrictMode double-invokes your component". StrictMode double rendering predates 19. Say `StrictMode double-invokes your component in development (React 19 also reuses the first call's useMemo/useCallback results on the second)`.
   - Add after "`key` is not readable as a prop": `(Since React 19, \`ref\` is — function components receive it as a normal prop and no longer need \`forwardRef\`.)`

4. **`react-perf`: gaps.**
   - `useTransition`/`useDeferredValue` (`react-perf-10`) and React Compiler (`react-perf-14`) are tested but not covered.
   - Add: `## Concurrent features` — `startTransition` marks an update as interruptible; `useDeferredValue` lags a value. Add `## React Compiler` — stable since v1.0 (October 2025), it auto-memoises components and hooks at build time, which makes most manual `useMemo`/`useCallback`/`memo` unnecessary in compiled code.

5. **`react-app`: gaps.** Custom hooks, the rules of hooks, `useRef` and `useOptimistic` are tested (`react-app-7/9/10/12`) but not covered. Add a short "Hooks" section: custom hooks share logic not state, hooks are called in the same order every render, `useRef` is mutable and does not trigger renders, React 19 adds `useOptimistic`/`useActionState`.

6. **`node-express`: nothing on Express 5.** This is the biggest gap given the stated stack. Express 5.1 has been the npm `latest` since March 2025. Add a section `## Express 5 vs 4`:
   - Rejected promises from handlers and middleware are forwarded to error middleware.
   - Path syntax changed (path-to-regexp 8): wildcards must be named (`/*splat`), optional segments use braces (`/users{/:id}`), and regex characters in string paths are not supported.
   - `req.query` is a read-only getter, and the default query parser is `simple` (no nested objects).
   - `req.body` is `undefined` unless a parser ran.
   - `res.status()` rejects invalid codes.
   - Removed: `app.del`, `req.param(name)`, `res.sendfile` (use `res.sendFile`), `res.json(obj, status)`.
   - Also fix the contradiction "`req.query` (always strings, and `?a=1&a=2` gives an array)". It should read: `strings, arrays of strings for repeated keys, and in Express 4 possibly nested objects`.
   - Gap: `trust proxy` (`node-express-12`) is not mentioned.

7. **`node-runtime`: gaps.** The module's questions test these, but the primer does not cover them:
   - unhandled-rejection behaviour (`node-runtime-9`),
   - `SIGTERM` graceful shutdown (10),
   - `Buffer` vs string (11),
   - `import.meta.dirname` (12),
   - which operations use the thread pool (3): `fs`, `dns.lookup`, `crypto.pbkdf2`/`scrypt`, `zlib`; default 4 threads, `UV_THREADPOOL_SIZE`.

   Add a short paragraph on each.

8. **`node-auth`: cookie defaults and gaps.**
   - "`SameSite=Lax` (default)" is Chromium-only (see 2.17).
   - Gaps: session fixation and regenerating the id on login (`node-auth-12`), user enumeration (9), credential stuffing and rate limiting (14), `localStorage` vs `HttpOnly` cookie for tokens (6).

9. **`web-browser`: CORS.**
   - Passage: "A request showing `(failed)` ... with a CORS message usually **did** reach the server."
   - Qualify it: `...a *simple* request usually did reach the server; a preflighted one (JSON body, custom headers) may have stopped at the \`OPTIONS\` preflight.`
   - This module's questions test preflight and credentials (`web-browser-11/12`), but that material is only in the `web-api-design` primer. Add two sentences or a cross-reference.
   - "how React historically attached handlers": see 2.21.

10. **`web-api-design`.**
    - Passage: "A cross-origin request is sent and processed; the browser then withholds the response."
    - Replacement: `A *simple* cross-origin request is sent and processed; the browser then withholds the response. A non-simple one is preceded by a preflight, and if the preflight fails the real request is never sent.`

11. **`web-http`.**
    - "PATCH | Idempotent: no" should read "not necessarily", since an idempotent PATCH is allowed.
    - Add `308` (permanent, method-preserving) to the 3xx line; `web-http-9` tests it.

12. **`ts-practice`.**
    - "numeric enums accept any number": qualify it as in 2.12, and add the `erasableSyntaxOnly` / Node type-stripping argument.
    - Gaps against its questions: `satisfies` (`ts-practice-5`), `tsc --noEmit` in CI (12), local `.d.ts` for untyped libraries (9), narrowing lost inside callbacks (14).

13. **`ts-basics`: gaps.**
    - `useUnknownInCatchVariables` / `catch (e)` is `unknown` (`ts-basics-11`).
    - The list of flags inside `strict` (13): `strictFunctionTypes`, `strictPropertyInitialization`, `strictBindCallApply`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`.
    - Declaration merging (10) is only in the `ts-shapes` primer.

14. **`ts-shapes`: gaps.**
    - Branded types (`ts-shapes-13`).
    - `readonly` is compile-time only (12).
    - Unions of arrays (14), which should become the TS 5.2 behaviour after fix 1.2.

15. **`js-values`, `js-objects-arrays`, `js-async`: minor gaps.**
    - `js-values`: object keys are coerced to strings, so use a `Map` for object keys (`js-values-14`), and `+` concatenates while `-` coerces (11).
    - `js-objects-arrays`: `Map` vs object (12), `flat(depth)` (14).
    - `js-async`: `AbortController` / `AbortSignal.timeout` (9), bounded concurrency pools (13), `process.nextTick`.

16. **`data-modeling`.**
    - Contradiction: "Migrations are ... **forward-only**". `data-model-10` says "test the rollback path" and the `net-efcore` primer and `net-ef-6` describe `Down` methods. Replacement: `Migrations are versioned, committed, ordered schema changes; in production you usually roll forward with a new migration rather than running a down migration, but know whether yours are reversible.`
    - "read committed is the usual default": MySQL/InnoDB defaults to REPEATABLE READ. Say `read committed in Postgres and SQL Server; MySQL defaults to repeatable read`.
    - Composite-index leftmost prefix: add the skip-scan caveat (2.9).

17. **`cs-linq-async`.**
    - Passage: "anything EF cannot translate ... either throws or silently forces client-side evaluation."
    - Problem: that has been outdated since EF Core 3.0, and it contradicts `cs-linq-5`.
    - Replacement: `anything EF cannot translate (a call to your own C# method inside \`Where\`) throws at runtime since EF Core 3.0 — only the final \`Select\` projection may still be evaluated client-side.`

18. **`net-aspnet`.**
    - "RFC 7807 `ProblemDetails`" should cite RFC 9457 (see 1.10).
    - The `Program.cs` sample has no `UseRouting`, while `net-aspnet-2` asks the learner to place it. Add: `WebApplication adds UseRouting automatically at the start of the pipeline; if you call it explicitly, it must come before UseAuthentication/UseAuthorization so endpoint metadata such as [Authorize] is known.`
    - Gaps: filter order (`net-aspnet-13`), no `HttpContext.Current` (14), `ActionResult<T>` (10), all briefly.

19. **`net-efcore`: gaps.**
    - `FromSql` / `FromSqlInterpolated` vs `FromSqlRaw` with interpolation (`net-ef-10`).
    - `IDbContextFactory` for parallel work (`net-ef-2`).
    - Identity resolution in the change tracker (`net-ef-11`).
    - `ExecuteUpdate` / `ExecuteDelete` (EF Core 7+) would be worth a line for bulk operations.

20. **`craft-git`.** "reflog remembers where HEAD has been for ~90 days": see 1.8. Say `~90 days for reachable entries, ~30 for commits no longer on any branch`.

21. **`craft-security`.**
    - "`href={userInput}` (`javascript:` URLs)": see 1.9. Add `(React 19 blocks these; React 18 only warned)`.
    - "Consistently the top item on the OWASP list": broken access control was A05 in 2017 and A01 in 2021 and 2025. Say `Top of the current OWASP Top 10`.

22. **`craft-shipping`.** Step 5 of the incident method is "**Mitigate first**", which contradicts itself and slightly contradicts `craft-ship-7`. Move mitigation to step 3 ("If users are hurting, mitigate now — roll back, scale, disable the flag — then diagnose.") and renumber.

---

## 5. Quality observations

### 5.1 The answer key's position gives the answer away (most important finding)

Of the 389 `mcq`/`output` questions, **363 (93%) are keyed at index 1**. The rest are index 0 (15), index 2 (9) and index 3 (2).

Several modules are 100% index 1:

- `ts-basics`,
- `react-render`, `react-effects`, `react-perf`, `react-app`,
- `node-express`,
- `web-http`, `web-api-design`,
- `cs-oop`, `cs-linq-async`,
- `net-di-config`, `net-efcore`,
- `craft-testing`, `craft-security`, `craft-shipping`,
- and all but one question in several others.

`DrillPage.tsx` shuffles choices only for `order` questions, so a learner who always picks the second option scores about 93%. Spaced-repetition mastery data is meaningless while this holds.

Recommendations:

- **Shuffle MCQ, multi and output choices per presentation.** Do it on the server, or on the client mapping choice ids back to indices; grade by choice id.
- **Before shuffling, rewrite the `why` texts that refer to choices by position.** Examples:
  - "Option 3 drops every other property", "option 4 mutates" (`js-objects-8`),
  - "Option 4 is the trap" (`node-express-14`),
  - "Option 3 is the classic near-miss" (`data-sql-8`),
  - "Note option 3 loads the whole table" (`net-ef-13`),
  - "The first four are baseline" (`node-express-10`, `craft-sec-8`), "The first four are built-in narrowings" (`ts-shapes-9`).
- **Choices that only work in one position** also need care, such as "Any of these can be defended" (`react-state-13`) and "None of them" (`data-sql-12`).

### 5.2 The keyed answer is usually the longest choice

In 335 of 389 single-answer questions (86%), the key is the unique longest choice. Typically it is a careful, hedged sentence set against three one-liners. A test-wise candidate needs no knowledge.

Recommendation: give distractors equal length and specificity. Each should be a *plausible misconception* written with the same care, for example "`Promise.all` runs them in parallel on worker threads", not "It is faster".

### 5.3 Boolean questions are almost all "false"

15 of 17 are keyed `false`; only `ts-basics-10` and `js-modules-12` are `true`. After 1.3, `js-modules-6` becomes true. Flip several more by rephrasing the statement positively. For example, `react-state-9` could become "After `setCount(5)`, `count` on the next line is still the old value."

### 5.4 The `output` type is misused

About a third of the 57 `output` questions are "why does this fail" or "what is wrong" MCQs, not "what does this print or evaluate to". Examples:

- `js-values-4`, `js-values-7`, `js-async-3`, `js-modules-10`,
- `ts-basics-14`, `ts-shapes-14`, `ts-practice-14`,
- `react-render-7`, `react-state-3`, `react-state-5`, `react-effects-3`, `react-effects-6`, `react-effects-13`, `react-perf-2`,
- `node-express-2`, `node-express-8`,
- `cs-linq-2`, `cs-linq-3`, `cs-linq-11`,
- `data-sql-9`.

`js-modules-10` has no code at all. Recommendation: reserve `output` for traces with a deterministic result, and type the rest as `mcq`, which may still carry `code`. This matters if the UI or statistics treat output questions specially.

### 5.5 Type monotony in the back half

These modules are entirely MCQ: `data-modeling`, `net-efcore`, `craft-git`. These are almost entirely MCQ:

- `react-app` (13 MCQ + 1 multi),
- `node-runtime`,
- `cs-oop`, `net-aspnet`, `net-di-config`,
- `craft-security`, `craft-shipping`.

There are only 4 `short` and 6 `order` questions in the whole deck. Recommendations:

- Add `output` traces for C#: struct copy semantics, `record` equality, LINQ deferred execution with a mutated source, `async` ordering.
- Add SQL traces: `LEFT JOIN` row counts, `COUNT(DISTINCT)`, three-valued `WHERE` with `NULL`.
- Add `short` answers for status codes, `git` commands and HTTP headers.

### 5.6 Missing `ask` notes

`web-api-design` has none. Several strong interview staples have none either:

- `web-http-6` (`no-cache` vs `no-store`),
- `data-sql-9` (LEFT JOIN turned inner),
- `net-di-1` (DbContext lifetime),
- `cs-oop-3` (`throw` vs `throw ex`),
- `craft-git-2` (revert).

Aim for one or two per module on the questions an interviewer is certain to ask.

### 5.7 Duplicate or near-duplicate questions across modules

- `node-auth-8` ≈ `craft-sec-3` (IDOR, nearly word for word)
- `node-auth-2` ≈ `craft-sec-4` (password hashing)
- `node-auth-11` ≈ `craft-sec-5` (CSRF)
- `node-express-7` ≈ `web-api-4` (DTO vs entity)
- `data-model-11` ≈ `craft-ship-5` (expand and contract)
- `data-model-7` ≈ `net-ef-9` (optimistic concurrency)
- `js-async-11` ≈ `node-runtime-1` (blocking the event loop)
- `ts-practice-12` ≈ `craft-test-13` (`tsc --noEmit` in CI)

In spaced repetition these double-count mastery. Merge them, or make the second instance a harder variant, for example `craft-sec-3` as "which of these three queries is IDOR-safe?".

### 5.8 Difficulty labels

Only about 13 of 434 questions are `d: 1`, so beginners have almost no on-ramp. Specific adjustments:

- **Lower to `d: 2`:** `js-objects-13` (a plain filter/map chain), `ts-shapes-11` (`Exclude`), `react-state-11` (URL state).
- **Lower to `d: 1`:** `cs-basics-13` (see 2.20), `web-http-8` (201 + `Location`).
- **Raise to `d: 3`:** `js-values-6` (`||` vs `??`) is fine at 2, but `js-values-4` (the `==` table) deserves 3.

### 5.9 Coverage gaps relative to the stated stack

- **React 19:** almost nothing on its actual features. Actions and `<form action>`, `useActionState`, `useOptimistic`, `use()`, ref as a prop, and `<Context>` as a provider are all untested; `react-app-7` only mentions `useOptimistic` in passing.
- **Express 5:** mentioned once (`node-express-4`), and the new path syntax is never tested. A question like "which route string is valid in Express 5: `/files/*`, `/files/*path`, `/:id?`" would be high value.
- **.NET 8 / C# 12:** no primary constructors question, although the primer uses them. Also missing: collection expressions, keyed services (`AddKeyedScoped`), `TimeProvider`, `IExceptionHandler` (primer only), minimal API `TypedResults`, `ExecuteUpdate`/`ExecuteDelete`.
- **SQL:** a single window-function question, and no question on isolation levels, on deadlocks, or on `UPDATE` without `WHERE`/`RETURNING`.
- **TS 5.x:** no `satisfies` edge cases, `const` type parameters (5.0), `using` declarations (5.2), inferred type predicates (5.5), `NoInfer` (5.4), or `erasableSyntaxOnly` (5.8).

### 5.10 Trivia-leaning questions worth replacing

- `cs-basics-13`: the answer is in the prompt.
- `net-di-9`: log-level ordering, pure recall.
- `web-api-10` and `web-api-14`: the distractors "It replaces tests" and "When using TypeScript" are not credible.
- `craft-git-9`: stash, with obvious distractors.

Many questions use one or two throwaway distractors ("It is slower", "Interfaces are deprecated", "Nothing"). Combined with 5.1 and 5.2, this makes the deck much easier than its difficulty labels suggest.

### 5.11 Tag hygiene

Tags are free-form with no vocabulary. For example, `react-18` is used for React 18-and-later content in a React 19 course, and similar concepts are split across `authorization`, `rbac` and `idor`. Consider a fixed tag list validated in `schema.js`.

---

## 6. Count table

| Track | Questions reviewed | Definite errors | Ambiguities / weak |
| --- | ---: | ---: | ---: |
| js | 70 | 2 (`js-objects-1`, `js-modules-6`) | 2 (`js-functions-4`, `js-values-1`) |
| ts | 42 | 2 (`ts-basics-14`, `ts-shapes-14`) | 3 (`ts-practice-2`, `ts-basics-12`, `ts-basics-6`) |
| react | 70 | 2 (`react-render-10`, `react-effects-11`) | 1 (`react-state-13`) |
| node | 42 | 1 (`node-express-4`) | 2 (`node-express-11`, `node-runtime-14`) |
| web | 42 | 1 (`web-api-3`) | 4 (`web-http-3`, `web-browser-10`, `web-http-12`, `web-browser-2`) |
| data | 28 | 0 | 2 (`data-model-4`, `data-sql-12`) |
| csharp | 42 | 0 | 1 (`cs-basics-13`) |
| dotnet | 42 | 1 (`net-aspnet-4`) | 3 (`net-aspnet-2`, `net-aspnet-8`, `net-di-12`) |
| craft | 56 | 2 (`craft-git-7`, `craft-sec-2`) | 3 (`craft-ship-7`, `craft-sec-14`, `craft-test-5`; `craft-test-11` is folded into the `net-di-12` item) |
| **Total** | **434** | **11** | **21** |

Also: 4 `short` questions need more accepted answers, and 22 primer issues are listed (7 of them factual or outdated statements, the rest gaps or contradictions). The systemic problems in 5.1 to 5.3 (answer position, answer length, boolean skew) affect the whole deck and matter more than any single-question error.
