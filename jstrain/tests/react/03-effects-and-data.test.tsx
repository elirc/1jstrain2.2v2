import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AbortableLoader,
  FullName,
  LiveSearch,
  SearchResult,
  Ticker,
  useDebouncedValue,
  useDocumentTitle,
  useLocalStorageState,
  UserProfile,
  useWindowEvent,
  type LoadedUser,
} from '@ex/react/03-effects-and-data';

/** A promise you can settle from the test. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('P1 useDocumentTitle', () => {
  function TitleSetter({ title }: { title: string }) {
    useDocumentTitle(title);
    return <p>page</p>;
  }

  it('sets and restores the document title', () => {
    document.title = 'Original';
    const { unmount, rerender } = render(<TitleSetter title="First" />);
    expect(document.title).toBe('First');

    rerender(<TitleSetter title="Second" />);
    expect(document.title).toBe('Second');

    unmount();
    expect(document.title).toBe('Original');
  });
});

describe('P2 Ticker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts on every interval', () => {
    render(<Ticker intervalMs={1000} />);
    expect(screen.getByTestId('ticks')).toHaveTextContent('0');

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId('ticks')).toHaveTextContent('1');

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByTestId('ticks')).toHaveTextContent('4');
  });

  it('stops the timer on unmount', () => {
    const { unmount } = render(<Ticker intervalMs={1000} />);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts with a new interval without losing the count', () => {
    const { rerender } = render(<Ticker intervalMs={1000} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId('ticks')).toHaveTextContent('2');

    rerender(<Ticker intervalMs={100} />);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('ticks')).toHaveTextContent('5');
  });
});

describe('P3 UserProfile', () => {
  it('shows loading, then the user', async () => {
    const control = deferred<LoadedUser>();
    render(<UserProfile userId="u1" load={() => control.promise} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();

    control.resolve({ id: 'u1', name: 'Ada' });
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('shows an error', async () => {
    render(<UserProfile userId="u1" load={async () => Promise.reject(new Error('nope'))} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('nope');
  });

  it('goes back to loading when the id changes', async () => {
    const load = vi.fn(async (id: string) => ({ id, name: `User ${id}` }));
    const { rerender } = render(<UserProfile userId="u1" load={load} />);
    expect(await screen.findByText('User u1')).toBeInTheDocument();

    const second = deferred<LoadedUser>();
    rerender(<UserProfile userId="u2" load={() => second.promise} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('User u1')).not.toBeInTheDocument();

    second.resolve({ id: 'u2', name: 'User u2' });
    expect(await screen.findByText('User u2')).toBeInTheDocument();
  });
});

describe('P4 SearchResult — the race condition', () => {
  it('shows the result', async () => {
    render(<SearchResult query="a" load={async (q) => `result for ${q}`} />);
    expect(await screen.findByText('result for a')).toBeInTheDocument();
  });

  it('ignores a slow response from a previous query', async () => {
    const first = deferred<string>();
    const second = deferred<string>();

    const { rerender } = render(<SearchResult query="slow" load={() => first.promise} />);
    rerender(<SearchResult query="fast" load={() => second.promise} />);

    // The NEW query answers first...
    second.resolve('fast result');
    expect(await screen.findByText('fast result')).toBeInTheDocument();

    // ...and the stale one arrives late and must be ignored.
    first.resolve('slow result');
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('result')).toHaveTextContent('fast result');
  });

  it('renders "none" before anything arrives', () => {
    render(<SearchResult query="a" load={() => deferred<string>().promise} />);
    expect(screen.getByTestId('result')).toHaveTextContent('none');
  });
});

describe('P5 useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the first value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('first', 300));
    expect(result.current).toBe('first');
  });

  it('waits for the delay before updating', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('b');
  });

  it('restarts the timer on every change', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'c' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('c');
  });
});

describe('P6 useWindowEvent', () => {
  it('subscribes and unsubscribes', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useWindowEvent('resize', handler));

    window.dispatchEvent(new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    window.dispatchEvent(new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('always calls the latest handler', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ handler }: { handler: (event: Event) => void }) => useWindowEvent('resize', handler),
      { initialProps: { handler: first } },
    );

    rerender({ handler: second });
    window.dispatchEvent(new Event('resize'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not re-subscribe when only the handler changes', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { rerender } = renderHook(
      ({ handler }: { handler: (event: Event) => void }) => useWindowEvent('scroll', handler),
      { initialProps: { handler: vi.fn() } },
    );
    const initialCalls = addSpy.mock.calls.filter(([name]) => name === 'scroll').length;

    rerender({ handler: vi.fn() });
    const afterCalls = addSpy.mock.calls.filter(([name]) => name === 'scroll').length;
    expect(afterCalls).toBe(initialCalls);
    addSpy.mockRestore();
  });
});

describe('P7 AbortableLoader', () => {
  it('renders the loaded data', async () => {
    render(<AbortableLoader load={async () => 'loaded'} />);
    expect(await screen.findByText('loaded')).toBeInTheDocument();
  });

  it('aborts on unmount', () => {
    let captured: AbortSignal | undefined;
    const { unmount } = render(
      <AbortableLoader
        load={(signal) => {
          captured = signal;
          return new Promise<string>(() => {});
        }}
      />,
    );
    expect(captured?.aborted).toBe(false);
    unmount();
    expect(captured?.aborted).toBe(true);
  });

  it('swallows an AbortError', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    render(<AbortableLoader load={async () => Promise.reject(abortError)} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('idle')).toBeInTheDocument();
  });
});

describe('P8 FullName — the effect you do not need', () => {
  it('renders the name', () => {
    render(<FullName first="Ada" last="Lovelace" />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('renders exactly once (no state, no effect, no second pass)', () => {
    render(<FullName first="Ada" last="Lovelace" />);
    expect(screen.getByTestId('renders')).toHaveTextContent('1');
  });

  it('updates from props alone', () => {
    const { rerender } = render(<FullName first="Ada" last="Lovelace" />);
    rerender(<FullName first="Grace" last="Hopper" />);
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByTestId('renders')).toHaveTextContent('2');
  });
});

describe('P9 useLocalStorageState', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts from the initial value and persists changes', () => {
    const { result } = renderHook(() => useLocalStorageState('count', 0));
    expect(result.current[0]).toBe(0);

    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    expect(window.localStorage.getItem('count')).toBe('5');
  });

  it('reads an existing value on mount', () => {
    window.localStorage.setItem('name', '"Ada"');
    const { result } = renderHook(() => useLocalStorageState('name', 'nobody'));
    expect(result.current[0]).toBe('Ada');
  });

  it('falls back when the stored value is corrupt', () => {
    window.localStorage.setItem('broken', '{not json');
    const { result } = renderHook(() => useLocalStorageState('broken', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('accepts an updater function', () => {
    const { result } = renderHook(() => useLocalStorageState('n', 1));
    act(() => result.current[1]((current) => current + 10));
    expect(result.current[0]).toBe(11);
  });

  it('handles objects', () => {
    const { result } = renderHook(() => useLocalStorageState('obj', { a: 1 }));
    act(() => result.current[1]({ a: 2 }));
    expect(JSON.parse(window.localStorage.getItem('obj') ?? '{}')).toEqual({ a: 2 });
  });
});

describe('P10 LiveSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // userEvent and fake timers do not mix well, so drive the input directly.
  const typeIn = (text: string) => {
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: text } });
  };

  it('does not search until the query settles', async () => {
    const search = vi.fn(async () => ['a']);
    render(<LiveSearch search={search} debounceMs={300} />);

    typeIn('ab');
    expect(search).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('ab');
  });

  it('shows a searching state then the results', async () => {
    const control = deferred<string[]>();
    render(<LiveSearch search={() => control.promise} debounceMs={300} />);

    typeIn('ab');
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText('Searching…')).toBeInTheDocument();

    await act(async () => {
      control.resolve(['first', 'second']);
      await control.promise;
    });

    expect(screen.queryByText('Searching…')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'first',
      'second',
    ]);
  });

  it('renders nothing but the input for an empty query', () => {
    render(<LiveSearch search={vi.fn()} debounceMs={300} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument();
  });
});
