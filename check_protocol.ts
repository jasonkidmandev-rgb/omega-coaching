import { getDb } from './server/db';
import { clientProtocols, clientProtocolItems, packingSlips, protocolItems } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  
  const protocol = await db.select({
    id: clientProtocols.id,
    clientName: clientProtocols.clientName,
    paymentStatus: clientProtocols.paymentStatus,
    paymentMethod: clientProtocols.paymentMethod,
  }).from(clientProtocols).where(eq(clientProtocols.id, 1020001));
  console.log("Protocol:", JSON.stringify(protocol));

  const items = await db.select({
    id: clientProtocolItems.id,
    isRecommended: clientProtocolItems.isRecommended,
    quantity: clientProtocolItems.quantity,
    customPrice: clientProtocolItems.customPrice,
    protocolItemId: clientProtocolItems.protocolItemId,
  }).from(clientProtocolItems).where(
    and(
      eq(clientProtocolItems.clientProtocolId, 1020001),
      eq(clientProtocolItems.isRecommended, true)
    )
  );
  console.log("Recommended items:", items.length);
  
  if (items.length > 0) {
    for (const item of items.slice(0, 5)) {
      const pi = await db.select({ name: protocolItems.name, itemType: protocolItems.itemType, price: protocolItems.price })
        .from(protocolItems).where(eq(protocolItems.id, item.protocolItemId));
      console.log(`  Item ${item.protocolItemId}: ${pi[0]?.name} (${pi[0]?.itemType}) price=${item.customPrice || pi[0]?.price} qty=${item.quantity}`);
    }
  }

  const slips = await db.select().from(packingSlips).where(eq(packingSlips.clientProtocolId, 1020001));
  console.log("Packing slips:", slips.length);
  
  process.exit(0);
}
main();
