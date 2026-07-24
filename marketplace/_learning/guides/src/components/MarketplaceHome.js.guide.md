# Guide: src/components/MarketplaceHome.js
**Role in the system**: Interactive UI component that owns local state, user events, and frontend data fetching/rendering.
**Key concepts you'll learn**:
- .map()
- .forEach()
- .flatMap()
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
3: import Link from "next/link";
4: import { useEffect, useMemo, useState } from "react";
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

### Section 2: Lines 7-16
```js
7: const DEFAULT_FILTERS = {
8:   q: "",
9:   category: "",
10:   minPrice: "",
11:   maxPrice: "",
12:   minRating: "",
13:   shipping: "",
14:   sort: "relevance"
15: };
16: 
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

### Section 3: Lines 17-28
```js
17: function buildQuery(filters, cursor) {
18:   const params = new URLSearchParams({ cursor: String(cursor), limit: "12" });
19: 
20:   Object.entries(filters).forEach(([key, value]) => {
21:     if (value !== "") {
22:       params.set(key, value);
23:     }
24:   });
25: 
26:   return params.toString();
27: }
28: 
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

> **Concept callouts:**
- .forEach() is used in this section.
- Object.entries/fromEntries is used in this section.

**What would happen if...** What if we remove this block entirely? Trace callers and consumers first, because other parts of the app likely depend on this contract.

**Extra example**:
```js
const filters = { q: '', minPrice: 0, sort: 'newest' };
const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
```

### Section 4: Lines 29-202
```js
29: export default function MarketplaceHome() {
30:   const [filters, setFilters] = useState(DEFAULT_FILTERS);
31:   const [products, setProducts] = useState([]);
32:   const [categories, setCategories] = useState([]);
33:   const [facets, setFacets] = useState({ categories: {}, shipping: {}, priceBuckets: {} });
34:   const [cursor, setCursor] = useState(0);
35:   const [nextCursor, setNextCursor] = useState(null);
36:   const [loading, setLoading] = useState(true);
37:   const [error, setError] = useState("");
38:   const [recentlyViewed, setRecentlyViewed] = useState([]);
39: 
40:   async function loadCatalog(next = 0, append = false) {
41:     setLoading(true);
42:     setError("");
43: 
44:     try {
45:       const query = buildQuery(filters, next);
46:       const data = await apiRequest(`/api/catalog?${query}`);
47: 
48:       setProducts((current) => (append ? [...current, ...data.products] : data.products));
49:       setCursor(next);
50:       setNextCursor(data.nextCursor);
51:       setCategories(data.categories || []);
52:       setFacets(data.facets || { categories: {}, shipping: {}, priceBuckets: {} });
53:     } catch (requestError) {
54:       setError(requestError.message);
55:     } finally {
56:       setLoading(false);
57:     }
58:   }
59: 
60:   useEffect(() => {
61:     loadCatalog(0, false);
62:   }, [filters]);
... (truncated for guide readability)
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

> **Concept callouts:**
- Note: `.map()` returns a new array with the same length.
- .flatMap() is used in this section.
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
| 20 | .forEach() | Runs side effects for each item and returns undefined. |
| 40 | async/await | Waits for Promises in readable sequential style. |
| 41 | state update | Triggers React re-render with a new state value. |
| 42 | state update | Triggers React re-render with a new state value. |
| 46 | async/await | Waits for Promises in readable sequential style. |
| 48 | state update | Triggers React re-render with a new state value. |
| 49 | state update | Triggers React re-render with a new state value. |
| 50 | state update | Triggers React re-render with a new state value. |
| 51 | state update | Triggers React re-render with a new state value. |
| 52 | state update | Triggers React re-render with a new state value. |
| 54 | state update | Triggers React re-render with a new state value. |
| 56 | state update | Triggers React re-render with a new state value. |
| 66 | state update | Triggers React re-render with a new state value. |
| 67 | state update | Triggers React re-render with a new state value. |
| 72 | .flatMap() | Maps items then flattens one level. |
| 81 | .map() | Transforms each item and returns a new array of the same length. |
| 103 | .map() | Transforms each item and returns a new array of the same length. |
| 149 | .map() | Transforms each item and returns a new array of the same length. |
| 156 | .map() | Transforms each item and returns a new array of the same length. |
| 190 | .map() | Transforms each item and returns a new array of the same length. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
