/** Reference solutions for MODULE JS-06. */

export function makePerson(name) {
  return {
    name,
    getName() {
      return this.name;
    },
  };
}

export function detach(person) {
  return person.getName.bind(person);
}

export function detachBroken(person) {
  // No binding: `this` will be undefined when this is called on its own.
  return person.getName;
}

export function myBind(fn, thisArg, ...preset) {
  return function (...later) {
    return fn.apply(thisArg, [...preset, ...later]);
  };
}

export class Stack {
  #items = [];

  push(item) {
    this.#items.push(item);
    return this.#items.length;
  }

  pop() {
    return this.#items.pop();
  }

  peek() {
    return this.#items[this.#items.length - 1];
  }

  get size() {
    return this.#items.length;
  }

  get isEmpty() {
    return this.#items.length === 0;
  }

  toArray() {
    return [...this.#items];
  }

  static from(iterable) {
    const stack = new Stack();
    for (const item of iterable) stack.push(item);
    return stack;
  }

  *[Symbol.iterator]() {
    for (let i = this.#items.length - 1; i >= 0; i--) yield this.#items[i];
  }
}

export class EventEmitter {
  #listeners = new Map();

  #entries(event) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    return this.#listeners.get(event);
  }

  on(event, handler) {
    this.#entries(event).push({ fn: handler, original: handler });
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, handler);
      handler(...args);
    };
    this.#entries(event).push({ fn: wrapper, original: handler });
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const entries = this.#listeners.get(event);
    if (!entries) return;
    const index = entries.findIndex((entry) => entry.original === handler);
    if (index !== -1) entries.splice(index, 1);
  }

  emit(event, ...args) {
    const entries = this.#listeners.get(event);
    if (!entries || entries.length === 0) return 0;
    // Copy first: a handler may unsubscribe itself or others mid-emit.
    const snapshot = [...entries];
    for (const entry of snapshot) {
      try {
        entry.fn(...args);
      } catch {
        // One bad listener must not break the rest.
      }
    }
    return snapshot.length;
  }

  listenerCount(event) {
    return this.#listeners.get(event)?.length ?? 0;
  }
}

const ABSOLUTE_ZERO_C = -273.15;

export class Temperature {
  #celsius;

  constructor(celsius = 0) {
    this.celsius = celsius; // go through the setter so validation applies
  }

  get celsius() {
    return this.#celsius;
  }

  set celsius(value) {
    if (value < ABSOLUTE_ZERO_C) throw new RangeError('below absolute zero');
    this.#celsius = value;
  }

  get fahrenheit() {
    return this.#celsius * (9 / 5) + 32;
  }

  set fahrenheit(value) {
    this.celsius = (value - 32) * (5 / 9);
  }

  toString() {
    return `${this.#celsius}°C`;
  }
}

export class Shape {
  constructor() {
    if (new.target === Shape) throw new TypeError('Shape is abstract');
  }

  get name() {
    return this.constructor.name.toLowerCase();
  }

  area() {
    throw new Error('not implemented');
  }

  describe() {
    return `${this.name} with area ${this.area().toFixed(2)}`;
  }
}

export class Circle extends Shape {
  constructor(radius) {
    super();
    this.radius = radius;
  }

  area() {
    return Math.PI * this.radius ** 2;
  }
}

export class Rectangle extends Shape {
  constructor(width, height) {
    super();
    this.width = width;
    this.height = height;
  }

  area() {
    return this.width * this.height;
  }

  get isSquare() {
    return this.width === this.height;
  }
}

export class User {
  constructor({ id, firstName, lastName, email }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  toJSON() {
    const { id, firstName, lastName, email } = this;
    return { id, firstName, lastName, email };
  }

  static fromApi(row) {
    return new User({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email_address,
    });
  }

  static compareByName(a, b) {
    return (
      a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' }) ||
      a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' })
    );
  }
}

export function objectWithProto(proto, ownProps) {
  return Object.assign(Object.create(proto), ownProps);
}

export function describeKeys(obj) {
  const own = Object.keys(obj);
  const inherited = [];
  let proto = Object.getPrototypeOf(obj);
  while (proto && proto !== Object.prototype) {
    for (const key of Object.keys(proto)) {
      if (!own.includes(key) && !inherited.includes(key)) inherited.push(key);
    }
    proto = Object.getPrototypeOf(proto);
  }
  return { own, inherited };
}

export function mixin(target, ...sources) {
  for (const source of sources) {
    // Descriptors copy getters as getters instead of calling them.
    Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
  }
  return target;
}

function toSqlLiteral(value) {
  return typeof value === 'string' ? `'${value}'` : String(value);
}

export class Query {
  #table;
  #columns = ['*'];
  #wheres = [];
  #orders = [];
  #limit = null;

  constructor(table) {
    this.#table = table;
  }

  select(...columns) {
    this.#columns = columns.length > 0 ? columns : ['*'];
    return this;
  }

  where(column, operator, value) {
    this.#wheres.push(`${column} ${operator} ${toSqlLiteral(value)}`);
    return this;
  }

  orderBy(column, direction = 'asc') {
    this.#orders.push(`${column} ${direction.toUpperCase()}`);
    return this;
  }

  limit(n) {
    this.#limit = n;
    return this;
  }

  toSQL() {
    let sql = `SELECT ${this.#columns.join(', ')} FROM ${this.#table}`;
    if (this.#wheres.length > 0) sql += ` WHERE ${this.#wheres.join(' AND ')}`;
    if (this.#orders.length > 0) sql += ` ORDER BY ${this.#orders.join(', ')}`;
    if (this.#limit !== null) sql += ` LIMIT ${this.#limit}`;
    return sql;
  }
}

export function classify(value) {
  if (value instanceof Stack) return 'stack';
  if (
    value !== null &&
    value !== undefined &&
    typeof value !== 'string' &&
    typeof value[Symbol.iterator] === 'function'
  ) {
    return 'iterable';
  }
  if (value !== null && typeof value === 'object' && typeof value.then === 'function') {
    return 'thenable';
  }
  if (value instanceof Error) return 'error';
  return 'other';
}
