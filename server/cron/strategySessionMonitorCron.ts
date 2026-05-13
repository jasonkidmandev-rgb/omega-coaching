/**
 * Strategy Session Scheduling Monitor Cron
 * 
 * Runs every 6 hours to detect clients who:
 * 1. Have paid their coaching fee (enrolled)
 * 2. But haven't scheduled their strategy/discovery session within 48 hours
 * 3. Creates a follow-up task assigned to Shannon to schedule the session
 * 
 * Also monitors for clients who have paid but haven't had their strategy session
 * completed, and the session date has passed without being marked complete.
 * 
 * This closes the gap where balls were getting dropped between payment and
 * strategy session scheduling.
 */
import { getDb } from "../db";
import * as db from "../db";
import { sql } from "drizzle-orm";

const TEAM_SHANNON = 30001;
const TEAM_LISA = 1;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // Every 6 hours
const PAID_NO_SESSION_HOURS = 48; // Follow up if no session scheduled within 48 hours after payment

let cronInterval: ReturnType<typeof setInterval> | null = null;

interface UnscheduledClient {
  enrollmentId: number;
  clientName: string;
  email: string;
  phone: string | null;
  tier: string;
  coachingFeePaidAt: string;
  hoursSincePayment: number;
  clientProjectId: number | null;
  status: string;
}

interface StuckPostPayment {
  enrollmentId: number;
  clientName: string;
  email: string;
  phone: string | null;
  tier: string;
  coachingFeePaidAt: string;
  hoursSincePayment: number;
  clientProjectId: number | null;
  status: string;
  discoveryScheduledAt: string | null;
  discoveryCompletedAt: string | null;
}

export function initStrategySessionMonitorCron() {
  console.log("[StrategySessionMonitor] Initialized, running every 6 hours");
  setTimeout(() => runStrategySessionCheck(), 180000); // Run after 3 minutes
  cronInterval = setInterval(() => runStrategySessionCheck(), CHECK_INTERVAL_MS);
}

export async function runStrategySessionCheck(): Promise<{ unscheduled: number; stuck: number; tasksCreated: number }> {
  console.log("[StrategySessionMonitor] Checking for clients needing session scheduling...");
  
  const database = await getDb();
  if (!database) {
    console.error("[StrategySessionMonitor] Database not available");
    return { unscheduled: 0, stuck: 0, tasksCreated: 0 };
  }

  let totalTasksCreated = 0;

  try {
    // === CHECK 1: Paid but no discovery/strategy session scheduled ===
    const unscheduledResult = await database.execute(sql`
      SELECT 
        te.id as enrollmentId,
        te.clientName,
        te.email,
        te.phone,
        te.tier,
        te.coachingFeePaidAt,
        te.status,
        TIMESTAMPDIFF(HOUR, te.coachingFeePaidAt, NOW()) as hoursSincePayment,
        cp.id as clientProjectId
      FROM transformation_enrollments te
      LEFT JOIN client_projects cp ON cp.clientProtocolId = te.clientProtocolId
      WHERE te.coachingFeePaid = 1
        AND te.coachingFeePaidAt IS NOT NULL
        AND te.discoverySessionScheduledAt IS NULL
        AND te.discoverySessionCompletedAt IS NULL
        AND te.coachingFeePaidAt <= DATE_SUB(NOW(), INTERVAL ${PAID_NO_SESSION_HOURS} HOUR)
        AND te.status NOT IN ('launched', 'active', 'completed', 'renewed', 'training_complete', 'training_scheduled', 'shipped', 'delivered', 'fulfillment')
        AND NOT EXISTS (
          SELECT 1 FROM automation_events ae 
          WHERE ae.enrollmentId = te.id 
          AND ae.eventType = 'strategy_session_unscheduled_task'
        )
      ORDER BY te.coachingFeePaidAt ASC
      LIMIT 20
    `);

    const unscheduledRows = ((unscheduledResult as any)?.[0] || unscheduledResult) as UnscheduledClient[];
    const unscheduledCount = Array.isArray(unscheduledRows) ? unscheduledRows.length : 0;

    if (unscheduledCount > 0) {
      console.log(`[StrategySessionMonitor] Found ${unscheduledCount} paid clients without scheduled sessions`);
      
      for (const row of unscheduledRows) {
        try {
          const daysSince = Math.round(row.hoursSincePayment / 24);
          
          if (row.clientProjectId) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 1);

            const taskId = await db.createProjectTask({
              clientProjectId: row.clientProjectId,
              lifecycleStageId: 2, // Consult stage
              name: `Schedule strategy session for ${row.clientName} — paid ${daysSince}d ago, no session booked`,
              description: `${row.clientName} paid their coaching fee ${daysSince} day(s) ago but has NOT scheduled their strategy/discovery session yet.\n\n` +
                `Email: ${row.email || 'N/A'}\n` +
                `Phone: ${row.phone || 'N/A'}\n` +
                `Program: ${row.tier}\n` +
                `Status: ${row.status}\n\n` +
                `Please contact the client to schedule their strategy session with Jason.`,
              assignedTeamMemberId: TEAM_SHANNON,
              dueDate,
              sortOrder: 5, // Very high priority
              isRequired: true,
            });

            await db.notifyTaskAssignment(
              taskId,
              TEAM_SHANNON,
              `Schedule strategy session for ${row.clientName}`,
              row.clientProjectId
            );
            totalTasksCreated++;
          }

          // Team notification for Shannon
          await db.createTeamNotification({
            teamMemberId: TEAM_SHANNON,
            type: "task_assigned",
            title: `Session Scheduling Needed: ${row.clientName}`,
            message: `${row.clientName} paid ${daysSince} day(s) ago but hasn't scheduled their strategy session. ` +
              `Email: ${row.email || 'N/A'} | Phone: ${row.phone || 'N/A'} | Program: ${row.tier}`,
            clientProjectId: row.clientProjectId || undefined,
          });

          // Log to prevent duplicates
          await database.execute(sql`
            INSERT INTO automation_events (eventType, enrollmentId, details, status, triggeredBy, createdAt)
            VALUES (
              'strategy_session_unscheduled_task',
              ${row.enrollmentId},
              ${JSON.stringify({
                clientName: row.clientName,
                email: row.email,
                daysSincePayment: daysSince,
                status: row.status,
              })},
              'success',
              'system',
              NOW()
            )
          `);

          console.log(`[StrategySessionMonitor] Created scheduling task for ${row.clientName} (${daysSince}d since payment)`);
        } catch (err) {
          console.error(`[StrategySessionMonitor] Error processing ${row.clientName}:`, err);
        }
      }
    }

    // === CHECK 2: Paid, session scheduled but not completed, and it's past the scheduled date ===
    const stuckResult = await database.execute(sql`
      SELECT 
        te.id as enrollmentId,
        te.clientName,
        te.email,
        te.phone,
        te.tier,
        te.coachingFeePaidAt,
        te.status,
        te.discoverySessionScheduledAt,
        te.discoverySessionCompletedAt,
        TIMESTAMPDIFF(HOUR, te.coachingFeePaidAt, NOW()) as hoursSincePayment,
        cp.id as clientProjectId
      FROM transformation_enrollments te
      LEFT JOIN client_projects cp ON cp.clientProtocolId = te.clientProtocolId
      WHERE te.coachingFeePaid = 1
        AND te.discoverySessionScheduledAt IS NOT NULL
        AND te.discoverySessionScheduledAt < NOW()
        AND te.discoverySessionCompletedAt IS NULL
        AND te.status NOT IN ('launched', 'active', 'completed', 'renewed', 'training_complete', 'training_scheduled', 'shipped', 'delivered', 'fulfillment', 'discovery_complete')
        AND NOT EXISTS (
          SELECT 1 FROM automation_events ae 
          WHERE ae.enrollmentId = te.id 
          AND ae.eventType = 'strategy_session_stuck_task'
        )
      ORDER BY te.discoverySessionScheduledAt ASC
      LIMIT 20
    `);

    const stuckRows = ((stuckResult as any)?.[0] || stuckResult) as StuckPostPayment[];
    const stuckCount = Array.isArray(stuckRows) ? stuckRows.length : 0;

    if (stuckCount > 0) {
      console.log(`[StrategySessionMonitor] Found ${stuckCount} clients with past sessions not marked complete`);
      
      for (const row of stuckRows) {
        try {
          // Notify both Shannon (to follow up) and Lisa (to update status)
          await db.createTeamNotification({
            teamMemberId: TEAM_SHANNON,
            type: "task_assigned",
            title: `Session Follow-Up: ${row.clientName}`,
            message: `${row.clientName}'s strategy session was scheduled for ${row.discoveryScheduledAt} but hasn't been marked as completed. ` +
              `Please confirm if the session happened and follow up if needed.`,
            clientProjectId: row.clientProjectId || undefined,
          });

          await db.createTeamNotification({
            teamMemberId: TEAM_LISA,
            type: "task_assigned",
            title: `Update Session Status: ${row.clientName}`,
            message: `${row.clientName}'s strategy session was scheduled but not marked complete. ` +
              `Please update the enrollment status if the session has been completed.`,
            clientProjectId: row.clientProjectId || undefined,
          });

          // Log to prevent duplicates
          await database.execute(sql`
            INSERT INTO automation_events (eventType, enrollmentId, details, status, triggeredBy, createdAt)
            VALUES (
              'strategy_session_stuck_task',
              ${row.enrollmentId},
              ${JSON.stringify({
                clientName: row.clientName,
                scheduledAt: row.discoveryScheduledAt,
                status: row.status,
              })},
              'success',
              'system',
              NOW()
            )
          `);

          console.log(`[StrategySessionMonitor] Created stuck-session alert for ${row.clientName}`);
        } catch (err) {
          console.error(`[StrategySessionMonitor] Error processing stuck session for ${row.clientName}:`, err);
        }
      }
    }

    // Admin notification summary
    const totalFound = unscheduledCount + stuckCount;
    if (totalFound > 0) {
      try {
        const lines: string[] = [];
        if (unscheduledCount > 0) {
          lines.push(`${unscheduledCount} client(s) paid but haven't scheduled their strategy session:`);
          for (const r of (unscheduledRows || [])) {
            lines.push(`  • ${r.clientName} — paid ${Math.round(r.hoursSincePayment / 24)}d ago`);
          }
        }
        if (stuckCount > 0) {
          lines.push(`\n${stuckCount} client(s) have sessions scheduled but not marked complete:`);
          for (const r of (stuckRows || [])) {
            lines.push(`  • ${r.clientName} — session was ${r.discoveryScheduledAt}`);
          }
        }
        
        await db.createNotificationsForEnabledUsers(
          "onboarding_automation",
          `Strategy Session Monitor: ${totalFound} Action(s) Needed`,
          lines.join('\n'),
        );
      } catch (err) {
        console.error("[StrategySessionMonitor] Failed to create admin notification:", err);
      }
    }

    console.log(`[StrategySessionMonitor] Complete: ${unscheduledCount} unscheduled, ${stuckCount} stuck, ${totalTasksCreated} tasks created`);
    return { unscheduled: unscheduledCount, stuck: stuckCount, tasksCreated: totalTasksCreated };
  } catch (error) {
    console.error("[StrategySessionMonitor] Error:", error);
    return { unscheduled: 0, stuck: 0, tasksCreated: 0 };
  }
}
