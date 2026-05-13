import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { emailEngagementEvents, clientNotificationHistory } from "../../drizzle/schema";
import { eq, and, gte, lte, count, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Email Engagement Tracking Router
 * Handles tracking of email opens and clicks
 */
export const emailEngagementRouter = router({
  /**
   * Record an email open event (called by tracking pixel)
   */
  trackOpen: publicProcedure
    .input(z.object({
      trackingId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if this tracking ID already has an open event (prevent duplicate counts)
      const existing = await db
        .select()
        .from(emailEngagementEvents)
        .where(and(
          eq(emailEngagementEvents.trackingId, input.trackingId),
          eq(emailEngagementEvents.eventType, "open")
        ))
        .limit(1);
      
      if (existing.length > 0) {
        // Already tracked, return success without creating duplicate
        return { success: true, duplicate: true };
      }
      
      // Get user agent and IP from request if available
      const userAgent = ctx.req?.headers?.["user-agent"] || null;
      const ipAddress = ctx.req?.headers?.["x-forwarded-for"]?.toString().split(",")[0] || 
                        ctx.req?.socket?.remoteAddress || null;
      
      await db.insert(emailEngagementEvents).values({
        trackingId: input.trackingId,
        eventType: "open",
        userAgent,
        ipAddress,
      });
      
      return { success: true };
    }),

  /**
   * Record an email click event
   */
  trackClick: publicProcedure
    .input(z.object({
      trackingId: z.string(),
      linkUrl: z.string(),
      linkName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const userAgent = ctx.req?.headers?.["user-agent"] || null;
      const ipAddress = ctx.req?.headers?.["x-forwarded-for"]?.toString().split(",")[0] || 
                        ctx.req?.socket?.remoteAddress || null;
      
      // Create a unique click tracking ID
      const clickTrackingId = `${input.trackingId}_click_${uuidv4().slice(0, 8)}`;
      
      await db.insert(emailEngagementEvents).values({
        trackingId: clickTrackingId,
        eventType: "click",
        linkUrl: input.linkUrl,
        linkName: input.linkName,
        userAgent,
        ipAddress,
      });
      
      return { success: true, redirectUrl: input.linkUrl };
    }),

  /**
   * Get engagement stats for a date range
   */
  getStats: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      period: z.enum(["day", "week", "month", "all"]).optional().default("week"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Calculate date range
      const endDate = input.endDate ? new Date(input.endDate) : new Date();
      let startDate: Date;
      
      if (input.startDate) {
        startDate = new Date(input.startDate);
      } else {
        startDate = new Date();
        switch (input.period) {
          case "day":
            startDate.setDate(startDate.getDate() - 1);
            break;
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case "all":
            startDate = new Date(0); // Beginning of time
            break;
        }
      }
      
      // Get total emails sent in period
      const [totalSentResult] = await db
        .select({ count: count() })
        .from(clientNotificationHistory)
        .where(and(
          eq(clientNotificationHistory.status, "sent"),
          gte(clientNotificationHistory.sentAt, startDate),
          lte(clientNotificationHistory.sentAt, endDate)
        ));
      
      // Get open events in period
      const [openEventsResult] = await db
        .select({ count: count() })
        .from(emailEngagementEvents)
        .where(and(
          eq(emailEngagementEvents.eventType, "open"),
          gte(emailEngagementEvents.createdAt, startDate),
          lte(emailEngagementEvents.createdAt, endDate)
        ));
      
      // Get click events in period
      const [clickEventsResult] = await db
        .select({ count: count() })
        .from(emailEngagementEvents)
        .where(and(
          eq(emailEngagementEvents.eventType, "click"),
          gte(emailEngagementEvents.createdAt, startDate),
          lte(emailEngagementEvents.createdAt, endDate)
        ));
      
      // Get unique opens (by tracking ID base)
      const uniqueOpens = await db
        .select({ trackingId: emailEngagementEvents.trackingId })
        .from(emailEngagementEvents)
        .where(and(
          eq(emailEngagementEvents.eventType, "open"),
          gte(emailEngagementEvents.createdAt, startDate),
          lte(emailEngagementEvents.createdAt, endDate)
        ))
        .groupBy(emailEngagementEvents.trackingId);
      
      const totalSent = totalSentResult?.count || 0;
      const totalOpens = openEventsResult?.count || 0;
      const uniqueOpenCount = uniqueOpens.length;
      const totalClicks = clickEventsResult?.count || 0;
      
      const openRate = totalSent > 0 ? ((uniqueOpenCount / totalSent) * 100).toFixed(1) : "0";
      const clickRate = uniqueOpenCount > 0 ? ((totalClicks / uniqueOpenCount) * 100).toFixed(1) : "0";
      const clickToOpenRate = uniqueOpenCount > 0 ? ((totalClicks / uniqueOpenCount) * 100).toFixed(1) : "0";
      
      return {
        period: input.period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalSent,
        totalOpens,
        uniqueOpens: uniqueOpenCount,
        totalClicks,
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        clickToOpenRate: parseFloat(clickToOpenRate),
      };
    }),

  /**
   * Get top clicked links
   */
  getTopLinks: adminProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
      period: z.enum(["day", "week", "month", "all"]).optional().default("week"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const startDate = new Date();
      switch (input.period) {
        case "day":
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "all":
          startDate.setFullYear(2000);
          break;
      }
      
      const topLinks = await db
        .select({
          linkUrl: emailEngagementEvents.linkUrl,
          linkName: emailEngagementEvents.linkName,
          clickCount: count(),
        })
        .from(emailEngagementEvents)
        .where(and(
          eq(emailEngagementEvents.eventType, "click"),
          gte(emailEngagementEvents.createdAt, startDate)
        ))
        .groupBy(emailEngagementEvents.linkUrl, emailEngagementEvents.linkName)
        .orderBy(desc(count()))
        .limit(input.limit);
      
      return topLinks;
    }),

  /**
   * Get engagement timeline data for charts
   */
  getTimeline: adminProcedure
    .input(z.object({
      period: z.enum(["week", "month"]).optional().default("week"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const days = input.period === "week" ? 7 : 30;
      const timeline: Array<{
        date: string;
        opens: number;
        clicks: number;
        sent: number;
      }> = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const [opensResult] = await db
          .select({ count: count() })
          .from(emailEngagementEvents)
          .where(and(
            eq(emailEngagementEvents.eventType, "open"),
            gte(emailEngagementEvents.createdAt, date),
            lte(emailEngagementEvents.createdAt, nextDate)
          ));
        
        const [clicksResult] = await db
          .select({ count: count() })
          .from(emailEngagementEvents)
          .where(and(
            eq(emailEngagementEvents.eventType, "click"),
            gte(emailEngagementEvents.createdAt, date),
            lte(emailEngagementEvents.createdAt, nextDate)
          ));
        
        const [sentResult] = await db
          .select({ count: count() })
          .from(clientNotificationHistory)
          .where(and(
            eq(clientNotificationHistory.status, "sent"),
            gte(clientNotificationHistory.sentAt, date),
            lte(clientNotificationHistory.sentAt, nextDate)
          ));
        
        timeline.push({
          date: date.toISOString().split("T")[0],
          opens: opensResult?.count || 0,
          clicks: clicksResult?.count || 0,
          sent: sentResult?.count || 0,
        });
      }
      
      return timeline;
    }),

  /**
   * Get recent engagement events
   */
  getRecentEvents: adminProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const events = await db
        .select()
        .from(emailEngagementEvents)
        .orderBy(desc(emailEngagementEvents.createdAt))
        .limit(input.limit);
      
      return { events };
    }),
});

/**
 * Generate a tracking ID for an email
 */
export function generateTrackingId(): string {
  return uuidv4();
}

/**
 * Generate tracking pixel HTML
 */
export function generateTrackingPixel(trackingId: string, baseUrl: string): string {
  return `<img src="${baseUrl}/api/email/track/open/${trackingId}" width="1" height="1" style="display:none;" alt="" />`;
}

/**
 * Wrap a link with click tracking
 */
export function wrapLinkWithTracking(
  originalUrl: string, 
  trackingId: string, 
  linkName: string,
  baseUrl: string
): string {
  const encodedUrl = encodeURIComponent(originalUrl);
  const encodedName = encodeURIComponent(linkName);
  return `${baseUrl}/api/email/track/click/${trackingId}?url=${encodedUrl}&name=${encodedName}`;
}
