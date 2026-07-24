/** Reference solutions for MODULE REACT-04. */
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

export function useToggle(initial = false): [boolean, () => void, (next: boolean) => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((next: boolean) => setValue(next), []);
  return [value, toggle, set];
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

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
  const [count, setCount] = useState(() => Math.min(max, Math.max(min, initial)));

  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);
  const increment = useCallback(() => setCount((c) => clamp(c + 1)), [clamp]);
  const decrement = useCallback(() => setCount((c) => clamp(c - 1)), [clamp]);
  const reset = useCallback(() => setCount(clamp(initial)), [clamp, initial]);
  const setTo = useCallback((value: number) => setCount(clamp(value)), [clamp]);

  return { count, increment, decrement, reset, setTo };
}

export type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }
  | { type: 'set'; value: number };

export function counterReducer(state: { count: number }, action: CounterAction) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'reset':
      return { count: 0 };
    case 'set':
      return { count: action.value };
    default:
      return state;
  }
}

export function ReducerCounter({ initial = 0 }: { initial?: number }) {
  const [state, dispatch] = useReducer(counterReducer, { count: initial });
  return (
    <div>
      <output>{state.count}</output>
      <button type="button" onClick={() => dispatch({ type: 'increment' })}>
        +
      </button>
      <button type="button" onClick={() => dispatch({ type: 'decrement' })}>
        -
      </button>
      <button type="button" onClick={() => dispatch({ type: 'reset' })}>
        Reset
      </button>
    </div>
  );
}

export function ExpensiveList({
  items,
  label,
  compute,
}: {
  items: number[];
  label: string;
  compute: (items: number[]) => number;
}) {
  const computed = useMemo(() => compute(items), [items, compute]);
  return (
    <p>
      {label}: {computed}
    </p>
  );
}

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
  const [count, setCount] = useState(0);
  const clicks = useRef(0);

  // Stable identity: the child sees the same function on every parent render.
  const handleAction = useCallback(() => {
    clicks.current += 1;
    onChildAction(clicks.current);
  }, [onChildAction]);

  return (
    <div>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Re-render
      </button>
      <span data-testid="parent-count">{count}</span>
      <MemoChild onAction={handleAction} />
    </div>
  );
}

export function FocusableInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label htmlFor="focus-name">Name</label>
      <input id="focus-name" ref={inputRef} />
      <button type="button" onClick={() => inputRef.current?.focus()}>
        Focus
      </button>
    </div>
  );
}

export function useInterval(callback: () => void, delayMs: number | null): void {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => latest.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

export interface FetchState<T> {
  status: 'loading' | 'success' | 'error';
  data: T | null;
  error: Error | null;
  reload: () => void;
}

export function useAsyncData<T>(load: () => Promise<T>): FetchState<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error';
    data: T | null;
    error: Error | null;
  }>({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let ignore = false;
    setState({ status: 'loading', data: null, error: null });
    load().then(
      (data) => {
        if (!ignore) setState({ status: 'success', data, error: null });
      },
      (error: Error) => {
        if (!ignore) setState({ status: 'error', data: null, error });
      },
    );
    return () => {
      ignore = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  return { ...state, reload };
}

export function NameList({ load }: { load: () => Promise<string[]> }) {
  const { status, data, error, reload } = useAsyncData(load);
  const [shown, toggle] = useToggle(true);

  return (
    <div>
      <button type="button" onClick={toggle}>
        {shown ? 'Hide' : 'Show'}
      </button>
      <button type="button" onClick={reload}>
        Reload
      </button>
      {status === 'loading' && <p>Loading…</p>}
      {status === 'error' && <p role="alert">{error?.message}</p>}
      {status === 'success' && shown && (
        <ul>
          {(data ?? []).map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
