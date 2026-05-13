import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get Kellie's protocol items (540006) - join client_protocol_items with protocol_items
  const [kellieItems] = await conn.query(`
    SELECT cpi.id as cpiId, cpi.protocolItemId, cpi.quantity, cpi.isIncluded, cpi.isRecommended, 
           cpi.customPrice, pi.name, pi.itemType, pi.price as basePrice
    FROM client_protocol_items cpi
    LEFT JOIN protocol_items pi ON cpi.protocolItemId = pi.id
    WHERE cpi.clientProtocolId = 540006
    ORDER BY pi.name
  `);
  console.log('=== KELLIE PROTOCOL ITEMS (540006) ===');
  for (const p of kellieItems) {
    console.log(`cpiID: ${p.cpiId} | piID: ${p.protocolItemId} | ${p.name || 'NULL NAME'} | qty: ${p.quantity} | included: ${p.isIncluded} | rec: ${p.isRecommended} | type: ${p.itemType} | price: ${p.customPrice || p.basePrice}`);
  }
  
  // Kellie's packing slip items
  const [kellieSlipItems] = await conn.query(`
    SELECT psi.* FROM packing_slip_items psi 
    JOIN packing_slips ps ON psi.packingSlipId = ps.id 
    WHERE ps.clientProtocolId = 540006
  `);
  console.log('\n=== KELLIE PACKING SLIP ITEMS ===');
  const slipProtocolItemIds = new Set();
  for (const i of kellieSlipItems) {
    slipProtocolItemIds.add(i.protocolItemId);
    console.log(`SlipItem: ${i.itemName} | qty: ${i.quantity} | protocolItemId: ${i.protocolItemId}`);
  }
  
  // Find items in protocol but NOT in packing slip
  console.log('\n=== KELLIE: ITEMS IN PROTOCOL BUT NOT IN PACKING SLIP ===');
  for (const p of kellieItems) {
    if (!slipProtocolItemIds.has(p.protocolItemId) && !slipProtocolItemIds.has(p.cpiId)) {
      console.log(`MISSING: cpiID ${p.cpiId} | piID ${p.protocolItemId} | ${p.name || 'NULL NAME'} | qty: ${p.quantity} | included: ${p.isIncluded} | rec: ${p.isRecommended}`);
    }
  }
  
  // Check for items with NULL names (the "Unknown Item" issue)
  console.log('\n=== KELLIE: ITEMS WITH NULL/MISSING NAMES ===');
  for (const p of kellieItems) {
    if (!p.name) {
      console.log(`NULL NAME: cpiID ${p.cpiId} | piID ${p.protocolItemId} | qty: ${p.quantity}`);
      // Check if protocolItemId exists in protocol_items
      const [check] = await conn.query('SELECT id, name FROM protocol_items WHERE id = ?', [p.protocolItemId]);
      console.log(`  -> protocol_items lookup:`, check.length > 0 ? `Found: ${check[0].name}` : 'NOT FOUND');
    }
  }
  
  // Now Matt (780001)
  const [mattItems] = await conn.query(`
    SELECT cpi.id as cpiId, cpi.protocolItemId, cpi.quantity, cpi.isIncluded, cpi.isRecommended, 
           cpi.customPrice, pi.name, pi.itemType, pi.price as basePrice
    FROM client_protocol_items cpi
    LEFT JOIN protocol_items pi ON cpi.protocolItemId = pi.id
    WHERE cpi.clientProtocolId = 780001
    ORDER BY pi.name
  `);
  console.log('\n=== MATT PROTOCOL ITEMS (780001) ===');
  for (const p of mattItems) {
    console.log(`cpiID: ${p.cpiId} | piID: ${p.protocolItemId} | ${p.name || 'NULL NAME'} | qty: ${p.quantity} | included: ${p.isIncluded} | rec: ${p.isRecommended} | type: ${p.itemType} | price: ${p.customPrice || p.basePrice}`);
  }
  
  // Matt's packing slip
  const [mattSlips] = await conn.query('SELECT id, status, totalItems FROM packing_slips WHERE clientProtocolId = 780001');
  console.log('\n=== MATT PACKING SLIPS ===');
  for (const s of mattSlips) console.log(`Slip ID: ${s.id} | Status: ${s.status} | Total: ${s.totalItems}`);
  
  if (mattSlips.length > 0) {
    const [mattSlipItems] = await conn.query('SELECT * FROM packing_slip_items WHERE packingSlipId = ?', [mattSlips[0].id]);
    console.log('\n=== MATT PACKING SLIP ITEMS ===');
    for (const i of mattSlipItems) {
      console.log(`SlipItem: ${i.itemName} | qty: ${i.quantity} | protocolItemId: ${i.protocolItemId}`);
    }
    
    // Find QTY 0 items on Matt's slip
    console.log('\n=== MATT QTY 0 ITEMS ===');
    for (const p of mattItems) {
      if (p.quantity === 0) {
        console.log(`QTY 0: piID ${p.protocolItemId} | ${p.name || 'NULL'} | included: ${p.isIncluded}`);
      }
    }
  }
  
  await conn.end();
}
run().catch(console.error);
