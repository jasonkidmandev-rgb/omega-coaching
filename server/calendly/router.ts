import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import {
  getCalendlyAppointments,
  getEventTypes,
  invalidateCalendlyCache,
  isCalendlyConfigured,
  createWebhookSubscription,
  listWebhookSubscriptions,
  deleteWebhookSubscription,
} from "./service";

export const calendlyRouter = router({
  /**
   * Check if Calendly integration is configured
   */
  getStatus: adminProcedure.query(async () => {
    return {
      configured: isCalendlyConfigured(),
    };
  }),

  /**
   * Get all event types from Calendly (for admin config)
   */
  getEventTypes: adminProcedure.query(async () => {
    if (!isCalendlyConfigured()) {
      return { eventTypes: [], configured: false };
    }
    try {
      const eventTypes = await getEventTypes();
      return {
        eventTypes: eventTypes.map((et) => ({
          uri: et.uri,
          name: et.name,
          active: et.active,
          duration: et.duration,
          kind: et.kind,
          slug: et.slug,
          color: et.color,
        })),
        configured: true,
      };
    } catch (error: any) {
      console.error("[Calendly] Failed to fetch event types:", error.message);
      return { eventTypes: [], configured: true, error: error.message };
    }
  }),

  /**
   * Get appointments from Calendly (main data endpoint)
   */
  getAppointments: adminProcedure
    .input(
      z.object({
        pastDays: z.number().min(0).max(90).optional().default(14),
        futureDays: z.number().min(0).max(365).optional().default(56),
        includeCanceled: z.boolean().optional().default(false),
        forceRefresh: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ input }) => {
      if (!isCalendlyConfigured()) {
        return { appointments: [], configured: false };
      }

      try {
        const opts = input || {};
        const appointments = await getCalendlyAppointments({
          pastDays: opts.pastDays,
          futureDays: opts.futureDays,
          includeCanceled: opts.includeCanceled,
          forceRefresh: opts.forceRefresh,
        });

        return {
          appointments,
          configured: true,
          cachedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error("[Calendly] Failed to fetch appointments:", error.message);
        return {
          appointments: [],
          configured: true,
          error: error.message,
        };
      }
    }),

  /**
   * Force refresh the Calendly cache
   */
  refreshCache: adminProcedure.mutation(async () => {
    invalidateCalendlyCache();
    try {
      const appointments = await getCalendlyAppointments({ forceRefresh: true });
      return {
        success: true,
        count: appointments.length,
        message: `Refreshed ${appointments.length} appointments from Calendly`,
      };
    } catch (error: any) {
      return {
        success: false,
        count: 0,
        message: `Failed to refresh: ${error.message}`,
      };
    }
  }),

  /**
   * Set up webhook subscription for real-time event notifications
   */
  setupWebhook: adminProcedure
    .input(
      z.object({
        callbackUrl: z.string().url(),
        signingKey: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await createWebhookSubscription(input.callbackUrl, input.signingKey);
        return {
          success: true,
          ...result,
        };
      } catch (error: any) {
        return {
          success: false,
          uri: "",
          callbackUrl: input.callbackUrl,
          events: [],
          error: error.message,
        };
      }
    }),

  /**
   * List existing webhook subscriptions
   */
  listWebhooks: adminProcedure.query(async () => {
    try {
      const webhooks = await listWebhookSubscriptions();
      return { webhooks, success: true };
    } catch (error: any) {
      return { webhooks: [], success: false, error: error.message };
    }
  }),

  /**
   * Delete a webhook subscription
   */
  deleteWebhook: adminProcedure
    .input(z.object({ webhookUri: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await deleteWebhookSubscription(input.webhookUri);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  /**
   * Update excluded event types (stored in service config)
   */
  updateExcludedEventTypes: adminProcedure
    .input(
      z.object({
        excludedNames: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      // Store in admin_settings table
      const { db } = await import("../db");
      const { adminSettings } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Upsert the setting
      const key = "calendly_excluded_event_types";
      const value = JSON.stringify(input.excludedNames);

      const existing = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(adminSettings)
          .set({ settingValue: value })
          .where(eq(adminSettings.settingKey, key));
      } else {
        await db.insert(adminSettings).values({
          settingKey: key,
          settingValue: value,
          settingType: "json",
          category: "calendly",
          description: "Event type names to exclude from Calendly sync",
        });
      }

      // Invalidate cache so next fetch uses new exclusions
      invalidateCalendlyCache();

      return { success: true, excludedNames: input.excludedNames };
    }),

  /**
   * Get appointments for a specific client by email (for Client 360 detail)
   */
  getAppointmentsByEmail: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      if (!isCalendlyConfigured() || !input.email) {
        return { appointments: [] };
      }
      try {
        const allAppointments = await getCalendlyAppointments({ pastDays: 90, futureDays: 90 });
        const clientAppointments = allAppointments.filter(appt =>
          appt.invitees.some(inv => inv.email.toLowerCase() === input.email.toLowerCase())
        );
        return { appointments: clientAppointments };
      } catch (error: any) {
        console.error(`[Calendly] Failed to fetch appointments for ${input.email}:`, error.message);
        return { appointments: [] };
      }
    }),

  /**
   * Get current excluded event types
   */
  getExcludedEventTypes: adminProcedure.query(async () => {
    try {
      const { db } = await import("../db");
      const { adminSettings } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const result = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, "calendly_excluded_event_types"))
        .limit(1);

      if (result.length > 0 && result[0].settingValue) {
        return { excludedNames: JSON.parse(result[0].settingValue) as string[] };
      }
      // Return defaults if not configured
      return { excludedNames: ["Jason - 30 Minutes VTS", "Jason - 60 Minutes VTS"] };
    } catch {
      return { excludedNames: ["Jason - 30 Minutes VTS", "Jason - 60 Minutes VTS"] };
    }
  }),
});
