/**
 * The single source of truth for "what does this client owe for their protocol".
 *
 * This existed as three byte-identical copies (payment portal, payment-reminder
 * cron, payment history) and every one of them summed *all* included items —
 * including items the client sources themselves. That inflated the amount shown
 * in the client's payment portal and in reminder emails. Because we also accept
 * manual/Venmo payments against that stated figure, an inflated number can turn
 * into a real overpayment.
 *
 * Client-sourced items (`fulfillmentSource === 'client'`) are bought by the client
 * through our affiliate links — we never sell them — so they must never reach a
 * total. This mirrors the client-facing protocol page, which is what actually
 * drives the Stripe charge:
 *   "Items marked as 'client buys' are NOT included in the charged total"
 *
 * It mirrors the client page's math exactly, so the figure we show always equals
 * the figure we charge:
 *   - tiered/volume unit pricing (a custom price always wins)
 *   - discount applies to the items subtotal, but NEVER to the coaching fee
 *   - total = subtotal - discount + coaching
 * The previous version discounted the coaching fee too, which under-stated 9 of
 * 31 active protocols by up to $756.
 *
 * ⚠️ KNOWN (deliberately mirrored) BUG — needs Jason's pricing call, do not "fix"
 * here in isolation: the `isDiscountable` flag on items/categories is INERT. It's
 * a tinyint (0/1), but the client tests `isDiscountable !== false` — and `0 !== false`
 * is always true in JS — so every item is treated as discountable even though 123 of
 * 185 items and 10 of 18 categories are explicitly marked non-discountable. Honouring
 * the flag would raise 9 active clients' totals by ~$3,207 in aggregate, so it's a
 * business decision. We mirror the live behaviour here on purpose: this figure must
 * match what the client is actually charged, not what we wish it were.
 */
import * as db from "../db";
import { getTieredUnitPrice, hasTieredPricing, type PricingTier } from "@shared/tieredPricing";

/** True for items the client buys themselves — never billed by us. */
export function isClientSourced(item: any): boolean {
  return item?.fulfillmentSource === "client";
}

export async function calculateProtocolTotal(protocol: any): Promise<number> {
  try {
    const protocolItems = await db.getClientProtocolItems(protocol.id);
    const allItems = await db.getAllProtocolItems();

    let subtotal = 0;

    for (const item of protocolItems) {
      if (!item.isIncluded) continue;
      if (isClientSourced(item)) continue; // client sources these — not ours to bill

      const protocolItem: any = allItems.find((i: any) => i.id === item.protocolItemId);
      if (!protocolItem) continue;

      const defaultPrice = parseFloat(protocolItem.price || "0");
      const tiers = protocolItem.pricingTiers as PricingTier[] | null;
      // Guard exactly like the client page does — a custom price always wins, and
      // tiered pricing only applies when real tiers are configured.
      const unitPrice = item.customPrice
        ? parseFloat(item.customPrice)
        : hasTieredPricing(tiers)
          ? getTieredUnitPrice(item.quantity, tiers, defaultPrice)
          : defaultPrice;
      subtotal += unitPrice * item.quantity;
    }

    // Discount hits the items subtotal only — the coaching fee is never discounted.
    // (Every item counts as discountable today; see the isDiscountable note above.)
    const discountPercent = parseFloat(protocol.discountPercent || "0");
    const discount = (subtotal * discountPercent) / 100;
    const coaching = parseFloat(protocol.coachingPrice || "0");

    return subtotal - discount + coaching;
  } catch (error) {
    console.error(`Error calculating total for protocol ${protocol?.id}:`, error);
    return 0;
  }
}

export async function calculateProtocolTotalById(protocolId: number): Promise<number> {
  const protocol = await db.getClientProtocolById(protocolId);
  if (!protocol) return 0;
  return calculateProtocolTotal(protocol);
}
