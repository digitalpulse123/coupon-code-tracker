# Coupon Code Tracker

Internal web application for tracking Pulse &amp; Cocktails coupon redemptions across online and in-store channels. Built to the spec `Coupon Performance Tracker` v1.1.0.

Online redemption data originates from Metorik (CSV in phase 1). In-store figures are entered centrally by the marketing team in batches against a coupon code. The app reports both channels, separately or combined, at daily, weekly and monthly granularity.

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Next.js (App Router) |
| Database | PostgreSQL (Railway managed) |
| ORM / migrations | Prisma |
| Auth | Auth.js credentials provider (to be added) |
| Hosting | Railway, deploy on push to `main` |

## Local setup

Requires Node.js 20+ and access to a Postgres database (a Railway dev instance or local Postgres).

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and AUTH_SECRET
npm run db:deploy            # apply migrations to the database in DATABASE_URL
npm run dev                  # http://localhost:3000
```

Health check: `GET /api/health` reports service and database reachability.

## Environment variables

Keys only live in `.env.example` (NFR-002). Real values go in `.env.local` locally (gitignored) and in Railway variables in production.

| Key | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Auth.js secret. Generate with `npx auth secret` |
| `AUTH_URL` | Base URL of the deployment |
| `METORIK_API_KEY` | Phase 2 only |
| `METORIK_STORE_ID` | Phase 2 only |
| `NODE_ENV` | `development` or `production` |

## Database

Schema lives in [`prisma/schema.prisma`](prisma/schema.prisma) and mirrors section 5 of the spec. Online and in-store redemptions are separate tables that join at the reporting layer.

Key invariants baked into the first migration:

- **Unique `(order_number, coupon_code)`** on `online_redemption`. This is what makes CSV imports idempotent. Re-importing an overlapping range upserts, never duplicates.
- CHECK: a coupon must be valid on at least one channel.
- CHECK: multibuy `pay_qty` is less than `qty`.
- CHECK: in-store discount does not exceed the transaction total.
- CHECK: a line item belongs to exactly one redemption (online xor in-store).

Migration commands:

```bash
npm run db:migrate    # create/apply a new migration in development
npm run db:deploy     # apply committed migrations (used in production)
npm run db:studio     # browse data
```

Migrations are committed to version control. No manual schema changes against production.

## Deployment (Railway)

Railway builds on push to `main`. See `railway.json`.

- **Build**: `npm run build`
- **Start**: `npx prisma migrate deploy && npm run start`

Migrations run at start-up rather than build-time so they can reach the Postgres service over Railway's private network (private networking is not available during the build phase). Schema changes still ship with the code on every deploy.

## Conventions

British English throughout. No em dashes in UI copy. GBP to two decimal places. Dates displayed `DD/MM/YYYY`. Tabular numerals for aligned columns. Channel colours never vary: **online is pink `#E8197D`, in-store is teal `#16A085`**; navy is `#1A1A2E`.

## Build status

Phase 1, in progress.

- [x] Repo, Railway config, Postgres schema, blank page deployable
- [x] Prisma schema and initial migration, including the unique constraint
- [ ] Auth (Auth.js credentials)
- [ ] Store master and aliases
- [ ] Coupon master: create form and searchable index
- [ ] CSV import pipeline with upsert and batch logging
- [ ] Coupon detail with both channel tables
- [ ] In-store batch entry with edit, delete and audit log
- [ ] Dashboard with granularity, breakdowns and both freshness dates
- [ ] CSV export
