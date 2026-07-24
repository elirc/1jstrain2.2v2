# Guide: src/components/AdminPage.js
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

### Section 2: Lines 6-131
```js
6: export default function AdminPageView() {
7:   const [dashboard, setDashboard] = useState(null);
8:   const [error, setError] = useState("");
9:   const [success, setSuccess] = useState("");
10: 
11:   async function loadDashboard() {
12:     try {
13:       const data = await apiRequest("/api/admin/analytics");
14:       setDashboard(data.dashboard);
15:       setError("");
16:     } catch (requestError) {
17:       setError(requestError.message);
18:     }
19:   }
20: 
21:   useEffect(() => {
22:     loadDashboard();
23:   }, []);
24: 
25:   async function updateSeller(sellerId, status) {
26:     try {
27:       await apiRequest("/api/admin/sellers", {
28:         method: "PATCH",
29:         body: JSON.stringify({ sellerId, status })
30:       });
31:       setSuccess(`Seller ${sellerId} ${status.toLowerCase()}.`);
32:       loadDashboard();
33:     } catch (requestError) {
34:       setError(requestError.message);
35:     }
36:   }
37: 
38:   async function updateDispute(disputeId, status) {
39:     try {
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
| 11 | async/await | Waits for Promises in readable sequential style. |
| 13 | async/await | Waits for Promises in readable sequential style. |
| 14 | state update | Triggers React re-render with a new state value. |
| 15 | state update | Triggers React re-render with a new state value. |
| 17 | state update | Triggers React re-render with a new state value. |
| 25 | async/await | Waits for Promises in readable sequential style. |
| 27 | async/await | Waits for Promises in readable sequential style. |
| 31 | state update | Triggers React re-render with a new state value. |
| 34 | state update | Triggers React re-render with a new state value. |
| 38 | async/await | Waits for Promises in readable sequential style. |
| 40 | async/await | Waits for Promises in readable sequential style. |
| 44 | state update | Triggers React re-render with a new state value. |
| 47 | state update | Triggers React re-render with a new state value. |
| 75 | .map() | Transforms each item and returns a new array of the same length. |
| 98 | .map() | Transforms each item and returns a new array of the same length. |
| 118 | .map() | Transforms each item and returns a new array of the same length. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
