import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { sql } from "drizzle-orm";
import * as db from "../db";
import { sendPaymentStatusNotification } from "../emailService";
import { sendPaymentConfirmationEmail } from "./emailService";
import { processProtocolPaymentReceived } from "./paymentService";

export const paymentRouter = router({
  // ── Resilient payment layer: failover switch + unified ledger views ────────
  // See docs/design/2026-06-25-payment-layer-architecture.md

  /** Current payment mode — which settlement methods the app should offer. */
  getPaymentMode: publicProcedure.query(async () => {
    const { getPaymentMode } = await import("./paymentLedger");
    const mode = await getPaymentMode();
    const manualInstructions =
      (await db.getSiteSetting("payment_manual_instructions")) ||
      "To complete payment, send the total via Venmo or PayPal, then reply to let us know. Once we confirm receipt, your order is activated. Contact us if you need the payment details.";
    return {
      mode,
      stripeEnabled: mode !== "manual",
      manualEnabled: mode !== "stripe",
      manualInstructions,
    };
  }),

  /** Flip the failover switch (e.g. Stripe banned → "manual"). Admin only. */
  setPaymentMode: adminProcedure
    .input(z.object({ mode: z.enum(["stripe", "manual", "both"]) }))
    .mutation(async ({ input }) => {
      await db.setSiteSetting("payment_mode", input.mode);
      return { success: true, mode: input.mode };
    }),

  /** Unified payments ledger view (newest first). Admin only. */
  ledger: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum(["open", "awaiting_confirmation", "paid", "failed", "refunded", "void"])
            .optional(),
          limit: z.number().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { payments } = await import("../../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      const database = await db.getDb();
      if (!database) return [];
      const limit = input?.limit ?? 100;
      if (input?.status) {
        return database
          .select()
          .from(payments)
          .where(eq(payments.status, input.status))
          .orderBy(desc(payments.id))
          .limit(limit);
      }
      return database.select().from(payments).orderBy(desc(payments.id)).limit(limit);
    }),

  /** Money-in reconciliation: paid totals grouped by method. Admin only. */
  reconciliation: adminProcedure
    .input(z.object({ sinceDays: z.number().min(1).max(365).optional() }).optional())
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return [] as any[];
      const since = input?.sinceDays ?? 90;
      const [rows] = await database.execute(sql`
        SELECT COALESCE(method, 'unknown') AS method,
               COUNT(*)          AS count,
               SUM(amountCents)  AS totalCents
        FROM payments
        WHERE status = 'paid'
          AND settledAt >= DATE_SUB(NOW(), INTERVAL ${since} DAY)
        GROUP BY method
        ORDER BY totalCents DESC
      `);
      return rows as any[];
    }),

  /**
   * Get payment status for a client protocol
   */
  getStatus: publicProcedure
    .input(z.object({ clientProtocolId: z.string() }))
    .query(async ({ input }) => {
      try {
        const protocol = await db.getClientProtocolById(parseInt(input.clientProtocolId));
        if (!protocol) {
          return {
            success: false,
            error: "Protocol not found",
          };
        }

        return {
          success: true,
          paymentStatus: protocol.paymentStatus || "pending",
          paymentReceivedAt: protocol.paymentReceivedAt,
          paymentMethod: protocol.paymentMethod,
        };
      } catch (error) {
        console.error("Error getting payment status:", error);
        return {
          success: false,
          error: "Failed to get payment status",
        };
      }
    }),

  /**
   * Preview inventory deductions for a protocol (admin only)
   * Shows what inventory items will be deducted without actually deducting
   */
  previewInventoryDeductions: adminProcedure
    .input(z.object({ clientProtocolId: z.string() }))
    .query(async ({ input }) => {
      try {
        const protocolId = parseInt(input.clientProtocolId);
        const preview = await db.previewInventoryDeductions(protocolId);
        return {
          success: true,
          ...preview,
        };
      } catch (error) {
        console.error("Error previewing inventory deductions:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to preview inventory deductions",
          items: [],
          totalItemsToDeduct: 0,
          hasInsufficientStock: false,
          hasLowStockWarnings: false,
        };
      }
    }),

  /**
   * Mark payment as received (admin only)
   * This triggers the full fulfillment workflow:
   * 1. Updates payment status to "paid"
   * 2. Updates protocol status to "active"
   * 3. Deducts inventory for protocol items
   * 4. Creates packing slip for fulfillment
   * 5. Sends notifications (in-app and email)
   */
  markAsReceived: adminProcedure
    .input(
      z.object({
        clientProtocolId: z.string(),
        notes: z.string().optional(),
        // Fee tracking for accounting reconciliation
        grossAmount: z.string().optional(), // Total amount before fees (what client paid)
        feeAmount: z.string().optional(), // PayPal/Venmo processing fee
        netAmount: z.string().optional(), // Amount received after fees
        paymentMethod: z.string().optional(), // venmo, paypal, cash, check, zelle, etc.
        transactionId: z.string().optional(), // reference number / transaction ID
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const protocolId = parseInt(input.clientProtocolId);
        const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';

        // Map free-text method to enum; treat anything unrecognised as 'other'
        const methodMap: Record<string, 'venmo' | 'cc' | 'stripe' | 'other' | 'paypal'> = {
          venmo: 'venmo', paypal: 'paypal', paypal_direct: 'paypal',
          cc: 'cc', credit_card: 'cc', stripe: 'stripe',
        };
        const paymentMethod = methodMap[input.paymentMethod?.toLowerCase() ?? ''] ?? 'other';

        const result = await processProtocolPaymentReceived(protocolId, paymentMethod, {
          grossAmount: input.grossAmount,
          feeAmount: input.feeAmount,
          netAmount: input.netAmount,
          transactionId: input.transactionId,
          notes: input.notes,
          performedBy: ctx.user.id,
          baseUrl,
        });

        // Shadow-record into the unified payments ledger (non-fatal; the ledger
        // does not yet control fulfillment). See docs/design/2026-06-25-payment-layer-architecture.md
        if (!result.alreadyPaid) {
          try {
            const { recordPayment } = await import("./paymentLedger");
            await recordPayment({
              entityType: 'protocol',
              entityId: protocolId,
              amountCents: input.grossAmount ? Math.round(parseFloat(input.grossAmount) * 100) : 0,
              method: paymentMethod as any,
              externalRef: input.transactionId || null,
              status: 'paid',
              settledBy: ctx.user.id,
              notes: input.notes,
            });
          } catch (ledgerErr: any) {
            console.error(`[PaymentLedger] shadow record failed (non-fatal): ${ledgerErr.message}`);
          }
        }

        if (result.alreadyPaid) {
          return {
            success: true,
            message: "Payment was already recorded — no duplicate processing done",
            alreadyPaid: true,
          };
        }

        return {
          success: true,
          message: "Payment marked as received - protocol is now active",
          alreadyPaid: false,
        };
      } catch (error) {
        console.error("Error marking payment as received:", error);
        throw new Error(
          `Failed to mark payment as received: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Resend payment confirmation email (admin only)
   */
  resendPaymentConfirmation: adminProcedure
    .input(
      z.object({
        clientProtocolId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const protocol = await db.getClientProtocolById(input.clientProtocolId);
        if (!protocol) {
          throw new Error("Protocol not found");
        }

        if (!protocol.clientEmail) {
          throw new Error("Client has no email address on file");
        }

        if (protocol.paymentStatus !== "paid") {
          throw new Error("Payment has not been received yet - cannot send confirmation");
        }

        // Get template name for the email
        let protocolName = "Health Protocol";
        if (protocol.templateId) {
          const template = await db.getTemplateById(protocol.templateId);
          if (template) {
            protocolName = template.name;
          }
        }

        // Get the payment amount from payment events or protocol total
        const database = await db.getDb();
        let paymentAmount = (protocol as any).totalPrice || "0";
        let paymentMethod: "paypal" | "venmo" | "other" = "other";
        let transactionId = "";
        
        if (database) {
          const [events] = await (database as any).execute(
            `SELECT amount, paymentMethod, transactionId FROM payment_events WHERE clientProtocolId = ? AND eventType = 'payment_received' ORDER BY createdAt DESC LIMIT 1`,
            [input.clientProtocolId]
          ) as any;
          if (events && events.length > 0) {
            paymentAmount = events[0].amount || paymentAmount;
            const method = events[0].paymentMethod || protocol.paymentMethod;
            paymentMethod = method === "paypal" ? "paypal" : method === "venmo" ? "venmo" : "other";
            transactionId = events[0].transactionId || "";
          }
        }

        const result = await sendPaymentConfirmationEmail({
          clientName: protocol.clientName,
          clientEmail: protocol.clientEmail,
          orderId: transactionId || `PROTO-${input.clientProtocolId}`,
          amount: parseFloat(paymentAmount).toFixed(2),
          currency: "USD",
          paymentMethod,
          protocolName,
          paymentDate: protocol.paymentReceivedAt || new Date(),
          siteUrl: process.env.VITE_APP_URL || "https://peptidecoach.pro",
        });

        if (result.success) {
          // Record the resend event
          if (database) {
            const { paymentEvents } = await import("../../drizzle/schema");
            await database.insert(paymentEvents).values({
              clientProtocolId: input.clientProtocolId,
              eventType: "reminder_sent",
              notes: `Payment confirmation email resent by admin to ${protocol.clientEmail}`,
              emailSentTo: protocol.clientEmail,
              reminderType: "payment_confirmation_resend",
              performedBy: ctx.user.id,
            });
          }

          return {
            success: true,
            message: `Payment confirmation email sent to ${protocol.clientEmail}`,
          };
        } else {
          throw new Error(result.error || "Failed to send email");
        }
      } catch (error) {
        console.error("Error resending payment confirmation:", error);
        throw new Error(
          `Failed to resend confirmation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Mark payment as failed (admin only)
   */
  markAsFailed: adminProcedure
    .input(
      z.object({
        clientProtocolId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const protocolId = parseInt(input.clientProtocolId);
        const protocol = await db.getClientProtocolById(protocolId);
        
        // Update payment status to failed
        await db.updateClientProtocolPaymentStatus(input.clientProtocolId, "failed");

        // Send in-app notification about failed payment
        if (protocol) {
          await db.createNotificationsForEnabledUsers(
            "payment_failed",
            `Payment failed for ${protocol.clientName}`,
            `Payment for ${protocol.clientName}'s protocol has been marked as failed.${input.reason ? ` Reason: ${input.reason}` : ''}`,
            protocolId
          );

          // Send email notification to client if they have an email
          if (protocol.clientEmail) {
            const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
            const protocolUrl = `${baseUrl}/protocol/${protocol.accessToken}`;
            
            await sendPaymentStatusNotification({
              to: protocol.clientEmail,
              clientName: protocol.clientName,
              status: 'failed',
              protocolName: 'Health Protocol',
              paymentMethod: protocol.paymentMethod || 'Unknown',
              notes: input.reason,
              protocolUrl,
            });
            console.log(`[Payment] Payment failed notification sent to ${protocol.clientEmail}`);
          }
        }

        return {
          success: true,
          message: "Payment marked as failed",
        };
      } catch (error) {
        console.error("Error marking payment as failed:", error);
        throw new Error(
          `Failed to mark payment as failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Reconciliation: find enrollments where Stripe has been paid but the linked
   * client_protocols record still shows 'pending'. Admin can trigger a fix from
   * the UI, or the cron can call this to auto-heal.
   */
  findPaymentMismatches: adminProcedure
    .query(async () => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      const [rows] = await database.execute(sql`
        SELECT
          te.id                           AS enrollmentId,
          te.clientProtocolId,
          te.coachingFeeAmount            AS paidAmount,
          te.coachingFeePaidAt            AS paidAt,
          te.coachingFeeStripePaymentId   AS stripePaymentId,
          te.email                        AS enrollmentEmail,
          te.clientName                   AS enrollmentClientName,
          cp.clientName                   AS protocolClientName,
          cp.paymentStatus                AS protocolPaymentStatus
        FROM transformation_enrollments te
        INNER JOIN client_protocols cp ON cp.id = te.clientProtocolId
        WHERE te.coachingFeePaid = 1
          AND cp.paymentStatus != 'paid'
        ORDER BY te.coachingFeePaidAt DESC
        LIMIT 100
      `);
      return (rows as any[]) || [];
    }),

  /**
   * Fix a single mismatch by re-running processProtocolPaymentReceived for the
   * linked protocol. Safe to call multiple times — idempotent.
   */
  fixPaymentMismatch: adminProcedure
    .input(z.object({ clientProtocolId: z.number(), stripePaymentId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await processProtocolPaymentReceived(input.clientProtocolId, 'stripe', {
          transactionId: input.stripePaymentId,
          notes: `Admin reconciliation fix by ${ctx.user.name || ctx.user.email}`,
          performedBy: ctx.user.id,
        });
        return {
          success: true,
          alreadyPaid: result.alreadyPaid,
          message: result.alreadyPaid
            ? "Already paid — no action needed"
            : "Protocol payment status fixed and fulfillment triggered",
        };
      } catch (error) {
        throw new Error(`Fix failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  /**
   * Mark payment as refunded (admin only)
   */
  markAsRefunded: adminProcedure
    .input(
      z.object({
        clientProtocolId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const protocolId = parseInt(input.clientProtocolId);
        const protocol = await db.getClientProtocolById(protocolId);
        
        // Update payment status to refunded
        await db.updateClientProtocolPaymentStatus(input.clientProtocolId, "refunded");

        // Send in-app notification about refund
        if (protocol) {
          await db.createNotificationsForEnabledUsers(
            "payment_refunded",
            `Payment refunded for ${protocol.clientName}`,
            `Payment for ${protocol.clientName}'s protocol has been refunded.${input.reason ? ` Reason: ${input.reason}` : ''}`,
            protocolId
          );

          // Send email notification to client if they have an email
          if (protocol.clientEmail) {
            await sendPaymentStatusNotification({
              to: protocol.clientEmail,
              clientName: protocol.clientName,
              status: 'refunded',
              protocolName: 'Health Protocol',
              paymentMethod: protocol.paymentMethod || 'Unknown',
              notes: input.reason,
            });
            console.log(`[Payment] Refund notification sent to ${protocol.clientEmail}`);
          }
        }

        return {
          success: true,
          message: "Payment marked as refunded",
        };
      } catch (error) {
        console.error("Error marking payment as refunded:", error);
        throw new Error(
          `Failed to mark payment as refunded: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
