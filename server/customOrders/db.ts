import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  customOrders,
  customOrderItems,
  customOrderVenmoPayments,
  inventoryItems,
  inventoryTransactions,
  type InsertCustomOrder,
  type InsertCustomOrderItem,
} from "../../drizzle/schema";

// ─── Order Number Generation ──────────────────────────────────────────────────

export async function generateOrderNumber(): Promise<string> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(customOrders);
  
  const nextNum = (result[0]?.count || 0) + 1;
  return `CO-${String(nextNum).padStart(4, "0")}`;
}

// ─── Custom Order CRUD ────────────────────────────────────────────────────────

export async function createCustomOrder(data: Omit<InsertCustomOrder, "id" | "createdAt" | "updatedAt">) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const [result] = await database.insert(customOrders).values(data);
  return result.insertId;
}

export async function getCustomOrder(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const [order] = await database
    .select()
    .from(customOrders)
    .where(eq(customOrders.id, id));
  return order || null;
}

export async function getCustomOrderByPaypalId(paypalOrderId: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const [order] = await database
    .select()
    .from(customOrders)
    .where(eq(customOrders.paypalOrderId, paypalOrderId));
  return order || null;
}

export async function getAllCustomOrders(statusFilter?: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const conditions = [];
  if (statusFilter) {
    conditions.push(eq(customOrders.status, statusFilter as any));
  }
  
  const orders = await database
    .select()
    .from(customOrders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(customOrders.createdAt));
  
  // Get items for each order
  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await getCustomOrderItems(order.id);
      return { ...order, items };
    })
  );
  
  return ordersWithItems;
}

export async function getUserCustomOrders(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const orders = await database
    .select()
    .from(customOrders)
    .where(eq(customOrders.userId, userId))
    .orderBy(desc(customOrders.createdAt));
  
  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await getCustomOrderItems(order.id);
      return { ...order, items };
    })
  );
  
  return ordersWithItems;
}

export async function updateCustomOrderStatus(
  id: number,
  status: string,
  extraData?: Record<string, any>
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const updateData: any = { status };
  
  if (status === "paid") updateData.paidAt = new Date();
  if (status === "shipped") updateData.shippedAt = new Date();
  if (status === "delivered") updateData.deliveredAt = new Date();
  if (status === "cancelled") updateData.cancelledAt = new Date();
  
  if (extraData) Object.assign(updateData, extraData);
  
  await database
    .update(customOrders)
    .set(updateData)
    .where(eq(customOrders.id, id));
}

export async function updateCustomOrderPaypalId(id: number, paypalOrderId: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database
    .update(customOrders)
    .set({ paypalOrderId })
    .where(eq(customOrders.id, id));
}

export async function updateCustomOrderShipping(
  id: number,
  data: {
    trackingNumber: string;
    trackingCarrier: string;
    status?: string;
    shippedAt?: Date;
  }
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database
    .update(customOrders)
    .set({
      trackingNumber: data.trackingNumber,
      trackingCarrier: data.trackingCarrier,
      ...(data.status ? { status: data.status as any } : {}),
      ...(data.shippedAt ? { shippedAt: data.shippedAt } : {}),
    })
    .where(eq(customOrders.id, id));
}

export async function updateCustomOrder(id: number, data: Partial<InsertCustomOrder>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database
    .update(customOrders)
    .set(data)
    .where(eq(customOrders.id, id));
}

export async function deleteCustomOrder(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Delete items first
  await database.delete(customOrderItems).where(eq(customOrderItems.customOrderId, id));
  // Delete venmo payments
  await database.delete(customOrderVenmoPayments).where(eq(customOrderVenmoPayments.customOrderId, id));
  // Delete order
  await database.delete(customOrders).where(eq(customOrders.id, id));
}

// ─── Custom Order Items ───────────────────────────────────────────────────────

export async function createCustomOrderItem(data: Omit<InsertCustomOrderItem, "id" | "createdAt">) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const [result] = await database.insert(customOrderItems).values(data);
  return result.insertId;
}

export async function getCustomOrderItems(customOrderId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  return database
    .select()
    .from(customOrderItems)
    .where(eq(customOrderItems.customOrderId, customOrderId));
}

export async function deleteCustomOrderItems(customOrderId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database
    .delete(customOrderItems)
    .where(eq(customOrderItems.customOrderId, customOrderId));
}

// ─── Venmo Payments for Custom Orders (REMOVED - migrating to Stripe) ────────

// ─── Inventory Deduction for Custom Orders ────────────────────────────────────

export async function deductInventoryForCustomOrder(customOrderId: number, userId?: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const items = await getCustomOrderItems(customOrderId);
  // Normalized to match deductInventoryForProtocol so all paths share one alerting helper.
  const results: { itemName: string; quantity: number; success: boolean; error?: string; wentNegative?: boolean; previousQuantity?: number; newQuantity?: number }[] = [];

  for (const item of items) {
    // Only physical products deduct stock. Service / shipping / one-off "custom"
    // lines legitimately have no inventory and must not raise alarms.
    if (item.itemType !== "product") continue;

    // A physical product with no inventory mapping sells without ever deducting —
    // surface it as a failure so admins can map it (mirrors the protocol path).
    if (!item.inventoryItemId) {
      results.push({
        itemName: item.name,
        quantity: item.quantity,
        success: false,
        error: 'No inventory mapping — item not deducted (map it to an inventory item)',
      });
      continue;
    }

    try {
      const [invItem] = await database
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, item.inventoryItemId));

      if (!invItem) {
        results.push({
          itemName: item.name,
          quantity: item.quantity,
          success: false,
          error: `Inventory item #${item.inventoryItemId} not found`,
        });
        continue;
      }

      const previousQty = invItem.quantity;
      // Allow negative stock — a negative marks a backorder ("we owe this"), which
      // must stay visible. (Previously clamped at 0, silently hiding backorders.)
      const newQty = previousQty - item.quantity;
      const wentNegative = newQty < 0;

      // Update inventory quantity
      await database
        .update(inventoryItems)
        .set({ quantity: newQty })
        .where(eq(inventoryItems.id, item.inventoryItemId));

      // Record transaction
      await database.insert(inventoryTransactions).values({
        inventoryItemId: item.inventoryItemId,
        type: "sale",
        quantityChange: -item.quantity,
        previousQuantity: previousQty,
        newQuantity: newQty,
        notes: `Custom order #${customOrderId} - ${item.name}`,
        performedBy: userId || null,
      });

      results.push({
        itemName: item.name,
        quantity: item.quantity,
        success: true,
        ...(wentNegative ? { wentNegative: true, previousQuantity: previousQty, newQuantity: newQty } : {}),
      });
    } catch (err) {
      console.error(`[CustomOrder] Failed to deduct inventory for item ${item.name}:`, err);
      results.push({
        itemName: item.name,
        quantity: item.quantity,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}

// ─── Packing Slip for Custom Orders ───────────────────────────────────────────

export async function createPackingSlipForCustomOrder(customOrderId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const { packingSlips, packingSlipItems } = await import("../../drizzle/schema");
  
  const order = await getCustomOrder(customOrderId);
  if (!order) throw new Error("Custom order not found");
  
  const items = await getCustomOrderItems(customOrderId);
  
  // Only include physical products (not services or custom line items)
  const shippableItems = items.filter(
    (item) => item.itemType === "product" && item.inventoryItemId
  );
  
  if (shippableItems.length === 0) {
    console.log(`[CustomOrder] No shippable items for order #${customOrderId}, skipping packing slip`);
    return null;
  }
  
  // Check if packing slip already exists for this custom order
  const { eq } = await import("drizzle-orm");
  const existingSlips = await database.select()
    .from(packingSlips)
    .where(eq(packingSlips.customOrderId, customOrderId));
  if (existingSlips.length > 0) {
    console.log(`[CustomOrder] Packing slip already exists for custom order ${customOrderId}`);
    return existingSlips[0].id;
  }
  
  // Create packing slip
  const [slipResult] = await database.insert(packingSlips).values({
    customOrderId: order.id,
    source: "custom" as any,
    clientName: order.clientName,
    clientEmail: order.clientEmail,
    shippingName: order.shippingName || order.clientName,
    shippingStreet: order.shippingStreet,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingZip: order.shippingZip,
    shippingCountry: order.shippingCountry || "United States",
    shippingPhone: order.shippingPhone,
    status: "pending",
    notes: `Custom Order ${order.orderNumber}`,
    storeOrderId: null,
    clientProtocolId: null,
    totalItems: shippableItems.reduce((sum, item) => sum + item.quantity, 0),
    itemsFulfilled: 0,
    itemsBackordered: 0,
  });
  
  const packingSlipId = Number(slipResult.insertId);
  
  // Create packing slip items
  for (const item of shippableItems) {
    await database.insert(packingSlipItems).values({
      packingSlipId,
      protocolItemId: item.inventoryItemId,
      itemName: item.name,
      itemType: "product",
      quantity: item.quantity,
      quantityFulfilled: 0,
      quantityBackordered: 0,
      status: "pending",
      price: item.pricePerUnit?.toString() || null,
    });
  }
  
  console.log(`[CustomOrder] Created packing slip ${packingSlipId} for custom order #${order.orderNumber} (${shippableItems.length} items)`);
  
  // Create audit log entry
  const { createPackingSlipAuditEntry } = await import("../db");
  await createPackingSlipAuditEntry({
    packingSlipId,
    action: 'created',
    details: {
      source: 'custom',
      customOrderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      total: order.total,
      itemCount: shippableItems.length,
    },
    performedByName: 'System (Custom Order)',
  });
  
  return packingSlipId;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getPendingCustomOrderVenmoCount() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(customOrders)
    .where(
      and(
        eq(customOrders.paymentMethod, "venmo"),
        eq(customOrders.status, "pending_venmo")
      )
    );
  
  return result[0]?.count || 0;
}
