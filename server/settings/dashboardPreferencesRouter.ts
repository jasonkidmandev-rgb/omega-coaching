import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { dashboardPreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value); } catch { return fallback; }
}

// Default widget configuration
export const DEFAULT_WIDGETS = [
  { key: "myProtocol", label: "My Protocol", description: "Quick access to your personal protocol", defaultVisible: true },
  // Replaces todaysTasks, followUpEmails and unmappedItems, which were three separate
  // cards spread down the page all answering "what do I need to do?". Anyone who had
  // hidden one of those three will see those rows again inside this one — their old
  // preference no longer maps to anything. Agreed trade-off, 2026-08-04.
  { key: "needsAttention", label: "Needs Attention", description: "One queue: drafts, approvals, payments, follow-ups, overdue intake and unmapped items", defaultVisible: true },
  { key: "clientOverview", label: "Key Metrics", description: "Revenue, active clients, approvals awaiting and overdue intake", defaultVisible: true },
  // The two email widgets (opens, clicks) are one condensed card now, so one switch.
  { key: "emailActivity", label: "Client Email Activity", description: "Sends, opens and link clicks over the last 30 days", defaultVisible: true },
  // Was missing from this list while the dashboard checked for it, so the enrollment
  // pipeline and its overdue-deadline alert were permanently on and absent from the
  // Customize panel. isWidgetVisible() defaults an unknown key to true, which hid the bug.
  { key: "enrollmentPipeline", label: "Coaching Enrollment Pipeline", description: "Enrollment funnel, pending intake forms and overdue alerts", defaultVisible: true },
  { key: "recentClients", label: "Recent Client Protocols", description: "Latest client protocols you've created", defaultVisible: true },
];

export const DEFAULT_WIDGET_ORDER = DEFAULT_WIDGETS.map(w => w.key);
export const DEFAULT_VISIBILITY: Record<string, boolean> = Object.fromEntries(DEFAULT_WIDGETS.map(w => [w.key, w.defaultVisible]));

export const dashboardPreferencesRouter = router({
  // Get current user's dashboard preferences
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [prefs] = await db
      .select()
      .from(dashboardPreferences)
      .where(eq(dashboardPreferences.userId, ctx.user.id))
      .limit(1);

    if (!prefs) {
      // Return defaults if no preferences saved
      return {
        widgetVisibility: DEFAULT_VISIBILITY,
        widgetOrder: DEFAULT_WIDGET_ORDER,
        widgets: DEFAULT_WIDGETS,
      };
    }

    return {
      widgetVisibility: parseJson<Record<string, boolean>>(prefs.widgetVisibility, DEFAULT_VISIBILITY),
      widgetOrder: parseJson<string[]>(prefs.widgetOrder, DEFAULT_WIDGET_ORDER),
      widgets: DEFAULT_WIDGETS,
    };
  }),

  // Update widget visibility
  updateVisibility: protectedProcedure
    .input(z.object({
      widgetKey: z.string(),
      visible: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [existing] = await db
        .select()
        .from(dashboardPreferences)
        .where(eq(dashboardPreferences.userId, ctx.user.id))
        .limit(1);

      const currentVisibility = parseJson<Record<string, boolean>>(existing?.widgetVisibility, { ...DEFAULT_VISIBILITY });
      const newVisibility: Record<string, boolean> = { ...currentVisibility, [input.widgetKey]: input.visible };

      if (existing) {
        await db
          .update(dashboardPreferences)
          .set({ 
            widgetVisibility: newVisibility,
            updatedAt: new Date(),
          })
          .where(eq(dashboardPreferences.id, existing.id));
      } else {
        await db.insert(dashboardPreferences).values({
          userId: ctx.user.id,
          widgetVisibility: newVisibility,
          widgetOrder: DEFAULT_WIDGET_ORDER,
        });
      }

      return { success: true, widgetVisibility: newVisibility };
    }),

  // Update widget order
  updateOrder: protectedProcedure
    .input(z.object({
      widgetOrder: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [existing] = await db
        .select()
        .from(dashboardPreferences)
        .where(eq(dashboardPreferences.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        await db
          .update(dashboardPreferences)
          .set({ 
            widgetOrder: input.widgetOrder,
            updatedAt: new Date(),
          })
          .where(eq(dashboardPreferences.id, existing.id));
      } else {
        await db.insert(dashboardPreferences).values({
          userId: ctx.user.id,
          widgetVisibility: DEFAULT_VISIBILITY,
          widgetOrder: input.widgetOrder,
        });
      }

      return { success: true, widgetOrder: input.widgetOrder };
    }),

  // Bulk update preferences
  update: protectedProcedure
    .input(z.object({
      widgetVisibility: z.record(z.string(), z.boolean()).optional(),
      widgetOrder: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [existing] = await db
        .select()
        .from(dashboardPreferences)
        .where(eq(dashboardPreferences.userId, ctx.user.id))
        .limit(1);

      const updates: {
        updatedAt: Date;
        widgetVisibility?: Record<string, boolean>;
        widgetOrder?: string[];
      } = { updatedAt: new Date() };
      
      if (input.widgetVisibility) {
        updates.widgetVisibility = input.widgetVisibility;
      }
      if (input.widgetOrder) {
        updates.widgetOrder = input.widgetOrder;
      }

      if (existing) {
        await db
          .update(dashboardPreferences)
          .set(updates)
          .where(eq(dashboardPreferences.id, existing.id));
      } else {
        await db.insert(dashboardPreferences).values({
          userId: ctx.user.id,
          widgetVisibility: input.widgetVisibility || DEFAULT_VISIBILITY,
          widgetOrder: input.widgetOrder || DEFAULT_WIDGET_ORDER,
        });
      }

      return { success: true };
    }),

  // Reset to defaults
  reset: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db
      .delete(dashboardPreferences)
      .where(eq(dashboardPreferences.userId, ctx.user.id));

    return {
      success: true,
      widgetVisibility: DEFAULT_VISIBILITY,
      widgetOrder: DEFAULT_WIDGET_ORDER,
    };
  }),
});
