import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: tsx scripts/run-migration.ts <sql-file>');
  process.exit(1);
}

const sqlPath = path.resolve(__dirname, '..', sqlFile);
const sql = fs.readFileSync(sqlPath, 'utf-8');

// Strip comments and split into individual statements
const statements = sql
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

const conn = await mysql.createConnection(url);
console.log(`Running ${sqlFile} (${statements.length} statement(s))...`);

for (const stmt of statements) {
  console.log(`\nExecuting:\n${stmt};`);
  try {
    await conn.execute(stmt);
    console.log('  ✓ OK');
  } catch (err: any) {
    console.error('  ✗ FAILED:', err.message);
    await conn.end();
    process.exit(1);
  }
}

await conn.end();
console.log('\nDone.');
