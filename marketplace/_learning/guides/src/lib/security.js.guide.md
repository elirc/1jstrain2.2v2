# Guide: src/lib/security.js
**Role in the system**: Shared server-side domain logic used by routes and components to keep business rules centralized.
**Key concepts you'll learn**:
- control flow
- module boundaries
**Prerequisites**:
- No hard prerequisites. You can read this guide directly.

## Line-by-Line Walkthrough

### Section 1: Lines 3-8
```js
3: export function hashPassword(password) {
4:   const salt = randomBytes(16).toString("hex");
5:   const hash = scryptSync(password, salt, 64).toString("hex");
6:   return `${salt}:${hash}`;
7: }
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

### Section 2: Lines 9-25
```js
9: export function verifyPassword(password, storedValue) {
10:   if (!storedValue || !storedValue.includes(":")) {
11:     return false;
12:   }
13: 
14:   const [salt, storedHash] = storedValue.split(":");
15:   const computedHash = scryptSync(password, salt, 64).toString("hex");
16:   const storedBuffer = Buffer.from(storedHash, "hex");
17:   const computedBuffer = Buffer.from(computedHash, "hex");
18: 
19:   if (storedBuffer.length !== computedBuffer.length) {
20:     return false;
21:   }
22: 
23:   return timingSafeEqual(storedBuffer, computedBuffer);
24: }
25: 
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

### Section 3: Lines 26-29
```js
26: export function generateToken(size = 48) {
27:   return randomBytes(size).toString("hex");
28: }
29: 
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

### Section 4: Lines 30-37
```js
30: export function toCents(value) {
31:   const numeric = Number(value);
32:   if (!Number.isFinite(numeric)) {
33:     return 0;
34:   }
35:   return Math.round(numeric * 100);
36: }
37: 
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

### Section 5: Lines 38-41
```js
38: export function centsToMoney(cents) {
39:   return Number((cents / 100).toFixed(2));
40: }
41: 
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

### Section 6: Lines 42-47
```js
42: export function generateOrderNumber() {
43:   const stamp = Date.now().toString().slice(-8);
44:   const entropy = randomBytes(3).toString("hex").toUpperCase();
45:   return `ORD-${stamp}-${entropy}`;
46: }
47: 
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

### Section 7: Lines 48-52
```js
48: export function nowIso() {
49:   return new Date().toISOString();
50: }
51: 
52: 
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

## Concepts Summary
| Line(s) | Concept | Quick Explanation |
|---------|---------|-------------------|
| n/a | module structure | This file mostly wires exports/imports and delegates behavior. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
