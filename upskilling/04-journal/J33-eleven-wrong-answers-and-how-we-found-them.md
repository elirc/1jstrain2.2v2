---
id: J33
title: Eleven wrong answers and how we found them
area: content
closes: [M-11]
ladder: [B01, B04]
adrs: [0008 unchanged]
status: landed
---

# Eleven wrong answers and how we found them

Date 2026-09-24 · Author content integrator · Area content · Commit uncommitted (baseline 6f1bf43)
Closes M-11 · Ladder B01, B04 · ADRs 0008 unchanged

## Symptom
A learner who answers `js-modules-6` correctly on Node 24 is marked wrong. At the baseline the prompt reads "A CommonJS file can `require()` an ES module directly." and the key is `false`. Run `node -e "console.log(require('./esm.mjs'))"` on Node 24.19 with any synchronous ES module and it prints the namespace object, so the expected answer is `true`. Ten other questions have the same class of fault: the explanation describes a tool as it behaved when someone last read about it, not as it behaves now.

## Root cause
`content/questions/js.js › js-modules-6 (L801–808 @ 6f1bf43)`:

```js
prompt: 'A CommonJS file can `require()` an ES module directly.',
answer: false,
why: 'ESM is asynchronous by nature, so `require` of an ESM file throws `ERR_REQUIRE_ESM` (recent Node versions relax this for some cases). ...',
```

The explanation even says the rule has been relaxed, and the key ignores it. The invariant: every claim a question makes about a tool must hold for the version the curriculum names (Node 24 LTS, TypeScript 5.9, React 19, Express 5, .NET 8+), checked against that tool.

## Options
| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing now | Most of these are edge cases, and interviewers hold outdated beliefs too. But the app sells itself as the correct answer. A learner who knows the current behaviour loses mastery and learns the old rule. |
| B | Fix from memory, one reviewer | An afternoon | That is how the errors got in. The audit's own claims needed three corrections when checked. |
| C | Reproduce each claim with the tool, then fix | About a day; scratch files | chosen |

## Decision and trade-off
I settled each claim with the tool itself. That gives up speed, and a few items (the Node versions for `--watch` and the require(esm) backport) still rest on release notes I could not run. If a question depends on a version we do not pin, it has to name the version in the prompt, as `js-modules-6` now does ("On current Node LTS (22.12+ / 24)"). Revisit: when `.nvmrc` or `engines` moves to a new major version, re-run the snippets.

## The change
The eleven definite errors and what settled each:

- `ts-basics-14`, `ts-shapes-14`: I ran `tsc 5.9.3 --strict --noEmit` on the snippets. Without an annotation the if-chain compiles and infers `number | undefined`, so the question's premise ("why does this error") was false. With `: number` it gives TS2366. The 5.2 union-of-arrays rule makes `map` compile, and the result is `(string | number)[]`.
- `js-modules-6`: Node 24.19. `require(esm)` returns the namespace, and top-level `await` throws `ERR_REQUIRE_ASYNC_MODULE`. The key flipped to `true`.
- `node-express-4`: Node 24. An unhandled rejection exits with code 1, so "the request hangs" was wrong. The key's text now says the process crashes. The old distractor "It crashes immediately" overlapped with the new key, so I replaced it.
- `react-render-10`, `react-effects-11`, `craft-sec-2`: I read the react/react-dom 19.3 builds. `ref` is a regular prop. The server `useLayoutEffect` warning string no longer exists. `javascript:` URLs are replaced with a throwing URL in production builds too.
- `js-objects-1`: the prompt asked about "the second log" when there is one.
- `craft-git-7`: I checked the git 2.55 docs. `gc.reflogExpireUnreachable` is 30 days, not 90.
- `web-api-3`, `net-aspnet-4`: RFC 9457 obsoletes RFC 7807.

The same pass applied the review's 21 ambiguity fixes, the matching primer passages and longer accepted-answer lists for four `short` questions. Seven questions changed what counts as correct: `js-modules-6` (false to true), `react-state-9` and `web-browser-13` (flipped to balance booleans, prompts reworded), `react-state-13` (the key had been "any of these"), `cs-basics-13` (rewritten, key 1 to 0), `craft-ship-7` (four steps to three) and `net-aspnet-2` (`UseRouting` replaced by `UseExceptionHandler`). All edits went through one script over an edit list, so none was typed by hand into a string literal.

## Verification
1. `node content/tools/stats.mjs` and `npm run check:content`: 434 questions, 31 modules, no problems.
2. A second script replays the edit list on a clean copy of `6f1bf43` and compares every field with the working tree. The only differences are the J34 lint fixes: four `output` questions without code became `mcq`, `js-functions-11` was reworded, and three primers lost bold around code.
3. `npm run check -w server`: `node src/check.js` prints `All checks passed.`

## What a senior reviewer would ask
- *Does anyone's saved progress now point at a different answer?* Yes, for the seven ids above. The ids did not change, so their history is kept but is wrong for those seven. Resetting their card state is a server migration, listed below.
- *Why flip two booleans that were not wrong?* Before the flips, 15 of 17 booleans were `false`. J34 explains why that is a problem.
- *How do you stop the next one?* The checklist item "checked against the tool, not memory" in `07-checklists.md`, and version-pinned wording in prompts.

## The junior version of this fix
Change `answer: false` to `true` on `js-modules-6` and leave the `why`. That passes review because the diff is one token. Then the explanation argues against its own key, and the ten neighbours with the same fault are never looked at.

## Follow-ups
- [ ] Reset stored card state for the seven re-keyed ids → server migration (J19 or later)
- [ ] Strip backticks and quotes in `normalise()` for `short` answers → server (audit §7 item 76)
