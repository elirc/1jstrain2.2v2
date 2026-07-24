# Guide: src/lib/db.js
**Role in the system**: Database bootstrap and schema/seed source of truth. This file creates the SQLite schema and initial data.
**Key concepts you'll learn**:
- .forEach()
- optional chaining
- nullish coalescing
- SQL queries
**Prerequisites**:
- No hard prerequisites. You can read this guide directly.

## Line-by-Line Walkthrough

### Section 1: Lines 2-5
```js
2: import fs from "node:fs";
3: import { DatabaseSync } from "node:sqlite";
4: import { hashPassword, nowIso, toCents } from "@/lib/security";
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

### Section 2: Lines 6-6
```js
6: const DB_DIRECTORY = path.join(process.cwd(), "data");
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

### Section 3: Lines 7-10
```js
7: const DB_PATH = path.join(DB_DIRECTORY, "marketplace.db");
8: 
9: let initialized = false;
10: 
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

### Section 4: Lines 11-338
```js
11: function initSchema(db) {
12:   db.exec(`
13:     PRAGMA journal_mode = WAL;
14:     PRAGMA foreign_keys = ON;
15: 
16:     CREATE TABLE IF NOT EXISTS users (
17:       id INTEGER PRIMARY KEY AUTOINCREMENT,
18:       email TEXT NOT NULL UNIQUE,
19:       password_hash TEXT NOT NULL,
20:       role TEXT NOT NULL CHECK(role IN ('BUYER', 'SELLER', 'ADMIN')),
21:       name TEXT NOT NULL,
22:       created_at TEXT NOT NULL
23:     );
24: 
25:     CREATE TABLE IF NOT EXISTS sessions (
26:       token TEXT PRIMARY KEY,
27:       user_id INTEGER NOT NULL,
28:       expires_at TEXT NOT NULL,
29:       created_at TEXT NOT NULL,
30:       FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
31:     );
32: 
33:     CREATE TABLE IF NOT EXISTS seller_profiles (
34:       id INTEGER PRIMARY KEY AUTOINCREMENT,
35:       user_id INTEGER NOT NULL UNIQUE,
36:       application_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(application_status IN ('PENDING', 'APPROVED', 'REJECTED')),
37:       bio TEXT DEFAULT '',
38:       payout_account_ref TEXT DEFAULT '',
39:       approved_at TEXT,
40:       rejected_reason TEXT,
41:       created_at TEXT NOT NULL,
42:       FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
43:     );
44: 
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- SQL queries is used in this section.

**What would happen if...** What if we run this query without validation? Bad inputs can trigger incorrect writes or broken business invariants.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 5: Lines 339-363
```js
339: function seedCategories(db) {
340:   const count = db.prepare("SELECT COUNT(*) as count FROM categories").get().count;
341:   if (count > 0) {
342:     return;
343:   }
344: 
345:   const categories = [
346:     { name: "Home", slug: "home", parent: null },
347:     { name: "Art", slug: "art", parent: null },
348:     { name: "Fashion", slug: "fashion", parent: null },
349:     { name: "Furniture", slug: "furniture", parent: "home" },
350:     { name: "Decor", slug: "decor", parent: "home" },
351:     { name: "Wall Art", slug: "wall-art", parent: "art" },
352:     { name: "Accessories", slug: "accessories", parent: "fashion" }
353:   ];
354: 
355:   const insert = db.prepare("INSERT INTO categories(parent_id, name, slug) VALUES(?, ?, ?)");
356:   const getIdBySlug = db.prepare("SELECT id FROM categories WHERE slug = ?");
357: 
358:   for (const category of categories) {
359:     const parentId = category.parent ? getIdBySlug.get(category.parent)?.id ?? null : null;
360:     insert.run(parentId, category.name, category.slug);
361:   }
362: }
363: 
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- optional chaining is used in this section.
- nullish coalescing is used in this section.
- SQL queries is used in this section.

**What would happen if...** What if we run this query without validation? Bad inputs can trigger incorrect writes or broken business invariants.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 6: Lines 364-534
```js
364: function seedData(db) {
365:   const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
366:   if (userCount > 0) {
367:     return;
368:   }
369: 
370:   const createdAt = nowIso();
371:   const insertUser = db.prepare(
372:     "INSERT INTO users(email, password_hash, role, name, created_at) VALUES(?, ?, ?, ?, ?)"
373:   );
374: 
375:   insertUser.run("admin@market.dev", hashPassword("Admin123!"), "ADMIN", "Marketplace Admin", createdAt);
376:   insertUser.run("seller@market.dev", hashPassword("Seller123!"), "SELLER", "Maker Seller", createdAt);
377:   insertUser.run("buyer@market.dev", hashPassword("Buyer123!"), "BUYER", "Demo Buyer", createdAt);
378: 
379:   const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@market.dev");
380:   const seller = db.prepare("SELECT id FROM users WHERE email = ?").get("seller@market.dev");
381:   const buyer = db.prepare("SELECT id FROM users WHERE email = ?").get("buyer@market.dev");
382: 
383:   db.prepare(
384:     `INSERT INTO seller_profiles(user_id, application_status, bio, payout_account_ref, approved_at, created_at)
385:      VALUES(?, 'APPROVED', ?, ?, ?, ?)`
386:   ).run(seller.id, "Handmade goods and premium craft materials.", "acct_demo_seller", createdAt, createdAt);
387: 
388:   db.prepare(
389:     `INSERT INTO stores(seller_id, name, slug, description, theme_json, shipping_speed_days, payout_balance_cents, created_at, updated_at)
390:      VALUES(?, ?, ?, ?, ?, ?, 0, ?, ?)`
391:   ).run(
392:     seller.id,
393:     "Maker Studio",
394:     "maker-studio",
395:     "Handmade marketplace goods by independent creators.",
396:     JSON.stringify({ accent: "#1f7a8c", hero: "clean" }),
397:     3,
... (truncated for guide readability)
```
**What it does**: This section encodes business logic in a reusable function. API routes and components call into this layer so rules stay centralized instead of duplicated.

> **Concept callouts:**
- .forEach() is used in this section.
- SQL queries is used in this section.

**What would happen if...** What if we run this query without validation? Bad inputs can trigger incorrect writes or broken business invariants.

**Extra example**:
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Section 7: Lines 535-542
```js
535: function createConnection() {
536:   fs.mkdirSync(DB_DIRECTORY, { recursive: true });
537:   const db = new DatabaseSync(DB_PATH);
538:   initSchema(db);
539:   seedData(db);
540:   return db;
541: }
542: 
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

### Section 8: Lines 543-557
```js
543: export function getDb() {
544:   if (!globalThis.__marketplaceDb) {
545:     globalThis.__marketplaceDb = createConnection();
546:     initialized = true;
547:   }
548: 
549:   if (!initialized) {
550:     initSchema(globalThis.__marketplaceDb);
551:     seedData(globalThis.__marketplaceDb);
552:     initialized = true;
553:   }
554: 
555:   return globalThis.__marketplaceDb;
556: }
557: 
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
| 30 | SQL | Runs database read/write statements. |
| 42 | SQL | Runs database read/write statements. |
| 56 | SQL | Runs database read/write statements. |
| 64 | SQL | Runs database read/write statements. |
| 81 | SQL | Runs database read/write statements. |
| 82 | SQL | Runs database read/write statements. |
| 83 | SQL | Runs database read/write statements. |
| 98 | SQL | Runs database read/write statements. |
| 107 | SQL | Runs database read/write statements. |
| 116 | SQL | Runs database read/write statements. |
| 129 | SQL | Runs database read/write statements. |
| 130 | SQL | Runs database read/write statements. |
| 131 | SQL | Runs database read/write statements. |
| 132 | SQL | Runs database read/write statements. |
| 148 | SQL | Runs database read/write statements. |
| 168 | SQL | Runs database read/write statements. |
| 169 | SQL | Runs database read/write statements. |
| 170 | SQL | Runs database read/write statements. |
| 184 | SQL | Runs database read/write statements. |
| 185 | SQL | Runs database read/write statements. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
