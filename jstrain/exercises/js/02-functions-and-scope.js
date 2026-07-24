/**
 * MODULE JS-02 — Functions, scope and closures
 * =============================================
 *
 * A closure is just a function that remembers the variables that were in
 * scope where it was *defined* (not where it is called). Nearly every
 * JavaScript pattern you will meet — hooks, middleware, event handlers,
 * module privacy — is a closure wearing a costume.
 *
 * Vocabulary you need for this module:
 *   - `let`/`const` are block-scoped; `var` is function-scoped (and hoisted).
 *   - Arrow functions have no `this` of their own and cannot be `new`ed.
 *   - Rest params `(...args)` collect; spread `f(...args)` distributes.
 *
 * Run:  npx vitest run tests/js/02-functions-and-scope.test.js
 */

/**
 * PROBLEM 1 — Your first closure.
 *
 * Return an object with three functions that share one private `count`,
 * starting at `start` (default 0). There must be no way to reach the count
 * from outside except through these functions.
 *
 *   const c = makeCounter();
 *   c.increment();       // 1
 *   c.increment();       // 2
 *   c.decrement();       // 1
 *   c.value();           // 1
 *
 * `increment` and `decrement` return the NEW value.
 *
 * @param {number} [start=0]
 * @returns {{ increment: () => number, decrement: () => number, value: () => number }}
 */
export function makeCounter(start = 0) {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — once.
 *
 * Wrap `fn` so it runs at most one time. Every later call returns the first
 * result without calling `fn` again. Arguments of the first call are used.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @returns {F}
 */
export function once(fn) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — The classic `var` loop bug.
 *
 * This is broken on purpose:
 *
 *   function broken(n) {
 *     const out = [];
 *     for (var i = 0; i < n; i++) out.push(function () { return i; });
 *     return out;   // every function returns n, not 0..n-1
 *   }
 *
 * Write the fixed version: return an array of `n` functions where the
 * function at index i returns i. Then read the test — it explains why.
 *
 * @param {number} n
 * @returns {Array<() => number>}
 */
export function makeIndexReaders(n) {
  throw new Error('TODO');
}

/**
 * PROBLEM 4 — Partial application.
 *
 * Return a new function with the leading arguments pre-filled.
 *
 *   const add = (a, b, c) => a + b + c;
 *   const add5 = partial(add, 5);
 *   add5(2, 3); // 10
 *
 * @param {(...args: any[]) => any} fn
 * @param {...any} preset
 * @returns {(...args: any[]) => any}
 */
export function partial(fn, ...preset) {
  throw new Error('TODO');
}

/**
 * PROBLEM 5 — Currying to a fixed arity.
 *
 * Turn `fn` into a chain of one-or-more-argument calls that only runs the
 * original once it has collected `fn.length` arguments.
 *
 *   const add3 = curry((a, b, c) => a + b + c);
 *   add3(1)(2)(3);   // 6
 *   add3(1, 2)(3);   // 6
 *   add3(1)(2, 3);   // 6
 *   add3(1, 2, 3);   // 6
 *
 * Hint: `fn.length` is the declared parameter count.
 *
 * @param {(...args: any[]) => any} fn
 * @returns {(...args: any[]) => any}
 */
export function curry(fn) {
  throw new Error('TODO');
}

/**
 * PROBLEM 6 — Private state with validation.
 *
 * Return an account object. `balance` must be unreachable from outside.
 *   - deposit(amount) -> new balance; throws RangeError('amount must be positive')
 *     for amount <= 0 or non-finite amounts.
 *   - withdraw(amount) -> new balance; same validation, plus
 *     throws RangeError('insufficient funds') when amount > balance.
 *   - getBalance() -> current balance
 *   - history() -> a COPY of the entries, e.g.
 *       [{ type: 'deposit', amount: 50 }, { type: 'withdraw', amount: 20 }]
 *     Mutating the returned array must not affect the account.
 *
 * @param {number} [initial=0]
 * @returns {{
 *   deposit: (amount: number) => number,
 *   withdraw: (amount: number) => number,
 *   getBalance: () => number,
 *   history: () => Array<{ type: 'deposit' | 'withdraw', amount: number }>,
 * }}
 */
export function createAccount(initial = 0) {
  throw new Error('TODO');
}

/**
 * PROBLEM 7 — Default and destructured parameters.
 *
 * Accept an options object (which may be undefined) and return a fully
 * populated config. Defaults: { host: 'localhost', port: 8080, secure: false,
 * retries: 3 }. Callers may pass any subset. A caller passing `port: 0` or
 * `secure: false` must win over the default — but a caller passing
 * `undefined` for a key must NOT.
 *
 * Do this with destructuring defaults in the parameter list, not with `if`s.
 *
 * @param {{ host?: string, port?: number, secure?: boolean, retries?: number }} [options]
 * @returns {{ host: string, port: number, secure: boolean, retries: number }}
 */
export function buildConfig(options) {
  throw new Error('TODO');
}

/**
 * PROBLEM 8 — Rest parameters and `arguments`-free code.
 *
 * Sum every number passed in, ignoring anything that is not a finite number.
 *
 *   sumFinite(1, 2, 3)            -> 6
 *   sumFinite(1, 'x', null, 2)    -> 3
 *   sumFinite()                   -> 0
 *
 * @param {...unknown} values
 * @returns {number}
 */
export function sumFinite(...values) {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — Call limiting.
 *
 * Return a wrapper that calls `fn` for the first `limit` invocations and then
 * silently returns `undefined` forever. Also expose `wrapper.callsLeft`
 * as a live number (a getter or an updated property — the test reads it
 * after each call).
 *
 * @param {(...args: any[]) => any} fn
 * @param {number} limit
 * @returns {((...args: any[]) => any) & { callsLeft: number }}
 */
export function limitCalls(fn, limit) {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — Recursion with an accumulator.
 *
 * Flatten a nested array using recursion only (no Array.prototype.flat,
 * no .flatMap). Depth is unlimited.
 *
 *   flattenRecursive([1, [2, [3, [4]]], 5]) -> [1, 2, 3, 4, 5]
 *
 * @param {unknown[]} values
 * @returns {unknown[]}
 */
export function flattenRecursive(values) {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 — Function factories.
 *
 * Build a validator from a list of rules. Each rule is
 * `{ message: string, test: (value: unknown) => boolean }`.
 * The returned function takes a value and returns the array of messages for
 * every rule whose `test` returned false, in rule order. All rules run.
 *
 * @param {Array<{ message: string, test: (value: unknown) => boolean }>} rules
 * @returns {(value: unknown) => string[]}
 */
export function createValidator(rules) {
  throw new Error('TODO');
}

/**
 * PROBLEM 12 — Scope quiz, in code.
 *
 * Fill in what these three snippets evaluate to. Return the literal values;
 * do not run the snippets. Getting this right means you understand hoisting.
 *
 *   a) function f() { return typeof x; var x = 1; }            // f()
 *   b) function g() { try { return y; } catch (e) { return e.constructor.name; } let y = 1; }
 *   c) const h = () => { let n = 1; { let n = 2; } return n; }  // h()
 *
 * Return { a, b, c } where a and b are strings and c is a number.
 *
 * @returns {{ a: string, b: string, c: number }}
 */
export function hoistingQuiz() {
  throw new Error('TODO');
}
