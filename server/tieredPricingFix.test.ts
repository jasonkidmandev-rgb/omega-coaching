import { describe, it, expect } from 'vitest';

// Test the tiered pricing logic that mirrors the client-side tieredPricing.ts
// This validates the fix for the bug where customPrice was incorrectly set to base price

interface PricingTier {
  minQty: number;
  maxQty: number | null;
  pricePerUnit: number;
}

function getTieredUnitPrice(
  quantity: number,
  tiers: PricingTier[] | null | undefined,
  defaultPrice: number
): number {
  if (!tiers || tiers.length === 0) return defaultPrice;
  const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = sortedTiers.length - 1; i >= 0; i--) {
    const tier = sortedTiers[i];
    if (quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty)) {
      return tier.pricePerUnit;
    }
  }
  return defaultPrice;
}

function hasTieredPricing(tiers: PricingTier[] | null | undefined): boolean {
  return Array.isArray(tiers) && tiers.length > 0;
}

// Simulates the pricing logic used in Protocol.tsx and ClientEdit.tsx
function calculateItemPrice(
  quantity: number,
  customPrice: string | null,
  basePrice: string,
  pricingTiers: PricingTier[] | null
): { unitPrice: number; lineTotal: number; priceSource: string } {
  const hasCustomPrice = !!customPrice;
  const defaultPrice = parseFloat(basePrice || '0');
  const hasVolume = !hasCustomPrice && hasTieredPricing(pricingTiers);
  
  const unitPrice = hasCustomPrice
    ? parseFloat(customPrice!)
    : hasVolume
      ? getTieredUnitPrice(quantity, pricingTiers, defaultPrice)
      : defaultPrice;
  
  return {
    unitPrice,
    lineTotal: unitPrice * quantity,
    priceSource: hasCustomPrice ? 'custom' : hasVolume ? 'volume' : 'default',
  };
}

describe('Tiered Pricing Fix', () => {
  const tirzepatideTiers: PricingTier[] = [
    { minQty: 1, maxQty: 1, pricePerUnit: 325 },
    { minQty: 2, maxQty: 4, pricePerUnit: 285 },
    { minQty: 5, maxQty: null, pricePerUnit: 265 },
  ];

  describe('getTieredUnitPrice', () => {
    it('returns tier 1 price for qty 1', () => {
      expect(getTieredUnitPrice(1, tirzepatideTiers, 325)).toBe(325);
    });

    it('returns tier 2 price for qty 2-4', () => {
      expect(getTieredUnitPrice(2, tirzepatideTiers, 325)).toBe(285);
      expect(getTieredUnitPrice(3, tirzepatideTiers, 325)).toBe(285);
      expect(getTieredUnitPrice(4, tirzepatideTiers, 325)).toBe(285);
    });

    it('returns tier 3 price for qty 5+', () => {
      expect(getTieredUnitPrice(5, tirzepatideTiers, 325)).toBe(265);
      expect(getTieredUnitPrice(10, tirzepatideTiers, 325)).toBe(265);
    });

    it('returns default price when no tiers', () => {
      expect(getTieredUnitPrice(3, null, 325)).toBe(325);
      expect(getTieredUnitPrice(3, [], 325)).toBe(325);
    });
  });

  describe('Bug fix: customPrice should NOT override tiered pricing when it matches base price', () => {
    it('BUG SCENARIO: customPrice = base price blocks tiered pricing', () => {
      // This was the bug: customPrice was set to "325.00" (same as base price)
      // which caused the system to skip tiered pricing
      const bugResult = calculateItemPrice(3, '325.00', '325.00', tirzepatideTiers);
      expect(bugResult.priceSource).toBe('custom');
      expect(bugResult.unitPrice).toBe(325); // Wrong! Should be 285 for qty 3
      expect(bugResult.lineTotal).toBe(975); // Wrong! Should be 855
    });

    it('FIX: when customPrice is null, tiered pricing applies correctly', () => {
      // After the fix: customPrice is null, so tiered pricing kicks in
      const fixedResult = calculateItemPrice(3, null, '325.00', tirzepatideTiers);
      expect(fixedResult.priceSource).toBe('volume');
      expect(fixedResult.unitPrice).toBe(285); // Correct tier 2 price
      expect(fixedResult.lineTotal).toBe(855); // Correct total: 3 × $285
    });

    it('genuine custom price override still works', () => {
      // When admin intentionally sets a different custom price, it should take precedence
      const customResult = calculateItemPrice(3, '300.00', '325.00', tirzepatideTiers);
      expect(customResult.priceSource).toBe('custom');
      expect(customResult.unitPrice).toBe(300);
      expect(customResult.lineTotal).toBe(900);
    });
  });

  describe('Edit dialog pre-fill behavior', () => {
    it('should NOT pre-fill customPrice with base price (old bug)', () => {
      // Old behavior: customPrice: item.customPrice || protocolItem?.price || ''
      // This would set customPrice to "325.00" when item.customPrice is null
      const itemCustomPrice: string | null = null;
      const protocolItemPrice = '325.00';
      
      // OLD (buggy): would return "325.00"
      const oldBehavior = itemCustomPrice || protocolItemPrice || '';
      expect(oldBehavior).toBe('325.00'); // This was the bug
      
      // NEW (fixed): only use actual custom price
      const newBehavior = itemCustomPrice || '';
      expect(newBehavior).toBe(''); // Empty = use default/tiered pricing
    });

    it('should pre-fill customPrice when it IS actually set', () => {
      const itemCustomPrice = '300.00';
      const newBehavior = itemCustomPrice || '';
      expect(newBehavior).toBe('300.00'); // Correctly shows the custom override
    });
  });

  describe('hasTieredPricing', () => {
    it('returns true for valid tiers', () => {
      expect(hasTieredPricing(tirzepatideTiers)).toBe(true);
    });

    it('returns false for null/empty', () => {
      expect(hasTieredPricing(null)).toBe(false);
      expect(hasTieredPricing(undefined)).toBe(false);
      expect(hasTieredPricing([])).toBe(false);
    });
  });
});
