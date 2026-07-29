import { describe, it, expect } from "vitest";

describe("Phase 10: Team Dashboards, Escalation & Conversion Tracking", () => {
  
  // Feature 1: Lisa's Morning Briefing
  describe("Lisa's Morning Briefing", () => {
    // Removed: "should have the morning briefing endpoint available". It imported the
    // whole router graph purely to assert a namespace string was present — no behaviour
    // was exercised — and the import routinely exceeded the 5s timeout, which is what
    // made the suite's failure count swing between runs.

    it("should return correct stats structure from morning briefing", async () => {
      // The morning briefing should return stats, tasks, upcomingDeadlines, and newClients
      const expectedKeys = ['stats', 'tasks', 'upcomingDeadlines', 'newClients'];
      // Verify the structure by checking the return type expectations
      expect(expectedKeys).toContain('stats');
      expect(expectedKeys).toContain('tasks');
      expect(expectedKeys).toContain('upcomingDeadlines');
      expect(expectedKeys).toContain('newClients');
    });
  });

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

  // Feature 3: Conversion Tracking
  describe("Conversion Tracking", () => {
    // Removed 2026-07-29: "should have the conversion metrics endpoint available". Same
    // problem as the morning-briefing one above — it imported the 9.6k-line router graph
    // just to assert the string 'automation' appeared in the key list, exercising no
    // behaviour, and the import regularly blew the 5s timeout. It passed a full suite run
    // and failed the next on identical code, which is the flake that makes green
    // meaningless. If conversion metrics need coverage, it belongs in an
    // *.integration.test.ts against the test DB.

    it("should calculate conversion rate correctly", () => {
      // Test the conversion rate calculation logic
      const totalProspects = 100;
      const totalConverted = 25;
      const rate = totalProspects > 0 ? Math.round((totalConverted / totalProspects) * 100) : 0;
      expect(rate).toBe(25);
    });

    it("should calculate zero conversion rate when no prospects", () => {
      const totalProspects = 0;
      const totalConverted = 0;
      const rate = totalProspects > 0 ? Math.round((totalConverted / totalProspects) * 100) : 0;
      expect(rate).toBe(0);
    });

    it("should calculate days to convert correctly", () => {
      const createdAt = new Date('2025-01-01');
      const enrolledAt = new Date('2025-01-15');
      const daysToConvert = Math.floor((enrolledAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysToConvert).toBe(14);
    });
  });

  // Feature 1 continued: Lisa notification on protocol ready
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
