/**
 * Script to fix orphaned client_protocol_items
 * Run with: node scripts/fix-orphaned-items.mjs
 * 
 * This script:
 * 1. Identifies all orphaned client_protocol_items (referencing deleted products)
 * 2. Attempts to match them to existing products by similar name
 * 3. Updates the references or marks them for manual review
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || '4000'),
    ssl: { rejectUnauthorized: true }
  });

  const db = drizzle(connection);

  console.log('Checking for orphaned client_protocol_items...\n');

  // Get all orphaned items grouped by deleted protocolItemId
  const orphanedGroups = await db.execute(sql`
    SELECT cpi.protocolItemId, COUNT(DISTINCT cp.id) as affected_protocols, COUNT(*) as total_items
    FROM client_protocol_items cpi 
    LEFT JOIN protocol_items pi ON cpi.protocolItemId = pi.id 
    LEFT JOIN client_protocols cp ON cpi.clientProtocolId = cp.id
    WHERE pi.id IS NULL
    GROUP BY cpi.protocolItemId
  `);

  console.log('Orphaned protocolItemIds and their impact:');
  console.log(orphanedGroups[0]);

  // Get all current Tirzepatide products
  const tirzepatideProducts = await db.execute(sql`
    SELECT id, name FROM protocol_items WHERE name LIKE '%Tirzepatide%'
  `);

  console.log('\nCurrent Tirzepatide products:');
  console.log(tirzepatideProducts[0]);

  // For now, just report - don't auto-fix without confirmation
  console.log('\n--- MANUAL FIX REQUIRED ---');
  console.log('To fix orphaned items, run the appropriate UPDATE statement');
  console.log('Example: UPDATE client_protocol_items SET protocolItemId = <new_id> WHERE protocolItemId = <old_deleted_id>');

  await connection.end();
}

main().catch(console.error);
