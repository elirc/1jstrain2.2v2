# Guide: src/lib/http.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- optional chaining
**Prerequisites**:
- No hard prerequisites. You can read this guide directly.

## Line-by-Line Walkthrough

### Section 1: Lines 3-6
```js
3: export function jsonOk(data, status = 200) {
4:   return NextResponse.json(data, { status });
5: }
6: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- This block is mostly structural wiring (imports/export boundaries).

**What would happen if...** What if we remove this block entirely? Trace callers and consumers first, because other parts of the app likely depend on this contract.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 2: Lines 7-12
```js
7: export function jsonError(error, fallbackStatus = 400) {
8:   const status = error?.status || fallbackStatus;
9:   return NextResponse.json({ error: error?.message || "Request failed" }, { status });
10: }
11: 
12: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- optional chaining is used in this section.

**What would happen if...** What if we remove this block entirely? Trace callers and consumers first, because other parts of the app likely depend on this contract.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| 8 | optional chaining | Safely accesses nested values that might be null/undefined. |
| 9 | optional chaining | Safely accesses nested values that might be null/undefined. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
