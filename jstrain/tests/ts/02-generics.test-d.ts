/** TYPE-LEVEL tests for MODULE TS-02. Run with: npm run test:types */
import { describe, expectTypeOf, it } from 'vitest';
import {
  type ApiResponse,
  Box,
  createCollection,
  first,
  keysOf,
  longest,
  mapValues,
  orElse,
  pluck,
  type Result,
  sortBy,
  tryCatch,
} from '@ex/ts/02-generics';

interface User {
  id: string;
  name: string;
  age: number;
}

declare const users: User[];

describe('P1 first', () => {
  it('tracks the element type', () => {
    expectTypeOf(first([1, 2])).toEqualTypeOf<number | undefined>();
    expectTypeOf(first(['a'])).toEqualTypeOf<string | undefined>();
    expectTypeOf(first(users)).toEqualTypeOf<User | undefined>();
  });

  it('is not `any`', () => {
    expectTypeOf(first([1])).not.toBeAny();
  });
});

describe('P2 pluck', () => {
  it('returns the property type', () => {
    expectTypeOf(pluck(users, 'age')).toEqualTypeOf<number[]>();
    expectTypeOf(pluck(users, 'name')).toEqualTypeOf<string[]>();
  });

  it('rejects a key that does not exist', () => {
    // @ts-expect-error 'height' is not a key of User
    pluck(users, 'height');
  });
});

describe('P4 longest', () => {
  it('returns the type it was given', () => {
    expectTypeOf(longest('a', 'bb')).toEqualTypeOf<string>();
    expectTypeOf(longest([1], [2, 3])).toEqualTypeOf<number[]>();
  });

  it('rejects a type with no length', () => {
    // @ts-expect-error numbers have no .length
    longest(1, 2);
  });
});

describe('P5 orElse', () => {
  it('strips null and undefined from the result', () => {
    const maybe = null as string | null;
    expectTypeOf(orElse(maybe, 'fallback')).toEqualTypeOf<string>();
  });
});

describe('P6 Box', () => {
  it('changes its parameter through map', () => {
    expectTypeOf(Box.of(2)).toEqualTypeOf<Box<number>>();
    expectTypeOf(Box.of(2).map(String)).toEqualTypeOf<Box<string>>();
    expectTypeOf(Box.of(2).map(String).value).toEqualTypeOf<string>();
  });

  it('has a readonly value', () => {
    const box = Box.of(1);
    // @ts-expect-error value is readonly
    box.value = 2;
  });
});

describe('P7 Result', () => {
  it('is a discriminated union with a default error type', () => {
    expectTypeOf<Result<number>>().toEqualTypeOf<
      { ok: true; value: number } | { ok: false; error: Error }
    >();
    expectTypeOf<Result<number, string>>().toEqualTypeOf<
      { ok: true; value: number } | { ok: false; error: string }
    >();
  });

  it('narrows on the `ok` discriminant', () => {
    const result = tryCatch(() => 1);
    if (result.ok) {
      expectTypeOf(result.value).toEqualTypeOf<number>();
      // @ts-expect-error a success has no `error`
      void result.error;
    } else {
      expectTypeOf(result.error).toEqualTypeOf<Error>();
      // @ts-expect-error a failure has no `value`
      void result.value;
    }
  });
});

describe('P9 mapValues', () => {
  it('keeps the keys and takes the callback return type', () => {
    expectTypeOf(mapValues({ a: 1, b: 2 }, (n) => `${n}`)).toEqualTypeOf<
      Record<'a' | 'b', string>
    >();
  });
});

describe('P10 keysOf', () => {
  it('returns the literal keys, not string[]', () => {
    expectTypeOf(keysOf({ a: 1, b: 2 })).toEqualTypeOf<('a' | 'b')[]>();
    expectTypeOf(keysOf({ a: 1 })).not.toEqualTypeOf<string[]>();
  });
});

describe('P11 createCollection', () => {
  it('carries its element type', () => {
    const collection = createCollection<User>();
    expectTypeOf(collection.all()).toEqualTypeOf<readonly User[]>();
    expectTypeOf(collection.find(() => true)).toEqualTypeOf<User | undefined>();
    expectTypeOf(collection.size).toEqualTypeOf<number>();
  });

  it('infers from the initial items', () => {
    expectTypeOf(createCollection([1, 2]).all()).toEqualTypeOf<readonly number[]>();
  });

  it('rejects the wrong element type', () => {
    const collection = createCollection<number>();
    // @ts-expect-error a string is not a number
    collection.add('nope');
  });
});

describe('P12 ApiResponse', () => {
  it('wraps data with metadata', () => {
    expectTypeOf<ApiResponse<User[]>>().toEqualTypeOf<{
      data: User[];
      meta: { requestId: string; durationMs: number };
    }>();
  });

  it('defaults its parameter to unknown', () => {
    expectTypeOf<ApiResponse>().toEqualTypeOf<ApiResponse<unknown>>();
  });
});

describe('P13 sortBy', () => {
  it('keeps the array type and infers the selector', () => {
    expectTypeOf(sortBy(users, (u) => u.age)).toEqualTypeOf<User[]>();
  });

  it('rejects a selector returning something unsortable', () => {
    // @ts-expect-error boolean is not string | number
    sortBy(users, (u) => u.age > 3);
  });
});
