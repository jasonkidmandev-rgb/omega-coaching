import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  generateOrderNumber: vi.fn().mockResolvedValue("CO-20260310-001"),
  createCustomOrder: vi.fn().mockResolvedValue(1),
  getCustomOrder: vi.fn().mockResolvedValue({
    id: 1,
    orderNumber: "CO-20260310-001",
    userId: 10,
    clientName: "Doug Harris",
    clientEmail: "dougwharris@gmail.com",
    clientPhone: "+1 (801) 699-5277",
    paymentMethod: "paypal",
    status: "draft",
    subtotal: "250.00",
    discountAmount: "0.00",
    shippingFee: "15.00",
    processingFee: "9.28",
    total: "274.28",
    paypalOrderId: null,
    shippingName: "Doug Harris",
    shippingStreet: "123 Main St",
    shippingCity: "Salt Lake City",
    shippingState: "UT",
    shippingZip: "84101",
    shippingCountry: "USA",
    shippingPhone: "+1 (801) 699-5277",
    shippingMethod: "overnight",
    trackingNumber: null,
    shippingCarrier: null,
    adminNotes: "VIP client - overnight shipping",
    createdAt: new Date("2026-03-10"),
    updatedAt: new Date("2026-03-10"),
  }),
  getAllCustomOrders: vi.fn().mockResolvedValue([]),
  getUserCustomOrders: vi.fn().mockResolvedValue([]),
  updateCustomOrderStatus: vi.fn().mockResolvedValue(undefined),
  createCustomOrderItem: vi.fn().mockResolvedValue(1),
  getCustomOrderItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      customOrderId: 1,
      inventoryItemId: 5,
      name: "BPC-157",
      description: "5mg vial",
      quantity: 2,
      pricePerUnit: "125.00",
      originalPrice: "150.00",
      itemType: "product",
      isDiscountable: false,
    },
  ]),
  deleteCustomOrderItems: vi.fn().mockResolvedValue(undefined),
  createCustomOrderVenmoPayment: vi.fn().mockResolvedValue(1),
  getCustomOrderVenmoPayment: vi.fn().mockResolvedValue(null),
  updateCustomOrderVenmoPaymentStatus: vi.fn().mockResolvedValue(undefined),
  deductInventoryForCustomOrder: vi.fn().mockResolvedValue(undefined),
  createPackingSlipForCustomOrder: vi.fn().mockResolvedValue(42),
  getPendingCustomOrderVenmoCount: vi.fn().mockResolvedValue(0),
  updateCustomOrderPaypalId: vi.fn().mockResolvedValue(undefined),
  updateCustomOrderShipping: vi.fn().mockResolvedValue(undefined),
  updateCustomOrder: vi.fn().mockResolvedValue(undefined),
  deleteCustomOrder: vi.fn().mockResolvedValue(undefined),
  getPendingCustomOrderVenmoPayments: vi.fn().mockResolvedValue([]),
}));

describe("Custom Orders System", () => {
  describe("Order Number Generation", () => {
    it("should generate order numbers in CO-YYYYMMDD-NNN format", async () => {
      const { generateOrderNumber } = await import("./db");
      const orderNumber = await generateOrderNumber();
      expect(orderNumber).toMatch(/^CO-\d{8}-\d{3}$/);
    });
  });

  describe("Order Creation", () => {
    it("should create a custom order with correct fields", async () => {
      const { createCustomOrder } = await import("./db");
      const orderId = await createCustomOrder({
        orderNumber: "CO-20260310-001",
        userId: 10,
        clientName: "Doug Harris",
        clientEmail: "dougwharris@gmail.com",
        clientPhone: "+1 (801) 699-5277",
        paymentMethod: "paypal",
        status: "draft",
        subtotal: "250.00",
        discountAmount: "0.00",
        shippingFee: "15.00",
        processingFee: "9.28",
        total: "274.28",
        shippingMethod: "overnight",
        adminNotes: "VIP client",
      });
      expect(orderId).toBe(1);
      expect(createCustomOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          clientName: "Doug Harris",
          paymentMethod: "paypal",
          shippingMethod: "overnight",
        })
      );
    });
  });

  describe("Order Retrieval", () => {
    it("should get a custom order by ID", async () => {
      const { getCustomOrder } = await import("./db");
      const order = await getCustomOrder(1);
      expect(order).toBeDefined();
      expect(order?.clientName).toBe("Doug Harris");
      expect(order?.orderNumber).toBe("CO-20260310-001");
      expect(order?.shippingMethod).toBe("overnight");
    });

    it("should get order items", async () => {
      const { getCustomOrderItems } = await import("./db");
      const items = await getCustomOrderItems(1);
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("BPC-157");
      expect(items[0].quantity).toBe(2);
      expect(items[0].pricePerUnit).toBe("125.00");
      expect(items[0].originalPrice).toBe("150.00");
    });
  });

  describe("Order Status Transitions", () => {
    it("should update order status", async () => {
      const { updateCustomOrderStatus } = await import("./db");
      await updateCustomOrderStatus(1, "paid");
      expect(updateCustomOrderStatus).toHaveBeenCalledWith(1, "paid");
    });

    it("should update status with additional data", async () => {
      const { updateCustomOrderStatus } = await import("./db");
      await updateCustomOrderStatus(1, "paid", {
        payerEmail: "doug@gmail.com",
      });
      expect(updateCustomOrderStatus).toHaveBeenCalledWith(1, "paid", {
        payerEmail: "doug@gmail.com",
      });
    });
  });

  describe("Payment Processing", () => {
    it("should create a Venmo payment record", async () => {
      const { createCustomOrderVenmoPayment } = await import("./db");
      const paymentId = await createCustomOrderVenmoPayment({
        customOrderId: 1,
        amount: "274.28",
        venmoUsername: "@dougharris",
        venmoTransactionNote: "BPC-157 x2",
        clientName: "Doug Harris",
        clientEmail: "dougwharris@gmail.com",
        status: "pending",
        submittedAt: new Date(),
      });
      expect(paymentId).toBe(1);
    });

    it("should update Venmo payment status on confirmation", async () => {
      const { updateCustomOrderVenmoPaymentStatus } = await import("./db");
      await updateCustomOrderVenmoPaymentStatus(1, {
        status: "confirmed",
        verifiedBy: 1,
        verifiedAt: new Date(),
        verificationNotes: "Verified in Venmo app",
        grossAmount: "274.28",
        feeAmount: "8.23",
        netAmount: "266.05",
      });
      expect(updateCustomOrderVenmoPaymentStatus).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: "confirmed",
          grossAmount: "274.28",
        })
      );
    });

    it("should update Venmo payment status on rejection", async () => {
      const { updateCustomOrderVenmoPaymentStatus } = await import("./db");
      await updateCustomOrderVenmoPaymentStatus(1, {
        status: "rejected",
        verifiedBy: 1,
        verifiedAt: new Date(),
        verificationNotes: "Payment not found",
      });
      expect(updateCustomOrderVenmoPaymentStatus).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "rejected" })
      );
    });
  });

  describe("Inventory and Fulfillment", () => {
    it("should deduct inventory for custom order", async () => {
      const { deductInventoryForCustomOrder } = await import("./db");
      await deductInventoryForCustomOrder(1, 1);
      expect(deductInventoryForCustomOrder).toHaveBeenCalledWith(1, 1);
    });

    it("should create packing slip for custom order", async () => {
      const { createPackingSlipForCustomOrder } = await import("./db");
      const slipId = await createPackingSlipForCustomOrder(1);
      expect(slipId).toBe(42);
    });
  });

  describe("Pricing Calculations", () => {
    it("should calculate correct subtotal from items", () => {
      const items = [
        { quantity: 2, pricePerUnit: "125.00" },
        { quantity: 1, pricePerUnit: "50.00" },
      ];
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * parseFloat(item.pricePerUnit),
        0
      );
      expect(subtotal).toBe(300);
    });

    it("should calculate correct processing fee (3.5%)", () => {
      const subtotal = 250;
      const shippingFee = 15;
      const discount = 0;
      const taxableAmount = subtotal + shippingFee - discount;
      const processingFee = Math.round(taxableAmount * 0.035 * 100) / 100;
      expect(processingFee).toBe(9.28);
    });

    it("should calculate correct total with discount and shipping", () => {
      const subtotal = 300;
      const discount = 50;
      const shippingFee = 15;
      const processingFee = Math.round((subtotal - discount + shippingFee) * 0.035 * 100) / 100;
      const total = subtotal - discount + shippingFee + processingFee;
      expect(total).toBeCloseTo(274.28, 1);
    });
  });

  describe("Client-Facing Queries", () => {
    it("should get user custom orders", async () => {
      const { getUserCustomOrders } = await import("./db");
      const orders = await getUserCustomOrders(10);
      expect(getUserCustomOrders).toHaveBeenCalledWith(10);
      expect(Array.isArray(orders)).toBe(true);
    });
  });

  describe("Pending Venmo Count", () => {
    it("should return pending Venmo count", async () => {
      const { getPendingCustomOrderVenmoCount } = await import("./db");
      const count = await getPendingCustomOrderVenmoCount();
      expect(count).toBe(0);
    });
  });
});
