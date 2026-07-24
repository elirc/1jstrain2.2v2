# Guide: src/lib/seller.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- .map()
- .filter()
- .forEach()
- .flatMap()
- Object.entries/fromEntries
- optional chaining
- SQL queries
- object spread
**Prerequisites**:
- Read `src/lib/db.js.guide.md` first to understand data shape and SQL tables.

## Line-by-Line Walkthrough

### Section 1: Lines 2-6
```js
2: import { nowIso, toCents } from "@/lib/security";
3: import { numeric, parseJson } from "@/lib/utils";
4: import { getProductById } from "@/lib/catalog";
5: import { listOrdersForSeller } from "@/lib/orders";
6: 
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

### Section 2: Lines 7-96
```js
7: export function createProduct({ sellerId, payload }) {
8:   const db = getDb();
9:   const store = db.prepare("SELECT * FROM stores WHERE seller_id = ?").get(sellerId);
10: 
11:   if (!store) {
12:     throw new Error("Create your store profile before adding products");
13:   }
14: 
15:   const now = nowIso();
16:   const insert = db
17:     .prepare(
18:       `INSERT INTO products(
19:          store_id, seller_id, category_id, title, description, status,
20:          seo_title, seo_description, related_product_ids, featured, created_at, updated_at
21:        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
22:     )
23:     .run(
24:       store.id,
25:       sellerId,
26:       payload.categoryId || null,
27:       payload.title,
28:       payload.description,
29:       payload.status || "DRAFT",
30:       payload.seoTitle || payload.title,
31:       payload.seoDescription || payload.description.slice(0, 150),
32:       JSON.stringify(payload.relatedProductIds || []),
33:       payload.featured ? 1 : 0,
34:       now,
35:       now
36:     );
37: 
38:   const productId = Number(insert.lastInsertRowid);
39: 
40:   const variants = (payload.variants || []).flatMap((variant) => {
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- .forEach() is used in this section.
- .flatMap() is used in this section.
- SQL queries is used in this section.
- destructuring is used in this section.

**What would happen if...** What if we run this query without validation? Bad inputs can trigger incorrect writes or broken business invariants.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 3: Lines 97-147
```js
97: export function updateProduct({ sellerId, productId, payload }) {
98:   const db = getDb();
99:   const product = db.prepare("SELECT * FROM products WHERE id = ? AND seller_id = ?").get(Number(productId), sellerId);
100: 
101:   if (!product) {
102:     throw new Error("Product not found");
103:   }
104: 
105:   db.prepare(
106:     `UPDATE products
107:      SET title = ?, description = ?, status = ?, category_id = ?, seo_title = ?, seo_description = ?,
108:          related_product_ids = ?, featured = ?, updated_at = ?
109:      WHERE id = ?`
110:   ).run(
111:     payload.title || product.title,
112:     payload.description || product.description,
113:     payload.status || product.status,
114:     payload.categoryId || product.category_id,
115:     payload.seoTitle || product.seo_title,
116:     payload.seoDescription || product.seo_description,
117:     JSON.stringify(payload.relatedProductIds || parseJson(product.related_product_ids, [])),
118:     payload.featured != null ? (payload.featured ? 1 : 0) : product.featured,
119:     nowIso(),
120:     product.id
121:   );
122: 
123:   if (Array.isArray(payload.variants)) {
124:     payload.variants.forEach((variant) => {
125:       if (!variant.id) {
126:         return;
127:       }
128:       db.prepare(
129:         `UPDATE product_variants
130:          SET price_cents = ?, inventory = ?, option_size = ?, option_color = ?, option_material = ?, image_url = ?
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- .forEach() is used in this section.
- SQL queries is used in this section.
- destructuring is used in this section.

**What would happen if...** What if we run this query without validation? Bad inputs can trigger incorrect writes or broken business invariants.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 4: Lines 148-169
```js
148: export function listSellerProducts(sellerId) {
149:   const db = getDb();
150:   const products = db
151:     .prepare(
152:       `SELECT p.id, p.title, p.status, p.created_at,
153:               MIN(v.price_cents) AS min_price_cents,
154:               SUM(v.inventory) AS inventory_total
155:        FROM products p
156:        JOIN product_variants v ON v.product_id = p.id
157:        WHERE p.seller_id = ?
158:        GROUP BY p.id
159:        ORDER BY p.created_at DESC`
160:     )
161:     .all(sellerId);
162: 
163:   return products.map((product) => ({
164:     ...product,
165:     minPrice: product.min_price_cents / 100,
166:     inventory: product.inventory_total
167:   }));
168: }
169: 
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

### Section 5: Lines 170-212
```js
170: export function upsertStore({ sellerId, payload }) {
171:   const db = getDb();
172:   const existing = db.prepare("SELECT * FROM stores WHERE seller_id = ?").get(sellerId);
173:   const now = nowIso();
174: 
175:   if (existing) {
176:     db.prepare(
177:       `UPDATE stores SET name = ?, slug = ?, description = ?, theme_json = ?, shipping_speed_days = ?, updated_at = ?
178:        WHERE seller_id = ?`
179:     ).run(
180:       payload.name || existing.name,
181:       payload.slug || existing.slug,
182:       payload.description || existing.description,
183:       JSON.stringify(payload.theme || parseJson(existing.theme_json, {})),
184:       payload.shippingSpeedDays || existing.shipping_speed_days,
185:       now,
186:       sellerId
187:     );
188:   } else {
189:     db.prepare(
190:       `INSERT INTO stores(seller_id, name, slug, description, theme_json, shipping_speed_days, payout_balance_cents, created_at, updated_at)
191:        VALUES(?, ?, ?, ?, ?, ?, 0, ?, ?)`
192:     ).run(
193:       sellerId,
194:       payload.name,
195:       payload.slug,
196:       payload.description || "",
197:       JSON.stringify(payload.theme || {}),
198:       payload.shippingSpeedDays || 5,
199:       now,
200:       now
201:     );
202: 
203:     db.prepare(
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

### Section 6: Lines 213-254
```js
213: export function getSellerDashboard(sellerId) {
214:   const db = getDb();
215:   const store = db.prepare("SELECT * FROM stores WHERE seller_id = ?").get(sellerId);
216:   const profile = db.prepare("SELECT * FROM seller_profiles WHERE user_id = ?").get(sellerId);
217: 
218:   const metrics = db
219:     .prepare(
220:       `SELECT
221:          COUNT(DISTINCT o.id) AS orders_count,
222:          COALESCE(SUM(o.total_cents), 0) AS revenue_cents,
223:          COALESCE(SUM(t.fee_cents), 0) AS fees_cents
224:        FROM orders o
225:        LEFT JOIN transactions t ON t.order_id = o.id
226:        WHERE o.seller_id = ? AND o.payment_status = 'PAID'`
227:     )
228:     .get(sellerId);
229: 
230:   const lowInventory = db
231:     .prepare(
232:       `SELECT p.title, v.sku, v.inventory
233:        FROM product_variants v
234:        JOIN products p ON p.id = v.product_id
235:        WHERE p.seller_id = ? AND v.inventory <= 3
236:        ORDER BY v.inventory ASC`
237:     )
238:     .all(sellerId);
239: 
240:   return {
241:     store,
242:     profile,
243:     metrics: {
244:       orders: metrics.orders_count,
245:       revenue: metrics.revenue_cents / 100,
246:       fees: metrics.fees_cents / 100,
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- optional chaining is used in this section.
- SQL queries is used in this section.

**What would happen if...** What if we run this query without validation? Bad inputs can trigger incorrect writes or broken business invariants.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 7: Lines 255-308
```js
255: export function importProductsFromCsv({ sellerId, csvText }) {
256:   const lines = csvText
257:     .split(/\r?\n/)
258:     .map((line) => line.trim())
259:     .filter(Boolean);
260: 
261:   if (lines.length < 2) {
262:     throw new Error("CSV needs a header row and at least one data row");
263:   }
264: 
265:   const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
266:   const required = ["title", "description", "sku", "price", "inventory"];
267:   required.forEach((column) => {
268:     if (!headers.includes(column)) {
269:       throw new Error(`Missing required CSV column: ${column}`);
270:     }
271:   });
272: 
273:   const rows = lines.slice(1).map((line) => {
274:     const cols = line.split(",");
275:     return Object.fromEntries(headers.map((header, index) => [header, (cols[index] || "").trim()]));
276:   });
277: 
278:   const created = [];
279:   rows.forEach((row) => {
280:     const product = createProduct({
281:       sellerId,
282:       payload: {
283:         title: row.title,
284:         description: row.description,
285:         status: row.status || "ACTIVE",
286:         seoTitle: row.seo_title || row.title,
287:         seoDescription: row.seo_description || row.description,
288:         variants: [
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `.filter()` keeps only items with truthy callback results.
- .forEach() is used in this section.
- Object.entries/fromEntries is used in this section.
- destructuring is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| 9 | SQL | Runs database read/write statements. |
| 17 | SQL | Runs database read/write statements. |
| 18 | SQL | Runs database read/write statements. |
| 40 | .flatMap() | Maps items then flattens one level. |
| 63 | SQL | Runs database read/write statements. |
| 64 | SQL | Runs database read/write statements. |
| 70 | .forEach() | Runs side effects for each item and returns undefined. |
| 84 | SQL | Runs database read/write statements. |
| 85 | SQL | Runs database read/write statements. |
| 88 | .forEach() | Runs side effects for each item and returns undefined. |
| 99 | SQL | Runs database read/write statements. |
| 105 | SQL | Runs database read/write statements. |
| 106 | SQL | Runs database read/write statements. |
| 124 | .forEach() | Runs side effects for each item and returns undefined. |
| 128 | SQL | Runs database read/write statements. |
| 129 | SQL | Runs database read/write statements. |
| 151 | SQL | Runs database read/write statements. |
| 152 | SQL | Runs database read/write statements. |
| 163 | .map() | Transforms each item and returns a new array of the same length. |
| 172 | SQL | Runs database read/write statements. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
