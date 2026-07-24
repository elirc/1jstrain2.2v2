# Guide: src/components/CheckoutPage.js
**Role in the system**: Interactive UI component that owns local state, user events, and frontend data fetching/rendering.
**Key concepts you'll learn**:
- .map()
- .reduce()
- Object.entries/fromEntries
- async/await
- React state
- React effects
- object spread
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

### Section 2: Lines 7-8
```js
7: const STEPS = ["Address", "Shipping", "Payment", "Review"];
8: 
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

### Section 3: Lines 9-241
```js
9: export default function CheckoutPageView() {
10:   const router = useRouter();
11:   const [step, setStep] = useState(0);
12:   const [cart, setCart] = useState(null);
13:   const [error, setError] = useState("");
14:   const [success, setSuccess] = useState("");
15:   const [submitting, setSubmitting] = useState(false);
16:   const [form, setForm] = useState({
17:     address: {
18:       fullName: "",
19:       line1: "",
20:       line2: "",
21:       city: "",
22:       region: "CA",
23:       postalCode: "",
24:       country: "US",
25:       phone: ""
26:     },
27:     shippingBySeller: {},
28:     payment: {
29:       method: "card",
30:       cardName: "",
31:       cardLast4: "4242"
32:     },
33:     discountCode: ""
34:   });
35: 
36:   useEffect(() => {
37:     apiRequest("/api/cart")
38:       .then((data) => {
39:         setCart(data.cart);
40:         const shippingDefaults = Object.fromEntries(
41:           data.cart.sellers.map((seller) => [seller.sellerId, 7.99])
42:         );
... (truncated for guide readability)
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- Note: `.reduce()` combines many items into one accumulator value.
- Object.entries/fromEntries is used in this section.
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
| 39 | state update | Triggers React re-render with a new state value. |
| 40 | Object.entries()/fromEntries() | Converts object key/value pairs to and from arrays. |
| 41 | .map() | Transforms each item and returns a new array of the same length. |
| 43 | state update | Triggers React re-render with a new state value. |
| 45 | state update | Triggers React re-render with a new state value. |
| 54 | .reduce() | Accumulates array items into one value. |
| 64 | state update | Triggers React re-render with a new state value. |
| 73 | async/await | Waits for Promises in readable sequential style. |
| 75 | state update | Triggers React re-render with a new state value. |
| 76 | state update | Triggers React re-render with a new state value. |
| 77 | async/await | Waits for Promises in readable sequential style. |
| 87 | state update | Triggers React re-render with a new state value. |
| 88 | state update | Triggers React re-render with a new state value. |
| 92 | state update | Triggers React re-render with a new state value. |
| 94 | state update | Triggers React re-render with a new state value. |
| 152 | .map() | Transforms each item and returns a new array of the same length. |
| 161 | state update | Triggers React re-render with a new state value. |
| 184 | state update | Triggers React re-render with a new state value. |
| 198 | state update | Triggers React re-render with a new state value. |
| 209 | state update | Triggers React re-render with a new state value. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
