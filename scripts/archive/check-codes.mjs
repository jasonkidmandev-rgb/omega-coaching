import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const [rows] = await connection.execute('SELECT id, code, tier, name FROM transformation_access_codes');
console.log('Access codes:');
console.log(JSON.stringify(rows, null, 2));

await connection.end();
