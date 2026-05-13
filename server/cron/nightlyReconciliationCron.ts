import cron from "node-cron";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Nightly Reconciliation Cron
 * Runs every night at 2:00 AM to:
 * 1. Reconcile lifecycle stages on all projects
 * 2. Scan for duplicate prospects and flag them
 * 3. Link unlinked prospects to client records
 * 4. Assign unassigned prospects to Shannon
 * 5. Reactivate on_hold projects that have paid enrollments
 */

const SHANNON_TEAM_ID = 30001;
const LIFECYCLE_STAGES: Record<string, number> = {
  intake: 1,
  consultation: 2,
  protocol_build: 3,
  onboarding: 4,
  active_coaching: 5,
  mid_review: 6,
  completion: 7,
};

export function startNightlyReconciliationCron() {
  // Run at 2:00 AM every day
  cron.schedule("0 2 * * *", async () => {
    console.log("[NightlyReconciliation] Starting nightly reconciliation...");
    await runNightlyReconciliation();
  });
  console.log("[NightlyReconciliation] Cron scheduled for 2:00 AM daily");
}

export async function runNightlyReconciliation(): Promise<{
  projectsReconciled: number;
  duplicatesFound: number;
  prospectsLinked: number;
  prospectsAssigned: number;
  projectsReactivated: number;
}> {
  const database = await getDb();
  if (!database) {
    console.error("[NightlyReconciliation] Database not available");
    return { projectsReconciled: 0, duplicatesFound: 0, prospectsLinked: 0, prospectsAssigned: 0, projectsReactivated: 0 };
  }

  let projectsReconciled = 0;
  let duplicatesFound = 0;
  let prospectsLinked = 0;
  let prospectsAssigned = 0;
  let projectsReactivated = 0;

  try {
    // === 1. RECONCILE LIFECYCLE STAGES ===
    console.log("[NightlyReconciliation] Step 1: Reconciling lifecycle stages...");
    
    // Find projects stuck at wrong stages
    // Projects with paid enrollments should be at least at stage 3 (protocol_build)
    const stuckProjects = await database.execute(sql`
      SELECT cp.id, cp.clientName, cp.status, cp.currentLifecycleStageId,
             te.tier, te.status as enrollStatus, te.coachingFeePaid
      FROM client_projects cp
      JOIN clients c ON c.name = cp.clientName
      JOIN transformation_enrollments te ON te.clientId = c.id
      WHERE cp.status != 'cancelled'
        AND te.coachingFeePaid = 1
        AND (cp.currentLifecycleStageId IS NULL OR cp.currentLifecycleStageId < 3)
    `);

    for (const project of stuckProjects as any[]) {
      await database.execute(sql`
        UPDATE client_projects 
        SET currentLifecycleStageId = 3, status = 'active', updatedAt = NOW()
        WHERE id = ${project.id}
      `);
      projectsReconciled++;
      console.log(`[NightlyReconciliation] Advanced ${project.clientName} project #${project.id} to stage 3`);
    }

    // Assign Lisa to unassigned active projects
    const unassignedProjects = await database.execute(sql`
      SELECT id, clientName FROM client_projects 
      WHERE status = 'active' AND assignedTeamMemberId IS NULL
    `);
    
    for (const project of unassignedProjects as any[]) {
      await database.execute(sql`
        UPDATE client_projects SET assignedTeamMemberId = 1, updatedAt = NOW()
        WHERE id = ${project.id}
      `);
      projectsReconciled++;
      console.log(`[NightlyReconciliation] Assigned Lisa to project #${project.id} (${project.clientName})`);
    }

    // === 2. REACTIVATE ON_HOLD PROJECTS WITH PAID ENROLLMENTS ===
    console.log("[NightlyReconciliation] Step 2: Reactivating on_hold projects with paid enrollments...");
    
    const onHoldPaid = await database.execute(sql`
      SELECT cp.id, cp.clientName
      FROM client_projects cp
      JOIN clients c ON c.name = cp.clientName
      JOIN transformation_enrollments te ON te.clientId = c.id
      WHERE cp.status = 'on_hold' AND te.coachingFeePaid = 1
    `);

    for (const project of onHoldPaid as any[]) {
      await database.execute(sql`
        UPDATE client_projects SET status = 'active', updatedAt = NOW()
        WHERE id = ${project.id}
      `);
      projectsReactivated++;
      console.log(`[NightlyReconciliation] Reactivated project #${project.id} (${project.clientName})`);
    }

    // === 3. LINK UNLINKED PROSPECTS ===
    console.log("[NightlyReconciliation] Step 3: Linking unlinked prospects to clients...");
    
    const unlinkedProspects = await database.execute(sql`
      SELECT p.id, p.name, p.email, c.id as matchedClientId
      FROM prospects p
      JOIN clients c ON (
        (p.email IS NOT NULL AND p.email != '' AND LOWER(p.email) = LOWER(c.email))
        OR LOWER(p.name) = LOWER(c.name)
      )
      WHERE p.clientId IS NULL
    `);

    for (const prospect of unlinkedProspects as any[]) {
      await database.execute(sql`
        UPDATE prospects SET clientId = ${prospect.matchedClientId}, updatedAt = NOW()
        WHERE id = ${prospect.id}
      `);
      prospectsLinked++;
      console.log(`[NightlyReconciliation] Linked prospect #${prospect.id} (${prospect.name}) to client #${prospect.matchedClientId}`);
    }

    // === 4. ASSIGN UNASSIGNED PROSPECTS TO SHANNON ===
    console.log("[NightlyReconciliation] Step 4: Assigning unassigned prospects to Shannon...");
    
    const [assignResult] = await database.execute(sql`
      UPDATE prospects SET assignedTo = ${SHANNON_TEAM_ID}, updatedAt = NOW()
      WHERE assignedTo IS NULL
    `);
    prospectsAssigned = (assignResult as any).affectedRows || 0;
    if (prospectsAssigned > 0) {
      console.log(`[NightlyReconciliation] Assigned ${prospectsAssigned} prospects to Shannon`);
    }

    // === 5. SCAN FOR DUPLICATE PROSPECTS ===
    console.log("[NightlyReconciliation] Step 5: Scanning for duplicate prospects...");
    
    // Check for email duplicates
    const emailDupes = await database.execute(sql`
      SELECT email, COUNT(*) as cnt FROM prospects 
      WHERE email IS NOT NULL AND email != '' AND email != 'no-email'
      GROUP BY LOWER(email) HAVING cnt > 1
    `);
    duplicatesFound += (emailDupes as any[]).length;

    // Check for phone duplicates
    const phoneDupes = await database.execute(sql`
      SELECT phone, COUNT(*) as cnt FROM prospects 
      WHERE phone != 'not-provided' AND phone != 'N/A' AND phone != ''
      GROUP BY phone HAVING cnt > 1
    `);
    duplicatesFound += (phoneDupes as any[]).length;

    if (duplicatesFound > 0) {
      console.log(`[NightlyReconciliation] Found ${duplicatesFound} potential duplicate groups — flagged for admin review`);
      // Create a notification for the admin
      try {
        await database.execute(sql`
          INSERT INTO notifications (userId, type, title, message, createdAt)
          SELECT u.id, 'system', 'Duplicate Prospects Detected', 
            ${`Nightly scan found ${duplicatesFound} potential duplicate prospect groups. Use the Duplicate Scanner on the Lead Pipeline page to review and merge.`},
            NOW()
          FROM users u WHERE u.name LIKE '%Jason%' LIMIT 1
        `);
      } catch (e) { /* best effort */ }
    }

    console.log(`[NightlyReconciliation] Complete: ${projectsReconciled} projects reconciled, ${projectsReactivated} reactivated, ${prospectsLinked} prospects linked, ${prospectsAssigned} assigned, ${duplicatesFound} duplicate groups found`);

  } catch (error) {
    console.error("[NightlyReconciliation] Error during reconciliation:", error);
  }

  return { projectsReconciled, duplicatesFound, prospectsLinked, prospectsAssigned, projectsReactivated };
}
