# Guide: src/app/api/seller/products/route.js
**Role in the system**: API boundary for one HTTP endpoint. It validates input, calls domain logic, and shapes the HTTP response.
**Key concepts you'll learn**:
- async/await
**Prerequisites**:
- Read `src/lib/http.js.guide.md` first for response helpers.
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 2-5
```js
2: import { jsonError, jsonOk } from "@/lib/http";
3: import { createProduct, listSellerProducts, updateProduct } from "@/lib/seller";
4: import { requireUser } from "@/lib/auth";
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

### Section 2: Lines 6-17
```js
6: export async function GET() {
7:   try {
8:     const user = await requireUser(["SELLER", "ADMIN"]);
9:     const products = listSellerProducts(user.id);
10:     const categories = getCategoryTree();
11: 
12:     return jsonOk({ products, categories });
13:   } catch (error) {
14:     return jsonError(error, error.status || 500);
15:   }
16: }
17: 
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

### Section 3: Lines 18-29
```js
18: export async function POST(request) {
19:   try {
20:     const user = await requireUser(["SELLER", "ADMIN"]);
21:     const body = await request.json();
22: 
23:     const product = createProduct({ sellerId: user.id, payload: body });
24:     return jsonOk({ product }, 201);
25:   } catch (error) {
26:     return jsonError(error, 400);
27:   }
28: }
29: 
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

### Section 4: Lines 30-47
```js
30: export async function PATCH(request) {
31:   try {
32:     const user = await requireUser(["SELLER", "ADMIN"]);
33:     const body = await request.json();
34: 
35:     const product = updateProduct({
36:       sellerId: user.id,
37:       productId: body.productId,
38:       payload: body
39:     });
40: 
41:     return jsonOk({ product });
42:   } catch (error) {
43:     return jsonError(error, 400);
44:   }
45: }
46: 
47: 
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
| 8 | async/await | Waits for Promises in readable sequential style. |
| 18 | async/await | Waits for Promises in readable sequential style. |
| 20 | async/await | Waits for Promises in readable sequential style. |
| 21 | async/await | Waits for Promises in readable sequential style. |
| 30 | async/await | Waits for Promises in readable sequential style. |
| 32 | async/await | Waits for Promises in readable sequential style. |
| 33 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
