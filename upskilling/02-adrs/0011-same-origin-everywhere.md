---
id: ADR-0011
title: Serve the API and the app from one origin in every mode
status: accepted
date: 2026-09-23
amended-by: []
superseded-by: null
---

# ADR-0011: Serve the API and the app from one origin in every mode

Status: accepted · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `client/vite.config.ts › proxy (L4–19 @ 6f1bf43)`, `server/src/index.js › serveClient (L60–66 @ 6f1bf43)`, `client/src/lib/api.ts › fetch (L62 @ 6f1bf43)`, `server/src/index.js › corsOrigins (L43, L110–113 @ 6f1bf43)`

## Context
In development there are two servers: Vite on 5173 and Express on 3001. If the browser called 3001 directly, every request would be cross-origin. The custom `x-profile-id` header would force a preflight on every call, and the app would need CORS configured correctly before it did anything. In production there is one process.

## Decision
We make the browser talk only to its own origin. In development, Vite proxies `/api` to Express. In production, Express serves `client/dist` and the API from one port. The client uses relative URLs only.

## Evidence
`client/vite.config.ts › proxy (L13–18 @ 6f1bf43)`
```ts
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
```
`client/src/lib/api.ts › fetch (L62 @ 6f1bf43)`
```ts
  const response = await fetch(`/api${path}`, {
```
`server/src/index.js › serveClient (L62–66 @ 6f1bf43)` mounts `express.static` and the SPA fallback. Not enforced by a test.

## Consequences
- Good: there are no preflights and no CORS failures in any supported setup, and development matches production.
- Cost: the SPA fallback regex `/^(?!\/api\/).*/` excludes `/api/` but not `/api`, and it serves `index.html` with a 200 for a missing hashed asset (server H3, register M-10).
- Cost: `cors()` still runs on every request, with `credentials: true` and no cookies anywhere, mounted after `express.json`. A body-parser error therefore answers without CORS headers. Verified at the baseline: a bad body with `Origin: http://localhost:5173` returns 400 and no `Access-Control-Allow-Origin` (server H2, F-22). Same-origin is why nobody noticed.
- **Opinion: `CORS_ORIGINS` is nearly dead code.** Its default lists 5173 and 4173, and both are served through Vite, whose `preview` server reuses `server.proxy`. The only setup that reads it is a page on a third origin calling the API directly, and nothing in the repo does that. Keep it only if someone names that setup. Otherwise delete it with J21, together with `credentials: true`.
- Forces on future work: anything that must run on another origin (a browser extension, a separate docs site calling the API) reopens CORS and ADR-0006 together.

## Alternatives rejected
- **Direct cross-origin calls with CORS.** Every call becomes two in development, and every error mode gets a CORS variant.
- **A reverse proxy (nginx, Caddy) in front of both.** It is a second process to install for a local tool.

## Breaks first at
Deployment topology. With the static app on a CDN and the API elsewhere, same-origin is gone, and CORS, cookies and the profile header all need real decisions.

## Revisit when
- The client is hosted separately from the API.
- `API_URL` is pointed at a remote host. The proxy still makes this same-origin for the browser, but ADR-0006's loopback precondition no longer holds.
