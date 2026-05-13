import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Check Denise's project tasks
console.log("=== DENISE'S PROJECTS ===");
const [deniseProjects] = await conn.execute(
  `SELECT cp.id as project_id, cp.clientProtocolId, cp.status, cp.workflowTemplateId,
          cp.clientName, cp.clientEmail
   FROM client_projects cp
   WHERE cp.clientName LIKE '%Denise%'`
);
console.log(JSON.stringify(deniseProjects, null, 2));

// 2. Check tasks for Denise's projects
for (const proj of deniseProjects) {
  console.log(`\n=== TASKS FOR PROJECT ${proj.project_id} (${proj.clientName}) ===`);
  const [tasks] = await conn.execute(
    `SELECT pt.id, pt.name, pt.status, pt.createdAt, ls.name as stageName
     FROM project_tasks pt
     LEFT JOIN lifecycle_stages ls ON pt.lifecycleStageId = ls.id
     WHERE pt.clientProjectId = ? ORDER BY ls.name, pt.name, pt.createdAt`,
    [proj.project_id]
  );
  console.log(`Total tasks: ${tasks.length}`);
  const byName = {};
  for (const t of tasks) {
    const key = `${t.stageName}:${t.name}`;
    if (!byName[key]) byName[key] = [];
    byName[key].push({ id: t.id, status: t.status, createdAt: t.createdAt });
  }
  for (const [key, items] of Object.entries(byName)) {
    if (items.length > 1) {
      console.log(`  DUP: ${key} (${items.length}x)`);
      items.forEach(i => console.log(`    id=${i.id} status=${i.status} created=${i.createdAt}`));
    }
  }
}

// 3. Check ALL projects for duplicate task names
console.log("\n=== ALL PROJECTS WITH DUPLICATE TASK NAMES ===");
const [dupProjects] = await conn.execute(
  `SELECT pt.clientProjectId, COUNT(*) as dup_count, pt.name, pt.lifecycleStageId
   FROM project_tasks pt
   GROUP BY pt.clientProjectId, pt.name, pt.lifecycleStageId
   HAVING COUNT(*) > 1
   ORDER BY dup_count DESC`
);
console.log(`Found ${dupProjects.length} duplicate task groups`);

// 4. Get unique project IDs affected
const affectedProjectIds = [...new Set(dupProjects.map(d => d.clientProjectId))];
console.log(`Affected projects: ${affectedProjectIds.length}`);

for (const pid of affectedProjectIds) {
  const [info] = await conn.execute(
    `SELECT cp.clientName FROM client_projects cp WHERE cp.id = ?`, [pid]
  );
  const name = info[0]?.clientName || 'Unknown';
  const dups = dupProjects.filter(d => d.clientProjectId === pid);
  console.log(`  Project ${pid} (${name}): ${dups.length} dup groups, tasks: ${dups.map(d => d.name).join(', ')}`);
}

// 5. Check Steve Schmidt - should NOT have duplicates
console.log("\n=== STEVE SCHMIDT CHECK ===");
const [steveProjects] = await conn.execute(
  `SELECT cp.id as project_id, cp.clientProtocolId, cp.status, cp.workflowTemplateId
   FROM client_projects cp
   WHERE cp.clientName LIKE '%Steve%'`
);
for (const proj of steveProjects) {
  const [tasks] = await conn.execute(
    `SELECT id, name, status FROM project_tasks WHERE clientProjectId = ? ORDER BY name`,
    [proj.project_id]
  );
  console.log(`Steve project ${proj.project_id}: ${tasks.length} tasks`);
  const names = tasks.map(t => t.name);
  const dups = names.filter((n, i) => names.indexOf(n) !== i);
  console.log(`  Duplicates: ${dups.length > 0 ? dups.join(', ') : 'NONE'}`);
}

// 6. Check subtasks table
console.log("\n=== SUBTASKS TABLE CHECK ===");
const [subtaskCols] = await conn.execute("SHOW TABLES LIKE '%subtask%'");
console.log("Subtask tables:", subtaskCols);
const [stCols] = await conn.execute("DESCRIBE project_task_subtasks");
console.log("project_task_subtasks columns:", stCols.map(c => c.Field).join(', '));

await conn.end();
