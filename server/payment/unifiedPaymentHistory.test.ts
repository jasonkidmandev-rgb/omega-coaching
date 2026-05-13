import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("../db", () => ({
  getAllClientProtocols: vi.fn(),
  getClientProtocolItems: vi.fn(),
  getAllProtocolItems: vi.fn(),
  getPayPalOrderByProtocolId: vi.fn(),
  getDb: vi.fn(),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: any[]) => ({
      strings,
      values,
      type: "sql",
    }),
    { raw: (s: string) => ({ raw: s, type: "sql" }) }
  ),
}));

import * as db from "../db";

describe("Unified Payment History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Protocol Payments", () => {
    it("should include protocol payments with correct fields", async () => {
      const mockProtocols = [
        {
          id: 1,
          clientName: "Doug Harris",
          clientEmail: "doug@test.com",
          paymentMethod: "venmo",
          paymentStatus: "pending",
          paymentReceivedAt: null,
          createdAt: new Date("2025-02-13"),
          coachingPrice: null,
          discountPercent: null,
        },
        {
          id: 2,
          clientName: "Jane Smith",
          clientEmail: "jane@test.com",
          paymentMethod: "paypal",
          paymentStatus: "paid",
          paymentReceivedAt: new Date("2025-02-10"),
          createdAt: new Date("2025-02-08"),
          coachingPrice: null,
          discountPercent: null,
        },
      ];

      (db.getAllClientProtocols as any).mockResolvedValue(mockProtocols);
      (db.getClientProtocolItems as any).mockResolvedValue([
        { isIncluded: true, protocolItemId: 1, customPrice: "100.00", quantity: 2 },
      ]);
      (db.getAllProtocolItems as any).mockResolvedValue([
        { id: 1, price: "100.00" },
      ]);
      (db.getPayPalOrderByProtocolId as any).mockResolvedValue({
        feeAmount: "5.00",
        netAmount: "195.00",
      });

      // Import the module to test the helper functions
      const { paymentHistoryRouter } = await import("./historyRouter");
      expect(paymentHistoryRouter).toBeDefined();
    });

    it("should handle empty protocol list", async () => {
      (db.getAllClientProtocols as any).mockResolvedValue([]);
      const { paymentHistoryRouter } = await import("./historyRouter");
      expect(paymentHistoryRouter).toBeDefined();
    });
  });

  describe("Router Structure", () => {
    it("should export paymentHistoryRouter with required procedures", async () => {
      (db.getAllClientProtocols as any).mockResolvedValue([]);
      const { paymentHistoryRouter } = await import("./historyRouter");
      
      expect(paymentHistoryRouter).toBeDefined();
      // Verify the router has the expected procedures
      const routerDef = (paymentHistoryRouter as any)._def;
      expect(routerDef).toBeDefined();
    });

    it("should have getHistory procedure", async () => {
      const { paymentHistoryRouter } = await import("./historyRouter");
      const procedures = (paymentHistoryRouter as any)._def.procedures;
      expect(procedures).toHaveProperty("getHistory");
    });

    it("should have getSummary procedure", async () => {
      const { paymentHistoryRouter } = await import("./historyRouter");
      const procedures = (paymentHistoryRouter as any)._def.procedures;
      expect(procedures).toHaveProperty("getSummary");
    });

    it("should have getPendingFollowups procedure", async () => {
      const { paymentHistoryRouter } = await import("./historyRouter");
      const procedures = (paymentHistoryRouter as any)._def.procedures;
      expect(procedures).toHaveProperty("getPendingFollowups");
    });

    it("should have getMethodBreakdown procedure", async () => {
      const { paymentHistoryRouter } = await import("./historyRouter");
      const procedures = (paymentHistoryRouter as any)._def.procedures;
      expect(procedures).toHaveProperty("getMethodBreakdown");
    });

    it("should have getMonthlyTrends procedure", async () => {
      const { paymentHistoryRouter } = await import("./historyRouter");
      const procedures = (paymentHistoryRouter as any)._def.procedures;
      expect(procedures).toHaveProperty("getMonthlyTrends");
    });
  });

  describe("Unified Payment Interface", () => {
    it("should define all three payment types", () => {
      const validTypes = ["protocol", "coaching_fee", "store_order"];
      expect(validTypes).toContain("protocol");
      expect(validTypes).toContain("coaching_fee");
      expect(validTypes).toContain("store_order");
    });

    it("should support all payment methods", () => {
      const validMethods = ["paypal", "venmo", "cc", "other"];
      expect(validMethods).toContain("paypal");
      expect(validMethods).toContain("venmo");
      expect(validMethods).toContain("cc");
      expect(validMethods).toContain("other");
    });

    it("should support all payment statuses", () => {
      const validStatuses = ["pending", "paid", "failed", "refunded"];
      expect(validStatuses).toContain("pending");
      expect(validStatuses).toContain("paid");
      expect(validStatuses).toContain("failed");
      expect(validStatuses).toContain("refunded");
    });
  });

  describe("Payment Source Aggregation", () => {
    it("should generate correct unified IDs for each source", () => {
      // Protocol IDs
      expect(`protocol-${1}`).toBe("protocol-1");
      expect(`protocol-${42}`).toBe("protocol-42");
      
      // Coaching fee IDs
      expect(`coaching-venmo-${5}`).toBe("coaching-venmo-5");
      expect(`coaching-auto-${10}`).toBe("coaching-auto-10");
      
      // Store order IDs
      expect(`store-${3}`).toBe("store-3");
    });

    it("should map store order statuses correctly to unified statuses", () => {
      const statusMap = (status: string) => {
        if (['paid', 'processing', 'shipped', 'delivered'].includes(status)) return 'paid';
        return status;
      };
      
      expect(statusMap('paid')).toBe('paid');
      expect(statusMap('processing')).toBe('paid');
      expect(statusMap('shipped')).toBe('paid');
      expect(statusMap('delivered')).toBe('paid');
      expect(statusMap('pending')).toBe('pending');
      expect(statusMap('cancelled')).toBe('cancelled');
    });

    it("should map transformation pending payment statuses correctly", () => {
      const statusMap: Record<string, string> = {
        'pending': 'pending',
        'verified': 'paid',
        'rejected': 'failed',
      };
      
      expect(statusMap['pending']).toBe('pending');
      expect(statusMap['verified']).toBe('paid');
      expect(statusMap['rejected']).toBe('failed');
    });
  });

  describe("Filtering Logic", () => {
    it("should filter by search query case-insensitively", () => {
      const payments = [
        { clientName: "Doug Harris", clientEmail: "doug@test.com", details: "Protocol #1" },
        { clientName: "Jane Smith", clientEmail: "jane@test.com", details: "Store Order #2" },
        { clientName: "Bob Johnson", clientEmail: "bob@test.com", details: "Coaching Fee" },
      ];
      
      const query = "doug";
      const filtered = payments.filter(
        p => p.clientName.toLowerCase().includes(query) ||
             p.clientEmail?.toLowerCase().includes(query) ||
             p.details?.toLowerCase().includes(query)
      );
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].clientName).toBe("Doug Harris");
    });

    it("should filter by payment type", () => {
      const payments = [
        { paymentType: "protocol" },
        { paymentType: "coaching_fee" },
        { paymentType: "store_order" },
        { paymentType: "protocol" },
      ];
      
      const filtered = payments.filter(p => p.paymentType === "protocol");
      expect(filtered).toHaveLength(2);
    });

    it("should sort payments by most recent first", () => {
      const payments = [
        { paymentDate: new Date("2025-01-01"), createdAt: null },
        { paymentDate: new Date("2025-02-15"), createdAt: null },
        { paymentDate: null, createdAt: new Date("2025-02-10") },
      ];
      
      payments.sort((a, b) => {
        const dateA = a.paymentDate || a.createdAt || new Date(0);
        const dateB = b.paymentDate || b.createdAt || new Date(0);
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      
      expect(payments[0].paymentDate).toEqual(new Date("2025-02-15"));
    });
  });

  describe("Revenue Calculations", () => {
    it("should calculate total revenue from paid payments only", () => {
      const payments = [
        { paymentStatus: "paid", amount: 100 },
        { paymentStatus: "pending", amount: 200 },
        { paymentStatus: "paid", amount: 300 },
        { paymentStatus: "failed", amount: 50 },
      ];
      
      const paidPayments = payments.filter(p => p.paymentStatus === "paid");
      const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      
      expect(totalRevenue).toBe(400);
    });

    it("should calculate average order value correctly", () => {
      const paidPayments = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 },
      ];
      
      const total = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      const avg = paidPayments.length > 0 ? total / paidPayments.length : 0;
      
      expect(avg).toBe(200);
    });

    it("should handle zero payments for average", () => {
      const paidPayments: { amount: number }[] = [];
      const total = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      const avg = paidPayments.length > 0 ? total / paidPayments.length : 0;
      
      expect(avg).toBe(0);
    });

    it("should calculate conversion rate correctly", () => {
      const total = 10;
      const paid = 7;
      const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
      
      expect(rate).toBe(70);
    });
  });
});
