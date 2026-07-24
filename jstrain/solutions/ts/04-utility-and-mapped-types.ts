/** Reference solutions for MODULE TS-04. */

export interface Product {
  id: string;
  name: string;
  price: number;
  tags: string[];
  discontinued: boolean;
}

export type MyPartial<T> = { [K in keyof T]?: T[K] };
export type MyRequired<T> = { [K in keyof T]-?: T[K] };
export type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
export type MyOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] };

export type MyRecord<K extends keyof any, V> = { [P in K]: V };

export type NullableFields<T> = { [K in keyof T]: T[K] | null };

export type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

export type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

export type PickByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T];

export function applyPatch<T extends object>(entity: T, patch: Partial<T>): T {
  const out = { ...entity };
  for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function pickFields<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.hasOwn(obj, key)) out[key] = obj[key];
  }
  return out;
}

export function omitFields<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  const drop = new Set<PropertyKey>(keys);
  const out = {} as Record<PropertyKey, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (!drop.has(key)) out[key] = value;
  }
  return out as Omit<T, K>;
}

export function entriesOf<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

export type ProductDraft = { [K in keyof Product]?: string };

export function toDraft(product: Product): ProductDraft {
  return {
    id: product.id,
    name: product.name,
    price: String(product.price),
    tags: product.tags.join(', '),
    discontinued: String(product.discontinued),
  };
}
