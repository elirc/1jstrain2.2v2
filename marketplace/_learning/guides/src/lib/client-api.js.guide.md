# Guide: src/lib/client-api.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- async/await
- object spread
**Prerequisites**:
- No hard prerequisites. You can read this guide directly.

## Line-by-Line Walkthrough

### Section 1: Lines 1-19
```js
1: export async function apiRequest(path, options = {}) {
2:   const response = await fetch(path, {
3:     headers: {
4:       "Content-Type": "application/json",
5:       ...(options.headers || {})
6:     },
7:     ...options
8:   });
9: 
10:   const data = await response.json().catch(() => ({}));
11: 
12:   if (!response.ok) {
13:     throw new Error(data.error || "Request failed");
14:   }
15: 
16:   return data;
17: }
18: 
19: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

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

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| 1 | async/await | Waits for Promises in readable sequential style. |
| 2 | async/await | Waits for Promises in readable sequential style. |
| 10 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
