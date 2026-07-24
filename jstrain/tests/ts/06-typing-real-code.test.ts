import { describe, expect, it, vi } from 'vitest';
import {
  isNumberValue,
  isStringValue,
  objectOf,
  parseIds,
  request,
  RequestBuilder,
  ROUTES,
  routePath,
  toOrderId,
  todoReducer,
  toUserId,
  type TodoAction,
  type TodoState,
} from '@ex/ts/06-typing-real-code';

describe('P1 branded ids', () => {
  it('passes the string through at run time', () => {
    expect(toUserId('u1')).toBe('u1');
    expect(toOrderId('o1')).toBe('o1');
  });

  it('rejects an empty id', () => {
    expect(() => toUserId('')).toThrow(TypeError);
    expect(() => toUserId('')).toThrow('invalid id');
  });

  it('adds nothing to the value (the brand is compile-time only)', () => {
    expect(typeof toUserId('u1')).toBe('string');
    expect(JSON.stringify({ id: toUserId('u1') })).toBe('{"id":"u1"}');
  });
});

describe('P2 parseIds', () => {
  it('handles a single id', () => {
    expect(parseIds('u1')).toBe('u1');
  });

  it('handles an array', () => {
    expect(parseIds(['u1', 'u2'])).toEqual(['u1', 'u2']);
  });

  it('validates every element', () => {
    expect(() => parseIds(['u1', ''])).toThrow('invalid id');
  });
});

describe('P4 todoReducer', () => {
  const initial: TodoState = { todos: [], nextId: 1 };
  const action = (a: TodoAction) => a;

  it('adds a todo and advances nextId', () => {
    const next = todoReducer(initial, action({ type: 'add', payload: { text: 'write tests' } }));
    expect(next.todos).toEqual([{ id: '1', text: 'write tests', done: false }]);
    expect(next.nextId).toBe(2);
    expect(initial.todos).toEqual([]);
  });

  it('toggles', () => {
    let state = todoReducer(initial, action({ type: 'add', payload: { text: 'a' } }));
    state = todoReducer(state, action({ type: 'toggle', payload: { id: '1' } }));
    expect(state.todos[0].done).toBe(true);
    state = todoReducer(state, action({ type: 'toggle', payload: { id: '1' } }));
    expect(state.todos[0].done).toBe(false);
  });

  it('removes', () => {
    let state = todoReducer(initial, action({ type: 'add', payload: { text: 'a' } }));
    state = todoReducer(state, action({ type: 'add', payload: { text: 'b' } }));
    state = todoReducer(state, action({ type: 'remove', payload: { id: '1' } }));
    expect(state.todos.map((t) => t.text)).toEqual(['b']);
    expect(state.nextId).toBe(3);
  });

  it('clears completed', () => {
    let state = todoReducer(initial, action({ type: 'add', payload: { text: 'a' } }));
    state = todoReducer(state, action({ type: 'add', payload: { text: 'b' } }));
    state = todoReducer(state, action({ type: 'toggle', payload: { id: '1' } }));
    state = todoReducer(state, action({ type: 'clearCompleted' }));
    expect(state.todos.map((t) => t.text)).toEqual(['b']);
  });

  it('ignores an unknown action by identity', () => {
    expect(todoReducer(initial, { type: 'nonsense' } as unknown as TodoAction)).toBe(initial);
  });

  it('never mutates the previous state', () => {
    const state = todoReducer(initial, action({ type: 'add', payload: { text: 'a' } }));
    const frozen = JSON.stringify(state);
    todoReducer(state, action({ type: 'toggle', payload: { id: '1' } }));
    expect(JSON.stringify(state)).toBe(frozen);
  });
});

describe('P6 request', () => {
  const validateUser = (value: unknown) =>
    typeof value === 'object' && value !== null && 'id' in value
      ? (value as { id: string })
      : null;

  it('returns validated data', async () => {
    const fetchJson = vi.fn(async () => ({ id: 'u1' }));
    await expect(request('/users/1', validateUser, fetchJson)).resolves.toEqual({ id: 'u1' });
    expect(fetchJson).toHaveBeenCalledWith('/users/1');
  });

  it('rejects an invalid response', async () => {
    await expect(request('/users/1', validateUser, async () => ({ nope: true }))).rejects.toThrow(
      'invalid response from /users/1',
    );
  });

  it('propagates a network error unchanged', async () => {
    const boom = new Error('ECONNREFUSED');
    await expect(
      request('/users/1', validateUser, async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
  });
});

describe('P7 validators', () => {
  it('validates primitives', () => {
    expect(isStringValue('x')).toBe('x');
    expect(isStringValue(1)).toBe(null);
    expect(isNumberValue(1)).toBe(1);
    expect(isNumberValue('1')).toBe(null);
    expect(isNumberValue(NaN)).toBe(null);
  });

  it('validates an object shape', () => {
    const validate = objectOf({ id: isStringValue, age: isNumberValue });
    expect(validate({ id: 'u1', age: 36 })).toEqual({ id: 'u1', age: 36 });
  });

  it('drops extra properties', () => {
    const validate = objectOf({ id: isStringValue });
    expect(validate({ id: 'u1', extra: 'nope' })).toEqual({ id: 'u1' });
  });

  it.each([
    [{ id: 'u1' }],
    [{ id: 1, age: 36 }],
    [{ id: 'u1', age: 'old' }],
    [null],
    ['a string'],
    [[]],
  ])('rejects %o', (value) => {
    expect(objectOf({ id: isStringValue, age: isNumberValue })(value)).toBe(null);
  });
});

describe('P8/P9 ROUTES', () => {
  it('keeps the route table readable at run time', () => {
    expect(ROUTES.home.path).toBe('/');
    expect(ROUTES.profile.auth).toBe(true);
  });

  it('looks up a path', () => {
    expect(routePath('settings')).toBe('/settings');
  });
});

describe('P10 RequestBuilder', () => {
  it('builds a default GET', () => {
    expect(new RequestBuilder('/users').build()).toEqual({
      url: '/users',
      method: 'GET',
      headers: {},
    });
  });

  it('chains every option', () => {
    expect(
      new RequestBuilder('/users')
        .method('POST')
        .header('content-type', 'application/json')
        .header('x-trace', '1')
        .body({ x: 1 })
        .build(),
    ).toEqual({
      url: '/users',
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-trace': '1' },
      body: { x: 1 },
    });
  });

  it('returns the same builder from every step', () => {
    const builder = new RequestBuilder('/x');
    expect(builder.method('PUT')).toBe(builder);
    expect(builder.header('a', 'b')).toBe(builder);
    expect(builder.body(null)).toBe(builder);
  });

  it('copies its headers into the built request', () => {
    const builder = new RequestBuilder('/x').header('a', '1');
    const built = builder.build();
    builder.header('b', '2');
    expect(built.headers).toEqual({ a: '1' });
  });
});
