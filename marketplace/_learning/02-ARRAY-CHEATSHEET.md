# Array Methods Cheat Sheet

Quick reference. The full per-method walkthroughs, with every usage in this
codebase indexed by file and line, live in `01-JS-FUNDAMENTALS.md` — this page
is for when you're mid-edit and need the answer in ten seconds.

## Which method do I want?

| I want to... | Use | Example from this repo |
| --- | --- | --- |
| Transform every item (same length out) | `.map()` | `src/lib/seller.js:265` — CSV headers → trimmed lowercase names |
| Keep a subset | `.filter()` | `src/lib/cart.js:85` — split active items from saved-for-later |
| Get the first match (one item) | `.find()` | `src/components/ProductDetail.js:32` — selected variant by id |
| Boil the array down to one value | `.reduce()` | `src/lib/orders.js:64` — cart subtotal in cents |
| Group rows by a key | `.reduce()` into an object | `src/lib/orders.js:58` — cart items grouped by seller |
| Run a side effect per item (DB write, param set) | `.forEach()` | `src/lib/orders.js:133` — insert one `order_items` row per item |
| Map where each item yields 0..n outputs | `.flatMap()` | `src/components/MarketplaceHome.js:72` — flatten the category tree |
| Reorder | `.sort()` (mutates!) | `src/lib/catalog.js:161` — price/rating/relevance sorting |
| Ask "does at least one / do all pass?" | `.some()` / `.every()` | not used here — good first-use: validate address fields before checkout |

## Return values and mutation

| Method | Returns | Mutates original? |
| --- | --- | --- |
| `.map()` | new array, same length | no |
| `.filter()` | new array, 0..n items | no |
| `.find()` / `.findIndex()` | one item / index, or `undefined` / `-1` | no |
| `.reduce()` | whatever your accumulator is | no (unless your callback mutates) |
| `.forEach()` | `undefined` — always | no (side effects are the point) |
| `.flatMap()` / `.flat()` | new flattened array | no |
| `.sort()` | **the same array** | **yes — clone first if shared:** `[...arr].sort()` |
| `.some()` / `.every()` | boolean (stops early) | no |

## Gotchas that actually bite

- **`map` with a block body needs `return`.** `items.map(i => { i.price * 2 })`
  is an array of `undefined`s. Either drop the braces or return explicitly.
- **`find` returns `undefined`, not `null`, and never throws.** That's why
  `ProductDetail.js` wraps the result in optional chaining before reading
  `.priceCents` off it.
- **`===` inside `find`/`filter` doesn't coerce.** Form values are strings,
  SQLite ids are numbers — this repo normalises with `String(a) === String(b)`
  (`ProductDetail.js:32`).
- **`reduce` without an initial value throws on empty arrays.** Every `reduce`
  in this repo passes one (`0` for sums, `{}` for grouping). Keep that habit.
- **`sort` mutates in place.** Safe in `catalog.js:161` only because the array
  was freshly built in the same function. Never in-place-sort React state or
  props.
- **`filter(Boolean)` drops `''`, `0`, `null`, `undefined`, `false`.** Great
  for option labels (`cart.js:79`); wrong if `0` is a value you need to keep.
- **`forEach` ignores `return` and can't `await` sequentially.** For async
  work in order, use `for...of`.

## The two shapes this repo uses constantly

**Sum in cents** (`cart.js`, `orders.js` — money is always integer cents):

```js
const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
```

**Group rows by key** (`orders.js:58` — the heart of multi-seller checkout):

```js
const groupedBySeller = items.reduce((acc, item) => {
  acc[item.sellerId] = acc[item.sellerId] ?? [];
  acc[item.sellerId].push(item);
  return acc;
}, {});
```

If you can write both of these from memory, you can read 90% of the data
shaping in `src/lib/`.
