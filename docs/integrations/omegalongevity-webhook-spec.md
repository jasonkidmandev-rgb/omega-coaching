# omegalongevity.com → humanedge.health Purchase Webhook (v1)

Integration spec for sending completed purchases from omegalongevity.com to
the HumanEdge platform. When a purchase event is received, HumanEdge
automatically creates (or links) the client account, enrolls them in the
matching program, records the payment, and queues fulfillment.

**Direction:** your backend → our endpoint. You receive the
`checkout.session.completed` event from your own Stripe account, then POST
the purchase to us in the format below. We never need access to your Stripe
account, and you never need access to ours.

---

## Endpoint

```
POST https://humanedge.health/api/external/omegalongevity/v1/purchase
Content-Type: application/json
```

This contract is versioned (`/v1/`). It will not change in a breaking way —
any future breaking change ships as `/v2/` and you migrate on your schedule.

## Authentication

Requests are signed with HMAC-SHA256 using a shared secret we provide
(out of band — never commit it to your repo).

Compute the signature like this:

```
timestamp = current unix time in seconds
signed_payload = "{timestamp}." + raw request body (exact bytes you send)
signature = hex( HMAC_SHA256( secret, signed_payload ) )
```

Send both values as headers:

```
X-Omega-Timestamp: 1765432100
X-Omega-Signature: 5f8a2b...
```

Requests with a timestamp more than 5 minutes old are rejected (replay
protection), so compute the signature at send time.

### Node.js example

```js
const crypto = require("crypto");

function sendPurchase(payload, secret) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return fetch("https://humanedge.health/api/external/omegalongevity/v1/purchase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Omega-Timestamp": String(timestamp),
      "X-Omega-Signature": signature,
    },
    body,
  });
}
```

## Payload

```json
{
  "event_id": "evt_a1b2c3d4e5",
  "event_type": "purchase.completed",
  "occurred_at": "2026-06-11T18:30:00Z",
  "customer": {
    "email": "jane@example.com",
    "name": "Jane Doe",
    "phone": "+15551234567"
  },
  "purchase": {
    "product_id": "omega-90day-flagship",
    "product_name": "90-Day Flagship Protocol",
    "amount": 2500.00,
    "currency": "usd",
    "stripe_payment_intent_id": "pi_3Abc...",
    "stripe_checkout_session_id": "cs_live_..."
  },
  "shipping": {
    "street": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701",
    "country": "USA"
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `event_id` | ✅ | **Your unique ID for this event — our idempotency key.** Retries MUST reuse the same `event_id`. A natural choice is the Stripe event ID. |
| `event_type` | ✅ | Always `purchase.completed` in v1. |
| `occurred_at` | — | ISO 8601. |
| `customer.email` | ✅ | Used to find-or-create the client. |
| `customer.name` | recommended | |
| `customer.phone` | — | |
| `purchase.product_id` | ✅ | Your stable product identifier (slug or Stripe price ID — just keep it consistent per package). We map it to a program on our side. |
| `purchase.product_name` | recommended | Display name, shown to our admins. |
| `purchase.amount` | ✅ | Total paid, in dollars (not cents). |
| `purchase.stripe_payment_intent_id` | recommended | Stored as the payment reference. |
| `shipping.*` | recommended | Needed for physical fulfillment; can be omitted for coaching-only packages. |

## Responses

| Status | Meaning | What you should do |
|---|---|---|
| `200 {"received":true,"processed":true}` | Fully processed. | Nothing. |
| `200 {"received":true,"processed":false,"reason":...}` | Received and logged, but held for manual handling on our side (e.g. a product we haven't mapped yet). | **Do not retry** — we replay it from our admin panel. |
| `200 {"received":true,"duplicate":true}` | We already processed this `event_id`. | Nothing. |
| `400` | Invalid payload — response body lists the issues. | Fix and resend. |
| `401` | Signature/timestamp rejected. | Check secret, header names, and clock. |
| `500` | Transient error on our side. | **Retry with the same `event_id`** (e.g. exponential backoff: 1m, 5m, 30m, 2h). Idempotency makes retries safe. |

## Before go-live

1. Send us the list of packages (product_id + name + what it includes) so we
   can configure the product mappings on our side.
2. We exchange the shared secret through a secure channel.
3. We run a test purchase end-to-end against the live endpoint with a
   designated test email and verify it appears in our system.

---

*Internal notes (HumanEdge side):*
- *Secret env var: `OMEGALONGEVITY_WEBHOOK_SECRET` (Railway).*
- *Inbound events logged in `external_webhook_events`; failed/unmapped events replayable via the `externalIntegrations.replayEvent` tRPC mutation.*
- *Product mappings live in `external_product_mappings` (`externalIntegrations.listMappings` / `createMapping`).*
- *Module: `server/integrations/omegalongevity/`; provisioning: `server/provisioning/provisionClient.ts`.*
