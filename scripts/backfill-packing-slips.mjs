import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const clients = [
    {
      protocolId: 540006,
      clientName: 'Kellie Alford',
      clientEmail: 'kellie@adamahind.com',
      shippingName: 'Kellie Alford',
      shippingStreet: '34759 Clinton Allen Rd',
      shippingCity: 'Denham Springs',
      shippingState: 'LA',
      shippingZip: '70706',
      shippingCountry: 'USA',
      shippingPhone: '(225) 241-5950',
      paymentDate: '2026-02-09 03:36:15',
    },
    {
      protocolId: 780001,
      clientName: 'Matt Uhler',
      clientEmail: 'mattuhler2520@gmail.com',
      shippingName: 'Matt Uhler',
      shippingStreet: '2520 West Live Oak Drive',
      shippingCity: 'Prescott',
      shippingState: 'AZ',
      shippingZip: '86305',
      shippingCountry: 'United States',
      shippingPhone: '19283011505',
      paymentDate: '2026-02-09 18:40:58',
    },
  ];
  
  for (const client of clients) {
    // Get items for this protocol (excluding services, only items with qty > 0)
    const [items] = await conn.execute(
      `SELECT cpi.protocolItemId, cpi.quantity, pi.name, pi.itemType, COALESCE(cpi.customPrice, pi.price) as price 
       FROM client_protocol_items cpi 
       JOIN protocol_items pi ON cpi.protocolItemId = pi.id 
       WHERE cpi.clientProtocolId = ? AND cpi.isIncluded = 1 AND pi.itemType != 'service' AND cpi.quantity > 0`,
      [client.protocolId]
    );
    
    if (items.length === 0) {
      console.log(`No items for ${client.clientName}, skipping packing slip`);
      continue;
    }
    
    // Create packing slip
    const [result] = await conn.execute(
      `INSERT INTO packing_slips (clientProtocolId, clientName, clientEmail, status, totalItems, itemsFulfilled, itemsBackordered, 
       shippingName, shippingStreet, shippingCity, shippingState, shippingZip, shippingCountry, shippingPhone, 
       createdAt, updatedAt)
       VALUES (?, ?, ?, 'pending', ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client.protocolId, client.clientName, client.clientEmail, items.length,
        client.shippingName, client.shippingStreet, client.shippingCity, client.shippingState,
        client.shippingZip, client.shippingCountry, client.shippingPhone,
        client.paymentDate, client.paymentDate
      ]
    );
    
    const packingSlipId = result.insertId;
    console.log(`Created packing slip ${packingSlipId} for ${client.clientName} with ${items.length} items`);
    
    // Insert packing slip items
    for (const item of items) {
      await conn.execute(
        `INSERT INTO packing_slip_items (packingSlipId, protocolItemId, itemName, itemType, quantity, quantityFulfilled, quantityBackordered, status, price, createdAt)
         VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', ?, ?)`,
        [packingSlipId, item.protocolItemId, item.name, item.itemType, item.quantity, item.price || 0, client.paymentDate]
      );
    }
    
    console.log(`  Inserted ${items.length} items into packing slip ${packingSlipId}`);
  }
  
  await conn.end();
  console.log('Done!');
}

run().catch(console.error);
