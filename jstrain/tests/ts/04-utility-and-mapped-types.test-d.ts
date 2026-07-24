/** TYPE-LEVEL tests for MODULE TS-04. Run with: npm run test:types */
import { describe, expectTypeOf, it } from 'vitest';
import {
  applyPatch,
  type DeepPartial,
  type Entries,
  entriesOf,
  type Getters,
  type Mutable,
  type MyOmit,
  type MyPartial,
  type MyPick,
  type MyReadonly,
  type MyRecord,
  type MyRequired,
  type NullableFields,
  omitFields,
  type OptionalKeys,
  type PickByType,
  pickFields,
  type Product,
} from '@ex/ts/04-utility-and-mapped-types';

interface Simple {
  a: string;
  b?: number;
  readonly c: boolean;
}

describe('P1 Partial / Required / Readonly / Mutable', () => {
  it('MyPartial makes everything optional', () => {
    expectTypeOf<MyPartial<{ a: string; b: number }>>().toEqualTypeOf<{
      a?: string;
      b?: number;
    }>();
  });

  it('MyRequired removes optionality', () => {
    expectTypeOf<MyRequired<{ a?: string; b?: number }>>().toEqualTypeOf<{
      a: string;
      b: number;
    }>();
  });

  it('MyReadonly locks every key', () => {
    expectTypeOf<MyReadonly<{ a: string }>>().toEqualTypeOf<{ readonly a: string }>();
  });

  it('Mutable unlocks every key', () => {
    expectTypeOf<Mutable<{ readonly a: string }>>().toEqualTypeOf<{ a: string }>();
  });

  it('really is readonly at the type level', () => {
    const locked: MyReadonly<{ a: string }> = { a: 'x' };
    // @ts-expect-error a is readonly
    locked.a = 'y';
  });
});

describe('P2 Pick / Omit', () => {
  it('MyPick keeps only the listed keys', () => {
    expectTypeOf<MyPick<Product, 'id' | 'name'>>().toEqualTypeOf<{ id: string; name: string }>();
  });

  it('MyOmit drops the listed keys', () => {
    expectTypeOf<MyOmit<Product, 'tags' | 'discontinued'>>().toEqualTypeOf<{
      id: string;
      name: string;
      price: number;
    }>();
  });

  it('rejects a key that is not in T', () => {
    // @ts-expect-error 'nope' is not a key of Product
    type Bad = MyPick<Product, 'nope'>;
    type _ = Bad;
  });
});

describe('P3 MyRecord', () => {
  it('builds an object from a key union', () => {
    expectTypeOf<MyRecord<'a' | 'b', number>>().toEqualTypeOf<{ a: number; b: number }>();
    expectTypeOf<MyRecord<string, number>>().toEqualTypeOf<Record<string, number>>();
  });
});

describe('P4 NullableFields', () => {
  it('adds null to every value', () => {
    expectTypeOf<NullableFields<{ a: string; b: number }>>().toEqualTypeOf<{
      a: string | null;
      b: number | null;
    }>();
  });
});

describe('P5 DeepPartial', () => {
  it('recurses into nested objects', () => {
    expectTypeOf<DeepPartial<{ a: { b: number; c: { d: string } } }>>().toEqualTypeOf<{
      a?: { b?: number; c?: { d?: string } };
    }>();
  });

  it('leaves arrays alone', () => {
    expectTypeOf<DeepPartial<{ list: string[] }>>().toEqualTypeOf<{ list?: string[] }>();
  });

  it('accepts a deeply incomplete object', () => {
    const draft: DeepPartial<Product & { meta: { source: string } }> = { meta: {} };
    void draft;
  });
});

describe('P6 Getters', () => {
  it('renames keys and wraps values in functions', () => {
    expectTypeOf<Getters<{ name: string; age: number }>>().toEqualTypeOf<{
      getName: () => string;
      getAge: () => number;
    }>();
  });
});

describe('P7 PickByType', () => {
  it('keeps only the keys whose value matches', () => {
    expectTypeOf<PickByType<Product, string>>().toEqualTypeOf<{ id: string; name: string }>();
    expectTypeOf<PickByType<Product, number>>().toEqualTypeOf<{ price: number }>();
    expectTypeOf<PickByType<Product, boolean>>().toEqualTypeOf<{ discontinued: boolean }>();
  });
});

describe('P8 OptionalKeys', () => {
  it('finds the optional keys', () => {
    expectTypeOf<OptionalKeys<Simple>>().toEqualTypeOf<'b'>();
    expectTypeOf<OptionalKeys<{ a: string }>>().toEqualTypeOf<never>();
    expectTypeOf<OptionalKeys<{ a?: string; b?: number }>>().toEqualTypeOf<'a' | 'b'>();
  });
});

describe('P9 Entries', () => {
  it('is a union of key/value tuples', () => {
    expectTypeOf<Entries<{ a: string; b: number }>>().toEqualTypeOf<
      ['a', string] | ['b', number]
    >();
  });
});

describe('P10 applyPatch', () => {
  it('returns the full entity type', () => {
    expectTypeOf(applyPatch(null as unknown as Product, { price: 1 })).toEqualTypeOf<Product>();
  });

  it('rejects a key that is not on the entity', () => {
    const product = null as unknown as Product;
    // @ts-expect-error 'colour' is not a Product field
    applyPatch(product, { colour: 'red' });
  });

  it('rejects the wrong value type', () => {
    const product = null as unknown as Product;
    // @ts-expect-error price is a number
    applyPatch(product, { price: 'cheap' });
  });
});

describe('P11 pickFields / omitFields', () => {
  it('narrows the result type', () => {
    const product = null as unknown as Product;
    expectTypeOf(pickFields(product, ['id', 'name'])).toEqualTypeOf<{
      id: string;
      name: string;
    }>();
    expectTypeOf(omitFields(product, ['tags', 'discontinued'])).toEqualTypeOf<{
      id: string;
      name: string;
      price: number;
    }>();
  });

  it('drops the omitted key from the result', () => {
    const product = null as unknown as Product;
    const partial = omitFields(product, ['price']);
    // @ts-expect-error price was omitted
    void partial.price;
  });

  it('rejects unknown keys', () => {
    const product = null as unknown as Product;
    // @ts-expect-error 'nope' is not a Product key
    pickFields(product, ['nope']);
  });
});

describe('P12 entriesOf', () => {
  it('keeps literal key types', () => {
    expectTypeOf(entriesOf({ a: 1, b: 'x' })).toEqualTypeOf<['a' | 'b', string | number][]>();
  });
});
