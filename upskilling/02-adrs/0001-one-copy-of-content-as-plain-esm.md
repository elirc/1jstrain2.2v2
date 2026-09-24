---
id: ADR-0001
title: Keep one copy of the content, as plain ESM
status: accepted
date: 2026-09-23
amended-by: []
superseded-by: null
---

# ADR-0001: Keep one copy of the content, as plain ESM

Status: accepted · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `content/package.json › exports (L9–14 @ 6f1bf43)`, `content/index.js › curriculum (L1–7, L105 @ 6f1bf43)`, `client/src/lib/types.ts › import type (L10 @ 6f1bf43)`

## Context
The curriculum is 434 questions and 31 primers, and both halves need it. The server needs the answer keys to grade. The client needs the shapes to type its props. There is one author, the files live in the same repo as both consumers, and nobody wants to run a generator before `npm run dev`.

## Decision
We author the content as plain ES modules with a hand-written `types.d.ts`, and publish it as the workspace package `@jstrain/content`. The server imports its values at runtime. The client imports its types only, never its values.

## Evidence
`content/package.json › exports (L9–14 @ 6f1bf43)`
```json
"exports": {
  ".": {
    "types": "./types.d.ts",
    "default": "./index.js"
  }
}
```
`client/src/lib/types.ts › import type (L10 @ 6f1bf43)`
```ts
import type { Module, PublicQuestion, Stage, Track, TrackId } from '@jstrain/content';
```
The types-only rule is **not enforced**. `verbatimModuleSyntax` in `client/tsconfig.json` makes `import type` erase cleanly, but nothing stops a plain `import { curriculum }` in a component. Register F-16.

## Consequences
- Good: no generated JSON to go stale, no build step, and a shape change in `types.d.ts` breaks `npm run typecheck -w client`.
- Cost: the client *can* import the answer keys, and the bundle would then carry every `answer` and `why`. Today nothing does (`git grep @jstrain/content 6f1bf43 -- client/src` finds one `import type`). The same missing guard let `SessionMode` in `client/src/lib/types.ts` drift into a copy of `MODES` in `server/src/sessions.js` (F-16).
- Cost: `types.d.ts` is hand-written, so it can disagree with `schema.js`. `PublicQuestion` and `publicQuestion()` must change together, and nothing checks that they do (walkthrough 06).
- Forces on future work: any new client need for content data goes through the API, not an import.

## Alternatives rejected
- **Generate JSON at build time.** It adds a step that goes stale, and grading still needs the JS.
- **Write the content in TypeScript.** The server is plain Node with no transpiler, so it would need a build or a loader.
- **Put the content in the database.** Then authoring is a migration, and the diff stops being reviewable.

## Breaks first at
Contributors, not size. At 10x questions (about 4,000), loading them at server boot still costs milliseconds. The failure is a second author who adds a runtime import to the client. The bundle then ships the keys, and ADR-0002 is void without any test failing.

## Revisit when
- A client file imports a value from `@jstrain/content`. J04 adds `no-restricted-imports` with `allowTypeImports`, which makes this a lint error.
- The content needs to be edited by someone who does not run the repo.
