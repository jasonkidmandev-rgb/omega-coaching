import { type PricingTier } from "@/lib/tieredPricing";
import { Tag, TrendingDown, Check } from "lucide-react";

interface PricingTierChartProps {
  tiers: PricingTier[];
  currentQuantity: number;
  itemName: string;
}

export function PricingTierChart({ tiers, currentQuantity, itemName }: PricingTierChartProps) {
  if (!tiers || tiers.length === 0) return null;

  // Sort tiers by minQty
  const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
  
  // Find the current tier based on quantity
  const getCurrentTierIndex = () => {
    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      if (currentQuantity >= sortedTiers[i].minQty) {
        return i;
      }
    }
    return 0;
  };
  
  const currentTierIndex = getCurrentTierIndex();
  const maxPrice = Math.max(...sortedTiers.map(t => t.pricePerUnit));
  const minPrice = Math.min(...sortedTiers.map(t => t.pricePerUnit));
  const savingsPercent = maxPrice > 0 ? Math.round((1 - minPrice / maxPrice) * 100) : 0;

  return (
    <div className="mt-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="h-4 w-4 text-green-600" />
        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
          Volume Discount Available
        </span>
        {savingsPercent > 0 && (
          <span className="ml-auto text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
            Save up to {savingsPercent}%
          </span>
        )}
      </div>
      
      {/* Visual tier chart */}
      <div className="space-y-2">
        {sortedTiers.map((tier, index) => {
          const isCurrentTier = index === currentTierIndex;
          const barWidth = maxPrice > 0 ? (tier.pricePerUnit / maxPrice) * 100 : 100;
          const qtyLabel = tier.maxQty 
            ? tier.minQty === tier.maxQty 
              ? `${tier.minQty}` 
              : `${tier.minQty}-${tier.maxQty}`
            : `${tier.minQty}+`;
          
          return (
            <div key={index} className="relative">
              <div className={`flex items-center gap-3 p-2 rounded-md transition-all ${
                isCurrentTier 
                  ? 'bg-green-100 dark:bg-green-900/50 ring-2 ring-green-500' 
                  : 'bg-white/50 dark:bg-gray-800/50'
              }`}>
                {/* Quantity badge */}
                <div className={`w-16 text-center py-1 px-2 rounded text-xs font-bold ${
                  isCurrentTier 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  Qty {qtyLabel}
                </div>
                
                {/* Price bar */}
                <div className="flex-1 relative h-6">
                  <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isCurrentTier 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${
                      isCurrentTier ? 'text-white drop-shadow-sm' : 'text-gray-700 dark:text-gray-200'
                    }`}>
                      ${tier.pricePerUnit.toFixed(2)} each
                    </span>
                  </div>
                </div>
                
                {/* Current indicator */}
                {isCurrentTier && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-xs font-medium">Current</span>
                  </div>
                )}
                
                {/* Savings indicator for lower tiers */}
                {index > 0 && !isCurrentTier && index > currentTierIndex && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs">
                      Save ${(sortedTiers[currentTierIndex].pricePerUnit - tier.pricePerUnit).toFixed(2)}/ea
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Upgrade hint */}
      {currentTierIndex < sortedTiers.length - 1 && (
        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>💡 Tip:</strong> Order {sortedTiers[currentTierIndex + 1].minQty}+ units to unlock ${sortedTiers[currentTierIndex + 1].pricePerUnit.toFixed(2)}/each pricing!
          </p>
        </div>
      )}
    </div>
  );
}
