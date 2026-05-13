/**
 * Session Reminder Cron Job
 * Sends automated reminder emails 24 hours before scheduled coaching sessions
 * Schedule: Runs every hour to check for upcoming sessions
 */

import { getDb } from "../db";
import { appointments, appointmentTypes, emailTracking } from "../../drizzle/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

const getTransporter = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort || "587"),
    secure: smtpPort === "465",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

let cronInterval: NodeJS.Timeout | null = null;
let lastCronRunData: { timestamp: string; sent: number; failed: number } | null = null;

/**
 * Generate HTML email template for session reminder
 */
function generateSessionReminderHTML(params: {
  clientName: string;
  sessionType: string;
  sessionDate: string;
  sessionTime: string;
  duration: number;
  meetingLink?: string;
  coachNotes?: string;
  trackingId: string;
  trackingBaseUrl: string;
}): string {
  const {
    clientName,
    sessionType,
    sessionDate,
    sessionTime,
    duration,
    meetingLink,
    coachNotes,
    trackingId,
    trackingBaseUrl,
  } = params;

  const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
  const storeUrl = `${baseUrl}/order`;
  const launchpadUrl = `${baseUrl}/launchpad`;
  const podcastUrl = 'https://www.youtube.com/@InsideOmega';
  const trackingPixel = `<img src="${trackingBaseUrl}/api/track/open/${trackingId}" width="1" height="1" style="display:none;" alt="" />`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
<div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

<!-- Header with Logo -->
<div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Session Reminder</h1>
  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your coaching session is tomorrow!</p>
</div>

<!-- Main Content -->
<div style="background-color: #1e293b; padding: 30px; color: #e2e8f0;">
  <p style="font-size: 16px; margin: 0 0 16px; color: #e2e8f0;">Hi ${clientName},</p>
  <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">This is a friendly reminder that you have a coaching session scheduled for <strong style="color: #f8fafc;">tomorrow</strong>. Please make sure you're prepared and in a quiet space for our call.</p>

  <!-- Session Details Card -->
  <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
    <h3 style="color: #f97316; font-size: 14px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Session Details</h3>
    <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
      <span style="color: #94a3b8; font-size: 13px;">Session Type</span><br>
      <span style="color: #f8fafc; font-size: 15px; font-weight: 600;">${sessionType}</span>
    </div>
    <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
      <span style="color: #94a3b8; font-size: 13px;">Date</span><br>
      <span style="color: #f8fafc; font-size: 15px; font-weight: 600;">${sessionDate}</span>
    </div>
    <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
      <span style="color: #94a3b8; font-size: 13px;">Time</span><br>
      <span style="color: #f8fafc; font-size: 15px; font-weight: 600;">${sessionTime}</span>
    </div>
    <div style="padding: 10px 0;">
      <span style="color: #94a3b8; font-size: 13px;">Duration</span><br>
      <span style="color: #f8fafc; font-size: 15px; font-weight: 600;">${duration} minutes</span>
    </div>
  </div>

  ${meetingLink ? `
  <!-- Meeting Link Button -->
  <div style="text-align: center; margin: 28px 0;">
    <a href="${meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">Join Video Call</a>
  </div>
  ` : ''}

  ${coachNotes ? `
  <!-- Coach Notes -->
  <div style="background: rgba(249, 115, 22, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid rgba(249, 115, 22, 0.3);">
    <h4 style="color: #f97316; margin: 0 0 8px; font-size: 14px; font-weight: 600;">Notes from Your Coach</h4>
    <p style="color: #e2e8f0; margin: 0; font-size: 14px; line-height: 1.5;">${coachNotes}</p>
  </div>
  ` : ''}

  <!-- Preparation Tips -->
  <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
    <h3 style="color: #f97316; font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">How to Prepare</h3>
    <div style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">\u2705 Find a quiet, private space for our call</div>
    <div style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">\u2705 Have your questions and notes ready</div>
    <div style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">\u2705 Test your internet connection and camera</div>
    <div style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">\u2705 Have a glass of water nearby</div>
  </div>

  <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">If you need to reschedule, please let us know as soon as possible. We look forward to speaking with you!</p>

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
    <p style="color: #94a3b8; margin: 0; font-size: 13px;">Questions? Contact us at <a href="mailto:omega@omegalongevity.com" style="color: #f97316;">omega@omegalongevity.com</a></p>
  </div>
</div>

<!-- Footer -->
<div style="background-color: #0f172a; border-radius: 0 0 16px 16px; text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
  <p style="margin: 0 0 8px;">Omega Longevity<br>1098 W. South Jordan Pkwy #106, South Jordan, UT 84095</p>
  <p style="margin: 0; color: #475569;">Your Partner in Health Optimization</p>
</div>

</div>
${trackingPixel}
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email for session reminder
 */
function generateSessionReminderText(params: {
  clientName: string;
  sessionType: string;
  sessionDate: string;
  sessionTime: string;
  duration: number;
  meetingLink?: string;
  coachNotes?: string;
}): string {
  const { clientName, sessionType, sessionDate, sessionTime, duration, meetingLink, coachNotes } = params;

  let text = `
SESSION REMINDER - Your Coaching Session is Tomorrow!

Hi ${clientName},

This is a friendly reminder that you have a coaching session scheduled for tomorrow.

SESSION DETAILS:
- Session Type: ${sessionType}
- Date: ${sessionDate}
- Time: ${sessionTime}
- Duration: ${duration} minutes
`;

  if (meetingLink) {
    text += `\nJoin Video Call: ${meetingLink}\n`;
  }

  if (coachNotes) {
    text += `\nNOTES FROM YOUR COACH:\n${coachNotes}\n`;
  }

  text += `
HOW TO PREPARE:
- Find a quiet, private space for our call
- Have your questions and notes ready
- Test your internet connection and camera
- Have a glass of water nearby

If you need to reschedule, please let us know as soon as possible.

We look forward to speaking with you!

---
Omega Longevity | Your Partner in Health Optimization
Questions? Email us at omega@omegalongevity.com
  `.trim();

  return text;
}

/**
 * Generate 1-hour reminder HTML email template
 */
function generate1HourReminderHTML(params: {
  clientName: string;
  sessionType: string;
  sessionTime: string;
  duration: number;
  meetingLink?: string;
  trackingId: string;
  trackingBaseUrl: string;
}): string {
  const { clientName, sessionType, sessionTime, duration, meetingLink, trackingId, trackingBaseUrl } = params;
  const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
  const trackingPixel = `<img src="${trackingBaseUrl}/api/track/open/${trackingId}" width="1" height="1" style="display:none;" alt="" />`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Starting Soon</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
<div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

<!-- Header with Logo -->
<div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Starting in 1 Hour!</h1>
  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your coaching session is coming up soon</p>
</div>

<!-- Main Content -->
<div style="background-color: #1e293b; padding: 30px; color: #e2e8f0;">
  <p style="font-size: 16px; margin: 0 0 16px; color: #e2e8f0;">Hi ${clientName},</p>
  <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">Just a quick reminder - your <strong style="color: #f8fafc;">${sessionType}</strong> session starts in <strong style="color: #f8fafc;">1 hour</strong> at <strong style="color: #f8fafc;">${sessionTime}</strong>.</p>

  <!-- Quick Checklist -->
  <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
    <h3 style="color: #f97316; font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Quick Checklist</h3>
    <div style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">\u2705 Find a quiet, private space</div>
    <div style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">\u2705 Have your notes and questions ready</div>
    <div style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">\u2705 Test your camera and microphone</div>
    <div style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">\u2705 Close unnecessary browser tabs</div>
  </div>

  ${meetingLink ? `
  <!-- Meeting Link Button -->
  <div style="text-align: center; margin: 28px 0;">
    <a href="${meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">Join Video Call Now</a>
  </div>
  ` : ''}

  <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">See you soon!</p>
</div>

<!-- Footer -->
<div style="background-color: #0f172a; border-radius: 0 0 16px 16px; text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
  <p style="margin: 0 0 8px;">Omega Longevity<br>1098 W. South Jordan Pkwy #106, South Jordan, UT 84095</p>
  <p style="margin: 0; color: #475569;">Your Partner in Health Optimization</p>
</div>

</div>
${trackingPixel}
</body>
</html>
  `.trim();
}

/**
 * Generate 1-hour reminder plain text email
 */
function generate1HourReminderText(params: {
  clientName: string;
  sessionType: string;
  sessionTime: string;
  duration: number;
  meetingLink?: string;
}): string {
  const { clientName, sessionType, sessionTime, meetingLink } = params;
  let text = `
SESSION STARTING IN 1 HOUR!

Hi ${clientName},

Just a quick reminder - your ${sessionType} session starts in 1 hour at ${sessionTime}.

QUICK CHECKLIST:
- Find a quiet, private space
- Have your notes and questions ready
- Test your camera and microphone
- Close unnecessary browser tabs
`;
  if (meetingLink) {
    text += `\nJoin Video Call: ${meetingLink}\n`;
  }
  text += `\nSee you soon!\n\n---\nOmega Longevity | Your Partner in Health Optimization`;
  return text.trim();
}

/**
 * Process 1-hour session reminders
 */
export async function process1HourReminders(): Promise<{ sent: number; failed: number }> {
  console.log("[Session Reminder Cron] Checking for 1-hour reminders...");

  const oneHourRemindersEnabled = await db.getSiteSetting("session_1h_reminders_enabled");
  if (oneHourRemindersEnabled === "false") {
    console.log("[Session Reminder Cron] 1-hour reminders are disabled. Skipping.");
    return { sent: 0, failed: 0 };
  }

  const database = await getDb();
  if (!database) {
    console.error("[Session Reminder Cron] Database not available");
    return { sent: 0, failed: 0 };
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";
  const baseUrl = process.env.VITE_APP_URL || "https://peptidecoach.pro";

  const now = new Date();
  const windowStart = new Date(now.getTime() + 50 * 60 * 1000); // 50 minutes from now
  const windowEnd = new Date(now.getTime() + 70 * 60 * 1000); // 70 minutes from now

  let remindersSent = 0;
  let remindersFailed = 0;

  try {
    const upcomingAppointments = await database
      .select({ appointment: appointments, appointmentType: appointmentTypes })
      .from(appointments)
      .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
      .where(
        and(
          gte(appointments.startTime, windowStart),
          lte(appointments.startTime, windowEnd),
          eq(appointments.status, "scheduled"),
          isNull(appointments.reminder1hSent)
        )
      );

    console.log(`[Session Reminder Cron] Found ${upcomingAppointments.length} appointments needing 1h reminders`);

    for (const { appointment, appointmentType } of upcomingAppointments) {
      try {
        const sessionTime = new Date(appointment.startTime).toLocaleTimeString("en-US", { timeZone: 'America/Denver',
          hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
        });
        const trackingId = `sr1h_${appointment.id}_${uuidv4().slice(0, 8)}`;

        try {
          await database.insert(emailTracking).values({
            trackingId,
            emailType: "session_reminder",
            recipientEmail: appointment.clientEmail,
            recipientName: appointment.clientName,
            subject: "Session Starting in 1 Hour",
          });
        } catch (trackingError) {
          console.error(`[Session Reminder] Failed to create 1h tracking record:`, trackingError);
        }

        const htmlContent = generate1HourReminderHTML({
          clientName: appointment.clientName,
          sessionType: appointmentType?.name || "Coaching Session",
          sessionTime,
          duration: appointmentType?.duration || 60,
          meetingLink: appointment.meetingLink || undefined,
          trackingId,
          trackingBaseUrl: baseUrl,
        });

        const textContent = generate1HourReminderText({
          clientName: appointment.clientName,
          sessionType: appointmentType?.name || "Coaching Session",
          sessionTime,
          duration: appointmentType?.duration || 60,
          meetingLink: appointment.meetingLink || undefined,
        });

        if (!transporter) {
          console.log(`[Session Reminder] Simulated 1h reminder for ${appointment.clientName}`);
        } else {
          await transporter.sendMail({
            from: smtpFrom,
            to: appointment.clientEmail,
            subject: `⏰ Starting in 1 Hour: ${appointmentType?.name || "Coaching Session"}`,
            html: htmlContent,
            text: textContent,
          });
          console.log(`[Session Reminder] Sent 1h reminder to ${appointment.clientEmail}`);
        }

        await database.update(appointments).set({ reminder1hSent: new Date() }).where(eq(appointments.id, appointment.id));
        remindersSent++;
      } catch (error) {
        console.error(`[Session Reminder] Failed to send 1h reminder for appointment ${appointment.id}:`, error);
        remindersFailed++;
      }
    }
  } catch (error) {
    console.error("[Session Reminder Cron] Error processing 1h reminders:", error);
  }

  console.log(`[Session Reminder Cron] 1h reminders - Sent: ${remindersSent}, Failed: ${remindersFailed}`);
  return { sent: remindersSent, failed: remindersFailed };
}

/**
 * Process session reminders - finds appointments 24 hours away and sends reminders
 */
export async function processSessionReminders(): Promise<{ sent: number; failed: number }> {
  console.log("[Session Reminder Cron] Starting session reminder check...");

  // Check if session reminders are globally enabled
  const sessionRemindersEnabled = await db.getSiteSetting("session_reminders_enabled");
  if (sessionRemindersEnabled === "false") {
    console.log("[Session Reminder Cron] Session reminders are disabled globally. Skipping.");
    return { sent: 0, failed: 0 };
  }

  const database = await getDb();
  if (!database) {
    console.error("[Session Reminder Cron] Database not available");
    return { sent: 0, failed: 0 };
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";
  const baseUrl = process.env.VITE_APP_URL || "https://peptidecoach.pro";

  // Calculate the 24-hour window (23-25 hours from now to account for cron timing)
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours from now

  let remindersSent = 0;
  let remindersFailed = 0;

  try {
    // Find appointments in the 24-hour window that haven't received a reminder
    const upcomingAppointments = await database
      .select({
        appointment: appointments,
        appointmentType: appointmentTypes,
      })
      .from(appointments)
      .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
      .where(
        and(
          gte(appointments.startTime, windowStart),
          lte(appointments.startTime, windowEnd),
          eq(appointments.status, "scheduled"),
          isNull(appointments.reminder24hSent)
        )
      );

    console.log(`[Session Reminder Cron] Found ${upcomingAppointments.length} appointments needing 24h reminders`);

    for (const { appointment, appointmentType } of upcomingAppointments) {
      try {
        // Format date and time
        const sessionDate = new Date(appointment.startTime).toLocaleDateString("en-US", { timeZone: 'America/Denver',
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const sessionTime = new Date(appointment.startTime).toLocaleTimeString("en-US", { timeZone: 'America/Denver',
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZoneName: "short",
        });

        // Generate tracking ID
        const trackingId = `sr_${appointment.id}_${uuidv4().slice(0, 8)}`;

        // Store tracking record
        try {
          await database.insert(emailTracking).values({
            trackingId,
            emailType: "session_reminder",
            recipientEmail: appointment.clientEmail,
            recipientName: appointment.clientName,
            subject: "Session Reminder - Tomorrow",
          });
        } catch (trackingError) {
          console.error(`[Session Reminder] Failed to create tracking record:`, trackingError);
        }

        const htmlContent = generateSessionReminderHTML({
          clientName: appointment.clientName,
          sessionType: appointmentType?.name || "Coaching Session",
          sessionDate,
          sessionTime,
          duration: appointmentType?.duration || 60,
          meetingLink: appointment.meetingLink || undefined,
          coachNotes: appointment.notes || undefined,
          trackingId,
          trackingBaseUrl: baseUrl,
        });

        const textContent = generateSessionReminderText({
          clientName: appointment.clientName,
          sessionType: appointmentType?.name || "Coaching Session",
          sessionDate,
          sessionTime,
          duration: appointmentType?.duration || 60,
          meetingLink: appointment.meetingLink || undefined,
          coachNotes: appointment.notes || undefined,
        });

        if (!transporter) {
          console.log(`[Session Reminder] Simulated reminder for ${appointment.clientName} - ${sessionDate} ${sessionTime}`);
        } else {
          await transporter.sendMail({
            from: smtpFrom,
            to: appointment.clientEmail,
            subject: `🗓️ Session Reminder: ${appointmentType?.name || "Coaching Session"} Tomorrow`,
            html: htmlContent,
            text: textContent,
          });
          console.log(`[Session Reminder] Sent reminder to ${appointment.clientEmail} for ${sessionDate}`);
        }

        // Mark reminder as sent
        await database
          .update(appointments)
          .set({ reminder24hSent: new Date() })
          .where(eq(appointments.id, appointment.id));

        remindersSent++;
      } catch (error) {
        console.error(`[Session Reminder] Failed to send reminder for appointment ${appointment.id}:`, error);
        remindersFailed++;
      }
    }
  } catch (error) {
    console.error("[Session Reminder Cron] Error processing reminders:", error);
  }

  lastCronRunData = {
    timestamp: new Date().toISOString(),
    sent: remindersSent,
    failed: remindersFailed,
  };

  console.log(`[Session Reminder Cron] Completed - Sent: ${remindersSent}, Failed: ${remindersFailed}`);
  return { sent: remindersSent, failed: remindersFailed };
}

/**
 * Initialize the session reminder cron job
 * Runs every hour to check for appointments 24 hours away
 */
export function initSessionReminderCron(): void {
  if (cronInterval) {
    console.log("[Session Reminder Cron] Already running, skipping initialization");
    return;
  }

  console.log("[Session Reminder Cron] Initialized - checking every hour");

  // Run every 15 minutes to catch both 24h and 1h reminders
  cronInterval = setInterval(async () => {
    await processSessionReminders();
    await process1HourReminders();
  }, 15 * 60 * 1000); // Every 15 minutes

  // Also run immediately on startup (after a short delay)
  setTimeout(async () => {
    await processSessionReminders();
    await process1HourReminders();
  }, 30000); // 30 second delay on startup
}

/**
 * Stop the session reminder cron job
 */
export function stopSessionReminderCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[Session Reminder Cron] Stopped");
  }
}

/**
 * Manually trigger the session reminder job
 */
export async function triggerSessionReminderJob(): Promise<{ sent: number; failed: number }> {
  return processSessionReminders();
}

/**
 * Get the last cron run data
 */
export function getLastSessionReminderCronRun(): { timestamp: string; sent: number; failed: number } | null {
  return lastCronRunData;
}
