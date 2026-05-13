/**
 * Tests for Stalled Enrollment Admin Notifications and Email Tracking
 */

import { describe, it, expect } from "vitest";

describe("Stalled Enrollment Admin Notifications", () => {
  describe("Cron Module", () => {
    it("should export checkStalledEnrollments function", async () => {
      const { checkStalledEnrollments } = await import("./cron/enrollmentFollowUpCron");
      expect(typeof checkStalledEnrollments).toBe("function");
    });

    it("should export processEnrollmentFollowUps function", async () => {
      const { processEnrollmentFollowUps } = await import("./cron/enrollmentFollowUpCron");
      expect(typeof processEnrollmentFollowUps).toBe("function");
    });

    it("should export initEnrollmentFollowUpCron function", async () => {
      const { initEnrollmentFollowUpCron } = await import("./cron/enrollmentFollowUpCron");
      expect(typeof initEnrollmentFollowUpCron).toBe("function");
    });
  });

  describe("Schema Fields", () => {
    it("should have stalledNotificationSentAt field in transformation_enrollments schema", async () => {
      const { transformationEnrollments } = await import("../drizzle/schema");
      expect(transformationEnrollments.stalledNotificationSentAt).toBeDefined();
    });

    it("should have followUpReminderSentAt field in transformation_enrollments schema", async () => {
      const { transformationEnrollments } = await import("../drizzle/schema");
      expect(transformationEnrollments.followUpReminderSentAt).toBeDefined();
    });
  });
});

describe("Email Tracking Service", () => {
  describe("Module Exports", () => {
    it("should export generateTrackingId function", async () => {
      const { generateTrackingId } = await import("./emailTracking");
      expect(typeof generateTrackingId).toBe("function");
    });

    it("should export createEmailTracking function", async () => {
      const { createEmailTracking } = await import("./emailTracking");
      expect(typeof createEmailTracking).toBe("function");
    });

    it("should export recordEmailOpen function", async () => {
      const { recordEmailOpen } = await import("./emailTracking");
      expect(typeof recordEmailOpen).toBe("function");
    });

    it("should export recordEmailClick function", async () => {
      const { recordEmailClick } = await import("./emailTracking");
      expect(typeof recordEmailClick).toBe("function");
    });

    it("should export getEnrollmentEmailTracking function", async () => {
      const { getEnrollmentEmailTracking } = await import("./emailTracking");
      expect(typeof getEnrollmentEmailTracking).toBe("function");
    });

    it("should export getEmailTrackingList function", async () => {
      const { getEmailTrackingList } = await import("./emailTracking");
      expect(typeof getEmailTrackingList).toBe("function");
    });

    it("should export getEmailTrackingStats function", async () => {
      const { getEmailTrackingStats } = await import("./emailTracking");
      expect(typeof getEmailTrackingStats).toBe("function");
    });

    it("should export generateTrackingPixel function", async () => {
      const { generateTrackingPixel } = await import("./emailTracking");
      expect(typeof generateTrackingPixel).toBe("function");
    });

    it("should export generateTrackedLink function", async () => {
      const { generateTrackedLink } = await import("./emailTracking");
      expect(typeof generateTrackedLink).toBe("function");
    });
  });

  describe("Tracking ID Generation", () => {
    it("should generate unique tracking IDs", async () => {
      const { generateTrackingId } = await import("./emailTracking");
      const id1 = generateTrackingId();
      const id2 = generateTrackingId();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe("Tracking Pixel Generation", () => {
    it("should generate valid tracking pixel HTML", async () => {
      const { generateTrackingPixel } = await import("./emailTracking");
      const pixel = generateTrackingPixel("test-tracking-id", "https://example.com");
      expect(pixel).toContain('<img src="https://example.com/api/email/track/open/test-tracking-id"');
      expect(pixel).toContain('width="1"');
      expect(pixel).toContain('height="1"');
    });
  });

  describe("Tracked Link Generation", () => {
    it("should generate valid tracked link URL", async () => {
      const { generateTrackedLink } = await import("./emailTracking");
      const link = generateTrackedLink(
        "https://example.com/verify?token=abc",
        "test-tracking-id",
        "https://base.com"
      );
      expect(link).toContain("https://base.com/api/email/track/click/test-tracking-id");
      expect(link).toContain("url=");
    });
  });
});

describe("Email Tracking Router Endpoints", () => {
  it("should have getEnrollmentTracking endpoint in emailTracking router", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("emailTracking.getEnrollmentTracking");
  }, 10000);

  it("should have getEnrollmentTrackingList endpoint in emailTracking router", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("emailTracking.getEnrollmentTrackingList");
  });

  it("should have getEnrollmentTrackingStats endpoint in emailTracking router", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("emailTracking.getEnrollmentTrackingStats");
  });
});

describe("Venmo Payment Admin Notification", () => {
  it("should have createPendingPayment endpoint in transformation router", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("transformation.createPendingPayment");
  });

  it("should have sendTransformationPaymentAdminNotification function", async () => {
    const { sendTransformationPaymentAdminNotification } = await import("./emailService");
    expect(typeof sendTransformationPaymentAdminNotification).toBe("function");
  });
});

describe("Batch Email Tracking", () => {
  it("should export getEmailTrackingByEnrollmentIds function", async () => {
    const { getEmailTrackingByEnrollmentIds } = await import("./emailTracking");
    expect(typeof getEmailTrackingByEnrollmentIds).toBe("function");
  });

  it("should have getTrackingByEnrollmentIds endpoint in emailTracking router", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("emailTracking.getTrackingByEnrollmentIds");
  });

  it("should return empty object for empty enrollment IDs array", async () => {
    const { getEmailTrackingByEnrollmentIds } = await import("./emailTracking");
    const result = await getEmailTrackingByEnrollmentIds([]);
    expect(result).toEqual({});
  });
});
