/**
 * Protocol Expiration Cron Job
 * Sends alerts to coaches when client protocols are approaching their end date
 * Schedule: Runs daily at 8:00 AM
 * 
 * Alert Schedule:
 * - 30 days before expiration: Early notice
 * - 14 days before expiration: Upcoming expiration warning
 * - 7 days before expiration: Final week warning
 * - On expiration day: Protocol expired notification
 */

import * as db from "../db";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";

const CRON_HOUR = 8;
const CRON_MINUTE = 0;
let cronInterval: NodeJS.Timeout | null = null;
let lastRunDate: string | null = null;

// Days before expiration to send alerts
const ALERT_DAYS = [30, 14, 7, 0];

// Store last cron run data
let lastCronRunData: { timestamp: string; alerts: number; protocols: number } | null = null;

function shouldRunCron(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const today = now.toISOString().split("T")[0];

  if (
    currentHour === CRON_HOUR &&
    currentMinute >= CRON_MINUTE &&
    currentMinute < CRON_MINUTE + 5
  ) {
    if (lastRunDate !== today) {
      lastRunDate = today;
      return true;
    }
  }

  return false;
}

/**
 * Calculate the expiration date for a protocol based on its start date and duration
 */
function calculateExpirationDate(protocol: any): Date | null {
  // Use approvedAt as the start date, or sentAt if not approved yet, or createdAt as fallback
  const startDate = protocol.approvedAt || protocol.sentAt || protocol.createdAt;
  if (!startDate) return null;
  
  const start = new Date(startDate);
  const durationMonths = protocol.durationMonths || 3;
  
  // Add duration months to start date
  const expiration = new Date(start);
  expiration.setMonth(expiration.getMonth() + durationMonths);
  
  return expiration;
}

/**
 * Get alert level and message based on days until expiration
 */
function getAlertInfo(daysUntilExpiration: number): { level: 'early' | 'warning' | 'urgent' | 'expired'; title: string; message: string } {
  if (daysUntilExpiration <= 0) {
    return {
      level: 'expired',
      title: 'Protocol Expired',
      message: 'This protocol has reached its end date and may need renewal.'
    };
  } else if (daysUntilExpiration <= 7) {
    return {
      level: 'urgent',
      title: 'Protocol Expiring Soon',
      message: `This protocol expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}. Consider reaching out about renewal.`
    };
  } else if (daysUntilExpiration <= 14) {
    return {
      level: 'warning',
      title: 'Protocol Expiration Warning',
      message: `This protocol expires in ${daysUntilExpiration} days. Time to discuss renewal options.`
    };
  } else {
    return {
      level: 'early',
      title: 'Protocol Expiration Notice',
      message: `This protocol expires in ${daysUntilExpiration} days. Consider scheduling a renewal consultation.`
    };
  }
}

/**
 * Check if an alert has already been sent for this protocol at this threshold
 */
async function hasAlertBeenSent(protocolId: number, daysThreshold: number): Promise<boolean> {
  try {
    const database = await getDb();
    if (!database) return false;
    
    // Check for existing notification with similar message in the last 24 hours
    const { notifications } = await import("../../drizzle/schema");
    const { eq, and, gte } = await import("drizzle-orm");
    const existingNotifications = await database.select()
      .from(notifications)
      .where(and(
        eq(notifications.clientProtocolId, protocolId),
        eq(notifications.type, 'protocol_expiring' as any),
        gte(notifications.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      ));
    
    return existingNotifications.length > 0;
  } catch (error) {
    console.error(`[Protocol Expiration] Error checking existing alerts:`, error);
    return false;
  }
}

export async function processProtocolExpirations(): Promise<{ alerts: number; protocols: number }> {
  console.log("[Protocol Expiration Cron] Starting expiration check...");
  
  let alertsSent = 0;
  let protocolsChecked = 0;
  
  try {
    // Check if expiration alerts are enabled
    const expirationAlertsEnabled = await db.getSiteSetting("protocol_expiration_alerts_enabled");
    if (expirationAlertsEnabled === "false") {
      console.log("[Protocol Expiration Cron] Expiration alerts are disabled. Skipping.");
      return { alerts: 0, protocols: 0 };
    }
    
    // Get all active protocols
    const protocols = await db.getAllClientProtocols("active");
    const now = new Date();
    
    for (const protocol of protocols) {
      // Only check active or approved protocols
      if (protocol.status !== 'active' && protocol.status !== 'approved') {
        continue;
      }
      
      protocolsChecked++;
      
      // Calculate expiration date
      const expirationDate = calculateExpirationDate(protocol);
      if (!expirationDate) continue;
      
      // Calculate days until expiration
      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      // Check if we should send an alert at any threshold
      let shouldAlert = false;
      let alertThreshold = 0;
      
      for (const threshold of ALERT_DAYS) {
        if (daysUntilExpiration <= threshold) {
          // Check if alert was already sent for this threshold
          const alreadySent = await hasAlertBeenSent(protocol.id, threshold);
          if (!alreadySent) {
            shouldAlert = true;
            alertThreshold = threshold;
            break;
          }
        }
      }
      
      if (!shouldAlert) continue;
      
      // Get alert info
      const alertInfo = getAlertInfo(daysUntilExpiration);
      
      try {
        // Create in-app notification for all admin users
        await db.createNotificationsForEnabledUsers(
          'protocol_expiring' as any,
          `${alertInfo.title}: ${protocol.clientName}`,
          `${alertInfo.message} Protocol duration: ${protocol.durationMonths} months. Expires: ${expirationDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' })}.`,
          protocol.id
        );
        
        alertsSent++;
        console.log(`[Protocol Expiration] Alert sent for ${protocol.clientName} - ${daysUntilExpiration} days until expiration`);
      } catch (error) {
        console.error(`[Protocol Expiration] Failed to create alert for protocol ${protocol.id}:`, error);
      }
    }
    
    console.log(`[Protocol Expiration Cron] Completed. Checked ${protocolsChecked} protocols, sent ${alertsSent} alerts.`);
    
    lastCronRunData = {
      timestamp: new Date().toISOString(),
      alerts: alertsSent,
      protocols: protocolsChecked,
    };
    
    return { alerts: alertsSent, protocols: protocolsChecked };
  } catch (error) {
    console.error("[Protocol Expiration Cron] Error:", error);
    return { alerts: alertsSent, protocols: protocolsChecked };
  }
}

export function startProtocolExpirationCron(): void {
  console.log("[Protocol Expiration Cron] Initialized - checking daily at 8:00 AM");
  
  // Check every 5 minutes if it's time to run
  cronInterval = setInterval(() => {
    if (shouldRunCron()) {
      processProtocolExpirations().catch(console.error);
    }
  }, 5 * 60 * 1000);
  
  // Also run immediately on startup if it's the right time
  if (shouldRunCron()) {
    processProtocolExpirations().catch(console.error);
  }
}

export function stopProtocolExpirationCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[Protocol Expiration Cron] Stopped");
  }
}

export function getLastProtocolExpirationCronRun(): { timestamp: string; alerts: number; protocols: number } | null {
  return lastCronRunData;
}

// Manual trigger for testing
export async function triggerProtocolExpirationJob(): Promise<{ alerts: number; protocols: number }> {
  console.log("[Protocol Expiration Cron] Manual trigger initiated");
  return processProtocolExpirations();
}
