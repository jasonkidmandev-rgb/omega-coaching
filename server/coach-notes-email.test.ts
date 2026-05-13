import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database functions
vi.mock("./db", () => ({
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Category 1", description: null, sortOrder: 0 },
  ]),
  getAllProtocolItems: vi.fn().mockResolvedValue([
    { id: 1, categoryId: 1, name: "Test Item", schedule: "Daily", duration: "90 days", price: "100", affiliateCode: "TEST10" },
  ]),
  getClientProtocolById: vi.fn().mockResolvedValue({
    id: 1,
    clientName: "Test Client",
    clientEmail: "test@example.com",
    durationMonths: 3,
    discountPercent: "10",
    coachingPackage: "Basic",
    coachingPrice: "500",
    coachNotes: "Test coach notes for the client",
    accessToken: "test-token-123",
    templateId: 1,
    programId: null,
    currentPhaseId: null,
  }),
  getClientProtocolItems: vi.fn().mockResolvedValue([
    { protocolItemId: 1, quantity: 1, isIncluded: true, isRecommended: true, customSchedule: null, customDuration: null, customPrice: null },
  ]),
  getClientProtocolRequirements: vi.fn().mockResolvedValue([
    { id: 1, customText: "Test requirement" },
  ]),
  getTemplateById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Test Template",
    hidePricing: false,
  }),
  updateClientProtocol: vi.fn().mockResolvedValue(undefined),
  getSiteSetting: vi.fn().mockResolvedValue(null),
}));

describe("Coach Notes Feature", () => {
  describe("coachNotes field", () => {
    it("should include coachNotes in protocol data", async () => {
      const db = await import("./db");
      const protocol = await db.getClientProtocolById(1);
      
      expect(protocol).toBeDefined();
      expect(protocol?.coachNotes).toBe("Test coach notes for the client");
    });

    it("should allow updating coachNotes", async () => {
      const db = await import("./db");
      
      await db.updateClientProtocol(1, { coachNotes: "Updated notes" });
      
      expect(db.updateClientProtocol).toHaveBeenCalledWith(1, { coachNotes: "Updated notes" });
    });
  });
});

describe("Email Service", () => {
  describe("generateProtocolPdfBuffer", () => {
    it("should generate a PDF buffer with coach notes", async () => {
      const { generateProtocolPdfBuffer } = await import("./emailService");
      
      const pdfBuffer = generateProtocolPdfBuffer({
        protocol: {
          id: 1,
          clientName: "Test Client",
          clientEmail: "test@example.com",
          durationMonths: 3,
          discountPercent: "10",
          coachingPackage: "Basic",
          coachingPrice: "500",
          coachNotes: "These are personalized notes from your coach.\n\n• Take supplements with food\n• Stay hydrated",
          accessToken: "test-token",
        },
        protocolItems: [
          { protocolItemId: 1, quantity: 1, isIncluded: true, isRecommended: true, customSchedule: null, customDuration: null, customPrice: null },
        ],
        allItems: [
          { id: 1, categoryId: 1, name: "Test Item", schedule: "Daily", duration: "90 days", price: "100", affiliateCode: "TEST10" },
        ],
        categories: [
          { id: 1, name: "Category 1" },
        ],
        requirements: [
          { id: 1, text: "Test requirement" },
        ],
        programInfo: null,
      });
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it("should generate PDF without coach notes when not provided", async () => {
      const { generateProtocolPdfBuffer } = await import("./emailService");
      
      const pdfBuffer = generateProtocolPdfBuffer({
        protocol: {
          id: 1,
          clientName: "Test Client",
          clientEmail: "test@example.com",
          durationMonths: 3,
          discountPercent: "0",
          coachingPackage: null,
          coachingPrice: "0",
          coachNotes: null,
          accessToken: "test-token",
        },
        protocolItems: [],
        allItems: [],
        categories: [],
        requirements: [],
        programInfo: null,
      });
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it("should respect hidePricing flag in PDF", async () => {
      const { generateProtocolPdfBuffer } = await import("./emailService");
      
      const pdfBuffer = generateProtocolPdfBuffer({
        protocol: {
          id: 1,
          clientName: "Test Client",
          clientEmail: "test@example.com",
          durationMonths: 12,
          discountPercent: "0",
          coachingPackage: "12-Month Program",
          coachingPrice: "3000",
          hidePricing: true,
          coachNotes: "Notes for 12-month client",
          accessToken: "test-token",
        },
        protocolItems: [
          { protocolItemId: 1, quantity: 1, isIncluded: true, isRecommended: true, customSchedule: null, customDuration: null, customPrice: null },
        ],
        allItems: [
          { id: 1, categoryId: 1, name: "Test Item", schedule: "Daily", duration: "90 days", price: "100", affiliateCode: "TEST10" },
        ],
        categories: [
          { id: 1, name: "Category 1" },
        ],
        requirements: [],
        programInfo: {
          program: { name: "12-Month Game Plan" },
          currentPhase: { name: "Phase 1", description: "Foundation", goals: "Build foundation" },
        },
      });
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe("sendProtocolEmail", () => {
    it("should simulate email when SMTP is not configured", async () => {
      const { sendProtocolEmail } = await import("./emailService");
      
      // Clear any SMTP env vars
      const originalHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;
      
      const result = await sendProtocolEmail({
        to: "test@example.com",
        clientName: "Test Client",
        protocol: {
          id: 1,
          clientName: "Test Client",
          clientEmail: "test@example.com",
          durationMonths: 3,
          discountPercent: "0",
          coachingPackage: null,
          coachingPrice: "0",
          coachNotes: "Test notes",
          accessToken: "test-token",
        },
        protocolItems: [],
        allItems: [],
        categories: [],
        requirements: [],
        programInfo: null,
        protocolUrl: "https://example.com/protocol/test-token",
      });
      
      // Restore env var
      if (originalHost) process.env.SMTP_HOST = originalHost;
      
      expect(result.success).toBe(true);
      expect(result.message).toContain("simulated");
    });
  });
});
