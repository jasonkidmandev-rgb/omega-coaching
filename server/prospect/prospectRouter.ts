import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb, createNotificationsForEnabledUsers } from "../db";
import { eq, desc, and, sql, inArray, isNull, isNotNull, lte } from "drizzle-orm";
import { prospects, smsMessages, prospectEngagement, smsTemplates } from "../../drizzle/schema";
import { sendSms, isSmsConfigured, formatPhoneE164, formatPhoneDisplay } from "../smsService";
import { ENV } from "../_core/env";
import crypto from "crypto";
import { findOrCreateContact } from "../contacts/contactService";
import { propagateContactChanges } from "../contacts/propagateContactChanges";

async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

function generateTrackingToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

function buildTrackedLink(baseUrl: string, trackingToken: string, destination?: string): string {
  const dest = destination || "/transformation";
  return `${baseUrl}/api/prospect/click/${trackingToken}?dest=${encodeURIComponent(dest)}`;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export const prospectRouter = router({
  // ========== SMS Configuration Status ==========
  getSmsStatus: adminProcedure.query(async () => {
    return {
      configured: isSmsConfigured(),
      phoneNumber: ENV.twilioPhoneNumber || null,
    };
  }),

  // ========== Prospect CRUD ==========
  list: adminProcedure
    .input(z.object({
      status: z.enum(["all", "new", "contacted", "clicked", "viewing", "enrolled", "declined", "stalled", "engaged", "waiting_on_client", "ready_for_consult", "not_ready"]).default("all"),
    }).optional())
    .query(async ({ input }) => {
      const d = await db();
      const status = input?.status || "all";
      
      let query;
      if (status === "all") {
        query = d.select().from(prospects).orderBy(desc(prospects.createdAt));
      } else {
        query = d.select().from(prospects)
          .where(eq(prospects.status, status))
          .orderBy(desc(prospects.createdAt));
      }
      
      const rows = await query;
      
      // Enrich with linked client/enrollment/project data
      const enrichedRows = await Promise.all(rows.map(async (r) => {
        let clientData = null;
        let enrollmentData = null;
        let projectData = null;
        
        // Get linked client
        if (r.clientId) {
          const [client] = await d.execute(sql`SELECT id, name, email, phone FROM clients WHERE id = ${r.clientId}`);
          if (client) clientData = client;
        }
        
        // Get linked enrollment
        if (r.enrollmentId) {
          const [enrollment] = await d.execute(sql`SELECT id, tier, status, coachingFeePaid, coachingFeeAmount, enrolledAt FROM transformation_enrollments WHERE id = ${r.enrollmentId}`);
          if (enrollment) enrollmentData = enrollment;
        } else if (r.clientId) {
          // Try to find enrollment by clientId
          const enrollments = await d.execute(sql`SELECT id, tier, status, coachingFeePaid, coachingFeeAmount, enrolledAt FROM transformation_enrollments WHERE clientId = ${r.clientId} ORDER BY createdAt DESC LIMIT 1`);
          if (enrollments.length > 0) enrollmentData = enrollments[0];
        }
        
        // Get linked project (active only)
        if (r.clientId) {
          const projects = await d.execute(sql`SELECT id, clientName, status, currentLifecycleStageId, assignedTeamMemberId FROM client_projects WHERE clientName = ${r.name} AND status != 'cancelled' ORDER BY createdAt DESC LIMIT 1`);
          if (projects.length > 0) projectData = projects[0];
        } else {
          // Try by name match
          const projects = await d.execute(sql`SELECT id, clientName, status, currentLifecycleStageId, assignedTeamMemberId FROM client_projects WHERE clientName = ${r.name} AND status != 'cancelled' ORDER BY createdAt DESC LIMIT 1`);
          if (projects.length > 0) projectData = projects[0];
        }
        
        // Get assigned team member name if project has one
        let assignedCoachName = null;
        if (projectData?.assignedTeamMemberId) {
          const members = await d.execute(sql`SELECT name FROM team_members WHERE id = ${projectData.assignedTeamMemberId}`);
          if (members.length > 0) assignedCoachName = members[0].name;
        }
        
        return {
          ...r,
          phoneDisplay: formatPhoneDisplay(r.phone),
          linkedClient: clientData,
          linkedEnrollment: enrollmentData ? {
            id: enrollmentData.id,
            tier: enrollmentData.tier,
            status: enrollmentData.status,
            paid: enrollmentData.coachingFeePaid,
            amount: enrollmentData.coachingFeeAmount,
            enrolledAt: enrollmentData.enrolledAt,
          } : null,
          linkedProject: projectData ? {
            id: projectData.id,
            status: projectData.status,
            lifecycleStage: projectData.currentLifecycleStageId,
            assignedCoachName,
          } : null,
        };
      }));
      
      return enrichedRows;
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const d = await db();
      const [prospect] = await d.select().from(prospects).where(eq(prospects.id, input.id));
      if (!prospect) return null;
      
      // Get engagement history
      const engagement = await d.select().from(prospectEngagement)
        .where(eq(prospectEngagement.prospectId, input.id))
        .orderBy(desc(prospectEngagement.createdAt))
        .limit(50);
      
      // Get SMS history
      const messages = await d.select().from(smsMessages)
        .where(eq(smsMessages.prospectId, input.id))
        .orderBy(desc(smsMessages.createdAt))
        .limit(50);
      
      return {
        ...prospect,
        phoneDisplay: formatPhoneDisplay(prospect.phone),
        engagement,
        messages,
      };
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().min(10),
      source: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await db();
      const e164 = formatPhoneE164(input.phone);
      const normalizedPhone = e164 || input.phone;
      const normalizedEmail = input.email?.toLowerCase().trim() || null;
      
      // --- DEDUPLICATION CHECK ---
      // Check by email first, then by phone
      let existingProspect = null;
      if (normalizedEmail) {
        const [byEmail] = await d.select().from(prospects).where(eq(prospects.email, normalizedEmail));
        if (byEmail) existingProspect = byEmail;
      }
      if (!existingProspect && normalizedPhone && normalizedPhone !== 'N/A' && normalizedPhone !== 'not-provided') {
        const [byPhone] = await d.select().from(prospects).where(eq(prospects.phone, normalizedPhone));
        if (byPhone) existingProspect = byPhone;
      }
      
      if (existingProspect) {
        // Update existing prospect with any new info instead of creating duplicate
        const updates: any = { updatedAt: new Date() };
        if (normalizedEmail && !existingProspect.email) updates.email = normalizedEmail;
        if (normalizedPhone && (existingProspect.phone === 'N/A' || existingProspect.phone === 'not-provided')) updates.phone = normalizedPhone;
        if (input.notes) {
          updates.notes = existingProspect.notes 
            ? `${existingProspect.notes}\n\n[Merge] ${input.notes}` 
            : input.notes;
        }
        if (input.source && !existingProspect.source) updates.source = input.source;
        
        await d.update(prospects).set(updates).where(eq(prospects.id, existingProspect.id));
        return { id: existingProspect.id, trackingToken: existingProspect.trackingToken, merged: true, message: `Merged with existing prospect "${existingProspect.name}" (#${existingProspect.id})` };
      }
      
      // No duplicate found — create new
      // Auto-assign to Shannon (team member ID 30001) for pipeline management
      const SHANNON_TEAM_ID = 30001;
      const trackingToken = generateTrackingToken();
      
      // Create or find unified contact
      const contact = await findOrCreateContact({
        fullName: input.name,
        email: normalizedEmail,
        phone: normalizedPhone,
        source: input.source || null,
        lifecycleStage: 'prospect',
      });
      
      const [result] = await d.insert(prospects).values({
        name: input.name,
        email: normalizedEmail,
        phone: normalizedPhone,
        source: input.source || null,
        notes: input.notes || null,
        trackingToken,
        assignedTo: SHANNON_TEAM_ID,
        contactId: contact.id,
      });
      
      // Create a follow-up notification for Shannon
      try {
        await d.execute(sql`INSERT INTO notifications (userId, type, title, message, createdAt) 
          SELECT u.id, 'system', ${`New Prospect: ${input.name}`}, ${`New prospect assigned to you. Source: ${input.source || 'manual'}. Follow up within 24 hours.`}, NOW()
          FROM users u WHERE u.name LIKE '%Shannon%' LIMIT 1`);
      } catch (e) { /* notification is best-effort */ }
      
      return { id: result.insertId, trackingToken, merged: false };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().min(10).optional(),
      status: z.enum(["new", "contacted", "clicked", "viewing", "enrolled", "declined", "stalled"]).optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      followUpPaused: z.boolean().optional(),
      smsOptOut: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await db();
      const { id, ...updates } = input;
      
      // Format phone if provided
      if (updates.phone) {
        const e164 = formatPhoneE164(updates.phone);
        if (e164) updates.phone = e164;
      }
      
      // Handle empty email
      if (updates.email === "") {
        (updates as any).email = null;
      }
      
      await d.update(prospects).set(updates).where(eq(prospects.id, id));
      
      // Propagate name/email/phone changes to master contact and all linked records
      const hasContactInfoChange = updates.name !== undefined || updates.email !== undefined || updates.phone !== undefined;
      if (hasContactInfoChange) {
        // Find the contactId for this prospect
        const [prospect] = await d.select().from(prospects).where(eq(prospects.id, id));
        if (prospect?.contactId) {
          await propagateContactChanges({
            contactId: prospect.contactId,
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...(updates.email !== undefined ? { email: updates.email } : {}),
            ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
          });
          console.log(`[prospect.update] Propagated contact changes for prospect ${id} → contact ${prospect.contactId}`);
        } else {
          console.warn(`[prospect.update] Prospect ${id} has no contactId — changes not propagated to other tables`);
        }
      }
      
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await db();
      // Delete engagement records first
      await d.delete(prospectEngagement).where(eq(prospectEngagement.prospectId, input.id));
      // Delete SMS records
      await d.delete(smsMessages).where(eq(smsMessages.prospectId, input.id));
      // Delete prospect
      await d.delete(prospects).where(eq(prospects.id, input.id));
      return { success: true };
    }),

  // ========== SMS Sending ==========
  sendSms: adminProcedure
    .input(z.object({
      prospectId: z.number(),
      templateKey: z.string().optional(),
      customMessage: z.string().optional(),
      destination: z.string().optional(), // URL path to link to
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await db();
      
      // Get prospect
      const [prospect] = await d.select().from(prospects).where(eq(prospects.id, input.prospectId));
      if (!prospect) throw new Error("Prospect not found");
      if (prospect.smsOptOut) throw new Error("Prospect has opted out of SMS");
      
      // Build the tracked link
      const baseUrl = ctx.req.headers.origin || process.env.VITE_APP_URL || "";
      const trackedLink = buildTrackedLink(baseUrl, prospect.trackingToken, input.destination);
      
      // Get message body
      let body: string;
      let templateKey: string | null = null;
      
      if (input.customMessage) {
        body = renderTemplate(input.customMessage, {
          name: prospect.name.split(" ")[0], // First name
          link: trackedLink,
        });
      } else if (input.templateKey) {
        const [template] = await d.select().from(smsTemplates)
          .where(eq(smsTemplates.templateKey, input.templateKey));
        if (!template) throw new Error("Template not found");
        
        body = renderTemplate(template.body, {
          name: prospect.name.split(" ")[0],
          link: trackedLink,
        });
        templateKey = input.templateKey;
      } else {
        // Use default initial outreach template
        const [template] = await d.select().from(smsTemplates)
          .where(and(eq(smsTemplates.category, "initial_outreach"), eq(smsTemplates.isDefault, true)));
        
        if (template) {
          body = renderTemplate(template.body, {
            name: prospect.name.split(" ")[0],
            link: trackedLink,
          });
          templateKey = template.templateKey;
        } else {
          body = `Hey ${prospect.name.split(" ")[0]}, check out our coaching programs: ${trackedLink}`;
        }
      }
      
      // Send the SMS
      const result = await sendSms({ to: prospect.phone, body });
      
      // Log the message
      await d.insert(smsMessages).values({
        prospectId: prospect.id,
        toPhone: formatPhoneE164(prospect.phone) || prospect.phone,
        fromPhone: ENV.twilioPhoneNumber || "not_configured",
        body,
        twilioSid: result.twilioSid || null,
        status: result.success ? "sent" : (isSmsConfigured() ? "failed" : "not_configured"),
        errorMessage: result.success ? null : result.message,
        templateKey,
      });
      
      // Update prospect stats
      await d.update(prospects).set({
        lastContactedAt: new Date(),
        totalSmsSent: sql`${prospects.totalSmsSent} + 1`,
        status: prospect.status === "new" ? "contacted" : prospect.status,
        // Set next follow-up for 48 hours from now
        nextFollowUpAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      }).where(eq(prospects.id, prospect.id));
      
      return {
        success: result.success,
        message: result.message,
        smsConfigured: isSmsConfigured(),
      };
    }),

  bulkSendSms: adminProcedure
    .input(z.object({
      prospectIds: z.array(z.number()),
      templateKey: z.string().optional(),
      customMessage: z.string().optional(),
      destination: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const results: { prospectId: number; success: boolean; message: string }[] = [];
      
      for (const prospectId of input.prospectIds) {
        try {
          // Reuse the single send logic via direct call
          const d = await db();
          const [prospect] = await d.select().from(prospects).where(eq(prospects.id, prospectId));
          if (!prospect || prospect.smsOptOut) {
            results.push({ prospectId, success: false, message: prospect?.smsOptOut ? "Opted out" : "Not found" });
            continue;
          }
          
          const baseUrl = ctx.req.headers.origin || process.env.VITE_APP_URL || "";
          const trackedLink = buildTrackedLink(baseUrl, prospect.trackingToken, input.destination);
          
          let body: string;
          let templateKey: string | null = null;
          
          if (input.customMessage) {
            body = renderTemplate(input.customMessage, {
              name: prospect.name.split(" ")[0],
              link: trackedLink,
            });
          } else if (input.templateKey) {
            const [template] = await d.select().from(smsTemplates)
              .where(eq(smsTemplates.templateKey, input.templateKey));
            body = template
              ? renderTemplate(template.body, { name: prospect.name.split(" ")[0], link: trackedLink })
              : `Hey ${prospect.name.split(" ")[0]}, check out our coaching programs: ${trackedLink}`;
            templateKey = input.templateKey;
          } else {
            body = `Hey ${prospect.name.split(" ")[0]}, check out our coaching programs: ${trackedLink}`;
          }
          
          const result = await sendSms({ to: prospect.phone, body });
          
          await d.insert(smsMessages).values({
            prospectId: prospect.id,
            toPhone: formatPhoneE164(prospect.phone) || prospect.phone,
            fromPhone: ENV.twilioPhoneNumber || "not_configured",
            body,
            twilioSid: result.twilioSid || null,
            status: result.success ? "sent" : (isSmsConfigured() ? "failed" : "not_configured"),
            errorMessage: result.success ? null : result.message,
            templateKey,
          });
          
          await d.update(prospects).set({
            lastContactedAt: new Date(),
            totalSmsSent: sql`${prospects.totalSmsSent} + 1`,
            status: prospect.status === "new" ? "contacted" : prospect.status,
            nextFollowUpAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          }).where(eq(prospects.id, prospect.id));
          
          results.push({ prospectId, success: result.success, message: result.message });
        } catch (error: any) {
          results.push({ prospectId, success: false, message: error.message });
        }
      }
      
      return {
        results,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
        smsConfigured: isSmsConfigured(),
      };
    }),

  // ========== SMS Templates ==========
  getTemplates: adminProcedure.query(async () => {
    const d = await db();
    return d.select().from(smsTemplates).orderBy(smsTemplates.category, smsTemplates.name);
  }),

  createTemplate: adminProcedure
    .input(z.object({
      templateKey: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      body: z.string().min(1),
      category: z.enum(["initial_outreach", "follow_up", "reminder", "custom"]),
      isDefault: z.boolean().optional(),
      sendAfterHours: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await db();
      const [result] = await d.insert(smsTemplates).values(input);
      return { id: result.insertId };
    }),

  updateTemplate: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      body: z.string().min(1).optional(),
      category: z.enum(["initial_outreach", "follow_up", "reminder", "custom"]).optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      sendAfterHours: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await db();
      const { id, ...updates } = input;
      await d.update(smsTemplates).set(updates).where(eq(smsTemplates.id, id));
      return { success: true };
    }),

  deleteTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await db();
      await d.delete(smsTemplates).where(eq(smsTemplates.id, input.id));
      return { success: true };
    }),

  // ========== Stats ==========
  getStats: adminProcedure.query(async () => {
    const d = await db();
    
    const [statusCounts] = await d.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as "newCount",
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as "contactedCount",
        SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as "clickedCount",
        SUM(CASE WHEN status = 'viewing' THEN 1 ELSE 0 END) as "viewingCount",
        SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) as "enrolledCount",
        SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as "declinedCount",
        SUM(CASE WHEN status = 'stalled' THEN 1 ELSE 0 END) as "stalledCount",
        SUM(CASE WHEN status = 'engaged' THEN 1 ELSE 0 END) as "engagedCount",
        SUM(CASE WHEN status = 'waiting_on_client' THEN 1 ELSE 0 END) as "waitingOnClientCount",
        SUM(CASE WHEN status = 'ready_for_consult' THEN 1 ELSE 0 END) as "readyForConsultCount",
        SUM(CASE WHEN status = 'not_ready' THEN 1 ELSE 0 END) as "notReadyCount"
      FROM prospects
    `);

    // Get custom status counts
    const customStatusRows = await d.execute(sql`
      SELECT customStatus as name, COUNT(*) as count
      FROM prospects
      WHERE customStatus IS NOT NULL AND customStatus != ''
      GROUP BY customStatus
    `);
    const customStatusCounts: Record<string, number> = {};
    for (const row of (customStatusRows as unknown as any[])) {
      customStatusCounts[row.name] = Number(row.count) || 0;
    }
    
    const [smsCounts] = await d.execute(sql`
      SELECT 
        COUNT(*) as "totalSent",
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'not_configured' THEN 1 ELSE 0 END) as "notConfigured"
      FROM sms_messages
    `);
    
    return {
      prospects: (statusCounts as unknown as any[])?.[0] || {},
      customStatusCounts,
      sms: (smsCounts as unknown as any[])?.[0] || {},
      smsConfigured: isSmsConfigured(),
    };
  }),

  // ========== Preview template with variables ==========
  previewTemplate: adminProcedure
    .input(z.object({
      templateKey: z.string().optional(),
      customMessage: z.string().optional(),
      prospectId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const d = await db();
      const [prospect] = await d.select().from(prospects).where(eq(prospects.id, input.prospectId));
      if (!prospect) return { preview: "", charCount: 0 };
      
      const baseUrl = ctx.req.headers.origin || process.env.VITE_APP_URL || "";
      const trackedLink = buildTrackedLink(baseUrl, prospect.trackingToken);
      
      let body: string;
      if (input.customMessage) {
        body = renderTemplate(input.customMessage, {
          name: prospect.name.split(" ")[0],
          link: trackedLink,
        });
      } else if (input.templateKey) {
        const [template] = await d.select().from(smsTemplates)
          .where(eq(smsTemplates.templateKey, input.templateKey));
        body = template
          ? renderTemplate(template.body, { name: prospect.name.split(" ")[0], link: trackedLink })
          : "";
      } else {
        body = "";
      }
      
      return { preview: body, charCount: body.length, segments: Math.ceil(body.length / 160) };
    }),

  // ========== Manual Engagement Logging ==========
  addEngagement: adminProcedure
    .input(z.object({
      prospectId: z.number(),
      eventType: z.enum([
        "phone_call", "email_sent", "email_received", "meeting",
        "voicemail", "note", "follow_up_scheduled", "other",
      ]),
      notes: z.string().optional(),
      duration: z.number().optional(),
      outcome: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await db();
      const loggedBy = ctx.user?.name || ctx.user?.email || "Admin";
      await d.insert(prospectEngagement).values({
        prospectId: input.prospectId,
        eventType: input.eventType,
        notes: input.notes || null,
        loggedBy,
        duration: input.duration || null,
        outcome: input.outcome || null,
      });
      // Update lastContactedAt on prospect
      await d.update(prospects)
        .set({ lastContactedAt: new Date(), updatedAt: new Date() })
        .where(eq(prospects.id, input.prospectId));

      // CONSULTATION NOTE REMINDER: When a call or meeting is logged, 
      // immediately remind Jason to enter consultation notes
      if (['phone_call', 'meeting'].includes(input.eventType)) {
        try {
          const [prospect] = await d.select().from(prospects).where(eq(prospects.id, input.prospectId));
          const prospectName = prospect?.name || `Prospect #${input.prospectId}`;
          await createNotificationsForEnabledUsers(
            'consultation_note_reminder',
            `Enter consultation notes for ${prospectName}`,
            `A ${input.eventType.replace(/_/g, ' ')} with ${prospectName} was just logged. Please enter your consultation notes so Shannon can see the next steps.`,
          );
          console.log(`[ConsultNoteReminder] Reminder created for ${prospectName} after ${input.eventType}`);
        } catch (reminderErr) {
          console.error('[ConsultNoteReminder] Failed to create reminder:', reminderErr);
        }
      }

      return { success: true };
    }),

  // ========== Update Prospect Status ==========
  updateProspectStatus: adminProcedure
    .input(z.object({
      prospectId: z.number(),
      status: z.enum([
        "new", "contacted", "clicked", "viewing", "enrolled",
        "declined", "stalled", "engaged", "waiting_on_client",
        "ready_for_consult", "not_ready",
      ]),
      customStatus: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await db();
      const loggedBy = ctx.user?.name || ctx.user?.email || "Admin";
      
      // Get current status for the log
      const [prospect] = await d.select().from(prospects).where(eq(prospects.id, input.prospectId));
      const oldStatus = prospect?.customStatus || prospect?.status || "unknown";
      const newStatusLabel = input.customStatus || input.status;
      
      // Update status + customStatus
      await d.update(prospects)
        .set({ 
          status: input.status, 
          customStatus: input.customStatus || null,
          updatedAt: new Date() 
        })
        .where(eq(prospects.id, input.prospectId));
      
      // Log the status change as an engagement event
      await d.insert(prospectEngagement).values({
        prospectId: input.prospectId,
        eventType: "status_change",
        notes: `Status changed from "${oldStatus}" to "${newStatusLabel}"`,
        loggedBy,
      });
      
      return { success: true };
    }),

  // ========== Update Things to Know ==========
  updateThingsToKnow: adminProcedure
    .input(z.object({
      prospectId: z.number(),
      thingsToKnow: z.string(),
    }))
    .mutation(async ({ input }) => {
      const d = await db();
      await d.update(prospects)
        .set({ thingsToKnow: input.thingsToKnow || null, updatedAt: new Date() })
        .where(eq(prospects.id, input.prospectId));
      return { success: true };
    }),

  // ========== Edit a Note Entry ==========
  editNote: adminProcedure
    .input(z.object({
      engagementId: z.number(),
      note: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await db();
      const loggedBy = ctx.user?.name || ctx.user?.email || "Admin";
      await d.update(prospectEngagement)
        .set({ notes: input.note })
        .where(eq(prospectEngagement.id, input.engagementId));
      return { success: true };
    }),

  // ========== Delete a Note Entry ==========
  deleteNote: adminProcedure
    .input(z.object({
      engagementId: z.number(),
      prospectId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const d = await db();
      await d.delete(prospectEngagement)
        .where(eq(prospectEngagement.id, input.engagementId));
      return { success: true };
    }),

  // ========== Append Note to Prospect ==========
  appendNote: adminProcedure
    .input(z.object({
      prospectId: z.number(),
      note: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await db();
      const loggedBy = ctx.user?.name || ctx.user?.email || "Admin";
      
      // Log as engagement (this is now the source of truth for notes)
      await d.insert(prospectEngagement).values({
        prospectId: input.prospectId,
        eventType: "note",
        notes: input.note,
        loggedBy,
      });
      
      // Also update the legacy notes field for backward compatibility
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/Denver" });
      const [prospect] = await d.select().from(prospects).where(eq(prospects.id, input.prospectId));
      const existingNotes = prospect?.notes || "";
      const newEntry = `[${timestamp} - ${loggedBy}] ${input.note}`;
      const updatedNotes = existingNotes ? `${newEntry}\n---\n${existingNotes}` : newEntry;
      await d.update(prospects)
        .set({ notes: updatedNotes, updatedAt: new Date() })
        .where(eq(prospects.id, input.prospectId));
      
      return { success: true };
    }),

  // ========== Bulk Update Status ==========
  bulkUpdateStatus: adminProcedure
    .input(z.object({
      prospectIds: z.array(z.number()).min(1),
      status: z.enum([
        "new", "contacted", "clicked", "viewing", "enrolled",
        "declined", "stalled", "engaged", "waiting_on_client",
        "ready_for_consult", "not_ready",
      ]),
      customStatus: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await db();
      const loggedBy = ctx.user?.name || ctx.user?.email || "Admin";
      const newStatusLabel = input.customStatus || input.status;
      
      // Update all selected prospects
      await d.update(prospects)
        .set({
          status: input.status,
          customStatus: input.customStatus || null,
          updatedAt: new Date(),
        })
        .where(inArray(prospects.id, input.prospectIds));
      
      // Log engagement for each prospect
      for (const prospectId of input.prospectIds) {
        await d.insert(prospectEngagement).values({
          prospectId,
          eventType: "status_change",
          notes: `Bulk status change to "${newStatusLabel}"`,
          loggedBy,
        });
      }
      
      return { success: true, count: input.prospectIds.length };
    }),

  // ========== Pipeline Analytics ==========
  getPipelineAnalytics: adminProcedure.query(async () => {
    const d = await db();
    
    // Get status distribution (current snapshot)
    // Use simple columns to avoid alias issues with different MySQL drivers
    const statusDist = await d.execute(sql`
      SELECT 
        status,
        customStatus,
        COUNT(*) as cnt
      FROM prospects
      GROUP BY status, customStatus
      ORDER BY cnt DESC
    `);
    
    // Get weekly trend data for the last 8 weeks
    const weeklyTrend = await d.execute(sql`
      SELECT 
        YEARWEEK(createdAt) as weekKey,
        DATE_FORMAT(MIN(createdAt), '%b %d') as weekLabel,
        COUNT(*) as newProspects,
        SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) as enrolled,
        SUM(CASE WHEN status IN ('viewing', 'stalled', 'declined') THEN 1 ELSE 0 END) as passive
      FROM prospects
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
      GROUP BY YEARWEEK(createdAt)
      ORDER BY weekKey ASC
    `);
    
    // Get status change velocity (avg days between status changes per prospect)
    const recentChanges = await d.execute(sql`
      SELECT 
        pe.prospectId as pid,
        COUNT(*) as changeCount,
        DATEDIFF(MAX(pe.createdAt), MIN(pe.createdAt)) as daySpan
      FROM prospect_engagement pe
      WHERE pe.eventType = 'status_change'
        AND pe.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY pe.prospectId
      HAVING COUNT(*) > 1
    `);
    
    const avgVelocity = (recentChanges as unknown as any[]).length > 0
      ? (recentChanges as unknown as any[]).reduce((sum: number, r: any) => sum + (Number(r.daySpan) / Number(r.changeCount)), 0) / (recentChanges as unknown as any[]).length
      : 0;
    
    // d.execute returns [rows, fields] - extract the rows array
    const statusRows = Array.isArray(statusDist) && Array.isArray(statusDist[0]) ? statusDist[0] : statusDist;
    const weeklyRows = Array.isArray(weeklyTrend) && Array.isArray(weeklyTrend[0]) ? weeklyTrend[0] : weeklyTrend;
    const changeRows = Array.isArray(recentChanges) && Array.isArray(recentChanges[0]) ? recentChanges[0] : recentChanges;
    
    const avgVelocity2 = (changeRows as any[]).length > 0
      ? (changeRows as any[]).reduce((sum: number, r: any) => sum + (Number(r.daySpan) / Number(r.changeCount)), 0) / (changeRows as any[]).length
      : 0;
    
    return {
      statusDistribution: (statusRows as any[]).map((r: any) => ({
        label: String(r.customStatus || r.status || 'unknown'),
        dbStatus: String(r.status || 'new'),
        count: Number(r.cnt) || 0,
      })),
      weeklyTrend: (weeklyRows as any[]).map((r: any) => ({
        weekLabel: String(r.weekLabel),
        newProspects: Number(r.newProspects) || 0,
        enrolled: Number(r.enrolled) || 0,
        passive: Number(r.passive) || 0,
      })),
      avgStatusChangeVelocity: Math.round(avgVelocity2 * 10) / 10,
    };
  }),

  // ========== Migrate Legacy Notes to Engagement Records ==========
  // One-time migration: copies legacy prospect.notes into engagement records
  // Only creates records for prospects that have legacy notes but NO existing "note" engagement records
  // Preserves all existing data — never overwrites or deletes anything
  migrateLegacyNotes: adminProcedure.mutation(async ({ ctx }) => {
    const d = await db();
    const loggedBy = ctx.user?.name || ctx.user?.email || "System Migration";
    
    // Get all prospects that have legacy notes
    const allProspects = await d.select({
      id: prospects.id,
      name: prospects.name,
      notes: prospects.notes,
      createdAt: prospects.createdAt,
    }).from(prospects).where(isNotNull(prospects.notes));
    
    const prospectsWithNotes = allProspects.filter(p => p.notes && p.notes.trim().length > 0);
    
    let migrated = 0;
    let skipped = 0;
    const details: { name: string; id: number; action: string }[] = [];
    
    for (const prospect of prospectsWithNotes) {
      // Check if this prospect already has ANY "note" type engagement records
      const existingNotes = await d.select({ id: prospectEngagement.id })
        .from(prospectEngagement)
        .where(and(
          eq(prospectEngagement.prospectId, prospect.id),
          eq(prospectEngagement.eventType, "note"),
        ))
        .limit(1);
      
      if (existingNotes.length > 0) {
        // Already has engagement notes — skip to avoid duplicates
        skipped++;
        details.push({ name: prospect.name || "Unknown", id: prospect.id, action: "skipped (already has engagement notes)" });
        continue;
      }
      
      // Parse legacy notes — they may contain multiple entries separated by ---
      const noteText = prospect.notes!.trim();
      
      // Insert as a single "note" engagement record with the original creation date
      await d.insert(prospectEngagement).values({
        prospectId: prospect.id,
        eventType: "note",
        notes: noteText,
        loggedBy: `${loggedBy} (migrated from original notes)`,
      });
      
      migrated++;
      details.push({ name: prospect.name || "Unknown", id: prospect.id, action: "migrated" });
    }
    
    console.log(`[LegacyNotesMigration] Migrated: ${migrated}, Skipped: ${skipped}, Total with notes: ${prospectsWithNotes.length}`);
    
    return {
      success: true,
      migrated,
      skipped,
      totalWithNotes: prospectsWithNotes.length,
      details,
    };
  }),

  // Scan for potential duplicate prospects
  scanDuplicates: adminProcedure.query(async () => {
    const d = await db();
    const allProspects = await d.select().from(prospects).orderBy(prospects.name);
    
    const duplicateGroups: { key: string; prospects: typeof allProspects }[] = [];
    const seen = new Map<string, typeof allProspects[0][]>();
    
    for (const p of allProspects) {
      // Check by normalized email
      if (p.email) {
        const normEmail = p.email.toLowerCase().trim();
        if (!seen.has(`email:${normEmail}`)) seen.set(`email:${normEmail}`, []);
        seen.get(`email:${normEmail}`)!.push(p);
      }
      // Check by normalized phone
      if (p.phone && p.phone !== 'N/A' && p.phone !== 'not-provided') {
        const normPhone = p.phone.replace(/[^\d+]/g, '');
        if (!seen.has(`phone:${normPhone}`)) seen.set(`phone:${normPhone}`, []);
        seen.get(`phone:${normPhone}`)!.push(p);
      }
      // Check by normalized name
      const normName = p.name.toLowerCase().trim();
      if (!seen.has(`name:${normName}`)) seen.set(`name:${normName}`, []);
      seen.get(`name:${normName}`)!.push(p);
    }
    
    // Find groups with more than 1 match
    const reportedIds = new Set<number>();
    for (const [key, group] of seen.entries()) {
      if (group.length > 1) {
        const uniqueIds = [...new Set(group.map(p => p.id))];
        if (uniqueIds.length > 1) {
          const groupKey = uniqueIds.sort().join('-');
          if (!reportedIds.has(uniqueIds[0])) {
            duplicateGroups.push({ key, prospects: group.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i) });
            uniqueIds.forEach(id => reportedIds.add(id));
          }
        }
      }
    }
    
    return { duplicateGroups, totalProspects: allProspects.length };
  }),

  // Merge two prospects: keep the primary, delete the secondary
  getEngagement: adminProcedure
    .input(z.object({ prospectId: z.number() }))
    .query(async ({ input }) => {
      const d = await db();
      const engagement = await d.select().from(prospectEngagement)
        .where(eq(prospectEngagement.prospectId, input.prospectId))
        .orderBy(desc(prospectEngagement.createdAt))
        .limit(50);
      return engagement;
    }),

  mergeProspects: adminProcedure
    .input(z.object({
      keepId: z.number(),
      deleteId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const d = await db();
      const [keep] = await d.select().from(prospects).where(eq(prospects.id, input.keepId));
      const [remove] = await d.select().from(prospects).where(eq(prospects.id, input.deleteId));
      
      if (!keep || !remove) throw new Error('One or both prospects not found');
      
      // Merge: fill in missing fields on the kept record from the deleted one
      const updates: any = {};
      if (!keep.email && remove.email) updates.email = remove.email;
      if ((keep.phone === 'N/A' || keep.phone === 'not-provided') && remove.phone && remove.phone !== 'N/A' && remove.phone !== 'not-provided') updates.phone = remove.phone;
      if (!keep.source && remove.source) updates.source = remove.source;
      if (!keep.enrollmentId && remove.enrollmentId) updates.enrollmentId = remove.enrollmentId;
      if (!keep.userId && remove.userId) updates.userId = remove.userId;
      if (!keep.clientId && (remove as any).clientId) updates.clientId = (remove as any).clientId;
      if (remove.notes) {
        updates.notes = keep.notes ? `${keep.notes}\n\n[Merged from #${remove.id}] ${remove.notes}` : remove.notes;
      }
      // Take the better engagement stats
      if (remove.totalClicks > keep.totalClicks) updates.totalClicks = remove.totalClicks;
      if (remove.totalSmsSent > keep.totalSmsSent) updates.totalSmsSent = remove.totalSmsSent;
      if (remove.lastContactedAt && (!keep.lastContactedAt || remove.lastContactedAt > keep.lastContactedAt)) updates.lastContactedAt = remove.lastContactedAt;
      if (remove.lastClickedAt && (!keep.lastClickedAt || remove.lastClickedAt > keep.lastClickedAt)) updates.lastClickedAt = remove.lastClickedAt;
      
      // Move engagement records to the kept prospect
      await d.update(prospectEngagement).set({ prospectId: input.keepId }).where(eq(prospectEngagement.prospectId, input.deleteId));
      
      // Move SMS messages to the kept prospect
      await d.update(smsMessages).set({ prospectId: input.keepId }).where(eq(smsMessages.prospectId, input.deleteId));
      
      // Update the kept prospect
      if (Object.keys(updates).length > 0) {
        await d.update(prospects).set(updates).where(eq(prospects.id, input.keepId));
      }
      
      // Delete the duplicate
      await d.delete(prospects).where(eq(prospects.id, input.deleteId));
      
      return { success: true, keptId: input.keepId, deletedId: input.deleteId, mergedFields: Object.keys(updates) };
    }),
});
