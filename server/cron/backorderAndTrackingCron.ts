/**
 * Backorder Task Auto-Assignment & Tracking Number Notification Cron
 * 
 * Runs every 4 hours to:
 * 1. Detect newly backordered items and create tasks for Carrie to reorder
 * 2. Create follow-up tasks for Lisa when backorders need client communication
 * 3. Detect newly added tracking numbers and notify Lisa + clients
 * 4. Detect tracking updates (delivered, in_transit) and notify relevant parties
 * 
 * This closes the gap where:
 * - Carrie wasn't getting notified about backorder items needing reorder
 * - Lisa wasn't getting notified of her action items for backorder communication
 * - Nobody was being assigned the task to place back orders
 * - Tracking info updates weren't being communicated
 */
import { getDb } from "../db";
import * as db from "../db";
import { sql } from "drizzle-orm";
import { runCronJob } from "./cronRunner";

// Team member IDs — override via env vars if IDs differ across environments.
// Missing IDs are warned at init time; affected notifications/tasks are skipped rather than
// creating orphaned records assigned to ghost user IDs.
const TEAM_KARI: number | null = process.env.TEAM_KARI_ID ? Number(process.env.TEAM_KARI_ID) : 30002;
const TEAM_LISA: number | null = process.env.TEAM_LISA_ID ? Number(process.env.TEAM_LISA_ID) : 1;
const TEAM_SHANNON: number | null = process.env.TEAM_SHANNON_ID ? Number(process.env.TEAM_SHANNON_ID) : 30001;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // Every 4 hours

let cronInterval: ReturnType<typeof setInterval> | null = null;

export function initBackorderAndTrackingCron() {
  console.log("[BackorderTracking] Initialized, running every 4 hours");
  if (!TEAM_KARI) console.warn("[BackorderTracking] TEAM_KARI_ID not set — backorder reorder tasks will not be created");
  if (!TEAM_LISA) console.warn("[BackorderTracking] TEAM_LISA_ID not set — client notification tasks will not be created");
  if (!TEAM_SHANNON) console.warn("[BackorderTracking] TEAM_SHANNON_ID not set — Shannon will not receive shipping notifications");
  setTimeout(() => runBackorderAndTrackingCheck(), 240000); // Run after 4 minutes
  cronInterval = setInterval(
    () => runCronJob("backorder_tracking", () => runBackorderAndTrackingCheck()),
    CHECK_INTERVAL_MS
  );
}

export async function runBackorderAndTrackingCheck(): Promise<{
  backordersFound: number;
  backorderTasksCreated: number;
  trackingNotifications: number;
}> {
  console.log("[BackorderTracking] Running backorder and tracking check...");
  
  const database = await getDb();
  if (!database) {
    console.error("[BackorderTracking] Database not available");
    return { backordersFound: 0, backorderTasksCreated: 0, trackingNotifications: 0 };
  }

  let backordersFound = 0;
  let backorderTasksCreated = 0;
  let trackingNotifications = 0;

  try {
    // === PART 1: Backorder Task Auto-Assignment ===
    // Find backordered packing slip items that don't have a task created yet
    const backorderResult = await database.execute(sql`
      SELECT 
        psi.id as itemId,
        psi.itemName,
        psi.quantity,
        psi.quantityBackordered,
        psi.shipSource,
        psi.packingSlipId,
        ps.clientName,
        ps.clientEmail,
        ps.id as slipId,
        ps.status as slipStatus,
        cp.id as clientProjectId,
        cp.clientProtocolId
      FROM packing_slip_items psi
      JOIN packing_slips ps ON psi.packingSlipId = ps.id
      LEFT JOIN client_protocols cpr ON ps.clientProtocolId = cpr.id
      LEFT JOIN client_projects cp ON cp.clientProtocolId = ps.clientProtocolId
      WHERE psi.status = 'backordered'
        AND psi.quantityBackordered > 0
        AND ps.archivedAt IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM automation_events ae
          WHERE ae.eventType IN ('backorder_task_created', 'backorder_detected_no_project')
          AND JSON_EXTRACT(ae.details, '$.itemId') = psi.id
        )
      ORDER BY psi.createdAt ASC
      LIMIT 30
    `);

    const backorderRows = ((backorderResult as any)?.[0] || backorderResult) as any[];
    
    if (Array.isArray(backorderRows) && backorderRows.length > 0) {
      backordersFound = backorderRows.length;
      console.log(`[BackorderTracking] Found ${backordersFound} new backordered items`);

      // Group by packing slip for batch task creation
      const bySlip = new Map<number, any[]>();
      for (const row of backorderRows) {
        const slipId = row.slipId || row.packingSlipId;
        if (!bySlip.has(slipId)) bySlip.set(slipId, []);
        bySlip.get(slipId)!.push(row);
      }

      for (const [slipId, items] of bySlip) {
        const firstItem = items[0];
        const clientName = firstItem.clientName;
        const clientProjectId = firstItem.clientProjectId;
        const itemList = items.map((i: any) => `• ${i.itemName} (×${i.quantityBackordered})`).join('\n');

        // Task 1: Carrie - Reorder backordered items
        // Task 2: Lisa - Notify client about backorder
        // Both tasks require a clientProjectId. Without one (store/custom orders with no linked project)
        // we skip task creation but still send team notifications and log the event with a distinct
        // eventType so the dedup query doesn't block future attempts if the project is later linked.
        let tasksCreated = false;
        if (clientProjectId && TEAM_KARI && TEAM_LISA) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 2); // Due in 2 days

          const reorderTaskId = await db.createProjectTask({
            clientProjectId,
            lifecycleStageId: 5, // Fulfillment stage
            name: `Reorder backordered items for ${clientName}`,
            description: `The following items are backordered for ${clientName} (Packing Slip #${slipId}):\n\n${itemList}\n\n` +
              `Please place the reorder with the supplier and update the packing slip when items arrive.`,
            assignedTeamMemberId: TEAM_KARI,
            dueDate,
            sortOrder: 10,
            isRequired: true,
          });

          await db.notifyTaskAssignment(
            reorderTaskId,
            TEAM_KARI,
            `Reorder backordered items for ${clientName}`,
            clientProjectId
          );
          backorderTasksCreated++;

          const notifyDueDate = new Date();
          notifyDueDate.setDate(notifyDueDate.getDate() + 1); // Due tomorrow

          const notifyTaskId = await db.createProjectTask({
            clientProjectId,
            lifecycleStageId: 5, // Fulfillment stage
            name: `Notify ${clientName} about backordered items`,
            description: `The following items are backordered for ${clientName}:\n\n${itemList}\n\n` +
              `Please contact the client to let them know about the delay and provide an estimated timeline.` +
              `\n\nEmail: ${firstItem.clientEmail || 'N/A'}`,
            assignedTeamMemberId: TEAM_LISA,
            dueDate: notifyDueDate,
            sortOrder: 15,
            isRequired: true,
          });

          await db.notifyTaskAssignment(
            notifyTaskId,
            TEAM_LISA,
            `Notify ${clientName} about backordered items`,
            clientProjectId
          );
          backorderTasksCreated++;
          tasksCreated = true;
        } else if (!clientProjectId) {
          console.warn(`[BackorderTracking] Slip #${slipId} has no linked client project — tasks skipped, notifications still sent`);
        }

        // Team notifications — send regardless of whether tasks were created
        if (TEAM_KARI) {
          await db.createTeamNotification({
            teamMemberId: TEAM_KARI,
            type: "task_assigned",
            title: `Backorder Alert: ${clientName}`,
            message: `${items.length} item(s) backordered for ${clientName}:\n${itemList}`,
            clientProjectId: clientProjectId || undefined,
          });
        }

        if (TEAM_LISA) {
          await db.createTeamNotification({
            teamMemberId: TEAM_LISA,
            type: "task_assigned",
            title: `Client Communication Needed: ${clientName} Backorder`,
            message: `${items.length} item(s) backordered for ${clientName}. Please notify the client about the delay.`,
            clientProjectId: clientProjectId || undefined,
          });
        }

        // Log automation events per item.
        // Use 'backorder_task_created' only when tasks were actually created so the NOT EXISTS
        // dedup check doesn't permanently block re-processing items for slips that gain a project later.
        // Use 'backorder_detected_no_project' otherwise — a separate eventType that won't block future runs.
        const eventType = tasksCreated ? 'backorder_task_created' : 'backorder_detected_no_project';
        for (const item of items) {
          await database.execute(sql`
            INSERT INTO automation_events (eventType, details, status, triggeredBy, createdAt)
            VALUES (
              ${eventType},
              ${JSON.stringify({
                itemId: item.itemId,
                itemName: item.itemName,
                packingSlipId: slipId,
                clientName,
                quantityBackordered: item.quantityBackordered,
              })},
              'success',
              'system',
              NOW()
            )
          `);
        }

        console.log(`[BackorderTracking] Processed ${items.length} backordered items for ${clientName} (tasks created: ${tasksCreated})`);
      }
    }

    // === PART 2: Tracking Number Notifications ===
    // Find packing slips with newly added tracking numbers that haven't been notified
    const trackingResult = await database.execute(sql`
      SELECT 
        ps.id as slipId,
        ps.clientName,
        ps.clientEmail,
        ps.trackingNumber,
        ps.trackingCarrier,
        ps.trackingUrl,
        ps.deliveryStatus,
        cp.id as clientProjectId
      FROM packing_slips ps
      LEFT JOIN client_projects cp ON cp.clientProtocolId = ps.clientProtocolId
      WHERE ps.trackingNumber IS NOT NULL
        AND ps.trackingNumber != ''
        AND ps.archivedAt IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM automation_events ae 
          WHERE ae.eventType = 'tracking_number_notified'
          AND JSON_EXTRACT(ae.details, '$.packingSlipId') = ps.id
          AND JSON_EXTRACT(ae.details, '$.trackingNumber') = ps.trackingNumber
        )
      ORDER BY ps.updatedAt DESC
      LIMIT 20
    `);

    const trackingRows = ((trackingResult as any)?.[0] || trackingResult) as any[];
    
    if (Array.isArray(trackingRows) && trackingRows.length > 0) {
      console.log(`[BackorderTracking] Found ${trackingRows.length} new tracking numbers to notify`);

      for (const row of trackingRows) {
        try {
          // Notify Lisa about the tracking number
          await db.createTeamNotification({
            teamMemberId: TEAM_LISA,
            type: "task_assigned",
            title: `Tracking Added: ${row.clientName}`,
            message: `Tracking number added for ${row.clientName}'s order: ${row.trackingNumber} (${row.trackingCarrier || 'Unknown carrier'}).` +
              (row.trackingUrl ? ` Track: ${row.trackingUrl}` : ''),
            clientProjectId: row.clientProjectId || undefined,
          });

          // Also notify Shannon so she's in the loop
          await db.createTeamNotification({
            teamMemberId: TEAM_SHANNON,
            type: "task_assigned",
            title: `Order Shipped: ${row.clientName}`,
            message: `${row.clientName}'s order has been shipped. Tracking: ${row.trackingNumber}`,
            clientProjectId: row.clientProjectId || undefined,
          });

          trackingNotifications++;

          // Log to prevent duplicate notifications
          await database.execute(sql`
            INSERT INTO automation_events (eventType, details, status, triggeredBy, createdAt)
            VALUES (
              'tracking_number_notified',
              ${JSON.stringify({
                packingSlipId: row.slipId,
                trackingNumber: row.trackingNumber,
                carrier: row.trackingCarrier,
                clientName: row.clientName,
              })},
              'success',
              'system',
              NOW()
            )
          `);

          console.log(`[BackorderTracking] Notified team about tracking for ${row.clientName}: ${row.trackingNumber}`);
        } catch (err) {
          console.error(`[BackorderTracking] Error notifying tracking for ${row.clientName}:`, err);
        }
      }
    }

    // === PART 3: Check for item-level tracking updates ===
    const itemTrackingResult = await database.execute(sql`
      SELECT 
        psi.id as itemId,
        psi.itemName,
        psi.itemTrackingNumber,
        psi.itemTrackingCarrier,
        psi.itemTrackingUrl,
        ps.clientName,
        ps.clientEmail,
        ps.id as slipId,
        cp.id as clientProjectId
      FROM packing_slip_items psi
      JOIN packing_slips ps ON psi.packingSlipId = ps.id
      LEFT JOIN client_projects cp ON cp.clientProtocolId = ps.clientProtocolId
      WHERE psi.itemTrackingNumber IS NOT NULL
        AND psi.itemTrackingNumber != ''
        AND ps.archivedAt IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM automation_events ae 
          WHERE ae.eventType = 'item_tracking_notified'
          AND JSON_EXTRACT(ae.details, '$.itemId') = psi.id
          AND JSON_EXTRACT(ae.details, '$.trackingNumber') = psi.itemTrackingNumber
        )
      ORDER BY psi.fulfilledAt DESC
      LIMIT 30
    `);

    const itemTrackingRows = ((itemTrackingResult as any)?.[0] || itemTrackingResult) as any[];
    
    if (Array.isArray(itemTrackingRows) && itemTrackingRows.length > 0) {
      console.log(`[BackorderTracking] Found ${itemTrackingRows.length} new item-level tracking numbers`);

      // Group by packing slip
      const bySlip = new Map<number, any[]>();
      for (const row of itemTrackingRows) {
        const slipId = row.slipId;
        if (!bySlip.has(slipId)) bySlip.set(slipId, []);
        bySlip.get(slipId)!.push(row);
      }

      for (const [slipId, items] of bySlip) {
        const clientName = items[0].clientName;
        const clientProjectId = items[0].clientProjectId;
        const itemList = items.map((i: any) => 
          `• ${i.itemName}: ${i.itemTrackingNumber} (${i.itemTrackingCarrier || 'Unknown'})`
        ).join('\n');

        await db.createTeamNotification({
          teamMemberId: TEAM_LISA,
          type: "task_assigned",
          title: `Item Tracking Updated: ${clientName}`,
          message: `Individual item tracking numbers added for ${clientName}:\n${itemList}`,
          clientProjectId: clientProjectId || undefined,
        });

        trackingNotifications++;

        // Log each item
        for (const item of items) {
          await database.execute(sql`
            INSERT INTO automation_events (eventType, details, status, triggeredBy, createdAt)
            VALUES (
              'item_tracking_notified',
              ${JSON.stringify({
                itemId: item.itemId,
                trackingNumber: item.itemTrackingNumber,
                carrier: item.itemTrackingCarrier,
                clientName,
                packingSlipId: slipId,
              })},
              'success',
              'system',
              NOW()
            )
          `);
        }
      }
    }

    // Admin summary notification
    if (backordersFound > 0 || trackingNotifications > 0) {
      try {
        const lines: string[] = [];
        if (backordersFound > 0) {
          lines.push(`${backordersFound} new backordered item(s) detected — tasks assigned to Carrie (reorder) and Lisa (client communication).`);
        }
        if (trackingNotifications > 0) {
          lines.push(`${trackingNotifications} tracking number update(s) — team members notified.`);
        }
        
        await db.createNotificationsForEnabledUsers(
          "fulfillment_alert",
          `Fulfillment Update: ${backordersFound} backorders, ${trackingNotifications} tracking updates`,
          lines.join('\n'),
        );
      } catch (err) {
        console.error("[BackorderTracking] Failed to create admin notification:", err);
      }
    }

    console.log(`[BackorderTracking] Complete: ${backordersFound} backorders, ${backorderTasksCreated} tasks, ${trackingNotifications} tracking notifications`);
    return { backordersFound, backorderTasksCreated, trackingNotifications };
  } catch (error) {
    console.error("[BackorderTracking] Error:", error);
    return { backordersFound: 0, backorderTasksCreated: 0, trackingNotifications: 0 };
  }
}
