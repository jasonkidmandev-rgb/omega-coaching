// Refine task assignments - move coaching-related tasks from Shannon to Jason
import { createConnection } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}
const conn = await createConnection(DATABASE_URL);

const TEAM = {
  SHANNON: 30001,
  KARI: 30002,
  JASON: 30004,
};

// Get all tasks currently assigned to Shannon
const [shannonTasks] = await conn.execute(
  `SELECT id, name, status FROM project_tasks WHERE assignedTeamMemberId = ?`,
  [TEAM.SHANNON]
);

console.log(`Shannon currently has ${shannonTasks.length} tasks`);

// Patterns that should be Jason's (coaching/clinical work)
const jasonPatterns = [
  'lab analysis', 'protocol design', 'protocol presentation', 'protocol approval',
  'first week elite support', 'active monitoring', 'review & q', 'review &',
  'program completion', 'alumni transition', 'application & qualification',
  'phase 1', 'phase 2', 'phase 3', 'phase 4',
  'q1 ', 'q2 ', 'q3 ', 'q4 ',
  'clinical', 'health assessment', 'biomarker', 'bloodwork',
  'dosage', 'protocol adjustment', 'progress review',
];

// Patterns that should be Kari's (fulfillment/logistics)
const kariPatterns = [
  'prepare', 'kit assembly', 'supplies', 'restock',
];

const toJason = [];
const toKari = [];

for (const task of shannonTasks) {
  const name = (task.name || '').toLowerCase();
  
  if (jasonPatterns.some(p => name.includes(p))) {
    toJason.push(task);
  } else if (kariPatterns.some(p => name.includes(p))) {
    toKari.push(task);
  }
}

console.log(`\nReassigning:`);
console.log(`  → Jason (coaching/clinical): ${toJason.length} tasks`);
console.log(`  → Kari (fulfillment): ${toKari.length} tasks`);

if (toJason.length > 0) {
  const ids = toJason.map(t => t.id);
  const placeholders = ids.map(() => '?').join(',');
  await conn.execute(
    `UPDATE project_tasks SET assignedTeamMemberId = ? WHERE id IN (${placeholders})`,
    [TEAM.JASON, ...ids]
  );
  console.log(`  Reassigned ${toJason.length} tasks to Jason`);
  console.log('  Sample:', toJason.slice(0, 5).map(t => t.name).join(', '));
}

if (toKari.length > 0) {
  const ids = toKari.map(t => t.id);
  const placeholders = ids.map(() => '?').join(',');
  await conn.execute(
    `UPDATE project_tasks SET assignedTeamMemberId = ? WHERE id IN (${placeholders})`,
    [TEAM.KARI, ...ids]
  );
  console.log(`  Reassigned ${toKari.length} tasks to Kari`);
}

// Final distribution
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
