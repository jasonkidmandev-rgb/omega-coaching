/**
 * Push Notification Fixes Tests
 * Tests for:
 * 1. push_subscriptions DB schema has all required columns
 * 2. sendTestToSelf endpoint exists in push router
 * 3. sendPushToAll is callable for email engagement notifications
 * 4. createNotificationsForEnabledUsers works with protocol_viewed type
 */

import { describe, it, expect } from 'vitest';

describe('Push Notification Fixes (Feb 15)', () => {
  describe('Push Router - sendTestToSelf endpoint', () => {
    it('should have sendTestToSelf procedure in pushRouter', async () => {
      const { pushRouter } = await import('./push/router');
      const procedures = pushRouter._def.procedures;
      expect(procedures).toHaveProperty('sendTestToSelf');
    });

    it('should have all required push router procedures', async () => {
      const { pushRouter } = await import('./push/router');
      const procedures = pushRouter._def.procedures;
      expect(procedures).toHaveProperty('getVapidKey');
      expect(procedures).toHaveProperty('subscribe');
      expect(procedures).toHaveProperty('unsubscribe');
      expect(procedures).toHaveProperty('sendToClient');
      expect(procedures).toHaveProperty('sendAnnouncement');
      expect(procedures).toHaveProperty('sendTestToSelf');
      expect(procedures).toHaveProperty('sendTestToUser');
      expect(procedures).toHaveProperty('getStats');
      expect(procedures).toHaveProperty('listSubscriptions');
      expect(procedures).toHaveProperty('getLogs');
    });
  });

  describe('Push Notification Service exports', () => {
    it('should export sendPushToAll function', async () => {
      const { sendPushToAll } = await import('./pushNotification');
      expect(typeof sendPushToAll).toBe('function');
    });

    it('should export sendPushToUser function', async () => {
      const { sendPushToUser } = await import('./pushNotification');
      expect(typeof sendPushToUser).toBe('function');
    });

    it('should export VAPID_PUBLIC_KEY', async () => {
      const { VAPID_PUBLIC_KEY } = await import('./pushNotification');
      expect(VAPID_PUBLIC_KEY).toBeDefined();
      expect(typeof VAPID_PUBLIC_KEY).toBe('string');
      expect(VAPID_PUBLIC_KEY.length).toBeGreaterThan(10);
    });
  });

  describe('In-App Notification System', () => {
    it('should export createNotificationsForEnabledUsers', async () => {
      const { createNotificationsForEnabledUsers } = await import('./db');
      expect(typeof createNotificationsForEnabledUsers).toBe('function');
    });

    it('should have protocol_viewed in ALL_NOTIFICATION_TYPES', async () => {
      const { ALL_NOTIFICATION_TYPES } = await import('./db');
      expect(ALL_NOTIFICATION_TYPES).toContain('protocol_viewed');
    });

    it('should have protocol_approved in ALL_NOTIFICATION_TYPES', async () => {
      const { ALL_NOTIFICATION_TYPES } = await import('./db');
      expect(ALL_NOTIFICATION_TYPES).toContain('protocol_approved');
    });
  });

  describe('Push Subscriptions Schema', () => {
    it('should have pushSubscriptions table with all required columns', async () => {
      const schema = await import('../drizzle/schema');
      const table = schema.pushSubscriptions;
      expect(table).toBeDefined();
      
      // Check that the schema has the critical columns
      const columns = Object.keys(table);
      // The table object should have column accessors
      expect(table.id).toBeDefined();
      expect(table.userId).toBeDefined();
      expect(table.endpoint).toBeDefined();
      expect(table.p256dh).toBeDefined();
      expect(table.auth).toBeDefined();
      expect(table.clientId).toBeDefined();
      expect(table.userAgent).toBeDefined();
      expect(table.deviceType).toBeDefined();
      expect(table.isActive).toBeDefined();
      expect(table.lastUsedAt).toBeDefined();
      expect(table.failureCount).toBeDefined();
      expect(table.notifyProtocolUpdates).toBeDefined();
      expect(table.notifyPaymentDue).toBeDefined();
      expect(table.notifyPaymentReceived).toBeDefined();
      expect(table.notifyCheckins).toBeDefined();
      expect(table.notifyAnnouncements).toBeDefined();
    });

    it('should have pushNotificationLogs table', async () => {
      const schema = await import('../drizzle/schema');
      expect(schema.pushNotificationLogs).toBeDefined();
    });
  });

  describe('Service Worker Files', () => {
    it('should have sw.js with push event handler', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const swPath = path.join(process.cwd(), 'client/public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);
      
      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toContain("addEventListener('push'");
      expect(content).toContain("showNotification");
      expect(content).toContain("addEventListener('notificationclick'");
    });

    it('should have sw-push.js with push event handler', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const swPath = path.join(process.cwd(), 'client/public/sw-push.js');
      expect(fs.existsSync(swPath)).toBe(true);
      
      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toContain("addEventListener('push'");
      expect(content).toContain("showNotification");
    });

    it('should have manifest.json with proper PWA config', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const manifestPath = path.join(process.cwd(), 'client/public/manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(content.name).toBeDefined();
      expect(content.start_url).toBeDefined();
      expect(content.display).toBe('standalone');
      expect(content.icons).toBeDefined();
      expect(content.icons.length).toBeGreaterThan(0);
    });
  });

  describe('Email Tracking Integration', () => {
    it('should have email tracking open handler that creates notifications', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(process.cwd(), 'server/_core/index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');
      
      // Check that the tracking pixel handler creates in-app notifications
      expect(content).toContain('createNotificationsForEnabledUsers');
      expect(content).toContain("'protocol_viewed'");
      
      // Check that it also sends push notifications
      expect(content).toContain('sendPushToAll');
      expect(content).toContain('opened their protocol');
    });

    it('should have engagement tracking handler that creates notifications', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(process.cwd(), 'server/_core/index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');
      
      // Check that the new engagement tracking also creates notifications
      expect(content).toContain('engagement-open-');
      expect(content).toContain('opened their email');
    });
  });
});
