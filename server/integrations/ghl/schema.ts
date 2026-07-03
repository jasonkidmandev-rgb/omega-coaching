import { z } from "zod";

/**
 * Inbound webhook contract for GoHighLevel (Omega Longevity coaching packages).
 *
 * GHL workflows POST one of six lifecycle events. Payloads are validated loosely
 * (core fields required, everything else optional + passthrough) because GHL's
 * outbound JSON varies by workflow config — we always persist the full raw body
 * to external_webhook_events regardless, so nothing is lost.
 *
 * Source of truth for the field shapes: Alex's integration brief (2026-06-26).
 */

export const GHL_SOURCE = "ghl";

/** The six event types, matched to their route path. */
export const GHL_EVENTS = {
  "subscription-new": "subscription.active",
  "payment-collected": "payment.collected",
  "payment-overdue": "payment.overdue",
  "payment-failed": "payment.failed",
  "subscription-cancelled": "subscription.cancelled",
  "subscription-completed": "subscription.completed",
} as const;

export type GhlRoutePath = keyof typeof GHL_EVENTS;
export type GhlEventType = (typeof GHL_EVENTS)[GhlRoutePath];

/** Fields common to every GHL payload. Kept permissive on purpose. */
const baseFields = {
  event: z.string().min(1).max(100),
  contact_id: z.string().max(255).optional(),
  first_name: z.string().max(255).optional(),
  last_name: z.string().max(255).optional(),
  // Optional: subscription lifecycle events (cancelled/completed) may not carry an
  // email. We resolve the client by email when present; absent → the event still
  // logs and parks rather than 400-ing and vanishing.
  email: z.string().email().max(320).optional(),
  phone: z.string().max(50).optional(),
  /** GHL product, e.g. "Advanced Physique - Payment Plan" — mapped via external_product_mappings */
  product_name: z.string().max(255).optional(),
  /** GHL subscription identifier — the spine of every event for a given plan */
  subscription_id: z.string().min(1).max(255),
  currency: z.string().max(10).default("USD"),
};

export const subscriptionNewSchema = z
  .object({
    ...baseFields,
    address: z.string().max(500).optional(),
    subscription_type: z.string().max(50).optional(),
    subscription_start_date: z.string().max(40).optional(),
    amount: z.number().nonnegative().optional(),
    total_contract_value: z.number().nonnegative().optional(),
    coupon_code: z.string().max(100).optional(),
  })
  .passthrough();

export const paymentCollectedSchema = z
  .object({
    ...baseFields,
    /** 1 = setup, 2 = month 2, 3 = month 3, ... — part of the idempotency key */
    payment_number: z.number().int().nonnegative().optional(),
    amount_collected: z.number().nonnegative().optional(),
    total_collected_to_date: z.number().nonnegative().optional(),
    total_contract_value: z.number().nonnegative().optional(),
    payment_date: z.string().max(40).optional(),
    /** Preferred idempotency key if GHL can send the processor transaction id */
    transaction_id: z.string().max(255).optional(),
  })
  .passthrough();

export const paymentOverdueSchema = z
  .object({
    ...baseFields,
    amount_overdue: z.number().nonnegative().optional(),
    due_date: z.string().max(40).optional(),
    days_overdue: z.number().int().optional(),
  })
  .passthrough();

export const paymentFailedSchema = z
  .object({
    ...baseFields,
    amount_attempted: z.number().nonnegative().optional(),
    failure_date: z.string().max(40).optional(),
  })
  .passthrough();

export const subscriptionCancelledSchema = z
  .object({
    ...baseFields,
    cancellation_date: z.string().max(40).optional(),
    total_collected: z.number().nonnegative().optional(),
    total_contract_value: z.number().nonnegative().optional(),
  })
  .passthrough();

export const subscriptionCompletedSchema = z
  .object({
    ...baseFields,
    completion_date: z.string().max(40).optional(),
    total_collected: z.number().nonnegative().optional(),
  })
  .passthrough();

export const GHL_SCHEMAS: Record<GhlRoutePath, z.ZodTypeAny> = {
  "subscription-new": subscriptionNewSchema,
  "payment-collected": paymentCollectedSchema,
  "payment-overdue": paymentOverdueSchema,
  "payment-failed": paymentFailedSchema,
  "subscription-cancelled": subscriptionCancelledSchema,
  "subscription-completed": subscriptionCompletedSchema,
};

/**
 * Derive a stable idempotency key (stored as external_webhook_events.eventId,
 * unique per source).
 *
 * CRITICAL: `payment.collected` fires multiple times for the SAME subscription
 * (setup, month 2, month 3). Keying only on subscription_id + event — as Alex's
 * brief proposes — would silently drop months 2 and 3. So payment.collected is
 * keyed on the individual payment (transaction_id if present, else
 * subscription_id + payment_number). Recurring fail/overdue events are keyed on
 * their date so a re-fire on a later cycle isn't swallowed.
 */
export function deriveEventId(routePath: GhlRoutePath, payload: any): string {
  const sub = String(payload.subscription_id ?? "unknown");
  switch (routePath) {
    case "payment-collected":
      if (payload.transaction_id) return `${sub}:payment.collected:txn:${payload.transaction_id}`;
      return `${sub}:payment.collected:n${payload.payment_number ?? "?"}`;
    case "payment-failed":
      return `${sub}:payment.failed:${payload.failure_date ?? Date.now()}`;
    case "payment-overdue":
      return `${sub}:payment.overdue:${payload.due_date ?? Date.now()}`;
    case "subscription-new":
      return `${sub}:subscription.active`;
    case "subscription-cancelled":
      return `${sub}:subscription.cancelled`;
    case "subscription-completed":
      return `${sub}:subscription.completed`;
  }
}
