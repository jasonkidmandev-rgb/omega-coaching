// Script to create packing slip for Greg Quiroga
// Run with: node scripts/create-greg-packing-slip.mjs

import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Get Greg's protocol
    const [protocols] = await connection.execute(
      "SELECT id, clientName, clientEmail, shippingName, shippingStreet, shippingCity, shippingState, shippingZip, shippingCountry, shippingPhone FROM client_protocols WHERE clientName LIKE '%Greg%'"
    );
    
    if (protocols.length === 0) {
      console.log('No protocol found for Greg');
      return;
    }
    
    const protocol = protocols[0];
    console.log('Found protocol:', protocol.id, protocol.clientName);
    
    // Get protocol items
    const [items] = await connection.execute(
      `SELECT cpi.id, cpi.protocolItemId, cpi.quantity, cpi.isIncluded, pi.name, pi.itemType, pi.price 
       FROM client_protocol_items cpi 
       JOIN protocol_items pi ON cpi.protocolItemId = pi.id 
       WHERE cpi.clientProtocolId = ? AND cpi.isIncluded = 1`,
      [protocol.id]
    );
    
    console.log('Found', items.length, 'included items');
    
    // Check if packing slip already exists
    const [existing] = await connection.execute(
      'SELECT id FROM packing_slips WHERE clientProtocolId = ?',
      [protocol.id]
    );
    
    if (existing.length > 0) {
      console.log('Packing slip already exists for this protocol:', existing[0].id);
      return;
    }
    
    // Create packing slip
    const [result] = await connection.execute(
      `INSERT INTO packing_slips (clientProtocolId, clientName, clientEmail, shippingName, shippingStreet, shippingCity, shippingState, shippingZip, shippingCountry, shippingPhone, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [
        protocol.id,
        protocol.clientName,
        protocol.clientEmail,
        protocol.shippingName,
        protocol.shippingStreet,
        protocol.shippingCity,
        protocol.shippingState,
        protocol.shippingZip,
        protocol.shippingCountry,
        protocol.shippingPhone
      ]
    );
    
    const packingSlipId = result.insertId;
    console.log('Created packing slip:', packingSlipId);
    
    // Add items to packing slip
    for (const item of items) {
      await connection.execute(
        `INSERT INTO packing_slip_items (packingSlipId, protocolItemId, itemName, itemType, quantity, fulfilledQuantity, backorderedQuantity, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 0, 0, NOW(), NOW())`,
        [packingSlipId, item.protocolItemId, item.name, item.itemType, item.quantity || 1]
      );
    }
    
    console.log('Added', items.length, 'items to packing slip');
    console.log('Done! Packing slip created successfully.');
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
