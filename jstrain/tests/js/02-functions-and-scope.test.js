import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildConfig,
  createAccount,
  createValidator,
  curry,
  flattenRecursive,
  hoistingQuiz,
  limitCalls,
  makeCounter,
  makeIndexReaders,
  once,
  partial,
  sumFinite,
} from '@ex/js/02-functions-and-scope.js';

describe('P1 makeCounter', () => {
  it('counts up and down', () => {
    const c = makeCounter();
    expect(c.value()).toBe(0);
    expect(c.increment()).toBe(1);
    expect(c.increment()).toBe(2);
    expect(c.decrement()).toBe(1);
    expect(c.value()).toBe(1);
  });

  it('honours a starting value', () => {
    const c = makeCounter(10);
    expect(c.value()).toBe(10);
    expect(c.decrement()).toBe(9);
  });

  it('gives each counter its own private state', () => {
    const a = makeCounter();
    const b = makeCounter();
    a.increment();
    a.increment();
    expect(a.value()).toBe(2);
    expect(b.value()).toBe(0);
  });

  it('does not expose the count as a property', () => {
    const c = makeCounter(5);
    expect(Object.values(c).some((v) => typeof v === 'number')).toBe(false);
  });
});

describe('P2 once', () => {
  it('runs the wrapped function exactly once', () => {
    const spy = vi.fn((n) => n * 2);
    const wrapped = once(spy);
    expect(wrapped(4)).toBe(8);
    expect(wrapped(100)).toBe(8);
    expect(wrapped(100)).toBe(8);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('remembers an undefined result without re-running', () => {
    const spy = vi.fn(() => undefined);
    const wrapped = once(spy);
    wrapped();
    wrapped();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('P3 makeIndexReaders', () => {
  it('each function reports its own index', () => {
    const readers = makeIndexReaders(3);
    expect(readers).toHaveLength(3);
    expect(readers.map((f) => f())).toEqual([0, 1, 2]);
  });

  it('handles zero', () => {
    expect(makeIndexReaders(0)).toEqual([]);
  });

  it('demonstrates the bug it fixes', () => {
    // What `var` does: one shared binding, so all three closures see the end value.
    const broken = [];
    for (var i = 0; i < 3; i++) broken.push(() => i);
    expect(broken.map((f) => f())).toEqual([3, 3, 3]);
    // Your version must not behave like that.
    expect(makeIndexReaders(3).map((f) => f())).not.toEqual([3, 3, 3]);
  });
});

describe('P4 partial', () => {
  it('pre-fills leading arguments', () => {
    const add = (a, b, c) => a + b + c;
    expect(partial(add, 5)(2, 3)).toBe(10);
    expect(partial(add, 5, 2)(3)).toBe(10);
    expect(partial(add)(1, 2, 3)).toBe(6);
  });

  it('is reusable', () => {
    const greet = (greeting, name) => `${greeting}, ${name}!`;
    const hello = partial(greet, 'Hello');
    expect(hello('Ada')).toBe('Hello, Ada!');
    expect(hello('Grace')).toBe('Hello, Grace!');
  });
});

describe('P5 curry', () => {
  /** @type {(...args: any[]) => any} */
  let add3;
  beforeEach(() => {
    add3 = curry((a, b, c) => a + b + c);
  });

  it('accepts arguments one at a time', () => {
    expect(add3(1)(2)(3)).toBe(6);
  });

  it('accepts any grouping', () => {
    expect(add3(1, 2)(3)).toBe(6);
    expect(add3(1)(2, 3)).toBe(6);
    expect(add3(1, 2, 3)).toBe(6);
  });

  it('produces independent partial chains', () => {
    const addTo1 = add3(1);
    expect(addTo1(2, 3)).toBe(6);
    expect(addTo1(10, 20)).toBe(31);
  });

  it('works for arity 2', () => {
    const join = curry((a, b) => `${a}-${b}`);
    expect(join('x')('y')).toBe('x-y');
    expect(join('x', 'y')).toBe('x-y');
  });
});

describe('P6 createAccount', () => {
  it('tracks deposits and withdrawals', () => {
    const acct = createAccount(100);
    expect(acct.getBalance()).toBe(100);
    expect(acct.deposit(50)).toBe(150);
    expect(acct.withdraw(20)).toBe(130);
  });

  it('validates amounts', () => {
    const acct = createAccount(100);
    expect(() => acct.deposit(0)).toThrow(RangeError);
    expect(() => acct.deposit(-1)).toThrow('amount must be positive');
    expect(() => acct.withdraw(NaN)).toThrow('amount must be positive');
    expect(() => acct.withdraw(1000)).toThrow('insufficient funds');
    expect(acct.getBalance()).toBe(100); // nothing was applied
  });

  it('records history and returns a defensive copy', () => {
    const acct = createAccount();
    acct.deposit(10);
    acct.deposit(5);
    acct.withdraw(3);
    expect(acct.history()).toEqual([
      { type: 'deposit', amount: 10 },
      { type: 'deposit', amount: 5 },
      { type: 'withdraw', amount: 3 },
    ]);

    const stolen = acct.history();
    stolen.push({ type: 'deposit', amount: 1_000_000 });
    stolen[0].amount = 999;
    expect(acct.history()).toHaveLength(3);
    expect(acct.history()[0].amount).toBe(10);
  });

  it('keeps the balance private', () => {
    const acct = createAccount(42);
    expect(Object.values(acct).some((v) => v === 42)).toBe(false);
  });
});

describe('P7 buildConfig', () => {
  it('applies all defaults', () => {
    expect(buildConfig()).toEqual({
      host: 'localhost',
      port: 8080,
      secure: false,
      retries: 3,
    });
  });

  it('merges a partial override', () => {
    expect(buildConfig({ host: 'api.example.com', secure: true })).toEqual({
      host: 'api.example.com',
      port: 8080,
      secure: true,
      retries: 3,
    });
  });

  it('respects falsy overrides', () => {
    expect(buildConfig({ port: 0, retries: 0 })).toMatchObject({ port: 0, retries: 0 });
  });

  it('treats an explicit undefined as "not provided"', () => {
    expect(buildConfig({ port: undefined })).toMatchObject({ port: 8080 });
  });
});

describe('P8 sumFinite', () => {
  it.each([
    [[1, 2, 3], 6],
    [[], 0],
    [[1, 'x', null, 2], 3],
    [[NaN, Infinity, 5], 5],
    [[-1, 1], 0],
    [['3', 3], 3],
    [[true, 1], 1],
  ])('sumFinite(...%j) === %i', (args, expected) => {
    expect(sumFinite(...args)).toBe(expected);
  });
});

describe('P9 limitCalls', () => {
  it('stops calling through after the limit', () => {
    const spy = vi.fn((n) => n + 1);
    const limited = limitCalls(spy, 2);
    expect(limited(1)).toBe(2);
    expect(limited(2)).toBe(3);
    expect(limited(3)).toBe(undefined);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('reports remaining calls', () => {
    const limited = limitCalls(() => 'ok', 3);
    expect(limited.callsLeft).toBe(3);
    limited();
    expect(limited.callsLeft).toBe(2);
    limited();
    limited();
    expect(limited.callsLeft).toBe(0);
    limited();
    expect(limited.callsLeft).toBe(0);
  });
});

describe('P10 flattenRecursive', () => {
  it.each([
    [[1, [2, [3, [4]]], 5], [1, 2, 3, 4, 5]],
    [[], []],
    [[[], [[]], [[[]]]], []],
    [[1, 2, 3], [1, 2, 3]],
    [['a', ['b', ['c']]], ['a', 'b', 'c']],
  ])('flattenRecursive(%j) -> %j', (input, expected) => {
    expect(flattenRecursive(input)).toEqual(expected);
  });

  it('does not use Array.prototype.flat', () => {
    expect(flattenRecursive.toString()).not.toMatch(/\.flat\b|\.flatMap\b/);
  });

  it('survives deep nesting', () => {
    let nested = [0];
    for (let i = 1; i < 200; i++) nested = [i, nested];
    expect(flattenRecursive(nested)).toHaveLength(200);
  });
});

describe('P11 createValidator', () => {
  /** @type {(value: unknown) => string[]} */
  let validate;
  beforeEach(() => {
    validate = createValidator([
      { message: 'must be a string', test: (v) => typeof v === 'string' },
      { message: 'must be at least 3 characters', test: (v) => String(v).length >= 3 },
      { message: 'must be lowercase', test: (v) => String(v) === String(v).toLowerCase() },
    ]);
  });

  it('returns an empty array when everything passes', () => {
    expect(validate('abc')).toEqual([]);
  });

  it('collects every failure in rule order', () => {
    expect(validate('AB')).toEqual(['must be at least 3 characters', 'must be lowercase']);
    expect(validate(1)).toEqual(['must be a string', 'must be at least 3 characters']);
  });

  it('runs all rules even after the first failure', () => {
    const first = vi.fn(() => false);
    const second = vi.fn(() => false);
    const v = createValidator([
      { message: 'a', test: first },
      { message: 'b', test: second },
    ]);
    expect(v('x')).toEqual(['a', 'b']);
    expect(second).toHaveBeenCalled();
  });
});

describe('P12 hoistingQuiz', () => {
  it('matches what JavaScript actually does', () => {
    function a() {
      return typeof x;
      // eslint-disable-next-line no-var, no-unreachable
      var x = 1;
    }
    function b() {
      try {
        return y;
      } catch (e) {
        return e.constructor.name;
      }
      // eslint-disable-next-line no-unreachable
      let y = 1;
    }
    const c = () => {
      let n = 1;
      {
        // eslint-disable-next-line no-unused-vars
        let n = 2;
      }
      return n;
    };

    const answers = hoistingQuiz();
    expect(answers.a).toBe(a());
    expect(answers.b).toBe(b());
    expect(answers.c).toBe(c());
  });

  it('has the shape the docblock asked for', () => {
    const answers = hoistingQuiz();
    expect(typeof answers.a).toBe('string');
    expect(typeof answers.b).toBe('string');
    expect(typeof answers.c).toBe('number');
  });
});
