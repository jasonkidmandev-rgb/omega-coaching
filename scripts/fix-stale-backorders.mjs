// Fix existing packing slips where all items are fulfilled but status is still 'partial'
// due to stale quantityBackordered counts on items

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== FIXING STALE BACKORDER COUNTS ON PACKING SLIPS ===\n');

// Step 1: Find all packing slip items that are fulfilled but still have quantityBackordered > 0
const [staleItems] = await conn.execute(`
  SELECT psi.id, psi.packingSlipId, psi.itemName, psi.quantity, 
         psi.quantityFulfilled, psi.quantityBackordered, psi.status
  FROM packing_slip_items psi
  WHERE psi.status = 'fulfilled' AND psi.quantityBackordered > 0
`);

console.log(`Found ${staleItems.length} fulfilled items with stale backorder counts:\n`);
for (const item of staleItems) {
  console.log(`  Slip #${item.packingSlipId} | ${item.itemName} | qty: ${item.quantity} | fulfilled: ${item.quantityFulfilled} | backordered: ${item.quantityBackordered} | status: ${item.status}`);
}

if (staleItems.length > 0) {
  // Step 2: Reset quantityBackordered to 0 for all fulfilled items
  const itemIds = staleItems.map(i => i.id);
  await conn.execute(`
    UPDATE packing_slip_items 
    SET quantityBackordered = 0 
    WHERE id IN (${itemIds.join(',')})
  `);
  console.log(`\n✅ Reset quantityBackordered to 0 for ${staleItems.length} fulfilled items`);
}

// Step 3: Find all packing slips that are 'partial' but all items are fulfilled
const [partialSlips] = await conn.execute(`
  SELECT ps.id, ps.clientName, ps.totalItems, ps.itemsFulfilled, ps.itemsBackordered, ps.status
  FROM packing_slips ps
  WHERE ps.status = 'partial'
`);

console.log(`\nFound ${partialSlips.length} packing slips with 'partial' status:\n`);

let fixedCount = 0;
for (const slip of partialSlips) {
  // Check if all items on this slip are actually fulfilled
  const [items] = await conn.execute(`
    SELECT id, itemName, quantity, quantityFulfilled, quantityBackordered, status
    FROM packing_slip_items 
    WHERE packingSlipId = ?
  `, [slip.id]);
  
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const fulfilledQty = items.reduce((sum, i) => sum + i.quantityFulfilled, 0);
  const allFulfilled = items.every(i => i.status === 'fulfilled' || i.quantityFulfilled >= i.quantity);
  
  console.log(`  Slip #${slip.id} (${slip.clientName}): total=${totalQty}, fulfilled=${fulfilledQty}, allItemsFulfilled=${allFulfilled}`);
  
  if (allFulfilled && fulfilledQty >= totalQty) {
    await conn.execute(`
      UPDATE packing_slips 
      SET status = 'complete', itemsBackordered = 0, itemsFulfilled = ?
      WHERE id = ?
    `, [totalQty, slip.id]);
    console.log(`    ✅ FIXED → status changed from 'partial' to 'complete'`);
    fixedCount++;
  } else {
    // Recalculate the correct totals
    const backorderedQty = items.reduce((sum, i) => sum + i.quantityBackordered, 0);
    await conn.execute(`
      UPDATE packing_slips 
      SET itemsFulfilled = ?, itemsBackordered = ?, totalItems = ?
      WHERE id = ?
    `, [fulfilledQty, backorderedQty, totalQty, slip.id]);
    console.log(`    ℹ️  Recalculated totals: fulfilled=${fulfilledQty}, backordered=${backorderedQty}`);
  }
}

console.log(`\n=== DONE: Fixed ${fixedCount} packing slips from 'partial' to 'complete' ===`);

// Step 4: Verify the fix
const [verifyPartial] = await conn.execute(`
  SELECT id, clientName, status, itemsFulfilled, itemsBackordered, totalItems
  FROM packing_slips 
  WHERE status = 'partial'
`);
console.log(`\nRemaining 'partial' slips: ${verifyPartial.length}`);
for (const s of verifyPartial) {
  console.log(`  Slip #${s.id} (${s.clientName}): fulfilled=${s.itemsFulfilled}/${s.totalItems}, backordered=${s.itemsBackordered}`);
}

await conn.end();
