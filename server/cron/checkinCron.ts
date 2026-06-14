import { getDb } from "../db";
import { 
  checkins, checkinSchedules, checkinNotificationLogs, checkinNotificationTemplates,
  clientProtocols, users, projectTasks, clientProjects,
  progressPhotos, journeyNotes, cronRuns
} from "../../drizzle/schema";
import { eq, and, lte, gte, isNull, sql, desc, or, asc } from "drizzle-orm";
import { siteSettings } from "../../drizzle/schema";
import { sendTrackedEmail } from "../emailService";

// Timezone offset map (hours from UTC)
const TIMEZONE_OFFSETS: Record<string, number> = {
  'America/New_York': -5,      // EST (or -4 during DST)
  'America/Chicago': -6,       // CST (or -5 during DST)
  'America/Denver': -7,        // MST (or -6 during DST)
  'America/Phoenix': -7,       // Arizona (no DST)
  'America/Los_Angeles': -8,   // PST (or -7 during DST)
  'UTC': 0,
};

/**
 * Get the UTC offset for a timezone, accounting for DST
 */
function getTimezoneOffset(timezone: string): number {
  try {
    // Use Intl API to get accurate offset including DST
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
    return offsetMinutes / 60; // Convert to hours
  } catch {
    // Fallback to static offsets if Intl fails
    return TIMEZONE_OFFSETS[timezone] || -7; // Default to Mountain Time
  }
}

/**
 * Calculate the next scheduled time based on client's timezone
 */
export function calculateNextScheduledTime(
  dayOfWeek: number,
  timeOfDay: string,
  timezone: string,
  frequency: string = 'weekly'
): Date {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  
  // Get timezone offset in hours
  const tzOffset = getTimezoneOffset(timezone);
  
  // Calculate the target time in UTC
  // If client wants 10:00 AM Mountain Time (UTC-7), we need to store 17:00 UTC
  const targetHoursUTC = hours - tzOffset;
  
  // Find the next occurrence of the target day
  let nextDate = new Date(now);
  const currentDay = now.getUTCDay();
  let daysUntilTarget = dayOfWeek - currentDay;
  
  // If target day is today, check if the time has passed
  if (daysUntilTarget === 0) {
    const currentHoursUTC = now.getUTCHours();
    const currentMinutesUTC = now.getUTCMinutes();
    if (currentHoursUTC > targetHoursUTC || 
        (currentHoursUTC === targetHoursUTC && currentMinutesUTC >= minutes)) {
      // Time has passed, schedule for next week
      daysUntilTarget = 7;
    }
  } else if (daysUntilTarget < 0) {
    // Target day is earlier in the week, schedule for next week
    daysUntilTarget += 7;
  }
  
  // Apply frequency multiplier
  if (frequency === 'biweekly') {
    daysUntilTarget += 7; // Add an extra week
  } else if (frequency === 'monthly') {
    daysUntilTarget += 21; // Approximate monthly as 4 weeks
  }
  
  nextDate.setUTCDate(now.getUTCDate() + daysUntilTarget);
  nextDate.setUTCHours(targetHoursUTC, minutes, 0, 0);
  
  return nextDate;
}

const LOG_PREFIX = "[CheckinCron]";

// Global kill switch for ALL check-in activity. Stored in site_settings so it
// can be toggled at runtime from the admin UI without a redeploy. This is the
// single source of truth honored by every send path (scheduled, reminders,
// low-score alerts, the manual trigger) AND by the engagement-level auto-enable,
// so "off" means off regardless of per-client schedule flags.
export const GLOBAL_CHECKIN_SETTING_KEY = 'checkins_globally_enabled';

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

/**
 * Returns true ONLY when the global check-in switch is explicitly set to
 * 'true'. Default is OFF: a missing/other value means disabled. This is a
 * deliberate fail-safe — check-ins must be explicitly turned on (via the
 * toggle in Check-in Management), so they can never silently resume after a
 * deploy, DB reset, or config gap. On a read error we also return false so a
 * DB hiccup never resurrects sending.
 */
export async function areCheckinsGloballyEnabled(): Promise<boolean> {
  try {
    const database = await db();
    const [row] = await database
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, GLOBAL_CHECKIN_SETTING_KEY));
    return row?.value === 'true';
  } catch (e) {
    console.error(`${LOG_PREFIX} Could not read global check-in setting, defaulting to OFF:`, e);
    return false;
  }
}

/**
 * Send check-in notification email
 */
async function sendCheckinEmail(
  to: string,
  subject: string,
  body: string,
  checkinId: number,
  notificationType: string,
  clientProtocolId: number
) {
  const database = await db();
  
  try {
    // Use sendTrackedEmail for proper open/click tracking in notification history
    const result = await sendTrackedEmail({
      to,
      subject,
      html: body,
      category: 'checkin',
      notificationType: 'checkin_email',
      emailType: 'checkin',
      clientProtocolId,
      triggeredBy: 'cron',
    });
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    // Log the notification to checkin-specific logs
    await database.insert(checkinNotificationLogs).values({
      checkinId,
      clientProtocolId,
      notificationType,
      recipientType: 'client',
      recipientEmail: to,
      subject,
      sentAt: new Date(),
      status: 'sent',
    });
    
    console.log(`${LOG_PREFIX} Sent ${notificationType} email to ${to} (trackingId: ${result.trackingId || 'none'})`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to send ${notificationType} email to ${to}:`, error);
    
    // Log the failure
    await database.insert(checkinNotificationLogs).values({
      checkinId,
      clientProtocolId,
      notificationType,
      recipientType: 'client',
      recipientEmail: to,
      subject,
      sentAt: new Date(),
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a task in the client's project for follow-up
 */
async function createFollowUpTask(
  clientProtocolId: number,
  title: string,
  description: string,
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'high'
) {
  const database = await db();
  
  // Find the client's project
  const [project] = await database
    .select()
    .from(clientProjects)
    .where(eq(clientProjects.clientProtocolId, clientProtocolId));
  
  if (!project) {
    console.log(`${LOG_PREFIX} No project found for client protocol ${clientProtocolId}`);
    return;
  }
  
  // For now, just log the task - we'll use a simpler notification approach
  // The projectTasks table has a different structure (lifecycle-based)
  // Instead, we'll create a notification for the coach
  console.log(`${LOG_PREFIX} Would create task: ${title} for project ${project.id} (priority: ${priority})`);
}

/**
 * Log a cron run to the database for health tracking
 */
async function logCronRun(params: {
  jobName: string;
  status: 'success' | 'error' | 'partial';
  startedAt: Date;
  completedAt: Date;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errorMessage?: string;
  details?: string;
  triggeredBy: 'cron' | 'manual' | 'startup';
}) {
  try {
    const database = await db();
    await database.insert(cronRuns).values({
      jobName: params.jobName,
      status: params.status,
      startedAt: params.startedAt,
      completedAt: params.completedAt,
      durationMs: params.completedAt.getTime() - params.startedAt.getTime(),
      itemsProcessed: params.itemsProcessed,
      itemsSucceeded: params.itemsSucceeded,
      itemsFailed: params.itemsFailed,
      errorMessage: params.errorMessage || null,
      details: params.details || null,
      triggeredBy: params.triggeredBy,
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to log cron run:`, err);
  }
}

// Track the trigger source for the current run
let currentTriggerSource: 'cron' | 'manual' | 'startup' = 'cron';

/**
 * Main cron job: Send new check-ins
 * Runs every Thursday at 10 AM
 */
export async function sendScheduledCheckins() {
  if (!(await areCheckinsGloballyEnabled())) {
    console.log(`${LOG_PREFIX} Check-ins globally disabled — skipping scheduled send.`);
    return;
  }
  console.log(`${LOG_PREFIX} Running scheduled check-in sender...`);
  const runStartedAt = new Date();
  let processedCount = 0;
  let succeededCount = 0;
  let failedCount = 0;
  const sentDetails: string[] = [];
  
  const database = await db();
  
  // Get all enabled, non-paused schedules where nextScheduledAt is now or in the past
  // and skipUntil has passed (or is not set)
  const now = new Date();
  const schedules = await database
    .select()
    .from(checkinSchedules)
    .where(and(
      eq(checkinSchedules.isEnabled, true),
      eq(checkinSchedules.isPaused, false),
      lte(checkinSchedules.nextScheduledAt, now),
      or(
        isNull(checkinSchedules.skipUntil),
        lte(checkinSchedules.skipUntil, now)
      )
    ));
  
  console.log(`${LOG_PREFIX} Found ${schedules.length} schedules to process`);
  
  // Get the check-in email template (templateType is 'checkin_reminder' in the database)
  const [template] = await database
    .select()
    .from(checkinNotificationTemplates)
    .where(eq(checkinNotificationTemplates.templateType, 'checkin_reminder'));
  
  if (!template) {
    console.error(`${LOG_PREFIX} CRITICAL: No checkin_reminder template found in database! Cannot send check-in emails.`);
  }
  
  // Get coach name for template replacement
  const coachName = process.env.OWNER_NAME || 'Your Coach';
  
  // Load custom email settings from site_settings (admin-configurable)
  let customSubject: string | null = null;
  let customGreeting: string | null = null;
  let customCtaText: string | null = null;
  try {
    const [subjectSetting] = await database.select().from(siteSettings).where(eq(siteSettings.key, 'checkin_email_subject'));
    const [greetingSetting] = await database.select().from(siteSettings).where(eq(siteSettings.key, 'checkin_email_greeting'));
    const [ctaSetting] = await database.select().from(siteSettings).where(eq(siteSettings.key, 'checkin_email_cta_text'));
    customSubject = subjectSetting?.value || null;
    customGreeting = greetingSetting?.value || null;
    customCtaText = ctaSetting?.value || null;
  } catch (err) {
    console.log(`${LOG_PREFIX} Could not load custom email settings, using defaults`);
  }
  
  for (const schedule of schedules) {
    processedCount++;
    try {
      // Get the client protocol and user info
      const [protocol] = await database
        .select()
        .from(clientProtocols)
        .where(eq(clientProtocols.id, schedule.clientProtocolId));
      
      if (!protocol) {
        console.log(`${LOG_PREFIX} Protocol ${schedule.clientProtocolId} not found, disabling schedule`);
        await database
          .update(checkinSchedules)
          .set({ isEnabled: false })
          .where(eq(checkinSchedules.id, schedule.id));
        continue;
      }
      
      // Skip archived or deleted protocols — auto-disable their schedules
      if (protocol.archivedAt || protocol.deletedAt) {
        console.log(`${LOG_PREFIX} Protocol ${schedule.clientProtocolId} (${protocol.clientName || 'Unknown'}) is archived/deleted — auto-disabling check-in schedule.`);
        await database
          .update(checkinSchedules)
          .set({ isEnabled: false })
          .where(eq(checkinSchedules.id, schedule.id));
        continue;
      }
      
      // Skip clients with "protocol_only" engagement level — they should not receive check-ins
      if (protocol.engagementLevel === 'protocol_only') {
        console.log(`${LOG_PREFIX} Protocol ${schedule.clientProtocolId} (${protocol.clientName || 'Unknown'}) is "Protocol Only" — auto-disabling their check-in schedule.`);
        await database
          .update(checkinSchedules)
          .set({ isEnabled: false })
          .where(eq(checkinSchedules.id, schedule.id));
        continue;
      }
      
      // Get the user by email (skip if no email)
      if (!protocol.clientEmail) {
        console.log(`${LOG_PREFIX} Protocol ${schedule.clientProtocolId} has no client email, disabling schedule`);
        await database
          .update(checkinSchedules)
          .set({ isEnabled: false })
          .where(eq(checkinSchedules.id, schedule.id));
        continue;
      }
      
      // DUPLICATE PREVENTION: Check if a check-in email was already sent for this schedule
      // since the nextScheduledAt time (i.e., another server instance already processed it)
      const recentSends = await database
        .select({ id: checkinNotificationLogs.id })
        .from(checkinNotificationLogs)
        .where(and(
          eq(checkinNotificationLogs.clientProtocolId, schedule.clientProtocolId),
          eq(checkinNotificationLogs.notificationType, 'checkin_request'),
          gte(checkinNotificationLogs.sentAt, schedule.nextScheduledAt ?? new Date(0))
        ))
        .limit(1);
      
      if (recentSends.length > 0) {
        console.log(`${LOG_PREFIX} DUPLICATE PREVENTED: Check-in already sent for protocol ${schedule.clientProtocolId} (${protocol.clientName}) since ${schedule.nextScheduledAt}. Advancing schedule.`);
        // Another server instance already sent this — just advance the schedule
        const clientTimezone = schedule.timezone || 'America/Denver';
        const clientDayOfWeek = schedule.dayOfWeek ?? 4;
        const clientTimeOfDay = schedule.timeOfDay || '10:00';
        const clientFrequency = schedule.frequency || 'weekly';
        const nextScheduledTime = calculateNextScheduledTime(clientDayOfWeek, clientTimeOfDay, clientTimezone, clientFrequency);
        await database
          .update(checkinSchedules)
          .set({ nextScheduledAt: nextScheduledTime, lastSentAt: now })
          .where(eq(checkinSchedules.id, schedule.id));
        continue;
      }
      
      // CHECK IF CLIENT ALREADY HAS A PENDING OR RECENTLY COMPLETED CHECK-IN
      // Don't send a new check-in if there's already a pending one, or if they completed one in the last 5 days
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const existingRecentCheckins = await database
        .select({ id: checkins.id, status: checkins.status, submittedAt: checkins.submittedAt, sentAt: checkins.sentAt })
        .from(checkins)
        .where(and(
          eq(checkins.clientProtocolId, schedule.clientProtocolId),
          gte(checkins.sentAt, fiveDaysAgo)
        ));
      
      const hasPendingCheckin = existingRecentCheckins.some(c => c.status === 'pending');
      const hasRecentCompletion = existingRecentCheckins.some(c => c.status === 'submitted' || c.status === 'reviewed');
      
      if (hasPendingCheckin) {
        console.log(`${LOG_PREFIX} SKIPPED: Protocol ${schedule.clientProtocolId} (${protocol.clientName}) already has a pending check-in. Not creating another.`);
        // Advance the schedule so we don't keep hitting this
        const clientTimezone = schedule.timezone || 'America/Denver';
        const clientDayOfWeek = schedule.dayOfWeek ?? 4;
        const clientTimeOfDay = schedule.timeOfDay || '10:00';
        const clientFrequency = schedule.frequency || 'weekly';
        const nextScheduledTime = calculateNextScheduledTime(clientDayOfWeek, clientTimeOfDay, clientTimezone, clientFrequency);
        await database.update(checkinSchedules).set({ nextScheduledAt: nextScheduledTime, lastSentAt: now }).where(eq(checkinSchedules.id, schedule.id));
        continue;
      }
      
      if (hasRecentCompletion) {
        console.log(`${LOG_PREFIX} SKIPPED: Protocol ${schedule.clientProtocolId} (${protocol.clientName}) already completed a check-in recently. Not sending another.`);
        const clientTimezone = schedule.timezone || 'America/Denver';
        const clientDayOfWeek = schedule.dayOfWeek ?? 4;
        const clientTimeOfDay = schedule.timeOfDay || '10:00';
        const clientFrequency = schedule.frequency || 'weekly';
        const nextScheduledTime = calculateNextScheduledTime(clientDayOfWeek, clientTimeOfDay, clientTimezone, clientFrequency);
        await database.update(checkinSchedules).set({ nextScheduledAt: nextScheduledTime, lastSentAt: now }).where(eq(checkinSchedules.id, schedule.id));
        continue;
      }
      
      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.email, protocol.clientEmail));
      
      // Calculate week number (createdAt is a string from Drizzle mode:'string')
      const protocolStartDate = protocol.createdAt ? new Date(protocol.createdAt) : new Date();
      const weekNumber = Math.ceil((now.getTime() - protocolStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      // Create the check-in record
      const result = await database.insert(checkins).values({
        clientProtocolId: schedule.clientProtocolId,
        templateId: schedule.templateId,
        status: 'pending',
        weekNumber,
        sentAt: now,
        dueAt: new Date(now.getTime() + 120 * 60 * 60 * 1000), // Due in 120 hours (5 days)
      });
      
      const checkinId = result[0].insertId;
      
      // Send the consolidated check-in email (includes progress tracking from former progressReminderCron)
      if (protocol.clientEmail) {
        const clientName = protocol.clientName || 'Client';
        const checkinUrl = `${process.env.VITE_APP_URL || 'https://peptidecoach.pro'}/checkin/${checkinId}`;
        const dashboardUrl = `${process.env.VITE_APP_URL || 'https://peptidecoach.pro'}/dashboard`;
        
        // Fetch progress tracking data for this user
        let daysSincePhoto: number | null = null;
        let daysSinceNote: number | null = null;
        
        if (user) {
          try {
            const lastPhoto = await database
              .select({ createdAt: progressPhotos.createdAt })
              .from(progressPhotos)
              .where(eq(progressPhotos.userId, user.id))
              .orderBy(desc(progressPhotos.createdAt))
              .limit(1);
            
            const lastNote = await database
              .select({ createdAt: journeyNotes.createdAt })
              .from(journeyNotes)
              .where(eq(journeyNotes.userId, user.id))
              .orderBy(desc(journeyNotes.createdAt))
              .limit(1);
            
            if (lastPhoto[0]?.createdAt) {
              const photoDate = lastPhoto[0].createdAt instanceof Date ? lastPhoto[0].createdAt : new Date(lastPhoto[0].createdAt);
              daysSincePhoto = Math.floor((Date.now() - photoDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            if (lastNote[0]?.createdAt) {
              const noteDate = lastNote[0].createdAt instanceof Date ? lastNote[0].createdAt : new Date(lastNote[0].createdAt);
              daysSinceNote = Math.floor((Date.now() - noteDate.getTime()) / (1000 * 60 * 60 * 24));
            }
          } catch (err) {
            console.log(`${LOG_PREFIX} Could not fetch progress data for ${clientName}:`, err);
          }
        }
        
        // Build progress suggestions
        const suggestions: string[] = [];
        if (daysSincePhoto === null || daysSincePhoto > 14) {
          suggestions.push('📸 Upload a progress photo to track your transformation');
        }
        if (daysSinceNote === null || daysSinceNote > 7) {
          suggestions.push('📝 Log your mood, energy, and sleep quality');
        }
        if (suggestions.length === 0) {
          suggestions.push('✨ Keep up the great work tracking your progress!');
        }
        
        const protocolName = protocol.clientName || 'Health Protocol';
        
        // Use custom subject if configured, otherwise default
        const subject = (customSubject || '📊 Weekly Progress Check-In - {{protocolName}}')
          .replace(/\{\{clientName\}\}/g, clientName)
          .replace(/\{\{protocolName\}\}/g, protocolName)
          .replace(/\{\{coachName\}\}/g, coachName)
          .replace(/\{\{weekNumber\}\}/g, weekNumber.toString());
        
        const body = buildConsolidatedCheckinEmail({
          clientName,
          protocolName,
          checkinUrl,
          dashboardUrl,
          suggestions,
          daysSincePhoto,
          daysSinceNote,
          weekNumber,
          coachName,
          customGreeting: customGreeting || undefined,
          customCtaText: customCtaText || undefined,
        });
        
        await sendCheckinEmail(protocol.clientEmail!, subject, body, checkinId, 'checkin_request', schedule.clientProtocolId);
      }
      
      // Calculate next scheduled time using client's timezone settings
      const clientTimezone = schedule.timezone || 'America/Denver'; // Default to Mountain Time
      const clientDayOfWeek = schedule.dayOfWeek ?? 4; // Default to Thursday
      const clientTimeOfDay = schedule.timeOfDay || '10:00'; // Default to 10 AM
      const clientFrequency = schedule.frequency || 'weekly';
      
      const nextScheduledTime = calculateNextScheduledTime(
        clientDayOfWeek,
        clientTimeOfDay,
        clientTimezone,
        clientFrequency
      );
      
      console.log(`${LOG_PREFIX} Next check-in for protocol ${schedule.clientProtocolId}: ${nextScheduledTime.toISOString()} (${clientTimezone})`);
      
      // Update the schedule
      await database
        .update(checkinSchedules)
        .set({ 
          nextScheduledAt: nextScheduledTime,
          lastSentAt: now,
        })
        .where(eq(checkinSchedules.id, schedule.id));
      
      succeededCount++;
      sentDetails.push(`${protocol.clientName || 'Unknown'} (protocol ${schedule.clientProtocolId})`);
      console.log(`${LOG_PREFIX} Created check-in ${checkinId} for protocol ${schedule.clientProtocolId}`);
    } catch (error) {
      failedCount++;
      console.error(`${LOG_PREFIX} Error processing schedule ${schedule.id}:`, error);
      if (error instanceof Error && error.stack) {
        console.error(`${LOG_PREFIX} Stack trace for schedule ${schedule.id}:`, error.stack);
      }
    }
  }
  
  // Log the cron run
  const runCompletedAt = new Date();
  const runStatus = failedCount > 0 && succeededCount > 0 ? 'partial' : failedCount > 0 ? 'error' : 'success';
  await logCronRun({
    jobName: 'checkin_send',
    status: runStatus,
    startedAt: runStartedAt,
    completedAt: runCompletedAt,
    itemsProcessed: processedCount,
    itemsSucceeded: succeededCount,
    itemsFailed: failedCount,
    errorMessage: failedCount > 0 ? `${failedCount} schedule(s) failed` : undefined,
    details: sentDetails.length > 0 ? JSON.stringify(sentDetails) : undefined,
    triggeredBy: currentTriggerSource,
  });
  
  console.log(`${LOG_PREFIX} Completed scheduled check-in sender (processed: ${processedCount}, succeeded: ${succeededCount}, failed: ${failedCount})`);
}

/**
 * Reminder cron job: Send 24h and 48h reminders
 * Runs every hour
 */
export async function sendCheckinReminders() {
  if (!(await areCheckinsGloballyEnabled())) {
    console.log(`${LOG_PREFIX} Check-ins globally disabled — skipping reminder send.`);
    return;
  }
  console.log(`${LOG_PREFIX} Running check-in reminder sender...`);
  const runStartedAt = new Date();
  let processedCount = 0;
  let succeededCount = 0;
  let failedCount = 0;
  
  const database = await db();
  const now = new Date();
  
  // Get pending check-ins
  const pendingCheckins = await database
    .select()
    .from(checkins)
    .where(eq(checkins.status, 'pending'));
  
  // Get reminder templates (match actual templateType values in database)
  const [reminder24Template] = await database
    .select()
    .from(checkinNotificationTemplates)
    .where(eq(checkinNotificationTemplates.templateType, 'checkin_reminder_24h'));
  
  // Use checkin_reminder_2 as the escalation/48h template
  const [reminder48Template] = await database
    .select()
    .from(checkinNotificationTemplates)
    .where(eq(checkinNotificationTemplates.templateType, 'checkin_reminder_2'));
  
  // Get coach name for template replacement
  const coachName = process.env.OWNER_NAME || 'Your Coach';
  
  for (const checkin of pendingCheckins) {
    processedCount++;
    try {
      const sentAtRaw = checkin.sentAt || checkin.createdAt;
      const sentAt = sentAtRaw instanceof Date ? sentAtRaw : new Date(sentAtRaw);
      if (isNaN(sentAt.getTime())) {
        console.warn(`${LOG_PREFIX} Invalid sentAt date for check-in ${checkin.id}: ${sentAtRaw}`);
        continue;
      }
      const hoursSinceSent = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);
      
      // Get the client protocol
      const [protocol] = await database
        .select()
        .from(clientProtocols)
        .where(eq(clientProtocols.id, checkin.clientProtocolId));
      
      if (!protocol) continue;
      
      // Skip clients with "protocol_only" engagement level — they should not receive reminders
      if (protocol.engagementLevel === 'protocol_only') {
        console.log(`${LOG_PREFIX} Protocol ${checkin.clientProtocolId} (${protocol.clientName || 'Unknown'}) is "Protocol Only" — skipping reminder.`);
        continue;
      }
      
      // Check if we've already sent this reminder
      const existingLogs = await database
        .select()
        .from(checkinNotificationLogs)
        .where(eq(checkinNotificationLogs.checkinId, checkin.id));
      
      const has24hReminder = existingLogs.some(l => l.notificationType === 'reminder_24h');
      const has48hReminder = existingLogs.some(l => l.notificationType === 'reminder_48h');
      
      const clientName = protocol.clientName || 'Client';
      
      // Get configurable reminder escalation hours
      const [reminderSetting] = await database
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'checkin_reminder_escalation_hours'));
      const reminderEscalationHours = reminderSetting?.value ? parseInt(reminderSetting.value) : 48;
      
      const checkinUrl = `${process.env.VITE_APP_URL || ''}/checkin/${checkin.id}`;
      
      // Send 24h reminder (between 24 hours and escalation hours)
      if (hoursSinceSent >= 24 && hoursSinceSent < reminderEscalationHours && !has24hReminder && reminder24Template) {
        const subject = reminder24Template.subject
          .replace(/\{\{clientName\}\}/g, clientName)
          .replace(/\{\{client_name\}\}/g, clientName);
        const body = reminder24Template.bodyHtml
          .replace(/\{\{clientName\}\}/g, clientName)
          .replace(/\{\{client_name\}\}/g, clientName)
          .replace(/\{\{checkinLink\}\}/g, checkinUrl)
          .replace(/\{\{checkin_url\}\}/g, checkinUrl)
          .replace(/\{\{coachName\}\}/g, coachName)
          .replace(/\{\{coach_name\}\}/g, coachName);
        
        await sendCheckinEmail(protocol.clientEmail!, subject, body, checkin.id, 'reminder_24h', checkin.clientProtocolId);
      }
      
      // Send escalation reminder (between escalation hours and 120 hours / 5 days)
      if (hoursSinceSent >= reminderEscalationHours && hoursSinceSent < 120 && !has48hReminder && reminder48Template) {
        const subject = reminder48Template.subject
          .replace(/\{\{clientName\}\}/g, clientName)
          .replace(/\{\{client_name\}\}/g, clientName);
        const body = reminder48Template.bodyHtml
          .replace(/\{\{clientName\}\}/g, clientName)
          .replace(/\{\{client_name\}\}/g, clientName)
          .replace(/\{\{checkinLink\}\}/g, checkinUrl)
          .replace(/\{\{checkin_url\}\}/g, checkinUrl)
          .replace(/\{\{coachName\}\}/g, coachName)
          .replace(/\{\{coach_name\}\}/g, coachName);
        
        await sendCheckinEmail(protocol.clientEmail!, subject, body, checkin.id, 'reminder_48h', checkin.clientProtocolId);
      }
      
      // Mark as incomplete after 120 hours (5 days)
      if (hoursSinceSent >= 120) {
        await database
          .update(checkins)
          .set({ status: 'incomplete' })
          .where(eq(checkins.id, checkin.id));
        
        // Create a task for the coach
        await createFollowUpTask(
          checkin.clientProtocolId,
          `Missed Check-in: Week ${checkin.weekNumber}`,
          `${clientName} did not complete their weekly check-in. Please follow up.`,
          'high'
        );
        
        console.log(`${LOG_PREFIX} Marked check-in ${checkin.id} as incomplete`);
      }
      succeededCount++;
    } catch (error) {
      failedCount++;
      console.error(`${LOG_PREFIX} Error processing reminder for check-in ${checkin.id}:`, error);
    }
  }
  
  // Log the cron run
  const runCompletedAt = new Date();
  await logCronRun({
    jobName: 'checkin_reminders',
    status: failedCount > 0 ? 'partial' : 'success',
    startedAt: runStartedAt,
    completedAt: runCompletedAt,
    itemsProcessed: processedCount,
    itemsSucceeded: succeededCount,
    itemsFailed: failedCount,
    triggeredBy: currentTriggerSource,
  });
  
  console.log(`${LOG_PREFIX} Completed check-in reminder sender`);
}

/**
 * Process submitted check-ins for low scores
 * Runs every hour
 */
export async function processLowScoreAlerts() {
  if (!(await areCheckinsGloballyEnabled())) {
    console.log(`${LOG_PREFIX} Check-ins globally disabled — skipping low-score alerts.`);
    return;
  }
  console.log(`${LOG_PREFIX} Running low score alert processor...`);
  const runStartedAt = new Date();
  let processedCount = 0;
  let succeededCount = 0;
  let failedCount = 0;
  
  const database = await db();
  
  // Get recently submitted check-ins that haven't been processed for alerts
  const recentCheckins = await database
    .select()
    .from(checkins)
    .where(and(
      eq(checkins.status, 'submitted'),
      isNull(checkins.alertProcessedAt)
    ));
  
  for (const checkin of recentCheckins) {
    processedCount++;
    try {
      // Get configurable low score threshold
      const [thresholdSetting] = await database
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'checkin_low_score_threshold'));
      const lowScoreThreshold = thresholdSetting?.value ? parseInt(thresholdSetting.value) : 5;
      
      // Check for low scores (using configurable threshold)
      if (checkin.lowestScore !== null && checkin.lowestScore <= lowScoreThreshold) {
        // Get the client protocol
        const [protocol] = await database
          .select()
          .from(clientProtocols)
          .where(eq(clientProtocols.id, checkin.clientProtocolId));
        
        if (protocol) {
          const clientName = protocol.clientName || 'Client';
          
          // Create a high-priority task
          await createFollowUpTask(
            checkin.clientProtocolId,
            `⚠️ Low Score Alert: ${clientName} - Week ${checkin.weekNumber}`,
            `${clientName} reported a score of ${checkin.lowestScore}/10 on their check-in. Immediate follow-up recommended.`,
            'urgent'
          );
          
          console.log(`${LOG_PREFIX} Created low score alert for check-in ${checkin.id}`);
        }
      }
      
      // Mark as processed
      await database
        .update(checkins)
        .set({ alertProcessedAt: new Date() })
        .where(eq(checkins.id, checkin.id));
      succeededCount++;
    } catch (error) {
      failedCount++;
      console.error(`${LOG_PREFIX} Error processing low score alert for check-in ${checkin.id}:`, error);
    }
  }
  
  // Log the cron run
  const runCompletedAt = new Date();
  await logCronRun({
    jobName: 'checkin_low_scores',
    status: failedCount > 0 ? 'partial' : 'success',
    startedAt: runStartedAt,
    completedAt: runCompletedAt,
    itemsProcessed: processedCount,
    itemsSucceeded: succeededCount,
    itemsFailed: failedCount,
    triggeredBy: currentTriggerSource,
  });
  
  console.log(`${LOG_PREFIX} Completed low score alert processor`);
}

/**
 * Build consolidated check-in email HTML with Omega Longevity branding
 * Combines the check-in form link with progress tracking suggestions (photo, journal)
 * Supports customizable greeting text via site_settings
 * This replaces the separate progressReminderCron email
 */
export function buildConsolidatedCheckinEmail(params: {
  clientName: string;
  protocolName: string;
  checkinUrl: string;
  dashboardUrl: string;
  suggestions: string[];
  daysSincePhoto: number | null;
  daysSinceNote: number | null;
  weekNumber: number;
  coachName: string;
  customGreeting?: string;
  customCtaText?: string;
}): string {
  const { clientName, protocolName, checkinUrl, dashboardUrl, suggestions, daysSincePhoto, daysSinceNote, weekNumber, coachName, customGreeting, customCtaText } = params;
  
  const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
  const storeUrl = `${baseUrl}/order`;
  const launchpadUrl = `${baseUrl}/launchpad`;
  const podcastUrl = 'https://www.youtube.com/@InsideOmega';
  
  // Apply placeholder replacements to custom greeting
  const greeting = (customGreeting || `This is your weekly reminder to track your progress on your {{protocolName}} protocol. Consistent tracking helps you and {{coachName}} see what's working!`)
    .replace(/\{\{clientName\}\}/g, clientName)
    .replace(/\{\{protocolName\}\}/g, protocolName)
    .replace(/\{\{coachName\}\}/g, coachName)
    .replace(/\{\{weekNumber\}\}/g, weekNumber.toString());
  
  const ctaText = customCtaText || 'Complete Your Check-In';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <!-- Branded Header -->
        <div style="text-align: center; margin-bottom: 0;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 16px 16px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
              Weekly Progress Check-In
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
              Week ${weekNumber} &bull; Time to track your health journey!
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; padding: 30px; color: #e2e8f0;">
          
          <!-- Greeting -->
          <p style="font-size: 16px; margin: 0 0 16px; color: #e2e8f0;">
            Hi ${clientName},
          </p>
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
            ${greeting}
          </p>

          <!-- Primary CTA: Complete Check-In -->
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${checkinUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              ${ctaText}
            </a>
          </div>

          <!-- Suggestions Box -->
          <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
            <h3 style="color: #f97316; font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
              This Week's Suggestions
            </h3>
            ${suggestions.map(s => `
              <div style="color: #e2e8f0; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #334155;">
                ${s}
              </div>
            `).join('')}
          </div>

          <!-- Stats -->
          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="flex: 1; background: #0f172a; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #334155;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px;">Last Photo</p>
              <p style="color: #f8fafc; font-size: 16px; font-weight: 600; margin: 0;">
                ${daysSincePhoto !== null ? `${daysSincePhoto} days ago` : 'Never'}
              </p>
            </div>
            <div style="flex: 1; background: #0f172a; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #334155;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px;">Last Journal</p>
              <p style="color: #f8fafc; font-size: 16px; font-weight: 600; margin: 0;">
                ${daysSinceNote !== null ? `${daysSinceNote} days ago` : 'Never'}
              </p>
            </div>
          </div>

          <!-- Secondary CTA: Dashboard -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${dashboardUrl}" 
               style="display: inline-block; background: transparent; color: #f97316; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; border: 1px solid #f97316;">
              Open My Dashboard
            </a>
          </div>

          <!-- Explore Section -->
          <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
            <h3 style="color: #f97316; font-size: 14px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 0.5px;">Explore</h3>
            <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #334155;">
              <a href="${storeUrl}" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Store</a>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Browse peptides and supplements</p>
            </div>
            <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #334155;">
              <a href="${launchpadUrl}" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Coaching &amp; Programs</a>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Your central hub for all Omega resources</p>
            </div>
            <div>
              <a href="${podcastUrl}" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Inside Omega Podcast</a>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Listen to Jason &amp; Lane discuss health optimization</p>
            </div>
          </div>

          <!-- Support -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #334155;">
            <p style="color: #94a3b8; margin: 0; font-size: 13px;">
              Questions? Contact us at <a href="mailto:omega@omegalongevity.com" style="color: #f97316;">omega@omegalongevity.com</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #0f172a; border-radius: 0 0 16px 16px; text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
          <p style="margin: 0 0 8px;">
            Omega Longevity<br>
            1098 W. South Jordan Pkwy #106, South Jordan, UT 84095
          </p>
          <p style="margin: 0; color: #475569;">
            You're receiving this because you're enrolled in a health optimization protocol.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Initialize all check-in cron jobs
 */
export function initCheckinCron() {
  if (process.env.CHECKIN_ENABLED === 'false') {
    console.log(`${LOG_PREFIX} DISABLED — set CHECKIN_ENABLED=true to re-enable`);
    return;
  }

  console.log(`${LOG_PREFIX} Initializing check-in cron jobs...`);
  
  let startupScanCompleted = false;
  let startupRetryCount = 0;
  const MAX_STARTUP_RETRIES = 5;
  
  // Send scheduled check-ins - check every 5 minutes
  setInterval(async () => {
    try {
      currentTriggerSource = 'cron';
      await sendScheduledCheckins();
      if (!startupScanCompleted) {
        startupScanCompleted = true;
        console.log(`${LOG_PREFIX} Startup scan recovered via interval run`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in sendScheduledCheckins:`, error);
    }
  }, 5 * 60 * 1000);
  
  // Send reminders - every 30 minutes
  setInterval(async () => {
    try {
      currentTriggerSource = 'cron';
      await sendCheckinReminders();
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in sendCheckinReminders:`, error);
    }
  }, 30 * 60 * 1000);
  
  // Process low score alerts - every 15 minutes
  setInterval(async () => {
    try {
      currentTriggerSource = 'cron';
      await processLowScoreAlerts();
    } catch (error) {
      console.error(`${LOG_PREFIX} Error in processLowScoreAlerts:`, error);
    }
  }, 15 * 60 * 1000);
  
  // Run initial check on startup with retry logic
  async function runStartupScan() {
    try {
      console.log(`${LOG_PREFIX} Running initial check-in scan on startup (attempt ${startupRetryCount + 1}/${MAX_STARTUP_RETRIES})...`);
      currentTriggerSource = 'startup';
      await sendScheduledCheckins();
      await sendCheckinReminders();
      await processLowScoreAlerts();
      startupScanCompleted = true;
      console.log(`${LOG_PREFIX} Startup scan completed successfully`);
    } catch (error) {
      startupRetryCount++;
      console.error(`${LOG_PREFIX} Error in startup scan (attempt ${startupRetryCount}/${MAX_STARTUP_RETRIES}):`, error);
      
      if (startupRetryCount < MAX_STARTUP_RETRIES) {
        const retryDelay = 30 * 1000 * Math.pow(2, startupRetryCount - 1);
        console.log(`${LOG_PREFIX} Retrying startup scan in ${retryDelay / 1000}s...`);
        setTimeout(runStartupScan, retryDelay);
      } else {
        console.error(`${LOG_PREFIX} CRITICAL: Startup scan failed after ${MAX_STARTUP_RETRIES} attempts. Check-ins will still run via the 5-minute interval.`);
      }
    }
  }
  
  // Start the initial scan after 30 second delay to let DB connect
  setTimeout(runStartupScan, 30 * 1000);
  
  console.log(`${LOG_PREFIX} Check-in cron jobs initialized`);
  console.log(`${LOG_PREFIX} - Scheduled check-ins: Every 5 minutes (respects per-client schedules)`);
  console.log(`${LOG_PREFIX} - Reminders: Every 30 minutes`);
  console.log(`${LOG_PREFIX} - Low score alerts: Every 15 minutes`);
  console.log(`${LOG_PREFIX} - Startup scan: With retry (up to ${MAX_STARTUP_RETRIES} attempts with exponential backoff)`);
}

/**
 * Manual trigger: Run all check-in jobs immediately (called from admin UI)
 * Returns a summary of what was processed
 */
export async function manualTriggerCheckins(): Promise<{
  success: boolean;
  message: string;
  schedulesProcessed: number;
  checkinsSent: number;
  remindersProcessed: number;
  alertsProcessed: number;
}> {
  console.log(`${LOG_PREFIX} MANUAL TRIGGER: Admin initiated check-in send`);

  if (!(await areCheckinsGloballyEnabled())) {
    console.log(`${LOG_PREFIX} MANUAL TRIGGER blocked — check-ins are globally disabled.`);
    return {
      success: false,
      message: 'Check-ins are globally disabled. Enable them in Check-In settings before sending.',
      schedulesProcessed: 0,
      checkinsSent: 0,
      remindersProcessed: 0,
      alertsProcessed: 0,
    };
  }

  const previousSource = currentTriggerSource;
  currentTriggerSource = 'manual';

  try {
    // Get counts before running
    const database = await db();
    const now = new Date();
    
    const overdueSchedules = await database
      .select({ id: checkinSchedules.id })
      .from(checkinSchedules)
      .where(and(
        eq(checkinSchedules.isEnabled, true),
        eq(checkinSchedules.isPaused, false),
        lte(checkinSchedules.nextScheduledAt, now),
        or(
          isNull(checkinSchedules.skipUntil),
          lte(checkinSchedules.skipUntil, now)
        )
      ));
    
    const pendingCheckins = await database
      .select({ id: checkins.id })
      .from(checkins)
      .where(eq(checkins.status, 'pending'));
    
    const unprocessedAlerts = await database
      .select({ id: checkins.id })
      .from(checkins)
      .where(and(
        eq(checkins.status, 'submitted'),
        isNull(checkins.alertProcessedAt)
      ));
    
    // Run all jobs
    await sendScheduledCheckins();
    await sendCheckinReminders();
    await processLowScoreAlerts();
    
    const message = `Manual trigger complete: ${overdueSchedules.length} overdue schedules processed, ${pendingCheckins.length} pending check-ins checked for reminders, ${unprocessedAlerts.length} submitted check-ins checked for alerts.`;
    console.log(`${LOG_PREFIX} ${message}`);
    
    return {
      success: true,
      message,
      schedulesProcessed: overdueSchedules.length,
      checkinsSent: overdueSchedules.length,
      remindersProcessed: pendingCheckins.length,
      alertsProcessed: unprocessedAlerts.length,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${LOG_PREFIX} MANUAL TRIGGER ERROR:`, error);
    return {
      success: false,
      message: `Manual trigger failed: ${errorMsg}`,
      schedulesProcessed: 0,
      checkinsSent: 0,
      remindersProcessed: 0,
      alertsProcessed: 0,
    };
  } finally {
    currentTriggerSource = previousSource;
  }
}

/**
 * Get cron health status for admin dashboard
 */
export async function getCronHealthStatus() {
  const database = await db();
  
  // Get the last run for each job type
  const jobNames = ['checkin_send', 'checkin_reminders', 'checkin_low_scores'];
  const jobs: Array<{
    jobName: string;
    lastRun: Date | null;
    lastStatus: string | null;
    lastDurationMs: number | null;
    lastItemsProcessed: number | null;
    lastItemsSucceeded: number | null;
    lastItemsFailed: number | null;
    lastTriggeredBy: string | null;
    lastErrorMessage: string | null;
    recentFailures: number;
  }> = [];
  
  for (const jobName of jobNames) {
    // Get last run
    const [lastRun] = await database
      .select()
      .from(cronRuns)
      .where(eq(cronRuns.jobName, jobName))
      .orderBy(desc(cronRuns.startedAt))
      .limit(1);
    
    // Count failures in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failureRows = await database
      .select({ count: sql<number>`count(*)` })
      .from(cronRuns)
      .where(and(
        eq(cronRuns.jobName, jobName),
        eq(cronRuns.status, 'error'),
        gte(cronRuns.startedAt, oneDayAgo)
      ));
    const recentFailures = failureRows[0]?.count || 0;
    
    jobs.push({
      jobName,
      lastRun: lastRun?.startedAt || null,
      lastStatus: lastRun?.status || null,
      lastDurationMs: lastRun?.durationMs || null,
      lastItemsProcessed: lastRun?.itemsProcessed || null,
      lastItemsSucceeded: lastRun?.itemsSucceeded || null,
      lastItemsFailed: lastRun?.itemsFailed || null,
      lastTriggeredBy: lastRun?.triggeredBy || null,
      lastErrorMessage: lastRun?.errorMessage || null,
      recentFailures,
    });
  }
  
  // Get next scheduled check-in time
  const [nextSchedule] = await database
    .select({
      nextScheduledAt: checkinSchedules.nextScheduledAt,
      clientProtocolId: checkinSchedules.clientProtocolId,
    })
    .from(checkinSchedules)
    .where(and(
      eq(checkinSchedules.isEnabled, true),
      eq(checkinSchedules.isPaused, false)
    ))
    .orderBy(asc(checkinSchedules.nextScheduledAt))
    .limit(1);
  
  // Get total active schedules count
  const activeCountRows = await database
    .select({ count: sql<number>`count(*)` })
    .from(checkinSchedules)
    .where(and(
      eq(checkinSchedules.isEnabled, true),
      eq(checkinSchedules.isPaused, false)
    ));
  const activeScheduleCount = activeCountRows[0]?.count || 0;
  
  // Get recent run history (last 20 runs across all jobs)
  const recentRuns = await database
    .select()
    .from(cronRuns)
    .orderBy(desc(cronRuns.startedAt))
    .limit(20);
  
  return {
    jobs,
    nextScheduledCheckin: nextSchedule?.nextScheduledAt || null,
    activeScheduleCount,
    recentRuns,
  };
}
