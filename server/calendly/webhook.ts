/**
 * Calendly Webhook Handler
 * Receives real-time notifications from Calendly when events are created/canceled
 * Invalidates the cache so the Appointments page shows fresh data
 */
import { Router } from "express";
import crypto from "crypto";
import { invalidateCalendlyCache } from "./service";
import * as db from "../db";
import { getDb } from "../db";
import { transformationEnrollments, projectTasks, automationEvents, clientProjects } from "../../drizzle/schema";
import { eq, and, or } from "drizzle-orm";

const router = Router();

// Team member IDs (must match lifecycleAdvancement.ts TEAM constants)
const TEAM_SHANNON = 30001;
const TEAM_JASON = 30004;

/**
 * Verify Calendly webhook signature
 * Uses HMAC-SHA256 with the signing key
 */
function verifySignature(
  payload: string,
  signatureHeader: string,
  signingKey: string
): boolean {
  try {
    // Parse the signature header: t=<timestamp>,v1=<signature>
    const parts: Record<string, string> = {};
    signatureHeader.split(",").forEach((part) => {
      const [key, value] = part.split("=");
      if (key && value) parts[key.trim()] = value.trim();
    });

    const timestamp = parts["t"];
    const signature = parts["v1"];

    if (!timestamp || !signature) {
      console.error("[Calendly Webhook] Missing timestamp or signature in header");
      return false;
    }

    // Check for replay attacks (reject if older than 5 minutes)
    const tolerance = 5 * 60; // 5 minutes in seconds
    const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (Math.abs(timestampAge) > tolerance) {
      console.error(`[Calendly Webhook] Timestamp too old: ${timestampAge}s`);
      return false;
    }

    // Create signed payload: timestamp.body
    const signedPayload = `${timestamp}.${payload}`;

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac("sha256", signingKey)
      .update(signedPayload)
      .digest("hex");

    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    console.error("[Calendly Webhook] Signature verification error:", error);
    return false;
  }
}

/**
 * When a Calendly booking is created, auto-complete scheduling tasks
 * and create a "Complete session" task for Jason.
 */
async function handleBookingCreated(eventPayload: any): Promise<void> {
  const inviteeEmail = eventPayload?.email?.toLowerCase();
  const inviteeName = eventPayload?.name || "Unknown";
  const eventName = eventPayload?.event_type?.name || eventPayload?.scheduled_event?.name || "";
  const startTime = eventPayload?.scheduled_event?.start_time || eventPayload?.event?.start_time || null;

  if (!inviteeEmail) {
    console.log("[Calendly Webhook] No invitee email found, skipping task automation");
    return;
  }

  console.log(`[Calendly Webhook] Processing booking for ${inviteeName} (${inviteeEmail}), event: ${eventName}`);

  const database = await getDb();
  if (!database) {
    console.error("[Calendly Webhook] Database not available for task automation");
    return;
  }

  try {
    // Find the enrollment by email
    const [enrollment] = await database.select()
      .from(transformationEnrollments)
      .where(eq(transformationEnrollments.email, inviteeEmail));

    if (!enrollment) {
      console.log(`[Calendly Webhook] No enrollment found for ${inviteeEmail}, skipping task automation`);
      return;
    }

    const clientName = enrollment.clientName || inviteeName;

    // Check for duplicate processing
    const [existingEvent] = await database.select()
      .from(automationEvents)
      .where(and(
        eq(automationEvents.eventType, "calendly_booking_task_automation"),
        eq(automationEvents.enrollmentId, enrollment.id),
      ));

    if (existingEvent) {
      console.log(`[Calendly Webhook] Already processed booking automation for enrollment #${enrollment.id}, skipping`);
      return;
    }

    // Find the client project for this enrollment
    let clientProjectId: number | null = null;
    if (enrollment.clientProtocolId) {
      const [project] = await database.select({ id: clientProjects.id })
        .from(clientProjects)
        .where(eq(clientProjects.clientProtocolId, enrollment.clientProtocolId));
      clientProjectId = project?.id || null;
    }

    // If no project found via protocol, try by email
    if (!clientProjectId) {
      const [project] = await database.select({ id: clientProjects.id })
        .from(clientProjects)
        .where(eq(clientProjects.clientEmail, inviteeEmail));
      clientProjectId = project?.id || null;
    }

    let tasksCompleted = 0;
    let tasksCreated = 0;

    // Auto-complete any scheduling tasks that are still pending/in_progress
    if (clientProjectId) {
      const schedulingTasks = await database.select()
        .from(projectTasks)
        .where(and(
          eq(projectTasks.clientProjectId, clientProjectId),
          or(
            eq(projectTasks.status, "pending"),
            eq(projectTasks.status, "in_progress"),
          ),
        ));

      for (const task of schedulingTasks) {
        const taskNameLower = task.name.toLowerCase();
        const isSchedulingTask = (
          taskNameLower.includes("schedule strategy session") ||
          taskNameLower.includes("schedule discovery session") ||
          taskNameLower.includes("schedule strategy") ||
          taskNameLower.includes("schedule discovery")
        );

        if (isSchedulingTask) {
          await db.updateProjectTask(task.id, {
            status: "completed",
            completedAt: new Date(),
            completedByTeamMemberId: null, // Auto-completed by system
          });
          tasksCompleted++;
          console.log(`[Calendly Webhook] Auto-completed task #${task.id}: "${task.name}"`);
        }
      }

      // Create a "Complete strategy session" task for Jason
      const sessionDate = startTime ? new Date(startTime) : new Date();
      const dueDate = new Date(sessionDate);
      dueDate.setHours(dueDate.getHours() + 1); // Due 1 hour after session start

      const taskId = await db.createProjectTask({
        clientProjectId,
        lifecycleStageId: 2, // Consult stage
        name: `Complete strategy session for ${clientName}`,
        description: `Strategy session booked via Calendly. ${startTime ? `Scheduled for ${new Date(startTime).toLocaleString("en-US", { timeZone: "America/Denver" })}. ` : ""}Review intake form, conduct the session, and document notes afterward.`,
        assignedTeamMemberId: TEAM_JASON,
        dueDate,
        sortOrder: 50,
        isRequired: true,
      });
      tasksCreated++;
      console.log(`[Calendly Webhook] Created "Complete strategy session" task #${taskId} for Jason`);

      // Notify Jason about the new task
      try {
        await db.notifyTaskAssignment(taskId, TEAM_JASON, `Complete strategy session for ${clientName}`, clientProjectId);
      } catch (err) {
        console.error(`[Calendly Webhook] Failed to notify Jason about task:`, err);
      }
    }

    // Update enrollment with scheduled date if not already set
    if (!enrollment.discoverySessionScheduledAt && startTime) {
      await database.update(transformationEnrollments)
        .set({ discoverySessionScheduledAt: startTime })
        .where(eq(transformationEnrollments.id, enrollment.id));
      console.log(`[Calendly Webhook] Updated enrollment #${enrollment.id} discoverySessionScheduledAt`);
    }

    // Log automation event to prevent duplicates
    await database.insert(automationEvents).values({
      eventType: "calendly_booking_task_automation",
      enrollmentId: enrollment.id,
      clientProjectId: clientProjectId || undefined,
      details: JSON.stringify({
        inviteeEmail,
        inviteeName,
        eventName,
        startTime,
        tasksCompleted,
        tasksCreated,
        clientName,
      }),
      status: "success",
      triggeredBy: "system",
    });

    console.log(`[Calendly Webhook] Booking automation complete for ${clientName}: ${tasksCompleted} tasks completed, ${tasksCreated} tasks created`);
  } catch (error: any) {
    console.error(`[Calendly Webhook] Error in booking automation:`, error.message);
  }
}

/**
 * POST /api/calendly/webhook
 * Receives webhook events from Calendly
 */
router.post("/webhook", (req, res) => {
  try {
    const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
    const signatureHeader = req.headers["calendly-webhook-signature"] as string;

    // If we have a signing key, verify the signature
    if (signingKey && signatureHeader) {
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const isValid = verifySignature(rawBody, signatureHeader, signingKey);
      if (!isValid) {
        console.warn("[Calendly Webhook] Invalid signature, rejecting");
        return res.status(403).json({ error: "Invalid signature" });
      }
    }

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const eventType = event?.event;
    const eventPayload = event?.payload;

    console.log(`[Calendly Webhook] Received event: ${eventType}`);

    // Handle supported events
    switch (eventType) {
      case "invitee.created":
        console.log(
          `[Calendly Webhook] New booking: ${eventPayload?.name || "Unknown"} - ${eventPayload?.email || "Unknown"}`
        );
        // Invalidate cache so next fetch gets fresh data
        invalidateCalendlyCache();
        // Auto-complete scheduling tasks and create session tasks for Jason
        handleBookingCreated(eventPayload).catch(err => {
          console.error("[Calendly Webhook] handleBookingCreated error:", err);
        });
        break;

      case "invitee.canceled":
        console.log(
          `[Calendly Webhook] Cancellation: ${eventPayload?.name || "Unknown"} - ${eventPayload?.email || "Unknown"}`
        );
        invalidateCalendlyCache();
        break;

      case "invitee_no_show.created":
        console.log(
          `[Calendly Webhook] No-show: ${eventPayload?.name || "Unknown"}`
        );
        invalidateCalendlyCache();
        break;

      case "routing_form_submission.created":
        console.log("[Calendly Webhook] Routing form submission received");
        break;

      default:
        console.log(`[Calendly Webhook] Unhandled event type: ${eventType}`);
    }

    // Always respond 200 to acknowledge receipt
    return res.status(200).json({ received: true, event: eventType });
  } catch (error: any) {
    console.error("[Calendly Webhook] Error processing webhook:", error.message);
    // Still return 200 to prevent Calendly from retrying
    return res.status(200).json({ received: true, error: "Processing error" });
  }
});

export default router;
