---
id: J23
title: Hotfix "Another round" and the URL nobody subscribed to
area: client
closes: [F-12]
ladder: [B11]
adrs: []
status: landed
---

# Hotfix "Another round" and the URL nobody subscribed to

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-12 · Ladder B11 · ADRs none

## Symptom

Finish any drill and press **Another round**. The address bar changes (`&n=1790000000000` is appended) and nothing else happens: the Summary stays on screen, no request goes out. On a track or stage drill it is worse in principle, because the link also drops `trackId`/`stageId`/`limit`, so if anything *did* refetch, the server would answer `400 unknown track: undefined`.

Reproduce at `6f1bf43`: open `/drill?mode=track&trackId=js&limit=3`, answer three questions, click **Another round**. Network tab: no `POST /api/sessions`. Expected: a second session for the same track.

## Root cause

`client/src/pages/DrillPage.tsx › Summary (L547–553 @ 6f1bf43)` builds the link:
```tsx
        <Link
          className="btn btn-primary"
          to={`/drill?mode=${session.mode}${moduleId ? `&moduleId=${moduleId}` : ''}&n=${Date.now()}`}
          reloadDocument={false}
        >
```
and `client/src/pages/DrillPage.tsx › DrillPage (L49–70 @ 6f1bf43)` fetches in an effect whose dependency list is:
```tsx
  }, [profile, mode, moduleId, trackId, stageId, limit]);
```
`n` is never read. The route element is the same component at the same tree position, so React does not remount it; the five values it does read are unchanged, so the effect does not re-run; `index` stays at `questions.length`, so the Summary stays mounted. The link was written as if the URL were an event bus that something subscribed to. Nothing did.

The invariant a test can assert: *after "Another round", `POST /api/sessions` is called again with the same scope (`mode`, `moduleId`/`trackId`/`stageId`, `limit`)*.

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | The button is a lie on every session end; learners reload the page instead. |
| B | Add `n` to the effect's deps | 2 lines | Makes the cache-busting param a hidden part of the fetch identity. The next person to tidy the URL breaks it again, and the dropped `trackId` stays dropped. |
| C | Key the route element by `location.key` and build the link from the session's echoed scope | ~10 lines | Chosen as the hotfix: any navigation to `/drill`, even to the identical URL, remounts the page and starts clean. |
| D | A `round` counter in a drill reducer; the button dispatches `restart` | Part of the drill rewrite | The real fix. Landed in J30; this hotfix was the stopgap before it. |

## Decision and trade-off

I shipped C first and D in J30, keeping C's route key. The key costs one remount per drill navigation, which is exactly the behaviour a drill link should have: following a drill link means "start this drill". What it gives up: a remount throws away in-memory state, so leaving a live session through any drill link loses it. J30 adds a `useBlocker` confirmation for that. Revisit if drill state ever needs to survive navigation (a "resume session" feature).

## The change

`client/src/App.tsx` gains a `DrillRoute` wrapper; the Summary link later became a button (J30), and every drill href is now built by `drillHref()` (J30).

After, `client/src/App.tsx`:
```tsx
function DrillRoute() {
  const location = useLocation();
  return <DrillPage key={location.key} />;
}
```

After, `client/src/pages/drill/Summary.tsx`:
```tsx
          <button type="button" className="btn btn-primary" onClick={onRestart}>
            Another round
          </button>
```

## Verification

1. `client/src/pages/drill/DrillPage.test.tsx` › *"Another round" starts a new session with the same scope*: a one-question `mode=track&trackId=js` session, answered and finished; after the click there are two `POST /api/sessions`, and the second body equals `{ mode: 'track', trackId: 'js' }`. At the baseline there was no harness; the reproduction above shows zero second requests.
2. `npx vitest run` in `client/` → 70 passed; `npm run typecheck -w client` clean.
3. Manual: finish a track drill, click **Another round**, and the first question of a new session appears.

## What a senior reviewer would ask

- *Why keep the route key once `restart` exists?* Because a plain link to the same drill URL (the nav's **Drill**, "Daily mix instead") must also start fresh, and a key is the one mechanism that covers every entry point.
- *Does the key refetch the curriculum?* No. The key is on `DrillPage`, below the Gate; app state lives above the router.
- *What about the StrictMode double effect?* The session effect aborts its controller on cleanup, so dev mode sends two requests and uses one.

## The junior version of this fix

Add `params.get('n')` to the dependency array. It works on the first click and passes review, because the diff is two lines. It leaves the dropped `trackId` in place (a track round now 400s instead of doing nothing) and turns a cache-buster into load-bearing state that nobody will know to preserve.

## Follow-ups

- [x] Replace the link with a reducer `restart` → J30
- [ ] A "resume the session you left" feature would need the key removed → not planned
