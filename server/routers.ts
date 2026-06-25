import { buildTrackingUrl } from "./lib/carrierUrls";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure, protectedProcedure, managerProcedure, viewerProcedure, financeProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { logRoleChange, logAuditEvent, getRecentAuditLogs, type AuditAction } from "./audit";
import * as invitation from "./invitation";
import { customOrdersRouter } from "./customOrders/router";
import { paymentRouter } from "./payment/router";
import { paymentHistoryRouter } from "./payment/historyRouter";
import { paymentAnalyticsRouter } from "./payment/analyticsRouter";
import { bulkPaymentActionsRouter } from "./payment/bulkActionsRouter";
import { paymentExportRouter } from "./payment/exportRouter";
import { paymentReconciliationRouter } from "./payment/reconciliationRouter";
import { refundRouter } from "./refund/router";
import { bookingRouter } from "./booking/router";
import { calendlyRouter } from "./calendly/router";
import { outlookRouter } from "./integrations/outlookRouter";
import { revenueGoalsRouter } from "./settings/revenueGoalsRouter";
import { adminSettingsRouter } from "./settings/adminSettingsRouter";
import { protocolPresetsRouter } from "./settings/protocolPresetsRouter";
import { emailTemplatesRouter } from "./settings/emailTemplatesRouter";
import { emailReportSettingsRouter } from "./settings/emailReportSettingsRouter";
import { dashboardPreferencesRouter } from "./settings/dashboardPreferencesRouter";
import { emailEngagementRouter } from "./email/engagementRouter";
import { paymentEventsRouter } from "./payments/paymentEventsRouter";
import { clientPaymentPortalRouter } from "./client/paymentPortalRouter";
import { bulkProfileReminderRouter } from "./client/bulkProfileReminderRouter";
import { checkinRouter, documentRouter, clientInventoryRouter, metricsRouter, achievementsRouter, notificationHistoryRouter } from "./clientCorner";
import { transformationRouter } from "./transformation/transformationRouter";
import { externalIntegrationsRouter } from "./integrations/omegalongevity/adminRouter";
import { promoCodeRouter } from "./promoCode/promoCodeRouter";
import { storePromoRouter } from "./storePromo/storePromoRouter";
import { prospectRouter } from "./prospect/prospectRouter";
import { client360Router } from "./client360/router";
import { webTrafficRouter } from "./analytics/webTrafficRouter";
import { 
  createPasswordResetToken, 
  verifyPasswordResetToken, 
  markPasswordResetTokenUsed,
  getUserByEmailForPasswordReset 
} from "./db";
import { sendEmail } from "./emailService";
import { users } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";

// ============ CATEGORY ROUTER ============
const categoryRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllCategories();
  }),
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        iconUrl: z.string().optional(),
        isActive: z.boolean().optional(),
        isDiscountable: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.createCategory(input);
      return { id };
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        iconUrl: z.string().optional(),
        isActive: z.boolean().optional(),
        isDiscountable: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCategory(id, data);
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCategory(input.id);
      return { success: true };
    }),
  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      let deleted = 0;
      let skipped = 0;
      const errors: string[] = [];
      
      for (const id of input.ids) {
        try {
          await db.deleteCategory(id);
          deleted++;
        } catch (error: any) {
          skipped++;
          errors.push(`Category ${id}: ${error.message}`);
        }
      }
      
      return { deleted, skipped, errors };
    }),
});

// ============ PROTOCOL ITEM ROUTER ============
const protocolItemRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllProtocolItems();
  }),
  byCategory: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      return db.getProtocolItemsByCategory(input.categoryId);
    }),
  create: adminProcedure
    .input(
      z.object({
        categoryId: z.number(),
        name: z.string().min(1),
        schedule: z.string().optional(),
        duration: z.string().optional(),
        price: z.string().optional(),
        defaultQty: z.number().optional(),
        purpose: z.string().optional(),
        notes: z.string().optional(),
        affiliateUrl: z.string().optional(),
        affiliateCode: z.string().optional(),
        loomVideoUrl: z.string().optional(),
        itemType: z.enum(["peptide", "supplement", "adjunct", "supply", "service", "other"]).optional(),
        isDiscountable: z.boolean().optional(),
        fulfillmentSource: z.enum(['coach', 'client']).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
        pricingTiers: z.array(z.object({
          minQty: z.number(),
          maxQty: z.number().nullable(),
          pricePerUnit: z.number(),
        })).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let id: number;
      try {
        id = await db.createProtocolItem(input);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          throw new Error(error.message);
        }
        throw error;
      }
      
      // Auto-add new item to templates with autoSync enabled
      const allTemplates = await db.getAllTemplates();
      const autoSyncTemplates = allTemplates.filter(t => (t as any).autoSync === true);
      
      for (const template of autoSyncTemplates) {
        try {
          await db.addTemplateItem({
            templateId: template.id,
            protocolItemId: id,
            quantity: input.defaultQty || 1,
            isRecommended: true,
          });
          console.log(`[Auto-Sync] Added item ${id} to template ${template.id} (${template.name})`);
        } catch (e) {
          console.log(`Could not add item ${id} to template ${template.id}:`, e);
        }
      }
      
      return { id };
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        name: z.string().min(1).optional(),
        schedule: z.string().optional(),
        duration: z.string().optional(),
        price: z.string().optional(),
        defaultQty: z.number().optional(),
        purpose: z.string().optional(),
        notes: z.string().optional(),
        affiliateUrl: z.string().optional(),
        affiliateCode: z.string().optional(),
        loomVideoUrl: z.string().optional(),
        itemType: z.enum(["peptide", "supplement", "adjunct", "supply", "service", "other"]).optional(),
        isDiscountable: z.boolean().optional(),
        fulfillmentSource: z.enum(['coach', 'client']).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
        pricingTiers: z.array(z.object({
          minQty: z.number(),
          maxQty: z.number().nullable(),
          pricePerUnit: z.number(),
        })).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateProtocolItem(id, data);
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ 
      id: z.number(), 
      force: z.boolean().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const deletedBy = ctx.user ? { id: ctx.user.id, name: ctx.user.name || ctx.user.email || 'Unknown' } : undefined;
        await db.deleteProtocolItem(input.id, input.force || false, deletedBy, input.reason);
        return { success: true };
      } catch (error: any) {
        // Return the error message so the UI can show a confirmation dialog
        if (error.message?.includes('Cannot delete')) {
          throw new Error(error.message);
        }
        throw error;
      }
    }),
  
  // Check if a protocol item is in use before deletion
  checkUsage: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getProtocolItemUsage(input.id);
    }),
  
  // Merge duplicate products
  merge: adminProcedure
    .input(z.object({
      sourceId: z.number(),
      targetId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const mergedBy = { id: ctx.user!.id, name: ctx.user!.name || ctx.user!.email || 'Unknown' };
      return db.mergeProducts(input.sourceId, input.targetId, mergedBy, input.reason);
    }),
  
  // Get deletion audit log
  getDeletionLog: adminProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getProductDeletionLog(input.limit || 50);
    }),
  
  // Get merge history log
  getMergeLog: adminProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getProductMergeLog(input.limit || 50);
    }),
  
  // Restore a deleted product
  restore: adminProcedure
    .input(z.object({ deletionLogId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const restoredBy = { id: ctx.user!.id, name: ctx.user!.name || ctx.user!.email || 'Unknown' };
      return db.restoreDeletedProduct(input.deletionLogId, restoredBy);
    }),
  
  // Find potential duplicate products
  findDuplicates: adminProcedure
    .query(async () => {
      return db.findDuplicateProducts();
    }),
  syncToTemplates: adminProcedure
    .input(
      z.object({
        protocolItemId: z.number(),
        schedule: z.string().optional(),
        duration: z.string().optional(),
        notes: z.string().optional(),
        syncMode: z.enum(['current', 'all']),
        currentTemplateId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { protocolItemId, schedule, duration, notes, syncMode, currentTemplateId } = input;
      
      // Update the master protocol item with new schedule/duration/notes
      const updateData: any = {};
      if (schedule !== undefined) updateData.schedule = schedule;
      if (duration !== undefined) updateData.duration = duration;
      if (notes !== undefined) updateData.notes = notes;
      
      if (Object.keys(updateData).length > 0) {
        await db.updateProtocolItem(protocolItemId, updateData);
      }
      
      // If syncing to current template only, we just update the master item
      // If syncing to all, we also update the master item (which affects all templates using it)
      
      return { success: true, syncMode };
    }),
  // Bulk update category for multiple items
  bulkUpdateCategory: adminProcedure
    .input(
      z.object({
        itemIds: z.array(z.number()).min(1),
        categoryId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { itemIds, categoryId } = input;
      let successCount = 0;
      let errorCount = 0;
      
      for (const id of itemIds) {
        try {
          await db.updateProtocolItem(id, { categoryId });
          successCount++;
        } catch (error) {
          console.error(`Failed to update item ${id} category:`, error);
          errorCount++;
        }
      }
      
      return { success: true, successCount, errorCount, total: itemIds.length };
    }),
});

// ============ TEMPLATE ROUTER ============
const templateRouter = router({
  list: adminProcedure.query(async () => {
    return db.getAllTemplates();
  }),
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getTemplateById(input.id);
    }),
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        durationMonths: z.number().optional(),
        isDefault: z.boolean().optional(),
        hidePricing: z.boolean().optional(),
        autoSync: z.boolean().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.createTemplate(input);
      return { id };
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        durationMonths: z.number().optional(),
        isDefault: z.boolean().optional(),
        hidePricing: z.boolean().optional(),
        autoSync: z.boolean().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateTemplate(id, data);
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteTemplate(input.id);
      return { success: true };
    }),
  getItems: adminProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ input }) => {
      return db.getTemplateItems(input.templateId);
    }),
  addItem: adminProcedure
    .input(
      z.object({
        templateId: z.number(),
        protocolItemId: z.number(),
        quantity: z.number().optional(),
        isRecommended: z.boolean().optional(),
        customNotes: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.addTemplateItem(input);
      return { id };
    }),
  updateItem: adminProcedure
    .input(
      z.object({
        id: z.number(),
        quantity: z.number().optional(),
        isRecommended: z.boolean().optional(),
        customNotes: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateTemplateItem(id, data);
      return { success: true };
    }),
  removeItem: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.removeTemplateItem(input.id);
      return { success: true };
    }),
  clearAllItems: adminProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input }) => {
      await db.clearAllTemplateItems(input.templateId);
      return { success: true };
    }),
  reorderItems: adminProcedure
    .input(z.object({
      templateId: z.number(),
      itemIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      // Update sortOrder for each template item based on its position in the array
      for (let i = 0; i < input.itemIds.length; i++) {
        await db.updateTemplateItem(input.itemIds[i], { sortOrder: i });
      }
      return { success: true };
    }),
  getAllTemplateItems: adminProcedure
    .query(async () => {
      return db.getAllTemplateItems();
    }),
});

// ============ CLIENT PROTOCOL ROUTER ============
const clientProtocolRouter = router({
  list: adminProcedure
    .input(z.object({ filter: z.enum(['active', 'archived', 'deleted', 'all']).optional() }).optional())
    .query(async ({ input }) => {
      return db.getAllClientProtocols(input?.filter || 'active');
    }),
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getClientProtocolById(input.id);
    }),
  // Check for duplicate protocols by email
  checkDuplicate: adminProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      if (!input.email) return [];
      const protocols = await db.getClientProtocolsByEmail(input.email);
      return protocols.filter((p: any) => p.status !== 'completed').map((p: any) => ({
        id: p.id,
        clientName: p.clientName,
        versionName: p.versionName,
        status: p.status,
        version: p.version,
      }));
    }),
  // Get all protocol versions for a client
  getVersionHistory: adminProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return db.getClientProtocolsByClientId(input.clientId);
    }),
  // Create a new protocol version for an existing client
  createNewVersion: adminProcedure
    .input(z.object({
      clientId: z.number().optional(),
      protocolId: z.number().optional(),
      versionName: z.string().optional(),
      versionNotes: z.string().optional(),
      templateId: z.number().optional(),
      copyItemsFromPrevious: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { clientId, protocolId, versionName, versionNotes, templateId, copyItemsFromPrevious } = input;
      
      // Support two paths: via clientId (clients table) or via protocolId (current protocol)
      let currentProtocol: any = null;
      let resolvedClientId = clientId;
      
      if (protocolId) {
        // Path B: Create from current protocol (works even when clientId is null)
        currentProtocol = await db.getClientProtocolById(protocolId);
        if (!currentProtocol) {
          throw new Error("Protocol not found");
        }
        resolvedClientId = currentProtocol.clientId || undefined;
      } else if (clientId) {
        // Path A: Create from client record
        const client = await db.getClientById(clientId);
        if (client) {
          currentProtocol = await db.getActiveProtocolForClient(clientId);
        } else {
          // clientId might be a userId - try finding the active protocol directly
          currentProtocol = await db.getActiveProtocolForClient(clientId);
          if (!currentProtocol) {
            throw new Error("Client not found");
          }
          console.log(`[createNewVersion] Client ${clientId} not in clients table, but found protocol via clientId`);
        }
      } else {
        throw new Error("Either clientId or protocolId is required");
      }
      
      // Create new protocol version from current protocol data
      const newProtocolId = await db.createNewProtocolVersionFromProtocol(
        currentProtocol,
        {
          versionName: versionName || `Protocol v${(currentProtocol?.version || 0) + 1}`,
          versionNotes: versionNotes || undefined,
          templateId: templateId || undefined,
        }
      );
      
      // If copying items from previous protocol
      if (copyItemsFromPrevious && currentProtocol) {
        const previousItems = await db.getClientProtocolItems(currentProtocol.id);
        const allMasterItemsForSnapshot = await db.getAllProtocolItems();
        for (const item of previousItems) {
          const masterItem = allMasterItemsForSnapshot.find((m: any) => m.id === item.protocolItemId);
          await db.addClientProtocolItem({
            clientProtocolId: newProtocolId,
            protocolItemId: item.protocolItemId,
            quantity: item.quantity,
            isIncluded: item.isIncluded,
            isRecommended: false, // Start fresh with recommendations
            customSchedule: item.customSchedule || undefined,
            customDuration: item.customDuration || undefined,
            customPrice: item.customPrice || undefined,
            customNotes: item.customNotes || undefined,
            customCategoryName: item.customCategoryName || undefined,
            sortOrder: item.sortOrder,
            snapshotName: (item as any).snapshotName || masterItem?.name || undefined,
          });
        }
      } else if (templateId) {
        // Clone items from template
        const templateItems = await db.getTemplateItems(templateId);
        const allMasterItemsForSnapshot = await db.getAllProtocolItems();
        for (const item of templateItems) {
          const masterItem = allMasterItemsForSnapshot.find((m: any) => m.id === item.protocolItemId);
          await db.addClientProtocolItem({
            clientProtocolId: newProtocolId,
            protocolItemId: item.protocolItemId,
            quantity: item.quantity,
            isIncluded: true,
            isRecommended: item.isRecommended,
            customNotes: item.customNotes || undefined,
            sortOrder: item.sortOrder,
            snapshotName: masterItem?.name || undefined,
          });
        }
      }
      
      const newProtocol = await db.getClientProtocolById(newProtocolId);
      return { id: newProtocolId, accessToken: newProtocol?.accessToken };
    }),
  // Sync a client protocol with its template to add missing items
  syncWithTemplate: adminProcedure
    .input(z.object({
      protocolId: z.number(),
      templateId: z.number().optional(), // If not provided, uses the protocol's templateId
    }))
    .mutation(async ({ input }) => {
      const protocol = await db.getClientProtocolById(input.protocolId);
      if (!protocol) throw new Error("Protocol not found");
      
      const templateId = input.templateId || protocol.templateId;
      if (!templateId) throw new Error("No template associated with this protocol. Please select a template.");
      
      const template = await db.getTemplateById(templateId);
      if (!template) throw new Error("Template not found");
      
      // Get current protocol items
      const currentItems = await db.getClientProtocolItems(input.protocolId);
      const currentItemIds = new Set(currentItems.map((item: any) => item.protocolItemId));
      
      // Get template items
      const templateItems = await db.getTemplateItems(templateId);
      
      // Get all master items for fulfillmentSource defaults
      const allMasterItems = await db.getAllProtocolItems();
      
      // Find items in template that are NOT in the protocol
      const missingItems = templateItems.filter((ti: any) => !currentItemIds.has(ti.protocolItemId));
      
      // Add missing items to the protocol (as excluded by default so they don't disrupt the current protocol)
      let addedCount = 0;
      for (const item of missingItems) {
        const masterItem = allMasterItems.find((m: any) => m.id === item.protocolItemId);
        await db.addClientProtocolItem({
          clientProtocolId: input.protocolId,
          protocolItemId: item.protocolItemId,
          quantity: item.quantity,
          isIncluded: false, // Add as excluded — coach can include what they want
          isRecommended: false,
          customNotes: item.customNotes || undefined,
          sortOrder: item.sortOrder,
          fulfillmentSource: (masterItem as any)?.fulfillmentSource || 'coach',
          snapshotName: masterItem?.name || undefined,
        });
        addedCount++;
      }
      
      // Update the protocol's templateId if it was different
      if (input.templateId && input.templateId !== protocol.templateId) {
        await db.updateClientProtocol(input.protocolId, { templateId: input.templateId });
      }
      
      return {
        success: true,
        addedCount,
        totalTemplateItems: templateItems.length,
        existingItems: currentItems.length,
        templateName: template.name,
      };
    }),
  // Compare two protocol versions
  compareVersions: adminProcedure
    .input(z.object({
      version1Id: z.number(),
      version2Id: z.number(),
    }))
    .query(async ({ input }) => {
      const [protocol1, protocol2] = await Promise.all([
        db.getClientProtocolById(input.version1Id),
        db.getClientProtocolById(input.version2Id),
      ]);
      
      if (!protocol1 || !protocol2) {
        throw new Error("One or both protocols not found");
      }
      
      const [items1, items2] = await Promise.all([
        db.getClientProtocolItems(input.version1Id),
        db.getClientProtocolItems(input.version2Id),
      ]);
      
      // Get all protocol items for name lookup
      const allProtocolItems = await db.getAllProtocolItems();
      const allCategories = await db.getAllCategories();
      const itemLookup = new Map(allProtocolItems.map((i: any) => [i.id, i]));
      const categoryLookup = new Map(allCategories.map((c: any) => [c.id, c]));
      
      // Build comparison data
      const allItemIds = new Set([
        ...items1.map((i: any) => i.protocolItemId),
        ...items2.map((i: any) => i.protocolItemId),
      ]);
      
      const comparison = Array.from(allItemIds).map(itemId => {
        const item1 = items1.find((i: any) => i.protocolItemId === itemId);
        const item2 = items2.find((i: any) => i.protocolItemId === itemId);
        const protocolItem = itemLookup.get(itemId);
        const category = protocolItem ? categoryLookup.get(protocolItem.categoryId) : null;
        
        const inV1 = !!item1 && item1.isRecommended;
        const inV2 = !!item2 && item2.isRecommended;
        
        let status: 'added' | 'removed' | 'unchanged' | 'modified' = 'unchanged';
        if (inV1 && !inV2) status = 'removed';
        else if (!inV1 && inV2) status = 'added';
        else if (inV1 && inV2) {
          // Check if quantity changed
          if (item1.quantity !== item2.quantity) status = 'modified';
        }
        
        return {
          protocolItemId: itemId,
          itemName: protocolItem?.name || 'Unknown',
          categoryName: category?.name || 'Unknown',
          status,
          v1: item1 ? {
            quantity: item1.quantity,
            isRecommended: item1.isRecommended,
            customPrice: item1.customPrice,
            customNotes: item1.customNotes,
          } : null,
          v2: item2 ? {
            quantity: item2.quantity,
            isRecommended: item2.isRecommended,
            customPrice: item2.customPrice,
            customNotes: item2.customNotes,
          } : null,
        };
      });
      
      return {
        protocol1: {
          id: protocol1.id,
          version: protocol1.version,
          versionName: protocol1.versionName,
          versionNotes: protocol1.versionNotes,
          status: protocol1.status,
          createdAt: protocol1.createdAt,
        },
        protocol2: {
          id: protocol2.id,
          version: protocol2.version,
          versionName: protocol2.versionName,
          versionNotes: protocol2.versionNotes,
          status: protocol2.status,
          createdAt: protocol2.createdAt,
        },
        comparison: comparison.filter(c => c.status !== 'unchanged' || c.v1?.isRecommended || c.v2?.isRecommended),
        summary: {
          added: comparison.filter(c => c.status === 'added').length,
          removed: comparison.filter(c => c.status === 'removed').length,
          modified: comparison.filter(c => c.status === 'modified').length,
          unchanged: comparison.filter(c => c.status === 'unchanged').length,
        },
      };
    }),
  // Switch active protocol version
  setActiveVersion: adminProcedure
    .input(z.object({
      protocolId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const protocol = await db.getClientProtocolById(input.protocolId);
      if (!protocol || !protocol.clientId) {
        throw new Error("Protocol not found or not linked to a client");
      }
      
      // Deactivate all other versions for this client
      const allVersions = await db.getClientProtocolsByClientId(protocol.clientId);
      for (const version of allVersions) {
        if (version.id !== input.protocolId) {
          await db.updateClientProtocol(version.id, { isActiveVersion: false });
        }
      }
      
      // Activate the selected version
      await db.updateClientProtocol(input.protocolId, { isActiveVersion: true });
      
      return { success: true };
    }),
  // Get version history by protocol ID (for protocols without clientId)
  getVersionHistoryByProtocolId: adminProcedure
    .input(z.object({ protocolId: z.number() }))
    .query(async ({ input }) => {
      const protocol = await db.getClientProtocolById(input.protocolId);
      if (!protocol) {
        return [];
      }
      
      // Strategy: Find all related versions using multiple methods
      const allProtocols = await db.getAllClientProtocols();
      const relatedVersionIds = new Set<number>();
      
      // Method 1: If protocol has clientId, find all protocols with same clientId
      if (protocol.clientId) {
        allProtocols.forEach(p => {
          if (p.clientId === protocol.clientId) {
            relatedVersionIds.add(p.id);
          }
        });
      }
      
      // Method 2: Follow the previousVersionId chain (both directions)
      // Forward: find protocols that have this protocol as their previousVersionId
      allProtocols.forEach(p => {
        if (p.previousVersionId === protocol.id) {
          relatedVersionIds.add(p.id);
        }
      });
      
      // Backward: follow the previousVersionId chain
      let currentProtocol = protocol;
      while (currentProtocol.previousVersionId) {
        relatedVersionIds.add(currentProtocol.previousVersionId);
        const prevProtocol = allProtocols.find(p => p.id === currentProtocol.previousVersionId);
        if (!prevProtocol) break;
        currentProtocol = prevProtocol;
      }
      
      // Method 3: Find all protocols with same email AND same clientName (for legacy protocols)
      if (protocol.clientEmail) {
        allProtocols.forEach(p => {
          if (p.clientEmail === protocol.clientEmail && p.clientName === protocol.clientName) {
            relatedVersionIds.add(p.id);
          }
        });
      }
      
      // Always include the current protocol
      relatedVersionIds.add(protocol.id);
      
      // Get all related protocols and sort by version/id
      const relatedProtocols = allProtocols
        .filter(p => relatedVersionIds.has(p.id))
        .sort((a, b) => {
          // Sort by version number first, then by id
          if (a.version !== b.version) return b.version - a.version;
          return b.id - a.id;
        });
      
      return relatedProtocols;
    }),
  // Rollback to a previous protocol version
  rollbackToVersion: adminProcedure
    .input(z.object({
      sourceVersionId: z.number(),
      targetVersionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sourceProtocol = await db.getClientProtocolById(input.sourceVersionId);
      const targetProtocol = await db.getClientProtocolById(input.targetVersionId);
      
      if (!sourceProtocol || !targetProtocol) {
        throw new Error("Protocol version not found");
      }
      
      // Create a new version based on the target (older) version
      const newProtocolId = await db.createNewProtocolVersion(
        sourceProtocol.clientId || 0,
        {
          versionName: `Rollback to ${targetProtocol.versionName || 'Previous Version'}`,
          versionNotes: `Rolled back from version ${sourceProtocol.versionName || sourceProtocol.id}`,
          templateId: undefined,
        }
      );
      
      // Copy items from the target (older) version
      const targetItems = await db.getClientProtocolItems(input.targetVersionId);
      const allMasterItemsForSnapshot = await db.getAllProtocolItems();
      for (const item of targetItems) {
        const masterItem = allMasterItemsForSnapshot.find((m: any) => m.id === item.protocolItemId);
        await db.addClientProtocolItem({
          clientProtocolId: newProtocolId,
          protocolItemId: item.protocolItemId,
          quantity: item.quantity,
          isIncluded: item.isIncluded,
          isRecommended: item.isRecommended,
          customSchedule: item.customSchedule || undefined,
          customDuration: item.customDuration || undefined,
          customPrice: item.customPrice || undefined,
          customNotes: item.customNotes || undefined,
          customCategoryName: item.customCategoryName || undefined,
          sortOrder: item.sortOrder,
          snapshotName: (item as any).snapshotName || masterItem?.name || undefined,
        });
      }
      
      // Copy other protocol details
      await db.updateClientProtocol(newProtocolId, {
        clientName: sourceProtocol.clientName,
        clientEmail: sourceProtocol.clientEmail,
        clientPhone: sourceProtocol.clientPhone,
        durationMonths: targetProtocol.durationMonths,
        discountPercent: targetProtocol.discountPercent,
        customRequirements: targetProtocol.customRequirements,
        clientId: sourceProtocol.clientId,
      });
      
      // Log the rollback action
      await logAuditEvent({
        userId: ctx.user?.id,
        userEmail: ctx.user?.email || 'unknown',
        userRole: ctx.user?.role || 'unknown',
        action: 'protocol_rollback' as AuditAction,
        resourceType: 'client_protocol',
        resourceId: newProtocolId.toString(),
        resourceName: sourceProtocol.clientName,
        details: {
          sourceVersionId: input.sourceVersionId,
          targetVersionId: input.targetVersionId,
          newVersionId: newProtocolId,
        },
      });
      
      return { success: true, newProtocolId };
    }),
  getByToken: publicProcedure
    .input(z.object({ token: z.string(), isCoachPreview: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      const protocol = await db.getClientProtocolByToken(input.token);
      
      // Server-side admin detection as a fallback safeguard
      // Even if the frontend sends isCoachPreview: false (e.g., due to auth race condition),
      // we check the session to detect if the request is from a staff member
      let isStaffPreview = input.isCoachPreview || false;
      if (!isStaffPreview && (ctx as any).user) {
        const staffRoles = ['admin', 'manager', 'viewer', 'finance'];
        if (staffRoles.includes((ctx as any).user.role)) {
          isStaffPreview = true;
        }
      }
      
      // Block access to hidden protocols (unless coach is previewing)
      if (protocol && (protocol as any).clientVisibility === 'hidden' && !isStaffPreview) {
        return null; // Return null as if protocol doesn't exist
      }
      
      // Track first view and send notification ONLY if not a coach preview
      // This prevents false notifications when coaches preview the protocol
      if (protocol && !protocol.firstViewedAt && !isStaffPreview) {
        await db.updateClientProtocol(protocol.id, {
          firstViewedAt: new Date(),
        });
        
        // Send notifications to users who have notifications enabled
        await db.createNotificationsForEnabledUsers(
          "protocol_viewed",
          `${protocol.clientName} viewed their protocol`,
          `${protocol.clientName} has viewed their protocol for the first time.`,
          protocol.id
        );
      }
      
      // Track all views for engagement metrics (only for client views, not coach previews)
      if (protocol && !isStaffPreview) {
        await db.trackProtocolView(protocol.id);
      }
      
      // Add a flag if this is an archived protocol so the UI can show a banner
      if (protocol && ((protocol as any).clientVisibility === 'archived' || (protocol as any).archivedAt)) {
        return { ...protocol, isArchivedView: true };
      }
      
      return protocol;
    }),
  // Get protocols for the logged-in client's dashboard
  // Respects clientVisibility field and groups by visibility type
  getMyProtocols: protectedProcedure
    .query(async ({ ctx }) => {
      const userEmail = ctx.user?.email;
      if (!userEmail) {
        return { active: [], options: [], archived: [] };
      }
      
      const allProtocols = await db.getClientProtocolsByEmail(userEmail);
      
      // Filter and group by visibility
      const active: typeof allProtocols = [];
      const options: typeof allProtocols = [];
      const archived: typeof allProtocols = [];
      
      for (const protocol of allProtocols) {
        const visibility = (protocol as any).clientVisibility || 'active';
        
        // Skip hidden protocols - client should never see these
        if (visibility === 'hidden') continue;
        
        // Skip deleted protocols
        if ((protocol as any).deletedAt) continue;
        
        if (visibility === 'active') {
          active.push(protocol);
        } else if (visibility === 'option') {
          options.push(protocol);
        } else if (visibility === 'archived' || (protocol as any).archivedAt) {
          archived.push(protocol);
        }
      }
      
      return { active, options, archived };
    }),
  // Client selects their preferred protocol option
  // This marks the selected protocol as 'active' and archives all other options
  selectOption: protectedProcedure
    .input(z.object({ protocolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userEmail = ctx.user?.email;
      if (!userEmail) {
        throw new Error("User email not found");
      }
      
      // Get the selected protocol
      const selectedProtocol = await db.getClientProtocolById(input.protocolId);
      if (!selectedProtocol) {
        throw new Error("Protocol not found");
      }
      
      // Verify the protocol belongs to this user
      if (selectedProtocol.clientEmail?.toLowerCase() !== userEmail.toLowerCase()) {
        throw new Error("You don't have permission to select this protocol");
      }
      
      // Get all option protocols for this user
      const allProtocols = await db.getClientProtocolsByEmail(userEmail);
      const optionProtocols = allProtocols.filter((p: any) => 
        (p.clientVisibility === 'option') && p.id !== input.protocolId
      );
      
      // Archive all other option protocols
      for (const protocol of optionProtocols) {
        await db.updateClientProtocol(protocol.id, {
          clientVisibility: 'archived',
        });
      }
      
      // Set the selected protocol as active
      await db.updateClientProtocol(input.protocolId, {
        clientVisibility: 'active',
      });
      
      // Notify coach that client selected an option
      await db.createNotificationsForEnabledUsers(
        "protocol_option_selected",
        `${selectedProtocol.clientName} selected a protocol option`,
        `${selectedProtocol.clientName} has selected "${selectedProtocol.versionName || 'Version ' + (selectedProtocol.version || 1)}" as their preferred protocol.`,
        input.protocolId
      );
      
      return { success: true };
    }),
  create: adminProcedure
    .input(
      z.object({
        clientName: z.string().min(1),
        clientEmail: z.string().optional(),
        clientPhone: z.string().optional(),
        templateId: z.number().optional(),
        durationMonths: z.number().optional(),
        coachingPackage: z.string().optional(),
        coachingPrice: z.string().optional(),
        discountPercent: z.string().optional(),
        paymentMethod: z.enum(["stripe", "venmo", "cc", "other", "paypal"]).optional(),
        venmoHandle: z.string().optional(),
        customRequirements: z.string().optional(),
        notes: z.string().optional(),
        clientVisibility: z.enum(["hidden", "option", "active", "archived"]).optional(),
        engagementLevel: z.enum(["full_coaching", "self_guided_checkins", "protocol_only"]).optional(),
        activateInProjects: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let { templateId, ...rest } = input;
      
      // Filter out empty strings and undefined values
      const cleanData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined && value !== '' && value !== null) {
          cleanData[key] = value;
        }
      }
      
      // Check for duplicate protocols by email or name
      if (input.clientEmail) {
        const existingProtocols = await db.getClientProtocolsByEmail(input.clientEmail);
        const activeProtocols = existingProtocols.filter((p: any) => 
          p.status !== 'completed' && p.isActiveVersion
        );
        if (activeProtocols.length > 0) {
          // DEDUP GUARD: If a protocol was created in the last 10 minutes for this email,
          // return the existing one instead of creating a duplicate (enrollment race condition)
          const TEN_MINUTES = 10 * 60 * 1000;
          const recentProtocol = activeProtocols.find((p: any) => {
            const createdAt = new Date(p.createdAt).getTime();
            return (Date.now() - createdAt) < TEN_MINUTES;
          });
          if (recentProtocol) {
            console.log(`[ClientProtocol.create] DEDUP: Protocol ${recentProtocol.id} was created ${Math.round((Date.now() - new Date(recentProtocol.createdAt).getTime()) / 1000)}s ago for ${input.clientEmail}. Returning existing instead of creating duplicate.`);
            // Update the existing protocol with any new data (e.g. programId) that the caller wants to set
            const updateData: Record<string, unknown> = {};
            if (cleanData.programId && !recentProtocol.programId) updateData.programId = cleanData.programId;
            if (cleanData.durationMonths && !recentProtocol.durationMonths) updateData.durationMonths = cleanData.durationMonths;
            if (cleanData.contactId && !recentProtocol.contactId) updateData.contactId = cleanData.contactId;
            if (Object.keys(updateData).length > 0) {
              await db.updateClientProtocol(recentProtocol.id, updateData);
            }
            const protocol = await db.getClientProtocolById(recentProtocol.id);
            return protocol;
          }
          
          console.log(`[ClientProtocol.create] Client ${input.clientEmail} already has ${activeProtocols.length} active protocol(s). Creating as new version.`);
          // Auto-set as a new version linked to the existing client
          const latestProtocol = activeProtocols[activeProtocols.length - 1];
          const maxVersion = Math.max(...existingProtocols.map((p: any) => p.version || 1));
          cleanData.version = maxVersion + 1;
          cleanData.clientId = latestProtocol.clientId;
          // Mark previous active versions as inactive
          for (const p of activeProtocols) {
            await db.updateClientProtocol(p.id, { isActiveVersion: false });
          }
        }
      }
      
      // If no template selected, find and use the default template (Master Template)
      if (!templateId) {
        const defaultTemplate = await db.getDefaultTemplate();
        if (defaultTemplate) {
          templateId = defaultTemplate.id;
          console.log(`[ClientProtocol.create] No template selected, using default template: ${defaultTemplate.name} (ID: ${defaultTemplate.id})`);
        }
      }
      
      if (templateId) {
        const template = await db.getTemplateById(templateId);
        const templateItems = await db.getTemplateItems(templateId);
        
        const id = await db.cloneTemplateToClientProtocol(
          templateId,
          input.clientName,
          input.clientEmail
        );
        // Update with additional fields if any
        if (Object.keys(cleanData).length > 0) {
          await db.updateClientProtocol(id, cleanData);
        }
        const protocol = await db.getClientProtocolById(id);
        
        // Record clone history for template clone
        await db.recordCloneHistory({
          sourceProtocolId: null, // Templates don't have a protocol ID
          sourceProtocolName: `Template: ${template?.name || "Unknown"}`,
          targetProtocolId: id,
          targetProtocolName: input.clientName,
          cloneType: "from_template",
          itemsCloned: templateItems.length,
        });
        
        // Send welcome email to new client if email provided
        if (input.clientEmail) {
          try {
            const { sendNewClientWelcomeEmail } = await import('./emailService');
            const appUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
            
            // Check if user already has a password set
            const existingUser = await getUserByEmailForPasswordReset(input.clientEmail);
            let setPasswordUrl: string | undefined;
            
            if (existingUser) {
              // Check if user has a password already (loginMethod starts with 'password:')
              const userDb = await getDb();
              const [userRecord] = await userDb!.select({ loginMethod: users.loginMethod }).from(users).where(eq(users.id, existingUser.id));
              const hasPassword = userRecord?.loginMethod?.startsWith('password:');
              
              if (!hasPassword) {
                // Generate password setup token for new user
                const token = await createPasswordResetToken(existingUser.id, input.clientEmail, 'set_password');
                setPasswordUrl = `${appUrl}/set-password?token=${token}`;
              }
            }
            
            await sendNewClientWelcomeEmail({
              to: input.clientEmail,
              clientName: input.clientName,
              protocolUrl: `${appUrl}/dashboard`,
              launchpadUrl: `${appUrl}/launchpad`,
              setPasswordUrl,
            });
            console.log(`[ClientProtocol.create] Sent welcome email to ${input.clientEmail}${setPasswordUrl ? ' with password setup link' : ''}`);
          } catch (emailError) {
            console.error('[ClientProtocol.create] Failed to send welcome email:', emailError);
          }
        }
        
        // ALWAYS create a client project for new protocols
        // Status is 'on_hold' (inactive) by default, or 'active' if activateInProjects is true
        try {
          const createdProtocol = await db.getClientProtocolById(id);
          if (createdProtocol?.clientId) {
            // Check if client already has a project
            const existingClient = await db.getClientById(createdProtocol.clientId);
            if (!existingClient?.clientProjectId) {
              // Get the Intake lifecycle stage (first stage)
              const lifecycleStages = await db.getAllLifecycleStages();
              const intakeStage = lifecycleStages.find(s => s.name === 'Intake');
              
              // Create a client project - inactive by default, active if requested
              const projectStatus = input.activateInProjects ? 'active' : 'on_hold';
              const projectId = await db.createClientProject({
                clientName: input.clientName,
                clientEmail: input.clientEmail || undefined,
                clientProtocolId: id,
                status: projectStatus,
                currentLifecycleStageId: intakeStage?.id || undefined,
              });
              // Update the client record with the project link
              await db.updateClient(createdProtocol.clientId, {
                isActiveInProjects: input.activateInProjects || false,
                clientProjectId: projectId,
              });
              console.log(`[ClientProtocol.create] Created client project ${projectId} (status: ${projectStatus}) for client ${createdProtocol.clientId}`);
              
              // Auto-apply workflow template based on protocol duration
              try {
                const { autoApplyWorkflowTemplate } = await import('./autoApplyWorkflowTemplate');
                const templateResult = await autoApplyWorkflowTemplate(projectId, id);
                console.log(`[ClientProtocol.create] Workflow template: ${templateResult.reason}`);
              } catch (templateError) {
                console.error('[ClientProtocol.create] Failed to auto-apply workflow template:', templateError);
              }
            } else {
              console.log(`[ClientProtocol.create] Client ${createdProtocol.clientId} already has project ${existingClient.clientProjectId}`);
            }
          }
        } catch (projectError) {
          console.error('[ClientProtocol.create] Failed to create client project:', projectError);
        }
        
        return { id, accessToken: protocol?.accessToken };
      } else {
        // Fallback: create empty protocol if no default template exists
        const accessToken = db.generateAccessToken();
        const id = await db.createClientProtocol({
          clientName: input.clientName,
          ...cleanData,
          accessToken,
          status: "draft",
        });
        
        // Send welcome email to new client if email provided
        if (input.clientEmail) {
          try {
            const { sendNewClientWelcomeEmail } = await import('./emailService');
            const appUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
            
            // Check if user already has a password set
            const existingUser = await getUserByEmailForPasswordReset(input.clientEmail);
            let setPasswordUrl: string | undefined;
            
            if (existingUser) {
              // Check if user has a password already (loginMethod starts with 'password:')
              const userDb = await getDb();
              const [userRecord] = await userDb!.select({ loginMethod: users.loginMethod }).from(users).where(eq(users.id, existingUser.id));
              const hasPassword = userRecord?.loginMethod?.startsWith('password:');
              
              if (!hasPassword) {
                // Generate password setup token for new user
                const token = await createPasswordResetToken(existingUser.id, input.clientEmail, 'set_password');
                setPasswordUrl = `${appUrl}/set-password?token=${token}`;
              }
            }
            
            await sendNewClientWelcomeEmail({
              to: input.clientEmail,
              clientName: input.clientName,
              protocolUrl: `${appUrl}/dashboard`,
              launchpadUrl: `${appUrl}/launchpad`,
              setPasswordUrl,
            });
            console.log(`[ClientProtocol.create] Sent welcome email to ${input.clientEmail}${setPasswordUrl ? ' with password setup link' : ''}`);
          } catch (emailError) {
            console.error('[ClientProtocol.create] Failed to send welcome email:', emailError);
          }
        }
        
        // ALWAYS create a client project for new protocols (fallback path)
        try {
          const createdProtocol = await db.getClientProtocolById(id);
          if (createdProtocol?.clientId) {
            const existingClient = await db.getClientById(createdProtocol.clientId);
            if (!existingClient?.clientProjectId) {
              const lifecycleStages = await db.getAllLifecycleStages();
              const intakeStage = lifecycleStages.find(s => s.name === 'Intake');
              const projectStatus = input.activateInProjects ? 'active' : 'on_hold';
              const projectId = await db.createClientProject({
                clientName: input.clientName,
                clientEmail: input.clientEmail || undefined,
                clientProtocolId: id,
                status: projectStatus,
                currentLifecycleStageId: intakeStage?.id || undefined,
              });
              await db.updateClient(createdProtocol.clientId, {
                isActiveInProjects: input.activateInProjects || false,
                clientProjectId: projectId,
              });
              console.log(`[ClientProtocol.create] Created client project ${projectId} (status: ${projectStatus}) for client ${createdProtocol.clientId}`);
              
              // Auto-apply workflow template based on protocol duration
              try {
                const { autoApplyWorkflowTemplate } = await import('./autoApplyWorkflowTemplate');
                const templateResult = await autoApplyWorkflowTemplate(projectId, id);
                console.log(`[ClientProtocol.create] Workflow template: ${templateResult.reason}`);
              } catch (templateError) {
                console.error('[ClientProtocol.create] Failed to auto-apply workflow template:', templateError);
              }
            }
          }
        } catch (projectError) {
          console.error('[ClientProtocol.create] Failed to create client project:', projectError);
        }
        
        return { id, accessToken };
      }
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        clientName: z.string().min(1).optional(),
        clientEmail: z.string().optional(),
        clientPhone: z.string().optional(),
        durationMonths: z.number().optional(),
        status: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.enum(["draft", "pending_approval", "approved", "active", "completed"]).optional()),
        coachingPackage: z.string().optional(),
        coachingPrice: z.string().optional(),
        discountPercent: z.string().optional(),
        paymentMethod: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.enum(["stripe", "venmo", "cc", "other", "paypal"]).optional()),
        venmoHandle: z.string().optional(),
        customRequirements: z.string().optional(),
        notes: z.string().optional(),
        coachNotes: z.string().optional(),
        // Shipping address fields
        shippingName: z.string().optional(),
        shippingStreet: z.string().optional(),
        shippingCity: z.string().optional(),
        shippingState: z.string().optional(),
        shippingZip: z.string().optional(),
        shippingCountry: z.string().optional(),
        shippingPhone: z.string().optional(),
        paymentReminderOptOut: z.boolean().optional(),
        clientVisibility: z.enum(["hidden", "option", "active", "archived"]).optional(),
        versionName: z.string().optional(),
        engagementLevel: z.enum(["full_coaching", "self_guided_checkins", "protocol_only"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      
      // Filter out undefined values only - empty strings are valid (user clearing a field)
      const cleanData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      }
      
      if (Object.keys(cleanData).length > 0) {
        // Track coach notes history if coachNotes is being updated
        if ('coachNotes' in cleanData) {
          await db.saveNotesWithHistory(
            id,
            'coach_notes',
            cleanData.coachNotes as string,
            ctx.user?.id,
            ctx.user?.name || ctx.user?.email || 'Admin'
          );
          // Remove from cleanData since saveNotesWithHistory already updates it
          delete cleanData.coachNotes;
        }
        
        // Update remaining fields if any
        if (Object.keys(cleanData).length > 0) {
          await db.updateClientProtocol(id, cleanData);
        }
        
        // Propagate name/email/phone changes to master contact and all linked records
        const hasContactInfoChange = input.clientName !== undefined || input.clientEmail !== undefined || input.clientPhone !== undefined;
        if (hasContactInfoChange) {
          try {
            const protocolForContact = protocol || await db.getClientProtocolById(id);
            if (protocolForContact?.contactId) {
              const { propagateContactChanges } = await import('./contacts/propagateContactChanges');
              await propagateContactChanges({
                contactId: protocolForContact.contactId,
                ...(input.clientName !== undefined ? { name: input.clientName } : {}),
                ...(input.clientEmail !== undefined ? { email: input.clientEmail } : {}),
                ...(input.clientPhone !== undefined ? { phone: input.clientPhone } : {}),
              });
              console.log(`[clientProtocol.update] Propagated contact changes for protocol ${id} → contact ${protocolForContact.contactId}`);
            } else {
              console.warn(`[clientProtocol.update] Protocol ${id} has no contactId — changes not propagated`);
            }
          } catch (propError) {
            console.error('[clientProtocol.update] Contact propagation error:', propError);
          }
        }
        
        // AUTO-NOTIFY LISA: When protocol status changes to approved/active, notify Lisa for fulfillment
        if (input.status === 'approved' || input.status === 'active') {
          try {
            const protocolForNotify = protocol || await db.getClientProtocolById(id);
            if (protocolForNotify) {
              const database = await db.getDb();
              if (database) {
                const { teamMembers, teamNotifications } = await import('../drizzle/schema');
                const { eq } = await import('drizzle-orm');
                // Find Lisa (Client Care role)
                const lisaMembers = await database.select().from(teamMembers).where(eq(teamMembers.role, 'Client Care'));
                const lisa = lisaMembers[0];
                if (lisa) {
                  const statusLabel = input.status === 'approved' ? 'approved by client' : 'set to active';
                  await database.insert(teamNotifications).values({
                    teamMemberId: lisa.id,
                    type: 'task_assigned',
                    title: `Protocol Ready: ${protocolForNotify.clientName}`,
                    message: `${protocolForNotify.clientName}'s protocol has been ${statusLabel}. Ready for fulfillment — check packing slip, order supplements, and coordinate shipping.`,
                    clientProjectId: null,
                    projectTaskId: null,
                  });
                  console.log(`[Protocol Update] Lisa notified: protocol ${id} is ${input.status} for ${protocolForNotify.clientName}`);
                  
                  // Also create admin notification
                  await db.createNotificationsForEnabledUsers(
                    'onboarding_automation',
                    `Protocol ${statusLabel}: ${protocolForNotify.clientName}`,
                    `${protocolForNotify.clientName}'s protocol has been ${statusLabel}. Lisa has been notified for fulfillment.`,
                    id
                  );
                }
              }
            }
          } catch (notifyError) {
            console.error('[Protocol Update] Failed to notify Lisa:', notifyError);
          }
        }
      }
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteClientProtocol(input.id);
      return { success: true };
    }),
  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await db.softDeleteClientProtocols(input.ids);
      return { success: true, count: input.ids.length };
    }),
  bulkArchive: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await db.archiveClientProtocols(input.ids);
      return { success: true, count: input.ids.length };
    }),
  bulkRestore: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await db.restoreClientProtocols(input.ids);
      return { success: true, count: input.ids.length };
    }),
  // Reset protocol approval status (unapprove)
  resetApproval: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const protocol = await db.getClientProtocolById(input.id);
      if (!protocol) throw new Error("Protocol not found");
      
      // Reset approval-related fields
      await db.updateClientProtocol(input.id, {
        approvedAt: null,
        status: 'draft',
        paymentStatus: 'pending',
        paymentReceivedAt: null,
        paymentMethod: null,
      });
      
      // Log the action
      await logAuditEvent({
        action: 'protocol_reset',
        resourceType: 'client_protocol',
        resourceId: input.id,
        userId: ctx.user.id,
        userEmail: ctx.user.email || undefined,
        userRole: ctx.user.role,
        description: `Reset approval status for ${protocol.clientName}'s protocol`,
      });
      
      return { success: true };
    }),
  bulkPermanentDelete: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await db.permanentlyDeleteClientProtocols(input.ids);
      return { success: true, count: input.ids.length };
    }),
  trackOnboarding: publicProcedure
    .input(z.object({
      token: z.string(),
      path: z.enum(['ready', 'learn']),
      selection: z.string(),
    }))
    .mutation(async ({ input }) => {
      const protocol = await db.getClientProtocolByToken(input.token);
      if (!protocol) throw new Error("Protocol not found");
      
      // Only track if not already completed
      if (!protocol.onboardingCompletedAt) {
        await db.updateClientProtocol(protocol.id, {
          onboardingCompletedAt: new Date(),
          onboardingPath: input.path,
          onboardingSelection: input.selection,
        });
      }
      
      return { success: true };
    }),
  updateShipping: publicProcedure
    .input(z.object({
      token: z.string(),
      shippingName: z.string().optional(),
      shippingStreet: z.string().optional(),
      shippingCity: z.string().optional(),
      shippingState: z.string().optional(),
      shippingZip: z.string().optional(),
      shippingCountry: z.string().optional(),
      shippingPhone: z.string().optional(),
      clientPhone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const protocol = await db.getClientProtocolByToken(input.token);
      if (!protocol) throw new Error("Protocol not found");
      
      // Check if profile was incomplete before this update
      const wasIncomplete = !protocol.shippingStreet || !protocol.shippingCity || 
                            !protocol.shippingState || !protocol.shippingZip;
      
      const { token, ...shippingData } = input;
      await db.updateClientProtocol(protocol.id, shippingData);
      
      // Sync phone number to user account if client has an email and phone was provided
      const phoneToSync = input.clientPhone || input.shippingPhone;
      if (protocol.clientEmail && phoneToSync) {
        try {
          const user = await db.getUserByEmail(protocol.clientEmail);
          if (user && !user.phone) {
            // Only update if user doesn't already have a phone number
            await db.updateUserPhone(user.id, phoneToSync);
            console.log(`[Profile] Synced phone number to user account for ${protocol.clientEmail}`);
          }
        } catch (syncError) {
          console.error('[Profile] Failed to sync phone to user account:', syncError);
          // Don't fail the main operation if phone sync fails
        }
      }
      
      // Check if profile is now complete after update
      const isNowComplete = !!(input.shippingStreet && input.shippingCity && 
                              input.shippingState && input.shippingZip);
      
      // Sync contact info to any transformation enrollment for this client
      try {
        const clientEmail = protocol.clientEmail;
        if (clientEmail) {
          const { getDb } = await import('./db');
          const database = await getDb();
          const { sql } = await import('drizzle-orm');
          
          // Find enrollments matching this client's email
          const [enrollments] = await database!.execute(
            sql`SELECT id FROM transformation_enrollments WHERE email = ${clientEmail} OR clientName = ${protocol.clientName}`
          );
          const enrollmentRows = enrollments as unknown as any[];
          
          if (enrollmentRows && enrollmentRows.length > 0) {
            for (const enrollment of enrollmentRows) {
              await database!.execute(sql`
                UPDATE transformation_enrollments SET
                  phone = COALESCE(phone, ${phoneToSync || null}),
                  shippingName = COALESCE(shippingName, ${input.shippingName || protocol.clientName || null}),
                  shippingStreet = COALESCE(shippingStreet, ${input.shippingStreet || null}),
                  shippingCity = COALESCE(shippingCity, ${input.shippingCity || null}),
                  shippingState = COALESCE(shippingState, ${input.shippingState || null}),
                  shippingZip = COALESCE(shippingZip, ${input.shippingZip || null}),
                  shippingCountry = COALESCE(shippingCountry, ${input.shippingCountry || 'United States'}),
                  updatedAt = NOW()
                WHERE id = ${enrollment.id}
              `);
              console.log(`[Profile] Synced contact info to enrollment ${enrollment.id} for ${clientEmail}`);
            }
          }
        }
      } catch (syncError) {
        console.error('[Profile] Failed to sync contact info to enrollment:', syncError);
        // Don't fail the main operation
      }
      
      // If profile just became complete, send notification to admins
      if (wasIncomplete && isNowComplete) {
        const { sendProfileCompletionNotification } = await import("./emailService");
        
        // Get admin users to notify
        const adminUsers = await db.getAllUsers();
        const adminsToNotify = adminUsers.filter(
          (u: any) => (u.role === 'admin' || u.role === 'owner') && u.receiveNotifications
        );
        
        // Get a client-friendly protocol/program name (never show internal "Master Template")
        let protocolName = 'Omega Longevity Protocol';
        if (protocol.programId) {
          const program = await db.getProgramById(protocol.programId as number);
          if (program?.name) protocolName = program.name;
        } else if (protocol.durationMonths) {
          protocolName = `${protocol.durationMonths}-Month Omega Protocol`;
        }
        
        // Get base URL for client edit link
        const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
        const clientEditUrl = `${baseUrl}/admin/clients/${protocol.id}`;
        
        // Send email to each admin (use notificationEmail if set)
        for (const admin of adminsToNotify) {
          const adminEmail = (admin as any).notificationEmail || admin.email;
          if (!adminEmail) continue;
          try {
            await sendProfileCompletionNotification(
              adminEmail,
              protocol.clientName ?? 'Unknown Client',
              protocol.clientEmail || 'No email provided',
              protocolName,
              clientEditUrl
            );
          } catch (error) {
            console.error(`Failed to send profile completion notification to ${admin.email}:`, error);
          }
        }
        
        // Create in-app notification
        await db.createNotificationsForEnabledUsers(
          "profile_completed",
          `${protocol.clientName} completed their profile`,
          `${protocol.clientName} has completed their shipping information and is ready for checkout.`,
          protocol.id
        );
      }
      
      return { success: true };
    }),
  approve: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const protocol = await db.getClientProtocolByToken(input.token);
      if (!protocol) throw new Error("Protocol not found");
      await db.updateClientProtocol(protocol.id, {
        status: "approved",
        approvedAt: new Date(),
      });
      
      // Deduct inventory items based on protocol-to-inventory mappings
      // Use a system user ID (1) for the deduction since this is a public endpoint
      const inventoryDeductions = await db.deductInventoryForProtocol(protocol.id, 1);
      
      // Send notifications to users who have notifications enabled (check if notification type is enabled)
      const protocolApprovedSetting = await db.getSiteSetting('notification_protocol_approved');
      if (protocolApprovedSetting !== 'false') {
        await db.createNotificationsForEnabledUsers(
          "protocol_approved",
          `${protocol.clientName} approved their protocol`,
          `The protocol for ${protocol.clientName} has been approved and is ready to transfer to PeptidePro.`,
          protocol.id
        );
      }
      
      // NOTE: Packing slips are now created when PAYMENT IS RECEIVED, not on approval
      // This is handled in the PayPal webhook (server/paypal/webhook.ts) and Venmo payment confirmation
      // Packing slips should only be created when:
      // 1. Total amount > $0 (not "client gets their own" affiliate-only protocols)
      // 2. Payment has been received (paymentStatus = 'paid')
      // See: createPackingSlipOnPayment() function
      
      // Record payment_due event for payment history
      try {
        const { paymentEvents } = await import('../drizzle/schema');
        const database = await db.getDb();
        if (database) {
          // Calculate total amount
          const protocolItems = await db.getClientProtocolItems(protocol.id);
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
          
          await database.insert(paymentEvents).values({
            clientProtocolId: protocol.id,
            eventType: 'payment_due',
            amount: totalAmount > 0 ? totalAmount.toFixed(2) : null,
            notes: `Protocol approved by ${protocol.clientName} - payment is now due`,
            createdAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Failed to record payment_due event:', error);
      }
      
      return { success: true, inventoryDeductions };
    }),
  getItems: publicProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getClientProtocolItems(input.clientProtocolId);
    }),
  addItem: adminProcedure
    .input(
      z.object({
        clientProtocolId: z.number(),
        protocolItemId: z.number(),
        quantity: z.number().optional(),
        isIncluded: z.boolean().optional(),
        isRecommended: z.boolean().optional(),
        customSchedule: z.string().optional(),
        customDuration: z.string().optional(),
        customPrice: z.string().optional(),
        customNotes: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Look up the master item name to snapshot it
      const allItems = await db.getAllProtocolItems();
      const masterItem = allItems.find((m: any) => m.id === input.protocolItemId);
      const id = await db.addClientProtocolItem({
        ...input,
        snapshotName: masterItem?.name || undefined,
      });
      return { id };
    }),
  updateItem: adminProcedure
    .input(
      z.object({
        id: z.number(),
        quantity: z.number().optional(),
        isIncluded: z.boolean().optional(),
        isRecommended: z.boolean().optional(),
        customSchedule: z.string().optional(),
        customDuration: z.string().optional(),
        customPrice: z.string().optional(),
        customNotes: z.string().optional(),
        customPurpose: z.string().optional(),
        sortOrder: z.number().optional(),
        fulfillmentSource: z.enum(['coach', 'client']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateClientProtocolItem(id, data);
      return { success: true };
    }),
  removeItem: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.removeClientProtocolItem(input.id);
      return { success: true };
    }),
  getRequirements: publicProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getClientProtocolRequirements(input.clientProtocolId);
    }),
  sendEmail: adminProcedure
    .input(z.object({ id: z.number(), email: z.string().email().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { sendProtocolEmail } = await import("./emailService");
      
      // Get protocol data
      const protocol = await db.getClientProtocolById(input.id);
      if (!protocol) throw new Error("Protocol not found");
      
      const recipientEmail = input.email || protocol.clientEmail;
      if (!recipientEmail) throw new Error("No email address provided");
      
      // Get all related data
      const protocolItems = await db.getClientProtocolItems(input.id);
      const allItems = await db.getAllProtocolItems();
      const categories = await db.getAllCategories();
      const requirements = await db.getClientProtocolRequirements(input.id);
      
      // Get program info if applicable
      let programInfo: { program?: { name: string }; currentPhase?: { name: string; description: string | null; goals: string | null } } | null = null;
      if (protocol.programId) {
        const program = await db.getProgramById(protocol.programId);
        const currentPhase = protocol.currentPhaseId ? await db.getPhaseById(protocol.currentPhaseId) : null;
        if (program) {
          programInfo = {
            program: { name: program.name },
            currentPhase: currentPhase ? {
              name: currentPhase.name,
              description: currentPhase.description,
              goals: currentPhase.goals,
            } : undefined,
          };
        }
      }
      
      // Get template's hidePricing setting
      let hidePricing = false;
      if (protocol.templateId) {
        const template = await db.getTemplateById(protocol.templateId);
        hidePricing = template?.hidePricing ?? false;
      }
      
      // Get protocol sections (Periodization, Training Split, Program Guide)
      const protocolSections = await db.getProtocolSections(input.id);
      
      // Build protocol URL - use request origin for correct domain
      const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const protocolUrl = `${baseUrl}/protocol/${protocol.accessToken}`;
      
      const result = await sendProtocolEmail({
        to: recipientEmail,
        clientName: protocol.clientName,
        protocol: { ...protocol, hidePricing },
        protocolItems,
        allItems,
        categories,
        requirements: requirements.map(r => ({ id: r.id, text: r.customText || "" })),
        programInfo,
        protocolUrl,
        protocolSections: protocolSections.map(s => ({
          sectionType: s.sectionType,
          content: s.content,
          isEnabled: s.isEnabled,
        })),
      });
      
      return result;
    }),
  sendLink: adminProcedure
    .input(z.object({ id: z.number(), email: z.string().email().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { sendProtocolLinkWithTracking } = await import("./emailService");
      
      // Get protocol data
      let protocol = await db.getClientProtocolById(input.id);
      if (!protocol) throw new Error("Protocol not found");
      
      // SAFEGUARD: If this protocol has a newer active version, auto-redirect to it
      // This prevents sending stale links when admin resends from an old protocol
      if (!protocol.isActiveVersion && protocol.clientEmail) {
        const database = await db.getDb();
        if (database) {
          const { clientProtocols } = await import("../drizzle/schema");
          const { and: andOp, eq: eqOp, isNull: isNullOp, sql: sqlOp } = await import("drizzle-orm");
          const activeVersions = await database.select().from(clientProtocols).where(
            andOp(
              sqlOp`LOWER(${clientProtocols.clientEmail}) = LOWER(${protocol.clientEmail})`,
              eqOp(clientProtocols.isActiveVersion, true),
              isNullOp(clientProtocols.deletedAt)
            )
          ).limit(1);
          if (activeVersions.length > 0) {
            console.log(`[sendLink] Auto-redirecting from old protocol ${protocol.id} to active version ${activeVersions[0].id} for ${protocol.clientEmail}`);
            protocol = activeVersions[0];
          }
        }
      }
      
      const recipientEmail = input.email || protocol.clientEmail;
      if (!recipientEmail) throw new Error("No email address provided");
      
      // Get program name if applicable
      let programName: string | undefined;
      if (protocol.programId) {
        const program = await db.getProgramById(protocol.programId);
        programName = program?.name;
      }
      
      // Build protocol URL - use request origin for correct domain
      const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const protocolUrl = `${baseUrl}/protocol/${protocol.accessToken}`;
      
      // Record email sent event and get tracking token
      const { trackingToken } = await db.recordEmailEvent({
        clientProtocolId: protocol.id,
        eventType: 'sent',
        emailType: 'protocol_link',
        recipientEmail,
      });
      
      // Build tracking pixel URL
      const trackingPixelUrl = `${baseUrl}/api/track/${trackingToken}`;
      
      const result = await sendProtocolLinkWithTracking({
        to: recipientEmail,
        clientName: protocol.clientName,
        protocolUrl,
        programName,
        trackingPixelUrl,
      });
      
      // Update protocol status to pending_approval if it was draft, and set sentAt
      if (protocol.status === 'draft') {
        await db.updateClientProtocol(protocol.id, { status: 'pending_approval', sentAt: new Date() });
      } else {
        // Just update sentAt for resends
        await db.updateClientProtocol(protocol.id, { sentAt: new Date() });
      }
      
      return result;
    }),
  sendPaymentLink: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { sendPaymentReminderEmail } = await import("./emailService");
      
      // Get protocol data
      let protocol = await db.getClientProtocolById(input.id);
      if (!protocol) throw new Error("Protocol not found");
      if (!protocol.clientEmail) throw new Error("No email address on file");
      
      // SAFEGUARD: If this protocol has a newer active version, auto-redirect to it
      // This prevents sending payment links for old/superseded protocols
      if (!protocol.isActiveVersion) {
        const database = await db.getDb();
        if (database) {
          const { clientProtocols } = await import("../drizzle/schema");
          const { and: andOp, eq: eqOp, isNull: isNullOp, sql: sqlOp } = await import("drizzle-orm");
          const activeVersions = await database.select().from(clientProtocols).where(
            andOp(
              sqlOp`LOWER(${clientProtocols.clientEmail}) = LOWER(${protocol.clientEmail!})`,
              eqOp(clientProtocols.isActiveVersion, true),
              isNullOp(clientProtocols.deletedAt)
            )
          ).limit(1);
          if (activeVersions.length > 0) {
            console.log(`[sendPaymentLink] Auto-redirecting from old protocol ${protocol.id} to active version ${activeVersions[0].id} for ${protocol.clientEmail}`);
            protocol = activeVersions[0];
          }
        }
      }
      
      // Build URLs
      const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const paymentLink = `${baseUrl}/protocol/${protocol.accessToken}`;
      const paymentPortalLink = `${baseUrl}/payment-portal/${protocol.accessToken}`;
      
      // Get total amount due
      const items = await db.getClientProtocolItems(protocol.id);
      const totalAmount = items
        .filter((item: any) => item.isIncluded)
        .reduce((sum: number, item: any) => {
          const price = parseFloat(item.customPrice || item.price || '0');
          return sum + (price * (item.quantity || 1));
        }, 0);
      
      // Send payment reminder email
      const result = await sendPaymentReminderEmail({
        to: protocol.clientEmail!,
        clientName: protocol.clientName,
        totalAmount,
        paymentLink,
        paymentPortalLink,
        supportEmail: "omega@omegalongevity.com",
      });
      
      // Log notification
      const { clientNotificationHistory } = await import("../drizzle/schema");
      const database = await db.getDb();
      if (database) {
        await database.insert(clientNotificationHistory).values({
          clientProtocolId: protocol.id,
          category: 'payment' as const,
          notificationType: 'payment_reminder',
          recipientEmail: protocol.clientEmail!,
          recipientName: protocol.clientName,
          subject: `Complete Your Payment - ${protocol.clientName}`,
          previewText: `Payment link: ${paymentLink}`,
          status: result.success ? 'sent' : 'failed',
          sentAt: new Date(),
          triggeredBy: 'admin',
          triggeredByUserId: ctx.user.id,
        });
      }
      
      return result;
    }),
  bulkSendLink: adminProcedure
    .input(z.object({ protocolIds: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const { sendProtocolLinkWithTracking } = await import("./emailService");
      const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      
      let sent = 0;
      let skipped = 0;
      const errors: string[] = [];
      
      for (const id of input.protocolIds) {
        try {
          const protocol = await db.getClientProtocolById(id);
          if (!protocol || !protocol.clientEmail) {
            skipped++;
            continue;
          }
          
          // Get program name if applicable
          let programName: string | undefined;
          if (protocol.programId) {
            const program = await db.getProgramById(protocol.programId);
            programName = program?.name;
          }
          
          const protocolUrl = `${baseUrl}/protocol/${protocol.accessToken}`;
          
          // Record email sent event and get tracking token
          const { trackingToken } = await db.recordEmailEvent({
            clientProtocolId: protocol.id,
            eventType: 'sent',
            emailType: 'protocol_link',
            recipientEmail: protocol.clientEmail,
          });
          
          const trackingPixelUrl = `${baseUrl}/api/track/${trackingToken}`;
          
          await sendProtocolLinkWithTracking({
            to: protocol.clientEmail,
            clientName: protocol.clientName,
            protocolUrl,
            programName,
            trackingPixelUrl,
          });
          
          // Log notification
          const { clientNotificationHistory } = await import("../drizzle/schema");
          const database = await db.getDb();
          if (database) {
            await database.insert(clientNotificationHistory).values({
              clientProtocolId: protocol.id,
              recipientEmail: protocol.clientEmail,
              recipientName: protocol.clientName,
              notificationType: 'protocol_link',
              category: 'protocol',
              subject: `Your Protocol is Ready - ${programName || 'Custom Protocol'}`,
              status: 'sent',
              sentAt: new Date(),
            });
          }
          
          // Update protocol status and sentAt
          if (protocol.status === 'draft') {
            await db.updateClientProtocol(protocol.id, { status: 'pending_approval', sentAt: new Date() });
          } else {
            await db.updateClientProtocol(protocol.id, { sentAt: new Date() });
          }
          
          sent++;
        } catch (error: any) {
          errors.push(`Protocol ${id}: ${error.message}`);
        }
      }
      
      return { sent, skipped, errors };
    }),
  bulkSendInvite: adminProcedure
    .input(z.object({ 
      protocolIds: z.array(z.number()),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { sendAccountInviteEmail } = await import("./emailService");
      const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const signupUrl = `${baseUrl}/launchpad`;
      
      let sent = 0;
      let skipped = 0;
      let alreadyLinked = 0;
      const errors: string[] = [];
      
      for (const id of input.protocolIds) {
        try {
          const protocol = await db.getClientProtocolById(id);
          if (!protocol || !protocol.clientEmail) {
            skipped++;
            continue;
          }
          
          // Check if user already has an account
          const existingUser = await db.getUserByEmail(protocol.clientEmail);
          if (existingUser) {
            alreadyLinked++;
            continue;
          }
          
          const protocolUrl = `${baseUrl}/protocol/${protocol.accessToken}`;
          
          await sendAccountInviteEmail({
            to: protocol.clientEmail,
            clientName: protocol.clientName,
            signupUrl,
            protocolUrl,
            customMessage: input.customMessage,
          });
          
          // Log notification
          const { clientNotificationHistory } = await import("../drizzle/schema");
          const database = await db.getDb();
          if (database) {
            await database.insert(clientNotificationHistory).values({
              clientProtocolId: protocol.id,
              recipientEmail: protocol.clientEmail,
              recipientName: protocol.clientName,
              notificationType: 'account_invite',
              category: 'welcome',
              subject: 'Create Your Account - Omega Longevity',
              status: 'sent',
              sentAt: new Date(),
            });
          }
          
          // Track invite sent timestamp
          await db.updateClientProtocol(id, { inviteSentAt: new Date() });
          
          sent++;
        } catch (error: any) {
          errors.push(`Protocol ${id}: ${error.message}`);
        }
      }
      
      return { sent, skipped, alreadyLinked, errors };
    }),
  // Resend welcome email to a user who already has an account
  resendWelcomeEmail: adminProcedure
    .input(z.object({ 
      protocolId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { sendWelcomeEmail } = await import("./emailService");
      const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      
      const protocol = await db.getClientProtocolById(input.protocolId);
      if (!protocol) {
        throw new Error("Protocol not found");
      }
      if (!protocol.clientEmail) {
        throw new Error("Client has no email address");
      }
      
      // Check if user has an account
      const user = await db.getUserByEmail(protocol.clientEmail);
      if (!user) {
        throw new Error("User does not have an account yet. Use 'Send Invite' instead.");
      }
      
      const protocolUrl = `${baseUrl}/protocol/${protocol.accessToken}`;
      const dashboardUrl = `${baseUrl}/dashboard`;
      const launchpadUrl = `${baseUrl}/launchpad`;
      
      await sendWelcomeEmail({
        to: protocol.clientEmail,
        userName: protocol.clientName || user.name || 'there',
        dashboardUrl,
        protocolUrl,
        launchpadUrl,
      });
      
      // Log notification
      const { clientNotificationHistory } = await import("../drizzle/schema");
      const database = await db.getDb();
      if (database) {
        await database.insert(clientNotificationHistory).values({
          clientProtocolId: protocol.id,
          recipientEmail: protocol.clientEmail,
          recipientName: protocol.clientName,
          notificationType: 'welcome_email_resent',
          category: 'welcome',
          subject: 'Welcome to Omega Longevity',
          status: 'sent',
          sentAt: new Date(),
        });
      }
      
      return { success: true, message: `Welcome email sent to ${protocol.clientEmail}` };
    }),
  clone: adminProcedure
    .input(
      z.object({
        sourceId: z.number(),
        clientName: z.string().min(1),
        clientEmail: z.string().email().optional(),
        alsoCreateClientProject: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const sourceProtocol = await db.getClientProtocolById(input.sourceId);
      const sourceItems = await db.getClientProtocolItems(input.sourceId);
      
      const newProtocolId = await db.cloneClientProtocol(
        input.sourceId,
        input.clientName,
        input.clientEmail
      );
      const newProtocol = await db.getClientProtocolById(newProtocolId);
      
      // Record clone history
      await db.recordCloneHistory({
        sourceProtocolId: input.sourceId,
        sourceProtocolName: sourceProtocol?.clientName || "Unknown",
        targetProtocolId: newProtocolId,
        targetProtocolName: input.clientName,
        cloneType: "new_client",
        itemsCloned: sourceItems.length,
      });
      
      // Also create a Client Project if requested
      if (input.alsoCreateClientProject) {
        // Get the Intake lifecycle stage (first stage)
        const lifecycleStages = await db.getAllLifecycleStages();
        const intakeStage = lifecycleStages.find(s => s.name === 'Intake');
        
        const cloneProjectId = await db.createClientProject({
          clientName: input.clientName,
          clientEmail: input.clientEmail || null,
          clientProtocolId: newProtocolId,
          status: "active",
          currentLifecycleStageId: intakeStage?.id || undefined,
        });
        
        // Auto-apply workflow template based on protocol duration
        try {
          const { autoApplyWorkflowTemplate } = await import('./autoApplyWorkflowTemplate');
          const templateResult = await autoApplyWorkflowTemplate(cloneProjectId, newProtocolId);
          console.log(`[ClientProtocol.clone] Workflow template: ${templateResult.reason}`);
        } catch (templateError) {
          console.error('[ClientProtocol.clone] Failed to auto-apply workflow template:', templateError);
        }
      }
      
      return { id: newProtocolId, accessToken: newProtocol?.accessToken };
    }),
  cloneToExisting: adminProcedure
    .input(
      z.object({
        sourceId: z.number(),
        targetId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const sourceProtocol = await db.getClientProtocolById(input.sourceId);
      const targetProtocolBefore = await db.getClientProtocolById(input.targetId);
      const sourceItems = await db.getClientProtocolItems(input.sourceId);
      
      const targetId = await db.cloneToExistingClient(
        input.sourceId,
        input.targetId
      );
      const targetProtocol = await db.getClientProtocolById(targetId);
      
      // Record clone history
      await db.recordCloneHistory({
        sourceProtocolId: input.sourceId,
        sourceProtocolName: sourceProtocol?.clientName || "Unknown",
        targetProtocolId: targetId,
        targetProtocolName: targetProtocolBefore?.clientName || "Unknown",
        cloneType: "existing_client",
        itemsCloned: sourceItems.length,
      });
      
      return { id: targetId, accessToken: targetProtocol?.accessToken };
    }),
  bulkClone: adminProcedure
    .input(
      z.object({
        sourceId: z.number(),
        clients: z.array(z.object({
          name: z.string().min(1),
          email: z.string().email().optional(),
        })),
        alsoCreateClientProject: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const sourceProtocol = await db.getClientProtocolById(input.sourceId);
      const sourceItems = await db.getClientProtocolItems(input.sourceId);
      
      const newProtocolIds = await db.bulkCloneClientProtocol(
        input.sourceId,
        input.clients
      );
      
      // Get the Intake lifecycle stage (first stage) for project creation
      const lifecycleStages = await db.getAllLifecycleStages();
      const intakeStage = lifecycleStages.find(s => s.name === 'Intake');
      
      // Record clone history for each new protocol and optionally create Client Projects
      for (let i = 0; i < newProtocolIds.length; i++) {
        await db.recordCloneHistory({
          sourceProtocolId: input.sourceId,
          sourceProtocolName: sourceProtocol?.clientName || "Unknown",
          targetProtocolId: newProtocolIds[i],
          targetProtocolName: input.clients[i].name,
          cloneType: "bulk",
          itemsCloned: sourceItems.length,
        });
        
        // Also create a Client Project if requested with Intake stage
        if (input.alsoCreateClientProject) {
          const bulkProjectId = await db.createClientProject({
            clientName: input.clients[i].name,
            clientEmail: input.clients[i].email || null,
            clientProtocolId: newProtocolIds[i],
            status: "active",
            currentLifecycleStageId: intakeStage?.id || undefined,
          });
          
          // Auto-apply workflow template based on protocol duration
          try {
            const { autoApplyWorkflowTemplate } = await import('./autoApplyWorkflowTemplate');
            await autoApplyWorkflowTemplate(bulkProjectId, newProtocolIds[i]);
          } catch (templateError) {
            console.error(`[ClientProtocol.bulkClone] Failed to auto-apply workflow template for project ${bulkProjectId}:`, templateError);
          }
        }
      }
      
      return { ids: newProtocolIds, count: newProtocolIds.length };
    }),
  getCloneHistory: adminProcedure
    .input(z.object({ protocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getCloneHistoryForProtocol(input.protocolId);
    }),
  
  // Renew an expiring/expired protocol with fresh dates
  renewProtocol: adminProcedure
    .input(
      z.object({
        protocolId: z.number(),
        durationMonths: z.number().optional(),
        alsoCreateClientProject: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const sourceProtocol = await db.getClientProtocolById(input.protocolId);
      if (!sourceProtocol) {
        throw new Error("Protocol not found");
      }
      
      const newProtocolId = await db.renewClientProtocol(
        input.protocolId,
        input.durationMonths
      );
      const newProtocol = await db.getClientProtocolById(newProtocolId);
      
      // Record clone history as renewal
      const sourceItems = await db.getClientProtocolItems(input.protocolId);
      await db.recordCloneHistory({
        sourceProtocolId: input.protocolId,
        sourceProtocolName: sourceProtocol.clientName || "Unknown",
        targetProtocolId: newProtocolId,
        targetProtocolName: `${sourceProtocol.clientName} (Renewed)`,
        cloneType: "new_client", // Using new_client type for renewal
        itemsCloned: sourceItems.length,
      });
      
      // Also create a Client Project if requested
      if (input.alsoCreateClientProject) {
        const lifecycleStages = await db.getAllLifecycleStages();
        const intakeStage = lifecycleStages.find(s => s.name === 'Intake');
        
        const renewProjectId = await db.createClientProject({
          clientName: sourceProtocol.clientName,
          clientEmail: sourceProtocol.clientEmail || null,
          clientProtocolId: newProtocolId,
          status: "active",
          currentLifecycleStageId: intakeStage?.id || undefined,
        });
        
        // Auto-apply workflow template based on protocol duration
        try {
          const { autoApplyWorkflowTemplate } = await import('./autoApplyWorkflowTemplate');
          const templateResult = await autoApplyWorkflowTemplate(renewProjectId, newProtocolId);
          console.log(`[ClientProtocol.renew] Workflow template: ${templateResult.reason}`);
        } catch (templateError) {
          console.error('[ClientProtocol.renew] Failed to auto-apply workflow template:', templateError);
        }
      }
      
      return {
        id: newProtocolId,
        accessToken: newProtocol?.accessToken,
        clientName: sourceProtocol.clientName,
      };
    }),
  
  // Get client engagement statistics
  getEngagementStats: adminProcedure
    .query(async () => {
      return db.getClientEngagementStats();
    }),
  
  // Get inactive clients (haven't viewed protocol recently)
  getInactiveClients: adminProcedure
    .input(z.object({ daysSinceLastView: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getInactiveClients(input.daysSinceLastView || 14);
    }),
  
  // Update internal notes for a client protocol (with history tracking)
  updateNotes: adminProcedure
    .input(z.object({
      id: z.number(),
      internalNotes: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.saveNotesWithHistory(
        input.id,
        'internal_notes',
        input.internalNotes,
        ctx.user?.id,
        ctx.user?.name || ctx.user?.email || 'Admin'
      );
      return { success: true };
    }),
  
  // Get notes history for a client protocol
  getNotesHistory: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      noteType: z.enum(['internal_notes', 'coach_notes', 'comment']).optional(),
    }))
    .query(async ({ input }) => {
      return db.getNotesHistory(input.clientProtocolId, input.noteType);
    }),
  
  // Update tags for a client protocol
  updateTags: adminProcedure
    .input(z.object({
      id: z.number(),
      tags: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      await db.updateClientProtocol(input.id, { tags: JSON.stringify(input.tags) });
      return { success: true };
    }),
  
  // Update engagement level for a client protocol (admin-only)
  updateEngagementLevel: adminProcedure
    .input(z.object({
      id: z.number(),
      engagementLevel: z.enum(['full_coaching', 'self_guided_checkins', 'protocol_only']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get the current engagement level before updating
      const currentProtocol = await db.getClientProtocolById(input.id);
      const oldLevel = (currentProtocol as any)?.engagementLevel || 'protocol_only';
      
      await db.updateClientProtocol(input.id, { engagementLevel: input.engagementLevel });
      
      // Log the change to history
      try {
        const { engagementLevelHistory } = await import('../drizzle/schema');
        const database = await db.getDb();
        if (database) {
          await database.insert(engagementLevelHistory).values({
            clientProtocolId: input.id,
            oldLevel,
            newLevel: input.engagementLevel,
            changedByUserId: ctx.user?.id || null,
            changedByName: ctx.user?.name || 'System',
          });
        }
      } catch (e) {
        console.log('[updateEngagementLevel] Could not log history:', e);
      }
      
      // Auto-disable check-ins when set to Protocol Only
      if (input.engagementLevel === 'protocol_only') {
        try {
          const { checkinSchedules } = await import('../drizzle/schema');
          const { eq: eqOp } = await import('drizzle-orm');
          const database = await db.getDb();
          if (database) {
            await database
              .update(checkinSchedules)
              .set({ isEnabled: false, isPaused: false, pausedReason: 'Engagement level set to Protocol Only' })
              .where(eqOp(checkinSchedules.clientProtocolId, input.id));
          }
        } catch (e) {
          console.log('[updateEngagementLevel] Could not auto-disable check-ins:', e);
        }
      }
      // Auto-enable check-ins when set to a coaching/check-in tier —
      // but NEVER while the global check-in kill switch is off, otherwise an
      // engagement-level change would silently resurrect disabled schedules.
      if (input.engagementLevel === 'full_coaching' || input.engagementLevel === 'self_guided_checkins') {
        const { areCheckinsGloballyEnabled } = await import('./cron/checkinCron');
        const globallyEnabled = await areCheckinsGloballyEnabled();
        if (!globallyEnabled) {
          console.log(`[updateEngagementLevel] Check-ins globally disabled — skipping auto-enable for protocol ${input.id}.`);
        } else {
        try {
          const { checkinSchedules } = await import('../drizzle/schema');
          const { eq: eqOp } = await import('drizzle-orm');
          const database = await db.getDb();
          if (database) {
            // Check if a schedule exists
            const [existingSchedule] = await database
              .select()
              .from(checkinSchedules)
              .where(eqOp(checkinSchedules.clientProtocolId, input.id));
            
            if (existingSchedule) {
              // Re-enable existing schedule
              await database
                .update(checkinSchedules)
                .set({ isEnabled: true, isPaused: false, pausedReason: null })
                .where(eqOp(checkinSchedules.clientProtocolId, input.id));
            } else {
              // Auto-create a new Thursday 10 AM schedule
              // Get default template
              const { checkinTemplates } = await import('../drizzle/schema');
              const { and: andOp } = await import('drizzle-orm');
              const [defaultTemplate] = await database
                .select()
                .from(checkinTemplates)
                .where(andOp(
                  eqOp(checkinTemplates.isDefault, true),
                  eqOp(checkinTemplates.isActive, true)
                ));
              
              if (defaultTemplate) {
                const now = new Date();
                const dayOfWeek = now.getUTCDay();
                const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
                const nextThursday = new Date(now);
                nextThursday.setUTCDate(now.getUTCDate() + daysUntilThursday);
                nextThursday.setUTCHours(17, 0, 0, 0); // 10 AM Mountain = 17:00 UTC
                
                await database.insert(checkinSchedules).values({
                  clientProtocolId: input.id,
                  templateId: defaultTemplate.id,
                  isEnabled: true,
                  frequency: 'weekly',
                  dayOfWeek: 4,
                  timeOfDay: '10:00',
                  nextScheduledAt: nextThursday,
                });
              }
            }
          }
        } catch (e) {
          console.error('[updateEngagementLevel] FAILED to auto-enable check-ins for protocol', input.id, ':', e);
          // Don't silently swallow — throw so the frontend knows something went wrong
          throw new Error('Engagement level updated but check-ins could not be auto-enabled. Please enable check-ins manually in Check-In Settings.');
        }
        }
      }
      return { success: true };
    }),

  // Get engagement level change history for a client protocol
  getEngagementHistory: adminProcedure
    .input(z.object({ protocolId: z.number() }))
    .query(async ({ input }) => {
      try {
        const { engagementLevelHistory } = await import('../drizzle/schema');
        const { eq: eqOp, desc: descOp } = await import('drizzle-orm');
        const database = await db.getDb();
        if (!database) return [];
        const history = await database
          .select()
          .from(engagementLevelHistory)
          .where(eqOp(engagementLevelHistory.clientProtocolId, input.protocolId))
          .orderBy(descOp(engagementLevelHistory.createdAt))
          .limit(50);
        return history;
      } catch (e) {
        console.log('[getEngagementHistory] Error:', e);
        return [];
      }
    }),

  // Bulk update engagement level for multiple client protocols
  bulkUpdateEngagementLevel: adminProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      engagementLevel: z.enum(['full_coaching', 'self_guided_checkins', 'protocol_only']),
    }))
    .mutation(async ({ input, ctx }) => {
      const { engagementLevelHistory } = await import('../drizzle/schema');
      const { checkinSchedules } = await import('../drizzle/schema');
      const { eq: eqOp, and: andOp } = await import('drizzle-orm');
      const database = await db.getDb();
      let succeeded = 0;
      let failed = 0;
      for (const id of input.ids) {
        try {
          const currentProtocol = await db.getClientProtocolById(id);
          const oldLevel = (currentProtocol as any)?.engagementLevel || 'protocol_only';
          if (oldLevel === input.engagementLevel) {
            succeeded++;
            continue; // Already at target level
          }
          await db.updateClientProtocol(id, { engagementLevel: input.engagementLevel });
          // Log history
          if (database) {
            try {
              await database.insert(engagementLevelHistory).values({
                clientProtocolId: id,
                oldLevel,
                newLevel: input.engagementLevel,
                changedByUserId: ctx.user?.id || null,
                changedByName: ctx.user?.name || 'System (Bulk)',
              });
            } catch (e) { /* ignore history errors */ }
          }
          // Auto-pause check-ins for protocol_only
          if (input.engagementLevel === 'protocol_only' && database) {
            try {
              await database.update(checkinSchedules)
                .set({ isEnabled: false })
                .where(eqOp(checkinSchedules.clientProtocolId, id));
            } catch (e) { /* ignore */ }
          }
          // Auto-resume check-ins for coaching tiers
          if ((input.engagementLevel === 'full_coaching' || input.engagementLevel === 'self_guided_checkins') && database) {
            try {
              await database.update(checkinSchedules)
                .set({ isEnabled: true })
                .where(andOp(
                  eqOp(checkinSchedules.clientProtocolId, id),
                  eqOp(checkinSchedules.isEnabled, false)
                ));
            } catch (e) { /* ignore */ }
          }
          succeeded++;
        } catch (e) {
          console.log(`[bulkUpdateEngagementLevel] Failed for id ${id}:`, e);
          failed++;
        }
      }
      return { succeeded, failed, total: input.ids.length };
    }),

  // Get all unique tags used across all protocols
  getAllTags: adminProcedure.query(async () => {
    return db.getAllClientProtocolTags();
  }),
  
  // Get payment reminder logs for a specific protocol
  getReminderLogs: adminProcedure
    .input(z.object({ protocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getPaymentReminderLogsByProtocol(input.protocolId);
    }),
  
  // Send a manual payment reminder
  sendManualReminder: adminProcedure
    .input(z.object({ 
      protocolId: z.number(),
      urgencyLevel: z.enum(['friendly', 'moderate', 'urgent']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const protocol = await db.getClientProtocolById(input.protocolId);
      if (!protocol) throw new Error("Protocol not found");
      if (!protocol.clientEmail) throw new Error("No email address for this client");
      
      const nodemailer = await import("nodemailer");
      const { generatePaymentReminderHTML, generatePaymentReminderText } = await import("./emailTemplates/paymentReminder");
      
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";
      
      if (!smtpHost || !smtpUser || !smtpPass) {
        throw new Error("SMTP not configured");
      }
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587"),
        secure: smtpPort === "465",
        auth: { user: smtpUser, pass: smtpPass },
      });
      
      // Calculate amount
      const protocolItems = await db.getClientProtocolItems(protocol.id);
      const allItems = await db.getAllProtocolItems();
      let totalAmount = 0;
      for (const item of protocolItems) {
        if (item.isIncluded) {
          const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
          const price = parseFloat(item.customPrice || protocolItem?.price || '0');
          totalAmount += price * (item.quantity || 1);
        }
      }
      
      const urgencyLevel = input.urgencyLevel || 'friendly';
      const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const paymentLink = `${baseUrl}/protocol/${protocol.accessToken}`;
      const paymentPortalLink = `${baseUrl}/dashboard`;
      
      const htmlContent = generatePaymentReminderHTML({
        clientName: protocol.clientName,
        clientEmail: protocol.clientEmail,
        protocolName: "Your Health Protocol",
        amount: `$${totalAmount.toFixed(2)}`,
        currency: "USD",
        daysOverdue: 0,
        paymentLink,
        paymentPortalLink,
        supportEmail: "omega@omegalongevity.com",
      });
      
      const textContent = generatePaymentReminderText({
        clientName: protocol.clientName,
        clientEmail: protocol.clientEmail,
        protocolName: "Your Health Protocol",
        amount: `$${totalAmount.toFixed(2)}`,
        currency: "USD",
        daysOverdue: 0,
        paymentLink,
        paymentPortalLink,
        supportEmail: "omega@omegalongevity.com",
      });
      
      // Get custom subject from settings or use default
      let subject = "Payment Reminder - Your Health Protocol";
      const subjectSetting = await db.getSiteSetting(`reminder_subject_${urgencyLevel}`);
      if (subjectSetting) {
        subject = subjectSetting;
      } else if (urgencyLevel === 'urgent') {
        subject = "⚠️ Final Notice: Payment Required for Your Protocol";
      } else if (urgencyLevel === 'moderate') {
        subject = "Reminder: Payment Pending for Your Protocol";
      } else {
        subject = "Friendly Reminder: Complete Your Protocol Payment";
      }
      
      await transporter.sendMail({
        from: smtpFrom,
        replyTo: "omega@omegalongevity.com",
        to: protocol.clientEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });
      
      // Log the manual reminder
      await db.createPaymentReminderLog({
        protocolId: protocol.id,
        clientName: protocol.clientName,
        clientEmail: protocol.clientEmail,
        reminderType: urgencyLevel,
        reminderDay: 0, // 0 indicates manual
        status: "manual",
      });
      
      // Record reminder_sent event for payment history
      try {
        const { paymentEvents } = await import('../drizzle/schema');
        const database = await db.getDb();
        if (database) {
          await database.insert(paymentEvents).values({
            clientProtocolId: protocol.id,
            eventType: 'reminder_sent',
            amount: totalAmount > 0 ? totalAmount.toFixed(2) : null,
            reminderType: urgencyLevel,
            emailSentTo: protocol.clientEmail,
            performedBy: ctx.user?.id || null,
            notes: `Manual ${urgencyLevel} payment reminder sent to ${protocol.clientEmail}`,
            createdAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Failed to record reminder_sent event:', error);
      }
      
      return { success: true };
    }),
  
  // Sync a client protocol with the Master Template (add missing items)
  syncWithMasterTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const protocol = await db.getClientProtocolById(input.id);
      if (!protocol) throw new Error("Protocol not found");
      
      // Get the default template
      const defaultTemplate = await db.getDefaultTemplate();
      if (!defaultTemplate) throw new Error("No default template found. Please set a template as default.");
      
      // Get existing items in the client protocol
      const existingItems = await db.getClientProtocolItems(input.id);
      const existingItemIds = new Set(existingItems.map((item: any) => item.protocolItemId));
      
      // Get template items
      const templateItems = await db.getTemplateItems(defaultTemplate.id);
      const allMasterItems = await db.getAllProtocolItems();
      
      // Add missing items from the template
      let addedCount = 0;
      for (const templateItem of templateItems) {
        if (!existingItemIds.has(templateItem.protocolItemId)) {
          const masterItemForSnapshot = allMasterItems.find((m: any) => m.id === templateItem.protocolItemId);
          await db.addClientProtocolItem({
            clientProtocolId: input.id,
            protocolItemId: templateItem.protocolItemId,
            quantity: templateItem.quantity || 1,
            isIncluded: false,
            isRecommended: false,
            sortOrder: templateItem.sortOrder,
            snapshotName: masterItemForSnapshot?.name || undefined,
          });
          addedCount++;
        }
      }
      
      // Log the sync action
      await logAuditEvent({
        userId: ctx.user?.id,
        userEmail: ctx.user?.email || 'unknown',
        userRole: ctx.user?.role || 'unknown',
        action: 'protocol_sync' as AuditAction,
        resourceType: 'client_protocol',
        resourceId: input.id.toString(),
        resourceName: protocol.clientName,
        details: {
          templateId: defaultTemplate.id,
          templateName: defaultTemplate.name,
          itemsAdded: addedCount,
        },
      });
      
      return { success: true, addedCount, templateName: defaultTemplate.name };
    }),
});

// ============ REQUIREMENTS ROUTER ============
const requirementsRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllRequirements();
  }),
  create: adminProcedure
    .input(
      z.object({
        text: z.string().min(1),
        isDefault: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.createRequirement(input);
      return { id };
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        text: z.string().min(1).optional(),
        isDefault: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateRequirement(id, data);
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteRequirement(input.id);
      return { success: true };
    }),

  // ── Per-protocol management (used by Program Guide Guidelines tab) ──

  // Public: client portal reads per-protocol guidelines
  listForProtocol: publicProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      // JOIN to get both the base text and any custom override
      const rows = await database.execute(sql`
        SELECT cpr.id, cpr.clientProtocolId, cpr.requirementId,
               cpr.isIncluded, cpr.sortOrder,
               COALESCE(cpr.customText, pr.text) AS text
        FROM client_protocol_requirements cpr
        JOIN protocol_requirements pr ON cpr.requirementId = pr.id
        WHERE cpr.clientProtocolId = ${input.clientProtocolId}
          AND cpr.isIncluded = 1
        ORDER BY cpr.sortOrder ASC, cpr.id ASC
      `);
      return (rows[0] as unknown as any[]) || [];
    }),

  // Admin: add a new guideline to a specific protocol
  addToProtocol: adminProcedure
    .input(z.object({ clientProtocolId: z.number(), text: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      // Create a non-default anchor in the global table, then link it
      const [reqResult] = await database.execute(sql`
        INSERT INTO protocol_requirements (text, isDefault, sortOrder, createdAt)
        VALUES (${input.text}, 0, 0, NOW())
      `);
      const requirementId = (reqResult as any).insertId;
      await database.execute(sql`
        INSERT INTO client_protocol_requirements (clientProtocolId, requirementId, customText, isIncluded, sortOrder)
        VALUES (${input.clientProtocolId}, ${requirementId}, ${input.text}, 1, 0)
      `);
      return { success: true };
    }),

  // Admin: edit guideline text for a specific protocol entry
  updateInProtocol: adminProcedure
    .input(z.object({ id: z.number(), text: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await db.updateClientProtocolRequirement(input.id, { customText: input.text });
      return { success: true };
    }),

  // Admin: remove a guideline from a protocol
  removeFromProtocol: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.removeClientProtocolRequirement(input.id);
      return { success: true };
    }),

  // Admin: populate a protocol's guidelines from the global defaults
  seedFromDefaults: adminProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      // Use the same filter as listForProtocol — only count rows that are
      // actually visible (isIncluded=1 + valid JOIN). Orphaned or excluded
      // rows from protocol creation should not block seeding.
      const [countRows] = await database.execute(sql`
        SELECT COUNT(*) as cnt
        FROM client_protocol_requirements cpr
        JOIN protocol_requirements pr ON cpr.requirementId = pr.id
        WHERE cpr.clientProtocolId = ${input.clientProtocolId}
          AND cpr.isIncluded = 1
      `);
      const visibleCount = Number((countRows as any[])[0]?.cnt ?? 0);
      if (visibleCount > 0) return { seeded: 0, message: "Already has guidelines" };
      const defaults = await db.getDefaultRequirements();
      if (defaults.length === 0) return { seeded: 0, message: "No defaults configured" };
      await db.bulkAddClientProtocolRequirements(
        defaults.map((r: any, i: number) => ({
          clientProtocolId: input.clientProtocolId,
          requirementId: r.id,
          isIncluded: 1,
          sortOrder: i,
        }))
      );
      return { seeded: defaults.length };
    }),
});

// ============ USER MANAGEMENT ROUTER ============
const userRouter = router({
  list: viewerProcedure.query(async () => {
    return db.getAllUsers();
  }),
  updateRole: managerProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "manager", "viewer", "finance"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(input.userId);
      const oldRole = user?.role || "user";
      
      // Manager restrictions: cannot modify admin accounts or promote to admin
      if (ctx.user.role === "manager") {
        if (oldRole === "admin") {
          throw new Error("Managers cannot modify admin accounts");
        }
        if (input.role === "admin") {
          throw new Error("Managers cannot promote users to admin");
        }
        if (oldRole === "manager" && input.userId !== ctx.user.id) {
          throw new Error("Managers cannot modify other manager accounts");
        }
      }
      
      await db.updateUserRole(input.userId, input.role);
      await logRoleChange(
        ctx.user.id,
        ctx.user.email || "",
        ctx.user.role || "admin",
        input.userId,
        oldRole,
        input.role
      );
      return { success: true };
    }),
  updateNotificationPreference: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        receiveNotifications: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateUserNotificationPreference(input.userId, input.receiveNotifications);
      return { success: true };
    }),
  // Update notification email (admin only)
  updateNotificationEmail: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        notificationEmail: z.string().email().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateUserNotificationEmail(input.userId, input.notificationEmail);
      return { success: true };
    }),
  // Update phone number
  updatePhone: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserPhone(ctx.user.id, input.phone);
      return { success: true };
    }),
  // Get enabled notification types for current user
  getEnabledNotificationTypes: protectedProcedure
    .query(async ({ ctx }) => {
      const enabledTypes = await db.getUserEnabledNotificationTypes(ctx.user.id);
      return { enabledTypes, allTypes: db.ALL_NOTIFICATION_TYPES };
    }),
  // Update enabled notification types for current user
  updateEnabledNotificationTypes: protectedProcedure
    .input(z.object({ enabledTypes: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserEnabledNotificationTypes(ctx.user.id, input.enabledTypes);
      return { success: true };
    }),
  // Get enabled email notification types for current user
  getEnabledEmailNotificationTypes: protectedProcedure
    .query(async ({ ctx }) => {
      const enabledTypes = await db.getUserEnabledEmailNotificationTypes(ctx.user.id);
      return { enabledTypes, allTypes: db.EMAIL_NOTIFICATION_TYPES };
    }),
  // Update enabled email notification types for current user
  updateEnabledEmailNotificationTypes: protectedProcedure
    .input(z.object({ enabledTypes: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserEnabledEmailNotificationTypes(ctx.user.id, input.enabledTypes);
      return { success: true };
    }),
  // Get digest settings for current user
  getDigestSettings: protectedProcedure
    .query(async ({ ctx }) => {
      return db.getUserDigestSettings(ctx.user.id);
    }),
  // Update digest settings for current user
  updateDigestSettings: protectedProcedure
    .input(z.object({
      frequency: z.enum(["none", "daily", "weekly"]),
      sendTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserDigestSettings(ctx.user.id, input.frequency, input.sendTime);
      return { success: true };
    }),
  // Get user by email (admin only)
  getByEmail: adminProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      return (await db.getUserByEmail(input.email)) ?? null;
    }),
  // Admin reset password - sends reset link to user's email
  adminResetPassword: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(input.userId);
      if (!user || !user.email) {
        throw new Error("User not found or has no email");
      }
      // Generate a password reset token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const getDb = (await import('./db')).getDb;
      const dbConn = await getDb();
      if (!dbConn) throw new Error('Database not available');
      const { sql: sqlTag } = await import('drizzle-orm');
      await dbConn.execute(sqlTag`INSERT INTO password_reset_tokens (userId, token, expiresAt) VALUES (${user.id}, ${token}, ${expiresAt})`);
      // Send reset email
      const origin = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const resetUrl = `${origin}/set-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: 'Password Reset - Peptide Coach',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>An administrator has requested a password reset for your account. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set New Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't expect this, you can ignore this email.</p>
        </div>`,
      });
      return { success: true, email: user.email };
    }),
  // Check which emails have linked user accounts (for Client list)
  checkLinkedEmails: adminProcedure
    .input(z.object({ emails: z.array(z.string()) }))
    .query(async ({ input }) => {
      const linkedEmails: Record<string, { id: number; name: string | null; lastSignIn: Date | null }> = {};
      for (const email of input.emails) {
        const user = await db.getUserByEmail(email);
        if (user) {
          linkedEmails[email] = { id: user.id, name: user.name, lastSignIn: user.lastSignedIn };
        }
      }
      return linkedEmails;
    }),
});

// ============ NOTIFICATION ROUTER ============
const notificationRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    return db.getNotificationsForUser(ctx.user.id);
  }),
  unreadCount: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return 0;
    return db.getUnreadNotificationCount(ctx.user.id);
  }),
  markAsRead: adminProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      await db.markNotificationAsRead(input.notificationId);
      return { success: true };
    }),
  markAllAsRead: adminProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) return { success: false };
    await db.markAllNotificationsAsRead(ctx.user.id);
    return { success: true };
  }),
});

// ============ PROGRAM ROUTER ============
const programRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllPrograms();
  }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getProgramById(input.id);
    }),
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        totalMonths: z.number().default(12),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      return db.createProgram(input);
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        totalMonths: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateProgram(id, data);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteProgram(input.id);
      return { success: true };
    }),
  // Phase management within programs
  getPhases: publicProcedure
    .input(z.object({ programId: z.number() }))
    .query(async ({ input }) => {
      return db.getPhasesByProgramId(input.programId);
    }),
  createPhase: adminProcedure
    .input(
      z.object({
        programId: z.number(),
        phaseNumber: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        goals: z.string().optional(),
        durationMonths: z.number().default(3),
        templateId: z.number().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      return db.createPhase(input);
    }),
  updatePhase: adminProcedure
    .input(
      z.object({
        id: z.number(),
        phaseNumber: z.number().optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        goals: z.string().optional(),
        durationMonths: z.number().optional(),
        templateId: z.number().nullable().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updatePhase(id, data);
    }),
  deletePhase: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deletePhase(input.id);
      return { success: true };
    }),
  // Client program assignment
  assignClient: adminProcedure
    .input(
      z.object({
        clientProtocolId: z.number(),
        programId: z.number(),
        phaseId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await db.assignClientToProgram(input.clientProtocolId, input.programId, input.phaseId || null);
      return { success: true };
    }),
  advancePhase: adminProcedure
    .input(
      z.object({
        clientProtocolId: z.number(),
        newPhaseId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await db.advanceClientPhase(input.clientProtocolId, input.newPhaseId);
      return { success: true };
    }),
  getClientProgramInfo: publicProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getClientProgramInfo(input.clientProtocolId);
    }),
});

// ============ AFFILIATE TRACKING ROUTER ============
const affiliateRouter = router({
  trackClick: publicProcedure
    .input(
      z.object({
        protocolItemId: z.number(),
        clientProtocolId: z.number().optional(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.trackAffiliateClick(input);
      return { success: true };
    }),
  stats: adminProcedure.query(async () => {
    return db.getAffiliateClickStatsWithItems();
  }),
  byItem: adminProcedure
    .input(z.object({ protocolItemId: z.number() }))
    .query(async ({ input }) => {
      return db.getAffiliateClicksByItem(input.protocolItemId);
    }),
});

// ============ PROTOCOL COMMENTS ROUTER ============
const commentsRouter = router({
  list: publicProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getProtocolComments(input.clientProtocolId);
    }),
  create: publicProcedure
    .input(
      z.object({
        clientProtocolId: z.number(),
        authorType: z.enum(["coach", "client"]),
        authorName: z.string().optional(),
        message: z.string().min(1),
        loomUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const comment = await db.createProtocolComment(input);

      // Convert HTML message to plain text for notifications
      const { htmlToPlainText, htmlToPreview } = await import('./htmlToText');
      const plainMessage = htmlToPlainText(input.message);
      
      // Track comment in notes history
      try {
        await db.createNotesHistoryEntry({
          clientProtocolId: input.clientProtocolId,
          noteType: 'comment',
          content: input.message,
          commentId: comment.id,
          changedByName: input.authorName || (input.authorType === 'coach' ? 'Coach' : 'Client'),
          changeType: 'created',
        });
      } catch (e) {
        console.warn('[Comments] Failed to track comment history:', e);
      }
      
      if (input.authorType === 'coach') {
        try {
          const protocol = await db.getClientProtocolById(input.clientProtocolId);
          // Create in-app notification for client (if they have an account)
          if (protocol && protocol.clientEmail) {
            try {
              const clientUser = await db.getUserByEmail(protocol.clientEmail);
              if (clientUser) {
                await db.createNotification({
                  userId: clientUser.id,
                  type: 'other',
                  title: `New message from your coach`,
                  message: `${input.authorName || 'Your Coach'}: ${htmlToPreview(input.message, 200)}`,
                  clientProtocolId: input.clientProtocolId,
                });
                console.log(`[Comments] In-app notification created for client user ${clientUser.id}`);
              }
            } catch (notifErr) {
              console.warn('[Comments] Failed to create in-app notification for client:', notifErr);
            }
          }
          // Also send email notification to client
          console.log(`[Comments] Email check: protocol=${!!protocol}, clientEmail=${protocol?.clientEmail || 'NONE'}`);
          if (protocol && protocol.clientEmail) {
            console.log(`[Comments] Attempting to send email to ${protocol.clientEmail}`);
            const { sendNewMessageEmailToClient } = await import('./emailService');
            const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
            // Look up client's userId for per-user notification preferences
            let clientUserId: number | undefined;
            try {
              const clientUser = await db.getUserByEmail(protocol.clientEmail);
              if (clientUser) clientUserId = clientUser.id;
            } catch (_e) { /* ignore lookup failure */ }
            const emailResult = await sendNewMessageEmailToClient({
              to: protocol.clientEmail,
              clientName: protocol.clientName || 'Client',
              coachName: input.authorName || 'Your Coach',
              messagePreview: plainMessage,
              protocolUrl: `${baseUrl}/protocol/${protocol.accessToken}`,
              clientUserId,
              clientProtocolId: input.clientProtocolId,
            });
            console.log(`[Comments] Email result for ${protocol.clientEmail}:`, JSON.stringify(emailResult));
          }
        } catch (e) {
          console.warn('[Comments] Failed to send push/email notification to client:', e);
        }
      }
      
      // Send email notification to owner when client comments
      if (input.authorType === 'client') {
        try {
          const protocol = await db.getClientProtocolById(input.clientProtocolId);
          if (protocol) {
            const { notifyOwner } = await import('./_core/notification');
            await notifyOwner({
              title: `New comment from ${protocol.clientName || 'Client'}`,
              content: `${protocol.clientName || 'A client'} commented on their protocol: "${htmlToPreview(input.message, 200)}"`,

            });
            // Also create in-app notification
            await db.createNotificationsForEnabledUsers(
              'client_comment',
              `New Comment from ${protocol.clientName || 'Client'}`,
              `${protocol.clientName || 'A client'} commented on their protocol: "${htmlToPreview(input.message, 100)}"`,

              input.clientProtocolId,
            );
            // Also send email notification to admins
            const { sendNewMessageEmailToAdmins } = await import('./emailService');
            await sendNewMessageEmailToAdmins({
              clientName: protocol.clientName || 'Client',
              clientEmail: protocol.clientEmail || '',
              messagePreview: plainMessage,
              protocolId: input.clientProtocolId,
            });
          }
        } catch (e) {
          console.warn('[Comments] Failed to send notification:', e);
        }
      }
      
      return comment;
    }),
  markRead: publicProcedure
    .input(
      z.object({
        clientProtocolId: z.number(),
        authorType: z.enum(["coach", "client"]),
      })
    )
    .mutation(async ({ input }) => {
      await db.markCommentsAsRead(input.clientProtocolId, input.authorType);
      return { success: true };
    }),
  unreadCount: publicProcedure
    .input(
      z.object({
        clientProtocolId: z.number(),
        forAuthorType: z.enum(["coach", "client"]),
      })
    )
    .query(async ({ input }) => {
      return db.getUnreadCommentCount(input.clientProtocolId, input.forAuthorType);
    }),
});

// ============ COACHING PACKAGES ROUTER ============
const coachingPackagesRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllCoachingPackages();
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getCoachingPackageById(input.id);
    }),
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.string().optional(),
        durationDays: z.number().optional(),
        features: z.string().optional(),
        linkUrl: z.string().optional(),
        isComingSoon: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.createCoachingPackage(input);
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        durationDays: z.number().optional(),
        features: z.string().optional(),
        linkUrl: z.string().optional(),
        isActive: z.boolean().optional(),
        isComingSoon: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateCoachingPackage(id, data);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCoachingPackage(input.id);
      return { success: true };
    }),
});

// ============ HUB LINKS ROUTER ============
const hubLinksRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllHubLinks();
  }),
  byCategory: publicProcedure
    .input(z.object({ category: z.enum(["platform", "course", "coaching", "resource"]) }))
    .query(async ({ input }) => {
      return db.getHubLinksByCategory(input.category);
    }),
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        url: z.string().min(1),
        icon: z.string().optional(),
        category: z.enum(["platform", "course", "coaching", "resource"]).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.createHubLink(input);
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        url: z.string().optional(),
        icon: z.string().optional(),
        category: z.enum(["platform", "course", "coaching", "resource"]).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateHubLink(id, data);
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteHubLink(input.id);
      return { success: true };
    }),
});

// ============ REFERRAL ROUTER REMOVED ============
// (Dead code cleaned up - referral system stubs removed)

/* REMOVED: referralRouter was dead code with 19 TypeScript errors.
   The entire referral system (getMyReferralCode, getMyReferralStats, getMyReferrals,
   validateReferralCode, recordReferral, createReferral, getAllReferrals, markReferralPaid,
   sendReferralInvite, getDefaultEmailTemplate, getLeaderboard, exportPendingPayouts)
   has been removed. The referrals table still exists in the database for historical data.
*/

// ============ LAUNCHPAD ITEMS ROUTER ============
const launchpadRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllLaunchpadItems();
  }),
  byKey: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return db.getLaunchpadItemByKey(input.key);
    }),
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getLaunchpadItemById(input.id);
    }),
  create: adminProcedure
    .input(z.object({
      key: z.string().min(1),
      name: z.string().min(1),
      shortDescription: z.string().optional(),
      longDescription: z.string().optional(),
      linkUrl: z.string().optional(),
      icon: z.string().optional(),
      category: z.enum(['platform', 'course', 'coaching', 'resource']).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createLaunchpadItem(input);
    }),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      key: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      shortDescription: z.string().optional(),
      longDescription: z.string().optional(),
      linkUrl: z.string().optional(),
      icon: z.string().optional(),
      category: z.enum(['platform', 'course', 'coaching', 'resource']).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateLaunchpadItem(id, data);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteLaunchpadItem(input.id);
      return { success: true };
    }),
  // Videos for launchpad items
  getVideos: publicProcedure
    .input(z.object({ launchpadItemId: z.number() }))
    .query(async ({ input }) => {
      return db.getLaunchpadItemVideos(input.launchpadItemId);
    }),
  createVideo: adminProcedure
    .input(z.object({
      launchpadItemId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      videoUrl: z.string().min(1),
      videoType: z.enum(['loom', 'youtube', 'vimeo', 'other']).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createLaunchpadItemVideo(input);
    }),
  updateVideo: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      videoUrl: z.string().min(1).optional(),
      videoType: z.enum(['loom', 'youtube', 'vimeo', 'other']).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateLaunchpadItemVideo(id, data);
      return { success: true };
    }),
  deleteVideo: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteLaunchpadItemVideo(input.id);
      return { success: true };
    }),
});

// ============ INVENTORY ROUTER ============
const inventoryRouter = router({
  // Categories
  listCategories: adminProcedure.query(async () => {
    return db.getAllInventoryCategories();
  }),
  createCategory: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createInventoryCategory(input);
    }),
  updateCategory: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      iconUrl: z.string().optional(),
      accentColor: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateInventoryCategory(id, data);
    }),
  deleteCategory: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteInventoryCategory(input.id);
      return { success: true };
    }),

  // Items
  listItems: adminProcedure.query(async () => {
    return db.getAllInventoryItems();
  }),
  listItemsByCategory: adminProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      return db.getInventoryItemsByCategory(input.categoryId);
    }),
  getItem: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getInventoryItemById(input.id);
    }),
  createItem: adminProcedure
    .input(z.object({
      categoryId: z.number(),
      name: z.string().min(1),
      sku: z.string().optional(),
      quantity: z.number().optional(),
      lowStockThreshold: z.number().optional(),
      price: z.string().optional(),
      notes: z.string().optional(),
      isDiscountable: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createInventoryItem(input);
    }),
  updateItem: adminProcedure
    .input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      name: z.string().min(1).optional(),
      sku: z.string().optional(),
      quantity: z.number().optional(),
      lowStockThreshold: z.number().optional(),
      price: z.string().optional(),
      notes: z.string().optional(),
      isDiscountable: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateInventoryItem(id, data);
    }),
  // Public endpoint for client order form
  publicList: publicProcedure.query(async () => {
    return db.getInventoryWithCategories();
  }),
  deleteItem: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteInventoryItem(input.id);
      return { success: true };
    }),

  // Inventory operations
  getLowStock: adminProcedure.query(async () => {
    return db.getLowStockItems();
  }),
  getStockStatus: adminProcedure.query(async () => {
    return db.getInventoryStockStatus();
  }),
  updateLowStockThreshold: adminProcedure
    .input(z.object({
      itemId: z.number(),
      threshold: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      return db.updateLowStockThreshold(input.itemId, input.threshold);
    }),
  getWithCategories: adminProcedure.query(async () => {
    return db.getInventoryWithCategories();
  }),
  // Returns inventory items enriched with protocol prices (source of truth)
  // Used by Custom Orders to ensure correct pricing
  getWithProtocolPrices: adminProcedure.query(async () => {
    return db.getInventoryWithProtocolPrices();
  }),
  // Send low stock alert emails to admins
  sendLowStockAlerts: adminProcedure
    .mutation(async () => {
      const { generateLowStockAlertEmail } = await import('./emailTemplates/lowStockAlert');
      const { sendEmail } = await import('./emailService');
      
      // Get low stock items
      const lowStockItems = await db.getLowStockItemsForAlert();
      
      if (lowStockItems.length === 0) {
        return { success: true, message: 'No low stock items to report', itemCount: 0 };
      }
      
      // Get all inventory categories for mapping
      const categories = await db.getAllInventoryCategories();
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      
      // Format items with category names
      const itemsWithCategories = lowStockItems.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        categoryName: categoryMap.get(item.categoryId) || 'Uncategorized',
      }));
      
      // Get admin emails
      const adminEmails = await db.getAdminEmails();
      
      if (adminEmails.length === 0) {
        console.log('[LowStock] No admin emails configured');
        return { success: false, message: 'No admin emails configured', itemCount: lowStockItems.length };
      }
      
      // Generate and send email to each admin
      let sentCount = 0;
      for (const email of adminEmails) {
        try {
          const emailData = await generateLowStockAlertEmail({
            items: itemsWithCategories,
            adminName: 'Admin',
          });
          
          await sendEmail({
            to: email,
            subject: emailData.subject,
            html: emailData.html,
          });
          sentCount++;
          console.log(`[LowStock] Alert sent to ${email}`);
        } catch (error) {
          console.error(`[LowStock] Failed to send alert to ${email}:`, error);
        }
      }
      
      return { 
        success: true, 
        message: `Low stock alert sent to ${sentCount} admin(s)`, 
        itemCount: lowStockItems.length,
        emailsSent: sentCount,
      };
    }),
  sell: adminProcedure
    .input(z.object({
      inventoryItemId: z.number(),
      quantity: z.number().min(1),
      notes: z.string().optional(),
      clientProtocolId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return db.sellInventoryItem(
        input.inventoryItemId,
        input.quantity,
        input.notes,
        ctx.user.id,
        input.clientProtocolId
      );
    }),
  restock: adminProcedure
    .input(z.object({
      inventoryItemId: z.number(),
      quantity: z.number().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return db.restockInventoryItem(
        input.inventoryItemId,
        input.quantity,
        input.notes,
        ctx.user.id
      );
    }),
  bulkRestock: adminProcedure
    .input(z.object({
      items: z.array(z.object({
        inventoryItemId: z.number(),
        quantity: z.number().min(0),
        mode: z.enum(['add', 'set']),
      })),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const results: { itemId: number; itemName: string; previousQuantity: number; newQuantity: number; error?: string }[] = [];
      
      for (const item of input.items) {
        try {
          if (item.quantity === 0 && item.mode === 'add') continue; // Skip no-change items
          
          const inventoryItem = await db.getInventoryItemById(item.inventoryItemId);
          if (!inventoryItem) {
            results.push({ itemId: item.inventoryItemId, itemName: 'Unknown', previousQuantity: 0, newQuantity: 0, error: 'Item not found' });
            continue;
          }
          
          let quantityChange: number;
          if (item.mode === 'set') {
            // Set to absolute value: change = target - current
            quantityChange = item.quantity - inventoryItem.quantity;
          } else {
            // Add relative quantity
            quantityChange = item.quantity;
          }
          
          if (quantityChange === 0) {
            results.push({ itemId: item.inventoryItemId, itemName: inventoryItem.name, previousQuantity: inventoryItem.quantity, newQuantity: inventoryItem.quantity });
            continue;
          }
          
          const batchNote = input.notes ? `Bulk restock: ${input.notes}` : 'Bulk restock';
          const type = quantityChange > 0 ? 'restock' : 'adjustment';
          const result = await db.adjustInventory(
            item.inventoryItemId,
            quantityChange,
            type as any,
            batchNote,
            ctx.user.id
          );
          
          results.push({
            itemId: item.inventoryItemId,
            itemName: inventoryItem.name,
            previousQuantity: result.previousQuantity,
            newQuantity: result.newQuantity,
          });
        } catch (err: any) {
          results.push({ itemId: item.inventoryItemId, itemName: 'Unknown', previousQuantity: 0, newQuantity: 0, error: err.message });
        }
      }
      
      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;
      
      return { results, successCount, errorCount, totalProcessed: results.length };
    }),
  adjust: adminProcedure
    .input(z.object({
      inventoryItemId: z.number(),
      quantityChange: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return db.adjustInventory(
        input.inventoryItemId,
        input.quantityChange,
        'adjustment',
        input.notes,
        ctx.user.id
      );
    }),
  getTransactions: adminProcedure
    .input(z.object({ inventoryItemId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getInventoryTransactions(input.inventoryItemId, input.limit);
    }),
  // User favorites
  getFavorites: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserFavorites(ctx.user.id);
  }),
  getFavoriteItems: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserFavoriteItems(ctx.user.id);
  }),
  addFavorite: protectedProcedure
    .input(z.object({ inventoryItemId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return db.addUserFavorite(ctx.user.id, input.inventoryItemId);
    }),
  removeFavorite: protectedProcedure
    .input(z.object({ inventoryItemId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return db.removeUserFavorite(ctx.user.id, input.inventoryItemId);
    }),
  // Protocol-to-Inventory Mapping
  getMappings: adminProcedure.query(async () => {
    return db.getMappingsWithDetails();
  }),
  getMappingsByProtocolItem: adminProcedure
    .input(z.object({ protocolItemId: z.number() }))
    .query(async ({ input }) => {
      return db.getProtocolInventoryMappingsByProtocolItem(input.protocolItemId);
    }),
  getMappingsByInventoryItem: adminProcedure
    .input(z.object({ inventoryItemId: z.number() }))
    .query(async ({ input }) => {
      return db.getProtocolInventoryMappingsByInventoryItem(input.inventoryItemId);
    }),
  createMapping: adminProcedure
    .input(z.object({
      protocolItemId: z.number(),
      inventoryItemId: z.number(),
      quantityPerUnit: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createProtocolInventoryMapping(input);
    }),
  updateMapping: adminProcedure
    .input(z.object({
      id: z.number(),
      quantityPerUnit: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateProtocolInventoryMapping(id, data);
    }),
  deleteMapping: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteProtocolInventoryMapping(input.id);
    }),
  // Sales Report
  getSalesReport: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      period: z.enum(['7d', '30d', '90d', '365d', 'all', 'custom']).optional(),
    }))
    .query(async ({ input }) => {
      return db.getSalesReport(input);
    }),
  // Backfill inventory sale transactions for paid protocols missing inventory deduction
  // One-time fix: Set approvedAt on client_protocols linked to transformation enrollments
  // that have already progressed past initial stages (coaching_paid+)
  backfillTransformationApprovedAt: adminProcedure
    .mutation(async () => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      
      const { sql } = await import('drizzle-orm');
      
      // Find all client_protocols linked to transformation enrollments that have progressed
      // past coaching_paid but don't have approvedAt set
      const result = await database.execute(sql.raw(`
        UPDATE client_protocols cp
        INNER JOIN transformation_enrollments te ON te.clientProtocolId = cp.id
        SET cp.approvedAt = COALESCE(te.coachingFeePaidAt, te.enrolledAt, NOW()),
            cp.status = 'approved'
        WHERE te.clientProtocolId IS NOT NULL
          AND te.clientProtocolId > 0
          AND te.status IN ('coaching_paid', 'intake_complete', 'discovery_scheduled', 'discovery_complete',
            'protocol_preparing', 'protocol_review', 'protocol_paid', 'launched', 'fulfillment',
            'shipped', 'delivered', 'training_scheduled', 'training_complete',
            'active', 'week3_review', 'month2', 'month3_final', 'completed', 'renewed')
          AND cp.approvedAt IS NULL
          AND cp.deletedAt IS NULL
      `));
      
      const affectedRows = (result[0] as any)?.affectedRows || 0;
      
      return {
        message: `Backfill complete: ${affectedRows} client protocols updated with approvedAt`,
        affectedRows,
      };
    }),

  backfillInventorySales: adminProcedure
    .mutation(async () => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      
      const { clientProtocols } = await import('../drizzle/schema');
      const { eq, and, isNull } = await import('drizzle-orm');
      
      // Find paid protocols with NULL inventoryDeductedAt
      const missingProtocols = await database.select({
        id: clientProtocols.id,
        clientName: clientProtocols.clientName,
      })
        .from(clientProtocols)
        .where(and(
          eq(clientProtocols.paymentStatus, 'paid'),
          isNull(clientProtocols.inventoryDeductedAt)
        ));
      
      if (missingProtocols.length === 0) {
        return { message: 'All paid protocols already have inventory deductions', processed: 0, transactionsCreated: 0, details: [] };
      }
      
      let totalTransactions = 0;
      const results: string[] = [];
      
      for (const protocol of missingProtocols) {
        try {
          const deductions = await db.deductInventoryForProtocol(protocol.id, 0);
          const successful = deductions.filter((d: any) => d.success).length;
          totalTransactions += successful;
          results.push(`Protocol #${protocol.id} (${protocol.clientName}): ${successful} items deducted`);
        } catch (error) {
          results.push(`Protocol #${protocol.id} (${protocol.clientName}): ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return {
        message: `Processed ${missingProtocols.length} protocols`,
        processed: missingProtocols.length,
        transactionsCreated: totalTransactions,
        details: results,
      };
    }),
});

// ============ ORDERS ROUTER (Venmo only) ============
// Healthie integration removed - no license available

// Orders router - provides order query functionality without Stripe checkout
const ordersRouter = router({
  // Create Stripe checkout session for store orders
  createStoreCheckoutSession: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.number(),
        name: z.string(),
        price: z.number(), // in cents
        quantity: z.number(),
      })),
      totalCents: z.number(),
      discountAmountCents: z.number().optional(),
      shippingFeeCents: z.number().optional(),
      shippingAddress: z.object({
        name: z.string(),
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zip: z.string(),
        country: z.string(),
        countryCode: z.string(),
        phone: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getStripeSecretKey } = await import('./stripe/stripeConfig');
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(getStripeSecretKey(), { apiVersion: '2024-06-20' as any });
      const origin = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';

      const PROCESSING_FEE_RATE = 0.035; // 3.5% CC processing fee
      const totalDollars = input.totalCents / 100;
      const processingFee = Math.round(totalDollars * PROCESSING_FEE_RATE * 100) / 100;

      // Single neutral line item — item names (compound/peptide names) must
      // never reach Stripe receipts/checkout. See
      // docs/risks/2026-06-23-payment-data-migration-risks.md (R1). Itemized
      // detail is preserved in our own store_order_items records below.
      const itemsSubtotalCents = input.items.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0
      );
      const lineItems: any[] = [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Coaching Program' },
          unit_amount: itemsSubtotalCents, // already in cents
        },
        quantity: 1,
      }];

      // Add discount as negative line item if applicable
      if (input.discountAmountCents && input.discountAmountCents > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Loyalty Discount (10%)',
            },
            unit_amount: -input.discountAmountCents,
          },
          quantity: 1,
        });
      }

      // Add shipping fee
      if (input.shippingFeeCents && input.shippingFeeCents > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Flat Rate Shipping',
            },
            unit_amount: input.shippingFeeCents,
          },
          quantity: 1,
        });
      }

      // Add 3.5% CC processing fee
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Credit Card Processing Fee (3.5%)',
            description: 'Merchant service charge for credit/debit card payment',
          },
          unit_amount: Math.round(processingFee * 100),
        },
        quantity: 1,
      });

      // Create a pending store_order before redirecting to Stripe so the
      // webhook can update it on completion without losing cart data.
      let pendingOrderId: number | null = null;
      try {
        const { createStoreOrder: createOrder, createStoreOrderItem: createItem } = await import('./db');
        const subtotalDollars = (input.totalCents / 100).toFixed(2);
        const discountDollars = ((input.discountAmountCents || 0) / 100).toFixed(2);
        const shippingDollars = ((input.shippingFeeCents || 0) / 100).toFixed(2);
        const grandTotal = (totalDollars + processingFee).toFixed(2);
        const addr = input.shippingAddress;

        pendingOrderId = await createOrder({
          userId: ctx.user!.id,
          paymentMethod: 'stripe',
          subtotal: subtotalDollars,
          discountAmount: discountDollars,
          shippingFee: shippingDollars,
          total: grandTotal,
          status: 'pending',
          payerEmail: ctx.user?.email || '',
          ...(addr ? {
            shippingName: addr.name,
            shippingStreet: addr.street,
            shippingCity: addr.city,
            shippingState: addr.state,
            shippingZip: addr.zip,
            shippingCountry: addr.country,
            shippingPhone: addr.phone || null,
          } : {}),
        }) as number;

        for (const item of input.items) {
          await createItem({
            storeOrderId: pendingOrderId,
            inventoryItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            pricePerUnit: (item.price / 100).toFixed(2),
            isDiscountable: 1,
          });
        }
        console.log(`[Stripe Store] Created pending store order ${pendingOrderId} for user ${ctx.user?.id}`);
      } catch (orderErr: any) {
        console.error(`[Stripe Store] Failed to pre-create store order (non-blocking): ${orderErr.message}`);
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: ctx.user?.email || undefined,
        client_reference_id: ctx.user?.id?.toString() || '',
        line_items: lineItems,
        metadata: {
          user_id: (ctx.user?.id || '').toString(),
          user_email: ctx.user?.email || '',
          order_type: 'store',
          item_count: input.items.length.toString(),
          shipping_address: input.shippingAddress ? JSON.stringify(input.shippingAddress) : '',
          store_order_id: pendingOrderId ? pendingOrderId.toString() : '',
        },
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=store`,
        cancel_url: `${origin}/order?payment=cancelled`,
      });

      console.log(`[Stripe Store] Created checkout session ${session.id} for user ${ctx.user?.id}, total: $${totalDollars + processingFee}`);

      return { checkoutUrl: session.url, sessionId: session.id };
    }),

  // Get order status for a protocol
  getProtocolOrderStatus: publicProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getProtocolOrderByProtocolId(input.clientProtocolId);
    }),
  
  // Get order history by protocol token (public - for client view)
  getOrdersByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const protocol = await db.getClientProtocolByToken(input.token);
      if (!protocol) return [];
      return db.getOrdersByProtocolId(protocol.id);
    }),
  
  // Get all orders with details (admin only)
  getAllOrders: adminProcedure.query(async () => {
    return db.getOrdersWithDetails();
  }),
  
  // Get single order by ID (admin only)
  getOrderById: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      return db.getOrderById(input.orderId);
    }),
});

// ============ HEALTHIE PAYMENT ROUTER - REMOVED (no license available) ============

// ============ STORE WAIVER ROUTER ============
const waiverRouter = router({
  // Use publicProcedure to avoid redirect loop - check auth status gracefully
  check: publicProcedure.query(async ({ ctx }) => {
    // If user is not authenticated, return needsAuth flag instead of throwing error
    if (!ctx.user) {
      console.log("[Waiver Check] User not authenticated, returning needsAuth: true");
      return { 
        hasSignedWaiver: false, 
        waiver: null,
        hasBypass: false,
        bypassedAt: null,
        bypassedBy: null,
        needsAuth: true,
      };
    }
    console.log(`[Waiver Check] User authenticated: ${ctx.user.email}`);
    
    const waiver = await db.getStoreWaiverByUserId(ctx.user.id);
    // Check if user has waiver bypass (signed externally)
    const user = await db.getUserById(ctx.user.id);
    const hasBypass = !!user?.waiverBypassedAt;
    return { 
      hasSignedWaiver: !!waiver || hasBypass, 
      waiver,
      hasBypass,
      bypassedAt: user?.waiverBypassedAt,
      bypassedBy: user?.waiverBypassedBy,
      needsAuth: false,
    };
  }),
  sign: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(1),
      parentGuardianName: z.string().optional(),
      signatureData: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user already has a valid (non-expired) waiver
      const existingWaiver = await db.getStoreWaiverByUserId(ctx.user.id);
      if (existingWaiver) {
        // Check if it's still valid (not expired)
        const isExpired = existingWaiver.expiresAt && new Date(existingWaiver.expiresAt) < new Date();
        if (!isExpired) {
          // Return existing waiver without creating duplicate or sending notification
          console.log(`[Waiver] User ${ctx.user.id} already has valid waiver, skipping duplicate creation`);
          return existingWaiver;
        }
      }
      
      const ipAddress = ctx.req.headers['x-forwarded-for'] as string || ctx.req.socket.remoteAddress || '';
      
      // Get waiver expiration setting
      const expirationSetting = await db.getSiteSetting('waiver_expiration_months');
      const expirationMonths = expirationSetting ? parseInt(expirationSetting, 10) : 12;
      
      // Calculate expiration date
      let expiresAt: Date | null = null;
      if (expirationMonths > 0) {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + expirationMonths);
      }
      
      const waiver = await db.createStoreWaiver({
        userId: ctx.user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        parentGuardianName: input.parentGuardianName || null,
        signatureData: input.signatureData,
        ipAddress: ipAddress.split(',')[0].trim(),
        expiresAt,
      });
      
      // Sync full name and phone to user account if waiver has better data
      const fullName = `${input.firstName} ${input.lastName}`.trim();
      const currentUser = await db.getUserById(ctx.user.id);
      if (currentUser) {
        const needsNameUpdate = fullName.includes(' ') && (!currentUser.name || !currentUser.name.includes(' '));
        const needsPhoneUpdate = input.phone && !currentUser.phone;
        if (needsNameUpdate || needsPhoneUpdate) {
          await db.updateUserProfile(ctx.user.id, {
            ...(needsNameUpdate ? { name: fullName } : {}),
            ...(needsPhoneUpdate ? { phone: input.phone } : {}),
          });
          console.log(`[Waiver] Synced user profile for ${ctx.user.id}:`, { needsNameUpdate, needsPhoneUpdate, fullName });
        }
      }
      
      // Send email notification to omega@omegalongevity.com
      // Skip notification for test data (john@example.com is used in automated tests)
      const isTestData = input.email === 'john@example.com' || input.email.endsWith('@example.com');
      if (!isTestData) {
        try {
          const { notifyOwner } = await import('./_core/notification');
          await notifyOwner({
            title: `New Store Waiver Signed - ${input.firstName} ${input.lastName}`,
            content: `A new store waiver has been signed:\n\nName: ${input.firstName} ${input.lastName}\nEmail: ${input.email}\nPhone: ${input.phone}${input.parentGuardianName ? `\nParent/Guardian: ${input.parentGuardianName}` : ''}\n\nSigned at: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}${expiresAt ? `\nExpires: ${expiresAt.toLocaleDateString('en-US', { timeZone: 'America/Denver' })}` : ''}\n\nThis client now has access to the Omega Store.`,
          });
          // Also create in-app notification
          await db.createNotificationsForEnabledUsers(
            'waiver_signed',
            'New Store Waiver Signed',
            `${input.firstName} ${input.lastName} signed the store waiver. They now have access to the Omega Store.`,
          );
        } catch (error) {
          console.error('Failed to send waiver notification:', error);
        }
      } else {
        console.log(`[Waiver] Skipping notification for test email: ${input.email}`);
      }
      
      return waiver;
    }),
  list: adminProcedure.query(async () => {
    return db.getAllWaiversWithRenewalCount();
  }),
  getRenewalHistory: adminProcedure
    .input(z.object({ waiverId: z.number() }))
    .query(async ({ input }) => {
      return db.getWaiverRenewalHistory(input.waiverId);
    }),
  // Get waiver by renewal token for public renewal page
  getByRenewalToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const waiver = await db.getStoreWaiverByRenewalToken(input.token);
      if (!waiver) return null;
      // Return limited info for security
      return {
        id: waiver.id,
        firstName: waiver.firstName,
        lastName: waiver.lastName,
        email: waiver.email,
        phone: waiver.phone,
        expiresAt: waiver.expiresAt,
      };
    }),
  // Renew waiver with new signature
  renew: publicProcedure
    .input(z.object({
      token: z.string(),
      signatureData: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const waiver = await db.getStoreWaiverByRenewalToken(input.token);
      if (!waiver) throw new Error('Invalid renewal token');
      
      const ipAddress = ctx.req.headers['x-forwarded-for'] as string || ctx.req.socket.remoteAddress || '';
      
      // Get waiver expiration setting
      const expirationSetting = await db.getSiteSetting('waiver_expiration_months');
      const expirationMonths = expirationSetting ? parseInt(expirationSetting, 10) : 12;
      
      // Calculate new expiration date
      let expiresAt: Date | null = null;
      if (expirationMonths > 0) {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + expirationMonths);
      }
      
      await db.renewStoreWaiver(waiver.id, {
        signatureData: input.signatureData,
        agreedAt: new Date(),
        expiresAt,
        renewalReminderSent: false,
        renewalToken: null, // Clear the token after use
        ipAddress: ipAddress.split(',')[0].trim(),
      });
      
      // Send notification
      try {
        const { notifyOwner } = await import('./_core/notification');
        await notifyOwner({
          title: `Store Waiver Renewed - ${waiver.firstName} ${waiver.lastName}`,
          content: `A store waiver has been renewed:\n\nName: ${waiver.firstName} ${waiver.lastName}\nEmail: ${waiver.email}\n\nRenewed at: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}${expiresAt ? `\nNew expiration: ${expiresAt.toLocaleDateString('en-US', { timeZone: 'America/Denver' })}` : ''}`,
        });
      } catch (error) {
        console.error('Failed to send waiver renewal notification:', error);
      }
      
      return { success: true };
    }),
  // Get expiration settings
  getExpirationSettings: adminProcedure.query(async () => {
    const setting = await db.getSiteSetting('waiver_expiration_months');
    return {
      expirationMonths: setting ? parseInt(setting, 10) : 12,
    };
  }),
  // Update expiration settings
  updateExpirationSettings: adminProcedure
    .input(z.object({ expirationMonths: z.number().min(0).max(120) }))
    .mutation(async ({ input }) => {
      await db.setSiteSetting('waiver_expiration_months', input.expirationMonths.toString());
      return { success: true };
    }),
  // Bulk extend waiver expiration
  bulkExtend: adminProcedure
    .input(z.object({ waiverIds: z.array(z.number()), months: z.number().min(1).max(120) }))
    .mutation(async ({ input }) => {
      const waivers = await db.getAllStoreWaivers();
      let updated = 0;
      
      for (const waiverId of input.waiverIds) {
        const waiver = waivers.find(w => w.id === waiverId);
        if (!waiver) continue;
        
        // Calculate new expiration date
        const baseDate = waiver.expiresAt && new Date(waiver.expiresAt) > new Date() 
          ? new Date(waiver.expiresAt) 
          : new Date();
        const newExpiresAt = new Date(baseDate);
        newExpiresAt.setMonth(newExpiresAt.getMonth() + input.months);
        
        await db.updateStoreWaiver(waiverId, { expiresAt: newExpiresAt });
        updated++;
      }
      
      return { updated };
    }),
  // Bulk revoke (delete) waivers
  bulkRevoke: adminProcedure
    .input(z.object({ waiverIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      let deleted = 0;
      for (const waiverId of input.waiverIds) {
        await db.deleteStoreWaiver(waiverId);
        deleted++;
      }
      return { deleted };
    }),
  // Send announcement email to selected waiver holders
  sendAnnouncement: adminProcedure
    .input(z.object({
      waiverIds: z.array(z.number()),
      subject: z.string().min(1, "Subject is required"),
      message: z.string().min(1, "Message is required"),
      scheduledFor: z.string().optional(), // ISO date string for scheduling
    }))
    .mutation(async ({ input, ctx }) => {
      const { sendWaiverAnnouncementEmail } = await import("./emailService");
      
      // If scheduled, save to history with pending status and return
      if (input.scheduledFor) {
        const scheduledDate = new Date(input.scheduledFor);
        await db.createAnnouncementHistory({
          subject: input.subject,
          message: input.message,
          recipientCount: input.waiverIds.length,
          sentBy: ctx.user?.id,
          scheduledFor: scheduledDate,
          status: "scheduled",
          recipientWaiverIds: JSON.stringify(input.waiverIds),
        });
        return { 
          sent: 0, 
          scheduled: input.waiverIds.length, 
          skipped: 0, 
          errors: [],
          scheduledFor: scheduledDate.toISOString(),
        };
      }
      
      let sent = 0;
      let skipped = 0;
      const errors: string[] = [];
      
      // Get all waivers to send to
      const allWaivers = await db.getAllStoreWaivers();
      const selectedWaivers = allWaivers.filter(w => input.waiverIds.includes(w.id));
      
      for (const waiver of selectedWaivers) {
        if (!waiver.email) {
          skipped++;
          continue;
        }
        
        try {
          const recipientName = `${waiver.firstName} ${waiver.lastName}`.trim() || "Valued Customer";
          await sendWaiverAnnouncementEmail({
            to: waiver.email,
            recipientName,
            subject: input.subject,
            message: input.message,
          });
          sent++;
        } catch (error: any) {
          errors.push(`${waiver.email}: ${error.message}`);
        }
      }
      
      // Log announcement to history
      if (sent > 0) {
        await db.createAnnouncementHistory({
          subject: input.subject,
          message: input.message,
          recipientCount: sent,
          sentBy: ctx.user?.id,
          status: "sent",
        });
      }
      
      return { sent, skipped, errors };
    }),
  
  // Cancel a scheduled announcement
  cancelAnnouncement: adminProcedure
    .input(z.object({
      announcementId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const announcement = await db.getAnnouncementHistoryById(input.announcementId);
      
      if (!announcement) {
        throw new Error("Announcement not found");
      }
      
      if (announcement.status !== "scheduled") {
        throw new Error("Only scheduled announcements can be cancelled");
      }
      
      await db.updateAnnouncementStatus(input.announcementId, "cancelled");
      
      return { success: true };
    }),
  
  // Announcement Templates CRUD
  getTemplates: adminProcedure.query(async () => {
    return db.getAnnouncementTemplates();
  }),
  
  createTemplate: adminProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      category: z.enum(["product_updates", "promotions", "reminders", "general"]).default("general"),
      subject: z.string().min(1, "Subject is required"),
      message: z.string().min(1, "Message is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await db.createAnnouncementTemplate({
        name: input.name,
        category: input.category,
        subject: input.subject,
        message: input.message,
        createdBy: ctx.user?.id,
      });
      return { id };
    }),
  
  updateTemplate: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      category: z.enum(["product_updates", "promotions", "reminders", "general"]).optional(),
      subject: z.string().min(1).optional(),
      message: z.string().min(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateAnnouncementTemplate(id, data);
      return { success: true };
    }),
  
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteAnnouncementTemplate(input.id);
      return { success: true };
    }),
  
  // Announcement History
  getHistory: adminProcedure.query(async () => {
    return db.getAnnouncementHistory();
  }),
  
  // Grant waiver bypass for users who signed externally
  grantBypass: adminProcedure
    .input(z.object({
      userEmail: z.string().email(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Find user by email
      const user = await db.getUserByEmail(input.userEmail);
      if (!user) {
        throw new Error(`User with email ${input.userEmail} not found. They must create an account first.`);
      }
      
      // Update user with bypass
      await db.grantWaiverBypass(user.id, ctx.user.id, input.reason || 'Signed waiver externally');
      
      return { success: true, userId: user.id, email: input.userEmail };
    }),
  
  // Revoke waiver bypass
  revokeBypass: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      await db.revokeWaiverBypass(input.userId);
      return { success: true };
    }),
  
  // List users with waiver bypass
  listBypasses: adminProcedure.query(async () => {
    return db.getUsersWithWaiverBypass();
  }),
  
  getHistoryById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getAnnouncementHistoryById(input.id);
    }),
});

// ============ AGE DISCLAIMER ROUTER ============
const ageDisclaimerRouter = router({
  check: publicProcedure
    .input(z.object({ visitorId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Check by user ID first if logged in
      if (ctx.user) {
        const userDisclaimer = await db.getAgeDisclaimerByUserId(ctx.user.id);
        if (userDisclaimer) return { hasAgreed: true };
      }
      // Check by visitor ID
      const visitorDisclaimer = await db.getAgeDisclaimerByVisitorId(input.visitorId);
      return { hasAgreed: !!visitorDisclaimer };
    }),
  agree: publicProcedure
    .input(z.object({ visitorId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ipAddress = ctx.req.headers['x-forwarded-for'] as string || ctx.req.socket.remoteAddress || '';
      return db.createAgeDisclaimer({
        visitorId: input.visitorId,
        userId: ctx.user?.id || null,
        ipAddress: ipAddress.split(',')[0].trim(),
      });
    }),
});

// ============ SITE SETTINGS ROUTER ============
const settingsRouter = router({
  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return db.getSiteSetting(input.key);
    }),
  set: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      await db.setSiteSetting(input.key, input.value);
      return { success: true };
    }),
  list: adminProcedure.query(async () => {
    return db.getAllSiteSettings();
  }),
  sendTestCheckinEmail: adminProcedure
    .input(z.object({ email: z.string().email().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { buildConsolidatedCheckinEmail } = await import('./cron/checkinCron');
      const recipientEmail = input.email || ctx.user?.email;
      if (!recipientEmail) throw new Error('No email address available');
      
      // Load custom settings
      const customSubject = await db.getSiteSetting('checkin_email_subject');
      const customGreeting = await db.getSiteSetting('checkin_email_greeting');
      const customCtaText = await db.getSiteSetting('checkin_email_cta_text');
      const coachName = await db.getSiteSetting('coach_name') || 'Jason';
      
      const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      
      const emailHtml = buildConsolidatedCheckinEmail({
        clientName: ctx.user?.name || 'Test User',
        protocolName: `${ctx.user?.name || 'Test User'}`,
        checkinUrl: `${baseUrl}/checkin/test`,
        dashboardUrl: `${baseUrl}/dashboard`,
        suggestions: [
          '\ud83d\udcf8 Upload a progress photo to track your transformation',
          '\ud83d\udcdd Log your mood, energy, and sleep quality',
        ],
        daysSincePhoto: 3,
        daysSinceNote: null,
        weekNumber: 4,
        coachName,
        customGreeting: customGreeting || undefined,
        customCtaText: customCtaText || undefined,
      });
      
      // Build subject with placeholder replacement
      const subject = (customSubject || '\ud83d\udcca Weekly Progress Check-In - {{protocolName}}')
        .replace(/\{\{clientName\}\}/g, ctx.user?.name || 'Test User')
        .replace(/\{\{protocolName\}\}/g, ctx.user?.name || 'Test User')
        .replace(/\{\{coachName\}\}/g, coachName)
        .replace(/\{\{weekNumber\}\}/g, '4');
      
      await sendEmail({
        to: recipientEmail,
        subject: `[TEST] ${subject}`,
        html: emailHtml,
      });
      
      return { success: true, sentTo: recipientEmail };
    }),
});

// ============ AFFILIATE PARTNERS ROUTER ============
const affiliatePartnersRouter = router({
  list: publicProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return db.getAllAffiliatePartners(input?.activeOnly ?? false);
    }),
  featured: publicProcedure.query(async () => {
    return db.getFeaturedAffiliatePartners();
  }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getAffiliatePartnerById(input.id);
    }),
  trackClick: publicProcedure
    .input(z.object({ partnerId: z.number(), userAgent: z.string().optional() }))
    .mutation(async ({ input }) => {
      return db.trackPartnerClick(input.partnerId, input.userAgent);
    }),
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        url: z.string().url(),
        code: z.string().optional(),
        discountText: z.string().optional(),
        logoUrl: z.string().optional(),
        testimonial: z.string().optional(),
        category: z.enum(["peptides", "supplements", "nootropics", "tools", "health", "other"]).optional(),
        isFeatured: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.createAffiliatePartner(input);
      return { id };
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        url: z.string().url().optional(),
        code: z.string().optional(),
        discountText: z.string().optional(),
        logoUrl: z.string().optional(),
        testimonial: z.string().optional(),
        category: z.enum(["peptides", "supplements", "nootropics", "tools", "health", "other"]).optional(),
        isFeatured: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateAffiliatePartner(id, data);
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteAffiliatePartner(input.id);
      return { success: true };
    }),
});

// ============ COUPON ROUTER ============
const couponRouter = router({
  list: adminProcedure.query(async () => {
    return db.getAllCoupons();
  }),
  active: adminProcedure.query(async () => {
    return db.getActiveCoupons();
  }),
  flagged: adminProcedure.query(async () => {
    return db.getFlaggedCoupons();
  }),
  byId: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getCouponById(input.id);
    }),
  create: adminProcedure
    .input(
      z.object({
        code: z.string().min(3).max(50),
        discountPercent: z.string().refine((val) => {
          const num = parseFloat(val);
          return num > 0 && num <= 35;
        }, { message: "Discount must be between 0 and 35%" }),
        usageType: z.enum(["one_time", "unlimited"]),
        scope: z.enum(["universal", "client_specific"]),
        clientProtocolId: z.number().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
        maxUses: z.number().optional().nullable(),
        notes: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const couponData = {
        ...input,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdBy: ctx.user?.id,
      };
      return db.createCoupon(couponData);
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        code: z.string().min(3).max(50).optional(),
        discountPercent: z.string().refine((val) => {
          const num = parseFloat(val);
          return num > 0 && num <= 35;
        }, { message: "Discount must be between 0 and 35%" }).optional(),
        usageType: z.enum(["one_time", "unlimited"]).optional(),
        scope: z.enum(["universal", "client_specific"]).optional(),
        clientProtocolId: z.number().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
        maxUses: z.number().optional().nullable(),
        isActive: z.boolean().optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.expiresAt !== undefined) {
        updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      }
      return db.updateCoupon(id, updateData);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCoupon(input.id);
      return { success: true };
    }),
  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      for (const id of input.ids) {
        await db.deleteCoupon(id);
      }
      return { success: true, count: input.ids.length };
    }),
  deactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deactivateCoupon(input.id);
      return { success: true };
    }),
  validate: publicProcedure
    .input(
      z.object({
        code: z.string(),
        clientProtocolId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return db.validateCoupon(input.code, input.clientProtocolId);
    }),
  applyCoupon: publicProcedure
    .input(
      z.object({
        couponId: z.number(),
        clientProtocolId: z.number(),
        discountApplied: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Get coupon details to check if it's a high-discount coupon
      const coupon = await db.getCouponById(input.couponId);
      const protocol = await db.getClientProtocolById(input.clientProtocolId);
      
      // Apply the coupon
      const result = await db.applyCoupon(input.couponId, input.clientProtocolId, input.discountApplied);
      
      // Send notification if discount > 20%
      if (coupon && protocol && parseFloat(coupon.discountPercent) > 20) {
        const { sendHighDiscountCouponNotification } = await import("./emailService");
        
        // Get admin emails (users with receiveNotifications enabled)
        const admins = await db.getUsersWithNotificationsEnabled();
        const adminEmails = admins.map((a: { email: string | null }) => a.email).filter((e: string | null): e is string => !!e);
        
        // Send notification asynchronously (don't block the response)
        sendHighDiscountCouponNotification({
          adminEmails,
          couponCode: coupon.code,
          discountPercent: parseFloat(coupon.discountPercent),
          clientName: protocol.clientName,
          clientEmail: protocol.clientEmail,
          protocolId: protocol.id,
          discountAmount: input.discountApplied,
        }).catch(err => console.error("Failed to send high-discount notification:", err));
      }
      
      return result;
    }),
  usage: adminProcedure
    .input(z.object({ couponId: z.number() }))
    .query(async ({ input }) => {
      return db.getCouponUsage(input.couponId);
    }),
  forClient: publicProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getCouponsForClient(input.clientProtocolId);
    }),
  analytics: adminProcedure.query(async () => {
    return db.getCouponAnalytics();
  }),
  usageDetails: adminProcedure
    .input(z.object({ couponId: z.number() }))
    .query(async ({ input }) => {
      return db.getCouponUsageDetails(input.couponId);
    }),
  bulkCreate: adminProcedure
    .input(
      z.object({
        prefix: z.string().min(2).max(20),
        count: z.number().min(1).max(100),
        discountPercent: z.number().min(1).max(35),
        usageType: z.enum(["one_time", "unlimited"]),
        scope: z.enum(["universal", "client_specific"]),
        maxUses: z.number().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const settings = {
        discountPercent: input.discountPercent,
        usageType: input.usageType,
        maxUses: input.maxUses ?? null,
        scope: input.scope,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        notes: input.notes ?? null,
      };
      return db.bulkCreateCoupons(input.prefix, input.count, settings);
    }),
  categories: adminProcedure.query(async () => {
    return db.getCouponCategories();
  }),
  autoDeactivate: adminProcedure.mutation(async () => {
    return db.autoDeactivateCoupons();
  }),
  expiringSoon: adminProcedure
    .input(z.object({ days: z.number().default(3) }).optional())
    .query(async ({ input }) => {
      return db.getExpiringCoupons(input?.days ?? 3);
    }),
  usageTrends: adminProcedure
    .input(z.object({ days: z.number().default(30) }).optional())
    .query(async ({ input }) => {
      return db.getCouponUsageTrends(input?.days ?? 30);
    }),
});

// ============ EMAIL TRACKING ROUTER ============
const emailTrackingRouter = router({
  // Get email status for a protocol
  getStatus: adminProcedure
    .input(z.object({ protocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getEmailStatusForProtocol(input.protocolId);
    }),
  
  // Get all email events for a protocol
  getEvents: adminProcedure
    .input(z.object({ protocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getEmailEventsForProtocol(input.protocolId);
    }),
  
  // Get email branding settings
  getBranding: adminProcedure.query(async () => {
    return db.getEmailBrandingSettings();
  }),
  
  // Update email branding settings
  updateBranding: adminProcedure
    .input(z.object({
      logoUrl: z.string().optional().nullable(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      companyName: z.string().optional(),
      tagline: z.string().optional(),
      footerText: z.string().optional().nullable(),
      socialLinks: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      await db.updateEmailBrandingSettings(input);
      return { success: true };
    }),
  
  // Get email stats for multiple protocols (for client list view)
  getProtocolStats: adminProcedure
    .input(z.object({ protocolIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      const stats: Record<number, { sent: boolean; opened: boolean; sentAt: Date | null; openedAt: Date | null }> = {};
      for (const protocolId of input.protocolIds) {
        const status = await db.getEmailStatusForProtocol(protocolId);
        stats[protocolId] = {
          sent: status.sent,
          opened: status.opened,
          sentAt: status.sentAt,
          openedAt: status.openedAt,
        };
      }
      return stats;
    }),
  
  // Get email analytics for dashboard
  getAnalytics: adminProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getEmailAnalytics(input.days || 30);
    }),
  
  // Get click-through analytics for dashboard
  getClickAnalytics: adminProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ input }) => {
      return db.getEmailClickAnalytics(input.days || 30);
    }),
  
  // Get protocols needing follow-up emails
  getProtocolsNeedingFollowUp: adminProcedure
    .input(z.object({
      daysAfterSent: z.number().optional(),
      maxFollowUps: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return db.getProtocolsNeedingFollowUp(input.daysAfterSent || 3, input.maxFollowUps || 3);
    }),
  
  // Send follow-up email to a specific protocol
  sendFollowUp: adminProcedure
    .input(z.object({ protocolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const protocol = await db.getClientProtocolById(input.protocolId);
      if (!protocol || !protocol.clientEmail) {
        throw new Error("Protocol not found or no email address");
      }
      
      if (protocol.approvedAt) {
        throw new Error("Protocol already approved");
      }
      
      const branding = await db.getEmailBrandingSettings();
      const origin = ctx.req?.headers?.origin || 'https://peptidecoach.pro';
      const protocolUrl = `${origin}/protocol/${protocol.accessToken}`;
      
      const { sendFollowUpEmail } = await import('./emailService');
      const success = await sendFollowUpEmail(
        protocol.clientEmail,
        protocol.clientName,
        protocolUrl,
        (protocol.followUpCount || 0) + 1,
        branding ? {
          logoUrl: branding.logoUrl || undefined,
          companyName: branding.companyName || undefined,
          tagline: branding.tagline || undefined,
          primaryColor: branding.primaryColor || undefined,
          secondaryColor: branding.secondaryColor || undefined,
          footerText: branding.footerText || undefined,
        } : undefined
      );
      
      if (success) {
        await db.updateFollowUpTracking(input.protocolId);
      }
      
      return { success };
    }),
  
  // Send follow-up emails to all eligible protocols
  sendAllFollowUps: adminProcedure
    .input(z.object({
      daysAfterSent: z.number().optional(),
      maxFollowUps: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const protocols = await db.getProtocolsNeedingFollowUp(
        input.daysAfterSent || 3,
        input.maxFollowUps || 3
      );
      
      const branding = await db.getEmailBrandingSettings();
      const origin = ctx.req?.headers?.origin || 'https://peptidecoach.pro';
      
      const { sendFollowUpEmail } = await import('./emailService');
      
      let sent = 0;
      let failed = 0;
      
      for (const protocol of protocols) {
        if (!protocol.clientEmail) continue;
        
        const protocolUrl = `${origin}/protocol/${protocol.accessToken}`;
        
        const success = await sendFollowUpEmail(
          protocol.clientEmail,
          protocol.clientName,
          protocolUrl,
          (protocol.followUpCount || 0) + 1,
          branding ? {
            logoUrl: branding.logoUrl || undefined,
            companyName: branding.companyName || undefined,
            tagline: branding.tagline || undefined,
            primaryColor: branding.primaryColor || undefined,
            secondaryColor: branding.secondaryColor || undefined,
            footerText: branding.footerText || undefined,
          } : undefined
        );
        
        if (success) {
          await db.updateFollowUpTracking(protocol.id);
          sent++;
        } else {
          failed++;
        }
      }
      
      return { sent, failed, total: protocols.length };
    }),

  // Get preview of email templates
  getTemplatePreview: adminProcedure
    .input(z.object({
      templateType: z.enum([
        'payment_confirmation',
        'store_order_confirmation',
        'shipping_notification',
        'delivery_notification',
        'payment_reminder',
        'low_stock_alert',
      ]),
    }))
    .query(async ({ input, ctx }) => {
      const siteUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      
      // Sample data for previews
      const sampleData = {
        clientName: 'John Smith',
        clientEmail: 'john.smith@example.com',
        amount: '299.99',
        currency: 'USD',
        orderId: 'ORD-2026-001234',
        protocolName: 'BPC-157 + TB-500 Protocol',
        paymentDate: new Date(),
        supportEmail: 'support@omegalongevity.com',
        siteUrl,
        trackingNumber: '1Z999AA10123456784',
        trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
      };
      
      let html = '';
      let subject = '';
      
      switch (input.templateType) {
        case 'payment_confirmation': {
          const { generatePaymentConfirmationHTML } = await import('./emailTemplates/paymentConfirmation');
          html = generatePaymentConfirmationHTML({
            ...sampleData,
            paymentMethod: 'paypal',
          });
          subject = `✅ Payment Confirmed - ${sampleData.protocolName}`;
          break;
        }
        case 'store_order_confirmation': {
          const { generateStoreOrderConfirmationHTML } = await import('./emailTemplates/storeOrderConfirmation');
          html = generateStoreOrderConfirmationHTML({
            customerName: sampleData.clientName,
            customerEmail: sampleData.clientEmail,
            orderId: 12345,
            orderDate: new Date(),
            items: [
              { name: 'BPC-157 (5mg)', quantity: 2, pricePerUnit: '49.99', isDiscountable: true },
              { name: 'TB-500 (5mg)', quantity: 1, pricePerUnit: '59.99', isDiscountable: true },
              { name: 'Bacteriostatic Water', quantity: 2, pricePerUnit: '12.99', isDiscountable: false },
            ],
            subtotal: '185.95',
            discountAmount: '0.00',
            total: '185.95',
            paymentMethod: 'paypal',
            supportEmail: sampleData.supportEmail,
            siteUrl,
          });
          subject = `🛒 Order Confirmed - ORD-12345`;
          break;
        }
        case 'shipping_notification': {
          // Generate shipping notification preview
          html = generateShippingPreviewHtml(siteUrl, 'shipped', sampleData);
          subject = '📦 Your Order Has Shipped! - Omega Longevity';
          break;
        }
        case 'delivery_notification': {
          // Generate delivery notification preview
          html = generateShippingPreviewHtml(siteUrl, 'delivered', sampleData);
          subject = '✅ Your Package Has Been Delivered! - Omega Longevity';
          break;
        }
        case 'payment_reminder': {
          const { generatePaymentReminderHTML } = await import('./emailTemplates/paymentReminder');
          html = generatePaymentReminderHTML({
            clientName: sampleData.clientName,
            clientEmail: sampleData.clientEmail,
            protocolName: sampleData.protocolName,
            daysOverdue: 3,
            amount: sampleData.amount,
            currency: 'USD',
            paymentLink: `${siteUrl}/protocol/sample-token`,
            supportEmail: sampleData.supportEmail,
          });
          subject = 'Friendly Reminder: Complete Your Protocol Payment';
          break;
        }
        case 'low_stock_alert': {
          const { generateLowStockAlertEmail } = await import('./emailTemplates/lowStockAlert');
          const result = await generateLowStockAlertEmail({
            items: [
              { id: 1, name: 'BPC-157 (5mg)', sku: 'BPC-5MG', quantity: 5, lowStockThreshold: 10, categoryName: 'Peptides' },
              { id: 2, name: 'TB-500 (5mg)', sku: 'TB-5MG', quantity: 0, lowStockThreshold: 10, categoryName: 'Peptides' },
            ],
            adminName: 'Admin',
          });
          html = result.html;
          subject = result.subject;
          break;
        }
      }
      
      return { html, subject, templateType: input.templateType };
    }),

  // Get list of available email templates
  getTemplateList: adminProcedure.query(async () => {
    return [
      { id: 'payment_confirmation', name: 'Payment Confirmation', description: 'Sent when a Venmo payment is completed' },
      { id: 'store_order_confirmation', name: 'Store Order Confirmation', description: 'Sent when a store order is placed' },
      { id: 'shipping_notification', name: 'Shipping Notification', description: 'Sent when an order is shipped with tracking' },
      { id: 'delivery_notification', name: 'Delivery Notification', description: 'Sent when a package is delivered' },
      { id: 'payment_reminder', name: 'Payment Reminder', description: 'Sent to remind clients of pending payments' },
      { id: 'low_stock_alert', name: 'Low Stock Alert', description: 'Sent to admins when inventory is low' },
    ];
  }),
  
  // Get enrollment email tracking data
  getEnrollmentTracking: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const { getEnrollmentEmailTracking } = await import('./emailTracking');
      return getEnrollmentEmailTracking(input.enrollmentId);
    }),
  
  // Get all enrollment email tracking with filters
  getEnrollmentTrackingList: adminProcedure
    .input(z.object({
      emailType: z.string().optional(),
      hasOpened: z.boolean().optional(),
      hasClicked: z.boolean().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { getEmailTrackingList } = await import('./emailTracking');
      return getEmailTrackingList(input);
    }),
  
  // Get enrollment email tracking stats
  getEnrollmentTrackingStats: adminProcedure.query(async () => {
    const { getEmailTrackingStats } = await import('./emailTracking');
    return getEmailTrackingStats();
  }),
  
  // Get email tracking status for multiple enrollments at once
  getTrackingByEnrollmentIds: adminProcedure
    .input(z.object({ enrollmentIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      const { getEmailTrackingByEnrollmentIds } = await import('./emailTracking');
      return getEmailTrackingByEnrollmentIds(input.enrollmentIds);
    }),
});

// Helper function to generate shipping/delivery preview HTML
function generateShippingPreviewHtml(siteUrl: string, status: 'shipped' | 'delivered', data: any): string {
  const isDelivered = status === 'delivered';
  const config = isDelivered ? {
    title: 'Your Package Has Been Delivered!',
    subtitle: 'Your health optimization products have arrived',
    icon: '✅',
    message: 'Great news! Your package has been delivered. We hope you enjoy your products!',
  } : {
    title: 'Your Order Has Shipped!',
    subtitle: 'Your health optimization products are on their way',
    icon: '📦',
    message: 'Great news! Your order has been shipped and is on its way to you.',
  };
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">${config.icon}</div>
          <h1 style="color: white; margin: 0; font-size: 24px;">${config.title}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">${config.subtitle}</p>
        </div>
        <div style="background-color: #1E293B; padding: 30px;">
          <p style="color: #F8FAFC; font-size: 16px; margin: 0 0 20px 0;">Hi ${data.clientName},</p>
          <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">${config.message}</p>
          ${!isDelivered ? `
          <div style="background-color: rgba(34, 197, 94, 0.1); border: 1px solid #22C55E; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #22C55E;">📦 Tracking Information</p>
            <p style="margin: 0; color: #F8FAFC;">Tracking Number: <strong>${data.trackingNumber}</strong></p>
            <a href="${data.trackingUrl}" style="display: inline-block; background: #22C55E; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 12px;">Track Your Package</a>
          </div>
          ` : `
          <div style="background-color: rgba(34, 197, 94, 0.1); border: 1px solid #22C55E; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-weight: 600; color: #22C55E;">✅ Delivered Successfully</p>
            <p style="margin: 8px 0 0 0; color: #94A3B8; font-size: 14px;">Delivered on ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          `}
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #0F172A; border-radius: 8px;">
            <thead>
              <tr style="background-color: rgba(249, 115, 22, 0.1);">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #F97316; text-transform: uppercase;">Item</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #F97316; text-transform: uppercase;">Qty</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #F97316; text-transform: uppercase;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #334155; color: #F8FAFC;">BPC-157 (5mg)</td>
                <td style="padding: 12px; border-bottom: 1px solid #334155; text-align: center; color: #94A3B8;">2</td>
                <td style="padding: 12px; border-bottom: 1px solid #334155; text-align: right;"><span style="background-color: rgba(34, 197, 94, 0.2); color: #22C55E; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${isDelivered ? 'Delivered' : 'Shipped'}</span></td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #334155; color: #F8FAFC;">TB-500 (5mg)</td>
                <td style="padding: 12px; border-bottom: 1px solid #334155; text-align: center; color: #94A3B8;">1</td>
                <td style="padding: 12px; border-bottom: 1px solid #334155; text-align: right;"><span style="background-color: rgba(34, 197, 94, 0.2); color: #22C55E; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${isDelivered ? 'Delivered' : 'Shipped'}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="background-color: #0F172A; padding: 25px; border-radius: 0 0 12px 12px;">
          <p style="color: #F97316; font-size: 14px; text-align: center; margin: 0 0 15px 0; font-weight: 600;">Explore Omega Longevity</p>
          <div style="text-align: center;">
            <a href="${siteUrl}/order" style="color: #94A3B8; text-decoration: none; margin: 0 10px; font-size: 12px;">Store</a>
            <a href="${siteUrl}/coaching-programs" style="color: #94A3B8; text-decoration: none; margin: 0 10px; font-size: 12px;">Coaching</a>
            <a href="${siteUrl}/partners" style="color: #94A3B8; text-decoration: none; margin: 0 10px; font-size: 12px;">Partners</a>
            <a href="${siteUrl}/launchpad#podcast" style="color: #94A3B8; text-decoration: none; margin: 0 10px; font-size: 12px;">Podcast</a>
          </div>
          <p style="color: #64748B; font-size: 11px; text-align: center; margin: 20px 0 0 0;">© ${new Date().getFullYear()} Omega Longevity. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============ PACKING SLIP ROUTER ============
const packingSlipRouter = router({
  // Get all packing slips with mismatch status
  list: adminProcedure.query(async () => {
    const slips = await db.getAllPackingSlips();

    // Fetch the master protocol item catalog once — it's the same data for every slip.
    // Previously this was called inside the .map(), firing one full-table read per slip.
    const allItems = await db.getAllProtocolItems();

    // Check for mismatches for each slip
    const slipsWithMismatchStatus = await Promise.all(
      slips.map(async (slip) => {
        try {
          // Store order packing slips don't need protocol mismatch checking
          if ((slip as any).source === 'store' || !slip.clientProtocolId) {
            return { ...slip, hasMismatch: false };
          }
          // Get current protocol items
          const protocolItems = await db.getClientProtocolItems(slip.clientProtocolId);

          // Get current included items from protocol (excluding services, QTY 0, client-sourced, and orphaned items)
          const currentRecommended = protocolItems
            .filter((item: any) => item.isIncluded)
            .filter((item: any) => item.quantity && item.quantity > 0)
            .filter((item: any) => item.fulfillmentSource !== 'client') // Exclude client-sourced items
            .map((item: any) => {
              const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
              return {
                protocolItemId: item.protocolItemId,
                itemName: protocolItem?.name || null,
                itemType: protocolItem?.itemType || 'other',
                quantity: item.quantity || 1,
              };
            })
            .filter((item: any) => item.itemName !== null)
            .filter((item: any) => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));

          // Get packing slip items
          const packingSlipDetail = await db.getPackingSlipById(slip.id);
          const packingSlipItems = packingSlipDetail?.items || [];

          // Quick mismatch check
          let hasMismatch = false;
          
          // Check for missing or quantity differences
          for (const protocolItem of currentRecommended) {
            const packingItem = packingSlipItems.find((p: any) => p.protocolItemId === protocolItem.protocolItemId);
            if (!packingItem || packingItem.quantity !== protocolItem.quantity) {
              hasMismatch = true;
              break;
            }
          }
          
          // Check for extra items
          if (!hasMismatch) {
            for (const packingItem of packingSlipItems) {
              const protocolItem = currentRecommended.find((p: any) => p.protocolItemId === packingItem.protocolItemId);
              if (!protocolItem) {
                hasMismatch = true;
                break;
              }
            }
          }

          return { ...slip, hasMismatch };
        } catch (error) {
          // If there's an error checking, assume no mismatch
          return { ...slip, hasMismatch: false };
        }
      })
    );
    
    return slipsWithMismatchStatus;
  }),
  
  // Get packing slip by protocol ID (public - for client view)
  getByProtocolToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const protocol = await db.getClientProtocolByToken(input.token);
      if (!protocol) return null;
      return db.getPackingSlipByProtocolId(protocol.id);
    }),
  
  // Get packing slip by ID with items
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getPackingSlipById(input.id);
    }),
  
  // Get packing slip by protocol ID
  getByProtocolId: adminProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      return db.getPackingSlipByProtocolId(input.clientProtocolId);
    }),
  
  // Create packing slip (usually auto-created on approval)
  create: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      protocolOrderId: z.number().optional(),
      clientName: z.string(),
      clientEmail: z.string(),
      items: z.array(z.object({
        protocolItemId: z.number(),
        itemName: z.string(),
        itemType: z.string(),
        quantity: z.number(),
        price: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      if (input.clientProtocolId) {
        const existing = await db.getPackingSlipByProtocolId(input.clientProtocolId);
        if (existing && !(existing as any).archivedAt) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `An active packing slip already exists for this protocol (ID: ${existing.id}). Archive the existing slip before creating a new one.`,
          });
        }
      }
      const id = await db.createPackingSlip(input);
      return { id };
    }),

  // Update item status (fulfill, backorder, etc.)
  updateItem: adminProcedure
    .input(z.object({
      itemId: z.number(),
      quantityFulfilled: z.number().optional(),
      quantityBackordered: z.number().optional(),
      status: z.enum(['pending', 'fulfilled', 'partial', 'backordered', 'cancelled']).optional(),
      notes: z.string().optional(),
      shipSource: z.enum(['omega', 'dropship', 'vendor', 'client_sourced']).optional(),
      itemTrackingCarrier: z.string().optional(),
      itemTrackingNumber: z.string().optional(),
      itemTrackingUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const slip = await db.getPackingSlipByItemId(input.itemId);
      if (slip?.isLocked || slip?.signedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This packing slip has been signed and locked. Unlock it before making changes.',
        });
      }
      if (input.quantityFulfilled !== undefined || input.quantityBackordered !== undefined) {
        const item = await db.getPackingSlipItemById(input.itemId);
        if (item) {
          const fulfilled = input.quantityFulfilled ?? item.quantityFulfilled;
          const backordered = input.quantityBackordered ?? item.quantityBackordered;
          if (fulfilled < 0 || backordered < 0) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Quantities cannot be negative.' });
          }
          if (fulfilled + backordered > item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Fulfilled (${fulfilled}) + backordered (${backordered}) cannot exceed ordered quantity (${item.quantity}).`,
            });
          }
        }
      }
      const { itemId, ...data } = input;
      if (data.itemTrackingNumber && data.itemTrackingCarrier && !data.itemTrackingUrl) {
        data.itemTrackingUrl = buildTrackingUrl(data.itemTrackingCarrier, data.itemTrackingNumber);
      }
      const result = await db.updatePackingSlipItem(itemId, data);
      if (slip?.id) {
        await db.createPackingSlipAuditEntry({
          packingSlipId: slip.id,
          action: 'item_status_changed',
          performedBy: ctx.user.id,
          performedByName: ctx.user.name || ctx.user.email,
          details: { itemId, ...data } as Record<string, unknown>,
        });
      }
      return result;
    }),

  // Batch fulfill or backorder multiple items in one request
  batchFulfillItems: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
      itemIds: z.array(z.number()),
      action: z.enum(['fulfill', 'backorder']),
    }))
    .mutation(async ({ input, ctx }) => {
      const slip = await db.getPackingSlipById(input.packingSlipId);
      if (slip?.isLocked || slip?.signedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This packing slip has been signed and locked. Unlock it before making changes.',
        });
      }
      let updated = 0;
      for (const itemId of input.itemIds) {
        const item = await db.getPackingSlipItemById(itemId);
        if (!item) continue;
        if (item.status === 'fulfilled' || item.status === 'backordered') continue;
        if (input.action === 'fulfill') {
          await db.updatePackingSlipItem(itemId, { quantityFulfilled: item.quantity, status: 'fulfilled' });
        } else {
          await db.updatePackingSlipItem(itemId, { quantityBackordered: item.quantity, status: 'backordered' });
        }
        updated++;
      }
      await db.createPackingSlipAuditEntry({
        packingSlipId: input.packingSlipId,
        action: 'item_status_changed',
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email,
        details: { batchAction: input.action, itemCount: updated } as Record<string, unknown>,
      });
      return { updated };
    }),

  // Sign off on packing slip
  sign: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
      signatureData: z.string(),
      notes: z.string().optional(),
      sendNotification: z.boolean().optional().default(true),
      trackingCarrier: z.string().optional(),
      trackingNumber: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get packing slip details before signing (includes items)
      const packingSlip = await db.getPackingSlipById(input.packingSlipId);
      const items = packingSlip?.items || [];
      
      const trackingUrl = input.trackingNumber && input.trackingCarrier
        ? buildTrackingUrl(input.trackingCarrier, input.trackingNumber)
        : undefined;
      
      // Sign the packing slip
      const result = await db.signPackingSlip(input.packingSlipId, {
        fulfilledBy: ctx.user.id,
        fulfilledByName: ctx.user.name || 'Admin',
        signatureData: input.signatureData,
        notes: input.notes,
        trackingCarrier: input.trackingCarrier,
        trackingNumber: input.trackingNumber,
        trackingUrl,
      });
      await db.lockPackingSlip(input.packingSlipId, ctx.user.id, ctx.user.name || 'Admin');

      // Send shipping notification email if enabled and client has email
      if (input.sendNotification && packingSlip?.clientEmail) {
        const { sendShippingNotification } = await import('./emailService');
        
        // Determine status based on items
        const hasBackorders = items.some((item: any) => item.quantityBackordered > 0);
        const allFulfilled = items.every((item: any) => item.quantityFulfilled >= item.quantity);
        const status = hasBackorders ? 'partial' : allFulfilled ? 'complete' : 'shipped';
        
        // Get protocol URL for the email
        const protocol = packingSlip.clientProtocolId ? await db.getClientProtocolById(packingSlip.clientProtocolId) : null;
        const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
        const protocolUrl = protocol ? `${baseUrl}/protocol/${protocol.accessToken}` : undefined;
        
        await sendShippingNotification({
          to: packingSlip.clientEmail,
          clientName: packingSlip.clientName,
          status,
          items: items.map((item: any) => ({
            name: item.itemName,
            quantity: item.quantity,
            fulfilled: item.quantityFulfilled,
            backordered: item.quantityBackordered,
          })),
          notes: input.notes,
          trackingNumber: input.trackingNumber,
          trackingUrl,
          protocolUrl,
          siteUrl: baseUrl,
        });
      }

      // Send admin shipping notification (always, regardless of client notification toggle)
      try {
        const { sendAdminShippingNotification } = await import('./emailService');
        const hasBackorders = items.some((item: any) => item.quantityBackordered > 0);
        const allFulfilled = items.every((item: any) => item.quantityFulfilled >= item.quantity);
        const shipStatus: 'shipped' | 'complete' | 'partial' = hasBackorders ? 'partial' : allFulfilled ? 'complete' : 'shipped';
        await sendAdminShippingNotification({
          clientName: packingSlip?.clientName || 'Unknown',
          clientEmail: packingSlip?.clientEmail || '',
          packingSlipId: input.packingSlipId,
          status: shipStatus,
          itemCount: items.length,
          trackingNumber: input.trackingNumber,
          trackingCarrier: input.trackingCarrier,
          trackingUrl,
          fulfilledByName: ctx.user.name || ctx.user.email || 'Admin',
        });
      } catch (adminErr) {
        console.error('[PackingSlip] Failed to send admin shipping notification:', adminErr);
      }
      
      return result;
    }),
  
  // Update packing slip status
  updateStatus: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
      status: z.enum(['pending', 'in_progress', 'partial', 'complete', 'cancelled']),
    }))
    .mutation(async ({ input, ctx }) => {
      const slip = await db.getPackingSlipById(input.packingSlipId);
      if (slip?.isLocked || slip?.signedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This packing slip is locked. Unlock it before changing status.',
        });
      }
      if (slip?.archivedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify an archived packing slip.',
        });
      }
      const result = await db.updatePackingSlipStatus(input.packingSlipId, input.status);
      await db.createPackingSlipAuditEntry({
        packingSlipId: input.packingSlipId,
        action: 'status_changed',
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email,
        details: { status: input.status } as Record<string, unknown>,
      });
      return result;
    }),
  
  // Update packing slip shipping address
  updateShipping: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
      shippingName: z.string().optional(),
      shippingStreet: z.string().optional(),
      shippingCity: z.string().optional(),
      shippingState: z.string().optional(),
      shippingZip: z.string().optional(),
      shippingCountry: z.string().optional(),
      shippingPhone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { packingSlipId, ...shippingData } = input;
      const slip = await db.getPackingSlipById(packingSlipId);
      if (slip?.isLocked || slip?.signedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This packing slip is locked. Unlock it before modifying the shipping address.',
        });
      }
      if (slip?.archivedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify an archived packing slip.',
        });
      }
      const result = await db.updatePackingSlipShipping(packingSlipId, shippingData);
      await db.createPackingSlipAuditEntry({
        packingSlipId,
        action: 'shipping_updated',
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email,
        details: shippingData as Record<string, unknown>,
      });
      return result;
    }),

  // Update packing slip package dimensions
  updateDimensions: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
      packageWeight: z.number().nullable(),
      packageLength: z.number().nullable(),
      packageWidth: z.number().nullable(),
      packageHeight: z.number().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { packingSlipId, ...dimensionsData } = input;
      const slip = await db.getPackingSlipById(packingSlipId);
      if (slip?.isLocked || slip?.signedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This packing slip is locked. Unlock it before modifying package dimensions.',
        });
      }
      if (slip?.archivedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify an archived packing slip.',
        });
      }
      const result = await db.updatePackingSlipDimensions(packingSlipId, dimensionsData);
      await db.createPackingSlipAuditEntry({
        packingSlipId,
        action: 'dimensions_updated',
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email,
        details: dimensionsData as Record<string, unknown>,
      });
      return result;
    }),

  // Archive packing slip (soft delete)
  archive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.archivePackingSlip(input.id, ctx.user.id);
      await db.createPackingSlipAuditEntry({
        packingSlipId: input.id,
        action: 'archived',
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email,
      });
      return result;
    }),

  // Restore archived packing slip
  restore: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.restorePackingSlip(input.id);
      await db.createPackingSlipAuditEntry({
        packingSlipId: input.id,
        action: 'restored',
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email,
      });
      return result;
    }),

  // Permanently delete packing slip
  permanentDelete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'owner' && ctx.user.role !== 'manager') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners and managers can permanently delete packing slips.' });
      }
      return db.permanentlyDeletePackingSlip(input.id);
    }),

  // List archived packing slips
  listArchived: adminProcedure.query(async () => {
    return db.getArchivedPackingSlips();
  }),

  // Bulk archive packing slips
  bulkArchive: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const results = [];
      for (const id of input.ids) {
        try {
          const slip = await db.getPackingSlipById(id);
          if (!slip) {
            results.push({ id, success: false, error: 'Not found', skipped: true });
            continue;
          }
          if (slip.archivedAt) {
            results.push({ id, success: false, error: 'Already archived', skipped: true });
            continue;
          }
          await db.archivePackingSlip(id, ctx.user.id);
          await db.createPackingSlipAuditEntry({
            packingSlipId: id,
            action: 'archived',
            performedBy: ctx.user.id,
            performedByName: ctx.user.name || ctx.user.email,
            details: { reason: 'Archived via bulk action' },
          });
          results.push({ id, success: true });
        } catch (error) {
          results.push({ id, success: false, error: String(error) });
        }
      }
      return {
        archived: results.filter(r => r.success).length,
        skipped: results.filter(r => (r as any).skipped).length,
        results,
      };
    }),

  // Bulk permanent delete
  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'owner' && ctx.user.role !== 'manager') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners and managers can permanently delete packing slips.' });
      }
      const results = await Promise.all(
        input.ids.map(id => db.permanentlyDeletePackingSlip(id))
      );
      return { deleted: results.length };
    }),

  // Regenerate packing slip items (fix incorrect items)
  regenerate: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const packingSlip = await db.getPackingSlipById(input.packingSlipId);
      if (!packingSlip) {
        throw new Error('Packing slip not found');
      }

      // Store order packing slips cannot be regenerated from protocol
      if ((packingSlip as any).source === 'store' || !packingSlip.clientProtocolId) {
        throw new Error('Store order packing slips cannot be regenerated from a protocol. Edit items manually if needed.');
      }

      // PROTECTION: Block regeneration of signed or locked packing slips
      // Correct workflow: admin unlocks → regenerates → re-signs
      if (packingSlip.signedAt || packingSlip.isLocked) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot regenerate a signed packing slip. Unlock it first, then regenerate, then re-sign.',
        });
      }

      // Get protocol items - included items with QTY > 0
      const protocolItems = await db.getClientProtocolItems(packingSlip.clientProtocolId);
      const allItems = await db.getAllProtocolItems();

      // Filter to included, coach-fulfilled items with QTY > 0, exclude services, client-sourced, and orphaned items
      const shippableItems = protocolItems
        .filter((item: any) => item.isIncluded)
        .filter((item: any) => item.quantity && item.quantity > 0)
        .filter((item: any) => item.fulfillmentSource !== 'client') // Only coach-fulfilled items on packing slip
        .map((item: any) => {
          const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
          const name = protocolItem?.name || null;
          const sku = (protocolItem as any)?.sku;
          const itemName = name ? (sku ? `${name} · ${sku}` : name) : null;
          return {
            protocolItemId: item.protocolItemId,
            itemName: itemName as string | null,
            itemType: (protocolItem?.itemType || 'other') as string,
            quantity: item.quantity,
            price: parseFloat(item.customPrice || protocolItem?.price || '0'),
          };
        })
        .filter((item: any): item is { protocolItemId: number; itemName: string; itemType: string; quantity: number; price: number } => item.itemName !== null)
        .filter((item: any) => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));

      // Delete existing items and recreate with correct items
      await db.deletePackingSlipItems(input.packingSlipId);
      await db.addPackingSlipItems(input.packingSlipId, shippableItems as any);
      await db.updatePackingSlipTotalItems(input.packingSlipId, shippableItems.length);
      await db.createPackingSlipAuditEntry({
        packingSlipId: input.packingSlipId,
        action: 'regenerated',
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email,
        details: { itemCount: shippableItems.length },
      });

      return {
        success: true,
        itemCount: shippableItems.length,
        message: `Packing slip regenerated with ${shippableItems.length} included items`,
      };
    }),

  // Bulk regenerate packing slips
  bulkRegenerate: adminProcedure
    .input(z.object({
      ids: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const results = [];
      for (const packingSlipId of input.ids) {
        try {
          const packingSlip = await db.getPackingSlipById(packingSlipId);
          if (!packingSlip) continue;

          // Skip store order packing slips - they don't have a protocol to regenerate from
          if ((packingSlip as any).source === 'store' || !packingSlip.clientProtocolId) {
            results.push({
              id: packingSlipId,
              success: false,
              error: 'Skipped: Store order packing slip',
              skipped: true
            });
            continue;
          }

          // PROTECTION: Skip signed or locked packing slips
          // Correct workflow: admin unlocks → regenerates → re-signs
          if (packingSlip.signedAt || packingSlip.isLocked) {
            results.push({
              id: packingSlipId,
              success: false,
              error: 'Skipped: Packing slip is signed or locked',
              skipped: true
            });
            continue;
          }

          const protocolItems = await db.getClientProtocolItems(packingSlip.clientProtocolId);
          const allItems = await db.getAllProtocolItems();

          // Exclude services, client-sourced, QTY 0, and orphaned items from packing slips
          const shippableItems = protocolItems
            .filter((item: any) => item.isIncluded)
            .filter((item: any) => item.quantity && item.quantity > 0)
            .filter((item: any) => item.fulfillmentSource !== 'client') // Only coach-fulfilled items
            .map((item: any) => {
              const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
              const name = protocolItem?.name || null;
              const sku = (protocolItem as any)?.sku;
              const itemName = name ? (sku ? `${name} · ${sku}` : name) : null;
              return {
                protocolItemId: item.protocolItemId,
                itemName: itemName as string | null,
                itemType: (protocolItem?.itemType || 'other') as string,
                quantity: item.quantity,
                price: parseFloat(item.customPrice || protocolItem?.price || '0'),
              };
            })
            .filter((item: any): item is { protocolItemId: number; itemName: string; itemType: string; quantity: number; price: number } => item.itemName !== null)
            .filter((item: any) => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));

          await db.deletePackingSlipItems(packingSlipId);
          await db.addPackingSlipItems(packingSlipId, shippableItems as any);
          await db.updatePackingSlipTotalItems(packingSlipId, shippableItems.length);

          results.push({ id: packingSlipId, success: true, itemCount: shippableItems.length });
        } catch (error) {
          results.push({ id: packingSlipId, success: false, error: String(error) });
        }
      }
      return {
        regenerated: results.filter(r => r.success).length,
        skipped: results.filter(r => (r as any).skipped).length,
        failed: results.filter(r => !r.success && !(r as any).skipped).length,
        results,
      };
    }),

  // Bulk lock packing slips
  bulkLock: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const results = [];
      for (const packingSlipId of input.ids) {
        try {
          await db.lockPackingSlip(packingSlipId, ctx.user?.id || 0, ctx.user?.email || 'system');
          await db.createPackingSlipAuditEntry({
            packingSlipId,
            action: 'bulk_locked',
            performedBy: ctx.user?.id,
            performedByEmail: ctx.user?.email || 'system',
            details: { reason: 'Locked via bulk action' },
          });
          results.push({ id: packingSlipId, success: true });
        } catch (error) {
          results.push({ id: packingSlipId, success: false, error: String(error) });
        }
      }
      return { locked: results.filter(r => r.success).length, results };
    }),

  // Bulk unlock packing slips
  bulkUnlock: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'owner' && ctx.user.role !== 'manager') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners and managers can bulk-unlock signed packing slips.' });
      }
      const results = [];
      for (const packingSlipId of input.ids) {
        try {
          await db.unlockPackingSlip(packingSlipId, ctx.user?.id || 0, ctx.user?.email || 'system');
          await db.createPackingSlipAuditEntry({
            packingSlipId,
            action: 'bulk_unlocked',
            performedBy: ctx.user?.id,
            performedByEmail: ctx.user?.email || 'system',
            details: { reason: 'Unlocked via bulk action' },
          });
          results.push({ id: packingSlipId, success: true });
        } catch (error) {
          results.push({ id: packingSlipId, success: false, error: String(error) });
        }
      }
      return { unlocked: results.filter(r => r.success).length, results };
    }),

  // Check for mismatches between packing slip and current protocol
  checkMismatch: adminProcedure
    .input(z.object({ packingSlipId: z.number() }))
    .query(async ({ input }) => {
      const packingSlip = await db.getPackingSlipById(input.packingSlipId);
      if (!packingSlip) {
        throw new Error('Packing slip not found');
      }

      // Store order packing slips don't have a protocol to compare against
      if ((packingSlip as any).source === 'store' || !packingSlip.clientProtocolId) {
        return { hasMismatch: false, mismatches: [] };
      }

      // Get current protocol items
      const protocolItems = await db.getClientProtocolItems(packingSlip.clientProtocolId);
      const allItems = await db.getAllProtocolItems();

      // Get current included items from protocol (excluding services, QTY 0, client-sourced, and orphaned items)
      const currentRecommended = protocolItems
        .filter((item: any) => item.isIncluded)
        .filter((item: any) => item.quantity && item.quantity > 0) // Exclude QTY 0 informational items
        .filter((item: any) => item.fulfillmentSource !== 'client') // Exclude client-sourced items (they buy via affiliate)
        .map((item: any) => {
          const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
          return {
            protocolItemId: item.protocolItemId,
            itemName: protocolItem?.name || null,
            itemType: protocolItem?.itemType || 'other',
            quantity: item.quantity,
          };
        })
        .filter((item: any): item is { protocolItemId: number; itemName: string; itemType: string; quantity: number } => item.itemName !== null) // Exclude orphaned items with deleted master products
        .filter((item: any) => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));

      // Get packing slip items
      const packingSlipItems = packingSlip.items || [];

      const mismatches: Array<{
        type: 'missing' | 'extra' | 'quantity';
        itemName: string;
        protocolItemId: number;
        expected?: number;
        actual?: number;
      }> = [];

      // Check for items in protocol but not in packing slip (missing)
      for (const protocolItem of currentRecommended) {
        const packingItem = packingSlipItems.find((p: any) => p.protocolItemId === protocolItem.protocolItemId);
        if (!packingItem) {
          mismatches.push({
            type: 'missing',
            itemName: protocolItem.itemName || '',
            protocolItemId: protocolItem.protocolItemId,
            expected: protocolItem.quantity,
          });
        } else if (packingItem.quantity !== protocolItem.quantity) {
          mismatches.push({
            type: 'quantity',
            itemName: protocolItem.itemName || '',
            protocolItemId: protocolItem.protocolItemId,
            expected: protocolItem.quantity,
            actual: packingItem.quantity,
          });
        }
      }

      // Check for items in packing slip but not recommended in protocol (extra)
      for (const packingItem of packingSlipItems) {
        const protocolItem = currentRecommended.find((p: any) => p.protocolItemId === packingItem.protocolItemId);
        if (!protocolItem) {
          mismatches.push({
            type: 'extra',
            itemName: packingItem.itemName,
            protocolItemId: packingItem.protocolItemId,
            actual: packingItem.quantity,
          });
        }
      }

      return {
        hasMismatch: mismatches.length > 0,
        mismatches,
        packingSlipItemCount: packingSlipItems.length,
        protocolRecommendedCount: currentRecommended.length,
      };
    }),

  // Add item to existing packing slip
  addItem: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
      protocolItemId: z.number(),
      itemName: z.string(),
      itemType: z.string(),
      quantity: z.number(),
      price: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const slip = await db.getPackingSlipById(input.packingSlipId);
      if (slip?.isLocked || slip?.signedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This packing slip is locked. Unlock it before adding items.',
        });
      }
      if (slip?.archivedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify an archived packing slip.',
        });
      }
      const { packingSlipId, ...itemData } = input;
      await db.addPackingSlipItems(packingSlipId, [itemData]);
      const updatedSlip = await db.getPackingSlipById(packingSlipId);
      if (updatedSlip) {
        await db.updatePackingSlipTotalItems(packingSlipId, updatedSlip.items.length);
      }
      await db.createPackingSlipAuditEntry({
        packingSlipId,
        action: 'item_added',
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email,
        details: itemData as Record<string, unknown>,
      });
      return { success: true };
    }),

  // Remove item from packing slip
  removeItem: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
      itemId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const slip = await db.getPackingSlipById(input.packingSlipId);
      if (slip?.isLocked || slip?.signedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This packing slip is locked. Unlock it before removing items.',
        });
      }
      if (slip?.archivedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify an archived packing slip.',
        });
      }
      await db.deletePackingSlipItem(input.itemId);
      const updatedSlip = await db.getPackingSlipById(input.packingSlipId);
      if (updatedSlip) {
        await db.updatePackingSlipTotalItems(input.packingSlipId, updatedSlip.items.length);
      }
      await db.createPackingSlipAuditEntry({
        packingSlipId: input.packingSlipId,
        action: 'item_removed',
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email,
        details: { itemId: input.itemId },
      });
      return { success: true };
    }),

  // Mark packing slip as delivered and send notification
  markDelivered: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
      sendNotification: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const packingSlip = await db.getPackingSlipById(input.packingSlipId);
      if (!packingSlip) {
        throw new Error('Packing slip not found');
      }
      
      // Update delivery status
      await db.updatePackingSlipDeliveryStatus(input.packingSlipId, 'delivered', new Date());
      
      // Send delivery notification email if requested
      if (input.sendNotification && packingSlip.clientEmail) {
        try {
          const { generateDeliveryNotificationHTML, generateDeliveryNotificationText } = await import('./emailTemplates/deliveryNotification');
          const { sendEmail } = await import('./emailService');
          
          const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
          const supportEmail = await db.getSiteSetting('support_email') || 'support@omegalongevity.com';
          
          const items = packingSlip.items.map((item: any) => ({
            name: item.itemName,
            quantity: item.quantityFulfilled || item.quantity,
            quantityBackordered: item.quantityBackordered || 0,
          }));
          
          const emailData = {
            customerName: packingSlip.clientName,
            customerEmail: packingSlip.clientEmail,
            orderId: `PS-${packingSlip.id}`,
            items,
            deliveryDate: new Date(),
            trackingNumber: packingSlip.trackingNumber || undefined,
            trackingUrl: packingSlip.trackingUrl || undefined,
            supportEmail,
            siteUrl: baseUrl,
          };
          
          const html = generateDeliveryNotificationHTML(emailData);
          const text = generateDeliveryNotificationText(emailData);
          
          await sendEmail({
            to: packingSlip.clientEmail,
            subject: '✅ Your Package Has Been Delivered! - Omega Longevity',
            html,
          });
          
          // Mark notification as sent
          await db.updatePackingSlipDeliveryNotificationSent(input.packingSlipId, true);
        } catch (error) {
          console.error('[markDelivered] Failed to send delivery notification:', error);
        }
      }

      // Send admin delivery notification (always)
      try {
        const { sendAdminDeliveryNotification } = await import('./emailService');
        await sendAdminDeliveryNotification({
          clientName: packingSlip.clientName,
          clientEmail: packingSlip.clientEmail,
          packingSlipId: input.packingSlipId,
          trackingNumber: packingSlip.trackingNumber || undefined,
          deliveredAt: new Date(),
        });
      } catch (adminErr) {
        console.error('[markDelivered] Failed to send admin delivery notification:', adminErr);
      }

      // Auto-create "Schedule Kickoff Session" task in the client's project
      try {
        // Find the client project linked to this packing slip's protocol
        if (packingSlip.clientProtocolId) {
          const protocol = await db.getClientProtocolById(packingSlip.clientProtocolId);
          if (protocol?.clientId) {
            // Find the client's active project
            const projects = await db.getClientProjects(protocol.clientId);
            const activeProject = projects.find((p: any) => p.status === 'active') || projects[0];
            if (activeProject) {
              await db.createProjectTask({
                clientProjectId: activeProject.id,
                lifecycleStageId: 6, // Onboarding
                name: `Schedule kickoff session for ${packingSlip.clientName}`,
                description: `Package delivered on ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Reach out to ${packingSlip.clientName} (${packingSlip.clientEmail}) to schedule their kickoff / reconstitution training session.\n\nPacking Slip: #${input.packingSlipId}${packingSlip.trackingNumber ? `\nTracking: ${packingSlip.trackingNumber}` : ''}`,
                assignedTeamMemberId: null,
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                sortOrder: 150,
                isRequired: true,
              });
              console.log(`[markDelivered] Created kickoff session task for ${packingSlip.clientName} in project #${activeProject.id}`);
            }
          }
        }
      } catch (taskErr) {
        console.error('[markDelivered] Failed to create kickoff task:', taskErr);
      }
      
      return { success: true };
    }),

  // Update delivery status (for manual status changes)
  updateDeliveryStatus: adminProcedure
    .input(z.object({
      packingSlipId: z.number(),
      deliveryStatus: z.enum(['pending', 'shipped', 'in_transit', 'delivered', 'exception']),
    }))
    .mutation(async ({ input, ctx }) => {
      const deliveredAt = input.deliveryStatus === 'delivered' ? new Date() : null;
      await db.updatePackingSlipDeliveryStatus(input.packingSlipId, input.deliveryStatus, deliveredAt);
      
      // Auto-lock packing slip when marked as delivered (idempotent — skip if already locked)
      if (input.deliveryStatus === 'delivered') {
        const currentSlip = await db.getPackingSlipById(input.packingSlipId);
        if (!currentSlip?.isLocked) {
          await db.lockPackingSlip(input.packingSlipId, ctx.user?.id || 0, ctx.user?.email || 'system');
          await db.createPackingSlipAuditEntry({
            packingSlipId: input.packingSlipId,
            action: 'auto_locked',
            performedBy: ctx.user?.id,
            performedByEmail: ctx.user?.email || 'system',
            details: { reason: 'Automatically locked when marked as delivered' },
          });
        }
      }
      
      return { success: true };
    }),

  // Preview packing slip items for a protocol (before payment)
  // This shows exactly what will be on the packing slip when payment is confirmed
  previewForProtocol: adminProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      // Get protocol details
      const protocol = await db.getClientProtocolById(input.clientProtocolId);
      if (!protocol) {
        throw new Error('Protocol not found');
      }

      // Get protocol items - included items with QTY > 0
      const protocolItems = await db.getClientProtocolItems(input.clientProtocolId);
      const allItems = await db.getAllProtocolItems();

      // Filter to included items with QTY > 0, exclude services and orphaned items
      const shippableItems = protocolItems
        .filter((item: any) => item.isIncluded)
        .filter((item: any) => item.quantity && item.quantity > 0)
        .map((item: any) => {
          const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
          const name = protocolItem?.name || null;
          const sku = (protocolItem as any)?.sku;
          const itemName = name ? (sku ? `${name} · ${sku}` : name) : null;
          return {
            protocolItemId: item.protocolItemId,
            itemName,
            itemType: protocolItem?.itemType || 'other',
            quantity: item.quantity || 1,
            price: parseFloat(item.customPrice || protocolItem?.price || '0'),
          };
        })
        .filter((item: any) => item.itemName !== null)
        .filter((item: any) => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));

      // Calculate total amount
      const totalAmount = shippableItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

      return {
        clientName: protocol.clientName,
        items: shippableItems,
        totalItems: shippableItems.length,
        totalAmount,
        willCreatePackingSlip: shippableItems.length > 0 && totalAmount > 0,
        reason: shippableItems.length === 0 
          ? 'No shippable items in protocol'
          : totalAmount <= 0 
            ? 'Total is $0 (affiliate-only protocol)'
            : null,
      };
    }),

  // Lock a packing slip to prevent modifications
  lock: adminProcedure
    .input(z.object({ packingSlipId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const packingSlip = await db.getPackingSlipById(input.packingSlipId);
      if (!packingSlip) {
        throw new Error('Packing slip not found');
      }
      
      if (packingSlip.isLocked) {
        throw new Error('Packing slip is already locked');
      }
      
      return db.lockPackingSlip(
        input.packingSlipId,
        ctx.user.id,
        ctx.user.name || ctx.user.email || 'Unknown'
      );
    }),

  // Unlock a packing slip to allow modifications
  unlock: adminProcedure
    .input(z.object({ packingSlipId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const packingSlip = await db.getPackingSlipById(input.packingSlipId);
      if (!packingSlip) {
        throw new Error('Packing slip not found');
      }
      
      if (!packingSlip.isLocked) {
        throw new Error('Packing slip is not locked');
      }
      
      return db.unlockPackingSlip(
        input.packingSlipId,
        ctx.user.id,
        ctx.user.name || ctx.user.email || 'Unknown'
      );
    }),

  // Get audit log for a packing slip
  getAuditLog: adminProcedure
    .input(z.object({ packingSlipId: z.number() }))
    .query(async ({ input }) => {
      return db.getPackingSlipAuditLog(input.packingSlipId);
    }),
  // Generate packing slip retroactively for a paid protocol that's missing one
  generateForProtocol: adminProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .mutation(async ({ input }) => {
      const packingSlipId = await db.createPackingSlipOnPayment(input.clientProtocolId);
      if (!packingSlipId) {
        return { success: false, message: 'No shippable items found or packing slip already exists' };
      }
      return { success: true, packingSlipId, message: `Packing slip ${packingSlipId} created for protocol ${input.clientProtocolId}` };
    }),

  // Download single packing slip as PDF
  downloadPdf: adminProcedure
    .input(z.object({ packingSlipId: z.number() }))
    .mutation(async ({ input }) => {
      const { generatePackingSlipPdf } = await import('./packingSlipPdf');
      const pdfBuffer = await generatePackingSlipPdf(input.packingSlipId);
      const packingSlip = await db.getPackingSlipById(input.packingSlipId);
      const clientName = packingSlip?.clientName?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
      return {
        data: pdfBuffer.toString('base64'),
        filename: `packing_slip_${input.packingSlipId}_${clientName}.pdf`,
      };
    }),
  // Download multiple packing slips as a single PDF
  downloadBatchPdf: adminProcedure
    .input(z.object({ packingSlipIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const { generateBatchPackingSlipsPdf } = await import('./packingSlipPdf');
      const pdfBuffer = await generateBatchPackingSlipsPdf(input.packingSlipIds);
      const timestamp = new Date().toISOString().slice(0, 10);
      return {
        data: pdfBuffer.toString('base64'),
        filename: `packing_slips_batch_${timestamp}.pdf`,
      };
    }),
});

// ============ ONBOARDING ROUTER ============
const onboardingRouter = router({
  // Get settings (public for client dashboard)
  getSettings: publicProcedure.query(async () => {
    return db.getOnboardingSettings();
  }),
  
  // Update settings (admin only)
  updateSettings: adminProcedure
    .input(z.object({
      welcomeTitle: z.string().optional(),
      welcomeSubtitle: z.string().optional(),
      videoUrl: z.string().optional(),
      videoPlaceholderText: z.string().optional(),
      stepTwoTitle: z.string().optional(),
      stepTwoSubtitle: z.string().optional(),
      stepThreeTitle: z.string().optional(),
      ctaButtonText: z.string().optional(),
      persistentButtonText: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.upsertOnboardingSettings(input);
    }),
  
  // Get all categories (admin)
  getAllCategories: adminProcedure.query(async () => {
    return db.getAllOnboardingCategories();
  }),
  
  // Create category
  createCategory: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      icon: z.string().optional(),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createOnboardingCategory(input);
    }),
  
  // Update category
  updateCategory: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      icon: z.string().optional(),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateOnboardingCategory(id, data);
      return { success: true };
    }),
  
  // Delete category
  deleteCategory: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteOnboardingCategory(input.id);
      return { success: true };
    }),
  
  // Get all options (admin)
  getAllOptions: adminProcedure.query(async () => {
    return db.getAllOnboardingOptions();
  }),
  
  // Create option
  createOption: adminProcedure
    .input(z.object({
      categoryId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      ctaText: z.string().optional(),
      linkUrl: z.string().optional(),
      linkType: z.enum(["internal", "external", "modal"]).optional(),
      badge: z.string().optional(),
      badgeColor: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
      isPopular: z.boolean().optional(),
      isRecommended: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createOnboardingOption(input);
    }),
  
  // Update option
  updateOption: adminProcedure
    .input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      ctaText: z.string().optional(),
      linkUrl: z.string().optional(),
      linkType: z.enum(["internal", "external", "modal"]).optional(),
      badge: z.string().optional(),
      badgeColor: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
      isPopular: z.boolean().optional(),
      isRecommended: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateOnboardingOption(id, data);
      return { success: true };
    }),
  
  // Delete option
  deleteOption: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteOnboardingOption(input.id);
      return { success: true };
    }),
  
  // Get full onboarding data (public for client dashboard)
  getFullData: publicProcedure.query(async () => {
    return db.getFullOnboardingData();
  }),
  
  // Get user onboarding status with full option details
  getUserStatus: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserOnboardingStatusWithOptions(ctx.user.id);
  }),
  
  // Complete onboarding
  complete: protectedProcedure
    .input(z.object({
      selectedOptionIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.completeUserOnboarding(ctx.user.id, input.selectedOptionIds);
    }),
  
  // Update last viewed
  updateLastViewed: protectedProcedure.mutation(async ({ ctx }) => {
    return db.updateOnboardingLastViewed(ctx.user.id);
  }),
});

// ============ PROGRESS TRACKING ROUTER ============
const progressRouter = router({
  // Progress Photos
  uploadPhoto: protectedProcedure
    .input(z.object({
      imageData: z.string().min(1), // Base64 encoded image
      fileName: z.string().min(1),
      fileType: z.string().optional(),
      caption: z.string().optional(),
      category: z.enum(['before', 'progress', 'after', 'other']).optional(),
      clientProtocolId: z.number().optional(),
      takenAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import('./storage');
      const s3Key = `progress-photos/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const fileBuffer = Buffer.from(input.imageData, 'base64');
      const { url: imageUrl } = await storagePut(s3Key, fileBuffer, input.fileType);
      
      const id = await db.createProgressPhoto({
        userId: ctx.user.id,
        clientProtocolId: input.clientProtocolId,
        imageUrl,
        imageKey: s3Key,
        caption: input.caption,
        category: input.category || 'progress',
        takenAt: input.takenAt,
      });
      
      return { id, imageUrl };
    }),
  
  getPhotos: protectedProcedure
    .input(z.object({
      clientProtocolId: z.number().optional(),
      userId: z.number().optional(), // For admin to view client's photos
    }).optional())
    .query(async ({ ctx, input }) => {
      // Admin can view any user's photos, regular users can only view their own
      const targetUserId = (ctx.user.role === 'admin' && input?.userId) ? input.userId : ctx.user.id;
      return db.getProgressPhotosForUser(targetUserId, input?.clientProtocolId);
    }),
  
  deletePhoto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Note: S3 objects are not deleted to preserve history, just remove from DB
      await db.deleteProgressPhoto(input.id, ctx.user.id);
      return { success: true };
    }),
  
  // Journey Notes
  createNote: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      content: z.string().min(1),
      mood: z.enum(['great', 'good', 'okay', 'struggling', 'difficult']).optional(),
      energyLevel: z.number().min(1).max(10).optional(),
      sleepQuality: z.number().min(1).max(10).optional(),
      tags: z.array(z.string()).optional(),
      clientProtocolId: z.number().optional(),
      noteDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createJourneyNote({
        userId: ctx.user.id,
        clientProtocolId: input.clientProtocolId,
        title: input.title,
        content: input.content,
        mood: input.mood,
        energyLevel: input.energyLevel,
        sleepQuality: input.sleepQuality,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        noteDate: input.noteDate || new Date(),
      });
      return { id };
    }),
  
  getNotes: protectedProcedure
    .input(z.object({
      clientProtocolId: z.number().optional(),
      userId: z.number().optional(), // For admin to view client's notes
    }).optional())
    .query(async ({ ctx, input }) => {
      // Admin can view any user's notes, regular users can only view their own
      const targetUserId = (ctx.user.role === 'admin' && input?.userId) ? input.userId : ctx.user.id;
      const notes = await db.getJourneyNotesForUser(targetUserId, input?.clientProtocolId);
      return notes.map(note => ({
        ...note,
        tags: note.tags ? JSON.parse(note.tags as string) : [],
      }));
    }),
  
  updateNote: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      mood: z.enum(['great', 'good', 'okay', 'struggling', 'difficult']).optional(),
      energyLevel: z.number().min(1).max(10).optional(),
      sleepQuality: z.number().min(1).max(10).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...data } = input;
      await db.updateJourneyNote(id, ctx.user.id, {
        ...data,
        tags: tags ? JSON.stringify(tags) : undefined,
      });
      return { success: true };
    }),
  
  deleteNote: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteJourneyNote(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ============ UPLOAD ROUTER ============
const uploadRouter = router({
  uploadImage: adminProcedure
    .input(z.object({
      base64Data: z.string().min(1), // Base64 encoded image (with data URL prefix)
      fileName: z.string().min(1),
      folder: z.string().optional(), // Optional folder path like 'category-icons'
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import('./storage');
      
      // Extract the actual base64 data if it has a data URL prefix
      const base64Match = input.base64Data.match(/^data:([^;]+);base64,(.+)$/);
      let contentType = 'image/png';
      let base64Content = input.base64Data;
      
      if (base64Match) {
        contentType = base64Match[1];
        base64Content = base64Match[2];
      }
      
      const folder = input.folder || 'uploads';
      const s3Key = `${folder}/${Date.now()}-${input.fileName}`;
      const fileBuffer = Buffer.from(base64Content, 'base64');
      const { url } = await storagePut(s3Key, fileBuffer, contentType);
      
      return { url, key: s3Key };
    }),
});

// ============ INBOX ROUTER ============
const inboxRouter = router({
  // Get all conversations with latest message and unread counts
  conversations: adminProcedure.query(async () => {
    return db.getInboxConversations();
  }),
  // Get total unread count for badge
  totalUnread: adminProcedure.query(async () => {
    const count = await db.getTotalUnreadMessageCount();
    return { count };
  }),
  // Mark a conversation as read (reuses existing markCommentsAsRead)
  markRead: adminProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .mutation(async ({ input }) => {
      await db.markCommentsAsRead(input.clientProtocolId, 'coach');
      return { success: true };
    }),
  // Get client last seen time
  clientLastSeen: adminProcedure
    .input(z.object({ clientEmail: z.string() }))
    .query(async ({ input }) => {
      const lastSeenAt = await db.getClientLastSeen(input.clientEmail);
      return { lastSeenAt };
    }),
  // Client heartbeat - updates lastSeenAt for the current user
  heartbeat: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user?.id) {
        await db.updateUserLastSeen(ctx.user.id);
      }
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      // Clear the cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      
      // Also invalidate the session in the database
      if (ctx.user) {
        try {
          const dbConn = await getDb();
          if (!dbConn) throw new Error('Database not available');
          const { userSessions } = await import('../drizzle/schema');
          await dbConn.delete(userSessions).where(eq(userSessions.userId, ctx.user.id));
          console.log(`[Auth] Sessions invalidated for user ${ctx.user.id}`);
        } catch (e) {
          console.error('[Auth] Failed to invalidate sessions:', e);
        }
      }
      return {
        success: true,
      } as const;
    }),
    
    // Password reset/set endpoints
    verifyPasswordToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const result = await verifyPasswordResetToken(input.token);
        return result;
      }),
    
    setPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        password: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        // Verify token first
        const tokenResult = await verifyPasswordResetToken(input.token);
        if (!tokenResult.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: tokenResult.error || "Invalid token",
          });
        }
        
        // Hash the password
        const bcrypt = await import("bcryptjs");
        const hashedPassword = await bcrypt.hash(input.password, 12);
        
        // Update user password in passwordHash column
        const dbConn = await getDb();
        await dbConn!.update(users)
          .set({ passwordHash: hashedPassword, loginMethod: "password" } as any)
          .where(eq(users.id, tokenResult.userId!));
        
        // Mark token as used
        await markPasswordResetTokenUsed(input.token);
        
        return { success: true };
      }),
    
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        // Find user by email
        const user = await getUserByEmailForPasswordReset(input.email);
        
        if (user) {
          // Create reset token
          const token = await createPasswordResetToken(
            user.id,
            user.email!,
            "reset_password"
          );
          
          // Send reset email
          const resetUrl = `${process.env.VITE_APP_URL}/set-password?token=${token}`;
          await sendEmail({
            to: user.email!,
            subject: "Reset Your Password - Peptide Coach",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ea580c;">Reset Your Password</h2>
                <p>Hi ${user.name || "there"},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <p style="margin: 30px 0;">
                  <a href="${resetUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
                </p>
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="color: #999; font-size: 12px;">Peptide Coach - Omega Longevity</p>
              </div>
            `,
          });
        }
        
        // Always return success to prevent email enumeration
        return { success: true };
      }),
    
    // Change password (for logged-in users)
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ ctx, input }) => {
        const bcrypt = await import("bcryptjs");
        
        // Get user's current password
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbInstance = await db.getDb();
        const [user] = await dbInstance!.select().from(users).where(eq(users.id, ctx.user.id));
        
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        // Check if user has a password set
        const currentHash = user.passwordHash || (user.loginMethod?.startsWith("password:") ? user.loginMethod.replace("password:", "") : null);
        if (!currentHash) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "No password set. Please use the forgot password flow to set a password." 
          });
        }
        
        // Verify current password
        const isValid = await bcrypt.compare(input.currentPassword, currentHash);
        
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }
        
        // Hash new password
        const newHash = await bcrypt.hash(input.newPassword, 12);
        
        // Update password in passwordHash column
        await dbInstance!.update(users)
          .set({ passwordHash: newHash, loginMethod: "password" } as any)
          .where(eq(users.id, ctx.user.id));
        
        return { success: true };
      }),
    
    // Get user's active sessions
    getSessions: protectedProcedure
      .query(async ({ ctx }) => {
        const sessions = await db.getUserSessions(ctx.user.id);
        
        // Get current session token from cookie to mark it
        const currentToken = ctx.req.cookies?.[COOKIE_NAME];
        
        return sessions.map(session => ({
          ...session,
          isCurrent: session.sessionToken === currentToken,
        }));
      }),
    
    // Revoke a specific session
    revokeSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.revokeSession(input.sessionId, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        }
        return { success: true };
      }),
    
    // Update user name
    updateName: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, { name: input.name });
        return { success: true };
      }),
    
    // Revoke all other sessions
    revokeAllOtherSessions: protectedProcedure
      .mutation(async ({ ctx }) => {
        const currentToken = ctx.req.cookies?.[COOKIE_NAME] || "";
        const count = await db.revokeAllOtherSessions(ctx.user.id, currentToken);
        return { success: true, count };
      }),
  }),
  category: categoryRouter,
  protocolItem: protocolItemRouter,
  template: templateRouter,
  clientProtocol: clientProtocolRouter,
  requirements: requirementsRouter,
  users: userRouter,
  notifications: notificationRouter,
  program: programRouter,
  affiliate: affiliateRouter,
  comments: commentsRouter,
  coachingPackages: coachingPackagesRouter,
  hubLinks: hubLinksRouter,
  // stripe: stripeRouter, // REMOVED - Using Venmo only
  orders: ordersRouter, // Order queries and management
  // Healthie integration removed - no license available
  // PayPal and Venmo removed - migrating to Stripe
  payment: paymentRouter,
  paymentHistory: paymentHistoryRouter,
  paymentAnalytics: paymentAnalyticsRouter,
  bulkPaymentActions: bulkPaymentActionsRouter,
  paymentExport: paymentExportRouter,
  paymentReconciliation: paymentReconciliationRouter,
  refund: refundRouter,
  booking: bookingRouter,
  calendly: calendlyRouter,
  outlook: outlookRouter,
  // referral router removed - dead code cleaned up
  launchpad: launchpadRouter,
  inventory: inventoryRouter,
  waiver: waiverRouter,
  ageDisclaimer: ageDisclaimerRouter,
  settings: settingsRouter,
  revenueGoals: revenueGoalsRouter,
  adminSettings: adminSettingsRouter,
  protocolPresets: protocolPresetsRouter,
  emailTemplates: emailTemplatesRouter,
  emailReportSettings: emailReportSettingsRouter,
  dashboardPreferences: dashboardPreferencesRouter,
  emailEngagement: emailEngagementRouter,
  paymentEvents: paymentEventsRouter,
  clientPaymentPortal: clientPaymentPortalRouter,
  bulkProfileReminder: bulkProfileReminderRouter,
  affiliatePartners: affiliatePartnersRouter,
  coupon: couponRouter,
  emailTracking: emailTrackingRouter,
  packingSlip: packingSlipRouter,
  onboarding: onboardingRouter,
  progress: progressRouter,
  upload: uploadRouter,
  // Client Corner routers
  checkin: checkinRouter,
  document: documentRouter,
  clientInventory: clientInventoryRouter,
  clientMetrics: metricsRouter,
  achievements: achievementsRouter,
  notificationHistory: notificationHistoryRouter,
  inbox: inboxRouter,
  transformation: transformationRouter,
  externalIntegrations: externalIntegrationsRouter,
  promoCode: promoCodeRouter,
  storePromo: storePromoRouter,
  prospect: prospectRouter,
  client360: client360Router,
  webTraffic: webTrafficRouter,
  protocolSections: router({
    // Get all sections for a protocol (public - needed for client protocol view)
    getAll: publicProcedure
      .input(z.object({ clientProtocolId: z.number() }))
      .query(async ({ input }) => {
        return db.getProtocolSections(input.clientProtocolId);
      }),

    // Get a specific section (public - needed for client protocol view)
    get: publicProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        sectionType: z.enum(["periodization", "training_split", "program_guide"]),
      }))
      .query(async ({ input }) => {
        return db.getProtocolSection(input.clientProtocolId, input.sectionType);
      }),

    // Upsert section content (admin only)
    upsert: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        sectionType: z.enum(["periodization", "training_split", "program_guide"]),
        isEnabled: z.boolean().optional(),
        content: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.upsertProtocolSection(
          input.clientProtocolId,
          input.sectionType,
          { isEnabled: input.isEnabled, content: input.content }
        );
      }),

    // Toggle section visibility (admin only)
    toggle: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        sectionType: z.enum(["periodization", "training_split", "program_guide"]),
        isEnabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        return db.toggleProtocolSection(
          input.clientProtocolId,
          input.sectionType,
          input.isEnabled
        );
      }),

    // ============ SECTION TEMPLATES ============

    // Get all templates (optionally filtered by section type)
    getTemplates: adminProcedure
      .input(z.object({ sectionType: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.getSectionTemplates(input?.sectionType);
      }),

    // Save current sections as a master template
    saveAsTemplate: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        templateName: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        return db.saveAllSectionsAsTemplate(input.clientProtocolId, input.templateName);
      }),

    // Save a single section as a template
    saveSingleTemplate: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        sectionType: z.string(),
        content: z.any(),
      }))
      .mutation(async ({ input }) => {
        return db.saveSectionTemplate(input.name, input.sectionType, input.content);
      }),

    // Load a template into a client's protocol
    loadTemplate: adminProcedure
      .input(z.object({
        templateId: z.number(),
        clientProtocolId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.loadTemplateIntoProtocol(input.templateId, input.clientProtocolId);
      }),

    // Delete a template
    deleteTemplate: adminProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSectionTemplate(input.templateId);
        return { success: true };
      }),
  }),
  bulkShipping: router({
    update: adminProcedure
      .input(z.object({
        updates: z.array(z.object({
          email: z.string().email(),
          shippingName: z.string().optional(),
          shippingStreet: z.string().optional(),
          shippingCity: z.string().optional(),
          shippingState: z.string().optional(),
          shippingZip: z.string().optional(),
          shippingCountry: z.string().optional(),
          shippingPhone: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const results = { updated: 0, notFound: 0, errors: [] as string[] };
        
        for (const update of input.updates) {
          try {
            const updated = await db.updateClientShippingByEmail(update.email, {
              shippingName: update.shippingName,
              shippingStreet: update.shippingStreet,
              shippingCity: update.shippingCity,
              shippingState: update.shippingState,
              shippingZip: update.shippingZip,
              shippingCountry: update.shippingCountry,
              shippingPhone: update.shippingPhone,
            });
            if (updated) {
              results.updated++;
            } else {
              results.notFound++;
            }
          } catch (error) {
            results.errors.push(`Error updating ${update.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        return results;
      }),
  }),
  // Back-Office Client Project Management
  lifecycleStage: router({
    list: adminProcedure.query(async () => {
      return db.getAllLifecycleStages();
    }),
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getLifecycleStageById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createLifecycleStage(input);
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateLifecycleStage(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLifecycleStage(input.id);
        return { success: true };
      }),
  }),
  teamRole: router({
    list: adminProcedure.query(async () => {
      return db.getAllTeamRoles();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTeamRole(input);
        return { id };
      }),
  }),
  teamMember: router({
    list: adminProcedure.query(async () => {
      return db.getAllTeamMembers();
    }),
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getTeamMemberById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().optional(),
        roleId: z.number().optional(),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTeamMember(input);
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        roleId: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTeamMember(id, data);
        return { success: true };
      }),
    linkUser: adminProcedure
      .input(z.object({
        teamMemberId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Check if this userId is already linked to another team member
        const existing = await db.getTeamMemberByUserId(input.userId);
        if (existing && existing.id !== input.teamMemberId) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `This user account is already linked to team member: ${existing.name}`,
          });
        }
        await db.updateTeamMember(input.teamMemberId, { userId: input.userId });
        return { success: true };
      }),
    unlinkUser: adminProcedure
      .input(z.object({
        teamMemberId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.updateTeamMember(input.teamMemberId, { userId: null } as any);
        return { success: true };
      }),
  }),
  workflowTemplate: router({
    list: adminProcedure.query(async () => {
      return db.getAllWorkflowTemplates();
    }),
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getWorkflowTemplateById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        durationDays: z.number().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createWorkflowTemplate(input);
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        durationDays: z.number().optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateWorkflowTemplate(id, data);
        return { success: true };
      }),
    getTasks: adminProcedure
      .input(z.object({ workflowTemplateId: z.number() }))
      .query(async ({ input }) => {
        return db.getWorkflowTemplateTasks(input.workflowTemplateId);
      }),
    createTask: adminProcedure
      .input(z.object({
        workflowTemplateId: z.number(),
        lifecycleStageId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        defaultOwnerRoleId: z.number().optional(),
        sortOrder: z.number().optional(),
        dueDaysFromStart: z.number().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createWorkflowTemplateTask(input);
        return { id };
      }),
    getSubtasks: adminProcedure
      .input(z.object({ workflowTemplateTaskId: z.number() }))
      .query(async ({ input }) => {
        return db.getWorkflowTemplateSubtasks(input.workflowTemplateTaskId);
      }),
    createSubtask: adminProcedure
      .input(z.object({
        workflowTemplateTaskId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        defaultOwnerRoleId: z.number().optional(),
        sortOrder: z.number().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createWorkflowTemplateSubtask(input);
        return { id };
      }),
    updateTask: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        lifecycleStageId: z.number().optional(),
        defaultOwnerRoleId: z.number().optional(),
        sortOrder: z.number().optional(),
        dueDaysFromStart: z.number().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateWorkflowTemplateTask(id, data);
        return { success: true };
      }),
    deleteTask: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWorkflowTemplateTask(input.id);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWorkflowTemplate(input.id);
        return { success: true };
      }),
    updateSubtask: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        defaultOwnerRoleId: z.number().optional(),
        sortOrder: z.number().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateWorkflowTemplateSubtask(id, data);
        return { success: true };
      }),
    deleteSubtask: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWorkflowTemplateSubtask(input.id);
        return { success: true };
      }),
    seedDefaults: adminProcedure
      .mutation(async () => {
        const result = await db.seedDefaultWorkflowTemplates();
        return result;
      }),
  }),
  clientProject: router({
    list: adminProcedure.query(async () => {
      return db.getAllClientProjectsWithProgress();
    }),
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const project = await db.getClientProjectById(input.id);
        if (!project) return null;
        const progress = await db.getProjectProgress(input.id);
        return { ...project, progress };
      }),
    getByStatus: adminProcedure
      .input(z.object({ status: z.enum(["active", "on_hold", "completed", "cancelled"]) }))
      .query(async ({ input }) => {
        return db.getClientProjectsByStatus(input.status);
      }),
    getByLifecycleStage: adminProcedure
      .input(z.object({ stageId: z.number() }))
      .query(async ({ input }) => {
        return db.getClientProjectsByLifecycleStage(input.stageId);
      }),
    getByTeamMember: adminProcedure
      .input(z.object({ teamMemberId: z.number() }))
      .query(async ({ input }) => {
        return db.getClientProjectsByTeamMember(input.teamMemberId);
      }),
    create: adminProcedure
      .input(z.object({
        clientName: z.string().min(1),
        clientEmail: z.string().optional(),
        clientProtocolId: z.number().optional(),
        workflowTemplateId: z.number().optional(),
        currentLifecycleStageId: z.number().optional(),
        status: z.enum(["active", "on_hold", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        startDate: z.date().optional(),
        targetEndDate: z.date().optional(),
        assignedTeamMemberId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Find or create unified contact record
        let contactId: number | null = null;
        try {
          const { findOrCreateContact } = await import('./contacts/contactService');
          const nameParts = input.clientName.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          const contact = await findOrCreateContact({
            email: input.clientEmail || undefined,
            firstName,
            lastName,
          });
          contactId = contact.id;
        } catch (e) { console.error('[ClientProject] Contact link error:', e); }

        // If no lifecycle stage specified, default to Intake
        let projectData: any = { ...input, contactId };
        if (!projectData.currentLifecycleStageId) {
          const lifecycleStages = await db.getAllLifecycleStages();
          const intakeStage = lifecycleStages.find(s => s.name === 'Intake');
          if (intakeStage) {
            projectData.currentLifecycleStageId = intakeStage.id;
          }
        }
        
        const id = await db.createClientProject(projectData);
        
        // If workflow template specified, apply it
        if (input.workflowTemplateId) {
          await db.applyWorkflowTemplateToProject(id, input.workflowTemplateId);
        }
        
        // Log activity
        await db.createProjectActivityLog({
          clientProjectId: id,
          actionType: "project_created",
          description: `Project created for ${input.clientName}`,
        });
        
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        clientName: z.string().optional(),
        clientEmail: z.string().optional(),
        currentLifecycleStageId: z.number().optional(),
        status: z.enum(["active", "on_hold", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        startDate: z.date().optional(),
        targetEndDate: z.date().optional(),
        actualEndDate: z.date().optional(),
        assignedTeamMemberId: z.number().optional(),
        clientProtocolId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const oldProject = await db.getClientProjectById(id);
        await db.updateClientProject(id, data);
        
        // Log stage change
        if (data.currentLifecycleStageId && oldProject?.currentLifecycleStageId !== data.currentLifecycleStageId) {
          await db.createProjectActivityLog({
            clientProjectId: id,
            actionType: "stage_changed",
            description: `Lifecycle stage changed`,
          });
        }
        
        // Log status change
        if (data.status && oldProject?.status !== data.status) {
          await db.createProjectActivityLog({
            clientProjectId: id,
            actionType: "status_changed",
            description: `Status changed to ${data.status}`,
          });
        }
        
        // Propagate name/email changes to master contact and all linked records
        const hasContactInfoChange = input.clientName !== undefined || input.clientEmail !== undefined;
        if (hasContactInfoChange) {
          try {
            const project = oldProject || await db.getClientProjectById(id);
            if (project?.contactId) {
              const { propagateContactChanges } = await import('./contacts/propagateContactChanges');
              await propagateContactChanges({
                contactId: project.contactId,
                ...(input.clientName !== undefined ? { name: input.clientName } : {}),
                ...(input.clientEmail !== undefined ? { email: input.clientEmail } : {}),
              });
              console.log(`[clientProject.update] Propagated contact changes for project ${id} \u2192 contact ${project.contactId}`);
            } else {
              console.warn(`[clientProject.update] Project ${id} has no contactId \u2014 changes not propagated`);
            }
          } catch (propError) {
            console.error('[clientProject.update] Contact propagation error:', propError);
          }
        }
        
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteClientProject(input.id);
        return { success: true };
      }),
    // Sync all existing clients to client projects as inactive
    syncClientsToProjects: adminProcedure
      .mutation(async () => {
        // Get all clients that don't have a clientProjectId yet
        const allClients = await db.getAllClients();
        const clientsWithoutProject = allClients.filter(c => !c.clientProjectId && !c.deletedAt);
        
        let synced = 0;
        let skipped = 0;
        
        for (const client of clientsWithoutProject) {
          try {
            // Check if there's already a client project with matching email
            const existingProjects = await db.getAllClientProjectsWithProgress();
            const existingProject = existingProjects.find(
              p => p.clientEmail?.toLowerCase() === client.email?.toLowerCase() ||
                   p.clientName.toLowerCase() === client.name.toLowerCase()
            );
            
            if (existingProject) {
              // Link existing project to client
              await db.updateClient(client.id, {
                clientProjectId: existingProject.id,
                isActiveInProjects: existingProject.status === 'active',
              });
              skipped++;
            } else {
              // Get the Intake lifecycle stage (first stage)
              const lifecycleStages = await db.getAllLifecycleStages();
              const intakeStage = lifecycleStages.find(s => s.name === 'Intake');
              
              // Create new project with on_hold status (inactive) and Intake stage
              const projectId = await db.createClientProject({
                clientName: client.name,
                clientEmail: client.email || undefined,
                status: 'on_hold', // Inactive by default
                currentLifecycleStageId: intakeStage?.id || undefined,
              });
              
              // Auto-apply workflow template if client has a protocol
              try {
                const { autoApplyWorkflowTemplate } = await import('./autoApplyWorkflowTemplate');
                await autoApplyWorkflowTemplate(projectId);
              } catch (templateError) {
                console.error(`[syncClientsToProjects] Failed to auto-apply template for project ${projectId}:`, templateError);
              }
              
              // Link client to the new project
              await db.updateClient(client.id, {
                clientProjectId: projectId,
                isActiveInProjects: false,
              });
              synced++;
            }
          } catch (err) {
            console.error(`[syncClientsToProjects] Failed to sync client ${client.id}:`, err);
          }
        }
        
        return { synced, skipped, total: clientsWithoutProject.length };
      }),
    applyTemplate: adminProcedure
      .input(z.object({
        clientProjectId: z.number(),
        workflowTemplateId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.applyWorkflowTemplateToProject(input.clientProjectId, input.workflowTemplateId);
        return { success: true };
      }),
    backfillTemplates: adminProcedure
      .mutation(async () => {
        // Find all active projects without a workflow template
        const allProjects = await db.getAllClientProjectsWithProgress();
        const projectsWithoutTemplate = allProjects.filter(
          p => !p.workflowTemplateId && (p.status === 'active' || p.status === 'on_hold')
        );
        
        let applied = 0;
        let skipped = 0;
        const results: Array<{ projectId: number; clientName: string; result: string }> = [];
        
        const { autoApplyWorkflowTemplate } = await import('./autoApplyWorkflowTemplate');
        
        for (const project of projectsWithoutTemplate) {
          try {
            const result = await autoApplyWorkflowTemplate(project.id, project.clientProtocolId);
            if (result.applied) {
              applied++;
              results.push({ projectId: project.id, clientName: project.clientName, result: result.reason });
            } else {
              skipped++;
              results.push({ projectId: project.id, clientName: project.clientName, result: result.reason });
            }
          } catch (err) {
            skipped++;
            results.push({ projectId: project.id, clientName: project.clientName, result: `Error: ${(err as Error).message}` });
          }
        }
        
        console.log(`[backfillTemplates] Applied: ${applied}, Skipped: ${skipped}, Total: ${projectsWithoutTemplate.length}`);
        return { applied, skipped, total: projectsWithoutTemplate.length, results };
      }),
    // Tasks
    getTasks: adminProcedure
      .input(z.object({ clientProjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectTasks(input.clientProjectId);
      }),
    getAllTasks: adminProcedure
      .query(async () => {
        return db.getAllProjectTasks();
      }),
    createTask: adminProcedure
      .input(z.object({
        clientProjectId: z.number(),
        lifecycleStageId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        assignedTeamMemberId: z.number().optional(),
        dueDate: z.date().optional(),
        sortOrder: z.number().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createProjectTask(input);
        await db.createProjectActivityLog({
          clientProjectId: input.clientProjectId,
          actionType: "task_created",
          description: `Task "${input.name}" created`,
        });
        return { id };
      }),
    updateTask: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["pending", "in_progress", "completed", "blocked", "skipped"]).optional(),
        assignedTeamMemberId: z.number().optional(),
        dueDate: z.string().nullable().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, dueDate, ...restData } = input;
        const data: any = { ...restData };
        
        // Convert dueDate string to Date or null
        if (dueDate !== undefined) {
          data.dueDate = dueDate ? new Date(dueDate) : null;
        }
        
        const oldTask = await db.getProjectTaskById(id);
        
        // If completing task, set completedAt
        if (data.status === "completed" && oldTask?.status !== "completed") {
          (data as any).completedAt = new Date();
        }
        
        await db.updateProjectTask(id, data);
        
        // Notify team member if task is assigned to them
        if (data.assignedTeamMemberId && oldTask && data.assignedTeamMemberId !== oldTask.assignedTeamMemberId) {
          await db.notifyTaskAssignment(id, data.assignedTeamMemberId, oldTask.name, oldTask.clientProjectId);
          await db.createProjectActivityLog({
            clientProjectId: oldTask.clientProjectId,
            actionType: "task_assigned",
            description: `Task "${oldTask.name}" assigned to team member`,
          });
        }
        
        if (data.status === "completed" && oldTask) {
          await db.createProjectActivityLog({
            clientProjectId: oldTask.clientProjectId,
            actionType: "task_completed",
            description: `Task "${oldTask.name}" completed`,
          });
        }
        
        return { success: true };
      }),
    deleteTask: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectTask(input.id);
        return { success: true };
      }),
    reorderTasks: adminProcedure
      .input(z.object({
        taskIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        // Update sortOrder for each task based on its position in the array
        for (let i = 0; i < input.taskIds.length; i++) {
          await db.updateProjectTask(input.taskIds[i], { sortOrder: i });
        }
        return { success: true };
      }),
    reorderSubtasks: adminProcedure
      .input(z.object({
        subtaskIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        // Update sortOrder for each subtask based on its position in the array
        for (let i = 0; i < input.subtaskIds.length; i++) {
          await db.updateProjectSubtask(input.subtaskIds[i], { sortOrder: i });
        }
        return { success: true };
      }),
    // Subtasks
    getSubtasks: adminProcedure
      .input(z.object({ projectTaskId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectSubtasks(input.projectTaskId);
      }),
    createSubtask: adminProcedure
      .input(z.object({
        projectTaskId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        assignedTeamMemberId: z.number().optional(),
        dueDate: z.date().optional(),
        sortOrder: z.number().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createProjectSubtask(input);
        const task = await db.getProjectTaskById(input.projectTaskId);
        if (task) {
          await db.createProjectActivityLog({
            clientProjectId: task.clientProjectId,
            actionType: "subtask_created",
            description: `Subtask "${input.name}" created`,
          });
        }
        return { id };
      }),
    updateSubtask: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["pending", "in_progress", "completed", "blocked", "skipped"]).optional(),
        assignedTeamMemberId: z.number().nullable().optional(),
        dueDate: z.date().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const oldSubtask = await db.getProjectSubtaskById(id);
        
        // If completing subtask, set completedAt
        if (data.status === "completed" && oldSubtask?.status !== "completed") {
          (data as any).completedAt = new Date();
        }
        
        await db.updateProjectSubtask(id, data);
        
        // Send email notification if team member is newly assigned
        if (data.assignedTeamMemberId && data.assignedTeamMemberId !== oldSubtask?.assignedTeamMemberId) {
          try {
            const teamMember = await db.getTeamMemberById(data.assignedTeamMemberId);
            if (teamMember?.email) {
              const task = await db.getProjectTaskById(oldSubtask?.projectTaskId || 0);
              const project = task ? await db.getClientProjectById(task.clientProjectId) : null;
              
              const { sendSubtaskAssignmentNotification } = await import('./emailService');
              const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
              
              await sendSubtaskAssignmentNotification({
                to: teamMember.email,
                teamMemberName: teamMember.name,
                subtaskName: oldSubtask?.name || 'Subtask',
                taskName: task?.name || 'Task',
                projectName: `Project for ${project?.clientName}` || 'Project',
                clientName: project?.clientName || 'Client',
                dueDate: data.dueDate || oldSubtask?.dueDate,
                assignedByName: ctx.user?.name || 'Admin',
                projectUrl: project ? `${baseUrl}/admin/projects/${project.id}` : undefined,
              });
              
              // Log the assignment
              if (project) {
                await db.createProjectActivityLog({
                  clientProjectId: project.id,
                  actionType: "subtask_assigned",
                  description: `Subtask "${oldSubtask?.name}" assigned to ${teamMember.name}`,
                });
              }
            }
          } catch (error) {
            console.error('[Subtask] Failed to send assignment notification:', error);
            // Don't fail the mutation if email fails
          }
        }
        
        if (data.status === "completed" && oldSubtask) {
          const task = await db.getProjectTaskById(oldSubtask.projectTaskId);
          if (task) {
            await db.createProjectActivityLog({
              clientProjectId: task.clientProjectId,
              actionType: "subtask_completed",
              description: `Subtask "${oldSubtask.name}" completed`,
            });
          }
        }
        
        return { success: true };
      }),
    deleteSubtask: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectSubtask(input.id);
        return { success: true };
      }),
    // Notes
    getNotes: adminProcedure
      .input(z.object({ clientProjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectNotes(input.clientProjectId);
      }),
    createNote: adminProcedure
      .input(z.object({
        clientProjectId: z.number(),
        content: z.string().min(1),
        noteType: z.enum(["general", "decision", "handoff", "issue", "update"]).optional(),
        authorTeamMemberId: z.number().optional(),
        authorName: z.string().optional(),
        isPinned: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createProjectNote(input);
        await db.createProjectActivityLog({
          clientProjectId: input.clientProjectId,
          actionType: "note_added",
          description: `Note added`,
        });
        return { id };
      }),
    updateNote: adminProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().optional(),
        noteType: z.enum(["general", "decision", "handoff", "issue", "update"]).optional(),
        isPinned: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProjectNote(id, data);
        return { success: true };
      }),
    deleteNote: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectNote(input.id);
        return { success: true };
      }),
    // Activity Log
    getActivityLog: adminProcedure
      .input(z.object({ clientProjectId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getProjectActivityLog(input.clientProjectId, input.limit);
      }),
    // Tracking Info
    getTrackingInfo: adminProcedure
      .input(z.object({ clientProjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectTrackingInfo(input.clientProjectId);
      }),
    createTrackingInfo: adminProcedure
      .input(z.object({
        clientProjectId: z.number(),
        trackingNumber: z.string().min(1),
        carrier: z.string().optional(),
        carrierUrl: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["pending", "in_transit", "delivered", "exception"]).optional(),
        estimatedDelivery: z.date().optional(),
        createdByTeamMemberId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createProjectTrackingInfo(input);
        await db.createProjectActivityLog({
          clientProjectId: input.clientProjectId,
          actionType: "project_updated",
          description: `Tracking number added: ${input.trackingNumber}`,
        });
        return { id };
      }),
    updateTrackingInfo: adminProcedure
      .input(z.object({
        id: z.number(),
        trackingNumber: z.string().optional(),
        carrier: z.string().optional(),
        carrierUrl: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["pending", "in_transit", "delivered", "exception"]).optional(),
        estimatedDelivery: z.date().optional(),
        deliveredAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProjectTrackingInfo(id, data);
        return { success: true };
      }),
    deleteTrackingInfo: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectTrackingInfo(input.id);
        return { success: true };
      }),
    // Attachments
    getAttachments: adminProcedure
      .input(z.object({ clientProjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectAttachments(input.clientProjectId);
      }),
    createAttachment: adminProcedure
      .input(z.object({
        clientProjectId: z.number(),
        fileName: z.string().min(1),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
        fileData: z.string().min(1), // Base64 encoded file data
        category: z.enum(["document", "image", "receipt", "packing_slip", "lab_results", "other"]).optional(),
        description: z.string().optional(),
        uploadedByTeamMemberId: z.number().optional(),
        uploadedByName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Upload to S3
        const { storagePut } = await import("./storage");
        const s3Key = `project-attachments/${input.clientProjectId}/${Date.now()}-${input.fileName}`;
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const { url: s3Url } = await storagePut(s3Key, fileBuffer, input.fileType);
        
        const id = await db.createProjectAttachment({
          clientProjectId: input.clientProjectId,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          s3Key,
          s3Url,
          category: input.category,
          description: input.description,
          uploadedByTeamMemberId: input.uploadedByTeamMemberId,
          uploadedByName: input.uploadedByName,
        });
        await db.createProjectActivityLog({
          clientProjectId: input.clientProjectId,
          actionType: "project_updated",
          description: `File uploaded: ${input.fileName}`,
        });
        return { id };
      }),
    deleteAttachment: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectAttachment(input.id);
        return { success: true };
      }),
  }),
  // Team Notifications
  teamNotification: router({
    list: adminProcedure
      .input(z.object({ teamMemberId: z.number() }))
      .query(async ({ input }) => {
        return db.getTeamNotificationsForMember(input.teamMemberId);
      }),
    unreadCount: adminProcedure
      .input(z.object({ teamMemberId: z.number() }))
      .query(async ({ input }) => {
        return db.getUnreadTeamNotificationCount(input.teamMemberId);
      }),
    markAsRead: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markTeamNotificationAsRead(input.id);
        return { success: true };
      }),
    markAllAsRead: adminProcedure
      .input(z.object({ teamMemberId: z.number() }))
      .mutation(async ({ input }) => {
        await db.markAllTeamNotificationsAsRead(input.teamMemberId);
        return { success: true };
      }),
    getOverdueTasks: adminProcedure
      .query(async () => {
        return db.getOverdueTasks();
      }),
    getTasksApproachingDeadline: adminProcedure
      .query(async () => {
        return db.getTasksApproachingDeadline();
      }),
    getPreferences: adminProcedure
      .input(z.object({ teamMemberId: z.number() }))
      .query(async ({ input }) => {
        return db.getTeamNotificationPreferences(input.teamMemberId);
      }),
    updatePreferences: adminProcedure
      .input(z.object({
        teamMemberId: z.number(),
        preferences: z.record(z.boolean()),
      }))
      .mutation(async ({ input }) => {
        await db.updateTeamNotificationPreferences(input.teamMemberId, input.preferences);
        return { success: true };
      }),
  }),
  // Store Orders router for order history
  storeOrders: router({
    // Get current user's order history
    myOrders: protectedProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) return [];
        const orders = await db.getUserStoreOrders(userId);
        // Get items for each order
        const ordersWithItems = await Promise.all(
          orders.map(async (order) => {
            const items = await db.getStoreOrderItems(order.id);
            return { ...order, items };
          })
        );
        return ordersWithItems;
      }),
    // Get a single order by ID (for current user)
    getOrder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) return null;
        const order = await db.getStoreOrder(input.orderId);
        if (!order || order.userId !== userId) return null;
        const items = await db.getStoreOrderItems(order.id);
        return { ...order, items };
      }),
    // Admin: Get all orders
    adminList: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"]).optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        // Get all store orders with their items
        const allOrders = await db.getAllStoreOrders(input?.status, input?.limit);
        return allOrders;
      }),
    // Admin: Update order status
    updateStatus: adminProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"]),
      }))
      .mutation(async ({ input }) => {
        // Get the current order to check if this is a status change to "paid"
        const order = await db.getStoreOrder(input.orderId);
        if (!order) {
          throw new Error("Order not found");
        }
        
        const wasNotPaid = order.status !== "paid";
        const isBecomingPaid = input.status === "paid";
        
        // Update the status
        await db.updateStoreOrderStatus(input.orderId, input.status);
        
        // If order is being marked as paid (e.g., Venmo payment verified), trigger inventory deduction and email
        if (wasNotPaid && isBecomingPaid) {
          console.log(`[Store Order] Order #${input.orderId} marked as paid, processing inventory and email...`);
          
          // Deduct inventory
          try {
            await db.deductInventoryForStoreOrder(input.orderId, order.userId);
            console.log(`[Store Order] Inventory deducted for order #${input.orderId}`);
          } catch (invError) {
            console.error(`[Store Order] Failed to deduct inventory for order #${input.orderId}:`, invError);
          }
          
          // Auto-sync client inventory status (updates Client Corner "My Inventory" to "full")
          if (order.userId) {
            try {
              const syncResult = await db.syncClientInventoryFromStoreOrder(input.orderId, order.userId);
              console.log(`[Store Order] Client inventory synced: ${syncResult.updatedCount} items updated`);
            } catch (syncError) {
              console.error(`[Store Order] Client inventory sync failed (non-critical):`, syncError);
            }
          }
          
          // Send confirmation email
          try {
            const { sendStoreOrderConfirmationEmail } = await import('./payment/emailService');
            const orderItems = await db.getStoreOrderItems(input.orderId);
            const user = await db.getUserById(order.userId);
            
            if (user?.email) {
              await sendStoreOrderConfirmationEmail({
                customerName: user.name || "Customer",
                customerEmail: user.email,
                orderId: input.orderId,
                paypalOrderId: order.venmoTransactionId || undefined,
                items: orderItems.map(item => ({
                  name: item.name,
                  quantity: item.quantity,
                  pricePerUnit: item.pricePerUnit,
                  isDiscountable: item.isDiscountable,
                })),
                subtotal: order.subtotal,
                discountAmount: order.discountAmount,
                shippingFee: order.shippingFee?.toString() || "0.00",
                total: order.total,
                paymentMethod: order.paymentMethod || "venmo",
                orderDate: order.createdAt,
              });
              console.log(`[Store Order] Confirmation email sent to ${user.email} for order #${input.orderId}`);
            }
          } catch (emailError) {
            console.error(`[Store Order] Failed to send confirmation email for order #${input.orderId}:`, emailError);
          }

          // Create packing slip for store order fulfillment
          try {
            const packingSlipId = await db.createPackingSlipForStoreOrder(input.orderId);
            console.log(`[Store Order] Packing slip created: ${packingSlipId} for order #${input.orderId}`);
          } catch (packingError) {
            console.error(`[Store Order] Failed to create packing slip (non-critical):`, packingError);
          }
        }
        
        return { success: true };
      }),
    // Admin: Update shipping info and send notifications
    updateShipping: adminProcedure
      .input(z.object({
        orderId: z.number(),
        trackingNumber: z.string().min(1),
        trackingCarrier: z.enum(["USPS", "UPS", "FedEx", "DHL", "Other"]),
        sendNotifications: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        // Import services
        const { generateShippingNotificationEmail } = await import('./emailTemplates/shippingNotification');
        const { sendEmail } = await import('./emailService');

        // Get order details
        const order = await db.getStoreOrder(input.orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        
        // Update order with tracking info and set status to shipped
        await db.updateStoreOrderShipping(input.orderId, {
          trackingNumber: input.trackingNumber,
          trackingCarrier: input.trackingCarrier,
          status: 'shipped',
          shippedAt: new Date(),
        });
        
        // Get order items
        const items = await db.getStoreOrderItems(input.orderId);
        
        // Send notifications if enabled
        if (input.sendNotifications && order.payerEmail) {
          try {
            // Send email notification
            const emailData = await generateShippingNotificationEmail({
              customerName: order.payerName || 'Valued Customer',
              customerEmail: order.payerEmail,
              orderId: order.id,
              trackingNumber: input.trackingNumber,
              trackingCarrier: input.trackingCarrier,
              items: items.map(i => ({ name: i.name, quantity: i.quantity })),
            });
            
            await sendEmail({
              to: order.payerEmail,
              subject: emailData.subject,
              html: emailData.html,
            });
            console.log(`[Shipping] Email notification sent to ${order.payerEmail}`);
          } catch (emailError) {
            console.error('[Shipping] Failed to send email notification:', emailError);
          }
        }
        
        return { success: true, trackingNumber: input.trackingNumber, trackingCarrier: input.trackingCarrier };
      }),
    // Admin: Process refund for a store order
    // Refund: Will be re-implemented with Stripe
    refund: adminProcedure
      .input(z.object({
        orderId: z.number(),
        amount: z.string().optional(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { sendEmail } = await import('./emailService');
        
        const order = await db.getStoreOrder(input.orderId);
        if (!order) throw new Error('Order not found');
        if (order.status === 'refunded') throw new Error('Order has already been refunded');
        
        // Issue a Stripe refund when the order was paid via Stripe
        if (order.stripePaymentIntentId) {
          const { getStripeSecretKey } = await import('./stripe/stripeConfig');
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(getStripeSecretKey(), { apiVersion: '2024-06-20' as any });
          const refundAmountCents = input.amount ? Math.round(parseFloat(input.amount) * 100) : undefined;
          const stripeRefund = await stripe.refunds.create({
            payment_intent: order.stripePaymentIntentId,
            ...(refundAmountCents ? { amount: refundAmountCents } : {}),
            reason: 'requested_by_customer',
          });
          console.log(`[Refund] Stripe refund ${stripeRefund.id} issued for store order #${input.orderId}`);
        }

        // Mark as refunded in DB
        await db.updateStoreOrderStatus(input.orderId, 'refunded');
        
        // Restock inventory
        try {
          const restockResult = await db.restockInventoryForStoreOrder(input.orderId, order.userId);
          const restockedCount = restockResult.filter(r => r.success).length;
          console.log(`[Refund] Restocked ${restockedCount} items for order #${input.orderId}`);
        } catch (restockError) {
          console.error(`[Refund] Failed to restock inventory for order #${input.orderId}:`, restockError);
        }
        
        // Send refund confirmation email
        if (order.payerEmail) {
          try {
            const refundAmount = input.amount || order.total;
            await sendEmail({
              to: order.payerEmail,
              subject: `Refund Processed for Order #${order.id}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #f97316;">Refund Confirmation</h2>
                  <p>Hi ${order.payerName || 'Valued Customer'},</p>
                  <p>Your refund for Order #${order.id} has been processed.</p>
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Refund Amount:</strong> $${refundAmount}</p>
                    ${input.reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${input.reason}</p>` : ''}
                  </div>
                  <p>The refund will be credited to your original payment method within 5-10 business days.</p>
                </div>
              `,
            });
          } catch (emailError) {
            console.error('[Refund] Failed to send confirmation email:', emailError);
          }
        }
        
        return { success: true, refundId: 'manual', status: 'refunded' };
      }),
    // Admin: Delete an order (for test orders only)
    delete: adminProcedure
      .input(z.object({
        orderId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Get order details first
        const order = await db.getStoreOrder(input.orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        
        // Delete order items first (foreign key constraint)
        await db.deleteStoreOrderItems(input.orderId);
        
        // Delete the order
        await db.deleteStoreOrder(input.orderId);
        
        return { success: true };
      }),
    // getPendingVenmoCount removed - migrating to Stripe
  }),
  
  announcementTracking: router({
    recordOpen: publicProcedure
      .input(z.object({ trackingId: z.string() }))
      .mutation(async ({ input }) => {
        await db.recordAnnouncementOpen(input.trackingId);
        return { tracked: true };
      }),
    
    recordClick: publicProcedure
      .input(z.object({ trackingId: z.string() }))
      .mutation(async ({ input }) => {
        await db.recordAnnouncementClick(input.trackingId);
        return { tracked: true };
      }),
  }),
  
  invitation: router({
    send: adminProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        role: z.enum(["admin", "manager", "viewer", "finance"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const { token, expiresAt } = await invitation.createInvitation(
          input.email,
          input.name,
          input.role,
          ctx.user.id
        );
        
        const baseUrl = ctx.req.headers.origin || "https://peptidecoach.pro";
        const appName = process.env.VITE_APP_TITLE || "Omega Longevity";
        const inviterName = ctx.user.name || ctx.user.email || "Admin";
        
        await invitation.sendInvitationEmail(
          input.email,
          input.name,
          inviterName,
          input.role,
          token,
          baseUrl,
          appName
        );
        
        await logAuditEvent({
          userId: ctx.user.id,
          userEmail: ctx.user.email || undefined,
          userRole: ctx.user.role || undefined,
          action: "admin_invitation_sent",
          resourceType: "admin_invitation",
          details: { email: input.email, role: input.role },
        });
        
        return { success: true, expiresAt };
      }),
    
    getPending: adminProcedure.query(async () => {
      return invitation.getPendingInvitations();
    }),
    
    revoke: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await invitation.revokeInvitation(input.id);
        await logAuditEvent({
          userId: ctx.user.id,
          userEmail: ctx.user.email || undefined,
          userRole: ctx.user.role || undefined,
          action: "admin_invitation_revoked",
          resourceType: "admin_invitation",
          resourceId: input.id,
          targetUserId: input.id,
        });
        return { success: true };
      }),
    
    verify: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const inv = await invitation.getInvitationByToken(input.token);
        if (!inv) return { valid: false, reason: "not_found" };
        if (inv.status !== "pending") return { valid: false, reason: "already_used" };
        if (new Date(inv.expiresAt) < new Date()) return { valid: false, reason: "expired" };
        return { valid: true, email: inv.email, role: inv.role, name: inv.name };
      }),
    
    accept: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const inv = await invitation.getInvitationByToken(input.token);
        if (!inv || inv.status !== "pending" || new Date(inv.expiresAt) < new Date()) {
          throw new Error("Invalid or expired invitation");
        }
        
        await invitation.acceptInvitation(input.token, ctx.user.id);
        await db.updateUserRole(ctx.user.id, inv.role);
        
        await logAuditEvent({
          userId: ctx.user.id,
          userEmail: ctx.user.email || undefined,
          userRole: ctx.user.role || undefined,
          action: "admin_invitation_accepted",
          resourceType: "admin_invitation",
          resourceId: inv.id,
          details: { email: inv.email, role: inv.role },
        });
        
        return { success: true, role: inv.role };
      }),
  }),
  
  auditLog: router({
    list: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(500).default(100),
        action: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getRecentAuditLogs(input.limit, input.action as AuditAction | undefined);
      }),
  }),
  
  // ============ PEPTIDE CHEAT SHEET ROUTER ============
  peptide: router({
    // Public: Get cheat sheet data
    getCheatSheet: publicProcedure.query(async () => {
      return db.getPeptideCheatSheetData();
    }),
    
    // Admin: Get all categories
    listCategories: adminProcedure.query(async () => {
      return db.getAllPeptideCategoriesAdmin();
    }),
    
    // Admin: Create category
    createCategory: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        displayOrder: z.number().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createPeptideCategory(input);
        return { id };
      }),
    
    // Admin: Update category
    updateCategory: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        displayOrder: z.number().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePeptideCategory(id, data);
        return { success: true };
      }),
    
    // Admin: Delete category
    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePeptideCategory(input.id);
        return { success: true };
      }),
    
    // Admin: Reorder categories
    reorderCategories: adminProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.reorderPeptideCategories(input.orderedIds);
        return { success: true };
      }),
    
    // Admin: Get all peptides
    listPeptides: adminProcedure.query(async () => {
      return db.getAllPeptidesAdmin();
    }),
    
    // Admin: Get peptides by category
    getPeptidesByCategory: adminProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ input }) => {
        return db.getPeptidesByCategory(input.categoryId);
      }),
    
    // Admin: Create peptide
    createPeptide: adminProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        vialAmount: z.string().optional(),
        reconstitutionMl: z.string().optional(),
        dosage: z.string().optional(),
        syringeUnits: z.string().optional(),
        timing: z.string().optional(),
        frequency: z.string().optional(),
        duration: z.string().optional(),
        notes: z.string().optional(),
        formType: z.string().optional(),
        productUrl: z.string().optional(),
        productImageUrl: z.string().optional(),
        supplierName: z.string().optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        displayOrder: z.number().optional(),
        priceRange: z.string().optional(),
        researchDisclaimer: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createPeptide(input);
        return { id };
      }),
    
    // Admin: Update peptide
    updatePeptide: adminProcedure
      .input(z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        vialAmount: z.string().optional(),
        reconstitutionMl: z.string().optional(),
        dosage: z.string().optional(),
        syringeUnits: z.string().optional(),
        timing: z.string().optional(),
        frequency: z.string().optional(),
        duration: z.string().optional(),
        notes: z.string().optional(),
        formType: z.string().optional(),
        productUrl: z.string().optional(),
        productImageUrl: z.string().optional(),
        supplierName: z.string().optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        displayOrder: z.number().optional(),
        priceRange: z.string().optional(),
        researchDisclaimer: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePeptide(id, data);
        return { success: true };
      }),
    
    // Admin: Delete peptide
    deletePeptide: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePeptide(input.id);
        return { success: true };
      }),
    
    // Admin: Reorder peptides within a category
    reorderPeptides: adminProcedure
      .input(z.object({
        categoryId: z.number(),
        orderedIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await db.reorderPeptides(input.categoryId, input.orderedIds);
        return { success: true };
      }),
    
    // User: Get favorite peptides
    getFavorites: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFavoritePeptides(ctx.user.id);
    }),
    
    // User: Get favorite peptide IDs (for quick lookup)
    getFavoriteIds: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFavoritePeptideIds(ctx.user.id);
    }),
    
    // User: Add peptide to favorites
    addFavorite: protectedProcedure
      .input(z.object({ peptideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.addFavoritePeptide(ctx.user.id, input.peptideId);
        return { success: true };
      }),
    
    // User: Remove peptide from favorites
    removeFavorite: protectedProcedure
      .input(z.object({ peptideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeFavoritePeptide(ctx.user.id, input.peptideId);
        return { success: true };
      }),
    
    // User: Toggle peptide favorite status
    toggleFavorite: protectedProcedure
      .input(z.object({ peptideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isFavorited = await db.isPeptideFavorited(ctx.user.id, input.peptideId);
        if (isFavorited) {
          await db.removeFavoritePeptide(ctx.user.id, input.peptideId);
          return { isFavorited: false };
        } else {
          await db.addFavoritePeptide(ctx.user.id, input.peptideId);
          return { isFavorited: true };
        }
      }),
  }),
  // Saved Addresses for faster checkout
  savedAddresses: router({
    // Get all saved addresses for current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getSavedAddresses(ctx.user.id);
    }),
    
    // Get a single address by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const address = await db.getSavedAddressById(input.id);
        if (!address || address.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Address not found' });
        }
        return address;
      }),
    
    // Create a new saved address
    create: protectedProcedure
      .input(z.object({
        label: z.string().min(1).max(100),
        name: z.string().min(1).max(255),
        street: z.string().min(1).max(500),
        street2: z.string().max(255).optional(),
        city: z.string().min(1).max(255),
        state: z.string().min(1).max(100),
        zip: z.string().min(1).max(20),
        country: z.string().max(100).optional(),
        countryCode: z.string().max(10).optional(),
        phone: z.string().max(50).optional(),
        isDefault: z.boolean().optional(),
        isVerified: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // If setting as default, clear other defaults first
        if (input.isDefault) {
          await db.clearDefaultAddress(ctx.user.id);
        }
        
        const id = await db.createSavedAddress({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),
    
    // Update an existing saved address
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().min(1).max(100).optional(),
        name: z.string().min(1).max(255).optional(),
        street: z.string().min(1).max(500).optional(),
        street2: z.string().max(255).optional(),
        city: z.string().min(1).max(255).optional(),
        state: z.string().min(1).max(100).optional(),
        zip: z.string().min(1).max(20).optional(),
        country: z.string().max(100).optional(),
        countryCode: z.string().max(10).optional(),
        phone: z.string().max(50).optional(),
        isDefault: z.boolean().optional(),
        isVerified: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        
        // Verify ownership
        const address = await db.getSavedAddressById(id);
        if (!address || address.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Address not found' });
        }
        
        // If setting as default, clear other defaults first
        if (data.isDefault) {
          await db.clearDefaultAddress(ctx.user.id);
        }
        
        await db.updateSavedAddress(id, data);
        return { success: true };
      }),
    
    // Delete a saved address
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const address = await db.getSavedAddressById(input.id);
        if (!address || address.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Address not found' });
        }
        
        await db.deleteSavedAddress(input.id);
        return { success: true };
      }),
    
    // Set an address as default
    setDefault: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const address = await db.getSavedAddressById(input.id);
        if (!address || address.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Address not found' });
        }
        
        // Clear all defaults for this user
        await db.clearDefaultAddress(ctx.user.id);
        
        // Set the new default
        await db.updateSavedAddress(input.id, { isDefault: true });
        return { success: true };
      }),
    
    // Get the default address for current user
    getDefault: protectedProcedure.query(async ({ ctx }) => {
      return db.getDefaultAddress(ctx.user.id);
    }),
  }),
  // ============ EMAIL REPLY BRIDGE ============
  customOrders: customOrdersRouter,

  emailReplyBridge: router({
    status: adminProcedure.query(async () => {
      const { getEmailReplyBridgeStatus } = await import('./emailReplyBridge');
      return getEmailReplyBridgeStatus();
    }),
    pollNow: adminProcedure.mutation(async () => {
      const { pollForReplies } = await import('./emailReplyBridge');
      const result = await pollForReplies();
      return result;
    }),
    restart: adminProcedure.mutation(async () => {
      const { stopEmailReplyPolling, startEmailReplyPolling } = await import('./emailReplyBridge');
      stopEmailReplyPolling();
      startEmailReplyPolling();
      return { success: true, message: 'Email reply polling restarted' };
    }),
   }),

  // ============ ONBOARDING AUTOMATION ============
  automation: router({
    // Get automation event log
    getEvents: adminProcedure
      .input(z.object({
        limit: z.number().default(50),
        enrollmentId: z.number().optional(),
        eventType: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) return [];
        const { automationEvents } = await import('../drizzle/schema');
        const { desc, eq, and } = await import('drizzle-orm');
        let query = database.select().from(automationEvents).orderBy(desc(automationEvents.createdAt)).limit(input.limit);
        const conditions: any[] = [];
        if (input.enrollmentId) conditions.push(eq(automationEvents.enrollmentId, input.enrollmentId));
        if (input.eventType) conditions.push(eq(automationEvents.eventType, input.eventType));
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }
        return query;
      }),

    // Get automation stats
    getStats: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return { total: 0, success: 0, failed: 0, last24h: 0 };
      const { automationEvents } = await import('../drizzle/schema');
      const { count, eq, gte, and } = await import('drizzle-orm');
      const allEvents = await database.select({ count: count() }).from(automationEvents);
      const successEvents = await database.select({ count: count() }).from(automationEvents).where(eq(automationEvents.status, 'success'));
      const failedEvents = await database.select({ count: count() }).from(automationEvents).where(eq(automationEvents.status, 'failed'));
      const last24h = await database.select({ count: count() }).from(automationEvents).where(gte(automationEvents.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
      return {
        total: allEvents[0]?.count || 0,
        success: successEvents[0]?.count || 0,
        failed: failedEvents[0]?.count || 0,
        last24h: last24h[0]?.count || 0,
      };
    }),

    // Manually trigger onboarding for an enrollment
    triggerOnboarding: adminProcedure
      .input(z.object({
        enrollmentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new Error('Database not available');
        const { sql } = await import('drizzle-orm');
        const enrollmentRows = await database.execute(sql`SELECT * FROM transformation_enrollments WHERE id = ${input.enrollmentId}`);
        const enrollment = (enrollmentRows as any)?.[0]?.[0] || (enrollmentRows as any)?.[0];
        if (!enrollment) throw new Error('Enrollment not found');
        const { runOnboardingAutomation } = await import('./automation/onboardingAutomation');
        const result = await runOnboardingAutomation({
          enrollmentId: enrollment.id,
          tier: enrollment.tier || 'flagship',
          clientName: enrollment.clientName || 'Unknown',
          clientEmail: enrollment.email || '',
          clientPhone: enrollment.phone || undefined,
          coachingFeeAmount: parseFloat(enrollment.coachingFeeAmount || '0'),
          paymentMethod: 'paypal',
          triggeredBy: 'manual',
        });
        return result;
      }),

    // Run stalled client check on demand
    checkStalledClients: adminProcedure
      .mutation(async () => {
        const { runStalledClientCheck } = await import('./cron/stalledClientCron');
        const result = await runStalledClientCheck();
        return result;
      }),

    // List stalled/on_hold projects for bulk actions
    listStalledProjects: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return [];
      const { sql } = await import('drizzle-orm');
      const [rows] = await database.execute(sql`
        SELECT 
          cp.id, cp.clientName, cp.clientEmail, cp.status,
          cp.createdAt, cp.updatedAt,
          (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id) as totalTasks,
          (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed') as completedTasks,
          (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status IN ('pending', 'in_progress')) as pendingTasks,
          TIMESTAMPDIFF(HOUR, COALESCE(
            (SELECT MAX(pt.updatedAt) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed'),
            cp.createdAt
          ), NOW()) as hoursSinceActivity,
          (SELECT tm.name FROM team_members tm WHERE tm.id = cp.assignedTeamMemberId) as assignedTo
        FROM client_projects cp
        WHERE cp.status IN ('active', 'in_progress', 'pending', 'on_hold')
        HAVING hoursSinceActivity >= 48 OR cp.status = 'on_hold'
        ORDER BY cp.status = 'on_hold' DESC, hoursSinceActivity DESC
      `) as any;
      return (rows || []).map((r: any) => ({
        id: r.id, clientName: r.clientName, clientEmail: r.clientEmail,
        status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt,
        totalTasks: Number(r.totalTasks) || 0, completedTasks: Number(r.completedTasks) || 0,
        pendingTasks: Number(r.pendingTasks) || 0,
        hoursSinceActivity: Number(r.hoursSinceActivity) || 0,
        assignedTo: r.assignedTo || 'Unassigned',
      }));
    }),

    // Bulk resolve stalled projects (mark as completed)
    bulkResolveProjects: adminProcedure
      .input(z.object({ projectIds: z.array(z.number()), action: z.enum(['complete', 'reactivate', 'cancel', 'on_hold']) }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new Error('Database not available');
        const { sql } = await import('drizzle-orm');
        const { projectIds, action } = input;
        if (projectIds.length === 0) return { updated: 0 };

        let newStatus: string;
        switch (action) {
          case 'complete': newStatus = 'completed'; break;
          case 'reactivate': newStatus = 'active'; break;
          case 'cancel': newStatus = 'cancelled'; break;
          case 'on_hold': newStatus = 'on_hold'; break;
          default: throw new Error('Invalid action');
        }

        const placeholders = projectIds.map(() => '?').join(',');
        const query = action === 'complete'
          ? `UPDATE client_projects SET status = ?, actualEndDate = NOW(), updatedAt = NOW() WHERE id IN (${placeholders})`
          : `UPDATE client_projects SET status = ?, updatedAt = NOW() WHERE id IN (${placeholders})`;

        await database.execute(sql.raw(query), [newStatus, ...projectIds] as any);

        // Log the bulk action
        try {
          await database.execute(sql`
            INSERT INTO automation_events (eventType, status, triggeredBy, details, createdAt)
            VALUES ('bulk_project_action', 'success', 'manual', ${JSON.stringify({
              action, projectIds, newStatus, count: projectIds.length,
            })}, NOW())
          `);
        } catch (logErr) {
          console.error('[BulkAction] Failed to log event:', logErr);
        }

        return { updated: projectIds.length, newStatus };
      }),

    // Reconcile project lifecycle stages — catch-up for projects that missed stage triggers
    reconcileStages: adminProcedure
      .mutation(async () => {
        const { reconcileProjectStages } = await import('./automation/lifecycleAdvancement');
        const result = await reconcileProjectStages();
        return result;
      }),

    // Manually advance a project's lifecycle stage
    advanceProjectStage: adminProcedure
      .input(z.object({
        projectId: z.number(),
        trigger: z.string(),
        clientName: z.string().optional(),
        enrollmentId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { advanceLifecycleStage } = await import('./automation/lifecycleAdvancement');
        const result = await advanceLifecycleStage(input.projectId, input.trigger, {
          clientName: input.clientName,
          enrollmentId: input.enrollmentId,
          notes: input.notes,
        });
        return result;
      }),

    // Send weekly team digest on demand
    sendWeeklyDigest: adminProcedure
      .mutation(async () => {
        const { sendWeeklyTeamDigest } = await import('./cron/weeklyTeamDigestCron');
        const result = await sendWeeklyTeamDigest();
        return result;
      }),

    // Send Shannon's daily pipeline email on demand
    sendShannonPipeline: adminProcedure
      .mutation(async () => {
        const { sendShannonDailyPipeline } = await import('./cron/shannonDailyPipelineCron');
        const result = await sendShannonDailyPipeline();
        return result;
      }),

    // Run nightly reconciliation on demand
    runNightlyReconciliation: adminProcedure
      .mutation(async () => {
        const { runNightlyReconciliation } = await import('./cron/nightlyReconciliationCron');
        const result = await runNightlyReconciliation();
        return result;
      }),

    // Run post-discovery follow-up check on demand
    runPostDiscoveryFollowUp: adminProcedure
      .mutation(async () => {
        const { runPostDiscoveryCheck } = await import('./cron/postDiscoveryFollowUpCron');
        const result = await runPostDiscoveryCheck();
        return result;
      }),

    // Run strategy session monitor on demand
    runStrategySessionMonitor: adminProcedure
      .mutation(async () => {
        const { runStrategySessionCheck } = await import('./cron/strategySessionMonitorCron');
        const result = await runStrategySessionCheck();
        return result;
      }),

    // Run backorder and tracking check on demand
    runBackorderAndTrackingCheck: adminProcedure
      .mutation(async () => {
        const { runBackorderAndTrackingCheck } = await import('./cron/backorderAndTrackingCron');
        const result = await runBackorderAndTrackingCheck();
        return result;
      }),

    // Run task escalation on demand
    runTaskEscalation: adminProcedure
      .mutation(async () => {
        const { runTaskEscalation } = await import('./cron/taskEscalationCron');
        const result = await runTaskEscalation();
        return result;
      }),

    // Lisa's Morning Briefing - daily task queue, deadlines, new clients
    morningBriefing: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return { tasks: [], newClients: [], upcomingDeadlines: [], stats: { totalPending: 0, dueToday: 0, overdue: 0, newClientsThisWeek: 0 } };
      const { sql } = await import('drizzle-orm');
      
      // Get Lisa's team member ID
      const lisaRows = await database.execute(sql`
        SELECT id FROM team_members WHERE name LIKE '%Lisa%' AND isActive = 1 LIMIT 1
      `);
      const lisaId = (lisaRows as any)?.[0]?.[0]?.id || (lisaRows as any)?.[0]?.id;

      // Get all pending/in-progress tasks assigned to Lisa (or unassigned)
      const taskRows = await database.execute(sql`
        SELECT 
          pt.id, pt.name, pt.description, pt.status, pt.dueDate, pt.sortOrder,
          pt.clientProjectId, pt.assignedTeamMemberId,
          cp.clientName, cp.clientEmail,
          ls.name as stageName, ls.sortOrder as stageOrder
        FROM project_tasks pt
        JOIN client_projects cp ON pt.clientProjectId = cp.id
        LEFT JOIN lifecycle_stages ls ON pt.lifecycleStageId = ls.id
        WHERE pt.status IN ('pending', 'in_progress')
          AND (pt.assignedTeamMemberId = ${lisaId || 0} OR pt.assignedTeamMemberId IS NULL)
        ORDER BY 
          CASE WHEN pt.dueDate IS NOT NULL AND pt.dueDate < NOW() THEN 0
               WHEN pt.dueDate IS NOT NULL AND pt.dueDate < DATE_ADD(NOW(), INTERVAL 1 DAY) THEN 1
               ELSE 2 END,
          pt.dueDate ASC,
          pt.sortOrder ASC
        LIMIT 100
      `);
      const tasks = ((taskRows as any)?.[0] || taskRows) as any[];

      // Get newly created clients this week
      const newClientRows = await database.execute(sql`
        SELECT 
          cp.id as projectId, cp.clientName, cp.clientEmail, cp.status as projectStatus,
          cp.createdAt,
          (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id) as totalTasks,
          (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed') as completedTasks
        FROM client_projects cp
        WHERE cp.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY cp.createdAt DESC
        LIMIT 20
      `);
      const newClients = ((newClientRows as any)?.[0] || newClientRows) as any[];

      // Get upcoming deadlines (next 7 days)
      const deadlineRows = await database.execute(sql`
        SELECT 
          pt.id, pt.name, pt.dueDate, pt.status,
          cp.clientName, cp.clientEmail, cp.id as projectId
        FROM project_tasks pt
        JOIN client_projects cp ON pt.clientProjectId = cp.id
        WHERE pt.status IN ('pending', 'in_progress')
          AND pt.dueDate IS NOT NULL
          AND pt.dueDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
          AND (pt.assignedTeamMemberId = ${lisaId || 0} OR pt.assignedTeamMemberId IS NULL)
        ORDER BY pt.dueDate ASC
        LIMIT 20
      `);
      const upcomingDeadlines = ((deadlineRows as any)?.[0] || deadlineRows) as any[];

      // Calculate stats
      const now = new Date();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const totalPending = Array.isArray(tasks) ? tasks.length : 0;
      const dueToday = Array.isArray(tasks) ? tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) <= todayEnd).length : 0;
      const overdue = Array.isArray(tasks) ? tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now).length : 0;
      const newClientsThisWeek = Array.isArray(newClients) ? newClients.length : 0;

      return {
        tasks: Array.isArray(tasks) ? tasks.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          status: t.status,
          dueDate: t.dueDate,
          clientName: t.clientName,
          clientEmail: t.clientEmail,
          projectId: t.clientProjectId,
          stageName: t.stageName,
          isOverdue: t.dueDate ? new Date(t.dueDate) < now : false,
          isDueToday: t.dueDate ? new Date(t.dueDate) <= todayEnd && new Date(t.dueDate) >= now : false,
        })) : [],
        newClients: Array.isArray(newClients) ? newClients.map((c: any) => ({
          projectId: c.projectId,
          clientName: c.clientName,
          clientEmail: c.clientEmail,
          projectStatus: c.projectStatus,
          createdAt: c.createdAt,
          totalTasks: Number(c.totalTasks) || 0,
          completedTasks: Number(c.completedTasks) || 0,
        })) : [],
        upcomingDeadlines: Array.isArray(upcomingDeadlines) ? upcomingDeadlines.map((d: any) => ({
          id: d.id,
          name: d.name,
          dueDate: d.dueDate,
          status: d.status,
          clientName: d.clientName,
          projectId: d.projectId,
        })) : [],
        stats: { totalPending, dueToday, overdue, newClientsThisWeek },
      };
    }),

    // Shannon's Pipeline Scorecard - prospect follow-up queue, overdue callbacks, conversion stats
    pipelineScorecard: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return { followUpQueue: [], overdueCallbacks: [], hotLeads: [], recentConversions: [], stats: { totalProspects: 0, overdueFollowUps: 0, hotLeadCount: 0, conversionRate: 0, avgResponseTime: 0, weeklyNewProspects: 0 } };
      const { sql } = await import('drizzle-orm');

      // 1. Follow-up queue: prospects with nextFollowUpAt in the future or past (sorted by urgency)
      const followUpRows = await database.execute(sql`
        SELECT 
          p.id, p.name, p.email, p.phone, p.status, p.source,
          p.nextFollowUpAt, p.followUpCount, p.lastContactedAt,
          p.notes, p.thingsToKnow, p.customStatus,
          TIMESTAMPDIFF(HOUR, p.nextFollowUpAt, NOW()) as hoursOverdue
        FROM prospects p
        WHERE p.nextFollowUpAt IS NOT NULL
          AND p.status NOT IN ('enrolled', 'declined')
          AND p.followUpPaused = 0
          AND p.smsOptOut = 0
        ORDER BY 
          CASE WHEN p.nextFollowUpAt < NOW() THEN 0 ELSE 1 END,
          p.nextFollowUpAt ASC
        LIMIT 30
      `);
      const followUpQueue = ((followUpRows as any)?.[0] || followUpRows) as any[];

      // 2. Overdue callbacks: prospects where nextFollowUpAt is past
      const overdueRows = await database.execute(sql`
        SELECT 
          p.id, p.name, p.phone, p.status, p.source,
          p.nextFollowUpAt, p.followUpCount, p.lastContactedAt,
          p.thingsToKnow,
          TIMESTAMPDIFF(HOUR, p.nextFollowUpAt, NOW()) as hoursOverdue
        FROM prospects p
        WHERE p.nextFollowUpAt < NOW()
          AND p.status NOT IN ('enrolled', 'declined')
          AND p.followUpPaused = 0
          AND p.smsOptOut = 0
        ORDER BY p.nextFollowUpAt ASC
        LIMIT 20
      `);
      const overdueCallbacks = ((overdueRows as any)?.[0] || overdueRows) as any[];

      // 3. Hot leads: ready_for_consult or engaged status
      const hotRows = await database.execute(sql`
        SELECT 
          p.id, p.name, p.email, p.phone, p.status, p.source,
          p.lastContactedAt, p.lastClickedAt, p.lastViewedAt,
          p.totalClicks, p.followUpCount, p.thingsToKnow,
          p.createdAt
        FROM prospects p
        WHERE p.status IN ('ready_for_consult', 'engaged', 'waiting_on_client')
          AND p.smsOptOut = 0
        ORDER BY 
          CASE p.status
            WHEN 'ready_for_consult' THEN 0
            WHEN 'engaged' THEN 1
            WHEN 'waiting_on_client' THEN 2
          END,
          p.lastContactedAt DESC
        LIMIT 20
      `);
      const hotLeads = ((hotRows as any)?.[0] || hotRows) as any[];

      // 4. Recent conversions (last 30 days)
      const conversionRows = await database.execute(sql`
        SELECT 
          p.name, p.email, p.source, p.createdAt as prospectCreatedAt,
          te.enrolledAt, te.selectedTier as tier, te.coachingFeeAmount,
          TIMESTAMPDIFF(DAY, p.createdAt, te.enrolledAt) as daysToConvert
        FROM prospects p
        JOIN transformation_enrollments te ON p.enrollmentId = te.id
        WHERE p.status = 'enrolled'
          AND te.enrolledAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY te.enrolledAt DESC
        LIMIT 10
      `);
      const recentConversions = ((conversionRows as any)?.[0] || conversionRows) as any[];

      // 5. Stats
      const totalProspectsRows = await database.execute(sql`
        SELECT COUNT(*) as cnt FROM prospects WHERE status NOT IN ('enrolled', 'declined')
      `);
      const totalProspects = Number((totalProspectsRows as any)?.[0]?.[0]?.cnt || (totalProspectsRows as any)?.[0]?.cnt || 0);

      const overdueCountRows = await database.execute(sql`
        SELECT COUNT(*) as cnt FROM prospects 
        WHERE nextFollowUpAt < NOW() AND status NOT IN ('enrolled', 'declined') AND followUpPaused = 0 AND smsOptOut = 0
      `);
      const overdueFollowUps = Number((overdueCountRows as any)?.[0]?.[0]?.cnt || (overdueCountRows as any)?.[0]?.cnt || 0);

      const hotLeadCountRows = await database.execute(sql`
        SELECT COUNT(*) as cnt FROM prospects WHERE status IN ('ready_for_consult', 'engaged')
      `);
      const hotLeadCount = Number((hotLeadCountRows as any)?.[0]?.[0]?.cnt || (hotLeadCountRows as any)?.[0]?.cnt || 0);

      const weeklyNewRows = await database.execute(sql`
        SELECT COUNT(*) as cnt FROM prospects WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);
      const weeklyNewProspects = Number((weeklyNewRows as any)?.[0]?.[0]?.cnt || (weeklyNewRows as any)?.[0]?.cnt || 0);

      // Conversion rate
      const totalAllRows = await database.execute(sql`SELECT COUNT(*) as cnt FROM prospects`);
      const totalAll = Number((totalAllRows as any)?.[0]?.[0]?.cnt || (totalAllRows as any)?.[0]?.cnt || 0);
      const enrolledRows = await database.execute(sql`SELECT COUNT(*) as cnt FROM prospects WHERE status = 'enrolled'`);
      const totalEnrolled = Number((enrolledRows as any)?.[0]?.[0]?.cnt || (enrolledRows as any)?.[0]?.cnt || 0);
      const conversionRate = totalAll > 0 ? Math.round((totalEnrolled / totalAll) * 100 * 10) / 10 : 0;

      return {
        followUpQueue: Array.isArray(followUpQueue) ? followUpQueue.map((p: any) => ({
          id: p.id, name: p.name, email: p.email, phone: p.phone, status: p.status,
          source: p.source, nextFollowUpAt: p.nextFollowUpAt, followUpCount: Number(p.followUpCount) || 0,
          lastContactedAt: p.lastContactedAt, notes: p.notes, thingsToKnow: p.thingsToKnow,
          customStatus: p.customStatus, hoursOverdue: Number(p.hoursOverdue) || 0,
        })) : [],
        overdueCallbacks: Array.isArray(overdueCallbacks) ? overdueCallbacks.map((p: any) => ({
          id: p.id, name: p.name, phone: p.phone, status: p.status, source: p.source,
          nextFollowUpAt: p.nextFollowUpAt, followUpCount: Number(p.followUpCount) || 0,
          lastContactedAt: p.lastContactedAt, thingsToKnow: p.thingsToKnow,
          hoursOverdue: Number(p.hoursOverdue) || 0,
        })) : [],
        hotLeads: Array.isArray(hotLeads) ? hotLeads.map((p: any) => ({
          id: p.id, name: p.name, email: p.email, phone: p.phone, status: p.status,
          source: p.source, lastContactedAt: p.lastContactedAt, lastClickedAt: p.lastClickedAt,
          lastViewedAt: p.lastViewedAt, totalClicks: Number(p.totalClicks) || 0,
          followUpCount: Number(p.followUpCount) || 0, thingsToKnow: p.thingsToKnow,
          createdAt: p.createdAt,
        })) : [],
        recentConversions: Array.isArray(recentConversions) ? recentConversions.map((r: any) => ({
          name: r.name, email: r.email, source: r.source,
          prospectCreatedAt: r.prospectCreatedAt, enrolledAt: r.enrolledAt,
          tier: r.tier, coachingFeeAmount: r.coachingFeeAmount,
          daysToConvert: Number(r.daysToConvert) || 0,
        })) : [],
        stats: {
          totalProspects,
          overdueFollowUps,
          hotLeadCount,
          conversionRate,
          avgResponseTime: 0,
          weeklyNewProspects,
        },
      };
    }),

    // Prospect-to-Client Conversion Tracking
    conversionMetrics: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return { pipeline: [], averageDays: 0, conversionRate: 0, recentConversions: [], tierBreakdown: [] };
      const { sql } = await import('drizzle-orm');

      // Pipeline funnel: count prospects at each stage
      const pipelineRows = await database.execute(sql`
        SELECT status, COUNT(*) as count
        FROM prospects
        GROUP BY status
        ORDER BY FIELD(status, 'new', 'contacted', 'clicked', 'viewing', 'engaged', 'waiting_on_client', 'ready_for_consult', 'enrolled', 'not_ready', 'declined', 'stalled')
      `);
      const pipeline = ((pipelineRows as any)?.[0] || pipelineRows) as any[];

      // Average days from first contact to enrollment
      const avgRows = await database.execute(sql`
        SELECT 
          AVG(TIMESTAMPDIFF(DAY, p.createdAt, te.enrolledAt)) as avgDays,
          COUNT(*) as totalConverted
        FROM prospects p
        JOIN transformation_enrollments te ON p.enrollmentId = te.id
        WHERE p.status = 'enrolled'
          AND te.enrolledAt IS NOT NULL
      `);
      const avgData = (avgRows as any)?.[0]?.[0] || (avgRows as any)?.[0] || {};

      // Total prospects for conversion rate
      const totalRows = await database.execute(sql`
        SELECT COUNT(*) as total FROM prospects
      `);
      const totalProspects = Number((totalRows as any)?.[0]?.[0]?.total || (totalRows as any)?.[0]?.total || 0);
      const totalConverted = Number(avgData.totalConverted || 0);
      const conversionRate = totalProspects > 0 ? Math.round((totalConverted / totalProspects) * 100 * 10) / 10 : 0;

      // Recent conversions (last 30 days)
      const recentRows = await database.execute(sql`
        SELECT 
          p.name, p.email, p.phone, p.source, p.createdAt as prospectCreatedAt,
          te.enrolledAt, te.tier, te.coachingFeeAmount, te.status as enrollmentStatus,
          TIMESTAMPDIFF(DAY, p.createdAt, te.enrolledAt) as daysToConvert
        FROM prospects p
        JOIN transformation_enrollments te ON p.enrollmentId = te.id
        WHERE te.enrolledAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        ORDER BY te.enrolledAt DESC
        LIMIT 20
      `);
      const recentConversions = ((recentRows as any)?.[0] || recentRows) as any[];

      // Tier breakdown of conversions
      const tierRows = await database.execute(sql`
        SELECT 
          te.tier,
          COUNT(*) as count,
          AVG(TIMESTAMPDIFF(DAY, p.createdAt, te.enrolledAt)) as avgDays,
          SUM(CAST(te.coachingFeeAmount AS DECIMAL(10,2))) as totalRevenue
        FROM prospects p
        JOIN transformation_enrollments te ON p.enrollmentId = te.id
        WHERE p.status = 'enrolled'
        GROUP BY te.tier
        ORDER BY count DESC
      `);
      const tierBreakdown = ((tierRows as any)?.[0] || tierRows) as any[];

      // Monthly conversion trend (last 6 months)
      const trendRows = await database.execute(sql`
        SELECT 
          DATE_FORMAT(te.enrolledAt, '%Y-%m') as month,
          COUNT(*) as conversions,
          AVG(TIMESTAMPDIFF(DAY, p.createdAt, te.enrolledAt)) as avgDays
        FROM prospects p
        JOIN transformation_enrollments te ON p.enrollmentId = te.id
        WHERE te.enrolledAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(te.enrolledAt, '%Y-%m')
        ORDER BY month ASC
      `);
      const monthlyTrend = ((trendRows as any)?.[0] || trendRows) as any[];

      return {
        pipeline: Array.isArray(pipeline) ? pipeline.map((p: any) => ({ status: p.status, count: Number(p.count) })) : [],
        averageDays: Math.round(Number(avgData.avgDays || 0) * 10) / 10,
        conversionRate,
        totalProspects,
        totalConverted,
        recentConversions: Array.isArray(recentConversions) ? recentConversions.map((r: any) => ({
          name: r.name,
          email: r.email,
          source: r.source,
          prospectCreatedAt: r.prospectCreatedAt,
          enrolledAt: r.enrolledAt,
          tier: r.tier,
          coachingFeeAmount: r.coachingFeeAmount,
          enrollmentStatus: r.enrollmentStatus,
          daysToConvert: Number(r.daysToConvert) || 0,
        })) : [],
        tierBreakdown: Array.isArray(tierBreakdown) ? tierBreakdown.map((t: any) => ({
          tier: t.tier,
          count: Number(t.count),
          avgDays: Math.round(Number(t.avgDays || 0) * 10) / 10,
          totalRevenue: Number(t.totalRevenue || 0),
        })) : [],
        monthlyTrend: Array.isArray(monthlyTrend) ? monthlyTrend.map((m: any) => ({
          month: m.month,
          conversions: Number(m.conversions),
          avgDays: Math.round(Number(m.avgDays || 0) * 10) / 10,
        })) : [],
      };
    }),
  }),

  // ============ CONSULTATION NOTES ============
  consultationNotes: router({
    // List consultation notes (for admin/Shannon)
    list: adminProcedure
      .input(z.object({
        prospectId: z.number().optional(),
        enrollmentId: z.number().optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) return [];
        const { consultationNotes } = await import('../drizzle/schema');
        const { desc, eq, and } = await import('drizzle-orm');
        let query = database.select().from(consultationNotes).orderBy(desc(consultationNotes.consultDate)).limit(input.limit);
        const conditions: any[] = [];
        if (input.prospectId) conditions.push(eq(consultationNotes.prospectId, input.prospectId));
        if (input.enrollmentId) conditions.push(eq(consultationNotes.enrollmentId, input.enrollmentId));
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }
        return query;
      }),

    // Create consultation notes (Jason enters after consult)
    create: adminProcedure
      .input(z.object({
        prospectId: z.number().optional(),
        enrollmentId: z.number().optional(),
        clientId: z.number().optional(),
        consultType: z.enum(['quick_hit_20min', 'strategy_session', 'discovery_call', 'follow_up', 'other']),
        notes: z.string().min(1),
        recommendations: z.string().optional(),
        nextSteps: z.string().optional(),
        suggestedTier: z.string().optional(),
        suggestedProgram: z.string().optional(),
        consultDate: z.string().or(z.date()),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await db.getDb();
        if (!database) throw new Error('Database not available');
        const { consultationNotes } = await import('../drizzle/schema');
        const result = await database.insert(consultationNotes).values({
          prospectId: input.prospectId || null,
          enrollmentId: input.enrollmentId || null,
          clientId: input.clientId || null,
          authorId: ctx.user.id,
          consultType: input.consultType,
          notes: input.notes,
          recommendations: input.recommendations || null,
          nextSteps: input.nextSteps || null,
          suggestedTier: input.suggestedTier || null,
          suggestedProgram: input.suggestedProgram || null,
          consultDate: new Date(input.consultDate),
          noteEnteredAt: new Date(),
        });
        // Notify Shannon that consultation notes are available
        try {
          let clientLabel = 'Unknown';
          if (input.prospectId) {
            const { prospects } = await import('../drizzle/schema');
            const { eq } = await import('drizzle-orm');
            const [prospect] = await database.select().from(prospects).where(eq(prospects.id, input.prospectId));
            clientLabel = prospect?.name || `Prospect #${input.prospectId}`;
          } else if (input.enrollmentId) {
            clientLabel = `Enrollment #${input.enrollmentId}`;
          }

          await db.createNotificationsForEnabledUsers(
            'consultation_notes_added',
            `Consultation notes added for ${clientLabel}`,
            `Jason has entered ${input.consultType.replace(/_/g, ' ')} notes for ${clientLabel}.${input.nextSteps ? ` Next steps: ${input.nextSteps}` : ''}${input.suggestedTier ? ` Suggested tier: ${input.suggestedTier}` : ''}`,
          );

          // Also add as a prospect engagement note so Shannon sees it in the lead pipeline
          if (input.prospectId) {
            const { prospectEngagement } = await import('../drizzle/schema');
            await database.insert(prospectEngagement).values({
              prospectId: input.prospectId,
              eventType: 'note' as any,
              notes: `[Consultation Notes - ${input.consultType.replace(/_/g, ' ')}] ${input.notes}${input.recommendations ? `\nRecommendations: ${input.recommendations}` : ''}${input.nextSteps ? `\nNext Steps: ${input.nextSteps}` : ''}`,
              loggedBy: ctx.user.name || ctx.user.email || 'Jason',
            });
          }
        } catch (notifErr) {
          console.error('[ConsultationNotes] Failed to send notification:', notifErr);
        }

        return { id: result[0].insertId };
      }),

    // Update consultation notes
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
        recommendations: z.string().optional(),
        nextSteps: z.string().optional(),
        suggestedTier: z.string().optional(),
        suggestedProgram: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new Error('Database not available');
        const { consultationNotes } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const { id, ...data } = input;
        await database.update(consultationNotes).set(data).where(eq(consultationNotes.id, id));
        return { success: true };
      }),
  }),

  // ==========================================
  // Phase 56: My Action Items & Fulfillment Queue
  // ==========================================
  actionItems: router({
    // Get action items for the currently logged-in user's team member
    myItems: adminProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) return { items: [], teamMember: null };
        const teamMember = await db.getTeamMemberByUserId(userId);
        if (!teamMember) return { items: [], teamMember: null };
        const items = await db.getActionItemsForTeamMember(teamMember.id);
        return { items, teamMember };
      }),
    // Get action items for a specific team member (admin view)
    forMember: adminProcedure
      .input(z.object({ teamMemberId: z.number() }))
      .query(async ({ input }) => {
        return db.getActionItemsForTeamMember(input.teamMemberId);
      }),
    // Get all action items across all team members (admin overview)
    all: adminProcedure
      .query(async () => {
        const [items, members] = await Promise.all([
          db.getAllActionItems(),
          db.getAllTeamMembers(),
        ]);
        return { items, members };
      }),
    // Complete a task
    completeTask: adminProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        const teamMember = userId ? await db.getTeamMemberByUserId(userId) : null;
        await db.updateProjectTask(input.taskId, {
          status: "completed",
          completedAt: new Date(),
          completedByTeamMemberId: teamMember?.id || null,
        });
        return { success: true };
      }),
    // Start a task (move to in_progress)
    startTask: adminProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateProjectTask(input.taskId, { status: "in_progress" });
        return { success: true };
      }),
    // Reassign a task to a different team member
    reassignTask: adminProcedure
      .input(z.object({ taskId: z.number(), teamMemberId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateProjectTask(input.taskId, { assignedTeamMemberId: input.teamMemberId });
        // Notify the new assignee
        const task = await db.getProjectTaskById(input.taskId);
        if (task) {
          await db.notifyTaskAssignment(task.id, input.teamMemberId, task.name, task.clientProjectId);
        }
        return { success: true };
      }),
    // Complete a subtask
    completeSubtask: adminProcedure
      .input(z.object({ subtaskId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        const teamMember = userId ? await db.getTeamMemberByUserId(userId) : null;
        await db.updateProjectSubtask(input.subtaskId, {
          status: "completed",
          completedAt: new Date(),
          completedByTeamMemberId: teamMember?.id || null,
        });
        return { success: true };
      }),
    // Start a subtask
    startSubtask: adminProcedure
      .input(z.object({ subtaskId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateProjectSubtask(input.subtaskId, { status: "in_progress" });
        return { success: true };
      }),
    // Reassign a subtask
    reassignSubtask: adminProcedure
      .input(z.object({ subtaskId: z.number(), teamMemberId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateProjectSubtask(input.subtaskId, { assignedTeamMemberId: input.teamMemberId });
        return { success: true };
      }),
  }),
  fulfillmentQueue: router({
    // Get all packing slips that need work
    list: adminProcedure
      .query(async () => {
        return db.getFulfillmentQueue();
      }),
    // Get all backordered items
    backorders: adminProcedure
      .query(async () => {
        return db.getBackorderedItems();
      }),
    // Get slips signed in the last 7 days (for the "Recently Completed" section)
    recentlyCompleted: adminProcedure
      .query(async () => {
        return db.getRecentlyCompletedPackingSlips(7);
      }),
  }),
  kpi: router({
    getDashboard: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) return { pipeline: { total: 0, byStage: [] }, conversion: { discoveryToEnrollment: 0, enrollmentToStrategy: 0, strategyToKickoff: 0 }, tasks: { total: 0, overdue: 0, completedThisWeek: 0, avgCompletionDays: 0, byTeamMember: [] }, fulfillment: { pendingSlips: 0, backorderedItems: 0, avgFulfillmentDays: 0, shippedThisWeek: 0 }, stageTimings: [] };
      try {
      const { sql, count, eq, gte, and, isNull, isNotNull, lte } = await import('drizzle-orm');
      const { prospects, transformationEnrollments, projectTasks, teamMembers, packingSlips, packingSlipItems, clientProjects } = await import('../drizzle/schema');
      // Pipeline stats
      const allProspects = await database.select({ status: prospects.status }).from(prospects);
      const prospectsByStage: Record<string, number> = {};
      allProspects.forEach((p: any) => { prospectsByStage[p.status || 'unknown'] = (prospectsByStage[p.status || 'unknown'] || 0) + 1; });
      const pipelineByStage = Object.entries(prospectsByStage).map(([stage, cnt]) => ({ stage, count: cnt })).sort((a, b) => b.count - a.count);
      // Conversion rates
      const totalProspects = allProspects.length || 1;
      const allEnrollments = await database.select({
        id: transformationEnrollments.id,
        status: transformationEnrollments.status,
        discoverySessionScheduledAt: transformationEnrollments.discoverySessionScheduledAt,
        discoverySessionCompletedAt: transformationEnrollments.discoverySessionCompletedAt,
        createdAt: transformationEnrollments.createdAt,
      }).from(transformationEnrollments);
      const enrolledCount = allEnrollments.length;
      const withStrategy = allEnrollments.filter((e: any) => e.discoverySessionScheduledAt).length;
      const withKickoff = allEnrollments.filter((e: any) => e.discoverySessionCompletedAt).length;
      // Task stats
      const allTasks = await database.select({ id: projectTasks.id, status: projectTasks.status, dueDate: projectTasks.dueDate, assignedTeamMemberId: projectTasks.assignedTeamMemberId, completedAt: projectTasks.completedAt, createdAt: projectTasks.createdAt }).from(projectTasks);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const pendingTasks = allTasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');
      const overdueTasks = pendingTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now);
      const completedThisWeek = allTasks.filter((t: any) => t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= weekAgo);
      let avgCompletionDays = 0;
      const completedWithDates = allTasks.filter((t: any) => t.status === 'completed' && t.completedAt && t.createdAt);
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum: number, t: any) => sum + (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0);
        avgCompletionDays = Math.round((totalDays / completedWithDates.length) * 10) / 10;
      }
      const allTeam = await database.select({ id: teamMembers.id, name: teamMembers.name }).from(teamMembers).where(eq(teamMembers.isActive, true));
      const tasksByTeam = allTeam.map((tm: any) => {
        const assigned = pendingTasks.filter((t: any) => t.assignedTeamMemberId === tm.id);
        const overdueForMember = assigned.filter((t: any) => t.dueDate && new Date(t.dueDate) < now);
        return { name: tm.name, pending: assigned.length, overdue: overdueForMember.length };
      }).filter((tm: any) => tm.pending > 0).sort((a: any, b: any) => b.pending - a.pending);
      // Fulfillment stats
      const allSlips = await database.select({ id: packingSlips.id, status: packingSlips.status, createdAt: packingSlips.createdAt, deliveryStatus: packingSlips.deliveryStatus, deliveredAt: packingSlips.deliveredAt }).from(packingSlips);
      const pendingSlips = allSlips.filter((s: any) => s.status !== 'complete' && s.status !== 'cancelled').length;
      const shippedThisWeek = allSlips.filter((s: any) => (s.deliveryStatus === 'shipped' || s.deliveryStatus === 'in_transit' || s.deliveryStatus === 'delivered') && s.createdAt && new Date(s.createdAt) >= weekAgo).length;
      let avgFulfillmentDays = 0;
      const deliveredSlips = allSlips.filter((s: any) => s.deliveredAt && s.createdAt);
      if (deliveredSlips.length > 0) {
        const totalFulfillDays = deliveredSlips.reduce((sum: number, s: any) => sum + (new Date(s.deliveredAt).getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0);
        avgFulfillmentDays = Math.round((totalFulfillDays / deliveredSlips.length) * 10) / 10;
      }
      const allSlipItems = await database.select({ id: packingSlipItems.id, status: packingSlipItems.status }).from(packingSlipItems);
      const backorderedItems = allSlipItems.filter((i: any) => i.status === 'backordered').length;
      // Stage timing
      const enrollmentsWithDates = allEnrollments.filter((e: any) => e.createdAt);
      const stageTimings: Array<{ fromStage: string; toStage: string; avgDays: number }> = [];
      if (enrollmentsWithDates.length > 0) {
        const withStrategyDates = enrollmentsWithDates.filter((e: any) => e.discoverySessionScheduledAt);
        if (withStrategyDates.length > 0) {
          const avgDays = withStrategyDates.reduce((sum: number, e: any) => sum + (new Date(e.discoverySessionScheduledAt).getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0) / withStrategyDates.length;
          stageTimings.push({ fromStage: 'Enrollment', toStage: 'Strategy Session', avgDays: Math.round(avgDays * 10) / 10 });
        }
        const withCompletedDates = enrollmentsWithDates.filter((e: any) => e.discoverySessionCompletedAt && e.discoverySessionScheduledAt);
        if (withCompletedDates.length > 0) {
          const avgDays = withCompletedDates.reduce((sum: number, e: any) => sum + (new Date(e.discoverySessionCompletedAt).getTime() - new Date(e.discoverySessionScheduledAt).getTime()) / (1000 * 60 * 60 * 24), 0) / withCompletedDates.length;
          stageTimings.push({ fromStage: 'Strategy Session', toStage: 'Kickoff Call', avgDays: Math.round(avgDays * 10) / 10 });
        }
      }
      return {
        pipeline: { total: totalProspects, byStage: pipelineByStage },
        conversion: {
          discoveryToEnrollment: Math.round((enrolledCount / totalProspects) * 100),
          enrollmentToStrategy: enrolledCount > 0 ? Math.round((withStrategy / enrolledCount) * 100) : 0,
          strategyToKickoff: withStrategy > 0 ? Math.round((withKickoff / withStrategy) * 100) : 0,
        },
        tasks: { total: pendingTasks.length, overdue: overdueTasks.length, completedThisWeek: completedThisWeek.length, avgCompletionDays, byTeamMember: tasksByTeam },
        fulfillment: { pendingSlips, backorderedItems, avgFulfillmentDays, shippedThisWeek },
        stageTimings,
      };
      } catch (err: any) {
        console.error('[KPI getDashboard] Error:', err.message, err.stack);
        throw err;
      }
    }),
  }),
});
export type AppRouter = typeof appRouter;
