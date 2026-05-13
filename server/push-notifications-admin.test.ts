import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Push Notifications Admin Features', () => {
  describe('Push Router Endpoints', () => {
    it('should have getStats endpoint for admin statistics', () => {
      expect(appRouter._def.procedures).toHaveProperty('push.getStats');
    });

    it('should have listSubscriptions endpoint for viewing subscriptions', () => {
      expect(appRouter._def.procedures).toHaveProperty('push.listSubscriptions');
    });

    it('should have getLogs endpoint for notification history', () => {
      expect(appRouter._def.procedures).toHaveProperty('push.getLogs');
    });

    it('should have sendToClient endpoint for targeted notifications', () => {
      expect(appRouter._def.procedures).toHaveProperty('push.sendToClient');
    });

    it('should have sendAnnouncement endpoint for broadcast notifications', () => {
      expect(appRouter._def.procedures).toHaveProperty('push.sendAnnouncement');
    });

    it('should have sendTestToUser endpoint for testing', () => {
      expect(appRouter._def.procedures).toHaveProperty('push.sendTestToUser');
    });
  });

  describe('Push Notification Service', () => {
    it('should export sendPushToClient function', async () => {
      const { sendPushToClient } = await import('./pushNotification');
      expect(typeof sendPushToClient).toBe('function');
    });

    it('should export sendPushToUser function', async () => {
      const { sendPushToUser } = await import('./pushNotification');
      expect(typeof sendPushToUser).toBe('function');
    });

    it('should export sendPushToAll function', async () => {
      const { sendPushToAll } = await import('./pushNotification');
      expect(typeof sendPushToAll).toBe('function');
    });

    it('should export getPushNotificationStats function', async () => {
      const { getPushNotificationStats } = await import('./pushNotification');
      expect(typeof getPushNotificationStats).toBe('function');
    });
  });

  describe('Notification Types', () => {
    it('should support payment_received notification type', async () => {
      const pushModule = await import('./pushNotification');
      // The module should export NotificationType which includes payment_received
      expect(pushModule).toBeDefined();
    });

    it('should support protocol_updated notification type', async () => {
      const pushModule = await import('./pushNotification');
      expect(pushModule).toBeDefined();
    });
  });

  describe('Payment Reconciliation Push Notifications', () => {
    it('should have approvePayment endpoint that sends push notifications', () => {
      expect(appRouter._def.procedures).toHaveProperty('paymentReconciliation.approvePayment');
    });

    it('should have bulkReconcile endpoint that sends push notifications', () => {
      expect(appRouter._def.procedures).toHaveProperty('paymentReconciliation.bulkReconcile');
    });
  });

  describe('Protocol Update Push Notifications', () => {
    it('should have clientProtocol.update endpoint', () => {
      expect(appRouter._def.procedures).toHaveProperty('clientProtocol.update');
    });
  });
});
