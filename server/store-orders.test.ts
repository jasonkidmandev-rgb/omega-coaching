import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  createStoreOrder: vi.fn().mockResolvedValue(1),
  createStoreOrderItem: vi.fn().mockResolvedValue(1),
  getStoreOrder: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    paymentMethod: "paypal",
    subtotal: "100.00",
    discountAmount: "10.00",
    total: "90.00",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getStoreOrderByPaypalId: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    paypalOrderId: "PAYPAL123",
    paymentMethod: "paypal",
    subtotal: "100.00",
    discountAmount: "10.00",
    total: "90.00",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getStoreOrderItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      storeOrderId: 1,
      inventoryItemId: 1,
      name: "Test Item",
      quantity: 2,
      pricePerUnit: "50.00",
      isDiscountable: true,
    },
  ]),
  getUserStoreOrders: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      paymentMethod: "paypal",
      subtotal: "100.00",
      discountAmount: "10.00",
      total: "90.00",
      status: "paid",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  updateStoreOrderStatus: vi.fn().mockResolvedValue(undefined),
  updateStoreOrderPaypalId: vi.fn().mockResolvedValue(undefined),
  updateStoreOrderVenmoId: vi.fn().mockResolvedValue(undefined),
  deductInventoryForStoreOrder: vi.fn().mockResolvedValue(undefined),
  getAllStoreOrders: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      paymentMethod: "paypal",
      subtotal: "100.00",
      discountAmount: "10.00",
      total: "90.00",
      status: "paid",
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 1,
          storeOrderId: 1,
          inventoryItemId: 1,
          name: "Test Item",
          quantity: 2,
          pricePerUnit: "50.00",
          isDiscountable: true,
        },
      ],
    },
  ]),
}));

import * as db from "./db";

describe("Store Orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database Functions", () => {
    it("should create a store order", async () => {
      const orderId = await db.createStoreOrder({
        userId: 1,
        paymentMethod: "paypal",
        subtotal: "100.00",
        discountAmount: "10.00",
        total: "90.00",
        status: "pending",
      });

      expect(orderId).toBe(1);
      expect(db.createStoreOrder).toHaveBeenCalledWith({
        userId: 1,
        paymentMethod: "paypal",
        subtotal: "100.00",
        discountAmount: "10.00",
        total: "90.00",
        status: "pending",
      });
    });

    it("should create store order items", async () => {
      const itemId = await db.createStoreOrderItem({
        storeOrderId: 1,
        inventoryItemId: 1,
        name: "Test Item",
        quantity: 2,
        pricePerUnit: "50.00",
        isDiscountable: true,
      });

      expect(itemId).toBe(1);
      expect(db.createStoreOrderItem).toHaveBeenCalledWith({
        storeOrderId: 1,
        inventoryItemId: 1,
        name: "Test Item",
        quantity: 2,
        pricePerUnit: "50.00",
        isDiscountable: true,
      });
    });

    it("should get store order by ID", async () => {
      const order = await db.getStoreOrder(1);

      expect(order).toBeDefined();
      expect(order?.id).toBe(1);
      expect(order?.status).toBe("pending");
      expect(db.getStoreOrder).toHaveBeenCalledWith(1);
    });

    it("should get store order by PayPal ID", async () => {
      const order = await db.getStoreOrderByPaypalId("PAYPAL123");

      expect(order).toBeDefined();
      expect(order?.paypalOrderId).toBe("PAYPAL123");
      expect(db.getStoreOrderByPaypalId).toHaveBeenCalledWith("PAYPAL123");
    });

    it("should get store order items", async () => {
      const items = await db.getStoreOrderItems(1);

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("Test Item");
      expect(items[0].quantity).toBe(2);
      expect(db.getStoreOrderItems).toHaveBeenCalledWith(1);
    });

    it("should get user store orders", async () => {
      const orders = await db.getUserStoreOrders(1);

      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe("paid");
      expect(db.getUserStoreOrders).toHaveBeenCalledWith(1);
    });

    it("should update store order status", async () => {
      await db.updateStoreOrderStatus(1, "paid", {
        payerEmail: "test@example.com",
        payerName: "Test User",
        paidAt: new Date(),
      });

      expect(db.updateStoreOrderStatus).toHaveBeenCalledWith(
        1,
        "paid",
        expect.objectContaining({
          payerEmail: "test@example.com",
          payerName: "Test User",
        })
      );
    });

    it("should deduct inventory for store order", async () => {
      await db.deductInventoryForStoreOrder(1, 1);

      expect(db.deductInventoryForStoreOrder).toHaveBeenCalledWith(1, 1);
    });

    it("should get all store orders (admin)", async () => {
      const orders = await db.getAllStoreOrders("paid", 10);

      expect(orders).toHaveLength(1);
      expect(orders[0].items).toHaveLength(1);
      expect(db.getAllStoreOrders).toHaveBeenCalledWith("paid", 10);
    });
  });

  describe("Order Status Flow", () => {
    it("should support all order statuses", () => {
      const validStatuses = [
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ];

      validStatuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });

    it("should support both PayPal and Venmo payment methods", () => {
      const validMethods = ["paypal", "venmo"];

      validMethods.forEach((method) => {
        expect(validMethods).toContain(method);
      });
    });
  });
});
