import { createConnection } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse the DATABASE_URL
const url = new URL(DATABASE_URL);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
});

console.log('=== BPC-157 INVENTORY ITEMS ===');
const [items] = await conn.execute(
  "SELECT id, name, quantity, price, categoryId, isDiscountable, isActive FROM inventory_items WHERE name LIKE '%BPC-157%'"
);
console.table(items);

const itemIds = items.map(r => r.id);
console.log('Item IDs:', itemIds);

if (itemIds.length > 0) {
  console.log('\n=== TRANSACTIONS FOR BPC-157 ITEMS (PAST 60 DAYS) ===');
  const [txns60] = await conn.execute(
    `SELECT t.id, t.itemId, i.name as item_name, t.type, t.quantityChange, t.previousQuantity, t.newQuantity, t.reason, t.orderId, t.createdAt 
     FROM inventory_transactions t 
     JOIN inventory_items i ON t.itemId = i.id 
     WHERE i.name LIKE '%BPC-157%' 
     AND t.createdAt >= DATE_SUB(NOW(), INTERVAL 60 DAY) 
     ORDER BY t.createdAt DESC`
  );
  if (txns60.length === 0) {
    console.log('>>> NO TRANSACTIONS IN THE PAST 60 DAYS <<<');
  } else {
    console.table(txns60);
  }

  console.log('\n=== ALL TRANSACTIONS FOR BPC-157 ITEMS (ALL TIME) ===');
  const [txnsAll] = await conn.execute(
    `SELECT t.id, t.itemId, i.name as item_name, t.type, t.quantityChange, t.previousQuantity, t.newQuantity, t.reason, t.orderId, t.createdAt 
     FROM inventory_transactions t 
     JOIN inventory_items i ON t.itemId = i.id 
     WHERE i.name LIKE '%BPC-157%' 
     ORDER BY t.createdAt DESC`
  );
  if (txnsAll.length === 0) {
    console.log('>>> NO TRANSACTIONS EVER RECORDED <<<');
  } else {
    console.table(txnsAll);
  }
}

// Also check if any store orders reference BPC-157
console.log('\n=== STORE ORDERS REFERENCING BPC-157 (PAST 60 DAYS) ===');
const [orders] = await conn.execute(
  `SELECT id, userId, status, totalAmount, items, createdAt 
   FROM store_orders 
   WHERE items LIKE '%BPC-157%' 
   AND createdAt >= DATE_SUB(NOW(), INTERVAL 60 DAY) 
   ORDER BY createdAt DESC`
);
if (orders.length === 0) {
  console.log('>>> NO STORE ORDERS WITH BPC-157 IN PAST 60 DAYS <<<');
} else {
  console.table(orders);
}

await conn.end();
process.exit(0);
