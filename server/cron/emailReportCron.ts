import cron from "node-cron";
import { getDb } from "../db";
import { emailReportSettings, clientNotificationHistory, emailEngagementEvents } from "../../drizzle/schema";
import { eq, and, gte, lte, count } from "drizzle-orm";
import { sendEmail } from "../emailService";

/**
 * Email Report Cron Job
 * Runs every hour to check if any scheduled reports need to be sent
 * Now includes engagement metrics (open rates, click rates)
 */

// Track if cron is already initialized
let cronInitialized = false;

export function initEmailReportCron() {
  if (cronInitialized) {
    console.log("[EmailReportCron] Already initialized, skipping");
    return;
  }
  
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("[EmailReportCron] Checking for scheduled reports...");
    
    try {
      await processScheduledReports();
    } catch (error) {
      console.error("[EmailReportCron] Error processing reports:", error);
    }
  });
  
  cronInitialized = true;
  console.log("[EmailReportCron] Initialized - checking every hour");
}

async function processScheduledReports() {
  const db = await getDb();
  if (!db) {
    console.log("[EmailReportCron] Database not available");
    return;
  }
  
  // Get all enabled report settings
  const settings = await db
    .select()
    .from(emailReportSettings)
    .where(eq(emailReportSettings.isEnabled, true));
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentDayOfWeek = now.getDay();
  const currentDayOfMonth = now.getDate();
  
  for (const setting of settings) {
    // Check if this report should run now
    if (setting.hourOfDay !== currentHour) {
      continue;
    }
    
    let shouldRun = false;
    
    if (setting.frequency === "daily") {
      shouldRun = true;
    } else if (setting.frequency === "weekly" && setting.dayOfWeek === currentDayOfWeek) {
      shouldRun = true;
    } else if (setting.frequency === "monthly" && setting.dayOfMonth === currentDayOfMonth) {
      shouldRun = true;
    }
    
    if (!shouldRun) {
      continue;
    }
    
    // Check if we already sent this report today (prevent duplicates)
    if (setting.lastSentAt) {
      const lastSent = new Date(setting.lastSentAt);
      if (
        lastSent.getFullYear() === now.getFullYear() &&
        lastSent.getMonth() === now.getMonth() &&
        lastSent.getDate() === now.getDate()
      ) {
        console.log(`[EmailReportCron] Report ${setting.reportType} already sent today, skipping`);
        continue;
      }
    }
    
    console.log(`[EmailReportCron] Sending ${setting.reportType} report...`);
    
    try {
      await sendReport(setting);
      
      // Update last sent timestamp
      await db
        .update(emailReportSettings)
        .set({ lastSentAt: now })
        .where(eq(emailReportSettings.id, setting.id));
      
      console.log(`[EmailReportCron] Successfully sent ${setting.reportType} report`);
    } catch (error) {
      console.error(`[EmailReportCron] Failed to send ${setting.reportType} report:`, error);
    }
  }
}

async function sendReport(setting: typeof emailReportSettings.$inferSelect) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const recipients = (setting.recipients as string[]) || [];
  if (recipients.length === 0) {
    console.log(`[EmailReportCron] No recipients for ${setting.reportType}, skipping`);
    return;
  }
  
  // Calculate date range based on frequency
  const endDate = new Date();
  const startDate = new Date();
  
  if (setting.frequency === "daily") {
    startDate.setDate(startDate.getDate() - 1);
  } else if (setting.frequency === "weekly") {
    startDate.setDate(startDate.getDate() - 7);
  } else {
    startDate.setMonth(startDate.getMonth() - 1);
  }
  
  // Get delivery stats
  const [totalResult] = await db
    .select({ count: count() })
    .from(clientNotificationHistory)
    .where(and(
      gte(clientNotificationHistory.sentAt, startDate),
      lte(clientNotificationHistory.sentAt, endDate)
    ));
  
  const statusCounts = await db
    .select({
      status: clientNotificationHistory.status,
      count: count(),
    })
    .from(clientNotificationHistory)
    .where(and(
      gte(clientNotificationHistory.sentAt, startDate),
      lte(clientNotificationHistory.sentAt, endDate)
    ))
    .groupBy(clientNotificationHistory.status);
  
  const statusMap = Object.fromEntries(statusCounts.map(s => [s.status, s.count]));
  const total = totalResult?.count || 0;
  const sent = statusMap['sent'] || 0;
  const failed = statusMap['failed'] || 0;
  const deliveryRate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0';
  
  // Get engagement stats
  const [openEventsResult] = await db
    .select({ count: count() })
    .from(emailEngagementEvents)
    .where(and(
      eq(emailEngagementEvents.eventType, "open"),
      gte(emailEngagementEvents.createdAt, startDate),
      lte(emailEngagementEvents.createdAt, endDate)
    ));
  
  const [clickEventsResult] = await db
    .select({ count: count() })
    .from(emailEngagementEvents)
    .where(and(
      eq(emailEngagementEvents.eventType, "click"),
      gte(emailEngagementEvents.createdAt, startDate),
      lte(emailEngagementEvents.createdAt, endDate)
    ));
  
  // Get unique opens (by tracking ID)
  const uniqueOpens = await db
    .select({ trackingId: emailEngagementEvents.trackingId })
    .from(emailEngagementEvents)
    .where(and(
      eq(emailEngagementEvents.eventType, "open"),
      gte(emailEngagementEvents.createdAt, startDate),
      lte(emailEngagementEvents.createdAt, endDate)
    ))
    .groupBy(emailEngagementEvents.trackingId);
  
  const totalOpens = openEventsResult?.count || 0;
  const uniqueOpenCount = uniqueOpens.length;
  const totalClicks = clickEventsResult?.count || 0;
  
  const openRate = sent > 0 ? ((uniqueOpenCount / sent) * 100).toFixed(1) : '0';
  const clickRate = uniqueOpenCount > 0 ? ((totalClicks / uniqueOpenCount) * 100).toFixed(1) : '0';
  
  const periodLabel = setting.frequency === "daily" ? "Daily" : 
                      setting.frequency === "weekly" ? "Weekly" : "Monthly";
  
  const html = generateReportHtml({
    reportType: setting.reportType,
    periodLabel,
    startDate: startDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' }),
    endDate: endDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' }),
    total,
    sent,
    failed,
    deliveryRate,
    // Engagement metrics
    totalOpens,
    uniqueOpens: uniqueOpenCount,
    totalClicks,
    openRate,
    clickRate,
  });
  
  // Send to all recipients
  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient,
        subject: `${periodLabel} Email Delivery Report - ${startDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' })} to ${endDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' })}`,
        html,
      });
      console.log(`[EmailReportCron] Sent report to ${recipient}`);
    } catch (error) {
      console.error(`[EmailReportCron] Failed to send to ${recipient}:`, error);
    }
  }
}

function generateReportHtml(data: {
  reportType: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  total: number;
  sent: number;
  failed: number;
  deliveryRate: string;
  totalOpens: number;
  uniqueOpens: number;
  totalClicks: number;
  openRate: string;
  clickRate: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.periodLabel} Email Delivery Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📊 ${data.periodLabel} Email Report</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">${data.startDate} - ${data.endDate}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Delivery Summary Stats -->
              <h3 style="color: #333; margin: 0 0 15px; font-size: 16px; border-bottom: 2px solid #f97316; padding-bottom: 8px;">📬 Delivery Summary</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="width: 50%; padding: 15px; text-align: center; background-color: #f8f8f8; border-radius: 8px;">
                    <div style="font-size: 36px; font-weight: bold; color: #f97316;">${data.total}</div>
                    <div style="font-size: 14px; color: #666;">Total Emails</div>
                  </td>
                  <td style="width: 10px;"></td>
                  <td style="width: 50%; padding: 15px; text-align: center; background-color: #f8f8f8; border-radius: 8px;">
                    <div style="font-size: 36px; font-weight: bold; color: ${parseFloat(data.deliveryRate) >= 95 ? '#10b981' : parseFloat(data.deliveryRate) >= 80 ? '#f59e0b' : '#ef4444'};">${data.deliveryRate}%</div>
                    <div style="font-size: 14px; color: #666;">Delivery Rate</div>
                  </td>
                </tr>
              </table>
              
              <!-- Engagement Stats -->
              <h3 style="color: #333; margin: 0 0 15px; font-size: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">📈 Engagement Metrics</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="width: 33%; padding: 12px; text-align: center; background-color: #eff6ff; border-radius: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${data.uniqueOpens}</div>
                    <div style="font-size: 12px; color: #666;">Unique Opens</div>
                  </td>
                  <td style="width: 5px;"></td>
                  <td style="width: 33%; padding: 12px; text-align: center; background-color: #f0fdf4; border-radius: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #10b981;">${data.openRate}%</div>
                    <div style="font-size: 12px; color: #666;">Open Rate</div>
                  </td>
                  <td style="width: 5px;"></td>
                  <td style="width: 33%; padding: 12px; text-align: center; background-color: #faf5ff; border-radius: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${data.clickRate}%</div>
                    <div style="font-size: 12px; color: #666;">Click Rate</div>
                  </td>
                </tr>
              </table>
              
              <!-- Detailed Breakdown -->
              <h3 style="color: #333; margin: 0 0 15px; font-size: 16px;">Detailed Breakdown</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">
                    <span style="color: #333;">✅ Successfully Sent</span>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">
                    <strong style="color: #10b981;">${data.sent}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">
                    <span style="color: #333;">❌ Failed</span>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">
                    <strong style="color: #ef4444;">${data.failed}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">
                    <span style="color: #333;">👁️ Total Opens (incl. repeats)</span>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">
                    <strong style="color: #3b82f6;">${data.totalOpens}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">
                    <span style="color: #333;">🖱️ Total Clicks</span>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">
                    <strong style="color: #8b5cf6;">${data.totalClicks}</strong>
                  </td>
                </tr>
              </table>
              
              ${data.failed > 0 ? `
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="color: #991b1b; margin: 0; font-size: 14px;">
                  ⚠️ <strong>${data.failed} email(s) failed to deliver.</strong> Review the Notification Report dashboard for details.
                </p>
              </div>
              ` : ''}
              
              ${parseFloat(data.openRate) < 20 ? `
              <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  💡 <strong>Tip:</strong> Your open rate is below 20%. Consider testing different subject lines or sending times to improve engagement.
                </p>
              </div>
              ` : ''}
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                This is an automated ${data.periodLabel.toLowerCase()} report from Omega Longevity. To adjust report settings or view detailed analytics, visit the Admin Settings page.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2026 Omega Longevity. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export { processScheduledReports };
