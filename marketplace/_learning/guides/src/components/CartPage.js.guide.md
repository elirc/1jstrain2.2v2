# Guide: src/components/CartPage.js
**Role in the system**: Interactive UI component that owns local state, user events, and frontend data fetching/rendering.
**Key concepts you'll learn**:
- .map()
- async/await
- React state
- React effects
- object spread
**Prerequisites**:
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 3-6
```js
3: import Link from "next/link";
4: import { useEffect, useState } from "react";
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

### Section 2: Lines 7-141
```js
7: export default function CartPageView() {
8:   const [cart, setCart] = useState(null);
9:   const [error, setError] = useState("");
10:   const [loading, setLoading] = useState(true);
11: 
12:   async function loadCart() {
13:     setLoading(true);
14:     try {
15:       const data = await apiRequest("/api/cart");
16:       setCart(data.cart);
17:       setError("");
18:     } catch (requestError) {
19:       setError(requestError.message);
20:     } finally {
21:       setLoading(false);
22:     }
23:   }
24: 
25:   useEffect(() => {
26:     loadCart();
27:   }, []);
28: 
29:   async function patchItem(payload) {
30:     try {
31:       const data = await apiRequest("/api/cart", {
32:         method: "PATCH",
33:         body: JSON.stringify(payload)
34:       });
35:       setCart(data.cart);
36:     } catch (requestError) {
37:       setError(requestError.message);
38:     }
39:   }
40: 
... (truncated for guide readability)
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `await` yields execution until the Promise settles.
- Note: React state updates should be immutable to trigger re-renders reliably.
- React effects is used in this section.
- object spread is used in this section.

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
| 12 | async/await | Waits for Promises in readable sequential style. |
| 13 | state update | Triggers React re-render with a new state value. |
| 15 | async/await | Waits for Promises in readable sequential style. |
| 16 | state update | Triggers React re-render with a new state value. |
| 17 | state update | Triggers React re-render with a new state value. |
| 19 | state update | Triggers React re-render with a new state value. |
| 21 | state update | Triggers React re-render with a new state value. |
| 29 | async/await | Waits for Promises in readable sequential style. |
| 31 | async/await | Waits for Promises in readable sequential style. |
| 35 | state update | Triggers React re-render with a new state value. |
| 37 | state update | Triggers React re-render with a new state value. |
| 41 | async/await | Waits for Promises in readable sequential style. |
| 43 | async/await | Waits for Promises in readable sequential style. |
| 46 | state update | Triggers React re-render with a new state value. |
| 48 | state update | Triggers React re-render with a new state value. |
| 72 | .map() | Transforms each item and returns a new array of the same length. |
| 79 | .map() | Transforms each item and returns a new array of the same length. |
| 125 | .map() | Transforms each item and returns a new array of the same length. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
