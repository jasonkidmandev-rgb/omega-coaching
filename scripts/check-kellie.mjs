import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check client_protocols
const [protocols] = await conn.execute(
  "SELECT id, clientName, clientEmail, clientId, clientPhone, status, createdAt FROM client_protocols WHERE clientName LIKE '%Kellie%' OR clientName LIKE '%Alford%' ORDER BY createdAt"
);
console.log("=== CLIENT PROTOCOLS ===");
for (const row of protocols) {
  console.log(JSON.stringify(row, null, 2));
}

// Check clients table
const [clients] = await conn.execute(
  "SELECT id, name, email, phone, createdAt FROM clients WHERE name LIKE '%Kellie%' OR name LIKE '%Alford%' ORDER BY createdAt"
);
console.log("\n=== CLIENTS TABLE ===");
for (const row of clients) {
  console.log(JSON.stringify(row, null, 2));
}

// Check users table
const [users] = await conn.execute(
  "SELECT id, name, email, phone, role, createdAt FROM users WHERE name LIKE '%Kellie%' OR name LIKE '%Alford%' OR email LIKE '%alford%' ORDER BY createdAt"
);
console.log("\n=== USERS TABLE ===");
for (const row of users) {
  console.log(JSON.stringify(row, null, 2));
}

await conn.end();
