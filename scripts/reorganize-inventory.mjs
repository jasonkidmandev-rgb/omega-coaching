import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function reorganizeInventory() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Get category IDs
    const [categories] = await connection.execute('SELECT id, name FROM inventory_categories');
    const catMap = {};
    categories.forEach(c => catMap[c.name.toLowerCase()] = c.id);
    
    console.log('Categories:', catMap);
    
    const troscriptionsId = catMap['troscriptions troches'];
    const limitlessId = catMap['limitless tier 1'];
    const bioregulatorId = catMap['bioregulators'];
    const suppliesId = catMap['supplies & misc'];
    
    if (!troscriptionsId || !limitlessId || !bioregulatorId) {
      console.log('Missing required categories');
      return;
    }
    
    // 1. Move items in Bioregulators that say "Troscriptions" to Troscriptions Troches
    const [troscriptionItems] = await connection.execute(
      `UPDATE inventory_items SET category_id = ? WHERE category_id = ? AND name LIKE '%Troscriptions%'`,
      [troscriptionsId, bioregulatorId]
    );
    console.log(`Moved ${troscriptionItems.affectedRows} Troscriptions items from Bioregulators to Troscriptions Troches`);
    
    // 2. Move items from Troscriptions Troches (original 5) to Limitless Tier 1
    // These are: Blue Cannatine, Just Blue, Tro Calm, Tro Zzz, Methylene Blue Troches
    const troscriptionProducts = ['Blue Cannatine', 'Just Blue', 'Tro Calm', 'Tro Zzz', 'Methylene Blue'];
    for (const name of troscriptionProducts) {
      const [result] = await connection.execute(
        `UPDATE inventory_items SET category_id = ? WHERE category_id = ? AND name LIKE ?`,
        [limitlessId, troscriptionsId, `%${name}%`]
      );
      if (result.affectedRows > 0) {
        console.log(`Moved ${name} to Limitless Tier 1`);
      }
    }
    
    // 3. Move first 14 peptides from Bioregulators to Limitless Tier 1
    // These are non-organ peptides at the start of the list
    const peptidesToMove = [
      'AOD9404', 'BPC-157', 'CJC1295', 'Ipamorelin', 'Kisspeptin', 'KPV', 
      'Melanotan', 'MOTS-C', 'NAD+', 'PT-141', 'Retatrutide', 'TA1', 
      'TB-500', 'Tesamorelin', 'GHK-Cu', 'DSIP', 'Semax', 'Selank', 'Epitalon'
    ];
    
    for (const peptide of peptidesToMove) {
      const [result] = await connection.execute(
        `UPDATE inventory_items SET category_id = ? WHERE category_id = ? AND name LIKE ?`,
        [limitlessId, bioregulatorId, `%${peptide}%`]
      );
      if (result.affectedRows > 0) {
        console.log(`Moved ${peptide} to Limitless Tier 1`);
      }
    }
    
    // 4. Move Khavinson Bioregulators (organ names) from Supplies & Misc to Bioregulators
    const organBioregulators = [
      'Endoluten', 'Pinealon', 'Epithalamin', 'Thyreogen', 'Vladonix', 
      'Ventfort', 'Sigumir', 'Cartalax', 'Chonluten', 'Bronchogen',
      'Crystagen', 'Ovagen', 'Suprefort', 'Visoluten', 'Cerluten',
      'Glandokort', 'Libidon', 'Testoluten', 'Zhenoluten', 'Svetinorm',
      'Hepatamin', 'Stamakort', 'Pielotax', 'Vesugen', 'Chelohart',
      'Cardiogen', 'Bonothyrk', 'Gotratix', 'Kristagen', 'Normoftal'
    ];
    
    for (const organ of organBioregulators) {
      const [result] = await connection.execute(
        `UPDATE inventory_items SET category_id = ? WHERE category_id = ? AND name LIKE ?`,
        [bioregulatorId, suppliesId, `%${organ}%`]
      );
      if (result.affectedRows > 0) {
        console.log(`Moved ${organ} from Supplies to Bioregulators`);
      }
    }
    
    // 5. Also move any items containing "Khavinson" to Bioregulators
    const [khavinsonItems] = await connection.execute(
      `UPDATE inventory_items SET category_id = ? WHERE category_id = ? AND name LIKE '%Khavinson%'`,
      [bioregulatorId, suppliesId]
    );
    console.log(`Moved ${khavinsonItems.affectedRows} Khavinson items from Supplies to Bioregulators`);
    
    console.log('\\nReorganization complete!');
    
    // Show final counts
    const [finalCounts] = await connection.execute(`
      SELECT c.name, COUNT(i.id) as count 
      FROM inventory_categories c 
      LEFT JOIN inventory_items i ON c.id = i.category_id 
      GROUP BY c.id, c.name
    `);
    console.log('\\nFinal category counts:');
    finalCounts.forEach(c => console.log(`  ${c.name}: ${c.count} items`));
    
  } finally {
    await connection.end();
  }
}

reorganizeInventory().catch(console.error);
