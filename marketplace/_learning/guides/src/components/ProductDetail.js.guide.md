# Guide: src/components/ProductDetail.js
**Role in the system**: Interactive UI component that owns local state, user events, and frontend data fetching/rendering.
**Key concepts you'll learn**:
- .map()
- .find()
- optional chaining
- async/await
- React state
- React effects
- object spread
- destructuring
**Prerequisites**:
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 3-6
```js
3: import { useEffect, useMemo, useState } from "react";
4: import { useRouter } from "next/navigation";
5: import { apiRequest } from "@/lib/client-api";
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

### Section 2: Lines 7-205
```js
7: export default function ProductDetail({ productId }) {
8:   const router = useRouter();
9:   const [product, setProduct] = useState(null);
10:   const [selectedVariantId, setSelectedVariantId] = useState("");
11:   const [quantity, setQuantity] = useState(1);
12:   const [message, setMessage] = useState("");
13:   const [error, setError] = useState("");
14:   const [reviewVoteLoading, setReviewVoteLoading] = useState(null);
15: 
16:   async function loadProduct() {
17:     try {
18:       setError("");
19:       const data = await apiRequest(`/api/products/${productId}`);
20:       setProduct(data.product);
21:       setSelectedVariantId(String(data.product.variants?.[0]?.id || ""));
22:     } catch (requestError) {
23:       setError(requestError.message);
24:     }
25:   }
26: 
27:   useEffect(() => {
28:     loadProduct();
29:   }, [productId]);
30: 
31:   const selectedVariant = useMemo(
32:     () => product?.variants?.find((variant) => String(variant.id) === String(selectedVariantId)),
33:     [product, selectedVariantId]
34:   );
35: 
36:   async function addToCart() {
37:     if (!selectedVariantId) {
38:       setError("Pick a variant first");
39:       return;
40:     }
... (truncated for guide readability)
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- .find() is used in this section.
- optional chaining is used in this section.
- Note: `await` yields execution until the Promise settles.
- Note: React state updates should be immutable to trigger re-renders reliably.

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
| 16 | async/await | Waits for Promises in readable sequential style. |
| 18 | state update | Triggers React re-render with a new state value. |
| 19 | async/await | Waits for Promises in readable sequential style. |
| 20 | state update | Triggers React re-render with a new state value. |
| 21 | optional chaining | Safely accesses nested values that might be null/undefined. |
| 23 | state update | Triggers React re-render with a new state value. |
| 32 | .find() | Returns the first matching item or undefined. |
| 36 | async/await | Waits for Promises in readable sequential style. |
| 38 | state update | Triggers React re-render with a new state value. |
| 43 | state update | Triggers React re-render with a new state value. |
| 44 | state update | Triggers React re-render with a new state value. |
| 45 | async/await | Waits for Promises in readable sequential style. |
| 53 | state update | Triggers React re-render with a new state value. |
| 56 | state update | Triggers React re-render with a new state value. |
| 60 | async/await | Waits for Promises in readable sequential style. |
| 62 | async/await | Waits for Promises in readable sequential style. |
| 66 | state update | Triggers React re-render with a new state value. |
| 68 | state update | Triggers React re-render with a new state value. |
| 72 | async/await | Waits for Promises in readable sequential style. |
| 74 | state update | Triggers React re-render with a new state value. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
