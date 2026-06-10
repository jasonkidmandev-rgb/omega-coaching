import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { externalWebhookEvents, externalProductMappings } from "../../../drizzle/schema";

async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

// ============ WEBHOOK EVENT LOG ============

export async function findEventBySourceAndId(source: string, eventId: string) {
  const database = await db();
  const rows = await database
    .select()
    .from(externalWebhookEvents)
    .where(and(eq(externalWebhookEvents.source, source), eq(externalWebhookEvents.eventId, eventId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertEvent(data: {
  source: string;
  eventId: string;
  eventType: string;
  payload: unknown;
}): Promise<number> {
  const database = await db();
  const result = await database.insert(externalWebhookEvents).values({
    source: data.source,
    eventId: data.eventId,
    eventType: data.eventType,
    payload: data.payload,
  });
  return (result as any)[0].insertId;
}

export async function markEventProcessed(
  id: number,
  links: { enrollmentId?: number | null; clientProtocolId?: number | null }
) {
  const database = await db();
  await database
    .update(externalWebhookEvents)
    .set({
      status: "processed",
      errorMessage: null,
      enrollmentId: links.enrollmentId ?? null,
      clientProtocolId: links.clientProtocolId ?? null,
      processedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .where(eq(externalWebhookEvents.id, id));
}

export async function markEventFailed(id: number, errorMessage: string) {
  const database = await db();
  await database
    .update(externalWebhookEvents)
    .set({ status: "failed", errorMessage: errorMessage.slice(0, 5000) })
    .where(eq(externalWebhookEvents.id, id));
}

export async function getEventById(id: number) {
  const database = await db();
  const rows = await database
    .select()
    .from(externalWebhookEvents)
    .where(eq(externalWebhookEvents.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listEvents(opts: { status?: string; limit?: number; offset?: number } = {}) {
  const database = await db();
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const where = opts.status ? eq(externalWebhookEvents.status, opts.status as any) : undefined;
  return database
    .select()
    .from(externalWebhookEvents)
    .where(where)
    .orderBy(desc(externalWebhookEvents.receivedAt))
    .limit(limit)
    .offset(offset);
}

// ============ PRODUCT MAPPINGS ============

export async function getActiveMapping(source: string, externalProductId: string) {
  const database = await db();
  const rows = await database
    .select()
    .from(externalProductMappings)
    .where(
      and(
        eq(externalProductMappings.source, source),
        eq(externalProductMappings.externalProductId, externalProductId),
        eq(externalProductMappings.isActive, 1)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listMappings(source?: string) {
  const database = await db();
  const where = source ? eq(externalProductMappings.source, source) : undefined;
  return database
    .select()
    .from(externalProductMappings)
    .where(where)
    .orderBy(desc(externalProductMappings.createdAt));
}

export async function createMapping(data: {
  source: string;
  externalProductId: string;
  externalProductName?: string | null;
  protocolTemplateId?: number | null;
  tier?: string | null;
  programType?: string | null;
  isActive?: boolean;
  notes?: string | null;
}): Promise<number> {
  const database = await db();
  const result = await database.insert(externalProductMappings).values({
    source: data.source,
    externalProductId: data.externalProductId,
    externalProductName: data.externalProductName ?? null,
    protocolTemplateId: data.protocolTemplateId ?? null,
    tier: data.tier ?? null,
    programType: data.programType ?? "90_day_transformation",
    isActive: data.isActive === false ? 0 : 1,
    notes: data.notes ?? null,
  });
  return (result as any)[0].insertId;
}

export async function updateMapping(
  id: number,
  data: Partial<{
    externalProductId: string;
    externalProductName: string | null;
    protocolTemplateId: number | null;
    tier: string | null;
    programType: string | null;
    isActive: boolean;
    notes: string | null;
  }>
) {
  const database = await db();
  const set: Record<string, unknown> = {};
  if (data.externalProductId !== undefined) set.externalProductId = data.externalProductId;
  if (data.externalProductName !== undefined) set.externalProductName = data.externalProductName;
  if (data.protocolTemplateId !== undefined) set.protocolTemplateId = data.protocolTemplateId;
  if (data.tier !== undefined) set.tier = data.tier;
  if (data.programType !== undefined) set.programType = data.programType;
  if (data.isActive !== undefined) set.isActive = data.isActive ? 1 : 0;
  if (data.notes !== undefined) set.notes = data.notes;
  if (Object.keys(set).length === 0) return;
  await database.update(externalProductMappings).set(set).where(eq(externalProductMappings.id, id));
}

export async function deleteMapping(id: number) {
  const database = await db();
  await database.delete(externalProductMappings).where(eq(externalProductMappings.id, id));
}
