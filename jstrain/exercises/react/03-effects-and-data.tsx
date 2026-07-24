/**
 * MODULE REACT-03 — Effects, data fetching and cleanup
 * =====================================================
 *
 * `useEffect` is not "run this after render". It is: SYNCHRONISE this
 * component with something outside React — the document title, a timer, a
 * subscription, the network.
 *
 *   useEffect(() => {
 *     const id = setInterval(tick, 1000);
 *     return () => clearInterval(id);   // cleanup: runs before the next
 *   }, [delay]);                        // effect and on unmount
 *
 * The dependency array is not a "run when" list — it is a list of everything
 * the effect READS from the component. Lie about it and you get stale values.
 *
 * Three rules that avoid most effect bugs:
 *   1. Every effect that starts something must return a cleanup that stops it.
 *   2. An async effect must guard against a stale response — the request you
 *      started second can arrive first.
 *   3. If you can compute it during render, you do not need an effect at all.
 *
 * Run:  npx vitest run tests/react/03-effects-and-data.test.tsx
 */
import { useEffect, useRef, useState } from 'react';

/**
 * PROBLEM 1 — A custom hook that touches the outside world.
 *
 * Set `document.title` to `title` while this component is mounted, and put
 * the previous title back when it unmounts.
 */
export function useDocumentTitle(title: string): void {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — Timers and cleanup.
 *
 * Render `<p data-testid="ticks">{ticks}</p>`, incrementing every
 * `intervalMs` milliseconds. Changing `intervalMs` restarts the timer without
 * losing the count. Unmounting must stop the timer — a test asserts that no
 * timers are left behind.
 */
export function Ticker({ intervalMs }: { intervalMs: number }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — The three states of any fetch.
 *
 * Call `load(userId)` whenever `userId` changes and render exactly one of:
 *   loading -> <p>Loading…</p>
 *   error   -> <p role="alert">{error.message}</p>
 *   success -> <p>{user.name}</p>
 *
 * Never render stale data from a previous user while the next one is loading.
 */
export interface LoadedUser {
  id: string;
  name: string;
}

export function UserProfile({
  userId,
  load,
}: {
  userId: string;
  load: (id: string) => Promise<LoadedUser>;
}) {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — The race condition.
 *
 * Same idea, but the test deliberately resolves an OLD request after a newer
 * one. Your component must ignore the stale response.
 *
 * The standard fix: a local `ignore` flag flipped in the cleanup function.
 *
 *   useEffect(() => {
 *     let ignore = false;
 *     load(query).then(r => { if (!ignore) setResult(r); });
 *     return () => { ignore = true; };
 *   }, [query, load]);
 *
 * Render `<p data-testid="result">{result}</p>`, or 'none' before the first
 * result arrives.
 */
export function SearchResult({
  query,
  load,
}: {
  query: string;
  load: (query: string) => Promise<string>;
}) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — A debounced value hook.
 *
 * Return `value`, but only after it has stayed unchanged for `delayMs`.
 * A change during the wait restarts the timer. The FIRST value is returned
 * immediately (no initial delay).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — Subscribing to something outside React.
 *
 * Attach `handler` to `window` for `eventName` while mounted, and remove it
 * on unmount. The handler must always be the LATEST one passed in, without
 * re-subscribing on every render — store it in a ref.
 */
export function useWindowEvent(eventName: string, handler: (event: Event) => void): void {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — Cancelling in-flight work.
 *
 * Call `load(signal)` on mount, passing the signal of an AbortController that
 * is aborted in the cleanup. Render `<p>{data ?? 'idle'}</p>`.
 *
 * If the load rejects with an error whose `name` is 'AbortError', ignore it
 * (that is your own cleanup talking, not a real failure).
 */
export function AbortableLoader({ load }: { load: (signal: AbortSignal) => Promise<string> }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — An effect you do NOT need.
 *
 * This component is written badly on purpose:
 *
 *   const [fullName, setFullName] = useState('');
 *   useEffect(() => { setFullName(`${first} ${last}`) }, [first, last]);
 *
 * That renders twice and can flash the old value. Rewrite it with no state
 * and no effect at all — just compute during render.
 *
 * Render `<p>{first} {last}</p>` and, for the test, a
 * `<span data-testid="renders">{renderCount}</span>` using the ref that is
 * already provided below.
 */
export function FullName({ first, last }: { first: string; last: string }) {
  const renders = useRef(0);
  renders.current += 1;
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — Syncing state to localStorage.
 *
 * `useState`, but persisted under `key`. On mount, read the stored JSON (and
 * fall back to `initial` when it is missing or unparseable). On every change,
 * write it back.
 *
 * The setter must accept both a value and an updater function.
 */
export function useLocalStorageState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((current: T) => T)) => void] {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — Put it together: a live search box.
 *
 * An input labelled 'Search'. The query is debounced by `debounceMs` (use
 * PROBLEM 5) before calling `search(debouncedQuery)`. Render:
 *   - nothing but the input while the debounced query is empty
 *   - `<p>Searching…</p>` while a search is in flight
 *   - a `<ul>` of results otherwise
 * Stale responses must be ignored (PROBLEM 4).
 */
export function LiveSearch({
  search,
  debounceMs = 300,
}: {
  search: (query: string) => Promise<string[]>;
  debounceMs?: number;
}) {
  throw new Error('TODO');
}
