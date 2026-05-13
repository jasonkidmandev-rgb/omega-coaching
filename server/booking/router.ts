import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  appointmentTypes,
  availabilitySlots,
  blockedSlots,
  appointments,
  appointmentPackages,
  clientPackages,
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, asc, or, inArray } from "drizzle-orm";

export const bookingRouter = router({
  // ==================== APPOINTMENT TYPES ====================
  
  getAppointmentTypes: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db
      .select()
      .from(appointmentTypes)
      .where(eq(appointmentTypes.isActive, true))
      .orderBy(asc(appointmentTypes.name));
  }),

  createAppointmentType: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        duration: z.number().min(5).max(480),
        price: z.string().optional(),
        color: z.string().optional(),
        allowOnlineBooking: z.boolean().optional(),
        requiresApproval: z.boolean().optional(),
        bufferBefore: z.number().optional(),
        bufferAfter: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(appointmentTypes).values({
        name: input.name,
        description: input.description,
        duration: input.duration,
        price: input.price,
        color: input.color || "#f97316",
        allowOnlineBooking: input.allowOnlineBooking ?? true,
        requiresApproval: input.requiresApproval ?? false,
        bufferBefore: input.bufferBefore || 0,
        bufferAfter: input.bufferAfter || 0,
      });
      return { id: result[0].insertId };
    }),

  updateAppointmentType: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        duration: z.number().optional(),
        price: z.string().optional(),
        color: z.string().optional(),
        isActive: z.boolean().optional(),
        allowOnlineBooking: z.boolean().optional(),
        requiresApproval: z.boolean().optional(),
        bufferBefore: z.number().optional(),
        bufferAfter: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(appointmentTypes).set(updates).where(eq(appointmentTypes.id, id));
      return { success: true };
    }),

  // ==================== AVAILABILITY ====================

  getAvailability: protectedProcedure
    .input(z.object({ coachId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const coachId = input.coachId || 1; // Default to first coach
      return db
        .select()
        .from(availabilitySlots)
        .where(and(eq(availabilitySlots.coachId, coachId), eq(availabilitySlots.isActive, true)))
        .orderBy(asc(availabilitySlots.dayOfWeek), asc(availabilitySlots.startTime));
    }),

  setAvailability: protectedProcedure
    .input(
      z.object({
        coachId: z.number().optional(),
        slots: z.array(
          z.object({
            dayOfWeek: z.number().min(0).max(6),
            startTime: z.string(),
            endTime: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const coachId = input.coachId || 1;

      // Deactivate existing slots
      await db
        .update(availabilitySlots)
        .set({ isActive: false })
        .where(eq(availabilitySlots.coachId, coachId));

      // Insert new slots
      if (input.slots.length > 0) {
        await db.insert(availabilitySlots).values(
          input.slots.map((slot) => ({
            coachId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: true,
          }))
        );
      }

      return { success: true };
    }),

  // ==================== BLOCKED SLOTS ====================

  getBlockedSlots: protectedProcedure
    .input(
      z.object({
        coachId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const coachId = input.coachId || 1;
      return db
        .select()
        .from(blockedSlots)
        .where(eq(blockedSlots.coachId, coachId))
        .orderBy(asc(blockedSlots.startDate));
    }),

  createBlockedSlot: protectedProcedure
    .input(
      z.object({
        coachId: z.number().optional(),
        startDate: z.string(),
        endDate: z.string(),
        reason: z.string().optional(),
        isAllDay: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(blockedSlots).values({
        coachId: input.coachId || 1,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        reason: input.reason,
        isAllDay: input.isAllDay ?? false,
      });
      return { id: result[0].insertId };
    }),

  deleteBlockedSlot: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(blockedSlots).where(eq(blockedSlots.id, input.id));
      return { success: true };
    }),

  // ==================== APPOINTMENTS ====================

  getAppointments: protectedProcedure
    .input(
      z.object({
        coachId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["scheduled", "confirmed", "cancelled", "completed", "no_show"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const coachId = input.coachId || 1;

      let query = db
        .select({
          appointment: appointments,
          appointmentType: appointmentTypes,
        })
        .from(appointments)
        .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
        .where(eq(appointments.coachId, coachId))
        .orderBy(asc(appointments.startTime));

      return query;
    }),

  getUpcomingAppointments: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Show appointments from 2 weeks ago through the future
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      return db
        .select({
          appointment: appointments,
          appointmentType: appointmentTypes,
        })
        .from(appointments)
        .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
        .where(
          and(
            gte(appointments.startTime, twoWeeksAgo),
            inArray(appointments.status, ["scheduled", "confirmed", "completed"])
          )
        )
        .orderBy(asc(appointments.startTime))
        .limit(input.limit || 100);
    }),

  createAppointment: publicProcedure
    .input(
      z.object({
        coachId: z.number().optional(),
        clientProtocolId: z.number().optional(),
        clientName: z.string().min(1),
        clientEmail: z.string().email(),
        clientPhone: z.string().optional(),
        appointmentTypeId: z.number(),
        startTime: z.string(),
        endTime: z.string(),
        clientNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(appointments).values({
        coachId: input.coachId || 1,
        clientProtocolId: input.clientProtocolId,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone,
        appointmentTypeId: input.appointmentTypeId,
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        clientNotes: input.clientNotes,
        status: "scheduled",
      });
      // Create in-app notification for admin about new appointment
      try {
        const { createNotificationsForEnabledUsers } = await import('../db');
        const startDate = new Date(input.startTime);
        const formattedDate = startDate.toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'short', month: 'short', day: 'numeric' });
        const formattedTime = startDate.toLocaleTimeString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit' });
        await createNotificationsForEnabledUsers(
          'appointment_booked',
          'New Appointment Booked',
          `${input.clientName} booked an appointment for ${formattedDate} at ${formattedTime}.`,
        );
      } catch (notifError) {
        console.error('[Booking] Failed to create appointment notification:', notifError);
      }

      return { id: result[0].insertId };
    }),

  updateAppointmentStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["scheduled", "confirmed", "cancelled", "completed", "no_show"]),
        cancellationReason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updates: any = { status: input.status };

      if (input.status === "cancelled") {
        updates.cancelledAt = new Date();
        updates.cancellationReason = input.cancellationReason;
        updates.cancelledBy = "coach";
      }

      if (input.notes) {
        updates.notes = input.notes;
      }

      await db.update(appointments).set(updates).where(eq(appointments.id, input.id));
      return { success: true };
    }),

  // ==================== AVAILABLE SLOTS ====================

  getAvailableSlots: publicProcedure
    .input(
      z.object({
        coachId: z.number().optional(),
        appointmentTypeId: z.number(),
        date: z.string(), // YYYY-MM-DD format
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const coachId = input.coachId || 1;
      const requestedDate = new Date(input.date);
      const dayOfWeek = requestedDate.getDay();

      // Get appointment type for duration
      const [appointmentType] = await db
        .select()
        .from(appointmentTypes)
        .where(eq(appointmentTypes.id, input.appointmentTypeId));

      if (!appointmentType) {
        return [];
      }

      // Get availability for this day
      const availability = await db
        .select()
        .from(availabilitySlots)
        .where(
          and(
            eq(availabilitySlots.coachId, coachId),
            eq(availabilitySlots.dayOfWeek, dayOfWeek),
            eq(availabilitySlots.isActive, true)
          )
        );

      if (availability.length === 0) {
        return [];
      }

      // Get existing appointments for this day
      const startOfDay = new Date(requestedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(requestedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.coachId, coachId),
            gte(appointments.startTime, startOfDay),
            lte(appointments.startTime, endOfDay),
            eq(appointments.status, "scheduled")
          )
        );

      // Get blocked slots for this day
      const blocked = await db
        .select()
        .from(blockedSlots)
        .where(
          and(
            eq(blockedSlots.coachId, coachId),
            lte(blockedSlots.startDate, endOfDay),
            gte(blockedSlots.endDate, startOfDay)
          )
        );

      // Generate available time slots
      const slots: { startTime: string; endTime: string }[] = [];
      const duration = appointmentType.duration;
      const bufferBefore = appointmentType.bufferBefore || 0;
      const bufferAfter = appointmentType.bufferAfter || 0;

      for (const avail of availability) {
        const [startHour, startMin] = avail.startTime.split(":").map(Number);
        const [endHour, endMin] = avail.endTime.split(":").map(Number);

        let currentTime = new Date(requestedDate);
        currentTime.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(requestedDate);
        endTime.setHours(endHour, endMin, 0, 0);

        while (currentTime.getTime() + duration * 60000 <= endTime.getTime()) {
          const slotStart = new Date(currentTime);
          const slotEnd = new Date(currentTime.getTime() + duration * 60000);

          // Check if slot conflicts with existing appointments
          const hasConflict = existingAppointments.some((apt) => {
            const aptStart = new Date(apt.startTime).getTime() - bufferBefore * 60000;
            const aptEnd = new Date(apt.endTime).getTime() + bufferAfter * 60000;
            return slotStart.getTime() < aptEnd && slotEnd.getTime() > aptStart;
          });

          // Check if slot is blocked
          const isBlocked = blocked.some((block) => {
            return slotStart < block.endDate && slotEnd > block.startDate;
          });

          if (!hasConflict && !isBlocked && slotStart > new Date()) {
            slots.push({
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
            });
          }

          currentTime = new Date(currentTime.getTime() + 30 * 60000); // 30-minute intervals
        }
      }

      return slots;
    }),

  // ==================== PACKAGES ====================

  getPackages: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db
      .select({
        package: appointmentPackages,
        appointmentType: appointmentTypes,
      })
      .from(appointmentPackages)
      .leftJoin(appointmentTypes, eq(appointmentPackages.appointmentTypeId, appointmentTypes.id))
      .where(eq(appointmentPackages.isActive, true));
  }),

  createPackage: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        appointmentTypeId: z.number(),
        sessionCount: z.number().min(1),
        price: z.string(),
        bonusSessions: z.number().optional(),
        validDays: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(appointmentPackages).values({
        name: input.name,
        description: input.description,
        appointmentTypeId: input.appointmentTypeId,
        sessionCount: input.sessionCount,
        price: input.price,
        bonusSessions: input.bonusSessions || 0,
        validDays: input.validDays || 365,
      });
      return { id: result[0].insertId };
    }),

  getClientPackages: protectedProcedure
    .input(z.object({ clientEmail: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db
        .select({
          clientPackage: clientPackages,
          package: appointmentPackages,
        })
        .from(clientPackages)
        .leftJoin(appointmentPackages, eq(clientPackages.packageId, appointmentPackages.id))
        .where(
          and(
            eq(clientPackages.clientEmail, input.clientEmail),
            eq(clientPackages.status, "active")
          )
        );
    }),

  // ==================== CLIENT SESSION TRACKING ====================

  // Get current user's session packages
  getMySessionPackages: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!ctx.user?.email) return [];
    
    return db
      .select({
        clientPackage: clientPackages,
        package: appointmentPackages,
      })
      .from(clientPackages)
      .leftJoin(appointmentPackages, eq(clientPackages.packageId, appointmentPackages.id))
      .where(
        and(
          eq(clientPackages.clientEmail, ctx.user.email),
          eq(clientPackages.status, "active")
        )
      );
  }),

  // Get current user's upcoming appointments
  getMyAppointments: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!ctx.user?.email) return [];
    
    const now = new Date();
    return db
      .select({
        appointment: appointments,
        appointmentType: appointmentTypes,
      })
      .from(appointments)
      .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
      .where(
        and(
          eq(appointments.clientEmail, ctx.user.email),
          gte(appointments.startTime, now)
        )
      )
      .orderBy(asc(appointments.startTime))
      .limit(20);
  }),

  // Get current user's past appointments
  getMyPastAppointments: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!ctx.user?.email) return [];
    
    const now = new Date();
    return db
      .select({
        appointment: appointments,
        appointmentType: appointmentTypes,
      })
      .from(appointments)
      .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
      .where(
        and(
          eq(appointments.clientEmail, ctx.user.email),
          lte(appointments.startTime, now)
        )
      )
      .orderBy(desc(appointments.startTime))
      .limit(50);
  }),

  // ==================== DASHBOARD STATS ====================

  getDashboardStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Today's appointments
    const todayAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.startTime, startOfToday),
          lte(appointments.startTime, endOfToday)
        )
      );

    // This week's appointments
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const weekAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.startTime, startOfWeek),
          lte(appointments.startTime, endOfWeek)
        )
      );

    // Pending confirmations
    const pendingConfirmations = await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, "scheduled"));

    return {
      todayCount: todayAppointments.length,
      weekCount: weekAppointments.length,
      pendingConfirmations: pendingConfirmations.length,
      todayAppointments: todayAppointments.filter(
        (a: any) => a.status === "scheduled" || a.status === "confirmed"
      ),
    };
  }),
});
