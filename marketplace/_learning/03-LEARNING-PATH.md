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
1. Draw your own architecture diagram from memory.
2. Explain checkout flow verbally in under 2 minutes.

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
1. Add a temporary field in order totals (for example, insurance fee) and trace it through logic.
2. Refactor one data pipeline into named helper functions.

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
1. Pick one chain and write console snapshots after each step.
2. Rewrite one `reduce` into a loop, then decide which is clearer.

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
1. Add one extra validation branch and return a distinct HTTP status.
2. Add logging around one async call and analyze order of execution.

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
1. Add one new checkout field and persist it in payload.
2. Add one loading/error state branch to a component that currently lacks it.

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
1. Add a new order status badge color rule.
2. Add one admin metric card backed by existing data.

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
1. Add one script for a repeated workflow you need.
2. Propose one refactor that improves readability without changing behavior.
