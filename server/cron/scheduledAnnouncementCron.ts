import * as db from "../db";
import { sendWaiverAnnouncementEmail } from "../emailService";

/**
 * Cron job to process scheduled announcements
 * Runs every minute to check for announcements that need to be sent
 */
export async function processScheduledAnnouncements() {
  console.log("[ScheduledAnnouncementCron] Checking for scheduled announcements...");
  
  try {
    const scheduled = await db.getScheduledAnnouncements();
    const now = new Date();
    
    for (const announcement of scheduled) {
      // Check if it's time to send this announcement
      if (!announcement.scheduledFor || new Date(announcement.scheduledFor) > now) {
        continue;
      }
      
      console.log(`[ScheduledAnnouncementCron] Processing announcement ${announcement.id}: "${announcement.subject}"`);
      
      // Parse the recipient waiver IDs
      let waiverIds: number[] = [];
      try {
        if (announcement.recipientWaiverIds) {
          waiverIds = JSON.parse(announcement.recipientWaiverIds);
        }
      } catch (e) {
        console.error(`[ScheduledAnnouncementCron] Failed to parse waiver IDs for announcement ${announcement.id}`);
        await db.updateAnnouncementStatus(announcement.id, "failed");
        continue;
      }
      
      if (waiverIds.length === 0) {
        console.log(`[ScheduledAnnouncementCron] No recipients for announcement ${announcement.id}`);
        await db.updateAnnouncementStatus(announcement.id, "failed");
        continue;
      }
      
      // Get the waivers
      const allWaivers = await db.getAllStoreWaivers();
      const selectedWaivers = allWaivers.filter(w => waiverIds.includes(w.id));
      
      let sent = 0;
      let errors: string[] = [];
      
      for (const waiver of selectedWaivers) {
        if (!waiver.email) {
          continue;
        }
        
        try {
          const recipientName = `${waiver.firstName} ${waiver.lastName}`.trim() || "Valued Customer";
          await sendWaiverAnnouncementEmail({
            to: waiver.email,
            recipientName,
            subject: announcement.subject,
            message: announcement.message,
          });
          sent++;
        } catch (error: any) {
          errors.push(`${waiver.email}: ${error.message}`);
        }
      }
      
      // Update the announcement status
      await db.updateAnnouncementStatus(announcement.id, "sent", sent);
      console.log(`[ScheduledAnnouncementCron] Sent announcement ${announcement.id} to ${sent} recipients`);
      
      if (errors.length > 0) {
        console.error(`[ScheduledAnnouncementCron] Errors sending announcement ${announcement.id}:`, errors);
      }
      
      if (announcement.recurrencePattern && announcement.recurrencePattern !== 'none') {
        try {
          const nextScheduledFor = calculateNextRecurrence(
            new Date(announcement.scheduledFor),
            announcement.recurrencePattern
          );
          if (!announcement.recurrenceEndDate || nextScheduledFor <= new Date(announcement.recurrenceEndDate)) {
            await db.createRecurrenceInstance(
              announcement.id,
              {
                subject: announcement.subject,
                message: announcement.message,
                recipientWaiverIds: announcement.recipientWaiverIds,
                scheduledFor: nextScheduledFor,
                recurrencePattern: announcement.recurrencePattern,
                recurrenceEndDate: announcement.recurrenceEndDate,
                status: 'scheduled',
              }
            );
            console.log(`[ScheduledAnnouncementCron] Created next recurring instance for announcement ${announcement.id}`);
          }
        } catch (error) {
          console.error(`[ScheduledAnnouncementCron] Failed to create recurring instance:`, error);
        }
      }
    }
  } catch (error) {
    console.error("[ScheduledAnnouncementCron] Error processing scheduled announcements:", error);
  }
}

// Initialize the cron job to run every minute
let cronInterval: NodeJS.Timeout | null = null;

export function startScheduledAnnouncementCron() {
  if (cronInterval) {
    console.log("[ScheduledAnnouncementCron] Cron already running");
    return;
  }
  
  console.log("[ScheduledAnnouncementCron] Starting scheduled announcement cron (runs every minute)");
  
  // Run every minute
  cronInterval = setInterval(processScheduledAnnouncements, 60 * 1000);
  
  // Also run immediately on startup
  processScheduledAnnouncements();
}

export function stopScheduledAnnouncementCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[ScheduledAnnouncementCron] Cron stopped");
  }
}


function calculateNextRecurrence(currentDate: Date, pattern: string): Date {
  const next = new Date(currentDate);
  
  switch (pattern) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return next;
  }
  
  return next;
}
