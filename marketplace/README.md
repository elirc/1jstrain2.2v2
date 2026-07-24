# MarketForge - Multi-Vendor E-Commerce Marketplace

MarketForge is a full-stack marketplace MVP inspired by Shopify + Etsy, built with **Next.js (App Router)** and **Node's built-in SQLite (`node:sqlite`)**.

It includes:
- Buyer flow: browse, faceted search, product detail with variants, persistent cart, multi-seller checkout, order tracking, reviews.
- Seller flow: store onboarding, product CRUD, CSV bulk import, inventory monitoring, order fulfillment, earnings metrics.
- Admin flow: GMV/take-rate analytics, seller application approvals, dispute resolution queue.
- Core e-commerce correctness: inventory validation at add-to-cart and checkout, seller order splitting, transaction/payout records.

## Stack
- Next.js 16 (App Router)
- React 19
- SQLite via `node:sqlite` (no external DB dependency)
- JavaScript only (no TypeScript in app code)

## Quick Start

```bash
npm install --no-package-lock
npm run dev
```

Open `http://localhost:3000`.

> The SQLite database is auto-created at `data/marketplace.db` and seeded automatically.

## Seeded Demo Accounts

- Admin: `admin@market.dev` / `Admin123!`
- Seller: `seller@market.dev` / `Seller123!`
- Buyer: `buyer@market.dev` / `Buyer123!`

## Major API Endpoints

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Catalog: `GET /api/catalog`, `GET /api/products/:id`
- Cart/Checkout: `GET|POST|PATCH|DELETE /api/cart`, `POST /api/checkout`
- Orders: `GET|POST /api/orders`, `GET|PATCH /api/seller/orders`
- Seller: `GET /api/seller/dashboard`, `POST /api/seller/store`, `GET|POST|PATCH /api/seller/products`, `POST /api/seller/products/import`
- Admin: `GET /api/admin/analytics`, `PATCH /api/admin/sellers`, `PATCH /api/admin/disputes`
- Engagement: `GET|POST /api/reviews`, `POST /api/reviews/vote`, `GET|POST /api/wishlist`, `GET /api/recently-viewed`

## Notes

- Money is stored in **integer cents** to avoid decimal arithmetic issues.
- Checkout uses a transaction and conditional inventory updates to prevent race-condition oversells.
- `node:sqlite` is currently experimental in Node 22, so Node emits a warning during build/runtime.
