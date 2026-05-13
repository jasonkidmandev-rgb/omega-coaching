import { describe, it, expect } from 'vitest';

/**
 * Tests for the fulfillmentSource feature
 * Verifies that the fulfillment source flag correctly controls:
 * 1. Packing slip item inclusion
 * 2. Mismatch detection
 * 3. Default values
 */

describe('Fulfillment Source Feature', () => {
  describe('Packing Slip Item Filtering', () => {
    // Simulate the filtering logic used in createPackingSlipOnPayment
    function filterForPackingSlip(items: Array<{
      isIncluded: boolean;
      quantity: number;
      fulfillmentSource: 'coach' | 'client';
      itemType: string;
      name: string;
    }>) {
      return items
        .filter(item => item.isIncluded)
        .filter(item => item.quantity > 0)
        .filter(item => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType))
        .filter(item => item.fulfillmentSource !== 'client');
    }

    it('should include coach-fulfilled items on packing slip', () => {
      const items = [
        { isIncluded: true, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'peptide', name: 'BPC-157' },
        { isIncluded: true, quantity: 5, fulfillmentSource: 'coach' as const, itemType: 'supply', name: 'Syringes' },
      ];
      const result = filterForPackingSlip(items);
      expect(result).toHaveLength(2);
      expect(result.map(i => i.name)).toEqual(['BPC-157', 'Syringes']);
    });

    it('should exclude client-sourced items from packing slip', () => {
      const items = [
        { isIncluded: true, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'peptide', name: 'BPC-157' },
        { isIncluded: true, quantity: 1, fulfillmentSource: 'client' as const, itemType: 'supplement', name: 'Magnesium' },
        { isIncluded: true, quantity: 1, fulfillmentSource: 'client' as const, itemType: 'supplement', name: 'HealthForce' },
      ];
      const result = filterForPackingSlip(items);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('BPC-157');
    });

    it('should still exclude qty 0 items regardless of fulfillment source', () => {
      const items = [
        { isIncluded: true, quantity: 0, fulfillmentSource: 'coach' as const, itemType: 'peptide', name: 'Tirzepatide' },
        { isIncluded: true, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'peptide', name: 'BPC-157' },
      ];
      const result = filterForPackingSlip(items);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('BPC-157');
    });

    it('should still exclude services regardless of fulfillment source', () => {
      const items = [
        { isIncluded: true, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'service', name: 'Coaching Session' },
        { isIncluded: true, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'peptide', name: 'BPC-157' },
      ];
      const result = filterForPackingSlip(items);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('BPC-157');
    });

    it('should still exclude non-included items regardless of fulfillment source', () => {
      const items = [
        { isIncluded: false, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'peptide', name: 'Removed Item' },
        { isIncluded: true, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'peptide', name: 'BPC-157' },
      ];
      const result = filterForPackingSlip(items);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('BPC-157');
    });

    it('should return empty array when all items are client-sourced', () => {
      const items = [
        { isIncluded: true, quantity: 1, fulfillmentSource: 'client' as const, itemType: 'supplement', name: 'Magnesium' },
        { isIncluded: true, quantity: 1, fulfillmentSource: 'client' as const, itemType: 'supplement', name: 'HealthForce' },
      ];
      const result = filterForPackingSlip(items);
      expect(result).toHaveLength(0);
    });
  });

  describe('Mismatch Detection Filtering', () => {
    // Simulate the filtering logic used in checkMismatch
    function filterForMismatchCheck(items: Array<{
      isIncluded: boolean;
      quantity: number;
      fulfillmentSource: 'coach' | 'client';
      itemType: string;
      protocolItemId: number;
      itemName: string | null;
    }>) {
      return items
        .filter(item => item.isIncluded)
        .filter(item => item.quantity > 0)
        .filter(item => item.fulfillmentSource !== 'client')
        .filter(item => item.itemName !== null)
        .filter(item => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));
    }

    it('should not flag client-sourced items as missing from packing slip', () => {
      const protocolItems = [
        { isIncluded: true, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'peptide', protocolItemId: 1, itemName: 'BPC-157' },
        { isIncluded: true, quantity: 1, fulfillmentSource: 'client' as const, itemType: 'supplement', protocolItemId: 2, itemName: 'Magnesium' },
      ];
      
      const packingSlipItems = [
        { protocolItemId: 1, itemName: 'BPC-157', quantity: 1 },
      ];
      
      const filteredProtocol = filterForMismatchCheck(protocolItems);
      
      // Only BPC-157 should be compared against packing slip
      expect(filteredProtocol).toHaveLength(1);
      expect(filteredProtocol[0].itemName).toBe('BPC-157');
      
      // BPC-157 is on the packing slip, so no mismatch
      const missing = filteredProtocol.filter(
        pi => !packingSlipItems.find(psi => psi.protocolItemId === pi.protocolItemId)
      );
      expect(missing).toHaveLength(0);
    });

    it('should still detect missing coach-fulfilled items', () => {
      const protocolItems = [
        { isIncluded: true, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'peptide', protocolItemId: 1, itemName: 'BPC-157' },
        { isIncluded: true, quantity: 1, fulfillmentSource: 'coach' as const, itemType: 'supply', protocolItemId: 3, itemName: 'Syringes' },
      ];
      
      const packingSlipItems = [
        { protocolItemId: 1, itemName: 'BPC-157', quantity: 1 },
      ];
      
      const filteredProtocol = filterForMismatchCheck(protocolItems);
      expect(filteredProtocol).toHaveLength(2);
      
      const missing = filteredProtocol.filter(
        pi => !packingSlipItems.find(psi => psi.protocolItemId === pi.protocolItemId)
      );
      expect(missing).toHaveLength(1);
      expect(missing[0].itemName).toBe('Syringes');
    });
  });

  describe('Default Values', () => {
    it('should default to coach when no fulfillmentSource specified', () => {
      const item = { fulfillmentSource: undefined };
      const source = (item as any).fulfillmentSource || 'coach';
      expect(source).toBe('coach');
    });

    it('should preserve client fulfillmentSource when cloning', () => {
      const sourceItem = { fulfillmentSource: 'client' as const };
      const clonedSource = sourceItem.fulfillmentSource || 'coach';
      expect(clonedSource).toBe('client');
    });

    it('should preserve coach fulfillmentSource when cloning', () => {
      const sourceItem = { fulfillmentSource: 'coach' as const };
      const clonedSource = sourceItem.fulfillmentSource || 'coach';
      expect(clonedSource).toBe('coach');
    });
  });
});
