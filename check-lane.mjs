import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL);
const [rows] = await pool.query("SELECT id, clientName, status, paymentStatus FROM client_protocols WHERE clientName LIKE '%Lane%'");
console.log(JSON.stringify(rows, null, 2));
await pool.end();
