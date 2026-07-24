# Array Methods Cheat Sheet

Every method below is grounded in this project code first, then reinforced with extra examples.

## .map()

**What it does**: Transforms each item into a new value.
**Returns**: New array
**Mutates original?**: No

### From this project:
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

### Extra examples:
```js
const prices = [10, 20].map(p => p * 100);
```
```js
const users = rows.map(r => ({ id: r.id, label: r.name }));
```
### Gotcha:
If you forget `return` in a block body, you get `undefined` values.

### When to use vs alternatives:
Use `.map()` when output length should match input length.

## .filter()

**What it does**: Keeps only items that pass a condition.
**Returns**: New array subset
**Mutates original?**: No

### From this project:
- `src/lib/cart.js:79` -> `variantLabel: [row.option_size, row.option_color, row.option_material].filter(Boolean).join(" / "),`
- `src/lib/cart.js:85` -> `const activeItems = items.filter((item) => !item.savedForLater);`
- `src/lib/cart.js:86` -> `const savedItems = items.filter((item) => item.savedForLater);`
- `src/lib/catalog.js:139` -> `.filter((product) => {`
- `src/lib/catalog.js:294` -> `acc[star] = reviews.filter((review) => review.rating === star).length;`
- `src/lib/orders.js:52` -> `const items = getCartItemsRaw(cart.id).filter((item) => !item.savedForLater);`
- `src/lib/seller.js:259` -> `.filter(Boolean);`

### Extra examples:
```js
const inStock = items.filter(i => i.inventory > 0);
```
```js
const clean = values.filter(v => v != null);
```
### Gotcha:
Returning non-boolean is allowed (truthy/falsy), but can be confusing.

### When to use vs alternatives:
Use `.find()` if you only need one item.

## .find()

**What it does**: Returns first matching item.
**Returns**: Single item or undefined
**Mutates original?**: No

### From this project:
- `src/components/ProductDetail.js:32` -> `() => product?.variants?.find((variant) => String(variant.id) === String(selectedVariantId)),`

### Extra examples:
```js
const admin = users.find(u => u.role === 'ADMIN');
```
```js
const row = results.find(r => r.id === wantedId);
```
### Gotcha:
Can return `undefined`, so guard before property access.

### When to use vs alternatives:
Use `.filter()` when you need all matches.

## .findIndex()

**What it does**: Returns index of first match.
**Returns**: Number index or -1
**Mutates original?**: No

### From this project:
- Not used directly in current code.

### Extra examples:
```js
const idx = items.findIndex(i => i.id === 42);
```
```js
if (idx !== -1) items.splice(idx, 1);
```
### Gotcha:
Always check `=== -1` before using index.

### When to use vs alternatives:
Use when you need index updates/removal.

## .reduce()

**What it does**: Accumulates array items into one value.
**Returns**: Accumulator value
**Mutates original?**: Depends on accumulator strategy

### From this project:
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

### Extra examples:
```js
const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
```
```js
const bySeller = items.reduce((acc, i) => ({ ...acc, [i.seller]: [...(acc[i.seller] || []), i] }), {});
```
### Gotcha:
Missing initial value can break empty-array cases.

### When to use vs alternatives:
Use `.map()`/`.filter()` first if accumulation is too complex.

## .forEach()

**What it does**: Runs side effects per item.
**Returns**: undefined
**Mutates original?**: Not directly, but often used with side effects

### From this project:
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

### Extra examples:
```js
errors.forEach(e => console.error(e));
```
```js
rows.forEach(r => insert(r));
```
### Gotcha:
Cannot `break` early like loops.

### When to use vs alternatives:
Prefer `.map()` for transformations.

## .some()

**What it does**: Checks if any item matches.
**Returns**: Boolean
**Mutates original?**: No

### From this project:
- Not used directly in current code.

### Extra examples:
```js
const hasInvalid = inputs.some(v => v === '');
```
```js
const hasDiscount = lines.some(l => l.type === 'DISCOUNT');
```
### Gotcha:
Stops early; good for performance.

### When to use vs alternatives:
Use `.every()` when all items must pass.

## .every()

**What it does**: Checks if all items match.
**Returns**: Boolean
**Mutates original?**: No

### From this project:
- Not used directly in current code.

### Extra examples:
```js
const allFilled = fields.every(f => f.trim());
```
```js
const allPositive = nums.every(n => n > 0);
```
### Gotcha:
Returns true for empty arrays (vacuously true).

### When to use vs alternatives:
Use `.some()` when one match is enough.

## .sort()

**What it does**: Sorts items based on comparator.
**Returns**: Same array reference
**Mutates original?**: Yes

### From this project:
- `src/lib/catalog.js:161` -> `const sorted = productsWithRelevance.sort((a, b) => {`

### Extra examples:
```js
const byPrice = [...products].sort((a, b) => a.price - b.price);
```
```js
const byName = [...names].sort((a, b) => a.localeCompare(b));
```
### Gotcha:
Default sort is lexical string sort, not numeric.

### When to use vs alternatives:
Clone first (`[...arr]`) when immutability matters.

## .flatMap()

**What it does**: Maps then flattens one level.
**Returns**: Flattened array
**Mutates original?**: No

### From this project:
- `src/components/MarketplaceHome.js:72` -> `nodes.flatMap((node) => {`
- `src/lib/seller.js:40` -> `const variants = (payload.variants || []).flatMap((variant) => {`

### Extra examples:
```js
const tags = posts.flatMap(p => p.tags);
```
```js
const rows = groups.flatMap(g => g.items.map(i => ({ group: g.id, ...i })));
```
### Gotcha:
Only flattens one level.

### When to use vs alternatives:
Use `.map().flat()` when you need clearer debugging.

## .flat()

**What it does**: Flattens nested arrays.
**Returns**: New flattened array
**Mutates original?**: No

### From this project:
- Not used directly in current code.

### Extra examples:
```js
const merged = [[1], [2, 3]].flat();
```
```js
const deep = nested.flat(2);
```
### Gotcha:
Depth default is 1.

### When to use vs alternatives:
Use `.flatMap()` when also transforming.

## Decision Tree

Need to transform every item? -> `.map()`

Need to remove some items? -> `.filter()`

Need to find one item? -> `.find()`

Need to check if any/all items match? -> `.some()` / `.every()`

Need to combine items into one value? -> `.reduce()`

Need side effects for each item? -> `.forEach()`

Need to transform and flatten? -> `.flatMap()`

