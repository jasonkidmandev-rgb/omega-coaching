import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { provisionPurchase } from "../../provisioning/provisionClient";
import { purchaseWebhookSchemaV1, OMEGA_SOURCE } from "./schema";
import { getActiveMapping, markEventProcessed, markEventFailed } from "./db";

export interface ProcessEventResult {
  processed: boolean;
  /** present when processed=false */
  reason?: string;
  enrollmentId?: number;
  clientProtocolId?: number | null;
}

async function notifyAdminsUnmappedProduct(productId: string, productName: string | undefined, eventDbId: number) {
  try {
    const database = await getDb();
    if (!database) return;
    const [rows] = await database.execute(sql`
      SELECT id FROM users WHERE role IN ('admin', 'owner')
    `);
    for (const row of (rows as unknown) as any[]) {
      await database.execute(sql`
        INSERT INTO notifications (userId, type, title, message, createdAt)
        VALUES (${row.id}, 'other',
          ${'⚠️ Unmapped omegalongevity product'},
          ${`A purchase came in from omegalongevity.com for product "${productName || productId}" (${productId}) but no product mapping exists. Add a mapping in Settings, then replay event #${eventDbId}.`},
          NOW())
      `);
    }
  } catch (err: any) {
    console.error(`[Omega Webhook] Failed to notify admins about unmapped product: ${err.message}`);
  }
}

/**
 * Processes a logged webhook event (live delivery or admin replay).
 * Validates the stored payload, resolves the product mapping, provisions
 * the client, and updates the event row's status.
 */
export async function processPurchaseEvent(eventDbId: number, rawPayload: unknown): Promise<ProcessEventResult> {
  const parsed = purchaseWebhookSchemaV1.safeParse(rawPayload);
  if (!parsed.success) {
    const reason = `Payload validation failed: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`;
    await markEventFailed(eventDbId, reason);
    return { processed: false, reason };
  }
  const payload = parsed.data;

  const mapping = await getActiveMapping(OMEGA_SOURCE, payload.purchase.product_id);
  if (!mapping) {
    const reason = `No active product mapping for "${payload.purchase.product_id}"`;
    await markEventFailed(eventDbId, reason);
    await notifyAdminsUnmappedProduct(payload.purchase.product_id, payload.purchase.product_name, eventDbId);
    return { processed: false, reason };
  }

  try {
    const result = await provisionPurchase({
      source: OMEGA_SOURCE,
      email: payload.customer.email,
      name: payload.customer.name ?? null,
      phone: payload.customer.phone ?? null,
      shipping: payload.shipping,
      protocolTemplateId: mapping.protocolTemplateId ?? null,
      tier: mapping.tier ?? null,
      programType: mapping.programType ?? null,
      productName: payload.purchase.product_name ?? mapping.externalProductName ?? payload.purchase.product_id,
      payment: {
        amount: payload.purchase.amount,
        transactionId: payload.purchase.stripe_payment_intent_id ?? payload.purchase.stripe_checkout_session_id ?? null,
        reference: payload.event_id,
      },
    });

    await markEventProcessed(eventDbId, {
      enrollmentId: result.enrollmentId,
      clientProtocolId: result.clientProtocolId,
    });
    console.log(`[Omega Webhook] Event ${eventDbId} processed — enrollment ${result.enrollmentId}, protocol ${result.clientProtocolId ?? 'none'}`);
    return {
      processed: true,
      enrollmentId: result.enrollmentId,
      clientProtocolId: result.clientProtocolId,
    };
  } catch (err: any) {
    await markEventFailed(eventDbId, err.message || String(err));
    throw err;
  }
}
