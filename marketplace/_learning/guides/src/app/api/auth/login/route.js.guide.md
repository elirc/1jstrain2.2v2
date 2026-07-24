# Guide: src/app/api/auth/login/route.js
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
2: import { verifyPassword } from "@/lib/security";
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

### Section 2: Lines 6-41
```js
6: export async function POST(request) {
7:   try {
8:     const body = await request.json();
9:     const email = String(body.email || "").trim().toLowerCase();
10:     const password = String(body.password || "").trim();
11: 
12:     if (!email || !password) {
13:       return jsonError(new Error("email and password are required"), 400);
14:     }
15: 
16:     const db = getDb();
17:     const user = db
18:       .prepare("SELECT id, email, password_hash, role, name FROM users WHERE email = ?")
19:       .get(email);
20: 
21:     if (!user || !verifyPassword(password, user.password_hash)) {
22:       return jsonError(new Error("Invalid credentials"), 401);
23:     }
24: 
25:     const session = createSession(user.id);
26:     await setSessionCookie(session.token, session.expiresAt);
27: 
28:     return jsonOk({
29:       user: {
30:         id: user.id,
31:         email: user.email,
32:         role: user.role,
33:         name: user.name
34:       }
35:     });
36:   } catch (error) {
37:     return jsonError(error, 500);
38:   }
39: }
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
| 18 | SQL | Runs database read/write statements. |
| 26 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
