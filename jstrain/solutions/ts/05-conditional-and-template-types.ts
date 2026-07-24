/** Reference solutions for MODULE TS-05. */

export type UnwrapPromise<T> = T extends Promise<infer Inner> ? UnwrapPromise<Inner> : T;

export type ElementOf<T> = T extends readonly (infer E)[] ? E : never;

export type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;
export type MyParameters<F> = F extends (...args: infer P) => any ? P : never;

export type MyExclude<T, U> = T extends U ? never : T;
export type MyExtract<T, U> = T extends U ? T : never;
export type MyNonNullable<T> = T extends null | undefined ? never : T;

export type Flatten<T> = T extends readonly (infer E)[] ? Flatten<E> : T;

export type EventHandlerName<T extends string> = `on${Capitalize<T>}`;

export type CamelCase<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S;

export type CamelCaseKeys<T> = {
  [K in keyof T as CamelCase<string & K>]: T[K];
};

export type Split<S extends string, D extends string> = S extends ''
  ? []
  : S extends `${infer Head}${D}${infer Tail}`
    ? [Head, ...Split<Tail, D>]
    : [S];

export type Path<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends readonly unknown[]
        ? K
        : T[K] extends (...args: any[]) => any
          ? K
          : T[K] extends object
            ? K | `${K}.${Path<T[K]> & string}`
            : K;
    }[keyof T & string]
  : never;

export interface Emitter<Events extends Record<string, unknown>> {
  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): () => void;
  off<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
}

export function createEmitter<Events extends Record<string, unknown>>(): Emitter<Events> {
  const handlers = new Map<keyof Events, Set<(payload: never) => void>>();

  const setFor = <K extends keyof Events>(event: K) => {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    return set;
  };

  const emitter: Emitter<Events> = {
    on(event, handler) {
      setFor(event).add(handler as (payload: never) => void);
      return () => emitter.off(event, handler);
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler as (payload: never) => void);
    },
    emit(event, payload) {
      for (const handler of [...(handlers.get(event) ?? [])]) {
        (handler as (payload: unknown) => void)(payload);
      }
    },
  };
  return emitter;
}

function camelize(key: string): string {
  return key.replace(/_+([a-z0-9])/gi, (_match, char: string) => char.toUpperCase());
}

export function camelizeKeys<T extends Record<string, unknown>>(obj: T): CamelCaseKeys<T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [camelize(key), value]),
  ) as CamelCaseKeys<T>;
}
