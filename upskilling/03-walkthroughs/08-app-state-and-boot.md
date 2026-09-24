# Walkthrough 08: app state and boot

Files: `client/src/lib/app-state.tsx`, `client/src/lib/useResource.ts`, `client/src/App.tsx › Gate`, `client/src/main.tsx`, `client/src/lib/app-state.test.tsx` · As of: the working tree after the 2026-09-24 refactor (baseline `6f1bf43`) · Time: ~45 min · Read first: walkthrough 07

"Before" quotes are anchored at `6f1bf43`. "After" quotes come from the working tree, which is not committed yet, so they carry plain paths and no SHA.

## The job in one sentence

Load what every page needs (the profile list and the curriculum), pick the active learner only once that list is known, then keep that learner's progress, settings and flags current. Never let a failure in the background take down a page that is already on screen.

## The contract

- **Three error classes, never mixed** (the header comment of `app-state.tsx`):
  1. *boot*: profiles or curriculum failed, nothing can render, and the Gate shows a full-page error with Retry;
  2. *page data*: a `useResource` error shown in place of that page's content;
  3. *background*: a refresh or an action failed, the last good data stays, and one dismissible `notice` says what happened.
- **Invariant 1:** no per-profile request is made for an id that the loaded profile list does not contain.
- **Invariant 2:** a stored id that no longer exists is forgotten, and the first profile is chosen. This is never fatal.
- **Invariant 3:** a response for profile A never lands after a switch to B.
- **Invariant 4:** `progress` is `null` while unknown, never a zeroed record. `useModuleProgress` returns `null` for "not loaded".
- **Invariant 5:** once a snapshot exists, a failed reload leaves it on screen and raises a notice.

## Read it in this order

1. `client/src/lib/app-state.tsx › AppProvider (L41–107 @ 6f1bf43)`. Two effects, two `cancelled` flags and one `error`.
2. `client/src/lib/useResource.ts`. The mechanism that replaced four hand-written `cancelled` flags.
3. `client/src/lib/app-state.tsx › AppProvider` (working tree): `boot`, `choose`, `progressRes`, the 404 effect, then `refreshProgress`.
4. `client/src/App.tsx › Gate` (working tree). Four states, in order.
5. `client/src/lib/app-state.test.tsx`.

## The lines worth stopping at

**The id was trusted before it was checked.**
`client/src/lib/app-state.tsx › AppProvider (L43–47 @ 6f1bf43)`
```tsx
  const [profileId, setProfileId] = useState<string | null>(getStoredProfileId());
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
```
Seeding `profileId` from storage started the progress effect at once, in parallel with boot. A stale id 404'd before the ~95 KB curriculum arrived. Boot then chose a valid profile, but nothing cleared `error`, so the page said "The API should be running on port 3001" forever (M-06). The same `error` was written by `client/src/lib/app-state.tsx › refreshProgress (L81–88 @ 6f1bf43)`, so a failed refresh after a drill replaced a half-read primer with the boot screen (F-17, J28).

**The id is now chosen, not remembered.**
`client/src/lib/app-state.tsx` (working tree):
```tsx
  // Null until boot has checked the stored id against the real profile list:
  // nothing per-profile is requested for an id that may no longer exist.
  const [profileId, setProfileId] = useState<string | null>(null);
  // …
  const choose = useCallback((list: Profile[], preferred: string | null) => {
    const active = list.find((p) => p.id === preferred) ?? list[0] ?? null;
    setProfileId(active?.id ?? null);
    setStoredProfileId(active?.id ?? null);
  }, []);
```
Every per-profile resource is keyed `profileId ? [...] : null`, and a `null` key means idle. So the order "boot, then choose, then fetch" is enforced by data flow rather than by timing. The 404 effect covers the rarer case where the profile disappears later (another tab deleted it): it drops the id, chooses again, and reloads boot if the list is now empty.

**`useResource`, in four rules.**
```ts
  useEffect(() => {
    if (stableKey === null) {
      setState({ status: 'idle', data: null, error: null });
      return;
    }
    const controller = new AbortController();
    setState((prev) => ({ status: 'loading', data: prev.data, error: null }));
    run(controller.signal).then( /* … drop if aborted … */ );
    return () => controller.abort();
  }, [stableKey, nonce]);
```
- One `AbortController` per run, aborted on key change or unmount. A superseded response is cancelled on the wire, not just ignored.
- `load` goes through `useEffectEvent`, so an inline lambda does not restart the effect. Only the key does.
- `useStableKey` compares element by element, so `['progress', id]` written inline is stable.
- `data` survives a reload (`prev.data`), so a page shows the last good value with `status: 'loading'` instead of going blank.

`reload` bumps `nonce`, and `setData` replaces the data locally (used by `refreshProgress`, settings and flags). It is deliberately not a query library: no cache, no dedupe, no retries. ADR-0010 and J28 option D give the reasons.

**Each snapshot carries its owner's id.**
```tsx
  const progress =
    profileId && progressRes.data?.profileId === profileId ? progressRes.data.progress : null;
```
Because `useResource` keeps `data` across a key change, a switch from A to B would otherwise show A's numbers under B's name for one round-trip. Tagging the snapshot turns that into "loading". J28 chose a spinner over stale-but-wrong, and within one profile the keep-the-last-value rule still holds.

**`refreshProgress` is coalesced and identity-checked.** The drill calls it after every graded answer (J32). One request runs. A call made while it runs gets a single `trailing` promise that runs once more afterwards, because "anything recorded since it started needs one more". A result lands only if `currentProfileId.current === id`. That ref is updated on every render, which is why the closure can read the live value without re-creating `refreshProgress`. A failure goes to `notice`, never to boot.

**The Gate reads three states, not one.**
`client/src/App.tsx › Gate (L54–80 @ 6f1bf43)` checked `loading`, then `error`, then "no profile". The working tree checks, in order: `bootError` (full page, with **Retry** wired to `retryBoot`), boot not yet `ok`, an empty profile list ("No learner yet"), and no first snapshot (a progress error with Retry, or "Loading your progress"). After that it renders `<Outlet />` and, per its doc comment, "this never blanks the page again".

**Context is still the right tool.** The value is one `useMemo` with 32 dependencies. Every refresh re-renders every consumer once. The header comment and ADR-0010 name the trigger for moving to a store with selectors: anything that changes per keystroke. Nothing here does.

## Observe it

1. The suite: `cd client && npx vitest run src/lib/app-state.test.tsx --reporter=verbose` prints:
   ```
   ✓ src/lib/app-state.test.tsx > app state > a stale stored profile id falls back to the first profile with no error screen
   ✓ src/lib/app-state.test.tsx > app state > forgets a profile that 404s on progress and falls back to the next one
   ✓ src/lib/app-state.test.tsx > app state > a failed progress refresh keeps the page and shows a dismissible error
   ✓ src/lib/app-state.test.tsx > app state > a boot failure offers Retry, which recovers
   ✓ src/lib/app-state.test.tsx > app state > a late progress response for a previous profile is ignored
   ```
   followed by `Tests  5 passed (5)`. The first case asserts that `/progress` was **never requested** with the stale id, which is stronger than "the error screen went away".
2. (Manual, not recorded for this walkthrough: no browser was available.) In the browser: `npm run dev`, open the app, run `localStorage.setItem('stack-ready:profile-id','gone')` in the console, and reload. The roadmap loads for the first learner, and the Network tab shows no `/api/progress` call carrying `x-profile-id: gone`. At the baseline this was the permanent boot screen (J28 Symptom).
3. (Manual, not recorded.) Stop the server after the page has loaded, then finish a drill question. The page stays, and the shell's status region says "Could not refresh your progress: Cannot reach the Stack Ready API. Is the server running?".

## What is still wrong here

- J28 trade-off: a profile switch shows a spinner for one round-trip. Prefetching would fix it, and it is not planned.
- J28 follow-up: if the app grows past a handful of resources, reconsider a query library (the ADR-0010 trigger).
- J28 Update: `createProfile` did not ask before dropping a live drill, and the Shell now calls `confirmLeaveSession()` first. The guard lives in the caller, not in the provider. Today the Shell is the only place that can switch learner while a drill is mounted (import and delete live on the Progress page, where no drill is live), so the rule holds by layout. A new switcher anywhere else must remember it.
- F-18 closed through J28 and J43. Actions still throw to their caller by design, and each caller must catch. This is a convention, not an enforced rule.

## Do it

1. (5 min) Draw the Gate as a decision list, and write one test name from `app-state.test.tsx` or `pages.test.tsx` next to each branch. Which branch has no test?
2. (15 min) Remove the `profileId` tag from the progress snapshot on a scratch branch (use `progressRes.data?.progress` directly). Write a test that switches from A to B while B's progress is slow, and asserts A's XP is never shown under B's name. Watch it fail, then restore the tag.
3. (20 min) Give the background notice a way out. When a progress refresh fails, the notice should offer **Try again**, which calls `refreshProgress()` and clears the notice on success. Decide whether the action belongs in `notice` (a string today) or in a separate field, write down why, and prove it with a test modelled on *a failed progress refresh keeps the page and shows a dismissible error*.

## Check yourself

1. Why does `profileId` start as `null` rather than as the stored id?
2. Which of the three error classes does a failed `refreshProgress` produce, and where does it appear?
3. What does `useStableKey` prevent?
4. Why is the progress snapshot tagged with `profileId` when `useResource` already aborts on key change?
5. What happens when every stored profile 404s?

<details><summary>Answers</summary>

1. So nothing per-profile is requested before boot has checked the id against the real list. The order becomes a data dependency, not a race.
2. Background. It sets `notice`, which the shell shows in one `role="status"` region, and the last snapshot stays.
3. An inline `['progress', id]` is a new array every render. Compared by reference, it would restart the fetch on every render.
4. Aborting stops the old response from landing, but `useResource` deliberately keeps the old `data` while the new key loads. Without the tag, that kept data would be A's under B's name.
5. The 404 effect removes each one and chooses again. When the list is empty it reloads boot, and the Gate says "No learner yet".

</details>
