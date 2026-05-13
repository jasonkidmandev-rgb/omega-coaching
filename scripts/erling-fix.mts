import { getDb } from '../server/db.js';
import { clientProtocols, clientProjects } from '../drizzle/schema.js';
import { eq, isNull, sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB'); process.exit(1); }

  // 1. Link Erling's protocol (1230001) to his project (420003)
  console.log('=== Linking Erling protocol 1230001 to project 420003 ===');
  await db.update(clientProtocols)
    .set({ projectId: 420003 })
    .where(eq(clientProtocols.id, 1230001));
  console.log('Done!');

  // 2. Verify
  const [erling] = await db.select({ id: clientProtocols.id, projectId: clientProtocols.projectId, clientName: clientProtocols.clientName })
    .from(clientProtocols)
    .where(eq(clientProtocols.id, 1230001));
  console.log('Verified:', JSON.stringify(erling));

  // 3. Check for other protocols with null projectId that have active projects
  console.log('\n=== Other protocols with null projectId ===');
  const unlinked = await db.select({
    id: clientProtocols.id,
    clientName: clientProtocols.clientName,
    status: clientProtocols.status,
    projectId: clientProtocols.projectId,
  }).from(clientProtocols)
    .where(isNull(clientProtocols.projectId));
  
  console.log(`Found ${unlinked.length} protocols with null projectId`);
  for (const u of unlinked.slice(0, 20)) {
    console.log(`  - [${u.id}] ${u.clientName} (status: ${u.status})`);
  }

  // 4. Check if any of these unlinked protocols have matching projects by clientName
  console.log('\n=== Checking for matching projects ===');
  for (const u of unlinked) {
    if (u.status === 'active' || u.status === 'draft') {
      const matchingProjects = await db.select({
        id: clientProjects.id,
        clientName: clientProjects.clientName,
        status: clientProjects.status,
        protocolId: clientProjects.protocolId,
      }).from(clientProjects)
        .where(eq(clientProjects.clientName, u.clientName!));
      
      if (matchingProjects.length > 0) {
        console.log(`  Protocol ${u.id} (${u.clientName}) has ${matchingProjects.length} matching project(s):`);
        for (const mp of matchingProjects) {
          console.log(`    - Project ${mp.id} (status: ${mp.status}, protocolId: ${mp.protocolId})`);
        }
      }
    }
  }

  process.exit(0);
}

main().catch(console.error);
