/**
 * Push Notification Router
 * Handles push notification subscription and management
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../_core/trpc';
import {
  subscribeToPush,
  unsubscribeFromPush,
  sendPushToUser,
  sendPushToClient,
  sendPushToAll,
  getPushNotificationStats,
  VAPID_PUBLIC_KEY,
} from '../pushNotification';
import { getDb } from '../db';
import { pushSubscriptions, pushNotificationLogs } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';

export const pushRouter = router({
  // Get VAPID public key for client-side subscription
  getVapidKey: publicProcedure.query(() => {
    return { publicKey: VAPID_PUBLIC_KEY };
  }),

  // Subscribe to push notifications
  subscribe: publicProcedure
    .input(z.object({
      endpoint: z.string(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
      userAgent: z.string().optional(),
      deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await subscribeToPush(
        {
          endpoint: input.endpoint,
          keys: input.keys,
        },
        {
          userId: ctx.user?.id,
          userAgent: input.userAgent,
          deviceType: input.deviceType,
        }
      );
      return result;
    }),

  // Subscribe with client association (for client portal)
  subscribeAsClient: publicProcedure
    .input(z.object({
      endpoint: z.string(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
      clientId: z.number(),
      userAgent: z.string().optional(),
      deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await subscribeToPush(
        {
          endpoint: input.endpoint,
          keys: input.keys,
        },
        {
          clientId: input.clientId,
          userAgent: input.userAgent,
          deviceType: input.deviceType,
        }
      );
      return result;
    }),

  // Unsubscribe from push notifications
  unsubscribe: publicProcedure
    .input(z.object({
      endpoint: z.string(),
    }))
    .mutation(async ({ input }) => {
      const success = await unsubscribeFromPush(input.endpoint);
      return { success };
    }),

  // Update notification preferences
  updatePreferences: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
      notifyProtocolUpdates: z.boolean().optional(),
      notifyPaymentDue: z.boolean().optional(),
      notifyPaymentReceived: z.boolean().optional(),
      notifyCheckins: z.boolean().optional(),
      notifyAnnouncements: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { subscriptionId, ...preferences } = input;
      await db
        .update(pushSubscriptions)
        .set(preferences)
        .where(eq(pushSubscriptions.id, subscriptionId));

      return { success: true };
    }),

  // Get user's subscriptions
  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, ctx.user.id),
        eq(pushSubscriptions.isActive, true)
      ));
  }),

  // Admin: Get push notification statistics
  getStats: adminProcedure.query(async () => {
    return getPushNotificationStats();
  }),

  // Admin: Get all active subscriptions
  listSubscriptions: adminProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { subscriptions: [], total: 0 };

      const subscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.isActive, true))
        .orderBy(desc(pushSubscriptions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { subscriptions, total: subscriptions.length };
    }),

  // Admin: Get notification logs
  getLogs: adminProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
      status: z.enum(['pending', 'sent', 'delivered', 'failed', 'clicked']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      const baseQuery = db
        .select()
        .from(pushNotificationLogs);

      const logs = input.status
        ? await baseQuery
            .where(eq(pushNotificationLogs.status, input.status))
            .orderBy(desc(pushNotificationLogs.createdAt))
            .limit(input.limit)
            .offset(input.offset)
        : await baseQuery
            .orderBy(desc(pushNotificationLogs.createdAt))
            .limit(input.limit)
            .offset(input.offset);

      return { logs, total: logs.length };
    }),

  // Admin: Send test notification to a user
  sendTestToUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      title: z.string(),
      body: z.string(),
      url: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await sendPushToUser(
        input.userId,
        {
          title: input.title,
          body: input.body,
          url: input.url,
        },
        'custom'
      );
      return result;
    }),

  // Admin: Send notification to a client
  sendToClient: adminProcedure
    .input(z.object({
      clientId: z.number(),
      title: z.string(),
      body: z.string(),
      url: z.string().optional(),
      notificationType: z.enum([
        'protocol_updated',
        'payment_due',
        'payment_received',
        'checkin_available',
        'checkin_reminder',
        'announcement',
        'custom'
      ]).optional().default('custom'),
    }))
    .mutation(async ({ input }) => {
      const result = await sendPushToClient(
        input.clientId,
        {
          title: input.title,
          body: input.body,
          url: input.url,
        },
        input.notificationType
      );
      return result;
    }),

  // Admin: Send test notification to self (current logged-in user)
  sendTestToSelf: adminProcedure
    .mutation(async ({ ctx }) => {
      const result = await sendPushToUser(
        ctx.user.id,
        {
          title: 'Test Push Notification',
          body: 'If you see this, push notifications are working correctly!',
          url: '/admin/push-notifications',
        },
        'custom'
      );
      return result;
    }),

  // Admin: Send announcement to all subscribers
  sendAnnouncement: adminProcedure
    .input(z.object({
      title: z.string(),
      body: z.string(),
      url: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await sendPushToAll(
        {
          title: input.title,
          body: input.body,
          url: input.url,
        },
        'announcement'
      );
      return result;
    }),
});
