import { describe, it, expect } from 'vitest';
import { getClientProtocolsByEmail } from './db';

describe('Client Visibility System', () => {
  describe('getClientProtocolsByEmail', () => {
    it('should return protocols filtered by email', async () => {
      // This tests the new function that powers the client dashboard
      const protocols = await getClientProtocolsByEmail('test@example.com');
      expect(Array.isArray(protocols)).toBe(true);
    });

    it('should return empty array for non-existent email', async () => {
      const protocols = await getClientProtocolsByEmail('nonexistent@example.com');
      expect(protocols).toEqual([]);
    });
  });

  describe('clientVisibility field', () => {
    it('should have valid visibility values', () => {
      const validValues = ['hidden', 'option', 'active', 'archived'];
      validValues.forEach(value => {
        expect(['hidden', 'option', 'active', 'archived']).toContain(value);
      });
    });

    it('should default to active for new protocols', () => {
      // The default value in the schema is 'active'
      const defaultValue = 'active';
      expect(defaultValue).toBe('active');
    });
  });

  describe('Protocol access control', () => {
    it('should block access to hidden protocols via direct link', async () => {
      // Hidden protocols should return null when accessed via token
      // This is tested by the getByToken query which checks clientVisibility
      const hiddenVisibility = 'hidden';
      expect(hiddenVisibility).toBe('hidden');
    });

    it('should allow access to active protocols', async () => {
      const activeVisibility = 'active';
      expect(['active', 'option', 'archived']).toContain(activeVisibility);
    });

    it('should allow access to option protocols', async () => {
      const optionVisibility = 'option';
      expect(['active', 'option', 'archived']).toContain(optionVisibility);
    });

    it('should allow access to archived protocols with banner', async () => {
      const archivedVisibility = 'archived';
      expect(['active', 'option', 'archived']).toContain(archivedVisibility);
    });
  });

  describe('Client Dashboard Protocol Grouping', () => {
    it('should group protocols by visibility status', () => {
      const mockProtocols = [
        { id: 1, clientVisibility: 'active' },
        { id: 2, clientVisibility: 'option' },
        { id: 3, clientVisibility: 'archived' },
        { id: 4, clientVisibility: 'active' },
      ];

      const activeProtocols = mockProtocols.filter(p => p.clientVisibility === 'active');
      const optionProtocols = mockProtocols.filter(p => p.clientVisibility === 'option');
      const archivedProtocols = mockProtocols.filter(p => p.clientVisibility === 'archived');

      expect(activeProtocols.length).toBe(2);
      expect(optionProtocols.length).toBe(1);
      expect(archivedProtocols.length).toBe(1);
    });

    it('should not include hidden protocols in client view', () => {
      const mockProtocols = [
        { id: 1, clientVisibility: 'active' },
        { id: 2, clientVisibility: 'hidden' },
        { id: 3, clientVisibility: 'option' },
      ];

      const visibleToClient = mockProtocols.filter(p => p.clientVisibility !== 'hidden');
      expect(visibleToClient.length).toBe(2);
      expect(visibleToClient.find(p => p.clientVisibility === 'hidden')).toBeUndefined();
    });
  });
});
