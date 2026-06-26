import { Router, type Request, type Response } from "express";
import { GHL_EVENTS, GHL_SCHEMAS, deriveEventId, type GhlRoutePath } from "./schema";
import { getWebhookToken, verifyBearer } from "./auth";
import { findEventByEventId, insertEvent, markEventFailed } from "./db";
import { processGhlEvent } from "./processEvent";

/**
 * Inbound GoHighLevel webhooks (Omega Longevity coaching packages).
 *
 * Mounted at /api/webhooks (AFTER express.json — GHL authenticates with a static
 * bearer token, not an HMAC over the raw body, so no raw-body handling needed).
 *
 * Routes (one per GHL workflow event):
 *   POST /subscription-new        subscription.active
 *   POST /payment-collected       payment.collected
 *   POST /payment-overdue         payment.overdue
 *   POST /payment-failed          payment.failed
 *   POST /subscription-cancelled  subscription.cancelled
 *   POST /subscription-completed  subscription.completed
 *
 * Response semantics for GHL:
 *   200 — received (always, including duplicates). GHL must NOT retry on 200.
 *   401 — bad/missing bearer token.
 *   400 — payload failed validation.
 *   503 — integration not configured (GHL_WEBHOOK_TOKEN unset).
 *   500 — transient failure; safe to retry (idempotency key makes retries safe).
 */

const ghlWebhookRouter = Router();

function makeHandler(routePath: GhlRoutePath) {
  const eventType = GHL_EVENTS[routePath];
  const schema = GHL_SCHEMAS[routePath];

  return async (req: Request, res: Response) => {
    // 1. Auth — bearer token required.
    const token = getWebhookToken();
    if (!token) {
      console.error("[GHL Webhook] GHL_WEBHOOK_TOKEN not configured");
      return res.status(503).json({ error: "Integration not configured" });
    }
    const auth = verifyBearer(req.headers["authorization"], token);
    if (!auth.valid) {
      console.warn(`[GHL Webhook] Rejected ${routePath}: ${auth.reason}`);
      return res.status(401).json({ error: auth.reason });
    }

    // 2. Validate payload.
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Payload validation failed",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const payload = parsed.data as any;
    const eventId = deriveEventId(routePath, payload);
    console.log(`[GHL Webhook] ${eventType} (${eventId}) for ${payload.email}`);

    try {
      // 3. Idempotency — keyed on (source='ghl', eventId). For payment.collected
      //    the eventId includes the payment number, so months 2/3 are NOT dropped.
      const existing = await findEventByEventId(eventId);
      let eventDbId: number;
      if (existing) {
        if (existing.status === "processed" || existing.status === "skipped") {
          console.log(`[GHL Webhook] Duplicate ${eventId} — already ${existing.status}`);
          return res.json({
            received: true,
            duplicate: true,
            processed: existing.status === "processed",
          });
        }
        eventDbId = existing.id; // received/failed → retry on the same row
      } else {
        eventDbId = await insertEvent({ eventId, eventType, payload: req.body });
      }

      // 4. Process (scaffold: validate + enrich + park; no fulfillment yet).
      const result = await processGhlEvent(eventDbId, routePath, payload);
      return res.json({ received: true, processed: result.processed, reason: result.reason });
    } catch (err: any) {
      console.error(`[GHL Webhook] Processing error for ${eventId}: ${err.message}`);
      try {
        const existing = await findEventByEventId(eventId);
        if (existing) await markEventFailed(existing.id, err.message ?? "unknown error");
      } catch {
        /* best effort */
      }
      return res.status(500).json({ error: "Internal processing error — safe to retry with the same payload" });
    }
  };
}

ghlWebhookRouter.post("/subscription-new", makeHandler("subscription-new"));
ghlWebhookRouter.post("/payment-collected", makeHandler("payment-collected"));
ghlWebhookRouter.post("/payment-overdue", makeHandler("payment-overdue"));
ghlWebhookRouter.post("/payment-failed", makeHandler("payment-failed"));
ghlWebhookRouter.post("/subscription-cancelled", makeHandler("subscription-cancelled"));
ghlWebhookRouter.post("/subscription-completed", makeHandler("subscription-completed"));

export default ghlWebhookRouter;
