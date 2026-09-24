---
id: J28
title: Boot errors are not background errors, and the stale profile id
area: client
closes: [F-17, F-18, F-26, M-06]
ladder: [B12, B11]
adrs: [0010 unchanged]
status: landed
---

# Boot errors are not background errors, and the stale profile id

Date 2026-09-24 · Author Claude (client implementer) · Area client · Commit uncommitted working tree (baseline 6f1bf43)
Closes F-17, F-18, F-26, M-06 · Ladder B12, B11 · ADRs 0010 unchanged

## Symptom

- Wipe the data directory, or let the store fall back to JSON, while a profile id is still in localStorage. The app opens on "The API should be running on port 3001" forever. The API is running. There is no Retry.
- Finish a drill while the server restarts. The refresh fails, and every page, including a half-read primer, is replaced by that same boot screen.
- The module page shows "0 of N mastered" for a moment on a mastered module.
- A failed **Add learner** is an unhandled rejection. The form stays open with no message.

Reproduce at `6f1bf43`: `localStorage.setItem('stack-ready:profile-id', 'gone')`, then reload.

## Root cause

`client/src/lib/app-state.tsx › AppProvider (L43 and L90–107 @ 6f1bf43)` seeds the id from storage and fetches progress at once, in parallel with boot:
```tsx
  const [profileId, setProfileId] = useState<string | null>(getStoredProfileId());
  ...
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load progress.');
      });
```
The 404 for the stale id lands before `/curriculum` (about 95 KB) does. Boot then selects a valid profile, but nothing ever clears `error`, and `refreshProgress` writes to the same `error`. One state carries two meanings: "nothing can render" and "one background call failed". `client/src/lib/app-state.tsx › useModuleProgress (L188–202 @ 6f1bf43)` returns a zeroed record while loading. The invariant: *a per-profile request is only made for an id the profile list contains, and a failure never replaces data that is already on screen.*

## Options

| | Option | What it costs | Why (not) |
|---|---|---|---|
| A | Do nothing | Nothing | A stale id is the normal state after the documented store fallback, so the dead end is reachable by ordinary use. |
| B | Clear `error` on success and catch 404 | ~10 lines | It fixes the stale id but keeps one error for three classes, so a refresh failure still blanks a primer. |
| C | Three error classes (boot, page data, background), progress fetched only after boot has resolved the id, a 404 on progress forgets the id, and one `useResource` hook as the mechanism | ~350 lines | Chosen. |
| D | A query library (TanStack Query) | One dependency | It would do this well. The constraints forbid new runtime dependencies, and the app has five resources. |

## Decision and trade-off

I chose C. `profileId` starts as `null` and is chosen only once boot returns the real list. Progress is `useResource(['progress', id])`, and each snapshot is tagged with its profile id, so a switch shows "loading", never the previous learner's numbers under the new name. `refreshProgress()` is coalesced (one request plus at most one trailing one) and identity-checked. A failure writes a dismissible notice to one `role="status"` region in the shell. `useModuleProgress` returns `null` while unknown. What it gives up: a profile switch now shows a spinner for one round-trip. Revisit if switching ever needs to be instant, at which point it would need prefetching.

## The change

New `client/src/lib/useResource.ts` (per-run `AbortController`, `useEffectEvent` for `load`, an element-wise key, data kept while reloading). `app-state.tsx` is rewritten, and `App.tsx`'s Gate distinguishes a boot error (with Retry) from loading and from a progress error. `Shell.tsx` catches `createProfile` failures and shows them inline.

After, `client/src/lib/app-state.tsx`:
```tsx
  const progressRes = useResource<{ profileId: string; progress: Progress }>(
    profileId ? ['progress', profileId] : null,
    async (signal) => ({
      profileId: profileId as string,
      progress: await api.progress(profileId as string, signal),
    }),
  );
```

## Verification

`client/src/lib/app-state.test.tsx`:
1. › *a stale stored profile id falls back to the first profile with no error screen*. It asserts no `alert`, that `/progress` was never requested with the stale id, and that storage now holds the first profile's id. At the baseline the stale id is requested first, and the 404 is permanent.
2. › *a failed progress refresh keeps the page and shows a dismissible error*. The XP stays at 5 and `bootError` stays null.
3. › *a late progress response for a previous profile is ignored*. A's refresh resolves after the switch to B, and B's numbers stay.
4. › *a boot failure offers Retry, which recovers*.
5. The full suite: 70 passed.

## What a senior reviewer would ask

- *Why not keep the last snapshot on a switch (B23 said "never blank")?* Showing A's numbers under B's name is worse than a spinner. The keep-last-value rule still holds within one profile.
- *What if every profile 404s?* The fallback empties the list and reloads boot, and the Gate says "No learner yet".
- *Does context re-render everything on each refresh?* Yes, one render per refresh. That is fine at this size, and ADR 0010 already names the trigger for moving to a store.

## The junior version of this fix

Add `setError(null)` after the successful `setProgress`. The stale-id screen clears once boot finishes, and review passes. A failed refresh still takes over every page, and the zeroed module record still flashes.

## Follow-ups

- [ ] If the app grows past a handful of resources, reconsider a query library → ADR 0010 trigger

## Update 2026-09-24

`selectProfile` asked before dropping a live drill; `createProfile` did not, and a new learner becomes the active one, which remounts `DrillSession`. The Shell's add form now calls `confirmLeaveSession()` before `createProfile()`. Test: `client/src/pages/pages.test.tsx` › *adding a learner mid-drill asks before dropping the session*.
