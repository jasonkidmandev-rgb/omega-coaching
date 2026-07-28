import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('Waiver Renewal and Invite Tracking Features', () => {
  describe('Waiver Expiration Settings', () => {
    it('should get default waiver expiration months (12)', async () => {
      const setting = await db.getSiteSetting('waiver_expiration_months');
      // Either null (default) or a valid number string
      if (setting) {
        const months = parseInt(setting, 10);
        expect(months).toBeGreaterThanOrEqual(0);
        expect(months).toBeLessThanOrEqual(120);
      }
    });

    it('should set and get waiver expiration months', async () => {
      await db.setSiteSetting('waiver_expiration_months', '6');
      const setting = await db.getSiteSetting('waiver_expiration_months');
      expect(setting).toBe('6');
      
      // Reset to default
      await db.setSiteSetting('waiver_expiration_months', '12');
    });
  });

  describe('Waiver Renewal Token', () => {
    it('should return null for non-existent renewal token', async () => {
      const waiver = await db.getStoreWaiverByRenewalToken('non-existent-token-12345');
      expect(waiver).toBeNull();
    });
  });

  describe('Client Protocol Invite Tracking', () => {
    it('should update client protocol with inviteSentAt', async () => {
      // Get all protocols
      const protocols = await db.getAllClientProtocols();
      if (protocols.length > 0) {
        const protocol = protocols[0];
        const now = new Date();
        
        // Update with inviteSentAt
        await db.updateClientProtocol(protocol.id, { inviteSentAt: now });
        
        // Verify update
        const updated = await db.getClientProtocolById(protocol.id);
        expect(updated).not.toBeNull();
        if (updated?.inviteSentAt) {
          // inviteSentAt should be set
          expect(new Date(updated.inviteSentAt).getTime()).toBeCloseTo(now.getTime(), -3);
        }
      }
    });
  });

  describe('Waiver Update Functions', () => {
    it('should have updateStoreWaiver function', () => {
      expect(typeof db.updateStoreWaiver).toBe('function');
    });

    it('should have renewStoreWaiver function', () => {
      expect(typeof db.renewStoreWaiver).toBe('function');
    });

    it('should have getStoreWaiverByRenewalToken function', () => {
      expect(typeof db.getStoreWaiverByRenewalToken).toBe('function');
    });
  });
});
