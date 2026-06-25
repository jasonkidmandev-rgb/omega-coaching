# Progress & Backlog — 2026-06-26

Status snapshot for the PeptideCoach → HumanEdge (Railway) migration work.
Everything under "Done" is committed and pushed to `main` and deployed to the
sealed staging environment.

> **Verification caveat:** HumanEdge runs as a sealed staging environment
> (`APP_ENV=staging`): Stripe is forced to test mode, all outbound email is
> suppressed, and **crons do not run**. So cron logging/alerts and outbound email
> behaviors are build-verified but only observable once HumanEdge runs as
> production at cutover.

---

## Done (2026-06-22 → 06-26)

### Ban-risk: peptide/compound names off customer-facing surfaces
- Stripe line items neutralized to a single "Coaching Program" across store +
  custom-order checkouts; coaching/transformation concierge wording neutralized.
- Custom-order parity: invoice email, shipping email, and the client
  order-history API now show "Custom Item #N"; admin/DB/packing slips keep real
  names. (Jason fixed the live Manus side himself.)

### HumanEdge sealed as a staging environment
- `APP_ENV=staging` umbrella flag: forces Stripe test mode, suppresses all email
  at the Resend chokepoint, skips all crons + IMAP polling, shows a red banner.
- Audited every customer-contact vector and **hardened the seal's holes** — the
  4 direct-SMTP reminder crons and the IMAP reply bridge could bypass the seal via
  manual/admin triggers; all now guarded.

### Resilient payment layer (Phase A + B)
- `payments` ledger table (migration **0116**, applied to staging) + `paymentLedger`
  service (record / settle / one fulfillment dispatch + `payment_mode` helpers).
- Shadow-recording wired into the protocol (`markAsReceived`) and coaching-plan
  (Stripe webhook) settlement points — verified end-to-end with a real Venmo payment.
- **`payment_mode` failover switch** — admin toggle (on `/admin/payment-history`)
  + mode-aware client checkout (Stripe+Manual / Stripe only / Manual only),
  validated across all modes. One click moves clients to manual if Stripe is banned.
- Venmo restored as a manual payment method.
- Design + decisions: `docs/design/2026-06-25-payment-layer-architecture.md`.

### Job/cron durability (R5)
- Shared `cronRunner`: durable `cron_runs` logging + **admin failure alerts**
  (the missing piece — jobs were failing silently).
- 8 jobs wrapped (payment/session/enrollment/intake reminders, scheduled
  announcements, backorder-tracking, nightly reconciliation, DB backup); fixed two
  swallowed-error bugs (payment reminders, DB backup).
- Admin **Job Health** page at `/admin/job-health`.

### Cleanup & docs
- Removed the dead `/admin/payments` route (infinite-loading duplicate of
  `/admin/payment-history`); relocated the failover toggle to the live page.
- Architecture audit + risk register (R1–R13); fixes report (2026-06-24);
  manual-payment-fallback and protocol-payment-model decisions recorded.

---

## What's left / backlog

### Client change requests
- **Lisa CR-1 — continuous client Chat thread** (not per protocol version). New;
  tracked in `docs/change-requests/lisa-humanedge-requests.md`. Medium effort.

### Payment layer (Fork 3 + deferred)
- **Fulfillment cutover** — make the ledger *drive* fulfillment (record `open` at
  checkout, settle → onPaid, remove direct calls). **Deferred by decision** — the
  resilience goal is already met; this only buys purity and touches live fulfillment.
- Route custom-order + store funnels through the ledger.
- Client self-serve "I've paid" → admin confirm (`awaiting_confirmation` supported).
- Editable `payment_manual_instructions` (real Venmo/PayPal handles in manual mode).

### Hardening
- **R6 — PHI encryption** (not started): encrypt sensitive clinical/health fields
  at rest (real PII/PHI present). Invasive; needs careful key management.
- Wrap remaining ~12 low-value crons (team digests, maintenance) — pattern set.
- Optional: prune 3 orphaned `paymentEventsRouter` procedures.

### Migration / cutover
- Protocol payment flow confirmed working (R3 resolved — manual recording +
  transformation Stripe). No cutover blocker there.
- Fresh DB re-sync at cutover (the Railway DB holds a stale production snapshot).
- Single source of truth for the customer record (decision — see below).

---

## Waiting on others
- **Jason:** single-source-of-truth direction; is the store funnel active?; verify
  Stripe statement descriptor is neutral; archive any named Stripe Products.
- **Alex:** omega→app handoff direction (does omegalongevity still provision into
  our app?); product mappings for the webhook; omegalongevity Stripe account
  identity + neutral line-item naming.

See the risk register (`docs/risks/2026-06-23-payment-data-migration-risks.md`,
R1–R13) for the detailed funnel-sprawl and single-source-of-truth context.
