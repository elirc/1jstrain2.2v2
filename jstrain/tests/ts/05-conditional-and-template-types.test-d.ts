/** TYPE-LEVEL tests for MODULE TS-05. Run with: npm run test:types */
import { describe, expectTypeOf, it } from 'vitest';
import {
  type CamelCase,
  type CamelCaseKeys,
  camelizeKeys,
  createEmitter,
  type ElementOf,
  type EventHandlerName,
  type Flatten,
  type MyExclude,
  type MyExtract,
  type MyNonNullable,
  type MyParameters,
  type MyReturnType,
  type Path,
  type Split,
  type UnwrapPromise,
} from '@ex/ts/05-conditional-and-template-types';

describe('P1 UnwrapPromise', () => {
  it('removes one or more Promise layers', () => {
    expectTypeOf<UnwrapPromise<Promise<string>>>().toEqualTypeOf<string>();
    expectTypeOf<UnwrapPromise<Promise<Promise<number>>>>().toEqualTypeOf<number>();
  });

  it('leaves a non-promise alone', () => {
    expectTypeOf<UnwrapPromise<string>>().toEqualTypeOf<string>();
  });
});

describe('P2 ElementOf', () => {
  it('reads the element type', () => {
    expectTypeOf<ElementOf<string[]>>().toEqualTypeOf<string>();
    expectTypeOf<ElementOf<readonly number[]>>().toEqualTypeOf<number>();
    expectTypeOf<ElementOf<{ a: 1 }[]>>().toEqualTypeOf<{ a: 1 }>();
  });

  it('is never for a non-array', () => {
    expectTypeOf<ElementOf<string>>().toEqualTypeOf<never>();
  });
});

describe('P3 MyReturnType / MyParameters', () => {
  it('reads a function signature', () => {
    expectTypeOf<MyReturnType<() => string>>().toEqualTypeOf<string>();
    expectTypeOf<MyReturnType<(a: number) => void>>().toEqualTypeOf<void>();
    expectTypeOf<MyParameters<(a: number, b: string) => void>>().toEqualTypeOf<[number, string]>();
    expectTypeOf<MyParameters<() => void>>().toEqualTypeOf<[]>();
  });

  it('is never for a non-function', () => {
    expectTypeOf<MyReturnType<string>>().toEqualTypeOf<never>();
  });
});

describe('P4 MyExclude / MyExtract / MyNonNullable', () => {
  it('filters unions', () => {
    expectTypeOf<MyExclude<'a' | 'b' | 'c', 'a'>>().toEqualTypeOf<'b' | 'c'>();
    expectTypeOf<MyExtract<'a' | 'b', 'a' | 'z'>>().toEqualTypeOf<'a'>();
    expectTypeOf<MyNonNullable<string | null | undefined>>().toEqualTypeOf<string>();
  });

  it('distributes over the union rather than matching it whole', () => {
    expectTypeOf<MyExclude<string | number, number>>().toEqualTypeOf<string>();
  });
});

describe('P5 Flatten', () => {
  it('unwraps every array layer', () => {
    expectTypeOf<Flatten<number[][]>>().toEqualTypeOf<number>();
    expectTypeOf<Flatten<string[][][]>>().toEqualTypeOf<string>();
    expectTypeOf<Flatten<boolean>>().toEqualTypeOf<boolean>();
  });
});

describe('P6 EventHandlerName', () => {
  it('builds handler names', () => {
    expectTypeOf<EventHandlerName<'click'>>().toEqualTypeOf<'onClick'>();
    expectTypeOf<EventHandlerName<'click' | 'focus'>>().toEqualTypeOf<'onClick' | 'onFocus'>();
  });
});

describe('P7 CamelCase', () => {
  it('converts snake_case', () => {
    expectTypeOf<CamelCase<'user_first_name'>>().toEqualTypeOf<'userFirstName'>();
    expectTypeOf<CamelCase<'created_at'>>().toEqualTypeOf<'createdAt'>();
    expectTypeOf<CamelCase<'id'>>().toEqualTypeOf<'id'>();
  });
});

describe('P8 CamelCaseKeys', () => {
  it('renames every key', () => {
    expectTypeOf<CamelCaseKeys<{ user_id: string; created_at: number }>>().toEqualTypeOf<{
      userId: string;
      createdAt: number;
    }>();
  });
});

describe('P9 Split', () => {
  it('splits on a delimiter', () => {
    expectTypeOf<Split<'a.b.c', '.'>>().toEqualTypeOf<['a', 'b', 'c']>();
    expectTypeOf<Split<'a', '.'>>().toEqualTypeOf<['a']>();
    expectTypeOf<Split<'', '.'>>().toEqualTypeOf<[]>();
    expectTypeOf<Split<'a-b', '-'>>().toEqualTypeOf<['a', 'b']>();
  });
});

describe('P10 Path', () => {
  it('lists dotted paths', () => {
    expectTypeOf<Path<{ a: { b: string }; c: number }>>().toEqualTypeOf<'a' | 'a.b' | 'c'>();
  });

  it('does not descend into arrays', () => {
    expectTypeOf<Path<{ list: string[] }>>().toEqualTypeOf<'list'>();
  });

  it('goes three levels deep', () => {
    expectTypeOf<Path<{ a: { b: { c: number } } }>>().toEqualTypeOf<'a' | 'a.b' | 'a.b.c'>();
  });
});

describe('P11 Emitter', () => {
  type AppEvents = {
    login: { userId: string };
    logout: { reason: string };
  };

  it('types the payload from the event name', () => {
    const bus = createEmitter<AppEvents>();
    bus.on('login', (payload) => {
      expectTypeOf(payload).toEqualTypeOf<{ userId: string }>();
    });
    bus.emit('logout', { reason: 'timeout' });
  });

  it('rejects an unknown event', () => {
    const bus = createEmitter<AppEvents>();
    // @ts-expect-error 'nope' is not an event
    bus.emit('nope', {});
  });

  it('rejects the wrong payload', () => {
    const bus = createEmitter<AppEvents>();
    // @ts-expect-error login needs a userId
    bus.emit('login', { reason: 'x' });
  });

  it('returns an unsubscribe function from on()', () => {
    const bus = createEmitter<AppEvents>();
    expectTypeOf(bus.on('login', () => {})).toEqualTypeOf<() => void>();
  });
});

describe('P12 camelizeKeys', () => {
  it('returns precisely renamed keys', () => {
    expectTypeOf(camelizeKeys({ user_id: 'u1', created_at: 1 })).toEqualTypeOf<{
      userId: string;
      createdAt: number;
    }>();
  });
});
