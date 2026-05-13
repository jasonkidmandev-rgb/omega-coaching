/**
 * SMS Service using GoHighLevel API
 * Sends SMS messages via GHL's messaging API
 */

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_API_URL = 'https://services.leadconnectorhq.com';

interface SendSMSParams {
  to: string; // Phone number with country code
  message: string;
  contactId?: string; // Optional GHL contact ID
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an SMS message via GoHighLevel API
 */
export async function sendSMS(params: SendSMSParams): Promise<SMSResult> {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.warn('[SMS] GHL_API_KEY or GHL_LOCATION_ID not configured, skipping SMS');
    return { success: false, error: 'SMS not configured' };
  }

  try {
    // Format phone number (ensure it has country code)
    const phoneNumber = formatPhoneNumber(params.to);
    
    const response = await fetch(`${GHL_API_URL}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify({
        type: 'SMS',
        locationId: GHL_LOCATION_ID,
        contactId: params.contactId,
        phone: phoneNumber,
        message: params.message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SMS] Failed to send SMS:', response.status, errorText);
      return { success: false, error: `Failed to send SMS: ${response.status}` };
    }

    const result = await response.json();
    console.log('[SMS] Message sent successfully:', result.messageId);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[SMS] Error sending SMS:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Format phone number to include country code
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's a 10-digit US number, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it already has country code (11+ digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it already has + prefix, return as-is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: add + prefix
  return `+${digits}`;
}

/**
 * Send shipping notification SMS
 */
export async function sendShippingNotificationSMS(params: {
  phone: string;
  customerName: string;
  orderId: number;
  trackingNumber: string;
  trackingCarrier: string;
}): Promise<SMSResult> {
  const message = `Hi ${params.customerName}! 📦 Your Omega Store order #${params.orderId} has shipped via ${params.trackingCarrier}. Track: ${params.trackingNumber}`;
  
  return sendSMS({
    to: params.phone,
    message,
  });
}

/**
 * Send low stock alert SMS to admin
 */
export async function sendLowStockAlertSMS(params: {
  phone: string;
  itemName: string;
  currentStock: number;
  threshold: number;
}): Promise<SMSResult> {
  const message = `⚠️ Low Stock Alert: "${params.itemName}" is at ${params.currentStock} units (threshold: ${params.threshold}). Reorder soon!`;
  
  return sendSMS({
    to: params.phone,
    message,
  });
}
