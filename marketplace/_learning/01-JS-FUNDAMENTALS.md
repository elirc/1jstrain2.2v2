# JavaScript Fundamentals (Examples-First, From This Project)

This reference teaches JavaScript by starting from real MarketForge code first. For each concept: project code -> extra examples -> short theory -> mini challenge.

## Array Methods (Most Important)

### .map()

**What it does**: see real code below first.
**Returns**: New array
**Mutates original?**: No

#### From this project (all usages)
- `src/components/AdminPage.js:75` -> `{dashboard.pendingSellers.map((seller) => (`
- `src/components/AdminPage.js:98` -> `{dashboard.disputes.map((dispute) => (`
- `src/components/AdminPage.js:118` -> `{dashboard.topSellers.map((seller, index) => (`
- `src/components/CartPage.js:72` -> `{cart.sellers.map((seller) => (`
- `src/components/CartPage.js:79` -> `{seller.items.map((item) => (`
- `src/components/CartPage.js:125` -> `{cart.savedForLater.map((item) => (`
- `src/components/CheckoutPage.js:41` -> `data.cart.sellers.map((seller) => [seller.sellerId, 7.99])`
- `src/components/CheckoutPage.js:152` -> `{cart.sellers.map((seller) => (`
- `src/components/MarketplaceHome.js:81` -> `setFilters((current) => Object.fromEntries(Object.entries(current).map(([k, v]) => [k, k === field ? value : v])));`
- `src/components/MarketplaceHome.js:103` -> `{flatCategories.map((category) => (`
- `src/components/MarketplaceHome.js:149` -> `<span>Category facets: {Object.entries(facets.categories || {}).map(([key, count]) => `${key} (${count})`).join(" | ") || "none"}</span>`
- `src/components/MarketplaceHome.js:156` -> `{products.map((product) => (`
- `src/components/MarketplaceHome.js:190` -> `recentlyViewed.map((item) => (`
- `src/components/OrdersPage.js:80` -> `{orders.map((order) => (`
- `src/components/OrdersPage.js:93` -> `{(order.items || []).map((item) => (`
- `src/components/ProductDetail.js:108` -> `{(product.images || []).map((image) => (`
- `src/components/ProductDetail.js:129` -> `{(product.variants || []).map((variant) => (`
- `src/components/ProductDetail.js:159` -> `{[5, 4, 3, 2, 1].map((star) => (`
- `src/components/ProductDetail.js:172` -> `{(product.reviews || []).map((review) => (`
- `src/components/SellerPage.js:166` -> `{dashboard.products.map((product) => (`
- `src/components/SellerPage.js:180` -> `{dashboard.recentOrders.map((order) => (`
- `src/components/SellerPage.js:200` -> `{dashboard.lowInventory.map((item) => (`
- `src/lib/admin.js:18` -> `.map((row) => ({ ...row, sales: row.sales_cents / 100 }));`
- `src/lib/cart.js:66` -> `.map((row) => ({`
- `src/lib/cart.js:100` -> `const sellers = Object.values(groupedBySeller).map((group) => {`
- `src/lib/catalog.js:47` -> `const placeholders = productIds.map(() => "?").join(",");`
- `src/lib/catalog.js:80` -> `return (byParent[key] ?? []).map((category) => ({`
- `src/lib/catalog.js:111` -> `.map((product) => {`
- `src/lib/catalog.js:179` -> `const productIds = page.map((product) => product.id);`
- `src/lib/catalog.js:182` -> `const products = page.map((product) => ({`
- `src/lib/catalog.js:258` -> `.map((variant) => ({`
- `src/lib/catalog.js:285` -> `.map((review) => ({`
- `src/lib/catalog.js:290` -> `.map((row) => row.url)`
- `src/lib/catalog.js:308` -> `WHERE p.id IN (${relatedIds.map(() => "?").join(",")})`
- `src/lib/catalog.js:312` -> `.map((row) => ({ id: row.id, title: row.title, minPrice: row.min_price_cents / 100 }))`
- `src/lib/engagement.js:95` -> `.map((item) => ({`
- `src/lib/engagement.js:132` -> `return rows.map((row) => ({`
- `src/lib/orders.js:224` -> `return orders.map((order) => ({`
- `src/lib/orders.js:236` -> `.map((item) => ({`
- `src/lib/orders.js:256` -> `return orders.map((order) => ({`
- `src/lib/seller.js:163` -> `return products.map((product) => ({`
- `src/lib/seller.js:258` -> `.map((line) => line.trim())`
- `src/lib/seller.js:265` -> `const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());`
- `src/lib/seller.js:273` -> `const rows = lines.slice(1).map((line) => {`
- `src/lib/seller.js:275` -> `return Object.fromEntries(headers.map((header, index) => [header, (cols[index] || "").trim()]));`

#### Deep walkthrough (project snippet)
```js
73:               <h2>Seller Applications</h2>
74:               {dashboard.pendingSellers.length === 0 ? <p>No pending applications.</p> : null}
75:               {dashboard.pendingSellers.map((seller) => (
76:                 <div key={seller.user_id} className="card">
77:                   <div className="spread">
```
- Before: array of items from DB/state.
- Operation: .map() callback runs per element.
- After: transformed output used by UI/API response.

#### Extra standalone examples
```js
const doubled = [1, 2, 3].map(n => n * 2); // [2, 4, 6]
```
```js
const names = users.map(u => `${u.first} ${u.last}`);
```
```js
const payload = orders.map(o => ({ id: o.id, total: o.lines.reduce((s, l) => s + l.price, 0) }));
```
> **Concept:** `map` calls your callback once per item and builds a brand-new array from callback return values. It never changes the original array.

**Try it**: Take one UI list render in `MarketplaceHome.js` and rewrite the `map` output to include a computed `isLowStock` flag.

### .filter()

**What it does**: see real code below first.
**Returns**: New array (subset)
**Mutates original?**: No

#### From this project (all usages)
- `src/lib/cart.js:79` -> `variantLabel: [row.option_size, row.option_color, row.option_material].filter(Boolean).join(" / "),`
- `src/lib/cart.js:85` -> `const activeItems = items.filter((item) => !item.savedForLater);`
- `src/lib/cart.js:86` -> `const savedItems = items.filter((item) => item.savedForLater);`
- `src/lib/catalog.js:139` -> `.filter((product) => {`
- `src/lib/catalog.js:294` -> `acc[star] = reviews.filter((review) => review.rating === star).length;`
- `src/lib/orders.js:52` -> `const items = getCartItemsRaw(cart.id).filter((item) => !item.savedForLater);`
- `src/lib/seller.js:259` -> `.filter(Boolean);`

#### Deep walkthrough (project snippet)
```js
77:       priceCents: row.price_cents,
78:       inventory: row.inventory,
79:       variantLabel: [row.option_size, row.option_color, row.option_material].filter(Boolean).join(" / "),
80:       imageUrl: row.image_url || ""
81:     }));
```
- Before: array of items from DB/state.
- Operation: .filter() callback runs per element.
- After: transformed output used by UI/API response.

#### Extra standalone examples
```js
const adults = users.filter(u => u.age >= 18);
```
```js
const defined = arr.filter(Boolean);
```
```js
const cards = products.filter(p => p.inStock).map(p => p.title);
```
> **Concept:** `filter` keeps items where callback returns truthy and drops the rest. Length can shrink to zero.

**Try it**: Add a temporary debug filter to only show products over $50 in `getCatalog()`.

### .find() / .findIndex()

**What it does**: see real code below first.
**Returns**: Single item / index
**Mutates original?**: No

#### From this project (all usages)
- `src/components/ProductDetail.js:32` -> `() => product?.variants?.find((variant) => String(variant.id) === String(selectedVariantId)),`

#### Deep walkthrough (project snippet)
```js
30: 
31:   const selectedVariant = useMemo(
32:     () => product?.variants?.find((variant) => String(variant.id) === String(selectedVariantId)),
33:     [product, selectedVariantId]
34:   );
```
- Before: array of items from DB/state.
- Operation: .find() / .findIndex() callback runs per element.
- After: transformed output used by UI/API response.

#### Extra standalone examples
```js
const seller = sellers.find(s => s.id === targetId);
```
```js
const idx = cartItems.findIndex(i => i.variantId === selectedId);
```
```js
if (idx === -1) { /* not found */ }
```
> **Concept:** `find` returns the first match or `undefined`. `findIndex` returns index or `-1`. Use these when you need one item, not many.

**Try it**: In `ProductDetail.js`, log what happens if selected variant is missing and `find` returns `undefined`.

### .reduce()

**What it does**: see real code below first.
**Returns**: Single accumulated value
**Mutates original?**: Depends on your accumulator logic

#### From this project (all usages)
- `src/components/CheckoutPage.js:54` -> `const shipping = Object.values(form.shippingBySeller || {}).reduce((sum, value) => sum + Number(value || 0), 0);`
- `src/lib/cart.js:88` -> `const groupedBySeller = activeItems.reduce((acc, item) => {`
- `src/lib/cart.js:101` -> `const subtotalCents = group.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);`
- `src/lib/cart.js:109` -> `const subtotalCents = activeItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);`
- `src/lib/cart.js:114` -> `itemCount: activeItems.reduce((sum, item) => sum + item.quantity, 0),`
- `src/lib/catalog.js:57` -> `return rows.reduce((acc, row) => {`
- `src/lib/catalog.js:71` -> `const byParent = rows.reduce((acc, category) => {`
- `src/lib/catalog.js:206` -> `const facets = sorted.reduce(`
- `src/lib/catalog.js:293` -> `const ratingsHistogram = [5, 4, 3, 2, 1].reduce((acc, star) => {`
- `src/lib/catalog.js:299` -> `reviews.length === 0 ? 0 : reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;`
- `src/lib/orders.js:58` -> `const groupedBySeller = items.reduce((acc, item) => {`
- `src/lib/orders.js:64` -> `const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);`
- `src/lib/orders.js:98` -> `const sellerSubtotal = sellerItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);`

#### Deep walkthrough (project snippet)
```js
52: 
53:     const subtotal = cart.subtotal;
54:     const shipping = Object.values(form.shippingBySeller || {}).reduce((sum, value) => sum + Number(value || 0), 0);
55:     const regionTaxRate = ["CA", "NY", "TX"].includes(form.address.region) ? 0.0875 : 0.06;
56:     const tax = Number(((subtotal + shipping) * regionTaxRate).toFixed(2));
```
- Before: array of items from DB/state.
- Operation: .reduce() callback runs per element.
- After: transformed output used by UI/API response.

#### Extra standalone examples
```js
const sum = [10, 20, 30].reduce((acc, n) => acc + n, 0);
```
```js
const byRole = users.reduce((acc, u) => ({ ...acc, [u.role]: [...(acc[u.role] || []), u] }), {});
```
```js
const grouped = items.reduce((acc, item) => { acc[item.sellerId] = acc[item.sellerId] || []; acc[item.sellerId].push(item); return acc; }, {});
```
```js
const flat = [[1,2],[3]].reduce((acc, cur) => acc.concat(cur), []);
```
```js
const counts = words.reduce((acc, w) => ({ ...acc, [w]: (acc[w] || 0) + 1 }), {});
```
> **Concept:** `reduce` is an accumulator loop. The second argument (initial value) defines accumulator type and prevents empty-array edge cases.

**Try it**: In `orders.js`, rewrite one subtotal `reduce` using a `for...of` loop and compare clarity.

### .forEach()

**What it does**: see real code below first.
**Returns**: undefined
**Mutates original?**: Usually used for side effects

#### From this project (all usages)
- `src/components/MarketplaceHome.js:20` -> `Object.entries(filters).forEach(([key, value]) => {`
- `src/lib/db.js:485` -> `definition.variants.forEach((variant) => {`
- `src/lib/engagement.js:37` -> `(payload.images || []).forEach((url) => {`
- `src/lib/orders.js:97` -> `Object.entries(groupedBySeller).forEach(([sellerId, sellerItems]) => {`
- `src/lib/orders.js:133` -> `sellerItems.forEach((item) => {`
- `src/lib/seller.js:70` -> `variants.forEach((variant) => {`
- `src/lib/seller.js:88` -> `(payload.images || []).forEach((url, index) => {`
- `src/lib/seller.js:124` -> `payload.variants.forEach((variant) => {`
- `src/lib/seller.js:267` -> `required.forEach((column) => {`
- `src/lib/seller.js:279` -> `rows.forEach((row) => {`

#### Deep walkthrough (project snippet)
```js
18:   const params = new URLSearchParams({ cursor: String(cursor), limit: "12" });
19: 
20:   Object.entries(filters).forEach(([key, value]) => {
21:     if (value !== "") {
22:       params.set(key, value);
```
- Before: array of items from DB/state.
- Operation: .forEach() callback runs per element.
- After: transformed output used by UI/API response.

#### Extra standalone examples
```js
logs.forEach(msg => console.log(msg));
```
```js
rows.forEach(row => insertRow(row));
```
```js
Object.entries(config).forEach(([k, v]) => setEnv(k, v));
```
> **Concept:** `forEach` is for side effects (logging, DB writes). For data transformations, prefer `map/filter/reduce`.

**Try it**: Find one `forEach` in `seller.js` and explain why returning a value there would be ignored.

### .some() / .every()

**What it does**: see real code below first.
**Returns**: Boolean
**Mutates original?**: No

#### From this project (all usages)
- Not used directly in this project code.

#### Extra standalone examples
```js
const hasOutOfStock = items.some(i => i.inventory === 0);
```
```js
const allValid = fields.every(f => f.trim().length > 0);
```
> **Concept:** `some` stops early at first true. `every` stops early at first false. Great for validation checks.

**Try it**: Add a temporary `every` validation in checkout before submit to ensure required address fields are non-empty.

### .sort()

**What it does**: see real code below first.
**Returns**: Same array reference
**Mutates original?**: Yes

#### From this project (all usages)
- `src/lib/catalog.js:161` -> `const sorted = productsWithRelevance.sort((a, b) => {`

#### Deep walkthrough (project snippet)
```js
159:     });
160: 
161:   const sorted = productsWithRelevance.sort((a, b) => {
162:     if (sort === "price_asc") {
163:       return a.min_price_cents - b.min_price_cents;
```
- Before: array of items from DB/state.
- Operation: .sort() callback runs per element.
- After: transformed output used by UI/API response.

#### Extra standalone examples
```js
[3, 1, 10].sort((a, b) => a - b); // numeric
```
```js
['b', 'a'].sort(); // lexical
```
```js
const safe = [...products].sort((a, b) => a.price - b.price);
```
> **Concept:** `sort` mutates in place. Clone first when mutation is unsafe for state or shared arrays.

**Try it**: In `catalog.js`, clone before sort and compare behavior under repeated calls.

### .flatMap() / .flat()

**What it does**: see real code below first.
**Returns**: Flattened array
**Mutates original?**: No

#### From this project (all usages)
- `src/components/MarketplaceHome.js:72` -> `nodes.flatMap((node) => {`
- `src/lib/seller.js:40` -> `const variants = (payload.variants || []).flatMap((variant) => {`

#### Deep walkthrough (project snippet)
```js
70:   const flatCategories = useMemo(() => {
71:     const flatten = (nodes, prefix = "") =>
72:       nodes.flatMap((node) => {
73:         const label = prefix ? `${prefix} / ${node.name}` : node.name;
74:         return [{ value: node.slug, label }, ...flatten(node.children || [], label)];
```
- Before: array of items from DB/state.
- Operation: .flatMap() / .flat() callback runs per element.
- After: transformed output used by UI/API response.

#### Extra standalone examples
```js
const allTags = posts.flatMap(p => p.tags);
```
```js
const flattened = [[1], [2, 3]].flat();
```
> **Concept:** `flatMap` maps each item then flattens one level. Useful when each input item can yield zero, one, or many outputs.

**Try it**: In `seller.js`, trace `flatMap` in variant creation and explain why returning `[]` skips invalid rows.

### Chaining (project examples)

Project-first example from `src/lib/seller.js`:
```js
255: export function importProductsFromCsv({ sellerId, csvText }) {
256:   const lines = csvText
257:     .split(/\r?\n/)
258:     .map((line) => line.trim())
259:     .filter(Boolean);
260: 
261:   if (lines.length < 2) {
262:     throw new Error("CSV needs a header row and at least one data row");
263:   }
264: 
265:   const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
266:   const required = ["title", "description", "sku", "price", "inventory"];
267:   required.forEach((column) => {
268:     if (!headers.includes(column)) {
269:       throw new Error(`Missing required CSV column: ${column}`);
270:     }
271:   });
272: 
273:   const rows = lines.slice(1).map((line) => {
274:     const cols = line.split(",");
275:     return Object.fromEntries(headers.map((header, index) => [header, (cols[index] || "").trim()]));
276:   });
```
Step-by-step logs:
```js
console.log(lines); // raw CSV lines
console.log(lines.map(line => line.trim())); // trimmed lines
console.log(lines.map(line => line.trim()).filter(Boolean)); // non-empty
console.log(headers.map((h, i) => [h, cols[i]])); // key-value pairs
```
This is how real code composes small array operations into readable pipelines.

### Spread operator with arrays

Project snippet (`src/components/MarketplaceHome.js`):
```js
46:       const data = await apiRequest(`/api/catalog?${query}`);
47: 
48:       setProducts((current) => (append ? [...current, ...data.products] : data.products));
49:       setCursor(next);
```
Extra examples:
```js
const merged = [...a, ...b];
const copied = [...original];
```
> **Concept:** Spread creates a shallow copy, which helps avoid mutation bugs in React.

**Try it**: replace one spread copy with direct push and observe side effects.

### Destructuring arrays

Project-adjacent React pattern (used across components):
```js
const [cart, setCart] = useState(null);
const [step, setStep] = useState(0);
```
Extra examples:
```js
const [first, ...rest] = [10, 20, 30];
const [x = 0, y = 0] = point;
```
> **Concept:** Array destructuring assigns by position, not key name.

### Object.keys / Object.values / Object.entries

Project snippet:
```js
149:           <span>Category facets: {Object.entries(facets.categories || {}).map(([key, count]) => `${key} (${count})`).join(" | ") || "none"}</span>
```
Project snippet 2:
```js
54:     const shipping = Object.values(form.shippingBySeller || {}).reduce((sum, value) => sum + Number(value || 0), 0);
```
Extra examples:
```js
Object.entries(filters).forEach(([k, v]) => { /* ... */ });
Object.fromEntries([['q', 'desk'], ['sort', 'price_asc']]);
```
> **Concept:** these methods convert objects into iterable arrays so you can use array methods on dynamic object data.

## Functions and Scope

### Declarations vs expressions vs arrow functions

Project code first:
```js
89: export function getCatalog({
90:   query = "",
91:   category = "",
92:   minPrice = "",
93:   maxPrice = "",
94:   minRating = "",
95:   shippingSpeed = "",
96:   seller = "",
97:   sort = "relevance",
98:   cursor = "0",
99:   pageSize = 12
```
```js
17: function buildQuery(filters, cursor) {
18:   const params = new URLSearchParams({ cursor: String(cursor), limit: "12" });
19: 
20:   Object.entries(filters).forEach(([key, value]) => {
21:     if (value !== "") {
22:       params.set(key, value);
23:     }
24:   });
25: 
26:   return params.toString();
27: }
```
```js
57:   return rows.reduce((acc, row) => {
58:     if (!acc[row.product_id]) {
59:       acc[row.product_id] = row.url;
60:     }
61:     return acc;
62:   }, {});
63: }
```
- Declaration: hoisted and readable for module-level business functions.
- Arrow callback: concise for inline transforms (`map`, `reduce`).
- Function expression/const: common when function identity should be lexical in component scope.

### Closures (real project examples)

Project code first (`ProductDetail.js` event handler closes over state):
```js
72:   async function voteReview(reviewId, vote) {
73:     try {
74:       setReviewVoteLoading(reviewId);
75:       await apiRequest("/api/reviews/vote", {
76:         method: "POST",
77:         body: JSON.stringify({ reviewId, vote })
78:       });
79:       await loadProduct();
80:     } catch (requestError) {
81:       setError(requestError.message);
82:     } finally {
83:       setReviewVoteLoading(null);
```
This callback closes over `productId`, `setError`, and `setReviewVoteLoading`.

Extra examples:
```js
function makeTax(rate) {
  return amount => amount * rate;
}
const caTax = makeTax(0.0875);
```
> **Concept:** A closure means a function remembers variables from the scope where it was created.

### Higher-order functions

Project code first (`reduce`, `map`, `filter` callbacks are functions passed to functions):
```js
85:   const activeItems = items.filter((item) => !item.savedForLater);
86:   const savedItems = items.filter((item) => item.savedForLater);
87: 
88:   const groupedBySeller = activeItems.reduce((acc, item) => {
89:     const key = item.sellerId;
90:     acc[key] = acc[key] || {
91:       sellerId: item.sellerId,
92:       sellerName: item.sellerName,
93:       shippingSpeedDays: item.shippingSpeedDays,
94:       items: []
95:     };
96:     acc[key].items.push(item);
97:     return acc;
98:   }, {});
99: 
100:   const sellers = Object.values(groupedBySeller).map((group) => {
101:     const subtotalCents = group.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
102:     return {
103:       ...group,
```
Extra example:
```js
const withLogging = fn => (...args) => {
  console.log(args);
  return fn(...args);
};
```
> **Concept:** Higher-order functions take functions as input or return functions as output.

### Default and rest parameters

Project code first:
```js
26: export function generateToken(size = 48) {
```
```js
3: export function jsonOk(data, status = 200) {
4:   return NextResponse.json(data, { status });
5: }
6: 
7: export function jsonError(error, fallbackStatus = 400) {
```
Extra example:
```js
function sum(label = 'total', ...nums) {
  return `${label}: ${nums.reduce((a, n) => a + n, 0)}`;
}
```

## Async JavaScript

### Promises and async/await (project flow)

Project code first (`apiRequest`):
```js
1: export async function apiRequest(path, options = {}) {
2:   const response = await fetch(path, {
3:     headers: {
4:       "Content-Type": "application/json",
5:       ...(options.headers || {})
6:     },
7:     ...options
8:   });
9: 
10:   const data = await response.json().catch(() => ({}));
11: 
12:   if (!response.ok) {
13:     throw new Error(data.error || "Request failed");
14:   }
15: 
16:   return data;
```
Project code first (component call):
```js
12:   async function loadCart() {
13:     setLoading(true);
14:     try {
15:       const data = await apiRequest("/api/cart");
16:       setCart(data.cart);
17:       setError("");
18:     } catch (requestError) {
19:       setError(requestError.message);
20:     } finally {
21:       setLoading(false);
22:     }
23:   }
24: 
```
Project code first (`.then/.catch` style):
```js
64:   useEffect(() => {
65:     apiRequest("/api/recently-viewed")
66:       .then((data) => setRecentlyViewed(data.items || []))
67:       .catch(() => setRecentlyViewed([]));
```
- `await` version reads top-to-bottom.
- `.then()` chain is still valid; useful for quick pipelines.

> **Concept:** `await` does not freeze JavaScript globally; it pauses only inside that async function and yields control back to the event loop.

### Error handling with try/catch

Project code first (API route):
```js
25: export async function POST(request) {
26:   try {
27:     const body = await request.json();
28:     const identity = await resolveIdentity();
29: 
30:     const cart = addCartItem({
31:       ...identity,
32:       productId: body.productId,
33:       variantId: body.variantId,
34:       quantity: body.quantity
35:     });
36: 
37:     return jsonOk({ cart });
38:   } catch (error) {
39:     return jsonError(error, 400);
40:   }
41: }
```
Project code first (UI):
```js
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
```
If you skip `catch`, Promise rejections can bubble and show generic errors without user-friendly messaging.

### Promise.all / Promise.allSettled

Not used directly in this project yet.

Extra examples:
```js
const [products, cart] = await Promise.all([
  fetch('/api/catalog').then(r => r.json()),
  fetch('/api/cart').then(r => r.json())
]);
```
```js
const results = await Promise.allSettled(tasks);
const failed = results.filter(r => r.status === 'rejected');
```

### Full request trace (frontend -> backend -> DB)
1. `ProductDetail.addToCart()` sends `POST /api/cart`.
2. API `cart/route.js` parses JSON and calls `addCartItem()`.
3. `addCartItem()` runs SQL via prepared statements in `cart.js`.
4. JSON cart result returns to component and UI state updates.

## State and Immutability

Project code first (object state update):
```js
64:     setForm((current) => ({
65:       ...current,
66:       address: {
67:         ...current.address,
68:         [field]: value
69:       }
70:     }));
71:   }
```
Project code first (nested update):
```js
161:                   onChange={(event) => setForm((current) => ({
162:                     ...current,
163:                     shippingBySeller: {
164:                       ...current.shippingBySeller,
165:                       [seller.sellerId]: Number(event.target.value)
166:                     }
167:                   }))}
168:                 >
```
Why no mutation: React compares references. `[] !== []` and `{}` !== `{}` create new references, which trigger renders predictably.

Extra examples:
```js
const next = { ...state, count: state.count + 1 };
const nextItems = state.items.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i);
```

## Destructuring and Spread (Objects)

Project code first:
```js
134:               <div><label>Name</label><input value={storeForm.name} onChange={(event) => setStoreForm((c) => ({ ...c, name: event.target.value }))} required /></div>
135:               <div><label>Slug</label><input value={storeForm.slug} onChange={(event) => setStoreForm((c) => ({ ...c, slug: event.target.value }))} required /></div>
136:               <div><label>Description</label><textarea value={storeForm.description} onChange={(event) => setStoreForm((c) => ({ ...c, description: event.target.value }))} /></div>
137:               <div><label>Seller Bio</label><textarea value={storeForm.bio} onChange={(event) => setStoreForm((c) => ({ ...c, bio: event.target.value }))} /></div>
138:               <div><label>Shipping speed days</label><input type="number" min="1" max="30" value={storeForm.shippingSpeedDays} onChange={(event) => setStoreForm((c) => ({ ...c, shippingSpeedDays: Number(event.target.value) || 5 }))} /></div>
139:               <button type="submit">Save Store</button>
```
```js
95:     .map((item) => ({
96:       id: item.id,
97:       productId: item.product_id,
98:       title: item.title,
```
- Object destructuring in params example: `function ProductDetail({ productId })`.
- Rest pattern example (standalone): `const { id, ...rest } = product;`.

## Template Literals and Modern Syntax

### Optional chaining (`?.`)
Project usage examples:
- `src/components/ProductDetail.js:103`
- `src/lib/auth.js:25`
- `src/lib/orders.js:102`

### Nullish coalescing (`??`) vs OR (`||`)
Project usage examples:
- `??`: `src/lib/orders.js:90`, `src/lib/catalog.js:72`
- `||`: many fallback defaults in `src/lib/seller.js` and UI files.

Rule of thumb: use `??` when `0`, `false`, or `''` are valid values; use `||` when any falsy value should fallback.

### Short-circuit patterns in JSX
Project examples:
```js
174:       {!loading && products.length === 0 ? <div className="card">No products matched your filters.</div> : null}
175: 
176:       <div className="row">
177:         {loading ? <span className="muted">Loading...</span> : null}
178:         {!loading && nextCursor != null ? (
179:           <button type="button" onClick={() => loadCatalog(nextCursor, true)}>
```
```js
87:   if (error && !product) {
```
In JSX, `condition && <Element />` renders the element only when condition is truthy.

## Quick practice block
- Read one `.filter().map()` chain in `catalog.js` and write console snapshots for each stage.
- Take one API route and explain where validation happens, where business logic happens, and where response formatting happens.
- Refactor one state update to prove immutability (show before/after references).

## Additional Fundamentals Coverage

### `this` keyword (relevance in this codebase)
Project-first note: this project intentionally avoids `this` by using modules, plain functions, and arrow callbacks.

Example from project style:
```js
const update = (value) => setForm((current) => ({ ...current, value }));
```

Extra examples:
```js
const obj = {
  x: 10,
  regular() { return this.x; },
  arrow: () => this
};
```
```js
function greet() { return this.name; }
const user = { name: 'Ada', greet };
```

> **Concept:** In regular methods, `this` depends on call-site. Arrow functions do not bind their own `this`; they capture lexical `this`.

**Try it**: create a small object with regular and arrow methods and compare outputs.

### Object destructuring details: renaming, nesting, rest
Project-first style appears across handlers/components:
```js
const { searchParams } = new URL(request.url);
```

Extra examples:
```js
const { name: userName } = user; // renaming
const { address: { city } } = profile; // nested
const { id, ...rest } = product; // rest
```

> **Concept:** Destructuring is syntax sugar for extracting properties. Use it to clarify intent, but avoid over-nesting if readability drops.

**Try it**: refactor one object access chain into destructuring in a local branch.

### Tagged templates
Project-first note: tagged templates are not used in this project.

Extra examples:
```js
function dollars(strings, value) {
  return strings[0] + `$${value.toFixed(2)}`;
}
const msg = dollars`Total: ${12.5}`;
```

> **Concept:** Tagged templates let you intercept template literal parts before final string creation.

**Try it**: build a tiny tag that escapes HTML.

### Logical assignment operators (`??=`, `||=`, `&&=`)
Project-first note: these operators are not used directly in current code.

Extra examples:
```js
config.timeout ??= 5000;
user.name ||= 'Guest';
flag &&= canProceed;
```

> **Concept:** Logical assignment combines check + assignment in one operator. Use carefully; readability first.

**Try it**: rewrite one local fallback branch using `??=` and compare clarity.

### Reference vs value equality
Project-first reminder: React updates in this project use spread (`{ ...current }`) to create new references.

Extra examples:
```js
[] === [] // false
const a = [1];
const b = a;
a === b // true
```

> **Concept:** Objects/arrays compare by reference, primitives compare by value. React render logic depends heavily on this.

**Try it**: log comparisons before and after spread cloning.
