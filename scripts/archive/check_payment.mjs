import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { ilike } from 'drizzle-orm';
import * as schema from './drizzle/schema.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
  const results = await db.query.clientProtocols.findMany({
    where: ilike(schema.clientProtocols.clientName, '%Schmidlkofer%'),
    columns: {
      id: true,
      clientName: true,
      clientEmail: true,
      paymentStatus: true,
      paymentMethod: true,
      paymentReceivedAt: true,
      paidAt: true,
      status: true,
      paypalOrderId: true,
    }
  });
  
  console.log("Client protocols for Schmidlkofer:");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
