---
id: J29
title: Routes - a layout route, errors inside the shell, titles
area: client
closes: []
ladder: [B13]
adrs: []
status: landed
---

# Routes - a layout route, errors inside the shell, titles

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes – · Ladder B13 · ADRs none

## Symptom

A render crash in any page (for example the progress JSON that `/module/..%2Fprogress` used to fetch) replaced the whole shell with a bare error: no nav, no way home, no retry. The tab title never changed from the home page's. An unknown module id fetched, got a 404, and showed an error banner instead of "Not found".

## Root cause

`client/src/App.tsx › errorElement (L82–109 @ 6f1bf43)` puts the `errorElement` on the Shell route, and an `errorElement` replaces its route's element:
```tsx
  {
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Gate><Dashboard /></Gate> },
```
Six routes repeat `<Gate>`, and no page renders a `<title>`.

## The change

`routes` is exported. The Shell has a root `RootError`. Inside it, a pathless `<Gate/>` layout route with its own `errorElement` wraps every page, so a crash renders inside the shell with **Try again** and **Back to the roadmap**. `*` sits outside the Gate. A `Page` component renders `<main id="main" tabIndex={-1}>`, the skip-link target, and a `<title>` that React 19 hoists. `ModulePage` renders Not found synchronously when `moduleById` lacks the id. `Loading` has `role="status"`.

## Verification

`client/src/pages/pages.test.tsx` › *an unknown module renders Not found at once and never calls the API*. It asserts no `/api/modules` request, that the Main nav is still present, and `document.title === 'Not found · Stack Ready'`. At the baseline the page fetches `/api/modules/../progress`, which the URL parser resolves to `/api/progress`, and the render throws outside the shell.
