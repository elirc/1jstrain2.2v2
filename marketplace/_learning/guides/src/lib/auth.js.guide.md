# Guide: src/lib/auth.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- optional chaining
- async/await
- SQL queries
**Prerequisites**:
- No hard prerequisites. You can read this guide directly.

## Line-by-Line Walkthrough

### Section 1: Lines 2-4
```js
2: import { getDb } from "@/lib/db";
3: import { generateToken, nowIso } from "@/lib/security";
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

### Section 2: Lines 5-5
```js
5: const SESSION_COOKIE = "market_session";
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

### Section 3: Lines 6-6
```js
6: const CART_SESSION_COOKIE = "market_cart_session";
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

### Section 4: Lines 7-8
```js
7: const SESSION_TTL_DAYS = 14;
8: 
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

### Section 5: Lines 9-14
```js
9: function sessionExpiryIso() {
10:   const expiresAt = new Date();
11:   expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
12:   return expiresAt.toISOString();
13: }
14: 
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

### Section 6: Lines 15-18
```js
15: export function getSessionCookieName() {
16:   return SESSION_COOKIE;
17: }
18: 
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

### Section 7: Lines 19-22
```js
19: export function getCartSessionCookieName() {
20:   return CART_SESSION_COOKIE;
21: }
22: 
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

### Section 8: Lines 23-57
```js
23: export async function getCurrentUser() {
24:   const store = await cookies();
25:   const token = store.get(SESSION_COOKIE)?.value;
26: 
27:   if (!token) {
28:     return null;
29:   }
30: 
31:   const db = getDb();
32:   const row = db
33:     .prepare(
34:       `SELECT u.id, u.email, u.role, u.name, s.expires_at
35:        FROM sessions s
36:        JOIN users u ON u.id = s.user_id
37:        WHERE s.token = ?`
38:     )
39:     .get(token);
40: 
41:   if (!row) {
42:     return null;
43:   }
44: 
45:   if (new Date(row.expires_at).getTime() < Date.now()) {
46:     db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
47:     return null;
48:   }
49: 
50:   return {
51:     id: row.id,
52:     email: row.email,
53:     role: row.role,
54:     name: row.name
55:   };
56: }
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- optional chaining is used in this section.
- Note: `await` yields execution until the Promise settles.
- SQL queries is used in this section.

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
| 11 | state update | Triggers React re-render with a new state value. |
| 23 | async/await | Waits for Promises in readable sequential style. |
| 24 | async/await | Waits for Promises in readable sequential style. |
| 25 | optional chaining | Safely accesses nested values that might be null/undefined. |
| 33 | SQL | Runs database read/write statements. |
| 34 | SQL | Runs database read/write statements. |
| 46 | SQL | Runs database read/write statements. |
| 58 | async/await | Waits for Promises in readable sequential style. |
| 59 | async/await | Waits for Promises in readable sequential style. |
| 82 | SQL | Runs database read/write statements. |
| 92 | async/await | Waits for Promises in readable sequential style. |
| 93 | async/await | Waits for Promises in readable sequential style. |
| 103 | async/await | Waits for Promises in readable sequential style. |
| 104 | async/await | Waits for Promises in readable sequential style. |
| 105 | optional chaining | Safely accesses nested values that might be null/undefined. |
| 109 | SQL | Runs database read/write statements. |
| 115 | async/await | Waits for Promises in readable sequential style. |
| 116 | async/await | Waits for Promises in readable sequential style. |
| 117 | optional chaining | Safely accesses nested values that might be null/undefined. |
| 125 | state update | Triggers React re-render with a new state value. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
