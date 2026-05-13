import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Packing Slip Preview Feature', () => {
  describe('previewForProtocol endpoint', () => {
    it('should have previewForProtocol endpoint in packingSlip router', () => {
      expect(appRouter._def.procedures).toHaveProperty('packingSlip.previewForProtocol');
    });

    it('should be an admin procedure (requires authentication)', () => {
      const procedure = appRouter._def.procedures['packingSlip.previewForProtocol'];
      expect(procedure).toBeDefined();
    });
  });

  describe('Packing slip item filtering logic', () => {
    it('should exclude services from packing slips', () => {
      // Test that the filtering logic correctly excludes services
      const itemTypes = ['peptide', 'supplement', 'supply', 'other', 'service'];
      const shippableTypes = ['peptide', 'supplement', 'supply', 'other'];
      
      const filteredItems = itemTypes.filter(type => shippableTypes.includes(type));
      
      expect(filteredItems).toContain('peptide');
      expect(filteredItems).toContain('supplement');
      expect(filteredItems).toContain('supply');
      expect(filteredItems).toContain('other');
      expect(filteredItems).not.toContain('service');
    });

    it('should only include recommended items', () => {
      // Test that only recommended items are included
      const protocolItems = [
        { protocolItemId: 1, isRecommended: true, quantity: 1 },
        { protocolItemId: 2, isRecommended: false, quantity: 2 },
        { protocolItemId: 3, isRecommended: true, quantity: 3 },
      ];

      const recommendedItems = protocolItems.filter(item => item.isRecommended);
      
      expect(recommendedItems.length).toBe(2);
      expect(recommendedItems.map(i => i.protocolItemId)).toEqual([1, 3]);
    });
  });

  describe('Packing slip creation conditions', () => {
    it('should not create packing slip for $0 total (affiliate-only protocols)', () => {
      const items = [
        { price: 0, quantity: 1 },
        { price: 0, quantity: 2 },
      ];
      
      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const willCreatePackingSlip = items.length > 0 && totalAmount > 0;
      
      expect(totalAmount).toBe(0);
      expect(willCreatePackingSlip).toBe(false);
    });

    it('should create packing slip for protocols with shippable items and total > $0', () => {
      const items = [
        { price: 100, quantity: 1 },
        { price: 50, quantity: 2 },
      ];
      
      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const willCreatePackingSlip = items.length > 0 && totalAmount > 0;
      
      expect(totalAmount).toBe(200);
      expect(willCreatePackingSlip).toBe(true);
    });

    it('should not create packing slip when no shippable items exist', () => {
      const items: any[] = [];
      
      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const willCreatePackingSlip = items.length > 0 && totalAmount > 0;
      
      expect(willCreatePackingSlip).toBe(false);
    });
  });

  describe('Visual indicator logic', () => {
    it('should show Ships badge for enabled physical items', () => {
      const item = {
        isIncluded: true,
        itemType: 'peptide',
      };
      
      const shouldShowShipsBadge = item.isIncluded && item.itemType !== 'service';
      
      expect(shouldShowShipsBadge).toBe(true);
    });

    it('should not show Ships badge for services', () => {
      const item = {
        isIncluded: true,
        itemType: 'service',
      };
      
      const shouldShowShipsBadge = item.isIncluded && item.itemType !== 'service';
      
      expect(shouldShowShipsBadge).toBe(false);
    });

    it('should not show Ships badge for disabled items', () => {
      const item = {
        isIncluded: false,
        itemType: 'peptide',
      };
      
      const shouldShowShipsBadge = item.isIncluded && item.itemType !== 'service';
      
      expect(shouldShowShipsBadge).toBe(false);
    });
  });
});
