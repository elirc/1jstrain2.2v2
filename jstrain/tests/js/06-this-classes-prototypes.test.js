import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Circle,
  classify,
  describeKeys,
  detach,
  detachBroken,
  EventEmitter,
  makePerson,
  mixin,
  myBind,
  objectWithProto,
  Query,
  Rectangle,
  Shape,
  Stack,
  Temperature,
  User,
} from '@ex/js/06-this-classes-prototypes.js';

describe('P1 losing `this`', () => {
  it('works through the object (rule 3)', () => {
    const person = makePerson('Ada');
    expect(person.getName()).toBe('Ada');
  });

  it('detach keeps working when called bare', () => {
    const bare = detach(makePerson('Ada'));
    expect(bare()).toBe('Ada');
  });

  it('detachBroken loses `this` and throws', () => {
    const bare = detachBroken(makePerson('Ada'));
    expect(() => bare()).toThrow(TypeError);
  });

  it('detachBroken is fine again once you supply a receiver', () => {
    const person = makePerson('Ada');
    const bare = detachBroken(person);
    expect(bare.call(person)).toBe('Ada');
    expect(bare.call({ name: 'Grace' })).toBe('Grace');
  });
});

describe('P2 myBind', () => {
  it('binds `this`', () => {
    function greet() {
      return `hi ${this.name}`;
    }
    expect(myBind(greet, { name: 'Ada' })()).toBe('hi Ada');
  });

  it('prepends preset arguments', () => {
    function join(a, b, c) {
      return [this.sep, a, b, c].join('');
    }
    const bound = myBind(join, { sep: '-' }, 1, 2);
    expect(bound(3)).toBe('-123');
  });

  it('does not use Function.prototype.bind', () => {
    expect(myBind.toString()).not.toMatch(/\.bind\s*\(/);
  });
});

describe('P3 Stack', () => {
  it('pushes, pops and peeks', () => {
    const s = new Stack();
    expect(s.isEmpty).toBe(true);
    expect(s.push('a')).toBe(1);
    expect(s.push('b')).toBe(2);
    expect(s.peek()).toBe('b');
    expect(s.size).toBe(2);
    expect(s.pop()).toBe('b');
    expect(s.pop()).toBe('a');
    expect(s.pop()).toBe(undefined);
    expect(s.isEmpty).toBe(true);
  });

  it('exposes size and isEmpty as getters, not methods', () => {
    const s = new Stack();
    expect(typeof s.size).toBe('number');
    expect(typeof s.isEmpty).toBe('boolean');
  });

  it('builds from an iterable', () => {
    const s = Stack.from([1, 2, 3]);
    expect(s.toArray()).toEqual([1, 2, 3]);
    expect(s.peek()).toBe(3);
  });

  it('iterates from the top down', () => {
    expect([...Stack.from(['a', 'b', 'c'])]).toEqual(['c', 'b', 'a']);
  });

  it('toArray returns a copy', () => {
    const s = Stack.from([1]);
    s.toArray().push(999);
    expect(s.size).toBe(1);
  });

  it('really keeps #items private', () => {
    const s = Stack.from([1]);
    expect(Object.keys(s)).toEqual([]);
    expect(JSON.stringify(s)).toBe('{}');
  });
});

describe('P4 EventEmitter', () => {
  it('calls handlers in registration order and counts them', () => {
    const emitter = new EventEmitter();
    const calls = [];
    emitter.on('tick', () => calls.push('first'));
    emitter.on('tick', () => calls.push('second'));
    expect(emitter.emit('tick')).toBe(2);
    expect(calls).toEqual(['first', 'second']);
  });

  it('passes arguments through', () => {
    const emitter = new EventEmitter();
    const spy = vi.fn();
    emitter.on('msg', spy);
    emitter.emit('msg', 1, 'two');
    expect(spy).toHaveBeenCalledWith(1, 'two');
  });

  it('returns 0 for an event with no listeners', () => {
    expect(new EventEmitter().emit('nothing')).toBe(0);
  });

  it('unsubscribes via the returned function', () => {
    const emitter = new EventEmitter();
    const spy = vi.fn();
    const off = emitter.on('x', spy);
    off();
    emitter.emit('x');
    expect(spy).not.toHaveBeenCalled();
    expect(emitter.listenerCount('x')).toBe(0);
  });

  it('unsubscribes via off()', () => {
    const emitter = new EventEmitter();
    const spy = vi.fn();
    emitter.on('x', spy);
    emitter.off('x', spy);
    emitter.emit('x');
    expect(spy).not.toHaveBeenCalled();
  });

  it('once fires at most once', () => {
    const emitter = new EventEmitter();
    const spy = vi.fn();
    emitter.once('boot', spy);
    emitter.emit('boot', 'a');
    emitter.emit('boot', 'b');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('a');
    expect(emitter.listenerCount('boot')).toBe(0);
  });

  it('keeps going when a handler throws', () => {
    const emitter = new EventEmitter();
    const after = vi.fn();
    emitter.on('x', () => {
      throw new Error('boom');
    });
    emitter.on('x', after);
    expect(() => emitter.emit('x')).not.toThrow();
    expect(after).toHaveBeenCalled();
  });

  it('does not skip a handler when one unsubscribes during emit', () => {
    const emitter = new EventEmitter();
    const third = vi.fn();
    const second = vi.fn();
    const first = () => emitter.off('x', second);
    emitter.on('x', first);
    emitter.on('x', second);
    emitter.on('x', third);
    emitter.emit('x');
    expect(third).toHaveBeenCalled();
  });

  it('keeps events separate', () => {
    const emitter = new EventEmitter();
    const a = vi.fn();
    emitter.on('a', a);
    emitter.emit('b');
    expect(a).not.toHaveBeenCalled();
    expect(emitter.listenerCount('a')).toBe(1);
  });
});

describe('P5 Temperature', () => {
  it('converts both ways', () => {
    expect(new Temperature(100).fahrenheit).toBe(212);
    expect(new Temperature(0).fahrenheit).toBe(32);
    expect(new Temperature(-40).fahrenheit).toBe(-40);
  });

  it('stays in sync when either side is set', () => {
    const t = new Temperature(0);
    t.fahrenheit = 212;
    expect(t.celsius).toBeCloseTo(100, 10);
    t.celsius = 25;
    expect(t.fahrenheit).toBe(77);
  });

  it('rejects impossible temperatures', () => {
    expect(() => new Temperature(-300)).toThrow(RangeError);
    const t = new Temperature(0);
    expect(() => {
      t.celsius = -274;
    }).toThrow('below absolute zero');
    expect(() => {
      t.fahrenheit = -500;
    }).toThrow(RangeError);
    expect(t.celsius).toBe(0);
  });

  it('formats itself', () => {
    expect(String(new Temperature(21.5))).toBe('21.5°C');
    expect(`${new Temperature(0)}`).toBe('0°C');
  });
});

describe('P6 Shape / Circle / Rectangle', () => {
  it('cannot be constructed directly', () => {
    expect(() => new Shape()).toThrow(TypeError);
    expect(() => new Shape()).toThrow('Shape is abstract');
  });

  it('computes areas', () => {
    expect(new Circle(1).area()).toBeCloseTo(Math.PI, 10);
    expect(new Rectangle(3, 4).area()).toBe(12);
  });

  it('describes itself polymorphically', () => {
    expect(new Circle(2).describe()).toBe('circle with area 12.57');
    expect(new Rectangle(3, 4).describe()).toBe('rectangle with area 12.00');
  });

  it('exposes isSquare on rectangles', () => {
    expect(new Rectangle(2, 2).isSquare).toBe(true);
    expect(new Rectangle(2, 3).isSquare).toBe(false);
  });

  it('keeps the instanceof chain', () => {
    const c = new Circle(1);
    expect(c).toBeInstanceOf(Circle);
    expect(c).toBeInstanceOf(Shape);
    expect(c).not.toBeInstanceOf(Rectangle);
  });

  it('throws from the base area() if a subclass forgets to override it', () => {
    class Triangle extends Shape {}
    expect(() => new Triangle().area()).toThrow('not implemented');
  });
});

describe('P7 User', () => {
  /** @type {User} */
  let ada;
  beforeEach(() => {
    ada = new User({
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });
  });

  it('builds a full name', () => {
    expect(ada.fullName).toBe('Ada Lovelace');
  });

  it('serialises to a plain object', () => {
    expect(ada.toJSON()).toEqual({
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });
    expect(ada.toJSON()).not.toBeInstanceOf(User);
  });

  it('is used automatically by JSON.stringify', () => {
    expect(JSON.parse(JSON.stringify(ada))).toEqual(ada.toJSON());
    expect(JSON.stringify(ada)).not.toContain('fullName');
  });

  it('builds from snake_case API data', () => {
    const user = User.fromApi({
      id: 7,
      first_name: 'Grace',
      last_name: 'Hopper',
      email_address: 'grace@navy.mil',
    });
    expect(user).toBeInstanceOf(User);
    expect(user.fullName).toBe('Grace Hopper');
    expect(user.email).toBe('grace@navy.mil');
  });

  it('sorts by last name then first name', () => {
    const users = [
      new User({ id: 1, firstName: 'Zoe', lastName: 'Adams', email: '' }),
      new User({ id: 2, firstName: 'Ann', lastName: 'adams', email: '' }),
      new User({ id: 3, firstName: 'Bob', lastName: 'Baker', email: '' }),
    ];
    expect([...users].sort(User.compareByName).map((u) => u.id)).toEqual([2, 1, 3]);
  });
});

describe('P8 objectWithProto', () => {
  it('sets the prototype and own props', () => {
    const proto = {
      greet() {
        return `hi ${this.name}`;
      },
    };
    const obj = objectWithProto(proto, { name: 'Ada' });
    expect(obj.greet()).toBe('hi Ada');
    expect(Object.getPrototypeOf(obj)).toBe(proto);
    expect(Object.hasOwn(obj, 'name')).toBe(true);
    expect(Object.hasOwn(obj, 'greet')).toBe(false);
  });

  it('supports a null prototype', () => {
    const bare = objectWithProto(null, { a: 1 });
    expect(Object.getPrototypeOf(bare)).toBe(null);
    expect(bare.toString).toBe(undefined);
  });
});

describe('P9 describeKeys', () => {
  it('separates own from inherited keys', () => {
    const grandparent = { fromGrandparent: 1 };
    const parent = Object.create(grandparent);
    parent.fromParent = 2;
    const child = Object.create(parent);
    child.b = 3;
    child.a = 4;

    expect(describeKeys(child)).toEqual({
      own: ['b', 'a'],
      inherited: ['fromParent', 'fromGrandparent'],
    });
  });

  it('ignores Object.prototype', () => {
    expect(describeKeys({ a: 1 })).toEqual({ own: ['a'], inherited: [] });
  });

  it('does not list a shadowed key twice', () => {
    const parent = { shared: 1 };
    const child = Object.create(parent);
    child.shared = 2;
    expect(describeKeys(child)).toEqual({ own: ['shared'], inherited: [] });
  });
});

describe('P10 mixin', () => {
  it('copies properties onto the target and returns it', () => {
    const target = { a: 1 };
    const result = mixin(target, { b: 2 }, { c: 3 });
    expect(result).toBe(target);
    expect(target).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('lets later sources win', () => {
    expect(mixin({}, { a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  it('copies getters without invoking them', () => {
    const calls = vi.fn(() => 'computed');
    const source = {
      get value() {
        return calls();
      },
    };
    const target = mixin({}, source);
    expect(calls).not.toHaveBeenCalled(); // Object.assign would have called it
    expect(target.value).toBe('computed');
    expect(calls).toHaveBeenCalledTimes(1);
  });
});

describe('P11 Query', () => {
  it('builds a full query', () => {
    const sql = new Query('users')
      .where('age', '>', 18)
      .where('active', '=', true)
      .orderBy('name')
      .limit(10)
      .toSQL();
    expect(sql).toBe(
      'SELECT * FROM users WHERE age > 18 AND active = true ORDER BY name ASC LIMIT 10',
    );
  });

  it('defaults to SELECT *', () => {
    expect(new Query('t').toSQL()).toBe('SELECT * FROM t');
  });

  it('selects columns', () => {
    expect(new Query('t').select('a', 'b').toSQL()).toBe('SELECT a, b FROM t');
  });

  it('quotes string values', () => {
    expect(new Query('t').where('name', '=', 'ada').toSQL()).toBe(
      "SELECT * FROM t WHERE name = 'ada'",
    );
  });

  it('supports descending order', () => {
    expect(new Query('t').orderBy('x', 'desc').toSQL()).toBe('SELECT * FROM t ORDER BY x DESC');
  });

  it('returns `this` from every builder method', () => {
    const q = new Query('t');
    expect(q.where('a', '=', 1)).toBe(q);
    expect(q.select('a')).toBe(q);
    expect(q.orderBy('a')).toBe(q);
    expect(q.limit(1)).toBe(q);
  });
});

describe('P12 classify', () => {
  it('recognises a Stack before anything else', () => {
    expect(classify(Stack.from([1]))).toBe('stack');
  });

  it.each([
    [[1, 2], 'iterable'],
    [new Set([1]), 'iterable'],
    [new Map(), 'iterable'],
    [Promise.resolve(1), 'thenable'],
    [{ then: () => {} }, 'thenable'],
    [new Error('x'), 'error'],
    [new TypeError('x'), 'error'],
    ['a string', 'other'],
    [42, 'other'],
    [null, 'other'],
    [undefined, 'other'],
    [{}, 'other'],
  ])('classify(%o) === %s', (value, expected) => {
    expect(classify(value)).toBe(expected);
  });
});
