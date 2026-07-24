/**
 * MODULE JS-06 — `this`, classes and prototypes
 * ==============================================
 *
 * `this` is not the object a function lives on. It is decided at CALL TIME by
 * four rules, checked in this order:
 *
 *   1. new Foo()          -> `this` is the brand-new object
 *   2. fn.call(x) / .apply / .bind(x)  -> `this` is x
 *   3. obj.method()       -> `this` is obj  ("the thing before the dot")
 *   4. anything else      -> undefined in strict mode / modules
 *
 * Arrow functions ignore all four: they capture `this` from the enclosing
 * scope, which is exactly why class fields like `handleClick = () => {}` work.
 *
 * Run:  npx vitest run tests/js/06-this-classes-prototypes.test.js
 */

/**
 * PROBLEM 1 — Feel rule 3 break.
 *
 * `getName` is written for you. Implement `detach` so that it returns a
 * function which STILL reports the right name when called bare, and
 * `detachBroken` so that it demonstrates the bug (calling it must throw
 * a TypeError because `this` is undefined).
 *
 * Do not change `makePerson`.
 */
export function makePerson(name) {
  return {
    name,
    getName() {
      return this.name;
    },
  };
}

/**
 * Return a callable that always resolves to `person.getName()`.
 * @param {{ name: string, getName: () => string }} person
 * @returns {() => string}
 */
export function detach(person) {
  throw new Error('TODO');
}

/**
 * Return `person.getName` with no binding at all — the broken version.
 * @param {{ name: string, getName: () => string }} person
 * @returns {() => string}
 */
export function detachBroken(person) {
  throw new Error('TODO');
}

/**
 * PROBLEM 2 — Implement `bind` yourself.
 *
 * Return a new function that, when called, invokes `fn` with `thisArg` as
 * `this` and `preset` arguments prepended. Do NOT call Function.prototype.bind.
 *
 * @param {Function} fn
 * @param {unknown} thisArg
 * @param {...unknown} preset
 * @returns {Function}
 */
export function myBind(fn, thisArg, ...preset) {
  throw new Error('TODO');
}

/**
 * PROBLEM 3 — A class with private state.
 *
 * `#items` is a real private field: it is unreachable from outside, unlike a
 * `_items` naming convention.
 *
 * Implement Stack with:
 *   push(item)  -> the new size
 *   pop()       -> the item, or undefined when empty
 *   peek()      -> the top item without removing it
 *   get size    -> a getter, not a method
 *   get isEmpty -> a getter
 *   toArray()   -> bottom-to-top copy
 *   static from(iterable) -> a new Stack with those items pushed in order
 *
 * The class must be iterable top-to-bottom with `for...of` and `[...stack]`.
 */
export class Stack {
  // TODO: declare #items and implement everything above.
  constructor() {
    throw new Error('TODO');
  }
}

/**
 * PROBLEM 4 — An EventEmitter (the pattern behind every listener API).
 *
 *   on(event, handler)    -> an unsubscribe function
 *   once(event, handler)  -> fires at most once, also returns an unsubscribe
 *   off(event, handler)   -> removes that exact handler
 *   emit(event, ...args)  -> number of handlers called
 *   listenerCount(event)
 *
 * Handlers for the same event fire in registration order. A handler that
 * throws must not stop the others (collect nothing — just keep going).
 * Removing a handler during an emit must not skip the next handler.
 */
export class EventEmitter {
  constructor() {
    throw new Error('TODO');
  }
}

/**
 * PROBLEM 5 — Getters, setters and validation.
 *
 * Implement Temperature so that celsius and fahrenheit stay in sync:
 *   new Temperature(100).fahrenheit === 212
 *   t.fahrenheit = 32  ->  t.celsius === 0
 *
 * Store ONE value internally. Setting either property below absolute zero
 * (-273.15 C) throws a RangeError('below absolute zero').
 * `toString()` returns e.g. '21.5°C'.
 */
export class Temperature {
  constructor(celsius = 0) {
    throw new Error('TODO');
  }
}

/**
 * PROBLEM 6 — Inheritance and polymorphism.
 *
 * `Shape` is an abstract base:
 *   - `new Shape()` directly must throw a TypeError('Shape is abstract')
 *   - `area()` in the base throws an Error('not implemented')
 *   - `describe()` returns `${this.name} with area ${this.area().toFixed(2)}`
 *   - `name` is a getter returning the constructor name in lowercase
 *
 * Then implement Circle(radius) and Rectangle(width, height) with real
 * `area()` methods. Rectangle must also expose `isSquare` as a getter.
 *
 * Hint for the abstract check: `new.target === Shape`.
 */
export class Shape {
  constructor() {
    throw new Error('TODO');
  }
}

export class Circle extends Shape {
  constructor(radius) {
    super();
    throw new Error('TODO');
  }
}

export class Rectangle extends Shape {
  constructor(width, height) {
    super();
    throw new Error('TODO');
  }
}

/**
 * PROBLEM 7 — Static factories and serialisation.
 *
 * Implement `User` with:
 *   constructor({ id, firstName, lastName, email })
 *   get fullName        -> 'First Last'
 *   toJSON()            -> { id, firstName, lastName, email } (plain object)
 *   static fromApi(row) -> builds a User from snake_case API data
 *                          { id, first_name, last_name, email_address }
 *   static compareByName(a, b) -> comparator for Array.prototype.sort,
 *                          by lastName then firstName, case-insensitive
 *
 * `JSON.stringify(user)` must produce the toJSON() shape — that happens for
 * free once toJSON exists. Find out why in the test.
 */
export class User {
  constructor(fields) {
    throw new Error('TODO');
  }
}

/**
 * PROBLEM 8 — Prototypes without classes.
 *
 * `class` is syntax sugar over prototypes. Build the same thing by hand:
 * return an object whose PROTOTYPE is `proto` and whose own properties are
 * `ownProps`. Use Object.create.
 *
 * @param {object | null} proto
 * @param {Record<string, unknown>} ownProps
 * @returns {object}
 */
export function objectWithProto(proto, ownProps) {
  throw new Error('TODO');
}

/**
 * PROBLEM 9 — Own vs inherited properties.
 *
 * Return `{ own: string[], inherited: string[] }` for the enumerable string
 * keys reachable from `obj`: `own` in insertion order, `inherited` in
 * prototype-chain order, excluding anything from Object.prototype.
 *
 * @param {object} obj
 * @returns {{ own: string[], inherited: string[] }}
 */
export function describeKeys(obj) {
  throw new Error('TODO');
}

/**
 * PROBLEM 10 — Mixins.
 *
 * Copy every own enumerable property (including getters, without invoking
 * them) from each source onto `target`, and return `target`.
 *
 * Hint: a plain `{...src}` or Object.assign RUNS getters. Use
 * Object.getOwnPropertyDescriptors + Object.defineProperties instead.
 *
 * @param {object} target
 * @param {...object} sources
 * @returns {object}
 */
export function mixin(target, ...sources) {
  throw new Error('TODO');
}

/**
 * PROBLEM 11 — Method chaining (the builder pattern).
 *
 * Implement a tiny query builder whose methods return `this`:
 *
 *   new Query('users').where('age', '>', 18).where('active', '=', true)
 *     .orderBy('name').limit(10).toSQL()
 *   // 'SELECT * FROM users WHERE age > 18 AND active = true ORDER BY name ASC LIMIT 10'
 *
 *   new Query('t').select('a', 'b').toSQL()   // 'SELECT a, b FROM t'
 *   new Query('t').orderBy('x', 'desc').toSQL() // 'SELECT * FROM t ORDER BY x DESC'
 *
 * String values are single-quoted in the SQL; numbers and booleans are not.
 */
export class Query {
  constructor(table) {
    throw new Error('TODO');
  }
}

/**
 * PROBLEM 12 — instanceof and duck typing.
 *
 * Return a string describing what `value` is, using the FIRST rule that fits:
 *   'stack'    - an instance of the Stack class above
 *   'iterable' - has a Symbol.iterator function (but is not a string)
 *   'thenable' - has a `then` method
 *   'error'    - an instance of Error (including subclasses)
 *   'other'
 *
 * @param {unknown} value
 * @returns {'stack' | 'iterable' | 'thenable' | 'error' | 'other'}
 */
export function classify(value) {
  throw new Error('TODO');
}
