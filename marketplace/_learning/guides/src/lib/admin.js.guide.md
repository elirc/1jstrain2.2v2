# Guide: src/lib/admin.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- .map()
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

### Section 2: Lines 4-56
```js
4: export function getAdminDashboard() {
5:   const db = getDb();
6:   const gmvRow = db.prepare("SELECT COALESCE(SUM(total_cents), 0) AS gmv_cents FROM orders WHERE payment_status = 'PAID'").get();
7:   const feeRow = db.prepare("SELECT COALESCE(SUM(fee_cents), 0) AS fee_cents FROM transactions WHERE type = 'ORDER_CHARGE'").get();
8:   const topSellers = db
9:     .prepare(
10:       `SELECT s.name AS store_name, s.seller_id, COALESCE(SUM(o.total_cents), 0) AS sales_cents
11:        FROM stores s
12:        LEFT JOIN orders o ON o.seller_id = s.seller_id
13:        GROUP BY s.id
14:        ORDER BY sales_cents DESC
15:        LIMIT 10`
16:     )
17:     .all()
18:     .map((row) => ({ ...row, sales: row.sales_cents / 100 }));
19: 
20:   const pendingSellers = db
21:     .prepare(
22:       `SELECT sp.user_id, u.name, u.email, sp.created_at
23:        FROM seller_profiles sp
24:        JOIN users u ON u.id = sp.user_id
25:        WHERE sp.application_status = 'PENDING'
26:        ORDER BY sp.created_at ASC`
27:     )
28:     .all();
29: 
30:   const disputes = db
31:     .prepare(
32:       `SELECT d.id, d.order_id, d.reason, d.status, d.created_at,
33:               ru.name AS raised_by_name, au.name AS against_name
34:        FROM disputes d
35:        JOIN users ru ON ru.id = d.raised_by
36:        LEFT JOIN users au ON au.id = d.against_user
37:        WHERE d.status IN ('OPEN', 'IN_REVIEW')
... (truncated for guide readability)
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

### Section 3: Lines 57-85
```js
57: export function updateSellerApplication({ adminId, sellerId, status, rejectedReason = "" }) {
58:   const db = getDb();
59:   const allowed = ["APPROVED", "REJECTED"];
60: 
61:   if (!allowed.includes(status)) {
62:     throw new Error("Invalid seller application status");
63:   }
64: 
65:   const updatedAt = nowIso();
66: 
67:   db.prepare(
68:     `UPDATE seller_profiles
69:      SET application_status = ?, approved_at = CASE WHEN ? = 'APPROVED' THEN ? ELSE approved_at END,
70:          rejected_reason = CASE WHEN ? = 'REJECTED' THEN ? ELSE '' END
71:      WHERE user_id = ?`
72:   ).run(status, status, updatedAt, status, rejectedReason, Number(sellerId));
73: 
74:   db.prepare(
75:     "INSERT INTO notifications(user_id, type, message, read, meta_json, created_at) VALUES(?, 'SELLER_APPLICATION', ?, 0, ?, ?)"
76:   ).run(
77:     Number(sellerId),
78:     `Your seller application is ${status.toLowerCase()}`,
79:     JSON.stringify({ reviewedBy: adminId }),
80:     updatedAt
81:   );
82: 
83:   return db.prepare("SELECT * FROM seller_profiles WHERE user_id = ?").get(Number(sellerId));
84: }
85: 
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

### Section 4: Lines 86-112
```js
86: export function resolveDispute({ adminId, disputeId, status, note }) {
87:   const db = getDb();
88:   const allowed = ["RESOLVED", "REJECTED", "IN_REVIEW"];
89: 
90:   if (!allowed.includes(status)) {
91:     throw new Error("Invalid dispute status");
92:   }
93: 
94:   db.prepare(
95:     "UPDATE disputes SET status = ?, resolution_note = ?, updated_at = ? WHERE id = ?"
96:   ).run(status, note || "", nowIso(), Number(disputeId));
97: 
98:   const dispute = db.prepare("SELECT * FROM disputes WHERE id = ?").get(Number(disputeId));
99: 
100:   db.prepare(
101:     "INSERT INTO notifications(user_id, type, message, read, meta_json, created_at) VALUES(?, 'DISPUTE_UPDATE', ?, 0, ?, ?)"
102:   ).run(
103:     dispute.raised_by,
104:     `Dispute #${dispute.id} is now ${status}`,
105:     JSON.stringify({ disputeId: dispute.id, reviewedBy: adminId }),
106:     nowIso()
107:   );
108: 
109:   return dispute;
110: }
111: 
112: 
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
| 6 | SQL | Runs database read/write statements. |
| 7 | SQL | Runs database read/write statements. |
| 9 | SQL | Runs database read/write statements. |
| 10 | SQL | Runs database read/write statements. |
| 18 | .map() | Transforms each item and returns a new array of the same length. |
| 21 | SQL | Runs database read/write statements. |
| 22 | SQL | Runs database read/write statements. |
| 31 | SQL | Runs database read/write statements. |
| 32 | SQL | Runs database read/write statements. |
| 67 | SQL | Runs database read/write statements. |
| 68 | SQL | Runs database read/write statements. |
| 74 | SQL | Runs database read/write statements. |
| 75 | SQL | Runs database read/write statements. |
| 83 | SQL | Runs database read/write statements. |
| 94 | SQL | Runs database read/write statements. |
| 95 | SQL | Runs database read/write statements. |
| 98 | SQL | Runs database read/write statements. |
| 100 | SQL | Runs database read/write statements. |
| 101 | SQL | Runs database read/write statements. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
