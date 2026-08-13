# Coupon Code Tracker — where we are / next up

_Last worked: 2026-08-13. Resume: 2026-08-14._

## Quick links

- **Live app:** https://coupon-code-tracker-production.up.railway.app
- **Repo:** https://github.com/digitalpulse123/coupon-code-tracker
- **Health check:** `/api/health` (should show `{"status":"ok","db":"ok"}`)
- **Admin login:** emma.davis@pulseandcocktails.co.uk

## How deploys work now

- Push to `main` → Railway **auto-deploys** (this is switched on; if a push ever
  stops deploying, check Settings → Source → branch → "Auto deploy").
- Migrations run automatically on start-up (`prisma migrate deploy`).
- Env vars set in Railway: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`,
  `METORIK_API_KEY`. App listens on port **8080** (Railway's port).

## Phase 1 progress

- [x] Repo, Railway, Postgres, deployed & reachable
- [x] Prisma schema + migrations (incl. the idempotency unique constraint)
- [x] Auth (login, first-admin setup, route protection, admin/viewer roles)
- [x] Store master + aliases (`/admin/stores`) — the 17 stores seeded
- [x] Coupon master: create, **edit, delete**, searchable index
- [x] Coupon detail + in-store batch entry (with audit log)
- [x] Promotions mapping admin (`/admin/promotions`)
- [ ] **Metorik daily import** ← next big build
- [ ] Dashboard (daily/weekly/monthly, breakdowns, freshness dates)
- [ ] CSV export

## The key architecture finding (important context)

Online discounts do **not** use WooCommerce coupon codes. They run through the
**IJW Promotions** plugin. Metorik's order API does not expose coupon codes, but
each order's `line_items[].meta` carries **`_ijwp_promotion_id`** (e.g. `58`).
That is how we attribute an online order to a promotion.

- One order = one promotion (all its line items share the same promotion ID).
- ~27% of recent orders carry a promotion.
- `shipping_method_title` tells us fulfilment:
  - `Store Collection - Pay Online` → click & collect
  - `Store Collection - Pay Instore` → click & reserve
  - `Guaranteed` / `Pickup Point` → delivery (the "guaranteed" group)
- In-store usage is **always manual** (Metorik is online only).

Promotion IDs are mapped to coupon codes on `/admin/promotions`
(suggested names live in `lib/known-promotions.ts`). The `metorik_promotion`
table records each discovered promotion and its assigned coupon.

## NEXT UP — the daily import

Build the importer that turns orders into online redemptions:

1. Pull orders from Metorik (`GET /orders`, paginated, newest first / by date).
2. For each order, read `_ijwp_promotion_id` from line-item meta.
3. Resolve promotion → coupon via `metorik_promotion.couponId`. Unknown/
   unassigned promotions get **surfaced**, never dropped.
4. Upsert **one `online_redemption` per (order_number, promotion)** so re-runs
   never double-count. Fields: order date, order total, `shipping_method_raw`
   + derived `fulfilment_group`, `is_refunded` (from status / `total_refunds`).
5. Store `redemption_line_item` rows from `line_items`, **excluding SKU
   `QMP001`** (BR-05).
6. Write an `import_batch` row (rows read/created/updated/skipped).
7. UI: an admin **Import** screen with a **"Sync now"** button showing the
   result, plus a **daily schedule** (Railway cron hitting a protected sync
   endpoint, or a scheduled job).

### Open questions to resolve during that build

- **Discount amount:** not cleanly present in the order data (line prices look
  already-adjusted). Likely we report **usage + revenue** online, and discount
  stays reliable only for in-store (entered) — confirm this is acceptable.
- **Which store for click & collect:** the order says it *was* C&C but not
  *which* store. May live in an order meta field we haven't found yet
  (Metorik `custom_fields`). For now online C&C is counted without a store.

## Smaller follow-ups / tidy-ups

- Coupons auto-created from promotions start with **no offer type** — set them
  via **Edit coupon** (2 for £50 → Multibuy, 20% off Payday → Percentage 20…).
- No admin view of the **audit log** yet (data is being written).
- Coupon `type` (daily / email-limited) left "Not set" on seeded codes.
- Consider a WooCommerce API path later if the pickup store / real discount
  become essential (WooCommerce carries coupon_lines + order meta that Metorik
  strips).

## Local dev

```bash
npm install
# .env.local holds DATABASE_URL + AUTH_SECRET (gitignored)
npm run dev            # http://localhost:3000
npm run db:migrate     # create/apply a migration
```

Prisma CLI reads `.env.local` via dotenv-cli (the `db:*` scripts). The app is
Next.js (App Router) + Prisma + Auth.js. Note: the project folder is inside
OneDrive — if a build throws an `EINVAL readlink .next` error, delete `.next`
and rebuild.
