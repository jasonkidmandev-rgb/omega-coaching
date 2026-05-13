import { ENV } from "./_core/env";

// Lazy-load Twilio client to avoid import errors when not configured
let twilioClient: any = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  
  const { twilioAccountSid, twilioAuthToken } = ENV;
  if (!twilioAccountSid || !twilioAuthToken) {
    return null;
  }
  
  try {
    // Dynamic import to avoid issues when twilio is not needed
    const twilio = require("twilio");
    twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    return twilioClient;
  } catch (error) {
    console.error("[SMS] Failed to initialize Twilio client:", error);
    return null;
  }
}

/**
 * Check if SMS service is configured and ready to send
 */
export function isSmsConfigured(): boolean {
  return !!(ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioPhoneNumber);
}

/**
 * Format a phone number to E.164 format for Twilio
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

interface SendSmsResult {
  success: boolean;
  message: string;
  twilioSid?: string;
  status?: string;
}

/**
 * Send an SMS message via Twilio
 */
export async function sendSms(params: {
  to: string;
  body: string;
  statusCallbackUrl?: string;
}): Promise<SendSmsResult> {
  const { to, body, statusCallbackUrl } = params;
  
  if (!isSmsConfigured()) {
    console.log("[SMS] Twilio not configured. Message would have been sent to:", to);
    console.log("[SMS] Message body:", body);
    return {
      success: false,
      message: "SMS service not configured. Please add Twilio credentials in Settings.",
    };
  }
  
  const formattedTo = formatPhoneE164(to);
  if (!formattedTo) {
    return {
      success: false,
      message: `Invalid phone number: ${to}`,
    };
  }
  
  const client = getTwilioClient();
  if (!client) {
    return {
      success: false,
      message: "Failed to initialize Twilio client. Check your credentials.",
    };
  }
  
  try {
    const messageOptions: any = {
      to: formattedTo,
      from: ENV.twilioPhoneNumber,
      body,
    };
    
    if (statusCallbackUrl) {
      messageOptions.statusCallback = statusCallbackUrl;
    }
    
    const message = await client.messages.create(messageOptions);
    
    console.log(`[SMS] Sent to ${formattedTo} | SID: ${message.sid} | Status: ${message.status}`);
    
    return {
      success: true,
      message: "SMS sent successfully",
      twilioSid: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    console.error("[SMS] Failed to send:", error.message);
    return {
      success: false,
      message: `SMS send failed: ${error.message}`,
    };
  }
}

/**
 * Get the delivery status of a previously sent SMS
 */
export async function getSmsStatus(twilioSid: string): Promise<string | null> {
  const client = getTwilioClient();
  if (!client) return null;
  
  try {
    const message = await client.messages(twilioSid).fetch();
    return message.status;
  } catch (error: any) {
    console.error("[SMS] Failed to fetch status:", error.message);
    return null;
  }
}
