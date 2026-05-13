// Script to:
// 1. Analyze and assign 177 unassigned tasks to team members
// 2. Create "Conduct strategy session" tasks for Jason for clients with pending scheduling tasks

import { createConnection } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// Team member IDs
const TEAM = {
  SHANNON: 30001,  // Admin coordinator - scheduling, follow-ups, admin tasks
  KARI: 30002,     // Fulfillment - packing, shipping, inventory
  JASON: 30004,    // Coach - strategy sessions, protocol builds, kickoff calls
  LISA: 1,         // Lisa - general admin tasks
};

// Step 1: Get all unassigned tasks
const [unassignedTasks] = await conn.execute(
  'SELECT id, name, status, clientProjectId, lifecycleStageId FROM project_tasks WHERE assignedTeamMemberId IS NULL'
);
console.log(`Found ${unassignedTasks.length} unassigned tasks`);

// Analyze task names to categorize them
const taskCategories = {
  shannon: [],  // Scheduling, follow-ups, admin
  jason: [],    // Coaching, sessions, protocol builds
  kari: [],     // Fulfillment, shipping, packing
  lisa: [],     // General admin
  unmatched: [],
};

for (const task of unassignedTasks) {
  const name = (task.name || '').toLowerCase();
  
  if (name.includes('schedule') || name.includes('follow up') || name.includes('follow-up') ||
      name.includes('reminder') || name.includes('send email') || name.includes('contact') ||
      name.includes('reach out') || name.includes('check in') || name.includes('check-in') ||
      name.includes('notify') || name.includes('send notification') || name.includes('welcome') ||
      name.includes('onboard') || name.includes('intake') || name.includes('enrollment') ||
      name.includes('verify') || name.includes('confirm') || name.includes('assign') ||
      name.includes('update status') || name.includes('review application') ||
      name.includes('send waiver') || name.includes('collect') || name.includes('request')) {
    taskCategories.shannon.push(task);
  } else if (name.includes('conduct') || name.includes('strategy session') || 
             name.includes('protocol build') || name.includes('kickoff') ||
             name.includes('coaching') || name.includes('review protocol') ||
             name.includes('create protocol') || name.includes('design protocol') ||
             name.includes('build protocol') || name.includes('consultation') ||
             name.includes('training session') || name.includes('reconstitution') ||
             name.includes('week 3 review') || name.includes('month 2') || name.includes('final review') ||
             name.includes('assess') || name.includes('evaluate')) {
    taskCategories.jason.push(task);
  } else if (name.includes('ship') || name.includes('pack') || name.includes('fulfill') ||
             name.includes('inventory') || name.includes('order') || name.includes('delivery') ||
             name.includes('tracking') || name.includes('box') || name.includes('supplies') ||
             name.includes('prepare kit') || name.includes('assemble')) {
    taskCategories.kari.push(task);
  } else {
    // Default unmatched tasks to Shannon (admin coordinator)
    taskCategories.unmatched.push(task);
  }
}

console.log('\n=== Task Distribution ===');
console.log(`Shannon (scheduling/admin): ${taskCategories.shannon.length}`);
console.log(`Jason (coaching/sessions): ${taskCategories.jason.length}`);
console.log(`Kari (fulfillment): ${taskCategories.kari.length}`);
console.log(`Unmatched (→ Shannon): ${taskCategories.unmatched.length}`);

// Show some sample unmatched tasks
if (taskCategories.unmatched.length > 0) {
  console.log('\nSample unmatched tasks (first 20):');
  taskCategories.unmatched.slice(0, 20).forEach(t => console.log(`  - [${t.id}] ${t.name}`));
}

// Step 2: Assign tasks
let updated = 0;

async function assignTasks(tasks, teamMemberId, label) {
  if (tasks.length === 0) return;
  const ids = tasks.map(t => t.id);
  const placeholders = ids.map(() => '?').join(',');
  await conn.execute(
    `UPDATE project_tasks SET assignedTeamMemberId = ? WHERE id IN (${placeholders})`,
    [teamMemberId, ...ids]
  );
  updated += tasks.length;
  console.log(`Assigned ${tasks.length} tasks to ${label} (ID: ${teamMemberId})`);
}

await assignTasks(taskCategories.shannon, TEAM.SHANNON, 'Shannon');
await assignTasks(taskCategories.jason, TEAM.JASON, 'Jason');
await assignTasks(taskCategories.kari, TEAM.KARI, 'Kari');
await assignTasks(taskCategories.unmatched, TEAM.SHANNON, 'Shannon (unmatched)');

console.log(`\nTotal tasks assigned: ${updated}`);

// Step 3: Create "Conduct strategy session" tasks for Jason
// For each client with a pending "Schedule strategy session" task
const [scheduleTasks] = await conn.execute(
  `SELECT pt.id, pt.name, pt.clientProjectId, pt.lifecycleStageId, pt.dueDate
   FROM project_tasks pt
   WHERE pt.name LIKE 'Schedule strategy session%'
   AND pt.status = 'pending'`
);

console.log(`\n=== Creating Jason's Conduct Tasks ===`);
console.log(`Found ${scheduleTasks.length} pending "Schedule strategy session" tasks`);

let created = 0;
for (const task of scheduleTasks) {
  // Extract client name from the task name
  const clientName = task.name.replace(/^Schedule strategy session for /, '').replace(/ —.*$/, '');
  
  // Check if a "Conduct strategy session" task already exists for this client project
  const [existing] = await conn.execute(
    `SELECT id FROM project_tasks WHERE clientProjectId = ? AND name LIKE 'Conduct strategy session%'`,
    [task.clientProjectId]
  );
  
  if (existing.length > 0) {
    console.log(`  Skipping ${clientName} - conduct task already exists`);
    continue;
  }
  
  // Create the conduct task for Jason
  const conductName = `Conduct strategy session for ${clientName}`;
  const dueDate = task.dueDate || null;
  
  await conn.execute(
    `INSERT INTO project_tasks (clientProjectId, lifecycleStageId, name, description, status, assignedTeamMemberId, dueDate, sortOrder, isRequired, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, 1, 1, NOW(), NOW())`,
    [task.clientProjectId, task.lifecycleStageId, conductName, 
     `Review client goals, health history, and design initial protocol strategy with ${clientName}`,
     TEAM.JASON, dueDate]
  );
  created++;
  console.log(`  Created: "${conductName}" → Jason`);
}

console.log(`\nCreated ${created} new conduct tasks for Jason`);

// Final summary
const [finalDistribution] = await conn.execute(
  `SELECT pt.assignedTeamMemberId, tm.name, COUNT(*) as taskCount, 
   SUM(CASE WHEN pt.status = 'pending' THEN 1 ELSE 0 END) as pendingCount
   FROM project_tasks pt
   LEFT JOIN team_members tm ON pt.assignedTeamMemberId = tm.id
   GROUP BY pt.assignedTeamMemberId, tm.name
   ORDER BY taskCount DESC`
);

console.log('\n=== Final Task Distribution ===');
finalDistribution.forEach(row => {
  console.log(`  ${row.name || 'Unassigned'}: ${row.taskCount} total, ${row.pendingCount} pending`);
});

await conn.end();
console.log('\nDone!');
