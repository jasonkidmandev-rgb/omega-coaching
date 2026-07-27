/**
 * Centralized Contacts Helper
 * 
 * This module provides the single source of truth for all person data.
 * All routes should use these functions to read/update contact information
 * instead of reading from local table columns (clientName, clientEmail, etc.)
 * 
 * The contacts table is the canonical source for:
 * - first_name, last_name, full_name (generated)
 * - email, phone
 * - secondary_email, secondary_phone
 * - lifecycle_stage
 */

import { db } from "../db";
import { people } from "../../drizzle/schema";
import { eq, or, and, isNotNull, sql } from "drizzle-orm";

// ============================================================
// READ: Get contact info by personId
// ============================================================
export async function getContactById(personId: number) {
  const [contact] = await db
    .select()
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);
  return contact || null;
}

// ============================================================
// READ: Get contact info by email
// ============================================================
export async function getContactByEmail(email: string) {
  if (!email) return null;
  const [contact] = await db
    .select()
    .from(people)
    .where(eq(people.email, email.toLowerCase().trim()))
    .limit(1);
  return contact || null;
}

// ============================================================
// READ: Get contact display name (from personId)
// Returns the full_name from contacts table
// ============================================================
export async function getContactName(personId: number | null | undefined): Promise<string> {
  if (!personId) return "Unknown";
  const contact = await getContactById(personId);
  return contact?.fullName || contact?.firstName || "Unknown";
}

// ============================================================
// READ: Get contact email (from personId)
// ============================================================
export async function getContactEmail(personId: number | null | undefined): Promise<string> {
  if (!personId) return "";
  const contact = await getContactById(personId);
  return contact?.email || "";
}

// ============================================================
// READ: Get contact phone (from personId)
// ============================================================
export async function getContactPhone(personId: number | null | undefined): Promise<string> {
  if (!personId) return "";
  const contact = await getContactById(personId);
  return contact?.phone || "";
}

// ============================================================
// WRITE: Update contact info (single source of truth)
// This is the ONLY function that should update person data.
// All forms should call this instead of updating local tables.
// ============================================================
export async function updateContact(
  personId: number,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    secondaryEmail?: string;
    secondaryPhone?: string;
    lifecycleStage?: "lead" | "prospect" | "enrolled" | "active_client" | "past_client" | "store_customer";
  }
) {
  const updateData: Record<string, any> = {};
  
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.secondaryEmail !== undefined) updateData.secondaryEmail = data.secondaryEmail;
  if (data.secondaryPhone !== undefined) updateData.secondaryPhone = data.secondaryPhone;
  if (data.lifecycleStage !== undefined) updateData.lifecycleStage = data.lifecycleStage;
  
  if (Object.keys(updateData).length === 0) return null;
  
  await db
    .update(people)
    .set(updateData)
    .where(eq(people.id, personId));
  
  // Also update the legacy columns in related tables so existing queries don't break
  // This is a transitional measure — eventually these columns will be removed
  const contact = await getContactById(personId);
  if (contact) {
    await syncLegacyColumns(personId, contact);
  }
  
  return contact;
}

// ============================================================
// WRITE: Create or find a contact
// Used when creating new records (new prospect, new order, etc.)
// ============================================================
export async function findOrCreateContact(data: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  lifecycleStage?: "lead" | "prospect" | "enrolled" | "active_client" | "past_client" | "store_customer";
}): Promise<number> {
  // Try to find by email first
  if (data.email) {
    const existing = await getContactByEmail(data.email);
    if (existing) return existing.id;
  }
  
  // Create new contact
  const [result] = await db.insert(people).values({
    firstName: data.firstName,
    lastName: data.lastName || null,
    email: data.email?.toLowerCase().trim() || null,
    phone: data.phone || null,
    source: data.source || "app",
    lifecycleStage: data.lifecycleStage || "lead",
  });
  
  return result.insertId;
}

// ============================================================
// SYNC: Update legacy columns in related tables
// This keeps old columns in sync during the transition period.
// Eventually these columns will be deprecated.
// ============================================================
async function syncLegacyColumns(personId: number, contact: any) {
  const fullName = contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
  const email = contact.email || "";
  const phone = contact.phone || "";
  
  // Use raw SQL for bulk updates across multiple tables
  const queries = [
    // client_protocols
    `UPDATE client_protocols SET clientName = ?, clientEmail = ?, clientPhone = ? WHERE personId = ?`,
    // prospects
    `UPDATE prospects SET name = ?, email = ?, phone = ? WHERE personId = ?`,
    // client_projects
    `UPDATE client_projects SET clientName = ?, clientEmail = ? WHERE personId = ?`,
    // custom_orders
    `UPDATE custom_orders SET clientName = ?, clientEmail = ?, clientPhone = ? WHERE personId = ?`,
    // packing_slips
    `UPDATE packing_slips SET clientName = ?, clientEmail = ? WHERE personId = ?`,
    // appointments
    `UPDATE appointments SET clientName = ?, clientEmail = ?, clientPhone = ? WHERE personId = ?`,
  ];
  
  // Execute updates with parameterized queries — never interpolate user data into raw SQL
  try {
    await db.execute(sql`UPDATE client_protocols SET clientName = ${fullName}, clientEmail = ${email} WHERE personId = ${personId}`);
    await db.execute(sql`UPDATE prospects SET name = ${fullName}, email = ${email} WHERE personId = ${personId}`);
    await db.execute(sql`UPDATE client_projects SET clientName = ${fullName}, clientEmail = ${email} WHERE personId = ${personId}`);
    await db.execute(sql`UPDATE custom_orders SET clientName = ${fullName}, clientEmail = ${email} WHERE personId = ${personId}`);
    await db.execute(sql`UPDATE packing_slips SET clientName = ${fullName}, clientEmail = ${email} WHERE personId = ${personId}`);
    await db.execute(sql`UPDATE appointments SET clientName = ${fullName}, clientEmail = ${email} WHERE personId = ${personId}`);
  } catch (err) {
    console.error("[ContactsHelper] Error syncing legacy columns for contact", personId, err);
  }
}

// ============================================================
// SQL JOIN helper for reading contact name from contacts table
// Use this in SELECT queries instead of reading local columns
// ============================================================
export const contactsJoinFragment = {
  contactName: sql<string>`COALESCE(people.full_name, people.first_name, 'Unknown')`.as('contactName'),
  contactEmail: sql<string>`COALESCE(people.email, '')`.as('contactEmail'),
  contactPhone: sql<string>`COALESCE(people.phone, '')`.as('contactPhone'),
};
