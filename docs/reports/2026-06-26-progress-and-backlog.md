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

### GHL inbound webhook integration (Omega coaching packages)
- Built + HTTP-verified the six `/api/webhooks/*` endpoints from Alex's brief,
  slotted into the **existing** external-webhook framework as `source='ghl'` —
  **no new tables / no migration** (reuses `external_webhook_events`,
  `external_product_mappings`, `clients.ghlContactId`).
- Corrected the brief's dedup rule: keyed idempotency per-charge so payment-plan
  months 2/3 aren't silently dropped. Required bearer-token auth.
- Processing is **park-only** (logs + resolves client/mapping) pending Alex's
  product mapping + the replace/coexist routing decision — won't trigger
  fulfillment yet. Spec: `docs/integrations/ghl-webhook-spec.md`.
- Reply to Alex (dedup fix, contract-value reconciliation question, mapping
  request) recorded: `docs/communications/2026-06-26-alex-ghl-webhook-reply.md`.

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

### GHL integration (after Alex + routing decision)
- Wire `processEvent.ts` per-event business logic (client upsert → enrollment →
  ledger record/confirm as `coaching_plan`). Blocked on product mapping + the
  replace/coexist routing decision.
- Provision `GHL_WEBHOOK_TOKEN`; send Alex final URLs + token (or staging test creds).
- Admin view for GHL events + mapping management (omega `adminRouter` is a template).

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
- **Type-safety / `tsc` cleanup** — the project carries ~757 pre-existing
  `tsc --noEmit` errors and ships via esbuild (no type-checking), so TypeScript is
  effectively off as a safety net. Phased plan:
  - **Step 1 — DONE (2026-06-27):** error ratchet — `pnpm run typecheck:ratchet`
    + `.github/workflows/typecheck.yml` run `tsc` and fail only when the count
    rises above the committed baseline (`tsc-error-baseline.txt` = 757). Tolerates
    the backlog, blocks new errors. Update the baseline with `typecheck:baseline`.
  - **Step 2:** fix the cheap category — missing `Insert*` type exports from
    `drizzle/schema` (likely a few lines; derive/regenerate). Ratchet the baseline down.
  - **Step 3:** systemic drizzle mismatches — timestamp `mode: 'string'` vs `Date`,
    and `tinyint` used as `boolean`. The bulk; likely a schema-type regeneration or
    a shared helper, not 100s of hand edits. Ratchet down as you go.
  - **Step 4:** once at 0, make `tsc` blocking (baseline 0 / fail on any error).
  - Best slotted in around cutover, when correctness matters most and the schema
    is being touched anyway.
- Wrap remaining ~12 low-value crons (team digests, maintenance) — pattern set.
- Optional: prune 3 orphaned `paymentEventsRouter` procedures.

### Migration / cutover
- Protocol payment flow confirmed working (R3 resolved — manual recording +
  transformation Stripe). No cutover blocker there.
- Fresh DB re-sync at cutover (the Railway DB holds a stale production snapshot).
- **Inventory at cutover (OPEN QUESTION — ask Jason/Vilma at cutover-planning
  time):** is a one-time physical count of the hero stocked SKUs feasible at
  cutover, and what is the hero list? Leaning toward an **opening-balance reset**
  (keep catalog/mappings/archived history; do NOT trust-migrate the old
  quantities; count the hero SKUs fresh; mine old negatives for owed backorders
  first) rather than reconcile (no trusted anchor exists) or blanket-wipe (loses
  catalog/mappings/history). Hinges on that count being feasible.
- **Single source of truth — DECIDED (2026-06-27, Jason):** the HumanEdge app is
  the official record of customer/clinical/fulfillment data; GHL/Omega are upstream
  feeders into it, not parallel records. Guiding principle: **simplify, don't add
  systems.** This resolves R11/R12 direction and frames every integration as
  "feed the app's record," not "run alongside it."

---

## Waiting on others
- **Jason:** is a store worth building (reorder volume) + public-vs-gated —
  advised a **login-gated client reorder portal**, not a public shop (see the
  2026-06-26 store comms); verify Stripe statement descriptor is neutral; archive
  any named Stripe Products. _(Single-source-of-truth direction: RESOLVED — app is
  the official record.)_
- **Alex:** omega→app handoff direction (does omegalongevity still provision into
  our app?); **GHL** per-product contract-value table + product list for the
  webhook mapping + whether GHL can send a `transaction_id` (see the 2026-06-26
  reply); omegalongevity Stripe account identity + neutral line-item naming.
- **Jason (internal):** GHL replace-or-coexist — direction now set (app is the
  official record → GHL/Omega feed it). Still need Alex's per-event product mapping
  before GHL events can drive fulfillment in the app (R11/R12).

See the risk register (`docs/risks/2026-06-23-payment-data-migration-risks.md`,
R1–R13) for the detailed funnel-sprawl and single-source-of-truth context.
