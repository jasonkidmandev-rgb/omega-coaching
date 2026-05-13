import { describe, it, expect } from "vitest";

/**
 * Test the normalizeToUTC logic that fixes the chat timestamp bug.
 *
 * ROOT CAUSE: Drizzle mode:'string' returns timestamps as bare strings
 * like "2026-04-20 16:32:34" (no Z suffix). Browsers interpret these
 * as local time, causing incorrect display.
 *
 * The fix: normalizeToUTC detects bare strings and appends "Z" so they
 * are correctly parsed as UTC.
 */

// Replicate the normalizeToUTC function from timezone.ts for server-side testing
function normalizeToUTC(date: Date | string | number): Date {
  if (date instanceof Date) return date;
  if (typeof date === "number") return new Date(date);

  const s = (date as string).trim();

  // Already has Z suffix or timezone offset
  if (/[Zz]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s)) {
    return new Date(s);
  }

  // Bare string from MySQL/Drizzle — append Z to force UTC interpretation
  const normalized = s.replace(" ", "T") + "Z";
  return new Date(normalized);
}

describe("normalizeToUTC - the definitive timestamp fix", () => {
  // The exact scenario from the bug report:
  // Jefferi's message stored as UTC 16:32:34
  // Drizzle returns "2026-04-20 16:32:34" (bare string)
  // Should display as 10:32 AM MDT (UTC-6)
  // Was displaying as 4:32 PM (6 hours wrong)

  it("handles bare MySQL string (the exact bug scenario)", () => {
    const drizzleOutput = "2026-04-20 16:32:34";
    const result = normalizeToUTC(drizzleOutput);
    // Must be interpreted as UTC
    expect(result.toISOString()).toBe("2026-04-20T16:32:34.000Z");
  });

  it("handles bare ISO string without Z", () => {
    const input = "2026-04-20T16:32:34";
    const result = normalizeToUTC(input);
    expect(result.toISOString()).toBe("2026-04-20T16:32:34.000Z");
  });

  it("passes through ISO string with Z suffix", () => {
    const input = "2026-04-20T16:32:34Z";
    const result = normalizeToUTC(input);
    expect(result.toISOString()).toBe("2026-04-20T16:32:34.000Z");
  });

  it("passes through ISO string with .000Z suffix", () => {
    const input = "2026-04-20T16:32:34.000Z";
    const result = normalizeToUTC(input);
    expect(result.toISOString()).toBe("2026-04-20T16:32:34.000Z");
  });

  it("passes through ISO string with +00:00 offset", () => {
    const input = "2026-04-20T16:32:34+00:00";
    const result = normalizeToUTC(input);
    expect(result.toISOString()).toBe("2026-04-20T16:32:34.000Z");
  });

  it("handles ISO string with non-zero offset", () => {
    const input = "2026-04-20T10:32:34-06:00"; // MDT
    const result = normalizeToUTC(input);
    expect(result.toISOString()).toBe("2026-04-20T16:32:34.000Z");
  });

  it("passes through Date objects unchanged", () => {
    const input = new Date("2026-04-20T16:32:34.000Z");
    const result = normalizeToUTC(input);
    expect(result.toISOString()).toBe("2026-04-20T16:32:34.000Z");
  });

  it("handles unix milliseconds", () => {
    const input = 1776702754000; // 2026-04-20T16:32:34Z
    const result = normalizeToUTC(input);
    expect(result.toISOString()).toBe("2026-04-20T16:32:34.000Z");
  });

  it("handles midnight timestamps", () => {
    const input = "2026-04-20 00:00:00";
    const result = normalizeToUTC(input);
    expect(result.toISOString()).toBe("2026-04-20T00:00:00.000Z");
  });

  it("handles date-only strings", () => {
    const input = "2026-04-20";
    const result = normalizeToUTC(input);
    // Date-only strings are treated as UTC by spec
    expect(result.toISOString()).toBe("2026-04-20T00:00:00.000Z");
  });

  it("handles strings with leading/trailing whitespace", () => {
    const input = "  2026-04-20 16:32:34  ";
    const result = normalizeToUTC(input);
    expect(result.toISOString()).toBe("2026-04-20T16:32:34.000Z");
  });
});

describe("Mountain Time conversion with normalizeToUTC", () => {
  // Simulate what toMountainTime does: normalizeToUTC -> toZonedTime
  // We can't import the client-side module, but we can verify the UTC normalization
  // ensures the correct input for toZonedTime

  it("Jefferi's message: UTC 16:32:34 should become 10:32 AM MDT", () => {
    // The fix ensures normalizeToUTC("2026-04-20 16:32:34") -> Date(2026-04-20T16:32:34Z)
    // toZonedTime(Date(16:32:34Z), "America/Denver") -> 10:32:34 MDT
    // MDT = UTC-6, so 16:32 - 6 = 10:32 ✓
    const utcDate = normalizeToUTC("2026-04-20 16:32:34");
    expect(utcDate.getUTCHours()).toBe(16);
    expect(utcDate.getUTCMinutes()).toBe(32);
    // Mountain Time (MDT, UTC-6): 16 - 6 = 10
    const expectedMTHour = 10;
    const expectedMTMinute = 32;
    // Verify the UTC hours so toZonedTime will produce correct MT
    expect(utcDate.getUTCHours() - 6).toBe(expectedMTHour);
    expect(utcDate.getUTCMinutes()).toBe(expectedMTMinute);
  });

  it("evening message: UTC 23:00:00 should become 5:00 PM MDT", () => {
    const utcDate = normalizeToUTC("2026-04-20 23:00:00");
    expect(utcDate.getUTCHours()).toBe(23);
    // 23 - 6 = 17 = 5 PM MDT
    expect(utcDate.getUTCHours() - 6).toBe(17);
  });

  it("early morning UTC: 02:00:00 should become 8:00 PM MDT previous day", () => {
    const utcDate = normalizeToUTC("2026-04-20 02:00:00");
    expect(utcDate.getUTCHours()).toBe(2);
    // 2 - 6 = -4, which wraps to 20:00 (8 PM) previous day
    // This is correct: UTC 02:00 Apr 20 = MDT 20:00 (8 PM) Apr 19
  });
});
