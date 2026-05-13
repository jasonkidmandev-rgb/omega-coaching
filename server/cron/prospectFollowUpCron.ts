/**
 * Prospect Follow-Up Cron Job
 * Sends automated follow-up SMS to prospects who haven't engaged
 * Schedule: Runs every 4 hours
 * Logic: Checks SMS templates with sendAfterHours set, sends follow-ups
 *        to prospects who were contacted but haven't clicked/enrolled
 */
import { getDb } from "../db";
import { prospects, smsMessages, smsTemplates } from "../../drizzle/schema";
import { eq, and, lt, isNull, sql, inArray, not } from "drizzle-orm";
import { sendSms, isSmsConfigured } from "../smsService";

let cronInterval: ReturnType<typeof setInterval> | null = null;

export function initProspectFollowUpCron() {
  // Run every 4 hours
  const INTERVAL = 4 * 60 * 60 * 1000;
  
  console.log("[Prospect Follow-Up Cron] Initialized, running every 4 hours");
  
  // Run once after a short delay, then on interval
  setTimeout(() => runFollowUpCheck(), 60000);
  cronInterval = setInterval(() => runFollowUpCheck(), INTERVAL);
}

async function runFollowUpCheck() {
  try {
    const db = await getDb();
    if (!db) return;
    
    // Get all active follow-up templates (those with sendAfterHours set)
    const followUpTemplates = await db
      .select()
      .from(smsTemplates)
      .where(
        and(
          eq(smsTemplates.isActive, true),
          sql`${smsTemplates.sendAfterHours} IS NOT NULL`,
          eq(smsTemplates.category, "follow_up")
        )
      );
    
    if (followUpTemplates.length === 0) return;
    
    // Get prospects eligible for follow-up:
    // - Status is 'contacted' (sent initial SMS but no click)
    // - Not opted out
    // - Follow-up not paused
    // - Max follow-ups not reached (cap at 3)
    const eligibleProspects = await db
      .select()
      .from(prospects)
      .where(
        and(
          inArray(prospects.status, ["contacted", "new"]),
          eq(prospects.smsOptOut, false),
          eq(prospects.followUpPaused, false),
          lt(prospects.followUpCount, 3)
        )
      );
    
    if (eligibleProspects.length === 0) return;
    
    const baseUrl = process.env.VITE_APP_URL || "";
    const now = new Date();
    let sentCount = 0;
    
    for (const prospect of eligibleProspects) {
      // Find the appropriate follow-up template based on time since last contact
      const lastContact = prospect.lastContactedAt;
      if (!lastContact) continue;
      
      const hoursSinceContact = (now.getTime() - new Date(lastContact).getTime()) / (1000 * 60 * 60);
      
      // Find the best matching template
      const matchingTemplate = followUpTemplates
        .filter(t => t.sendAfterHours && hoursSinceContact >= t.sendAfterHours)
        .sort((a, b) => (b.sendAfterHours || 0) - (a.sendAfterHours || 0))[0];
      
      if (!matchingTemplate) continue;
      
      // Check if we already sent this template to this prospect
      const alreadySent = await db
        .select({ id: smsMessages.id })
        .from(smsMessages)
        .where(
          and(
            eq(smsMessages.prospectId, prospect.id),
            eq(smsMessages.templateKey, matchingTemplate.templateKey)
          )
        );
      
      if (alreadySent.length > 0) continue;
      
      // Build the tracked link
      const trackedLink = `${baseUrl}/api/prospect/click/${prospect.trackingToken}?dest=${encodeURIComponent("/transformation")}`;
      
      // Render the template
      const firstName = prospect.name.split(" ")[0];
      let body = matchingTemplate.body
        .replace(/\{\{name\}\}/g, firstName)
        .replace(/\{\{link\}\}/g, trackedLink);
      
      // Send the SMS
      const result = await sendSms({ to: prospect.phone, body });
      
      // Record the message
      await db.insert(smsMessages).values({
        prospectId: prospect.id,
        direction: "outbound",
        toPhone: prospect.phone,
        fromPhone: process.env.TWILIO_PHONE_NUMBER || "not_configured",
        body,
        status: result.success ? (result.twilioSid ? "sent" : "not_configured") : "failed",
        twilioSid: result.twilioSid || null,
        templateKey: matchingTemplate.templateKey,
      });
      
      // Update prospect
      await db.update(prospects).set({
        lastContactedAt: new Date(),
        totalSmsSent: sql`${prospects.totalSmsSent} + 1`,
        followUpCount: sql`${prospects.followUpCount} + 1`,
      }).where(eq(prospects.id, prospect.id));
      
      sentCount++;
      console.log(`[Prospect Follow-Up Cron] Sent follow-up "${matchingTemplate.name}" to ${prospect.name}`);
    }
    
    if (sentCount > 0) {
      console.log(`[Prospect Follow-Up Cron] Sent ${sentCount} follow-up messages`);
    }
  } catch (error) {
    console.error("[Prospect Follow-Up Cron] Error:", error);
  }
}
