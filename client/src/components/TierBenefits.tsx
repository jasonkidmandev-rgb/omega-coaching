import { CheckCircle2 } from "lucide-react";

export type ProgramTier = "elite" | "flagship" | "essentials" | "advanced" | "recovery" | "immunity" | "longevity" | "mitochondria" | "functional_health_elite";

interface TierBenefitsProps {
  tier: ProgramTier;
  variant?: "compact" | "full";
}

// Centralized tier configuration - single source of truth for pricing and benefits
export const TIER_CONFIG: Record<ProgramTier, {
  name: string;
  price: number;
  benefits: string[];
  color: string;
  calendlySlug: string;
}> = {
  essentials: {
    name: "Protocol Essentials",
    price: 1000,
    benefits: [
      "Self-paced masterclass access",
      "Protocol template library",
      "Preparation video guides",
      "1 month Omega Elite Community access",
      "Peptide Coach Self-Guided Check-ins",
      "1-on-1 coaching calls available ($125/20 min, $350/hr)",
    ],
    color: "text-slate-500",
    calendlySlug: "30-minute-coaching",
  },
  flagship: {
    name: "Weight Loss & Physique",
    price: 3000,
    benefits: [
      "60-Minute Strategy Session",
      "Custom protocol design",
      "1-Hour Kickoff Training Meeting",
      "Weekly check-ins for 90 days",
      "Week 3 & Month 2 review sessions",
      "3 months Omega Elite Community access",
      "Direct coaching chat support",
    ],
    color: "text-amber-500",
    calendlySlug: "60-minute-strategy",
  },
  recovery: {
    name: "Recovery, Healing & Inflammation",
    price: 3000,
    benefits: [
      "60-Minute Strategy Session",
      "Custom recovery & inflammation protocol",
      "1-Hour Kickoff Training Meeting",
      "Weekly check-ins for 90 days",
      "Week 3 & Month 2 review sessions",
      "3 months Omega Elite Community access",
      "Direct coaching chat support",
    ],
    color: "text-rose-500",
    calendlySlug: "60-minute-strategy",
  },
  immunity: {
    name: "Immunity & Healing",
    price: 3000,
    benefits: [
      "60-Minute Strategy Session",
      "Custom immunity optimization protocol",
      "1-Hour Kickoff Training Meeting",
      "Weekly check-ins for 90 days",
      "Week 3 & Month 2 review sessions",
      "3 months Omega Elite Community access",
      "Direct coaching chat support",
    ],
    color: "text-emerald-500",
    calendlySlug: "60-minute-strategy",
  },
  longevity: {
    name: "Longevity & Bioregulators",
    price: 3000,
    benefits: [
      "60-Minute Strategy Session",
      "Custom longevity & bioregulator protocol",
      "1-Hour Kickoff Training Meeting",
      "Weekly check-ins for 90 days",
      "Week 3 & Month 2 review sessions",
      "3 months Omega Elite Community access",
      "Direct coaching chat support",
    ],
    color: "text-cyan-500",
    calendlySlug: "60-minute-strategy",
  },
  mitochondria: {
    name: "Mitochondria Restoration",
    price: 3000,
    benefits: [
      "60-Minute Strategy Session",
      "Custom mitochondria optimization protocol",
      "1-Hour Kickoff Training Meeting",
      "Weekly check-ins for 90 days",
      "Week 3 & Month 2 review sessions",
      "3 months Omega Elite Community access",
      "Direct coaching chat support",
    ],
    color: "text-orange-500",
    calendlySlug: "60-minute-strategy",
  },
  advanced: {
    name: "Advanced Weight Loss & Physique",
    price: 4500,
    benefits: [
      "60-Minute Strategy Session",
      "Advanced custom protocol design",
      "1-Hour Kickoff Training Meeting",
      "Weekly 1-on-1 coaching calls for 90 days",
      "Bi-weekly review & optimization sessions",
      "4 months Omega Elite Community access",
      "Priority coaching chat support",
      "Advanced supplement stack guidance",
    ],
    color: "text-blue-500",
    calendlySlug: "60-minute-strategy",
  },
  functional_health_elite: {
    name: "Functional Health Elite",
    price: 8500,
    benefits: [
      "Comprehensive 60-min health assessment",
      "Premium multi-system protocol design",
      "1-Hour Kickoff Training Meeting",
      "Weekly 1-on-1 coaching calls",
      "Full lab work analysis & optimization",
      "5 months Omega Elite Community access",
      "Priority direct access to coach",
      "Quarterly protocol optimization",
      "Functional health monitoring",
    ],
    color: "text-indigo-500",
    calendlySlug: "60-minute-strategy",
  },
  elite: {
    name: "Elite Longevity",
    price: 15000,
    benefits: [
      "2-hour Elite Longevity consultation",
      "Comprehensive health assessment",
      "Premium custom protocol design",
      "1-Hour Kickoff Training Meeting",
      "Weekly 1-on-1 coaching calls",
      "Priority direct access to coach",
      "6 months Omega Elite Community access",
      "Quarterly protocol optimization",
      "VIP support & priority scheduling",
    ],
    color: "text-purple-500",
    calendlySlug: "2-hour-elite-longevity",
  },
};

/**
 * Shared Tier Benefits Component
 * This is a "living copy" - changes here will reflect everywhere this component is used
 * Used in: TransformationEntry page, TransformationJourney payment dialog
 */
export function TierBenefits({ tier, variant = "full" }: TierBenefitsProps) {
  const config = TIER_CONFIG[tier];
  if (!config) return null;

  const tierBenefits = config.benefits;
  const iconColor = config.color;

  if (variant === "compact") {
    return (
      <ul className="text-sm text-gray-600 space-y-1">
        {tierBenefits.slice(0, 5).map((benefit, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle2 className={`h-4 w-4 ${iconColor} flex-shrink-0 mt-0.5`} />
            <span>{benefit}</span>
          </li>
        ))}
        {tierBenefits.length > 5 && (
          <li className="text-gray-400 text-xs pl-6">
            + {tierBenefits.length - 5} more benefits
          </li>
        )}
      </ul>
    );
  }

  return (
    <ul className="text-sm text-gray-600 space-y-1">
      {tierBenefits.map((benefit, index) => (
        <li key={index} className="flex items-start gap-2">
          <CheckCircle2 className={`h-4 w-4 ${iconColor} flex-shrink-0 mt-0.5`} />
          <span>{benefit}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: ProgramTier): string {
  return TIER_CONFIG[tier]?.name + " Program" || tier;
}

/**
 * Get tier price
 */
export function getTierPrice(tier: ProgramTier): number {
  return TIER_CONFIG[tier]?.price || 3000;
}

/**
 * Get tier description
 */
export function getTierDescription(tier: ProgramTier): string {
  const price = getTierPrice(tier);
  if (price >= 8500) return "Premium longevity investment";
  if (price >= 4500) return "Advanced coaching investment";
  if (price >= 3000) return "One-time coaching investment";
  return "Self-guided program fee";
}
