# Design: Resilient Payment Layer

**Date:** 2026-06-25
**Owner:** Ali (engineering)
**Status:** Approved — implementation in progress (strangler, additive first)
**Related:** [[manual-payment-fallback]] decision; risk register R3 (resolved), R10 (single source of truth)

## Why

The business operates in a platform-ban-prone environment (Stripe banned once over a peptide
receipt; the YouTube channel was banned without warning). When Stripe was banned, payments
were taken via Venmo/PayPal and recorded manually. That manual path is a **deliberate,
permanent failover**, not a gap.

Today, payment logic is tangled: five separate Stripe checkout creators (store, ×2 custom
order, ×2 transformation), a webhook that routes by `order_type`, per-entity `paymentStatus`
fields, and a manual `markAsReceived` admin path — all reinventing the same "money in →
fulfill" flow. There is no single place that knows "who paid for what," and switching to
manual during an outage means changing behavior in several places.

## Goal

Make **how a payment settles** (Stripe vs Venmo/PayPal/manual) a property that can change —
or fail over entirely — **without touching what's owed or what happens on payment**. Treat
manual as a **peer settlement method**, not a bolted-on fallback.

## The three tangled concerns we are separating

1. **What's owed** — a customer owes $X for a protocol / coaching plan / custom order / store order.
2. **How it settles** — Stripe, Venmo, PayPal, Zelle, cash, check.
3. **What happens on payment** — provision, deduct inventory, packing slip, emails, notifications.

## Architecture (four layers)

1. **Payment ledger (the money source-of-truth).** One new `payments` table — a *logbook on
   top of* existing tables, not a replacement. Each row records one payment and *points* at
   the entity it's for (`entityType` + `entityId`). Existing entities keep their `paymentStatus`
   field (denormalized, updated by the pipeline). This becomes the single cross-funnel answer
   to "did this person pay."
2. **Settlement methods as interchangeable adapters.** Each method *presents* (Stripe checkout
   URL, or Venmo instructions + an "I've paid" action) and *confirms* (Stripe webhook, or admin
   one-click). Stripe and manual are siblings.
3. **One idempotent settlement pipeline.** When any method confirms, it calls one `onPaid(payment)`
   that does fulfillment. `processProtocolPaymentReceived` is already ~80% of this (idempotent,
   method-agnostic); it is generalized rather than duplicated.
4. **Failover control plane.** A `payment_mode` flag in `site_settings` (`stripe | manual | both`)
   decides which methods are active/primary. Stripe banned → flip to `manual` → every funnel
   presents manual instructions. No deploy, same pattern as the `APP_ENV` staging seal.

## Decisions (forks resolved)

- **Fork 1 — logbook over existing tables (not a big data move).** Add the `payments` ledger
  that references existing rows; entities keep their status fields. Lower risk with live data.
- **Fork 2 — admin-only manual recording first; model built to allow client self-serve later.**
  The `status` enum includes `awaiting_confirmation` so a future client "I've paid" → admin
  confirm flow drops in without schema change.
- **Fork 3 — coaching-plan + standalone-protocol funnels first**, then custom order + store,
  one at a time. The `onPaid` dispatch supports all `entityType`s but only protocol/coaching-plan
  are wired initially; others are explicit "not yet routed."

## Data model — `payments`

| Column | Type | Notes |
|---|---|---|
| id | INT PK | |
| entityType | ENUM(protocol, coaching_plan, custom_order, store_order) | what it's for |
| entityId | INT | the protocol / enrollment / order id |
| customerId / customerEmail / customerName | INT / VARCHAR | who owes |
| amountCents | INT | canonical money unit (cents) |
| currency | VARCHAR(3) = 'usd' | |
| processorLabel | VARCHAR(255) | neutral label sent to processors ("Coaching Program"); real line items stay in the source entity |
| status | ENUM(open, awaiting_confirmation, paid, failed, refunded, void) | |
| method | VARCHAR(50) | stripe/venmo/paypal/zelle/cash/check/other — varchar so new methods need no migration |
| externalRef | VARCHAR(255) UNIQUE | Stripe session/PI id, or manual txn ref; UNIQUE gives Stripe idempotency (NULLs allowed for manual) |
| settledAt / settledBy | TIMESTAMP / INT | when + which admin confirmed |
| notes | TEXT | |
| createdAt / updatedAt | TIMESTAMP | |

Relationship to `payment_events`: that table stays as the append-only audit log; `payments`
is the current-state ledger. The pipeline writes both.

## Explicitly out of scope (anti-gold-plating)

No payment queue/worker infra. No multi-currency. No generic plugin system (just the adapter
shape). No ripping `paymentStatus` out of existing entities. No multi-processor abstraction
beyond the adapter seam. The win is the clean seam, not machinery — at 5–10 customers/month,
adding infrastructure rather than removing tangle means we've gone too far.

## Sequencing (strangler — never a moment payments don't work)

1. Add `payments` table + ledger service + generalized `onPaid` (additive; nothing changes yet).
2. Add `payment_mode` flag + read points.
3. Route coaching-plan + protocol funnels through the ledger; keep their existing fields in sync.
4. Admin "payments to confirm" queue + money-in reconciliation report.
5. Migrate custom order + store funnels, one at a time.

## Implementation status & decisions (2026-06-25)

**Shipped & validated (committed, deployed to staging):**
- `payments` ledger table (migration 0116, applied) + `paymentLedger.ts` service (record / settle / `onPaid` dispatch + `getPaymentMode`/`isMethodEnabled`).
- **Shadow recording** wired into the two protocol/coaching-plan settlement points (`markAsReceived`, Stripe webhook). Verified end-to-end: a real Venmo payment produced a correct ledger row with zero change to existing behavior.
- Venmo restored as a manual payment method.
- **`payment_mode` failover switch** — `getPaymentMode`/`setPaymentMode` + admin toggle (on `/admin/payment-history`) + mode-aware client checkout (Stripe + manual / Stripe only / Manual only). Validated across all three modes.
- Removed the dead `/admin/payments` route + `Payments.tsx` (orphaned, infinite-loading duplicate of `/admin/payment-history`).

**Deferred — fulfillment cutover (DECISION: not doing it now):**
The ledger currently runs in **shadow mode** — it *records* settlements but the existing `processProtocolPaymentReceived` calls still *drive* fulfillment. The "cutover" would record an `open` row at checkout, route settlement through `settlePayment` → `onPaid`, and remove the direct fulfillment calls so the ledger is the single fulfillment trigger.

**Decision (2026-06-25): defer.** The resilience goal (Stripe⇄manual failover) is already delivered by the switch + shadow ledger. The cutover only buys architectural purity (no shadow-divergence) — not new capability — while it is the single highest-stakes change in the effort (it touches live fulfillment: provisioning, inventory, packing slips). At 5–10 customers/month the divergence risk is vanishingly small and visible in logs. Revisit only when there's a concrete reason to make the ledger the strict single source of truth.

**Also left intentionally:** 3 now-orphaned procedures in `paymentEventsRouter` (`getAll`/`getStats`/`backfillFromProtocols`) — harmless dead code in an otherwise-live shared router; not worth the risk of editing for no gain.

**Still backlogged (Fork 3 later):** route custom-order + store funnels through the ledger; optional client self-serve "I've paid" → admin confirm (`awaiting_confirmation` already supported); editable `payment_manual_instructions` (Venmo/PayPal handles) shown in manual mode.
