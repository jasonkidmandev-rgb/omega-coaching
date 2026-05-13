/**
 * Weekly Team Digest Email Cron
 * Sends a summary every Monday at 8:00 AM to Jason, Shannon, Lisa, and Vee
 * Includes: new enrollments, stalled clients, pending protocol builds, team task summary
 */

import { getDb } from "../db";
import { sendEmail } from "../emailService";
import { sql } from "drizzle-orm";

// Team recipients
const DIGEST_RECIPIENTS = [
  { name: "Jason Kidman", email: "jason@kidmancorp.com", role: "Admin" },
  { name: "Shannon", email: "shannon@omegalongevity.com", role: "Lead Pipeline" },
  { name: "Lisa", email: "lisa@omegalongevity.com", role: "Client Care" },
  { name: "Vee (Vilma)", email: "vilma@omegalongevity.com", role: "Drop-ship Orders" },
];

interface DigestData {
  newEnrollments: Array<{ clientName: string; tier: string; paidAt: string; status: string }>;
  stalledClients: Array<{ clientName: string; projectStatus: string; completedTasks: number; totalTasks: number; hoursStalled: number }>;
  pendingProtocols: Array<{ clientName: string; status: string; createdAt: string; daysPending: number }>;
  teamTaskSummary: Array<{ teamMember: string; pendingTasks: number; overdueTasks: number; completedThisWeek: number }>;
  weeklyStats: {
    totalNewClients: number;
    totalPaymentsReceived: number;
    totalTasksCompleted: number;
    totalStalledClients: number;
    totalPendingProtocols: number;
  };
}

async function gatherDigestData(): Promise<DigestData> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStr = oneWeekAgo.toISOString().slice(0, 19).replace('T', ' ');

  // 1. New enrollments this week
  const [newEnrollments] = await database.execute(sql`
    SELECT 
      te.clientName,
      te.selectedTier as tier,
      te.coachingPaidAt as paidAt,
      te.status
    FROM transformation_enrollments te
    WHERE te.coachingPaidAt >= ${weekAgoStr}
    ORDER BY te.coachingPaidAt DESC
  `) as any;

  // 2. Stalled clients (48+ hours with no task progress)
  const [stalledClients] = await database.execute(sql`
    SELECT 
      cp.clientName,
      cp.status as projectStatus,
      (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id) as totalTasks,
      (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed') as completedTasks,
      TIMESTAMPDIFF(HOUR, COALESCE(
        (SELECT MAX(pt.updatedAt) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed'),
        cp.createdAt
      ), NOW()) as hoursStalled
    FROM client_projects cp
    WHERE cp.status IN ('active', 'in_progress', 'pending')
    HAVING hoursStalled >= 48
    ORDER BY hoursStalled DESC
    LIMIT 15
  `) as any;

  // 3. Pending protocol builds (draft/pending protocols without completion)
  const [pendingProtocols] = await database.execute(sql`
    SELECT 
      cpr.clientName,
      cpr.status,
      cpr.createdAt,
      TIMESTAMPDIFF(DAY, cpr.createdAt, NOW()) as daysPending
    FROM client_protocols cpr
    WHERE cpr.status IN ('draft', 'pending')
    AND cpr.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ORDER BY cpr.createdAt DESC
    LIMIT 10
  `) as any;

  // 4. Team task summary
  const [teamTasks] = await database.execute(sql`
    SELECT 
      tm.name as teamMember,
      SUM(CASE WHEN pt.status IN ('pending', 'in_progress') THEN 1 ELSE 0 END) as pendingTasks,
      SUM(CASE WHEN pt.status IN ('pending', 'in_progress') AND pt.dueDate < NOW() THEN 1 ELSE 0 END) as overdueTasks,
      SUM(CASE WHEN pt.status = 'completed' AND pt.completedAt >= ${weekAgoStr} THEN 1 ELSE 0 END) as completedThisWeek
    FROM team_members tm
    LEFT JOIN project_tasks pt ON pt.assignedTeamMemberId = tm.id
    WHERE tm.isActive = 1
    GROUP BY tm.id, tm.name
    ORDER BY tm.name
  `) as any;

  // 5. Weekly stats
  const [paymentsThisWeek] = await database.execute(sql`
    SELECT COUNT(*) as cnt FROM client_protocols 
    WHERE paymentStatus = 'paid' AND paymentReceivedAt >= ${weekAgoStr}
  `) as any;

  const [tasksCompletedThisWeek] = await database.execute(sql`
    SELECT COUNT(*) as cnt FROM project_tasks 
    WHERE status = 'completed' AND completedAt >= ${weekAgoStr}
  `) as any;

  return {
    newEnrollments: newEnrollments || [],
    stalledClients: stalledClients || [],
    pendingProtocols: pendingProtocols || [],
    teamTaskSummary: teamTasks || [],
    weeklyStats: {
      totalNewClients: (newEnrollments || []).length,
      totalPaymentsReceived: paymentsThisWeek?.[0]?.cnt || 0,
      totalTasksCompleted: tasksCompletedThisWeek?.[0]?.cnt || 0,
      totalStalledClients: (stalledClients || []).length,
      totalPendingProtocols: (pendingProtocols || []).length,
    },
  };
}

function buildDigestEmailHtml(data: DigestData, recipientName: string): string {
  const appUrl = process.env.VITE_APP_URL || "https://peptidecoach.pro";
  const primaryColor = "#ea580c";
  const secondaryColor = "#1e40af";

  // New enrollments section
  const enrollmentsHtml = data.newEnrollments.length > 0
    ? data.newEnrollments.map(e => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${e.clientName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${e.tier || 'N/A'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${e.status}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${e.paidAt ? new Date(e.paidAt).toLocaleDateString('en-US', { timeZone: 'America/Denver' }) : 'Pending'}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8; font-size: 14px;">No new enrollments this week</td></tr>`;

  // Stalled clients section
  const stalledHtml = data.stalledClients.length > 0
    ? data.stalledClients.slice(0, 10).map(s => {
        const days = Math.round(s.hoursStalled / 24);
        const pct = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
        const urgency = s.hoursStalled >= 72 ? '🔴' : '🟡';
        return `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${urgency} ${s.clientName}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${s.completedTasks}/${s.totalTasks} (${pct}%)</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${days} days</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #22c55e; font-size: 14px;">No stalled clients — great work!</td></tr>`;

  // Pending protocols section
  const protocolsHtml = data.pendingProtocols.length > 0
    ? data.pendingProtocols.map(p => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${p.clientName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${p.status}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${p.daysPending}d</td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #22c55e; font-size: 14px;">All protocols are up to date</td></tr>`;

  // Team task summary
  const teamHtml = data.teamTaskSummary.map(t => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 600;">${t.teamMember}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${t.pendingTasks || 0}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: ${(t.overdueTasks || 0) > 0 ? '#ef4444' : '#22c55e'};">${t.overdueTasks || 0}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #22c55e;">${t.completedThisWeek || 0}</td>
    </tr>
  `).join('');

  const weekDate = new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric', year: 'numeric' });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 20px 0;">
        <tr><td align="center">
          <table width="640" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Omega Longevity</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 13px;">Weekly Team Digest</p>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding: 24px 30px 0 30px;">
                <p style="margin: 0; font-size: 16px; color: #334155;">Hi ${recipientName},</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">Here's your weekly summary for the week of ${weekDate}.</p>
              </td>
            </tr>

            <!-- Quick Stats -->
            <tr>
              <td style="padding: 20px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="20%" style="text-align: center; padding: 12px;">
                      <div style="font-size: 28px; font-weight: 700; color: ${primaryColor};">${data.weeklyStats.totalNewClients}</div>
                      <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">New Clients</div>
                    </td>
                    <td width="20%" style="text-align: center; padding: 12px;">
                      <div style="font-size: 28px; font-weight: 700; color: #22c55e;">${data.weeklyStats.totalPaymentsReceived}</div>
                      <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Payments</div>
                    </td>
                    <td width="20%" style="text-align: center; padding: 12px;">
                      <div style="font-size: 28px; font-weight: 700; color: ${secondaryColor};">${data.weeklyStats.totalTasksCompleted}</div>
                      <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Tasks Done</div>
                    </td>
                    <td width="20%" style="text-align: center; padding: 12px;">
                      <div style="font-size: 28px; font-weight: 700; color: ${data.weeklyStats.totalStalledClients > 0 ? '#ef4444' : '#22c55e'};">${data.weeklyStats.totalStalledClients}</div>
                      <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Stalled</div>
                    </td>
                    <td width="20%" style="text-align: center; padding: 12px;">
                      <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${data.weeklyStats.totalPendingProtocols}</div>
                      <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Pending</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- New Enrollments -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid ${primaryColor};">New Enrollments This Week</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Client</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Tier</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Status</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Paid</th>
                  </tr>
                  ${enrollmentsHtml}
                </table>
              </td>
            </tr>

            <!-- Stalled Clients -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #ef4444;">Stalled Clients (48+ Hours)</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Client</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Progress</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Stalled</th>
                  </tr>
                  ${stalledHtml}
                </table>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">🔴 = 72+ hours (escalated) | 🟡 = 48-72 hours</p>
              </td>
            </tr>

            <!-- Pending Protocol Builds -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #f59e0b;">Pending Protocol Builds</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Client</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Status</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Waiting</th>
                  </tr>
                  ${protocolsHtml}
                </table>
              </td>
            </tr>

            <!-- Team Task Summary -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid ${secondaryColor};">Team Task Summary</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Team Member</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Pending</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Overdue</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Done (7d)</th>
                  </tr>
                  ${teamHtml}
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding: 10px 30px 24px 30px; text-align: center;">
                <a href="${appUrl}/admin" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Dashboard</a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">This is an automated weekly digest from Omega Longevity.</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Sent every Monday at 8:00 AM</p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendWeeklyTeamDigest(): Promise<{ success: boolean; sentTo: string[]; error?: string }> {
  console.log("[WeeklyDigest] Starting weekly team digest...");
  
  try {
    const data = await gatherDigestData();
    const sentTo: string[] = [];
    const errors: string[] = [];

    for (const recipient of DIGEST_RECIPIENTS) {
      try {
        const html = buildDigestEmailHtml(data, recipient.name);
        const weekDate = new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric' });
        
        const result = await sendEmail({
          to: recipient.email,
          subject: `Weekly Team Digest — ${weekDate} | ${data.weeklyStats.totalNewClients} new clients, ${data.weeklyStats.totalStalledClients} stalled`,
          html,
          _logCategory: 'digest',
          _logType: 'weekly_team_digest',
          _logRecipientName: recipient.name,
          _logTriggeredBy: 'cron',
        });

        if (result.success) {
          sentTo.push(recipient.email);
          console.log(`[WeeklyDigest] Sent to ${recipient.name} (${recipient.email})`);
        } else {
          errors.push(`${recipient.name}: ${result.error}`);
          console.error(`[WeeklyDigest] Failed to send to ${recipient.name}:`, result.error);
        }
      } catch (err: any) {
        errors.push(`${recipient.name}: ${err.message}`);
        console.error(`[WeeklyDigest] Error sending to ${recipient.name}:`, err.message);
      }
    }

    // Log the automation event
    try {
      const database = await getDb();
      if (database) {
        await database.execute(sql`
          INSERT INTO automation_events (eventType, status, sourceType, details, createdAt)
          VALUES ('weekly_digest', 'completed', 'cron', ${JSON.stringify({
            sentTo,
            errors,
            stats: data.weeklyStats,
          })}, NOW())
        `);
      }
    } catch (logErr) {
      console.error("[WeeklyDigest] Failed to log automation event:", logErr);
    }

    console.log(`[WeeklyDigest] Complete. Sent to ${sentTo.length}/${DIGEST_RECIPIENTS.length} recipients.`);
    return { success: true, sentTo };
  } catch (err: any) {
    console.error("[WeeklyDigest] Fatal error:", err.message);
    return { success: false, sentTo: [], error: err.message };
  }
}

export function initWeeklyTeamDigestCron() {
  import('node-cron').then(cron => {
    // Every Monday at 8:00 AM
    cron.schedule('0 8 * * 1', () => {
      console.log("[WeeklyDigest] Running weekly team digest cron job");
      sendWeeklyTeamDigest();
    });
    
    console.log("[WeeklyDigest] Weekly team digest cron initialized (Mondays at 8:00 AM)");
  }).catch(err => {
    console.error("[WeeklyDigest] Failed to initialize cron:", err);
  });
}
