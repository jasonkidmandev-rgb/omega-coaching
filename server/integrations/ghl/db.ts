import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "../../db";
import {
  externalWebhookEvents,
  externalProductMappings,
  clients,
} from "../../../drizzle/schema";
import { GHL_SOURCE } from "./schema";

/**
 * Data access for the GHL integration. Reuses the SAME shared tables as the
 * omegalongevity integration (external_webhook_events, external_product_mappings),
 * scoped by source = 'ghl'. No GHL-specific tables or migration are needed —
 * GHL is just another `source` in the existing external-webhook framework.
 */

async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

// ── Webhook event log ──────────────────────────────────────────────────────

export async function findEventByEventId(eventId: string) {
  const database = await db();
  const rows = await database
    .select()
    .from(externalWebhookEvents)
    .where(
      and(eq(externalWebhookEvents.source, GHL_SOURCE), eq(externalWebhookEvents.eventId, eventId))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertEvent(data: {
  eventId: string;
  eventType: string;
  payload: unknown;
}): Promise<number> {
  const database = await db();
  const result = await database.insert(externalWebhookEvents).values({
    source: GHL_SOURCE,
    eventId: data.eventId,
    eventType: data.eventType,
    payload: data.payload,
  });
  return (result as any)[0].insertId;
}

export async function markEventProcessed(
  id: number,
  links: { enrollmentId?: number | null; clientProtocolId?: number | null } = {}
) {
  const database = await db();
  await database
    .update(externalWebhookEvents)
    .set({
      status: "processed",
      errorMessage: null,
      enrollmentId: links.enrollmentId ?? null,
      clientProtocolId: links.clientProtocolId ?? null,
      processedAt: nowSql(),
    })
    .where(eq(externalWebhookEvents.id, id));
}

/** Logged successfully but intentionally not acted on (e.g. parked, unmapped). */
export async function markEventSkipped(id: number, reason: string) {
  const database = await db();
  await database
    .update(externalWebhookEvents)
    .set({ status: "skipped", errorMessage: reason.slice(0, 5000), processedAt: nowSql() })
    .where(eq(externalWebhookEvents.id, id));
}

export async function markEventFailed(id: number, errorMessage: string) {
  const database = await db();
  await database
    .update(externalWebhookEvents)
    .set({ status: "failed", errorMessage: errorMessage.slice(0, 5000) })
    .where(eq(externalWebhookEvents.id, id));
}

// ── Client resolution ──────────────────────────────────────────────────────

/** Match an incoming GHL contact to a local client by GHL contact id, then email. */
export async function resolveClient(opts: { ghlContactId?: string; email?: string }) {
  const database = await db();
  const conds = [] as any[];
  if (opts.ghlContactId) conds.push(eq(clients.ghlContactId, opts.ghlContactId));
  if (opts.email) conds.push(eq(clients.email, opts.email));
  if (conds.length === 0) return null;

  const rows = await database
    .select({ id: clients.id, name: clients.name, email: clients.email, ghlContactId: clients.ghlContactId })
    .from(clients)
    .where(conds.length === 1 ? conds[0] : or(...conds))
    .limit(1);
  return rows[0] ?? null;
}

// ── Product mapping ────────────────────────────────────────────────────────

/** Look up the GHL product_name → our tier/template mapping (admin-managed). */
export async function getActiveMapping(externalProductId: string) {
  const database = await db();
  const rows = await database
    .select()
    .from(externalProductMappings)
    .where(
      and(
        eq(externalProductMappings.source, GHL_SOURCE),
        eq(externalProductMappings.externalProductId, externalProductId),
        eq(externalProductMappings.isActive, 1)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listGhlEvents(opts: { status?: string; limit?: number } = {}) {
  const database = await db();
  const limit = Math.min(opts.limit ?? 50, 200);
  const where = opts.status
    ? and(eq(externalWebhookEvents.source, GHL_SOURCE), eq(externalWebhookEvents.status, opts.status as any))
    : eq(externalWebhookEvents.source, GHL_SOURCE);
  return database
    .select()
    .from(externalWebhookEvents)
    .where(where)
    .orderBy(desc(externalWebhookEvents.receivedAt))
    .limit(limit);
}
