# Risk & Bug Register — Payments, Data, Migration

**Date:** 2026-06-23
**Owner:** Ali (engineering)
**Related:** `docs/audits/2026-06-23-humanedge-architecture-audit.md`
**Severity scale:** Critical (business-halting) · High · Medium · Low

> Snapshot of concrete issues found while investigating the failed Stripe deliveries after a week away. Live-customer flow currently runs on the **Manus** deployment; **humanedge.health (Railway)** is the migration target and is not yet live-ready.

---

## R1 — Compound names on Stripe receipts → processor-ban exposure 🔴 Critical
**Evidence (Railway repo):**
- Store checkout sets `product_data.name: item.name` (raw inventory/compound names) — `server/routers.ts:4122`
- Custom-order checkout same pattern — `server/customOrders/router.ts:265,275`
- Coaching checkout line item "VIP Supply Concierge" described as "Pharmaceutical-grade supply sourcing & delivery coordination" — `server/transformation/transformationRouter.ts:3242-3243`

**Impact:** Compound names + drug-supply language appear on Stripe line items, the hosted checkout, and Stripe's receipt emails. Stripe already banned the account once over a peptide mention. A second ban halts all payment collection.
**Caveat:** the *live* protocol checkout (`order_type: protocol`) is created on **Manus, not in this repo** — so today's real receipt content must be verified on Manus / a live charge. The repo fix protects the future live system, not today's.
**Fix:** consolidate to a single neutral line item per checkout (cart total labeled e.g. "Coaching Program — {month}"); keep itemization only in our DB/our own emails. Reword the "pharmaceutical-grade supply" phrase. Verify the Stripe account statement descriptor is neutral. Apply the same to Manus or at cutover.

---

## R2 — Dual live deployments + scattered payments → split-brain 🔴 Critical
**Evidence:** Stripe "Omega Coaching" account has three webhook destinations: Manus (`...manus.space`, **Active, 0% errors**), humanedge (`www.humanedge.health`, **Disabled**, 90/90 failures), peptidecoach.pro (Disabled). Plus omegalongevity.com is being built with its own payment plans.
**Impact:** Live payments land in the Manus DB; the Railway DB (the one we've been hardening) is a stale, disabled destination. Three surfaces can take money into different systems. Re-enabling humanedge while Manus is live would double-process (duplicate emails/charges) or mis-associate payments (see R3).
**Fix:** one system of record (humanedge post-cutover); every funnel feeds it; atomic cutover, not parallel run. omegalongevity reports purchases into humanedge via the existing `/api/external/omegalongevity/v1/purchase` webhook rather than being a separate silo.

---

## R3 — Railway cannot process the live protocol payment flow 🔴 High
**Evidence:** the only checkouts this repo creates are `store` and `custom_order` (`grep order_type:`). There is no `protocol` checkout creator, and `server/stripe/webhook.ts` has no `protocol` branch — its default path keys on `enrollment_id`, which the live `order_type: protocol` events do not carry.
**Impact:** even with the webhook secret fixed, the Railway app would not correctly provision the protocol payments real customers make today. This is a **feature divergence**, not just a config bug — Manus has flows the Railway code lacks.
**Fix:** port/rebuild the protocol checkout + webhook branch into Railway and verify end-to-end in a sandbox before cutover.

---

## R4 — humanedge Stripe webhook misconfigured (secret/mode) 🟠 High
**Evidence:** 90/90 deliveries failed HTTP 400 "No signatures found matching the expected signature" — `stripe.webhooks.constructEvent` rejecting; endpoint now auto-disabled.
**Cause:** Railway `STRIPE_WEBHOOK_SECRET` does not match this destination's signing secret, or `STRIPE_TEST_MODE` is verifying live events against the test secret.
**Fix:** do **not** re-enable into live (see R2). Validate humanedge against a Stripe sandbox with the correct test secret; fix the live secret only at cutover.

---

## R5 — Background jobs are not durable 🟠 High
See architecture audit F1. ~24 crons run in-process via `setInterval`; deploy/restart silently drops schedules; no retry or run record. At low volume but high per-customer value (concierge, ~$2.8k charges), a missed payment reminder or check-in to a VIP is costly.
**Fix:** run-logging + failure alerting + idempotent guards (not a heavyweight queue).

---

## R6 — Customer health data unencrypted at rest 🟠 Medium-High
See architecture audit F3. `server/_core/encryption.ts` exists but `encrypt()` is never called. Given peptide/health coaching, treat as sensitive by default.
**Fix (decided):** encrypt sensitive free-text clinical/notes fields; harden access control, secrets, and backups. Right-sized, not blanket encryption (do not encrypt fields the app must query/sort, and protect the key to avoid data loss).

---

## R7 — Stripe account concentration 🟠 Medium
One already-flagged Stripe account would carry humanedge + omegalongevity revenue. A single ban takes down everything.
**Fix (business input needed):** consider payment resilience (a category-appropriate/high-risk processor, or isolating risk). Engineering can support whatever Jason chooses; the decision is his.

---

## R8 — Monolithic core files 🟡 Medium
See architecture audit F5. `routers.ts` ~9.8k / `db.ts` ~9.4k / `emailService.ts` ~4.8k lines. Development-velocity and bug-risk drag. Drain into the per-domain folder pattern on-touch.

---

## R9 — Horizontal-scale foot-guns 🟢 Low (at current scale)
See architecture audit F4. In-memory rate limiting/cache, no cron leader election. Irrelevant at 5–10 customers/month on one instance. **Constraint:** stay on a single instance; do not add replicas without externalizing this state.

---

## Update 2026-06-25 — funnel/platform sprawl (from Jason's team meeting summary)

> Source: Jason's website/ops meeting (Alex, Shane, Vilma, Tyler). Confirms omegalongevity.com now has its own Stripe checkout + member login, GoHighLevel is being adopted as the lead/payment/asset store, and a DocuSign "soft-commit" consult funnel is being added. The fragmentation flagged in R2 is now the as-built reality and is growing.

### R10 — Four-system payment/customer-data sprawl 🔴 High
**Evidence (meeting):** customer/payment data now spans **Manus** (live app + payments), **HumanEdge** (payments), **omegalongevity.com** (own Stripe checkout + member login, per Alex), and **GoHighLevel** (leads + "payment details for future processing" + email outreach + image hosting).
**Impact:** no single source of truth for customers, payments, or membership; each new funnel multiplies reconciliation, duplicate-charge, and mis-provisioning risk (extends R2) and makes a clean cutover harder.
**Fix:** escalate the single-source-of-truth decision with Jason; define which system owns the customer/membership record post-cutover and make every funnel report into it.

### R11 — omega→app handoff direction unconfirmed (our integration may be bypassed) 🟠 Medium-High
**Evidence (meeting):** Alex reports "member login integration," "Start 7-day free trial," and "Omega Elite onboarding" built on omegalongevity + GHL. We built `/api/external/omegalongevity/v1/purchase` expecting omegalongevity to provision accounts into our app.
**Impact:** if omegalongevity now handles membership directly (GHL + its own Stripe), the webhook we built is being walled off — wasted effort plus a parallel membership silo that never reaches our app/DB.
**Fix:** confirm with Alex/Jason whether omegalongevity provisions into our app or is self-contained, **before** further webhook work. (Clarifying question drafted 2026-06-25.)

### R12 — omegalongevity Stripe: likely same ban-prone account, named items outside our control 🟠 High
**Evidence (meeting):** omegalongevity has "completed Stripe payment workflows" (Alex's code, not this repo). Their YouTube channel was also banned without warning — a second platform ban after the Stripe peptide ban.
**Impact:** if omegalongevity's checkout runs on the same Stripe account and lists peptide/compound names, a leak there bans the account every funnel depends on (ties R1 + R7). We just hardened this repo; that surface is outside it.
**Fix:** confirm omegalongevity's Stripe account identity and that its line items + statement descriptor are neutral. If it's the same account, the R1 neutral-naming discipline must apply to Alex's checkout too.

### R13 — DocuSign/GHL "soft-commit" stores payment details for later charging 🟡 Medium
**Evidence (meeting):** new mini-consult funnel — DocuSign soft-commit, no card upfront, but GHL records "payment details for future processing" with reminders before the charge date.
**Impact:** storing card/payment data for delayed charging carries PCI/compliance weight if not done natively.
**Fix:** confirm the delayed charge is executed by Stripe/GHL via tokenization (not raw card storage), and which system actually performs the charge.

---

## Immediate actions (this week)
1. Verify live receipt content on Manus / a real Stripe charge (R1). If compound names are present, remediate on the live system first.
2. Leave humanedge's Stripe webhook **disabled**; do not re-enable into live (R2/R4).
3. Seal humanedge as a staging environment (test Stripe keys, suppressed email, staging bucket) before any further work.
4. Get Jason's confirmation on the single-source-of-truth direction and omegalongevity funnelling in.
5. Confirm the omega→app handoff direction (R11) with Alex/Jason **before** further webhook work.
6. Confirm omegalongevity's Stripe account identity + neutral line-item naming (R12); if it's the same account, the R1 discipline applies to Alex's checkout.
