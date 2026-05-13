/**
 * Onboarding Automation Engine
 * 
 * Triggered after coaching fee payment is confirmed (PayPal or Venmo).
 * Bridges the gap between payment and active onboarding by:
 * 1. Creating/linking client record
 * 2. Creating client protocol (draft) from tier-appropriate template
 * 3. Creating client project with workflow template + auto-assigned tasks
 * 4. Sending welcome email with Peptide Pro link + community access
 * 5. Logging all automation events for audit trail
 */

import * as db from "../db";
import { automationEvents, clients, clientProjects, projectTasks, projectSubtasks, teamMembers } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

// ============================================================
// TIER → CONFIGURATION MAPPING
// ============================================================

interface TierConfig {
  programName: string;
  durationMonths: number;
  communityAccessMonths: number;
  communityCode: string; // Promo code for Omega Elite
  workflowTemplateId: number; // Which workflow template to use
  protocolTemplateId: number | null; // Which protocol template to clone (null = create blank)
  programId: number; // Which program to associate
}

// Map enrollment tier to configuration
const TIER_CONFIG: Record<string, TierConfig> = {
  // 90-day programs → 4 months community
  flagship: {
    programName: "90 Day Transformation",
    durationMonths: 3,
    communityAccessMonths: 4,
    communityCode: "4MONTHINVITEONLY",
    workflowTemplateId: 3, // 90-Day Protocol
    protocolTemplateId: 1, // Master Template
    programId: 90001,
  },
  essentials: {
    programName: "90 Day Transformation",
    durationMonths: 3,
    communityAccessMonths: 4,
    communityCode: "4MONTHINVITEONLY",
    workflowTemplateId: 3,
    protocolTemplateId: 1,
    programId: 90001,
  },
  advanced: {
    programName: "90 Day Transformation",
    durationMonths: 3,
    communityAccessMonths: 4,
    communityCode: "4MONTHINVITEONLY",
    workflowTemplateId: 3,
    protocolTemplateId: 1,
    programId: 90001,
  },
  recovery: {
    programName: "Wolverine Recovery Protocol",
    durationMonths: 3,
    communityAccessMonths: 4,
    communityCode: "4MONTHINVITEONLY",
    workflowTemplateId: 3,
    protocolTemplateId: 1,
    programId: 60001,
  },
  immunity: {
    programName: "90 Day Transformation",
    durationMonths: 3,
    communityAccessMonths: 4,
    communityCode: "4MONTHINVITEONLY",
    workflowTemplateId: 3,
    protocolTemplateId: 1,
    programId: 90001,
  },
  longevity: {
    programName: "90 Day Transformation",
    durationMonths: 3,
    communityAccessMonths: 4,
    communityCode: "4MONTHINVITEONLY",
    workflowTemplateId: 3,
    protocolTemplateId: 1,
    programId: 90001,
  },
  mitochondria: {
    programName: "90 Day Transformation",
    durationMonths: 3,
    communityAccessMonths: 4,
    communityCode: "4MONTHINVITEONLY",
    workflowTemplateId: 3,
    protocolTemplateId: 1,
    programId: 90001,
  },
  // 4-month program → 5 months community
  functional_health_elite: {
    programName: "4-Month Functional Health Elite",
    durationMonths: 4,
    communityAccessMonths: 5,
    communityCode: "5MONTHINVITEONLY", // TBD - user will provide later
    workflowTemplateId: 3,
    protocolTemplateId: 1,
    programId: 120001,
  },
  // 12-month program → 13 months community
  elite: {
    programName: "12 Month Ultimate Omega Elite Optimization Program",
    durationMonths: 12,
    communityAccessMonths: 13,
    communityCode: "4MONTHINVITEONLY", // Uses rolling quarterly codes
    workflowTemplateId: 4, // 12-Month Ultimate Omega
    protocolTemplateId: null, // Protocol built custom by Jason
    programId: 1,
  },
};

// Team member IDs (from database)
const TEAM = {
  LISA: 1,       // Client Care - onboarding, drop-ship, supplement reminders
  SHANNON: 30001, // Operations - lead pipeline, follow-ups, renewals
  KARI: 30002,    // Shipping/Vendor - in-house fulfillment
  VEE: 30003,     // Shipping/Vendor - drop-ship orders
};

// Community links
const COMMUNITY = {
  omegaEliteSignup: "https://link.fastpaydirect.com/payment-link/6871a1cbd6ab80936ce6849c",
  peptideProSignup: "https://peptidepro.app",
  appStoreApple: "https://apps.apple.com/us/app/omega-longevity/id6758194178",
  appStoreGoogle: "https://play.google.com/store/apps/details?id=com.omegalongevity.wl",
};

// ============================================================
// MAIN AUTOMATION ENTRY POINT
// ============================================================

export interface OnboardingTriggerParams {
  enrollmentId: number;
  tier: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  coachingFeeAmount: number;
  paymentMethod: "paypal" | "venmo";
  triggeredBy: "payment" | "manual";
}

export interface OnboardingResult {
  success: boolean;
  clientId: number | null;
  clientProtocolId: number | null;
  clientProjectId: number | null;
  errors: string[];
  automationEventIds: number[];
}

export async function runOnboardingAutomation(params: OnboardingTriggerParams): Promise<OnboardingResult> {
  const {
    enrollmentId,
    tier,
    clientName,
    clientEmail,
    clientPhone,
    coachingFeeAmount,
    paymentMethod,
    triggeredBy,
  } = params;

  const config = TIER_CONFIG[tier] || TIER_CONFIG.flagship;
  const result: OnboardingResult = {
    success: false,
    clientId: null,
    clientProtocolId: null,
    clientProjectId: null,
    errors: [],
    automationEventIds: [],
  };

  const database = await db.getDb();
  if (!database) {
    result.errors.push("Database not available");
    return result;
  }

  console.log(`[Onboarding] Starting automation for ${clientName} (${tier}) - enrollment #${enrollmentId}`);

  // ============================================================
  // STEP 1: Create or link client record
  // ============================================================
  try {
    let existingClient = clientEmail ? await db.getClientByEmail(clientEmail) : null;

    if (existingClient) {
      result.clientId = existingClient.id;
      console.log(`[Onboarding] Found existing client #${existingClient.id} for ${clientEmail}`);
    } else {
      result.clientId = await db.createClient({
        name: clientName,
        email: clientEmail || null,
        phone: clientPhone || null,
        isActiveInProjects: true,
      });
      console.log(`[Onboarding] Created new client #${result.clientId} for ${clientName}`);
    }

    await logAutomationEvent(database, {
      eventType: "client_created_or_linked",
      enrollmentId,
      clientId: result.clientId,
      details: JSON.stringify({
        isNew: !existingClient,
        clientName,
        clientEmail,
        tier,
      }),
      triggeredBy,
    }, result);
  } catch (err) {
    const msg = `Failed to create/link client: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[Onboarding] ${msg}`);
    result.errors.push(msg);
    // Continue - we can still create protocol/project without client linkage
  }

  // ============================================================
  // STEP 2: Create client protocol (draft) from tier template
  // ============================================================
  try {
    if (config.protocolTemplateId) {
      result.clientProtocolId = await db.cloneTemplateToClientProtocol(
        config.protocolTemplateId,
        clientName,
        clientEmail || undefined
      );
      console.log(`[Onboarding] Created protocol #${result.clientProtocolId} from template #${config.protocolTemplateId}`);

      // Link protocol to client
      if (result.clientId) {
        await db.updateClientProtocol(result.clientProtocolId, {
          clientId: result.clientId,
          programId: config.programId,
        } as any);
      }

      // Link enrollment to protocol
      await database.execute(
        require("drizzle-orm").sql`UPDATE transformation_enrollments SET clientProtocolId = ${result.clientProtocolId} WHERE id = ${enrollmentId}`
      );
    } else {
      console.log(`[Onboarding] No template for tier ${tier} - Jason will build protocol manually`);
    }

    await logAutomationEvent(database, {
      eventType: "protocol_created",
      enrollmentId,
      clientId: result.clientId,
      clientProtocolId: result.clientProtocolId,
      details: JSON.stringify({
        templateId: config.protocolTemplateId,
        programId: config.programId,
        tier,
      }),
      triggeredBy,
    }, result);
  } catch (err) {
    const msg = `Failed to create protocol: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[Onboarding] ${msg}`);
    result.errors.push(msg);
  }

  // ============================================================
  // STEP 3: Create client project with workflow template
  // ============================================================
  try {
    const startDate = new Date();
    const targetEndDate = new Date();
    targetEndDate.setMonth(targetEndDate.getMonth() + config.durationMonths);

    result.clientProjectId = await db.createClientProject({
      clientProtocolId: result.clientProtocolId,
      clientName,
      clientEmail: clientEmail || null,
      workflowTemplateId: config.workflowTemplateId,
      currentLifecycleStageId: 1, // Intake
      status: "active",
      priority: "high",
      startDate,
      targetEndDate,
      assignedTeamMemberId: TEAM.LISA, // Lisa owns onboarding
    });

    // Apply workflow template (creates tasks and subtasks)
    await db.applyWorkflowTemplateToProject(result.clientProjectId, config.workflowTemplateId);
    console.log(`[Onboarding] Created project #${result.clientProjectId} with workflow template #${config.workflowTemplateId}`);

    // Link client to project
    if (result.clientId) {
      await db.updateClient(result.clientId, {
        isActiveInProjects: true,
        clientProjectId: result.clientProjectId,
      });
    }

    // Auto-assign tasks to team members based on lifecycle stage
    await autoAssignProjectTasks(database, result.clientProjectId, startDate);

    // Log activity
    await db.createProjectActivityLog({
      clientProjectId: result.clientProjectId,
      actionType: "project_created",
      description: `Project auto-created by onboarding automation after ${paymentMethod} payment of $${coachingFeeAmount} for ${config.programName}`,
    });

    await logAutomationEvent(database, {
      eventType: "project_created",
      enrollmentId,
      clientId: result.clientId,
      clientProtocolId: result.clientProtocolId,
      clientProjectId: result.clientProjectId,
      details: JSON.stringify({
        workflowTemplateId: config.workflowTemplateId,
        programName: config.programName,
        startDate: startDate.toISOString(),
        targetEndDate: targetEndDate.toISOString(),
      }),
      triggeredBy,
    }, result);
  } catch (err) {
    const msg = `Failed to create project: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[Onboarding] ${msg}`);
    result.errors.push(msg);
  }

  // ============================================================
  // STEP 4: Create "Build protocol" task for Jason (4-day deadline)
  // ============================================================
  try {
    if (result.clientProjectId) {
      const protocolBuildDeadline = new Date();
      protocolBuildDeadline.setDate(protocolBuildDeadline.getDate() + 4);

      await db.createProjectTask({
        clientProjectId: result.clientProjectId,
        lifecycleStageId: 3, // Protocol Build
        name: `Build protocol for ${clientName}`,
        description: `Strategy session complete. Build the ${config.programName} protocol for ${clientName} (${tier} tier). Deadline: 4 days from enrollment.`,
        assignedTeamMemberId: null, // Jason (admin) - no team member ID needed
        dueDate: protocolBuildDeadline,
        sortOrder: 0,
        isRequired: true,
      });

      console.log(`[Onboarding] Created "Build protocol" task with 4-day deadline`);

      await logAutomationEvent(database, {
        eventType: "protocol_build_task_created",
        enrollmentId,
        clientId: result.clientId,
        clientProjectId: result.clientProjectId,
        details: JSON.stringify({
          deadline: protocolBuildDeadline.toISOString(),
          assignedTo: "Jason (admin)",
        }),
        triggeredBy,
      }, result);
    }
  } catch (err) {
    const msg = `Failed to create protocol build task: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[Onboarding] ${msg}`);
    result.errors.push(msg);
  }

  // ============================================================
  // STEP 5: Create community access + Peptide Pro tasks for Lisa
  // ============================================================
  try {
    if (result.clientProjectId) {
      // Task: Send Peptide Pro signup link
      await db.createProjectTask({
        clientProjectId: result.clientProjectId,
        lifecycleStageId: 6, // Onboarding
        name: `Send Peptide Pro signup link to ${clientName}`,
        description: `Send the Peptide Pro app signup link (${COMMUNITY.peptideProSignup}) to ${clientEmail || clientName}. Client needs this for daily protocol tracking.`,
        assignedTeamMemberId: TEAM.LISA,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        sortOrder: 100,
        isRequired: true,
      });

      // Task: Send Omega Elite community access
      await db.createProjectTask({
        clientProjectId: result.clientProjectId,
        lifecycleStageId: 6, // Onboarding
        name: `Send Omega Elite community access to ${clientName}`,
        description: `Send the Omega Elite signup link with promo code.\n\nSignup: ${COMMUNITY.omegaEliteSignup}\nCode: ${config.communityCode}\nAccess: ${config.communityAccessMonths} months\n\nAlso send app download links:\nApple: ${COMMUNITY.appStoreApple}\nGoogle: ${COMMUNITY.appStoreGoogle}`,
        assignedTeamMemberId: TEAM.LISA,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        sortOrder: 101,
        isRequired: true,
      });

      // Task: Cancel Peptide Pro at end of access period
      const cancelDate = new Date();
      cancelDate.setMonth(cancelDate.getMonth() + config.communityAccessMonths);
      await db.createProjectTask({
        clientProjectId: result.clientProjectId,
        lifecycleStageId: 8, // Completion
        name: `Cancel Peptide Pro subscription for ${clientName}`,
        description: `${clientName}'s ${config.communityAccessMonths}-month Peptide Pro access expires. Cancel their subscription unless they've renewed.`,
        assignedTeamMemberId: TEAM.LISA,
        dueDate: cancelDate,
        sortOrder: 200,
        isRequired: true,
      });

      console.log(`[Onboarding] Created community access + Peptide Pro tasks for Lisa`);

      await logAutomationEvent(database, {
        eventType: "community_tasks_created",
        enrollmentId,
        clientId: result.clientId,
        clientProjectId: result.clientProjectId,
        teamMemberId: TEAM.LISA,
        details: JSON.stringify({
          communityCode: config.communityCode,
          communityAccessMonths: config.communityAccessMonths,
          peptideProCancelDate: cancelDate.toISOString(),
        }),
        triggeredBy,
      }, result);
    }
  } catch (err) {
    const msg = `Failed to create community tasks: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[Onboarding] ${msg}`);
    result.errors.push(msg);
  }

  // ============================================================
  // STEP 6: Create end-of-protocol reminder tasks
  // ============================================================
  try {
    if (result.clientProjectId) {
      const twoWeeksBeforeEnd = new Date();
      twoWeeksBeforeEnd.setMonth(twoWeeksBeforeEnd.getMonth() + config.durationMonths);
      twoWeeksBeforeEnd.setDate(twoWeeksBeforeEnd.getDate() - 14);

      // Task: Schedule wrap-up session with Jason
      await db.createProjectTask({
        clientProjectId: result.clientProjectId,
        lifecycleStageId: 8, // Completion
        name: `Schedule end-of-protocol wrap-up for ${clientName}`,
        description: `${clientName}'s ${config.programName} ends in 2 weeks. Schedule a wrap-up session with Jason to review results and discuss next steps.`,
        assignedTeamMemberId: TEAM.LISA,
        dueDate: twoWeeksBeforeEnd,
        sortOrder: 300,
        isRequired: true,
      });

      // Task: Shannon follow-up for renewal + testimonial
      await db.createProjectTask({
        clientProjectId: result.clientProjectId,
        lifecycleStageId: 8, // Completion
        name: `Follow up with ${clientName} - renewal + video testimonial`,
        description: `${clientName}'s ${config.programName} is ending. Follow up about:\n1. Renewal options (alumni program, next tier)\n2. Request a video testimonial\n3. Ask for referrals`,
        assignedTeamMemberId: TEAM.SHANNON,
        dueDate: twoWeeksBeforeEnd,
        sortOrder: 301,
        isRequired: true,
      });

      console.log(`[Onboarding] Created end-of-protocol reminder tasks`);

      await logAutomationEvent(database, {
        eventType: "end_of_protocol_tasks_created",
        enrollmentId,
        clientId: result.clientId,
        clientProjectId: result.clientProjectId,
        details: JSON.stringify({
          wrapUpDate: twoWeeksBeforeEnd.toISOString(),
          programDurationMonths: config.durationMonths,
        }),
        triggeredBy,
      }, result);
    }
  } catch (err) {
    const msg = `Failed to create end-of-protocol tasks: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[Onboarding] ${msg}`);
    result.errors.push(msg);
  }

  // ============================================================
  // STEP 7: Create admin notification
  // ============================================================
  try {
    await db.createNotificationsForEnabledUsers(
      "enrollment_onboarding",
      `Onboarding started for ${clientName}`,
      `${clientName} has been auto-enrolled in ${config.programName} (${tier} tier) after ${paymentMethod} payment of $${coachingFeeAmount}.\n\n` +
      `Client: ${result.clientId ? `#${result.clientId}` : 'Not linked'}\n` +
      `Protocol: ${result.clientProtocolId ? `#${result.clientProtocolId} (draft)` : 'Pending manual build'}\n` +
      `Project: ${result.clientProjectId ? `#${result.clientProjectId}` : 'Not created'}\n\n` +
      `Lisa has been assigned onboarding tasks. Jason has a 4-day deadline to build the protocol.`,
    );
    console.log(`[Onboarding] Admin notification created`);
  } catch (err) {
    console.error(`[Onboarding] Failed to create admin notification:`, err);
  }

  // ============================================================
  // STEP 8: Auto-create prospect record for Shannon's pipeline
  // ============================================================
  try {
    const { prospects } = await import('../../drizzle/schema');
    const { eq: eqOp } = await import('drizzle-orm');
    const crypto = await import('crypto');

    // Check if a prospect already exists for this email
    let existingProspect = null;
    // Dedup: check by email, then phone, then name
    if (clientEmail) {
      const normalizedEmail = clientEmail.toLowerCase().trim();
      const [found] = await database.select().from(prospects).where(eqOp(prospects.email, normalizedEmail));
      existingProspect = found || null;
    }
    if (!existingProspect && clientPhone && clientPhone !== 'not-provided') {
      const [byPhone] = await database.select().from(prospects).where(eqOp(prospects.phone, clientPhone));
      if (byPhone) existingProspect = byPhone;
    }
    if (!existingProspect && clientName) {
      const { like: likeOp } = await import('drizzle-orm');
      const [byName] = await database.select().from(prospects).where(likeOp(prospects.name, clientName));
      if (byName) existingProspect = byName;
    }

    if (existingProspect) {
      // Update existing prospect to enrolled status and link enrollment + fill missing fields
      const updates: any = {
        status: 'enrolled',
        enrollmentId: enrollmentId,
      };
      if (clientEmail && !existingProspect.email) updates.email = clientEmail.toLowerCase().trim();
      if (clientPhone && (existingProspect.phone === 'N/A' || existingProspect.phone === 'not-provided')) updates.phone = clientPhone;
      if (existingProspect.userId) updates.userId = existingProspect.userId;
      
      await database.update(prospects).set(updates).where(eqOp(prospects.id, existingProspect.id));
      console.log(`[Onboarding] Updated existing prospect #${existingProspect.id} (${existingProspect.name}) to enrolled status`);
    } else {
      // Create a new prospect so Shannon sees them in the pipeline
      const trackingToken = crypto.randomBytes(16).toString('hex');
      const phoneValue = clientPhone || 'not-provided';

      // Create or find unified contact
      const { findOrCreateContact } = await import('../contacts/contactService');
      const contact = await findOrCreateContact({
        fullName: clientName,
        email: clientEmail || null,
        phone: phoneValue,
        source: `${paymentMethod}-enrollment`,
        lifecycleStage: 'enrolled',
      });

      const SHANNON_TEAM_ID = 30001;
      const [insertResult] = await database.insert(prospects).values({
        name: clientName,
        email: clientEmail || null,
        phone: phoneValue,
        status: 'enrolled',
        source: `${paymentMethod}-enrollment`,
        notes: `Auto-created from ${tier} enrollment #${enrollmentId} ($${coachingFeeAmount} via ${paymentMethod}). Client paid and enrolled directly \u2014 did not come through SMS pipeline.`,
        trackingToken,
        enrollmentId: enrollmentId,
        lastContactedAt: new Date(),
        assignedTo: SHANNON_TEAM_ID,
        contactId: contact.id,
      });

      console.log(`[Onboarding] Created prospect #${insertResult.insertId} for ${clientName} (contact #${contact.id})`);
    }

    await logAutomationEvent(database, {
      eventType: 'prospect_auto_created',
      enrollmentId,
      clientId: result.clientId,
      details: JSON.stringify({
        clientName,
        clientEmail,
        tier,
        source: `${paymentMethod}-enrollment`,
        existingProspect: !!existingProspect,
      }),
      triggeredBy,
    }, result);
  } catch (err) {
    const msg = `Failed to auto-create prospect: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[Onboarding] ${msg}`);
    result.errors.push(msg);
    // Non-blocking - don't fail the whole onboarding for this
  }

  // ============================================================
  // STEP 9: Send onboarding welcome email to client
  // ============================================================
  try {
    const { sendOnboardingWelcomeEmail } = await import('../emailService');
    const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';

    await sendOnboardingWelcomeEmail({
      to: clientEmail,
      clientName,
      programName: config.programName,
      tier,
      communityCode: config.communityCode,
      communityAccessMonths: config.communityAccessMonths,
      omegaEliteSignupUrl: COMMUNITY.omegaEliteSignup,
      peptideProSignupUrl: COMMUNITY.peptideProSignup,
      appStoreApple: COMMUNITY.appStoreApple,
      appStoreGoogle: COMMUNITY.appStoreGoogle,
      baseUrl,
    });

    console.log(`[Onboarding] Welcome email sent to ${clientEmail}`);

    await logAutomationEvent(database, {
      eventType: "welcome_email_sent",
      enrollmentId,
      clientId: result.clientId,
      details: JSON.stringify({
        email: clientEmail,
        communityCode: config.communityCode,
        communityAccessMonths: config.communityAccessMonths,
      }),
      triggeredBy,
    }, result);
  } catch (err) {
    const msg = `Failed to send welcome email: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[Onboarding] ${msg}`);
    result.errors.push(msg);
    // Non-blocking — tasks for Lisa still exist as fallback
  }

  // ============================================================
  // DONE
  // ============================================================
  result.success = result.errors.length === 0;
  console.log(`[Onboarding] Automation ${result.success ? 'completed successfully' : 'completed with errors'} for ${clientName}`);
  if (result.errors.length > 0) {
    console.error(`[Onboarding] Errors:`, result.errors);
  }

  return result;
}

// ============================================================
// HELPER: Auto-assign project tasks to team members
// ============================================================
async function autoAssignProjectTasks(database: any, projectId: number, startDate: Date) {
  try {
    const tasks = await db.getProjectTasks(projectId);

    for (const task of tasks) {
      let assignedTo: number | null = null;
      let dueDate: Date | null = null;

      // Assign based on lifecycle stage
      switch (task.lifecycleStageId) {
        case 1: // Intake
          assignedTo = TEAM.LISA;
          dueDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days
          break;
        case 2: // Consult
          assignedTo = null; // Jason (admin)
          dueDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
          break;
        case 3: // Protocol Build
          assignedTo = null; // Jason (admin)
          dueDate = new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000); // 4 days
          break;
        case 4: // Billing
          assignedTo = TEAM.LISA;
          dueDate = new Date(startDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days
          break;
        case 5: // Fulfillment
          assignedTo = TEAM.KARI;
          dueDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
          break;
        case 6: // Onboarding
          assignedTo = TEAM.LISA;
          dueDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
          break;
        case 7: // Active Protocol
          assignedTo = TEAM.LISA;
          break;
        case 8: // Completion
          assignedTo = TEAM.SHANNON;
          break;
      }

      if (assignedTo || dueDate) {
        await db.updateProjectTask(task.id, {
          ...(assignedTo ? { assignedTeamMemberId: assignedTo } : {}),
          ...(dueDate ? { dueDate } : {}),
        });
      }
    }

    console.log(`[Onboarding] Auto-assigned ${tasks.length} tasks for project #${projectId}`);
  } catch (err) {
    console.error(`[Onboarding] Failed to auto-assign tasks:`, err);
  }
}

// ============================================================
// HELPER: Log automation event
// ============================================================
async function logAutomationEvent(
  database: any,
  event: {
    eventType: string;
    enrollmentId?: number;
    clientId?: number | null;
    clientProtocolId?: number | null;
    clientProjectId?: number | null;
    prospectId?: number;
    teamMemberId?: number;
    details?: string;
    triggeredBy: "payment" | "manual" | "cron" | "system";
  },
  result: OnboardingResult
) {
  try {
    const insertResult = await database.insert(automationEvents).values({
      eventType: event.eventType,
      enrollmentId: event.enrollmentId || null,
      clientId: event.clientId || null,
      clientProtocolId: event.clientProtocolId || null,
      clientProjectId: event.clientProjectId || null,
      prospectId: event.prospectId || null,
      teamMemberId: event.teamMemberId || null,
      details: event.details || null,
      status: "success",
      triggeredBy: event.triggeredBy,
    });
    result.automationEventIds.push(insertResult[0].insertId);
  } catch (err) {
    console.error(`[Onboarding] Failed to log automation event ${event.eventType}:`, err);
  }
}

// ============================================================
// EXPORTS for use in payment handlers
// ============================================================
export { TIER_CONFIG, TEAM, COMMUNITY };
