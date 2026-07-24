/** Reference solutions for MODULE JS-02. */

export function makeCounter(start = 0) {
  let count = start;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}

export function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}

export function makeIndexReaders(n) {
  const out = [];
  // `let` creates a fresh binding per iteration, so each closure keeps its own i.
  for (let i = 0; i < n; i++) {
    out.push(() => i);
  }
  return out;
}

export function partial(fn, ...preset) {
  return (...later) => fn(...preset, ...later);
}

export function curry(fn) {
  return function collect(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...more) => collect(...args, ...more);
  };
}

export function createAccount(initial = 0) {
  let balance = initial;
  const entries = [];

  const assertAmount = (amount) => {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new RangeError('amount must be positive');
    }
  };

  return {
    deposit(amount) {
      assertAmount(amount);
      balance += amount;
      entries.push({ type: 'deposit', amount });
      return balance;
    },
    withdraw(amount) {
      assertAmount(amount);
      if (amount > balance) throw new RangeError('insufficient funds');
      balance -= amount;
      entries.push({ type: 'withdraw', amount });
      return balance;
    },
    getBalance: () => balance,
    history: () => entries.map((entry) => ({ ...entry })),
  };
}

export function buildConfig({
  host = 'localhost',
  port = 8080,
  secure = false,
  retries = 3,
} = {}) {
  return { host, port, secure, retries };
}

export function sumFinite(...values) {
  return values.reduce(
    (total, value) =>
      typeof value === 'number' && Number.isFinite(value) ? total + value : total,
    0,
  );
}

export function limitCalls(fn, limit) {
  let used = 0;
  const wrapper = (...args) => {
    if (used >= limit) return undefined;
    used += 1;
    return fn(...args);
  };
  Object.defineProperty(wrapper, 'callsLeft', {
    get: () => Math.max(0, limit - used),
  });
  return wrapper;
}

export function flattenRecursive(values) {
  const out = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      out.push(...flattenRecursive(value));
    } else {
      out.push(value);
    }
  }
  return out;
}

export function createValidator(rules) {
  return (value) => rules.filter((rule) => !rule.test(value)).map((rule) => rule.message);
}

export function hoistingQuiz() {
  return {
    // `var x` is hoisted and initialised to undefined, so typeof x is 'undefined'.
    a: 'undefined',
    // `let y` is hoisted but in the temporal dead zone -> ReferenceError.
    b: 'ReferenceError',
    // The inner `let n = 2` lives in its own block; the outer n is untouched.
    c: 1,
  };
}
