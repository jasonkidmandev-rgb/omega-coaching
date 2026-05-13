/**
 * One-time fix: Recalculate all packing slip statuses based on actual item data.
 * This fixes slips that show 'partial' or 'in_progress' despite all items being fulfilled.
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const url = new URL(DATABASE_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connected to database');

  // Get all non-archived, non-cancelled packing slips
  const [slips] = await connection.execute(
    `SELECT id, status, totalItems, itemsFulfilled, itemsBackordered, clientName, isLocked
     FROM packing_slips 
     WHERE archivedAt IS NULL AND status != 'cancelled'`
  );

  console.log(`Found ${slips.length} active packing slips to check`);

  let fixed = 0;
  let alreadyCorrect = 0;

  for (const slip of slips) {
    // Get all items for this slip
    const [items] = await connection.execute(
      `SELECT id, quantity, quantityFulfilled, quantityBackordered, status 
       FROM packing_slip_items 
       WHERE packingSlipId = ?`,
      [slip.id]
    );

    if (items.length === 0) continue;

    // Recalculate totals from actual item data
    let totalItems = 0;
    let itemsFulfilled = 0;
    let itemsBackordered = 0;

    for (const item of items) {
      totalItems += item.quantity;
      itemsFulfilled += item.quantityFulfilled;
      itemsBackordered += item.quantityBackordered;
    }

    // Determine correct status
    const allItemsFulfilled = items.every(
      item => item.status === 'fulfilled' || item.quantityFulfilled >= item.quantity
    );

    let correctStatus;
    if (itemsFulfilled >= totalItems || allItemsFulfilled) {
      correctStatus = 'complete';
      itemsBackordered = 0; // Clear stale backorder count
    } else if (itemsFulfilled > 0 && itemsFulfilled < totalItems) {
      correctStatus = itemsBackordered > 0 ? 'partial' : 'in_progress';
    } else if (itemsBackordered > 0) {
      correctStatus = 'partial';
    } else {
      correctStatus = 'pending';
    }

    // Also check: if items were backordered but then fulfilled, clear item-level backorder
    for (const item of items) {
      if ((item.status === 'fulfilled' || item.quantityFulfilled >= item.quantity) && item.quantityBackordered > 0) {
        await connection.execute(
          `UPDATE packing_slip_items SET quantityBackordered = 0 WHERE id = ?`,
          [item.id]
        );
        console.log(`  Fixed item #${item.id}: cleared stale backorder count`);
      }
    }

    // Check if slip needs updating
    const needsUpdate = 
      slip.status !== correctStatus || 
      slip.totalItems !== totalItems || 
      slip.itemsFulfilled !== itemsFulfilled || 
      slip.itemsBackordered !== itemsBackordered;

    if (needsUpdate) {
      await connection.execute(
        `UPDATE packing_slips 
         SET status = ?, totalItems = ?, itemsFulfilled = ?, itemsBackordered = ?
         WHERE id = ?`,
        [correctStatus, totalItems, itemsFulfilled, itemsBackordered, slip.id]
      );
      console.log(`FIXED: Slip #${slip.id} (${slip.clientName}) — ${slip.status} → ${correctStatus} | fulfilled: ${slip.itemsFulfilled}→${itemsFulfilled}/${totalItems} | backorder: ${slip.itemsBackordered}→${itemsBackordered} | locked: ${slip.isLocked ? 'yes' : 'no'}`);
      fixed++;
    } else {
      alreadyCorrect++;
    }
  }

  console.log(`\nDone! Fixed: ${fixed} | Already correct: ${alreadyCorrect} | Total checked: ${slips.length}`);

  await connection.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
