import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all protocol items ordered by id (oldest first gets lowest number)
  const [items] = await conn.query("SELECT id, name, sku FROM protocol_items ORDER BY id ASC");
  console.log(`Found ${items.length} protocol items total`);
  
  // Filter to those without a SKU already
  const needsSku = items.filter(i => !i.sku);
  console.log(`${needsSku.length} items need SKU assignment`);
  
  // Assign sequentially starting from OL-0001
  let counter = 1;
  for (const item of needsSku) {
    const sku = `OL-${String(counter).padStart(4, '0')}`;
    await conn.query("UPDATE protocol_items SET sku = ? WHERE id = ?", [sku, item.id]);
    console.log(`  ${sku} → ${item.name} (id=${item.id})`);
    counter++;
  }
  
  console.log(`\nAssigned ${counter - 1} SKUs (OL-0001 through OL-${String(counter - 1).padStart(4, '0')})`);
  
  // Verify
  const [verify] = await conn.query("SELECT id, name, sku FROM protocol_items WHERE sku IS NOT NULL ORDER BY sku LIMIT 10");
  console.log('\nFirst 10 assigned:');
  console.log(JSON.stringify(verify, null, 2));
  
  await conn.end();
}
main().catch(e => console.error(e));
