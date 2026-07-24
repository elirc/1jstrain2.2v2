# Guide: src/lib/orders.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- .map()
- .filter()
- .reduce()
- .forEach()
- Object.entries/fromEntries
- optional chaining
- nullish coalescing
- SQL queries
**Prerequisites**:
- Read `src/lib/db.js.guide.md` first to understand data shape and SQL tables.

## Line-by-Line Walkthrough

### Section 1: Lines 2-4
```js
2: import { generateOrderNumber, nowIso, toCents } from "@/lib/security";
3: import { resolveCartIdentity, getCartItemsRaw } from "@/lib/cart";
4: 
```
**What it does**: This section imports dependencies and establishes the module boundary. It tells you what this file relies on and what abstractions it delegates to.

> **Concept callouts:**
- This block is mostly structural wiring (imports/export boundaries).

**What would happen if...** What if we remove this block entirely? Trace callers and consumers first, because other parts of the app likely depend on this contract.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 2: Lines 5-12
```js
5: const REGION_TAX_RATE = {
6:   CA: 0.0875,
7:   NY: 0.088,
8:   TX: 0.0825,
9:   WA: 0.065,
10:   default: 0.06
11: };
12: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- This block is mostly structural wiring (imports/export boundaries).

**What would happen if...** What if we remove this block entirely? Trace callers and consumers first, because other parts of the app likely depend on this contract.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 3: Lines 13-48
```js
13: function computeDiscount({ subtotalCents, discountCode }) {
14:   if (!discountCode) {
15:     return { discountCents: 0, discountRow: null };
16:   }
17: 
18:   const db = getDb();
19:   const row = db
20:     .prepare(
21:       `SELECT * FROM discount_codes
22:        WHERE code = ?
23:          AND active = 1
24:          AND (starts_at IS NULL OR starts_at <= ?)
25:          AND (expires_at IS NULL OR expires_at >= ?)`
26:     )
27:     .get(discountCode.toUpperCase(), nowIso(), nowIso());
28: 
29:   if (!row) {
30:     throw new Error("Discount code not valid");
31:   }
32: 
33:   if (subtotalCents < row.min_order_cents) {
34:     throw new Error("Order does not meet discount minimum");
35:   }
36: 
37:   if (row.max_uses != null && row.uses_count >= row.max_uses) {
38:     throw new Error("Discount code usage limit reached");
39:   }
40: 
41:   const discountCents =
42:     row.type === "PERCENT"
43:       ? Math.floor(subtotalCents * (row.amount / 100))
44:       : Math.min(row.amount, subtotalCents);
45: 
46:   return { discountCents, discountRow: row };
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- SQL queries is used in this section.
- destructuring is used in this section.

**What would happen if...** What if we run this query without validation? Bad inputs can trigger incorrect writes or broken business invariants.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 4: Lines 49-211
```js
49: export function checkout({ userId, sessionId, payload }) {
50:   return runInTransaction((db) => {
51:     const cart = resolveCartIdentity({ userId, sessionId });
52:     const items = getCartItemsRaw(cart.id).filter((item) => !item.savedForLater);
53: 
54:     if (items.length === 0) {
55:       throw new Error("Cart is empty");
56:     }
57: 
58:     const groupedBySeller = items.reduce((acc, item) => {
59:       acc[item.sellerId] = acc[item.sellerId] ?? [];
60:       acc[item.sellerId].push(item);
61:       return acc;
62:     }, {});
63: 
64:     const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
65:     const { discountCents, discountRow } = computeDiscount({
66:       subtotalCents,
67:       discountCode: payload.discountCode
68:     });
69: 
70:     const addressCreatedAt = nowIso();
71:     const addressInsert = db
72:       .prepare(
73:         `INSERT INTO addresses(user_id, full_name, line1, line2, city, region, postal_code, country, phone, is_default, created_at)
74:          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
75:       )
76:       .run(
77:         userId || null,
78:         payload.address.fullName,
79:         payload.address.line1,
80:         payload.address.line2 || "",
81:         payload.address.city,
82:         payload.address.region,
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.filter()` keeps only items with truthy callback results.
- Note: `.reduce()` combines many items into one accumulator value.
- .forEach() is used in this section.
- Object.entries/fromEntries is used in this section.
- optional chaining is used in this section.

**What would happen if...** What if this `.filter()` condition is too strict? You might accidentally return an empty result set and show no data to users.

**Extra example**:
```js
const orders = [{ status: 'PAID' }, { status: 'PENDING' }];
const paid = orders.filter(o => o.status === 'PAID');
// [{ status: 'PAID' }]
```

### Section 5: Lines 212-243
```js
212: export function listOrdersForBuyer(userId) {
213:   const db = getDb();
214:   const orders = db
215:     .prepare(
216:       `SELECT o.*, s.name as seller_name
217:        FROM orders o
218:        JOIN stores s ON s.seller_id = o.seller_id
219:        WHERE o.buyer_id = ?
220:        ORDER BY o.created_at DESC`
221:     )
222:     .all(userId);
223: 
224:   return orders.map((order) => ({
225:     ...order,
226:     subtotal: order.subtotal_cents / 100,
227:     tax: order.tax_cents / 100,
228:     shipping: order.shipping_cents / 100,
229:     discount: order.discount_cents / 100,
230:     total: order.total_cents / 100,
231:     items: db
232:       .prepare(
233:         "SELECT id, product_id, title_snapshot, variant_snapshot, unit_price_cents, quantity, line_total_cents FROM order_items WHERE order_id = ?"
234:       )
235:       .all(order.id)
236:       .map((item) => ({
237:         ...item,
238:         unitPrice: item.unit_price_cents / 100,
239:         lineTotal: item.line_total_cents / 100
240:       }))
241:   }));
242: }
243: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- SQL queries is used in this section.
- object spread is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

### Section 6: Lines 244-264
```js
244: export function listOrdersForSeller(sellerId) {
245:   const db = getDb();
246:   const orders = db
247:     .prepare(
248:       `SELECT o.*, u.name as buyer_name
249:        FROM orders o
250:        LEFT JOIN users u ON u.id = o.buyer_id
251:        WHERE o.seller_id = ?
252:        ORDER BY o.created_at DESC`
253:     )
254:     .all(sellerId);
255: 
256:   return orders.map((order) => ({
257:     ...order,
258:     total: order.total_cents / 100,
259:     items: db
260:       .prepare("SELECT title_snapshot, variant_snapshot, quantity FROM order_items WHERE order_id = ?")
261:       .all(order.id)
262:   }));
263: }
264: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- SQL queries is used in this section.
- object spread is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

### Section 7: Lines 265-295
```js
265: export function updateOrderStatus({ sellerId, orderId, status, trackingNumber }) {
266:   const db = getDb();
267:   const allowedStatuses = ["CONFIRMED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"];
268: 
269:   if (!allowedStatuses.includes(status)) {
270:     throw new Error("Invalid status value");
271:   }
272: 
273:   const order = db.prepare("SELECT * FROM orders WHERE id = ? AND seller_id = ?").get(Number(orderId), sellerId);
274:   if (!order) {
275:     throw new Error("Order not found");
276:   }
277: 
278:   const updatedAt = nowIso();
279:   db.prepare("UPDATE orders SET status = ?, tracking_number = COALESCE(?, tracking_number), updated_at = ? WHERE id = ?")
280:     .run(status, trackingNumber || null, updatedAt, order.id);
281: 
282:   db.prepare(
283:     "INSERT INTO order_status_history(order_id, status, note, created_by, created_at) VALUES(?, ?, ?, ?, ?)"
284:   ).run(order.id, status, `Updated by seller to ${status}`, sellerId, updatedAt);
285: 
286:   if (order.buyer_id) {
287:     db.prepare(
288:       "INSERT INTO notifications(user_id, type, message, read, meta_json, created_at) VALUES(?, 'ORDER_STATUS', ?, 0, ?, ?)"
289:     ).run(order.buyer_id, `Order #${order.order_number} is now ${status}`, JSON.stringify({ orderId: order.id }), updatedAt);
290:   }
291: 
292:   return db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
293: }
294: 
295: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- SQL queries is used in this section.
- destructuring is used in this section.

**What would happen if...** What if we run this query without validation? Bad inputs can trigger incorrect writes or broken business invariants.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| 20 | SQL | Runs database read/write statements. |
| 21 | SQL | Runs database read/write statements. |
| 52 | .filter() | Keeps only items where the callback returns true. |
| 58 | .reduce() | Accumulates array items into one value. |
| 59 | nullish coalescing | Falls back only when value is null or undefined. |
| 64 | .reduce() | Accumulates array items into one value. |
| 72 | SQL | Runs database read/write statements. |
| 73 | SQL | Runs database read/write statements. |
| 90 | nullish coalescing | Falls back only when value is null or undefined. |
| 91 | nullish coalescing | Falls back only when value is null or undefined. |
| 97 | .forEach() | Runs side effects for each item and returns undefined. |
| 98 | .reduce() | Accumulates array items into one value. |
| 102 | optional chaining | Safely accesses nested values that might be null/undefined. |
| 108 | SQL | Runs database read/write statements. |
| 109 | SQL | Runs database read/write statements. |
| 133 | .forEach() | Runs side effects for each item and returns undefined. |
| 135 | SQL | Runs database read/write statements. |
| 136 | SQL | Runs database read/write statements. |
| 144 | SQL | Runs database read/write statements. |
| 145 | SQL | Runs database read/write statements. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
