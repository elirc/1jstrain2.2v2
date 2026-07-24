# Guide: src/app/api/seller/orders/route.js
**Role in the system**: API boundary for one HTTP endpoint. It validates input, calls domain logic, and shapes the HTTP response.
**Key concepts you'll learn**:
- async/await
**Prerequisites**:
- Read `src/lib/http.js.guide.md` first for response helpers.
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 2-4
```js
2: import { jsonError, jsonOk } from "@/lib/http";
3: import { listOrdersForSeller, updateOrderStatus } from "@/lib/orders";
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

### Section 2: Lines 5-14
```js
5: export async function GET() {
6:   try {
7:     const user = await requireUser(["SELLER", "ADMIN"]);
8:     const orders = listOrdersForSeller(user.id);
9:     return jsonOk({ orders });
10:   } catch (error) {
11:     return jsonError(error, error.status || 500);
12:   }
13: }
14: 
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

### Section 3: Lines 15-33
```js
15: export async function PATCH(request) {
16:   try {
17:     const user = await requireUser(["SELLER", "ADMIN"]);
18:     const body = await request.json();
19: 
20:     const order = updateOrderStatus({
21:       sellerId: user.id,
22:       orderId: body.orderId,
23:       status: body.status,
24:       trackingNumber: body.trackingNumber
25:     });
26: 
27:     return jsonOk({ order });
28:   } catch (error) {
29:     return jsonError(error, error.status || 400);
30:   }
31: }
32: 
33: 
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
| 5 | async/await | Waits for Promises in readable sequential style. |
| 7 | async/await | Waits for Promises in readable sequential style. |
| 15 | async/await | Waits for Promises in readable sequential style. |
| 17 | async/await | Waits for Promises in readable sequential style. |
| 18 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
