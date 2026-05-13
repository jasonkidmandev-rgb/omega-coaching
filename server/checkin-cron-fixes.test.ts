import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Check-in Cron Bug Fixes", () => {
  const cronSource = readFileSync(
    join(__dirname, "cron/checkinCron.ts"),
    "utf-8"
  );
  const checkinPageSource = readFileSync(
    join(__dirname, "../client/src/pages/client/Checkin.tsx"),
    "utf-8"
  );

  describe("BUG 1: Template type mismatch", () => {
    it("should query for 'checkin_reminder' template type (not 'checkin_request')", () => {
      // The cron should use the correct template type that exists in the database
      expect(cronSource).toContain("'checkin_reminder'");
      // Should NOT have the old incorrect template type as a standalone query
      expect(cronSource).not.toMatch(
        /templateType,\s*['"]checkin_request['"]\)/
      );
    });
  });

  describe("BUG 2: Placeholder name mismatch", () => {
    it("should replace camelCase placeholders (clientName, checkinLink, coachName)", () => {
      // CamelCase placeholders are inside regex patterns with escaped braces
      expect(cronSource).toContain("clientName");
      expect(cronSource).toContain("checkinLink");
      expect(cronSource).toContain("coachName");
    });

    it("should also handle legacy snake_case placeholders for backward compatibility", () => {
      // Snake_case placeholders are inside regex patterns with escaped braces
      expect(cronSource).toContain("client_name");
      expect(cronSource).toContain("checkin_url");
      expect(cronSource).toContain("coach_name");
    });

    it("should use regex global replace to handle multiple occurrences", () => {
      // Verify we use /g flag for replacements
      expect(cronSource).toContain("/\\{\\{clientName\\}\\}/g");
      expect(cronSource).toContain("/\\{\\{checkinLink\\}\\}/g");
      expect(cronSource).toContain("/\\{\\{coachName\\}\\}/g");
    });
  });

  describe("BUG 3: Route parameter mismatch", () => {
    it("should use params.id (not params.checkinId) to match route /checkin/:id", () => {
      expect(checkinPageSource).toContain('useParams<{ id: string }>()');
      expect(checkinPageSource).toContain('params.id || "0"');
      expect(checkinPageSource).not.toContain("params.checkinId");
    });
  });

  describe("BUG 4: Reminder template type mismatch", () => {
    it("should query for 'checkin_reminder_24h' (not 'reminder_24h')", () => {
      expect(cronSource).toContain("'checkin_reminder_24h'");
      expect(cronSource).not.toMatch(
        /templateType,\s*['"]reminder_24h['"]\)/
      );
    });

    it("should query for 'checkin_reminder_2' as escalation template (not 'reminder_48h')", () => {
      expect(cronSource).toContain("'checkin_reminder_2'");
      expect(cronSource).not.toMatch(
        /templateType,\s*['"]reminder_48h['"]\)/
      );
    });
  });

  describe("BUG 5: Cron double-filtering (Thursday-only)", () => {
    it("should NOT have Thursday-only filter in initCheckinCron", () => {
      // The old code had: if (now.getDay() === 4 && now.getHours() === 10)
      expect(cronSource).not.toContain("now.getDay() === 4");
      expect(cronSource).not.toContain("now.getHours() === 10");
    });

    it("should call sendScheduledCheckins directly from the interval", () => {
      // The interval should call sendScheduledCheckins without day/time filtering
      expect(cronSource).toContain("await sendScheduledCheckins()");
    });

    it("should run initial scan on startup", () => {
      // Should have a setTimeout for initial startup scan
      expect(cronSource).toContain("Running initial check-in scan on startup");
    });
  });

  describe("Engagement level filtering", () => {
    it("should check for protocol_only engagement level in sendScheduledCheckins", () => {
      // The cron should skip clients with protocol_only engagement level
      const sendSection = cronSource.slice(
        cronSource.indexOf("export async function sendScheduledCheckins"),
        cronSource.indexOf("export async function sendCheckinReminders")
      );
      expect(sendSection).toContain("protocol.engagementLevel === 'protocol_only'");
      expect(sendSection).toContain("Protocol Only");
      expect(sendSection).toContain("auto-disabling their check-in schedule");
    });

    it("should check for protocol_only engagement level in sendCheckinReminders", () => {
      // The reminder cron should also skip protocol_only clients
      const reminderSection = cronSource.slice(
        cronSource.indexOf("export async function sendCheckinReminders"),
        cronSource.indexOf("export async function processLowScoreAlerts")
      );
      expect(reminderSection).toContain("protocol.engagementLevel === 'protocol_only'");
      expect(reminderSection).toContain("Protocol Only");
      expect(reminderSection).toContain("skipping reminder");
    });

    it("should continue processing for non-protocol_only clients (full_coaching and self_guided_checkins)", () => {
      // The check should only skip protocol_only, not other levels
      const sendSection = cronSource.slice(
        cronSource.indexOf("export async function sendScheduledCheckins"),
        cronSource.indexOf("export async function sendCheckinReminders")
      );
      // Should NOT filter out full_coaching or self_guided_checkins
      expect(sendSection).not.toContain("full_coaching");
      expect(sendSection).not.toContain("self_guided_checkins");
    });

    it("should log the client name when skipping due to engagement level", () => {
      expect(cronSource).toContain("protocol.clientName || 'Unknown'");
    });
  });

  describe("Coach name replacement", () => {
    it("should get coach name from OWNER_NAME environment variable", () => {
      expect(cronSource).toContain("process.env.OWNER_NAME");
      expect(cronSource).toContain("'Your Coach'"); // fallback
    });
  });

  describe("Error handling", () => {
    it("should log critical error when template is not found", () => {
      expect(cronSource).toContain(
        "CRITICAL: No checkin_reminder template found"
      );
    });

    it("should wrap interval callbacks in try-catch", () => {
      // Count try-catch blocks in the initCheckinCron function
      const initSection = cronSource.slice(
        cronSource.indexOf("export function initCheckinCron")
      );
      const tryCatchCount = (initSection.match(/try\s*\{/g) || []).length;
      expect(tryCatchCount).toBeGreaterThanOrEqual(3); // One for each interval
    });
  });
});
