import { GhlRoutePath } from "./schema";
import { resolveClient, getActiveMapping, markEventSkipped } from "./db";

/**
 * Process a logged GHL event.
 *
 * SCAFFOLD STAGE — PARK ONLY. Every event is validated and persisted to
 * external_webhook_events by the router before we get here. This function does
 * the read-only enrichment we can safely do today (resolve the local client by
 * GHL contact id / email, look up the product mapping) and then PARKS the event
 * with a descriptive status. It deliberately does NOT create enrollments or
 * write to the payments ledger yet, because:
 *
 *   1. The GHL product_name → tier/template mapping is not confirmed yet
 *      (waiting on Alex), and
 *   2. The routing decision is open — does GHL REPLACE the in-app Stripe
 *      coaching-enrollment flow, or run alongside it? Writing to the ledger
 *      triggers onPaid → fulfillment, which must not fire until that's settled.
 *
 * When those are resolved, replace the park logic per event type with: resolve/
 * create client → upsert enrollment → recordPayment/confirmPayment on the ledger
 * (entityType 'coaching_plan'). The raw payloads captured now make that backfillable.
 */

export interface ProcessResult {
  processed: boolean;
  reason: string;
}

export async function processGhlEvent(
  eventDbId: number,
  routePath: GhlRoutePath,
  payload: any
): Promise<ProcessResult> {
  // Read-only enrichment: who is this, and do we recognize the product?
  const client = await resolveClient({
    ghlContactId: payload.contact_id,
    email: payload.email,
  });
  const clientNote = client
    ? `client #${client.id} (${client.email ?? client.name})`
    : `no local client match (email=${payload.email ?? "?"}, ghlContactId=${payload.contact_id ?? "?"})`;

  let mappingNote = "no product_name on payload";
  if (payload.product_name) {
    const mapping = await getActiveMapping(payload.product_name);
    mappingNote = mapping
      ? `mapped → tier=${mapping.tier ?? "?"} template=${mapping.protocolTemplateId ?? "?"}`
      : `UNMAPPED product "${payload.product_name}"`;
  }

  const reason = `Parked (scaffold): ${routePath} | ${clientNote} | ${mappingNote}. ` +
    `Fulfillment routing pending product mapping + replace/coexist decision.`;

  // Logged + enriched, intentionally not acted on yet.
  await markEventSkipped(eventDbId, reason);

  return { processed: false, reason };
}
