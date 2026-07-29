# Rules to cover — harvested from deleted tests

**Why this file exists.** 55 unit-test files (~10,000 lines) were deleted on 2026-07-30
because none of them imported a single line of product code: they defined their own copy of
the logic, or asserted a literal against itself, and therefore could not fail no matter what
the app did. See `README.md` ("What these tests are actually worth") for the taxonomy.

Deleting them lost no coverage — there was none — but roughly twenty of them were the **only
written record** of a real business rule. Those rules are below, so they become a backlog for
`*.integration.test.ts` against the test DB instead of being thrown away.

Each entry: the rule, where the real implementation lives, and the file it came from.

---

## ⚠️ Read this first: the bug that proves the point

`client-edit-tabs.test.ts` asserted the **correct** discount rule and passed green while
production did the opposite.

```ts
// the deleted test — hands itself a clean JS boolean
.filter(item => item.isDiscountable)            // false → excluded. Correct.
```
```ts
// client/src/pages/admin/ClientEdit.tsx:1149 — receives a MySQL tinyint
const isItemDiscountable = (protocolItem as any).isDiscountable !== false;
// MySQL returns 0, and 0 !== false, so EVERY item is treated as discountable
```

The test could never catch it, because it never saw real data. Note that
`CustomOrders.tsx:273` does the same job correctly (`item.isDiscountable ? …` — `0` is falsy),
so the app has one right and one wrong implementation of the same rule, with green tests for
both.

**Two separable pieces of work:**
1. The **coercion** is simply wrong and is not a policy question — `!== false` against a
   tinyint. One-line fix. Prefer `z.coerce.boolean()` or an explicit `=== 1` / truthy check.
2. The **policy** (should non-discountable actually be enforced, given it raises some client
   totals) is Jason's call — tracked in `decisions.md`.

Per the earlier audit: 123 of 185 items and 10 of 18 categories are marked non-discountable
and ignored, ~$3,207 across 9 orders.

---

## Tier 1 — money and data integrity

These are the rules where being wrong costs money or corrupts records. They deserve real
DB-backed tests more than anything else in the app.

| # | Rule | Real implementation | From |
|---|---|---|---|
| 1 | Discounts apply **only to discountable items**; a dollar discount is capped at the discountable subtotal; a percentage discount is computed on it; `discountOverride` makes the whole subtotal discountable; custom items with no `inventoryItemId` are non-discountable by default | `CustomOrders.tsx:273,961` (correct) | `customOrders/protocolPrices.test.ts` |
| 2 | Same rule in protocol pricing — **currently broken**, see above | `ClientEdit.tsx:1149-1150` | `client-edit-tabs.test.ts` |
| 3 | Credit-card fee is **3.5%**, applied to the post-discount total | `client-edit-tabs.test.ts` mirrored it; find the live site | `client-edit-tabs.test.ts` |
| 4 | Flat shipping fee **$10.00 (1000 cents)**, added only when the cart is non-empty; included in PayPal totals; Venmo totals carry shipping but **no** processing fee. PayPal processing fee **3.5%** | store checkout | `shipping-fee.test.ts` |
| 5 | **Tiered pricing bug:** when `customPrice` equals the base price, the system treats it as a custom override and skips volume tiers. Recorded example: qty 3 of a $325 item charged $325/unit ($975) instead of the tier-2 $285/unit ($855). Fix was to leave `customPrice` null rather than pre-filling it with the base price | protocol item pricing | `tieredPricingFix.test.ts` |
| 6 | Promo/enrollment discounts: percentage and fixed both **capped at the original amount**; final amount never negative | promo + transformation payment | `promoCode.test.ts`, `transformation/transformationPayment.test.ts` |
| 7 | Tier prices: **elite $15,000** (was wrongly $10,000 — regression worth a guard), `functional_health_elite` $8,500, `advanced` $4,500, and flagship / recovery / immunity / longevity / mitochondria all **$3,000**. Affiliate commission on elite is **5% = $750** | enrollment pricing | `direct-enrollment.test.ts` |
| 8 | **Payment-reminder eligibility.** Send only to protocols that are pending-or-approved **and** unpaid **and** have a `sentAt`. Never to: drafts, protocols with no `sentAt`, active protocols, already-paid protocols, opted-out clients. Venmo: **skip** if a submission is pending or confirmed; **still send** if it was rejected (they must pay again) or if nothing was submitted. The Venmo check must not affect PayPal clients | `server/cron/paymentReminderCron.ts` | `cron/paymentReminderCron.test.ts` |
| 9 | **Inventory must not double-deduct.** `deductInventoryForProtocol` checks `inventoryDeductedAt` before deducting and returns SKIPPED if already set; the timestamp is only written when at least one item deducted successfully. Store-order sync sets client inventory to full after PayPal or Venmo/admin payment, and a sync failure must not fail the order. Refund restock adds quantities back as return-type transactions and must not fail the refund | inventory service | `inventory-audit-fixes.test.ts` |
| 10 | **Packing slips exclude client-sourced items** (`fulfillmentSource: 'client'`), and those items must not be flagged as "missing" in the mismatch check. Qty-0 items, services and non-included items stay excluded regardless of source. Default when unspecified is `coach`, and cloning preserves the source | `createPackingSlipOnPay`, `checkMismatch` | `payment/fulfillmentSource.test.ts` |
| 11 | **Duplicate-enrollment prevention.** Logged-in: block if an enrollment exists in any non-terminal status. Guest: match on email; skip the check entirely if a guest has no email. Client name resolves via `COALESCE(clientName, payerName)` | `createDirectEnrollment`, retry-payment | `retry-payment-duplicate-enrollment.test.ts` |
| 12 | **Enrollment merge:** group duplicates by userId (and separately for guests by email); keep the **paid** one, else the **most recent**; never delete the one being kept; soft-delete the others by setting status `completed` with a merge note; log `enrollment_merged` and `enrollment_deleted` | enrollment admin | `enrollment-management-v2.test.ts` |

## Tier 2 — correctness invariants

| # | Rule | Real implementation | From |
|---|---|---|---|
| 13 | **MySQL tinyint → boolean.** Booleans arrive as `0`/`1`, not `false`/`true`. Use `z.coerce.boolean()` (or an explicit truthy check) — never `x !== false`, which is always true for `0`. This is the same trap that broke `isDiscountable`, and it is the single highest-value rule in this file | schema/zod input layers | `critical-fixes-batch3.test.ts` |
| 14 | **A check-in schedule must never be simultaneously enabled and paused.** Setting a client to `protocol_only` **disables** the schedule (not just pauses) and clears `isPaused`; single and bulk paths must behave identically | engagement-level handlers | `checkin-engagement-gating.test.ts`, `bulkEngagementLevel.test.ts` |
| 15 | Upgrading to `full_coaching` or `self_guided_checkins` re-enables an existing schedule, or auto-creates one if none exists. Creating a schedule for a `protocol_only` client is **blocked** | same | same |
| 16 | The cron processes a schedule only when it is enabled, not paused, `nextScheduledAt` is past, and `skipUntil` is absent or past | `server/cron/checkinCron.ts` | `checkin-engagement-gating.test.ts` |
| 17 | **Segmentation:** the full-coaching view includes `protocol_only` clients, and a null/undefined engagement level counts as full-coaching. Full-coaching + self-guided must equal the total with **no overlap** — for both schedules and check-ins | check-in analytics | `checkinAnalyticsSplit.test.ts` |
| 18 | Check-in scheduling computes the next occurrence correctly across day-of-week and time-of-day, rolling to next week when the target time has already passed today; changing the time recalculates `nextScheduledAt` and preserves other settings | `calculateNextScheduledTime` | `clientCorner/checkinSchedule.test.ts` |
| 19 | Guest enrollment auth tokens expire (**24h** on resend) and expired tokens are rejected; resending mints a new token. Only enrollments that are paid **and** unlinked appear in the pending-link list | transformation auth | `transformation/guestEnrollment.test.ts` |
| 20 | **Email-open tracking must discount bots and prefetch:** GoogleImageProxy, YahooMailProxy, Outlook, generic bot UAs, prefetch/preview agents, Python/Java clients, and requests with **no** user agent all count as bots. An open **within 30 seconds** of send is prefetch, not a real open | email tracking | `email-tracking-engagement.test.ts` |
| 21 | Webhook security: HMAC signature verification, timestamp freshness, duplicate-event detection, and idempotency keys derived from event data | GHL / webhook handlers | `external-services.test.ts` |
| 22 | Protocol duplicate detection is by client email against non-completed protocols; the next version number is `max(version) + 1`; completed protocols don't count as duplicates | protocol creation | `duplicate-prevention.test.ts` |
| 23 | Prospect dedup order: **email first, then phone, then name**; placeholder phone values are skipped; merging keeps the primary record and fills blanks from the secondary; names and phones are normalised before comparison | prospect service | `prospect-dedup.test.ts`, `prospect-auto-creation.test.ts` |

---

## Not harvested (deliberately)

Tier 3 of the audit — `intake-validation`, `profileGate`, `progressive-disclosure-payment`,
`bulk-profile-progress`, `profile-badge-notifications`, `intake-phone-sync`, `sync-template`,
`checkin-summary`, `autosave-json-error` — mirrored **client-side form and validation logic**
(which intake sections require which fields, profile-completeness gating, tab-switch blocking,
upload retry/413 handling). That behaviour is genuinely better checked by a person clicking
through the wizard than by a mirrored copy, and a browser checklist is the right home for it.

`revenue-goals-settings` was month names and percentage formatting. Nothing to harvest.

## How to work through this list

Write these as `server/**/*.integration.test.ts` (run with `pnpm test:integration`) so they
execute the real function against the real schema. A rule tested against a hand-made object
is how this list came to exist in the first place.

Priority order: **13** (the coercion trap, because it is actively wrong), then **2** and **5**
(live money bugs), then **8**, **9**, **14**.
