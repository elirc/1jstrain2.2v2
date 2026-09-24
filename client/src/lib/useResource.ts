import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';

import { isAbortError } from './api';

/**
 * One hook for "fetch this, keyed by that": the pattern that used to be
 * written out by hand, with a `cancelled` flag, in four places.
 *
 * - One AbortController per run, aborted when the key changes or the component
 *   unmounts, so a superseded response can never land (and the request is
 *   actually cancelled, not just ignored).
 * - `load` is read through `useEffectEvent`, so an inline lambda does not
 *   restart the effect on every render. Only the key does.
 * - The key is compared element by element, so `['progress', id]` written
 *   inline is stable.
 * - `data` is kept while a new key loads: the page shows the last good value
 *   (and `status: 'loading'`) instead of going blank.
 *
 * Deliberately not a query library: no cache, no dedupe, no retries.
 */

export type ResourceStatus = 'idle' | 'loading' | 'ok' | 'error';

export interface Resource<T> {
  status: ResourceStatus;
  data: T | null;
  error: Error | null;
  /** Load again with the same key. */
  reload: () => void;
  /** Replace the data locally (an optimistic update, or a fresher copy fetched elsewhere). */
  setData: (update: T | ((prev: T | null) => T | null) | null) => void;
}

function sameKey(a: readonly unknown[] | null, b: readonly unknown[] | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, i) => Object.is(value, b[i]));
}

/** Returns the previous key array while the new one is element-wise equal. */
function useStableKey(key: readonly unknown[] | null): readonly unknown[] | null {
  const ref = useRef(key);
  if (!sameKey(ref.current, key)) ref.current = key;
  return ref.current;
}

export function useResource<T>(key: readonly unknown[] | null, load: (signal: AbortSignal) => Promise<T>): Resource<T> {
  const stableKey = useStableKey(key);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ status: ResourceStatus; data: T | null; error: Error | null }>(() => ({
    status: key ? 'loading' : 'idle',
    data: null,
    error: null,
  }));

  const run = useEffectEvent((signal: AbortSignal) => load(signal));

  useEffect(() => {
    if (stableKey === null) {
      setState({ status: 'idle', data: null, error: null });
      return;
    }
    const controller = new AbortController();
    setState((prev) => ({ status: 'loading', data: prev.data, error: null }));

    run(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'ok', data, error: null });
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({ status: 'error', data: prev.data, error }));
      },
    );

    return () => controller.abort();
  }, [stableKey, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const setData = useCallback((update: T | ((prev: T | null) => T | null) | null) => {
    setState((prev) => {
      const next = typeof update === 'function' ? (update as (p: T | null) => T | null)(prev.data) : update;
      return { status: next === null ? prev.status : 'ok', data: next, error: null };
    });
  }, []);

  return { ...state, reload, setData };
}
