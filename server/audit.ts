import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import type { InsertAuditLog } from "../drizzle/schema";
import crypto from "crypto";

// PHI field definitions for HIPAA compliance
export const PHI_FIELDS = {
  client_protocol: ["clientName", "clientEmail", "shippingName", "shippingStreet", "shippingCity", "shippingState", "shippingZip", "shippingPhone", "customRequirements", "notes", "coachNotes"],
  user: ["name", "email", "phone"],
  payment: ["amount", "paymentMethod", "venmoHandle"],
  progress_photo: ["photoUrl", "notes"],
  journal_note: ["content", "mood"],
};

export type AuditAction = 
  | "view" | "create" | "update" | "delete" | "export" | "print"
  | "login" | "logout" | "login_failed" | "password_change"
  | "permission_change" | "data_access" | "phi_access"
  | "role_change" | "user_created" | "admin_settings_updated"
  | "admin_invitation_revoked" | "admin_invitation_accepted" | "admin_invitation_sent"
  | "protocol_reset"
  | "protocol_rollback";

export interface AuditLogInput {
  userId?: number;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | number;
  resourceName?: string;
  targetUserId?: number;
  containsPhi?: boolean;
  phiFields?: string[];
  description?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  previousValue?: any;
  newValue?: any;
  userIp?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Generate a unique request ID for correlation
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Log an audit event for HIPAA compliance
 * Tracks all access to Protected Health Information (PHI)
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    // Check if this resource type has PHI fields
    const resourcePhiFields = PHI_FIELDS[input.resourceType as keyof typeof PHI_FIELDS] || [];
    const containsPhi = input.containsPhi ?? resourcePhiFields.length > 0;
    
    const logEntry: InsertAuditLog = {
      userId: input.userId,
      userEmail: input.userEmail,
      userRole: input.userRole,
      userIp: input.userIp,
      userAgent: input.userAgent,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId?.toString(),
      resourceName: input.resourceName,
      targetUserId: input.targetUserId,
      containsPhi,
      phiFields: input.phiFields ? JSON.stringify(input.phiFields) : (containsPhi ? JSON.stringify(resourcePhiFields) : null),
      description: input.description,
      details: input.details ? JSON.stringify(input.details) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      previousValue: input.previousValue ? JSON.stringify(input.previousValue) : null,
      newValue: input.newValue ? JSON.stringify(input.newValue) : null,
      requestId: input.requestId || generateRequestId(),
      sessionId: input.sessionId,
      success: input.success ?? true,
      errorMessage: input.errorMessage,
    };

    await db.insert(auditLogs).values(logEntry);
  } catch (error) {
    console.error("[AuditLog] Failed to log audit event:", error);
    // Don't throw - audit logging failures shouldn't break the main action
  }
}

/**
 * Log PHI access event (HIPAA requirement)
 */
export async function logPhiAccess(
  userId: number,
  userEmail: string,
  userRole: string,
  resourceType: string,
  resourceId: string | number,
  resourceName: string,
  accessedFields: string[],
  userIp?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    userId,
    userEmail,
    userRole,
    action: "phi_access",
    resourceType,
    resourceId,
    resourceName,
    containsPhi: true,
    phiFields: accessedFields,
    description: `PHI accessed: ${accessedFields.join(", ")}`,
    userIp,
    userAgent,
  });
}

/**
 * Log a role change event
 */
export async function logRoleChange(
  adminId: number,
  adminEmail: string,
  adminRole: string,
  targetUserId: number,
  oldRole: string,
  newRole: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    userId: adminId,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "role_change",
    resourceType: "user",
    resourceId: targetUserId,
    targetUserId,
    description: `Role changed from ${oldRole} to ${newRole}`,
    previousValue: { role: oldRole },
    newValue: { role: newRole },
    userIp: ipAddress,
    userAgent,
  });
}

/**
 * Log a user creation event
 */
export async function logUserCreation(
  adminId: number,
  adminEmail: string,
  adminRole: string,
  newUserId: number,
  role: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    userId: adminId,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "user_created",
    resourceType: "user",
    resourceId: newUserId,
    targetUserId: newUserId,
    description: `New user created with role: ${role}`,
    newValue: { role },
    userIp: ipAddress,
    userAgent,
  });
}

/**
 * Log an admin settings change
 */
export async function logAdminSettingsChange(
  adminId: number,
  adminEmail: string,
  adminRole: string,
  settingName: string,
  oldValue: any,
  newValue: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    userId: adminId,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "admin_settings_updated",
    resourceType: "admin_settings",
    resourceName: settingName,
    description: `Setting "${settingName}" updated`,
    previousValue: oldValue,
    newValue: newValue,
    userIp: ipAddress,
    userAgent,
  });
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  action: "login" | "logout" | "login_failed",
  userId: number | undefined,
  userEmail: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
): Promise<void> {
  await logAuditEvent({
    userId,
    userEmail,
    action,
    resourceType: "authentication",
    description: `${action.replace("_", " ")} ${success ? "successful" : "failed"}`,
    success,
    errorMessage,
    userIp: ipAddress,
    userAgent,
  });
}

/**
 * Log data export event (HIPAA requirement for tracking data exports)
 */
export async function logDataExport(
  userId: number,
  userEmail: string,
  userRole: string,
  resourceType: string,
  resourceId: string | number,
  exportFormat: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    userId,
    userEmail,
    userRole,
    action: "export",
    resourceType,
    resourceId,
    containsPhi: true,
    description: `Data exported in ${exportFormat} format`,
    metadata: { exportFormat },
    userIp: ipAddress,
    userAgent,
  });
}

/**
 * Get recent audit logs (for admin dashboard)
 */
export async function getRecentAuditLogs(limit: number = 50, action?: AuditAction) {
  try {
    const db = await getDb();
    if (!db) return [];
    
    let query = db
      .select()
      .from(auditLogs);
    
    if (action) {
      query = query.where(eq(auditLogs.action, action)) as any;
    }
    
    const logs = await query
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return logs;
  } catch (error) {
    console.error("[AuditLog] Failed to fetch audit logs:", error);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getAuditLogsForUser(userId: number, limit: number = 50) {
  try {
    const db = await getDb();
    if (!db) return [];
    
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.targetUserId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return logs;
  } catch (error) {
    console.error("[AuditLog] Failed to fetch audit logs for user:", error);
    return [];
  }
}

/**
 * Get PHI access logs (HIPAA compliance report)
 */
export async function getPhiAccessLogs(
  startDate: Date,
  endDate: Date,
  resourceType?: string,
  limit: number = 1000
) {
  try {
    const db = await getDb();
    if (!db) return [];
    
    const conditions = [
      eq(auditLogs.containsPhi, true),
      gte(auditLogs.createdAt, startDate),
    ];
    
    if (resourceType) {
      conditions.push(eq(auditLogs.resourceType, resourceType));
    }
    
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return logs;
  } catch (error) {
    console.error("[AuditLog] Failed to fetch PHI access logs:", error);
    return [];
  }
}

/**
 * Get audit log statistics for compliance dashboard
 */
export async function getAuditLogStats(days: number = 30) {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await db
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)`,
        phiCount: sql<number>`sum(case when ${auditLogs.containsPhi} = true then 1 else 0 end)`,
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startDate))
      .groupBy(auditLogs.action);
    
    return stats;
  } catch (error) {
    console.error("[AuditLog] Failed to fetch audit log stats:", error);
    return null;
  }
}
