/** Reference solutions for MODULE JS-10. */

export function pipe(...fns) {
  return (...args) => fns.reduce((value, fn, i) => (i === 0 ? fn(...args) : fn(value)), args[0]);
}

export function compose(...fns) {
  return pipe(...[...fns].reverse());
}

export function pipeAsync(...fns) {
  return async (...args) => {
    let value = fns.length > 0 ? await fns[0](...args) : args[0];
    for (const fn of fns.slice(1)) {
      value = await fn(value);
    }
    return value;
  };
}

export function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  const memoized = (...args) => {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key);
    const value = fn(...args);
    cache.set(key, value);
    return value;
  };
  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  return memoized;
}

export function debounce(fn, ms) {
  let timer = null;
  let pendingArgs = null;

  const run = () => {
    const args = pendingArgs;
    timer = null;
    pendingArgs = null;
    fn(...args);
  };

  const debounced = (...args) => {
    pendingArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(run, ms);
  };

  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pendingArgs = null;
  };

  debounced.flush = () => {
    if (timer === null) return;
    clearTimeout(timer);
    run();
  };

  return debounced;
}

export function throttle(fn, ms) {
  let cooling = false;
  let trailingArgs = null;

  const startWindow = () => {
    cooling = true;
    setTimeout(() => {
      cooling = false;
      if (trailingArgs !== null) {
        const args = trailingArgs;
        trailingArgs = null;
        fn(...args);
        startWindow();
      }
    }, ms);
  };

  const throttled = (...args) => {
    if (cooling) {
      trailingArgs = args;
      return;
    }
    fn(...args);
    startWindow();
  };

  throttled.cancel = () => {
    trailingArgs = null;
  };

  return throttled;
}

export function deepEqual(a, b, seen = new WeakMap()) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // Cycle guard: if we are already comparing this pair, assume equal.
  if (seen.get(a) === b) return true;
  seen.set(a, b);

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every(
    (key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key], seen),
  );
}

export function addItem(list, item) {
  return [...list, item];
}

export function removeItem(list, predicate) {
  return list.filter((item) => !predicate(item));
}

export function updateItem(list, predicate, fn) {
  return list.map((item) => (predicate(item) ? fn(item) : item));
}

export function todosReducer(state, action) {
  switch (action.type) {
    case 'added':
      return {
        ...state,
        todos: [...state.todos, { id: action.payload.id, text: action.payload.text, done: false }],
      };
    case 'toggled':
      return {
        ...state,
        todos: updateItem(
          state.todos,
          (todo) => todo.id === action.payload.id,
          (todo) => ({ ...todo, done: !todo.done }),
        ),
      };
    case 'removed':
      return {
        ...state,
        todos: removeItem(state.todos, (todo) => todo.id === action.payload.id),
      };
    case 'edited':
      return {
        ...state,
        todos: updateItem(
          state.todos,
          (todo) => todo.id === action.payload.id,
          (todo) => ({ ...todo, text: action.payload.text }),
        ),
      };
    case 'filtered':
      return { ...state, filter: action.payload.filter };
    case 'cleared':
      return { ...state, todos: state.todos.filter((todo) => !todo.done) };
    default:
      return state;
  }
}

export function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    dispatch(action) {
      const previous = state;
      state = reducer(state, action);
      if (state !== previous) {
        for (const listener of [...listeners]) listener(state, previous);
      }
      return action;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function createSelector(inputs, combine) {
  let lastInputs = null;
  let lastResult;
  let recomputations = 0;

  const selector = (state) => {
    const values = inputs.map((input) => input(state));
    const unchanged =
      lastInputs !== null &&
      values.length === lastInputs.length &&
      values.every((value, i) => value === lastInputs[i]);

    if (!unchanged) {
      lastResult = combine(...values);
      lastInputs = values;
      recomputations += 1;
    }
    return lastResult;
  };

  selector.recomputations = () => recomputations;
  return selector;
}

export function applyMiddleware(store, middlewares) {
  let dispatch = store.dispatch;
  // Wrap from the inside out so middlewares[0] ends up outermost.
  for (const middleware of [...middlewares].reverse()) {
    dispatch = middleware(store)(dispatch);
  }
  return { ...store, dispatch };
}

export function buildReport(rows) {
  const isValid = (row) =>
    typeof row.user === 'string' &&
    row.user !== '' &&
    typeof row.action === 'string' &&
    row.action !== '' &&
    typeof row.ms === 'number' &&
    Number.isFinite(row.ms) &&
    row.ms >= 0;

  const valid = rows.filter(isValid);

  const byAction = valid.reduce((acc, row) => {
    acc[row.action] = (acc[row.action] ?? 0) + 1;
    return acc;
  }, {});

  const slowest = valid.reduce(
    (best, row) => (best === null || row.ms > best.ms ? row : best),
    null,
  );

  const averageMs =
    valid.length === 0
      ? null
      : Math.round((valid.reduce((sum, row) => sum + row.ms, 0) / valid.length) * 100) / 100;

  return {
    totalEvents: valid.length,
    byAction,
    slowest: slowest === null ? null : { user: slowest.user, action: slowest.action, ms: slowest.ms },
    averageMs,
    users: [...new Set(valid.map((row) => row.user))].sort(),
  };
}
