# Guide: src/app/api/cart/route.js
**Role in the system**: API boundary for one HTTP endpoint. It validates input, calls domain logic, and shapes the HTTP response.
**Key concepts you'll learn**:
- optional chaining
- async/await
- object spread
- destructuring
**Prerequisites**:
- Read `src/lib/http.js.guide.md` first for response helpers.
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 2-4
```js
2: import { addCartItem, getCart, removeCartItem, updateCartItem } from "@/lib/cart";
3: import { jsonError, jsonOk } from "@/lib/http";
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
5: async function resolveIdentity() {
6:   const user = await getCurrentUser();
7:   const sessionId = await getOrCreateCartSessionId();
8: 
9:   return {
10:     userId: user?.id,
11:     sessionId
12:   };
13: }
14: 
```
**What it does**: This section contributes to the file control flow. Read it top-to-bottom and track inputs, transformations, and output contracts.

> **Concept callouts:**
- optional chaining is used in this section.
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

### Section 3: Lines 15-24
```js
15: export async function GET() {
16:   try {
17:     const identity = await resolveIdentity();
18:     const cart = getCart(identity);
19:     return jsonOk({ cart });
20:   } catch (error) {
21:     return jsonError(error, 500);
22:   }
23: }
24: 
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

### Section 4: Lines 25-42
```js
25: export async function POST(request) {
26:   try {
27:     const body = await request.json();
28:     const identity = await resolveIdentity();
29: 
30:     const cart = addCartItem({
31:       ...identity,
32:       productId: body.productId,
33:       variantId: body.variantId,
34:       quantity: body.quantity
35:     });
36: 
37:     return jsonOk({ cart });
38:   } catch (error) {
39:     return jsonError(error, 400);
40:   }
41: }
42: 
```
**What it does**: This handler receives an HTTP request, parses input, calls domain logic, and returns JSON. Keep an eye on `try/catch` so transport-level errors become clean API responses.

> **Concept callouts:**
- Note: `await` yields execution until the Promise settles.
- object spread is used in this section.

**What would happen if...** What if we remove `await` from this async call? The code continues with a Promise object instead of resolved data, causing subtle runtime bugs.

**Extra example**:
```js
async function loadUser(id) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
```

### Section 5: Lines 43-60
```js
43: export async function PATCH(request) {
44:   try {
45:     const body = await request.json();
46:     const identity = await resolveIdentity();
47: 
48:     const cart = updateCartItem({
49:       ...identity,
50:       itemId: body.itemId,
51:       quantity: body.quantity,
52:       savedForLater: body.savedForLater
53:     });
54: 
55:     return jsonOk({ cart });
56:   } catch (error) {
57:     return jsonError(error, 400);
58:   }
59: }
60: 
```
**What it does**: This handler receives an HTTP request, parses input, calls domain logic, and returns JSON. Keep an eye on `try/catch` so transport-level errors become clean API responses.

> **Concept callouts:**
- Note: `await` yields execution until the Promise settles.
- object spread is used in this section.

**What would happen if...** What if we remove `await` from this async call? The code continues with a Promise object instead of resolved data, causing subtle runtime bugs.

**Extra example**:
```js
async function loadUser(id) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
```

### Section 6: Lines 61-82
```js
61: export async function DELETE(request) {
62:   try {
63:     const { searchParams } = new URL(request.url);
64:     const identity = await resolveIdentity();
65:     const itemId = searchParams.get("itemId");
66: 
67:     if (!itemId) {
68:       return jsonError(new Error("itemId is required"), 400);
69:     }
70: 
71:     const cart = removeCartItem({
72:       ...identity,
73:       itemId
74:     });
75: 
76:     return jsonOk({ cart });
77:   } catch (error) {
78:     return jsonError(error, 400);
79:   }
80: }
81: 
82: 
```
**What it does**: This handler receives an HTTP request, parses input, calls domain logic, and returns JSON. Keep an eye on `try/catch` so transport-level errors become clean API responses.

> **Concept callouts:**
- Note: `await` yields execution until the Promise settles.
- object spread is used in this section.
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

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| 5 | async/await | Waits for Promises in readable sequential style. |
| 6 | async/await | Waits for Promises in readable sequential style. |
| 7 | async/await | Waits for Promises in readable sequential style. |
| 10 | optional chaining | Safely accesses nested values that might be null/undefined. |
| 15 | async/await | Waits for Promises in readable sequential style. |
| 17 | async/await | Waits for Promises in readable sequential style. |
| 25 | async/await | Waits for Promises in readable sequential style. |
| 27 | async/await | Waits for Promises in readable sequential style. |
| 28 | async/await | Waits for Promises in readable sequential style. |
| 43 | async/await | Waits for Promises in readable sequential style. |
| 45 | async/await | Waits for Promises in readable sequential style. |
| 46 | async/await | Waits for Promises in readable sequential style. |
| 61 | async/await | Waits for Promises in readable sequential style. |
| 64 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
