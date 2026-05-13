import { getDb } from '../server/db.js';
import { clientProtocols, clientProjects, projectTasks } from '../drizzle/schema.js';
import { eq, like, or } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB'); process.exit(1); }

  // Find Erling's client protocol(s)
  const clients = await db.select().from(clientProtocols).where(
    or(like(clientProtocols.versionName, '%Erling%'), like(clientProtocols.clientName, '%Erling%'))
  );
  console.log('=== Erling Client Protocols ===');
  for (const c of clients) {
    console.log(JSON.stringify({
      id: c.id,
      clientName: c.clientName,
      versionName: c.versionName,
      status: c.status,
      projectId: c.projectId,
      durationMonths: c.durationMonths,
      email: c.clientEmail,
    }, null, 2));
  }

  // Find Erling's projects
  const projects = await db.select().from(clientProjects).where(like(clientProjects.clientName, '%Erling%'));
  console.log('\n=== Erling Projects ===');
  for (const p of projects) {
    console.log(JSON.stringify({
      id: p.id,
      clientName: p.clientName,
      status: p.status,
      workflowTemplateId: p.workflowTemplateId,
      protocolId: p.protocolId,
      createdAt: p.createdAt,
    }, null, 2));
  }

  // Get task counts for each project
  for (const p of projects) {
    const tasks = await db.select().from(projectTasks).where(eq(projectTasks.projectId, p.id));
    console.log(`\nProject ${p.id} tasks: ${tasks.length}`);
    for (const t of tasks) {
      console.log(`  - [${t.status}] ${t.title} (assigned: ${t.assignedToUserId})`);
    }
  }

  process.exit(0);
}

main().catch(console.error);
