import mysql from 'mysql2/promise';
const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('=== PATRICK SPRAGUE INVESTIGATION ===\n');

  // 1. Users table
  const [users] = await conn.execute("SELECT id, name, email, role, createdAt, lastSignedIn FROM users WHERE name LIKE '%sprague%' OR email LIKE '%sprague%'");
  console.log('USERS:', JSON.stringify(users, null, 2));

  // 2. Clients table
  const [clients] = await conn.execute("SELECT * FROM clients WHERE name LIKE '%sprague%' OR email LIKE '%sprague%'");
  console.log('\nCLIENTS:', JSON.stringify(clients, null, 2));

  // 3. Transformation enrollments
  const [enrollments] = await conn.execute("SELECT * FROM transformation_enrollments WHERE clientName LIKE '%sprague%' OR email LIKE '%sprague%'");
  console.log('\nENROLLMENTS:', JSON.stringify(enrollments, null, 2));

  // 4. Client projects
  const [projects] = await conn.execute("SELECT * FROM client_projects WHERE clientName LIKE '%sprague%' OR clientEmail LIKE '%sprague%'");
  console.log('\nCLIENT PROJECTS:', JSON.stringify(projects, null, 2));

  // 5. Client protocols
  const [protocols] = await conn.execute("SELECT id, clientName, clientEmail, status, createdAt FROM client_protocols WHERE clientName LIKE '%sprague%' OR clientEmail LIKE '%sprague%'");
  console.log('\nCLIENT PROTOCOLS:', JSON.stringify(protocols, null, 2));

  // 6. Prospects
  const [prospects] = await conn.execute("SELECT * FROM prospects WHERE name LIKE '%sprague%' OR email LIKE '%sprague%'");
  console.log('\nPROSPECTS:', JSON.stringify(prospects, null, 2));

  // 7. Project tasks (if project exists)
  if (projects.length > 0) {
    const projectId = projects[0].id;
    const [tasks] = await conn.execute("SELECT id, name, lifecycleStageId, status, assignedTeamMemberId, dueDate FROM project_tasks WHERE clientProjectId = ?", [projectId]);
    console.log(`\nPROJECT TASKS (project #${projectId}):`, JSON.stringify(tasks, null, 2));
  }

  // 8. Automation events
  if (enrollments.length > 0) {
    const enrollId = enrollments[0].id;
    const [events] = await conn.execute("SELECT id, eventType, status, triggeredBy, createdAt FROM automation_events WHERE enrollmentId = ?", [enrollId]);
    console.log(`\nAUTOMATION EVENTS (enrollment #${enrollId}):`, JSON.stringify(events, null, 2));
  }

  // 9. Lifecycle stages reference
  const [stages] = await conn.execute("SELECT id, name, sortOrder FROM lifecycle_stages ORDER BY sortOrder");
  console.log('\nLIFECYCLE STAGES:', JSON.stringify(stages, null, 2));

  // 10. Activity logs
  if (projects.length > 0) {
    const projectId = projects[0].id;
    const [logs] = await conn.execute("SELECT id, actionType, description, createdAt FROM project_activity_logs WHERE clientProjectId = ? ORDER BY createdAt DESC LIMIT 10", [projectId]);
    console.log(`\nACTIVITY LOGS (project #${projectId}):`, JSON.stringify(logs, null, 2));
  }

  // 11. Notifications about Patrick
  const [notifs] = await conn.execute("SELECT id, type, title, message, createdAt FROM notifications WHERE message LIKE '%sprague%' OR title LIKE '%sprague%' ORDER BY createdAt DESC LIMIT 10");
  console.log('\nNOTIFICATIONS:', JSON.stringify(notifs, null, 2));

  await conn.end();
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
