/**
 * Intake Form Reminder Cron Job
 * Sends automated reminder emails to clients who paid but haven't completed their intake forms
 * Schedule: Runs every 2 hours
 * Triggers:
 *   - 24h after payment if intake form not completed
 *   - 72h after payment if intake form still not completed
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { createEmailTracking, generateTrackingPixel, generateTrackedLink } from "../emailTracking";

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
let lastCronRunData: { timestamp: string; sent24h: number; sent72h: number; failed: number } | null = null;

const tierNames: Record<string, string> = {
  elite: "Elite Longevity Program",
  flagship: "90-Day Transformation Program",
  essentials: "Protocol Essentials Program",
};

/**
 * Generate HTML email for 24h intake form reminder
 */
function generate24hReminderHTML(params: {
  clientName: string;
  tier: string;
  intakeUrl: string;
  baseUrl: string;
  trackingPixel?: string;
}): string {
  const { clientName, tier, intakeUrl, baseUrl, trackingPixel } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Next Step: Complete Your Intake Form</h1>
      <p style="color: #e0e7ee; margin: 10px 0 0 0; font-size: 16px;">Your coach is ready to start your journey</p>
    </div>
    
    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi ${clientName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for enrolling in the <strong>${tierNames[tier] || "Transformation Program"}</strong>! Your payment has been confirmed and your spot is secured.
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
        To get started, we need you to complete your <strong>intake form</strong>. This helps your coach understand your health history, goals, and any specific needs so they can create a personalized plan just for you.
      </p>
      
      <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
        <p style="color: #1e40af; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>📋 What to expect:</strong> The intake form takes about 10-15 minutes and covers your health background, goals, and lifestyle. The more detail you provide, the better your coach can serve you.
        </p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${intakeUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
          Complete Intake Form Now
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 20px 0;">
        Once your intake form is complete, the next step is scheduling your <strong>strategy session</strong> with your coach. This is where the transformation begins!
      </p>
      
      <!-- Support -->
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        Need help? Reply to this email or contact us at <a href="mailto:support@omegalongevity.com" style="color: #1e3a5f;">support@omegalongevity.com</a>.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
      <p style="color: #e0e7ee; font-size: 14px; margin: 0 0 10px 0;">
        Omega Longevity - Elite Health Optimization
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        &copy; ${new Date().getFullYear()} Omega Longevity. All rights reserved.
      </p>
    </div>
  </div>
  ${trackingPixel || ''}
</body>
</html>
  `;
}

/**
 * Generate HTML email for 72h intake form reminder (more urgent)
 */
function generate72hReminderHTML(params: {
  clientName: string;
  tier: string;
  intakeUrl: string;
  baseUrl: string;
  trackingPixel?: string;
}): string {
  const { clientName, tier, intakeUrl, baseUrl, trackingPixel } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #92400e 0%, #b45309 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Your Coach Is Waiting For You</h1>
      <p style="color: #fde68a; margin: 10px 0 0 0; font-size: 16px;">Complete your intake form to begin your transformation</p>
    </div>
    
    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi ${clientName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Just a friendly reminder that your <strong>intake form</strong> for the <strong>${tierNames[tier] || "Transformation Program"}</strong> is still waiting to be completed. Your coach can't begin building your personalized protocol until this step is done.
      </p>
      
      <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
        <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>⏰ Quick Action Needed:</strong> It only takes about 10-15 minutes. The sooner you complete it, the sooner your coach can start working on your custom plan.
        </p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${intakeUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
          Complete Intake Form Now
        </a>
      </div>
      
      <!-- What happens next -->
      <div style="background-color: #f0fdf4; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #22c55e;">
        <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">What Happens After You Complete the Form</h3>
        <ol style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Your coach reviews your health background and goals</li>
          <li>You schedule a strategy session</li>
          <li>Your personalized protocol is built</li>
          <li>Your transformation journey begins!</li>
        </ol>
      </div>
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
        If you're having any trouble accessing the form, reply to this email and we'll help you right away.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
      <p style="color: #e0e7ee; font-size: 14px; margin: 0 0 10px 0;">
        Omega Longevity - Elite Health Optimization
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        &copy; ${new Date().getFullYear()} Omega Longevity. All rights reserved.
      </p>
    </div>
  </div>
  ${trackingPixel || ''}
</body>
</html>
  `;
}

/**
 * Process intake form reminders
 */
export async function processIntakeFormReminders(): Promise<{ sent24h: number; sent72h: number; failed: number }> {
  console.log("[IntakeFormReminderCron] Starting intake form reminder check...");
  
  const database = await getDb();
  if (!database) {
    console.error("[IntakeFormReminderCron] Database not available");
    return { sent24h: 0, sent72h: 0, failed: 0 };
  }
  
  let sent24h = 0;
  let sent72h = 0;
  let failed = 0;
  
  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";
  const baseUrl = process.env.VITE_APP_URL || "https://peptidecoach.pro";
  
  try {
    // === 24-hour reminders ===
    // Find enrollments where coaching fee was paid 24+ hours ago but intake form not completed
    const result24h = await database.execute(sql`
      SELECT id, email, clientName, tier, coachingFeePaidAt, authToken, authTokenExpiresAt
      FROM transformation_enrollments
      WHERE coachingFeePaid = TRUE
        AND intakeFormCompleted = FALSE
        AND email IS NOT NULL
        AND email != ''
        AND intakeReminder24hSentAt IS NULL
        AND coachingFeePaidAt IS NOT NULL
        AND coachingFeePaidAt <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND coachingFeePaidAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY coachingFeePaidAt ASC
      LIMIT 50
    `);
    
    const enrollments24h = (result24h[0] as unknown) as any[];
    
    if (enrollments24h && enrollments24h.length > 0) {
      console.log(`[IntakeFormReminderCron] Found ${enrollments24h.length} enrollments needing 24h intake reminder`);
      
      for (const enrollment of enrollments24h) {
        try {
          const intakeUrl = `${baseUrl}/intake?enrollmentId=${enrollment.id}&openIntake=true`;
          
          const emailSubject = `Next Step: Complete Your Intake Form - ${tierNames[enrollment.tier] || "Transformation Program"}`;
          const trackingId = await createEmailTracking({
            enrollmentId: enrollment.id,
            emailType: 'intake_reminder_24h',
            recipientEmail: enrollment.email,
            subject: emailSubject,
          });
          
          const trackingPixel = generateTrackingPixel(trackingId, baseUrl);
          const trackedIntakeUrl = generateTrackedLink(intakeUrl, trackingId, baseUrl);
          
          const htmlContent = generate24hReminderHTML({
            clientName: enrollment.clientName || "Valued Client",
            tier: enrollment.tier,
            intakeUrl: trackedIntakeUrl,
            baseUrl,
            trackingPixel,
          });
          
          if (transporter) {
            await transporter.sendMail({
              from: smtpFrom,
              to: enrollment.email,
              subject: emailSubject,
              html: htmlContent,
            });
          } else {
            console.log(`[IntakeFormReminderCron] (Simulated) 24h reminder to ${enrollment.email}`);
          }
          
          // Mark as sent and log activity
          await database.execute(sql`
            UPDATE transformation_enrollments
            SET intakeReminder24hSentAt = NOW()
            WHERE id = ${enrollment.id}
          `);
          
          await database.execute(sql`
            INSERT INTO transformation_enrollment_activity (enrollmentId, activityType, description, createdAt)
            VALUES (${enrollment.id}, 'intake_reminder_24h', 'Automated 24-hour intake form reminder email sent', NOW())
          `);
          
          sent24h++;
        } catch (error) {
          failed++;
          console.error(`[IntakeFormReminderCron] Failed to send 24h reminder to ${enrollment.email}:`, error);
        }
      }
    }
    
    // === 72-hour reminders ===
    const result72h = await database.execute(sql`
      SELECT id, email, clientName, tier, coachingFeePaidAt, authToken, authTokenExpiresAt
      FROM transformation_enrollments
      WHERE coachingFeePaid = TRUE
        AND intakeFormCompleted = FALSE
        AND email IS NOT NULL
        AND email != ''
        AND intakeReminder24hSentAt IS NOT NULL
        AND intakeReminder72hSentAt IS NULL
        AND coachingFeePaidAt IS NOT NULL
        AND coachingFeePaidAt <= DATE_SUB(NOW(), INTERVAL 72 HOUR)
        AND coachingFeePaidAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY coachingFeePaidAt ASC
      LIMIT 50
    `);
    
    const enrollments72h = (result72h[0] as unknown) as any[];
    
    if (enrollments72h && enrollments72h.length > 0) {
      console.log(`[IntakeFormReminderCron] Found ${enrollments72h.length} enrollments needing 72h intake reminder`);
      
      for (const enrollment of enrollments72h) {
        try {
          const intakeUrl = `${baseUrl}/intake?enrollmentId=${enrollment.id}&openIntake=true`;
          
          const emailSubject = `Your Coach Is Waiting - Complete Your Intake Form`;
          const trackingId = await createEmailTracking({
            enrollmentId: enrollment.id,
            emailType: 'intake_reminder_72h',
            recipientEmail: enrollment.email,
            subject: emailSubject,
          });
          
          const trackingPixel = generateTrackingPixel(trackingId, baseUrl);
          const trackedIntakeUrl = generateTrackedLink(intakeUrl, trackingId, baseUrl);
          
          const htmlContent = generate72hReminderHTML({
            clientName: enrollment.clientName || "Valued Client",
            tier: enrollment.tier,
            intakeUrl: trackedIntakeUrl,
            baseUrl,
            trackingPixel,
          });
          
          if (transporter) {
            await transporter.sendMail({
              from: smtpFrom,
              to: enrollment.email,
              subject: emailSubject,
              html: htmlContent,
            });
          } else {
            console.log(`[IntakeFormReminderCron] (Simulated) 72h reminder to ${enrollment.email}`);
          }
          
          // Mark as sent and log activity
          await database.execute(sql`
            UPDATE transformation_enrollments
            SET intakeReminder72hSentAt = NOW()
            WHERE id = ${enrollment.id}
          `);
          
          await database.execute(sql`
            INSERT INTO transformation_enrollment_activity (enrollmentId, activityType, description, createdAt)
            VALUES (${enrollment.id}, 'intake_reminder_72h', 'Automated 72-hour intake form reminder email sent', NOW())
          `);
          
          sent72h++;
        } catch (error) {
          failed++;
          console.error(`[IntakeFormReminderCron] Failed to send 72h reminder to ${enrollment.email}:`, error);
        }
      }
    }
    
    if (sent24h === 0 && sent72h === 0) {
      console.log("[IntakeFormReminderCron] No enrollments need intake form reminders");
    }
    
  } catch (error) {
    console.error("[IntakeFormReminderCron] Error processing reminders:", error);
  }
  
  lastCronRunData = {
    timestamp: new Date().toISOString(),
    sent24h,
    sent72h,
    failed,
  };
  
  console.log(`[IntakeFormReminderCron] Completed - 24h sent: ${sent24h}, 72h sent: ${sent72h}, Failed: ${failed}`);
  return { sent24h, sent72h, failed };
}

/**
 * Initialize the cron job (runs every 2 hours)
 */
export function initIntakeFormReminderCron(): void {
  if (cronInterval) {
    console.log("[IntakeFormReminderCron] Already initialized");
    return;
  }
  
  // Run every 2 hours
  cronInterval = setInterval(processIntakeFormReminders, 2 * 60 * 60 * 1000);
  
  console.log("[IntakeFormReminderCron] Initialized - checking every 2 hours");
  
  // Run initial check after 3 minutes (stagger with other crons)
  setTimeout(processIntakeFormReminders, 3 * 60 * 1000);
}

/**
 * Stop the cron job
 */
export function stopIntakeFormReminderCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[IntakeFormReminderCron] Stopped");
  }
}

/**
 * Manually trigger the reminder job
 */
export async function triggerIntakeFormReminderJob(): Promise<{ sent24h: number; sent72h: number; failed: number }> {
  return processIntakeFormReminders();
}

/**
 * Get last cron run data
 */
export function getLastIntakeFormReminderCronRun(): { timestamp: string; sent24h: number; sent72h: number; failed: number } | null {
  return lastCronRunData;
}

/**
 * Send a manual intake form reminder to a specific enrollment
 */
export async function sendManualIntakeReminder(enrollmentId: number): Promise<{ success: boolean; error?: string }> {
  const database = await getDb();
  if (!database) {
    return { success: false, error: "Database not available" };
  }
  
  try {
    const result = await database.execute(sql`
      SELECT id, email, clientName, tier, coachingFeePaid, intakeFormCompleted
      FROM transformation_enrollments
      WHERE id = ${enrollmentId}
    `);
    
    const enrollments = (result[0] as unknown) as any[];
    if (!enrollments || enrollments.length === 0) {
      return { success: false, error: "Enrollment not found" };
    }
    
    const enrollment = enrollments[0];
    
    if (!enrollment.email) {
      return { success: false, error: "No email address on file" };
    }
    
    if (enrollment.intakeFormCompleted) {
      return { success: false, error: "Intake form already completed" };
    }
    
    const transporter = getTransporter();
    const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";
    const baseUrl = process.env.VITE_APP_URL || "https://peptidecoach.pro";
    const intakeUrl = `${baseUrl}/intake?enrollmentId=${enrollment.id}&openIntake=true`;
    
    const emailSubject = `Reminder: Complete Your Intake Form - ${tierNames[enrollment.tier] || "Transformation Program"}`;
    const trackingId = await createEmailTracking({
      enrollmentId: enrollment.id,
      emailType: 'intake_reminder_manual',
      recipientEmail: enrollment.email,
      subject: emailSubject,
    });
    
    const trackingPixel = generateTrackingPixel(trackingId, baseUrl);
    const trackedIntakeUrl = generateTrackedLink(intakeUrl, trackingId, baseUrl);
    
    const htmlContent = generate24hReminderHTML({
      clientName: enrollment.clientName || "Valued Client",
      tier: enrollment.tier,
      intakeUrl: trackedIntakeUrl,
      baseUrl,
      trackingPixel,
    });
    
    if (transporter) {
      await transporter.sendMail({
        from: smtpFrom,
        to: enrollment.email,
        subject: emailSubject,
        html: htmlContent,
      });
    } else {
      console.log(`[IntakeFormReminderCron] (Simulated) Manual reminder to ${enrollment.email}`);
    }
    
    await database.execute(sql`
      INSERT INTO transformation_enrollment_activity (enrollmentId, activityType, description, createdAt)
      VALUES (${enrollmentId}, 'intake_reminder_manual', 'Manual intake form reminder email sent by admin', NOW())
    `);
    
    return { success: true };
  } catch (error: any) {
    console.error(`[IntakeFormReminderCron] Failed to send manual reminder:`, error);
    return { success: false, error: error.message || "Unknown error" };
  }
}
