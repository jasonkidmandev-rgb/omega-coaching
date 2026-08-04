import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { adminSettings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Default admin settings
const DEFAULT_SETTINGS = {
  payment_reminders_enabled: { value: "true", type: "boolean" as const, description: "Enable automatic payment reminder emails", category: "notifications" },
  reminder_days: { value: "3,7,14", type: "string" as const, description: "Days after which to send payment reminders (comma-separated)", category: "notifications" },
  reminder_email_subject: { value: "Reminder: Your Protocol Payment is Pending", type: "string" as const, description: "Subject line for payment reminder emails", category: "notifications" },
  max_reminders: { value: "3", type: "number" as const, description: "Maximum number of reminder emails to send per protocol", category: "notifications" },
  reminder_send_time: { value: "09:00", type: "string" as const, description: "Time of day to send reminder emails (HH:MM format)", category: "notifications" },
};

export const adminSettingsRouter = router({
  /**
   * Get all admin settings
   */
  getAll: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Database not available", data: [] };
      
      const settings = await db.select().from(adminSettings);
      
      // Merge with defaults for any missing settings
      const settingsMap = new Map(settings.map(s => [s.settingKey, s]));
      const mergedSettings = Object.entries(DEFAULT_SETTINGS).map(([key, defaultValue]) => {
        const existing = settingsMap.get(key);
        if (existing) {
          return existing;
        }
        return {
          id: 0,
          settingKey: key,
          settingValue: defaultValue.value,
          settingType: defaultValue.type,
          description: defaultValue.description,
          category: defaultValue.category,
          updatedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
      
      return {
        success: true,
        data: mergedSettings,
      };
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      return {
        success: false,
        error: "Failed to fetch admin settings",
        data: [],
      };
    }
  }),

  /**
   * Get settings by category
   */
  getByCategory: adminProcedure
    .input(z.object({
      category: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Database not available", data: [] };
        
        const settings = await db
          .select()
          .from(adminSettings)
          .where(eq(adminSettings.category, input.category));
        
        // Merge with defaults for this category
        const settingsMap = new Map(settings.map(s => [s.settingKey, s]));
        const categoryDefaults = Object.entries(DEFAULT_SETTINGS)
          .filter(([_, v]) => v.category === input.category);
        
        const mergedSettings = categoryDefaults.map(([key, defaultValue]) => {
          const existing = settingsMap.get(key);
          if (existing) {
            return existing;
          }
          return {
            id: 0,
            settingKey: key,
            settingValue: defaultValue.value,
            settingType: defaultValue.type,
            description: defaultValue.description,
            category: defaultValue.category,
            updatedBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });
        
        return {
          success: true,
          data: mergedSettings,
        };
      } catch (error) {
        console.error("Error fetching admin settings by category:", error);
        return {
          success: false,
          error: "Failed to fetch admin settings",
          data: [],
        };
      }
    }),

  /**
   * Get a specific setting by key
   */
  get: adminProcedure
    .input(z.object({
      key: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Database not available", data: null };
        
        const [setting] = await db
          .select()
          .from(adminSettings)
          .where(eq(adminSettings.settingKey, input.key))
          .limit(1);
        
        if (setting) {
          return { success: true, data: setting };
        }
        
        // Return default if exists
        const defaultSetting = DEFAULT_SETTINGS[input.key as keyof typeof DEFAULT_SETTINGS];
        if (defaultSetting) {
          return {
            success: true,
            data: {
              id: 0,
              settingKey: input.key,
              settingValue: defaultSetting.value,
              settingType: defaultSetting.type,
              description: defaultSetting.description,
              category: defaultSetting.category,
              updatedBy: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          };
        }
        
        return { success: false, error: "Setting not found", data: null };
      } catch (error) {
        console.error("Error fetching admin setting:", error);
        return {
          success: false,
          error: "Failed to fetch admin setting",
          data: null,
        };
      }
    }),

  /**
   * Update or create a setting
   */
  upsert: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
      type: z.enum(["string", "number", "boolean", "json"]).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Database not available" };
        
        const [existing] = await db
          .select()
          .from(adminSettings)
          .where(eq(adminSettings.settingKey, input.key))
          .limit(1);

        if (existing) {
          await db
            .update(adminSettings)
            .set({
              settingValue: input.value,
              settingType: input.type || existing.settingType,
              description: input.description || existing.description,
              category: input.category || existing.category,
              updatedBy: ctx.user?.id,
            })
            .where(eq(adminSettings.id, existing.id));
        } else {
          const defaultSetting = DEFAULT_SETTINGS[input.key as keyof typeof DEFAULT_SETTINGS];
          await db.insert(adminSettings).values({
            settingKey: input.key,
            settingValue: input.value,
            settingType: input.type || defaultSetting?.type || "string",
            description: input.description || defaultSetting?.description || null,
            category: input.category || defaultSetting?.category || "general",
            updatedBy: ctx.user?.id,
          });
        }

        return {
          success: true,
          message: "Setting saved",
        };
      } catch (error) {
        console.error("Error upserting admin setting:", error);
        return {
          success: false,
          error: "Failed to save setting",
        };
      }
    }),

  /**
   * Bulk update settings
   */
  bulkUpdate: adminProcedure
    .input(z.object({
      settings: z.array(z.object({
        key: z.string(),
        value: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Database not available" };
        
        for (const setting of input.settings) {
          const [existing] = await db
            .select()
            .from(adminSettings)
            .where(eq(adminSettings.settingKey, setting.key))
            .limit(1);

          if (existing) {
            await db
              .update(adminSettings)
              .set({
                settingValue: setting.value,
                updatedBy: ctx.user?.id,
              })
              .where(eq(adminSettings.id, existing.id));
          } else {
            const defaultSetting = DEFAULT_SETTINGS[setting.key as keyof typeof DEFAULT_SETTINGS];
            await db.insert(adminSettings).values({
              settingKey: setting.key,
              settingValue: setting.value,
              settingType: defaultSetting?.type || "string",
              description: defaultSetting?.description || null,
              category: defaultSetting?.category || "general",
              updatedBy: ctx.user?.id,
            });
          }
        }

        return {
          success: true,
          message: `${input.settings.length} settings saved`,
        };
      } catch (error) {
        console.error("Error bulk updating admin settings:", error);
        return {
          success: false,
          error: "Failed to save settings",
        };
      }
    }),
});
