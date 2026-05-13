import mysql from 'mysql2/promise';

const discountableItems = [
  'AOD9404 (5 mg)',
  'BPC-157 Acetate (10 mg)',
  'CJC1295/Ipamorelin (6 mg / 12 mg)',
  'Ipamorelin (10 mg)',
  'Kisspeptin-10 (5 mg)',
  'KPV (10 mg)',
  'Melanotan1 (10 mg)',
  'MOTS-C (10 mg)',
  'NAD+ (100mg)',
  'NAD+ (500mg)',
  'PT-141 (10 mg)',
  'PT-141 (50 mg)',
  'Retatrutide (6 mg x 2) - Sold in pairs',
  'TA1 - Thymosin Alpha 1 (10 mg)',
  'TB-500 Frag 17-23 (10 mg)',
  'Tesamoralin (10 mg)',
  'GHK-Cu (100 mg) + Sprayer',
  'DSIP Delta (5 mg) + Sprayer',
  'Semax Amidate (30 mg) + Sprayer',
  'Selank Amidate (30 mg) +  Sprayer',
  'Semax / Selank Amidate Blend (30 mg) + Sprayer',
  'BPC-157 Capsule 250 mcg',
  'Healing and Repair Research Blend (BPC,TB5,GHK)',
  'Gastro Inflammation Formula',
  'SLU-PP-332 250 mcg',
  'Tesofensine 250 mcg',
  'Tesofensine 500 mcg',
  'Epitalon 3.3MG',
  '5-AMINO 1MQ Capsule',
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const connection = await mysql.createConnection(dbUrl);

  try {
    // First get all items
    const [items] = await connection.execute('SELECT id, name FROM inventory_items');
    console.log(`Found ${items.length} items in inventory`);
    
    let updatedCount = 0;
    for (const item of items) {
      // Check if item name matches any discountable item (case insensitive, partial match)
      const isDiscountable = discountableItems.some(d => 
        item.name.toLowerCase().includes(d.toLowerCase().split(' ')[0]) ||
        d.toLowerCase().includes(item.name.toLowerCase().split(' ')[0])
      );
      
      if (isDiscountable) {
        await connection.execute(
          'UPDATE inventory_items SET isDiscountable = 1 WHERE id = ?',
          [item.id]
        );
        console.log(`Marked as discountable: ${item.name}`);
        updatedCount++;
      }
    }
    
    console.log(`\nUpdated ${updatedCount} items as discountable`);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
