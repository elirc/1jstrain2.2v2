# Patterns and Anti-Patterns

## Patterns Used in This Project

## 1) Thin API Handler + Domain Service
- Plain English: API route does HTTP plumbing; domain module does business logic.
- Where: `src/app/api/cart/route.js` + `src/lib/cart.js`, `src/app/api/checkout/route.js` + `src/lib/orders.js`.
- Why useful: keeps route files readable and business rules reusable.

The real thing — `src/app/api/checkout/route.js` is 21 lines, in full:
```js
export async function POST(request) {
  try {
    const body = await request.json();
    const user = await getCurrentUser();
    const sessionId = await getOrCreateCartSessionId();

    const result = checkout({ userId: user?.id, sessionId, payload: body });

    return jsonOk({ checkout: result }, 201);
  } catch (error) {
    return jsonError(error, 400);
  }
}
```
Everything hard — grouping by seller, tax, discounts, inventory — lives in
`checkout()` in `src/lib/orders.js` (~160 lines). The route only does HTTP:
parse the body, resolve identity, translate the result or error to JSON.

## 2) Transaction Boundary for Critical Writes
- Plain English: wrap multi-step checkout writes in one transaction.
- Where: `src/lib/db.js` (`runInTransaction`) and `src/lib/orders.js` (`checkout`).
- Why useful: prevents partial writes (for example order created but inventory not decremented).

The real thing — `checkout()` wraps its entire body (`src/lib/orders.js:50`):
```js
export function checkout({ userId, sessionId, payload }) {
  return runInTransaction((db) => {
    // ...reads cart, then per seller: INSERT order, order_items,
    // order_status_history, transactions, payouts, notifications,
    // UPDATE product_variants inventory, stores payout balance,
    // finally DELETE the active cart items.
  });
}
```
Count the writes: a two-seller checkout touches **nine tables**. If the
inventory update fails on the last item, every one of those writes rolls
back — no order rows without order_items, no payout without an order.
Throwing inside the callback is the rollback mechanism, which is why
`checkout()` throws `Error` instead of returning error objects.

## 3) Data Pipeline Pattern (`filter -> map -> reduce`)
- Plain English: transform data in small composable stages.
- Where: `src/lib/catalog.js`, `src/lib/cart.js`, `src/lib/orders.js`.
- Why useful: easier to reason about than one massive loop.

The real thing — CSV import, `src/lib/seller.js:256-259`:
```js
const lines = csvText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
```
Raw text → rows → trimmed rows → non-empty rows, each stage one idea. The
catalog search in `src/lib/catalog.js:110-178` is the big version:
`.map()` (attach relevance score) → `.filter()` (apply all seven filters) →
`.sort()` (comparator picked by query param) → `.slice()` (paginate).

## 4) Immutable React State Updates
- Plain English: create new object/array each update.
- Where: `src/components/CheckoutPage.js`, `src/components/SellerPage.js`, `src/components/MarketplaceHome.js`.
- Why useful: reliable React re-renders and fewer stale-state bugs.

Isolated example:
```js
setForm((current) => ({
  ...current,
  address: { ...current.address, city: nextCity }
}));
```

## 5) Role Guard Pattern (RBAC)
- Plain English: enforce role checks at route entry.
- Where: `requireUser(["ADMIN"])` in admin routes and seller-specific routes.
- Why useful: blocks unauthorized access consistently.

The real thing — first line of every seller handler (`src/app/api/seller/store/route.js:7`):
```js
const user = await requireUser(["SELLER", "ADMIN"]);
```
`requireUser` (`src/lib/auth.js:58`) throws an `Error` with `error.status`
set to `401` (not logged in) or `403` (wrong role). The route's `catch`
passes it to `jsonError`, which reads `error.status` — so one throw at the
top of the handler produces the right HTTP status with no per-route
status logic. Note the two failures are different: 401 means "we don't know
who you are", 403 means "we know exactly who you are, and no".

## 6) Consistent JSON Response Shape
- Plain English: central helpers for success/error JSON responses.
- Where: `src/lib/http.js`.
- Why useful: uniform error handling for frontend components.

The real thing — `src/lib/http.js` in full (it's 10 lines):
```js
export function jsonOk(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error, fallbackStatus = 400) {
  const status = error?.status || fallbackStatus;
  return NextResponse.json({ error: error?.message || "Request failed" }, { status });
}
```
Two things to notice: errors always come back as `{ error: "message" }` with
a non-2xx status — `apiRequest` in `src/lib/client-api.js` checks
`response.ok` and throws `new Error(data.error)`, so every component's
`catch` gets a human-readable message for free; and
`jsonError` honours an `error.status` attached upstream (that's how
`requireUser`'s 401/403 travel through a generic catch block).

## 7) Conditional UPDATE as a Concurrency Guard
- Plain English: make the database check the precondition in the same statement that does the write.
- Where: `src/lib/orders.js:134-142` inside `checkout()`.
- Why useful: prevents overselling without locks.

The real thing:
```js
const updateInventory = db
  .prepare("UPDATE product_variants SET inventory = inventory - ? WHERE id = ? AND inventory >= ?")
  .run(item.quantity, item.variantId, item.quantity);

if (updateInventory.changes === 0) {
  throw new Error(`Inventory changed for ${item.productTitle}. Please review your cart.`);
}
```
The naive version reads inventory with a `SELECT`, checks it in JS, then
writes — and between the read and the write another checkout can take the
last unit. Here the `WHERE inventory >= ?` clause makes check-and-decrement
atomic: if stock ran out, **zero rows change**, `changes === 0` detects it,
and the throw rolls back the whole transaction (pattern 2). This read-check-
write race is called TOCTOU (time-of-check to time-of-use) and shows up in
every interview question about double-booking and double-spending.

## 8) Snapshot Columns on Orders
- Plain English: an order stores a *copy* of the product data at purchase time, not a reference to it.
- Where: `title_snapshot`, `variant_snapshot`, `unit_price_cents` in `order_items` (written in `src/lib/orders.js:144-159`).
- Why useful: sellers rename products and change prices; your receipt must not change with them.

If `order_items` only stored `product_id` and joined for the title and price,
editing a product would silently rewrite history — old orders would show new
prices. The join is still there for things that *should* stay live (store
name), which is the actual design decision: per column, "frozen at purchase"
vs "always current".

## Anti-Patterns to Avoid

## 1) Mutating state directly
Wrong:
```js
form.address.city = "SF";
setForm(form);
```
Right:
```js
setForm((current) => ({
  ...current,
  address: { ...current.address, city: "SF" }
}));
```
What goes wrong: React may not detect reference changes and UI can stay stale.

## 2) Using `.forEach()` where `.map()` is needed
Wrong:
```js
const cards = [];
products.forEach((p) => cards.push(renderCard(p)));
```
Right:
```js
const cards = products.map((p) => renderCard(p));
```
What goes wrong: side-effect style is harder to read and easier to break.

## 3) Forgetting `await` in async flow
Wrong:
```js
const data = apiRequest('/api/cart');
setCart(data.cart);
```
Right:
```js
const data = await apiRequest('/api/cart');
setCart(data.cart);
```
What goes wrong: `data` is a Promise, not resolved payload.

## 4) Sorting shared arrays in place
Wrong:
```js
products.sort((a, b) => a.price - b.price);
```
Right:
```js
const sorted = [...products].sort((a, b) => a.price - b.price);
```
What goes wrong: hidden mutation can alter other consumers unexpectedly.

## 5) Mixing transport and business logic in route file
Wrong:
```js
export async function POST(request) {
  // 200+ lines of calculations + SQL + response formatting
}
```
Right:
```js
export async function POST(request) {
  const body = await request.json();
  const result = checkout(body); // domain service
  return jsonOk(result);
}
```
What goes wrong: hard testing, duplication, and fragile code.

## 6) Relying on `||` when `??` is required
Wrong:
```js
const shipping = providedShipping || 7.99;
```
Right — this repo gets it right in `src/lib/orders.js:102`:
```js
const shippingCents = toCents(payload.shippingBySeller?.[sellerId] ?? 7.99);
```
What goes wrong with `||`: free shipping (`0`) is falsy, so `0 || 7.99`
silently charges $7.99. `??` falls back only on `null`/`undefined`, so an
explicit `0` survives. Rule: `??` when `0`, `''` or `false` are legitimate
values; `||` only when any falsy value should mean "use the default".
