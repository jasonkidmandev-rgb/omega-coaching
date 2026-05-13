/**
 * Post-Discovery Follow-Up Cron for Shannon
 * 
 * Runs every 6 hours to detect prospects/enrollments where:
 * 1. Discovery session was completed but client hasn't signed up (paid) within 48 hours
 * 2. Creates a follow-up task assigned to Shannon
 * 3. Sends Shannon a team notification
 * 
 * This closes the gap where Shannon had no way of knowing who needed follow-up
 * after Jason's discovery sessions.
 */
import { getDb } from "../db";
import * as db from "../db";
import { sql } from "drizzle-orm";
import { projectTasks, clientProjects, teamNotifications } from "../../drizzle/schema";

const TEAM_SHANNON = 30001;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // Every 6 hours
const DISCOVERY_FOLLOWUP_HOURS = 48; // Follow up if no payment within 48 hours

let cronInterval: ReturnType<typeof setInterval> | null = null;

interface UnconvertedDiscovery {
  enrollmentId: number;
  clientName: string;
  email: string;
  phone: string | null;
  tier: string;
  discoveryCompletedAt: string;
  hoursSinceDiscovery: number;
  clientProjectId: number | null;
}

export function initPostDiscoveryFollowUpCron() {
  console.log("[PostDiscoveryFollowUp] Initialized, running every 6 hours");
  // Run after 2 minutes, then every 6 hours
  setTimeout(() => runPostDiscoveryCheck(), 120000);
  cronInterval = setInterval(() => runPostDiscoveryCheck(), CHECK_INTERVAL_MS);
}

export async function runPostDiscoveryCheck(): Promise<{ found: number; tasksCreated: number }> {
  console.log("[PostDiscoveryFollowUp] Checking for unconverted discovery sessions...");
  
  const database = await getDb();
  if (!database) {
    console.error("[PostDiscoveryFollowUp] Database not available");
    return { found: 0, tasksCreated: 0 };
  }

  try {
    // Find enrollments where:
    // - Discovery session is completed
    // - Coaching fee NOT paid (client hasn't signed up)
    // - Discovery was completed more than 48 hours ago
    // - No existing follow-up task has been created for this (check automation_events)
    const result = await database.execute(sql`
      SELECT 
        te.id as enrollmentId,
        te.clientName,
        te.email,
        te.phone,
        te.tier,
        te.discoverySessionCompletedAt,
        TIMESTAMPDIFF(HOUR, te.discoverySessionCompletedAt, NOW()) as hoursSinceDiscovery,
        cp.id as clientProjectId
      FROM transformation_enrollments te
      LEFT JOIN client_projects cp ON cp.clientProtocolId = te.clientProtocolId
      WHERE te.discoverySessionCompletedAt IS NOT NULL
        AND te.coachingFeePaid = 0
        AND te.discoverySessionCompletedAt <= DATE_SUB(NOW(), INTERVAL ${DISCOVERY_FOLLOWUP_HOURS} HOUR)
        AND te.status IN ('discovery_complete', 'enrolled', 'watching_videos', 'video_complete')
        AND NOT EXISTS (
          SELECT 1 FROM automation_events ae 
          WHERE ae.enrollmentId = te.id 
          AND ae.eventType = 'post_discovery_followup_task_created'
        )
      ORDER BY te.discoverySessionCompletedAt ASC
      LIMIT 20
    `);

    const rows = ((result as any)?.[0] || result) as UnconvertedDiscovery[];
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("[PostDiscoveryFollowUp] No unconverted discovery sessions found");
      return { found: 0, tasksCreated: 0 };
    }

    console.log(`[PostDiscoveryFollowUp] Found ${rows.length} unconverted discovery sessions`);
    let tasksCreated = 0;

    for (const row of rows) {
      try {
        const daysSince = Math.round(row.hoursSinceDiscovery / 24);
        
        // If there's a client project, create a task on it
        if (row.clientProjectId) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow

          const taskId = await db.createProjectTask({
            clientProjectId: row.clientProjectId,
            lifecycleStageId: 2, // Consult stage
            name: `Follow up with ${row.clientName} — discovery complete, not yet enrolled`,
            description: `${row.clientName} completed their discovery session ${daysSince} day(s) ago but has NOT paid their coaching fee yet.\n\n` +
              `Email: ${row.email || 'N/A'}\n` +
              `Phone: ${row.phone || 'N/A'}\n` +
              `Program: ${row.tier}\n\n` +
              `Please reach out to see if they have questions or need help completing enrollment.`,
            assignedTeamMemberId: TEAM_SHANNON,
            dueDate,
            sortOrder: 10, // High priority
            isRequired: true,
          });

          // Notify Shannon
          await db.notifyTaskAssignment(
            taskId,
            TEAM_SHANNON,
            `Follow up with ${row.clientName} — discovery complete, not yet enrolled`,
            row.clientProjectId
          );
          tasksCreated++;
        }

        // Also create a team notification regardless
        await db.createTeamNotification({
          teamMemberId: TEAM_SHANNON,
          type: "task_assigned",
          title: `Follow-Up Needed: ${row.clientName}`,
          message: `${row.clientName} completed their discovery session ${daysSince} day(s) ago but hasn't enrolled yet. ` +
            `Email: ${row.email || 'N/A'} | Phone: ${row.phone || 'N/A'} | Program: ${row.tier}`,
          clientProjectId: row.clientProjectId || undefined,
        });

        // Log automation event to prevent duplicate tasks
        await database.execute(sql`
          INSERT INTO automation_events (eventType, enrollmentId, details, status, triggeredBy, createdAt)
          VALUES (
            'post_discovery_followup_task_created',
            ${row.enrollmentId},
            ${JSON.stringify({
              clientName: row.clientName,
              email: row.email,
              daysSinceDiscovery: daysSince,
              taskCreated: !!row.clientProjectId,
            })},
            'success',
            'system',
            NOW()
          )
        `);

        console.log(`[PostDiscoveryFollowUp] Created follow-up for ${row.clientName} (${daysSince}d since discovery)`);
      } catch (err) {
        console.error(`[PostDiscoveryFollowUp] Error processing ${row.clientName}:`, err);
      }
    }

    // Also notify admin about the batch
    if (rows.length > 0) {
      try {
        await db.createNotificationsForEnabledUsers(
          "onboarding_automation",
          `${rows.length} Post-Discovery Follow-Up(s) Needed`,
          `${rows.length} client(s) completed discovery sessions but haven't enrolled yet. ` +
          `Follow-up tasks have been assigned to Shannon.\n\n` +
          rows.map(r => `• ${r.clientName} — ${Math.round(r.hoursSinceDiscovery / 24)}d since discovery`).join('\n'),
        );
      } catch (err) {
        console.error("[PostDiscoveryFollowUp] Failed to create admin notification:", err);
      }
    }

    return { found: rows.length, tasksCreated };
  } catch (error) {
    console.error("[PostDiscoveryFollowUp] Error:", error);
    return { found: 0, tasksCreated: 0 };
  }
}
