# Guide: src/app/api/orders/route.js
**Role in the system**: API boundary for one HTTP endpoint. It validates input, calls domain logic, and shapes the HTTP response.
**Key concepts you'll learn**:
- async/await
- SQL queries
- destructuring
**Prerequisites**:
- Read `src/lib/http.js.guide.md` first for response helpers.
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 2-6
```js
2: import { getDb } from "@/lib/db";
3: import { jsonError, jsonOk } from "@/lib/http";
4: import { listOrdersForBuyer, listOrdersForSeller } from "@/lib/orders";
5: import { nowIso } from "@/lib/security";
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

### Section 2: Lines 7-25
```js
7: export async function GET(request) {
8:   try {
9:     const user = await requireUser(["BUYER", "SELLER", "ADMIN"]);
10:     const { searchParams } = new URL(request.url);
11:     const view = searchParams.get("view") || "buyer";
12: 
13:     if (view === "seller") {
14:       if (!["SELLER", "ADMIN"].includes(user.role)) {
15:         return jsonError(new Error("Forbidden"), 403);
16:       }
17:       return jsonOk({ orders: listOrdersForSeller(user.id) });
18:     }
19: 
20:     return jsonOk({ orders: listOrdersForBuyer(user.id) });
21:   } catch (error) {
22:     return jsonError(error, error.status || 500);
23:   }
24: }
25: 
```
**What it does**: This handler receives an HTTP request, parses input, calls domain logic, and returns JSON. Keep an eye on `try/catch` so transport-level errors become clean API responses.

> **Concept callouts:**
- Note: `await` yields execution until the Promise settles.
- destructuring is used in this section.

**What would happen if...** What if we remove `await` from this async call? The code continues with a Promise object instead of resolved data, causing subtle runtime bugs.

**Extra example**:
```js
async function loadUser(id) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
```

### Section 3: Lines 26-59
```js
26: export async function POST(request) {
27:   try {
28:     const user = await requireUser(["BUYER", "SELLER", "ADMIN"]);
29:     const body = await request.json();
30: 
31:     if (!body.orderId || !body.reason) {
32:       return jsonError(new Error("orderId and reason are required"), 400);
33:     }
34: 
35:     const db = getDb();
36:     const order = db.prepare("SELECT id, buyer_id, seller_id FROM orders WHERE id = ?").get(Number(body.orderId));
37: 
38:     if (!order) {
39:       return jsonError(new Error("Order not found"), 404);
40:     }
41: 
42:     if (user.role === "BUYER" && order.buyer_id !== user.id) {
43:       return jsonError(new Error("Forbidden"), 403);
44:     }
45: 
46:     const disputeInsert = db
47:       .prepare(
48:         `INSERT INTO disputes(order_id, raised_by, against_user, reason, status, resolution_note, created_at, updated_at)
49:          VALUES(?, ?, ?, ?, 'OPEN', '', ?, ?)`
50:       )
51:       .run(order.id, user.id, order.seller_id, body.reason, nowIso(), nowIso());
52: 
53:     return jsonOk({ disputeId: Number(disputeInsert.lastInsertRowid) }, 201);
54:   } catch (error) {
55:     return jsonError(error, error.status || 500);
56:   }
57: }
58: 
59: 
```
**What it does**: This handler receives an HTTP request, parses input, calls domain logic, and returns JSON. Keep an eye on `try/catch` so transport-level errors become clean API responses.

> **Concept callouts:**
- Note: `await` yields execution until the Promise settles.
- SQL queries is used in this section.

**What would happen if...** What if we remove `await` from this async call? The code continues with a Promise object instead of resolved data, causing subtle runtime bugs.

**Extra example**:
```js
async function loadUser(id) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
```

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| 7 | async/await | Waits for Promises in readable sequential style. |
| 9 | async/await | Waits for Promises in readable sequential style. |
| 26 | async/await | Waits for Promises in readable sequential style. |
| 28 | async/await | Waits for Promises in readable sequential style. |
| 29 | async/await | Waits for Promises in readable sequential style. |
| 36 | SQL | Runs database read/write statements. |
| 47 | SQL | Runs database read/write statements. |
| 48 | SQL | Runs database read/write statements. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
