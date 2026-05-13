/**
 * Lifecycle Stage Advancement Engine
 * 
 * Automatically advances client projects through lifecycle stages
 * based on milestone events (intake complete, consult done, payment confirmed, etc.)
 * 
 * Creates tasks for the responsible team member at each transition,
 * and sends both admin notifications and team-specific notifications.
 * 
 * Lifecycle Stages:
 * 1 = Intake
 * 2 = Consult
 * 3 = Protocol Build
 * 4 = Billing
 * 5 = Fulfillment
 * 6 = Onboarding
 * 7 = Active Protocol
 * 8 = Completion
 */

import * as db from "../db";
import { clientProjects, projectTasks, transformationEnrollments, automationEvents } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// Team member IDs (from team_members table)
const TEAM = {
  LISA: 1,
  SHANNON: 30001,
  KARI: 30002,   // Carrie - fulfillment
  VEE: 30003,
  JASON: 30004,  // Jason - coach/owner
};

// Stage advancement rules: what milestone triggers which stage transition
interface TaskCreation {
  name: string;
  description: string;
  assignedTeamMemberId: number | null;
  lifecycleStageId: number;
  dueDays: number;
}

interface AdvancementRule {
  fromStage: number;
  toStage: number;
  trigger: string;
  description: string;
  notifyTeamMember?: number;
  notifyMessage?: string;
  createTask?: TaskCreation;
  additionalTasks?: TaskCreation[];
}

const ADVANCEMENT_RULES: AdvancementRule[] = [
  {
    fromStage: 1, // Intake
    toStage: 2,   // Consult
    trigger: "intake_complete",
    description: "Intake form completed → advance to Consult stage",
    notifyTeamMember: TEAM.SHANNON,
    notifyMessage: "Intake complete — ready for consultation scheduling",
    createTask: {
      name: "Schedule discovery session",
      description: "Client has completed their intake form. Review the intake and schedule their discovery/consultation session.",
      assignedTeamMemberId: TEAM.SHANNON,
      lifecycleStageId: 2,
      dueDays: 1,
    },
    additionalTasks: [
      {
        name: "Conduct discovery session",
        description: "Client's intake is complete. Review their intake form and prepare for the discovery/consultation session. Shannon is scheduling this — your task is to conduct the session once booked.",
        assignedTeamMemberId: TEAM.JASON,
        lifecycleStageId: 2,
        dueDays: 3,
      },
    ],
  },
  {
    fromStage: 1, // Intake (can skip to Protocol Build if consult already done)
    toStage: 3,
    trigger: "consult_and_payment_complete",
    description: "Consult done + payment confirmed → advance to Protocol Build",
    notifyTeamMember: TEAM.LISA,
    notifyMessage: "Consult completed and payment confirmed — protocol build can begin",
    createTask: {
      name: "Prepare onboarding materials",
      description: "Client has completed consult and paid. Prepare community access links, Peptide Pro signup, and onboarding welcome package.",
      assignedTeamMemberId: TEAM.LISA,
      lifecycleStageId: 6, // Onboarding
      dueDays: 2,
    },
    additionalTasks: [
      {
        name: "Build protocol",
        description: "Client has completed their consult and paid. Build their personalized protocol based on the discovery session notes and intake form.",
        assignedTeamMemberId: TEAM.JASON,
        lifecycleStageId: 3,
        dueDays: 4,
      },
      {
        name: "Schedule strategy session",
        description: "Client has paid — schedule their strategy session with Jason. Coordinate with client on availability.",
        assignedTeamMemberId: TEAM.SHANNON,
        lifecycleStageId: 3,
        dueDays: 1,
      },
    ],
  },
  {
    fromStage: 2, // Consult
    toStage: 3,   // Protocol Build
    trigger: "consult_complete",
    description: "Consultation completed → advance to Protocol Build",
    notifyTeamMember: TEAM.LISA,
    notifyMessage: "Consultation completed — protocol build stage begins. Jason has 4 days to build the protocol.",
    createTask: {
      name: "Prepare onboarding materials",
      description: "Client consultation is complete. Prepare community access links, Peptide Pro signup, and onboarding welcome package while Jason builds the protocol.",
      assignedTeamMemberId: TEAM.LISA,
      lifecycleStageId: 6,
      dueDays: 2,
    },
    additionalTasks: [
      {
        name: "Build protocol",
        description: "Consultation is complete. Build the client's personalized protocol based on the discovery session notes and intake form.",
        assignedTeamMemberId: TEAM.JASON,
        lifecycleStageId: 3,
        dueDays: 4,
      },
      {
        name: "Schedule strategy session",
        description: "Consultation is complete — schedule the strategy session with Jason. Coordinate with client on availability.",
        assignedTeamMemberId: TEAM.SHANNON,
        lifecycleStageId: 3,
        dueDays: 1,
      },
    ],
  },
  {
    fromStage: 3, // Protocol Build
    toStage: 4,   // Billing
    trigger: "protocol_approved",
    description: "Protocol approved → advance to Billing",
    notifyTeamMember: TEAM.LISA,
    notifyMessage: "Protocol has been approved — billing and order processing can begin",
    createTask: {
      name: "Send protocol payment link",
      description: "Client has approved their protocol. Send the payment link for protocol items and follow up to ensure payment is completed.",
      assignedTeamMemberId: TEAM.LISA,
      lifecycleStageId: 4,
      dueDays: 1,
    },
  },
  {
    fromStage: 4, // Billing
    toStage: 5,   // Fulfillment
    trigger: "billing_complete",
    description: "Billing complete → advance to Fulfillment",
    notifyTeamMember: TEAM.KARI,
    notifyMessage: "Billing complete — fulfillment and shipping can begin",
    createTask: {
      name: "Fulfill and ship client order",
      description: "Payment confirmed. Pull items from inventory, pack the order, and prepare for shipping. Check packing slip for item details.",
      assignedTeamMemberId: TEAM.KARI,
      lifecycleStageId: 5,
      dueDays: 2,
    },
    additionalTasks: [
      {
        name: "Verify packing slip accuracy",
        description: "Cross-check the packing slip against the client's protocol to ensure all items are correct before shipping.",
        assignedTeamMemberId: TEAM.KARI,
        lifecycleStageId: 5,
        dueDays: 1,
      },
    ],
  },
  {
    fromStage: 5, // Fulfillment
    toStage: 6,   // Onboarding
    trigger: "fulfillment_complete",
    description: "Fulfillment complete → advance to Onboarding",
    notifyTeamMember: TEAM.LISA,
    notifyMessage: "Order shipped — schedule reconstitution training and complete onboarding setup",
    createTask: {
      name: "Schedule reconstitution training / kickoff call",
      description: "Client's box has been shipped. Schedule the reconstitution training session and ensure all onboarding materials (community access, Peptide Pro, etc.) are ready.",
      assignedTeamMemberId: TEAM.LISA,
      lifecycleStageId: 6,
      dueDays: 2,
    },
    additionalTasks: [
      {
        name: "Confirm client received shipment",
        description: "Follow up with client to confirm they received their package and check if they have any questions before training.",
        assignedTeamMemberId: TEAM.SHANNON,
        lifecycleStageId: 6,
        dueDays: 5,
      },
      {
        name: "Conduct kickoff / reconstitution training call",
        description: "Client's box has shipped. Prepare for and conduct the kickoff call / reconstitution training session. Lisa is scheduling this — your task is to conduct the session.",
        assignedTeamMemberId: TEAM.JASON,
        lifecycleStageId: 6,
        dueDays: 7,
      },
    ],
  },
  {
    fromStage: 6, // Onboarding
    toStage: 7,   // Active Protocol
    trigger: "onboarding_complete",
    description: "Onboarding complete → advance to Active Protocol",
    notifyTeamMember: TEAM.LISA,
    notifyMessage: "Client is fully onboarded and active on their protocol",
    createTask: {
      name: "Schedule Week 3 review session",
      description: "Client is now active on their protocol. Schedule the Week 3 review session to check progress and address any concerns.",
      assignedTeamMemberId: TEAM.SHANNON,
      lifecycleStageId: 7,
      dueDays: 14, // 2 weeks into active protocol
    },
    additionalTasks: [
      {
        name: "Conduct Week 3 review session",
        description: "Client is active on their protocol. Shannon is scheduling the Week 3 review — your task is to conduct the session, review progress, and adjust protocol if needed.",
        assignedTeamMemberId: TEAM.JASON,
        lifecycleStageId: 7,
        dueDays: 21, // 3 weeks into active protocol
      },
    ],
  },
];

/**
 * Attempt to advance a project's lifecycle stage based on a trigger event.
 * Returns the new stage ID if advanced, or null if no advancement was applicable.
 */
export async function advanceLifecycleStage(
  projectId: number,
  trigger: string,
  context?: { clientName?: string; enrollmentId?: number; notes?: string }
): Promise<{ advanced: boolean; fromStage: number; toStage: number | null; message: string }> {
  const database = await db.getDb();
  if (!database) {
    return { advanced: false, fromStage: 0, toStage: null, message: "Database not available" };
  }

  // Get current project
  const [project] = await database.select().from(clientProjects).where(eq(clientProjects.id, projectId));
  if (!project) {
    return { advanced: false, fromStage: 0, toStage: null, message: `Project #${projectId} not found` };
  }

  const currentStage = project.currentLifecycleStageId || 1;
  const clientName = context?.clientName || project.clientName || "Unknown Client";

  // Find applicable rule
  const rule = ADVANCEMENT_RULES.find(r => r.fromStage === currentStage && r.trigger === trigger);
  
  // Also check for skip rules (e.g., from Intake directly to Protocol Build)
  const skipRule = ADVANCEMENT_RULES.find(r => r.fromStage <= currentStage && r.toStage > currentStage && r.trigger === trigger);
  
  const applicableRule = rule || skipRule;

  if (!applicableRule) {
    console.log(`[Lifecycle] No advancement rule for stage ${currentStage} + trigger "${trigger}" on project #${projectId}`);
    return { advanced: false, fromStage: currentStage, toStage: null, message: `No advancement rule for current stage (${currentStage}) with trigger "${trigger}"` };
  }

  // Don't go backwards
  if (applicableRule.toStage <= currentStage) {
    return { advanced: false, fromStage: currentStage, toStage: null, message: `Already at or past stage ${applicableRule.toStage}` };
  }

  // Advance the project
  await database.update(clientProjects).set({
    currentLifecycleStageId: applicableRule.toStage,
    status: "active", // Ensure it's active when advancing
    updatedAt: new Date(),
  }).where(eq(clientProjects.id, projectId));

  console.log(`[Lifecycle] Advanced project #${projectId} (${clientName}) from stage ${currentStage} to ${applicableRule.toStage}: ${applicableRule.description}`);

  // Create admin notification for visibility
  try {
    await db.createNotificationsForEnabledUsers(
      "onboarding_automation",
      `${clientName} — Stage Advanced`,
      `${clientName}'s project has advanced to a new stage.\n\n` +
      `Previous: Stage ${currentStage}\n` +
      `Current: Stage ${applicableRule.toStage}\n` +
      `Trigger: ${applicableRule.description}\n\n` +
      (applicableRule.notifyMessage || ""),
    );
  } catch (err) {
    console.error(`[Lifecycle] Failed to create admin notification:`, err);
  }

  // Create team-specific notification for the responsible team member
  if (applicableRule.notifyTeamMember) {
    try {
      await db.createTeamNotification({
        teamMemberId: applicableRule.notifyTeamMember,
        type: "project_assigned",
        title: `Action Required: ${clientName}`,
        message: applicableRule.notifyMessage || `${clientName}'s project has advanced. Please review and take action.`,
        clientProjectId: projectId,
      });
      console.log(`[Lifecycle] Sent team notification to member #${applicableRule.notifyTeamMember}`);
    } catch (err) {
      console.error(`[Lifecycle] Failed to create team notification:`, err);
    }
  }

  // Create primary follow-up task if defined in the rule
  if (applicableRule.createTask) {
    try {
      const taskId = await createTaskFromRule(applicableRule.createTask, projectId, clientName);
      console.log(`[Lifecycle] Created primary task: ${applicableRule.createTask.name} (ID: ${taskId})`);
    } catch (err) {
      console.error(`[Lifecycle] Failed to create primary task:`, err);
    }
  }

  // Create additional tasks if defined
  if (applicableRule.additionalTasks) {
    for (const taskDef of applicableRule.additionalTasks) {
      try {
        const taskId = await createTaskFromRule(taskDef, projectId, clientName);
        console.log(`[Lifecycle] Created additional task: ${taskDef.name} (ID: ${taskId})`);
      } catch (err) {
        console.error(`[Lifecycle] Failed to create additional task ${taskDef.name}:`, err);
      }
    }
  }

  // Log automation event
  try {
    await database.insert(automationEvents).values({
      eventType: `lifecycle_advanced_${currentStage}_to_${applicableRule.toStage}`,
      clientProjectId: projectId,
      enrollmentId: context?.enrollmentId || null,
      details: JSON.stringify({
        fromStage: currentStage,
        toStage: applicableRule.toStage,
        trigger,
        rule: applicableRule.description,
        clientName,
        notes: context?.notes,
        tasksCreated: [
          applicableRule.createTask?.name,
          ...(applicableRule.additionalTasks?.map(t => t.name) || []),
        ].filter(Boolean),
      }),
      status: "success",
      triggeredBy: "system",
    });
  } catch (err) {
    console.error(`[Lifecycle] Failed to log automation event:`, err);
  }

  // Log project activity
  try {
    await db.createProjectActivityLog({
      clientProjectId: projectId,
      actionType: "stage_advanced",
      description: `Lifecycle stage auto-advanced from ${currentStage} to ${applicableRule.toStage}: ${applicableRule.description}`,
    });
  } catch (err) {
    console.error(`[Lifecycle] Failed to log project activity:`, err);
  }

  return {
    advanced: true,
    fromStage: currentStage,
    toStage: applicableRule.toStage,
    message: applicableRule.description,
  };
}

/**
 * Helper to create a task from a rule definition and notify the assigned team member
 */
async function createTaskFromRule(taskDef: TaskCreation, projectId: number, clientName: string): Promise<number> {
  const taskFullName = `${taskDef.name} for ${clientName}`;

  // Deduplication: check if a pending/in_progress task with the same name already exists for this project
  const existingTasks = await db.getProjectTasks(projectId);
  const duplicate = existingTasks.find(
    (t: any) => t.name === taskFullName && (t.status === 'pending' || t.status === 'in_progress')
  );
  if (duplicate) {
    console.log(`[Lifecycle] Skipping duplicate task: "${taskFullName}" for project #${projectId} (existing task #${duplicate.id})`);
    return duplicate.id;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + taskDef.dueDays);

  const taskId = await db.createProjectTask({
    clientProjectId: projectId,
    lifecycleStageId: taskDef.lifecycleStageId,
    name: `${taskDef.name} for ${clientName}`,
    description: taskDef.description,
    assignedTeamMemberId: taskDef.assignedTeamMemberId,
    dueDate,
    sortOrder: 50,
    isRequired: true,
  });

  // Notify the assigned team member about the new task
  if (taskDef.assignedTeamMemberId) {
    try {
      await db.notifyTaskAssignment(taskId, taskDef.assignedTeamMemberId, `${taskDef.name} for ${clientName}`, projectId);
    } catch (err) {
      console.error(`[Lifecycle] Failed to notify team member #${taskDef.assignedTeamMemberId} about task:`, err);
    }
  }

  return taskId;
}

/**
 * Create a standalone task for a team member (not tied to a lifecycle transition).
 * Used by crons and other automation to create follow-up tasks.
 */
export async function createFollowUpTask(
  projectId: number,
  taskName: string,
  taskDescription: string,
  assignedTeamMemberId: number,
  dueDays: number,
  lifecycleStageId: number = 1,
): Promise<number | null> {
  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const taskId = await db.createProjectTask({
      clientProjectId: projectId,
      lifecycleStageId,
      name: taskName,
      description: taskDescription,
      assignedTeamMemberId,
      dueDate,
      sortOrder: 50,
      isRequired: false,
    });

    // Notify the assigned team member
    if (assignedTeamMemberId) {
      await db.notifyTaskAssignment(taskId, assignedTeamMemberId, taskName, projectId);
    }

    console.log(`[FollowUp] Created task "${taskName}" for team member #${assignedTeamMemberId} on project #${projectId}`);
    return taskId;
  } catch (err) {
    console.error(`[FollowUp] Failed to create task "${taskName}":`, err);
    return null;
  }
}

/**
 * Check all active projects for potential stage advancements based on enrollment data.
 * This is a "catch-up" function that can be run periodically or on-demand to fix
 * projects that missed their stage advancement triggers.
 */
export async function reconcileProjectStages(): Promise<{
  checked: number;
  advanced: number;
  details: Array<{ projectId: number; clientName: string; fromStage: number; toStage: number; reason: string }>;
}> {
  const database = await db.getDb();
  if (!database) {
    return { checked: 0, advanced: 0, details: [] };
  }

  const result = { checked: 0, advanced: 0, details: [] as any[] };

  // Get all active/on_hold projects that might need advancement
  const projects = await database.select().from(clientProjects)
    .where(sql`${clientProjects.status} IN ('active', 'on_hold')`);

  for (const project of projects) {
    result.checked++;
    const currentStage = project.currentLifecycleStageId || 1;

    // Find the enrollment for this project
    let enrollment = null;
    if (project.clientEmail) {
      const [found] = await database.select().from(transformationEnrollments)
        .where(eq(transformationEnrollments.email, project.clientEmail));
      enrollment = found || null;
    }

    if (!enrollment) continue;

    // Check what stage the project SHOULD be at based on enrollment data
    let shouldBeAtStage = 1; // Intake
    let trigger = "";
    let reason = "";

    // If intake form is completed → at least stage 2 (Consult)
    if (enrollment.intakeFormCompleted) {
      shouldBeAtStage = 2;
      trigger = "intake_complete";
      reason = "Intake form completed";
    }

    // If coaching fee is paid → at least stage 3 (Protocol Build)
    if (enrollment.coachingFeePaid) {
      shouldBeAtStage = 3;
      trigger = "consult_and_payment_complete";
      reason = "Coaching fee paid ($" + enrollment.coachingFeeAmount + ")";
    }

    // If discovery session is completed → at least stage 3 (Protocol Build)
    if (enrollment.discoverySessionCompletedAt) {
      shouldBeAtStage = Math.max(shouldBeAtStage, 3);
      trigger = "consult_complete";
      reason = "Discovery session completed";
    }

    // If protocol is approved → at least stage 4 (Billing)
    if (enrollment.clientProtocolId) {
      try {
        const protocol = await db.getClientProtocolById(enrollment.clientProtocolId);
        if (protocol && protocol.status === "approved") {
          shouldBeAtStage = Math.max(shouldBeAtStage, 4);
          trigger = "protocol_approved";
          reason = "Protocol approved";
        }
      } catch (err) {
        // Skip
      }
    }

    // If protocol cost is paid → at least stage 5 (Fulfillment)
    if (enrollment.protocolCostPaid) {
      shouldBeAtStage = Math.max(shouldBeAtStage, 5);
      trigger = "billing_complete";
      reason = "Protocol cost paid";
    }

    // If box shipped → at least stage 6 (Onboarding)
    if (enrollment.boxShippedAt) {
      shouldBeAtStage = Math.max(shouldBeAtStage, 6);
      trigger = "fulfillment_complete";
      reason = "Box shipped";
    }

    // If reconstitution training complete → at least stage 7 (Active Protocol)
    if (enrollment.reconstitutionSessionCompletedAt) {
      shouldBeAtStage = Math.max(shouldBeAtStage, 7);
      trigger = "onboarding_complete";
      reason = "Reconstitution training completed";
    }

    // Advance if behind
    if (shouldBeAtStage > currentStage) {
      const advanceResult = await advanceLifecycleStage(project.id, trigger, {
        clientName: project.clientName || "Unknown",
        enrollmentId: enrollment.id,
        notes: `Reconciliation: ${reason}. Project was at stage ${currentStage}, should be at ${shouldBeAtStage}.`,
      });

      if (advanceResult.advanced) {
        result.advanced++;
        result.details.push({
          projectId: project.id,
          clientName: project.clientName || "Unknown",
          fromStage: currentStage,
          toStage: shouldBeAtStage,
          reason,
        });

        // If we need to advance multiple stages, keep going
        let newStage = advanceResult.toStage || shouldBeAtStage;
        while (newStage < shouldBeAtStage) {
          // Direct update for multi-stage jumps
          await database.update(clientProjects).set({
            currentLifecycleStageId: shouldBeAtStage,
            status: "active",
            updatedAt: new Date(),
          }).where(eq(clientProjects.id, project.id));
          newStage = shouldBeAtStage;
        }
      }
    }

    // Also fix status if project is on_hold but has active enrollment
    if (project.status === "on_hold" && enrollment.coachingFeePaid) {
      await database.update(clientProjects).set({
        status: "active",
        updatedAt: new Date(),
      }).where(eq(clientProjects.id, project.id));
    }
  }

  console.log(`[Lifecycle Reconciliation] Checked ${result.checked} projects, advanced ${result.advanced}`);
  return result;
}

export { TEAM, ADVANCEMENT_RULES };
