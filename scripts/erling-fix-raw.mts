import { getDb } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB'); process.exit(1); }

  // 1. Check Erling's projects and their protocolId linkage
  console.log('=== Erling Projects (raw SQL) ===');
  const projects = await db.execute(sql`
    SELECT id, client_name, status, protocol_id, workflow_template_id, created_at 
    FROM client_projects 
    WHERE client_name LIKE '%Erling%'
  `);
  console.log(JSON.stringify(projects[0], null, 2));

  // 2. Check Erling's protocol
  console.log('\n=== Erling Protocol ===');
  const protocols = await db.execute(sql`
    SELECT id, client_name, version_name, status, duration_months
    FROM client_protocols 
    WHERE client_name LIKE '%Erling%' OR version_name LIKE '%Erling%'
  `);
  console.log(JSON.stringify(protocols[0], null, 2));

  // 3. Check tasks for project 420003
  console.log('\n=== Tasks for project 420003 ===');
  const tasks = await db.execute(sql`
    SELECT id, client_project_id, name, status, assigned_team_member_id, due_date
    FROM project_tasks 
    WHERE client_project_id = 420003
  `);
  console.log(JSON.stringify(tasks[0], null, 2));

  // 4. Check if there's a stale project 390001
  console.log('\n=== Check for stale project 390001 ===');
  const stale = await db.execute(sql`
    SELECT id, client_name, status, protocol_id, workflow_template_id
    FROM client_projects 
    WHERE id = 390001
  `);
  console.log(JSON.stringify(stale[0], null, 2));

  // 5. Check all projects that reference Erling's protocol
  console.log('\n=== Projects referencing protocol 1230001 ===');
  const refs = await db.execute(sql`
    SELECT id, client_name, status, protocol_id, workflow_template_id
    FROM client_projects 
    WHERE protocol_id = 1230001
  `);
  console.log(JSON.stringify(refs[0], null, 2));

  process.exit(0);
}

main().catch(console.error);
