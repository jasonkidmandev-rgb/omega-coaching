import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find Jefferi's contact
const [contacts] = await conn.execute(
  `SELECT * FROM contacts WHERE first_name LIKE '%Jeffer%' OR last_name LIKE '%Schmidl%' LIMIT 5`
);
console.log("=== CONTACTS ===");
for (const c of contacts) {
  console.log(JSON.stringify(c, null, 2));
}

// Find Jefferi's user
const [users] = await conn.execute(
  `SELECT id, email, name, role FROM users WHERE email LIKE '%schmidl%' OR name LIKE '%Jeffer%' LIMIT 5`
);
console.log("\n=== USERS ===");
for (const u of users) {
  console.log(JSON.stringify(u, null, 2));
}

// Check what columns store_orders has
const [cols] = await conn.execute(`DESCRIBE store_orders`);
console.log("\n=== STORE_ORDERS COLUMNS ===");
for (const c of cols) {
  console.log(`${c.Field}: ${c.Type} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
}

// Check store orders for Jefferi
const [orders] = await conn.execute(
  `SELECT * FROM store_orders WHERE contact_id IN (SELECT id FROM contacts WHERE first_name LIKE '%Jeffer%' OR last_name LIKE '%Schmidl%') LIMIT 5`
);
console.log("\n=== STORE ORDERS ===");
console.log(`Found ${orders.length} orders`);
for (const o of orders) {
  console.log(JSON.stringify(o, null, 2));
}

// Check Jefferi's profile data (shipping address)
const [profiles] = await conn.execute(
  `SELECT * FROM client_profiles WHERE user_id = 8460068 LIMIT 1`
);
console.log("\n=== CLIENT PROFILE ===");
for (const p of profiles) {
  console.log(JSON.stringify(p, null, 2));
}

// Also check if there's a separate addresses table
const [tables] = await conn.execute(`SHOW TABLES LIKE '%address%'`);
console.log("\n=== ADDRESS TABLES ===");
console.log(tables);

await conn.end();
