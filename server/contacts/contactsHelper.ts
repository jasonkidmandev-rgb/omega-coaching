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
import { contacts } from "../../drizzle/schema";
import { eq, or, and, isNotNull, sql } from "drizzle-orm";

// ============================================================
// READ: Get contact info by contactId
// ============================================================
export async function getContactById(contactId: number) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
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
    .from(contacts)
    .where(eq(contacts.email, email.toLowerCase().trim()))
    .limit(1);
  return contact || null;
}

// ============================================================
// READ: Get contact display name (from contactId)
// Returns the full_name from contacts table
// ============================================================
export async function getContactName(contactId: number | null | undefined): Promise<string> {
  if (!contactId) return "Unknown";
  const contact = await getContactById(contactId);
  return contact?.fullName || contact?.firstName || "Unknown";
}

// ============================================================
// READ: Get contact email (from contactId)
// ============================================================
export async function getContactEmail(contactId: number | null | undefined): Promise<string> {
  if (!contactId) return "";
  const contact = await getContactById(contactId);
  return contact?.email || "";
}

// ============================================================
// READ: Get contact phone (from contactId)
// ============================================================
export async function getContactPhone(contactId: number | null | undefined): Promise<string> {
  if (!contactId) return "";
  const contact = await getContactById(contactId);
  return contact?.phone || "";
}

// ============================================================
// WRITE: Update contact info (single source of truth)
// This is the ONLY function that should update person data.
// All forms should call this instead of updating local tables.
// ============================================================
export async function updateContact(
  contactId: number,
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
    .update(contacts)
    .set(updateData)
    .where(eq(contacts.id, contactId));
  
  // Also update the legacy columns in related tables so existing queries don't break
  // This is a transitional measure — eventually these columns will be removed
  const contact = await getContactById(contactId);
  if (contact) {
    await syncLegacyColumns(contactId, contact);
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
  const [result] = await db.insert(contacts).values({
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
async function syncLegacyColumns(contactId: number, contact: any) {
  const fullName = contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
  const email = contact.email || "";
  const phone = contact.phone || "";
  
  // Use raw SQL for bulk updates across multiple tables
  const queries = [
    // client_protocols
    `UPDATE client_protocols SET clientName = ?, clientEmail = ?, clientPhone = ? WHERE contactId = ?`,
    // prospects
    `UPDATE prospects SET name = ?, email = ?, phone = ? WHERE contactId = ?`,
    // client_projects
    `UPDATE client_projects SET clientName = ?, clientEmail = ? WHERE contactId = ?`,
    // custom_orders
    `UPDATE custom_orders SET clientName = ?, clientEmail = ?, clientPhone = ? WHERE contactId = ?`,
    // packing_slips
    `UPDATE packing_slips SET clientName = ?, clientEmail = ? WHERE contactId = ?`,
    // appointments
    `UPDATE appointments SET clientName = ?, clientEmail = ?, clientPhone = ? WHERE contactId = ?`,
  ];
  
  // Execute updates with appropriate params
  try {
    await db.execute(sql.raw(`UPDATE client_protocols SET clientName = '${fullName.replace(/'/g, "''")}', clientEmail = '${email.replace(/'/g, "''")}' WHERE contactId = ${contactId}`));
    await db.execute(sql.raw(`UPDATE prospects SET name = '${fullName.replace(/'/g, "''")}', email = '${email.replace(/'/g, "''")}' WHERE contactId = ${contactId}`));
    await db.execute(sql.raw(`UPDATE client_projects SET clientName = '${fullName.replace(/'/g, "''")}', clientEmail = '${email.replace(/'/g, "''")}' WHERE contactId = ${contactId}`));
    await db.execute(sql.raw(`UPDATE custom_orders SET clientName = '${fullName.replace(/'/g, "''")}', clientEmail = '${email.replace(/'/g, "''")}' WHERE contactId = ${contactId}`));
    await db.execute(sql.raw(`UPDATE packing_slips SET clientName = '${fullName.replace(/'/g, "''")}', clientEmail = '${email.replace(/'/g, "''")}' WHERE contactId = ${contactId}`));
    await db.execute(sql.raw(`UPDATE appointments SET clientName = '${fullName.replace(/'/g, "''")}', clientEmail = '${email.replace(/'/g, "''")}' WHERE contactId = ${contactId}`));
  } catch (err) {
    console.error("[ContactsHelper] Error syncing legacy columns for contact", contactId, err);
  }
}

// ============================================================
// SQL JOIN helper for reading contact name from contacts table
// Use this in SELECT queries instead of reading local columns
// ============================================================
export const contactsJoinFragment = {
  contactName: sql<string>`COALESCE(contacts.full_name, contacts.first_name, 'Unknown')`.as('contactName'),
  contactEmail: sql<string>`COALESCE(contacts.email, '')`.as('contactEmail'),
  contactPhone: sql<string>`COALESCE(contacts.phone, '')`.as('contactPhone'),
};
