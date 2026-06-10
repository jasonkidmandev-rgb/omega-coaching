import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../../_core/trpc";
import { OMEGA_SOURCE } from "./schema";
import {
  listEvents,
  getEventById,
  listMappings,
  createMapping,
  updateMapping,
  deleteMapping,
} from "./db";
import { processPurchaseEvent } from "./processEvent";

/**
 * Admin surface for the omegalongevity integration:
 * inspect the inbound event log, replay failed events,
 * and manage product -> protocol template mappings.
 */
export const externalIntegrationsRouter = router({
  listEvents: adminProcedure
    .input(
      z.object({
        status: z.enum(["received", "processed", "failed", "skipped"]).optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      return listEvents(input ?? {});
    }),

  replayEvent: adminProcedure
    .input(z.object({ eventId: z.number().int() }))
    .mutation(async ({ input }) => {
      const event = await getEventById(input.eventId);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      if (event.status === "processed") {
        return { processed: true, alreadyProcessed: true };
      }
      try {
        const result = await processPurchaseEvent(event.id, event.payload);
        return { ...result, alreadyProcessed: false };
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Replay failed: ${err.message}`,
        });
      }
    }),

  listMappings: adminProcedure.query(async () => {
    return listMappings(OMEGA_SOURCE);
  }),

  createMapping: adminProcedure
    .input(
      z.object({
        externalProductId: z.string().min(1).max(255),
        externalProductName: z.string().max(255).optional(),
        protocolTemplateId: z.number().int().nullable().optional(),
        tier: z.string().max(100).nullable().optional(),
        programType: z.string().max(50).optional(),
        isActive: z.boolean().default(true),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createMapping({ source: OMEGA_SOURCE, ...input });
      return { id };
    }),

  updateMapping: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        externalProductId: z.string().min(1).max(255).optional(),
        externalProductName: z.string().max(255).nullable().optional(),
        protocolTemplateId: z.number().int().nullable().optional(),
        tier: z.string().max(100).nullable().optional(),
        programType: z.string().max(50).nullable().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMapping(id, data);
      return { success: true };
    }),

  deleteMapping: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deleteMapping(input.id);
      return { success: true };
    }),
});
