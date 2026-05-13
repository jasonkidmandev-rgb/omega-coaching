import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { paymentEvents } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export const paymentEventsRouter = router({
  // Get payment history for a specific client protocol
  getByProtocol: protectedProcedure
    .input(z.object({
      clientProtocolId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const events = await db
        .select()
        .from(paymentEvents)
        .where(eq(paymentEvents.clientProtocolId, input.clientProtocolId))
        .orderBy(desc(paymentEvents.createdAt));
      
      return events;
    }),

  // Get all payment events with filters (for admin payment history page)
  getAll: adminProcedure
    .input(z.object({
      eventType: z.enum([
        "payment_due", "reminder_sent", "payment_received", 
        "payment_failed", "payment_refunded", "payment_cancelled", "status_changed"
      ]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [];
      
      if (input.eventType) {
        conditions.push(eq(paymentEvents.eventType, input.eventType));
      }
      
      if (input.startDate) {
        conditions.push(gte(paymentEvents.createdAt, new Date(input.startDate)));
      }
      
      if (input.endDate) {
        // If endDate is just a date (no time), set to end of day
        let endDateObj = new Date(input.endDate);
        if (input.endDate.length <= 10) {
          endDateObj.setUTCHours(23, 59, 59, 999);
        }
        conditions.push(lte(paymentEvents.createdAt, endDateObj));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const events = await db
        .select()
        .from(paymentEvents)
        .where(whereClause)
        .orderBy(desc(paymentEvents.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(paymentEvents)
        .where(whereClause);
      
      return {
        events,
        total: countResult[0]?.count || 0,
      };
    }),

  // Record a new payment event
  record: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      eventType: z.enum([
        "payment_due", "reminder_sent", "payment_received", 
        "payment_failed", "payment_refunded", "payment_cancelled", "status_changed"
      ]),
      // Fee tracking for proper accounting reconciliation
      grossAmount: z.string().optional(), // Total amount before fees (what client paid)
      feeAmount: z.string().optional(), // PayPal/Venmo processing fee
      netAmount: z.string().optional(), // Amount received after fees
      amount: z.string().optional(), // Legacy field, same as grossAmount
      paymentMethod: z.string().optional(), // venmo, paypal, cash, check, credit_card, other
      transactionId: z.string().optional(), // PayPal/Venmo transaction ID for reconciliation
      notes: z.string().optional(),
      reminderType: z.string().optional(),
      emailSentTo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.insert(paymentEvents).values({
        clientProtocolId: input.clientProtocolId,
        eventType: input.eventType,
        grossAmount: input.grossAmount,
        feeAmount: input.feeAmount,
        netAmount: input.netAmount,
        amount: input.amount || input.grossAmount, // Use grossAmount as fallback for legacy field
        paymentMethod: input.paymentMethod,
        transactionId: input.transactionId,
        notes: input.notes,
        performedBy: ctx.user?.id,
        reminderType: input.reminderType,
        emailSentTo: input.emailSentTo,
      });
      
      return { success: true };
    }),

  // Get payment statistics for sales report
  getStats: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [];
      
      if (input.startDate) {
        conditions.push(gte(paymentEvents.createdAt, new Date(input.startDate)));
      }
      
      if (input.endDate) {
        // If endDate is just a date (no time), set to end of day
        let endDateObj = new Date(input.endDate);
        if (input.endDate.length <= 10) {
          endDateObj.setUTCHours(23, 59, 59, 999);
        }
        conditions.push(lte(paymentEvents.createdAt, endDateObj));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get counts by event type
      const eventCounts = await db
        .select({
          eventType: paymentEvents.eventType,
          count: sql<number>`COUNT(*)`,
        })
        .from(paymentEvents)
        .where(whereClause)
        .groupBy(paymentEvents.eventType);
      
      // Get total payments received (use COALESCE to handle legacy records with null amount)
      const paymentsReceived = await db
        .select({
          total: sql<number>`COALESCE(SUM(COALESCE(${paymentEvents.amount}, ${paymentEvents.grossAmount}, 0)), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(paymentEvents)
        .where(and(
          eq(paymentEvents.eventType, "payment_received"),
          ...(conditions.length > 0 ? conditions : [])
        ));
      
      // Get payment methods breakdown
      const paymentMethods = await db
        .select({
          method: paymentEvents.paymentMethod,
          count: sql<number>`COUNT(*)`,
          total: sql<number>`COALESCE(SUM(COALESCE(${paymentEvents.amount}, ${paymentEvents.grossAmount}, 0)), 0)`,
        })
        .from(paymentEvents)
        .where(and(
          eq(paymentEvents.eventType, "payment_received"),
          ...(conditions.length > 0 ? conditions : [])
        ))
        .groupBy(paymentEvents.paymentMethod);
      
      return {
        eventCounts: eventCounts.reduce((acc: Record<string, number>, item: { eventType: string; count: number }) => {
          acc[item.eventType] = item.count;
          return acc;
        }, {} as Record<string, number>),
        totalPaymentsReceived: paymentsReceived[0]?.total || 0,
        paymentsReceivedCount: paymentsReceived[0]?.count || 0,
        paymentMethods,
      };
    }),

  // Get recent payment activity (for dashboard)
  getRecent: adminProcedure
    .input(z.object({
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const events = await db
        .select()
        .from(paymentEvents)
        .orderBy(desc(paymentEvents.createdAt))
        .limit(input.limit);
      
      return events;
    }),

  // Backfill payment events from existing protocol data
  backfillFromProtocols: adminProcedure
    .mutation(async () => {
      const { backfillPaymentEvents } = await import('../scripts/backfillPaymentEvents');
      return backfillPaymentEvents();
    }),
});
