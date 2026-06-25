/**
 * Enrollment Follow-Up Reminder Cron Job
 * Sends automated follow-up emails to clients who paid but haven't completed account setup
 * Schedule: Runs every 6 hours to check for enrollments needing follow-up
 * Trigger: 48-72 hours after payment if account not yet linked
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { isStaging } from "../_core/appEnv";
import crypto from "crypto";
import { createEmailTracking, generateTrackingPixel, generateTrackedLink } from "../emailTracking";

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

let cronInterval: NodeJS.Timeout | null = null;
let lastCronRunData: { timestamp: string; sent: number; failed: number } | null = null;

const tierNames: Record<string, string> = {
  elite: "Elite Longevity Program",
  flagship: "90-Day Transformation Program",
  essentials: "Protocol Essentials Program",
};

/**
 * Generate HTML email template for follow-up reminder
 */
function generateFollowUpReminderHTML(params: {
  clientName: string;
  tier: string;
  verificationUrl: string;
  baseUrl: string;
  trackingPixel?: string;
}): string {
  const { clientName, tier, verificationUrl, baseUrl, trackingPixel } = params;

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
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Don't Miss Out!</h1>
      <p style="color: #e0e7ee; margin: 10px 0 0 0; font-size: 16px;">Complete your account setup</p>
    </div>
    
    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi ${clientName},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We noticed you enrolled in the <strong>${tierNames[tier] || "Transformation Program"}</strong> but haven't completed your account setup yet. Your spot is reserved, but we want to make sure you don't miss any important steps!
      </p>
      
      <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
        <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>⏰ Action Required:</strong> Complete your account setup to access your program dashboard and intake forms. Your coach is ready to start your transformation journey!
        </p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
          Complete Account Setup
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 20px 0; text-align: center;">
        Or copy and paste this link into your browser:
      </p>
      <p style="color: #1e3a5f; font-size: 12px; line-height: 1.6; margin: 0 0 30px 0; word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
        ${verificationUrl}
      </p>
      
      <!-- What You're Missing -->
      <div style="background-color: #f0fdf4; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #22c55e;">
        <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">✅ What's Waiting for You</h3>
        <ul style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Personalized intake forms to customize your protocol</li>
          <li>Access to your transformation dashboard</li>
          <li>Direct communication with your health coach</li>
          <li>Exclusive masterclass content and resources</li>
        </ul>
      </div>
      
      <!-- Support -->
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
        Need help? Reply to this email or contact us at <a href="mailto:support@omegalongevity.com" style="color: #1e3a5f;">support@omegalongevity.com</a>. We're here to support you!
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
      <p style="color: #e0e7ee; font-size: 14px; margin: 0 0 10px 0;">
        Omega Longevity - Elite Health Optimization
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Omega Longevity. All rights reserved.
      </p>
    </div>
  </div>
  ${trackingPixel || ''}
</body>
</html>
  `;
}

/**
 * Process enrollments needing follow-up reminders
 */
export async function processEnrollmentFollowUps(): Promise<{ sent: number; failed: number }> {
  console.log("[EnrollmentFollowUpCron] Starting follow-up check...");
  
  const database = await getDb();
  if (!database) {
    console.error("[EnrollmentFollowUpCron] Database not available");
    return { sent: 0, failed: 0 };
  }
  let sent = 0;
  let failed = 0;
  
  try {
    // Find enrollments that:
    // 1. Have paid (coachingFeePaid = true)
    // 2. Are not linked to a user account (userId IS NULL)
    // 3. Were paid 48-72 hours ago
    // 4. Haven't received a follow-up reminder yet
    // 5. Have an email address
    // 6. Are still in early onboarding stages (NOT already progressed to fulfillment or beyond)
    const result = await database.execute(sql`
      SELECT id, email, clientName, tier, coachingFeePaidAt, authToken, authTokenExpiresAt
      FROM transformation_enrollments
      WHERE coachingFeePaid = TRUE
        AND userId IS NULL
        AND email IS NOT NULL
        AND followUpReminderSentAt IS NULL
        AND coachingFeePaidAt IS NOT NULL
        AND coachingFeePaidAt <= DATE_SUB(NOW(), INTERVAL 48 HOUR)
        AND coachingFeePaidAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND status NOT IN ('intake_complete', 'discovery_scheduled', 'discovery_complete', 'protocol_preparing', 'protocol_review', 'protocol_paid', 'launched', 'fulfillment', 'shipped', 'delivered', 'training_scheduled', 'training_complete', 'active', 'week3_review', 'month2', 'month3_final', 'completed', 'renewed')
      ORDER BY coachingFeePaidAt ASC
      LIMIT 50
    `);
    
    const enrollments = (result[0] as unknown) as any[];
    
    if (!enrollments || enrollments.length === 0) {
      console.log("[EnrollmentFollowUpCron] No enrollments need follow-up reminders");
      return { sent: 0, failed: 0 };
    }
    
    console.log(`[EnrollmentFollowUpCron] Found ${enrollments.length} enrollments needing follow-up`);
    
    const transporter = getTransporter();
    const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";
    const baseUrl = process.env.VITE_APP_URL || "https://peptidecoach.pro";
    
    for (const enrollment of enrollments) {
      try {
        // Generate new auth token if expired or missing
        let authToken = enrollment.authToken;
        const tokenExpired = !enrollment.authTokenExpiresAt || 
          new Date(enrollment.authTokenExpiresAt) < new Date();
        
        if (!authToken || tokenExpired) {
          authToken = crypto.randomBytes(32).toString("hex");
          const authTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          
          await database.execute(sql`
            UPDATE transformation_enrollments
            SET authToken = ${authToken},
                authTokenExpiresAt = ${authTokenExpiresAt.toISOString().slice(0, 19).replace("T", " ")}
            WHERE id = ${enrollment.id}
          `);
        }
        
        const verificationUrl = `${baseUrl}/transformation/verify?token=${authToken}&enrollmentId=${enrollment.id}`;
        
        // Create email tracking record
        const emailSubject = `Action Required: Complete Your ${tierNames[enrollment.tier] || "Program"} Setup`;
        const trackingId = await createEmailTracking({
          enrollmentId: enrollment.id,
          emailType: 'follow_up_reminder',
          recipientEmail: enrollment.email,
          subject: emailSubject,
        });
        
        // Generate tracking pixel and tracked verification URL
        const trackingPixel = generateTrackingPixel(trackingId, baseUrl);
        const trackedVerificationUrl = generateTrackedLink(verificationUrl, trackingId, baseUrl);
        
        const htmlContent = generateFollowUpReminderHTML({
          clientName: enrollment.clientName || "Valued Client",
          tier: enrollment.tier,
          verificationUrl: trackedVerificationUrl,
          baseUrl,
          trackingPixel,
        });
        
        const textContent = `
Hi ${enrollment.clientName || "Valued Client"},

We noticed you enrolled in the ${tierNames[enrollment.tier] || "Transformation Program"} but haven't completed your account setup yet.

Complete your account setup here: ${verificationUrl}

What's waiting for you:
- Personalized intake forms to customize your protocol
- Access to your transformation dashboard
- Direct communication with your health coach
- Exclusive masterclass content and resources

Need help? Contact us at support@omegalongevity.com

Best regards,
The Omega Longevity Team
        `;
        
        if (transporter) {
          await transporter.sendMail({
            from: smtpFrom,
            to: enrollment.email,
            subject: emailSubject,
            html: htmlContent,
            text: textContent,
          });
        } else {
          console.log(`[EnrollmentFollowUpCron] (Simulated) Follow-up email to ${enrollment.email}`);
        }
        
        // Mark as sent
        await database.execute(sql`
          UPDATE transformation_enrollments
          SET followUpReminderSentAt = NOW()
          WHERE id = ${enrollment.id}
        `);
        
        sent++;
        console.log(`[EnrollmentFollowUpCron] Sent follow-up to ${enrollment.email} (enrollment ${enrollment.id})`);
        
      } catch (error) {
        failed++;
        console.error(`[EnrollmentFollowUpCron] Failed to send follow-up to ${enrollment.email}:`, error);
      }
    }
    
  } catch (error) {
    console.error("[EnrollmentFollowUpCron] Error processing follow-ups:", error);
  }
  
  lastCronRunData = {
    timestamp: new Date().toISOString(),
    sent,
    failed,
  };
  
  console.log(`[EnrollmentFollowUpCron] Completed - Sent: ${sent}, Failed: ${failed}`);
  
  // Also check for stalled enrollments
  await checkStalledEnrollments();
  
  return { sent, failed };
}

/**
 * Initialize the cron job (runs every 6 hours)
 */
export function initEnrollmentFollowUpCron(): void {
  if (cronInterval) {
    console.log("[EnrollmentFollowUpCron] Already initialized");
    return;
  }
  
  // Run every 6 hours (6 * 60 * 60 * 1000 = 21600000ms)
  cronInterval = setInterval(processEnrollmentFollowUps, 6 * 60 * 60 * 1000);
  
  console.log("[EnrollmentFollowUpCron] Initialized - checking every 6 hours");
  
  // Run initial check after 5 minutes (to not overload startup)
  setTimeout(processEnrollmentFollowUps, 5 * 60 * 1000);
}

/**
 * Stop the cron job
 */
export function stopEnrollmentFollowUpCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[EnrollmentFollowUpCron] Stopped");
  }
}

/**
 * Manually trigger the follow-up job
 */
export async function triggerEnrollmentFollowUpJob(): Promise<{ sent: number; failed: number }> {
  return processEnrollmentFollowUps();
}

/**
 * Get last cron run data
 */
export function getLastEnrollmentFollowUpCronRun(): { timestamp: string; sent: number; failed: number } | null {
  return lastCronRunData;
}

/**
 * Generate HTML email for stalled enrollment admin notification
 */
function generateStalledEnrollmentAdminHTML(enrollments: any[], baseUrl: string): string {
  const enrollmentRows = enrollments.map(e => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${e.clientName || 'Unknown'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${e.email}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${tierNames[e.tier] || e.tier}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">$${parseFloat(e.coachingFeeAmount || 0).toLocaleString('en-US', { timeZone: 'America/Denver' })}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${Math.floor((Date.now() - new Date(e.coachingFeePaidAt).getTime()) / (1000 * 60 * 60 * 24))} days</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 30px;">
    <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #ef4444;">
      <h2 style="color: #991b1b; margin: 0 0 10px 0;">⚠️ Stalled Enrollments Alert</h2>
      <p style="color: #7f1d1d; margin: 0; font-size: 14px;">
        The following ${enrollments.length} enrollment(s) have been pending for 5+ days despite follow-up emails.
        These clients may need phone follow-up.
      </p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Client</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Email</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Program</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Amount</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Days Pending</th>
        </tr>
      </thead>
      <tbody>
        ${enrollmentRows}
      </tbody>
    </table>
    
    <a href="${baseUrl}/admin/pending-enrollments" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
      View Pending Enrollments →
    </a>
    
    <p style="color: #6b7280; font-size: 12px; margin-top: 25px;">
      This is an automated alert from the Omega Longevity system.
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Check for stalled enrollments and send admin notification
 */
export async function checkStalledEnrollments(): Promise<{ found: number; notified: boolean }> {
  console.log("[EnrollmentFollowUpCron] Checking for stalled enrollments...");
  
  const database = await getDb();
  if (!database) {
    console.error("[EnrollmentFollowUpCron] Database not available for stalled check");
    return { found: 0, notified: false };
  }
  
  try {
    // Find enrollments that:
    // 1. Have paid (coachingFeePaid = true)
    // 2. Are not linked to a user account (userId IS NULL)
    // 3. Were paid 5+ days ago
    // 4. Have received a follow-up reminder
    // 5. Haven't been notified to admin yet (stalledNotificationSentAt IS NULL)
    // 6. Are still in early onboarding stages (NOT already in fulfillment or beyond)
    const result = await database.execute(sql`
      SELECT id, email, clientName, tier, coachingFeePaidAt, coachingFeeAmount, followUpReminderSentAt, status
      FROM transformation_enrollments
      WHERE coachingFeePaid = TRUE
        AND userId IS NULL
        AND email IS NOT NULL
        AND followUpReminderSentAt IS NOT NULL
        AND coachingFeePaidAt IS NOT NULL
        AND coachingFeePaidAt <= DATE_SUB(NOW(), INTERVAL 5 DAY)
        AND (stalledNotificationSentAt IS NULL OR stalledNotificationSentAt <= DATE_SUB(NOW(), INTERVAL 3 DAY))
        AND status NOT IN ('intake_complete', 'discovery_scheduled', 'discovery_complete', 'protocol_preparing', 'protocol_review', 'protocol_paid', 'launched', 'fulfillment', 'shipped', 'delivered', 'training_scheduled', 'training_complete', 'active', 'week3_review', 'month2', 'month3_final', 'completed', 'renewed')
      ORDER BY coachingFeePaidAt ASC
      LIMIT 20
    `);
    
    const enrollments = (result[0] as unknown) as any[];
    
    if (!enrollments || enrollments.length === 0) {
      console.log("[EnrollmentFollowUpCron] No stalled enrollments found");
      return { found: 0, notified: false };
    }
    
    console.log(`[EnrollmentFollowUpCron] Found ${enrollments.length} stalled enrollments`);
    
    const transporter = getTransporter();
    const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";
    const baseUrl = process.env.VITE_APP_URL || "https://peptidecoach.pro";
    const adminEmails = ["omega@omegalongevity.com", "shannon@omegalongevity.com"];
    
    const htmlContent = generateStalledEnrollmentAdminHTML(enrollments, baseUrl);
    
    if (transporter) {
      for (const adminEmail of adminEmails) {
        await transporter.sendMail({
          from: smtpFrom,
          to: adminEmail,
          subject: `⚠️ ${enrollments.length} Stalled Enrollment(s) Need Phone Follow-Up`,
          html: htmlContent,
        });
      }
      console.log(`[EnrollmentFollowUpCron] Sent stalled enrollment alert to admins`);
    } else {
      console.log(`[EnrollmentFollowUpCron] (Simulated) Stalled enrollment alert for ${enrollments.length} enrollments`);
    }
    
    // Mark all as notified
    const enrollmentIds = enrollments.map(e => e.id);
    for (const id of enrollmentIds) {
      await database.execute(sql`
        UPDATE transformation_enrollments
        SET stalledNotificationSentAt = NOW()
        WHERE id = ${id}
      `);
    }
    
    return { found: enrollments.length, notified: true };
    
  } catch (error) {
    console.error("[EnrollmentFollowUpCron] Error checking stalled enrollments:", error);
    return { found: 0, notified: false };
  }
}
