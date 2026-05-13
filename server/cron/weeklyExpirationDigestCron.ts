/**
 * Weekly Expiration Digest Cron Job
 * Sends a weekly summary email to coaches listing all protocols expiring in the next 30 days
 * Schedule: Runs every Monday at 9:00 AM
 */

import * as db from "../db";
import { getDb } from "../db";
import { sendEmail } from '../emailService';

const CRON_DAY = 1; // Monday (0 = Sunday, 1 = Monday, etc.)
const CRON_HOUR = 9;
const CRON_MINUTE = 0;
let cronInterval: NodeJS.Timeout | null = null;
let lastRunDate: string | null = null;

// Store last cron run data
let lastCronRunData: { timestamp: string; emailsSent: number; protocolsIncluded: number } | null = null;

function shouldRunCron(): boolean {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const today = now.toISOString().split("T")[0];

  if (
    currentDay === CRON_DAY &&
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

/**
 * Calculate the expiration date for a protocol based on its start date and duration
 */
function calculateExpirationDate(protocol: any): Date | null {
  const startDate = protocol.approvedAt || protocol.sentAt || protocol.createdAt;
  if (!startDate) return null;
  
  const start = new Date(startDate);
  const durationMonths = protocol.durationMonths || 3;
  
  const expiration = new Date(start);
  expiration.setMonth(expiration.getMonth() + durationMonths);
  
  return expiration;
}

/**
 * Get urgency level based on days until expiration
 */
function getUrgencyLevel(daysUntilExpiration: number): { level: string; color: string; emoji: string } {
  if (daysUntilExpiration <= 0) {
    return { level: 'EXPIRED', color: '#dc2626', emoji: '🔴' };
  } else if (daysUntilExpiration <= 7) {
    return { level: 'URGENT', color: '#ea580c', emoji: '🟠' };
  } else if (daysUntilExpiration <= 14) {
    return { level: 'WARNING', color: '#ca8a04', emoji: '🟡' };
  } else {
    return { level: 'NOTICE', color: '#16a34a', emoji: '🟢' };
  }
}

/**
 * Generate HTML email content for the weekly digest
 */
function generateDigestEmailHtml(protocols: Array<{
  clientName: string;
  clientEmail: string | null;
  durationMonths: number;
  expirationDate: Date;
  daysUntilExpiration: number;
  status: string;
  id: number;
}>): string {
  const appUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
  const appTitle = process.env.VITE_APP_TITLE || 'Omega Longevity';
  
  // Group protocols by urgency
  const expired = protocols.filter(p => p.daysUntilExpiration <= 0);
  const urgent = protocols.filter(p => p.daysUntilExpiration > 0 && p.daysUntilExpiration <= 7);
  const warning = protocols.filter(p => p.daysUntilExpiration > 7 && p.daysUntilExpiration <= 14);
  const notice = protocols.filter(p => p.daysUntilExpiration > 14);

  const generateProtocolRow = (p: typeof protocols[0]) => {
    const urgency = getUrgencyLevel(p.daysUntilExpiration);
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-weight: 500;">${p.clientName}</td>
        <td style="padding: 12px; color: #6b7280;">${p.clientEmail || 'No email'}</td>
        <td style="padding: 12px;">${p.durationMonths} months</td>
        <td style="padding: 12px;">${p.expirationDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' })}</td>
        <td style="padding: 12px;">
          <span style="background-color: ${urgency.color}20; color: ${urgency.color}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
            ${urgency.emoji} ${p.daysUntilExpiration <= 0 ? 'Expired' : `${p.daysUntilExpiration} days`}
          </span>
        </td>
        <td style="padding: 12px;">
          <a href="${appUrl}/admin/clients/${p.id}" style="color: #2563eb; text-decoration: none; font-weight: 500;">View →</a>
        </td>
      </tr>
    `;
  };

  const generateSection = (title: string, items: typeof protocols, color: string) => {
    if (items.length === 0) return '';
    return `
      <div style="margin-bottom: 24px;">
        <h3 style="color: ${color}; margin-bottom: 12px; font-size: 16px;">${title} (${items.length})</h3>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Client</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Email</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Duration</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Expires</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Status</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(generateProtocolRow).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
      <div style="max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${appTitle}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Weekly Protocol Expiration Digest</p>
        </div>
        
        <!-- Summary -->
        <div style="background: white; padding: 24px; border-bottom: 1px solid #e5e7eb;">
          <h2 style="margin: 0 0 16px 0; color: #111827;">📊 Summary</h2>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 120px; background: #fef2f2; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${expired.length}</div>
              <div style="color: #991b1b; font-size: 14px;">Expired</div>
            </div>
            <div style="flex: 1; min-width: 120px; background: #fff7ed; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #ea580c;">${urgent.length}</div>
              <div style="color: #9a3412; font-size: 14px;">Urgent (≤7 days)</div>
            </div>
            <div style="flex: 1; min-width: 120px; background: #fefce8; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #ca8a04;">${warning.length}</div>
              <div style="color: #854d0e; font-size: 14px;">Warning (8-14 days)</div>
            </div>
            <div style="flex: 1; min-width: 120px; background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${notice.length}</div>
              <div style="color: #166534; font-size: 14px;">Notice (15-30 days)</div>
            </div>
          </div>
        </div>
        
        <!-- Protocol Lists -->
        <div style="background: #f9fafb; padding: 24px;">
          ${generateSection('🔴 Expired Protocols', expired, '#dc2626')}
          ${generateSection('🟠 Urgent - Expiring Within 7 Days', urgent, '#ea580c')}
          ${generateSection('🟡 Warning - Expiring Within 14 Days', warning, '#ca8a04')}
          ${generateSection('🟢 Notice - Expiring Within 30 Days', notice, '#16a34a')}
          
          ${protocols.length === 0 ? `
            <div style="text-align: center; padding: 40px; background: white; border-radius: 8px;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
              <h3 style="color: #16a34a; margin: 0;">No Protocols Expiring Soon</h3>
              <p style="color: #6b7280; margin: 8px 0 0 0;">All client protocols are in good standing.</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div style="background: #1e3a5f; padding: 24px; border-radius: 0 0 12px 12px; text-align: center;">
          <a href="${appUrl}/admin/protocol-analytics" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 16px;">
            View Protocol Analytics Dashboard
          </a>
          <p style="color: rgba(255,255,255,0.6); margin: 16px 0 0 0; font-size: 12px;">
            This is an automated weekly digest from ${appTitle}.<br>
            Generated on ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver' })} at ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Denver' })}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email content
 */
function generateDigestEmailText(protocols: Array<{
  clientName: string;
  clientEmail: string | null;
  durationMonths: number;
  expirationDate: Date;
  daysUntilExpiration: number;
}>): string {
  const appTitle = process.env.VITE_APP_TITLE || 'Omega Longevity';
  
  let text = `${appTitle} - Weekly Protocol Expiration Digest\n`;
  text += `Generated: ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver' })}\n\n`;
  
  if (protocols.length === 0) {
    text += "🎉 No protocols expiring in the next 30 days!\n";
    return text;
  }
  
  text += `Total protocols expiring soon: ${protocols.length}\n\n`;
  
  // Group by urgency
  const expired = protocols.filter(p => p.daysUntilExpiration <= 0);
  const urgent = protocols.filter(p => p.daysUntilExpiration > 0 && p.daysUntilExpiration <= 7);
  const warning = protocols.filter(p => p.daysUntilExpiration > 7 && p.daysUntilExpiration <= 14);
  const notice = protocols.filter(p => p.daysUntilExpiration > 14);
  
  const addSection = (title: string, items: typeof protocols) => {
    if (items.length === 0) return '';
    let section = `\n${title} (${items.length}):\n`;
    section += '-'.repeat(40) + '\n';
    items.forEach(p => {
      section += `• ${p.clientName} - ${p.expirationDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' })} (${p.daysUntilExpiration <= 0 ? 'EXPIRED' : `${p.daysUntilExpiration} days`})\n`;
    });
    return section;
  };
  
  text += addSection('🔴 EXPIRED', expired);
  text += addSection('🟠 URGENT (≤7 days)', urgent);
  text += addSection('🟡 WARNING (8-14 days)', warning);
  text += addSection('🟢 NOTICE (15-30 days)', notice);
  
  return text;
}

export async function processWeeklyExpirationDigest(): Promise<{ emailsSent: number; protocolsIncluded: number }> {
  console.log("[Weekly Expiration Digest] Starting digest generation...");
  
  let emailsSent = 0;
  let protocolsIncluded = 0;
  
  try {
    // Check if digest is enabled
    const digestEnabled = await db.getSiteSetting("weekly_expiration_digest_enabled");
    if (digestEnabled === "false") {
      console.log("[Weekly Expiration Digest] Digest is disabled. Skipping.");
      return { emailsSent: 0, protocolsIncluded: 0 };
    }
    
    // Get all active protocols
    const allProtocols = await db.getAllClientProtocols("active");
    const now = new Date();
    
    // Filter to protocols expiring in the next 30 days
    const expiringProtocols: Array<{
      clientName: string;
      clientEmail: string | null;
      durationMonths: number;
      expirationDate: Date;
      daysUntilExpiration: number;
      status: string;
      id: number;
    }> = [];
    
    for (const protocol of allProtocols) {
      // Only check active or approved protocols
      if (protocol.status !== 'active' && protocol.status !== 'approved') {
        continue;
      }
      
      const expirationDate = calculateExpirationDate(protocol);
      if (!expirationDate) continue;
      
      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      // Include protocols expiring in the next 30 days (or already expired)
      if (daysUntilExpiration <= 30) {
        expiringProtocols.push({
          clientName: protocol.clientName,
          clientEmail: protocol.clientEmail,
          durationMonths: protocol.durationMonths,
          expirationDate,
          daysUntilExpiration,
          status: protocol.status,
          id: protocol.id,
        });
      }
    }
    
    // Sort by days until expiration (most urgent first)
    expiringProtocols.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
    protocolsIncluded = expiringProtocols.length;
    
    // Get all admin users with notifications enabled
    const adminUsers = await db.getUsersWithNotificationsEnabled();
    const adminEmails = adminUsers.filter(u => u.role === 'admin' && u.email);
    
    if (adminEmails.length === 0) {
      console.log("[Weekly Expiration Digest] No admin users with notifications enabled.");
      return { emailsSent: 0, protocolsIncluded };
    }
    
    // Generate email content
    const htmlContent = generateDigestEmailHtml(expiringProtocols);
    const textContent = generateDigestEmailText(expiringProtocols);
    const appTitle = process.env.VITE_APP_TITLE || 'Omega Longevity';
    
    // Send email to each admin
    for (const admin of adminEmails) {
      if (!admin.email) continue;
      
      try {
        await sendEmail({
          to: admin.email,
          subject: `${appTitle} - Weekly Protocol Expiration Digest (${expiringProtocols.length} protocols)`,
          html: htmlContent,
          _logCategory: 'digest',
          _logType: 'weekly_expiration_digest',
          _logTriggeredBy: 'cron',
        });
        
        emailsSent++;
        console.log(`[Weekly Expiration Digest] Email sent to ${admin.email}`);
      } catch (error) {
        console.error(`[Weekly Expiration Digest] Failed to send email to ${admin.email}:`, error);
      }
    }
    
    console.log(`[Weekly Expiration Digest] Completed. Sent ${emailsSent} emails with ${protocolsIncluded} protocols.`);
    
    lastCronRunData = {
      timestamp: new Date().toISOString(),
      emailsSent,
      protocolsIncluded,
    };
    
    return { emailsSent, protocolsIncluded };
  } catch (error) {
    console.error("[Weekly Expiration Digest] Error:", error);
    return { emailsSent, protocolsIncluded };
  }
}

export function startWeeklyExpirationDigestCron(): void {
  console.log("[Weekly Expiration Digest] Initialized - runs every Monday at 9:00 AM");
  
  // Check every 5 minutes if it's time to run
  cronInterval = setInterval(() => {
    if (shouldRunCron()) {
      processWeeklyExpirationDigest().catch(console.error);
    }
  }, 5 * 60 * 1000);
  
  // Also run immediately on startup if it's the right time
  if (shouldRunCron()) {
    processWeeklyExpirationDigest().catch(console.error);
  }
}

export function stopWeeklyExpirationDigestCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[Weekly Expiration Digest] Stopped");
  }
}

export function getLastWeeklyExpirationDigestRun(): { timestamp: string; emailsSent: number; protocolsIncluded: number } | null {
  return lastCronRunData;
}

// Manual trigger for testing
export async function triggerWeeklyExpirationDigest(): Promise<{ emailsSent: number; protocolsIncluded: number }> {
  console.log("[Weekly Expiration Digest] Manual trigger initiated");
  return processWeeklyExpirationDigest();
}
