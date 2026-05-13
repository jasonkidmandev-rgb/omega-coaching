import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { emailReportSettings, clientNotificationHistory, users } from "../../drizzle/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { sendEmail } from "../emailService";

/**
 * Email Report Settings Router
 * Manages scheduled email delivery reports for admins
 */
export const emailReportSettingsRouter = router({
  // Get all report settings
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    const settings = await db.select().from(emailReportSettings);
    return settings;
  }),

  // Get a specific report setting
  get: adminProcedure
    .input(z.object({ reportType: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [setting] = await db
        .select()
        .from(emailReportSettings)
        .where(eq(emailReportSettings.reportType, input.reportType));
      
      return setting || null;
    }),

  // Create or update report settings
  upsert: adminProcedure
    .input(z.object({
      reportType: z.string(),
      frequency: z.enum(["daily", "weekly", "monthly"]),
      isEnabled: z.boolean(),
      recipients: z.array(z.string().email()),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(28).optional(),
      hourOfDay: z.number().min(0).max(23).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if setting exists
      const [existing] = await db
        .select()
        .from(emailReportSettings)
        .where(eq(emailReportSettings.reportType, input.reportType));
      
      if (existing) {
        await db
          .update(emailReportSettings)
          .set({
            frequency: input.frequency,
            isEnabled: input.isEnabled,
            recipients: input.recipients,
            dayOfWeek: input.dayOfWeek ?? 1,
            dayOfMonth: input.dayOfMonth ?? 1,
            hourOfDay: input.hourOfDay ?? 9,
          })
          .where(eq(emailReportSettings.reportType, input.reportType));
      } else {
        await db.insert(emailReportSettings).values({
          reportType: input.reportType,
          frequency: input.frequency,
          isEnabled: input.isEnabled,
          recipients: input.recipients,
          dayOfWeek: input.dayOfWeek ?? 1,
          dayOfMonth: input.dayOfMonth ?? 1,
          hourOfDay: input.hourOfDay ?? 9,
        });
      }
      
      return { success: true };
    }),

  // Delete a report setting
  delete: adminProcedure
    .input(z.object({ reportType: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .delete(emailReportSettings)
        .where(eq(emailReportSettings.reportType, input.reportType));
      
      return { success: true };
    }),

  // Get email delivery stats for report generation
  getDeliveryStats: adminProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      
      // Get total sent
      const [totalResult] = await db
        .select({ count: count() })
        .from(clientNotificationHistory)
        .where(and(
          gte(clientNotificationHistory.sentAt, start),
          lte(clientNotificationHistory.sentAt, end)
        ));
      
      // Get by status
      const statusCounts = await db
        .select({
          status: clientNotificationHistory.status,
          count: count(),
        })
        .from(clientNotificationHistory)
        .where(and(
          gte(clientNotificationHistory.sentAt, start),
          lte(clientNotificationHistory.sentAt, end)
        ))
        .groupBy(clientNotificationHistory.status);
      
      // Get by category
      const categoryCounts = await db
        .select({
          category: clientNotificationHistory.category,
          count: count(),
        })
        .from(clientNotificationHistory)
        .where(and(
          gte(clientNotificationHistory.sentAt, start),
          lte(clientNotificationHistory.sentAt, end)
        ))
        .groupBy(clientNotificationHistory.category);
      
      const statusMap = Object.fromEntries(statusCounts.map(s => [s.status, s.count]));
      const categoryMap = Object.fromEntries(categoryCounts.map(c => [c.category, c.count]));
      
      const total = totalResult?.count || 0;
      const sent = statusMap['sent'] || 0;
      const failed = statusMap['failed'] || 0;
      const deliveryRate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0';
      
      return {
        total,
        sent,
        failed,
        deliveryRate,
        byCategory: categoryMap,
        byStatus: statusMap,
      };
    }),

  // Send a test report
  sendTestReport: adminProcedure
    .input(z.object({ reportType: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const adminEmail = ctx.user?.email;
      if (!adminEmail) throw new Error("Admin email not found");
      
      // Get stats for the past week
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      // Get total sent
      const [totalResult] = await db
        .select({ count: count() })
        .from(clientNotificationHistory)
        .where(and(
          gte(clientNotificationHistory.sentAt, startDate),
          lte(clientNotificationHistory.sentAt, endDate)
        ));
      
      // Get by status
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
      
      const html = generateReportHtml({
        reportType: input.reportType,
        startDate: startDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' }),
        endDate: endDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' }),
        total,
        sent,
        failed,
        deliveryRate,
      });
      
      const result = await sendEmail({
        to: adminEmail,
        subject: `[TEST] Email Delivery Report - ${startDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' })} to ${endDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' })}`,
        html,
      });
      
      if (!result.success) {
        throw new Error(result.error || "Failed to send test report");
      }
      
      return { success: true, sentTo: adminEmail };
    }),
});

function generateReportHtml(data: {
  reportType: string;
  startDate: string;
  endDate: string;
  total: number;
  sent: number;
  failed: number;
  deliveryRate: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Delivery Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📊 Email Delivery Report</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">${data.startDate} - ${data.endDate}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Summary Stats -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="width: 50%; padding: 15px; text-align: center; background-color: #f8f8f8; border-radius: 8px;">
                    <div style="font-size: 36px; font-weight: bold; color: #f97316;">${data.total}</div>
                    <div style="font-size: 14px; color: #666;">Total Emails</div>
                  </td>
                  <td style="width: 10px;"></td>
                  <td style="width: 50%; padding: 15px; text-align: center; background-color: #f8f8f8; border-radius: 8px;">
                    <div style="font-size: 36px; font-weight: bold; color: #10b981;">${data.deliveryRate}%</div>
                    <div style="font-size: 14px; color: #666;">Delivery Rate</div>
                  </td>
                </tr>
              </table>
              
              <!-- Detailed Stats -->
              <h3 style="color: #333; margin: 0 0 15px; font-size: 16px;">Delivery Breakdown</h3>
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
              </table>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                This is an automated report from Omega Longevity. To adjust report settings, visit the Admin Settings page.
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
