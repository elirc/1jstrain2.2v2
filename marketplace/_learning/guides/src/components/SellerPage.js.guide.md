# Guide: src/components/SellerPage.js
**Role in the system**: Interactive UI component that owns local state, user events, and frontend data fetching/rendering.
**Key concepts you'll learn**:
- .map()
- optional chaining
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

### Section 2: Lines 6-14
```js
6: const DEFAULT_PRODUCT = {
7:   title: "",
8:   description: "",
9:   status: "ACTIVE",
10:   featured: false,
11:   variants: [{ sku: "", price: "", inventory: "", size: "", color: "", material: "" }],
12:   images: [""]
13: };
14: 
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

> **Concept callouts:**
- This block is mostly structural wiring (imports/export boundaries).

**What would happen if...** What if we remove this block entirely? Trace callers and consumers first, because other parts of the app likely depend on this contract.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 3: Lines 15-213
```js
15: export default function SellerPageView() {
16:   const [dashboard, setDashboard] = useState(null);
17:   const [error, setError] = useState("");
18:   const [success, setSuccess] = useState("");
19:   const [storeForm, setStoreForm] = useState({
20:     name: "",
21:     slug: "",
22:     description: "",
23:     shippingSpeedDays: 5,
24:     bio: ""
25:   });
26:   const [productForm, setProductForm] = useState(DEFAULT_PRODUCT);
27:   const [csvText, setCsvText] = useState("");
28: 
29:   async function loadDashboard() {
30:     try {
31:       const data = await apiRequest("/api/seller/dashboard");
32:       setDashboard(data.dashboard);
33:       setError("");
34: 
35:       if (data.dashboard.store) {
36:         setStoreForm({
37:           name: data.dashboard.store.name,
38:           slug: data.dashboard.store.slug,
39:           description: data.dashboard.store.description,
40:           shippingSpeedDays: data.dashboard.store.shipping_speed_days,
41:           bio: data.dashboard.profile?.bio || ""
42:         });
43:       }
44:     } catch (requestError) {
45:       setError(requestError.message);
46:     }
47:   }
48: 
... (truncated for guide readability)
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- optional chaining is used in this section.
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
| 29 | async/await | Waits for Promises in readable sequential style. |
| 31 | async/await | Waits for Promises in readable sequential style. |
| 32 | state update | Triggers React re-render with a new state value. |
| 33 | state update | Triggers React re-render with a new state value. |
| 36 | state update | Triggers React re-render with a new state value. |
| 41 | optional chaining | Safely accesses nested values that might be null/undefined. |
| 45 | state update | Triggers React re-render with a new state value. |
| 53 | async/await | Waits for Promises in readable sequential style. |
| 56 | async/await | Waits for Promises in readable sequential style. |
| 60 | state update | Triggers React re-render with a new state value. |
| 63 | state update | Triggers React re-render with a new state value. |
| 67 | async/await | Waits for Promises in readable sequential style. |
| 70 | async/await | Waits for Promises in readable sequential style. |
| 74 | state update | Triggers React re-render with a new state value. |
| 75 | state update | Triggers React re-render with a new state value. |
| 78 | state update | Triggers React re-render with a new state value. |
| 82 | async/await | Waits for Promises in readable sequential style. |
| 85 | async/await | Waits for Promises in readable sequential style. |
| 89 | state update | Triggers React re-render with a new state value. |
| 90 | state update | Triggers React re-render with a new state value. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
