# Learning Path

This plan is ordered to maximize JavaScript fundamentals first, then full-stack application fluency.

## Chapter 1: Read the System First
**Goal**: After this chapter, you can explain what this app does and trace key flows end-to-end.
**Concepts**: architecture, data flow, request lifecycle, module boundaries.

### Read in this order:
1. `00-ARCHITECTURE.md` - start with a full mental model.
2. `guides/src/app/layout.js.guide.md` - understand app shell and global bootstrapping.
3. `guides/src/lib/db.js.guide.md` - see data model and persistence foundation.

### Checkpoint:
- [ ] Explain the buyer/seller/admin feature split.
- [ ] Describe where frontend code ends and API/server code begins.
- [ ] Trace one action from button click to DB write.
- [ ] Explain why transaction boundaries matter for checkout.

### Practice:
1. Draw the architecture diagram from memory, then diff it against the
   mermaid diagram in `00-ARCHITECTURE.md`. **Check**: you included the two
   cookie names (`market_session`, `market_cart_session`) and the
   `apiRequest` helper — most first attempts miss both.
2. List every table `checkout()` writes to, from memory, then verify against
   `src/lib/orders.js:49-210`. **Check**: there are nine (addresses, orders,
   order_items, order_status_history, transactions, payouts, stores,
   notifications, cart_items — the last via DELETE), plus a conditional
   UPDATE on product_variants and discount_codes.

## Chapter 2: Data Layer and Core Business Logic
**Goal**: Understand how raw SQL rows become business objects and platform rules.
**Concepts**: SQL queries, schema design, prepared statements, transactions, pure transformation pipelines.

### Read in this order:
1. `guides/src/lib/security.js.guide.md` - money + ID helpers.
2. `guides/src/lib/catalog.js.guide.md` - filtering/sorting/facets.
3. `guides/src/lib/cart.js.guide.md` - grouping and totals.
4. `guides/src/lib/orders.js.guide.md` - split orders + inventory safety.
5. `guides/src/lib/seller.js.guide.md` and `guides/src/lib/admin.js.guide.md` - role-specific logic.

### Checkpoint:
- [ ] Explain what `.reduce()` accumulates in cart and checkout.
- [ ] Explain why money uses integer cents.
- [ ] Explain how inventory race conditions are prevented.
- [ ] Explain difference between transformation code and side-effect code.

### Practice:
1. Compute by hand what `checkout()` does for this cart: seller A has
   $40.00 of items, seller B has $10.00, discount code gives 10% off, both
   ship at the default. Work through `src/lib/orders.js:97-104` on paper:
   per-seller subtotal, proportional discount (`Math.floor`!), shipping,
   tax for region `TX`. **Check**: place that exact order against the dev
   server (seed data + a discount code you add via SQL) and compare the
   `orders` rows to your arithmetic. If your per-seller discounts sum to
   more than 500 cents, re-read the `Math.floor` line.
2. Add an `insuranceCents` fee (2% of each seller subtotal) inside
   `checkout()` and include it in `total_cents`. **Check**: the order total
   shown on the Orders page goes up by exactly 2% of each seller's subtotal,
   and the `transactions` row amount matches the new total.

## Chapter 3: JavaScript Fundamentals Intensive
**Goal**: Internalize array methods, function scope, closures, async behavior, immutable state updates.
**Concepts**: `.map/.filter/.find/.reduce`, object/array spread, destructuring, callback functions, async/await.

### Read in this order:
1. `01-JS-FUNDAMENTALS.md` - full examples-first reference.
2. `02-ARRAY-CHEATSHEET.md` - quick retrieval and decision support.
3. `guides/src/lib/catalog.js.guide.md` - richest array-method usage.
4. `guides/src/components/MarketplaceHome.js.guide.md` - array methods in React rendering/state.

### Checkpoint:
- [ ] Explain what `.map()` returns and why React list rendering relies on it.
- [ ] Explain `find` vs `filter` with concrete examples.
- [ ] Explain accumulator shape in one `reduce` from this app.
- [ ] Explain why immutable updates prevent stale UI bugs.

### Practice:
1. Copy the grouping `reduce` from `src/lib/orders.js:58-62` into a Node
   REPL with three fake items across two sellers. **Check**: log the
   accumulator inside the callback on every iteration — you should see the
   object grow key by key, and the final shape match
   `{ "1": [item, item], "2": [item] }`.
2. Rewrite that same `reduce` as a `for...of` loop. **Check**: both versions
   produce `JSON.stringify`-identical output for the same input. Decide
   which you'd want to review at 5pm on a Friday.
3. The repo root has a test-graded drill set for exactly these methods:
   `jstrain/exercises/js/03-arrays.js` (run per the `jstrain/README.md`
   watch workflow). **Check**: the arrays test file passes.

## Chapter 4: API and Async Patterns
**Goal**: Trace HTTP requests and understand error handling and async control flow.
**Concepts**: async/await, Promise lifecycle, route handlers, status codes, try/catch.

### Read in this order:
1. `guides/src/lib/client-api.js.guide.md` - frontend request helper.
2. `guides/src/app/api/cart/route.js.guide.md` - all CRUD handlers in one route.
3. `guides/src/app/api/checkout/route.js.guide.md` and `guides/src/app/api/orders/route.js.guide.md` - transactional flows.
4. `guides/src/lib/http.js.guide.md` - response shaping.

### Checkpoint:
- [ ] Trace complete API request flow and response shape.
- [ ] Explain what breaks when `await` is removed.
- [ ] Explain transport errors vs business validation errors.
- [ ] Explain why server routes delegate to `src/lib/*`.

### Practice:
1. Checkout currently returns **400 for everything** — a missing address
   field, an empty cart, and an inventory conflict all look the same to a
   client. Make the inventory-conflict error from `src/lib/orders.js:141`
   return **409 Conflict** instead: attach `error.status = 409` where it's
   thrown (`jsonError` already honours it — see `src/lib/http.js`).
   **Check**: two browser profiles, same single-stock item in both carts,
   check out in both — the second gets a 409 in the network tab, the first
   a 201.
2. Trigger the raw-SQL-error leak: POST to `/api/checkout` with an address
   missing `fullName` (DevTools fetch or curl) and read the error message
   the client receives. **Check**: you can name the exact table and column
   from the response alone — which is the problem. Keep this for Chapter 8,
   where you fix it.

## Chapter 5: React State, Effects, and Forms
**Goal**: Understand how component state and events drive production UI.
**Concepts**: `useState`, `useEffect`, controlled inputs, derived values (`useMemo`), event handlers.

### Read in this order:
1. `guides/src/components/AuthPage.js.guide.md` - controlled form fundamentals.
2. `guides/src/components/CartPage.js.guide.md` - CRUD + reload loop.
3. `guides/src/components/CheckoutPage.js.guide.md` - multi-step complex state.
4. `guides/src/components/ProductDetail.js.guide.md` - selected variants + optimistic feedback.

### Checkpoint:
- [ ] Explain nested state update patterns with spread.
- [ ] Explain why effects load data and handlers submit data.
- [ ] Explain conditional rendering with short-circuit logic.
- [ ] Explain how component state maps to user-visible UI.

### Practice:
1. Add a "phone" input to the checkout address step bound into the existing
   nested `setForm` pattern (`src/components/CheckoutPage.js:64-70` is the
   template; the server already accepts `payload.address.phone` —
   see `src/lib/orders.js:85`). **Check**: place an order, then
   `SELECT phone FROM addresses ORDER BY id DESC LIMIT 1` shows your value.
2. `src/components/OrdersPage.js` renders nothing special while loading.
   Add a `loading` state flag following the pattern `MarketplaceHome.js`
   uses (`setLoading(true)` before the fetch, `finally` to clear).
   **Check**: throttle the network in DevTools and you see the loading
   branch; with throttling off, orders still render.
3. Predict, then verify: in `CheckoutPage.js:48-57` (`totals` via
   `useMemo`), which state changes recompute totals and which don't?
   **Check**: add a `console.log` inside the `useMemo` callback — typing in
   the name field should *not* log if you predicted correctly... it does
   log. Explain why (look at the dependency array).

## Chapter 6: Role-Specific Product Features
**Goal**: Learn production organization by role-specific flows.
**Concepts**: role-based UI, workflow states, dashboard rendering, operational actions.

### Read in this order:
1. `guides/src/components/SellerPage.js.guide.md` + seller API guides.
2. `guides/src/components/AdminPage.js.guide.md` + admin API guides.
3. `guides/src/components/OrdersPage.js.guide.md` + engagement/dispute guides.

### Checkpoint:
- [ ] Explain seller fulfillment lifecycle.
- [ ] Explain admin dispute and seller approval flow.
- [ ] Explain how UI actions map to API mutations.

### Practice:
1. Sellers can set a status the UI doesn't style distinctly. Pick one status
   from the allowed list in `src/lib/orders.js:267`
   (`CONFIRMED | SHIPPED | DELIVERED | COMPLETED | CANCELLED`) and give its
   badge a distinct color on both the buyer Orders page and the seller
   dashboard. **Check**: update an order as the seeded seller, view it as
   the seeded buyer — both views show your color.
2. Add an "Average order value" card to the admin dashboard. The analytics
   endpoint (`src/app/api/admin/analytics/route.js` → `src/lib/admin.js`)
   already returns GMV and order counts — derive AOV client-side first.
   **Check**: AOV × order count ≈ GMV (explain the cents-rounding gap).
   Then move the division server-side and argue which placement is right.

## Chapter 7: Configuration, Tooling, and Production Thinking
**Goal**: Understand runtime config, linting, and maintainability patterns.
**Concepts**: Next config, ESLint rules, scripts, code quality constraints.

### Read in this order:
1. `guides/next.config.mjs.guide.md`
2. `guides/eslint.config.mjs.guide.md`
3. `guides/package.json.guide.md`
4. `05-PATTERNS.md`

### Checkpoint:
- [ ] Explain what each npm script does.
- [ ] Explain why lint rules exist and when to relax them carefully.
- [ ] Identify one good pattern and one anti-pattern in this codebase.

### Practice:
1. Add a `db:reset` script to `package.json` that deletes `data/` so the
   next `npm run dev` reseeds from scratch. **Check**: run it, restart dev,
   log in as `buyer@market.dev` — your old orders are gone, seed products
   are back.
2. Run `npm run lint`, then find the rule config in `eslint.config.mjs`
   responsible for any warning you see (or pick one rule and deliberately
   violate it in a scratch file). **Check**: you can say what the rule
   catches and name one bug class it prevents in *this* repo.

## Chapter 8: Reading This Code Like a Senior Reviewer
**Goal**: Find the real weaknesses in a codebase that works, prioritize them, and fix the ones worth fixing — the core mid-level skill.
**Concepts**: client/server trust boundaries, input validation, N+1 queries, scaling limits, test strategy for untested code.

Everything below is a genuine issue in this codebase today, not a hypothetical. Verify each one yourself before fixing anything.

### 8.1 The client preview lies

The server's tax table (`src/lib/orders.js:5-11`) says NY is 8.8%, TX is
8.25%, WA is 6.5%. The client preview (`src/components/CheckoutPage.js:55`)
charges 8.75% for CA/NY/TX and 6% for everything else. A New York buyer is
shown one total and charged another. Same story with discounts: the preview
hardcodes `WELCOME10` at 10% (`CheckoutPage.js:57`) while the server reads
`discount_codes` from the database — any other code previews as $0 off,
then succeeds at checkout.

This is the classic cost of duplicating business rules on both sides of the
wire. The fix is not "update the client's constants" — it's making the
server the only place totals are computed.

**Exercise**: add a `POST /api/checkout/preview` route that runs the same
grouping/tax/discount math as `checkout()` but writes nothing, and make
`CheckoutPage` call it (debounced) instead of computing locally.
**Check**: a WA-region order previews 6.5% tax, and the preview matches the
placed order's totals to the cent for a 3-seller cart with a discount code.

### 8.2 Validate at the boundary

`POST /api/checkout` hands `body` straight to `checkout()`. Omit
`address.fullName` and SQLite's NOT NULL constraint fires; the raw
constraint message goes back to the browser as a 400. The client learns
your table and column names, and a typo'd field gives "constraint failed"
instead of "fullName is required".

`zod` is already in `package.json` — installed and never imported. Someone
intended this layer and never built it.

**Exercise**: define a `checkoutSchema` with zod and parse `body` at the
top of the route; return 400 with a per-field message on failure.
**Check**: the missing-fullName request from Chapter 4's practice now
returns `{ "error": "address.fullName is required" }` (or similar) and the
response never mentions a table. The happy path still returns 201.

### 8.3 The search won't scale — know exactly why

`searchCatalog()` (`src/lib/catalog.js:101`) starts with
`getProductBaseRows()` — **every active product in the database** — then
scores, filters, sorts, and paginates in JavaScript. At seed size this is
instant. At 100k products every request loads 100k rows to return 12.

Before fixing it, understand why it was written this way: the relevance
score (title +5 / description +2 / seller +1) is awkward to express in
plain SQL, and in-memory made faceting trivial. That's a real trade-off,
not a mistake — it just has an expiry date.

**Exercise**: push the cheap filters (category, price range, in-stock) into
the SQL WHERE clause and keep relevance scoring in JS on the reduced set.
**Check**: results and their order are identical for five different filter
combinations before and after (write the comparison as a script that hits
`/api/catalog` twice).

Related: `listOrdersForBuyer()` (`src/lib/orders.js:212-242`) runs one
`order_items` query **per order** — the N+1 pattern. Count queries for a
buyer with 50 orders; then rewrite as a single JOIN grouped in JS.

### 8.4 Security review — what's good, what a reviewer flags

Genuinely good, say so in review: scrypt with per-user salt and
`timingSafeEqual` (`src/lib/security.js`), httpOnly + SameSite=Lax session
cookies, prepared statements everywhere (grep for a single string-built
SQL query — you won't find one), server-side-only grading of every
privileged action via `requireUser`.

A reviewer would flag:

- **`secure: false` on both cookies** (`src/lib/auth.js:96,129`) — fine on
  localhost, credential-leaking over plain HTTP in production. The fix is
  one line per cookie plus an environment check.
- **No rate limiting on `POST /api/auth/login`** — unlimited password
  guesses at scrypt speed. Sketch a fix: an in-memory
  `Map<email, {count, firstAttemptAt}>` is enough for one process; explain
  why it breaks with two processes.
- **Sessions never pruned** — expired rows accumulate in `sessions`
  forever; `getCurrentUser` deletes only the token it just saw.
- **Why is CSRF mostly a non-issue here?** Work it out: SameSite=Lax
  blocks cookies on cross-site POSTs, and every mutation in this app is a
  POST/PATCH/DELETE. Name the residual risk (ancient browsers; a future
  state-changing GET someone adds without knowing the invariant).

**Exercise**: write the three-line production cookie fix (secure flag
driven by `process.env.NODE_ENV`), and add login throttling.
**Check**: six rapid failed logins for one email return 429; a success
resets the counter; a different email is unaffected.

### 8.5 Testing strategy for a repo with zero tests

There are no tests here. The mid-level skill is choosing the *first* test,
not writing all of them. The order that pays off:

1. **Pure functions, no setup**: `toCents`, `centsToMoney`,
   `verifyPassword` round-trip (`src/lib/security.js`). No mocks, no DB —
   these run as-is. Node's built-in runner is enough:
   create `tests/security.test.mjs`, import from `../src/lib/security.js`,
   run `node --test tests/`. (You'll see a `MODULE_TYPELESS_PACKAGE_JSON`
   warning because `package.json` has no `"type"` field — Node detects the
   ESM syntax and reparses; harmless here, and now you know what it means.)
2. **Domain logic against a throwaway DB**: `checkout()` is the obvious
   target but `src/lib/db.js` pins the path to `process.cwd()/data` —
   the first refactor testing forces on you. Make `DB_PATH` overridable
   via an env var, then a test can point it at a temp dir, seed two
   sellers, and assert the oversell guard: two checkouts racing for one
   unit, second one throws, inventory is 0 not -1.
3. **Not worth it here**: component snapshot tests, E2E — wrong
   cost/benefit for a learning MVP. Being able to argue *why* is the
   mid-level part.

**Check for the whole chapter**: `node --test tests/` runs at least five
assertions green, including one that proves money math
(`toCents(0.1 + 0.2) === 30` — floats are why integer cents exist).

### 8.6 Refactors a reviewer would actually request

Ordered by value, with the argument you'd make in the PR:

1. **Extract `computeOrderTotals()` from `checkout()`** — the per-seller
   loop (`orders.js:97-184`) mixes arithmetic with nine kinds of writes.
   Pull the math into a pure function returning
   `{ sellerSubtotal, discount, shipping, tax, total }` per seller; the
   loop just persists. Now 8.1's preview route and the tests in 8.5 reuse
   it — three problems, one refactor. **Check**: existing checkout behaves
   identically (same DB rows for the Chapter 2 worked example).
2. **Penny-drift audit**: per-seller discounts use `Math.floor`
   (`orders.js:99-101`), so three sellers splitting a 1000-cent discount
   can apply 999. Decide where the lost cent should go (convention: the
   largest order absorbs the remainder) and implement largest-remainder
   allocation. **Check**: a unit test over 1000 random carts asserts
   per-seller discounts always sum to exactly `discountCents`.
3. **One error type**: `checkout()` throws bare `Error`s; the route maps
   everything to 400. Introduce `AppError(message, status, code)` and map
   validation → 400, inventory conflict → 409, unknown → 500 with a
   generic message (don't leak internals on 500s — log them instead).

If you can make these three arguments convincingly — with the failure case,
the cost, and the check — you review code like a mid-level engineer.
