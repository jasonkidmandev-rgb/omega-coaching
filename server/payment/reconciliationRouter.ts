import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { sendPaymentConfirmationEmail, sendAdminPaymentReceivedEmail } from "./emailService";
import { sendPushToClient } from "../pushNotification";

/**
 * Create packing slip for a paid protocol if one doesn't exist
 * This is called when admin manually approves a payment (e.g., Venmo payments)
 */
async function createPackingSlipForPayment(clientProtocolId: number) {
  try {
    // Check if packing slip already exists
    const existingSlip = await db.getPackingSlipByProtocolId(clientProtocolId);
    if (existingSlip) {
      console.log(`[Payment Reconciliation] Packing slip already exists for protocol ${clientProtocolId}`);
      return;
    }

    // Get protocol details
    const protocol = await db.getClientProtocolById(clientProtocolId);
    if (!protocol) {
      console.warn(`[Payment Reconciliation] Protocol not found: ${clientProtocolId}`);
      return;
    }

    // Get protocol items - only recommended items (isRecommended = true)
    const protocolItems = await db.getClientProtocolItems(clientProtocolId);
    const allItems = await db.getAllProtocolItems();

    // Filter to included, coach-fulfilled items with QTY > 0
    // Exclude services from packing slips - they don't need to be physically shipped
    const shippableItems = protocolItems
      .filter((item: any) => item.isIncluded && item.quantity > 0 && item.fulfillmentSource !== 'client')
      .map((item: any) => {
        const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
        return {
          protocolItemId: item.protocolItemId,
          itemName: protocolItem?.name || 'Unknown Item',
          itemType: protocolItem?.itemType || 'other',
          quantity: item.quantity || 1,
          price: parseFloat(item.customPrice || protocolItem?.price || '0'),
        };
      })
      .filter((item: any) => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));

    if (shippableItems.length === 0) {
      console.log(`[Payment Reconciliation] No shippable items found for protocol ${clientProtocolId}`);
      return;
    }
    
    // Calculate total amount - only create packing slip if total > $0
    // $0 protocols are "client gets their own" affiliate-only protocols
    const totalAmount = shippableItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    if (totalAmount <= 0) {
      console.log(`[Payment Reconciliation] Skipping packing slip for protocol ${clientProtocolId} - total amount is $0 (affiliate-only protocol)`);
      return;
    }

    // Create packing slip
    const packingSlipId = await db.createPackingSlip({
      clientProtocolId: protocol.id,
      clientName: protocol.clientName,
      clientEmail: protocol.clientEmail || '',
      shippingName: protocol.shippingName,
      shippingStreet: protocol.shippingStreet,
      shippingCity: protocol.shippingCity,
      shippingState: protocol.shippingState,
      shippingZip: protocol.shippingZip,
      shippingCountry: protocol.shippingCountry,
      shippingPhone: protocol.shippingPhone,
      items: shippableItems,
    });

    console.log(`[Payment Reconciliation] Created packing slip ${packingSlipId} for protocol ${clientProtocolId} with ${shippableItems.length} items`);
    
    // Send admin notification for packing slip creation
    await db.createNotificationsForEnabledUsers(
      'packing_slip_created',
      `Packing slip created for ${protocol.clientName}`,
      `A new packing slip has been created for ${protocol.clientName} with ${shippableItems.length} items ready for fulfillment.`,
      clientProtocolId
    );
    console.log(`[Payment Reconciliation] Admin notification sent for packing slip creation`);
    
    return packingSlipId;
  } catch (error) {
    console.error('[Payment Reconciliation] Failed to create packing slip:', error);
  }
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmailSafe(
  clientProtocolId: number,
  method: "paypal" | "venmo" | "other"
) {
  try {
    // Get client protocol details
    const protocol = await db.getClientProtocolById(clientProtocolId);
    
    if (!protocol || !protocol.clientEmail) {
      console.warn(`[Payment Reconciliation] Cannot send email - missing protocol or email`);
      return;
    }

    // Calculate total amount from protocol items
    const protocolItems = await db.getClientProtocolItems(clientProtocolId);
    const allItems = await db.getAllProtocolItems();
    
    let totalAmount = 0;
    for (const item of protocolItems) {
      if (item.isIncluded) {
        const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
        const price = parseFloat(item.customPrice || protocolItem?.price || '0');
        totalAmount += price * (item.quantity || 1);
      }
    }
    if (protocol.coachingPrice) {
      totalAmount += parseFloat(protocol.coachingPrice);
    }

    // Get protocol name from template if available
    let protocolName = "Health Protocol";
    if (protocol.templateId) {
      const template = await db.getTemplateById(protocol.templateId);
      if (template?.name) {
        protocolName = template.name;
      }
    }

    // Get support email from site settings
    const supportEmail = await db.getSiteSetting('support_email') || 'support@omegalongevity.com';

    // Get site URL for email links
    const siteUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';

    await sendPaymentConfirmationEmail({
      clientName: protocol.clientName,
      clientEmail: protocol.clientEmail,
      amount: totalAmount.toFixed(2),
      currency: "USD",
      paymentMethod: method,
      protocolName: protocolName,
      paymentDate: new Date(),
      supportEmail: supportEmail,
      siteUrl: siteUrl,
    });

    console.log(`[Payment Reconciliation] Confirmation email sent to ${protocol.clientEmail} for $${totalAmount.toFixed(2)}`);
  } catch (error) {
    console.error(`[Payment Reconciliation] Failed to send confirmation email:`, error);
  }
}

export const paymentReconciliationRouter = router({
  // Get pending reconciliation items
  getPendingReconciliation: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const clientProtocols = await db.getAllClientProtocols();

      // Filter for pending payments
      const pending = clientProtocols.filter(
        (p: any) => p.paymentStatus === "pending" && p.status === "active"
      );

      // Sort by oldest first
      pending.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const total = pending.length;
      const items = pending.slice(input.offset, input.offset + input.limit);

      return {
        items: items.map((p: any) => ({
          id: p.id,
          clientName: p.clientName,
          clientEmail: p.clientEmail,
          paymentMethod: p.paymentMethod,
          paymentStatus: p.paymentStatus,
          createdAt: p.createdAt,
          daysOverdue: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        })),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Approve pending payment (creates packing slip and sends confirmation email)
  approvePayment: adminProcedure
    .input(
      z.object({
        protocolId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get protocol to determine payment method
        const protocol = await db.getClientProtocolById(input.protocolId);
        if (!protocol) {
          throw new Error("Protocol not found");
        }
        
        // Update payment status to paid
        await db.updateClientProtocolPaymentStatus(input.protocolId.toString(), "paid");
        
        // Create admin notification for payment received
        const paymentMethod = protocol.paymentMethod || "other";
        await db.createNotificationsForEnabledUsers(
          'payment_received',
          `Payment received from ${protocol.clientName}`,
          `${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} payment has been manually confirmed for ${protocol.clientName}'s protocol.`,
          input.protocolId
        );
        
        // Create packing slip if one doesn't exist
        const packingSlipId = await createPackingSlipForPayment(input.protocolId);
        
        // Send payment confirmation email
        await sendPaymentConfirmationEmailSafe(input.protocolId, paymentMethod as "paypal" | "venmo" | "other");
        
        // Send admin email notification about payment received
        try {
          let protocolNameForAdmin = "Health Protocol";
          if (protocol.templateId) {
            const template = await db.getTemplateById(protocol.templateId);
            if (template?.name) protocolNameForAdmin = template.name;
          }
          const adminEmailResult = await sendAdminPaymentReceivedEmail({
            clientName: protocol.clientName,
            clientEmail: protocol.clientEmail || '',
            amount: '0', // Amount not available in manual approval context
            currency: 'USD',
            paymentMethod: (paymentMethod === 'paypal' || paymentMethod === 'venmo' || paymentMethod === 'cc') ? paymentMethod : 'other',
            protocolId: input.protocolId,
            protocolName: protocolNameForAdmin,
            paymentDate: new Date(),
          });
          console.log(`[Payment Reconciliation] Admin payment notification sent to: ${adminEmailResult.sentTo.join(', ')}`);
        } catch (adminEmailError) {
          console.error('[Payment Reconciliation] Failed to send admin payment notification email:', adminEmailError);
        }

        // Send push notification to client if they have subscriptions
        if (protocol.clientId) {
          try {
            await sendPushToClient(
              protocol.clientId,
              {
                title: 'Payment Confirmed',
                body: 'Your payment has been received. Thank you!',
                url: `/protocol/${protocol.accessToken}`,
              },
              'payment_received',
              { clientProtocolId: input.protocolId }
            );
            console.log(`[Payment Reconciliation] Push notification sent to client ${protocol.clientId}`);
          } catch (pushError) {
            console.warn(`[Payment Reconciliation] Failed to send push notification:`, pushError);
          }
        }
        
        return { 
          success: true, 
          protocolId: input.protocolId,
          packingSlipCreated: !!packingSlipId,
        };
      } catch (error) {
        throw new Error(`Failed to approve payment: ${error}`);
      }
    }),

  // Reject pending payment
  rejectPayment: adminProcedure
    .input(
      z.object({
        protocolId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db.updateClientProtocolPaymentStatus(input.protocolId.toString(), "failed");
        return { success: true, protocolId: input.protocolId };
      } catch (error) {
        throw new Error(`Failed to reject payment: ${error}`);
      }
    }),

  // Get reconciliation summary
  getSummary: adminProcedure.query(async () => {
    const clientProtocols = await db.getAllClientProtocols();

    const pending = clientProtocols.filter((p: any) => p.paymentStatus === "pending");
    const overdue3days = pending.filter(
      (p: any) => Date.now() - new Date(p.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000
    );
    const overdue7days = pending.filter(
      (p: any) => Date.now() - new Date(p.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000
    );

    return {
      totalPending: pending.length,
      overdue3Days: overdue3days.length,
      overdue7Days: overdue7days.length,
      totalOverdueAmount: pending
        .filter((p: any) => Date.now() - new Date(p.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000)
        .reduce((sum: number, p: any) => sum + (typeof p.totalPrice === "string" ? parseFloat(p.totalPrice) : p.totalPrice || 0), 0),
    };
  }),

  // Get audit trail for a payment
  getAuditTrail: adminProcedure
    .input(
      z.object({
        protocolId: z.number(),
      })
    )
    .query(async ({ input }) => {
      // This would typically query an audit log table
      // For now, return a basic structure
      return {
        protocolId: input.protocolId,
        events: [
          {
            timestamp: new Date(),
            action: "payment_status_updated",
            oldStatus: "pending",
            newStatus: "paid",
            updatedBy: "admin",
          },
        ],
      };
    }),

  // Bulk reconciliation (creates packing slips for approved payments)
  bulkReconcile: adminProcedure
    .input(
      z.object({
        protocolIds: z.array(z.number()),
        action: z.enum(["approve", "reject"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const protocolId of input.protocolIds) {
        try {
          const status = input.action === "approve" ? "paid" : "failed";
          await db.updateClientProtocolPaymentStatus(protocolId.toString(), status);
          
          // If approving, create packing slip and send confirmation email
          if (input.action === "approve") {
            const protocol = await db.getClientProtocolById(protocolId);
            if (protocol) {
              // Create admin notification
              await db.createNotificationsForEnabledUsers(
                'payment_received',
                `Payment received from ${protocol.clientName}`,
                `Payment has been manually confirmed for ${protocol.clientName}'s protocol.`,
                protocolId
              );
              
              // Create packing slip
              await createPackingSlipForPayment(protocolId);
              
              // Send confirmation email
              const paymentMethod = protocol.paymentMethod || "other";
              await sendPaymentConfirmationEmailSafe(protocolId, paymentMethod as "paypal" | "venmo" | "other");
              
              // Send admin email notification about payment received
              try {
                let protocolNameForAdmin = "Health Protocol";
                if (protocol.templateId) {
                  const template = await db.getTemplateById(protocol.templateId);
                  if (template?.name) protocolNameForAdmin = template.name;
                }
                await sendAdminPaymentReceivedEmail({
                  clientName: protocol.clientName,
                  clientEmail: protocol.clientEmail || '',
                  amount: '0',
                  currency: 'USD',
                  paymentMethod: (paymentMethod === 'paypal' || paymentMethod === 'venmo' || paymentMethod === 'cc') ? paymentMethod : 'other',
                  protocolId: protocolId,
                  protocolName: protocolNameForAdmin,
                  paymentDate: new Date(),
                });
              } catch (adminEmailError) {
                console.error(`[Bulk Reconcile] Failed to send admin payment notification for protocol ${protocolId}:`, adminEmailError);
              }

              // Send push notification to client
              if (protocol.clientId) {
                try {
                  await sendPushToClient(
                    protocol.clientId,
                    {
                      title: 'Payment Confirmed',
                      body: 'Your payment has been received. Thank you!',
                      url: `/protocol/${protocol.accessToken}`,
                    },
                    'payment_received',
                    { clientProtocolId: protocolId }
                  );
                } catch (pushError) {
                  console.warn(`[Bulk Reconcile] Failed to send push notification for protocol ${protocolId}:`, pushError);
                }
              }
            }
          }
          
          results.push({ protocolId, success: true });
        } catch (error) {
          results.push({ protocolId, success: false, error: String(error) });
        }
      }

      return {
        total: input.protocolIds.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    }),
});
