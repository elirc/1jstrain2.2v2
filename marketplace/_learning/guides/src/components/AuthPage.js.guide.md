# Guide: src/components/AuthPage.js
**Role in the system**: Interactive UI component that owns local state, user events, and frontend data fetching/rendering.
**Key concepts you'll learn**:
- async/await
- React state
- object spread
**Prerequisites**:
- Read `src/lib/client-api.js.guide.md` and `src/lib/auth.js.guide.md` for request/auth flow.

## Line-by-Line Walkthrough

### Section 1: Lines 3-6
```js
3: import { useState } from "react";
4: import { useRouter } from "next/navigation";
5: import { apiRequest } from "@/lib/client-api";
6: 
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

### Section 2: Lines 7-98
```js
7: export default function AuthPageView() {
8:   const router = useRouter();
9:   const [mode, setMode] = useState("login");
10:   const [form, setForm] = useState({
11:     name: "",
12:     email: "",
13:     password: "",
14:     role: "BUYER"
15:   });
16:   const [error, setError] = useState("");
17:   const [success, setSuccess] = useState("");
18: 
19:   function update(field, value) {
20:     setForm((current) => ({ ...current, [field]: value }));
21:   }
22: 
23:   async function submit(event) {
24:     event.preventDefault();
25:     setError("");
26:     setSuccess("");
27: 
28:     try {
29:       const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
30:       await apiRequest(path, {
31:         method: "POST",
32:         body: JSON.stringify(form)
33:       });
34: 
35:       setSuccess(mode === "login" ? "Logged in." : "Account created.");
36:       router.refresh();
37:       router.push("/");
38:     } catch (requestError) {
39:       setError(requestError.message);
40:     }
... (truncated for guide readability)
```
**What it does**: This component section manages UI state and event-driven updates. In React, each state setter schedules a re-render, so immutable updates are critical.

> **Concept callouts:**
- Note: `await` yields execution until the Promise settles.
- Note: React state updates should be immutable to trigger re-renders reliably.
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
| 20 | state update | Triggers React re-render with a new state value. |
| 23 | async/await | Waits for Promises in readable sequential style. |
| 25 | state update | Triggers React re-render with a new state value. |
| 26 | state update | Triggers React re-render with a new state value. |
| 30 | async/await | Waits for Promises in readable sequential style. |
| 35 | state update | Triggers React re-render with a new state value. |
| 39 | state update | Triggers React re-render with a new state value. |
| 83 | state update | Triggers React re-render with a new state value. |

## Common Mistakes
- Mutating objects/arrays directly instead of returning new values, which can break predictable state and data flow.
- Forgetting `await` on async operations, then trying to use unresolved Promise objects as if they were final data.
- Skipping input validation/error handling around external input (`request.json()`, query params), leading to runtime edge-case bugs.
- Replacing `.map()`/`.filter()` pipelines with side-effect-heavy loops that make transformations harder to reason about.

## Exercises
1. **Easy**: Find one `.map()` or `.filter()` usage in this file and rewrite it with a `for` loop. Compare readability and bug risk.
2. **Medium**: Add one small feature in this file (new field, new validation rule, or extra UI branch) while keeping updates immutable.
3. **Stretch**: Refactor one async path to improve failure handling (network/db error + empty state) and document the before/after behavior.
