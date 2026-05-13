import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.log('No DATABASE_URL found');
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  try {
    // 1. Get actual column names for client_projects
    console.log('=== client_projects columns ===');
    const [cols] = await conn.query('DESCRIBE client_projects');
    const colNames = cols.map(c => c.Field);
    console.log(colNames.join(', '));
    
    // 2. Find Erling's projects
    console.log('\n=== Erling Projects ===');
    const nameCol = colNames.includes('clientName') ? 'clientName' : colNames.includes('client_name') ? 'client_name' : null;
    if (!nameCol) {
      console.log('Looking for name column...');
      console.log(colNames);
    }
    const [projects] = await conn.query(`SELECT * FROM client_projects WHERE ${nameCol || 'clientName'} LIKE '%Erling%'`);
    for (const p of projects) {
      console.log(JSON.stringify(p, null, 2));
    }
    
    // 3. Find Erling's protocol
    console.log('\n=== Erling Protocol ===');
    const [protCols] = await conn.query('DESCRIBE client_protocols');
    const protColNames = protCols.map(c => c.Field);
    console.log('Protocol columns:', protColNames.join(', '));
    
    const protNameCol = protColNames.includes('clientName') ? 'clientName' : 'client_name';
    const [protocols] = await conn.query(`SELECT * FROM client_protocols WHERE ${protNameCol} LIKE '%Erling%'`);
    for (const p of protocols) {
      console.log(JSON.stringify(p, null, 2));
    }
    
    // 4. Check tasks for Erling's projects
    console.log('\n=== Tasks for Erling projects ===');
    for (const p of projects) {
      const [taskCols] = await conn.query('DESCRIBE project_tasks');
      const projCol = taskCols.map(c => c.Field).find(f => f.includes('project'));
      const [tasks] = await conn.query(`SELECT * FROM project_tasks WHERE ${projCol} = ?`, [p.id]);
      console.log(`Project ${p.id}: ${tasks.length} tasks`);
      for (const t of tasks) {
        console.log(`  - [${t.status}] ${t.name || t.title} (id: ${t.id})`);
      }
    }
    
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
