/** Reference solutions for MODULE TS-06. */

export type UserId = string & { readonly __brand: 'UserId' };
export type OrderId = string & { readonly __brand: 'OrderId' };

export function toUserId(value: string): UserId {
  if (value === '') throw new TypeError('invalid id');
  return value as UserId;
}

export function toOrderId(value: string): OrderId {
  if (value === '') throw new TypeError('invalid id');
  return value as OrderId;
}

export function parseIds(value: string): UserId;
export function parseIds(value: string[]): UserId[];
export function parseIds(value: string | string[]): UserId | UserId[] {
  return Array.isArray(value) ? value.map(toUserId) : toUserId(value);
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoState {
  todos: Todo[];
  nextId: number;
}

export type TodoAction =
  | { type: 'add'; payload: { text: string } }
  | { type: 'toggle'; payload: { id: string } }
  | { type: 'remove'; payload: { id: string } }
  | { type: 'clearCompleted' };

export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'add':
      return {
        todos: [
          ...state.todos,
          { id: String(state.nextId), text: action.payload.text, done: false },
        ],
        nextId: state.nextId + 1,
      };
    case 'toggle':
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload.id ? { ...todo, done: !todo.done } : todo,
        ),
      };
    case 'remove':
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== action.payload.id),
      };
    case 'clearCompleted':
      return { ...state, todos: state.todos.filter((todo) => !todo.done) };
    default:
      return state;
  }
}

export type ActionOf<T extends TodoAction['type']> = Extract<TodoAction, { type: T }>;

export type PayloadOf<T extends TodoAction['type']> =
  ActionOf<T> extends { payload: infer P } ? P : undefined;

export type Validator<T> = (value: unknown) => T | null;

export async function request<T>(
  url: string,
  validate: Validator<T>,
  fetchJson: (url: string) => Promise<unknown>,
): Promise<T> {
  const raw = await fetchJson(url);
  const parsed = validate(raw);
  if (parsed === null) throw new Error(`invalid response from ${url}`);
  return parsed;
}

export function isStringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function isNumberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function objectOf<T extends Record<string, Validator<unknown>>>(
  shape: T,
): Validator<{ [K in keyof T]: NonNullable<ReturnType<T[K]>> }> {
  return (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, validate] of Object.entries(shape)) {
      const parsed = validate(source[key]);
      if (parsed === null) return null;
      out[key] = parsed;
    }
    return out as { [K in keyof T]: NonNullable<ReturnType<T[K]>> };
  };
}

export interface RouteDefinition {
  path: string;
  auth: boolean;
}

// `as const` keeps every value literal; `satisfies` still checks the shape.
// A plain `: Record<string, RouteDefinition>` annotation would widen the keys
// to `string` and lose the literal paths.
export const ROUTES = {
  home: { path: '/', auth: false },
  profile: { path: '/me', auth: true },
  settings: { path: '/settings', auth: true },
} as const satisfies Record<string, RouteDefinition>;

export function routePath(name: keyof typeof ROUTES): string {
  return ROUTES[name].path;
}

export interface BuiltRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: unknown;
}

export class RequestBuilder {
  #method: BuiltRequest['method'] = 'GET';
  #headers: Record<string, string> = {};
  #body: unknown = undefined;

  constructor(private readonly url: string) {}

  method(method: BuiltRequest['method']): this {
    this.#method = method;
    return this;
  }

  header(name: string, value: string): this {
    this.#headers[name] = value;
    return this;
  }

  body(body: unknown): this {
    this.#body = body;
    return this;
  }

  build(): BuiltRequest {
    const built: BuiltRequest = {
      url: this.url,
      method: this.#method,
      headers: { ...this.#headers },
    };
    if (this.#body !== undefined) built.body = this.#body;
    return built;
  }
}
