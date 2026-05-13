import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { clientNotificationHistory, clientProtocols } from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

export const notificationHistoryRouter = router({
  // Get notification history for a specific client
  getByClient: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      category: z.enum(['checkin', 'protocol', 'payment', 'shipping', 'inventory', 'document', 'welcome', 'announcement', 'digest', 'other']).optional(),
      status: z.enum(['sent', 'failed', 'pending', 'bounced']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const database = await db();
      
      const conditions = [eq(clientNotificationHistory.clientProtocolId, input.clientProtocolId)];
      
      if (input.category) {
        conditions.push(eq(clientNotificationHistory.category, input.category));
      }
      if (input.status) {
        conditions.push(eq(clientNotificationHistory.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(clientNotificationHistory.sentAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(clientNotificationHistory.sentAt, new Date(input.endDate)));
      }
      
      const notifications = await database
        .select()
        .from(clientNotificationHistory)
        .where(and(...conditions))
        .orderBy(desc(clientNotificationHistory.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      // Get total count
      const [countResult] = await database
        .select({ count: sql<number>`count(*)` })
        .from(clientNotificationHistory)
        .where(and(...conditions));
      
      return {
        notifications,
        total: countResult?.count || 0,
      };
    }),

  // Get notification statistics (global or per-client)
  getStats: adminProcedure
    .input(z.object({ 
      clientProtocolId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const database = await db();
      
      const conditions = [];
      if (input.clientProtocolId) {
        conditions.push(eq(clientNotificationHistory.clientProtocolId, input.clientProtocolId));
      }
      if (input.startDate) {
        conditions.push(gte(clientNotificationHistory.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(clientNotificationHistory.createdAt, new Date(input.endDate)));
      }
      if (input.category) {
        conditions.push(eq(clientNotificationHistory.category, input.category as any));
      }
      
      const stats = await database
        .select({
          category: clientNotificationHistory.category,
          status: clientNotificationHistory.status,
          count: sql<number>`count(*)`,
        })
        .from(clientNotificationHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(clientNotificationHistory.category, clientNotificationHistory.status);
      
      // Calculate totals
      const byCategory: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let total = 0;
      let sent = 0;
      let failed = 0;
      let pending = 0;
      
      for (const stat of stats) {
        byCategory[stat.category] = (byCategory[stat.category] || 0) + stat.count;
        byStatus[stat.status] = (byStatus[stat.status] || 0) + stat.count;
        total += stat.count;
        if (stat.status === 'sent') sent += stat.count;
        if (stat.status === 'failed') failed += stat.count;
        if (stat.status === 'pending') pending += stat.count;
      }
      
      return {
        total,
        sent,
        failed,
        pending,
        byCategory,
        byStatus,
        details: stats,
      };
    }),

  // Get recent notifications across all clients (for dashboard)
  getRecent: adminProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
      status: z.enum(['sent', 'failed', 'pending', 'bounced']).optional(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const database = await db();
      
      const conditions = [];
      if (input.status) {
        conditions.push(eq(clientNotificationHistory.status, input.status));
      }
      if (input.category) {
        conditions.push(eq(clientNotificationHistory.category, input.category as any));
      }
      
      const notifications = await database
        .select()
        .from(clientNotificationHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(clientNotificationHistory.createdAt))
        .limit(input.limit);
      
      return notifications;
    }),

  // Comprehensive list endpoint for notification history admin page
  list: adminProcedure
    .input(z.object({
      channel: z.enum(['all', 'email', 'push', 'inapp']).optional().default('all'),
      category: z.enum(['all', 'checkin', 'protocol', 'payment', 'shipping', 'inventory', 'document', 'welcome', 'announcement', 'digest', 'other']).optional().default('all'),
      status: z.enum(['all', 'sent', 'failed', 'pending', 'bounced']).optional().default('all'),
      deliveryStatus: z.enum(['all', 'sent_only', 'opened', 'clicked']).optional().default('all'),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
      recipientEmail: z.string().optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const database = await db();
      const { emailTracking } = await import('../../drizzle/schema');
      
      const conditions = [];
      
      if (input.recipientEmail) {
        conditions.push(eq(clientNotificationHistory.recipientEmail, input.recipientEmail));
      }
      if (input.category && input.category !== 'all') {
        conditions.push(eq(clientNotificationHistory.category, input.category));
      }
      if (input.status && input.status !== 'all') {
        conditions.push(eq(clientNotificationHistory.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(clientNotificationHistory.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(clientNotificationHistory.createdAt, new Date(input.endDate)));
      }
      if (input.search) {
        conditions.push(
          sql`(${clientNotificationHistory.recipientEmail} LIKE ${`%${input.search}%`} OR ${clientNotificationHistory.recipientName} LIKE ${`%${input.search}%`} OR ${clientNotificationHistory.subject} LIKE ${`%${input.search}%`})`
        );
      }
      // Delivery status filter using email_tracking join data
      if (input.deliveryStatus === 'opened') {
        conditions.push(sql`${emailTracking.openedAt} IS NOT NULL`);
      } else if (input.deliveryStatus === 'clicked') {
        conditions.push(sql`${emailTracking.clickedAt} IS NOT NULL`);
      } else if (input.deliveryStatus === 'sent_only') {
        conditions.push(sql`${emailTracking.openedAt} IS NULL`);
      }
      
      const notifications = await database
        .select({
          id: clientNotificationHistory.id,
          clientProtocolId: clientNotificationHistory.clientProtocolId,
          recipientEmail: clientNotificationHistory.recipientEmail,
          recipientName: clientNotificationHistory.recipientName,
          category: clientNotificationHistory.category,
          notificationType: clientNotificationHistory.notificationType,
          subject: clientNotificationHistory.subject,
          previewText: clientNotificationHistory.previewText,
          status: clientNotificationHistory.status,
          errorMessage: clientNotificationHistory.errorMessage,
          triggeredBy: clientNotificationHistory.triggeredBy,
          sentAt: clientNotificationHistory.sentAt,
          createdAt: clientNotificationHistory.createdAt,
          clientName: clientProtocols.clientName,
          // Tracking data from email_tracking table
          trackingId: clientNotificationHistory.trackingId,
          openedAt: emailTracking.openedAt,
          openCount: emailTracking.openCount,
          clickedAt: emailTracking.clickedAt,
          clickCount: emailTracking.clickCount,
        })
        .from(clientNotificationHistory)
        .leftJoin(clientProtocols, eq(clientNotificationHistory.clientProtocolId, clientProtocols.id))
        .leftJoin(emailTracking, eq(clientNotificationHistory.trackingId, emailTracking.trackingId))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(clientNotificationHistory.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      // Get total count (with same joins for delivery status filter)
      const countConditions = [...conditions];
      let countQuery = database
        .select({ count: sql<number>`count(*)` })
        .from(clientNotificationHistory);
      
      if (input.deliveryStatus && input.deliveryStatus !== 'all') {
        countQuery = countQuery.leftJoin(emailTracking, eq(clientNotificationHistory.trackingId, emailTracking.trackingId)) as any;
      }
      
      const [countResult] = await countQuery.where(conditions.length > 0 ? and(...conditions) : undefined);
      
      return {
        notifications,
        total: countResult?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // Get in-app notifications for admin history page
  listInApp: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
      isRead: z.boolean().optional(),
      clientProtocolId: z.number().optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const database = await db();
      const { notifications, users } = await import("../../drizzle/schema");
      
      const conditions = [];
      
      if (input.clientProtocolId) {
        conditions.push(eq(notifications.clientProtocolId, input.clientProtocolId));
      }
      if (input.startDate) {
        conditions.push(gte(notifications.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(notifications.createdAt, new Date(input.endDate)));
      }
      if (input.isRead !== undefined) {
        conditions.push(eq(notifications.isRead, input.isRead));
      }
      if (input.search) {
        conditions.push(
          sql`(${notifications.title} LIKE ${`%${input.search}%`} OR ${notifications.message} LIKE ${`%${input.search}%`})`
        );
      }
      
      const results = await database
        .select({
          id: notifications.id,
          userId: notifications.userId,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          clientProtocolId: notifications.clientProtocolId,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      // Get total count
      const [countResult] = await database
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      return {
        notifications: results,
        total: countResult?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // Get comprehensive stats for the notification history page
  getComprehensiveStats: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const database = await db();
      const { notifications } = await import("../../drizzle/schema");
      
      const emailConditions = [];
      const inAppConditions = [];
      
      if (input.startDate) {
        emailConditions.push(gte(clientNotificationHistory.createdAt, new Date(input.startDate)));
        inAppConditions.push(gte(notifications.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        emailConditions.push(lte(clientNotificationHistory.createdAt, new Date(input.endDate)));
        inAppConditions.push(lte(notifications.createdAt, new Date(input.endDate)));
      }
      
      // Email notification stats
      const emailStats = await database
        .select({
          status: clientNotificationHistory.status,
          count: sql<number>`count(*)`,
        })
        .from(clientNotificationHistory)
        .where(emailConditions.length > 0 ? and(...emailConditions) : undefined)
        .groupBy(clientNotificationHistory.status);
      
      // In-app notification stats
      const inAppStats = await database
        .select({
          isRead: notifications.isRead,
          count: sql<number>`count(*)`,
        })
        .from(notifications)
        .where(inAppConditions.length > 0 ? and(...inAppConditions) : undefined)
        .groupBy(notifications.isRead);
      
      // Category breakdown for emails
      const categoryStats = await database
        .select({
          category: clientNotificationHistory.category,
          count: sql<number>`count(*)`,
        })
        .from(clientNotificationHistory)
        .where(emailConditions.length > 0 ? and(...emailConditions) : undefined)
        .groupBy(clientNotificationHistory.category);
      
      // Email engagement stats from email_tracking table
      const { emailTracking } = await import('../../drizzle/schema');
      const engagementStats = await database
        .select({
          totalTracked: sql<number>`count(*)`,
          opened: sql<number>`SUM(CASE WHEN ${emailTracking.openedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
          clicked: sql<number>`SUM(CASE WHEN ${emailTracking.clickedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        })
        .from(emailTracking);
      
      const engagement = engagementStats[0] || { totalTracked: 0, opened: 0, clicked: 0 };
      
      // Calculate totals
      let emailTotal = 0, emailSent = 0, emailFailed = 0, emailPending = 0;
      for (const stat of emailStats) {
        emailTotal += stat.count;
        if (stat.status === 'sent') emailSent = stat.count;
        if (stat.status === 'failed') emailFailed = stat.count;
        if (stat.status === 'pending') emailPending = stat.count;
      }
      
      let inAppTotal = 0, inAppRead = 0, inAppUnread = 0;
      for (const stat of inAppStats) {
        inAppTotal += stat.count;
        if (stat.isRead) inAppRead = stat.count;
        else inAppUnread = stat.count;
      }
      
      return {
        email: {
          total: emailTotal,
          sent: emailSent,
          failed: emailFailed,
          pending: emailPending,
          successRate: emailTotal > 0 ? Math.round((emailSent / emailTotal) * 100) : 0,
          tracked: Number(engagement.totalTracked) || 0,
          opened: Number(engagement.opened) || 0,
          clicked: Number(engagement.clicked) || 0,
          openRate: Number(engagement.totalTracked) > 0 ? Math.round((Number(engagement.opened) / Number(engagement.totalTracked)) * 100) : 0,
          clickRate: Number(engagement.totalTracked) > 0 ? Math.round((Number(engagement.clicked) / Number(engagement.totalTracked)) * 100) : 0,
        },
        inApp: {
          total: inAppTotal,
          read: inAppRead,
          unread: inAppUnread,
          readRate: inAppTotal > 0 ? Math.round((inAppRead / inAppTotal) * 100) : 0,
        },
        byCategory: categoryStats.reduce((acc, stat) => {
          acc[stat.category] = stat.count;
          return acc;
        }, {} as Record<string, number>),
      };
    }),

  // Log a new notification (internal use, called by email sending functions)
  log: adminProcedure
    .input(z.object({
      clientProtocolId: z.number().optional(),
      userId: z.number().optional(),
      recipientEmail: z.string(),
      recipientName: z.string().optional(),
      category: z.enum(['checkin', 'protocol', 'payment', 'shipping', 'inventory', 'document', 'welcome', 'announcement', 'digest', 'other']),
      notificationType: z.string(),
      subject: z.string(),
      previewText: z.string().optional(),
      status: z.enum(['sent', 'failed', 'pending', 'bounced']).optional(),
      errorMessage: z.string().optional(),
      relatedEntityType: z.string().optional(),
      relatedEntityId: z.number().optional(),
      triggeredBy: z.enum(['system', 'cron', 'admin', 'webhook']).optional(),
      triggeredByUserId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      
      const result = await database.insert(clientNotificationHistory).values({
        ...input,
        status: input.status || 'sent',
        triggeredBy: input.triggeredBy || 'system',
        sentAt: input.status === 'sent' ? new Date() : null,
      });
      
      return { id: result[0].insertId };
    }),

  // Update notification status (e.g., when email bounces)
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['sent', 'failed', 'pending', 'bounced']),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      
      await database
        .update(clientNotificationHistory)
        .set({
          status: input.status,
          errorMessage: input.errorMessage,
          sentAt: input.status === 'sent' ? new Date() : undefined,
        })
        .where(eq(clientNotificationHistory.id, input.id));
      
      return { success: true };
    }),

  // Get failed notifications for retry
  getFailedNotifications: adminProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      const database = await db();
      
      const notifications = await database
        .select({
          notification: clientNotificationHistory,
          clientName: clientProtocols.clientName,
          clientEmail: clientProtocols.clientEmail,
        })
        .from(clientNotificationHistory)
        .leftJoin(clientProtocols, eq(clientNotificationHistory.clientProtocolId, clientProtocols.id))
        .where(eq(clientNotificationHistory.status, 'failed'))
        .orderBy(desc(clientNotificationHistory.createdAt))
        .limit(input.limit);
      
      return notifications;
    }),
});

// Helper function to log notification (can be called from other parts of the app)
export async function logNotification(data: {
  clientProtocolId?: number | null;
  userId?: number;
  recipientEmail: string;
  recipientName?: string;
  category: 'checkin' | 'protocol' | 'payment' | 'shipping' | 'inventory' | 'document' | 'welcome' | 'announcement' | 'digest' | 'other';
  notificationType: string;
  subject: string;
  previewText?: string;
  status?: 'sent' | 'failed' | 'pending' | 'bounced';
  errorMessage?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  triggeredBy?: 'system' | 'cron' | 'admin' | 'webhook';
  triggeredByUserId?: number;
  trackingId?: string;
}) {
  try {
    const database = await db();
    
    await database.insert(clientNotificationHistory).values({
      ...data,
      status: data.status || 'sent',
      triggeredBy: data.triggeredBy || 'system',
      sentAt: data.status === 'sent' || !data.status ? new Date() : null,
    });
  } catch (error) {
    console.error('[NotificationHistory] Failed to log notification:', error);
  }
}
