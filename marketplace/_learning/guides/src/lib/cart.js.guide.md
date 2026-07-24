# Guide: src/lib/cart.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- .map()
- .filter()
- .reduce()
- SQL queries
- object spread
- destructuring
**Prerequisites**:
- Read `src/lib/db.js.guide.md` first to understand data shape and SQL tables.

## Line-by-Line Walkthrough

### Section 1: Lines 2-3
```js
2: import { nowIso } from "@/lib/security";
3: 
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

### Section 2: Lines 4-34
```js
4: function resolveCart({ userId, sessionId }) {
5:   const db = getDb();
6: 
7:   if (!userId && !sessionId) {
8:     throw new Error("Cart identity missing");
9:   }
10: 
11:   let cart = null;
12: 
13:   if (userId) {
14:     cart = db.prepare("SELECT * FROM carts WHERE user_id = ?").get(userId);
15:   }
16: 
17:   if (!cart && sessionId) {
18:     cart = db.prepare("SELECT * FROM carts WHERE session_id = ?").get(sessionId);
19:   }
20: 
21:   if (!cart) {
22:     const createdAt = nowIso();
23:     const insert = db
24:       .prepare("INSERT INTO carts(user_id, session_id, created_at, updated_at) VALUES(?, ?, ?, ?)")
25:       .run(userId || null, sessionId || null, createdAt, createdAt);
26:     cart = db.prepare("SELECT * FROM carts WHERE id = ?").get(Number(insert.lastInsertRowid));
27:   } else if (userId && !cart.user_id) {
28:     db.prepare("UPDATE carts SET user_id = ?, updated_at = ? WHERE id = ?").run(userId, nowIso(), cart.id);
29:     cart.user_id = userId;
30:   }
31: 
32:   return cart;
33: }
34: 
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

### Section 3: Lines 35-83
```js
35: function getCartItemsByCartId(cartId) {
36:   const db = getDb();
37:   return db
38:     .prepare(
39:       `SELECT
40:          ci.id,
41:          ci.quantity,
42:          ci.saved_for_later,
43:          ci.variant_id,
44:          ci.product_id,
45:          p.title AS product_title,
46:          p.status AS product_status,
47:          s.id AS seller_id,
48:          s.name AS seller_name,
49:          s.shipping_speed_days,
50:          v.price_cents,
51:          v.inventory,
52:          v.option_size,
53:          v.option_color,
54:          v.option_material,
55:          pi.url AS image_url
56:        FROM cart_items ci
57:        JOIN products p ON p.id = ci.product_id
58:        JOIN stores s ON s.id = p.store_id
59:        JOIN product_variants v ON v.id = ci.variant_id
60:        LEFT JOIN product_images pi ON pi.product_id = p.id
61:        WHERE ci.cart_id = ?
62:        GROUP BY ci.id
63:        ORDER BY ci.added_at DESC`
64:     )
65:     .all(cartId)
66:     .map((row) => ({
67:       id: row.id,
68:       quantity: row.quantity,
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `.filter()` keeps only items with truthy callback results.
- SQL queries is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

### Section 4: Lines 84-122
```js
84: function buildCartSummary(cart, items) {
85:   const activeItems = items.filter((item) => !item.savedForLater);
86:   const savedItems = items.filter((item) => item.savedForLater);
87: 
88:   const groupedBySeller = activeItems.reduce((acc, item) => {
89:     const key = item.sellerId;
90:     acc[key] = acc[key] || {
91:       sellerId: item.sellerId,
92:       sellerName: item.sellerName,
93:       shippingSpeedDays: item.shippingSpeedDays,
94:       items: []
95:     };
96:     acc[key].items.push(item);
97:     return acc;
98:   }, {});
99: 
100:   const sellers = Object.values(groupedBySeller).map((group) => {
101:     const subtotalCents = group.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
102:     return {
103:       ...group,
104:       subtotalCents,
105:       subtotal: subtotalCents / 100
106:     };
107:   });
108: 
109:   const subtotalCents = activeItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
110: 
111:   return {
112:     id: cart.id,
113:     updatedAt: cart.updated_at,
114:     itemCount: activeItems.reduce((sum, item) => sum + item.quantity, 0),
115:     subtotalCents,
116:     subtotal: subtotalCents / 100,
117:     sellers,
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `.filter()` keeps only items with truthy callback results.
- Note: `.reduce()` combines many items into one accumulator value.
- object spread is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

### Section 5: Lines 123-128
```js
123: export function getCart({ userId, sessionId }) {
124:   const cart = resolveCart({ userId, sessionId });
125:   const items = getCartItemsByCartId(cart.id);
126:   return buildCartSummary(cart, items);
127: }
128: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- destructuring is used in this section.

**What would happen if...** What if we remove this block entirely? Trace callers and consumers first, because other parts of the app likely depend on this contract.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 6: Lines 129-172
```js
129: export function addCartItem({ userId, sessionId, productId, variantId, quantity = 1 }) {
130:   const db = getDb();
131:   const cart = resolveCart({ userId, sessionId });
132:   const product = db.prepare("SELECT id, seller_id FROM products WHERE id = ?").get(Number(productId));
133: 
134:   if (!product) {
135:     throw new Error("Product not found");
136:   }
137: 
138:   const variant = db
139:     .prepare("SELECT id, inventory FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1")
140:     .get(Number(variantId), Number(productId));
141: 
142:   if (!variant) {
143:     throw new Error("Variant not found");
144:   }
145: 
146:   const requestedQuantity = Math.max(1, Math.min(99, Number(quantity)));
147: 
148:   if (variant.inventory < requestedQuantity) {
149:     throw new Error("Not enough inventory for this variant");
150:   }
151: 
152:   const existing = db
153:     .prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ? AND saved_for_later = 0")
154:     .get(cart.id, Number(variantId));
155: 
156:   const addedAt = nowIso();
157: 
158:   if (existing) {
159:     const nextQuantity = Math.min(existing.quantity + requestedQuantity, variant.inventory);
160:     db.prepare("UPDATE cart_items SET quantity = ?, added_at = ? WHERE id = ?").run(nextQuantity, addedAt, existing.id);
161:   } else {
162:     db.prepare(
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

### Section 7: Lines 173-201
```js
173: export function updateCartItem({ userId, sessionId, itemId, quantity, savedForLater }) {
174:   const db = getDb();
175:   const cart = resolveCart({ userId, sessionId });
176:   const item = db.prepare("SELECT * FROM cart_items WHERE id = ? AND cart_id = ?").get(Number(itemId), cart.id);
177: 
178:   if (!item) {
179:     throw new Error("Cart item not found");
180:   }
181: 
182:   const nextQuantity = quantity != null ? Math.max(1, Math.min(99, Number(quantity))) : item.quantity;
183:   const nextSaved = savedForLater == null ? item.saved_for_later : (savedForLater ? 1 : 0);
184: 
185:   const variant = db.prepare("SELECT inventory FROM product_variants WHERE id = ?").get(item.variant_id);
186:   if (!variant || variant.inventory < nextQuantity) {
187:     throw new Error("Requested quantity exceeds inventory");
188:   }
189: 
190:   db.prepare("UPDATE cart_items SET quantity = ?, saved_for_later = ?, added_at = ? WHERE id = ?").run(
191:     nextQuantity,
192:     nextSaved,
193:     nowIso(),
194:     item.id
195:   );
196: 
197:   db.prepare("UPDATE carts SET updated_at = ? WHERE id = ?").run(nowIso(), cart.id);
198: 
199:   return getCart({ userId, sessionId });
200: }
201: 
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

### Section 8: Lines 202-211
```js
202: export function removeCartItem({ userId, sessionId, itemId }) {
203:   const db = getDb();
204:   const cart = resolveCart({ userId, sessionId });
205: 
206:   db.prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").run(Number(itemId), cart.id);
207:   db.prepare("UPDATE carts SET updated_at = ? WHERE id = ?").run(nowIso(), cart.id);
208: 
209:   return getCart({ userId, sessionId });
210: }
211: 
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
| 14 | SQL | Runs database read/write statements. |
| 18 | SQL | Runs database read/write statements. |
| 24 | SQL | Runs database read/write statements. |
| 26 | SQL | Runs database read/write statements. |
| 28 | SQL | Runs database read/write statements. |
| 38 | SQL | Runs database read/write statements. |
| 66 | .map() | Transforms each item and returns a new array of the same length. |
| 79 | .filter() | Keeps only items where the callback returns true. |
| 85 | .filter() | Keeps only items where the callback returns true. |
| 86 | .filter() | Keeps only items where the callback returns true. |
| 88 | .reduce() | Accumulates array items into one value. |
| 100 | .map() | Transforms each item and returns a new array of the same length. |
| 101 | .reduce() | Accumulates array items into one value. |
| 109 | .reduce() | Accumulates array items into one value. |
| 114 | .reduce() | Accumulates array items into one value. |
| 132 | SQL | Runs database read/write statements. |
| 139 | SQL | Runs database read/write statements. |
| 153 | SQL | Runs database read/write statements. |
| 160 | SQL | Runs database read/write statements. |
| 162 | SQL | Runs database read/write statements. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
