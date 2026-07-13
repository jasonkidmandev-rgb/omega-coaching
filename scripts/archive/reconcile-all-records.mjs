import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== RECONCILING ALL RECORDS ===\n');

// --- STEP 1: Merge duplicate client_projects ---
// Strategy: Keep the project with the highest lifecycle stage (most advanced), or the most recently created.
// Archive the duplicate(s) by setting status = 'archived'.

const duplicateProjects = [
  // [clientName, keepProjectId, archiveProjectIds, reason]
  ['Brian Riseland', 60011, [240005], 'Keep active stage 7, archive on_hold stage 1'],
  ['Doug Harris', 60010, [240026], 'Keep active stage 7, archive on_hold stage 1'],
  ['Erling LaSalle', 420003, [390001], 'Keep #420003 (newer, same stage 3), archive #390001'],
  ['Hayden Durrett', 60016, [330005], 'Keep active stage 7, archive on_hold stage 7'],
  ['Jefferi Schmidlkofer', 360001, [480006], 'Keep #360001 (original), archive #480006 (duplicate)'],
  ['Kellie Alford', 240012, [240016], 'Keep #240012, archive #240016 (both on_hold)'],
  ['Kevin Reid', 120001, [240006, 240017], 'Keep #120001 (original), archive others'],
  ['Liam Durrett', 60017, [330004], 'Keep #60017 (original active stage 7), archive #330004'],
  ['Mary Lou Viola', 60014, [240004], 'Keep active stage 7, archive on_hold stage 1'],
  ['Richard Feyh', 300001, [240023], 'Keep #300001 (stage 7), archive #240023 (stage 3)'],
  ['Shannon Randall', 480005, [420002], 'Keep #480005 (newer), archive #420002'],
  ['Susan Ham', 420004, [390002], 'Keep #420004 (newer), archive #390002'],
  ['denise leopoldino', 420001, [420005], 'Keep #420001 (original), archive #420005'],
];

console.log('STEP 1: Merging duplicate client_projects...');
for (const [name, keepId, archiveIds, reason] of duplicateProjects) {
  for (const archiveId of archiveIds) {
    // First check if there are tasks on the archive project — transfer them if the keep project has none
    const [keepTasks] = await conn.execute('SELECT COUNT(*) as cnt FROM project_tasks WHERE clientProjectId = ?', [keepId]);
    const [archiveTasks] = await conn.execute('SELECT COUNT(*) as cnt FROM project_tasks WHERE clientProjectId = ?', [archiveId]);
    
    if (keepTasks[0].cnt === 0 && archiveTasks[0].cnt > 0) {
      // Transfer tasks from archive to keep
      await conn.execute('UPDATE project_tasks SET clientProjectId = ? WHERE clientProjectId = ?', [keepId, archiveId]);
      console.log(`  ${name}: Transferred ${archiveTasks[0].cnt} tasks from #${archiveId} → #${keepId}`);
    }
    
    // Archive the duplicate
    await conn.execute('UPDATE client_projects SET status = ? WHERE id = ?', ['cancelled', archiveId]);
    console.log(`  ${name}: Archived project #${archiveId} (keeping #${keepId}) — ${reason}`);
  }
}

// Clean up test projects
console.log('\nSTEP 1b: Archiving test projects...');
const [testProjects] = await conn.execute(
  "SELECT id, clientName FROM client_projects WHERE clientName IN ('Test', 'Test Client', 'Lisa - TEST', 'Vee Test', 'Jason Kidman Test3', 'jason test21', 'Jason Test7') AND status != 'archived'"
);
for (const tp of testProjects) {
  await conn.execute('UPDATE client_projects SET status = ? WHERE id = ?', ['cancelled', tp.id]);
  console.log(`  Archived test project: ${tp.clientName} (#${tp.id})`);
}

// --- STEP 2: Link unlinked prospects to their client records ---
console.log('\nSTEP 2: Linking unlinked prospects to client records...');
const [unlinkedProspects] = await conn.execute('SELECT id, name, email, phone FROM prospects WHERE clientId IS NULL');
const [allClients] = await conn.execute('SELECT id, name, email, phone FROM clients');

for (const prospect of unlinkedProspects) {
  // Try to match by email first
  let matchedClient = null;
  if (prospect.email && prospect.email !== 'no-email') {
    matchedClient = allClients.find(c => c.email?.toLowerCase() === prospect.email?.toLowerCase());
  }
  // Then try by name
  if (!matchedClient && prospect.name) {
    matchedClient = allClients.find(c => c.name?.toLowerCase().trim() === prospect.name?.toLowerCase().trim());
  }
  
  if (matchedClient) {
    await conn.execute('UPDATE prospects SET clientId = ? WHERE id = ?', [matchedClient.id, prospect.id]);
    console.log(`  Linked prospect "${prospect.name}" (#${prospect.id}) → client #${matchedClient.id}`);
  } else {
    console.log(`  No client match for prospect "${prospect.name}" (${prospect.email}) — prospect-only record (masterclass viewer)`);
  }
}

// --- STEP 3: Verify final state ---
console.log('\n=== FINAL VERIFICATION ===');

const [activeProjects] = await conn.execute("SELECT clientName, COUNT(*) as cnt FROM client_projects WHERE status NOT IN ('cancelled') GROUP BY clientName HAVING cnt > 1");
console.log(`\nClients with multiple ACTIVE projects: ${activeProjects.length}`);
activeProjects.forEach(p => console.log(`  - ${p.clientName}: ${p.cnt} projects`));

const [totalActive] = await conn.execute("SELECT COUNT(*) as cnt FROM client_projects WHERE status NOT IN ('cancelled')");
const [totalArchived] = await conn.execute("SELECT COUNT(*) as cnt FROM client_projects WHERE status = 'cancelled'");
console.log(`\nActive projects: ${totalActive[0].cnt}`);
console.log(`Archived projects: ${totalArchived[0].cnt}`);

const [linkedProspects] = await conn.execute('SELECT COUNT(*) as cnt FROM prospects WHERE clientId IS NOT NULL');
const [unlinkedLeft] = await conn.execute('SELECT COUNT(*) as cnt FROM prospects WHERE clientId IS NULL');
console.log(`\nProspects linked to clients: ${linkedProspects[0].cnt}`);
console.log(`Prospects without client link: ${unlinkedLeft[0].cnt} (masterclass-only viewers)`);

const [prospectCount] = await conn.execute('SELECT COUNT(*) as cnt FROM prospects');
const [clientCount] = await conn.execute('SELECT COUNT(*) as cnt FROM clients');
console.log(`\nTotal prospects: ${prospectCount[0].cnt}`);
console.log(`Total clients: ${clientCount[0].cnt}`);

await conn.end();
console.log('\nDone!');
