/** Reference solutions for MODULE TS-03. */

export interface Circle {
  kind: 'circle';
  radius: number;
}
export interface Square {
  kind: 'square';
  size: number;
}
export interface Rectangle {
  kind: 'rectangle';
  width: number;
  height: number;
}
export type Shape = Circle | Square | Rectangle;

export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

export function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.size ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    default:
      return assertNever(shape);
  }
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function compact<T>(items: readonly (T | null | undefined)[]): T[] {
  return items.filter(isDefined);
}

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

export function renderState<T>(state: AsyncState<T>): string {
  switch (state.status) {
    case 'idle':
      return 'Nothing yet';
    case 'loading':
      return 'Loading…';
    case 'success':
      return `Loaded: ${JSON.stringify(state.data)}`;
    case 'error':
      return `Failed: ${state.error.message}`;
    default:
      return assertNever(state);
  }
}

export function describeAccount(account: { email: string } | { apiKey: string }): string {
  if ('email' in account) return `user:${account.email}`;
  return `service:${account.apiKey.slice(0, 4)}…`;
}

export function assertNonEmptyString(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value === '') {
    throw new TypeError('expected a non-empty string');
  }
}

export interface ParsedUser {
  id: string;
  name: string;
  age?: number;
}

export function parseUser(value: unknown): ParsedUser | null {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isString(value.name)) return null;
  if (value.age !== undefined && !isFiniteNumber(value.age)) return null;

  const user: ParsedUser = { id: value.id, name: value.name };
  if (value.age !== undefined) user.age = value.age as number;
  return user;
}

export function match<T, R>(
  state: AsyncState<T>,
  handlers: {
    idle: () => R;
    loading: () => R;
    success: (data: T) => R;
    error: (error: Error) => R;
  },
): R {
  switch (state.status) {
    case 'idle':
      return handlers.idle();
    case 'loading':
      return handlers.loading();
    case 'success':
      return handlers.success(state.data);
    case 'error':
      return handlers.error(state.error);
    default:
      return assertNever(state);
  }
}

export function describeCaught(caught: unknown): string {
  if (caught instanceof Error) return `${caught.name}: ${caught.message}`;
  if (typeof caught === 'string') return caught;
  return 'Unknown error';
}
