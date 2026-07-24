# Guide: src/components/OrdersPage.js
**Role in the system**: Interactive UI component that owns local state, user events, and frontend data fetching/rendering.
**Key concepts you'll learn**:
- .map()
- async/await
- React state
- React effects
**Prerequisites**:
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 3-5
```js
3: import { useEffect, useState } from "react";
4: import { apiRequest } from "@/lib/client-api";
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

### Section 2: Lines 6-124
```js
6: export default function OrdersPageView() {
7:   const [orders, setOrders] = useState([]);
8:   const [view, setView] = useState("buyer");
9:   const [error, setError] = useState("");
10:   const [success, setSuccess] = useState("");
11: 
12:   async function loadOrders(nextView = view) {
13:     try {
14:       setError("");
15:       const data = await apiRequest(`/api/orders?view=${nextView}`);
16:       setOrders(data.orders || []);
17:     } catch (requestError) {
18:       setError(requestError.message);
19:       setOrders([]);
20:     }
21:   }
22: 
23:   useEffect(() => {
24:     loadOrders(view);
25:   }, [view]);
26: 
27:   async function createDispute(orderId) {
28:     try {
29:       await apiRequest("/api/orders", {
30:         method: "POST",
31:         body: JSON.stringify({
32:           orderId,
33:           reason: "Package issue - please review"
34:         })
35:       });
36:       setSuccess(`Dispute created for order ${orderId}`);
37:     } catch (requestError) {
38:       setError(requestError.message);
39:     }
... (truncated for guide readability)
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `await` yields execution until the Promise settles.
- Note: React state updates should be immutable to trigger re-renders reliably.
- React effects is used in this section.

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
| 14 | state update | Triggers React re-render with a new state value. |
| 15 | async/await | Waits for Promises in readable sequential style. |
| 16 | state update | Triggers React re-render with a new state value. |
| 18 | state update | Triggers React re-render with a new state value. |
| 19 | state update | Triggers React re-render with a new state value. |
| 27 | async/await | Waits for Promises in readable sequential style. |
| 29 | async/await | Waits for Promises in readable sequential style. |
| 36 | state update | Triggers React re-render with a new state value. |
| 38 | state update | Triggers React re-render with a new state value. |
| 42 | async/await | Waits for Promises in readable sequential style. |
| 44 | async/await | Waits for Promises in readable sequential style. |
| 54 | state update | Triggers React re-render with a new state value. |
| 57 | state update | Triggers React re-render with a new state value. |
| 68 | state update | Triggers React re-render with a new state value. |
| 80 | .map() | Transforms each item and returns a new array of the same length. |
| 93 | .map() | Transforms each item and returns a new array of the same length. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
