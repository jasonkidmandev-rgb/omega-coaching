/**
 * Server-side timezone utility for PeptideCoach.Pro
 * 
 * The server runs in UTC. All user-facing date formatting (emails, PDFs, 
 * notifications, SMS) MUST use these helpers to display Mountain Time.
 */

export const APP_TIMEZONE = "America/Denver";

/**
 * Format a date in Mountain Time using toLocaleString.
 */
export function formatDateMT(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    timeZone: APP_TIMEZONE,
    ...options,
  });
}

/**
 * Format just the date portion in Mountain Time.
 */
export function formatDateOnlyMT(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    ...options,
  });
}

/**
 * Format just the time portion in Mountain Time.
 */
export function formatTimeOnlyMT(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    ...options,
  });
}
