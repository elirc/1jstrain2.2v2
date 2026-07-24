# Guide: src/app/api/wishlist/route.js
**Role in the system**: API boundary for one HTTP endpoint. It validates input, calls domain logic, and shapes the HTTP response.
**Key concepts you'll learn**:
- async/await
**Prerequisites**:
- Read `src/lib/http.js.guide.md` first for response helpers.
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 2-4
```js
2: import { getWishlist, toggleWishlist } from "@/lib/engagement";
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

### Section 2: Lines 5-18
```js
5: export async function GET() {
6:   try {
7:     const user = await getCurrentUser();
8:     if (!user) {
9:       return jsonOk({ items: [] });
10:     }
11: 
12:     const items = getWishlist(user.id);
13:     return jsonOk({ items });
14:   } catch (error) {
15:     return jsonError(error, 500);
16:   }
17: }
18: 
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

### Section 3: Lines 19-34
```js
19: export async function POST(request) {
20:   try {
21:     const user = await getCurrentUser();
22:     if (!user) {
23:       return jsonError(new Error("Login required"), 401);
24:     }
25: 
26:     const body = await request.json();
27:     const result = toggleWishlist({ userId: user.id, productId: body.productId });
28:     return jsonOk(result);
29:   } catch (error) {
30:     return jsonError(error, 400);
31:   }
32: }
33: 
34: 
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
| 19 | async/await | Waits for Promises in readable sequential style. |
| 21 | async/await | Waits for Promises in readable sequential style. |
| 26 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
