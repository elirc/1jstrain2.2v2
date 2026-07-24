# Guide: src/app/api/auth/register/route.js
**Role in the system**: API boundary for one HTTP endpoint. It validates input, calls domain logic, and shapes the HTTP response.
**Key concepts you'll learn**:
- async/await
- SQL queries
**Prerequisites**:
- Read `src/lib/http.js.guide.md` first for response helpers.
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 2-5
```js
2: import { hashPassword } from "@/lib/security";
3: import { createSession, setSessionCookie } from "@/lib/auth";
4: import { jsonError, jsonOk } from "@/lib/http";
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

### Section 2: Lines 6-54
```js
6: export async function POST(request) {
7:   try {
8:     const body = await request.json();
9:     const email = String(body.email || "").trim().toLowerCase();
10:     const password = String(body.password || "").trim();
11:     const name = String(body.name || "").trim();
12:     const role = body.role === "SELLER" ? "SELLER" : "BUYER";
13: 
14:     if (!email || !password || !name) {
15:       return jsonError(new Error("name, email, and password are required"), 400);
16:     }
17: 
18:     if (password.length < 8) {
19:       return jsonError(new Error("Password must be at least 8 characters"), 400);
20:     }
21: 
22:     const db = getDb();
23:     const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
24: 
25:     if (existing) {
26:       return jsonError(new Error("Email already exists"), 409);
27:     }
28: 
29:     const createdAt = new Date().toISOString();
30:     const userInsert = db
31:       .prepare("INSERT INTO users(email, password_hash, role, name, created_at) VALUES(?, ?, ?, ?, ?)")
32:       .run(email, hashPassword(password), role, name, createdAt);
33: 
34:     const userId = Number(userInsert.lastInsertRowid);
35: 
36:     if (role === "SELLER") {
37:       db.prepare(
38:         `INSERT INTO seller_profiles(user_id, application_status, bio, payout_account_ref, created_at)
39:          VALUES(?, 'PENDING', '', '', ?)`
... (truncated for guide readability)
```
**What it does**: This handler receives an HTTP request, parses input, calls domain logic, and returns JSON. Keep an eye on `try/catch` so transport-level errors become clean API responses.

> **Concept callouts:**
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
| 6 | async/await | Waits for Promises in readable sequential style. |
| 8 | async/await | Waits for Promises in readable sequential style. |
| 23 | SQL | Runs database read/write statements. |
| 31 | SQL | Runs database read/write statements. |
| 37 | SQL | Runs database read/write statements. |
| 38 | SQL | Runs database read/write statements. |
| 44 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
