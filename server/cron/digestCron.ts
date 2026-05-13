import { getDb } from "../db";
import { sendEmail } from "../emailService";
import { clientNotificationHistory } from "../../drizzle/schema";
import { 
  checkins, checkinSchedules, clientInventory, documents,
  users, clientProtocols 
} from "../../drizzle/schema";
import { eq, and, sql, gte, lte, isNull } from "drizzle-orm";

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

// Send daily digest to coaches
export async function sendDailyDigest() {
  console.log("[Digest] Starting daily digest...");
  
  try {
    const database = await db();
    
    // Get admin users (coaches)
    const admins = await database
      .select()
      .from(users)
      .where(eq(users.role, 'admin'));
    
    if (admins.length === 0) {
      console.log("[Digest] No admin users found");
      return;
    }
    
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    // Get pending check-in reviews
    const pendingReviews = await database
      .select()
      .from(checkins)
      .where(and(
        eq(checkins.status, 'submitted'),
        isNull(checkins.reviewedAt)
      ));
    
    // Get low score check-ins from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lowScoreCheckins = await database
      .select()
      .from(checkins)
      .where(and(
        eq(checkins.hasLowScore, true),
        gte(checkins.submittedAt, yesterday)
      ));
    
    // Get low inventory items
    const lowInventoryItems = await database
      .select()
      .from(clientInventory)
      .where(sql`${clientInventory.status} IN ('running_low', 'out')`);
    
    // Get new documents uploaded today
    const newDocuments = await database
      .select()
      .from(documents)
      .where(and(
        gte(documents.createdAt, yesterday),
        eq(documents.uploadedBy, 'client')
      ));
    
    // Build digest content
    const digestItems: string[] = [];
    
    if (pendingReviews.length > 0) {
      digestItems.push(`📋 **${pendingReviews.length} check-in(s)** awaiting your review`);
    }
    
    if (lowScoreCheckins.length > 0) {
      digestItems.push(`⚠️ **${lowScoreCheckins.length} low score alert(s)** in the last 24 hours`);
    }
    
    if (lowInventoryItems.length > 0) {
      const outOfStock = lowInventoryItems.filter(i => i.status === 'out').length;
      const runningLow = lowInventoryItems.filter(i => i.status === 'running_low').length;
      if (outOfStock > 0) {
        digestItems.push(`🔴 **${outOfStock} item(s)** out of stock`);
      }
      if (runningLow > 0) {
        digestItems.push(`🟡 **${runningLow} item(s)** running low`);
      }
    }
    
    if (newDocuments.length > 0) {
      digestItems.push(`📄 **${newDocuments.length} new document(s)** uploaded by clients`);
    }
    
    // Only send if there's something to report
    if (digestItems.length === 0) {
      console.log("[Digest] No items to report, skipping digest");
      return;
    }
    
    // Send to each admin
    for (const admin of admins) {
      if (!admin.email) continue;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Daily Operations Digest</h2>
          <p style="color: #666;">Here's what needs your attention today:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${digestItems.map(item => `<p style="margin: 10px 0;">${item}</p>`).join('')}
          </div>
          
          <p style="margin-top: 20px;">
            <a href="${process.env.VITE_APP_URL || 'https://app.example.com'}/admin/client-corner" 
               style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Operations Dashboard
            </a>
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated daily digest from your Health Coach Protocol Manager.
          </p>
        </div>
      `;
      
      try {
        await sendEmail({
          to: admin.email,
          subject: `Daily Digest: ${digestItems.length} item(s) need attention`,
          html: htmlContent,
        });
        
        // Log notification for admin (using admin's own ID as clientProtocolId)
        await database.insert(clientNotificationHistory).values({
          clientProtocolId: admin.id,
          recipientEmail: admin.email,
          recipientName: admin.name || 'Admin',
          notificationType: 'digest',
          category: 'digest',
          subject: `Daily Digest: ${digestItems.length} item(s) need attention`,
          status: 'sent',
          sentAt: new Date(),
        });
        
        console.log(`[Digest] Sent daily digest to ${admin.email}`);
      } catch (emailError) {
        // Log failed notification
        await database.insert(clientNotificationHistory).values({
          clientProtocolId: admin.id,
          recipientEmail: admin.email,
          recipientName: admin.name || 'Admin',
          notificationType: 'digest',
          category: 'digest',
          subject: `Daily Digest: ${digestItems.length} item(s) need attention`,
          status: 'failed',
          errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
        console.error(`[Digest] Failed to send daily digest to ${admin.email}:`, emailError);
      }
    }
    
    console.log("[Digest] Daily digest completed");
  } catch (error) {
    console.error("[Digest] Error sending daily digest:", error);
  }
}

// Send weekly summary to coaches
export async function sendWeeklySummary() {
  console.log("[Digest] Starting weekly summary...");
  
  try {
    const database = await db();
    
    // Get admin users (coaches)
    const admins = await database
      .select()
      .from(users)
      .where(eq(users.role, 'admin'));
    
    if (admins.length === 0) {
      console.log("[Digest] No admin users found");
      return;
    }
    
    // Get last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get check-in stats for the week
    const weeklyCheckins = await database
      .select()
      .from(checkins)
      .where(gte(checkins.submittedAt, weekAgo));
    
    const totalSubmitted = weeklyCheckins.length;
    const totalReviewed = weeklyCheckins.filter(c => c.reviewedAt).length;
    const lowScoreCount = weeklyCheckins.filter(c => c.hasLowScore).length;
    
    // Calculate average score
    const scoresWithValues = weeklyCheckins.filter(c => c.overallScore !== null);
    const avgScore = scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, c) => sum + (c.overallScore || 0), 0) / scoresWithValues.length
      : 0;
    
    // Get enabled clients count
    const enabledSchedules = await database
      .select()
      .from(checkinSchedules)
      .where(eq(checkinSchedules.isEnabled, true));
    
    // Build summary content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Weekly Check-In Summary</h2>
        <p style="color: #666;">Here's your weekly overview:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Check-In Statistics</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;">Total Submitted:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${totalSubmitted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Reviewed:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${totalReviewed}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Pending Review:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${totalSubmitted - totalReviewed}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Low Score Alerts:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${lowScoreCount > 0 ? '#ef4444' : '#22c55e'};">${lowScoreCount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Average Score:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${avgScore.toFixed(1)}/10</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Active Clients</h3>
          <p style="margin: 0;"><strong>${enabledSchedules.length}</strong> clients have check-ins enabled</p>
        </div>
        
        <p style="margin-top: 20px;">
          <a href="${process.env.VITE_APP_URL || 'https://app.example.com'}/admin/client-corner" 
             style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Full Dashboard
          </a>
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This is an automated weekly summary from your Health Coach Protocol Manager.
        </p>
      </div>
    `;
    
    // Send to each admin
    for (const admin of admins) {
      if (!admin.email) continue;
      
      try {
        await sendEmail({
          to: admin.email,
          subject: `Weekly Summary: ${totalSubmitted} check-ins, ${avgScore.toFixed(1)} avg score`,
          html: htmlContent,
        });
        
        // Log notification
        await database.insert(clientNotificationHistory).values({
          clientProtocolId: admin.id,
          recipientEmail: admin.email,
          recipientName: admin.name || 'Admin',
          notificationType: 'weekly_summary',
          category: 'digest',
          subject: `Weekly Summary: ${totalSubmitted} check-ins, ${avgScore.toFixed(1)} avg score`,
          status: 'sent',
          sentAt: new Date(),
        });
        
        console.log(`[Digest] Sent weekly summary to ${admin.email}`);
      } catch (emailError) {
        await database.insert(clientNotificationHistory).values({
          clientProtocolId: admin.id,
          recipientEmail: admin.email,
          recipientName: admin.name || 'Admin',
          notificationType: 'weekly_summary',
          category: 'digest',
          subject: `Weekly Summary: ${totalSubmitted} check-ins, ${avgScore.toFixed(1)} avg score`,
          status: 'failed',
          errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
        console.error(`[Digest] Failed to send weekly summary to ${admin.email}:`, emailError);
      }
    }
    
    console.log("[Digest] Weekly summary completed");
  } catch (error) {
    console.error("[Digest] Error sending weekly summary:", error);
  }
}

// Helper to format notification type for display
function formatNotificationType(type: string): string {
  const typeLabels: Record<string, string> = {
    protocol_approved: "Protocol Approved",
    protocol_viewed: "Protocol Viewed",
    protocol_updated: "Protocol Updated",
    protocol_option_selected: "Option Selected",
    payment_received: "Payment Received",
    payment_failed: "Payment Failed",
    payment_refunded: "Payment Refunded",
    venmo_pending: "Venmo Pending",
    checkin_submitted: "Check-in Submitted",
    low_checkin_score: "Low Check-in Score",
    new_store_order: "New Store Order",
    waiver_signed: "Waiver Signed",
    packing_slip_created: "Packing Slip Created",
    inventory_out_of_stock: "Out of Stock Alert",
    profile_completed: "Profile Completed",
    intake_completed: "Intake Completed",
    client_comment: "Client Comment",
    new_user_registered: "New User Registered",
    referral_submitted: "Referral Conversion",
    appointment_booked: "Appointment Booked",
    appointment_cancelled: "Appointment Cancelled",
    other: "Other",
  };
  return typeLabels[type] || type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// Group notifications by type for the user digest
function groupNotificationsByType(notifications: Array<{ type: string; title: string; message: string | null; createdAt: Date }>) {
  const grouped: Record<string, Array<{ title: string; message: string | null; createdAt: Date }>> = {};
  
  for (const notification of notifications) {
    if (!grouped[notification.type]) {
      grouped[notification.type] = [];
    }
    grouped[notification.type].push({
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });
  }
  
  return grouped;
}

// Generate user notification digest email HTML
function generateUserDigestEmailHtml(
  userName: string,
  frequency: "daily" | "weekly",
  notifications: Array<{ type: string; title: string; message: string | null; createdAt: Date }>,
  appUrl: string
): string {
  const grouped = groupNotificationsByType(notifications);
  const totalCount = notifications.length;
  
  let notificationSections = "";
  
  for (const [type, items] of Object.entries(grouped)) {
    const typeLabel = formatNotificationType(type);
    notificationSections += `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">
            ${typeLabel} (${items.length})
          </div>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            ${items.slice(0, 5).map(item => `
              <li style="margin-bottom: 4px;">
                ${item.title}
                ${item.message ? `<span style="color: #6b7280;"> - ${item.message.substring(0, 100)}${item.message.length > 100 ? '...' : ''}</span>` : ''}
              </li>
            `).join('')}
            ${items.length > 5 ? `<li style="color: #6b7280; font-style: italic;">...and ${items.length - 5} more</li>` : ''}
          </ul>
        </td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${frequency === "daily" ? "Daily" : "Weekly"} Notification Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                ${frequency === "daily" ? "Daily" : "Weekly"} Notification Digest
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px;">
              <p style="margin: 0; color: #1f2937; font-size: 16px;">Hi ${userName || "there"},</p>
              <p style="margin: 16px 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Here's your ${frequency} summary of ${totalCount} notification${totalCount !== 1 ? 's' : ''} from your coaching platform:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <div style="font-size: 36px; font-weight: 700; color: #f97316;">${totalCount}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Unread Notification${totalCount !== 1 ? 's' : ''}</div>
                  </td>
                  <td style="padding: 20px; text-align: center; border-left: 1px solid #e5e7eb;">
                    <div style="font-size: 36px; font-weight: 700; color: #3b82f6;">${Object.keys(grouped).length}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Categories</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${notificationSections || '<tr><td style="padding: 32px; text-align: center; color: #6b7280;">No new notifications in this period.</td></tr>'}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${appUrl}/admin/notifications" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">View All Notifications</a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                You're receiving this because you enabled ${frequency} digests.<br>
                <a href="${appUrl}/admin/notification-settings" style="color: #f97316; text-decoration: none;">Manage notification preferences</a>
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

// Send user-specific notification digest
async function sendUserNotificationDigest(
  user: { id: number; email: string | null; name: string | null; digestSendTime: string | null },
  frequency: "daily" | "weekly",
  appUrl: string
): Promise<boolean> {
  if (!user.email) {
    console.log(`[Digest] Skipping user ${user.id} - no email address`);
    return false;
  }

  try {
    const database = await db();
    
    // Get digest settings to find last sent time
    const digestSettings = await import("../db").then(m => m.getUserDigestSettings(user.id));
    
    // Get unread notifications since last digest
    const notifications = await import("../db").then(m => m.getUnreadNotificationsForDigest(user.id, digestSettings.lastSentAt));
    
    if (notifications.length === 0) {
      console.log(`[Digest] Skipping user ${user.id} - no new notifications`);
      await import("../db").then(m => m.updateDigestLastSent(user.id));
      return true;
    }

    const html = generateUserDigestEmailHtml(user.name || "there", frequency, notifications, appUrl);
    
    await sendEmail({
      to: user.email,
      subject: `Your ${frequency === "daily" ? "Daily" : "Weekly"} Notification Summary - ${notifications.length} update${notifications.length !== 1 ? 's' : ''}`,
      html,
    });

    await import("../db").then(m => m.updateDigestLastSent(user.id));
    
    console.log(`[Digest] Sent ${frequency} digest to user ${user.id} (${user.email}) with ${notifications.length} notifications`);
    return true;
  } catch (error) {
    console.error(`[Digest] Error sending digest to user ${user.id}:`, error);
    return false;
  }
}

// Process user-specific daily digests
async function processUserDailyDigests() {
  console.log("[Digest] Processing user daily digests...");
  
  const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://app.example.com";
  const currentHour = new Date().getHours();
  
  try {
    const dbModule = await import("../db");
    const users = await dbModule.getUsersForDigest("daily");
    console.log(`[Digest] Found ${users.length} users with daily digest enabled`);
    
    let sent = 0;
    for (const user of users) {
      const userSendTime = user.digestSendTime || "09:00";
      const [userHour] = userSendTime.split(":").map(Number);
      
      if (Math.abs(currentHour - userHour) <= 0) {
        const success = await sendUserNotificationDigest(user, "daily", appUrl);
        if (success) sent++;
      }
    }
    
    console.log(`[Digest] Sent ${sent} user daily digests`);
  } catch (error) {
    console.error("[Digest] Error processing user daily digests:", error);
  }
}

// Process user-specific weekly digests (Mondays)
async function processUserWeeklyDigests() {
  const today = new Date();
  if (today.getDay() !== 1) return;
  
  console.log("[Digest] Processing user weekly digests (Monday)...");
  
  const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://app.example.com";
  const currentHour = new Date().getHours();
  
  try {
    const dbModule = await import("../db");
    const users = await dbModule.getUsersForDigest("weekly");
    console.log(`[Digest] Found ${users.length} users with weekly digest enabled`);
    
    let sent = 0;
    for (const user of users) {
      const userSendTime = user.digestSendTime || "09:00";
      const [userHour] = userSendTime.split(":").map(Number);
      
      if (Math.abs(currentHour - userHour) <= 0) {
        const success = await sendUserNotificationDigest(user, "weekly", appUrl);
        if (success) sent++;
      }
    }
    
    console.log(`[Digest] Sent ${sent} user weekly digests`);
  } catch (error) {
    console.error("[Digest] Error processing user weekly digests:", error);
  }
}

// Initialize digest cron jobs
export function initializeDigestCron() {
  // Import node-cron
  import('node-cron').then(cron => {
    // Daily digest at 8 AM every day (admin operations digest)
    cron.schedule('0 8 * * *', () => {
      console.log("[Digest] Running daily digest cron job");
      sendDailyDigest();
    });
    
    // Weekly summary at 9 AM every Monday (admin operations summary)
    cron.schedule('0 9 * * 1', () => {
      console.log("[Digest] Running weekly summary cron job");
      sendWeeklySummary();
    });
    
    // User-specific notification digests - run every hour to check for users who need digests
    cron.schedule('0 * * * *', () => {
      console.log("[Digest] Running user notification digest cron job");
      processUserDailyDigests();
      processUserWeeklyDigests();
    });
    
    console.log("[Digest] Digest cron jobs initialized");
  }).catch(err => {
    console.error("[Digest] Failed to initialize digest cron:", err);
  });
}
