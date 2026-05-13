import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
// import { sendPaymentReminderEmail } from "./emailService";

export const bulkPaymentActionsRouter = router({
  // Bulk mark payments as received
  markAsReceived: adminProcedure
    .input(
      z.object({
        protocolIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const protocolId of input.protocolIds) {
        try {
          await db.updateClientProtocolPaymentStatus(protocolId.toString(), "paid");
          results.push({ protocolId, success: true });
        } catch (error) {
          results.push({ protocolId, success: false, error: String(error) });
        }
      }

      return results;
    }),

  // Bulk mark payments as failed
  markAsFailed: adminProcedure
    .input(
      z.object({
        protocolIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const protocolId of input.protocolIds) {
        try {
          await db.updateClientProtocolPaymentStatus(protocolId.toString(), "failed");
          results.push({ protocolId, success: true });
        } catch (error) {
          results.push({ protocolId, success: false, error: String(error) });
        }
      }

      return results;
    }),

  // Bulk send payment reminders
  sendReminders: adminProcedure
    .input(
      z.object({
        protocolIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];
      const clientProtocols = await db.getAllClientProtocols();

      for (const protocolId of input.protocolIds) {
        try {
          const protocol = clientProtocols.find((p: any) => p.id === protocolId);
          if (!protocol) {
            results.push({ protocolId, success: false, error: "Protocol not found" });
            continue;
          }

          if (protocol.paymentStatus !== "pending") {
            results.push({ protocolId, success: false, error: "Payment not pending" });
            continue;
          }

          // Send reminder email (implement in emailService)
          // await sendPaymentReminderEmail({
          //   clientName: protocol.clientName,
          //   clientEmail: protocol.clientEmail,
          //   protocolId: protocol.id,
          //   amount: protocol.totalPrice,
          //   daysOverdue: 3,
          // });

          results.push({ protocolId, success: true });
        } catch (error) {
          results.push({ protocolId, success: false, error: String(error) });
        }
      }

      return results;
    }),

  // Bulk process refunds
  processRefunds: adminProcedure
    .input(
      z.object({
        protocolIds: z.array(z.number()),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const protocolId of input.protocolIds) {
        try {
          await db.updateClientProtocolPaymentStatus(protocolId.toString(), "refunded");
          results.push({ protocolId, success: true });
        } catch (error) {
          results.push({ protocolId, success: false, error: String(error) });
        }
      }

      return results;
    }),

  // Get bulk action summary
  getSummary: adminProcedure
    .input(
      z.object({
        protocolIds: z.array(z.number()),
      })
    )
    .query(async ({ input }) => {
      const clientProtocols = await db.getAllClientProtocols();
      const selected = clientProtocols.filter((p: any) => input.protocolIds.includes(p.id));

      const summary = {
        totalSelected: selected.length,
        paid: selected.filter((p: any) => p.paymentStatus === "paid").length,
        pending: selected.filter((p: any) => p.paymentStatus === "pending").length,
        failed: selected.filter((p: any) => p.paymentStatus === "failed").length,
        refunded: selected.filter((p: any) => p.paymentStatus === "refunded").length,
        totalRevenue: 0, // Calculate from protocol items
      };

      return summary;
    }),
});
