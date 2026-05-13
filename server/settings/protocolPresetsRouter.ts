import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { coachProtocolPresets, clientProtocolItems, protocolItems } from "../../drizzle/schema";
import { eq, desc, or } from "drizzle-orm";

const presetItemSchema = z.object({
  name: z.string(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  instructions: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export const protocolPresetsRouter = router({
  // Get all presets (system + user's own)
  list: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const presets = await db
      .select()
      .from(coachProtocolPresets)
      .where(
        or(
          eq(coachProtocolPresets.isSystemPreset, true),
          eq(coachProtocolPresets.createdBy, ctx.user.id)
        )
      )
      .orderBy(desc(coachProtocolPresets.createdAt));
    return presets;
  }),

  // Get a single preset by ID
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [preset] = await db
        .select()
        .from(coachProtocolPresets)
        .where(eq(coachProtocolPresets.id, input.id));
      return preset || null;
    }),

  // Create a new preset
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      category: z.string().optional(),
      items: z.array(presetItemSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [result] = await db.insert(coachProtocolPresets).values({
        name: input.name,
        description: input.description || null,
        category: input.category || null,
        items: input.items,
        createdBy: ctx.user.id,
        isSystemPreset: false,
      });
      return { id: result.insertId };
    }),

  // Update a preset
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      items: z.array(presetItemSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      // Check ownership (can only update own presets, not system presets)
      const [existing] = await db
        .select()
        .from(coachProtocolPresets)
        .where(eq(coachProtocolPresets.id, input.id));
      
      if (!existing) {
        throw new Error("Preset not found");
      }
      
      if (existing.isSystemPreset) {
        throw new Error("Cannot modify system presets");
      }
      
      if (existing.createdBy !== ctx.user.id) {
        throw new Error("You can only modify your own presets");
      }

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.items !== undefined) updateData.items = input.items;

      await db
        .update(coachProtocolPresets)
        .set(updateData)
        .where(eq(coachProtocolPresets.id, input.id));

      return { success: true };
    }),

  // Delete a preset
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      // Check ownership
      const [existing] = await db
        .select()
        .from(coachProtocolPresets)
        .where(eq(coachProtocolPresets.id, input.id));
      
      if (!existing) {
        throw new Error("Preset not found");
      }
      
      if (existing.isSystemPreset) {
        throw new Error("Cannot delete system presets");
      }
      
      if (existing.createdBy !== ctx.user.id) {
        throw new Error("You can only delete your own presets");
      }

      await db
        .delete(coachProtocolPresets)
        .where(eq(coachProtocolPresets.id, input.id));

      return { success: true };
    }),

  // Save current protocol as a preset
  saveFromProtocol: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      // Get the protocol items with their details from protocolItems table
      const items = await db
        .select({
          name: protocolItems.name,
          schedule: protocolItems.schedule,
          duration: protocolItems.duration,
          notes: protocolItems.notes,
          customCategoryName: clientProtocolItems.customCategoryName,
          customSchedule: clientProtocolItems.customSchedule,
          customNotes: clientProtocolItems.customNotes,
          quantity: clientProtocolItems.quantity,
        })
        .from(clientProtocolItems)
        .innerJoin(protocolItems, eq(clientProtocolItems.protocolItemId, protocolItems.id))
        .where(eq(clientProtocolItems.clientProtocolId, input.clientProtocolId));
      
      // Convert to preset format
      const presetItems = items.map(item => ({
        name: item.name,
        dosage: item.quantity?.toString() || undefined,
        frequency: item.customSchedule || item.schedule || undefined,
        instructions: item.duration || undefined,
        category: item.customCategoryName || undefined,
        notes: item.customNotes || item.notes || undefined,
      }));

      const [result] = await db.insert(coachProtocolPresets).values({
        name: input.name,
        description: input.description || null,
        category: input.category || null,
        items: presetItems,
        createdBy: ctx.user.id,
        isSystemPreset: false,
      });

      return { id: result.insertId };
    }),

  // Apply a preset to a client protocol
  applyToProtocol: adminProcedure
    .input(z.object({
      presetId: z.number(),
      clientProtocolId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      // Get the preset
      const [preset] = await db
        .select()
        .from(coachProtocolPresets)
        .where(eq(coachProtocolPresets.id, input.presetId));
      
      if (!preset) {
        throw new Error("Preset not found");
      }

      // Get all protocol items to match by name
      const allProtocolItems = await db.select().from(protocolItems);
      const itemsByName = new Map(allProtocolItems.map(item => [item.name.toLowerCase(), item]));

      // Get existing client protocol items
      const existingItems = await db
        .select()
        .from(clientProtocolItems)
        .where(eq(clientProtocolItems.clientProtocolId, input.clientProtocolId));
      const existingItemIds = new Set(existingItems.map(item => item.protocolItemId));

      // Apply preset items
      const presetItems = (preset.items as Array<{ name: string; dosage?: string; frequency?: string; instructions?: string; category?: string; notes?: string }>) || [];
      let addedCount = 0;
      let updatedCount = 0;

      for (const presetItem of presetItems) {
        const matchingItem = itemsByName.get(presetItem.name.toLowerCase());
        if (matchingItem) {
          if (existingItemIds.has(matchingItem.id)) {
            // Update existing item
            await db
              .update(clientProtocolItems)
              .set({
                isIncluded: true,
                isRecommended: true,
                customSchedule: presetItem.frequency || null,
                customNotes: presetItem.notes || null,
                quantity: presetItem.dosage ? parseInt(presetItem.dosage) || 1 : 1,
              })
              .where(eq(clientProtocolItems.clientProtocolId, input.clientProtocolId));
            updatedCount++;
          } else {
            // Add new item
            await db.insert(clientProtocolItems).values({
              clientProtocolId: input.clientProtocolId,
              protocolItemId: matchingItem.id,
              isIncluded: true,
              isRecommended: true,
              quantity: presetItem.dosage ? parseInt(presetItem.dosage) || 1 : 1,
              customSchedule: presetItem.frequency || null,
              customNotes: presetItem.notes || null,
            });
            addedCount++;
          }
        }
      }

      return { success: true, addedCount, updatedCount };
    }),
});
