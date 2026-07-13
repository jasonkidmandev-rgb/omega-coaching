import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  // Get packing slip info with counts
  const [result] = await conn.execute(`
    SELECT 
      ps.id as packing_slip_id,
      ps.clientProtocolId,
      ps.totalItems as slip_total_items,
      ps.createdAt as slip_created,
      ps.signedAt as slip_signed,
      (SELECT COUNT(*) FROM client_protocol_items cpi WHERE cpi.clientProtocolId = ps.clientProtocolId AND cpi.isRecommended = 1) as protocol_recommended_items,
      (SELECT COUNT(*) FROM packing_slip_items psi WHERE psi.packingSlipId = ps.id) as actual_slip_items
    FROM packing_slips ps 
    WHERE ps.id = 120007
  `);
  
  console.log('Packing Slip Analysis:');
  console.log(JSON.stringify(result[0], null, 2));
  
  // Get the creation dates of packing slip items
  const [items] = await conn.execute(`
    SELECT id, itemName, createdAt 
    FROM packing_slip_items 
    WHERE packingSlipId = 120007 
    ORDER BY createdAt ASC 
    LIMIT 5
  `);
  console.log('\nOldest packing slip items:');
  items.forEach(i => console.log('  ' + i.id + ': ' + i.itemName + ' - created: ' + i.createdAt));
  
  const [itemsNew] = await conn.execute(`
    SELECT id, itemName, createdAt 
    FROM packing_slip_items 
    WHERE packingSlipId = 120007 
    ORDER BY createdAt DESC 
    LIMIT 5
  `);
  console.log('\nNewest packing slip items:');
  itemsNew.forEach(i => console.log('  ' + i.id + ': ' + i.itemName + ' - created: ' + i.createdAt));
  
  await conn.end();
}

main().catch(console.error);
