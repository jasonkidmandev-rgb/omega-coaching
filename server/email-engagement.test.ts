import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { emailEngagementEvents, clientNotificationHistory } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

describe("Email Engagement Tracking", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testTrackingId = `test_engagement_${Date.now()}`;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      await db.delete(emailEngagementEvents).where(
        eq(emailEngagementEvents.trackingId, testTrackingId)
      );
      await db.delete(emailEngagementEvents).where(
        eq(emailEngagementEvents.trackingId, `${testTrackingId}_click_test`)
      );
    }
  });

  describe("Email Engagement Events Table", () => {
    it("should have emailEngagementEvents table defined", () => {
      expect(emailEngagementEvents).toBeDefined();
    });

    it("should be able to insert an open event", async () => {
      if (!db) throw new Error("Database not available");

      await db.insert(emailEngagementEvents).values({
        trackingId: testTrackingId,
        eventType: "open",
        userAgent: "Test User Agent",
        ipAddress: "127.0.0.1",
      });

      const events = await db
        .select()
        .from(emailEngagementEvents)
        .where(eq(emailEngagementEvents.trackingId, testTrackingId));

      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe("open");
    });

    it("should be able to insert a click event", async () => {
      if (!db) throw new Error("Database not available");

      await db.insert(emailEngagementEvents).values({
        trackingId: `${testTrackingId}_click_test`,
        eventType: "click",
        linkUrl: "https://peptidecoach.pro/protocol/test",
        linkName: "View Protocol",
        userAgent: "Test User Agent",
        ipAddress: "127.0.0.1",
      });

      const events = await db
        .select()
        .from(emailEngagementEvents)
        .where(eq(emailEngagementEvents.trackingId, `${testTrackingId}_click_test`));

      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe("click");
      expect(events[0].linkUrl).toBe("https://peptidecoach.pro/protocol/test");
    });
  });

  describe("Email Engagement Router", () => {
    it("should export emailEngagementRouter", async () => {
      const { emailEngagementRouter } = await import("./email/engagementRouter");
      expect(emailEngagementRouter).toBeDefined();
    });

    it("should have required procedures in engagement router", async () => {
      const { emailEngagementRouter } = await import("./email/engagementRouter");
      
      const procedures = emailEngagementRouter._def.procedures;
      expect(procedures).toHaveProperty("trackOpen");
      expect(procedures).toHaveProperty("trackClick");
      expect(procedures).toHaveProperty("getStats");
      expect(procedures).toHaveProperty("getRecentEvents");
      expect(procedures).toHaveProperty("getTopLinks");
      expect(procedures).toHaveProperty("getTimeline");
    });
  });

  describe("Tracking Helper Functions", () => {
    it("should generate valid tracking ID", async () => {
      const { generateTrackingId } = await import("./email/engagementRouter");
      const trackingId = generateTrackingId();
      
      expect(trackingId).toBeDefined();
      expect(typeof trackingId).toBe("string");
      expect(trackingId.length).toBeGreaterThan(0);
    });

    it("should generate valid tracking pixel HTML", async () => {
      const { generateTrackingPixel } = await import("./email/engagementRouter");
      const pixel = generateTrackingPixel("test123", "https://peptidecoach.pro");
      
      expect(pixel).toContain("img");
      expect(pixel).toContain("src=");
      expect(pixel).toContain("/api/email/track/open/test123");
      expect(pixel).toContain('width="1"');
      expect(pixel).toContain('height="1"');
    });

    it("should wrap links with tracking", async () => {
      const { wrapLinkWithTracking } = await import("./email/engagementRouter");
      const wrappedUrl = wrapLinkWithTracking(
        "https://peptidecoach.pro/protocol/abc123",
        "tracking123",
        "View Protocol",
        "https://peptidecoach.pro"
      );
      
      expect(wrappedUrl).toContain("/api/email/track/click/tracking123");
      expect(wrappedUrl).toContain("url=");
      expect(wrappedUrl).toContain("name=");
    });
  });

  describe("Payment Reminder Email Template", () => {
    it("should include tracking pixel in HTML template", async () => {
      const { generatePaymentReminderHTML } = await import("./emailTemplates/paymentReminder");
      
      const html = generatePaymentReminderHTML({
        clientName: "Test Client",
        clientEmail: "test@example.com",
        protocolName: "Test Protocol",
        amount: "500.00",
        currency: "USD",
        daysOverdue: 3,
        paymentLink: "https://peptidecoach.pro/protocol/test",
        trackingId: "test_tracking_123",
        trackingBaseUrl: "https://peptidecoach.pro",
      });
      
      // Check for tracking pixel
      expect(html).toContain("/api/track/open/test_tracking_123");
      expect(html).toContain('width="1"');
      expect(html).toContain('height="1"');
    });

    it("should wrap payment button with click tracking", async () => {
      const { generatePaymentReminderHTML } = await import("./emailTemplates/paymentReminder");
      
      const html = generatePaymentReminderHTML({
        clientName: "Test Client",
        clientEmail: "test@example.com",
        protocolName: "Test Protocol",
        amount: "500.00",
        currency: "USD",
        daysOverdue: 3,
        paymentLink: "https://peptidecoach.pro/protocol/test",
        trackingId: "test_tracking_123",
        trackingBaseUrl: "https://peptidecoach.pro",
      });
      
      // Check for click tracking on payment button
      expect(html).toContain("/api/track/click/test_tracking_123");
      expect(html).toContain("payment_button");
    });

    it("should use correct production URL (peptidecoach.pro)", async () => {
      const { generatePaymentReminderHTML } = await import("./emailTemplates/paymentReminder");
      
      const html = generatePaymentReminderHTML({
        clientName: "Test Client",
        clientEmail: "test@example.com",
        protocolName: "Test Protocol",
        amount: "500.00",
        currency: "USD",
        daysOverdue: 3,
        paymentLink: "https://peptidecoach.pro/protocol/test",
        trackingId: "test_tracking_123",
        trackingBaseUrl: "https://peptidecoach.pro",
      });
      
      // Ensure peptidecoach.pro is used, not omegalongevity.com
      expect(html).toContain("peptidecoach.pro");
    });
  });
});
