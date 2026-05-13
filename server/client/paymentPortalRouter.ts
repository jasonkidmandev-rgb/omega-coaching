import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

/**
 * Calculate the total amount for a protocol based on its items and settings
 */
async function calculateProtocolTotal(protocol: any): Promise<number> {
  try {
    const protocolItems = await db.getClientProtocolItems(protocol.id);
    const allItems = await db.getAllProtocolItems();
    
    let total = 0;
    
    // Sum up included items
    for (const item of protocolItems) {
      if (item.isIncluded) {
        const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
        const price = parseFloat(item.customPrice || protocolItem?.price || '0');
        total += price * item.quantity;
      }
    }
    
    // Add coaching price if applicable
    if (protocol.coachingPrice) {
      total += parseFloat(protocol.coachingPrice);
    }
    
    // Apply discount if applicable
    if (protocol.discountPercent) {
      const discount = parseFloat(protocol.discountPercent);
      total = total * (1 - discount / 100);
    }
    
    return total;
  } catch (error) {
    console.error(`Error calculating total for protocol ${protocol.id}:`, error);
    return 0;
  }
}

export const clientPaymentPortalRouter = router({
  /**
   * Get payment history for a specific client by email
   * This is a client-facing endpoint that shows their payment history
   */
  getMyPayments: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        // Get the protocol by access token to verify client identity
        const protocol = await db.getClientProtocolByToken(input.accessToken);
        
        if (!protocol) {
          return {
            success: false,
            error: "Invalid access token",
            data: null,
          };
        }

        // Get all protocols for this client email
        const allProtocols = await db.getAllClientProtocols('all');
        const clientProtocols = allProtocols.filter(
          (p) => p.clientEmail?.toLowerCase() === protocol.clientEmail?.toLowerCase()
        );

        // Calculate amounts and format data
        const paymentsWithDetails = await Promise.all(
          clientProtocols.map(async (p) => {
            const amount = await calculateProtocolTotal(p);
            return {
              id: p.id,
              protocolName: "Health Protocol",
              paymentStatus: p.paymentStatus || "pending",
              paymentMethod: p.paymentMethod,
              amount: Math.round(amount * 100) / 100,
              createdAt: p.createdAt,
              paymentReceivedAt: p.paymentReceivedAt,
              accessToken: p.accessToken,
              status: p.status,
            };
          })
        );

        // Sort by most recent first
        paymentsWithDetails.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        // Calculate summary
        const totalPaid = paymentsWithDetails
          .filter((p) => p.paymentStatus === "paid")
          .reduce((sum, p) => sum + p.amount, 0);

        const totalPending = paymentsWithDetails
          .filter((p) => p.paymentStatus === "pending")
          .reduce((sum, p) => sum + p.amount, 0);

        const paidCount = paymentsWithDetails.filter((p) => p.paymentStatus === "paid").length;
        const pendingCount = paymentsWithDetails.filter((p) => p.paymentStatus === "pending").length;

        return {
          success: true,
          data: {
            clientName: protocol.clientName,
            clientEmail: protocol.clientEmail,
            payments: paymentsWithDetails,
            summary: {
              totalPaid: Math.round(totalPaid * 100) / 100,
              totalPending: Math.round(totalPending * 100) / 100,
              paidCount,
              pendingCount,
              totalProtocols: paymentsWithDetails.length,
            },
          },
        };
      } catch (error) {
        console.error("Error fetching client payments:", error);
        return {
          success: false,
          error: "Failed to fetch payment history",
          data: null,
        };
      }
    }),

  /**
   * Get payment details for a specific protocol
   */
  getPaymentDetails: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        protocolId: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        // Verify access token
        const protocol = await db.getClientProtocolByToken(input.accessToken);
        
        if (!protocol) {
          return {
            success: false,
            error: "Invalid access token",
            data: null,
          };
        }

        // Get the specific protocol
        const targetProtocol = await db.getClientProtocolById(input.protocolId);
        
        if (!targetProtocol) {
          return {
            success: false,
            error: "Protocol not found",
            data: null,
          };
        }

        // Verify the client owns this protocol
        if (targetProtocol.clientEmail?.toLowerCase() !== protocol.clientEmail?.toLowerCase()) {
          return {
            success: false,
            error: "Unauthorized",
            data: null,
          };
        }

        // Get protocol items for breakdown
        const protocolItems = await db.getClientProtocolItems(input.protocolId);
        const allItems = await db.getAllProtocolItems();

        const itemsWithDetails = protocolItems
          .filter((item) => item.isIncluded)
          .map((item) => {
            const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
            const price = parseFloat(item.customPrice || protocolItem?.price || '0');
            return {
              name: protocolItem?.name || "Unknown Item",
              quantity: item.quantity,
              unitPrice: price,
              total: price * item.quantity,
            };
          });

        const subtotal = itemsWithDetails.reduce((sum, item) => sum + item.total, 0);
        const coachingPrice = targetProtocol.coachingPrice ? parseFloat(targetProtocol.coachingPrice) : 0;
        const discountPercent = targetProtocol.discountPercent ? parseFloat(targetProtocol.discountPercent) : 0;
        const discountAmount = (subtotal + coachingPrice) * (discountPercent / 100);
        const total = subtotal + coachingPrice - discountAmount;

        return {
          success: true,
          data: {
            protocolId: targetProtocol.id,
            protocolName: "Health Protocol",
            paymentStatus: targetProtocol.paymentStatus || "pending",
            paymentMethod: targetProtocol.paymentMethod,
            createdAt: targetProtocol.createdAt,
            paymentReceivedAt: targetProtocol.paymentReceivedAt,
            items: itemsWithDetails,
            coachingPrice: Math.round(coachingPrice * 100) / 100,
            subtotal: Math.round(subtotal * 100) / 100,
            discountPercent,
            discountAmount: Math.round(discountAmount * 100) / 100,
            total: Math.round(total * 100) / 100,
            accessToken: targetProtocol.accessToken,
          },
        };
      } catch (error) {
        console.error("Error fetching payment details:", error);
        return {
          success: false,
          error: "Failed to fetch payment details",
          data: null,
        };
      }
    }),
});
