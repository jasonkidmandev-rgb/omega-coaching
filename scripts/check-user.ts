import { config } from 'dotenv';
config();
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '4000'),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: true }
  });

  const [rows] = await conn.execute("SELECT id, name, email, phone FROM users WHERE email LIKE '%jkidman%'");
  console.log('User data:', JSON.stringify(rows, null, 2));

  await conn.end();
}

main().catch(console.error);
