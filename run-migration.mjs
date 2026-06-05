/**
 * Runs a SQL migration file against the DATABASE_URL.
 *
 * Usage:
 *   node run-migration.mjs migrations/001_store_order_stripe_fields.sql
 *
 * The DATABASE_URL is read from the .env file automatically, or you can
 * pass it inline:
 *   DATABASE_URL=mysql://... node run-migration.mjs migrations/001_store_order_stripe_fields.sql
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env if DATABASE_URL is not already set
if (!process.env.DATABASE_URL) {
  try {
    const envFile = readFileSync('.env', 'utf8');
    for (const line of envFile.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key?.trim() === 'DATABASE_URL') {
        process.env.DATABASE_URL = rest.join('=').trim();
        break;
      }
    }
  } catch {
    // .env not found — rely on environment
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Add it to .env or pass it inline.');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌  Usage: node run-migration.mjs <path-to-sql-file>');
  process.exit(1);
}

const filePath = resolve(migrationFile);
const sql = readFileSync(filePath, 'utf8');

// Strip comment lines first, then split on semicolons
const stripped = sql
  .split('\n')
  .filter(line => !line.trimStart().startsWith('--'))
  .join('\n');

const statements = stripped
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`\n📂  Migration file: ${filePath}`);
console.log(`🔗  Database:       ${DATABASE_URL.replace(/:([^:@]+)@/, ':****@')}`);
console.log(`📝  Statements:     ${statements.length}\n`);

const conn = await mysql.createConnection(DATABASE_URL);

try {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.slice(0, 80).replace(/\s+/g, ' ');
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}... `);
    try {
      await conn.execute(stmt);
      console.log('✅');
    } catch (err) {
      console.log('❌');
      console.error(`\n  Error: ${err.message}\n`);
      // ALTER TABLE ... ADD COLUMN IF NOT EXISTS is safe — but older MySQL
      // versions don't support IF NOT EXISTS on ADD COLUMN. Catch that case.
      if (err.message.includes('Duplicate column name')) {
        console.log('  ↳  Column already exists — skipping.\n');
        continue;
      }
      throw err;
    }
  }
  console.log('\n✅  Migration complete.\n');
} catch (err) {
  console.error('\n❌  Migration failed:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
