# Coupon Code Tracker — where we are / next up

_Last worked: 2026-08-18. Resume: next session._

## Quick links

- **Live app:** https://coupon-code-tracker-production.up.railway.app
- **Repo:** https://github.com/digitalpulse123/coupon-code-tracker
- **Health:** `/api/health` (should show `{"status":"ok","db":"ok"}`)
- **Admin login:** emma.davis@pulseandcocktails.co.uk

## How it runs

- Push to `main` → Railway auto-deploys. Migrations run on start-up.
- Railway env vars set: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`,
  `METORIK_API_KEY`, and `CRON_SECRET` (for the daily job). App listens on 8080.
- Daily Metorik sync at 06:00 UTC via `.github/workflows/daily-sync.yml`
  (needs `CRON_SECRET` in both Railway and GitHub repo secrets).

## What's built and working (all live)

- **Auth**: login, first-admin setup, roles admin/viewer, route protection.
- **Users** (`/admin/users`): add people (viewer or admin), enable/disable — this
  is how you give someone access (create them, share the link + password).
- **Stores** (`/admin/stores`): the 17 stores + aliases.
- **Coupons**: create / edit / delete, searchable index, detail page with the
  online + in-store channel blocks.
- **Metorik online import** (`/admin/imports`): "Sync now" + daily auto. Pulls
  orders, matches each to a code, records order-level online redemptions.
- **Promotions** (`/admin/promotions`): auto-map + manual mapping (see below).
- **In-store entry**: on a coupon's detail page. One card per redemption:
  store, total, receipt, and a **product picker** (search Metorik by SKU/name,
  pick with thumbnail/stock). Products stored structured. A single **"Date used"**
  box at the top dates the whole batch (blank = today).
- **Dashboard**: KPIs, redemptions-over-time chart, in-store by-store, top codes,
  **date-range picker** + daily/weekly/monthly granularity.
- **Design**: full reskin to the prototype (navy sidebar, Playfair headings,
  pink=online / teal=in-store).

## The core concept (important)

Online discounts are **IJW promotions**, not WooCommerce coupons. Metorik's order
API doesn't carry coupon codes, but each order line item carries
`_ijwp_promotion_id`. A customer code (e.g. VIBE20, SIGNUP15-2865) is an IJW
**gate coupon** whose Metorik description says "Gate coupon for IJW promotion
#NNN". So:

- **Auto-map** reads each code's gate-coupon description, maps promotion NNN → the
  code, and attaches redemptions. It runs inside every sync now, so new codes
  attribute themselves. Manual button also on the Promotions page.
- Automatic category promos with no code (e.g. "2 for £50") are mapped by hand on
  the Promotions page; suggested names are in `lib/known-promotions.ts`.

## Accuracy vs Metorik (where we got to today)

- After a fresh 30-day Sync now, code counts came into line with Metorik.
- Added: **exclude failed / cancelled / pending orders** (match Metorik, BR-04).
  A re-sync also deletes any such orders imported earlier.
- **Remember when comparing:** the dashboard defaults to the **last 30 days** —
  set the date range to match the Metorik view before comparing numbers.
- Day-boundary drift is possible (Metorik = UK time, we bucket in UTC).

## NEXT UP / open items

- [ ] **Verify accuracy**: after the status-exclusion deploy, run a 30-day Sync
      now and compare codes to Metorik on matching dates. Flag any still off.
- [ ] **Hourly auto-sync** (optional): currently once daily at 06:00. Can bump to
      hourly so figures stay current through the day — offered, not yet done.
- [ ] **CSV export**: the last original spec item, not built yet.
- [ ] Optional: richer create form (channel-picker cards + live offer preview
      like the prototype); a "change date on all of a code's in-store entries"
      tool; a "change password" option for users; an audit-log admin view.

## Data source notes

- Metorik REST API: base `https://app.metorik.com/api/v1/store`, Bearer key.
  Orders: `GET /orders`. Product/coupon lookup: `GET /search?resource=...&query=`.
- The Metorik MCP is also connected in the working session (store 122386) and is
  handy for diagnosing discrepancies directly.

## Local dev

```bash
npm install
npm run dev            # http://localhost:3000 (.env.local holds secrets)
npm run db:migrate     # create/apply a migration
```
Next.js App Router + Prisma + Auth.js. If a build throws `EINVAL readlink .next`
(OneDrive quirk), delete `.next` and rebuild.
