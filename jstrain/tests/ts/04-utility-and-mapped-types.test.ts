import { describe, expect, it } from 'vitest';
import {
  applyPatch,
  entriesOf,
  omitFields,
  pickFields,
  toDraft,
  type Product,
} from '@ex/ts/04-utility-and-mapped-types';

const product: Product = {
  id: 'p1',
  name: 'Desk',
  price: 249.5,
  tags: ['office', 'wood'],
  discontinued: false,
};

describe('P10 applyPatch', () => {
  it('applies changes without mutating', () => {
    const patched = applyPatch(product, { price: 199 });
    expect(patched.price).toBe(199);
    expect(patched.name).toBe('Desk');
    expect(product.price).toBe(249.5);
    expect(patched).not.toBe(product);
  });

  it('ignores undefined values in the patch', () => {
    expect(applyPatch(product, { name: undefined }).name).toBe('Desk');
  });

  it('honours falsy values', () => {
    expect(applyPatch(product, { price: 0 }).price).toBe(0);
    expect(applyPatch(product, { discontinued: true }).discontinued).toBe(true);
  });

  it('is a no-op for an empty patch', () => {
    expect(applyPatch(product, {})).toEqual(product);
  });
});

describe('P11 pickFields / omitFields', () => {
  it('picks', () => {
    expect(pickFields(product, ['id', 'name'])).toEqual({ id: 'p1', name: 'Desk' });
    expect(pickFields(product, [])).toEqual({});
  });

  it('omits', () => {
    expect(omitFields(product, ['tags', 'discontinued'])).toEqual({
      id: 'p1',
      name: 'Desk',
      price: 249.5,
    });
  });

  it('does not mutate', () => {
    pickFields(product, ['id']);
    omitFields(product, ['id']);
    expect(Object.keys(product)).toHaveLength(5);
  });
});

describe('P12 entriesOf', () => {
  it('returns key/value pairs', () => {
    expect(entriesOf({ a: 1, b: 2 })).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect(entriesOf({})).toEqual([]);
  });
});

describe('P13 toDraft', () => {
  it('stringifies every field', () => {
    expect(toDraft(product)).toEqual({
      id: 'p1',
      name: 'Desk',
      price: '249.5',
      tags: 'office, wood',
      discontinued: 'false',
    });
  });

  it('handles empty arrays and true booleans', () => {
    expect(toDraft({ ...product, tags: [], discontinued: true })).toMatchObject({
      tags: '',
      discontinued: 'true',
    });
  });
});
