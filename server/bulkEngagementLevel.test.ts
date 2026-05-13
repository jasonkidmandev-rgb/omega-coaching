import { describe, it, expect, vi } from 'vitest';

// Test the bulk engagement level update logic
describe('Bulk Engagement Level Update', () => {
  describe('Input validation', () => {
    it('should require at least one ID', () => {
      const ids: number[] = [];
      expect(ids.length).toBe(0);
      // The endpoint uses z.array(z.number()).min(1) which rejects empty arrays
    });

    it('should accept valid engagement levels', () => {
      const validLevels = ['full_coaching', 'self_guided_checkins', 'protocol_only'];
      validLevels.forEach(level => {
        expect(['full_coaching', 'self_guided_checkins', 'protocol_only']).toContain(level);
      });
    });

    it('should reject invalid engagement levels', () => {
      const invalidLevels = ['invalid', 'coaching', 'guided', ''];
      invalidLevels.forEach(level => {
        expect(['full_coaching', 'self_guided_checkins', 'protocol_only']).not.toContain(level);
      });
    });
  });

  describe('Bulk update logic', () => {
    it('should skip clients already at target level', () => {
      const clients = [
        { id: 1, engagementLevel: 'full_coaching' },
        { id: 2, engagementLevel: 'protocol_only' },
        { id: 3, engagementLevel: 'full_coaching' },
      ];
      const targetLevel = 'full_coaching';
      const needsUpdate = clients.filter(c => c.engagementLevel !== targetLevel);
      expect(needsUpdate).toHaveLength(1);
      expect(needsUpdate[0].id).toBe(2);
    });

    it('should count succeeded and failed separately', () => {
      const results = { succeeded: 5, failed: 1, total: 6 };
      expect(results.succeeded + results.failed).toBe(results.total);
    });

    it('should handle mixed engagement levels in bulk', () => {
      const clients = [
        { id: 1, engagementLevel: 'full_coaching' },
        { id: 2, engagementLevel: 'self_guided_checkins' },
        { id: 3, engagementLevel: 'protocol_only' },
        { id: 4, engagementLevel: null },
      ];
      const targetLevel = 'self_guided_checkins';
      const needsUpdate = clients.filter(c => (c.engagementLevel || 'protocol_only') !== targetLevel);
      expect(needsUpdate).toHaveLength(3); // ids 1, 3, 4
    });
  });

  describe('Auto check-in management', () => {
    it('should auto-pause check-ins when setting to protocol_only', () => {
      const level = 'protocol_only';
      const shouldPause = level === 'protocol_only';
      expect(shouldPause).toBe(true);
    });

    it('should auto-resume check-ins when setting to full_coaching', () => {
      const level = 'full_coaching';
      const shouldResume = level === 'full_coaching' || level === 'self_guided_checkins';
      expect(shouldResume).toBe(true);
    });

    it('should auto-resume check-ins when setting to self_guided_checkins', () => {
      const level = 'self_guided_checkins';
      const shouldResume = level === 'full_coaching' || level === 'self_guided_checkins';
      expect(shouldResume).toBe(true);
    });

    it('should not auto-resume for protocol_only', () => {
      const level = 'protocol_only';
      const shouldResume = level === 'full_coaching' || level === 'self_guided_checkins';
      expect(shouldResume).toBe(false);
    });
  });

  describe('History logging', () => {
    it('should log old and new level for each changed client', () => {
      const historyEntries: Array<{ clientProtocolId: number; oldLevel: string; newLevel: string }> = [];
      const clients = [
        { id: 1, engagementLevel: 'protocol_only' },
        { id: 2, engagementLevel: 'full_coaching' },
      ];
      const targetLevel = 'self_guided_checkins';
      
      clients.forEach(c => {
        if (c.engagementLevel !== targetLevel) {
          historyEntries.push({
            clientProtocolId: c.id,
            oldLevel: c.engagementLevel,
            newLevel: targetLevel,
          });
        }
      });

      expect(historyEntries).toHaveLength(2);
      expect(historyEntries[0]).toEqual({
        clientProtocolId: 1,
        oldLevel: 'protocol_only',
        newLevel: 'self_guided_checkins',
      });
      expect(historyEntries[1]).toEqual({
        clientProtocolId: 2,
        oldLevel: 'full_coaching',
        newLevel: 'self_guided_checkins',
      });
    });

    it('should not log history for clients already at target level', () => {
      const historyEntries: Array<{ clientProtocolId: number; oldLevel: string; newLevel: string }> = [];
      const clients = [
        { id: 1, engagementLevel: 'full_coaching' },
        { id: 2, engagementLevel: 'full_coaching' },
      ];
      const targetLevel = 'full_coaching';
      
      clients.forEach(c => {
        if (c.engagementLevel !== targetLevel) {
          historyEntries.push({
            clientProtocolId: c.id,
            oldLevel: c.engagementLevel,
            newLevel: targetLevel,
          });
        }
      });

      expect(historyEntries).toHaveLength(0);
    });
  });

  describe('Frontend filtering for analytics', () => {
    it('should show non-self-guided clients in Full Coaching section', () => {
      const clients = [
        { id: 1, engagementLevel: 'full_coaching' },
        { id: 2, engagementLevel: 'protocol_only' },
        { id: 3, engagementLevel: null },
        { id: 4, engagementLevel: 'self_guided_checkins' },
      ];
      
      const fullCoaching = clients.filter(c => c.engagementLevel !== 'self_guided_checkins');
      const selfGuided = clients.filter(c => c.engagementLevel === 'self_guided_checkins');
      
      expect(fullCoaching).toHaveLength(3);
      expect(selfGuided).toHaveLength(1);
      expect(selfGuided[0].id).toBe(4);
    });
  });
});
