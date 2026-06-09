import { eq, and, desc, isNull, isNotNull, or, inArray, gte, gt, lte, lt, asc, sql, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  clients,
  InsertClient,
  categories,
  protocolItems,
  templates,
  templateItems,
  clientProtocols,
  clientProtocolItems,
  protocolRequirements,
  clientProtocolRequirements,
  notifications,
  programs,
  programPhases,
  affiliateClicks,
  protocolComments,
  coachingPackages,
  hubLinks,
  InsertCategory,
  InsertProtocolItem,
  InsertTemplate,
  InsertTemplateItem,
  InsertClientProtocol,
  InsertClientProtocolItem,
  InsertProtocolRequirement,
  InsertClientProtocolRequirement,
  InsertNotification,
  InsertProgram,
  InsertProgramPhase,
  InsertAffiliateClick,
  InsertProtocolComment,
  InsertCoachingPackage,
  InsertHubLink,
  referrals,
  launchpadItems,
  launchpadItemVideos,
  purchases,
  InsertReferral,
  InsertLaunchpadItem,
  InsertLaunchpadItemVideo,
  InsertPurchase,
  inventoryCategories,
  inventoryItems,
  inventoryTransactions,
  userFavorites,
  protocolInventoryMapping,
  InsertInventoryCategory,
  InsertInventoryItem,
  affiliatePartners,
  InsertAffiliatePartner,
  InsertInventoryTransaction,
  InsertProtocolInventoryMapping,
  InsertUserFavorite,
  storeWaivers,
  ageDisclaimers,
  loginCodes,
  siteSettings,
  InsertStoreWaiver,
  InsertAgeDisclaimer,
  InsertLoginCode,
  InsertSiteSetting,
  cloneHistory,
  InsertCloneHistory,
  coupons,
  couponUsage,
  InsertCoupon,
  InsertCouponUsage,
  emailEvents,
  emailBrandingSettings,
  InsertEmailEvent,
  InsertEmailBrandingSetting,
  protocolOrders,
  InsertProtocolOrder,
  onboardingSettings,
  onboardingCategories,
  onboardingOptions,
  userOnboardingStatus,
  InsertOnboardingSettings,
  InsertOnboardingCategory,
  InsertOnboardingOption,
  InsertUserOnboardingStatus,
  lifecycleStages,
  teamRoles,
  teamMembers,
  workflowTemplates,
  workflowTemplateTasks,
  workflowTemplateSubtasks,
  clientProjects,
  projectTasks,
  projectSubtasks,
  projectNotes,
  projectActivityLog,
  teamNotifications,
  projectTrackingInfo,
  projectAttachments,
  InsertLifecycleStage,
  InsertTeamRole,
  InsertTeamMember,
  InsertWorkflowTemplate,
  InsertWorkflowTemplateTask,
  InsertWorkflowTemplateSubtask,
  InsertClientProject,
  InsertProjectTask,
  InsertProjectSubtask,
  InsertProjectNote,
  InsertProjectActivityLog,
  InsertTeamNotification,
  InsertProjectTrackingInfo,
  InsertProjectAttachment,
  storeOrders,
  storeOrderItems,
  InsertStoreOrder,
  InsertStoreOrderItem,
  // healthieInvoices removed - integration deprecated
  paypalOrders,
  // InsertPaypalOrder removed - migrating to Stripe
  progressPhotos,
  journeyNotes,
  InsertProgressPhoto,
  InsertJourneyNote,
  waiverRenewalHistory,
  InsertWaiverRenewalHistory,
  announcementTemplates,
  announcementHistory,
  InsertAnnouncementTemplate,
  InsertAnnouncementHistory,
  recipientTracking,
  InsertRecipientTracking,
  peptideCategories,
  peptides,
  userFavoritePeptides,
  InsertPeptideCategory,
  InsertPeptide,
  InsertUserFavoritePeptide,
  paymentReminderLogs,
  InsertPaymentReminderLog,
  clientInventory,
  inventoryHistory,
  notesHistory,
  InsertNotesHistory,
  pendingVenmoPayments,
  // InsertPendingVenmoPayment removed - migrating to Stripe
  productDeletionLog,
  productMergeLog,
  InsertProductDeletionLog,
  InsertProductMergeLog,
  savedAddresses,
  InsertSavedAddress,
  passwordResetTokens,
  InsertPasswordResetToken,
  userSessions,
  InsertUserSession,
  checkinSchedules,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import * as relations from "../drizzle/relations";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, {
        schema: {
          ...relations,
          users,
          categories,
          protocolItems,
          templates,
          templateItems,
          clientProtocols,
          clientProtocolItems,
          protocolRequirements,
          clientProtocolRequirements,
          notifications,
          programs,
          programPhases,
          paypalOrders,
        },
        mode: "default",
      });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.createdAt);
}

export async function updateUserProfile(userId: number, updates: { name?: string; phone?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const setObj: Record<string, any> = {};
  if (updates.name !== undefined) setObj.name = updates.name;
  if (updates.phone !== undefined) setObj.phone = updates.phone;
  if (Object.keys(setObj).length > 0) {
    await db.update(users).set(setObj).where(eq(users.id, userId));
  }
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "manager" | "viewer" | "finance") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserNotificationPreference(userId: number, receiveNotifications: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ receiveNotifications }).where(eq(users.id, userId));
}

export async function updateUserNotificationEmail(userId: number, notificationEmail: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ notificationEmail }).where(eq(users.id, userId));
}

export async function getUsersWithNotificationsEnabled() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.receiveNotifications, true));
}

// Get admin emails for notifications (respects receiveNotifications toggle)
export async function getAdminEmails(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const admins = await db.select({ email: users.email, notificationEmail: users.notificationEmail })
    .from(users)
    .where(and(
      eq(users.role, 'admin'),
      isNotNull(users.email),
      eq(users.receiveNotifications, true)
    ));
  return admins.map(a => a.notificationEmail || a.email).filter((e): e is string => !!e);
}

// Get admin emails filtered by per-user email notification preferences (respects receiveNotifications toggle)
export async function getAdminEmailsForNotificationType(notificationType: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const admins = await db.select({
    email: users.email,
    notificationEmail: users.notificationEmail,
    enabledEmailNotificationTypes: users.enabledEmailNotificationTypes,
  })
    .from(users)
    .where(and(
      eq(users.role, 'admin'),
      isNotNull(users.email),
      eq(users.receiveNotifications, true)
    ));
  
  return admins
    .filter(admin => {
      if (!admin.email) return false;
      // If enabledEmailNotificationTypes is null/undefined, all types are enabled (default)
      if (!admin.enabledEmailNotificationTypes) return true;
      try {
        const enabledTypes = JSON.parse(admin.enabledEmailNotificationTypes) as string[];
        return enabledTypes.includes(notificationType);
      } catch {
        return true; // If parsing fails, default to enabled
      }
    })
    .map(a => a.notificationEmail || a.email)
    .filter((e): e is string => !!e);
}

// Check if a specific user has a notification type enabled in their email preferences
export async function isUserEmailNotificationEnabled(userId: number, notificationType: string): Promise<boolean> {
  const enabledTypes = await getUserEnabledEmailNotificationTypes(userId);
  return enabledTypes.includes(notificationType);
}

// ============ NOTIFICATION QUERIES ============
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count || 0;
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// All supported notification types
export const ALL_NOTIFICATION_TYPES = [
  "protocol_approved",
  "protocol_viewed",
  "protocol_updated",
  "protocol_option_selected",
  "payment_received",
  "payment_failed",
  "payment_refunded",
  "profile_completed",
  "packing_slip_created",
  "low_checkin_score",
  "checkin_submitted",
  "new_store_order",
  "waiver_signed",
  "intake_completed",
  "appointment_booked",
  "appointment_cancelled",
  "client_comment",
  "inventory_out_of_stock",
  "venmo_pending",
  "new_user_registered",
  "referral_submitted",
  "consultation_notes_added",
  "consultation_note_reminder",
  "onboarding_automation",
  "fulfillment_alert",
  "other",
] as const;

export type NotificationType = typeof ALL_NOTIFICATION_TYPES[number];

export async function createNotificationsForEnabledUsers(type: NotificationType, title: string, message: string, clientProtocolId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const enabledUsers = await getUsersWithNotificationsEnabled();
  let notificationsSent = 0;
  
  for (const user of enabledUsers) {
    // Check if user has this notification type enabled
    // If enabledNotificationTypes is null/undefined, all types are enabled (default)
    // If it's a JSON array, only those types are enabled
    let isTypeEnabled = true;
    if (user.enabledNotificationTypes) {
      try {
        const enabledTypes = JSON.parse(user.enabledNotificationTypes) as string[];
        isTypeEnabled = enabledTypes.includes(type);
      } catch (e) {
        // If parsing fails, default to enabled
        isTypeEnabled = true;
      }
    }
    
    if (isTypeEnabled) {
      await db.insert(notifications).values({
        userId: user.id,
        type: type as any, // ALL_NOTIFICATION_TYPES has more types than the DB enum
        title,
        message,
        clientProtocolId: clientProtocolId || null,
      });
      notificationsSent++;
    }
  }
  
  return notificationsSent;
}

// Get user's enabled notification types (returns all types if not set)
export async function getUserEnabledNotificationTypes(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [...ALL_NOTIFICATION_TYPES];
  
  const result = await db.select({ enabledNotificationTypes: users.enabledNotificationTypes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (result.length === 0 || !result[0].enabledNotificationTypes) {
    return [...ALL_NOTIFICATION_TYPES]; // All enabled by default
  }
  
  try {
    return JSON.parse(result[0].enabledNotificationTypes) as string[];
  } catch (e) {
    return [...ALL_NOTIFICATION_TYPES];
  }
}

// Update user's enabled notification types
export async function updateUserEnabledNotificationTypes(userId: number, enabledTypes: string[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users)
    .set({ enabledNotificationTypes: JSON.stringify(enabledTypes) })
    .where(eq(users.id, userId));
}

// Email notification types (subset of all notification types that can be sent via email)
export const EMAIL_NOTIFICATION_TYPES = [
  "protocol_approved",
  "protocol_viewed",
  "protocol_updated",
  "payment_received",
  "payment_failed",
  "payment_refunded",
  "low_checkin_score",
  "checkin_submitted",
  "new_store_order",
  "waiver_signed",
  "intake_completed",
  "appointment_booked",
  "appointment_cancelled",
  "client_comment",
  "inventory_out_of_stock",
  "venmo_pending",
  "new_user_registered",
  "referral_submitted",
  "new_message",
] as const;

export type EmailNotificationType = typeof EMAIL_NOTIFICATION_TYPES[number];

// Get user's enabled email notification types (returns all types if not set)
export async function getUserEnabledEmailNotificationTypes(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [...EMAIL_NOTIFICATION_TYPES];
  
  const result = await db.select({ enabledEmailNotificationTypes: users.enabledEmailNotificationTypes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (result.length === 0 || !result[0].enabledEmailNotificationTypes) {
    return [...EMAIL_NOTIFICATION_TYPES]; // All enabled by default
  }
  
  try {
    return JSON.parse(result[0].enabledEmailNotificationTypes) as string[];
  } catch (e) {
    return [...EMAIL_NOTIFICATION_TYPES];
  }
}

// Update user's enabled email notification types
export async function updateUserEnabledEmailNotificationTypes(userId: number, enabledTypes: string[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users)
    .set({ enabledEmailNotificationTypes: JSON.stringify(enabledTypes) })
    .where(eq(users.id, userId));
}

// Critical notification types that can trigger push notifications
export const PUSH_NOTIFICATION_TYPES = [
  "low_checkin_score",
  "payment_received",
  "payment_failed",
  "new_store_order",
  "appointment_booked",
  "appointment_cancelled",
  "inventory_out_of_stock",
  "venmo_pending",
] as const;

export type PushNotificationType = typeof PUSH_NOTIFICATION_TYPES[number];

// Get user's enabled push notification types
export async function getUserEnabledPushNotificationTypes(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [...PUSH_NOTIFICATION_TYPES];
  
  const result = await db.select({ pushEnabledTypes: users.pushEnabledTypes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (result.length === 0 || !result[0].pushEnabledTypes) {
    return [...PUSH_NOTIFICATION_TYPES]; // All enabled by default
  }
  
  try {
    return JSON.parse(result[0].pushEnabledTypes) as string[];
  } catch (e) {
    return [...PUSH_NOTIFICATION_TYPES];
  }
}

// Update user's enabled push notification types
export async function updateUserEnabledPushNotificationTypes(userId: number, enabledTypes: string[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users)
    .set({ pushEnabledTypes: JSON.stringify(enabledTypes) })
    .where(eq(users.id, userId));
}

// Get user's digest settings
export async function getUserDigestSettings(userId: number): Promise<{ frequency: string; sendTime: string; lastSentAt: Date | null }> {
  const db = await getDb();
  if (!db) return { frequency: "none", sendTime: "09:00", lastSentAt: null };
  
  const result = await db.select({
    digestFrequency: users.digestFrequency,
    digestSendTime: users.digestSendTime,
    digestLastSentAt: users.digestLastSentAt,
  })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (result.length === 0) {
    return { frequency: "none", sendTime: "09:00", lastSentAt: null };
  }
  
  return {
    frequency: result[0].digestFrequency || "none",
    sendTime: result[0].digestSendTime || "09:00",
    lastSentAt: result[0].digestLastSentAt,
  };
}

// Update user's digest settings
export async function updateUserDigestSettings(userId: number, frequency: string, sendTime: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users)
    .set({
      digestFrequency: frequency as "none" | "daily" | "weekly",
      digestSendTime: sendTime,
    })
    .where(eq(users.id, userId));
}

// Get user's push subscription
export async function getUserPushSubscription(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({ pushSubscription: users.pushSubscription })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return result.length > 0 ? result[0].pushSubscription : null;
}

// Update user's push subscription
export async function updateUserPushSubscription(userId: number, subscription: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users)
    .set({ pushSubscription: subscription })
    .where(eq(users.id, userId));
}

// Get users who need digest emails
export async function getUsersForDigest(frequency: "daily" | "weekly"): Promise<Array<{ id: number; email: string | null; name: string | null; digestSendTime: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    digestSendTime: users.digestSendTime,
  })
    .from(users)
    .where(
      and(
        eq(users.digestFrequency, frequency),
        eq(users.receiveNotifications, true)
      )
    );
  
  return result;
}

// Update digest last sent timestamp
export async function updateDigestLastSent(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users)
    .set({ digestLastSentAt: new Date() })
    .where(eq(users.id, userId));
}

// Get unread notifications for digest
export async function getUnreadNotificationsForDigest(userId: number, since: Date | null): Promise<Array<{ type: string; title: string; message: string | null; createdAt: Date }>> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select({
    type: notifications.type,
    title: notifications.title,
    message: notifications.message,
    createdAt: notifications.createdAt,
  })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    )
    .orderBy(notifications.createdAt);
  
  // If we have a since date, only get notifications after that
  if (since) {
    query = db.select({
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      createdAt: notifications.createdAt,
    })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          gt(notifications.createdAt, since)
        )
      )
      .orderBy(notifications.createdAt);
  }
  
  return query;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CATEGORY QUERIES ============
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(categories).values(data);
  return result[0].insertId;
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(categories).where(eq(categories.id, id));
}

// ============ PROTOCOL ITEM QUERIES ============
export async function getAllProtocolItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(protocolItems).orderBy(asc(protocolItems.categoryId), asc(protocolItems.sortOrder));
}

export async function getProtocolItemsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(protocolItems).where(eq(protocolItems.categoryId, categoryId)).orderBy(asc(protocolItems.sortOrder));
}

export async function createProtocolItem(data: InsertProtocolItem, allowDuplicate: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check for duplicate names in the same category (case-insensitive)
  if (!allowDuplicate && data.name) {
    const existing = await db.select({ id: protocolItems.id, name: protocolItems.name })
      .from(protocolItems)
      .where(
        and(
          eq(protocolItems.categoryId, data.categoryId),
          sql`LOWER(${protocolItems.name}) = LOWER(${data.name})`
        )
      );
    
    if (existing.length > 0) {
      throw new Error(`A product with the name "${data.name}" already exists in this category. Use allowDuplicate=true to create anyway.`);
    }
  }
  
  // Auto-assign SKU if not provided
  if (!data.sku) {
    const [maxSkuRow] = await db.select({ sku: protocolItems.sku })
      .from(protocolItems)
      .where(sql`${protocolItems.sku} LIKE 'OL-%'`)
      .orderBy(desc(protocolItems.sku))
      .limit(1);
    let nextNum = 1;
    if (maxSkuRow?.sku) {
      const match = maxSkuRow.sku.match(/OL-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    data.sku = `OL-${String(nextNum).padStart(4, '0')}`;
  }

  const result = await db.insert(protocolItems).values(data);
  return result[0].insertId;
}

export async function updateProtocolItem(id: number, data: Partial<InsertProtocolItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(protocolItems).set(data).where(eq(protocolItems.id, id));
}

export async function deleteProtocolItem(
  id: number, 
  force: boolean = false,
  deletedBy?: { id: number; name: string },
  reason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the product data before deletion for audit log
  const productResult = await db.select().from(protocolItems).where(eq(protocolItems.id, id)).limit(1);
  const product = productResult[0];
  if (!product) {
    throw new Error("Product not found");
  }
  
  // Get usage counts
  const clientUsage = await db.select({ count: sql<number>`COUNT(*)` })
    .from(clientProtocolItems)
    .where(eq(clientProtocolItems.protocolItemId, id));
  const clientUsageCount = clientUsage[0]?.count || 0;
  
  const templateUsage = await db.select({ count: sql<number>`COUNT(*)` })
    .from(templateItems)
    .where(eq(templateItems.protocolItemId, id));
  const templateUsageCount = templateUsage[0]?.count || 0;
  
  // Check if this item is used in any client protocols
  if (!force) {
    if (clientUsageCount > 0) {
      throw new Error(`Cannot delete: This item is used in ${clientUsageCount} client protocol(s). Use force=true to delete anyway, or reassign the items first.`);
    }
    
    if (templateUsageCount > 0) {
      throw new Error(`Cannot delete: This item is used in ${templateUsageCount} template(s). Remove from templates first.`);
    }
  }
  
  // Log the deletion for audit trail
  if (deletedBy) {
    await db.insert(productDeletionLog).values({
      originalProductId: id,
      productName: product.name,
      productData: {
        categoryId: product.categoryId,
        name: product.name,
        schedule: product.schedule,
        duration: product.duration,
        price: product.price,
        defaultQty: product.defaultQty,
        purpose: product.purpose,
        notes: product.notes,
        customCategoryName: product.customCategoryName,
        affiliateUrl: product.affiliateUrl,
        affiliateCode: product.affiliateCode,
        loomVideoUrl: product.loomVideoUrl,
        pricingTiers: product.pricingTiers,
        itemType: product.itemType,
        isDiscountable: product.isDiscountable,
        isActive: product.isActive,
        sortOrder: product.sortOrder,
      },
      deletedBy: deletedBy.id,
      deletedByName: deletedBy.name,
      deletionReason: reason,
      affectedClientProtocols: clientUsageCount,
      affectedTemplates: templateUsageCount,
    });
  }
  
  await db.delete(protocolItems).where(eq(protocolItems.id, id));
}

// Merge products - reassign all items from source to target, then delete source
export async function mergeProducts(
  sourceId: number,
  targetId: number,
  mergedBy: { id: number; name: string },
  reason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get source product data
  const sourceResult = await db.select().from(protocolItems).where(eq(protocolItems.id, sourceId)).limit(1);
  const sourceProduct = sourceResult[0];
  if (!sourceProduct) {
    throw new Error("Source product not found");
  }
  
  // Get target product data
  const targetResult = await db.select().from(protocolItems).where(eq(protocolItems.id, targetId)).limit(1);
  const targetProduct = targetResult[0];
  if (!targetProduct) {
    throw new Error("Target product not found");
  }
  
  // Count items to be merged
  const clientItemsResult = await db.select({ count: sql<number>`COUNT(*)` })
    .from(clientProtocolItems)
    .where(eq(clientProtocolItems.protocolItemId, sourceId));
  const clientItemsCount = clientItemsResult[0]?.count || 0;
  
  const templateItemsResult = await db.select({ count: sql<number>`COUNT(*)` })
    .from(templateItems)
    .where(eq(templateItems.protocolItemId, sourceId));
  const templateItemsCount = templateItemsResult[0]?.count || 0;
  
  // Reassign client protocol items from source to target
  await db.update(clientProtocolItems)
    .set({ protocolItemId: targetId })
    .where(eq(clientProtocolItems.protocolItemId, sourceId));
  
  // Reassign template items from source to target
  await db.update(templateItems)
    .set({ protocolItemId: targetId })
    .where(eq(templateItems.protocolItemId, sourceId));
  
  // Log the merge
  await db.insert(productMergeLog).values({
    sourceProductId: sourceId,
    sourceProductName: sourceProduct.name,
    sourceProductData: sourceProduct,
    targetProductId: targetId,
    targetProductName: targetProduct.name,
    clientProtocolItemsMerged: clientItemsCount,
    templateItemsMerged: templateItemsCount,
    mergedBy: mergedBy.id,
    mergedByName: mergedBy.name,
    mergeReason: reason,
  });
  
  // Delete the source product (now safe since all items are reassigned)
  await db.delete(protocolItems).where(eq(protocolItems.id, sourceId));
  
  return {
    success: true,
    clientItemsMerged: clientItemsCount,
    templateItemsMerged: templateItemsCount,
  };
}

// Get product deletion history
export async function getProductDeletionLog(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productDeletionLog).orderBy(desc(productDeletionLog.deletedAt)).limit(limit);
}

// Get product merge history
export async function getProductMergeLog(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productMergeLog).orderBy(desc(productMergeLog.mergedAt)).limit(limit);
}

// Restore a deleted product
export async function restoreDeletedProduct(
  deletionLogId: number,
  restoredBy: { id: number; name: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the deletion log entry
  const logResult = await db.select().from(productDeletionLog).where(eq(productDeletionLog.id, deletionLogId)).limit(1);
  const logEntry = logResult[0];
  if (!logEntry) {
    throw new Error("Deletion log entry not found");
  }
  
  if (logEntry.isRestored) {
    throw new Error("This product has already been restored");
  }
  
  const productData = logEntry.productData as any;
  
  // Create a new product with the original data
  const result = await db.insert(protocolItems).values({
    categoryId: productData.categoryId,
    name: productData.name,
    schedule: productData.schedule,
    duration: productData.duration,
    price: productData.price,
    defaultQty: productData.defaultQty,
    purpose: productData.purpose,
    notes: productData.notes,
    customCategoryName: productData.customCategoryName,
    affiliateUrl: productData.affiliateUrl,
    affiliateCode: productData.affiliateCode,
    loomVideoUrl: productData.loomVideoUrl,
    pricingTiers: productData.pricingTiers,
    itemType: productData.itemType,
    isDiscountable: productData.isDiscountable,
    isActive: productData.isActive,
    sortOrder: productData.sortOrder,
  });
  
  const newProductId = result[0].insertId;
  
  // Mark the deletion log as restored
  await db.update(productDeletionLog)
    .set({
      isRestored: true,
      restoredAt: new Date(),
      restoredBy: restoredBy.id,
      restoredProductId: newProductId,
    })
    .where(eq(productDeletionLog.id, deletionLogId));
  
  return {
    success: true,
    newProductId,
    productName: productData.name,
  };
}

// Find potential duplicate products
export async function findDuplicateProducts() {
  const db = await getDb();
  if (!db) return [];
  
  // Find products with similar names (case-insensitive)
  const allProducts = await db.select().from(protocolItems).orderBy(asc(protocolItems.name));
  
  const duplicates: { name: string; products: typeof allProducts }[] = [];
  const processed = new Set<number>();
  
  for (const product of allProducts) {
    if (processed.has(product.id)) continue;
    
    const normalizedName = product.name.toLowerCase().trim();
    const similar = allProducts.filter(p => 
      p.id !== product.id && 
      !processed.has(p.id) &&
      p.name.toLowerCase().trim() === normalizedName
    );
    
    if (similar.length > 0) {
      duplicates.push({
        name: product.name,
        products: [product, ...similar],
      });
      processed.add(product.id);
      similar.forEach(s => processed.add(s.id));
    }
  }
  
  return duplicates;
}

// Check protocol item usage across client protocols and templates
export async function getProtocolItemUsage(id: number) {
  const db = await getDb();
  if (!db) return { clientProtocolCount: 0, templateCount: 0, clientNames: [] };
  
  // Get count of client protocol items using this product
  const clientUsage = await db.select({ count: sql<number>`COUNT(*)` })
    .from(clientProtocolItems)
    .where(eq(clientProtocolItems.protocolItemId, id));
  
  // Get count of template items using this product
  const templateUsage = await db.select({ count: sql<number>`COUNT(*)` })
    .from(templateItems)
    .where(eq(templateItems.protocolItemId, id));
  
  // Get list of affected client names (up to 10)
  const affectedClients = await db.select({ clientName: clientProtocols.clientName })
    .from(clientProtocolItems)
    .innerJoin(clientProtocols, eq(clientProtocolItems.clientProtocolId, clientProtocols.id))
    .where(eq(clientProtocolItems.protocolItemId, id))
    .groupBy(clientProtocols.clientName)
    .limit(10);
  
  return {
    clientProtocolCount: clientUsage[0]?.count || 0,
    templateCount: templateUsage[0]?.count || 0,
    clientNames: affectedClients.map(c => c.clientName),
  };
}

// ============ TEMPLATE QUERIES ============
export async function getAllTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templates).orderBy(desc(templates.isDefault), asc(templates.name));
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Get the default template (isDefault = true, or first template by name if none marked default)
export async function getDefaultTemplate() {
  const db = await getDb();
  if (!db) return null;
  
  // First try to find a template marked as default
  const defaultResult = await db.select().from(templates).where(eq(templates.isDefault, true)).limit(1);
  if (defaultResult.length > 0) {
    return defaultResult[0];
  }
  
  // Fallback: return the first template by name (Master Template is usually first alphabetically after default sorting)
  const firstResult = await db.select().from(templates).orderBy(asc(templates.name)).limit(1);
  return firstResult.length > 0 ? firstResult[0] : null;
}

export async function createTemplate(data: InsertTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(templates).values(data);
  return result[0].insertId;
}

export async function updateTemplate(id: number, data: Partial<InsertTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(templates).set(data).where(eq(templates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(templateItems).where(eq(templateItems.templateId, id));
  await db.delete(templates).where(eq(templates.id, id));
}

// ============ TEMPLATE ITEM QUERIES ============
export async function getTemplateItems(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templateItems).where(eq(templateItems.templateId, templateId)).orderBy(asc(templateItems.sortOrder));
}

export async function addTemplateItem(data: InsertTemplateItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Prevent duplicate: check if this protocolItemId already exists in this template
  const existing = await db.select({ id: templateItems.id })
    .from(templateItems)
    .where(and(
      eq(templateItems.templateId, data.templateId),
      eq(templateItems.protocolItemId, data.protocolItemId)
    ))
    .limit(1);
  if (existing.length > 0) {
    console.log(`[DuplicatePrevention] Template item protocolItemId=${data.protocolItemId} already exists in template ${data.templateId}, skipping`);
    return existing[0].id;
  }
  const result = await db.insert(templateItems).values(data);
  return result[0].insertId;
}

export async function updateTemplateItem(id: number, data: Partial<InsertTemplateItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(templateItems).set(data).where(eq(templateItems.id, id));
}

export async function removeTemplateItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(templateItems).where(eq(templateItems.id, id));
}

export async function clearAllTemplateItems(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(templateItems).where(eq(templateItems.templateId, templateId));
}

// ============ CLIENT MASTER RECORD QUERIES ============
export async function getAllClients(filter: 'active' | 'archived' | 'all' = 'active') {
  const db = await getDb();
  if (!db) return [];
  
  if (filter === 'active') {
    return db.select().from(clients)
      .where(and(
        isNull(clients.archivedAt),
        isNull(clients.deletedAt)
      ))
      .orderBy(desc(clients.createdAt));
  } else if (filter === 'archived') {
    return db.select().from(clients)
      .where(and(
        isNotNull(clients.archivedAt),
        isNull(clients.deletedAt)
      ))
      .orderBy(desc(clients.createdAt));
  } else {
    return db.select().from(clients)
      .where(isNull(clients.deletedAt))
      .orderBy(desc(clients.createdAt));
  }
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getClientByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clients)
    .where(and(
      eq(clients.email, email),
      isNull(clients.deletedAt)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return result[0].insertId;
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function getClientProtocolsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientProtocols)
    .where(and(
      eq(clientProtocols.clientId, clientId),
      isNull(clientProtocols.deletedAt)
    ))
    .orderBy(desc(clientProtocols.version));
}

export async function getActiveProtocolForClient(clientId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clientProtocols)
    .where(and(
      eq(clientProtocols.clientId, clientId),
      eq(clientProtocols.isActiveVersion, true),
      isNull(clientProtocols.deletedAt)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createNewProtocolVersion(clientId: number, data: Partial<InsertClientProtocol>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the current active protocol to determine next version number
  const currentProtocols = await db.select()
    .from(clientProtocols)
    .where(eq(clientProtocols.clientId, clientId))
    .orderBy(desc(clientProtocols.version))
    .limit(1);
  
  const currentVersion = currentProtocols.length > 0 ? currentProtocols[0].version : 0;
  const previousVersionId = currentProtocols.length > 0 ? currentProtocols[0].id : null;
  
  // Deactivate current active protocol
  await db.update(clientProtocols)
    .set({ 
      isActiveVersion: false,
      completedAt: new Date()
    })
    .where(and(
      eq(clientProtocols.clientId, clientId),
      eq(clientProtocols.isActiveVersion, true)
    ));
  
  // Get client info - try clients table first, then users table, then fall back to existing protocol
  const client = await getClientById(clientId);
  let clientInfo: { name: string; email?: string | null; phone?: string | null; shippingName?: string | null; shippingStreet?: string | null; shippingCity?: string | null; shippingState?: string | null; shippingZip?: string | null; shippingCountry?: string | null; shippingPhone?: string | null };
  
  if (client) {
    clientInfo = client;
  } else {
    // clientId might be a userId - check users table
    const userResult = await db.select().from(users).where(eq(users.id, clientId)).limit(1);
    if (userResult.length > 0) {
      const user = userResult[0];
      clientInfo = { name: user.name, email: user.email, phone: (user as any).phone || null };
      console.log(`[createNewProtocolVersion] Client ${clientId} found in users table, not clients table`);
    } else if (currentProtocols.length > 0) {
      // Last resort: use info from the existing protocol
      const prev = currentProtocols[0];
      clientInfo = {
        name: prev.clientName || 'Unknown',
        email: prev.clientEmail,
        phone: prev.clientPhone,
        shippingName: prev.shippingName,
        shippingStreet: prev.shippingStreet,
        shippingCity: prev.shippingCity,
        shippingState: prev.shippingState,
        shippingZip: prev.shippingZip,
        shippingCountry: prev.shippingCountry,
        shippingPhone: prev.shippingPhone,
      };
      console.log(`[createNewProtocolVersion] Client ${clientId} not found in clients or users, using previous protocol data`);
    } else {
      throw new Error("Client not found");
    }
  }
  
  // Create new protocol version
  const newProtocolData: InsertClientProtocol = {
    clientId: clientId,
    clientName: clientInfo.name,
    clientEmail: clientInfo.email || undefined,
    clientPhone: clientInfo.phone || undefined,
    shippingName: clientInfo.shippingName || undefined,
    shippingStreet: clientInfo.shippingStreet || undefined,
    shippingCity: clientInfo.shippingCity || undefined,
    shippingState: clientInfo.shippingState || undefined,
    shippingZip: clientInfo.shippingZip || undefined,
    shippingCountry: clientInfo.shippingCountry || 'USA',
    shippingPhone: clientInfo.shippingPhone || undefined,
    version: currentVersion + 1,
    versionName: data.versionName || `Protocol v${currentVersion + 1}`,
    isActiveVersion: true,
    previousVersionId: previousVersionId,
    accessToken: crypto.randomUUID().replace(/-/g, '').substring(0, 32),
    status: 'draft',
    ...data
  };
  
  const result = await db.insert(clientProtocols).values(newProtocolData);
  return result[0].insertId;
}

// Create a new protocol version from an existing protocol (works even when clientId is null)
export async function createNewProtocolVersionFromProtocol(currentProtocol: any, data: Partial<InsertClientProtocol>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!currentProtocol) throw new Error("Current protocol is required");
  
  const currentVersion = currentProtocol.version || 1;
  const previousVersionId = currentProtocol.id;
  
  // Deactivate and auto-archive the current protocol
  await db.update(clientProtocols)
    .set({ 
      isActiveVersion: false,
      completedAt: new Date(),
      archivedAt: new Date(), // Auto-archive so old version moves out of active list
    })
    .where(eq(clientProtocols.id, currentProtocol.id));
  
  // Auto-disable check-in schedule for the archived protocol
  await db.update(checkinSchedules)
    .set({ isEnabled: false })
    .where(eq(checkinSchedules.clientProtocolId, currentProtocol.id));
  
  // Also deactivate and auto-archive any other active versions for the same client (by clientId or clientEmail)
  if (currentProtocol.clientId) {
    await db.update(clientProtocols)
      .set({ isActiveVersion: false, archivedAt: new Date() })
      .where(and(
        eq(clientProtocols.clientId, currentProtocol.clientId),
        eq(clientProtocols.isActiveVersion, true)
      ));
  }
  
  // Build new protocol data from the current protocol's fields
  const newProtocolData: InsertClientProtocol = {
    clientId: currentProtocol.clientId || undefined,
    clientName: currentProtocol.clientName,
    clientEmail: currentProtocol.clientEmail || undefined,
    clientPhone: currentProtocol.clientPhone || undefined,
    shippingName: currentProtocol.shippingName || undefined,
    shippingStreet: currentProtocol.shippingStreet || undefined,
    shippingCity: currentProtocol.shippingCity || undefined,
    shippingState: currentProtocol.shippingState || undefined,
    shippingZip: currentProtocol.shippingZip || undefined,
    shippingCountry: currentProtocol.shippingCountry || 'USA',
    shippingPhone: currentProtocol.shippingPhone || undefined,
    templateId: currentProtocol.templateId || undefined,
    version: currentVersion + 1,
    versionName: data.versionName || `Protocol v${currentVersion + 1}`,
    isActiveVersion: true,
    previousVersionId: previousVersionId,
    accessToken: crypto.randomUUID().replace(/-/g, '').substring(0, 32),
    status: 'draft',
    ...data
  };
  
  const result = await db.insert(clientProtocols).values(newProtocolData);
  return result[0].insertId;
}

// ============ CLIENT PROTOCOL QUERIES ============
export async function getAllClientProtocols(filter: 'active' | 'archived' | 'deleted' | 'all' = 'active') {
  const db = await getDb();
  if (!db) return [];
  
  if (filter === 'active') {
    // Active: not archived, not deleted, and only active versions (prevents duplicate display)
    return db.select().from(clientProtocols)
      .where(and(
        sql`${clientProtocols.archivedAt} IS NULL`,
        sql`${clientProtocols.deletedAt} IS NULL`,
        sql`${clientProtocols.isActiveVersion} = 1`
      ))
      .orderBy(desc(clientProtocols.createdAt));
  } else if (filter === 'archived') {
    // Archived: has archivedAt but not deleted
    return db.select().from(clientProtocols)
      .where(and(
        sql`${clientProtocols.archivedAt} IS NOT NULL`,
        sql`${clientProtocols.deletedAt} IS NULL`
      ))
      .orderBy(desc(clientProtocols.createdAt));
  } else if (filter === 'deleted') {
    // Deleted: has deletedAt (within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return db.select().from(clientProtocols)
      .where(and(
        sql`${clientProtocols.deletedAt} IS NOT NULL`,
        sql`${clientProtocols.deletedAt} > ${thirtyDaysAgo}`
      ))
      .orderBy(desc(clientProtocols.deletedAt));
  } else {
    // All: return everything
    return db.select().from(clientProtocols).orderBy(desc(clientProtocols.createdAt));
  }
}

export async function getClientProtocolById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clientProtocols).where(eq(clientProtocols.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getClientProtocolByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clientProtocols).where(eq(clientProtocols.accessToken, token)).limit(1);
  if (result.length === 0) return null;
  
  // Get template's hidePricing setting if templateId exists
  const protocol = result[0];
  if (protocol.templateId) {
    const templateResult = await db.select({ hidePricing: templates.hidePricing }).from(templates).where(eq(templates.id, protocol.templateId)).limit(1);
    if (templateResult.length > 0) {
      return { ...protocol, hidePricing: templateResult[0].hidePricing };
    }
  }
  return { ...protocol, hidePricing: false };
}

export async function getClientProtocolByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  // Get the most recent non-deleted protocol for this email
  // Use LOWER() for case-insensitive comparison since clientEmail column uses utf8mb4_bin collation
  const result = await db.select()
    .from(clientProtocols)
    .where(
      and(
        sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${email})`,
        isNull(clientProtocols.deletedAt)
      )
    )
    .orderBy(desc(clientProtocols.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Get ALL protocols for a client email (for dashboard with visibility filtering)
export async function getClientProtocolsByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  // Get all protocols for this email, ordered by creation date
  // Use LOWER() for case-insensitive comparison since clientEmail column uses utf8mb4_bin collation
  const result = await db.select()
    .from(clientProtocols)
    .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${email})`)
    .orderBy(desc(clientProtocols.createdAt));
  return result;
}

export async function createClientProtocol(data: InsertClientProtocol) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Create or find unified contact if not already linked
  if (!data.contactId && (data.clientEmail || data.clientPhone || data.clientName)) {
    try {
      const { findOrCreateContact } = await import('./contacts/contactService');
      const contact = await findOrCreateContact({
        fullName: data.clientName || undefined,
        email: data.clientEmail || undefined,
        phone: data.clientPhone || undefined,
        lifecycleStage: 'active_client',
      });
      data.contactId = contact.id;
    } catch (e) {
      console.error('[createClientProtocol] Failed to create/find contact:', e);
    }
  }
  
  const result = await db.insert(clientProtocols).values(data);
  return result[0].insertId;
}

export async function updateClientProtocol(id: number, data: Partial<InsertClientProtocol>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // All string fields that a user can legitimately clear should accept empty strings.
  // Only skip undefined/null values - empty strings are valid user input for clearing fields.
  const cleanData: Partial<InsertClientProtocol> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      (cleanData as Record<string, unknown>)[key] = value;
    }
  }
  
  // Only update if there are fields to update
  if (Object.keys(cleanData).length === 0) {
    return;
  }
  
  await db.update(clientProtocols).set(cleanData).where(eq(clientProtocols.id, id));
}

export async function deleteClientProtocol(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clientProtocolItems).where(eq(clientProtocolItems.clientProtocolId, id));
  await db.delete(clientProtocolRequirements).where(eq(clientProtocolRequirements.clientProtocolId, id));
  await db.delete(clientProtocols).where(eq(clientProtocols.id, id));
}

// ============ CLIENT ENGAGEMENT TRACKING ============
export async function trackProtocolView(protocolId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(clientProtocols)
    .set({
      lastViewedAt: new Date(),
      viewCount: sql`${clientProtocols.viewCount} + 1`,
    })
    .where(eq(clientProtocols.id, protocolId));
}

export async function getInactiveClients(daysSinceLastView: number = 14) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastView);
  
  // Get active protocols that haven't been viewed recently
  return db.select()
    .from(clientProtocols)
    .where(
      and(
        eq(clientProtocols.status, 'active'),
        isNull(clientProtocols.deletedAt),
        or(
          isNull(clientProtocols.lastViewedAt),
          lt(clientProtocols.lastViewedAt, cutoffDate)
        )
      )
    )
    .orderBy(asc(clientProtocols.lastViewedAt));
}

export async function getClientEngagementStats() {
  const db = await getDb();
  if (!db) return { totalActive: 0, viewedLast7Days: 0, viewedLast30Days: 0, neverViewed: 0, avgViewCount: 0 };
  
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeProtocols = await db.select()
    .from(clientProtocols)
    .where(
      and(
        eq(clientProtocols.status, 'active'),
        isNull(clientProtocols.deletedAt)
      )
    );
  
  const totalActive = activeProtocols.length;
  const viewedLast7Days = activeProtocols.filter(p => p.lastViewedAt && new Date(p.lastViewedAt) >= sevenDaysAgo).length;
  const viewedLast30Days = activeProtocols.filter(p => p.lastViewedAt && new Date(p.lastViewedAt) >= thirtyDaysAgo).length;
  const neverViewed = activeProtocols.filter(p => !p.lastViewedAt).length;
  const totalViews = activeProtocols.reduce((sum, p) => sum + (p.viewCount || 0), 0);
  const avgViewCount = totalActive > 0 ? totalViews / totalActive : 0;
  
  return { totalActive, viewedLast7Days, viewedLast30Days, neverViewed, avgViewCount };
}

// ============ CLIENT PROTOCOL ITEM QUERIES ============
export async function getClientProtocolItems(clientProtocolId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientProtocolItems).where(eq(clientProtocolItems.clientProtocolId, clientProtocolId)).orderBy(asc(clientProtocolItems.sortOrder));
}

export async function addClientProtocolItem(data: InsertClientProtocolItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Prevent duplicate: check if this protocolItemId already exists for this clientProtocol
  const existing = await db.select({ id: clientProtocolItems.id })
    .from(clientProtocolItems)
    .where(and(
      eq(clientProtocolItems.clientProtocolId, data.clientProtocolId),
      eq(clientProtocolItems.protocolItemId, data.protocolItemId)
    ))
    .limit(1);
  if (existing.length > 0) {
    console.log(`[DuplicatePrevention] Client protocol item protocolItemId=${data.protocolItemId} already exists in clientProtocol=${data.clientProtocolId}, skipping`);
    return existing[0].id;
  }
  const result = await db.insert(clientProtocolItems).values(data);
  return result[0].insertId;
}

export async function updateClientProtocolItem(id: number, data: Partial<InsertClientProtocolItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientProtocolItems).set(data).where(eq(clientProtocolItems.id, id));
}

export async function removeClientProtocolItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clientProtocolItems).where(eq(clientProtocolItems.id, id));
}

export async function bulkAddClientProtocolItems(items: InsertClientProtocolItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;
  // Deduplicate: keep only the first occurrence of each protocolItemId per clientProtocolId
  const seen = new Set<string>();
  const uniqueItems = items.filter(item => {
    const key = `${item.clientProtocolId}-${item.protocolItemId}`;
    if (seen.has(key)) {
      console.log(`[DuplicatePrevention] Skipping duplicate protocolItemId=${item.protocolItemId} for clientProtocol=${item.clientProtocolId}`);
      return false;
    }
    seen.add(key);
    return true;
  });
  if (uniqueItems.length === 0) return;
  await db.insert(clientProtocolItems).values(uniqueItems);
}

// ============ PROTOCOL REQUIREMENTS QUERIES ============
export async function getAllRequirements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(protocolRequirements).orderBy(asc(protocolRequirements.sortOrder));
}

export async function getDefaultRequirements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(protocolRequirements).where(eq(protocolRequirements.isDefault, true)).orderBy(asc(protocolRequirements.sortOrder));
}

export async function createRequirement(data: InsertProtocolRequirement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(protocolRequirements).values(data);
  return result[0].insertId;
}

export async function updateRequirement(id: number, data: Partial<InsertProtocolRequirement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(protocolRequirements).set(data).where(eq(protocolRequirements.id, id));
}

export async function deleteRequirement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(protocolRequirements).where(eq(protocolRequirements.id, id));
}

// ============ CLIENT PROTOCOL REQUIREMENTS QUERIES ============
export async function getClientProtocolRequirements(clientProtocolId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientProtocolRequirements).where(eq(clientProtocolRequirements.clientProtocolId, clientProtocolId)).orderBy(asc(clientProtocolRequirements.sortOrder));
}

export async function addClientProtocolRequirement(data: InsertClientProtocolRequirement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clientProtocolRequirements).values(data);
  return result[0].insertId;
}

export async function bulkAddClientProtocolRequirements(items: InsertClientProtocolRequirement[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;
  await db.insert(clientProtocolRequirements).values(items);
}

export async function updateClientProtocolRequirement(id: number, data: Partial<InsertClientProtocolRequirement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientProtocolRequirements).set(data).where(eq(clientProtocolRequirements.id, id));
}

export async function removeClientProtocolRequirement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clientProtocolRequirements).where(eq(clientProtocolRequirements.id, id));
}

// ============ UTILITY FUNCTIONS ============
export function generateAccessToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Clone a template to create a new client protocol
export async function cloneTemplateToClientProtocol(
  templateId: number,
  clientName: string,
  clientEmail?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const template = await getTemplateById(templateId);
  if (!template) throw new Error("Template not found");

  const templateItemsList = await getTemplateItems(templateId);
  const defaultReqs = await getDefaultRequirements();

  // Create client protocol
  const accessToken = generateAccessToken();
  const protocolId = await createClientProtocol({
    clientName,
    clientEmail: clientEmail || null,
    accessToken,
    templateId,
    durationMonths: template.durationMonths,
    status: "draft",
  });

  // Clone template items to client protocol items
  // Get all master items to inherit fulfillmentSource defaults
  if (templateItemsList.length === 0) {
    console.warn(`[cloneTemplateToClientProtocol] Template ${templateId} has no items — protocol ${protocolId} created with empty item list`);
  }
  const allMasterItems = await getAllProtocolItems();
  const clientItems: InsertClientProtocolItem[] = templateItemsList.map((item, index) => {
    const masterItem = allMasterItems.find((m: any) => m.id === item.protocolItemId);
    if (!masterItem) {
      console.warn(`[cloneTemplateToClientProtocol] Template item protocolItemId=${item.protocolItemId} not found in master items — snapshotName will be null`);
    }
    return {
      clientProtocolId: protocolId,
      protocolItemId: item.protocolItemId,
      quantity: item.quantity,
      isIncluded: true,
      isRecommended: item.isRecommended,
      customNotes: item.customNotes,
      sortOrder: item.sortOrder || index,
      fulfillmentSource: (masterItem as any)?.fulfillmentSource || 'coach',
      snapshotName: masterItem?.name ?? null,
    };
  });

  if (clientItems.length > 0) {
    await bulkAddClientProtocolItems(clientItems);
  }

  // Add default requirements
  const clientReqs: InsertClientProtocolRequirement[] = defaultReqs.map((req, index) => ({
    clientProtocolId: protocolId,
    requirementId: req.id,
    isIncluded: true,
    sortOrder: req.sortOrder || index,
  }));

  if (clientReqs.length > 0) {
    await bulkAddClientProtocolRequirements(clientReqs);
  }

  return protocolId;
}

// Clone an existing client protocol to a new client protocol
export async function cloneClientProtocol(
  sourceProtocolId: number,
  newClientName: string,
  newClientEmail?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sourceProtocol = await getClientProtocolById(sourceProtocolId);
  if (!sourceProtocol) throw new Error("Source protocol not found");

  const sourceItems = await getClientProtocolItems(sourceProtocolId);
  const sourceRequirements = await getClientProtocolRequirements(sourceProtocolId);

  // Create new client protocol
  const accessToken = generateAccessToken();
  const newProtocolId = await createClientProtocol({
    clientName: newClientName,
    clientEmail: newClientEmail || null,
    accessToken,
    templateId: sourceProtocol.templateId,
    durationMonths: sourceProtocol.durationMonths,
    coachingPackage: sourceProtocol.coachingPackage,
    coachingPrice: sourceProtocol.coachingPrice,
    discountPercent: sourceProtocol.discountPercent,
    paymentMethod: sourceProtocol.paymentMethod,
    venmoHandle: sourceProtocol.venmoHandle,
    customRequirements: sourceProtocol.customRequirements,
    programId: sourceProtocol.programId,
    currentPhaseId: sourceProtocol.currentPhaseId,
    status: "draft",
  });

  // Clone protocol items — snapshot the name so it survives master catalog deletions
  const allMasterItemsForSnapshot = await getAllProtocolItems();
  const newItems: InsertClientProtocolItem[] = sourceItems.map((item, index) => {
    const masterItem = allMasterItemsForSnapshot.find((m: any) => m.id === item.protocolItemId);
    return {
      clientProtocolId: newProtocolId,
      protocolItemId: item.protocolItemId,
      quantity: item.quantity,
      isIncluded: item.isIncluded,
      isRecommended: item.isRecommended,
      customSchedule: item.customSchedule,
      customDuration: item.customDuration,
      customPrice: item.customPrice,
      customNotes: item.customNotes,
      sortOrder: item.sortOrder || index,
      fulfillmentSource: (item as any).fulfillmentSource || 'coach',
      snapshotName: (item as any).snapshotName || masterItem?.name || undefined,
    };
  });

  if (newItems.length > 0) {
    await bulkAddClientProtocolItems(newItems);
  }

  // Clone requirements
  const newRequirements: InsertClientProtocolRequirement[] = sourceRequirements.map((req, index) => ({
    clientProtocolId: newProtocolId,
    requirementId: req.requirementId,
    customText: req.customText,
    isIncluded: req.isIncluded,
    sortOrder: req.sortOrder || index,
  }));

  if (newRequirements.length > 0) {
    await bulkAddClientProtocolRequirements(newRequirements);
  }

  return newProtocolId;
}

// Clone an existing client protocol to overwrite another existing client's protocol
export async function cloneToExistingClient(
  sourceProtocolId: number,
  targetProtocolId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sourceProtocol = await getClientProtocolById(sourceProtocolId);
  if (!sourceProtocol) throw new Error("Source protocol not found");

  const targetProtocol = await getClientProtocolById(targetProtocolId);
  if (!targetProtocol) throw new Error("Target protocol not found");

  const sourceItems = await getClientProtocolItems(sourceProtocolId);
  const sourceRequirements = await getClientProtocolRequirements(sourceProtocolId);

  // Delete existing items and requirements from target
  await db.delete(clientProtocolItems).where(eq(clientProtocolItems.clientProtocolId, targetProtocolId));
  await db.delete(clientProtocolRequirements).where(eq(clientProtocolRequirements.clientProtocolId, targetProtocolId));

  // Update target protocol with source settings (keep client name/email)
  await db.update(clientProtocols)
    .set({
      templateId: sourceProtocol.templateId,
      durationMonths: sourceProtocol.durationMonths,
      coachingPackage: sourceProtocol.coachingPackage,
      coachingPrice: sourceProtocol.coachingPrice,
      discountPercent: sourceProtocol.discountPercent,
      paymentMethod: sourceProtocol.paymentMethod,
      venmoHandle: sourceProtocol.venmoHandle,
      customRequirements: sourceProtocol.customRequirements,
      programId: sourceProtocol.programId,
      currentPhaseId: sourceProtocol.currentPhaseId,
      status: "draft",
    })
    .where(eq(clientProtocols.id, targetProtocolId));

  // Clone protocol items to target — snapshot names so they survive catalog deletions
  const allMasterItemsForSnapshot = await getAllProtocolItems();
  const newItems: InsertClientProtocolItem[] = sourceItems.map((item, index) => {
    const masterItem = allMasterItemsForSnapshot.find((m: any) => m.id === item.protocolItemId);
    return {
      clientProtocolId: targetProtocolId,
      protocolItemId: item.protocolItemId,
      quantity: item.quantity,
      isIncluded: item.isIncluded,
      isRecommended: item.isRecommended,
      customSchedule: item.customSchedule,
      customDuration: item.customDuration,
      customPrice: item.customPrice,
      customNotes: item.customNotes,
      sortOrder: item.sortOrder || index,
      snapshotName: (item as any).snapshotName || masterItem?.name || undefined,
    };
  });

  if (newItems.length > 0) {
    await bulkAddClientProtocolItems(newItems);
  }

  // Clone requirements to target
  const newRequirements: InsertClientProtocolRequirement[] = sourceRequirements.map((req, index) => ({
    clientProtocolId: targetProtocolId,
    requirementId: req.requirementId,
    customText: req.customText,
    isIncluded: req.isIncluded,
    sortOrder: req.sortOrder || index,
  }));

  if (newRequirements.length > 0) {
    await bulkAddClientProtocolRequirements(newRequirements);
  }

  return targetProtocolId;
}

// Bulk clone a protocol to multiple new clients
export async function bulkCloneClientProtocol(
  sourceProtocolId: number,
  clients: Array<{ name: string; email?: string }>
): Promise<number[]> {
  const newProtocolIds: number[] = [];
  
  for (const client of clients) {
    const newId = await cloneClientProtocol(sourceProtocolId, client.name, client.email);
    newProtocolIds.push(newId);
  }
  
  return newProtocolIds;
}

// ============ PROTOCOL RENEWAL ============
// Renew an existing client protocol with updated dates
export async function renewClientProtocol(
  sourceProtocolId: number,
  newDurationMonths?: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sourceProtocol = await getClientProtocolById(sourceProtocolId);
  if (!sourceProtocol) throw new Error("Source protocol not found");

  const sourceItems = await getClientProtocolItems(sourceProtocolId);
  const sourceRequirements = await getClientProtocolRequirements(sourceProtocolId);

  // Calculate new dates
  const now = new Date();
  const durationMonths = newDurationMonths || sourceProtocol.durationMonths || 3;
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  // Create new client protocol with same client info but fresh dates
  const accessToken = generateAccessToken();
  const newProtocolId = await createClientProtocol({
    clientName: sourceProtocol.clientName,
    clientEmail: sourceProtocol.clientEmail,
    accessToken,
    templateId: sourceProtocol.templateId,
    durationMonths: durationMonths,
    coachingPackage: sourceProtocol.coachingPackage,
    coachingPrice: sourceProtocol.coachingPrice,
    discountPercent: sourceProtocol.discountPercent,
    paymentMethod: sourceProtocol.paymentMethod,
    venmoHandle: sourceProtocol.venmoHandle,
    customRequirements: sourceProtocol.customRequirements,
    programId: sourceProtocol.programId,
    currentPhaseId: sourceProtocol.currentPhaseId,
    status: "draft",
    startDate: now,
    endDate: endDate,
    renewedFromId: sourceProtocolId,
    tags: sourceProtocol.tags,
    internalNotes: `Renewed from protocol #${sourceProtocolId} on ${now.toLocaleDateString('en-US', { timeZone: 'America/Denver' })}`,
  });

  // Clone protocol items — snapshot names so they survive catalog deletions
  const allMasterItemsForSnapshot = await getAllProtocolItems();
  const newItems: InsertClientProtocolItem[] = sourceItems.map((item, index) => {
    const masterItem = allMasterItemsForSnapshot.find((m: any) => m.id === item.protocolItemId);
    return {
      clientProtocolId: newProtocolId,
      protocolItemId: item.protocolItemId,
      quantity: item.quantity,
      isIncluded: item.isIncluded,
      isRecommended: item.isRecommended,
      customSchedule: item.customSchedule,
      customDuration: item.customDuration,
      customPrice: item.customPrice,
      customNotes: item.customNotes,
      sortOrder: item.sortOrder || index,
      fulfillmentSource: (item as any).fulfillmentSource || 'coach',
      snapshotName: (item as any).snapshotName || masterItem?.name || undefined,
    };
  });

  if (newItems.length > 0) {
    await bulkAddClientProtocolItems(newItems);
  }

  // Clone requirements
  const newRequirements: InsertClientProtocolRequirement[] = sourceRequirements.map((req, index) => ({
    clientProtocolId: newProtocolId,
    requirementId: req.requirementId,
    customText: req.customText,
    isIncluded: req.isIncluded,
    sortOrder: req.sortOrder || index,
  }));

  if (newRequirements.length > 0) {
    await bulkAddClientProtocolRequirements(newRequirements);
  }

  // Mark the source protocol as completed/expired
  await updateClientProtocol(sourceProtocolId, {
    status: "completed",
  });

  return newProtocolId;
}

// ============ CLONE HISTORY ============
export async function recordCloneHistory(data: {
  sourceProtocolId: number | null;
  sourceProtocolName: string;
  targetProtocolId: number;
  targetProtocolName: string;
  cloneType: "new_client" | "existing_client" | "bulk" | "from_template";
  itemsCloned: number;
  clonedBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(cloneHistory).values({
    sourceProtocolId: data.sourceProtocolId,
    sourceProtocolName: data.sourceProtocolName,
    targetProtocolId: data.targetProtocolId,
    targetProtocolName: data.targetProtocolName,
    cloneType: data.cloneType,
    itemsCloned: data.itemsCloned,
    clonedBy: data.clonedBy,
  });
  return result[0].insertId;
}

export async function getCloneHistoryForProtocol(protocolId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get history where this protocol was either the source or target
  const history = await db
    .select()
    .from(cloneHistory)
    .where(
      or(
        eq(cloneHistory.sourceProtocolId, protocolId),
        eq(cloneHistory.targetProtocolId, protocolId)
      )
    )
    .orderBy(desc(cloneHistory.createdAt));
  
  return history;
}

export async function getAllCloneHistory() {
  const db = await getDb();
  if (!db) return [];
  
  const history = await db
    .select()
    .from(cloneHistory)
    .orderBy(desc(cloneHistory.createdAt))
    .limit(100);
  
  return history;
}

// ============ BULK CLIENT PROTOCOL OPERATIONS ============
export async function softDeleteClientProtocols(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  
  const now = new Date();
  for (const id of ids) {
    await db.update(clientProtocols)
      .set({ deletedAt: now })
      .where(eq(clientProtocols.id, id));
    
    // Auto-disable check-in schedule for deleted protocols
    await db.update(checkinSchedules)
      .set({ isEnabled: false })
      .where(eq(checkinSchedules.clientProtocolId, id));
  }
}

export async function archiveClientProtocols(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  
  const now = new Date();
  for (const id of ids) {
    await db.update(clientProtocols)
      .set({ archivedAt: now })
      .where(eq(clientProtocols.id, id));
    
    // Auto-disable check-in schedule for archived protocols
    await db.update(checkinSchedules)
      .set({ isEnabled: false })
      .where(eq(checkinSchedules.clientProtocolId, id));
  }
}

export async function restoreClientProtocols(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  
  for (const id of ids) {
    await db.update(clientProtocols)
      .set({ deletedAt: null, archivedAt: null })
      .where(eq(clientProtocols.id, id));
  }
}

export async function permanentlyDeleteClientProtocols(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  
  for (const id of ids) {
    // Disable check-in schedule before permanent deletion
    await db.update(checkinSchedules)
      .set({ isEnabled: false })
      .where(eq(checkinSchedules.clientProtocolId, id));
    
    await db.delete(clientProtocolItems).where(eq(clientProtocolItems.clientProtocolId, id));
    await db.delete(clientProtocolRequirements).where(eq(clientProtocolRequirements.clientProtocolId, id));
    await db.delete(clientProtocols).where(eq(clientProtocols.id, id));
  }
}

// ============ DISCOUNT ELIGIBILITY HELPERS ============
export async function updateCategoryDiscountable(id: number, isDiscountable: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categories).set({ isDiscountable }).where(eq(categories.id, id));
}

export async function updateProtocolItemDiscountable(id: number, isDiscountable: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(protocolItems).set({ isDiscountable }).where(eq(protocolItems.id, id));
}

// ============ PROGRAMS ============
export async function getAllPrograms() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(programs).orderBy(asc(programs.name));
}

export async function getProgramById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(programs).where(eq(programs.id, id));
  return result[0] || null;
}

export async function createProgram(data: InsertProgram) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(programs).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateProgram(id: number, data: Partial<InsertProgram>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(programs).set(data).where(eq(programs.id, id));
  return getProgramById(id);
}

export async function deleteProgram(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // First delete all phases
  await db.delete(programPhases).where(eq(programPhases.programId, id));
  // Then delete the program
  await db.delete(programs).where(eq(programs.id, id));
}

// ============ PROGRAM PHASES ============
export async function getPhasesByProgramId(programId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(programPhases)
    .where(eq(programPhases.programId, programId))
    .orderBy(asc(programPhases.phaseNumber));
}

export async function getPhaseById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(programPhases).where(eq(programPhases.id, id));
  return result[0] || null;
}

export async function createPhase(data: InsertProgramPhase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(programPhases).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updatePhase(id: number, data: Partial<InsertProgramPhase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(programPhases).set(data).where(eq(programPhases.id, id));
  return getPhaseById(id);
}

export async function deletePhase(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(programPhases).where(eq(programPhases.id, id));
}

// ============ CLIENT PROGRAM ASSIGNMENT ============
export async function assignClientToProgram(clientProtocolId: number, programId: number, phaseId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  await db.update(clientProtocols).set({
    programId,
    currentPhaseId: phaseId,
    phaseStartDate: now,
    programStartDate: now,
  }).where(eq(clientProtocols.id, clientProtocolId));
}

export async function advanceClientPhase(clientProtocolId: number, newPhaseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientProtocols).set({
    currentPhaseId: newPhaseId,
    phaseStartDate: new Date(),
  }).where(eq(clientProtocols.id, clientProtocolId));
}

export async function getClientProgramInfo(clientProtocolId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const client = await db.select().from(clientProtocols).where(eq(clientProtocols.id, clientProtocolId));
  if (!client[0] || !client[0].programId) return null;
  
  const program = await getProgramById(client[0].programId);
  const phases = await getPhasesByProgramId(client[0].programId);
  const currentPhase = client[0].currentPhaseId ? await getPhaseById(client[0].currentPhaseId) : null;
  
  return {
    program,
    phases,
    currentPhase,
    phaseStartDate: client[0].phaseStartDate,
    programStartDate: client[0].programStartDate,
  };
}


// ============ AFFILIATE CLICK TRACKING ============
export async function trackAffiliateClick(data: InsertAffiliateClick) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(affiliateClicks).values(data);
  return result[0].insertId;
}

export async function getAffiliateClicksByItem(protocolItemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(affiliateClicks)
    .where(eq(affiliateClicks.protocolItemId, protocolItemId))
    .orderBy(desc(affiliateClicks.clickedAt));
}

export async function getAffiliateClickStats() {
  const db = await getDb();
  if (!db) return [];
  // Get click counts per item
  const result = await db.select({
    protocolItemId: affiliateClicks.protocolItemId,
    clickCount: sql<number>`COUNT(*)`.as('clickCount'),
  }).from(affiliateClicks)
    .groupBy(affiliateClicks.protocolItemId)
    .orderBy(desc(sql`clickCount`));
  return result;
}

export async function getAffiliateClickStatsWithItems() {
  const db = await getDb();
  if (!db) return [];
  
  const stats = await getAffiliateClickStats();
  const items = await getAllProtocolItems();
  
  return stats.map(stat => {
    const item = items.find(i => i.id === stat.protocolItemId);
    return {
      ...stat,
      itemName: item?.name || 'Unknown',
      itemType: item?.itemType || 'unknown',
      affiliateUrl: item?.affiliateUrl,
    };
  });
}

// ============ PROTOCOL COMMENTS ============
export async function getProtocolComments(clientProtocolId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(protocolComments)
    .where(eq(protocolComments.clientProtocolId, clientProtocolId))
    .orderBy(asc(protocolComments.createdAt));
}

export async function createProtocolComment(data: InsertProtocolComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(protocolComments).values(data);
  return { id: result[0].insertId, ...data, createdAt: new Date() };
}

export async function isEmailUidProcessed(emailUid: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await db.select({ id: protocolComments.id })
    .from(protocolComments)
    .where(eq(protocolComments.emailUid, emailUid))
    .limit(1);
  return existing.length > 0;
}

export async function markCommentsAsRead(clientProtocolId: number, authorType: 'coach' | 'client') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Mark comments from the OTHER party as read
  const otherType = authorType === 'coach' ? 'client' : 'coach';
  await db.update(protocolComments)
    .set({ isRead: true })
    .where(and(
      eq(protocolComments.clientProtocolId, clientProtocolId),
      eq(protocolComments.authorType, otherType)
    ));
}

export async function getUnreadCommentCount(clientProtocolId: number, forAuthorType: 'coach' | 'client') {
  const db = await getDb();
  if (!db) return 0;
  // Count unread comments from the OTHER party
  const otherType = forAuthorType === 'coach' ? 'client' : 'coach';
  const result = await db.select({
    count: sql<number>`COUNT(*)`.as('count'),
  }).from(protocolComments)
    .where(and(
      eq(protocolComments.clientProtocolId, clientProtocolId),
      eq(protocolComments.authorType, otherType),
      eq(protocolComments.isRead, false)
    ));
  return result[0]?.count || 0;
}

// ============ COACHING PACKAGES ============
export async function getAllCoachingPackages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachingPackages)
    .where(eq(coachingPackages.isActive, true))
    .orderBy(asc(coachingPackages.sortOrder));
}

export async function getCoachingPackageById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(coachingPackages).where(eq(coachingPackages.id, id));
  return result[0] || null;
}

export async function createCoachingPackage(data: InsertCoachingPackage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(coachingPackages).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateCoachingPackage(id: number, data: Partial<InsertCoachingPackage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(coachingPackages).set(data).where(eq(coachingPackages.id, id));
  return getCoachingPackageById(id);
}

export async function deleteCoachingPackage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(coachingPackages).where(eq(coachingPackages.id, id));
}

// ============ HUB LINKS ============
export async function getAllHubLinks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hubLinks)
    .where(eq(hubLinks.isActive, true))
    .orderBy(asc(hubLinks.sortOrder));
}

export async function getHubLinksByCategory(category: 'platform' | 'course' | 'coaching' | 'resource') {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hubLinks)
    .where(and(
      eq(hubLinks.isActive, true),
      eq(hubLinks.category, category)
    ))
    .orderBy(asc(hubLinks.sortOrder));
}

export async function createHubLink(data: InsertHubLink) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(hubLinks).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateHubLink(id: number, data: Partial<InsertHubLink>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hubLinks).set(data).where(eq(hubLinks.id, id));
}

export async function deleteHubLink(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(hubLinks).where(eq(hubLinks.id, id));
}


// ============ REFERRALS (REMOVED) ============
// Referral program functions removed - keeping DB tables for historical data

// ============ LAUNCHPAD ITEMS ============
export async function getAllLaunchpadItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(launchpadItems)
    .where(eq(launchpadItems.isActive, true))
    .orderBy(asc(launchpadItems.sortOrder));
}

export async function getLaunchpadItemByKey(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(launchpadItems).where(eq(launchpadItems.key, key));
  return result[0] || null;
}

export async function getLaunchpadItemById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(launchpadItems).where(eq(launchpadItems.id, id));
  return result[0] || null;
}

export async function createLaunchpadItem(data: InsertLaunchpadItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(launchpadItems).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateLaunchpadItem(id: number, data: Partial<InsertLaunchpadItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(launchpadItems).set(data).where(eq(launchpadItems.id, id));
  return getLaunchpadItemById(id);
}

export async function deleteLaunchpadItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(launchpadItems).set({ isActive: false }).where(eq(launchpadItems.id, id));
}

// ============ LAUNCHPAD ITEM VIDEOS ============
export async function getLaunchpadItemVideos(launchpadItemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(launchpadItemVideos)
    .where(eq(launchpadItemVideos.launchpadItemId, launchpadItemId))
    .orderBy(asc(launchpadItemVideos.sortOrder));
}

export async function createLaunchpadItemVideo(data: InsertLaunchpadItemVideo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(launchpadItemVideos).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateLaunchpadItemVideo(id: number, data: Partial<InsertLaunchpadItemVideo>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(launchpadItemVideos).set(data).where(eq(launchpadItemVideos.id, id));
}

export async function deleteLaunchpadItemVideo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(launchpadItemVideos).where(eq(launchpadItemVideos.id, id));
}

// ============ PURCHASES ============
export async function createPurchase(data: InsertPurchase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(purchases).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getPurchasesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchases)
    .where(eq(purchases.userId, userId))
    .orderBy(desc(purchases.createdAt));
}

export async function getPurchaseBySessionId(sessionId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(purchases).where(eq(purchases.stripeSessionId, sessionId));
  return result[0] || null;
}

export async function updatePurchaseStatus(id: number, status: 'pending' | 'completed' | 'failed' | 'refunded', paymentIntentId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (status === 'completed') {
    updateData.completedAt = new Date();
  }
  if (paymentIntentId) {
    updateData.stripePaymentIntentId = paymentIntentId;
  }
  await db.update(purchases).set(updateData).where(eq(purchases.id, id));
}


// ============ INVENTORY CATEGORIES ============
export async function getAllInventoryCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryCategories).orderBy(asc(inventoryCategories.sortOrder));
}

export async function getInventoryCategoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(inventoryCategories).where(eq(inventoryCategories.id, id));
  return result[0] || null;
}

export async function createInventoryCategory(data: InsertInventoryCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inventoryCategories).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateInventoryCategory(id: number, data: Partial<InsertInventoryCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inventoryCategories).set(data).where(eq(inventoryCategories.id, id));
  return getInventoryCategoryById(id);
}

export async function deleteInventoryCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(inventoryCategories).where(eq(inventoryCategories.id, id));
}

// ============ INVENTORY ITEMS ============
export async function getAllInventoryItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryItems)
    .where(eq(inventoryItems.isActive, true))
    .orderBy(asc(inventoryItems.sortOrder));
}

export async function getInventoryItemsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryItems)
    .where(and(eq(inventoryItems.categoryId, categoryId), eq(inventoryItems.isActive, true)))
    .orderBy(asc(inventoryItems.sortOrder));
}

export async function getInventoryItemById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
  return result[0] || null;
}

export async function createInventoryItem(data: InsertInventoryItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inventoryItems).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateInventoryItem(id: number, data: Partial<InsertInventoryItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id));
  return getInventoryItemById(id);
}

export async function deleteInventoryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inventoryItems).set({ isActive: false }).where(eq(inventoryItems.id, id));
}

export async function getLowStockItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryItems)
    .where(and(
      eq(inventoryItems.isActive, true),
      sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockThreshold}`
    ))
    .orderBy(asc(inventoryItems.quantity));
}

// ============ INVENTORY TRANSACTIONS ============
export async function recordInventoryTransaction(data: InsertInventoryTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inventoryTransactions).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getInventoryTransactions(inventoryItemId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryTransactions)
    .where(eq(inventoryTransactions.inventoryItemId, inventoryItemId))
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(limit);
}

export async function adjustInventory(
  inventoryItemId: number, 
  quantityChange: number, 
  type: 'sale' | 'restock' | 'adjustment' | 'return',
  notes?: string,
  createdBy?: number,
  clientProtocolId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current item
  const item = await getInventoryItemById(inventoryItemId);
  if (!item) throw new Error("Inventory item not found");
  
  const previousQuantity = item.quantity;
  const newQuantity = previousQuantity + quantityChange;
  
  // Update item quantity
  await db.update(inventoryItems).set({ quantity: newQuantity }).where(eq(inventoryItems.id, inventoryItemId));
  
  // Record transaction
  await recordInventoryTransaction({
    inventoryItemId,
    type,
    quantityChange,
    previousQuantity,
    newQuantity,
    notes,
    createdBy,
    clientProtocolId,
  });
  
  return { previousQuantity, newQuantity };
}

export async function sellInventoryItem(
  inventoryItemId: number, 
  quantity: number, 
  notes?: string,
  createdBy?: number,
  clientProtocolId?: number
) {
  return adjustInventory(inventoryItemId, -quantity, 'sale', notes, createdBy, clientProtocolId);
}

export async function restockInventoryItem(
  inventoryItemId: number, 
  quantity: number, 
  notes?: string,
  createdBy?: number
) {
  return adjustInventory(inventoryItemId, quantity, 'restock', notes, createdBy);
}

export async function getInventoryWithCategories() {
  const db = await getDb();
  if (!db) return [];
  
  const cats = await getAllInventoryCategories();
  const items = await getAllInventoryItems();
  
  return cats.map(cat => ({
    ...cat,
    items: items.filter(item => item.categoryId === cat.id),
  }));
}


// ============ INVENTORY WITH PROTOCOL PRICES ============
// Returns inventory items enriched with protocol prices via the mapping table.
// Protocol prices are the source of truth; inventory prices are fallback.
export async function getInventoryWithProtocolPrices() {
  const db = await getDb();
  if (!db) return [];
  
  const cats = await getAllInventoryCategories();
  const items = await getAllInventoryItems();
  const mappings = await getAllProtocolInventoryMappings();
  const protocolItemsList = await getAllProtocolItems();
  
  // Build a map: inventoryItemId -> protocol item (with price & isDiscountable)
  const inventoryToProtocol = new Map<number, { protocolPrice: string; protocolName: string; protocolIsDiscountable: boolean }>();
  for (const mapping of mappings) {
    const protocolItem = protocolItemsList.find(p => p.id === mapping.protocolItemId);
    if (protocolItem && protocolItem.price) {
      inventoryToProtocol.set(mapping.inventoryItemId, {
        protocolPrice: protocolItem.price.toString(),
        protocolName: protocolItem.name,
        protocolIsDiscountable: protocolItem.isDiscountable,
      });
    }
  }
  
  return cats.map(cat => ({
    ...cat,
    items: items
      .filter(item => item.categoryId === cat.id)
      .map(item => {
        const protocolInfo = inventoryToProtocol.get(item.id);
        return {
          ...item,
          // Use protocol price if mapping exists, otherwise keep inventory price
          price: protocolInfo?.protocolPrice ?? item.price?.toString() ?? "0",
          // Track the original inventory price for reference
          inventoryPrice: item.price?.toString() ?? "0",
          // Flag whether this price came from protocol mapping
          priceSource: protocolInfo ? "protocol" as const : "inventory" as const,
          protocolName: protocolInfo?.protocolName ?? null,
          // Use protocol's isDiscountable if mapped, otherwise use inventory's
          isDiscountable: protocolInfo ? protocolInfo.protocolIsDiscountable : item.isDiscountable,
        };
      }),
  }));
}

// ============ USER FAVORITES QUERIES ============
export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userFavorites).where(eq(userFavorites.userId, userId));
}

export async function addUserFavorite(userId: number, inventoryItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already favorited
  const existing = await db.select()
    .from(userFavorites)
    .where(and(
      eq(userFavorites.userId, userId),
      eq(userFavorites.inventoryItemId, inventoryItemId)
    ));
  
  if (existing.length > 0) {
    return { id: existing[0].id, alreadyExists: true };
  }
  
  const result = await db.insert(userFavorites).values({ userId, inventoryItemId });
  return { id: result[0].insertId, alreadyExists: false };
}

export async function removeUserFavorite(userId: number, inventoryItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(userFavorites).where(
    and(
      eq(userFavorites.userId, userId),
      eq(userFavorites.inventoryItemId, inventoryItemId)
    )
  );
  return { success: true };
}

export async function getUserFavoriteItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const favorites = await db.select()
    .from(userFavorites)
    .where(eq(userFavorites.userId, userId));
  
  if (favorites.length === 0) return [];
  
  const favoriteItemIds = favorites.map(f => f.inventoryItemId);
  const items = await db.select()
    .from(inventoryItems)
    .where(inArray(inventoryItems.id, favoriteItemIds));
  
  return items;
}


// ============ PROTOCOL INVENTORY MAPPING ============
export async function getAllProtocolInventoryMappings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(protocolInventoryMapping)
    .where(eq(protocolInventoryMapping.isActive, true));
}

export async function getProtocolInventoryMappingsByProtocolItem(protocolItemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(protocolInventoryMapping)
    .where(and(
      eq(protocolInventoryMapping.protocolItemId, protocolItemId),
      eq(protocolInventoryMapping.isActive, true)
    ));
}

export async function getProtocolInventoryMappingsByInventoryItem(inventoryItemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(protocolInventoryMapping)
    .where(and(
      eq(protocolInventoryMapping.inventoryItemId, inventoryItemId),
      eq(protocolInventoryMapping.isActive, true)
    ));
}

export async function createProtocolInventoryMapping(data: InsertProtocolInventoryMapping) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if mapping already exists
  const existing = await db.select()
    .from(protocolInventoryMapping)
    .where(and(
      eq(protocolInventoryMapping.protocolItemId, data.protocolItemId),
      eq(protocolInventoryMapping.inventoryItemId, data.inventoryItemId)
    ));
  
  if (existing.length > 0) {
    // Update existing mapping
    await db.update(protocolInventoryMapping)
      .set({ isActive: true, quantityPerUnit: data.quantityPerUnit || 1 })
      .where(eq(protocolInventoryMapping.id, existing[0].id));
    return { id: existing[0].id, updated: true };
  }
  
  const result = await db.insert(protocolInventoryMapping).values(data);
  return { id: result[0].insertId, updated: false };
}

export async function updateProtocolInventoryMapping(id: number, data: Partial<InsertProtocolInventoryMapping>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(protocolInventoryMapping).set(data).where(eq(protocolInventoryMapping.id, id));
}

export async function deleteProtocolInventoryMapping(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(protocolInventoryMapping)
    .set({ isActive: false })
    .where(eq(protocolInventoryMapping.id, id));
}

export async function getMappingsWithDetails() {
  const db = await getDb();
  if (!db) return [];
  
  const mappings = await getAllProtocolInventoryMappings();
  const protocolItemsList = await getAllProtocolItems();
  const inventoryItemsList = await getAllInventoryItems();
  
  return mappings.map(m => ({
    ...m,
    protocolItem: protocolItemsList.find(p => p.id === m.protocolItemId),
    inventoryItem: inventoryItemsList.find(i => i.id === m.inventoryItemId),
  }));
}

// Deduct inventory when protocol is approved
export async function deductInventoryForProtocol(clientProtocolId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // GUARD: Check if inventory was already deducted for this protocol (prevents double deduction)
  const [protocol] = await db.select({ inventoryDeductedAt: clientProtocols.inventoryDeductedAt })
    .from(clientProtocols)
    .where(eq(clientProtocols.id, clientProtocolId))
    .limit(1);
  
  if (protocol?.inventoryDeductedAt) {
    console.log(`[Inventory] Skipping deduction for protocol ${clientProtocolId} - already deducted at ${protocol.inventoryDeductedAt}`);
    return [{ itemName: 'SKIPPED', quantity: 0, success: true, error: 'Inventory already deducted for this protocol' }];
  }
  
  // Get all INCLUDED items in the client protocol (only deduct for items that are actually part of the order)
  const protocolItemsList = await db.select()
    .from(clientProtocolItems)
    .where(and(
      eq(clientProtocolItems.clientProtocolId, clientProtocolId),
      eq(clientProtocolItems.isIncluded, true)
    ));
  
  console.log(`[Inventory] Processing ${protocolItemsList.length} included items for protocol ${clientProtocolId}`);
  
  const deductions: { itemName: string; quantity: number; success: boolean; error?: string }[] = [];
  
  for (const protocolItem of protocolItemsList) {
    // Find mappings for this protocol item
    const mappings = await getProtocolInventoryMappingsByProtocolItem(protocolItem.protocolItemId);
    console.log(`[Inventory] Protocol item ${protocolItem.protocolItemId} (qty: ${protocolItem.quantity}) has ${mappings.length} inventory mappings`);
    
    for (const mapping of mappings) {
      const quantityToDeduct = (protocolItem.quantity || 1) * (mapping.quantityPerUnit || 1);
      
      // Get current inventory item
      const inventoryItem = await getInventoryItemById(mapping.inventoryItemId);
      if (!inventoryItem) {
        deductions.push({
          itemName: `Unknown (ID: ${mapping.inventoryItemId})`,
          quantity: quantityToDeduct,
          success: false,
          error: 'Inventory item not found',
        });
        continue;
      }
      
      // Always deduct inventory, even if stock goes negative.
      // Negative stock serves as a safety net to track what's owed/backordered.
      // The Store will show "Out of Stock" for items at 0 or below.
      const willGoNegative = inventoryItem.quantity < quantityToDeduct;
      
      // Deduct from inventory (allows negative quantities)
      try {
        await sellInventoryItem(
          mapping.inventoryItemId,
          quantityToDeduct,
          `Protocol #${clientProtocolId} approved`,
          userId,
          clientProtocolId
        );
        deductions.push({
          itemName: inventoryItem.name,
          quantity: quantityToDeduct,
          success: true,
          ...(willGoNegative ? { error: `Stock went negative (was ${inventoryItem.quantity}, now ${inventoryItem.quantity - quantityToDeduct})` } : {}),
        });
      } catch (error) {
        deductions.push({
          itemName: inventoryItem.name,
          quantity: quantityToDeduct,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
  
  // Always mark the protocol as having had inventory deducted (prevents future double deduction)
  // Even if some items had no mappings or errors, we mark it to avoid re-processing
  await db.update(clientProtocols)
    .set({ inventoryDeductedAt: new Date() })
    .where(eq(clientProtocols.id, clientProtocolId));
  const successfulDeductions = deductions.filter(d => d.success);
  console.log(`[Inventory] Marked protocol ${clientProtocolId} as inventory-deducted (${successfulDeductions.length} successful, ${deductions.length - successfulDeductions.length} failed/skipped)`);
  
  // Auto-trigger restock alert check (non-blocking)
  checkAndSendRestockAlerts(`Protocol #${clientProtocolId}`).catch(err => 
    console.error('[Inventory] Restock alert check failed:', err)
  );
  
  return deductions;
}

// Preview inventory deductions for a protocol (without actually deducting)
export async function previewInventoryDeductions(clientProtocolId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all INCLUDED items in the client protocol
  const protocolItemsList = await db.select()
    .from(clientProtocolItems)
    .where(and(
      eq(clientProtocolItems.clientProtocolId, clientProtocolId),
      eq(clientProtocolItems.isIncluded, true)
    ));
  
  const preview: {
    protocolItemName: string;
    inventoryItemName: string;
    inventoryItemId: number;
    currentStock: number;
    quantityToDeduct: number;
    newStock: number;
    hasEnoughStock: boolean;
    lowStockWarning: boolean;
  }[] = [];
  
  // Track unmapped items so the admin can see which items won't be deducted
  const unmappedItems: {
    protocolItemName: string;
    protocolItemId: number;
    quantity: number;
  }[] = [];
  
  for (const protocolItem of protocolItemsList) {
    // Get the protocol item name from the master protocol_items table
    const [masterItem] = await db.select()
      .from(protocolItems)
      .where(eq(protocolItems.id, protocolItem.protocolItemId))
      .limit(1);
    
    const protocolItemName = masterItem?.name || `Item #${protocolItem.protocolItemId}`;
    
    // Find mappings for this protocol item
    const mappings = await getProtocolInventoryMappingsByProtocolItem(protocolItem.protocolItemId);
    
    if (mappings.length === 0) {
      // No inventory mapping - track as unmapped so admin sees the warning
      unmappedItems.push({
        protocolItemName,
        protocolItemId: protocolItem.protocolItemId,
        quantity: protocolItem.quantity || 1,
      });
      continue;
    }
    
    for (const mapping of mappings) {
      const quantityToDeduct = (protocolItem.quantity || 1) * (mapping.quantityPerUnit || 1);
      
      // Get current inventory item
      const inventoryItem = await getInventoryItemById(mapping.inventoryItemId);
      if (!inventoryItem) {
        preview.push({
          protocolItemName,
          inventoryItemName: `Unknown (ID: ${mapping.inventoryItemId})`,
          inventoryItemId: mapping.inventoryItemId,
          currentStock: 0,
          quantityToDeduct,
          newStock: 0,
          hasEnoughStock: false,
          lowStockWarning: true,
        });
        continue;
      }
      
      const newStock = inventoryItem.quantity - quantityToDeduct;
      const lowStockThreshold = inventoryItem.lowStockThreshold || 5;
      
      preview.push({
        protocolItemName,
        inventoryItemName: inventoryItem.name,
        inventoryItemId: inventoryItem.id,
        currentStock: inventoryItem.quantity,
        quantityToDeduct,
        newStock,
        hasEnoughStock: inventoryItem.quantity >= quantityToDeduct,
        lowStockWarning: newStock <= lowStockThreshold,
      });
    }
  }
  
  return {
    items: preview,
    unmappedItems,
    totalItemsToDeduct: preview.length,
    totalUnmappedItems: unmappedItems.length,
    hasInsufficientStock: preview.some(p => !p.hasEnoughStock),
    hasLowStockWarnings: preview.some(p => p.lowStockWarning),
    hasUnmappedItems: unmappedItems.length > 0,
  };
}


// Sales Report Functions
export async function getSalesReport(params: {
  startDate?: string;
  endDate?: string;
  period?: '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';
  paidOnly?: boolean; // Only include sales from PAID protocols
}) {
  const db = await getDb();
  if (!db) return { items: [], summary: { totalSales: 0, totalRevenue: 0, totalItems: 0 }, categoryBreakdown: [] };
  
  // Calculate date range based on period
  let startDate: Date;
  let endDate = new Date();
  
  if (params.period === 'custom' && params.startDate && params.endDate) {
    startDate = new Date(params.startDate);
    endDate = new Date(params.endDate);
    // If endDate has no time component (just a date like "2026-02-09"), set to end of day UTC
    if (params.endDate.length <= 10) {
      endDate.setUTCHours(23, 59, 59, 999);
    }
  } else if (params.period === 'all') {
    startDate = new Date('2020-01-01');
  } else {
    const days = params.period === '7d' ? 7 : params.period === '30d' ? 30 : params.period === '90d' ? 90 : params.period === '365d' ? 365 : 30;
    startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
  }
  
  // Get all sale transactions within the date range
  // Note: createdAt is mode:'string' in schema, so pass string values for comparison
  const startDateStr = startDate.toISOString().slice(0, 19).replace('T', ' ');
  const endDateStr = endDate.toISOString().slice(0, 19).replace('T', ' ');
  let transactions = await db.select()
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.type, 'sale'),
        gte(inventoryTransactions.createdAt, startDateStr),
        lte(inventoryTransactions.createdAt, endDateStr)
      )
    )
    .orderBy(desc(inventoryTransactions.createdAt));
  
  // Filter to only include transactions from PAID protocols (default behavior)
  // Get all paid protocol IDs
  const paidProtocols = await db.select({ id: clientProtocols.id })
    .from(clientProtocols)
    .where(eq(clientProtocols.paymentStatus, 'paid'));
  const paidProtocolIds = new Set(paidProtocols.map(p => p.id));
  
  // Also get paid store orders
  const paidStoreOrders = await db.select({ id: storeOrders.id })
    .from(storeOrders)
    .where(eq(storeOrders.status, 'paid'));
  const paidStoreOrderIds = new Set(paidStoreOrders.map(o => o.id));
  
  // Filter transactions to only include those from paid protocols or store orders
  // Transactions with no clientProtocolId are from store orders (check notes for store order reference)
  transactions = transactions.filter(tx => {
    // If linked to a protocol, check if it's paid
    if (tx.clientProtocolId) {
      return paidProtocolIds.has(tx.clientProtocolId);
    }
    // If notes contain "Store order #", check if that order is paid
    if (tx.notes && tx.notes.includes('Store order #')) {
      const match = tx.notes.match(/Store order #(\d+)/);
      if (match) {
        return paidStoreOrderIds.has(parseInt(match[1]));
      }
    }
    // For other transactions (manual adjustments, etc.), include them
    return false;
  });
  
  // Get all inventory items with their categories
  const items = await db.select()
    .from(inventoryItems)
    .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id));
  
  // Create a map of item ID to item details
  const itemMap = new Map(items.map(i => [i.inventory_items.id, {
    ...i.inventory_items,
    categoryName: i.inventory_categories?.name || 'Uncategorized'
  }]));
  
  // Aggregate sales by item
  const salesByItem = new Map<number, {
    itemId: number;
    itemName: string;
    categoryName: string;
    totalQuantity: number;
    totalRevenue: number;
    transactionCount: number;
    lastSaleDate: Date | null;
  }>();
  
  for (const tx of transactions) {
    const item = itemMap.get(tx.inventoryItemId);
    if (!item) continue;
    
    const existing = salesByItem.get(tx.inventoryItemId) || {
      itemId: tx.inventoryItemId,
      itemName: item.name,
      categoryName: item.categoryName,
      totalQuantity: 0,
      totalRevenue: 0,
      transactionCount: 0,
      lastSaleDate: null,
    };
    
    existing.totalQuantity += Math.abs(tx.quantityChange);
    existing.totalRevenue += Math.abs(tx.quantityChange) * (Number(item.price) || 0);
    existing.transactionCount += 1;
    const txDate = typeof tx.createdAt === 'string' ? new Date(tx.createdAt) : tx.createdAt;
    if (!existing.lastSaleDate || txDate > existing.lastSaleDate) {
      existing.lastSaleDate = txDate;
    }
    
    salesByItem.set(tx.inventoryItemId, existing);
  }
  
  // Convert to array and sort by quantity sold
  const salesArray = Array.from(salesByItem.values());
  const topSellers = [...salesArray].sort((a, b) => b.totalQuantity - a.totalQuantity);
  const slowMovers = [...salesArray].sort((a, b) => a.totalQuantity - b.totalQuantity);
  
  // Calculate category breakdown
  const categoryBreakdown = new Map<string, { category: string; totalQuantity: number; totalRevenue: number; itemCount: number }>();
  for (const sale of salesArray) {
    const existing = categoryBreakdown.get(sale.categoryName) || {
      category: sale.categoryName,
      totalQuantity: 0,
      totalRevenue: 0,
      itemCount: 0,
    };
    existing.totalQuantity += sale.totalQuantity;
    existing.totalRevenue += sale.totalRevenue;
    existing.itemCount += 1;
    categoryBreakdown.set(sale.categoryName, existing);
  }
  
  // Calculate summary
  const summary = {
    totalSales: transactions.length,
    totalRevenue: salesArray.reduce((sum, s) => sum + s.totalRevenue, 0),
    totalItems: salesArray.reduce((sum, s) => sum + s.totalQuantity, 0),
    uniqueProducts: salesArray.length,
    averageOrderValue: transactions.length > 0 
      ? salesArray.reduce((sum, s) => sum + s.totalRevenue, 0) / transactions.length 
      : 0,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    }
  };
  
  // Get daily sales trend
  const dailySales = new Map<string, { date: string; quantity: number; revenue: number }>();
  for (const tx of transactions) {
    const txCreatedAt = typeof tx.createdAt === 'string' ? new Date(tx.createdAt) : tx.createdAt;
    const dateKey = txCreatedAt.toISOString().split('T')[0];
    const item = itemMap.get(tx.inventoryItemId);
    const existing = dailySales.get(dateKey) || { date: dateKey, quantity: 0, revenue: 0 };
    existing.quantity += Math.abs(tx.quantityChange);
    existing.revenue += Math.abs(tx.quantityChange) * (Number(item?.price) || 0);
    dailySales.set(dateKey, existing);
  }
  
  // Get items with no sales (for slow movers section)
  const itemsWithNoSales = Array.from(itemMap.values())
    .filter(item => !salesByItem.has(item.id))
    .map(item => ({
      itemId: item.id,
      itemName: item.name,
      categoryName: item.categoryName,
      totalQuantity: 0,
      totalRevenue: 0,
      transactionCount: 0,
      lastSaleDate: null,
      currentStock: item.quantity,
    }));
  
  return {
    topSellers: topSellers.slice(0, 20),
    slowMovers: [...slowMovers.slice(0, 10), ...itemsWithNoSales.slice(0, 10)],
    summary,
    categoryBreakdown: Array.from(categoryBreakdown.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
    dailyTrend: Array.from(dailySales.values()).sort((a, b) => a.date.localeCompare(b.date)),
    recentTransactions: transactions.slice(0, 50).map(tx => ({
      ...tx,
      itemName: itemMap.get(tx.inventoryItemId)?.name || 'Unknown',
      categoryName: itemMap.get(tx.inventoryItemId)?.categoryName || 'Unknown',
    })),
  };
}


// ============ STORE WAIVER ============
export async function getStoreWaiverByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeWaivers).where(eq(storeWaivers.userId, userId));
  return result[0] || null;
}

export async function createStoreWaiver(data: InsertStoreWaiver) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(storeWaivers).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getAllStoreWaivers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeWaivers).orderBy(desc(storeWaivers.agreedAt));
}

export async function getStoreWaiverByRenewalToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeWaivers).where(eq(storeWaivers.renewalToken, token));
  return result[0] || null;
}

export async function updateStoreWaiver(id: number, data: Partial<InsertStoreWaiver>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(storeWaivers).set(data).where(eq(storeWaivers.id, id));
}

export async function deleteStoreWaiver(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete renewal history first (foreign key constraint)
  await db.delete(waiverRenewalHistory).where(eq(waiverRenewalHistory.waiverId, id));
  // Delete the waiver
  await db.delete(storeWaivers).where(eq(storeWaivers.id, id));
}

export async function renewStoreWaiver(id: number, data: {
  signatureData: string;
  agreedAt: Date;
  expiresAt: Date | null;
  renewalReminderSent: boolean;
  renewalToken: string | null;
  ipAddress: string;
}, previousExpiresAt: Date | null = null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(storeWaivers).set(data).where(eq(storeWaivers.id, id));
  
  // Record renewal in history
  await db.insert(waiverRenewalHistory).values({
    waiverId: id,
    renewedAt: data.agreedAt,
    previousExpiresAt: previousExpiresAt,
    newExpiresAt: data.expiresAt,
    ipAddress: data.ipAddress,
  });
}

// ============ WAIVER RENEWAL HISTORY ============
export async function getWaiverRenewalHistory(waiverId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(waiverRenewalHistory)
    .where(eq(waiverRenewalHistory.waiverId, waiverId))
    .orderBy(desc(waiverRenewalHistory.renewedAt));
}

export async function getWaiverRenewalCount(waiverId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(waiverRenewalHistory)
    .where(eq(waiverRenewalHistory.waiverId, waiverId));
  return result[0]?.count || 0;
}

export async function getAllWaiversWithRenewalCount() {
  const db = await getDb();
  if (!db) return [];
  const waivers = await db.select().from(storeWaivers).orderBy(desc(storeWaivers.agreedAt));
  
  // Get renewal counts for all waivers
  const waiverIds = waivers.map(w => w.id);
  if (waiverIds.length === 0) return [];
  
  const renewalCounts = await db.select({
    waiverId: waiverRenewalHistory.waiverId,
    count: sql<number>`COUNT(*)`
  })
    .from(waiverRenewalHistory)
    .where(inArray(waiverRenewalHistory.waiverId, waiverIds))
    .groupBy(waiverRenewalHistory.waiverId);
  
  const countMap = new Map(renewalCounts.map(r => [r.waiverId, r.count]));
  
  return waivers.map(w => ({
    ...w,
    renewalCount: countMap.get(w.id) || 0
  }));
}

// ============ AGE DISCLAIMER ============
export async function getAgeDisclaimerByVisitorId(visitorId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(ageDisclaimers).where(eq(ageDisclaimers.visitorId, visitorId));
  return result[0] || null;
}

export async function getAgeDisclaimerByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(ageDisclaimers).where(eq(ageDisclaimers.userId, userId));
  return result[0] || null;
}

export async function createAgeDisclaimer(data: InsertAgeDisclaimer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ageDisclaimers).values(data);
  return { id: result[0].insertId, ...data };
}

// ============ LOGIN CODES ============
export async function createLoginCode(data: InsertLoginCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(loginCodes).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getValidLoginCode(email: string, code: string) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const result = await db.select().from(loginCodes)
    .where(and(
      eq(loginCodes.email, email),
      eq(loginCodes.code, code),
      gte(loginCodes.expiresAt, now),
      isNull(loginCodes.usedAt)
    ));
  return result[0] || null;
}

export async function markLoginCodeUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(loginCodes).set({ usedAt: new Date() }).where(eq(loginCodes.id, id));
}

export async function deleteExpiredLoginCodes() {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.delete(loginCodes).where(lte(loginCodes.expiresAt, now));
}

// ============ SITE SETTINGS ============
export async function getSiteSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
  return result[0]?.value || null;
}

export async function setSiteSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if setting exists
  const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
  if (existing.length > 0) {
    await db.update(siteSettings).set({ value }).where(eq(siteSettings.key, key));
  } else {
    await db.insert(siteSettings).values({ key, value });
  }
}

export async function getAllSiteSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(siteSettings);
}


// ==================== Affiliate Partners ====================

export async function getAllAffiliatePartners(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  
  if (activeOnly) {
    return db.select().from(affiliatePartners)
      .where(eq(affiliatePartners.isActive, true))
      .orderBy(affiliatePartners.sortOrder, affiliatePartners.name);
  }
  return db.select().from(affiliatePartners).orderBy(affiliatePartners.sortOrder, affiliatePartners.name);
}

export async function getAffiliatePartnerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(affiliatePartners).where(eq(affiliatePartners.id, id));
  return result[0] || null;
}

export async function createAffiliatePartner(data: InsertAffiliatePartner) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(affiliatePartners).values(data);
  return result[0].insertId;
}

export async function updateAffiliatePartner(id: number, data: Partial<InsertAffiliatePartner>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(affiliatePartners).set(data).where(eq(affiliatePartners.id, id));
  return true;
}

export async function deleteAffiliatePartner(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(affiliatePartners).where(eq(affiliatePartners.id, id));
  return true;
}

export async function getFeaturedAffiliatePartners() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(affiliatePartners)
    .where(and(eq(affiliatePartners.isActive, true), eq(affiliatePartners.isFeatured, true)))
    .orderBy(affiliatePartners.sortOrder, affiliatePartners.name);
}


// ============ PARTNER CLICK TRACKING ============
export async function trackPartnerClick(partnerId: number, userAgent?: string, ipHash?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // We'll store partner clicks in a simple way - increment a click count or log to a table
  // For now, let's use the existing affiliate_clicks table with a special marker
  // Or we can just track via the partner's sortOrder as a simple counter
  
  // Actually, let's create a simple tracking by updating a click count on the partner
  // First, let's just log this - the data-tracking attribute is already set for analytics integration
  console.log(`Partner click tracked: partnerId=${partnerId}, userAgent=${userAgent?.substring(0, 50)}`);
  return { success: true };
}

export async function getPartnerClickStats() {
  const db = await getDb();
  if (!db) return [];
  
  // Return partners with their click tracking info
  const partners = await db.select().from(affiliatePartners)
    .where(eq(affiliatePartners.isActive, true))
    .orderBy(desc(affiliatePartners.sortOrder));
  
  return partners;
}


// ============ COUPONS ============
export async function getAllCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function getActiveCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons)
    .where(eq(coupons.isActive, true))
    .orderBy(desc(coupons.createdAt));
}

export async function getCouponById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(coupons).where(eq(coupons.id, id));
  return result[0] || null;
}

export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(coupons)
    .where(eq(coupons.code, code.toUpperCase()));
  return result[0] || null;
}

export async function createCoupon(data: InsertCoupon) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Ensure code is uppercase
  const couponData = {
    ...data,
    code: data.code.toUpperCase(),
    // Flag if discount is over 20%
    isFlagged: parseFloat(data.discountPercent as string) > 20,
  };
  
  const result = await db.insert(coupons).values(couponData);
  return { id: result[0].insertId, ...couponData };
}

export async function updateCoupon(id: number, data: Partial<InsertCoupon>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { ...data };
  if (data.code) {
    updateData.code = data.code.toUpperCase();
  }
  if (data.discountPercent !== undefined) {
    updateData.isFlagged = parseFloat(data.discountPercent as string) > 20;
  }
  
  await db.update(coupons).set(updateData).where(eq(coupons.id, id));
  return getCouponById(id);
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Also delete usage records
  await db.delete(couponUsage).where(eq(couponUsage.couponId, id));
  await db.delete(coupons).where(eq(coupons.id, id));
}

export async function deactivateCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(coupons).set({ isActive: false }).where(eq(coupons.id, id));
}

export async function validateCoupon(code: string, clientProtocolId?: number): Promise<{
  valid: boolean;
  coupon?: typeof coupons.$inferSelect;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { valid: false, error: "Database not available" };
  
  const coupon = await getCouponByCode(code);
  
  if (!coupon) {
    return { valid: false, error: "Invalid coupon code" };
  }
  
  if (!coupon.isActive) {
    return { valid: false, error: "This coupon is no longer active" };
  }
  
  // Check expiration
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: "This coupon has expired" };
  }
  
  // Check usage limits for one-time coupons
  if (coupon.usageType === 'one_time' && coupon.currentUses >= 1) {
    return { valid: false, error: "This coupon has already been used" };
  }
  
  // Check max uses limit
  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    return { valid: false, error: "This coupon has reached its usage limit" };
  }
  
  // Check client-specific scope
  if (coupon.scope === 'client_specific' && coupon.clientProtocolId !== clientProtocolId) {
    return { valid: false, error: "This coupon is not valid for this protocol" };
  }
  
  return { valid: true, coupon };
}

export async function applyCoupon(couponId: number, clientProtocolId: number, discountApplied: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Record usage
  await db.insert(couponUsage).values({
    couponId,
    clientProtocolId,
    discountApplied: discountApplied.toString(),
  });
  
  // Increment usage count
  const coupon = await getCouponById(couponId);
  if (coupon) {
    await db.update(coupons)
      .set({ currentUses: coupon.currentUses + 1 })
      .where(eq(coupons.id, couponId));
  }
  
  return { success: true };
}

export async function getCouponUsage(couponId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(couponUsage)
    .where(eq(couponUsage.couponId, couponId))
    .orderBy(desc(couponUsage.usedAt));
}

export async function getFlaggedCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons)
    .where(and(eq(coupons.isFlagged, true), eq(coupons.isActive, true)))
    .orderBy(desc(coupons.createdAt));
}

export async function getCouponsForClient(clientProtocolId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons)
    .where(and(
      eq(coupons.isActive, true),
      or(
        eq(coupons.scope, 'universal'),
        eq(coupons.clientProtocolId, clientProtocolId)
      )
    ))
    .orderBy(desc(coupons.createdAt));
}

// Coupon Analytics Functions
export async function getCouponAnalytics() {
  const db = await getDb();
  if (!db) return { coupons: [], totalSavings: 0, totalUsages: 0 };
  
  // Get all coupons with their usage stats
  const allCoupons = await db.select().from(coupons).orderBy(desc(coupons.currentUses));
  
  // Get all usage records with discount amounts
  const allUsage = await db.select().from(couponUsage);
  
  // Calculate total savings
  const totalSavings = allUsage.reduce((sum, usage) => sum + parseFloat(usage.discountApplied || '0'), 0);
  const totalUsages = allUsage.length;
  
  // Calculate savings per coupon
  const couponStats = allCoupons.map(coupon => {
    const usages = allUsage.filter(u => u.couponId === coupon.id);
    const savings = usages.reduce((sum, u) => sum + parseFloat(u.discountApplied || '0'), 0);
    return {
      ...coupon,
      totalSavings: savings,
      usageCount: usages.length,
    };
  });
  
  return {
    coupons: couponStats,
    totalSavings,
    totalUsages,
  };
}

export async function getCouponUsageDetails(couponId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get usage with client protocol details
  const usage = await db.select({
    id: couponUsage.id,
    couponId: couponUsage.couponId,
    clientProtocolId: couponUsage.clientProtocolId,
    discountApplied: couponUsage.discountApplied,
    usedAt: couponUsage.usedAt,
    clientName: clientProtocols.clientName,
    clientEmail: clientProtocols.clientEmail,
  })
    .from(couponUsage)
    .leftJoin(clientProtocols, eq(couponUsage.clientProtocolId, clientProtocols.id))
    .where(eq(couponUsage.couponId, couponId))
    .orderBy(desc(couponUsage.usedAt));
  
  return usage;
}

// Bulk coupon generation
export async function bulkCreateCoupons(
  prefix: string,
  count: number,
  settings: {
    discountPercent: number;
    usageType: string;
    maxUses: number | null;
    scope: string;
    expiresAt: Date | null;
    notes: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const createdCoupons = [];
  
  for (let i = 0; i < count; i++) {
    // Generate unique suffix
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `${prefix}${suffix}`;
    
    const isFlagged = settings.discountPercent > 20;
    
    const couponData: InsertCoupon = {
      code,
      discountPercent: settings.discountPercent.toString(),
      usageType: settings.usageType as "one_time" | "unlimited",
      maxUses: settings.maxUses,
      scope: settings.scope as "universal" | "client_specific",
      expiresAt: settings.expiresAt,
      notes: settings.notes,
      isFlagged,
      isActive: true,
      currentUses: 0,
    };
    
    const result = await db.insert(coupons).values(couponData);
    
    createdCoupons.push({ id: result[0].insertId, code });
  }
  
  return createdCoupons;
}


// Auto-deactivate expired or maxed-out coupons
export async function autoDeactivateCoupons() {
  const db = await getDb();
  if (!db) return { deactivated: [] };
  
  const now = new Date();
  const deactivated: { id: number; code: string; reason: string }[] = [];
  
  // Get all active coupons
  const activeCoupons = await db.select().from(coupons).where(eq(coupons.isActive, true));
  
  for (const coupon of activeCoupons) {
    let reason: string | null = null;
    
    // Check if expired
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      reason = "Expired";
    }
    // Check if max uses reached
    else if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      reason = "Max uses reached";
    }
    
    if (reason) {
      await db.update(coupons)
        .set({ isActive: false, deactivationReason: reason })
        .where(eq(coupons.id, coupon.id));
      
      deactivated.push({ id: coupon.id, code: coupon.code, reason });
    }
  }
  
  return { deactivated };
}

// Get coupons expiring soon (within specified days)
export async function getExpiringCoupons(daysAhead: number = 3) {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  // Get active coupons with expiration dates within the range
  const expiringCoupons = await db.select()
    .from(coupons)
    .where(
      and(
        eq(coupons.isActive, true),
        isNotNull(coupons.expiresAt),
        gt(coupons.expiresAt, now),
        lte(coupons.expiresAt, futureDate)
      )
    )
    .orderBy(coupons.expiresAt);
  
  return expiringCoupons;
}

// Get unique coupon categories
export async function getCouponCategories() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.selectDistinct({ category: coupons.category })
    .from(coupons)
    .where(isNotNull(coupons.category));
  
  return result.map(r => r.category).filter(Boolean) as string[];
}

// Get coupon usage trends (daily usage for past month)
export async function getCouponUsageTrends(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Get all usage records from the past month
  const usage = await db.select()
    .from(couponUsage)
    .where(gte(couponUsage.usedAt, startDate))
    .orderBy(couponUsage.usedAt);
  
  // Group by date
  const dailyUsage: { [date: string]: { count: number; savings: number } } = {};
  
  // Initialize all days with 0
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyUsage[dateStr] = { count: 0, savings: 0 };
  }
  
  // Fill in actual usage
  for (const record of usage) {
    const dateStr = new Date(record.usedAt).toISOString().split('T')[0];
    if (dailyUsage[dateStr]) {
      dailyUsage[dateStr].count++;
      dailyUsage[dateStr].savings += parseFloat(record.discountApplied || '0');
    }
  }
  
  // Convert to array
  return Object.entries(dailyUsage).map(([date, data]) => ({
    date,
    count: data.count,
    savings: data.savings,
  }));
}


// ============ EMAIL TRACKING FUNCTIONS ============

// Generate a unique tracking token
function generateTrackingToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Record an email event (sent, opened, clicked, etc.)
export async function recordEmailEvent(data: {
  clientProtocolId: number;
  eventType: 'sent' | 'opened' | 'clicked' | 'bounced';
  emailType: 'protocol_link' | 'protocol_pdf' | 'reminder' | 'notification';
  recipientEmail: string;
  metadata?: Record<string, any>;
}): Promise<{ id: number; trackingToken: string }> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const trackingToken = generateTrackingToken();
  
  const result = await database.insert(emailEvents).values({
    clientProtocolId: data.clientProtocolId,
    eventType: data.eventType,
    emailType: data.emailType,
    recipientEmail: data.recipientEmail,
    trackingToken,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  });
  
  return { id: Number(result[0].insertId), trackingToken };
}

// Record email open from tracking pixel
export async function recordEmailOpen(trackingToken: string, metadata?: Record<string, any>): Promise<{ success: boolean; protocolId?: number; isFirstOpen?: boolean; sentAt?: Date | null }> {
  const database = await getDb();
  if (!database) return { success: false };
  
  // Find the original sent event
  const sentEvent = await database.select()
    .from(emailEvents)
    .where(eq(emailEvents.trackingToken, trackingToken))
    .limit(1);
  
  if (!sentEvent.length) return { success: false };
  
  // Check if already opened
  const existingOpen = await database.select()
    .from(emailEvents)
    .where(and(
      eq(emailEvents.clientProtocolId, sentEvent[0].clientProtocolId),
      eq(emailEvents.eventType, 'opened'),
      eq(emailEvents.emailType, sentEvent[0].emailType)
    ))
    .limit(1);
  
  if (existingOpen.length) {
    // Already recorded an open, just return success
    return { success: true, protocolId: sentEvent[0].clientProtocolId, isFirstOpen: false, sentAt: sentEvent[0].createdAt };
  }
  
  // Record the open event
  await database.insert(emailEvents).values({
    clientProtocolId: sentEvent[0].clientProtocolId,
    eventType: 'opened',
    emailType: sentEvent[0].emailType,
    recipientEmail: sentEvent[0].recipientEmail,
    trackingToken: generateTrackingToken(),
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
  
  return { success: true, protocolId: sentEvent[0].clientProtocolId, isFirstOpen: true, sentAt: sentEvent[0].createdAt };
}

// Get email events for a protocol
export async function getEmailEventsForProtocol(protocolId: number) {
  const database = await getDb();
  if (!database) return [];
  
  return database.select()
    .from(emailEvents)
    .where(eq(emailEvents.clientProtocolId, protocolId))
    .orderBy(desc(emailEvents.createdAt));
}

// Get email status summary for a protocol
export async function getEmailStatusForProtocol(protocolId: number): Promise<{
  sent: boolean;
  sentAt: Date | null;
  opened: boolean;
  openedAt: Date | null;
  emailType: string | null;
}> {
  const database = await getDb();
  if (!database) return { sent: false, sentAt: null, opened: false, openedAt: null, emailType: null };
  
  const events = await database.select()
    .from(emailEvents)
    .where(eq(emailEvents.clientProtocolId, protocolId))
    .orderBy(desc(emailEvents.createdAt));
  
  const sentEvent = events.find(e => e.eventType === 'sent');
  const openedEvent = events.find(e => e.eventType === 'opened');
  
  return {
    sent: !!sentEvent,
    sentAt: sentEvent?.createdAt || null,
    opened: !!openedEvent,
    openedAt: openedEvent?.createdAt || null,
    emailType: sentEvent?.emailType || null,
  };
}

// Get all protocols with their email status (for admin list view)
export async function getProtocolsEmailStatus(protocolIds: number[]): Promise<Map<number, { sent: boolean; opened: boolean; sentAt: Date | null; openedAt: Date | null }>> {
  const database = await getDb();
  const statusMap = new Map<number, { sent: boolean; opened: boolean; sentAt: Date | null; openedAt: Date | null }>();
  
  if (!database || protocolIds.length === 0) return statusMap;
  
  const events = await database.select()
    .from(emailEvents)
    .where(inArray(emailEvents.clientProtocolId, protocolIds));
  
  // Group by protocol ID
  for (const protocolId of protocolIds) {
    const protocolEvents = events.filter(e => e.clientProtocolId === protocolId);
    const sentEvent = protocolEvents.find(e => e.eventType === 'sent');
    const openedEvent = protocolEvents.find(e => e.eventType === 'opened');
    
    statusMap.set(protocolId, {
      sent: !!sentEvent,
      opened: !!openedEvent,
      sentAt: sentEvent?.createdAt || null,
      openedAt: openedEvent?.createdAt || null,
    });
  }
  
  return statusMap;
}

// ============ EMAIL BRANDING FUNCTIONS ============

// Get email branding settings (singleton)
export async function getEmailBrandingSettings() {
  const database = await getDb();
  if (!database) return null;
  
  const settings = await database.select()
    .from(emailBrandingSettings)
    .limit(1);
  
  if (!settings.length) {
    // Return defaults
    return {
      id: 0,
      logoUrl: null,
      primaryColor: '#ea580c',
      secondaryColor: '#1e40af',
      companyName: 'Omega Longevity',
      tagline: 'Elite Level Health Optimization',
      footerText: null,
      socialLinks: null,
    };
  }
  
  return settings[0];
}

// Update email branding settings
export async function updateEmailBrandingSettings(data: Partial<InsertEmailBrandingSetting>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const existing = await database.select()
    .from(emailBrandingSettings)
    .limit(1);
  
  if (existing.length) {
    await database.update(emailBrandingSettings)
      .set(data)
      .where(eq(emailBrandingSettings.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await database.insert(emailBrandingSettings).values(data as InsertEmailBrandingSetting);
    return Number(result[0].insertId);
  }
}


// ============ EMAIL ANALYTICS FUNCTIONS ============

// Get email analytics for the last N days
export async function getEmailAnalytics(days: number = 30): Promise<{
  totalSent: number;
  totalOpened: number;
  openRate: number;
  dailyStats: Array<{ date: string; sent: number; opened: number }>;
  clientOpens: Array<{ clientName: string; clientEmail: string | null; openedAt: Date; protocolId: number }>;
}> {
  const database = await getDb();
  if (!database) {
    return { totalSent: 0, totalOpened: 0, openRate: 0, dailyStats: [], clientOpens: [] };
  }
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  const events = await database.select()
    .from(emailEvents)
    .where(gte(emailEvents.createdAt, startDate));
  
  // Calculate totals
  const sentEvents = events.filter(e => e.eventType === 'sent');
  const openedEvents = events.filter(e => e.eventType === 'opened');
  
  const totalSent = sentEvents.length;
  const totalOpened = openedEvents.length;
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  
  // Calculate daily stats
  const dailyMap = new Map<string, { sent: number; opened: number }>();
  
  // Initialize all days in range
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyMap.set(dateStr, { sent: 0, opened: 0 });
  }
  
  // Count events per day
  for (const event of events) {
    const dateStr = new Date(event.createdAt).toISOString().split('T')[0];
    const existing = dailyMap.get(dateStr) || { sent: 0, opened: 0 };
    if (event.eventType === 'sent') {
      existing.sent++;
    } else if (event.eventType === 'opened') {
      existing.opened++;
    }
    dailyMap.set(dateStr, existing);
  }
  
  // Convert to array and sort by date
  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Get client details for opened emails
  const clientOpens: Array<{ clientName: string; clientEmail: string | null; openedAt: Date; protocolId: number }> = [];
  
  for (const event of openedEvents) {
    // Get protocol info for this event
    const protocols = await database.select()
      .from(clientProtocols)
      .where(eq(clientProtocols.id, event.clientProtocolId));
    
    const protocol = protocols[0];
    if (protocol) {
      clientOpens.push({
        clientName: protocol.clientName,
        clientEmail: protocol.clientEmail,
        openedAt: event.createdAt,
        protocolId: event.clientProtocolId,
      });
    }
  }
  
  // Sort by most recent first
  clientOpens.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  
  return { totalSent, totalOpened, openRate, dailyStats, clientOpens };
}


// ============ PROTOCOL ORDER FUNCTIONS ============

// Create a protocol order
export async function createProtocolOrder(data: {
  clientProtocolId: number;
  clientName: string;
  clientEmail: string;
  stripeSessionId: string;
  totalAmount: number;
  itemsSummary?: string;
}): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database.insert(protocolOrders).values({
    clientProtocolId: data.clientProtocolId,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    stripeSessionId: data.stripeSessionId,
    totalAmount: data.totalAmount.toString(),
    itemsSummary: data.itemsSummary || null,
    status: 'pending',
  });
  
  return Number(result[0].insertId);
}

// Get protocol order by protocol ID
export async function getProtocolOrderByProtocolId(clientProtocolId: number) {
  const database = await getDb();
  if (!database) return null;
  
  const orders = await database.select()
    .from(protocolOrders)
    .where(eq(protocolOrders.clientProtocolId, clientProtocolId))
    .orderBy(desc(protocolOrders.createdAt))
    .limit(1);
  
  return orders[0] || null;
}

// Get all protocol orders
export async function getAllProtocolOrders() {
  const database = await getDb();
  if (!database) return [];
  
  return database.select()
    .from(protocolOrders)
    .orderBy(desc(protocolOrders.createdAt));
}

// Update protocol order status
export async function updateProtocolOrderStatus(
  stripeSessionId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  paymentIntentId?: string
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(protocolOrders)
    .set({
      status,
      stripePaymentIntentId: paymentIntentId || null,
      completedAt: status === 'completed' ? new Date() : null,
    })
    .where(eq(protocolOrders.stripeSessionId, stripeSessionId));
}


// ============ ORDER HISTORY FUNCTIONS ============

// Get all orders with client protocol details
export async function getOrdersWithDetails() {
  const database = await getDb();
  if (!database) return [];
  
  const orders = await database.select()
    .from(protocolOrders)
    .orderBy(desc(protocolOrders.createdAt));
  
  // Enrich with client protocol info
  const enrichedOrders = await Promise.all(orders.map(async (order) => {
    const protocols = await database.select()
      .from(clientProtocols)
      .where(eq(clientProtocols.id, order.clientProtocolId));
    
    const protocol = protocols[0];
    
    return {
      ...order,
      protocol: protocol ? {
        id: protocol.id,
        clientName: protocol.clientName,
        clientEmail: protocol.clientEmail,
        discountPercent: protocol.discountPercent,
        coachingPackage: protocol.coachingPackage,
        coachingPrice: protocol.coachingPrice,
        status: protocol.status,
      } : null,
    };
  }));
  
  return enrichedOrders;
}

// Get order by ID with full details
export async function getOrderById(orderId: number) {
  const database = await getDb();
  if (!database) return null;
  
  const orders = await database.select()
    .from(protocolOrders)
    .where(eq(protocolOrders.id, orderId));
  
  const order = orders[0];
  if (!order) return null;
  
  // Get associated protocol
  const protocols = await database.select()
    .from(clientProtocols)
    .where(eq(clientProtocols.id, order.clientProtocolId));
  
  const protocol = protocols[0];
  
  // Get protocol items if protocol exists
  let items: any[] = [];
  if (protocol) {
    const clientItems = await database.select()
      .from(clientProtocolItems)
      .where(eq(clientProtocolItems.clientProtocolId, protocol.id));
    
    // Get master item details
    const allItems = await database.select().from(protocolItems);
    
    items = clientItems.map(ci => {
      const masterItem = allItems.find(i => i.id === ci.protocolItemId);
      return {
        ...ci,
        name: masterItem?.name || 'Unknown Item',
        itemType: masterItem?.itemType || 'other',
        price: ci.customPrice || masterItem?.price || '0',
      };
    }).filter(item => item.isIncluded);
  }
  
  return {
    ...order,
    protocol,
    items,
  };
}


// ============ EMAIL CLICK TRACKING ============

// Record email link click
export async function recordEmailClick(trackingToken: string, metadata: {
  linkUrl: string;
  linkName: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}) {
  const database = await getDb();
  if (!database) return { success: false };
  
  // Find the original sent event to get the protocol ID
  const events = await database.select()
    .from(emailEvents)
    .where(eq(emailEvents.trackingToken, trackingToken))
    .limit(1);
  
  const originalEvent = events[0];
  if (!originalEvent) {
    console.log(`[Click Tracking] No original event found for token: ${trackingToken}`);
    return { success: false };
  }
  
  // Generate a unique token for this click event
  const clickToken = `click_${trackingToken}_${Date.now()}`;
  
  // Record the click event
  await database.insert(emailEvents).values({
    clientProtocolId: originalEvent.clientProtocolId,
    eventType: 'clicked',
    emailType: originalEvent.emailType,
    recipientEmail: originalEvent.recipientEmail,
    trackingToken: clickToken,
    linkUrl: metadata.linkUrl,
    linkName: metadata.linkName,
    metadata: JSON.stringify({
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      timestamp: metadata.timestamp,
      originalToken: trackingToken,
    }),
  });
  
  console.log(`[Click Tracking] Recorded click for protocol ${originalEvent.clientProtocolId}: ${metadata.linkName}`);
  return { success: true, protocolId: originalEvent.clientProtocolId };
}

// Get email click analytics for dashboard
export async function getEmailClickAnalytics(days: number = 30) {
  const database = await getDb();
  if (!database) return { totalClicks: 0, uniqueClicks: 0, clicksByLink: [], recentClicks: [] };
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Get all click events in the time period
  const clickEvents = await database.select()
    .from(emailEvents)
    .where(and(
      eq(emailEvents.eventType, 'clicked'),
      gte(emailEvents.createdAt, startDate)
    ))
    .orderBy(desc(emailEvents.createdAt));
  
  // Get sent events for calculating click-through rate
  const sentEvents = await database.select()
    .from(emailEvents)
    .where(and(
      eq(emailEvents.eventType, 'sent'),
      gte(emailEvents.createdAt, startDate)
    ));
  
  // Calculate clicks by link
  const clicksByLinkMap = new Map<string, number>();
  clickEvents.forEach(event => {
    const linkName = event.linkName || 'Unknown Link';
    clicksByLinkMap.set(linkName, (clicksByLinkMap.get(linkName) || 0) + 1);
  });
  
  const clicksByLink = Array.from(clicksByLinkMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  // Get unique protocols that had clicks
  const uniqueProtocolsClicked = new Set(clickEvents.map(e => e.clientProtocolId)).size;
  const totalEmailsSent = sentEvents.length;
  
  // Get recent clicks with client info
  const recentClicks = await Promise.all(
    clickEvents.slice(0, 20).map(async (event) => {
      const protocols = await database.select()
        .from(clientProtocols)
        .where(eq(clientProtocols.id, event.clientProtocolId));
      const protocol = protocols[0];
      
      return {
        id: event.id,
        clientName: protocol?.clientName || 'Unknown',
        clientEmail: event.recipientEmail,
        linkName: event.linkName || 'Unknown Link',
        linkUrl: event.linkUrl,
        clickedAt: event.createdAt,
        protocolId: event.clientProtocolId,
      };
    })
  );
  
  return {
    totalClicks: clickEvents.length,
    uniqueClicks: uniqueProtocolsClicked,
    clickThroughRate: totalEmailsSent > 0 ? (uniqueProtocolsClicked / totalEmailsSent * 100).toFixed(1) : '0',
    clicksByLink,
    recentClicks,
  };
}


// ============ PACKING SLIP FUNCTIONS ============

import { packingSlips, packingSlipItems, packingSlipAuditLog } from "../drizzle/schema";

// Create a packing slip when protocol is approved
export async function createPackingSlip(data: {
  clientProtocolId?: number | null;
  storeOrderId?: number | null;
  customOrderId?: number | null;
  source?: 'protocol' | 'store' | 'custom';
  protocolOrderId?: number;
  clientName: string;
  clientEmail: string;
  // Shipping address (optional, copied from client protocol)
  shippingName?: string | null;
  shippingStreet?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingZip?: string | null;
  shippingCountry?: string | null;
  shippingPhone?: string | null;
  items: Array<{
    protocolItemId: number;
    itemName: string;
    itemType: string;
    quantity: number;
    price?: number;
  }>;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Create the packing slip
  const result = await database.insert(packingSlips).values({
    clientProtocolId: data.clientProtocolId || null,
    storeOrderId: data.storeOrderId || null,
    customOrderId: data.customOrderId || null,
    source: data.source || 'protocol',
    protocolOrderId: data.protocolOrderId || null,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    // Shipping address
    shippingName: data.shippingName || null,
    shippingStreet: data.shippingStreet || null,
    shippingCity: data.shippingCity || null,
    shippingState: data.shippingState || null,
    shippingZip: data.shippingZip || null,
    shippingCountry: data.shippingCountry || null,
    shippingPhone: data.shippingPhone || null,
    status: 'pending',
    totalItems: data.items.reduce((sum, item) => sum + item.quantity, 0),
    itemsFulfilled: 0,
    itemsBackordered: 0,
  });
  
  const packingSlipId = Number(result[0].insertId);
  
  // Create packing slip items
  for (const item of data.items) {
    await database.insert(packingSlipItems).values({
      packingSlipId,
      protocolItemId: item.protocolItemId,
      itemName: item.itemName,
      itemType: item.itemType,
      quantity: item.quantity,
      quantityFulfilled: 0,
      quantityBackordered: 0,
      status: 'pending',
      price: item.price?.toString() || null,
    });
  }
  
  return packingSlipId;
}

// Create packing slip when payment is received (only for protocols with total > $0)
export async function createPackingSlipOnPayment(protocolId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Get the protocol
  const protocol = await getClientProtocolById(protocolId);
  if (!protocol) throw new Error("Protocol not found");
  
  // Check if packing slip already exists for this protocol
  const existingSlip = await getPackingSlipByProtocolId(protocolId);
  if (existingSlip) {
    console.log(`[PackingSlip] Packing slip already exists for protocol ${protocolId}`);
    return existingSlip.id;
  }
  
  // Get protocol items
  const protocolItems = await getClientProtocolItems(protocolId);
  const allItems = await getAllProtocolItems();
  
  // Calculate total amount for recommended items
  let totalAmount = 0;
  const shippableItems: Array<{
    protocolItemId: number;
    itemName: string;
    itemType: string;
    quantity: number;
    price: number;
  }> = [];
  
  for (const item of protocolItems) {
    // Include all items that are INCLUDED in the protocol (isIncluded), not just recommended
    // This ensures items the client paid for (like optional add-ons) are on the packing slip
    if (!item.isIncluded) continue;
    
    // Skip QTY 0 items - these are informational only, not for shipping
    if (!item.quantity || item.quantity <= 0) continue;
    
    const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
    // Use snapshotName as fallback for deleted master items
    const itemName = protocolItem?.name || (item as any).snapshotName || null;
    if (!itemName) continue;
    
    const itemType = protocolItem?.itemType || 'other';
    // Only include shippable items (not services)
    if (!['peptide', 'supplement', 'supply', 'other'].includes(itemType)) continue;
    
    // Skip client-sourced items - they buy these themselves via affiliate links
    if (item.fulfillmentSource === 'client') continue;
    
    const price = parseFloat(item.customPrice || protocolItem?.price || '0');
    const quantity = item.quantity;
    totalAmount += price * quantity;
    
    shippableItems.push({
      protocolItemId: item.protocolItemId,
      itemName,
      itemType,
      quantity,
      price,
    });
  }
  
  // Only create packing slip if total > $0 (not "client gets their own" affiliate-only protocols)
  if (totalAmount <= 0) {
    console.log(`[PackingSlip] Skipping packing slip for protocol ${protocolId} - total amount is $0 (affiliate-only protocol)`);
    return null;
  }
  
  if (shippableItems.length === 0) {
    console.log(`[PackingSlip] Skipping packing slip for protocol ${protocolId} - no shippable items`);
    return null;
  }
  
  // Create the packing slip
  const packingSlipId = await createPackingSlip({
    clientProtocolId: protocol.id,
    clientName: protocol.clientName,
    clientEmail: protocol.clientEmail || '',
    shippingName: protocol.shippingName,
    shippingStreet: protocol.shippingStreet,
    shippingCity: protocol.shippingCity,
    shippingState: protocol.shippingState,
    shippingZip: protocol.shippingZip,
    shippingCountry: protocol.shippingCountry,
    shippingPhone: protocol.shippingPhone,
    items: shippableItems,
  });
  
  console.log(`[PackingSlip] Created packing slip ${packingSlipId} for protocol ${protocolId} (total: $${totalAmount.toFixed(2)}, ${shippableItems.length} items)`);
  
  return packingSlipId;
}

// Create packing slip for a store order
export async function createPackingSlipForStoreOrder(storeOrderId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Get the store order
  const order = await getStoreOrder(storeOrderId);
  if (!order) throw new Error(`Store order ${storeOrderId} not found`);
  
  // Check if packing slip already exists for this store order
  const existingSlips = await database.select()
    .from(packingSlips)
    .where(eq(packingSlips.storeOrderId, storeOrderId));
  if (existingSlips.length > 0) {
    console.log(`[PackingSlip] Packing slip already exists for store order ${storeOrderId}`);
    return existingSlips[0].id;
  }
  
  // Get store order items
  const orderItems = await getStoreOrderItems(storeOrderId);
  if (orderItems.length === 0) {
    console.log(`[PackingSlip] No items in store order ${storeOrderId}, skipping packing slip`);
    return null;
  }
  
  // Get user info for the order
  const user = await getUserById(order.userId);
  
  // Map store order items to packing slip items
  // Use inventoryItemId as protocolItemId (they serve the same purpose: linking to the product)
  const shippableItems = orderItems.map(item => ({
    protocolItemId: item.inventoryItemId, // Re-use this field for inventory item reference
    itemName: item.name,
    itemType: 'supply' as string, // Store items are physical products
    quantity: item.quantity,
    price: parseFloat(item.pricePerUnit || '0'),
  }));
  
  // Create the packing slip with shipping address from store order
  const packingSlipId = await createPackingSlip({
    storeOrderId: order.id,
    source: 'store',
    clientName: order.payerName || user?.name || 'Unknown',
    clientEmail: order.payerEmail || user?.email || '',
    shippingName: order.shippingName || order.payerName || user?.name || null,
    shippingStreet: order.shippingStreet || null,
    shippingCity: order.shippingCity || null,
    shippingState: order.shippingState || null,
    shippingZip: order.shippingZip || null,
    shippingCountry: order.shippingCountry || null,
    shippingPhone: order.shippingPhone || null,
    items: shippableItems,
  });
  
  console.log(`[PackingSlip] Created packing slip ${packingSlipId} for store order ${storeOrderId} (${shippableItems.length} items, total: $${order.total})`);
  
  // Create audit log entry
  await createPackingSlipAuditEntry({
    packingSlipId,
    action: 'created',
    details: {
      source: 'store',
      storeOrderId: order.id,
      paymentMethod: order.paymentMethod,
      total: order.total,
      itemCount: shippableItems.length,
    },
    performedByName: 'System (Store Order)',
  });
  
  return packingSlipId;
}

// Shared shipping-address fallback: merges protocol address onto a slip when the slip has none.
// Used by getPackingSlipById, getPackingSlipByProtocolId, and getAllPackingSlips (via JOIN).
type ShippingFields = {
  shippingName: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  shippingPhone: string | null;
};

function mergeProtocolShipping<T extends ShippingFields>(
  slip: T,
  protocol: ShippingFields | null | undefined
): T {
  if (slip.shippingStreet || slip.shippingCity || !protocol) return slip;
  if (!protocol.shippingStreet && !protocol.shippingCity) return slip;
  return {
    ...slip,
    shippingName: protocol.shippingName,
    shippingStreet: protocol.shippingStreet,
    shippingCity: protocol.shippingCity,
    shippingState: protocol.shippingState,
    shippingZip: protocol.shippingZip,
    shippingCountry: protocol.shippingCountry,
    shippingPhone: protocol.shippingPhone,
  };
}

export async function getAllPackingSlips() {
  const database = await getDb();
  if (!database) return [];

  // Single JOIN: resolve shipping address fallback without N+1 queries.
  // The DB status column is authoritative (maintained by recalculatePackingSlipTotals)
  // so we no longer recompute it from counts here.
  const rows = await database
    .select({
      slip: packingSlips,
      protocolShipping: {
        shippingName: clientProtocols.shippingName,
        shippingStreet: clientProtocols.shippingStreet,
        shippingCity: clientProtocols.shippingCity,
        shippingState: clientProtocols.shippingState,
        shippingZip: clientProtocols.shippingZip,
        shippingCountry: clientProtocols.shippingCountry,
        shippingPhone: clientProtocols.shippingPhone,
      },
    })
    .from(packingSlips)
    .leftJoin(clientProtocols, eq(clientProtocols.id, packingSlips.clientProtocolId))
    .where(isNull(packingSlips.archivedAt))
    .orderBy(desc(packingSlips.createdAt));

  return rows.map(({ slip, protocolShipping }) =>
    mergeProtocolShipping(slip, protocolShipping)
  );
}

// Get packing slip by ID with items
export async function getPackingSlipById(id: number) {
  const database = await getDb();
  if (!database) return null;
  
  const slips = await database.select()
    .from(packingSlips)
    .where(eq(packingSlips.id, id));
  
  const slip = slips[0];
  if (!slip) return null;
  
  const items = await database.select()
    .from(packingSlipItems)
    .where(eq(packingSlipItems.packingSlipId, id))
    .orderBy(packingSlipItems.itemName);
  
  let protocol: ShippingFields | null = null;
  if (!slip.shippingStreet && !slip.shippingCity && slip.clientProtocolId) {
    const rows = await database
      .select({
        shippingName: clientProtocols.shippingName,
        shippingStreet: clientProtocols.shippingStreet,
        shippingCity: clientProtocols.shippingCity,
        shippingState: clientProtocols.shippingState,
        shippingZip: clientProtocols.shippingZip,
        shippingCountry: clientProtocols.shippingCountry,
        shippingPhone: clientProtocols.shippingPhone,
      })
      .from(clientProtocols)
      .where(eq(clientProtocols.id, slip.clientProtocolId));
    protocol = rows[0] ?? null;
  }

  return { ...mergeProtocolShipping(slip, protocol), items };
}

// Get packing slip by client protocol ID
export async function getPackingSlipByProtocolId(clientProtocolId: number) {
  const database = await getDb();
  if (!database) return null;
  
  const slips = await database.select()
    .from(packingSlips)
    .where(eq(packingSlips.clientProtocolId, clientProtocolId))
    .orderBy(desc(packingSlips.createdAt))
    .limit(1);
  
  const slip = slips[0];
  if (!slip) return null;
  
  const items = await database.select()
    .from(packingSlipItems)
    .where(eq(packingSlipItems.packingSlipId, slip.id))
    .orderBy(packingSlipItems.itemName);
  
  let protocol: ShippingFields | null = null;
  if (!slip.shippingStreet && !slip.shippingCity) {
    const rows = await database
      .select({
        shippingName: clientProtocols.shippingName,
        shippingStreet: clientProtocols.shippingStreet,
        shippingCity: clientProtocols.shippingCity,
        shippingState: clientProtocols.shippingState,
        shippingZip: clientProtocols.shippingZip,
        shippingCountry: clientProtocols.shippingCountry,
        shippingPhone: clientProtocols.shippingPhone,
      })
      .from(clientProtocols)
      .where(eq(clientProtocols.id, clientProtocolId));
    protocol = rows[0] ?? null;
  }

  return { ...mergeProtocolShipping(slip, protocol), items };
}

// Update packing slip item status
export async function updatePackingSlipItem(
  itemId: number,
  data: {
    quantityFulfilled?: number;
    quantityBackordered?: number;
    status?: 'pending' | 'fulfilled' | 'partial' | 'backordered' | 'cancelled';
    notes?: string;
    shipSource?: 'omega' | 'dropship' | 'vendor' | 'client_sourced';
    itemTrackingCarrier?: string;
    itemTrackingNumber?: string;
    itemTrackingUrl?: string;
  }
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const updateData: any = {};
  if (data.quantityFulfilled !== undefined) updateData.quantityFulfilled = data.quantityFulfilled;
  if (data.quantityBackordered !== undefined) updateData.quantityBackordered = data.quantityBackordered;
  if (data.status) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.shipSource !== undefined) updateData.shipSource = data.shipSource;
  if (data.itemTrackingCarrier !== undefined) updateData.itemTrackingCarrier = data.itemTrackingCarrier;
  if (data.itemTrackingNumber !== undefined) updateData.itemTrackingNumber = data.itemTrackingNumber;
  if (data.itemTrackingUrl !== undefined) updateData.itemTrackingUrl = data.itemTrackingUrl;
  if (data.status === 'fulfilled') {
    updateData.fulfilledAt = new Date();
    // When an item is fulfilled, clear its backorder count so the slip can reach 'complete' status
    updateData.quantityBackordered = 0;
  }
  
  await database.update(packingSlipItems)
    .set(updateData)
    .where(eq(packingSlipItems.id, itemId));
  
  // Get the packing slip ID to update totals
  const items = await database.select()
    .from(packingSlipItems)
    .where(eq(packingSlipItems.id, itemId));
  
  if (items[0]) {
    await recalculatePackingSlipTotals(items[0].packingSlipId);
  }
  
  return { success: true };
}

export async function getPackingSlipByItemId(itemId: number) {
  const database = await getDb();
  if (!database) return null;

  const rows = await database
    .select({ slip: packingSlips })
    .from(packingSlipItems)
    .innerJoin(packingSlips, eq(packingSlipItems.packingSlipId, packingSlips.id))
    .where(eq(packingSlipItems.id, itemId))
    .limit(1);

  return rows[0]?.slip ?? null;
}

export async function getPackingSlipItemById(itemId: number) {
  const database = await getDb();
  if (!database) return null;

  const rows = await database
    .select()
    .from(packingSlipItems)
    .where(eq(packingSlipItems.id, itemId))
    .limit(1);

  return rows[0] ?? null;
}

// Recalculate packing slip totals
async function recalculatePackingSlipTotals(packingSlipId: number) {
  const database = await getDb();
  if (!database) return;
  
  const items = await database.select()
    .from(packingSlipItems)
    .where(eq(packingSlipItems.packingSlipId, packingSlipId));
  
  let totalItems = 0;
  let itemsFulfilled = 0;
  let itemsBackordered = 0;
  
  items.forEach(item => {
    totalItems += item.quantity;
    itemsFulfilled += item.quantityFulfilled;
    itemsBackordered += item.quantityBackordered;
  });
  
  // Determine overall status
  // Key rule: if ALL items are fulfilled (itemsFulfilled >= totalItems), status is 'complete'
  // regardless of stale backorder counts — fulfillment trumps backorder history
  let status: 'pending' | 'in_progress' | 'partial' | 'complete' | 'cancelled' = 'pending';
  const allItemsFulfilled = items.every(item => item.status === 'fulfilled' || item.quantityFulfilled >= item.quantity);
  if (itemsFulfilled >= totalItems || allItemsFulfilled) {
    status = 'complete';
    // Also clear stale backorder count when everything is fulfilled
    itemsBackordered = 0;
  } else if (itemsFulfilled > 0 && itemsFulfilled < totalItems) {
    status = itemsBackordered > 0 ? 'partial' : 'in_progress';
  } else if (itemsBackordered > 0) {
    status = 'partial';
  }
  
  await database.update(packingSlips)
    .set({ totalItems, itemsFulfilled, itemsBackordered, status })
    .where(eq(packingSlips.id, packingSlipId));
}

// Sign off on packing slip
export async function signPackingSlip(
  packingSlipId: number,
  data: {
    fulfilledBy: number;
    fulfilledByName: string;
    signatureData: string;
    notes?: string;
    trackingCarrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  }
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(packingSlips)
    .set({
      fulfilledBy: data.fulfilledBy,
      fulfilledByName: data.fulfilledByName,
      signatureData: data.signatureData,
      signedAt: new Date(),
      notes: data.notes || null,
      trackingCarrier: data.trackingCarrier || null,
      trackingNumber: data.trackingNumber || null,
      trackingUrl: data.trackingUrl || null,
    })
    .where(eq(packingSlips.id, packingSlipId));
  
  return { success: true };
}

// Update packing slip status
export async function updatePackingSlipStatus(
  packingSlipId: number,
  status: 'pending' | 'in_progress' | 'partial' | 'complete' | 'cancelled'
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(packingSlips)
    .set({ status })
    .where(eq(packingSlips.id, packingSlipId));
  
  return { success: true };
}

// Update packing slip shipping address
export async function updatePackingSlipShipping(
  packingSlipId: number,
  shippingData: {
    shippingName?: string;
    shippingStreet?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingZip?: string;
    shippingCountry?: string;
    shippingPhone?: string;
  }
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(packingSlips)
    .set({
      shippingName: shippingData.shippingName || null,
      shippingStreet: shippingData.shippingStreet || null,
      shippingCity: shippingData.shippingCity || null,
      shippingState: shippingData.shippingState || null,
      shippingZip: shippingData.shippingZip || null,
      shippingCountry: shippingData.shippingCountry || null,
      shippingPhone: shippingData.shippingPhone || null,
    })
    .where(eq(packingSlips.id, packingSlipId));
  
  return { success: true };
}

// Update packing slip delivery status
export async function updatePackingSlipDeliveryStatus(
  packingSlipId: number,
  deliveryStatus: 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'exception',
  deliveredAt: Date | null
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(packingSlips)
    .set({ 
      deliveryStatus,
      deliveredAt,
    })
    .where(eq(packingSlips.id, packingSlipId));
  
  return { success: true };
}

// Update packing slip delivery notification sent flag
export async function updatePackingSlipDeliveryNotificationSent(
  packingSlipId: number,
  sent: boolean
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(packingSlips)
    .set({ deliveryNotificationSent: sent })
    .where(eq(packingSlips.id, packingSlipId));
  
  return { success: true };
}

// Delete all items from a packing slip (for regeneration)
export async function deletePackingSlipItems(packingSlipId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.delete(packingSlipItems)
    .where(eq(packingSlipItems.packingSlipId, packingSlipId));
  
  return { success: true };
}

// Add items to an existing packing slip
export async function addPackingSlipItems(
  packingSlipId: number,
  items: Array<{
    protocolItemId: number;
    itemName: string;
    itemType: string;
    quantity: number;
    price?: number;
  }>
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  for (const item of items) {
    await database.insert(packingSlipItems).values({
      packingSlipId,
      protocolItemId: item.protocolItemId,
      itemName: item.itemName,
      itemType: item.itemType,
      quantity: item.quantity,
      quantityFulfilled: 0,
      quantityBackordered: 0,
      status: 'pending',
      price: item.price?.toString() || null,
    });
  }
  
  return { success: true };
}

// Update packing slip total items count
export async function updatePackingSlipTotalItems(packingSlipId: number, totalItems: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(packingSlips)
    .set({ 
      totalItems,
      itemsFulfilled: 0,
      itemsBackordered: 0,
      status: 'pending',
    })
    .where(eq(packingSlips.id, packingSlipId));
  
  return { success: true };
}

// Update packing slip package dimensions
export async function updatePackingSlipDimensions(
  packingSlipId: number,
  dimensionsData: {
    packageWeight: number | null;
    packageLength: number | null;
    packageWidth: number | null;
    packageHeight: number | null;
  }
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(packingSlips)
    .set({
      packageWeight: dimensionsData.packageWeight?.toString() || null,
      packageLength: dimensionsData.packageLength?.toString() || null,
      packageWidth: dimensionsData.packageWidth?.toString() || null,
      packageHeight: dimensionsData.packageHeight?.toString() || null,
    })
    .where(eq(packingSlips.id, packingSlipId));
  
  return { success: true };
}

// Update client shipping address by email (for CSV bulk import)
export async function updateClientShippingByEmail(
  email: string,
  shippingData: {
    shippingName?: string;
    shippingStreet?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingZip?: string;
    shippingCountry?: string;
    shippingPhone?: string;
  }
): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;
  
  // Find all protocols with this email
  const protocols = await database.select({ id: clientProtocols.id })
    .from(clientProtocols)
    .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${email})`);
  
  if (protocols.length === 0) return false;
  
  // Update all protocols with this email
  await database.update(clientProtocols)
    .set({
      shippingName: shippingData.shippingName || null,
      shippingStreet: shippingData.shippingStreet || null,
      shippingCity: shippingData.shippingCity || null,
      shippingState: shippingData.shippingState || null,
      shippingZip: shippingData.shippingZip || null,
      shippingCountry: shippingData.shippingCountry || null,
      shippingPhone: shippingData.shippingPhone || null,
    })
    .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${email})`);
  
  return true;
}


// Get orders by protocol ID (for client view)
export async function getOrdersByProtocolId(clientProtocolId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const orders = await database.select()
    .from(protocolOrders)
    .where(eq(protocolOrders.clientProtocolId, clientProtocolId))
    .orderBy(desc(protocolOrders.createdAt));
  
  return orders;
}


// Get protocols that need follow-up emails (sent but not approved after X days)
export async function getProtocolsNeedingFollowUp(daysAfterSent: number = 3, maxFollowUps: number = 3) {
  const database = await getDb();
  if (!database) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAfterSent);
  
  // Statuses that indicate the client has already progressed past needing a follow-up
  // (they've paid, are in fulfillment, etc.)
  const ADVANCED_ENROLLMENT_STATUSES = [
    'coaching_paid', 'intake_complete', 'discovery_scheduled', 'discovery_complete',
    'protocol_preparing', 'protocol_review', 'protocol_paid', 'launched', 'fulfillment',
    'shipped', 'delivered', 'training_scheduled', 'training_complete',
    'active', 'week3_review', 'month2', 'month3_final', 'completed', 'renewed'
  ];
  
  const result = await database
    .select({
      id: clientProtocols.id,
      clientName: clientProtocols.clientName,
      clientEmail: clientProtocols.clientEmail,
      accessToken: clientProtocols.accessToken,
      sentAt: clientProtocols.sentAt,
      lastFollowUpSentAt: clientProtocols.lastFollowUpSentAt,
      followUpCount: clientProtocols.followUpCount,
    })
    .from(clientProtocols)
    .where(
      and(
        isNotNull(clientProtocols.sentAt),
        isNotNull(clientProtocols.clientEmail),
        isNull(clientProtocols.approvedAt),
        isNull(clientProtocols.deletedAt),
        isNull(clientProtocols.archivedAt),
        sql`${clientProtocols.followUpCount} < ${maxFollowUps}`,
        // Either never sent follow-up, or last follow-up was more than daysAfterSent ago
        or(
          isNull(clientProtocols.lastFollowUpSentAt),
          sql`${clientProtocols.lastFollowUpSentAt} < ${cutoffDate}`
        ),
        // Original send was more than daysAfterSent ago
        sql`${clientProtocols.sentAt} < ${cutoffDate}`,
        // Exclude protocols linked to transformation enrollments that have already progressed
        // past the initial stages (paid, in fulfillment, etc.)
        sql`${clientProtocols.id} NOT IN (
          SELECT te.clientProtocolId FROM transformation_enrollments te
          WHERE te.clientProtocolId IS NOT NULL
            AND te.clientProtocolId > 0
            AND te.status IN (${sql.raw(ADVANCED_ENROLLMENT_STATUSES.map(s => `'${s}'`).join(','))})
        )`,
        // Also exclude protocols whose status is already 'approved', 'active', or 'completed'
        sql`${clientProtocols.status} NOT IN ('approved', 'active', 'completed')`
      )
    );
  
  return result;
}

// Update follow-up tracking after sending
export async function updateFollowUpTracking(protocolId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database
    .update(clientProtocols)
    .set({
      lastFollowUpSentAt: new Date(),
      followUpCount: sql`${clientProtocols.followUpCount} + 1`,
    })
    .where(eq(clientProtocols.id, protocolId));
}


// ============================================
// ONBOARDING WIZARD FUNCTIONS
// ============================================

// Get onboarding settings
export async function getOnboardingSettings() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database.select().from(onboardingSettings).limit(1);
  return result[0] || null;
}

// Update or create onboarding settings
export async function upsertOnboardingSettings(data: Partial<InsertOnboardingSettings>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const existing = await getOnboardingSettings();
  if (existing) {
    await database.update(onboardingSettings).set(data).where(eq(onboardingSettings.id, existing.id));
    return { ...existing, ...data };
  } else {
    const result = await database.insert(onboardingSettings).values(data as InsertOnboardingSettings);
    return { id: Number(result[0].insertId), ...data };
  }
}

// Get all onboarding categories
export async function getOnboardingCategories() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  return database.select().from(onboardingCategories).where(eq(onboardingCategories.isActive, true)).orderBy(onboardingCategories.sortOrder);
}

// Get all onboarding categories (including inactive) for admin
export async function getAllOnboardingCategories() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  return database.select().from(onboardingCategories).orderBy(onboardingCategories.sortOrder);
}

// Create onboarding category
export async function createOnboardingCategory(data: InsertOnboardingCategory) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database.insert(onboardingCategories).values(data);
  return { id: Number(result[0].insertId), ...data };
}

// Update onboarding category
export async function updateOnboardingCategory(id: number, data: Partial<InsertOnboardingCategory>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(onboardingCategories).set(data).where(eq(onboardingCategories.id, id));
}

// Delete onboarding category
export async function deleteOnboardingCategory(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Also delete all options in this category
  await database.delete(onboardingOptions).where(eq(onboardingOptions.categoryId, id));
  await database.delete(onboardingCategories).where(eq(onboardingCategories.id, id));
}

// Get all onboarding options
export async function getOnboardingOptions() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  return database.select().from(onboardingOptions).where(eq(onboardingOptions.isActive, true)).orderBy(onboardingOptions.sortOrder);
}

// Get all onboarding options (including inactive) for admin
export async function getAllOnboardingOptions() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  return database.select().from(onboardingOptions).orderBy(onboardingOptions.sortOrder);
}

// Get options by category
export async function getOnboardingOptionsByCategory(categoryId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  return database.select().from(onboardingOptions).where(and(eq(onboardingOptions.categoryId, categoryId), eq(onboardingOptions.isActive, true))).orderBy(onboardingOptions.sortOrder);
}

// Create onboarding option
export async function createOnboardingOption(data: InsertOnboardingOption) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database.insert(onboardingOptions).values(data);
  return { id: Number(result[0].insertId), ...data };
}

// Update onboarding option
export async function updateOnboardingOption(id: number, data: Partial<InsertOnboardingOption>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(onboardingOptions).set(data).where(eq(onboardingOptions.id, id));
}

// Delete onboarding option
export async function deleteOnboardingOption(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.delete(onboardingOptions).where(eq(onboardingOptions.id, id));
}

// Get user onboarding status
export async function getUserOnboardingStatus(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database.select().from(userOnboardingStatus).where(eq(userOnboardingStatus.userId, userId)).limit(1);
  return result[0] || null;
}

// Update or create user onboarding status
export async function upsertUserOnboardingStatus(userId: number, data: Partial<InsertUserOnboardingStatus>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const existing = await getUserOnboardingStatus(userId);
  if (existing) {
    await database.update(userOnboardingStatus).set(data).where(eq(userOnboardingStatus.userId, userId));
    return { ...existing, ...data };
  } else {
    const result = await database.insert(userOnboardingStatus).values({ userId, ...data } as InsertUserOnboardingStatus);
    return { id: Number(result[0].insertId), userId, ...data };
  }
}

// Mark user onboarding as complete
export async function completeUserOnboarding(userId: number, selectedOptionIds: number[]) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  return upsertUserOnboardingStatus(userId, {
    hasCompletedOnboarding: true,
    selectedOptionIds: JSON.stringify(selectedOptionIds),
    completedAt: new Date(),
    lastViewedAt: new Date(),
  });
}

// Update last viewed timestamp
export async function updateOnboardingLastViewed(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  return upsertUserOnboardingStatus(userId, {
    lastViewedAt: new Date(),
  });
}

// Get full onboarding data (settings + categories + options)
export async function getFullOnboardingData() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const settings = await getOnboardingSettings();
  const categoriesData = await getOnboardingCategories();
  const optionsData = await getOnboardingOptions();
  
  // Group options by category
  const categoriesWithOptions = categoriesData.map(cat => ({
    ...cat,
    options: optionsData.filter(opt => opt.categoryId === cat.id),
  }));
  
  return {
    settings,
    categories: categoriesWithOptions,
    options: optionsData, // Also return flat options array
  };
}


// Get user onboarding status with full option details
export async function getUserOnboardingStatusWithOptions(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const status = await getUserOnboardingStatus(userId);
  if (!status) return null;
  
  // Parse selected option IDs and fetch full option details
  let selectedOptions: any[] = [];
  if (status.selectedOptionIds) {
    try {
      const optionIds = JSON.parse(status.selectedOptionIds) as number[];
      if (optionIds.length > 0) {
        const allOptions = await getOnboardingOptions();
        selectedOptions = allOptions.filter(opt => optionIds.includes(opt.id));
      }
    } catch (e) {
      console.error('Error parsing selectedOptionIds:', e);
    }
  }
  
  return {
    ...status,
    selectedOptions,
  };
}


// Get all unique tags used across all client protocols
export async function getAllClientProtocolTags(): Promise<string[]> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const protocols = await database
    .select({ tags: clientProtocols.tags })
    .from(clientProtocols)
    .where(isNotNull(clientProtocols.tags));
  
  const allTags = new Set<string>();
  
  for (const protocol of protocols) {
    if (protocol.tags) {
      try {
        const tags = JSON.parse(protocol.tags) as string[];
        tags.forEach(tag => allTags.add(tag));
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
  
  return Array.from(allTags).sort();
}


// Get all template items across all templates (for sync status checking)
export async function getAllTemplateItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templateItems);
}


// ============ BACK-OFFICE CLIENT PROJECT MANAGEMENT ============

// Lifecycle Stages
export async function getAllLifecycleStages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lifecycleStages).orderBy(lifecycleStages.sortOrder);
}

export async function getLifecycleStageById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(lifecycleStages).where(eq(lifecycleStages.id, id));
  return results[0] || null;
}

export async function createLifecycleStage(data: Omit<InsertLifecycleStage, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(lifecycleStages).values(data);
  return result[0].insertId;
}

export async function updateLifecycleStage(id: number, data: Partial<InsertLifecycleStage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(lifecycleStages).set(data).where(eq(lifecycleStages.id, id));
}

export async function deleteLifecycleStage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(lifecycleStages).where(eq(lifecycleStages.id, id));
}

// Team Roles
export async function getAllTeamRoles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamRoles).orderBy(teamRoles.sortOrder);
}

export async function createTeamRole(data: Omit<InsertTeamRole, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teamRoles).values(data);
  return result[0].insertId;
}

// Team Members
export async function getAllTeamMembers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamMembers).orderBy(teamMembers.name);
}

export async function getTeamMemberById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
  return results[0] || null;
}

export async function createTeamMember(data: Omit<InsertTeamMember, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teamMembers).values(data);
  return result[0].insertId;
}

export async function updateTeamMember(id: number, data: Partial<InsertTeamMember>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teamMembers).set(data).where(eq(teamMembers.id, id));
}

// Workflow Templates
export async function getAllWorkflowTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowTemplates).where(eq(workflowTemplates.isActive, 1)).orderBy(workflowTemplates.name);
}

export async function getWorkflowTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(workflowTemplates).where(eq(workflowTemplates.id, id));
  return results[0] || null;
}

export async function createWorkflowTemplate(data: Omit<InsertWorkflowTemplate, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workflowTemplates).values(data);
  return result[0].insertId;
}

export async function updateWorkflowTemplate(id: number, data: Partial<InsertWorkflowTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workflowTemplates).set(data).where(eq(workflowTemplates.id, id));
}

export async function deleteWorkflowTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Get all tasks for this template
  const tasks = await db.select().from(workflowTemplateTasks).where(eq(workflowTemplateTasks.workflowTemplateId, id));
  // Delete all subtasks for each task
  for (const task of tasks) {
    await db.delete(workflowTemplateSubtasks).where(eq(workflowTemplateSubtasks.workflowTemplateTaskId, task.id));
  }
  // Delete all tasks
  await db.delete(workflowTemplateTasks).where(eq(workflowTemplateTasks.workflowTemplateId, id));
  // Delete the template
  await db.delete(workflowTemplates).where(eq(workflowTemplates.id, id));
}

// Workflow Template Tasks
export async function getWorkflowTemplateTasks(workflowTemplateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowTemplateTasks)
    .where(eq(workflowTemplateTasks.workflowTemplateId, workflowTemplateId))
    .orderBy(workflowTemplateTasks.sortOrder);
}

export async function createWorkflowTemplateTask(data: Omit<InsertWorkflowTemplateTask, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workflowTemplateTasks).values(data);
  return result[0].insertId;
}

export async function updateWorkflowTemplateTask(id: number, data: Partial<InsertWorkflowTemplateTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workflowTemplateTasks).set(data).where(eq(workflowTemplateTasks.id, id));
}

export async function deleteWorkflowTemplateTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all subtasks first
  await db.delete(workflowTemplateSubtasks).where(eq(workflowTemplateSubtasks.workflowTemplateTaskId, id));
  // Then delete the task
  await db.delete(workflowTemplateTasks).where(eq(workflowTemplateTasks.id, id));
}

// Workflow Template Subtasks
export async function getWorkflowTemplateSubtasks(workflowTemplateTaskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowTemplateSubtasks)
    .where(eq(workflowTemplateSubtasks.workflowTemplateTaskId, workflowTemplateTaskId))
    .orderBy(workflowTemplateSubtasks.sortOrder);
}

export async function createWorkflowTemplateSubtask(data: Omit<InsertWorkflowTemplateSubtask, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workflowTemplateSubtasks).values(data);
  return result[0].insertId;
}

// Client Projects
export async function getAllClientProjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientProjects).orderBy(desc(clientProjects.createdAt));
}

export async function getClientProjectById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(clientProjects).where(eq(clientProjects.id, id));
  return results[0] || null;
}

export async function getClientProjectsByStatus(status: "active" | "on_hold" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientProjects)
    .where(eq(clientProjects.status, status))
    .orderBy(desc(clientProjects.createdAt));
}

export async function getClientProjectsByLifecycleStage(stageId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientProjects)
    .where(eq(clientProjects.currentLifecycleStageId, stageId))
    .orderBy(desc(clientProjects.createdAt));
}

export async function getClientProjectsByTeamMember(teamMemberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientProjects)
    .where(eq(clientProjects.assignedTeamMemberId, teamMemberId))
    .orderBy(desc(clientProjects.createdAt));
}

export async function getClientProjects(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get all protocols for this client, then find projects linked to those protocols
  const protocols = await db.select({ id: clientProtocols.id }).from(clientProtocols)
    .where(eq(clientProtocols.clientId, clientId));
  if (protocols.length === 0) return [];
  const protocolIds = protocols.map(p => p.id);
  return db.select().from(clientProjects)
    .where(inArray(clientProjects.clientProtocolId, protocolIds))
    .orderBy(desc(clientProjects.createdAt));
}

export async function createClientProject(data: Omit<InsertClientProject, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clientProjects).values(data);
  return result[0].insertId;
}

export async function updateClientProject(id: number, data: Partial<InsertClientProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientProjects).set(data).where(eq(clientProjects.id, id));
}

export async function deleteClientProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related data first
  await db.delete(projectActivityLog).where(eq(projectActivityLog.clientProjectId, id));
  await db.delete(projectNotes).where(eq(projectNotes.clientProjectId, id));
  // Delete subtasks for all tasks
  const tasks = await db.select().from(projectTasks).where(eq(projectTasks.clientProjectId, id));
  for (const task of tasks) {
    await db.delete(projectSubtasks).where(eq(projectSubtasks.projectTaskId, task.id));
  }
  await db.delete(projectTasks).where(eq(projectTasks.clientProjectId, id));
  await db.delete(clientProjects).where(eq(clientProjects.id, id));
}

// Project Tasks
export async function getProjectTasks(clientProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectTasks)
    .where(eq(projectTasks.clientProjectId, clientProjectId))
    .orderBy(projectTasks.sortOrder);
}

export async function getProjectTaskById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
  return results[0] || null;
}

export async function createProjectTask(data: Omit<InsertProjectTask, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectTasks).values(data);
  return result[0].insertId;
}

export async function updateProjectTask(id: number, data: Partial<InsertProjectTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectTasks).set(data).where(eq(projectTasks.id, id));
}

export async function deleteProjectTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectSubtasks).where(eq(projectSubtasks.projectTaskId, id));
  await db.delete(projectTasks).where(eq(projectTasks.id, id));
}

// Project Subtasks
export async function getProjectSubtasks(projectTaskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectSubtasks)
    .where(eq(projectSubtasks.projectTaskId, projectTaskId))
    .orderBy(projectSubtasks.sortOrder);
}

export async function getProjectSubtaskById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(projectSubtasks).where(eq(projectSubtasks.id, id));
  return results[0] || null;
}

export async function createProjectSubtask(data: Omit<InsertProjectSubtask, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectSubtasks).values(data);
  return result[0].insertId;
}

export async function updateProjectSubtask(id: number, data: Partial<InsertProjectSubtask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectSubtasks).set(data).where(eq(projectSubtasks.id, id));
}

export async function deleteProjectSubtask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectSubtasks).where(eq(projectSubtasks.id, id));
}

// Project Notes
export async function getProjectNotes(clientProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectNotes)
    .where(eq(projectNotes.clientProjectId, clientProjectId))
    .orderBy(desc(projectNotes.createdAt));
}

export async function createProjectNote(data: Omit<InsertProjectNote, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectNotes).values(data);
  return result[0].insertId;
}

export async function updateProjectNote(id: number, data: Partial<InsertProjectNote>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectNotes).set(data).where(eq(projectNotes.id, id));
}

export async function deleteProjectNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectNotes).where(eq(projectNotes.id, id));
}

// Project Activity Log
export async function getProjectActivityLog(clientProjectId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectActivityLog)
    .where(eq(projectActivityLog.clientProjectId, clientProjectId))
    .orderBy(desc(projectActivityLog.createdAt))
    .limit(limit);
}

export async function createProjectActivityLog(data: Omit<InsertProjectActivityLog, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectActivityLog).values(data);
  return result[0].insertId;
}

// Apply workflow template to a client project
export async function applyWorkflowTemplateToProject(clientProjectId: number, workflowTemplateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // DEDUP GUARD: Skip if project already has tasks to prevent duplicates
  const existingTasks = await getProjectTasks(clientProjectId);
  if (existingTasks.length > 0) {
    console.log(`[WorkflowTemplate] Skipping project ${clientProjectId} — already has ${existingTasks.length} tasks`);
    // Still update the template reference if not set
    await updateClientProject(clientProjectId, { workflowTemplateId });
    return;
  }
  
  // Get all template tasks
  const templateTasks = await getWorkflowTemplateTasks(workflowTemplateId);
  
  for (const templateTask of templateTasks) {
    // Create project task from template task
    const taskId = await createProjectTask({
      clientProjectId,
      lifecycleStageId: templateTask.lifecycleStageId,
      name: templateTask.name,
      description: templateTask.description,
      sortOrder: templateTask.sortOrder,
      isRequired: templateTask.isRequired,
    });
    
    // Get and create subtasks
    const templateSubtasks = await getWorkflowTemplateSubtasks(templateTask.id);
    for (const templateSubtask of templateSubtasks) {
      await createProjectSubtask({
        projectTaskId: taskId,
        name: templateSubtask.name,
        description: templateSubtask.description,
        sortOrder: templateSubtask.sortOrder,
        isRequired: templateSubtask.isRequired,
        assignedTeamMemberId: templateSubtask.defaultAssignedTeamMemberId ?? undefined,
      });
    }
  }
  
  // Update project with workflow template reference
  await updateClientProject(clientProjectId, { workflowTemplateId });
}

// Get project progress statistics
export async function getProjectProgress(clientProjectId: number) {
  const db = await getDb();
  if (!db) return { totalTasks: 0, completedTasks: 0, totalSubtasks: 0, completedSubtasks: 0 };
  
  const tasks = await getProjectTasks(clientProjectId);
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  
  for (const task of tasks) {
    const subtasks = await getProjectSubtasks(task.id);
    totalSubtasks += subtasks.length;
    completedSubtasks += subtasks.filter(s => s.status === "completed").length;
  }
  
  return {
    totalTasks: tasks.length,
    completedTasks,
    totalSubtasks,
    completedSubtasks,
    taskProgress: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
    subtaskProgress: totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0,
  };
}

// Get all projects with their progress for dashboard
export async function getAllClientProjectsWithProgress() {
  const db = await getDb();
  if (!db) return [];
  
  const projects = await getAllClientProjects();
  const projectsWithProgress = [];
  
  for (const project of projects) {
    const progress = await getProjectProgress(project.id);
    projectsWithProgress.push({
      ...project,
      progress,
    });
  }
  
  return projectsWithProgress;
}


// Seed default workflow templates
export async function seedDefaultWorkflowTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Define lifecycle stages
  const lifecycleStagesData = [
    { name: 'Intake', description: 'Initial client intake and information gathering', color: '#6366F1', sortOrder: 1 },
    { name: 'Consult', description: 'Initial consultation and assessment', color: '#8B5CF6', sortOrder: 2 },
    { name: 'Protocol Build', description: 'Building and customizing the client protocol', color: '#EC4899', sortOrder: 3 },
    { name: 'Billing', description: 'Invoice generation and payment processing', color: '#F59E0B', sortOrder: 4 },
    { name: 'Fulfillment', description: 'Order preparation and shipping', color: '#10B981', sortOrder: 5 },
    { name: 'Onboarding', description: 'Client onboarding and education', color: '#06B6D4', sortOrder: 6 },
    { name: 'Active Protocol', description: 'Active protocol monitoring and support', color: '#3B82F6', sortOrder: 7 },
    { name: 'Completion', description: 'Protocol completion and follow-up', color: '#22C55E', sortOrder: 8 },
  ];

  // Insert lifecycle stages
  const stageMap: Record<string, number> = {};
  for (const stage of lifecycleStagesData) {
    const existing = await db.select().from(lifecycleStages).where(eq(lifecycleStages.name, stage.name));
    if (existing.length === 0) {
      const result = await db.insert(lifecycleStages).values(stage);
      stageMap[stage.name] = result[0].insertId;
    } else {
      stageMap[stage.name] = existing[0].id;
    }
  }

  // Define team roles
  const teamRolesData = [
    { name: 'Client Care', description: 'Client communication and support', color: '#6366F1', sortOrder: 1 },
    { name: 'Practitioner', description: 'Clinical and protocol decisions', color: '#8B5CF6', sortOrder: 2 },
    { name: 'Operations', description: 'Operational coordination', color: '#EC4899', sortOrder: 3 },
    { name: 'Shipping/Vendor', description: 'Fulfillment and vendor coordination', color: '#10B981', sortOrder: 4 },
    { name: 'Automation/CRM', description: 'System automation and CRM management', color: '#F59E0B', sortOrder: 5 },
  ];

  // Insert team roles
  const roleMap: Record<string, number> = {};
  for (const role of teamRolesData) {
    const existing = await db.select().from(teamRoles).where(eq(teamRoles.name, role.name));
    if (existing.length === 0) {
      const result = await db.insert(teamRoles).values(role);
      roleMap[role.name] = result[0].insertId;
    } else {
      roleMap[role.name] = existing[0].id;
    }
  }

  // Define 90-Day Protocol template tasks
  const template90DayTasks = [
    { stage: 'Intake', name: 'Initial Contact & Qualification', description: 'First contact with potential client and qualification', dueDaysFromStart: 1, role: 'Client Care',
      subtasks: ['Receive inquiry/application', 'Send welcome email', 'Schedule strategy session', 'Send intake forms'] },
    { stage: 'Intake', name: 'Document Collection', description: 'Gather all required client documents', dueDaysFromStart: 3, role: 'Client Care',
      subtasks: ['Collect health history form', 'Collect signed waivers', 'Collect lab results (if available)', 'Verify contact information'] },
    { stage: 'Consult', name: 'Strategy Session', description: 'Initial consultation to assess client needs', dueDaysFromStart: 5, role: 'Practitioner',
      subtasks: ['Review intake documents', 'Conduct strategy session', 'Document client goals', 'Assess current health status', 'Determine protocol fit'] },
    { stage: 'Consult', name: 'Lab Review (if applicable)', description: 'Review and interpret lab results', dueDaysFromStart: 7, role: 'Practitioner',
      subtasks: ['Review lab results', 'Identify optimization opportunities', 'Document recommendations'] },
    { stage: 'Protocol Build', name: 'Protocol Design', description: 'Create customized protocol for client', dueDaysFromStart: 10, role: 'Practitioner',
      subtasks: ['Select base template', 'Customize peptide stack', 'Set dosing schedule', 'Add supplements', 'Add lifestyle notes', 'Review for contraindications'] },
    { stage: 'Protocol Build', name: 'Protocol Review & Approval', description: 'Client reviews and approves protocol', dueDaysFromStart: 12, role: 'Client Care',
      subtasks: ['Send protocol for review', 'Schedule protocol walkthrough', 'Answer client questions', 'Obtain client approval'] },
    { stage: 'Billing', name: 'Invoice & Payment', description: 'Generate invoice and process payment', dueDaysFromStart: 14, role: 'Operations',
      subtasks: ['Generate invoice', 'Send invoice to client', 'Process payment', 'Send payment confirmation'] },
    { stage: 'Fulfillment', name: 'Order Preparation', description: 'Prepare client order for shipping', dueDaysFromStart: 16, role: 'Shipping/Vendor',
      subtasks: ['Create packing slip', 'Pull inventory items', 'Quality check', 'Package order', 'Generate shipping label'] },
    { stage: 'Fulfillment', name: 'Shipping & Delivery', description: 'Ship order and confirm delivery', dueDaysFromStart: 18, role: 'Shipping/Vendor',
      subtasks: ['Ship order', 'Send tracking info', 'Monitor delivery', 'Confirm delivery'] },
    { stage: 'Onboarding', name: 'Client Onboarding', description: 'Educate client on protocol execution', dueDaysFromStart: 20, role: 'Client Care',
      subtasks: ['Send welcome kit', 'Schedule onboarding call', 'Conduct onboarding session', 'Provide support resources', 'Set up tracking app'] },
    { stage: 'Onboarding', name: 'First Week Check-in', description: 'Ensure smooth protocol start', dueDaysFromStart: 25, role: 'Client Care',
      subtasks: ['Send check-in message', 'Address any issues', 'Confirm protocol adherence', 'Document feedback'] },
    { stage: 'Active Protocol', name: 'Week 2-4 Monitoring', description: 'Early protocol monitoring and support', dueDaysFromStart: 30, role: 'Client Care',
      subtasks: ['Bi-weekly check-in', 'Monitor for side effects', 'Adjust protocol if needed', 'Encourage tracking'] },
    { stage: 'Active Protocol', name: 'Month 2 Review', description: 'Mid-protocol assessment', dueDaysFromStart: 60, role: 'Practitioner',
      subtasks: ['Review progress metrics', 'Conduct check-in call', 'Evaluate protocol effectiveness', 'Make adjustments', 'Plan for completion'] },
    { stage: 'Active Protocol', name: 'Ongoing Support', description: 'Continuous client support throughout protocol', dueDaysFromStart: 75, role: 'Client Care',
      subtasks: ['Weekly check-ins', 'Answer questions', 'Provide motivation', 'Document progress'] },
    { stage: 'Completion', name: 'Protocol Completion', description: 'Wrap up 90-day protocol', dueDaysFromStart: 90, role: 'Practitioner',
      subtasks: ['Final progress review', 'Conduct completion call', 'Document results', 'Collect testimonial', 'Discuss next steps'] },
    { stage: 'Completion', name: 'Follow-up & Retention', description: 'Post-protocol follow-up', dueDaysFromStart: 95, role: 'Client Care',
      subtasks: ['Send completion certificate', 'Present continuation options', 'Request referrals', 'Schedule follow-up'] },
  ];

  // Check if 90-Day template exists
  const existing90Day = await db.select().from(workflowTemplates).where(eq(workflowTemplates.name, '90-Day Protocol'));
  let template90DayId: number;
  if (existing90Day.length === 0) {
    const result = await db.insert(workflowTemplates).values({
      name: '90-Day Protocol',
      description: 'Standard 90-day health optimization protocol workflow',
      durationDays: 90,
      isDefault: true,
    });
    template90DayId = result[0].insertId;
  } else {
    template90DayId = existing90Day[0].id;
  }

  // Insert 90-day tasks and subtasks
  let taskOrder = 0;
  for (const task of template90DayTasks) {
    const stageId = stageMap[task.stage];
    const roleId = roleMap[task.role] || null;
    
    const existingTask = await db.select().from(workflowTemplateTasks)
      .where(and(
        eq(workflowTemplateTasks.workflowTemplateId, template90DayId),
        eq(workflowTemplateTasks.name, task.name)
      ));
    
    let taskId: number;
    if (existingTask.length === 0) {
      const taskResult = await db.insert(workflowTemplateTasks).values({
        workflowTemplateId: template90DayId,
        lifecycleStageId: stageId,
        name: task.name,
        description: task.description,
        defaultOwnerRoleId: roleId,
        dueDaysFromStart: task.dueDaysFromStart,
        sortOrder: taskOrder,
      });
      taskId = taskResult[0].insertId;
    } else {
      taskId = existingTask[0].id;
    }
    taskOrder++;
    
    // Insert subtasks
    let subtaskOrder = 0;
    for (const subtaskName of task.subtasks) {
      const existingSubtask = await db.select().from(workflowTemplateSubtasks)
        .where(and(
          eq(workflowTemplateSubtasks.workflowTemplateTaskId, taskId),
          eq(workflowTemplateSubtasks.name, subtaskName)
        ));
      
      if (existingSubtask.length === 0) {
        await db.insert(workflowTemplateSubtasks).values({
          workflowTemplateTaskId: taskId,
          name: subtaskName,
          sortOrder: subtaskOrder,
        });
      }
      subtaskOrder++;
    }
  }

  // Define 12-Month template tasks
  const template12MonthTasks = [
    { stage: 'Intake', name: 'Application & Qualification', description: 'Application review and client qualification', dueDaysFromStart: 1, role: 'Client Care',
      subtasks: ['Review application', 'Send welcome package', 'Schedule qualification call', 'Send comprehensive intake forms'] },
    { stage: 'Intake', name: 'Comprehensive Document Collection', description: 'Gather all required documentation', dueDaysFromStart: 5, role: 'Client Care',
      subtasks: ['Collect detailed health history', 'Collect all waivers and agreements', 'Request recent lab work', 'Collect lifestyle assessment', 'Verify payment method'] },
    { stage: 'Consult', name: 'Comprehensive Consultation', description: 'In-depth initial consultation', dueDaysFromStart: 10, role: 'Practitioner',
      subtasks: ['Review all intake documents', 'Conduct 90-minute consultation', 'Establish baseline metrics', 'Set 12-month goals', 'Create phased approach'] },
    { stage: 'Consult', name: 'Lab Analysis & Recommendations', description: 'Comprehensive lab review', dueDaysFromStart: 14, role: 'Practitioner',
      subtasks: ['Analyze comprehensive labs', 'Identify optimization priorities', 'Create supplement protocol', 'Design Phase 1 peptide stack', 'Document long-term strategy'] },
    { stage: 'Protocol Build', name: 'Phase 1 Protocol Design (Q1)', description: 'Build first quarter protocol', dueDaysFromStart: 18, role: 'Practitioner',
      subtasks: ['Design Q1 peptide protocol', 'Set Q1 supplement stack', 'Create lifestyle recommendations', 'Define Q1 success metrics', 'Prepare client education materials'] },
    { stage: 'Protocol Build', name: 'Protocol Presentation & Approval', description: 'Present and approve full program', dueDaysFromStart: 21, role: 'Client Care',
      subtasks: ['Schedule protocol presentation', 'Present 12-month roadmap', 'Review Phase 1 in detail', 'Address questions and concerns', 'Obtain program commitment'] },
    { stage: 'Billing', name: 'Program Enrollment & Payment', description: 'Process enrollment and payment', dueDaysFromStart: 25, role: 'Operations',
      subtasks: ['Generate program invoice', 'Set up payment schedule', 'Process initial payment', 'Send enrollment confirmation', 'Set up recurring billing'] },
    { stage: 'Fulfillment', name: 'Phase 1 Order Preparation', description: 'Prepare Q1 supplies', dueDaysFromStart: 28, role: 'Shipping/Vendor',
      subtasks: ['Generate Q1 packing list', 'Pull inventory', 'Quality assurance check', 'Package with care instructions', 'Generate shipping label'] },
    { stage: 'Fulfillment', name: 'Phase 1 Shipping', description: 'Ship Q1 supplies', dueDaysFromStart: 30, role: 'Shipping/Vendor',
      subtasks: ['Ship order', 'Send tracking information', 'Monitor delivery', 'Confirm receipt'] },
    { stage: 'Onboarding', name: 'Comprehensive Onboarding', description: 'Full program onboarding', dueDaysFromStart: 33, role: 'Client Care',
      subtasks: ['Send elite welcome kit', 'Schedule onboarding session', 'Conduct hands-on training', 'Set up all tracking tools', 'Introduce support team', 'Grant community access'] },
    { stage: 'Onboarding', name: 'First Week Elite Support', description: 'Intensive first week support', dueDaysFromStart: 40, role: 'Client Care',
      subtasks: ['Daily check-ins', 'Address any issues immediately', 'Verify protocol adherence', 'Celebrate first week completion'] },
    { stage: 'Active Protocol', name: 'Q1 Active Monitoring (Days 30-90)', description: 'First quarter active support', dueDaysFromStart: 90, role: 'Client Care',
      subtasks: ['Weekly check-ins', 'Bi-weekly coaching calls', 'Monitor progress metrics', 'Adjust protocol as needed', 'Prepare Q1 review'] },
    { stage: 'Active Protocol', name: 'Q1 Review & Q2 Planning', description: 'End of Q1 assessment and Q2 prep', dueDaysFromStart: 95, role: 'Practitioner',
      subtasks: ['Conduct Q1 review call', 'Analyze Q1 results', 'Design Q2 protocol', 'Order Q2 supplies', 'Set Q2 goals'] },
    { stage: 'Active Protocol', name: 'Q2 Active Monitoring (Days 91-180)', description: 'Second quarter active support', dueDaysFromStart: 180, role: 'Client Care',
      subtasks: ['Weekly check-ins', 'Bi-weekly coaching calls', 'Mid-program labs', 'Monitor progress metrics', 'Prepare Q2 review'] },
    { stage: 'Active Protocol', name: 'Q2 Review & Q3 Planning', description: 'Mid-year assessment and Q3 prep', dueDaysFromStart: 185, role: 'Practitioner',
      subtasks: ['Conduct mid-year review', 'Analyze lab results', 'Design Q3 protocol', 'Order Q3 supplies', 'Adjust long-term strategy'] },
    { stage: 'Active Protocol', name: 'Q3 Active Monitoring (Days 181-270)', description: 'Third quarter active support', dueDaysFromStart: 270, role: 'Client Care',
      subtasks: ['Weekly check-ins', 'Bi-weekly coaching calls', 'Monitor progress metrics', 'Prepare Q3 review'] },
    { stage: 'Active Protocol', name: 'Q3 Review & Q4 Planning', description: 'Q3 assessment and final quarter prep', dueDaysFromStart: 275, role: 'Practitioner',
      subtasks: ['Conduct Q3 review call', 'Analyze Q3 results', 'Design Q4 protocol', 'Order Q4 supplies', 'Plan completion strategy'] },
    { stage: 'Active Protocol', name: 'Q4 Active Monitoring (Days 271-365)', description: 'Final quarter active support', dueDaysFromStart: 350, role: 'Client Care',
      subtasks: ['Weekly check-ins', 'Bi-weekly coaching calls', 'Final labs', 'Monitor progress metrics', 'Prepare completion review'] },
    { stage: 'Completion', name: 'Program Completion', description: 'Complete 12-month program', dueDaysFromStart: 365, role: 'Practitioner',
      subtasks: ['Conduct final review call', 'Analyze final lab results', 'Document transformation', 'Create maintenance protocol', 'Collect detailed testimonial'] },
    { stage: 'Completion', name: 'Alumni Transition', description: 'Transition to alumni program', dueDaysFromStart: 370, role: 'Client Care',
      subtasks: ['Present alumni options', 'Send completion certificate', 'Invite to alumni community', 'Request referrals', 'Schedule 30-day follow-up'] },
  ];

  // Check if 12-Month template exists
  const existing12Month = await db.select().from(workflowTemplates).where(eq(workflowTemplates.name, '12-Month Ultimate Omega Program'));
  let template12MonthId: number;
  if (existing12Month.length === 0) {
    const result = await db.insert(workflowTemplates).values({
      name: '12-Month Ultimate Omega Program',
      description: 'Comprehensive 12-month elite optimization program workflow',
      durationDays: 365,
      isDefault: false,
    });
    template12MonthId = result[0].insertId;
  } else {
    template12MonthId = existing12Month[0].id;
  }

  // Insert 12-month tasks and subtasks
  taskOrder = 0;
  for (const task of template12MonthTasks) {
    const stageId = stageMap[task.stage];
    const roleId = roleMap[task.role] || null;
    
    const existingTask = await db.select().from(workflowTemplateTasks)
      .where(and(
        eq(workflowTemplateTasks.workflowTemplateId, template12MonthId),
        eq(workflowTemplateTasks.name, task.name)
      ));
    
    let taskId: number;
    if (existingTask.length === 0) {
      const taskResult = await db.insert(workflowTemplateTasks).values({
        workflowTemplateId: template12MonthId,
        lifecycleStageId: stageId,
        name: task.name,
        description: task.description,
        defaultOwnerRoleId: roleId,
        dueDaysFromStart: task.dueDaysFromStart,
        sortOrder: taskOrder,
      });
      taskId = taskResult[0].insertId;
    } else {
      taskId = existingTask[0].id;
    }
    taskOrder++;
    
    // Insert subtasks
    let subtaskOrder = 0;
    for (const subtaskName of task.subtasks) {
      const existingSubtask = await db.select().from(workflowTemplateSubtasks)
        .where(and(
          eq(workflowTemplateSubtasks.workflowTemplateTaskId, taskId),
          eq(workflowTemplateSubtasks.name, subtaskName)
        ));
      
      if (existingSubtask.length === 0) {
        await db.insert(workflowTemplateSubtasks).values({
          workflowTemplateTaskId: taskId,
          name: subtaskName,
          sortOrder: subtaskOrder,
        });
      }
      subtaskOrder++;
    }
  }

  return {
    lifecycleStages: Object.keys(stageMap).length,
    teamRoles: Object.keys(roleMap).length,
    templates: 2,
    template90DayId,
    template12MonthId,
  };
}


// Get all project tasks (for calendar view)
export async function getAllProjectTasks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectTasks).orderBy(projectTasks.dueDate);
}


// ============ TEAM NOTIFICATIONS ============

export async function createTeamNotification(data: Omit<InsertTeamNotification, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teamNotifications).values(data);
  return result[0].insertId;
}

export async function getTeamNotificationsForMember(teamMemberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamNotifications)
    .where(eq(teamNotifications.teamMemberId, teamMemberId))
    .orderBy(desc(teamNotifications.createdAt))
    .limit(100);
}

export async function getUnreadTeamNotificationCount(teamMemberId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(teamNotifications)
    .where(and(
      eq(teamNotifications.teamMemberId, teamMemberId),
      eq(teamNotifications.isRead, false)
    ));
  return result[0]?.count || 0;
}

export async function markTeamNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teamNotifications).set({ isRead: true }).where(eq(teamNotifications.id, notificationId));
}

export async function markAllTeamNotificationsAsRead(teamMemberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teamNotifications).set({ isRead: true }).where(eq(teamNotifications.teamMemberId, teamMemberId));
}

// Get overdue tasks for notification checking
export async function getOverdueTasks() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(projectTasks)
    .where(and(
      lte(projectTasks.dueDate, now),
      or(
        eq(projectTasks.status, "pending"),
        eq(projectTasks.status, "in_progress")
      )
    ));
}

// Get tasks approaching deadline (within 24 hours)
export async function getTasksApproachingDeadline() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return db.select().from(projectTasks)
    .where(and(
      gt(projectTasks.dueDate, now),
      lte(projectTasks.dueDate, tomorrow),
      or(
        eq(projectTasks.status, "pending"),
        eq(projectTasks.status, "in_progress")
      )
    ));
}

// Notify team member of task assignment
export async function notifyTaskAssignment(taskId: number, teamMemberId: number, taskName: string, projectId: number) {
  return createTeamNotification({
    teamMemberId,
    type: "task_assigned",
    title: "New Task Assigned",
    message: `You have been assigned to task: ${taskName}`,
    clientProjectId: projectId,
    projectTaskId: taskId,
  });
}

// Notify team member of overdue task
export async function notifyTaskOverdue(taskId: number, teamMemberId: number, taskName: string, projectId: number) {
  return createTeamNotification({
    teamMemberId,
    type: "task_overdue",
    title: "Task Overdue",
    message: `Task "${taskName}" is now overdue`,
    clientProjectId: projectId,
    projectTaskId: taskId,
  });
}

// Notify team member of approaching deadline
export async function notifyDeadlineApproaching(taskId: number, teamMemberId: number, taskName: string, projectId: number) {
  return createTeamNotification({
    teamMemberId,
    type: "deadline_approaching",
    title: "Deadline Approaching",
    message: `Task "${taskName}" is due within 24 hours`,
    clientProjectId: projectId,
    projectTaskId: taskId,
  });
}

// Update workflow template subtask
export async function updateWorkflowTemplateSubtask(id: number, data: Partial<InsertWorkflowTemplateSubtask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workflowTemplateSubtasks).set(data).where(eq(workflowTemplateSubtasks.id, id));
}

// Delete workflow template subtask
export async function deleteWorkflowTemplateSubtask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workflowTemplateSubtasks).where(eq(workflowTemplateSubtasks.id, id));
}


// ============ HEALTHIE INVOICE FUNCTIONS ============

// Healthie invoice functions removed - integration deprecated (no license)


// PayPal Orders
export async function createPayPalOrder(data: {
  paypalOrderId: string;
  clientProtocolId: number | string;
  amount: string;
  currency: string;
  status: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const clientProtocolId = typeof data.clientProtocolId === 'string' ? parseInt(data.clientProtocolId) : data.clientProtocolId;
  const result = await db.insert(paypalOrders).values({
    paypalOrderId: data.paypalOrderId,
    clientProtocolId: clientProtocolId,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
  });
  return result;
}

export async function getPayPalOrder(paypalOrderId: string) {
  const db = await getDb();
  if (!db) return null;
  return (db.query as any).paypalOrders.findFirst({
    where: eq(paypalOrders.paypalOrderId, paypalOrderId),
  });
}

export async function getPayPalOrderByProtocolId(clientProtocolId: number) {
  const db = await getDb();
  if (!db) return null;
  return (db.query as any).paypalOrders.findFirst({
    where: eq(paypalOrders.clientProtocolId, clientProtocolId),
    orderBy: (paypalOrders: any, { desc }: any) => [desc(paypalOrders.completedAt)],
  });
}

export async function updatePayPalOrder(data: {
  paypalOrderId: string;
  status: string;
  payerEmail?: string;
  payerName?: string;
  transactionId?: string;
  grossAmount?: number | null;
  feeAmount?: number | null;
  netAmount?: number | null;
  completedAt?: Date;
}) {
  const db = await getDb();
  if (!db) return null;
  
  // Build update object with only defined values
  const updateData: Record<string, any> = {
    status: data.status,
    updatedAt: new Date(),
  };
  
  if (data.payerEmail !== undefined) updateData.payerEmail = data.payerEmail;
  if (data.payerName !== undefined) updateData.payerName = data.payerName;
  if (data.transactionId !== undefined) updateData.transactionId = data.transactionId;
  if (data.grossAmount !== undefined) updateData.grossAmount = data.grossAmount?.toString();
  if (data.feeAmount !== undefined) updateData.feeAmount = data.feeAmount?.toString();
  if (data.netAmount !== undefined) updateData.netAmount = data.netAmount?.toString();
  if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
  
  return (db as any)
    .update(paypalOrders)
    .set(updateData)
    .where(eq(paypalOrders.paypalOrderId, data.paypalOrderId));
}

export async function updateClientProtocolPaymentStatus(
  clientProtocolId: string,
  paymentStatus: "pending" | "paid" | "failed" | "refunded",
  paymentMethod?: "venmo" | "cc" | "other" | "paypal"
) {
  const database = await getDb();
  if (!database) return null;
  const id = parseInt(clientProtocolId);
  const newStatus = paymentStatus === "paid" ? "active" : "pending_approval";
  const updateData: any = {
    status: newStatus,
    paymentStatus: paymentStatus,
    paymentReceivedAt: paymentStatus === "paid" ? new Date() : null,
    updatedAt: new Date(),
  };
  if (paymentMethod) {
    updateData.paymentMethod = paymentMethod;
  }
  return database
    .update(clientProtocols)
    .set(updateData)
    .where(eq(clientProtocols.id, id));
}


// ============ PROJECT TRACKING INFO ============

export async function getProjectTrackingInfo(clientProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectTrackingInfo)
    .where(eq(projectTrackingInfo.clientProjectId, clientProjectId))
    .orderBy(desc(projectTrackingInfo.createdAt));
}

export async function getProjectTrackingInfoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(projectTrackingInfo).where(eq(projectTrackingInfo.id, id));
  return results[0] || null;
}

export async function createProjectTrackingInfo(data: Omit<InsertProjectTrackingInfo, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectTrackingInfo).values(data);
  return result[0].insertId;
}

export async function updateProjectTrackingInfo(id: number, data: Partial<InsertProjectTrackingInfo>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectTrackingInfo).set(data).where(eq(projectTrackingInfo.id, id));
}

export async function deleteProjectTrackingInfo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectTrackingInfo).where(eq(projectTrackingInfo.id, id));
}

// ============ PROJECT ATTACHMENTS ============

export async function getProjectAttachments(clientProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectAttachments)
    .where(eq(projectAttachments.clientProjectId, clientProjectId))
    .orderBy(desc(projectAttachments.createdAt));
}

export async function getProjectAttachmentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(projectAttachments).where(eq(projectAttachments.id, id));
  return results[0] || null;
}

export async function createProjectAttachment(data: Omit<InsertProjectAttachment, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectAttachments).values(data);
  return result[0].insertId;
}

export async function deleteProjectAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectAttachments).where(eq(projectAttachments.id, id));
}

// Get project attachments by category
export async function getProjectAttachmentsByCategory(clientProjectId: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectAttachments)
    .where(and(
      eq(projectAttachments.clientProjectId, clientProjectId),
      eq(projectAttachments.category, category as any)
    ))
    .orderBy(desc(projectAttachments.createdAt));
}


// ==================== Store Orders ====================

export async function createStoreOrder(data: Omit<InsertStoreOrder, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(storeOrders).values(data);
  return result[0].insertId;
}

export async function createStoreOrderItem(data: Omit<InsertStoreOrderItem, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(storeOrderItems).values(data);
  return result[0].insertId;
}

export async function getStoreOrder(id: number) {
  const db = await getDb();
  if (!db) return null;
  const orders = await db.select().from(storeOrders).where(eq(storeOrders.id, id));
  return orders[0] || null;
}

export async function getStoreOrderByPaypalId(paypalOrderId: string) {
  const db = await getDb();
  if (!db) return null;
  const orders = await db.select().from(storeOrders).where(eq(storeOrders.paypalOrderId, paypalOrderId));
  return orders[0] || null;
}

export async function getStoreOrderItems(storeOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeOrderItems).where(eq(storeOrderItems.storeOrderId, storeOrderId));
}

export async function getUserStoreOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeOrders)
    .where(eq(storeOrders.userId, userId))
    .orderBy(desc(storeOrders.createdAt));
}

export async function updateStoreOrderStatus(
  id: number, 
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded",
  additionalData?: { payerEmail?: string; payerName?: string; paidAt?: Date }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status, updatedAt: new Date() };
  if (additionalData?.payerEmail) updateData.payerEmail = additionalData.payerEmail;
  if (additionalData?.payerName) updateData.payerName = additionalData.payerName;
  if (additionalData?.paidAt) updateData.paidAt = additionalData.paidAt;
  await db.update(storeOrders).set(updateData).where(eq(storeOrders.id, id));
}

export async function updateStoreOrderPaypalId(id: number, paypalOrderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(storeOrders).set({ paypalOrderId, updatedAt: new Date() }).where(eq(storeOrders.id, id));
}

export async function deleteStoreOrderItems(storeOrderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(storeOrderItems).where(eq(storeOrderItems.storeOrderId, storeOrderId));
}

export async function deleteStoreOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(storeOrders).where(eq(storeOrders.id, id));
}

export async function updateStoreOrderVenmoId(id: number, venmoTransactionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(storeOrders).set({ venmoTransactionId, updatedAt: new Date() }).where(eq(storeOrders.id, id));
}

// Sync client inventory when store order is paid
export async function syncClientInventoryFromStoreOrder(storeOrderId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Get user email
    const user = await getUserById(userId);
    if (!user) {
      console.log(`[Inventory Sync] User ${userId} not found`);
      return { success: false, updatedCount: 0 };
    }
    
    // Find client protocol by user email
    if (!user.email) {
      console.log(`[Inventory Sync] User ${userId} has no email`);
      return { success: false, updatedCount: 0 };
    }
    const [protocol] = await db
      .select()
      .from(clientProtocols)
      .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${user.email})`)
      .orderBy(desc(clientProtocols.createdAt))
      .limit(1);
    
    if (!protocol) {
      console.log(`[Inventory Sync] No protocol found for user ${user.email}`);
      return { success: false, updatedCount: 0 };
    }
    
    // Get store order items
    const orderItems = await getStoreOrderItems(storeOrderId);
    if (!orderItems.length) {
      console.log(`[Inventory Sync] No items in store order ${storeOrderId}`);
      return { success: false, updatedCount: 0 };
    }
    
    // Get client's existing inventory
    const existingInventory = await db
      .select()
      .from(clientInventory)
      .where(eq(clientInventory.clientProtocolId, protocol.id));
    
    let updatedCount = 0;
    
    for (const orderItem of orderItems) {
      // Try to match by item name (case-insensitive)
      const matchingInventory = existingInventory.find(
        inv => inv.itemName.toLowerCase() === orderItem.name.toLowerCase()
      );
      
      if (matchingInventory) {
        // Update status to 'full' since they just purchased
        const oldStatus = matchingInventory.status;
        
        await db
          .update(clientInventory)
          .set({
            status: 'full',
            lastUpdatedAt: new Date(),
            lastReorderAlertAt: null,
            reorderTaskCreated: false,
          })
          .where(eq(clientInventory.id, matchingInventory.id));
        
        // Log the history
        await db.insert(inventoryHistory).values({
          clientInventoryId: matchingInventory.id,
          oldStatus,
          newStatus: 'full',
          changedBy: 'system',
          notes: `Auto-restocked from store order #${storeOrderId}`,
        });
        
        updatedCount++;
        console.log(`[Inventory Sync] Updated ${matchingInventory.itemName} to 'full' for protocol ${protocol.id}`);
      }
    }
    
    console.log(`[Inventory Sync] Updated ${updatedCount} items for store order ${storeOrderId}`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error(`[Inventory Sync] Error syncing inventory for store order ${storeOrderId}:`, error);
    return { success: false, updatedCount: 0 };
  }
}

// Deduct inventory for store order items
export async function deductInventoryForStoreOrder(storeOrderId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all items in the order
  const items = await getStoreOrderItems(storeOrderId);
  
  for (const item of items) {
    // Get current inventory
    const inventoryItem = await db.select().from(inventoryItems)
      .where(eq(inventoryItems.id, item.inventoryItemId));
    
    if (inventoryItem.length === 0) {
      console.warn(`[Inventory] Item ${item.inventoryItemId} not found for deduction`);
      continue;
    }
    
    const currentQty = inventoryItem[0].quantity;
    // Allow negative stock — serves as safety net to track what's owed/backordered
    const newQty = currentQty - item.quantity;
    
    // Update inventory quantity
    await db.update(inventoryItems)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(inventoryItems.id, item.inventoryItemId));
    
    // Create inventory transaction record
    await db.insert(inventoryTransactions).values({
      inventoryItemId: item.inventoryItemId,
      type: "sale",
      quantityChange: -item.quantity,
      previousQuantity: currentQty,
      newQuantity: newQty,
      notes: `Store order #${storeOrderId}`,
      createdBy: userId || null,
    });
    
    console.log(`[Inventory] Deducted ${item.quantity} of item ${item.inventoryItemId} (${currentQty} -> ${newQty})`);
  }
  
  // Auto-trigger restock alert check (non-blocking)
  checkAndSendRestockAlerts(`Store order #${storeOrderId}`).catch(err => 
    console.error('[Inventory] Restock alert check failed:', err)
  );
}

// Restock inventory when a store order is refunded (reverse of deductInventoryForStoreOrder)
export async function restockInventoryForStoreOrder(storeOrderId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all items in the order
  const items = await getStoreOrderItems(storeOrderId);
  
  const restocked: { itemName: string; quantity: number; success: boolean }[] = [];
  
  for (const item of items) {
    // Get current inventory
    const inventoryItem = await db.select().from(inventoryItems)
      .where(eq(inventoryItems.id, item.inventoryItemId));
    
    if (inventoryItem.length === 0) {
      console.warn(`[Inventory Restock] Item ${item.inventoryItemId} not found`);
      restocked.push({ itemName: item.name, quantity: item.quantity, success: false });
      continue;
    }
    
    const currentQty = inventoryItem[0].quantity;
    const newQty = currentQty + item.quantity;
    
    // Restock inventory quantity
    await db.update(inventoryItems)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(inventoryItems.id, item.inventoryItemId));
    
    // Create inventory transaction record
    await db.insert(inventoryTransactions).values({
      inventoryItemId: item.inventoryItemId,
      type: "return" as any,
      quantityChange: item.quantity,
      previousQuantity: currentQty,
      newQuantity: newQty,
      notes: `Refund restock - Store order #${storeOrderId}`,
      createdBy: userId || null,
    });
    
    restocked.push({ itemName: inventoryItem[0].name, quantity: item.quantity, success: true });
    console.log(`[Inventory Restock] Restocked ${item.quantity} of ${inventoryItem[0].name} (${currentQty} -> ${newQty})`);
  }
  
  return restocked;
}


// Get all store orders (admin)
export async function getAllStoreOrders(
  status?: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded",
  limit?: number
) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(storeOrders);
  
  if (status) {
    query = query.where(eq(storeOrders.status, status)) as any;
  }
  
  const orders = await query.orderBy(desc(storeOrders.createdAt)).limit(limit || 100);
  
  // Get items for each order
  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await db.select().from(storeOrderItems)
        .where(eq(storeOrderItems.storeOrderId, order.id));
      return { ...order, items };
    })
  );
  
  return ordersWithItems;
}


// ============ LOW STOCK ALERTS ============

/**
 * Get inventory items with their stock status
 */
export async function getInventoryStockStatus() {
  const db = await getDb();
  if (!db) return [];
  
  const items = await db.select()
    .from(inventoryItems)
    .where(eq(inventoryItems.isActive, true))
    .orderBy(asc(inventoryItems.name));
  
  return items.map(item => ({
    ...item,
    stockStatus: item.quantity <= 0 ? 'out_of_stock' as const :
                 item.quantity <= item.lowStockThreshold ? 'low_stock' as const :
                 'in_stock' as const,
    stockPercentage: item.lowStockThreshold > 0 
      ? Math.min(100, Math.round((item.quantity / (item.lowStockThreshold * 2)) * 100))
      : 100,
  }));
}

/**
 * Update low stock threshold for an inventory item
 */
export async function updateLowStockThreshold(itemId: number, threshold: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(inventoryItems)
    .set({ lowStockThreshold: threshold })
    .where(eq(inventoryItems.id, itemId));
  
  return getInventoryItemById(itemId);
}


// ============ STORE ORDER SHIPPING ============

/**
 * Update store order shipping info
 */
export async function updateStoreOrderShipping(orderId: number, data: {
  trackingNumber: string;
  trackingCarrier: string;
  status: string;
  shippedAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(storeOrders)
    .set({
      trackingNumber: data.trackingNumber,
      trackingCarrier: data.trackingCarrier,
      status: data.status as any,
      shippedAt: data.shippedAt,
    })
    .where(eq(storeOrders.id, orderId));
}

/**
 * Get low stock items for alerts
 */
export async function getLowStockItemsForAlert() {
  const db = await getDb();
  if (!db) return [];
  
  const items = await db.select()
    .from(inventoryItems)
    .where(and(
      eq(inventoryItems.isActive, true),
      sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockThreshold}`
    ))
    .orderBy(asc(inventoryItems.quantity));
  
  return items;
}


// Check and send restock alerts based on configurable settings
// Called automatically after inventory deductions
export async function checkAndSendRestockAlerts(triggeredBy?: string) {
  try {
    const db = await getDb();
    if (!db) return;
    
    // Check if restock alerts are enabled
    const alertsEnabled = await getSiteSetting('restock_alerts_enabled');
    if (alertsEnabled === 'false') {
      console.log('[RestockAlert] Alerts disabled, skipping');
      return;
    }
    
    // Get configurable threshold (default -3)
    const thresholdSetting = await getSiteSetting('restock_alert_threshold');
    const threshold = parseInt(thresholdSetting || '-3') || -3;
    
    // Get excluded categories
    const excludedSetting = await getSiteSetting('inventory_excluded_categories');
    let excludedCategories: string[] = [];
    if (excludedSetting) {
      try { excludedCategories = JSON.parse(excludedSetting); } catch { excludedCategories = []; }
    }
    
    // Get all active inventory items at or below threshold
    const allItems = await db.select()
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.isActive, true),
        sql`${inventoryItems.quantity} <= ${threshold}`
      ))
      .orderBy(asc(inventoryItems.quantity));
    
    if (allItems.length === 0) return;
    
    // Get categories to filter out excluded ones
    const categories = await getAllInventoryCategories();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    
    // Filter out excluded categories
    const alertItems = allItems.filter(item => {
      const catName = categoryMap.get(item.categoryId) || 'Uncategorized';
      return !excludedCategories.includes(catName);
    });
    
    if (alertItems.length === 0) return;
    
    // Rate limit: don't send more than once per hour
    const lastSentSetting = await getSiteSetting('restock_alert_last_sent');
    if (lastSentSetting) {
      const lastSent = new Date(lastSentSetting);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lastSent > hourAgo) {
        console.log(`[RestockAlert] Rate limited - last sent ${lastSent.toISOString()}, skipping`);
        return;
      }
    }
    
    // Get custom email settings
    const customSubject = await getSiteSetting('restock_email_subject') || undefined;
    const customIntro = await getSiteSetting('restock_email_intro') || undefined;
    
    // Format items for email
    const itemsWithCategories = alertItems.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      categoryName: categoryMap.get(item.categoryId) || 'Uncategorized',
      triggeredBy,
    }));
    
    // Get admin emails
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      console.log('[RestockAlert] No admin emails configured');
      return;
    }
    
    // Generate and send email
    const { generateRestockAlertEmail } = await import('./emailTemplates/restockAlert');
    const { sendEmail } = await import('./emailService');
    
    for (const email of adminEmails) {
      try {
        const emailData = await generateRestockAlertEmail({
          items: itemsWithCategories,
          threshold,
          adminName: 'Admin',
          customSubject,
          customIntro,
        });
        
        await sendEmail({
          to: email,
          subject: emailData.subject,
          html: emailData.html,
        });
        console.log(`[RestockAlert] Alert sent to ${email} for ${alertItems.length} items`);
      } catch (error) {
        console.error(`[RestockAlert] Failed to send to ${email}:`, error);
      }
    }
    
    // Update last sent timestamp
    await setSiteSetting('restock_alert_last_sent', new Date().toISOString());
    
  } catch (error) {
    console.error('[RestockAlert] Error checking/sending alerts:', error);
  }
}

// Update user phone number
export async function updateUserPhone(userId: number, phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ phone }).where(eq(users.id, userId));
}

// Update user SMS notification preference
export async function updateUserSmsPreference(userId: number, receiveSmsNotifications: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ receiveSmsNotifications }).where(eq(users.id, userId));
}


// ============ PROGRESS PHOTOS FUNCTIONS ============

export async function createProgressPhoto(data: Omit<InsertProgressPhoto, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(progressPhotos).values(data);
  return result[0].insertId;
}

export async function getProgressPhotosForUser(userId: number, clientProtocolId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(progressPhotos.userId, userId)];
  if (clientProtocolId) {
    conditions.push(eq(progressPhotos.clientProtocolId, clientProtocolId));
  }
  
  return db.select()
    .from(progressPhotos)
    .where(and(...conditions))
    .orderBy(desc(progressPhotos.createdAt));
}

export async function deleteProgressPhoto(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Only allow deletion if the photo belongs to the user
  await db.delete(progressPhotos)
    .where(and(
      eq(progressPhotos.id, id),
      eq(progressPhotos.userId, userId)
    ));
}

export async function getProgressPhotoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const photos = await db.select()
    .from(progressPhotos)
    .where(eq(progressPhotos.id, id))
    .limit(1);
  
  return photos[0] || null;
}

// ============ JOURNEY NOTES FUNCTIONS ============

export async function createJourneyNote(data: Omit<InsertJourneyNote, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(journeyNotes).values(data);
  return result[0].insertId;
}

export async function getJourneyNotesForUser(userId: number, clientProtocolId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(journeyNotes.userId, userId)];
  if (clientProtocolId) {
    conditions.push(eq(journeyNotes.clientProtocolId, clientProtocolId));
  }
  
  return db.select()
    .from(journeyNotes)
    .where(and(...conditions))
    .orderBy(desc(journeyNotes.noteDate));
}

export async function updateJourneyNote(id: number, userId: number, data: Partial<InsertJourneyNote>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Only allow update if the note belongs to the user
  await db.update(journeyNotes)
    .set(data)
    .where(and(
      eq(journeyNotes.id, id),
      eq(journeyNotes.userId, userId)
    ));
}

export async function deleteJourneyNote(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Only allow deletion if the note belongs to the user
  await db.delete(journeyNotes)
    .where(and(
      eq(journeyNotes.id, id),
      eq(journeyNotes.userId, userId)
    ));
}

export async function getJourneyNoteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const notes = await db.select()
    .from(journeyNotes)
    .where(eq(journeyNotes.id, id))
    .limit(1);
  
  return notes[0] || null;
}


// ============ ANNOUNCEMENT TEMPLATES ============

export async function createAnnouncementTemplate(data: InsertAnnouncementTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(announcementTemplates).values(data);
  return result[0].insertId;
}

export async function getAnnouncementTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcementTemplates).orderBy(desc(announcementTemplates.createdAt));
}

export async function getAnnouncementTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(announcementTemplates).where(eq(announcementTemplates.id, id));
  return results[0] || null;
}

export async function updateAnnouncementTemplate(id: number, data: Partial<InsertAnnouncementTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(announcementTemplates).set(data).where(eq(announcementTemplates.id, id));
}

export async function deleteAnnouncementTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(announcementTemplates).where(eq(announcementTemplates.id, id));
}

// ============ ANNOUNCEMENT HISTORY ============

export async function createAnnouncementHistory(data: InsertAnnouncementHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(announcementHistory).values(data);
  return result[0].insertId;
}

export async function getAnnouncementHistory() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcementHistory).orderBy(desc(announcementHistory.sentAt));
}

export async function getAnnouncementHistoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(announcementHistory).where(eq(announcementHistory.id, id));
  return results[0] || null;
}

export async function getScheduledAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcementHistory)
    .where(eq(announcementHistory.status, "scheduled"))
    .orderBy(announcementHistory.scheduledFor);
}

export async function updateAnnouncementStatus(id: number, status: string, recipientCount?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (status === "sent") {
    updateData.sentAt = new Date();
  }
  if (recipientCount !== undefined) {
    updateData.recipientCount = recipientCount;
  }
  await db.update(announcementHistory).set(updateData).where(eq(announcementHistory.id, id));
}


// ============ ANNOUNCEMENT ANALYTICS ============

export async function recordAnnouncementOpen(trackingId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const announcement = await db.select().from(announcementHistory)
    .where(eq(announcementHistory.trackingId, trackingId))
    .limit(1);
  
  if (announcement.length === 0) return;
  
  const current = announcement[0];
  await db.update(announcementHistory)
    .set({ opens: (current.opens || 0) + 1 })
    .where(eq(announcementHistory.id, current.id));
}

export async function recordAnnouncementClick(trackingId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const announcement = await db.select().from(announcementHistory)
    .where(eq(announcementHistory.trackingId, trackingId))
    .limit(1);
  
  if (announcement.length === 0) return;
  
  const current = announcement[0];
  await db.update(announcementHistory)
    .set({ clicks: (current.clicks || 0) + 1 })
    .where(eq(announcementHistory.id, current.id));
}

export async function generateTrackingId(): Promise<string> {
  return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============ RECURRING ANNOUNCEMENTS ============

export async function createRecurringAnnouncement(data: InsertAnnouncementHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(announcementHistory).values(data);
  return result[0].insertId;
}

export async function getRecurringAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcementHistory)
    .where(and(
      ne(announcementHistory.recurrencePattern, "none"),
      or(
        isNull(announcementHistory.recurrenceEndDate),
        gt(announcementHistory.recurrenceEndDate, new Date())
      )
    ));
}

export async function createRecurrenceInstance(parentId: number, data: Partial<InsertAnnouncementHistory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const parent = await db.select().from(announcementHistory)
    .where(eq(announcementHistory.id, parentId))
    .limit(1);
  
  if (parent.length === 0) throw new Error("Parent announcement not found");
  
  const result = await db.insert(announcementHistory).values({
    subject: parent[0].subject,
    message: parent[0].message,
    recipientCount: parent[0].recipientCount,
    recipientWaiverIds: parent[0].recipientWaiverIds,
    filterCriteria: parent[0].filterCriteria,
    status: "sent",
    sentBy: parent[0].sentBy,
    parentAnnouncementId: parentId,
    ...data,
  });
  
  return result[0].insertId;
}


/**
 * Create recipient tracking records for an announcement
 */
export async function createRecipientTrackingRecords(
  announcementId: number,
  recipients: Array<{ email: string; trackingId: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const records = recipients.map(r => ({
    announcementId,
    recipientEmail: r.email,
    trackingId: r.trackingId,
  }));
  
  await db.insert(recipientTracking).values(records);
}

/**
 * Get recipient tracking data for an announcement
 */
export async function getAnnouncementTrackingData(announcementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  return await db.select()
    .from(recipientTracking)
    .where(eq(recipientTracking.announcementId, announcementId));
}

/**
 * Get tracking stats for an announcement (opens, clicks, engagement rate)
 */
export async function getAnnouncementTrackingStats(announcementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const announcement = await db.select()
    .from(announcementHistory)
    .where(eq(announcementHistory.id, announcementId))
    .limit(1);
  
  if (!announcement.length) return null;
  
  const recipientCount = announcement[0].recipientCount;
  const opens = announcement[0].opens || 0;
  const clicks = announcement[0].clicks || 0;
  
  return {
    recipientCount,
    opens,
    clicks,
    openRate: recipientCount > 0 ? (opens / recipientCount * 100).toFixed(1) : "0",
    clickRate: recipientCount > 0 ? (clicks / recipientCount * 100).toFixed(1) : "0",
    engagementRate: recipientCount > 0 ? ((opens + clicks) / recipientCount * 100).toFixed(1) : "0",
  };
}


// ============ PEPTIDE CHEAT SHEET QUERIES ============

/**
 * Get all peptide categories with their peptides
 */
export async function getAllPeptideCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(peptideCategories)
    .where(eq(peptideCategories.isActive, true))
    .orderBy(peptideCategories.displayOrder);
}

/**
 * Get all peptide categories (including inactive) for admin
 */
export async function getAllPeptideCategoriesAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(peptideCategories)
    .orderBy(peptideCategories.displayOrder);
}

/**
 * Get a single peptide category by ID
 */
export async function getPeptideCategoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select()
    .from(peptideCategories)
    .where(eq(peptideCategories.id, id))
    .limit(1);
  return results[0] || null;
}

/**
 * Create a new peptide category
 */
export async function createPeptideCategory(data: Omit<InsertPeptideCategory, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(peptideCategories).values(data);
  return result[0].insertId;
}

/**
 * Update a peptide category
 */
export async function updatePeptideCategory(id: number, data: Partial<InsertPeptideCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(peptideCategories).set(data).where(eq(peptideCategories.id, id));
}

/**
 * Delete a peptide category (and all its peptides)
 */
export async function deletePeptideCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  // Delete all peptides in this category first
  await db.delete(peptides).where(eq(peptides.categoryId, id));
  // Then delete the category
  await db.delete(peptideCategories).where(eq(peptideCategories.id, id));
}

/**
 * Get all peptides (active only)
 */
export async function getAllPeptides() {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(peptides)
    .where(eq(peptides.isActive, true))
    .orderBy(peptides.categoryId, peptides.displayOrder);
}

/**
 * Get all peptides for admin (including inactive)
 */
export async function getAllPeptidesAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(peptides)
    .orderBy(peptides.categoryId, peptides.displayOrder);
}

/**
 * Get peptides by category
 */
export async function getPeptidesByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(peptides)
    .where(eq(peptides.categoryId, categoryId))
    .orderBy(peptides.displayOrder);
}

/**
 * Get a single peptide by ID
 */
export async function getPeptideById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select()
    .from(peptides)
    .where(eq(peptides.id, id))
    .limit(1);
  return results[0] || null;
}

/**
 * Create a new peptide
 */
export async function createPeptide(data: Omit<InsertPeptide, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(peptides).values(data);
  return result[0].insertId;
}

/**
 * Update a peptide
 */
export async function updatePeptide(id: number, data: Partial<InsertPeptide>) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(peptides).set(data).where(eq(peptides.id, id));
}

/**
 * Delete a peptide
 */
export async function deletePeptide(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(peptides).where(eq(peptides.id, id));
}

/**
 * Get full peptide cheat sheet data (categories with their peptides)
 */
export async function getPeptideCheatSheetData() {
  const db = await getDb();
  if (!db) return [];
  
  const cats = await db.select()
    .from(peptideCategories)
    .where(eq(peptideCategories.isActive, true))
    .orderBy(peptideCategories.displayOrder);
  
  const peps = await db.select()
    .from(peptides)
    .where(eq(peptides.isActive, true))
    .orderBy(peptides.displayOrder);
  
  return cats.map(cat => ({
    ...cat,
    peptides: peps.filter(p => p.categoryId === cat.id),
  }));
}

/**
 * Reorder peptide categories
 */
export async function reorderPeptideCategories(orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(peptideCategories)
      .set({ displayOrder: i })
      .where(eq(peptideCategories.id, orderedIds[i]));
  }
}

/**
 * Reorder peptides within a category
 */
export async function reorderPeptides(categoryId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(peptides)
      .set({ displayOrder: i })
      .where(eq(peptides.id, orderedIds[i]));
  }
}


// ============================================
// USER FAVORITE PEPTIDES
// ============================================

/**
 * Get all favorite peptides for a user
 */
export async function getUserFavoritePeptides(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const favorites = await db
    .select({
      id: userFavoritePeptides.id,
      peptideId: userFavoritePeptides.peptideId,
      createdAt: userFavoritePeptides.createdAt,
      peptide: peptides,
    })
    .from(userFavoritePeptides)
    .innerJoin(peptides, eq(userFavoritePeptides.peptideId, peptides.id))
    .where(eq(userFavoritePeptides.userId, userId))
    .orderBy(userFavoritePeptides.createdAt);
  
  return favorites;
}

/**
 * Get favorite peptide IDs for a user (for quick lookup)
 */
export async function getUserFavoritePeptideIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const favorites = await db
    .select({ peptideId: userFavoritePeptides.peptideId })
    .from(userFavoritePeptides)
    .where(eq(userFavoritePeptides.userId, userId));
  
  return favorites.map(f => f.peptideId);
}

/**
 * Add a peptide to user's favorites
 */
export async function addFavoritePeptide(userId: number, peptideId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Check if already favorited
  const existing = await db
    .select()
    .from(userFavoritePeptides)
    .where(and(
      eq(userFavoritePeptides.userId, userId),
      eq(userFavoritePeptides.peptideId, peptideId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const result = await db.insert(userFavoritePeptides).values({
    userId,
    peptideId,
  });
  
  return { id: result[0].insertId, userId, peptideId };
}

/**
 * Remove a peptide from user's favorites
 */
export async function removeFavoritePeptide(userId: number, peptideId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .delete(userFavoritePeptides)
    .where(and(
      eq(userFavoritePeptides.userId, userId),
      eq(userFavoritePeptides.peptideId, peptideId)
    ));
}

/**
 * Check if a peptide is in user's favorites
 */
export async function isPeptideFavorited(userId: number, peptideId: number) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select()
    .from(userFavoritePeptides)
    .where(and(
      eq(userFavoritePeptides.userId, userId),
      eq(userFavoritePeptides.peptideId, peptideId)
    ))
    .limit(1);
  
  return result.length > 0;
}


// ============ WAIVER BYPASS FUNCTIONS ============

export async function grantWaiverBypass(userId: number, grantedBy: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(users)
    .set({
      waiverBypassedAt: new Date(),
      waiverBypassedBy: grantedBy,
      waiverBypassReason: reason,
    })
    .where(eq(users.id, userId));
}

export async function revokeWaiverBypass(userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(users)
    .set({
      waiverBypassedAt: null,
      waiverBypassedBy: null,
      waiverBypassReason: null,
    })
    .where(eq(users.id, userId));
}

export async function getUsersWithWaiverBypass() {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      waiverBypassedAt: users.waiverBypassedAt,
      waiverBypassedBy: users.waiverBypassedBy,
      waiverBypassReason: users.waiverBypassReason,
    })
    .from(users)
    .where(isNotNull(users.waiverBypassedAt));
}

export async function hasWaiverBypass(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select({ waiverBypassedAt: users.waiverBypassedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return result.length > 0 && result[0].waiverBypassedAt !== null;
}


// ==================== Payment Reminder Logs ====================

export async function createPaymentReminderLog(data: {
  protocolId: number;
  clientName?: string;
  clientEmail?: string;
  reminderType: string;
  reminderDay: number;
  status?: string;
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(paymentReminderLogs).values({
    protocolId: data.protocolId,
    clientName: data.clientName || null,
    clientEmail: data.clientEmail || null,
    reminderType: data.reminderType,
    reminderDay: data.reminderDay,
    status: data.status || "sent",
    errorMessage: data.errorMessage || null,
  });
  
  return result;
}

export async function getPaymentReminderLogsByProtocol(protocolId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(paymentReminderLogs)
    .where(eq(paymentReminderLogs.protocolId, protocolId))
    .orderBy(desc(paymentReminderLogs.sentAt));
}

export async function getAllPaymentReminderLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(paymentReminderLogs)
    .orderBy(desc(paymentReminderLogs.sentAt))
    .limit(limit);
}


// ==================== Packing Slip Archive Functions ====================

export async function archivePackingSlip(id: number, archivedBy: number) {
  const db = await getDb();
  if (!db) return null;
  
  await db
    .update(packingSlips)
    .set({
      archivedAt: new Date(),
      archivedBy,
    })
    .where(eq(packingSlips.id, id));
  
  return { success: true };
}

export async function restorePackingSlip(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  await db
    .update(packingSlips)
    .set({
      archivedAt: null,
      archivedBy: null,
    })
    .where(eq(packingSlips.id, id));
  
  return { success: true };
}

export async function permanentlyDeletePackingSlip(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  // First delete all items associated with this packing slip
  await db
    .delete(packingSlipItems)
    .where(eq(packingSlipItems.packingSlipId, id));
  
  // Then delete the packing slip itself
  await db
    .delete(packingSlips)
    .where(eq(packingSlips.id, id));
  
  return { success: true };
}

export async function getArchivedPackingSlips() {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(packingSlips)
    .where(isNotNull(packingSlips.archivedAt))
    .orderBy(desc(packingSlips.archivedAt));
}

export async function deleteOldArchivedPackingSlips(daysOld: number = 30) {
  const db = await getDb();
  if (!db) return { deleted: 0 };
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  // Get IDs of old archived slips
  const oldSlips = await db
    .select({ id: packingSlips.id })
    .from(packingSlips)
    .where(and(
      isNotNull(packingSlips.archivedAt),
      lte(packingSlips.archivedAt, cutoffDate)
    ));
  
  if (oldSlips.length === 0) return { deleted: 0 };
  
  const idsToDelete = oldSlips.map(s => s.id);

  // Delete child rows before parent (FK order: items → audit log → slips)
  await db
    .delete(packingSlipItems)
    .where(inArray(packingSlipItems.packingSlipId, idsToDelete));

  await db
    .delete(packingSlipAuditLog)
    .where(inArray(packingSlipAuditLog.packingSlipId, idsToDelete));

  await db
    .delete(packingSlips)
    .where(inArray(packingSlips.id, idsToDelete));

  return { deleted: idsToDelete.length };
}


// Delete a single packing slip item by ID
export async function deletePackingSlipItem(itemId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.delete(packingSlipItems)
    .where(eq(packingSlipItems.id, itemId));
  
  return { success: true };
}


// ============ NOTES HISTORY QUERIES ============

// Create a notes history entry
export async function createNotesHistoryEntry(data: InsertNotesHistory) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database.insert(notesHistory).values(data);
  return result[0].insertId;
}

// Get notes history for a client protocol
export async function getNotesHistory(
  clientProtocolId: number,
  noteType?: 'internal_notes' | 'coach_notes' | 'comment'
) {
  const database = await getDb();
  if (!database) return [];
  
  const conditions = [eq(notesHistory.clientProtocolId, clientProtocolId)];
  if (noteType) {
    conditions.push(eq(notesHistory.noteType, noteType));
  }
  
  return database
    .select()
    .from(notesHistory)
    .where(and(...conditions))
    .orderBy(desc(notesHistory.createdAt));
}

// Get the most recent notes history entry for a specific note type
export async function getLatestNotesHistoryEntry(
  clientProtocolId: number,
  noteType: 'internal_notes' | 'coach_notes' | 'comment'
) {
  const database = await getDb();
  if (!database) return null;
  
  const results = await database
    .select()
    .from(notesHistory)
    .where(
      and(
        eq(notesHistory.clientProtocolId, clientProtocolId),
        eq(notesHistory.noteType, noteType)
      )
    )
    .orderBy(desc(notesHistory.createdAt))
    .limit(1);
  
  return results[0] || null;
}

// Save notes with history tracking
export async function saveNotesWithHistory(
  clientProtocolId: number,
  noteType: 'internal_notes' | 'coach_notes',
  content: string,
  userId?: number,
  userName?: string
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Get the current content to store as previous
  const protocol = await database
    .select()
    .from(clientProtocols)
    .where(eq(clientProtocols.id, clientProtocolId))
    .limit(1);
  
  if (!protocol[0]) throw new Error("Protocol not found");
  
  const previousContent = noteType === 'internal_notes' 
    ? protocol[0].internalNotes 
    : protocol[0].coachNotes;
  
  // Determine if this is a create or update
  const changeType = previousContent ? 'updated' : 'created';
  
  // Only create history entry if content actually changed
  if (previousContent !== content) {
    await database.insert(notesHistory).values({
      clientProtocolId,
      noteType,
      content,
      changedBy: userId,
      changedByName: userName,
      changeType,
      previousContent: previousContent || null,
    });
  }
  
  // Update the actual notes field
  const updateData = noteType === 'internal_notes' 
    ? { internalNotes: content }
    : { coachNotes: content };
  
  await database
    .update(clientProtocols)
    .set(updateData)
    .where(eq(clientProtocols.id, clientProtocolId));
  
  return { success: true };
}


// ============ PACKING SLIP AUDIT LOG FUNCTIONS ============

export type PackingSlipAuditAction =
  | 'created'
  | 'item_added'
  | 'item_removed'
  | 'item_status_changed'
  | 'regenerated'
  | 'signed'
  | 'locked'
  | 'unlocked'
  | 'bulk_locked'
  | 'bulk_unlocked'
  | 'auto_locked'
  | 'status_changed'
  | 'tracking_updated'
  | 'delivery_marked'
  | 'shipping_updated'
  | 'dimensions_updated'
  | 'archived'
  | 'restored';

export async function createPackingSlipAuditEntry(data: {
  packingSlipId: number;
  action: PackingSlipAuditAction;
  details?: Record<string, unknown>;
  performedBy?: number;
  performedByName?: string;
  performedByEmail?: string;
  ipAddress?: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.insert(packingSlipAuditLog).values({
    packingSlipId: data.packingSlipId,
    action: data.action,
    details: data.details ? JSON.stringify(data.details) : null,
    performedBy: data.performedBy,
    performedByName: data.performedByName,
    performedByEmail: data.performedByEmail,
    ipAddress: data.ipAddress,
  });
}

export async function getPackingSlipAuditLog(packingSlipId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const logs = await database
    .select()
    .from(packingSlipAuditLog)
    .where(eq(packingSlipAuditLog.packingSlipId, packingSlipId))
    .orderBy(desc(packingSlipAuditLog.createdAt));
  
  return logs.map(log => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));
}

// ============ PACKING SLIP LOCK FUNCTIONS ============

export async function lockPackingSlip(
  packingSlipId: number,
  userId: number,
  userName: string
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Recalculate totals/status before locking to ensure status reflects actual item states
  await recalculatePackingSlipTotals(packingSlipId);
  
  await database
    .update(packingSlips)
    .set({
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: userId,
      lockedByName: userName,
    })
    .where(eq(packingSlips.id, packingSlipId));
  
  // Create audit entry
  await createPackingSlipAuditEntry({
    packingSlipId,
    action: 'locked',
    performedBy: userId,
    performedByName: userName,
  });
  
  return { success: true };
}

export async function unlockPackingSlip(
  packingSlipId: number,
  userId: number,
  userName: string
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database
    .update(packingSlips)
    .set({
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
      lockedByName: null,
    })
    .where(eq(packingSlips.id, packingSlipId));
  
  // Create audit entry
  await createPackingSlipAuditEntry({
    packingSlipId,
    action: 'unlocked',
    performedBy: userId,
    performedByName: userName,
  });
  
  return { success: true };
}

export async function isPackingSlipLocked(packingSlipId: number): Promise<boolean> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database
    .select({ isLocked: packingSlips.isLocked })
    .from(packingSlips)
    .where(eq(packingSlips.id, packingSlipId))
    .limit(1);
  
  return result[0]?.isLocked ?? false;
}


// ============ PENDING VENMO PAYMENTS ============

export async function createPendingVenmoPayment(data: {
  clientProtocolId: number;
  amount: string;
  venmoUsername?: string;
  venmoTransactionNote?: string;
  clientName: string;
  clientEmail?: string;
  expectedVenmoHandle?: string;
  expiresAt?: Date;
}): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database.insert(pendingVenmoPayments).values({
    clientProtocolId: data.clientProtocolId,
    amount: data.amount,
    venmoUsername: data.venmoUsername,
    venmoTransactionNote: data.venmoTransactionNote,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    expectedVenmoHandle: data.expectedVenmoHandle,
    expiresAt: data.expiresAt,
    status: 'pending',
  });

  return result[0].insertId;
}

export async function getPendingVenmoPaymentById(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database
    .select()
    .from(pendingVenmoPayments)
    .where(eq(pendingVenmoPayments.id, id))
    .limit(1);

  return result[0] || null;
}

export async function getPendingVenmoPaymentByProtocol(clientProtocolId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database
    .select()
    .from(pendingVenmoPayments)
    .where(eq(pendingVenmoPayments.clientProtocolId, clientProtocolId))
    .orderBy(desc(pendingVenmoPayments.createdAt))
    .limit(1);

  return result[0] || null;
}

export async function getAllPendingVenmoPayments() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database
    .select()
    .from(pendingVenmoPayments)
    .orderBy(desc(pendingVenmoPayments.submittedAt));

  return result;
}

export async function updatePendingVenmoPaymentStatus(
  id: number,
  data: {
    status: 'pending' | 'confirmed' | 'rejected' | 'expired';
    verifiedBy?: number;
    verifiedAt?: Date;
    verificationNotes?: string;
    rejectionReason?: string;
  }
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .update(pendingVenmoPayments)
    .set({
      status: data.status,
      verifiedBy: data.verifiedBy,
      verifiedAt: data.verifiedAt,
      verificationNotes: data.verificationNotes,
      rejectionReason: data.rejectionReason,
    })
    .where(eq(pendingVenmoPayments.id, id));

  return { success: true };
}

export async function expirePendingVenmoPayments() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const now = new Date();
  
  await database
    .update(pendingVenmoPayments)
    .set({ status: 'expired' })
    .where(
      and(
        eq(pendingVenmoPayments.status, 'pending'),
        lt(pendingVenmoPayments.expiresAt, now)
      )
    );

  return { success: true };
}


// ============ SAVED ADDRESSES ============

export async function getSavedAddresses(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(savedAddresses)
    .where(eq(savedAddresses.userId, userId))
    .orderBy(desc(savedAddresses.isDefault), asc(savedAddresses.label));
}

export async function getSavedAddressById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db
    .select()
    .from(savedAddresses)
    .where(eq(savedAddresses.id, id))
    .limit(1);
  return results[0] || null;
}

export async function getDefaultAddress(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db
    .select()
    .from(savedAddresses)
    .where(and(eq(savedAddresses.userId, userId), eq(savedAddresses.isDefault, true)))
    .limit(1);
  return results[0] || null;
}

export async function createSavedAddress(data: InsertSavedAddress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(savedAddresses).values(data);
  return result[0].insertId;
}

export async function updateSavedAddress(id: number, data: Partial<InsertSavedAddress>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(savedAddresses).set(data).where(eq(savedAddresses.id, id));
}

export async function deleteSavedAddress(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(savedAddresses).where(eq(savedAddresses.id, id));
}

export async function clearDefaultAddress(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(savedAddresses)
    .set({ isDefault: false })
    .where(eq(savedAddresses.userId, userId));
}


// ============ PASSWORD RESET FUNCTIONS ============

import crypto from "crypto";

/**
 * Generate a secure random token for password reset/set
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a password reset/set token for a user
 */
export async function createPasswordResetToken(
  userId: number,
  email: string,
  type: "set_password" | "reset_password"
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const token = generateSecureToken();
  
  // Invalidate any existing tokens for this user and type
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.type, type),
        isNull(passwordResetTokens.usedAt)
      )
    );
  
  // Create new token - expires in 72 hours for set_password, 1 hour for reset_password
  const expiresIn = type === "set_password" ? 72 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiresIn);
  
  await db.insert(passwordResetTokens).values({
    userId,
    email,
    token,
    type,
    expiresAt,
  });
  
  return token;
}

/**
 * Verify a password reset/set token
 */
export async function verifyPasswordResetToken(token: string): Promise<{
  valid: boolean;
  userId?: number;
  email?: string;
  type?: "set_password" | "reset_password";
  error?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [tokenRecord] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token));
  
  if (!tokenRecord) {
    return { valid: false, error: "Invalid token" };
  }
  
  if (tokenRecord.usedAt) {
    return { valid: false, error: "Token has already been used" };
  }
  
  if (new Date() > tokenRecord.expiresAt) {
    return { valid: false, error: "Token has expired" };
  }
  
  return {
    valid: true,
    userId: tokenRecord.userId,
    email: tokenRecord.email,
    type: tokenRecord.type,
  };
}

/**
 * Mark a password reset token as used
 */
export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.token, token));
}

/**
 * Get user by email for password reset
 */
export async function getUserByEmailForPasswordReset(email: string): Promise<{
  id: number;
  email: string | null;
  name: string | null;
} | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.email, email));
  
  return user || null;
}


// ============================================
// Session Management Functions
// ============================================

/**
 * Create a new user session
 */
export async function createUserSession(data: {
  userId: number;
  sessionToken: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userSessions).values({
    userId: data.userId,
    sessionToken: data.sessionToken,
    deviceInfo: data.deviceInfo || null,
    ipAddress: data.ipAddress || null,
    userAgent: data.userAgent || null,
    expiresAt: data.expiresAt,
    lastActiveAt: new Date(),
  });
  return result[0].insertId;
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: number): Promise<{
  id: number;
  sessionToken: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
}[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const sessions = await db
    .select({
      id: userSessions.id,
      sessionToken: userSessions.sessionToken,
      deviceInfo: userSessions.deviceInfo,
      ipAddress: userSessions.ipAddress,
      userAgent: userSessions.userAgent,
      lastActiveAt: userSessions.lastActiveAt,
      expiresAt: userSessions.expiresAt,
      createdAt: userSessions.createdAt,
      isRevoked: userSessions.isRevoked,
    })
    .from(userSessions)
    .where(
      and(
        eq(userSessions.userId, userId),
        eq(userSessions.isRevoked, false),
        gt(userSessions.expiresAt, new Date())
      )
    )
    .orderBy(desc(userSessions.lastActiveAt));
  
  return sessions;
}

/**
 * Update session last active time
 */
export async function updateSessionLastActive(sessionToken: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(userSessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(userSessions.sessionToken, sessionToken));
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(userSessions)
    .set({ 
      isRevoked: true,
      revokedAt: new Date()
    })
    .where(
      and(
        eq(userSessions.id, sessionId),
        eq(userSessions.userId, userId)
      )
    );
  return result[0].affectedRows > 0;
}

/**
 * Revoke all sessions for a user except the current one
 */
export async function revokeAllOtherSessions(userId: number, currentSessionToken: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(userSessions)
    .set({ 
      isRevoked: true,
      revokedAt: new Date()
    })
    .where(
      and(
        eq(userSessions.userId, userId),
        eq(userSessions.isRevoked, false),
        sql`${userSessions.sessionToken} != ${currentSessionToken}`
      )
    );
  return result[0].affectedRows;
}

/**
 * Get session by token
 */
export async function getSessionByToken(sessionToken: string): Promise<{
  id: number;
  userId: number;
  expiresAt: Date;
  isRevoked: boolean;
} | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [session] = await db
    .select({
      id: userSessions.id,
      userId: userSessions.userId,
      expiresAt: userSessions.expiresAt,
      isRevoked: userSessions.isRevoked,
    })
    .from(userSessions)
    .where(eq(userSessions.sessionToken, sessionToken));
  
  return session || null;
}

/**
 * Clean up expired sessions (can be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .delete(userSessions)
    .where(lt(userSessions.expiresAt, new Date()));
  return result[0].affectedRows;
}


// ============ CENTRALIZED INBOX ============

/**
 * Get all conversations with their latest message and unread count for the coach inbox.
 * Groups by clientProtocolId and returns the latest message, unread count, and client info.
 */
export async function getInboxConversations() {
  const db = await getDb();
  if (!db) return [];

  // Get all client protocols that have at least one comment
  const conversations = await db.execute(sql`
    SELECT 
      cp.id as clientProtocolId,
      cp.clientName,
      cp.clientEmail,
      cp.clientId,
      cp.status as protocolStatus,
      cp.clientVisibility,
      latest_msg.id as lastMessageId,
      latest_msg.message as lastMessage,
      latest_msg.authorType as lastAuthorType,
      latest_msg.authorName as lastAuthorName,
      latest_msg.createdAt as lastMessageAt,
      latest_msg.loomUrl as lastLoomUrl,
      COALESCE(unread.unreadCount, 0) as unreadCount,
      u.lastSeenAt as clientLastSeenAt
    FROM client_protocols cp
    LEFT JOIN users u ON LOWER(cp.clientEmail) = LOWER(u.email)
    INNER JOIN (
      SELECT pc1.clientProtocolId, pc1.id, pc1.message, pc1.authorType, pc1.authorName, pc1.createdAt, pc1.loomUrl
      FROM protocol_comments pc1
      INNER JOIN (
        SELECT clientProtocolId, MAX(id) as maxId
        FROM protocol_comments
        GROUP BY clientProtocolId
      ) pc2 ON pc1.id = pc2.maxId
    ) latest_msg ON cp.id = latest_msg.clientProtocolId
    LEFT JOIN (
      SELECT clientProtocolId, COUNT(*) as unreadCount
      FROM protocol_comments
      WHERE authorType = 'client' AND isRead = 0
      GROUP BY clientProtocolId
    ) unread ON cp.id = unread.clientProtocolId
    WHERE cp.deletedAt IS NULL
    ORDER BY latest_msg.createdAt DESC
  `);

  return (conversations as any)[0] || [];
}

/**
 * Get total unread message count across all conversations for the coach.
 */
export async function getTotalUnreadMessageCount() {
  const db = await getDb();
  if (!db) return 0;

  // Only count unread comments for protocols that still exist and are not deleted
  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM protocol_comments pc
    INNER JOIN client_protocols cp ON pc.clientProtocolId = cp.id
    WHERE pc.authorType = 'client' 
      AND pc.isRead = 0
      AND cp.deletedAt IS NULL
  `);

  return (result as any)[0]?.[0]?.count || 0;
}


/**
 * Update lastSeenAt for a user (called on client activity / heartbeat)
 */
export async function updateUserLastSeen(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Get lastSeenAt for a client by their email (used in admin chat header)
 */
export async function getClientLastSeen(clientEmail: string): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ lastSeenAt: users.lastSeenAt })
    .from(users)
    .where(eq(users.email, clientEmail))
    .limit(1);
  return result[0]?.lastSeenAt || null;
}


// ============ PROTOCOL SECTIONS ============

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value); } catch { return fallback; }
}

/**
 * Get all protocol sections for a client protocol
 */
export async function getProtocolSections(clientProtocolId: number) {
  const db = await getDb();
  if (!db) return [];
  const { protocolSections } = await import("../drizzle/schema");
  const rows = await db.select()
    .from(protocolSections)
    .where(eq(protocolSections.clientProtocolId, clientProtocolId));
  return rows.map(r => ({ ...r, content: parseJsonField(r.content, null) }));
}

/**
 * Get a specific protocol section by type
 */
export async function getProtocolSection(clientProtocolId: number, sectionType: "periodization" | "training_split" | "program_guide") {
  const db = await getDb();
  if (!db) return null;
  const { protocolSections } = await import("../drizzle/schema");
  const result = await db.select()
    .from(protocolSections)
    .where(and(
      eq(protocolSections.clientProtocolId, clientProtocolId),
      eq(protocolSections.sectionType, sectionType)
    ))
    .limit(1);
  const row = result[0];
  if (!row) return null;
  return { ...row, content: parseJsonField(row.content, null) };
}

/**
 * Upsert a protocol section (create or update)
 */
export async function upsertProtocolSection(
  clientProtocolId: number,
  sectionType: "periodization" | "training_split" | "program_guide",
  data: { isEnabled?: boolean; content?: any }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolSections } = await import("../drizzle/schema");
  
  const existing = await db.select()
    .from(protocolSections)
    .where(and(
      eq(protocolSections.clientProtocolId, clientProtocolId),
      eq(protocolSections.sectionType, sectionType)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(protocolSections)
      .set({
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
      })
      .where(eq(protocolSections.id, existing[0].id));
    return { ...existing[0], ...data };
  } else {
    const [result] = await db.insert(protocolSections).values({
      clientProtocolId,
      sectionType,
      isEnabled: data.isEnabled ?? false,
      content: data.content ?? null,
    });
    return { id: result.insertId, clientProtocolId, sectionType, ...data };
  }
}

/**
 * Toggle a protocol section's enabled status
 */
export async function toggleProtocolSection(
  clientProtocolId: number,
  sectionType: "periodization" | "training_split" | "program_guide",
  isEnabled: boolean
) {
  return upsertProtocolSection(clientProtocolId, sectionType, { isEnabled });
}

/**
 * Copy protocol sections from one protocol to another (for protocol renewal/versioning)
 */
export async function copyProtocolSections(fromProtocolId: number, toProtocolId: number) {
  const sections = await getProtocolSections(fromProtocolId);
  const db = await getDb();
  if (!db || sections.length === 0) return;
  const { protocolSections } = await import("../drizzle/schema");
  
  for (const section of sections) {
    await db.insert(protocolSections).values({
      clientProtocolId: toProtocolId,
      sectionType: section.sectionType,
      isEnabled: section.isEnabled,
      content: section.content,
    });
  }
}


// ============ PROTOCOL SECTION TEMPLATES ============

export async function getSectionTemplates(sectionType?: string) {
  const db = await getDb();
  if (!db) return [];
  const { protocolSectionTemplates } = await import("../drizzle/schema");
  const rows = sectionType
    ? await db.select().from(protocolSectionTemplates).where(eq(protocolSectionTemplates.sectionType, sectionType)).orderBy(protocolSectionTemplates.name)
    : await db.select().from(protocolSectionTemplates).orderBy(protocolSectionTemplates.name);
  return rows.map(r => ({ ...r, content: parseJsonField(r.content, null) }));
}

export async function getSectionTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { protocolSectionTemplates } = await import("../drizzle/schema");
  const rows = await db.select().from(protocolSectionTemplates).where(eq(protocolSectionTemplates.id, id));
  const row = rows[0];
  if (!row) return null;
  return { ...row, content: parseJsonField(row.content, null) };
}

export async function saveSectionTemplate(name: string, sectionType: string, content: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolSectionTemplates } = await import("../drizzle/schema");
  const result = await db.insert(protocolSectionTemplates).values({
    name,
    sectionType,
    content,
  });
  return { id: result[0].insertId };
}

export async function updateSectionTemplate(id: number, name: string, content: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolSectionTemplates } = await import("../drizzle/schema");
  await db.update(protocolSectionTemplates).set({ name, content }).where(eq(protocolSectionTemplates.id, id));
}

export async function deleteSectionTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolSectionTemplates } = await import("../drizzle/schema");
  await db.delete(protocolSectionTemplates).where(eq(protocolSectionTemplates.id, id));
}

export async function loadTemplateIntoProtocol(templateId: number, clientProtocolId: number) {
  const template = await getSectionTemplateById(templateId);
  if (!template) throw new Error("Template not found");
  await upsertProtocolSection(clientProtocolId, template.sectionType as "periodization" | "training_split" | "program_guide", {
    content: template.content,
    isEnabled: true,
  });
  return { success: true };
}

export async function saveAllSectionsAsTemplate(clientProtocolId: number, templateName: string) {
  const sections = await getProtocolSections(clientProtocolId);
  const enabledSections = sections.filter(s => s.isEnabled && s.content);
  const results = [];
  for (const section of enabledSections) {
    const result = await saveSectionTemplate(
      `${templateName} - ${section.sectionType === 'periodization' ? 'Periodization' : section.sectionType === 'training_split' ? 'Training Split' : 'Program Guide'}`,
      section.sectionType,
      section.content
    );
    results.push(result);
  }
  return results;
}


// ==========================================
// Phase 56: My Action Items & Fulfillment Queue
// ==========================================

/**
 * Get all pending/in-progress tasks assigned to a specific team member,
 * enriched with client project info for the "My Action Items" dashboard.
 */
export async function getActionItemsForTeamMember(teamMemberId: number) {
  const database = await getDb();
  if (!database) return [];
  
  const tasks = await database.select({
    id: projectTasks.id,
    clientProjectId: projectTasks.clientProjectId,
    lifecycleStageId: projectTasks.lifecycleStageId,
    name: projectTasks.name,
    description: projectTasks.description,
    status: projectTasks.status,
    assignedTeamMemberId: projectTasks.assignedTeamMemberId,
    dueDate: projectTasks.dueDate,
    completedAt: projectTasks.completedAt,
    isRequired: projectTasks.isRequired,
    createdAt: projectTasks.createdAt,
    clientName: clientProjects.clientName,
    clientEmail: clientProjects.clientEmail,
    projectStatus: clientProjects.status,
    currentLifecycleStageId: clientProjects.currentLifecycleStageId,
  })
    .from(projectTasks)
    .leftJoin(clientProjects, eq(projectTasks.clientProjectId, clientProjects.id))
    .where(and(
      eq(projectTasks.assignedTeamMemberId, teamMemberId),
      or(
        eq(projectTasks.status, "pending"),
        eq(projectTasks.status, "in_progress")
      ),
      // Filter out tasks for cancelled projects
      ne(clientProjects.status, "cancelled")
    ))
    .orderBy(projectTasks.dueDate);
  
  // Also get subtasks assigned to this team member
  const subtaskItems = await database.select({
    id: projectSubtasks.id,
    projectTaskId: projectSubtasks.projectTaskId,
    name: projectSubtasks.name,
    description: projectSubtasks.description,
    status: projectSubtasks.status,
    assignedTeamMemberId: projectSubtasks.assignedTeamMemberId,
    dueDate: projectSubtasks.dueDate,
    completedAt: projectSubtasks.completedAt,
    isRequired: projectSubtasks.isRequired,
    createdAt: projectSubtasks.createdAt,
    parentTaskName: projectTasks.name,
    lifecycleStageId: projectTasks.lifecycleStageId,
    clientProjectId: projectTasks.clientProjectId,
    clientName: clientProjects.clientName,
    clientEmail: clientProjects.clientEmail,
    projectStatus: clientProjects.status,
    currentLifecycleStageId: clientProjects.currentLifecycleStageId,
  })
    .from(projectSubtasks)
    .innerJoin(projectTasks, eq(projectSubtasks.projectTaskId, projectTasks.id))
    .leftJoin(clientProjects, eq(projectTasks.clientProjectId, clientProjects.id))
    .where(and(
      eq(projectSubtasks.assignedTeamMemberId, teamMemberId),
      or(
        eq(projectSubtasks.status, "pending"),
        eq(projectSubtasks.status, "in_progress")
      ),
      ne(clientProjects.status, "cancelled")
    ))
    .orderBy(projectSubtasks.dueDate);
  
  // Mark subtasks with a flag so the frontend can distinguish them
  const subtasksWithFlag = subtaskItems.map(s => ({
    ...s,
    isSubtask: true,
    parentTaskName: s.parentTaskName,
  }));
  
  // Combine and sort by dueDate
  const combined = [...tasks.map(t => ({ ...t, isSubtask: false, parentTaskName: null })), ...subtasksWithFlag];
  combined.sort((a, b) => {
    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aDate - bDate;
  });
  
  return combined;
}

/**
 * Get all pending/in-progress tasks across ALL team members,
 * for the admin overview of all action items.
 */
export async function getAllActionItems() {
  const database = await getDb();
  if (!database) return [];
  
  const tasks = await database.select({
    id: projectTasks.id,
    clientProjectId: projectTasks.clientProjectId,
    lifecycleStageId: projectTasks.lifecycleStageId,
    name: projectTasks.name,
    description: projectTasks.description,
    status: projectTasks.status,
    assignedTeamMemberId: projectTasks.assignedTeamMemberId,
    dueDate: projectTasks.dueDate,
    completedAt: projectTasks.completedAt,
    isRequired: projectTasks.isRequired,
    createdAt: projectTasks.createdAt,
    clientName: clientProjects.clientName,
    clientEmail: clientProjects.clientEmail,
    projectStatus: clientProjects.status,
    currentLifecycleStageId: clientProjects.currentLifecycleStageId,
  })
    .from(projectTasks)
    .leftJoin(clientProjects, eq(projectTasks.clientProjectId, clientProjects.id))
    .where(and(
      or(
        eq(projectTasks.status, "pending"),
        eq(projectTasks.status, "in_progress")
      ),
      // Filter out tasks for cancelled projects
      ne(clientProjects.status, "cancelled")
    ))
    .orderBy(projectTasks.dueDate);
  
  // Also get subtasks with assignees
  const subtaskItems = await database.select({
    id: projectSubtasks.id,
    projectTaskId: projectSubtasks.projectTaskId,
    name: projectSubtasks.name,
    description: projectSubtasks.description,
    status: projectSubtasks.status,
    assignedTeamMemberId: projectSubtasks.assignedTeamMemberId,
    dueDate: projectSubtasks.dueDate,
    completedAt: projectSubtasks.completedAt,
    isRequired: projectSubtasks.isRequired,
    createdAt: projectSubtasks.createdAt,
    parentTaskName: projectTasks.name,
    lifecycleStageId: projectTasks.lifecycleStageId,
    clientProjectId: projectTasks.clientProjectId,
    clientName: clientProjects.clientName,
    clientEmail: clientProjects.clientEmail,
    projectStatus: clientProjects.status,
    currentLifecycleStageId: clientProjects.currentLifecycleStageId,
  })
    .from(projectSubtasks)
    .innerJoin(projectTasks, eq(projectSubtasks.projectTaskId, projectTasks.id))
    .leftJoin(clientProjects, eq(projectTasks.clientProjectId, clientProjects.id))
    .where(and(
      isNotNull(projectSubtasks.assignedTeamMemberId),
      or(
        eq(projectSubtasks.status, "pending"),
        eq(projectSubtasks.status, "in_progress")
      ),
      ne(clientProjects.status, "cancelled")
    ))
    .orderBy(projectSubtasks.dueDate);
  
  const subtasksWithFlag = subtaskItems.map(s => ({
    ...s,
    isSubtask: true,
    parentTaskName: s.parentTaskName,
  }));
  
  const combined = [...tasks.map(t => ({ ...t, isSubtask: false, parentTaskName: null })), ...subtasksWithFlag];
  combined.sort((a, b) => {
    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aDate - bDate;
  });
  
  return combined;
}

/**
 * Get packing slips that need fulfillment work (pending, in_progress, partial).
 * This powers Carrie's Fulfillment Queue.
 */
export async function getFulfillmentQueue() {
  const database = await getDb();
  if (!database) return [];

  // Single JOIN query replaces the previous N+1 pattern (1 slip query + N item queries + N shipping queries).
  // clientProtocols is LEFT JOINed so we can fall back to the protocol shipping address when the
  // packing slip itself has no address on file.
  const rows = await database
    .select({
      id: packingSlips.id,
      status: packingSlips.status,
      source: packingSlips.source,
      clientName: packingSlips.clientName,
      clientEmail: packingSlips.clientEmail,
      clientProtocolId: packingSlips.clientProtocolId,
      storeOrderId: packingSlips.storeOrderId,
      customOrderId: packingSlips.customOrderId,
      createdAt: packingSlips.createdAt,
      trackingNumber: packingSlips.trackingNumber,
      trackingCarrier: packingSlips.trackingCarrier,
      trackingUrl: packingSlips.trackingUrl,
      totalItems: packingSlips.totalItems,
      itemsFulfilled: packingSlips.itemsFulfilled,
      itemsBackordered: packingSlips.itemsBackordered,
      isLocked: packingSlips.isLocked,
      signedAt: packingSlips.signedAt,
      shippingName: packingSlips.shippingName,
      shippingStreet: packingSlips.shippingStreet,
      shippingCity: packingSlips.shippingCity,
      shippingState: packingSlips.shippingState,
      shippingZip: packingSlips.shippingZip,
      protocolShippingName: clientProtocols.shippingName,
      protocolShippingStreet: clientProtocols.shippingStreet,
      protocolShippingCity: clientProtocols.shippingCity,
      protocolShippingState: clientProtocols.shippingState,
      protocolShippingZip: clientProtocols.shippingZip,
      itemId: packingSlipItems.id,
      itemName: packingSlipItems.itemName,
      itemStatus: packingSlipItems.status,
      itemQuantity: packingSlipItems.quantity,
      itemQuantityFulfilled: packingSlipItems.quantityFulfilled,
      itemQuantityBackordered: packingSlipItems.quantityBackordered,
      itemShipSource: packingSlipItems.shipSource,
      itemNotes: packingSlipItems.notes,
    })
    .from(packingSlips)
    .leftJoin(packingSlipItems, eq(packingSlipItems.packingSlipId, packingSlips.id))
    .leftJoin(clientProtocols, eq(clientProtocols.id, packingSlips.clientProtocolId))
    .where(and(
      isNull(packingSlips.archivedAt),
      or(
        eq(packingSlips.status, 'pending'),
        eq(packingSlips.status, 'in_progress'),
        eq(packingSlips.status, 'partial'),
      )
    ))
    .orderBy(packingSlips.createdAt, packingSlipItems.itemName);

  // Group flat JOIN rows into per-slip objects.
  const slipMap = new Map<number, any>();
  for (const row of rows) {
    if (!slipMap.has(row.id)) {
      const useProtocol = !row.shippingStreet && !row.shippingCity &&
        (!!row.protocolShippingStreet || !!row.protocolShippingCity);
      slipMap.set(row.id, {
        id: row.id,
        status: row.status,
        source: row.source,
        clientName: row.clientName,
        clientEmail: row.clientEmail,
        clientProtocolId: row.clientProtocolId,
        storeOrderId: row.storeOrderId,
        customOrderId: row.customOrderId,
        createdAt: row.createdAt,
        trackingNumber: row.trackingNumber,
        trackingCarrier: row.trackingCarrier,
        trackingUrl: row.trackingUrl,
        totalItems: row.totalItems,
        itemsFulfilled: row.itemsFulfilled,
        itemsBackordered: row.itemsBackordered,
        isLocked: row.isLocked,
        signedAt: row.signedAt,
        shippingName: useProtocol ? row.protocolShippingName : row.shippingName,
        shippingStreet: useProtocol ? row.protocolShippingStreet : row.shippingStreet,
        shippingCity: useProtocol ? row.protocolShippingCity : row.shippingCity,
        shippingState: useProtocol ? row.protocolShippingState : row.shippingState,
        shippingZip: useProtocol ? row.protocolShippingZip : row.shippingZip,
        items: [] as any[],
        backorderedItems: [] as any[],
        pendingItems: [] as any[],
        fulfilledItems: [] as any[],
      });
    }

    if (row.itemId !== null) {
      const item = {
        id: row.itemId,
        itemName: row.itemName,
        status: row.itemStatus,
        quantity: row.itemQuantity,
        quantityFulfilled: row.itemQuantityFulfilled,
        quantityBackordered: row.itemQuantityBackordered,
        shipSource: row.itemShipSource,
        notes: row.itemNotes,
      };
      const slip = slipMap.get(row.id)!;
      slip.items.push(item);
      if (item.status === 'backordered' || (item.quantityBackordered && item.quantityBackordered > 0)) {
        slip.backorderedItems.push(item);
      }
      if (item.status === 'pending') slip.pendingItems.push(item);
      if (item.status === 'fulfilled') slip.fulfilledItems.push(item);
    }
  }

  return Array.from(slipMap.values()).map(slip => ({
    ...slip,
    totalBackordered: slip.backorderedItems.length,
    totalPending: slip.pendingItems.length,
    totalFulfilled: slip.itemsFulfilled, // quantity-based — consistent with totalItems
  }));
}

/**
 * Get all backordered items across all packing slips.
 * This is a focused view for tracking and resolving backorders.
 */
export async function getBackorderedItems() {
  const database = await getDb();
  if (!database) return [];
  
  const items = await database.select({
    itemId: packingSlipItems.id,
    packingSlipId: packingSlipItems.packingSlipId,
    itemName: packingSlipItems.itemName,
    itemType: packingSlipItems.itemType,
    quantity: packingSlipItems.quantity,
    quantityFulfilled: packingSlipItems.quantityFulfilled,
    quantityBackordered: packingSlipItems.quantityBackordered,
    status: packingSlipItems.status,
    shipSource: packingSlipItems.shipSource,
    notes: packingSlipItems.notes,
    itemTrackingCarrier: packingSlipItems.itemTrackingCarrier,
    itemTrackingNumber: packingSlipItems.itemTrackingNumber,
    itemTrackingUrl: packingSlipItems.itemTrackingUrl,
    createdAt: packingSlipItems.createdAt,
    slipClientName: packingSlips.clientName,
    slipClientEmail: packingSlips.clientEmail,
    slipStatus: packingSlips.status,
    slipSource: packingSlips.source,
  })
    .from(packingSlipItems)
    .leftJoin(packingSlips, eq(packingSlipItems.packingSlipId, packingSlips.id))
    .where(and(
      or(
        eq(packingSlipItems.status, "backordered"),
        gt(packingSlipItems.quantityBackordered, 0)
      ),
      isNull(packingSlips.archivedAt)
    ))
    .orderBy(packingSlipItems.createdAt);

  return items;
}

/**
 * Get packing slips signed within the last N days (default 7).
 * Used by the Fulfillment Queue "Recently Completed" section.
 */
export async function getRecentlyCompletedPackingSlips(days: number = 7) {
  const database = await getDb();
  if (!database) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return database
    .select({
      id: packingSlips.id,
      clientName: packingSlips.clientName,
      source: packingSlips.source,
      totalItems: packingSlips.totalItems,
      itemsFulfilled: packingSlips.itemsFulfilled,
      signedAt: packingSlips.signedAt,
      createdAt: packingSlips.createdAt,
    })
    .from(packingSlips)
    .where(and(
      eq(packingSlips.status, 'complete'),
      isNull(packingSlips.archivedAt),
      isNotNull(packingSlips.signedAt),
      gte(packingSlips.signedAt, cutoff)
    ))
    .orderBy(desc(packingSlips.signedAt))
    .limit(20);
}

/**
 * Get a team member by their linked user ID.
 */
export async function getTeamMemberByUserId(userId: number) {
  const database = await getDb();
  if (!database) return null;
  const results = await database.select().from(teamMembers)
    .where(eq(teamMembers.userId, userId));
  return results[0] || null;
}


/**
 * Get notification preferences for a team member. Creates defaults if none exist.
 */
export async function getTeamNotificationPreferences(teamMemberId: number) {
  const database = await getDb();
  if (!database) return null;
  const { teamNotificationPreferences } = await import("../drizzle/schema");
  const results = await database.select().from(teamNotificationPreferences)
    .where(eq(teamNotificationPreferences.teamMemberId, teamMemberId));
  if (results.length > 0) return results[0];
  // Create default preferences
  await database.insert(teamNotificationPreferences).values({ teamMemberId });
  const newResults = await database.select().from(teamNotificationPreferences)
    .where(eq(teamNotificationPreferences.teamMemberId, teamMemberId));
  return newResults[0] || null;
}

/**
 * Update notification preferences for a team member.
 */
export async function updateTeamNotificationPreferences(teamMemberId: number, prefs: Record<string, boolean>) {
  const database = await getDb();
  if (!database) return;
  const { teamNotificationPreferences } = await import("../drizzle/schema");
  const existing = await database.select().from(teamNotificationPreferences)
    .where(eq(teamNotificationPreferences.teamMemberId, teamMemberId));
  const data: Record<string, any> = {};
  const allowedKeys = [
    'taskAssignedEmail', 'taskOverdueEmail', 'projectAssignedEmail',
    'deadlineApproachingEmail', 'escalationEmail', 'digestEmail',
    'mentionEmail', 'pipelineUpdateEmail', 'fulfillmentAlertEmail'
  ];
  for (const key of allowedKeys) {
    if (key in prefs) data[key] = prefs[key] ? 1 : 0;
  }
  if (existing.length > 0) {
    await database.update(teamNotificationPreferences).set(data)
      .where(eq(teamNotificationPreferences.teamMemberId, teamMemberId));
  } else {
    await database.insert(teamNotificationPreferences).values({ teamMemberId, ...data });
  }
}

/**
 * Check if a specific email notification type is enabled for a team member.
 */
export async function isTeamEmailEnabled(teamMemberId: number, notificationType: string): Promise<boolean> {
  const prefs = await getTeamNotificationPreferences(teamMemberId);
  if (!prefs) return true;
  const key = notificationType + 'Email';
  return (prefs as any)[key] !== 0;
}
