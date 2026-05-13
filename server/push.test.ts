/**
 * Push Notification Tests
 */

import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Push Notification System', () => {
  describe('Push Router Import', () => {
    it('should import pushRouter successfully', async () => {
      const { pushRouter } = await import('./push/router');
      expect(pushRouter).toBeDefined();
      expect(pushRouter._def).toBeDefined();
    });

    it('should have required procedures in pushRouter', async () => {
      const { pushRouter } = await import('./push/router');
      const procedures = pushRouter._def.procedures;
      expect(procedures).toHaveProperty('getVapidKey');
      expect(procedures).toHaveProperty('subscribe');
      expect(procedures).toHaveProperty('unsubscribe');
    });
  });

  describe('Push Notification Service', () => {
    it('should export VAPID_PUBLIC_KEY', async () => {
      const { VAPID_PUBLIC_KEY } = await import('./pushNotification');
      expect(VAPID_PUBLIC_KEY).toBeDefined();
      expect(typeof VAPID_PUBLIC_KEY).toBe('string');
      expect(VAPID_PUBLIC_KEY.length).toBeGreaterThan(0);
    });

    it('should export subscribeToPush function', async () => {
      const { subscribeToPush } = await import('./pushNotification');
      expect(typeof subscribeToPush).toBe('function');
    });

    it('should export unsubscribeFromPush function', async () => {
      const { unsubscribeFromPush } = await import('./pushNotification');
      expect(typeof unsubscribeFromPush).toBe('function');
    });

    it('should export sendPushNotification function', async () => {
      const { sendPushNotification } = await import('./pushNotification');
      expect(typeof sendPushNotification).toBe('function');
    });

    it('should export sendPushToUser function', async () => {
      const { sendPushToUser } = await import('./pushNotification');
      expect(typeof sendPushToUser).toBe('function');
    });

    it('should export sendPushToClient function', async () => {
      const { sendPushToClient } = await import('./pushNotification');
      expect(typeof sendPushToClient).toBe('function');
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

  describe('Push Notification Schema', () => {
    it('should have push_subscriptions table in schema', async () => {
      const schema = await import('../drizzle/schema');
      expect(schema.pushSubscriptions).toBeDefined();
    });

    it('should have push_notification_logs table in schema', async () => {
      const schema = await import('../drizzle/schema');
      expect(schema.pushNotificationLogs).toBeDefined();
    });
  });

  describe('Service Worker', () => {
    it('should have service worker file', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const swPath = path.join(process.cwd(), 'client/public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);
    });

    it('should have manifest.json file', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const manifestPath = path.join(process.cwd(), 'client/public/manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
    });
  });
});
