import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Row counts for every table
const [tables] = await conn.query(`
  SELECT TABLE_NAME, TABLE_ROWS
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
  ORDER BY TABLE_NAME
`);

const live = [];
const empty = [];
for (const t of tables) {
  const [[{ c }]] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t.TABLE_NAME}\``);
  (c > 0 ? live : empty).push({ name: t.TABLE_NAME, rows: c });
}

console.log('=== TABLES WITH DATA (' + live.length + ') ===');
live.sort((a, b) => b.rows - a.rows).forEach(t => console.log(`${String(t.rows).padStart(7)}  ${t.name}`));

console.log('\n=== EMPTY TABLES (' + empty.length + ') ===');
console.log(empty.map(t => t.name).join(', '));

await conn.end();
