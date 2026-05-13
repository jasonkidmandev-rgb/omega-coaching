import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = await mysql.createPool(process.env.DATABASE_URL);

// Get recent client messages
const [rows] = await pool.query(
  `SELECT id, clientProtocolId, authorType, authorName, message, createdAt 
   FROM protocol_comments 
   WHERE authorName LIKE '%Susan%' OR authorName LIKE '%Ham%'
   ORDER BY createdAt DESC LIMIT 10`
);

for (const r of rows) {
  const utc = new Date(r.createdAt);
  const mtStr = utc.toLocaleString('en-US', { timeZone: 'America/Denver' });
  console.log(`ID: ${r.id} | DB: ${r.createdAt} | UTC ISO: ${utc.toISOString()} | MT: ${mtStr} | msg: ${(r.message || '').substring(0, 60)}`);
}

// Also check the MySQL server timezone
const [tzRows] = await pool.query("SELECT @@global.time_zone as globalTZ, @@session.time_zone as sessionTZ, NOW() as serverNow, UTC_TIMESTAMP() as utcNow");
console.log('\nMySQL timezone info:', tzRows[0]);

await pool.end();
