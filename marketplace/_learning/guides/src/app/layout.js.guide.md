# Guide: src/app/layout.js
**Role in the system**: App shell composition file that mounts global UI and initializes shared services.
**Key concepts you'll learn**:
- destructuring
**Prerequisites**:
- No hard prerequisites. You can read this guide directly.

## Line-by-Line Walkthrough

### Section 1: Lines 2-4
```js
2: import NavBar from "@/components/NavBar";
3: import { getDb } from "@/lib/db";
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

### Section 2: Lines 5-9
```js
5: export const metadata = {
6:   title: "MarketForge - Multi Vendor Marketplace",
7:   description: "Shopify meets Etsy marketplace MVP built with Next.js and SQLite."
8: };
9: 
```
**What it does**: This section contributes to the file control flow. Read it top-to-bottom and track inputs, transformations, and output contracts.

> **Concept callouts:**
- This block is mostly structural wiring (imports/export boundaries).

**What would happen if...** What if we remove this block entirely? Trace callers and consumers first, because other parts of the app likely depend on this contract.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 3: Lines 10-23
```js
10: export default function RootLayout({ children }) {
11:   getDb();
12: 
13:   return (
14:     <html lang="en">
15:       <body>
16:         <NavBar />
17:         <main className="page-shell">{children}</main>
18:       </body>
19:     </html>
20:   );
21: }
22: 
23: 
```
**What it does**: This section contributes to the file control flow. Read it top-to-bottom and track inputs, transformations, and output contracts.

> **Concept callouts:**
- destructuring is used in this section.

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
