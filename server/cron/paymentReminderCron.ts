/**
 * Payment Reminder Cron Job
 * Sends payment reminders to clients with pending payments
 * Schedule: Runs daily at 9:00 AM
 * 
 * Reminder Schedule:
 * - Day 3: First gentle reminder
 * - Day 7: Second reminder with more urgency
 * - Day 14: Final reminder before potential deactivation
 */

import * as db from "../db";
import nodemailer from "nodemailer";
import { isStaging } from "../_core/appEnv";
import { runCronJob } from "./cronRunner";
import {
  generatePaymentReminderHTML,
  generatePaymentReminderText,
} from "../emailTemplates/paymentReminder";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { emailTracking, pendingVenmoPayments, transformationEnrollments } from "../../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

const getTransporter = () => {
  // Staging seal: never send real email from a test environment, even via a
  // manual/admin trigger that bypasses the boot-time cron skip.
  if (isStaging()) return null;

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

const CRON_HOUR = 9;
const CRON_MINUTE = 0;
let cronInterval: NodeJS.Timeout | null = null;
let lastRunDate: string | null = null;

// Default reminder schedule: days after protocol sent when reminders should be sent
// These can be overridden by site settings
const DEFAULT_REMINDER_DAYS = [3, 7, 14];

// Function to get custom reminder days from settings
async function getReminderDays(): Promise<number[]> {
  try {
    const day1 = await db.getSiteSetting("payment_reminder_day_1");
    const day2 = await db.getSiteSetting("payment_reminder_day_2");
    const day3 = await db.getSiteSetting("payment_reminder_day_3");
    
    const reminderDays = [
      day1 ? parseInt(day1) : DEFAULT_REMINDER_DAYS[0],
      day2 ? parseInt(day2) : DEFAULT_REMINDER_DAYS[1],
      day3 ? parseInt(day3) : DEFAULT_REMINDER_DAYS[2],
    ];
    
    // Validate and sort
    return reminderDays.filter(d => !isNaN(d) && d > 0 && d <= 30).sort((a, b) => a - b);
  } catch (error) {
    console.error("[Payment Reminder] Error fetching custom reminder days, using defaults:", error);
    return DEFAULT_REMINDER_DAYS;
  }
}

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

// Store last cron run data
let lastCronRunData: { timestamp: string; sent: number; failed: number } | null = null;

import { calculateProtocolTotalById as calculateProtocolTotal } from "../lib/protocolTotal";

/**
 * Get the appropriate reminder message based on days overdue
 */
function getReminderUrgency(daysOverdue: number): { level: 'gentle' | 'moderate' | 'urgent'; message: string } {
  if (daysOverdue >= 14) {
    return {
      level: 'urgent',
      message: 'This is your final reminder. Your protocol access may be deactivated if payment is not received soon.'
    };
  } else if (daysOverdue >= 7) {
    return {
      level: 'moderate',
      message: 'Your payment is now 7 days overdue. Please complete your payment to avoid any interruption to your protocol.'
    };
  } else {
    return {
      level: 'gentle',
      message: 'This is a friendly reminder that your protocol payment is still pending.'
    };
  }
}

async function runPaymentReminderJob(): Promise<void> {
  try {
    console.log("[Payment Reminder Cron] Starting payment reminder check...");

    // Check if payment reminders are globally enabled
    const paymentRemindersEnabled = await db.getSiteSetting("payment_reminders_enabled");
    if (paymentRemindersEnabled === "false") {
      console.log("[Payment Reminder Cron] Payment reminders are disabled globally. Skipping.");
      return;
    }

    // Get custom reminder days from settings
    const REMINDER_DAYS = await getReminderDays();
    console.log(`[Payment Reminder Cron] Using reminder schedule: Day ${REMINDER_DAYS.join(", Day ")}`);

    const protocols = await db.getAllClientProtocols("all");
    const now = new Date();
    const transporter = getTransporter();
    const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";
    const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';

    let remindersSent = 0;
    let remindersFailed = 0;

    for (const protocol of protocols) {
      // Only process pending payments
      if (protocol.paymentStatus !== "pending") {
        continue;
      }

      // CRITICAL: Only send reminders for protocols that were actually SENT to the client
      // Skip drafts - they haven't been sent yet
      if (protocol.status === "draft") {
        continue;
      }

      // Skip if protocol was never sent (sentAt is null)
      if (!protocol.sentAt) {
        continue;
      }

      // Skip if protocol is already active (fully paid and in use)
      if (protocol.status === "active") {
        continue;
      }

      // Skip if no email
      if (!protocol.clientEmail) {
        continue;
      }

      // Skip if client has opted out of payment reminders
      if ((protocol as any).paymentReminderOptOut) {
        continue;
      }

      // CRITICAL: Skip if protocol is linked to a transformation enrollment that has progressed
      // past the initial stages (already paid coaching fee, in fulfillment, etc.)
      try {
        const database = await getDb();
        if (database) {
          const linkedEnrollment = await database
            .select({ id: transformationEnrollments.id })
            .from(transformationEnrollments)
            .where(
              and(
                eq(transformationEnrollments.clientProtocolId, protocol.id),
                inArray(transformationEnrollments.status, [
                  'coaching_paid', 'intake_complete', 'discovery_scheduled', 'discovery_complete',
                  'protocol_preparing', 'protocol_review', 'protocol_paid', 'launched', 'fulfillment',
                  'shipped', 'delivered', 'training_scheduled', 'training_complete',
                  'active', 'week3_review', 'month2', 'month3_final', 'completed', 'renewed'
                ])
              )
            )
            .limit(1);
          
          if (linkedEnrollment.length > 0) {
            console.log(`[Payment Reminder Cron] Skipping ${protocol.clientName} - linked to active transformation enrollment (protocol ${protocol.id})`);
            continue;
          }
        }
      } catch (enrollmentCheckError) {
        console.error(`[Payment Reminder Cron] Error checking transformation enrollment for protocol ${protocol.id}:`, enrollmentCheckError);
      }

      // CRITICAL: Skip if client has already submitted a Venmo payment that is pending verification
      // This prevents sending "please pay" reminders to clients who already paid via Venmo
      // but whose payment hasn't been verified by admin yet
      if (protocol.paymentMethod === "venmo") {
        try {
          const database = await getDb();
          if (database) {
            const pendingVenmoSubmission = await database
              .select({ id: pendingVenmoPayments.id })
              .from(pendingVenmoPayments)
              .where(
                and(
                  eq(pendingVenmoPayments.clientProtocolId, protocol.id),
                  inArray(pendingVenmoPayments.status, ["pending", "confirmed"])
                )
              )
              .limit(1);
            
            if (pendingVenmoSubmission.length > 0) {
              console.log(`[Payment Reminder Cron] Skipping ${protocol.clientName} - Venmo payment already submitted and awaiting verification (protocol ${protocol.id})`);
              continue;
            }
          }
        } catch (venmoCheckError) {
          console.error(`[Payment Reminder Cron] Error checking Venmo submission for protocol ${protocol.id}:`, venmoCheckError);
          // On error, err on the side of NOT sending the reminder
          continue;
        }
      }

      // Calculate days since protocol was SENT (not created)
      // This ensures reminders are based on when client actually received the protocol
      const sentDate = protocol.sentAt ? new Date(protocol.sentAt) : null;
      if (!sentDate) continue;

      const daysSinceSent = Math.floor(
        (now.getTime() - sentDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Check if we should send a reminder today based on the schedule
      // We use followUpCount to track which reminders have been sent
      const currentReminderIndex = protocol.followUpCount || 0;
      
      // Find the next reminder day that matches or exceeds current days
      let shouldSendReminder = false;
      let reminderDay = 0;
      
      for (let i = currentReminderIndex; i < REMINDER_DAYS.length; i++) {
        if (daysSinceSent >= REMINDER_DAYS[i]) {
          // We've reached or passed this reminder day and haven't sent it yet
          shouldSendReminder = true;
          reminderDay = REMINDER_DAYS[i];
          break;
        }
      }

      if (!shouldSendReminder) {
        continue;
      }

      // Get urgency level (outside try block so it's available in catch)
      const urgency = getReminderUrgency(daysSinceSent);
      
      try {
        // Calculate the actual amount due
        const totalAmount = await calculateProtocolTotal(protocol.id);
        // null => the total couldn't be computed; fall back to "See Protocol" rather
        // than emailing the client a figure we don't trust.
        const formattedAmount =
          totalAmount !== null && totalAmount > 0 ? totalAmount.toFixed(2) : 'See Protocol';
        
        // Generate payment link
        const paymentLink = `${baseUrl}/protocol/${protocol.accessToken}`;
        
        // Generate payment portal link for viewing payment history
        const paymentPortalLink = `${baseUrl}/payments/${protocol.accessToken}`;

        // Generate tracking ID for email engagement tracking
        const trackingId = `pr_${protocol.id}_${uuidv4().slice(0, 8)}`;
        
        // Store tracking record in database
        try {
          const database = await getDb();
          if (database) {
            await database.insert(emailTracking).values({
              trackingId,
              emailType: "payment_reminder",
              recipientEmail: protocol.clientEmail,
              recipientName: protocol.clientName,
              subject: `Payment Reminder - Day ${reminderDay}`,
              clientProtocolId: protocol.id,
            });
          }
        } catch (trackingError) {
          console.error(`[Payment Reminder] Failed to create tracking record:`, trackingError);
        }

        const htmlContent = generatePaymentReminderHTML({
          clientName: protocol.clientName,
          clientEmail: protocol.clientEmail,
          protocolName: "Your Health Protocol",
          amount: formattedAmount,
          currency: "USD",
          daysOverdue: daysSinceSent,
          paymentLink,
          paymentPortalLink,
          supportEmail: "omega@omegalongevity.com",
          trackingId,
          trackingBaseUrl: baseUrl,
        });

        const textContent = generatePaymentReminderText({
          clientName: protocol.clientName,
          clientEmail: protocol.clientEmail,
          protocolName: "Your Health Protocol",
          amount: formattedAmount,
          currency: "USD",
          daysOverdue: daysSinceSent,
          paymentLink,
          paymentPortalLink,
          supportEmail: "omega@omegalongevity.com",
        });

        // Determine subject line based on urgency
        let subject = "Payment Reminder - Your Health Protocol";
        if (urgency.level === 'urgent') {
          subject = "⚠️ Final Notice: Payment Required for Your Protocol";
        } else if (urgency.level === 'moderate') {
          subject = "Reminder: Payment Pending for Your Protocol";
        } else {
          subject = "Friendly Reminder: Complete Your Protocol Payment";
        }

        if (!transporter) {
          console.log(`[Payment Reminder] Simulated reminder for ${protocol.clientName} (Day ${reminderDay})`);
        } else {
          await transporter.sendMail({
            from: smtpFrom,
            replyTo: "omega@omegalongevity.com",
            to: protocol.clientEmail,
            subject,
            html: htmlContent,
            text: textContent,
          });
        }

        // Update the follow-up count to track that this reminder was sent
        const newFollowUpCount = REMINDER_DAYS.indexOf(reminderDay) + 1;
        await db.updateClientProtocol(protocol.id, {
          followUpCount: newFollowUpCount,
          lastFollowUpSentAt: new Date(),
        });

        // Log the reminder
        await db.createPaymentReminderLog({
          protocolId: protocol.id,
          clientName: protocol.clientName,
          clientEmail: protocol.clientEmail || undefined,
          reminderType: urgency.level,
          reminderDay: reminderDay,
          status: "sent",
        });
        
        // Record reminder_sent event for payment history
        try {
          const { paymentEvents } = await import('../../drizzle/schema');
          const database = await db.getDb();
          if (database) {
            await database.insert(paymentEvents).values({
              clientProtocolId: protocol.id,
              eventType: 'reminder_sent',
              amount: formattedAmount.replace('$', ''),
              reminderType: urgency.level,
              emailSentTo: protocol.clientEmail,
              notes: `Automated ${urgency.level} reminder (Day ${reminderDay}) sent to ${protocol.clientEmail}`,
              createdAt: new Date(),
            });
          }
        } catch (eventError) {
          console.error('Failed to record reminder_sent event:', eventError);
        }

        remindersSent++;

        console.log(
          `[Payment Reminder] Sent ${urgency.level} reminder to ${protocol.clientName} (Day ${daysSinceSent}, Reminder #${newFollowUpCount})`
        );
      } catch (error) {
        remindersFailed++;
        console.error(
          `[Payment Reminder] Failed to send reminder to ${protocol.clientName}:`,
          error
        );
        
        // Log the failed reminder
        await db.createPaymentReminderLog({
          protocolId: protocol.id,
          clientName: protocol.clientName,
          clientEmail: protocol.clientEmail || undefined,
          reminderType: urgency?.level || 'unknown',
          reminderDay: reminderDay || 0,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Log the run
    lastCronRunData = {
      timestamp: new Date().toISOString(),
      sent: remindersSent,
      failed: remindersFailed,
    };

    console.log(
      `[Payment Reminder Cron] Completed. Sent: ${remindersSent}, Failed: ${remindersFailed}`
    );
  } catch (error) {
    console.error("[Payment Reminder Cron] Error:", error);
    throw error; // propagate so runCronJob records the failure + alerts admins
  }
}

export function startPaymentReminderCron() {
  console.log("[Payment Reminder Cron] Initializing payment reminder scheduler...");
  console.log(`[Payment Reminder Cron] Reminder schedule: Days ${DEFAULT_REMINDER_DAYS.join(', ')} (customizable in Site Settings)`);
  
  // Check every minute if we should run
  cronInterval = setInterval(async () => {
    if (shouldRunCron()) {
      await runCronJob("payment_reminders", () => runPaymentReminderJob());
    }
  }, 60000); // Check every minute

  console.log(`[Payment Reminder Cron] Scheduled to run daily at ${CRON_HOUR}:${CRON_MINUTE.toString().padStart(2, '0')}`);
  return cronInterval;
}

export function stopPaymentReminderCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[Payment Reminder Cron] Stopped");
  }
}

/**
 * Manually trigger the payment reminder job (for testing)
 */
export async function triggerPaymentReminderJob(): Promise<{ sent: number; failed: number }> {
  await runPaymentReminderJob();
  return lastCronRunData || { sent: 0, failed: 0, timestamp: '' };
}

/**
 * Get the last cron run status
 */
export function getLastPaymentReminderCronRun(): { timestamp: string; sent: number; failed: number } | null {
  return lastCronRunData;
}
