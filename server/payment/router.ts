import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { sendPaymentStatusNotification } from "../emailService";
import { sendPaymentConfirmationEmail } from "./emailService";

export const paymentRouter = router({
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
        paymentMethod: z.string().optional(), // venmo, paypal, cash, check, etc.
        transactionId: z.string().optional(), // PayPal/Venmo transaction ID
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const protocolId = parseInt(input.clientProtocolId);
        
        // Get the protocol to ensure it exists and get details
        const protocol = await db.getClientProtocolById(protocolId);
        if (!protocol) {
          throw new Error("Protocol not found");
        }

        // Update payment status and protocol status to active
        await db.updateClientProtocolPaymentStatus(input.clientProtocolId, "paid");

        // Record payment_received event for payment history with fee tracking
        try {
          const database = await db.getDb();
          if (database) {
            const { paymentEvents } = await import("../../drizzle/schema");
            await database.insert(paymentEvents).values({
              clientProtocolId: protocolId,
              eventType: "payment_received",
              grossAmount: input.grossAmount,
              feeAmount: input.feeAmount,
              netAmount: input.netAmount,
              amount: input.grossAmount, // Legacy field
              paymentMethod: input.paymentMethod,
              transactionId: input.transactionId,
              notes: input.notes,
              performedBy: ctx.user.id,
            });
            console.log(`[Payment] Payment event recorded for protocol ${protocolId}`);
          }
        } catch (eventError) {
          console.error('[Payment] Failed to record payment event:', eventError);
          // Don't fail the payment if event recording fails
        }

        // Deduct inventory items based on protocol-to-inventory mappings
        const inventoryDeductions = await db.deductInventoryForProtocol(protocolId, ctx.user.id);
        console.log(`[Payment] Inventory deducted for protocol ${protocolId}:`, inventoryDeductions);

        // Send in-app notifications to users who have notifications enabled
        await db.createNotificationsForEnabledUsers(
          "payment_received",
          `Payment received for ${protocol.clientName}`,
          `Manual payment has been confirmed for ${protocol.clientName}'s protocol. The protocol is now active.`,
          protocolId
        );

        // Send email notification to client if they have an email
        if (protocol.clientEmail) {
          const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
          const protocolUrl = `${baseUrl}/protocol/${protocol.accessToken}`;
          
          await sendPaymentStatusNotification({
            to: protocol.clientEmail,
            clientName: protocol.clientName,
            status: 'paid',
            protocolName: 'Health Protocol',
            paymentMethod: protocol.paymentMethod || 'Manual',
            notes: input.notes,
            protocolUrl,
          });
          console.log(`[Payment] Payment confirmation email sent to ${protocol.clientEmail}`);
        }

        // Auto-create packing slip for fulfillment if not already exists
        try {
          const existingPackingSlip = await db.getPackingSlipByProtocolId(protocolId);
          
          if (!existingPackingSlip) {
            const protocolItems = await db.getClientProtocolItems(protocolId);
            const allItems = await db.getAllProtocolItems();
            
            // Get recommended items that need to be shipped (physical products)
            // Only items with isRecommended=true (the "Rec" toggle) should be included
            const shippableItems = protocolItems
              .filter((item: any) => item.isRecommended)
              .map((item: any) => {
                const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
                return {
                  protocolItemId: item.protocolItemId,
                  itemName: protocolItem?.name || 'Unknown Item',
                  itemType: protocolItem?.itemType || 'other',
                  quantity: item.quantity,
                  price: parseFloat(item.customPrice || protocolItem?.price || '0'),
                };
              })
              .filter((item: any) => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));
            
            if (shippableItems.length > 0) {
              await db.createPackingSlip({
                clientProtocolId: protocolId,
                clientName: protocol.clientName,
                clientEmail: protocol.clientEmail || '',
                // Include shipping address from protocol
                shippingName: protocol.shippingName,
                shippingStreet: protocol.shippingStreet,
                shippingCity: protocol.shippingCity,
                shippingState: protocol.shippingState,
                shippingZip: protocol.shippingZip,
                shippingCountry: protocol.shippingCountry,
                shippingPhone: protocol.shippingPhone,
                items: shippableItems,
              });
              console.log(`[Payment] Packing slip created for protocol ${protocolId}`);
              
              // Send admin notification for packing slip creation
              await db.createNotificationsForEnabledUsers(
                'packing_slip_created',
                `Packing slip created for ${protocol.clientName}`,
                `A new packing slip has been created for ${protocol.clientName} with ${shippableItems.length} items ready for fulfillment.`,
                protocolId
              );
            }
          } else {
            console.log(`[Payment] Packing slip already exists for protocol ${protocolId}`);
          }
        } catch (error) {
          console.error('[Payment] Failed to create packing slip:', error);
          // Don't fail the payment confirmation if packing slip creation fails
        }

        return {
          success: true,
          message: "Payment marked as received - protocol is now active",
          inventoryDeductions,
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
