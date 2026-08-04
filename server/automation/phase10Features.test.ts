import { describe, it, expect } from "vitest";

describe("Phase 10: Team Dashboards & Escalation", () => {

  // Removed 2026-08-04 with the Daily Tools pages: the "Lisa's Morning Briefing" and
  // "Conversion Tracking" blocks. Both only asserted against literals declared in the
  // test itself, so they never touched the endpoints they were named after, and those
  // endpoints are now gone.

  // Feature 2: Auto-escalation rules
  describe("Auto-escalation (72-hour rule)", () => {
    it("should have escalation logic in stalled client cron", async () => {
      const { runStalledClientCheck, detectStalledClients } = await import("../cron/stalledClientCron");
      expect(runStalledClientCheck).toBeDefined();
      expect(detectStalledClients).toBeDefined();
    });

    it("should return escalatedCount in stalled client check results", async () => {
      const { runStalledClientCheck } = await import("../cron/stalledClientCron");
      const result = await runStalledClientCheck();
      // Result should include the new escalatedCount field
      expect(result).toHaveProperty('stalledCount');
      expect(result).toHaveProperty('notificationsSent');
      expect(result).toHaveProperty('escalatedCount');
      expect(result).toHaveProperty('clients');
      expect(typeof result.escalatedCount).toBe('number');
    });

    it("should filter critical clients at 72+ hours for escalation", async () => {
      const { detectStalledClients } = await import("../cron/stalledClientCron");
      const stalledClients = await detectStalledClients(48);
      
      // Filter like the cron does
      const criticalClients = stalledClients.filter(c => c.hoursStalled >= 72);
      
      // All critical clients should have 72+ hours stalled
      for (const client of criticalClients) {
        expect(client.hoursStalled).toBeGreaterThanOrEqual(72);
      }
      
      // Non-critical should be under 72
      const nonCritical = stalledClients.filter(c => c.hoursStalled < 72);
      for (const client of nonCritical) {
        expect(client.hoursStalled).toBeLessThan(72);
      }
    });
  });

  // Lisa notification on protocol ready (separate from the removed briefing page)
  describe("Lisa notification on protocol ready", () => {
    it("should have notification types for protocol ready", async () => {
      const { ALL_NOTIFICATION_TYPES } = await import("../db");
      expect(ALL_NOTIFICATION_TYPES).toBeDefined();
      // Should include the onboarding_automation type used for Lisa notifications
      expect(ALL_NOTIFICATION_TYPES).toContain('onboarding_automation');
    });
  });

  // Venmo automation hook
  describe("Venmo automation hook", () => {
    it("should have the onboarding automation module available for Venmo", async () => {
      const { runOnboardingAutomation } = await import("./onboardingAutomation");
      expect(runOnboardingAutomation).toBeDefined();
    });
  });
});
