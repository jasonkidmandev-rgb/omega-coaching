/**
 * Stalled Client Detector Cron
 * 
 * Runs daily at 8 AM to detect clients stuck in onboarding for more than 48 hours
 * with no task progress. Creates notifications for the admin team and assigned
 * team members so they can intervene before clients notice delays.
 */
import cron from "node-cron";
import * as db from "../db";

interface StalledClient {
  projectId: number;
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientId: number | null;
  createdAt: Date;
  hoursStalled: number;
  totalTasks: number;
  completedTasks: number;
  assignedTeamMember: string | null;
  assignedTeamMemberId: number | null;
}

/**
 * Detect clients whose projects have been stalled for more than the threshold
 */
export async function detectStalledClients(thresholdHours: number = 48): Promise<StalledClient[]> {
  const database = await db.getDb();
  if (!database) {
    console.error("[StalledClientCron] Database not available");
    return [];
  }

  try {
    const { sql } = await import("drizzle-orm");
    
    // Find projects created more than thresholdHours ago where:
    // 1. Project status is 'active' or 'in_progress'
    // 2. No tasks have been completed since project creation
    // 3. OR the last task completion was more than thresholdHours ago
    const results = await database.execute(sql`
      SELECT 
        cp.id as projectId,
        cp.clientName as projectName,
        cp.clientProtocolId,
        cp.createdAt,
        cp.assignedTeamMemberId,
        cp.clientName as clientName,
        cp.clientEmail as clientEmail,
        tm.name as teamMemberName,
        TIMESTAMPDIFF(HOUR, cp.createdAt, NOW()) as hoursSinceCreation,
        (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id) as totalTasks,
        (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed') as completedTasks,
        (SELECT MAX(pt.completedAt) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed') as lastCompletedAt
      FROM client_projects cp
      LEFT JOIN team_members tm ON cp.assignedTeamMemberId = tm.id
      WHERE cp.status IN ('active', 'in_progress')
        AND cp.createdAt < DATE_SUB(NOW(), INTERVAL ${thresholdHours} HOUR)
        AND (
          -- No tasks completed at all
          (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed') = 0
          OR
          -- Last task completion was more than thresholdHours ago AND not all tasks are done
          (
            (SELECT MAX(pt.completedAt) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed') < DATE_SUB(NOW(), INTERVAL ${thresholdHours} HOUR)
            AND (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status != 'completed') > 0
          )
        )
      ORDER BY hoursSinceCreation DESC
      LIMIT 50
    `);

    const rows = (results as any)?.[0] || results;
    if (!Array.isArray(rows)) return [];

    return rows.map((row: any) => ({
      projectId: row.projectId,
      projectName: row.projectName || 'Unnamed Project',
      clientName: row.clientName || 'Unknown Client',
      clientEmail: row.clientEmail || '',
      clientId: row.clientProtocolId || null,
      createdAt: new Date(row.createdAt),
      hoursStalled: Number(row.hoursSinceCreation) || 0,
      totalTasks: Number(row.totalTasks) || 0,
      completedTasks: Number(row.completedTasks) || 0,
      assignedTeamMember: row.teamMemberName || null,
      assignedTeamMemberId: row.assignedTeamMemberId || null,
    }));
  } catch (error) {
    console.error("[StalledClientCron] Error detecting stalled clients:", error);
    return [];
  }
}

/**
 * Send notifications for stalled clients
 */
async function notifyStalledClients(stalledClients: StalledClient[]): Promise<number> {
  if (stalledClients.length === 0) return 0;

  const database = await db.getDb();
  if (!database) return 0;

  let notificationsSent = 0;

  try {
    const { teamNotifications } = await import("../../drizzle/schema");

    for (const client of stalledClients) {
      const daysStalled = Math.floor(client.hoursStalled / 24);
      const progressPct = client.totalTasks > 0 
        ? Math.round((client.completedTasks / client.totalTasks) * 100) 
        : 0;

      // Create admin notification
      await db.createNotificationsForEnabledUsers(
        'onboarding_automation',
        `⚠️ Stalled Onboarding: ${client.clientName}`,
        `${client.clientName}'s project "${client.projectName}" has been stalled for ${daysStalled} day(s). ` +
        `Progress: ${client.completedTasks}/${client.totalTasks} tasks (${progressPct}%). ` +
        (client.assignedTeamMember ? `Assigned to: ${client.assignedTeamMember}. ` : 'No team member assigned. ') +
        `Please check in and resolve any blockers.`,
        null
      );
      notificationsSent++;

      // If a team member is assigned, also notify them directly
      if (client.assignedTeamMemberId) {
        try {
          await database.insert(teamNotifications).values({
            teamMemberId: client.assignedTeamMemberId,
            type: 'task_overdue',
            title: `Stalled: ${client.clientName}'s onboarding`,
            message: `${client.clientName}'s project has been stalled for ${daysStalled} day(s) with ${client.completedTasks}/${client.totalTasks} tasks completed. Please check for blockers and update task progress.`,
            clientProjectId: client.projectId,
          });
          notificationsSent++;
        } catch (teamError) {
          console.error(`[StalledClientCron] Failed to notify team member ${client.assignedTeamMemberId}:`, teamError);
        }
      }
    }

    // Log automation event
    try {
      const { automationEvents } = await import("../../drizzle/schema");
      await database.insert(automationEvents).values({
        eventType: 'stalled_client_check',
        entityType: 'system',
        entityId: 0,
        status: 'completed',
        details: JSON.stringify({
          stalledCount: stalledClients.length,
          notificationsSent,
          clients: stalledClients.map(c => ({
            name: c.clientName,
            projectId: c.projectId,
            hoursStalled: c.hoursStalled,
            progress: `${c.completedTasks}/${c.totalTasks}`,
          })),
        }),
      });
    } catch (logError) {
      console.error("[StalledClientCron] Failed to log automation event:", logError);
    }

  } catch (error) {
    console.error("[StalledClientCron] Error sending notifications:", error);
  }

  return notificationsSent;
}

/**
 * Auto-escalate to Jason for clients stalled 72+ hours
 * Creates a priority notification that stands out from regular stalled alerts
 */
async function escalateToJason(criticalClients: StalledClient[]): Promise<number> {
  if (criticalClients.length === 0) return 0;

  const database = await db.getDb();
  if (!database) return 0;

  let escalated = 0;

  try {
    for (const client of criticalClients) {
      const daysStalled = Math.floor(client.hoursStalled / 24);
      const progressPct = client.totalTasks > 0
        ? Math.round((client.completedTasks / client.totalTasks) * 100)
        : 0;

      // Priority notification to admin (Jason)
      await db.createNotificationsForEnabledUsers(
        'onboarding_automation',
        `🚨 ESCALATION: ${client.clientName} stalled ${daysStalled}+ days`,
        `PRIORITY ESCALATION: ${client.clientName}'s onboarding has been stalled for ${daysStalled} day(s) with only ${progressPct}% progress (${client.completedTasks}/${client.totalTasks} tasks). ` +
        (client.assignedTeamMember ? `Currently assigned to ${client.assignedTeamMember}. ` : 'No team member assigned. ') +
        `This client needs immediate attention to prevent churn. Please intervene directly.`,
        null
      );
      escalated++;
    }

    // Log escalation event
    try {
      const { automationEvents } = await import("../../drizzle/schema");
      await database.insert(automationEvents).values({
        eventType: 'stalled_client_escalation',
        entityType: 'system',
        entityId: 0,
        status: 'completed',
        details: JSON.stringify({
          escalatedCount: criticalClients.length,
          clients: criticalClients.map(c => ({
            name: c.clientName,
            projectId: c.projectId,
            hoursStalled: c.hoursStalled,
            daysStalled: Math.floor(c.hoursStalled / 24),
            progress: `${c.completedTasks}/${c.totalTasks}`,
          })),
        }),
      });
    } catch (logError) {
      console.error("[StalledClientCron] Failed to log escalation event:", logError);
    }
  } catch (error) {
    console.error("[StalledClientCron] Error escalating to Jason:", error);
  }

  return escalated;
}

/**
 * Main cron handler - runs the stalled client detection, notification, and escalation
 */
export async function runStalledClientCheck(): Promise<{
  stalledCount: number;
  notificationsSent: number;
  escalatedCount: number;
  clients: StalledClient[];
}> {
  console.log("[StalledClientCron] Running stalled client check...");
  
  const stalledClients = await detectStalledClients(48);
  
  if (stalledClients.length === 0) {
    console.log("[StalledClientCron] No stalled clients detected.");
    return { stalledCount: 0, notificationsSent: 0, escalatedCount: 0, clients: [] };
  }

  console.log(`[StalledClientCron] Found ${stalledClients.length} stalled client(s):`);
  for (const client of stalledClients) {
    console.log(`  - ${client.clientName}: ${Math.floor(client.hoursStalled / 24)}d stalled, ${client.completedTasks}/${client.totalTasks} tasks done`);
  }

  const notificationsSent = await notifyStalledClients(stalledClients);
  
  // Auto-escalate to Jason for clients stalled 72+ hours
  const criticalClients = stalledClients.filter(c => c.hoursStalled >= 72);
  let escalatedCount = 0;
  if (criticalClients.length > 0) {
    console.log(`[StalledClientCron] 🚨 ${criticalClients.length} client(s) stalled 72+ hours - escalating to Jason`);
    escalatedCount = await escalateToJason(criticalClients);
    console.log(`[StalledClientCron] Escalated ${escalatedCount} client(s) to Jason.`);
  }
  
  console.log(`[StalledClientCron] Sent ${notificationsSent} notification(s), escalated ${escalatedCount}.`);
  
  return { stalledCount: stalledClients.length, notificationsSent, escalatedCount, clients: stalledClients };
}

/**
 * Initialize the stalled client detector cron job
 * Runs daily at 8:00 AM
 */
export function initStalledClientCron(): void {
  // Run daily at 8:00 AM
  cron.schedule("0 8 * * *", async () => {
    try {
      await runStalledClientCheck();
    } catch (error) {
      console.error("[StalledClientCron] Cron job failed:", error);
    }
  });
  
  console.log("[StalledClientCron] Initialized - runs daily at 8:00 AM");
}
