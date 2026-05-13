import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock the email service
vi.mock("./emailService", () => ({
  sendTrackedEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Cron Health Features", () => {
  describe("cronRuns schema", () => {
    it("should have the cronRuns table defined in the schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.cronRuns).toBeDefined();
      // Verify the table has the expected columns
      const columns = Object.keys(schema.cronRuns);
      expect(columns).toContain("id");
      expect(columns).toContain("jobName");
      expect(columns).toContain("status");
      expect(columns).toContain("startedAt");
      expect(columns).toContain("completedAt");
      expect(columns).toContain("durationMs");
      expect(columns).toContain("itemsProcessed");
      expect(columns).toContain("itemsSucceeded");
      expect(columns).toContain("itemsFailed");
      expect(columns).toContain("errorMessage");
      expect(columns).toContain("details");
      expect(columns).toContain("triggeredBy");
      expect(columns).toContain("createdAt");
    });
  });

  describe("checkinCron exports", () => {
    it("should export manualTriggerCheckins function", async () => {
      // Dynamic import to check the export exists
      const cronModule = await import("./cron/checkinCron");
      expect(typeof cronModule.manualTriggerCheckins).toBe("function");
    });

    it("should export getCronHealthStatus function", async () => {
      const cronModule = await import("./cron/checkinCron");
      expect(typeof cronModule.getCronHealthStatus).toBe("function");
    });

    it("should export sendScheduledCheckins function", async () => {
      const cronModule = await import("./cron/checkinCron");
      expect(typeof cronModule.sendScheduledCheckins).toBe("function");
    });

    it("should export sendCheckinReminders function", async () => {
      const cronModule = await import("./cron/checkinCron");
      expect(typeof cronModule.sendCheckinReminders).toBe("function");
    });

    it("should export processLowScoreAlerts function", async () => {
      const cronModule = await import("./cron/checkinCron");
      expect(typeof cronModule.processLowScoreAlerts).toBe("function");
    });

    it("should export initCheckinCron function", async () => {
      const cronModule = await import("./cron/checkinCron");
      expect(typeof cronModule.initCheckinCron).toBe("function");
    });
  });

  describe("manualTriggerCheckins return type", () => {
    it("should return an object with the expected shape when DB fails gracefully", async () => {
      // Mock getDb to return a mock database that throws
      const { getDb } = await import("./db");
      (getDb as any).mockRejectedValue(new Error("DB not available in test"));

      const { manualTriggerCheckins } = await import("./cron/checkinCron");
      const result = await manualTriggerCheckins();
      
      // Should handle errors gracefully
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("schedulesProcessed");
      expect(result).toHaveProperty("checkinsSent");
      expect(result).toHaveProperty("remindersProcessed");
      expect(result).toHaveProperty("alertsProcessed");
      
      // When DB fails, should return success: false
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
    });
  });
});
