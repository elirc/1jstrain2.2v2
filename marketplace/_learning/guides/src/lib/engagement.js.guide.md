# Guide: src/lib/engagement.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- .map()
- .forEach()
- SQL queries
- destructuring
**Prerequisites**:
- Read `src/lib/db.js.guide.md` first to understand data shape and SQL tables.

## Line-by-Line Walkthrough

### Section 1: Lines 2-4
```js
2: import { nowIso } from "@/lib/security";
3: import { numeric } from "@/lib/utils";
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

### Section 2: Lines 5-45
```js
5: export function createReview({ userId, payload }) {
6:   const db = getDb();
7:   const orderItem = db
8:     .prepare(
9:       `SELECT oi.*, o.status, o.buyer_id
10:        FROM order_items oi
11:        JOIN orders o ON o.id = oi.order_id
12:        WHERE oi.id = ?`
13:     )
14:     .get(Number(payload.orderItemId));
15: 
16:   if (!orderItem) {
17:     throw new Error("Order item not found");
18:   }
19: 
20:   if (orderItem.buyer_id !== userId) {
21:     throw new Error("You can only review your own purchases");
22:   }
23: 
24:   if (!["DELIVERED", "COMPLETED"].includes(orderItem.status)) {
25:     throw new Error("Review is allowed only after delivery");
26:   }
27: 
28:   const createdAt = nowIso();
29:   const reviewInsert = db
30:     .prepare(
31:       `INSERT INTO reviews(order_item_id, product_id, buyer_id, rating, title, body, seller_response, verified_purchase, helpful_count, created_at)
32:        VALUES(?, ?, ?, ?, ?, ?, '', 1, 0, ?)`
33:     )
34:     .run(orderItem.id, orderItem.product_id, userId, numeric(payload.rating, 5), payload.title || "", payload.body, createdAt);
35: 
36:   const reviewId = Number(reviewInsert.lastInsertRowid);
37:   (payload.images || []).forEach((url) => {
38:     if (url) {
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

### Section 3: Lines 46-63
```js
46: export function voteReview({ userId, reviewId, vote }) {
47:   const db = getDb();
48:   const normalizedVote = vote >= 0 ? 1 : -1;
49:   const createdAt = nowIso();
50: 
51:   db.prepare(
52:     `INSERT INTO review_votes(review_id, user_id, vote, created_at)
53:      VALUES(?, ?, ?, ?)
54:      ON CONFLICT(review_id, user_id)
55:      DO UPDATE SET vote = excluded.vote, created_at = excluded.created_at`
56:   ).run(Number(reviewId), userId, normalizedVote, createdAt);
57: 
58:   const helpful = db.prepare("SELECT COALESCE(SUM(vote), 0) AS score FROM review_votes WHERE review_id = ?").get(Number(reviewId));
59:   db.prepare("UPDATE reviews SET helpful_count = ? WHERE id = ?").run(helpful.score, Number(reviewId));
60: 
61:   return { reviewId: Number(reviewId), helpfulCount: helpful.score };
62: }
63: 
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

### Section 4: Lines 64-81
```js
64: export function toggleWishlist({ userId, productId }) {
65:   const db = getDb();
66:   const existing = db.prepare("SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?").get(userId, Number(productId));
67: 
68:   if (existing) {
69:     db.prepare("DELETE FROM wishlist_items WHERE id = ?").run(existing.id);
70:     return { wished: false };
71:   }
72: 
73:   db.prepare("INSERT INTO wishlist_items(user_id, product_id, created_at) VALUES(?, ?, ?)").run(
74:     userId,
75:     Number(productId),
76:     nowIso()
77:   );
78: 
79:   return { wished: true };
80: }
81: 
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

### Section 5: Lines 82-102
```js
82: export function getWishlist(userId) {
83:   const db = getDb();
84:   return db
85:     .prepare(
86:       `SELECT w.id, w.product_id, p.title, MIN(v.price_cents) AS min_price_cents
87:        FROM wishlist_items w
88:        JOIN products p ON p.id = w.product_id
89:        JOIN product_variants v ON v.product_id = p.id
90:        WHERE w.user_id = ?
91:        GROUP BY w.id
92:        ORDER BY w.created_at DESC`
93:     )
94:     .all(userId)
95:     .map((item) => ({
96:       id: item.id,
97:       productId: item.product_id,
98:       title: item.title,
99:       minPrice: item.min_price_cents / 100
100:     }));
101: }
102: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- SQL queries is used in this section.

**What would happen if...** What would happen if we used `.forEach()` instead of `.map()` here? You would lose the returned transformed array, so downstream rendering/data composition would break.

**Extra example**:
```js
const users = [{ first: 'Ada', last: 'Lovelace' }];
const display = users.map(u => `${u.first} ${u.last}`);
// ['Ada Lovelace']
```

### Section 6: Lines 103-140
```js
103: export function getRecentlyViewed({ userId, sessionId }) {
104:   const db = getDb();
105: 
106:   const rows = userId
107:     ? db
108:       .prepare(
109:         `SELECT rv.product_id, p.title, MIN(v.price_cents) AS min_price_cents, MAX(rv.viewed_at) as viewed_at
110:          FROM recently_viewed rv
111:          JOIN products p ON p.id = rv.product_id
112:          JOIN product_variants v ON v.product_id = p.id
113:          WHERE rv.user_id = ?
114:          GROUP BY rv.product_id
115:          ORDER BY viewed_at DESC
116:          LIMIT 20`
117:       )
118:       .all(userId)
119:     : db
120:       .prepare(
121:         `SELECT rv.product_id, p.title, MIN(v.price_cents) AS min_price_cents, MAX(rv.viewed_at) as viewed_at
122:          FROM recently_viewed rv
123:          JOIN products p ON p.id = rv.product_id
124:          JOIN product_variants v ON v.product_id = p.id
125:          WHERE rv.session_id = ?
126:          GROUP BY rv.product_id
127:          ORDER BY viewed_at DESC
128:          LIMIT 20`
129:       )
130:       .all(sessionId);
131: 
132:   return rows.map((row) => ({
133:     productId: row.product_id,
134:     title: row.title,
135:     minPrice: row.min_price_cents / 100,
136:     viewedAt: row.viewed_at
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- SQL queries is used in this section.
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
| 8 | SQL | Runs database read/write statements. |
| 9 | SQL | Runs database read/write statements. |
| 30 | SQL | Runs database read/write statements. |
| 31 | SQL | Runs database read/write statements. |
| 37 | .forEach() | Runs side effects for each item and returns undefined. |
| 39 | SQL | Runs database read/write statements. |
| 43 | SQL | Runs database read/write statements. |
| 51 | SQL | Runs database read/write statements. |
| 52 | SQL | Runs database read/write statements. |
| 55 | SQL | Runs database read/write statements. |
| 58 | SQL | Runs database read/write statements. |
| 59 | SQL | Runs database read/write statements. |
| 66 | SQL | Runs database read/write statements. |
| 69 | SQL | Runs database read/write statements. |
| 73 | SQL | Runs database read/write statements. |
| 85 | SQL | Runs database read/write statements. |
| 86 | SQL | Runs database read/write statements. |
| 95 | .map() | Transforms each item and returns a new array of the same length. |
| 108 | SQL | Runs database read/write statements. |
| 109 | SQL | Runs database read/write statements. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
