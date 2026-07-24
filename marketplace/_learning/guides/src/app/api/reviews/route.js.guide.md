# Guide: src/app/api/reviews/route.js
**Role in the system**: API boundary for one HTTP endpoint. It validates input, calls domain logic, and shapes the HTTP response.
**Key concepts you'll learn**:
- async/await
- SQL queries
- destructuring
**Prerequisites**:
- Read `src/lib/http.js.guide.md` first for response helpers.
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 2-5
```js
2: import { getDb } from "@/lib/db";
3: import { createReview } from "@/lib/engagement";
4: import { jsonError, jsonOk } from "@/lib/http";
5: 
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

### Section 2: Lines 6-31
```js
6: export async function GET(request) {
7:   try {
8:     const { searchParams } = new URL(request.url);
9:     const productId = searchParams.get("productId");
10: 
11:     if (!productId) {
12:       return jsonError(new Error("productId is required"), 400);
13:     }
14: 
15:     const db = getDb();
16:     const reviews = db
17:       .prepare(
18:         `SELECT r.id, r.rating, r.title, r.body, r.seller_response, r.helpful_count, r.created_at, u.name as buyer_name
19:          FROM reviews r
20:          JOIN users u ON u.id = r.buyer_id
21:          WHERE r.product_id = ?
22:          ORDER BY r.created_at DESC`
23:       )
24:       .all(Number(productId));
25: 
26:     return jsonOk({ reviews });
27:   } catch (error) {
28:     return jsonError(error, 500);
29:   }
30: }
31: 
```
**What it does**: This handler receives an HTTP request, parses input, calls domain logic, and returns JSON. Keep an eye on `try/catch` so transport-level errors become clean API responses.

> **Concept callouts:**
- Note: `await` yields execution until the Promise settles.
- SQL queries is used in this section.
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

### Section 3: Lines 32-48
```js
32: export async function POST(request) {
33:   try {
34:     const user = await requireUser(["BUYER", "ADMIN", "SELLER"]);
35:     const body = await request.json();
36: 
37:     const review = createReview({
38:       userId: user.id,
39:       payload: body
40:     });
41: 
42:     return jsonOk({ review }, 201);
43:   } catch (error) {
44:     return jsonError(error, error.status || 400);
45:   }
46: }
47: 
48: 
```
**What it does**: This handler receives an HTTP request, parses input, calls domain logic, and returns JSON. Keep an eye on `try/catch` so transport-level errors become clean API responses.

> **Concept callouts:**
- Note: `await` yields execution until the Promise settles.

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
| 6 | async/await | Waits for Promises in readable sequential style. |
| 17 | SQL | Runs database read/write statements. |
| 18 | SQL | Runs database read/write statements. |
| 32 | async/await | Waits for Promises in readable sequential style. |
| 34 | async/await | Waits for Promises in readable sequential style. |
| 35 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
