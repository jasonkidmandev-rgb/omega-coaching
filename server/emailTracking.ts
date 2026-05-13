/**
 * Email Tracking Service
 * Tracks email opens and link clicks for transformation enrollment emails
 * and general protocol emails.
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * Generate a unique tracking ID
 */
export function generateTrackingId(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a tracking record for an email
 */
export async function createEmailTracking(params: {
  enrollmentId?: number;
  clientProtocolId?: number;
  userId?: number;
  emailType: string;
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
}): Promise<string> {
  const database = await getDb();
  if (!database) {
    console.error("[EmailTracking] Database not available");
    return generateTrackingId(); // Return a tracking ID anyway for graceful degradation
  }

  const trackingId = generateTrackingId();

  try {
    await database.execute(sql`
      INSERT INTO email_tracking (trackingId, enrollmentId, clientProtocolId, userId, emailType, recipientEmail, recipientName, subject)
      VALUES (
        ${trackingId},
        ${params.enrollmentId || null},
        ${params.clientProtocolId || null},
        ${params.userId || null},
        ${params.emailType},
        ${params.recipientEmail},
        ${params.recipientName || null},
        ${params.subject || null}
      )
    `);
    
    console.log(`[EmailTracking] Created tracking record: ${trackingId} for ${params.emailType} (enrollment: ${params.enrollmentId || 'N/A'})`);
    return trackingId;
  } catch (error) {
    console.error("[EmailTracking] Failed to create tracking record:", error);
    return trackingId;
  }
}

/**
 * Record an email open event
 */
export async function recordEmailOpen(trackingId: string, userAgent?: string, ipAddress?: string): Promise<boolean> {
  const database = await getDb();
  if (!database) {
    console.error("[EmailTracking] Database not available for open tracking");
    return false;
  }

  try {
    await database.execute(sql`
      UPDATE email_tracking
      SET 
        openedAt = COALESCE(openedAt, NOW()),
        openCount = openCount + 1,
        userAgent = COALESCE(userAgent, ${userAgent || null}),
        ipAddress = COALESCE(ipAddress, ${ipAddress || null}),
        updatedAt = NOW()
      WHERE trackingId = ${trackingId}
    `);
    
    console.log(`[EmailTracking] Recorded open for: ${trackingId}`);
    return true;
  } catch (error) {
    console.error("[EmailTracking] Failed to record open:", error);
    return false;
  }
}

/**
 * Record a link click event (updates summary + inserts detail row)
 */
export async function recordEmailClick(trackingId: string, link: string, userAgent?: string, ipAddress?: string): Promise<boolean> {
  const database = await getDb();
  if (!database) {
    console.error("[EmailTracking] Database not available for click tracking");
    return false;
  }

  try {
    // Update summary in email_tracking table
    await database.execute(sql`
      UPDATE email_tracking
      SET 
        clickedAt = COALESCE(clickedAt, NOW()),
        clickCount = clickCount + 1,
        lastClickedLink = ${link},
        userAgent = COALESCE(userAgent, ${userAgent || null}),
        ipAddress = COALESCE(ipAddress, ${ipAddress || null}),
        updatedAt = NOW()
      WHERE trackingId = ${trackingId}
    `);
    
    // Insert detail row in email_tracking_clicks
    await database.execute(sql`
      INSERT INTO email_tracking_clicks (trackingId, linkUrl, userAgent, ipAddress)
      VALUES (${trackingId}, ${link}, ${userAgent || null}, ${ipAddress || null})
    `);
    
    console.log(`[EmailTracking] Recorded click for: ${trackingId} -> ${link}`);
    return true;
  } catch (error) {
    console.error("[EmailTracking] Failed to record click:", error);
    return false;
  }
}

/**
 * Get tracking data for an enrollment
 */
export async function getEnrollmentEmailTracking(enrollmentId: number): Promise<any[]> {
  const database = await getDb();
  if (!database) {
    return [];
  }

  try {
    const result = await database.execute(sql`
      SELECT * FROM email_tracking
      WHERE enrollmentId = ${enrollmentId}
      ORDER BY sentAt DESC
    `);
    
    return (result[0] as unknown) as any[];
  } catch (error) {
    console.error("[EmailTracking] Failed to get enrollment tracking:", error);
    return [];
  }
}

/**
 * Get click details for a specific tracking ID
 */
export async function getClickDetails(trackingId: string): Promise<any[]> {
  const database = await getDb();
  if (!database) {
    return [];
  }

  try {
    const result = await database.execute(sql`
      SELECT * FROM email_tracking_clicks
      WHERE trackingId = ${trackingId}
      ORDER BY clickedAt DESC
    `);
    
    return (result[0] as unknown) as any[];
  } catch (error) {
    console.error("[EmailTracking] Failed to get click details:", error);
    return [];
  }
}

/**
 * Get all email tracking data with optional filters
 */
export async function getEmailTrackingList(params?: {
  emailType?: string;
  hasOpened?: boolean;
  hasClicked?: boolean;
  enrollmentId?: number;
  limit?: number;
}): Promise<any[]> {
  const database = await getDb();
  if (!database) {
    return [];
  }

  try {
    const result = await database.execute(sql`
      SELECT 
        et.*,
        te.clientName,
        te.tier
      FROM email_tracking et
      LEFT JOIN transformation_enrollments te ON et.enrollmentId = te.id
      ORDER BY et.sentAt DESC
      LIMIT ${params?.limit || 100}
    `);
    
    let rows = (result[0] as unknown) as any[];
    
    // Apply filters in application
    if (params?.emailType) {
      rows = rows.filter(r => r.emailType === params.emailType);
    }
    if (params?.hasOpened !== undefined) {
      rows = rows.filter(r => params.hasOpened ? r.openedAt : !r.openedAt);
    }
    if (params?.hasClicked !== undefined) {
      rows = rows.filter(r => params.hasClicked ? r.clickedAt : !r.clickedAt);
    }
    if (params?.enrollmentId) {
      rows = rows.filter(r => r.enrollmentId === params.enrollmentId);
    }
    
    return rows;
  } catch (error) {
    console.error("[EmailTracking] Failed to get tracking list:", error);
    return [];
  }
}

/**
 * Get tracking statistics (overall or per enrollment)
 */
export async function getEmailTrackingStats(enrollmentId?: number): Promise<{
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
}> {
  const database = await getDb();
  if (!database) {
    return { totalSent: 0, totalOpened: 0, totalClicked: 0, openRate: 0, clickRate: 0 };
  }

  try {
    const result = enrollmentId
      ? await database.execute(sql`
          SELECT 
            COUNT(*) as totalSent,
            SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END) as totalOpened,
            SUM(CASE WHEN clickedAt IS NOT NULL THEN 1 ELSE 0 END) as totalClicked
          FROM email_tracking
          WHERE enrollmentId = ${enrollmentId}
        `)
      : await database.execute(sql`
          SELECT 
            COUNT(*) as totalSent,
            SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END) as totalOpened,
            SUM(CASE WHEN clickedAt IS NOT NULL THEN 1 ELSE 0 END) as totalClicked
          FROM email_tracking
        `);
    
    const rows = (result[0] as unknown) as any[];
    const stats = rows[0] || { totalSent: 0, totalOpened: 0, totalClicked: 0 };
    
    const totalSent = Number(stats.totalSent) || 0;
    const totalOpened = Number(stats.totalOpened) || 0;
    const totalClicked = Number(stats.totalClicked) || 0;
    
    return {
      totalSent,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 1000) / 10 : 0,
    };
  } catch (error) {
    console.error("[EmailTracking] Failed to get stats:", error);
    return { totalSent: 0, totalOpened: 0, totalClicked: 0, openRate: 0, clickRate: 0 };
  }
}

/**
 * Generate tracking pixel HTML
 */
export function generateTrackingPixel(trackingId: string, baseUrl: string): string {
  return `<img src="${baseUrl}/api/email/track/open/${trackingId}" width="1" height="1" style="display:none;" alt="" />`;
}

/**
 * Generate tracked link
 */
export function generateTrackedLink(originalUrl: string, trackingId: string, baseUrl: string): string {
  const encodedUrl = encodeURIComponent(originalUrl);
  return `${baseUrl}/api/email/track/click/${trackingId}?url=${encodedUrl}`;
}

/**
 * Inject tracking pixel and wrap links in HTML email content.
 * Returns the modified HTML with tracking pixel appended before </body>
 * and all href links wrapped with click tracking.
 */
export function injectTrackingIntoHtml(html: string, trackingId: string, baseUrl: string): string {
  // 1. Inject tracking pixel before </body>
  const pixel = generateTrackingPixel(trackingId, baseUrl);
  let tracked = html.replace('</body>', `${pixel}</body>`);
  
  // 2. Wrap all href links with click tracking (except mailto: and tel: links)
  tracked = tracked.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (match, url) => {
      // Don't wrap tracking URLs (avoid double-tracking)
      if (url.includes('/api/email/track/') || url.includes('/api/track/')) {
        return match;
      }
      const trackedUrl = generateTrackedLink(url, trackingId, baseUrl);
      return `href="${trackedUrl}"`;
    }
  );
  
  return tracked;
}

/**
 * Get email tracking status for multiple enrollments at once
 * Returns a map of enrollmentId -> tracking status
 */
export async function getEmailTrackingByEnrollmentIds(enrollmentIds: number[]): Promise<Record<number, {
  hasSent: boolean;
  hasOpened: boolean;
  hasClicked: boolean;
  sentAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  emailType: string | null;
  openCount: number;
  clickCount: number;
  totalEmails: number;
}>> {
  const database = await getDb();
  if (!database || enrollmentIds.length === 0) {
    return {};
  }

  try {
    const result = await database.execute(sql`
      SELECT 
        enrollmentId,
        emailType,
        sentAt,
        openedAt,
        clickedAt,
        openCount,
        clickCount
      FROM email_tracking
      WHERE enrollmentId IN (${sql.raw(enrollmentIds.join(','))})
      ORDER BY sentAt DESC
    `);
    
    const rows = (result[0] as unknown) as any[];
    
    // Build the result map
    const trackingMap: Record<number, {
      hasSent: boolean;
      hasOpened: boolean;
      hasClicked: boolean;
      sentAt: Date | null;
      openedAt: Date | null;
      clickedAt: Date | null;
      emailType: string | null;
      openCount: number;
      clickCount: number;
      totalEmails: number;
    }> = {};
    
    // Initialize all requested IDs with default values
    for (const id of enrollmentIds) {
      trackingMap[id] = {
        hasSent: false,
        hasOpened: false,
        hasClicked: false,
        sentAt: null,
        openedAt: null,
        clickedAt: null,
        emailType: null,
        openCount: 0,
        clickCount: 0,
        totalEmails: 0,
      };
    }
    
    // Aggregate tracking data per enrollment
    for (const row of rows) {
      const enrollmentId = row.enrollmentId;
      if (!enrollmentId) continue;
      
      const existing = trackingMap[enrollmentId];
      if (!existing) continue;
      
      existing.totalEmails++;
      
      // Update with the most recent data
      if (!existing.hasSent || (row.sentAt && (!existing.sentAt || new Date(row.sentAt) > new Date(existing.sentAt)))) {
        existing.hasSent = true;
        existing.sentAt = row.sentAt;
        existing.emailType = row.emailType;
      }
      
      // Track if any email was opened
      if (row.openedAt) {
        existing.hasOpened = true;
        if (!existing.openedAt || new Date(row.openedAt) > new Date(existing.openedAt)) {
          existing.openedAt = row.openedAt;
        }
        existing.openCount += Number(row.openCount) || 0;
      }
      
      // Track if any link was clicked
      if (row.clickedAt) {
        existing.hasClicked = true;
        if (!existing.clickedAt || new Date(row.clickedAt) > new Date(existing.clickedAt)) {
          existing.clickedAt = row.clickedAt;
        }
        existing.clickCount += Number(row.clickCount) || 0;
      }
    }
    
    return trackingMap;
  } catch (error) {
    console.error("[EmailTracking] Failed to get batch tracking:", error);
    return {};
  }
}

/**
 * Get transformation email tracking stats for the admin dashboard
 * Returns aggregate stats across all transformation-related emails
 */
export async function getTransformationEmailStats(): Promise<{
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  byType: Array<{ emailType: string; sent: number; opened: number; clicked: number }>;
}> {
  const database = await getDb();
  if (!database) {
    return { totalSent: 0, totalOpened: 0, totalClicked: 0, openRate: 0, clickRate: 0, byType: [] };
  }

  try {
    // Overall stats for transformation emails
    const overallResult = await database.execute(sql`
      SELECT 
        COUNT(*) as totalSent,
        SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END) as totalOpened,
        SUM(CASE WHEN clickedAt IS NOT NULL THEN 1 ELSE 0 END) as totalClicked
      FROM email_tracking
      WHERE emailType IN ('transformation_milestone', 'transformation_welcome', 'transformation_payment', 'transformation_admin', 'resend_welcome')
    `);
    
    const overallRows = (overallResult[0] as unknown) as any[];
    const overall = overallRows[0] || { totalSent: 0, totalOpened: 0, totalClicked: 0 };
    
    const totalSent = Number(overall.totalSent) || 0;
    const totalOpened = Number(overall.totalOpened) || 0;
    const totalClicked = Number(overall.totalClicked) || 0;
    
    // Stats by type
    const byTypeResult = await database.execute(sql`
      SELECT 
        emailType,
        COUNT(*) as sent,
        SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN clickedAt IS NOT NULL THEN 1 ELSE 0 END) as clicked
      FROM email_tracking
      WHERE emailType IN ('transformation_milestone', 'transformation_welcome', 'transformation_payment', 'transformation_admin', 'resend_welcome')
      GROUP BY emailType
      ORDER BY sent DESC
    `);
    
    const byType = ((byTypeResult[0] as unknown) as any[]).map(r => ({
      emailType: r.emailType,
      sent: Number(r.sent) || 0,
      opened: Number(r.opened) || 0,
      clicked: Number(r.clicked) || 0,
    }));
    
    return {
      totalSent,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 1000) / 10 : 0,
      byType,
    };
  } catch (error) {
    console.error("[EmailTracking] Failed to get transformation stats:", error);
    return { totalSent: 0, totalOpened: 0, totalClicked: 0, openRate: 0, clickRate: 0, byType: [] };
  }
}
