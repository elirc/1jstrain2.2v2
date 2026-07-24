/** Reference solutions for MODULE JS-03. */

export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('size must be >= 1');
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function zip(a, b) {
  const length = Math.min(a.length, b.length);
  const out = [];
  for (let i = 0; i < length; i++) out.push([a[i], b[i]]);
  return out;
}

export function groupBy(items, keyFn) {
  return items.reduce((acc, item, index) => {
    const key = String(keyFn(item, index));
    (acc[key] ??= []).push(item);
    return acc;
  }, {});
}

export function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = String(keyFn(item));
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function sortBy(items, keyFn, direction = 'asc') {
  const factor = direction === 'desc' ? -1 : 1;
  return [...items].sort((left, right) => {
    const a = keyFn(left);
    const b = keyFn(right);
    if (typeof a === 'string' || typeof b === 'string') {
      return factor * String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
    }
    return factor * (a - b);
  });
}

export function partition(items, predicate) {
  const yes = [];
  const no = [];
  items.forEach((item, index) => {
    (predicate(item, index) ? yes : no).push(item);
  });
  return [yes, no];
}

export function sumBy(items, valueFn) {
  return items.reduce((total, item) => total + valueFn(item), 0);
}

export function averageBy(items, valueFn) {
  if (items.length === 0) return null;
  return sumBy(items, valueFn) / items.length;
}

export function rotate(items, n) {
  if (items.length === 0) return [];
  const offset = ((n % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function intersection(a, b) {
  const other = new Set(b);
  return [...new Set(a)].filter((item) => other.has(item));
}

export function difference(a, b) {
  const other = new Set(b);
  return [...new Set(a)].filter((item) => !other.has(item));
}

export function union(a, b) {
  return [...new Set([...a, ...b])];
}

export function runningTotal(numbers) {
  let total = 0;
  return numbers.map((n) => (total += n));
}

export function topN(items, n, scoreFn) {
  return items
    .map((item, index) => ({ item, index, score: scoreFn(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, n))
    .map((entry) => entry.item);
}

export function summarizeOrders(orders) {
  const paid = orders.filter((order) => order.status === 'paid');
  const byCustomer = groupBy(paid, (order) => order.customer);

  return Object.entries(byCustomer)
    .map(([customer, rows]) => {
      const revenue = sumBy(rows, (row) => row.total);
      return {
        customer,
        orders: rows.length,
        revenue,
        average: Math.round((revenue / rows.length) * 100) / 100,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || a.customer.localeCompare(b.customer));
}

export function tagPairs(users) {
  return users.flatMap((user) => (user.tags ?? []).map((tag) => `${user.name}:${tag}`));
}
