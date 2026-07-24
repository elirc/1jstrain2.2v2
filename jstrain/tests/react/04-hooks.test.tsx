import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  counterReducer,
  ExpensiveList,
  FocusableInput,
  NameList,
  Parent,
  ReducerCounter,
  useAsyncData,
  useCounter,
  useInterval,
  usePrevious,
  useToggle,
} from '@ex/react/04-hooks';

describe('P1 useToggle', () => {
  it('toggles and sets', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);

    act(() => result.current[2](false));
    expect(result.current[0]).toBe(false);
  });

  it('honours the initial value', () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current[0]).toBe(true);
  });

  it('returns stable functions across renders', () => {
    const { result, rerender } = renderHook(() => useToggle());
    const [, toggleBefore, setBefore] = result.current;
    act(() => result.current[1]());
    rerender();
    expect(result.current[1]).toBe(toggleBefore);
    expect(result.current[2]).toBe(setBefore);
  });
});

describe('P2 usePrevious', () => {
  it('is undefined on the first render', () => {
    const { result } = renderHook(() => usePrevious('a'));
    expect(result.current).toBe(undefined);
  });

  it('reports the value from the previous render', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    expect(result.current).toBe('a');
    rerender({ value: 'c' });
    expect(result.current).toBe('b');
  });
});

describe('P3 useCounter', () => {
  it('counts within the default bounds', () => {
    const { result } = renderHook(() => useCounter(1));
    act(() => result.current.increment());
    expect(result.current.count).toBe(2);
    act(() => result.current.decrement());
    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
  });

  it('clamps to a max', () => {
    const { result } = renderHook(() => useCounter(0, { max: 2 }));
    act(() => result.current.increment());
    act(() => result.current.increment());
    act(() => result.current.increment());
    expect(result.current.count).toBe(2);
  });

  it('resets and sets, respecting the bounds', () => {
    const { result } = renderHook(() => useCounter(3, { min: 1, max: 5 }));
    act(() => result.current.setTo(99));
    expect(result.current.count).toBe(5);
    act(() => result.current.setTo(-99));
    expect(result.current.count).toBe(1);
    act(() => result.current.reset());
    expect(result.current.count).toBe(3);
  });

  it('returns stable functions', () => {
    const { result } = renderHook(() => useCounter(0));
    const before = result.current.increment;
    act(() => result.current.increment());
    expect(result.current.increment).toBe(before);
  });
});

describe('P4 counterReducer + ReducerCounter', () => {
  it('is a pure function', () => {
    const state = { count: 1 };
    expect(counterReducer(state, { type: 'increment' })).toEqual({ count: 2 });
    expect(counterReducer(state, { type: 'decrement' })).toEqual({ count: 0 });
    expect(counterReducer(state, { type: 'reset' })).toEqual({ count: 0 });
    expect(counterReducer(state, { type: 'set', value: 42 })).toEqual({ count: 42 });
    expect(state).toEqual({ count: 1 }); // untouched
  });

  it('drives the component', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReducerCounter initial={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+' }));
    expect(screen.getByText('6')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '-' }));
    await user.click(screen.getByRole('button', { name: '-' }));
    expect(screen.getByText('4')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

describe('P5 ExpensiveList', () => {
  it('renders the computed value', () => {
    render(<ExpensiveList items={[1, 2, 3]} label="Sum" compute={(xs) => xs.length} />);
    expect(screen.getByText('Sum: 3')).toBeInTheDocument();
  });

  it('does not recompute when an unrelated prop changes', () => {
    const compute = vi.fn((xs: number[]) => xs.length);
    const items = [1, 2, 3];
    const { rerender } = render(<ExpensiveList items={items} label="A" compute={compute} />);
    expect(compute).toHaveBeenCalledTimes(1);

    rerender(<ExpensiveList items={items} label="B" compute={compute} />);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(screen.getByText('B: 3')).toBeInTheDocument();
  });

  it('recomputes when the items change', () => {
    const compute = vi.fn((xs: number[]) => xs.length);
    const { rerender } = render(<ExpensiveList items={[1]} label="A" compute={compute} />);
    rerender(<ExpensiveList items={[1, 2]} label="A" compute={compute} />);
    expect(compute).toHaveBeenCalledTimes(2);
    expect(screen.getByText('A: 2')).toBeInTheDocument();
  });
});

describe('P6 Parent + MemoChild', () => {
  it('does not re-render the memoised child when only the parent state changes', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Parent onChildAction={vi.fn()} />);
    expect(screen.getByTestId('child-renders')).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: 'Re-render' }));
    expect(screen.getByTestId('parent-count')).toHaveTextContent('1');
    expect(screen.getByTestId('child-renders')).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: 'Re-render' }));
    expect(screen.getByTestId('child-renders')).toHaveTextContent('1');
  });

  it('still calls through to the parent handler', async () => {
    const user = userEvent.setup({ delay: null });
    const onChildAction = vi.fn();
    render(<Parent onChildAction={onChildAction} />);

    await user.click(screen.getByRole('button', { name: 'Act' }));
    await user.click(screen.getByRole('button', { name: 'Act' }));
    expect(onChildAction).toHaveBeenNthCalledWith(1, 1);
    expect(onChildAction).toHaveBeenNthCalledWith(2, 2);
  });
});

describe('P7 FocusableInput', () => {
  it('focuses the input on click', async () => {
    const user = userEvent.setup({ delay: null });
    render(<FocusableInput />);
    const input = screen.getByLabelText('Name');
    expect(input).not.toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Focus' }));
    expect(input).toHaveFocus();
  });
});

describe('P8 useInterval', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs on a schedule', () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, 100));
    act(() => vi.advanceTimersByTime(350));
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('pauses on a null delay', () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, null));
    act(() => vi.advanceTimersByTime(1000));
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls the latest callback without restarting the timer', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useInterval(cb, 100), {
      initialProps: { cb: first },
    });

    act(() => vi.advanceTimersByTime(50));
    rerender({ cb: second });
    act(() => vi.advanceTimersByTime(50));

    // The timer was NOT restarted, so it fired at 100ms — with the new callback.
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useInterval(vi.fn(), 100));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('P9 useAsyncData', () => {
  it('moves from loading to success', async () => {
    const load = vi.fn(async () => ['a']);
    const { result } = renderHook(() => useAsyncData(load));
    expect(result.current.status).toBe('loading');

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual(['a']);
    expect(result.current.error).toBe(null);
  });

  it('captures an error', async () => {
    const load = vi.fn(async () => Promise.reject(new Error('nope')));
    const { result } = renderHook(() => useAsyncData(load));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('nope');
  });

  it('reloads on demand', async () => {
    let n = 0;
    const load = vi.fn(async () => {
      n += 1;
      return [`call ${n}`];
    });
    const { result } = renderHook(() => useAsyncData(load));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.data).toEqual(['call 1']);

    await act(async () => {
      result.current.reload();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(['call 2']);
  });
});

describe('P10 NameList', () => {
  it('shows loading, then the names', async () => {
    render(<NameList load={async () => ['Ada', 'Grace']} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('hides and shows the list', async () => {
    const user = userEvent.setup({ delay: null });
    render(<NameList load={async () => ['Ada']} />);
    await screen.findByText('Ada');

    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('reloads', async () => {
    const user = userEvent.setup({ delay: null });
    let n = 0;
    const load = vi.fn(async () => {
      n += 1;
      return [`name ${n}`];
    });
    render(<NameList load={load} />);
    expect(await screen.findByText('name 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(await screen.findByText('name 2')).toBeInTheDocument();
  });

  it('renders an error', async () => {
    render(<NameList load={async () => Promise.reject(new Error('offline'))} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('offline');
  });
});
