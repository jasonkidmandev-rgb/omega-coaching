/**
 * Shannon's Daily Pipeline Email Cron
 * Sends every day at 8:00 AM with her overdue callbacks, hot leads,
 * follow-up queue, and conversion stats — the full pipeline scorecard in her inbox.
 */

import { getDb } from "../db";
import { sendEmail } from "../emailService";
import { sql } from "drizzle-orm";

const SHANNON_EMAIL = "shannon@omegalongevity.com";
const SHANNON_NAME = "Shannon";

export interface PipelineEmailData {
  overdueCallbacks: Array<{
    name: string; phone: string; status: string; source: string;
    nextFollowUpAt: string; followUpCount: number; hoursOverdue: number;
    thingsToKnow: string;
  }>;
  hotLeads: Array<{
    name: string; phone: string; email: string; status: string;
    source: string; followUpCount: number; totalClicks: number;
    lastContactedAt: string; thingsToKnow: string;
  }>;
  followUpQueue: Array<{
    name: string; phone: string; status: string; source: string;
    nextFollowUpAt: string; followUpCount: number; hoursOverdue: number;
    thingsToKnow: string;
  }>;
  recentConversions: Array<{
    name: string; tier: string; enrolledAt: string; daysToConvert: number;
  }>;
  stats: {
    totalProspects: number;
    overdueFollowUps: number;
    hotLeadCount: number;
    conversionRate: number;
    weeklyNewProspects: number;
    todayFollowUps: number;
  };
}

export async function gatherPipelineData(): Promise<PipelineEmailData> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  // 1. Overdue callbacks
  const [overdueRows] = await database.execute(sql`
    SELECT 
      p.name, p.phone, p.status, p.source,
      p.nextFollowUpAt, p.followUpCount, p.lastContactedAt,
      p.thingsToKnow,
      TIMESTAMPDIFF(HOUR, p.nextFollowUpAt, NOW()) as hoursOverdue
    FROM prospects p
    WHERE p.nextFollowUpAt < NOW()
      AND p.status NOT IN ('enrolled', 'declined')
      AND p.followUpPaused = 0
      AND p.smsOptOut = 0
    ORDER BY p.nextFollowUpAt ASC
    LIMIT 20
  `) as any;

  // 2. Hot leads
  const [hotRows] = await database.execute(sql`
    SELECT 
      p.name, p.phone, p.email, p.status, p.source,
      p.followUpCount, p.totalClicks, p.lastContactedAt,
      p.thingsToKnow
    FROM prospects p
    WHERE p.status IN ('ready_for_consult', 'engaged', 'waiting_on_client')
      AND p.smsOptOut = 0
    ORDER BY 
      CASE p.status
        WHEN 'ready_for_consult' THEN 0
        WHEN 'engaged' THEN 1
        WHEN 'waiting_on_client' THEN 2
      END,
      p.lastContactedAt DESC
    LIMIT 15
  `) as any;

  // 3. Today's follow-up queue (due today or overdue)
  const [followUpRows] = await database.execute(sql`
    SELECT 
      p.name, p.phone, p.status, p.source,
      p.nextFollowUpAt, p.followUpCount,
      p.thingsToKnow,
      TIMESTAMPDIFF(HOUR, p.nextFollowUpAt, NOW()) as hoursOverdue
    FROM prospects p
    WHERE p.nextFollowUpAt IS NOT NULL
      AND p.nextFollowUpAt <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND p.status NOT IN ('enrolled', 'declined')
      AND p.followUpPaused = 0
      AND p.smsOptOut = 0
    ORDER BY 
      CASE WHEN p.nextFollowUpAt < NOW() THEN 0 ELSE 1 END,
      p.nextFollowUpAt ASC
    LIMIT 25
  `) as any;

  // 4. Recent conversions (last 7 days)
  const [conversionRows] = await database.execute(sql`
    SELECT 
      p.name, te.selectedTier as tier, te.enrolledAt,
      TIMESTAMPDIFF(DAY, p.createdAt, te.enrolledAt) as daysToConvert
    FROM prospects p
    JOIN transformation_enrollments te ON p.enrollmentId = te.id
    WHERE p.status = 'enrolled'
      AND te.enrolledAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY te.enrolledAt DESC
    LIMIT 5
  `) as any;

  // 5. Stats
  const [totalRows] = await database.execute(sql`
    SELECT COUNT(*) as cnt FROM prospects WHERE status NOT IN ('enrolled', 'declined')
  `) as any;
  const totalProspects = Number(totalRows?.[0]?.cnt || 0);

  const [overdueCountRows] = await database.execute(sql`
    SELECT COUNT(*) as cnt FROM prospects 
    WHERE nextFollowUpAt < NOW() AND status NOT IN ('enrolled', 'declined') AND followUpPaused = 0 AND smsOptOut = 0
  `) as any;
  const overdueFollowUps = Number(overdueCountRows?.[0]?.cnt || 0);

  const [hotCountRows] = await database.execute(sql`
    SELECT COUNT(*) as cnt FROM prospects WHERE status IN ('ready_for_consult', 'engaged')
  `) as any;
  const hotLeadCount = Number(hotCountRows?.[0]?.cnt || 0);

  const [weeklyNewRows] = await database.execute(sql`
    SELECT COUNT(*) as cnt FROM prospects WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  `) as any;
  const weeklyNewProspects = Number(weeklyNewRows?.[0]?.cnt || 0);

  const [todayFollowUpRows] = await database.execute(sql`
    SELECT COUNT(*) as cnt FROM prospects 
    WHERE nextFollowUpAt <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND nextFollowUpAt >= CURDATE()
      AND status NOT IN ('enrolled', 'declined')
      AND followUpPaused = 0 AND smsOptOut = 0
  `) as any;
  const todayFollowUps = Number(todayFollowUpRows?.[0]?.cnt || 0);

  // Conversion rate
  const [totalAllRows] = await database.execute(sql`SELECT COUNT(*) as cnt FROM prospects`) as any;
  const totalAll = Number(totalAllRows?.[0]?.cnt || 0);
  const [enrolledRows] = await database.execute(sql`SELECT COUNT(*) as cnt FROM prospects WHERE status = 'enrolled'`) as any;
  const totalEnrolled = Number(enrolledRows?.[0]?.cnt || 0);
  const conversionRate = totalAll > 0 ? Math.round((totalEnrolled / totalAll) * 100 * 10) / 10 : 0;

  return {
    overdueCallbacks: (overdueRows || []).map((r: any) => ({
      name: r.name, phone: r.phone, status: r.status, source: r.source,
      nextFollowUpAt: r.nextFollowUpAt, followUpCount: Number(r.followUpCount) || 0,
      hoursOverdue: Number(r.hoursOverdue) || 0, thingsToKnow: r.thingsToKnow,
    })),
    hotLeads: (hotRows || []).map((r: any) => ({
      name: r.name, phone: r.phone, email: r.email, status: r.status,
      source: r.source, followUpCount: Number(r.followUpCount) || 0,
      totalClicks: Number(r.totalClicks) || 0, lastContactedAt: r.lastContactedAt,
      thingsToKnow: r.thingsToKnow,
    })),
    followUpQueue: (followUpRows || []).map((r: any) => ({
      name: r.name, phone: r.phone, status: r.status, source: r.source,
      nextFollowUpAt: r.nextFollowUpAt, followUpCount: Number(r.followUpCount) || 0,
      hoursOverdue: Number(r.hoursOverdue) || 0, thingsToKnow: r.thingsToKnow,
    })),
    recentConversions: (conversionRows || []).map((r: any) => ({
      name: r.name, tier: r.tier, enrolledAt: r.enrolledAt,
      daysToConvert: Number(r.daysToConvert) || 0,
    })),
    stats: {
      totalProspects,
      overdueFollowUps,
      hotLeadCount,
      conversionRate,
      weeklyNewProspects,
      todayFollowUps,
    },
  };
}

function buildPipelineEmailHtml(data: PipelineEmailData): string {
  const appUrl = process.env.VITE_APP_URL || "https://peptidecoach.pro";
  const primaryColor = "#ea580c";
  const secondaryColor = "#1e40af";
  const dangerColor = "#ef4444";
  const successColor = "#22c55e";
  const amberColor = "#f59e0b";

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const todayStr = new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      new: "New", contacted: "Contacted", clicked: "Clicked", viewing: "Viewing",
      engaged: "Engaged", waiting_on_client: "Waiting", ready_for_consult: "Ready for Consult",
      not_ready: "Not Ready", stalled: "Stalled",
    };
    return labels[s] || s;
  };

  const formatOverdue = (hours: number) => {
    if (hours <= 0) return "Today";
    if (hours < 24) return `${hours}h overdue`;
    const days = Math.floor(hours / 24);
    return `${days}d overdue`;
  };

  const formatDate = (d: any) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { timeZone: 'America/Denver', month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  // Overdue callbacks table
  const overdueHtml = data.overdueCallbacks.length > 0
    ? data.overdueCallbacks.map(p => {
        const urgencyColor = p.hoursOverdue >= 72 ? dangerColor : p.hoursOverdue >= 24 ? amberColor : '#eab308';
        const urgencyIcon = p.hoursOverdue >= 72 ? '🔴' : p.hoursOverdue >= 24 ? '🟠' : '🟡';
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">
              ${urgencyIcon} <strong>${p.name}</strong>
              ${p.thingsToKnow ? `<br><span style="color: ${amberColor}; font-size: 12px;">${p.thingsToKnow.substring(0, 80)}${p.thingsToKnow.length > 80 ? '...' : ''}</span>` : ''}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${p.phone || '—'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${statusLabel(p.status)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: ${urgencyColor}; font-weight: 600;">${formatOverdue(p.hoursOverdue)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${p.followUpCount}</td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="padding: 16px; text-align: center; color: ${successColor}; font-size: 14px;">✅ All caught up! No overdue callbacks.</td></tr>`;

  // Hot leads table
  const hotLeadsHtml = data.hotLeads.length > 0
    ? data.hotLeads.map(p => {
        const statusEmoji = p.status === 'ready_for_consult' ? '🔥' : p.status === 'engaged' ? '⚡' : '⏳';
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">
              ${statusEmoji} <strong>${p.name}</strong>
              ${p.thingsToKnow ? `<br><span style="color: ${amberColor}; font-size: 12px;">${p.thingsToKnow.substring(0, 80)}${p.thingsToKnow.length > 80 ? '...' : ''}</span>` : ''}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${p.phone || '—'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${statusLabel(p.status)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${p.source || '—'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${p.followUpCount} contacts${p.totalClicks > 0 ? `, ${p.totalClicks} clicks` : ''}</td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 14px;">No hot leads at the moment.</td></tr>`;

  // Today's follow-up queue
  const followUpHtml = data.followUpQueue.length > 0
    ? data.followUpQueue.map(p => {
        const isOverdue = p.hoursOverdue > 0;
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">
              ${isOverdue ? '⚠️' : '📞'} <strong>${p.name}</strong>
              ${p.thingsToKnow ? `<br><span style="color: ${amberColor}; font-size: 12px;">${p.thingsToKnow.substring(0, 80)}${p.thingsToKnow.length > 80 ? '...' : ''}</span>` : ''}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${p.phone || '—'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${statusLabel(p.status)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: ${isOverdue ? dangerColor : secondaryColor};">
              ${isOverdue ? formatOverdue(p.hoursOverdue) : formatDate(p.nextFollowUpAt)}
            </td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 14px;">No follow-ups scheduled for today.</td></tr>`;

  // Recent conversions
  const conversionsHtml = data.recentConversions.length > 0
    ? data.recentConversions.map(c => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;"><strong>${c.name}</strong></td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${c.tier || 'N/A'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${c.daysToConvert}d</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">${c.enrolledAt ? new Date(c.enrolledAt).toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric' }) : '—'}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8; font-size: 14px;">No conversions this week.</td></tr>`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 20px 0;">
        <tr><td align="center">
          <table width="680" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%); padding: 28px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">🎯 Shannon's Pipeline Scorecard</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 13px;">${todayStr}</p>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding: 24px 30px 0 30px;">
                <p style="margin: 0; font-size: 16px; color: #334155;">${greeting}, Shannon!</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">Here's your daily pipeline snapshot. Let's make today count.</p>
              </td>
            </tr>

            <!-- Quick Stats -->
            <tr>
              <td style="padding: 20px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden;">
                  <tr>
                    <td width="16.66%" style="text-align: center; padding: 14px 8px; background-color: ${data.stats.overdueFollowUps > 0 ? '#fef2f2' : '#f0fdf4'};">
                      <div style="font-size: 26px; font-weight: 700; color: ${data.stats.overdueFollowUps > 0 ? dangerColor : successColor};">${data.stats.overdueFollowUps}</div>
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Overdue</div>
                    </td>
                    <td width="16.66%" style="text-align: center; padding: 14px 8px; background-color: ${data.stats.hotLeadCount > 0 ? '#fffbeb' : '#f8fafc'};">
                      <div style="font-size: 26px; font-weight: 700; color: ${data.stats.hotLeadCount > 0 ? amberColor : '#94a3b8'};">${data.stats.hotLeadCount}</div>
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Hot Leads</div>
                    </td>
                    <td width="16.66%" style="text-align: center; padding: 14px 8px; background-color: #eff6ff;">
                      <div style="font-size: 26px; font-weight: 700; color: ${secondaryColor};">${data.stats.todayFollowUps}</div>
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Today</div>
                    </td>
                    <td width="16.66%" style="text-align: center; padding: 14px 8px; background-color: #f8fafc;">
                      <div style="font-size: 26px; font-weight: 700; color: #334155;">${data.stats.totalProspects}</div>
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Active</div>
                    </td>
                    <td width="16.66%" style="text-align: center; padding: 14px 8px; background-color: #f0fdf4;">
                      <div style="font-size: 26px; font-weight: 700; color: ${successColor};">${data.stats.conversionRate}%</div>
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Convert</div>
                    </td>
                    <td width="16.66%" style="text-align: center; padding: 14px 8px; background-color: #faf5ff;">
                      <div style="font-size: 26px; font-weight: 700; color: #8b5cf6;">${data.stats.weeklyNewProspects}</div>
                      <div style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">New/Wk</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- OVERDUE CALLBACKS -->
            ${data.overdueCallbacks.length > 0 ? `
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <h2 style="margin: 0 0 12px 0; font-size: 16px; color: ${dangerColor};">🚨 Overdue Callbacks (${data.overdueCallbacks.length})</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden;">
                  <tr style="background-color: #fef2f2;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Name</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Phone</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Overdue</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">#</th>
                  </tr>
                  ${overdueHtml}
                </table>
              </td>
            </tr>
            ` : `
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
                  <span style="font-size: 14px; color: ${successColor};">✅ All caught up! No overdue callbacks.</span>
                </div>
              </td>
            </tr>
            `}

            <!-- HOT LEADS -->
            ${data.hotLeads.length > 0 ? `
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <h2 style="margin: 0 0 12px 0; font-size: 16px; color: ${amberColor};">🔥 Hot Leads (${data.hotLeads.length})</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #fef3c7; border-radius: 8px; overflow: hidden;">
                  <tr style="background-color: #fffbeb;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Name</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Phone</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Source</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Activity</th>
                  </tr>
                  ${hotLeadsHtml}
                </table>
              </td>
            </tr>
            ` : ''}

            <!-- TODAY'S FOLLOW-UP QUEUE -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <h2 style="margin: 0 0 12px 0; font-size: 16px; color: ${secondaryColor};">📞 Today's Follow-Up Queue (${data.followUpQueue.length})</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dbeafe; border-radius: 8px; overflow: hidden;">
                  <tr style="background-color: #eff6ff;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px;">Name</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px;">Phone</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px;">When</th>
                  </tr>
                  ${followUpHtml}
                </table>
              </td>
            </tr>

            <!-- RECENT CONVERSIONS -->
            ${data.recentConversions.length > 0 ? `
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <h2 style="margin: 0 0 12px 0; font-size: 16px; color: ${successColor};">🎉 Recent Conversions (This Week)</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #bbf7d0; border-radius: 8px; overflow: hidden;">
                  <tr style="background-color: #f0fdf4;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Name</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Tier</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Days</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Enrolled</th>
                  </tr>
                  ${conversionsHtml}
                </table>
              </td>
            </tr>
            ` : ''}

            <!-- CTA -->
            <tr>
              <td style="padding: 0 30px 24px 30px; text-align: center;">
                <a href="${appUrl}/admin/pipeline-scorecard" style="display: inline-block; background: linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">Open Full Pipeline Scorecard</a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  Omega Longevity — Pipeline Scorecard<br>
                  Sent daily at 8:00 AM &bull; <a href="${appUrl}/admin/pipeline-scorecard" style="color: ${primaryColor}; text-decoration: none;">View in Dashboard</a>
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendShannonDailyPipeline(): Promise<{ success: boolean; sentTo: string[]; error?: string }> {
  console.log("[ShannonPipeline] Starting daily pipeline email...");
  
  try {
    const data = await gatherPipelineData();
    const html = buildPipelineEmailHtml(data);
    const todayStr = new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric' });
    
    // Build subject line with key stats
    const subjectParts: string[] = [];
    if (data.stats.overdueFollowUps > 0) subjectParts.push(`${data.stats.overdueFollowUps} overdue`);
    if (data.stats.hotLeadCount > 0) subjectParts.push(`${data.stats.hotLeadCount} hot leads`);
    if (data.stats.todayFollowUps > 0) subjectParts.push(`${data.stats.todayFollowUps} follow-ups today`);
    const statsStr = subjectParts.length > 0 ? subjectParts.join(', ') : 'all clear';

    const result = await sendEmail({
      to: SHANNON_EMAIL,
      subject: `🎯 Pipeline Scorecard — ${todayStr} | ${statsStr}`,
      html,
      _logCategory: 'digest',
      _logType: 'shannon_daily_pipeline',
      _logRecipientName: SHANNON_NAME,
      _logTriggeredBy: 'cron',
    });

    if (result.success) {
      console.log(`[ShannonPipeline] Sent to ${SHANNON_EMAIL}`);
      
      // Log automation event
      try {
        const database = await getDb();
        if (database) {
          await database.execute(sql`
            INSERT INTO automation_events (eventType, status, triggeredBy, details, createdAt)
            VALUES ('shannon_daily_pipeline', 'success', 'cron', ${JSON.stringify({
              sentTo: [SHANNON_EMAIL],
              stats: data.stats,
            })}, NOW())
          `);
        }
      } catch (logErr) {
        console.error("[ShannonPipeline] Failed to log event:", logErr);
      }

      return { success: true, sentTo: [SHANNON_EMAIL] };
    } else {
      console.error(`[ShannonPipeline] Failed:`, result.error);
      return { success: false, sentTo: [], error: result.error };
    }
  } catch (err: any) {
    console.error("[ShannonPipeline] Fatal error:", err.message);
    return { success: false, sentTo: [], error: err.message };
  }
}

export function initShannonDailyPipelineCron() {
  import('node-cron').then(cron => {
    // Every day at 8:00 AM
    cron.schedule('0 8 * * *', () => {
      console.log("[ShannonPipeline] Running daily pipeline email cron");
      sendShannonDailyPipeline();
    });
    
    console.log("[ShannonPipeline] Daily pipeline email cron initialized (daily at 8:00 AM)");
  }).catch(err => {
    console.error("[ShannonPipeline] Failed to initialize cron:", err);
  });
}
