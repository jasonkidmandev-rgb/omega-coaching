/**
 * Push Notification Service
 * Handles Web Push API notifications for the PWA
 */

import webpush from 'web-push';
import { getDb } from './db';
import { pushSubscriptions, pushNotificationLogs, users } from '../drizzle/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';

// VAPID keys for Web Push
const VAPID_PUBLIC_KEY = 'BImRHF64hUETZkqsXEQgY4G4x6LD4YHadpgyOfhywetfK4U2VDr-JaGMvXBRNQp4jH2Df0wTEoG28432s90TLYM';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'hdLZP4FPM2tFbxmcj9nN6fid8IzbnOsxPk98CeykXHk';

// Configure web-push
webpush.setVapidDetails(
  'mailto:support@peptidecoach.pro',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export { VAPID_PUBLIC_KEY };

export type NotificationType = 
  | 'protocol_updated'
  | 'payment_due'
  | 'payment_received'
  | 'checkin_available'
  | 'checkin_reminder'
  | 'announcement'
  | 'custom';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Subscribe a device to push notifications
 */
export async function subscribeToPush(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  options: {
    userId?: number;
    clientId?: number;
    userAgent?: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
  } = {}
): Promise<{ id: number; isNew: boolean }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Check if subscription already exists
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
    .limit(1);

  if (existing.length > 0) {
    // Update existing subscription
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: options.userId,
        clientId: options.clientId,
        userAgent: options.userAgent,
        deviceType: options.deviceType,
        isActive: true,
        failureCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existing[0].id));

    return { id: existing[0].id, isNew: false };
  }

  // Create new subscription
  const [result] = await db.insert(pushSubscriptions).values({
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userId: options.userId,
    clientId: options.clientId,
    userAgent: options.userAgent,
    deviceType: options.deviceType || 'desktop',
    isActive: true,
    failureCount: 0,
  });

  return { id: result.insertId, isNew: true };
}

/**
 * Unsubscribe a device from push notifications
 */
export async function unsubscribeFromPush(endpoint: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .update(pushSubscriptions)
    .set({ isActive: false })
    .where(eq(pushSubscriptions.endpoint, endpoint));

  return true;
}

/**
 * Send a push notification to a specific subscription
 */
export async function sendPushNotification(
  subscriptionId: number,
  payload: PushNotificationPayload,
  notificationType: NotificationType,
  options: {
    clientProtocolId?: number;
    userId?: number;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };
  
  // Get subscription details
  const [subscription] = await db
    .select()
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.id, subscriptionId),
      eq(pushSubscriptions.isActive, true)
    ))
    .limit(1);

  if (!subscription) {
    return { success: false, error: 'Subscription not found or inactive' };
  }

  // Check notification preferences
  const shouldSend = checkNotificationPreference(subscription, notificationType);
  if (!shouldSend) {
    return { success: false, error: 'User has disabled this notification type' };
  }

  // Create log entry
  const [logResult] = await db.insert(pushNotificationLogs).values({
    subscriptionId,
    title: payload.title,
    body: payload.body,
    icon: payload.icon,
    url: payload.url,
    notificationType,
    clientProtocolId: options.clientProtocolId,
    userId: options.userId,
    status: 'pending',
  });

  const logId = logResult.insertId;

  try {
    // Send the push notification
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        ...payload,
        icon: payload.icon || '/pwa-icon-192x192.png',
        badge: payload.badge || '/pwa-icon-72x72.png',
      })
    );

    // Update log as sent
    await db
      .update(pushNotificationLogs)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(pushNotificationLogs.id, logId));

    // Update subscription last used
    await db
      .update(pushSubscriptions)
      .set({ lastUsedAt: new Date(), failureCount: 0 })
      .where(eq(pushSubscriptions.id, subscriptionId));

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update log as failed
    await db
      .update(pushNotificationLogs)
      .set({ status: 'failed', errorMessage })
      .where(eq(pushNotificationLogs.id, logId));

    // Increment failure count
    await db
      .update(pushSubscriptions)
      .set({ 
        failureCount: sql`${pushSubscriptions.failureCount} + 1`,
      })
      .where(eq(pushSubscriptions.id, subscriptionId));

    // If too many failures, deactivate subscription
    if (subscription.failureCount >= 2) {
      await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where(eq(pushSubscriptions.id, subscriptionId));
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Send push notification to all subscriptions for a user
 */
export async function sendPushToUser(
  userId: number,
  payload: PushNotificationPayload,
  notificationType: NotificationType,
  options: { clientProtocolId?: number } = {}
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };
  
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, userId),
      eq(pushSubscriptions.isActive, true)
    ));

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub.id, payload, notificationType, {
      ...options,
      userId,
    });
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send push notification to all subscriptions for a client
 */
export async function sendPushToClient(
  clientId: number,
  payload: PushNotificationPayload,
  notificationType: NotificationType,
  options: { clientProtocolId?: number } = {}
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };
  
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.clientId, clientId),
      eq(pushSubscriptions.isActive, true)
    ));

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub.id, payload, notificationType, options);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send push notification to all active subscriptions (for announcements)
 */
export async function sendPushToAll(
  payload: PushNotificationPayload,
  notificationType: NotificationType = 'announcement'
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };
  
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.isActive, true));

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub.id, payload, notificationType);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send push notification to all admin users
 */
export async function sendPushToAdmins(
  payload: PushNotificationPayload,
  notificationType: NotificationType = 'custom'
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };
  
  // Get all admin user IDs
  const admins = await db.select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.role, 'admin'),
      isNotNull(users.email)
    ));

  let sent = 0;
  let failed = 0;

  for (const admin of admins) {
    const result = await sendPushToUser(admin.id, payload, notificationType);
    sent += result.sent;
    failed += result.failed;
  }

  console.log(`[Push] Sent push to ${sent} admin subscriptions (${failed} failed)`);
  return { sent, failed };
}

/**
 * Check if a notification type is enabled for a subscription
 */
function checkNotificationPreference(
  subscription: typeof pushSubscriptions.$inferSelect,
  notificationType: NotificationType
): boolean {
  switch (notificationType) {
    case 'protocol_updated':
      return subscription.notifyProtocolUpdates;
    case 'payment_due':
      return subscription.notifyPaymentDue;
    case 'payment_received':
      return subscription.notifyPaymentReceived;
    case 'checkin_available':
    case 'checkin_reminder':
      return subscription.notifyCheckins;
    case 'announcement':
      return subscription.notifyAnnouncements;
    case 'custom':
      return true;
    default:
      return true;
  }
}

/**
 * Get notification statistics
 */
export async function getPushNotificationStats(): Promise<{
  totalSubscriptions: number;
  activeSubscriptions: number;
  notificationsSent: number;
  notificationsFailed: number;
}> {
  const db = await getDb();
  if (!db) return { totalSubscriptions: 0, activeSubscriptions: 0, notificationsSent: 0, notificationsFailed: 0 };
  
  const [totalResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(pushSubscriptions);

  const [activeResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.isActive, true));

  const [sentResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(pushNotificationLogs)
    .where(eq(pushNotificationLogs.status, 'sent'));

  const [failedResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(pushNotificationLogs)
    .where(eq(pushNotificationLogs.status, 'failed'));

  return {
    totalSubscriptions: totalResult.count,
    activeSubscriptions: activeResult.count,
    notificationsSent: sentResult.count,
    notificationsFailed: failedResult.count,
  };
}
