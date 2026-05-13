import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { clientMetrics, clientProtocols } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return database;
}

export const metricsRouter = router({
  // Get metrics for the logged-in client
  getMyMetrics: protectedProcedure.query(async ({ ctx }) => {
    const database = await db();
    
    // Find the client's protocol by email
    const [protocol] = await database
      .select()
      .from(clientProtocols)
      .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${ctx.user.email || ""})`);
    
    if (!protocol) {
      return [];
    }
    
    // Get all metrics and group them by recordedAt date
    const allMetrics = await database
      .select()
      .from(clientMetrics)
      .where(eq(clientMetrics.clientProtocolId, protocol.id))
      .orderBy(desc(clientMetrics.recordedAt));
    
    // Group metrics by date to create entries with weight, bodyFat, leanMass
    const groupedByDate = new Map<string, {
      id: number;
      recordedAt: Date;
      weight: number | null;
      bodyFatPercentage: number | null;
      leanMass: number | null;
      notes: string | null;
    }>();
    
    for (const metric of allMetrics) {
      const dateKey = metric.recordedAt.toISOString().split('T')[0];
      
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, {
          id: metric.id,
          recordedAt: metric.recordedAt,
          weight: null,
          bodyFatPercentage: null,
          leanMass: null,
          notes: metric.notes,
        });
      }
      
      const entry = groupedByDate.get(dateKey)!;
      const value = parseFloat(metric.value);
      
      if (metric.metricType === 'weight') {
        entry.weight = value;
      } else if (metric.metricType === 'body_fat') {
        entry.bodyFatPercentage = value;
      } else if (metric.metricType === 'lean_mass') {
        entry.leanMass = value;
      }
      
      if (metric.notes && !entry.notes) {
        entry.notes = metric.notes;
      }
    }
    
    return Array.from(groupedByDate.values());
  }),
  
  // Add a new metric entry
  addMetric: protectedProcedure
    .input(z.object({
      weight: z.number().optional(),
      bodyFatPercentage: z.number().optional(),
      leanMass: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await db();
      
      // Find the client's protocol by email
      const [protocol] = await database
        .select()
        .from(clientProtocols)
        .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${ctx.user.email || ""})`);
      
      if (!protocol) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No protocol found for your account. Please contact your coach to set up your protocol first.",
        });
      }
      
      const now = new Date();
      const metricsToInsert: Array<{
        clientProtocolId: number;
        userId: number;
        metricType: 'weight' | 'body_fat' | 'lean_mass';
        value: string;
        unit: string;
        notes: string | null;
        recordedAt: Date;
        source: 'manual';
      }> = [];
      
      if (input.weight !== undefined) {
        metricsToInsert.push({
          clientProtocolId: protocol.id,
          userId: ctx.user.id,
          metricType: 'weight',
          value: input.weight.toString(),
          unit: 'lbs',
          notes: input.notes || null,
          recordedAt: now,
          source: 'manual',
        });
      }
      
      if (input.bodyFatPercentage !== undefined) {
        metricsToInsert.push({
          clientProtocolId: protocol.id,
          userId: ctx.user.id,
          metricType: 'body_fat',
          value: input.bodyFatPercentage.toString(),
          unit: '%',
          notes: input.notes || null,
          recordedAt: now,
          source: 'manual',
        });
      }
      
      if (input.leanMass !== undefined) {
        metricsToInsert.push({
          clientProtocolId: protocol.id,
          userId: ctx.user.id,
          metricType: 'lean_mass',
          value: input.leanMass.toString(),
          unit: 'lbs',
          notes: input.notes || null,
          recordedAt: now,
          source: 'manual',
        });
      }
      
      if (metricsToInsert.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please enter at least one metric value (weight, body fat, or lean mass).",
        });
      }
      
      // Insert all metrics
      for (const metric of metricsToInsert) {
        await database.insert(clientMetrics).values(metric);
      }
      
      return { success: true };
    }),
});
