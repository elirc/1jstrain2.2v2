/** TYPE-LEVEL tests for MODULE TS-03. Run with: npm run test:types */
import { describe, expectTypeOf, it } from 'vitest';
import {
  area,
  assertNonEmptyString,
  type AsyncState,
  type Circle,
  compact,
  isDefined,
  isString,
  match,
  parseUser,
  type Shape,
} from '@ex/ts/03-narrowing-unions';

describe('P1 Shape', () => {
  it('is a union of the three shapes', () => {
    expectTypeOf<Shape>().toEqualTypeOf<
      | { kind: 'circle'; radius: number }
      | { kind: 'square'; size: number }
      | { kind: 'rectangle'; width: number; height: number }
    >();
  });

  it('uses a literal discriminant, not `string`', () => {
    expectTypeOf<Circle['kind']>().toEqualTypeOf<'circle'>();
  });

  it('narrows on `kind`', () => {
    const shape = { kind: 'circle', radius: 1 } as Shape;
    if (shape.kind === 'circle') {
      expectTypeOf(shape.radius).toEqualTypeOf<number>();
      // @ts-expect-error a circle has no width
      void shape.width;
    }
  });

  it('rejects an unknown kind', () => {
    // @ts-expect-error 'triangle' is not a Shape
    const bad: Shape = { kind: 'triangle', base: 1 };
    void bad;
  });

  it('rejects a shape missing its data', () => {
    // @ts-expect-error a circle needs a radius
    const bad: Shape = { kind: 'circle' };
    void bad;
  });
});

describe('P2 area', () => {
  it('accepts any shape and returns a number', () => {
    expectTypeOf(area).parameters.toEqualTypeOf<[Shape]>();
    expectTypeOf(area).returns.toEqualTypeOf<number>();
  });
});

describe('P3 guards', () => {
  it('isString narrows unknown to string', () => {
    const value: unknown = 'x';
    if (isString(value)) {
      expectTypeOf(value).toEqualTypeOf<string>();
    }
  });

  it('isDefined strips null and undefined', () => {
    const value = null as string | null | undefined;
    if (isDefined(value)) {
      expectTypeOf(value).toEqualTypeOf<string>();
    }
  });
});

describe('P4 compact', () => {
  it('removes null and undefined from the RESULT type', () => {
    const input = [1, null, undefined] as (number | null | undefined)[];
    expectTypeOf(compact(input)).toEqualTypeOf<number[]>();
  });
});

describe('P5 AsyncState', () => {
  it('is the four-state union', () => {
    expectTypeOf<AsyncState<number>>().toEqualTypeOf<
      | { status: 'idle' }
      | { status: 'loading' }
      | { status: 'success'; data: number }
      | { status: 'error'; error: Error }
    >();
  });

  it('only exposes `data` in the success state', () => {
    const state = { status: 'idle' } as AsyncState<number>;
    // @ts-expect-error `data` does not exist on every member of the union
    void state.data;
    if (state.status === 'success') {
      expectTypeOf(state.data).toEqualTypeOf<number>();
    }
  });

  it('makes impossible states unconstructable', () => {
    // @ts-expect-error a loading state cannot carry data
    const bad: AsyncState<number> = { status: 'loading', data: 1 };
    void bad;
  });
});

describe('P7 assertNonEmptyString', () => {
  it('narrows the caller variable for the rest of the scope', () => {
    const value: unknown = 'x';
    assertNonEmptyString(value);
    expectTypeOf(value).toEqualTypeOf<string>();
  });
});

describe('P8 parseUser', () => {
  it('returns a user or null', () => {
    expectTypeOf(parseUser({})).toEqualTypeOf<{ id: string; name: string; age?: number } | null>();
  });

  it('forces a null check before use', () => {
    const user = parseUser({});
    // @ts-expect-error user may be null
    void user.id;
    if (user) expectTypeOf(user.name).toEqualTypeOf<string>();
  });
});

describe('P9 match', () => {
  it('infers the payload types of each handler', () => {
    const state = { status: 'idle' } as AsyncState<number>;
    match(state, {
      idle: () => 0,
      loading: () => 0,
      success: (data) => {
        expectTypeOf(data).toEqualTypeOf<number>();
        return data;
      },
      error: (error) => {
        expectTypeOf(error).toEqualTypeOf<Error>();
        return 0;
      },
    });
  });

  it('requires every case to be handled', () => {
    const state = { status: 'idle' } as AsyncState<number>;
    // @ts-expect-error the `error` handler is missing
    match(state, { idle: () => 0, loading: () => 0, success: () => 0 });
  });

  it('takes the return type from the handlers', () => {
    const state = { status: 'idle' } as AsyncState<number>;
    expectTypeOf(
      match(state, {
        idle: () => 'a',
        loading: () => 'b',
        success: () => 'c',
        error: () => 'd',
      }),
    ).toEqualTypeOf<string>();
  });
});
