/**
 * TYPE-LEVEL tests for MODULE TS-01.
 *
 * These never execute. They are checked by the TypeScript compiler:
 *   npm run test:types
 *
 * `expectTypeOf(...).toEqualTypeOf<X>()` fails unless the types are identical
 * (not merely assignable), which is why leaving `unknown` in place fails.
 */
import { describe, expectTypeOf, it } from 'vitest';
import {
  byKey,
  type Comparator,
  type LogLevel,
  type Nullable,
  type Point,
  type Primitive,
  type Role,
  ROLES,
  type User,
} from '@ex/ts/01-basic-types';

describe('P1 Primitive', () => {
  it('is the union of the non-object types', () => {
    expectTypeOf<Primitive>().toEqualTypeOf<
      string | number | boolean | bigint | symbol | null | undefined
    >();
  });

  it('does not include objects', () => {
    expectTypeOf<{ a: 1 }>().not.toMatchTypeOf<Primitive>();
  });
});

describe('P2 Nullable', () => {
  it('adds null and undefined', () => {
    expectTypeOf<Nullable<string>>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<Nullable<number>>().toEqualTypeOf<number | null | undefined>();
  });
});

describe('P3 Point', () => {
  it('is a two-number tuple, not an array', () => {
    expectTypeOf<Point>().toEqualTypeOf<[number, number]>();
    expectTypeOf<Point>().not.toEqualTypeOf<number[]>();
  });

  it('rejects the wrong length', () => {
    // @ts-expect-error a Point has exactly two members
    const bad: Point = [1, 2, 3];
    void bad;
  });
});

describe('P5 LogLevel', () => {
  it('is the four literals', () => {
    expectTypeOf<LogLevel>().toEqualTypeOf<'debug' | 'info' | 'warn' | 'error'>();
  });

  it('rejects other strings', () => {
    // @ts-expect-error 'trace' is not a LogLevel
    const bad: LogLevel = 'trace';
    void bad;
  });
});

describe('P6 User', () => {
  it('has the declared members', () => {
    expectTypeOf<User['id']>().toEqualTypeOf<number>();
    expectTypeOf<User['name']>().toEqualTypeOf<string>();
    expectTypeOf<User['email']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<User['roles']>().toEqualTypeOf<readonly string[]>();
  });

  it('makes email optional', () => {
    const user: User = { id: 1, name: 'Ada', roles: [] };
    void user;
  });

  it('makes id readonly', () => {
    const user: User = { id: 1, name: 'Ada', roles: [] };
    // @ts-expect-error id is readonly
    user.id = 2;
  });

  it('makes roles a readonly array', () => {
    const user: User = { id: 1, name: 'Ada', roles: ['admin'] };
    // @ts-expect-error a readonly array has no push
    user.roles.push('editor');
  });
});

describe('P9 Role', () => {
  it('is derived from ROLES, not hand-written', () => {
    expectTypeOf<Role>().toEqualTypeOf<'admin' | 'editor' | 'viewer'>();
    expectTypeOf<(typeof ROLES)[number]>().toEqualTypeOf<Role>();
  });

  it('rejects an unlisted role', () => {
    // @ts-expect-error 'owner' is not in ROLES
    const bad: Role = 'owner';
    void bad;
  });
});

describe('P14 Comparator', () => {
  it('takes two values and returns a number', () => {
    expectTypeOf<Comparator<string>>().toEqualTypeOf<(a: string, b: string) => number>();
    expectTypeOf<Comparator<number>>().parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf<Comparator<number>>().returns.toEqualTypeOf<number>();
  });
});

describe('P15 byKey', () => {
  it('only accepts keys of the object type', () => {
    const people = [{ name: 'Ada', age: 25 }];
    people.sort(byKey('age'));
    // @ts-expect-error 'height' is not a key of the element type
    people.sort(byKey('height'));
  });
});
