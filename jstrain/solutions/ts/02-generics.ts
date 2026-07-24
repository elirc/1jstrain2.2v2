/** Reference solutions for MODULE TS-02. */

export function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

export function last<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

export function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

export function indexBy<T, K extends keyof T>(items: readonly T[], key: K): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) {
    out[String(item[key])] = item;
  }
  return out;
}

export function longest<T extends { length: number }>(a: T, b: T): T {
  return b.length > a.length ? b : a;
}

export function orElse<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

export class Box<T> {
  constructor(public readonly value: T) {}

  static of<V>(value: V): Box<V> {
    return new Box(value);
  }

  map<R>(fn: (value: T) => R): Box<R> {
    return new Box(fn(this.value));
  }
}

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

export function unwrapOr<T, E>(
  result: { ok: true; value: T } | { ok: false; error: E },
  fallback: T,
): T {
  return result.ok ? result.value : fallback;
}

export function tryCatch<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: Error } {
  try {
    return ok(fn());
  } catch (thrown) {
    return err(thrown instanceof Error ? thrown : new Error(String(thrown)));
  }
}

export function mapValues<T extends object, R>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => R,
): Record<keyof T, R> {
  const out = {} as Record<keyof T, R>;
  for (const key of Object.keys(obj) as (keyof T)[]) {
    out[key] = fn(obj[key], key);
  }
  return out;
}

export function keysOf<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

export interface Collection<T> {
  add(item: T): void;
  all(): readonly T[];
  find(predicate: (item: T) => boolean): T | undefined;
  readonly size: number;
}

export function createCollection<T>(initial: readonly T[] = []): Collection<T> {
  const items: T[] = [...initial];
  return {
    add(item) {
      items.push(item);
    },
    all() {
      return [...items];
    },
    find(predicate) {
      return items.find(predicate);
    },
    get size() {
      return items.length;
    },
  };
}

export type ApiResponse<T = unknown> = {
  data: T;
  meta: { requestId: string; durationMs: number };
};

export function sortBy<T, V extends string | number>(
  items: readonly T[],
  selector: (item: T) => V,
): T[] {
  return [...items].sort((a, b) => {
    const left = selector(a);
    const right = selector(b);
    if (typeof left === 'string' && typeof right === 'string') {
      return left.localeCompare(right);
    }
    return Number(left) - Number(right);
  });
}
