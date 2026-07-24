/**
 * MODULE REACT-04 — useReducer, refs, memoisation and custom hooks
 * =================================================================
 *
 * useState is fine until state transitions get interesting. Then:
 *
 *   const [state, dispatch] = useReducer(reducer, initialState);
 *
 * You already wrote a reducer in JS-10 — React just wires it to re-rendering.
 * The win is that all the transitions live in one pure, testable function.
 *
 * useRef gives you a mutable box that survives re-renders and does NOT
 * trigger one when it changes: DOM nodes, timer ids, "the previous value",
 * "have I run yet".
 *
 * useMemo/useCallback cache a value or a function between renders. They are
 * an optimisation, not a correctness tool — but they become load-bearing the
 * moment a child is wrapped in React.memo or a value is in a dependency
 * array.
 *
 * A custom hook is any function starting with `use` that calls other hooks.
 * It shares LOGIC between components, never state — each caller gets its own.
 *
 * Run:  npx vitest run tests/react/04-hooks.test.tsx
 */
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

/**
 * PROBLEM 1 — useToggle.
 *
 * Return `[value, toggle, set]`. `toggle()` flips it; `set(next)` forces it.
 * Both functions must be STABLE (the same reference on every render) — a test
 * checks, because unstable callbacks are what break React.memo.
 */
export function useToggle(initial = false): [boolean, () => void, (next: boolean) => void] {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — usePrevious.
 *
 * Return the value from the PREVIOUS render, and undefined on the first one.
 * This is the classic useRef + useEffect pairing.
 */
export function usePrevious<T>(value: T): T | undefined {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — useCounter, a custom hook with a small API.
 *
 * Return `{ count, increment, decrement, reset, setTo }`, clamped between
 * `min` and `max` (defaults: 0 and Infinity). Every function must be stable.
 */
export interface CounterApi {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setTo: (value: number) => void;
}

export function useCounter(
  initial = 0,
  { min = 0, max = Number.POSITIVE_INFINITY }: { min?: number; max?: number } = {},
): CounterApi {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — A reducer-driven component.
 *
 * Actions: 'increment' | 'decrement' | 'reset' | { type: 'set', value }
 * Implement `counterReducer` as a PURE function, then use it here.
 *
 * Render: <output>{count}</output> and buttons '+', '-', 'Reset'.
 */
export type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }
  | { type: 'set'; value: number };

export function counterReducer(state: { count: number }, action: CounterAction) {
  throw new Error('TODO');
}

export function ReducerCounter({ initial = 0 }: { initial?: number }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — useMemo and an expensive computation.
 *
 * `compute(items)` is expensive; call it only when `items` changes, NOT when
 * the unrelated `label` prop changes.
 *
 * Render `<p>{label}: {computed}</p>`.
 */
export function ExpensiveList({
  items,
  label,
  compute,
}: {
  items: number[];
  label: string;
  compute: (items: number[]) => number;
}) {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — useCallback and React.memo.
 *
 * `MemoChild` below is already memoised. Make `Parent` pass a callback that
 * does NOT change identity between renders, so that clicking 'Re-render'
 * (which changes only the parent's own counter) does not re-render the child.
 *
 * Parent renders:
 *   <button>Re-render</button>
 *   <span data-testid="parent-count">{count}</span>
 *   <MemoChild onAction={stableCallback} />
 */
export const MemoChild = memo(function MemoChild({ onAction }: { onAction: () => void }) {
  const renders = useRef(0);
  renders.current += 1;
  return (
    <div>
      <span data-testid="child-renders">{renders.current}</span>
      <button type="button" onClick={onAction}>
        Act
      </button>
    </div>
  );
});

export function Parent({ onChildAction }: { onChildAction: (n: number) => void }) {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — useRef for DOM access.
 *
 * Focus the input when the 'Focus' button is clicked. The input is labelled
 * 'Name'.
 */
export function FocusableInput() {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — useInterval, the hook that fixes the stale-closure trap.
 *
 * Run `callback` every `delayMs`. A null delay pauses it. Changing the
 * callback must NOT restart the timer, and the timer must always call the
 * LATEST callback (keep it in a ref).
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — A data-fetching hook.
 *
 * Return `{ status, data, error, reload }` where status is
 * 'loading' | 'success' | 'error'. `reload()` re-runs the fetch.
 * Ignore stale responses (module REACT-03, problem 4).
 */
export interface FetchState<T> {
  status: 'loading' | 'success' | 'error';
  data: T | null;
  error: Error | null;
  reload: () => void;
}

export function useAsyncData<T>(load: () => Promise<T>): FetchState<T> {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — Compose your hooks.
 *
 * A component that uses `useAsyncData` to load a list of names and
 * `useToggle` to show/hide them:
 *   - a button reading 'Show'/'Hide'
 *   - while loading: <p>Loading…</p>
 *   - on error: <p role="alert">{message}</p>
 *   - when shown: a <ul> of names
 *   - a 'Reload' button that calls reload()
 */
export function NameList({ load }: { load: () => Promise<string[]> }) {
  throw new Error('TODO');
}
