# Guide: src/components/NavBar.js
**Role in the system**: Interactive UI component that owns local state, user events, and frontend data fetching/rendering.
**Key concepts you'll learn**:
- async/await
**Prerequisites**:
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 2-40
```js
2: import { getCurrentUser } from "@/lib/auth";
3: import LogoutButton from "@/components/LogoutButton";
4: 
5: export default async function NavBar() {
6:   const user = await getCurrentUser();
7: 
8:   return (
9:     <header className="topbar">
10:       <div className="topbar-inner">
11:         <Link href="/" className="brand">
12:           MarketForge
13:         </Link>
14: 
15:         <nav className="nav-links">
16:           <Link href="/">Discover</Link>
17:           <Link href="/cart">Cart</Link>
18:           <Link href="/orders">Orders</Link>
19:           <Link href="/seller">Seller</Link>
20:           <Link href="/admin">Admin</Link>
21:         </nav>
22: 
23:         <div className="auth-section">
24:           {user ? (
25:             <>
26:               <span className="muted">{user.name} ({user.role})</span>
27:               <LogoutButton />
28:             </>
29:           ) : (
30:             <Link href="/auth" className="button">
31:               Sign In
32:             </Link>
33:           )}
34:         </div>
35:       </div>
... (truncated for guide readability)
```
**What it does**: This section imports dependencies and establishes the module boundary. It tells you what this file relies on and what abstractions it delegates to.

> **Concept callouts:**
- Note: `await` yields execution until the Promise settles.

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
| 5 | async/await | Waits for Promises in readable sequential style. |
| 6 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
