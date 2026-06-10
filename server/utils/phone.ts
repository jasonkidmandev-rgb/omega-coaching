/**
 * Phone number formatting utilities.
 * (Moved out of smsService.ts when Twilio/SMS was removed — these are
 * general-purpose and used by prospect CRUD.)
 */

/**
 * Format a phone number to E.164 format
 * Handles common US formats: (555) 123-4567, 555-123-4567, 5551234567, +15551234567
 */
export function formatPhoneE164(phone: string): string | null {
  if (!phone) return null;

  // Strip all non-digit characters except leading +
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  if (!digits) return null;

  // Already in E.164 with country code
  if (hasPlus && digits.length >= 11) {
    return `+${digits}`;
  }

  // US number with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // US number without country code (10 digits)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's some other format, try to use it as-is with +
  if (digits.length >= 10) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Format a phone number for display: (555) 123-4567
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // Remove leading 1 for US numbers
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (local.length === 10) {
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }

  return phone; // Return original if can't format
}
