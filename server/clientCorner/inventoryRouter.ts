import { z } from "zod";
import { router, adminProcedure, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { clientInventory, inventoryHistory } from "../../drizzle/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

// Status levels
export const INVENTORY_STATUSES = ['full', 'half', 'running_low', 'out'] as const;
export type InventoryStatus = typeof INVENTORY_STATUSES[number];

// ============ CLIENT INVENTORY ROUTER ============
export const clientInventoryRouter = router({
  // Get all inventory items for a client
  list: protectedProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const items = await database
        .select()
        .from(clientInventory)
        .where(eq(clientInventory.clientProtocolId, input.clientProtocolId))
        .orderBy(asc(clientInventory.itemCategory), asc(clientInventory.itemName));
      return items;
    }),
  
  // Get inventory item by ID
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const [item] = await database
        .select()
        .from(clientInventory)
        .where(eq(clientInventory.id, input.id));
      return item;
    }),
  
  // Initialize inventory from client's protocol items
  initializeFromProtocol: adminProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { getClientProtocolItems, getAllProtocolItems, getAllCategories } = await import("../db");
      
      // Get client's protocol items
      const protocolItems = await getClientProtocolItems(input.clientProtocolId);
      
      // Get all protocol items and categories for lookup
      const allProtocolItems = await getAllProtocolItems();
      const allCategories = await getAllCategories();
      
      // Check existing inventory
      const existing = await database
        .select()
        .from(clientInventory)
        .where(eq(clientInventory.clientProtocolId, input.clientProtocolId));
      
      const existingProtocolItemIds = new Set(existing.map(e => e.protocolItemId));
      
      // Add new items that don't exist yet
      let added = 0;
      for (const item of protocolItems) {
        if (!existingProtocolItemIds.has(item.protocolItemId)) {
          // Get the protocol item details
          const protocolItem = allProtocolItems.find(p => p.id === item.protocolItemId);
          let categoryName = 'Uncategorized';
          if (protocolItem?.categoryId) {
            const category = allCategories.find(c => c.id === protocolItem.categoryId);
            categoryName = category?.name || 'Uncategorized';
          }
          
          await database.insert(clientInventory).values({
            clientProtocolId: input.clientProtocolId,
            protocolItemId: item.protocolItemId,
            itemName: protocolItem?.name || `Item ${item.protocolItemId}`,
            itemCategory: categoryName,
            status: 'full',
            isCustom: false,
            addedBy: 'system',
            expectedQuantity: item.quantity,
          });
          added++;
        }
      }
      
      return { added, total: existing.length + added };
    }),
  
  // Add a custom inventory item
  addCustomItem: protectedProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      itemName: z.string().min(1),
      itemCategory: z.string().optional(),
      notes: z.string().optional(),
      addedBy: z.enum(['coach', 'client']),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const [result] = await database.insert(clientInventory).values({
        clientProtocolId: input.clientProtocolId,
        itemName: input.itemName,
        itemCategory: input.itemCategory || 'Custom',
        status: 'full',
        isCustom: true,
        addedBy: input.addedBy,
        notes: input.notes,
      });
      
      return { id: result.insertId };
    }),
  
  // Update inventory status
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['full', 'half', 'running_low', 'out']),
      notes: z.string().optional(),
      changedBy: z.enum(['client', 'coach']),
      changedByUserId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      
      // Get current status
      const [current] = await database
        .select()
        .from(clientInventory)
        .where(eq(clientInventory.id, input.id));
      
      if (!current) {
        throw new Error("Inventory item not found");
      }
      
      const oldStatus = current.status;
      
      // Update status
      await database
        .update(clientInventory)
        .set({
          status: input.status,
          notes: input.notes,
          lastUpdatedAt: new Date(),
        })
        .where(eq(clientInventory.id, input.id));
      
      // Log history
      await database.insert(inventoryHistory).values({
        clientInventoryId: input.id,
        oldStatus,
        newStatus: input.status,
        changedBy: input.changedBy,
        changedByUserId: input.changedByUserId,
        notes: input.notes,
      });
      
      return { success: true, oldStatus, newStatus: input.status };
    }),
  
  // Bulk update statuses
  bulkUpdateStatus: protectedProcedure
    .input(z.object({
      updates: z.array(z.object({
        id: z.number(),
        status: z.enum(['full', 'half', 'running_low', 'out']),
      })),
      changedBy: z.enum(['client', 'coach']),
      changedByUserId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      let updated = 0;
      
      for (const update of input.updates) {
        // Get current status
        const [current] = await database
          .select()
          .from(clientInventory)
          .where(eq(clientInventory.id, update.id));
        
        if (current && current.status !== update.status) {
          await database
            .update(clientInventory)
            .set({
              status: update.status,
              lastUpdatedAt: new Date(),
            })
            .where(eq(clientInventory.id, update.id));
          
          // Log history
          await database.insert(inventoryHistory).values({
            clientInventoryId: update.id,
            oldStatus: current.status,
            newStatus: update.status,
            changedBy: input.changedBy,
            changedByUserId: input.changedByUserId,
          });
          
          updated++;
        }
      }
      
      return { updated };
    }),
  
  // Update item details
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      itemName: z.string().optional(),
      itemCategory: z.string().optional(),
      expectedQuantity: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { id, ...data } = input;
      
      await database
        .update(clientInventory)
        .set(data)
        .where(eq(clientInventory.id, id));
      
      return { success: true };
    }),
  
  // Delete inventory item
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      
      // Delete history first
      await database
        .delete(inventoryHistory)
        .where(eq(inventoryHistory.clientInventoryId, input.id));
      
      // Delete item
      await database
        .delete(clientInventory)
        .where(eq(clientInventory.id, input.id));
      
      return { success: true };
    }),
  
  // Get history for an item
  getHistory: protectedProcedure
    .input(z.object({ clientInventoryId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const history = await database
        .select()
        .from(inventoryHistory)
        .where(eq(inventoryHistory.clientInventoryId, input.clientInventoryId))
        .orderBy(desc(inventoryHistory.createdAt));
      return history;
    }),
  
  // Get items that need reorder (running_low or out)
  getNeedsReorder: adminProcedure
    .input(z.object({ clientProtocolId: z.number().optional() }))
    .query(async ({ input }) => {
      const database = await db();
      const items = await database
        .select()
        .from(clientInventory)
        .where(sql`${clientInventory.status} IN ('running_low', 'out')`)
        .orderBy(asc(clientInventory.clientProtocolId), asc(clientInventory.itemName));
      
      if (input.clientProtocolId) {
        return items.filter(i => i.clientProtocolId === input.clientProtocolId);
      }
      return items;
    }),
  
  // Mark reorder alert sent
  markReorderAlertSent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database
        .update(clientInventory)
        .set({
          lastReorderAlertAt: new Date(),
          reorderTaskCreated: true,
        })
        .where(eq(clientInventory.id, input.id));
      return { success: true };
    }),
  
  // Get inventory stats for dashboard
  getStats: adminProcedure.query(async () => {
    const database = await db();
    
    const [stats] = await database
      .select({
        total: sql<number>`COUNT(*)`,
        full: sql<number>`SUM(CASE WHEN ${clientInventory.status} = 'full' THEN 1 ELSE 0 END)`,
        half: sql<number>`SUM(CASE WHEN ${clientInventory.status} = 'half' THEN 1 ELSE 0 END)`,
        runningLow: sql<number>`SUM(CASE WHEN ${clientInventory.status} = 'running_low' THEN 1 ELSE 0 END)`,
        out: sql<number>`SUM(CASE WHEN ${clientInventory.status} = 'out' THEN 1 ELSE 0 END)`,
      })
      .from(clientInventory);
    
    return stats;
  }),
  
  // Get all clients with low inventory (for bulk view)
  getBulkLowInventory: adminProcedure.query(async () => {
    const database = await db();
    const items = await database
      .select()
      .from(clientInventory)
      .where(sql`${clientInventory.status} IN ('running_low', 'out')`)
      .orderBy(desc(clientInventory.lastUpdatedAt));
    
    return items;
  }),

  // ============ CLIENT PORTAL ACCESS ============
  // Get inventory for client portal (via token)
  getClientInventory: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const database = await db();
      const { getClientProtocolByToken } = await import("../db");
      const protocol = await getClientProtocolByToken(input.token);
      
      if (!protocol) {
        throw new Error("Invalid access token");
      }
      
      const items = await database
        .select()
        .from(clientInventory)
        .where(eq(clientInventory.clientProtocolId, protocol.id))
        .orderBy(asc(clientInventory.itemCategory), asc(clientInventory.itemName));
      
      return items;
    }),
  
  // Client updates their inventory status (via token)
  clientUpdateStatus: publicProcedure
    .input(z.object({
      token: z.string(),
      id: z.number(),
      status: z.enum(['full', 'half', 'running_low', 'out']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { getClientProtocolByToken } = await import("../db");
      const protocol = await getClientProtocolByToken(input.token);
      
      if (!protocol) {
        throw new Error("Invalid access token");
      }
      
      // Verify item belongs to this client
      const [item] = await database
        .select()
        .from(clientInventory)
        .where(and(
          eq(clientInventory.id, input.id),
          eq(clientInventory.clientProtocolId, protocol.id)
        ));
      
      if (!item) {
        throw new Error("Inventory item not found");
      }
      
      const oldStatus = item.status;
      
      // Update status
      await database
        .update(clientInventory)
        .set({
          status: input.status,
          notes: input.notes,
          lastUpdatedAt: new Date(),
        })
        .where(eq(clientInventory.id, input.id));
      
      // Log history
      await database.insert(inventoryHistory).values({
        clientInventoryId: input.id,
        oldStatus,
        newStatus: input.status,
        changedBy: 'client',
        notes: input.notes,
      });
      
      return { success: true, oldStatus, newStatus: input.status };
    }),
  
  // Client adds custom item (via token)
  clientAddItem: publicProcedure
    .input(z.object({
      token: z.string(),
      itemName: z.string().min(1),
      itemCategory: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { getClientProtocolByToken } = await import("../db");
      const protocol = await getClientProtocolByToken(input.token);
      
      if (!protocol) {
        throw new Error("Invalid access token");
      }
      
      const [result] = await database.insert(clientInventory).values({
        clientProtocolId: protocol.id,
        itemName: input.itemName,
        itemCategory: input.itemCategory || 'Custom',
        status: 'full',
        isCustom: true,
        addedBy: 'client',
        notes: input.notes,
      });
      
      return { id: result.insertId };
    }),

  // Get inventory for logged-in client
  getMyInventory: protectedProcedure.query(async ({ ctx }) => {
    const database = await db();
    
    // Get client's protocol ID from user email
    const { clientProtocols, users } = await import("../../drizzle/schema");
    const [user] = await database
      .select()
      .from(users)
      .where(eq(users.id, ctx.user!.id));
    
    if (!user?.email) {
      return [];
    }
    
    const [protocol] = await database
      .select()
      .from(clientProtocols)
      .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${user.email})`);
    
    if (!protocol) {
      return [];
    }
    
    const items = await database
      .select()
      .from(clientInventory)
      .where(eq(clientInventory.clientProtocolId, protocol.id))
      .orderBy(asc(clientInventory.itemCategory), asc(clientInventory.itemName));
    
    return items;
  }),

  // Request reorder (client)
  requestReorder: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      
      // Get the inventory item
      const [item] = await database
        .select()
        .from(clientInventory)
        .where(eq(clientInventory.id, input.itemId));
      
      if (!item) {
        throw new Error("Item not found");
      }
      
      // Update the item to mark reorder requested
      await database
        .update(clientInventory)
        .set({
          lastReorderAlertAt: new Date(),
          reorderTaskCreated: true,
        })
        .where(eq(clientInventory.id, input.itemId));
      
      // Log the history
      await database.insert(inventoryHistory).values({
        clientInventoryId: input.itemId,
        oldStatus: item.status,
        newStatus: item.status,
        changedBy: 'client',
        notes: 'Reorder requested by client',
      });
      
      // Create task in projects
      const { clientProjects, projectTasks } = await import("../../drizzle/schema");
      
      // Get client project for this protocol
      const [project] = await database
        .select()
        .from(clientProjects)
        .where(eq(clientProjects.clientProtocolId, item.clientProtocolId));
      
      if (project) {
        // Find a lifecycle stage to attach the task to
        const { lifecycleStages } = await import("../../drizzle/schema");
        const [stage] = await database
          .select()
          .from(lifecycleStages)
          .limit(1);
        
        if (stage) {
          await database.insert(projectTasks).values({
            clientProjectId: project.id,
            lifecycleStageId: stage.id,
            name: `Reorder Request: ${item.itemName}`,
            description: `Client has requested to reorder ${item.itemName}. Current status: ${item.status}`,
            status: 'pending',
          });
        }
      }
      
      // Get store link for the item
      const storeLink = '/order';
      
      return { success: true, storeLink };
    }),

  // Sync inventory from store order (called when order is paid)
  syncFromStoreOrder: adminProcedure
    .input(z.object({ 
      storeOrderId: z.number(),
      userId: z.number()
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { getStoreOrderItems, getUserById } = await import("../db");
      const { users, clientProtocols } = await import("../../drizzle/schema");
      
      // Get the user's email to find their client protocol
      const user = await getUserById(input.userId);
      if (!user) {
        console.log(`[Inventory Sync] User ${input.userId} not found`);
        return { success: false, message: 'User not found' };
      }
      
      // Find client protocol by user email
      if (!user.email) {
        return { success: false, message: 'User email not found' };
      }
      const [protocol] = await database
        .select()
        .from(clientProtocols)
        .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${user.email})`)
        .orderBy(desc(clientProtocols.createdAt))
        .limit(1);
      
      if (!protocol) {
        console.log(`[Inventory Sync] No protocol found for user ${user.email}`);
        return { success: false, message: 'No protocol found for user' };
      }
      
      // Get store order items
      const orderItems = await getStoreOrderItems(input.storeOrderId);
      if (!orderItems.length) {
        console.log(`[Inventory Sync] No items in store order ${input.storeOrderId}`);
        return { success: false, message: 'No items in order' };
      }
      
      // Get client's existing inventory
      const existingInventory = await database
        .select()
        .from(clientInventory)
        .where(eq(clientInventory.clientProtocolId, protocol.id));
      
      let updatedCount = 0;
      
      for (const orderItem of orderItems) {
        // Try to match by item name (case-insensitive)
        const matchingInventory = existingInventory.find(
          inv => inv.itemName.toLowerCase() === orderItem.name.toLowerCase()
        );
        
        if (matchingInventory) {
          // Update status to 'full' since they just purchased
          const oldStatus = matchingInventory.status;
          
          await database
            .update(clientInventory)
            .set({
              status: 'full',
              lastUpdatedAt: new Date(),
              lastReorderAlertAt: null,
              reorderTaskCreated: false,
            })
            .where(eq(clientInventory.id, matchingInventory.id));
          
          // Log the history
          await database.insert(inventoryHistory).values({
            clientInventoryId: matchingInventory.id,
            oldStatus,
            newStatus: 'full',
            changedBy: 'system',
            notes: `Auto-restocked from store order #${input.storeOrderId}`,
          });
          
          updatedCount++;
          console.log(`[Inventory Sync] Updated ${matchingInventory.itemName} to 'full' for protocol ${protocol.id}`);
        }
      }
      
      console.log(`[Inventory Sync] Updated ${updatedCount} items for store order ${input.storeOrderId}`);
      return { success: true, updatedCount };
    }),
});
