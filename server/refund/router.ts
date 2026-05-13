import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import * as refundDb from "./db";

export const refundRouter = router({
  /**
   * Client creates a refund request
   */
  create: publicProcedure
    .input(
      z.object({
        protocolId: z.number(),
        clientId: z.string(),
        reason: z.string().min(10).max(1000),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Check if protocol exists and belongs to client
        const protocol = await db.getClientProtocolById(input.protocolId);
        if (!protocol) {
          return {
            success: false,
            error: "Protocol not found",
          };
        }

        // Create refund request
        const refundRequest = await refundDb.createRefundRequest({
          protocolId: input.protocolId,
          clientId: input.clientId,
          reason: input.reason,
          status: "pending",
        });

        return {
          success: true,
          data: refundRequest,
        };
      } catch (error) {
        console.error("Error creating refund request:", error);
        return {
          success: false,
          error: "Failed to create refund request",
        };
      }
    }),

  /**
   * Get refund requests for a client
   */
  getByClient: publicProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ input }) => {
      try {
        const requests = await refundDb.getRefundRequestsByClient(input.clientId);
        return {
          success: true,
          data: requests,
        };
      } catch (error) {
        console.error("Error fetching client refund requests:", error);
        return {
          success: false,
          error: "Failed to fetch refund requests",
          data: [],
        };
      }
    }),

  /**
   * Admin: Get all refund requests
   */
  getAll: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "processed"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const requests = await refundDb.getAllRefundRequests(input.status);

        // Apply pagination
        const paginated = requests.slice(input.offset, input.offset + input.limit);

        return {
          success: true,
          data: paginated,
          total: requests.length,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Error fetching all refund requests:", error);
        return {
          success: false,
          error: "Failed to fetch refund requests",
          data: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
        };
      }
    }),

  /**
   * Admin: Approve a refund request
   */
  approve: adminProcedure
    .input(
      z.object({
        requestId: z.number(),
        refundAmount: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const updated = await refundDb.updateRefundRequest(input.requestId, {
          status: "approved",
          refundAmount: input.refundAmount,
          adminNotes: input.notes,
          reviewedAt: new Date(),
        });

        return {
          success: true,
          data: updated,
        };
      } catch (error) {
        console.error("Error approving refund request:", error);
        return {
          success: false,
          error: "Failed to approve refund request",
        };
      }
    }),

  /**
   * Admin: Reject a refund request
   */
  reject: adminProcedure
    .input(
      z.object({
        requestId: z.number(),
        notes: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const updated = await refundDb.updateRefundRequest(input.requestId, {
          status: "rejected",
          adminNotes: input.notes,
          reviewedAt: new Date(),
        });

        return {
          success: true,
          data: updated,
        };
      } catch (error) {
        console.error("Error rejecting refund request:", error);
        return {
          success: false,
          error: "Failed to reject refund request",
        };
      }
    }),

  /**
   * Admin: Mark refund as processed
   */
  markProcessed: adminProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const updated = await refundDb.updateRefundRequest(input.requestId, {
          status: "processed",
          processedAt: new Date(),
        });

        return {
          success: true,
          data: updated,
        };
      } catch (error) {
        console.error("Error marking refund as processed:", error);
        return {
          success: false,
          error: "Failed to mark refund as processed",
        };
      }
    }),
});
