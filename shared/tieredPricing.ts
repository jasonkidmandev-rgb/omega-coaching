/**
 * Tiered/Volume Pricing Utility
 * 
 * Calculates the unit price based on quantity and pricing tiers.
 * Example tiers: [
 *   { minQty: 1, maxQty: 1, pricePerUnit: 325 },
 *   { minQty: 2, maxQty: 4, pricePerUnit: 285 },
 *   { minQty: 5, maxQty: null, pricePerUnit: 265 }
 * ]
 */

export type PricingTier = {
  minQty: number;
  maxQty: number | null;
  pricePerUnit: number;
};

/**
 * Get the applicable unit price based on quantity and pricing tiers
 * @param quantity - The quantity being purchased
 * @param tiers - Array of pricing tiers (sorted by minQty)
 * @param defaultPrice - Fallback price if no tier matches
 * @returns The applicable price per unit
 */
export function getTieredUnitPrice(
  quantity: number,
  tiers: PricingTier[] | null | undefined,
  defaultPrice: number
): number {
  if (!tiers || tiers.length === 0) {
    return defaultPrice;
  }

  // Sort tiers by minQty to ensure proper matching
  const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);

  for (const tier of sortedTiers) {
    const matchesMin = quantity >= tier.minQty;
    const matchesMax = tier.maxQty === null || quantity <= tier.maxQty;
    
    if (matchesMin && matchesMax) {
      return tier.pricePerUnit;
    }
  }

  // If no tier matches, return the last tier's price (for quantities above all tiers)
  // or the default price
  const lastTier = sortedTiers[sortedTiers.length - 1];
  if (lastTier && quantity >= lastTier.minQty && lastTier.maxQty === null) {
    return lastTier.pricePerUnit;
  }

  return defaultPrice;
}

/**
 * Calculate the total price for a quantity using tiered pricing
 * @param quantity - The quantity being purchased
 * @param tiers - Array of pricing tiers
 * @param defaultPrice - Fallback price if no tier matches
 * @returns The total price (unitPrice * quantity)
 */
export function calculateTieredTotal(
  quantity: number,
  tiers: PricingTier[] | null | undefined,
  defaultPrice: number
): number {
  const unitPrice = getTieredUnitPrice(quantity, tiers, defaultPrice);
  return unitPrice * quantity;
}

/**
 * Format tiered pricing for display
 * Example output: "$325 (1) | $285 (2-4) | $265 (5+)"
 * @param tiers - Array of pricing tiers
 * @returns Formatted string for display
 */
export function formatTieredPricing(tiers: PricingTier[] | null | undefined): string {
  if (!tiers || tiers.length === 0) {
    return "";
  }

  const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
  
  return sortedTiers
    .map((tier) => {
      const priceStr = `$${tier.pricePerUnit.toFixed(0)}`;
      if (tier.minQty === tier.maxQty) {
        return `${priceStr} (${tier.minQty})`;
      } else if (tier.maxQty === null) {
        return `${priceStr} (${tier.minQty}+)`;
      } else {
        return `${priceStr} (${tier.minQty}-${tier.maxQty})`;
      }
    })
    .join(" | ");
}

/**
 * Check if an item has tiered pricing configured
 * @param tiers - Array of pricing tiers
 * @returns true if tiered pricing is configured
 */
export function hasTieredPricing(tiers: PricingTier[] | null | undefined): boolean {
  return Array.isArray(tiers) && tiers.length > 0;
}
