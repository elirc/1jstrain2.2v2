# Guide: src/components/LogoutButton.js
**Role in the system**: Interactive UI component that owns local state, user events, and frontend data fetching/rendering.
**Key concepts you'll learn**:
- async/await
**Prerequisites**:
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 3-5
```js
3: import { useRouter } from "next/navigation";
4: import { apiRequest } from "@/lib/client-api";
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

### Section 2: Lines 6-26
```js
6: export default function LogoutButton() {
7:   const router = useRouter();
8: 
9:   async function onLogout() {
10:     try {
11:       await apiRequest("/api/auth/logout", { method: "POST" });
12:       router.refresh();
13:       router.push("/");
14:     } catch {
15:       // noop
16:     }
17:   }
18: 
19:   return (
20:     <button type="button" className="button ghost" onClick={onLogout}>
21:       Logout
22:     </button>
23:   );
24: }
25: 
26: 
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

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
| 9 | async/await | Waits for Promises in readable sequential style. |
| 11 | async/await | Waits for Promises in readable sequential style. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
