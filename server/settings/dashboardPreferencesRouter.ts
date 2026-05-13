import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { dashboardPreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Default widget configuration
export const DEFAULT_WIDGETS = [
  { key: "myProtocol", label: "My Protocol", description: "Quick access to your personal protocol", defaultVisible: true },
  { key: "todaysTasks", label: "Today's Tasks", description: "Tasks requiring your attention", defaultVisible: true },
  { key: "protocolHub", label: "Protocol Collaboration Center", description: "Review, approve, and collaborate on protocols", defaultVisible: true },
  { key: "clientOverview", label: "Client Overview", description: "Statistics for all your clients", defaultVisible: true },
  { key: "quickActions", label: "Quick Actions", description: "Create protocols, manage templates, and items", defaultVisible: true },
  { key: "emailOpenRates", label: "Client Email Open Rates", description: "Track how clients engage with emails", defaultVisible: true },
  { key: "emailClickRates", label: "Client Click-Through Rates", description: "Track which links clients click", defaultVisible: true },
  { key: "followUpEmails", label: "Clients Awaiting Follow-Up", description: "Clients who need follow-up emails", defaultVisible: true },
  { key: "unmappedItems", label: "Top Unmapped Protocol Items", description: "Items needing inventory mapping", defaultVisible: true },
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
      widgetVisibility: (prefs.widgetVisibility as Record<string, boolean>) || DEFAULT_VISIBILITY,
      widgetOrder: prefs.widgetOrder || DEFAULT_WIDGET_ORDER,
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

      const currentVisibility = (existing?.widgetVisibility as Record<string, boolean>) || { ...DEFAULT_VISIBILITY };
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
