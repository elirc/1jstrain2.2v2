---
id: ADR-0010
title: Hold app-wide state in one React context
status: accepted
date: 2026-09-23
amended-by: []
superseded-by: null
---

# ADR-0010: Hold app-wide state in one React context

Status: accepted · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `client/src/lib/app-state.tsx › AppProvider (L14–22, L41–178 @ 6f1bf43)`, `client/src/lib/app-state.tsx › useMemo<AppState> (L144–175 @ 6f1bf43)`, `client/src/App.tsx › Gate (L54–80 @ 6f1bf43)`

## Context
Three things are global: the profile list and active profile, the curriculum (about 95 KB, fixed for the session), and the active profile's progress. They change rarely. The curriculum never changes, the profile changes on an explicit switch, and progress changes once per drill. Every page reads some of them. The app has six pages and one author.

## Decision
We keep these in one `AppProvider` built from `useState`, load them with two effects (boot, then progress per profile), and expose them through a memoised context value. Pages fetch their own page-local data (a module, a session) themselves. We add no state library.

## Evidence
`client/src/lib/app-state.tsx › Context is the right tool here (L18–21 @ 6f1bf43)`
```ts
 * Context is the right tool here because these values change rarely — the
 * curriculum never, the profile on an explicit switch, progress once per
 * session. Anything that changed per keystroke would want a store with
 * selectors instead.
```
`client/src/lib/app-state.tsx › const [error, setError] (L47 @ 6f1bf43)`
```ts
  const [error, setError] = useState<string | null>(null);
```
Not enforced. There are no client tests at the baseline.

## Consequences
- Good: no dependency, and the whole state model fits on one screen.
- Cost: one `error` serves two jobs. Boot failure ("the API is down") and background failure ("one progress refresh failed") write the same state, and `Gate` replaces every page with the boot-error screen when either happens (client B5, register F-17). The worst case is a stale stored profile id. The progress effect fires before boot resolves, gets a 404, and sets an error that nothing ever clears (client B3, M-06).
- Cost: `refreshProgress` and `resetProgress` have no cancellation, unlike the two effects, so a slow response can land after a profile switch.
- Cost: `useModuleProgress` returns a zeroed record with `trackId: 'js' as const` for any unknown module, and also while progress is loading. That record type-checks and is wrong (client B24, F-26).
- Cost: progress refreshes only when `Summary` mounts. Leave a drill early and every number stays stale (client B16, M-14).
- Forces on future work: every new global value re-renders every consumer when it changes. The memo only helps while values are stable.

## Alternatives rejected
- **Redux Toolkit or Zustand.** Selectors solve a re-render problem this app does not have at its change rate.
- **TanStack Query for server state.** It would fix cancellation, staleness and error separation in one move. It was rejected here for size, and J28 gets most of the benefit from a small `useResource` hook.

## Breaks first at
Update frequency, not size. Context is fine at "once per drill". It breaks when a value changes per keystroke or per answer and many components consume it, because every consumer re-renders on every change.

## Revisit when
- Progress starts updating per answer (J32 moves the refresh onto the answer path; measure the re-renders when it lands).
- A second piece of server state needs the same cancel, stale and error handling. At that point take the query library instead of writing a third copy.
