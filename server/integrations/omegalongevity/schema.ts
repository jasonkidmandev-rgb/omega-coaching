import { z } from "zod";

/**
 * v1 payload contract for omegalongevity.com -> humanedge.health.
 * This shape is FROZEN once the partner integrates against it.
 * Breaking changes go to a /v2 endpoint — never change v1 under them.
 */
export const purchaseWebhookSchemaV1 = z.object({
  /** Sender-generated unique ID — our idempotency key. Retries must reuse it. */
  event_id: z.string().min(1).max(255),
  event_type: z.literal("purchase.completed"),
  /** ISO 8601 timestamp of the purchase on the sender's side */
  occurred_at: z.string().optional(),
  customer: z.object({
    email: z.string().email(),
    name: z.string().max(255).optional(),
    phone: z.string().max(50).optional(),
  }),
  purchase: z.object({
    /** The sender's product identifier — mapped via external_product_mappings */
    product_id: z.string().min(1).max(255),
    product_name: z.string().max(255).optional(),
    /** Total paid, in dollars (e.g. 2500.00) */
    amount: z.number().nonnegative(),
    currency: z.string().default("usd"),
    stripe_payment_intent_id: z.string().max(255).optional(),
    stripe_checkout_session_id: z.string().max(255).optional(),
  }),
  shipping: z
    .object({
      street: z.string().max(255).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      zip: z.string().max(20).optional(),
      country: z.string().max(100).optional(),
    })
    .optional(),
});

export type PurchaseWebhookPayloadV1 = z.infer<typeof purchaseWebhookSchemaV1>;

export const OMEGA_SOURCE = "omegalongevity";
