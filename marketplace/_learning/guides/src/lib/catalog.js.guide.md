# Guide: src/lib/catalog.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- .map()
- .filter()
- .reduce()
- .sort()
- nullish coalescing
- SQL queries
- object spread
- destructuring
**Prerequisites**:
- Read `src/lib/db.js.guide.md` first to understand data shape and SQL tables.

## Line-by-Line Walkthrough

### Section 1: Lines 2-4
```js
2: import { toCents, nowIso } from "@/lib/security";
3: import { numeric, parseJson } from "@/lib/utils";
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

### Section 2: Lines 5-40
```js
5: function getProductBaseRows() {
6:   const db = getDb();
7: 
8:   return db
9:     .prepare(
10:       `SELECT
11:         p.id,
12:         p.title,
13:         p.description,
14:         p.status,
15:         p.created_at,
16:         p.updated_at,
17:         p.featured,
18:         p.category_id,
19:         c.name AS category_name,
20:         c.slug AS category_slug,
21:         s.id AS store_id,
22:         s.name AS store_name,
23:         s.slug AS store_slug,
24:         s.shipping_speed_days,
25:         MIN(v.price_cents) AS min_price_cents,
26:         MAX(v.price_cents) AS max_price_cents,
27:         SUM(v.inventory) AS inventory_total,
28:         AVG(r.rating) AS rating_avg,
29:         COUNT(DISTINCT r.id) AS rating_count
30:       FROM products p
31:       JOIN stores s ON s.id = p.store_id
32:       LEFT JOIN categories c ON c.id = p.category_id
33:       JOIN product_variants v ON v.product_id = p.id AND v.is_active = 1
34:       LEFT JOIN reviews r ON r.product_id = p.id
35:       WHERE p.status = 'ACTIVE'
36:       GROUP BY p.id`
37:     )
38:     .all();
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- SQL queries is used in this section.

**What would happen if...** What if we run this query without validation? Bad inputs can trigger incorrect writes or broken business invariants.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 3: Lines 41-64
```js
41: function getProductPrimaryImages(productIds) {
42:   if (productIds.length === 0) {
43:     return {};
44:   }
45: 
46:   const db = getDb();
47:   const placeholders = productIds.map(() => "?").join(",");
48:   const rows = db
49:     .prepare(
50:       `SELECT product_id, url
51:        FROM product_images
52:        WHERE product_id IN (${placeholders})
53:        ORDER BY sort_order ASC, id ASC`
54:     )
55:     .all(...productIds);
56: 
57:   return rows.reduce((acc, row) => {
58:     if (!acc[row.product_id]) {
59:       acc[row.product_id] = row.url;
60:     }
61:     return acc;
62:   }, {});
63: }
64: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `.reduce()` combines many items into one accumulator value.
- SQL queries is used in this section.
- object spread is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

### Section 4: Lines 65-88
```js
65: export function getCategoryTree() {
66:   const db = getDb();
67:   const rows = db
68:     .prepare("SELECT id, parent_id, name, slug FROM categories ORDER BY name ASC")
69:     .all();
70: 
71:   const byParent = rows.reduce((acc, category) => {
72:     const key = category.parent_id ?? "root";
73:     acc[key] = acc[key] ?? [];
74:     acc[key].push({ ...category, children: [] });
75:     return acc;
76:   }, {});
77: 
78:   function build(parentId) {
79:     const key = parentId ?? "root";
80:     return (byParent[key] ?? []).map((category) => ({
81:       ...category,
82:       children: build(category.id)
83:     }));
84:   }
85: 
86:   return build(null);
87: }
88: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `.reduce()` combines many items into one accumulator value.
- nullish coalescing is used in this section.
- SQL queries is used in this section.
- object spread is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

### Section 5: Lines 89-231
```js
89: export function getCatalog({
90:   query = "",
91:   category = "",
92:   minPrice = "",
93:   maxPrice = "",
94:   minRating = "",
95:   shippingSpeed = "",
96:   seller = "",
97:   sort = "relevance",
98:   cursor = "0",
99:   pageSize = 12
100: }) {
101:   const rawRows = getProductBaseRows();
102: 
103:   const searchableQuery = query.trim().toLowerCase();
104:   const minPriceCents = minPrice ? toCents(minPrice) : 0;
105:   const maxPriceCents = maxPrice ? toCents(maxPrice) : Number.MAX_SAFE_INTEGER;
106:   const minRatingValue = minRating ? numeric(minRating, 0) : 0;
107:   const shippingDaysCap = shippingSpeed ? numeric(shippingSpeed, 365) : null;
108:   const cursorValue = numeric(cursor, 0);
109: 
110:   const productsWithRelevance = rawRows
111:     .map((product) => {
112:       const title = product.title.toLowerCase();
113:       const desc = product.description.toLowerCase();
114:       const sellerName = (product.store_name || "").toLowerCase();
115: 
116:       let relevanceScore = 0;
117:       if (searchableQuery) {
118:         if (title.includes(searchableQuery)) {
119:           relevanceScore += 5;
120:         }
121:         if (desc.includes(searchableQuery)) {
122:           relevanceScore += 2;
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `.filter()` keeps only items with truthy callback results.
- Note: `.reduce()` combines many items into one accumulator value.
- .sort() is used in this section.
- object spread is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

### Section 6: Lines 232-343
```js
232: export function getProductById(productId) {
233:   const db = getDb();
234:   const id = Number(productId);
235: 
236:   const product = db
237:     .prepare(
238:       `SELECT
239:         p.*, c.name AS category_name, c.slug AS category_slug,
240:         s.name AS store_name, s.slug AS store_slug, s.shipping_speed_days
241:        FROM products p
242:        LEFT JOIN categories c ON c.id = p.category_id
243:        JOIN stores s ON s.id = p.store_id
244:        WHERE p.id = ?`
245:     )
246:     .get(id);
247: 
248:   if (!product) {
249:     return null;
250:   }
251: 
252:   const variants = db
253:     .prepare(
254:       `SELECT id, sku, option_size, option_color, option_material, price_cents, inventory, image_url
255:        FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY id ASC`
256:     )
257:     .all(id)
258:     .map((variant) => ({
259:       id: variant.id,
260:       sku: variant.sku,
261:       size: variant.option_size,
262:       color: variant.option_color,
263:       material: variant.option_material,
264:       price: variant.price_cents / 100,
265:       inventory: variant.inventory,
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `.filter()` keeps only items with truthy callback results.
- Note: `.reduce()` combines many items into one accumulator value.
- SQL queries is used in this section.
- object spread is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

### Section 7: Lines 344-363
```js
344: export function recordRecentlyViewed({ productId, userId, sessionId }) {
345:   const db = getDb();
346:   const viewedAt = nowIso();
347: 
348:   db.prepare(
349:     "INSERT INTO recently_viewed(user_id, session_id, product_id, viewed_at) VALUES(?, ?, ?, ?)"
350:   ).run(userId || null, sessionId || null, Number(productId), viewedAt);
351: 
352:   if (userId) {
353:     db.prepare(
354:       `DELETE FROM recently_viewed
355:        WHERE user_id = ?
356:          AND id NOT IN (
357:            SELECT id FROM recently_viewed WHERE user_id = ? ORDER BY viewed_at DESC LIMIT 20
358:          )`
359:     ).run(userId, userId);
360:   }
361: }
362: 
363: 
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
| 9 | SQL | Runs database read/write statements. |
| 47 | .map() | Transforms each item and returns a new array of the same length. |
| 49 | SQL | Runs database read/write statements. |
| 50 | SQL | Runs database read/write statements. |
| 57 | .reduce() | Accumulates array items into one value. |
| 68 | SQL | Runs database read/write statements. |
| 71 | .reduce() | Accumulates array items into one value. |
| 72 | nullish coalescing | Falls back only when value is null or undefined. |
| 73 | nullish coalescing | Falls back only when value is null or undefined. |
| 79 | nullish coalescing | Falls back only when value is null or undefined. |
| 80 | .map() | Transforms each item and returns a new array of the same length. |
| 111 | .map() | Transforms each item and returns a new array of the same length. |
| 139 | .filter() | Keeps only items where the callback returns true. |
| 161 | .sort() | Orders items in place using comparator logic. |
| 179 | .map() | Transforms each item and returns a new array of the same length. |
| 182 | .map() | Transforms each item and returns a new array of the same length. |
| 206 | .reduce() | Accumulates array items into one value. |
| 237 | SQL | Runs database read/write statements. |
| 253 | SQL | Runs database read/write statements. |
| 254 | SQL | Runs database read/write statements. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
