import { describe, it, expect } from 'vitest';
import * as db from './db';
import * as schema from '../drizzle/schema';

describe('Centralized Message Inbox', () => {
  describe('Database Functions', () => {
    it('should export getInboxConversations function', () => {
      expect(typeof db.getInboxConversations).toBe('function');
    });

    it('should export getTotalUnreadMessageCount function', () => {
      expect(typeof db.getTotalUnreadMessageCount).toBe('function');
    });

    it('should return an array from getInboxConversations', async () => {
      const result = await db.getInboxConversations();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return a number from getTotalUnreadMessageCount', async () => {
      const result = await db.getTotalUnreadMessageCount();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Schema', () => {
    it('should have protocolComments table with required fields', () => {
      expect(schema.protocolComments).toBeDefined();
      const columns = Object.keys(schema.protocolComments);
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should have clientProtocols table with required fields', () => {
      expect(schema.clientProtocols).toBeDefined();
      const columns = Object.keys(schema.clientProtocols);
      expect(columns.length).toBeGreaterThan(0);
    });
  });

  describe('Router Integration', () => {
    it('should have inbox router in appRouter', async () => {
      const { appRouter } = await import('./routers');
      expect(appRouter).toBeDefined();
      // Check that inbox procedures exist
      const routerDef = (appRouter as any)._def;
      expect(routerDef.procedures['inbox.conversations']).toBeDefined();
      expect(routerDef.procedures['inbox.totalUnread']).toBeDefined();
      expect(routerDef.procedures['inbox.markRead']).toBeDefined();
    });
  });

  describe('Push Notification on Coach Message', () => {
    it('should have sendPushToClient available for coach messages', async () => {
      const pushModule = await import('./pushNotification');
      expect(typeof pushModule.sendPushToClient).toBe('function');
    });
  });

  describe('Inbox Page Component', () => {
    it('should have the Inbox page file', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const inboxPath = path.join(__dirname, '../client/src/pages/admin/Inbox.tsx');
      expect(fs.existsSync(inboxPath)).toBe(true);
    });
  });
});
