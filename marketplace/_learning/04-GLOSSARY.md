# Concepts Glossary

## Accumulator
- Plain English: The running value you keep updating inside `.reduce()`.
- Example from project: `src/lib/orders.js:58-64` groups items by seller with `reduce`.
- Why it matters: Most real totals/grouping logic in commerce apps depends on this pattern.

## API Route
- Plain English: A server function that handles an HTTP request and returns a response.
- Example from project: `src/app/api/cart/route.js`.
- Why it matters: This is where frontend actions become backend work.

## Async Function
- Plain English: A function that returns a Promise and can use `await`.
- Example from project: `src/components/CartPage.js:12` (`async function loadCart`).
- Why it matters: Most data loading/submission in web apps is async.

## Callback
- Plain English: A function you pass into another function to run later.
- Example from project: `src/lib/catalog.js:111` callback inside `.map(...)`.
- Why it matters: Array methods and event handlers are callback-heavy.

## Closure
- Plain English: A function that still has access to variables from where it was created.
- Example from project: `src/components/ProductDetail.js:72-83` vote handler uses outer state.
- Why it matters: Powers event handlers and custom logic in React.

## Controlled Input
- Plain English: Form input whose value comes from React state.
- Example from project: `src/components/AuthPage.js` inputs bound to `form` state.
- Why it matters: Needed for validation, multi-step forms, and predictable UI.

## Cookie Session
- Plain English: User/session identity stored in browser cookies and read on server.
- Example from project: `src/lib/auth.js` with `market_session` and `market_cart_session`.
- Why it matters: Enables login and persistent cart behavior.

## Data Shaping
- Plain English: Transforming raw DB rows into UI-friendly objects.
- Example from project: `src/lib/catalog.js:182-203` product output mapping.
- Why it matters: Clean boundaries make UI simpler and safer.

## Destructuring
- Plain English: Pulling values out of arrays/objects into local variables.
- Example from project: `function ProductDetail({ productId })`.
- Why it matters: Makes function signatures and state updates cleaner.

## Domain Logic
- Plain English: Business rules (cart math, order splitting, review rules) independent of HTTP/UI.
- Example from project: `src/lib/orders.js` and `src/lib/cart.js`.
- Why it matters: Keeps rules reusable and testable.

## Faceted Search
- Plain English: Filtering by multiple dimensions like category, price, rating.
- Example from project: `src/lib/catalog.js` facets built with `reduce`.
- Why it matters: Core marketplace discovery feature.

## FlatMap
- Plain English: Map each item, then flatten one level.
- Example from project: `src/lib/seller.js:40` when building variant payloads.
- Why it matters: Useful when one input can produce zero/one/many outputs.

## Higher-Order Function
- Plain English: A function that takes/returns another function.
- Example from project: `.map`, `.filter`, `.reduce` callbacks across `src/lib/*`.
- Why it matters: Core to modern JS style and React patterns.

## Immutable Update
- Plain English: Create a new object/array instead of changing existing one.
- Example from project: `src/components/CheckoutPage.js:64-71` spread updates.
- Why it matters: React rendering relies on changed references.

## JSON Response
- Plain English: Structured data returned from backend to frontend.
- Example from project: `jsonOk({ cart })` in `src/app/api/cart/route.js`.
- Why it matters: Frontend components depend on stable response shape.

## Middleware-like Guard (RBAC guard)
- Plain English: Helper that blocks unauthorized users before work runs.
- Example from project: `requireUser(["ADMIN"])` in admin API routes.
- Why it matters: Prevents unauthorized mutations.

## Nullish Coalescing (`??`)
- Plain English: Use fallback only when value is null/undefined.
- Example from project: `src/lib/orders.js:90` tax rate fallback.
- Why it matters: Avoids accidental override of valid falsy values.

## Optional Chaining (`?.`)
- Plain English: Safely read nested values without crashing on null/undefined.
- Example from project: `src/components/ProductDetail.js:103`.
- Why it matters: Real data can be missing in partial states.

## Optimistic Update
- Plain English: Update UI immediately then reconcile with server response.
- Example from project: cart and wishlist interactions in product/cart components.
- Why it matters: Better UX while still respecting backend truth.

## Prepared Statement
- Plain English: SQL query template with bound input values.
- Example from project: `db.prepare(...).run(...)` across `src/lib/*`.
- Why it matters: Safer and clearer DB interactions.

## Promise
- Plain English: Object representing future completion/failure of async work.
- Example from project: `fetch` in `src/lib/client-api.js`.
- Why it matters: All network and many async operations are Promise-based.

## Pure Function
- Plain English: Function that depends only on inputs and returns output without side effects.
- Example from project: `numeric` and `parseJson` in `src/lib/utils.js`.
- Why it matters: Easier reasoning and fewer hidden bugs.

## Reduce
- Plain English: Array method that combines many items into one value.
- Example from project: seller-grouped totals in `src/lib/orders.js`.
- Why it matters: Essential for totals, grouping, histograms.

## Referential Equality
- Plain English: Two objects/arrays are equal only if they are same reference.
- Example from project: spread-based state updates in React components.
- Why it matters: Drives React re-render behavior.

## Route Handler
- Plain English: Specific `GET/POST/PATCH/DELETE` function for one endpoint.
- Example from project: `src/app/api/orders/route.js`.
- Why it matters: Defines API behavior and status handling.

## Session
- Plain English: Server-recognized identity for a browser/user.
- Example from project: `sessions` table and cookie token in `src/lib/auth.js`.
- Why it matters: Required for role checks and user-specific data.

## Short-Circuit Rendering
- Plain English: Use `condition && <UI />` to render only when true.
- Example from project: `src/components/MarketplaceHome.js:174`.
- Why it matters: Common React conditional pattern.

## Side Effect
- Plain English: Any operation that changes external state (DB write, network call, DOM update).
- Example from project: order creation writes in `src/lib/orders.js`.
- Why it matters: Side effects need careful sequencing and error handling.

## Spread Operator
- Plain English: Copy/merge arrays or objects with `...`.
- Example from project: many state updates in `src/components/*`.
- Why it matters: Main tool for immutable updates.

## Transaction
- Plain English: Group of DB operations that all succeed together or all roll back.
- Example from project: `runInTransaction` in `src/lib/db.js` used by checkout.
- Why it matters: Prevents partial order/inventory corruption.

## Validation
- Plain English: Checking inputs before processing.
- Example from project: auth/order routes validate required fields.
- Why it matters: Prevents invalid writes and clearer error messages.
