// Script to check for orphaned client_protocol_items
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkOrphans() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Find all orphaned client_protocol_items
  const orphans = await db.execute(sql`
    SELECT cpi.id, cpi.clientProtocolId, cpi.protocolItemId, cp.clientName, cpi.createdAt
    FROM client_protocol_items cpi 
    LEFT JOIN protocol_items pi ON cpi.protocolItemId = pi.id 
    LEFT JOIN client_protocols cp ON cpi.clientProtocolId = cp.id
    WHERE pi.id IS NULL 
    ORDER BY cpi.createdAt DESC
  `);

  console.log('Orphaned client_protocol_items:', orphans);

  // Find distinct deleted protocolItemIds
  const deletedIds = await db.execute(sql`
    SELECT DISTINCT cpi.protocolItemId
    FROM client_protocol_items cpi 
    LEFT JOIN protocol_items pi ON cpi.protocolItemId = pi.id 
    WHERE pi.id IS NULL
  `);

  console.log('Deleted protocolItemIds:', deletedIds);

  // Find Tirzepatide products
  const tirzepatide = await db.execute(sql`
    SELECT id, name, categoryId FROM protocol_items WHERE name LIKE '%Tirzepatide%'
  `);

  console.log('Current Tirzepatide products:', tirzepatide);
}

checkOrphans().catch(console.error);
