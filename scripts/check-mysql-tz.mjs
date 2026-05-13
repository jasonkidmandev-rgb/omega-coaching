import mysql from 'mysql2/promise';
import 'dotenv/config';

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get Susan's last 3 messages with raw values
  const [rows] = await conn.execute(
    "SELECT id, SUBSTRING(message, 1, 40) as msg, createdAt, CAST(createdAt AS CHAR) as raw_ts FROM protocol_comments WHERE clientProtocolId = 1170002 ORDER BY id DESC LIMIT 5"
  );
  
  for (const r of rows) {
    const d = r.createdAt;
    console.log('---');
    console.log('Message:', r.msg);
    console.log('Raw MySQL string:', r.raw_ts);
    console.log('JS toISOString():', d.toISOString());
    console.log('JS getHours():', d.getHours());
    console.log('JS getUTCHours():', d.getUTCHours());
    console.log('JS toString():', d.toString());
    console.log('typeof:', typeof d, 'instanceof Date:', d instanceof Date);
  }
  
  // Also check the MySQL timezone setting
  const [tzRows] = await conn.execute("SELECT @@global.time_zone, @@session.time_zone");
  console.log('\n--- MySQL Timezone ---');
  console.log(tzRows[0]);
  
  await conn.end();
}
check();
