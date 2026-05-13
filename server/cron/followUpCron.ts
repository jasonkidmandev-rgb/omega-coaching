/**
 * Automated Follow-Up Email Cron Job
 * 
 * This module runs a daily cron job to automatically send follow-up emails
 * to clients who have received their protocol but haven't approved it yet.
 * 
 * Schedule: Runs once daily at 9:00 AM server time
 * 
 * Configuration:
 * - DAYS_AFTER_SENT: Number of days to wait before sending first follow-up (default: 3)
 * - MAX_FOLLOW_UPS: Maximum number of follow-up emails to send per client (default: 3)
 */

import * as db from '../db';
import { sendFollowUpEmail } from '../emailService';

// Configuration
const DAYS_AFTER_SENT = 3; // Wait 3 days after initial send before follow-up
const MAX_FOLLOW_UPS = 3;  // Maximum 3 follow-up emails per client
const CRON_HOUR = 9;       // Run at 9 AM
const CRON_MINUTE = 0;     // Run at the start of the hour

let cronInterval: NodeJS.Timeout | null = null;
let lastRunDate: string | null = null;

/**
 * Check if the cron job should run based on current time
 * Runs once per day at the specified hour
 */
function shouldRunCron(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const today = now.toISOString().split('T')[0];
  
  // Only run if we're within the target hour and haven't run today
  if (currentHour === CRON_HOUR && currentMinute >= CRON_MINUTE && currentMinute < CRON_MINUTE + 5) {
    if (lastRunDate !== today) {
      lastRunDate = today;
      return true;
    }
  }
  
  return false;
}

/**
 * Execute the follow-up email job
 */
async function runFollowUpJob(): Promise<void> {
  console.log('[Follow-Up Cron] Starting automated follow-up email job...');
  
  try {
    // Get protocols that need follow-up
    const protocols = await db.getProtocolsNeedingFollowUp(DAYS_AFTER_SENT, MAX_FOLLOW_UPS);
    
    if (protocols.length === 0) {
      console.log('[Follow-Up Cron] No protocols need follow-up emails');
      return;
    }
    
    console.log(`[Follow-Up Cron] Found ${protocols.length} protocols needing follow-up`);
    
    // Get email branding settings
    const branding = await db.getEmailBrandingSettings();
    
    // Use environment variable or default origin
    const origin = process.env.APP_URL || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
    
    let sent = 0;
    let failed = 0;
    
    for (const protocol of protocols) {
      try {
        // Skip if no email address
        if (!protocol.clientEmail) {
          console.log(`[Follow-Up Cron] Skipping protocol ${protocol.id} - no email address`);
          continue;
        }
        
        const protocolUrl = `${origin}/protocol/${protocol.accessToken}`;
        
        const success = await sendFollowUpEmail(
          protocol.clientEmail,
          protocol.clientName || 'Client',
          protocolUrl,
          (protocol.followUpCount || 0) + 1,
          branding ? {
            logoUrl: branding.logoUrl || undefined,
            companyName: branding.companyName || undefined,
            tagline: branding.tagline || undefined,
            primaryColor: branding.primaryColor || undefined,
            footerText: branding.footerText || undefined,
          } : undefined
        );
        
        if (success) {
          await db.updateFollowUpTracking(protocol.id);
          sent++;
          console.log(`[Follow-Up Cron] Sent follow-up #${(protocol.followUpCount || 0) + 1} to ${protocol.clientEmail}`);
        } else {
          failed++;
          console.error(`[Follow-Up Cron] Failed to send follow-up to ${protocol.clientEmail}`);
        }
        
        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failed++;
        console.error(`[Follow-Up Cron] Error processing protocol ${protocol.id}:`, error);
      }
    }
    
    console.log(`[Follow-Up Cron] Job complete. Sent: ${sent}, Failed: ${failed}`);
    
    // Log the job run for tracking
    logCronRun(sent, failed);
    
  } catch (error) {
    console.error('[Follow-Up Cron] Job failed:', error);
  }
}

// Store last cron run in memory (persists until server restart)
let lastCronRunData: { timestamp: string; sent: number; failed: number } | null = null;

/**
 * Log cron job execution
 */
function logCronRun(sent: number, failed: number): void {
  lastCronRunData = {
    timestamp: new Date().toISOString(),
    sent,
    failed,
  };
  console.log(`[Follow-Up Cron] Run logged: ${JSON.stringify(lastCronRunData)}`);
}

/**
 * Start the cron job scheduler
 * Checks every 5 minutes if it's time to run the daily job
 */
export function startFollowUpCron(): void {
  console.log('[Follow-Up Cron] Initializing automated follow-up email scheduler...');
  console.log(`[Follow-Up Cron] Scheduled to run daily at ${CRON_HOUR}:${CRON_MINUTE.toString().padStart(2, '0')}`);
  
  // Check every 5 minutes
  cronInterval = setInterval(() => {
    if (shouldRunCron()) {
      runFollowUpJob();
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  // Also check immediately on startup (in case server restarts during cron window)
  if (shouldRunCron()) {
    runFollowUpJob();
  }
}

/**
 * Stop the cron job scheduler
 */
export function stopFollowUpCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('[Follow-Up Cron] Scheduler stopped');
  }
}

/**
 * Manually trigger the follow-up job (for testing or admin use)
 */
export async function triggerFollowUpJob(): Promise<{ sent: number; failed: number }> {
  console.log('[Follow-Up Cron] Manual trigger requested');
  
  const protocols = await db.getProtocolsNeedingFollowUp(DAYS_AFTER_SENT, MAX_FOLLOW_UPS);
  const branding = await db.getEmailBrandingSettings();
  const origin = process.env.APP_URL || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
  
  let sent = 0;
  let failed = 0;
  
  for (const protocol of protocols) {
    try {
      // Skip if no email address
      if (!protocol.clientEmail) continue;
      
      const protocolUrl = `${origin}/protocol/${protocol.accessToken}`;
      
      const success = await sendFollowUpEmail(
        protocol.clientEmail,
        protocol.clientName || 'Client',
        protocolUrl,
        (protocol.followUpCount || 0) + 1,
        branding ? {
          logoUrl: branding.logoUrl || undefined,
          companyName: branding.companyName || undefined,
          tagline: branding.tagline || undefined,
          primaryColor: branding.primaryColor || undefined,
          footerText: branding.footerText || undefined,
        } : undefined
      );
      
      if (success) {
        await db.updateFollowUpTracking(protocol.id);
        sent++;
      } else {
        failed++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      failed++;
    }
  }
  
  logCronRun(sent, failed);
  
  return { sent, failed };
}

/**
 * Get the last cron run status
 */
export function getLastCronRun(): { timestamp: string; sent: number; failed: number } | null {
  return lastCronRunData;
}
