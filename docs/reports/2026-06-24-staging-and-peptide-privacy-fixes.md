# Fixes Report — 2026-06-24

Summary of changes landed on `main` for the HumanEdge (Railway) migration target.
All changes verified against a clean production build (`npm run build`, exit 0).

## 1. Staging environment seal (`APP_ENV`)

Goal: make the HumanEdge deployment incapable of affecting real customers, payments, or
email while it is still a migration target — without forking the codebase.

- Added a single umbrella flag `server/_core/appEnv.ts` (`isStaging()` reads `APP_ENV`).
- **Stripe** forced into test mode whenever staging (`server/stripe/stripeConfig.ts`) — a
  live key in the environment still cannot charge a real card.
- **Email** suppressed at the single Resend send chokepoint (`server/emailService.ts`) —
  every outbound email path is covered by one guard.
- **Cron jobs + IMAP reply polling** skipped at boot in staging (`server/_core/index.ts`).
- **Client banner** (`client/src/components/StagingBanner.tsx`, wired in `App.tsx`) shows a
  red "STAGING — test data only" bar when built with `VITE_APP_ENV=staging`.
- To enable on the staging deploy: set `APP_ENV=staging`, `VITE_APP_ENV=staging`, test
  Stripe keys, a staging `DATABASE_URL`, and a staging R2 bucket. No code changes needed.

## 2. Peptide / compound-name privacy (Stripe ban-risk mitigation)

Goal: compound and peptide names must never reach any customer-facing payment or email
surface (Stripe previously banned the account over a receipt naming a peptide). Real names
are retained only in admin views, the database, and packing slips for fulfillment.

- **Stripe checkout line items** collapsed to a single neutral "Coaching Program" line
  (charged total preserved) across the store checkout (`server/routers.ts`) and both
  custom-order checkouts (`server/customOrders/router.ts`).
- **Coaching/transformation checkout** wording neutralized — "Pharmaceutical-grade supply
  sourcing" → generic concierge language (`server/transformation/transformationRouter.ts`).
- **Custom-order invoice email** now shows "Custom Item #N" instead of product names
  (`server/customOrders/router.ts`).
- **Shipping-notification email** now shows "Custom Item #N"
  (`server/emailTemplates/shippingNotification.ts`).
- **Client order-history API** (`myOrders` / `myOrder`) sanitized at the boundary so the
  browser never receives compound names or descriptions (`server/customOrders/router.ts`).

## Intentionally unchanged

- Admin views, database records, and packing slips keep real compound names (needed for
  fulfillment).
- **Store funnel** confirmation email + UI-only waiver enforcement are *known* and parked
  pending a product decision on whether the store stays active (tracked in the risk
  register). The store's Stripe line item is already neutral, so the processor ban-vector
  there is already closed.

## Supporting docs added

- `docs/audits/2026-06-23-humanedge-architecture-audit.md`
- `docs/risks/2026-06-23-payment-data-migration-risks.md`
