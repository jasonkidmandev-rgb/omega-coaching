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
 * NOTE: this is the simple total (flat discount over everything). The client-facing
 * page additionally applies tiered pricing and per-item/category discountable flags,
 * so these figures can still differ from the charged amount in those cases — a
 * known, pre-existing gap kept out of scope here.
 */
import * as db from "../db";

/** True for items the client buys themselves — never billed by us. */
export function isClientSourced(item: any): boolean {
  return item?.fulfillmentSource === "client";
}

export async function calculateProtocolTotal(protocol: any): Promise<number> {
  try {
    const protocolItems = await db.getClientProtocolItems(protocol.id);
    const allItems = await db.getAllProtocolItems();

    let total = 0;
    for (const item of protocolItems) {
      if (!item.isIncluded) continue;
      if (isClientSourced(item)) continue; // client sources these — not ours to bill
      const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
      const price = parseFloat(item.customPrice || protocolItem?.price || "0");
      total += price * item.quantity;
    }

    if (protocol.coachingPrice) {
      total += parseFloat(protocol.coachingPrice);
    }

    if (protocol.discountPercent) {
      const discount = parseFloat(protocol.discountPercent);
      total = total * (1 - discount / 100);
    }

    return total;
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
