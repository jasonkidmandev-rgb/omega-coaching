/**
 * Central timezone utility for PeptideCoach.Pro
 * ALL date/time formatting in the app MUST use these helpers
 * to ensure consistent America/Denver (Mountain Time) display.
 *
 * The database stores timestamps in UTC. Drizzle with mode:'string'
 * returns them as bare strings like "2026-04-20 16:32:34" WITHOUT
 * a timezone suffix. Without normalization, browsers interpret these
 * as local time, causing incorrect display.
 *
 * The normalizeToUTC() function is the single choke-point that ensures
 * every timestamp string is explicitly treated as UTC before any
 * timezone conversion happens.
 */
import { format as dateFnsFormat, formatDistanceToNow as dateFnsFormatDistanceToNow } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const APP_TIMEZONE = "America/Denver";

/**
 * Normalize any date input into a proper UTC Date object.
 *
 * This is the CRITICAL function that prevents timezone bugs.
 * Drizzle mode:'string' returns timestamps like "2026-04-20 16:32:34"
 * (no Z, no offset). Browsers interpret bare strings as LOCAL time,
 * which shifts the time by the user's UTC offset.
 *
 * This function detects bare strings and appends "Z" so they are
 * correctly parsed as UTC.
 *
 * Handles:
 * - "2026-04-20 16:32:34"       → bare MySQL string, treat as UTC
 * - "2026-04-20T16:32:34"       → bare ISO string, treat as UTC
 * - "2026-04-20T16:32:34Z"      → already UTC, pass through
 * - "2026-04-20T16:32:34.000Z"  → already UTC, pass through
 * - "2026-04-20T16:32:34+00:00" → has offset, pass through
 * - Date objects                 → pass through
 * - Numbers (unix ms)           → pass through
 */
function normalizeToUTC(date: Date | string | number): Date {
  if (date instanceof Date) return date;
  if (typeof date === "number") return new Date(date);

  // It's a string — check if it already has timezone info
  const s = date.trim();

  // Already has Z suffix or timezone offset like +00:00, -06:00
  if (/[Zz]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s)) {
    return new Date(s);
  }

  // Bare string from MySQL/Drizzle — append Z to force UTC interpretation
  // Replace space with T for ISO compliance, then append Z
  const normalized = s.replace(" ", "T") + "Z";
  return new Date(normalized);
}

/**
 * Convert a UTC date to Mountain Time (America/Denver).
 * Handles Date objects, ISO strings, and bare MySQL timestamp strings.
 *
 * Uses normalizeToUTC() to ensure the input is correctly treated as UTC
 * before converting to Mountain Time.
 */
export function toMountainTime(date: Date | string | number): Date {
  return toZonedTime(normalizeToUTC(date), APP_TIMEZONE);
}

/**
 * Format a date in Mountain Time using date-fns format tokens.
 * Drop-in replacement for `format()` from date-fns.
 *
 * @example
 * formatMT("2026-04-20 16:32:34", "h:mm a")       // "10:32 AM" (MDT)
 * formatMT(msg.createdAt, "MMM d, yyyy")           // "Apr 20, 2026"
 * formatMT(msg.createdAt, "EEEE, MMMM d, yyyy")   // "Monday, April 20, 2026"
 */
export function formatMT(date: Date | string | number, formatStr: string): string {
  return dateFnsFormat(toMountainTime(date), formatStr);
}

/**
 * Format a date as a relative time string (e.g., "2 hours ago").
 * Uses normalizeToUTC to ensure correct UTC comparison.
 */
export function formatDistanceToNowMT(
  date: Date | string | number,
  options?: { addSuffix?: boolean; includeSeconds?: boolean }
): string {
  return dateFnsFormatDistanceToNow(normalizeToUTC(date), options);
}

/**
 * Get a short time string in Mountain Time: "10:32 AM"
 */
export function formatTimeMT(date: Date | string | number): string {
  return formatMT(date, "h:mm a");
}

/**
 * Get a date string in Mountain Time: "Apr 20, 2026"
 */
export function formatDateMT(date: Date | string | number): string {
  return formatMT(date, "MMM d, yyyy");
}

/**
 * Get a full date+time string in Mountain Time: "Apr 20, 2026 10:32 AM"
 */
export function formatDateTimeMT(date: Date | string | number): string {
  return formatMT(date, "MMM d, yyyy h:mm a");
}

/**
 * Check if a date falls on today in Mountain Time.
 */
export function isTodayMT(date: Date | string | number): boolean {
  const mt = toMountainTime(date);
  const now = toMountainTime(new Date());
  return (
    mt.getFullYear() === now.getFullYear() &&
    mt.getMonth() === now.getMonth() &&
    mt.getDate() === now.getDate()
  );
}

/**
 * Check if a date falls on yesterday in Mountain Time.
 */
export function isYesterdayMT(date: Date | string | number): boolean {
  const mt = toMountainTime(date);
  const yesterday = toMountainTime(new Date());
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    mt.getFullYear() === yesterday.getFullYear() &&
    mt.getMonth() === yesterday.getMonth() &&
    mt.getDate() === yesterday.getDate()
  );
}

/**
 * Get a date group label in Mountain Time: "Today", "Yesterday", or "Monday, April 20, 2026"
 */
export function getDateLabelMT(date: Date | string | number): string {
  if (isTodayMT(date)) return "Today";
  if (isYesterdayMT(date)) return "Yesterday";
  return formatMT(date, "EEEE, MMMM d, yyyy");
}

/**
 * Check if two dates are on the same day in Mountain Time.
 */
export function isSameDayMT(date1: Date | string | number, date2: Date | string | number): boolean {
  const d1 = toMountainTime(date1);
  const d2 = toMountainTime(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Format a date for display using toLocaleString with Mountain Time.
 * Useful for places that used raw .toLocaleString() or .toLocaleDateString().
 */
export function toLocaleDateStringMT(
  date: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (date == null || date === "") return "";
  const d = normalizeToUTC(date);
  return d.toLocaleString("en-US", {
    timeZone: APP_TIMEZONE,
    ...options,
  });
}

/**
 * Format a date for display using toLocaleTimeString with Mountain Time.
 */
export function toLocaleTimeStringMT(
  date: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (date == null || date === "") return "";
  const d = normalizeToUTC(date);
  return d.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    ...options,
  });
}
