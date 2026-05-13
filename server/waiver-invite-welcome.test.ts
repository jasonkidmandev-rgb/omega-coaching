import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Waiver Expiration, Bulk Invite, and Welcome Email Features", () => {
  describe("Waiver Expiration Tracking", () => {
    it("should have expiresAt field in storeWaivers schema", async () => {
      const { storeWaivers } = await import("../drizzle/schema");
      expect(storeWaivers).toBeDefined();
      // Check that the schema has the expiresAt column
      const columns = Object.keys(storeWaivers);
      expect(columns).toContain("expiresAt");
    });

    it("should have renewalReminderSent field in storeWaivers schema", async () => {
      const { storeWaivers } = await import("../drizzle/schema");
      expect(storeWaivers).toBeDefined();
      const columns = Object.keys(storeWaivers);
      expect(columns).toContain("renewalReminderSent");
    });

    it("should have waiver expiration cron module", async () => {
      const cron = await import("./cron/waiverExpirationCron");
      expect(cron.initWaiverExpirationCron).toBeDefined();
      expect(typeof cron.initWaiverExpirationCron).toBe("function");
    });
  });

  describe("Bulk Invite Feature", () => {
    it("should have bulkSendInvite endpoint in clientProtocol router", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter).toBeDefined();
      // Check that clientProtocol router has bulkSendInvite
      const procedures = Object.keys(appRouter._def.procedures);
      expect(procedures).toContain("clientProtocol.bulkSendInvite");
    });

    it("should have sendAccountInviteEmail function in emailService", async () => {
      const emailService = await import("./emailService");
      expect(emailService.sendAccountInviteEmail).toBeDefined();
      expect(typeof emailService.sendAccountInviteEmail).toBe("function");
    });
  });

  describe("Welcome Email Feature", () => {
    it("should have sendWelcomeEmail function in emailService", async () => {
      const emailService = await import("./emailService");
      expect(emailService.sendWelcomeEmail).toBeDefined();
      expect(typeof emailService.sendWelcomeEmail).toBe("function");
    });

    it("should have getClientProtocolByEmail function in db", async () => {
      const db = await import("./db");
      expect(db.getClientProtocolByEmail).toBeDefined();
      expect(typeof db.getClientProtocolByEmail).toBe("function");
    });
  });

  describe("Email Content Generation", () => {
    it("should generate account invite email with correct parameters", async () => {
      const { sendAccountInviteEmail } = await import("./emailService");
      
      const result = await sendAccountInviteEmail({
        to: "test@example.com",
        clientName: "Test Client",
        signupUrl: "https://example.com/launchpad",
        protocolUrl: "https://example.com/protocol/abc123",
      });
      
      expect(result.success).toBe(true);
      // Message will either be simulated or sent depending on SMTP config
      expect(result.message).toBeTruthy();
    });

    it("should generate welcome email with correct parameters", async () => {
      const { sendWelcomeEmail } = await import("./emailService");
      
      const result = await sendWelcomeEmail({
        to: "newuser@example.com",
        userName: "New User",
        dashboardUrl: "https://example.com/dashboard",
        protocolUrl: "https://example.com/protocol/xyz789",
        launchpadUrl: "https://example.com/launchpad",
      });
      
      expect(result.success).toBe(true);
      // Message will either be simulated or sent depending on SMTP config
      expect(result.message).toBeTruthy();
    });

    it("should generate welcome email without protocol URL", async () => {
      const { sendWelcomeEmail } = await import("./emailService");
      
      const result = await sendWelcomeEmail({
        to: "newuser@example.com",
        userName: "New User",
        dashboardUrl: "https://example.com/dashboard",
        launchpadUrl: "https://example.com/launchpad",
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toBeTruthy();
    });
  });
});
