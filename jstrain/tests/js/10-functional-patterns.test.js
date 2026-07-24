import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addItem,
  applyMiddleware,
  buildReport,
  compose,
  createSelector,
  createStore,
  debounce,
  deepEqual,
  memoize,
  pipe,
  pipeAsync,
  removeItem,
  throttle,
  todosReducer,
  updateItem,
} from '@ex/js/10-functional-patterns.js';

const double = (n) => n * 2;
const increment = (n) => n + 1;
const stringify = (n) => `#${n}`;

describe('P1 pipe / compose', () => {
  it('pipes left to right', () => {
    expect(pipe(double, increment, stringify)(5)).toBe('#11');
  });

  it('composes right to left', () => {
    expect(compose(stringify, increment, double)(5)).toBe('#11');
  });

  it('returns the input when given no functions', () => {
    expect(pipe()(7)).toBe(7);
    expect(compose()(7)).toBe(7);
  });

  it('passes extra arguments to the first function only', () => {
    expect(pipe((a, b) => a + b, double)(2, 3)).toBe(10);
    expect(compose(double, (a, b) => a + b)(2, 3)).toBe(10);
  });

  it('works with a single function', () => {
    expect(pipe(double)(3)).toBe(6);
  });
});

describe('P2 pipeAsync', () => {
  it('awaits each step', async () => {
    const result = await pipeAsync(
      async (n) => n * 2,
      (n) => n + 1,
      async (n) => `#${n}`,
    )(5);
    expect(result).toBe('#11');
  });

  it('propagates a rejection', async () => {
    await expect(
      pipeAsync(async () => {
        throw new Error('step failed');
      }, double)(1),
    ).rejects.toThrow('step failed');
  });

  it('runs steps in order, not in parallel', async () => {
    const order = [];
    await pipeAsync(
      async (n) => {
        order.push('a');
        return n;
      },
      async (n) => {
        order.push('b');
        return n;
      },
    )(1);
    expect(order).toEqual(['a', 'b']);
  });
});

describe('P3 memoize', () => {
  it('computes once per distinct argument list', () => {
    const fn = vi.fn((a, b) => a + b);
    const memo = memoize(fn);
    expect(memo(1, 2)).toBe(3);
    expect(memo(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(memo(2, 2)).toBe(4);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('caches an undefined result', () => {
    const fn = vi.fn(() => undefined);
    const memo = memoize(fn);
    memo(1);
    memo(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('accepts a custom key function', () => {
    const fn = vi.fn((user) => user.name.toUpperCase());
    const memo = memoize(fn, (user) => user.id);
    expect(memo({ id: 1, name: 'ada' })).toBe('ADA');
    expect(memo({ id: 1, name: 'someone else' })).toBe('ADA');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exposes and clears the cache', () => {
    const fn = vi.fn(double);
    const memo = memoize(fn);
    memo(1);
    expect(memo.cache).toBeInstanceOf(Map);
    expect(memo.cache.size).toBe(1);
    memo.clear();
    expect(memo.cache.size).toBe(0);
    memo(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('P4 debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs once, after the quiet period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses the last arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    debounced('b');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('restarts the clock on every call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(80);
    debounced();
    vi.advanceTimersByTime(80);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('fires again for a later burst', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(100);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });

  it('flushes a pending call immediately', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('x');
    debounced.flush();
    expect(fn).toHaveBeenCalledWith('x');
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('flush does nothing when nothing is pending', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced.flush();
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('P5 throttle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls immediately on the leading edge', () => {
    const fn = vi.fn();
    throttle(fn, 100)('first');
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('drops calls inside the window but keeps the last one', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    throttled('b');
    throttled('c');
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('c');
  });

  it('does not fire a trailing call when there was none', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('is ready again after the window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    vi.advanceTimersByTime(100);
    throttled('b');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending trailing call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    throttled('b');
    throttled.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('P6 deepEqual', () => {
  it.each([
    [1, 1, true],
    ['a', 'a', true],
    [null, null, true],
    [undefined, undefined, true],
    [NaN, NaN, true],
    [0, -0, false],
    [1, '1', false],
    [null, undefined, false],
    [{}, {}, true],
    [[], [], true],
    [{ a: 1 }, { a: 1 }, true],
    [{ a: 1 }, { a: 2 }, false],
    [{ a: 1 }, { a: 1, b: 2 }, false],
    [{ a: 1, b: 2 }, { b: 2, a: 1 }, true],
    [[1, 2], [1, 2], true],
    [[1, 2], [2, 1], false],
    [[1], { 0: 1 }, false],
    [{ a: { b: [1, { c: 2 }] } }, { a: { b: [1, { c: 2 }] } }, true],
    [{ a: { b: [1, { c: 2 }] } }, { a: { b: [1, { c: 3 }] } }, false],
  ])('deepEqual(%j, %j) === %s', (a, b, expected) => {
    expect(deepEqual(a, b)).toBe(expected);
  });

  it('compares Dates by value', () => {
    expect(deepEqual(new Date('2020-01-01'), new Date('2020-01-01'))).toBe(true);
    expect(deepEqual(new Date('2020-01-01'), new Date('2021-01-01'))).toBe(false);
    expect(deepEqual(new Date('2020-01-01'), '2020-01-01')).toBe(false);
  });

  it('survives cycles', () => {
    const a = { name: 'x' };
    a.self = a;
    const b = { name: 'x' };
    b.self = b;
    expect(deepEqual(a, b)).toBe(true);
  });
});

describe('P7 immutable list updates', () => {
  const list = [
    { id: 1, done: false },
    { id: 2, done: false },
  ];

  it('adds without mutating', () => {
    const next = addItem(list, { id: 3, done: false });
    expect(next).toHaveLength(3);
    expect(list).toHaveLength(2);
    expect(next).not.toBe(list);
  });

  it('removes matching items', () => {
    expect(removeItem(list, (item) => item.id === 1)).toEqual([{ id: 2, done: false }]);
    expect(list).toHaveLength(2);
  });

  it('updates matching items', () => {
    const next = updateItem(
      list,
      (item) => item.id === 2,
      (item) => ({ ...item, done: true }),
    );
    expect(next[1]).toEqual({ id: 2, done: true });
    expect(list[1].done).toBe(false);
  });

  it('keeps the identity of untouched items', () => {
    const next = updateItem(
      list,
      (item) => item.id === 2,
      (item) => ({ ...item, done: true }),
    );
    expect(next[0]).toBe(list[0]);
    expect(next[1]).not.toBe(list[1]);
  });
});

describe('P8 todosReducer', () => {
  const initial = { todos: [], filter: 'all' };

  it('adds a todo', () => {
    const next = todosReducer(initial, { type: 'added', payload: { id: 'a', text: 'buy milk' } });
    expect(next.todos).toEqual([{ id: 'a', text: 'buy milk', done: false }]);
    expect(initial.todos).toEqual([]);
  });

  it('toggles, edits and removes', () => {
    let state = todosReducer(initial, { type: 'added', payload: { id: 'a', text: 'one' } });
    state = todosReducer(state, { type: 'added', payload: { id: 'b', text: 'two' } });
    state = todosReducer(state, { type: 'toggled', payload: { id: 'a' } });
    expect(state.todos[0].done).toBe(true);
    expect(state.todos[1].done).toBe(false);

    state = todosReducer(state, { type: 'edited', payload: { id: 'b', text: 'TWO' } });
    expect(state.todos[1].text).toBe('TWO');

    state = todosReducer(state, { type: 'removed', payload: { id: 'a' } });
    expect(state.todos.map((t) => t.id)).toEqual(['b']);
  });

  it('changes the filter without touching the todos', () => {
    const withTodo = todosReducer(initial, { type: 'added', payload: { id: 'a', text: 'x' } });
    const filtered = todosReducer(withTodo, { type: 'filtered', payload: { filter: 'done' } });
    expect(filtered.filter).toBe('done');
    expect(filtered.todos).toBe(withTodo.todos);
  });

  it('clears completed todos', () => {
    let state = todosReducer(initial, { type: 'added', payload: { id: 'a', text: 'x' } });
    state = todosReducer(state, { type: 'added', payload: { id: 'b', text: 'y' } });
    state = todosReducer(state, { type: 'toggled', payload: { id: 'a' } });
    state = todosReducer(state, { type: 'cleared' });
    expect(state.todos.map((t) => t.id)).toEqual(['b']);
  });

  it('returns the same object for an unknown action', () => {
    expect(todosReducer(initial, { type: 'nonsense' })).toBe(initial);
  });

  it('is pure — calling it twice gives the same result', () => {
    const action = { type: 'added', payload: { id: 'a', text: 'x' } };
    expect(todosReducer(initial, action)).toEqual(todosReducer(initial, action));
  });
});

describe('P9 createStore', () => {
  const counter = (state, action) =>
    action.type === 'inc' ? { count: state.count + 1 } : state;

  it('exposes state and dispatch', () => {
    const store = createStore(counter, { count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
    store.dispatch({ type: 'inc' });
    expect(store.getState()).toEqual({ count: 1 });
  });

  it('returns the dispatched action', () => {
    const store = createStore(counter, { count: 0 });
    const action = { type: 'inc' };
    expect(store.dispatch(action)).toBe(action);
  });

  it('notifies subscribers with next and previous state', () => {
    const store = createStore(counter, { count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'inc' });
    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });

  it('does not notify when the state did not change', () => {
    const store = createStore(counter, { count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'unknown' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribes', () => {
    const store = createStore(counter, { count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.dispatch({ type: 'inc' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('supports several subscribers', () => {
    const store = createStore(counter, { count: 0 });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.dispatch({ type: 'inc' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});

describe('P10 createSelector', () => {
  const selectTodos = (state) => state.todos;
  const selectFilter = (state) => state.filter;

  it('computes and caches', () => {
    const visible = createSelector([selectTodos, selectFilter], (todos, filter) =>
      filter === 'all' ? todos : todos.filter((t) => (filter === 'done' ? t.done : !t.done)),
    );

    const state = { todos: [{ id: 1, done: true }], filter: 'all', other: 1 };
    const first = visible(state);
    const second = visible(state);
    expect(second).toBe(first);
    expect(visible.recomputations()).toBe(1);
  });

  it('ignores changes to unrelated state', () => {
    const visible = createSelector([selectTodos, selectFilter], (todos) => todos.length);
    const todos = [];
    visible({ todos, filter: 'all', unrelated: 1 });
    visible({ todos, filter: 'all', unrelated: 2 });
    expect(visible.recomputations()).toBe(1);
  });

  it('recomputes when an input changes', () => {
    const visible = createSelector([selectTodos, selectFilter], (todos) => todos.length);
    visible({ todos: [], filter: 'all' });
    visible({ todos: [{ id: 1 }], filter: 'all' });
    expect(visible.recomputations()).toBe(2);
  });
});

describe('P11 applyMiddleware', () => {
  const counter = (state, action) =>
    action.type === 'inc' ? { count: state.count + 1 } : state;

  it('wraps dispatch in order (first middleware is outermost)', () => {
    const order = [];
    const outer = () => (next) => (action) => {
      order.push('outer:before');
      const result = next(action);
      order.push('outer:after');
      return result;
    };
    const inner = () => (next) => (action) => {
      order.push('inner:before');
      const result = next(action);
      order.push('inner:after');
      return result;
    };

    const store = applyMiddleware(createStore(counter, { count: 0 }), [outer, inner]);
    store.dispatch({ type: 'inc' });
    expect(order).toEqual(['outer:before', 'inner:before', 'inner:after', 'outer:after']);
    expect(store.getState()).toEqual({ count: 1 });
  });

  it('gives middleware access to the store', () => {
    const seen = [];
    const logger = (store) => (next) => (action) => {
      seen.push(store.getState().count);
      return next(action);
    };
    const store = applyMiddleware(createStore(counter, { count: 5 }), [logger]);
    store.dispatch({ type: 'inc' });
    expect(seen).toEqual([5]);
  });

  it('lets middleware transform actions', () => {
    const upgrade = () => (next) => (action) =>
      next(action.type === 'bump' ? { type: 'inc' } : action);
    const store = applyMiddleware(createStore(counter, { count: 0 }), [upgrade]);
    store.dispatch({ type: 'bump' });
    expect(store.getState()).toEqual({ count: 1 });
  });

  it('leaves getState and subscribe working', () => {
    const store = applyMiddleware(createStore(counter, { count: 0 }), []);
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'inc' });
    expect(listener).toHaveBeenCalled();
    expect(store.getState()).toEqual({ count: 1 });
  });
});

describe('P12 buildReport', () => {
  const rows = [
    { user: 'ada', action: 'login', ms: 120, at: '2024-03-01T00:00:00Z' },
    { user: 'bob', action: 'search', ms: 300, at: '2024-03-01T00:01:00Z' },
    { user: 'ada', action: 'search', ms: 90, at: '2024-03-01T00:02:00Z' },
    { user: '', action: 'login', ms: 10, at: '2024-03-01T00:03:00Z' },
    { user: 'cyd', action: 'login', ms: -5, at: '2024-03-01T00:04:00Z' },
    { user: 'cyd', ms: 10, at: '2024-03-01T00:05:00Z' },
    { user: 'dan', action: 'login', ms: 'fast', at: '2024-03-01T00:06:00Z' },
  ];

  it('counts only valid rows', () => {
    const report = buildReport(rows);
    expect(report.totalEvents).toBe(3);
    expect(report.byAction).toEqual({ login: 1, search: 2 });
  });

  it('finds the slowest event', () => {
    expect(buildReport(rows).slowest).toEqual({ user: 'bob', action: 'search', ms: 300 });
  });

  it('averages and rounds', () => {
    expect(buildReport(rows).averageMs).toBe(170);
    expect(
      buildReport([
        { user: 'a', action: 'x', ms: 1 },
        { user: 'a', action: 'x', ms: 2 },
        { user: 'a', action: 'x', ms: 2 },
      ]).averageMs,
    ).toBe(1.67);
  });

  it('lists unique users alphabetically', () => {
    expect(buildReport(rows).users).toEqual(['ada', 'bob']);
  });

  it('handles an empty input', () => {
    expect(buildReport([])).toEqual({
      totalEvents: 0,
      byAction: {},
      slowest: null,
      averageMs: null,
      users: [],
    });
  });

  it('breaks ties by taking the first row', () => {
    const report = buildReport([
      { user: 'a', action: 'x', ms: 5 },
      { user: 'b', action: 'y', ms: 5 },
    ]);
    expect(report.slowest.user).toBe('a');
  });
});
