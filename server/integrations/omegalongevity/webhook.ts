import { Router, raw } from "express";
import { purchaseWebhookSchemaV1, OMEGA_SOURCE } from "./schema";
import { verifySignature, getWebhookSecret } from "./signature";
import { findEventBySourceAndId, insertEvent } from "./db";
import { processPurchaseEvent } from "./processEvent";

/**
 * Inbound purchase webhook from omegalongevity.com.
 *
 * Mounted at /api/external/omegalongevity (BEFORE express.json() — raw body
 * is required for HMAC verification, same as the Stripe webhook).
 *
 * POST /v1/purchase
 *   Headers: X-Omega-Timestamp, X-Omega-Signature (see signature.ts)
 *   Body:    purchaseWebhookSchemaV1 (see schema.ts)
 *
 * Response semantics for the sender:
 *   200 — received; check `processed` in the body. processed:false means we
 *         logged it for admin replay (e.g. unmapped product) — do NOT retry.
 *   4xx — bad request (signature/payload). Fix before retrying.
 *   5xx — transient failure on our side. Retry with the SAME event_id.
 */
const omegalongevityWebhookRouter = Router();

omegalongevityWebhookRouter.post(
  "/v1/purchase",
  raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    const secret = getWebhookSecret();
    if (!secret) {
      console.error("[Omega Webhook] OMEGALONGEVITY_WEBHOOK_SECRET not configured");
      return res.status(503).json({ error: "Integration not configured" });
    }

    // 1. Verify HMAC signature over the raw body
    const sigCheck = verifySignature(
      req.body as Buffer,
      req.headers["x-omega-timestamp"] as string | undefined,
      req.headers["x-omega-signature"] as string | undefined,
      secret
    );
    if (!sigCheck.valid) {
      console.warn(`[Omega Webhook] Rejected request: ${sigCheck.reason}`);
      return res.status(401).json({ error: sigCheck.reason });
    }

    // 2. Parse + validate payload
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse((req.body as Buffer).toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Body is not valid JSON" });
    }
    const parsed = purchaseWebhookSchemaV1.safeParse(parsedJson);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Payload validation failed",
        issues: parsed.error.issues.map(i => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const payload = parsed.data;
    console.log(`[Omega Webhook] Received ${payload.event_type} (${payload.event_id}) for ${payload.customer.email}`);

    try {
      // 3. Idempotency: same event_id already handled?
      const existing = await findEventBySourceAndId(OMEGA_SOURCE, payload.event_id);
      let eventDbId: number;
      if (existing) {
        if (existing.status === "processed" || existing.status === "skipped") {
          console.log(`[Omega Webhook] Duplicate event ${payload.event_id} — already ${existing.status}`);
          return res.json({ received: true, processed: existing.status === "processed", duplicate: true });
        }
        // received/failed — retry processing on the existing row
        eventDbId = existing.id;
      } else {
        eventDbId = await insertEvent({
          source: OMEGA_SOURCE,
          eventId: payload.event_id,
          eventType: payload.event_type,
          payload: parsedJson,
        });
      }

      // 4. Process (provisions client, enrollment, protocol, payment chain)
      const result = await processPurchaseEvent(eventDbId, parsedJson);
      return res.json({
        received: true,
        processed: result.processed,
        ...(result.reason ? { reason: result.reason } : {}),
      });
    } catch (err: any) {
      console.error(`[Omega Webhook] Processing error for event ${payload.event_id}: ${err.message}`);
      // 500 so the sender retries — idempotency makes the retry safe
      return res.status(500).json({ error: "Internal processing error — safe to retry with the same event_id" });
    }
  }
);

export default omegalongevityWebhookRouter;
