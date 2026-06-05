# Payment Integration Audit — PeptideCoach.Pro

**Date:** 2026-06-05  
**Auditor:** Claude Code  
**Scope:** All Stripe and manual payment workflows

---

## 1. Payment Flows Overview

The app has **three Stripe Checkout flows** and one **manual payment pathway**:

| Flow | Trigger | Stripe Session Metadata | Webhook Handler |
|------|---------|------------------------|-----------------|
| Transformation enrollment | Client selects tier → `trpc.transformation.createCheckoutSession` | `order_type: "transformation"` | Updates `transformation_enrollments`, sends client + admin emails, records promo usage |
| Custom orders | Admin creates order → `trpc.customOrders.createPaymentSession` | `order_type: "custom_order"` | Updates `custom_orders.status = 'paid'`, admin in-app notification |
| Store orders | Cart checkout → `trpc.orders.createStoreCheckoutSession` | `order_type: "store"` | *(was broken — see Fix 1)* |
| Manual protocol payment | Admin → `trpc.payment.markAsReceived` | No Stripe | Inserts `payment_events`, deducts inventory, sends email |

---

## 2. Key Files

| File | Purpose |
|------|---------|
| `server/stripe/stripeConfig.ts` | Key/secret resolver; reads `STRIPE_TEST_MODE` to switch test↔live |
| `server/stripe/webhook.ts` | Express router for `POST /stripe/webhook`; raw-body middleware for sig verification |
| `server/transformation/transformationRouter.ts` | `createCheckoutSession` — transformation checkout |
| `server/customOrders/router.ts` | `createPaymentSession` — custom order checkout |
| `server/routers.ts` | `orders.createStoreCheckoutSession` — store checkout; `storeOrders.refund` |
| `server/payment/router.ts` | Protocol payment lifecycle (mark received, failed, refunded) |
| `server/payment/historyRouter.ts` | Unified payment history across all three sources |
| `server/payment/emailService.ts` | All payment confirmation/notification emails |
| `server/refund/router.ts` | Protocol refund requests (create, approve, reject, process) |
| `server/cron/paymentReminderCron.ts` | Daily 9 AM reminder cron; respects opt-out and reminder days setting |

---

## 3. Database Tables

### `transformation_enrollments` (payment-relevant columns)
| Column | Type | Notes |
|--------|------|-------|
| `coachingFeePaid` | tinyint | Boolean flag |
| `coachingFeeAmount` | decimal(10,2) | Dollar amount |
| `coachingFeePaidAt` | timestamp | Set by webhook |
| `coachingFeeStripePaymentId` | varchar(255) | Stripe payment intent ID |
| `protocolCostPaid` | tinyint | — |
| `protocolCostAmount` | decimal(10,2) | — |
| `protocolCostStripePaymentId` | varchar(255) | **Never populated — see Gap 4** |

### `custom_orders` (payment-relevant columns)
| Column | Type | Notes |
|--------|------|-------|
| `paymentMethod` | enum | `'paypal','venmo','stripe','manual'` |
| `status` | enum | `'draft','pending_payment','paid','refunded',...` |
| `paidAt` | timestamp | — |
| `stripePaymentIntentId` | varchar(255) | Set by webhook (raw SQL — not in Drizzle schema) |
| `paidAmount` | varchar | **⚠️ Should be decimal — see Gap 2** |

### `store_orders` (payment-relevant columns)
| Column | Type | Notes |
|--------|------|-------|
| `paymentMethod` | enum | `'paypal','venmo','stripe','manual'` |
| `status` | enum | `'pending','paid','processing','shipped',...` |
| `paidAt` | timestamp | — |
| `stripePaymentIntentId` | varchar(255) | **Added by Fix 1** |
| `total` | decimal(10,2) | Grand total incl. processing fee |

### `payment_events`
Tracks full lifecycle per protocol: `payment_due`, `reminder_sent`, `payment_received`, `payment_failed`, `payment_refunded`, `payment_cancelled`, `status_changed`.  
Fields: `grossAmount`, `feeAmount`, `netAmount`, `paymentMethod`, `transactionId`.

### `refund_requests`
| Column | Type | Notes |
|--------|------|-------|
| `protocolId` | int | FK → `client_protocols.id` |
| `clientId` | varchar | — |
| `status` | enum | `'pending','approved','rejected','processed'` |
| `refundAmount` | varchar | Amount to refund |

### `promo_codes` / `promo_code_usage`
Promo codes are de-duplicated in the webhook: checks for existing `(promoCodeId, enrollmentId)` before inserting.

---

## 4. Webhook Event Handling

**Endpoint:** `POST /stripe/webhook` (raw body, signature verified)

### `checkout.session.completed`
Routes by `session.metadata.order_type`:

```
order_type = "transformation" (default)
  → UPDATE transformation_enrollments SET coachingFeePaid=TRUE, status='coaching_paid' WHERE id=enrollment_id
  → INSERT promo_code_usage (if promo applied)
  → sendTransformationPaymentConfirmationEmail()
  → sendTransformationPaymentAdminNotification()
  → INSERT notifications for admin/owner users

order_type = "custom_order"
  → UPDATE custom_orders SET status='paid', paidAt=NOW(), stripePaymentIntentId=..., paidAmount=...
  → INSERT notifications for admin/owner users

order_type = "store"
  → UPDATE store_orders SET status='paid', paidAt=NOW(), stripePaymentIntentId=... (Fix 1)
  → deductInventoryForStoreOrder()
  → syncClientInventoryFromStoreOrder()
  → sendStoreOrderConfirmationEmail()
  → createPackingSlipForStoreOrder()
  → INSERT notifications for admin/owner users
```

---

## 5. Admin Payment Dashboards

| Page | tRPC Source | Data |
|------|------------|------|
| `/admin/payments` | `paymentHistoryRouter.getHistory` | Unified across protocol payments, coaching fees, store orders |
| `/admin/payments/analytics` | `paymentAnalyticsRouter` | Revenue trends, method breakdown |
| `/admin/payments/transformation` | `transformationRouter` | Coaching fee payments |
| `/admin/payments/reconciliation` | `paymentReconciliationRouter` | Reconciliation workflow |

---

## 6. Gaps Found & Fixes Applied

### Fix 1 — Store order webhook did not update database ✅ FIXED
**Problem:** `handleStoreOrderCompleted` only sent an admin notification. No DB update, no inventory deduction, no email, no packing slip.

**Root cause:** The `createStoreCheckoutSession` mutation never created a `store_order` record before redirecting to Stripe, so there was no row to update.

**Fix:**
1. `createStoreCheckoutSession` now creates a `store_order` record with `status='pending'` and all `store_order_items` BEFORE creating the Stripe session.
2. The `store_order_id` is included in the Stripe session metadata.
3. `handleStoreOrderCompleted` now: updates the order to `'paid'`, deducts inventory, syncs client inventory, sends confirmation email, creates packing slip, then sends admin notification.

**Files changed:** `server/routers.ts`, `server/stripe/webhook.ts`, `drizzle/schema.ts`

---

### Fix 2 — `custom_orders.paidAmount` stored as varchar ⚠️ MIGRATION NEEDED
**Problem:** Column is `varchar` in the actual DB, making revenue calculations unreliable.

**Status:** Migration script provided at `migrations/001_store_order_stripe_fields.sql`. Run it against the Railway DB.

**Note:** Drizzle schema does not reflect this column — it is set only via raw SQL in the webhook. No code change needed.

---

### Fix 3 — Store order refund did not call Stripe API ✅ FIXED
**Problem:** `storeOrders.refund` procedure marked the order as `'refunded'` in the DB but never called `stripe.refunds.create()`, so the customer did not actually receive money back for Stripe-paid orders.

**Fix:** Added Stripe refund API call in `storeOrders.refund` before the status update. If `order.stripePaymentIntentId` is set, the refund is issued via Stripe (full or partial). Throws if Stripe fails so the admin knows to handle manually.

**File changed:** `server/routers.ts`

---

### Fix 4 — Protocol refund approval did not call Stripe API ✅ FIXED
**Problem:** `refundRouter.approve` updated the refund request status to `'approved'` but never issued a Stripe refund for transformation coaching fee payments.

**Fix:** Added non-blocking Stripe refund lookup: fetches `transformation_enrollments.coachingFeeStripePaymentId` for the protocol, and calls `stripe.refunds.create()` if found. Non-blocking — admin can still approve even if Stripe call fails (for Venmo/PayPal payments with no Stripe ID).

**File changed:** `server/refund/router.ts`

---

### Gap 5 — `protocolCostStripePaymentId` never populated (deferred)
**Problem:** Field exists in `transformation_enrollments` schema but is never written by any webhook handler. The transformation webhook only writes `coachingFeeStripePaymentId`.

**Status:** Deferred. No separate "protocol cost" Stripe payment flow was found in the codebase. Field appears to be reserved for a future flow. No action taken to avoid breaking existing behavior.

---

### Gap 6 — No abandoned checkout recovery (deferred)
**Problem:** `abandoned_checkouts` table exists but no recovery email cron is wired up.

**Status:** Deferred — requires SMS/email provider decision first (Twilio vs GoHighLevel pending).

---

## 7. Environment Variables Required

```env
# Stripe (test vs live switched by STRIPE_TEST_MODE)
STRIPE_TEST_MODE=true
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Stripe API version:** `2024-06-20`

---

## 8. Pending Actions

| Priority | Action | Owner |
|----------|--------|-------|
| High | Run `migrations/001_store_order_stripe_fields.sql` against Railway DB | DevOps |
| High | Register Stripe webhook endpoint `POST /stripe/webhook` in Stripe Dashboard for Railway URL | Dev |
| Medium | Decide SMS provider (Twilio vs GHL) → wire up abandoned checkout recovery | PM |
| Medium | Register Calendly webhook: `node calendly-webhook-register.mjs https://www.humanedge.health` | Dev |
| Low | Populate `protocolCostStripePaymentId` if a separate protocol cost Stripe flow is built | Dev |
| Low | Unify `paymentMethod` enums across `client_protocols`, `store_orders`, `custom_orders` | Dev |
