# Patterns and Anti-Patterns

## Patterns Used in This Project

## 1) Thin API Handler + Domain Service
- Plain English: API route does HTTP plumbing; domain module does business logic.
- Where: `src/app/api/cart/route.js` + `src/lib/cart.js`, `src/app/api/checkout/route.js` + `src/lib/orders.js`.
- Why useful: keeps route files readable and business rules reusable.

Isolated example:
```js
// route.js
export async function POST(request) {
  const body = await request.json();
  const result = createOrder(body); // delegate to domain layer
  return jsonOk(result);
}

// domain.js
export function createOrder(payload) {
  // business rules here
}
```

## 2) Transaction Boundary for Critical Writes
- Plain English: wrap multi-step checkout writes in one transaction.
- Where: `src/lib/db.js` (`runInTransaction`) and `src/lib/orders.js` (`checkout`).
- Why useful: prevents partial writes (for example order created but inventory not decremented).

Isolated example:
```js
runInTransaction((db) => {
  db.prepare("INSERT ...").run(...);
  db.prepare("UPDATE inventory ...").run(...);
});
```

## 3) Data Pipeline Pattern (`filter -> map -> reduce`)
- Plain English: transform data in small composable stages.
- Where: `src/lib/catalog.js`, `src/lib/cart.js`, `src/lib/orders.js`.
- Why useful: easier to reason about than one massive loop.

Isolated example:
```js
const subtotal = cartItems
  .filter((item) => !item.savedForLater)
  .map((item) => item.priceCents * item.quantity)
  .reduce((sum, line) => sum + line, 0);
```

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

Isolated example:
```js
const user = await requireUser(["SELLER"]);
// secure logic runs only for seller role
```

## 6) Consistent JSON Response Shape
- Plain English: central helpers for success/error JSON responses.
- Where: `src/lib/http.js`.
- Why useful: uniform error handling for frontend components.

Isolated example:
```js
return jsonOk({ orders });
// and
return jsonError(new Error("Invalid"), 400);
```

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
Right:
```js
const shipping = providedShipping ?? 7.99;
```
What goes wrong: valid `0` would be overwritten by fallback with `||`.
