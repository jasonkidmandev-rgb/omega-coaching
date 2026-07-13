import { db } from './server/db.ts';
import { clientProtocols, packingSlips } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const protocol = await db.select({
  id: clientProtocols.id,
  clientName: clientProtocols.clientName,
  paymentStatus: clientProtocols.paymentStatus,
  paymentMethod: clientProtocols.paymentMethod,
}).from(clientProtocols).where(eq(clientProtocols.id, 1020001));
console.log("Protocol:", JSON.stringify(protocol, null, 2));

const slips = await db.select().from(packingSlips).where(eq(packingSlips.clientProtocolId, 1020001));
console.log("Packing slips for 1020001:", JSON.stringify(slips, null, 2));

process.exit(0);
