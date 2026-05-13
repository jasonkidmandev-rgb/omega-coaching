import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

try {
  const cols = await db.execute(sql`DESCRIBE inventory_transactions`);
  console.log('Columns:', JSON.stringify(cols[0] || cols, null, 2));
  
  const count = await db.execute(sql`SELECT COUNT(*) as cnt FROM inventory_transactions`);
  console.log('Count:', JSON.stringify(count[0] || count));
  
  const saleCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM inventory_transactions WHERE type = 'sale'`);
  console.log('Sale count:', JSON.stringify(saleCount[0] || saleCount));
  
  // Check a sample transaction
  const sample = await db.execute(sql`SELECT * FROM inventory_transactions LIMIT 2`);
  console.log('Sample:', JSON.stringify(sample[0] || sample, null, 2));
} catch(e) {
  console.error('Error:', e.message);
}
process.exit(0);
