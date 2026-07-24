/** Reference solutions for MODULE JS-08. */

export function* range(start, end, step = 1) {
  if (step === 0) throw new RangeError('step must not be 0');
  if (step > 0) {
    for (let i = start; i < end; i += step) yield i;
  } else {
    for (let i = start; i > end; i += step) yield i;
  }
}

export function* take(iterable, n) {
  if (n <= 0) return;
  let taken = 0;
  for (const value of iterable) {
    yield value;
    taken += 1;
    if (taken >= n) return;
  }
}

export function* mapIter(iterable, fn) {
  let index = 0;
  for (const value of iterable) yield fn(value, index++);
}

export function* filterIter(iterable, predicate) {
  let index = 0;
  for (const value of iterable) {
    if (predicate(value, index++)) yield value;
  }
}

export function* fibonacci() {
  let [a, b] = [0, 1];
  for (;;) {
    yield a;
    [a, b] = [b, a + b];
  }
}

export class Playlist {
  #tracks;

  constructor(tracks = []) {
    this.#tracks = [...tracks];
  }

  add(track) {
    this.#tracks.push(track);
    return this;
  }

  get length() {
    return this.#tracks.length;
  }

  *[Symbol.iterator]() {
    yield* this.#tracks;
  }

  *shuffledFrom(index) {
    const size = this.#tracks.length;
    for (let i = 0; i < size; i++) {
      yield this.#tracks[(index + i) % size];
    }
  }
}

export function* zipIter(a, b) {
  const left = a[Symbol.iterator]();
  const right = b[Symbol.iterator]();
  for (;;) {
    const x = left.next();
    const y = right.next();
    if (x.done || y.done) return;
    yield [x.value, y.value];
  }
}

export function* chunkIter(iterable, size) {
  if (size < 1) throw new RangeError('size must be >= 1');
  let buffer = [];
  for (const value of iterable) {
    buffer.push(value);
    if (buffer.length === size) {
      yield buffer;
      buffer = [];
    }
  }
  if (buffer.length > 0) yield buffer;
}

export function* walkTree(node) {
  yield node.value;
  for (const child of node.children ?? []) {
    yield* walkTree(child);
  }
}

export function* accumulator() {
  let total = 0;
  for (;;) {
    const received = yield total;
    if (received === null || received === undefined) return total;
    total += received;
  }
}

export function makeIterator(array) {
  let index = 0;
  return {
    next() {
      if (index < array.length) {
        return { value: array[index++], done: false };
      }
      return { value: undefined, done: true };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}

export async function* streamAll(fetchPage) {
  let page = 1;
  for (;;) {
    const { items, hasMore } = await fetchPage(page);
    for (const item of items) yield item;
    if (!hasMore) return;
    page += 1;
  }
}

export async function collect(asyncIterable) {
  const out = [];
  for await (const value of asyncIterable) out.push(value);
  return out;
}

export function lazyPipeline(source, predicate, transform, n) {
  return [...take(mapIter(filterIter(source, predicate), transform), n)];
}
