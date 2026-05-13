import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { pageViews } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import crypto from "crypto";

// Helper to parse date range with proper UTC handling
function parseDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00.000Z");
  const end = new Date(endDate + "T23:59:59.999Z");
  return { start, end };
}

// Parse user agent to extract browser, OS, device type
function parseUserAgent(ua: string) {
  const browser = /Firefox/i.test(ua) ? "Firefox"
    : /Edg/i.test(ua) ? "Edge"
    : /OPR|Opera/i.test(ua) ? "Opera"
    : /Chrome/i.test(ua) ? "Chrome"
    : /Safari/i.test(ua) ? "Safari"
    : /MSIE|Trident/i.test(ua) ? "IE"
    : "Other";

  const os = /Windows/i.test(ua) ? "Windows"
    : /Mac OS/i.test(ua) ? "macOS"
    : /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Linux/i.test(ua) ? "Linux"
    : "Other";

  const deviceType = /Mobile|Android.*Mobile|iPhone|iPod/i.test(ua) ? "mobile"
    : /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) ? "tablet"
    : "desktop";

  return { browser, os, deviceType };
}

// Check if user agent is a bot
function isBot(ua: string): boolean {
  return /bot|crawler|spider|googlebot|bingbot|yandex|baidu|duckduck|slurp|ia_archiver|facebookexternalhit|twitterbot|linkedinbot|embedly|quora|outbrain|pinterest|slack|vkShare|W3C_Validator|whatsapp|preview|prefetch|proxy/i.test(ua);
}

// Extract domain from referrer URL
function extractDomain(referrer: string): string | null {
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export const webTrafficRouter = router({
  // Track a page view (public - called from client-side script)
  track: publicProcedure
    .input(z.object({
      path: z.string().max(500),
      referrer: z.string().max(1000).optional(),
      screenWidth: z.number().optional(),
      screenHeight: z.number().optional(),
      sessionId: z.string().max(64).optional(),
      loadTime: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const ua = ctx.req?.headers["user-agent"] || "";
      const ip = ctx.req?.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        || ctx.req?.socket?.remoteAddress || "";

      // Hash IP for privacy
      const ipHash = crypto.createHash("sha256").update(ip + "salt_omega_analytics").digest("hex").substring(0, 16);

      const { browser, os, deviceType } = parseUserAgent(ua);
      const botDetected = isBot(ua);
      const referrerDomain = input.referrer ? extractDomain(input.referrer) : null;

      // Get user ID if authenticated
      const userId = (ctx as any).user?.id || null;

      await db.insert(pageViews).values({
        path: input.path,
        referrer: input.referrer || null,
        referrerDomain: referrerDomain,
        userAgent: ua.substring(0, 500),
        ipHash,
        deviceType,
        browser,
        os,
        screenWidth: input.screenWidth || null,
        screenHeight: input.screenHeight || null,
        sessionId: input.sessionId || null,
        userId,
        isBot: botDetected,
        loadTime: input.loadTime || null,
      });

      return { success: true };
    }),

  // Get overview stats (admin only)
  getStats: adminProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const { start, end } = parseDateRange(input.startDate, input.endDate);

      const dateFilter = and(
        gte(pageViews.createdAt, start),
        lte(pageViews.createdAt, end),
        eq(pageViews.isBot, false)
      );

      // Total page views
      const [totalResult] = await db.select({ count: count() })
        .from(pageViews)
        .where(dateFilter);

      // Unique visitors (by ipHash + sessionId)
      const [uniqueResult] = await db.select({
        count: sql<number>`COUNT(DISTINCT ${pageViews.ipHash})`
      })
        .from(pageViews)
        .where(dateFilter);

      // Unique sessions
      const [sessionResult] = await db.select({
        count: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})`
      })
        .from(pageViews)
        .where(dateFilter);

      return {
        totalPageViews: totalResult?.count || 0,
        uniqueVisitors: uniqueResult?.count || 0,
        totalSessions: sessionResult?.count || 0,
      };
    }),

  // Get top pages
  getTopPages: adminProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { start, end } = parseDateRange(input.startDate, input.endDate);

      const results = await db.select({
        path: pageViews.path,
        views: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.ipHash})`,
      })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, start),
          lte(pageViews.createdAt, end),
          eq(pageViews.isBot, false)
        ))
        .groupBy(pageViews.path)
        .orderBy(desc(count()))
        .limit(input.limit);

      return results;
    }),

  // Get referrer sources
  getReferrers: adminProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { start, end } = parseDateRange(input.startDate, input.endDate);

      const results = await db.select({
        referrerDomain: sql<string>`COALESCE(${pageViews.referrerDomain}, 'Direct / None')`,
        views: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.ipHash})`,
      })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, start),
          lte(pageViews.createdAt, end),
          eq(pageViews.isBot, false)
        ))
        .groupBy(pageViews.referrerDomain)
        .orderBy(desc(count()))
        .limit(input.limit);

      return results;
    }),

  // Get daily trend data
  getDailyTrend: adminProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { start, end } = parseDateRange(input.startDate, input.endDate);

      const dateExpr = sql`DATE(${pageViews.createdAt})`;
      const results = await db.select({
        date: sql<string>`DATE(${pageViews.createdAt})`,
        views: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.ipHash})`,
        sessions: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})`,
      })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, start),
          lte(pageViews.createdAt, end),
          eq(pageViews.isBot, false)
        ))
        .groupBy(dateExpr)
        .orderBy(dateExpr);

      return results;
    }),

  // Get device breakdown
  getDeviceBreakdown: adminProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { devices: [], browsers: [], os: [] };

      const { start, end } = parseDateRange(input.startDate, input.endDate);

      const dateFilter = and(
        gte(pageViews.createdAt, start),
        lte(pageViews.createdAt, end),
        eq(pageViews.isBot, false)
      );

      const devices = await db.select({
        deviceType: sql<string>`COALESCE(${pageViews.deviceType}, 'unknown')`,
        count: count(),
      })
        .from(pageViews)
        .where(dateFilter)
        .groupBy(pageViews.deviceType)
        .orderBy(desc(count()));

      const browsers = await db.select({
        browser: sql<string>`COALESCE(${pageViews.browser}, 'unknown')`,
        count: count(),
      })
        .from(pageViews)
        .where(dateFilter)
        .groupBy(pageViews.browser)
        .orderBy(desc(count()));

      const osData = await db.select({
        os: sql<string>`COALESCE(${pageViews.os}, 'unknown')`,
        count: count(),
      })
        .from(pageViews)
        .where(dateFilter)
        .groupBy(pageViews.os)
        .orderBy(desc(count()));

      return { devices, browsers, os: osData };
    }),

  // Get page-specific stats (for the 3 requested pages)
  getPageStats: adminProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      paths: z.array(z.string()),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { start, end } = parseDateRange(input.startDate, input.endDate);

      const results = [];
      for (const path of input.paths) {
        const dateFilter = and(
          gte(pageViews.createdAt, start),
          lte(pageViews.createdAt, end),
          eq(pageViews.isBot, false),
          eq(pageViews.path, path)
        );

        const [stats] = await db.select({
          views: count(),
          uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.ipHash})`,
          sessions: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})`,
        })
          .from(pageViews)
          .where(dateFilter);

        // Get top referrers for this page
        const referrers = await db.select({
          referrerDomain: sql<string>`COALESCE(${pageViews.referrerDomain}, 'Direct / None')`,
          count: count(),
        })
          .from(pageViews)
          .where(dateFilter)
          .groupBy(pageViews.referrerDomain)
          .orderBy(desc(count()))
          .limit(5);

        // Get device breakdown for this page
        const devices = await db.select({
          deviceType: sql<string>`COALESCE(${pageViews.deviceType}, 'unknown')`,
          count: count(),
        })
          .from(pageViews)
          .where(dateFilter)
          .groupBy(pageViews.deviceType)
          .orderBy(desc(count()));

        results.push({
          path,
          views: stats?.views || 0,
          uniqueVisitors: stats?.uniqueVisitors || 0,
          sessions: stats?.sessions || 0,
          referrers,
          devices,
        });
      }

      return results;
    }),

  // Get recent page views (live feed)
  getRecentViews: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const results = await db.select({
        id: pageViews.id,
        path: pageViews.path,
        referrerDomain: pageViews.referrerDomain,
        deviceType: pageViews.deviceType,
        browser: pageViews.browser,
        os: pageViews.os,
        country: pageViews.country,
        createdAt: pageViews.createdAt,
      })
        .from(pageViews)
        .where(eq(pageViews.isBot, false))
        .orderBy(desc(pageViews.createdAt))
        .limit(input.limit);

      return results;
    }),
});
