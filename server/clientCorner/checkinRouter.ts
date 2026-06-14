import { z } from "zod";
import { router, adminProcedure, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb, getSiteSetting, setSiteSetting } from "../db";
import { 
  checkinTemplates, checkins, checkinResponses, checkinCoachResponses,
  checkinSchedules, checkinNotificationLogs, checkinNotificationTemplates,
  clientProtocols, users, checkinScheduleAuditLog, protocolComments
} from "../../drizzle/schema";
import { eq, and, desc, asc, sql, isNull, gte, lte, or } from "drizzle-orm";
import { storagePut } from "../storage";
import { generateCheckinPdf, generateCheckinHistoryPdf } from "./checkinPdf";
import { calculateNextScheduledTime, GLOBAL_CHECKIN_SETTING_KEY, areCheckinsGloballyEnabled } from "../cron/checkinCron";

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

// MySQL json() columns come back as strings when the driver doesn't auto-parse
function parseQuestions(questions: unknown): unknown[] {
  if (Array.isArray(questions)) return questions;
  if (typeof questions === 'string') {
    try { return JSON.parse(questions); } catch { return []; }
  }
  return [];
}

// ============ CHECK-IN ROUTER ============
export const checkinRouter = router({
  // ============ GLOBAL KILL SWITCH ============
  // Master on/off for ALL check-in sending. Honored by every send path and by
  // the engagement-level auto-enable. Lets admins stop check-ins platform-wide
  // without touching per-client schedules or redeploying.
  global: router({
    getStatus: adminProcedure.query(async () => {
      const value = await getSiteSetting(GLOBAL_CHECKIN_SETTING_KEY);
      // Default OFF: enabled only when explicitly set to 'true'
      return { enabled: value === 'true' };
    }),
    setStatus: adminProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await setSiteSetting(GLOBAL_CHECKIN_SETTING_KEY, input.enabled ? 'true' : 'false');
        console.log(`[CheckinRouter] Global check-ins ${input.enabled ? 'ENABLED' : 'DISABLED'} by ${ctx.user?.email || ctx.user?.id}`);
        return { success: true, enabled: input.enabled };
      }),
  }),

  // ============ TEMPLATES ============
  templates: router({
    list: adminProcedure.query(async () => {
      const database = await db();
      let templates = await database
        .select()
        .from(checkinTemplates)
        .where(eq(checkinTemplates.isActive, 1))
        .orderBy(desc(checkinTemplates.isDefault), asc(checkinTemplates.name));

      const defaultQuestions = [
        { id: 'q_1', text: 'How would you rate your overall wellbeing this week?', type: 'scale', required: true, order: 0 },
        { id: 'q_2', text: 'How are your energy levels?', type: 'scale', required: true, order: 1 },
        { id: 'q_3', text: 'How is your sleep quality?', type: 'scale', required: true, order: 2 },
        { id: 'q_4', text: 'How would you rate your stress levels? (1 = very stressed, 10 = very calm)', type: 'scale', required: true, order: 3 },
        { id: 'q_5', text: 'How is your mood and mental state?', type: 'scale', required: true, order: 4 },
        { id: 'q_6', text: 'How well are you adhering to your training program?', type: 'scale', required: true, order: 5 },
        { id: 'q_7', text: 'How well are you adhering to your nutrition plan?', type: 'scale', required: true, order: 6 },
        { id: 'q_8', text: 'How well are you adhering to your supplementation/peptide protocol?', type: 'scale', required: true, order: 7 },
        { id: 'q_9', text: 'How would you rate your nasal breathing practice this week?', type: 'scale', required: true, order: 8 },
        { id: 'q_10', text: 'Did you complete your daily neuroplastic morning routine?', type: 'checkbox', required: false, order: 9 },
        { id: 'q_11', text: 'What were your biggest wins this week?', type: 'text', required: false, order: 10 },
        { id: 'q_12', text: 'What challenges did you face this week?', type: 'text', required: false, order: 11 },
        { id: 'q_13', text: 'Do you have any questions or concerns for your coach?', type: 'text', required: false, order: 12 },
      ];

      // Auto-seed default template if the table is empty
      if (templates.length === 0) {
        await database.insert(checkinTemplates).values({
          name: 'Default Weekly Check-in',
          description: 'Standard 13-question weekly check-in covering wellbeing, adherence, and open feedback.',
          isDefault: 1,
          isActive: 1,
          questions: defaultQuestions,
        });
        templates = await database
          .select()
          .from(checkinTemplates)
          .where(eq(checkinTemplates.isActive, 1))
          .orderBy(desc(checkinTemplates.isDefault), asc(checkinTemplates.name));
        console.log('[Checkin] Auto-seeded default 13-question check-in template.');
      }

      // Patch any existing template that has 0 questions (e.g. created before fix)
      const parsed = templates.map(t => ({ ...t, questions: parseQuestions(t.questions) }));
      for (const t of parsed) {
        if (t.questions.length === 0) {
          await database
            .update(checkinTemplates)
            .set({ questions: defaultQuestions })
            .where(eq(checkinTemplates.id, t.id));
          t.questions = defaultQuestions;
          console.log(`[Checkin] Auto-patched template "${t.name}" (id=${t.id}) with 13 default questions.`);
        }
      }

      return parsed;
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const database = await db();
        const [template] = await database
          .select()
          .from(checkinTemplates)
          .where(eq(checkinTemplates.id, input.id));
        if (!template) return template;
        return { ...template, questions: parseQuestions(template.questions) };
      }),

    getDefault: publicProcedure.query(async () => {
      const database = await db();
      const [template] = await database
        .select()
        .from(checkinTemplates)
        .where(and(
          eq(checkinTemplates.isDefault, 1),
          eq(checkinTemplates.isActive, 1)
        ));
      if (!template) return template;
      return { ...template, questions: parseQuestions(template.questions) };
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
        questions: z.array(z.object({
          id: z.string(),
          text: z.string(),
          type: z.enum(['scale', 'text', 'checkbox', 'select']),
          options: z.array(z.string()).optional(),
          required: z.boolean(),
          order: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await db();
        const result = await database.insert(checkinTemplates).values({
          name: input.name,
          description: input.description,
          isDefault: input.isDefault ? 1 : 0,
          questions: input.questions,
          createdBy: ctx.user?.id,
        });
        return { id: result[0].insertId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
        questions: z.array(z.object({
          id: z.string(),
          text: z.string(),
          type: z.enum(['scale', 'text', 'checkbox', 'select']),
          options: z.array(z.string()).optional(),
          required: z.boolean(),
          order: z.number(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db();
        const { id, isDefault, isActive, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (isDefault !== undefined) updates.isDefault = isDefault ? 1 : 0;
        if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;
        await database
          .update(checkinTemplates)
          .set(updates)
          .where(eq(checkinTemplates.id, id));
        return { success: true };
      }),
  }),

  // ============ SCHEDULES ============
  schedules: router({
    getAllEnabled: adminProcedure.query(async () => {
      const database = await db();
      const schedules = await database
        .select({
          id: checkinSchedules.id,
          clientProtocolId: checkinSchedules.clientProtocolId,
          templateId: checkinSchedules.templateId,
          isEnabled: checkinSchedules.isEnabled,
          frequency: checkinSchedules.frequency,
          dayOfWeek: checkinSchedules.dayOfWeek,
          timeOfDay: checkinSchedules.timeOfDay,
          timezone: checkinSchedules.timezone,
          isPaused: checkinSchedules.isPaused,
          nextScheduledAt: checkinSchedules.nextScheduledAt,
          currentStreak: checkinSchedules.currentStreak,
          longestStreak: checkinSchedules.longestStreak,
          totalResponses: checkinSchedules.totalResponses,
          totalSent: checkinSchedules.totalSent,
          lastSentAt: checkinSchedules.lastSentAt,
          lastResponseAt: checkinSchedules.lastResponseAt,
          createdAt: checkinSchedules.createdAt,
          clientName: clientProtocols.clientName,
        })
        .from(checkinSchedules)
        .leftJoin(clientProtocols, eq(checkinSchedules.clientProtocolId, clientProtocols.id))
        .where(eq(checkinSchedules.isEnabled, true));
      return schedules;
    }),

    // Get check-in status for multiple clients at once
    getBulkStatus: adminProcedure
      .input(z.object({ clientProtocolIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        if (input.clientProtocolIds.length === 0) return {};
        const database = await db();
        const schedules = await database
          .select({
            clientProtocolId: checkinSchedules.clientProtocolId,
            isEnabled: checkinSchedules.isEnabled,
            nextScheduledAt: checkinSchedules.nextScheduledAt,
          })
          .from(checkinSchedules)
          .where(sql`${checkinSchedules.clientProtocolId} IN (${sql.join(input.clientProtocolIds.map(id => sql`${id}`), sql`, `)})`);
        
        // Convert to a map for easy lookup
        const statusMap: Record<number, { isEnabled: boolean; nextScheduledAt: Date | null }> = {};
        for (const schedule of schedules) {
          statusMap[schedule.clientProtocolId] = {
            isEnabled: schedule.isEnabled,
            nextScheduledAt: schedule.nextScheduledAt,
          };
        }
        return statusMap;
      }),

    getByClient: adminProcedure
      .input(z.object({ clientProtocolId: z.number() }))
      .query(async ({ input }) => {
        const database = await db();
        const [schedule] = await database
          .select()
          .from(checkinSchedules)
          .where(eq(checkinSchedules.clientProtocolId, input.clientProtocolId));
        return schedule ?? null;
      }),
    
    enable: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        templateId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await db();
        
        // Get default template if not specified
        let templateId = input.templateId;
        if (!templateId) {
          const [defaultTemplate] = await database
            .select()
            .from(checkinTemplates)
            .where(and(
              eq(checkinTemplates.isDefault, 1),
              eq(checkinTemplates.isActive, 1)
            ));
          templateId = defaultTemplate?.id;
        }

        if (!templateId) {
          throw new Error("No template specified and no default template found");
        }
        
        // Check engagement level — protocol_only clients should not have check-ins
        const [protocol] = await database
          .select({ engagementLevel: clientProtocols.engagementLevel })
          .from(clientProtocols)
          .where(eq(clientProtocols.id, input.clientProtocolId));
        
        if (protocol?.engagementLevel === 'protocol_only') {
          throw new Error("Cannot enable check-ins for Protocol Only clients. Change the engagement level to Self-Guided Check-Ins or Full Coaching first.");
        }
        
        // Calculate next Thursday at 10 AM
        const now = new Date();
        const nextThursday = new Date(now);
        const dayOfWeek = now.getDay();
        const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
        nextThursday.setDate(now.getDate() + daysUntilThursday);
        nextThursday.setHours(10, 0, 0, 0);
        
        // Check if schedule exists
        const [existing] = await database
          .select()
          .from(checkinSchedules)
          .where(eq(checkinSchedules.clientProtocolId, input.clientProtocolId));
        
        if (existing) {
          await database
            .update(checkinSchedules)
            .set({
              isEnabled: 1,
              templateId,
              nextScheduledAt: nextThursday,
            })
            .where(eq(checkinSchedules.id, existing.id));
        } else {
          await database.insert(checkinSchedules).values({
            clientProtocolId: input.clientProtocolId,
            templateId,
            isEnabled: 1,
            frequency: 'weekly',
            dayOfWeek: 4, // Thursday
            timeOfDay: '10:00',
            nextScheduledAt: nextThursday,
          });
        }
        
        return { success: true };
      }),
    
    disable: adminProcedure
      .input(z.object({ clientProtocolId: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db();
        await database
          .update(checkinSchedules)
          .set({ isEnabled: 0 })
          .where(eq(checkinSchedules.clientProtocolId, input.clientProtocolId));
        return { success: true };
      }),

    // Pause check-ins for a client
    pause: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db();
        await database
          .update(checkinSchedules)
          .set({
            isPaused: 1,
            pausedReason: input.reason || null,
          })
          .where(eq(checkinSchedules.clientProtocolId, input.clientProtocolId));
        return { success: true };
      }),

    // Resume paused check-ins
    resume: adminProcedure
      .input(z.object({ clientProtocolId: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db();
        await database
          .update(checkinSchedules)
          .set({
            isPaused: 0,
            pausedReason: null,
            skipUntil: null,
          })
          .where(eq(checkinSchedules.clientProtocolId, input.clientProtocolId));
        return { success: true };
      }),

    // Skip check-ins until a specific date
    skip: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        skipUntil: z.string(), // ISO date string
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db();
        await database
          .update(checkinSchedules)
          .set({
            skipUntil: new Date(input.skipUntil),
            pausedReason: input.reason || 'Skipped until ' + new Date(input.skipUntil).toLocaleDateString('en-US', { timeZone: 'America/Denver' }),
          })
          .where(eq(checkinSchedules.clientProtocolId, input.clientProtocolId));
        return { success: true };
      }),

    // Update schedule settings (frequency, day, time)
    update: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        timezone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db();
        const { clientProtocolId, ...updates } = input;
        
        // Get current schedule to merge with updates
        const [currentSchedule] = await database
          .select()
          .from(checkinSchedules)
          .where(eq(checkinSchedules.clientProtocolId, clientProtocolId));
        
        if (!currentSchedule) {
          throw new Error('Schedule not found');
        }
        
        // Merge current values with updates
        const frequency = updates.frequency ?? currentSchedule.frequency ?? 'weekly';
        const dayOfWeek = updates.dayOfWeek ?? currentSchedule.dayOfWeek ?? 4;
        const timeOfDay = updates.timeOfDay ?? currentSchedule.timeOfDay ?? '10:00';
        const timezone = updates.timezone ?? currentSchedule.timezone ?? 'America/Denver';
        
        // Calculate the next scheduled time — uses UTC-aware conversion via calculateNextScheduledTime
        const nextScheduled = calculateNextScheduledTime(dayOfWeek, timeOfDay, timezone, frequency);
        
        // Build update data
        const updateData: Record<string, any> = {
          nextScheduledAt: nextScheduled,
        };
        if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
        if (updates.dayOfWeek !== undefined) updateData.dayOfWeek = updates.dayOfWeek;
        if (updates.timeOfDay !== undefined) updateData.timeOfDay = updates.timeOfDay;
        if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
        
        await database
          .update(checkinSchedules)
          .set(updateData)
          .where(eq(checkinSchedules.clientProtocolId, clientProtocolId));
        
        // Log the change to audit log
        await database.insert(checkinScheduleAuditLog).values({
          clientProtocolId,
          action: 'updated',
          previousFrequency: currentSchedule.frequency,
          previousDayOfWeek: currentSchedule.dayOfWeek,
          previousTimeOfDay: currentSchedule.timeOfDay,
          previousTimezone: currentSchedule.timezone,
          previousNextScheduledAt: currentSchedule.nextScheduledAt,
          newFrequency: frequency,
          newDayOfWeek: dayOfWeek,
          newTimeOfDay: timeOfDay,
          newTimezone: timezone,
          newNextScheduledAt: nextScheduled,
        });
        
        return { success: true, nextScheduledAt: nextScheduled };
      }),

    // Get schedule change history
    getHistory: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const database = await db();
        const history = await database
          .select()
          .from(checkinScheduleAuditLog)
          .where(eq(checkinScheduleAuditLog.clientProtocolId, input.clientProtocolId))
          .orderBy(desc(checkinScheduleAuditLog.createdAt))
          .limit(input.limit || 20);
        return history;
      }),

    // Preview next 4 scheduled check-ins based on current or proposed settings
    getPreview: adminProcedure
      .input(z.object({
        clientProtocolId: z.number(),
        frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        timezone: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const database = await db();
        
        // Get current schedule to merge with proposed changes
        const [currentSchedule] = await database
          .select()
          .from(checkinSchedules)
          .where(eq(checkinSchedules.clientProtocolId, input.clientProtocolId));
        
        // Use proposed values or fall back to current/defaults
        const frequency = input.frequency ?? currentSchedule?.frequency ?? 'weekly';
        const dayOfWeek = input.dayOfWeek ?? currentSchedule?.dayOfWeek ?? 4;
        const timeOfDay = input.timeOfDay ?? currentSchedule?.timeOfDay ?? '10:00';
        const timezone = input.timezone ?? currentSchedule?.timezone ?? 'America/Denver';
        
        const [hours, minutes] = timeOfDay.split(':').map(Number);
        const now = new Date();
        const previews: { date: Date; dayName: string; formattedTime: string }[] = [];
        
        // Calculate the first occurrence
        let nextDate = new Date(now);
        const currentDay = now.getDay();
        let daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
        
        // If same day but time passed, go to next occurrence
        if (daysUntilTarget === 0) {
          const targetTimeToday = new Date(now);
          targetTimeToday.setHours(hours, minutes, 0, 0);
          if (now >= targetTimeToday) {
            daysUntilTarget = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 28;
          }
        }
        
        nextDate.setDate(now.getDate() + daysUntilTarget);
        nextDate.setHours(hours, minutes, 0, 0);
        
        // Day names for display
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Generate 4 preview dates
        for (let i = 0; i < 4; i++) {
          const previewDate = new Date(nextDate);
          
          // Add interval based on frequency
          if (i > 0) {
            if (frequency === 'weekly') {
              previewDate.setDate(nextDate.getDate() + (7 * i));
            } else if (frequency === 'biweekly') {
              previewDate.setDate(nextDate.getDate() + (14 * i));
            } else if (frequency === 'monthly') {
              previewDate.setMonth(nextDate.getMonth() + i);
              // Adjust to correct day of week in that month
              while (previewDate.getDay() !== dayOfWeek) {
                previewDate.setDate(previewDate.getDate() + 1);
              }
            }
          }
          
          previews.push({
            date: previewDate,
            dayName: dayNames[previewDate.getDay()],
            formattedTime: previewDate.toLocaleTimeString('en-US', { timeZone: 'America/Denver', 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
          });
        }
        
        return {
          previews,
          settings: { frequency, dayOfWeek, timeOfDay, timezone },
        };
      }),

    // Bulk update schedules for multiple clients
    bulkUpdate: adminProcedure
      .input(z.object({
        clientProtocolIds: z.array(z.number()),
        frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        timezone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await db();
        const { clientProtocolIds, ...updates } = input;
        
        if (clientProtocolIds.length === 0) {
          throw new Error('No client protocols specified');
        }
        
        const results: { clientProtocolId: number; success: boolean; error?: string }[] = [];
        
        for (const clientProtocolId of clientProtocolIds) {
          try {
            // Get current schedule
            const [currentSchedule] = await database
              .select()
              .from(checkinSchedules)
              .where(eq(checkinSchedules.clientProtocolId, clientProtocolId));
            
            if (!currentSchedule) {
              results.push({ clientProtocolId, success: false, error: 'Schedule not found' });
              continue;
            }
            
            // Merge current values with updates
            const frequency = updates.frequency ?? currentSchedule.frequency ?? 'weekly';
            const dayOfWeek = updates.dayOfWeek ?? currentSchedule.dayOfWeek ?? 4;
            const timeOfDay = updates.timeOfDay ?? currentSchedule.timeOfDay ?? '10:00';
            const timezone = updates.timezone ?? currentSchedule.timezone ?? 'America/Denver';
            
            // Calculate next scheduled time — uses UTC-aware conversion via calculateNextScheduledTime
            const nextScheduled = calculateNextScheduledTime(dayOfWeek, timeOfDay, timezone, frequency);
            
            // Build update data
            const updateData: Record<string, any> = { nextScheduledAt: nextScheduled };
            if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
            if (updates.dayOfWeek !== undefined) updateData.dayOfWeek = updates.dayOfWeek;
            if (updates.timeOfDay !== undefined) updateData.timeOfDay = updates.timeOfDay;
            if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
            
            await database
              .update(checkinSchedules)
              .set(updateData)
              .where(eq(checkinSchedules.clientProtocolId, clientProtocolId));
            
            // Log to audit
            await database.insert(checkinScheduleAuditLog).values({
              clientProtocolId,
              changedBy: ctx.user?.id,
              changedByName: ctx.user?.name,
              changedByEmail: ctx.user?.email,
              action: 'bulk_updated',
              previousFrequency: currentSchedule.frequency,
              previousDayOfWeek: currentSchedule.dayOfWeek,
              previousTimeOfDay: currentSchedule.timeOfDay,
              previousTimezone: currentSchedule.timezone,
              previousNextScheduledAt: currentSchedule.nextScheduledAt,
              newFrequency: frequency,
              newDayOfWeek: dayOfWeek,
              newTimeOfDay: timeOfDay,
              newTimezone: timezone,
              newNextScheduledAt: nextScheduled,
              notes: `Bulk update of ${clientProtocolIds.length} schedules`,
            });
            
            results.push({ clientProtocolId, success: true });
          } catch (error: any) {
            results.push({ clientProtocolId, success: false, error: error.message });
          }
        }
        
        const successCount = results.filter(r => r.success).length;
        return {
          success: successCount === clientProtocolIds.length,
          results,
          summary: {
            total: clientProtocolIds.length,
            succeeded: successCount,
            failed: clientProtocolIds.length - successCount,
          },
        };
      }),

    // Bulk enable check-ins for multiple clients
    bulkEnable: adminProcedure
      .input(z.object({
        clientProtocolIds: z.array(z.number()),
        templateId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await db();
        const { clientProtocolIds, templateId } = input;
        
        if (clientProtocolIds.length === 0) {
          throw new Error('No client protocols specified');
        }
        
        // Get default template if not specified
        let finalTemplateId = templateId;
        if (!finalTemplateId) {
          const [defaultTemplate] = await database
            .select()
            .from(checkinTemplates)
            .where(and(
              eq(checkinTemplates.isDefault, 1),
              eq(checkinTemplates.isActive, 1)
            ));
          finalTemplateId = defaultTemplate?.id;
        }
        
        if (!finalTemplateId) {
          throw new Error('No template specified and no default template found');
        }
        
        // Calculate next Thursday at 10 AM
        const now = new Date();
        const nextThursday = new Date(now);
        const dayOfWeek = now.getDay();
        const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
        nextThursday.setDate(now.getDate() + daysUntilThursday);
        nextThursday.setHours(10, 0, 0, 0);
        
        const results: { clientProtocolId: number; success: boolean; error?: string; action?: string }[] = [];
        
        for (const clientProtocolId of clientProtocolIds) {
          try {
            // Check engagement level — skip protocol_only clients
            const [protocol] = await database
              .select({ engagementLevel: clientProtocols.engagementLevel })
              .from(clientProtocols)
              .where(eq(clientProtocols.id, clientProtocolId));
            
            if (protocol?.engagementLevel === 'protocol_only') {
              results.push({ clientProtocolId, success: false, error: 'Protocol Only — change engagement level first' });
              continue;
            }
            
            // Check if schedule exists
            const [existing] = await database
              .select()
              .from(checkinSchedules)
              .where(eq(checkinSchedules.clientProtocolId, clientProtocolId));
            
            if (existing) {
              // Update existing schedule
              await database
                .update(checkinSchedules)
                .set({
                  isEnabled: 1,
                  templateId: finalTemplateId,
                  nextScheduledAt: nextThursday,
                })
                .where(eq(checkinSchedules.id, existing.id));
              results.push({ clientProtocolId, success: true, action: 'updated' });
            } else {
              // Create new schedule
              await database.insert(checkinSchedules).values({
                clientProtocolId,
                templateId: finalTemplateId,
                isEnabled: 1,
                frequency: 'weekly',
                dayOfWeek: 4, // Thursday
                timeOfDay: '10:00',
                nextScheduledAt: nextThursday,
              });
              results.push({ clientProtocolId, success: true, action: 'created' });
            }
            
            // Log to audit
            await database.insert(checkinScheduleAuditLog).values({
              clientProtocolId,
              changedBy: ctx.user?.id,
              changedByName: ctx.user?.name,
              changedByEmail: ctx.user?.email,
              action: 'bulk_enabled',
              notes: `Bulk enabled check-ins for ${clientProtocolIds.length} clients`,
            });
          } catch (error: any) {
            results.push({ clientProtocolId, success: false, error: error.message });
          }
        }
        
        const successCount = results.filter(r => r.success).length;
        return {
          success: successCount === clientProtocolIds.length,
          results,
          summary: {
            total: clientProtocolIds.length,
            succeeded: successCount,
            failed: clientProtocolIds.length - successCount,
            created: results.filter(r => r.action === 'created').length,
            updated: results.filter(r => r.action === 'updated').length,
          },
        };
      }),

    // Bulk disable check-ins for multiple clients
    bulkDisable: adminProcedure
      .input(z.object({
        clientProtocolIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await db();
        const { clientProtocolIds } = input;
        
        if (clientProtocolIds.length === 0) {
          throw new Error('No client protocols specified');
        }
        
        const results: { clientProtocolId: number; success: boolean; error?: string }[] = [];
        
        for (const clientProtocolId of clientProtocolIds) {
          try {
            await database
              .update(checkinSchedules)
              .set({ isEnabled: 0 })
              .where(eq(checkinSchedules.clientProtocolId, clientProtocolId));
            
            // Log to audit
            await database.insert(checkinScheduleAuditLog).values({
              clientProtocolId,
              changedBy: ctx.user?.id,
              changedByName: ctx.user?.name,
              changedByEmail: ctx.user?.email,
              action: 'bulk_disabled',
              notes: `Bulk disabled check-ins for ${clientProtocolIds.length} clients`,
            });
            
            results.push({ clientProtocolId, success: true });
          } catch (error: any) {
            results.push({ clientProtocolId, success: false, error: error.message });
          }
        }
        
        const successCount = results.filter(r => r.success).length;
        return {
          success: successCount === clientProtocolIds.length,
          results,
          summary: {
            total: clientProtocolIds.length,
            succeeded: successCount,
            failed: clientProtocolIds.length - successCount,
          },
        };
      }),

    // List all schedules for bulk operations
    listAll: adminProcedure
      .input(z.object({
        frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        isEnabled: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const database = await db();
        
        const conditions = [];
        if (input.frequency !== undefined) {
          conditions.push(eq(checkinSchedules.frequency, input.frequency));
        }
        if (input.dayOfWeek !== undefined) {
          conditions.push(eq(checkinSchedules.dayOfWeek, input.dayOfWeek));
        }
        if (input.isEnabled !== undefined) {
          conditions.push(eq(checkinSchedules.isEnabled, input.isEnabled));
        }
        
        let query = database
          .select({
            schedule: checkinSchedules,
            clientProtocol: clientProtocols,
          })
          .from(checkinSchedules)
          .leftJoin(clientProtocols, eq(checkinSchedules.clientProtocolId, clientProtocols.id));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }
        
        const results = await query.orderBy(asc(checkinSchedules.dayOfWeek), asc(checkinSchedules.timeOfDay));
        return results;
      }),
  }),

  // ============ CHECK-INS ============
  list: adminProcedure
    .input(z.object({
      clientProtocolId: z.number().optional(),
      status: z.enum(['pending', 'submitted', 'reviewed', 'incomplete']).optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const database = await db();
      
      const conditions = [];
      if (input.clientProtocolId) {
        conditions.push(eq(checkins.clientProtocolId, input.clientProtocolId));
      }
      if (input.status) {
        conditions.push(eq(checkins.status, input.status));
      }
      
      let query = database
        .select({
          id: checkins.id,
          clientProtocolId: checkins.clientProtocolId,
          templateId: checkins.templateId,
          status: checkins.status,
          weekNumber: checkins.weekNumber,
          overallScore: checkins.overallScore,
          hasLowScore: checkins.hasLowScore,
          sentAt: checkins.sentAt,
          submittedAt: checkins.submittedAt,
          reviewedAt: checkins.reviewedAt,
          reviewedBy: checkins.reviewedBy,
          createdAt: checkins.createdAt,
          clientName: clientProtocols.clientName,
        })
        .from(checkins)
        .leftJoin(clientProtocols, eq(checkins.clientProtocolId, clientProtocols.id));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      const results = await query.orderBy(desc(checkins.createdAt)).limit(input.limit || 100);
      return results;
    }),

  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const [checkin] = await database
        .select()
        .from(checkins)
        .where(eq(checkins.id, input.id));
      
      if (!checkin) return null;
      
      // Get client name
      const [protocol] = await database
        .select({ clientName: clientProtocols.clientName })
        .from(clientProtocols)
        .where(eq(clientProtocols.id, checkin.clientProtocolId));
      
      // Get responses
      const responses = await database
        .select()
        .from(checkinResponses)
        .where(eq(checkinResponses.checkinId, input.id));
      
      // Get coach response
      const [coachResponse] = await database
        .select()
        .from(checkinCoachResponses)
        .where(eq(checkinCoachResponses.checkinId, input.id));
      
      // Get template for questions
      const [template] = await database
        .select()
        .from(checkinTemplates)
        .where(eq(checkinTemplates.id, checkin.templateId));
      
      return {
        ...checkin,
        clientName: protocol?.clientName || `Client #${checkin.clientProtocolId}`,
        responses,
        coachResponse,
        questions: parseQuestions(template?.questions),
      };
    }),

  create: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      templateId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const result = await database.insert(checkins).values({
        clientProtocolId: input.clientProtocolId,
        templateId: input.templateId,
        status: 'pending',
        weekNumber: 1,
      });
      return { id: result[0].insertId };
    }),

  markReviewed: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      await database
        .update(checkins)
        .set({
          status: 'reviewed',
          reviewedAt: new Date(),
          reviewedBy: ctx.user?.id,
        })
        .where(eq(checkins.id, input.id));
      return { success: true };
    }),

  // ============ COACH RESPONSES ============
  addCoachResponse: adminProcedure
    .input(z.object({
      checkinId: z.number(),
      responseType: z.enum(['text', 'voice', 'video']),
      textContent: z.string().optional(),
      mediaUrl: z.string().optional(),
      mediaDuration: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      
      // Check if response already exists
      const [existing] = await database
        .select()
        .from(checkinCoachResponses)
        .where(eq(checkinCoachResponses.checkinId, input.checkinId));
      
      if (existing) {
        await database
          .update(checkinCoachResponses)
          .set({
            responseType: input.responseType,
            textContent: input.textContent,
            mediaUrl: input.mediaUrl,
            mediaDuration: input.mediaDuration,
          })
          .where(eq(checkinCoachResponses.id, existing.id));
      } else {
        await database.insert(checkinCoachResponses).values({
          checkinId: input.checkinId,
          coachId: ctx.user!.id,
          responseType: input.responseType,
          textContent: input.textContent,
          mediaUrl: input.mediaUrl,
          mediaDuration: input.mediaDuration,
        });
      }
      
      // Also post the coach response to the client's chat thread for history
      try {
        const [checkinRecord] = await database
          .select({
            clientProtocolId: checkins.clientProtocolId,
            sentAt: checkins.sentAt,
            weekNumber: checkins.weekNumber,
          })
          .from(checkins)
          .where(eq(checkins.id, input.checkinId));
        
        if (checkinRecord) {
          const dateStr = checkinRecord.sentAt 
            ? new Date(checkinRecord.sentAt).toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', year: 'numeric' })
            : 'recent';
          const weekStr = checkinRecord.weekNumber ? ` (Week ${checkinRecord.weekNumber})` : '';
          
          let chatMessage = `📋 **Check-In Review${weekStr} — ${dateStr}**\n\n`;
          if (input.textContent) {
            chatMessage += input.textContent;
          }
          if (input.mediaUrl) {
            const mediaLabel = input.responseType === 'video' ? '🎥 Video response' : '🎙️ Voice response';
            chatMessage += `\n\n${mediaLabel}: ${input.mediaUrl}`;
          }
          
          await database.insert(protocolComments).values({
            clientProtocolId: checkinRecord.clientProtocolId,
            authorType: 'coach',
            authorName: ctx.user?.name || 'Coach',
            message: chatMessage,
          });
        }
      } catch (chatError) {
        console.error('[CheckinRouter] Failed to post coach response to chat:', chatError);
      }
      
      return { success: true };
    }),

  uploadMedia: adminProcedure
    .input(z.object({
      base64Data: z.string(),
      fileName: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const base64Content = input.base64Data.includes(',') 
        ? input.base64Data.split(',')[1] 
        : input.base64Data;
      const fileBuffer = Buffer.from(base64Content, 'base64');
      const key = `checkin-media/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, fileBuffer, input.contentType);
      return { url };
    }),

  // ============ TRENDS ============
  getTrends: protectedProcedure
    .input(z.object({
      clientProtocolId: z.number(),
      weeks: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const database = await db();
      const weeksBack = input.weeks || 12;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeksBack * 7));
      
      const checkinsData = await database
        .select()
        .from(checkins)
        .where(and(
          eq(checkins.clientProtocolId, input.clientProtocolId),
          or(
            eq(checkins.status, 'submitted'),
            eq(checkins.status, 'reviewed')
          ),
          gte(checkins.submittedAt, startDate)
        ))
        .orderBy(asc(checkins.submittedAt));
      
      // Get responses for photo/metrics checkboxes
      const checkinIds = checkinsData.map(c => c.id);
      const allResponses = checkinIds.length > 0 
        ? await database
            .select({
              checkinId: checkinResponses.checkinId,
              questionId: checkinResponses.questionId,
              booleanValue: checkinResponses.booleanValue,
            })
            .from(checkinResponses)
            .where(sql`${checkinResponses.checkinId} IN (${checkinIds.join(',')})`)
        : [];
      
      const trends = checkinsData.map(checkin => {
        const responses = allResponses.filter(r => r.checkinId === checkin.id);
        const photoCheckbox = responses.find(r => r.questionId === 'photos_checkbox');
        const metricsCheckbox = responses.find(r => r.questionId === 'metrics_checkbox');
        
        return {
          date: checkin.submittedAt,
          overallScore: checkin.overallScore,
          lowestScore: checkin.lowestScore,
          tookPhotos: photoCheckbox?.booleanValue ?? false,
          updatedMetrics: metricsCheckbox?.booleanValue ?? false,
        };
      });
      
      return {
        trends,
        totalCheckins: checkinsData.length,
        averageScore: trends.length > 0 
          ? Math.round(trends.reduce((sum, t) => sum + (t.overallScore || 0), 0) / trends.length * 10) / 10
          : null,
      };
    }),

  // ============ CLIENT SUMMARY (for Charting sub-tab) ============
  getClientSummary: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
    }))
    .query(async ({ input }) => {
      const database = await db();
      
      // Get the schedule for this client
      const [schedule] = await database
        .select()
        .from(checkinSchedules)
        .where(eq(checkinSchedules.clientProtocolId, input.clientProtocolId));
      
      // Get all check-ins for this client
      const allCheckins = await database
        .select()
        .from(checkins)
        .where(eq(checkins.clientProtocolId, input.clientProtocolId))
        .orderBy(asc(checkins.createdAt));
      
      if (allCheckins.length === 0) {
        return {
          hasData: false,
          schedule: schedule || null,
          stats: {
            totalSent: 0,
            totalCompleted: 0,
            totalIncomplete: 0,
            totalPending: 0,
            completionRate: 0,
            averageScore: null as number | null,
            currentStreak: schedule?.currentStreak || 0,
            longestStreak: schedule?.longestStreak || 0,
            lastResponseAt: schedule?.lastResponseAt || null,
          },
          latestCheckin: null,
          trendData: [] as Array<{
            date: Date | null;
            weekNumber: number | null;
            overallScore: number | null;
            lowestScore: number | null;
            q1Score: number | null;
            q1Text: string | null;
            hasLowScore: boolean;
            status: string;
          }>,
        };
      }
      
      // Calculate stats
      const totalSent = allCheckins.filter(c => c.sentAt).length;
      const completed = allCheckins.filter(c => c.status === 'submitted' || c.status === 'reviewed');
      const totalCompleted = completed.length;
      const totalIncomplete = allCheckins.filter(c => c.status === 'incomplete').length;
      const totalPending = allCheckins.filter(c => c.status === 'pending').length;
      const completionRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;
      
      const scoredCheckins = allCheckins.filter(c => c.overallScore !== null);
      const averageScore = scoredCheckins.length > 0
        ? Math.round(scoredCheckins.reduce((sum, c) => sum + (c.overallScore || 0), 0) / scoredCheckins.length * 10) / 10
        : null;
      
      // Get the latest submitted check-in with its responses
      const latestSubmitted = [...allCheckins]
        .reverse()
        .find(c => c.status === 'submitted' || c.status === 'reviewed');
      
      let latestCheckin = null;
      if (latestSubmitted) {
        const latestResponses = await database
          .select()
          .from(checkinResponses)
          .where(eq(checkinResponses.checkinId, latestSubmitted.id));
        
        latestCheckin = {
          ...latestSubmitted,
          responses: latestResponses,
        };
      }
      
      // Build trend data: for each completed check-in, get the scale responses
      const completedIds = completed.map(c => c.id);
      const allResponses = completedIds.length > 0
        ? await database
            .select()
            .from(checkinResponses)
            .where(sql`${checkinResponses.checkinId} IN (${sql.join(completedIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      const trendData = completed.map(checkin => {
        const responses = allResponses.filter(r => r.checkinId === checkin.id);
        const scaleResponses = responses.filter(r => r.questionType === 'scale');
        
        // Get the first scale question value (Question 1 - overall experience)
        const q1Response = scaleResponses[0];
        
        return {
          date: checkin.submittedAt || checkin.createdAt,
          weekNumber: checkin.weekNumber,
          overallScore: checkin.overallScore,
          lowestScore: checkin.lowestScore,
          q1Score: q1Response?.scaleValue || null,
          q1Text: q1Response?.questionText || null,
          hasLowScore: checkin.hasLowScore,
          status: checkin.status,
        };
      });
      
      return {
        hasData: true,
        schedule: schedule || null,
        stats: {
          totalSent,
          totalCompleted,
          totalIncomplete,
          totalPending,
          completionRate,
          averageScore,
          currentStreak: schedule?.currentStreak || 0,
          longestStreak: schedule?.longestStreak || 0,
          lastResponseAt: schedule?.lastResponseAt || null,
        },
        latestCheckin,
        trendData,
      };
    }),

  // ============ NOTIFICATION TEMPLATES ============
  notificationTemplates: router({
    list: adminProcedure.query(async () => {
      const database = await db();
      return database.select().from(checkinNotificationTemplates);
    }),
    
    update: adminProcedure
      .input(z.object({
        templateType: z.string(),
        subject: z.string().optional(),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db();
        const { templateType, ...updates } = input;
        await database
          .update(checkinNotificationTemplates)
          .set(updates)
          .where(eq(checkinNotificationTemplates.templateType, templateType));
        return { success: true };
      }),
  }),

  // ============ DASHBOARD QUERIES ============
  getPendingReviews: adminProcedure.query(async () => {
    const database = await db();
    const pending = await database
      .select()
      .from(checkins)
      .where(eq(checkins.status, 'submitted'))
      .orderBy(desc(checkins.submittedAt));
    return pending;
  }),

  getStats: adminProcedure.query(async () => {
    const database = await db();
    
    // Get enabled schedules count
    const [enabledCount] = await database
      .select({ count: sql<number>`COUNT(*)` })
      .from(checkinSchedules)
      .where(eq(checkinSchedules.isEnabled, true));
    
    // Get check-in counts by status
    const submitted = await database
      .select()
      .from(checkins)
      .where(eq(checkins.status, 'submitted'));
    
    const pending = await database
      .select()
      .from(checkins)
      .where(eq(checkins.status, 'pending'));
    
    const incomplete = await database
      .select()
      .from(checkins)
      .where(eq(checkins.status, 'incomplete'));
    
    const reviewed = await database
      .select()
      .from(checkins)
      .where(eq(checkins.status, 'reviewed'));
    
    const awaitingReview = submitted.filter(c => !c.reviewedAt);
    
    return {
      enabledClients: enabledCount?.count ?? 0,
      submitted: submitted.length,
      pending: pending.length,
      incomplete: incomplete.length,
      reviewed: reviewed.length,
      awaitingReview: awaitingReview.length,
    };
  }),

  // ============ ADMIN CHECK-IN HISTORY ============
  getClientCheckinHistory: adminProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      
      // Get all check-ins for this client, ordered by date
      const allCheckins = await database
        .select()
        .from(checkins)
        .where(eq(checkins.clientProtocolId, input.clientProtocolId))
        .orderBy(desc(checkins.submittedAt));
      
      if (allCheckins.length === 0) return [];
      
      // Get all responses for these check-ins
      const checkinIds = allCheckins.map(c => c.id);
      const allResponses = await database
        .select()
        .from(checkinResponses)
        .where(sql`${checkinResponses.checkinId} IN (${sql.join(checkinIds.map(id => sql`${id}`), sql`, `)})`);
      
      // Get all coach responses for these check-ins
      const allCoachResponses = await database
        .select()
        .from(checkinCoachResponses)
        .where(sql`${checkinCoachResponses.checkinId} IN (${sql.join(checkinIds.map(id => sql`${id}`), sql`, `)})`);
      
      // Get unique template IDs and fetch templates
      const templateIds = [...new Set(allCheckins.map(c => c.templateId))];
      const templates = await database
        .select()
        .from(checkinTemplates)
        .where(sql`${checkinTemplates.id} IN (${sql.join(templateIds.map(id => sql`${id}`), sql`, `)})`);
      const templateMap = new Map(templates.map(t => [t.id, t]));
      
      // Assemble the full history
      return allCheckins.map(checkin => {
        const responses = allResponses.filter(r => r.checkinId === checkin.id);
        const coachResponse = allCoachResponses.find(r => r.checkinId === checkin.id);
        const template = templateMap.get(checkin.templateId);
        
        return {
          ...checkin,
          responses,
          coachResponse: coachResponse || null,
          questions: parseQuestions(template?.questions),
          templateName: template?.name || 'Unknown Template',
        };
      });
    }),

  // ============ CLIENT PORTAL ============
  getClientHistory: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const database = await db();
      const { getClientProtocolByToken } = await import("../db");
      const protocol = await getClientProtocolByToken(input.token);
      
      if (!protocol) {
        throw new Error("Invalid access token");
      }
      
      const history = await database
        .select()
        .from(checkins)
        .where(eq(checkins.clientProtocolId, protocol.id))
        .orderBy(desc(checkins.createdAt));
      
      return history;
    }),

  getForClient: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const [checkin] = await database
        .select()
        .from(checkins)
        .where(eq(checkins.id, input.id));

      if (!checkin) {
        throw new Error("Check-in not found");
      }

      // Get the template questions; fall back to default template if templateId is missing/invalid
      let [template] = checkin.templateId
        ? await database.select().from(checkinTemplates).where(eq(checkinTemplates.id, checkin.templateId))
        : [];

      if (!template) {
        [template] = await database
          .select()
          .from(checkinTemplates)
          .where(eq(checkinTemplates.isDefault, 1))
          .limit(1);
      }
      if (!template) {
        [template] = await database.select().from(checkinTemplates).limit(1);
      }

      return {
        ...checkin,
        questions: parseQuestions(template?.questions),
      };
    }),

  submit: publicProcedure
    .input(z.object({
      checkinId: z.number(),
      responses: z.array(z.object({
        questionId: z.string(),
        questionText: z.string(),
        questionType: z.string(),
        scaleValue: z.number().optional(),
        textValue: z.string().optional(),
        booleanValue: z.boolean().optional(),
        selectValue: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      
      // Get the check-in
      const [checkin] = await database
        .select()
        .from(checkins)
        .where(eq(checkins.id, input.checkinId));
      
      if (!checkin) {
        throw new Error("Check-in not found");
      }
      
      if (checkin.status === 'submitted' || checkin.status === 'reviewed') {
        throw new Error("Check-in already submitted");
      }
      
      // Calculate scores
      const scaleResponses = input.responses.filter(r => r.scaleValue !== undefined);
      const overallScore = scaleResponses.length > 0
        ? Math.round(scaleResponses.reduce((sum, r) => sum + (r.scaleValue || 0), 0) / scaleResponses.length * 10) / 10
        : null;
      const lowestScore = scaleResponses.length > 0
        ? Math.min(...scaleResponses.map(r => r.scaleValue || 10))
        : null;
      
      // Insert responses
      for (const response of input.responses) {
        await database.insert(checkinResponses).values({
          checkinId: input.checkinId,
          questionId: response.questionId,
          questionText: response.questionText,
          questionType: response.questionType,
          scaleValue: response.scaleValue,
          textValue: response.textValue,
          booleanValue: response.booleanValue,
          selectValue: response.selectValue,
        });
      }
      
      // Update check-in status
      await database
        .update(checkins)
        .set({
          status: 'submitted',
          submittedAt: new Date(),
          overallScore,
          lowestScore,
        })
        .where(eq(checkins.id, input.checkinId));
      
      // Update streak tracking
      try {
        const [schedule] = await database
          .select()
          .from(checkinSchedules)
          .where(eq(checkinSchedules.clientProtocolId, checkin.clientProtocolId));
        
        if (schedule) {
          // Check if this is a consecutive response (within 7 days of last response or first response)
          const now = new Date();
          const lastResponse = schedule.lastResponseAt;
          const isConsecutive = !lastResponse || 
            (now.getTime() - new Date(lastResponse).getTime()) < 14 * 24 * 60 * 60 * 1000; // Within 14 days
          
          const newStreak = isConsecutive ? (schedule.currentStreak || 0) + 1 : 1;
          const newLongestStreak = Math.max(newStreak, schedule.longestStreak || 0);
          
          await database
            .update(checkinSchedules)
            .set({
              currentStreak: newStreak,
              longestStreak: newLongestStreak,
              totalResponses: (schedule.totalResponses || 0) + 1,
              lastResponseAt: now,
            })
            .where(eq(checkinSchedules.id, schedule.id));
        }
      } catch (streakError) {
        console.error('Failed to update streak tracking:', streakError);
      }
      
      // Send notification to admins about check-in submission
      try {
        // Get client info
        const [protocol] = await database
          .select({ clientName: clientProtocols.clientName, id: clientProtocols.id })
          .from(clientProtocols)
          .where(eq(clientProtocols.id, checkin.clientProtocolId));
        
        if (protocol) {
          const { createNotificationsForEnabledUsers } = await import('../db');
          const scoreText = overallScore ? ` (Score: ${overallScore}/10)` : '';
          const lowScoreWarning = lowestScore && lowestScore <= 5 ? ' ⚠️ Low score detected!' : '';
          
          await createNotificationsForEnabledUsers(
            'other',
            `${protocol.clientName} submitted check-in${lowScoreWarning}`,
            `${protocol.clientName} has submitted their weekly check-in${scoreText}.${lowScoreWarning ? ' Review recommended.' : ''}`,
            protocol.id
          );
          
          // Send email notification to admins
          const { sendEmail } = await import('../emailService');
          const { getAdminEmails } = await import('../db');
          const adminEmails = await getAdminEmails();
          
          for (const email of adminEmails) {
            try {
              await sendEmail({
                to: email,
                subject: `Check-In Submitted: ${protocol.clientName}${lowScoreWarning}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a365d;">Weekly Check-In Submitted</h2>
                    <p><strong>${protocol.clientName}</strong> has submitted their weekly check-in.</p>
                    ${overallScore ? `<p><strong>Overall Score:</strong> ${overallScore}/10</p>` : ''}
                    ${lowestScore && lowestScore <= 5 ? `<p style="color: #e53e3e;"><strong>⚠️ Low Score Alert:</strong> Lowest score was ${lowestScore}/10. Review recommended.</p>` : ''}
                    <p style="margin-top: 20px;">
                      <a href="${process.env.VITE_APP_URL || 'https://peptidecoach.pro'}/admin/clients/${protocol.id}" 
                         style="background-color: #ed8936; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Review Check-In
                      </a>
                    </p>
                  </div>
                `,
                _logCategory: 'checkin',
                _logType: 'checkin_submission_notification',
                _logClientProtocolId: protocol.id,
                _logRecipientName: protocol.clientName,
                _logTriggeredBy: 'system',
              });
            } catch (emailError) {
              console.error(`Failed to send check-in notification email to ${email}:`, emailError);
            }
          }
        }
      } catch (notifError) {
        console.error('Failed to send check-in submission notification:', notifError);
      }
      
      return { success: true };
    }),

  // ============ CLIENT PORTAL (LOGGED IN) ============
  getClientPending: protectedProcedure.query(async ({ ctx }) => {
    const database = await db();
    const userEmail = ctx.user?.email;
    if (!userEmail) throw new Error("Not authenticated");
    
    // Find client protocol by user email
    const [protocol] = await database
      .select()
      .from(clientProtocols)
      .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${userEmail})`);
    
    if (!protocol) return [];
    
    const pending = await database
      .select()
      .from(checkins)
      .where(and(
        eq(checkins.clientProtocolId, protocol.id),
        eq(checkins.status, 'pending')
      ))
      .orderBy(desc(checkins.dueAt));
    
    return pending;
  }),

  getClientHistoryAuth: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const database = await db();
      const userEmail = ctx.user?.email;
      if (!userEmail) throw new Error("Not authenticated");
      
      // Find client protocol by user email
      const [protocol] = await database
        .select()
        .from(clientProtocols)
        .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${userEmail})`);
      
      if (!protocol) return [];
      
      let query = database
        .select()
        .from(checkins)
        .where(and(
          eq(checkins.clientProtocolId, protocol.id),
          eq(checkins.status, 'submitted')
        ))
        .orderBy(desc(checkins.submittedAt));
      
      if (input?.limit) {
        query = query.limit(input.limit) as typeof query;
      }
      
      return query;
    }),

  // ============ PDF EXPORT ============
  exportPdf: adminProcedure
    .input(z.object({ checkinId: z.number() }))
    .mutation(async ({ input }) => {
      const pdfBuffer = await generateCheckinPdf(input.checkinId);
      const base64 = pdfBuffer.toString('base64');
      return { 
        success: true, 
        pdf: base64,
        filename: `checkin-${input.checkinId}.pdf`
      };
    }),

  exportHistoryPdf: adminProcedure
    .input(z.object({ 
      clientProtocolId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      const pdfBuffer = await generateCheckinHistoryPdf(input.clientProtocolId, startDate, endDate);
      const base64 = pdfBuffer.toString('base64');
      return { 
        success: true, 
        pdf: base64,
        filename: `checkin-history-${input.clientProtocolId}.pdf`
      };
    }),

  // ============ NOTIFICATION TEMPLATES ============
  getNotificationTemplates: adminProcedure.query(async () => {
    const database = await db();
    const templates = await database
      .select()
      .from(checkinNotificationTemplates)
      .orderBy(asc(checkinNotificationTemplates.category), asc(checkinNotificationTemplates.name));
    return templates;
  }),

  updateNotificationTemplate: adminProcedure
    .input(z.object({
      id: z.number(),
      subject: z.string(),
      body: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database
        .update(checkinNotificationTemplates)
        .set({
          subject: input.subject,
          bodyHtml: input.body,
          isCustomized: true,
          updatedAt: new Date(),
        })
        .where(eq(checkinNotificationTemplates.id, input.id));
      return { success: true };
    }),

  resetNotificationTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      
      // Get the template to find its type
      const [template] = await database
        .select()
        .from(checkinNotificationTemplates)
        .where(eq(checkinNotificationTemplates.id, input.id));
      
      if (!template) throw new Error('Template not found');
      
      // Get default content based on template type
      const defaults = getDefaultTemplateContent(template.templateType);
      
      await database
        .update(checkinNotificationTemplates)
        .set({
          subject: defaults.subject,
          bodyHtml: defaults.body,
          isCustomized: false,
          updatedAt: new Date(),
        })
        .where(eq(checkinNotificationTemplates.id, input.id));
      
      return { success: true };
    }),
  
  // ============ ANALYTICS ============
  analytics: router({
    // Get comprehensive check-in analytics
    getDashboard: adminProcedure.query(async () => {
      const database = await db();
      
      // Get all enabled schedules with client info and streak data
      const enabledSchedules = await database
        .select({
          scheduleId: checkinSchedules.id,
          clientProtocolId: checkinSchedules.clientProtocolId,
          isEnabled: checkinSchedules.isEnabled,
          nextScheduledAt: checkinSchedules.nextScheduledAt,
          clientName: clientProtocols.clientName,
          clientEmail: clientProtocols.clientEmail,
          currentStreak: checkinSchedules.currentStreak,
          longestStreak: checkinSchedules.longestStreak,
          totalResponses: checkinSchedules.totalResponses,
          totalSent: checkinSchedules.totalSent,
          lastResponseAt: checkinSchedules.lastResponseAt,
          engagementLevel: clientProtocols.engagementLevel,
        })
        .from(checkinSchedules)
        .leftJoin(clientProtocols, eq(checkinSchedules.clientProtocolId, clientProtocols.id))
        .where(eq(checkinSchedules.isEnabled, true));
      
      // Get all check-ins with status counts and engagement level
      const allCheckins = await database
        .select({
          id: checkins.id,
          clientProtocolId: checkins.clientProtocolId,
          status: checkins.status,
          overallScore: checkins.overallScore,
          hasLowScore: checkins.hasLowScore,
          sentAt: checkins.sentAt,
          submittedAt: checkins.submittedAt,
          reviewedAt: checkins.reviewedAt,
          dueAt: checkins.dueAt,
          createdAt: checkins.createdAt,
          engagementLevel: clientProtocols.engagementLevel,
        })
        .from(checkins)
        .leftJoin(clientProtocols, eq(checkins.clientProtocolId, clientProtocols.id))
        .orderBy(desc(checkins.createdAt));
      
      // Calculate stats
      const totalEnabled = enabledSchedules.length;
      const totalCheckins = allCheckins.length;
      const pendingCheckins = allCheckins.filter(c => c.status === 'pending').length;
      const submittedCheckins = allCheckins.filter(c => c.status === 'submitted').length;
      const reviewedCheckins = allCheckins.filter(c => c.status === 'reviewed').length;
      const expiredCheckins = allCheckins.filter(c => c.status === 'incomplete').length;
      const lowScoreCheckins = allCheckins.filter(c => c.hasLowScore).length;
      
      // Response rate (submitted + reviewed / total sent)
      const sentCheckins = allCheckins.filter(c => c.sentAt).length;
      const respondedCheckins = submittedCheckins + reviewedCheckins;
      const responseRate = sentCheckins > 0 ? Math.round((respondedCheckins / sentCheckins) * 100) : 0;
      
      // Average score
      const scoredCheckins = allCheckins.filter(c => c.overallScore !== null);
      const avgScore = scoredCheckins.length > 0 
        ? Math.round(scoredCheckins.reduce((sum, c) => sum + (c.overallScore || 0), 0) / scoredCheckins.length * 10) / 10
        : 0;
      
      // Get clients who haven't responded (pending check-ins)
      const clientsWithPending = await database
        .select({
          clientProtocolId: checkins.clientProtocolId,
          clientName: clientProtocols.clientName,
          clientEmail: clientProtocols.clientEmail,
          sentAt: checkins.sentAt,
          dueAt: checkins.dueAt,
          engagementLevel: clientProtocols.engagementLevel,
        })
        .from(checkins)
        .leftJoin(clientProtocols, eq(checkins.clientProtocolId, clientProtocols.id))
        .where(eq(checkins.status, 'pending'))
        .orderBy(asc(checkins.sentAt));
      
      // Get recent check-ins for activity feed
      const recentActivity = await database
        .select({
          id: checkins.id,
          clientProtocolId: checkins.clientProtocolId,
          clientName: clientProtocols.clientName,
          status: checkins.status,
          overallScore: checkins.overallScore,
          hasLowScore: checkins.hasLowScore,
          submittedAt: checkins.submittedAt,
          createdAt: checkins.createdAt,
          engagementLevel: clientProtocols.engagementLevel,
        })
        .from(checkins)
        .leftJoin(clientProtocols, eq(checkins.clientProtocolId, clientProtocols.id))
        .orderBy(desc(checkins.createdAt))
        .limit(20);
      
      // Weekly trend (last 4 weeks)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      
      const weeklyCheckins = allCheckins.filter(c => 
        c.createdAt && new Date(c.createdAt) >= fourWeeksAgo
      );
      
      // Group by week
      const weeklyStats: { week: string; sent: number; responded: number; responseRate: number }[] = [];
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (7 * (i + 1)));
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (7 * i));
        
        const weekCheckins = weeklyCheckins.filter(c => {
          const created = new Date(c.createdAt!);
          return created >= weekStart && created < weekEnd;
        });
        
        const weekSent = weekCheckins.filter(c => c.sentAt).length;
        const weekResponded = weekCheckins.filter(c => 
          c.status === 'submitted' || c.status === 'reviewed'
        ).length;
        
        weeklyStats.unshift({
          week: `Week ${4 - i}`,
          sent: weekSent,
          responded: weekResponded,
          responseRate: weekSent > 0 ? Math.round((weekResponded / weekSent) * 100) : 0,
        });
      }
      
      return {
        summary: {
          totalEnabled,
          totalCheckins,
          pendingCheckins,
          submittedCheckins,
          reviewedCheckins,
          expiredCheckins,
          lowScoreCheckins,
          responseRate,
          avgScore,
        },
        clientsWithPending,
        recentActivity,
        weeklyStats,
        enabledSchedules,
        _allCheckins: allCheckins,
      };
    }),
  }),
  
  // CSV Export for check-in data
  exportCsv: adminProcedure
    .input(z.object({
      type: z.enum(['all', 'responses', 'schedules', 'analytics']),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      clientProtocolId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      
      let csvContent = '';
      let filename = '';
      
      if (input.type === 'all' || input.type === 'responses') {
        // Export all check-in responses
        const responses = await database
          .select({
            checkinId: checkins.id,
            clientName: clientProtocols.clientName,
            clientEmail: clientProtocols.clientEmail,
            status: checkins.status,
            overallScore: checkins.overallScore,
            lowestScore: checkins.lowestScore,
            hasLowScore: checkins.hasLowScore,
            sentAt: checkins.sentAt,
            submittedAt: checkins.submittedAt,
            reviewedAt: checkins.reviewedAt,
            dueAt: checkins.dueAt,
            weekNumber: checkins.weekNumber,
          })
          .from(checkins)
          .leftJoin(clientProtocols, eq(checkins.clientProtocolId, clientProtocols.id))
          .orderBy(desc(checkins.createdAt));
        
        // Build CSV
        csvContent = 'Check-In ID,Client Name,Client Email,Status,Overall Score,Lowest Score,Low Score Alert,Sent At,Submitted At,Reviewed At,Due At,Week Number\n';
        for (const r of responses) {
          csvContent += `${r.checkinId},"${r.clientName || ''}","${r.clientEmail || ''}",${r.status},${r.overallScore || ''},${r.lowestScore || ''},${r.hasLowScore ? 'Yes' : 'No'},${r.sentAt ? new Date(r.sentAt).toISOString() : ''},${r.submittedAt ? new Date(r.submittedAt).toISOString() : ''},${r.reviewedAt ? new Date(r.reviewedAt).toISOString() : ''},${r.dueAt ? new Date(r.dueAt).toISOString() : ''},${r.weekNumber || ''}\n`;
        }
        filename = `checkin-responses-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (input.type === 'schedules') {
        // Export schedule data with streaks
        const schedules = await database
          .select({
            clientName: clientProtocols.clientName,
            clientEmail: clientProtocols.clientEmail,
            isEnabled: checkinSchedules.isEnabled,
            frequency: checkinSchedules.frequency,
            dayOfWeek: checkinSchedules.dayOfWeek,
            timeOfDay: checkinSchedules.timeOfDay,
            timezone: checkinSchedules.timezone,
            currentStreak: checkinSchedules.currentStreak,
            longestStreak: checkinSchedules.longestStreak,
            totalResponses: checkinSchedules.totalResponses,
            totalSent: checkinSchedules.totalSent,
            lastResponseAt: checkinSchedules.lastResponseAt,
            nextScheduledAt: checkinSchedules.nextScheduledAt,
          })
          .from(checkinSchedules)
          .leftJoin(clientProtocols, eq(checkinSchedules.clientProtocolId, clientProtocols.id));
        
        csvContent = 'Client Name,Client Email,Enabled,Frequency,Day of Week,Time,Timezone,Current Streak,Best Streak,Total Responses,Total Sent,Response Rate,Last Response,Next Scheduled\n';
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (const s of schedules) {
          const responseRate = s.totalSent && s.totalSent > 0 ? Math.round((s.totalResponses || 0) / s.totalSent * 100) : 0;
          csvContent += `"${s.clientName || ''}","${s.clientEmail || ''}",${s.isEnabled ? 'Yes' : 'No'},${s.frequency},${dayNames[s.dayOfWeek || 0]},${s.timeOfDay},${s.timezone},${s.currentStreak || 0},${s.longestStreak || 0},${s.totalResponses || 0},${s.totalSent || 0},${responseRate}%,${s.lastResponseAt ? new Date(s.lastResponseAt).toISOString() : ''},${s.nextScheduledAt ? new Date(s.nextScheduledAt).toISOString() : ''}\n`;
        }
        filename = `checkin-schedules-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (input.type === 'analytics') {
        // Export analytics summary
        const allCheckins = await database.select().from(checkins);
        const enabledSchedules = await database
          .select()
          .from(checkinSchedules)
          .where(eq(checkinSchedules.isEnabled, true));
        
        const totalSent = allCheckins.filter(c => c.sentAt).length;
        const totalResponded = allCheckins.filter(c => c.status === 'submitted' || c.status === 'reviewed').length;
        const responseRate = totalSent > 0 ? Math.round((totalResponded / totalSent) * 100) : 0;
        const scoredCheckins = allCheckins.filter(c => c.overallScore !== null);
        const avgScore = scoredCheckins.length > 0 
          ? Math.round(scoredCheckins.reduce((sum, c) => sum + (c.overallScore || 0), 0) / scoredCheckins.length * 10) / 10
          : 0;
        
        csvContent = 'Metric,Value\n';
        csvContent += `Total Clients with Check-Ins Enabled,${enabledSchedules.length}\n`;
        csvContent += `Total Check-Ins Sent,${totalSent}\n`;
        csvContent += `Total Responses,${totalResponded}\n`;
        csvContent += `Response Rate,${responseRate}%\n`;
        csvContent += `Average Score,${avgScore}\n`;
        csvContent += `Pending Check-Ins,${allCheckins.filter(c => c.status === 'pending').length}\n`;
        csvContent += `Submitted (Awaiting Review),${allCheckins.filter(c => c.status === 'submitted').length}\n`;
        csvContent += `Reviewed,${allCheckins.filter(c => c.status === 'reviewed').length}\n`;
        csvContent += `Expired (No Response),${allCheckins.filter(c => c.status === 'incomplete').length}\n`;
        csvContent += `Low Score Alerts,${allCheckins.filter(c => c.hasLowScore).length}\n`;
        filename = `checkin-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      return {
        csv: csvContent,
        filename,
      };
    }),
  
  // ============ SETTINGS ============
  settings: router({
    get: adminProcedure.query(async () => {
      const database = await db();
      
      // Get low score threshold setting
      const [lowScoreSetting] = await database.execute(sql`
        SELECT value FROM site_settings WHERE \`key\` = 'checkin_low_score_threshold'
      `) as any;
      const lowScoreThreshold = lowScoreSetting?.[0]?.value ? parseInt(lowScoreSetting[0].value) : 5;
      
      // Get reminder escalation hours setting
      const [reminderSetting] = await database.execute(sql`
        SELECT value FROM site_settings WHERE \`key\` = 'checkin_reminder_escalation_hours'
      `) as any;
      const reminderEscalationHours = reminderSetting?.[0]?.value ? parseInt(reminderSetting[0].value) : 48;
      
      return {
        lowScoreThreshold,
        reminderEscalationHours,
      };
    }),
    
    update: adminProcedure
      .input(z.object({
        lowScoreThreshold: z.number().min(1).max(10).optional(),
        reminderEscalationHours: z.number().min(24).max(72).optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db();
        
        if (input.lowScoreThreshold !== undefined) {
          await database.execute(sql`
            INSERT INTO site_settings (\`key\`, value) 
            VALUES ('checkin_low_score_threshold', ${input.lowScoreThreshold.toString()})
            ON DUPLICATE KEY UPDATE value = ${input.lowScoreThreshold.toString()}
          `);
        }
        
        if (input.reminderEscalationHours !== undefined) {
          await database.execute(sql`
            INSERT INTO site_settings (\`key\`, value) 
            VALUES ('checkin_reminder_escalation_hours', ${input.reminderEscalationHours.toString()})
            ON DUPLICATE KEY UPDATE value = ${input.reminderEscalationHours.toString()}
          `);
        }
        
        return { success: true };
      }),
  }),

  // ============ MANUAL SEND / RESEND ============
  sendTestCheckin: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Respect the global kill switch — this sends a real check-in to the client
      if (!(await areCheckinsGloballyEnabled())) {
        throw new Error('Check-ins are globally disabled. Enable them in Check-in Management before sending.');
      }
      const database = await db();

      // Get client protocol info
      const [protocol] = await database
        .select()
        .from(clientProtocols)
        .where(eq(clientProtocols.id, input.clientProtocolId));

      if (!protocol) throw new Error('Client protocol not found');
      if (!protocol.clientEmail) throw new Error('Client has no email address');
      
      // Get the schedule
      const [schedule] = await database
        .select()
        .from(checkinSchedules)
        .where(eq(checkinSchedules.clientProtocolId, input.clientProtocolId));

      // Resolve checkin template ID: schedule → default → first available
      let checkinTemplateId = schedule?.templateId || 0;
      if (!checkinTemplateId) {
        const [defaultTpl] = await database
          .select({ id: checkinTemplates.id })
          .from(checkinTemplates)
          .where(eq(checkinTemplates.isDefault, 1))
          .limit(1);
        checkinTemplateId = defaultTpl?.id || 0;
      }
      if (!checkinTemplateId) {
        const [anyTpl] = await database
          .select({ id: checkinTemplates.id })
          .from(checkinTemplates)
          .limit(1);
        checkinTemplateId = anyTpl?.id || 0;
      }
      if (!checkinTemplateId) throw new Error('No check-in question template found. Please create a check-in template first.');

      // Get the check-in email template
      const [template] = await database
        .select()
        .from(checkinNotificationTemplates)
        .where(eq(checkinNotificationTemplates.templateType, 'checkin_reminder'));

      if (!template) throw new Error('No check-in email template found. Please create a checkin_reminder template first.');

      const coachName = process.env.OWNER_NAME || 'Your Coach';
      const now = new Date();

      // Calculate week number
      const protocolStart = new Date(protocol.createdAt || new Date());
      const weekNumber = Math.ceil((now.getTime() - protocolStart.getTime()) / (7 * 24 * 60 * 60 * 1000));

      // Create the check-in record
      const result = await database.insert(checkins).values({
        clientProtocolId: input.clientProtocolId,
        templateId: checkinTemplateId,
        status: 'pending',
        weekNumber,
        sentAt: now,
        dueAt: new Date(now.getTime() + 72 * 60 * 60 * 1000),
      } as any);
      
      const checkinId = result[0].insertId;
      
      // Build the email
      const clientName = protocol.clientName || 'Client';
      const checkinUrl = `${process.env.VITE_APP_URL || ''}/checkin/${checkinId}`;
      
      const subject = (template.subject || 'Weekly Check-in')
        .replace(/\{\{clientName\}\}/g, clientName)
        .replace(/\{\{client_name\}\}/g, clientName)
        .replace(/\{\{weekNumber\}\}/g, weekNumber.toString())
        .replace(/\{\{week_number\}\}/g, weekNumber.toString());
      
      const body = (template.bodyHtml || '')
        .replace(/\{\{clientName\}\}/g, clientName)
        .replace(/\{\{client_name\}\}/g, clientName)
        .replace(/\{\{weekNumber\}\}/g, weekNumber.toString())
        .replace(/\{\{week_number\}\}/g, weekNumber.toString())
        .replace(/\{\{checkinLink\}\}/g, checkinUrl)
        .replace(/\{\{checkin_url\}\}/g, checkinUrl)
        .replace(/\{\{coachName\}\}/g, coachName)
        .replace(/\{\{coach_name\}\}/g, coachName);
      
      // Send the email
      const { sendEmail } = await import('../emailService');
      const emailResult = await sendEmail({
        to: protocol.clientEmail,
        subject,
        html: body,
        _logCategory: 'checkin',
        _logType: 'test_checkin',
        _logClientProtocolId: input.clientProtocolId,
        _logTriggeredBy: 'admin',
      });

      if (!emailResult.success) {
        throw new Error(`Email delivery failed: ${emailResult.error || 'Unknown SMTP error'}`);
      }

      if (emailResult.messageId?.startsWith('simulated-')) {
        throw new Error('SMTP is not configured on the server. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in Railway environment variables.');
      }

      // Log the notification
      await database.insert(checkinNotificationLogs).values({
        checkinId,
        clientProtocolId: input.clientProtocolId,
        notificationType: 'manual_test',
        recipientType: 'client',
        recipientEmail: protocol.clientEmail,
        subject,
        sentAt: now,
        status: 'sent',
      });

      return {
        success: true,
        checkinId,
        message: `Test check-in sent to ${protocol.clientEmail}`,
      };
    }),

  resendCheckin: adminProcedure
    .input(z.object({
      checkinId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Respect the global kill switch — this resends a real check-in email
      if (!(await areCheckinsGloballyEnabled())) {
        throw new Error('Check-ins are globally disabled. Enable them in Check-in Management before resending.');
      }
      const database = await db();

      // Get the check-in
      const [checkin] = await database
        .select()
        .from(checkins)
        .where(eq(checkins.id, input.checkinId));
      
      if (!checkin) throw new Error('Check-in not found');
      
      // Get client protocol info
      const [protocol] = await database
        .select()
        .from(clientProtocols)
        .where(eq(clientProtocols.id, checkin.clientProtocolId));
      
      if (!protocol) throw new Error('Client protocol not found');
      if (!protocol.clientEmail) throw new Error('Client has no email address');
      
      // Get the check-in email template
      const [template] = await database
        .select()
        .from(checkinNotificationTemplates)
        .where(eq(checkinNotificationTemplates.templateType, 'checkin_reminder'));
      
      if (!template) throw new Error('No check-in email template found.');
      
      const coachName = process.env.OWNER_NAME || 'Your Coach';
      const clientName = protocol.clientName || 'Client';
      const checkinUrl = `${process.env.VITE_APP_URL || ''}/checkin/${checkin.id}`;
      const weekNumber = checkin.weekNumber || 1;
      
      const subject = (template.subject || 'Weekly Check-in Reminder')
        .replace(/\{\{clientName\}\}/g, clientName)
        .replace(/\{\{client_name\}\}/g, clientName)
        .replace(/\{\{weekNumber\}\}/g, weekNumber.toString())
        .replace(/\{\{week_number\}\}/g, weekNumber.toString());
      
      const body = (template.bodyHtml || '')
        .replace(/\{\{clientName\}\}/g, clientName)
        .replace(/\{\{client_name\}\}/g, clientName)
        .replace(/\{\{weekNumber\}\}/g, weekNumber.toString())
        .replace(/\{\{week_number\}\}/g, weekNumber.toString())
        .replace(/\{\{checkinLink\}\}/g, checkinUrl)
        .replace(/\{\{checkin_url\}\}/g, checkinUrl)
        .replace(/\{\{coachName\}\}/g, coachName)
        .replace(/\{\{coach_name\}\}/g, coachName);
      
      // Send the email
      const { sendEmail } = await import('../emailService');
      await sendEmail({
        to: protocol.clientEmail,
        subject: `Reminder: ${subject}`,
        html: body,
      });
      
      // If the check-in was incomplete, reset it to pending with new due date
      if (checkin.status === 'incomplete') {
        await database.update(checkins)
          .set({
            status: 'pending',
            sentAt: new Date(),
            dueAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          })
          .where(eq(checkins.id, checkin.id));
      }
      
      // Log the notification
      await database.insert(checkinNotificationLogs).values({
        checkinId: checkin.id,
        clientProtocolId: checkin.clientProtocolId,
        notificationType: 'manual_resend',
        recipientType: 'client',
        recipientEmail: protocol.clientEmail,
        subject: `Reminder: ${subject}`,
        sentAt: new Date(),
        status: 'sent',
      });
      
      return { 
        success: true, 
        message: `Check-in reminder resent to ${protocol.clientEmail}`,
        statusUpdated: checkin.status === 'incomplete',
      };
    }),

  // ============ MANUAL TRIGGER & CRON HEALTH ============
  manualTrigger: adminProcedure
    .mutation(async () => {
      const { manualTriggerCheckins } = await import('../cron/checkinCron');
      const result = await manualTriggerCheckins();
      return result;
    }),

  cronHealth: adminProcedure
    .query(async () => {
      const { getCronHealthStatus } = await import('../cron/checkinCron');
      const health = await getCronHealthStatus();
      return health;
    }),
});

// Default template content
function getDefaultTemplateContent(templateType: string): { subject: string; body: string } {
  const defaults: Record<string, { subject: string; body: string }> = {
    'checkin_reminder': {
      subject: 'Weekly Check-In Reminder from {{coachName}}',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Weekly Check-In Time!</h2>
        <p>Hi {{clientName}},</p>
        <p>It's time for your weekly check-in. Your coach {{coachName}} is looking forward to hearing about your progress.</p>
        <p><a href="{{checkinLink}}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Complete Check-In</a></p>
        <p style="color: #666;">Due by: {{dueDate}}</p>
      </div>`,
    },
    'checkin_reminder_24h': {
      subject: 'Reminder: Your Check-In is Due Soon',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Check-In Reminder ({{reminderNumber}} reminder)</h2>
        <p>Hi {{clientName}},</p>
        <p>Just a friendly reminder that your weekly check-in is due soon. Please take a few minutes to complete it.</p>
        <p><a href="{{checkinLink}}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Complete Check-In Now</a></p>
      </div>`,
    },
    'low_score_alert': {
      subject: '⚠️ Low Score Alert: {{clientName}}',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Low Score Alert</h2>
        <p>{{clientName}} reported a low score on their check-in:</p>
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Question:</strong> {{questionText}}</p>
          <p style="margin: 5px 0;"><strong>Score:</strong> {{score}}/10</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> {{checkinDate}}</p>
        </div>
        <p><a href="{{reviewLink}}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Check-In</a></p>
      </div>`,
    },
    'daily_digest': {
      subject: 'Daily Operations Summary - {{date}}',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Daily Operations Summary</h2>
        <p>Hi {{coachName}},</p>
        <p>Here's your daily summary:</p>
        <ul>
          <li><strong>Pending Reviews:</strong> {{pendingCount}}</li>
          <li><strong>Low Score Alerts:</strong> {{lowScoreCount}}</li>
          <li><strong>Low Inventory Items:</strong> {{lowInventoryCount}}</li>
        </ul>
        <p><a href="{{dashboardLink}}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Dashboard</a></p>
      </div>`,
    },
    'weekly_digest': {
      subject: 'Weekly Operations Summary - {{date}}',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Weekly Operations Summary</h2>
        <p>Hi {{coachName}},</p>
        <p>Here's your weekly summary:</p>
        <ul>
          <li><strong>Pending Reviews:</strong> {{pendingCount}}</li>
          <li><strong>Low Score Alerts:</strong> {{lowScoreCount}}</li>
          <li><strong>Low Inventory Items:</strong> {{lowInventoryCount}}</li>
        </ul>
        <p><a href="{{dashboardLink}}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Dashboard</a></p>
      </div>`,
    },
    'inventory_low': {
      subject: 'Low Inventory Alert: {{itemName}}',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Inventory Running Low</h2>
        <p>Hi {{clientName}},</p>
        <p>Your inventory of <strong>{{itemName}}</strong> is {{status}}.</p>
        <p>Would you like to reorder?</p>
        <p><a href="{{storeLink}}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Visit Store</a></p>
      </div>`,
    },
  };
  
  return defaults[templateType] || { subject: 'Notification', body: '<p>Notification content</p>' };
}
