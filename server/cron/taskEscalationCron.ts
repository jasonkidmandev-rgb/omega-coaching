/**
 * Task Escalation Cron
 * 
 * Runs every 12 hours to:
 * 1. Find tasks that are overdue by more than 48 hours
 * 2. Escalate them by notifying the team lead (Lisa) and admin (Jason)
 * 3. Create escalation notifications so nothing falls through the cracks
 * 
 * Escalation chain:
 * - Shannon's overdue tasks → Lisa gets notified
 * - Carrie's overdue tasks → Lisa gets notified
 * - Lisa's overdue tasks → Jason (admin) gets notified
 * - Vee's overdue tasks → Lisa gets notified
 * - Unassigned overdue tasks → Lisa gets notified
 * 
 * This ensures that if someone drops the ball, the next person up knows about it.
 */
import { getDb } from "../db";
import * as db from "../db";
import { sql } from "drizzle-orm";

const TEAM_LISA = 1;
const TEAM_SHANNON = 30001;
const TEAM_KARI = 30002;
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // Every 12 hours
const OVERDUE_THRESHOLD_HOURS = 48; // Escalate after 48 hours overdue

let cronInterval: ReturnType<typeof setInterval> | null = null;

export function initTaskEscalationCron() {
  console.log("[TaskEscalation] Initialized, running every 12 hours");
  setTimeout(() => runTaskEscalation(), 300000); // Run after 5 minutes
  cronInterval = setInterval(() => runTaskEscalation(), CHECK_INTERVAL_MS);
}

export async function runTaskEscalation(): Promise<{
  overdueFound: number;
  escalationsCreated: number;
}> {
  console.log("[TaskEscalation] Checking for overdue tasks to escalate...");
  
  const database = await getDb();
  if (!database) {
    console.error("[TaskEscalation] Database not available");
    return { overdueFound: 0, escalationsCreated: 0 };
  }

  try {
    // Find tasks that are:
    // - Status is pending or in_progress
    // - Due date is more than 48 hours in the past
    // - Haven't been escalated yet (no automation_event)
    const overdueResult = await database.execute(sql`
      SELECT 
        pt.id as taskId,
        pt.name as taskName,
        pt.description,
        pt.status,
        pt.dueDate,
        pt.assignedTeamMemberId,
        pt.clientProjectId,
        TIMESTAMPDIFF(HOUR, pt.dueDate, NOW()) as hoursOverdue,
        tm.name as assigneeName,
        cp.clientName
      FROM project_tasks pt
      LEFT JOIN team_members tm ON pt.assignedTeamMemberId = tm.id
      LEFT JOIN client_projects cp ON pt.clientProjectId = cp.id
      WHERE pt.status IN ('pending', 'in_progress')
        AND pt.dueDate IS NOT NULL
        AND pt.dueDate < DATE_SUB(NOW(), INTERVAL ${OVERDUE_THRESHOLD_HOURS} HOUR)
        AND NOT EXISTS (
          SELECT 1 FROM automation_events ae 
          WHERE ae.eventType = 'task_escalated'
          AND JSON_EXTRACT(ae.details, '$.taskId') = pt.id
        )
      ORDER BY pt.dueDate ASC
      LIMIT 50
    `);

    const overdueRows = ((overdueResult as any)?.[0] || overdueResult) as any[];
    
    if (!Array.isArray(overdueRows) || overdueRows.length === 0) {
      console.log("[TaskEscalation] No overdue tasks needing escalation");
      return { overdueFound: 0, escalationsCreated: 0 };
    }

    const overdueFound = overdueRows.length;
    let escalationsCreated = 0;
    console.log(`[TaskEscalation] Found ${overdueFound} overdue tasks to escalate`);

    // Group by assignee for batch notifications
    const byAssignee = new Map<number | null, any[]>();
    for (const row of overdueRows) {
      const assigneeId = row.assignedTeamMemberId;
      if (!byAssignee.has(assigneeId)) byAssignee.set(assigneeId, []);
      byAssignee.get(assigneeId)!.push(row);
    }

    for (const [assigneeId, tasks] of byAssignee) {
      // Determine who to escalate to
      let escalateToId: number;
      let escalateToName: string;
      const assigneeName = tasks[0].assigneeName || 'Unassigned';

      if (assigneeId === TEAM_LISA) {
        // Lisa's tasks escalate to Jason (admin notification only)
        escalateToId = 0; // Special: admin notification
        escalateToName = 'Jason (Admin)';
      } else {
        // Everyone else escalates to Lisa
        escalateToId = TEAM_LISA;
        escalateToName = 'Lisa';
      }

      const taskList = tasks.map((t: any) => {
        const daysOverdue = Math.round(t.hoursOverdue / 24);
        return `• ${t.taskName} — ${daysOverdue}d overdue${t.clientName ? ` (${t.clientName})` : ''}`;
      }).join('\n');

      if (escalateToId === 0) {
        // Escalate to admin (Jason) via admin notification
        await db.createNotificationsForEnabledUsers(
          "onboarding_automation",
          `Escalation: ${tasks.length} of Lisa's tasks are overdue`,
          `The following tasks assigned to Lisa are overdue by more than 48 hours:\n\n${taskList}\n\n` +
          `Please follow up to ensure these are addressed.`,
        );
        escalationsCreated++;
      } else {
        // Escalate to Lisa via team notification
        await db.createTeamNotification({
          teamMemberId: escalateToId,
          type: "task_assigned",
          title: `Escalation: ${tasks.length} overdue task(s) from ${assigneeName}`,
          message: `The following tasks assigned to ${assigneeName} are overdue by more than 48 hours:\n\n${taskList}\n\n` +
            `Please follow up with ${assigneeName} or reassign these tasks.`,
        });
        escalationsCreated++;
      }

      // Also remind the original assignee
      if (assigneeId && assigneeId !== 0) {
        await db.createTeamNotification({
          teamMemberId: assigneeId,
          type: "task_assigned",
          title: `Reminder: ${tasks.length} overdue task(s)`,
          message: `You have ${tasks.length} task(s) that are overdue by more than 48 hours:\n\n${taskList}\n\n` +
            `These have been escalated to ${escalateToName}. Please complete them as soon as possible.`,
        });
      }

      // Log automation events for each task
      for (const task of tasks) {
        await database.execute(sql`
          INSERT INTO automation_events (eventType, details, status, triggeredBy, createdAt)
          VALUES (
            'task_escalated',
            ${JSON.stringify({
              taskId: task.taskId,
              taskName: task.taskName,
              assigneeId,
              assigneeName,
              escalatedTo: escalateToName,
              hoursOverdue: task.hoursOverdue,
              clientName: task.clientName,
            })},
            'success',
            'system',
            NOW()
          )
        `);
      }

      console.log(`[TaskEscalation] Escalated ${tasks.length} tasks from ${assigneeName} to ${escalateToName}`);
    }

    // Admin summary
    try {
      const summaryLines: string[] = [];
      for (const [assigneeId, tasks] of byAssignee) {
        const name = tasks[0].assigneeName || 'Unassigned';
        summaryLines.push(`${name}: ${tasks.length} overdue task(s)`);
      }
      
      await db.createNotificationsForEnabledUsers(
        "onboarding_automation",
        `Task Escalation Report: ${overdueFound} overdue tasks`,
        `${overdueFound} task(s) overdue by 48+ hours have been escalated:\n\n` +
        summaryLines.join('\n') +
        `\n\nPlease review the My Action Items page for details.`,
      );
    } catch (err) {
      console.error("[TaskEscalation] Failed to create admin summary:", err);
    }

    console.log(`[TaskEscalation] Complete: ${overdueFound} overdue, ${escalationsCreated} escalations`);
    return { overdueFound, escalationsCreated };
  } catch (error) {
    console.error("[TaskEscalation] Error:", error);
    return { overdueFound: 0, escalationsCreated: 0 };
  }
}
