import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { sendEmail } from "../emailService";
import { getDb } from "../db";
import { emailTemplateCustomizations, emailTemplateVersions } from "../../drizzle/schema";
import { eq, desc, and, max } from "drizzle-orm";

// Email template generators
const generateCheckinReminderHtml = (data: Record<string, any>) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Check-In Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Weekly Check-In Reminder</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi ${data.clientName},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                It's time for your weekly check-in! Your check-in is due on <strong>${data.checkInDueDate}</strong>.
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Taking a few minutes to complete your check-in helps us track your progress and adjust your protocol as needed.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.checkInLink}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">Complete Check-In</a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                Best regards,<br>
                ${data.coachName}<br>
                <span style="color: #f97316;">Omega Longevity</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
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

const generatePaymentReminderHtml = (data: Record<string, any>) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Reminder</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi ${data.clientName},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                This is a friendly reminder that your payment of <strong>${data.amountDue}</strong> is due on <strong>${data.dueDate}</strong>.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.paymentLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">Make Payment</a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                If you have any questions about your payment, please don't hesitate to reach out.
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

const generateWelcomeEmailHtml = (data: Record<string, any>) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Omega Longevity</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Omega Longevity!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Your journey to optimal health starts here</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi ${data.clientName},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Welcome to the Omega Longevity family! We're thrilled to have you on board and excited to support you on your health optimization journey.
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Here's what you can expect:
              </p>
              <ul style="color: #333; font-size: 16px; line-height: 1.8; margin: 0 0 20px; padding-left: 20px;">
                <li>Personalized protocol tailored to your goals</li>
                <li>Weekly check-ins to track your progress</li>
                <li>Access to our premium supplement store</li>
                <li>Direct support from ${data.coachName}</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.loginLink}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">Access Your Dashboard</a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                Looking forward to working with you!<br><br>
                ${data.coachName}<br>
                <span style="color: #f97316;">Omega Longevity</span>
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

const generateGenericEmailHtml = (templateId: string, data: Record<string, any>) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${templateId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi ${data.clientName || data.coachName || 'there'},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                This is a preview of the <strong>${templateId.replace(/_/g, ' ')}</strong> email template.
              </p>
              <div style="background-color: #f8f8f8; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="color: #666; font-size: 14px; margin: 0 0 10px;"><strong>Template Data:</strong></p>
                <pre style="color: #333; font-size: 12px; margin: 0; white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</pre>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                Best regards,<br>
                <span style="color: #f97316;">Omega Longevity Team</span>
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

const getTemplateHtml = (templateId: string, data: Record<string, any>): string => {
  switch (templateId) {
    case "checkin_reminder":
    case "checkin_overdue":
      return generateCheckinReminderHtml(data);
    case "payment_reminder":
      return generatePaymentReminderHtml(data);
    case "welcome_email":
      return generateWelcomeEmailHtml(data);
    default:
      return generateGenericEmailHtml(templateId, data);
  }
};

export const emailTemplatesRouter = router({
  // Get email template preview HTML
  getPreview: adminProcedure
    .input(z.object({
      templateId: z.string(),
      sampleData: z.record(z.string(), z.any()),
    }))
    .query(async ({ input }) => {
      return getTemplateHtml(input.templateId, input.sampleData);
    }),

  // Send test email to admin
  sendTest: adminProcedure
    .input(z.object({
      templateId: z.string(),
      sampleData: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      const html = getTemplateHtml(input.templateId, input.sampleData);
      const subject = `[TEST] ${input.templateId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
      
      // Send to the admin's email
      const adminEmail = ctx.user?.email;
      if (!adminEmail) {
        throw new Error("Admin email not found");
      }

      const result = await sendEmail({
        to: adminEmail,
        subject,
        html,
      });
      
      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }

      return { success: true, sentTo: adminEmail };
    }),

  // List all available templates
  list: adminProcedure.query(async () => {
    const db = await getDb();
    
    // Get all customizations from database
    const customizations = db ? await db.select().from(emailTemplateCustomizations) : [];
    const customizationMap = new Map(customizations.map(c => [c.templateKey, c]));
    
    const templates = [
      { id: "checkin_reminder", name: "Check-In Reminder", category: "checkin", variables: ["clientName", "checkInDueDate", "checkInLink", "coachName"] },
      { id: "checkin_overdue", name: "Check-In Overdue Alert", category: "checkin", variables: ["clientName", "checkInDueDate", "checkInLink", "coachName"] },
      { id: "payment_reminder", name: "Payment Reminder", category: "payment", variables: ["clientName", "amountDue", "dueDate", "paymentLink"] },
      { id: "protocol_update", name: "Protocol Update Notification", category: "protocol", variables: ["clientName", "protocolName", "coachName", "protocolLink"] },
      { id: "protocol_link", name: "Protocol Link Email", category: "protocol", variables: ["clientName", "protocolName", "coachName", "protocolLink"] },
      { id: "welcome_email", name: "Welcome Email", category: "welcome", variables: ["clientName", "coachName", "loginLink"] },
      { id: "daily_digest", name: "Daily Digest", category: "digest", variables: ["coachName", "summaryItems", "date"] },
      { id: "weekly_summary", name: "Weekly Summary", category: "digest", variables: ["coachName", "summaryItems", "weekRange"] },
      { id: "shipping_notification", name: "Shipping Notification", category: "shipping", variables: ["clientName", "orderNumber", "trackingNumber", "carrier"] },
      { id: "document_request", name: "Document Request", category: "document", variables: ["clientName", "documentType", "dueDate", "uploadLink"] },
    ];
    
    return templates.map(t => ({
      ...t,
      isCustomized: customizationMap.has(t.id),
      customization: customizationMap.get(t.id) || null,
    }));
  }),

  // Get customization for a specific template
  getCustomization: adminProcedure
    .input(z.object({ templateKey: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [customization] = await db
        .select()
        .from(emailTemplateCustomizations)
        .where(eq(emailTemplateCustomizations.templateKey, input.templateKey));
      
      return customization || null;
    }),

  // Save or update template customization
  saveCustomization: adminProcedure
    .input(z.object({
      templateKey: z.string(),
      subject: z.string().optional(),
      bodyHtml: z.string().optional(),
      bodyText: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if customization exists
      const [existing] = await db
        .select()
        .from(emailTemplateCustomizations)
        .where(eq(emailTemplateCustomizations.templateKey, input.templateKey));
      
      if (existing) {
        // Update existing
        await db
          .update(emailTemplateCustomizations)
          .set({
            subject: input.subject,
            bodyHtml: input.bodyHtml,
            bodyText: input.bodyText,
            isActive: input.isActive,
            updatedBy: ctx.user?.id,
          })
          .where(eq(emailTemplateCustomizations.templateKey, input.templateKey));
      } else {
        // Insert new
        await db.insert(emailTemplateCustomizations).values({
          templateKey: input.templateKey,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          isActive: input.isActive ?? true,
          updatedBy: ctx.user?.id,
        });
      }
      
      return { success: true };
    }),

  // Reset template to default
  resetToDefault: adminProcedure
    .input(z.object({ templateKey: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .delete(emailTemplateCustomizations)
        .where(eq(emailTemplateCustomizations.templateKey, input.templateKey));
      
      return { success: true };
    }),

  // ========== VERSION MANAGEMENT ==========
  
  // Save a new version of a template
  saveVersion: adminProcedure
    .input(z.object({
      templateKey: z.string(),
      versionName: z.string().optional(),
      versionNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get current customization
      const [current] = await db
        .select()
        .from(emailTemplateCustomizations)
        .where(eq(emailTemplateCustomizations.templateKey, input.templateKey));
      
      if (!current) {
        throw new Error("No customization found for this template");
      }
      
      // Get the next version number
      const [maxVersionResult] = await db
        .select({ maxVersion: max(emailTemplateVersions.version) })
        .from(emailTemplateVersions)
        .where(eq(emailTemplateVersions.templateKey, input.templateKey));
      
      const nextVersion = (maxVersionResult?.maxVersion || 0) + 1;
      
      // Save the version
      await db.insert(emailTemplateVersions).values({
        templateKey: input.templateKey,
        version: nextVersion,
        subject: current.subject,
        bodyHtml: current.bodyHtml,
        bodyText: current.bodyText,
        versionName: input.versionName || `Version ${nextVersion}`,
        versionNotes: input.versionNotes,
        createdBy: ctx.user?.id,
      });
      
      return { success: true, version: nextVersion };
    }),

  // List all versions of a template
  listVersions: adminProcedure
    .input(z.object({ templateKey: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const versions = await db
        .select()
        .from(emailTemplateVersions)
        .where(eq(emailTemplateVersions.templateKey, input.templateKey))
        .orderBy(desc(emailTemplateVersions.version));
      
      return versions;
    }),

  // Get a specific version
  getVersion: adminProcedure
    .input(z.object({
      templateKey: z.string(),
      version: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [versionData] = await db
        .select()
        .from(emailTemplateVersions)
        .where(and(
          eq(emailTemplateVersions.templateKey, input.templateKey),
          eq(emailTemplateVersions.version, input.version)
        ));
      
      return versionData || null;
    }),

  // Restore a previous version
  restoreVersion: adminProcedure
    .input(z.object({
      templateKey: z.string(),
      version: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get the version to restore
      const [versionData] = await db
        .select()
        .from(emailTemplateVersions)
        .where(and(
          eq(emailTemplateVersions.templateKey, input.templateKey),
          eq(emailTemplateVersions.version, input.version)
        ));
      
      if (!versionData) {
        throw new Error("Version not found");
      }
      
      // Check if customization exists
      const [existing] = await db
        .select()
        .from(emailTemplateCustomizations)
        .where(eq(emailTemplateCustomizations.templateKey, input.templateKey));
      
      if (existing) {
        // Update existing customization with version data
        await db
          .update(emailTemplateCustomizations)
          .set({
            subject: versionData.subject,
            bodyHtml: versionData.bodyHtml,
            bodyText: versionData.bodyText,
            updatedBy: ctx.user?.id,
          })
          .where(eq(emailTemplateCustomizations.templateKey, input.templateKey));
      } else {
        // Create new customization from version
        await db.insert(emailTemplateCustomizations).values({
          templateKey: input.templateKey,
          subject: versionData.subject,
          bodyHtml: versionData.bodyHtml,
          bodyText: versionData.bodyText,
          isActive: true,
          updatedBy: ctx.user?.id,
        });
      }
      
      return { success: true, restoredVersion: input.version };
    }),

  // Delete a version
  deleteVersion: adminProcedure
    .input(z.object({
      templateKey: z.string(),
      version: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .delete(emailTemplateVersions)
        .where(and(
          eq(emailTemplateVersions.templateKey, input.templateKey),
          eq(emailTemplateVersions.version, input.version)
        ));
      
      return { success: true };
    }),

  // Compare two versions
  compareVersions: adminProcedure
    .input(z.object({
      templateKey: z.string(),
      version1: z.number(),
      version2: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [v1] = await db
        .select()
        .from(emailTemplateVersions)
        .where(and(
          eq(emailTemplateVersions.templateKey, input.templateKey),
          eq(emailTemplateVersions.version, input.version1)
        ));
      
      const [v2] = await db
        .select()
        .from(emailTemplateVersions)
        .where(and(
          eq(emailTemplateVersions.templateKey, input.templateKey),
          eq(emailTemplateVersions.version, input.version2)
        ));
      
      return {
        version1: v1 || null,
        version2: v2 || null,
      };
    }),
});
