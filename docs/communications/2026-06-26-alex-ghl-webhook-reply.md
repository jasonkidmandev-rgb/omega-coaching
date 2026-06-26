# Reply to Alex — GHL ↔ App webhook integration (2026-06-26)

Record of the reply sent to Alex's integration brief. Kept written (no call) so
the field contracts are referenceable when wiring the GHL workflows.

---

**Subject:** Re: GHL ↔ App webhook integration

Hi Alex,

Thanks for the detailed brief — this is exactly what I needed. It maps cleanly
onto the inbound-webhook framework we already run for partner events, so the
build is straightforward: the six endpoints are built and tested on our side.
Before we point your GHL workflows at them and call it live, a few things to
lock down — one is important enough that I'd flag it as a must-fix.

**1. Duplicate protection — the key must be per-payment, not per-event (important).**
You suggested deduping on `subscription_id` + `event`. That's fine for the
one-off events, but `payment.collected` fires several times for the *same*
subscription (setup, month 2, month 3) — all with the same `subscription_id`
and the same `event`. Deduping on just those two would accept the setup payment
and **silently drop months 2 and 3.** So `payment.collected` needs a per-charge
key. Best: include the FastPayDirect/Stripe `transaction_id` (charge id) in that
payload and we key on it. If GHL can't expose that, `subscription_id` +
`payment_number` works as long as `payment_number` increments per charge. (We've
already built it to use `transaction_id` when present, else
`subscription_id` + `payment_number`.)

**2. `total_contract_value` in the examples doesn't reconcile — confirm the real number per product.**
Advanced Physique plan = $1,125 setup + $1,125 × 3 = **$4,500** (and the one-time
$4,275 = $4,500 − 5%, which checks out). But the example payloads show
`total_contract_value: 3375`, which is only three charges. We use that field to
reconcile "collected vs owed," so if it's off, every plan looks short. Can you
send a quick table — per product: setup + N monthly → total contract value, and
how many `payment.collected` events to expect?

**3. Auth — we'll require a bearer token (treating it as required, not optional).**
We'll generate a secret and send it with the final URLs; add it as
`Authorization: Bearer <token>` on every GHL call. Requests without it are
rejected. GHL doesn't sign payloads, so token-over-HTTPS is the security
boundary — keep it out of shared docs, and we can rotate it any time.

**4. Product mapping.**
Send the list of GHL products exactly as they appear in the `product_name`
field (e.g. "Advanced Physique - Payment Plan"), with the package and whether
each is one-time or payment-plan. We map each to the right coaching package on
our side. Until a product is mapped we still **log** the event (nothing is lost)
— it just parks for review instead of auto-provisioning.

**What each payload does on our side** (your "what to send back"):
- Logged to a webhook-events table with timestamp + raw body, for audit/debug,
  before anything else. ✓
- Deduped on the key above. ✓
- Matched to a client (by GHL `contact_id`, then email) and to the coaching
  package via the mapping.
- The lifecycle (new → collected → overdue/failed → cancelled/completed) updates
  that client's record. I'll confirm the exact provisioning behavior once #4 and
  one routing question on our end are settled — shortly.

**URLs.** The endpoints follow your paths exactly:
`POST /api/webhooks/subscription-new`, `/payment-collected`, `/payment-overdue`,
`/payment-failed`, `/subscription-cancelled`, `/subscription-completed`. I'll
send the final base URL + bearer token when we cut to the production host. If you
want to test the workflows first, I can give you a staging URL + test token to
fire sample payloads at — fastest way to confirm the shapes match end to end.

I'd rather keep this on email than a call, so we both have a written record of
the field contracts to reference while wiring the workflows. To finish, I need
two things from you: the per-product contract-value table (#2) and the product
list (#4) — plus a yes/no on whether GHL can include a `transaction_id` (#1).

Thanks,
Saboor
