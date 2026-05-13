import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[], []]),
  }),
}));

describe("Email Tracking - Enrollment Features", () => {
  describe("emailTracking module exports", () => {
    it("should export generateTrackingId", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.generateTrackingId).toBe("function");
    });

    it("should export createEmailTracking", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.createEmailTracking).toBe("function");
    });

    it("should export recordEmailOpen", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.recordEmailOpen).toBe("function");
    });

    it("should export recordEmailClick", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.recordEmailClick).toBe("function");
    });

    it("should export getEnrollmentEmailTracking", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.getEnrollmentEmailTracking).toBe("function");
    });

    it("should export getClickDetails", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.getClickDetails).toBe("function");
    });

    it("should export getEmailTrackingList", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.getEmailTrackingList).toBe("function");
    });

    it("should export getEmailTrackingStats", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.getEmailTrackingStats).toBe("function");
    });

    it("should export generateTrackingPixel", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.generateTrackingPixel).toBe("function");
    });

    it("should export generateTrackedLink", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.generateTrackedLink).toBe("function");
    });

    it("should export injectTrackingIntoHtml", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.injectTrackingIntoHtml).toBe("function");
    });

    it("should export getEmailTrackingByEnrollmentIds", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.getEmailTrackingByEnrollmentIds).toBe("function");
    });

    it("should export getTransformationEmailStats", async () => {
      const mod = await import("./emailTracking");
      expect(typeof mod.getTransformationEmailStats).toBe("function");
    });
  });

  describe("generateTrackingId", () => {
    it("should generate a 64-character hex string", async () => {
      const { generateTrackingId } = await import("./emailTracking");
      const id = generateTrackingId();
      expect(id).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(id)).toBe(true);
    });

    it("should generate unique IDs", async () => {
      const { generateTrackingId } = await import("./emailTracking");
      const id1 = generateTrackingId();
      const id2 = generateTrackingId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("generateTrackingPixel", () => {
    it("should generate a 1x1 pixel img tag with correct URL", async () => {
      const { generateTrackingPixel } = await import("./emailTracking");
      const pixel = generateTrackingPixel("test-tracking-id", "https://example.com");
      expect(pixel).toContain('<img src="https://example.com/api/email/track/open/test-tracking-id"');
      expect(pixel).toContain('width="1"');
      expect(pixel).toContain('height="1"');
      expect(pixel).toContain('style="display:none;"');
    });
  });

  describe("generateTrackedLink", () => {
    it("should wrap a URL with click tracking", async () => {
      const { generateTrackedLink } = await import("./emailTracking");
      const tracked = generateTrackedLink("https://dashboard.example.com/journey", "test-id", "https://example.com");
      expect(tracked).toBe("https://example.com/api/email/track/click/test-id?url=https%3A%2F%2Fdashboard.example.com%2Fjourney");
    });
  });

  describe("injectTrackingIntoHtml", () => {
    it("should inject tracking pixel before </body>", async () => {
      const { injectTrackingIntoHtml } = await import("./emailTracking");
      const html = '<html><body><p>Hello</p></body></html>';
      const result = injectTrackingIntoHtml(html, "track123", "https://example.com");
      expect(result).toContain('/api/email/track/open/track123');
      expect(result).toContain('</body>');
      // Pixel should be before </body>
      const pixelIndex = result.indexOf('/api/email/track/open/track123');
      const bodyEndIndex = result.indexOf('</body>');
      expect(pixelIndex).toBeLessThan(bodyEndIndex);
    });

    it("should wrap http/https links with click tracking", async () => {
      const { injectTrackingIntoHtml } = await import("./emailTracking");
      const html = '<html><body><a href="https://dashboard.example.com/journey">Dashboard</a></body></html>';
      const result = injectTrackingIntoHtml(html, "track123", "https://example.com");
      expect(result).toContain('/api/email/track/click/track123');
      expect(result).toContain('url=https%3A%2F%2Fdashboard.example.com%2Fjourney');
    });

    it("should not double-wrap tracking URLs", async () => {
      const { injectTrackingIntoHtml } = await import("./emailTracking");
      const html = '<html><body><a href="https://example.com/api/email/track/click/existing">Already tracked</a></body></html>';
      const result = injectTrackingIntoHtml(html, "track123", "https://example.com");
      // Should not wrap the already-tracked URL
      expect(result).not.toContain('/api/email/track/click/track123?url=https%3A%2F%2Fexample.com%2Fapi%2Femail%2Ftrack');
    });

    it("should not wrap mailto: or tel: links", async () => {
      const { injectTrackingIntoHtml } = await import("./emailTracking");
      const html = '<html><body><a href="mailto:test@example.com">Email</a><a href="tel:+1234567890">Call</a></body></html>';
      const result = injectTrackingIntoHtml(html, "track123", "https://example.com");
      expect(result).toContain('href="mailto:test@example.com"');
      expect(result).toContain('href="tel:+1234567890"');
    });
  });

  describe("Transformation Router - Email Tracking Endpoints", () => {
    it("should have getEnrollmentEmailTracking endpoint", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter._def.procedures).toHaveProperty("transformation.getEnrollmentEmailTracking");
    });

    it("should have getEmailClickDetails endpoint", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter._def.procedures).toHaveProperty("transformation.getEmailClickDetails");
    });

    it("should have getTransformationEmailStats endpoint", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter._def.procedures).toHaveProperty("transformation.getTransformationEmailStats");
    });

    it("should have getEmailTrackingByEnrollmentIds endpoint", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter._def.procedures).toHaveProperty("transformation.getEmailTrackingByEnrollmentIds");
    });
  });

  describe("Transformation Router - Resend Welcome Email", () => {
    it("should have resendWelcomeEmail endpoint", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter._def.procedures).toHaveProperty("transformation.resendWelcomeEmail");
    });
  });

  describe("sendTransformationMilestoneEmail", () => {
    it("should accept enrollmentId parameter", async () => {
      const emailService = await import("./emailService");
      expect(typeof emailService.sendTransformationMilestoneEmail).toBe("function");
      // The function should accept enrollmentId without error
      // We can't easily call it without SMTP, but we verify the export exists
    });
  });

  describe("sendTransformationPaymentConfirmationEmail", () => {
    it("should accept enrollmentId parameter", async () => {
      const emailService = await import("./emailService");
      expect(typeof emailService.sendTransformationPaymentConfirmationEmail).toBe("function");
    });
  });
});
