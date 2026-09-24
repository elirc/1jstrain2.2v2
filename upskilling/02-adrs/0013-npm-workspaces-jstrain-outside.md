---
id: ADR-0013
title: Use npm workspaces for the app, and keep jstrain outside them
status: accepted
date: 2026-09-23
amended-by: []
superseded-by: null
---

# ADR-0013: Use npm workspaces for the app, and keep jstrain outside them

Status: accepted · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `package.json › workspaces (L7–11 @ 6f1bf43)`, `package.json › drills (L20–21 @ 6f1bf43)`, `jstrain/package.json › vitest (@ 6f1bf43)`

## Context
The app has three parts that ship together: `content`, `server` and `client`. They need one install and one lockfile, and `@jstrain/content` has to resolve for both halves without publishing. `jstrain/` is a separate, test-graded problem set with its own toolchain: Vitest, Testing Library, jsdom and a TypeScript config with a solutions mode. A learner may run it without ever starting the app.

## Decision
We make the root an npm workspace over `content`, `server` and `client`, with one root lockfile. We leave `jstrain/` outside it, with its own `package.json` and `package-lock.json`, and reach it from the root through `npm --prefix jstrain`.

## Evidence
`package.json › workspaces (L7–11 @ 6f1bf43)`
```json
  "workspaces": [
    "content",
    "server",
    "client"
  ],
```
`package.json › drills (L20–21 @ 6f1bf43)`
```json
    "drills": "npm --prefix jstrain test",
    "drills:watch": "npm --prefix jstrain run watch"
```
`jstrain/package-lock.json` is committed at the baseline, next to the root `package-lock.json`. After `npm install`, `node_modules/@jstrain/content` is a link to `content/`, which is how `server/` and `client/` resolve it.

## Consequences
- Good: `npm install` at the root links `@jstrain/content` into both halves, and `npm run dev` starts both.
- Good: `jstrain/` keeps its heavy test dependencies out of the app's install, and learners can clone and run it alone.
- Cost: **four manifests, not three**, and their versions disagree. The root and `client` say `2.2.0`, while `server` and `content` say `1.0.0` (register F-28). `jstrain/package.json` is a fifth, outside the workspace, at `1.0.0`. Nothing says which version is "the app", and E08 (cut a release) has to decide.
- Cost: `npm run drills` fails on a fresh clone until someone runs `npm install` inside `jstrain/` (README L90–91), so CI must install it separately (J05).
- Cost: `allowScripts` in the root manifest pins exact versions (`better-sqlite3@12.11.1`). The next `npm update` drops the native build silently, and the JSON fallback hides that it happened (dx §1.8, M-15; J02).
- Forces on future work: a root-level tool (Vitest at the root, ESLint, Prettier; J01, J04) must say whether it covers `jstrain/`. Its tests are exercises that fail on purpose until solved.

## Alternatives rejected
- **One package.** It would mix a browser bundle, a Node server and the content in one dependency graph, and the client could import server modules.
- **Put `jstrain` in the workspace.** Its failing-by-design tests and its dependencies would join every install and every CI run.
- **pnpm or Turborepo.** Better tools, and one more thing to install for a learner who has only Node.

## Breaks first at
Packages. At three workspaces, npm's workspace support is enough. With a shared UI package or a second app, it needs task caching and a dependency graph, which means Turborepo or Nx.

## Revisit when
- A fourth workspace is proposed.
- CI time for installing `jstrain/` separately exceeds the time to test it.
