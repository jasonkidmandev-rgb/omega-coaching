# GoHighLevel inbound webhook integration

**Status:** Scaffold built + HTTP-verified (2026-06-26). Ingestion live; business
mapping (→ enrollment/ledger) parked pending Alex's product mapping + an internal
routing decision. Not yet deployed to a production host.

Source brief: Alex's integration email (2026-06-26). Reply + open questions:
`docs/communications/2026-06-26-alex-ghl-webhook-reply.md`.

## What it is
GHL workflows POST six coaching-package lifecycle events for Omega Longevity into
our app. The integration slots into the **existing** external-webhook framework
as another `source` (`'ghl'`) — same tables as the omegalongevity integration,
**no new tables / no migration**.

## Endpoints
Mounted at `/api/webhooks` (after `express.json()` — bearer auth, no raw body):

| Route | Event |
|---|---|
| `POST /api/webhooks/subscription-new` | `subscription.active` |
| `POST /api/webhooks/payment-collected` | `payment.collected` |
| `POST /api/webhooks/payment-overdue` | `payment.overdue` |
| `POST /api/webhooks/payment-failed` | `payment.failed` |
| `POST /api/webhooks/subscription-cancelled` | `subscription.cancelled` |
| `POST /api/webhooks/subscription-completed` | `subscription.completed` |

## Auth
`Authorization: Bearer <GHL_WEBHOOK_TOKEN>` — **required**. Constant-time compare.
Token unset → `503`. Bad/missing token → `401`. (GHL can't HMAC-sign, so a shared
bearer token over HTTPS is the boundary; rotate via the env var + GHL header.)

## Response contract (for GHL)
- `200` — received (incl. duplicates). GHL must not retry on 200.
- `400` — payload failed validation (Zod; issues listed).
- `401` / `503` — auth / not configured.
- `500` — transient; safe to retry (idempotent on the event key).

## Idempotency (the key correction vs the brief)
Keyed on `(source='ghl', eventId)` via the `external_webhook_events` unique index.
The brief proposed deduping on `subscription_id + event` — but `payment.collected`
fires once per charge with the *same* subscription_id + event, so that rule would
silently drop months 2 and 3. `eventId` is therefore derived per `deriveEventId()`:

| Event | eventId |
|---|---|
| payment.collected | `<sub>:payment.collected:txn:<transaction_id>` if present, else `<sub>:payment.collected:n<payment_number>` |
| payment.failed | `<sub>:payment.failed:<failure_date>` |
| payment.overdue | `<sub>:payment.overdue:<due_date>` |
| subscription.active/cancelled/completed | `<sub>:subscription.<state>` |

Verified: a `payment.collected` with `payment_number: 2` logs eventId
`sub_abc123:payment.collected:n2` — the payment number is in the key.

## Files
- `server/integrations/ghl/schema.ts` — Zod schemas (loose + passthrough) + `GHL_EVENTS` + `deriveEventId()`.
- `server/integrations/ghl/auth.ts` — bearer verification.
- `server/integrations/ghl/db.ts` — event log + client resolution + mapping lookup against the shared tables (`source='ghl'`).
- `server/integrations/ghl/processEvent.ts` — **park-only** today.
- `server/integrations/ghl/webhook.ts` — the six routes + idempotency + response semantics.
- Mounted in `server/_core/index.ts` next to the calendly/omega webhooks.

## Shared tables reused (no migration)
- `external_webhook_events` (`source`,`eventId` unique) — raw log + status (`received`/`processed`/`failed`/`skipped`).
- `external_product_mappings` (`source`,`externalProductId` unique) — GHL `product_name` → tier/template. Admin-managed.
- `clients.ghlContactId` — existing column; the contact match key.

## Why processing is parked (not wired to fulfillment yet)
`recordPayment`/`settlePayment` on the ledger call `onPaid` → `processProtocolPaymentReceived`
(fulfillment). Two things must settle before we let that fire from GHL:
1. **Product mapping** — confirmed `product_name` → package (waiting on Alex).
2. **Routing decision** — does GHL **replace** the in-app Stripe coaching-enrollment
   flow (`transformation_enrollments` + the `coaching_plan` Stripe webhook), or run
   **alongside** it? If alongside, the same client can be recorded twice; we need a
   precedence/dedupe rule. This is the single-source-of-truth question (R11/R12)
   made concrete.
   - **Direction decided (2026-06-27, Jason):** the app is the official record, so
     GHL **feeds** the app's record (not a parallel silo). Outstanding detail is the
     dedupe/precedence rule when a client exists in both GHL and the in-app Stripe
     flow — plus Alex's product mapping. Until those land, processing stays parked.

Until then `processGhlEvent` resolves the client + mapping read-only and marks the
event `skipped` with a descriptive reason. Raw payloads are captured, so the
eventual wiring is backfillable.

## Staging-seal safety
Inbound only — no outbound email or charge, and processing is park-only — so this
is safe to run under `APP_ENV=staging`. Standing up a staging URL + test token is
actually the recommended way to capture real GHL payload shapes before cutover.

## Remaining work
1. Get product mapping + contract-value table from Alex; settle the replace/coexist
   routing decision (Jason).
2. Implement per-event business logic in `processEvent.ts` (client upsert →
   enrollment → ledger record/confirm as `coaching_plan`).
3. Provision `GHL_WEBHOOK_TOKEN`; send Alex the final URLs + token (or staging test creds).
4. Admin view for GHL events + mapping management (the omega `adminRouter` is a template).
