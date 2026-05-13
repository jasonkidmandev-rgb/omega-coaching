import { getDb } from '../server/db';
import { clients, clientProtocols, users } from '../drizzle/schema';
import { like, sql, eq, and, isNull, isNotNull } from 'drizzle-orm';

async function main() {
  const db = getDb();
  
  // Check clients table for Kellie
  const kellieClients = await db.select().from(clients).where(
    sql`LOWER(${clients.name}) LIKE '%kellie%' OR LOWER(${clients.name}) LIKE '%alford%'`
  );
  console.log('=== Clients table for Kellie ===');
  for (const c of kellieClients) {
    console.log(`  ID: ${c.id}, Name: ${c.name}, Email: ${c.email}, Phone: ${c.phone}, Created: ${c.createdAt}`);
  }
  
  // Check client_protocols for Kellie
  const kellieProtocols = await db.select().from(clientProtocols).where(
    sql`LOWER(${clientProtocols.clientName}) LIKE '%kellie%' OR LOWER(${clientProtocols.clientName}) LIKE '%alford%'`
  );
  console.log('\n=== Client Protocols for Kellie ===');
  for (const p of kellieProtocols) {
    console.log(`  Protocol ID: ${p.id}, Name: ${p.clientName}, ClientId: ${p.clientId}, Approved: ${p.isApproved}, Deleted: ${p.deletedAt}, Archived: ${p.archivedAt}`);
  }
  
  // Check users table for Kellie
  const kellieUsers = await db.select().from(users).where(
    sql`LOWER(${users.name}) LIKE '%kellie%' OR LOWER(${users.name}) LIKE '%alford%' OR LOWER(${users.email}) LIKE '%kellie%'`
  );
  console.log('\n=== Users table for Kellie ===');
  for (const u of kellieUsers) {
    console.log(`  User ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Phone: ${u.phone}, Created: ${u.createdAt}`);
  }
  
  // Check for duplicate emails in clients table
  const dupeEmails = await db.execute(sql`
    SELECT email, COUNT(*) as cnt FROM clients 
    WHERE email IS NOT NULL AND email != '' 
    GROUP BY email HAVING cnt > 1
  `);
  console.log('\n=== Duplicate emails in clients table ===');
  console.log(JSON.stringify(dupeEmails[0], null, 2));
  
  // Check for clients with multiple active protocols
  const multiProtocols = await db.execute(sql`
    SELECT clientId, clientName, COUNT(*) as cnt FROM client_protocols 
    WHERE clientId IS NOT NULL AND deletedAt IS NULL
    GROUP BY clientId, clientName HAVING cnt > 1
  `);
  console.log('\n=== Clients with multiple active protocols ===');
  console.log(JSON.stringify(multiProtocols[0], null, 2));
  
  process.exit(0);
}

main().catch(console.error);
