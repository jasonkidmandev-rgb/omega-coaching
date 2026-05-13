import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get Tyler and Brian's protocol details
    const [protocols] = await connection.execute(
      `SELECT id, clientName, clientEmail FROM client_protocols WHERE clientName = 'Tyler Seeley' OR clientName = 'Brian Riseland'`
    );
    
    console.log('Found protocols:', protocols);

    for (const protocol of protocols) {
      // Check if packing slip already exists
      const [existing] = await connection.execute(
        `SELECT id FROM packing_slips WHERE clientProtocolId = ?`,
        [protocol.id]
      );

      if (existing.length > 0) {
        console.log(`Packing slip already exists for ${protocol.clientName}`);
        continue;
      }

      // Get protocol items
      const [items] = await connection.execute(
        `SELECT cpi.*, pi.name as itemName 
         FROM client_protocol_items cpi 
         LEFT JOIN protocol_items pi ON cpi.protocolItemId = pi.id 
         WHERE cpi.clientProtocolId = ? AND cpi.isSelected = 1`,
        [protocol.id]
      );

      console.log(`Found ${items.length} items for ${protocol.clientName}`);

      // Create packing slip
      const [result] = await connection.execute(
        `INSERT INTO packing_slips (clientProtocolId, clientName, clientEmail, status, totalItems, itemsFulfilled, itemsBackordered, createdAt, updatedAt)
         VALUES (?, ?, ?, 'pending', ?, 0, 0, NOW(), NOW())`,
        [protocol.id, protocol.clientName, protocol.clientEmail, items.length]
      );

      const packingSlipId = result.insertId;
      console.log(`Created packing slip ${packingSlipId} for ${protocol.clientName}`);

      // Add items to packing slip
      for (const item of items) {
        await connection.execute(
          `INSERT INTO packing_slip_items (packingSlipId, protocolItemId, clientProtocolItemId, itemName, quantity, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
          [packingSlipId, item.protocolItemId, item.id, item.itemName || item.customName || 'Unknown Item', item.qty || 1]
        );
      }

      console.log(`Added ${items.length} items to packing slip for ${protocol.clientName}`);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

main();
