import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Email Tracking Features", () => {
  describe("Email Events Table", () => {
    it("should have email_events table in schema", async () => {
      // Import schema to verify table exists
      const schema = await import("../drizzle/schema");
      expect(schema.emailEvents).toBeDefined();
    });

    it("should have correct columns in email_events", async () => {
      const schema = await import("../drizzle/schema");
      const columns = Object.keys(schema.emailEvents);
      
      // Verify essential columns exist
      expect(columns).toContain("id");
      expect(columns).toContain("clientProtocolId");
      expect(columns).toContain("eventType");
      expect(columns).toContain("trackingToken");
    });
  });

  describe("Email Branding Settings Table", () => {
    it("should have email_branding_settings table in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.emailBrandingSettings).toBeDefined();
    });

    it("should have correct columns in email_branding_settings", async () => {
      const schema = await import("../drizzle/schema");
      const columns = Object.keys(schema.emailBrandingSettings);
      
      // Verify essential columns exist
      expect(columns).toContain("id");
      expect(columns).toContain("logoUrl");
      expect(columns).toContain("primaryColor");
      expect(columns).toContain("secondaryColor");
      expect(columns).toContain("companyName");
      expect(columns).toContain("tagline");
      expect(columns).toContain("footerText");
    });
  });

  describe("Database Functions", () => {
    it("should export recordEmailEvent function", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.recordEmailEvent).toBe("function");
    });

    it("should export recordEmailOpen function", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.recordEmailOpen).toBe("function");
    });

    it("should export getEmailStatusForProtocol function", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.getEmailStatusForProtocol).toBe("function");
    });

    it("should export getEmailBrandingSettings function", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.getEmailBrandingSettings).toBe("function");
    });

    it("should export updateEmailBrandingSettings function", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.updateEmailBrandingSettings).toBe("function");
    });

    it("should export getAdminEmails function", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.getAdminEmails).toBe("function");
    });
  });

  describe("Email Service Functions", () => {
    it("should export sendProtocolLinkWithTracking function", async () => {
      const emailService = await import("./emailService");
      expect(typeof emailService.sendProtocolLinkWithTracking).toBe("function");
    });

    it("should export sendClientOpenedNotification function", async () => {
      const emailService = await import("./emailService");
      expect(typeof emailService.sendClientOpenedNotification).toBe("function");
    });
  });
});

describe("Email Tracking Router", () => {
  it("should have emailTracking router in appRouter", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("emailTracking.getStatus");
    expect(appRouter._def.procedures).toHaveProperty("emailTracking.getEvents");
    expect(appRouter._def.procedures).toHaveProperty("emailTracking.getBranding");
    expect(appRouter._def.procedures).toHaveProperty("emailTracking.updateBranding");
    expect(appRouter._def.procedures).toHaveProperty("emailTracking.getProtocolStats");
  });
});
